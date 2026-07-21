import { Link } from 'react-router'
import {
  Video, ClipboardList, Building2, ChevronRight, Star, Sparkles,
  CalendarDays, ArrowRight, PartyPopper, GraduationCap, ArrowRightLeft,
  ShieldCheck, BadgeCheck, Clock, Check, X, HeartHandshake, Flame,
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/lib/auth'
import { STAGES, stageIndex } from '@/types'
import { trust } from '@/config/poolContent'
import Avatar from '@/components/Avatar'
import StageBadge from '@/components/StageBadge'

export default function PortalHome() {
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
          <div className="text-xs font-bold uppercase tracking-widest text-primary">My NetWorthy journey</div>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 max-w-xl text-lg text-muted-foreground">
            Your talent is in demand. Here's where you stand with every company.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <ShieldCheck className="h-4 w-4" /> {trust.promises[1].text}
          </p>
        </div>
      </div>

      {/* My NetWorthy Record — the earned CV */}
      {matches.filter((m) => stageIndex(m.stage) >= stageIndex('in_house')).map((m) => (
        <Link
          key={`rec-${m.id}`}
          to={`/record/${m.id}`}
          className="mt-8 flex items-center gap-4 rounded-3xl border border-primary/25 bg-primary/5 p-5 shadow-sm transition hover:shadow-lg sm:p-6"
        >
          <div className="grid h-13 w-13 place-items-center rounded-2xl bg-primary/15 p-3.5 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-semibold">Your NetWorthy Record with {m.company} is ready</div>
            <div className="text-sm text-muted-foreground">
              Earned through connection — verified skills, your story, the process that proved it. Yours to keep and share.
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      ))}

      {/* My first 90 days — retention mode */}
      {matches.filter((m) => m.stage === 'hired' || m.stage === 'retained').map((m) => {
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
                  {m.stage === 'retained' ? `Retained at ${m.company} — you made it.` : `Your first 90 days at ${m.company} · Day ${day} of 90`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {pend
                    ? [pend.duePoint ? `Day ${pend.duePoint} pulse check-in is due` : '', pend.contractWaiting ? 'Your connection contract is waiting' : ''].filter(Boolean).join(' · ')
                    : 'Connection health looks good — keep going.'}
                </div>
                {m.stage === 'hired' && (
                  <div className="mt-2.5 h-2 max-w-md overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${(day / 90) * 100}%` }} />
                  </div>
                )}
              </div>
              {pend?.duePoint != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white">
                  <Flame className="h-4 w-4" /> Check in now
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
              {stats.xp} XP · {stats.completedCount} exchanges completed · {stats.badges.filter((b) => b.earned).length} badges
              {(exchanges ?? []).some((e) => e.status === 'proposed' && e.proposedBy !== 'talent') && (
                <span className="ml-2 inline-flex items-center gap-1 font-semibold text-primary">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> a recruiter proposed an exchange!
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
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{pendingQuests.length} to answer</span>
            )}
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold">Questionnaires</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {pendingQuests.length > 0
              ? 'A recruiter is curious about you — answer in your own words, in your own time.'
              : 'No pending questions right now.'}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
            Open <ChevronRight className="h-4 w-4" />
          </span>
        </Link>

        <Link to="/portal/visits" className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <Building2 className="h-5.5 w-5.5" />
            </div>
            {upcomingVisits.length > 0 && (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">{upcomingVisits.length} planned</span>
            )}
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold">In-house visits</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {upcomingVisits.length > 0
              ? `Next visit: ${upcomingVisits[0].date} at ${upcomingVisits[0].time} — come as you are.`
              : 'No visits planned yet — they follow a good video chat.'}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
            Open <ChevronRight className="h-4 w-4" />
          </span>
        </Link>

        <Link to="/portal/profile" className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700">
            <Sparkles className="h-5.5 w-5.5" />
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold">My story</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your profile is your voice — keep it fresh so recruiters meet the real you.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
            Edit my story <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      {/* Verification — independent assessment, approved by you */}
      {(pendingAssessments.length > 0 || publishedAssessments.length > 0) && (
        <div className="mt-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-semibold">Your verification</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{trust.whyIndependent}</p>

          <div className="mt-5 space-y-4">
            {pendingAssessments.map(({ assessment: a, assessorName }) => (
              <div key={a.id} className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    <Clock className="h-3.5 w-3.5" /> Waiting for your approval
                  </span>
                  <span className="text-sm text-muted-foreground">by {assessorName}, independent assessor</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {a.skillsVerified.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
                      <BadgeCheck className="h-3.5 w-3.5" /> {s}
                    </span>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-card p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Standout strengths</div>
                  <p className="mt-1 text-sm leading-relaxed">{a.strengths}</p>
                </div>
                <div className="mt-3 rounded-2xl bg-card p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Assessment</div>
                  <p className="mt-1 text-sm leading-relaxed">{a.summary}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => approveMut.mutate({ assessmentId: a.id })}
                    disabled={approveMut.isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Approve — publish to my profile
                  </button>
                  <button
                    onClick={() => declineMut.mutate({ assessmentId: a.id })}
                    disabled={declineMut.isPending}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    <X className="h-4 w-4" /> Decline
                  </button>
                </div>
              </div>
            ))}

            {publishedAssessments.map(({ assessment: a, assessorName }) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="text-sm">
                  <span className="font-semibold text-emerald-800">Verified by {assessorName}</span>
                  <span className="text-emerald-700"> — visible on your profile: {a.skillsVerified.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches / journey */}
      <div className="mt-12">
        <h2 className="font-display text-2xl font-semibold">Companies connecting with you</h2>
        <div className="mt-5 space-y-4">
          {matches.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-14 text-center text-muted-foreground">
              Recruiters are discovering your story — your first match will appear here.
            </div>
          )}
          {matches.map((m) => (
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
                        <Star className="h-4 w-4 fill-current" /> {m.connectionRating}/5 connection
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{m.role}</div>
                </div>
                <Link
                  to={`/call/${m.talentId}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  <Video className="h-4 w-4" /> Join video chat <ArrowRight className="h-4 w-4" />
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
                  <PartyPopper className="h-4.5 w-4.5" /> Congratulations — you got the job!
                </div>
              )}
              {m.stage === 'retained' && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 p-3.5 text-sm font-semibold text-teal-700">
                  <PartyPopper className="h-4.5 w-4.5" /> 90+ days in — you're truly part of the team now.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming visits summary */}
      {upcomingVisits.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Coming up</h2>
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
