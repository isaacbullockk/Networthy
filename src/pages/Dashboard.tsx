import { Link } from 'react-router'
import {
  Users, Video, Building2, BadgeCheck, HeartHandshake, TrendingUp,
  ChevronRight, Star, ArrowRight, StickyNote, GraduationCap, ArrowRightLeft, ShieldCheck,
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useApp } from '@/context/AppContext'
import { STAGES, stageIndex, type PipelineStage } from '@/types'
import Avatar from '@/components/Avatar'
import StageBadge from '@/components/StageBadge'

const FUNNEL_COLORS = [
  'from-sky-400 to-sky-600',
  'from-violet-400 to-violet-600',
  'from-amber-400 to-amber-600',
  'from-orange-400 to-orange-600',
  'from-emerald-400 to-emerald-600',
  'from-teal-400 to-teal-600',
]

const ORDER: PipelineStage[] = ['connected', 'video_chat', 'questionnaire', 'in_house', 'hired', 'retained']

export default function Dashboard() {
  const { matches: allMatches, updateMatch } = useApp()
  // Consent-first: pending/declined requests are not pipeline activity
  const matches = allMatches.filter((m) => m.talentConsent === 'accepted')
  const awaitingConsent = allMatches.filter((m) => m.talentConsent === 'pending').length
  const { data: talents } = trpc.talents.list.useQuery()
  const { data: stats } = trpc.exchanges.stats.useQuery()
  const { data: exchanges } = trpc.exchanges.list.useQuery()
  const { data: retentionPending } = trpc.retention.pending.useQuery()

  const counts = STAGES.map((s) => ({
    ...s,
    count: matches.filter((m) => stageIndex(m.stage) >= stageIndex(s.key)).length,
  }))
  const maxCount = Math.max(...counts.map((c) => c.count), 1)

  const hires = matches.filter((m) => stageIndex(m.stage) >= stageIndex('hired')).length
  const retained = matches.filter((m) => m.stage === 'retained').length
  const retention = hires > 0 ? Math.round((retained / hires) * 100) : 0
  const videoChats = matches.filter((m) => stageIndex(m.stage) >= stageIndex('video_chat')).length
  const inHouse = matches.filter((m) => stageIndex(m.stage) >= stageIndex('in_house')).length

  // Retention is the headline metric: anyone can make a hire — the point is a hire that stays.
  const kpis = [
    { icon: TrendingUp, label: '90-day retention', value: `${retention}%`, sub: 'the metric that matters — vs. 41% via traditional routes', highlight: true },
    { icon: HeartHandshake, label: 'Hires made', value: hires, sub: 'hired on connection, not CV' },
    { icon: Users, label: 'Active matches', value: matches.length, sub: 'in your pipeline' },
    { icon: Video, label: 'Video chats held', value: videoChats, sub: 'connection before commitment' },
    { icon: Building2, label: 'In-house visits', value: inHouse, sub: 'this quarter' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">Recruiter dashboard</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            From first hello to a hire that stays.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Every match moves through the connection pipeline: conversation → questions → real work → lasting hire.
          </p>
        </div>
        <Link to="/discover" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
          Discover more talent <ArrowRight className="h-4.5 w-4.5" />
        </Link>
      </div>

      {/* KPIs */}
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={
              k.highlight
                ? 'rounded-3xl border border-primary/30 bg-primary/5 p-5 shadow-sm ring-1 ring-primary/20'
                : 'rounded-3xl border border-border bg-card p-5 shadow-sm'
            }
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <k.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 font-display text-3xl font-semibold">{k.value}</div>
            <div className="text-sm font-semibold">{k.label}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Teach & Learn strip */}
      {stats && (
        <Link to="/exchange" className="group mt-8 flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-secondary p-5 text-secondary-foreground shadow-sm transition hover:shadow-lg sm:p-6">
          <div className="grid place-items-center rounded-2xl bg-primary/20 p-3.5 text-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-lg font-semibold">Teach &amp; Learn</span>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{stats.level}</span>
            </div>
            <div className="mt-1 text-sm text-secondary-foreground/70">
              {stats.xp} XP · {stats.completedCount} exchanges · {stats.badges.filter((b) => b.earned).length} badges — everybody has a talent, including you
              {(exchanges ?? []).some((e) => e.status === 'proposed' && e.proposedBy !== 'recruiter') && (
                <span className="ml-2 inline-flex items-center gap-1 font-semibold text-primary">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> a talent proposed an exchange!
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-secondary-foreground/50 transition group-hover:translate-x-1 group-hover:text-primary" />
        </Link>
      )}

      {/* Funnel */}
      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <BadgeCheck className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-semibold">The connection pipeline</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Cumulative matches per stage — each step deepens the connection before anyone commits.
        </p>
        {awaitingConsent > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-700">
            {awaitingConsent} connection request{awaitingConsent === 1 ? '' : 's'} awaiting the talent's response — identity unlocks only after they accept.
          </p>
        )}
        <div className="mt-7 space-y-3.5">
          {counts.map((c, i) => (
            <div key={c.key} className="flex items-center gap-4">
              <div className="w-40 shrink-0 text-sm font-medium sm:w-48">{c.label}</div>
              <div className="relative h-9 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`flex h-full items-center justify-end rounded-full bg-gradient-to-r pr-3.5 text-sm font-bold text-white transition-all duration-500 ${FUNNEL_COLORS[i]}`}
                  style={{ width: `${Math.max((c.count / maxCount) * 100, c.count ? 12 : 0)}%` }}
                >
                  {c.count}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matches */}
      <div className="mt-8">
        <h2 className="font-display text-2xl font-semibold">Your matches</h2>
        <div className="mt-5 space-y-4">
          {matches.map((m) => {
            const t = (talents ?? []).find((x) => x.id === m.talentId)
            if (!t) return null
            const isFinal = m.stage === 'retained'
            return (
              <div key={m.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar name={t.name} gradient={t.gradient} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link to={`/talent/${t.id}`} className="font-display text-lg font-semibold hover:text-primary">{t.name}</Link>
                      <StageBadge stage={m.stage} />
                      {t.verifiedCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified
                        </span>
                      )}
                      {m.connectionRating > 0 && (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500">
                          <Star className="h-4 w-4 fill-current" /> {m.connectionRating}/5 connection
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {m.role} · {m.company} · last activity {m.lastActivity}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/call/${t.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted">
                      <Video className="h-4 w-4" /> Call
                    </Link>
                    {stageIndex(m.stage) >= stageIndex('in_house') && (
                      <Link
                        to={`/record/${m.id}`}
                        title="The NetWorthy Record — earned at in-house"
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
                      >
                        <ShieldCheck className="h-4 w-4" /> Record
                      </Link>
                    )}
                    {!isFinal && (
                      <button
                        onClick={() => updateMatch(m.id, { stage: ORDER[Math.min(stageIndex(m.stage) + 1, ORDER.length - 1)] })}
                        className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:brightness-110"
                      >
                        Move to {STAGES[stageIndex(m.stage) + 1]?.label} <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {/* stage progress */}
                <div className="mt-4 flex gap-1.5">
                  {STAGES.map((s, i) => (
                    <div
                      key={s.key}
                      title={s.label}
                      className={`h-1.5 flex-1 rounded-full ${i <= stageIndex(m.stage) ? 'bg-primary' : 'bg-muted'}`}
                    />
                  ))}
                </div>
                {/* Retention mode */}
                {(m.stage === 'hired' || m.stage === 'retained') && (() => {
                  const pend = retentionPending?.find((p) => p.matchId === m.id)
                  const day = m.hiredAt ? Math.min(90, Math.floor((Date.now() - new Date(m.hiredAt).getTime()) / 86400000)) : 0
                  return (
                    <Link
                      to={`/retention/${m.id}`}
                      className={`mt-3 flex items-center gap-3 rounded-2xl border p-3.5 transition hover:shadow-sm ${
                        pend ? 'border-amber-300 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/50'
                      }`}
                    >
                      <HeartHandshake className={`h-5 w-5 shrink-0 ${pend ? 'text-amber-600' : 'text-emerald-600'}`} />
                      <div className="flex-1 text-sm">
                        <span className="font-semibold">{m.stage === 'retained' ? 'Retained — 90-day journey complete' : `Retention mode · Day ${day} of 90`}</span>
                        {pend && (
                          <span className="ml-2 font-semibold text-amber-700">
                            {pend.duePoint ? `· day ${pend.duePoint} check-in due` : ''}{pend.contractWaiting ? ' · contract waiting' : ''}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4.5 w-4.5 text-muted-foreground" />
                    </Link>
                  )
                })()}
                {m.notes && (
                  <div className="mt-3 flex gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                    <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="whitespace-pre-line">{m.notes}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
