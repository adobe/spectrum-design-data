// Copyright 2026 Adobe. All rights reserved.
import {
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  Checkbox,
  Content,
  Heading,
  InlineAlert,
} from "@react-spectrum/s2";
import Delete from "@react-spectrum/s2/icons/Delete";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";
import { foundationCardStyles } from "../../components/foundationCardStyles";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import { NumericScaleRamp } from "../../components/ScaleEditor";
import {
  type DimensionScale,
  type GeneratedDimensionValue,
} from "../../features/scales/foundation";
import {
  dimensionIssues,
  type DimensionValuePolicy,
} from "../../features/scales/issues";

const cardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
  minWidth: 0,
});
const rowStyles = style({
  display: "flex",
  alignItems: "start",
  gap: 8,
  minWidth: 0,
});
const fieldsStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 0,
});
const previewStyles = style({ height: 32, width: "full", display: "block" });
const actionButtonOffsetStyles = style({ marginTop: 24 });

export interface DimensionScaleCardProps {
  noun: string;
  scale: DimensionScale;
  values: readonly GeneratedDimensionValue[];
  isReadOnly: boolean;
  canDelete: boolean;
  nameField: ReactNode;
  formulaField: ReactNode;
  variables: ReactNode;
  roundingField: ReactNode;
  preview?: ReactNode;
  valuePolicy?: DimensionValuePolicy;
  onDelete: () => void;
  onPublishingChange: (hidden: boolean) => void;
}

export function DimensionScaleCard({
  noun,
  scale,
  values,
  isReadOnly,
  canDelete,
  nameField,
  formulaField,
  variables,
  roundingField,
  preview,
  valuePolicy = "positive",
  onDelete,
  onPublishingChange,
}: DimensionScaleCardProps) {
  const { issues, variant } = dimensionIssues(values, valuePolicy);
  const variablesId = `${scale.id}-variables`;
  return (
    <section
      className={`${foundationCardStyles} ${cardStyles}`}
      aria-label={`${scale.name} ${noun} scale`}
      data-component="DimensionScaleCard"
      data-dimension-scale={scale.id}
    >
      <div className={rowStyles}>
        {nameField}
        {!isReadOnly && (
          <div className={actionButtonOffsetStyles}>
            {" "}
            <ActionButton
              isQuiet
              aria-label={`Delete ${noun} scale ${scale.name}`}
              isDisabled={!canDelete}
              onPress={onDelete}
            >
              <Delete />
            </ActionButton>{" "}
          </div>
        )}
      </div>
      {preview ?? (
        <span
          className={previewStyles}
          role="img"
          aria-label={`${scale.name} preview: ${values.map((value) => value.value).join(", ")}`}
        >
          <NumericScaleRamp values={values.map((value) => value.value)} />
        </span>
      )}
      {formulaField}
      {roundingField}
      <NestedPanelAccordion>
        <AccordionItem id={variablesId}>
          <AccordionItemTitle>Formula variables</AccordionItemTitle>
          <AccordionItemPanel>
            <div className={fieldsStyles}>{variables}</div>
          </AccordionItemPanel>
        </AccordionItem>
      </NestedPanelAccordion>
      <Checkbox
        isSelected={scale.hideFromPublishing ?? false}
        isDisabled={isReadOnly}
        onChange={onPublishingChange}
      >
        Hide from publishing
      </Checkbox>
      {issues.length > 0 && (
        <InlineAlert variant={variant}>
          <Heading>Check this scale</Heading>
          <Content>
            {issues.includes("invalid") &&
              "Some values could not be calculated. Check the scale. "}
            {issues.includes("non-positive") &&
              (valuePolicy === "non-negative"
                ? "Some radii are negative. "
                : "Some values are 0 or less. ")}
            {issues.includes("duplicate") &&
              "Some values are the same after rounding, so their tokens would be identical."}
          </Content>
        </InlineAlert>
      )}
    </section>
  );
}
