import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { authedQuery, recruiterQuery, talentQuery } from "../auth";
import { getDb } from "../queries/connection";
import { matches, talents, users } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { rateLimit } from "../lib/rateLimit";
import { sendConnectionRequest } from "../lib/email";

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

  /** Recruiter requests a connection. Identity stays locked until the talent accepts. */
  create: recruiterQuery
    .input(z.object({ talentId: z.number(), role: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Connection requests reach real people — no spray-and-pray.
      if (!rateLimit(`matches.create:${ctx.user.id}`, 20, 60 * 60_000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many connection requests — try again later",
        });
      }
      const db = getDb();
      const existing = await db.query.matches.findFirst({
        where: and(eq(matches.talentId, input.talentId), eq(matches.recruiterId, ctx.user.id)),
      });
      if (existing) {
        // A declined request stays declined — no re-request spam.
        if (existing.talentConsent === "declined") {
          throw new TRPCError({ code: "FORBIDDEN", message: "This talent has declined the connection." });
        }
        return existing;
      }
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
          talentConsent: "pending",
          lastActivity: today(),
        })
        .$returningId();
      // Tell the talent — they hold the accept/decline decision.
      const talentUser = await db.query.users.findFirst({
        where: eq(users.talentId, input.talentId),
      });
      if (talentUser) {
        sendConnectionRequest(
          talentUser.email,
          talentUser.name,
          ctx.user.company ?? "An employer",
          talentUser.locale
        );
      }
      return db.query.matches.findFirst({ where: eq(matches.id, id) });
    }),

  /** Talent accepts or declines a connection request. Identity unlocks only on accept. */
  respond: talentQuery
    .input(z.object({ id: z.number(), accept: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({ where: eq(matches.id, input.id) });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      if (!ctx.user.talentId || match.talentId !== ctx.user.talentId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (match.talentConsent !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This request was already answered." });
      }
      await db
        .update(matches)
        .set({
          talentConsent: input.accept ? "accepted" : "declined",
          lastActivity: today(),
        })
        .where(eq(matches.id, input.id));
      return db.query.matches.findFirst({ where: eq(matches.id, input.id) });
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
      // Stage transitions wait for the talent's yes; notes/rating are the
      // recruiter's private workspace and stay editable anytime.
      if (input.stage && match.talentConsent !== "accepted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Waiting for the talent to accept the connection." });
      }
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
