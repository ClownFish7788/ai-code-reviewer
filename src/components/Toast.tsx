"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// ============================================================================
// Types
// ============================================================================

export type ToastType = "success" | "warning" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  needButton: boolean;
  onConfirm?: () => void;
  exiting: boolean;
}

// ============================================================================
// Module-level store (外部 store，不依赖 React 树)
// ============================================================================

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

function getSnapshot(): ToastItem[] {
  return toasts;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 显示 Toast
 *
 * @param type       - success | warning | error | info（决定配色）
 * @param message    - 展示文本
 * @param needButton - 可选，是否需要确认/取消按钮
 * @param onConfirm  - 可选，确认按钮回调（needButton 为 true 时必传）
 * @returns toast id，可用于手动关闭
 *
 * @example
 *   showToast("error", "不支持的文件格式")
 *   showToast("warning", "确定要替换吗？", true, () => setCode(content))
 */
export function showToast(
  type: ToastType,
  message: string,
  needButton?: boolean,
  onConfirm?: () => void
): number {
  const id = nextId++;
  toasts = [
    ...toasts,
    { id, type, message, needButton: !!needButton, onConfirm, exiting: false },
  ];
  emit();

  // 无按钮 → 2s 后自动滑出
  if (!needButton) {
    setTimeout(() => dismissToast(id), 2200);
  }

  return id;
}

/** 主动关闭指定 toast（会播退出动画） */
export function dismissToast(id: number) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t));
  emit();

  // 动画结束后从数组移除
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 280);
}

// ============================================================================
// Per-type styling (融入 Misty Mint 设计系统)
// ============================================================================

const STYLE: Record<
  ToastType,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: "bg-teal-subtle",
    border: "border-teal",
    text: "text-teal",
    icon: "✓",
  },
  warning: {
    bg: "bg-[#faf6ed]",
    border: "border-[#d4c59b]",
    text: "text-[#7a6b3d]",
    icon: "⚠",
  },
  error: {
    bg: "bg-[#fdf0ef]",
    border: "border-coral",
    text: "text-coral",
    icon: "✕",
  },
  info: {
    bg: "bg-surface",
    border: "border-line",
    text: "text-sage",
    icon: "ℹ",
  },
};

// ============================================================================
// Internal: 无按钮的轻量 Toast 卡片
// ============================================================================

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const s = STYLE[item.type];

  return (
    <div
      onClick={onDismiss}
      className={`
        ${s.bg} ${s.border} ${s.text}
        flex items-center gap-2.5
        px-4 py-2.5 rounded-xl border
        text-[14px] leading-snug
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
        backdrop-blur-sm
        cursor-pointer select-none
        ${item.exiting ? "animate-toast-out" : "animate-toast-in"}
      `}
    >
      <span className="text-[15px] shrink-0">{s.icon}</span>
      <span>{item.message}</span>
    </div>
  );
}

// ============================================================================
// Internal: 带按钮的确认弹窗（居中 + 遮罩）
// ============================================================================

function ConfirmOverlay({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const s = STYLE[item.type];

  const handleConfirm = () => {
    item.onConfirm?.();
    onDismiss();
  };

  return (
    <div
      className={`
        fixed inset-0 z-[200] flex items-center justify-center
        ${item.exiting ? "animate-toast-fade-out" : "animate-toast-fade-in"}
      `}
    >
      {/* 半透明遮罩 — 点击即取消 */}
      <div
        className="absolute inset-0 bg-[#2c3a2f]/15 backdrop-blur-[2px]"
        onClick={onDismiss}
      />

      {/* 弹窗卡片 */}
      <div
        className={`
          relative ${s.bg} ${s.border}
          w-[340px] max-w-[90vw]
          px-6 pt-6 pb-5 rounded-2xl border
          shadow-[0_12px_48px_rgba(0,0,0,0.1)]
          ${item.exiting ? "animate-toast-scale-out" : "animate-toast-scale-in"}
        `}
      >
        {/* 图标 + 消息 */}
        <div className={`flex items-start gap-3 ${s.text}`}>
          <span className="text-[18px] shrink-0 mt-0.5">{s.icon}</span>
          <p className="text-[15px] leading-relaxed text-ink">{item.message}</p>
        </div>

        {/* 按钮组 */}
        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={onDismiss}
            className="
              px-4 py-2 text-[14px] text-sage
              hover:text-ink rounded-lg
              transition-colors duration-200
            "
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className={`
              px-5 py-2 text-[14px] font-medium
              text-white rounded-lg
              transition-all duration-200
              hover:shadow-[0_0_20px_rgba(91,154,139,0.25)]
              active:scale-[0.98]
              ${
                item.type === "error"
                  ? "bg-coral hover:bg-[#c07870]"
                  : "bg-teal hover:bg-teal-hover"
              }
            `}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Portal 容器 — 挂载到 document.body
// ============================================================================

export function ToastContainer() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (items.length === 0) return null;

  const simpleToasts = items.filter((t) => !t.needButton);
  const confirmToast = items.find((t) => t.needButton);

  return createPortal(
    <>
      {/* 顶部轻量 toast 栈 */}
      {simpleToasts.length > 0 && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2">
          {simpleToasts.map((t) => (
            <ToastCard
              key={t.id}
              item={t}
              onDismiss={() => dismissToast(t.id)}
            />
          ))}
        </div>
      )}

      {/* 居中确认弹窗（同时最多一个） */}
      {confirmToast && (
        <ConfirmOverlay
          item={confirmToast}
          onDismiss={() => dismissToast(confirmToast.id)}
        />
      )}
    </>,
    document.body
  );
}
