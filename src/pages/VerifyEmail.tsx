import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { MailCheck, CheckCircle2, TriangleAlert, Loader2, ArrowRight } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function VerifyEmail() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<'loading' | 'done' | 'error'>(token ? 'loading' : 'error')
  const [error, setError] = useState(token ? '' : t('auth.verifyMissing'))
  const fired = useRef(false)

  const verify = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => setState('done'),
    onError: (err) => {
      setError(err.message)
      setState('error')
    },
  })

  useEffect(() => {
    if (token && !fired.current) {
      fired.current = true
      verify.mutate({ token })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur sm:p-8">
          {state === 'loading' && (
            <>
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-white/10">
                <Loader2 className="size-7 animate-spin text-white/70" />
              </span>
              <h1 className="text-xl font-bold">{t('auth.verifying')}</h1>
            </>
          )}

          {state === 'done' && (
            <>
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle2 className="size-7 text-emerald-400" />
              </span>
              <h1 className="text-xl font-bold">{t('auth.verifyDone')}</h1>
              <p className="mt-2 text-sm text-white/60">{t('auth.verifyDoneBody')}</p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {t('auth.toLogin')} <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-500/15">
                <TriangleAlert className="size-7 text-red-400" />
              </span>
              <h1 className="text-xl font-bold">{t('auth.verifyFailed')}</h1>
              <p className="mt-2 text-sm text-white/60">{error || t('auth.verifyFailedBody')}</p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {t('auth.toLogin')} <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-white/40">
          <MailCheck className="h-3.5 w-3.5" /> {t('auth.verifyHint')}
        </p>
      </div>
    </div>
  )
}
