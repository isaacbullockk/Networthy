import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Sparkles, ArrowRight, AlertCircle, ShieldCheck, Eye } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { brand, trust } from '@/config/poolContent'

function homeFor(role: string) {
  return role === 'talent' ? '/portal'
    : role === 'assessor' ? '/assessor'
    : role === 'admin' ? '/admin'
    : '/dashboard'
}

export default function Login() {
  const { login, guestLogin, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) navigate(homeFor(user.role), { replace: true })
  }, [user, navigate])

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email || !password) return
    setBusy(true)
    setError('')
    try {
      const u = await login(email, password)
      navigate(homeFor(u.role))
    } catch (err) {
      setError(err instanceof Error && err.message.includes('Too many')
        ? err.message
        : 'That email and password don’t match.')
      setBusy(false)
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-secondary px-4 py-12 text-secondary-foreground">
      <div className="texture-dots absolute inset-0" />
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-4xl font-semibold">
            Net<span className="text-primary">Worthy</span>
          </h1>
          <p className="mt-2 text-secondary-foreground/70">{brand.tagline}</p>
        </div>

        <form onSubmit={submit} className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.nl"
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-primary"
              />
            </div>
          </div>
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/15 p-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'} <ArrowRight className="h-4.5 w-4.5" />
          </button>
          <div className="mt-4 flex items-center gap-3 text-xs text-secondary-foreground/40">
            <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await guestLogin()
                navigate('/dashboard')
              } catch {
                setError('Guest preview is unavailable right now.')
                setBusy(false)
              }
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-secondary-foreground transition hover:border-primary/50 hover:bg-white/10 disabled:opacity-50"
          >
            <Eye className="h-4.5 w-4.5 text-primary" /> Explore as guest — read-only preview
          </button>
          <p className="mt-5 text-center text-sm text-secondary-foreground/60">
            New to NetWorthy?{' '}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </form>

        <p className="mt-6 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-xs leading-relaxed text-secondary-foreground/60 backdrop-blur">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span><strong className="text-secondary-foreground">For talents:</strong> {trust.promises[0].title.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} — {trust.promises[1].text}</span>
        </p>
      </div>
    </div>
  )
}
