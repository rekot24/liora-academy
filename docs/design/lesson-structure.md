# Lesson structure and storage (draft v0)

Status: DRAFT v1, 2026-10-20 (decisions in section 9 recorded). Nothing here is built. Supports ROADMAP Rebuild track R2 (instruction player and quizzes, migration 003). Public repo: keep it general, no personal details about the children.

Working names: **course** (a group of lessons), **lesson** (the existing planning unit), **instruction** (the screens under a lesson; name not settled).

## 1. What this has to do

- A lesson is authored once, then **copied to each student when assigned**. The copy can be edited for that student without touching the original, and can hold what the student did.
- What the student did (answers, quiz attempts, position, notes) is **history**. It must survive edits to the catalog, rescheduling, and a failed quiz must never make finished work look undone.
- Three authoring paths (AI-drafted, hand-written file, in-app editor) all produce **one shared format**, checked by one validator.
- Fits what already exists (migration 001): `lessons` catalog, `schedule_items.snapshot` copy, `customized_fields`, `completions`, `grades`. We extend it; we do not replace it.

## 2. The picture: three layers

```
CATALOG (household level, authored once)
  course  ->  lessons  ->  instruction content (screens, quiz, teacher notes)
                |
                |  assign (copy)            <- the rule that already exists
                v
ASSIGNMENT (one per student, per lesson, per scheduled day)
  schedule_items row: its own copy of the content + customized_fields
                |
                |  student works through it
                v
WORK (history, append-only where possible)
  progress (where she is, done, mastered)
  attempts + responses (every quiz try, every answer)
  notes (her recall text, teacher after-session notes)
  grades row (official score = best attempt)
```

Rule of thumb: **the content you assigned is one thing; what the student did with it is another.** They live in different tables so editing one never rewrites the other.

## 3. Catalog changes

**courses** (new): `id, household_id, subject_id, title, description, cover_asset_id, position, status (draft | published), archived_at, meta`

**lessons** (existing, add columns):

| Column | Meaning |
|---|---|
| `course_id` (nullable) | which course it belongs to; null = a stand-alone lesson, so today's catalog keeps working |
| `unit` (text, nullable) | a unit label inside the course; a real units table can come later |
| `instruction` (jsonb, nullable) | the screens, in the format in section 4. Null = a plain lesson with just text, like today |
| `instruction_version` (int) | goes up by one on each edit, so we can tell which version a student got |
| `status` | `draft` or `published`; only published lessons can be scheduled |

Courses and units are only grouping. Scheduling still works lesson by lesson, so "assign this course to a student" is a bulk insert of schedule rows, using the same copy path as today.

## 4. Instruction content format (JSON, `schemaVersion: 1`)

One lesson's content is one JSON document:

```json
{
  "schemaVersion": 1,
  "mastery": { "threshold": 0.8 },
  "screens": [
    { "id": "s-intro", "type": "intro", "mins": 1, "control": "teacher",
      "title": "How do you build a fair government?",
      "body": "Imagine 13 groups ...",
      "image": { "asset": "a_9f2c", "use": "background", "alt": "Independence Hall" },
      "teacher": { "say": "...", "ask": "...", "watch": "...", "time": "About 1 minute" } },

    { "id": "s-check1", "type": "check", "mins": 1, "control": "student",
      "question": { "id": "q-articles-tax",
        "text": "Why was it a problem that Congress could not raise money?",
        "choices": ["It could not pay soldiers or debts", "..."], "correct": 0,
        "explain": "A government that cannot pay its bills ..." } },

    { "id": "s-trail", "type": "facts", "title": "...",
      "sideTrail": { "title": "Shays' Rebellion", "body": "...", "video": { "url": "..." } } }
  ],
  "quiz": [ { "id": "q-1", "text": "...", "choices": ["..."], "correct": 1, "explain": "..." } ]
}
```

Rules for the format:

