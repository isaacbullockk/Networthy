import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { recruiterQuery } from "../auth";
import { getDb } from "../queries/connection";
import { assessments, vacancies } from "@db/schema";
import { eq } from "drizzle-orm";
import { maskTalent, revealTalent, unlockedTalentIds } from "../lib/anonymize";
import {
  extractAvailabilityFromText,
  extractLanguagesFromText,
  extractSkillsFromText,
  matchTalentToVacancy,
} from "../lib/matching";
import { rateLimit } from "../lib/rateLimit";
import { cosineSimilarity, embeddingText, getEmbedder, toSimilarity } from "../lib/embeddings";

/**
 * Embed capability signals only (skills/languages/availability). Returns
 * null when embeddings are disabled or the service fails — the vacancy
 * simply scores rules-only.
 */
async function embedCapabilitySignals(parts: {
  skills: string[];
  languages: string[];
  availability: string;
}): Promise<number[] | null> {
  const embedder = getEmbedder();
  if (!embedder) return null;
  const vectors = await embedder.embed([embeddingText(parts)]);
  return vectors?.[0] ?? null;
}

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

  /**
   * Quick-add: paste a job description, get a structured draft back.
   * Nothing is saved — the recruiter reviews and edits before creating.
   * Deterministic extraction only; no AI guessing, no invented skills.
   */
  parse: recruiterQuery
    .input(z.object({ text: z.string().min(10).max(20000) }))
    .mutation(async ({ ctx, input }) => {
      if (!rateLimit(`vacancies.parse:${ctx.user.id}`, 30, 60 * 60_000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts — try again later" });
      }
      const firstLine =
        input.text.split("\n").map((l) => l.trim()).find((l) => l.length >= 3 && l.length <= 80) ?? "";
      return {
        title: firstLine.replace(/^(vacature|job|position|functie)\s*[:\-–]\s*/i, ""),
        requiredSkills: extractSkillsFromText(input.text),
        languages: extractLanguagesFromText(input.text),
        availability: extractAvailabilityFromText(input.text),
      };
    }),

  create: recruiterQuery.input(vacancyInput).mutation(async ({ ctx, input }) => {
    if (!rateLimit(`vacancies.create:${ctx.user.id}`, 30, 60 * 60_000)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many vacancies — try again later" });
    }
    const embedding = await embedCapabilitySignals({
      skills: [...input.requiredSkills, ...input.niceSkills],
      languages: input.languages,
      availability: input.availability,
    });
    const [{ id }] = await getDb()
      .insert(vacancies)
      .values({ ...input, recruiterId: ctx.user.id, embedding })
      .$returningId();
    return getDb().query.vacancies.findFirst({ where: eq(vacancies.id, id) });
  }),

  update: recruiterQuery
    .input(vacancyInput.partial().extend({ id: z.number(), status: z.enum(["open", "closed"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ownVacancy(ctx.user.id, input.id);
      const { id, ...patch } = input;
      // Capability signals changed → re-embed. Unrelated patch → keep vector.
      const signalsChanged =
        patch.requiredSkills !== undefined ||
        patch.niceSkills !== undefined ||
        patch.languages !== undefined ||
        patch.availability !== undefined;
      const embedding = signalsChanged
        ? await embedCapabilitySignals({
            skills: [
              ...(patch.requiredSkills ?? existing.requiredSkills),
              ...(patch.niceSkills ?? existing.niceSkills),
            ],
            languages: patch.languages ?? existing.languages,
            availability: patch.availability ?? existing.availability,
          })
        : undefined;
      await getDb()
        .update(vacancies)
        .set(embedding === undefined ? patch : { ...patch, embedding })
        .where(eq(vacancies.id, id));
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
    if (!rateLimit(`vacancies.match:${ctx.user.id}`, 60, 60 * 60_000)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many ranking requests — try again later" });
    }
    const db = getDb();
    // Ranking scores the pool in-process; cap the scan to the 500 most recent
    // talents so the query stays bounded as the pool grows.
    const all = await db.query.talents.findMany({
      orderBy: (t, { desc }) => [desc(t.id)],
      limit: 500,
    });
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

    // Semantic layer: only when the embedder is configured AND both sides
    // carry an embedding. Everything else falls back to pure rules.
    const vacancyVec = vacancy.embedding ?? null;

    // Ranking needs every scanned talent scored; the scan is capped at 500
    // and rate-limited per recruiter. Revisit with pre-computation when the
    // pool approaches thousands.
    return all
      .map((t) => {
        const shown = unlocked && !unlocked.has(t.id) ? maskTalent(t) : revealTalent(t);
        // Dimension mismatch (e.g. model swapped mid-run) must degrade to
        // rules-only — never silently zero the similarity and penalize the
        // talent for an infrastructure inconsistency.
        const semanticSimilarity =
          vacancyVec && t.embedding && vacancyVec.length === t.embedding.length
            ? toSimilarity(cosineSimilarity(vacancyVec, t.embedding))
            : null;
        const result = matchTalentToVacancy(
          {
            requiredSkills: vacancy.requiredSkills,
            niceSkills: vacancy.niceSkills,
            languages: vacancy.languages,
            availability: vacancy.availability,
          },
          { skills: t.skills, languages: t.languages, availability: t.availability },
          verifiedByTalent.get(t.id) ?? [],
          { semanticSimilarity }
        );
        return { talent: shown, result };
      })
      .sort((a, b) => b.result.score - a.result.score)
      .slice(0, 50);
  }),
});
