// Copyright 2026 Adobe. All rights reserved.
import { Content, ContextualHelp, Heading, Link } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import {
  colorSystemDocumentAtom,
  updateColorSystemSettingsAtom,
} from "../../features/color-system/state";
import { EditableSlider } from "../../components/editable";
import { SharedColorOutputControls } from "../color-system/SharedColorOutputControls";

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
  return (
    <div className={stack}>
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
      <div className={row}>
        <EditableSlider
          label="Background blend"
          value={document.settings.extOffset}
          minValue={0}
          maxValue={1}
          step={0.01}
          onChange={(value) => update({ extOffset: number(value) })}
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
          value={document.settings.extSteep}
          minValue={-1}
          maxValue={1}
          step={0.01}
          fillOffset={0}
          formatOptions={{
            maximumFractionDigits: 2,
            signDisplay: "exceptZero",
          }}
          onChange={(value) => update({ extSteep: number(value) })}
        />
        <ContextualHelp aria-label="Source curve offset information">
          <Heading>Source curve offset</Heading>
          <Content>
            Controls the source curve across generated contrasts.
          </Content>
        </ContextualHelp>
      </div>
    </div>
  );
}
