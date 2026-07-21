import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router'
import {
  HeartHandshake, FileSignature, CheckCircle2, Clock, Send, Users,
  ShieldCheck, AlertTriangle, Flame, Coffee, ChevronRight, Sparkles,
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/lib/auth'
import Avatar from '@/components/Avatar'

const POINTS = [7, 30, 60, 90] as const

const QUESTIONS = {
  talent: [
    { key: 'expectations', q: 'I know exactly what is expected of me' },
    { key: 'belonging', q: 'I feel I belong here' },
    { key: 'momentum', q: 'I want to come back on Monday' },
  ],
  recruiter: [
    { key: 'expectations', q: 'Expectations are being met' },
    { key: 'belonging', q: 'They are connecting with the team' },
    { key: 'momentum', q: 'I would make this hire again' },
  ],
} as const

type Pulse = {
  dayPoint: number
  respondent: 'talent' | 'recruiter'
  expectations: number
  belonging: number
  momentum: number
  note: string | null
}

const avg = (p: Pulse) => (p.expectations + p.belonging + p.momentum) / 3

function pointHealth(talentP?: Pulse, recruiterP?: Pulse) {
  if (!talentP && !recruiterP) return { status: 'none' as const }
  if (!talentP || !recruiterP) return { status: 'waiting' as const }
  const t = avg(talentP)
  const r = avg(recruiterP)
  if (t <= 2.5 || r <= 2.5) return { status: 'risk' as const }
  if (Math.abs(t - r) >= 2) return { status: 'gap' as const }
  return { status: 'strong' as const }
}

function Scale({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-full border-2 font-bold transition ${
            value >= n ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/50'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export default function Retention() {
  const { matchId } = useParams()
  const id = Number(matchId)
  const { user } = useAuth()
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.retention.forMatch.useQuery({ matchId: id }, { enabled: Number.isFinite(id) })
  const { data: alumni } = trpc.retention.alumni.useQuery(undefined, { enabled: user?.role === 'recruiter' })

  const saveContractMut = trpc.retention.saveContract.useMutation({ onSuccess: () => utils.retention.forMatch.invalidate({ matchId: id }) })
  const confirmMut = trpc.retention.confirmContract.useMutation({ onSuccess: () => utils.retention.forMatch.invalidate({ matchId: id }) })
  const pulseMut = trpc.retention.submitPulse.useMutation({ onSuccess: () => utils.retention.forMatch.invalidate({ matchId: id }) })
  const buddyMut = trpc.retention.assignBuddy.useMutation({ onSuccess: () => utils.retention.forMatch.invalidate({ matchId: id }) })

  const [exp, setExp] = useState('')
  const [com, setCom] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [scores, setScores] = useState({ expectations: 0, belonging: 0, momentum: 0 })
  const [note, setNote] = useState('')
  const [buddyId, setBuddyId] = useState<number | null>(null)

  const contractPrefill = useMemo(() => {
    if (!data?.match || !data?.talent) return { expectations: '', commitments: '' }
    return {
      expectations: `What ${data.talent.name.split(' ')[0]} can expect: real work as ${data.match.role} at ${data.match.company} — no fake tasks, no tokenism. A named go-to person on the team. Honest feedback, given kindly. The unwritten rules explained, not assumed.`,
      commitments: `What both sides commit to: a 15-minute expectation check every week for the first 90 days. Feedback within 48 hours when something is unclear — on both sides. ${data.talent.name.split(' ')[0]} asks when unsure; we answer without judgment. We revisit this contract at every pulse check-in.`,
    }
  }, [data])

  if (isLoading || !data) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-muted-foreground">Loading the journey…</div>
  }

  const { match, talent, contract, pulses, buddy, side, day, duePoint } = data
  if (!talent) return null
  const firstName = talent.name.split(' ')[0]
  const dayClamped = Math.min(day ?? 0, 90)
  const isRecruiter = side === 'recruiter'
  const contractActive = !!(contract?.talentConfirmedAt && contract?.recruiterConfirmedAt)
  const questions = QUESTIONS[side]

  const statusMeta = {
    strong: { icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Strong' },
    gap: { icon: Coffee, cls: 'text-amber-600', bg: 'bg-amber-100', label: 'Expectations gap — time for a coffee' },
    risk: { icon: AlertTriangle, cls: 'text-red-600', bg: 'bg-red-100', label: 'At risk — act now' },
    waiting: { icon: Clock, cls: 'text-sky-600', bg: 'bg-sky-100', label: 'Waiting for the other side' },
    none: { icon: Clock, cls: 'text-muted-foreground', bg: 'bg-muted', label: '' },
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      {/* JOURNEY HEADER */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={talent.name} gradient={talent.gradient} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">
              <HeartHandshake className="mr-1 inline h-4 w-4" /> Retention mode
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {firstName}'s first 90 days at {match.company}
            </h1>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {match.role} · hired {match.hiredAt ? new Date(match.hiredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : ''}
              {match.stage === 'retained' && ' · retained — journey complete'}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-4xl font-semibold text-primary">{dayClamped}</div>
            <div className="text-xs font-semibold text-muted-foreground">of 90 days</div>
          </div>
        </div>
        <div className="relative mt-6">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${Math.min(100, (dayClamped / 90) * 100)}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs font-semibold text-muted-foreground">
            {POINTS.map((p) => (
              <span key={p} className={(day ?? 0) >= p ? 'text-primary' : ''}>Day {p}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* CONNECTION CONTRACT */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <FileSignature className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">The connection contract</h2>
            {contractActive && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Explicit expectations, confirmed by both sides. Most early exits are expectation debt coming due — this makes it visible while it's cheap.
          </p>

          {!contract && isRecruiter && !drafting && (
            <button
              onClick={() => { setDrafting(true); setExp(contractPrefill.expectations); setCom(contractPrefill.commitments) }}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              <FileSignature className="h-4 w-4" /> Draft the contract
            </button>
          )}

          {!contract && !isRecruiter && (
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
              <Clock className="h-4.5 w-4.5 shrink-0" /> {match.company} is drafting your contract — you'll confirm it here.
            </div>
          )}

          {drafting && isRecruiter && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold">What {firstName} can expect</label>
                <textarea rows={4} value={exp} onChange={(e) => setExp(e.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-sm font-semibold">What both sides commit to</label>
                <textarea rows={4} value={com} onChange={(e) => setCom(e.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:border-primary" />
              </div>
              <button
                onClick={() => saveContractMut.mutate({ matchId: id, expectations: exp, commitments: com }, { onSuccess: () => setDrafting(false) })}
                disabled={exp.trim().length < 10 || com.trim().length < 10 || saveContractMut.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
              >
                <Send className="h-4 w-4" /> {saveContractMut.isPending ? 'Saving…' : `Confirm & send to ${firstName}`}
              </button>
            </div>
          )}

          {contract && !drafting && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-muted/50 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What {firstName} can expect</div>
                <p className="mt-1 text-sm leading-relaxed">{contract.expectations}</p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What both sides commit to</div>
                <p className="mt-1 text-sm leading-relaxed">{contract.commitments}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${contract.recruiterConfirmedAt ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> {match.company} confirmed
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${contract.talentConfirmedAt ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {contract.talentConfirmedAt ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />} {firstName} {contract.talentConfirmedAt ? 'confirmed' : 'reviewing'}
                </span>
              </div>
              {side === 'talent' && !contract.talentConfirmedAt && (
                <button
                  onClick={() => confirmMut.mutate({ matchId: id })}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  <CheckCircle2 className="h-4 w-4" /> This is what we agreed — I confirm
                </button>
              )}
              {isRecruiter && !contractActive && (
                <button onClick={() => { setDrafting(true); setExp(contract.expectations); setCom(contract.commitments) }} className="text-sm font-semibold text-primary hover:underline">
                  Edit & re-send
                </button>
              )}
            </div>
          )}
        </div>

        {/* PULSE CHECK-IN */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <Flame className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Pulse check-in</h2>
          </div>

          {duePoint != null ? (
            <div className="mt-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Day {duePoint} check-in is due
              </div>
              <div className="mt-4 space-y-5">
                {questions.map((q) => (
                  <div key={q.key}>
                    <div className="mb-2 text-sm font-medium">{q.q}</div>
                    <Scale value={scores[q.key as keyof typeof scores]} onChange={(v) => setScores((s) => ({ ...s, [q.key]: v }))} />
                  </div>
                ))}
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything to note for yourself (private — only you see this)"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={() => pulseMut.mutate({ matchId: id, dayPoint: duePoint, ...scores, note: note || undefined })}
                  disabled={Object.values(scores).some((v) => v === 0) || pulseMut.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-40"
                >
                  <Send className="h-4.5 w-4.5" /> {pulseMut.isPending ? 'Sending…' : 'Submit check-in'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              {match.stage === 'retained'
                ? 'Journey complete — all check-ins done. This hire stayed.'
                : `You're all checked in. Next pulse at day ${POINTS.find((p) => (day ?? 0) < p) ?? 90}.`}
            </div>
          )}

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Pulses produce signals, not surveillance: {isRecruiter ? firstName : match.company} sees connection health, never your raw answers.
          </div>
        </div>
      </div>

      {/* CONNECTION HEALTH TIMELINE */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
        <h2 className="font-display text-xl font-semibold">Connection health</h2>
        <p className="mt-1 text-sm text-muted-foreground">Both sides check in at every milestone — the gap between the two is what matters.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {POINTS.map((p) => {
            const talentP = pulses.find((x) => x.dayPoint === p && x.respondent === 'talent')
            const recruiterP = pulses.find((x) => x.dayPoint === p && x.respondent === 'recruiter')
            const h = pointHealth(talentP, recruiterP)
            const meta = statusMeta[h.status]
            const open = (day ?? 0) >= p
            return (
              <div key={p} className={`rounded-2xl border p-4 ${open ? 'border-border' : 'border-dashed border-border/60 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Day {p}</span>
                  <span className={`grid h-8 w-8 place-items-center rounded-full ${open ? meta.bg : 'bg-muted'}`}>
                    <meta.icon className={`h-4.5 w-4.5 ${open ? meta.cls : 'text-muted-foreground'}`} />
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold">
                  {!open ? 'Upcoming' : h.status === 'none' ? 'No check-ins yet' : meta.label}
                </div>
                <div className="mt-1 flex gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span className={talentP ? 'text-emerald-700' : ''}>{firstName.split(' ')[0]} {talentP ? '✓' : '—'}</span>
                  <span>·</span>
                  <span className={recruiterP ? 'text-emerald-700' : ''}>{match.company} {recruiterP ? '✓' : '—'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* BUDDY */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Alumni buddy</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Someone who walked this path and stayed — for the questions {firstName} won't ask the boss.
        </p>
        {buddy ? (
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <Avatar name={buddy.name} gradient={buddy.gradient} />
            <div>
              <div className="font-semibold text-emerald-900">{buddy.name}</div>
              <div className="text-sm text-emerald-700">{buddy.role} — retained, 90+ days and counting</div>
            </div>
            <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />
          </div>
        ) : isRecruiter ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={buddyId ?? ''}
              onChange={(e) => setBuddyId(Number(e.target.value) || null)}
              className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="">Choose an alumnus…</option>
              {(alumni ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {a.role}</option>
              ))}
            </select>
            <button
              onClick={() => buddyId && buddyMut.mutate({ matchId: id, buddyTalentId: buddyId })}
              disabled={!buddyId || buddyMut.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
            >
              <Users className="h-4 w-4" /> Assign buddy
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
            <Clock className="h-4.5 w-4.5 shrink-0" /> {match.company} is pairing you with a buddy.
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-muted-foreground">
        <Link to={isRecruiter ? '/dashboard' : '/portal'} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back
        </Link>
      </div>
    </div>
  )
}
