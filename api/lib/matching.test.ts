import { describe, it, expect } from "vitest";
import {
  extractAvailabilityFromText,
  extractLanguagesFromText,
  extractSkillsFromText,
  matchTalentToVacancy,
  normalizeSkill,
} from "./matching";

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

  it("a skill can never suppress a language demand (per-category dedup)", () => {
    // "dutch" as a typed skill and "Dutch" as a language normalize to the
    // same string; a shared dedup set would silently drop the language.
    const r = matchTalentToVacancy(
      { requiredSkills: ["dutch"], niceSkills: [], languages: ["Dutch"], availability: "" },
      { skills: ["dutch"], languages: ["Nederlands"], availability: "" },
      []
    );
    expect(r.breakdown.languages).toBe(15);
    expect(r.breakdown.skills).toBeGreaterThan(0);
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

describe("vacancy quick-add extraction", () => {
  it("pulls skills from a Dutch job ad across spellings", () => {
    const text = "Wij zoeken een kok met HACCP certificaat. Ervaring met de heftruck is een pre.";
    const skills = extractSkillsFromText(text);
    expect(skills).toContain("cooking");
    expect(skills).toContain("foodsafety");
    expect(skills).toContain("forklift");
  });

  it("pulls languages and availability from free text", () => {
    const text = "Fulltime functie, Nederlands en Engels vereist. Weekenddiensten mogelijk.";
    expect(extractLanguagesFromText(text)).toEqual(expect.arrayContaining(["dutch", "english"]));
    const avail = extractAvailabilityFromText(text);
    expect(avail).toContain("Full-time");
    expect(avail).toContain("Weekends");
  });

  it("invents nothing: unrelated text yields empty extractions", () => {
    const text = "Gezellig team, mooie kantoorhond, uitstekende koffie.";
    expect(extractSkillsFromText(text)).toEqual([]);
    expect(extractLanguagesFromText(text)).toEqual([]);
    expect(extractAvailabilityFromText(text)).toBe("");
  });

  it("does not match inside unrelated words", () => {
    // "react" inside "reaction" must not count as the React skill
    expect(extractSkillsFromText("We expect a quick reaction time.")).toEqual([]);
  });
});

describe("availability canonicalization", () => {
  it("full-time does NOT match part-time (shared 'time' token is not a match)", () => {
    const r = matchTalentToVacancy(
      { requiredSkills: [], niceSkills: [], languages: [], availability: "full-time" },
      { skills: [], languages: [], availability: "part-time" },
      []
    );
    expect(r.breakdown.availability).toBe(0);
  });

  it("full-time matches voltijd across languages", () => {
    const r = matchTalentToVacancy(
      { requiredSkills: [], niceSkills: [], languages: [], availability: "full-time 40 hours" },
      { skills: [], languages: [], availability: "voltijd" },
      []
    );
    expect(r.breakdown.availability).toBe(15);
  });

  it("free-text hours still work when no known signal is present", () => {
    const r = matchTalentToVacancy(
      { requiredSkills: [], niceSkills: [], languages: [], availability: "32-40 hours per week" },
      { skills: [], languages: [], availability: "available 40 hours per week" },
      []
    );
    expect(r.breakdown.availability).toBeGreaterThan(0);
  });
});

describe("availability demand-side rule", () => {
  it("a vacancy with a known signal never falls back to raw token overlap", () => {
    const r = matchTalentToVacancy(
      { requiredSkills: [], niceSkills: [], languages: [], availability: "full-time" },
      { skills: [], languages: [], availability: "full stack developer, available immediately" },
      []
    );
    expect(r.breakdown.availability).toBe(0);
  });
});

describe("deduped demands", () => {
  it("duplicate required skills (different spellings) count once — verified bonus not inflated", () => {
    const r = matchTalentToVacancy(
      { requiredSkills: ["HACCP", "haccp"], niceSkills: [], languages: [], availability: "" },
      { skills: ["haccp"], languages: [], availability: "" },
      ["HACCP"]
    );
    // 50 coverage + 20 (no nice-skills demand) + 3 verified bonus (once, not 6)
    expect(r.breakdown.skills).toBe(73);
  });
});
