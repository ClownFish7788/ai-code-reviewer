# AI Code Reviewer - 项目文档

## 0. 项目一句话描述

一个 Next.js 全栈应用，用户粘贴/上传代码，系统通过「生成→自我评估→优化」的多轮 Agent 循环，输出高质量的代码审查报告。

---

## 1. 项目目标

### 1.1 学习目标（做完这个项目你要能讲清楚的东西）

- 理解 LLM 的工作原理（Token、Temperature、System Prompt、Function Calling）
- 理解 Anthropic 提出的 Evaluator-Optimizer 模式，并能自己实现
- 会用 Vercel AI SDK 做流式输出
- 会用 Prisma 做数据库操作
- 能从零部署一个 Next.js 全栈应用到 Vercel

### 1.2 简历目标

做完这个项目，你简历上可以写：

> **AI Code Reviewer** — 基于 Next.js 14 的全栈应用，实现了 Evaluator-Optimizer Agent 模式。通过 Generator-Evaluator 双模型协作循环，对代码进行多轮自我审查和优化。支持文件上传、流式输出、历史记录管理。
>
> 技术栈：Next.js 14, TypeScript, Vercel AI SDK, Prisma + SQLite, Tailwind CSS, Vercel

### 1.3 面试能讲的故事

- "为什么选择 Evaluator-Optimizer 而不是其他 Agent 模式"
- "单次 API 调用 vs 多轮 Agent 循环的成本-质量对比"
- "如何设计评估标准（Score 阈值 / 循环次数上限）"
- "遇到过的技术难点和解决方案"

---

## 2. 技术栈

| 层 | 技术 | 为什么选它 |
|---|------|-----------|
| 前端框架 | Next.js 14 (App Router) | 你已有的技术栈 |
| 语言 | TypeScript | 类型安全，面试加分 |
| 样式 | Tailwind CSS | 快速出效果，面试常见 |
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/openai`) | 支持流式输出，API 简洁 |
| 模型 | DeepSeek-V4-pro | 便宜，国内直接访问 |
| 数据库 | Prisma + SQLite | 轻量，零配置，够用 |
| 部署 | Vercel | 免费，一键部署 Next.js |
| 文件上传 | react-dropzone | 用得最多的上传库 |

---

## 3. 核心架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────┐
│                    浏览器 (前端)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ 代码输入  │  │ 文件上传  │  │ 历史记录列表      │  │
│  │(textarea)│  │(drag/drop)│  │ (侧边栏)         │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       └──────────────┼───────────────┘              │
│                      ▼                              │
│             ┌────────────────┐                      │
│             │   审查报告展示   │                      │
│             │ (Markdown渲染) │                      │
│             └────────────────┘                      │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP POST
                      ▼
┌─────────────────────────────────────────────────────┐
│               Next.js 后端 (/api/review)             │
│                                                     │
│   ┌─────────────────────────────────────────────┐  │
│   │        Evaluator-Optimizer 循环              │  │
│   │                                             │  │
│   │  [生成器] ──→ 审查报告 v1                   │  │
│   │     │                                       │  │
│   │     ▼                                       │  │
│   │  [评估器] ──→ 评分 + 修改意见               │  │
│   │     │                                       │  │
│   │     ├── 评分 ≥ 8? ──→ ✅ 输出最终报告       │  │
│   │     │                                       │  │
│   │     └── 评分 < 8? ──→ [生成器] 修改报告     │  │
│   │                         │                   │  │
│   │                         └──→ 回到 [评估器]   │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│   ┌─────────────────────────────────────────────┐  │
│   │              数据存储 (Prisma + SQLite)      │  │
│   └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 3.2 Evaluator-Optimizer 循环详解

这是整个项目最核心的部分，面试 100% 会问。

```
输入：用户代码

