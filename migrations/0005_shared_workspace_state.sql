CREATE TABLE IF NOT EXISTS nav_state (
  workspace_id TEXT PRIMARY KEY,
  categories TEXT NOT NULL DEFAULT '[]',
  favorites TEXT NOT NULL DEFAULT '[]',
  preferences TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Releases before 1.1 generated a different workspace ID in every browser.
-- Preserve the newest version of each entry in the shared private workspace.
INSERT OR IGNORE INTO sites (
  workspace_id, id, name, url, description, category, category_label,
  icon, icon_url, icon_tone, tags, featured, accent, created_at, updated_at, sort_order
)
SELECT 'private-default', id, name, url, description, category, category_label,
  icon, icon_url, icon_tone, tags, featured, accent, created_at, updated_at, sort_order
FROM sites
WHERE workspace_id <> 'private-default'
ORDER BY updated_at DESC;
