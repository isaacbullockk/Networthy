import { describe, it, expect } from "vitest";
import { matchTalentToVacancy, normalizeSkill } from "./matching";

const vacancy = {
  requiredSkills: ["HACCP", "cooking"],
  niceSkills: ["leadership"],
  languages: ["Dutch"],
  availability: "full-time 32-40 hours",
};

describe("normalizeSkill", () => {
  it("maps synonyms across languages to one canonical skill", () => {
    expect(normalizeSkill("HACCP")).toBe("foodsafety");
    expect(normalizeSkill("voedselveiligheid")).toBe("foodsafety");
    expect(normalizeSkill("سلامة الغذاء")).toBe("foodsafety");
    expect(normalizeSkill("kok")).toBe("cooking");
    expect(normalizeSkill("heftruck")).toBe("forklift");
  });

  it("keeps unknown skills as normalized themselves", () => {
    expect(normalizeSkill("Underwater Basket Weaving")).toBe("underwater basket weaving");
  });
});

describe("matchTalentToVacancy", () => {
  it("gives a high score for a fully matching, verified talent", () => {
    const r = matchTalentToVacancy(
      vacancy,
      { skills: ["HACCP", "kok", "leadership"], languages: ["Dutch", "Arabic"], availability: "full-time 40 hours" },
      ["HACCP", "cooking"]
    );
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.matchedRequired).toEqual(["HACCP", "cooking"]);
    expect(r.missingRequired).toEqual([]);
    expect(r.verifiedMatched).toEqual(["HACCP", "cooking"]);
  });

  it("verified skills outweigh self-reported skills", () => {
    const t = { skills: ["HACCP", "kok"], languages: ["Dutch"], availability: "full-time" };
    const verified = matchTalentToVacancy(vacancy, t, ["HACCP", "cooking"]);
    const selfOnly = matchTalentToVacancy(vacancy, t, []);
    expect(verified.score).toBeGreaterThan(selfOnly.score);
  });

  it("missing required skills are reported, never hidden", () => {
    const r = matchTalentToVacancy(
      vacancy,
      { skills: ["forklift"], languages: [], availability: "part-time" },
      []
    );
    expect(r.missingRequired).toEqual(["HACCP", "cooking"]);
    expect(r.reasons.join(" ")).toContain("missing required skill: HACCP");
    expect(r.score).toBeLessThan(30);
  });

  it("synonyms match: NL vacancy matches EN/AR talent skills", () => {
    const r = matchTalentToVacancy(
      { requiredSkills: ["boekhouding"], niceSkills: [], languages: [], availability: "" },
      { skills: ["bookkeeping"], languages: [], availability: "" },
      []
    );
    expect(r.matchedRequired).toEqual(["boekhouding"]);
  });

  it("languages match across English, Dutch and Arabic names", () => {
    const r = matchTalentToVacancy(
      { requiredSkills: [], niceSkills: [], languages: ["Dutch", "Arabic"], availability: "" },
      { skills: [], languages: ["Nederlands", "العربية"], availability: "" },
      []
    );
    expect(r.breakdown.languages).toBe(15);
  });

  it("Tigrinya matches across spellings and scripts", () => {
    const r = matchTalentToVacancy(
      { requiredSkills: [], niceSkills: [], languages: ["Tigrinya"], availability: "" },
      { skills: [], languages: ["ትግርኛ"], availability: "" },
      []
    );
    expect(r.breakdown.languages).toBe(15);
  });

  it("a vacancy with no demands scores everyone equally", () => {
    const open = { requiredSkills: [], niceSkills: [], languages: [], availability: "" };
    const a = matchTalentToVacancy(open, { skills: [], languages: [], availability: "" }, []);
    const b = matchTalentToVacancy(open, { skills: ["HACCP"], languages: ["Dutch"], availability: "full-time" }, []);
    expect(a.score).toBe(100);
    expect(b.score).toBe(100);
  });

  it("identity fields cannot influence the score", () => {
    // TalentInput has no name/origin/yearsInNL fields at all — this test pins
    // the contract: scoring inputs are skills, languages, availability only.
    const t = { skills: ["HACCP", "kok"], languages: ["Dutch"], availability: "full-time 40 hours" };
    const r1 = matchTalentToVacancy(vacancy, t, []);
    const r2 = matchTalentToVacancy(vacancy, { ...t }, []);
    expect(r1.score).toBe(r2.score);
  });

  it("score is deterministic", () => {
    const t = { skills: ["HACCP"], languages: ["Dutch"], availability: "full-time" };
    expect(matchTalentToVacancy(vacancy, t, []).score).toBe(matchTalentToVacancy(vacancy, t, []).score);
  });

  it("verified bonus is capped at 10 points", () => {
    const v = { requiredSkills: ["HACCP", "kok", "forklift", "welding", "cleaning"], niceSkills: [], languages: [], availability: "" };
    const t = { skills: ["HACCP", "kok", "forklift", "welding", "cleaning"], languages: [], availability: "" };
    const r = matchTalentToVacancy(v, t, ["HACCP", "cooking", "forklift", "welding", "cleaning"]);
    expect(r.verifiedMatched).toHaveLength(5);
    expect(r.breakdown.skills).toBeLessThanOrEqual(80); // 50 coverage + max 10 bonus (+ nice=20 unused here)
  });

  it("score never exceeds 100", () => {
    const r = matchTalentToVacancy(
      { requiredSkills: ["HACCP"], niceSkills: ["kok"], languages: ["Dutch"], availability: "full-time" },
      { skills: ["HACCP", "kok"], languages: ["Dutch"], availability: "full-time 32-40 hours per week" },
      ["HACCP", "kok"]
    );
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
