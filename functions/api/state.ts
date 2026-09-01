import {
  json,
  requireAuthenticated,
  workspaceId,
  type PagesContext,
} from "../_types";

type CategoryPayload = {
  id: string;
  label: string;
  iconKey: string;
  color: string;
  system?: boolean;
};

type PreferencesPayload = Record<string, string | number | boolean>;
type StatePayload = {
  categories: CategoryPayload[];
  favorites: string[];
  tagCatalog: string[];
  preferences: PreferencesPayload;
};
type StateRow = {
  categories: string;
  favorites: string;
  tag_catalog: string;
  preferences: string;
  updated_at: string;
};

const iconKeys = new Set([
  "grid",
  "sparkles",
  "sliders",
  "list",
  "compass",
  "bookmark",
  "folder",
  "briefcase",
  "palette",
]);
const preferenceKeys = new Set([
  "skin",
  "viewMode",
  "sortMode",
  "showDescriptions",
  "sidebarCollapsed",
  "backgroundMode",
  "backgroundAnimationSpeed",
  "customBackground",
  "backgroundImage",
  "backgroundImageBlur",
  "backgroundImageBrightness",
  "backgroundImageContrast",
  "backgroundImageAdaptive",
]);

function sanitizeTagCatalog(value: unknown): string[] {
  const seen = new Set<string>();
  return (Array.isArray(value) ? value : [])
    .flatMap(item =>
      typeof item === "string" ? [item.trim().slice(0, 24)] : []
    )
    .filter(tag => {
      const key = tag.toLocaleLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 500);
}

function sanitizeState(value: unknown): StatePayload {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid navigation state.");
  const data = value as Record<string, unknown>;
  const rawCategories = Array.isArray(data.categories) ? data.categories : [];
  const rawFavorites = Array.isArray(data.favorites) ? data.favorites : [];
  const tagCatalog = sanitizeTagCatalog(data.tagCatalog);
  const rawPreferences =
    data.preferences &&
    typeof data.preferences === "object" &&
    !Array.isArray(data.preferences)
      ? (data.preferences as Record<string, unknown>)
      : {};

  const categories = rawCategories.slice(0, 100).flatMap(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const category = value as Record<string, unknown>;
    if (typeof category.id !== "string" || typeof category.label !== "string")
      return [];
    const id = category.id.trim().slice(0, 120);
    const label = category.label.trim().slice(0, 40);
    if (!id || !label) return [];
    return [
      {
        id,
        label,
        iconKey:
          typeof category.iconKey === "string" && iconKeys.has(category.iconKey)
            ? category.iconKey
            : "folder",
        color:
          typeof category.color === "string"
            ? category.color.trim().slice(0, 30) || "mint"
            : "mint",
        system: id === "all" || id === "favorites",
      },
    ];
  });

  const favorites = rawFavorites
    .filter((id): id is string => typeof id === "string")
    .map(id => id.slice(0, 120))
    .slice(0, 5000);

  const preferences: PreferencesPayload = {};
  for (const [key, value] of Object.entries(rawPreferences)) {
    if (
      !preferenceKeys.has(key) ||
      !["string", "number", "boolean"].includes(typeof value)
    )
      continue;
    if (key === "backgroundImage" && typeof value === "string")
      preferences[key] = value.slice(0, 1_500_000);
    else if (typeof value === "string") preferences[key] = value.slice(0, 200);
    else preferences[key] = value as number | boolean;
  }
  return { categories, favorites, tagCatalog, preferences };
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function onRequestGet(context: PagesContext) {
  try {
    const result = await context.env.NAV_DB.prepare(
      `
      SELECT categories, favorites, tag_catalog, preferences, updated_at
      FROM nav_state WHERE workspace_id = ?
    `
    )
      .bind(workspaceId(context.request))
      .all<StateRow>();
    const row = result.results?.[0];
    if (!row) return json({ state: null });
    return json({
      state: {
        categories: parseJson(row.categories, []),
        favorites: parseJson(row.favorites, []),
        tagCatalog: parseJson(row.tag_catalog, []),
        preferences: parseJson(row.preferences, {}),
      },
      updatedAt: row.updated_at,
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to read navigation state.",
      },
      { status: 400 }
    );
  }
}

export async function onRequestPut(context: PagesContext) {
  const unauthorized = await requireAuthenticated(context.request, context.env);
  if (unauthorized) return unauthorized;
  try {
    const state = sanitizeState(await context.request.json());
    await context.env.NAV_DB.prepare(
      `
      INSERT INTO nav_state (workspace_id, categories, favorites, tag_catalog, preferences, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(workspace_id) DO UPDATE SET
        categories = excluded.categories,
        favorites = excluded.favorites,
        tag_catalog = excluded.tag_catalog,
        preferences = excluded.preferences,
        updated_at = CURRENT_TIMESTAMP
    `
    )
      .bind(
        workspaceId(context.request),
        JSON.stringify(state.categories),
        JSON.stringify(state.favorites),
        JSON.stringify(state.tagCatalog),
        JSON.stringify(state.preferences)
      )
      .run();
    return json({ success: true, state });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save navigation state.",
      },
      { status: 400 }
    );
  }
}
