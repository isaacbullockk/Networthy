import { useCallback, useEffect, useRef, useState } from 'react'
import { Video, Square, RotateCcw, Upload, CheckCircle2, Loader2, Play } from 'lucide-react'
import { trpc } from '@/providers/trpc'

const MAX_SECONDS = 90

type Phase = 'idle' | 'ready' | 'recording' | 'preview' | 'uploading'

/**
 * Record a short async video intro in the browser — the distance killer.
 * A talent placed anywhere can introduce themselves to every employer,
 * without anyone travelling or scheduling.
 */
export default function VideoIntroRecorder({ talentId }: { talentId: number }) {
  const utils = trpc.useUtils()
  const { data: meta } = trpc.talents.videoMeta.useQuery({ id: talentId })

  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const liveRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const cleanup = useCallback(() => {
    stopTimer()
    stopStream()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
  }, [stopStream])

  useEffect(() => cleanup, [cleanup])

  const startCamera = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (liveRef.current) {
        liveRef.current.srcObject = stream
        await liveRef.current.play().catch(() => undefined)
      }
      setPhase('ready')
    } catch {
      setError('Camera and microphone are needed to record your intro. Check your browser permissions and try again.')
    }
  }

  const startRecording = () => {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : ''
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    recorderRef.current = rec
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })
      blobRef.current = blob
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = URL.createObjectURL(blob)
      stopStream()
      setPhase('preview')
      // Attach after the preview element renders
      setTimeout(() => {
        if (previewRef.current && previewUrlRef.current) {
          previewRef.current.src = previewUrlRef.current
          previewRef.current.play().catch(() => undefined)
        }
      }, 50)
    }
    rec.start(250)
    setSeconds(0)
    setPhase('recording')
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) {
          recorderRef.current?.stop()
          stopTimer()
        }
        return s + 1
      })
    }, 1000)
  }

  const stopRecording = () => {
    stopTimer()
    recorderRef.current?.stop()
  }

  const retake = () => {
    blobRef.current = null
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setPhase('idle')
  }

  const upload = async () => {
    const blob = blobRef.current
    if (!blob) return
    setPhase('uploading')
    setError('')
    try {
      const res = await fetch('/api/video-intro', {
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'video/webm',
          'x-duration-sec': String(seconds),
        },
        body: blob,
      })
      if (!res.ok) throw new Error(await res.text())
      blobRef.current = null
      setPhase('idle')
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 5000)
      utils.talents.videoMeta.invalidate({ id: talentId })
    } catch {
      setError('Upload failed — please try again.')
      setPhase('preview')
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <Video className="h-5 w-5 text-primary" />
        <h3 className="font-display text-xl font-semibold">My video introduction</h3>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Distance should never decide who gets met. Record {MAX_SECONDS} seconds in your own words —
        every recruiter can meet you, wherever you are, before anyone schedules anything.
      </p>

      {/* Existing intro */}
      {meta && phase === 'idle' && (
        <div className="mt-5">
          <video src={`/api/video-intro/${talentId}?v=${new Date(meta.updatedAt).getTime()}`} controls className="w-full rounded-2xl bg-black" />
          <div className="mt-2 text-xs text-muted-foreground">
            Your current intro ({meta.durationSec}s) — recruiters see this on your profile.
          </div>
        </div>
      )}

      {justSaved && phase === 'idle' && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4.5 w-4.5" /> Your video intro is live on your profile.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>
      )}

      {/* Idle: record CTA */}
      {phase === 'idle' && (
        <button
          onClick={startCamera}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
        >
          <Video className="h-4.5 w-4.5" /> {meta ? 'Record a new intro' : 'Record your intro'}
        </button>
      )}

      {/* Camera live (ready or recording) */}
      {(phase === 'ready' || phase === 'recording') && (
        <div className="mt-5">
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={liveRef} muted playsInline className="w-full" />
            {phase === 'recording' && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm font-bold text-white">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} / {Math.floor(MAX_SECONDS / 60)}:{String(MAX_SECONDS % 60).padStart(2, '0')}
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {phase === 'ready' ? (
              <>
                <button
                  onClick={startRecording}
                  className="inline-flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:brightness-110"
                >
                  <Play className="h-4.5 w-4.5" /> Start recording
                </button>
                <button onClick={() => { cleanup(); setPhase('idle') }} className="rounded-full px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={stopRecording}
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-3 font-semibold text-secondary-foreground shadow-sm transition hover:brightness-110"
              >
                <Square className="h-4.5 w-4.5" /> Stop
              </button>
            )}
          </div>
          {phase === 'ready' && (
            <p className="mt-3 text-xs text-muted-foreground">
              Tip: who you are, what you're great at, what you're looking for — like you're talking to one person, not a camera.
            </p>
          )}
        </div>
      )}

      {/* Preview + upload */}
      {(phase === 'preview' || phase === 'uploading') && (
        <div className="mt-5">
          <video ref={previewRef} controls playsInline className="w-full rounded-2xl bg-black" />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={upload}
              disabled={phase === 'uploading'}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {phase === 'uploading' ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Upload className="h-4.5 w-4.5" />}
              {phase === 'uploading' ? 'Uploading…' : 'Use this video'}
            </button>
            <button
              onClick={retake}
              disabled={phase === 'uploading'}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Record again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
