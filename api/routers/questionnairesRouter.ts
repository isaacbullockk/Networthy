import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { authedQuery, recruiterQuery, talentQuery } from "../auth";
import { getDb } from "../queries/connection";
import { questionnaires } from "@db/schema";
import { eq } from "drizzle-orm";

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "choice", "scale"]),
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(),
});

export const questionnairesRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    if (ctx.user.role === "recruiter") {
      return db.query.questionnaires.findMany({
        where: eq(questionnaires.recruiterId, ctx.user.id),
      });
    }
    if (!ctx.user.talentId) return [];
    return db.query.questionnaires.findMany({
      where: eq(questionnaires.talentId, ctx.user.talentId),
    });
  }),

  create: recruiterQuery
    .input(
      z.object({
        talentId: z.number(),
        title: z.string().min(1),
        purpose: z.string().min(1),
        questions: z.array(questionSchema).min(1),
        status: z.enum(["draft", "sent"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [{ id }] = await db
        .insert(questionnaires)
        .values({
          ...input,
          recruiterId: ctx.user.id,
          sentAt: input.status === "sent" ? new Date().toISOString().slice(0, 10) : null,
        })
        .$returningId();
      return db.query.questionnaires.findFirst({ where: eq(questionnaires.id, id) });
    }),

  submitAnswers: talentQuery
    .input(z.object({ id: z.number(), answers: z.record(z.string(), z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const q = await db.query.questionnaires.findFirst({
        where: eq(questionnaires.id, input.id),
      });
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      if (q.talentId !== ctx.user.talentId) throw new TRPCError({ code: "FORBIDDEN" });
      await db
        .update(questionnaires)
        .set({ answers: input.answers, status: "completed" })
        .where(eq(questionnaires.id, input.id));
      return db.query.questionnaires.findFirst({ where: eq(questionnaires.id, input.id) });
    }),
});
