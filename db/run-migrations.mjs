/**
 * Idempotent migration runner for deployment (Railway start command).
 *
 * Why not `drizzle-kit migrate`? The CLI hangs non-interactively in some
 * environments. This runner does exactly what a migrator should: read the
 * journal, apply unapplied migrations, record them — with no interactivity
 * and no external dependencies beyond mysql2 (already a runtime dep).
 *
 * Safe to run on every boot: applied migrations are skipped by hash.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import mysql from "mysql2/promise";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "migrations");
const journalPath = path.join(migrationsDir, "meta", "_journal.json");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set — skipping migrations");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

try {
  // drizzle's migrations table (same shape drizzle-orm uses)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
      \`id\` SERIAL PRIMARY KEY,
      \`hash\` varchar(255) NOT NULL,
      \`created_at\` bigint
    )
  `);

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const entries = journal.entries.sort((a, b) => a.idx - b.idx);

  for (const entry of entries) {
    const file = path.join(migrationsDir, `${entry.tag}.sql`);
    const content = fs.readFileSync(file, "utf8");
    const hash = crypto.createHash("sha256").update(content).digest("hex");

    const [rows] = await conn.query(
      "SELECT id FROM __drizzle_migrations WHERE hash = ? LIMIT 1",
      [hash]
    );
    if (rows.length > 0) {
      console.log(`[migrate] skip ${entry.tag} (already applied)`);
      continue;
    }

    console.log(`[migrate] applying ${entry.tag}…`);
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    await conn.query(
      "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
      [hash, entry.when]
    );
    console.log(`[migrate] applied ${entry.tag} (${statements.length} statements)`);
  }

  console.log("[migrate] done");
} catch (err) {
  console.error("[migrate] FAILED:", err.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
