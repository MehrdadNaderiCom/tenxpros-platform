import type { ModuleSeed } from "./content-types";
import { ACADEMY_MODULE_COUNT } from "../../../src/lib/academy/engine";

// This module's own exam parameters, defined once and referenced in the lesson
// text below, so the taught numbers can never drift from the module definition.
// The module count comes from the engine's single source of truth.
const PASS_MARK = 80;
const EXAM_SIZE = 10;
const NEEDED_CORRECT = Math.ceil((PASS_MARK / 100) * EXAM_SIZE);
const MODULE_COUNT = ACADEMY_MODULE_COUNT;

export const m01: ModuleSeed = {
  slug: "mission",
  order: 1,
  title: "The Mission",
  summary: "Why TenXPros exists, the standard behind the credential, and the honest promise a partner makes.",
  passMark: PASS_MARK,
  examSize: EXAM_SIZE,
  lesson: `You are not here to memorize a sales pitch. You are here to understand a standard, and to be able to explain it to a serious professional without exaggerating a single thing.\n\nBefore anything else, know how this Academy works, because your progress depends on it. There are ${MODULE_COUNT} numbered modules, plus a few open reference pages that are never gated, and every numbered module is completed the same way: read the lesson, work the short exercises, then pass the module exam. Each exam is one sitting of ${EXAM_SIZE} questions, and you pass by answering ${NEEDED_CORRECT} of the ${EXAM_SIZE} correctly, which is the ${PASS_MARK} percent pass mark. Passing that exam is the only thing that completes a module and unlocks the next one. Reading a lesson on its own completes nothing, and finishing this first module is step one of ${MODULE_COUNT}, not the end. If a sitting goes badly, you simply retake it after a short cooldown, with unseen questions from the pool rotated in first, so one hard exam can never end your progress. When all ${MODULE_COUNT} are passed, you take one comprehensive final exam, and that is what earns your Partner Academy certificate.\n\nStart with what is actually happening in the market, because your whole job rests on it. AI tools are now in everyone's hands. A doctor, a lawyer, an engineer, a teacher, an accountant, a marketer, anyone can open a chat window and get an answer in seconds. Most professionals are already doing this. So access is no longer what separates the strong from the weak. Judgment is.\n\nThere is a real difference between using AI and leading its adoption. Using AI means typing a question, copying the output into a document, and hoping it holds up. It looks productive. It builds nothing you can defend. Leading AI adoption is a different skill entirely. It means knowing where AI genuinely helps inside your specific field, knowing where it fails, knowing where it adds risk, and knowing where a human has to stay in control no matter how good the model looks. It means producing systems and evidence that survive a hard question from a board, a regulator, or a skeptical client. It means becoming the person other people in your field turn to when they are unsure.\n\nThat gap, between the many who can use AI and the few who can lead it, is the entire reason TenXPros exists. And it is the reason your introduction carries weight. You are not pushing a course. You are opening a door to a professional standard for people who are ready to walk through it.\n\nThink about who you already know. The experienced clinician who senses AI could help her patients but has no responsible way to build it. The senior engineer who uses AI tools at random and has never documented one workflow he could defend. The consultant whose clients keep asking about AI while he has no credential that says he can advise them. These are not made up people. They are in your network right now, and many of them are already asking for guidance. When you bring the right one of them into TenXPros, you give them something they cannot get from a generic course: a reviewed, defensible credential built on their own real work.\n\nHere is what makes the program different, and you should be able to say it cleanly. Most AI courses teach tools. They show you a chat interface, some prompt tricks, a way to automate a small task. Some are fine for beginners. None are built for an experienced professional who wants to lead. TenXPros runs on a different premise, and the motto says it in one line. You bring the expertise. We bring the AI method. The participant already has years of domain knowledge. The program gives them a structured way to apply it, so the output is not a certificate of attendance but a body of evidence.\n\nThe credential is earned by doing the work, not by watching videos or passing a quick quiz. The participant assembles a Living AI Solution Dossier, submits it, and it is reviewed against a public standard. If the work meets the standard, the credential is awarded. If it does not, specific revisions come back. That rigor is the whole point. It is why the credential means something, and it is why the people you bring in will respect the bar rather than resent it.\n\nSo hold this in your head before you ever speak to a prospect. A good partner does not talk anyone into this. A good partner recognizes the professional who is already ready, and opens the door honestly. Do that well and you are not running a side hustle. You are helping build a network of people who lead AI adoption responsibly across their industries, and you are earning at every step as they do.\n\nOne more thing about tone, because it will define how you are seen. This program does not trade in hype. It trades in proof. The phrase to keep close is simple: productive effort, real success. Everything you say should be true, specific, and defensible. If you cannot back it up, do not say it.`,
  bodyHtml: `<p class="lead">Your job in this module is not to learn a pitch. It is to understand one standard well enough to explain it to a serious professional without exaggerating a single thing. Everything that follows rests on a single shift in the market: access to AI is now universal, so access no longer separates strong professionals from weak ones. Judgment does.</p>

<h2>How this Academy works</h2>
<p>Before the mission itself, be clear on the mechanics, because your progress depends on them. The Academy is ${MODULE_COUNT} numbered modules, plus a few open reference pages that are never gated, and every numbered module is completed the same three step way:</p>
<ol>
  <li><strong>Read the lesson</strong> to the end, then mark it read. Reading alone does not complete a module.</li>
  <li><strong>Work the exercises.</strong> They are short practice questions with explanations. A wrong answer never blocks you: after the last attempt the answer is shown and the exercise counts as done.</li>
  <li><strong>Pass the module exam.</strong> One sitting of ${EXAM_SIZE} questions and a pass mark of ${PASS_MARK} percent, which means ${NEEDED_CORRECT} of ${EXAM_SIZE} answers correct. Passing this exam is the only thing that completes the module and unlocks the next one.</li>
</ol>
<div class="callout callout-warning"><p><strong>The one rule people miss:</strong> finishing this first module is step one of ${MODULE_COUNT}, not the end of the Academy. Every later module stays locked until you pass the exam of the module before it, and your certificate arrives only after all ${MODULE_COUNT} modules are passed plus one comprehensive final exam.</p></div>
<div class="callout callout-info"><p><strong>And one reassurance:</strong> a failed exam is never final. After a short cooldown you can retake it, and questions you have not seen yet are rotated in first. Steady work gets everyone through.</p></div>

<h2>What you will be able to do</h2>
<ul>
  <li>Explain, in plain language, why TenXPros exists and why your introduction to it carries real weight.</li>
  <li>Draw a clean line between using AI and leading its adoption, using a prospect's own field as the example.</li>
  <li>Describe how the credential is earned, what makes it different from a tools course, and the tone (proof, not hype) you must hold in every sentence.</li>
</ul>

<h2>What you need to understand</h2>

<h3>The market shift your whole job rests on</h3>
<p>AI tools are now in everyone's hands. A doctor, a lawyer, an engineer, a teacher, an accountant, a marketer: anyone can open a chat window and get an answer in seconds. Most professionals are already doing exactly this. That is the point. When everyone has access, access stops being the dividing line. What remains is judgment: knowing where the answer can be trusted and where it cannot.</p>

<h3>Using AI versus leading its adoption</h3>
<p>These are two different skills, and the difference is the heart of the program.</p>
<ul>
  <li><strong>Using AI</strong> means typing a question, copying the output into a document, and hoping it holds up. It looks productive. It builds nothing you can defend.</li>
  <li><strong>Leading AI adoption</strong> means knowing where AI genuinely helps inside your specific field, knowing where it fails, knowing where it adds risk, and knowing where a human has to stay in control no matter how good the model looks. It means producing systems and evidence that survive a hard question from a board, a regulator, or a skeptical client. It means becoming the person others in your field turn to when they are unsure.</li>
</ul>

<h3>Pro and TenXPro: the multiplier</h3>
<p>TenX means a multiplier. The program multiplies an AI method onto something the person already has. Ten times zero is still zero, so the input has to be real. A beginner with no field is a zero: there is nothing to multiply. That is the structural reason it does not work for a beginner, and it is exactly what the promise says. You bring the expertise. We bring the method.</p>
<p>A <strong>Pro</strong> is an expert in a field who already uses AI in a loose, occasional way. A <strong>TenXPro</strong> is that same expert, now leading AI adoption with method, evidence, and governance, holding a body of work they can defend. The credential certifies exactly that jump. It does not certify learning AI.</p>

<h3>What makes the program different</h3>
<p>Most AI courses teach tools: a chat interface, some prompt tricks, a way to automate a small task. Some are fine for beginners. None are built for an experienced professional who wants to lead. TenXPros runs on a different premise. The participant already has years of domain knowledge, and the program gives them a structured way to apply it, so the output is not a certificate of attendance but a body of evidence.</p>

<h3>How the credential is earned</h3>
<p>It is earned by doing the work, not by watching videos or passing a quick quiz. The participant assembles a Living AI Solution Dossier, submits it, and it is reviewed against a public standard. If the work meets the standard, the credential is awarded. If it does not, specific revisions come back. That rigor is the whole point: it is why the credential means something, and why the people you bring in respect the bar rather than resent it.</p>

<h3>Who this is for, in concrete terms</h3>
<p>A useful way to picture the fit is by profession, role, and setting. These are examples, not limits. The real test is always real expertise plus a real problem, but this list makes the target vivid.</p>
<ul>
  <li><strong>Regulated and clinical fields:</strong> doctors, nurses, radiologists, pharmacists, dentists, veterinarians, and clinic, hospital, and health operations leaders.</li>
  <li><strong>Legal and compliance:</strong> lawyers, in house counsel, compliance and risk officers, and auditors.</li>
  <li><strong>Finance and accounting:</strong> accountants, financial analysts, controllers, advisers, actuaries, and finance managers.</li>
  <li><strong>Engineering, product, and technical fields:</strong> engineers of every discipline, architects, product managers, and data and analytics leads.</li>
  <li><strong>Business, operations, and people:</strong> consultants and advisers, operations and supply chain managers, human resources and learning leaders, and project, program, and department heads.</li>
  <li><strong>Marketing, sales, and communications:</strong> marketing leaders, brand and content strategists, sales leaders, and communications professionals.</li>
  <li><strong>Education and research:</strong> educators, academics, researchers, and knowledge workers.</li>
  <li><strong>Independent and small business:</strong> founders, small business owners, and freelancers or independent experts who are genuine specialists even without an organization behind them.</li>
  <li><strong>Organizational structures:</strong> a senior individual who decides for themselves, which is a B2C fit, or a team inside a company whose leader wants a consistent, governed standard across their people, which is a B2B fit.</li>
</ul>
<p>What every one of these has in common is the only thing that matters: real, current expertise in a field, and one real problem worth twelve weeks of work. Anyone with that is worth a conversation. Anyone without it, whatever their title, is not the fit yet.</p>

<h3>Where not to prospect, and the forbidden channels</h3>
<p>Where you find prospects matters as much as who they are. You reach the people above through your own network, referrals, and the professional circles you already belong to. You do not use bought or scraped contact lists, bulk or automated SMS or email, or public advertising placed without the company's written approval and coordination. Those channels are prohibited, because they damage the brand and bring the wrong people. This is only the short version, to set the boundary early. The detailed rules on registration and house accounts are in module 3, and the full method for finding and qualifying the right prospects is in module 9.</p>

<h2>How to sell it honestly</h2>
<p>You are not pushing a course. You are opening a door to a professional standard for someone who is already ready to walk through it. Your job is detection, not persuasion. If you have to convince someone they are a Pro, they almost always are not. So instead of talking, you look: does this person have a real problem in their own field they could spend twelve weeks proving an AI approach against, and does the result have to pass the judgment of someone who matters to them. If yes to both, you have found a fit, and the honest move is simply to name the standard and the bar, then let them decide.</p>

<div class="callout callout-success"><p><strong>Say this:</strong> You already use AI every day, so the question is not access. The question is whether you can lead it: build something in your own field that survives a hard question from a board or a regulator. That is the gap this credential is built to close.</p></div>
<div class="callout callout-warning"><p><strong>Do not say this:</strong> Finish the twelve weeks and you are automatically certified, and it will get you promoted.</p></div>

<h2>Common objections and honest answers</h2>
<table>
  <thead>
    <tr><th>Objection</th><th>How to answer</th></tr>
  </thead>
  <tbody>
    <tr><td>I already use AI every day. Why would I need this?</td><td>Using AI and leading its adoption are different skills, and the program builds the second. Daily use is the starting point, not the finish line.</td></tr>
    <tr><td>Is this just another prompt course?</td><td>No. A tools course teaches the interface. This turns your own expertise into reviewed evidence, judged against a public standard.</td></tr>
    <tr><td>Can you guarantee I pass?</td><td>No, and I would not trust anyone who did. The credential is earned through a reviewed dossier. If the work meets the bar it is awarded, and if it does not you get specific revisions back.</td></tr>
    <tr><td>Is this an accredited degree?</td><td>No. It is a reviewed, defensible professional credential built on real work, not a university degree or an accredited academic qualification.</td></tr>
    <tr><td>Will this get me a better job?</td><td>I cannot promise an outcome I do not control. What I can say is that it gives you a body of evidence you can defend, which is something a certificate of attendance never does.</td></tr>
  </tbody>
</table>

<h2>Talking points</h2>
<ul>
  <li>Access to AI is universal now. Judgment is the dividing line.</li>
  <li>You bring the expertise. We bring the AI method.</li>
  <li>The credential is earned by reviewed work, not attendance.</li>
  <li>Productive effort, real success: proof over hype, every time.</li>
  <li>I am opening a door for someone who is ready, not talking anyone into anything.</li>
</ul>

<div class="callout callout-warning"><p><strong>Mistakes to avoid:</strong> Do not pitch the program as easy or fast. Do not promise certification, a job, a raise, or any outcome you cannot control. Do not hide the review standard to make it sound simpler, and do not imply it is an accredited degree. Each of those quietly breaks the trust that gives your introduction its weight.</p></div>

<h2>Summary checklist</h2>
<ul class="checklist">
  <li>I can explain why access to AI no longer separates the strong from the weak.</li>
  <li>I can describe using AI versus leading its adoption with an example from the prospect's field.</li>
  <li>I can state the motto and what makes the program different from a tools course.</li>
  <li>I can explain how the credential is earned and what happens when a dossier falls short.</li>
  <li>I can keep my tone to proof, not hype, and back up everything I say.</li>
</ul>

<h2>A real scenario</h2>
<p>You know a senior compliance lead at a mid-size insurer. Her board keeps asking what our AI plan is, and she has been answering with instinct and a few chat experiments she could not defend if pressed. She has a real problem in her field, and the answer has to pass people who matter to her. You do not sell her anything. You say: you are clearly a Pro already, and this is the structured way to turn what you know into a dossier you could put in front of your board. Then you stop talking and let her decide.</p>

<h2>How this maps to your exam</h2>
<p>Your exam tests whether you can hold the line between using AI and leading adoption, state the motto correctly, explain how the credential is earned and what happens to a dossier below the bar, and recognize the honest partner posture (detect a ready professional and open the door, never promise certification or career results).</p>`,
  exercises: [
    {
      stem: "What is the real line that now separates strong professionals from weak ones, according to the lesson?",
      options: ["Access to AI tools", "Years of experience alone", "Judgment about where AI belongs and where it does not", "The number of AI tools a person has tried"],
      correct: 2,
      explanation: "Access is now universal, so it no longer separates anyone. The lesson is explicit that judgment is the dividing line, not tool access or raw years.",
    },
    {
      stem: "Which description matches leading AI adoption rather than just using AI?",
      options: ["Typing a question and copying the answer into a report", "Knowing where AI fails, where it adds risk, and where a human must stay in control", "Hoping the output is good enough", "Using as many AI tools as possible"],
      correct: 1,
      explanation: "Using AI is the passive copy and hope behavior. Leading it is the disciplined knowledge of limits, risk, and human control described in the lesson.",
    },
    {
      stem: "The program motto is best stated as which of the following?",
      options: ["We bring the expertise, you bring the tools", "You bring the expertise, we bring the AI method", "Learn AI in twelve weeks, guaranteed", "Prompts first, proof later"],
      correct: 1,
      explanation: "The motto is that the participant supplies domain expertise and the program supplies the method. The others invert it or add hype the program never uses.",
    },
    {
      stem: "How is the TenXPros credential earned?",
      options: ["By attending all the sessions", "By passing a multiple choice test", "By assembling a dossier that is reviewed against a public standard", "By watching the full set of videos"],
      correct: 2,
      explanation: "The lesson stresses the credential is earned through reviewed work, the Living AI Solution Dossier, not by attendance or a quiz.",
    },
    {
      stem: "What is the right posture for a partner toward a prospect?",
      options: ["Talk anyone into joining to maximize volume", "Recognize a professional who is already ready and open the door honestly", "Promise fast career results to close quickly", "Avoid mentioning the review standard so it sounds easier"],
      correct: 1,
      explanation: "A good partner qualifies for genuine readiness and is honest. Pushing volume, promising results, or hiding the bar all contradict the lesson.",
    },
    {
      stem: "Which phrase captures the program's tone?",
      options: ["Move fast and hype it up", "Productive effort, real success", "Results guaranteed in twelve weeks", "Attendance is achievement"],
      correct: 1,
      explanation: "The program trades in proof, not hype. Productive effort, real success is the stated tone. The others are exactly the hype the program avoids.",
    },
  ],
  exam: [
    {
      stem: "Why does a partner's introduction to TenXPros carry weight?",
      options: ["Because the program is cheap and easy to join", "Because it opens a door to a defensible professional standard for someone who is ready", "Because partners are allowed to promise certification", "Because attendance alone earns the credential"],
      correct: 1,
      explanation: "The weight comes from offering a real standard to a ready professional, not from low price, promises, or attendance.",
    },
    {
      stem: "A prospect says, I already use AI every day, so why would I need this. What is the honest framing?",
      options: ["Using AI and leading its adoption are different skills, and the program builds the second", "Daily use means you will definitely pass, so just enroll", "The program will replace your judgment with AI", "Everyone needs it regardless of their situation"],
      correct: 0,
      explanation: "The lesson draws a clear line between using AI and leading adoption. The other options promise outcomes, misstate the program, or push without qualification.",
    },
    {
      stem: "Which of these is an example of using AI rather than leading its adoption?",
      options: ["Documenting where a human must stay in control of a workflow", "Mapping where AI adds risk in a specific field", "Pasting a generated paragraph into a report and hoping it holds up", "Building evidence that survives a board level question"],
      correct: 2,
      explanation: "Copy and hope is the passive use behavior. The other three are all acts of leading adoption.",
    },
    {
      stem: "What does the program give a participant that a generic AI tools course does not?",
      options: ["A longer list of prompt tricks", "A structured method that turns their own expertise into reviewed evidence", "A guarantee of promotion", "A faster way to copy outputs"],
      correct: 1,
      explanation: "The differentiator is method plus reviewed evidence built on the participant's expertise, not more prompts, guarantees, or speed.",
    },
    {
      stem: "What happens if a submitted dossier does not meet the review standard?",
      options: ["The credential is awarded anyway for finishing", "Specific revisions are returned before certification", "The participant is removed from the program permanently", "The standard is lowered to pass them"],
      correct: 1,
      explanation: "The lesson states that work below the bar gets specific revisions back. The standard is not waived, the participant is not expelled, and finishing alone does not certify.",
    },
    {
      stem: "Which statement about the credential is accurate?",
      options: ["It is a university degree", "It is an accredited academic qualification", "It is a reviewed, defensible professional credential built on real work", "It is awarded for attendance"],
      correct: 2,
      explanation: "It is a private professional credential earned through reviewed work, not a degree, not accreditation, and not an attendance award.",
    },
    {
      stem: "Who is TenXPros built for?",
      options: ["Absolute beginners with no domain expertise", "Experienced professionals who want to lead AI adoption in their field", "Anyone who wants a quick certificate", "People who only want to learn prompt tricks"],
      correct: 1,
      explanation: "The program targets experienced professionals with real expertise. Beginners and certificate seekers are not the fit the lesson describes.",
    },
    {
      stem: "What is the partner's job when talking to a professional who is not actually ready?",
      options: ["Enroll them anyway to hit a target", "Be honest and not push them in", "Promise results so they feel safe", "Hide the review standard"],
      correct: 1,
      explanation: "Honesty and genuine qualification are the standard. Pushing, promising, or hiding the bar all violate the partner posture.",
    },
    {
      stem: "Which sentence would be appropriate for a partner to say?",
      options: ["Finish the twelve weeks and you are automatically certified", "This will get you promoted within a year", "The credential is earned through reviewed work, and the bar is real", "Just pay me directly and I will speed up your enrollment"],
      correct: 2,
      explanation: "Only C is true and defensible. The others promise certification, promise career outcomes, or route payment improperly.",
    },
    {
      stem: "The phrase productive effort, real success signals what about the program?",
      options: ["That results are guaranteed", "That it values proof over hype", "That attendance is enough", "That speed matters more than substance"],
      correct: 1,
      explanation: "The phrase captures a proof first culture. It does not guarantee results, reward attendance, or prize speed.",
    },
    {
      stem: "Why is the rigor of the review a feature rather than a problem for partners?",
      options: ["Because it lets partners promise easy passes", "Because it makes the credential meaningful and respected by serious people", "Because it hides what the program actually does", "Because it removes the need to qualify prospects"],
      correct: 1,
      explanation: "The bar is what gives the credential its value, which serious professionals respect. It does not enable easy passes or remove qualification.",
    },
    {
      stem: "A partner is most accurately described as which of the following?",
      options: ["An aggressive reseller chasing volume", "Someone who recognizes ready professionals and opens a door honestly", "A recruiter who promises jobs", "A discount broker"],
      correct: 1,
      explanation: "The partner identity is an honest opener of a standard for ready people, not a volume reseller, job promiser, or discounter.",
    },
  ],
};
