"use client";

import { type FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

/* =========================================================================
   Props
   ========================================================================= */

interface ReviewResultProps {
  report: string;
  score: number | null;
  iterations: number;
}

/* =========================================================================
   Component
   ========================================================================= */

/**
 * 审查结果 — react-markdown 渲染，内部滚动
 *
 * 布局约束（不变）：
 *   flex-1 + min-h-0 → 元信息 shrink-0，正文 overflow-y-auto
 */
export const ReviewResult: FC<ReviewResultProps> = ({
  report,
  score,
  iterations,
}) => {
  if (!report) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-fade-in">
      {/* 元信息 */}
      <div className="flex items-center gap-4 mb-4 text-sm text-sage shrink-0">
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

      {/* 报告正文 — 唯一可滚动区域 */}
      <div
        className="
          flex-1 min-h-0
          bg-surface
          rounded-xl
          border border-line
          px-6 py-5
          overflow-y-auto
          markdown-body
        "
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {report}
        </ReactMarkdown>
      </div>
    </div>
  );
};
