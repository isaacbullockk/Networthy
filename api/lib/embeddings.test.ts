import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  embeddingText,
  HttpEmbedder,
  toSimilarity,
} from "./embeddings";
import { matchTalentToVacancy, SEMANTIC_MAX } from "./matching";

describe("cosineSimilarity", () => {
  it("identical vectors score 1, orthogonal 0, opposite negative", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("mismatched or empty vectors score 0, never throw", () => {
    expect(cosineSimilarity([], [1])).toBe(0);
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("embeddingText", () => {
  it("contains capability signals only — identity has no way in", () => {
    // The builder's parameter type has no name/origin/story fields; even
    // smuggling identity into skills must surface verbatim, not hidden.
    const text = embeddingText({
      skills: ["React", "HACCP"],
      languages: ["Dutch"],
      availability: "Full-time",
    });
    expect(text).toContain("react");
    expect(text).toContain("haccp");
    expect(text).toContain("dutch");
    expect(text).toContain("full-time");
    expect(text).not.toContain("name");
    expect(text).not.toContain("origin");
  });

  it("is deterministic regardless of input order", () => {
    const a = embeddingText({ skills: ["B", "A"], languages: ["Dutch", "English"], availability: "" });
    const b = embeddingText({ skills: ["a", "b"], languages: ["english", "dutch"], availability: "" });
    expect(a).toBe(b);
  });
});

describe("semantic blend in matchTalentToVacancy", () => {
  const vacancy = {
    requiredSkills: ["react"],
    niceSkills: [],
    languages: ["dutch"],
    availability: "full-time",
  };
  const talent = { skills: ["react"], languages: ["nederlands"], availability: "full-time" };

  it("no similarity given → identical to pure rules", () => {
    const plain = matchTalentToVacancy(vacancy, talent, []);
    const explicit = matchTalentToVacancy(vacancy, talent, [], { semanticSimilarity: null });
    expect(explicit.score).toBe(plain.score);
    expect(explicit.breakdown.semantic).toBeUndefined();
  });

  it("perfect similarity adds up to SEMANTIC_MAX, rules shrink to 80%", () => {
    const plain = matchTalentToVacancy(vacancy, talent, []);
    const blended = matchTalentToVacancy(vacancy, talent, [], { semanticSimilarity: 1 });
    expect(plain.score).toBe(100);
    expect(blended.score).toBe(Math.round(100 * 0.8) + SEMANTIC_MAX);
    expect(blended.breakdown.semantic).toBe(SEMANTIC_MAX);
    expect(blended.reasons.some((r) => r.startsWith("semantic profile similarity"))).toBe(true);
  });

  it("score never exceeds 100 and never goes below 0 for any similarity", () => {
    for (const sim of [0, 0.25, 0.5, 0.75, 1, 2, -1, NaN]) {
      const r = matchTalentToVacancy(vacancy, talent, [], { semanticSimilarity: sim });
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it("a zero-similarity embedding can lower but never zero a strong rules match", () => {
    const blended = matchTalentToVacancy(vacancy, talent, [], { semanticSimilarity: 0 });
    expect(blended.score).toBe(80); // 100 * 0.8 + 0
  });

  it("is deterministic with embeddings enabled", () => {
    const a = matchTalentToVacancy(vacancy, talent, [], { semanticSimilarity: 0.62 });
    const b = matchTalentToVacancy(vacancy, talent, [], { semanticSimilarity: 0.62 });
    expect(a).toEqual(b);
  });
});

describe("HttpEmbedder", () => {
  it("returns null on unreachable service — rules carry on", async () => {
    const e = new HttpEmbedder("http://127.0.0.1:1/embed");
    expect(await e.embed(["test"])).toBeNull();
  });

  it("rejects non-http(s) schemes, credentials and garbage URLs", () => {
    expect(() => new HttpEmbedder("ftp://example.com/embed")).toThrow();
    expect(() => new HttpEmbedder("https://user:pass@example.com/embed")).toThrow();
    expect(() => new HttpEmbedder("not a url")).toThrow();
  });

  it("honors the EMBEDDING_HOST allowlist", () => {
    process.env.EMBEDDING_HOST = "embeddings.internal";
    try {
      expect(() => new HttpEmbedder("https://evil.example.com/embed")).toThrow();
      expect(() => new HttpEmbedder("https://embeddings.internal/embed")).not.toThrow();
    } finally {
      delete process.env.EMBEDDING_HOST;
    }
  });

  it("toSimilarity clamps to [0,1]", () => {
    expect(toSimilarity(-0.5)).toBe(0);
    expect(toSimilarity(1.5)).toBe(1);
    expect(toSimilarity(0.42)).toBeCloseTo(0.42);
  });
});
