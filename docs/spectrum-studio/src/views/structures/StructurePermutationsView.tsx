// Copyright 2026 Adobe. All rights reserved.
import { Content, Heading, InlineAlert, Text } from "@react-spectrum/s2";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  COMPONENT_SIZES,
  type ComponentSize,
} from "../../features/foundations/componentSizes";
import { structureSizes } from "../../features/structures/generation";
import {
  structureGeneration,
  type Structure,
} from "../../features/structures/model";
import {
  resolveStructure,
  UNMEASURED_LAYOUT,
  type PreviewLayoutContext,
} from "../../features/structures/resolution";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";
import type { Rule } from "../../features/logic/model";
import { resolveElements } from "../../features/structures/elementResolution";
import {
  tshirtPreview,
  type TshirtArtifactBundle,
} from "../../features/design-data/tshirtArtifacts";
import { StructurePreview } from "./StructurePreview";
import "./StructurePermutationsView.css";
import { resolveCompositionResult } from "../../features/structures/composition";
import { measureCompositionLayouts } from "./compositionMeasurement";

export interface StructurePermutationsViewProps {
  structure: Structure | null;
  bundle?: TshirtArtifactBundle;
  references: readonly PrimitiveReference[];
  selection: Record<string, string>;
  error?: string;
  isPreview?: boolean;
  rules?: readonly Rule[];
  structures?: readonly Structure[];
}
function SizePreview({
  structure,
  size,
  bundle,
  references,
  selection,
  rules,
  structures,
}: Required<Pick<StructurePermutationsViewProps, "bundle">> & {
  structure: Structure;
  size: ComponentSize;
  references: readonly PrimitiveReference[];
  selection: Record<string, string>;
  rules: readonly Rule[];
  structures: readonly Structure[];
}) {
  const stage = useRef<HTMLDivElement>(null),
    natural = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<PreviewLayoutContext>(UNMEASURED_LAYOUT);
  const [moduleLayouts, setModuleLayouts] = useState<
    Record<string, PreviewLayoutContext>
  >({});
  const generated = useMemo(() => {
    try {
      return {
        preview: tshirtPreview(structure, size, bundle, selection, references),
        error: "",
      };
    } catch (failure) {
      return {
        preview: null,
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [structure, size, bundle, selection, references]);
  const resolved = useMemo(
    () =>
      generated.preview
        ? resolveStructure(
            generated.preview.structure,
            generated.preview.references,
            layout,
          )
        : null,
    [generated.preview, layout],
  );
  const elements = useMemo(
    () => resolveElements(structure, references, rules, size),
    [structure, references, rules, size],
  );
  const compositionResult = useMemo(
    () =>
      resolveCompositionResult(
        structure,
        structures,
        references,
        rules,
        bundle,
        selection,
        size,
        layout,
        moduleLayouts,
      ),
    [
      structure,
      structures,
      references,
      rules,
      bundle,
      selection,
      size,
      layout,
      moduleLayouts,
    ],
  );
  const composition =
    compositionResult.status === "ready" ? compositionResult.value : null;
  const key = JSON.stringify([
    resolved?.styles,
    resolved?.intrinsicStyles,
    composition?.children,
  ]);
  const invalidNatural =
    elements.some((element) => element.issues.length) ||
    (!!resolved &&
      [
        "gap",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
      ].some((slot) => slot in resolved.issues));
  useLayoutEffect(() => {
    if (!stage.current || !natural.current) return;
    const measure = () => {
      if (!stage.current || !natural.current) return;
      const rect = natural.current.getBoundingClientRect();
      const next = {
        availableWidth: stage.current.clientWidth,
        availableHeight: stage.current.clientHeight,
        naturalWidth: invalidNatural ? null : rect.width,
        naturalHeight: invalidNatural ? null : rect.height,
      };
      setLayout((before) =>
        JSON.stringify(before) === JSON.stringify(next) ? before : next,
      );
      if (!resolved) return;
      const modules = measureCompositionLayouts(
        natural.current,
        stage.current,
        resolved,
      );
      setModuleLayouts((before) =>
        JSON.stringify(before) === JSON.stringify(modules) ? before : modules,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage.current);
    observer.observe(natural.current);
    return () => observer.disconnect();
  }, [key, invalidNatural, resolved]);
  const label = COMPONENT_SIZES.find((option) => option.id === size)!.label;
  return (
    <section
      className="structurePermutation"
      aria-labelledby={`permutation-${structure.conceptId}-${size}`}
      data-size={size}
    >
      <h2 id={`permutation-${structure.conceptId}-${size}`}>{label}</h2>
      {generated.error || compositionResult.status === "error" ? (
        <InlineAlert variant="negative">
          <Heading>Check this size</Heading>
          <Content>
            {generated.error ||
              (compositionResult.status === "error"
                ? compositionResult.error
                : "")}
          </Content>
        </InlineAlert>
      ) : (
        resolved &&
        composition && (
          <>
            <div className="structurePermutationStage" ref={stage}>
              <StructurePreview
                name={`${structure.name} (${label})`}
                resolved={resolved}
                elements={elements}
                composition={composition}
              />
            </div>
            <StructurePreview
              name={structure.name}
              resolved={resolved}
              elements={elements}
              composition={composition}
              isMeasurement
              measurementRef={natural}
            />
          </>
        )
      )}
      {!!composition?.warnings.length && (
        <InlineAlert variant="notice">
          <Heading>Referenced Structure targets</Heading>
          <Content>{[...new Set(composition.warnings)].join(" ")}</Content>
        </InlineAlert>
      )}
      {generated.preview?.warnings.length ? (
        <InlineAlert variant="notice">
          <Heading>Nearest available targets</Heading>
          <Content>
            {[...new Set(generated.preview.warnings)].join(" ")}
          </Content>
        </InlineAlert>
      ) : null}
      {elements.some((element) => element.warnings.length) && (
        <InlineAlert variant="notice">
          <Heading>Element preview targets</Heading>
          <Content>
            {[...new Set(elements.flatMap((element) => element.warnings))].join(
              " ",
            )}
          </Content>
        </InlineAlert>
      )}
    </section>
  );
}
export function StructurePermutationsView({
  structure,
  bundle,
  references,
  selection,
  error,
  isPreview,
  rules = [],
  structures,
}: StructurePermutationsViewProps) {
  if (!structure)
    return (
      <div className="structurePermutationsEmpty">
        <Text>Select a structure to see its sizes.</Text>
      </div>
    );
  if (error || !bundle)
    return (
      <InlineAlert variant="negative">
        <Heading>Generation needs repair</Heading>
        <Content>{error || "Current generated output is unavailable."}</Content>
      </InlineAlert>
    );
  return (
    <div
      className="structurePermutations"
      data-component="StructurePermutationsView"
    >
      <h1>{structure.name} sizes</h1>
      {isPreview && (
        <p role="status">
          Temporary adaptive values are shown for inspection only. They do not
          add saved tokens or exported contexts.
        </p>
      )}
      {!structureGeneration(structure).applications.length && (
        <p>
          Add a generation rule to derive size-specific tokens. Untargeted
          settings keep their Medium values.
        </p>
      )}
      <div className="structurePermutationsGrid">
        {structureSizes(structure).map((size) => (
          <SizePreview
            key={size}
            structure={structure}
            size={size}
            bundle={bundle}
            references={references}
            selection={selection}
            rules={rules}
            structures={structures ?? [structure]}
          />
        ))}
      </div>
    </div>
  );
}
