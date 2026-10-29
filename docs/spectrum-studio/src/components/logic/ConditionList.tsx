// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  NumberField,
  Picker,
  PickerItem,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import ChevronDown from "@react-spectrum/s2/icons/ChevronDown";
import ChevronUp from "@react-spectrum/s2/icons/ChevronUp";
import Delete from "@react-spectrum/s2/icons/Delete";
import AlertTriangle from "@react-spectrum/s2/icons/AlertTriangle";
import {
  COMPARATORS,
  createCondition,
  type Comparator,
  type Condition,
  type RoundingOutcome,
} from "../../features/logic/model";

const listStyles = style({ display: "flex", flexDirection: "column", gap: 8 });
const rowStyles = style({
  display: "grid",
  gridTemplateColumns:
    "[24px minmax(180px, 1.4fr) minmax(96px, 1fr) minmax(96px, 1fr) auto]",
  alignItems: "end",
  gap: 8,
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
}

/** Ordered rows: the first condition the raw value matches decides the factor. */
export function ConditionList({
  conditions,
  onChange,
  unreachableIds = [],
  matchedId,
  isReadOnly = false,
}: ConditionListProps) {
  const update = (id: string, patch: Partial<Condition<RoundingOutcome>>) =>
    onChange(
      conditions.map((condition) =>
        condition.id === id ? { ...condition, ...patch } : condition,
      ),
    );
  const move = (index: number, offset: number) => {
    const next = [...conditions];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    onChange(next);
  };
  const add = () => {
    const last = conditions[conditions.length - 1];
    onChange([
      ...conditions,
      createCondition(
        last ? last.threshold * 2 || 10 : 10,
        last?.outcome.factor ?? 1,
      ),
    ]);
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
      {conditions.map((condition, index) => {
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
                  Number.isFinite(threshold) &&
                  update(condition.id, { threshold })
                }
              />
              <NumberField
                label="Factor"
                aria-label={`${label} factor`}
                size="S"
                minValue={0}
                isReadOnly={isReadOnly}
                value={condition.outcome.factor}
                onChange={(factor) =>
                  Number.isFinite(factor) &&
                  update(condition.id, { outcome: { factor } })
                }
              />
              {!isReadOnly && (
                <span className={actionsStyles}>
                  <ActionButton
                    size="S"
                    isQuiet
                    aria-label={`Move ${label.toLowerCase()} up`}
                    isDisabled={index === 0}
                    onPress={() => move(index, -1)}
                  >
                    <ChevronUp />
                  </ActionButton>
                  <ActionButton
                    size="S"
                    isQuiet
                    aria-label={`Move ${label.toLowerCase()} down`}
                    isDisabled={index === conditions.length - 1}
                    onPress={() => move(index, 1)}
                  >
                    <ChevronDown />
                  </ActionButton>
                  <ActionButton
                    size="S"
                    isQuiet
                    aria-label={`Delete ${label.toLowerCase()}`}
                    onPress={() =>
                      onChange(
                        conditions.filter((item) => item.id !== condition.id),
                      )
                    }
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
      })}
      {!isReadOnly && (
        <div>
          <Button variant="secondary" size="S" onPress={add}>
            <Add />
            <Text>Add condition</Text>
          </Button>
        </div>
      )}
    </div>
  );
}
