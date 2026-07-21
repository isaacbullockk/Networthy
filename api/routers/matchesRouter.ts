import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { authedQuery, recruiterQuery } from "../auth";
import { getDb } from "../queries/connection";
import { matches, talents } from "@db/schema";
import { and, eq } from "drizzle-orm";

const STAGES = ["connected", "video_chat", "questionnaire", "in_house", "hired", "retained"] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const matchesRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    if (ctx.user.role === "recruiter") {
      return db.query.matches.findMany({ where: eq(matches.recruiterId, ctx.user.id) });
    }
    if (!ctx.user.talentId) return [];
    return db.query.matches.findMany({ where: eq(matches.talentId, ctx.user.talentId) });
  }),

  create: recruiterQuery
    .input(z.object({ talentId: z.number(), role: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.matches.findFirst({
        where: and(eq(matches.talentId, input.talentId), eq(matches.recruiterId, ctx.user.id)),
      });
      if (existing) return existing;
      const talent = await db.query.talents.findFirst({
        where: eq(talents.id, input.talentId),
      });
      const [{ id }] = await db
        .insert(matches)
        .values({
          talentId: input.talentId,
          recruiterId: ctx.user.id,
          company: ctx.user.company ?? "Your company",
          role: input.role || talent?.role || "Open role",
          stage: "connected",
          lastActivity: today(),
        })
        .$returningId();
      return db.query.matches.findFirst({ where: eq(matches.id, id) });
    }),

  update: recruiterQuery
    .input(
      z.object({
        id: z.number(),
        stage: z.enum(STAGES).optional(),
        connectionRating: z.number().min(0).max(5).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({ where: eq(matches.id, input.id) });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      if (match.recruiterId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...patch } = input;
      // Entering 'hired' starts the 90-day retention journey
      const hiredAt =
        patch.stage === "hired" && match.stage !== "hired" && !match.hiredAt
          ? new Date()
          : match.hiredAt;
      await db
        .update(matches)
        .set({ ...patch, hiredAt: hiredAt ?? undefined, lastActivity: today() })
        .where(eq(matches.id, id));
      return db.query.matches.findFirst({ where: eq(matches.id, id) });
    }),
});
