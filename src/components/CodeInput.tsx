"use client";

import { type FC } from "react";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * 代码输入区 — 页面唯一视觉主角
 * 大号等宽字体，聚焦时浮现一圈极淡光晕
 */
export const CodeInput: FC<CodeInputProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="w-full">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="在此粘贴你的代码…"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className={`
          w-full h-72 resize-y
          bg-input
          font-mono text-[15px] leading-relaxed
          text-ink placeholder:text-muted
          rounded-xl
          border border-line
          px-6 py-5
          transition-all duration-300 ease-out
          focus:outline-none focus:border-line-focus focus:bg-surface
          focus:shadow-[0_0_0_8px_rgba(91,154,139,0.06)]
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      />
    </div>
  );
};
