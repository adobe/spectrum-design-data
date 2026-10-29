// Copyright 2026 Adobe. All rights reserved.
import { Button, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { useState } from "react";
import { CodeBlock } from "../../components/CodeBlock";
import { elevationDocumentAtom } from "../../features/elevation/state";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { modeSetsAtom } from "../../features/modes/state";
import { buildElevationCss } from "../../features/elevation/output";
import { scaleTypesAtom } from "../../features/logic/scaleTypeLibrary";
import { colorOutputSettingsAtom } from "../../features/color-system/state";

const container = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  height: "full",
  minHeight: 0,
  padding: 16,
});
export function ElevationCssExport() {
  const document = useAtomValue(elevationDocumentAtom);
  const registry = useAtomValue(taxonomyDocumentAtom);
  const sets = useAtomValue(modeSetsAtom);
  const formulas = useAtomValue(scaleTypesAtom);
  const colorOutput = useAtomValue(colorOutputSettingsAtom);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  let css = "",
    error = "";
  try {
    css = buildElevationCss(document, registry, sets, formulas, colorOutput);
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure);
  }
  return (
    <div className={container} data-component="ElevationCssExport">
      <Text>
        Complete box-shadow values with named-mode variants. This is local CSS
        output, not an upstream shadow profile.
      </Text>
      {document.hideFromPublishing && (
        <Text>
          Elevation is hidden from publishing. Previews remain available.
        </Text>
      )}
      {!document.layers.length && <Text>No shadows to publish.</Text>}
      {error && <p role="alert">{error}</p>}
      <CodeBlock code={css} language="css" />
      <Button
        variant="accent"
        isDisabled={!css}
        onPress={async () => {
          try {
            await navigator.clipboard.writeText(css);
            setCopied("copied");
          } catch {
            setCopied("failed");
          }
        }}
      >
        Copy CSS
      </Button>
      {copied !== "idle" && (
        <Text>
          {copied === "copied" ? "Copied to clipboard." : "Could not copy CSS."}
        </Text>
      )}
    </div>
  );
}
