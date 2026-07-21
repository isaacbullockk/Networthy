import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Plus, Trash2, Send, Save, ClipboardList, AlignLeft, ListChecks,
  SlidersHorizontal, ChevronRight, Inbox, Clock, CheckCircle2, MessageSquareText,
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useApp } from '@/context/AppContext'
import { stageIndex } from '@/types'
import Avatar from '@/components/Avatar'

type DraftQuestion = { id: string; type: 'text' | 'choice' | 'scale'; prompt: string; options?: string[] }

const Q_TYPES = [
  { key: 'text', label: 'Open answer', icon: AlignLeft },
  { key: 'choice', label: 'Multiple choice', icon: ListChecks },
  { key: 'scale', label: 'Scale 1–5', icon: SlidersHorizontal },
] as const

export default function Questionnaires() {
  const [params] = useSearchParams()
  const preTalent = Number(params.get('talent')) || null
  const { questionnaires, createQuestionnaire, matches, updateMatch } = useApp()
  const { data: talents } = trpc.talents.list.useQuery()

  const [tab, setTab] = useState<'build' | 'responses'>('build')
  const [talentId, setTalentId] = useState<number>(preTalent ?? 1)
  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ id: 'q-new-1', type: 'text', prompt: '' }])
  const [savedMsg, setSavedMsg] = useState('')

  const talent = (talents ?? []).find((t) => t.id === talentId) ?? talents?.[0]

  const addQuestion = (type: DraftQuestion['type']) => {
    setQuestions((p) => [...p, { id: `q-new-${Date.now()}`, type, prompt: '', options: type === 'choice' ? ['', ''] : undefined }])
  }

  const updateQuestion = (id: string, patch: Partial<DraftQuestion>) =>
    setQuestions((p) => p.map((q) => (q.id === id ? { ...q, ...patch } : q)))

  const validQuestions = questions.filter((q) => q.prompt.trim())

  const build = (status: 'draft' | 'sent') => {
    if (!talent) return
    createQuestionnaire({
      talentId: talent.id,
      title: title.trim() || `Questions for ${talent.name.split(' ')[0]}`,
      purpose: purpose.trim() || 'Getting to know each other before the in-house visit',
      questions: validQuestions.map((q) => ({ ...q, options: q.type === 'choice' ? q.options?.filter((o) => o.trim()) : undefined })),
      status,
    })
    if (status === 'sent') {
      const m = matches.find((mm) => mm.talentId === talent.id)
      if (m && stageIndex(m.stage) < stageIndex('questionnaire')) {
        updateMatch(m.id, { stage: 'questionnaire' })
      }
    }
    setSavedMsg(status === 'sent' ? `Questionnaire sent to ${talent.name}!` : 'Draft saved.')
    setQuestions([{ id: `q-new-${Date.now()}`, type: 'text', prompt: '' }])
    setTitle('')
    setPurpose('')
    setTimeout(() => setSavedMsg(''), 4000)
    if (status === 'sent') setTab('responses')
  }

  const statusChip = (s: string) =>
    s === 'completed' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Completed</span>
    ) : s === 'sent' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"><Clock className="h-3 w-3" /> Awaiting answers</span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Draft</span>
    )

  const responseList = useMemo(() => questionnaires.filter((q) => q.status !== 'draft'), [questionnaires])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="max-w-2xl">
        <div className="text-xs font-bold uppercase tracking-widest text-primary">Questionnaires</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Ask what a CV never tells you.
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Compose your own questions after the video chat. Talents answer in their own words and time —
          so the in-house visit starts as a second conversation, not a first interview.
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-2">
        {[
          { key: 'build', label: 'Build & send', icon: ClipboardList },
          { key: 'responses', label: `Responses (${responseList.length})`, icon: Inbox },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'build' | 'responses')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              tab === t.key ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'build' ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Builder */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">Send to</label>
                <select
                  value={talentId}
                  onChange={(e) => setTalentId(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {(talents ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.name} — {t.role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={talent ? `Questions for ${talent.name.split(' ')[0]}` : ''}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-semibold">Purpose (visible to the talent)</label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Prepare your visit with our frontend team"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Questions */}
            <div className="mt-6 space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-2 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <input
                        value={q.prompt}
                        onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                        placeholder={
                          q.type === 'text'
                            ? 'Ask an open question…'
                            : q.type === 'choice'
                              ? 'Ask a question with fixed options…'
                              : 'Ask something to rate from 1 to 5…'
                        }
                        className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                      />
                      {q.type === 'choice' && (
                        <div className="mt-2.5 space-y-2">
                          {q.options?.map((opt, i) => (
                            <input
                              key={i}
                              value={opt}
                              onChange={(e) => {
                                const next = [...(q.options ?? [])]
                                next[i] = e.target.value
                                updateQuestion(q.id, { options: next })
                              }}
                              placeholder={`Option ${i + 1}`}
                              className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary"
                            />
                          ))}
                          <button
                            onClick={() => updateQuestion(q.id, { options: [...(q.options ?? []), ''] })}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            + Add option
                          </button>
                        </div>
                      )}
                      {q.type === 'scale' && (
                        <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} className="grid h-8 w-8 place-items-center rounded-full border border-border font-semibold">{n}</span>
                          ))}
                          <span className="ml-1">1 = low · 5 = high</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        {Q_TYPES.find((t) => t.key === q.type)?.label}
                      </span>
                      {questions.length > 1 && (
                        <button
                          onClick={() => setQuestions((p) => p.filter((x) => x.id !== q.id))}
                          className="text-muted-foreground transition hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add question */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><Plus className="h-4 w-4" /> Add question:</span>
              {Q_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => addQuestion(t.key)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <button
                onClick={() => build('sent')}
                disabled={validQuestions.length === 0 || !talent}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" /> Send to {talent?.name.split(' ')[0]}
              </button>
              <button
                onClick={() => build('draft')}
                disabled={validQuestions.length === 0 || !talent}
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> Save draft
              </button>
              {savedMsg && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> {savedMsg}
                </span>
              )}
            </div>
          </div>

          {/* Preview sidebar */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-border bg-secondary p-6 text-secondary-foreground shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-secondary-foreground/60">Talent preview</div>
              {talent && (
                <div className="mt-4 flex items-center gap-3">
                  <Avatar name={talent.name} gradient={talent.gradient} size="sm" />
                  <div>
                    <div className="font-semibold">{title.trim() || `Questions for ${talent.name.split(' ')[0]}`}</div>
                    <div className="text-xs text-secondary-foreground/60">{purpose.trim() || 'Getting to know each other'}</div>
                  </div>
                </div>
              )}
              <div className="mt-4 space-y-2">
                {validQuestions.length === 0 && <p className="text-sm text-secondary-foreground/50">Your questions will appear here…</p>}
                {validQuestions.map((q, i) => (
                  <div key={q.id} className="rounded-xl bg-white/10 p-3 text-sm">
                    <span className="font-semibold text-primary">{i + 1}. </span>
                    {q.prompt}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 font-display text-lg font-semibold">
                <MessageSquareText className="h-5 w-5 text-primary" /> Why before the visit?
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Questionnaires let talents shine in writing — no time pressure, no interview nerves.
                You walk into the in-house visit already knowing their motivations, working style
                and expectations. That is how a first meeting becomes a second conversation.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* RESPONSES */
        <div className="mt-6 space-y-5">
          {responseList.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-16 text-center text-muted-foreground">
              No questionnaires sent yet. Build your first one!
            </div>
          )}
          {responseList.map((q) => {
            const t = (talents ?? []).find((x) => x.id === q.talentId)
            if (!t) return null
            return (
              <div key={q.id} className="rounded-3xl border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 sm:px-7">
                  <div className="flex items-center gap-3.5">
                    <Avatar name={t.name} gradient={t.gradient} size="sm" />
                    <div>
                      <div className="font-display text-lg font-semibold">{q.title}</div>
                      <div className="text-sm text-muted-foreground">{q.purpose} · sent {q.sentAt}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusChip(q.status)}
                    <Link to={`/talent/${t.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                      Profile <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <div className="p-5 sm:px-7">
                  {q.status === 'completed' && q.answers ? (
                    <div className="space-y-4">
                      {q.questions.map((question, i) => (
                        <div key={question.id} className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                          <div className="text-sm">
                            <span className="font-semibold text-primary">{i + 1}. </span>
                            <span className="font-medium">{question.prompt}</span>
                          </div>
                          <div className="rounded-xl bg-muted/60 p-3.5 text-sm leading-relaxed text-foreground/85">
                            {q.answers?.[question.id] ?? '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Waiting for {t.name.split(' ')[0]}'s answers — NetWorthy notifies you when they come in.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
