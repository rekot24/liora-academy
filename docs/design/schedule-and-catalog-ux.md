# Catalog, enrollment and schedule builder: design notes (draft v0)

Status: DRAFT v1, 2026-10-21 (brainstorm round 2 recorded). Input for ROADMAP R0 (feature checklist) and R1 (dashboards, catalog and schedule screens). Nothing is built. Companion to `docs/design/lesson-structure.md` (storage). Public repo: general only, nothing about the children.

Tags: **(Joshua)** came from you; **(suggested)** is an addition to react to.

## 1. The flow

```
Catalog (courses > sections > lessons)         browse only
      |  enroll a student in a course (pick which sections this term)
      v
Student's unscheduled pool (all enrolled lessons, no date yet)
      |  schedule: by hand, drag onto a day, or generate
      v
Scheduled (has a date)  ->  In progress  ->  Done  (+ Mastered, separate)
```

Only a **lesson** is scheduled. (Joshua) Lessons become available to a student only when she is enrolled in the course; before that she can browse the catalog but the lessons are locked.

**Lesson states for one student:**

| State | Meaning |
|---|---|
| Unscheduled | Enrolled, no date |
| Scheduled | Has a date, not started |
| In progress | Started, not finished (resume point saved) |
| Done | Finished. Never taken away. Mastered is a separate flag. |
| Skipped | Deliberately not done |
| **Missed** | Derived, not stored: scheduled before today and not done or skipped |

Missed being derived means nothing needs updating at midnight, and it can never get out of sync.

## 2. Words

- **Enroll** = a student takes a course (table `course_enrollments`). (Joshua)
- **Term** = what the portal calls a semester. The existing student-by-semester record is shown as "Term" in the interface so "enroll" has one meaning.
- **Pool** = the student's enrolled lessons that have no date yet.

## 3. Screens

### Catalog panel (Joshua; additions suggested)

- Explored by admin and students. Own panel, courses then sections then lessons.
- **Students see published courses only; admin also sees drafts and version history.** (suggested)
- **Lessons in the catalog show a description only, never the screens.** The catalog grows as courses are written. (Joshua)
- **Course map view:** sections and lessons as a path, each node locked, available, done or mastered. Students see what is coming; it is also motivating. (suggested)
- Themes show on the course card and map, so the catalog looks varied too.
- **Preview:** the admin can open any lesson in the player in a "preview" mode that records nothing. Needed for authoring. (suggested)

### Enroll dialog (suggested)

- Choose student(s) and course. **Choose which sections** for this term (for example sections 1 to 4 now), so a 300-lesson course does not flood the pool.
- Result: the lessons of those sections appear in that student's pool, unscheduled, each pinned to the current published version.
- If a lesson later gets a newer version, unstarted assignments show a small "newer version available" prompt with one-click update. Started work stays pinned.

### Schedule builder, per student (Joshua; additions suggested)

- **Student selector inside the drawer** (the schedule is per student), remembered between visits. (Joshua)
- **The calendar is the main thing on screen.** Views: month, week, day, and a new **List** view showing only days with an assignment, across months, so the whole schedule reads top to bottom. **Each day is visually grouped with a border**, with month dividers, today highlighted and missed days marked. (Joshua)
- **Drawer** holding the pool and the generate tool. (Joshua)
  - Pool grouped by course, then section, with progress rings and filters (unscheduled, scheduled, missed).
  - **Drag a lesson from the drawer onto a day.** Keyboard alternative: a "Schedule on..." button with a date picker, so it works without a mouse. (suggested)
  - Select several, then "schedule the next 5 of this course starting Monday". (suggested)
  - On a tablet the drawer becomes a bottom sheet. (suggested)
- **Weekly pattern:** only the "Recurring weekly pattern" panel (subjects by day of week) collapses, like an FAQ row: click the header to open or close. When collapsed it just says "Click to expand and see the entire pattern". (Joshua)
- **Needs attention:** a short list of missed lessons with one-click "move to next available day" and "skip". (suggested)
- **Pace bar per course:** lessons remaining versus school days left in the term, so you see whether you will finish. (suggested)
- **Attendance counter:** days counted so far out of the required days, including field trips marked as counting. The data (`target_days`, `counts_attendance`) already exists. The required number is an editable setting, not a hard-coded state figure (see section 10). (suggested, edited by Joshua)

