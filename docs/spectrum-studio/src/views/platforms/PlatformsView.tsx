// Copyright 2026 Adobe. All rights reserved.
import { Heading } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { SharedColorOutputControls } from "../../panels/color-system/SharedColorOutputControls";

const layout = style({
  padding: 32,
  display: "flex",
  flexDirection: "column",
  gap: 24,
  maxWidth: 640,
  width: "full",
});

export function PlatformsView() {
  return (
    <div className="pageMainContent">
      <section className={layout} aria-label="Platform color settings">
        <Heading>Platforms</Heading>
        <p>
          Color authoring and output settings apply across the design system,
          not to an individual platform. Choose Edit to change them.
        </p>
        <SharedColorOutputControls />
      </section>
    </div>
  );
}
