import type { ModuleSeed } from "./content-types";

export const m05: ModuleSeed = {
  slug: "journey",
  order: 5,
  title: "The Twelve Week Journey",
  summary: "The twelve week journey a participant takes, phase by phase, so you can describe the experience with confidence.",
  passMark: 80,
  examSize: 10,
  lesson: "This is the part of the program you will lean on most in real conversations, because it is where the twelve weeks stop being abstract and start being a story a specific person can see themselves inside. Your job is to make the journey feel real, and the way you do that is by knowing the universal map cold and then telling it through the lens of the prospect's own profession.\n\nHere is the universal map. The program runs as eleven core modules plus a final dossier and capstone review, one stretch of work per week, and each week ends with a milestone badge that marks a small, earned win. Week one is AI readiness and the TenX mindset, and it produces a readiness snapshot and a professional stance, earning the TenX Mindset badge. Week two is practical AI literacy and tool fluency, producing a tool use map and first safe experiments, earning AI Core. Week three is responsible AI and professional boundaries, producing boundary rules and a confidentiality plan, earning Responsible AI. Week four is problem discovery and structured framing, producing a problem definition and an AI suitability assessment, earning Problem Framing. That closes the Frame phase.\n\nWeek five is context, stakeholder, and foresight mapping, producing a stakeholder map and early scenario notes, earning Context Mapper. Week six is data, evidence, and verification discipline, producing a grounded knowledge pack and source rules, earning Evidence Discipline. Week seven is workflow and human to AI allocation, producing a before and after workflow and an allocation map, earning Workflow Designer. Week eight is responsible AI solution design, producing an assistant or workflow prototype with guardrails, earning Responsible Solution. That closes the Design phase.\n\nWeek nine is adoption, communication, and change, producing an adoption plan and stakeholder communication, earning Adoption Designer. Week ten is value, roadmap, and proof plan, producing an evaluation rubric, a test set, and a value case, earning Value Proof. That closes the Prove phase. Week eleven is AI foresight and scenario planning, producing a foresight plan and scenario triggers, earning Foresight Strategist. Week twelve is the final dossier and capstone review, producing the Living AI Solution Dossier and the final recommendation, earning the Capstone Review badge. That closes the Foresee phase and the program.\n\nThat is the skeleton. Now the muscle. The same skeleton looks completely different depending on who is walking through it, and that is the point of the Field Journey Explorer. When you sit with a radiologist, you do not recite the twelve weeks. You show her how a radiologist with fourteen years of experience uses Frame to rule out autonomous diagnosis and rule in an image triage layer, uses Design to build a decision kit and a grounded knowledge pack, uses Prove to test against a real set of past cases and report honest numbers including the misses, and uses Foresee to write a ninety day rollout and submit a dossier that earns the field specific credential of a certified AI adopted radiologist. When you sit with a lawyer, the same four phases produce a contract intake and risk triage assistant that never gives legal advice. When you sit with an HR director, they produce an interview feedback assistant that never makes the hiring decision. Finance, marketing, education, product, engineering, healthcare operations, consulting, each one is the same method wearing the prospect's own clothes.\n\nTwo things make these field stories work, and you must respect both. First, they are realistic examples, not guarantees. Any numbers in them, like a sensitivity figure or a percentage of time saved, are illustrative of how a participant proves value, not a promise of what anyone will achieve. Say that plainly when you use them. It keeps you honest and it keeps you inside the rule that you never promise results. Second, the boundary in every story is the most important part, not the AI capability. The radiologist keeps diagnostic authority. The lawyer does not let AI give legal advice. The clinic manager never lets AI answer a medical question. When you tell a field story, lead with the boundary as much as the benefit, because that is exactly the judgment the program teaches and exactly what a serious professional wants to hear.\n\nSo when you prepare for a conversation, pick the field that matches the person, walk the four phases in their language, name the badges and the rank they would earn along the way, and end on the field specific credential they would hold. Do that and the prospect is no longer evaluating an AI course. They are looking at a believable picture of themselves twelve weeks from now, holding proof they can defend. That picture, told honestly, is the most persuasive and the most ethical thing you can offer.",
  exercises: [
    {
      stem: "How is the universal program structured across the twelve weeks?",
      options: ["Twelve identical lectures", "Eleven core modules plus a final dossier and capstone review, with a weekly milestone badge", "Four exams and nothing else", "Self study with no structure"],
      correct: 1,
      explanation: "It is eleven core modules plus the final dossier and capstone review, each week ending in a badge. It is not identical lectures, exams only, or unstructured.",
    },
    {
      stem: "Which badge is earned in week one?",
      options: ["Capstone Review", "Value Proof", "TenX Mindset", "Workflow Designer"],
      correct: 2,
      explanation: "Week one, AI readiness and the TenX mindset, earns the TenX Mindset badge. The others are earned in later weeks.",
    },
    {
      stem: "What is the right way to use the Field Journey Explorer in a conversation?",
      options: ["Recite the generic twelve weeks regardless of the person", "Show the prospect their own profession walking through the four phases", "Skip the journey and talk only about price", "Promise the exact outcomes from the example"],
      correct: 1,
      explanation: "The point is to tell the journey in the prospect's own field. Reciting generically, skipping to price, or promising the example outcomes all miss it.",
    },
    {
      stem: "Numbers inside a field story, such as a percentage of time saved, should be presented as what?",
      options: ["A guarantee of what the participant will achieve", "An illustrative example of how value is proven, not a promise", "An accreditation claim", "A fixed program result"],
      correct: 1,
      explanation: "Such numbers are illustrative of proving value, never a promise. Treating them as guarantees, accreditation, or fixed results is wrong and breaks the no promises rule.",
    },
    {
      stem: "In every field story, what should the partner lead with as much as the benefit?",
      options: ["The price", "The boundary that keeps a human in control", "The badge colors", "The speed of the tool"],
      correct: 1,
      explanation: "The boundary is the heart of the judgment the program teaches, so lead with it. Price, colors, and speed are not the point.",
    },
    {
      stem: "Which week closes the Design phase?",
      options: ["Week four", "Week eight", "Week ten", "Week twelve"],
      correct: 1,
      explanation: "Design runs weeks five to eight, so week eight closes it. Week four closes Frame, week ten closes Prove, and week twelve closes Foresee.",
    },
  ],
  exam: [
    {
      stem: "Why is the journey module the one partners lean on most?",
      options: ["Because it lists the prices", "Because it makes the twelve weeks real for a specific person", "Because it lets partners skip the rules", "Because it guarantees outcomes"],
      correct: 1,
      explanation: "It turns the abstract program into a believable story for a specific prospect. It is not about price, skipping rules, or guarantees.",
    },
    {
      stem: "Which pairing of week and badge is correct?",
      options: ["Week two earns Capstone Review", "Week six earns Evidence Discipline", "Week one earns Value Proof", "Week twelve earns TenX Mindset"],
      correct: 1,
      explanation: "Week six, data and evidence discipline, earns Evidence Discipline. The other pairings are mismatched.",
    },
    {
      stem: "A radiologist walking the journey would, in the Frame phase, most likely do which of these?",
      options: ["Build a fully autonomous diagnosis system", "Rule out autonomous diagnosis and rule in an image triage layer with human authority kept", "Let AI sign off diagnoses", "Remove the radiologist from the loop"],
      correct: 1,
      explanation: "The realistic Frame outcome keeps diagnostic authority human and scopes AI to triage. Autonomous diagnosis and removing the human are exactly what the example rules out.",
    },
    {
      stem: "What is the same and what is different across the field stories?",
      options: ["The method changes, the field stays the same", "The four phase method stays the same, the field specific work changes", "Both the method and the outcome are identical for everyone", "Nothing is shared between fields"],
      correct: 1,
      explanation: "The method is constant, the field specific application varies. The method does not change, outcomes are not identical, and the fields do share the method.",
    },
    {
      stem: "A partner uses a sensitivity figure from the radiology example with a prospect. What must they say about it?",
      options: ["That every participant will hit that number", "That it is an illustrative example of proving value, not a promise", "That it is an accredited result", "Nothing, just present it as fact"],
      correct: 1,
      explanation: "The figure is illustrative, not a promise, and must be framed that way. Claiming everyone will hit it, calling it accredited, or presenting it as guaranteed fact is wrong.",
    },
    {
      stem: "In the legal field story, what does the assistant never do?",
      options: ["Help prepare a better intake", "Triage risk", "Give legal advice", "Flag missing information"],
      correct: 2,
      explanation: "The legal assistant never gives legal advice. It can help with intake, triage, and flagging gaps, which keep the lawyer in control.",
    },
    {
      stem: "Which week earns the Foresight Strategist badge?",
      options: ["Week nine", "Week ten", "Week eleven", "Week twelve"],
      correct: 2,
      explanation: "Week eleven, AI foresight and scenario planning, earns Foresight Strategist. The other weeks earn different badges.",
    },
    {
      stem: "When preparing for a conversation, the partner should do which of these?",
      options: ["Pick the field that matches the person and walk the four phases in their language", "Use the same generic script for everyone", "Lead with discounts", "Promise the credential outcome"],
      correct: 0,
      explanation: "Tailoring to the prospect's field and walking the phases in their language is the method. Generic scripts, discounts, and promised outcomes are not.",
    },
    {
      stem: "In the HR field story, the interview feedback assistant does what?",
      options: ["Makes the hiring decision", "Helps structure notes and check evidence without making the decision", "Ranks candidates automatically", "Replaces the hiring panel"],
      correct: 1,
      explanation: "The HR assistant supports structure and evidence while the human panel decides. It never makes the decision, ranks candidates, or replaces the panel.",
    },
    {
      stem: "What closes the Prove phase?",
      options: ["Week eight", "Week ten", "Week eleven", "Week four"],
      correct: 1,
      explanation: "Prove runs weeks nine and ten, so week ten closes it. Week eight closes Design, week eleven is in Foresee, and week four closes Frame.",
    },
    {
      stem: "Why lead a field story with the boundary, not just the benefit?",
      options: ["Because boundaries are legally required to mention and benefits are not", "Because the boundary is the judgment the program teaches and what a serious professional wants to hear", "Because benefits are unimportant", "Because it shortens the conversation"],
      correct: 1,
      explanation: "The boundary reflects the core judgment the program builds and reassures a serious prospect. It is not about legal wording, ignoring benefits, or saving time.",
    },
    {
      stem: "Told honestly, a field story turns the prospect's evaluation into what?",
      options: ["A comparison of AI courses", "A believable picture of themselves in twelve weeks holding defensible proof", "A price negotiation", "A promise of guaranteed results"],
      correct: 1,
      explanation: "A good field story lets the prospect see a believable future version of themselves with proof. It is not a course comparison, a price talk, or a guarantee. --- ## 17.",
    },
  ],
};
