import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "../middleware";
import { authedQuery, recruiterQuery } from "../auth";
import { getDb } from "../queries/connection";
import { emailVerifications, passwordResets, sessions, talents, users } from "@db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { COOKIE_NAME } from "../context";
import { hashPassword, verifyPassword } from "../lib/password";
import { rateLimit, clientIp } from "../lib/rateLimit";
import { sendAdminRecruiterApplied, sendPasswordReset, sendVerificationEmail } from "../lib/email";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";

function publicUser(u: typeof users.$inferSelect) {
  const { passwordHash: _pw, ...rest } = u;
  return rest;
}

function sessionCookie(token: string, maxAgeSec: number) {
  const secure = isProd ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

async function createSession(userId: number, isGuest = false) {
  const db = getDb();
  const token = randomBytes(24).toString("hex");
  await db.insert(sessions).values({
    token,
    userId,
    isGuest,
    expiresAt: new Date(Date.now() + THIRTY_DAYS),
  });
  return token;
}

/**
 * Email verification: single-use sha256-hashed token, 24h TTL, previous
 * tokens for the user are wiped first. The raw token only exists in the
 * email — never in the database or logs.
 */
async function issueVerification(userId: number, email: string, name: string, locale: string | null) {
  const db = getDb();
  await db.delete(emailVerifications).where(eq(emailVerifications.userId, userId));
  const token = randomBytes(32).toString("hex");
  await db.insert(emailVerifications).values({
    userId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
  });
  sendVerificationEmail(email, name, token, locale);
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
        locale: z.enum(["en", "nl", "ar"]).optional(),
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
        locale: input.locale ?? "en",
        // Recruiters stay pending until an admin approves them;
        // talents get immediate access to their own portal.
        approvedAt: input.role === "talent" ? new Date() : null,
      });
      const userId = Number(result[0].insertId);
      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      const token = await createSession(userId);
      ctx.resHeaders.set("set-cookie", sessionCookie(token, THIRTY_DAYS / 1000));
      // A recruiter just entered the trust gate — alert the admin
      if (input.role === "recruiter") {
        sendAdminRecruiterApplied(input.name, input.company ?? null, email);
      }
      // Every new account must prove the inbox is theirs.
      await issueVerification(userId, email, input.name, input.locale ?? "en");
      return publicUser(user!);
    }),

  /**
   * Password reset, step 1: always answers ok (never reveals whether an
   * account exists). Token is emailed; only its sha256 hash is stored.
   */
  forgotPassword: publicQuery
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase().trim();
      const ip = clientIp(ctx.req);
      if (!rateLimit(`forgot:${ip}:${email}`, 5, 15 * 60_000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many reset requests — try again later",
        });
      }
      const db = getDb();
      const user = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (user) {
        const token = randomBytes(32).toString("hex");
        await db.delete(passwordResets).where(eq(passwordResets.userId, user.id));
        await db.insert(passwordResets).values({
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + 60 * 60_000),
        });
        sendPasswordReset(user.email, user.name, token, user.locale);
      }
      return { ok: true };
    }),

  /**
   * Password reset, step 2: single use, 1-hour validity, all existing
   * sessions revoked so the old password can't stay logged in anywhere.
   */
  resetPassword: publicQuery
    .input(
      z.object({
        token: z.string().min(32).max(128),
        password: z
          .string()
          .min(10, "Use at least 10 characters")
          .max(200)
          .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), "Include letters and numbers"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const row = await db.query.passwordResets.findFirst({
        where: and(eq(passwordResets.tokenHash, sha256(input.token)), isNull(passwordResets.usedAt)),
      });
      if (!row || row.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Reset link is invalid or expired" });
      }
      await db
        .update(users)
        .set({ passwordHash: hashPassword(input.password) })
        .where(eq(users.id, row.userId));
      await db
        .update(passwordResets)
        .set({ usedAt: new Date() })
        .where(eq(passwordResets.id, row.id));
      await db.delete(sessions).where(eq(sessions.userId, row.userId));
      return { ok: true };
    }),

  /**
   * Email verification, step 2: single-use token from the signup email.
   * Marks the token used and stamps users.emailVerifiedAt.
   */
  verifyEmail: publicQuery
    .input(z.object({ token: z.string().min(32).max(128) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const row = await db.query.emailVerifications.findFirst({
        where: and(
          eq(emailVerifications.tokenHash, sha256(input.token)),
          isNull(emailVerifications.usedAt)
        ),
      });
      if (!row || row.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Verification link is invalid or expired" });
      }
      await db
        .update(emailVerifications)
        .set({ usedAt: new Date() })
        .where(eq(emailVerifications.id, row.id));
      await db
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, row.userId));
      return { ok: true };
    }),

  /** Resend the verification email — own account only, rate-limited. */
  resendVerification: authedQuery.mutation(async ({ ctx }) => {
    if (!rateLimit(`resend-verify:${ctx.user.id}`, 3, 60 * 60_000)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many attempts — try again later",
      });
    }
    if (ctx.user.emailVerifiedAt) return { ok: true, alreadyVerified: true };
    await issueVerification(ctx.user.id, ctx.user.email, ctx.user.name, ctx.user.locale);
    return { ok: true, alreadyVerified: false };
  }),

  /**
   * Guest preview: a read-only session borrowing the showcase recruiter's
   * view. No password, heavily rate-limited, every mutation blocked by the
   * authedQuery guard. The showcase account is launch content by design.
   */
  guestLogin: publicQuery.mutation(async ({ ctx }) => {
    const ip = clientIp(ctx.req);
    if (!rateLimit(`guest:${ip}`, 20, 60 * 60_000)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many guest sessions — try again later",
      });
    }
    const db = getDb();
    const showcaseEmail = (process.env.SHOWCASE_EMAIL || "lisa@picnic.nl").toLowerCase();
    const showcase = await db.query.users.findFirst({
      where: eq(users.email, showcaseEmail),
    });
    if (!showcase) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Preview is not available yet" });
    }
    // Keep the sessions table tidy: one active guest session per viewer is
    // enough — drop stale guest sessions for the showcase account first.
    await db.delete(sessions).where(and(eq(sessions.userId, showcase.id), eq(sessions.isGuest, true)));
    const token = await createSession(showcase.id, true);
    ctx.resHeaders.set("set-cookie", sessionCookie(token, THIRTY_DAYS / 1000));
    return { ...publicUser(showcase), isGuest: true };
  }),

  me: publicQuery.query(({ ctx }) =>
    ctx.user ? { ...publicUser(ctx.user), isGuest: ctx.isGuest } : null
  ),

  setLocale: authedQuery
    .input(z.object({ locale: z.enum(["en", "nl", "ar"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(users).set({ locale: input.locale }).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  /** Recruiter preference: browse the pool skills-first (identity hidden until connected) */
  setAnonymousBrowsing: recruiterQuery
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(users)
        .set({ anonymousBrowsing: input.enabled })
        .where(eq(users.id, ctx.user.id));
      return { ok: true, enabled: input.enabled };
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.userId, ctx.user.id));
    ctx.resHeaders.set("set-cookie", sessionCookie("", 0));
    return { ok: true };
  }),
});
