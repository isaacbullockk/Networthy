import { describe, it, expect } from "vitest";
import { scoreSkills } from "./scoring";

describe("scoreSkills", () => {
  it("returns null score when no wanted skills are given", () => {
    expect(scoreSkills([], ["React"], ["React"]).score).toBeNull();
    expect(scoreSkills(["  "], ["React"], []).score).toBeNull();
  });

  it("scores 100 when all wanted skills are verified", () => {
    const r = scoreSkills(["React", "SQL"], ["React", "SQL"], ["React", "SQL"]);
    expect(r.score).toBe(100);
    expect(r.matched).toHaveLength(2);
    expect(r.matched.every((m) => m.verified)).toBe(true);
  });

  it("weights verified skills heavier than self-reported ones", () => {
    const verified = scoreSkills(["React", "SQL"], ["React", "SQL"], ["React", "SQL"]);
    const selfOnly = scoreSkills(["React", "SQL"], ["React", "SQL"], []);
    expect(verified.score).toBeGreaterThan(selfOnly.score!);
    expect(selfOnly.score).toBe(60); // full coverage, zero verified
  });

  it("gives partial credit for partial coverage", () => {
    const r = scoreSkills(["React", "SQL", "Docker", "Go"], ["React"], []);
    expect(r.score).toBe(15); // 1/4 coverage * 60
    expect(r.matched.map((m) => m.skill)).toEqual(["react"]);
  });

  it("is case-insensitive and trims whitespace", () => {
    const r = scoreSkills([" react ", "SQL"], ["REACT", "sql"], []);
    expect(r.score).toBe(60);
  });

  it("matches verified skills even when not self-reported", () => {
    const r = scoreSkills(["HACCP"], [], ["haccp"]);
    expect(r.score).toBe(100);
    expect(r.reasons[0]).toContain("verified by an assessor");
  });

  it("deduplicates wanted skills", () => {
    const r = scoreSkills(["React", "react", "REACT"], ["React"], []);
    expect(r.matched).toHaveLength(1); // duplicates collapse to one wanted skill
    expect(r.score).toBe(60); // full coverage, self-reported only
  });

  it("scores 0 when nothing matches", () => {
    expect(scoreSkills(["Go"], ["React"], []).score).toBe(0);
  });

  it("reasons distinguish verified from self-reported", () => {
    const r = scoreSkills(["React", "SQL"], ["React", "SQL"], ["SQL"]);
    expect(r.reasons.find((x) => x.startsWith("sql"))).toContain("verified");
    expect(r.reasons.find((x) => x.startsWith("react"))).toContain("self-reported");
  });
});
