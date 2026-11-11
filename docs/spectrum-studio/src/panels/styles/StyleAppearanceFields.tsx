// Copyright 2026 Adobe. All rights reserved.
import { PickerItem, Tag, TagGroup } from "@react-spectrum/s2";
import { Picker } from "../../components/fields/Picker";
import { NumberField } from "../../components/fields/NumberField";
import { SideLabelRow } from "../../components/fields/SideLabelRow";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import type { TokenDisplayMode } from "../../components/fields/TokenComboBox";
import type {
  StyleAppearance,
  StyleBinding,
  StyleKind,
  StyleProperty,
} from "../../features/styles/model";
import type { StyleReference } from "../../features/styles/generation";
import { switchStyleColor } from "../../features/styles/variants";

export function StyleAppearanceFields({
  kind,
  value,
  references,
  families,
  display,
  isReadOnly,
  onChange,
}: {
  kind: StyleKind;
  value: StyleAppearance;
  references: StyleReference[];
  families: { id: string; name: string }[];
  display: TokenDisplayMode;
  isReadOnly: boolean;
  onChange: (difference: Partial<StyleAppearance>) => void;
}) {
  const field = (
    property: Exclude<StyleProperty, "lineHeight">,
    label: string,
    binding?: StyleBinding,
  ) => (
    <SideLabelRow label={label} size="S" labelWidth="auto">
      {() => (
        <TokenComboBox
          size="S"
          ariaLabel={label}
          displayMode={display}
          isDisabled={isReadOnly}
          options={references
            .filter((reference) => reference.property === property)
            .map((reference) => ({
              id: reference.id,
              kind: "token" as const,
              name: reference.name,
              displayValue: `${reference.value}${reference.unit ?? ""}`,
            }))}
          selectedKey={binding?.$ref ?? null}
          onChange={(id) => {
            if (id)
              onChange(
                property === "color"
                  ? { color: { kind: "single", binding: { $ref: id } } }
                  : { [property]: { $ref: id } },
              );
            else if (property !== "color") onChange({ [property]: undefined });
          }}
          customValue={{
            displayValue:
              binding?.value === undefined ? "" : String(binding.value),
            onAccept: (text) =>
              onChange(
                property === "color"
                  ? { color: { kind: "single", binding: { value: text } } }
                  : {
                      [property]: {
                        value:
                          (property === "fontWeight" ||
                            property === "borderWidth") &&
                          /^\d+(?:\.\d+)?$/.test(text)
                            ? Number(text)
                            : text,
                      },
                    },
              ),
          }}
        />
      )}
    </SideLabelRow>
  );
  const color = value.color;
  return (
    <div className="stylesFields">
      <Picker
        size="S"
        label="Color selection"
        selectedKey={color.kind}
        isDisabled={isReadOnly}
        onSelectionChange={(key) => {
          if (key === "single" || key === "families")
            onChange({ color: switchStyleColor(color, key, references) });
        }}
      >
        <PickerItem id="single">Single value</PickerItem>
        <PickerItem id="families">Color options</PickerItem>
      </Picker>
      {color.kind === "single" ? (
        field("color", "Color", color.binding)
      ) : (
        <>
          <Picker
            size="S"
            label="Color families"
            selectedKey={null}
            isDisabled={isReadOnly}
            onSelectionChange={(id) => {
              if (typeof id === "string" && !color.familyIds.includes(id))
                onChange({
                  color: { ...color, familyIds: [...color.familyIds, id] },
                });
            }}
          >
            {families
              .filter((family) => !color.familyIds.includes(family.id))
              .map((family) => (
                <PickerItem key={family.id} id={family.id}>
                  {family.name}
                </PickerItem>
              ))}
          </Picker>
          <TagGroup
            aria-label="Selected color families"
            onRemove={
              isReadOnly
                ? undefined
                : (keys) =>
                    onChange({
                      color: {
                        ...color,
                        familyIds: color.familyIds.filter(
                          (id) => !keys.has(id),
                        ),
                      },
                    })
            }
          >
            {color.familyIds.map((id) => (
              <Tag key={id} id={id}>
                {families.find((family) => family.id === id)?.name ??
                  "Unavailable family"}
              </Tag>
            ))}
          </TagGroup>
          <NumberField
            size="S"
            label="Scale index"
            value={color.scaleIndex}
            step={1}
            isReadOnly={isReadOnly}
            onChange={(scaleIndex) => {
              if (Number.isSafeInteger(scaleIndex))
                onChange({ color: { ...color, scaleIndex } });
            }}
          />
        </>
      )}
      {kind === "text" && (
        <>
          {field("fontFamily", "Font family", value.fontFamily)}
          {field("fontWeight", "Font weight", value.fontWeight)}
          <Picker
            size="S"
            label="Line-height scale"
            selectedKey={value.lineHeight?.metricId ?? null}
            isDisabled={isReadOnly}
            onSelectionChange={(key) => {
              if (typeof key === "string")
                onChange({ lineHeight: { metricId: key } });
            }}
          >
            {[
              ...new Map(
                references
                  .filter(
                    (reference) =>
                      reference.property === "lineHeight" && reference.metricId,
                  )
                  .map((reference) => [reference.metricId!, reference]),
              ).values(),
            ].map((reference) => (
              <PickerItem key={reference.metricId} id={reference.metricId!}>
                {reference.name.replace(/-\d+$/, "")}
              </PickerItem>
            ))}
          </Picker>
        </>
      )}
      {kind === "border" &&
        field("borderWidth", "Border width", value.borderWidth)}
    </div>
  );
}
