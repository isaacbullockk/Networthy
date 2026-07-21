import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  ShieldCheck, Video, CheckCircle2, ChevronRight, Clock, Send, X,
  BadgeCheck, FileSignature, Sparkles, Quote,
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/lib/auth'
import { trust } from '@/config/poolContent'
import Avatar from '@/components/Avatar'

type DirectoryItem = {
  id: number
  name: string
  role: string
  gradient: string
  skills: string[]
  tagline: string
  myAssessment: {
    id: number
    status: 'in_progress' | 'pending_approval' | 'published'
    skillsVerified: string[]
    strengths: string
    summary: string
  } | null
}

export default function AssessorHome() {
  const { user } = useAuth()
  const utils = trpc.useUtils()
  const signed = !!user?.charterSignedAt

  const { data: directory } = trpc.assessments.directory.useQuery(undefined, { enabled: signed })
  const signMut = trpc.assessments.signCharter.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  })
  const startMut = trpc.assessments.start.useMutation({
    onSuccess: () => utils.assessments.directory.invalidate(),
  })
  const submitMut = trpc.assessments.submit.useMutation({
    onSuccess: () => {
      utils.assessments.directory.invalidate()
      setOpenId(null)
    },
  })

  const [agreed, setAgreed] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const [skillsVerified, setSkillsVerified] = useState<string[]>([])
  const [strengths, setStrengths] = useState('')
  const [summary, setSummary] = useState('')

  const openForm = (t: DirectoryItem) => {
    startMut.mutate({ talentId: t.id })
    setOpenId(t.id)
    setSkillsVerified(t.myAssessment?.skillsVerified?.length ? t.myAssessment.skillsVerified : t.skills.slice(0, 3))
    setStrengths(t.myAssessment?.strengths ?? '')
    setSummary(t.myAssessment?.summary ?? '')
  }

  const pendingCount = useMemo(
    () => (directory ?? []).filter((t) => t.myAssessment?.status === 'pending_approval').length,
    [directory]
  )
  const publishedCount = useMemo(
    () => (directory ?? []).filter((t) => t.myAssessment?.status === 'published').length,
    [directory]
  )

  /* ---------- CHARTER GATE ---------- */
  if (!signed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FileSignature className="h-7 w-7" />
          </div>
          <div className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">Independent assessor</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {trust.assessorCharter.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            {trust.assessorCharter.intro}
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {trust.assessorCharter.points.map((p, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 font-display font-semibold text-primary">
                {i + 1}
              </div>
              <p className="text-[15px] leading-relaxed text-foreground/85">{p}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-primary/30 bg-primary/5 p-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5 rounded accent-[#e8632b]"
            />
            <span className="font-semibold">{trust.assessorCharter.commitment}</span>
          </label>
          <button
            onClick={() => signMut.mutate()}
            disabled={!agreed || signMut.isPending}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-40"
          >
            <ShieldCheck className="h-5 w-5" />
            {signMut.isPending ? 'Signing…' : 'Sign the charter and start assessing'}
          </button>
        </div>
      </div>
    )
  }

  /* ---------- TALENT DIRECTORY ---------- */
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">Independent assessor</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Verify the talent behind the story.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {trust.whyIndependent}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl border border-border bg-card px-5 py-3 text-center shadow-sm">
            <div className="font-display text-2xl font-semibold text-amber-600">{pendingCount}</div>
            <div className="text-xs font-semibold text-muted-foreground">awaiting talent approval</div>
          </div>
          <div className="rounded-2xl border border-border bg-card px-5 py-3 text-center shadow-sm">
            <div className="font-display text-2xl font-semibold text-emerald-600">{publishedCount}</div>
            <div className="text-xs font-semibold text-muted-foreground">published</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800">
        <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
        Charter signed — you are bound by confidentiality. Nothing a talent tells you goes to any authority.
      </div>

      <div className="mt-8 space-y-4">
        {(directory ?? []).map((t) => {
          const a = t.myAssessment
          const isOpen = openId === t.id
          return (
            <div key={t.id} className="rounded-3xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
                <Avatar name={t.name} gradient={t.gradient} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-display text-lg font-semibold">{t.name}</span>
                    {a?.status === 'published' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        <BadgeCheck className="h-3.5 w-3.5" /> Published
                      </span>
                    )}
                    {a?.status === 'pending_approval' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        <Clock className="h-3.5 w-3.5" /> Awaiting talent approval
                      </span>
                    )}
                    {a?.status === 'in_progress' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                        <Sparkles className="h-3.5 w-3.5" /> Draft in progress
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{t.role}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/call/${t.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
                  >
                    <Video className="h-4 w-4" /> Assessment call
                  </Link>
                  {a?.status !== 'pending_approval' && (
                    <button
                      onClick={() => (isOpen ? setOpenId(null) : openForm(t))}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:brightness-110"
                    >
                      {isOpen ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {isOpen ? 'Close' : a?.status === 'published' ? 'New assessment' : a ? 'Continue assessment' : 'Start assessment'}
                    </button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-5 sm:p-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <div className="text-sm font-semibold">Skills you verified in conversation</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">Untick anything you could not verify — honesty is the product.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {t.skills.map((s) => {
                          const on = skillsVerified.includes(s)
                          return (
                            <button
                              key={s}
                              onClick={() => setSkillsVerified((p) => (on ? p.filter((x) => x !== s) : [...p, s]))}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                                on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                              }`}
                            >
                              {on && <CheckCircle2 className="h-4 w-4" />} {s}
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-6">
                        <label className="text-sm font-semibold">Standout strengths</label>
                        <textarea
                          rows={3}
                          value={strengths}
                          onChange={(e) => setStrengths(e.target.value)}
                          placeholder="What did this person show you that a CV never could?"
                          className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Your assessment — written for {t.name.split(' ')[0]}, approved by {t.name.split(' ')[0]}</label>
                      <textarea
                        rows={8}
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Your honest, human assessment. What did you talk about? What convinced you? Who should meet this person and why?"
                        className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:border-primary"
                      />
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                        <Quote className="mt-0.5 h-4 w-4 shrink-0" />
                        Nothing is published without {t.name.split(' ')[0]}'s approval — they read this first and can approve or decline it.
                      </div>
                      <button
                        onClick={() => a && submitMut.mutate({ assessmentId: a.id, skillsVerified, strengths, summary })}
                        disabled={!a || skillsVerified.length === 0 || strengths.trim().length < 10 || summary.trim().length < 10 || submitMut.isPending}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-40"
                      >
                        <Send className="h-4.5 w-4.5" />
                        {submitMut.isPending ? 'Sending…' : `Send to ${t.name.split(' ')[0]} for approval`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
