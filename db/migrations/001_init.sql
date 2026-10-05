-- 001_init.sql — Liora's Academy initial schema
--
-- Design rules (see docs in db/README.md):
--   * Multi-tenant from day one: everything hangs off a household.
--   * Semesters, subjects, lessons and life skills are HOUSEHOLD-level catalogs
--     shared by that household's students.
--   * Everything a student does (schedule, completions, grades, progress, trips,
--     activities, evaluation, alerts) is STUDENT-level.
--   * Semesters are rows, not code. A student joins a semester via an enrollment,
--     which carries that student's subject list, target days and weekly pattern.
--   * A catalog lesson is a TEMPLATE. Scheduling it gives the student their own copy
--     (schedule_items.snapshot) that stays linked to the original (lesson_id). Editing that
--     copy for one student never touches the catalog, and editing the catalog never silently
--     rewrites anything already assigned. See customize_assignment() / refresh_lesson_snapshots().
--   * History tables (schedule, overrides, completions, grades) reference lessons
--     with ON DELETE RESTRICT: a lesson anyone has used cannot be hard-deleted.
--     remove_or_archive_lesson() deletes unused lessons and archives used ones.
--   * Every table that may grow has created_at / archived_at and a `meta` JSONB
--     escape hatch for fields we have not thought of yet.
--
-- Dates are `date` (no time zone). Times of day ("HH:MM") are text, as in the app.

-- ───────────────────────── tenancy & people ─────────────────────────

CREATE TABLE households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE students (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name        text NOT NULL,
  grade_label text,                       -- free text for now, e.g. '7th'
  email       text,                       -- optional: future per-student login
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (household_id, name),
  CHECK (email IS NULL OR email = lower(email))
);

-- Who may sign in to a household. The API maps the verified email (Cloudflare Access
-- today, a real auth provider later) to a household through this table.
CREATE TABLE household_members (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email        text NOT NULL,
  role         text NOT NULL CHECK (role IN ('owner', 'parent', 'student')),
  student_id   uuid REFERENCES students(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, email),
  CHECK (email = lower(email))
);

-- ───────────────────────── household catalogs ─────────────────────────

CREATE TABLE semesters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  slug         text NOT NULL,             -- legacy id, e.g. '2026-fall'
  name         text NOT NULL,
  mode         text,                      -- 'lite' | 'full' (open-ended on purpose)
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  archived_at  timestamptz,
  meta         jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (household_id, slug),
  CHECK (end_date >= start_date)
);

CREATE TABLE subjects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  archived_at  timestamptz,
  UNIQUE (household_id, name)
);

-- A batch groups lessons that arrived together (e.g. one imported sheet) so the whole
-- batch can be cleaned up later with remove_import_batch().
CREATE TABLE import_batches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  label        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  legacy_id       text,                   -- id used by the old localStorage app
  subject_id      uuid NOT NULL REFERENCES subjects(id),
  title           text NOT NULL,
  platform        text,
  description     text,
  level           text,                   -- free text today ('5th grade', 'Any'); see lesson_tags
  est_min         integer,
  seq             integer,                -- user-facing sequence number within the subject
  position        integer NOT NULL DEFAULT 0,  -- catalog order within the subject
  grading_type    text,                   -- NULL / 'none' | 'pass_fail' | 'score'
  grade_max       integer,
  import_batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  archived_at     timestamptz,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (household_id, legacy_id)
);
CREATE INDEX lessons_subject_idx ON lessons (household_id, subject_id, position);
CREATE INDEX lessons_batch_idx ON lessons (import_batch_id);

-- Structured tags (grade levels, topics...) so the catalog can be filtered and sorted
-- later without changing the lessons table. Empty for now.
CREATE TABLE lesson_tags (
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  kind      text NOT NULL DEFAULT 'grade',
  tag       text NOT NULL,
  PRIMARY KEY (lesson_id, kind, tag)
);

CREATE TABLE life_skills (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  legacy_id    text,                      -- 'ls001' ...
  category     text NOT NULL,
  title        text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  archived_at  timestamptz,
  UNIQUE (household_id, legacy_id)
);

-- ───────────────────────── enrollments (student × semester) ─────────────────────────

CREATE TABLE enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  target_days integer,
  is_active   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (student_id, semester_id)
);
-- at most one active enrollment per student
CREATE UNIQUE INDEX enrollments_one_active_idx ON enrollments (student_id) WHERE is_active;

CREATE TABLE enrollment_subjects (
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  subject_id    uuid NOT NULL REFERENCES subjects(id),
  position      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (enrollment_id, subject_id)
);

