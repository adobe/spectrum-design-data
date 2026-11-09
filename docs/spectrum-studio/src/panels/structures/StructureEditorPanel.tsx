// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import { useEffect, useState } from "react";
import { Panel } from "../../components/Panel";
import { EditableTextField } from "../../components/editable";
import {
  DERIVED_PADDING_SLOTS,
  STRUCTURE_SLOT_KEYS,
  structureSelection,
  structureSlotDefinition,
  type Structure,
  type StructureSelection,
  type StructureSlot,
} from "../../features/structures/model";
import {
  constraintChoiceAllowed,
  isConstraintSlot,
  resolveStructure,
  type PreviewLayoutContext,
} from "../../features/structures/resolution";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";
import type { TokenComboBoxOption } from "../../components/fields/TokenComboBox";
import {
  StructureAppearanceControls,
  type AppearanceField,
} from "./StructureAppearanceControls";
import "./StructureEditorPanel.css";

export interface StructureEditorPanelProps {
  structure: Structure;
  references: readonly PrimitiveReference[];
  layout: PreviewLayoutContext;
  isReadOnly: boolean;
  report: (failure: unknown) => void;
  onChange: (
    changes: Partial<Record<StructureSlot, StructureSelection | null>>,
  ) => void;
  embedded?: boolean;
  onRename?: (name: string) => void;
}
const sizingOptions: TokenComboBoxOption[] = [
  { id: "hug", kind: "preset", name: "Hug", displayValue: "Hug" },
  { id: "fill", kind: "preset", name: "Fill", displayValue: "Fill" },
];
const CENTER_OPTION_ID = "center-in-min-height";
const DEFAULT_CONTENT_NAME = "component-line-height-100";
const derivedSlot = (slot: StructureSlot) =>
  (DERIVED_PADDING_SLOTS as readonly string[]).includes(slot);
const contentReferenceFor = (
  structure: Structure,
  slot: StructureSlot,
  references: readonly PrimitiveReference[],
) => {
  const current = structureSelection(structure, slot);
  if (current && "value" in current && current.value.kind === "derived")
    return current.value.contentRef;
  const lineHeights = references.filter((reference) =>
    reference.metricId?.endsWith("-lineHeight"),
  );
  return (
    lineHeights.find((reference) => reference.name === DEFAULT_CONTENT_NAME) ??
    lineHeights[0]
  )?.id;
};
const selectionFor = (
  id: string | null,
  contentRef?: string,
): StructureSelection | null =>
  id === null
    ? null
    : id === "hug" || id === "fill"
      ? { value: { kind: "sizing", preset: id } }
      : id === CENTER_OPTION_ID
        ? contentRef
          ? {
              value: {
                kind: "derived",
                method: "center-in-min-height",
                contentRef,
              },
            }
          : null
        : { $ref: id };

export function StructureEditorPanel({
  structure,
  references,
  layout,
  isReadOnly,
  report,
  onChange,
  embedded = false,
  onRename,
}: StructureEditorPanelProps) {
  const [commitError, setCommitError] = useState<string>();
  const [name, setName] = useState(structure.name);
  useEffect(
    () => setName(structure.name),
    [structure.conceptId, structure.name],
  );
  const resolved = resolveStructure(structure, references, layout);
  const commit = (action: () => void) => {
    try {
      action();
      setCommitError(undefined);
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : String(failure);
      setCommitError(message);
      report(failure);
    }
  };
  const fields: Partial<Record<StructureSlot, AppearanceField>> = {};
  for (const slot of STRUCTURE_SLOT_KEYS) {
    const definition = structureSlotDefinition(slot);
    const selection = structureSelection(structure, slot);
    fields[slot] = {
      label:
        slot === "width"
          ? "Default size width"
          : slot === "height"
            ? "Default size height"
            : definition.label,
      selectedKey: !selection
        ? null
        : "$ref" in selection
          ? selection.$ref
          : selection.value.kind === "number"
            ? null
            : selection.value.kind === "sizing"
              ? selection.value.preset
              : selection.value.kind === "derived"
                ? CENTER_OPTION_ID
                : selection.value.termId,
      customValue:
        definition.family &&
        definition.family !== "elevation"
          ? {
              displayValue:
                selection &&
                "value" in selection &&
                selection.value.kind === "number"
                  ? String(selection.value.value)
                  : "",
              unit: "px" as const,
            }
          : undefined,
      options: [
        ...(definition.presets ? sizingOptions : []),
        ...(derivedSlot(slot)
          ? (() => {
              const contentRef = contentReferenceFor(
                structure,
                slot,
                references,
              );
              const content = references.find(
                (reference) => reference.id === contentRef,
              );
              return content
                ? [
                    {
                      id: CENTER_OPTION_ID,
                      kind: "preset" as const,
                      name: "Auto",
                      displayValue: `(Min height − ${content.name}) ÷ 2`,
                    },
                  ]
                : [];
            })()
          : []),
        ...references
          .filter((reference) => reference.family === definition.family)
          .map(
            (reference): TokenComboBoxOption => ({
              id: reference.id,
              kind: "token",
              name: reference.name,
              displayValue: reference.displayValue,
              hidden: reference.hidden,
              error: reference.error,
            }),
          ),
      ],
      isRequired: slot === "width" || slot === "height",
      error: resolved.issues[slot],
      isOptionAllowed: isConstraintSlot(slot)
        ? (option) =>
            constraintChoiceAllowed(
              structure,
              slot,
              selectionFor(option.id)!,
              references,
              layout,
            )
        : undefined,
    };
  }
  const content = (
    <div className="structureAppearance">
      <StructureAppearanceControls
        header={
          onRename ? (
            <EditableTextField
              size="S"
              label="Layout name"
              isRequired
              value={name}
              isReadOnly={isReadOnly}
              onChange={setName}
              onBlur={() => {
                if (isReadOnly || name === structure.name) return;
                commit(() => onRename(name));
              }}
            />
          ) : undefined
        }
        fields={fields}
        isReadOnly={isReadOnly}
        onChange={(changes) =>
          commit(() => {
            const selections: Partial<
              Record<StructureSlot, StructureSelection | null>
            > = {};
            for (const slot of STRUCTURE_SLOT_KEYS) {
              const value = changes[slot];
              if (value === undefined) continue;
              if (value === null) {
                selections[slot] = null;
                continue;
              }
              if (typeof value !== "string") {
                selections[slot] = { value };
                continue;
              }
              selections[slot] =
                slot === "direction" ||
                slot === "horizontal" ||
                slot === "vertical"
                  ? { value: { kind: "term", termId: value } }
                  : selectionFor(
                      value,
                      contentReferenceFor(structure, slot, references),
                    );
            }
            onChange(selections);
          })
        }
      />
      {commitError && (
        <div role="alert" className="structureAppearanceLoose">
          <Text>{commitError}</Text>
        </div>
      )}
    </div>
  );
  return embedded ? (
    content
  ) : (
    <Panel
      label={`Structure settings for ${structure.name}`}
      className="structureEditorPanel"
    >
      {content}
    </Panel>
  );
}
