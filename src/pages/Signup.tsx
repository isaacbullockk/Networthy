import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Sparkles, ArrowRight, AlertCircle, GraduationCap, Building2, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { brand } from '@/config/poolContent'
import PasswordInput from '@/components/PasswordInput'

type Role = 'talent' | 'recruiter'

function homeFor(role: string) {
  return role === 'talent' ? '/portal' : '/dashboard'
}

export default function Signup() {
  const { register, user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('talent')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) navigate(homeFor(user.role), { replace: true })
  }, [user, navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError(t('auth.signup.noMatch'))
      return
    }
    setBusy(true)
    try {
      const u = await register({
        name: name.trim(),
        email,
        password,
        role,
        company: role === 'recruiter' ? company.trim() : undefined,
      })
      navigate(homeFor(u.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signup.failed'))
      setBusy(false)
    }
  }

  const inputCls =
    'mt-1.5 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-primary'

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
            {t('auth.signup.titleA')}<span className="text-primary">{t('auth.signup.titleB')}</span>
          </h1>
          <p className="mt-2 text-secondary-foreground/70">{brand.tagline}</p>
        </div>

        <form onSubmit={submit} className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setRole('talent')}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                role === 'talent'
                  ? 'border-primary bg-primary/15'
                  : 'border-white/10 bg-white/5 hover:border-white/25'
              }`}
            >
              <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-semibold">{t('auth.signup.imTalent')}</span>
                <span className="block text-xs text-secondary-foreground/50">{t('auth.signup.talentSub')}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRole('recruiter')}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                role === 'recruiter'
                  ? 'border-primary bg-primary/15'
                  : 'border-white/10 bg-white/5 hover:border-white/25'
              }`}
            >
              <Building2 className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-semibold">{t('auth.signup.iHire')}</span>
                <span className="block text-xs text-secondary-foreground/50">{t('auth.signup.hireSub')}</span>
              </span>
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-semibold">{t('auth.signup.fullName')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('auth.signup.namePh')} autoComplete="name" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-semibold">{t('auth.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.signup.emailPh')} autoComplete="email" className={inputCls} />
            </div>
            {role === 'recruiter' && (
              <div>
                <label className="text-sm font-semibold">{t('auth.signup.company')}</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t('auth.signup.companyPh')} autoComplete="organization" className={inputCls} />
              </div>
            )}
            <div>
              <label className="text-sm font-semibold">{t('auth.password')}</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.signup.passwordPh')} autoComplete="new-password" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-semibold">{t('auth.signup.repeat')}</label>
              <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t('auth.signup.repeatPh')} autoComplete="new-password" className={inputCls} />
            </div>
          </div>

          {role === 'recruiter' && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-secondary-foreground/60">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {t('auth.signup.reviewNote')}
              </span>
            </p>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/15 p-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !name.trim() || !email || !password || !confirm}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? t('auth.signup.creating') : t('auth.signup.submit')} <ArrowRight className="h-4.5 w-4.5" />
          </button>
          <p className="mt-5 text-center text-sm text-secondary-foreground/60">
            {t('auth.signup.haveAccount')}{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              {t('auth.signIn')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
