# TenXPros Partner Academy: Complete Production Export

<a id="how-this-export-was-produced"></a>
## How this export was produced

This is the entire Partner Academy exactly as stored in the production database, exported field by field. The lesson bodies are the exact stored HTML, converted to readable Markdown with no content removed. Every module, every metadata field, every exercise and exam question with its options, correct answer, and explanation, plus the global appendix (Pro vs TenXPro, partner rules, the journey, badges and ranks, glossary, and reusable snippets) are included. Nothing is summarized or omitted.

- Source: **production database** (`AcademyModule`, `AcademyLesson`, `AcademyQuestion`).
- Modules: **14**
- Exercise questions: **84**
- Exam questions: **168**
- Total questions: **252**

## Table of contents

- [How this export was produced](#how-this-export-was-produced)
- [Master index (all modules)](#master-index)
- **Modules**
  - [Module 1: The Mission](#m1)
    - [Metadata](#m1-meta) | [Learning objectives](#m1-obj) | [Lesson body](#m1-lesson) | [Plain prose](#m1-plain) | [Exercises](#m1-ex) | [Exam](#m1-exam)
  - [Module 2: Your Partner Identity](#m2)
    - [Metadata](#m2-meta) | [Learning objectives](#m2-obj) | [Lesson body](#m2-lesson) | [Plain prose](#m2-plain) | [Exercises](#m2-ex) | [Exam](#m2-exam)
  - [Module 3: The Rules](#m3)
    - [Metadata](#m3-meta) | [Learning objectives](#m3-obj) | [Lesson body](#m3-lesson) | [Plain prose](#m3-plain) | [Exercises](#m3-ex) | [Exam](#m3-exam)
  - [Module 4: What TenXPros Is](#m4)
    - [Metadata](#m4-meta) | [Learning objectives](#m4-obj) | [Lesson body](#m4-lesson) | [Plain prose](#m4-plain) | [Exercises](#m4-ex) | [Exam](#m4-exam)
  - [Module 5: The Twelve Week Journey](#m5)
    - [Metadata](#m5-meta) | [Learning objectives](#m5-obj) | [Lesson body](#m5-lesson) | [Plain prose](#m5-plain) | [Exercises](#m5-ex) | [Exam](#m5-exam)
  - [Module 6: Ranks, Badges, and Credentials](#m6)
    - [Metadata](#m6-meta) | [Learning objectives](#m6-obj) | [Lesson body](#m6-lesson) | [Plain prose](#m6-plain) | [Exercises](#m6-ex) | [Exam](#m6-exam)
  - [Module 7: From Top Student to Coach](#m7)
    - [Metadata](#m7-meta) | [Learning objectives](#m7-obj) | [Lesson body](#m7-lesson) | [Plain prose](#m7-plain) | [Exercises](#m7-ex) | [Exam](#m7-exam)
  - [Module 8: Selling With Integrity](#m8)
    - [Metadata](#m8-meta) | [Learning objectives](#m8-obj) | [Lesson body](#m8-lesson) | [Plain prose](#m8-plain) | [Exercises](#m8-ex) | [Exam](#m8-exam)
  - [Module 9: Finding and Qualifying the Right Prospects](#m9)
    - [Metadata](#m9-meta) | [Learning objectives](#m9-obj) | [Lesson body](#m9-lesson) | [Plain prose](#m9-plain) | [Exercises](#m9-ex) | [Exam](#m9-exam)
  - [Module 10: Outreach and the Conversation in Practice](#m10)
    - [Metadata](#m10-meta) | [Learning objectives](#m10-obj) | [Lesson body](#m10-lesson) | [Plain prose](#m10-plain) | [Exercises](#m10-ex) | [Exam](#m10-exam)
  - [Module 11: Operating the System and Your First 90 Days](#m11)
    - [Metadata](#m11-meta) | [Learning objectives](#m11-obj) | [Lesson body](#m11-lesson) | [Plain prose](#m11-plain) | [Exercises](#m11-ex) | [Exam](#m11-exam)
  - [Module 12: How the Twelve Weeks Work, in Full](#m12)
    - [Metadata](#m12-meta) | [Learning objectives](#m12-obj) | [Lesson body](#m12-lesson) | [Plain prose](#m12-plain) | [Exercises](#m12-ex) | [Exam](#m12-exam)
  - [Module 13: Selling to Organizations and to Individuals](#m13)
    - [Metadata](#m13-meta) | [Learning objectives](#m13-obj) | [Lesson body](#m13-lesson) | [Plain prose](#m13-plain) | [Exercises](#m13-ex) | [Exam](#m13-exam)
  - [Module 14: Customizing for Any Industry, Organization, or Person](#m14)
    - [Metadata](#m14-meta) | [Learning objectives](#m14-obj) | [Lesson body](#m14-lesson) | [Plain prose](#m14-plain) | [Exercises](#m14-ex) | [Exam](#m14-exam)
- **[Appendix: global reference](#appendix)**
  - [Pro vs TenXPro](#pro-vs-tenxpro)
  - [Partner rules referenced by the Academy](#partner-rules)
  - [Journey explanation](#journey)
  - [Badges, ranks, and certificates](#badges-ranks)
  - [Glossary and canonical terminology](#glossary)
  - [Reusable snippets](#snippets)

<a id="master-index"></a>
## Master index

| # | Title | Slug | Pass mark | Exam size | Exercises | Exam | Version | Published |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | The Mission | `mission` | 80% | 10 | 6 | 12 | v1 | Yes |
| 2 | Your Partner Identity | `identity` | 80% | 10 | 6 | 12 | v1 | Yes |
| 3 | The Rules | `rules` | 80% | 10 | 6 | 12 | v1 | Yes |
| 4 | What TenXPros Is | `product` | 80% | 10 | 6 | 12 | v1 | Yes |
| 5 | The Twelve Week Journey | `journey` | 80% | 10 | 6 | 12 | v1 | Yes |
| 6 | Ranks, Badges, and Credentials | `ranks` | 80% | 10 | 6 | 12 | v1 | Yes |
| 7 | From Top Student to Coach | `coach` | 80% | 10 | 6 | 12 | v1 | Yes |
| 8 | Selling With Integrity | `selling` | 80% | 10 | 6 | 12 | v1 | Yes |
| 9 | Finding and Qualifying the Right Prospects | `prospecting` | 80% | 10 | 6 | 12 | v1 | Yes |
| 10 | Outreach and the Conversation in Practice | `conversation` | 80% | 10 | 6 | 12 | v1 | Yes |
| 11 | Operating the System and Your First 90 Days | `operations` | 80% | 10 | 6 | 12 | v1 | Yes |
| 12 | How the Twelve Weeks Work, in Full | `mechanics` | 80% | 10 | 6 | 12 | v1 | Yes |
| 13 | Selling to Organizations and to Individuals | `motions` | 80% | 10 | 6 | 12 | v1 | Yes |
| 14 | Customizing for Any Industry, Organization, or Person | `customize` | 80% | 10 | 6 | 12 | v1 | Yes |


# Modules

<a id="m1"></a>
## Module 1: The Mission

<a id="m1-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 1 |
| Slug | `mission` |
| Title | The Mission |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocked by default (first module). |

**Summary.** Why TenXPros exists, the standard behind the credential, and the honest promise a partner makes.

<a id="m1-obj"></a>
### Learning objectives

- Explain, in plain language, why TenXPros exists and why your introduction to it carries real weight.
- Draw a clean line between using AI and leading its adoption, using a prospect's own field as the example.
- Describe how the credential is earned, what makes it different from a tools course, and the tone (proof, not hype) you must hold in every sentence.

<a id="m1-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

Your job in this module is not to learn a pitch. It is to understand one standard well enough to explain it to a serious professional without exaggerating a single thing. Everything that follows rests on a single shift in the market: access to AI is now universal, so access no longer separates strong professionals from weak ones. Judgment does.

##### What you will be able to do

- Explain, in plain language, why TenXPros exists and why your introduction to it carries real weight.
- Draw a clean line between using AI and leading its adoption, using a prospect's own field as the example.
- Describe how the credential is earned, what makes it different from a tools course, and the tone (proof, not hype) you must hold in every sentence.

##### What you need to understand

###### The market shift your whole job rests on

AI tools are now in everyone's hands. A doctor, a lawyer, an engineer, a teacher, an accountant, a marketer: anyone can open a chat window and get an answer in seconds. Most professionals are already doing exactly this. That is the point. When everyone has access, access stops being the dividing line. What remains is judgment: knowing where the answer can be trusted and where it cannot.

###### Using AI versus leading its adoption

These are two different skills, and the difference is the heart of the program.

- **Using AI** means typing a question, copying the output into a document, and hoping it holds up. It looks productive. It builds nothing you can defend.
- **Leading AI adoption** means knowing where AI genuinely helps inside your specific field, knowing where it fails, knowing where it adds risk, and knowing where a human has to stay in control no matter how good the model looks. It means producing systems and evidence that survive a hard question from a board, a regulator, or a skeptical client. It means becoming the person others in your field turn to when they are unsure.

###### Pro and TenXPro: the multiplier

TenX means a multiplier. The program multiplies an AI method onto something the person already has. Ten times zero is still zero, so the input has to be real. A beginner with no field is a zero: there is nothing to multiply. That is the structural reason it does not work for a beginner, and it is exactly what the promise says. You bring the expertise. We bring the method.

A **Pro** is an expert in a field who already uses AI in a loose, occasional way. A **TenXPro** is that same expert, now leading AI adoption with method, evidence, and governance, holding a body of work they can defend. The credential certifies exactly that jump. It does not certify learning AI.

###### What makes the program different

Most AI courses teach tools: a chat interface, some prompt tricks, a way to automate a small task. Some are fine for beginners. None are built for an experienced professional who wants to lead. TenXPros runs on a different premise. The participant already has years of domain knowledge, and the program gives them a structured way to apply it, so the output is not a certificate of attendance but a body of evidence.

###### How the credential is earned

It is earned by doing the work, not by watching videos or passing a quick quiz. The participant assembles a Living AI Solution Dossier, submits it, and it is reviewed against a public standard. If the work meets the standard, the credential is awarded. If it does not, specific revisions come back. That rigor is the whole point: it is why the credential means something, and why the people you bring in respect the bar rather than resent it.

##### How to sell it honestly

You are not pushing a course. You are opening a door to a professional standard for someone who is already ready to walk through it. Your job is detection, not persuasion. If you have to convince someone they are a Pro, they almost always are not. So instead of talking, you look: does this person have a real problem in their own field they could spend twelve weeks proving an AI approach against, and does the result have to pass the judgment of someone who matters to them. If yes to both, you have found a fit, and the honest move is simply to name the standard and the bar, then let them decide.

> **Say this:** You already use AI every day, so the question is not access. The question is whether you can lead it: build something in your own field that survives a hard question from a board or a regulator. That is the gap this credential is built to close.

> **Do not say this:** Finish the twelve weeks and you are automatically certified, and it will get you promoted.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| I already use AI every day, why would I need this. | Using AI and leading its adoption are different skills, and the program builds the second. Daily use is the starting point, not the finish line. |
| Is this just another prompt course. | No. A tools course teaches the interface. This turns your own expertise into reviewed evidence, judged against a public standard. |
| Can you guarantee I pass. | No, and I would not trust anyone who did. The credential is earned through a reviewed dossier. If the work meets the bar it is awarded, and if it does not you get specific revisions back. |
| Is this an accredited degree. | No. It is a reviewed, defensible professional credential built on real work, not a university degree or an accredited academic qualification. |
| Will this get me a better job. | I cannot promise an outcome I do not control. What I can say is that it gives you a body of evidence you can defend, which is something a certificate of attendance never does. |

##### Talking points

- Access to AI is universal now. Judgment is the dividing line.
- You bring the expertise. We bring the AI method.
- The credential is earned by reviewed work, not attendance.
- Productive effort, real success: proof over hype, every time.
- I am opening a door for someone who is ready, not talking anyone into anything.

> **Mistakes to avoid:** Do not pitch the program as easy or fast. Do not promise certification, a job, a raise, or any outcome you cannot control. Do not hide the review standard to make it sound simpler, and do not imply it is an accredited degree. Each of those quietly breaks the trust that gives your introduction its weight.

##### Summary checklist

- I can explain why access to AI no longer separates the strong from the weak.
- I can describe using AI versus leading its adoption with an example from the prospect's field.
- I can state the motto and what makes the program different from a tools course.
- I can explain how the credential is earned and what happens when a dossier falls short.
- I can keep my tone to proof, not hype, and back up everything I say.

##### A real scenario

You know a senior compliance lead at a mid-size insurer. Her board keeps asking what our AI plan is, and she has been answering with instinct and a few chat experiments she could not defend if pressed. She has a real problem in her field, and the answer has to pass people who matter to her. You do not sell her anything. You say: you are clearly a Pro already, and this is the structured way to turn what you know into a dossier you could put in front of your board. Then you stop talking and let her decide.

##### How this maps to your exam

Your exam tests whether you can hold the line between using AI and leading adoption, state the motto correctly, explain how the credential is earned and what happens to a dossier below the bar, and recognize the honest partner posture (detect a ready professional and open the door, never promise certification or career results).

<a id="m1-plain"></a>
### Lesson body (plain prose / audio text)

You are not here to memorize a sales pitch. You are here to understand a standard, and to be able to explain it to a serious professional without exaggerating a single thing.

Start with what is actually happening in the market, because your whole job rests on it. AI tools are now in everyone's hands. A doctor, a lawyer, an engineer, a teacher, an accountant, a marketer, anyone can open a chat window and get an answer in seconds. Most professionals are already doing this. So access is no longer what separates the strong from the weak. Judgment is.

There is a real difference between using AI and leading its adoption. Using AI means typing a question, copying the output into a document, and hoping it holds up. It looks productive. It builds nothing you can defend. Leading AI adoption is a different skill entirely. It means knowing where AI genuinely helps inside your specific field, knowing where it fails, knowing where it adds risk, and knowing where a human has to stay in control no matter how good the model looks. It means producing systems and evidence that survive a hard question from a board, a regulator, or a skeptical client. It means becoming the person other people in your field turn to when they are unsure.

That gap, between the many who can use AI and the few who can lead it, is the entire reason TenXPros exists. And it is the reason your introduction carries weight. You are not pushing a course. You are opening a door to a professional standard for people who are ready to walk through it.

Think about who you already know. The experienced clinician who senses AI could help her patients but has no responsible way to build it. The senior engineer who uses AI tools at random and has never documented one workflow he could defend. The consultant whose clients keep asking about AI while he has no credential that says he can advise them. These are not made up people. They are in your network right now, and many of them are already asking for guidance. When you bring the right one of them into TenXPros, you give them something they cannot get from a generic course: a reviewed, defensible credential built on their own real work.

Here is what makes the program different, and you should be able to say it cleanly. Most AI courses teach tools. They show you a chat interface, some prompt tricks, a way to automate a small task. Some are fine for beginners. None are built for an experienced professional who wants to lead. TenXPros runs on a different premise, and the motto says it in one line. You bring the expertise. We bring the AI method. The participant already has years of domain knowledge. The program gives them a structured way to apply it, so the output is not a certificate of attendance but a body of evidence.

The credential is earned by doing the work, not by watching videos or passing a quick quiz. The participant assembles a Living AI Solution Dossier, submits it, and it is reviewed against a public standard. If the work meets the standard, the credential is awarded. If it does not, specific revisions come back. That rigor is the whole point. It is why the credential means something, and it is why the people you bring in will respect the bar rather than resent it.

So hold this in your head before you ever speak to a prospect. A good partner does not talk anyone into this. A good partner recognizes the professional who is already ready, and opens the door honestly. Do that well and you are not running a side hustle. You are helping build a network of people who lead AI adoption responsibly across their industries, and you are earning at every step as they do.

One more thing about tone, because it will define how you are seen. This program does not trade in hype. It trades in proof. The phrase to keep close is simple: productive effort, real success. Everything you say should be true, specific, and defensible. If you cannot back it up, do not say it.


<a id="m1-ex"></a>
### Exercises (6)

**Exercise 1.** What is the real line that now separates strong professionals from weak ones, according to the lesson?

- A. Access to AI tools
- B. Years of experience alone
- C. Judgment about where AI belongs and where it does not  **(correct)**
- D. The number of AI tools a person has tried

**Answer:** C. Judgment about where AI belongs and where it does not

**Explanation:** Access is now universal, so it no longer separates anyone. The lesson is explicit that judgment is the dividing line, not tool access or raw years.

**Exercise 2.** Which description matches leading AI adoption rather than just using AI?

- A. Typing a question and copying the answer into a report
- B. Knowing where AI fails, where it adds risk, and where a human must stay in control  **(correct)**
- C. Hoping the output is good enough
- D. Using as many AI tools as possible

**Answer:** B. Knowing where AI fails, where it adds risk, and where a human must stay in control

**Explanation:** Using AI is the passive copy and hope behavior. Leading it is the disciplined knowledge of limits, risk, and human control described in the lesson.

**Exercise 3.** The program motto is best stated as which of the following?

- A. We bring the expertise, you bring the tools
- B. You bring the expertise, we bring the AI method  **(correct)**
- C. Learn AI in twelve weeks, guaranteed
- D. Prompts first, proof later

**Answer:** B. You bring the expertise, we bring the AI method

**Explanation:** The motto is that the participant supplies domain expertise and the program supplies the method. The others invert it or add hype the program never uses.

**Exercise 4.** How is the TenXPros credential earned?

- A. By attending all the sessions
- B. By passing a multiple choice test
- C. By assembling a dossier that is reviewed against a public standard  **(correct)**
- D. By watching the full set of videos

**Answer:** C. By assembling a dossier that is reviewed against a public standard

**Explanation:** The lesson stresses the credential is earned through reviewed work, the Living AI Solution Dossier, not by attendance or a quiz.

**Exercise 5.** What is the right posture for a partner toward a prospect?

- A. Talk anyone into joining to maximize volume
- B. Recognize a professional who is already ready and open the door honestly  **(correct)**
- C. Promise fast career results to close quickly
- D. Avoid mentioning the review standard so it sounds easier

**Answer:** B. Recognize a professional who is already ready and open the door honestly

**Explanation:** A good partner qualifies for genuine readiness and is honest. Pushing volume, promising results, or hiding the bar all contradict the lesson.

**Exercise 6.** Which phrase captures the program's tone?

- A. Move fast and hype it up
- B. Productive effort, real success  **(correct)**
- C. Results guaranteed in twelve weeks
- D. Attendance is achievement

**Answer:** B. Productive effort, real success

**Explanation:** The program trades in proof, not hype. Productive effort, real success is the stated tone. The others are exactly the hype the program avoids.

<a id="m1-exam"></a>
### Final exam pool (12)

**Exam 1.** Why does a partner's introduction to TenXPros carry weight?

- A. Because the program is cheap and easy to join
- B. Because it opens a door to a defensible professional standard for someone who is ready  **(correct)**
- C. Because partners are allowed to promise certification
- D. Because attendance alone earns the credential

**Answer:** B. Because it opens a door to a defensible professional standard for someone who is ready

**Explanation:** The weight comes from offering a real standard to a ready professional, not from low price, promises, or attendance.

**Exam 2.** A prospect says, I already use AI every day, so why would I need this. What is the honest framing?

- A. Using AI and leading its adoption are different skills, and the program builds the second  **(correct)**
- B. Daily use means you will definitely pass, so just enroll
- C. The program will replace your judgment with AI
- D. Everyone needs it regardless of their situation

**Answer:** A. Using AI and leading its adoption are different skills, and the program builds the second

**Explanation:** The lesson draws a clear line between using AI and leading adoption. The other options promise outcomes, misstate the program, or push without qualification.

**Exam 3.** Which of these is an example of using AI rather than leading its adoption?

- A. Documenting where a human must stay in control of a workflow
- B. Mapping where AI adds risk in a specific field
- C. Pasting a generated paragraph into a report and hoping it holds up  **(correct)**
- D. Building evidence that survives a board level question

**Answer:** C. Pasting a generated paragraph into a report and hoping it holds up

**Explanation:** Copy and hope is the passive use behavior. The other three are all acts of leading adoption.

**Exam 4.** What does the program give a participant that a generic AI tools course does not?

- A. A longer list of prompt tricks
- B. A structured method that turns their own expertise into reviewed evidence  **(correct)**
- C. A guarantee of promotion
- D. A faster way to copy outputs

**Answer:** B. A structured method that turns their own expertise into reviewed evidence

**Explanation:** The differentiator is method plus reviewed evidence built on the participant's expertise, not more prompts, guarantees, or speed.

**Exam 5.** What happens if a submitted dossier does not meet the review standard?

- A. The credential is awarded anyway for finishing
- B. Specific revisions are returned before certification  **(correct)**
- C. The participant is removed from the program permanently
- D. The standard is lowered to pass them

**Answer:** B. Specific revisions are returned before certification

**Explanation:** The lesson states that work below the bar gets specific revisions back. The standard is not waived, the participant is not expelled, and finishing alone does not certify.

**Exam 6.** Which statement about the credential is accurate?

- A. It is a university degree
- B. It is an accredited academic qualification
- C. It is a reviewed, defensible professional credential built on real work  **(correct)**
- D. It is awarded for attendance

**Answer:** C. It is a reviewed, defensible professional credential built on real work

**Explanation:** It is a private professional credential earned through reviewed work, not a degree, not accreditation, and not an attendance award.

**Exam 7.** Who is TenXPros built for?

- A. Absolute beginners with no domain expertise
- B. Experienced professionals who want to lead AI adoption in their field  **(correct)**
- C. Anyone who wants a quick certificate
- D. People who only want to learn prompt tricks

**Answer:** B. Experienced professionals who want to lead AI adoption in their field

**Explanation:** The program targets experienced professionals with real expertise. Beginners and certificate seekers are not the fit the lesson describes.

**Exam 8.** What is the partner's job when talking to a professional who is not actually ready?

- A. Enroll them anyway to hit a target
- B. Be honest and not push them in  **(correct)**
- C. Promise results so they feel safe
- D. Hide the review standard

**Answer:** B. Be honest and not push them in

**Explanation:** Honesty and genuine qualification are the standard. Pushing, promising, or hiding the bar all violate the partner posture.

**Exam 9.** Which sentence would be appropriate for a partner to say?

- A. Finish the twelve weeks and you are automatically certified
- B. This will get you promoted within a year
- C. The credential is earned through reviewed work, and the bar is real  **(correct)**
- D. Just pay me directly and I will speed up your enrollment

**Answer:** C. The credential is earned through reviewed work, and the bar is real

**Explanation:** Only C is true and defensible. The others promise certification, promise career outcomes, or route payment improperly.

**Exam 10.** The phrase productive effort, real success signals what about the program?

- A. That results are guaranteed
- B. That it values proof over hype  **(correct)**
- C. That attendance is enough
- D. That speed matters more than substance

**Answer:** B. That it values proof over hype

**Explanation:** The phrase captures a proof first culture. It does not guarantee results, reward attendance, or prize speed.

**Exam 11.** Why is the rigor of the review a feature rather than a problem for partners?

- A. Because it lets partners promise easy passes
- B. Because it makes the credential meaningful and respected by serious people  **(correct)**
- C. Because it hides what the program actually does
- D. Because it removes the need to qualify prospects

**Answer:** B. Because it makes the credential meaningful and respected by serious people

**Explanation:** The bar is what gives the credential its value, which serious professionals respect. It does not enable easy passes or remove qualification.

**Exam 12.** A partner is most accurately described as which of the following?

- A. An aggressive reseller chasing volume
- B. Someone who recognizes ready professionals and opens a door honestly  **(correct)**
- C. A recruiter who promises jobs
- D. A discount broker

**Answer:** B. Someone who recognizes ready professionals and opens a door honestly

**Explanation:** The partner identity is an honest opener of a standard for ready people, not a volume reseller, job promiser, or discounter. --- ## 13.


---

<a id="m2"></a>
## Module 2: Your Partner Identity

<a id="m2-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 2 |
| Slug | `identity` |
| Title | Your Partner Identity |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 1 is passed (sequential gating). |

**Summary.** Who you are as a partner: an independent representative of a real standard, what you may and may not say, and the integrity that protects your name.

<a id="m2-obj"></a>
### Learning objectives

- Name the five partner functions and describe your own role honestly when you register a deal.
- State the four things a partner protects and why they hold together.
- Run any sentence through the quick test before you say it, and recognize prohibited claims on sight.

<a id="m2-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

A partner is a trust builder, not a shortcut seller. Keep that one sentence at the center of everything here, because the rest is detail that flows from it. This module is about who you are when you speak for a real standard: the role you played, the four things you protect, the lines you must never cross, and the quick test that keeps you safe in the field.

##### What you will be able to do

- Name the five partner functions and describe your own role honestly when you register a deal.
- State the four things a partner protects and why they hold together.
- Run any sentence through the quick test before you say it, and recognize prohibited claims on sight.

##### What you need to understand

###### The five functions, and getting paid for what you did

You can play several roles in a single deal, or just one. The program recognizes five functions and pays you for the function you actually performed, not for being nearby when something happened. Learn the names now, because you will describe your role honestly when you register a deal. (The exact pay for each lives in the Rules module.)

- **Basic introduction:** you introduce a relevant contact.
- **Qualified origination:** you source an opportunity that can realistically close.
- **Strong origination:** you create a higher quality opportunity, often at scale or with confirmed strategic value.
- **Closing:** you carry the opportunity through to a signed, binding agreement.
- **Delivery or coaching:** you help deliver, coach, or support the offering when you are approved to do so.

###### The four things a partner protects

The mindset under all five functions protects you as much as it protects the company. A partner protects the brand, protects the prospect, protects the standard, and protects their own right to earn by following the process. Those four hold together: drop one and the others weaken. Protect the prospect, for instance, and you protect the brand at the same time, because an honest introduction is what makes the brand trustworthy in the first place.

###### Detection, not persuasion

Your job is detection, not persuasion. A Pro is a real expert in a field who already uses AI loosely. A TenXPro is that same expert leading AI adoption with method, evidence, and governance. You are looking for the first so the program can build the second. If you have to convince someone they are a Pro, they almost always are not. That is why qualifying on genuine readiness is honest work and pushing volume is not.

###### The lines you must never cross

Read these slowly. Crossing any of them can end a partnership and, in some cases, expose you personally.

- Never promise certification. The credential is earned through a reviewed dossier, and no one can guarantee the outcome of a review.
- Never promise income, employment, promotion, leads, or business results. You are introducing a learning program, not selling a job or a raise.
- Never imply TenXPros is a university degree or an accredited academic program. It is a private professional certification, and saying otherwise is a false claim.
- Never ask for or accept payment outside official channels, and never use messaging that has not been approved.
- Never contact a prospect using the TenXPros name before you have completed the Activation Gate.
- Never use spam, scraped lists, or bought lists.
- Never submit, or encourage anyone to submit, confidential client, employer, patient, or regulated data without the rights and safeguards to handle it.
- Never claim exclusive authority over an industry, a country, or a territory unless it is confirmed in writing on the Partner Panel.

These are not arbitrary. Promise a job and you set up a participant for a betrayal that lands on your name. Imply accreditation and you mislead someone making a serious decision. Mishandle regulated data and you create legal exposure for the participant, the company, and yourself. The rule protects the people in the room.

###### The quick test

Before you say a sentence to a prospect, run it through four questions. Is it true. Can I back it up. Does it promise an outcome I cannot control. Does it route money or data the wrong way. If a sentence fails any of those, do not say it. If you are not sure, treat that doubt as a no until you confirm on the Partner Panel.

##### How to sell it honestly

Honest selling here is mostly listening and naming. You qualify on genuine readiness, you describe the standard plainly, and you register the role you actually played. Saying "this is a strong fit because you already have deep expertise and one real problem worth solving" is approved: it qualifies on readiness, which is exactly your job. Saying "join and you will be certified automatically after twelve weeks" is prohibited: certification is earned through review, not attendance, and you cannot promise it. The gap between those two sentences is this whole module in miniature.

> **Say this:** This is a strong fit because you already have deep expertise and one real problem worth solving. The credential is earned through a reviewed dossier, so the work is real, and that is exactly why it carries weight.

> **Do not say this:** Pay me directly to speed up enrollment, and once you finish the twelve weeks your income will rise.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| Can you just guarantee I will be certified. | No. The credential is earned through a reviewed dossier, and no one can guarantee the outcome of a review. |
| Can I pay you directly to move faster. | No. Payment must go through official channels. I cannot accept payment outside them, even for a first installment. |
| Is this basically an accredited university qualification. | No. It is a private professional certification. Saying otherwise would be a false claim, and I will not make it. |
| Do you own this whole industry or region. | Only if it is confirmed in writing on the Partner Panel. I will not claim exclusivity that is not recorded there. |
| I bought a contact list, can we use it. | No. Bought, scraped, and spam lists are prohibited, with no relevance or timing exception. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The deal registration form on the Partner Panel, where you record your real role for an opportunity. It captures the function you performed (introduction, qualified origination, strong origination, closing, or delivery and coaching) and the account details, so you are paid for what you actually did rather than for being nearby.

##### Talking points

- I am a trust builder, not a shortcut seller.
- I get paid for the function I actually performed, not for being in the room.
- I protect the brand, the prospect, the standard, and my own right to earn.
- Certification is earned through a reviewed dossier. I cannot promise it.
- If a sentence is not true, not backable, or routes money or data wrongly, I do not say it.

> **Mistakes to avoid:** Promising a job, a raise, leads, or a guaranteed pass. Implying the credential is an accredited degree. Accepting payment off official channels or using messaging that is not approved. Using the TenXPros name before the Activation Gate. Using bought or scraped lists. Claiming exclusivity that is not confirmed in writing on the Panel. Any one of these can end a partnership.

##### Summary checklist

- I can name the five functions and register the role I actually performed.
- I can state the four things a partner protects and why they reinforce each other.
- I can list the prohibited claims and explain who each rule protects.
- I can run any sentence through the quick test before I speak.
- I can tell an approved readiness statement from a prohibited promise.

##### A real scenario

A prospect you respect says, "Just take my payment now so we skip the queue, and tell me I am certified the day I finish." You like him, and the deal is right in front of you. You still say no to both: payment must go through official channels, and certification is earned through review, not attendance. Then you give him the sentence you can stand behind: he is a strong fit because of his expertise and one real problem worth solving, and you will register your role honestly on the Panel. You protected the standard, and you protected him.

##### How this maps to your exam

Your exam checks that you can match each function to its meaning, recall the four things a partner protects, identify prohibited claims (certification, income, accreditation, off-channel payment, bought lists, unconfirmed exclusivity), and apply the quick test to tell an approved sentence from a prohibited one.

<a id="m2-plain"></a>
### Lesson body (plain prose / audio text)

A partner is a trust builder, not a shortcut seller. Keep that sentence at the center of everything in this module, because the rest is just detail that flows from it.

You can play several roles in a single deal, or just one. The program recognizes five functions, and it pays you for the function you actually performed, not for being nearby when something happened. The five are these. A basic introduction, where you introduce a relevant contact. A qualified origination, where you source an opportunity that can realistically close. A strong origination, where you create a higher quality opportunity, often at scale or with confirmed strategic value. A closing, where you carry the opportunity through to a signed, binding agreement. And delivery or coaching, where you help deliver, coach, or support the offering when you are approved to do so. You will see exactly how each one pays in the Rules module. For now, learn the names and what each means, because you will describe your own role honestly when you register a deal.

The mindset underneath all five is simple and it protects you as much as it protects the company. A partner protects the brand. A partner protects the prospect. A partner protects the standard. And a partner protects their own right to earn by following the process. Those four hold together. Drop one and the others get weaker. Protect the prospect, for instance, and you protect the brand at the same time, because an honest introduction is what makes the brand trustworthy in the first place.

Now the part that matters most for keeping you safe and keeping the program clean: the things a partner must never do. Read these slowly, because crossing any of them can end a partnership and, in some cases, expose you personally.

Never promise certification. The credential is earned through a reviewed dossier, and no one can guarantee the outcome of a review. Never promise income, employment, promotion, leads, or business results. You are introducing a learning program, not selling a job or a raise. Never imply TenXPros is a university degree or an accredited academic program, because it is a private professional certification and saying otherwise is a false claim. Never ask for or accept payment outside official channels, and never use messaging that has not been approved. Never contact a prospect using the TenXPros name before you have completed the Activation Gate. Never use spam, scraped lists, or bought lists. Never submit, or encourage anyone to submit, confidential client, employer, patient, or regulated data without the rights and safeguards to handle it. And never claim exclusive authority over an industry, a country, or a territory unless it is confirmed in writing on the Partner Panel.

Those are not arbitrary restrictions. Each one exists because breaking it damages a real person or a real obligation. Promise a job and you set up a participant for a betrayal that lands on your name. Imply accreditation and you mislead someone making a serious decision. Mishandle regulated data and you create legal exposure for the participant, the company, and yourself. The rule protects the people in the room.

Here is how to think on your feet in the field. Before you say a sentence to a prospect, run it through a quick test. Is it true. Can I back it up. Does it promise an outcome I cannot control. Does it route money or data the wrong way. If a sentence fails any of those, do not say it. If you are not sure, treat that doubt as a no until you confirm on the Partner Panel.

A short example of the judgment you will use constantly. Saying, this is a strong fit because you already have deep expertise and one real problem worth solving, is approved. It qualifies on genuine readiness, which is exactly your job. Saying, join and you will be certified automatically after twelve weeks, is prohibited, because certification is earned through review, not attendance, and you cannot promise it. The difference between those two sentences is the whole module in miniature. One protects the standard and the prospect. The other quietly breaks both.

So your identity, in one breath: you are the person who recognizes the right professional, tells them the truth, registers your real role honestly, and protects the standard even when bending it would be easier. That is what earns you the long term trust that makes this worth doing.


<a id="m2-ex"></a>
### Exercises (6)

**Exercise 1.** How many functions can a partner perform in a single deal?

- A. Only one, ever
- B. One or several  **(correct)**
- C. Exactly two
- D. All five are required every time

**Answer:** B. One or several

**Explanation:** The lesson says a partner can play several roles in one deal or just one. It is not capped at one or two, and performing all five is never required.

**Exercise 2.** Which of these is the function called strong origination?

- A. Introducing a relevant contact
- B. Creating a higher quality opportunity, often at scale or with confirmed strategic value  **(correct)**
- C. Carrying a deal to a signed agreement
- D. Coaching a participant after approval

**Answer:** B. Creating a higher quality opportunity, often at scale or with confirmed strategic value

**Explanation:** Strong origination is the higher quality, often larger or strategically confirmed opportunity. The others describe introduction, closing, and delivery or coaching.

**Exercise 3.** What are the four things a partner protects?

- A. Brand, prospect, standard, and their own right to earn  **(correct)**
- B. Price, discount, speed, and volume
- C. Only the brand and the company
- D. The partner's commission above all else

**Answer:** A. Brand, prospect, standard, and their own right to earn

**Explanation:** The four are brand, prospect, standard, and the partner's own right to earn by following the process. The other options miss or distort the set.

**Exercise 4.** Which action is prohibited for a partner?

- A. Qualifying a prospect on genuine readiness
- B. Promising a participant a promotion within a year  **(correct)**
- C. Using approved messaging
- D. Registering a deal honestly

**Answer:** B. Promising a participant a promotion within a year

**Explanation:** Promising employment, promotion, income, or results is prohibited. The other three are exactly what a partner should do.

**Exercise 5.** A prospect offers to pay you directly so enrollment moves faster. What do you do?

- A. Accept it to speed things up
- B. Refuse, because payment must go through official channels  **(correct)**
- C. Accept it only for the first payment
- D. Ask for half now and half later

**Answer:** B. Refuse, because payment must go through official channels

**Explanation:** Taking payment outside official channels is prohibited without exception. Any version of accepting direct payment breaks the rule.

**Exercise 6.** Before saying a sentence to a prospect, which question is part of the quick test?

- A. Will this sentence impress them regardless of truth
- B. Does it promise an outcome I cannot control  **(correct)**
- C. Can I make it sound more urgent
- D. Will it hide the review standard

**Answer:** B. Does it promise an outcome I cannot control

**Explanation:** The test asks whether a claim is true, backable, and free of uncontrollable promises or wrong money and data routing. Impressing, adding false urgency, or hiding the bar are not part of it.

<a id="m2-exam"></a>
### Final exam pool (12)

**Exam 1.** The single sentence at the center of the partner identity is which of these?

- A. A partner is a volume reseller
- B. A partner is a trust builder, not a shortcut seller  **(correct)**
- C. A partner is a recruiter
- D. A partner is a discount broker

**Answer:** B. A partner is a trust builder, not a shortcut seller

**Explanation:** The module centers on trust builder, not shortcut seller. The other identities are explicitly not what a partner is.

**Exam 2.** A partner is paid for what, exactly?

- A. Being present when a deal happens
- B. The function they actually performed  **(correct)**
- C. The largest possible role regardless of contribution
- D. Any role they claim verbally

**Answer:** B. The function they actually performed

**Explanation:** Pay follows the function actually performed, not proximity, not an inflated claim, not an unverified verbal role.

**Exam 3.** Which pairing of function and meaning is correct?

- A. Basic introduction means closing a signed agreement
- B. Closing means introducing a contact
- C. Qualified origination means sourcing an opportunity that can realistically close  **(correct)**
- D. Delivery means claiming a territory

**Answer:** C. Qualified origination means sourcing an opportunity that can realistically close

**Explanation:** Qualified origination is sourcing a realistically closable opportunity. The other pairings swap the meanings.

**Exam 4.** Why does protecting the prospect also protect the brand?

- A. Because an honest introduction is what makes the brand trustworthy  **(correct)**
- B. Because the brand does not depend on prospects
- C. Because protecting the prospect lets you skip the standard
- D. Because it increases the commission cap

**Answer:** A. Because an honest introduction is what makes the brand trustworthy

**Explanation:** Honest treatment of prospects is what builds brand trust, so the two reinforce each other. The other options are false.

**Exam 5.** Which of the following is a prohibited claim?

- A. The credential is earned through a reviewed dossier
- B. TenXPros is a selective twelve week certification
- C. TenXPros is basically an accredited university qualification  **(correct)**
- D. Participants bring one real problem to the program

**Answer:** C. TenXPros is basically an accredited university qualification

**Explanation:** Implying accreditation or a degree is prohibited and false. The other statements are accurate descriptions.

**Exam 6.** When may a partner contact a prospect using the TenXPros name?

- A. Immediately after signing up
- B. Only after completing the Activation Gate  **(correct)**
- C. Whenever they feel ready
- D. After their first commission

**Answer:** B. Only after completing the Activation Gate

**Explanation:** Outreach using the name is allowed only after the Activation Gate is complete and confirmed, not on signup, feel, or first commission.

**Exam 7.** A partner wants to move quickly and considers using a list of contacts they purchased. What is correct?

- A. Buying lists is fine if the leads are relevant
- B. Bought, scraped, and spam lists are prohibited  **(correct)**
- C. Scraped lists are allowed but bought lists are not
- D. It is allowed during the pilot only

**Answer:** B. Bought, scraped, and spam lists are prohibited

**Explanation:** Bought lists, scraped lists, and spam are all prohibited, with no relevance, type, or timing exception.

**Exam 8.** Why is mishandling regulated or confidential data treated so seriously?

- A. It only affects the company
- B. It creates legal exposure for the participant, the company, and the partner  **(correct)**
- C. It is a minor formatting issue
- D. It is allowed if the participant agrees verbally

**Answer:** B. It creates legal exposure for the participant, the company, and the partner

**Explanation:** The exposure lands on everyone involved, which is why rights and safeguards are required. It is not minor and not cured by a verbal agreement.

**Exam 9.** Which sentence is approved for a partner to say?

- A. You will be certified automatically after twelve weeks
- B. This is a strong fit because you already have deep expertise and one real problem worth solving  **(correct)**
- C. Finish the program and your income will rise
- D. I can guarantee you pass the review

**Answer:** B. This is a strong fit because you already have deep expertise and one real problem worth solving

**Explanation:** Only B qualifies honestly on readiness. The others promise certification, income, or a guaranteed review outcome.

**Exam 10.** A partner may claim exclusive authority over an industry or territory in which case?

- A. Whenever they have the most clients there
- B. Only when it is confirmed in writing on the Partner Panel  **(correct)**
- C. After ninety days automatically
- D. If a verbal agreement was made

**Answer:** B. Only when it is confirmed in writing on the Partner Panel

**Explanation:** Exclusivity exists only when confirmed in writing on the Panel, not by client count, time, or a verbal deal.

**Exam 11.** A sentence fails the quick test if it does which of these?

- A. States a fact you can back up
- B. Promises an outcome you cannot control  **(correct)**
- C. Describes the four phases accurately
- D. Qualifies the prospect honestly

**Answer:** B. Promises an outcome you cannot control

**Explanation:** Promising an uncontrollable outcome fails the test. Backable facts, accurate descriptions, and honest qualification all pass.

**Exam 12.** In one breath, the partner identity is best summarized as which of these?

- A. Recognize the right professional, tell the truth, register your real role, and protect the standard  **(correct)**
- B. Close as many deals as possible by any means
- C. Promise outcomes that make people feel safe
- D. Move money and data quickly to speed enrollment

**Answer:** A. Recognize the right professional, tell the truth, register your real role, and protect the standard

**Explanation:** The summary is honest recognition, truth, accurate role registration, and protecting the standard. The others describe behavior the module prohibits. --- ## 14.


---

<a id="m3"></a>
## Module 3: The Rules

<a id="m3-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 3 |
| Slug | `rules` |
| Title | The Rules |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 2 is passed (sequential gating). |

**Summary.** Where your right to earn comes from: the five part formula, the Partner Panel as single source of truth, commission by function, tiers, clawback, annual validity, and survival clauses.

<a id="m3-obj"></a>
### Learning objectives

- State the five part earning formula and explain why a conversation is not a right.
- Register a deal correctly, respect exact scope, and know what cannot be registered.
- Explain commission logic, clawback, the tier ladder, your authority limits, and which obligations survive the year end.

<a id="m3-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

This is the most precise part of the Academy and the most important to get right, because your right to earn lives here. Everything is governed by the official Partner Program Terms, and the Partner Panel is the single source of truth. When this lesson and a casual message disagree, the Panel and the Terms win. Read it once fully before your first conversation, then keep it as reference.

##### What you will be able to do

- State the five part earning formula and explain why a conversation is not a right.
- Register a deal correctly, respect exact scope, and know what cannot be registered.
- Explain commission logic, clawback, the tier ladder, your authority limits, and which obligations survive the year end.

##### What you need to understand

###### The five part formula

Your right to earn comes from five things, and you need all five together: a registered opportunity, a real role you actually performed, money that was actually received and cleared, a defined time window, and active account management. If something is not registered, not confirmed, not performed, not cleared, and not recorded, it is not a protected earning right. A friendly conversation is not a right. A pending status is not a right. A confirmed record on the Panel is a right.

###### The relationship, and the Panel as single source of truth

It is an independent contractor relationship. It does not create employment, agency, equity, co founder status, salary, benefits, exclusivity, territory ownership, or any long term commitment. You earn defined commission only when there is a confirmed deal registration, real work performed, and cleared money received.

The Panel being the single source of truth is not a slogan. A verbal comment, a chat message, an email thread, a pending label, or warm encouragement from someone at the company is not approval. No reply is not approval. Silence is not a yes. If it is not confirmed on the Panel, treat it as not yet real.

###### The pilot and the Activation Gate

Every partner begins with a ninety day commission only pilot that lets both sides test fit, quality, seriousness, and operating discipline. Either side can end it on seven days written notice, and ending it does not erase commission already earned on a closed deal, subject to the refund, chargeback, cancellation, and clawback rules.

Before you contact a single prospect using the TenXPros name, you complete the Activation Gate: a signed agreement, completed onboarding, approved messaging, acknowledgement of the partner terms, agreement to use no spam and no bought or scraped lists, your first target list submitted on the Panel, and the company's confirmation on the Panel. Only after that confirmation do you begin outreach.

###### Deal registration and scope

Register the opportunity before substantive contact, and it is effective only when the company confirms it on the Panel. A proper registration names the legal entity or individual, the country, the business unit, the contact, the offering, the estimated seats and value, your role, and a real reason you are positioned to pursue this account.

- **Scope is exact.** A registered account covers only the precise scope confirmed. Parent companies, affiliates, sister companies, other countries, other departments, and group accounts are not included unless the company expressly adds them.
- **Some things cannot be registered:** house accounts, existing TenXPros relationships or pipeline, direct inbound customers, and accounts already registered to another partner.
- **Priority is simple.** If two partners want the same account, priority goes to the one whose registration was confirmed first on the Panel.

###### Commission, payment, and clawback

Commission is earned by function and calculated on net receipts actually received and cleared. The unit of sale is the seat, meaning one enrolled professional, sold either as a business to consumer charter (an individual enrolls) or a business to business engagement (an organization buys seats). Stronger origination and closing pay more than a basic introduction, delivery or coaching pays a fixed fee or small approved percentage, and there is a cap per deal. The exact figures live in the official terms. The logic to remember: you are paid on cleared money, for the function you performed, up to a cap, never simply because a conversation happened.

Commission becomes payable only after the offering has been delivered and the matching customer payment is received and cleared, then within thirty business days of the later of those two events. You handle your own taxes and any receiving side bank fees, and you check your statements and raise any query within thirty days. Clawback is the other side: if an engagement, seat, or payment is refunded, charged back, cancelled, credited, or reversed, no commission is owed, and if you were already paid it can be reversed, offset, or repaid.

###### The tier ladder

The tiers are climbed on collected results, not promises.

- **Tier one, referral partner:** where everyone begins, on the pilot. You can register opportunities, earn on confirmed closed deals, hold a small number of open accounts, and use the referral partner credential.
- **Tier two, certified partner:** earned by selling and collecting a defined number of paid, non refunded seats within twelve months, with a clean record and Panel confirmation. It brings more open accounts, longer protection, priority on company leads, growth bonus eligibility, a certified credential, a public listing, and a letter of recognition.
- **Tier three, territory builder:** earned after tier two by sourcing and collecting a defined number of paid, non refunded seats in one industry or region within twelve months. It brings the most open accounts, the longest protection, first priority on leads in your focus, a focus bonus, and public recognition as the lead partner for your area.

###### Authority limits, and what survives the year

You cannot bind the company, quote prices outside approved current materials, give discounts, promise results, approve terms, accept payment, or issue invoices. You cannot register domains, handles, or business names using the brand, or use unofficial titles. The rules, commission structure, and tier thresholds are valid for the current calendar year only, changeable each new year with notice through the website, and contracts run until the thirty first of December of the year accepted. The annual reset does not cancel everything: confidentiality, non circumvention, non solicitation, clawback on commission already paid, and ownership of intellectual property and customer relationships survive for their defined periods.

##### How to sell it honestly

You sell within the limits, not around them. You describe the offering from approved current materials, you register your role before substantive contact, and you let the Panel confirm what is real. If a prospect pushes for a discount or a price you cannot quote, you do not improvise: you point to the approved materials and route the rest to the company. Your honesty here is what makes your earning right durable, because a right built on the process cannot be argued away later.

> **Say this:** I will register this opportunity before we go further, so your account and my role are recorded and protected on the Panel. Pricing comes from our approved current materials, not from me.

> **Do not say this:** I can knock USD 500 off and lock your whole company group in under one registration, and we will sort the paperwork later.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| Someone at the company said yes over chat, so I am covered, right. | Not yet. A right exists only when it is confirmed on the Panel. A chat message, a pending label, and silence are not approval. |
| Can you give me a discount to close today. | No. Partners cannot give discounts or quote outside approved current materials. I will use the approved figures and route the rest to the company. |
| If I buy seats for the whole group, is the parent company covered too. | Only the exact scope confirmed is covered. Parents, affiliates, and other departments are not included unless the company expressly adds them. |
| When do I get paid. | Commission is payable after delivery and after the matching customer payment is received and cleared, then within thirty business days of the later of those two events. |
| If a seat is refunded after I am paid, do I keep the commission. | No. Clawback applies, so it can be reversed, offset against future commission, or repaid. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The deal registration screen on the Partner Panel. It captures the legal entity or individual, country, business unit, contact, offering, estimated seats and value, your role, and your real reason for pursuing the account. The registration only protects you once the company confirms it here, and it covers only the exact scope shown.

##### Talking points

- Five parts make a right: registered, performed, cleared, timed, managed.
- The Panel is the single source of truth. Silence is not a yes.
- Register before substantive contact, and respect exact scope.
- Paid on cleared money, by function, up to a cap.
- Clawback and survival clauses outlast a refund and the year end.

> **Mistakes to avoid:** Treating a verbal or pending nod as approval. Contacting a prospect with the TenXPros name before the Activation Gate is confirmed. Assuming a registration covers the parent or other departments. Quoting prices or giving discounts on your own authority. Forgetting that clawback, confidentiality, non circumvention, and non solicitation survive the year end and the partnership.

##### Summary checklist

- I can recite the five part formula and explain why a conversation is not a right.
- I can register a deal with the required details and respect exact scope.
- I can name what cannot be registered and who gets priority on a contested account.
- I can explain commission on cleared money, payment timing, and clawback.
- I can describe the three tiers and which obligations survive the year end.

##### A real scenario

You had a strong call with a regional bank's training lead, who said over chat, "We are in, send it through." You feel done, but nothing is registered or confirmed on the Panel, so you have no protected right yet. You register the opportunity with the exact business unit and your real role, wait for the company's confirmation, and only then continue. A week later another partner mentions the same bank. Because your registration was confirmed first on the Panel, priority is yours. The process, not the conversation, is what protected you.

##### How this maps to your exam

Your exam tests the five part formula, the Panel as the only source of approval, the Activation Gate, exact registration scope and first-confirmed priority, commission on cleared receipts with payment timing and clawback, the tier thresholds, your authority limits, and which obligations survive the calendar year.

<a id="m3-plain"></a>
### Lesson body (plain prose / audio text)

This is the most precise part of the Academy, and the most important to get right, because your right to earn lives here. Read it once fully before your first conversation, then come back to it as reference. Everything in this module is governed by the official Partner Program Terms, and the Partner Panel is the single source of truth. When this lesson and a casual message disagree, the Panel and the Terms win.

Start with the formula, because it is the whole logic in one place. Your right to earn comes from five things, and you need all five together. A registered opportunity. A real role you actually performed. Money that was actually received and cleared. A defined time window. And active account management. If something is not registered, not confirmed, not performed, not cleared, and not recorded, it is not a protected earning right. A friendly conversation is not a right. A pending status is not a right. A confirmed record on the Panel is a right.

Understand the relationship you are in. It is an independent contractor relationship. It does not create employment, agency, equity, co founder status, salary, benefits, exclusivity, territory ownership, or any long term commitment. You earn defined commission only when there is a confirmed deal registration, real work performed, and cleared money received. Nothing more is implied by being a partner.

The Partner Panel is the single source of truth, and this is not a slogan. A verbal comment, a chat message, an email thread, a pending label, or warm encouragement from someone at the company is not approval. A right exists only when the company confirms it on the Panel. No reply is not approval. Silence is not a yes. If it is not confirmed on the Panel, treat it as not yet real.

Every partner begins with a ninety day pilot. The pilot is commission only. It lets both sides test fit, quality, seriousness, and operating discipline before anything longer. Either side can end it on seven days written notice. Ending the pilot does not erase commission you already earned on a closed deal, subject to the refund, chargeback, cancellation, and clawback rules. The pilot is a real start, not a trap.

Before you contact a single prospect using the TenXPros name, you complete the Activation Gate. That means a signed agreement, completed onboarding, approved messaging, acknowledgement of the partner terms, agreement to use no spam and no bought or scraped lists, your first target list submitted on the Panel, and the company's confirmation on the Panel. Only after that confirmation do you begin outreach. Not before.

Deal registration is how you protect a specific opportunity, and the details matter. Register the opportunity before substantive contact. The registration is effective only when the company confirms it on the Panel. A proper registration names the legal entity or individual, the country, the business unit, the contact, the offering, the estimated seats and value, your role, and a real reason you are positioned to pursue this account, such as a warm contact, sector relevance, or a concrete route in. Scope is exact. A registered account covers only the precise scope confirmed. Parent companies, affiliates, sister companies, other countries, other departments, and group accounts are not included unless the company expressly adds them. Some things cannot be registered at all: house accounts, existing TenXPros relationships or pipeline, direct inbound customers, and accounts already registered to another partner. And priority is simple. If two partners want the same account, priority goes to the one whose registration was confirmed first on the Panel.

Now commission, in structure. It is earned by function and calculated on net receipts that were actually received and cleared. The unit of sale is the seat, which means one enrolled professional. There are two contexts, a business to consumer charter when an individual enrolls, and a business to business engagement when an organization buys seats for its people. Each function pays a defined rate in each context, the stronger origination and closing roles pay more than a basic introduction, delivery or coaching pays a fixed fee or a small approved percentage, and there is a cap on total commission per deal. A focused tier three account can rise toward a higher cap under the focus rules. The exact figures for the current year live in the official terms. What you must remember is the logic: you are paid on cleared money, for the function you performed, up to a cap, and never simply because a conversation happened.

Payment timing is specific. Commission becomes payable only after the relevant course or offering has been delivered and the company has received and cleared the matching customer payment. Payment is then made within thirty business days of the later of those two events. You are responsible for your own taxes, for any receiving side bank fees, and for checking your commission statements and raising any query within thirty days.

Clawback is the other side of cleared money. If an engagement, a seat, or a payment is refunded, charged back, cancelled, credited, or reversed, no commission is owed on that amount. If you were already paid, it can be reversed, offset against future commission, or repaid. The clawback applies for a defined window, and for the full refund or chargeback period of the underlying contract if that is longer.

Account protection rewards real activity. A confirmed account is protected for a pipeline protection period while you actively pursue it. Higher tiers get longer protection. To keep an account active you provide meaningful updates on the Panel, such as a logged meeting, a documented next step, a customer response, a proposal path, or conversion evidence. During the pilot you can hold a limited number of open registered accounts, with a tighter limit in the first thirty days until you show real progress.

The tiers are a ladder you climb on collected results, not on promises. Tier one is the referral partner, where everyone begins, on the pilot, able to register opportunities, earn on confirmed closed deals, hold a small number of open accounts, and use the referral partner credential. Tier two is the certified partner, earned by selling and collecting a defined number of paid, non refunded seats within twelve months, with a clean record and Panel confirmation. It brings more open accounts, longer protection, priority on company leads, growth bonus eligibility, a certified credential, a public listing, and a letter of recognition. Tier three is the territory builder, earned after tier two by sourcing and collecting a defined number of paid, non refunded seats in one industry or region within twelve months. It brings the most open accounts, the longest protection, first priority on leads in your focus, a focus bonus, and public recognition as the lead partner for your area.

There are firm limits on your authority and the brand. You cannot bind the company. You cannot quote prices unless you are using approved current materials. You cannot give discounts, promise results, approve terms, accept payment, or issue invoices. You cannot register domains, handles, or business names using the TenXPros brand, and you cannot use unofficial titles or credentials.

Confidentiality and intellectual property are clear. TenXPros materials, methods, curriculum, brand, customer data, pipeline, and pricing are confidential and remain company property. Customer relationships remain company property. You may keep legitimate relationships that existed before TenXPros, and you may do unrelated work in your field.

Two obligations follow you after the relationship ends. Non circumvention means that during the relationship and for a defined period after it ends, you do not use TenXPros confidential information, registered accounts, introduced opportunities, or materials to divert business to a competing offering. Non solicitation means that for a defined period after the relationship ends, you do not solicit TenXPros staff, contractors, coaches, or other partners.

Now the part about time, because it shapes every term above. All of these rules, the commission structure, the tier thresholds, and the program policies, are valid for the current calendar year only. They can change at the start of each new calendar year, for partners and for students alike, and every change is announced through the website, which is the official channel of notice. All contracts and partner agreements are valid until the end of the calendar year in which they were accepted, on the thirty first of December of that year. Renewal for the next year happens through the site, and continuing as a partner in the new year means accepting that year's published terms.

The annual reset does not cancel everything, and this is the part people get wrong. Some obligations survive the year end and survive the end of the partnership. Confidentiality survives. Non circumvention survives for its defined period. Non solicitation survives for its defined period. Clawback rights on commission already paid survive for their window. Ownership of intellectual property and of customer relationships survives. In plain words, yearly renewal changes the commercial terms going forward, but it does not erase the obligations you already carry from prior years.

Hold the spirit of this whole module in one line. Your right to earn comes from recorded, real work, inside a defined year, under terms the Panel confirms. Follow the process and you are protected. Skip it and you are not.


<a id="m3-ex"></a>
### Exercises (6)

**Exercise 1.** Which set is the five part earning formula?

- A. A registered opportunity, a real role performed, cleared money, a defined time window, and active account management  **(correct)**
- B. A phone call, an email, a meeting, a proposal, and a handshake
- C. A verbal yes, a pending status, a friendly note, a follow up, and patience
- D. Volume, speed, discounts, urgency, and persistence

**Answer:** A. A registered opportunity, a real role performed, cleared money, a defined time window, and active account management

**Explanation:** The formula is registered opportunity, real role, cleared money, defined window, and active management. The other sets describe activity or pressure, not protected rights.

**Exercise 2.** What counts as approval of a right?

- A. A warm verbal comment from someone at the company
- B. A pending status on the Panel
- C. A confirmation by the company on the Partner Panel  **(correct)**
- D. No reply within a week

**Answer:** C. A confirmation by the company on the Partner Panel

**Explanation:** Only a company confirmation on the Panel creates a right. Verbal comments, pending labels, and silence do not.

**Exercise 3.** Commission is calculated on which basis?

- A. The value of the conversation
- B. Net receipts actually received and cleared  **(correct)**
- C. The estimated deal size at registration
- D. The number of meetings held

**Answer:** B. Net receipts actually received and cleared

**Explanation:** Commission is on cleared net receipts. Conversations, estimates, and meeting counts do not create commission.

**Exercise 4.** Which of these accounts cannot be registered by a partner?

- A. A new company you have a warm contact at
- B. An account already registered to another partner  **(correct)**
- C. A prospect in a sector relevant to you
- D. A business unit you have a concrete route into

**Answer:** B. An account already registered to another partner

**Explanation:** Accounts already registered to another partner, like house accounts and existing pipeline, are not available. The others are normal registrable opportunities.

**Exercise 5.** For how long is a partner contract valid?

- A. Forever, once signed
- B. Until the end of the calendar year in which it was accepted  **(correct)**
- C. For exactly ninety days, then it ends
- D. For twenty four months automatically

**Answer:** B. Until the end of the calendar year in which it was accepted

**Explanation:** Contracts are valid until the thirty first of December of the year they were accepted, with renewal through the site. The other durations are wrong.

**Exercise 6.** When commission becomes payable, within what window is it paid?

- A. Within thirty business days of the later of delivery and cleared payment  **(correct)**
- B. Immediately when the deal is signed
- C. Within one year
- D. Only after the partner reaches tier two

**Answer:** A. Within thirty business days of the later of delivery and cleared payment

**Explanation:** Payment is within thirty business days of the later of delivery and cleared customer payment. Signing alone, a year, or a tier requirement are not the rule.

<a id="m3-exam"></a>
### Final exam pool (12)

**Exam 1.** A partner had a great call but nothing is registered or confirmed on the Panel. What is true?

- A. The partner has a protected earning right from the call
- B. There is no protected right yet, because it is not registered and confirmed  **(correct)**
- C. The call counts as a registration automatically
- D. The right exists once the partner emails a summary

**Answer:** B. There is no protected right yet, because it is not registered and confirmed

**Explanation:** A right requires registration and Panel confirmation, among the five elements. A call, an automatic assumption, or an email summary do not create one.

**Exam 2.** The partner relationship creates which of the following?

- A. Employment and benefits
- B. Equity and co founder status
- C. An independent contractor relationship with defined commission only  **(correct)**
- D. Guaranteed territory ownership

**Answer:** C. An independent contractor relationship with defined commission only

**Explanation:** It is an independent contractor relationship with commission only. It does not create employment, equity, or guaranteed territory.

**Exam 3.** Why is the Partner Panel called the single source of truth?

- A. Because verbal approvals are stronger than the Panel
- B. Because a right exists only when the company confirms it on the Panel  **(correct)**
- C. Because pending statuses are binding
- D. Because silence counts as approval

**Answer:** B. Because a right exists only when the company confirms it on the Panel

**Explanation:** The Panel is authoritative because confirmation there is what creates a right. Verbal approvals, pending labels, and silence are not binding.

**Exam 4.** What is required before a partner contacts a prospect using the TenXPros name?

- A. A single signed page only
- B. The full Activation Gate, including Panel confirmation  **(correct)**
- C. A first commission
- D. Ninety days of waiting

**Answer:** B. The full Activation Gate, including Panel confirmation

**Explanation:** The complete Activation Gate, ending in Panel confirmation, is required before outreach. A partial step, a commission, or time alone is not enough.

**Exam 5.** A registered account covers which scope?

- A. The parent company and all affiliates automatically
- B. Only the exact scope confirmed, unless the company adds more  **(correct)**
- C. Every department in the group
- D. Other countries where the company operates

**Answer:** B. Only the exact scope confirmed, unless the company adds more

**Explanation:** Scope is exactly what is confirmed. Parents, affiliates, group departments, and other countries are not included unless expressly added.

**Exam 6.** Two partners register the same account. Who has priority?

- A. The one with the larger company
- B. The one whose registration was confirmed first on the Panel  **(correct)**
- C. The one who has been a partner longer
- D. Whoever closes first

**Answer:** B. The one whose registration was confirmed first on the Panel

**Explanation:** Priority follows the first confirmed registration on the Panel, not company size, tenure, or who closes first.

**Exam 7.** A seat is refunded after the partner was paid commission on it. What happens?

- A. The partner keeps the commission regardless
- B. The commission can be reversed, offset, or repaid under clawback  **(correct)**
- C. Nothing, because it was already paid
- D. The refund is ignored for commission purposes

**Answer:** B. The commission can be reversed, offset, or repaid under clawback

**Explanation:** Clawback applies to refunds, chargebacks, and reversals, so paid commission can be reversed, offset, or repaid. It is not kept regardless.

**Exam 8.** Tier two, the certified partner, is earned by which of these?

- A. Simply waiting past the pilot
- B. Selling and collecting a defined number of paid, non refunded seats within twelve months, with a clean record and Panel confirmation  **(correct)**
- C. A verbal promotion from a team member
- D. Registering a single large account

**Answer:** B. Selling and collecting a defined number of paid, non refunded seats within twelve months, with a clean record and Panel confirmation

**Explanation:** Tier two is earned on collected, non refunded seats over twelve months with a clean record and Panel confirmation, not on time, a verbal nod, or one registration.

**Exam 9.** Which of these is something a partner may not do?

- A. Use approved current materials to describe the offering
- B. Give a discount to close a deal faster  **(correct)**
- C. Provide a meaningful Panel update on an active account
- D. Submit a proper deal registration

**Answer:** B. Give a discount to close a deal faster

**Explanation:** Partners cannot give discounts, quote outside approved materials, promise results, accept payment, or bind the company. The other actions are allowed and expected.

**Exam 10.** How long are the program rules and commission structure valid?

- A. Permanently, once published
- B. For the current calendar year only, with changes announced through the site  **(correct)**
- C. For twenty four months
- D. Until the partner reaches tier three

**Answer:** B. For the current calendar year only, with changes announced through the site

**Explanation:** Rules and commission are valid for the current calendar year, changeable each new year with notice on the site. They are not permanent or tied to a tier.

**Exam 11.** When the year ends, which obligation still survives?

- A. The current year commission rates continue unchanged
- B. Confidentiality, non circumvention, non solicitation, and clawback survive for their defined periods  **(correct)**
- C. Nothing survives, every term resets
- D. Only the partner's commission claims survive

**Answer:** B. Confidentiality, non circumvention, non solicitation, and clawback survive for their defined periods

**Explanation:** Survival clauses outlast year end and termination. Commercial rates do not simply continue, and the reset does not erase those obligations.

**Exam 12.** Which single line best captures the Rules module?

- A. Earn on conversations, fast and often
- B. Your right to earn comes from recorded, real work, inside a defined year, under terms the Panel confirms  **(correct)**
- C. Promises and persistence create rights
- D. Territory is owned by whoever asks first

**Answer:** B. Your right to earn comes from recorded, real work, inside a defined year, under terms the Panel confirms

**Explanation:** The module's spirit is recorded, real work, within a defined year, confirmed by the Panel. Conversations, promises, and asking for territory do not create rights. --- ## 15.


---

<a id="m4"></a>
## Module 4: What TenXPros Is

<a id="m4-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 4 |
| Slug | `product` |
| Title | What TenXPros Is |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 3 is passed (sequential gating). |

**Summary.** How to explain TenXPros cleanly and honestly: what it is, who it is for, the four phases, and the reviewed evidence it produces.

<a id="m4-obj"></a>
### Learning objectives

- State in one clean sentence what TenXPros is, and what it is not.
- Name who the program is for and, just as importantly, who it is not for.
- Walk a prospect through the four phases (Frame, Design, Prove, Foresee) and the eight assets they build.
- Explain the Living AI Solution Dossier as the center of the program.
- Represent the three review outcomes accurately, and explain why you can never promise the Certified one.

<a id="m4-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

A professional will judge your judgment by how you describe the product. So describe it cleanly, with no exaggeration. TenXPros is a selective twelve week certification: an experienced professional brings one real problem from their own field, runs it through a structured method, and finishes with a reviewed body of evidence they can defend. Not a video library. Not a prompt course. A guided process that ends in defensible proof.

##### What you will be able to do

- State in one clean sentence what TenXPros is, and what it is not.
- Name who the program is for and, just as importantly, who it is not for.
- Walk a prospect through the four phases (Frame, Design, Prove, Foresee) and the eight assets they build.
- Explain the Living AI Solution Dossier as the center of the program.
- Represent the three review outcomes accurately, and explain why you can never promise the Certified one.

##### What you need to understand

###### The one sentence

TenXPros is a selective twelve week certification for experienced professionals. The participant brings one real professional problem from their own field, runs it through a structured method, and finishes with a reviewed body of evidence they can explain and defend to employers, clients, boards, and peers. That is the product.

###### Who it is for, and who it is not for

The program is built for people who already have real expertise: senior operators and experienced professionals, consultants and advisors, managers and decision makers, founders and small business owners, and researchers, educators, and knowledge workers. It does not work well for an absolute beginner with no domain expertise, and that is on purpose.

> **The multiplier idea:** TenX means a multiplier. The program multiplies an AI method onto expertise the person already has. Ten times zero is still zero, so the input has to be real. A beginner with no field is a zero: there is nothing to multiply. That is the structural reason selectivity is a feature, not friction. A Pro brings the expertise. The program brings the method, the evidence, and the governance that turn that Pro into a TenXPro.

###### The four phases

The twelve weeks are organized into four phases, and each one answers a single real question.

- **Frame, weeks one to four:** where does AI actually belong in my work?
- **Design, weeks five to eight:** how do I build it responsibly?
- **Prove, weeks nine and ten:** can I show the value with evidence?
- **Foresee, weeks eleven and twelve:** how do I lead what comes next?

These are not lessons to watch. They are a sequence of building, where the thinking from each phase gets tested by the work of the next.

###### The eight assets and the dossier

Across those phases the participant builds eight connected assets: a Personal AI Strategy Brief, an AI Use Case Portfolio, an Interaction and Decision Kit, a Grounded Domain Knowledge Pack, an AI Evaluation Rubric and Test Set, Custom Assistants and AI Workflows, an AI Value and Economics Case, and a Final Portfolio and ninety day Roadmap. Each one is real, and each one builds on the last.

Those eight assets assemble into one thing: the Living AI Solution Dossier. It is the professional proof artifact and the center of the whole program. It is called living because it can be updated as the participant's work evolves. It is reviewed, it is verifiable, and it is built to be defended. It carries twelve sections mapped to the four phases.

###### The public review criteria and the three outcomes

The dossier is reviewed against eight public criteria: the problem is clearly defined, risks and boundaries are explicit, use cases are chosen and prioritized, an evaluation rubric and a test set exist, the workflow is usable, value is shown with evidence, governance and confidentiality are respected, and the roadmap is realistic. The bar is public, not hidden.

A review has three outcomes, and you must represent all three accurately. **Certified** means the dossier meets the standard and the credential is awarded. **Strong Draft** means the work is close, and specific revisions come back before certification. **Completed** means the program is finished but the credential is not yet earned.

##### How to sell it honestly

The honest pitch is the strong pitch here. Lead with what the program produces (defensible evidence in the prospect's own field), name the selectivity as part of the value, and be upfront that the Certified outcome depends on the work and the review, never on attendance. If you describe the product as anything easier or anything grander, you are describing a different product and setting the person up for disappointment.

> **Say this:** TenXPros is a selective twelve week certification. You bring one real problem from your field, run it through a structured method, and finish with a reviewed dossier you can defend to anyone who matters to you.

> **Do not say this:** It is an easy AI certificate you finish in twelve weeks, and you are guaranteed to pass. That promises an outcome only the review can decide, and it misnames a selective program as an easy one.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| Is this just another AI video course? | No. It is a guided process that ends in a reviewed body of evidence. The center is a dossier of real work, not a set of transcripts. |
| Will I definitely get certified? | I cannot promise that, and I would not trust anyone who did. Certified depends on the reviewed work against a public standard. The three outcomes are Certified, Strong Draft, and Completed. |
| I am brand new to my field. Can I join? | The program needs real domain expertise to multiply. If there is no field yet, it is not the right fit yet. That selectivity is part of why the credential is worth holding. |
| What do I actually walk away with? | A Living AI Solution Dossier built from eight connected assets, and, if it is reviewed as Certified, a verifiable field specific credential. |
| Is the standard hidden or subjective? | No. The dossier is reviewed against eight public criteria. The bar is explicit and published. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The public credential verification screen shows the recipient, the credential status, the issue date, and the badge metadata. It confirms what was earned without exposing the participant's confidential dossier contents.

##### Talking points

- One real problem, run through a structured method, ending in reviewed proof.
- Four phases that each answer one question: Frame, Design, Prove, Foresee.
- Eight assets assemble into one Living AI Solution Dossier.
- Eight public review criteria, so the bar is never a secret.
- A field specific credential that names the participant's actual domain.

> **Mistakes to avoid:** calling it a video library or a prompt course, promising the Certified outcome, pitching it to a beginner with no domain, implying the review bar is hidden, or describing the credential as a generic AI certificate. Each one trades the truth of the product for a weaker, riskier story.

##### Summary checklist

- I can state in one sentence what TenXPros is and is not.
- I can name the four phases and the question each one answers.
- I can explain the eight assets and the Living AI Solution Dossier.
- I can list the three review outcomes and explain why Certified is never promised.
- I can explain why selectivity is a feature, using the multiplier idea.

##### A real scenario

A consultant with eighteen years advising mid market manufacturers asks whether this is worth her time. You do not promise her certification. You show her that across twelve weeks she frames where AI belongs in her advisory work, designs a responsible workflow grounded in her own sources, proves value with a rubric and a test set, and writes a ninety day roadmap, all assembled into a dossier reviewed against eight public criteria. She leaves seeing a body of work she could defend to a client, not a certificate of attendance.

##### How this maps to your exam

Your exam checks that you can name the central artifact (the Living AI Solution Dossier), match each phase to its question, list the eight review criteria and the three outcomes, and explain why a partner can never promise the Certified result. Hold those straight and the rest follows.

<a id="m4-plain"></a>
### Lesson body (plain prose / audio text)

You have to be able to explain the product cleanly, without a single exaggeration, to a professional who will judge your judgment by how you describe it. So learn the shape of it well.

In one clean sentence: TenXPros is a selective twelve week certification for experienced professionals. The participant brings one real professional problem from their own field, runs it through a structured method, and finishes with a reviewed body of evidence they can explain and defend to employers, clients, boards, and peers. That is the product. Not a video library. Not a prompt course. A guided process that ends in defensible proof.

Who it is for matters as much as what it is. The program is built for people who already have real expertise: senior operators and experienced professionals, consultants and advisors, managers and decision makers, founders and small business owners, and researchers, educators, and knowledge workers. It does not work well for an absolute beginner with no domain expertise, and that is on purpose. The selectivity is a feature. It is part of why the credential is worth holding. When a prospect has no real domain to work from, the honest answer is that the program is not the right fit yet.

The whole twelve weeks is organized into four phases, and each phase answers one real question. Phase one is Frame, weeks one to four, and it asks where AI actually belongs in my work. Phase two is Design, weeks five to eight, and it asks how I build it responsibly. Phase three is Prove, weeks nine and ten, and it asks whether I can show the value with evidence. Phase four is Foresee, weeks eleven and twelve, and it asks how I lead what comes next. These are not lessons to watch. They are a sequence of building, where the thinking from each phase gets tested by the work of the next.

Across those phases the participant builds eight connected assets. A Personal AI Strategy Brief, which is their stance and scope. An AI Use Case Portfolio, where AI earns its place in their specific work. An Interaction and Decision Kit, the prompts, checks, and human in the loop rules. A Grounded Domain Knowledge Pack, the trusted sources their AI work stands on. An AI Evaluation Rubric and Test Set, how they measure whether it actually works. Custom Assistants and AI Workflows, the working system rather than a demo. An AI Value and Economics Case, the evidence that it is worth doing. And a Final Portfolio and ninety day Roadmap, what they ship next and how they lead it. Eight assets, each one real, each one building on the last.

Those eight assets assemble into one thing: the Living AI Solution Dossier. This is the professional proof artifact, and it is the center of the whole program. It shows the participant did not just learn AI concepts. They framed a real problem, designed responsible AI use, built evaluation and governance, showed value with evidence, and laid out a realistic roadmap. It is called living because it can be updated as their work evolves. It is reviewed, it is verifiable, and it is built to be defended. The dossier has twelve sections mapped to the four phases: in Frame, the Professional Context, the Problem Definition, and the AI Suitability Assessment. In Design, the Context Stakeholder and Initial Foresight Analysis, the Data and Evidence Review, the Workflow Before and After, the Risk Ethics Privacy and Compliance Review, and the Responsible AI Solution Design. In Prove, the Adoption and Communication Plan and the Value Roadmap and Proof Plan. In Foresee, the Personal AI Foresight Plan and the Final Recommendation.

The dossier is reviewed against eight public criteria, and you should know them because they explain what quality means here. The problem is clearly defined. Risks and boundaries are explicit. Use cases are chosen and prioritized. An evaluation rubric and a test set exist. The workflow is usable. Value is shown with evidence. Governance and confidentiality are respected. And the roadmap is realistic. These criteria are public, which is part of the honesty of the program. The bar is not hidden.

There are three outcomes from a review, and you must represent all three accurately. Certified means the dossier meets the standard and the credential is awarded. Strong Draft means the work is close, and specific revisions come back before certification. Completed means the program is finished but the credential is not yet earned. Notice what this means for how you talk to prospects. You can never promise the Certified outcome, because it depends on the work and the review, not on attendance.

The credential itself is verifiable and public, and it is field specific, which is part of its power. It names the participant's actual domain rather than a generic AI certificate. Verification confirms the recipient, the credential status, the issue date, and the badge metadata, without exposing the participant's confidential dossier contents. So a participant can prove what they earned without handing over their private work.

Keep this whole module honest in your mouth. TenXPros is selective, applied, and reviewed. It turns one real problem into defensible evidence for an experienced professional. If you describe it as anything easier or anything grander than that, you are describing a different product, and you are setting up the person in front of you for disappointment.


<a id="m4-ex"></a>
### Exercises (6)

**Exercise 1.** In one sentence, what is TenXPros?

- A. A video library of AI lessons
- B. A selective twelve week certification where a professional turns one real problem into reviewed evidence  **(correct)**
- C. A prompt writing course for beginners
- D. A general AI newsletter

**Answer:** B. A selective twelve week certification where a professional turns one real problem into reviewed evidence

**Explanation:** It is a selective twelve week applied certification ending in reviewed evidence. It is not a video library, a beginner prompt course, or a newsletter.

**Exercise 2.** Who is the program a poor fit for?

- A. An experienced manager with a real problem
- B. An absolute beginner with no domain expertise  **(correct)**
- C. A consultant who advises clients
- D. A founder making AI decisions

**Answer:** B. An absolute beginner with no domain expertise

**Explanation:** The program needs real domain expertise to work, so an absolute beginner is the poor fit. The others are squarely the target.

**Exercise 3.** Which phase asks where does AI actually belong in my work?

- A. Frame  **(correct)**
- B. Design
- C. Prove
- D. Foresee

**Answer:** A. Frame

**Explanation:** Frame, weeks one to four, asks where AI belongs. Design asks how to build it, Prove asks about evidence, and Foresee asks about leading what comes next.

**Exercise 4.** The eight assets assemble into what single artifact?

- A. A slide deck
- B. The Living AI Solution Dossier  **(correct)**
- C. A certificate of attendance
- D. A prompt library

**Answer:** B. The Living AI Solution Dossier

**Explanation:** The eight assets form the Living AI Solution Dossier. It is not a slide deck, an attendance certificate, or a prompt library.

**Exercise 5.** Which is one of the three review outcomes?

- A. Strong Draft  **(correct)**
- B. Gold Tier
- C. Provisional Pass
- D. Honorable Mention

**Answer:** A. Strong Draft

**Explanation:** The three outcomes are Certified, Strong Draft, and Completed. The other labels are not used.

**Exercise 6.** What can a partner never promise about the review?

- A. That the criteria are public
- B. That the participant will get the Certified outcome  **(correct)**
- C. That there are three possible outcomes
- D. That the dossier is reviewed

**Answer:** B. That the participant will get the Certified outcome

**Explanation:** Certified depends on the work and the review, so it can never be promised. The other statements are true and can be shared.

<a id="m4-exam"></a>
### Final exam pool (12)

**Exam 1.** What is the central artifact of the entire program?

- A. A multiple choice exam
- B. The Living AI Solution Dossier  **(correct)**
- C. A completion certificate
- D. A set of video transcripts

**Answer:** B. The Living AI Solution Dossier

**Explanation:** The dossier is the center of the program, assembled from the eight assets. The others are not the core artifact.

**Exam 2.** Why is the program's selectivity described as a feature?

- A. Because it makes enrollment slower for no reason
- B. Because it is part of why the credential is worth holding  **(correct)**
- C. Because it lets partners promise easy passes
- D. Because it hides the curriculum

**Answer:** B. Because it is part of why the credential is worth holding

**Explanation:** Selectivity protects the value of the credential. It is not pointless friction, an easy pass enabler, or a way to hide content.

**Exam 3.** Which pairing of phase and question is correct?

- A. Design asks where AI belongs
- B. Prove asks how to build it responsibly
- C. Foresee asks how to lead what comes next  **(correct)**
- D. Frame asks whether value can be shown with evidence

**Answer:** C. Foresee asks how to lead what comes next

**Explanation:** Foresee asks how to lead what comes next. The other pairings swap the phase questions.

**Exam 4.** Which of these is one of the eight assets?

- A. A Personal AI Strategy Brief  **(correct)**
- B. A signed employment contract
- C. A territory exclusivity agreement
- D. A discount schedule

**Answer:** A. A Personal AI Strategy Brief

**Explanation:** The Personal AI Strategy Brief is one of the eight assets. The others are not part of the program build.

**Exam 5.** What does it mean that the dossier is living?

- A. It expires after one use
- B. It can be updated as the participant's work evolves  **(correct)**
- C. It cannot be changed once submitted
- D. It is only a draft and never reviewed

**Answer:** B. It can be updated as the participant's work evolves

**Explanation:** Living means it can be updated over time. It does not expire on use, freeze on submission, or stay an unreviewed draft.

**Exam 6.** The dossier is reviewed against how many public criteria, and are they hidden?

- A. Eight criteria, and they are public  **(correct)**
- B. Three criteria, and they are secret
- C. Twelve criteria, and they are hidden
- D. There are no fixed criteria

**Answer:** A. Eight criteria, and they are public

**Explanation:** There are eight public review criteria. The bar is explicit, not secret, and not absent.

**Exam 7.** Which is one of the eight review criteria?

- A. The participant attended every session
- B. Value is shown with evidence  **(correct)**
- C. The participant paid in full
- D. The dossier is long

**Answer:** B. Value is shown with evidence

**Explanation:** Showing value with evidence is a criterion. Attendance, payment, and length are not review criteria.

**Exam 8.** A participant finishes the program but the dossier does not yet meet the standard. Which outcome is that?

- A. Certified
- B. Completed  **(correct)**
- C. Strong Draft becomes automatic certification
- D. The participant is expelled

**Answer:** B. Completed

**Explanation:** Completed means finished without the credential yet. Certified requires meeting the standard, Strong Draft returns revisions, and no one is expelled for this.

**Exam 9.** What is special about the credential's naming?

- A. It is a generic AI certificate
- B. It is field specific and names the participant's actual domain  **(correct)**
- C. It hides the participant's profession
- D. It is identical for everyone

**Answer:** B. It is field specific and names the participant's actual domain

**Explanation:** The credential is field specific, naming the real domain. It is not generic, hidden, or identical across people.

**Exam 10.** What does verification of the credential reveal?

- A. The full confidential dossier contents
- B. The recipient, status, issue date, and badge metadata, without the confidential dossier  **(correct)**
- C. Nothing at all
- D. The participant's private client data

**Answer:** B. The recipient, status, issue date, and badge metadata, without the confidential dossier

**Explanation:** Verification confirms recipient, status, date, and badge metadata while protecting the confidential dossier. It does not expose private work or client data.

**Exam 11.** Which description of the product is honest?

- A. An easy certificate for anyone in twelve weeks
- B. A selective, applied, reviewed certification that turns one real problem into defensible evidence  **(correct)**
- C. A guaranteed path to certification by attendance
- D. A grand accredited degree program

**Answer:** B. A selective, applied, reviewed certification that turns one real problem into defensible evidence

**Explanation:** The honest description is selective, applied, and reviewed, ending in defensible evidence. The others overpromise ease, guarantee outcomes, or claim accreditation.

**Exam 12.** Why must a partner never promise the Certified outcome?

- A. Because certification is decided by the work and the review, not by attendance  **(correct)**
- B. Because the criteria are secret
- C. Because there is only one possible outcome
- D. Because the dossier is never actually reviewed

**Answer:** A. Because certification is decided by the work and the review, not by attendance

**Explanation:** Certified depends on reviewed work against a public standard, so it cannot be promised. The criteria are public, there are three outcomes, and the dossier is reviewed. --- ## 16.


---

<a id="m5"></a>
## Module 5: The Twelve Week Journey

<a id="m5-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 5 |
| Slug | `journey` |
| Title | The Twelve Week Journey |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 4 is passed (sequential gating). |

**Summary.** The twelve week journey a participant takes, phase by phase, so you can describe the experience with confidence.

<a id="m5-obj"></a>
### Learning objectives

- Walk a prospect through all twelve weeks, naming what they produce and the badge they earn each week.
- Frame the journey as four phases: Frame, Design, Prove, Foresee.
- Retell the same map in the prospect's own field without inventing anything.
- Use illustrative field numbers honestly, never as a promise.
- Lead a field story with the boundary that keeps a human in control.

<a id="m5-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

This is the module you will lean on most in real conversations, because it is where the twelve weeks stop being abstract and become a story a specific person can see themselves inside. You make the journey feel real by knowing the universal map cold and then telling it through the lens of the prospect's own profession.

##### What you will be able to do

- Walk a prospect through all twelve weeks, naming what they produce and the badge they earn each week.
- Frame the journey as four phases: Frame, Design, Prove, Foresee.
- Retell the same map in the prospect's own field without inventing anything.
- Use illustrative field numbers honestly, never as a promise.
- Lead a field story with the boundary that keeps a human in control.

##### What you need to understand

###### The universal map

The program runs as eleven core modules plus a final dossier and capstone review, one stretch of work per week, and each week ends with a milestone badge that marks a small, earned win. The four phases are Frame (weeks one to four), Design (weeks five to eight), Prove (weeks nine and ten), and Foresee (weeks eleven and twelve). Here is the week by week skeleton, built strictly from the canonical map.

| Week | Focus | What they produce | Badge |
| --- | --- | --- | --- |
| 1 | AI readiness and the TenX mindset | A readiness snapshot and a professional stance | TenX Mindset |
| 2 | Practical AI literacy and tool fluency | A tool use map and first safe experiments | AI Core |
| 3 | Responsible AI and professional boundaries | Boundary rules and a confidentiality plan | Responsible AI |
| 4 | Problem discovery and structured framing | A problem definition and an AI suitability assessment | Problem Framing |
| 5 | Context, stakeholder, and foresight mapping | A stakeholder map and early scenario notes | Context Mapper |
| 6 | Data, evidence, and verification discipline | A grounded knowledge pack and source rules | Evidence Discipline |
| 7 | Workflow and human to AI allocation | A before and after workflow and an allocation map | Workflow Designer |
| 8 | Responsible AI solution design | An assistant or workflow prototype with guardrails | Responsible Solution |
| 9 | Adoption, communication, and change | An adoption plan and stakeholder communication | Adoption Designer |
| 10 | Value, roadmap, and proof plan | An evaluation rubric, a test set, and a value case | Value Proof |
| 11 | AI foresight and scenario planning | A foresight plan and scenario triggers | Foresight Strategist |
| 12 | Final dossier and capstone review | The Living AI Solution Dossier and the final recommendation | Capstone Review |

###### The four phases, and what each one settles

- **Frame (weeks one to four):** the participant settles where AI belongs in their work, ending with a problem definition and an AI suitability assessment.
- **Design (weeks five to eight):** they build responsibly, ending with an assistant or workflow prototype carrying guardrails, grounded in their own sources.
- **Prove (weeks nine and ten):** they show value with evidence, ending with an evaluation rubric, a test set, and a value case.
- **Foresee (weeks eleven and twelve):** they lead what comes next, ending with a foresight plan and the final dossier and capstone review.

###### What they are reviewed on, and the outcome they receive

Every week's badge is earned by completing and submitting that week's actual work, so the badge trail is a record of real deliverables, not attendance. The whole journey points at week twelve, where the eight assets assemble into the Living AI Solution Dossier and the final recommendation. That dossier is what gets reviewed, and from that review the participant receives an outcome, with the field specific credential awarded when the work meets the standard.

##### How to sell it honestly

The skeleton above is the same for everyone, but the same skeleton looks completely different depending on who is walking through it. That is the point of the Field Journey Explorer. When you sit with a radiologist, you do not recite the twelve weeks. You show her how a radiologist with fourteen years of experience uses Frame to rule out autonomous diagnosis and rule in an image triage layer, uses Design to build a decision kit and a grounded knowledge pack, uses Prove to test against a real set of past cases and report honest numbers including the misses, and uses Foresee to write a ninety day rollout and submit a dossier that earns the field specific credential of a certified AI adopted radiologist.

The same four phases, for a lawyer, produce a contract intake and risk triage assistant that never gives legal advice. For an HR director, they produce an interview feedback assistant that never makes the hiring decision. Finance, marketing, education, product, engineering, healthcare operations, consulting: each one is the same method wearing the prospect's own clothes.

> **Say this:** In week four you would land on the one problem worth twelve weeks of your time, and by week twelve you would hold a reviewed dossier you can defend in your own field. Let me walk it through the way it would look for you.

> **Do not say this:** Other people in your field cut their review time by forty percent, so you will too. Any number from a field story is illustrative of how value gets proven, never a promise of what anyone will achieve.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| Twelve weeks is a long commitment. What keeps me moving? | Each week ends in a deliverable and an earned badge, so you always have a visible trail of progress toward the dossier. |
| Does the same program really fit my field? | The four phase method stays constant. The work changes to your field. A radiologist, a lawyer, and an HR director each build something different from the same map. |
| You quoted a percentage. Is that what I will get? | No. That figure is illustrative of how a participant proves value. It is not a guarantee, and I will not present it as one. |
| Will AI take over the judgment in my work? | No. Every field story keeps a human in control. The radiologist keeps diagnostic authority, the lawyer keeps legal advice, and the program teaches exactly that boundary. |
| What do I hold at the end? | A reviewed Living AI Solution Dossier and, when the work meets the standard, a field specific credential naming your actual domain. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The Field Journey Explorer lets you pick a profession and see the four phases retold in that field's language, with the weekly badges and the field specific credential the participant would hold at the end. Use it to prepare, not to recite.

##### Talking points

- Eleven core modules plus a final dossier and capstone review, one stretch of work per week.
- Four phases: Frame, Design, Prove, Foresee, each answering one real question.
- A badge every week, each tied to a concrete deliverable.
- The same method, retold in the prospect's own field.
- Lead with the boundary as much as the benefit.

> **Mistakes to avoid:** reciting the generic twelve weeks to a specific person, presenting an illustrative number as a guaranteed result, leading with AI capability instead of the boundary that keeps a human in control, or inventing weeks, badges, or outcomes that are not on the map.

##### Summary checklist

- I can name the focus, the deliverable, and the badge for each of the twelve weeks.
- I can group the weeks into the four phases and say what each phase settles.
- I can retell the journey in a prospect's own field using the Field Journey Explorer.
- I can use a field number as an illustration, never a promise.
- I can lead a field story with the human boundary.

##### A real scenario

You meet an HR director with eleven years running talent for a regional bank. You do not list weeks one to twelve. You show her Frame landing on a single problem, interview feedback that is inconsistent across panels, then Design producing a feedback assistant that structures notes and checks evidence but never makes the hiring decision, then Prove testing it against a set of past interviews and reporting honest numbers, then Foresee writing a ninety day rollout into one division. She leaves seeing herself in twelve weeks holding a defensible dossier, with the decision still firmly hers.

##### How this maps to your exam

Your exam checks that you can pair each week with its badge, place each week in the right phase, retell the method in a field while keeping the boundary central, and frame any field number as illustrative rather than a promise. Know the table and the phase boundaries and you will have it.

<a id="m5-plain"></a>
### Lesson body (plain prose / audio text)

This is the part of the program you will lean on most in real conversations, because it is where the twelve weeks stop being abstract and start being a story a specific person can see themselves inside. Your job is to make the journey feel real, and the way you do that is by knowing the universal map cold and then telling it through the lens of the prospect's own profession.

Here is the universal map. The program runs as eleven core modules plus a final dossier and capstone review, one stretch of work per week, and each week ends with a milestone badge that marks a small, earned win. Week one is AI readiness and the TenX mindset, and it produces a readiness snapshot and a professional stance, earning the TenX Mindset badge. Week two is practical AI literacy and tool fluency, producing a tool use map and first safe experiments, earning AI Core. Week three is responsible AI and professional boundaries, producing boundary rules and a confidentiality plan, earning Responsible AI. Week four is problem discovery and structured framing, producing a problem definition and an AI suitability assessment, earning Problem Framing. That closes the Frame phase.

Week five is context, stakeholder, and foresight mapping, producing a stakeholder map and early scenario notes, earning Context Mapper. Week six is data, evidence, and verification discipline, producing a grounded knowledge pack and source rules, earning Evidence Discipline. Week seven is workflow and human to AI allocation, producing a before and after workflow and an allocation map, earning Workflow Designer. Week eight is responsible AI solution design, producing an assistant or workflow prototype with guardrails, earning Responsible Solution. That closes the Design phase.

Week nine is adoption, communication, and change, producing an adoption plan and stakeholder communication, earning Adoption Designer. Week ten is value, roadmap, and proof plan, producing an evaluation rubric, a test set, and a value case, earning Value Proof. That closes the Prove phase. Week eleven is AI foresight and scenario planning, producing a foresight plan and scenario triggers, earning Foresight Strategist. Week twelve is the final dossier and capstone review, producing the Living AI Solution Dossier and the final recommendation, earning the Capstone Review badge. That closes the Foresee phase and the program.

That is the skeleton. Now the muscle. The same skeleton looks completely different depending on who is walking through it, and that is the point of the Field Journey Explorer. When you sit with a radiologist, you do not recite the twelve weeks. You show her how a radiologist with fourteen years of experience uses Frame to rule out autonomous diagnosis and rule in an image triage layer, uses Design to build a decision kit and a grounded knowledge pack, uses Prove to test against a real set of past cases and report honest numbers including the misses, and uses Foresee to write a ninety day rollout and submit a dossier that earns the field specific credential of a certified AI adopted radiologist. When you sit with a lawyer, the same four phases produce a contract intake and risk triage assistant that never gives legal advice. When you sit with an HR director, they produce an interview feedback assistant that never makes the hiring decision. Finance, marketing, education, product, engineering, healthcare operations, consulting, each one is the same method wearing the prospect's own clothes.

Two things make these field stories work, and you must respect both. First, they are realistic examples, not guarantees. Any numbers in them, like a sensitivity figure or a percentage of time saved, are illustrative of how a participant proves value, not a promise of what anyone will achieve. Say that plainly when you use them. It keeps you honest and it keeps you inside the rule that you never promise results. Second, the boundary in every story is the most important part, not the AI capability. The radiologist keeps diagnostic authority. The lawyer does not let AI give legal advice. The clinic manager never lets AI answer a medical question. When you tell a field story, lead with the boundary as much as the benefit, because that is exactly the judgment the program teaches and exactly what a serious professional wants to hear.

So when you prepare for a conversation, pick the field that matches the person, walk the four phases in their language, name the badges and the rank they would earn along the way, and end on the field specific credential they would hold. Do that and the prospect is no longer evaluating an AI course. They are looking at a believable picture of themselves twelve weeks from now, holding proof they can defend. That picture, told honestly, is the most persuasive and the most ethical thing you can offer.


<a id="m5-ex"></a>
### Exercises (6)

**Exercise 1.** How is the universal program structured across the twelve weeks?

- A. Twelve identical lectures
- B. Eleven core modules plus a final dossier and capstone review, with a weekly milestone badge  **(correct)**
- C. Four exams and nothing else
- D. Self study with no structure

**Answer:** B. Eleven core modules plus a final dossier and capstone review, with a weekly milestone badge

**Explanation:** It is eleven core modules plus the final dossier and capstone review, each week ending in a badge. It is not identical lectures, exams only, or unstructured.

**Exercise 2.** Which badge is earned in week one?

- A. Capstone Review
- B. Value Proof
- C. TenX Mindset  **(correct)**
- D. Workflow Designer

**Answer:** C. TenX Mindset

**Explanation:** Week one, AI readiness and the TenX mindset, earns the TenX Mindset badge. The others are earned in later weeks.

**Exercise 3.** What is the right way to use the Field Journey Explorer in a conversation?

- A. Recite the generic twelve weeks regardless of the person
- B. Show the prospect their own profession walking through the four phases  **(correct)**
- C. Skip the journey and talk only about price
- D. Promise the exact outcomes from the example

**Answer:** B. Show the prospect their own profession walking through the four phases

**Explanation:** The point is to tell the journey in the prospect's own field. Reciting generically, skipping to price, or promising the example outcomes all miss it.

**Exercise 4.** Numbers inside a field story, such as a percentage of time saved, should be presented as what?

- A. A guarantee of what the participant will achieve
- B. An illustrative example of how value is proven, not a promise  **(correct)**
- C. An accreditation claim
- D. A fixed program result

**Answer:** B. An illustrative example of how value is proven, not a promise

**Explanation:** Such numbers are illustrative of proving value, never a promise. Treating them as guarantees, accreditation, or fixed results is wrong and breaks the no promises rule.

**Exercise 5.** In every field story, what should the partner lead with as much as the benefit?

- A. The price
- B. The boundary that keeps a human in control  **(correct)**
- C. The badge colors
- D. The speed of the tool

**Answer:** B. The boundary that keeps a human in control

**Explanation:** The boundary is the heart of the judgment the program teaches, so lead with it. Price, colors, and speed are not the point.

**Exercise 6.** Which week closes the Design phase?

- A. Week four
- B. Week eight  **(correct)**
- C. Week ten
- D. Week twelve

**Answer:** B. Week eight

**Explanation:** Design runs weeks five to eight, so week eight closes it. Week four closes Frame, week ten closes Prove, and week twelve closes Foresee.

<a id="m5-exam"></a>
### Final exam pool (12)

**Exam 1.** Why is the journey module the one partners lean on most?

- A. Because it lists the prices
- B. Because it makes the twelve weeks real for a specific person  **(correct)**
- C. Because it lets partners skip the rules
- D. Because it guarantees outcomes

**Answer:** B. Because it makes the twelve weeks real for a specific person

**Explanation:** It turns the abstract program into a believable story for a specific prospect. It is not about price, skipping rules, or guarantees.

**Exam 2.** Which pairing of week and badge is correct?

- A. Week two earns Capstone Review
- B. Week six earns Evidence Discipline  **(correct)**
- C. Week one earns Value Proof
- D. Week twelve earns TenX Mindset

**Answer:** B. Week six earns Evidence Discipline

**Explanation:** Week six, data and evidence discipline, earns Evidence Discipline. The other pairings are mismatched.

**Exam 3.** A radiologist walking the journey would, in the Frame phase, most likely do which of these?

- A. Build a fully autonomous diagnosis system
- B. Rule out autonomous diagnosis and rule in an image triage layer with human authority kept  **(correct)**
- C. Let AI sign off diagnoses
- D. Remove the radiologist from the loop

**Answer:** B. Rule out autonomous diagnosis and rule in an image triage layer with human authority kept

**Explanation:** The realistic Frame outcome keeps diagnostic authority human and scopes AI to triage. Autonomous diagnosis and removing the human are exactly what the example rules out.

**Exam 4.** What is the same and what is different across the field stories?

- A. The method changes, the field stays the same
- B. The four phase method stays the same, the field specific work changes  **(correct)**
- C. Both the method and the outcome are identical for everyone
- D. Nothing is shared between fields

**Answer:** B. The four phase method stays the same, the field specific work changes

**Explanation:** The method is constant, the field specific application varies. The method does not change, outcomes are not identical, and the fields do share the method.

**Exam 5.** A partner uses a sensitivity figure from the radiology example with a prospect. What must they say about it?

- A. That every participant will hit that number
- B. That it is an illustrative example of proving value, not a promise  **(correct)**
- C. That it is an accredited result
- D. Nothing, just present it as fact

**Answer:** B. That it is an illustrative example of proving value, not a promise

**Explanation:** The figure is illustrative, not a promise, and must be framed that way. Claiming everyone will hit it, calling it accredited, or presenting it as guaranteed fact is wrong.

**Exam 6.** In the legal field story, what does the assistant never do?

- A. Help prepare a better intake
- B. Triage risk
- C. Give legal advice  **(correct)**
- D. Flag missing information

**Answer:** C. Give legal advice

**Explanation:** The legal assistant never gives legal advice. It can help with intake, triage, and flagging gaps, which keep the lawyer in control.

**Exam 7.** Which week earns the Foresight Strategist badge?

- A. Week nine
- B. Week ten
- C. Week eleven  **(correct)**
- D. Week twelve

**Answer:** C. Week eleven

**Explanation:** Week eleven, AI foresight and scenario planning, earns Foresight Strategist. The other weeks earn different badges.

**Exam 8.** When preparing for a conversation, the partner should do which of these?

- A. Pick the field that matches the person and walk the four phases in their language  **(correct)**
- B. Use the same generic script for everyone
- C. Lead with discounts
- D. Promise the credential outcome

**Answer:** A. Pick the field that matches the person and walk the four phases in their language

**Explanation:** Tailoring to the prospect's field and walking the phases in their language is the method. Generic scripts, discounts, and promised outcomes are not.

**Exam 9.** In the HR field story, the interview feedback assistant does what?

- A. Makes the hiring decision
- B. Helps structure notes and check evidence without making the decision  **(correct)**
- C. Ranks candidates automatically
- D. Replaces the hiring panel

**Answer:** B. Helps structure notes and check evidence without making the decision

**Explanation:** The HR assistant supports structure and evidence while the human panel decides. It never makes the decision, ranks candidates, or replaces the panel.

**Exam 10.** What closes the Prove phase?

- A. Week eight
- B. Week ten  **(correct)**
- C. Week eleven
- D. Week four

**Answer:** B. Week ten

**Explanation:** Prove runs weeks nine and ten, so week ten closes it. Week eight closes Design, week eleven is in Foresee, and week four closes Frame.

**Exam 11.** Why lead a field story with the boundary, not just the benefit?

- A. Because boundaries are legally required to mention and benefits are not
- B. Because the boundary is the judgment the program teaches and what a serious professional wants to hear  **(correct)**
- C. Because benefits are unimportant
- D. Because it shortens the conversation

**Answer:** B. Because the boundary is the judgment the program teaches and what a serious professional wants to hear

**Explanation:** The boundary reflects the core judgment the program builds and reassures a serious prospect. It is not about legal wording, ignoring benefits, or saving time.

**Exam 12.** Told honestly, a field story turns the prospect's evaluation into what?

- A. A comparison of AI courses
- B. A believable picture of themselves in twelve weeks holding defensible proof  **(correct)**
- C. A price negotiation
- D. A promise of guaranteed results

**Answer:** B. A believable picture of themselves in twelve weeks holding defensible proof

**Explanation:** A good field story lets the prospect see a believable future version of themselves with proof. It is not a course comparison, a price talk, or a guarantee. --- ## 17.


---

<a id="m6"></a>
## Module 6: Ranks, Badges, and Credentials

<a id="m6-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 6 |
| Slug | `ranks` |
| Title | Ranks, Badges, and Credentials |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 5 is passed (sequential gating). |

**Summary.** The two layer recognition system of weekly badges and meaningful credentials, and how they build toward certification.

<a id="m6-obj"></a>
### Learning objectives

- Explain the two layer recognition system in plain language.
- List the twelve weekly badges in order and say what a badge actually stands for.
- Name the four phase ranks and what each one means a participant has produced.
- Say what makes the flagship credential worth holding.
- Describe a participant's status honestly at any point in the program.

<a id="m6-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

Recognition in this program runs on two layers, and once you see them, the whole thing makes sense and you can explain it in thirty seconds. Layer one is small and frequent. Layer two is large and meaningful. Together they build toward one flagship credential. The short version: sell the proof, not the stickers.

##### What you will be able to do

- Explain the two layer recognition system in plain language.
- List the twelve weekly badges in order and say what a badge actually stands for.
- Name the four phase ranks and what each one means a participant has produced.
- Say what makes the flagship credential worth holding.
- Describe a participant's status honestly at any point in the program.

##### What you need to understand

###### Layer one: the twelve weekly badges

One badge per week. These are not participation trophies, and you should never describe them as decorations. Each badge is earned by completing and submitting that week's actual work. They exist because a twelve week program is long, and small earned wins keep a serious professional moving with a visible trail of progress. The twelve, in order, are TenX Mindset, AI Core, Responsible AI, Problem Framing, Context Mapper, Evidence Discipline, Workflow Designer, Responsible Solution, Adoption Designer, Value Proof, Foresight Strategist, and Capstone Review. Each one maps to a week and to a concrete deliverable, so a badge is shorthand for a piece of real work that exists.

###### Layer two: the four phase ranks

As each phase is completed, the participant earns a rank that signals what they can now do, not just what they attended.

| Phase completed | Rank | Badge name | What it means they produced |
| --- | --- | --- | --- |
| Frame | TenX Practitioner at Frame Level | AI Field Analyst | A documented, defensible use case portfolio and strategy brief |
| Design | TenX Practitioner at Design Level | AI Systems Builder | A working AI workflow grounded in domain knowledge with a documented evaluation rubric |
| Prove | TenX Practitioner at Proof Level | AI Evidence Builder | A tested, evaluated system with an evidence based value case |
| Foresee, with a certified dossier | TenXPros Certified Professional | AI Adoption Leader, carrying their field | A responsible AI adoption system in their domain, built, tested, documented, and defensible |

###### What makes the flagship credential worth holding

The flagship credential is the thing everything points toward, and you should be able to say what makes it real. It is **verifiable**, reviewed against a public rubric rather than self reported. It is **field specific**, naming the participant's actual domain rather than a generic AI certificate. It is **evidence based**, backed by a reviewed living dossier of real work. And it is **defensible**, meaning the holder can walk any stakeholder through exactly what they built, how they tested it, and what value it delivers.

> A normal certificate says this person completed a course. This credential says this person built, tested, and documented a responsible AI adoption system in their field, and it was reviewed against an explicit public standard. Those are not the same sentence, and serious people know the difference.

###### The language of progress titles

There is a simple language of progress titles for where a participant is at any moment: accepted member before week one, through the phase ranks, to dossier candidate at submission, and finally to one of the three review outcomes. Use these to set expectations honestly. A participant in week six is a Design level practitioner doing real work, not a certified professional yet, and saying so plainly is part of protecting the standard.

##### How to sell it honestly

Lead with the credential and the dossier, then explain the badges and ranks as the trail that gets a participant there. If you flip that order and sell the stickers, you attract people who want the decoration rather than the proof, and they are the wrong people. Let the rigor of a public review standard do the persuading.

> **Say this:** The weekly badges mark real work as you go, the four ranks mark real capability, and at the top sits one verifiable, field specific credential reviewed against a public standard.

> **Do not say this:** Collect the badges and you are basically certified, and it is like a university qualification. The badges are not the credential, and this is a professional credential, never an academic one.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| Are the badges just gamification? | No. Each badge is earned by submitting that week's real deliverable, so it is shorthand for work that actually exists. |
| Is this an academic qualification? | No. It is a professional credential with a public review standard. That is its strength, and we describe it as exactly that. |
| How is this different from a generic AI certificate? | It is field specific and names your actual domain, it is reviewed against a public rubric, and it is backed by a dossier of evidence you can defend. |
| If I finish the weeks, am I certified? | Not automatically. The flagship rank requires completing Foresee together with a certified dossier, not attendance alone. |
| Can someone outside the program trust it? | Yes. It is verifiable against a public standard rather than self reported, which is exactly what makes it credible to an outsider. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The progress view shows where a participant sits right now: accepted member, a phase rank, dossier candidate, or one of the three review outcomes. Use it to describe status honestly rather than rounding up.

##### Talking points

- Two layers: small weekly badges, four phase ranks.
- A badge is shorthand for a concrete deliverable, not a decoration.
- A rank signals capability, not attendance.
- The flagship credential is verifiable, field specific, evidence based, and defensible.
- Sell the proof, not the stickers.

> **Mistakes to avoid:** letting the badges sound like the point, implying badges add up to certification, calling the rank or credential an academic qualification, describing it as a generic AI certificate, or rounding a Design level practitioner up to certified professional.

##### Summary checklist

- I can explain both recognition layers in thirty seconds.
- I can list the twelve badges in order and say what one stands for.
- I can name each phase rank, its badge name, and what it means they produced.
- I can state the four things that make the flagship credential worth holding.
- I can describe a week six participant honestly as a Design level practitioner.

##### A real scenario

A founder in week six asks you, half joking, whether he can already put certified professional on his profile. You hold the line kindly. You tell him he is a Design level practitioner right now, an AI Systems Builder who has produced a working workflow grounded in his own domain knowledge, and that the flagship rank comes only with completing Foresee and a certified dossier. He respects the honesty, and it is exactly that honesty that protects the value of the credential he is working toward.

##### How this maps to your exam

Your exam checks that you can order the first weekly badges, pair each phase with its rank and badge name, state what the flagship credential says about its holder, and avoid the two cautions: never sell the badges as the point, and never imply the credential is an academic qualification.

<a id="m6-plain"></a>
### Lesson body (plain prose / audio text)

Recognition in this program runs on two layers, and once you see the two layers, the whole thing makes sense and you can explain it to a prospect in thirty seconds. Layer one is small and frequent. Layer two is large and meaningful. Together they build toward one flagship credential.

Layer one is the twelve weekly badges, one per week. These are not participation trophies, and you should not describe them as decorations. Each badge is earned by completing and submitting that week's actual work. They exist because a twelve week program is long, and small earned wins keep a serious professional moving and give them a visible trail of progress. The twelve, in order, are TenX Mindset, AI Core, Responsible AI, Problem Framing, Context Mapper, Evidence Discipline, Workflow Designer, Responsible Solution, Adoption Designer, Value Proof, Foresight Strategist, and Capstone Review. Each one maps to a week and to a concrete deliverable, so a badge is shorthand for a piece of real work that exists.

Layer two is the four phase ranks. As each phase is completed, the participant earns a rank that signals what they can now do, not just what they attended. Completing Frame earns the rank of TenX Practitioner at Frame Level, with the badge name AI Field Analyst, and it means the participant has produced a documented, defensible use case portfolio and strategy brief. Completing Design earns TenX Practitioner at Design Level, badge name AI Systems Builder, meaning they have produced a working AI workflow grounded in domain knowledge with a documented evaluation rubric. Completing Prove earns TenX Practitioner at Proof Level, badge name AI Evidence Builder, meaning they have produced a tested, evaluated system with an evidence based value case. And completing Foresee together with a certified dossier earns the flagship rank, TenXPros Certified Professional, with the badge name AI Adoption Leader carrying their field, meaning they have built, tested, documented, and can defend a responsible AI adoption system in their domain.

The flagship credential is the thing everything points toward, and you should be able to say what makes it worth holding. It is verifiable, reviewed against a public rubric rather than self reported. It is field specific, naming the participant's actual domain rather than a generic AI certificate. It is evidence based, backed by a reviewed living dossier of real work. And it is defensible, meaning the holder can walk any stakeholder through exactly what they built, how they tested it, and what value it delivers. The difference in plain language is this. A normal certificate says this person completed a course. This credential says this person built, tested, and documented a responsible AI adoption system in their field, and it was reviewed against an explicit public standard. Those are not the same sentence, and serious people know the difference.

There is also a simple language of progress titles you can use to describe where a participant is at any moment, from accepted member before week one, through the phase ranks, to dossier candidate at submission, and finally to one of the three review outcomes. Use these to set expectations honestly. A participant in week six is a Design level practitioner doing real work, not a certified professional yet. Saying so plainly is part of protecting the standard.

Two cautions when you talk about recognition. First, never let the badges sound like the point. The point is the dossier and the credential. The badges are a motivating trail toward defensible proof, and if you sell the badges instead of the proof, you attract the wrong people. Second, never imply the rank or credential is an academic qualification. It is a professional credential with a public review standard. That is its strength. Describe it as exactly what it is and let the rigor speak.

So, the whole module in one breath. Small weekly badges mark real work. Four phase ranks mark real capability. One verifiable, field specific, defensible credential sits at the top. Sell the proof, not the stickers.


<a id="m6-ex"></a>
### Exercises (6)

**Exercise 1.** Recognition in the program runs on how many layers?

- A. One
- B. Two  **(correct)**
- C. Five
- D. Twelve

**Answer:** B. Two

**Explanation:** There are two layers, the twelve weekly badges and the four phase ranks. The number twelve is the badge count, not the layer count.

**Exercise 2.** The twelve weekly badges are best described as what?

- A. Decorations with no requirement
- B. Earned markers, each tied to completing a week's real work  **(correct)**
- C. Awards for attendance only
- D. The final credential

**Answer:** B. Earned markers, each tied to completing a week's real work

**Explanation:** Each weekly badge is earned by completing that week's work. They are not decorations, attendance awards, or the final credential.

**Exercise 3.** Completing the Design phase earns which rank?

- A. TenX Practitioner at Frame Level
- B. TenX Practitioner at Design Level  **(correct)**
- C. TenXPros Certified Professional
- D. Accepted Member

**Answer:** B. TenX Practitioner at Design Level

**Explanation:** Design completion earns TenX Practitioner at Design Level. Frame Level is for Frame, Certified Professional is the flagship, and Accepted Member is before week one.

**Exercise 4.** What earns the flagship rank of TenXPros Certified Professional?

- A. Finishing Frame only
- B. Completing Foresee together with a certified dossier  **(correct)**
- C. Attending all weeks regardless of the dossier
- D. Earning any single weekly badge

**Answer:** B. Completing Foresee together with a certified dossier

**Explanation:** The flagship rank requires completing Foresee and earning a certified dossier. Partial completion, attendance alone, or a single badge do not suffice.

**Exercise 5.** What makes the final credential credible to someone outside the program?

- A. It is self reported
- B. It is field specific and reviewed against a public rubric  **(correct)**
- C. It is a generic AI certificate
- D. It is an academic degree

**Answer:** B. It is field specific and reviewed against a public rubric

**Explanation:** The credential is field specific, verifiable, and reviewed against a public rubric. It is not self reported, generic, or an academic degree.

**Exercise 6.** What should a partner sell, the badges or the proof?

- A. The badges, since they are frequent
- B. The proof, meaning the dossier and the credential  **(correct)**
- C. The badge colors
- D. Attendance

**Answer:** B. The proof, meaning the dossier and the credential

**Explanation:** The point is the dossier and the credential. Selling the badges or attendance attracts the wrong people.

<a id="m6-exam"></a>
### Final exam pool (12)

**Exam 1.** What is the purpose of the two layer recognition system?

- A. To replace the dossier with stickers
- B. To give frequent earned wins while building toward a meaningful credential  **(correct)**
- C. To hide the review standard
- D. To reward attendance

**Answer:** B. To give frequent earned wins while building toward a meaningful credential

**Explanation:** Layer one gives frequent earned wins and layer two marks real capability, together building toward the credential. It does not replace the dossier, hide the bar, or reward attendance.

**Exam 2.** Which is the correct order of the first four weekly badges?

- A. AI Core, TenX Mindset, Problem Framing, Responsible AI
- B. TenX Mindset, AI Core, Responsible AI, Problem Framing  **(correct)**
- C. Responsible AI, Problem Framing, TenX Mindset, AI Core
- D. Problem Framing, Responsible AI, AI Core, TenX Mindset

**Answer:** B. TenX Mindset, AI Core, Responsible AI, Problem Framing

**Explanation:** The order is TenX Mindset, AI Core, Responsible AI, Problem Framing. The other sequences are scrambled.

**Exam 3.** The badge name for the Frame Level rank is which of these?

- A. AI Systems Builder
- B. AI Field Analyst  **(correct)**
- C. AI Evidence Builder
- D. AI Adoption Leader

**Answer:** B. AI Field Analyst

**Explanation:** Frame Level carries the AI Field Analyst badge. Systems Builder is Design, Evidence Builder is Proof, and Adoption Leader is the flagship.

**Exam 4.** What does the Proof Level rank mean a participant has produced?

- A. Only a strategy brief
- B. A tested, evaluated system with an evidence based value case  **(correct)**
- C. Nothing yet, it is just attendance
- D. A generic certificate

**Answer:** B. A tested, evaluated system with an evidence based value case

**Explanation:** Proof Level means a tested, evaluated system with a value case backed by evidence. It is more than a brief, more than attendance, and not a generic certificate.

**Exam 5.** Which sentence captures what the flagship credential says about its holder?

- A. This person completed a course
- B. This person built, tested, and documented a responsible AI adoption system in their field, reviewed against a public standard  **(correct)**
- C. This person attended every week
- D. This person passed a quiz

**Answer:** B. This person built, tested, and documented a responsible AI adoption system in their field, reviewed against a public standard

**Explanation:** The credential certifies built, tested, documented, and reviewed work, not mere completion, attendance, or a quiz.

**Exam 6.** Why is the credential being field specific a strength?

- A. Because it hides the participant's profession
- B. Because it names the actual domain rather than being a generic AI certificate  **(correct)**
- C. Because it makes the credential identical for everyone
- D. Because it is an academic title

**Answer:** B. Because it names the actual domain rather than being a generic AI certificate

**Explanation:** Naming the real domain makes the credential concrete and credible. It does not hide the profession, make everyone identical, or confer an academic title.

**Exam 7.** A participant is in week six. How should a partner describe their status honestly?

- A. As a certified professional
- B. As a Design level practitioner doing real work, not yet certified  **(correct)**
- C. As a graduate
- D. As an accredited expert

**Answer:** B. As a Design level practitioner doing real work, not yet certified

**Explanation:** In week six they are a Design level practitioner, not yet certified. Calling them certified, a graduate, or accredited would be false.

**Exam 8.** What is the first caution about talking up the badges?

- A. Always sell the badges first
- B. Never let the badges sound like the point, because the point is the dossier and the credential  **(correct)**
- C. Promise a badge to everyone
- D. Describe badges as accredited

**Answer:** B. Never let the badges sound like the point, because the point is the dossier and the credential

**Explanation:** The badges are a motivating trail, not the point. Selling them first, promising them, or calling them accredited all misrepresent the program.

**Exam 9.** Earning a weekly badge is shorthand for what?

- A. Showing up that week
- B. A concrete piece of real work that exists  **(correct)**
- C. Paying for that week
- D. Watching a video

**Answer:** B. A concrete piece of real work that exists

**Explanation:** Each badge maps to a concrete deliverable, so it stands for real work. It is not about showing up, paying, or watching.

**Exam 10.** Which rank and meaning pair is correct?

- A. Design Level means a documented strategy brief only
- B. Proof Level means a tested system with an evidence based value case  **(correct)**
- C. Frame Level means a fully deployed product
- D. Certified Professional means attendance was completed

**Answer:** B. Proof Level means a tested system with an evidence based value case

**Explanation:** Proof Level pairs with a tested system and value case. The other pairings overstate or understate their ranks.

**Exam 11.** What must a partner never imply about the rank or credential?

- A. That it is verifiable
- B. That it is an academic qualification  **(correct)**
- C. That it is field specific
- D. That it is reviewed

**Answer:** B. That it is an academic qualification

**Explanation:** It is a professional credential, not an academic qualification, so that must never be implied. Verifiable, field specific, and reviewed are all accurate.

**Exam 12.** How should a partner sum up recognition in the program?

- A. Sell the stickers, not the proof
- B. Small weekly badges mark real work, four ranks mark real capability, and one defensible credential sits at the top  **(correct)**
- C. Attendance earns the credential
- D. The badges are the product

**Answer:** B. Small weekly badges mark real work, four ranks mark real capability, and one defensible credential sits at the top

**Explanation:** The summary is badges for work, ranks for capability, and one credential at the top. The others invert the message or misstate it. --- ## 18.


---

<a id="m7"></a>
## Module 7: From Top Student to Coach

<a id="m7-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 7 |
| Slug | `coach` |
| Title | From Top Student to Coach |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 6 is passed (sequential gating). |

**Summary.** The path from top student to coach, and how delivery and coaching roles work inside the program.

<a id="m7-obj"></a>
### Learning objectives

- State the coach pathway in its two honest halves: real, and not guaranteed.
- Name the six stages in order and describe the bar at each one.
- Explain what earns Top Student consideration so a prospect understands how high the standard sits.
- Describe the coach screening accurately, as serious work and not a formality.
- Use the pathway to motivate ambitious professionals without ever promising a role.
- See how recommending and co delivering with your own graduates compounds your practice.

<a id="m7-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

The coach pathway is the most powerful part of your story and the easiest to ruin by overselling. Learn the line exactly: the path from top student to coach is real, and it is not a guarantee. You say both halves every single time, because one half without the other either undersells a genuine opportunity or sets someone up to feel cheated.

##### What you will be able to do

- State the coach pathway in its two honest halves: real, and not guaranteed.
- Name the six stages in order and describe the bar at each one.
- Explain what earns Top Student consideration so a prospect understands how high the standard sits.
- Describe the coach screening accurately, as serious work and not a formality.
- Use the pathway to motivate ambitious professionals without ever promising a role.
- See how recommending and co delivering with your own graduates compounds your practice.

##### What you need to understand

###### The honest framing, said in full

Becoming a TenXPros coach is not automatic, and certification does not guarantee a coaching role. Top performing participants may be invited to apply for a domain specific coach pathway if their work, judgment, communication, ethics, and professionalism meet the standard. It is selective, it is earned, and that is exactly what makes it worth aiming for. If you describe it as a real but selective door, you give an ambitious professional something genuine to reach for. If you promise the role, you break the rule against promising outcomes.

###### The six stages, each with its own bar

- **Stage one, Certified TenXPro:** the dossier met the review standard and the credential was awarded.
- **Stage two, Top Student Recognition:** reserved for an exceptional dossier with standout professionalism and review discipline. Not everyone who certifies reaches this.
- **Stage three, Coach Candidate:** a top student is invited to apply and then completes coach screening.
- **Stage four, Apprentice Domain Coach:** a focused apprenticeship shadowing reviews and coaching sessions and supporting peer review and grading.
- **Stage five, Associate TenXPros Coach:** supports participants within a defined domain.
- **Stage six, Lead Domain Coach:** leads a field, an industry, or a methodology track, with autonomous cohort management, a share of cohort fees, and advisory roles.

The pathway rises from earning a credential, to being recognized, to being trained, to supporting, to leading. It is a ladder of demonstrated capability, not a title handed out.

###### What earns Top Student consideration

The bar is specific, and you can describe it so a prospect understands it. A top student shows excellent problem framing and strong professional judgment, clear boundaries and governance with real confidentiality discipline, a high quality evaluation rubric and test set, a workflow that is actually usable, an evidence based value case, and a realistic ninety day roadmap. They also communicate well, take coaching, and can explain their work to others, because a coach has to teach, not just perform. All of those together, not one or two, is what gets someone looked at.

##### How to sell it honestly

This is detection, not persuasion. The pathway only lands with people who already operate at a level where the screening is a real ambition rather than a fantasy. If you have to talk someone into believing they could coach in their field, they almost certainly are not ready for it. Your job is to describe the door accurately and let the ambitious ones walk toward it.

> **Say this:** The coach pathway is real and it is selective. Certification does not guarantee a coaching role, but top performers may be invited to apply, complete a real screening, and earn their way up a six stage ladder. If you perform at the highest level, you could become the person who coaches others in your field.

> **Do not say this:** Finish the program and you will become a coach, or, I can get you a coaching role. That promises an outcome you do not control, breaks the rule, and sets the person up to feel cheated.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| So if I certify, I become a coach? | No. Certification is stage one. A coaching role is selective, invited, and earned through screening. Many people certify and never reach it. |
| Can you guarantee I will be invited? | No, and I will not pretend otherwise. Invitations go to exceptional dossiers with standout professionalism. I can describe the bar, but I cannot control the decision. |
| What actually gets someone considered? | Strong judgment, clear governance and confidentiality discipline, a usable workflow, an evidence based value case, a realistic roadmap, and the ability to teach the work. All of it together, not one strong piece. |
| Is the screening just a formality? | No. It includes an ethics and confidentiality interview, a sample coaching review, a dossier audit, a communication assessment, a domain expertise check, the methodology exam, and a brand and boundary agreement. |
| Why should I aim at this if it is not certain? | Because it is genuine. A real, selective door is worth more than a guaranteed title, and the work you do reaching for it strengthens your dossier either way. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The coach pathway view, showing the six stages from Certified TenXPro to Lead Domain Coach, with the bar described at each stage so a prospect can see exactly where recognition, training, supporting, and leading begin.

> **Form preview:**
> Form preview, placeholder

The coach screening checklist, listing the ethics and confidentiality interview, sample coaching review, dossier audit, communication assessment, domain expertise check, methodology exam, and brand and boundary agreement.

##### Talking points

- The pathway is a ladder of demonstrated capability, not a promotion handed out after the program.
- For a senior doctor, engineer, or educator, the bigger motivation is leading and coaching others in their own field, and that is true, so you may say it.
- The screening exists to protect the quality of coaching in every field, which is why the standard is high.
- Recommending your own graduates and co delivering future cohorts with them is how you stop trading time for single referrals.
- The best students you bring in can become co builders of your own practice.

> **Mistakes to avoid:** promising or implying a coaching role, describing the pathway as automatic after the program, naming only the top stage and skipping how it is earned, or treating the screening as a rubber stamp. Each of these breaks trust the moment reality arrives.

##### Summary checklist

- I can state both halves: the pathway is real, and it is not guaranteed.
- I can name the six stages in order and the bar at each.
- I can describe what earns Top Student consideration as a combination, not a single trait.
- I can describe the coach screening accurately as serious work.
- I can motivate an ambitious professional without ever promising a role.
- I can explain how co delivering with my own graduates compounds my practice.

##### A real scenario

You are talking with a seasoned cardiologist who is already respected by her peers and curious about leading AI use in her department. She asks, point blank, whether finishing the program makes her a coach. You answer honestly: no, certification is the first stage, and a coaching role is selective and invited, earned through a real screening. Then you describe the ladder and what gets a dossier noticed. She leans in, not because you promised anything, but because you gave her a genuine target that respects how high she already aims.

##### How this maps to your exam

Expect questions on the two halves of the honest framing, the correct order of the first three stages, what Lead Domain Coach involves, what the screening includes, and the single rule you may never break: promising a prospect they will become a coach.

<a id="m7-plain"></a>
### Lesson body (plain prose / audio text)

This is one of the most powerful parts of your story, and also the one most easily ruined by overselling. So learn the line exactly. The pathway from top student to coach is real, and it is not a guarantee. Say both halves every single time.

Here is the honest framing, word for word in spirit. Becoming a TenXPros coach is not automatic, and certification does not guarantee a coaching role. Top performing participants may be invited to apply for a domain specific coach pathway if their work, judgment, communication, ethics, and professionalism meet the standard. It is selective, it is earned, and that is exactly what makes it worth aiming for. If you promise a coaching role, you have broken the rule against promising outcomes, and you have set someone up to feel cheated. If you describe it as a real but selective door, you have given an ambitious professional something genuine to reach for.

The pathway has six stages, and each is a real step with its own bar. Stage one is Certified TenXPro, which simply means the dossier met the review standard and the credential was awarded. Stage two is Top Student Recognition, reserved for an exceptional dossier with standout professionalism and review discipline. Not everyone who certifies reaches this. Stage three is Coach Candidate, where a top student is invited to apply and then completes coach screening. Stage four is Apprentice Domain Coach, a focused apprenticeship where the candidate shadows reviews and coaching sessions and supports peer review and grading. Stage five is Associate TenXPros Coach, where they support participants within a defined domain. Stage six is Lead Domain Coach, where they lead a field, an industry, or a methodology track, with autonomous cohort management, a share of cohort fees, and advisory roles. Notice that the pathway rises from earning a credential, to being recognized, to being trained, to supporting, to leading. It is a ladder of demonstrated capability, not a title handed out.

What earns Top Student consideration is specific, and you can describe it so a prospect understands the bar. A top student shows excellent problem framing and strong professional judgment. They show clear boundaries and governance, with real confidentiality discipline. They produce a high quality evaluation rubric and test set, and a workflow that is actually usable. They build an evidence based value case and a realistic ninety day roadmap. And they communicate well, take coaching, and can explain their work to others, because a coach has to be able to teach, not just perform. All of those together, not one or two, is what gets someone looked at.

Before anyone joins as a coach, they complete a real screening, and naming it shows a prospect how serious the path is. The screening includes an ethics and confidentiality interview, a sample coaching review, a dossier quality audit, a communication assessment, a domain expertise check, the TenXPros methodology exam, and a brand and boundary agreement. This is not a formality. It is how the program protects the quality of coaching in every field.

Now why this matters for you as a partner, beyond being a nice story. When you speak to a senior doctor, a seasoned engineer, or an experienced educator, the message is not only that they can earn a credential. It is that if they perform at the highest level, they can become the person who coaches others in their field. That is a different and bigger motivation for an ambitious professional, and it is true, so you are allowed to say it. And there is a direct benefit to you. As the referring or delivering partner, you can recommend your own graduates, co deliver future cohorts with them, share delivery and coaching revenue, and build your own network of specialist coaches over time. That is how the strongest partners stop trading time for single referrals and start building something that compounds. The best students you bring in can become co builders of your own practice.

So hold the whole module in one careful breath. The coach pathway is a real, selective ladder from certified, to recognized, to trained, to supporting, to leading. You may describe it honestly and you may never promise it. Used right, it gives serious people a reason to aim high and gives you a way to grow a network instead of a list of one off deals.


<a id="m7-ex"></a>
### Exercises (6)

**Exercise 1.** What are the two halves a partner must always say about the coach pathway?

- A. It is automatic and it is fast
- B. It is real and it is not a guarantee  **(correct)**
- C. It is easy and it is cheap
- D. It is secret and it is exclusive

**Answer:** B. It is real and it is not a guarantee

**Explanation:** The honest framing is that the pathway is real but not guaranteed. Calling it automatic, easy, or secret misrepresents it.

**Exercise 2.** Stage two of the pathway is which of these?

- A. Certified TenXPro
- B. Top Student Recognition  **(correct)**
- C. Lead Domain Coach
- D. Coach Candidate

**Answer:** B. Top Student Recognition

**Explanation:** Stage two is Top Student Recognition. Certified TenXPro is stage one, Coach Candidate is stage three, and Lead Domain Coach is stage six.

**Exercise 3.** What happens at the Apprentice Domain Coach stage?

- A. The person immediately leads a cohort alone
- B. The candidate shadows reviews and coaching and supports peer review and grading  **(correct)**
- C. The person only receives a certificate
- D. Nothing, it is a title only

**Answer:** B. The candidate shadows reviews and coaching and supports peer review and grading

**Explanation:** The apprenticeship is hands on shadowing and support of review and grading. It is not solo leadership, a certificate, or an empty title.

**Exercise 4.** Which of these is part of what earns Top Student consideration?

- A. Attendance alone
- B. Strong professional judgment with clear boundaries and governance  **(correct)**
- C. Paying early
- D. Knowing the most AI tools

**Answer:** B. Strong professional judgment with clear boundaries and governance

**Explanation:** Top student consideration rests on judgment, boundaries, governance, evidence, and communication together. Attendance, early payment, and tool count are not the bar.

**Exercise 5.** Why must a coach be able to communicate and explain their work?

- A. Because a coach has to teach others, not just perform  **(correct)**
- B. Because communication replaces the dossier
- C. Because it is the only thing that matters
- D. It is not actually required

**Answer:** A. Because a coach has to teach others, not just perform

**Explanation:** Coaching means teaching, so communication is essential. It does not replace the dossier, it is not the only factor, and it is required.

**Exercise 6.** How can a partner benefit from the coach pathway directly?

- A. By promising prospects a coaching role
- B. By recommending their own graduates and co delivering future cohorts with them  **(correct)**
- C. By taking payment directly
- D. By claiming a territory verbally

**Answer:** B. By recommending their own graduates and co delivering future cohorts with them

**Explanation:** A partner can recommend graduates and co deliver with them, building a network. Promising roles, taking direct payment, and verbal territory claims are not allowed.

<a id="m7-exam"></a>
### Final exam pool (12)

**Exam 1.** A prospect asks if finishing the program guarantees a coaching role. What is the correct answer?

- A. Yes, certification leads to a coaching role
- B. No, it is a real but selective pathway that must be earned, never guaranteed  **(correct)**
- C. Yes, after ninety days
- D. Only if they pay extra

**Answer:** B. No, it is a real but selective pathway that must be earned, never guaranteed

**Explanation:** The pathway is real and selective, never guaranteed. The other answers promise a role, which breaks the rule.

**Exam 2.** Which is the correct order of the first three pathway stages?

- A. Coach Candidate, Certified TenXPro, Top Student Recognition
- B. Certified TenXPro, Top Student Recognition, Coach Candidate  **(correct)**
- C. Top Student Recognition, Coach Candidate, Certified TenXPro
- D. Certified TenXPro, Coach Candidate, Top Student Recognition

**Answer:** B. Certified TenXPro, Top Student Recognition, Coach Candidate

**Explanation:** The order is Certified TenXPro, then Top Student Recognition, then Coach Candidate. The other sequences are out of order.

**Exam 3.** What does the highest stage, Lead Domain Coach, involve?

- A. Only shadowing others
- B. Leading a field or track with autonomous cohort management, a share of cohort fees, and advisory roles  **(correct)**
- C. A certificate with no responsibility
- D. Supporting a single participant

**Answer:** B. Leading a field or track with autonomous cohort management, a share of cohort fees, and advisory roles

**Explanation:** Lead Domain Coach leads a track with autonomy, fee share, and advisory roles. Shadowing and single participant support are earlier stages.

**Exam 4.** Reaching Top Student Recognition requires which of these?

- A. Any certified dossier
- B. An exceptional dossier with standout professionalism and review discipline  **(correct)**
- C. Simply finishing the program
- D. The most attendance

**Answer:** B. An exceptional dossier with standout professionalism and review discipline

**Explanation:** Top Student Recognition is for exceptional work and professionalism, not any certification, mere completion, or attendance.

**Exam 5.** The coach screening includes which of the following?

- A. A discount negotiation
- B. An ethics and confidentiality interview and a sample coaching review  **(correct)**
- C. A payment to the partner
- D. A territory claim

**Answer:** B. An ethics and confidentiality interview and a sample coaching review

**Explanation:** Screening includes ethics and confidentiality interviews, a sample coaching review, a methodology exam, and more. Discounts, partner payments, and territory claims are not part of it.

**Exam 6.** The coach pathway as a whole is best described as which of these?

- A. A title handed to everyone who certifies
- B. A ladder of demonstrated capability from certified, to recognized, to trained, to supporting, to leading  **(correct)**
- C. An automatic promotion after the program
- D. A purchase

**Answer:** B. A ladder of demonstrated capability from certified, to recognized, to trained, to supporting, to leading

**Explanation:** It is a ladder of demonstrated capability. It is not handed out, automatic, or purchased.

**Exam 7.** Why is the coach pathway a strong motivation for an ambitious professional?

- A. Because it is guaranteed
- B. Because performing at the highest level can let them become the person who coaches others in their field  **(correct)**
- C. Because it requires no work
- D. Because it is hidden from others

**Answer:** B. Because performing at the highest level can let them become the person who coaches others in their field

**Explanation:** The motivation is the real chance to lead and coach in one's field through high performance. It is not guaranteed, effortless, or secret.

**Exam 8.** How does the coach pathway help a partner build something that compounds?

- A. By collecting one off referrals only
- B. By turning the best graduates into co builders and co deliverers of future cohorts  **(correct)**
- C. By promising roles to everyone
- D. By taking direct payments

**Answer:** B. By turning the best graduates into co builders and co deliverers of future cohorts

**Explanation:** Partners grow by turning top graduates into co builders, moving beyond one off deals. Promises and direct payments are prohibited and do not compound.

**Exam 9.** Which single factor is enough on its own for Top Student consideration?

- A. Excellent problem framing alone
- B. None alone, the factors must come together  **(correct)**
- C. Confidentiality discipline alone
- D. A realistic roadmap alone

**Answer:** B. None alone, the factors must come together

**Explanation:** The bar is the factors together, not any one of them in isolation. The lesson is explicit that one or two is not enough.

**Exam 10.** What may a partner never do regarding the coach pathway?

- A. Describe it honestly as selective
- B. Promise a prospect they will become a coach  **(correct)**
- C. Name the screening steps
- D. Explain the six stages

**Answer:** B. Promise a prospect they will become a coach

**Explanation:** Promising a coaching role is prohibited. Describing it honestly, naming the screening, and explaining the stages are all fine.

**Exam 11.** At the Associate TenXPros Coach stage, what does the person do?

- A. Lead an entire field alone
- B. Support participants within a defined domain  **(correct)**
- C. Only observe
- D. Receive a title with no role

**Answer:** B. Support participants within a defined domain

**Explanation:** An Associate Coach supports participants in a defined domain. Leading a field is the next stage, and observing or empty titles are not this stage.

**Exam 12.** The module in one careful breath is which of these?

- A. The coaching role is promised to all graduates
- B. The coach pathway is a real, selective ladder you may describe honestly and never promise  **(correct)**
- C. Coaching is bought
- D. Certification automatically makes someone a coach

**Answer:** B. The coach pathway is a real, selective ladder you may describe honestly and never promise

**Explanation:** The one line is a real, selective ladder, described honestly and never promised. The others overstate or misstate the pathway. --- ## 19.


---

<a id="m8"></a>
## Module 8: Selling With Integrity

<a id="m8-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 8 |
| Slug | `selling` |
| Title | Selling With Integrity |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 7 is passed (sequential gating). |

**Summary.** Selling with integrity: qualifying honestly, never overpromising, and matching the program only to people it fits.

<a id="m8-obj"></a>
### Learning objectives

- Open a first conversation with the person and their real challenge, not a pitch.
- Match a field story to the prospect so the program becomes real in their mind.
- Deliver a clean sixty to ninety second mini pitch with no hype.
- Answer the standard objections honestly, in a way that is also persuasive.
- Route the prospect to apply first and pay only after acceptance.
- Run every sentence through the truth test before you say it.

<a id="m8-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

Selling with integrity is not a softer way to sell. It is a sharper one. When you qualify honestly and turn away the people the program does not fit, the people you do bring in actually belong, and they remember who opened the door. Your job here is detection, not persuasion. If you have to convince someone the program is for them, it usually is not.

##### What you will be able to do

- Open a first conversation with the person and their real challenge, not a pitch.
- Match a field story to the prospect so the program becomes real in their mind.
- Deliver a clean sixty to ninety second mini pitch with no hype.
- Answer the standard objections honestly, in a way that is also persuasive.
- Route the prospect to apply first and pay only after acceptance.
- Run every sentence through the truth test before you say it.

##### What you need to understand

###### Start with the person, not the program

Do not open by describing TenXPros. Open with one question: what is the biggest challenge you are facing right now around AI in your work. Then listen. Most professionals give one of three answers, and all three are perfect entry points: I do not know where to start, or, I have tried some tools but nothing feels systematic, or, I am worried about falling behind but I am not sure what to do. Each points straight at what the program addresses, so now you are responding to a real situation instead of reciting at someone.

###### Match the example to the person

This is where the Field Journey Explorer earns its place. Talking to a doctor, walk them through the radiologist's twelve weeks. A lawyer, the legal counsel's. An engineer, the civil engineer's. A finance leader, marketer, educator, product manager, clinic operations manager, or consultant each has a field story that shows what the weeks produce and what they would walk away holding. The story makes the program real, and real beats impressive every time.

###### The mini pitch, sixty to ninety seconds

Have it ready so you can say it in your sleep: TenXPros is a selective twelve week certification for experienced professionals who want to lead AI adoption in their field, not just use AI tools. You bring one real professional problem. The program gives you a structured method, Frame, Design, Prove, Foresee, to decide where AI belongs, design a responsible workflow, test value and risk, and assemble the work into a reviewed Living AI Solution Dossier. The credential is earned through reviewed evidence, not attendance. If your dossier meets the public standard, you earn a verifiable certified credential. That is the whole thing, said straight.

###### Detection beats persuasion

The program multiplies a method onto expertise the person already has. Ten times zero is still zero, so the input has to be real. A professional with a real problem and the judgment to defend their work is someone you detect, not someone you talk into it. If you find yourself working hard to convince a prospect they belong, treat that effort as a signal that they probably do not.

##### How to sell it honestly

Every honest answer is also persuasive, because it respects the intelligence of the person asking. You never trade accuracy for a close. The structure of the program, apply first and pay only after acceptance, does your qualifying for you and takes the pressure out of the whole conversation.

> **Say this:** What is the biggest challenge you are facing right now around AI in your work? Tell me where you are stuck, and I will tell you honestly whether this program is built for that, or whether it is not the right fit.

> **Do not say this:** This will make you certified and ten times more valuable, trust me. That promises an outcome you do not control, replaces the reviewed standard with hype, and breaks the truth test on the first sentence.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| Is this just another AI course? | No. Generic courses teach tools and prompts. This is built around one real problem and a reviewed dossier, so the outcome is evidence you can defend, not a completion certificate. |
| Is it accredited? | No. It is a private professional certification, not a university degree or academic accreditation. Its credibility comes from the reviewed dossier, the public criteria, and the verifiable credential. |
| Do I need to code? | No. It is built for experienced professionals across fields. The core requirement is professional judgment, not coding. |
| Will I definitely get certified? | No. Certification depends on whether the dossier meets the review standard. The three outcomes are Certified, Strong Draft, and Completed. |
| Can a regulated professional join? | Yes, but they must protect confidential and regulated data and use redacted or fictionalized examples unless they have the rights and safeguards to use real data. |
| What do I actually leave with? | Eight connected assets assembled into a Living AI Solution Dossier, a ninety day adoption roadmap, and, if the dossier meets the standard, a verifiable credential. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The Field Journey Explorer, where you pick the prospect's field and walk through that profession's twelve weeks, showing what each phase produces and what they hold at the end.

> **Form preview:**
> Form preview, placeholder

The application screen, the first quality gate, where the professional describes their expertise and the challenge they want to explore. Payment happens only after acceptance, never before.

##### Talking points

- Open with the person, listen first, and respond to their real situation.
- Use a matched field story to make the program concrete, because real beats impressive.
- Keep the mini pitch to sixty to ninety seconds with no hype.
- Say plainly that no one pays before being accepted, which removes the pressure to sell payment first.
- The acceptance step signals the program is serious and only admits people who are genuinely ready.
- Graduates who earn a field specific credential remember who opened the door, and that builds your reputation for years.

> **Mistakes to avoid:** opening by reciting the program, leading with price, promising certification, inflating a private certification into an accreditation or degree, pushing someone toward payment before acceptance, or selling to a poor fit just to close. Each one fails the truth test and costs you the long game.

##### Summary checklist

- I can open with a question about the person's real AI challenge and then listen.
- I can match a field story to the prospect in front of me.
- I can deliver the mini pitch in sixty to ninety seconds with no hype.
- I can answer the six standard objections honestly and accurately.
- I can route the prospect to apply first and pay only after acceptance.
- I can run every sentence through: is it true, can I back it up, does it avoid promising what I cannot control, does it route money and data correctly.

##### A real scenario

You are sitting with a hospital finance leader who says she has tried a few AI tools but nothing feels systematic. You do not pitch. You ask what decision she is trying to make better, listen, then walk her through a finance field journey so she can see what twelve weeks would produce. She asks if it is accredited. You say no, it is a private professional certification whose credibility is the reviewed dossier and public criteria, and you watch her trust go up, not down, because you told her the truth. You point her to apply, and you mention that she pays nothing until she is accepted.

##### How this maps to your exam

Expect questions on why you open with the person rather than the program, the three common opening answers, the honest replies to is this just another AI course, is it accredited, do I need to code, and will I definitely get certified, when payment happens, and the four part truth test every sentence must pass.

<a id="m8-plain"></a>
### Lesson body (plain prose / audio text)

You know the mission, the rules, the product, the journey, the recognition, and the coach pathway. This module turns all of it into a real conversation that converts the right people and honestly turns away the wrong ones. Selling with integrity is not a softer way to sell. It is a sharper one, because the people you bring in actually belong, and they remember who opened the door.

Start the first conversation with the person, not the program. Do not open by describing TenXPros. Open with one question. What is the biggest challenge you are facing right now around AI in your work. Then listen. Most professionals give you one of three answers, and all three are perfect entry points. They say, I do not know where to start. Or they say, I have tried some tools but nothing feels systematic. Or they say, I am worried about falling behind but I am not sure what to do. Each of those points straight at what the program addresses, and now you are responding to their real situation instead of reciting a pitch at them.

Then match the example to the person. This is where the Field Journey Explorer earns its place. If you are talking to a doctor, walk them through the radiologist's twelve weeks. A lawyer, the legal counsel's. An engineer, the civil engineer's. A finance leader, a marketer, an educator, a product manager, a clinic operations manager, a consultant, each has a field story that shows exactly what the weeks produce and what they would walk away holding. The story makes the program real in their mind, and real beats impressive every time.

Have a clean mini pitch ready, sixty to ninety seconds, no hype, that you can say in your sleep. Something like this. TenXPros is a selective twelve week certification for experienced professionals who want to lead AI adoption in their field, not just use AI tools. You bring one real professional problem. The program gives you a structured method, Frame, Design, Prove, Foresee, to decide where AI belongs, design a responsible workflow, test value and risk, and assemble the work into a reviewed Living AI Solution Dossier. The credential is earned through reviewed evidence, not attendance. If your dossier meets the public standard, you earn a verifiable certified credential. That is the whole thing, said straight.

You will hear the same objections, so be ready with honest answers. Is this just another AI course. No, generic AI courses teach tools and prompts, while this is built around one real problem and a reviewed dossier, so the outcome is evidence you can defend, not a completion certificate. Is it accredited. No, it is a private professional certification, not a university degree or academic accreditation, and its credibility comes from the reviewed dossier, the public criteria, and the verifiable credential. Do participants need to code. No, it is built for experienced professionals across fields, and the core requirement is professional judgment, not coding. Will I definitely get certified. No, certification depends on whether the dossier meets the review standard, and the three outcomes are Certified, Strong Draft, and Completed. Can regulated professionals join. Yes, but they must protect confidential and regulated data, and the program expects redacted or fictionalized examples unless they have the rights and safeguards to use real data. What do participants actually leave with. Eight connected assets assembled into a Living AI Solution Dossier, plus a ninety day adoption roadmap, and if the dossier meets the standard, a verifiable credential. Notice that every honest answer is also persuasive, because it respects the intelligence of the person asking.

Then point them to the real next step. Interested professionals apply at the site. The application is the first quality gate, where they describe their expertise and the challenge they want to explore, and payment happens only after acceptance. Say this plainly, because it takes the pressure out of the whole conversation. You never have to sell anyone into paying before they are accepted. The acceptance step itself signals that the program is serious. And only people who are genuinely ready get in. That structure does your qualifying for you.

Finally, think past the single deal. As your referrals complete the program and earn their credentials, they become advocates for you. The professional who earns a field specific credential remembers who opened the door. That referral becomes a relationship, and the relationship builds your reputation as someone who opens doors, not someone who sells programs. This is the long game, and it is the one worth playing. Bring in people who belong, tell them the truth, and let the rigor of the program make you look good for years.

One last reminder that ties the whole Academy together. Everything you say should pass the same test from the identity module. Is it true. Can you back it up. Does it avoid promising what you cannot control. Does it route money and data correctly. Selling with integrity is just that test, applied out loud, in front of a real person, every time.


<a id="m8-ex"></a>
### Exercises (6)

**Exercise 1.** How should a partner open the first conversation?

- A. By describing TenXPros in detail
- B. By asking about the person's biggest AI challenge in their work, then listening  **(correct)**
- C. By quoting the price
- D. By promising results

**Answer:** B. By asking about the person's biggest AI challenge in their work, then listening

**Explanation:** Open with the person and their challenge, then listen. Leading with a description, price, or promises is the wrong start.

**Exercise 2.** A prospect says, I have tried some tools but nothing feels systematic. This is best treated as what?

- A. A reason to end the conversation
- B. A perfect entry point that the program directly addresses  **(correct)**
- C. A signal to promise certification
- D. An accreditation question

**Answer:** B. A perfect entry point that the program directly addresses

**Explanation:** It is one of the three classic openings the program is built to answer. It is not a reason to quit, promise, or pivot to accreditation.

**Exercise 3.** What is the right length and tone for the mini pitch?

- A. Ten minutes of detail
- B. Sixty to ninety seconds, no hype  **(correct)**
- C. A single sentence about price
- D. As long as possible

**Answer:** B. Sixty to ninety seconds, no hype

**Explanation:** The mini pitch is sixty to ninety seconds with no hype. It is not ten minutes, a price line, or open ended.

**Exercise 4.** A prospect asks if the program is accredited. The honest answer is which of these?

- A. Yes, it is a university qualification
- B. No, it is a private professional certification whose credibility comes from the reviewed dossier and public criteria  **(correct)**
- C. Yes, it is academically accredited
- D. It is the same as a degree

**Answer:** B. No, it is a private professional certification whose credibility comes from the reviewed dossier and public criteria

**Explanation:** It is a private professional certification, not accreditation or a degree, and its credibility is the reviewed dossier and public criteria.

**Exercise 5.** When does a prospect pay?

- A. Before applying
- B. Only after acceptance  **(correct)**
- C. Directly to the partner
- D. Never

**Answer:** B. Only after acceptance

**Explanation:** Payment happens only after acceptance, through official channels. It is not before applying, to the partner, or never.

**Exercise 6.** What is the long game for a partner?

- A. Maximize one off referrals by any means
- B. Bring in people who belong, tell the truth, and build a reputation as someone who opens doors  **(correct)**
- C. Promise outcomes to close fast
- D. Sell the badges

**Answer:** B. Bring in people who belong, tell the truth, and build a reputation as someone who opens doors

**Explanation:** The long game is honest qualification and reputation built on rigor. Volume by any means, promises, and selling badges are not it.

<a id="m8-exam"></a>
### Final exam pool (12)

**Exam 1.** Why open with the person rather than the program?

- A. Because it wastes less of the partner's time
- B. Because responding to their real situation beats reciting a pitch  **(correct)**
- C. Because it lets the partner avoid the rules
- D. Because the program is secret

**Answer:** B. Because responding to their real situation beats reciting a pitch

**Explanation:** Starting with the person lets you respond to their real situation, which is more effective than a recited pitch. It is not about saving time, dodging rules, or secrecy.

**Exam 2.** Which of these is one of the three common opening answers from prospects?

- A. I already lead AI adoption perfectly
- B. I am worried about falling behind but I am not sure what to do  **(correct)**
- C. I never use AI and never will
- D. I only want a discount

**Answer:** B. I am worried about falling behind but I am not sure what to do

**Explanation:** Worry about falling behind is one of the three classic openings. The others are not the entry points the lesson describes.

**Exam 3.** What is the purpose of matching a field story to the prospect?

- A. To make the program impressive
- B. To make the program real in their mind, which beats impressive  **(correct)**
- C. To avoid talking about boundaries
- D. To promise the example results

**Answer:** B. To make the program real in their mind, which beats impressive

**Explanation:** A matched field story makes the program real, and real beats impressive. It is not about being impressive, hiding boundaries, or promising results.

**Exam 4.** A prospect asks, is this just another AI course. The honest answer is which of these?

- A. Yes, it is the same as other courses
- B. No, it is built around one real problem and a reviewed dossier, so the outcome is defensible evidence  **(correct)**
- C. Yes, but cheaper
- D. No, it is an accredited degree

**Answer:** B. No, it is built around one real problem and a reviewed dossier, so the outcome is defensible evidence

**Explanation:** It differs because it produces a reviewed dossier and defensible evidence. It is not the same as other courses, a cheaper version, or a degree.

**Exam 5.** A prospect asks if they need to code. The correct answer is which of these?

- A. Yes, coding is required
- B. No, the core requirement is professional judgment, not coding  **(correct)**
- C. Only for engineers
- D. Coding replaces the dossier

**Answer:** B. No, the core requirement is professional judgment, not coding

**Explanation:** The program needs professional judgment, not coding. Coding is not required, not engineer only here, and does not replace the dossier.

**Exam 6.** How should a partner answer, will I definitely get certified?

- A. Yes, everyone certifies
- B. No, certification depends on whether the dossier meets the standard, and there are three outcomes  **(correct)**
- C. Yes, after attendance
- D. Only if they pay more

**Answer:** B. No, certification depends on whether the dossier meets the standard, and there are three outcomes

**Explanation:** Certification depends on the reviewed dossier, with three possible outcomes. It is not guaranteed by everyone, attendance, or extra payment.

**Exam 7.** How can a regulated professional participate safely?

- A. By uploading any confidential data freely
- B. By protecting confidential data and using redacted or fictionalized examples unless they have rights and safeguards  **(correct)**
- C. By ignoring confidentiality
- D. They cannot participate at all

**Answer:** B. By protecting confidential data and using redacted or fictionalized examples unless they have rights and safeguards

**Explanation:** Regulated professionals can join if they protect data and use redacted or fictionalized examples without proper rights. Free upload or ignoring confidentiality is wrong, and they are not excluded.

**Exam 8.** Why does the application before payment structure reduce pressure?

- A. Because the partner can promise acceptance
- B. Because no one pays before being accepted, so the partner never sells someone into paying first  **(correct)**
- C. Because it hides the price
- D. Because it removes the review

**Answer:** B. Because no one pays before being accepted, so the partner never sells someone into paying first

**Explanation:** Payment only after acceptance means the partner never pushes payment first, which removes pressure. It does not let the partner promise acceptance, hide price, or remove review.

**Exam 9.** What does the acceptance step do for the partner's qualifying job?

- A. Nothing, the partner must still pressure prospects
- B. It does much of the qualifying, since only genuinely ready people get in  **(correct)**
- C. It guarantees everyone is accepted
- D. It lets the partner skip honesty

**Answer:** B. It does much of the qualifying, since only genuinely ready people get in

**Explanation:** Acceptance filters for readiness, doing much of the qualifying. It does not require pressure, accept everyone, or excuse dishonesty.

**Exam 10.** What is the reputational payoff of selling with integrity?

- A. A long list of one off deals
- B. Becoming known as someone who opens doors, not someone who sells programs  **(correct)**
- C. Faster closes through promises
- D. More badges sold

**Answer:** B. Becoming known as someone who opens doors, not someone who sells programs

**Explanation:** Integrity builds a reputation as a door opener, which compounds. It is not about one off deals, promise driven closes, or badges.

**Exam 11.** Every sentence a partner says should pass which test?

- A. Does it sound impressive
- B. Is it true, can you back it up, does it avoid promising what you cannot control, and does it route money and data correctly  **(correct)**
- C. Does it create urgency
- D. Does it hide the standard

**Answer:** B. Is it true, can you back it up, does it avoid promising what you cannot control, and does it route money and data correctly

**Explanation:** The test is truth, backing, no uncontrollable promises, and correct money and data routing. Sounding impressive, creating urgency, or hiding the standard are not the test.

**Exam 12.** Selling with integrity is best understood as which of these?

- A. A softer, weaker way to sell
- B. A sharper way to sell, because the people brought in actually belong and remember who opened the door  **(correct)**
- C. Avoiding selling entirely
- D. Selling on price alone

**Answer:** B. A sharper way to sell, because the people brought in actually belong and remember who opened the door

**Explanation:** Integrity is sharper, not softer, because it brings in people who belong and builds lasting trust. It is not weakness, avoidance, or price selling. --- ## 20.


---

<a id="m9"></a>
## Module 9: Finding and Qualifying the Right Prospects

<a id="m9-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 9 |
| Slug | `prospecting` |
| Title | Finding and Qualifying the Right Prospects |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 8 is passed (sequential gating). |

**Summary.** Finding and qualifying the right prospect, and recognizing who the program is not for.

<a id="m9-obj"></a>
### Learning objectives

- Find prospects in your own trusted network first, where the right people usually are.
- Tell a strong fit from a poor fit quickly and honestly.
- Build a short, specific, real target list with a route in for each entry.
- Register an opportunity before substantive contact and pursue only after confirmation.
- Recognize the red flags that mean slow down or walk away.

<a id="m9-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

Nothing you have learned earns anything until you are talking to the right people. Prospecting is where you find them and tell quickly whether someone belongs. Your job is detection, not persuasion. The program multiplies a method onto real expertise, and ten times zero is still zero, so a prospect with no real field to work from is not a hard sell, they are a poor fit you decline.

##### What you will be able to do

- Find prospects in your own trusted network first, where the right people usually are.
- Tell a strong fit from a poor fit quickly and honestly.
- Build a short, specific, real target list with a route in for each entry.
- Register an opportunity before substantive contact and pursue only after confirmation.
- Recognize the red flags that mean slow down or walk away.

##### What you need to understand

###### Where the right prospects actually are

They are almost always closer than you think. Your strongest source is your own existing network: former colleagues, current clients, people you have worked with or taught or advised, the professionals who already trust your judgment. A warm introduction from someone who respects you outperforms a hundred cold messages, every time. Your second source is referrals: a happy participant, a peer who knows what you do, or a contact who cannot join but knows three people who should. Your third source is the professional circles you already belong to: industry groups, alumni networks, communities of practice, and events where serious people in a field gather. What you never do is buy a list, scrape a list, or blast strangers, because that is prohibited, it damages the brand, and it brings you exactly the wrong people.

###### Who actually fits, and who does not

The program is selective and your job is to match, not to push. A strong fit is an experienced professional with real depth in their field, who already uses AI in some form and feels the gap between using it and leading it, who has one real problem worth solving, who can commit focused hours over twelve weeks, and who wants reviewed, defensible work they can show. A poor fit is an absolute beginner with no domain to work from, someone hunting a quick certificate with no interest in the work, someone who cannot give the time, or someone who wants a guaranteed job or outcome you cannot promise. When you see a poor fit, the honest move is to say so kindly and not enroll them. That protects the prospect, the standard, and your own name.

###### The list, and registering before you pursue

A good list is short, specific, and real. For each entry you should be able to name the actual person or organization, why they fit, and your concrete route in, meaning a warm contact, a shared circle, or a real reason you are positioned to reach them. Three real, well chosen prospects beat thirty names you cannot reach. And the discipline from the rules holds: you register an opportunity on the Partner Panel before substantive contact, and it is protected only when the company confirms it. So you find a real fit, you register it, you get confirmation, then you pursue.

##### How to sell it honestly

Honest prospecting is qualification, not pressure. The single most useful test is the one sentence screen: does this person have a real problem in their own field that they could spend twelve weeks proving an AI approach against, and does the result have to pass the judgment of someone who matters to them. If the answer is yes to both, they are a Pro and worth your time. If you find yourself working to convince someone that they fit, that effort is itself the answer.

> **Say this:** Who in your field already has a real problem worth twelve weeks of work and would value reviewed, defensible evidence? If that is you, let us talk. If it is not quite you yet, I would rather tell you straight than enroll you into something that is not the right fit.

> **Do not say this:** I can guarantee you will pass and probably get hired after, just send me a deposit to hold your spot. That promises an outcome you do not control and routes money off the official channel, which are both hard rule breaks.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| Can you promise I will be certified? | No. Certification is earned through review and can never be promised. I can describe the standard, but I will not pretend the outcome is mine to give. |
| I am new to my field, can I still join? | Honestly, this is built to multiply a method onto expertise you already have. Without a real field and problem to work from, it is not the right fit yet, and I will not enroll you into that. |
| Can I just pay you directly to get started faster? | No. Payment goes through the official channel only, and it happens after acceptance. There is no faster path that bends that rule. |
| I will send over our confidential data so you can set things up. | Please do not. That data needs the right rights and safeguards before it goes anywhere near the program. We stop here and protect everyone. |
| Can you guarantee I will get a job out of this? | No. The program produces reviewed, defensible work and a credential if the standard is met. It does not promise employment, and I will not either. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The Partner Panel opportunity registration, where you record a prospect before substantive contact. The opportunity is protected only once the company confirms it, so you register first, then pursue.

> **Form preview:**
> Form preview, placeholder

A simple target list view, one row per prospect, showing the named person or organization, why they fit, and your concrete route in. Short and real beats long and unreachable.

##### Talking points

- The right prospects are usually in your trusted network, not on a purchased list.
- A warm introduction from someone who respects you beats a hundred cold messages.
- A strong fit has real expertise, the using versus leading gap, one real problem, and real time.
- Declining a poor fit kindly protects the prospect, the standard, and your name.
- Three real, reachable prospects beat thirty names you cannot reach.
- Register on the Partner Panel before substantive contact, and pursue only after confirmation.

> **Mistakes to avoid:** buying or scraping a list, blasting strangers, padding a list with unreachable names, enrolling a poor fit to hit a number, promising certification or income, taking off channel payment, or accepting confidential data without rights and safeguards. Each one breaks a rule or wastes the time you should spend on real fits.

##### Summary checklist

- I look first in my own network and warm circles, never a bought list.
- I can tell a strong fit from a poor fit using the one sentence screen.
- I decline poor fits kindly instead of enrolling them.
- My list is short, specific, real, and has a route in for each entry.
- I register before substantive contact and pursue only after confirmation.
- I treat promise demands, off channel payment, and confidential data as red flags.

##### A real scenario

A former colleague, now a senior civil engineer running a mid size firm, mentions over coffee that leadership keeps asking what their AI plan is. That is a real problem in a real field, with judgment that matters to people who matter to him. You note him on your target list with the reason he fits and your route in, which is the relationship you already have. You register the opportunity on the Partner Panel before you pursue it. When his junior colleague later asks you to guarantee a certificate for a quick resume boost, you recognize the poor fit and decline kindly, which keeps your name clean with both of them.

##### How this maps to your exam

Expect questions on why warm introductions beat cold outreach, why bought and scraped lists are prohibited, what makes a strong versus poor fit, what a good target list entry contains, the register before you pursue discipline, and the red flags of promised outcomes, off channel payment, and confidential data.

<a id="m9-plain"></a>
### Lesson body (plain prose / audio text)

You now know the program, the rules, and how to talk about it. None of that earns you anything until you are talking to the right people. This module is about where those people come from and how to tell quickly whether someone belongs, so you spend your time on prospects who can actually close and protect the standard by turning away the ones who do not fit.

Start with where the right prospects actually are, because the honest answer is that they are almost always closer than you think. Your strongest source is your own existing network: former colleagues, current clients, people you have worked with or taught or advised, and the professionals who already trust your judgment. A warm introduction from someone who respects you outperforms a hundred cold messages, every time. Your second source is referrals: a happy participant, a peer who knows what you do, or a contact who cannot join but knows three people who should. Your third source is the professional circles you already belong to: industry groups, alumni networks, communities of practice, and events where serious people in a field gather. What you never do is buy a list, scrape a list, or blast strangers. That is prohibited by the rules, it damages the brand, and it brings you exactly the wrong people.

Before you reach out to anyone, get clear on who actually fits, because the program is selective and your job is to match, not to push. A strong fit is an experienced professional with real depth in their field, someone who already uses AI in some form and feels the gap between using it and leading it, who has one real problem worth solving, who can commit focused hours over twelve weeks, and who wants reviewed, defensible work they can show. A poor fit is an absolute beginner with no domain to work from, someone hunting a quick certificate with no interest in the work, someone who cannot give the time, or someone who wants a guaranteed job or outcome you cannot promise. When you see a poor fit, the honest move is to say so kindly and not enroll them. That protects the prospect, the standard, and your own name.

Build your target list with that profile in mind. A good list is short, specific, and real. For each entry you should be able to name the actual person or organization, why they fit, and your concrete route in, meaning a warm contact, a shared circle, or a real reason you are positioned to reach them. Three real, well chosen prospects beat thirty names you cannot actually reach. And remember the discipline from the rules: you register an opportunity on the Partner Panel before substantive contact, and it is protected only when the company confirms it. So your prospecting and your registration move together. You find a real fit, you register it, you get confirmation, then you pursue.

Watch for the red flags that tell you to slow down or step back. A prospect who wants you to promise certification or income is someone you cannot honestly serve, so reset their expectations or walk away. A prospect who pushes you to take payment off the official channel is a hard no. A prospect who wants to hand you confidential or regulated data to get started is a signal to stop and protect everyone, because that data does not belong in the program without the right rights and safeguards. None of these are deals worth bending a rule for.

Hold the whole module in one line. The right prospects are usually in your own trusted network, a strong fit is an experienced professional with a real problem and real time, you qualify honestly and turn away poor fits, and you register before you pursue. Do that and every conversation you have is with someone who could actually belong.


<a id="m9-ex"></a>
### Exercises (6)

**Exercise 1.** What is the strongest source of good prospects?

- A. A purchased list of strangers
- B. Your own existing network and warm introductions  **(correct)**
- C. Mass cold messaging
- D. Random social media outreach

**Answer:** B. Your own existing network and warm introductions

**Explanation:** Warm introductions from people who trust you outperform cold approaches. Bought lists and mass cold messaging are both prohibited and ineffective.

**Exercise 2.** Which prospecting method is prohibited?

- A. Asking a happy contact for a referral
- B. Reaching someone in a shared professional circle
- C. Buying or scraping a contact list  **(correct)**
- D. Following up with a warm introduction

**Answer:** C. Buying or scraping a contact list

**Explanation:** Buying or scraping lists is prohibited and brings the wrong people. Referrals, shared circles, and warm follow ups are all legitimate.

**Exercise 3.** Which describes a strong fit prospect?

- A. An absolute beginner with no domain expertise
- B. An experienced professional with a real problem and time to commit  **(correct)**
- C. Someone who wants a quick certificate with no interest in the work
- D. Someone demanding a guaranteed job

**Answer:** B. An experienced professional with a real problem and time to commit

**Explanation:** A strong fit has real expertise, a real problem, and time. Beginners, certificate hunters, and guarantee seekers are poor fits.

**Exercise 4.** You meet a clear poor fit. What is the honest move?

- A. Enroll them anyway to hit a number
- B. Promise them results so they feel ready
- C. Say so kindly and do not enroll them  **(correct)**
- D. Hide the work involved so it sounds easier

**Answer:** C. Say so kindly and do not enroll them

**Explanation:** Honesty protects the prospect, the standard, and your name. Enrolling a poor fit, promising results, or hiding the work all violate the partner posture.

**Exercise 5.** What should a good target list entry include?

- A. Just a name
- B. The named person or organization, why they fit, and your concrete route in  **(correct)**
- C. A purchased email address
- D. A guess about their budget

**Answer:** B. The named person or organization, why they fit, and your concrete route in

**Explanation:** A real entry names the person or organization, the fit, and a concrete route in. A bare name, a bought address, or a guess is not a real prospect.

**Exercise 6.** When do you register an opportunity relative to contacting the prospect?

- A. After the deal closes
- B. Before substantive contact, and it is protected only on Panel confirmation  **(correct)**
- C. Whenever you remember
- D. Only if a competitor appears

**Answer:** B. Before substantive contact, and it is protected only on Panel confirmation

**Explanation:** You register before substantive contact, and protection comes only with Panel confirmation. Registering after closing, at random, or only under threat all break the discipline.

<a id="m9-exam"></a>
### Final exam pool (12)

**Exam 1.** Why does a warm introduction outperform cold outreach?

- A. Because it is faster to send
- B. Because it comes from someone the prospect already trusts, which opens the door  **(correct)**
- C. Because it lets you skip qualification
- D. Because it allows promising outcomes

**Answer:** B. Because it comes from someone the prospect already trusts, which opens the door

**Explanation:** Trust carried by the introducer opens the conversation. It is not about speed, skipping qualification, or making promises.

**Exam 2.** A partner wants more volume and considers a bought list. What is correct?

- A. Bought lists are fine for relevant leads
- B. Bought, scraped, and spam approaches are prohibited and bring the wrong people  **(correct)**
- C. Scraped lists are allowed if small
- D. It is acceptable during the pilot

**Answer:** B. Bought, scraped, and spam approaches are prohibited and bring the wrong people

**Explanation:** Bought, scraped, and spam outreach are all prohibited with no exception for relevance, size, or timing.

**Exam 3.** Which of these is a poor fit, and what should the partner do?

- A. An experienced professional with a real problem, so enroll them
- B. A beginner with no domain who wants a guaranteed job, so honestly decline  **(correct)**
- C. A senior operator with time, so decline
- D. A consultant with a real challenge, so decline

**Answer:** B. A beginner with no domain who wants a guaranteed job, so honestly decline

**Explanation:** The beginner seeking a guarantee is the poor fit, and the honest move is to decline kindly. The others are strong fits who should be welcomed, not declined.

**Exam 4.** Three real, reachable prospects versus thirty names you cannot reach. Which is better and why?

- A. Thirty names, because more is always better
- B. Three real prospects, because quality and a real route in beat volume  **(correct)**
- C. Thirty names, because it looks busier
- D. They are equal

**Answer:** B. Three real prospects, because quality and a real route in beat volume

**Explanation:** A short list of reachable, well qualified prospects beats a long list of unreachable names. Volume for its own sake is not the goal.

**Exam 5.** A prospect asks you to promise they will be certified. What do you do?

- A. Promise it to close faster
- B. Reset their expectations honestly, since certification cannot be promised  **(correct)**
- C. Imply it quietly
- D. Take a deposit to guarantee it

**Answer:** B. Reset their expectations honestly, since certification cannot be promised

**Explanation:** Certification is earned through review and can never be promised, so reset expectations. Promising, implying, or taking a guarantee deposit all break the rules.

**Exam 6.** A prospect pushes to pay you directly, off the official channel. What is correct?

- A. Accept it to speed enrollment
- B. Refuse, because payment must go through official channels  **(correct)**
- C. Accept only the first payment
- D. Split it

**Answer:** B. Refuse, because payment must go through official channels

**Explanation:** Off channel payment is prohibited with no exception. Any version of accepting it breaks the rule.

**Exam 7.** A prospect offers to send confidential or regulated data to get started. What do you do?

- A. Accept it to move quickly
- B. Stop and protect everyone, since that data needs proper rights and safeguards  **(correct)**
- C. Forward it to the company
- D. Store it yourself

**Answer:** B. Stop and protect everyone, since that data needs proper rights and safeguards

**Explanation:** Confidential or regulated data must not enter the process without rights and safeguards, so stop. Accepting, forwarding, or storing it creates exposure.

**Exam 8.** Where are the right prospects usually found?

- A. On purchased lists
- B. In your own trusted network and professional circles  **(correct)**
- C. Among random strangers
- D. Only at paid events

**Answer:** B. In your own trusted network and professional circles

**Explanation:** The right prospects are usually in your trusted network and existing circles. Bought lists and random strangers are not the source.

**Exam 9.** How do prospecting and deal registration relate?

- A. They are unrelated
- B. You find a real fit, register it, get confirmation, then pursue  **(correct)**
- C. You register only after closing
- D. You pursue first and register if it works out

**Answer:** B. You find a real fit, register it, get confirmation, then pursue

**Explanation:** Prospecting and registration move together: find, register, confirm, then pursue. Registering after closing or pursuing before registering breaks the discipline.

**Exam 10.** What is the right size and character of a target list?

- A. As long as possible with any names
- B. Short, specific, and real, with a route in for each  **(correct)**
- C. Filled with purchased contacts
- D. Built on guesses about strangers

**Answer:** B. Short, specific, and real, with a route in for each

**Explanation:** A good list is short, specific, real, and reachable. Length for its own sake, bought contacts, and guesses do not qualify.

**Exam 11.** Which describes a strong fit prospect most completely?

- A. Anyone curious about AI
- B. An experienced professional who feels the gap between using and leading AI, has one real problem, and can commit the time  **(correct)**
- C. A beginner who wants a certificate
- D. Someone seeking a guaranteed outcome

**Answer:** B. An experienced professional who feels the gap between using and leading AI, has one real problem, and can commit the time

**Explanation:** The full strong fit is experience, the using versus leading gap, a real problem, and time. Curiosity alone, certificate hunting, and guarantee seeking are not it.

**Exam 12.** What is the heart of prospecting, in a sentence?

- A. Chase volume by any means
- B. Find real fits in your trusted network, qualify honestly, turn away poor fits, and register before you pursue  **(correct)**
- C. Buy lists and message everyone
- D. Promise outcomes to fill seats

**Answer:** B. Find real fits in your trusted network, qualify honestly, turn away poor fits, and register before you pursue

**Explanation:** The heart of it is honest qualification from your network and registration before pursuit. Volume by any means, bought lists, and promises are the opposite. --- ## 21.


---

<a id="m10"></a>
## Module 10: Outreach and the Conversation in Practice

<a id="m10-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 10 |
| Slug | `conversation` |
| Title | Outreach and the Conversation in Practice |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 9 is passed (sequential gating). |

**Summary.** Outreach and the real conversation: approved messaging, no spam, and moving from interest to a registered opportunity.

<a id="m10-obj"></a>
### Learning objectives

- Write a first message that is personal, honest, specific, and short, and that passes the truth test every time.
- Open the conversation with the prospect's challenge instead of your program, then listen.
- Match the field story to the person in front of you, so they see their own profession walking through the twelve weeks.
- Handle the price question inside the rules, by pointing to approved materials and the application.
- Guide a qualified prospect to apply, follow up with value, and hand off cleanly to the company.

<a id="m10-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

You already have a list of real, qualified prospects, each one registered and confirmed. This module is how you actually reach them and run the conversation in practice, without breaking a rule and without sounding like a script. The goal is detection, not persuasion: you are finding the professional who already has a real problem worth twelve weeks, not talking anyone into being someone they are not.

##### What you will be able to do

- Write a first message that is personal, honest, specific, and short, and that passes the truth test every time.
- Open the conversation with the prospect's challenge instead of your program, then listen.
- Match the field story to the person in front of you, so they see their own profession walking through the twelve weeks.
- Handle the price question inside the rules, by pointing to approved materials and the application.
- Guide a qualified prospect to apply, follow up with value, and hand off cleanly to the company.

##### What you need to understand

###### The four qualities of good outreach

Every message you send, warm or through a mutual contact, lives or dies on four qualities. They are not style preferences, they are the difference between outreach and spam.

- **Personal.** Clearly written to this person, referencing something real about them or your connection. Not a blast.
- **Honest.** No hype and no promises.
- **Specific.** You name the one thing you think is relevant to them, not a wall of features.
- **Short.** You respect their time and make the next step easy.

On top of those four, every message must still use approved messaging and pass the truth test from the identity module: is it true, can you back it up, does it avoid promising what you cannot control, does it route money and data correctly.

###### Warm, introduced, and the absence of cold

- A **warm** message, where you already have a relationship, can be direct: remind them who you are, say briefly why you thought of them, and suggest a short conversation.
- A message **through a mutual contact** leads with that person's name and the reason for the introduction, because their trust is being lent to you.
- There is no genuinely **cold** outreach here. Strangers from bought or scraped lists are prohibited. The closest you get is reaching someone in a shared circle, and even then you lead with the real connection, not a pitch.

###### Running the conversation, not pitching it

When you get the conversation, do not pitch. Open with their challenge, not your program: ask what the biggest challenge they are facing around AI in their work is, and then listen. Most people hand you one of the three classic openings, and each one points straight at the program. Then match the field story to who they are, using the explorer, so they recognize themselves. Place your mini pitch where it fits naturally, sixty to ninety seconds, no hype, and lead with the boundary as much as the benefit, because that is what a serious professional respects.

##### How to sell it honestly

This program multiplies an AI method onto expertise the person already has. Ten times zero is still zero, so if there is nothing real to multiply, the program is not for them, and your job in the conversation is to find that out, not to paper over it. That is why you open with their challenge and listen: a real challenge in their own field is the signal that they have something multipliable. If you find yourself working hard to convince someone that they belong, that is the signal that they probably do not, and an honest partner names it kindly and moves on.

> **Say this:** What is the biggest challenge you are facing around AI in your work right now? I thought of you because of the work you do in your field, and I want to understand the problem before I say anything about how the program might fit.

> **Do not say this:** This program will make you an AI leader and get you results. The price is a special number just for you, and you can pay today to lock it in.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| What does it cost? | Point them to the current approved information and to the application, and be straight that payment happens only after they apply and are accepted. Do not quote outside approved materials. |
| Can you give me a discount? | No. You may not give discounts or change the price. The structure is the same for everyone, and acceptance comes before payment. |
| Can you guarantee this works for me? | No promises of results. You can describe the fixed structure and what participants produce, and let the application and the work speak. |
| Why do I have to apply instead of just paying? | The application is the first quality gate, where you describe your expertise and the problem you want to work on. Acceptance comes before any payment, which actually removes pressure. |
| Is this for beginners learning AI? | No. The real prerequisite is professional judgment and genuine domain expertise. An absolute beginner with no field to work from is not the fit, and it is honest to say so. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The application screen the prospect fills in: a description of their expertise, the real problem they want to work on for twelve weeks, and their field. This is the first quality gate, and acceptance happens here before any payment.

> **Form preview:**
> Form preview, placeholder

Your opportunity registration in the Partner Panel, where you record the prospect and your route in, so the conversation you started is logged and protected.

##### Talking points

- Lead with the boundary as much as the benefit: a serious professional respects the limits you name.
- Payment only after acceptance, so no one is ever sold into paying before they are accepted.
- The application is a quality gate, not a sales form, and it is the natural next step.
- You bring the expertise, the program brings the method: that is the whole multiplier idea, said plainly.
- Your role ends at a clean handoff: the company handles acceptance, payment, and delivery.

> **Mistakes to avoid:** quoting a price outside approved materials, offering a discount, promising a result, blasting a generic message to a list, chasing a prospect who is clearly not a fit, or following up by repeating the same ask with more pressure. Each one breaks a rule or wastes the time the right prospect deserves.

##### Summary checklist

- I can write a first message that is personal, honest, specific, and short.
- I can lead a mutual contact introduction with their name and the reason for it.
- I can open the conversation with the prospect's challenge and then listen.
- I can handle price by pointing to approved materials and the application.
- I can guide a qualified prospect to apply, and follow up by adding value.
- I can thank a poor fit and move on, and hand off cleanly to the company.

##### A real scenario

Dr. Lena Okafor is a compliance lead at a mid-size insurer, introduced to you by a former colleague. You lead with that colleague's name and the reason for the introduction, then ask what her biggest challenge around AI is. She says leadership keeps asking what the AI plan is and she has nothing she can defend. That is a real, multipliable problem in her own field. You match the field story, give a sixty second mini pitch that leads with governance and limits, and when she asks the price you point her to the approved information and the application, noting payment only follows acceptance. You guide her to apply, and you hand off cleanly.

##### How this maps to your exam

The exam checks that you know the four qualities of outreach, how to open the conversation with the prospect's challenge, the correct way to handle a price question without approved materials, what a value adding follow up looks like, and where your role ends at handoff. Answer from this material and you will pass.

<a id="m10-plain"></a>
### Lesson body (plain prose / audio text)

You have a list of real, qualified prospects, each one registered and confirmed. This module is how you actually reach them and run the conversation, in practice, without breaking a rule and without sounding like a script.

Start with the principles of good outreach, because they apply to every message you send. Outreach is personal, honest, specific, and short. Personal means it is clearly written to this person, referencing something real about them or your connection, not a blast. Honest means no hype and no promises. Specific means you name the one thing you think is relevant to them, not a wall of features. Short means you respect their time and make the next step easy. And every message must still use approved messaging and pass the same truth test from the identity module: is it true, can you back it up, does it avoid promising what you cannot control, does it route money and data correctly.

The first message depends on whether it is warm or comes through a mutual contact. A warm message, where you already have a relationship, can be direct: remind them who you are, say briefly why you thought of them, and suggest a short conversation. A message through a mutual contact leads with that person's name and the reason for the introduction, because the trust is being lent to you. There is no genuinely cold outreach here in the sense of strangers from a bought list, since that is prohibited. The closest you get is reaching someone in a shared circle, and even then you lead with the real connection, not a pitch.

When you get the conversation, do not pitch. Run it the way the selling module taught. Open with their challenge, not your program: ask what the biggest challenge they are facing around AI in their work is, and then listen. Most people hand you one of the three classic openings, and each points straight at the program. Then match the field story to who they are, using the explorer, so they see their own profession walking through the twelve weeks. Place your mini pitch where it fits naturally, sixty to ninety seconds, no hype, and lead with the boundary as much as the benefit, because that is what a serious professional respects.

Handle the price question honestly and inside the rules, because this is where partners most often slip. You may not quote a price unless you are using approved current materials, and you may not give discounts or promise results. So when price comes up, point them to the current approved information and to the application, and be straight that payment happens only after they apply and are accepted. This is not evasion, it is the structure, and it actually removes pressure, because you are not selling anyone into paying before they are accepted.

Guide them to the real next step, which is to apply. The application is the first quality gate, where they describe their expertise and the problem they want to work on, and acceptance comes before any payment. Make that step clear and easy. Then follow up like a professional, not a pest. A good follow up adds something: a relevant thought, an answer to a question they raised, or the field story you promised to send. Space your follow ups, keep them useful, and know when to stop. If someone is clearly not a fit or not interested, thank them and move on, because chasing the wrong prospect costs you the time the right one deserves.

Finally, know the handoff. Your job is to bring the right professional to the door honestly and register the opportunity. The company handles acceptance, payment, and delivery. You do not bind the company, quote outside approved materials, accept payment, or issue invoices. Knowing where your role ends is part of doing it well.

One line for the module. Reach real people personally and honestly, open the conversation with their challenge and match their field, handle price by pointing to approved materials and the application, guide them to apply, follow up with value, and hand off cleanly.


<a id="m10-ex"></a>
### Exercises (6)

**Exercise 1.** What are the four qualities of good outreach?

- A. Long, clever, frequent, and broad
- B. Personal, honest, specific, and short  **(correct)**
- C. Urgent, vague, repeated, and pushy
- D. Generic, hyped, scripted, and long

**Answer:** B. Personal, honest, specific, and short

**Explanation:** Good outreach is personal, honest, specific, and short. The other sets describe exactly the blast style to avoid.

**Exercise 2.** A message sent through a mutual contact should lead with what?

- A. A long feature list
- B. The mutual contact's name and the reason for the introduction  **(correct)**
- C. A price quote
- D. A promise of results

**Answer:** B. The mutual contact's name and the reason for the introduction

**Explanation:** An introduction leads with the mutual contact and the reason, because their trust is being lent. Feature lists, prices, and promises are wrong openers.

**Exercise 3.** When price comes up and you do not have approved current materials to quote from, what do you do?

- A. Quote a number anyway
- B. Offer a discount
- C. Point them to the current approved information and the application, and note payment follows acceptance  **(correct)**
- D. Promise a refund if unhappy

**Answer:** C. Point them to the current approved information and the application, and note payment follows acceptance

**Explanation:** You may not quote outside approved materials or give discounts, so point to approved information and the application. Quoting, discounting, and refund promises break the rules.

**Exercise 4.** What makes a good follow up message?

- A. Repeating the same ask
- B. Adding something useful, like an answer or the field story you promised  **(correct)**
- C. Increasing the pressure each time
- D. Sending many messages quickly

**Answer:** B. Adding something useful, like an answer or the field story you promised

**Explanation:** A good follow up adds value. Repetition, pressure, and rapid blasts are the pest behavior to avoid.

**Exercise 5.** A prospect is clearly not a fit or not interested. What do you do?

- A. Keep chasing until they say yes
- B. Thank them and move on to the right prospect  **(correct)**
- C. Apply more pressure
- D. Offer a discount to change their mind

**Answer:** B. Thank them and move on to the right prospect

**Explanation:** Thank them and move on, because chasing the wrong prospect wastes time. Chasing, pressure, and discounts are not the move.

**Exercise 6.** Which is part of the handoff, where your role ends?

- A. You accept the payment yourself
- B. You issue the invoice
- C. The company handles acceptance, payment, and delivery  **(correct)**
- D. You set the final price

**Answer:** C. The company handles acceptance, payment, and delivery

**Explanation:** The company handles acceptance, payment, and delivery, while you bring and register the opportunity. Accepting payment, invoicing, and pricing are not the partner's role.

<a id="m10-exam"></a>
### Final exam pool (12)

**Exam 1.** Why must outreach be personal rather than a blast?

- A. Because blasts are faster
- B. Because a message clearly written to this person earns attention and respects them  **(correct)**
- C. Because personal messages let you promise more
- D. Because it avoids qualification

**Answer:** B. Because a message clearly written to this person earns attention and respects them

**Explanation:** A personal message earns attention and respect. It is not about speed, making promises, or skipping qualification.

**Exam 2.** A warm first message to someone you already know should do what?

- A. Open with a long feature pitch
- B. Remind them who you are, say briefly why you thought of them, and suggest a short conversation  **(correct)**
- C. Quote a price immediately
- D. Promise a career outcome

**Answer:** B. Remind them who you are, say briefly why you thought of them, and suggest a short conversation

**Explanation:** A warm opener reconnects, gives a brief relevant reason, and suggests a short talk. Feature pitches, prices, and promises are wrong.

**Exam 3.** How should the conversation itself open?

- A. With a full pitch of the program
- B. With a question about the prospect's biggest AI challenge, then listening  **(correct)**
- C. With the price
- D. With a guarantee

**Answer:** B. With a question about the prospect's biggest AI challenge, then listening

**Explanation:** Open with their challenge and listen. Pitching, pricing, or guaranteeing up front are not how to open.

**Exam 4.** A prospect asks the price and you have no approved current materials in hand. What is correct?

- A. Make up a number
- B. Point them to the current approved information and the application, and note payment follows acceptance  **(correct)**
- C. Offer a discount to close
- D. Promise a result to justify the cost

**Answer:** B. Point them to the current approved information and the application, and note payment follows acceptance

**Explanation:** Without approved materials you point to approved information and the application. Inventing a price, discounting, and promising results all break the rules.

**Exam 5.** Why does pointing to the application instead of pushing payment reduce pressure?

- A. Because it hides the price forever
- B. Because no one pays before being accepted, so you never sell them into paying first  **(correct)**
- C. Because it removes the review
- D. Because it lets you promise acceptance

**Answer:** B. Because no one pays before being accepted, so you never sell them into paying first

**Explanation:** Payment only after acceptance means you never push payment first, which removes pressure. It does not hide price permanently, remove review, or let you promise acceptance.

**Exam 6.** What distinguishes a professional follow up from being a pest?

- A. Sending more messages, faster
- B. Adding something useful each time and knowing when to stop  **(correct)**
- C. Increasing pressure with each message
- D. Repeating the same request

**Answer:** B. Adding something useful each time and knowing when to stop

**Explanation:** A professional follow up adds value and stops when appropriate. Volume, pressure, and repetition are the pest pattern.

**Exam 7.** What is the next step you guide a qualified prospect toward?

- A. Paying you directly
- B. Applying, which is the first quality gate before any payment  **(correct)**
- C. Signing a contract with you
- D. Sending you their data

**Answer:** B. Applying, which is the first quality gate before any payment

**Explanation:** You guide them to apply, the first quality gate, with payment only after acceptance. Direct payment, signing with you, or sending data are not it.

**Exam 8.** Which action is outside the partner's role at handoff?

- A. Bringing the right professional to the door
- B. Registering the opportunity
- C. Accepting payment and issuing the invoice  **(correct)**
- D. Honestly describing the program

**Answer:** C. Accepting payment and issuing the invoice

**Explanation:** Accepting payment and invoicing belong to the company, not the partner. Bringing, registering, and honestly describing are the partner's job.

**Exam 9.** There is no genuinely cold outreach in this program because of what?

- A. It is simply discouraged
- B. Strangers from bought or scraped lists are prohibited, so the closest you get is a shared circle led by a real connection  **(correct)**
- C. Cold outreach is allowed but slow
- D. It requires a fee

**Answer:** B. Strangers from bought or scraped lists are prohibited, so the closest you get is a shared circle led by a real connection

**Explanation:** Bought and scraped stranger outreach is prohibited, so you work from real connections. It is not merely discouraged, allowed but slow, or fee gated.

**Exam 10.** What must every outreach message still satisfy?

- A. Nothing specific
- B. Approved messaging and the truth test: true, backable, no uncontrollable promises, correct money and data routing  **(correct)**
- C. A minimum length
- D. A scripted template

**Answer:** B. Approved messaging and the truth test: true, backable, no uncontrollable promises, correct money and data routing

**Explanation:** Every message must use approved messaging and pass the truth test. There is no length minimum or required script, and the requirements are not absent.

**Exam 11.** A serious professional responds best when the mini pitch does what?

- A. Maximizes hype
- B. Leads with the boundary as much as the benefit  **(correct)**
- C. Hides the limits of AI
- D. Promises a specific result

**Answer:** B. Leads with the boundary as much as the benefit

**Explanation:** Leading with the boundary reflects the judgment serious people respect. Hype, hiding limits, and promising results undercut credibility.

**Exam 12.** Put simply, what is the right way to run outreach and the conversation?

- A. Pitch hard and chase relentlessly
- B. Reach people personally, open with their challenge, handle price by pointing to approved materials and the application, follow up with value, and hand off cleanly  **(correct)**
- C. Quote prices freely and close on the spot
- D. Promise outcomes to win trust

**Answer:** B. Reach people personally, open with their challenge, handle price by pointing to approved materials and the application, follow up with value, and hand off cleanly

**Explanation:** Put simply, it is personal outreach, a challenge first conversation, correct price handling, value follow up, and a clean handoff. The others describe prohibited or pushy behavior. --- ## 22.


---

<a id="m11"></a>
## Module 11: Operating the System and Your First 90 Days

<a id="m11-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 11 |
| Slug | `operations` |
| Title | Operating the System and Your First 90 Days |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 10 is passed (sequential gating). |

**Summary.** Operating the system day to day and running your first weeks: the Panel, meaningful updates, and disciplined follow through.

<a id="m11-obj"></a>
### Learning objectives

- Run your whole operation through the Partner Panel, the single source of truth.
- Register an opportunity correctly, with every real field filled in, before substantive contact.
- Keep an account protected by logging meaningful updates, not by holding it quietly.
- Follow the first ninety days as a sequence, from the Activation Gate to the day ninety review.
- Get help the right way, and know how a dispute over the same account is decided.

<a id="m11-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

Knowing the program and reaching prospects is not enough if you cannot operate the system day to day. This module is the practical mechanics: how you run your work through the Partner Panel, what your first ninety days actually look like, how you keep accounts alive, and how to get help when you need it. A clean, active pipeline is itself a form of honesty: it shows the company exactly what you are really working.

##### What you will be able to do

- Run your whole operation through the Partner Panel, the single source of truth.
- Register an opportunity correctly, with every real field filled in, before substantive contact.
- Keep an account protected by logging meaningful updates, not by holding it quietly.
- Follow the first ninety days as a sequence, from the Activation Gate to the day ninety review.
- Get help the right way, and know how a dispute over the same account is decided.

##### What you need to understand

###### The Partner Panel in daily practice

The Panel is where your operation lives. In practice you use it for a handful of things:

- **Register an opportunity** before substantive contact, filling in the real fields: the entity or person, the country, the business unit, the contact, the offering, the estimated seats and value, your role, and your route in.
- **Submit your first target list** there during activation.
- **Log meaningful updates** on each active account: a logged meeting, a documented next step, a customer response, a proposal path, or conversion evidence.
- **Check your commission statements**, and if something looks wrong, raise a query within thirty days.

Treat the Panel as your operating discipline, not a chore. An account with no updates is an account losing its protection.

###### The first ninety days, as a sequence

- **Before any outreach:** complete the Activation Gate and wait for confirmation.
- **First two weeks:** build and register at least three realistic target accounts or channels.
- **By day thirty:** aim for at least one confirmed qualified lead or documented progress.
- **By day sixty:** at least one prospect meeting, a proposal path, or conversion evidence.
- **At day ninety:** a review, with the outcome to end, extend, continue at Tier one, or move toward Tier two.

None of this is busywork. It is the rhythm that turns a new partner into a producing one, and it is exactly what the company looks at.

###### Keeping accounts alive on purpose

Protection is neither permanent nor automatic. It rewards real activity, so every account you hold should show movement on the Panel. If you are holding an account you are not actually working, you are blocking it from someone who would, and you will lose it anyway when the protection lapses. Hold what you are truly pursuing, and let go of what you are not.

##### How to use it correctly

The same instinct that makes you a good partner in a conversation, detection rather than persuasion, makes you a good operator here. You register the accounts where there is a real, multipliable opportunity, and you let go of the ones where there is not. A pipeline full of accounts you are not working is the operational version of trying to convince someone they are a Pro when they are not: it looks like activity and produces nothing. Keep it honest and the Panel will reflect work you can defend.

> **Say this (to yourself, before acting):** I am unsure whether this is allowed, so I will treat the doubt as a no and confirm on the Panel or with my partner contact before I do anything.

> **Do not say this:** I will just do it and apologize later, or I will guess based on what feels right, or I will hold this account quietly even though I am not working it.

##### Common objections and honest answers

| Question or doubt | How to answer it |
| --- | --- |
| Is my account protected once I register it? | Not permanently and not automatically. Protection rewards real activity, so log a meaningful update. An account with no updates is losing its protection. |
| Should I hold extra accounts just in case? | No. Hold only what you are truly working. Inactive accounts lapse and block partners who would work them, and they make your pipeline less credible. |
| Two of us are on the same account, who wins? | Priority goes to the first confirmed registration, and the company resolves it on the Panel. It is not decided by who is louder, newer, or closes first. |
| I am not sure a claim in my message is allowed. | Treat the doubt as a no and confirm before acting. Ask your partner manager or designated contact rather than sending it to see. |
| Does anything carry over when the year changes? | Yes. Confidentiality, non circumvention, non solicitation, and clawback on commission already paid continue regardless of the year change. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The opportunity registration form: the entity or person, the country, the business unit, the contact, the offering, the estimated seats and value, your role, and your route in. You complete this before substantive contact.

> **Form preview:**
> Form preview, placeholder

The account update view, where you log a meeting, a documented next step, a customer response, a proposal path, or conversion evidence to keep the account protected.

> **Form preview:**
> Form preview, placeholder

The commission statements view, where you check what you are owed and raise a query within thirty days if something looks wrong.

##### Talking points

- The Panel is the single source of truth: registration, target list, updates, and statements all live there.
- Meaningful updates are the discipline that keeps an account protected.
- The ninety day sequence starts with the Activation Gate and ends with a real review.
- First confirmed registration decides any dispute, resolved on the Panel.
- Survival obligations continue across the year change, even as terms renew through the site.

> **Mistakes to avoid:** holding accounts you are not working, treating Panel updates as an optional chore, guessing in silence when you are unsure, improvising an answer about a deal or rule, missing the thirty day window to query a statement, and ignoring the yearly renewal so your operating terms lapse.

##### Summary checklist

- I can register an opportunity with every real field before substantive contact.
- I can keep an account protected by logging a meaningful update.
- I can name the ninety day sequence from the Activation Gate to the day ninety review.
- I can release an account I am not truly working.
- I can resolve a doubt by treating it as a no and asking before acting.
- I can name the survival obligations that continue across the year change.

##### A real scenario

Marco is a new partner in his first month. He completes the Activation Gate and waits for confirmation, then registers three realistic target accounts in his first two weeks, filling in every field. By day thirty he has one confirmed qualified lead with a logged meeting on the Panel. He is tempted to register two more accounts he is not really pursuing, to look busy, but he holds only what he is working, because he knows inactive accounts lapse and block other partners. When a question comes up about a commission statement, he raises a query within thirty days rather than guessing. At day ninety, his clean, active pipeline is exactly what the review wants to see.

##### How this maps to your exam

The exam checks that you know what the Panel is used for, why updates keep an account protected, the day thirty and day sixty targets and the day ninety review outcomes, how a dispute over the same account is decided, and which survival obligations continue after the year changes. Answer from this material and you will pass.

<a id="m11-plain"></a>
### Lesson body (plain prose / audio text)

Knowing the program and reaching prospects is not enough if you cannot operate the system day to day. This module is the practical mechanics: how you run your work through the Partner Panel, what your first ninety days actually look like, how you keep accounts alive, and how to get help when you need it.

The Partner Panel is where your whole operation lives, and you already know from the rules that it is the single source of truth. In practice you use it for a handful of things. You register an opportunity before substantive contact, filling in the real fields: the entity or person, the country, the business unit, the contact, the offering, the estimated seats and value, your role, and your route in. You submit your first target list there during activation. You log meaningful updates on each active account, a logged meeting, a documented next step, a customer response, a proposal path, or conversion evidence, because that is what keeps an account protected. You check your commission statements there, and if something looks wrong you raise a query within thirty days. Treat the Panel as your operating discipline, not a chore. An account with no updates is an account losing its protection.

Your first ninety days follow the scorecard, and it helps to see them as a sequence rather than a list. Before any outreach, you complete the Activation Gate and wait for confirmation. In the first two weeks, you build and register at least three realistic target accounts or channels. By day thirty, you aim for at least one confirmed qualified lead or documented progress. By day sixty, you want at least one prospect meeting, a proposal path, or conversion evidence. At day ninety, there is a review, where the outcome is to end, extend, continue at Tier one, or move toward Tier two. None of this is busywork. It is the rhythm that turns a new partner into a producing one, and it is exactly what the company looks at.

Keep your accounts active on purpose. Protection is neither permanent nor automatic. It rewards real activity, so every account you hold should show movement on the Panel. If you are holding an account you are not actually working, you are blocking it from someone who would, and you will lose it anyway when the protection lapses. Hold what you are truly pursuing, and let go of what you are not. This is not just a rule, it is how you keep a clean, credible pipeline that the company trusts.

Know how to get help, because guessing in silence is how mistakes happen. When you are unsure whether something is allowed, treat the doubt as a no and confirm on the Panel or with your partner contact before acting. When you have a question about a deal, a statement, a scope, or a rule, ask your partner manager or the designated contact rather than improvising. When there is a dispute, for example two partners on the same account, the rule decides it: priority goes to the first confirmed registration, and the company resolves it on the Panel. Asking early is a mark of a professional, not a weakness.

Stay aware of the calendar. The terms and commission structure are valid for the current year, contracts run to the end of the year, and renewal happens through the site. As the year closes, watch for the renewal and the updated terms, and accept the new year's terms to keep operating. The survival obligations you already carry, confidentiality, non circumvention, non solicitation, and clawback on commission already paid, continue regardless of the year change.

One line for the module. Run everything through the Panel with real updates, follow the ninety day rhythm, keep only the accounts you are truly working, ask for help early, and stay aware of the yearly renewal.


<a id="m11-ex"></a>
### Exercises (6)

**Exercise 1.** In practice, what keeps a registered account protected?

- A. Nothing, protection is permanent once granted
- B. Meaningful updates on the Panel, like a logged meeting or a documented next step  **(correct)**
- C. Holding it quietly with no activity
- D. Registering it a second time

**Answer:** B. Meaningful updates on the Panel, like a logged meeting or a documented next step

**Explanation:** Protection rewards real activity shown on the Panel. It is not permanent, not kept by silence, and not renewed by re registering.

**Exercise 2.** By day thirty of the pilot, what is the target?

- A. A signed contract
- B. At least one confirmed qualified lead or documented progress  **(correct)**
- C. Forty paid seats
- D. Nothing is expected yet

**Answer:** B. At least one confirmed qualified lead or documented progress

**Explanation:** Day thirty targets at least one qualified lead or documented progress. A signed contract, forty seats, or no expectation are not the day thirty mark.

**Exercise 3.** You are unsure whether an action is allowed. What do you do?

- A. Do it and apologize later
- B. Treat the doubt as a no and confirm on the Panel or with your partner contact first  **(correct)**
- C. Guess based on what feels right
- D. Ask another prospect

**Answer:** B. Treat the doubt as a no and confirm on the Panel or with your partner contact first

**Explanation:** When unsure, treat the doubt as a no and confirm before acting. Acting first, guessing, or asking a prospect are not how to resolve it.

**Exercise 4.** You are holding an account you are not actually working. What is the right move?

- A. Keep holding it to block others
- B. Let it go, since inactive accounts lose protection and block people who would work them  **(correct)**
- C. Register two more like it
- D. Ignore it indefinitely

**Answer:** B. Let it go, since inactive accounts lose protection and block people who would work them

**Explanation:** Release an account you are not working, because it will lapse anyway and it blocks an active partner. Holding to block, piling on, or ignoring it are wrong.

**Exercise 5.** Two partners are on the same account. How is it resolved?

- A. The louder partner wins
- B. Priority goes to the first confirmed registration, resolved by the company on the Panel  **(correct)**
- C. They split it automatically
- D. The newer partner wins

**Answer:** B. Priority goes to the first confirmed registration, resolved by the company on the Panel

**Explanation:** First confirmed registration takes priority, resolved on the Panel. It is not decided by volume, an automatic split, or seniority of newness.

**Exercise 6.** As the calendar year closes, what should a partner do?

- A. Assume nothing changes
- B. Watch for the renewal and updated terms, and accept the new year's terms to keep operating  **(correct)**
- C. Stop all activity permanently
- D. Ignore the renewal

**Answer:** B. Watch for the renewal and updated terms, and accept the new year's terms to keep operating

**Explanation:** Watch for and accept the new year's terms to keep operating. Assuming no change, stopping permanently, or ignoring renewal are all wrong.

<a id="m11-exam"></a>
### Final exam pool (12)

**Exam 1.** What is the Partner Panel used for in day to day operation?

- A. Only to read announcements
- B. To register opportunities, submit the target list, log updates, and check commission statements  **(correct)**
- C. To set your own prices
- D. To issue invoices to customers

**Answer:** B. To register opportunities, submit the target list, log updates, and check commission statements

**Explanation:** The Panel is for registering, submitting the list, logging updates, and checking statements. It is not just announcements, and partners do not set prices or invoice.

**Exam 2.** Why treat logging Panel updates as discipline rather than a chore?

- A. It has no real effect
- B. Because an account with no updates is an account losing its protection  **(correct)**
- C. Because updates set the commission rate
- D. Because it replaces registration

**Answer:** B. Because an account with no updates is an account losing its protection

**Explanation:** Updates keep an account protected, so they matter. They do not set rates, replace registration, or lack effect.

**Exam 3.** What is the day sixty target in the first ninety days?

- A. Nothing yet
- B. At least one prospect meeting, a proposal path, or conversion evidence  **(correct)**
- C. Reaching Tier three
- D. Forty paid seats

**Answer:** B. At least one prospect meeting, a proposal path, or conversion evidence

**Explanation:** Day sixty targets a meeting, proposal path, or conversion evidence. It is not nothing, not a tier jump, and not forty seats.

**Exam 4.** At the day ninety review, what are the possible outcomes?

- A. Only to continue forever
- B. End, extend, continue at Tier one, or move toward Tier two  **(correct)**
- C. Automatic promotion to Tier three
- D. Immediate termination only

**Answer:** B. End, extend, continue at Tier one, or move toward Tier two

**Explanation:** The review can end, extend, continue at Tier one, or move toward Tier two. It is not a single fixed path, an automatic top tier, or termination only.

**Exam 5.** When you have a question about a deal, a statement, or a rule, what do you do?

- A. Improvise and hope it is fine
- B. Ask your partner manager or the designated contact rather than guessing  **(correct)**
- C. Ask a prospect for advice
- D. Post it publicly

**Answer:** B. Ask your partner manager or the designated contact rather than guessing

**Explanation:** Ask the partner manager or designated contact. Improvising, asking a prospect, or posting publicly are not the right channels.

**Exam 6.** Why should a partner release an account they are not actively working?

- A. There is no reason to
- B. Because it will lose protection anyway and it blocks a partner who would work it  **(correct)**
- C. Because holding more accounts is always better
- D. Because releasing it pays a bonus

**Answer:** B. Because it will lose protection anyway and it blocks a partner who would work it

**Explanation:** An inactive account lapses and blocks an active partner, so release it. There is a clear reason, more is not always better, and no bonus is implied.

**Exam 7.** Which survival obligation continues even after the year changes?

- A. The current year commission rates continue unchanged
- B. Confidentiality, non circumvention, non solicitation, and clawback on paid commission continue  **(correct)**
- C. Nothing continues across the year
- D. Only your commission claims continue

**Answer:** B. Confidentiality, non circumvention, non solicitation, and clawback on paid commission continue

**Explanation:** Survival obligations continue across the year change. Commercial rates do not simply continue, and the change does not erase those obligations.

**Exam 8.** How is a dispute over the same account decided?

- A. By whoever closes first
- B. By the first confirmed registration, resolved by the company on the Panel  **(correct)**
- C. By tenure as a partner
- D. By company size of the account

**Answer:** B. By the first confirmed registration, resolved by the company on the Panel

**Explanation:** First confirmed registration wins, resolved on the Panel. Closing speed, tenure, and account size do not decide it.

**Exam 9.** What is the first thing in the ninety day sequence, before outreach?

- A. Registering forty accounts
- B. Completing the Activation Gate and waiting for confirmation  **(correct)**
- C. Sending a mass campaign
- D. Reaching Tier two

**Answer:** B. Completing the Activation Gate and waiting for confirmation

**Explanation:** The sequence starts with completing the Activation Gate and getting confirmation. It does not start with forty accounts, a mass campaign, or a tier jump.

**Exam 10.** A partner is unsure whether a particular claim is allowed in a message. What is the correct default?

- A. Send it and see
- B. Treat the doubt as a no and confirm before acting  **(correct)**
- C. Assume it is fine
- D. Ask the prospect

**Answer:** B. Treat the doubt as a no and confirm before acting

**Explanation:** When in doubt, treat it as a no and confirm first. Sending to test, assuming, or asking the prospect are not safe defaults.

**Exam 11.** What keeps your pipeline credible to the company?

- A. Holding as many accounts as possible
- B. Holding only the accounts you are truly working, with real updates  **(correct)**
- C. Registering accounts you never pursue
- D. Avoiding the Panel

**Answer:** B. Holding only the accounts you are truly working, with real updates

**Explanation:** A credible pipeline holds only real, active accounts with updates. Hoarding, registering dead accounts, or avoiding the Panel undercut credibility.

**Exam 12.** What is the operating discipline this module comes down to?

- A. Hold every account and stay quiet
- B. Run everything through the Panel with real updates, follow the ninety day rhythm, keep only what you work, ask for help early, and watch the yearly renewal  **(correct)**
- C. Improvise and avoid asking questions
- D. Ignore the calendar and the Panel

**Answer:** B. Run everything through the Panel with real updates, follow the ninety day rhythm, keep only what you work, ask for help early, and watch the yearly renewal

**Explanation:** It comes down to Panel discipline, the ninety day rhythm, an active pipeline, asking early, and renewal awareness. The others describe exactly what to avoid. --- ## 23.


---

<a id="m12"></a>
## Module 12: How the Twelve Weeks Work, in Full

<a id="m12-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 12 |
| Slug | `mechanics` |
| Title | How the Twelve Weeks Work, in Full |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 11 is passed (sequential gating). |

**Summary.** How the twelve weeks actually work, week by week, so you can set accurate expectations.

<a id="m12-obj"></a>
### Learning objectives

- Explain the fixed twelve week structure, the four phases, the eight assets, and the dossier, without checking anything.
- Describe what the participant produces at each of the four gates.
- Name the three review outcomes and what each one means.
- Recognize which details are operational, and take those from the current official source.
- Say honestly when the program is not the right fit, for example for a true beginner with no field.

<a id="m12-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

A serious professional will ask practical questions about the twelve weeks, and a vague answer costs you the sale while a made up one costs you more when it turns out to be wrong. This module gives you the full mechanics: the fixed structure you state with confidence, and the operational details you take from the current official source rather than inventing. That discipline is what keeps every promise you make true.

##### What you will be able to do

- Explain the fixed twelve week structure, the four phases, the eight assets, and the dossier, without checking anything.
- Describe what the participant produces at each of the four gates.
- Name the three review outcomes and what each one means.
- Recognize which details are operational, and take those from the current official source.
- Say honestly when the program is not the right fit, for example for a true beginner with no field.

##### What you need to understand

###### The shape that never changes

The program runs twelve weeks, in four phases, and this backbone you can always explain with full confidence:

- **Frame**, weeks one to four, answers where AI belongs in the participant's work.
- **Design**, weeks five to eight, answers how to build it responsibly.
- **Prove**, weeks nine and ten, answers whether the value can be shown with evidence.
- **Foresee**, weeks eleven and twelve, answers how to lead what comes next.

Across these phases the participant builds eight connected assets and assembles them into one reviewed Living AI Solution Dossier with twelve sections. There is no week that is just watching: every week has a defined focus, a piece of work to create, and a milestone badge that marks it done, and at the end of each phase the participant earns the phase rank.

###### The four gates, as worked examples

Think of the twelve weeks as four gates, because that is how the work stacks. Each gate is real work finished, not a box ticked. Here is exactly what is produced by the end of each one, drawn straight from the program structure.

| Gate | Assets produced | Dossier sections added |
| --- | --- | --- |
| Frame (weeks one to four) | Personal AI Strategy Brief, AI Use Case Portfolio | Professional context, problem definition, AI suitability assessment |
| Design (weeks five to eight) | Interaction and Decision Kit, Grounded Domain Knowledge Pack, AI Evaluation Rubric and Test Set, a working set of Custom Assistants and Workflows | Stakeholders, evidence, before and after workflow, risk and compliance, responsible solution design |
| Prove (weeks nine and ten) | An honestly run evaluation, the AI Value and Economics Case | Adoption and proof sections |
| Foresee (weeks eleven and twelve) | Final Portfolio, ninety day Roadmap, foresight plan | Complete dossier submitted for review |

###### Review, outcomes, and what the participant carries

When the dossier is submitted at the end of Foresee, it is reviewed against the eight public criteria, and the participant receives one of three outcomes: **Certified**, **Strong Draft**, or **Completed**. A Strong Draft returns specific revisions before certification, so it is not a failure, it is a path to the credential. Once earned, the credential is verifiable and field specific: verification shows the recipient, the status, the issue date, and the badge metadata, without exposing the confidential dossier. During the program the participant accumulates weekly badges and phase ranks, and after it, if certified, they hold a field specific credential and a living dossier they can keep updating as their work evolves.

##### How to use it correctly

The structure multiplies a method onto expertise the participant already brings. Ten times zero is still zero, so the program is built for experienced professionals with a real problem and a real field, and an absolute beginner with no field to work from is not the fit. That is a detection question, not a persuasion one: the real prerequisite is professional judgment and genuine domain expertise, not coding. When you describe the mechanics, separate the fixed structure, which you state with confidence, from the operational specifics like format, hours, support model, deadlines, tools, and review time, which you take from the current official details. When you do not know a current operational answer, you say you will confirm it, and you do.

> **Say this:** The structure is fixed: four phases over twelve weeks, eight assets built into one reviewed dossier, with three outcomes at the end. For the exact hours per week and the support model I will give you the current official figures, and if I am not certain of one I will confirm it and come back to you.

> **Do not say this:** It is probably around a few hours a week and you get unlimited one to one coaching. (You may not invent an operational number or promise support the program has not stated.)

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| How many hours per week is it? | That is an operational figure. Give the current official number, and if you are not certain, say you will confirm it and then do. |
| What is the support model? | Describe it from the current official details. Do not invent a model that sounds good or promise unlimited coaching. |
| What if I fall behind? | Use the current pacing and flexibility policy. Do not promise flexibility the program does not offer, and do not deny flexibility it does offer. |
| Is a Strong Draft a failure? | No. It is a near miss with specific revisions returned, on the path to the credential. |
| I have no real field yet, can I still join? | The program needs genuine domain expertise and a real problem to work on. Without that there is nothing to multiply, so it is not the right fit, and it is honest to say so. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The dossier submission screen at the end of Foresee, where the participant submits the complete Living AI Solution Dossier with its twelve sections for review against the eight public criteria.

> **Form preview:**
> Form preview, placeholder

The public verification view, showing the recipient, the status, the issue date, and the badge metadata, without exposing the confidential dossier.

##### Talking points

- Twelve weeks, four phases: Frame, Design, Prove, Foresee. Fixed, and stateable to anyone.
- Eight connected assets assembled into one reviewed dossier with twelve sections.
- Every week produces something and earns a badge, so progress is visible the whole way.
- Three outcomes: Certified, Strong Draft, Completed. Strong Draft is a path, not a failure.
- Fixed structure you state with confidence, operational details you quote from the current official source.

> **Mistakes to avoid:** estimating an operational number like the weekly hours, inventing a support model, promising flexibility that is not offered, describing a Strong Draft as a failure, telling a true beginner with no field that the program is for them, or filling a silence with a guess instead of saying you will confirm.

##### Summary checklist

- I can name the four phases, the weeks they cover, and the question each one answers.
- I can list what the participant produces at each of the four gates.
- I can name the three review outcomes and explain what a Strong Draft means.
- I can separate fixed structure from operational details that need the current official answer.
- I can tell a true beginner honestly that the program is not the right fit.
- I can say I will confirm an operational figure, and then do it, rather than guessing.

##### A real scenario

Priya is a senior specialist in finance, weighing the program. She asks what she will actually have at the end. You explain the fixed structure with full confidence: by the end of Frame she has the Personal AI Strategy Brief, the AI Use Case Portfolio, and the first dossier sections; by Design, the decision kit, the knowledge pack, the rubric and test set, and a working system; by Prove, an honestly run evaluation and the Value and Economics Case; by Foresee, the Final Portfolio, the ninety day Roadmap, and the submitted dossier. When she asks the exact weekly hours, you give the current official figure, and where you are not certain, you tell her you will confirm it and you do.

##### How this maps to your exam

The exam checks that you can state the fixed four phase structure and what is produced at each gate, name the three outcomes and explain a Strong Draft, identify which details are operational and must come from the current official source, and give the honest answer to a beginner with no field. Answer from this material and you will pass.

<a id="m12-plain"></a>
### Lesson body (plain prose / audio text)

A partner who sells this program has to answer the practical questions a serious professional will ask about the twelve weeks, clearly and without guessing. A vague answer here costs you the sale and your credibility, and a made up answer costs you more when it turns out to be wrong. So this module gives you the full mechanics: what the structure is, what happens when, what the participant produces, how they are supported, and how it ends. Where a specific operational detail depends on the current program setup, you use the official current answer, and you never invent one.

Start with the shape that never changes, because this is the backbone you can always explain with full confidence. The program runs twelve weeks, in four phases. Frame is weeks one to four and answers where AI belongs in the participant's work. Design is weeks five to eight and answers how to build it responsibly. Prove is weeks nine and ten and answers whether the value can be shown with evidence. Foresee is weeks eleven and twelve and answers how to lead what comes next. Across these phases the participant builds eight connected assets and assembles them into one reviewed Living AI Solution Dossier with twelve sections. That structure is fixed, and you can state it to anyone without checking.

Now the weekly rhythm, described by what the participant produces, because that is what a prospect really wants to understand. There is no week that is just watching. Every week has a defined focus, a piece of work to create, and a milestone badge that marks it done, and by the end of each phase the participant has finished that phase's assets and earned the phase rank. The progress is visible the whole way, which matters to a busy professional who wants to know their effort is adding up to something real.

Look at it as four gates, because that is how the work stacks. By the end of Frame, the participant has produced the Personal AI Strategy Brief and the AI Use Case Portfolio, and the first dossier sections covering their professional context, their problem definition, and their AI suitability assessment. By the end of Design, they have built the Interaction and Decision Kit, the Grounded Domain Knowledge Pack, the AI Evaluation Rubric and Test Set, and a working set of Custom Assistants and Workflows, plus the Design dossier sections on stakeholders, evidence, the before and after workflow, risk and compliance, and the responsible solution design. By the end of Prove, they have run their evaluation honestly and built the AI Value and Economics Case, with the adoption and proof sections of the dossier. By the end of Foresee, they have the Final Portfolio and the ninety day Roadmap and their foresight plan, and they submit the complete dossier for review. Each gate is real work finished, not a box ticked.

The format and the time commitment. The program is delivered as [CONFIRM: state the format, for example async first with optional live sessions, or a scheduled cohort]. The expected time commitment is [CONFIRM: state the hours per week]. Enrollment works as [CONFIRM: rolling, or fixed cohort start dates]. You quote the current official figures here, always, never an estimate of your own. If a prospect asks and you are not certain of the current number, you say you will confirm it, and you do.

How participants are supported through the twelve weeks. Participants receive [CONFIRM: describe the support and coaching model, for example group coaching sessions, one to one reviews, office hours, peer review, and the expected response times]. Describe this specifically and from the current setup, because for a serious professional the support model is often the deciding factor, and a confident, accurate answer here closes deals.

Deadlines, pace, and flexibility. The program expects [CONFIRM: state the pacing and deadline policy]. If a participant falls behind, [CONFIRM: state the extension or flexibility policy]. Do not promise flexibility the program does not offer, and do not deny flexibility it does offer. Use the current policy and nothing else.

Tools and prerequisites. Participants need [CONFIRM: state any required tools or accounts]. The real prerequisite is professional judgment and genuine domain expertise, not coding. The program is built for experienced professionals, and an absolute beginner with no field to work from is not the fit, which is something you can and should say honestly.

The review and certification timeline. When the dossier is submitted, it is reviewed against the eight public criteria, and the participant receives one of three outcomes: Certified, Strong Draft, or Completed. [CONFIRM: state the review turnaround time]. A Strong Draft returns specific revisions before certification, so it is not a failure, it is a path to the credential. Once earned, the credential is verifiable and field specific, and verification shows the recipient, the status, the issue date, and the badge metadata, without exposing the confidential dossier.

What the participant carries during and after. During the program they accumulate the weekly badges and the phase ranks, so their progress is visible at every step. After it, if certified, they hold a field specific credential and a living dossier they can keep updating as their work evolves, plus [CONFIRM: state any alumni access or ongoing benefit]. They also understand that program details and terms are set for the current year and may be refreshed each year, with notice given through the site.

Finally, the discipline that protects you through all of this. The structure, the phases, the assets, the dossier, the criteria, and the outcomes are fixed, and you state them with confidence. The operational specifics, the hours, the format, the support model, the deadlines, the tools, and the review time, come from the current official details, and you quote those, never a guess. When you do not know a current operational answer, you say you will confirm it and you do, rather than filling the silence with something invented. That habit is exactly what keeps every promise you make true, and it is what separates a partner a prospect trusts from one they do not.

One line for the module. Know the fixed twelve week structure cold and explain it with full confidence, and for every operational detail use the current official answer rather than guessing, so a prospect never hears a vague or invented response.


<a id="m12-ex"></a>
### Exercises (6)

**Exercise 1.** Which part of the twelve weeks is fixed and can be stated with full confidence?

- A. The exact weekly hours
- B. The four phases, the eight assets, the dossier, the criteria, and the outcomes  **(correct)**
- C. The coaching schedule
- D. The extension policy

**Answer:** B. The four phases, the eight assets, the dossier, the criteria, and the outcomes

**Explanation:** The structure, phases, assets, dossier, criteria, and outcomes are fixed. The hours, coaching schedule, and extension policy are operational details set by the current program.

**Exercise 2.** By the end of the Frame phase, what has the participant produced?

- A. The final dossier and roadmap
- B. The Personal AI Strategy Brief, the AI Use Case Portfolio, and the first dossier sections  **(correct)**
- C. The value and economics case
- D. Nothing yet

**Answer:** B. The Personal AI Strategy Brief, the AI Use Case Portfolio, and the first dossier sections

**Explanation:** Frame produces the strategy brief, the use case portfolio, and the opening dossier sections. The value case and final dossier come in later phases, and the participant is producing from week one.

**Exercise 3.** A prospect asks how many hours per week the program takes, and you are not certain of the current figure. What do you do?

- A. Estimate a number that sounds reasonable
- B. Say you will confirm the current figure, and then do  **(correct)**
- C. Tell them it does not matter
- D. Promise it is very light

**Answer:** B. Say you will confirm the current figure, and then do

**Explanation:** Operational details come from the current official answer, so you confirm rather than guess. Estimating, dismissing the question, or promising it is light all risk stating something false.

**Exercise 4.** What is the real prerequisite for the program?

- A. Strong coding skills
- B. Professional judgment and genuine domain expertise  **(correct)**
- C. A technical degree
- D. Prior AI certification

**Answer:** B. Professional judgment and genuine domain expertise

**Explanation:** The prerequisite is professional judgment and domain expertise, not coding, a technical degree, or a prior certification.

**Exercise 5.** A Strong Draft outcome means what?

- A. The participant failed and is removed
- B. The work is close, with specific revisions returned before certification  **(correct)**
- C. The credential is awarded anyway
- D. The program restarts

**Answer:** B. The work is close, with specific revisions returned before certification

**Explanation:** Strong Draft returns specific revisions on the path to certification. It is not a removal, an automatic pass, or a restart.

**Exercise 6.** Which operational detail must a partner take from the current official source rather than invent?

- A. The number of phases
- B. The support and coaching model  **(correct)**
- C. The three outcomes
- D. The eight assets

**Answer:** B. The support and coaching model

**Explanation:** The support model is an operational detail that comes from current official details. The number of phases, the outcomes, and the assets are fixed structure.

<a id="m12-exam"></a>
### Final exam pool (12)

**Exam 1.** A partner can always explain which of the following without checking anything?

- A. The current weekly time commitment
- B. The fixed four phase structure and what is produced at each gate  **(correct)**
- C. The current coaching response times
- D. The extension policy this term

**Answer:** B. The fixed four phase structure and what is produced at each gate

**Explanation:** The fixed structure is always stateable. Time commitment, coaching response times, and the extension policy are operational details that must come from current official information.

**Exam 2.** What does the participant have completed by the end of the Design phase?

- A. Only a strategy brief
- B. The decision kit, the knowledge pack, the evaluation rubric and test set, a working system, and the Design dossier sections  **(correct)**
- C. The final ninety day roadmap
- D. Nothing tangible

**Answer:** B. The decision kit, the knowledge pack, the evaluation rubric and test set, a working system, and the Design dossier sections

**Explanation:** Design produces the decision kit, knowledge pack, rubric and test set, the working system, and the Design dossier sections. The roadmap is a Foresee deliverable, and Design produces far more than a brief.

**Exam 3.** When is the complete dossier submitted for review?

- A. At the end of Frame
- B. At the end of the Foresee phase, in week twelve  **(correct)**
- C. Before the program starts
- D. Halfway through

**Answer:** B. At the end of the Foresee phase, in week twelve

**Explanation:** The complete dossier is submitted at the end of Foresee, in week twelve. It is not submitted at the end of Frame, before the program, or halfway.

**Exam 4.** A prospect asks about the support model and the partner does not know the current details. The right move is which of these?

- A. Describe a support model that sounds good
- B. Give the current official description, or say they will confirm it and then do  **(correct)**
- C. Say support does not matter for serious people
- D. Promise unlimited one to one coaching

**Answer:** B. Give the current official description, or say they will confirm it and then do

**Explanation:** The partner uses the current official description or confirms before answering. Inventing a model, dismissing the question, or promising unlimited coaching risks a false statement.

**Exam 5.** Which statement about the program structure is true and fixed?

- A. The number of phases changes by cohort
- B. Across the twelve weeks the participant builds eight connected assets into one reviewed dossier  **(correct)**
- C. The dossier has no fixed sections
- D. The outcomes vary each year

**Answer:** B. Across the twelve weeks the participant builds eight connected assets into one reviewed dossier

**Explanation:** The eight assets and the single reviewed dossier are fixed. The phase count, the dossier sections, and the three outcomes do not vary by cohort or year.

**Exam 6.** Why does every week of the program end in something the participant made?

- A. It does not, most weeks are just watching videos
- B. Because each week has a defined deliverable and a milestone badge, so progress is real and visible  **(correct)**
- C. Because the program is unstructured
- D. Because the participant chooses whether to do any work

**Answer:** B. Because each week has a defined deliverable and a milestone badge, so progress is real and visible

**Explanation:** Each week produces a deliverable and a badge, making progress visible. It is not passive video watching, unstructured, or optional.

**Exam 7.** What are the three review outcomes a participant can receive?

- A. Pass, Fail, and Retry
- B. Certified, Strong Draft, and Completed  **(correct)**
- C. Gold, Silver, and Bronze
- D. Accepted, Pending, and Rejected

**Answer:** B. Certified, Strong Draft, and Completed

**Explanation:** The three outcomes are Certified, Strong Draft, and Completed. The other sets are not the program's outcomes.

**Exam 8.** A prospect with no domain expertise and no real problem wants to join. What is the honest answer?

- A. Everyone benefits, so enroll them
- B. The program needs genuine domain expertise and a real problem, so it is not the right fit  **(correct)**
- C. Promise it will be easy for them
- D. Tell them coding will carry them through

**Answer:** B. The program needs genuine domain expertise and a real problem, so it is not the right fit

**Explanation:** The program requires domain expertise and a real problem, so a true beginner is not the fit. Enrolling them, promising ease, or pointing to coding are all wrong.

**Exam 9.** How should a partner describe operational specifics like format and deadlines?

- A. From their own best guess
- B. From the current official details, and confirm anything they are unsure of  **(correct)**
- C. However makes the program sound easiest
- D. By promising whatever the prospect wants to hear

**Answer:** B. From the current official details, and confirm anything they are unsure of

**Explanation:** Operational specifics come from current official details, with confirmation when unsure. Guessing, optimizing for easy, or telling people what they want to hear all risk false claims.

**Exam 10.** After certification, what does the participant continue to hold?

- A. Nothing beyond a certificate of attendance
- B. A field specific credential and a living dossier they can keep updating as their work evolves  **(correct)**
- C. Only access to the weekly videos
- D. A guarantee of future results

**Answer:** B. A field specific credential and a living dossier they can keep updating as their work evolves

**Explanation:** After certification the participant keeps a field specific credential and a living, updatable dossier. It is not mere attendance, video access, or a guarantee.

**Exam 11.** A Strong Draft is best described to a prospect as which of these?

- A. A failure that ends the program
- B. A near miss with specific revisions returned, on the path to the credential  **(correct)**
- C. The same as Certified
- D. A reason to never apply

**Answer:** B. A near miss with specific revisions returned, on the path to the credential

**Explanation:** Strong Draft is a near miss with a clear path forward through revisions. It is not a failure, not identical to Certified, and not a deterrent.

**Exam 12.** How should a partner hold the twelve week mechanics in their head?

- A. Improvise the details to keep the conversation moving
- B. Explain the fixed twelve week structure with confidence and use the current official answer for every operational detail rather than guessing  **(correct)**
- C. Promise whatever schedule the prospect prefers
- D. Avoid talking about how the program works

**Answer:** B. Explain the fixed twelve week structure with confidence and use the current official answer for every operational detail rather than guessing

**Explanation:** Hold it as confident structure plus official answers for operational details. Improvising, promising any schedule, or avoiding the topic all undercut trust. --- ## 24.


---

<a id="m13"></a>
## Module 13: Selling to Organizations and to Individuals

<a id="m13-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 13 |
| Slug | `motions` |
| Title | Selling to Organizations and to Individuals |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 12 is passed (sequential gating). |

**Summary.** Selling to organizations and to individuals: the two motions, the unit of sale, and how each is handled.

<a id="m13-obj"></a>
### Learning objectives

- Tell, within the first minutes of a conversation, whether you are in a B2C Charter or a B2B Engagement.
- Run the individual sale on personal relevance and trust, and guide the prospect to apply.
- Frame the organizational sale as a business case in the leader's own terms, never as a personal credential.
- Count the unit of sale correctly: a seat is one enrolled professional, so a team deal is a number of seats.
- Run land and expand with a pilot cohort, register the opportunity at its real scope, and respect the scope rule.
- Spot the moment a strong individual prospect is actually the door to a whole team, and shift without losing their trust.

<a id="m13-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

The same twelve week certification is sold two very different ways, and a partner who blurs them loses both. Selling to one professional who enrolls themselves is the B2C Charter. Selling seats to an organization that wants to develop its people is the B2B Engagement. The product does not change. The buyer, the motivation, the conversation, and the path to a decision all do. This module puts the two motions side by side so you can run whichever one the situation calls for.

##### What you will be able to do

- Tell, within the first minutes of a conversation, whether you are in a B2C Charter or a B2B Engagement.
- Run the individual sale on personal relevance and trust, and guide the prospect to apply.
- Frame the organizational sale as a business case in the leader's own terms, never as a personal credential.
- Count the unit of sale correctly: a seat is one enrolled professional, so a team deal is a number of seats.
- Run land and expand with a pilot cohort, register the opportunity at its real scope, and respect the scope rule.
- Spot the moment a strong individual prospect is actually the door to a whole team, and shift without losing their trust.

##### What you need to understand

###### The B2C Charter: buyer and participant are the same person

Here the person deciding and the person enrolling are one experienced professional investing in their own standing. Their motivation is personal: to move from using AI to leading it in their field, to hold a defensible, verifiable credential built on their own real work, and to be ahead of peers who are still improvising. This is the multiplier in action. The program multiplies an AI method onto expertise the person already has, so the input has to be real. Ten times zero is still zero. A senior professional with a real field is exactly the input that multiplies. The decision is theirs alone, so the sale turns on personal relevance and trust, and your commission follows the B2C Charter rates by function.

###### The B2B Engagement: the buyer is not the participant

The buyer is usually a leader responsible for capability, risk, or transformation: a head of learning and development, an HR or talent leader, a transformation or innovation lead, a department head, or an executive sponsor. They are not buying a personal credential. They are buying an outcome for the organization, a group of their people who can lead AI adoption responsibly, with a consistent method, documented governance, and defensible work, instead of a scattered set of individuals each improvising on their own. The unit is the seat: one enrolled professional. A B2B engagement is simply a number of seats bought for a team, and your commission follows the B2B Engagement rates and the per deal cap.

###### The business case, framed in the leader's terms

The problem you solve for a leader is that inconsistent and risky AI use across their team becomes a shared, governed standard. People who were improvising start producing reviewed, defensible work. The organization builds real internal capability instead of depending on outside help for every AI decision. And the leader can see proof, because every participant produces a dossier reviewed against public criteria. You never promise a specific business result or a return figure you cannot stand behind, but you can honestly describe the capability, the consistency, and the governance the program builds. That is exactly what a responsible leader is trying to buy.

###### The organizational decision and land and expand

The B2B decision runs through several stakeholders: the sponsor who wants the outcome, the people who will participate, and often a procurement or finance step. The motion that works is land and expand. You propose a small first group, a pilot cohort, so the organization can see the quality of the work and the credential before committing more seats, and then you grow from there. You register the opportunity on the Panel at its real scope, keep it active with documented progress, and respect the scope rule: a registered account covers only the confirmed scope, so other departments, affiliates, or countries are not included unless the company expressly adds them.

##### How to use it

Identify the buyer before you position anything. If the person in front of you is deciding for themselves, run the B2C conversation you already know: open with their challenge, match their field story, give the honest mini pitch, point to the current approved details and the application, and guide them to apply, since payment follows acceptance. If the buyer is responsible for other people, switch to the business case, propose a pilot, and register the opportunity. Your job in detection here is the same as everywhere else: detection, not persuasion. You are reading which motion is true, not talking someone into a buyer role they do not occupy.

> **Say this:** "If a few people on your team are each improvising with AI in different ways, a pilot cohort gives you a shared method, reviewed work, and documented governance you can actually point to. Start with a small group, see the quality, then decide on more seats."

> **Do not say this:** "Enroll the whole department now and you will see a return of USD 1,200 per person in productivity." You never promise a result or a return figure, the deal size does not relax that rule, and demanding full commitment before a pilot is the wrong motion.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| "Can you just give us a team discount and we will sign everyone?" | You do not set price or give discounts in either motion. Point to the current approved details, and propose a pilot so they see the quality before scaling. |
| "What return will we get on this for the organization?" | You cannot promise a return figure. You can honestly describe the capability, the consistency, and the governance the program builds, and the reviewed dossier each participant produces as proof. |
| "We registered one department, so the rest of the company is covered too, right?" | No. A registration covers only its confirmed scope. Another department, affiliate, or country is included only when the company expressly adds it. |
| "I am just one person, why are you talking about my team?" | Only raise the team if they raise it. When a senior prospect mentions colleagues who share the problem, it is honest to ask whether a small group should explore it together. |
| "Can we skip the pilot to save time?" | The pilot is what lets you see the quality of the work and the credential before committing more seats. It builds confidence rather than slowing the deal for no reason. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The Panel deal registration screen, where you log a B2B opportunity at its real scope: the legal entity, the country, the business unit, the contact, the estimated seats and value, and your route in. The opportunity is protected only once the company confirms it.

> **Form preview:**
> Form preview, placeholder

The application a B2C prospect completes themselves, where they describe their expertise and the real problem they want to work on. Acceptance comes first, and only then is there a payment decision.

##### Talking points

- Same product, different buyer: the twelve week certification does not change between the two motions.
- B2C turns on personal relevance and trust; B2B turns on a business case run through several stakeholders.
- A seat is one enrolled professional, so fifteen people is fifteen seats, not one license.
- Land and expand: a pilot cohort first, then growth once the organization has seen the quality.
- A senior, enthusiastic individual is often the door to their whole team.
- The limits never relax for a bigger deal.

> **Mistakes to avoid:** Treating every conversation as the same sale. Pitching a personal credential to a leader who wants a team outcome. Forgetting to switch when an individual mentions a team of ten. Assuming a single department registration covers the whole company. Relaxing any guardrail because the deal is large: you still never bind the company, quote outside approved materials, discount, promise results, accept payment, or issue invoices.

##### Summary checklist

- I can tell whether a conversation is a B2C Charter or a B2B Engagement.
- I can run the individual sale on personal relevance and guide the prospect to apply.
- I can frame the organizational value as a governed standard and reviewed, defensible work, without promising a return.
- I can count seats correctly and register an opportunity at its confirmed scope.
- I can propose a pilot cohort and run land and expand.
- I can recognize when an individual is the door to a team, and shift without losing trust.
- I hold every limit identically in both motions.

##### A real scenario

Priya is a head of learning and development at a mid size insurer. She reaches out after a colleague enrolled as an individual and produced a dossier she could actually read and judge. She does not want a personal credential. She wants twelve of her people, who are each using AI loosely and inconsistently, to share one method with documented governance, because compliance is watching. You do not promise her a number. You describe the shared standard, the reviewed work, and the internal capability the program builds, and you propose a pilot of three first so she can see the quality. You register the opportunity at that confirmed scope, and you leave the rest of the company out until she expressly adds it.

##### How this maps to your exam

The exam checks that you can name the core difference between the two motions (same product, different buyer, motivation, and decision path), identify the B2B buyer and what they are purchasing, count seats correctly, and confirm that no limit changes for a larger deal. Expect a question on when a B2C conversation becomes a B2B door and why a pilot cohort comes first.

<a id="m13-plain"></a>
### Lesson body (plain prose / audio text)

The program is sold two very different ways, and a partner who blurs them loses both. Selling to one experienced professional who enrolls themselves is a business to consumer sale, the B2C Charter. Selling seats to an organization that wants to develop its people is a business to business sale, the B2B Engagement. The product is the same twelve week certification, but the buyer, the motivation, the conversation, and the path to a decision are different. This module is the two motions side by side, so you can run whichever one the situation calls for.

Start with the individual sale, the B2C Charter. Here the buyer and the participant are the same person, an experienced professional deciding to invest in their own standing. Their motivation is personal: to move from using AI to leading it in their field, to hold a defensible, verifiable credential built on their own real work, and to be ahead in a market where most of their peers are not. The conversation is the one you already know from the earlier modules: open with their challenge, match their field story, give the honest mini pitch, handle price by pointing to the current approved details and the application, and guide them to apply, since payment follows acceptance. The decision is theirs alone, so the sale turns on personal relevance and trust. Your commission here follows the B2C Charter rates by function.

Now the organizational sale, the B2B Engagement, which is a different motion and where the larger deals live. Here the buyer is not the participant. The buyer is usually a leader responsible for capability, risk, or transformation: a head of learning and development, an HR or talent leader, a transformation or innovation lead, a department head, or an executive sponsor. They are not buying a personal credential. They are buying an outcome for the organization, a group of their people who can lead AI adoption responsibly, with a consistent method, documented governance, and defensible work, rather than a scattered set of individuals each improvising with AI on their own. Remember the unit: a seat is one enrolled professional, so a B2B engagement is simply a number of seats bought for a team, and your commission follows the B2B Engagement rates and the per deal cap.

The organizational conversation is built around a business case, not a personal one, and you frame it in the leader's terms. The problem you are solving for them is that inconsistent and risky AI use across their team becomes a shared, governed standard. People who were improvising start producing reviewed, defensible work. The organization builds real internal capability instead of depending on outside help for every AI decision. And the leader can see proof, because every participant produces a dossier reviewed against public criteria. You never promise a specific business result or a return figure you cannot stand behind, but you can honestly describe the capability, the consistency, and the governance the program builds, which is exactly what a responsible leader is trying to buy.

The organizational decision also runs differently, and you should expect that and work with it. There are usually several stakeholders: the sponsor who wants the outcome, the people who will participate, and often a procurement or finance step. The motion that works is land and expand. You propose a small first group, a pilot cohort, so the organization can see the quality of the work and the credential before committing more seats, and then you grow from there. You register the organizational opportunity on the Panel with the real scope, you keep it active with documented progress, and you respect the scope rule: a registered account covers only the confirmed scope, so other departments, affiliates, or countries are not included unless the company expressly adds them.

Watch for the moment a B2C conversation is actually a B2B door, because this is where a single good conversation becomes a large deal. An individual professional who is enthusiastic and senior is often the way into their whole team. When one prospect could bring ten colleagues, you are no longer in a personal sale, you are in an organizational one, and you shift the conversation toward the team outcome and a pilot. Recognizing that switch, and handling it without losing the individual's trust, is one of the most valuable instincts a partner can build.

Keep the limits the same in both motions, because the rules do not relax for a bigger deal. In neither motion do you bind the company, quote outside approved materials, give discounts, promise results, accept payment, or issue invoices. The company handles acceptance, payment, and delivery in both. Your job in both is to bring the right buyer to the door honestly and register the opportunity correctly. The difference is who the buyer is and what they are buying, not what you are allowed to promise.

One line for the module. A B2C Charter sale is to an individual investing in their own credential and turns on personal relevance, a B2B Engagement is seats sold to an organization and turns on a business case run through several stakeholders with a pilot first, and a strong individual prospect is often the door to a whole team.


<a id="m13-ex"></a>
### Exercises (6)

**Exercise 1.** In a B2C Charter sale, who is the buyer?

- A. An organization buying for its team
- B. The individual professional who will also be the participant  **(correct)**
- C. A procurement department
- D. An executive sponsor

**Answer:** B. The individual professional who will also be the participant

**Explanation:** In a B2C Charter sale the buyer and the participant are the same individual. Organizations, procurement, and sponsors belong to the B2B motion.

**Exercise 2.** In a B2B Engagement, who is usually the buyer?

- A. The participant themselves
- B. A leader responsible for capability, risk, or transformation, such as an L&D or HR leader  **(correct)**
- C. A random employee
- D. An outside vendor

**Answer:** B. A leader responsible for capability, risk, or transformation, such as an L&D or HR leader

**Explanation:** The B2B buyer is typically a capability, risk, or transformation leader. It is not the participant, a random employee, or an outside vendor.

**Exercise 3.** What is a seat?

- A. A discount tier
- B. One enrolled professional  **(correct)**
- C. A physical classroom place
- D. A coaching session

**Answer:** B. One enrolled professional

**Explanation:** A seat is one enrolled professional, so a team deal is a number of seats. It is not a discount, a classroom place, or a session.

**Exercise 4.** What motion works best for an organizational sale?

- A. Demand the whole organization commit at once
- B. Land and expand, starting with a pilot cohort, then grow  **(correct)**
- C. Skip the pilot and sign everyone
- D. Sell to individuals only and avoid the organization

**Answer:** B. Land and expand, starting with a pilot cohort, then grow

**Explanation:** Land and expand with a pilot lets the organization see quality before committing more. Demanding full commitment, skipping the pilot, or avoiding the org entirely are weaker or wrong.

**Exercise 5.** You registered a deal for one department, and a second department now wants to join. What is true?

- A. The second department is automatically covered by your registration
- B. Your registration covers only its confirmed scope, so the new department is not included unless the company expressly adds it  **(correct)**
- C. You can quietly extend the deal yourself
- D. The whole company is yours once one department signs

**Answer:** B. Your registration covers only its confirmed scope, so the new department is not included unless the company expressly adds it

**Explanation:** A registration covers only its confirmed scope, so a new department must be expressly added by the company. It is not automatic, not self extended, and not company wide.

**Exercise 6.** When does a B2C conversation become a B2B opportunity?

- A. Never, they are always separate
- B. When a single enthusiastic, senior prospect could bring their whole team  **(correct)**
- C. Only after the individual certifies
- D. Only if procurement calls first

**Answer:** B. When a single enthusiastic, senior prospect could bring their whole team

**Explanation:** A senior, enthusiastic individual is often the door to their team, which turns it into a B2B opportunity. It is not always separate, not gated on certification, and not dependent on procurement calling.

<a id="m13-exam"></a>
### Final exam pool (12)

**Exam 1.** What is the core difference between the B2C and B2B motions?

- A. The product is different
- B. The buyer, the motivation, the conversation, and the decision path differ, while the product is the same  **(correct)**
- C. The rules are looser in B2B
- D. Only the price changes

**Answer:** B. The buyer, the motivation, the conversation, and the decision path differ, while the product is the same

**Explanation:** The same product is sold to a different buyer with a different motivation and decision path. The product is not different, the rules do not loosen, and it is more than price.

**Exam 2.** A B2C Charter sale turns mainly on what?

- A. A multi stakeholder business case
- B. Personal relevance and trust for the individual  **(correct)**
- C. Procurement approval
- D. A pilot cohort

**Answer:** B. Personal relevance and trust for the individual

**Explanation:** The individual sale turns on personal relevance and trust. The business case, procurement, and pilot belong to the organizational motion.

**Exam 3.** What is a B2B buyer actually purchasing?

- A. A personal credential for themselves
- B. An organizational outcome, a team that can lead AI adoption with consistent method and governance  **(correct)**
- C. A single seat for one person
- D. A discount package

**Answer:** B. An organizational outcome, a team that can lead AI adoption with consistent method and governance

**Explanation:** The B2B buyer purchases a team level capability and governance outcome. It is not a personal credential, a single seat, or a discount.

**Exam 4.** How should a partner frame the value to an organizational buyer?

- A. Promise a specific return figure
- B. Describe how risky, inconsistent AI use becomes a governed standard with reviewed, defensible work  **(correct)**
- C. Guarantee revenue growth
- D. Focus only on the personal credential

**Answer:** B. Describe how risky, inconsistent AI use becomes a governed standard with reviewed, defensible work

**Explanation:** You honestly describe the move to a governed standard and defensible work. You do not promise a return figure, guarantee growth, or reduce it to a personal credential.

**Exam 5.** A team of fifteen people is being enrolled. In terms of the unit of sale, that is what?

- A. One charter
- B. Fifteen seats  **(correct)**
- C. A single license
- D. A coaching package

**Answer:** B. Fifteen seats

**Explanation:** Fifteen enrolled professionals is fifteen seats. It is not one charter, a single license, or a coaching package.

**Exam 6.** Why propose a pilot cohort to an organization?

- A. To slow the deal down for no reason
- B. So the organization can see the quality of the work and the credential before committing more seats  **(correct)**
- C. Because pilots are required by law
- D. To avoid registering the account

**Answer:** B. So the organization can see the quality of the work and the credential before committing more seats

**Explanation:** A pilot lets the buyer see quality before scaling, which builds confidence. It is not pointless delay, a legal requirement, or a way to skip registration.

**Exam 7.** Which stakeholders typically appear in a B2B decision?

- A. Only the participant
- B. A sponsor who wants the outcome, the people who will participate, and often procurement or finance  **(correct)**
- C. Only an outside consultant
- D. No one, it is a solo decision

**Answer:** B. A sponsor who wants the outcome, the people who will participate, and often procurement or finance

**Explanation:** B2B decisions usually involve a sponsor, the participants, and a procurement or finance step. It is not a solo or single party decision.

**Exam 8.** A senior individual prospect is excited and mentions their team of ten. What should the partner do?

- A. Keep it a personal sale only
- B. Shift toward the team outcome and a pilot, since this is now an organizational opportunity  **(correct)**
- C. Ignore the team
- D. Promise the team guaranteed results

**Answer:** B. Shift toward the team outcome and a pilot, since this is now an organizational opportunity

**Explanation:** A senior prospect with a team is a B2B door, so shift to the team outcome and a pilot. Keeping it personal, ignoring the team, or promising results are all wrong.

**Exam 9.** How do the commission contexts map to the two motions?

- A. Both use the same single rate
- B. The individual sale follows B2C Charter rates and the organizational sale follows B2B Engagement rates, each by function and within the per deal cap  **(correct)**
- C. Commission does not depend on the motion
- D. The partner sets the rate

**Answer:** B. The individual sale follows B2C Charter rates and the organizational sale follows B2B Engagement rates, each by function and within the per deal cap

**Explanation:** B2C Charter rates apply to the individual sale and B2B Engagement rates to the organizational one, by function and within the cap. There is not a single flat rate, and the partner does not set it.

**Exam 10.** Which limit changes when the deal is a large organizational one?

- A. The partner may now quote outside approved materials
- B. None of the limits change, you still never bind the company, quote outside approved materials, discount, promise results, accept payment, or invoice  **(correct)**
- C. The partner may now give discounts
- D. The partner may now accept payment

**Answer:** B. None of the limits change, you still never bind the company, quote outside approved materials, discount, promise results, accept payment, or invoice

**Explanation:** The limits hold regardless of deal size. A bigger deal does not allow quoting outside approved materials, discounting, promising results, or taking payment.

**Exam 11.** Who handles acceptance, payment, and delivery in both motions?

- A. The partner
- B. The company  **(correct)**
- C. Procurement
- D. The participant

**Answer:** B. The company

**Explanation:** The company handles acceptance, payment, and delivery in both the B2C and B2B motions. It is not the partner, procurement, or the participant.

**Exam 12.** What is the essence of the two selling motions?

- A. Treat every sale the same way
- B. B2C turns on personal relevance, B2B turns on a business case run through several stakeholders with a pilot first, and a strong individual is often the door to a whole team  **(correct)**
- C. Promise organizations a guaranteed return
- D. Relax the rules for bigger deals

**Answer:** B. B2C turns on personal relevance, B2B turns on a business case run through several stakeholders with a pilot first, and a strong individual is often the door to a whole team

**Explanation:** The essence is two distinct motions plus the individual to team door. Treating all sales alike, guaranteeing returns, and relaxing rules are the opposite of the module. --- ## 25.


---

<a id="m14"></a>
## Module 14: Customizing for Any Industry, Organization, or Person

<a id="m14-meta"></a>
### Metadata

| Field | Value |
| --- | --- |
| Module number | 14 |
| Slug | `customize` |
| Title | Customizing for Any Industry, Organization, or Person |
| Pass mark | 80% |
| Exam size (questions per sitting) | 10 |
| Exam cooldown | 24 hours after a failed attempt |
| Content version | v1 |
| Published | Yes |
| Exercise questions | 6 |
| Exam questions | 12 |
| Last edited | Original seed (not edited) |
| Badge | No per-module badge. Contributes to the Partner Academy certificate, awarded when all published modules are passed. |
| Rank | Not applicable to the Partner Academy. Ranks belong to the 12-week program (see appendix). |
| Related certificates | Partner Academy certificate (verifiable, annual). Teaches the program credentials in the appendix. |
| Dependencies | Unlocks after Module 13 is passed (sequential gating). |

**Summary.** Customizing the approach for any industry, while keeping the method and the standard the same.

<a id="m14-obj"></a>
### Learning objectives

- Translate the fixed program into any prospect's world without ever changing a fact.
- Run a discovery conversation that uncovers a prospect's real problems, constraints, and confidential boundaries.
- Name both the highest value, lowest risk AI opportunity and the hard boundary in a field you have never sold into before.
- Map that opportunity to Frame, Design, Prove, and Foresee, and build the prospect's own field story.
- Choose the right emphasis by organization type, from enterprise to startup to regulated environment.
- Hold every guardrail during customization, which is exactly where an eager partner is most tempted to drift.

<a id="m14-lesson"></a>
### Full lesson body (rich content)

_This is the complete production lesson, converted from the stored HTML to Markdown. It contains every callout, table, checklist, talking point, example, objection and answer, scenario, form-preview description, and the exam-alignment section, in place._

The ten field stories in the explorer are examples, not the limit. You will meet prospects in industries and roles that are not on the list, and the skill that makes you genuinely effective is customizing the program's value for anyone, in any field, in any kind of organization, on your own. This module is that method. It is repeatable, it works for a buyer you have never seen before, and it keeps you honest while you do it.

##### What you will be able to do

- Translate the fixed program into any prospect's world without ever changing a fact.
- Run a discovery conversation that uncovers a prospect's real problems, constraints, and confidential boundaries.
- Name both the highest value, lowest risk AI opportunity and the hard boundary in a field you have never sold into before.
- Map that opportunity to Frame, Design, Prove, and Foresee, and build the prospect's own field story.
- Choose the right emphasis by organization type, from enterprise to startup to regulated environment.
- Hold every guardrail during customization, which is exactly where an eager partner is most tempted to drift.

##### What you need to understand

###### The value is fixed, which is what makes customizing safe

You never change what the program is. The method (Frame, Design, Prove, Foresee), the eight assets, the reviewed dossier, the public criteria, and the credential are constant for everyone. What you customize is the translation: how you express that fixed value in the language, the problems, and the constraints of the person in front of you. You are not inventing a new program for each prospect. You are putting the same program into their words. Hold that distinction and you can tailor freely without ever drifting into a false claim. This is also why the screen never moves: the program multiplies a method onto real expertise the person already has, and ten times zero is still zero. A beginner with no field is a zero, and no amount of tailoring changes that. Your job is detection, not persuasion. If you have to convince someone that they are a Pro, they almost always are not.

###### The five step method

1. **Discover their world.** Before you position anything, ask enough to understand what they actually do, where AI is already showing up in their field, what their real problems are, who is affected, and what constraints they live under, especially anything regulated or confidential. You cannot customize what you do not understand, so this step is mostly listening.
2. **Find their highest value, lowest risk opportunity and their hard boundary.** Every field has a place where AI clearly helps and a place where a human must stay in control. Naming both, in their domain, is the core of a credible tailored pitch, and the boundary matters as much as the opportunity, because that is the judgment a serious professional respects.
3. **Map it to the program.** Show how Frame would scope the opportunity and rule out the dangerous uses, how Design would build a responsible workflow, how Prove would test its value with evidence, and how Foresee would turn it into a plan they could lead.
4. **Build their field story.** Walk their specific situation through the twelve weeks the way the explorer does for the ten examples, so they see their own profession, their own problem, and the dossier they would produce.
5. **Present it in their language.** Connect it to what they care about: the personal credential for an individual or the organizational capability for a team.

###### The discovery toolkit

Carry these questions in your head and use them like a real conversation, not an interrogation:

- What are the core tasks and decisions in your work?
- Where are you already using AI, and where does it feel risky or unreliable?
- What is one real problem that would be worth solving properly?
- Who else is affected if you change how this works?
- What can never leave your control or your systems, for legal, ethical, or confidentiality reasons?
- What would proof look like to you, or to your leadership?

Good answers give you everything you need to tailor the rest, and asking them well already signals that you understand their world.

###### Emphasis by organization type

It is the same program every time, with a different emphasis chosen to fit who you are talking to. For a large enterprise, lead with consistency, governance, and risk across many people. For a small or medium business, lead with building real internal capability without depending on expensive outside help for every decision. For a startup, lead with speed and defensible decisions made under pressure. For a regulated environment, lead with the boundaries, the governance, and the confidentiality discipline the program builds, because that is precisely their worry. For a technical team, the credibility is in the evaluation rubric and the working system. For a non technical team, the credibility is in the method and the judgment, since no coding is required.

##### How to use it

Run the five steps in order, every time, regardless of the field. Listen first, name the opportunity and boundary second, then map to the four phases and build the field story. For a serious prospect, especially an organization, assemble a short tailored summary you can leave behind: their problem in their own words, the highest value opportunity and the boundary you identified together, how the four phases would handle it, what they or their people would produce, and the next step, which is to apply or to discuss a pilot. Keep it honest, keep it specific to them, and use only approved materials and current details. This is not a generic brochure. It is their situation reflected back through the program, and that is what makes it land.

> **Say this:** "In your work, the highest value, lowest risk place for AI looks like drafting and synthesis, and the hard boundary is the final judgment that has to stay with a qualified human. Frame would scope exactly that, and Prove would test it with evidence you could defend."

> **Do not say this:** "For your industry we can guarantee this cuts your review time in half." You never promise a result, a number, or an outcome, no matter how tailored the story sounds, and you never invent a program fact to fit a case.

##### Common objections and honest answers

| Objection | How to answer |
| --- | --- |
| "My field is not one of your ten examples." | The ten are examples, not the limit. Discovery lets you build a field story for your exact situation using the same fixed method. |
| "We are regulated, so AI is too risky for us." | That is precisely why the program fits. It is built around naming the hard boundary and the confidentiality discipline, with redacted or fictionalized examples where needed. |
| "My team does not code, so this is not for us." | No coding is required. For a non technical team the credibility sits in the method and the judgment, not in writing software. |
| "Can you tailor the price for our case?" | You never quote a price or offer a discount outside approved materials. You customize the language and emphasis, not the commercial terms. |
| "This only works if you can promise us a specific outcome." | Then this prospect is not a fit. A true tailored pitch never needs a false promise, and customization never makes one acceptable. |

##### Forms and screens you will reference

> **Form preview:**
> Form preview, placeholder

The explorer's field story view, which walks one profession through the twelve weeks. You use it as the model for building a prospect's own story, in their domain, for a field that is not on the list.

> **Form preview:**
> Form preview, placeholder

A tailored leave behind summary, assembled from approved materials: the prospect's problem in their own words, the opportunity and boundary, how the four phases handle it, what their people would produce, and the next step.

##### Talking points

- The program is fixed; only the translation into the prospect's world is customized.
- Discovery is mostly listening, because you cannot customize what you do not understand.
- Name both the opportunity and the boundary; the boundary is what a serious professional respects.
- Map every tailored pitch to Frame, Design, Prove, and Foresee.
- The right emphasis depends on the organization type, but the program does not change.
- The multiplier needs real expertise as its input; detection comes before any tailoring.

> **Mistakes to avoid:** Pitching before you have listened. Naming an opportunity but skipping the hard boundary. Inventing a program fact to fit a case. Promising a result, a number, or an outcome because the story sounds tailored. Quoting a price or offering a discount outside approved materials. Trying to talk a beginner with no field into being a Pro: that is persuasion, not detection, and the input does not multiply.

##### Summary checklist

- I can run discovery as a conversation and uncover real problems and confidential boundaries.
- I can name the highest value, lowest risk opportunity and the hard boundary in an unfamiliar field.
- I can map that opportunity to the four phases and build the prospect's own field story.
- I can choose the right emphasis for an enterprise, an SME, a startup, a regulated environment, and technical or non technical teams.
- I can assemble an honest, specific leave behind summary from approved materials.
- I never change a fact or promise a result while customizing, and I recognize when a prospect is not a fit.

##### A real scenario

Tomas runs operations for a regional logistics firm, a field not in the ten examples. You spend most of the conversation listening: he is already using AI to draft customer updates, but routing decisions feel risky, and some shipment data cannot leave his systems. Together you name the opportunity (faster, clearer customer communication) and the hard boundary (a human owns any routing decision that affects safety or contracts). You map it to the phases, build his field story for the twelve weeks, and leave behind a summary in his words. You never promise a delivery time saved, and because he has a real problem that must pass his leadership's judgment, he is a Pro, and detection, not persuasion, is what closed it.

##### How this maps to your exam

The exam checks that you know why customization is safe (the program is fixed and only the translation changes), the five steps in order, that discovery is mostly listening, and that naming the opportunity and the boundary is what makes a pitch credible. Expect questions on the emphasis for each organization type and on recognizing that a pitch needing a false promise means the prospect is not a fit.

<a id="m14-plain"></a>
### Lesson body (plain prose / audio text)

The ten field stories in the explorer are examples, not the limit. A partner will meet prospects in industries and roles that are not on the list, and the skill that makes you genuinely effective is being able to customize the program's value for anyone, in any field, in any kind of organization, on your own. This module is that method. It is repeatable, it works for a buyer you have never seen before, and it keeps you honest while you do it.

The value you are customizing is fixed, and that is exactly what makes customization safe. You are never changing what the program is. The method, Frame, Design, Prove, Foresee, the eight assets, the reviewed dossier, the public criteria, and the credential are constant for everyone. What you customize is the translation: how you express that fixed value in the language, the problems, and the constraints of the person in front of you. You are not inventing a new program for each prospect. You are putting the same program into their words. Hold that distinction and you can tailor freely without ever drifting into a false claim.

The method has five steps. First, discover their world. Before you position anything, you ask enough to understand what they actually do, where AI is already showing up in their field, what their real problems are, who is affected, and what constraints they live under, especially anything regulated or confidential. You cannot customize what you do not understand, so this step is mostly listening. Second, find their highest value, lowest risk AI opportunity and their hard boundary. Every field has a place where AI clearly helps and a place where a human absolutely must stay in control. Naming both, in their domain, is the core of a credible tailored pitch, and the boundary matters as much as the opportunity, because that is the judgment a serious professional respects. Third, map it to the program. Show how Frame would scope that opportunity and rule out the dangerous uses, how Design would build a responsible workflow for it, how Prove would test its value with evidence, and how Foresee would turn it into a plan they could lead. Fourth, build their field story. Walk their specific situation through the twelve weeks the way the explorer does for the ten examples, so they see their own profession, their own problem, and the dossier they would produce. Fifth, present it in their language and connect it to what they care about, the personal credential for an individual or the organizational capability for a team.

To do the first step well, carry a discovery toolkit in your head and use it like a real conversation, not an interrogation. What are the core tasks and decisions in your work. Where are you already using AI, and where does it feel risky or unreliable. What is one real problem that would be worth solving properly. Who else is affected if you change how this works. What can never leave your control or your systems, for legal, ethical, or confidentiality reasons. What would proof look like to you, or to your leadership. Good answers to these give you everything you need to tailor the rest, and asking them well already signals that you understand their world.

Customizing by the type of organization sharpens it further. For a large enterprise, lead with consistency, governance, and risk across many people. For a small or medium business, lead with building real internal capability without depending on expensive outside help for every decision. For a startup, lead with speed and defensible decisions made under pressure. For a regulated environment, lead with the boundaries, the governance, and the confidentiality discipline the program builds, because that is precisely their worry. For a technical team, the credibility is in the evaluation rubric and the working system. For a non technical team, the credibility is in the method and the judgment, since no coding is required. It is the same program every time, with a different emphasis chosen to fit who you are talking to.

For a serious prospect, especially an organization, it helps to assemble a short tailored summary you can leave behind: their problem in their own words, the highest value opportunity and the boundary you identified together, how the four phases would handle it, what they or their people would produce, and the next step, which is to apply or to discuss a pilot. Keep it honest, keep it specific to them, and use only approved materials and current details. This is not a generic brochure, it is their situation reflected back through the program, and that is what makes it land.

Hold the guardrails the whole time you customize, because customization is exactly where an eager partner is most tempted to drift. You never promise a result, a number, or an outcome, no matter how tailored the story sounds. You never invent a program fact to fit their case, you use the real structure and the current official details. You never quote a price or offer a discount outside approved materials. Customizing the language is your job. Changing the truth is not, and the moment a tailored pitch needs an untrue claim to work, it means the prospect is not a fit, not that the claim is acceptable.

One line for the module. Customize by translating the fixed program into the prospect's world: discover their reality, find their highest value opportunity and their hard boundary, map it to the four phases, build their field story, and present it in their language, while never changing a single fact or promising a single result.


<a id="m14-ex"></a>
### Exercises (6)

**Exercise 1.** When customizing for a prospect, what stays fixed?

- A. Nothing, you build a new program each time
- B. The method, the eight assets, the dossier, the public criteria, and the credential  **(correct)**
- C. The price
- D. The promises you can make

**Answer:** B. The method, the eight assets, the dossier, the public criteria, and the credential

**Explanation:** The program's structure is fixed, and only the translation is customized. You do not build a new program, change the fixed structure, or gain new promises.

**Exercise 2.** What is the first step of the customization method?

- A. Present the mini pitch immediately
- B. Discover their world by asking and mostly listening  **(correct)**
- C. Quote a tailored price
- D. Promise a tailored result

**Answer:** B. Discover their world by asking and mostly listening

**Explanation:** The method starts with discovery, mostly listening. Pitching, quoting, or promising come from skipping the understanding step.

**Exercise 3.** In any field, what two things must a partner be able to name?

- A. The price and the discount
- B. The highest value, lowest risk AI opportunity and the hard boundary  **(correct)**
- C. The fastest tool and the cheapest tool
- D. The guaranteed result and the timeline

**Answer:** B. The highest value, lowest risk AI opportunity and the hard boundary

**Explanation:** A credible tailored pitch names the best opportunity and the hard boundary. Prices, tool comparisons, and guarantees are not the core of customization.

**Exercise 4.** For a regulated environment, what should the partner lead with?

- A. Speed above all
- B. The boundaries, governance, and confidentiality discipline the program builds  **(correct)**
- C. A promise to bypass regulation
- D. The lowest price

**Answer:** B. The boundaries, governance, and confidentiality discipline the program builds

**Explanation:** Regulated buyers worry about boundaries, governance, and confidentiality, so lead there. Speed alone, bypassing rules, or price do not address their real concern.

**Exercise 5.** What is the leave behind summary for a serious prospect?

- A. A generic brochure
- B. Their problem, the opportunity and boundary you found, how the four phases handle it, what they would produce, and the next step  **(correct)**
- C. A price list with discounts
- D. A guarantee of results

**Answer:** B. Their problem, the opportunity and boundary you found, how the four phases handle it, what they would produce, and the next step

**Explanation:** The summary reflects their specific situation through the program. It is not a generic brochure, a discount list, or a guarantee.

**Exercise 6.** When a tailored pitch seems to need an untrue claim to work, what does that mean?

- A. The claim is acceptable because it is tailored
- B. The prospect is not a fit, not that the claim is allowed  **(correct)**
- C. You should promise it quietly
- D. You should invent a supporting fact

**Answer:** B. The prospect is not a fit, not that the claim is allowed

**Explanation:** If a pitch needs an untrue claim, the prospect is not a fit. Customization never makes a false claim acceptable, and you never promise quietly or invent facts.

<a id="m14-exam"></a>
### Final exam pool (12)

**Exam 1.** Why is customization safe to do freely?

- A. Because you can change the program to fit anyone
- B. Because the program is fixed and you only customize the translation into their world  **(correct)**
- C. Because tailored claims do not need to be true
- D. Because the rules do not apply while customizing

**Answer:** B. Because the program is fixed and you only customize the translation into their world

**Explanation:** Safety comes from a fixed program and a customized translation, not from changing the program, relaxing truth, or ignoring rules.

**Exam 2.** What are the five steps of the customization method in order?

- A. Pitch, price, promise, close, register
- B. Discover their world, find the opportunity and boundary, map it to the phases, build their field story, present in their language  **(correct)**
- C. Present, discount, guarantee, sign, deliver
- D. Guess, assert, pressure, close

**Answer:** B. Discover their world, find the opportunity and boundary, map it to the phases, build their field story, present in their language

**Explanation:** The five steps are discover, find the opportunity and boundary, map to phases, build the field story, and present in their language. The other sequences describe pushy or invented selling.

**Exam 3.** Discovery is mostly which activity?

- A. Talking and pitching
- B. Asking and listening to understand their world  **(correct)**
- C. Quoting prices
- D. Making promises

**Answer:** B. Asking and listening to understand their world

**Explanation:** Discovery is mostly listening to understand. It is not pitching, quoting, or promising.

**Exam 4.** What makes a tailored pitch credible to a serious professional?

- A. Naming the highest value opportunity and the hard boundary in their domain  **(correct)**
- B. Promising the biggest possible result
- C. Hiding the limits of AI
- D. Offering the lowest price

**Answer:** A. Naming the highest value opportunity and the hard boundary in their domain

**Explanation:** Credibility comes from naming both the opportunity and the boundary in their field. Promises, hidden limits, and low price do not build it.

**Exam 5.** For a small or medium business, what should the partner emphasize?

- A. Bypassing all governance
- B. Building real internal capability without depending on expensive outside help for every decision  **(correct)**
- C. A guaranteed revenue figure
- D. That coding is required

**Answer:** B. Building real internal capability without depending on expensive outside help for every decision

**Explanation:** SMEs value internal capability over constant outside dependence. Bypassing governance, guaranteeing figures, and requiring coding are all wrong.

**Exam 6.** For a non technical team, where does the credibility of the program sit?

- A. In the requirement to code
- B. In the method and the judgment, since no coding is required  **(correct)**
- C. In a guarantee of outcomes
- D. In the lowest price

**Answer:** B. In the method and the judgment, since no coding is required

**Explanation:** For non technical teams the credibility is the method and judgment, with no coding needed. It is not coding, guarantees, or price.

**Exam 7.** Which question belongs in the discovery toolkit?

- A. What is the largest discount you expect
- B. What can never leave your control or your systems, for legal, ethical, or confidentiality reasons  **(correct)**
- C. Will you promise to enroll today
- D. How quickly can you pay

**Answer:** B. What can never leave your control or your systems, for legal, ethical, or confidentiality reasons

**Explanation:** A discovery question uncovers their constraints, like what must stay in their control. Discounts, pressure to enroll, and payment speed are not discovery.

**Exam 8.** A partner is customizing a pitch and realizes it only works if they promise a specific result. What is correct?

- A. Make the promise since it is tailored
- B. Recognize the prospect is not a fit, because a true tailored pitch never needs a false promise  **(correct)**
- C. Invent a supporting statistic
- D. Offer a discount instead

**Answer:** B. Recognize the prospect is not a fit, because a true tailored pitch never needs a false promise

**Explanation:** Needing a false promise means the prospect is not a fit. Making the promise, inventing a statistic, or substituting a discount all break the guardrails.

**Exam 9.** What does the partner customize, and what stays constant?

- A. The partner customizes the program facts and keeps the price constant
- B. The partner customizes the language and emphasis, while the method, dossier, criteria, and credential stay constant  **(correct)**
- C. The partner customizes the truth and keeps the pitch constant
- D. Everything is customized including the promises

**Answer:** B. The partner customizes the language and emphasis, while the method, dossier, criteria, and credential stay constant

**Explanation:** Language and emphasis are customized while the program structure stays constant. Facts, truth, and promises are never customized.

**Exam 10.** What should a leave behind summary for an organization contain?

- A. A discount schedule
- B. Their problem in their words, the opportunity and boundary, how the phases handle it, what their people would produce, and the next step  **(correct)**
- C. A guarantee of return on investment
- D. A generic product brochure

**Answer:** B. Their problem in their words, the opportunity and boundary, how the phases handle it, what their people would produce, and the next step

**Explanation:** The summary reflects their specific situation through the program and points to the next step. It is not a discount schedule, a guarantee, or a generic brochure.

**Exam 11.** For a startup buyer, the emphasis that fits best is which of these?

- A. Slow, heavy process
- B. Speed and defensible decisions made under pressure  **(correct)**
- C. A promise of guaranteed funding
- D. That the program requires coding

**Answer:** B. Speed and defensible decisions made under pressure

**Explanation:** Startups value speed with defensible decisions under pressure. Heavy process, funding promises, and coding requirements do not fit.

**Exam 12.** What is the core of customizing for any prospect?

- A. Reshape the program for each prospect
- B. Translate the fixed program into the prospect's world through discovery, opportunity and boundary, mapping to the phases, a field story, and their language, while never changing a fact or promising a result  **(correct)**
- C. Promise tailored outcomes to win the deal
- D. Use one generic pitch for everyone

**Answer:** B. Translate the fixed program into the prospect's world through discovery, opportunity and boundary, mapping to the phases, a field story, and their language, while never changing a fact or promising a result

**Explanation:** The core is translating a fixed program into the prospect's world without changing facts or promising results. Reshaping the program, promising outcomes, or using one generic pitch are all wrong. --- ## 26. The Partner Toolkit: ready to use templates Seed these as a Partner Toolkit resource inside the Academy, viewable and downloadable. They are starting points, not scripts to send blindly. Every message a partner sends must still use approved messaging and pass the truth test. Keep placeholders in square brackets so the partner personalizes each one. None of these contain a price or a promise of results, by design. **Warm reconnect, a former colleague or past client** > Subject: A quick thought for you, [first name] > > Hi [first name], it has been a while since [shared context, for example our time at [company] or the [project] work]. I have been close to how experienced professionals in [their field] are moving from just using AI to actually leading its adoption, and you came to mind. If it is useful, I would value a short conversation to share what I am seeing. No pressure either way. How is the next couple of weeks looking for you? **Introduction through a mutual contact** > Subject: [mutual contact] suggested we connect > > Hi [first name], [mutual contact] thought it would be worth us talking. I work with experienced professionals in [their field] who want to lead AI adoption in their work, not just use the tools, and [mutual contact] felt that might be relevant to what you are focused on right now. Would a short call in the next week or two be welcome? Happy to work around your schedule. **Reaching someone in a shared professional circle** > Hi [first name], we are both part of [shared group or community], and I noticed your work on [specific, real detail]. I spend a lot of time on how professionals in [field] build defensible, reviewed AI work in their own domain. If that is something you are thinking about, I would be glad to compare notes over a short call. If not, no problem at all. **Follow up one, adds value** > Hi [first name], following up on my note. I mentioned I would share an example of how someone in [their field] works through this, so here it is in brief: [one or two sentences from the matching field story, framed as an example, not a promise]. If it is worth a short conversation, I am happy to set one up. If the timing is not right, just let me know and I will leave it there. **Follow up two, gracious close** > Hi [first name], I do not want to crowd your inbox, so this is my last note for now. If leading AI adoption in [their field] becomes a priority, I am easy to reach and glad to help. Wishing you well either way. **Guiding a qualified prospect to apply** > It sounds like this could genuinely fit what you are working on. The next step is simple and there is no payment involved yet: you apply and describe your expertise and the real problem you want to work on, and the team reviews it. Acceptance comes first, and only then is there any payment decision. I can point you to the current details and the application whenever you are ready. Would you like me to do that now? **Objection one liners, honest and short** > Is this just another AI course. No. Most courses teach tools and prompts. This is built around one real problem and a reviewed dossier, so you leave with evidence you can defend, not a completion certificate. > > Is it accredited. No. It is a private professional certification. Its credibility comes from the reviewed dossier, the public criteria, and the verifiable credential, not from a university stamp. > > Do I need to code. No. The core requirement is professional judgment in your field, not coding. > > Will I definitely get certified. No. Certification depends on whether your dossier meets the review standard. The three outcomes are Certified, Strong Draft, and Completed. > > Can I join as a regulated professional. Yes, as long as you protect confidential and regulated data and use redacted or fictionalized examples unless you have the rights and safeguards to use real data. **Prospect qualification checklist, run it in your head before you register** > Does this person have real depth in their field. Do they already use AI and feel the gap between using and leading it. Do they have one real problem worth solving. Can they commit focused hours over twelve weeks. Do they want reviewed, defensible work rather than a quick certificate. Do they accept that outcomes are earned, not guaranteed. If the answer to most of these is yes, they are worth registering. If they are an absolute beginner with no domain, or they want a guarantee, they are not a fit, and the honest move is to say so. **Deal registration field checklist, before you submit on the Panel** > The legal entity or individual. The country. The business unit. The contact. The offering. The estimated seats and value. Your role on this opportunity. Your concrete route in, meaning a warm contact, a shared circle, or a real reason you can reach them. Submit only when you can fill each field honestly, and remember it is protected only when the company confirms it. --- ## 27. Quick reference: glossary, brand use, and getting help Seed these as short reference pages inside the Academy.


---

<a id="appendix"></a>
# Appendix: global reference

<a id="pro-vs-tenxpro"></a>
## Pro vs TenXPro (canonical definition)

**A Pro is a real expert. A TenXPro is what they become.**

**A Pro.** A Pro is an expert in a field who already uses AI in a loose, occasional way.

**A TenXPro.** A TenXPro is that same expert, now leading AI adoption with a method, with evidence, and with governance, holding a body of work they can defend. The credential certifies exactly that jump. It does not certify learning AI.

**The multiplier.**

TenX means a multiplier. This program multiplies an AI method onto something you already have. It does not start you from nothing.

Ten times zero is still zero, so the input has to be real. A beginner with no field is a zero: there is nothing to multiply. That is the structural reason the program does not work for a beginner, and it is exactly what the promise says. You bring the expertise. We bring the method.

So the first question of any screening is simple: does this person have a real, multipliable expertise.

**Who this is for.**

- **The department or team lead.** Runs a function in a mid-size or large organization and is being asked what our AI plan is.
- **The consultant or advisor.** Has clients who now ask about AI and needs an approach they can stand behind.
- **The founder or small-business owner.** Makes real build-or-buy AI decisions and lives with the result.
- **The senior specialist in a high-stakes field.** Works in law, medicine, finance, compliance, or HR, where AI is both exciting and dangerous.
- **The researcher or educator.** Needs to bring rigor and discipline to how AI is used.

**The screen.** Does this person have a real problem in their own field that they could spend twelve weeks proving an AI approach against, and does the result have to pass the judgment of someone who matters to them? If the answer is yes to both, they are a Pro.

**For partners.** Your job is detection, not persuasion. This definition is a detection tool. If you have to convince someone that they are a Pro, they almost always are not.

<a id="partner-rules"></a>
## Partner rules referenced by the Academy

Module 3 ("The Rules") is the canonical source. Its scope, verbatim from the module summary:

> Where your right to earn comes from: the five part formula, the Partner Panel as single source of truth, commission by function, tiers, clawback, annual validity, and survival clauses.

The full rules text, with examples and exam, is in [Module 3](#m3). Key principles the Academy enforces throughout:

- Detection, not persuasion: Your job is detection, not persuasion. This definition is a detection tool. If you have to convince someone that they are a Pro, they almost always are not.
- Never promise a job, income, certification, or any outcome a partner cannot control.
- The Partner Panel is the single source of truth for registrations and commissions.
- Commission is earned by function, within caps, and is subject to clawback and annual validity.

<a id="journey"></a>
## Journey explanation (the 12-week program the Academy teaches)

The partner-facing walkthrough is [Module 5](#m5). The canonical program structure (eleven core modules plus the final dossier and capstone review, grouped into four phases):

| Week | Phase | Module | Core question | Milestone badge |
| --- | --- | --- | --- | --- |
| 1 | FRAME | AI Readiness & TenXPro Mindset | Where do I stand, and what kind of AI-adopted professional am I becoming? | TenX Mindset Badge |
| 2 | FRAME | Practical AI Literacy & Hands-On Tool Fluency | What can AI realistically do, and how do I use it responsibly in real work? | AI Core Badge |
| 3 | FRAME | Responsible AI & Professional Boundaries | What should I not automate, disclose, or delegate? | Responsible AI Badge |
| 4 | FRAME | Problem Discovery & Structured Framing | Which problem is worth solving with AI? | Problem Framing Badge |
| 5 | DESIGN | Context, Stakeholder & Initial Foresight Mapping | Who is affected, and what changes around this solution over time? | Context Mapper Badge |
| 6 | DESIGN | Data, Evidence & Verification Discipline | What evidence can be trusted enough to guide an AI-supported workflow? | Evidence Discipline Badge |
| 7 | DESIGN | Workflow, Task & Human-AI Allocation | What should the human do, what should AI assist, and where does judgment remain? | Workflow Designer Badge |
| 8 | DESIGN | Responsible AI Solution Design | How do I design a solution that is useful, safe, and accountable? | Responsible Solution Badge |
| 9 | PROVE | Adoption, Communication & Change Design | How will people understand, trust, and adopt the solution? | Adoption Designer Badge |
| 10 | PROVE | Value, Roadmap & Proof Plan | How will I prove the solution is worth continuing? | Value Proof Badge |
| 11 | FORESEE | AI Foresight, Scenario Planning & Future-Proofing | How do I keep this solution relevant as AI, work, and risk change? | Foresight Strategist Badge |
| 12 | FORESEE | Final Dossier & Capstone Review | Is the work certifiable? | Capstone Review |

<a id="badges-ranks"></a>
## Badges, ranks, and certificates

### Module milestone badges

| Order | Badge | Awarded for |
| --- | --- | --- |
| 1 | TenX Mindset Badge | Issued when Module 1, AI Readiness & TenXPro Mindset, is passed. |
| 2 | AI Core Badge | Issued when Module 2, Practical AI Literacy & Hands-On Tool Fluency, is passed. |
| 3 | Responsible AI Badge | Issued when Module 3, Responsible AI & Professional Boundaries, is passed. |
| 4 | Problem Framing Badge | Issued when Module 4, Problem Discovery & Structured Framing, is passed. |
| 5 | Context Mapper Badge | Issued when Module 5, Context, Stakeholder & Initial Foresight Mapping, is passed. |
| 6 | Evidence Discipline Badge | Issued when Module 6, Data, Evidence & Verification Discipline, is passed. |
| 7 | Workflow Designer Badge | Issued when Module 7, Workflow, Task & Human-AI Allocation, is passed. |
| 8 | Responsible Solution Badge | Issued when Module 8, Responsible AI Solution Design, is passed. |
| 9 | Adoption Designer Badge | Issued when Module 9, Adoption, Communication & Change Design, is passed. |
| 10 | Value Proof Badge | Issued when Module 10, Value, Roadmap & Proof Plan, is passed. |
| 11 | Foresight Strategist Badge | Issued when Module 11, AI Foresight, Scenario Planning & Future-Proofing, is passed. |

### Ranks

| Rank | Meaning |
| --- | --- |
| AI-Ready Professional | Rank 1 credential for completing the Frame phase. |
| AI Problem Solver & Solution Designer | Rank 2 credential for completing the Design phase. |
| Future-Ready AI Solution Designer | Rank 3 credential for completing the Prove and Foresee phases. |

### Capstone and special

- **Certified TenXPro Capstone Seal.** Issued when a participant is certified after capstone review.
- **Founding Charter Member.** Special badge for the first Founding Charter cohort.
- **Early Charter Member.** Special badge for Early Charter participants.
- **Late Charter Member.** Special badge for Late Charter participants.
- **Final Charter Member.** Special badge for Final Charter participants.

### Partner Academy completion certificate

Issued to a partner when every published Academy module is passed. Carries a unique serial and the calendar year, is verifiable on a public page, and is renewed annually.

<a id="glossary"></a>
## Glossary and canonical terminology

**Pro.** A Pro is an expert in a field who already uses AI in a loose, occasional way.

**TenXPro.** A TenXPro is that same expert, now leading AI adoption with a method, with evidence, and with governance, holding a body of work they can defend. The credential certifies exactly that jump. It does not certify learning AI.

**TenX (the multiplier).** TenX means a multiplier. This program multiplies an AI method onto something you already have. It does not start you from nothing. Ten times zero is still zero, so the input has to be real. A beginner with no field is a zero: there is nothing to multiply. That is the structural reason the program does not work for a beginner, and it is exactly what the promise says. You bring the expertise. We bring the method. So the first question of any screening is simple: does this person have a real, multipliable expertise.

**Detection, not persuasion.** Your job is detection, not persuasion. This definition is a detection tool. If you have to convince someone that they are a Pro, they almost always are not.

**The one-sentence screen.** Does this person have a real problem in their own field that they could spend twelve weeks proving an AI approach against, and does the result have to pass the judgment of someone who matters to them? If the answer is yes to both, they are a Pro.

**Frame (phase).** Weeks 1 to 4. Where does AI belong in the work? Produces the problem definition and an AI suitability assessment.

**Design (phase).** Weeks 5 to 8. How is a responsible solution built? Produces a prototype with guardrails and a workflow allocation.

**Prove (phase).** Weeks 9 to 10. Can the value be shown with evidence? Produces an evaluation rubric, a test set, and a value case.

**Foresee (phase).** Weeks 11 to 12. How is the solution kept relevant as AI, work, and risk change? Produces a foresight plan and the final dossier.

**Living AI Solution Dossier.** The reviewed body of work assembled across the twelve weeks: connected assets from framing to a 90 day roadmap. It is the basis of certification.

**Capstone review.** The final review of the dossier against published criteria, producing certified, conditionally certified, or completed without certification.

**Partner Academy.** The fourteen module training that certifies a partner to represent the program honestly.

**Partner Academy certificate.** The partner's own credential, issued when every published module is passed; carries a serial and year, is verifiable, and is renewed annually.

**Content version.** Per module integer that increments when a superadmin edits a lesson. Passed partners keep their certificate for the year and are notified; not-yet-passed partners take the latest version.

**Pass mark / exam size / cooldown.** The percent required to pass (80%), the number of questions per sitting, and the wait after a failed attempt.

**Activation Gate.** The onboarding checklist a partner completes before any outreach using the TenXPros name; confirmed by the company on the Partner Panel.

**Deal registration.** Registering a prospect in the Partner Panel before pursuing it, which establishes the commission claim.

**B2C Charter / B2B Engagement.** The individual professional motion, and the organizational motion (counted by seats).

**Partner Panel.** The partner's console for registering opportunities and tracking accounts and commissions.

**Commission by function.** Commission paid for the function performed (introduction, qualified origination, strong origination, closing, delivery), by basis points, from two-layer config.

<a id="snippets"></a>
## Reusable snippets (say / avoid / talking points, extracted per module)

_These are pulled verbatim from each module's callouts and talking-point lists, for reuse and review. They also appear in place in each module's lesson body._

### Module 1: The Mission

- SAY: **Say this:** You already use AI every day, so the question is not access. The question is whether you can lead it: build something in your own field that survives a hard question from a board or a regulator. That is the gap this credential is built to close.
- AVOID/NOTE: **Do not say this:** Finish the twelve weeks and you are automatically certified, and it will get you promoted.
- AVOID/NOTE: **Mistakes to avoid:** Do not pitch the program as easy or fast. Do not promise certification, a job, a raise, or any outcome you cannot control. Do not hide the review standard to make it sound simpler, and do not imply it is an accredited degree. Each of those quietly breaks the trust that gives your introduction its weight.
- TALKING POINT: Access to AI is universal now. Judgment is the dividing line.
- TALKING POINT: You bring the expertise. We bring the AI method.
- TALKING POINT: The credential is earned by reviewed work, not attendance.
- TALKING POINT: Productive effort, real success: proof over hype, every time.
- TALKING POINT: I am opening a door for someone who is ready, not talking anyone into anything.

### Module 2: Your Partner Identity

- SAY: **Say this:** This is a strong fit because you already have deep expertise and one real problem worth solving. The credential is earned through a reviewed dossier, so the work is real, and that is exactly why it carries weight.
- AVOID/NOTE: **Do not say this:** Pay me directly to speed up enrollment, and once you finish the twelve weeks your income will rise.
- AVOID/NOTE: **Mistakes to avoid:** Promising a job, a raise, leads, or a guaranteed pass. Implying the credential is an accredited degree. Accepting payment off official channels or using messaging that is not approved. Using the TenXPros name before the Activation Gate. Using bought or scraped lists. Claiming exclusivity that is not confirmed in writing on the Panel. Any one of these can end a partnership.
- TALKING POINT: I am a trust builder, not a shortcut seller.
- TALKING POINT: I get paid for the function I actually performed, not for being in the room.
- TALKING POINT: I protect the brand, the prospect, the standard, and my own right to earn.
- TALKING POINT: Certification is earned through a reviewed dossier. I cannot promise it.
- TALKING POINT: If a sentence is not true, not backable, or routes money or data wrongly, I do not say it.

### Module 3: The Rules

- SAY: **Say this:** I will register this opportunity before we go further, so your account and my role are recorded and protected on the Panel. Pricing comes from our approved current materials, not from me.
- AVOID/NOTE: **Do not say this:** I can knock USD 500 off and lock your whole company group in under one registration, and we will sort the paperwork later.
- AVOID/NOTE: **Mistakes to avoid:** Treating a verbal or pending nod as approval. Contacting a prospect with the TenXPros name before the Activation Gate is confirmed. Assuming a registration covers the parent or other departments. Quoting prices or giving discounts on your own authority. Forgetting that clawback, confidentiality, non circumvention, and non solicitation survive the year end and the partnership.
- TALKING POINT: Five parts make a right: registered, performed, cleared, timed, managed.
- TALKING POINT: The Panel is the single source of truth. Silence is not a yes.
- TALKING POINT: Register before substantive contact, and respect exact scope.
- TALKING POINT: Paid on cleared money, by function, up to a cap.
- TALKING POINT: Clawback and survival clauses outlast a refund and the year end.

### Module 4: What TenXPros Is

- SAY: **Say this:** TenXPros is a selective twelve week certification. You bring one real problem from your field, run it through a structured method, and finish with a reviewed dossier you can defend to anyone who matters to you.
- AVOID/NOTE: **Do not say this:** It is an easy AI certificate you finish in twelve weeks, and you are guaranteed to pass. That promises an outcome only the review can decide, and it misnames a selective program as an easy one.
- AVOID/NOTE: **Mistakes to avoid:** calling it a video library or a prompt course, promising the Certified outcome, pitching it to a beginner with no domain, implying the review bar is hidden, or describing the credential as a generic AI certificate. Each one trades the truth of the product for a weaker, riskier story.
- TALKING POINT: One real problem, run through a structured method, ending in reviewed proof.
- TALKING POINT: Four phases that each answer one question: Frame, Design, Prove, Foresee.
- TALKING POINT: Eight assets assemble into one Living AI Solution Dossier.
- TALKING POINT: Eight public review criteria, so the bar is never a secret.
- TALKING POINT: A field specific credential that names the participant's actual domain.

### Module 5: The Twelve Week Journey

- SAY: **Say this:** In week four you would land on the one problem worth twelve weeks of your time, and by week twelve you would hold a reviewed dossier you can defend in your own field. Let me walk it through the way it would look for you.
- AVOID/NOTE: **Do not say this:** Other people in your field cut their review time by forty percent, so you will too. Any number from a field story is illustrative of how value gets proven, never a promise of what anyone will achieve.
- AVOID/NOTE: **Mistakes to avoid:** reciting the generic twelve weeks to a specific person, presenting an illustrative number as a guaranteed result, leading with AI capability instead of the boundary that keeps a human in control, or inventing weeks, badges, or outcomes that are not on the map.
- TALKING POINT: Eleven core modules plus a final dossier and capstone review, one stretch of work per week.
- TALKING POINT: Four phases: Frame, Design, Prove, Foresee, each answering one real question.
- TALKING POINT: A badge every week, each tied to a concrete deliverable.
- TALKING POINT: The same method, retold in the prospect's own field.
- TALKING POINT: Lead with the boundary as much as the benefit.

### Module 6: Ranks, Badges, and Credentials

- SAY: **Say this:** The weekly badges mark real work as you go, the four ranks mark real capability, and at the top sits one verifiable, field specific credential reviewed against a public standard.
- AVOID/NOTE: **Do not say this:** Collect the badges and you are basically certified, and it is like a university qualification. The badges are not the credential, and this is a professional credential, never an academic one.
- AVOID/NOTE: **Mistakes to avoid:** letting the badges sound like the point, implying badges add up to certification, calling the rank or credential an academic qualification, describing it as a generic AI certificate, or rounding a Design level practitioner up to certified professional.
- TALKING POINT: Two layers: small weekly badges, four phase ranks.
- TALKING POINT: A badge is shorthand for a concrete deliverable, not a decoration.
- TALKING POINT: A rank signals capability, not attendance.
- TALKING POINT: The flagship credential is verifiable, field specific, evidence based, and defensible.
- TALKING POINT: Sell the proof, not the stickers.

### Module 7: From Top Student to Coach

- SAY: **Say this:** The coach pathway is real and it is selective. Certification does not guarantee a coaching role, but top performers may be invited to apply, complete a real screening, and earn their way up a six stage ladder. If you perform at the highest level, you could become the person who coaches others in your field.
- AVOID/NOTE: **Do not say this:** Finish the program and you will become a coach, or, I can get you a coaching role. That promises an outcome you do not control, breaks the rule, and sets the person up to feel cheated.
- AVOID/NOTE: **Mistakes to avoid:** promising or implying a coaching role, describing the pathway as automatic after the program, naming only the top stage and skipping how it is earned, or treating the screening as a rubber stamp. Each of these breaks trust the moment reality arrives.
- TALKING POINT: The pathway is a ladder of demonstrated capability, not a promotion handed out after the program.
- TALKING POINT: For a senior doctor, engineer, or educator, the bigger motivation is leading and coaching others in their own field, and that is true, so you may say it.
- TALKING POINT: The screening exists to protect the quality of coaching in every field, which is why the standard is high.
- TALKING POINT: Recommending your own graduates and co delivering future cohorts with them is how you stop trading time for single referrals.
- TALKING POINT: The best students you bring in can become co builders of your own practice.

### Module 8: Selling With Integrity

- SAY: **Say this:** What is the biggest challenge you are facing right now around AI in your work? Tell me where you are stuck, and I will tell you honestly whether this program is built for that, or whether it is not the right fit.
- AVOID/NOTE: **Do not say this:** This will make you certified and ten times more valuable, trust me. That promises an outcome you do not control, replaces the reviewed standard with hype, and breaks the truth test on the first sentence.
- AVOID/NOTE: **Mistakes to avoid:** opening by reciting the program, leading with price, promising certification, inflating a private certification into an accreditation or degree, pushing someone toward payment before acceptance, or selling to a poor fit just to close. Each one fails the truth test and costs you the long game.
- TALKING POINT: Open with the person, listen first, and respond to their real situation.
- TALKING POINT: Use a matched field story to make the program concrete, because real beats impressive.
- TALKING POINT: Keep the mini pitch to sixty to ninety seconds with no hype.
- TALKING POINT: Say plainly that no one pays before being accepted, which removes the pressure to sell payment first.
- TALKING POINT: The acceptance step signals the program is serious and only admits people who are genuinely ready.
- TALKING POINT: Graduates who earn a field specific credential remember who opened the door, and that builds your reputation for years.

### Module 9: Finding and Qualifying the Right Prospects

- SAY: **Say this:** Who in your field already has a real problem worth twelve weeks of work and would value reviewed, defensible evidence? If that is you, let us talk. If it is not quite you yet, I would rather tell you straight than enroll you into something that is not the right fit.
- AVOID/NOTE: **Do not say this:** I can guarantee you will pass and probably get hired after, just send me a deposit to hold your spot. That promises an outcome you do not control and routes money off the official channel, which are both hard rule breaks.
- AVOID/NOTE: **Mistakes to avoid:** buying or scraping a list, blasting strangers, padding a list with unreachable names, enrolling a poor fit to hit a number, promising certification or income, taking off channel payment, or accepting confidential data without rights and safeguards. Each one breaks a rule or wastes the time you should spend on real fits.
- TALKING POINT: The right prospects are usually in your trusted network, not on a purchased list.
- TALKING POINT: A warm introduction from someone who respects you beats a hundred cold messages.
- TALKING POINT: A strong fit has real expertise, the using versus leading gap, one real problem, and real time.
- TALKING POINT: Declining a poor fit kindly protects the prospect, the standard, and your name.
- TALKING POINT: Three real, reachable prospects beat thirty names you cannot reach.
- TALKING POINT: Register on the Partner Panel before substantive contact, and pursue only after confirmation.

### Module 10: Outreach and the Conversation in Practice

- SAY: **Say this:** What is the biggest challenge you are facing around AI in your work right now? I thought of you because of the work you do in your field, and I want to understand the problem before I say anything about how the program might fit.
- AVOID/NOTE: **Do not say this:** This program will make you an AI leader and get you results. The price is a special number just for you, and you can pay today to lock it in.
- AVOID/NOTE: **Mistakes to avoid:** quoting a price outside approved materials, offering a discount, promising a result, blasting a generic message to a list, chasing a prospect who is clearly not a fit, or following up by repeating the same ask with more pressure. Each one breaks a rule or wastes the time the right prospect deserves.
- TALKING POINT: Lead with the boundary as much as the benefit: a serious professional respects the limits you name.
- TALKING POINT: Payment only after acceptance, so no one is ever sold into paying before they are accepted.
- TALKING POINT: The application is a quality gate, not a sales form, and it is the natural next step.
- TALKING POINT: You bring the expertise, the program brings the method: that is the whole multiplier idea, said plainly.
- TALKING POINT: Your role ends at a clean handoff: the company handles acceptance, payment, and delivery.

### Module 11: Operating the System and Your First 90 Days

- SAY: **Say this (to yourself, before acting):** I am unsure whether this is allowed, so I will treat the doubt as a no and confirm on the Panel or with my partner contact before I do anything.
- AVOID/NOTE: **Do not say this:** I will just do it and apologize later, or I will guess based on what feels right, or I will hold this account quietly even though I am not working it.
- AVOID/NOTE: **Mistakes to avoid:** holding accounts you are not working, treating Panel updates as an optional chore, guessing in silence when you are unsure, improvising an answer about a deal or rule, missing the thirty day window to query a statement, and ignoring the yearly renewal so your operating terms lapse.
- TALKING POINT: The Panel is the single source of truth: registration, target list, updates, and statements all live there.
- TALKING POINT: Meaningful updates are the discipline that keeps an account protected.
- TALKING POINT: The ninety day sequence starts with the Activation Gate and ends with a real review.
- TALKING POINT: First confirmed registration decides any dispute, resolved on the Panel.
- TALKING POINT: Survival obligations continue across the year change, even as terms renew through the site.

### Module 12: How the Twelve Weeks Work, in Full

- SAY: **Say this:** The structure is fixed: four phases over twelve weeks, eight assets built into one reviewed dossier, with three outcomes at the end. For the exact hours per week and the support model I will give you the current official figures, and if I am not certain of one I will confirm it and come back to you.
- AVOID/NOTE: **Do not say this:** It is probably around a few hours a week and you get unlimited one to one coaching. (You may not invent an operational number or promise support the program has not stated.)
- AVOID/NOTE: **Mistakes to avoid:** estimating an operational number like the weekly hours, inventing a support model, promising flexibility that is not offered, describing a Strong Draft as a failure, telling a true beginner with no field that the program is for them, or filling a silence with a guess instead of saying you will confirm.
- TALKING POINT: Twelve weeks, four phases: Frame, Design, Prove, Foresee. Fixed, and stateable to anyone.
- TALKING POINT: Eight connected assets assembled into one reviewed dossier with twelve sections.
- TALKING POINT: Every week produces something and earns a badge, so progress is visible the whole way.
- TALKING POINT: Three outcomes: Certified, Strong Draft, Completed. Strong Draft is a path, not a failure.
- TALKING POINT: Fixed structure you state with confidence, operational details you quote from the current official source.

### Module 13: Selling to Organizations and to Individuals

- SAY: **Say this:** "If a few people on your team are each improvising with AI in different ways, a pilot cohort gives you a shared method, reviewed work, and documented governance you can actually point to. Start with a small group, see the quality, then decide on more seats."
- AVOID/NOTE: **Do not say this:** "Enroll the whole department now and you will see a return of USD 1,200 per person in productivity." You never promise a result or a return figure, the deal size does not relax that rule, and demanding full commitment before a pilot is the wrong motion.
- AVOID/NOTE: **Mistakes to avoid:** Treating every conversation as the same sale. Pitching a personal credential to a leader who wants a team outcome. Forgetting to switch when an individual mentions a team of ten. Assuming a single department registration covers the whole company. Relaxing any guardrail because the deal is large: you still never bind the company, quote outside approved materials, discount, promise results, accept payment, or issue invoices.
- TALKING POINT: Same product, different buyer: the twelve week certification does not change between the two motions.
- TALKING POINT: B2C turns on personal relevance and trust; B2B turns on a business case run through several stakeholders.
- TALKING POINT: A seat is one enrolled professional, so fifteen people is fifteen seats, not one license.
- TALKING POINT: Land and expand: a pilot cohort first, then growth once the organization has seen the quality.
- TALKING POINT: A senior, enthusiastic individual is often the door to their whole team.
- TALKING POINT: The limits never relax for a bigger deal.

### Module 14: Customizing for Any Industry, Organization, or Person

- SAY: **Say this:** "In your work, the highest value, lowest risk place for AI looks like drafting and synthesis, and the hard boundary is the final judgment that has to stay with a qualified human. Frame would scope exactly that, and Prove would test it with evidence you could defend."
- AVOID/NOTE: **Do not say this:** "For your industry we can guarantee this cuts your review time in half." You never promise a result, a number, or an outcome, no matter how tailored the story sounds, and you never invent a program fact to fit a case.
- AVOID/NOTE: **Mistakes to avoid:** Pitching before you have listened. Naming an opportunity but skipping the hard boundary. Inventing a program fact to fit a case. Promising a result, a number, or an outcome because the story sounds tailored. Quoting a price or offering a discount outside approved materials. Trying to talk a beginner with no field into being a Pro: that is persuasion, not detection, and the input does not multiply.
- TALKING POINT: The program is fixed; only the translation into the prospect's world is customized.
- TALKING POINT: Discovery is mostly listening, because you cannot customize what you do not understand.
- TALKING POINT: Name both the opportunity and the boundary; the boundary is what a serious professional respects.
- TALKING POINT: Map every tailored pitch to Frame, Design, Prove, and Foresee.
- TALKING POINT: The right emphasis depends on the organization type, but the program does not change.
- TALKING POINT: The multiplier needs real expertise as its input; detection comes before any tailoring.

