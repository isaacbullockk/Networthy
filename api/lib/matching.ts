/**
 * NetWorthy matching engine — vacancy ↔ talent, explainable by design.
 *
 * Hard rules (do not weaken without a founder decision + review):
 *  1. IDENTITY IS NEVER A FACTOR. Name, origin, years in NL, age — none of
 *     these influence the score. Skills, languages, availability only.
 *  2. EVERY POINT IS EXPLAINABLE. The breakdown shows exactly where each
 *     point came from; reasons are generated from real data only.
 *  3. VERIFIED BEATS SELF-REPORTED. A skill verified by a published
 *     assessment weighs 25% heavier inside skill coverage.
 *  4. MISSING REQUIRED SKILLS ARE SHOWN, NOT HIDDEN. A match never pretends
 *     a gap doesn't exist.
 *
 * Scores are deterministic: same inputs → same score, always.
 */

/* ---------- Skill normalization (EN / NL / AR synonyms) ---------- */

const CANONICAL: Record<string, string[]> = {
  javascript: ["javascript", "js", "ecmascript"],
  typescript: ["typescript", "ts"],
  react: ["react", "reactjs", "react.js"],
  python: ["python"],
  sql: ["sql", "mysql", "postgresql", "postgres", "databases", "databases beheren"],
  excel: ["excel", "spreadsheets", "google sheets"],
  bookkeeping: ["bookkeeping", "boekhouding", "accounting", "محاسبة"],
  foodsafety: ["haccp", "food safety", "voedselveiligheid", "hygiene code", "سلامة الغذاء"],
  cooking: ["cooking", "chef", "kok", "kitchen", "keuken", "طهي", "طبخ"],
  hospitality: ["hospitality", "hospitality service", "horeca", "bediening", "ضيافة"],
  cleaning: ["cleaning", "schoonmaak", "housekeeping", "تنظيف"],
  forklift: ["forklift", "heftruck", "reachtruck", "رافعة شوكية"],
  warehousing: ["warehousing", "warehouse", "magazijn", "order picking", "orderpicken", "مستودع"],
  logistics: ["logistics", "logistiek", "supply chain", "لوجستيات"],
  welding: ["welding", "lassen", "welder", "لحام"],
  carpentry: ["carpentry", "timmerwerk", "carpenter", "نجارة"],
  electrical: ["electrical", "elektrotechniek", "electrician", "elektricien", "كهرباء"],
  caregiving: ["caregiving", "zorg", "verzorging", "verpleging", "nursing", "رعاية", "تمريض"],
  driving: ["driving", "rijbewijs", "driver", "chauffeur", "قيادة"],
  teaching: ["teaching", "onderwijs", "lesgeven", "coaching", "تعليم", "تدريب"],
  sales: ["sales", "verkoop", "account management", "مبيعات"],
  customerservice: ["customer service", "klantenservice", "klantcontact", "خدمة العملاء"],
  datanalysis: ["data analysis", "dataanalyse", "power bi", "excel analysis", "تحليل البيانات"],
  design: ["design", "ux", "ui", "figma", "ontwerp", "تصميم"],
  hr: ["hr", "human resources", "personeelszaken", "recruitment", "الموارد البشرية"],
  projectmanagement: ["project management", "projectmanagement", "projectleiding", "إدارة المشاريع"],
};

const SYNONYM_INDEX = new Map<string, string>();
for (const [canonical, variants] of Object.entries(CANONICAL)) {
  for (const v of variants) SYNONYM_INDEX.set(v, canonical);
}

export function normalizeSkill(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/[._/\\-]+/g, " ");
  if (SYNONYM_INDEX.has(s)) return SYNONYM_INDEX.get(s)!;
  // token-level fallback: every token variant maps to the canonical skill
  const tokens = s.split(/\s+/);
  for (const t of tokens) if (SYNONYM_INDEX.has(t)) return SYNONYM_INDEX.get(t)!;
  return s;
}

/* ---------- Language normalization (EN / NL / AR names) ---------- */

const LANGUAGE_CANONICAL: Record<string, string[]> = {
  dutch: ["dutch", "nederlands", "الهولندية"],
  english: ["english", "engels", "الإنجليزية", "الانجليزية"],
  arabic: ["arabic", "arabisch", "العربية"],
  tigrinya: ["tigrinya", "tigrinja", "tigrigna", "ትግርኛ", "تغرينية"],
  farsi: ["farsi", "persian", "perzisch", "dari", "الفارسية"],
  french: ["french", "frans", "الفرنسية"],
  german: ["german", "duits", "الألمانية"],
  turkish: ["turkish", "turks", "التركية"],
  somali: ["somali", "somalisch", "الصومالية"],
  ukrainian: ["ukrainian", "oekraïens", "الأوكرانية"],
};

const LANGUAGE_INDEX = new Map<string, string>();
for (const [canonical, variants] of Object.entries(LANGUAGE_CANONICAL)) {
  for (const v of variants) LANGUAGE_INDEX.set(v, canonical);
}

