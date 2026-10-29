// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { codeChunks, type CodeLanguage } from "../features/code/chunks";
import type { HighlightRequest } from "../features/code/highlight";
import { executeHighlight } from "../features/code/highlightWork";
import {
  LatestRequest,
  type DerivedState,
} from "../features/derived-work/LatestRequest";
import { DerivedContentBoundary } from "./DerivedContentBoundary";
import "./CodeBlock.css";

export type CodeBlockLanguage = CodeLanguage;

const preStyles = style({
  margin: 0,
  padding: 12,
  borderRadius: "default",
  backgroundColor: "gray-50",
  color: "neutral",
  overflow: "auto",
  font: "code-xs",
  flexGrow: 1,
  minHeight: 0,
});

const CodeChunk = memo(function CodeChunk({
  text,
  html,
  index,
}: {
  text: string;
  html?: string;
  index: number;
}) {
  const lines = text.split("\n").length - Number(text.endsWith("\n"));
  const props = {
    className: "code-block-chunk",
    "data-code-chunk": index,
    style: { containIntrinsicBlockSize: `auto ${lines}lh` },
  };
  return html === undefined ? (
    <span {...props}>{text}</span>
  ) : (
    <span {...props} dangerouslySetInnerHTML={{ __html: html }} />
  );
});

function hasCodeSelection(element: HTMLElement | null) {
  const selection = element?.ownerDocument.getSelection();
  return Boolean(
    element &&
    selection &&
    !selection.isCollapsed &&
    selection.rangeCount &&
    selection.getRangeAt(0).intersectsNode(element),
  );
}

export function CodeBlock({
  code,
  language = "css",
}: {
  code: string;
  language?: CodeBlockLanguage;
}) {
  const input = useMemo<HighlightRequest>(
    () => ({ code, language }),
    [code, language],
  );
  const chunks = useMemo(() => codeChunks(code), [code]);
  const [publication, publish] =
    useState<DerivedState<HighlightRequest, string[]>>();
  const controller = useMemo(
    () => new LatestRequest(executeHighlight, publish),
    [],
  );
  const pre = useRef<HTMLPreElement>(null);
  const [visible, setVisible] = useState<ReadonlySet<number>>(() => new Set());
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [displayed, setDisplayed] = useState<{
    input: HighlightRequest;
    chunks: ReadonlyMap<number, string>;
  }>();
  const current = publication?.input === input ? publication : undefined;

  useEffect(() => {
    if (input.code) controller.request(input, "visible");
    return () => controller.cancel();
  }, [controller, input]);

  useEffect(() => {
    const indices = new Set<number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const index = Number(entry.target.getAttribute("data-code-chunk"));
        if (entry.isIntersecting) indices.add(index);
        else indices.delete(index);
      }
      setVisible((previous) =>
        previous.size === indices.size &&
        [...indices].every((index) => previous.has(index))
          ? previous
          : new Set(indices),
      );
    });
    for (const chunk of pre.current!.querySelectorAll("[data-code-chunk]"))
      observer.observe(chunk);
    return () => observer.disconnect();
  }, [chunks]);

  useEffect(() => {
    const document = pre.current!.ownerDocument;
    const change = () => setSelectionRevision((value) => value + 1);
    document.addEventListener("selectionchange", change);
    return () => document.removeEventListener("selectionchange", change);
  }, []);

  useEffect(() => {
    if (current?.status !== "ready") return;
    const frame = requestAnimationFrame(() => {
      if (hasCodeSelection(pre.current)) return;
      setDisplayed((previous) => {
        const next = new Map(
          [...visible].map((index) => [index, current.value[index]]),
        );
        return previous?.input === input &&
          previous.chunks.size === next.size &&
          [...next].every(
            ([index, html]) => previous.chunks.get(index) === html,
          )
          ? previous
          : { input, chunks: next };
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [current, input, visible, selectionRevision]);

  const state = code ? (current?.status ?? "pending") : "ready";
  return (
    <DerivedContentBoundary
      state={state}
      label="Coloring syntax"
      error={
        current?.status === "unavailable"
          ? `Syntax coloring is unavailable. The complete code remains available as plain text. ${current.error}`
          : undefined
      }
      onRetry={() => controller.retry()}
    >
      <pre
        ref={pre}
        className={`${preStyles} language-${language}`}
        data-code-block={language}
      >
        <code className={`language-${language}`}>
          {chunks.map((text, index) => (
            <CodeChunk
              key={index}
              text={text}
              index={index}
              html={
                displayed?.input === input
                  ? displayed.chunks.get(index)
                  : undefined
              }
            />
          ))}
        </code>
      </pre>
    </DerivedContentBoundary>
  );
}
