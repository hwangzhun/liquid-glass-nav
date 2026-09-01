export type AnalysisCategory = { id: string; label: string };

export type AnalyzeSiteInput = {
  name?: unknown;
  url?: unknown;
  categories?: unknown;
  approvedTags?: unknown;
  fallbackCategoryId?: unknown;
};

export type SiteAnalysis = {
  name: string;
  description: string;
  category: string;
  tags: string[];
  source: "ai" | "local";
};

export type SiteAnalysisConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export type TagNormalizationInput = {
  candidates?: unknown;
};

const legacyCategories: AnalysisCategory[] = [
  { id: "design", label: "设计" },
  { id: "dev", label: "开发" },
  { id: "productivity", label: "效率" },
  { id: "inspiration", label: "灵感" },
];

const categoryKeywords = [
  [
    "设计",
    "figma",
    "design",
    "ui",
    "ux",
    "font",
    "color",
    "icon",
    "sketch",
    "canva",
  ],
  [
    "开发",
    "github",
    "gitlab",
    "code",
    "developer",
    "api",
    "docs",
    "npm",
    "vercel",
    "cloud",
  ],
  [
    "灵感",
    "dribbble",
    "behance",
    "pinterest",
    "arena",
    "gallery",
    "inspiration",
    "作品",
  ],
  [
    "效率",
    "notion",
    "linear",
    "todo",
    "task",
    "calendar",
    "mail",
    "office",
    "productivity",
    "工作",
  ],
] as const;

function normalizeInput(input: AnalyzeSiteInput) {
  const name =
    typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
  const rawUrl = typeof input.url === "string" ? input.url.trim() : "";
  if (!rawUrl) throw new Error("请填写网站地址。");
  const url = new URL(
    /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
  );
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("只支持 HTTP 或 HTTPS 网站。");

  const rawCategories = Array.isArray(input.categories)
    ? input.categories
    : legacyCategories;
  const seenCategoryIds = new Set<string>();
  const categories = rawCategories.slice(0, 100).flatMap(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.id !== "string" || typeof candidate.label !== "string")
      return [];
    const id = candidate.id.trim().slice(0, 120);
    const label = candidate.label.trim().slice(0, 40);
    if (!id || !label || seenCategoryIds.has(id)) return [];
    seenCategoryIds.add(id);
    return [{ id, label }];
  });
  if (!categories.length) throw new Error("至少需要一个可用分类。");

  const seenTags = new Set<string>();
  const approvedTags = (
    Array.isArray(input.approvedTags) ? input.approvedTags : []
  )
    .flatMap(value =>
      typeof value === "string" ? [value.trim().slice(0, 24)] : []
    )
    .filter(tag => {
      const key = tag.toLocaleLowerCase();
      if (!tag || seenTags.has(key)) return false;
      seenTags.add(key);
      return true;
    })
    .slice(0, 200);

  const requestedFallback =
    typeof input.fallbackCategoryId === "string"
      ? input.fallbackCategoryId.trim()
      : "";
  const fallbackCategory =
    categories.find(category => category.id === requestedFallback) ||
    categories[0];

  return {
    name,
    url: url.toString(),
    hostname: url.hostname.replace(/^www\./, ""),
    categories,
    approvedTags,
    fallbackCategory,
  };
}

