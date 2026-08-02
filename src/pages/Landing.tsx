import { Link } from 'react-router'
import {
  Building2, Handshake, ArrowRight, Heart, TrendingUp, Quote, ArrowRightLeft,
  Languages, ShieldCheck, UserRound,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import heroImg from '@/assets/hero.jpg'
import { landing, trust } from '@/config/poolContent'

const { hero, mission, teachLearn, quote, values, retention, cta } = landing

type HowStep = { t: string; d: string }

export default function Landing() {
  const { t } = useTranslation()
  const talentSteps = t('how.talent', { returnObjects: true }) as HowStep[]
  const employerSteps = t('how.employer', { returnObjects: true }) as HowStep[]
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground">
        <div className="texture-dots absolute inset-0" />
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              <span className="relative h-2 w-2 rounded-full bg-primary"><span className="pulse-ring absolute inset-0 text-primary" /></span>
              {hero.eyebrow}
            </div>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">
              {hero.titleBefore} <span className="text-primary">{hero.titleHighlight}</span>{hero.titleAfter}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-secondary-foreground/75">
              {hero.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/discover"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110"
              >
                {hero.ctaPrimary} <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 font-semibold transition hover:bg-white/10"
              >
                {hero.ctaSecondary}
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-secondary-foreground/60">
              <span className="inline-flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> {hero.proofPoints[0]}</span>
              <span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> {hero.proofPoints[1]}</span>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
              <img src={heroImg} alt={hero.imageAlt} className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-5 -left-5 rounded-2xl border border-border bg-card p-4 text-foreground shadow-xl">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Handshake className="h-5.5 w-5.5" />
                </div>
                <div>
                  <div className="text-2xl font-bold leading-none">{hero.statCard.value}</div>
                  <div className="mt-1 text-xs font-medium text-muted-foreground">{hero.statCard.label}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION — the one place the pool's circumstances are named */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:pt-20">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">{mission.eyebrow}</div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {mission.heading}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {mission.intro}
            </p>
          </div>
        </div>
        <div className="mx-auto mt-10 grid max-w-7xl grid-cols-2 gap-px overflow-hidden lg:grid-cols-4">
          {mission.stats.map((s) => (
            <div key={s.value} className="px-6 py-10 text-center">
              <div className="font-display text-4xl font-semibold text-primary sm:text-5xl">{s.value}</div>
              <p className="mx-auto mt-2 max-w-[220px] text-sm leading-snug text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-7xl px-4 pb-6 text-center text-xs text-muted-foreground sm:px-6">
          {mission.footnote}
        </p>
      </section>

      {/* TRUST CHARTER — why assessment here is different */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">{trust.promiseTitle}</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              People tell institutions what feels safe. They tell us the truth.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {trust.promises.map((p) => (
              <div key={p.title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-5.5 w-5.5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — two journeys, translated (EN/NL/AR) */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">{t('how.eyebrow')}</div>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t('how.heading')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('how.sub')}
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {([
            { key: 'talent', icon: UserRound, title: t('how.talentTitle'), steps: talentSteps, accent: 'bg-primary/10 text-primary' },
            { key: 'employer', icon: Building2, title: t('how.employerTitle'), steps: employerSteps, accent: 'bg-secondary/10 text-secondary' },
          ]).map((side) => (
            <div key={side.key} className="rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-2xl ${side.accent}`}>
                  <side.icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="font-display text-2xl font-semibold">{side.title}</h3>
              </div>
              <ol className="mt-7 space-y-6">
                {side.steps.map((s, i) => (
                  <li key={s.t} className="flex gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted font-display text-sm font-bold text-foreground/70">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-semibold leading-snug">{s.t}</div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* TEACH & LEARN */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">{teachLearn.eyebrow}</div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {teachLearn.heading}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {teachLearn.body}
            </p>
            <Link to="/exchange" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary hover:gap-3 transition-all">
              {teachLearn.cta} <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </div>
          <div className="space-y-4">
            <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                  <Languages className="h-4 w-4" /> {teachLearn.example.talentName} teaches
                </div>
                <p className="mt-2 text-sm font-medium leading-snug">{teachLearn.example.talentTeaches}</p>
              </div>
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <ArrowRightLeft className="h-4.5 w-4.5" />
              </div>
              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
                  <Building2 className="h-4 w-4" /> {teachLearn.example.recruiterName} teaches
                </div>
                <p className="mt-2 text-sm font-medium leading-snug">{teachLearn.example.recruiterTeaches}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {teachLearn.cards.map((c) => (
                <div key={c.title} className="rounded-2xl border border-border bg-background p-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <c.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="mt-2.5 text-sm font-bold">{c.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="bg-secondary py-20 text-secondary-foreground lg:py-28">
        <div className="texture-dots absolute" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Quote className="mx-auto h-10 w-10 text-primary" />
          <blockquote className="mt-6 font-display text-3xl font-medium leading-snug text-balance sm:text-5xl">
            “{quote.before} <span className="text-primary">{quote.highlight}</span>{quote.after}”
          </blockquote>
          <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-secondary-foreground/60">
            {quote.attribution}
          </p>
        </div>
      </section>

      {/* VALUES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">{values.eyebrow}</div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance">
              {values.heading}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {values.intro}
            </p>
            <Link to="/discover" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary hover:gap-3 transition-all">
              {values.cta} <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {values.items.map((v) => (
              <div key={v.title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <v.icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RETENTION */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">{retention.eyebrow}</div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance">
              {retention.heading}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {retention.intro}
            </p>
          </div>
          <div className="space-y-4">
            {retention.items.map((item) => (
              <div key={item.k} className="flex gap-4 rounded-2xl border border-border bg-background p-5">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <div className="font-semibold">{item.k}</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.v}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-primary-foreground lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {cta.heading}
            </h2>
            <p className="mt-2 text-primary-foreground/85">
              {cta.sub}
            </p>
          </div>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-8 py-4 font-semibold text-secondary-foreground shadow-xl transition hover:brightness-110"
          >
            {cta.button} <ArrowRight className="h-4.5 w-4.5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
