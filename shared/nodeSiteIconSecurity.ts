import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  assertSafeSiteIconUrl,
  isBlockedNetworkAddress,
  UnsafeSiteIconUrlError,
} from "./siteIcons.js";

function isProxyFakeIp(address: string) {
  const parts = address.split(".").map(Number);
  return (
    parts.length === 4 && parts[0] === 198 && parts[1] >= 18 && parts[1] <= 19
  );
}

export async function validatePublicIconTarget(
  url: URL,
  { allowProxyFakeIps = false }: { allowProxyFakeIps?: boolean } = {}
) {
  const safeUrl = assertSafeSiteIconUrl(url);
  const hostname = safeUrl.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) return;
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(
      address =>
        isBlockedNetworkAddress(address.address) &&
        !(allowProxyFakeIps && isProxyFakeIp(address.address))
    )
  )
    throw new UnsafeSiteIconUrlError("不能从本地或私有网络获取网站图标。");
}
