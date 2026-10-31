// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../../components/notifications/notificationContext";
import {
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  Checkbox,
  NumberField,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { ColorPickerContents } from "../../../components/color-picker/ColorPickerContents";
import { ColorScalePicker } from "../../../components/color-picker/ColorScalePicker";
import { TokenComboBox } from "../../../components/fields/TokenComboBox";
import { NestedPanelAccordion } from "../../../components/NestedPanelAccordion";
import { paletteColorCss } from "../../../features/color-system/paletteValue";
import type { ColorSystemDocument } from "../../../features/color-system/model";
import {
  frozenColorValue,
  type DataVisPoint,
  type FrozenColor,
} from "../../../features/color-system/data-vis/model";
import type { UiSwatch } from "../../../features/color-system/data-vis/resolution";
import type { PrimitiveColor } from "../../../features/color-system/data-vis/primitiveColors";
import { tokenStableKey, tokenUuid } from "../../../features/tokens/model";
import { ScaleColorPreview } from "../../../views/color-system/ScaleColorPreview";

const fields = style({ display: "flex", flexDirection: "column", gap: 12 });
const row = style({ display: "flex", alignItems: "end", gap: 12, minWidth: 0 });
const sourceField = style({ flexGrow: 1, minWidth: 0 });
const contrastField = style({ width: 112, flexShrink: 0 });
const CUSTOM_SOURCE = "data-vis:custom-color";
const TOKEN_SOURCE = "data-vis:color-token";

function tokenOptions(colors: readonly PrimitiveColor[]) {
  return colors
    .filter((color) => !color.hidden)
    .map((color) => ({
      id: color.id,
      kind: "token" as const,
      name: color.name,
      displayValue: color.value,
      ...(color.error && { error: color.error }),
    }));
}

function MoreOptions({ children }: { children: React.ReactNode }) {
  return (
    <NestedPanelAccordion>
      <AccordionItem id="more">
        <AccordionItemTitle>More options</AccordionItemTitle>
        <AccordionItemPanel>
          <div className={fields}>{children}</div>
        </AccordionItemPanel>
      </AccordionItem>
    </NestedPanelAccordion>
  );
}

export interface DataVisPointControlsProps {
  point: DataVisPoint;
  document: ColorSystemDocument;
  swatches: readonly UiSwatch[];
  primitiveColors: readonly PrimitiveColor[];
  fixedPosition: boolean;
  readOnly?: boolean;
  baseScope: boolean;
  sourceModeName?: string;
  contrastModeName?: string;
  sourceOverridden?: boolean;
  contrastOverridden?: boolean;
  onBaseScopeChange?: (shared: boolean) => void;
  minimumPosition?: number;
  maximumPosition?: number;
  staticColor?: FrozenColor;
  onStaticValueChange?: (value: string) => void;
  onStaticTokenChange?: (tokenId: string | null) => void;
  onSourceChange: (source: DataVisPoint["source"]) => void;
  onContrastChange: (value: number, oppositeValue?: number) => void;
  onPositionChange: (position: number) => void;
  onReset: (field: "source" | "contrast") => void;
  onAllModes: () => void;
}

export function DataVisPointControls({
  point,
  document,
  fixedPosition,
  readOnly = false,
  baseScope,
  sourceModeName,
  contrastModeName,
  sourceOverridden,
  contrastOverridden,
  primitiveColors,
  minimumPosition = 0,
  maximumPosition = 1,
  onBaseScopeChange,
  staticColor,
  onStaticValueChange,
  onStaticTokenChange,
  onSourceChange,
  onContrastChange,
  onPositionChange,
  onReset,
  onAllModes,
}: DataVisPointControlsProps) {
  const notify = useNotify();
  if (staticColor)
    return (
      <StaticColorControls
        color={staticColor}
        document={document}
        primitiveColors={primitiveColors}
        readOnly={readOnly}
        onValueChange={onStaticValueChange}
        onTokenChange={onStaticTokenChange}
        fixedPosition={fixedPosition}
        minimumPosition={minimumPosition}
        maximumPosition={maximumPosition}
        onPositionChange={onPositionChange}
      />
    );
  const source = point.source;
  const exact =
    source.kind === "ui-swatch" || source.kind === "primitive-token";
  const tokenId =
    source.kind === "primitive-token"
      ? source.tokenId
      : source.kind === "ui-swatch"
        ? tokenUuid(tokenStableKey(source.scaleId, source.contrastId))
        : null;
  const sourceKey =
    source.kind === "ui-scale"
      ? source.scaleId
      : exact
        ? TOKEN_SOURCE
        : CUSTOM_SOURCE;
  const firstToken = primitiveColors.find(
    (color) => !color.hidden && !color.error,
  );
  return (
    <div className={fields}>
      <div className={row}>
        <div className={sourceField}>
          <ColorScalePicker
            label="Color source"
            labelPosition="top"
            isReadOnly={readOnly}
            document={document}
            selectedKey={sourceKey}
            disabledKeys={
              !baseScope && source.kind !== "ui-scale"
                ? document.scales.map((scale) => scale.id)
                : []
            }
            baseOptions={[
              {
                id: CUSTOM_SOURCE,
                label: "Custom color",
                isDisabled: !baseScope && source.kind !== "key-color",
              },
              {
                id: TOKEN_SOURCE,
                label: "Color token",
                isDisabled: (!baseScope && !exact) || !firstToken,
              },
            ]}
            onSelectionChange={(key) => {
              if (key === CUSTOM_SOURCE) {
                const stop =
                  source.kind === "ui-scale"
                    ? document.scales.find(
                        (scale) => scale.id === source.scaleId,
                      )?.stops[0]
                    : undefined;
                onSourceChange({
                  kind: "key-color",
                  color:
                    source.kind === "key-color"
                      ? source.color
                      : stop
                        ? {
                            lightness: stop.lightness,
                            hue: stop.hue,
                            chroma: stop.chroma,
                          }
                        : { lightness: 0.6, hue: 260, chroma: 40 },
                });
              } else if (key === TOKEN_SOURCE) {
                if (!firstToken) {
                  notify.error("No published primitive colors are available.");
                  return;
                }
                onSourceChange({
                  kind: "primitive-token",
                  tokenId: firstToken.id,
                });
              } else onSourceChange({ kind: "ui-scale", scaleId: key });
            }}
          />
        </div>
        {point.contrast && (
          <NumberField
            label="Contrast"
            labelPosition="top"
            styles={contrastField}
            value={point.contrast.value}
            minValue={1}
            maxValue={21}
            step={0.00000001}
            formatOptions={{ maximumFractionDigits: 8 }}
            isReadOnly={readOnly}
            onChange={(value) =>
              onContrastChange(value, point.contrast?.oppositeValue)
            }
          />
        )}
      </div>
      {exact && (
        <TokenComboBox
          label="Color token"
          isRequired
          isDisabled={readOnly}
          selectedKey={tokenId}
          options={tokenOptions(primitiveColors)}
          onChange={(id) => {
            if (!id) return;
            onSourceChange({ kind: "primitive-token", tokenId: id });
          }}
        />
      )}
      {source.kind === "key-color" &&
        (readOnly ? (
          <Text>
            {paletteColorCss(source.color, document.settings.colorOutput)}
          </Text>
        ) : (
          <ColorPickerContents
            color={`oklch(${source.color.lightness} ${(source.color.chroma / 100) * 0.4} ${source.color.hue})`}
            colorSpace="OKlch"
            onChange={(_, parsed) => {
              const [lightness, chroma, hue] = parsed
                .to("oklch")
                .coords.map(Number);
              onSourceChange({
                kind: "key-color",
                color: {
                  lightness,
                  chroma: (chroma / 0.4) * 100,
                  hue: Number.isFinite(hue) ? hue : source.color.hue,
                },
              });
            }}
          />
        ))}
      <MoreOptions>
        {onBaseScopeChange && (
          <Checkbox
            isSelected={baseScope}
            isDisabled={readOnly}
            onChange={onBaseScopeChange}
          >
            Edit shared values
          </Checkbox>
        )}
        <NumberField
          label="Position"
          value={point.position * 100}
          minValue={minimumPosition * 100}
          maxValue={maximumPosition * 100}
          step={0.000001}
          formatOptions={{ maximumFractionDigits: 6 }}
          isReadOnly={readOnly || fixedPosition || !baseScope}
          onChange={(value) => onPositionChange(value / 100)}
        />
        <Text>
          Source:{" "}
          {baseScope
            ? "Shared"
            : `${sourceModeName ?? "Shared"} (${sourceOverridden ? "override" : "inherited"})`}
        </Text>
        {!readOnly && !baseScope && sourceOverridden && (
          <ActionButton onPress={() => onReset("source")}>
            Use inherited source
          </ActionButton>
        )}
        {point.contrast && (
          <>
            <Text>
              Contrast:{" "}
              {baseScope
                ? "Shared"
                : `${contrastModeName ?? "Shared"} (${contrastOverridden ? "override" : "inherited"})`}
            </Text>
            <Checkbox
              isSelected={point.contrast.oppositeValue !== undefined}
              isDisabled={readOnly || !baseScope}
              onChange={(enabled) =>
                onContrastChange(
                  point.contrast!.value,
                  enabled ? point.contrast!.value : undefined,
                )
              }
            >
              Use opposite contrast
            </Checkbox>
            {point.contrast.oppositeValue !== undefined && (
              <NumberField
                label="Opposite contrast"
                value={point.contrast.oppositeValue}
                minValue={1}
                maxValue={21}
                step={0.00000001}
                formatOptions={{ maximumFractionDigits: 8 }}
                isReadOnly={readOnly || !baseScope}
                onChange={(value) =>
                  onContrastChange(point.contrast!.value, value)
                }
              />
            )}
            {!readOnly && !baseScope && contrastOverridden && (
              <ActionButton onPress={() => onReset("contrast")}>
                Use inherited contrast
              </ActionButton>
            )}
          </>
        )}
        {!readOnly && (
          <ActionButton onPress={onAllModes}>
            Use this source in all modes
          </ActionButton>
        )}
      </MoreOptions>
    </div>
  );
}

export function StaticColorControls({
  color,
  document,
  primitiveColors,
  readOnly = false,
  onValueChange,
  onTokenChange,
  fixedPosition = false,
  minimumPosition = 0,
  maximumPosition = 1,
  onPositionChange,
}: {
  color: FrozenColor;
  document: ColorSystemDocument;
  primitiveColors: readonly PrimitiveColor[];
  readOnly?: boolean;
  onValueChange?: (value: string) => void;
  onTokenChange?: (tokenId: string | null) => void;
  fixedPosition?: boolean;
  minimumPosition?: number;
  maximumPosition?: number;
  onPositionChange?: (position: number) => void;
}) {
  const notify = useNotify();
  const value = frozenColorValue(color);
  const firstToken = primitiveColors.find(
    (color) => !color.hidden && !color.error,
  );
  return (
    <div className={fields}>
      <ColorScalePicker
        label="Color source"
        labelPosition="top"
        isReadOnly={readOnly}
        isDisabled={!onTokenChange}
        document={{ ...document, scales: [] }}
        selectedKey={color.tokenId ? TOKEN_SOURCE : CUSTOM_SOURCE}
        baseOptions={[
          { id: CUSTOM_SOURCE, label: "Custom color" },
          { id: TOKEN_SOURCE, label: "Color token", isDisabled: !firstToken },
        ]}
        onSelectionChange={(key) => {
          if (key === CUSTOM_SOURCE) onTokenChange?.(null);
          else {
            if (!firstToken) {
              notify.error("No published primitive colors are available.");
              return;
            }
            onTokenChange?.(firstToken.id);
          }
        }}
      />
      {color.tokenId ? (
        <TokenComboBox
          label="Color token"
          isRequired
          isDisabled={readOnly || !onTokenChange}
          prefix={
            <ScaleColorPreview
              colors={[value]}
              continuous={false}
              size="S"
              label={`Captured color ${value}`}
            />
          }
          selectedKey={color.tokenId}
          options={tokenOptions(primitiveColors)}
          onChange={(id) => {
            if (id) onTokenChange?.(id);
          }}
        />
      ) : readOnly || !onValueChange ? (
        <Text>{value}</Text>
      ) : (
        <ColorPickerContents
          color={value}
          onChange={(value) => onValueChange(value)}
        />
      )}
      {color.position !== undefined && (
        <MoreOptions>
          <NumberField
            label="Position"
            value={color.position * 100}
            minValue={minimumPosition * 100}
            maxValue={maximumPosition * 100}
            step={0.000001}
            formatOptions={{ maximumFractionDigits: 6 }}
            isReadOnly={readOnly || fixedPosition || !onPositionChange}
            onChange={(value) => onPositionChange?.(value / 100)}
          />
        </MoreOptions>
      )}
    </div>
  );
}
