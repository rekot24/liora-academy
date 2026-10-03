-- 002: make remove_or_archive_lesson() work on every Postgres version.
--
-- When a DELETE is blocked by an ON DELETE RESTRICT foreign key, PostgreSQL 17 and older raise
-- foreign_key_violation (23503); PostgreSQL 18 raises restrict_violation (23001) instead.
-- The function must treat both as "this lesson is in use: archive it".
CREATE OR REPLACE FUNCTION remove_or_archive_lesson(p_lesson uuid) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM lessons WHERE id = p_lesson;
  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;
  RETURN 'deleted';
EXCEPTION WHEN foreign_key_violation OR restrict_violation THEN
  UPDATE lessons SET archived_at = COALESCE(archived_at, now()), updated_at = now() WHERE id = p_lesson;
  RETURN 'archived';
END;
$$;
