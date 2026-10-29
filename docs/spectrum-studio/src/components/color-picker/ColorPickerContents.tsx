// Copyright 2026 Adobe. All rights reserved.
import { NumberField, Picker, PickerItem, TextField } from "@react-spectrum/s2";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@react-spectrum/s2/SegmentedControl";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { CategoryIcon } from "../CategoryIcon";
import Color from "colorjs.io";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { appColorSchemeAtom } from "../../features/modes/capabilities";
import { ColorArea } from "./ColorArea";
import { ColorSlider } from "./ColorSlider";
import {
  colorChannelToFieldValue,
  createColorWithChannelValue,
  fieldValueToColorChannel,
  getChannelGamutRange,
  getColorCoords,
  getColorSpaceConfig,
  isPercentageChannel,
  isRgbChannel,
  mapColorToGamut,
  parsePickerColor,
  parsePickerHex,
  serializePickerColor,
  type ChannelName,
  type PickerColorSpace,
  type PickerGamut,
  type PickerModel,
} from "./colorUtils";
import type { ColorPickerContentsProps } from "./types";
import { useDefaultPickerGamut } from "./ColorPickerDefaults";
import { pickerColorsEqual } from "./colorUtils";
import "./color-picker.css";

const CHANNEL_NAMES: Record<string, string> = {
  r: "Red",
  g: "Green",
  b: "Blue",
  h: "Hue",
  s: "Saturation",
  l: "Lightness",
  a: "Red/green",
  c: "Chroma",
};

function channelName(channel: string, spaceId: string) {
  if (spaceId === "oklab" && channel === "b") return "Blue/yellow";
  return CHANNEL_NAMES[channel] ?? channel.toUpperCase();
}

function channelFormatOptions(
  channel: ChannelName,
  spaceId: string,
): Intl.NumberFormatOptions {
  if (isPercentageChannel(channel, spaceId)) {
    return { style: "percent", maximumFractionDigits: 1 };
  }
  if (channel === "h") {
    return {
      style: "unit",
      unit: "degree",
      unitDisplay: "narrow",
      maximumFractionDigits: 1,
    };
  }
  return {
    maximumFractionDigits: spaceId === "srgb" && isRgbChannel(channel) ? 0 : 3,
  };
}

function channelStep(channel: ChannelName, spaceId: string) {
  if (spaceId === "srgb" && isRgbChannel(channel)) return 1;
  if (isPercentageChannel(channel, spaceId)) return 0.01;
  if (channel === "h") return 1;
  return 0.001;
}

function alignRangeToStep(minimum: number, maximum: number, step: number) {
  const precision = 1 / step;
  const alignedMinimum =
    Math.ceil((minimum - Number.EPSILON) * precision) / precision;
  const alignedMaximum =
    Math.floor((maximum + Number.EPSILON) * precision) / precision;
  return alignedMinimum <= alignedMaximum
    ? ([alignedMinimum, alignedMaximum] as const)
    : ([minimum, maximum] as const);
}

