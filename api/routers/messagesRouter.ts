import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { authedQuery } from "../auth";
import { getDb } from "../queries/connection";
import { matches, messages } from "@db/schema";
import { asc, eq } from "drizzle-orm";
import { rateLimit } from "../lib/rateLimit";
import { CHAT_REQUIRES_CONSENT } from "@contracts/errors";

/**
 * Chat lives inside a match and inherits its consent gate: no conversation
 * exists before the talent has accepted the connection. Both participants
 * (the recruiter who owns the match and the talent it points at) can read
 * and send; nobody else can.
 */
async function participantMatch(userId: number, talentId: number | null, matchId: number) {
  const match = await getDb().query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!match) throw new TRPCError({ code: "NOT_FOUND" });
  const isRecruiter = match.recruiterId === userId;
  const isTalent = talentId !== null && match.talentId === talentId;
  if (!isRecruiter && !isTalent) throw new TRPCError({ code: "FORBIDDEN" });
  if (match.talentConsent !== "accepted") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: CHAT_REQUIRES_CONSENT,
    });
  }
  return match;
}

export const messagesRouter = createRouter({
  list: authedQuery
    .input(z.object({ matchId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await participantMatch(ctx.user.id, ctx.user.talentId, input.matchId);
      const rows = await getDb().query.messages.findMany({
        where: eq(messages.matchId, input.matchId),
        orderBy: [asc(messages.createdAt), asc(messages.id)],
      });
      return rows.map((m) => ({
        id: Number(m.id),
        body: m.body,
        mine: m.senderId === ctx.user.id,
        createdAt: m.createdAt,
      }));
    }),

  send: authedQuery
    .input(z.object({ matchId: z.number().int().positive(), body: z.string().trim().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      await participantMatch(ctx.user.id, ctx.user.talentId, input.matchId);
      if (!rateLimit(`messages.send:${ctx.user.id}`, 120, 60 * 60_000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Slow down a little" });
      }
      await getDb().insert(messages).values({
        matchId: input.matchId,
        senderId: ctx.user.id,
        body: input.body,
      });
      return { ok: true };
    }),
});
