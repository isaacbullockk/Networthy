import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { authedQuery, recruiterQuery, talentQuery } from "../auth";
import { getDb } from "../queries/connection";
import { assessments, talents, videoIntros } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { maskTalent, revealTalent, shouldMask, unlockedTalentIds } from "../lib/anonymize";
import { scoreSkills } from "../lib/scoring";

/** A talent as served to clients: never the static DB matchScore/matchReasons. */
function withComputedScore<T extends { matchScore: number; matchReasons: string[]; skills: string[] }>(
  t: T,
  extra: { verifiedCount: number; verifiedSkills: string[] },
  wantedSkills: string[]
) {
  const { matchScore: _legacyScore, matchReasons: _legacyReasons, ...rest } = t;
  const scored = scoreSkills(wantedSkills, rest.skills, extra.verifiedSkills);
  return {
    ...rest,
    ...extra,
    matchScore: scored.score,
    matchReasons: scored.reasons,
  };
}

export const talentsRouter = createRouter({
  list: recruiterQuery
    .input(
      z
        .object({ skills: z.array(z.string().max(80)).max(20).optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const all = await db.query.talents.findMany();
      const published = await db.query.assessments.findMany({
        where: eq(assessments.status, "published"),
      });
      const counts = new Map<number, number>();
      const verifiedSkills = new Map<number, Set<string>>();
      for (const a of published) {
        counts.set(a.talentId, (counts.get(a.talentId) ?? 0) + 1);
        const set = verifiedSkills.get(a.talentId) ?? new Set<string>();
        for (const s of a.skillsVerified) set.add(s);
        verifiedSkills.set(a.talentId, set);
      }
      // Skills-first browsing: identity stays server-side until a match exists
      const unlocked = ctx.user.anonymousBrowsing
        ? await unlockedTalentIds(ctx.user.id)
        : null;
      const wanted = input?.skills ?? [];
      return all.map((t) => {
        const shown = unlocked && !unlocked.has(t.id) ? maskTalent(t) : revealTalent(t);
        return withComputedScore(
          shown,
          {
            verifiedCount: counts.get(t.id) ?? 0,
            verifiedSkills: [...(verifiedSkills.get(t.id) ?? [])],
          },
          wanted
        );
      });
    }),

  /** Metadata for the async video intro (actual video served at /api/video-intro/:id). */
  videoMeta: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Video is identity — hidden while skills-first browsing, until connected
      if (await shouldMask(ctx.user, input.id)) return null;
      const row = await getDb().query.videoIntros.findFirst({
        where: eq(videoIntros.talentId, input.id),
        columns: { talentId: true, mimeType: true, durationSec: true, updatedAt: true },
      });
      return row ?? null;
    }),

  byId: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "talent" && ctx.user.talentId !== input.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const talent = await getDb().query.talents.findFirst({
        where: eq(talents.id, input.id),
      });
      if (!talent) throw new TRPCError({ code: "NOT_FOUND" });
      const published = await getDb().query.assessments.findMany({
        where: and(eq(assessments.status, "published"), eq(assessments.talentId, talent.id)),
      });
      const verifiedSkills = [...new Set(published.flatMap((a) => a.skillsVerified))];
      const shown = (await shouldMask(ctx.user, input.id)) ? maskTalent(talent) : revealTalent(talent);
      // No demand signal on a profile view → no score, only real verified skills
      return withComputedScore(
        shown,
        { verifiedCount: published.length, verifiedSkills },
        []
      );
    }),

  mine: talentQuery.query(async ({ ctx }) => {
    if (!ctx.user.talentId) throw new TRPCError({ code: "NOT_FOUND" });
    return getDb().query.talents.findFirst({
      where: eq(talents.id, ctx.user.talentId),
    });
  }),

  updateProfile: talentQuery
    .input(
      z.object({
        tagline: z.string().min(1),
        story: z.string().min(1),
        lookingFor: z.string().min(1),
        availability: z.string().min(1),
        role: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.talentId) throw new TRPCError({ code: "NOT_FOUND" });
      await getDb()
        .update(talents)
        .set(input)
        .where(eq(talents.id, ctx.user.talentId));
      return getDb().query.talents.findFirst({
        where: eq(talents.id, ctx.user.talentId),
      });
    }),
});
