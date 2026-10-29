// Copyright 2026 Adobe. All rights reserved.
import { Button, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValueRawSync } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { CodeBlock } from "../../components/CodeBlock";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";
import type { CssLibraryWorkerRequest } from "../../features/color-system/cssLibrary.worker";
import {
  LatestRequest,
  type DerivedState,
} from "../../features/derived-work/LatestRequest";
import { workerTask } from "../../features/derived-work/workerTask";
import {
  colorSchemeDocumentsAtom,
  contrastModesAtom,
  cssBaseDocumentAtom,
  scaleModeDocumentsAtom,
} from "../../features/color-system/state";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { rulesAtom } from "../../features/logic/library";
import { customContrastModeDocumentsAtom } from "../../features/color-system/state";

const containerStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  height: "full",
  minHeight: 0,
  padding: 16,
});

const copyButtonStyles = style({ alignSelf: "start" });
const execute = workerTask<CssLibraryWorkerRequest, string>(
  () =>
    new Worker(
      new URL(
        "../../features/color-system/cssLibrary.worker.ts",
        import.meta.url,
      ),
      { type: "module" },
    ),
);

export function CssExport() {
  const document = useAtomValueRawSync(cssBaseDocumentAtom);
  const modes = useAtomValueRawSync(colorSchemeDocumentsAtom);
  const contrastModes = useAtomValueRawSync(contrastModesAtom);
  const scaleModes = useAtomValueRawSync(scaleModeDocumentsAtom);
  const taxonomy = useAtomValueRawSync(taxonomyDocumentAtom);
  const rules = useAtomValueRawSync(rulesAtom);
  const customModes = useAtomValueRawSync(customContrastModeDocumentsAtom);
  const input = useMemo<CssLibraryWorkerRequest>(
    () => ({
      document,
      modes: modes.map(({ key, isDefault, document: modeDocument }) => ({
        key,
        isDefault,
        document: modeDocument,
      })),
      contrastModes,
      scaleModes,
      taxonomy,
      rules,
      customModes,
    }),
    [document, modes, contrastModes, scaleModes, taxonomy, rules, customModes],
  );
  const [publication, publish] =
    useState<DerivedState<CssLibraryWorkerRequest, string>>();
  const controller = useMemo(() => new LatestRequest(execute, publish), []);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const current = publication?.input === input ? publication : undefined;
  const cssLibrary = current?.status === "ready" ? current.value : "";

  useEffect(() => {
    controller.request(input, "visible");
    setCopyState("idle");
    return () => controller.cancel();
  }, [controller, input]);

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(cssLibrary);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className={containerStyles}>
      <Text>
        Canonical palette variables and color-scale variables use Registry
        order. Dynamic utility classes and internal surface controls retain
        their CSS relationships. Use Tokens for the structured taxonomy and
        compatibility alias packet.
      </Text>
      <Text>
        Adaptive CSS uses functional colors, including when Hex is selected.
        Declared modes are checked before export; a host must keep runtime
        backgrounds and contrast targets feasible. Manual token overrides are
        included in Tokens exports, not this adaptive formula library.
      </Text>
      <Text>
        {copyState === "copied"
          ? "Copied to clipboard."
          : copyState === "failed"
            ? "Could not copy CSS."
            : ""}
      </Text>
      <DerivedContentBoundary
        state={current?.status ?? "pending"}
        label="Generating CSS"
        error={current?.status === "unavailable" ? current.error : undefined}
        onRetry={() => controller.retry()}
      >
        <CodeBlock code={cssLibrary} language="css" />
      </DerivedContentBoundary>
      <Button
        onPress={copyCss}
        variant="accent"
        isDisabled={!cssLibrary}
        styles={copyButtonStyles}
      >
        Copy CSS
      </Button>
    </div>
  );
}
