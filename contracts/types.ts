export * from "./errors";

export const PIPELINE_STAGES = [
  "connected",
  "video_chat",
  "questionnaire",
  "in_house",
  "hired",
  "retained",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: { key: PipelineStage; label: string }[] = [
  { key: "connected", label: "Connected" },
  { key: "video_chat", label: "Video chat" },
  { key: "questionnaire", label: "Questionnaire" },
  { key: "in_house", label: "In-house visit" },
  { key: "hired", label: "Hired" },
  { key: "retained", label: "Retained 90+ days" },
];

export function stageIndex(s: PipelineStage): number {
  return PIPELINE_STAGES.indexOf(s);
}
