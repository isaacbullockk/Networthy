import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Info } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import TalentCard from '@/components/TalentCard'
import { discover } from '@/config/poolContent'

const SKILL_FILTERS = ['Engineering', 'Hospitality', 'Finance', 'Logistics', 'Design', 'People', 'Technical']
const TRAIT_FILTERS = ['Resilient', 'Team leader', 'Empathic', 'Planner', 'Reliable', 'Mentor', 'Hands-on']

const SKILL_MAP: Record<string, string[]> = {
  Engineering: ['Software Developer', 'Data Engineer'],
  Hospitality: ['Chef & Kitchen Lead'],
  Finance: ['Financial Analyst'],
  Logistics: ['Logistics Coordinator'],
  Design: ['UX Designer'],
  People: ['HR & People Advisor'],
  Technical: ['Mechatronics Technician'],
}

export default function Discover() {
  const [query, setQuery] = useState('')
  const [skillFilter, setSkillFilter] = useState<string | null>(null)
  const [traitFilter, setTraitFilter] = useState<string | null>(null)
  const { data: talents, isLoading } = trpc.talents.list.useQuery()

  const results = useMemo(() => {
    let list = [...(talents ?? [])].sort((a, b) => b.matchScore - a.matchScore)
    if (skillFilter) list = list.filter((t) => SKILL_MAP[skillFilter]?.includes(t.role))
    if (traitFilter) list = list.filter((t) => t.traits.some((tr) => tr.toLowerCase().includes(traitFilter.toLowerCase())))
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.role.toLowerCase().includes(q) ||
          t.origin.toLowerCase().includes(q) ||
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
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 text-primary" />
          <span><strong className="text-foreground">{results.length}</strong> talents match your roles</span>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, skill, role, or background…"
              className="w-full rounded-2xl border border-input bg-background py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