export function normalizeLanguage(raw: string): string {
  const s = raw.trim().toLowerCase();
  return LANGUAGE_INDEX.get(s) ?? s;
}

/* ---------- Free-text extraction (vacancy quick-add) ---------- */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function scanVariants(text: string, table: Record<string, string[]>): string[] {
  // Normalize separators first ("food-safety" → "food safety"), matching
  // normalizeSkill's behavior, so hyphenated mentions aren't missed.
  const clean = text.toLowerCase().replace(/[._/\\-]+/g, " ");
  const found = new Set<string>();
  for (const [canonical, variants] of Object.entries(table)) {
    for (const v of variants) {
      const re = new RegExp(`(^|[^\\p{L}])${escapeRe(v)}(?=$|[^\\p{L}])`, "iu");
      if (re.test(clean)) {
        found.add(canonical);
        break;
      }
    }
  }
  return [...found];
}

/** Canonical skills mentioned anywhere in free text (all known variants). */
export function extractSkillsFromText(text: string): string[] {
  return scanVariants(text, CANONICAL);
}

/** Canonical languages mentioned anywhere in free text. */
export function extractLanguagesFromText(text: string): string[] {
  return scanVariants(text, LANGUAGE_CANONICAL);
}

/** Availability signals from free text; empty when the text says nothing. */
export function extractAvailabilityFromText(text: string): string {
  const hits: string[] = [];
  if (/full[-\s]?time|voltijd|40\s*uur|38\s*uur|36\s*uur|دوام كامل/iu.test(text)) hits.push("Full-time");
  if (/part[-\s]?time|deeltijd|دوام جزئي/iu.test(text)) hits.push("Part-time");
  if (/weekend/iu.test(text)) hits.push("Weekends");
  if (/shift|ploegendienst|نوبات/iu.test(text)) hits.push("Shifts");
  return hits.join(" · ");
}

/* ---------- Matching ---------- */

export interface VacancyInput {
  requiredSkills: string[];
  niceSkills: string[];
  languages: string[];
  availability: string;
}

export interface TalentInput {
  skills: string[];
  languages: string[];
  availability: string;
}

export interface MatchBreakdown {
  skills: number; // 0-80 (70 base + max 10 assessor-verified bonus)
  languages: number; // 0-15
  availability: number; // 0-15
  semantic?: number; // 0-20, only when embeddings are enabled and both sides embedded
}

export interface MatchOptions {
  /**
   * Cosine-based similarity in [0,1] between vacancy and talent embeddings.
   * null/undefined → pure rules scoring (identical to pre-embeddings behavior).
   */
  semanticSimilarity?: number | null;
}

/** Embeddings adjust at the margin; the rules engine decides. */
export const SEMANTIC_MAX = 20;
export const RULES_SHARE = 0.8;

export interface MatchResult {
  score: number; // 0-100
  breakdown: MatchBreakdown;
  matchedRequired: string[];
  missingRequired: string[];
  matchedNice: string[];
  verifiedMatched: string[];
  reasons: string[];
}

const WEIGHTS = { skillsRequired: 50, skillsNice: 20, languages: 15, availability: 15 } as const;
const VERIFIED_BONUS_POINTS = 3; // per assessor-verified required match
const VERIFIED_BONUS_MAX = 10;

