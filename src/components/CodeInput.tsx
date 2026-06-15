"use client";

import { type FC, useEffect, useRef, useCallback } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
} from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";

/* =========================================================================
   Misty Mint — CodeMirror 定制主题
   ========================================================================= */

const mistyMintTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#f0f3f0",
      color: "#2c3a2f",
      fontSize: "15px",
      fontFamily: "var(--font-geist-mono, monospace)",
      lineHeight: "1.65",
      borderRadius: "0.75rem",
      height: "100%",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
    ".cm-content": {
      caretColor: "#5b9a8b",
      fontFamily: "var(--font-geist-mono, monospace)",
      padding: "20px 24px",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#5b9a8b",
      borderLeftWidth: "2px",
    },
    "&.cm-focused": {
      outline: "none",
      boxShadow: "0 0 0 8px rgba(91, 154, 139, 0.06)",
      borderColor: "#b5cdc3",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(91, 154, 139, 0.18) !important",
    },
    ".cm-selectionBackground": {
      backgroundColor: "rgba(91, 154, 139, 0.12)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(91, 154, 139, 0.05)",
    },
    ".cm-gutters": {
      backgroundColor: "#f0f3f0",
      color: "#94a898",
      border: "none",
      paddingRight: "8px",
      fontFamily: "var(--font-geist-mono, monospace)",
      fontSize: "13px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(91, 154, 139, 0.05)",
      color: "#6b7d6f",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      color: "#94a898",
      border: "1px solid #e2e8e4",
      borderRadius: "4px",
      padding: "0 6px",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(91, 154, 139, 0.12)",
      outline: "1px solid #b5cdc3",
    },
    ".cm-nonmatchingBracket": {
      backgroundColor: "rgba(212, 131, 122, 0.12)",
      outline: "1px solid #d4837a",
    },
    ".cm-tooltip": {
      backgroundColor: "#fafbfa",
      color: "#2c3a2f",
      border: "1px solid #e2e8e4",
      borderRadius: "8px",
      fontSize: "13px",
    },
    ".cm-tooltip-autocomplete": {
      "& .cm-completionIcon": { color: "#94a898" },
      "& .cm-completionLabel": { color: "#2c3a2f" },
      "& .cm-completionDetail": { color: "#94a898" },
      "& li[aria-selected]": {
        backgroundColor: "#e8f0ed",
        color: "#2c3a2f",
      },
    },
  },
  { dark: false }
);

/* =========================================================================
   扩展
   ========================================================================= */

const baseExtensions: Extension[] = [
  lineNumbers(),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  history(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  keymap.of(defaultKeymap),
  keymap.of(historyKeymap),
  javascript(),
  mistyMintTheme,
];

/* =========================================================================
   Component
   ========================================================================= */

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const CodeInput: FC<CodeInputProps> = ({ value, onChange, disabled }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setDoc = useCallback((val: string) => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (val !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: val },
      });
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [...baseExtensions, updateListener],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDoc(value);
  }, [value, setDoc]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.contentDOM.contentEditable = disabled ? "false" : "true";
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className="w-full flex-1 min-h-0 border border-line rounded-xl overflow-hidden"
    />
  );
};
