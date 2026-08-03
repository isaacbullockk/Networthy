import {
  mysqlTable,
  mysqlEnum,
  serial,
  bigint,
  varchar,
  text,
  int,
  json,
  timestamp,
  index,
  uniqueIndex,
  customType,
  boolean,
} from "drizzle-orm/mysql-core";

/** LONGBLOB column (drizzle has no built-in blob in this version) */
const longblob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "longblob";
  },
});

/* ---------- Auth ---------- */

export const users = mysqlTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 128 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["talent", "recruiter", "assessor", "admin"]).notNull(),
    company: varchar("company", { length: 255 }),
    talentId: bigint("talent_id", { mode: "number", unsigned: true }),
    /** Set when an assessor signs the confidentiality charter */
    charterSignedAt: timestamp("charter_signed_at"),
    /** Recruiters can browse the pool only after an admin approves them */
    approvedAt: timestamp("approved_at"),
    /** Preferred UI language (en / nl / ar) — pulses & emails follow this */
    locale: varchar("locale", { length: 8 }).notNull().default("en"),
    /** Skills-first browsing: identity (name, origin, video) hidden until a match exists */
    anonymousBrowsing: boolean("anonymous_browsing").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ emailIdx: index("email_idx").on(t.email) })
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    /** Guest preview sessions: full read access, every mutation rejected */
    isGuest: boolean("is_guest").notNull().default(false),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ tokenIdx: index("token_idx").on(t.token) })
);

/** One-time password reset tokens — only the sha256 hash is stored.
 *  Valid for 1 hour, single use, all sessions revoked on reset. */
export const passwordResets = mysqlTable(
  "password_resets",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ hashIdx: index("reset_hash_idx").on(t.tokenHash) })
);

/* ---------- Talent profiles ---------- */

export const talents = mysqlTable("talents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull(),
  origin: varchar("origin", { length: 255 }).notNull(),
  yearsInNL: int("years_in_nl").notNull(),
  languages: json("languages").$type<string[]>().notNull(),
  tagline: text("tagline").notNull(),
  story: text("story").notNull(),
  traits: json("traits").$type<string[]>().notNull(),
  skills: json("skills").$type<string[]>().notNull(),
  dimensions: json("dimensions").$type<{ label: string; strength: number }[]>().notNull(),
  lookingFor: text("looking_for").notNull(),
  availability: varchar("availability", { length: 255 }).notNull(),
  videoIntroSec: int("video_intro_sec").notNull().default(60),
  gradient: varchar("gradient", { length: 100 }).notNull(),
  matchScore: int("match_score").notNull().default(80),
  matchReasons: json("match_reasons").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Matching pipeline ---------- */

export const matches = mysqlTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    talentId: bigint("talent_id", { mode: "number", unsigned: true }).notNull(),
    recruiterId: bigint("recruiter_id", { mode: "number", unsigned: true }).notNull(),
    company: varchar("company", { length: 255 }).notNull(),
    role: varchar("role", { length: 255 }).notNull(),
    stage: mysqlEnum("stage", [
      "connected",
      "video_chat",
      "questionnaire",
      "in_house",
      "hired",
      "retained",
    ])
      .notNull()
      .default("connected"),
    connectionRating: int("connection_rating").notNull().default(0),
    notes: text("notes"),
    lastActivity: varchar("last_activity", { length: 10 }).notNull(),
    /** Set when the match transitions to 'hired' — starts the 90-day retention journey */
    hiredAt: timestamp("hired_at"),
    /** Alumni buddy: a retained talent who walks with this hire through the first 90 days */
    buddyTalentId: bigint("buddy_talent_id", { mode: "number", unsigned: true }),
    /** Public share token for the NetWorthy Record (recruiter-generated) */
    shareToken: varchar("share_token", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ recruiterIdx: index("recruiter_idx").on(t.recruiterId), talentIdx: index("talent_idx").on(t.talentId) })
);

