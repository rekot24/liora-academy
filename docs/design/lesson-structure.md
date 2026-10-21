# Course, section and lesson structure and storage (draft v2)

Status: DRAFT v2, 2026-10-21. Replaces v1 (2026-10-20). Nothing here is built. Supports ROADMAP Rebuild track R2. Public repo: keep it general, no personal details about the children.

## 0. What changed from v1

- **New words.** Course, section, lesson. "Instruction" is retired. See section 1.
- **Copy versus reference reversed.** v1 copied the whole lesson onto each assignment. With immutable versions (your request) it is better to **point at an exact version** and store only the student's work and any small per-student edits. Same protection for history, no duplicated content. See section 5.
- **Versioning scheme changed.** Versions are per item and immutable, not a nested dotted number. See section 4.
- **Assignment identity.** The schedule row gets its own id as primary key, and completions and grades hang off it. See section 5.
- **New rules:** attempt limit using runs, screen gates, read-aloud, themes. Sections 7 to 9.

## 1. Words and rules

| Word | Meaning |
|---|---|
| **Course** | Top level, for example "US History". Belongs to a subject. |
| **Section** | A unit of the course. A course has many sections; a section belongs to exactly one course. |
| **Lesson** | One teaching session: the screens, checks, teacher notes and quiz. A section has many lessons; a lesson belongs to exactly one section. |

- To reuse a lesson in another course, **fork** it (a copy with its own history), never share one row.
- "Instruction" is retired. The DB table `lessons` stays and becomes the new lesson (see open question 1 about what the old planning lessons map to).
- Plain lessons with no screens (a Khan Academy link, a reading) are lessons with empty content, so the catalog you have today keeps working.

## 2. What this has to do

- Author once. Assign to a student without losing the original or other students' copies.
- Keep **every version** of a lesson so we always know exactly what a student saw.
- Student work (answers, attempts, notes, position, time spent) is history and survives edits, version changes and rescheduling.
- Done and mastered stay separate. A failed quiz never makes finished work look undone.
- Three authoring paths (AI-drafted, hand-written, in-app editor), one format, one validator.

## 3. The picture

```
CATALOG (household level; items are immutable once published)
  subject -> course -> section -> lesson -> lesson_versions (v1, v2, v3 ...)
                                              |
                                              |  assign: pin one exact version
                                              v
ASSIGNMENT (one per student, per scheduled lesson; has its own id)
  points at lesson_version, plus optional small per-student edits
                                              |
                                              |  student works through it
                                              v
WORK (append-only history)
  runs (each pass through the lesson) -> quiz attempts, responses
  screen views (time spent), notes, progress, grade (best attempt)
```

## 4. Versioning

**Rule:** every lesson has immutable versions numbered 1, 2, 3 by their own counter. Editing a published lesson never changes it in place. It creates a new draft version; publishing makes it the current one. Old versions stay forever.

Why not a nested number like 1.1.3 (course.section.lesson):

- Editing one lesson would have to bump its section and its course too, so numbers would climb on every edit and mean little.
- Reordering or splitting sections would force renumbering the children, which breaks the "this is exactly what she saw" record.
- The three digits mix "where it sits" with "which edit it is". Position belongs to the structure; the version belongs to the content.

So:

| Level | How it is versioned |
|---|---|
| **Lesson** | Full immutable versions (`lesson_versions`). This is where the content and the history that matters live. |
| **Section and course** | Living records (title, description, order, theme). Every change is written to an append-only `catalog_history` (who, when, before, after), so nothing is lost. |
| **Course release (optional, later)** | A named freeze: a manifest listing each lesson and its pinned version in order ("US History, Spring 2027 edition"). Lets you assign "the course as of release 2". Costs nothing until you use it. |

A dotted label such as **1.1.3** can still be shown on screen. Derive it for display from `course release . section position . lesson version`; it is not stored, so we can change the format later without touching data.

**`lesson_versions`:** `id, lesson_id, version, status (draft | published), content jsonb, content_hash, change_note, created_at, created_by`. Unique on (lesson_id, version). A hash of the content stops identical versions being saved twice. Published rows are never updated (a database rule or trigger enforces it).

## 5. Assignments: reference, not copy

**Your question: copy the course for each student, or tie a table of grades and notes to the student?** The second, with one change: tie it to the **assignment**, not to the course.

- The assignment **points at one exact lesson version.** Because versions never change, pointing at one gives the same protection as a copy, with no duplicated content.
- The student's **work** (answers, attempts, notes, position) lives in its own tables and references the assignment.
- **Per-student edits** (rare) are stored as a small patch on the assignment, keyed by screen id, and applied when the lesson is shown. We copy only when something is actually edited, not for every assignment.
- **Updating to a newer version** is allowed only if no work has started. The teacher can choose "update to latest" for an unstarted assignment. Started work stays pinned.

### Assignment identity (your answer to question 1)

