import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { assessorQuery, authedQuery, talentQuery } from "../auth";
import { getDb } from "../queries/connection";
import { assessments, users } from "@db/schema";
import { and, desc, eq } from "drizzle-orm";

function requireCharter(user: { charterSignedAt: Date | null }) {
  if (!user.charterSignedAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sign the confidentiality charter before assessing.",
    });
  }
}

export const assessmentsRouter = createRouter({
  /** Assessor: sign the confidentiality charter (once). */
  signCharter: assessorQuery.mutation(async ({ ctx }) => {
    await getDb()
      .update(users)
      .set({ charterSignedAt: new Date() })
      .where(eq(users.id, ctx.user.id));
    return { signed: true };
  }),

  /** Assessor directory: every talent + my latest assessment for each. */
  directory: assessorQuery.query(async ({ ctx }) => {
    requireCharter(ctx.user);
    const db = getDb();
    const all = await db.query.talents.findMany();
    const mine = await db.query.assessments.findMany({
      where: eq(assessments.assessorId, ctx.user.id),
      orderBy: desc(assessments.createdAt),
    });
    const byTalent = new Map<number, (typeof mine)[number]>();
    for (const a of mine) if (!byTalent.has(a.talentId)) byTalent.set(a.talentId, a);
    return all.map((t) => ({ ...t, myAssessment: byTalent.get(t.id) ?? null }));
  }),

  /** Assessor: start (or resume) an assessment for a talent. */
  start: assessorQuery
    .input(z.object({ talentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireCharter(ctx.user);
      const db = getDb();
      const existing = await db.query.assessments.findFirst({
        where: and(
          eq(assessments.talentId, input.talentId),
          eq(assessments.assessorId, ctx.user.id),
          eq(assessments.status, "in_progress")
        ),
      });
      if (existing) return existing;
      const [{ id }] = await db
        .insert(assessments)
        .values({
          talentId: input.talentId,
          assessorId: ctx.user.id,
          skillsVerified: [],
          strengths: "",
          summary: "",
        })
        .$returningId();
      return db.query.assessments.findFirst({ where: eq(assessments.id, id) });
    }),

  /** Assessor: submit the completed assessment → talent must approve it. */
  submit: assessorQuery
    .input(
      z.object({
        assessmentId: z.number(),
        skillsVerified: z.array(z.string().min(1)).min(1),
        strengths: z.string().min(10),
        summary: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireCharter(ctx.user);
      const db = getDb();
      const a = await db.query.assessments.findFirst({
        where: eq(assessments.id, input.assessmentId),
      });
      if (!a || a.assessorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (a.status !== "in_progress")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already submitted." });
      await db
        .update(assessments)
        .set({
          skillsVerified: input.skillsVerified,
          strengths: input.strengths,
          summary: input.summary,
          status: "pending_approval",
          submittedAt: new Date(),
        })
        .where(eq(assessments.id, a.id));
      return { ok: true };
    }),

  /** Talent: all my assessments (with assessor names), newest first. */
  mine: talentQuery.query(async ({ ctx }) => {
    if (!ctx.user.talentId) throw new TRPCError({ code: "NOT_FOUND" });
    return getDb()
      .select({ assessment: assessments, assessorName: users.name })
      .from(assessments)
      .innerJoin(users, eq(users.id, assessments.assessorId))
      .where(eq(assessments.talentId, ctx.user.talentId))
      .orderBy(desc(assessments.createdAt));
  }),

  /** Talent: approve & publish — nothing appears on the profile without this. */
  approve: talentQuery
    .input(z.object({ assessmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const a = await db.query.assessments.findFirst({
        where: eq(assessments.id, input.assessmentId),
      });
      if (!a || a.talentId !== ctx.user.talentId) throw new TRPCError({ code: "FORBIDDEN" });
      if (a.status !== "pending_approval")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing to approve." });
      await db
        .update(assessments)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(assessments.id, a.id));
      return { ok: true };
    }),

  /** Talent: decline — the assessment is deleted, the talent controls their story. */
  decline: talentQuery
    .input(z.object({ assessmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const a = await db.query.assessments.findFirst({
        where: eq(assessments.id, input.assessmentId),
      });
      if (!a || a.talentId !== ctx.user.talentId) throw new TRPCError({ code: "FORBIDDEN" });
      if (a.status === "published")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already published." });
      await db.delete(assessments).where(eq(assessments.id, a.id));
      return { ok: true };
    }),

  /** Published assessments for a talent profile (recruiter/assessor view). */
  forTalent: authedQuery
    .input(z.object({ talentId: z.number() }))
    .query(async ({ input }) => {
      return getDb()
        .select({ assessment: assessments, assessorName: users.name })
        .from(assessments)
        .innerJoin(users, eq(users.id, assessments.assessorId))
        .where(
          and(eq(assessments.talentId, input.talentId), eq(assessments.status, "published"))
        )
        .orderBy(desc(assessments.publishedAt));
    }),
});
