import { useState } from 'react'
import { Link } from 'react-router'
import { Sparkles, ArrowRight, ArrowLeft, MailCheck, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/providers/trpc'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const forgot = trpc.auth.forgotPassword.useMutation({ onSuccess: () => setSent(true) })

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email || forgot.isPending) return
    forgot.mutate({ email })
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-secondary px-4 py-12 text-secondary-foreground">
      <div className="texture-dots absolute inset-0" />
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="absolute end-4 top-4">
        <LanguageSwitcher dark />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-4xl font-semibold">
            Net<span className="text-primary">Worthy</span>
          </h1>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <MailCheck className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-secondary-foreground/80">{t('auth.resetSent')}</p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="font-display text-2xl font-semibold">{t('auth.forgotTitle')}</h2>
              <p className="mt-1.5 text-sm text-secondary-foreground/60">{t('auth.forgotSub')}</p>
              <div className="mt-5">
                <label className="text-sm font-semibold">{t('auth.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPh')}
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-primary"
                />
              </div>
              {forgot.isError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/15 p-3 text-sm text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {forgot.error.message.includes('Too many') ? forgot.error.message : t('auth.resetInvalid')}
                </div>
              )}
              <button
                type="submit"
                disabled={forgot.isPending || !email}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-50"
              >
                {t('auth.sendReset')} <ArrowRight className="h-4.5 w-4.5 rtl:-scale-x-100" />
              </button>
              <p className="mt-5 text-center text-sm">
                <Link to="/login" className="font-semibold text-secondary-foreground/60 transition hover:text-primary">
                  {t('auth.backToLogin')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
