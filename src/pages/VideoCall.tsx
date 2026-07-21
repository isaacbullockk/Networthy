import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, MessageCircleQuestion,
  Check, StickyNote, Star, ArrowRight, ClipboardList, Building2, Wifi, WifiOff, Loader2,
  CheckCircle2, GraduationCap,
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { questionPrompts } from '@/config/poolContent'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/lib/auth'
import Avatar from '@/components/Avatar'

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

type ConnState = 'connecting' | 'waiting' | 'live' | 'peer-left' | 'fallback'

export default function VideoCall() {
  const { id } = useParams()
  const navigate = useNavigate()
  const talentId = Number(id)
  const { user } = useAuth()
  const { data: talent } = trpc.talents.byId.useQuery({ id: talentId }, { enabled: Number.isFinite(talentId) })
  const { matches, createMatch, updateMatch } = useApp()

  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [asked, setAsked] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [savedNotes, setSavedNotes] = useState<string[]>([])
  const [ended, setEnded] = useState(false)
  const [rating, setRating] = useState(0)
  const [conn, setConn] = useState<ConnState>('connecting')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const noteRef = useRef<HTMLInputElement>(null)

  const prompts = useMemo(() => questionPrompts.slice(0, 8), [])
  const existing = matches.find((m) => m.talentId === talentId)

  // Teach & Learn mission for this call
  const utils = trpc.useUtils()
  const { data: exchanges } = trpc.exchanges.list.useQuery()
  const completeExMut = trpc.exchanges.complete.useMutation({
    onSuccess: () => {
      utils.exchanges.list.invalidate()
      utils.exchanges.stats.invalidate()
    },
  })
  const mission = (exchanges ?? []).find((e) => e.matchId === existing?.id && e.status === 'accepted')

  // Keep media streams attached to their <video> elements across re-renders
  const attachLocal = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el
    if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
      el.srcObject = localStreamRef.current
    }
  }, [])
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const attachRemote = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoRef.current = el
    if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current
    }
  }, [])

  /* ---------- WebRTC + signaling ---------- */
  useEffect(() => {
    if (!Number.isFinite(talentId)) return
    let cancelled = false
    const room = `talent-${talentId}`

    const wsUrl = import.meta.env.DEV
      ? `ws://${window.location.hostname}:3001`
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })
    pcRef.current = pc

    const sendSignal = (data: unknown) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ kind: 'signal', room, data }))
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: 'ice', candidate: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0]
        setConn('live')
      }
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setConn('live')
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) setConn((c) => (c === 'live' ? 'peer-left' : c))
    }

    // Get local media FIRST — tracks must be attached before any offer is created,
    // otherwise the peer connects without video/audio.
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return false }
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        stream.getTracks().forEach((t) => pc.addTrack(t, stream))
        return true
      } catch (err) {
        console.warn('getUserMedia failed:', err)
        // No camera/mic available → simulated companion view
        if (!cancelled) setConn('fallback')
        return false
      }
    }

    ws.onopen = async () => {
      await startMedia()
      if (!cancelled) ws.send(JSON.stringify({ kind: 'join', room }))
    }
    ws.onmessage = async (ev) => {
      const msg = JSON.parse(String(ev.data))
      if (msg.kind === 'joined') {
        setConn(msg.peers >= 2 ? 'connecting' : 'waiting')
      }
      if (msg.kind === 'ready' && msg.initiator) {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          sendSignal({ type: 'offer', sdp: offer.sdp })
        } catch { /* noop */ }
      }
      if (msg.kind === 'signal') {
        const data = msg.data as { type: string; sdp?: string; candidate?: RTCIceCandidateInit }
        try {
          if (data.type === 'offer' && data.sdp) {
            await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp })
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            sendSignal({ type: 'answer', sdp: answer.sdp })
          } else if (data.type === 'answer' && data.sdp) {
            await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp })
          } else if (data.type === 'ice' && data.candidate) {
            await pc.addIceCandidate(data.candidate)
          }
        } catch { /* noop */ }
      }
      if (msg.kind === 'peer-left') {
        setConn('peer-left')
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
      }
    }

    return () => {
      cancelled = true
      pc.close()
      ws.close()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [talentId])

  /* ---------- Timer ---------- */
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = m))
      return !m
    })
  }, [])

  const toggleCam = useCallback(() => {
    setCamOff((c) => {
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = c))
      return !c
    })
  }, [])

  const talentName = talent?.name ?? 'your match'
  const talentFirst = talentName.split(' ')[0]
  const talentGradient = talent?.gradient ?? 'from-orange-400 to-rose-500'

  const saveNote = () => {
    if (!notes.trim()) return
    setSavedNotes((p) => [...p, `${formatTime(seconds)} — ${notes.trim()}`])
    setNotes('')
    noteRef.current?.focus()
  }

  const finish = (next: 'questionnaire' | 'meeting' | 'dashboard') => {
    const noteText = savedNotes.join('\n')
    // Assessors join calls to assess — they never write to the hiring pipeline
    if (user?.role !== 'assessor') {
      if (existing) {
        updateMatch(existing.id, {
          stage: 'video_chat',
          connectionRating: rating || existing.connectionRating,
          notes: noteText ? `${existing.notes ?? ''}\n${noteText}`.trim() : existing.notes ?? '',
        })
      } else if (talent && user?.role === 'recruiter') {
        createMatch(talentId, talent.role)
      }
    }
    const home = user?.role === 'talent' ? '/portal' : user?.role === 'assessor' ? '/assessor' : '/dashboard'
    if (next === 'questionnaire' && user?.role === 'recruiter') navigate(`/questionnaires?talent=${talentId}`)
    else if (next === 'meeting' && user?.role === 'recruiter') navigate(`/meetings?talent=${talentId}`)
    else navigate(home)
  }

  /* ---------- END-OF-CALL SUMMARY ---------- */
  if (ended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12 text-secondary-foreground">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/20 text-primary">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold">Great conversation!</h2>
            <p className="mt-2 text-secondary-foreground/70">
              {formatTime(seconds)} with {talentName} · {asked.size} questions explored · {savedNotes.length} notes taken
            </p>
          </div>

          {user?.role === 'recruiter' && (
            <div className="mt-8">
              <div className="text-center text-sm font-semibold uppercase tracking-widest text-secondary-foreground/60">
                How strong was the connection?
              </div>
              <div className="mt-3 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} className="transition hover:scale-110">
                    <Star className={`h-9 w-9 ${n <= rating ? 'fill-primary text-primary' : 'text-white/25'}`} />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-sm text-secondary-foreground/60">
                {rating === 0 && 'Tap a star — this helps NetWorthy learn what clicks'}
                {rating > 0 && rating <= 2 && 'Honest signal — maybe not the right match, and that is fine.'}
                {rating === 3 && 'A decent conversation — worth a follow-up question round.'}
                {rating >= 4 && 'A real click! Keep the momentum going.'}
              </p>
            </div>
          )}

          <div className="mt-8 space-y-3">
            {user?.role === 'recruiter' ? (
              <>
                <button onClick={() => finish('questionnaire')} className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 font-semibold text-primary-foreground transition hover:brightness-110">
                  <span className="flex items-center gap-3"><ClipboardList className="h-5 w-5" /> Send a questionnaire before meeting</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button onClick={() => finish('meeting')} className="flex w-full items-center justify-between rounded-2xl bg-white/10 px-5 py-4 font-semibold transition hover:bg-white/20">
                  <span className="flex items-center gap-3"><Building2 className="h-5 w-5" /> Plan the in-house visit</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
            <button onClick={() => finish('dashboard')} className="w-full rounded-2xl px-5 py-3 text-sm font-semibold text-secondary-foreground/70 transition hover:text-secondary-foreground">
              {user?.role === 'talent' ? 'Back to my journey' : user?.role === 'assessor' ? 'Back to verification' : 'Save and go to dashboard'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const connLabel: Record<ConnState, { icon: React.ReactNode; text: string }> = {
    connecting: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: 'Connecting…' },
    waiting: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: `Waiting for ${talentFirst} to join…` },
    live: { icon: <Wifi className="h-3.5 w-3.5" />, text: 'Connected · peer-to-peer' },
    'peer-left': { icon: <WifiOff className="h-3.5 w-3.5" />, text: 'Peer left — waiting for them to return…' },
    fallback: { icon: <WifiOff className="h-3.5 w-3.5" />, text: 'Simulated view (no camera/mic on this device)' },
  }

  /* ---------- LIVE CALL ---------- */
  return (
    <div className="min-h-screen bg-secondary text-secondary-foreground">
      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px]">
        {/* VIDEO AREA */}
        <div className="flex flex-col">
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#232048] to-[#14102e] shadow-2xl" style={{ minHeight: '540px' }}>
            <div className="texture-dots absolute inset-0" />

            {/* remote video (fills area when live) */}
            <video
              ref={attachRemote}
              autoPlay
              playsInline
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${conn === 'live' ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* top bar */}
            <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-5">
              <div>
                <div className="font-display text-lg font-semibold">{talentName}</div>
                <div className="text-sm text-white/60">{talent ? `${talent.role} · ${talent.origin}` : 'connecting…'}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/80">
                  {connLabel[conn].icon} {connLabel[conn].text}
                </span>
                <span className="rounded-full bg-black/40 px-3.5 py-1.5 font-mono text-sm">{formatTime(seconds)}</span>
              </div>
            </div>

            {/* placeholder when no remote video */}
            {conn !== 'live' && (
              <div className="absolute inset-0 grid place-items-center">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className={`absolute -inset-4 rounded-[2rem] bg-gradient-to-br ${talentGradient} opacity-30 blur-xl`} />
                    <Avatar name={talentName} gradient={talentGradient} size="xl" />
                  </div>
                  <div className="mt-6 flex h-6 items-end gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className="eq-bar w-1.5 rounded-full bg-primary" style={{ height: '100%', animationDelay: `${i * 0.13}s` }} />
                    ))}
                  </div>
                  <p className="mt-4 max-w-md px-6 text-center text-sm text-white/50">
                    {conn === 'waiting' && `Share this link with ${talentFirst} — they'll appear here when they join from their portal.`}
                    {conn === 'connecting' && 'Establishing a secure peer-to-peer connection…'}
                    {conn === 'peer-left' && 'The connection was lost. Waiting for them to rejoin…'}
                    {conn === 'fallback' && 'Camera/microphone not available here — showing the simulated view.'}
                  </p>
                </div>
              </div>
            )}

            {/* self view */}
            <div className="absolute bottom-24 right-5 z-10 h-32 w-44 overflow-hidden rounded-2xl border border-white/20 bg-[#2c2850] shadow-xl">
              {camOff ? (
                <div className="grid h-full place-items-center text-white/40"><VideoOff className="h-6 w-6" /></div>
              ) : (
                <video ref={attachLocal} autoPlay playsInline muted className="h-full w-full object-cover" />
              )}
              <span className="absolute bottom-1.5 left-2 text-[11px] font-medium text-white/70">
                You ({user?.role === 'talent' ? 'talent' : 'recruiter'})
              </span>
            </div>

            {/* controls */}
            <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent p-5">
              <button
                onClick={toggleMute}
                className={`grid place-items-center rounded-full p-3.5 transition ${muted ? 'bg-red-500 text-white' : 'bg-white/15 hover:bg-white/25'}`}
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                onClick={toggleCam}
                className={`grid place-items-center rounded-full p-3.5 transition ${camOff ? 'bg-red-500 text-white' : 'bg-white/15 hover:bg-white/25'}`}
                title={camOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {camOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setEnded(true)}
                className="grid place-items-center rounded-full bg-red-500 p-4 text-white shadow-lg shadow-red-500/40 transition hover:scale-105 hover:bg-red-600"
                title="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-white/40">
            NetWorthy video connection — real WebRTC, peer-to-peer encrypted · interpreter support on request.
          </p>
        </div>

        {/* SIDE PANEL */}
        <div className="flex flex-col gap-4">
          {/* Teach & Learn mission */}
          {mission && (
            <div className="rounded-3xl border border-primary/30 bg-primary/10 p-5 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold">Today's exchange mission</h3>
              </div>
              <p className="mt-1 text-xs text-white/50">Everybody has a talent — swap yours in this call.</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="rounded-xl bg-black/25 p-3">
                  <span className="font-semibold text-primary">{talentFirst} teaches: </span>
                  <span className="text-white/85">{mission.talentTeaches}</span>
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <span className="font-semibold text-teal-300">{mission.company} teaches: </span>
                  <span className="text-white/85">{mission.recruiterTeaches}</span>
                </div>
              </div>
              <button
                onClick={() => completeExMut.mutate({ id: mission.id })}
                disabled={completeExMut.isPending}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> We swapped — claim 100 XP
              </button>
            </div>
          )}

          {/* question prompts */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <MessageCircleQuestion className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Questions that connect</h3>
            </div>
            <p className="mt-1 text-xs text-white/50">Beyond the CV — tap to mark as asked.</p>
            <div className="mt-4 max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {prompts.map((q) => {
                const isAsked = asked.has(q)
                return (
                  <button
                    key={q}
                    onClick={() => setAsked((p) => { const n = new Set(p); if (isAsked) { n.delete(q) } else { n.add(q) } return n })}
                    className={`flex w-full items-start gap-2.5 rounded-xl border p-3 text-left text-sm leading-snug transition ${
                      isAsked
                        ? 'border-primary/40 bg-primary/15 text-white/90'
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <span className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border ${isAsked ? 'border-primary bg-primary text-white' : 'border-white/30'}`}>
                      {isAsked && <Check className="h-3 w-3" />}
                    </span>
                    {q}
                  </button>
                )
              })}
            </div>
          </div>

          {/* notes */}
          <div className="flex flex-1 flex-col rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <StickyNote className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Private notes</h3>
            </div>
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto text-sm">
              {savedNotes.length === 0 && <p className="text-xs text-white/40">Notes are only visible to you and saved to the match.</p>}
              {savedNotes.map((n, i) => (
                <div key={i} className="rounded-xl bg-white/5 px-3 py-2 text-white/80">{n}</div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                ref={noteRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveNote()}
                placeholder="Type a note, press Enter…"
                className="flex-1 rounded-xl border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-primary"
              />
              <button onClick={saveNote} className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
