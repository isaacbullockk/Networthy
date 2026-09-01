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
}

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

export function matchTalentToVacancy(
  vacancy: VacancyInput,
  talent: TalentInput,
  verifiedSkills: string[]
): MatchResult {
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

  // Availability (max 15) — token overlap between texts; no demand = full score
  const availScore = vacancy.availability.trim()
    ? WEIGHTS.availability * Math.min(1, tokenOverlap(vacancy.availability, talent.availability) * 2)
    : WEIGHTS.availability;

  const breakdown: MatchBreakdown = {
    skills: Math.round(reqScore + niceScore + verifiedBonus),
    languages: Math.round(langScore),
    availability: Math.round(availScore),
  };
  const score = Math.min(100, breakdown.skills + breakdown.languages + breakdown.availability);

  const reasons: string[] = [];
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
