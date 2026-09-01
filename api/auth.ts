import { TRPCError } from "@trpc/server";
import { publicQuery } from "./middleware";
import { EMAIL_VERIFICATION_REQUIRED } from "@contracts/errors";
import type { User } from "@db/schema";

/** Requires a logged-in user; narrows ctx.user to non-null. */
export const authedQuery = publicQuery.use(({ ctx, next, path, type }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  // Guest preview sessions are read-only: every mutation is rejected here,
  // at the single choke point all authed routers inherit. Logout stays open.
  if (ctx.isGuest && type === "mutation" && path !== "auth.logout") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Guest preview is read-only — create an account to take action",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const recruiterQuery = authedQuery.use(({ ctx, next }) => {
  if (ctx.user.role !== "recruiter") throw new TRPCError({ code: "FORBIDDEN" });
  if (!ctx.user.approvedAt)
    throw new TRPCError({ code: "FORBIDDEN", message: "Account pending approval" });
  // No unverified inbox touches the talent pool.
  if (!ctx.user.emailVerifiedAt)
    throw new TRPCError({ code: "FORBIDDEN", message: EMAIL_VERIFICATION_REQUIRED });
  return next({ ctx });
});

export const talentQuery = authedQuery.use(({ ctx, next }) => {
  if (ctx.user.role !== "talent") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const assessorQuery = authedQuery.use(({ ctx, next }) => {
  if (ctx.user.role !== "assessor") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const adminQuery = authedQuery.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export type AuthedUser = User;
