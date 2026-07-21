import { z } from "zod";
import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "../middleware";
import { authedQuery } from "../auth";
import { getDb } from "../queries/connection";
import { sessions, talents, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "../context";
import { hashPassword, verifyPassword } from "../lib/password";
import { rateLimit, clientIp } from "../lib/rateLimit";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";

function publicUser(u: typeof users.$inferSelect) {
  const { passwordHash: _pw, ...rest } = u;
  return rest;
}

function sessionCookie(token: string, maxAgeSec: number) {
  const secure = isProd ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

async function createSession(userId: number) {
  const db = getDb();
  const token = randomBytes(24).toString("hex");
  await db.insert(sessions).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + THIRTY_DAYS),
  });
  return token;
}

export const authRouter = createRouter({
  login: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase().trim();
      const ip = clientIp(ctx.req);
      if (!rateLimit(`login:${ip}:${email}`, 10, 10 * 60_000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts — try again in a few minutes",
        });
      }
      const db = getDb();
      const user = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      const token = await createSession(user.id);
      ctx.resHeaders.set("set-cookie", sessionCookie(token, THIRTY_DAYS / 1000));
      return publicUser(user);
    }),

  register: publicQuery
    .input(
      z.object({
        name: z.string().trim().min(2).max(120),
        email: z.string().email().max(320),
        password: z
          .string()
          .min(10, "Use at least 10 characters")
          .max(200)
          .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), "Include letters and numbers"),
        role: z.enum(["talent", "recruiter"]),
        company: z.string().trim().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ip = clientIp(ctx.req);
      if (!rateLimit(`register:${ip}`, 5, 60 * 60_000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many signups from this network — try again later",
        });
      }
      const email = input.email.toLowerCase().trim();
      const db = getDb();
      const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
      }

      let talentId: number | undefined;
      if (input.role === "talent") {
        // Create a starter profile; the talent completes it in their portal.
        const res = await db.insert(talents).values({
          name: input.name,
          role: "Talent",
          origin: "",
          yearsInNL: 0,
          languages: [],
          tagline: "",
          story: "",
          traits: [],
          skills: [],
          dimensions: [],
          lookingFor: "",
          availability: "",
          gradient: "from-slate-500 to-slate-700",
          matchReasons: [],
        });
        talentId = Number(res[0].insertId);
      }

      const result = await db.insert(users).values({
        email,
        passwordHash: hashPassword(input.password),
        name: input.name,
        role: input.role,
        company: input.role === "recruiter" ? input.company || null : null,
        talentId: talentId ?? null,
        // Recruiters stay pending until an admin approves them;
        // talents get immediate access to their own portal.
        approvedAt: input.role === "talent" ? new Date() : null,
      });
      const userId = Number(result[0].insertId);
      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      const token = await createSession(userId);
      ctx.resHeaders.set("set-cookie", sessionCookie(token, THIRTY_DAYS / 1000));
      return publicUser(user!);
    }),

  me: publicQuery.query(({ ctx }) => (ctx.user ? publicUser(ctx.user) : null)),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.userId, ctx.user.id));
    ctx.resHeaders.set("set-cookie", sessionCookie("", 0));
    return { ok: true };
  }),
});
