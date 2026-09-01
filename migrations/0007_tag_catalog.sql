ALTER TABLE nav_state ADD COLUMN tag_catalog TEXT NOT NULL DEFAULT '[]';

-- Existing bookmark tags were previously the only vocabulary. Preserve them
-- once as the initial human-reviewed catalog for upgraded workspaces.
UPDATE nav_state
SET tag_catalog = COALESCE(
  (
    SELECT json_group_array(tag)
    FROM (
      SELECT DISTINCT trim(json_each.value) AS tag
      FROM sites, json_each(sites.tags)
      WHERE sites.workspace_id = nav_state.workspace_id
        AND json_valid(sites.tags)
        AND json_type(sites.tags) = 'array'
        AND trim(json_each.value) <> ''
      ORDER BY tag COLLATE NOCASE
    )
  ),
  '[]'
)
WHERE tag_catalog = '[]';
