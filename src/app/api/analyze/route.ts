import { reviewCode } from "@/lib/reviewer";

/**
 * POST /api/analyze
 *
 * 总入口 — 执行完整的 Evaluator-Optimizer 循环
 * 接收 { code }，内部串联 review → evaluate ⇄ revise
 * 返回经过多轮优化的最终审查报告
 */
export async function POST(request: Request) {
  try {
    const { code } = (await request.json()) as { code: string };

    if (!code || code.trim().length === 0) {
      return Response.json(
        { error: "请提供需要审查的代码" },
        { status: 400 }
      );
    }

    const result = await reviewCode(code);

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "分析失败，请稍后重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
