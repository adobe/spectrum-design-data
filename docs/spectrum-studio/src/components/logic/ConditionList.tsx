// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Button, PickerItem, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import ChevronDown from "@react-spectrum/s2/icons/ChevronDown";
import ChevronUp from "@react-spectrum/s2/icons/ChevronUp";
import Delete from "@react-spectrum/s2/icons/Delete";
import AlertTriangle from "@react-spectrum/s2/icons/AlertTriangle";
import Edit from "@react-spectrum/s2/icons/Edit";
import { useState } from "react";
import { NumberField } from "../fields/NumberField";
import { Picker } from "../fields/Picker";
import {
  COMPARATORS,
  createCondition,
  type Comparator,
  type Condition,
  type RoundingOutcome,
} from "../../features/logic/model";

const listStyles = style({ display: "flex", flexDirection: "column", gap: 8 });
const rowStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 12,
  padding: 16,
  borderRadius: "lg",
  backgroundColor: "layer-1",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
});
const indexStyles = style({
  font: "ui-sm",
  color: "neutral-subdued",
  paddingBottom: 8,
});
const warningStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  font: "ui-sm",
  color: "negative",
  gridColumnStart: 2,
  gridColumnEnd: -1,
});
const actionsStyles = style({ display: "flex", gap: 4 });
const emptyStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});