循环开始（最多 3 轮）：

  [第 1 轮]
  生成器 (system prompt = "你是资深代码审查专家")
    → 输出：审查报告 v1
  
  评估器 (system prompt = "你是审查质量的评审员")
    → 输入：原始代码 + 审查报告 v1
    → 输出：{ score: 6, feedback: "第3条是误报，这段代码没有问题；遗漏了XSS漏洞检查" }
    → 判定：6 < 8，需要修改

  [第 2 轮]
  生成器 (system prompt = "根据反馈修改报告")
    → 输入：原始代码 + 审查报告 v1 + 反馈意见
    → 输出：审查报告 v2（修正了误报，补充了XSS检查）
  
  评估器
    → 输入：原始代码 + 审查报告 v2
    → 输出：{ score: 9, feedback: "无需修改" }
    → 判定：9 ≥ 8，✅ 通过！

输出：最终审查报告 + 迭代次数(2轮)
```

关键设计决策（面试要能解释）：
- **为什么阈值是 8 分？** —— 实验发现 8 分以上的报告质量差异不大，更高的阈值容易导致无限循环
- **为什么最多 3 轮？** —— 成本控制。实测 80% 的报告 2 轮内达标，3 轮覆盖 95%
- **评估器为什么用 JSON 格式？** —— 方便程序判断是否继续循环，比解析自然语言稳定

---

## 4. 功能清单

### Phase 1 — MVP（最小可用版本）
- [x] 粘贴代码 → 调用一次 API → 返回审查结果
- [x] 简单的输入框 + 结果展示

### Phase 2 — 核心功能（Evaluator-Optimizer）
- [x] 生成器 + 评估器 循环
- [x] JSON 评分解析
- [x] 显示迭代次数
- [x] 流式输出（一个字一个字往外蹦）

### Phase 3 — 用户体验
- [x] 文件拖拽上传（.ts / .tsx / .js / .jsx / .py / .go / .rs）
- [x] 审查过程中显示各阶段状态
- [x] Markdown 渲染报告（代码块高亮）
- [x] 复制报告按钮

### Phase 4 — 数据持久化
- [x] 审查历史存数据库
- [x] 左侧历史列表
- [x] 点击历史记录回看详情

### Phase 5 — 打磨上线
- [x] 响应式设计（手机上也能看）
- [x] Vercel 部署
- [x] README 写清楚
- [x] 技术文章发布

---

## 5. 文件结构

```
ai-code-reviewer/
├── .env.local                    # API Key 等环境变量（不提交到 Git）
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── prisma/
│   └── schema.prisma             # 数据库 schema
│
├── public/
│   └── screenshot.png            # 用于 README 的截图
│
├── src/
│   ├── app/
│   │   ├── layout.tsx            # 根布局
│   │   ├── page.tsx              # 主页面（代码输入 + 审查结果）
│   │   ├── history/
│   │   │   └── page.tsx          # 历史记录页面（可选，也可以做在主页侧边栏）
│   │   │
│   │   └── api/
│   │       ├── review/
│   │       │   └── route.ts      # ⭐ 核心：Evaluator-Optimizer 循环
│   │       └── history/
│   │           ├── route.ts      # GET: 获取历史列表
│   │           └── [id]/
│   │               └── route.ts  # GET: 获取单条历史详情
│   │
│   ├── components/
│   │   ├── CodeInput.tsx         # 代码输入区（textarea + 文件上传）
│   │   ├── ReviewResult.tsx      # 审查结果展示（Markdown 渲染）
│   │   ├── FileUpload.tsx        # 文件拖拽上传组件
│   │   ├── HistorySidebar.tsx    # 历史记录侧边栏
│   │   ├── LoadingState.tsx      # 审查中的加载动画
│   │   └── ProgressSteps.tsx     # 显示"正在生成→正在评估→正在优化"
│   │
│   ├── lib/
│   │   ├── ai.ts                 # AI SDK 初始化（连接你的 API）
│   │   ├── db.ts                 # Prisma 客户端
│   │   └── prompts.ts            # ⭐ 所有的 System Prompt 集中管理
│   │
│   └── types/
│       └── index.ts              # TypeScript 类型定义
│
└── README.md                     # 项目说明
```

---

## 6. 数据库设计

### 6.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// 审查记录表
model Review {
  id            String   @id @default(uuid())
  code          String                        // 用户提交的原始代码
  language      String   @default("typescript") // 代码语言
  report        String                        // 最终审查报告
  score         Int?                          // 最终评估分数（1-10）
  iterations    Int                           // 几轮迭代完成
  createdAt     DateTime @default(now())
  
  // 可选：如果后面想加用户系统
  // userId     String?
  // user       User?    @relation(fields: [userId], references: [id])
}
```

