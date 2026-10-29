// Copyright 2026 Adobe. All rights reserved.
import { AccordionItem, AccordionItemPanel, AccordionItemTitle, Button, ComboBox, ComboBoxItem, ComboBoxSection, Divider, SegmentedControl, SegmentedControlItem, Text, ToggleButton, ToggleButtonGroup, ToastQueue } from "@react-spectrum/s2";
import { CategoryIcon } from "../../components/CategoryIcon";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useState, type ReactNode } from "react";
import { IconPaddingAll, IconPaddingTop, IconPaddingRight, IconPaddingBottom, IconPaddingLeft } from "../../assets/svgs/PaddingIcons";
import { Panel } from "../../components/Panel";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import { DividableComboBox } from "../../components/fields/DividableComboBox";
import { TokenComboBox, type TokenComboBoxOption, type TokenDisplayMode } from "../../components/fields/TokenComboBox";
import { structureSelection, structureSlotDefinition, type Structure, type StructureSelection, type StructureSlot } from "../../features/structures/model";
import { constraintChoiceAllowed, isConstraintSlot, resolveStructure, type PreviewLayoutContext } from "../../features/structures/resolution";
import { STRUCTURE_TERM_IDS as terms } from "../../features/structures/vocabulary";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";
import "./StructureEditorPanel.css";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import { ELEMENT_CATEGORY_ID } from "../../features/structures/elements";
import { VARIANT_CATEGORY_IDS } from "../../features/taxonomy/variantVocabulary";

export interface StructureEditorPanelProps {
  structure: Structure;
  references: readonly PrimitiveReference[];
  layout: PreviewLayoutContext;
  isReadOnly: boolean;
  onChange: (changes: Partial<Record<StructureSlot, StructureSelection | null>>) => void;
  taxonomy?: TaxonomyDocument;
  onTokenNaming?: (input: { termId?: string | null; createName?: string }) => void;
}
const sizingOptions: TokenComboBoxOption[] = [
  { id: "hug", kind: "preset", name: "Hug", displayValue: "Hug" },
  { id: "fill", kind: "preset", name: "Fill", displayValue: "Fill" },
];
const showAsStyles = style({ width: "full" });
const selectedKey = (structure: Structure, slot: StructureSlot) => {
  const selection = structureSelection(structure, slot);
  return !selection ? null : "$ref" in selection ? selection.$ref : selection.value.kind === "sizing" ? selection.value.preset : selection.value.termId;
};
const selectionFor = (id: string | null): StructureSelection | null =>
  id === null ? null : id === "hug" || id === "fill" ? { value: { kind: "sizing", preset: id } } : { $ref: id };