export interface ConditionListProps {
  conditions: Condition<RoundingOutcome>[];
  onChange: (conditions: Condition<RoundingOutcome>[]) => void;
  unreachableIds?: readonly string[];
  matchedId?: string | null;
  isReadOnly?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

/** Ordered rows: the first condition the raw value matches decides the factor. */
export function ConditionList({
  conditions,
  onChange,
  unreachableIds = [],
  matchedId,
  isReadOnly = false,
  onEditingChange,
}: ConditionListProps) {
  const [editing, setEditing] = useState<Condition<RoundingOutcome> | null>(
    null,
  );
  const [isNew, setIsNew] = useState(false);
  const update = (_id: string, patch: Partial<Condition<RoundingOutcome>>) =>
    setEditing((current) => current && { ...current, ...patch });
  const finish = () => {
    setEditing(null);
    setIsNew(false);
    onEditingChange?.(false);
  };
  const move = (index: number, offset: number) => {
    const next = [...conditions];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    onChange(next);
  };
  const add = () => {
    const last = conditions[conditions.length - 1];
    setEditing(
      createCondition(
        last ? last.threshold * 2 || 10 : 10,
        last?.outcome.factor ?? 1,
      ),
    );
    setIsNew(true);
    onEditingChange?.(true);
  };

  return (
    <div
      className={listStyles}
      data-component="ConditionList"
      role="list"
      aria-label="Conditions"
    >
      {conditions.length === 0 && (
        <p className={emptyStyles}>
          No conditions. The default factor applies to every value.
        </p>
      )}
      {[...conditions, ...(isNew && editing ? [editing] : [])].map(
        (saved, index) => {
          const isEditing = !isReadOnly && editing?.id === saved.id;
          const condition = isEditing ? editing : saved;
          const label = `Condition ${index + 1}`;
          const isUnreachable = unreachableIds.includes(condition.id);
          return (
            <div
              key={condition.id}
              role="listitem"
              aria-label={label}
              data-matched={matchedId === condition.id || undefined}
            >
              <div className={rowStyles}>
                {!isEditing ? (
                  <>
                    <Text>
                      When value is{" "}
                      {COMPARATORS.find(
                        (item) => item.id === condition.comparator,
                      )?.label.toLowerCase()}{" "}
                      {condition.threshold}, use rounding factor{" "}
                      {condition.outcome.factor}.
                    </Text>
                    {!isReadOnly && (
                      <ActionButton
                        isQuiet
                        size="S"
                        aria-label={`Edit ${label.toLowerCase()}`}
                        isDisabled={!!editing}
                        onPress={() => {
                          setEditing(structuredClone(condition));
                          onEditingChange?.(true);
                        }}
                      >
                        <Edit />
                      </ActionButton>
                    )}
                  </>
                ) : (
                  <>
                    <span className={indexStyles} aria-hidden>
                      {index + 1}
                    </span>
                    <Picker
                      label="When value is"
                      aria-label={`${label} comparison`}
                      size="S"
                      isDisabled={isReadOnly}
                      selectedKey={condition.comparator}
                      onSelectionChange={(key) =>
                        update(condition.id, { comparator: key as Comparator })
                      }
                    >
                      {COMPARATORS.map((comparator) => (
                        <PickerItem
                          key={comparator.id}
                          id={comparator.id}
                          textValue={comparator.label}
                        >
                          {comparator.label}
                        </PickerItem>
                      ))}
                    </Picker>
                    <NumberField
                      label="Threshold"
                      aria-label={`${label} threshold`}
                      size="S"
                      isReadOnly={isReadOnly}
                      value={condition.threshold}
                      onChange={(threshold) =>
                        update(condition.id, { threshold })
                      }
                      isInvalid={!Number.isFinite(condition.threshold)}
                      errorMessage="Enter a finite threshold."
                    />
                    <NumberField
                      label="Rounding factor"
                      aria-label={`${label} factor`}
                      size="S"
                      minValue={0}
                      isReadOnly={isReadOnly}
                      value={condition.outcome.factor}
                      onChange={(factor) =>
                        update(condition.id, { outcome: { factor } })
                      }
                      isInvalid={
                        !Number.isFinite(condition.outcome.factor) ||
                        condition.outcome.factor < 0
                      }
                      errorMessage="Enter a non-negative rounding factor."
                    />
                    <Button
                      variant="primary"
                      size="S"
                      isDisabled={
                        !Number.isFinite(condition.threshold) ||
                        !Number.isFinite(condition.outcome.factor) ||
                        condition.outcome.factor < 0
                      }
                      onPress={() => {
                        onChange(
                          isNew
                            ? [...conditions, condition]
                            : conditions.map((item) =>
                                item.id === condition.id ? condition : item,
                              ),
                        );
                        finish();
                      }}
                    >
                      Save
                    </Button>
                    <Button variant="secondary" size="S" onPress={finish}>
                      Cancel
                    </Button>
                  </>
                )}
                {!isReadOnly && (
                  <span className={actionsStyles}>
                    <ActionButton
                      size="S"
                      isQuiet
                      aria-label={`Move ${label.toLowerCase()} up`}
                      isDisabled={!!editing || index === 0}
                      onPress={() => move(index, -1)}
                    >
                      <ChevronUp />
                    </ActionButton>
                    <ActionButton
                      size="S"
                      isQuiet
                      aria-label={`Move ${label.toLowerCase()} down`}
                      isDisabled={!!editing || index === conditions.length - 1}
                      onPress={() => move(index, 1)}
                    >
                      <ChevronDown />
                    </ActionButton>
                    <ActionButton
                      size="S"
                      isQuiet
                      aria-label={`Delete ${label.toLowerCase()}`}
                      isDisabled={!!editing && !isEditing}
                      onPress={() => {
                        onChange(
                          conditions.filter((item) => item.id !== condition.id),
                        );
                        if (isEditing) finish();
                      }}
                    >
                      <Delete />
                    </ActionButton>
                  </span>
                )}
                {isUnreachable && (
                  <span className={warningStyles}>
                    <AlertTriangle aria-hidden />
                    <Text>
                      Never used: an earlier condition already matches these
                      values.
                    </Text>
                  </span>
                )}
              </div>
            </div>
          );
        },
      )}
      {!isReadOnly && (
        <div>
          <Button
            variant="secondary"
            size="S"
            isDisabled={!!editing}
            onPress={add}
          >
            <Add />
            <Text>Add condition</Text>
          </Button>
        </div>
      )}
    </div>
  );
}
