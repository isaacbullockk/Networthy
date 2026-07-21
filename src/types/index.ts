import type { Talent, Match, Questionnaire, Meeting, User } from '@db/schema'

export type { Talent, Match, Questionnaire, Meeting, User }
export type { PipelineStage } from '@contracts/types'
export { STAGE_LABELS as STAGES, stageIndex, PIPELINE_STAGES } from '@contracts/types'

export type SessionUser = Omit<User, 'passwordHash'>
