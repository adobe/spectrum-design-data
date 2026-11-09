// Copyright 2026 Adobe. All rights reserved.
import {
  Checkbox,
  Content,
  ContextualHelp,
  Heading,
  Link,
  PickerItem,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import {
  colorSystemDocumentAtom,
  updateColorSystemSettingsAtom,
} from "../../features/color-system/state";
import {
  EditablePicker,
  EditableSlider,
  useIsReadOnly,
} from "../../components/editable";
import { SharedColorOutputControls } from "../color-system/SharedColorOutputControls";
import { useNotify } from "../../components/notifications/notificationContext";
import type { ColorScaleType } from "../../features/color-system/model";
import { FoundationParameterSettings } from "./FoundationParameterSettings";

const scaleTypes: { id: ColorScaleType; label: string }[] = [
  { id: "dynamic-blend", label: "Dynamic blend" },
  { id: "opaque", label: "Opaque" },
  { id: "transparent", label: "Transparent" },
];

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  paddingStart: 8,
  paddingEnd: 8,
});
const row = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "full",
});
const number = (value: number | number[]) =>
  Array.isArray(value) ? value[0] : value;

export function ColorSystemSettings() {
  const document = useAtomValue(colorSystemDocumentAtom);
  const update = useSetAtom(updateColorSystemSettingsAtom);
  const isReadOnly = useIsReadOnly();
  const notify = useNotify();
  const type = document.settings.colorScaleType ?? "dynamic-blend";
  return (
    <div className={stack}>
      <FoundationParameterSettings foundation="color" />
      <SharedColorOutputControls />
      <div className={row}>
        <EditableSlider
          label="Polarity compensation (dark modes)"
          value={document.settings.polarityCompensation ?? 0}
          minValue={0}
          maxValue={1}
          step={0.01}
          formatOptions={{ style: "percent" }}
          onChange={(value) => update({ polarityCompensation: number(value) })}
        />
        <ContextualHelp aria-label="Polarity compensation information">
          <Heading>Polarity compensation</Heading>
          <Content>
            Keeps perceived contrast balanced as backgrounds get darker. Affects
            generated colors as the background color gets darker.
            <br />
            <br /> Lower contrasts receive more compensation.
            <br />
            <br />
            Learn more about{" "}
            <Link
              href="https://colorandcontrast.com/#/contrast-polarity"
              target="_blank"
            >
              contrast polarity
            </Link>
            .
          </Content>
        </ContextualHelp>
      </div>
      <EditablePicker
        label="Color scale type"
        selectedKey={type}
        displayValue={scaleTypes.find((item) => item.id === type)!.label}
        onSelectionChange={(key) => {
          const option = scaleTypes.find((item) => item.id === key);
          if (!option) return;
          try {
            update({ colorScaleType: option.id });
          } catch (error) {
            notify.error(error);
          }
        }}
      >
        {scaleTypes.map((option) => (
          <PickerItem key={option.id} id={option.id}>
            {option.label}
          </PickerItem>
        ))}
      </EditablePicker>
      {type === "transparent" && (
        <Checkbox
          isSelected={document.settings.syncDefaultStopsWithOpacity ?? false}
          isDisabled={isReadOnly}
          onChange={(value) => {
            try {
              update({ syncDefaultStopsWithOpacity: value });
            } catch (error) {
              notify.error(error);
            }
          }}
        >
          Sync default stops with opacity scale
        </Checkbox>
      )}
      {type !== "opaque" && (
        <>
          <div className={row}>
            <EditableSlider
              label="Background blend"
              value={document.settings.backgroundBlend}
              minValue={0}
              maxValue={1}
              step={0.01}
              onChange={(value) => update({ backgroundBlend: number(value) })}
            />
            <ContextualHelp aria-label="Background blend information">
              <Heading>Background blend</Heading>
              <Content>
                Controls how strongly generated colors blend with the selected
                background.
              </Content>
            </ContextualHelp>
          </div>
          <div className={row}>
            <EditableSlider
              label="Source curve offset"
              value={document.settings.colorSourceCurveOffset}
              minValue={-1}
              maxValue={1}
              step={0.01}
              fillOffset={0}
              formatOptions={{
                maximumFractionDigits: 2,
                signDisplay: "exceptZero",
              }}
              onChange={(value) =>
                update({ colorSourceCurveOffset: number(value) })
              }
            />
            <ContextualHelp aria-label="Source curve offset information">
              <Heading>Source curve offset</Heading>
              <Content>
                Controls the source curve across generated contrasts.
              </Content>
            </ContextualHelp>
          </div>
        </>
      )}
    </div>
  );
}
