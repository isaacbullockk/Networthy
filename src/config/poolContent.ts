import {
  Search, Video, ClipboardList, Building2, Flame, Lightbulb, DoorOpen,
  Trophy, ArrowRightLeft, UtensilsCrossed,
} from 'lucide-react'

/**
 * POOL CONTENT CONFIG
 * ───────────────────
 * Every piece of copy that is specific to the talent pool lives here.
 * NetWorthy currently runs ONE pool — resilient talent in the Netherlands —
 * but the platform engine is pool-agnostic. Launching a second pool
 * (another country, another under-rated talent group) should mean adding
 * a config like this one, not rebuilding pages.
 *
 * Framing principles (brand strategy):
 *  1. Strength-first: people are introduced as talent — skilled, resilient,
 *     motivated. Never led by their legal status.
 *  2. Origin stays in the story: each person's background is told in their
 *     own profile, in their own words — it is context, not a category label.
 *  3. The mission names the gap: the only place the pool's circumstances are
 *     spelled out is the mission section — because that is the problem we
 *     exist to close, and funders/employers deserve the honest numbers.
 */

export const pool = {
  id: 'resilient-talent-nl',
  /** Strength-first category label — how we refer to the people on the platform */
  category: 'resilient talent',
  categoryPlural: 'resilient talents',
  region: 'the Netherlands',
} as const

export const brand = {
  name: 'NetWorthy',
  slogan: 'Everybody has a talent',
  tagline: 'Everybody has a talent — connect with it.',
  vision: 'From CV to genuine human connection',
} as const

export const landing = {
  hero: {
    eyebrow: brand.slogan,
    titleBefore: 'Hire the',
    titleHighlight: 'human',
    titleAfter: ', not the CV.',
    body: `NetWorthy matches ${pool.category} with employers through genuine human connection — video chats, thoughtful questionnaires and in-house visits. Because people are hired for talent and kept for fit, not for paperwork.`,
    ctaPrimary: 'Meet the talent',
    ctaSecondary: 'See the impact',
    proofPoints: ['Connection-first matching', 'Built for retention'],
    statCard: {
      value: '92%',
      label: 'still employed after 90 days when hired on connection*',
    },
    imageAlt: 'Talent and employer connecting in conversation',
  },

  /**
   * The mission section — the ONE place the pool's circumstances are named.
   * These numbers describe the gap we exist to close; they are context for
   * employers and funders, never a label on the people themselves.
   */
  mission: {
    eyebrow: 'Why NetWorthy exists',
    heading: 'A talent pool the market keeps overlooking.',
    intro:
      'People who rebuilt their lives in a new country bring exactly the qualities companies say they cannot find: resilience, adaptability, drive. The system just never learned to see them.',
    stats: [
      { value: '311K+', label: `people granted asylum in ${pool.region} since 2014` },
      { value: '13%', label: 'are working within 3 months of arrival (2024 cohort — it was 1% in 2014)' },
      { value: '73%', label: 'of those who do work are stuck in temporary contracts' },
      { value: '43%', label: 'still depend on social assistance after a decade' },
    ],
    footnote:
      '*Sources: CBS, Asiel & Integratie 2025 & 2026 · Divosa monitor, end-2024. The oft-cited “67% works below potential” dates from 2019 field research — no newer measurement exists, so we show contract quality instead.',
  },

  howItWorks: {
    eyebrow: 'How NetWorthy works',
    heading: 'From first hello to a lasting hire, in four human steps.',
    intro:
      'Traditional recruitment filters people out. NetWorthy invites people in — and supports both sides at every step, so the match sticks.',
    steps: [
      {
        icon: Search,
        step: '01',
        title: 'Discover stories, not CVs',
        text: 'Browse talent profiles built around personality, drive and lived experience. No diplomas-first filters — you meet the human before the paperwork.',
      },
      {
        icon: Video,
        step: '02',
        title: 'Connect over video chat',
        text: 'Start a conversation from anywhere. NetWorthy suggests meaningful questions that go beyond the CV, so both sides feel the click — or honestly, don’t.',
      },
      {
        icon: ClipboardList,
        step: '03',
        title: 'Ask what matters to you',
        text: 'Send a short questionnaire you compose yourself. Talents answer in their own words and time, so you arrive at the in-house visit already knowing each other.',
      },
      {
        icon: Building2,
        step: '04',
        title: 'Meet in-house, hire for real',
        text: 'Invite talent into your workplace: walk the floor, meet the team, do real work together. Hiring on connection is how people get hired — and stay.',
      },
    ],
  },

  teachLearn: {
    eyebrow: 'Teach & Learn — our favorite game',
    heading: 'Everybody has a talent. So everybody teaches.',
    body: 'On NetWorthy, connection flows both ways. The talent teaches the recruiter something new — a language, a recipe, a way of seeing the world. The recruiter teaches back — local work culture, a tool, a shortcut. Every swap earns XP and badges on both sides. Because people who teach each other, trust each other. And people who trust each other, stay.',
    cta: 'Start an exchange',
    example: {
      talentName: 'Amira',
      talentTeaches: 'The Arabic coffee ritual — and what hospitality means in Aleppo',
      recruiterName: 'Lisa',
      recruiterTeaches: 'Dutch directness: how to give and receive blunt feedback at work',
    },
    cards: [
      { icon: Trophy, title: 'Earn XP together', text: 'Every accepted swap earns points; completed ones earn 100 XP each.' },
      { icon: ArrowRightLeft, title: 'Real exchange', text: 'Languages, recipes, work hacks, life lessons — everybody teaches.' },
      { icon: UtensilsCrossed, title: 'Badges that matter', text: 'Polyglot, Kitchen Diplomat, Culture Guide, Bridge Builder.' },
    ],
  },

  quote: {
    before: 'We are a refuge for every company looking for',
    highlight: 'resilient talent',
    after: '.',
    attribution: `The NetWorthy vision — ${brand.vision.toLowerCase()}`,
  },

  values: {
    eyebrow: 'What we stand for',
    heading: 'Talent is everywhere. Opportunity should be too.',
    intro:
      'Most networks aren’t diverse — we stay in our own circle. Yet people with diverse networks are more successful, and employers are fighting a war for talent. NetWorthy brings those worlds together, with chances for everyone.',
    cta: 'Start connecting',
    items: [
      { icon: Flame, title: 'Passionate', text: 'We create value while doing good. We match the best interests of our talents and our partners.' },
      { icon: Lightbulb, title: 'Innovative', text: 'We don’t see the box: we use the full field of digital opportunities to accelerate genuine human connections.' },
      { icon: DoorOpen, title: 'Bold', text: 'We knock on doors. We use creativity to connect the seemingly unconnected.' },
    ],
  },

  retention: {
    eyebrow: 'Hired on connection, kept by fit',
    heading: 'The goal isn’t a hire. It’s a hire that stays.',
    intro:
      'A CV predicts a first interview. A connection predicts a first year. By the time an offer is made, both sides have talked, questioned, visited and worked together — so nobody starts on false expectations.',
    items: [
      { k: 'Video chat first', v: 'Both sides choose each other before any process begins — motivation is proven, not assumed.' },
      { k: 'Questionnaires before visits', v: 'Expectations are explicit before anyone steps into the building.' },
      { k: 'In-house experience', v: 'Talent meets the real team and the real work — no day-one surprises, the top cause of early exits.' },
      { k: 'Mutual commitment', v: 'Every step asks both sides to invest — and shared investment is what makes people stay.' },
    ],
  },

  cta: {
    heading: 'Ready to discover your NetWorth?',
    sub: `Meet the ${pool.category} your competitors are missing.`,
    button: 'Discover talent',
  },
} as const

