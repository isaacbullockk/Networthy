import { getDb } from "../api/queries/connection";
import * as schema from "./schema";
import { hashPassword } from "../api/lib/password";

/**
 * DESTRUCTIVE: this script wipes every table before seeding.
 * It refuses to run unless SEED_DATABASE=yes is set explicitly, so it can
 * never be pointed at a production database by accident.
 *
 * Passwords come from env vars (never committed):
 *   SEED_PASSWORD   — launch-content accounts (default: NetWorthy!2026)
 *   ADMIN_PASSWORD  — the admin account     (default: SEED_PASSWORD)
 */
if (process.env.SEED_DATABASE !== "yes") {
  console.error(
    "Refusing to seed: this script DELETES ALL DATA.\n" +
      "Run with SEED_DATABASE=yes if you are sure this is not production."
  );
  process.exit(1);
}

const TALENTS: Omit<schema.Talent, "id" | "createdAt">[] = [
  {
    name: "Amira Haddad", role: "Software Developer", origin: "Syria", yearsInNL: 6,
    languages: ["Arabic", "Dutch", "English"],
    tagline: "I rebuilt my life from zero — twice. Code was the language that worked everywhere.",
    story: "In Aleppo I ran a small web shop fixing computers and building websites for local businesses. When we fled, I carried one backpack: clothes, photos, and my hard drive with every project I ever made. In the AZC I taught myself modern JavaScript on a borrowed laptop. Today I build React apps and mentor three other newcomers who are learning to code. I do not wait for opportunities — I build them.",
    traits: ["Resilient", "Self-taught", "Mentor", "Problem-solver"],
    skills: ["React", "TypeScript", "Node.js", "Mentoring", "Arabic–Dutch bridging"],
    dimensions: [
      { label: "Technical craft", strength: 88 },
      { label: "Drive & ownership", strength: 96 },
      { label: "Collaboration", strength: 84 },
      { label: "Learning agility", strength: 95 },
    ],
    lookingFor: "A product team where I can ship features end-to-end and keep mentoring.",
    availability: "Available from next month · 36–40 hrs",
    videoIntroSec: 94, gradient: "from-orange-400 to-rose-500", matchScore: 0,
    matchReasons: [],
    embedding: null,
  },
  {
    name: "Bereket Tesfay", role: "Chef & Kitchen Lead", origin: "Eritrea", yearsInNL: 8,
    languages: ["Tigrinya", "Dutch", "English"],
    tagline: "A kitchen runs on trust and timing — I have led teams through far harder services than a Friday rush.",
    story: "I learned cooking from my mother, who fed half our street in Asmara. Later I ran the kitchen of a 200-cover restaurant. In the Netherlands I started at the bottom again: washing dishes. Within a year I was sous-chef. My team is a map of the world — Somali, Polish, Dutch, Syrian — and we win together every service. Food is my language; leading people is my talent.",
    traits: ["Calm under pressure", "Team leader", "Precise", "Warm"],
    skills: ["Kitchen leadership", "Menu design", "HACCP", "Cost control", "Multilingual teams"],
    dimensions: [
      { label: "Craft expertise", strength: 92 },
      { label: "Leadership", strength: 90 },
      { label: "Composure", strength: 97 },
      { label: "Planning", strength: 85 },
    ],
    lookingFor: "A head-chef or kitchen-lead role in a restaurant or catering company.",
    availability: "Available immediately · fulltime",
    videoIntroSec: 71, gradient: "from-amber-400 to-orange-600", matchScore: 0,
    matchReasons: [],
    embedding: null,
  },
  {
    name: "Olena Kovalenko", role: "Financial Analyst", origin: "Ukraine", yearsInNL: 3,
    languages: ["Ukrainian", "Russian", "English", "Dutch (B1)"],
    tagline: "Numbers tell the truth when everything else is uncertain. I have built forecasts in a war zone.",
    story: "I was a senior analyst at a Kyiv bank, responsible for portfolio risk. When the invasion started, I kept our reporting running from a bomb shelter for six weeks so salaries could be paid. That is what reliability means to me. In Amsterdam I re-certified in Dutch GAAP and I now want to bring that same steadiness to a finance team here.",
    traits: ["Reliable", "Analytical", "Composed", "Precise"],
    skills: ["Financial modeling", "Risk analysis", "Excel / Power BI", "Dutch GAAP", "Reporting"],
    dimensions: [
      { label: "Analysis", strength: 94 },
      { label: "Reliability", strength: 98 },
      { label: "Tooling", strength: 86 },
      { label: "Communication", strength: 78 },
    ],
    lookingFor: "A (junior-)medior analyst role in banking, fintech or a corporate finance team.",
    availability: "Available in 2 weeks · 32–40 hrs",
    videoIntroSec: 82, gradient: "from-sky-400 to-indigo-600", matchScore: 0,
    matchReasons: [],
    embedding: null,
  },
  {
    name: "Yusuf Abdi", role: "Logistics Coordinator", origin: "Somalia", yearsInNL: 9,
    languages: ["Somali", "Dutch", "English", "Arabic"],
    tagline: "I have moved goods across borders with no roads, no internet and no excuses. Your supply chain is solvable.",
    story: "In Mogadishu I coordinated aid shipments for an NGO — twenty trucks, four cities, constant improvisation. Nothing teaches planning like a place where plans break daily. In the Netherlands I worked my way up from warehouse order picker to shift supervisor at a distribution center. I see bottlenecks before they happen, and I stay friendly while fixing them.",
    traits: ["Planner", "Improviser", "People person", "Unflappable"],
    skills: ["Supply chain planning", "WMS systems", "Team supervision", "Process improvement"],
    dimensions: [
      { label: "Planning", strength: 93 },
      { label: "Adaptability", strength: 97 },
      { label: "Leadership", strength: 82 },
      { label: "Systems", strength: 80 },
    ],
    lookingFor: "A coordinator or planner role in logistics, e-commerce or distribution.",
    availability: "Available immediately · fulltime, shifts OK",
    videoIntroSec: 66, gradient: "from-emerald-400 to-teal-600", matchScore: 0,
    matchReasons: [],
    embedding: null,
  },
  {
    name: "Farah Nasser", role: "UX Designer", origin: "Iraq", yearsInNL: 5,
    languages: ["Arabic", "English", "Dutch"],
    tagline: "I design for people the system forgot — because I have been one of them.",
    story: "I studied architecture in Baghdad and fell in love with how spaces guide people. Digital products are just spaces you walk through with your eyes. After arriving in the Netherlands I rebuilt my portfolio from scratch, won a design sprint at a Hague NGO, and redesigned an asylum-information app used by 40,000 newcomers. Empathy is not a soft skill — it is my design method.",
    traits: ["Empathic", "Visual thinker", "Curious", "Storyteller"],
    skills: ["UX research", "Figma", "Service design", "Accessibility", "Prototyping"],
    dimensions: [
      { label: "User research", strength: 95 },
      { label: "Visual craft", strength: 87 },
      { label: "Accessibility", strength: 96 },
      { label: "Stakeholder work", strength: 79 },
    ],
    lookingFor: "A UX or service design role, ideally on products with social impact.",
    availability: "Available from next month · 32–40 hrs",
    videoIntroSec: 88, gradient: "from-violet-400 to-purple-600", matchScore: 0,
    matchReasons: [],
    embedding: null,
  },
  {
    name: "Samuel Okonkwo", role: "Data Engineer", origin: "Nigeria", yearsInNL: 4,
    languages: ["English", "Igbo", "Dutch (B2)"],
    tagline: "Pipelines are like promises: they should never silently break. I build both to last.",
    story: "I taught myself programming in Lagos internet cafés, built payment integrations for market traders, and won a national hackathon with a flood-prediction model. In the Netherlands I completed a data engineering traineeship and now maintain ETL pipelines for a retail chain. I am the teammate who writes the documentation nobody else wants to write.",
    traits: ["Thorough", "Builder", "Honest", "Team-first"],
    skills: ["Python", "SQL", "Airflow", "dbt", "Cloud (GCP)"],
    dimensions: [
      { label: "Data engineering", strength: 89 },
      { label: "Reliability", strength: 93 },
      { label: "Documentation", strength: 97 },
      { label: "Speed", strength: 78 },
    ],
    lookingFor: "A data engineering role in retail, logistics or the public sector.",
    availability: "Available in 1 month · 36–40 hrs",
    videoIntroSec: 59, gradient: "from-cyan-400 to-blue-600", matchScore: 0,
    matchReasons: [],
    embedding: null,
  },
  {
    name: "Rania Khalil", role: "HR & People Advisor", origin: "Lebanon", yearsInNL: 7,
    languages: ["Arabic", "French", "English", "Dutch"],
    tagline: "I have hired in three countries and four languages. Talent is universal — systems are not.",
    story: "In Beirut I built the HR function of a 300-person company from scratch: recruitment, onboarding, conflict resolution, everything. Moving here meant my diploma suddenly \"did not count\" — so I re-certified, volunteered as an integration coach, and learned the Dutch system from the inside. Now I help companies see what I see every day: incredible talent behind unfamiliar CVs.",
    traits: ["Connector", "Diplomatic", "Energizing", "Fair"],
    skills: ["Recruitment", "Onboarding design", "Coaching", "Dutch labor law basics", "DEI"],
    dimensions: [
      { label: "People insight", strength: 96 },
      { label: "Process design", strength: 85 },
      { label: "Coaching", strength: 92 },
      { label: "Dutch context", strength: 84 },
    ],
    lookingFor: "An HR advisor, recruiter or DEI-focused people role.",
    availability: "Available immediately · 32–40 hrs",
    videoIntroSec: 76, gradient: "from-pink-400 to-rose-600", matchScore: 0,
    matchReasons: [],
    embedding: null,
  },
  {
    name: "Karim Benzari", role: "Mechatronics Technician", origin: "Syria", yearsInNL: 6,
    languages: ["Arabic", "Dutch", "English"],
    tagline: "Machines do not care where you were born. They only care if you can fix them. I can.",
    story: "My father had a workshop in Homs; I could take apart an engine before I could ride a bike. Later I maintained production lines in a plastics factory. In the Netherlands I earned my MBO mechatronics diploma with the highest score of my class while working night shifts. Give me a broken machine and a schematic, and I will give you back a running line.",
    traits: ["Hands-on", "Persistent", "Precise", "Modest"],
    skills: ["Mechatronics", "PLC basics (Siemens)", "Preventive maintenance", "Welding", "Technical drawing"],
    dimensions: [
      { label: "Technical skill", strength: 93 },
      { label: "Persistence", strength: 97 },
      { label: "Safety mindset", strength: 95 },
      { label: "Dutch language", strength: 74 },
    ],
    lookingFor: "A technician role in manufacturing, food production or technical services.",
    availability: "Available immediately · fulltime, shifts OK",
    videoIntroSec: 63, gradient: "from-slate-400 to-slate-700", matchScore: 0,
    matchReasons: [],
    embedding: null,
  },
];

