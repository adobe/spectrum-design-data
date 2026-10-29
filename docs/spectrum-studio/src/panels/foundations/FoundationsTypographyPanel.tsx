// Copyright 2026 Adobe. All rights reserved.
import {
  AccordionItem,
  AccordionItemHeader,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  Button,
  ButtonGroup,
  Checkbox,
  Content,
  Dialog,
  DialogContainer,
  Heading,
  LabeledValue,
  PickerItem,
  Text,
  ToastQueue,
} from "@react-spectrum/s2";
import { Picker } from "../../components/fields/Picker";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import {
  addLineHeightAtom,
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
  replaceScaleTypeAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import {
  TYPOGRAPHY_SCALE_TYPE_ID,
  type ScaleType,
} from "../../features/scales/scaleType";
import type { TypographyDocument } from "../../features/typography/model";
import { TEXT_ZOOM_MAX, TEXT_ZOOM_MIN } from "../../features/typography/model";
import {
  EditableNumberField,
  EditablePicker,
  useIsReadOnly,
} from "../../components/editable";
import { RoundingRulePicker } from "../../components/logic/RoundingRulePicker";
import { authoringCapabilityOwnersAtom } from "../../features/modes/capabilities";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { lineHeightName } from "../../features/typography/lineHeightNames";
import {
  formatTypographyLength,
  fromTypographyUnit,
  isTypographyUnit,
  toTypographyUnit,
  TYPOGRAPHY_UNITS,
} from "../../features/typography/units";
import { useDeletionToast } from "../../components/deletionToastContext";
import { FoundationModeSettings } from "./FoundationModeSettings";
import { TypeScaleFields } from "../typography/TypeScaleFields";
import { LineHeightCard } from "../typography/LineHeightCard";

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
  padding: 8,
});
const panel = style({ padding: 0 });
const note = style({ font: "body-sm", color: "neutral-subdued", margin: 0 });

export function FoundationsTypographyPanel() {
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
  const replaceFormula = useSetAtom(replaceScaleTypeAtom);
  const updateTextZoom = useSetAtom(updateTextZoomAtom);
  const add = useSetAtom(addLineHeightAtom);
  const rename = useSetAtom(renameLineHeightAtom);
  const remove = useSetAtom(removeLineHeightAtom);
  const restore = useSetAtom(restoreLineHeightAtom);
  const { notifyDeleted } = useDeletionToast();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(new Set(["font-sizes"]));
  const report = (failure: unknown) =>
    ToastQueue.negative(
      failure instanceof Error ? failure.message : String(failure),
    );
  const attempt = (action: () => void) => {
    try {
      action();
    } catch (failure) {
      report(failure);
    }
  };
  const patch = (values: Partial<TypographyDocument>) =>
    attempt(() => update(values));
  const name = (id: string) => lineHeightName(document, registry, id);
  const unit = document.outputUnit;
  if (!formula) throw new Error("The shared Type scale is unavailable.");

  function deleteCard(id: string, replacement?: string) {
    attempt(() => {
      const label = name(id);
      const removed = remove({ id, replacementId: replacement });
      setRemovingId(null);
      notifyDeleted(`Line height ${label}`, () =>
        attempt(() => restore(removed)),
      );
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
            ruleId={document.textRoundingRuleId}
            onChange={(textRoundingRuleId) => patch({ textRoundingRuleId })}
          />
          <RoundingRulePicker
            labelPosition="side"
            label="Line height rounding"
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
    <>
      <AccordionItem id="font-sizes">
        <AccordionItemTitle>Font sizes</AccordionItemTitle>
        <AccordionItemPanel UNSAFE_className={String(panel)}>
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
        </AccordionItemPanel>
      </AccordionItem>
      <AccordionItem id="line-heights">
        <AccordionItemHeader>
          <AccordionItemTitle>Line heights</AccordionItemTitle>
          {!isReadOnly && (
            <ActionButton
              size="M"
              isQuiet
              aria-label="Add line height"
              onPress={() =>
                attempt(() => {
                  const id = add();
                  setFocusId(id);
                  setExpanded((keys) => new Set([...keys, "line-heights"]));
                })
              }
            >
              <Add />
            </ActionButton>
          )}
        </AccordionItemHeader>
        <AccordionItemPanel UNSAFE_className={String(panel)}>
          <div className={stack}>
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
        </AccordionItemPanel>
      </AccordionItem>
      <AccordionItem id="iconography">
        <AccordionItemTitle>Iconography</AccordionItemTitle>
        <AccordionItemPanel UNSAFE_className={String(panel)}>
          <div className={stack}>
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
        </AccordionItemPanel>
      </AccordionItem>
    </>
  );
  return (
    <div
      className="foundationEditorPanel"
      data-component="FoundationsTypographyPanel"
    >
      <FoundationModeSettings
        foundation="typography"
        expandedKeys={expanded}
        onExpandedChange={setExpanded}
        before={systemSettings}
        after={sections}
        unclaimedControl={
          !modeOwners["typography.textZoom"] && (
            <EditableNumberField
              label="Text size"
              value={resolved.textZoom}
              minValue={TEXT_ZOOM_MIN}
              maxValue={TEXT_ZOOM_MAX}
              onChange={updateTextZoom}
            />
          )
        }
      />
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
