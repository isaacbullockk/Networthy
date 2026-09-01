import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Send, Lock } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/lib/auth'
import { CHAT_REQUIRES_CONSENT } from '@contracts/errors'

export default function Chat() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { matchId } = useParams()
  const id = Number(matchId)
  const [body, setBody] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const utils = trpc.useUtils()
  const { data: msgs, error } = trpc.messages.list.useQuery(
    { matchId: id },
    { enabled: Number.isFinite(id), refetchInterval: 5000 }
  )
  const send = trpc.messages.send.useMutation({
    onSuccess: () => {
      setBody('')
      utils.messages.list.invalidate({ matchId: id })
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs?.length])

  const backTo = user?.role === 'recruiter' ? '/dashboard' : '/portal'
  const forbidden = error?.data?.code === 'FORBIDDEN'
  const locked = forbidden && error?.message === CHAT_REQUIRES_CONSENT
  const denied = forbidden && !locked
  const loadError = !!error && !forbidden

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (!text || send.isPending) return
    send.mutate({ matchId: id, body: text })
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-2xl flex-col px-4 py-6 sm:px-6">
      <div className="flex items-center gap-3">
        <Link to={backTo} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-semibold">{t('chat.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('chat.subtitle')}</p>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-3xl border border-border bg-muted/30 p-4">
        {locked ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t('chat.locked')}</p>
          </div>
        ) : denied ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t('chat.denied')}</p>
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('chat.loadError')}</p>
          </div>
        ) : (msgs ?? []).length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('chat.empty')}</p>
          </div>
        ) : (
          (msgs ?? []).map((m) => (
            <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.mine
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-foreground'
                }`}
              >
                {m.body}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {!locked && !denied && !loadError && (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            placeholder={t('chat.placeholder')}
            className="flex-1 rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!body.trim() || send.isPending}
            className="rounded-2xl bg-primary px-5 text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            aria-label={t('chat.send')}
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        </form>
      )}
    </div>
  )
}
