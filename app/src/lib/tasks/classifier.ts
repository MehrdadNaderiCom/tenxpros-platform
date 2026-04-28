import type { ConfidentialityLevel, RiskLevel, WorkMode } from "@prisma/client";

export interface ClassifierInput {
  // 1-5 scales
  businessValue: number;
  complexity: number;
  humanJudgment: number;
  aiSuitability: number;
  automationPotential: number;
  riskLevel: RiskLevel;
  confidentiality: ConfidentialityLevel;
}

export interface ClassifierResult {
  mode: WorkMode;
  rationale: string;
}

const RISK_RANK: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const CONF_RANK: Record<ConfidentialityLevel, number> = { PUBLIC: 1, INTERNAL: 2, CONFIDENTIAL: 3, RESTRICTED: 4 };

/**
 * Deterministic, transparent classifier used as the system's first opinion
 * on what work mode fits a task. The user can always override it.
 *
 * Rules (in priority order):
 *   1. Critical risk OR restricted confidentiality => HUMAN_LED, unless judgement is low
 *      and automation potential is high, in which case ESCALATE.
 *   2. Very high human judgement (>=5) => HUMAN_LED.
 *   3. Low AI suitability (<=2) AND high human judgement (>=4) => HUMAN_LED.
 *   4. Very high automation potential (>=5) AND low risk => AUTOMATED.
 *   5. Low complexity (<=2), low judgement (<=2), repeatable => RULES_BASED.
 *   6. High complexity (>=4) AND high AI suitability (>=4) => AI_TOOL_CHAIN.
 *   7. High automation potential (>=4) but needs build => ESCALATE.
 *   8. AI suitability is poor and risk is high => NOT_SUITABLE.
 *   9. Default => AI_ASSISTED.
 */
export function classifyTask(input: ClassifierInput): ClassifierResult {
  const { businessValue, complexity, humanJudgment, aiSuitability, automationPotential, riskLevel, confidentiality } = input;
  const risk = RISK_RANK[riskLevel];
  const conf = CONF_RANK[confidentiality];

  if (risk === 4 || conf === 4) {
    if (humanJudgment <= 2 && automationPotential >= 4) {
      return {
        mode: "ESCALATE",
        rationale: "High-risk or restricted, but mostly mechanical — escalate to a controlled implementation with audit and access control.",
      };
    }
    return {
      mode: "HUMAN_LED",
      rationale: "Risk or confidentiality is too high to delegate to AI; keep a human accountable.",
    };
  }

  if (humanJudgment >= 5) {
    return { mode: "HUMAN_LED", rationale: "Heavy professional judgement is the value here." };
  }

  if (aiSuitability <= 2 && humanJudgment >= 4) {
    return { mode: "HUMAN_LED", rationale: "AI is a poor fit and judgement matters; a human should lead." };
  }

  if (automationPotential >= 5 && risk <= 2) {
    return { mode: "AUTOMATED", rationale: "Repetitive, low-risk and highly automatable; build a deterministic pipeline." };
  }

  if (complexity <= 2 && humanJudgment <= 2) {
    return { mode: "RULES_BASED", rationale: "Simple and rule-shaped; templates and macros beat LLMs." };
  }

  if (complexity >= 4 && aiSuitability >= 4) {
    return {
      mode: "AI_TOOL_CHAIN",
      rationale: "Multi-step work, well suited to AI: design a chain of prompts/tools with a human verification step.",
    };
  }

  if (automationPotential >= 4 && businessValue >= 4) {
    return {
      mode: "ESCALATE",
      rationale: "High value and very automatable; worth a small engineering investment — escalate to tech.",
    };
  }

  if (aiSuitability <= 1 && risk >= 3) {
    return { mode: "NOT_SUITABLE", rationale: "AI is unreliable here and the risk is real — keep AI out of this path." };
  }

  return {
    mode: "AI_ASSISTED",
    rationale: "Default: AI accelerates discrete steps while a human stays in charge of the outcome.",
  };
}
