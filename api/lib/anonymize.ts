import { and, eq } from "drizzle-orm";
import { matches, type Talent } from "@db/schema";
import { getDb } from "../queries/connection";

/**
 * Skills-first browsing ("blind first screen").
 *
 * Research on hiring discrimination is consistent: bias acts at fast judgment
 * points where identity is visible before capability is established. When a
 * recruiter opts in, we therefore strip identity signals (name, origin, video
 * intro) from pool responses until a match exists — the moment both sides
 * have chosen to connect on skills and story.
 *
 * Enforced server-side: identity fields never leave the API for anonymized
 * talents, so no client bug can leak them.
 */
export type PoolTalent = Talent & { anonymized: boolean };

export function maskTalent(t: Talent): PoolTalent {
  return {
    ...t,
    anonymized: true,
    name: "",
    origin: "",
  };
}

export function revealTalent(t: Talent): PoolTalent {
  return { ...t, anonymized: false };
}

/** Talent ids this recruiter is already connected with → identity revealed. */
export async function unlockedTalentIds(recruiterId: number): Promise<Set<number>> {
  const rows = await getDb().query.matches.findMany({
    where: eq(matches.recruiterId, recruiterId),
    columns: { talentId: true },
  });
  return new Set(rows.map((r) => r.talentId));
}

/** Does a match exist between this recruiter and this talent? */
export async function hasMatch(recruiterId: number, talentId: number): Promise<boolean> {
  const row = await getDb().query.matches.findFirst({
    where: and(eq(matches.recruiterId, recruiterId), eq(matches.talentId, talentId)),
    columns: { id: true },
  });
  return !!row;
}

/** Should identity be hidden from this user for this talent right now? */
export async function shouldMask(
  user: { role: string; id: number; anonymousBrowsing: boolean },
  talentId: number
): Promise<boolean> {
  if (user.role !== "recruiter" || !user.anonymousBrowsing) return false;
  return !(await hasMatch(user.id, talentId));
}
