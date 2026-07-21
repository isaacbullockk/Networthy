import { useState } from 'react'
import { ShieldCheck, Building2, CheckCircle2, UserPlus, AlertCircle, Clock } from 'lucide-react'
import { trpc } from '@/providers/trpc'

export default function Admin() {
  const utils = trpc.useUtils()
  const pending = trpc.admin.pendingRecruiters.useQuery()
  const approve = trpc.admin.approveRecruiter.useMutation({
    onSuccess: () => utils.admin.pendingRecruiters.invalidate(),
  })
  const createAssessor = trpc.admin.createAssessor.useMutation({
    onSuccess: () => {
      setName('')
      setEmail('')
      setPassword('')
      setMsg('Assessor account created — share the credentials over a trusted channel.')
    },
    onError: (e) => setMsg(e.message),
  })

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  const inputCls =
    'mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary'

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Admin</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Trust gate</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nobody meets the pool without passing you. That is the product promise.
        </p>
      </header>

      {/* Pending recruiters */}
      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Building2 className="h-5 w-5 text-primary" /> Recruiter applications
        </h2>
        {pending.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : (pending.data ?? []).length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Nobody waiting — the gate is clear.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(pending.data ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"
              >
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.email}
                    {r.company ? ` · ${r.company}` : ''}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> Applied{' '}
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-NL', { day: 'numeric', month: 'short' }) : 'recently'}
                  </p>
                </div>
                <button
                  onClick={() => approve.mutate({ userId: r.id })}
                  disabled={approve.isPending}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                >
                  Approve
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invite assessor */}
      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" /> Invite an assessor
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Assessors are invited, never self-serve — they sign the confidentiality charter on first login.
        </p>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault()
            setMsg('')
            createAssessor.mutate({ name: name.trim(), email, password })
          }}
        >
          <div>
            <label className="text-sm font-semibold">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Assessor name" />
          </div>
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="assessor@example.com" />
          </div>
          <div>
            <label className="text-sm font-semibold">Temporary password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Min. 10 characters" />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={createAssessor.isPending || !name.trim() || !email || password.length < 10}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" /> {createAssessor.isPending ? 'Creating…' : 'Create assessor account'}
            </button>
          </div>
        </form>
        {msg && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-primary" /> {msg}
          </p>
        )}
      </section>
    </div>
  )
}
