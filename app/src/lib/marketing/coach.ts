/**
 * The Command coach (pure): a verdict on the campaign plus prioritized nudges.
 * Thresholds follow the original TenXPros Command design: reply-rate target
 * 15–25%, pivot after `pivotMessagesThreshold` messages with fewer than
 * `pivotCallsThreshold` calls, quit at 1.5x the message threshold with <2 calls
 * and ≥70% of the window gone.
 */

export type CoachInput = {
  targetBreakEven: number;
  targetIdeal: number;
  targetStretch: number;
  targetPipeline: number;
  pivotMessagesThreshold: number;
  pivotCallsThreshold: number;
  elapsedDays: number;
  remainingDays: number;
  progressPct: number; // 0-100 of the campaign window elapsed
  messagesSent: number;
  messagesExpected: number; // pace target from channel daily minimums
  repliesReceived: number;
  callsHeld: number;
  paidNow: number;
  activePipeline: number;
  /** Hot prospects still sitting in LIST for 14+ days: name + score. */
  staleHotProspects: Array<{ name: string; score: number }>;
  followupsDueToday: number;
};

export type CoachVerdict = {
  verdict:
    | "stretch_win"
    | "ideal_win"
    | "break_even_win"
    | "quit"
    | "pivot"
    | "on_track"
    | "build";
  headline: string;
  reasoning: string[];
  nextMove: string;
};

export type CoachNudge = {
  tone: "win" | "warn" | "info";
  title: string;
  body: string;
};

export function replyRate(messagesSent: number, repliesReceived: number): number {
  return messagesSent > 0 ? (repliesReceived / messagesSent) * 100 : 0;
}

export function closeRate(callsHeld: number, paidNow: number): number {
  return callsHeld > 0 ? (paidNow / callsHeld) * 100 : 0;
}

export function coachVerdict(c: CoachInput): CoachVerdict {
  if (c.paidNow >= c.targetStretch) {
    return {
      verdict: "stretch_win",
      headline: "Stretch goal hit. Big win.",
      reasoning: [
        `${c.paidNow} paid, past stretch (${c.targetStretch}).`,
        `${c.remainingDays} days remain in the window.`,
      ],
      nextMove: "Lock case studies. Plan a larger next cohort with a higher price.",
    };
  }
  if (c.paidNow >= c.targetIdeal) {
    return {
      verdict: "ideal_win",
      headline: "Ideal target hit.",
      reasoning: [
        `${c.paidNow} paid, at or above ideal (${c.targetIdeal}).`,
        `${c.remainingDays} days remain. Stretch is ${c.targetStretch}.`,
      ],
      nextMove: "Keep momentum. Add 2-3 more conversations to chase the stretch number.",
    };
  }
  if (c.paidNow >= c.targetBreakEven) {
    return {
      verdict: "break_even_win",
      headline: "Break-even reached. Push for ideal.",
      reasoning: [
        `${c.paidNow} paid, at or above break-even (${c.targetBreakEven}).`,
        `Ideal is ${c.targetIdeal}; ${c.remainingDays} days left.`,
      ],
      nextMove: "You've covered cost. Focus the remaining days on closing 1-2 more to hit ideal.",
    };
  }
  if (c.messagesSent >= c.pivotMessagesThreshold * 1.5 && c.callsHeld < 2 && c.progressPct >= 70) {
    return {
      verdict: "quit",
      headline: "Quit (or rebuild the offer entirely).",
      reasoning: [
        `${c.messagesSent} messages and only ${c.callsHeld} calls held.`,
        `${Math.round(c.progressPct)}% of the window is gone.`,
        "Past the pivot threshold by 1.5x with no conversion signal.",
      ],
      nextMove: "Stop outreach. Talk to 5 advisors before reshaping the offer or moving on.",
    };
  }
  if (c.messagesSent >= c.pivotMessagesThreshold && c.callsHeld < c.pivotCallsThreshold) {
    return {
      verdict: "pivot",
      headline: "Pivot the approach.",
      reasoning: [
        `${c.messagesSent} messages sent but only ${c.callsHeld} calls held (threshold ${c.pivotCallsThreshold}).`,
        "Volume is not the problem; the hook or the audience is.",
      ],
      nextMove: "Change ONE variable: the opener, the channel mix, or the segment. Then run the next 50 messages.",
    };
  }
  if (c.messagesSent >= 30) {
    return {
      verdict: "on_track",
      headline: "In motion. Keep executing.",
      reasoning: [
        `${c.messagesSent} messages, ${c.callsHeld} calls, ${c.paidNow} paid so far.`,
        `${c.remainingDays} days remain to reach break-even (${c.targetBreakEven}).`,
      ],
      nextMove: "Clear today's follow-ups first, then hit the daily floor on your strongest channel.",
    };
  }
  return {
    verdict: "build",
    headline: "Build the machine.",
    reasoning: [
      `Only ${c.messagesSent} messages sent so far.`,
      `Pipeline ${c.activePipeline}/${c.targetPipeline}.`,
    ],
    nextMove: "Finish the prospect list and send the first wave. Nothing matters before volume exists.",
  };
}

