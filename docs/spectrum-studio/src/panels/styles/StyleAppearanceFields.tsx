// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Header,
  Heading,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  PickerItem,
  Tag,
  TagGroup,
  Text,
  ToggleButton,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Picker } from "../../components/fields/Picker";
import { CategoryIcon } from "../../components/CategoryIcon";
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
import type { ModeSet } from "../../features/modes/model";
import type {
  TaxonomyDocument,
  TaxonomyTerm,
} from "../../features/taxonomy/model";
import { modeSetGroupIconId } from "../../features/modes/controlPresentation";
import { MODE_ICONS } from "../../features/modes/icons";
import "../../components/fields/DividableComboBox.css";

const colorFamiliesFieldStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 4,
  padding: 8,
  minWidth: 0,
  width: "full",
  boxSizing: "border-box",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-300",
  borderRadius: "default",
});

export function StyleAppearanceFields({
  kind,
  value,
  references,
  taxonomy,
  families,
  display,
  isReadOnly,
  onChange,
  modeSets = [],
  modeSelection = {},
}: {
  kind: StyleKind;
  value: StyleAppearance;
  references: StyleReference[];
  taxonomy: TaxonomyDocument;
  families: { id: string; name: string }[];
  display: TokenDisplayMode;
  isReadOnly: boolean;
  onChange: (difference: Partial<StyleAppearance>) => void;
  modeSets?: ModeSet[];
  modeSelection?: Record<string, string>;
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
          placeholder="Choose a scale index"
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
  const indexCategory = taxonomy.categories.find(
    (category) => category.key === "scaleIndex",
  );
  const indices = taxonomy.terms
    .filter(
      (term): term is TaxonomyTerm & { value: number } =>
        term.categoryId === indexCategory?.id &&
        typeof term.value === "number" &&
        Number.isSafeInteger(term.value),
    )
    .sort((a, b) => a.value - b.value);
  const indexOptions = indices.map((term) => ({
    id: term.id,
    kind: "preset" as const,
    name: String(term.value),
    displayValue: String(term.value),
  }));
  const indexField = (index: number, label: string, modeId?: string) => (
    <TokenComboBox
      size="S"
      label={modeId ? undefined : label}
      ariaLabel={label}
      options={indexOptions}
      selectedKey={
        indices.find((term) => term.value === index)?.id ??
        `unregistered-scale-index:${index}`
      }
      isRequired
      isDisabled={
        isReadOnly ||
        (!modeId && color.kind === "families" && !!color.indexModes)
      }
      error={
        !indices.some((term) => term.value === index)
          ? `Scale index ${index} is not registered. Choose a registered scale index.`
          : undefined
      }
      onChange={(id) => {
        const term = indices.find((term) => term.id === id);
        if (!term) throw new Error("Choose a registered scale index.");
        if (color.kind !== "families")
          throw new Error("Scale indices require color families.");
        if (modeId && color.indexModes)
          onChange({
            color: {
              ...color,
              indexModes: {
                ...color.indexModes,
                values: { ...color.indexModes.values, [modeId]: term.value },
              },
            },
          });
        else onChange({ color: { ...color, scaleIndex: term.value } });
      }}
    />
  );
  return (
    <div className="stylesFields">
      <Picker
        size="S"
        label="Color selection"
        selectedKey={color.kind}
        isDisabled={isReadOnly}
        onSelectionChange={(key) => {
          if (key === "single" || key === "families")
            onChange({
              color: switchStyleColor(color, key, references, modeSelection),
            });
        }}
      >
        <PickerItem id="single">Single value</PickerItem>
        <PickerItem id="families">Color options</PickerItem>
      </Picker>
      {color.kind === "single" ? (
        field("color", "Color", color.binding)
      ) : (
        <>
          <SideLabelRow label="Color families" size="S" labelWidth="auto">
            {(labelId) => (
              <div
                className={colorFamiliesFieldStyles}
                role="group"
                aria-labelledby={labelId}
              >
                <TagGroup
                  size="S"
                  aria-label="Supported color families"
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
                {!isReadOnly &&
                  families.some(
                    (family) => !color.familyIds.includes(family.id),
                  ) && (
                    <MenuTrigger>
                      <ActionButton
                        isQuiet
                        size="S"
                        aria-label="Add color family"
                      >
                        <Add />
                      </ActionButton>
                      <Menu
                        aria-label="Available color families"
                        onAction={(id) => {
                          if (
                            typeof id === "string" &&
                            families.some((family) => family.id === id) &&
                            !color.familyIds.includes(id)
                          )
                            onChange({
                              color: {
                                ...color,
                                familyIds: [...color.familyIds, id],
                              },
                            });
                        }}
                      >
                        {families
                          .filter(
                            (family) => !color.familyIds.includes(family.id),
                          )
                          .map((family) => (
                            <MenuItem key={family.id} id={family.id}>
                              {family.name}
                            </MenuItem>
                          ))}
                      </Menu>
                    </MenuTrigger>
                  )}
              </div>
            )}
          </SideLabelRow>
          <div className="dividableComboBox">
            <div className="dividableComboBoxPrimary">
              {indexField(color.scaleIndex, "Scale index")}
              {color.indexModes ? (
                <ToggleButton
                  size="S"
                  aria-label="Use mode-specific scale indices"
                  isSelected
                  isDisabled={isReadOnly}
                  onChange={() => {
                    const base = { ...color };
                    delete base.indexModes;
                    onChange({ color: base });
                  }}
                >
                  <CategoryIcon category="modes" />
                </ToggleButton>
              ) : (
                <MenuTrigger>
                  <ToggleButton
                    size="S"
                    aria-label="Use mode-specific scale indices"
                    isSelected={false}
                    isDisabled={
                      isReadOnly || !modeSets.some((axis) => axis.modes.length)
                    }
                  >
                    <CategoryIcon category="modes" />
                  </ToggleButton>
                  <Menu
                    aria-label="Select mode set"
                    selectionMode="single"
                    onAction={(id) =>
                      onChange({
                        color: {
                          ...color,
                          indexModes: { modeSetId: String(id), values: {} },
                        },
                      })
                    }
                  >
                    <MenuSection>
                      <Header>
                        <Heading>Select mode set</Heading>
                        <Text>For authoring conditional values</Text>
                      </Header>
                      {modeSets
                        .filter((axis) => axis.modes.length)
                        .map((axis) => {
                          const iconId = modeSetGroupIconId(axis);
                          return (
                            <MenuItem
                              key={axis.id}
                              id={axis.id}
                              textValue={axis.name}
                            >
                              {iconId === "none" ? (
                                <CategoryIcon category="modes" />
                              ) : (
                                MODE_ICONS[iconId]
                              )}
                              <Text>{axis.name}</Text>
                            </MenuItem>
                          );
                        })}
                    </MenuSection>
                  </Menu>
                </MenuTrigger>
              )}
            </div>
            {color.indexModes && (
              <div
                className="dividableComboBox"
                role="group"
                aria-label="Mode-specific scale indices"
              >
                {modeSets
                  .find((axis) => axis.id === color.indexModes?.modeSetId)
                  ?.modes.map((mode) => (
                    <SideLabelRow
                      key={mode.id}
                      label={mode.name}
                      size="S"
                      labelWidth="auto"
                    >
                      {() =>
                        indexField(
                          color.indexModes?.values[mode.id] ?? color.scaleIndex,
                          mode.name,
                          mode.id,
                        )
                      }
                    </SideLabelRow>
                  ))}
              </div>
            )}
          </div>
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
