import { json, requireAuthenticated, type PagesContext } from "../_types";

const categories = ["design", "dev", "productivity", "inspiration"] as const;
type Category = (typeof categories)[number];

function fallbackAnalysis(name: string, hostname: string) {
  const inferredName = name || hostname.split(".")[0].replace(/(^|-)(\w)/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);
  const value = `${inferredName} ${hostname}`.toLowerCase();
  const rules: Array<[Category, string[], string[]]> = [
    ["design", ["figma", "design", "ui", "ux", "canva", "设计"], ["设计", "创作"]],
    ["dev", ["github", "gitlab", "code", "api", "npm", "vercel", "开发"], ["开发", "工具"]],
    ["inspiration", ["dribbble", "behance", "pinterest", "arena", "gallery", "灵感"], ["灵感", "收藏"]],
  ];
  const match = rules.find(([, words]) => words.some((word) => value.includes(word))) || ["productivity", [], ["效率", "工作"]] as const;
  return { name: inferredName, description: `${inferredName} 是一个便于日常访问与使用的在线工具。`, category: match[0], tags: match[2], source: "local" };
}

export async function onRequestPost(context: PagesContext) {
  const unauthorized = await requireAuthenticated(context.request, context.env);
  if (unauthorized) return unauthorized;
  try {
    const input = await context.request.json() as { name?: unknown; url?: unknown };
    const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
    const rawUrl = typeof input.url === "string" ? input.url.trim() : "";
    if (!rawUrl) throw new Error("请填写网站地址。");
    const url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    const fallback = fallbackAnalysis(name, url.hostname.replace(/^www\./, ""));
    const apiKey = context.env.AI_API_KEY || context.env.OPENAI_API_KEY;
    if (!apiKey) return json(fallback);

    const baseUrl = (context.env.AI_BASE_URL || context.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = context.env.AI_MODEL || context.env.OPENAI_MODEL || "gpt-4.1-mini";
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你是个人导航站的信息整理助手。只返回 JSON。category 只能是 design、dev、productivity、inspiration；description 不超过45字；tags 为2到4个简短中文标签。" },
          { role: "user", content: JSON.stringify({ name, url: url.toString(), schema: { name: "string", description: "string", category: "string", tags: ["string"] } }) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI 服务暂时不可用（${response.status}）。`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI 没有返回可用结果。");
    const data = JSON.parse(content) as Record<string, unknown>;
    const category = categories.includes(data.category as Category) ? data.category as Category : fallback.category;
    const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 4) : fallback.tags;
    return json({
      name: typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, 80) : fallback.name,
      description: typeof data.description === "string" && data.description.trim() ? data.description.trim().slice(0, 120) : fallback.description,
      category,
      tags: tags.length ? tags : fallback.tags,
      source: "ai",
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "网站分析失败。" }, { status: 400 });
  }
}
