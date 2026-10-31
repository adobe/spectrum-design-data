// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../notifications/notificationContext";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Heading,
  InlineAlert,
  PickerItem,
  TextArea,
  TextField,
} from "@react-spectrum/s2";
import { Picker } from "../fields/Picker";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { useMemo, useState, type ReactElement } from "react";
import { draftRuleImpact } from "../../features/logic/consumers";
import { rulesAtom } from "../../features/logic/library";
import {
  createRule,
  isRule,
  isTshirtRule,
  type Rule,
} from "../../features/logic/model";
import { RuleApplicabilityField } from "./RuleApplicabilityField";
import {
  emptyGeneratorEdit,
  prepareGeneratorEdit,
  type GeneratorEdit,
} from "../../features/logic/generatorEdit";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { structureGeneration } from "../../features/structures/model";
import { RULE_TYPES } from "../../features/logic/registry";
import { spacingDocumentAtom } from "../../features/spacing/state";
import { radiusDocumentAtom } from "../../features/radius/state";
import {
  interpolationsAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import { typographyDocumentAtom } from "../../features/typography/state";
import { RoundingRuleEditor } from "./RoundingRuleEditor";
import { RuleUsedBy } from "./RuleUsedBy";
import { sizeDocumentAtom } from "../../features/size/state";
import { primitiveReferencesAtom } from "../../features/tokens/primitiveReferenceState";
import { TshirtSizingRuleEditor } from "../../panels/logic/TshirtSizingRuleEditor";
import { authoringSnapshotAtom } from "../../features/edit-session/state";
import { ScaleNamingRuleEditor } from "../../panels/logic/ScaleNamingRuleEditor";
import { ConditionalRuleEditor } from "../../panels/logic/ConditionalRuleEditor";
import {
  conditionSources,
  conditionalIssues,
} from "../../features/logic/conditional";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";

const formStyles = style({ display: "flex", flexDirection: "column", gap: 20 });
const identityStyles = style({
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fit, minmax(min(220px, 100%), 1fr))]",
  gap: 16,
  alignItems: "start",
});
const sectionTitleStyles = style({ font: "title", margin: 0 });

export interface RuleEditorDialogProps {
  trigger: ReactElement;
  title: string;
  createDraft: () => Rule;
  onSave: (rule: Rule, edit?: GeneratorEdit) => void;
  onDelete?: () => void;
}

