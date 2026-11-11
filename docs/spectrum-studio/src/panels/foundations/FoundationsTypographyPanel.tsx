// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";
import {
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  Button,
  ButtonGroup,
  Checkbox,
  Content,
  ContextualHelp,
  Dialog,
  DialogContainer,
  Heading,
  LabeledValue,
  PickerItem,
  Text,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "@react-spectrum/s2";
import { Picker } from "../../components/fields/Picker";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import { foundationCardStyles } from "../../components/foundationCardStyles";
import { useRequestedFieldFocus } from "../../components/fields/useRequestedFieldFocus";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useState } from "react";
import {
  addLineHeightAtom,
  addFontAtom,
  updateFontAtom,
  removeFontAtom,
  restoreFontAtom,
  generatedTypographyAtom,
  lineHeightConsumers,
  removeLineHeightAtom,
  renameLineHeightAtom,
  resolvedTypographyDocumentAtom,
  restoreLineHeightAtom,
  typographyDocumentAtom,
  updateTextZoomAtom,
  updateTypographyAtom,
} from "../../features/typography/state";
import {
  interpolationsAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import { replaceScaleTypeWithConsumersAtom } from "../../features/logic/scaleTypeReferences";
import {
  TYPOGRAPHY_SCALE_TYPE_ID,
  type ScaleType,
} from "../../features/scales/scaleType";
import type {
  TypographyDocument,
  TypographyFont,
} from "../../features/typography/model";
import { TEXT_ZOOM_MAX, TEXT_ZOOM_MIN } from "../../features/typography/model";
import {
  EditableNumberField,
  EditableTextField,
  EditablePicker,
  useIsReadOnly,
} from "../../components/editable";
import { RoundingRulePicker } from "../../components/logic/RoundingRulePicker";
import { authoringCapabilityOwnersAtom } from "../../features/modes/capabilities";
import { FOUNDATION_PARAMETERS } from "../../features/modes/parameters";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { lineHeightName } from "../../features/typography/lineHeightNames";
import { termLabel } from "../../features/taxonomy/termPresentation";
import {
  formatTypographyLength,
  fromTypographyUnit,
  isTypographyUnit,
  toTypographyUnit,
  TYPOGRAPHY_UNITS,
} from "../../features/typography/units";
import { FoundationModeSettings } from "./FoundationModeSettings";
import { FoundationParameterSettings } from "./FoundationParameterSettings";
import { TypeScaleFields } from "../typography/TypeScaleFields";
import { LineHeightCard } from "../typography/LineHeightCard";
import { typographyPanelTabAtom } from "../../state/view/typographyView";

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
  padding: 8,
});
const panel = style({ padding: 0 });
const controls = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "auto",
  padding: 16,
});
const tabPanelStyles = style({ marginTop: 16 });
const tabActions = style({ display: "flex", gap: 8 });
const tabStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
});
const fontCardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
  minWidth: 0,
});
const fontNameRow = style({ display: "flex", alignItems: "end", gap: 8 });
const fontField = style({ width: "full", minWidth: 0 });

function FontCard({
  font,
  isReadOnly,
  focusName,
  onNameFocused,
  onRename,
  onFamilyChange,
  onDelete,
}: {
  font: TypographyFont;
  isReadOnly: boolean;
  focusName: boolean;
  onNameFocused: () => void;
  onRename: (name: string) => string | undefined;
  onFamilyChange: (fontFamily: string) => void;
  onDelete: () => void;
}) {
  const nameRef = useRequestedFieldFocus(
    focusName && !isReadOnly,
    onNameFocused,
  );
  const [draft, setDraft] = useState({
    source: font.name,
    readOnly: isReadOnly,
    value: font.name,
    error: undefined as string | undefined,
  });
  if (draft.source !== font.name || draft.readOnly !== isReadOnly)
    setDraft({
      source: font.name,
      readOnly: isReadOnly,
      value: font.name,
      error: undefined,
    });
  return (
    <section
      className={`${foundationCardStyles} ${fontCardStyles}`}
      aria-label={`${font.name} font`}
    >
      <div className={fontNameRow}>
        <EditableTextField
          label="Name"
          value={draft.value}
          onChange={(value) => setDraft({ ...draft, value, error: undefined })}
          onBlur={() => {
            if (draft.value !== font.name)
              setDraft({
                ...draft,
                value:
                  draft.value.trim() === font.name ? font.name : draft.value,
                error: onRename(draft.value),
              });
          }}
          ref={nameRef}
          isReadOnly={isReadOnly}
          isRequired
          isInvalid={!!draft.error}
          errorMessage={draft.error}
          validationBehavior="aria"
          styles={fontField}
        />
        {!isReadOnly && (
          <ActionButton
            isQuiet
            aria-label={`Delete ${font.name} font`}
            onPress={onDelete}
          >
            <Delete />
          </ActionButton>
        )}
      </div>
      <EditableTextField
        label="Font family"
        value={font.fontFamily}
        isReadOnly={isReadOnly}
        onChange={onFamilyChange}
        styles={fontField}
      />
    </section>
  );
}

