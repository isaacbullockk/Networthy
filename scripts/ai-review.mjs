/**
 * AI design review for NetWorthy — independent second opinion on a PR diff.
 *
 * Runs Nemotron 3 Ultra via OpenRouter. ADVISORY by default: writes
 * ai-review.md and always exits 0. The repo owner can make a FAIL verdict
 * blocking by setting the repo variable AI_REVIEW_STRICT=true.
 *
 * Deliberate design decisions (do not "fix" these away):
 *  - Only the diff is sent, never the full repo and never runtime data.
 *  - No API key → clean skip, exit 0. Missing tooling must never break CI.
 *  - Unparseable verdict → advisory warning, never a silent pass.
 */

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
const STRICT = (process.env.AI_REVIEW_STRICT || '').toLowerCase() === 'true';
const BASE = process.env.BASE_SHA || 'origin/main';
const HEAD = process.env.HEAD_SHA || 'HEAD';
const MAX_DIFF_CHARS = 120_000;

function report(md) {
  writeFileSync('ai-review.md', md);
  console.log(md.slice(0, 4000));
}

if (!API_KEY) {
  report('_Skipped: `OPENROUTER_API_KEY` secret is not configured. '
    + 'The deterministic build gate remains the authoritative check._');
  process.exit(0);
}

let diff;
try {
  diff = execSync(`git diff ${BASE}...${HEAD}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (err) {
  report(`_Skipped: could not compute diff (${String(err.message).slice(0, 200)})._`);
  process.exit(0);
}

if (!diff.trim()) {
  report('_Empty diff — nothing to review._');
  process.exit(0);
}

const truncated = diff.length > MAX_DIFF_CHARS;
if (truncated) diff = diff.slice(0, MAX_DIFF_CHARS);

const system = `You are a strict, independent code reviewer for NetWorthy (networthy.nl), \
a platform connecting refugee talent with Dutch employers. Review the pull-request diff below.

Non-negotiable project invariants — flag ANY violation as critical:
1. Talent privacy: identities stay masked until a mutual connect; no personal data may be logged, \
emailed, or sent to third parties. No tracking/ads.
2. Jobseekers are NEVER charged (art. 3 Waadi). Revenue only from employers.
3. No secrets or tokens in source; .env must never be tracked.
4. The seed script must stay guarded behind SEED_DATABASE=yes — it wipes all data.
5. Auth/security semantics: hashed reset tokens, single-use, session revocation, no account enumeration.
6. Matching is skills-based only — never on origin, religion, age, or any protected trait.

Assess: correctness, logic drift from the diff's apparent intent, security, and whether server-side \
safeguards survive. Be specific: cite file and line. Do not invent issues to appear thorough — \
a clean diff deserves a clean PASS.

End your review with a JSON block as the LAST thing you write:
\`\`\`json
{"verdict": "PASS" | "FAIL", "critical_findings": <number>, "summary": "<one sentence>"}
\`\`\`
FAIL only for concrete critical/high findings; style nits never fail the review.`;

const user = `Pull-request diff${truncated ? ' (truncated to 120k chars — note this in your review)' : ''}:\n\n${diff}`;

let verdict = 'UNKNOWN';
let body;
try {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  body = data.choices?.[0]?.message?.content ?? '';
  if (!body) throw new Error('empty response from model');
} catch (err) {
  // Tooling failures are never verdicts.
  report(`_AI review unavailable: ${String(err.message).slice(0, 300)}. `
    + 'The deterministic build gate remains the authoritative check._');
  process.exit(0);
}

const match = body.match(/```json\s*(\{[\s\S]*?"verdict"[\s\S]*?\})\s*```/);
if (match) {
  try {
    verdict = String(JSON.parse(match[1]).verdict || 'UNKNOWN').toUpperCase();
  } catch { /* keep UNKNOWN */ }
}

const header = `**Model:** \`${MODEL}\` · **Mode:** ${STRICT ? 'STRICT (blocking)' : 'advisory'}`
  + ` · **Verdict:** **${verdict}**\n\n---\n\n`;

if (verdict === 'UNKNOWN') {
  report(header + '⚠️ Could not parse a verdict from the model response — treat as advisory only.\n\n' + body);
  process.exit(0);
}

report(header + body);

if (STRICT && verdict === 'FAIL') {
  console.error('::error::AI review returned FAIL and AI_REVIEW_STRICT=true — blocking this PR.');
  process.exit(1);
}
process.exit(0);
