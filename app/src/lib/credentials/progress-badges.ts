export const RANK_BADGE_REQUIREMENTS = [
  { slug: "rank-ai-ready-professional", requiredModules: [1, 2, 3, 4] },
  {
    slug: "rank-ai-problem-solver-solution-designer",
    requiredModules: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    slug: "rank-future-ready-ai-solution-designer",
    requiredModules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
] as const;

/** Rank credentials are derived from current PASSED module state, never history. */
export function earnedRankBadgeSlugs(passedModuleNumbers: Iterable<number>): Set<string> {
  const passed = new Set(passedModuleNumbers);
  return new Set(
    RANK_BADGE_REQUIREMENTS.filter((rank) =>
      rank.requiredModules.every((number) => passed.has(number)),
    ).map((rank) => rank.slug),
  );
}
