/**
 * The canonical definition of a Pro and a TenXPro. One source of truth, reused on
 * the marketing site, the apply flow, and the partner academy, so the standard is
 * described the same way everywhere. Written plainly, no machine-writing tells.
 */

export const PRO_DEFINITION = {
  eyebrow: "Who this is for",
  headline: "A Pro is a real expert. A TenXPro is what they become.",

  // The multiplier idea, in plain language.
  multiplier: [
    "TenX means a multiplier. This program multiplies an AI method onto something you already have. It does not start you from nothing.",
    "Ten times zero is still zero, so the input has to be real. A beginner with no field is a zero: there is nothing to multiply. That is the structural reason the program does not work for a beginner, and it is exactly what the promise says. You bring the expertise. We bring the method.",
    "So the first question of any screening is simple: does this person have a real, multipliable expertise.",
  ],

  // Pro vs TenXPro, side by side.
  proVsTenxpro: {
    pro: "A Pro is an expert in a field who already uses AI in a loose, occasional way.",
    tenxpro:
      "A TenXPro is that same expert, now leading AI adoption with a method, with evidence, and with governance, holding a body of work they can defend. The credential certifies exactly that jump. It does not certify learning AI.",
  },

  // The five archetypes, mapped to the program's target segments.
  archetypes: [
    { title: "The department or team lead", body: "Runs a function in a mid-size or large organization and is being asked what our AI plan is." },
    { title: "The consultant or advisor", body: "Has clients who now ask about AI and needs an approach they can stand behind." },
    { title: "The founder or small-business owner", body: "Makes real build-or-buy AI decisions and lives with the result." },
    { title: "The senior specialist in a high-stakes field", body: "Works in law, medicine, finance, compliance, or HR, where AI is both exciting and dangerous." },
    { title: "The researcher or educator", body: "Needs to bring rigor and discipline to how AI is used." },
  ],

  // The one-sentence screen.
  screen: {
    question:
      "Does this person have a real problem in their own field that they could spend twelve weeks proving an AI approach against, and does the result have to pass the judgment of someone who matters to them?",
    verdict: "If the answer is yes to both, they are a Pro.",
  },

  // For partners: this is a detection tool, not a sales script.
  partnerNote:
    "Your job is detection, not persuasion. This definition is a detection tool. If you have to convince someone that they are a Pro, they almost always are not.",
} as const;
