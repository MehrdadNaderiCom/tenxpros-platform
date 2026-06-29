import type { ModuleSeed } from "./content-types";

export const m06: ModuleSeed = {
  slug: "ranks",
  order: 6,
  title: "Ranks, Badges, and Credentials",
  summary: "The two layer recognition system of weekly badges and meaningful credentials, and how they build toward certification.",
  passMark: 80,
  examSize: 10,
  lesson: "Recognition in this program runs on two layers, and once you see the two layers, the whole thing makes sense and you can explain it to a prospect in thirty seconds. Layer one is small and frequent. Layer two is large and meaningful. Together they build toward one flagship credential.\n\nLayer one is the twelve weekly badges, one per week. These are not participation trophies, and you should not describe them as decorations. Each badge is earned by completing and submitting that week's actual work. They exist because a twelve week program is long, and small earned wins keep a serious professional moving and give them a visible trail of progress. The twelve, in order, are TenX Mindset, AI Core, Responsible AI, Problem Framing, Context Mapper, Evidence Discipline, Workflow Designer, Responsible Solution, Adoption Designer, Value Proof, Foresight Strategist, and Capstone Review. Each one maps to a week and to a concrete deliverable, so a badge is shorthand for a piece of real work that exists.\n\nLayer two is the four phase ranks. As each phase is completed, the participant earns a rank that signals what they can now do, not just what they attended. Completing Frame earns the rank of TenX Practitioner at Frame Level, with the badge name AI Field Analyst, and it means the participant has produced a documented, defensible use case portfolio and strategy brief. Completing Design earns TenX Practitioner at Design Level, badge name AI Systems Builder, meaning they have produced a working AI workflow grounded in domain knowledge with a documented evaluation rubric. Completing Prove earns TenX Practitioner at Proof Level, badge name AI Evidence Builder, meaning they have produced a tested, evaluated system with an evidence based value case. And completing Foresee together with a certified dossier earns the flagship rank, TenXPros Certified Professional, with the badge name AI Adoption Leader carrying their field, meaning they have built, tested, documented, and can defend a responsible AI adoption system in their domain.\n\nThe flagship credential is the thing everything points toward, and you should be able to say what makes it worth holding. It is verifiable, reviewed against a public rubric rather than self reported. It is field specific, naming the participant's actual domain rather than a generic AI certificate. It is evidence based, backed by a reviewed living dossier of real work. And it is defensible, meaning the holder can walk any stakeholder through exactly what they built, how they tested it, and what value it delivers. The difference in plain language is this. A normal certificate says this person completed a course. This credential says this person built, tested, and documented a responsible AI adoption system in their field, and it was reviewed against an explicit public standard. Those are not the same sentence, and serious people know the difference.\n\nThere is also a simple language of progress titles you can use to describe where a participant is at any moment, from accepted member before week one, through the phase ranks, to dossier candidate at submission, and finally to one of the three review outcomes. Use these to set expectations honestly. A participant in week six is a Design level practitioner doing real work, not a certified professional yet. Saying so plainly is part of protecting the standard.\n\nTwo cautions when you talk about recognition. First, never let the badges sound like the point. The point is the dossier and the credential. The badges are a motivating trail toward defensible proof, and if you sell the badges instead of the proof, you attract the wrong people. Second, never imply the rank or credential is an academic qualification. It is a professional credential with a public review standard. That is its strength. Describe it as exactly what it is and let the rigor speak.\n\nSo, the whole module in one breath. Small weekly badges mark real work. Four phase ranks mark real capability. One verifiable, field specific, defensible credential sits at the top. Sell the proof, not the stickers.",
  exercises: [
    {
      stem: "Recognition in the program runs on how many layers?",
      options: ["One", "Two", "Five", "Twelve"],
      correct: 1,
      explanation: "There are two layers, the twelve weekly badges and the four phase ranks. The number twelve is the badge count, not the layer count.",
    },
    {
      stem: "The twelve weekly badges are best described as what?",
      options: ["Decorations with no requirement", "Earned markers, each tied to completing a week's real work", "Awards for attendance only", "The final credential"],
      correct: 1,
      explanation: "Each weekly badge is earned by completing that week's work. They are not decorations, attendance awards, or the final credential.",
    },
    {
      stem: "Completing the Design phase earns which rank?",
      options: ["TenX Practitioner at Frame Level", "TenX Practitioner at Design Level", "TenXPros Certified Professional", "Accepted Member"],
      correct: 1,
      explanation: "Design completion earns TenX Practitioner at Design Level. Frame Level is for Frame, Certified Professional is the flagship, and Accepted Member is before week one.",
    },
    {
      stem: "What earns the flagship rank of TenXPros Certified Professional?",
      options: ["Finishing Frame only", "Completing Foresee together with a certified dossier", "Attending all weeks regardless of the dossier", "Earning any single weekly badge"],
      correct: 1,
      explanation: "The flagship rank requires completing Foresee and earning a certified dossier. Partial completion, attendance alone, or a single badge do not suffice.",
    },
    {
      stem: "What makes the final credential credible to someone outside the program?",
      options: ["It is self reported", "It is field specific and reviewed against a public rubric", "It is a generic AI certificate", "It is an academic degree"],
      correct: 1,
      explanation: "The credential is field specific, verifiable, and reviewed against a public rubric. It is not self reported, generic, or an academic degree.",
    },
    {
      stem: "What should a partner sell, the badges or the proof?",
      options: ["The badges, since they are frequent", "The proof, meaning the dossier and the credential", "The badge colors", "Attendance"],
      correct: 1,
      explanation: "The point is the dossier and the credential. Selling the badges or attendance attracts the wrong people.",
    },
  ],
  exam: [
    {
      stem: "What is the purpose of the two layer recognition system?",
      options: ["To replace the dossier with stickers", "To give frequent earned wins while building toward a meaningful credential", "To hide the review standard", "To reward attendance"],
      correct: 1,
      explanation: "Layer one gives frequent earned wins and layer two marks real capability, together building toward the credential. It does not replace the dossier, hide the bar, or reward attendance.",
    },
    {
      stem: "Which is the correct order of the first four weekly badges?",
      options: ["AI Core, TenX Mindset, Problem Framing, Responsible AI", "TenX Mindset, AI Core, Responsible AI, Problem Framing", "Responsible AI, Problem Framing, TenX Mindset, AI Core", "Problem Framing, Responsible AI, AI Core, TenX Mindset"],
      correct: 1,
      explanation: "The order is TenX Mindset, AI Core, Responsible AI, Problem Framing. The other sequences are scrambled.",
    },
    {
      stem: "The badge name for the Frame Level rank is which of these?",
      options: ["AI Systems Builder", "AI Field Analyst", "AI Evidence Builder", "AI Adoption Leader"],
      correct: 1,
      explanation: "Frame Level carries the AI Field Analyst badge. Systems Builder is Design, Evidence Builder is Proof, and Adoption Leader is the flagship.",
    },
    {
      stem: "What does the Proof Level rank mean a participant has produced?",
      options: ["Only a strategy brief", "A tested, evaluated system with an evidence based value case", "Nothing yet, it is just attendance", "A generic certificate"],
      correct: 1,
      explanation: "Proof Level means a tested, evaluated system with a value case backed by evidence. It is more than a brief, more than attendance, and not a generic certificate.",
    },
    {
      stem: "Which sentence captures what the flagship credential says about its holder?",
      options: ["This person completed a course", "This person built, tested, and documented a responsible AI adoption system in their field, reviewed against a public standard", "This person attended every week", "This person passed a quiz"],
      correct: 1,
      explanation: "The credential certifies built, tested, documented, and reviewed work, not mere completion, attendance, or a quiz.",
    },
    {
      stem: "Why is the credential being field specific a strength?",
      options: ["Because it hides the participant's profession", "Because it names the actual domain rather than being a generic AI certificate", "Because it makes the credential identical for everyone", "Because it is an academic title"],
      correct: 1,
      explanation: "Naming the real domain makes the credential concrete and credible. It does not hide the profession, make everyone identical, or confer an academic title.",
    },
    {
      stem: "A participant is in week six. How should a partner describe their status honestly?",
      options: ["As a certified professional", "As a Design level practitioner doing real work, not yet certified", "As a graduate", "As an accredited expert"],
      correct: 1,
      explanation: "In week six they are a Design level practitioner, not yet certified. Calling them certified, a graduate, or accredited would be false.",
    },
    {
      stem: "What is the first caution about talking up the badges?",
      options: ["Always sell the badges first", "Never let the badges sound like the point, because the point is the dossier and the credential", "Promise a badge to everyone", "Describe badges as accredited"],
      correct: 1,
      explanation: "The badges are a motivating trail, not the point. Selling them first, promising them, or calling them accredited all misrepresent the program.",
    },
    {
      stem: "Earning a weekly badge is shorthand for what?",
      options: ["Showing up that week", "A concrete piece of real work that exists", "Paying for that week", "Watching a video"],
      correct: 1,
      explanation: "Each badge maps to a concrete deliverable, so it stands for real work. It is not about showing up, paying, or watching.",
    },
    {
      stem: "Which rank and meaning pair is correct?",
      options: ["Design Level means a documented strategy brief only", "Proof Level means a tested system with an evidence based value case", "Frame Level means a fully deployed product", "Certified Professional means attendance was completed"],
      correct: 1,
      explanation: "Proof Level pairs with a tested system and value case. The other pairings overstate or understate their ranks.",
    },
    {
      stem: "What must a partner never imply about the rank or credential?",
      options: ["That it is verifiable", "That it is an academic qualification", "That it is field specific", "That it is reviewed"],
      correct: 1,
      explanation: "It is a professional credential, not an academic qualification, so that must never be implied. Verifiable, field specific, and reviewed are all accurate.",
    },
    {
      stem: "How should a partner sum up recognition in the program?",
      options: ["Sell the stickers, not the proof", "Small weekly badges mark real work, four ranks mark real capability, and one defensible credential sits at the top", "Attendance earns the credential", "The badges are the product"],
      correct: 1,
      explanation: "The summary is badges for work, ranks for capability, and one credential at the top. The others invert the message or misstate it. --- ## 18.",
    },
  ],
};
