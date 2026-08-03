import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter } from "../middleware";
import { adminQuery } from "../auth";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { hashPassword } from "../lib/password";
import { sendAssessorInvite, sendRecruiterApproved } from "../lib/email";

function publicUser(u: typeof users.$inferSelect) {
  const { passwordHash: _pw, ...rest } = u;
  return rest;
}

export const adminRouter = createRouter({
  /** Recruiters waiting for approval to browse the pool. */
  pendingRecruiters: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.query.users.findMany({
      where: and(eq(users.role, "recruiter"), isNull(users.approvedAt)),
    });
    return rows.map(publicUser);
  }),

  approveRecruiter: adminQuery
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({ where: eq(users.id, input.userId) });
      if (!user || user.role !== "recruiter")
        throw new TRPCError({ code: "NOT_FOUND", message: "Recruiter not found" });
      await db.update(users).set({ approvedAt: new Date() }).where(eq(users.id, input.userId));
      sendRecruiterApproved(user.email, user.name, user.locale);
      return { ok: true };
    }),

  /** Assessors are invited, never self-serve — they hold the trust charter. */
  createAssessor: adminQuery
    .input(
      z.object({
        name: z.string().trim().min(2).max(120),
        email: z.string().email().max(320),
        password: z.string().min(10).max(200),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = input.email.toLowerCase().trim();
      const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
      await db.insert(users).values({
        email,
        passwordHash: hashPassword(input.password),
        name: input.name,
        role: "assessor",
        approvedAt: new Date(),
      });
      sendAssessorInvite(email, input.name, input.password, null);
      return { ok: true };
    }),
});
