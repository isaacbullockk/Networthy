import { useState } from 'react'
import { ClipboardList, Send, CheckCircle2, Clock, Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '@/context/AppContext'

export default function PortalQuestionnaires() {
  const { t } = useTranslation()
  const { questionnaires, submitAnswers, matches } = useApp()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [justSent, setJustSent] = useState<number | null>(null)

  const companyFor = (recruiterId: number) =>
    matches.find((m) => m.recruiterId === recruiterId)?.company ?? 'A company'

  const setAnswer = (qid: string, val: string) => setDrafts((p) => ({ ...p, [qid]: val }))

  const submit = (questId: number, questions: { id: string }[]) => {
    const answers: Record<string, string> = {}
    for (const qu of questions) {
      answers[qu.id] = drafts[`${questId}:${qu.id}`] ?? ''
    }
    submitAnswers(questId, answers)
    setJustSent(questId)
    setTimeout(() => setJustSent(null), 4000)
  }

  const sorted = [...questionnaires]
    .filter((q) => q.status !== 'draft')
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'sent' ? -1 : 1))

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="text-xs font-bold uppercase tracking-widest text-primary">{t('portal.quest.title')}</div>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Your words, your pace.
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Recruiters ask these questions before meeting you in-house. No time pressure, no interview
        nerves — just honest answers that let them prepare a visit worth your time.
      </p>

      <div className="mt-10 space-y-6">
        {sorted.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-16 text-center text-muted-foreground">
            No questionnaires yet. After a good video chat, a recruiter may send you one.
          </div>
        )}
        {sorted.map((q) => {
          const done = q.status === 'completed'
          const answeredCount = q.questions.filter((qu) => (drafts[`${q.id}:${qu.id}`] ?? '').trim()).length
          return (
            <div key={q.id} className="rounded-3xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-lg font-semibold">{q.title}</div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" /> {companyFor(q.recruiterId)} · {q.purpose}
                    </div>
                  </div>
                </div>
                {done ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Answered
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    <Clock className="h-3.5 w-3.5" /> {answeredCount}/{q.questions.length} answered
                  </span>
                )}
              </div>

              <div className="space-y-5 p-5 sm:p-7">
                {q.questions.map((qu, i) => (
                  <div key={qu.id}>
                    <div className="text-sm font-semibold">
                      <span className="text-primary">{i + 1}. </span>{qu.prompt}
                    </div>
                    {done ? (
                      <div className="mt-2 rounded-xl bg-muted/60 p-3.5 text-sm leading-relaxed text-foreground/85">
                        {q.answers?.[qu.id] ?? '—'}
                      </div>
                    ) : qu.type === 'text' ? (
                      <textarea
                        rows={3}
                        value={drafts[`${q.id}:${qu.id}`] ?? ''}
                        onChange={(e) => setAnswer(`${q.id}:${qu.id}`, e.target.value)}
                        placeholder={t('portal.quest.answerPh')}
                        className="mt-2 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                      />
                    ) : qu.type === 'choice' ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {qu.options?.map((opt) => {
                          const selected = drafts[`${q.id}:${qu.id}`] === opt
                          return (
                            <button
                              key={opt}
                              onClick={() => setAnswer(`${q.id}:${qu.id}`, opt)}
                              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                selected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                              }`}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const selected = drafts[`${q.id}:${qu.id}`] === String(n)
                          return (
                            <button
                              key={n}
                              onClick={() => setAnswer(`${q.id}:${qu.id}`, String(n))}
                              className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-bold transition ${
                                selected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                              }`}
                            >
                              {n}
                            </button>
                          )
                        })}
                        <span className="ml-2 text-xs text-muted-foreground">{t('portal.quest.scaleHint')}</span>
                      </div>
                    )}
                  </div>
                ))}

                {!done && (
                  <div className="flex items-center gap-3 border-t border-border pt-5">
                    <button
                      onClick={() => submit(q.id, q.questions)}
                      disabled={answeredCount < q.questions.length}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" /> Send my answers
                    </button>
                    {answeredCount < q.questions.length && (
                      <span className="text-sm text-muted-foreground">{t('portal.quest.sendHint')}</span>
                    )}
                    {justSent === q.id && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Answers sent — nicely done!
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
