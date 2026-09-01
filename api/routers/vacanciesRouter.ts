import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { recruiterQuery } from "../auth";
import { getDb } from "../queries/connection";
import { assessments, vacancies } from "@db/schema";
import { eq } from "drizzle-orm";
import { maskTalent, revealTalent, unlockedTalentIds } from "../lib/anonymize";
import { matchTalentToVacancy } from "../lib/matching";
import { rateLimit } from "../lib/rateLimit";

const vacancyInput = z.object({
  title: z.string().min(1).max(255),
  // At least one required skill: a vacancy without demands would score every
  // talent at 100, which defeats ranking.
  requiredSkills: z.array(z.string().min(1).max(80)).min(1).max(20),
  niceSkills: z.array(z.string().min(1).max(80)).max(20),
  languages: z.array(z.string().min(1).max(60)).max(10),
  availability: z.string().max(255),
});

async function ownVacancy(recruiterId: number, vacancyId: number) {
  const v = await getDb().query.vacancies.findFirst({ where: eq(vacancies.id, vacancyId) });
  if (!v) throw new TRPCError({ code: "NOT_FOUND" });
  if (v.recruiterId !== recruiterId) throw new TRPCError({ code: "FORBIDDEN" });
  return v;
}

export const vacanciesRouter = createRouter({
  list: recruiterQuery.query(async ({ ctx }) => {
    return getDb().query.vacancies.findMany({
      where: eq(vacancies.recruiterId, ctx.user.id),
      orderBy: (v, { desc }) => [desc(v.createdAt)],
    });
  }),

  create: recruiterQuery.input(vacancyInput).mutation(async ({ ctx, input }) => {
    if (!rateLimit(`vacancies.create:${ctx.user.id}`, 30, 60 * 60_000)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many vacancies — try again later" });
    }
    const [{ id }] = await getDb()
      .insert(vacancies)
      .values({ ...input, recruiterId: ctx.user.id })
      .$returningId();
    return getDb().query.vacancies.findFirst({ where: eq(vacancies.id, id) });
  }),

  update: recruiterQuery
    .input(vacancyInput.partial().extend({ id: z.number(), status: z.enum(["open", "closed"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      await ownVacancy(ctx.user.id, input.id);
      const { id, ...patch } = input;
      await getDb().update(vacancies).set(patch).where(eq(vacancies.id, id));
      return getDb().query.vacancies.findFirst({ where: eq(vacancies.id, id) });
    }),

  remove: recruiterQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await ownVacancy(ctx.user.id, input.id);
    await getDb().delete(vacancies).where(eq(vacancies.id, input.id));
    return { ok: true };
  }),

  /**
   * Ranked talents for one vacancy. Scores are computed server-side from
   * non-identity fields only, so anonymous browsing is fully compatible:
   * masked talents are scored on the same skills/languages/availability.
   */
  match: recruiterQuery.input(z.object({ vacancyId: z.number() })).query(async ({ ctx, input }) => {
    const vacancy = await ownVacancy(ctx.user.id, input.vacancyId);
    const db = getDb();
    const all = await db.query.talents.findMany();
    const published = await db.query.assessments.findMany({
      where: eq(assessments.status, "published"),
    });
    const verifiedByTalent = new Map<number, string[]>();
    for (const a of published) {
      const list = verifiedByTalent.get(a.talentId) ?? [];
      list.push(...a.skillsVerified);
      verifiedByTalent.set(a.talentId, list);
    }
    const unlocked = ctx.user.anonymousBrowsing ? await unlockedTalentIds(ctx.user.id) : null;

    // Note: ranking needs every talent scored, so this loads the full pool.
    // Fine at current scale (hundreds); revisit with pre-computation/pagination
    // when the pool approaches thousands.
    return all
      .map((t) => {
        const shown = unlocked && !unlocked.has(t.id) ? maskTalent(t) : revealTalent(t);
        const result = matchTalentToVacancy(
          {
            requiredSkills: vacancy.requiredSkills,
            niceSkills: vacancy.niceSkills,
            languages: vacancy.languages,
            availability: vacancy.availability,
          },
          { skills: t.skills, languages: t.languages, availability: t.availability },
          verifiedByTalent.get(t.id) ?? []
        );
        return { talent: shown, result };
      })
      .sort((a, b) => b.result.score - a.result.score)
      .slice(0, 50);
  }),
});
