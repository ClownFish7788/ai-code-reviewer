"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { type Extension } from "@codemirror/state";
import { CodeInput } from "@/components/CodeInput";
import { FileDropOverlay } from "@/components/FileDropOverlay";
import { ReviewResult } from "@/components/ReviewResult";
import { useReviewer } from "@/hooks/useReviewer";
import {
  DETECTABLE,
  detectByFilename,
  detectByContent,
  loadLanguageSupport,
} from "@/lib/language-utils";

export default function Home() {
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { status, phase, result, error, trigger, reset } = useReviewer();

  // ── 语言状态 ────────────────────────────────────────────────
  const [languageName, setLanguageName] = useState("");
  const [languageExt, setLanguageExt] = useState<Extension>([]);
  const userPickedRef = useRef(false);

  const canSubmit = code.trim().length > 0 && status === "idle";

  // ── 文件拖入 → 后缀名自动检测 ────────────────────────────
  useEffect(() => {
    if (!filename) return;
    userPickedRef.current = false;

    const desc = detectByFilename(filename);
    if (desc) {
      setLanguageName(desc.name);
      loadLanguageSupport(desc).then(setLanguageExt);
    } else {
      setLanguageName("Plain Text");
      setLanguageExt([]);
    }
  }, [filename]);

  // ── 无文件名时 → 内容特征检测（仅首次/大段粘贴触发） ──
  const contentCheckedRef = useRef(false);
  const prevLenRef = useRef(0);
  useEffect(() => {
    if (filename) return;
    if (!code.trim()) {
      contentCheckedRef.current = false;
      prevLenRef.current = 0;
      return;
    }
    if (contentCheckedRef.current) return;

    const prevLen = prevLenRef.current;
    const delta = code.length - prevLen;
    prevLenRef.current = code.length;

    // 已有内容 + 增量 < 50 字符 → 逐字输入，跳过
    if (prevLen > 0 && delta < 50) return;

    contentCheckedRef.current = true;
    const desc = detectByContent(code);
    if (desc) {
      setLanguageName(desc.name);
      loadLanguageSupport(desc).then(setLanguageExt);
    }
  }, [code, filename]);

  // ── 用户手动切换 ─────────────────────────────────────────
  const handleLanguageChange = async (name: string) => {
    userPickedRef.current = true;
    setLanguageName(name);
    if (name === "Plain Text") {
      setLanguageExt([]);
      return;
    }
    const desc = DETECTABLE.find((d) => d.name === name);
    if (desc) {
      const support = await loadLanguageSupport(desc);
      setLanguageExt(support);
    }
  };

  // ── 提交 / 清空 ──────────────────────────────────────────
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    trigger(code);
  };

  const handleClear = () => {
    setCode("");
    setFilename("");
    setLanguageName("Plain Text");
    setLanguageExt([]);
    reset();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ================================================================ */}
      <header className="shrink-0 px-6 pt-12 pb-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          AI Code Reviewer
        </h1>
        <p className="mt-1.5 text-[15px] text-muted leading-relaxed">
          粘贴代码，获取 AI 驱动的专业审查报告
        </p>
      </header>

      {/* ================================================================ */}
      <div className="flex flex-1 gap-4 px-6 pb-6 min-h-0">
        <section className="flex flex-1 flex-col min-w-0 min-h-0">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* 顶部信息栏 — 文件名 + 语言选择器 */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              {filename ? (
                <span className="inline-flex items-center gap-1.5 animate-fade-in">
                  <span className="text-[13px]">📄</span>
                  <span className="text-[12px] text-sage font-mono">
                    {filename}
                  </span>
                </span>
              ) : (
                <span />
              )}

              <select
                value={languageName}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="
                  text-[12px] text-sage
                  bg-transparent border border-line rounded-md
                  px-2 py-1
                  outline-none
                  focus:border-line-focus focus:ring-1 focus:ring-line-focus/50
                  cursor-pointer
                  ml-auto
                "
              >
                <option value="Plain Text">Plain Text</option>
                {DETECTABLE.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              ref={wrapperRef}
              className="relative flex flex-col flex-1 min-h-0"
            >
              <CodeInput
                value={code}
                onChange={setCode}
                disabled={status !== "idle"}
                languageExt={languageExt}
              />

              <FileDropOverlay
                containerRef={wrapperRef}
                setCode={setCode}
                status={status}
                onReset={reset}
                setFilename={setFilename}
              />
            </div>

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
