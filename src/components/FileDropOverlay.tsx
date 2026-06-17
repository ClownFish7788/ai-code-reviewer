"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { showToast } from "@/components/Toast";
import type { ReviewerStatus } from "@/hooks/useReviewer";

// ============================================================================
// Types
// ============================================================================

interface FileDropOverlayProps {
  setCode: (code: string) => void;
  status: ReviewerStatus;
  /** 非 idle 状态下确认替换时，先 reset 审查状态 */
  onReset?: () => void;
}

// ============================================================================
// 代码文件格式白名单
// ============================================================================

const CODE_EXTENSIONS = new Set([
  "js", "mjs", "cjs", "ts", "jsx", "tsx", "vue", "svelte", "astro",
  "py", "pyw", "java", "go", "rs", "c", "cpp", "cc", "cxx", "h", "hpp", "hh",
  "css", "scss", "less", "html", "htm", "json", "yaml", "yml", "toml",
  "md", "mdx", "sql", "sh", "bash", "zsh", "rb", "php", "swift", "kt", "kts",
  "xml", "svg", "graphql", "gql", "prisma", "txt", "env",
  "r", "scala", "ex", "exs", "dart", "lua", "pl", "pm",
]);

const NAMELESS_FILES = new Set([
  "dockerfile", "makefile", ".gitignore", ".env", ".editorconfig",
  ".eslintrc", ".prettierrc", ".nvmrc",
]);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function isValidCodeFile(file: File): boolean {
  // ① 扩展名命中
  if (extensionOf(file.name) && CODE_EXTENSIONS.has(extensionOf(file.name))) {
    return true;
  }

  // ② 无扩展名的常见配置文件
  if (NAMELESS_FILES.has(file.name.toLowerCase())) return true;

  // ③ MIME 兜底
  const t = file.type;
  if (
    t.startsWith("text/") ||
    t === "application/json" ||
    t === "application/javascript" ||
    t === "application/xml" ||
    t === "application/x-sh"
  ) {
    return true;
  }

  return false;
}

// ============================================================================
// Component
// ============================================================================

export function FileDropOverlay({
  setCode,
  status,
  onReset,
}: FileDropOverlayProps) {
  const [dragging, setDragging] = useState(false);
  const counterRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // ── 拖入/离开用计数器防止子元素抖动 ──────────────────────────

  const handleEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearTimer();
      counterRef.current++;
      setDragging(true);
    },
    [clearTimer]
  );

  const handleLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      counterRef.current--;
      if (counterRef.current <= 0) {
        counterRef.current = 0;
        clearTimer();
        // 短延时兜底：避免父→子瞬间 leave→enter 导致的闪屏
        timerRef.current = setTimeout(() => setDragging(false), 60);
      }
    },
    [clearTimer]
  );

  const handleOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // ── 释放 — 读取文件 + 校验 + 写入 ────────────────────────────

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      counterRef.current = 0;
      clearTimer();
      setDragging(false);

      const files = e.dataTransfer.files;
      if (!files.length) return;

      const file = files[0]; // 只取第一个

      if (!isValidCodeFile(file)) {
        showToast("error", "不支持的文件格式，请拖入代码文件");
        return;
      }

      let text: string;
      try {
        text = await file.text();
      } catch {
        showToast("error", "文件读取失败，请重试");
        return;
      }

      if (!text.trim()) {
        showToast("warning", "文件内容为空");
        return;
      }

      if (status === "idle") {
        setCode(text);
        showToast("success", `已加载 ${file.name}`);
      } else {
        showToast(
          "warning",
          `当前正在审查中，替换为「${file.name}」将清空审查结果，是否继续？`,
          true,
          () => {
            onReset?.();
            // 略延后确保 reset 的 state 先落地
            setTimeout(() => setCode(text), 50);
          }
        );
      }
    },
    [setCode, status, onReset, clearTimer]
  );

  // ── Render ─────────────────────────────────────────────────────

  if (!dragging) return null;

  return (
    <div
      className="absolute inset-0 z-10 rounded-xl
        bg-teal-subtle/70 backdrop-blur-sm
        border-[2.5px] border-dashed border-teal
        flex flex-col items-center justify-center gap-3
        animate-toast-scale-in"
      onDragEnter={handleEnter}
      onDragLeave={handleLeave}
      onDragOver={handleOver}
      onDrop={handleDrop}
    >
      <span className="text-3xl">📂</span>
      <span className="text-[15px] text-teal font-medium">
        释放文件以上传
      </span>
      <span className="text-[13px] text-sage">
        支持 .js .ts .vue .py .java 等常见代码文件
      </span>
    </div>
  );
}
