import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { authedQuery, recruiterQuery } from "../auth";
import { getDb } from "../queries/connection";
import { meetings } from "@db/schema";
import { eq } from "drizzle-orm";

export const meetingsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    if (ctx.user.role === "recruiter") {
      return db.query.meetings.findMany({ where: eq(meetings.recruiterId, ctx.user.id) });
    }
    if (!ctx.user.talentId) return [];
    return db.query.meetings.findMany({ where: eq(meetings.talentId, ctx.user.talentId) });
  }),

  create: recruiterQuery
    .input(
      z.object({
        talentId: z.number(),
        date: z.string().min(1),
        time: z.string().min(1),
        location: z.string().min(1),
        agenda: z.string().min(1),
        attendees: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [{ id }] = await db
        .insert(meetings)
        .values({ ...input, recruiterId: ctx.user.id, status: "upcoming" })
        .$returningId();
      return db.query.meetings.findFirst({ where: eq(meetings.id, id) });
    }),

  markDone: recruiterQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const m = await db.query.meetings.findFirst({ where: eq(meetings.id, input.id) });
      if (!m) throw new TRPCError({ code: "NOT_FOUND" });
      if (m.recruiterId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await db.update(meetings).set({ status: "done" }).where(eq(meetings.id, input.id));
      return { ok: true };
    }),
});
