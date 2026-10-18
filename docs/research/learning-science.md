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
