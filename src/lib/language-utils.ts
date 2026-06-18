// ============================================================================
// CodeMirror 语言检测与按需加载
//
// 规则：
//   1. 文件有后缀 → detectByFilename()
//   2. 无后缀   → detectByContent()
//   3. 都失败   → "Plain Text"
//   4. 用户手动选择始终覆盖以上
// ============================================================================

import { LanguageDescription } from "@codemirror/language";
import { languages as allLanguages } from "@codemirror/language-data";

// ── 精选语言列表（数量可控，按需加载） ──────────────────────────

const CURATED = new Set([
  "JavaScript",
  "TypeScript",
  "TSX",
  "JSX",
  "Python",
  "Java",
  "Go",
  "C++",
  "Rust",
  "CSS",
  "HTML",
  "JSON",
  "Markdown",
  "Vue",
  "XML",
  "SQL",
]);

/** 精选后的 LanguageDescription 数组 */
export const DETECTABLE = allLanguages.filter((d) => CURATED.has(d.name));

// ── 文件名 → 语言 ──────────────────────────────────────────────

export function detectByFilename(
  filename: string
): LanguageDescription | null {
  return LanguageDescription.matchFilename(DETECTABLE, filename);
}

// ── 内容特征 → 语言 ────────────────────────────────────────────

const SHEBANG_MAP: Record<string, string> = {
  python: "Python",
  python3: "Python",
  node: "JavaScript",
  ruby: "Ruby",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
};

export function detectByContent(code: string): LanguageDescription | null {
  const firstLine = code.split("\n")[0]?.trim() ?? "";

  // ① shebang
  if (firstLine.startsWith("#!")) {
    for (const [key, name] of Object.entries(SHEBANG_MAP)) {
      if (firstLine.includes(key)) {
        return DETECTABLE.find((d) => d.name === name) ?? null;
      }
    }
  }

  // ② 特征首行
  if (/^<\?(php|xml)/i.test(firstLine)) return null; // 不在精选里
  if (/^<\?xml/i.test(firstLine))
    return DETECTABLE.find((d) => d.name === "XML") ?? null;
  if (/^<!doctype\s+html/i.test(firstLine))
    return DETECTABLE.find((d) => d.name === "HTML") ?? null;

  return null;
}

// ── 按需加载 ───────────────────────────────────────────────────

/**
 * 加载语言支持。调用 desc.load() 会触发对应 @codemirror/lang-* 的
 * 动态 import，不会打入初始 bundle。
 */
export function loadLanguageSupport(
  desc: LanguageDescription
): ReturnType<typeof desc.load> {
  return desc.load();
}
