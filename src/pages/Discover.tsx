import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Info, EyeOff, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/lib/auth'
import { Switch } from '@/components/ui/switch'
import TalentCard from '@/components/TalentCard'
import { discover } from '@/config/poolContent'
import { EMAIL_VERIFICATION_REQUIRED } from '@contracts/errors'

const SKILL_FILTERS = ['Engineering', 'Hospitality', 'Finance', 'Logistics', 'Design', 'People', 'Technical']
const TRAIT_FILTERS = ['Resilient', 'Team leader', 'Empathic', 'Planner', 'Reliable', 'Mentor', 'Hands-on']

export default function Discover() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [skillFilter, setSkillFilter] = useState<string | null>(null)
  const [traitFilter, setTraitFilter] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const [hiringFor, setHiringFor] = useState('')
  const wantedSkills = useMemo(
    () => hiringFor.split(',').map((s) => s.trim()).filter(Boolean),
    [hiringFor]
  )
  const { data: talents, isLoading, error } = trpc.talents.list.useQuery(
    wantedSkills.length > 0 ? { skills: wantedSkills } : undefined
  )
  const resendVerify = trpc.auth.resendVerification.useMutation()
  const needsVerification = error?.message === EMAIL_VERIFICATION_REQUIRED
  const setAnon = trpc.auth.setAnonymousBrowsing.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.talents.list.invalidate(), utils.auth.me.invalidate()])
    },
  })
  const anonOn = user?.anonymousBrowsing === true

  const results = useMemo(() => {
    // Sort by computed skills score when the recruiter stated what they need;
    // otherwise by verified-skill count. Never by a stored static number.
    let list = [...(talents ?? [])].sort((a, b) => {
      if (a.matchScore !== null || b.matchScore !== null) {
        return (b.matchScore ?? -1) - (a.matchScore ?? -1) || b.verifiedCount - a.verifiedCount
      }
      return b.verifiedCount - a.verifiedCount
    })
    if (skillFilter) {
      const f = skillFilter.toLowerCase()
      list = list.filter((t) =>
        t.role.toLowerCase().includes(f) || t.skills.some((s) => s.toLowerCase().includes(f))
      )
    }
    if (traitFilter) list = list.filter((t) => t.traits.some((tr) => tr.toLowerCase().includes(traitFilter.toLowerCase())))
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.role.toLowerCase().includes(q) ||
          t.skills.some((s) => s.toLowerCase().includes(q)) ||
          t.traits.some((tr) => tr.toLowerCase().includes(q))
      )
    }
    return list
  }, [talents, query, skillFilter, traitFilter])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">{discover.eyebrow}</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {discover.heading}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {discover.sub}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 text-primary" />
            <span><strong className="text-foreground">{results.length}</strong> {wantedSkills.length > 0 ? 'talents, scored on your skills' : 'talents in the pool'}</span>
          </div>
          {/* Skills-first browsing: identity stays hidden until a match — the
              decision to connect happens on capability, not on a name or photo. */}
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
              anonOn ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
            }`}
            title={user?.isGuest ? t('guest.banner') : undefined}
          >
            <EyeOff className={`h-4.5 w-4.5 shrink-0 ${anonOn ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">{t('anon.toggle')}</div>
              <div className="mt-0.5 max-w-xs text-xs leading-snug text-muted-foreground">
                {anonOn ? t('anon.onDesc') : t('anon.offDesc')}
              </div>
            </div>
            <Switch
              checked={anonOn}
              disabled={setAnon.isPending || user?.isGuest === true}
              onCheckedChange={(enabled) => setAnon.mutate({ enabled })}
              aria-label={t('anon.toggle')}
              className="ms-auto shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Email verification gate */}
      {needsVerification && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-amber-300 bg-amber-50 p-6 text-center">
          <p className="font-semibold text-amber-900">{t('auth.verifyGateTitle')}</p>
          <p className="max-w-md text-sm text-amber-800">{t('auth.verifyGateBody')}</p>
          <button
            onClick={() => resendVerify.mutate()}
            disabled={resendVerify.isPending || resendVerify.isSuccess}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {resendVerify.isSuccess ? t('auth.verifyResent') : t('auth.verifyResend')}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by skill, role, or trait…"
              className="w-full rounded-2xl border border-input bg-background py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="relative flex-1">
            <ShieldCheck className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-primary" />
            <input
              value={hiringFor}
              onChange={(e) => setHiringFor(e.target.value)}
              placeholder="Skills you're hiring for, comma-separated — e.g. React, HACCP, bookkeeping"
              className="w-full rounded-2xl border border-primary/40 bg-background py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-medium">Filter by what matters to you</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {SKILL_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSkillFilter(skillFilter === s ? null : s)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                skillFilter === s
                  ? 'border-secondary bg-secondary text-secondary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-secondary/50 hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
          <span className="mx-1 hidden w-px bg-border sm:block" />
          {TRAIT_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTraitFilter(traitFilter === t ? null : t)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                traitFilter === t
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {wantedSkills.length > 0 && (
          <p className="mt-3 text-xs leading-snug text-muted-foreground">
            Score = share of your wanted skills the talent has — assessor-verified skills weigh heavier. Without your input no score is shown.
          </p>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="mt-16 text-center text-muted-foreground">Loading talents…</div>
      ) : results.length > 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {results.map((t) => (
            <TalentCard key={t.id} talent={t} />
          ))}
        </div>
      ) : (
        <div className="mt-16 text-center">
          <p className="font-display text-2xl">No talents match those filters yet.</p>
          <p className="mt-2 text-muted-foreground">Try removing a filter — connection beats filtering anyway.</p>
          <button
            onClick={() => { setQuery(''); setSkillFilter(null); setTraitFilter(null) }}
            className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