### Family week view (suggested)

Both students side by side for one week. Useful for field trips and shared days.

**Deferred (Joshua):** assignments are for a day, not a time slot, so teacher overlap is not a concern now. Time slots would give the day more structure ("here is your day" instead of "do it whenever") and would bring the overlap check back. Put on the future-updates list; keep an optional start time on an assignment possible.

### Dashboards (R1)

- **Student:** today's lessons, resume where she stopped, her courses with progress, her scores.
- **Parent:** today for each student, needs attention, pace, attendance, recent scores.
- Secondary controls go in a slide-in drawer, the pattern used on the befish.cc pages.

## 4. Generate schedule: rules (suggested)

1. **Preview first.** It proposes dates; nothing is saved until you accept, and there is an undo.
2. It only places **unscheduled** lessons. Anything done, started or placed by hand is never moved (a "locked" flag on hand-placed ones).
3. Keeps the course order (sections and lessons in sequence).
4. Respects the weekly pattern, days off and holidays, field trips, and the term's start and end dates.
5. Can pace by **lessons per week** as well as by days.
6. Reports what did not fit ("12 lessons would run past the end of the term").

## 5. Phasing

- All of this is **R1** (catalog, schedule builder, dashboards) except what needs the lesson player (R2).
- **R0's feature checklist must capture today's admin and schedule features** (generate schedule, weekly pattern, month, week and day views, field trips, day editor, alerts) so nothing is lost in the rebuild.
- The scheduling backlog already in ROADMAP "Later" (holidays and days off, day editor, markers, health strip, coverage stats) fits naturally here and should be reviewed together.
- Before R1 gets a SPEC: a clickable mockup of the schedule builder, like the lesson mockup, to review layouts.

## 6. Open questions

1. Do students enroll themselves, or only the parent? (Assume parent only.)
2. Does a student see the whole catalog or only courses for their grade level (grade tags)?
3. Optional start time per assignment: yes from the start?
4. Is the "Term" wording good, or should it stay "semester"?
5. When both students share a course, are they enrolled together (one schedule) or separately (each has their own pool and dates)? Assume separately, with a "enroll both" shortcut.

## 7. Student home screen (re-imagined; proposal)

Today the student sees "Today's work": a card per lesson with a checkbox, plus three stat tiles (days attended, skills learned, day streak). Missed work is invisible, and the card is only a click-to-toggle.

- **Lesson card, not a checkbox.** Shows subject, title, time estimate and a state. The main button is **Start**, **Resume** (returns to the same screen), or **Review** when done, with a score ring and a mastered badge. Lessons that live on another site (a Khan Academy link) get **Open** and a manual **Mark done** until their content is built in.
- **Missed work is shown to the student**, in a gentle "Still to do" group under today's, with a small "days waiting" chip, neutral wording and no red alarm. Done is never taken away.
- **Focus option (suggested):** show only the next lesson large and the rest collapsed, so a long list does not overwhelm. A setting per student. Evidence on what works for specific learners is thin, so it is optional and adjustable.
- **Coming up:** the next two or three days, collapsed by default.
- **My courses:** a card per enrolled course with progress and a link to its course map.
- **Work ahead (Joshua):** a student can pull a later lesson into today if the lesson does not need the teacher. Needs a per-lesson flag for "teacher required", set from the lesson's mode and which screens the teacher leads. A parent setting allows or blocks it.
- **Scores:** a page with quiz history and best scores per lesson.
- **Streak (to decide):** count only scheduled days, never weekends or days off, so a day off does not break it. Alternatives: a weekly "lessons finished" ring instead of a streak, to avoid pressure.
- Small bug seen in the screenshot: the date line reads "Wednesday - Wednesday, October 21" (weekday twice). Add to ROADMAP issues.

## 8. Roles and logins (future implementation note)

**Now:** per-student data already works without real logins, because the app knows which student is selected (soft PIN). The enrolled-aware catalog does not strictly need logins. Logins are needed for **security** (hiding teacher notes and answer keys, real identity on requests and approvals) and for any other household.

