import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { KeyRound, CheckCircle2, TriangleAlert, ArrowRight } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import PasswordInput from '@/components/PasswordInput'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const inputCls =
  'mt-1.5 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-primary'

export default function ResetPassword() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: (err) => setError(err.message),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError(t('auth.passwordsDiffer'))
      return
    }
    reset.mutate({ token, password })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-secondary px-4 py-16 texture-dots">
      <div className="pointer-events-none absolute -top-32 -start-32 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -end-32 size-96 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="absolute end-5 top-5">
        <LanguageSwitcher dark />
      </div>

      <div className="relative w-full max-w-md text-secondary-foreground">
        <Link to="/" className="mb-8 block text-center">
          <span className="font-display text-4xl font-semibold">
            Net<span className="text-primary">Worthy</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8">
          {done ? (
            <div className="text-center">
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle2 className="size-7 text-emerald-400" />
              </span>
              <h1 className="text-xl font-bold">{t('auth.resetDone')}</h1>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
              >
                {t('auth.signIn')} <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center">
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-500/15">
                <TriangleAlert className="size-7 text-amber-400" />
              </span>
              <h1 className="text-xl font-bold">{t('auth.resetInvalid')}</h1>
              <Link
                to="/forgot-password"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
              >
                {t('auth.sendReset')} <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/15">
                  <KeyRound className="size-6 text-primary" />
                </span>
                <h1 className="text-2xl font-bold">{t('auth.resetTitle')}</h1>
                <p className="mt-2 text-sm text-secondary-foreground/60">{t('auth.resetSub')}</p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold">{t('auth.newPassword')}</label>
                  <PasswordInput
                    required
                    minLength={10}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">{t('auth.confirmPassword')}</label>
                  <PasswordInput
                    required
                    minLength={10}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className={inputCls}
                  />
                </div>
                {error && (
                  <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={reset.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  {reset.isPending ? '…' : t('auth.resetSave')} <ArrowRight className="size-4.5" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
