// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DraftLightnessSlider, DraftSlider } from "./DraftSlider";

const meta = {
  title: "Components/Draft slider",
  component: DraftSlider,
  parameters: { layout: "centered" },
} satisfies Meta<typeof DraftSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

function useCountedSaves(initial: number) {
  const [value, setValue] = useState(initial);
  const [saves, setSaves] = useState(0);
  const save = (next: number) => {
    setValue(next);
    setSaves((count) => count + 1);
  };
  return { value, saves, save };
}

function CountedSaves() {
  const contrast = useCountedSaves(0.5);
  const lightness = useCountedSaves(0.5);
  return (
    <div style={{ display: "grid", gap: 24, width: 320 }}>
      <div
        data-testid="contrast-state"
        data-value={contrast.value}
        data-saves={contrast.saves}
      >
        <DraftSlider
          label="Overall contrast"
          value={contrast.value}
          minValue={0}
          maxValue={1}
          step={0.01}
          onChange={contrast.save}
        />
      </div>
      <div
        data-testid="lightness-state"
        data-value={lightness.value}
        data-saves={lightness.saves}
      >
        <DraftLightnessSlider
          label="Background lightness"
          UNSAFE_style={{ width: "100%" }}
          value={lightness.value}
          onChange={lightness.save}
        />
      </div>
    </div>
  );
}

export const SavesSettledValues: Story = {
  render: () => <CountedSaves />,
};