Yes: **`assignment_id` is the new primary key.** The schedule row currently uses (student, date, position), which is why moving a day would break links. Change it:

- `schedule_items.id` (uuid) becomes the primary key. `date` and `position` become ordinary columns, indexed.
- **Moving a lesson to another day changes only the date.** Nothing is deleted or re-created.
- `completions` and `grades` currently key on (student, date, lesson). They must reference the assignment id too, or moving a lesson would leave its completion behind. The date stays as "done on".
- Same change for `schedule_override_items`.
- This is a change to a live table that the current portal and API use. See section 10 for how to do it safely.

New columns on `schedule_items`: `lesson_version_id`, `override jsonb` (nullable), `previous_assignment_id` (nullable, for re-teach), `course_assignment_id` (nullable, see below).

### Two ways to assign a course (your answer to question 2)

- **Whole course:** a new table `course_assignments` (student, course, optional release, start date, status). The API generates the day-by-day assignments for every lesson in order, using the student's weekly pattern for that subject (`enrollment_pattern`, which already exists). Each assignment pins the then-current published version.
- **Lesson by lesson:** as today, one assignment at a time.
- Both create the same assignment rows. (Named `course_assignments` so it is not confused with the existing `enrollments`, which are student by semester.)

### Re-teaching (your answer to question 5)

A re-teach is a **new assignment** with its own id and fresh work. `previous_assignment_id` points at the earlier one so the teacher view can suggest carry-over: the teacher's earlier notes, the questions she missed, her best score. These are suggestions only; they are never copied into the new assignment's history.

## 6. Student work (history, append-only)

**`assignment_progress`** (one row per assignment): `assignment_id, current_screen_id, started_at, last_active_at, completed_at, mastered_at, meta`. Done and mastered are separate columns.

**`lesson_runs`:** `id, assignment_id, run_no, started_at, finished_at`. A **run** is one pass through the lesson from the first screen. Restarting the lesson creates a new run. Runs are what makes the attempt limit (section 7) work.

**`quiz_attempts`:** `id, run_id, attempt_no, started_at, finished_at, score, max_score`.

**`responses`:** `id, run_id, attempt_id (null for inline checks), question_id, answer jsonb, is_correct, answered_at`. Append-only.

**`screen_views`:** `id, run_id, screen_id, entered_at, left_at, active_ms, gate_met`. Shows how long each screen was actually open, which is how the teacher sees skimming.

**`session_notes`:** `id, assignment_id, kind (teacher | student), body jsonb, created_at`. The after-session notes and anything the student typed.

**Derived, not stored:** current score is the best finished attempt across all runs. The official gradebook row (`grades`) is upserted from the best attempt, so existing grade views keep working. `completed_at` writes the usual `done` completion row. `mastered_at` is set the first time a best score reaches the threshold.

## 7. Quiz attempt limit

**Rule:** a run allows a small number of quiz attempts (default 2, immediately available). After that, the student must **start the lesson over** and click through to the quiz again, which creates a new run.

- Enforced on the **server** at the moment an attempt starts, not just by hiding the button, so it cannot be spammed.
- Settings (section 11): attempts per run, and an optional cap per day.
- The best attempt across all runs is still the current score; nothing is lost.
- The teacher can grant an extra attempt. The override is recorded.

## 8. Screen gates and read-aloud

**Gates** make sure a screen is actually read, not just clicked through. Each screen can set a gate; Next stays off until it is met:

