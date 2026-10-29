// Copyright 2026 Adobe. All rights reserved.
import {
  Cell,
  Column,
  NumberField,
  Picker,
  PickerItem,
  Row,
  TableBody,
  TableHeader,
  TableView,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import { roundToFactor } from "../../features/foundations/rounding";
import {
  evaluateConditions,
  lintConditions,
  sampleInputs,
} from "../../features/logic/evaluate";
import {
  ROUNDING_DEPTHS,
  type RoundingDepth,
  type RoundingRule,
} from "../../features/logic/model";
import { formatFactor } from "../../features/logic/registry";
import { ConditionList } from "./ConditionList";

const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});
const rowStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 16,
});
const titleStyles = style({ font: "title-sm", margin: 0 });
const resultStyles = style({ font: "body", margin: 0 });
const noteStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});

const DEPTH_LABELS: Record<RoundingDepth, string> = {
  1: "Whole units (1)",
  10: "Tenths (10)",
  100: "Hundredths (100)",
  1000: "Thousandths (1000)",
};

function describeMatch(rule: RoundingRule, conditionId: string | null) {
  const index = rule.conditions.findIndex(
    (condition) => condition.id === conditionId,
  );
  return index === -1 ? "Default" : `Condition ${index + 1}`;
}

export interface RoundingRuleEditorProps {
  rule: RoundingRule;
  onChange: (rule: RoundingRule) => void;
  isReadOnly?: boolean;
}

export function RoundingRuleEditor({
  rule,
  onChange,
  isReadOnly = false,
}: RoundingRuleEditorProps) {
  const [testValue, setTestValue] = useState(12.5);
  const lint = lintConditions(rule.conditions);
  const match = evaluateConditions(rule, testValue);
  const samples = sampleInputs(rule);

  return (
    <div className={sectionStyles} data-component="RoundingRuleEditor">
      <div className={rowStyles}>
        <Picker
          label="Depth"
          isDisabled={isReadOnly}
          selectedKey={String(rule.depth)}
          onSelectionChange={(key) =>
            onChange({ ...rule, depth: Number(key) as RoundingDepth })
          }
          contextualHelp={undefined}
        >
          {ROUNDING_DEPTHS.map((depth) => (
            <PickerItem
              key={depth}
              id={String(depth)}
              textValue={DEPTH_LABELS[depth]}
            >
              {DEPTH_LABELS[depth]}
            </PickerItem>
          ))}
        </Picker>
        <NumberField
          label="Default factor"
          description="Used when no condition matches. 0 means no rounding."
          minValue={0}
          isReadOnly={isReadOnly}
          value={rule.defaultOutcome.factor}
          onChange={(factor) =>
            Number.isFinite(factor) &&
            onChange({ ...rule, defaultOutcome: { factor } })
          }
        />
      </div>

      <h4 className={titleStyles}>Conditions</h4>
      <p className={noteStyles}>
        Checked in order against the unrounded value. The first match sets the
        factor.
      </p>
      <ConditionList
        conditions={rule.conditions}
        onChange={(conditions) => onChange({ ...rule, conditions })}
        unreachableIds={lint.unreachable}
        matchedId={match.conditionId}
        isReadOnly={isReadOnly}
      />
      {!lint.defaultReachable && (
        <p className={noteStyles}>
          The conditions cover every value, so the default factor is never used.
        </p>
      )}

      <h4 className={titleStyles}>Preview</h4>
      <div className={rowStyles}>
        <NumberField
          label="Test value"
          value={testValue}
          onChange={(value) => Number.isFinite(value) && setTestValue(value)}
          step={0.1}
        />
        <p
          className={resultStyles}
          aria-live="polite"
          data-testid="rule-test-result"
        >
          <Text>
            {describeMatch(rule, match.conditionId)} · factor{" "}
            {formatFactor(match.outcome.factor)} · {testValue} →{" "}
            {roundToFactor(testValue, match.outcome.factor, rule.depth)}
          </Text>
        </p>
      </div>
      <TableView
        aria-label="Sample values"
        density="compact"
        styles={style({ maxHeight: 280 })}
      >
        <TableHeader>
          <Column isRowHeader>Value</Column>
          <Column>Matched</Column>
          <Column>Factor</Column>
          <Column>Result</Column>
        </TableHeader>
        <TableBody>
          {samples.map((value) => {
            const sample = evaluateConditions(rule, value);
            return (
              <Row key={value} id={String(value)}>
                <Cell>{value}</Cell>
                <Cell>{describeMatch(rule, sample.conditionId)}</Cell>
                <Cell>{formatFactor(sample.outcome.factor)}</Cell>
                <Cell>
                  {roundToFactor(value, sample.outcome.factor, rule.depth)}
                </Cell>
              </Row>
            );
          })}
        </TableBody>
      </TableView>
    </div>
  );
}
