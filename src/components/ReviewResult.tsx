"use client";

import { type FC } from "react";

interface ReviewResultProps {
  report: string;
  score: number | null;
  iterations: number;
}

/**
 * 审查结果展示
 * Sprint 3 将替换为 Markdown 渲染 + 代码高亮
 */
export const ReviewResult: FC<ReviewResultProps> = ({
  report,
  score,
  iterations,
}) => {
  if (!report) return null;

  return (
    <div className="w-full animate-fade-in">
      {/* 元信息行 */}
      <div className="flex items-center gap-4 mb-4 text-sm text-sage">
        {score !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs tracking-widest text-muted">评分</span>
            <span className="font-semibold text-ink tabular-nums">{score}</span>
            <span className="text-muted">/ 10</span>
          </span>
        )}
        <span className="text-muted">·</span>
        <span>
          <span className="text-xs tracking-widest text-muted">迭代 </span>
          <span className="font-semibold text-ink tabular-nums">
            {iterations}
          </span>
          <span className="text-muted"> 轮</span>
        </span>
      </div>

      {/* 报告正文 */}
      <div
        className="
          bg-surface
          rounded-xl
          border border-line
          px-6 py-5
          font-mono text-[14px] leading-relaxed
          text-ink
          whitespace-pre-wrap
          max-h-[600px] overflow-y-auto
        "
      >
        {report}
      </div>
    </div>
  );
};