const note = style({ font: "body-sm", color: "neutral-subdued", margin: 0 });
const textAdjustmentParameter = FOUNDATION_PARAMETERS.find(
  (parameter) => parameter.id === "typography.textZoom",
)!;

export function FoundationsTypographyPanel() {
  const notify = useNotify();
  const isReadOnly = useIsReadOnly();
  const document = useAtomValue(typographyDocumentAtom);
  const resolved = useAtomValue(resolvedTypographyDocumentAtom);
  const tokens = useAtomValue(generatedTypographyAtom);
  const modeOwners = useAtomValue(authoringCapabilityOwnersAtom);
  const registry = useAtomValue(taxonomyDocumentAtom);
  const library = useAtomValue(scaleTypesAtom);
  const interpolations = useAtomValue(interpolationsAtom);
  const formula = library.find((item) => item.id === TYPOGRAPHY_SCALE_TYPE_ID);
  const update = useSetAtom(updateTypographyAtom);
  const replaceFormula = useSetAtom(replaceScaleTypeWithConsumersAtom);
  const updateTextZoom = useSetAtom(updateTextZoomAtom);
  const store = useStore();
  const rename = useSetAtom(renameLineHeightAtom);
  const updateFont = useSetAtom(updateFontAtom);
  const [focusFontId, setFocusFontId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useAtom(typographyPanelTabAtom);
  const report = (failure: unknown) =>
    notify.error(failure instanceof Error ? failure.message : String(failure));
  const attempt = (action: () => void) => {
    try {
      action();
    } catch (failure) {
      report(failure);
    }
  };
  const patch = (values: Partial<TypographyDocument>) =>
    attempt(() => update(values));
  const name = (id: string) =>
    termLabel(lineHeightName(document, registry, id));
  const unit = document.outputUnit;
  if (!formula) throw new Error("The shared Type scale is unavailable.");

  function deleteCard(id: string, replacement?: string) {
    attempt(() => {
      const label = name(id);
      notify.remove({
        kind: "lineHeight",
        noun: `Line height ${label}`,
        run: (store) =>
          store.set(removeLineHeightAtom, { id, replacementId: replacement }),
        undo: (removed) => store.set(restoreLineHeightAtom, removed),
      });
      setRemovingId(null);
    });
  }
  const lineHeightChoices = document.lineHeights.map((card) => (
    <PickerItem id={card.id} key={card.id}>
      {name(card.id)}
    </PickerItem>
  ));
  const systemSettings = (
    <AccordionItem id="system-settings">
      <AccordionItemTitle>System settings</AccordionItemTitle>
      <AccordionItemPanel UNSAFE_className={String(panel)}>
        <div className={stack}>
          <FoundationParameterSettings foundation="typography" />
          <Checkbox
            isSelected={document.hideFromPublishing ?? false}
            isDisabled={isReadOnly}
            onChange={(hideFromPublishing) => patch({ hideFromPublishing })}
          >
            Hide from publishing
          </Checkbox>
          <EditablePicker
            labelPosition="side"
            label="Output format"
            selectedKey={unit}
            displayValue={unit}
            onSelectionChange={(key) => {
              if (isTypographyUnit(key)) patch({ outputUnit: key });
            }}
          >
            {TYPOGRAPHY_UNITS.map((value) => (
              <PickerItem id={value} key={value}>
                {value}
              </PickerItem>
            ))}
          </EditablePicker>
          <EditableNumberField
            labelPosition="side"
            key={`min-${unit}`}
            label={`Min text size (${unit})`}
            value={toTypographyUnit(document.minTextSize, unit)}
            minValue={0}
            maxValue={toTypographyUnit(document.maxTextSize, unit)}
            step={toTypographyUnit(1, unit)}
            formatOptions={{ maximumFractionDigits: 6 }}
            onChange={(value) =>
              attempt(() =>
                update({ minTextSize: fromTypographyUnit(value, unit) }),
              )
            }
          />
          <EditableNumberField
            labelPosition="side"
            key={`max-${unit}`}
            label={`Max text size (${unit})`}
            value={toTypographyUnit(document.maxTextSize, unit)}
            minValue={0}
            step={toTypographyUnit(1, unit)}
            formatOptions={{ maximumFractionDigits: 6 }}
            onChange={(value) =>
              attempt(() =>
                update({ maxTextSize: fromTypographyUnit(value, unit) }),
              )
            }
          />
          <RoundingRulePicker
            labelPosition="side"
            label="Text size rounding"
            valueTypes={["font-size", "workflow-icon-size"]}
            ruleId={document.textRoundingRuleId}
            onChange={(textRoundingRuleId) => patch({ textRoundingRuleId })}
          />
          <RoundingRulePicker
            labelPosition="side"
            label="Line height rounding"
            valueType="line-height"
            ruleId={document.lineHeightRoundingRuleId}
            onChange={(lineHeightRoundingRuleId) =>
              patch({ lineHeightRoundingRuleId })
            }
          />
          <p className={note}>
            Rounding uses pixel lengths. rem and em use a 16 px reference; em is
            relative to its context when used in CSS.
          </p>
        </div>
      </AccordionItemPanel>
    </AccordionItem>
  );
  const sections = (
    <div className={controls}>
      <Tabs
        density="compact"
        aria-label="Typography controls"
        selectedKey={selectedTab}
        onSelectionChange={(key) => {
          if (
            key === "fonts" ||
            key === "font-sizes" ||
            key === "line-heights" ||
            key === "iconography"
          )
            setSelectedTab(key);
        }}
      >
        <TabList>
          <Tab id="fonts">Fonts</Tab>
          <Tab id="font-sizes">Font sizes</Tab>
          <Tab id="line-heights">Line heights</Tab>
          <Tab id="iconography">Iconography</Tab>
        </TabList>
        <TabPanel styles={tabPanelStyles} id="fonts">
          <div className={tabStack}>
            {!isReadOnly && (
              <div className={tabActions}>
                <ActionButton
                  aria-label="Add font"
                  onPress={() =>
                    attempt(() => {
                      const id = notify.added("font", () =>
                        store.set(addFontAtom),
                      );
                      if (id) setFocusFontId(id);
                    })
                  }
                >
                  <Add />
                  <Text>Add font</Text>
                </ActionButton>
              </div>
            )}
            {document.fonts.map((font) => (
              <FontCard
                key={font.id}
                font={font}
                isReadOnly={isReadOnly}
                focusName={focusFontId === font.id}
                onNameFocused={() => setFocusFontId(null)}
                onRename={(name) => {
                  try {
                    updateFont({ id: font.id, name });
                    return undefined;
                  } catch (failure) {
                    return failure instanceof Error
                      ? failure.message
                      : String(failure);
                  }
                }}
                onFamilyChange={(fontFamily) =>
                  attempt(() => updateFont({ id: font.id, fontFamily }))
                }
                onDelete={() =>
                  attempt(() =>
                    notify.remove({
                      kind: "font",
                      noun: `Font ${font.name}`,
                      run: (store) => store.set(removeFontAtom, font.id),
                      undo: (removed) => store.set(restoreFontAtom, removed),
                    }),
                  )
                }
              />
            ))}
          </div>
        </TabPanel>
        <TabPanel styles={tabPanelStyles} id="font-sizes">
          <TypeScaleFields
            formula={formula}
            unit={unit}
            interpolations={interpolations}
            isReadOnly={isReadOnly}
            onChange={(next: ScaleType) => attempt(() => replaceFormula(next))}
          >
            <EditableNumberField
              label="Smaller sizes"
              value={document.smallSizes}
              minValue={0}
              maxValue={3}
              onChange={(smallSizes) => patch({ smallSizes })}
            />
            <EditableNumberField
              label="Larger sizes"
              value={document.largeSizes}
              minValue={0}
              maxValue={14}
              onChange={(largeSizes) => patch({ largeSizes })}
            />
          </TypeScaleFields>
        </TabPanel>
        <TabPanel styles={tabPanelStyles} id="line-heights">
          <div className={tabStack}>
            {!isReadOnly && (
              <div className={tabActions}>
                <ActionButton
                  size="M"
                  aria-label="Add line height"
                  onPress={() =>
                    attempt(() => {
                      const id = notify.added("lineHeight", () =>
                        store.set(addLineHeightAtom),
                      );
                      if (id) setFocusId(id);
                    })
                  }
                >
                  <Add />
                  <Text>Add line height</Text>
                </ActionButton>
              </div>
            )}
            {document.lineHeights.map((card) => (
              <LineHeightCard
                key={card.id}
                card={card}
                name={name(card.id)}
                focusName={focusId === card.id}
                onNameFocused={() =>
                  setFocusId((id) => (id === card.id ? null : id))
                }
                unit={unit}
                interpolations={interpolations}
                isReadOnly={isReadOnly}
                onChange={(next) =>
                  patch({
                    lineHeights: document.lineHeights.map((item) =>
                      item.id === next.id ? next : item,
                    ),
                  })
                }
                onRename={(value) => {
                  try {
                    rename({ id: card.id, name: value });
                    return undefined;
                  } catch (failure) {
                    return failure instanceof Error
                      ? failure.message
                      : String(failure);
                  }
                }}
                onDelete={() => {
                  if (lineHeightConsumers(document, card.id).length) {
                    setReplacementId(null);
                    setRemovingId(card.id);
                  } else deleteCard(card.id);
                }}
              />
            ))}
          </div>
        </TabPanel>
        <TabPanel styles={tabPanelStyles} id="iconography">
          <div className={tabStack}>
            <EditablePicker
              label="Alignment"
              selectedKey={document.iconography.alignment}
              displayValue={
                document.iconography.alignment === "text"
                  ? "Text sizes"
                  : "Line heights"
              }
              onSelectionChange={(key) => {
                if (key === "text")
                  patch({
                    iconography: {
                      alignment: "text",
                      baseSize: document.iconography.baseSize,
                    },
                  });
                if (key === "line-height")
                  patch({
                    iconography: {
                      alignment: "line-height",
                      baseSize: document.iconography.baseSize,
                      lineHeightId: document.previewLineHeightId,
                    },
                  });
              }}
            >
              <PickerItem id="text">Text sizes</PickerItem>
              <PickerItem id="line-height">Line heights</PickerItem>
            </EditablePicker>
            {document.iconography.alignment === "text" ? (
              <EditableNumberField
                key={`icon-${unit}`}
                label={`Base size (${unit})`}
                value={toTypographyUnit(document.iconography.baseSize, unit)}
                minValue={0}
                step={toTypographyUnit(1, unit)}
                formatOptions={{ maximumFractionDigits: 6 }}
                onChange={(value) =>
                  attempt(() =>
                    update({
                      iconography: {
                        ...document.iconography,
                        baseSize: fromTypographyUnit(value, unit),
                      },
                    }),
                  )
                }
              />
            ) : (
              <>
                <LabeledValue
                  label={`Base size (${unit})`}
                  value={formatTypographyLength(
                    tokens.find((token) => token.position === 0)!.iconSize,
                    unit,
                  )}
                />
                <EditablePicker
                  label="Line height"
                  selectedKey={document.iconography.lineHeightId}
                  displayValue={name(document.iconography.lineHeightId)}
                  onSelectionChange={(key) => {
                    if (
                      key != null &&
                      document.iconography.alignment === "line-height"
                    )
                      patch({
                        iconography: {
                          ...document.iconography,
                          lineHeightId: String(key),
                        },
                      });
                  }}
                >
                  {lineHeightChoices}
                </EditablePicker>
              </>
            )}
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
  return (
    <div
      className="foundationEditorPanel"
      data-component="FoundationsTypographyPanel"
    >
      <FoundationModeSettings
        foundation="typography"
        before={systemSettings}
        unclaimedControl={
          !modeOwners["typography.textZoom"] && (
            <EditableNumberField
              label={textAdjustmentParameter.label}
              contextualHelp={
                <ContextualHelp>
                  <Heading>{textAdjustmentParameter.label}</Heading>
                  <Content>{textAdjustmentParameter.description}</Content>
                </ContextualHelp>
              }
              value={resolved.textZoom}
              minValue={TEXT_ZOOM_MIN}
              maxValue={TEXT_ZOOM_MAX}
              onChange={updateTextZoom}
            />
          )
        }
      />
      {sections}
      <DialogContainer onDismiss={() => setRemovingId(null)}>
        {!isReadOnly && removingId && (
          <Dialog size="S">
            {({ close }) => (
              <>
                <Heading slot="title">
                  Replace {name(removingId)} line height
                </Heading>
                <Content>
                  <div className={stack}>
                    <Text>
                      Used by:{" "}
                      {lineHeightConsumers(document, removingId).join(", ")}.
                    </Text>
                    {document.lineHeights.length > 1 ? (
                      <Picker
                        label="Replacement line height"
                        selectedKey={replacementId}
                        onSelectionChange={(key) =>
                          setReplacementId(key == null ? null : String(key))
                        }
                      >
                        {document.lineHeights
                          .filter((card) => card.id !== removingId)
                          .map((card) => (
                            <PickerItem id={card.id} key={card.id}>
                              {name(card.id)}
                            </PickerItem>
                          ))}
                      </Picker>
                    ) : (
                      <Text>
                        Add another line height before removing this one.
                      </Text>
                    )}
                  </div>
                </Content>
                <ButtonGroup>
                  <Button variant="secondary" onPress={close}>
                    Cancel
                  </Button>
                  <Button
                    variant="negative"
                    isDisabled={!replacementId}
                    onPress={() =>
                      deleteCard(removingId, replacementId ?? undefined)
                    }
                  >
                    Replace and delete
                  </Button>
                </ButtonGroup>
              </>
            )}
          </Dialog>
        )}
      </DialogContainer>
    </div>
  );
}
