import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { Printer, Share2, Check, Lock, ChevronRight, FileText } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import RecordDocument, { type RecordData } from '@/components/RecordDocument'

/**
 * Authed record page — the match's recruiter or talent.
 * Recruiter can create a public share link for internal sign-off.
 */
export default function Record() {
  const { matchId } = useParams()
  const id = Number(matchId)
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.records.forMatch.useQuery({ matchId: id }, { enabled: Number.isFinite(id) })
  const shareMut = trpc.records.createShareLink.useMutation({
    onSuccess: () => utils.records.forMatch.invalidate({ matchId: id }),
  })
  const [copied, setCopied] = useState(false)

  if (isLoading || !data) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-muted-foreground">Loading record…</div>
  }

  if (!data.earned) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold">The record is earned, not submitted.</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          It unlocks at the in-house stage — after the video chat and the questionnaire. Nobody gets filtered on a document here; the document is what connection produces.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary hover:underline">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back to the pipeline
        </Link>
      </div>
    )
  }

  const shareUrl = data.shareToken ? `${window.location.origin}/r/${data.shareToken}` : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <FileText className="h-4 w-4" /> NetWorthy Record
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.side === 'recruiter'
              ? 'For internal sign-off — share it, print it, bring it to the meeting.'
              : 'This is your record — generated from your connections. Yours to keep.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {data.side === 'recruiter' && !shareUrl && (
            <button
              onClick={() => shareMut.mutate({ matchId: id })}
              disabled={shareMut.isPending}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
            >
              <Share2 className="h-4 w-4" /> Create share link
            </button>
          )}
          {shareUrl && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl).catch(() => undefined)
                setCopied(true)
                setTimeout(() => setCopied(false), 2500)
              }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? 'Link copied' : 'Copy share link'}
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <Printer className="h-4 w-4" /> Print / save as PDF
          </button>
        </div>
      </div>

      <RecordDocument record={data.record as RecordData} embedVideo />

      {shareUrl && (
        <p className="no-print mt-4 text-center text-xs text-muted-foreground">
          Public link (no login needed): <span className="font-mono">{shareUrl}</span>
        </p>
      )}
    </div>
  )
}
