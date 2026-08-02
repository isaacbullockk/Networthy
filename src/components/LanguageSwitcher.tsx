import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { LANGS } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { trpc } from '@/providers/trpc'

/** Language picker — persists to localStorage always, and to the user
 *  profile when logged in (so pulses and emails follow the talent). */
export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const setLocale = trpc.auth.setLocale.useMutation()

  const choose = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('nw_lang', code)
    if (user) setLocale.mutate({ locale: code as 'en' | 'nl' | 'ar' })
  }

  return (
    <div className="flex items-center gap-1.5">
      <Languages className={`h-4 w-4 ${dark ? 'text-secondary-foreground/60' : 'text-muted-foreground'}`} />
      <div className="flex rounded-full border border-border p-0.5">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => choose(l.code)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              i18n.language === l.code
                ? 'bg-primary text-primary-foreground'
                : dark
                  ? 'text-secondary-foreground/70 hover:text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {l.code.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