export function coachNudges(c: CoachInput): CoachNudge[] {
  const nudges: CoachNudge[] = [];
  const reply = replyRate(c.messagesSent, c.repliesReceived);
  const close = closeRate(c.callsHeld, c.paidNow);
  const pacePct = c.messagesExpected > 0 ? (c.messagesSent / c.messagesExpected) * 100 : 100;

  if (c.followupsDueToday > 0) {
    nudges.push({
      tone: "info",
      title: `${c.followupsDueToday} follow-up${c.followupsDueToday === 1 ? "" : "s"} due today`,
      body: "Clear today's follow-ups before sending new cold messages. Compound value comes from second and third touches.",
    });
  }
  if (pacePct < 80 && c.elapsedDays > 1) {
    const behind = Math.max(0, c.messagesExpected - c.messagesSent);
    nudges.push({
      tone: "warn",
      title: "Activity below target",
      body: `${c.messagesSent}/${c.messagesExpected} messages sent (${Math.round(pacePct)}%). You're ${behind} behind. Hit the daily floor on your strongest channel today.`,
    });
  }
  if (c.messagesSent > 30 && c.callsHeld / Math.max(1, c.messagesSent) < 0.03) {
    nudges.push({
      tone: "warn",
      title: "Conversation gap",
      body: `Only ${c.callsHeld} calls against ${c.messagesSent} messages. Your hook may not be earning a conversation. Test a different opener with the next 20 messages.`,
    });
  }
  if (c.messagesSent >= 30 && reply < 10) {
    nudges.push({
      tone: "warn",
      title: "Reply rate is low",
      body: `Reply rate is ${reply.toFixed(1)}% (target 15-25%). Rewrite the first line to be specific to the prospect, not generic.`,
    });
  } else if (c.messagesSent >= 30 && reply >= 20) {
    nudges.push({
      tone: "win",
      title: "Hook is working",
      body: `Reply rate ${reply.toFixed(1)}%, above target. Keep this opener; vary only the personalization layer.`,
    });
  }
  if (c.callsHeld >= 5 && close < 20) {
    nudges.push({
      tone: "warn",
      title: "Calls aren't closing",
      body: `${c.callsHeld} calls held, only ${c.paidNow} paid (${close.toFixed(1)}%). Tighten the offer or the price anchor. Lead with a real case study.`,
    });
  } else if (c.callsHeld >= 3 && close >= 40) {
    nudges.push({
      tone: "win",
      title: "Offer converts on the call",
      body: `${close.toFixed(0)}% close rate on calls held. Volume is your only remaining lever; push messaging.`,
    });
  }
  if (c.staleHotProspects.length > 0) {
    nudges.push({
      tone: "info",
      title: `${c.staleHotProspects.length} hot prospect${c.staleHotProspects.length === 1 ? "" : "s"} still in "List"`,
      body: `Highest scored: ${c.staleHotProspects
        .map((p) => `${p.name} (${p.score})`)
        .join(", ")}. Approach these first; they have the most pain x authority x access.`,
    });
  }
  if (c.activePipeline < c.targetPipeline * 0.5 && c.elapsedDays > 7) {
    nudges.push({
      tone: "warn",
      title: "Pipeline coverage is thin",
      body: `${c.activePipeline} live prospects against a target of ${c.targetPipeline}. Add fresh names to the list; conversions need raw coverage.`,
    });
  }
  return nudges;
}
