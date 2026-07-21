import { TRPCError } from "@trpc/server";
import { publicQuery } from "./middleware";
import type { User } from "@db/schema";

/** Requires a logged-in user; narrows ctx.user to non-null. */
export const authedQuery = publicQuery.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const recruiterQuery = authedQuery.use(({ ctx, next }) => {
  if (ctx.user.role !== "recruiter") throw new TRPCError({ code: "FORBIDDEN" });
  if (!ctx.user.approvedAt)
    throw new TRPCError({ code: "FORBIDDEN", message: "Account pending approval" });
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