export function ColorPickerContents({
  color,
  onChange,
  colorSpace: explicitColorSpace,
  gamut: explicitGamut,
  model: explicitModel,
  showGamutPicker = true,
  className,
  styles,
  style: wrapperStyle,
}: ColorPickerContentsProps & { colorScheme?: "light" | "dark" }) {
  const systemColorScheme = useAtomValue(appColorSchemeAtom);
  const defaultGamut = useDefaultPickerGamut();
  const initialGamut = explicitGamut ?? defaultGamut;
  const initialColorSpace =
    explicitColorSpace ?? (initialGamut === "sRGB" ? "sRGB" : "OKlch");
  const pickerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const areaSize =
    availableWidth > 0
      ? Math.min(200, Math.max(1, Math.floor(availableWidth - 36)))
      : 200;
  const channelSliderSize =
    availableWidth > 0
      ? Math.min(200, Math.max(1, Math.floor(availableWidth - 82)))
      : 200;
  const [currentColor, setCurrentColor] = useState(() =>
    parsePickerColor(color),
  );
  const [colorSpace, setColorSpace] =
    useState<PickerColorSpace>(initialColorSpace);
  const [gamut, setGamut] = useState<PickerGamut>(initialGamut);
  const [model, setModel] = useState<PickerModel>(
    () =>
      explicitModel ??
      (initialColorSpace === "OKlch" && initialGamut !== "sRGB"
        ? "polar"
        : "cartesian"),
  );
  const [view, setView] = useState<"color-area" | "channels">("color-area");
  const [hexDraft, setHexDraft] = useState<{
    value: string;
    color: string;
    gamut: PickerGamut;
    isInvalid: boolean;
  } | null>(null);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailableWidth(entry.contentRect.width),
    );
    observer.observe(picker);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const incomingColor = parsePickerColor(color);
    setCurrentColor((existingColor) =>
      pickerColorsEqual(existingColor, incomingColor)
        ? existingColor
        : incomingColor,
    );
  }, [color]);

  const config = useMemo(
    () => getColorSpaceConfig(colorSpace, model),
    [colorSpace, model],
  );
  const hexColor = serializePickerColor(currentColor, "sRGB");
  const activeHexDraft =
    hexDraft?.color === hexColor && hexDraft.gamut === gamut ? hexDraft : null;
  const commit = (nextColor: Color) => {
    const colorInGamut = mapColorToGamut(nextColor, gamut);
    setCurrentColor(colorInGamut);
    onChange(serializePickerColor(colorInGamut, colorSpace), colorInGamut);
  };
  const finishHexEdit = () => {
    if (!activeHexDraft) return;
    setHexDraft(
      parsePickerHex(activeHexDraft.value)
        ? null
        : { ...activeHexDraft, isInvalid: true },
    );
  };
  const coordinates = useMemo(
    () => getColorCoords(currentColor, config),
    [config, currentColor],
  );
  const channelFields = useMemo(
    () =>
      config.channels.map((channel) => {
        const index = config.channels.indexOf(channel);
        const [minimum, maximum] = getChannelGamutRange(
          currentColor,
          config,
          channel,
          gamut,
        );
        const step = channelStep(channel, config.id);
        const [displayMinimum, displayMaximum] = alignRangeToStep(
          colorChannelToFieldValue(channel, minimum, config.id),
          colorChannelToFieldValue(channel, maximum, config.id),
          step,
        );
        return {
          channel,
          value: colorChannelToFieldValue(
            channel,
            coordinates[index],
            config.id,
          ),
          minimum,
          maximum,
          displayMinimum,
          displayMaximum,
          step,
        };
      }),
    [config, coordinates, currentColor, gamut],
  );

  const updateChannel = (
    channel: ChannelName,
    nextValue: number | null,
    minimum: number,
    maximum: number,
  ) => {
    if (nextValue === null) return;
    const nextChannelValue = fieldValueToColorChannel(
      channel,
      nextValue,
      config.id,
    );
    commit(
      createColorWithChannelValue(
        currentColor,
        config,
        channel,
        Math.min(maximum, Math.max(minimum, nextChannelValue)),
      ),
    );
  };

  const channelField = (
    {
      channel,
      value,
      minimum,
      maximum,
      displayMinimum,
      displayMaximum,
      step,
    }: (typeof channelFields)[number],
    showLabel: boolean,
  ) => (
    <NumberField
      key={channel}
      aria-label={channelName(channel, config.id)}
      label={showLabel ? channelName(channel, config.id) : undefined}
      value={value}
      minValue={displayMinimum}
      maxValue={displayMaximum}
      step={step}
      formatOptions={channelFormatOptions(channel, config.id)}
      hideStepper
      styles={style({ width: 70 })}
      onChange={(nextValue) =>
        updateChannel(channel, nextValue, minimum, maximum)
      }
    />
  );

  return (
    <div
      ref={pickerRef}
      className={["colorPickerContents", styles, className]
        .filter(Boolean)
        .join(" ")}
      style={wrapperStyle}
    >
      <div className="colorPickerControls">
        <Picker
          isQuiet
          label="Color space"
          styles={style({
            minWidth: 0,
            maxWidth: "full",
            width: "auto",
            flexGrow: 1,
            flexBasis: 120,
          })}
          selectedKey={colorSpace}
          onSelectionChange={(key) =>
            setColorSpace(String(key) as PickerColorSpace)
          }
        >
          <PickerItem id="sRGB">sRGB</PickerItem>
          <PickerItem id="Display P3">Display P3</PickerItem>
          <PickerItem id="OKlch">OKLCH</PickerItem>
        </Picker>
        {showGamutPicker && (
          <Picker
            isQuiet
            label="Gamut"
            styles={style({
              minWidth: 0,
              maxWidth: "full",
              width: "auto",
              flexGrow: 1,
              flexBasis: 120,
            })}
            selectedKey={gamut}
            onSelectionChange={(key) => {
              const nextGamut = String(key) as PickerGamut;
              setHexDraft(null);
              setGamut(nextGamut);
            }}
          >
            <PickerItem id="sRGB">sRGB</PickerItem>
            <PickerItem id="Display-P3">Display P3</PickerItem>
            <PickerItem id="Rec2020">Rec 2020</PickerItem>
          </Picker>
        )}
        <SegmentedControl
          aria-label="Color model"
          selectedKey={model}
          onSelectionChange={(key) => setModel(String(key) as PickerModel)}
        >
          <SegmentedControlItem id="cartesian" aria-label="Cartesian model">
            <CategoryIcon category="color-model.cartesian" />
          </SegmentedControlItem>
          <SegmentedControlItem id="polar" aria-label="Polar model">
            <CategoryIcon category="color-model.polar" />
          </SegmentedControlItem>
        </SegmentedControl>
        <SegmentedControl
          aria-label="Color controls"
          selectedKey={view}
          onSelectionChange={(key) =>
            setView(String(key) as "color-area" | "channels")
          }
        >
          <SegmentedControlItem id="color-area" aria-label="Color area">
            <CategoryIcon category="color-view.color-area" />
          </SegmentedControlItem>
          <SegmentedControlItem id="channels" aria-label="Channels">
            <CategoryIcon category="color-view.channels" />
          </SegmentedControlItem>
        </SegmentedControl>
      </div>
      {view === "channels" ? (
        <div className="colorPickerChannels">
          {channelFields.map((field) => (
            <div className="colorPickerChannel" key={field.channel}>
              <label className={style({ font: "body-sm", color: "gray-700" })}>
                {channelName(field.channel, config.id)}
              </label>
              <div className="colorPickerChannelControls">
                <ColorSlider
                  colorCoordinates={coordinates}
                  config={config}
                  channel={field.channel}
                  gamut={gamut}
                  orientation="horizontal"
                  size={channelSliderSize}
                  range={[field.minimum, field.maximum]}
                  ariaLabel={channelName(field.channel, config.id)}
                  onChange={commit}
                />
                {channelField(field, false)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="colorPickerStage">
            <div className="colorPickerAreaColumn">
              <label className={style({ font: "body-sm", color: "gray-700" })}>
                {config.defaultChannels
                  .map((channel) => channel.toUpperCase())
                  .join(" × ")}
              </label>
              <ColorArea
                colorCoordinates={coordinates}
                config={config}
                channels={config.defaultChannels}
                gamut={gamut}
                colorScheme={systemColorScheme}
                size={areaSize}
                onChange={commit}
              />
            </div>
            <div className="colorPickerSliderColumn">
              <label className={style({ font: "body-sm", color: "gray-700" })}>
                {config.thirdChannel.toUpperCase()}
              </label>
              <ColorSlider
                colorCoordinates={coordinates}
                config={config}
                channel={config.thirdChannel}
                gamut={gamut}
                size={areaSize}
                onChange={commit}
              />
            </div>
          </div>
          <div className="colorPickerChannelFields">
            {channelFields.map((field) => channelField(field, true))}
          </div>
        </>
      )}
      {gamut === "sRGB" && (
        <TextField
          label="Hex"
          value={activeHexDraft?.value ?? hexColor}
          onChange={(value) => {
            const nextColor = parsePickerHex(value);
            setHexDraft({
              value,
              color: nextColor
                ? serializePickerColor(nextColor, "sRGB")
                : hexColor,
              gamut,
              isInvalid: false,
            });
            if (nextColor) commit(nextColor);
          }}
          onBlur={finishHexEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              finishHexEdit();
            }
          }}
          validationBehavior="aria"
          isInvalid={activeHexDraft?.isInvalid ?? false}
          errorMessage="Enter a 3- or 6-digit hex color, such as #336699."
          autoComplete="off"
          spellCheck="false"
          styles={style({ width: "full" })}
        />
      )}
    </div>
  );
}
