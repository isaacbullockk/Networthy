/**
 * Explainable skills matching — replaces the fabricated static matchScore.
 *
 * Rules (deliberately simple and auditable):
 *  - A score exists ONLY when the recruiter states what they are hiring for
 *    (wantedSkills). Without a demand signal there is no match to compute,
 *    so scoreSkills returns null and the UI renders no percentage.
 *  - A wanted skill "matches" when it appears in the talent's self-reported
 *    skills or in skills verified by a published assessment.
 *  - Verified matches weigh heavier: score = 60% coverage + 40% verified
 *    coverage of the wanted skills, rounded to an integer 0-100.
 *  - Every reason string is generated from real data (skill name + whether
 *    an assessor verified it). No marketing claims, no fabrication.
 *
 * Matching is case-insensitive and compares whole skills after trimming.
 * It never uses name, origin, age, or any other identity signal.
 */

export interface SkillMatch {
  skill: string;
  verified: boolean;
}

export interface SkillScore {
  /** null when no wanted skills were provided — there is nothing to score */
  score: number | null;
  matched: SkillMatch[];
  reasons: string[];
}

const norm = (s: string) => s.trim().toLowerCase();

export function scoreSkills(
  wantedSkills: string[],
  talentSkills: string[],
  verifiedSkills: string[]
): SkillScore {
  const wanted = [...new Set(wantedSkills.map(norm).filter(Boolean))];
  if (wanted.length === 0) return { score: null, matched: [], reasons: [] };

  const selfReported = new Set(talentSkills.map(norm));
  const verified = new Set(verifiedSkills.map(norm));

  const matched: SkillMatch[] = wanted
    .filter((w) => selfReported.has(w) || verified.has(w))
    .map((w) => ({ skill: w, verified: verified.has(w) }));

  const coverage = matched.length / wanted.length;
  const verifiedCoverage = matched.filter((m) => m.verified).length / wanted.length;
  const score = Math.round(100 * (0.6 * coverage + 0.4 * verifiedCoverage));

  const reasons = matched.map((m) =>
    m.verified ? `${m.skill} — verified by an assessor` : `${m.skill} — self-reported`
  );

  return { score, matched, reasons };
}
