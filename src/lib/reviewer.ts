// ============================================================================
// Evaluator-Optimizer 循环
//
// 链路：Review → Evaluate → (loop) → Revise → 返回最终报告
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/** 最大迭代次数 — 防止无限循环 */
const MAX_ITERATIONS = 3;

/** 评分阈值 — >= 此分数则认为报告达标 */
const SCORE_THRESHOLD = 8;

/* =========================================================================
   内部工具
   ========================================================================= */

/** 从 evaluator 返回文本中提取分数 */
function extractScore(feedback: string): number {
  const match = feedback.match(/总评:\s*(\d+)\/10/);
  if (match) {
    const score = parseInt(match[1], 10);
    return Math.max(0, Math.min(10, score));
  }
  // 解析失败 → 保守估计，继续循环
  console.warn("[reviewer] 无法从 feedback 中提取评分，默认返回 5");
  return 5;
}

/** 从 feedback 中移除评分行，避免污染 revisor 的输入 */
function stripScoreLine(feedback: string): string {
  return feedback
    .replace(/\*?\*?总评:\s*\d+\/10\*?\*?/g, "")
    .trim();
}

/* =========================================================================
   API 调用封装
   ========================================================================= */

async function callReview(code: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "review 请求失败" }));
    throw new Error(err.error);
  }

  const data = await res.json();
  return data.report;
}

async function callEvaluator(code: string, report: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, report }),
  });

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "evaluator 请求失败" }));
    throw new Error(err.error);
  }

  const data = await res.json();
  return data.feedback;
}

async function callRevisor(
  code: string,
  report: string,
  feedback: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, report, feedback }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "revisor 请求失败" }));
    throw new Error(err.error);
  }

  const data = await res.json();
  return data.report;
}

/* =========================================================================
   核心：Evaluator-Optimizer 循环
   ========================================================================= */

export interface ReviewerResult {
  report: string;
  iterations: number;
}

/**
 * 带 Evaluator-Optimizer 循环的代码审查
 *
 * 流程：
 *   1. Review   → 生成初始报告
 *   2. Evaluate → 评分，< 8 分则进入循环
 *   3. Revise   → 根据反馈修正报告，回到步骤 2
 *   4. 达标后   → 最终 Revise，返回报告 + 迭代次数
 */
export async function reviewCode(code: string): Promise<ReviewerResult> {
  // 1. 初始审查
  let report = await callReview(code);
  let iterations = 0;
  let feedback = "";

  // 2. Evaluator-Optimizer 循环
  while (iterations < MAX_ITERATIONS) {
    feedback = await callEvaluator(code, report);
    const score = extractScore(feedback);

    // 达标 → 跳出循环
    if (score >= SCORE_THRESHOLD) {
      break;
    }

    // 未达标 → 修正报告，进入下一轮
    const cleanedFeedback = stripScoreLine(feedback);
    report = await callRevisor(code, report, cleanedFeedback);
    iterations++;
  }

  // 3. 最终修正（用最后一轮 evaluator 反馈）
  const cleanedFeedback = stripScoreLine(feedback);
  const finalReport = await callRevisor(code, report, cleanedFeedback);

  return {
    report: finalReport,
    iterations,
  };
}
