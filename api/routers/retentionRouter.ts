import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { authedQuery, recruiterQuery } from "../auth";
import { getDb } from "../queries/connection";
import {
  connectionContracts,
  matches,
  retentionPulses,
  talents,
} from "@db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";

export const PULSE_POINTS = [7, 30, 60, 90] as const;

const DAY_MS = 86400000;

function dayOfJourney(hiredAt: Date | null): number | null {
  if (!hiredAt) return null;
  return Math.floor((Date.now() - hiredAt.getTime()) / DAY_MS);
}

type SessionUser = { id: number; role: string; talentId: number | null };

async function getMatchForUser(matchId: number, user: SessionUser) {
  const match = await getDb().query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) throw new TRPCError({ code: "NOT_FOUND" });
  const isRecruiter = user.role === "recruiter" && match.recruiterId === user.id;
  const isTalent = user.role === "talent" && user.talentId === match.talentId;
  if (!isRecruiter && !isTalent) throw new TRPCError({ code: "FORBIDDEN" });
  return { match, side: isRecruiter ? ("recruiter" as const) : ("talent" as const) };
}

export const retentionRouter = createRouter({
  /** Everything the retention page needs for one match (both sides allowed). */
  forMatch: authedQuery
    .input(z.object({ matchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { match, side } = await getMatchForUser(input.matchId, ctx.user);
      if (match.stage !== "hired" && match.stage !== "retained") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Retention mode starts when the talent is hired.",
        });
      }
      const talent = await db.query.talents.findFirst({
        where: eq(talents.id, match.talentId),
      });
      const contract = await db.query.connectionContracts.findFirst({
        where: eq(connectionContracts.matchId, match.id),
      });
      const pulses = await db.query.retentionPulses.findMany({
        where: eq(retentionPulses.matchId, match.id),
        orderBy: asc(retentionPulses.dayPoint),
      });
      const buddy = match.buddyTalentId
        ? await db.query.talents.findFirst({
            where: eq(talents.id, match.buddyTalentId),
          })
        : null;
      const day = dayOfJourney(match.hiredAt);
      const answered = new Set(
        pulses.filter((p) => p.respondent === side).map((p) => p.dayPoint)
      );
      const duePoint =
        day == null
          ? null
          : (PULSE_POINTS.find((dp) => day >= dp && !answered.has(dp)) ?? null);
      return { match, talent, contract, pulses, buddy, side, day, duePoint };
    }),

  /** Recruiter drafts (or updates) the connection contract and confirms it. */
  saveContract: authedQuery
    .input(
      z.object({
        matchId: z.number(),
        expectations: z.string().min(10),
        commitments: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { side } = await getMatchForUser(input.matchId, ctx.user);
      if (side !== "recruiter") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The employer drafts the contract — the talent approves it.",
        });
      }
      const now = new Date();
      await db
        .insert(connectionContracts)
        .values({
          matchId: input.matchId,
          expectations: input.expectations,
          commitments: input.commitments,
          recruiterConfirmedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            expectations: input.expectations,
            commitments: input.commitments,
            recruiterConfirmedAt: now,
            talentConfirmedAt: null, // re-draft requires fresh talent confirmation
          },
        });
      return { ok: true };
    }),

  /** Confirm the contract (talent approves; recruiter can re-confirm). */
  confirmContract: authedQuery
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { side } = await getMatchForUser(input.matchId, ctx.user);
      const existing = await db.query.connectionContracts.findFirst({
        where: eq(connectionContracts.matchId, input.matchId),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(connectionContracts)
        .set(
          side === "talent"
            ? { talentConfirmedAt: new Date() }
            : { recruiterConfirmedAt: new Date() }
        )
        .where(eq(connectionContracts.matchId, input.matchId));
      return { ok: true };
    }),

  /** Answer your pulse check-in for a due point. Answers stay private. */
  submitPulse: authedQuery
    .input(
      z.object({
        matchId: z.number(),
        dayPoint: z.number(),
        expectations: z.number().min(1).max(5),
        belonging: z.number().min(1).max(5),
        momentum: z.number().min(1).max(5),
        note: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { match, side } = await getMatchForUser(input.matchId, ctx.user);
      if (match.stage !== "hired" && match.stage !== "retained") {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
      if (!(PULSE_POINTS as readonly number[]).includes(input.dayPoint)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown check-in point." });
      }
      const day = dayOfJourney(match.hiredAt);
      if (day == null || day < input.dayPoint) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This check-in isn't due yet.",
        });
      }
      const existing = await db.query.retentionPulses.findFirst({
        where: and(
          eq(retentionPulses.matchId, input.matchId),
          eq(retentionPulses.dayPoint, input.dayPoint),
          eq(retentionPulses.respondent, side)
        ),
      });
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already answered this check-in.",
        });
      }
      await db.insert(retentionPulses).values({
        matchId: input.matchId,
        dayPoint: input.dayPoint,
        respondent: side,
        expectations: input.expectations,
        belonging: input.belonging,
        momentum: input.momentum,
        note: input.note ?? null,
      });
      return { ok: true };
    }),

  /** Alumni: talents who stayed 90+ days — the buddy pool. */
  alumni: recruiterQuery.query(async () => {
    const db = getDb();
    const retained = await db.query.matches.findMany({
      where: eq(matches.stage, "retained"),
    });
    const ids = [...new Set(retained.map((m) => m.talentId))];
    if (ids.length === 0) return [];
    return db.query.talents.findMany({ where: inArray(talents.id, ids) });
  }),

  /** Assign an alumni buddy to walk with the new hire. */
  assignBuddy: recruiterQuery
    .input(z.object({ matchId: z.number(), buddyTalentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { side } = await getMatchForUser(input.matchId, ctx.user);
      if (side !== "recruiter") throw new TRPCError({ code: "FORBIDDEN" });
      const alum = await db.query.matches.findFirst({
        where: and(eq(matches.talentId, input.buddyTalentId), eq(matches.stage, "retained")),
      });
      if (!alum) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Buddies are alumni — talents who stayed 90+ days.",
        });
      }
      await db
        .update(matches)
        .set({ buddyTalentId: input.buddyTalentId })
        .where(eq(matches.id, input.matchId));
      return { ok: true };
    }),

  /** What needs my attention right now (due pulses, waiting contracts). */
  pending: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const myMatches = await db.query.matches.findMany({
      where:
        ctx.user.role === "recruiter"
          ? eq(matches.recruiterId, ctx.user.id)
          : eq(matches.talentId, ctx.user.talentId ?? -1),
    });
    const side = ctx.user.role === "recruiter" ? "recruiter" : "talent";
    const result: {
      matchId: number;
      talentId: number;
      duePoint: number | null;
      contractWaiting: boolean;
    }[] = [];
    for (const m of myMatches) {
      if (m.stage !== "hired" && m.stage !== "retained") continue;
      const day = dayOfJourney(m.hiredAt);
      if (day == null) continue;
      const pulses = await db.query.retentionPulses.findMany({
        where: and(
          eq(retentionPulses.matchId, m.id),
          eq(retentionPulses.respondent, side)
        ),
      });
      const answered = new Set(pulses.map((p) => p.dayPoint));
      const duePoint =
        PULSE_POINTS.find((dp) => day >= dp && !answered.has(dp)) ?? null;
      const contract = await db.query.connectionContracts.findFirst({
        where: eq(connectionContracts.matchId, m.id),
      });
      const contractWaiting = contract
        ? side === "talent"
          ? !contract.talentConfirmedAt
          : !contract.recruiterConfirmedAt
        : side === "recruiter"; // no draft yet — recruiter should draft it
      if (duePoint != null || contractWaiting) {
        result.push({ matchId: m.id, talentId: m.talentId, duePoint, contractWaiting });
      }
    }
    return result;
  }),
});
