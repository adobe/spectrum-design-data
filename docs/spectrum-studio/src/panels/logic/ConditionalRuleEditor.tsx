// Copyright 2026 Adobe. All rights reserved.
import {
  Cell,
  Column,
  Content,
  Heading,
  InlineAlert,
  PickerItem,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo, useState } from "react";
import { ConditionalRuleBuilder } from "../../components/logic/rule-builder/ConditionalRuleBuilder";
import { Picker } from "../../components/fields/Picker";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import { ValuePreview } from "../../components/value-preview/ValuePreview";
import { ModeSetPicker } from "../../components/ModeSetControl";
import {
  conditionalIssues,
  evaluateConditionalRule,
  offsetAvailableToken,
  type ConditionSource,
} from "../../features/logic/conditional";
import { conditionalColorTokens } from "../../features/logic/conditionalPreview";
import type {
  ConditionalRule,
  Rule,
  RuleConditionNode,
} from "../../features/logic/model";
import type { ColorSystemDocument } from "../../features/color-system/model";
import type { ModeSet } from "../../features/modes/model";

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const fields = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 12,
  minWidth: 0,
});
const title = style({ font: "title-sm", margin: 0 });

export interface ConditionalRuleEditorProps {
  rule: ConditionalRule;
  sources: readonly ConditionSource[];
  modeSets: ModeSet[];
  color: ColorSystemDocument;
  rules: readonly Rule[];
  onChange: (rule: ConditionalRule) => void;
  onEditingChange: (editing: boolean) => void;
}

export function ConditionalRuleEditor({
  rule,
  sources,
  modeSets,
  color,
  rules,
  onChange,
  onEditingChange,
}: ConditionalRuleEditorProps) {
  const [classification, setClassification] = useState<Record<string, string>>(
    {},
  );
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const used = new Map<string, { source: ConditionSource; initial: string }>();
  const pending: RuleConditionNode[] = [
    rule.when,
    ...rule.branches.map((branch) => branch.when),
  ];
  while (pending.length) {
    const node = pending.shift()!;
    if (node.kind === "group") pending.push(...node.children);
    else {
      const source = sources.find(
        (source) => source.id === node.sourceId && source.kind === node.source,
      );
      if (source && !used.has(`${source.kind}:${source.id}`))
        used.set(`${source.kind}:${source.id}`, {
          source,
          initial: node.valueId,
        });
    }
  }
  const modes = useMemo(
    () =>
      Object.fromEntries(
        modeSets.map((set) => [set.id, selection[set.id] ?? set.defaultModeId]),
      ),
    [modeSets, selection],
  );
  const context = {
    classification: Object.fromEntries(
      [...used.values()]
        .filter(({ source }) => source.kind === "taxonomy")
        .map(({ source, initial }) => [
          source.id,
          classification[source.id] ?? initial,
        ]),
    ),
    modes,
  };
  const tokens = useMemo(() => {
    try {
      return {
        values: conditionalColorTokens(color, modeSets, modes, rules),
        error: "",
      };
    } catch (failure) {
      return {
        values: [],
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [color, modeSets, modes, rules]);
  const issues = conditionalIssues(rule, sources);
  const evaluation = evaluateConditionalRule(rule, context, sources);
  const preview = (() => {
    if (!anchorId || tokens.error || evaluation.status !== "ready") return null;
    try {
      return {
        ...offsetAvailableToken(anchorId, tokens.values, evaluation.offset),
        error: "",
      };
    } catch (failure) {
      return {
        token: null,
        warning: undefined,
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  })();
  const errors = [
    ...new Set([
      ...issues,
      ...(evaluation.status === "unavailable" ? evaluation.issues : []),
      ...(tokens.error ? [tokens.error] : []),
      ...(preview?.error ? [preview.error] : []),
    ]),
  ];
  return (
    <div className={stack}>
      <h3 className={title}>Conditions</h3>
      <ConditionalRuleBuilder
        rule={rule}
        sources={sources}
        onChange={onChange}
        onEditingChange={onEditingChange}
      />
      {errors.length > 0 && (
        <InlineAlert variant="negative">
          <Heading>Check rule conditions</Heading>
          <Content>{errors.join(" ")}</Content>
        </InlineAlert>
      )}
      <h3 className={title}>Preview</h3>
      <TokenComboBox
        label="Default color"
        options={tokens.values.map((token) => ({
          id: token.id,
          kind: "token",
          name: token.name,
          displayValue: token.value,
        }))}
        selectedKey={anchorId}
        onChange={setAnchorId}
      />
      <div className={fields}>
        {[...used.values()]
          .filter(({ source }) => source.kind === "taxonomy")
          .map(({ source }) => (
            <Picker
              key={source.id}
              label={source.label}
              labelPosition="top"
              selectedKey={context.classification[source.id] ?? null}
              onSelectionChange={(key) => {
                if (key !== null)
                  setClassification((current) => ({
                    ...current,
                    [source.id]: String(key),
                  }));
              }}
            >
              {source.values.map((value) => (
                <PickerItem
                  key={value.id}
                  id={value.id}
                  textValue={value.label}
                >
                  {value.label}
                </PickerItem>
              ))}
            </Picker>
          ))}
        {modeSets
          .filter((set) => set.modes.length > 1)
          .map((set) => (
            <ModeSetPicker
              key={set.id}
              modeSet={set}
              selectedKey={context.modes[set.id]}
              onSelectionChange={(modeId) =>
                setSelection((current) => ({ ...current, [set.id]: modeId }))
              }
            />
          ))}
      </div>
      {preview?.token && evaluation.status === "ready" && (
        <TableView aria-label="Conditional rule preview">
          <TableHeader>
            <Column isRowHeader>Matched</Column>
            <Column>Offset</Column>
            <Column>Result</Column>
            <Column>Preview</Column>
          </TableHeader>
          <TableBody>
            <Row id="result">
              <Cell>
                {!evaluation.matched
                  ? "No match"
                  : evaluation.branchId
                    ? `Branch ${rule.branches.findIndex((branch) => branch.id === evaluation.branchId) + 1}`
                    : rule.branches.length
                      ? "Otherwise"
                      : "Then"}
              </Cell>
              <Cell>
                {evaluation.offset > 0 ? "+" : ""}
                {evaluation.offset}
              </Cell>
              <Cell>{preview.token.name}</Cell>
              <Cell>
                <ValuePreview
                  preview={{ kind: "color", value: preview.token.value }}
                  label={preview.token.name}
                />
              </Cell>
            </Row>
          </TableBody>
        </TableView>
      )}
      {preview?.warning && (
        <InlineAlert variant="notice">
          <Heading>Nearest available token</Heading>
          <Content>{preview.warning}</Content>
        </InlineAlert>
      )}
    </div>
  );
}
