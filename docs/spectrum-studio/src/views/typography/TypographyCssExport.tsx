// Copyright 2026 Adobe. All rights reserved.
import { Button, Checkbox, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { useState } from "react";
import { CodeBlock } from "../../components/CodeBlock";
import { typographyDocumentAtom } from "../../features/typography/state";
import { buildTypographyCss } from "../../features/typography/typographyCss";
import { rulesAtom } from "../../features/logic/library";
import {
  interpolationsAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";

const containerStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  height: "full",
  minHeight: 0,
  padding: 16,
});
const copyStyle = style({ alignSelf: "start" });

export function TypographyCssExport() {
  const document = useAtomValue(typographyDocumentAtom);
  const rules = useAtomValue(rulesAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const interpolations = useAtomValue(interpolationsAtom);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const taxonomy = useAtomValue(taxonomyDocumentAtom);
  const [useTaxonomyNames, setUseTaxonomyNames] = useState(false);
  let css = "",
    error = "";
  try {
    css = buildTypographyCss(document, {
      purpose: "publishing",
      rules,
      scaleTypes,
      interpolations,
      registry: taxonomy,
      ...(useTaxonomyNames && { taxonomy }),
    });
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
    <div className={containerStyle}>
      <Checkbox isSelected={useTaxonomyNames} onChange={setUseTaxonomyNames}>
        Use registered taxonomy names
      </Checkbox>
      <Text>
        {useTaxonomyNames
          ? "Local typography CSS using the shared ordered projection; this is not an upstream profile."
          : "Registered source names with the native metric and step pattern. Enable the shared taxonomy projection for strict output."}
      </Text>
      {error && <p role="alert">{error}</p>}
      {document.hideFromPublishing && (
        <Text>
          Typography is hidden from publishing. Its tokens and previews remain
          available in the authoring space.
        </Text>
      )}
      <Text>
        {copyState === "copied"
          ? "Copied to clipboard."
          : copyState === "failed"
            ? "Could not copy CSS."
            : "Text size CSS custom properties"}
      </Text>
      <CodeBlock code={css} language="css" />
      <Button
        onPress={copyCss}
        variant="accent"
        isDisabled={!css}
        styles={copyStyle}
      >
        Copy CSS
      </Button>
    </div>
  );
}
