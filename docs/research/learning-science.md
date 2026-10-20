# Learning science notes (C1 research)

Living document. Started 2026-10-18 for ROADMAP item C1 (session playbook). Research first, no plan committed yet.
**Public repo rule:** keep this general. No personal or diagnostic details about the children.

Evidence labels: **[fetched]** read from the source page this session. **[background]** from general knowledge, not yet checked against a source. **[gap]** not researched yet.

---

## 1. What we are trying to decide

How the Wed to Fri sessions should run (lecture, then interactive AI questions, 15 to 35 minute blocks), and how the AI is used with two middle schoolers, one of whom or both may need extra structure. Colorado requirements are the floor.

## 2. Findings so far

### 2.1 Study techniques (Dunlosky et al., 2013)
- Practice testing (self-quizzing, recall without notes): **high utility**, works across ages. [fetched]
- Spaced practice (revisiting material over days and weeks): **high utility**. [fetched]
- Rereading, highlighting/underlining, summarizing: **low utility**. [fetched]
- Moderate: elaborative interrogation ("why is this true?"), self-explanation, interleaved practice. Other low: keyword mnemonics, imagery for text. [background]
- Caveat from reader comments: the research leans on memorizing facts, less on deep understanding.
- **Implication to test:** end every session with recall from memory; open each session with a short recall of earlier ones.

### 2.2 How much does tutoring really help?
- Bloom's "two sigma" (d about 2.0) was mostly an outlier, driven by a higher mastery bar (90% vs 80%). [fetched, secondary source]
- Realistic: human or good-software tutoring about d 0.4 to 0.8. Mastery learning about 0.5 on teacher-made tests, about 0.1 or less on standardized tests; effects tend to fade. [fetched, secondary source]
- **Implication:** 1-on-1 is a real advantage but not a guarantee; keep a mastery bar and check retention later.

### 2.3 AI tutoring
- Harvard RCT (Scientific Reports, 2025): 194 undergrad physics students, a custom AI tutor built on research-based pedagogy beat an active-learning class on median learning gains (more than double), in less time. College students, short study, immediate test. [fetched, secondary summary]
- PNAS field experiment (2025): about 1,000 high-school math students. Unguarded GPT raised practice grades about 48% but students scored about 17% worse once AI was removed. A tutor with teacher-designed hints and guardrails largely avoided that penalty. [fetched, secondary summary; PNAS page did not load]
- Tennessee middle-school preprint (2026, not peer reviewed): 6,000+ students. AI coaching inside a mastery rule (three correct in a row) gave the best delayed result; the gain was small. [fetched, secondary summary]
- **Implication to test:** the AI should require an attempt first, coach step by step after errors, and learning should be checked later without the AI.

### 2.4 Autistic and ADHD learners
- Australian evidence review (2026): 53 studies, mostly small single-subject designs, mostly boys, only 6 with ADHD, none with both. [fetched]
  - Strong (autism): explicit teaching, breaking tasks into steps, modeling, scaffolding, prompting.
  - Promising (autism): specific feedback, rules and routines (mainly transitions), visual supports (can overload if overused), structured technology, reduced noise.
  - ADHD: mostly limited or emerging evidence in that review.
- Review of 27 single-case classroom studies for ADHD (1971 to 2018): moderately effective overall; instructional and self-management interventions met formal evidence standards; behavioral approaches worked best when chosen by functional assessment. [fetched, abstract only]
- **Implication:** the evidence supports structure, clarity and quick feedback in general, but is too thin to design for a specific child. Observe, adjust, and keep sessions short.

### 2.5 Classical education (trivium)
- No outcome research found. Searches returned only curriculum vendors and parent forums. [fetched, negative result]
- Treat it as a values and content choice. Use the learning-science methods above to teach it.

## 2.6 Joshua's direction (2026-10-18)
- Build the full lessons inside the app, not just scheduling: structured lessons with built-in testing (retrieval practice), possible video embeds and other tools.
- Testing and review should be part of how lessons are *created*, not bolted on.
- Assigned lessons already live separately from the catalog template, so per-student test scores and notes can be stored with the assignment.
- Interested in AI-integrated lessons; unsure how far that should go (maybe AI just helps write the lessons).

## 2.7 Design questions this raises (not decisions)
- Lesson content as an ordered list of typed blocks (text, video, link, quiz, reflection, AI prompt) copied onto the assignment when scheduled, same as the text is today.
- Results kept as history (one row per attempt/question), not overwritten, so earlier misses can come back later (spaced review).
- Authoring: who writes the blocks (Joshua, an import file drafted with AI help, or an in-app editor)? Start without an editor UI?
- AI levels: (0) prompt text on the lesson page that Joshua runs in Claude; (1) AI drafts lessons, Joshua reviews; (2) chat inside the portal with guardrails (needs a server-side key, cost, logging, child-safety review). Research (2.3) says guardrails decide whether AI helps or hurts.
- Short-answer grading: self-check, Joshua, or AI?

