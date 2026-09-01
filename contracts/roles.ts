/**
 * Curated talent role titles — the single source of truth for the
 * `talents.role` field. Free-text roles let anyone self-assign titles like
 * "Senior Engineer" or "CEO", which would poison search and trust.
 * "Talent" is the starter default for unfinished profiles.
 */
export const TALENT_ROLES = [
  "Talent",
  "Software Developer",
  "Frontend Developer",
  "Data Engineer",
  "Data Analyst",
  "UX Designer",
  "Designer",
  "Financial Analyst",
  "Risk Analyst",
  "HR & People Advisor",
  "Mechatronics Technician",
  "Electrician",
  "Plumber",
  "Carpenter",
  "Welder",
  "Chef",
  "Chef & Kitchen Lead",
  "Chef — company restaurant",
  "Baker",
  "Kitchen Assistant",
  "Hospitality Worker",
  "Nurse",
  "Caregiver",
  "Teacher",
  "Accountant",
  "Logistics Coordinator",
  "Warehouse Worker",
  "Forklift Operator",
  "Driver",
  "Mechanic",
  "Cleaner",
  "Retail Associate",
  "Customer Service",
  "Marketing Specialist",
  "Translator",
  "Agricultural Worker",
  "Construction Worker",
] as const;

export type TalentRole = (typeof TALENT_ROLES)[number];
