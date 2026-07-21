import crypto from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "../middleware";
import { authedQuery } from "../auth";
import { getDb } from "../queries/connection";
import {
  assessments,
  exchanges,
  matches,
  meetings,
  questionnaires,
  talents,
  users,
  videoIntros,
  type Match,
} from "@db/schema";
import { and, desc, eq } from "drizzle-orm";

/** The record is earned: it unlocks once the in-house visit stage is reached. */
const EARNED_STAGES = ["in_house", "hired", "retained"];

function isEarned(match: Match) {
  return EARNED_STAGES.includes(match.stage);
}

async function buildRecord(match: Match) {
  const db = getDb();
  const talent = await db.query.talents.findFirst({
    where: eq(talents.id, match.talentId),
  });
  if (!talent) throw new TRPCError({ code: "NOT_FOUND" });

  const verified = await db
    .select({ assessment: assessments, assessorName: users.name })
    .from(assessments)
    .innerJoin(users, eq(users.id, assessments.assessorId))
    .where(and(eq(assessments.talentId, match.talentId), eq(assessments.status, "published")))
    .orderBy(desc(assessments.publishedAt));

  const doneExchanges = await db.query.exchanges.findMany({
    where: and(eq(exchanges.matchId, match.id), eq(exchanges.status, "completed")),
  });

  const doneMeetings = await db.query.meetings.findMany({
    where: and(
      eq(meetings.talentId, match.talentId),
      eq(meetings.recruiterId, match.recruiterId),
      eq(meetings.status, "done")
    ),
  });

  const doneQuestionnaires = await db.query.questionnaires.findMany({
    where: and(
      eq(questionnaires.talentId, match.talentId),
      eq(questionnaires.recruiterId, match.recruiterId),
      eq(questionnaires.status, "completed")
    ),
  });

  const intro = await db.query.videoIntros.findFirst({
    where: eq(videoIntros.talentId, match.talentId),
    columns: { durationSec: true },
  });

  return {
    match: {
      id: match.id,
      stage: match.stage,
      role: match.role,
      company: match.company,
      connectionRating: match.connectionRating,
      createdAt: match.createdAt,
    },
    talent,
    verified,
    exchanges: doneExchanges.map((e) => ({
      talentTeaches: e.talentTeaches,
      recruiterTeaches: e.recruiterTeaches,
    })),
    steps: {
      videoChat: true, // reaching in_house implies a video chat happened
      questionnaire: doneQuestionnaires.length > 0,
      inHouseVisit: doneMeetings.length > 0 || isEarned(match),
    },
    counts: {
      exchanges: doneExchanges.length,
      meetings: doneMeetings.length,
      questionnaires: doneQuestionnaires.length,
    },
    videoIntro: intro ? { durationSec: intro.durationSec } : null,
    generatedAt: new Date(),
  };
}

export const recordsRouter = createRouter({
  /** Authed record view (match's recruiter or talent). Tells you if not yet earned. */
  forMatch: authedQuery
    .input(z.object({ matchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({ where: eq(matches.id, input.matchId) });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      const isRecruiter = ctx.user.role === "recruiter" && match.recruiterId === ctx.user.id;
      const isTalent = ctx.user.role === "talent" && ctx.user.talentId === match.talentId;
      if (!isRecruiter && !isTalent) throw new TRPCError({ code: "FORBIDDEN" });
      if (!isEarned(match)) {
        return { earned: false as const, stage: match.stage, shareToken: null as string | null };
      }
      const record = await buildRecord(match);
      return {
        earned: true as const,
        shareToken: match.shareToken,
        side: isRecruiter ? ("recruiter" as const) : ("talent" as const),
        record,
      };
    }),

  /** Recruiter creates (or reuses) the public share link for sign-off. */
  createShareLink: authedQuery
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({ where: eq(matches.id, input.matchId) });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "recruiter" || match.recruiterId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!isEarned(match)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The record is earned — it unlocks at the in-house stage.",
        });
      }
      const token = match.shareToken ?? crypto.randomUUID().replaceAll("-", "");
      if (!match.shareToken) {
        await db.update(matches).set({ shareToken: token }).where(eq(matches.id, match.id));
      }
      return { token };
    }),

  /** Public record view via share token — no login, no chrome. */
  byToken: publicQuery
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({
        where: eq(matches.shareToken, input.token),
      });
      if (!match || !isEarned(match)) throw new TRPCError({ code: "NOT_FOUND" });
      const record = await buildRecord(match);
      return { record };
    }),
});
