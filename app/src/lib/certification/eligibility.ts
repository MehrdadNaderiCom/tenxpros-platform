import type { CertificateLevel } from "@prisma/client";

export interface EligibilityInputs {
  diagnosticCompleted: boolean;
  basicLiteracyModulesCompleted: number;
  rolePathModulesCompleted: number;
  advancedScenariosCompleted: number;
  tasksMapped: number;
  tasksClassified: number;
  evidenceCount: number;
  scenariosCompleted: number;
  workflowsBuilt: number;
  outputQualityEvidence: boolean;
  riskAwarenessPassed: boolean;
  reviewerApproved: boolean;
  productivityImprovementEvidence: boolean;
  implementationDesignSubmitted: boolean;
  oversightDemonstrated: boolean;
  teamAdoptionPlan: boolean;
  enablementMaterials: boolean;
  governanceScenario: boolean;
  guidedOthersEvidence: boolean;
  leadershipEvidence: boolean;
}

export interface RequirementCheck {
  key: string;
  label: string;
  satisfied: boolean;
}

export interface EligibilityResult {
  level: CertificateLevel;
  satisfied: number;
  total: number;
  ready: boolean;
  checks: RequirementCheck[];
}

export function evaluateLevel(level: CertificateLevel, i: EligibilityInputs): EligibilityResult {
  const checks: RequirementCheck[] = [];

  const add = (key: string, label: string, satisfied: boolean) =>
    checks.push({ key, label, satisfied });

  switch (level) {
    case "L1_AI_READY":
      add("diagnostic", "Complete the AI readiness diagnostic", i.diagnosticCompleted);
      add("literacy", "Complete the basic AI literacy module", i.basicLiteracyModulesCompleted >= 1);
      add("tasks_mapped", "Map at least 5 professional tasks", i.tasksMapped >= 5);
      add("tasks_classified", "Classify at least 5 tasks by work mode", i.tasksClassified >= 5);
      add("evidence", "Submit at least 1 evidence artifact", i.evidenceCount >= 1);
      add("scenarios", "Complete at least 2 scenario assessments", i.scenariosCompleted >= 2);
      add("risk", "Pass the basic risk & privacy awareness check", i.riskAwarenessPassed);
      break;
    case "L2_AI_ADOPTED":
      add("role_path", "Complete a role-specific learning path", i.rolePathModulesCompleted >= 3);
      add("tasks_mapped_10", "Map at least 10 professional tasks", i.tasksMapped >= 10);
      add("evidence_3", "Submit at least 3 evidence artifacts", i.evidenceCount >= 3);
      add("workflows_2", "Build at least 2 repeatable AI workflows", i.workflowsBuilt >= 2);
      add("scenarios_4", "Complete at least 4 scenario assessments", i.scenariosCompleted >= 4);
      add("quality_control", "Demonstrate output quality control", i.outputQualityEvidence);
      add("reviewer_approval", "Pass reviewer/admin verification", i.reviewerApproved);
      break;
    case "L3_AI_AUGMENTED":
      add("advanced_chain", "Submit an advanced workflow chain", i.workflowsBuilt >= 3);
      add("productivity", "Show measurable productivity / quality improvement evidence", i.productivityImprovementEvidence);
      add("advanced_scenarios", "Complete advanced role-specific scenarios", i.advancedScenariosCompleted >= 2);
      add("implementation_design", "Submit an implementation/escalation design for at least 1 task", i.implementationDesignSubmitted);
      add("oversight", "Demonstrate risk management and human oversight", i.oversightDemonstrated);
      add("reviewer_approval", "Pass reviewer/admin verification", i.reviewerApproved);
      break;
    case "L4_AI_IMPLEMENTER":
      add("team_plan", "Design a team-level AI adoption plan", i.teamAdoptionPlan);
      add("enablement", "Create enablement / training material", i.enablementMaterials);
      add("governance", "Complete a governance-aware scenario", i.governanceScenario);
      add("implementation_design_l4", "Submit implementation/tooling design", i.implementationDesignSubmitted);
      add("reviewer_approval", "Pass reviewer/admin verification", i.reviewerApproved);
      break;
    case "L5_AI_LEADER":
      add("leadership_evidence", "Submit adoption leadership evidence", i.leadershipEvidence);
      add("guided_others", "Demonstrate ability to guide others", i.guidedOthersEvidence);
      add("team_plan_l5", "Ship a team-level AI adoption plan", i.teamAdoptionPlan);
      add("governance_l5", "Complete a governance-aware scenario", i.governanceScenario);
      add("reviewer_approval", "Pass reviewer/admin verification", i.reviewerApproved);
      break;
  }

  const satisfied = checks.filter((c) => c.satisfied).length;
  return {
    level,
    satisfied,
    total: checks.length,
    ready: satisfied === checks.length,
    checks,
  };
}

export function evaluateAllLevels(i: EligibilityInputs): EligibilityResult[] {
  return (["L1_AI_READY", "L2_AI_ADOPTED", "L3_AI_AUGMENTED", "L4_AI_IMPLEMENTER", "L5_AI_LEADER"] as CertificateLevel[]).map((l) =>
    evaluateLevel(l, i),
  );
}