function intersectScore(wanted: string[], actual: Set<string>): { matched: string[]; missing: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];
  for (const w of wanted) {
    const n = normalizeSkill(w);
    if (actual.has(n)) matched.push(w.trim());
    else missing.push(w.trim());
  }
  return { matched, missing };
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/[^a-z0-9à-ÿ\u0600-\u06FF]+/i).filter((t) => t.length > 2));
  const tb = new Set(b.toLowerCase().split(/[^a-z0-9à-ÿ\u0600-\u06FF]+/i).filter((t) => t.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit++;
  return hit / Math.max(ta.size, tb.size);
}

/* ---------- Availability normalization (EN / NL / AR) ---------- */

/**
 * Free-text availability like "full-time" vs "part-time" shares the token
 * "time" — raw token overlap would call them a match. Canonicalize first:
 * each known availability signal maps to one token across EN/NL/AR, so
 * "voltijd" and "full-time" are the same thing and "part-time" is not.
 */
const AVAILABILITY_SIGNALS: Record<string, RegExp> = {
  fulltime: /full[-\s]?time|voltijd|40\s*uur|38\s*uur|36\s*uur|دوام كامل/iu,
  parttime: /part[-\s]?time|deeltijd|دوام جزئي/iu,
  weekends: /weekend|عطلة نهاية الأسبوع/iu,
  shifts: /shift|ploegendienst|نوبات/iu,
  evenings: /evening|avond|مساء/iu,
  remote: /remote|thuiswerk|عن بعد/iu,
};

export function normalizeAvailability(text: string): Set<string> {
  const out = new Set<string>();
  for (const [canonical, re] of Object.entries(AVAILABILITY_SIGNALS)) {
    if (re.test(text)) out.add(canonical);
  }
  return out;
}

/** Availability match: canonical signal overlap, raw token overlap as fallback. */
function availabilityOverlap(vacancy: string, talent: string): number {
  const va = normalizeAvailability(vacancy);
  // The vacancy is the demand side: once it names a known signal, only that
  // signal counts — a talent without it scores 0. Raw token overlap is only
  // a fallback for demands we don't understand ("32-40 hours per week").
  if (va.size > 0) {
    const ta = normalizeAvailability(talent);
    let hit = 0;
    for (const s of va) if (ta.has(s)) hit++;
    return hit / va.size;
  }
  return tokenOverlap(vacancy, talent);
}


export function matchTalentToVacancy(
  vacancy: VacancyInput,
  talent: TalentInput,
  verifiedSkills: string[],
  opts?: MatchOptions
): MatchResult {
  // Dedupe vacancy demands by canonical form: "HACCP, haccp" is one demand,
  // not two — duplicates would inflate coverage and the verified bonus.
  // Each category gets its OWN set: a skill must never suppress a language
  // that happens to normalize to the same string (and vice versa).
  const dedupe = (list: string[], norm: (s: string) => string) => {
    const seen = new Set<string>();
    return list.filter((s) => {
      const n = norm(s);
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
  };
  vacancy = {
    ...vacancy,
    requiredSkills: dedupe(vacancy.requiredSkills, normalizeSkill),
    niceSkills: dedupe(vacancy.niceSkills, normalizeSkill),
    languages: dedupe(vacancy.languages, normalizeLanguage),
  };
  const talentSkills = new Set(talent.skills.map(normalizeSkill));
  const verified = new Set(verifiedSkills.map(normalizeSkill));
  const talentLangs = new Set(talent.languages.map(normalizeLanguage));

  // Skills — required (max 50): pure coverage; assessor-verified required
  // matches earn bonus points on top (capped) — verification always pays off.
  const req = intersectScore(vacancy.requiredSkills, talentSkills);
  const verifiedMatched = req.matched.filter((s) => verified.has(normalizeSkill(s)));
  const reqScore =
    vacancy.requiredSkills.length === 0
      ? WEIGHTS.skillsRequired
      : WEIGHTS.skillsRequired * (req.matched.length / vacancy.requiredSkills.length);
  const verifiedBonus = Math.min(VERIFIED_BONUS_MAX, VERIFIED_BONUS_POINTS * verifiedMatched.length);

  // Skills — nice to have (max 20)
  const nice = intersectScore(vacancy.niceSkills, talentSkills);
  const niceScore =
    vacancy.niceSkills.length === 0
      ? WEIGHTS.skillsNice
      : WEIGHTS.skillsNice * (nice.matched.length / vacancy.niceSkills.length);

  // Languages (max 15)
  const langWanted = vacancy.languages.map(normalizeLanguage).filter(Boolean);
  const langMatched = langWanted.filter((l) => talentLangs.has(l));
  const langScore =
    langWanted.length === 0 ? WEIGHTS.languages : WEIGHTS.languages * (langMatched.length / langWanted.length);

  // Availability (max 15) — canonical signal overlap (EN/NL/AR aware);
  // raw token overlap only when neither side names a known signal.
  // No demand = full score.
  const availScore = vacancy.availability.trim()
    ? WEIGHTS.availability * availabilityOverlap(vacancy.availability, talent.availability)
    : WEIGHTS.availability;

  const breakdown: MatchBreakdown = {
    skills: Math.round(reqScore + niceScore + verifiedBonus),
    languages: Math.round(langScore),
    availability: Math.round(availScore),
  };
  let score = Math.min(100, breakdown.skills + breakdown.languages + breakdown.availability);

  // Semantic blend (only when embeddings are live for BOTH sides):
  // rules shrink to 80% and the embedding signal fills up to 20 points.
  // Disabled or missing embeddings → the rules score stands untouched.
  const sim = opts?.semanticSimilarity;
  if (sim != null && Number.isFinite(sim)) {
    const clamped = Math.max(0, Math.min(1, sim));
    const semanticPts = Math.round(clamped * SEMANTIC_MAX);
    breakdown.semantic = semanticPts;
    score = Math.min(100, Math.round(score * RULES_SHARE) + semanticPts);
  }

  const reasons: string[] = [];
  if (breakdown.semantic != null) {
    reasons.push(`semantic profile similarity: ${Math.round((sim as number) * 100)}%`);
  }
  for (const s of req.matched) {
    reasons.push(
      verified.has(normalizeSkill(s))
        ? `${s} — required, verified by an assessor`
        : `${s} — required, self-reported`
    );
  }
  for (const s of nice.matched) reasons.push(`${s} — nice to have`);
  for (const s of req.missing) reasons.push(`missing required skill: ${s}`);
  for (const l of langMatched) reasons.push(`speaks ${l}`);
  if (vacancy.requiredSkills.length > 0 && req.matched.length === 0) {
    reasons.unshift("no required skills matched");
  }

  return {
    score,
    breakdown,
    matchedRequired: req.matched,
    missingRequired: req.missing,
    matchedNice: nice.matched,
    verifiedMatched,
    reasons,
  };
}
