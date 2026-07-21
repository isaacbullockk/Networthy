import { Link, useParams } from 'react-router'
import {
  ArrowLeft, Video, ClipboardList, Building2, Play, MapPin, Languages,
  Clock, Sparkles, Quote, CheckCircle2, ShieldCheck, BadgeCheck,
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import Avatar from '@/components/Avatar'
import { trust } from '@/config/poolContent'

export default function TalentProfile() {
  const { id } = useParams()
  const talentId = Number(id)
  const { data: talent, isLoading } = trpc.talents.byId.useQuery(
    { id: talentId },
    { enabled: Number.isFinite(talentId) }
  )
  const { data: videoMeta } = trpc.talents.videoMeta.useQuery(
    { id: talentId },
    { enabled: Number.isFinite(talentId) }
  )
  const { data: verifications } = trpc.assessments.forTalent.useQuery(
    { talentId },
    { enabled: Number.isFinite(talentId) }
  )

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">Loading profile…</div>
  }

  if (!talent) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="font-display text-3xl">Talent not found.</p>
        <Link to="/discover" className="mt-4 inline-block font-semibold text-primary">← Back to discovery</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Link to="/discover" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to discovery
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* MAIN COLUMN */}
        <div className="space-y-6">
          {/* Header card */}
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className={`h-28 bg-gradient-to-r ${talent.gradient} texture-dots`} />
            <div className="px-6 pb-6 sm:px-8">
              <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <div className="rounded-3xl border-4 border-card shadow-lg">
                    <Avatar name={talent.name} gradient={talent.gradient} size="xl" />
                  </div>
                  <div className="pb-2">
                    <h1 className="font-display text-3xl font-semibold tracking-tight">{talent.name}</h1>
                    <div className="text-lg font-medium text-primary">{talent.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-2.5">
                  <span className="font-display text-2xl font-semibold text-primary">{talent.matchScore}%</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary/80">match with<br />your roles</span>
                </div>
              </div>

              <p className="mt-5 max-w-2xl font-display text-xl italic leading-snug text-foreground/85">
                “{talent.tagline}”
              </p>

              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> From {talent.origin} · {talent.yearsInNL} years in the Netherlands</span>
                <span className="inline-flex items-center gap-1.5"><Languages className="h-4 w-4" /> {talent.languages.join(' · ')}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {talent.availability}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {talent.traits.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground/75">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Story */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <Quote className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-semibold">My story</h2>
            </div>
            <p className="mt-4 text-[17px] leading-relaxed text-foreground/85">{talent.story}</p>
            <div className="mt-6 rounded-2xl bg-muted/60 p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What I'm looking for</div>
              <p className="mt-1.5 font-medium">{talent.lookingFor}</p>
            </div>
          </div>

          {/* Talent dimensions */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Talent dimensions</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Assessed through coaching conversations — not a CV scan.</p>
            <div className="mt-6 space-y-5">
              {talent.dimensions.map((d) => (
                <div key={d.label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">{d.label}</span>
                    <span className="font-semibold text-primary">{d.strength}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full bg-gradient-to-r ${talent.gradient}`} style={{ width: `${d.strength}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {talent.skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> {s}
                </span>
              ))}
            </div>
          </div>
          {/* Verified by independent professionals */}
          {(verifications ?? []).length > 0 && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="font-display text-2xl font-semibold">Verified by independent professionals</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{trust.whyIndependent}</p>
              <div className="mt-6 space-y-5">
                {(verifications ?? []).map(({ assessment: a, assessorName }) => (
                  <div key={a.id} className="rounded-2xl border border-emerald-100 bg-card p-5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                        <BadgeCheck className="h-4.5 w-4.5" /> {assessorName}
                      </span>
                      <span className="text-muted-foreground">· independent assessor, bound by confidentiality</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {a.skillsVerified.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Standout strengths</div>
                      <p className="mt-1 text-sm leading-relaxed">{a.strengths}</p>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Assessment</div>
                      <p className="mt-1 text-sm leading-relaxed">{a.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          {/* Video intro */}
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            {videoMeta ? (
              <video
                src={`/api/video-intro/${talent.id}?v=${new Date(videoMeta.updatedAt).getTime()}`}
                controls
                playsInline
                className="aspect-video w-full bg-black"
              />
            ) : (
              <div className={`relative grid h-52 place-items-center bg-gradient-to-br ${talent.gradient}`}>
                <div className="texture-dots absolute inset-0" />
                <div className="group relative grid h-16 w-16 place-items-center rounded-full bg-white/95 text-secondary shadow-xl">
                  <Play className="ml-0.5 h-6 w-6 fill-current" />
                </div>
              </div>
            )}
            <div className="p-5">
              <div className="font-display text-lg font-semibold">Video introduction</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {videoMeta
                  ? `${talent.name.split(' ')[0]} introduces themselves in their own words — distance never decides who gets met.`
                  : `${talent.name.split(' ')[0]} hasn't recorded their intro yet — start a video chat to meet them live.`}
              </p>
            </div>
          </div>

          {/* Why this match */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="font-display text-lg font-semibold">Why {talent.name.split(' ')[0]} matches you</div>
            <ul className="mt-3 space-y-2.5">
              {talent.matchReasons.map((r) => (
                <li key={r} className="flex gap-2.5 text-sm leading-snug text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="rounded-3xl border border-border bg-secondary p-5 text-secondary-foreground shadow-sm sm:p-6">
            <div className="font-display text-lg font-semibold">Start connecting</div>
            <p className="mt-1 text-sm text-secondary-foreground/70">Three steps to a hire that stays.</p>
            <div className="mt-4 space-y-2.5">
              <Link to={`/call/${talent.id}`} className="flex items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground transition hover:brightness-110">
                <Video className="h-5 w-5" /> Start a video chat
              </Link>
              <Link to={`/questionnaires?talent=${talent.id}`} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 font-semibold transition hover:bg-white/20">
                <ClipboardList className="h-5 w-5" /> Send a questionnaire
              </Link>
              <Link to={`/meetings?talent=${talent.id}`} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 font-semibold transition hover:bg-white/20">
                <Building2 className="h-5 w-5" /> Invite for in-house visit
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
