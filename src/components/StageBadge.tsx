import type { PipelineStage } from '@/types'
import { STAGES } from '@/types'

const COLORS: Record<PipelineStage, string> = {
  connected: 'bg-sky-100 text-sky-800 border-sky-200',
  video_chat: 'bg-violet-100 text-violet-800 border-violet-200',
  questionnaire: 'bg-amber-100 text-amber-800 border-amber-200',
  in_house: 'bg-orange-100 text-orange-800 border-orange-200',
  hired: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  retained: 'bg-teal-100 text-teal-800 border-teal-200',
}

export default function StageBadge({ stage }: { stage: PipelineStage }) {
  const label = STAGES.find((s) => s.key === stage)?.label ?? stage
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COLORS[stage]}`}>
      {label}
    </span>
  )
}
