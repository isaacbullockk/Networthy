import { useState } from 'react'
import { Link } from 'react-router'
import { Plus, ChevronDown, ChevronUp, Trash2, CheckCircle2, AlertCircle, Briefcase, EyeOff } from 'lucide-react'
import { trpc } from '@/providers/trpc'

const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

export default function Vacancies() {
  const utils = trpc.useUtils()
  const { data: vacancyList } = trpc.vacancies.list.useQuery()
  const [openId, setOpenId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [required, setRequired] = useState('')
  const [nice, setNice] = useState('')
  const [languages, setLanguages] = useState('')
  const [availability, setAvailability] = useState('')
  const [paste, setPaste] = useState('')

  const parse = trpc.vacancies.parse.useMutation({
    onSuccess: (draft) => {
      if (draft.title) setTitle(draft.title)
      if (draft.requiredSkills.length) setRequired(draft.requiredSkills.join(', '))
      if (draft.languages.length) setLanguages(draft.languages.join(', '))
      if (draft.availability) setAvailability(draft.availability)
    },
  })

  const create = trpc.vacancies.create.useMutation({
    onSuccess: async () => {
      await utils.vacancies.list.invalidate()
      setShowForm(false)
      setTitle(''); setRequired(''); setNice(''); setLanguages(''); setAvailability('')
    },
  })
  const remove = trpc.vacancies.remove.useMutation({
    onSuccess: () => utils.vacancies.list.invalidate(),
  })

  const inputCls =
    'w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-primary">Matching engine</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Your vacancies</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            State what a role truly needs — the engine ranks talents on skills (verified weigh heavier),
            languages and availability, and shows you exactly why. Identity never influences the score.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> New vacancy
        </button>
      </div>

      {showForm && (
        <form
          className="mt-8 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({
              title,
              requiredSkills: splitList(required),
              niceSkills: splitList(nice),
              languages: splitList(languages),
              availability,
            })
          }}
        >
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
            <label className="text-sm font-semibold">Fastest way: paste the job description</label>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={4}
              placeholder="Paste the vacancy text (EN/NL/AR) — we'll extract skills, languages and availability. You check and adjust before anything is saved."
              className={`mt-1.5 ${inputCls}`}
            />
            <button
              type="button"
              disabled={paste.trim().length < 10 || parse.isPending}
              onClick={() => parse.mutate({ text: paste })}
              className="mt-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
            >
              {parse.isPending ? 'Reading…' : 'Fill the form from this text'}
            </button>
            {parse.isSuccess && (
              <p className="mt-2 text-xs text-muted-foreground">
                Draft filled in below — nothing is saved until you click Create.
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold">Role title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Kitchen chef" className={`mt-1.5 ${inputCls}`} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Required skills <span className="font-normal text-muted-foreground">(comma-separated)</span></label>
              <input value={required} onChange={(e) => setRequired(e.target.value)} required placeholder="e.g. HACCP, cooking" className={`mt-1.5 ${inputCls}`} />
            </div>
            <div>
              <label className="text-sm font-semibold">Nice to have</label>
              <input value={nice} onChange={(e) => setNice(e.target.value)} placeholder="e.g. leadership, English" className={`mt-1.5 ${inputCls}`} />
            </div>
            <div>
              <label className="text-sm font-semibold">Languages needed</label>
              <input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="e.g. Dutch, English" className={`mt-1.5 ${inputCls}`} />
            </div>
            <div>
              <label className="text-sm font-semibold">Availability</label>
              <input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. full-time, 32-40 hours" className={`mt-1.5 ${inputCls}`} />
            </div>
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {create.isPending ? 'Saving…' : 'Save vacancy & rank talents'}
          </button>
        </form>
      )}

      <div className="mt-8 space-y-4">
        {(vacancyList ?? []).map((v) => (
          <VacancyCard
            key={v.id}
            vacancy={v}
            open={openId === v.id}
            onToggle={() => setOpenId(openId === v.id ? null : v.id)}
            onRemove={() => remove.mutate({ id: v.id })}
          />
        ))}
        {vacancyList?.length === 0 && !showForm && (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <Briefcase className="mx-auto h-8 w-8" />
            <p className="mt-3">No vacancies yet — create one and the engine ranks the pool instantly.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function VacancyCard({
  vacancy: v,
  open,
  onToggle,
  onRemove,
}: {
  vacancy: { id: number; title: string; requiredSkills: string[]; niceSkills: string[]; languages: string[]; availability: string; status: string }
  open: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="font-display text-lg font-semibold">{v.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {v.requiredSkills.length} required skills · {v.niceSkills.length} nice to have
            {v.languages.length > 0 && ` · ${v.languages.join(', ')}`}
            {v.availability && ` · ${v.availability}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRemove} className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-red-600" title="Delete vacancy">
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {open ? 'Hide ranking' : 'Rank talents'}
          </button>
        </div>
      </div>
      {open && <RankedMatches vacancyId={v.id} />}
    </div>
  )
}

function RankedMatches({ vacancyId }: { vacancyId: number }) {
  const { data, isLoading } = trpc.vacancies.match.useQuery({ vacancyId })
  if (isLoading) return <div className="border-t border-border p-6 text-sm text-muted-foreground">Ranking talents…</div>
  if (!data || data.length === 0) return <div className="border-t border-border p-6 text-sm text-muted-foreground">No talents in the pool yet.</div>
  return (
    <div className="border-t border-border">
      {data.map(({ talent, result }) => (
        <div key={talent.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5 last:border-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-semibold">
              {talent.anonymized ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground"><EyeOff className="h-4 w-4" /> Talent #{1000 + talent.id}</span>
              ) : (
                talent.name
              )}
              <span className="text-sm font-medium text-primary">{talent.role}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>skills {result.breakdown.skills}/70+</span>
              <span>languages {result.breakdown.languages}/15</span>
              <span>availability {result.breakdown.availability}/15</span>
              {result.breakdown.semantic != null && <span>semantic {result.breakdown.semantic}/20</span>}
            </div>
            <ul className="mt-2 space-y-1">
              {[...result.reasons].sort((a, b) => Number(b.startsWith('missing')) - Number(a.startsWith('missing'))).slice(0, 5).map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  {r.startsWith('missing') || r.startsWith('no required') ? (
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  )}
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 font-display text-xl font-bold text-primary">
              {result.score}
            </div>
            <Link
              to={`/talent/${talent.id}`}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
            >
              View profile
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
