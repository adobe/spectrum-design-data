// Copyright 2026 Adobe. All rights reserved.
import {
  Cell,
  Column,
  Content,
  Heading,
  InlineAlert,
  NumberField,
  Picker,
  PickerItem,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo, useState } from "react";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import { COMPONENT_SIZES } from "../../features/foundations/componentSizes";
import {
  createTshirtMappings,
  type TshirtSizingRule,
} from "../../features/logic/model";
import { tshirtMappings } from "../../features/logic/tshirt";
import { SIZE_TERM_IDS } from "../../features/taxonomy/variantVocabulary";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";

const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const fieldsStyles = style({
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fit, minmax(120px, 1fr))]",
  gap: 12,
});
const noteStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});

export interface TshirtSizingRuleEditorProps {
  rule: TshirtSizingRule;
  references: readonly PrimitiveReference[];
  onChange: (rule: TshirtSizingRule) => void;
  isReadOnly?: boolean;
}

export function TshirtSizingRuleEditor({
  rule,
  references,
  onChange,
  isReadOnly = false,
}: TshirtSizingRuleEditorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const preview = useMemo(() => {
    if (!selected) return { mappings: [], error: "" };
    try {
      const anchor = references.find((reference) => reference.id === selected);
      if (!anchor)
        throw new Error("The representative token is no longer available.");
      return {
        mappings: tshirtMappings(
          rule,
          anchor,
          references,
          COMPONENT_SIZES.map((size) => size.id),
        ),
        error: "",
      };
    } catch (failure) {
      return {
        mappings: [],
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [rule, references, selected]);
  return (
    <div className={sectionStyles} data-component="TshirtSizingRuleEditor">
      <Picker
        label="Move along the scale by"
        selectedKey={rule.movement}
        isDisabled={isReadOnly}
        description="Changing the method resets its suggested offsets. Review them before saving."
        onSelectionChange={(key) => {
          if (key === "available-token" || key === "scale-index")
            onChange({
              ...rule,
              movement: key,
              mappings: createTshirtMappings(key),
            });
        }}
      >
        <PickerItem id="available-token">Available tokens</PickerItem>
        <PickerItem id="scale-index">Numeric scale index</PickerItem>
      </Picker>
      <p className={noteStyles}>
        Medium uses the assigned token. Structures choose which sizes to
        generate. Missing requested steps use the nearest token with a warning.
      </p>
      <div className={fieldsStyles}>
        {COMPONENT_SIZES.map((size) => {
          const termId = SIZE_TERM_IDS[size.id],
            value =
              rule.mappings.find((mapping) => mapping.termId === termId)
                ?.offset ?? NaN;
          return (
            <NumberField
              key={size.id}
              label={`${size.label} offset`}
              value={value}
              step={1}
              isReadOnly={isReadOnly || size.id === "m"}
              isInvalid={!Number.isSafeInteger(value)}
              errorMessage="Enter an integer offset."
              onChange={(offset) =>
                onChange({
                  ...rule,
                  mappings: rule.mappings.map((mapping) =>
                    mapping.termId === termId
                      ? { ...mapping, offset }
                      : mapping,
                  ),
                })
              }
            />
          );
        })}
      </div>
      <TokenComboBox
        label="Representative Medium token"
        options={references.map((reference) => ({
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
        This token is only a preview. It is not saved as a rule dependency.
      </p>
      {preview.error && (
        <InlineAlert variant="negative">
          <Heading>Cannot generate the preview</Heading>
          <Content>{preview.error}</Content>
        </InlineAlert>
      )}
      {preview.mappings.length > 0 && (
        <TableView aria-label="T-shirt mapping preview" density="compact">
          <TableHeader>
            <Column isRowHeader>Size</Column>
            <Column>Requested</Column>
            <Column>Actual token</Column>
            <Column>Output</Column>
          </TableHeader>
          <TableBody>
            {preview.mappings.map((mapping) => (
              <Row id={mapping.size} key={mapping.size}>
                <Cell>
                  {
                    COMPONENT_SIZES.find((size) => size.id === mapping.size)!
                      .label
                  }
                </Cell>
                <Cell>{mapping.requested}</Cell>
                <Cell>{mapping.target.name}</Cell>
                <Cell>{mapping.target.hidden ? "Literal" : "Alias"}</Cell>
              </Row>
            ))}
          </TableBody>
        </TableView>
      )}
      {preview.mappings
        .filter((mapping) => mapping.warning)
        .map((mapping) => (
          <InlineAlert key={mapping.size} variant="notice">
            <Heading>Nearest available token</Heading>
            <Content>{mapping.warning}</Content>
          </InlineAlert>
        ))}
    </div>
  );
}