export function RuleEditorDialog({
  trigger,
  title,
  createDraft,
  onSave,
  onDelete,
}: RuleEditorDialogProps) {
  const notify = useNotify();
  const [draft, setDraft] = useState<Rule>(createDraft);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [generatorEdit, setGeneratorEdit] = useState(emptyGeneratorEdit);
  const rules = useAtomValue(rulesAtom);
  const typography = useAtomValue(typographyDocumentAtom);
  const spacing = useAtomValue(spacingDocumentAtom);
  const radius = useAtomValue(radiusDocumentAtom);
  const size = useAtomValue(sizeDocumentAtom);
  const references = useAtomValue(primitiveReferencesAtom);
  const snapshot = useAtomValue(authoringSnapshotAtom);
  const taxonomy = useAtomValue(taxonomyDocumentAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const interpolations = useAtomValue(interpolationsAtom);
  const prepared = useMemo(() => {
    if (!isTshirtRule(draft)) return { snapshot, error: "" };
    try {
      return {
        snapshot: {
          ...snapshot,
          ...prepareGeneratorEdit(
            draft,
            generatorEdit,
            taxonomy,
            snapshot.structures!,
          ),
        },
        error: "",
      };
    } catch (failure) {
      return {
        snapshot,
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [draft, generatorEdit, taxonomy, snapshot]);
  const impact = useMemo(() => {
    try {
      return {
        items: draftRuleImpact(draft, rules, {
          typography,
          spacing,
          size,
          radius,
          scaleTypes,
          interpolations,
          structures: snapshot.structures,
          snapshot,
          draftSnapshot: prepared.snapshot,
          color: snapshot.colorSystem,
        }),
        error: "",
      };
    } catch (failure) {
      return {
        items: [],
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [
    draft,
    rules,
    typography,
    spacing,
    size,
    radius,
    scaleTypes,
    interpolations,
    snapshot,
    prepared,
  ]);
  const isNameValid = draft.name.trim().length > 0;
  const canChangeType = !rules.some((rule) => rule.id === draft.id);
  const sources = useMemo(
    () => conditionSources(taxonomy, snapshot.modeSets),
    [taxonomy, snapshot.modeSets],
  );
  const conditionErrors =
    draft.type === "conditional" ? conditionalIssues(draft, sources) : [];
  const removedUses = isTshirtRule(draft)
    ? [
        ...new Set(
          (snapshot.structures?.structures ?? [])
            .filter((structure) =>
              structureGeneration(structure).applications.some(
                (application) => application.ruleId === draft.id,
              ),
            )
            .flatMap((structure) => structureGeneration(structure).sizeTermIds)
            .filter(
              (id) => !draft.mappings.some((mapping) => mapping.termId === id),
            ),
        ),
      ].map((termId) => ({
        termId,
        label: (snapshot.structures?.structures ?? [])
          .filter(
            (structure) =>
              structureGeneration(structure).sizeTermIds.includes(termId) &&
              structureGeneration(structure).applications.some(
                (application) => application.ruleId === draft.id,
              ),
          )
          .map((structure) => structure.name)
          .join(", "),
      }))
    : [];
  const renamedTerms = generatorEdit.terms.filter((term) =>
    taxonomy.terms.some(
      (before) => before.id === term.id && before.value !== term.value,
    ),
  );

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setDraft(createDraft());
          setInlineEditing(false);
          setGeneratorEdit(emptyGeneratorEdit());
        }
      }}
    >
      {trigger}
      <Dialog size="L">
        {({ close }) => (
          <>
            <Heading slot="title">{title}</Heading>
            <Content>
              <div className={formStyles} data-component="RuleEditorDialog">
                <div className={identityStyles}>
                  <TextField
                    label="Name"
                    isRequired
                    value={draft.name}
                    validationBehavior="aria"
                    isInvalid={!isNameValid}
                    errorMessage="Enter a name."
                    onChange={(name) =>
                      setDraft((current) => ({ ...current, name }))
                    }
                  />
                  <Picker
                    label="Type"
                    labelPosition="top"
                    selectedKey={draft.type}
                    isDisabled={!canChangeType || inlineEditing}
                    disabledKeys={RULE_TYPES.filter(
                      (type) => !type.isAvailable,
                    ).map((type) => type.id)}
                    onSelectionChange={(key) => {
                      if (
                        key === "conditional" ||
                        key === "rounding" ||
                        key === "tshirt-sizing" ||
                        key === "generator" ||
                        key === "scale-naming"
                      ) {
                        setGeneratorEdit(emptyGeneratorEdit());
                        setDraft((current) => ({
                          ...createRule(key),
                          id: current.id,
                          name: current.name,
                          description: current.description,
                        }));
                      }
                    }}
                  >
                    {RULE_TYPES.map((type) => (
                      <PickerItem
                        key={type.id}
                        id={type.id}
                        textValue={type.label}
                      >
                        {type.isAvailable
                          ? type.label
                          : `${type.label} (coming soon)`}
                      </PickerItem>
                    ))}
                  </Picker>
                </div>
                <TextArea
                  label="Description"
                  value={draft.description}
                  onChange={(description) =>
                    setDraft((current) => ({ ...current, description }))
                  }
                />
                {!isTshirtRule(draft) && (
                  <RuleApplicabilityField
                    rule={draft}
                    isReadOnly={inlineEditing}
                    onChange={(applicability) =>
                      setDraft((rule) => ({ ...rule, applicability }))
                    }
                  />
                )}
                {draft.type === "conditional" ? (
                  <ConditionalRuleEditor
                    rule={draft}
                    sources={sources}
                    modeSets={snapshot.modeSets}
                    color={snapshot.colorSystem}
                    rules={rules}
                    onChange={setDraft}
                    onEditingChange={setInlineEditing}
                  />
                ) : draft.type === "rounding" ? (
                  <RoundingRuleEditor
                    rule={draft}
                    references={references}
                    onChange={setDraft}
                    onEditingChange={setInlineEditing}
                  />
                ) : draft.type === "scale-naming" ? (
                  <ScaleNamingRuleEditor rule={draft} onChange={setDraft} />
                ) : (
                  <TshirtSizingRuleEditor
                    rule={draft}
                    references={references}
                    onChange={setDraft}
                    taxonomy={taxonomy}
                    edit={generatorEdit}
                    onEditChange={setGeneratorEdit}
                    removedUses={removedUses}
                  />
                )}
                {renamedTerms.map((term) => (
                  <InlineAlert key={term.id} variant="notice">
                    <Heading>Shared Size term will be renamed</Heading>
                    <Content>
                      {termLabel(
                        taxonomy.terms.find((item) => item.id === term.id)!
                          .value,
                      )}{" "}
                      → {termLabel(term.value)}. Used by{" "}
                      {rules
                        .filter(isTshirtRule)
                        .filter((rule) =>
                          rule.mappings.some(
                            (mapping) => mapping.termId === term.id,
                          ),
                        )
                        .map((rule) => rule.name)
                        .concat(
                          (snapshot.structures?.structures ?? [])
                            .filter((structure) =>
                              structureGeneration(
                                structure,
                              ).sizeTermIds.includes(term.id),
                            )
                            .map((structure) => structure.name),
                        )
                        .join(", ") || "this rule"}
                      . The Registry term and all of its uses share this name.
                    </Content>
                  </InlineAlert>
                ))}
                {prepared.error && (
                  <InlineAlert variant="negative">
                    <Heading>Check Generator options</Heading>
                    <Content>{prepared.error}</Content>
                  </InlineAlert>
                )}
                <h3 className={sectionTitleStyles}>Used by</h3>
                <RuleUsedBy impacts={impact.items} />
                {impact.error && (
                  <InlineAlert variant="negative">
                    <Heading>Check affected output</Heading>
                    <Content>{impact.error}</Content>
                  </InlineAlert>
                )}
              </div>
            </Content>
            <ButtonGroup>
              {onDelete && (
                <Button
                  variant="negative"
                  fillStyle="outline"
                  onPress={() => {
                    onDelete();
                    close();
                  }}
                >
                  Delete rule
                </Button>
              )}
              <Button variant="secondary" onPress={close}>
                Cancel
              </Button>
              <Button
                variant="accent"
                isDisabled={
                  !isNameValid ||
                  !isRule(draft) ||
                  !!impact.error ||
                  impact.items.some((item) => item.errors?.length) ||
                  !!prepared.error ||
                  inlineEditing ||
                  conditionErrors.length > 0
                }
                onPress={() => {
                  try {
                    onSave(
                      { ...draft, name: draft.name.trim() },
                      isTshirtRule(draft) ? generatorEdit : undefined,
                    );
                    close();
                  } catch (failure) {
                    notify.error(
                      failure instanceof Error
                        ? failure.message
                        : String(failure),
                    );
                  }
                }}
              >
                Save
              </Button>
            </ButtonGroup>
          </>
        )}
      </Dialog>
    </DialogTrigger>
  );
}
