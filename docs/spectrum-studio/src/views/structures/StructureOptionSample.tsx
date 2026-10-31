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

interface StructureOptionSampleProps extends Pick<
  StructurePreviewProps,
  | "taxonomy"
  | "selectedElementId"
  | "onSelectElement"
  | "onInsert"
  | "onInsertStructure"
  | "structures"
> {
  structure: Structure;
  catalog: readonly Structure[];
  references: readonly PrimitiveReference[];
  rules: readonly Rule[];
  bundle?: TshirtArtifactBundle;
  mode: Record<string, string>;
  preview?: StructurePreviewState;
}

export function StructureOptionSample({
  structure,
  catalog,
  references,
  rules,
  bundle,
  mode,
  preview,
  ...interaction
}: StructureOptionSampleProps) {
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
  const resolved = resolveStructure(effective.structure, references, layout);
  const leaves = resolveElements(effective.structure, references, rules);
  const result = resolveCompositionResult(
    effective.structure,
    catalog,
    references,
    rules,
    bundle,
    mode,
    "m",
    layout,
    modules,
    preview?.options,
  );
  const composition = result.status === "ready" ? result.value : undefined;
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
