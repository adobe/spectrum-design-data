// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  Cell,
  Column,
  Content,
  Heading,
  InlineAlert,
  Menu,
  MenuItem,
  MenuTrigger,
  PickerItem,
  Row,
  TableBody,
  TableHeader,
  TableView,
  Text,
  TextField,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import { RuleApplicabilityField } from "../../components/logic/RuleApplicabilityField";
import { designSystemDefaults } from "../../data/defaults";
import { rulesAtom } from "../../features/logic/library";
import {
  isRoundingRule,
  type TshirtSizingRule,
} from "../../features/logic/model";
import { scaleTypesAtom } from "../../features/logic/scaleTypeLibrary";
import {
  generatorDefault,
  generatorSizeKey,
  rebaseGenerator,
} from "../../features/logic/generator";
import {
  emptyGeneratorEdit,
  type GeneratorEdit,
} from "../../features/logic/generatorEdit";
import { ruleAppliesToReference } from "../../features/logic/applicability";
import { tshirtMappings, tshirtRatio } from "../../features/logic/tshirt";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { VARIANT_CATEGORY_IDS } from "../../features/taxonomy/variantVocabulary";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";

const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const fieldsStyles = style({
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fit, minmax(min(240px, 100%), 1fr))]",
  gap: 16,
});
const cardStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 12,
  padding: 16,
  backgroundColor: "layer-1",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
  borderRadius: "lg",
});
const titleStyles = style({ font: "title-sm", margin: 0 });
const noteStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});

export interface TshirtSizingRuleEditorProps {
  rule: TshirtSizingRule;
  references: readonly PrimitiveReference[];
  onChange: (rule: TshirtSizingRule) => void;
  taxonomy?: TaxonomyDocument;
  edit?: GeneratorEdit;
  onEditChange?: (edit: GeneratorEdit) => void;
  removedUses?: { termId: string; label: string }[];
  isReadOnly?: boolean;
}