-- Recurring weekly pattern: which days of the week (0 = Sunday ... 6 = Saturday) each
-- subject is scheduled on, for this enrollment.
CREATE TABLE enrollment_pattern (
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  subject_id    uuid NOT NULL REFERENCES subjects(id),
  days          smallint[] NOT NULL,
  position      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (enrollment_id, subject_id)
);

-- ───────────────────────── per-student schedule & history ─────────────────────────

-- Each row is one assignment: this student, this day, this lesson. `lesson_id` links back to
-- the catalog original. `snapshot` is the student's own copy of the lesson text (subject,
-- title, platform, description, level, estMin, seq, ...) as it was when scheduled. It is filled
-- automatically on insert. `customized_fields` lists the fields that were edited for this
-- assignment only (customize_assignment); those survive any later catalog sync.
-- Editing the catalog never changes assignments on its own: use refresh_lesson_snapshots()
-- to opt in, and it only touches future, unfinished, uncustomized fields.
CREATE TABLE schedule_items (
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date       date NOT NULL,
  position   integer NOT NULL,
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,
  customized_fields text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (student_id, date, position)
);
CREATE INDEX schedule_items_lesson_idx ON schedule_items (lesson_id);

-- Manual day edits. is_skip = an intentionally empty day; otherwise the day's lessons
-- are in schedule_override_items.
CREATE TABLE schedule_overrides (
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date       date NOT NULL,
  is_skip    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (student_id, date)
);

CREATE TABLE schedule_override_items (
  student_id uuid NOT NULL,
  date       date NOT NULL,
  position   integer NOT NULL,
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,
  customized_fields text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (student_id, date, position),
  FOREIGN KEY (student_id, date) REFERENCES schedule_overrides (student_id, date) ON DELETE CASCADE
);
CREATE INDEX schedule_override_items_lesson_idx ON schedule_override_items (lesson_id);

-- One row per student, day and lesson. A lesson that is not done or skipped has no row.
CREATE TABLE completions (
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date       date NOT NULL,
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  status     text NOT NULL CHECK (status IN ('done', 'skipped')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, date, lesson_id)
);
CREATE INDEX completions_lesson_idx ON completions (lesson_id);

CREATE TABLE grades (
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date       date NOT NULL,
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  grade_type text NOT NULL CHECK (grade_type IN ('pass_fail', 'score')),
  passed     boolean,
  score      double precision,
  max_score  double precision,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, date, lesson_id),
  CHECK (
    (grade_type = 'pass_fail' AND passed IS NOT NULL) OR
    (grade_type = 'score' AND score IS NOT NULL)
  )
);
CREATE INDEX grades_lesson_idx ON grades (lesson_id);

CREATE TABLE life_skill_progress (
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  life_skill_id uuid NOT NULL REFERENCES life_skills(id),
  done_date     date NOT NULL,
  PRIMARY KEY (student_id, life_skill_id)
);

-- ───────────────────────── per-student lists & settings ─────────────────────────

CREATE TABLE field_trips (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  trip_date         date NOT NULL,
  place             text NOT NULL,
  subjects          text,
  notes             text,
  counts_attendance boolean NOT NULL DEFAULT true,
  position          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  meta              jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX field_trips_student_idx ON field_trips (student_id, trip_date);

CREATE TABLE extracurriculars (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text,
  days       smallint[] NOT NULL DEFAULT '{}',
  time       text,
  location   text,
  notes      text,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  meta       jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX extracurriculars_student_idx ON extracurriculars (student_id);

CREATE TABLE evaluations (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  label      text,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed')),
  due_date   date,
  show_from  date
);

CREATE TABLE alert_settings (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  browser    boolean NOT NULL DEFAULT true,
  apollo     boolean NOT NULL DEFAULT true
);

-- Alerts are reminders, not history, so they go away with their lesson.
CREATE TABLE alerts (
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date       date NOT NULL,
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  time       text NOT NULL,
  PRIMARY KEY (student_id, date, lesson_id)
);

-- ───────────────────────── lesson removal rule ─────────────────────────

-- Remove a lesson completely if nothing has ever used it; otherwise archive it so
-- history (schedules, completions, grades) stays intact. The history foreign keys above
-- are what decide: if any row still points at the lesson the DELETE is refused and the
-- lesson is archived instead. Returns 'deleted' or 'archived'.
CREATE FUNCTION remove_or_archive_lesson(p_lesson uuid) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM lessons WHERE id = p_lesson;
  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;
  RETURN 'deleted';
EXCEPTION WHEN foreign_key_violation THEN
  UPDATE lessons SET archived_at = COALESCE(archived_at, now()), updated_at = now() WHERE id = p_lesson;
  RETURN 'archived';
END;
$$;

-- Remove every lesson that arrived in one import: unused ones are deleted, used ones are
-- archived. Returns how many of each.
CREATE FUNCTION remove_import_batch(p_batch uuid) RETURNS TABLE (deleted integer, archived integer)
LANGUAGE plpgsql AS $$
DECLARE
  l record;
  result text;
  d integer := 0;
  a integer := 0;
BEGIN
  FOR l IN SELECT id FROM lessons WHERE import_batch_id = p_batch LOOP
    result := remove_or_archive_lesson(l.id);
    IF result = 'deleted' THEN d := d + 1; ELSIF result = 'archived' THEN a := a + 1; END IF;
  END LOOP;
  DELETE FROM import_batches WHERE id = p_batch;
  RETURN QUERY SELECT d, a;
END;
$$;

-- ───────────────────────── lesson snapshots ─────────────────────────

-- The frozen copy of a lesson as the schedule shows it (no id or date: those are columns).
CREATE FUNCTION lesson_snapshot(p_lesson uuid) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
           'subject', s.name, 'title', l.title, 'platform', l.platform, 'description', l.description,
           'level', l.level, 'estMin', l.est_min, 'seq', l.seq, 'gradingType', l.grading_type, 'gradeMax', l.grade_max))
         || l.meta
    FROM lessons l JOIN subjects s ON s.id = l.subject_id
   WHERE l.id = p_lesson
