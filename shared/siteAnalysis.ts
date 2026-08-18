export const siteCategories = ["design", "dev", "productivity", "inspiration"] as const;
export type SiteCategory = (typeof siteCategories)[number];
export type SiteAnalysis = { name: string; description: string; category: SiteCategory; tags: string[]; source: "ai" | "local" };
type AnalyzeInput = { name?: unknown; url?: unknown };

const categoryKeywords: Array<{ category: SiteCategory; words: string[]; tags: string[] }> = [
  { category: "design", words: ["figma", "design", "ui", "ux", "font", "color", "icon", "sketch", "canva", "设计"], tags: ["设计", "创作"] },
  { category: "dev", words: ["github", "gitlab", "code", "developer", "api", "docs", "npm", "vercel", "cloud", "开发"], tags: ["开发", "工具"] },
  { category: "inspiration", words: ["dribbble", "behance", "pinterest", "arena", "gallery", "inspiration", "灵感", "作品"], tags: ["灵感", "收藏"] },
  { category: "productivity", words: ["notion", "linear", "todo", "task", "calendar", "mail", "office", "productivity", "效率"], tags: ["效率", "工作"] },
];

function normalizeInput(input: AnalyzeInput) {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
  const rawUrl = typeof input.url === "string" ? input.url.trim() : "";
  if (!rawUrl) throw new Error("请填写网站地址。");
  const url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("只支持 HTTP 或 HTTPS 网站。");
  return { name, url: url.toString(), hostname: url.hostname.replace(/^www\./, "") };
}

function localAnalysis(name: string, hostname: string): SiteAnalysis {
  const inferredName = name || hostname.split(".")[0].replace(/(^|-)(\w)/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);
  const haystack = `${inferredName} ${hostname}`.toLowerCase();
  const match = categoryKeywords.find((item) => item.words.some((word) => haystack.includes(word))) ?? categoryKeywords[3];
  return { name: inferredName, description: `${inferredName} 是一个便于日常访问与使用的在线工具。`, category: match.category, tags: match.tags, source: "local" };
}

function sanitizeAnalysis(value: unknown, fallback: SiteAnalysis): SiteAnalysis {
  if (!value || typeof value !== "object") return fallback;
  const data = value as Record<string, unknown>;
  const category = siteCategories.includes(data.category as SiteCategory) ? data.category as SiteCategory : fallback.category;
  const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 4) : fallback.tags;
  return { name: typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, 80) : fallback.name, description: typeof data.description === "string" && data.description.trim() ? data.description.trim().slice(0, 120) : fallback.description, category, tags: tags.length ? tags : fallback.tags, source: "ai" };
}

export async function analyzeSite(input: AnalyzeInput): Promise<SiteAnalysis> {
  const { name, url, hostname } = normalizeInput(input);
  const fallback = localAnalysis(name, hostname);
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;
  const baseUrl = (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: 0.2, response_format: { type: "json_object" }, messages: [
      { role: "system", content: "你是个人导航站的信息整理助手。只返回 JSON。category 只能是 design、dev、productivity、inspiration 之一；description 用简洁中文，不超过45字；tags 为2到4个简短中文标签。" },
      { role: "user", content: JSON.stringify({ name, url, task: "识别网站名称，撰写简介，选择分类并生成标签", schema: { name: "string", description: "string", category: "design|dev|productivity|inspiration", tags: ["string"] } }) },
    ] }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`AI 服务暂时不可用（${response.status}）。`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 没有返回可用结果。");
  return sanitizeAnalysis(JSON.parse(content), fallback);
}