export function TshirtSizingRuleEditor({
  rule,
  references,
  onChange,
  taxonomy = designSystemDefaults.system.taxonomy,
  edit = emptyGeneratorEdit(),
  onEditChange,
  removedUses = [],
  isReadOnly = false,
}: TshirtSizingRuleEditorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const rules = useAtomValue(rulesAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const ratioParts = scaleTypes.flatMap((type) =>
    type.parameters.map((parameter) => ({
      key: `${type.id}::${parameter.id}`,
      label: `${type.name} ${parameter.label.toLowerCase()} (${parameter.default})`,
      scaleTypeId: type.id,
      parameterId: parameter.id,
    })),
  );
  const ratioKey =
    rule.ratio?.kind === "parameter"
      ? `${rule.ratio.scaleTypeId}::${rule.ratio.parameterId}`
      : "value";
  let ratioError = "";
  if (rule.movement === "ratio")
    try {
      tshirtRatio(rule, scaleTypes);
    } catch (failure) {
      ratioError = failure instanceof Error ? failure.message : String(failure);
    }
  const terms = [
    ...taxonomy.terms.filter(
      (term) => !edit.terms.some((draft) => draft.id === term.id),
    ),
    ...edit.terms,
  ].filter((term) => term.categoryId === VARIANT_CATEGORY_IDS.size);
  const label = (id: string) =>
    termLabel(terms.find((term) => term.id === id)?.value ?? id);
  const eligible = references.filter((reference) =>
    ruleAppliesToReference(rule, reference),
  );
  const preview = useMemo(() => {
    if (!selected) return { mappings: [], error: "" };
    try {
      const anchor = eligible.find((reference) => reference.id === selected);
      if (!anchor)
        throw new Error("Choose a default token from a supported value type.");
      return {
        mappings: tshirtMappings(
          rule,
          anchor,
          references,
          rule.mappings.map((mapping) => generatorSizeKey(mapping.termId)),
          { rules, scaleTypes },
        ),
        error: "",
      };
    } catch (failure) {
      return {
        mappings: [],
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [rule, references, selected, eligible, rules, scaleTypes]);
  return (
    <div className={sectionStyles} data-component="TshirtSizingRuleEditor">
      <div className={fieldsStyles}>
        <RuleApplicabilityField
          rule={rule}
          isReadOnly={isReadOnly}
          onChange={(applicability) => onChange({ ...rule, applicability })}
        />
        <Picker
          label="Move along the scale by"
          labelPosition="top"
          selectedKey={rule.movement}
          isDisabled={isReadOnly}
          description="Changing the method resets suggested offsets. Review them before saving."
          onSelectionChange={(key) => {
            if (
              key !== "available-token" &&
              key !== "scale-index" &&
              key !== "ratio"
            )
              return;
            const position = rule.mappings.findIndex(
              (mapping) => mapping.termId === generatorDefault(rule),
            );
            const { ratio: _ratio, roundingRuleId: _rounding, ...rest } = rule;
            void _ratio;
            void _rounding;
            onChange({
              ...rest,
              movement: key,
              ...(key === "ratio" && {
                ratio: rule.ratio ?? { kind: "value" as const, value: 1.125 },
                ...(rule.roundingRuleId && {
                  roundingRuleId: rule.roundingRuleId,
                }),
              }),
              mappings: rule.mappings.map((mapping, index) => ({
                ...mapping,
                offset: (index - position) * (key === "scale-index" ? 100 : 1),
              })),
            });
          }}
        >
          <PickerItem id="available-token">Available tokens</PickerItem>
          <PickerItem id="scale-index">Numeric scale index</PickerItem>
          <PickerItem id="ratio">Multiply by ratio</PickerItem>
        </Picker>
        {rule.movement === "ratio" && (
          <Picker
            label="Ratio"
            labelPosition="top"
            selectedKey={ratioKey}
            isDisabled={isReadOnly}
            description="Each step up multiplies the default value by this ratio. Each step down divides by it."
            onSelectionChange={(key) => {
              if (key === "value")
                return onChange({
                  ...rule,
                  ratio: {
                    kind: "value",
                    value: rule.ratio ? tshirtRatioOr(rule, scaleTypes) : 1.125,
                  },
                });
              const part = ratioParts.find((item) => item.key === key);
              if (part)
                onChange({
                  ...rule,
                  ratio: {
                    kind: "parameter",
                    scaleTypeId: part.scaleTypeId,
                    parameterId: part.parameterId,
                  },
                });
            }}
          >
            {[
              <PickerItem key="value" id="value">
                Type a ratio
              </PickerItem>,
              ...ratioParts.map((part) => (
                <PickerItem key={part.key} id={part.key}>
                  {part.label}
                </PickerItem>
              )),
            ]}
          </Picker>
        )}
        {rule.movement === "ratio" && rule.ratio?.kind === "value" && (
          <NumberField
            label="Ratio value"
            labelPosition="top"
            value={rule.ratio.value}
            minValue={0.001}
            step={0.001}
            isReadOnly={isReadOnly}
            isInvalid={!!ratioError}
            errorMessage={ratioError}
            onChange={(value) =>
              onChange({ ...rule, ratio: { kind: "value", value } })
            }
          />
        )}
        {rule.movement === "ratio" && (
          <Picker
            label="Round each value with"
            labelPosition="top"
            selectedKey={rule.roundingRuleId ?? "none"}
            isDisabled={isReadOnly}
            onSelectionChange={(key) => {
              const { roundingRuleId: _rounding, ...rest } = rule;
              void _rounding;
              onChange(
                key === "none" || key === null
                  ? rest
                  : { ...rest, roundingRuleId: String(key) },
              );
            }}
          >
            {[
              <PickerItem key="none" id="none">
                No rounding
              </PickerItem>,
              ...rules.filter(isRoundingRule).map((item) => (
                <PickerItem key={item.id} id={item.id}>
                  {item.name}
                </PickerItem>
              )),
            ]}
          </Picker>
        )}
      </div>
      {rule.movement === "ratio" && ratioError && (
        <InlineAlert variant="negative">
          <Heading>Check the ratio</Heading>
          <Content>{ratioError}</Content>
        </InlineAlert>
      )}
      <h3 className={titleStyles}>Generated options</h3>
      {rule.mappings.map((mapping) => {
        const isDefault = mapping.termId === generatorDefault(rule);
        const term = terms.find((term) => term.id === mapping.termId);
        return (
          <div key={mapping.termId} className={cardStyles}>
            <TextField
              label="Name"
              value={
                term
                  ? edit.terms.some((draft) => draft.id === term.id)
                    ? String(term.value)
                    : termLabel(term.value)
                  : ""
              }
              isReadOnly={isReadOnly || !onEditChange}
              isRequired
              isInvalid={!term || !String(term.value).trim()}
              errorMessage="Enter a Size option name."
              onChange={(value) => {
                if (!term) return;
                onEditChange?.({
                  ...edit,
                  terms: [
                    ...edit.terms.filter((item) => item.id !== term.id),
                    { ...term, value },
                  ],
                });
              }}
            />
            <NumberField
              label={rule.movement === "ratio" ? "Steps" : "Token offset"}
              aria-label={`${label(mapping.termId)} ${rule.movement === "ratio" ? "steps" : "token offset"}`}
              labelPosition="top"
              value={mapping.offset}
              step={1}
              isReadOnly={isReadOnly || isDefault}
              isInvalid={!Number.isSafeInteger(mapping.offset)}
              errorMessage="Enter an integer offset."
              onChange={(offset) =>
                onChange({
                  ...rule,
                  mappings: rule.mappings.map((item) =>
                    item.termId === mapping.termId ? { ...item, offset } : item,
                  ),
                })
              }
            />
            <Button
              size="S"
              variant="secondary"
              isDisabled={isDefault || isReadOnly}
              aria-label={
                isDefault
                  ? `${label(mapping.termId)} is the default`
                  : `Use ${label(mapping.termId)} as default`
              }
              onPress={() => {
                try {
                  onChange(rebaseGenerator(rule, mapping.termId));
                  setError("");
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : String(failure),
                  );
                }
              }}
            >
              {isDefault ? "Default" : "Use as default"}
            </Button>
            {!isReadOnly && (
              <ActionButton
                isQuiet
                aria-label={`Delete option ${label(mapping.termId)}`}
                isDisabled={isDefault}
                onPress={() =>
                  onChange({
                    ...rule,
                    mappings: rule.mappings.filter(
                      (item) => item.termId !== mapping.termId,
                    ),
                  })
                }
              >
                <Delete />
              </ActionButton>
            )}
          </div>
        );
      })}
      {!isReadOnly && (
        <div>
          <MenuTrigger>
            <Button variant="secondary">
              <Add />
              <Text>Add option</Text>
            </Button>
            <Menu
              aria-label="Add Size option"
              onAction={(id) => {
                const termId = id === "new" ? crypto.randomUUID() : String(id);
                if (id === "new")
                  onEditChange?.({
                    ...edit,
                    terms: [
                      ...edit.terms,
                      {
                        id: termId,
                        categoryId: VARIANT_CATEGORY_IDS.size,
                        value: "",
                        description: "",
                      },
                    ],
                  });
                onChange({
                  ...rule,
                  mappings: [...rule.mappings, { termId, offset: 0 }],
                });
              }}
            >
              {onEditChange && <MenuItem id="new">New Size option</MenuItem>}
              {terms
                .filter(
                  (term) =>
                    !rule.mappings.some(
                      (mapping) => mapping.termId === term.id,
                    ),
                )
                .map((term) => (
                  <MenuItem key={term.id} id={term.id}>
                    {termLabel(term.value)}
                  </MenuItem>
                ))}
            </Menu>
          </MenuTrigger>
        </div>
      )}
      {removedUses.map((use) => (
        <Picker
          key={use.termId}
          label={`Replace ${label(use.termId)}`}
          labelPosition="top"
          description={use.label}
          selectedKey={edit.replacements[use.termId] ?? null}
          onSelectionChange={(id) =>
            id !== null &&
            onEditChange?.({
              ...edit,
              replacements: { ...edit.replacements, [use.termId]: String(id) },
            })
          }
        >
          {rule.mappings.map((mapping) => (
            <PickerItem key={mapping.termId} id={mapping.termId}>
              {label(mapping.termId)}
            </PickerItem>
          ))}
        </Picker>
      ))}
      {error && (
        <InlineAlert variant="negative">
          <Heading>Check default option</Heading>
          <Content>{error}</Content>
        </InlineAlert>
      )}
      <h3 className={titleStyles}>Preview</h3>
      <TokenComboBox
        label="Default value"
        options={eligible.map((reference) => ({
          id: reference.id,
          kind: "token",
          name: reference.name,
          displayValue: reference.displayValue,
          hidden: reference.hidden,
          error: reference.error,
        }))}
        selectedKey={selected}
        onChange={setSelected}
      />
      <p className={noteStyles}>
        This token is only a preview. It is not saved with the rule.
      </p>
      {preview.error && (
        <InlineAlert variant="negative">
          <Heading>Cannot generate the preview</Heading>
          <Content>{preview.error}</Content>
        </InlineAlert>
      )}
      {preview.mappings.length > 0 && (
        <TableView aria-label="Generator preview" density="compact">
          <TableHeader>
            <Column isRowHeader>Option</Column>
            <Column>Token</Column>
            <Column>Value</Column>
            <Column>Output</Column>
          </TableHeader>
          <TableBody>
            {preview.mappings.map((mapping) => (
              <Row id={mapping.termId} key={mapping.termId}>
                <Cell>{label(mapping.termId)}</Cell>
                <Cell>{mapping.target.name}</Cell>
                <Cell>{mapping.target.displayValue}</Cell>
                <Cell>{mapping.target.hidden ? "Literal" : "Alias"}</Cell>
              </Row>
            ))}
          </TableBody>
        </TableView>
      )}
      {preview.mappings
        .filter((mapping) => mapping.warning)
        .map((mapping) => (
          <InlineAlert key={mapping.termId} variant="notice">
            <Heading>Nearest available token</Heading>
            <Content>{mapping.warning}</Content>
          </InlineAlert>
        ))}
    </div>
  );
}

function tshirtRatioOr(
  rule: TshirtSizingRule,
  scaleTypes: Parameters<typeof tshirtRatio>[1],
) {
  try {
    return tshirtRatio(rule, scaleTypes);
  } catch {
    return 1.125;
  }
}
