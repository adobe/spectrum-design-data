// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  ComboBox,
  ComboBoxItem,
  ComboBoxSection,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useState } from "react";
import { Panel } from "../../components/Panel";
import {
  normalizeTermValue,
  termLabel,
} from "../../features/taxonomy/termPresentation";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import { ELEMENT_CATEGORY_ID } from "../../features/structures/elements";
import { VARIANT_CATEGORY_IDS } from "../../features/taxonomy/variantVocabulary";
import {
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
import { useNotify } from "../../components/notifications/notificationContext";
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
  taxonomy?: TaxonomyDocument;
  onTokenNaming?: (input: {
    termId?: string | null;
    createName?: string;
  }) => void;
  embedded?: boolean;
}
const sizingOptions: TokenComboBoxOption[] = [
  { id: "hug", kind: "preset", name: "Hug", displayValue: "Hug" },
  { id: "fill", kind: "preset", name: "Fill", displayValue: "Fill" },
];
const showAsStyles = style({ width: "full" });
const selectionFor = (id: string | null): StructureSelection | null =>
  id === null
    ? null
    : id === "hug" || id === "fill"
      ? { value: { kind: "sizing", preset: id } }
      : { $ref: id };

export function StructureEditorPanel({
  structure,
  references,
  layout,
  isReadOnly,
  report,
  onChange,
  taxonomy,
  onTokenNaming,
  embedded = false,
}: StructureEditorPanelProps) {
  const notify = useNotify();
  const [commitError, setCommitError] = useState<string>();
  const resolved = resolveStructure(structure, references, layout);
  const namingTerm = taxonomy?.terms.find(
    (term) => term.id === structure.generation?.nameRef?.termId,
  );
  const [namingInput, setNamingInput] = useState(
    termLabel(namingTerm?.value ?? ""),
  );
  useEffect(
    () => setNamingInput(termLabel(namingTerm?.value ?? "")),
    [namingTerm?.value],
  );
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
          : selection.value.kind === "sizing"
            ? selection.value.preset
            : selection.value.termId,
      options: [
        ...(definition.presets ? sizingOptions : []),
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
    <div className="structureEditorFields">
      {taxonomy && onTokenNaming && (
        <div>
          <ComboBox
            label="Token naming"
            selectedKey={namingTerm?.id ?? null}
            inputValue={namingInput}
            onInputChange={setNamingInput}
            allowsCustomValue
            isReadOnly={isReadOnly}
            description="The Structure name is a label. This Registry term names its generated tokens."
            styles={showAsStyles}
            onSelectionChange={(key) => {
              if (typeof key === "string")
                commit(() => onTokenNaming({ termId: key }));
            }}
          >
            {[
              { id: VARIANT_CATEGORY_IDS.structure, label: "Structure terms" },
              { id: ELEMENT_CATEGORY_ID, label: "Element terms" },
            ].map((category) => (
              <ComboBoxSection key={category.id} aria-label={category.label}>
                {taxonomy.terms
                  .filter((term) => term.categoryId === category.id)
                  .map((term) => (
                    <ComboBoxItem
                      key={term.id}
                      id={term.id}
                      textValue={termLabel(term.value)}
                    >
                      {termLabel(term.value)}
                    </ComboBoxItem>
                  ))}
              </ComboBoxSection>
            ))}
          </ComboBox>
          {!isReadOnly && (
            <Button
              variant="secondary"
              size="S"
              isDisabled={
                !namingInput.trim() ||
                normalizeTermValue(namingInput) === namingTerm?.value ||
                namingInput === termLabel(namingTerm?.value ?? "")
              }
              onPress={() =>
                notify.added("term", () => {
                  onTokenNaming({ createName: namingInput });
                  return true;
                })
              }
            >
              Create Structure term
            </Button>
          )}
        </div>
      )}
      <StructureAppearanceControls
        fields={fields}
        isReadOnly={isReadOnly}
        onChange={(changes) =>
          commit(() => {
            const selections: Partial<
              Record<StructureSlot, StructureSelection | null>
            > = {};
            for (const slot of STRUCTURE_SLOT_KEYS) {
              const id = changes[slot];
              if (id !== undefined)
                selections[slot] =
                  slot === "direction" ||
                  slot === "horizontal" ||
                  slot === "vertical"
                    ? id === null
                      ? null
                      : { value: { kind: "term", termId: id } }
                    : selectionFor(id);
            }
            onChange(selections);
          })
        }
      />
      {commitError && (
        <div role="alert">
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