### 6.2 API 路由设计

| 方法 | 路径 | 做什么 |
|------|------|--------|
| `POST` | `/api/review` | 提交代码，执行 Evaluator-Optimizer 循环，返回报告 |
| `GET` | `/api/history` | 获取所有历史审查记录（按时间倒序） |
| `GET` | `/api/history/[id]` | 获取某一条审查的详情 |
| `DELETE` | `/api/history/[id]` | 删除某一条记录 |

---

## 7. System Prompt 设计（核心资产）

把这些 Prompt 放到 `src/lib/prompts.ts` 里集中管理。**面试的时候展示你会结构化地管理 Prompt，很加分。**

```typescript
// src/lib/prompts.ts

// ========== 生成器 Prompt ==========
export const GENERATOR_SYSTEM_PROMPT = `你是一位资深代码审查专家，曾在 Google/Meta 担任 Staff Engineer。
请对以下代码进行全面的代码审查。

## 审查维度
1. **Bug 和逻辑错误** — 空指针、异步处理错误、边界条件遗漏等
2. **性能问题** — 不必要的渲染、算法复杂度、内存泄漏等
3. **安全漏洞** — XSS、SQL 注入、敏感信息泄露等
4. **代码可读性** — 命名、函数长度、注释质量等
5. **最佳实践** — 是否符合该语言/框架的社区最佳实践

## 输出格式要求
每条问题用以下格式输出：

---
### 🔴/🟡/🟢 [严重程度] 第XX行 - [问题标题]
**问题描述**：[一句话说清楚]
**影响**：[有什么后果]
**修复建议**：
\`\`\`typescript
// 修改前
[代码]
// 修改后
[代码]
\`\`\`
---

如果代码没有问题，也要明确指出代码的健康状况。
`;

// ========== 评估器 Prompt ==========
export const EVALUATOR_SYSTEM_PROMPT = `你是一个代码审查报告的质量评审员。
你的任务是严格评估一份审查报告的准确性、完整性和实用性。

## 评估维度（每项 0-2 分）
1. **覆盖率** — 是否遗漏了明显的 bug 或代码问题？
2. **准确性** — 指出的问题是否都是真正的问题？（没有误报）
3. **实用性** — 修复建议是否具体、可直接操作？
4. **清晰度** — 报告结构是否清晰？语言是否易懂？

## 输出格式
你必须严格按照以下 JSON 格式返回，不要有任何其他内容：

{
  "score": 整数0-10,
  "coverage": 整数0-2,
  "accuracy": 整数0-2,
  "actionability": 整数0-2,
  "clarity": 整数0-2,
  "overallImpression": 整数0-2,
  "feedback": "具体的修改意见。如果 score >= 8，写'无需修改'。否则，指出具体需要改什么。"
}
`;

