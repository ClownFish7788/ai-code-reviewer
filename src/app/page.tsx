"use client";

import { useState, type FormEvent } from "react";
import { CodeInput } from "@/components/CodeInput";
import { ReviewResult } from "@/components/ReviewResult";
import type { ReviewPhase } from "@/types";

export default function Home() {
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<ReviewPhase>("idle");
  const [report, setReport] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [iterations, setIterations] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = code.trim().length > 0 && phase === "idle";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setPhase("generating");
    setReport(null);
    setScore(null);
    setIterations(0);
    setError(null);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "请求失败");
      }

      setReport(data.report);
      setScore(data.score);
      setIterations(data.iterations);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setPhase("error");
    }
  };

  return (
    /*
     * 弹性容器架构
     *
     * 外层 flex-col   → 垂直流向（header → 内容 → footer）
     * 中间 flex-row   → 水平流向，为未来分栏 + 拖拽预留
     *   当前只有一个居中面板，后续加入第二面板和分隔条即可
     */
    <div className="flex flex-col min-h-full">
      {/* ================================================================
          Header
          ================================================================ */}
      <header className="shrink-0 px-5 pt-16 pb-10">
        <div className="max-w-[720px] mx-auto">
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            AI Code Reviewer
          </h1>
          <p className="mt-1.5 text-[15px] text-muted leading-relaxed">
            粘贴代码，获取 AI 驱动的专业审查报告
          </p>
        </div>
      </header>

      {/* ================================================================
          主区域 — flex-row 为未来分栏预留
          当前只有一栏，居中展示
          ================================================================ */}
      <div className="flex flex-1 justify-center px-5">
        {/* 左/主面板 — 未来可与右侧面板并排 */}
        <main className="flex flex-col gap-6 w-full max-w-[720px] pb-16">
          <form onSubmit={handleSubmit}>
            <CodeInput
              value={code}
              onChange={setCode}
              disabled={phase !== "idle"}
            />

            {/* 操作栏 */}
            <div className="mt-5 flex items-center gap-4">
              <button
                type="submit"
                disabled={!canSubmit}
                className={`
                  inline-flex items-center gap-2
                  px-5 py-2.5
                  text-[15px] font-medium
                  rounded-full
                  transition-all duration-300 ease-out
                  ${
                    canSubmit
                      ? "bg-teal text-white hover:bg-teal-hover hover:shadow-[0_0_24px_rgba(91,154,139,0.2)] active:scale-[0.98]"
                      : "bg-line text-muted cursor-not-allowed"
                  }
                `}
              >
                开始审查
              </button>

              {code.length > 0 && phase === "idle" && (
                <button
                  type="button"
                  onClick={() => setCode("")}
                  className="text-[14px] text-muted hover:text-sage transition-colors duration-200"
                >
                  清空
                </button>
              )}
            </div>
          </form>

          {/* 加载态 */}
          {phase === "generating" && (
            <div className="flex items-center gap-3 py-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse-dot" />
              <span className="text-[15px] text-sage">
                AI 正在审查你的代码…
              </span>
            </div>
          )}

          {/* 错误态 */}
          {phase === "error" && error && (
            <div className="flex flex-col gap-3 py-6 animate-fade-in">
              <p className="text-[15px] text-coral">{error}</p>
              <button
                onClick={() => setPhase("idle")}
                className="text-[14px] text-teal hover:text-teal-hover transition-colors duration-200 self-start"
              >
                重试
              </button>
            </div>
          )}

          {/* 结果 */}
          {phase === "done" && report && (
            <ReviewResult
              report={report}
              score={score}
              iterations={iterations}
            />
          )}
        </main>
      </div>

      {/* ================================================================
          Footer
          ================================================================ */}
      <footer className="shrink-0 pb-4 text-center text-[13px] text-muted">
        Powered by DeepSeek + Next.js
      </footer>
    </div>
  );
}
