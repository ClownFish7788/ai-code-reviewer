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
  status: ReviewerStatus;
  /** 当前阶段描述 */
  phase: string;
  result: ReviewerResult | null;
  error: string | null;
  trigger: (code: string) => void;
  reset: () => void;
}

/* =========================================================================
   阶段描述映射
   ========================================================================= */

const PHASE_LABELS: Record<string, string> = {
  review: "正在生成审查报告…",
  evaluate: "正在评估报告质量…",
  revise: "正在修正并输出最终报告…",
};

/* =========================================================================
   Hook
   ========================================================================= */

export function useReviewer(): UseReviewerReturn {
  const [status, setStatus] = useState<ReviewerStatus>("idle");
  const [phase, setPhase] = useState("");
  const [result, setResult] = useState<ReviewerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const pendingRef = useRef(false);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    pendingRef.current = false;

    setStatus("idle");
    setPhase("");
    setResult(null);
    setError(null);
  }, []);

  const trigger = useCallback(
    (code: string) => {
      if (pendingRef.current) return;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      pendingRef.current = true;

      setStatus("loading");
      setPhase(PHASE_LABELS.review);
      setResult(null);
      setError(null);

      // ── Stream consumer ──────────────────────────────────────
      let accumulated = "";

      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error ?? "请求失败");
          }

          const reader = res.body?.getReader();
          if (!reader) throw new Error("响应体为空");

          const decoder = new TextDecoder();
          let leftover = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = leftover + decoder.decode(value, { stream: true });
            const lines = text.split("\n");
            leftover = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;

              let msg: { type: string; [k: string]: unknown };
              try {
                msg = JSON.parse(line.slice(6));
              } catch {
                continue;
              }

              switch (msg.type) {
                case "phase":
                  setPhase(PHASE_LABELS[msg.phase as string] ?? "");
                  break;

                case "chunk":
                  // 逐 token 追加，直接 setState
                  // reader.read() 是天然的 yield 点，每个 TCP 帧触发一次渲染
                  accumulated += msg.text as string;
                  setResult({ report: accumulated, iterations: 0 });
                  break;

                case "done":
                  setResult((prev) => ({
                    report: prev?.report ?? accumulated,
                    iterations: (msg.iterations as number) ?? 0,
                  }));
                  setStatus("done");
                  break;

                case "error":
                  setError((msg.error as string) ?? "未知错误");
                  setStatus("error");
                  break;
              }
            }
          }
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "未知错误");
          setStatus("error");
        })
        .finally(() => {
          pendingRef.current = false;
          controllerRef.current = null;
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { status, phase, result, error, trigger, reset };
}