export const discover = {
  eyebrow: 'Discover talent',
  heading: 'Meet people, not paperwork.',
  sub: 'Every profile is a story, not a CV. Sorted by how well they connect with your open roles.',
} as const

export const exchange = {
  heading: 'Everybody has a talent. Share yours.',
  /** Inspiration chips shown when a TALENT proposes what they'll teach */
  talentIdeas: [
    'A phrase in my language that always makes people smile',
    'A dish from home — and the story behind it',
    'How we celebrate good news where I come from',
    'A skill from my first job that nobody here knows',
  ],
  /** Inspiration chips shown when a RECRUITER proposes what they'll teach */
  recruiterIdeas: [
    'The unwritten rules of Dutch work culture',
    'How feedback really works in our team',
    'A tool or shortcut I use every single day',
    'The Dutch way of planning: agendas, coffee, done by five',
  ],
} as const

/** Suggested questions surfaced during video calls */
export const questionPrompts = [
  'What kind of work makes you lose track of time?',
  'Tell me about a moment you had to start over. What did you do first?',
  'What does a good team look like to you?',
  'Which skill do people underestimate in you?',
  'How do you like to receive feedback?',
  'What would your former colleagues say you are known for?',
  'What do you want to learn in the next year?',
  'Describe a problem you solved that nobody asked you to solve.',
  'What does a normal working day in your home country look like compared to here?',
  'What should I know about you that is not on any profile?',
] as const

/**
 * The trust charter — the promise that makes honest assessment possible.
 * Talents have learned that telling institutions the full truth can be used
 * against them, so they tell institutions what feels safe. NetWorthy is
 * deliberately NOT an institution: assessment happens between humans, and
 * nothing is shared with authorities. Ever.
 */
export const trust = {
  promiseTitle: 'Our promise to every talent',
  promises: [
    {
      title: 'We are not the government',
      text: 'NetWorthy is independent. We are not the IND, COA or any municipality — and we never act on their behalf.',
    },
    {
      title: 'Nothing is shared with authorities',
      text: 'Your story, your answers, your assessments — none of it goes to any authority. No exceptions, no small print.',
    },
    {
      title: 'You control your story',
      text: 'You see every assessment before it is published, and you approve it — or delete it. Your story is yours.',
    },
  ],
  /** Why assessment here is different — shown where verification is explained */
  whyIndependent:
    'People tell institutions what feels safe. They tell independent humans the truth. That is why every NetWorthy assessment is done by an independent professional — bound by confidentiality, never by an authority.',
  /** The confidentiality commitment every assessor signs before assessing */
  assessorCharter: {
    title: 'The Independent Assessor Charter',
    intro:
      'Talent tells the truth only when the truth is safe. As an independent assessor, you make it safe. Before your first assessment, you commit to the following:',
    points: [
      'I am independent: I do not act for the IND, COA, any municipality or any other authority.',
      'Everything a talent shares with me stays between us. I will never share it with any authority — not directly, not indirectly.',
      'I assess talent, not papers: skills, drive, working style — never legal status.',
      'I write for the talent, not about them: they read and approve every assessment before it is published.',
    ],
    commitment: 'I sign this charter and commit to it fully',
  },
} as const

export const footer = {
  line: `A refuge for every company looking for ${pool.category}. Contribute & interact to connect.`,
  motto: 'Talent is everywhere. Opportunity should be too.',
} as const
