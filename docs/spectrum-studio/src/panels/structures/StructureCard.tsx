// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Checkbox,
  CheckboxGroup,
  Text,
  TextField,
  ToastQueue,
  type TextFieldRef,
} from "@react-spectrum/s2";
import Delete from "@react-spectrum/s2/icons/Delete";
import Add from "@react-spectrum/s2/icons/Add";
import Edit from "@react-spectrum/s2/icons/Edit";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useLayoutEffect, useRef, useState } from "react";
import { foundationCardStyles } from "../../components/foundationCardStyles";
import {
  structureGeneration,
  type Structure,
  type StructureRuleApplication,
} from "../../features/structures/model";
import { COMPONENT_SIZES } from "../../features/foundations/componentSizes";
import { SIZE_TERM_IDS } from "../../features/taxonomy/variantVocabulary";
import type { Rule } from "../../features/logic/model";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";
import type { TshirtArtifactBundle } from "../../features/design-data/tshirtArtifacts";
import { StructureRuleDialog } from "./StructureRuleDialog";

const cardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
  minWidth: 0,
  width: "full",
  boxSizing: "border-box",
  gridColumnStart: 1,
  gridColumnEnd: -1,
  gridRowStart: 1,
  gridRowEnd: "span 2",
});
const nameStyles = style({ flexGrow: 1, minWidth: 0, width: "full" });
const nameRowStyles = style({
  display: "flex",
  alignItems: "end",
  gap: 8,
  width: "full",
  minWidth: 0,
});
const applicationStyles = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  alignItems: "center",
  minWidth: 0,
});
export interface StructureCardProps {
  structure: Structure;
  isReadOnly: boolean;
  focusName?: boolean;
  onNameFocused?: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  rules?: readonly Rule[];
  references?: readonly PrimitiveReference[];
  onSizesChange?: (sizeTermIds: string[]) => void;
  onApplyRule?: (application: StructureRuleApplication) => void;
  onRemoveRule?: (application: StructureRuleApplication) => void;
  previewRule?: (application: StructureRuleApplication) => TshirtArtifactBundle;
}
export function StructureCard({
  structure,
  isReadOnly,
  focusName,
  onNameFocused,
  onRename,
  onDelete,
  rules = [],
  references = [],
  onSizesChange,
  onApplyRule,
  onRemoveRule,
  previewRule,
}: StructureCardProps) {
  const nameRef = useRef<TextFieldRef>(null);
  useLayoutEffect(() => {
    if (!focusName || isReadOnly) return;
    nameRef.current?.focus();
    nameRef.current?.select();
    onNameFocused?.();
  }, [focusName, isReadOnly, onNameFocused]);
  const [draft, setDraft] = useState({
    source: structure.name,
    editing: !isReadOnly,
    value: structure.name,
  });
  const value =
    draft.source === structure.name && draft.editing === !isReadOnly
      ? draft.value
      : structure.name;
  const invalid = !value.trim();
  const commit = () => {
    if (isReadOnly || invalid || value.trim() === structure.name) return;
    try {
      onRename(value);
    } catch (failure) {
      ToastQueue.negative(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  };
  return (
    <section
      className={`${foundationCardStyles} ${cardStyles}`}
      data-component="StructureCard"
      data-structure-id={structure.conceptId}
    >
      <div className={nameRowStyles}>
        <TextField
          label="Name"
          value={value}
          isRequired
          isReadOnly={isReadOnly}
          ref={nameRef}
          styles={nameStyles}
          isInvalid={invalid}
          errorMessage="Give the structure a name."
          onChange={(name) =>
            setDraft({
              source: structure.name,
              editing: !isReadOnly,
              value: name,
            })
          }
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape")
              setDraft({
                source: structure.name,
                editing: !isReadOnly,
                value: structure.name,
              });
          }}
        />
        {!isReadOnly && (
          <ActionButton
            isQuiet
            aria-label={`Delete structure ${structure.name}`}
            onPress={onDelete}
          >
            <Delete />
          </ActionButton>
        )}
      </div>
      {onSizesChange && (
        <CheckboxGroup
          label="Generate sizes"
          orientation="horizontal"
          value={structureGeneration(structure).sizeTermIds}
          isDisabled={isReadOnly}
          onChange={(sizeTermIds) => {
            try {
              onSizesChange([...new Set([SIZE_TERM_IDS.m, ...sizeTermIds])]);
            } catch (failure) {
              ToastQueue.negative(
                failure instanceof Error ? failure.message : String(failure),
              );
            }
          }}
        >
          {COMPONENT_SIZES.map((size) => (
            <Checkbox
              key={size.id}
              value={SIZE_TERM_IDS[size.id]}
              isDisabled={size.id === "m"}
            >
              {size.label}
            </Checkbox>
          ))}
        </CheckboxGroup>
      )}
      {structureGeneration(structure).applications.map((application) => (
        <div key={application.id} className={applicationStyles}>
          <Text>
            {rules.find((rule) => rule.id === application.ruleId)?.name ??
              "Unavailable rule"}
            :{" "}
            {application.targets.kind === "all"
              ? "All token-backed properties"
              : `${application.targets.bindingIds.length} properties`}
          </Text>
          {!isReadOnly && onApplyRule && previewRule && (
            <StructureRuleDialog
              structure={structure}
              rules={rules}
              references={references}
              application={application}
              preview={previewRule}
              onApply={onApplyRule}
              trigger={
                <ActionButton
                  isQuiet
                  aria-label={`Edit generation rule for ${structure.name}`}
                >
                  <Edit />
                </ActionButton>
              }
            />
          )}
          {!isReadOnly && onRemoveRule && (
            <ActionButton
              isQuiet
              aria-label={`Remove generation rule from ${structure.name}`}
              onPress={() => onRemoveRule(application)}
            >
              <Delete />
            </ActionButton>
          )}
        </div>
      ))}
      {!isReadOnly && onApplyRule && previewRule && (
        <StructureRuleDialog
          structure={structure}
          rules={rules}
          references={references}
          preview={previewRule}
          onApply={onApplyRule}
          trigger={
            <ActionButton>
              <Add />
              <Text>Add generation rule</Text>
            </ActionButton>
          }
        />
      )}
    </section>
  );
}
