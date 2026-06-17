import { reviewCode } from "@/lib/reviewer";

/**
 * POST /api/analyze
 *
 * SSE 流式总入口 — 执行完整的 Evaluator-Optimizer 循环
 * 实时推送阶段变化和 revise 输出的 token 流
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

    // SSE 响应头
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const write = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          const result = await reviewCode(code, {
            onPhase: (phase) => write({ type: "phase", phase }),
            onChunk: (text) => write({ type: "chunk", text }),
          });

          write({ type: "done", iterations: result.iterations });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "分析失败，请稍后重试";
          write({ type: "error", error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "请求解析失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
