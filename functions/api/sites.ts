import { json, requireAuthenticated, workspaceId, type PagesContext } from "../_types";

type SitePayload = {
  id: string;
  name: string;
  url: string;
  description: string;
  category: string;
  categoryLabel: string;
  icon: string;
  iconUrl?: string;
  iconTone: string;
  tags: string[];
  featured?: boolean;
  accent?: string;
  sortOrder?: number;
};

type SiteRow = {
  id: string;
  name: string;
  url: string;
  description: string;
  category: SitePayload["category"];
  category_label: string;
  icon: string;
  icon_url: string | null;
  icon_tone: string;
  tags: string;
  featured: number;
  accent: string | null;
  sort_order: number;
};

function sanitizeSite(value: unknown, fallbackSortOrder = 0): SitePayload {
  if (!value || typeof value !== "object") throw new Error("网站数据格式不正确。");
  const data = value as Record<string, unknown>;
  const required = ["id", "name", "url", "description", "category", "categoryLabel", "icon", "iconTone"];
  if (required.some((key) => typeof data[key] !== "string")) throw new Error("网站数据缺少必要字段。");
  const parsedUrl = new URL(data.url as string);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("网站地址无效。");
  return {
    id: (data.id as string).slice(0, 120),
    name: (data.name as string).trim().slice(0, 80),
    url: parsedUrl.toString(),
    description: (data.description as string).trim().slice(0, 240),
    category: data.category as SitePayload["category"],
    categoryLabel: (data.categoryLabel as string).trim().slice(0, 40),
    icon: (data.icon as string).trim().slice(0, 8),
    iconUrl: typeof data.iconUrl === "string" ? data.iconUrl.slice(0, 400_000) : undefined,
    iconTone: (data.iconTone as string).trim().slice(0, 30),
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim().slice(0, 24)).filter(Boolean).slice(0, 8) : [],
    featured: data.featured === true,
    accent: typeof data.accent === "string" ? data.accent.slice(0, 30) : undefined,
    sortOrder: typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)
      ? Math.max(0, Math.trunc(data.sortOrder))
      : fallbackSortOrder,
  };
}

function toSite(row: SiteRow): SitePayload {
  let tags: string[] = [];
  try { tags = JSON.parse(row.tags) as string[]; } catch { /* keep empty tags */ }
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    category: row.category,
    categoryLabel: row.category_label,
    icon: row.icon,
    iconUrl: row.icon_url || undefined,
    iconTone: row.icon_tone,
    tags,
    featured: row.featured === 1,
    accent: row.accent || undefined,
    sortOrder: row.sort_order,
  };
}

async function upsertSite(context: PagesContext, workspace: string, site: SitePayload) {
  await context.env.NAV_DB.prepare(`
    INSERT INTO sites (workspace_id, id, name, url, description, category, category_label, icon, icon_url, icon_tone, tags, featured, accent, sort_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(workspace_id, id) DO UPDATE SET
      name = excluded.name, url = excluded.url, description = excluded.description,
      category = excluded.category, category_label = excluded.category_label,
      icon = excluded.icon, icon_url = excluded.icon_url, icon_tone = excluded.icon_tone,
      tags = excluded.tags, featured = excluded.featured, accent = excluded.accent,
      sort_order = excluded.sort_order,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    workspace, site.id, site.name, site.url, site.description, site.category,
    site.categoryLabel, site.icon, site.iconUrl || null, site.iconTone,
    JSON.stringify(site.tags), site.featured ? 1 : 0, site.accent || null, site.sortOrder || 0,
  ).run();
}

export async function onRequestGet(context: PagesContext) {
  const unauthorized = await requireAuthenticated(context.request, context.env);
  if (unauthorized) return unauthorized;
  try {
    const workspace = workspaceId(context.request);
    const result = await context.env.NAV_DB.prepare(`
      SELECT id, name, url, description, category, category_label, icon, icon_url, icon_tone, tags, featured, accent, sort_order
      FROM sites WHERE workspace_id = ? ORDER BY sort_order ASC, created_at ASC
    `).bind(workspace).all<SiteRow>();
    return json({ sites: (result.results || []).map(toSite) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "读取网站失败。" }, { status: 400 });
  }
}

export async function onRequestPost(context: PagesContext) {
  const unauthorized = await requireAuthenticated(context.request, context.env);
  if (unauthorized) return unauthorized;
  try {
    const workspace = workspaceId(context.request);
    const body = await context.request.json() as { site?: unknown; sites?: unknown[] };
    const values = Array.isArray(body.sites) ? body.sites : [body.site];
    if (!values.length || values.length > 100) throw new Error("网站数量无效。");
    const sites = values.map((value, index) => sanitizeSite(value, index));
    for (const site of sites) await upsertSite(context, workspace, site);
    return json({ success: true, sites });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "保存网站失败。" }, { status: 400 });
  }
}
export async function onRequestDelete(context: PagesContext) {
  const unauthorized = await requireAuthenticated(context.request, context.env);
  if (unauthorized) return unauthorized;
  try {
    const workspace = workspaceId(context.request);
    const body = await context.request.json() as { id?: unknown };
    if (typeof body.id !== "string" || !body.id.trim()) throw new Error("入口 ID 无效。");
    const id = body.id.trim().slice(0, 120);
    await context.env.NAV_DB.prepare(
      "DELETE FROM sites WHERE workspace_id = ? AND id = ?",
    ).bind(workspace, id).run();
    return json({ success: true, id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "删除网站失败。" }, { status: 400 });
  }
}