export function StructureEditorPanel({ structure, references, layout, isReadOnly, onChange, taxonomy, onTokenNaming }: StructureEditorPanelProps) {
  const [displayMode, setDisplayMode] = useState<TokenDisplayMode>("tokens");
  const [commitError, setCommitError] = useState<string | undefined>();
  const resolved = resolveStructure(structure, references, layout);
  const namingTerm = taxonomy?.terms.find((term) => term.id === structure.generation?.nameRef?.termId);
  const [namingInput, setNamingInput] = useState(String(namingTerm?.value ?? ""));
  useEffect(() => setNamingInput(String(namingTerm?.value ?? "")), [namingTerm?.value]);
  const nameTokens = (input: { termId?: string | null; createName?: string }) => {
    try { onTokenNaming?.(input); setCommitError(undefined); }
    catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure);
      setCommitError(message); ToastQueue.negative(message);
    }
  };
  const commit = (changes: Partial<Record<StructureSlot, StructureSelection | null>>) => {
    try { onChange(changes); setCommitError(undefined); }
    catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure);
      setCommitError(message); ToastQueue.negative(message);
    }
  };
  const optionsFor = (slot: StructureSlot) => [
    ...(structureSlotDefinition(slot).presets ? sizingOptions : []),
    ...references.filter((reference) => reference.family === structureSlotDefinition(slot).family).map((reference): TokenComboBoxOption => ({
      id: reference.id, kind: "token", name: reference.name, displayValue: reference.displayValue, hidden: reference.hidden, error: reference.error,
    })),
  ];
  const field = (slot: StructureSlot, label: string | undefined, prefix: ReactNode, required = false) =>
    <TokenComboBox label={label} ariaLabel={slot === "width" ? "Default size width" : structureSlotDefinition(slot).label}
      prefix={prefix} options={optionsFor(slot)} selectedKey={selectedKey(structure, slot)} displayMode={displayMode}
      isDisabled={isReadOnly} isRequired={required} error={resolved.issues[slot]} onChange={(id) => commit({ [slot]: selectionFor(id) })}
      isOptionAllowed={isConstraintSlot(slot) ? (option) => constraintChoiceAllowed(structure, slot, selectionFor(option.id)!, references, layout) : undefined} />;
  const pair = (label: string, width: StructureSlot, height: StructureSlot, required = false) => <div className="structureEditorPair">
    {field(width, label, "W", required)}
    <TokenComboBox ariaLabel={`${label} height`} prefix="H" options={optionsFor(height)} selectedKey={selectedKey(structure, height)}
      displayMode={displayMode} isDisabled={isReadOnly} isRequired={required} error={resolved.issues[height]}
      onChange={(id) => commit({ [height]: selectionFor(id) })}
      isOptionAllowed={isConstraintSlot(height) ? (option) => constraintChoiceAllowed(structure, height, selectionFor(option.id)!, references, layout) : undefined} />
  </div>;
  const paddingSlots = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const;
  const radiusSlots = ["radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft"] as const;
  const alignment = (slot: "horizontal" | "vertical", items: { id: string; label: string; icon: ReactNode }[]) =>
    <ToggleButtonGroup aria-label={`${slot === "horizontal" ? "Horizontal" : "Vertical"} alignment`} selectionMode="single" disallowEmptySelection
      selectedKeys={[selectedKey(structure, slot)!]} isDisabled={isReadOnly}
      onSelectionChange={(keys) => {
        const id = [...keys][0];
        if (typeof id === "string") commit({ [slot]: { value: { kind: "term", termId: id } } });
      }}>
      {items.map((item) => <ToggleButton key={item.id} id={item.id} aria-label={item.label}>{item.icon}</ToggleButton>)}
    </ToggleButtonGroup>;
  return <Panel label={`Structure settings for ${structure.name}`} className="structureEditorPanel">
    <div className="structureEditorFields">
      {taxonomy && onTokenNaming && <div>
        <ComboBox label="Token naming" selectedKey={namingTerm?.id ?? null} inputValue={namingInput} onInputChange={setNamingInput}
          allowsCustomValue isReadOnly={isReadOnly} description="The Structure name is a label. This Registry term names its generated tokens."
          styles={showAsStyles} onSelectionChange={(key) => { if (typeof key === "string") nameTokens({ termId: key }); }}>
          {[{ id: VARIANT_CATEGORY_IDS.structure, label: "Structure terms" }, { id: ELEMENT_CATEGORY_ID, label: "Element terms" }].map((category) =>
            <ComboBoxSection key={category.id} aria-label={category.label}>{taxonomy.terms.filter((term) => term.categoryId === category.id).map((term) =>
              <ComboBoxItem key={term.id} id={term.id} textValue={String(term.value)}>{String(term.value)}</ComboBoxItem>)}</ComboBoxSection>)}
        </ComboBox>
        {!isReadOnly && <Button variant="secondary" size="S" isDisabled={!namingInput.trim() || namingInput.trim() === namingTerm?.value}
          onPress={() => nameTokens({ createName: namingInput })}>Create Structure term</Button>}
      </div>}
      <div><Text>Show as</Text><SegmentedControl aria-label="Show as" isJustified selectedKey={displayMode} styles={showAsStyles}
        onSelectionChange={(key) => {
          if (key === "tokens" || key === "values") setDisplayMode(key);
        }}>
        <SegmentedControlItem id="tokens">Tokens</SegmentedControlItem><SegmentedControlItem id="values">Values</SegmentedControlItem>
      </SegmentedControl></div>
      <div><Text>Direction</Text><SegmentedControl aria-label="Direction" isJustified isDisabled={isReadOnly}
        selectedKey={selectedKey(structure, "direction") ?? terms.horizontal} styles={showAsStyles}
        onSelectionChange={(key) => {
          if (key === terms.horizontal || key === terms.vertical) commit({ direction: { value: { kind: "term", termId: key } } });
        }}>
        <SegmentedControlItem id={terms.horizontal}>Horizontal</SegmentedControlItem>
        <SegmentedControlItem id={terms.vertical}>Vertical</SegmentedControlItem>
      </SegmentedControl></div>
      <div className="structureEditorAlignment">
        {alignment("horizontal", [{ id: terms.left, label: "Align left", icon: <CategoryIcon category="alignment.left" /> }, { id: terms.center, label: "Align center", icon: <CategoryIcon category="alignment.center" /> }, { id: terms.right, label: "Align right", icon: <CategoryIcon category="alignment.right" /> }])}
        <Divider orientation="vertical" />
        {alignment("vertical", [{ id: terms.top, label: "Align top", icon: <CategoryIcon category="alignment.top" /> }, { id: terms.middle, label: "Align middle", icon: <CategoryIcon category="alignment.middle" /> }, { id: terms.bottom, label: "Align bottom", icon: <CategoryIcon category="alignment.bottom" /> }])}
      </div>
      {pair("Default size", "width", "height", true)}
      <NestedPanelAccordion>
        <AccordionItem id="constraints"><AccordionItemTitle>Constraints</AccordionItemTitle>
          <AccordionItemPanel><div className="structureEditorFields">{pair("Minimum", "minWidth", "minHeight")}{pair("Maximum", "maxWidth", "maxHeight")}</div></AccordionItemPanel>
        </AccordionItem>
      </NestedPanelAccordion>
      {field("gap", "Gap", <CategoryIcon category="property.gap" />)}
      <DividableComboBox label="Padding" prefix={<IconPaddingAll />} options={optionsFor("paddingTop")} displayMode={displayMode} isDisabled={isReadOnly}
        fields={[
          { label: "Top padding", prefix: <IconPaddingTop />, selectedKey: selectedKey(structure, "paddingTop"), error: resolved.issues.paddingTop },
          { label: "Right padding", prefix: <IconPaddingRight />, selectedKey: selectedKey(structure, "paddingRight"), error: resolved.issues.paddingRight },
          { label: "Bottom padding", prefix: <IconPaddingBottom />, selectedKey: selectedKey(structure, "paddingBottom"), error: resolved.issues.paddingBottom },
          { label: "Left padding", prefix: <IconPaddingLeft />, selectedKey: selectedKey(structure, "paddingLeft"), error: resolved.issues.paddingLeft },
        ]}
        onSharedChange={(id) => commit(Object.fromEntries(paddingSlots.map((slot) => [slot, selectionFor(id)])))}
        onIndividualChange={(index, id) => commit({ [paddingSlots[index]]: selectionFor(id) })} />
      <DividableComboBox label="Corner radius" prefix={<CategoryIcon category="radius" />} options={optionsFor("radiusTopLeft")} displayMode={displayMode} isDisabled={isReadOnly}
        fields={[
          { label: "Top left corner radius", prefix: <CategoryIcon category="property.radius-top-left" />, selectedKey: selectedKey(structure, "radiusTopLeft"), error: resolved.issues.radiusTopLeft },
          { label: "Top right corner radius", prefix: <CategoryIcon category="property.radius-top-right" />, selectedKey: selectedKey(structure, "radiusTopRight"), error: resolved.issues.radiusTopRight },
          { label: "Bottom right corner radius", prefix: <CategoryIcon category="property.radius-bottom-right" />, selectedKey: selectedKey(structure, "radiusBottomRight"), error: resolved.issues.radiusBottomRight },
          { label: "Bottom left corner radius", prefix: <CategoryIcon category="property.radius-bottom-left" />, selectedKey: selectedKey(structure, "radiusBottomLeft"), error: resolved.issues.radiusBottomLeft },
        ]}
        onSharedChange={(id) => commit(Object.fromEntries(radiusSlots.map((slot) => [slot, selectionFor(id)])))}
        onIndividualChange={(index, id) => commit({ [radiusSlots[index]]: selectionFor(id) })} />
      {field("elevation", "Elevation", <CategoryIcon category="elevation" />)}
      {commitError && <div role="alert"><Text>{commitError}</Text></div>}
    </div>
  </Panel>;
}
