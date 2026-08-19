-- Migration number: 0003 	 2026-08-19T15:52:50.726Z
CREATE TABLE IF NOT EXISTS sites (
  workspace_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('design', 'dev', 'productivity', 'inspiration')),
  category_label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  icon_url TEXT,
  icon_tone TEXT NOT NULL DEFAULT 'mint',
  tags TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  accent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, id)
);

CREATE INDEX IF NOT EXISTS idx_sites_workspace_updated
  ON sites (workspace_id, updated_at DESC);
