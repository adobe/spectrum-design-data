// Copyright 2026 Adobe. All rights reserved.
import { Button, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import { useAtomValue } from "jotai";
import { CodeBlock } from "../../components/CodeBlock";
import { buildOpacityCss } from "../../features/opacity/output";
import { opacitySourceAtom } from "../../features/opacity/state";

const containerStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  height: "full",
  minHeight: 0,
  padding: 16,
});
const copyStyles = style({ alignSelf: "start" });

export function OpacityCssExport() {
  const source = useAtomValue(opacitySourceAtom);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  let css = "";
  let error: string | undefined;
  try {
    css = buildOpacityCss(source);
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure);
  }

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(css);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className={containerStyles} data-component="OpacityCssExport">
      {error && (
        <div role="alert">
          <Text>{`Opacity CSS is unavailable: ${error}`}</Text>
        </div>
      )}
      <Text>
        {copyState === "copied"
          ? "Copied to clipboard."
          : copyState === "failed"
            ? "Could not copy CSS."
            : "Opacity CSS custom properties"}
      </Text>
      <CodeBlock code={css} language="css" />
      <Button
        onPress={copyCss}
        variant="accent"
        isDisabled={!css}
        styles={copyStyles}
      >
        Copy CSS
      </Button>
    </div>
  );
}
