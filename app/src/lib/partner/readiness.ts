/**
 * Start-work readiness: the single rule for when a partner may begin registering
 * opportunities ("start working"). BOTH milestones must be done:
 *   1. Academy complete: the comprehensive final exam is passed, so a certificate
 *      badge exists on the partner (PartnerAcademyBadge).
 *   2. Onboarding complete: the Activation Gate is confirmed on the panel
 *      (activationGatePassedAt is set).
 *
 * This module is pure (no DB, no I/O) so the gate on the server actions, the
 * dashboard, and the panel-wide reminder all read the same rule and can never
 * drift. Callers pass in the two facts; this decides readiness.
 */

export interface StartReadiness {
  academyComplete: boolean;
  onboardingComplete: boolean;
  ready: boolean;
}

export function startReadiness(args: {
  activationGatePassedAt: Date | null | undefined;
  hasAcademyBadge: boolean;
}): StartReadiness {
  const academyComplete = args.hasAcademyBadge;
  const onboardingComplete = Boolean(args.activationGatePassedAt);
  return { academyComplete, onboardingComplete, ready: academyComplete && onboardingComplete };
}

/**
 * The plain-language message shown when a partner tries to start working before
 * they are ready. It names exactly what is still missing, so there is no guessing.
 */
export function notReadyMessage(r: StartReadiness): string {
  if (r.ready) return "";
  const missing: string[] = [];
  if (!r.academyComplete) missing.push("finish the Academy and pass the final exam");
  if (!r.onboardingComplete) missing.push("complete onboarding (the Activation Gate)");
  return `Before you can register opportunities, ${missing.join(" and ")}.`;
}