const TALENT_EMAILS = [
  "amira@networthy.app", "bereket@networthy.app", "olena@networthy.app", "yusuf@networthy.app",
  "farah@networthy.app", "samuel@networthy.app", "rania@networthy.app", "karim@networthy.app",
];

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // Clean slate (order respects FK-less design)
  await db.delete(schema.sessions);
  await db.delete(schema.retentionPulses);
  await db.delete(schema.connectionContracts);
  await db.delete(schema.assessments);
  await db.delete(schema.videoIntros);
  await db.delete(schema.meetings);
  await db.delete(schema.questionnaires);
  await db.delete(schema.matches);
  await db.delete(schema.users);
  await db.delete(schema.talents);

  // 1. Talents
  const talentIds: number[] = [];
  for (const t of TALENTS) {
    const [{ id }] = await db.insert(schema.talents).values(t).$returningId();
    talentIds.push(id);
  }
  console.log(`Inserted ${talentIds.length} talents: ${talentIds.join(",")}`);

  // 2. Users — passwords from env (see header), bcrypt-hashed
  const pw = hashPassword(process.env.SEED_PASSWORD || "NetWorthy!2026");
  const recruiterRows = [
    { email: "lisa@picnic.nl", name: "Lisa de Vries", role: "recruiter" as const, company: "PicNic" },
    { email: "mark@bol.com", name: "Mark Janssen", role: "recruiter" as const, company: "Bol.com" },
  ];
  const recruiterIds: number[] = [];
  for (const r of recruiterRows) {
    const [{ id }] = await db.insert(schema.users).values({ ...r, passwordHash: pw, approvedAt: new Date() }).$returningId();
    recruiterIds.push(id);
  }
  const [lisa, mark] = recruiterIds;

  for (let i = 0; i < TALENTS.length; i++) {
    await db.insert(schema.users).values({
      email: TALENT_EMAILS[i],
      name: TALENTS[i].name,
      role: "talent",
      talentId: talentIds[i],
      passwordHash: pw,
      approvedAt: new Date(),
    });
  }

  // Independent assessor — signed the confidentiality charter
  const [{ id: assessorId }] = await db.insert(schema.users).values({
    email: "jeroen@networthy.app",
    name: "Jeroen van Dijk",
    role: "assessor",
    passwordHash: pw,
    charterSignedAt: new Date("2026-06-15"),
    approvedAt: new Date(),
  }).$returningId();

  // Admin — the founder's account (approves recruiters, invites assessors)
  await db.insert(schema.users).values({
    email: "isaac@networthy.app",
    name: "Isaac Bullock",
    role: "admin",
    passwordHash: hashPassword(process.env.ADMIN_PASSWORD || process.env.SEED_PASSWORD || "NetWorthy!2026"),
    approvedAt: new Date(),
  });
  console.log("Inserted users (2 recruiters + 8 talents + 1 assessor + 1 admin)");

  // 3. Matches
  const [amira, bereket, olena, yusuf, farah, samuel, , karim] = talentIds;
  const matchIds: number[] = [];
  for (const m of [
    { talentId: amira, recruiterId: lisa, company: "PicNic", role: "Frontend Developer", stage: "in_house", connectionRating: 5, notes: "Great energy in the video chat — she asked sharper questions than most seniors. In-house visit planned.", lastActivity: "2026-07-15" },
    { talentId: bereket, recruiterId: mark, company: "Bol.com", role: "Chef — company restaurant", stage: "hired", connectionRating: 5, notes: "Trial service was flawless. Offer signed — starts August 1.", lastActivity: "2026-07-16", hiredAt: new Date("2026-07-07") },
    { talentId: yusuf, recruiterId: mark, company: "Bol.com", role: "Logistics Coordinator", stage: "questionnaire", connectionRating: 4, notes: "Strong planner, very likeable. Waiting for questionnaire answers before floor visit.", lastActivity: "2026-07-14" },
    { talentId: olena, recruiterId: lisa, company: "PicNic", role: "Risk Analyst", stage: "video_chat", connectionRating: 4, notes: "Video chat went well — composed and precise. Send questionnaire next.", lastActivity: "2026-07-13" },
    { talentId: karim, recruiterId: lisa, company: "PicNic", role: "Mechatronics Technician", stage: "connected", connectionRating: 0, notes: "New match — schedule a first video chat.", lastActivity: "2026-07-17" },
    { talentId: farah, recruiterId: lisa, company: "PicNic", role: "UX Designer", stage: "retained", connectionRating: 5, notes: "Passed 90-day review with glowing feedback. Redesigned the newcomer portal — usage up 40%.", lastActivity: "2026-07-10", hiredAt: new Date("2026-03-21") },
    { talentId: samuel, recruiterId: mark, company: "Bol.com", role: "Data Engineer", stage: "connected", connectionRating: 0, notes: "Promising profile — reach out for a first video chat.", lastActivity: "2026-07-17" },
  ] as const) {
    const [{ id }] = await db.insert(schema.matches).values(m).$returningId();
    matchIds.push(id);
  }
  console.log("Inserted matches");

  // 3b. Retention Mode: pulse history for the retained alumna + day-7 for the new hire
  const [, mmBereket2, , , , mmFarah2] = matchIds;
  const pulseRows: (typeof schema.retentionPulses.$inferInsert)[] = [];
  const farahPulses: [number, number, number, number, number, number, number][] = [
    // [dayPoint, t.exp, t.bel, t.mom, r.exp, r.bel, r.mom]
    [7, 4, 3, 4, 4, 4, 4],
    [30, 4, 4, 5, 5, 4, 4],
    [60, 5, 5, 5, 5, 5, 5],
    [90, 5, 5, 5, 5, 5, 5],
  ];
  const dayMs = 86400000;
  const farahHired = new Date("2026-03-21").getTime();
  for (const [dp, te, tb, tm, re, rb, rm] of farahPulses) {
    pulseRows.push(
      { matchId: mmFarah2, dayPoint: dp, respondent: "talent", expectations: te, belonging: tb, momentum: tm, createdAt: new Date(farahHired + dp * dayMs) },
      { matchId: mmFarah2, dayPoint: dp, respondent: "recruiter", expectations: re, belonging: rb, momentum: rm, createdAt: new Date(farahHired + dp * dayMs + dayMs) },
    );
  }
  // Bereket: Mark (recruiter) answered day 7, Bereket's pulse is still open
  pulseRows.push({
    matchId: mmBereket2, dayPoint: 7, respondent: "recruiter",
    expectations: 4, belonging: 4, momentum: 5,
    note: "First week above expectations — brigade loves him.",
    createdAt: new Date("2026-07-14"),
  });
  await db.insert(schema.retentionPulses).values(pulseRows);
  console.log("Inserted retention pulses");

  // 4. Questionnaires
  await db.insert(schema.questionnaires).values([
    {
      talentId: amira, recruiterId: lisa,
      title: "Getting to know Amira — before your visit",
      purpose: "Prepare the in-house visit with the frontend team",
      status: "completed", sentAt: "2026-07-08",
      questions: [
        { id: "q1-1", type: "text", prompt: "What kind of project do you do your best work on?" },
        { id: "q1-2", type: "choice", prompt: "How do you prefer to learn a new codebase?", options: ["Pair with a teammate", "Read docs alone first", "Small bugfix tickets", "A mix of all three"] },
        { id: "q1-3", type: "scale", prompt: "How comfortable are you leading a small feature team? (1–5)" },
        { id: "q1-4", type: "text", prompt: "What should we prepare to make your visit valuable?" },
      ],
      answers: {
        "q1-1": "Products where I can see the user react. I once rebuilt a form that cut registration time in half — watching someone use it was the best day of that year.",
        "q1-2": "A mix of all three",
        "q1-3": "4",
        "q1-4": "A short pairing session on a real ticket and fifteen minutes with your design system — I love seeing how teams keep UI consistent.",
      },
    },
    {
      talentId: bereket, recruiterId: mark,
      title: "Kitchen leadership — pre-visit questions",
      purpose: "Understand leadership style before the trial service",
      status: "sent", sentAt: "2026-07-15",
      questions: [
        { id: "q2-1", type: "text", prompt: "Walk me through how you brief a brigade before a 200-cover service." },
        { id: "q2-2", type: "choice", prompt: "A new cook makes the same mistake twice in service. What do you do?", options: ["Correct on the spot, firmly", "Quiet word after service", "Show them again side-by-side", "Depends on the person"] },
        { id: "q2-3", type: "scale", prompt: "How important is menu creativity vs. consistency to you? (1 = all creativity, 5 = all consistency)" },
      ],
    },
  ]);
  console.log("Inserted questionnaires");

  // 5. Meetings
  await db.insert(schema.meetings).values([
    { talentId: amira, recruiterId: lisa, date: "2026-07-22", time: "14:00", location: "PicNic HQ, Amsterdam — Frontend hub, 3rd floor", agenda: "Office tour, pair on a real ticket, meet the product team, closing coffee with the engineering manager.", attendees: ["Lisa (Eng. Manager)", "Jeroen (Senior Dev)", "Amira Haddad"], status: "upcoming" },
    { talentId: yusuf, recruiterId: mark, date: "2026-07-24", time: "09:30", location: "Bol.com fulfilment center, Utrecht", agenda: "Walk the floor during morning peak, meet shift leads, discuss the planning board, lunch with the team.", attendees: ["Mark (Ops Lead)", "Samira (HR)", "Yusuf Abdi"], status: "upcoming" },
    { talentId: bereket, recruiterId: mark, date: "2026-07-11", time: "15:00", location: "Bol.com company restaurant, Utrecht", agenda: "Trial service: Bereket ran the pass for 40 covers with the existing brigade.", attendees: ["Chef Patrick", "Mark Janssen", "Bereket Tesfay"], status: "done" },
  ]);
  console.log("Inserted meetings");

  // 6. Teach & Learn exchanges (matchIds order matches the inserts above)
  const [mmAmira, mmBereket, mmYusuf, mmOlena, , mmFarah] = matchIds;
  await db.insert(schema.exchanges).values([
    {
      matchId: mmFarah, talentId: farah, recruiterId: lisa,
      talentTeaches: "How to say 'marhaba' and greet someone warmly in Arabic",
      recruiterTeaches: "Dutch cycling etiquette — how to survive the Amsterdam rush hour",
      proposedBy: "talent", status: "completed", completedAt: new Date("2026-06-20"),
    },
    {
      matchId: mmFarah, talentId: farah, recruiterId: lisa,
      talentTeaches: "The difference between Iraqi and Dutch breakfast — with recipes",
      recruiterTeaches: "How Dutch stand-up meetings really work (and why they're so short)",
      proposedBy: "recruiter", status: "completed", completedAt: new Date("2026-07-02"),
    },
    {
      matchId: mmAmira, talentId: amira, recruiterId: lisa,
      talentTeaches: "The Arabic coffee ritual — and what hospitality means in Aleppo",
      recruiterTeaches: "Dutch directness: how to give and receive blunt feedback at work",
      proposedBy: "recruiter", status: "accepted",
    },
    {
      matchId: mmBereket, talentId: bereket, recruiterId: mark,
      talentTeaches: "Injera from scratch — the Eritrean sourdough pancake",
      recruiterTeaches: "How Dutch lunch culture works: boterhammen, milk, and 12:00 sharp",
      proposedBy: "talent", status: "completed", completedAt: new Date("2026-07-12"),
    },
    {
      matchId: mmYusuf, talentId: yusuf, recruiterId: mark,
      talentTeaches: "Three Somali phrases that make any warehouse team smile",
      recruiterTeaches: "The unwritten rules of Dutch planning meetings",
      proposedBy: "recruiter", status: "proposed",
    },
    {
      matchId: mmOlena, talentId: olena, recruiterId: lisa,
      talentTeaches: "Ukrainian borscht — and the story it carries",
      recruiterTeaches: "How to network the Dutch way: borrels, birthdays, and circles of chairs",
      proposedBy: "talent", status: "proposed",
    },
  ]);
  console.log("Inserted exchanges");

  // 7. Independent assessments (Trust & Verification)
  await db.insert(schema.assessments).values([
    {
      talentId: amira, assessorId,
      status: "published",
      skillsVerified: ["React", "TypeScript", "Node.js", "Mentoring"],
      strengths: "Exceptional learning agility — taught herself modern JavaScript in an AZC on a borrowed laptop and now writes production-grade React. Mentors three other newcomers; explains complex things simply.",
      summary: "Amira is the strongest self-taught developer I have assessed in five years. In a 75-minute technical conversation she reasoned about state management, accessibility and API design at a solid medior level. Hire her for capability, not for a diploma she never got the chance to earn.",
      submittedAt: new Date("2026-07-05"),
      publishedAt: new Date("2026-07-07"),
    },
    {
      talentId: yusuf, assessorId,
      status: "pending_approval",
      skillsVerified: ["Supply chain planning", "Team supervision", "Process improvement"],
      strengths: "Plans for failure modes others don't see — twenty trucks, four cities, constant improvisation taught him redundancy thinking. Calm, friendly authority on the floor.",
      summary: "Yusuf coordinated aid logistics where plans break daily — that is a harder school than any WMS certification. His bottleneck instincts are real; I tested him on three live scenarios and his answers were practical, not theoretical.",
      submittedAt: new Date("2026-07-17"),
    },
  ]);
  console.log("Inserted assessments");
  console.log("Done.");
  process.exit(0);
}

seed();