function chooseLocalCategory(
  haystack: string,
  categories: AnalysisCategory[],
  fallbackCategory: AnalysisCategory
) {
  let best = fallbackCategory;
  let bestScore = 0;
  for (const category of categories) {
    const identity = `${category.id} ${category.label}`.toLocaleLowerCase();
    let score = haystack.includes(category.label.toLocaleLowerCase()) ? 4 : 0;
    for (const group of categoryKeywords) {
      if (!group.some(word => identity.includes(word.toLocaleLowerCase())))
        continue;
      score += group.filter(word =>
        haystack.includes(word.toLocaleLowerCase())
      ).length;
    }
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return best;
}

function chooseLocalTag(
  haystack: string,
  approvedTags: string[],
  category: AnalysisCategory
) {
  const direct = approvedTags.find(tag =>
    haystack.includes(tag.toLocaleLowerCase())
  );
  if (direct) return direct;
  // A sparse approved vocabulary must not force every new site into one of
  // its generic labels. The local fallback stays semantic and only reuses an
  // approved tag on a direct website match.
  return category.label.slice(0, 24);
}

function localAnalysis(
  name: string,
  hostname: string,
  categories: AnalysisCategory[],
  approvedTags: string[],
  fallbackCategory: AnalysisCategory
): SiteAnalysis {
  const inferredName =
    name ||
    hostname
      .split(".")[0]
      .replace(
        /(^|-)(\w)/g,
        (_, space, letter) => `${space}${letter.toUpperCase()}`
      );
  const haystack = `${inferredName} ${hostname}`.toLocaleLowerCase();
  const category = chooseLocalCategory(haystack, categories, fallbackCategory);
  const tag = chooseLocalTag(haystack, approvedTags, category);
  return {
    name: inferredName,
    description: `${inferredName} 是一个便于日常访问与使用的在线工具。`,
    category: category.id,
    tags: tag ? [tag] : [],
    source: "local",
  };
}

function canonicalTag(value: unknown, approvedTags: string[]) {
  if (typeof value !== "string") return "";
  const tag = value.trim().slice(0, 24);
  if (!tag) return "";
  return (
    approvedTags.find(
      existing => existing.toLocaleLowerCase() === tag.toLocaleLowerCase()
    ) || tag
  );
}

function sanitizeAnalysis(
  value: unknown,
  fallback: SiteAnalysis,
  categories: AnalysisCategory[],
  approvedTags: string[]
): SiteAnalysis {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fallback;
  const data = value as Record<string, unknown>;
  const category = categories.some(candidate => candidate.id === data.category)
    ? String(data.category)
    : fallback.category;
  const rawTag =
    typeof data.tag === "string"
      ? data.tag
      : Array.isArray(data.tags)
        ? data.tags.find(tag => typeof tag === "string")
        : undefined;
  const tag = canonicalTag(rawTag, approvedTags) || fallback.tags[0] || "";
  return {
    name:
      typeof data.name === "string" && data.name.trim()
        ? data.name.trim().slice(0, 80)
        : fallback.name,
    description:
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim().slice(0, 120)
        : fallback.description,
    category,
    tags: tag ? [tag] : [],
    source: "ai",
  };
}

export async function analyzeSiteWithConfig(
  input: AnalyzeSiteInput,
  config: SiteAnalysisConfig = {}
): Promise<SiteAnalysis> {
  const { name, url, hostname, categories, approvedTags, fallbackCategory } =
    normalizeInput(input);
  const fallback = localAnalysis(
    name,
    hostname,
    categories,
    approvedTags,
    fallbackCategory
  );
  if (!config.apiKey) return fallback;

  const baseUrl = (config.baseUrl || "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );
  const model = config.model || "gpt-4.1-mini";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是个人导航站的信息整理助手，只返回 JSON。category 必须是用户提供的分类 ID，绝对不能创建新分类。tag 只返回一个最贴切的简短中文标签。approvedTags 是人工审核过的标签词库：仅当其中某项与网站语义精确匹配时才复用其原词；绝不能为了复用而选择泛化或不相关标签，找不到精确匹配时应提出一个新的具体标签。description 使用简洁中文且不超过45字。",
        },
        {
          role: "user",
          content: JSON.stringify({
            name,
            url,
            categories,
            approvedTags,
            task: "识别网站名称，撰写简介，从现有分类中选择一个分类，并提出一个最贴切标签",
            schema: {
              name: "string",
              description: "string",
              category: "one of categories[].id",
              tag: "one approved tag only on an exact semantic match, otherwise one new specific string",
            },
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`AI 服务暂时不可用（${response.status}）。`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 没有返回可用结果。");
  return sanitizeAnalysis(
    JSON.parse(content),
    fallback,
    categories,
    approvedTags
  );
}

export async function analyzeSite(input: AnalyzeSiteInput) {
  return analyzeSiteWithConfig(input, {
    apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
    baseUrl: process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL,
    model: process.env.AI_MODEL || process.env.OPENAI_MODEL,
  });
}

export async function normalizeTagsWithConfig(
  input: TagNormalizationInput,
  config: SiteAnalysisConfig = {}
): Promise<Record<string, string>> {
  const candidates = (Array.isArray(input.candidates) ? input.candidates : [])
    .flatMap(value => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const item = value as Record<string, unknown>;
      return typeof item.tag === "string"
        ? [{
            tag: item.tag.trim().slice(0, 24),
            name: typeof item.name === "string" ? item.name.slice(0, 80) : "",
            url: typeof item.url === "string" ? item.url.slice(0, 200) : "",
            description:
              typeof item.description === "string" ? item.description.slice(0, 120) : "",
          }]
        : [];
    })
    .filter(item => item.tag)
    .slice(0, 500);
  if (!config.apiKey || !candidates.length)
    return Object.fromEntries(candidates.map(item => [item.tag, item.tag]));

  const baseUrl = (config.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = config.model || "gpt-4.1-mini";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是标签词库整理助手，只返回 JSON。将同义或过度具体的候选标签归并成简短、具体的中文规范标签；不要按网站分类创建大而泛的词。",
        },
        {
          role: "user",
          content: JSON.stringify({
            candidates,
            schema: { mappings: [{ from: "candidate tag", to: "canonical tag" }] },
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`标签整理服务暂时不可用（${response.status}）。`);
  const content = ((await response.json()) as { choices?: Array<{ message?: { content?: string } }> })
    .choices?.[0]?.message?.content;
  if (!content) throw new Error("标签整理服务没有返回可用结果。");
  const parsed = JSON.parse(content) as { mappings?: unknown };
  const allowed = new Set(candidates.map(item => item.tag));
  const mappings = Array.isArray(parsed.mappings) ? parsed.mappings : [];
  const result: Record<string, string> = Object.fromEntries(
    candidates.map(item => [item.tag, item.tag])
  );
  mappings.forEach(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const item = value as Record<string, unknown>;
    if (typeof item.from !== "string" || typeof item.to !== "string") return;
    const from = item.from.trim().slice(0, 24);
    const to = item.to.trim().slice(0, 24);
    if (allowed.has(from) && to) result[from] = to;
  });
  return result;
}
