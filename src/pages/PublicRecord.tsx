import { useParams } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import RecordDocument, { type RecordData } from '@/components/RecordDocument'

/**
 * Public record view via share token — the sign-off meeting attendee.
 * No login, no chrome: just the verified document.
 */
export default function PublicRecord() {
  const { token } = useParams()
  const { data, isLoading, error } = trpc.records.byToken.useQuery(
    { token: token ?? '' },
    { enabled: !!token }
  )

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="no-print border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-4 py-4 sm:px-6">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-display font-semibold">NetWorthy</span>
            <span className="ml-2 text-xs text-muted-foreground">Verified Record — shared for review</span>
          </div>
          <button
            onClick={() => window.print()}
            className="ml-auto rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            Print / PDF
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {isLoading && <div className="py-16 text-center text-muted-foreground">Loading record…</div>}
        {error && (
          <div className="py-16 text-center">
            <h1 className="font-display text-2xl font-semibold">Record not found</h1>
            <p className="mt-2 text-muted-foreground">This link may have expired or never existed.</p>
          </div>
        )}
        {data && <RecordDocument record={data.record as RecordData} />}
      </div>
    </div>
  )
}
