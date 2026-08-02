import { createContext, useContext, type ReactNode } from 'react'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/lib/auth'
import type { Match, Meeting, Questionnaire, PipelineStage } from '@/types'

interface AppState {
  matches: Match[]
  questionnaires: Questionnaire[]
  meetings: Meeting[]
  loading: boolean
  createMatch: (talentId: number, role: string) => void
  updateMatch: (id: number, patch: { stage?: PipelineStage; connectionRating?: number; notes?: string }) => void
  createQuestionnaire: (q: {
    talentId: number
    title: string
    purpose: string
    questions: { id: string; type: 'text' | 'choice' | 'scale'; prompt: string; options?: string[] }[]
    status: 'draft' | 'sent'
  }) => void
  submitAnswers: (id: number, answers: Record<string, string>) => void
  createMeeting: (m: { talentId: number; date: string; time: string; location: string; agenda: string; attendees: string[] }) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const utils = trpc.useUtils()
  const enabled = !!user

  const matchesQ = trpc.matches.list.useQuery(undefined, { enabled })
  const questsQ = trpc.questionnaires.list.useQuery(undefined, { enabled })
  const meetingsQ = trpc.meetings.list.useQuery(undefined, { enabled })

  const invalidate = () => {
    utils.matches.list.invalidate()
    utils.questionnaires.list.invalidate()
    utils.meetings.list.invalidate()
    // Identity reveals once connected — refresh pool data (skills-first browsing)
    utils.talents.list.invalidate()
    utils.talents.byId.invalidate()
    utils.talents.videoMeta.invalidate()
  }

  const createMatchMut = trpc.matches.create.useMutation({ onSuccess: invalidate })
  const updateMatchMut = trpc.matches.update.useMutation({ onSuccess: invalidate })
  const createQuestMut = trpc.questionnaires.create.useMutation({ onSuccess: invalidate })
  const submitAnswersMut = trpc.questionnaires.submitAnswers.useMutation({ onSuccess: invalidate })
  const createMeetingMut = trpc.meetings.create.useMutation({ onSuccess: invalidate })

  return (
    <Ctx.Provider
      value={{
        matches: matchesQ.data ?? [],
        questionnaires: questsQ.data ?? [],
        meetings: meetingsQ.data ?? [],
        loading: matchesQ.isLoading || questsQ.isLoading || meetingsQ.isLoading,
        createMatch: (talentId, role) => createMatchMut.mutate({ talentId, role }),
        updateMatch: (id, patch) => updateMatchMut.mutate({ id, ...patch }),
        createQuestionnaire: (q) => createQuestMut.mutate(q),
        submitAnswers: (id, answers) => submitAnswersMut.mutate({ id, answers }),
        createMeeting: (m) => createMeetingMut.mutate(m),
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export { stageIndex } from '@/types'