- **Stable ids.** Every screen and every question has an id that never changes once created. Answers are stored against the question id, so we can edit wording without orphaning history.
- **Screen types are a fixed list**, one React component each: `intro`, `info`, `facts` (tap to reveal), `check`, `map`, `compare` (two columns), `diagram`, `recall` (free text with model answer), `video`, `reading` (countdown timer, R3), `quiz`. New type = new component plus an entry in the type list. Unknown types render as a safe fallback.
- **Teacher notes and answer keys live in the same JSON** under `teacher`. The API only sends them to a teacher request. Today there are no per-person logins (known deviation: PIN soft locks), so this is a soft wall; a child could read it in browser dev tools. Acceptable for now, listed as a known limit.
- **Images and video by reference.** Images are `assets` (a small table plus files on the server, not in the public repo), referenced by asset id, never embedded. Video is a URL embed. Assets are immutable, so a copied lesson can point at the same asset safely.
- **Validated on every write.** One schema (TypeScript types plus Zod, shared by web and API in the rebuild) checks content before it is saved. The database only sees valid JSON.

## 5. Assignment changes (`schedule_items`, and `schedule_override_items`)

Add:

| Column | Meaning |
|---|---|
| `assignment_id` (uuid, unique) | a stable identity for this assignment. See the open question below |
| `content` (jsonb) | the student's own copy of the instruction, filled from the catalog when assigned |
| `content_version` (int) | the catalog version it was copied from |
| `previous_assignment_id` (uuid, nullable) | set when this is a re-teach of a lesson taught before; points at the earlier assignment so its notes can be carried over |

Why `content` is its own column and not inside `snapshot`: the schedule screen reads `snapshot` for every row; a 10 to 50 KB document in each would make every day view heavy. `snapshot` stays small text; `content` is loaded only when a lesson is opened.

Behavior:

- Fill `content` in the same trigger that fills `snapshot` today.
- **Customizing** (for example editing one screen for this student) changes `content` and adds `'content'` to `customized_fields`. In v1 customizing is all-or-nothing for the content: once customized, a catalog refresh will not touch it. Per-screen tracking can come later if we need it.
- `refresh_lesson_snapshots()` keeps its rule: only future, unfinished, uncustomized assignments are refreshed. Started work is never rewritten. A lesson with any attempts is treated as started.
- Size is not a concern: a 20 KB lesson times 200 lessons times 2 students is about 8 MB.

Alternative considered: keep content in an immutable `lesson_versions` table and let assignments point at a version (no duplicates, perfect "what did she see" history). Not chosen because per-student edits need copy-on-write anyway, and copy-on-assign is the model we already built and the one you described. Easy to revisit if it ever gets heavy.

## 6. Student work (new tables, history)

**assignment_progress**: one row per assignment

| Column | Meaning |
|---|---|
| `assignment_id` | which assignment |
| `current_screen_id` | where she is, so resuming opens the same screen |
| `started_at`, `last_active_at` | |
| `completed_at` | set when she finishes the screens (this drives "done") |
| `mastered_at` | set when a quiz attempt reaches the threshold (null = not yet) |
| `meta` | anything not planned |

Done and mastered are separate columns on purpose.

**quiz_attempts**: one row per try at the end quiz

`id, assignment_id, attempt_no, started_at, finished_at, score, max_score`

**responses**: one row per answer, for quiz and inline check questions

`id, assignment_id, attempt_id (null for inline checks), question_id, answer (jsonb), is_correct, answered_at`

Append-only. Nothing is overwritten, so every answer and its date is kept.

**session_notes**: the teacher's after-session notes and anything the student typed (such as the recall answer)

`id, assignment_id, kind (teacher | student), body (jsonb), created_at`

The teacher fields match the trial-month questions (attention 1 to 5, block that dragged, minutes used, quiz versus warm-up gap, screens to fix, what to change, topics to revisit). Stored as jsonb so the questions can change; compiled across lessons later.