- **Minimum time.** Default computed from the word count (a placeholder to tune in the trial month, roughly the screen's words divided by 6, clamped to between 3 and 30 seconds), overridable per screen. Shown as a gentle progress ring ("take a moment to read"), not a punishment.
- **Interaction.** Reveal all cards, answer the check, or play the video.
- **Read-aloud finished** (below).
- A per-student setting scales or turns off the minimum time. Some learners need more time and some will be slowed by a timer; the evidence on this for specific conditions is thin, so it is adjustable and never penalized.
- Every screen visit is recorded in `screen_views`, so a lesson clicked through in a few seconds shows up in the teacher view.

Honest limit: gates add friction and visibility, not security. Someone present at the table is still the real check.

**Read-aloud.**

- **First version:** the browser's built-in speech synthesis. No cost, no data leaves the device, voices vary by device. The screen's text (or a separate `readAloudText` where the written text should not be read word for word) is read when the student presses Play; when the speech ends, the gate is met and Next unlocks.
- **Quirks to test on the devices you actually use:** playback must be started by a click or tap; long text can cut off in some browsers, so we read one sentence or paragraph at a time; the end event is not reliable everywhere, so there is always a teacher skip.
- **Later:** pre-generated audio files stored as assets and attached to a screen (`audio`), for better and consistent voices.
- A setting says whether read-aloud is required, optional, or off, per student.

## 9. Themes

A **theme** is a named set of design tokens. Assign one to a course, section or lesson; the most specific wins (lesson, then section, then course, then household default, then the app default).

- **Storage:** `themes` (`id, household_id (null for built-in), slug, name, tokens jsonb, archived_at`) and a nullable `theme_id` on courses, sections and lessons.
- **Tokens only, never free CSS.** A fixed list of keys: colors (background, surface, ink, muted, accent, good, bad), a font from an allowed list, corner radius, spacing scale, a background image (an asset), motion level. This keeps every theme consistent and safe.
- **Each theme defines a light and a dark set.** On save, the validator checks contrast (4.5 to 1 for text, 3 to 1 for controls) so a theme cannot make a lesson unreadable.
- **How it is applied:** the lesson player sets the theme's values as CSS custom properties on its root element; every component reads only those variables and never hard-codes colors. The mockup already works this way, so it is cheap if the rebuild's design tokens (R1) are done this way from the start.
- Themes are presentation, not content, so they are **not** pinned to a lesson version. Restyling a theme restyles every lesson that uses it, which is the point.
- Respects reduced-motion settings.

## 10. Lesson content format

As v1 (JSON, `schemaVersion: 1`, stable ids on every screen and question, a fixed list of screen types each with one React component, teacher notes and answer keys inside and stripped by the API for non-teacher requests, images and audio by asset id, video by URL). Additions:

- Per screen: `gate: { minSeconds, interaction, readAloud }`, `readAloudText` (optional), `audio` (optional asset).
- Mastery threshold is not in the content any more: it comes from settings (section 11).
- Screen types still to add: `video`, `reading` (countdown timer, R3), `compare`, `map`.

## 11. Settings store keys (default, and per-student override)

| Key | Default |
|---|---|
| `quiz.mastery_threshold` | 0.8 |
| `quiz.attempts_per_run` | 2 |
| `quiz.attempts_per_day` | none |
| `gate.min_time_scale` | 1.0 (0 = off) |
| `gate.read_aloud` | optional |
| `tts.voice`, `tts.rate` | device default |
| `theme.default` | built-in |

The settings store itself arrives in R1. Until then these are constants in one file.

## 12. Migrations: one concern each

Split the old "migration 003" into three smaller ones, each backed up first and each with a written rollback.

1. **003: assignment identity.** Riskiest, because it changes keys on live tables the current portal uses. Add `id` to the schedule tables and backfill; add `assignment_id` to `completions` and `grades` and backfill by matching (student, date, lesson); then switch primary keys. **Before writing it:** query the live data for ambiguity (the same lesson scheduled twice on one day) and read the API and `syncClient.js` so the old portal keeps working throughout. The API keeps accepting the old shape and maps it to ids on the server, so the current portal is untouched. Own SPEC. Not needed for the playbook trial.
2. **004: catalog structure.** Courses, sections, lesson columns, `lesson_versions`, `catalog_history`, themes, assets, `course_assignments`. Additive only.
3. **005: work tables.** `assignment_progress`, `lesson_runs`, `quiz_attempts`, `responses`, `screen_views`, `session_notes`. Additive only.

004 and 005 add only new tables and columns, so rollback is simply not using them. 003 needs a tested rollback script.

## 13. Phasing

| In the first player (R2) | Later |
|---|---|
| Courses, sections, lessons, immutable lesson versions | Course releases (named freezes) |
| Assignment id, pin to version, re-teach link | In-app theme editor |
| Screens, check gating, quiz, runs and attempt limit, resume | Generated audio files |
| Minimum-time gate and the screen-view record | Teacher carry-over panel polish |
| Themes: tokens, light and dark, two or three built in | Per-screen customizing UI |
| Read-aloud with the browser voice | Section-wide quiz or exam |

## 14. Decisions so far (Joshua)

- Rescheduling only changes the date. Courses can be assigned whole or lesson by lesson. Re-teaching is a new assignment with fresh work and optional carry-over. Mastery threshold 80%, a setting in the settings store. Teacher-only data hidden by role only until per-person logins (a known limit that must be fixed before any other household uses this). Files hosted on the homelab server.
- Hierarchy: course, section, lesson, as in section 1.
- Wants version history kept in the database, with themes, an attempt limit, screen gates and read-aloud.

## 15. Open questions

1. **What does an assignment point at?** My reading: a day-sized **lesson** (about one 30-minute session) is what gets scheduled, so today's catalog "lessons" map to new lessons and sections are new. You described sections as "formerly lessons"; if sections were meant to be the scheduled unit, say so, because it changes the migration.
2. How do the existing Khan lessons and imported sheets map into courses and sections? Proposal: one course per subject-level set, one section per unit, the existing rows as lessons with empty content.
3. Does a section have its own content, such as an intro or a section exam? Not in v1; the model allows adding a lesson of type "section quiz".
4. Subject and course: a course belongs to one subject. Is that right?
5. Asset hosting on the homelab: file layout, backup coverage, and license notes per image.
