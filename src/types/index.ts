/** 代码审查的当前阶段 */
export type ReviewPhase = "idle" | "generating" | "evaluating" | "revising" | "done" | "error";

/** 评估器返回的 JSON 结构 */
export interface EvaluationResult {
  score: number; // 0–10
  coverage: number; // 0–2
  accuracy: number; // 0–2
  actionability: number; // 0–2
  clarity: number; // 0–2
  overallImpression: number; // 0–2
  feedback: string;
}

/** 单次审查的状态 */
export interface ReviewState {
  phase: ReviewPhase;
  code: string;
  report: string | null;
  score: number | null;
  iterations: number;
  error: string | null;
}