$$;

-- New schedule rows get their snapshot automatically unless the caller supplied one
-- (the legacy import supplies the exact frozen text it found).
CREATE FUNCTION fill_snapshot() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.snapshot = '{}'::jsonb THEN
    NEW.snapshot := lesson_snapshot(NEW.lesson_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER schedule_items_fill_snapshot BEFORE INSERT ON schedule_items
  FOR EACH ROW EXECUTE FUNCTION fill_snapshot();
CREATE TRIGGER schedule_override_items_fill_snapshot BEFORE INSERT ON schedule_override_items
  FOR EACH ROW EXECUTE FUNCTION fill_snapshot();

-- The catalog's current text, but keeping this assignment's own edited fields.
CREATE FUNCTION merge_catalog_into_snapshot(p_lesson uuid, p_old jsonb, p_custom text[]) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT lesson_snapshot(p_lesson)
         || COALESCE((SELECT jsonb_object_agg(k, p_old -> k) FROM unnest(p_custom) AS k WHERE p_old ? k), '{}'::jsonb)
$$;

-- Opt-in sync after the catalog lesson changed: refreshes the copies on FUTURE assignments
-- that are not yet done or skipped, for every student, leaving fields that were customized
-- for that assignment alone. Past and completed assignments are never touched, so history
-- keeps what was actually assigned. Returns the number of assignments refreshed.
CREATE FUNCTION refresh_lesson_snapshots(p_lesson uuid, p_from date DEFAULT current_date) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  n1 integer;
  n2 integer;
BEGIN
  UPDATE schedule_items si SET snapshot = merge_catalog_into_snapshot(si.lesson_id, si.snapshot, si.customized_fields)
   WHERE si.lesson_id = p_lesson AND si.date >= p_from
     AND NOT EXISTS (SELECT 1 FROM completions c WHERE c.student_id = si.student_id AND c.date = si.date AND c.lesson_id = si.lesson_id);
  GET DIAGNOSTICS n1 = ROW_COUNT;
  UPDATE schedule_override_items oi SET snapshot = merge_catalog_into_snapshot(oi.lesson_id, oi.snapshot, oi.customized_fields)
   WHERE oi.lesson_id = p_lesson AND oi.date >= p_from
     AND NOT EXISTS (SELECT 1 FROM completions c WHERE c.student_id = oi.student_id AND c.date = oi.date AND c.lesson_id = oi.lesson_id);
  GET DIAGNOSTICS n2 = ROW_COUNT;
  RETURN n1 + n2;
END;
$$;

-- Edit ONE student's assignment without touching the catalog or anyone else's copy.
-- p_patch is a JSON object of the fields to change, e.g. '{"title": "...", "estMin": 15}'.
-- The changed fields are remembered in customized_fields. Returns the new snapshot.
CREATE FUNCTION customize_assignment(p_student uuid, p_date date, p_position integer, p_patch jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  UPDATE schedule_items
     SET snapshot = snapshot || p_patch,
         customized_fields = ARRAY(SELECT DISTINCT f FROM unnest(customized_fields || ARRAY(SELECT jsonb_object_keys(p_patch))) AS f ORDER BY f)
   WHERE student_id = p_student AND date = p_date AND position = p_position
   RETURNING snapshot INTO result;
  IF result IS NULL THEN
    RAISE EXCEPTION 'no assignment for student % on % at position %', p_student, p_date, p_position;
  END IF;
  RETURN result;
END;
$$;
