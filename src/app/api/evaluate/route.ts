import { EVALUATOR_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateText } from "ai";
import { MODEL } from "@/lib/ai";

/**
 * POST /api/evaluator
 *
 * 评估审查报告质量 — 对照原始代码核实每个问题
 * 接收 { code, report }，返回反馈（确认 / 误报 / 遗漏）
 */
export async function POST(request: Request) {
  try {
    const { code, report } = (await request.json()) as {
      code: string;
      report: string;
    };

    // 参数校验
    if (!code || code.trim().length === 0) {
      return Response.json(
        { error: "请提供需要审查的原始代码" },
        { status: 400 }
      );
    }

    if (!report || report.trim().length === 0) {
      return Response.json(
        { error: "请提供审查报告" },
        { status: 400 }
      );
    }

    const result = await generateText({
      model: MODEL,
      prompt: EVALUATOR_SYSTEM_PROMPT(code, report),
    });

    return Response.json({ feedback: result.text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "评估失败，请稍后重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
