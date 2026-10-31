// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  PickerItem,
  SubmenuTrigger,
  Text,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import Edit from "@react-spectrum/s2/icons/Edit";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useLayoutEffect, useRef, useState } from "react";
import { NumberField } from "../../fields/NumberField";
import { Picker } from "../../fields/Picker";
import { LogicButton } from "../LogicButton";
import { CategoryIcon } from "../../CategoryIcon";
import { MODE_ICONS } from "../../../features/modes/icons";
import {
  conditionText,
  sourceFor,
  updateConditionTree,
  type ConditionSource,
} from "../../../features/logic/conditional";
import {
  createRuleGroup,
  type ConditionalRule,
  type RuleCondition,
  type RuleConditionGroup,
} from "../../../features/logic/model";
import "./rule-builder.css";

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
});
const row = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});
const sentence = style({ flexGrow: 1, minWidth: 0, font: "body" });
const editorStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 12,
  padding: 16,
  minWidth: 0,
});
const itemStyles = style({
  padding: 12,
  borderWidth: 1,
  borderColor: "gray-200",
  borderRadius: "default",
  backgroundColor: "layer-1",
  minWidth: 0,
});
const heading = style({ font: "title-sm", margin: 0 });
const groupStyles = style({
  borderWidth: 1,
  borderColor: "gray-200",
  borderRadius: "default",
  backgroundColor: "layer-2",
});
const andRail = style({ borderColor: "blue-900" });
const orRail = style({ borderColor: "fuchsia-900" });

type InlineEdit =
  | { kind: "condition"; value: RuleCondition; parentId?: string }
  | { kind: "outcome"; id: string; offset: number };

export interface ConditionalRuleBuilderProps {
  rule: ConditionalRule;
  sources: readonly ConditionSource[];
  onChange: (rule: ConditionalRule) => void;
  onEditingChange?: (editing: boolean) => void;
  isReadOnly?: boolean;
}

