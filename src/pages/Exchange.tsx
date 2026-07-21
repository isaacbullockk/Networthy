import { useMemo, useState } from 'react'
import {
  GraduationCap, Sparkles, Trophy, Medal, Languages, UtensilsCrossed, Compass,
  HeartHandshake, ArrowRightLeft, Check, CheckCircle2, Clock, Lightbulb, Send, Plus,
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/lib/auth'
import Avatar from '@/components/Avatar'
import { exchange } from '@/config/poolContent'

const BADGE_ICONS: Record<string, typeof Medal> = {
  'first-swap': Medal,
  'bridge-builder': HeartHandshake,
  'master-exchange': Trophy,
  polyglot: Languages,
  'kitchen-diplomat': UtensilsCrossed,
  'culture-guide': Compass,
  'generous-teacher': GraduationCap,
}

const TALENT_IDEAS = exchange.talentIdeas
const RECRUITER_IDEAS = exchange.recruiterIdeas

export default function Exchange() {
  const { user } = useAuth()
  const utils = trpc.useUtils()
  const { matches } = useApp()
  const { data: exchanges } = trpc.exchanges.list.useQuery()
  const { data: stats } = trpc.exchanges.stats.useQuery()
  const { data: talents } = trpc.talents.list.useQuery(undefined, { enabled: user?.role === 'recruiter' })
  const { data: myProfile } = trpc.talents.mine.useQuery(undefined, { enabled: user?.role === 'talent' })

  const [showForm, setShowForm] = useState(false)
  const [matchId, setMatchId] = useState<number | null>(null)
  const [talentTeaches, setTalentTeaches] = useState('')
  const [recruiterTeaches, setRecruiterTeaches] = useState('')
  const [toast, setToast] = useState('')

  const invalidate = () => {
    utils.exchanges.list.invalidate()
    utils.exchanges.stats.invalidate()
  }
  const proposeMut = trpc.exchanges.propose.useMutation({
    onSuccess: () => { invalidate(); setShowForm(false); setTalentTeaches(''); setRecruiterTeaches(''); notify('Exchange proposed — the other side can accept now.') },
  })
  const acceptMut = trpc.exchanges.accept.useMutation({
    onSuccess: () => { invalidate(); notify('Exchange accepted — time to teach each other!') },
  })
  const completeMut = trpc.exchanges.complete.useMutation({
    onSuccess: () => { invalidate(); notify('Exchange completed — +100 XP for both of you!') },
  })

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const talentFor = (talentId: number) =>
    user?.role === 'talent' ? myProfile : (talents ?? []).find((t) => t.id === talentId)

  const levelProgress = useMemo(() => {
    if (!stats || !stats.nextLevelXp) return 100
    return Math.min(100, Math.round((stats.xp / stats.nextLevelXp) * 100))
  }, [stats])

  const sorted = useMemo(
    () => [...(exchanges ?? [])].sort((a, b) => (a.status === b.status ? 0 : a.status === 'proposed' ? -1 : a.status === 'accepted' ? -1 : 1)),
    [exchanges]
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Header */}
      <div className="max-w-3xl">
        <div className="text-xs font-bold uppercase tracking-widest text-primary">Teach &amp; Learn</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {exchange.heading}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          The best matches start with genuine connection — and nothing connects like teaching each
          other something new. Swap a skill, a recipe, a phrase or a life hack with your match and
          earn XP and badges together.
        </p>
      </div>

      {/* XP + badges */}
      <div className="mt-10 grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="rounded-3xl border border-border bg-secondary p-6 text-secondary-foreground shadow-sm sm:p-7">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-widest text-secondary-foreground/60">Exchange level</div>
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-3 font-display text-3xl font-semibold">{stats?.level ?? '…'}</div>
          <div className="mt-1 text-sm text-secondary-foreground/60">
            {stats?.xp ?? 0} XP earned {stats?.nextLevelXp ? `· ${stats.nextLevelXp - stats.xp} to next level` : '· max level reached'}
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-700" style={{ width: `${levelProgress}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="font-display text-2xl font-semibold">{stats?.completedCount ?? 0}</div>
              <div className="text-[11px] font-semibold text-secondary-foreground/60">completed</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="font-display text-2xl font-semibold">{stats?.badges.filter((b) => b.earned).length ?? 0}</div>
              <div className="text-[11px] font-semibold text-secondary-foreground/60">badges</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="font-display text-2xl font-semibold">{(exchanges ?? []).filter((e) => e.status !== 'completed').length}</div>
              <div className="text-[11px] font-semibold text-secondary-foreground/60">in progress</div>
            </div>
          </div>
        </div>

        {/* Badge shelf */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Badge shelf</h2>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {(stats?.badges ?? []).map((b) => {
              const Icon = BADGE_ICONS[b.key] ?? Medal
              return (
                <div
                  key={b.key}
                  title={`${b.description} (${b.progress})`}
                  className={`rounded-2xl border p-4 text-center transition ${
                    b.earned
                      ? 'border-primary/30 bg-primary/5 shadow-sm'
                      : 'border-border opacity-45 grayscale'
                  }`}
                >
                  <div className={`mx-auto grid h-11 w-11 place-items-center rounded-2xl ${b.earned ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-5.5 w-5.5" />
                  </div>
                  <div className="mt-2.5 text-sm font-bold leading-tight">{b.label}</div>
                  <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{b.earned ? b.description : `${b.progress} — ${b.description}`}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Propose */}
      <div className="mt-8">
        {!showForm ? (
          <button
            onClick={() => { setShowForm(true); setMatchId(matches[0]?.id ?? null) }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            <Plus className="h-4.5 w-4.5" /> Propose a new exchange
          </button>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-semibold">Propose a skill swap</h2>
            <p className="mt-1 text-sm text-muted-foreground">You each teach one thing. That's the deal — everybody has a talent.</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div>
                <label className="text-sm font-semibold">With</label>
                <select
                  value={matchId ?? ''}
                  onChange={(e) => setMatchId(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {matches.map((m) => {
                    const t = talentFor(m.talentId)
                    return <option key={m.id} value={m.id}>{user?.role === 'talent' ? `${m.company} — ${m.role}` : `${t?.name ?? 'Talent'} — ${m.role}`}</option>
                  })}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold">
                  {user?.role === 'talent' ? 'You teach' : 'The talent teaches'}
                </label>
                <input
                  value={talentTeaches}
                  onChange={(e) => setTalentTeaches(e.target.value)}
                  placeholder="e.g. The perfect cup of Arabic coffee"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">
                  {user?.role === 'recruiter' ? 'You teach' : 'The recruiter teaches'}
                </label>
                <input
                  value={recruiterTeaches}
                  onChange={(e) => setRecruiterTeaches(e.target.value)}
                  placeholder="e.g. How Dutch feedback culture works"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground"><Lightbulb className="h-3.5 w-3.5 text-primary" /> Ideas:</span>
              {(user?.role === 'talent' ? TALENT_IDEAS : RECRUITER_IDEAS).map((idea) => (
                <button
                  key={idea}
                  onClick={() => (user?.role === 'talent' ? setTalentTeaches(idea) : setRecruiterTeaches(idea))}
                  className="rounded-full border border-border px-3 py-1.5 text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {idea}
                </button>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => matchId && talentTeaches.trim() && recruiterTeaches.trim() && proposeMut.mutate({ matchId, talentTeaches, recruiterTeaches })}
                disabled={!matchId || !talentTeaches.trim() || !recruiterTeaches.trim() || proposeMut.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
              >
                <Send className="h-4 w-4" /> Propose exchange
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-full px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4.5 w-4.5" /> {toast}
        </div>
      )}

      {/* Exchange cards */}
      <div className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Your exchanges</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {sorted.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-14 text-center text-muted-foreground lg:col-span-2">
              No exchanges yet — propose your first skill swap above.
            </div>
          )}
          {sorted.map((ex) => {
            const t = talentFor(ex.talentId)
            const canAccept = ex.status === 'proposed' && ex.proposedBy !== user?.role
            const canComplete = ex.status === 'accepted'
            const waitingOn = ex.status === 'proposed' && ex.proposedBy === user?.role
            return (
              <div key={ex.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {t && <Avatar name={t.name} gradient={t.gradient} size="sm" />}
                    <div>
                      <div className="font-semibold">{user?.role === 'talent' ? ex.company : t?.name ?? 'Talent'}</div>
                      <div className="text-xs text-muted-foreground">{ex.matchRole}</div>
                    </div>
                  </div>
                  {ex.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" /> +100 XP earned
                    </span>
                  ) : ex.status === 'accepted' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Ready to swap
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      <Clock className="h-3.5 w-3.5" /> {waitingOn ? 'Awaiting their yes' : 'They proposed'}
                    </span>
                  )}
                </div>

                {/* The swap */}
                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
                      {t ? `${t.name.split(' ')[0]} teaches` : 'Talent teaches'}
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-snug">{ex.talentTeaches}</p>
                  </div>
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
                    <ArrowRightLeft className="h-4.5 w-4.5" />
                  </div>
                  <div className="rounded-2xl bg-accent/5 border border-accent/15 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-accent">
                      {ex.company} teaches
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-snug">{ex.recruiterTeaches}</p>
                  </div>
                </div>

                {/* Actions */}
                {(canAccept || canComplete) && (
                  <div className="mt-5 flex gap-2.5 border-t border-border pt-4">
                    {canAccept && (
                      <button
                        onClick={() => acceptMut.mutate({ id: ex.id })}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                      >
                        <Check className="h-4 w-4" /> Accept — let's do this
                      </button>
                    )}
                    {canComplete && (
                      <button
                        onClick={() => completeMut.mutate({ id: ex.id })}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        <CheckCircle2 className="h-4 w-4" /> We taught each other — complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Inspiration */}
      <div className="mt-12 rounded-3xl border border-border bg-secondary p-7 text-secondary-foreground sm:p-9">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-semibold">Need inspiration?</h2>
        </div>
        <p className="mt-2 max-w-2xl text-secondary-foreground/70">
          The best exchanges are small, personal and a little bit fun. Bring one to your next video chat or in-house visit.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...TALENT_IDEAS, ...RECRUITER_IDEAS].map((idea) => (
            <div key={idea} className="rounded-2xl bg-white/5 p-4 text-sm leading-snug text-secondary-foreground/85">
              {idea}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
