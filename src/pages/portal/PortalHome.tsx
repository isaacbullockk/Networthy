import { Link } from 'react-router'
import {
  Video, ClipboardList, Building2, ChevronRight, Star, Sparkles,
  CalendarDays, ArrowRight, PartyPopper, GraduationCap, ArrowRightLeft,
  ShieldCheck, BadgeCheck, Clock, Check, X, HeartHandshake, Flame,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/providers/trpc'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/lib/auth'
import { STAGES, stageIndex } from '@/types'
import Avatar from '@/components/Avatar'
import StageBadge from '@/components/StageBadge'

export default function PortalHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { matches, questionnaires, meetings } = useApp()
  const { data: profile } = trpc.talents.mine.useQuery()
  const { data: stats } = trpc.exchanges.stats.useQuery()
  const { data: exchanges } = trpc.exchanges.list.useQuery()
  const utils = trpc.useUtils()
  const { data: myAssessments } = trpc.assessments.mine.useQuery()
  const approveMut = trpc.assessments.approve.useMutation({ onSuccess: () => utils.assessments.mine.invalidate() })
  const declineMut = trpc.assessments.decline.useMutation({ onSuccess: () => utils.assessments.mine.invalidate() })
  const { data: retentionPending } = trpc.retention.pending.useQuery()
  const respondMut = trpc.matches.respond.useMutation({
    onSuccess: () => utils.matches.list.invalidate(),
  })
  const pendingRequests = matches.filter((m) => m.talentConsent === 'pending')
  const activeMatches = matches.filter((m) => m.talentConsent === 'accepted')
  const pendingAssessments = (myAssessments ?? []).filter((a) => a.assessment.status === 'pending_approval')
  const publishedAssessments = (myAssessments ?? []).filter((a) => a.assessment.status === 'published')

  const pendingQuests = questionnaires.filter((q) => q.status === 'sent')
  const upcomingVisits = meetings.filter((m) => m.status === 'upcoming')
  const firstName = user?.name.split(' ')[0] ?? 'there'

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Welcome */}
      <div className="flex flex-wrap items-center gap-5">
        {profile && <Avatar name={profile.name} gradient={profile.gradient} size="lg" />}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-primary">{t('portal.home.eyebrow')}</div>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {t('portal.home.welcome', { name: firstName })}
          </h1>
          <p className="mt-2 max-w-xl text-lg text-muted-foreground">
            {t('portal.home.subtitle')}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <ShieldCheck className="h-4 w-4" /> {t('portal.home.trustPromise')}
          </p>
        </div>
      </div>

      {/* My NetWorthy Record — the earned CV */}
      {activeMatches.filter((m) => stageIndex(m.stage) >= stageIndex('in_house')).map((m) => (
        <Link
          key={`rec-${m.id}`}
          to={`/record/${m.id}`}
          className="mt-8 flex items-center gap-4 rounded-3xl border border-primary/25 bg-primary/5 p-5 shadow-sm transition hover:shadow-lg sm:p-6"
        >
          <div className="grid h-13 w-13 place-items-center rounded-2xl bg-primary/15 p-3.5 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-semibold">{t('portal.home.recordReady', { company: m.company })}</div>
            <div className="text-sm text-muted-foreground">
              {t('portal.home.recordSub')}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      ))}

      {/* My first 90 days — retention mode */}
      {activeMatches.filter((m) => m.stage === 'hired' || m.stage === 'retained').map((m) => {
        const pend = retentionPending?.find((p) => p.matchId === m.id)
        const day = m.hiredAt ? Math.min(90, Math.floor((Date.now() - new Date(m.hiredAt).getTime()) / 86400000)) : 0
        return (
          <Link
            key={m.id}
            to={`/retention/${m.id}`}
            className={`mt-8 block rounded-3xl border p-5 shadow-sm transition hover:shadow-lg sm:p-6 ${
              pend ? 'border-amber-300 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/50'
            }`}
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className={`grid h-13 w-13 place-items-center rounded-2xl p-3.5 ${pend ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <HeartHandshake className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-semibold">
                  {m.stage === 'retained' ? t('portal.home.retainedAt', { company: m.company }) : t('portal.home.first90', { company: m.company, day })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {pend
                    ? [pend.duePoint ? t('portal.home.pulseDue', { day: pend.duePoint }) : '', pend.contractWaiting ? t('portal.home.contractWaiting') : ''].filter(Boolean).join(' · ')
                    : t('portal.home.healthGood')}
                </div>
                {m.stage === 'hired' && (
                  <div className="mt-2.5 h-2 max-w-md overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${(day / 90) * 100}%` }} />
                  </div>
                )}
              </div>
              {pend?.duePoint != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white">
                  <Flame className="h-4 w-4" /> {t('portal.home.checkInNow')}
                </span>
              )}
              {!pend && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </div>
          </Link>
        )
      })}

      {/* Teach & Learn XP strip */}
      {stats && (
        <Link to="/exchange" className="group mt-8 flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-secondary p-5 text-secondary-foreground shadow-sm transition hover:shadow-lg sm:p-6">
          <div className="grid h-13 w-13 place-items-center rounded-2xl bg-primary/20 p-3.5 text-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-lg font-semibold">Teach &amp; Learn</span>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{stats.level}</span>
            </div>
            <div className="mt-1 text-sm text-secondary-foreground/70">
              {t('portal.home.xpLine', { xp: stats.xp, count: stats.completedCount, badges: stats.badges.filter((b) => b.earned).length })}
              {(exchanges ?? []).some((e) => e.status === 'proposed' && e.proposedBy !== 'talent') && (
                <span className="ml-2 inline-flex items-center gap-1 font-semibold text-primary">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> {t('portal.home.exchangeProposed')}
                </span>
              )}
            </div>
          </div>
          <div className="h-2.5 w-40 overflow-hidden rounded-full bg-white/10 max-sm:hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400"
              style={{ width: `${stats.nextLevelXp ? Math.min(100, (stats.xp / stats.nextLevelXp) * 100) : 100}%` }}
            />
          </div>
          <ChevronRight className="h-5 w-5 text-secondary-foreground/50 transition group-hover:translate-x-1 group-hover:text-primary" />
        </Link>
      )}

      {/* Action cards */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Link to="/portal/questionnaires" className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <ClipboardList className="h-5.5 w-5.5" />
            </div>
            {pendingQuests.length > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{t('portal.home.questToAnswer', { count: pendingQuests.length })}</span>
            )}
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold">{t('portal.home.questTitle')}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {pendingQuests.length > 0
              ? t('portal.home.questPending')
              : t('portal.home.questNone')}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
            {t('common.open')} <ChevronRight className="h-4 w-4" />
          </span>
        </Link>

        <Link to="/portal/visits" className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <Building2 className="h-5.5 w-5.5" />
            </div>
            {upcomingVisits.length > 0 && (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">{t('portal.home.visitsPlanned', { count: upcomingVisits.length })}</span>
            )}
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold">{t('portal.home.visitsTitle')}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {upcomingVisits.length > 0
              ? t('portal.home.visitsNext', { date: upcomingVisits[0].date, time: upcomingVisits[0].time })
              : t('portal.home.visitsNone')}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
            {t('common.open')} <ChevronRight className="h-4 w-4" />
          </span>
        </Link>

        <Link to="/portal/profile" className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700">
            <Sparkles className="h-5.5 w-5.5" />
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold">{t('portal.home.storyTitle')}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t('portal.home.storySub')}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
            {t('portal.home.storyEdit')} <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      {/* Verification — independent assessment, approved by you */}
      {(pendingAssessments.length > 0 || publishedAssessments.length > 0) && (
        <div className="mt-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-semibold">{t('portal.home.verification')}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t('portal.home.whyIndependent')}</p>

          <div className="mt-5 space-y-4">
            {pendingAssessments.map(({ assessment: a, assessorName }) => (
              <div key={a.id} className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    <Clock className="h-3.5 w-3.5" /> {t('portal.home.waitingApproval')}
                  </span>
                  <span className="text-sm text-muted-foreground">{t('portal.home.byAssessor', { name: assessorName })}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {a.skillsVerified.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
                      <BadgeCheck className="h-3.5 w-3.5" /> {s}
                    </span>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-card p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('portal.home.standoutStrengths')}</div>
                  <p className="mt-1 text-sm leading-relaxed">{a.strengths}</p>
                </div>
                <div className="mt-3 rounded-2xl bg-card p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('portal.home.assessment')}</div>
                  <p className="mt-1 text-sm leading-relaxed">{a.summary}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => approveMut.mutate({ assessmentId: a.id })}
                    disabled={approveMut.isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> {t('portal.home.approvePublish')}
                  </button>
                  <button
                    onClick={() => declineMut.mutate({ assessmentId: a.id })}
                    disabled={declineMut.isPending}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    <X className="h-4 w-4" /> {t('portal.home.decline')}
                  </button>
                </div>
              </div>
            ))}

            {publishedAssessments.map(({ assessment: a, assessorName }) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="text-sm">
                  <span className="font-semibold text-emerald-800">{t('portal.home.verifiedBy', { name: assessorName })}</span>
                  <span className="text-emerald-700">{t('portal.home.verifiedVisible', { skills: a.skillsVerified.join(', ') })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection requests — the talent decides who sees their identity */}
      {pendingRequests.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-2xl font-semibold">{t('portal.home.requests')}</h2>
          <div className="mt-5 space-y-4">
            {pendingRequests.map((m) => (
              <div key={m.id} className="rounded-3xl border border-primary/30 bg-primary/5 p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary font-display text-xl font-semibold text-secondary-foreground">
                    {m.company.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-semibold">{m.company}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      <strong className="text-foreground">{m.company}</strong> {t('portal.home.requestBody')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondMut.mutate({ id: m.id, accept: true })}
                      disabled={respondMut.isPending}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> {t('portal.home.accept')}
                    </button>
                    <button
                      onClick={() => respondMut.mutate({ id: m.id, accept: false })}
                      disabled={respondMut.isPending}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> {t('portal.home.decline')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches / journey — accepted connections only */}
      <div className="mt-12">
        <h2 className="font-display text-2xl font-semibold">{t('portal.home.companies')}</h2>
        <div className="mt-5 space-y-4">
          {activeMatches.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-14 text-center text-muted-foreground">
              {t('portal.home.noMatches')}
            </div>
          )}
          {activeMatches.map((m) => (
            <div key={m.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary font-display text-xl font-semibold text-secondary-foreground">
                  {m.company.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-display text-lg font-semibold">{m.company}</span>
                    <StageBadge stage={m.stage} />
                    {m.connectionRating > 0 && (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500">
                        <Star className="h-4 w-4 fill-current" /> {t('portal.home.connection', { rating: m.connectionRating })}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{m.role}</div>
                </div>
                <Link
                  to={`/call/${m.talentId}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  <Video className="h-4 w-4" /> {t('portal.home.joinVideo')} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {/* stage progress */}
              <div className="mt-4 flex items-center gap-1.5">
                {STAGES.map((s, i) => (
                  <div key={s.key} className="flex-1">
                    <div className={`h-1.5 rounded-full ${i <= stageIndex(m.stage) ? 'bg-primary' : 'bg-muted'}`} />
                    <div className={`mt-1.5 hidden text-[10px] font-semibold sm:block ${i <= stageIndex(m.stage) ? 'text-primary' : 'text-muted-foreground'}`}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              {m.stage === 'hired' && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-700">
                  <PartyPopper className="h-4.5 w-4.5" /> {t('portal.home.hired')}
                </div>
              )}
              {m.stage === 'retained' && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 p-3.5 text-sm font-semibold text-teal-700">
                  <PartyPopper className="h-4.5 w-4.5" /> {t('portal.home.retained90')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming visits summary */}
      {upcomingVisits.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-2xl font-semibold">{t('portal.home.comingUp')}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {upcomingVisits.map((v) => (
              <div key={v.id} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <CalendarDays className="h-5.5 w-5.5" />
                </div>
                <div>
                  <div className="font-semibold">{v.date} · {v.time}</div>
                  <div className="text-sm text-muted-foreground">{v.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