**Planned roles (Joshua):**

| Role | Who | Can |
|---|---|---|
| **Student** | each child | Own schedule, lessons, scores; browse the catalog; request enrollment; work ahead where allowed |
| **Teacher/parent** | the parent running school | Everything today's admin does (schedule, enroll, approve requests, grades, attendance, shared-screen teacher view of lessons, **preview mode**). No course creation or backend tools |
| **Admin** | Joshua, for now | Everything above plus course creation, versions, themes, assets, system settings |

- **Admin is a platform-level role, not a household one.** It spans households, so it should be a separate flag, not a value of the household role. The existing `household_members.role` (owner, parent, student) maps: today's "admin" panel becomes the teacher/parent role; keep `owner` for the account holder (invites, later billing).
- The existing tables already support per-person login: `students.email` and `household_members(email, role, student_id)`, with Cloudflare Access mapping the verified email. Open: how a child signs in (own email, a parent-issued PIN session on a household device, passkeys). Needs a short decision record before building. A real auth provider is likely needed if this becomes a product, since Cloudflare Access email codes do not scale to customers.
- Not built now. Note for the R1 or later SPEC.

## 9. Enrollment requests (Joshua; shape suggested)

- A student can look at courses she is not enrolled in and **request** to enroll.
- The teacher/parent sees the request, **approves or denies**, and on approval chooses sections and schedules it (the enroll dialog opens pre-filled).
- Table `enrollment_requests` (student, course, status pending, approved or denied, decided by, decided at, note). Needs real student identity, so it comes with logins.

## 10. Requirements profile and settings (Joshua)

- **Remove state-specific wording from the app.** Use "required days" and similar neutral labels. The required number of school days is an **editable setting** (a move to another state is possible).
- Suggested: a **requirements profile** per household in settings: required days, hours per day, required subjects, grades that need testing or evaluation, notice-of-intent timing. Colorado is a preset today; another state's values go in when needed. This drives the attendance counter, the pace bar and a subject checklist. The existing `evaluations` table fits the testing item.
- Setting keys: `school.required_days`, `school.required_hours_per_day`, plus the list of required subjects.
- Also a setting for whether students may **work ahead**, and for **generate** to move hand-placed lessons (see section 4).

## 11. Product notes (not building now)

If this becomes something other parents use, these decisions move up. Record them now, build none of it yet.

- **Catalog ownership.** Today catalogs are per household. A product likely needs a shared library (courses written once, offered to many households) plus each household's own courses. Decide before the catalog tables are final.
- **Authentication** that scales (section 8).
- **Children's data and privacy law.** An online service used by children under 13 has legal obligations in the US (for example COPPA). Needs proper research or advice before any other household uses it. Not legal advice.
- **Content rights.** Public-domain images and Khan Academy links are fine for one family; selling a product needs a license check on every image, video and text.
- **Hosting.** The homelab suits one family; a product needs hosting with backups, uptime and support.
- **Scope discipline.** The January target is still two students on the current portal. Selling stays on ROADMAP "Not now" until the family version works.

## 12. Decisions from round 2 (Joshua, 2026-10-21)

- Only the weekly pattern panel collapses; collapsed text is "Click to expand and see the entire pattern".
- Student selector lives in the drawer. List view groups each day with a border.
- Catalog lessons show description only.
- Missed is derived; the student sees it too. The student home screen is redesigned (section 7).
- Generate preview, with a toggle to also move hand-placed lessons.
- Drag from the drawer. Course map. Work ahead. Enrollment requests with parent approval.
- Required school days is an editable setting; no state-specific wording in the app.
- Three roles planned (student, teacher/parent, admin). Future note only.
- Time slots and the overlap check are deferred to future updates.

## 13. Open questions

1. Student home: a full list of today's lessons, or the focus option (one lesson large) as the default?
2. **Two courses in one subject.** The weekly pattern is per subject. When a subject has two enrolled courses (for example two history courses), how do they share the days? Suggest: round-robin by default, with an optional per-course pattern override.
3. Streak or weekly ring? And what counts as a streak day?
4. How does a child log in when real logins arrive?
5. Is the catalog global (library) or per household? Decide before the catalog tables are final.
