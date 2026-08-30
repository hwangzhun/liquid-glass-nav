export type SiteIconCandidateKind = "favicon" | "apple-touch" | "manifest";

export type SiteIconCandidate = {
  url: string;
  kind: SiteIconCandidateKind;
  label: string;
};

type UrlValidator = (url: URL) => void | Promise<void>;

const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 256 * 1024;
const MAX_MANIFEST_BYTES = 128 * 1024;
const FETCH_TIMEOUT_MS = 5_000;

export class UnsafeSiteIconUrlError extends Error {}

function normalizedHostname(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

function parseIpv4(value: string) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return null;
  const parts = value.split(".").map(Number);
  return parts.every(part => part >= 0 && part <= 255) ? parts : null;
}

export function isBlockedNetworkAddress(value: string): boolean {
  const hostname = normalizedHostname(value);
  const ipv4 = parseIpv4(hostname);
  if (ipv4) {
    const [a, b] = ipv4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (!hostname.includes(":")) return false;
  const compact = hostname.replace(/^0+(?=:)/, "");
  if (
    compact === "::" ||
    compact === "::1" ||
    compact.startsWith("fc") ||
    compact.startsWith("fd") ||
    /^fe[89ab]/.test(compact) ||
    compact.startsWith("ff") ||
    compact.startsWith("2001:db8:")
  )
    return true;

  const mappedIpv4 = compact.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return mappedIpv4 ? isBlockedNetworkAddress(mappedIpv4[1]) : false;
}

export function assertSafeSiteIconUrl(value: string | URL) {
  let url: URL;
  try {
    url = value instanceof URL ? new URL(value) : new URL(value);
  } catch {
    throw new UnsafeSiteIconUrlError("网站地址格式不正确。");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new UnsafeSiteIconUrlError("只支持 HTTP 或 HTTPS 网站。");
  if (url.username || url.password)
    throw new UnsafeSiteIconUrlError("网站地址不能包含登录凭据。");
  if (url.port && url.port !== "80" && url.port !== "443")
    throw new UnsafeSiteIconUrlError("网站地址包含不受支持的端口。");

  const hostname = normalizedHostname(url.hostname);
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    isBlockedNetworkAddress(hostname)
  )
    throw new UnsafeSiteIconUrlError("不能从本地或私有网络获取网站图标。");
  return url;
}

function readAttributes(tag: string) {
  const attributes = new Map<string, string>();
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tag)) !== null)
    attributes.set(
      match[1].toLowerCase(),
      match[2] ?? match[3] ?? match[4] ?? ""
    );
  return attributes;
}

function resolvePublicAssetUrl(value: string, baseUrl: URL) {
  try {
    return assertSafeSiteIconUrl(new URL(value, baseUrl)).toString();
  } catch {
    return "";
  }
}

async function readLimitedText(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new Error("远程响应过大。");
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("远程响应过大。");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  chunks.forEach(chunk => {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return new TextDecoder().decode(output);
}

async function fetchText(
  initialUrl: URL,
  accept: string,
  maxBytes: number,
  validateUrl: UrlValidator
) {
  let url = assertSafeSiteIconUrl(initialUrl);
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    await validateUrl(url);
    const response = await fetch(url, {
      headers: {
        Accept: accept,
        "User-Agent": "LiquidGlassNav/1.0 (+site icon discovery)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS)
        throw new Error("网站重定向次数过多。");
      url = assertSafeSiteIconUrl(new URL(location, url));
      continue;
    }
    if (!response.ok) throw new Error(`网站返回了 ${response.status}。`);
    return { text: await readLimitedText(response, maxBytes), url };
  }
  throw new Error("网站重定向次数过多。");
}

function addCandidate(
  candidates: SiteIconCandidate[],
  seen: Set<string>,
  candidate: SiteIconCandidate
) {
  if (!candidate.url || seen.has(candidate.url) || candidates.length >= 8)
    return;
  seen.add(candidate.url);
  candidates.push(candidate);
}

export async function findSiteIcons(
  rawUrl: string,
  validateUrl: UrlValidator = url => {
    assertSafeSiteIconUrl(url);
  }
) {
  const requestedUrl = assertSafeSiteIconUrl(
    /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
  );
  await validateUrl(requestedUrl);

  const fallbackUrl = new URL("/favicon.ico", requestedUrl.origin).toString();
  let page: { text: string; url: URL };
  try {
    page = await fetchText(
      requestedUrl,
      "text/html,application/xhtml+xml",
      MAX_HTML_BYTES,
      validateUrl
    );
  } catch (error) {
    if (error instanceof UnsafeSiteIconUrlError) throw error;
    return [
      { url: fallbackUrl, kind: "favicon", label: "默认 Favicon" },
    ] satisfies SiteIconCandidate[];
  }

  const candidates: SiteIconCandidate[] = [];
  const seen = new Set<string>();
  const manifests: string[] = [];
  const linkTags = page.text.match(/<link\b[^>]*>/gi) || [];

  for (const tag of linkTags) {
    const attributes = readAttributes(tag);
    const href = attributes.get("href")?.trim();
    const rel = (attributes.get("rel") || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (!href) continue;
    if (rel.includes("manifest")) {
      const manifestUrl = resolvePublicAssetUrl(href, page.url);
      if (manifestUrl) manifests.push(manifestUrl);
      continue;
    }
    const isApple = rel.some(value => value.startsWith("apple-touch-icon"));
    const isIcon = rel.includes("icon") || rel.includes("shortcut");
    if (!isApple && !isIcon) continue;
    const iconUrl = resolvePublicAssetUrl(href, page.url);
    if (!iconUrl) continue;
    addCandidate(candidates, seen, {
      url: iconUrl,
      kind: isApple ? "apple-touch" : "favicon",
      label: isApple
        ? "Apple Touch Icon"
        : attributes.get("sizes") || "网站图标",
    });
  }

  for (const manifestValue of manifests.slice(0, 1)) {
    try {
      const manifest = await fetchText(
        new URL(manifestValue),
        "application/manifest+json,application/json",
        MAX_MANIFEST_BYTES,
        validateUrl
      );
      const data = JSON.parse(manifest.text) as {
        icons?: Array<{ src?: unknown; sizes?: unknown; purpose?: unknown }>;
      };
      const icons = Array.isArray(data.icons) ? data.icons : [];
      for (const icon of icons) {
        if (typeof icon.src !== "string") continue;
        const iconUrl = resolvePublicAssetUrl(icon.src, manifest.url);
        if (!iconUrl) continue;
        const sizes = typeof icon.sizes === "string" ? icon.sizes : "";
        addCandidate(candidates, seen, {
          url: iconUrl,
          kind: "manifest",
          label: sizes ? `应用图标 · ${sizes}` : "应用图标",
        });
      }
    } catch (error) {
      if (error instanceof UnsafeSiteIconUrlError) throw error;
    }
  }

  addCandidate(candidates, seen, {
    url: fallbackUrl,
    kind: "favicon",
    label: "默认 Favicon",
  });
  return candidates;
}
