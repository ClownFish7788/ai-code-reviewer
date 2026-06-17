"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { showToast } from "@/components/Toast";
import type { ReviewerStatus } from "@/hooks/useReviewer";

// ============================================================================
// Types
// ============================================================================

interface FileDropOverlayProps {
  /** 拖拽事件绑定的容器 ref */
  containerRef: React.RefObject<HTMLDivElement | null>;
  setCode: (code: string) => void;
  status: ReviewerStatus;
  onReset?: () => void;
  setFilename?: (name: string) => void;
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
  if (extensionOf(file.name) && CODE_EXTENSIONS.has(extensionOf(file.name))) {
    return true;
  }
  if (NAMELESS_FILES.has(file.name.toLowerCase())) return true;
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
  containerRef,
  setCode,
  status,
  onReset,
  setFilename,
}: FileDropOverlayProps) {
  const [dragging, setDragging] = useState(false);
  const counterRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Props 走 ref 避免 useEffect 反复重绑
  const setCodeRef = useRef(setCode);
  setCodeRef.current = setCode;
  const statusRef = useRef(status);
  statusRef.current = status;
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;
  const setFilenameRef = useRef(setFilename);
  setFilenameRef.current = setFilename;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // ── 捕获阶段绑定 — CodeMirror 收不到事件 ──────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleEnter = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      clearTimer();
      counterRef.current++;
      setDragging(true);
    };

    const handleLeave = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      counterRef.current--;
      if (counterRef.current <= 0) {
        counterRef.current = 0;
        clearTimer();
        timerRef.current = setTimeout(() => setDragging(false), 60);
      }
    };

    const handleOver = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      counterRef.current = 0;
      clearTimer();
      setDragging(false);

      const files = e.dataTransfer?.files;
      if (!files?.length) return;

      const file = files[0];

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

      if (statusRef.current === "idle") {
        setCodeRef.current(text);
        setFilenameRef.current?.(file.name);
        showToast("success", `已加载 ${file.name}`);
      } else {
        showToast(
          "warning",
          `当前正在审查中，替换为「${file.name}」将清空审查结果，是否继续？`,
          true,
          () => {
            onResetRef.current?.();
            setFilenameRef.current?.(file.name);
            setTimeout(() => setCodeRef.current(text), 50);
          }
        );
      }
    };

    el.addEventListener("dragenter", handleEnter, true);
    el.addEventListener("dragleave", handleLeave, true);
    el.addEventListener("dragover", handleOver, true);
    el.addEventListener("drop", handleDrop, true);

    return () => {
      el.removeEventListener("dragenter", handleEnter, true);
      el.removeEventListener("dragleave", handleLeave, true);
      el.removeEventListener("dragover", handleOver, true);
      el.removeEventListener("drop", handleDrop, true);
    };
  }, [containerRef, clearTimer]);

  // ── 纯视觉蒙层，pointer-events-none，不参与事件 ───────────────

  return (
    <div
      className={`
        absolute inset-0 z-10 rounded-xl
        flex flex-col items-center justify-center gap-3
        pointer-events-none transition-all duration-200
        ${
          dragging
            ? "opacity-100 bg-teal-subtle/70 backdrop-blur-sm border-[2.5px] border-dashed border-teal"
            : "opacity-0 bg-transparent border-transparent"
        }
      `}
    >
      {dragging && (
        <>
          <span className="text-3xl animate-toast-scale-in">📂</span>
          <span className="text-[15px] text-teal font-medium animate-toast-scale-in">
            释放文件以上传
          </span>
          <span className="text-[13px] text-sage animate-toast-scale-in">
            支持 .js .ts .vue .py .java 等常见代码文件
          </span>
        </>
      )}
    </div>
  );
}
