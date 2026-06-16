import { GENERATOR_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateText } from "ai";
import { deepseek } from '@ai-sdk/deepseek'

/**
 * POST /api/review
 *
 * Sprint 1 版本：单次审查（暂不包含 Evaluator-Optimizer 循环）
 * 接收代码片段，返回 AI 审查报告
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

    const result = await generateText({
      model: deepseek(process.env.DEFAULT || 'deepseek-chat'),
      prompt: GENERATOR_SYSTEM_PROMPT(code),
    });

    return Response.json({
      report: result.text,
      score: null, // Sprint 2 加入评估器后会填充
      iterations: 1,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "未知错误，请稍后重试";
    return Response.json({ error: message }, { status: 500 });
  }
}
