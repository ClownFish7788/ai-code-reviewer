// ============================================================================
// Evaluator-Optimizer 循环 — 核心编排引擎
//
// 直调 AI SDK（generateText / streamText），不绕 HTTP
// ============================================================================

import { generateText, streamText } from "ai";
import { MODEL } from "@/lib/ai";
import {
  GENERATOR_SYSTEM_PROMPT,
  EVALUATOR_SYSTEM_PROMPT,
  REVISOR_SYSTEM_PROMPT,
} from "@/lib/prompts";

/* =========================================================================
   Types
   ========================================================================= */

export interface ReviewerCallbacks {
  /** 阶段切换时触发 */
  onPhase: (phase: string) => void;
  /** revise 流式输出的增量文本 */
  onChunk: (text: string) => void;
}

export interface ReviewerResult {
  report: string;
  iterations: number;
}

/* =========================================================================
   Constants
   ========================================================================= */

const MAX_ITERATIONS = 3;
const SCORE_THRESHOLD = 8;

/* =========================================================================
   内部工具
   ========================================================================= */

function extractScore(feedback: string): number {
  const match = feedback.match(/总评:\s*(\d+)\/10/);
  if (match) {
    const score = parseInt(match[1], 10);
    return Math.max(0, Math.min(10, score));
  }
  console.warn("[reviewer] 无法从 feedback 中提取评分，默认返回 5");
  return 5;
}

function stripScoreLine(feedback: string): string {
  return feedback
    .replace(/\*?\*?总评:\s*\d+\/10\*?\*?/g, "")
    .trim();
}

/* =========================================================================
   核心
   ========================================================================= */

/**
 * Evaluator-Optimizer 循环
 *
 * @param code       — 用户提交的原始代码
 * @param callbacks  — 可选，传入则走流式输出（用于 /api/analyze）
 */
export async function reviewCode(
  code: string,
  callbacks?: ReviewerCallbacks
): Promise<ReviewerResult> {
  // ── 1. 初始审查（非流式） ──────────────────────────────────────
  callbacks?.onPhase("review");

  const genResult = await generateText({
    model: MODEL,
    prompt: GENERATOR_SYSTEM_PROMPT(code),
  });

  let report = genResult.text;
  let iterations = 0;
  let feedback = "";

  // 兜底：文本为空
  if (!report) {
    report = "⚠️ 生成报告失败，请重试";
  }

  // ── 2. Evaluator-Optimizer 循环 ───────────────────────────────
  while (iterations < MAX_ITERATIONS) {
    callbacks?.onPhase("evaluate");

    const evalResult = await generateText({
      model: MODEL,
      prompt: EVALUATOR_SYSTEM_PROMPT(code, report),
    });

    feedback = evalResult.text || "";
    const score = extractScore(feedback);

    if (score >= SCORE_THRESHOLD) break;

    // 修正报告（循环内非流式，这是给机器看的）
    callbacks?.onPhase("revise");

    const cleaned = stripScoreLine(feedback);
    const revResult = await generateText({
      model: MODEL,
      prompt: REVISOR_SYSTEM_PROMPT(code, report, cleaned),
    });

    report = revResult.text || report;
    iterations++;
  }

  // ── 3. 最终修正 ───────────────────────────────────────────────
  callbacks?.onPhase("revise");

  const cleaned = stripScoreLine(feedback);

  if (callbacks) {
    // 流式输出给用户看
    let finalReport = "";

    try {
      const { textStream } = streamText({
        model: MODEL,
        prompt: REVISOR_SYSTEM_PROMPT(code, report, cleaned),
      });

      for await (const delta of textStream) {
        callbacks.onChunk(delta);
        finalReport += delta;
      }
    } catch {
      // streamText 失败时回退到 generateText
      const fallback = await generateText({
        model: MODEL,
        prompt: REVISOR_SYSTEM_PROMPT(code, report, cleaned),
      });
      finalReport = fallback.text || report;
      callbacks.onChunk(finalReport);
    }

    return { report: finalReport || report, iterations };
  }

  // 非流式路径（原子 API 调用此函数时走这里）
  const finalResult = await generateText({
    model: MODEL,
    prompt: REVISOR_SYSTEM_PROMPT(code, report, cleaned),
  });

  return {
    report: finalResult.text || report,
    iterations,
  };
}
