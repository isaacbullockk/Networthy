import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { getDb } from "./queries/connection";
import { sessions, users, type User } from "@db/schema";
import { and, eq, gt } from "drizzle-orm";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user: User | null;
  /** True for guest-preview sessions (read-only, mutations blocked) */
  isGuest: boolean;
};

const COOKIE_NAME = "nw_session";
export { COOKIE_NAME };

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Resolve the logged-in user from the session cookie (raw HTTP endpoints). */
export async function getSessionUser(req: Request): Promise<User | null> {
  return (await getSession(req)).user;
}

/** Resolve session + user together. */
export async function getSession(
  req: Request
): Promise<{ user: User | null; isGuest: boolean }> {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return { user: null, isGuest: false };
  const db = getDb();
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
  });
  if (!session) return { user: null, isGuest: false };
  const user =
    (await db.query.users.findFirst({ where: eq(users.id, session.userId) })) ?? null;
  return { user, isGuest: session.isGuest };
}

export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<TrpcContext> {
  const { user, isGuest } = await getSession(opts.req);
  return { req: opts.req, resHeaders: opts.resHeaders, user, isGuest };
}
