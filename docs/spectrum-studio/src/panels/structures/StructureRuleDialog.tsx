// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  Content,
  Dialog,
  DialogTrigger,
  Heading,
  InlineAlert,
  Picker,
  PickerItem,
  Radio,
  RadioGroup,
  TableView,
  TableHeader,
  Column,
  TableBody,
  Row,
  Cell,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo, useState, type ReactNode } from "react";
import { TokenNameTag } from "../../components/tokens/TokenNameTag";
import type { Rule } from "../../features/logic/model";
import { eligibleStructureBindings } from "../../features/structures/generation";
import {
  structureBinding,
  structureBindingId,
  structureSlotDefinition,
  type Structure,
  type StructureRuleApplication,
  type StructureSlot,
} from "../../features/structures/model";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";
import type { TshirtArtifactBundle } from "../../features/design-data/tshirtArtifacts";
import { formatTshirtName } from "../../features/design-data/tshirtProfile";
import {
  ELEMENT_SLOT_LABELS,
  ELEMENT_TYPES,
} from "../../features/structures/elements";
import {
  resolveElements,
  templateTargets,
} from "../../features/structures/elementResolution";
import { structureGeneration } from "../../features/structures/model";
import { structureSizes } from "../../features/structures/generation";
import { leafElements } from "../../features/structures/children";

const fieldsStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  minWidth: 0,
});
const rowStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
});
const noteStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});
const groups: { label: string; slots: StructureSlot[] }[] = [
  { label: "Default size", slots: ["width", "height"] },
  {
    label: "Constraints",
    slots: ["minWidth", "minHeight", "maxWidth", "maxHeight"],
  },
  { label: "Gap", slots: ["gap"] },
  {
    label: "Padding",
    slots: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
  },
  {
    label: "Corner radius",
    slots: [
      "radiusTopLeft",
      "radiusTopRight",
      "radiusBottomRight",
      "radiusBottomLeft",
    ],
  },
  { label: "Elevation", slots: ["elevation"] },
];
export interface StructureRuleDialogProps {
  structure: Structure;
  rules: readonly Rule[];
  references: readonly PrimitiveReference[];
  application?: StructureRuleApplication;
  trigger: ReactNode;
  preview: (application: StructureRuleApplication) => TshirtArtifactBundle;
  onApply: (application: StructureRuleApplication) => void;
  onCreateRule?: () => void;
}
export function StructureRuleDialog({
  structure,
  rules,
  references,
  application,
  trigger,
  preview,
  onApply,
  onCreateRule,
}: StructureRuleDialogProps) {
  const compatible = rules.filter((rule) => rule.type === "tshirt-sizing");
  const eligible = eligibleStructureBindings(structure);
  const createDraft = (): StructureRuleApplication =>
    application
      ? structuredClone(application)
      : {
          id: crypto.randomUUID(),
          ruleId: compatible[0]?.id ?? "",
          targets: { kind: "all" },
          previewTargets: { kind: "all" },
        };
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<StructureRuleApplication>(createDraft);
  const [applyError, setApplyError] = useState("");
  const result = useMemo(() => {
    if (!isOpen) return { bundle: null, error: "" };
    if (!draft.ruleId)
      return {
        bundle: null,
        error: "Create a T-shirt sizing rule in Logic first.",
      };
    try {
      const generation = structureGeneration(structure);
      const candidate = {
        ...structure,
        generation: {
          ...generation,
          applications: [
            ...generation.applications.filter((item) => item.id !== draft.id),
            draft,
          ],
        },
      };
      const issues = structureSizes(candidate).flatMap((size) =>
        resolveElements(candidate, references, rules, size).flatMap(
          (element) => element.issues,
        ),
      );
      if (issues.length) throw new Error([...new Set(issues)].join(" "));
      return { bundle: preview(draft), error: "" };
    } catch (failure) {
      return {
        bundle: null,
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [draft, preview, isOpen, structure, references, rules]);
  const rows =
    result.bundle?.semantics.filter((row) =>
      row.applicationIds.includes(draft.id),
    ) ?? [];
  const warningText = [
    ...new Set(
      result.bundle?.diagnostics
        .filter((diagnostic) => diagnostic.structureId === structure.conceptId)
        .map((diagnostic) => diagnostic.message) ?? [],
    ),
  ];
  const selected =
    draft.targets.kind === "all"
      ? eligible.map((binding) => binding.id)
      : draft.targets.bindingIds;
  const children = leafElements(structure).flatMap((element, index) =>
    element.bindings.map((binding) => ({ element, binding, index })),
  );
  const previewTargets = templateTargets(draft);
  const selectedPreviews =
    previewTargets.kind === "all"
      ? children.map((item) => item.binding.id)
      : previewTargets.bindingIds;
  const hasPreview = children.some((item) =>
    selectedPreviews.includes(item.binding.id),
  );
  return (
    <DialogTrigger
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (open) {
          setDraft(createDraft());
          setApplyError("");
        }
        setIsOpen(open);
      }}
    >
      {trigger}
      <Dialog size="L">
        {({ close }) => (
          <>
            <Heading slot="title">
              {application ? "Edit generation rule" : "Add generation rule"}
            </Heading>
            <Content>
              <div className={fieldsStyles}>
                <Picker
                  label="Generation rule"
                  selectedKey={draft.ruleId || null}
                  isDisabled={!compatible.length}
                  placeholder="Choose a T-shirt sizing rule"
                  onSelectionChange={(key) => {
                    if (typeof key === "string") {
                      setDraft((current) => ({ ...current, ruleId: key }));
                      setApplyError("");
                    }
                  }}
                >
                  {compatible.map((rule) => (
                    <PickerItem key={rule.id} id={rule.id}>
                      {rule.name}
                    </PickerItem>
                  ))}
                </Picker>
                {!compatible.length && onCreateRule && (
                  <Button
                    variant="secondary"
                    onPress={() => {
                      close();
                      onCreateRule();
                    }}
                  >
                    Go to Logic
                  </Button>
                )}
                <RadioGroup
                  label="Apply to"
                  value={draft.targets.kind}
                  onChange={(kind) => {
                    setDraft((current) => ({
                      ...current,
                      targets:
                        kind === "all"
                          ? { kind: "all" }
                          : {
                              kind: "custom",
                              bindingIds: [
                                ...eligible.map((binding) => binding.id),
                              ],
                            },
                      previewTargets:
                        kind === "all"
                          ? { kind: "all" }
                          : {
                              kind: "custom",
                              bindingIds: children.map(
                                (item) => item.binding.id,
                              ),
                            },
                    }));
                    setApplyError("");
                  }}
                >
                  <Radio value="all">All token-backed properties</Radio>
                  <Radio value="custom">Custom properties</Radio>
                </RadioGroup>
                <p className={noteStyles}>
                  All follows new token assignments. Custom keeps the selected
                  property identities. Unset values, Hug, Fill, and alignment
                  choices are not scale-token targets.
                </p>
                {eligible.length === 0 && children.length === 0 && (
                  <InlineAlert variant="notice">
                    <Heading>No eligible properties</Heading>
                    <Content>
                      Assign foundation tokens to layout settings or element
                      previews before applying a rule.
                    </Content>
                  </InlineAlert>
                )}
                <CheckboxGroup
                  label="Layout tokens"
                  value={selected}
                  isDisabled={draft.targets.kind === "all"}
                  onChange={(bindingIds) => {
                    setDraft((current) => ({
                      ...current,
                      targets: { kind: "custom", bindingIds },
                    }));
                    setApplyError("");
                  }}
                >
                  {groups.map((group) => (
                    <div key={group.label}>
                      <h4>{group.label}</h4>
                      {group.slots.map((slot) => {
                        const binding = structureBinding(structure, slot);
                        const reference =
                          binding && "$ref" in binding
                            ? references.find(
                                (item) => item.id === binding.$ref,
                              )
                            : undefined;
                        return (
                          <div className={rowStyles} key={slot}>
                            <Checkbox
                              value={structureBindingId(
                                structure.conceptId,
                                slot,
                              )}
                              isDisabled={
                                (!binding || !("$ref" in binding)) &&
                                !selected.includes(
                                  structureBindingId(structure.conceptId, slot),
                                )
                              }
                            >
                              {structureSlotDefinition(slot).label}
                            </Checkbox>
                            {reference ? (
                              <TokenNameTag name={reference.name} />
                            ) : (
                              <span className={noteStyles}>
                                {binding &&
                                "value" in binding &&
                                binding.value.kind === "sizing"
                                  ? binding.value.preset === "hug"
                                    ? "Hug (not eligible)"
                                    : "Fill (not eligible)"
                                  : binding && "$ref" in binding
                                    ? "Unavailable token"
                                    : "Not assigned"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </CheckboxGroup>
                <CheckboxGroup
                  label="Element previews"
                  value={selectedPreviews}
                  isDisabled={draft.targets.kind === "all"}
                  onChange={(bindingIds) => {
                    setDraft((current) => ({
                      ...current,
                      previewTargets: { kind: "custom", bindingIds },
                    }));
                    setApplyError("");
                  }}
                >
                  {children.map(({ element, binding, index }) => (
                    <Checkbox key={binding.id} value={binding.id}>
                      {ELEMENT_TYPES[element.kind].label} {index + 1} -{" "}
                      {ELEMENT_SLOT_LABELS[binding.slot]}
                    </Checkbox>
                  ))}
                </CheckboxGroup>
                <p className={noteStyles}>
                  Element previews resolve existing foundation values across the
                  Structure's enabled sizes. They create no tokens or aliases.
                </p>
                {rows.length > 0 && (
                  <p className={noteStyles}>
                    This table previews names in the pinned token bundle. The
                    Tokens browser uses the Registry's current naming order.
                  </p>
                )}
                {rows.length > 0 && (
                  <TableView
                    aria-label="Generated token preview"
                    density="compact"
                    overflowMode="wrap"
                    styles={style({ maxHeight: 320 })}
                  >
                    <TableHeader>
                      <Column isRowHeader>Name</Column>
                      <Column>Requested / actual</Column>
                      <Column>Target</Column>
                      <Column>Output</Column>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <Row key={row.token.uuid} id={row.token.uuid}>
                          <Cell>{formatTshirtName(row.token.name)}</Cell>
                          <Cell>
                            {row.mapping.requested} / {row.mapping.actual}
                          </Cell>
                          <Cell>{row.target.name}</Cell>
                          <Cell>
                            {"$ref" in row.token ? "Alias" : "Literal"}
                          </Cell>
                        </Row>
                      ))}
                    </TableBody>
                  </TableView>
                )}
                {warningText.length > 0 && (
                  <InlineAlert variant="notice">
                    <Heading>Nearest available targets</Heading>
                    <Content>{warningText.join(" ")}</Content>
                  </InlineAlert>
                )}
                {(applyError || result.error) && (
                  <InlineAlert variant="negative">
                    <Heading>Check this application</Heading>
                    <Content>{applyError || result.error}</Content>
                  </InlineAlert>
                )}
              </div>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={close}>
                Cancel
              </Button>
              <Button
                variant="accent"
                isDisabled={!result.bundle || (!rows.length && !hasPreview)}
                onPress={() => {
                  try {
                    onApply(draft);
                    close();
                  } catch (failure) {
                    setApplyError(
                      failure instanceof Error
                        ? failure.message
                        : String(failure),
                    );
                  }
                }}
              >
                Apply
              </Button>
            </ButtonGroup>
          </>
        )}
      </Dialog>
    </DialogTrigger>
  );
}