export function ConditionalRuleBuilder({
  rule,
  sources,
  onChange,
  onEditingChange,
  isReadOnly = false,
}: ConditionalRuleBuilderProps) {
  const [editing, setEditing] = useState<InlineEdit | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const returnRow = useRef<string | null>(null);
  const pendingScopeFocus = useRef<string | null>(null);
  const busy = editing !== null;
  const editId =
    editing?.kind === "condition"
      ? editing.value.id
      : editing?.kind === "outcome"
        ? editing.id
        : null;

  useLayoutEffect(() => {
    if (editId)
      editor.current
        ?.querySelector<HTMLElement>("input, button, [role=combobox]")
        ?.focus();
    else if (returnFocus.current?.isConnected) returnFocus.current.focus();
    else if (returnRow.current)
      root.current
        ?.querySelector<HTMLElement>(
          `[data-statement-id="${CSS.escape(returnRow.current)}"] button`,
        )
        ?.focus();
  }, [editId]);

  useLayoutEffect(() => {
    const scopeId = pendingScopeFocus.current;
    if (!scopeId) return;
    pendingScopeFocus.current = null;
    root.current
      ?.querySelector<HTMLElement>(
        `[data-statement-id="${CSS.escape(scopeId)}"] button`,
      )
      ?.focus();
  }, [rule]);

  function begin(next: InlineEdit) {
    if (editing) {
      editor.current
        ?.querySelector<HTMLElement>("input, button, [role=combobox]")
        ?.focus();
      return;
    }
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    returnRow.current =
      next.kind === "outcome" ? next.id : (next.parentId ?? next.value.id);
    setEditing(next);
    onEditingChange?.(true);
  }
  function finish() {
    setEditing(null);
    onEditingChange?.(false);
  }
  function changeGroup(
    id: string,
    change: (group: RuleConditionGroup) => RuleConditionGroup,
  ) {
    const update = (group: RuleConditionGroup) =>
      group.id === id
        ? change(group)
        : updateConditionTree(group, id, (node) =>
            node.kind === "group" ? change(node) : node,
          );
    onChange({
      ...rule,
      when: update(rule.when),
      branches: rule.branches.map((branch) => ({
        ...branch,
        when: update(branch.when),
      })),
    });
  }
  function changeCondition(value: RuleCondition) {
    const update = (group: RuleConditionGroup) =>
      updateConditionTree(group, value.id, () => value);
    onChange({
      ...rule,
      when: update(rule.when),
      branches: rule.branches.map((branch) => ({
        ...branch,
        when: update(branch.when),
      })),
    });
  }
  function removeNode(id: string, scopeId: string) {
    pendingScopeFocus.current = scopeId;
    const update = (group: RuleConditionGroup) =>
      updateConditionTree(group, id, () => null);
    onChange({
      ...rule,
      when: update(rule.when),
      branches: rule.branches.map((branch) => ({
        ...branch,
        when: update(branch.when),
      })),
    });
  }
  function removeBranch(id: string) {
    onChange({
      ...rule,
      branches: rule.branches.filter((branch) => branch.id !== id),
    });
    results.current?.focus();
  }
  function save() {
    if (!editing) return;
    if (editing.kind === "condition") {
      if (editing.parentId)
        changeGroup(editing.parentId, (group) => ({
          ...group,
          children: [...group.children, editing.value],
        }));
      else changeCondition(editing.value);
    } else if (editing.id === "otherwise") {
      onChange({ ...rule, otherwise: { offset: editing.offset } });
    } else {
      onChange({
        ...rule,
        branches: rule.branches.map((branch) =>
          branch.id === editing.id
            ? { ...branch, then: { offset: editing.offset } }
            : branch,
        ),
      });
    }
    finish();
  }
  function inlineEditor() {
    if (!editing) return null;
    const selected =
      editing.kind === "condition"
        ? sourceFor(editing.value, sources)
        : undefined;
    const valid =
      editing.kind === "outcome"
        ? Number.isSafeInteger(editing.offset)
        : selected?.values.some((value) => value.id === editing.value.valueId);
    return (
      <div
        ref={editor}
        className={editorStyles}
        role="group"
        aria-label="Edit statement"
      >
        {editing.kind === "condition" ? (
          <>
            <Picker
              label="Source"
              labelPosition="top"
              selectedKey={selected ? `${selected.kind}:${selected.id}` : null}
              onSelectionChange={(key) => {
                const source = sources.find(
                  (source) => `${source.kind}:${source.id}` === key,
                );
                if (source)
                  setEditing({
                    ...editing,
                    value: {
                      ...editing.value,
                      source: source.kind,
                      sourceId: source.id,
                      valueId: "",
                    },
                  });
              }}
            >
              {sources.map((source) => (
                <PickerItem
                  key={`${source.kind}:${source.id}`}
                  id={`${source.kind}:${source.id}`}
                  textValue={source.label}
                >
                  {source.label}
                </PickerItem>
              ))}
            </Picker>
            <Picker
              label="Matcher"
              labelPosition="top"
              selectedKey={editing.value.matcher}
              onSelectionChange={(key) => {
                if (key === "is" || key === "is-not")
                  setEditing({
                    ...editing,
                    value: { ...editing.value, matcher: key },
                  });
              }}
            >
              <PickerItem id="is">Is</PickerItem>
              <PickerItem id="is-not">Is not</PickerItem>
            </Picker>
            <Picker
              label="Value"
              labelPosition="top"
              selectedKey={editing.value.valueId || null}
              isRequired
              onSelectionChange={(key) => {
                if (key !== null)
                  setEditing({
                    ...editing,
                    value: { ...editing.value, valueId: String(key) },
                  });
              }}
            >
              {(selected?.values ?? []).map((value) => (
                <PickerItem
                  key={value.id}
                  id={value.id}
                  textValue={value.label}
                >
                  {value.label}
                </PickerItem>
              ))}
            </Picker>
          </>
        ) : (
          <NumberField
            label="Token offset"
            labelPosition="top"
            value={editing.offset}
            step={1}
            onChange={(offset) => setEditing({ ...editing, offset })}
          />
        )}
        <Button size="S" variant="secondary" isDisabled={!valid} onPress={save}>
          Save
        </Button>
        <Button size="S" variant="secondary" onPress={finish}>
          Cancel
        </Button>
      </div>
    );
  }
  function addControls(group: RuleConditionGroup) {
    if (isReadOnly) return null;
    return (
      <div className={row}>
        <MenuTrigger>
          <Button size="S" variant="secondary" isDisabled={busy}>
            <Add />
            <Text>Add condition</Text>
          </Button>
          <Menu aria-label="Condition source">
            {(["mode", "taxonomy"] as const).map((kind) => (
              <SubmenuTrigger key={kind}>
                <MenuItem id={kind}>
                  <CategoryIcon
                    category={kind === "mode" ? "modes" : "tokens"}
                  />
                  <Text>{kind === "mode" ? "Mode set" : "Token category"}</Text>
                </MenuItem>
                <Menu
                  aria-label={
                    kind === "mode" ? "Mode sets" : "Token categories"
                  }
                  onAction={(key) => {
                    const source = sources.find(
                      (source) => source.kind === kind && source.id === key,
                    );
                    if (source)
                      begin({
                        kind: "condition",
                        parentId: group.id,
                        value: {
                          id: `condition-${crypto.randomUUID()}`,
                          kind: "condition",
                          source: kind,
                          sourceId: source.id,
                          matcher: "is",
                          valueId: "",
                        },
                      });
                  }}
                >
                  {sources
                    .filter((source) => source.kind === kind)
                    .map((source) => (
                      <MenuItem
                        key={source.id}
                        id={source.id}
                        textValue={source.label}
                        data-mode-icon={
                          source.kind === "mode" ? source.modeIconId : undefined
                        }
                        isDisabled={!source.values.length}
                      >
                        {source.kind === "mode" &&
                          (source.modeIconId && source.modeIconId !== "none" ? (
                            MODE_ICONS[source.modeIconId]
                          ) : (
                            <CategoryIcon category="modes" />
                          ))}
                        <Text>{source.label}</Text>
                      </MenuItem>
                    ))}
                </Menu>
              </SubmenuTrigger>
            ))}
          </Menu>
        </MenuTrigger>
        <Button
          size="S"
          variant="secondary"
          isDisabled={busy}
          onPress={() =>
            changeGroup(group.id, (current) => ({
              ...current,
              children: [...current.children, createRuleGroup()],
            }))
          }
        >
          <Add />
          <Text>Add group</Text>
        </Button>
      </div>
    );
  }
  function renderGroup(
    group: RuleConditionGroup,
    label: string,
    nested = false,
    parentId?: string,
  ) {
    return (
      <div
        key={group.id}
        className={`conditional-rule-group ${groupStyles}`}
        data-operator={group.operator}
        data-statement-id={group.id}
        role="group"
        aria-label={label}
      >
        <div className={row}>
          <LogicButton
            aria-label={`${label} operator`}
            value={group.operator}
            isDisabled={busy}
            isReadOnly={isReadOnly}
            onChange={(operator) =>
              changeGroup(group.id, (current) => ({ ...current, operator }))
            }
          />
          {nested && !isReadOnly && (
            <ActionButton
              isQuiet
              size="S"
              aria-label={`Delete ${label.toLowerCase()}`}
              isDisabled={busy}
              onPress={() => removeNode(group.id, parentId ?? rule.when.id)}
            >
              <Delete />
            </ActionButton>
          )}
        </div>
        <div
          className={`conditional-rule-children ${group.operator === "and" ? andRail : orRail}`}
        >
          {group.children.map((node) =>
            node.kind === "group" ? (
              renderGroup(node, "Condition group", true, group.id)
            ) : (
              <div
                key={node.id}
                className={itemStyles}
                data-statement-id={node.id}
              >
                {editing?.kind === "condition" &&
                editing.value.id === node.id ? (
                  inlineEditor()
                ) : (
                  <div className={row}>
                    <span className={sentence}>
                      <strong>
                        {sourceFor(node, sources)?.label ??
                          "Unavailable source"}
                      </strong>{" "}
                      {node.matcher === "is" ? "is" : "is not"}{" "}
                      {sourceFor(node, sources)?.values.find(
                        (value) => value.id === node.valueId,
                      )?.label ?? "Unavailable value"}
                    </span>
                    {!isReadOnly && (
                      <>
                        <ActionButton
                          isQuiet
                          size="S"
                          aria-label={`Edit ${conditionText(node, sources)}`}
                          onPress={() =>
                            begin({ kind: "condition", value: { ...node } })
                          }
                        >
                          <Edit />
                        </ActionButton>
                        <ActionButton
                          isQuiet
                          size="S"
                          aria-label={`Delete ${conditionText(node, sources)}`}
                          isDisabled={busy}
                          onPress={() => removeNode(node.id, group.id)}
                        >
                          <Delete />
                        </ActionButton>
                      </>
                    )}
                  </div>
                )}
              </div>
            ),
          )}
          {editing?.kind === "condition" && editing.parentId === group.id && (
            <div className={itemStyles}>{inlineEditor()}</div>
          )}
          {addControls(group)}
        </div>
      </div>
    );
  }
  function outcome(id: string, offset: number, prefix: string) {
    return (
      <div className={itemStyles} data-statement-id={id}>
        {editing?.kind === "outcome" && editing.id === id ? (
          inlineEditor()
        ) : (
          <div className={row}>
            <span className={sentence}>
              <strong>{prefix}</strong> offset token by {offset > 0 ? "+" : ""}
              {offset}
            </span>
            {!isReadOnly && (
              <ActionButton
                isQuiet
                size="S"
                aria-label={`Edit ${prefix.toLowerCase()} offset`}
                onPress={() => begin({ kind: "outcome", id, offset })}
              >
                <Edit />
              </ActionButton>
            )}
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      ref={root}
      className={`${stack} conditional-rule-builder`}
      data-component="ConditionalRuleBuilder"
    >
      <h4 className={heading}>When</h4>
      {renderGroup(rule.when, "Shared conditions")}
      <div
        ref={results}
        tabIndex={-1}
        className={stack}
        role="group"
        aria-label="Results"
      >
        {rule.branches.map((branch, index) => (
          <div key={branch.id} className={`${stack} ${itemStyles}`}>
            <div className={row}>
              <h4 className={`${heading} ${sentence}`}>
                {index === 0 ? "If" : "Else if"}
              </h4>
              {!isReadOnly && (
                <ActionButton
                  isQuiet
                  size="S"
                  isDisabled={busy}
                  aria-label={`Delete branch ${index + 1}`}
                  onPress={() => removeBranch(branch.id)}
                >
                  <Delete />
                </ActionButton>
              )}
            </div>
            {renderGroup(branch.when, `Branch ${index + 1} conditions`)}
            {outcome(branch.id, branch.then.offset, "Then")}
          </div>
        ))}
        {!isReadOnly && (
          <div>
            <Button
              size="S"
              variant="secondary"
              isDisabled={busy}
              onPress={() =>
                onChange({
                  ...rule,
                  branches: [
                    ...rule.branches,
                    {
                      id: `branch-${crypto.randomUUID()}`,
                      when: createRuleGroup(),
                      then: { offset: 0 },
                    },
                  ],
                })
              }
            >
              <Add />
              <Text>Add branch</Text>
            </Button>
          </div>
        )}
        {outcome(
          "otherwise",
          rule.otherwise.offset,
          rule.branches.length ? "Otherwise" : "Then",
        )}
      </div>
    </div>
  );
}
