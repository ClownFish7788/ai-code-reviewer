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
     * 布局架构 — 水平分栏
     *
     * ┌──────────────────────────────────────────┐
     * │  Header                                   │
     * ├────────────────────┬─────────────────────┤
     * │                    │                     │
     * │  左栏（代码输入）    │  右栏（审查结果）     │
     * │                    │                     │
     * └────────────────────┴─────────────────────┘
     *
     * 两栏等宽（flex-1），中间空隙未来放拖拽手柄
     */
    <div className="flex flex-col h-full">
      {/* ================================================================
          Header
          ================================================================ */}
      <header className="shrink-0 px-6 pt-12 pb-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          AI Code Reviewer
        </h1>
        <p className="mt-1.5 text-[15px] text-muted leading-relaxed">
          粘贴代码，获取 AI 驱动的专业审查报告
        </p>
      </header>

      {/* ================================================================
          水平双栏 — 等宽，空隙为未来拖拽预留
          ================================================================ */}
      <div className="flex flex-1 gap-4 px-6 pb-6 min-h-0">
        {/* 左栏：代码输入 */}
        <section className="flex flex-1 flex-col min-w-0">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <CodeInput
              value={code}
              onChange={setCode}
              disabled={phase !== "idle"}
            />

            <div className="mt-4 flex items-center gap-4 shrink-0">
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
        </section>

        {/* 右栏：审查结果 / 占位 / 加载 / 错误 */}
        <section className="flex flex-1 flex-col min-w-0">
          {phase === "idle" && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-[15px] text-muted">
                审查报告将在这里显示
              </p>
            </div>
          )}

          {phase === "generating" && (
            <div className="flex items-center gap-3 py-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse-dot" />
              <span className="text-[15px] text-sage">
                AI 正在审查你的代码…
              </span>
            </div>
          )}

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

          {phase === "done" && report && (
            <ReviewResult
              report={report}
              score={score}
              iterations={iterations}
            />
          )}
        </section>
      </div>
    </div>
  );
}
