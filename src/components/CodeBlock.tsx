"use client";

import { useState, useCallback, isValidElement, type FC, type ReactNode } from "react";

// ============================================================================
// 纯 React 文本提取 — 不碰 DOM，零 XSS 风险
// ============================================================================

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

// ============================================================================
// 语言名展示映射
// ============================================================================

const LANG_DISPLAY: Record<string, string> = {
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  py: "Python",
  java: "Java",
  go: "Go",
  rs: "Rust",
  cpp: "C++",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  json: "JSON",
  md: "Markdown",
  vue: "Vue",
  xml: "XML",
  sql: "SQL",
  sh: "Shell",
  bash: "Bash",
  yaml: "YAML",
  toml: "TOML",
  php: "PHP",
  rb: "Ruby",
  swift: "Swift",
  kt: "Kotlin",
  dart: "Dart",
  graphql: "GraphQL",
  prisma: "Prisma",
  plaintext: "Plain Text",
  text: "Plain Text",
};

// ============================================================================
// CodeBlock — 覆盖 react-markdown 的 <pre>
// ============================================================================

export const CodeBlock: FC<{ children?: ReactNode }> = ({ children }) => {
  const [copied, setCopied] = useState(false);

  // 从 <code> 子元素提取语言名
  let lang = "";
  if (isValidElement(children)) {
    const className =
      ((children.props as Record<string, unknown>).className as string) ?? "";
    const m = className.match(/language-(\S+)/);
    if (m) lang = m[1].toLowerCase();
  }
  const displayLang = LANG_DISPLAY[lang] ?? lang;

  const handleCopy = useCallback(async () => {
    const text = extractText(children);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 非 HTTPS 或无权限时静默失败
    }
  }, [children]);

  return (
    <div className="group/code my-4 rounded-xl border border-line overflow-hidden">
      {/* 顶部白条 — 语言名 + 复制按钮 */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#dce5de] border-b border-line">
        <span className="text-[11px] font-mono text-muted tracking-wider uppercase select-none">
          {displayLang}
        </span>

        <button
          onClick={handleCopy}
          className={`
            inline-flex items-center gap-1
            text-[11px] transition-colors duration-150
            ${
              copied
                ? "text-teal"
                : "text-muted hover:text-ink"
            }
          `}
        >
          {copied ? (
            <>
              <span>✓</span>
              <span>已复制</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      {/* 代码本体 — 全局样式通过 ! 适配 wrapper */}
      <pre
        className="
          !m-0 !border-0 !rounded-none !bg-[#e5ece6]
          overflow-x-auto p-4
        "
      >
        {children}
      </pre>
    </div>
  );
};
