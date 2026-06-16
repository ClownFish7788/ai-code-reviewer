import { REVISOR_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateText } from "ai";
import { MODEL } from "@/lib/ai";

/**
 * POST /api/revisor
 *
 * 根据评估反馈修正审查报告
 * 接收 { code, report, feedback }，返回修正后的最终报告
 */
export async function POST(request: Request) {
  try {
    const { code, report, feedback } = (await request.json()) as {
      code: string;
      report: string;
      feedback: string;
    };

    // 参数校验
    if (!code || code.trim().length === 0) {
      return Response.json(
        { error: "请提供原始代码" },
        { status: 400 }
      );
    }

    if (!report || report.trim().length === 0) {
      return Response.json(
        { error: "请提供原审查报告" },
        { status: 400 }
      );
    }

    if (!feedback || feedback.trim().length === 0) {
      return Response.json(
        { error: "请提供评估反馈" },
        { status: 400 }
      );
    }

    const result = await generateText({
      model: MODEL,
      prompt: REVISOR_SYSTEM_PROMPT(code, report, feedback),
    });

    return Response.json({ report: result.text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "修正失败，请稍后重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
