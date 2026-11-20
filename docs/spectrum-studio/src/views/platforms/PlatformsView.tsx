// Copyright 2026 Adobe. All rights reserved.
import { Heading } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { SharedColorOutputControls } from "../../panels/color-system/SharedColorOutputControls";
import { TypographyOutputFormatPicker } from "../../panels/typography/TypographyOutputFormatPicker";

const layout = style({
  padding: 32,
  display: "flex",
  flexDirection: "column",
  gap: 24,
  maxWidth: 640,
  width: "full",
});
const group = style({ display: "flex", flexDirection: "column", gap: 16 });

export function PlatformsView() {
  return (
    <div className="pageMainContent">
      <section className={layout} aria-label="Platform-wide settings">
        <Heading>Platforms</Heading>
        <p>
          These settings apply across the design system, not to an individual
          platform. Choose Edit to change them.
        </p>
        <section className={group} aria-label="Color">
          <Heading level={3}>Color</Heading>
          <SharedColorOutputControls />
        </section>
        <section className={group} aria-label="Typography">
          <Heading level={3}>Typography</Heading>
          <TypographyOutputFormatPicker />
        </section>
      </section>
    </div>
  );
}
