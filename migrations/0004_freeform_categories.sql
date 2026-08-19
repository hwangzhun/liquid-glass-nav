CREATE TABLE sites_freeform_categories (
  workspace_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  category_label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  icon_url TEXT,
  icon_tone TEXT NOT NULL DEFAULT 'mint',
  tags TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  accent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id, id)
);

INSERT INTO sites_freeform_categories (
  workspace_id, id, name, url, description, category, category_label,
  icon, icon_url, icon_tone, tags, featured, accent, created_at, updated_at, sort_order
)
SELECT
  workspace_id, id, name, url, description, category, category_label,
  icon, icon_url, icon_tone, tags, featured, accent, created_at, updated_at, sort_order
FROM sites;

DROP TABLE sites;
ALTER TABLE sites_freeform_categories RENAME TO sites;

CREATE INDEX idx_sites_workspace_updated
  ON sites (workspace_id, updated_at DESC);

CREATE INDEX idx_sites_workspace_sort
  ON sites (workspace_id, sort_order ASC, created_at ASC);
