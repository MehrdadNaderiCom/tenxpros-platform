import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  certificationRanks,
  dossierSections,
  finalReview,
  programModules
} from "../src/components/marketing/content";

const canonicalModuleTitles = [
  "AI Readiness & TenXPro Mindset",
  "Practical AI Literacy & Hands-On Tool Fluency",
  "Responsible AI & Professional Boundaries",
  "Problem Discovery & Structured Framing",
  "Context, Stakeholder & Initial Foresight Mapping",
  "Data, Evidence & Verification Discipline",
  "Workflow, Task & Human-AI Allocation",
  "Responsible AI Solution Design",
  "Adoption, Communication & Change Design",
  "Value, Roadmap & Proof Plan",
  "AI Foresight, Scenario Planning & Future-Proofing"
];

const canonicalDossierSections = [
  "Professional Context",
  "Problem Definition",
  "AI Suitability Assessment",
  "Context, Stakeholder & Initial Foresight Analysis",
  "Data & Evidence Review",
  "Workflow Before / After",
  "Risk, Ethics, Privacy & Compliance Review",
  "Responsible AI Solution Design",
  "Adoption & Communication Plan",
  "Value, Roadmap & Proof Plan",
  "Personal AI Foresight Plan",
  "Final Recommendation"
];

describe("public program content contract", () => {
  it("keeps the eleven canonical Core Modules in order", () => {
    expect(programModules.flatMap((phase) => phase.modules.map((item) => item.title)))
      .toEqual(canonicalModuleTitles);
    expect(finalReview.title).toBe("Final Dossier & Capstone Review");
  });

  it("keeps the twelve canonical Dossier sections in order", () => {
    expect(dossierSections.map((section) => section.title)).toEqual(
      canonicalDossierSections
    );
  });

  it("keeps the three canonical Certification ranks", () => {
    expect(certificationRanks.map((rank) => rank.title)).toEqual([
      "AI-Ready Professional",
      "AI Problem Solver & Solution Designer",
      "Future-Ready AI Solution Designer"
    ]);
  });

  it("ships working PDF, HTML and gallery sample assets", () => {
    const sampleRoot = resolve(process.cwd(), "public/samples");
    const expectedFiles = [
      "tenxpros-sample-dossier-excerpt.pdf",
      "tenxpros-sample-dossier-excerpt.html",
      "tenxpros-sample-dossier-cover.png",
      "tenxpros-sample-dossier-snapshot.png",
      "tenxpros-sample-dossier-assets-rubric.png"
    ];

    for (const fileName of expectedFiles) {
      expect(existsSync(resolve(sampleRoot, fileName))).toBe(true);
    }

    expect(
      readFileSync(
        resolve(sampleRoot, "tenxpros-sample-dossier-excerpt.pdf")
      )
        .subarray(0, 5)
        .toString("ascii")
    ).toBe("%PDF-");
  });
});
