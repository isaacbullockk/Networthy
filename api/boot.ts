import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext, getSessionUser } from "./context";
import { getDb } from "./queries/connection";
import { videoIntros } from "@db/schema";
import { eq } from "drizzle-orm";
import { shouldMask } from "./lib/anonymize";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Health check for Railway / load balancers
app.get("/api/health", (c) =>
  c.json({ ok: true, service: "networthy", ts: Date.now() })
);

/* ---------- Async video intros (distance-proof communication) ---------- */

const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

// Talent uploads (or replaces) their video intro — raw video bytes in the body
app.post("/api/video-intro", async (c) => {
  const user = await getSessionUser(c.req.raw);
  if (!user || user.role !== "talent" || !user.talentId) {
    return c.json({ error: "Only talents can upload a video intro" }, 403);
  }
  const mime = (c.req.header("content-type") ?? "video/webm").split(";")[0].trim();
  if (!mime.startsWith("video/")) return c.json({ error: "Expected video content" }, 400);
  const buf = Buffer.from(await c.req.arrayBuffer());
  if (buf.byteLength === 0) return c.json({ error: "Empty upload" }, 400);
  if (buf.byteLength > MAX_VIDEO_BYTES) return c.json({ error: "Video too large" }, 413);
  const durationSec = Math.max(0, Math.min(600, Number(c.req.header("x-duration-sec")) || 0));
  const now = new Date();
  await getDb()
    .insert(videoIntros)
    .values({ talentId: user.talentId, data: buf, mimeType: mime, durationSec, updatedAt: now })
    .onDuplicateKeyUpdate({
      set: { data: buf, mimeType: mime, durationSec, updatedAt: now },
    });
  return c.json({ ok: true, bytes: buf.byteLength });
});

// Any logged-in user can play a talent's video intro — except a skills-first
// recruiter who hasn't connected yet (video is identity)
app.get("/api/video-intro/:talentId", async (c) => {
  const user = await getSessionUser(c.req.raw);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const talentId = Number(c.req.param("talentId"));
  if (!Number.isFinite(talentId)) return c.json({ error: "Bad id" }, 400);
  if (await shouldMask(user, talentId)) {
    return c.json({ error: "Video intro unlocks after you connect" }, 403);
  }
  const row = await getDb().query.videoIntros.findFirst({
    where: eq(videoIntros.talentId, talentId),
  });
  if (!row) return c.json({ error: "No video intro yet" }, 404);
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(row.data.byteLength),
      "Cache-Control": "private, max-age=60",
    },
  });
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  const { attachSignaling } = await import("./signaling");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  const server = serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  attachSignaling(server as unknown as import("node:http").Server);
}