## 2.8 New layer: the "instruction" (Joshua, 2026-10-18)
- The existing lesson (plan, scheduling unit) stays. Under each lesson sits an actual teaching layer: a series of single screens clicked through, like slides but interactive.
- One screen = one idea; limited scrolling (ideal is one screen per chunk, scroll only when needed). Small chunks, questions between chunks, a quiz over the whole thing at the end. Pictures, diagrams, videos where useful.
- Name not settled (working name "instruction"; alternatives: walkthrough, guided lesson).
- Decided: multiple-choice questions, scored automatically, answer revealed after submitting (Khan Academy style).
- Decided: all three authoring paths (AI-drafted, hand-written, in-app editor) feed one shared format.
- Open: target device and screen size; where images live; video source; a words-per-screen guideline; how progress resumes if a session is interrupted (decided later: resume at the same screen).

## 2.9 Draft session model v0 (2026-10-18, to be tested, not proven)
Built from 2.1 to 2.4 plus general direct-instruction practice [background]. Same order every time, which fits the routine/transition evidence in 2.4.

| Block | Minutes | What happens |
|---|---|---|
| 1. Warm-up recall | 3-5 | About three questions from earlier lessons, from memory, no notes |
| 2. Instruction | 10-12 | Teacher leads with the screens: one idea per screen, a question every two or three screens |
| 3. Guided practice | 5-8 | Learner attempts first; then the teacher (or AI) gives hints, not answers |
| 4. Quiz | 5 | Multiple choice, answer revealed after each submit, best attempt counts |
| 5. Exit recall | 2 | Learner says or writes three things from memory; teacher logs one line |

- Decided: base length 30 minutes, flexible by plus or minus 15 depending on the lesson.
- Decided: the parent is actively engaged and works alongside the learner, not a hands-off facilitator.
- Week shape (suggestion): Wed new material, Thu continue and practice, Fri weekly review plus quiz (spaced practice).
- AI role: guided-practice block only, attempt first, hints before answers, learning checked later without AI (2.3).
- Trial month: watch and adjust. Things to note per session: did attention hold, which block dragged, quiz vs warm-up recall gap, minutes actually used.

## 2.10 Teacher view (Joshua's idea, 2026-10-18)
- Two views of the same instruction. **Student view:** the clean single-screen walk-through. **Teacher view:** the same screens, in step, with notes only the teacher sees.
- Teacher notes per screen (candidates): what to say aloud, where to pause and ask, common misunderstandings, a harder follow-up question, timing hint, "stop and work this one together" flags, answers for the practice items.
- Teacher can see the learner's position and quiz results live, or at least after the fact.
- Open: two devices synced live, or one device the teacher drives with the learner watching; whether notes are written by the same AI-drafted/hand-written/editor paths as the screens (probably yes, as an optional field on each screen).
- Design note: teacher notes are part of the shared lesson format, so the format needs a per-screen `teacherNotes` field from the start.

## 2.11 Mockup review decisions (Joshua, 2026-10-18)
- Visuals: add portraits of people named, maps (the 13 states), and other relevant images; some may serve as slide backgrounds. Text-only screens lose attention fast. Not every screen needs one. Images are stored on the server or taken from public-domain sources (Library of Congress, Wikimedia Commons), never added to the public repo without checking the license.
- Questions gate progress: on a question screen, Next stays off until the learner has answered and checked the answer.
- Who moves forward is a per-screen setting with a global override: teacher-led screens (explanation) and student-led screens (questions, quiz, recall). Teacher can switch to "I drive all" or "Student drives all". Open: how teacher and student devices sync if they are separate.
- Side trails: a topic mentioned in passing (example: Shays' Rebellion) becomes an optional side-trail card with a short summary and an optional video slot, plus a "Save for later" button feeding an explore-later list. Prevents rabbit holes and keeps the idea for a future lesson.
- After-session teacher notes (attention, dragged block, minutes, quiz vs recall gap, screens to fix, changes, questions to revisit) live inside the teacher view and get compiled across lessons later.

## 3. Open gaps (next rounds)
- Cognitive load, worked examples, expertise reversal [gap]
- Direct/explicit instruction principles (Rosenshine) [gap]
- ADHD: session length, movement and breaks, self-management, motivation [gap]
- Autism: interest-led learning, sensory needs, transitions, flexible vs rigid routines [gap]
- Executive-function coaching and planning supports [gap]
- Lecture length and attention in early adolescence [gap]
- Which claims here are only from secondary summaries: check primary papers before relying on them [gap]

## 4. Questions for Joshua
- What are your own ideas for how a session should look?
- What have you already seen work or fail with each girl?
- Which of the gaps above matter most?

## 5. Sources
- APS, Dunlosky learning techniques: https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html
- Bloom's two sigma and replications (Nintil): https://nintil.com/bloom-sigma/
- AI tutor trials summary: https://www.higheredaiplaybook.com/p/6000-students-the-ai-tutor-helped
- Kestin et al. 2025, Scientific Reports: https://ui.adsabs.harvard.edu/abs/2025NatSR..1517458K/abstract
- Bastani et al., PNAS: https://www.pnas.org/doi/10.1073/pnas.2422633122
- Teaching practices for autistic and ADHD students (Australian evidence review): https://www.edresearch.edu.au/sites/default/files/2026-05/teaching-practices-support-autistic-adhd-students-summary-final-aa.pdf
- Classroom interventions for ADHD, single-case review: https://journals.sagepub.com/doi/10.3102/0034654319857038

## 6. Log
- 2026-10-18: first round. Sections 2.1 to 2.5 drafted.
- 2026-10-18: added 2.8 instruction layer, 2.9 session model v0, 2.10 teacher view.
- 2026-10-18: added 2.11 mockup review decisions.
