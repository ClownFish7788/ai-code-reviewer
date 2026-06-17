"use client";

import { useState, useCallback, useRef } from "react";

/* =========================================================================
   Types
   ========================================================================= */

export type ReviewerStatus = "idle" | "loading" | "done" | "error";

export interface ReviewerResult {
  report: string;
  iterations: number;
}

export interface UseReviewerReturn {
  /** 当前状态 */
  status: ReviewerStatus;
  /** 审查结果 */
  result: ReviewerResult | null;
  /** 错误信息（status === "error" 时） */
  error: string | null;
  /** 触发审查 */
  trigger: (code: string) => void;
  /** 重置到 idle */
  reset: () => void;
}

/* =========================================================================
   Hook
   ========================================================================= */

export function useReviewer(): UseReviewerReturn {
  const [status, setStatus] = useState<ReviewerStatus>("idle");
  const [result, setResult] = useState<ReviewerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 防止重复触发
  const pendingRef = useRef(false);

  const trigger = useCallback((code: string) => {
    if (pendingRef.current) return;

    pendingRef.current = true;
    setStatus("loading");
    setResult(null);
    setError(null);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "请求失败");
        }
        setResult(data);
        setStatus("done");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "未知错误");
        setStatus("error");
      })
      .finally(() => {
        pendingRef.current = false;
      });
  }, []);

  const reset = useCallback(() => {
    if (pendingRef.current) return;
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, trigger, reset };
}