**Derived, not stored:** current score = the best finished attempt (a query or view). Mastery threshold comes from the content (`mastery.threshold`, default to be decided).

## 7. How this meets the existing tables

- `completions` stays. When `completed_at` is set, the API writes the usual `done` row, so the current dashboards and reports keep working. Marking done by hand still works for lessons with no instruction (plain lessons, or reading until R3).
- `grades` stays as the **official gradebook row**. When an attempt finishes, the API upserts the grade from the best attempt (`grade_type = 'score'`, `score`, `max_score`). The full history is in `quiz_attempts`; `grades` is the one-line answer. Current PK is (student, date, lesson), so grades stay tied to the scheduled day; the attempt tables are the detailed truth.
- Migration 001 history rules still hold: assignments reference lessons with `ON DELETE RESTRICT`, so a used lesson is archived, never deleted. New work tables reference `assignment_id`, and deleting an assignment that has work is refused. Rescheduling must change the date, not delete and recreate (see open question).

## 8. Authoring paths, one pipeline

1. **Hand-written or AI-drafted file** (JSON, or a simpler outline format we convert) goes through an import that runs the validator, then saves as a **draft** lesson.
2. **In-app editor** edits the same JSON through forms and saves through the same validator. First version of the editor can be a plain JSON view with a live preview; the friendly screen-by-screen editor comes after.
3. A draft is previewed in the player (student view and teacher view), then **published**. Only published lessons can be scheduled.
4. Editing a published lesson bumps `instruction_version`. Assignments already copied are not changed unless you run the opt-in refresh.

## 9. Decisions and open items

**Decided (Joshua, 2026-10-20)**

1. **Rescheduling only changes the date.** Moving an assignment to another day is an update to its date. Nothing is deleted or re-created, and the progress, attempts, responses and notes stay attached through `assignment_id`. Implementation check for R2: the current change-only sync in `src/lib/syncClient.js` and the API must be read to confirm a move is an update and not a delete plus insert. If it is, change it so `assignment_id` survives.
2. **Courses can be assigned two ways:** the whole course in order (generating a day-by-day schedule) or lesson by lesson. Both end in the same copy-on-assign path.
3. **Re-teaching is allowed and is a new assignment with fresh work.** It starts with no answers and no attempts. It can pull over useful context from the earlier assignment through `previous_assignment_id`: the teacher's notes, the questions she missed (to open the session with), and the best score as a reference. Carry-over is shown to the teacher as suggestions and is never copied into the new assignment's history.
4. **Teacher notes and answer keys travel in the lesson content and are hidden only by role** (the API strips them from non-teacher requests) until per-person logins exist. Accepted for a single family. See "Known limit" below.

**Known limit: teacher-only data is not secret.** Because there are no per-person logins (known deviation: PIN soft locks), a student can read teacher notes and answer keys by looking at the browser's network traffic. Fine for one household. **Must be resolved before any other household uses this:** per-person logins first, then enforce on the server that student sessions never receive teacher fields (and quiz answers are checked on the server, not in the browser). Tracked in ROADMAP Issues and in CLAUDE.md known deviations.

**Still open**

1. Mastery threshold default. The mockup uses 4 of 5 (80%). Per lesson, or one household setting?
2. Asset storage. Files on the homelab served by Nginx, with source and license noted in the `assets` row. Backups must include them.
3. How the carry-over suggestions look to the teacher (a panel in the teacher view before the lesson starts?). Design in R2.

## 10. Migration 003 outline (not written)

Add courses, new lessons columns, new schedule columns and the fill trigger update, `assignment_progress`, `quiz_attempts`, `responses`, `session_notes`, `assets`. Back up first (`db/backup.sh`); additive only (no drops, no rewrites of existing columns), so it can be rolled back by simply not using the new columns. Backfill `assignment_id` for existing rows. Per project rules: numbered, immutable, written through the SPEC route, applied when the API container restarts.
