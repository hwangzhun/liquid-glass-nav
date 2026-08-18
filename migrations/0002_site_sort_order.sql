ALTER TABLE sites ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sites_workspace_sort
  ON sites (workspace_id, sort_order ASC, created_at ASC);
