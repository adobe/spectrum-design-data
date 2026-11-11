// Copyright 2026 Adobe. All rights reserved.
import {
  Accordion,
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from "@react-spectrum/s2";
import { useState, type ReactNode } from "react";
import { CategoryIcon } from "../../components/CategoryIcon";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import { DesignValueDisplay } from "../design/DesignEditorPanel";
import { DividableComboBox } from "../../components/fields/DividableComboBox";
import {
  TokenComboBox,
  type TokenComboBoxOption,
  type TokenDisplayMode,
  type TokenComboBoxProps,
} from "../../components/fields/TokenComboBox";
import {
  normalizeNumericEntry,
  numericEntryValue,
} from "../../components/fields/tokenEntry";
import {
  IconPaddingAll,
  IconPaddingTop,
  IconPaddingRight,
  IconPaddingBottom,
  IconPaddingLeft,
} from "../../assets/svgs/PaddingIcons";
import {
  IconArrowDown,
  IconArrowRight,
} from "../../assets/svgs/DirectionIcons";
import type { StructureNumberLiteral } from "../../features/structures/model";
import { STRUCTURE_TERM_IDS as terms } from "../../features/structures/vocabulary";
import {
  appearanceSectionsFor,
  type AppearanceSectionId,
  type AppearanceSlot,
} from "./appearanceSections";

export type { AppearanceSlot } from "./appearanceSections";
export interface AppearanceField {
  label: string;
  options: TokenComboBoxOption[];
  selectedKey: string | null;
  error?: string;
  customValue?: { displayValue: string; unit?: "px" | "multiplier" };
  isRequired?: boolean;
  isOptionAllowed?: (option: TokenComboBoxOption) => boolean;
}
export interface StructureAppearanceControlsProps {
  fields: Partial<Record<AppearanceSlot, AppearanceField>>;
  isReadOnly: boolean;
  onChange: (
    changes: Partial<
      Record<AppearanceSlot, string | null | StructureNumberLiteral>
    >,
  ) => void;
  /** Element-level controls shown above "Show as", outside any section. */
  header?: ReactNode;
  /** Extra controls placed in the Layout section (for example Bar orientation). */
  layoutControls?: ReactNode;
  sizingLayout?: "paired" | "individual";
}
const CONTROL_SIZE = "S";

function numberLiteral(
  text: string,
  unit: "px" | "multiplier" = "px",
): StructureNumberLiteral {
  const value = numericEntryValue(text, unit === "px" ? "px" : "");
  if (value === undefined || value < 0)
    throw new Error(
      unit === "px"
        ? "Enter a finite, non-negative number of pixels."
        : "Enter a finite, non-negative multiplier.",
    );
  return { kind: "number", value, unit };
}

export function StructureAppearanceControls({
  fields,
  isReadOnly,
  onChange,
  header,
  layoutControls,
  sizingLayout = "paired",
}: StructureAppearanceControlsProps) {
  const [displayMode, setDisplayMode] = useState<TokenDisplayMode>("tokens");
  const customValue = (
    slot: AppearanceSlot,
  ): TokenComboBoxProps["customValue"] => {
    const config = fields[slot]?.customValue;
    return config
      ? {
          displayValue: config.displayValue,
          onAccept: (text) =>
            onChange({ [slot]: numberLiteral(text, config.unit) }),
        }
      : undefined;
  };
  const field = (slot: AppearanceSlot, label?: string, prefix?: ReactNode) => {
    const config = fields[slot];
    return config ? (
      <TokenComboBox
        placeholder="Undefined"
        size={CONTROL_SIZE}
        key={slot}
        label={label}
        ariaLabel={config.label}
        prefix={
          typeof prefix === "string" ? (
            <span aria-hidden="true">{prefix}</span>
          ) : (
            prefix
          )
        }
        options={config.options}
        selectedKey={config.selectedKey}
        displayMode={displayMode}
        isDisabled={isReadOnly}
        isRequired={config.isRequired}
        error={config.error}
        isOptionAllowed={config.isOptionAllowed}
        normalizeValue={(text) =>
          normalizeNumericEntry(
            text,
            config.customValue?.unit === "multiplier" ? "" : "px",
          )
        }
        customValue={customValue(slot)}
        onChange={(id) => onChange({ [slot]: id })}
      />
    ) : null;
  };
  const pair = (
    label: string,
    width: AppearanceSlot,
    height: AppearanceSlot,
  ) =>
    fields[width] || fields[height] ? (
      <div className="structureEditorPair">
        {field(width, label, "W")}
        {field(height, undefined, "H")}
      </div>
    ) : null;
  const iconGroup = (
    slot: "direction" | "horizontal" | "vertical",
    label: string,
    items: { id: string; label: string; icon: ReactNode }[],
  ) =>
    fields[slot] ? (
      <ToggleButtonGroup
        size={CONTROL_SIZE}
        density="compact"
        aria-label={label}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={
          fields[slot].selectedKey ? [fields[slot].selectedKey] : []
        }
        isDisabled={isReadOnly}
        onSelectionChange={(keys) => {
          const id = [...keys][0];
          if (typeof id === "string") onChange({ [slot]: id });
        }}
      >
        {items.map((item) => (
          <ToggleButton key={item.id} id={item.id} aria-label={item.label}>
            {item.icon}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    ) : null;
  const alignmentIcon = (icon: string) => <CategoryIcon category={icon} />;
  const divided = (
    label: string,
    slots: readonly [
      AppearanceSlot,
      AppearanceSlot,
      AppearanceSlot,
      AppearanceSlot,
    ],
    prefix: ReactNode,
    prefixes: ReactNode[],
  ) => {
    const first = fields[slots[0]];
    if (!first) return null;
    const config = (index: number) => ({
      label: fields[slots[index]]!.label,
      prefix: prefixes[index],
      selectedKey: fields[slots[index]]!.selectedKey,
      error: fields[slots[index]]!.error,
      customValue: customValue(slots[index]),
      isRequired: fields[slots[index]]!.isRequired,
      isOptionAllowed: fields[slots[index]]!.isOptionAllowed,
    });
    return (
      <DividableComboBox
        placeholder="Undefined"
        size={CONTROL_SIZE}
        label={label}
        prefix={prefix}
        options={first.options}
        displayMode={displayMode}
        isDisabled={isReadOnly}
        fields={[config(0), config(1), config(2), config(3)]}
        normalizeValue={(text) => normalizeNumericEntry(text, "px")}
        onSharedCustomValue={
          slots.every((slot) => fields[slot]?.customValue)
            ? (text) =>
                onChange(
                  Object.fromEntries(
                    slots.map((slot) => [
                      slot,
                      numberLiteral(text, fields[slot]?.customValue?.unit),
                    ]),
                  ),
                )
            : undefined
        }
        onSharedChange={(id) =>
          onChange(Object.fromEntries(slots.map((slot) => [slot, id])))
        }
        onIndividualChange={(index, id) => onChange({ [slots[index]]: id })}
      />
    );
  };
  const constraintSlots = [
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
  ] as const;
  const sectionContent: Record<AppearanceSectionId, ReactNode> = {
    layout: (
      <>
        {(fields.direction || fields.horizontal || fields.vertical) && (
          <div className="structureEditorAlignment">
            {iconGroup("direction", "Direction", [
              {
                id: terms.horizontal,
                label: "Horizontal",
                icon: <IconArrowRight />,
              },
              {
                id: terms.vertical,
                label: "Vertical",
                icon: <IconArrowDown />,
              },
            ])}
            {fields.direction && (fields.horizontal || fields.vertical) && (
              <Divider orientation="vertical" />
            )}
            {iconGroup("horizontal", "Horizontal alignment", [
              {
                id: terms.left,
                label: "Align left",
                icon: alignmentIcon("alignment.left"),
              },
              {
                id: terms.center,
                label: "Align center",
                icon: alignmentIcon("alignment.center"),
              },
              {
                id: terms.right,
                label: "Align right",
                icon: alignmentIcon("alignment.right"),
              },
            ])}
            {fields.horizontal && fields.vertical && (
              <Divider orientation="vertical" />
            )}
            {iconGroup("vertical", "Vertical alignment", [
              {
                id: terms.top,
                label: "Align top",
                icon: alignmentIcon("alignment.top"),
              },
              {
                id: terms.middle,
                label: "Align middle",
                icon: alignmentIcon("alignment.middle"),
              },
              {
                id: terms.bottom,
                label: "Align bottom",
                icon: alignmentIcon("alignment.bottom"),
              },
            ])}
          </div>
        )}
        {layoutControls}
        {sizingLayout === "paired" ? (
          pair("Default size", "width", "height")
        ) : (
          <>
            {field("width", fields.width?.label)}
            {field("height", fields.height?.label)}
          </>
        )}
        {constraintSlots.some((slot) => fields[slot]) && (
          <NestedPanelAccordion>
            <AccordionItem id="constraints">
              <AccordionItemTitle>Constraints</AccordionItemTitle>
              <AccordionItemPanel>
                <div className="structureEditorFields">
                  {pair("Minimum", "minWidth", "minHeight")}
                  {pair("Maximum", "maxWidth", "maxHeight")}
                </div>
              </AccordionItemPanel>
            </AccordionItem>
          </NestedPanelAccordion>
        )}
        {(["size", "thickness", "length"] as const).map((slot) =>
          field(slot, fields[slot]?.label),
        )}
        {field("gap", "Gap", <CategoryIcon category="property.gap" />)}
        {divided(
          "Padding",
          ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
          <IconPaddingAll />,
          [
            <IconPaddingTop key="top" />,
            <IconPaddingRight key="right" />,
            <IconPaddingBottom key="bottom" />,
            <IconPaddingLeft key="left" />,
          ],
        )}
        {divided(
          "Corner radius",
          [
            "radiusTopLeft",
            "radiusTopRight",
            "radiusBottomRight",
            "radiusBottomLeft",
          ],
          <CategoryIcon category="radius" />,
          ["top-left", "top-right", "bottom-right", "bottom-left"].map(
            (corner) => (
              <CategoryIcon
                key={corner}
                category={`property.radius-${corner}`}
              />
            ),
          ),
        )}
      </>
    ),
    typography: (
      <>
        {(["fontSize", "lineHeight"] as const).map((slot) =>
          field(slot, fields[slot]?.label),
        )}
      </>
    ),
    color: null,
    elevation: field(
      "elevation",
      "Elevation",
      <CategoryIcon category="elevation" />,
    ),
  };
  const sections = appearanceSectionsFor(
    (Object.keys(fields) as AppearanceSlot[]).filter((slot) => fields[slot]),
    layoutControls ? ["layout"] : [],
  );
  return (
    <div
      className="structureAppearance"
      data-component="StructureAppearanceControls"
    >
      {header && (
        <div className="structureAppearanceLoose structureEditorFields">
          {header}
        </div>
      )}
      <div className="structureAppearanceLoose">
        <DesignValueDisplay value={displayMode} onChange={setDisplayMode} />
      </div>
      {sections.length > 0 && (
        <Accordion
          size={CONTROL_SIZE}
          density="spacious"
          allowsMultipleExpanded
          defaultExpandedKeys={sections.map((section) => section.id)}
        >
          {sections.map((section) => (
            <AccordionItem key={section.id} id={section.id}>
              <AccordionItemTitle>{section.label}</AccordionItemTitle>
              <AccordionItemPanel>
                <div className="structureEditorFields">
                  {sectionContent[section.id]}
                </div>
              </AccordionItemPanel>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
