export type AnalysisCategory = { id: string; label: string };

export type AnalyzeSiteInput = {
  name?: unknown;
  url?: unknown;
  categories?: unknown;
  existingTags?: unknown;
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
  const existingTags = (
    Array.isArray(input.existingTags) ? input.existingTags : []
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
    existingTags,
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
  existingTags: string[],
  category: AnalysisCategory
) {
  const direct = existingTags.find(tag =>
    haystack.includes(tag.toLocaleLowerCase())
  );
  if (direct) return direct;

  const matchingGroup = categoryKeywords.find(group =>
    group.some(word =>
      `${category.id} ${category.label}`
        .toLocaleLowerCase()
        .includes(word.toLocaleLowerCase())
    )
  );
  const related = matchingGroup
    ? existingTags.find(tag =>
        matchingGroup.some(word =>
          tag.toLocaleLowerCase().includes(word.toLocaleLowerCase())
        )
      )
    : undefined;
  return related || category.label.slice(0, 24);
}

function localAnalysis(
  name: string,
  hostname: string,
  categories: AnalysisCategory[],
  existingTags: string[],
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
  const tag = chooseLocalTag(haystack, existingTags, category);
  return {
    name: inferredName,
    description: `${inferredName} 是一个便于日常访问与使用的在线工具。`,
    category: category.id,
    tags: tag ? [tag] : [],
    source: "local",
  };
}

function canonicalTag(value: unknown, existingTags: string[]) {
  if (typeof value !== "string") return "";
  const tag = value.trim().slice(0, 24);
  if (!tag) return "";
  return (
    existingTags.find(
      existing => existing.toLocaleLowerCase() === tag.toLocaleLowerCase()
    ) || tag
  );
}

function sanitizeAnalysis(
  value: unknown,
  fallback: SiteAnalysis,
  categories: AnalysisCategory[],
  existingTags: string[]
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
  const tag = canonicalTag(rawTag, existingTags) || fallback.tags[0] || "";
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
  const { name, url, hostname, categories, existingTags, fallbackCategory } =
    normalizeInput(input);
  const fallback = localAnalysis(
    name,
    hostname,
    categories,
    existingTags,
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
            "你是个人导航站的信息整理助手，只返回 JSON。category 必须是用户提供的分类 ID，绝对不能创建新分类。tag 只返回一个最贴切的简短标签；优先精确复用 existingTags，确无合适项时才创建一个新标签。description 使用简洁中文且不超过45字。",
        },
        {
          role: "user",
          content: JSON.stringify({
            name,
            url,
            categories,
            existingTags,
            task: "识别网站名称，撰写简介，从现有分类中选择一个分类，并选择一个最贴切标签",
            schema: {
              name: "string",
              description: "string",
              category: "one of categories[].id",
              tag: "one existing tag when suitable, otherwise one new string",
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
    existingTags
  );
}

export async function analyzeSite(input: AnalyzeSiteInput) {
  return analyzeSiteWithConfig(input, {
    apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
    baseUrl: process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL,
    model: process.env.AI_MODEL || process.env.OPENAI_MODEL,
  });
}
