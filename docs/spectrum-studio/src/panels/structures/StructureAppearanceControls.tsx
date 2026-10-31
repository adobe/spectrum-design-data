// Copyright 2026 Adobe. All rights reserved.
import {
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  Divider,
  SegmentedControl,
  SegmentedControlItem,
  Text,
  ToggleButton,
  ToggleButtonGroup,
} from "@react-spectrum/s2";
import { useState, type ReactNode } from "react";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { CategoryIcon } from "../../components/CategoryIcon";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import { DividableComboBox } from "../../components/fields/DividableComboBox";
import {
  TokenComboBox,
  type TokenComboBoxOption,
  type TokenDisplayMode,
} from "../../components/fields/TokenComboBox";
import {
  IconPaddingAll,
  IconPaddingTop,
  IconPaddingRight,
  IconPaddingBottom,
  IconPaddingLeft,
} from "../../assets/svgs/PaddingIcons";
import type { StructureSlot } from "../../features/structures/model";
import type { ElementSlot } from "../../features/structures/elements";
import { STRUCTURE_TERM_IDS as terms } from "../../features/structures/vocabulary";

export type AppearanceSlot = StructureSlot | ElementSlot;
export interface AppearanceField {
  label: string;
  options: TokenComboBoxOption[];
  selectedKey: string | null;
  error?: string;
  isRequired?: boolean;
  isOptionAllowed?: (option: TokenComboBoxOption) => boolean;
}
export interface StructureAppearanceControlsProps {
  fields: Partial<Record<AppearanceSlot, AppearanceField>>;
  isReadOnly: boolean;
  onChange: (changes: Partial<Record<AppearanceSlot, string | null>>) => void;
  children?: ReactNode;
  sizingLayout?: "paired" | "individual";
}
const fullWidth = style({ width: "full" });

export function StructureAppearanceControls({
  fields,
  isReadOnly,
  onChange,
  children,
  sizingLayout = "paired",
}: StructureAppearanceControlsProps) {
  const [displayMode, setDisplayMode] = useState<TokenDisplayMode>("tokens");
  const field = (slot: AppearanceSlot, label?: string, prefix?: ReactNode) => {
    const config = fields[slot];
    return config ? (
      <TokenComboBox
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
  const alignment = (
    slot: "horizontal" | "vertical",
    items: { id: string; label: string; icon: string }[],
  ) =>
    fields[slot] ? (
      <ToggleButtonGroup
        aria-label={`${slot === "horizontal" ? "Horizontal" : "Vertical"} alignment`}
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
            <CategoryIcon category={item.icon} />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    ) : null;
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
    });
    return (
      <DividableComboBox
        label={label}
        prefix={prefix}
        options={first.options}
        displayMode={displayMode}
        isDisabled={isReadOnly}
        fields={[config(0), config(1), config(2), config(3)]}
        onSharedChange={(id) =>
          onChange(Object.fromEntries(slots.map((slot) => [slot, id])))
        }
        onIndividualChange={(index, id) => onChange({ [slots[index]]: id })}
      />
    );
  };
  return (
    <div
      className="structureEditorFields"
      data-component="StructureAppearanceControls"
    >
      <div>
        <Text>Show as</Text>
        <SegmentedControl
          aria-label="Show as"
          isJustified
          styles={fullWidth}
          selectedKey={displayMode}
          onSelectionChange={(key) => {
            if (key === "tokens" || key === "values") setDisplayMode(key);
          }}
        >
          <SegmentedControlItem id="tokens">Tokens</SegmentedControlItem>
          <SegmentedControlItem id="values">Values</SegmentedControlItem>
        </SegmentedControl>
      </div>
      {children}
      {fields.direction && (
        <div>
          <Text>Direction</Text>
          <SegmentedControl
            aria-label="Direction"
            isJustified
            isDisabled={isReadOnly}
            selectedKey={fields.direction.selectedKey ?? terms.horizontal}
            styles={fullWidth}
            onSelectionChange={(key) => {
              if (key === terms.horizontal || key === terms.vertical)
                onChange({ direction: key });
            }}
          >
            <SegmentedControlItem id={terms.horizontal}>
              Horizontal
            </SegmentedControlItem>
            <SegmentedControlItem id={terms.vertical}>
              Vertical
            </SegmentedControlItem>
          </SegmentedControl>
        </div>
      )}
      {(fields.horizontal || fields.vertical) && (
        <div className="structureEditorAlignment">
          {alignment("horizontal", [
            { id: terms.left, label: "Align left", icon: "alignment.left" },
            {
              id: terms.center,
              label: "Align center",
              icon: "alignment.center",
            },
            { id: terms.right, label: "Align right", icon: "alignment.right" },
          ])}
          {fields.horizontal && fields.vertical && (
            <Divider orientation="vertical" />
          )}
          {alignment("vertical", [
            { id: terms.top, label: "Align top", icon: "alignment.top" },
            {
              id: terms.middle,
              label: "Align middle",
              icon: "alignment.middle",
            },
            {
              id: terms.bottom,
              label: "Align bottom",
              icon: "alignment.bottom",
            },
          ])}
        </div>
      )}
      {sizingLayout === "paired" ? (
        pair("Default size", "width", "height")
      ) : (
        <>
          {field("width", fields.width?.label)}
          {field("height", fields.height?.label)}
        </>
      )}
      {(["minWidth", "minHeight", "maxWidth", "maxHeight"] as const).some(
        (slot) => fields[slot],
      ) && (
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
      {(["fontSize", "lineHeight", "size", "thickness", "length"] as const).map(
        (slot) => field(slot, fields[slot]?.label),
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
            <CategoryIcon key={corner} category={`property.radius-${corner}`} />
          ),
        ),
      )}
      {field("elevation", "Elevation", <CategoryIcon category="elevation" />)}
    </div>
  );
}
