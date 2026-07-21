import { CalendarDays, Clock, MapPin, Users, FileText, PartyPopper, CheckCircle2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'

export default function PortalVisits() {
  const { meetings } = useApp()
  const sorted = [...meetings].sort((a, b) => (a.status === b.status ? a.date.localeCompare(b.date) : a.status === 'upcoming' ? -1 : 1))

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="text-xs font-bold uppercase tracking-widest text-primary">In-house visits</div>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Come as you are.
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        An in-house visit is not an interview — it's a day of meeting the team, seeing the real
        work, and letting them meet the real you. Everything here is planned around you.
      </p>

      <div className="mt-10 space-y-5">
        {sorted.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-16 text-center text-muted-foreground">
            No visits planned yet. They usually follow a good video chat and questionnaire.
          </div>
        )}
        {sorted.map((m) => {
          const d = new Date(m.date + 'T12:00:00')
          return (
            <div key={m.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
                <div className={`grid h-16 w-16 shrink-0 flex-col place-items-center rounded-2xl ${m.status === 'done' ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  <span className="font-display text-2xl font-semibold leading-none">{d.getDate()}</span>
                  <span className="text-[11px] font-bold uppercase">{d.toLocaleString('en', { month: 'short' })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-display text-lg font-semibold">{m.location}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {m.time}</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {m.location}</span>
                  </div>
                </div>
                {m.status === 'done' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <PartyPopper className="h-3.5 w-3.5" /> Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                    <CalendarDays className="h-3.5 w-3.5" /> Upcoming
                  </span>
                )}
              </div>
              <div className="border-t border-border bg-muted/40 p-5 sm:px-6">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" /> Agenda
                    </div>
                    <p className="text-foreground/80">{m.agenda}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> You'll meet
                    </div>
                    <p className="text-foreground/80">{m.attendees.join(', ')}</p>
                  </div>
                </div>
                {m.status === 'upcoming' && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-xs font-semibold text-primary">
                    <CheckCircle2 className="h-4 w-4" /> Tip: wear what feels like you. This visit is about fit, both ways.
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
