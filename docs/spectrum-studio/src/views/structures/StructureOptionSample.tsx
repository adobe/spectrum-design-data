// Copyright 2026 Adobe. All rights reserved.
import { Content, Heading, InlineAlert } from "@react-spectrum/s2";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Structure } from "../../features/structures/model";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";
import type { Rule } from "../../features/logic/model";
import type { TshirtArtifactBundle } from "../../features/design-data/tshirtArtifacts";
import type { StructurePreviewState } from "../../features/structures/variants";
import { resolveStructureOptions } from "../../features/structures/variants";
import {
  resolveStructure,
  UNMEASURED_LAYOUT,
  type PreviewLayoutContext,
} from "../../features/structures/resolution";
import { resolveCompositionResult } from "../../features/structures/composition";
import { resolveElements } from "../../features/structures/elementResolution";
import {
  StructurePreview,
  type StructurePreviewProps,
} from "./StructurePreview";
import { measureCompositionLayouts } from "./compositionMeasurement";
import { useAtomValue } from "jotai";
import { structurePreviewsAtom } from "../../features/structures/documentState";
import { previewTextStyleSourceAtom } from "../../features/styles/state";
import { canonicalTokenModeKey } from "../../features/tokens/browserModel";

interface StructureOptionSampleProps extends Pick<
  StructurePreviewProps,
  | "taxonomy"
  | "selectedElementId"
  | "onSelectElement"
  | "onInsert"
  | "onInsertStructure"
  | "onInsertLayout"
  | "structures"
> {
  structure: Structure;
  catalog: readonly Structure[];
  references: readonly PrimitiveReference[];
  rules: readonly Rule[];
  bundle?: TshirtArtifactBundle;
  mode: Record<string, string>;
  preview?: StructurePreviewState;
  previewSelections?: Readonly<Record<string, StructurePreviewState>>;
}

export function StructureOptionSample({
  structure,
  catalog,
  references,
  rules,
  bundle,
  mode,
  preview,
  previewSelections,
  ...interaction
}: StructureOptionSampleProps) {
  const previews = useAtomValue(structurePreviewsAtom);
  const source = useAtomValue(previewTextStyleSourceAtom);
  const textStyles = { ...source, modeKey: canonicalTokenModeKey(mode) };
  const frame = useRef<HTMLDivElement>(null);
  const natural = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<PreviewLayoutContext>(UNMEASURED_LAYOUT);
  const [modules, setModules] = useState<Record<string, PreviewLayoutContext>>(
    {},
  );
  const effective = useMemo(
    () => resolveStructureOptions(structure, preview),
    [structure, preview],
  );
  const leaves = resolveElements(
    effective.structure,
    references,
    rules,
    "m",
    textStyles,
  );
  const result = resolveCompositionResult(
    structure,
    catalog,
    references,
    rules,
    bundle,
    mode,
    "m",
    layout,
    modules,
    preview?.options,
    preview?.indentationLevel,
    {
      ...(previewSelections ?? previews),
      ...(preview && { [structure.conceptId]: preview }),
    },
    textStyles,
  );
  const composition = result.status === "ready" ? result.value : undefined;
  const resolved =
    composition?.resolved ??
    resolveStructure(
      effective.structure,
      references,
      layout,
      preview?.indentationLevel,
    );
  const signature = JSON.stringify([
    resolved.styles,
    resolved.intrinsicStyles,
    composition?.children,
    leaves,
  ]);
  useLayoutEffect(() => {
    const host = frame.current,
      sample = natural.current;
    if (!host || !sample) return;
    const measure = () => {
      const box = sample.getBoundingClientRect();
      const next = {
        availableWidth: host.clientWidth,
        availableHeight: host.clientHeight,
        naturalWidth: box.width,
        naturalHeight: box.height,
      };
      setLayout((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
      const nextModules = measureCompositionLayouts(sample, host, resolved);
      setModules((previous) =>
        JSON.stringify(previous) === JSON.stringify(nextModules)
          ? previous
          : nextModules,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    observer.observe(sample);
    return () => observer.disconnect();
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps -- The signature covers resolved measurement inputs.
  const issues = [
    ...effective.issues,
    ...(result.status === "error" ? [result.error] : []),
  ];
  return (
    <div ref={frame} className="structureOptionSample">
      {issues.length ? (
        <InlineAlert variant="negative">
          <Heading>Check this option</Heading>
          <Content>{issues.join(" ")}</Content>
        </InlineAlert>
      ) : (
        <StructurePreview
          name={structure.name}
          resolved={resolved}
          elements={leaves}
          composition={composition}
          {...interaction}
        />
      )}
      <StructurePreview
        name={structure.name}
        resolved={resolved}
        elements={leaves}
        composition={composition}
        isMeasurement
        measurementRef={natural}
      />
    </div>
  );
}
