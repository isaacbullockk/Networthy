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
/**
 * A masked talent has its identity fields cleared — the type says so
 * literally ("" instead of string) so no caller can pretend otherwise.
 */
export type MaskedTalent = Omit<Talent, "name" | "origin" | "tagline" | "story"> & {
  anonymized: true;
  name: "";
  origin: "";
  tagline: "";
  story: "";
};
export type RevealedTalent = Talent & { anonymized: false };
export type PoolTalent = MaskedTalent | RevealedTalent;

export function maskTalent(t: Talent): MaskedTalent {
  return {
    ...t,
    anonymized: true,
    name: "",
    origin: "",
    // Free text is identity too: a story like "fed half our street in Asmara"
    // identifies a person even without a name. Unlocks after accepted consent.
    tagline: "",
    story: "",
  };
}

export function revealTalent(t: Talent): RevealedTalent {
  return { ...t, anonymized: false };
}

/** Identity unlocks only when the talent has ACCEPTED the connection. */
export function consentUnlocksIdentity(consent: string | null | undefined): boolean {
  return consent === "accepted";
}

/** Talent ids this recruiter may see unmasked → accepted matches only. */
export async function unlockedTalentIds(recruiterId: number): Promise<Set<number>> {
  const rows = await getDb().query.matches.findMany({
    where: and(eq(matches.recruiterId, recruiterId), eq(matches.talentConsent, "accepted")),
    columns: { talentId: true },
  });
  return new Set(rows.map((r) => r.talentId));
}

/** Does an ACCEPTED match exist between this recruiter and this talent? */
export async function hasMatch(recruiterId: number, talentId: number): Promise<boolean> {
  const row = await getDb().query.matches.findFirst({
    where: and(
      eq(matches.recruiterId, recruiterId),
      eq(matches.talentId, talentId),
      eq(matches.talentConsent, "accepted")
    ),
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
