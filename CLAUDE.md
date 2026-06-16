# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # 开发服务器 (Turbopack)
npm run build    # 生产构建 + 类型检查
npm run lint     # ESLint
npm run start    # 启动生产服务器
```

## Architecture

**Project**: AI Code Reviewer — 粘贴代码 → AI 审查 → 展示报告。未来计划实现 Evaluator-Optimizer Agent 循环（Generator → Evaluator → Revisor 多轮优化）。

**Tech stack**: Next.js 16.2 (App Router + Turbopack), React 19, Tailwind CSS v4, CodeMirror 6, `@ai-sdk/deepseek` (Vercel AI SDK), TypeScript。

### Data flow

```
page.tsx (client component, manages all state)
  ├── CodeInput → CodeMirror 6 (left panel)
  ├── ReviewResult (right panel)
  └── POST /api/review → generateText(@ai-sdk/deepseek) → returns { report, score, iterations }
```

State machine: `idle → generating → done | error` (Sprint 1, single-pass). Future Sprints add `evaluating` / `revising` phases for the multi-round loop.

### Layout: flex constraints (CRITICAL)

The page uses `h-screen overflow-hidden` — **no page-level scrollbar ever**. All scrolling is internal.

```
h-screen overflow-hidden
├── header (shrink-0)
└── flex flex-1 min-h-0          ← horizontal split (left code / right result)
    ├── section min-h-0          ← left panel
    │   └── form min-h-0
    │       ├── CodeMirror (flex-1 min-h-0)  ← editor scrolls internally
    │       └── buttons (shrink-0)
    └── section min-h-0          ← right panel
        └── ReviewResult (flex-1 min-h-0)
            ├── meta row (shrink-0)
            └── report body (overflow-y-auto)  ← scrolls internally
```

**Rule**: Every node in the chain must have `min-h-0` where it passes through a `flex-1`. Without it, flex children default to `min-height: auto` and content pushes the page taller, defeating `overflow: hidden`.

The `gap-4` between the two panels is intentionally left as the future location for a drag-to-resize handle.

## Design System — "Misty Mint"

All colors are defined as Tailwind v4 `@theme inline` tokens in `src/app/globals.css`. Use **only** these semantic utility classes, never hardcoded hex values in JSX:

| Token | Utility classes | Usage |
|-------|----------------|-------|
| `--color-mist` | `bg-mist` | Page background |
| `--color-surface` | `bg-surface` | Card/surface backgrounds |
| `--color-input` | `bg-input` | Input fields (CodeMirror bg) |
| `--color-ink` | `text-ink` | Primary text |
| `--color-sage` | `text-sage` | Secondary text |
| `--color-muted` | `text-muted` | Placeholder/disabled text |
| `--color-teal` | `bg-teal`, `text-teal` | Primary accent |
| `--color-teal-hover` | `bg-teal-hover` | Accent hover state |
| `--color-teal-subtle` | `bg-teal-subtle` | Subtle accent backgrounds |
| `--color-line` | `border-line` | Default borders |
| `--color-line-focus` | `border-line-focus` | Focus ring border |
| `--color-coral` | `text-coral` | Error states |

Font: Geist Sans (body) + Geist Mono (code). Loaded in `layout.tsx` via `next/font/google`.

Custom animations defined in globals.css: `animate-fade-in`, `animate-pulse-dot`, `animate-breathe`.

## CodeMirror Integration

`src/components/CodeInput.tsx` wraps CodeMirror 6 with a custom `mistyMintTheme` that matches all design tokens. Key implementation details:

- **Theme**: Uses `EditorView.theme()` with hardcoded hex values matching the global `@theme` tokens. If you change a design token in globals.css, you must also update the corresponding hex in the CodeMirror theme object.
- **Height**: The container div uses `flex-1 min-h-0`, and the CM theme sets `height: 100%` + `.cm-scroller { overflow: auto }`. This makes the editor fill available space and scroll internally.
- **Lifetime**: EditorView is created once on mount (empty deps `useEffect`), destroyed on unmount. External `value` changes sync via `setDoc()` comparing current editor content. `disabled` toggles `contentEditable` directly on the DOM — this avoids rebuilding extensions.
- **Language**: Currently hardcoded to `javascript()` extension. Future: add language detection or a language selector.

## API Route

`POST /api/review` — accepts `{ code: string }`, returns `{ report: string, score: number | null, iterations: number }`.

Currently Sprint 1 (single-pass): uses `generateText()` from `ai` with `@ai-sdk/deepseek`. The prompt references `GENERATOR_SYSTEM_PROMPT` from `src/lib/prompts.ts`.

## Environment Variables

Configured in `.env.local` (gitignored):

- `DEEPSEEK_API_KEY` — DeepSeek API key
- `DEEPSEEK_BASE_URL` — API base URL (default: `https://api.deepseek.com/v1`)
- `DEFAULT_MODEL` — model name (default: `deepseek-chat`)

## Next.js Version Note

This project uses Next.js 16.2 with Turbopack. Per AGENTS.md: "This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."

## Project Roadmap (from README.md)

- **Sprint 1** ✅ 已完成 — 单次 API 调用、页面骨架、CodeMirror 集成
- **Sprint 2** — Evaluator-Optimizer 循环（Generator + Evaluator + Revisor）
- **Sprint 3** — 文件上传、Markdown 渲染、代码高亮、ProgressSteps 组件
- **Sprint 4** — Prisma + SQLite 数据持久化、历史记录侧边栏
- **Sprint 5** — Vercel 部署、文档完善
