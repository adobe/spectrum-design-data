// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useState } from "react";

export interface MathFormulaProps {
  /** LaTeX built by this app from validated input; never raw user text. */
  latex: string | null;
  /** Shown while KaTeX loads, when there is no LaTeX, and as the accessible name. */
  fallback: string;
}

const formulaStyles = style({ font: "body", overflowX: "auto", minWidth: 0 });
const plainStyles = style({
  font: "code-sm",
  margin: 0,
  overflowWrap: "anywhere",
});

type Katex = typeof import("katex").default;
let katexPromise: Promise<Katex> | undefined;

// Loaded on first use so KaTeX stays out of the initial bundle.
function loadKatex() {
  katexPromise ??= Promise.all([
    import("katex"),
    import("katex/dist/katex.min.css"),
  ]).then(([module]) => module.default);
  return katexPromise;
}

/** Typeset formula with a plain-text fallback. */
export function MathFormula({ latex, fallback }: MathFormulaProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setHtml(null);
    if (latex === null) return;
    loadKatex().then(
      (katex) => {
        if (!current) return;
        try {
          setHtml(
            katex.renderToString(latex, {
              displayMode: false,
              throwOnError: true,
              trust: false,
              output: "htmlAndMathml",
            }),
          );
        } catch {
          setHtml(null);
        }
      },
      () => {
        if (current) setHtml(null);
      },
    );
    return () => {
      current = false;
    };
  }, [latex]);

  if (html === null)
    return (
      <p className={plainStyles} aria-label="Formula">
        {fallback}
      </p>
    );
  // KaTeX escapes its input and trust is off, so the markup is safe to inject; its MathML is the accessible content.
  return (
    <div
      className={formulaStyles}
      data-component="MathFormula"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
