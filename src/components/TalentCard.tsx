import { Link } from 'react-router'
import { MapPin, Languages, Video, ArrowRight, ShieldCheck } from 'lucide-react'
import type { Talent } from '@/types'
import Avatar from './Avatar'

function ScoreRing({ score }: { score: number }) {
  const r = 18
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid h-14 w-14 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="22" cy="22" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={c}
          strokeDashoffset={c - (score / 100) * c}
        />
      </svg>
      <span className="text-sm font-bold">{score}</span>
    </div>
  )
}

export default function TalentCard({ talent }: { talent: Talent & { verifiedCount?: number } }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <Avatar name={talent.name} gradient={talent.gradient} />
          <div>
            <div className="flex items-center gap-1.5 font-display text-lg font-semibold leading-tight">
              {talent.name}
              {(talent.verifiedCount ?? 0) > 0 && (
                <span title="Verified by an independent professional">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-primary">{talent.role}</div>
          </div>
        </div>
        <div className="text-center">
          <ScoreRing score={talent.matchScore} />
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">match</div>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 font-display text-[15px] italic leading-snug text-foreground/80">
        “{talent.tagline}”
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{talent.origin} · {talent.yearsInNL} yrs in NL</span>
        <span className="inline-flex items-center gap-1"><Languages className="h-3.5 w-3.5" />{talent.languages.slice(0, 3).join(', ')}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {talent.traits.map((t) => (
          <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/70">{t}</span>
        ))}
      </div>

      <div className="mt-auto flex gap-2 pt-5">
        <Link
          to={`/talent/${talent.id}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:bg-muted"
        >
          Read story <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          to={`/call/${talent.id}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:brightness-110"
        >
          <Video className="h-4 w-4" /> Video chat
        </Link>
      </div>
    </div>
  )
}
