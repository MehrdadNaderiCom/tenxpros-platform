import { describe, expect, it } from "vitest";

import {
  allProgramModulesCompleted,
  credentialIsPublic,
  credentialPrerequisiteFailure,
  diagnosticOverallScore,
  dossierSectionIsComplete,
  isLearningMemberStatus,
  moduleIsUnlocked,
  PROGRAM_MODULE_COUNT,
} from "@/lib/learning";

describe("Diagnostic score", () => {
  it("maps five ratings to a score out of one hundred", () => {
    expect(
      diagnosticOverallScore({
        strategyScore: 5,
        workflowScore: 4,
        dataScore: 3,
        deliveryScore: 2,
        governanceScore: 1,
      }),
    ).toBe(60);
  });
});

describe("Sequential program workflow", () => {
  it("unlocks the first Module without previous completion", () => {
    expect(moduleIsUnlocked(1, new Set())).toBe(true);
  });

  it("unlocks each later Module only after its immediate predecessor", () => {
    expect(moduleIsUnlocked(5, new Set([1, 2, 3]))).toBe(false);
    expect(moduleIsUnlocked(5, new Set([4]))).toBe(true);
  });

  it("rejects Module numbers outside the defined program", () => {
    expect(moduleIsUnlocked(0, new Set())).toBe(false);
    expect(
      moduleIsUnlocked(PROGRAM_MODULE_COUNT + 1, new Set([11])),
    ).toBe(false);
  });

  it("requires all eleven distinct Modules for final completion", () => {
    expect(allProgramModulesCompleted([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(
      false,
    );
    expect(
      allProgramModulesCompleted([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    ).toBe(true);
    expect(allProgramModulesCompleted([1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(
      false,
    );
  });
});

describe("Dossier readiness", () => {
  it("counts trimmed content only after the minimum length", () => {
    expect(dossierSectionIsComplete("ا".repeat(79))).toBe(false);
    expect(dossierSectionIsComplete(`  ${"ا".repeat(80)}  `)).toBe(true);
    expect(dossierSectionIsComplete(null)).toBe(false);
  });
});

describe("Learning and Credential eligibility", () => {
  it("allows only active members and graduates into learning routes", () => {
    expect(isLearningMemberStatus("ACTIVE")).toBe(true);
    expect(isLearningMemberStatus("GRADUATED")).toBe(true);
    expect(isLearningMemberStatus("PENDING_PAYMENT")).toBe(false);
    expect(isLearningMemberStatus("REVOKED")).toBe(false);
  });

  it("publishes only a non-revoked issued Credential", () => {
    expect(credentialIsPublic({ status: "ISSUED", revokedAt: null })).toBe(
      true,
    );
    expect(
      credentialIsPublic({ status: "REVOKED", revokedAt: new Date() }),
    ).toBe(false);
    expect(
      credentialIsPublic({ status: "ISSUED", revokedAt: new Date() }),
    ).toBe(false);
  });

  it("reports every blocking prerequisite before Credential issuance", () => {
    const ready = {
      dossierStatus: "APPROVED",
      dossierApprovedAt: new Date(),
      membershipStatus: "ACTIVE",
      diagnosticStatus: "REVIEWED",
      completedModuleNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    };

    expect(credentialPrerequisiteFailure(ready)).toBeNull();
    expect(
      credentialPrerequisiteFailure({
        ...ready,
        dossierStatus: "SUBMITTED",
      }),
    ).toBe("dossier_required");
    expect(
      credentialPrerequisiteFailure({
        ...ready,
        membershipStatus: "SUSPENDED",
      }),
    ).toBe("member_ineligible");
    expect(
      credentialPrerequisiteFailure({
        ...ready,
        diagnosticStatus: "SUBMITTED",
      }),
    ).toBe("diagnostic_required");
    expect(
      credentialPrerequisiteFailure({
        ...ready,
        completedModuleNumbers: ready.completedModuleNumbers.slice(0, 10),
      }),
    ).toBe("modules_required");
  });
});
