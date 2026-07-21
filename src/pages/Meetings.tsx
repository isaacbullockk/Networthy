import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  CalendarDays, Clock, MapPin, Users, FileText, Plus,
  CheckCircle2, AlertCircle, Video, ClipboardList, PartyPopper,
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useApp } from '@/context/AppContext'
import { stageIndex } from '@/types'
import Avatar from '@/components/Avatar'

export default function Meetings() {
  const [params] = useSearchParams()
  const preTalent = Number(params.get('talent')) || null
  const { meetings, createMeeting, matches, questionnaires, updateMatch } = useApp()
  const { data: talents } = trpc.talents.list.useQuery()

  const [showForm, setShowForm] = useState(!!preTalent)
  const [talentId, setTalentId] = useState<number>(preTalent ?? 1)
  const [date, setDate] = useState('2026-07-29')
  const [time, setTime] = useState('14:00')
  const [location, setLocation] = useState('')
  const [agenda, setAgenda] = useState('')
  const [attendees, setAttendees] = useState('')

  const sorted = [...meetings].sort((a, b) => (a.status === b.status ? a.date.localeCompare(b.date) : a.status === 'upcoming' ? -1 : 1))

  const submit = () => {
    createMeeting({
      talentId,
      date,
      time,
      location: location.trim() || 'Your office',
      agenda: agenda.trim() || 'Office tour, meet the team, do real work together.',
      attendees: attendees.trim() ? attendees.split(',').map((a) => a.trim()) : ['Hiring manager'],
    })
    const m = matches.find((mm) => mm.talentId === talentId)
    if (m && stageIndex(m.stage) < stageIndex('in_house')) {
      updateMatch(m.id, { stage: 'in_house' })
    }
    setShowForm(false)
    setLocation('')
    setAgenda('')
    setAttendees('')
  }

  const prepStatus = (tid: number) => {
    const m = matches.find((mm) => mm.talentId === tid)
    const videoDone = m ? stageIndex(m.stage) >= stageIndex('video_chat') : false
    const questDone = questionnaires.some((q) => q.talentId === tid && q.status === 'completed')
    return { videoDone, questDone }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">In-house visits</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Where matches become colleagues.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Invite talent into your workplace to meet the team and do real work together.
            No interview panel — a day that feels like the first day of the job.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
        >
          <Plus className="h-4.5 w-4.5" /> Plan a visit
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-2xl font-semibold">Plan an in-house visit</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-sm font-semibold">Talent</label>
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
              <label className="text-sm font-semibold">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-sm font-semibold">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-sm font-semibold">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Your office, Amsterdam"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold">Who joins from your team? (comma-separated)</label>
              <input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="e.g. Lisa (Engineering Manager), Jeroen (Senior Dev)"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-sm font-semibold">Agenda</label>
              <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={2}
                placeholder="e.g. Office tour, pair on a real ticket, lunch with the team, closing coffee with the manager"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          {/* Connection before commitment — the anti-blind-hire check */}
          {(() => {
            const prep = prepStatus(talentId)
            if (prep.videoDone && prep.questDone) {
              return (
                <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  Fully connected first — video chat held and questionnaire completed. This visit is set up for a hire that stays.
                </div>
              )
            }
            return (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  Connection before commitment
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-amber-800">
                  A visit without connection is how blind hires happen — and blind hires don't stay. Before this visit:
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2.5">
                    {prep.videoDone
                      ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                      : <AlertCircle className="h-4.5 w-4.5 text-amber-500" />}
                    <span className={prep.videoDone ? 'text-emerald-800' : 'font-semibold text-amber-900'}>Video chat held</span>
                    {!prep.videoDone && (
                      <Link to={`/call/${talentId}`} className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        <Video className="h-3.5 w-3.5" /> Start one now — distance is no excuse
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {prep.questDone
                      ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                      : <AlertCircle className="h-4.5 w-4.5 text-amber-500" />}
                    <span className={prep.questDone ? 'text-emerald-800' : 'font-semibold text-amber-900'}>Questionnaire completed</span>
                    {!prep.questDone && (
                      <Link to={`/questionnaires?talent=${talentId}`} className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        <ClipboardList className="h-3.5 w-3.5" /> Send one
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
          <div className="mt-6 flex items-center gap-3">
            <button onClick={submit} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-110">
              <CheckCircle2 className="h-4.5 w-4.5" /> Confirm visit
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-full px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="mt-10 space-y-5">
        {sorted.map((m) => {
          const t = (talents ?? []).find((x) => x.id === m.talentId)
          if (!t) return null
          const prep = prepStatus(m.talentId)
          const d = new Date(m.date + 'T12:00:00')
          return (
            <div key={m.id} className="grid gap-0 overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:grid-cols-[110px_1fr_300px]">
              {/* Date block */}
              <div className={`flex items-center justify-center gap-2 p-5 lg:flex-col lg:gap-0 ${m.status === 'done' ? 'bg-muted' : 'bg-secondary text-secondary-foreground'}`}>
                <span className="font-display text-3xl font-semibold">{d.getDate()}</span>
                <span className="text-sm font-semibold uppercase tracking-wide">{d.toLocaleString('en', { month: 'short' })}</span>
                <span className={`text-xs ${m.status === 'done' ? 'text-muted-foreground' : 'text-secondary-foreground/60'}`}>{m.time}</span>
              </div>
              {/* Details */}
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={t.name} gradient={t.gradient} size="sm" />
                  <div>
                    <Link to={`/talent/${t.id}`} className="font-display text-lg font-semibold hover:text-primary">{t.name}</Link>
                    <div className="text-sm text-muted-foreground">{t.role}</div>
                  </div>
                  {m.status === 'done' ? (
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <PartyPopper className="h-3.5 w-3.5" /> Visit completed
                    </span>
                  ) : (
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                      <CalendarDays className="h-3.5 w-3.5" /> Upcoming
                    </span>
                  )}
                </div>
                <div className="mt-4 grid gap-2.5 text-sm text-muted-foreground sm:grid-cols-2">
                  <span className="inline-flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{m.location}</span>
                  <span className="inline-flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{m.attendees.join(', ')}</span>
                  <span className="inline-flex items-start gap-2 sm:col-span-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{m.agenda}</span>
                </div>
              </div>
              {/* Prep checklist */}
              <div className="border-t border-border bg-muted/40 p-5 lg:border-l lg:border-t-0">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Preparation</div>
                <div className="mt-3 space-y-2.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    {prep.videoDone
                      ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                      : <AlertCircle className="h-4.5 w-4.5 text-amber-500" />}
                    <span className={prep.videoDone ? 'text-foreground' : 'text-muted-foreground'}>Video chat held</span>
                    {!prep.videoDone && (
                      <Link to={`/call/${t.id}`} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        <Video className="h-3.5 w-3.5" /> Start
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {prep.questDone
                      ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                      : <AlertCircle className="h-4.5 w-4.5 text-amber-500" />}
                    <span className={prep.questDone ? 'text-foreground' : 'text-muted-foreground'}>Questionnaire completed</span>
                    {!prep.questDone && (
                      <Link to={`/questionnaires?talent=${t.id}`} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        <ClipboardList className="h-3.5 w-3.5" /> Send
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4.5 w-4.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Team briefed &amp; buddy assigned</span>
                  </div>
                </div>
                {prep.videoDone && prep.questDone && (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                    Fully prepared — this visit is set up for a hire that stays.
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