export const questionnaires = mysqlTable(
  "questionnaires",
  {
    id: serial("id").primaryKey(),
    talentId: bigint("talent_id", { mode: "number", unsigned: true }).notNull(),
    recruiterId: bigint("recruiter_id", { mode: "number", unsigned: true }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    purpose: varchar("purpose", { length: 500 }).notNull(),
    status: mysqlEnum("status", ["draft", "sent", "completed"]).notNull().default("draft"),
    questions: json("questions")
      .$type<{ id: string; type: "text" | "choice" | "scale"; prompt: string; options?: string[] }[]>()
      .notNull(),
    answers: json("answers").$type<Record<string, string>>(),
    sentAt: varchar("sent_at", { length: 10 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ talentIdx: index("quest_talent_idx").on(t.talentId), recruiterIdx: index("quest_recruiter_idx").on(t.recruiterId) })
);

export const meetings = mysqlTable(
  "meetings",
  {
    id: serial("id").primaryKey(),
    talentId: bigint("talent_id", { mode: "number", unsigned: true }).notNull(),
    recruiterId: bigint("recruiter_id", { mode: "number", unsigned: true }).notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    time: varchar("time", { length: 5 }).notNull(),
    location: varchar("location", { length: 500 }).notNull(),
    agenda: text("agenda").notNull(),
    attendees: json("attendees").$type<string[]>().notNull(),
    status: mysqlEnum("status", ["upcoming", "done"]).notNull().default("upcoming"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ talentIdx: index("meet_talent_idx").on(t.talentId), recruiterIdx: index("meet_recruiter_idx").on(t.recruiterId) })
);

/* ---------- Teach & Learn exchanges (gamification) ---------- */

export const exchanges = mysqlTable(
  "exchanges",
  {
    id: serial("id").primaryKey(),
    matchId: bigint("match_id", { mode: "number", unsigned: true }).notNull(),
    talentId: bigint("talent_id", { mode: "number", unsigned: true }).notNull(),
    recruiterId: bigint("recruiter_id", { mode: "number", unsigned: true }).notNull(),
    talentTeaches: varchar("talent_teaches", { length: 500 }).notNull(),
    recruiterTeaches: varchar("recruiter_teaches", { length: 500 }).notNull(),
    proposedBy: mysqlEnum("proposed_by", ["talent", "recruiter"]).notNull(),
    status: mysqlEnum("status", ["proposed", "accepted", "completed"]).notNull().default("proposed"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ matchIdx: index("ex_match_idx").on(t.matchId), talentIdx: index("ex_talent_idx").on(t.talentId), recruiterIdx: index("ex_recruiter_idx").on(t.recruiterId) })
);

/* ---------- Trust & Verification (independent assessors) ---------- */

/**
 * Assessments are done by INDEPENDENT assessors — never by authorities or
 * institutions. Assessors sign a confidentiality charter before they can
 * assess; talents approve every assessment before it is published.
 */
export const assessments = mysqlTable(
  "assessments",
  {
    id: serial("id").primaryKey(),
    talentId: bigint("talent_id", { mode: "number", unsigned: true }).notNull(),
    assessorId: bigint("assessor_id", { mode: "number", unsigned: true }).notNull(),
    status: mysqlEnum("status", ["in_progress", "pending_approval", "published"])
      .notNull()
      .default("in_progress"),
    skillsVerified: json("skills_verified").$type<string[]>().notNull(),
    strengths: text("strengths").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    submittedAt: timestamp("submitted_at"),
    publishedAt: timestamp("published_at"),
  },
  (t) => ({ talentIdx: index("assess_talent_idx").on(t.talentId), assessorIdx: index("assess_assessor_idx").on(t.assessorId) })
);

/* ---------- Async video intros (distance-proof communication) ---------- */

export const videoIntros = mysqlTable("video_intros", {
  talentId: bigint("talent_id", { mode: "number", unsigned: true }).primaryKey(),
  data: longblob("data").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  durationSec: int("duration_sec").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ---------- Retention Mode (the first 90 days) ---------- */

/**
 * The Connection Contract — explicit mutual expectations, confirmed by both
 * sides at hire and revisited at every pulse. Most early exits are
 * expectation debt coming due; the contract makes the debt visible early.
 */
export const connectionContracts = mysqlTable("connection_contracts", {
  matchId: bigint("match_id", { mode: "number", unsigned: true }).primaryKey(),
  expectations: text("expectations").notNull(),
  commitments: text("commitments").notNull(),
  talentConfirmedAt: timestamp("talent_confirmed_at"),
  recruiterConfirmedAt: timestamp("recruiter_confirmed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Pulse check-ins at day 7/30/60/90 from BOTH sides. Pulses produce signals,
 * not surveillance: the other side sees connection health, never raw answers.
 */
export const retentionPulses = mysqlTable(
  "retention_pulses",
  {
    id: serial("id").primaryKey(),
    matchId: bigint("match_id", { mode: "number", unsigned: true }).notNull(),
    dayPoint: int("day_point").notNull(), // 7 | 30 | 60 | 90
    respondent: mysqlEnum("respondent", ["talent", "recruiter"]).notNull(),
    expectations: int("expectations").notNull(), // 1-5
    belonging: int("belonging").notNull(), // 1-5
    momentum: int("momentum").notNull(), // 1-5
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    matchIdx: index("pulse_match_idx").on(t.matchId),
    uniq: uniqueIndex("pulse_unique").on(t.matchId, t.dayPoint, t.respondent),
  })
);

export type ConnectionContract = typeof connectionContracts.$inferSelect;
export type RetentionPulse = typeof retentionPulses.$inferSelect;

export type Assessment = typeof assessments.$inferSelect;
export type VideoIntro = typeof videoIntros.$inferSelect;

export type Exchange = typeof exchanges.$inferSelect;

export type User = typeof users.$inferSelect;
export type Talent = typeof talents.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Questionnaire = typeof questionnaires.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
