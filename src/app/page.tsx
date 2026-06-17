"use client";

import { useState, type FormEvent } from "react";
import { CodeInput } from "@/components/CodeInput";
import { ReviewResult } from "@/components/ReviewResult";
import { useReviewer } from "@/hooks/useReviewer";

export default function Home() {
  const [code, setCode] = useState("");
  const { status, phase, result, error, trigger, reset } = useReviewer();

  const canSubmit = code.trim().length > 0 && status === "idle";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    trigger(code);
  };

  const handleClear = () => {
    setCode("");
    reset();
  };

  return (
    /*
     * 布局约束
     * h-screen overflow-hidden → 页面不滚动
     * 每个 flex-1 节点配 min-h-0 → 内部才能正确溢出滚动
     */
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ================================================================
          Header — shrink-0 固定高度
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
          水平双栏 — flex-1 + min-h-0 是关键
          min-h-0 允许 flex 子元素缩小到内容高度以下，从而触发内部滚动
          ================================================================ */}
      <div className="flex flex-1 gap-4 px-6 pb-6 min-h-0">
        {/* 左栏 */}
        <section className="flex flex-1 flex-col min-w-0 min-h-0">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0"
          >
            <CodeInput
              value={code}
              onChange={setCode}
              disabled={status !== "idle"}
            />

            <div className="mt-4 flex items-center gap-4 shrink-0">
              <button
                type="submit"
                disabled={!canSubmit}
                className={`
                  inline-flex items-center gap-2
                  px-5 py-2.5 text-[15px] font-medium rounded-full
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

              {code.length > 0 && status === "idle" && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[14px] text-muted hover:text-sage transition-colors duration-200"
                >
                  清空
                </button>
              )}
            </div>
          </form>
        </section>

        {/* 右栏 */}
        <section className="flex flex-1 flex-col min-w-0 min-h-0">
          {status === "idle" && (
            <div className="flex flex-1 items-center justify-center min-h-0">
              <p className="text-[15px] text-muted">
                审查报告将在这里显示
              </p>
            </div>
          )}

          {status === "loading" && (
            <div className="flex items-center gap-3 py-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse-dot" />
              <span className="text-[15px] text-sage">
                {phase || "AI 正在审查你的代码…"}
              </span>
            </div>
          )}

          {status === "error" && error && (
            <div className="flex flex-col gap-3 py-6 animate-fade-in">
              <p className="text-[15px] text-coral">{error}</p>
              <button
                onClick={reset}
                className="text-[14px] text-teal hover:text-teal-hover transition-colors duration-200 self-start"
              >
                重试
              </button>
            </div>
          )}

          {status === "done" && result && (
            <ReviewResult
              report={result.report}
              score={null}
              iterations={result.iterations}
            />
          )}
        </section>
      </div>
    </div>
  );
}
