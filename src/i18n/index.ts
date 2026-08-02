import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { en } from './en'
import { nl } from './nl'
import { ar } from './ar'

export const LANGS = [
  { code: 'en', label: 'English', dir: 'ltr' as const },
  { code: 'nl', label: 'Nederlands', dir: 'ltr' as const },
  { code: 'ar', label: 'العربية', dir: 'rtl' as const },
]

export function dirFor(lang: string): 'ltr' | 'rtl' {
  return LANGS.find((l) => l.code === lang)?.dir ?? 'ltr'
}

function applyDir(lang: string) {
  document.documentElement.dir = dirFor(lang)
  document.documentElement.lang = lang
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      nl: { translation: nl },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: LANGS.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      // Logged-in users get their stored preference synced via setLocale;
      // everyone else: last choice → browser → English.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nw_lang',
    },
  })

applyDir(i18n.language)
i18n.on('languageChanged', applyDir)

export default i18n
