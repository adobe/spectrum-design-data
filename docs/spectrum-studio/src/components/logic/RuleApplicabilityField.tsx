// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Tag,
  TagGroup,
  Text,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { CategoryIcon } from "../CategoryIcon";
import {
  compatibleRuleTypes,
  RULE_VALUE_TYPES,
  type ApplicableRule,
  type RuleApplicability,
} from "../../features/logic/applicability";

const fieldStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 0,
});
const tagsStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-300",
  borderRadius: "default",
  padding: 8,
  minHeight: 40,
});
const labelStyles = style({ font: "ui-sm" });

export function RuleApplicabilityField({
  rule,
  onChange,
  isReadOnly = false,
}: {
  rule: ApplicableRule;
  onChange: (selection: RuleApplicability) => void;
  isReadOnly?: boolean;
}) {
  const selection = rule.applicability ?? { kind: "all" };
  const selected =
    selection.kind === "all"
      ? [{ id: "all", label: "All", icon: "tokens" }]
      : RULE_VALUE_TYPES.filter((type) => selection.types.includes(type.id));
  const compatible = compatibleRuleTypes(rule.type);
  return (
    <div
      className={fieldStyles}
      role="group"
      aria-label="Token value types"
      data-component="RuleApplicabilityField"
    >
      <span className={labelStyles}>Token value types</span>
      <div className={tagsStyles}>
        <TagGroup
          aria-label="Selected token value types"
          items={selected}
          onRemove={
            isReadOnly
              ? undefined
              : (ids) =>
                  onChange({
                    kind: "specific",
                    types:
                      selection.kind === "all"
                        ? []
                        : selection.types.filter((id) => !ids.has(id)),
                  })
          }
        >
          {(item) => (
            <Tag id={item.id} textValue={item.label}>
              <CategoryIcon category={item.icon} />
              <Text>{item.label}</Text>
            </Tag>
          )}
        </TagGroup>
        {!isReadOnly && (
          <MenuTrigger>
            <ActionButton isQuiet size="S" aria-label="Add token value type">
              <Add />
            </ActionButton>
            <Menu
              aria-label="Token value types"
              onAction={(id) => {
                if (id === "all") onChange({ kind: "all" });
                else {
                  const type = RULE_VALUE_TYPES.find((item) => item.id === id);
                  if (type && compatible.includes(type.id))
                    onChange({
                      kind: "specific",
                      types: [
                        ...new Set([
                          ...(selection.kind === "specific"
                            ? selection.types
                            : []),
                          type.id,
                        ]),
                      ],
                    });
                }
              }}
            >
              <MenuItem id="all" textValue="All">
                <CategoryIcon category="tokens" />
                <Text>All</Text>
              </MenuItem>
              {RULE_VALUE_TYPES.filter((type) =>
                compatible.includes(type.id),
              ).map((type) => (
                <MenuItem key={type.id} id={type.id} textValue={type.label}>
                  <CategoryIcon category={type.icon} />
                  <Text>{type.label}</Text>
                </MenuItem>
              ))}
            </Menu>
          </MenuTrigger>
        )}
      </div>
      {selection.kind === "specific" && selection.types.length === 0 && (
        <span role="alert" className={labelStyles}>
          Choose at least one token value type.
        </span>
      )}
    </div>
  );
}