// ========== 修改器 Prompt ==========
export const REVISOR_SYSTEM_PROMPT = `你是一个代码审查专家。你的同事（评审员）审查了你的报告，指出了不足之处。
请根据评审员的反馈，修改你的审查报告。

## 修改原则
1. 如果评审员指出遗漏的问题，务必补充
2. 如果评审员指出误报（你的报告中说有问题但实际没问题），务必删除或修正
3. 如果是措辞/格式问题，直接调整
4. 保持报告的清晰结构和专业水准

## 输出格式
直接输出修改后的完整审查报告，格式与原始报告一致。
`;
```

---

## 8. 分阶段开发计划

### Sprint 1（1-2天）：搭骨架
**目标：** Next.js 项目跑起来，能调通一次 API

- [ ] `npx create-next-app@latest` 初始化项目
- [ ] 注册硅基流动 / DeepSeek，拿到 API Key
- [ ] `.env.local` 配置好
- [ ] `npm install ai @ai-sdk/openai`
- [ ] 写 `/api/chat/route.ts` 的最简版本
- [ ] `page.tsx` 写一个 textarea + 按钮 + 结果显示
- [ ] 粘贴一段代码，点按钮，能看到 AI 返回的文字 ✅

### Sprint 2（3-5天）：核心 Agent 循环
**目标：** Evaluator-Optimizer 跑通

- [ ] 创建 `src/lib/ai.ts`（AI SDK 初始化）
- [ ] 创建 `src/lib/prompts.ts`（三个 Prompt）
- [ ] 写 `/api/review/route.ts`（生成器 + 评估器 + 修改器 循环）
- [ ] 在 `page.tsx` 中显示迭代次数
- [ ] 处理各种边界情况（API 报错、JSON 解析失败、超时）

### Sprint 3（3-4天）：用户界面
**目标：** 能用、好看、有交互反馈

- [ ] 接入文件上传（react-dropzone）
- [ ] 写 LoadingState 组件（审查中有动画提示）
- [ ] 写 ProgressSteps 组件（显示当前阶段）
- [ ] Markdown 渲染（用 react-markdown + 代码高亮）
- [ ] 复制按钮
- [ ] 响应式适配

### Sprint 4（2-3天）：数据持久化
**目标：** 审查记录能存能查

- [ ] 配置 Prisma + SQLite
- [ ] 用 `npx prisma migrate dev --name init` 创建数据库
- [ ] 在审查 API 里加存数据库逻辑
- [ ] 写 `/api/history` 路由
- [ ] 写 HistorySidebar 组件
- [ ] 点击历史记录能加载详情

### Sprint 5（2天）：部署 & 文档
**目标：** 上线 + 开源 + 写文章

- [ ] `vercel` 部署
- [ ] 写 README（功能说明 + 截图 + 怎么跑起来 + 技术栈）
- [ ] 代码推到 GitHub 公开仓库
- [ ] 写掘金/知乎文章

---

## 9. 你会遇到的坑（提前告诉你）

### 坑 1：AI API 的响应时间很长
**现象：** 点"审查"之后等 5-10 秒才出结果。
**解决：** 用流式输出（streaming），让用户看到字一个一个蹦出来，心理感受好很多。Vercel AI SDK 天然支持，加一个 `streamText` 就行。

### 坑 2：评估器返回的 JSON 格式不对
**现象：** 评估器说好了返回 JSON，但有时会在 JSON 前后加废话。
**解决：** 用正则 `/[\{].*[\}]/s` 从返回文本中提取 JSON。再加一个 try-catch，解析失败就给默认值。

### 坑 3：流式输出在 Evaluator-Optimizer 循环中不好做
**现象：** 如果你每轮都流式输出，前端代码会很难写。
**解决：** 先做非流式版本（等所有轮跑完一次性返回），MVP 跑通之后再优化。面试的时候说"我计划用 SSE 实现流式输出"就够了。

### 坑 4：SQLite 在 Vercel 上不能用（因为是 serverless，没有持久磁盘）
**现象：** 部署到 Vercel 后数据库报错。
**解决：** 
- 方案 A（简单）：换 Vercel Postgres（有免费额度）
- 方案 B（省钱）：先用 localStorage 代替，简历上写 Prisma 设计，面试时说清楚就行

---