import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { authedQuery } from "../auth";
import { getDb } from "../queries/connection";
import { exchanges, matches, type Exchange } from "@db/schema";
import { and, eq } from "drizzle-orm";

/* ---------- Gamification rules ---------- */

const XP = { propose: 10, accepted: 20, completed: 100 } as const;

const LEVELS = [
  { min: 0, name: "Newcomer" },
  { min: 250, name: "Connector" },
  { min: 600, name: "Bridge Builder" },
  { min: 1200, name: "NetWorthy Legend" },
] as const;

const LANG_RE = /arabic|somali|dutch|english|ukrainian|tigrinya|french|igbo|russian|phrase|language|word|greet/i;
const FOOD_RE = /recipe|dish|borscht|injera|breakfast|coffee|tea|cook|kitchen|food|meal|pancake/i;
const CULTURE_RE = /culture|etiquette|rules|meeting|feedback|hospitality|network|borrel|work/i;

export interface Badge {
  key: string;
  label: string;
  description: string;
  earned: boolean;
  progress: string;
}

function computeStats(all: Exchange[], userRole: "talent" | "recruiter") {
  let xp = 0;
  let completedCount = 0;
  let proposedCount = 0;
  const myTeachings: string[] = [];

  for (const ex of all) {
    const isProposer =
      (userRole === "talent" && ex.proposedBy === "talent") ||
      (userRole === "recruiter" && ex.proposedBy === "recruiter");
    if (isProposer) {
      xp += XP.propose;
      proposedCount++;
    }
    if (ex.status === "accepted" || ex.status === "completed") xp += XP.accepted;
    if (ex.status === "completed") {
      xp += XP.completed;
      completedCount++;
      myTeachings.push(userRole === "talent" ? ex.talentTeaches : ex.recruiterTeaches);
    }
  }

  let level: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.min) level = l;
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];

  const taughtLang = myTeachings.some((t) => LANG_RE.test(t));
  const taughtFood = myTeachings.some((t) => FOOD_RE.test(t));
  const taughtCulture = myTeachings.some((t) => CULTURE_RE.test(t));

  const badges: Badge[] = [
    { key: "first-swap", label: "First Swap", description: "Completed your first teach & learn exchange", earned: completedCount >= 1, progress: `${Math.min(completedCount, 1)}/1` },
    { key: "bridge-builder", label: "Bridge Builder", description: "Completed 3 exchanges — connections are your craft", earned: completedCount >= 3, progress: `${Math.min(completedCount, 3)}/3` },
    { key: "master-exchange", label: "Master of Exchange", description: "Completed 5 exchanges — a true NetWorthy champion", earned: completedCount >= 5, progress: `${Math.min(completedCount, 5)}/5` },
    { key: "polyglot", label: "Polyglot", description: "Taught someone words or phrases from your language", earned: taughtLang, progress: taughtLang ? "1/1" : "0/1" },
    { key: "kitchen-diplomat", label: "Kitchen Diplomat", description: "Shared food or a recipe — the fastest way to a heart", earned: taughtFood, progress: taughtFood ? "1/1" : "0/1" },
    { key: "culture-guide", label: "Culture Guide", description: "Explained how work & life really works where you come from", earned: taughtCulture, progress: taughtCulture ? "1/1" : "0/1" },
    { key: "generous-teacher", label: "Generous Teacher", description: "Proposed 3 or more exchanges", earned: proposedCount >= 3, progress: `${Math.min(proposedCount, 3)}/3` },
  ];

  return {
    xp,
    level: level.name,
    nextLevelXp: nextLevel ? nextLevel.min : null,
    completedCount,
    proposedCount,
    badges,
  };
}

/* ---------- Router ---------- */

export const exchangesRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const scope =
      ctx.user.role === "recruiter"
        ? eq(exchanges.recruiterId, ctx.user.id)
        : ctx.user.talentId
          ? eq(exchanges.talentId, ctx.user.talentId)
          : eq(exchanges.id, -1);
    const rows = await db
      .select({ exchange: exchanges, company: matches.company, role: matches.role })
      .from(exchanges)
      .innerJoin(matches, eq(exchanges.matchId, matches.id))
      .where(scope);
    return rows.map((r) => ({ ...r.exchange, company: r.company, matchRole: r.role }));
  }),

  propose: authedQuery
    .input(
      z.object({
        matchId: z.number(),
        talentTeaches: z.string().min(3),
        recruiterTeaches: z.string().min(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({ where: eq(matches.id, input.matchId) });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      const isRecruiter = ctx.user.role === "recruiter" && match.recruiterId === ctx.user.id;
      const isTalent = ctx.user.role === "talent" && match.talentId === ctx.user.talentId;
      if (!isRecruiter && !isTalent) throw new TRPCError({ code: "FORBIDDEN" });
      const [{ id }] = await db
        .insert(exchanges)
        .values({
          matchId: match.id,
          talentId: match.talentId,
          recruiterId: match.recruiterId,
          talentTeaches: input.talentTeaches,
          recruiterTeaches: input.recruiterTeaches,
          proposedBy: isRecruiter ? "recruiter" : "talent",
          status: "proposed",
        })
        .$returningId();
      return db.query.exchanges.findFirst({ where: eq(exchanges.id, id) });
    }),

  accept: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ex = await db.query.exchanges.findFirst({ where: eq(exchanges.id, input.id) });
      if (!ex) throw new TRPCError({ code: "NOT_FOUND" });
      const mine =
        ctx.user.role === "recruiter" ? ex.recruiterId === ctx.user.id : ex.talentId === ctx.user.talentId;
      if (!mine) throw new TRPCError({ code: "FORBIDDEN" });
      if (ex.proposedBy === ctx.user.role) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The other side accepts your proposal" });
      }
      if (ex.status !== "proposed") throw new TRPCError({ code: "BAD_REQUEST" });
      await db.update(exchanges).set({ status: "accepted" }).where(eq(exchanges.id, ex.id));
      return db.query.exchanges.findFirst({ where: eq(exchanges.id, ex.id) });
    }),

  complete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ex = await db.query.exchanges.findFirst({ where: eq(exchanges.id, input.id) });
      if (!ex) throw new TRPCError({ code: "NOT_FOUND" });
      const mine =
        ctx.user.role === "recruiter" ? ex.recruiterId === ctx.user.id : ex.talentId === ctx.user.talentId;
      if (!mine) throw new TRPCError({ code: "FORBIDDEN" });
      if (ex.status !== "accepted") throw new TRPCError({ code: "BAD_REQUEST" });
      await db
        .update(exchanges)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(exchanges.id, ex.id));
      return db.query.exchanges.findFirst({ where: eq(exchanges.id, ex.id) });
    }),

  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const scope =
      ctx.user.role === "recruiter"
        ? eq(exchanges.recruiterId, ctx.user.id)
        : ctx.user.talentId
          ? eq(exchanges.talentId, ctx.user.talentId)
          : and(eq(exchanges.id, -1), eq(exchanges.id, -1));
    const all = await db.select().from(exchanges).where(scope);
    return computeStats(all, ctx.user.role === "recruiter" ? "recruiter" : "talent");
  }),
});
