# Session playbook (draft v0)

Status: DRAFT, 2026-10-20. For ROADMAP item C1. Meant to be used by hand before any code exists, then built into the lesson format and the player (Rebuild track R2). Public repo: general only, no personal details about the children. Evidence behind the choices is in `docs/research/learning-science.md`; claims marked [background] have not been checked against a source yet.

## 1. The core routine

One routine, the same order every time. Base length 30 minutes, flexible by plus or minus 15 depending on the lesson. A steady order helps with transitions and removes guessing about what comes next.

| Block | Minutes | What it is for | Teacher | Student |
|---|---|---|---|---|
| 1. Warm-up recall | 3 to 5 | Retrieve earlier material from memory (practice testing and spacing are the best-supported methods in the research) | Asks about three earlier items, no notes, no hints | Answers from memory |
| 2. Instruction | 10 to 12 | Teach one small set of ideas | Leads the screens, uses the teacher notes, pauses to ask | Listens, answers the check questions |
| 3. Guided practice | 5 to 8 | Use the idea once | Watches, then gives hints, not answers | Attempts first |
| 4. Quiz | 5 | Check what stuck | Quiet during, reviews misses after | Works alone, answer shown after each submit |
| 5. Exit recall | 2 | One more retrieval, from memory | Asks for three things remembered, no screens | Says or writes them |

After the session the teacher spends about a minute on the after-session notes (section 6).

## 2. The week

Suggested shape for a Wednesday to Friday week, to be adjusted by trial:

- **Wednesday:** new material.
- **Thursday:** continue the material, with more practice.
- **Friday:** short review of the week plus the quiz, which also gives spaced practice.

## 3. Modes

The five blocks stay. What changes is the weight of each block and what goes inside it. Each lesson says which mode it uses. Three modes to start, chosen for the first three subjects:

| Subject | Mode | Required in Colorado? |
|---|---|---|
| Constitution | Concept and discussion | Yes. Colorado's home-based education rules list the U.S. Constitution as regular instruction ([CDE homeschool FAQ](https://ed.cde.state.co.us/choice/homeschool-faq)) |
| Science | Concept and hands-on | Yes, science is a listed subject (same source) |
| Bible | Reading and discussion | No. A family choice |

### Mode A: Concept and discussion (Constitution, history, civics)

- **Block weights:** instruction is the longest block (up to 15 minutes), guided practice is short and takes the form of explaining in her own words or arguing a side.
- **Instruction screens:** one idea per screen, a person or a map or a document image where it helps, a check question every two or three screens, an optional side trail for anything mentioned in passing.
- **Teacher moves:** open with a fairness or "what would you do?" question before any facts; ask her to argue both sides; return to her first answer at the end.
- **Quiz:** multiple choice over the main ideas; misses reviewed against the screen they came from.
- **Reference lesson:** the clickable mockup (`docs/mockups/instruction-mockup.html`).

### Mode B: Concept and hands-on (science)

Two kinds of day, alternating through a unit.

- **Concept day:** like Mode A, with a prediction before each reveal ("what do you think will happen?") [background: predicting before seeing is a standard way to surface misconceptions].
- **Hands-on day:** the screens set up the activity and the safety notes, then most of the time is the activity itself. Order inside the activity: predict, do, observe, explain. Guided practice is the activity. The quiz is shorter, and the teacher notes ask her to explain what she saw.
- **Teacher moves:** hold your explanation until she has made a prediction and an observation; log surprises, since they feed future lessons.
- **Screens needed:** materials list, safety, step-by-step with photo, a record sheet (observations typed in).

### Mode C: Reading and discussion (Bible)

- **Block weights:** the reading is the main block. A fixed countdown is used (the roadmap's reading timer, R3), with a buzzer; until the portal has it, use a kitchen timer.
- **Order:** warm-up recall of the last passage, short context screen if needed, silent or read-aloud reading under the countdown, then **narration**: she tells the passage back in her own words, then discussion, then exit recall.
- **Memory work:** treat a verse or passage to memorize like any other retrieval item. Recall it in the warm-up and exit blocks, spaced over days.
- **Discussion questions are yours.** The playbook only fixes the structure; it does not decide the content or the questions.
- **Quiz:** optional. Narration and discussion may be the right check for this mode.

### Not yet written

**Practice-heavy** (math, languages, grammar). Not drafted until the research gap on worked examples and explaining versus practicing is read. Math currently runs on Khan Academy, so nothing blocks January.

## 4. How the AI is used

The research on AI tutors (see the research doc, section 2.3) points one way: AI that gives answers boosts practice scores and can hurt later learning; AI that makes the student try first and gives hints can avoid that.

Rules for this playbook:

1. **Only in guided practice** (block 3), or as a drafting tool for you before the session. Not during warm-up, quiz, or exit recall.
2. **Attempt first.** The student tries and says what she tried before the AI says anything.
3. **Hints before answers,** one at a time: a question, then a nudge, then a worked example of a similar problem, and only then the answer.
4. **She explains it back** in her own words after any help.
5. **Check later without the AI.** The next warm-up recall is the test of whether it stuck.
6. **The teacher is present.** The AI is a tool at the table, not a replacement for you.
7. **Safety:** a child-safety review is needed before any chat that runs on its own inside the portal. Until then the AI is used by the teacher at the table only.
8. **Log it:** note in the after-session notes when and how the AI was used.

For you before the session: the AI can draft the screens, quiz questions, and teacher notes from your outline. You review everything before it is used.

## 5. When things go wrong

- **Attention drops:** switch to a question, a tap-to-reveal screen, or a stand-and-move break of a minute; shorten the next block rather than pushing through. Write which screen it was in the notes.
- **A question leads somewhere new:** use the side trail. Write it on the explore-later list and keep moving.
- **The quiz goes badly:** review the missed questions against their screens, retake in the next session rather than right away (spacing). Done stays done; only mastery is "not yet".
- **Running long:** shorten guided practice or move the quiz to the next day. Never skip the exit recall.
- **Running short:** add a second guided-practice item rather than adding new material.
- **Frustration:** stop, name it, take a short break. The notes should say what triggered it.
- **A session that does not fit the mode:** change the mode for that lesson and note why; that is useful data.

## 6. Trial month

The first four weeks are a trial. The playbook is a draft, not proven. After each session, the teacher writes the after-session notes:

- Did attention hold? (1 to 5)
- Which block dragged?
- Minutes actually used
- Quiz result versus warm-up recall: any gap?
- Screens to fix
- What to change next time
- Questions asked and topics to revisit

At the end of the month, read all the notes together, change the playbook, and pick the next subject to add. Nothing here claims the method works better; the notes are how we find out.

## 7. Open questions

1. Block timing for each mode: does 30 minutes suit each subject, or do some need more?
2. Is the Friday quiz right for every mode?
3. Practice-heavy mode (math and languages): needs the research first.
4. Where do the after-session notes live before the portal supports them? Suggested: a plain file per week, outside the public repo.
5. When does the first real trial happen, and with which lesson? Suggested: the Constitution lesson from the mockup.
