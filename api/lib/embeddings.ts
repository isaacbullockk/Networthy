/**
 * Semantic embeddings layer — optional, bounded, and disabled by default.
 *
 * Hard rules:
 *  1. ONLY skills/languages/availability are embedded. Identity text (name,
 *     origin, story) never reaches the embedding input — enforced by the
 *     input builder, pinned by tests.
 *  2. EMBEDDINGS ADJUST, RULES DECIDE. The semantic signal contributes at
 *     most 20 of 100 points; the deterministic rules engine stays in charge
 *     and stays explainable.
 *  3. DISABLED UNLESS CONFIGURED. Without EMBEDDING_URL the platform behaves
 *     exactly as before — pure rules. Failures degrade to rules-only, never
 *     to an error the user sees.
 *  4. SELF-HOSTED ONLY. Talent data is never sent to a third-party AI API.
 *     The URL must point at infrastructure we control (Railway service).
 */

export interface Embedder {
  embed(texts: string[]): Promise<number[][] | null>;
}

const TIMEOUT_MS = 4000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // embeddings are small; huge = hostile

/**
 * Validate the operator-configured embedding endpoint before it is ever
 * called. The URL comes from env (operator-controlled), but defense in
 * depth: only http(s), no credentials, and an optional host allowlist via
 * EMBEDDING_HOST so a mistyped/exfiltrated URL can't redirect capability
 * data to an arbitrary endpoint.
 */
function validateEmbeddingUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  const allowedHost = process.env.EMBEDDING_HOST?.trim();
  if (allowedHost && url.hostname !== allowedHost) return null;
  return url.toString();
}

/** Cosine similarity in [-1, 1]; 0 for empty/mismatched vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Clamp a raw cosine to a usable similarity in [0, 1]. */
export function toSimilarity(cosine: number): number {
  return Math.max(0, Math.min(1, cosine));
}

/**
 * The ONLY text an embedding is ever computed from. Structured capability
 * signals, canonical order — identity fields have no way in.
 */
export function embeddingText(parts: {
  skills: string[];
  languages: string[];
  availability: string;
}): string {
  const skills = [...parts.skills].map((s) => s.toLowerCase().trim()).filter(Boolean).sort();
  const langs = [...parts.languages].map((s) => s.toLowerCase().trim()).filter(Boolean).sort();
  return [
    `skills: ${skills.join(", ")}`,
    `languages: ${langs.join(", ")}`,
    `availability: ${parts.availability.toLowerCase().trim()}`,
  ].join("\n");
}

/**
 * HTTP embedder against a self-hosted embedding service (e.g. a
 * multilingual-E5 container on Railway exposing POST /embed with
 * { texts: string[] } -> { embeddings: number[][] }).
 * Any failure returns null — the caller falls back to rules-only scoring.
 */
export class HttpEmbedder implements Embedder {
  private url: string;
  constructor(url: string) {
    const validated = validateEmbeddingUrl(url);
    if (!validated) throw new Error("Invalid EMBEDDING_URL");
    this.url = validated;
  }

  async embed(texts: string[]): Promise<number[][] | null> {
    if (texts.length === 0) return [];
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return null;
      // Read with a hard size cap — a hostile or broken service must not be
      // able to exhaust memory with an unbounded body.
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > MAX_RESPONSE_BYTES) return null;
      const reader = res.body?.getReader();
      if (!reader) return null;
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
      const body = new TextDecoder().decode(
        chunks.length === 1
          ? chunks[0]
          : (() => {
              const all = new Uint8Array(total);
              let off = 0;
              for (const c of chunks) { all.set(c, off); off += c.byteLength; }
              return all;
            })()
      );
      const data = JSON.parse(body) as { embeddings?: number[][] };
      if (!Array.isArray(data.embeddings) || data.embeddings.length !== texts.length) return null;
      return data.embeddings;
    } catch {
      return null; // timeout, DNS, bad JSON — rules engine carries on
    }
  }
}

/** The configured embedder, or null when embeddings are disabled/invalid. */
export function getEmbedder(): Embedder | null {
  const url = process.env.EMBEDDING_URL?.trim();
  if (!url) return null;
  try {
    return new HttpEmbedder(url);
  } catch {
    return null; // invalid config → rules-only, never crash request handling
  }
}
