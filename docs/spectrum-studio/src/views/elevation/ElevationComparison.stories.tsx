// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { ElevationComparison } from "./ElevationComparison";
import { ELEVATION_DEFAULTS } from "../../features/elevation/defaults";
import { designSystemDefaults } from "../../data/defaults";

const meta = {
  title: "Views/Elevation comparison",
  component: ElevationComparison,
  args: {
    document: structuredClone(ELEVATION_DEFAULTS),
    modeSets: structuredClone(designSystemDefaults.system.modeSets),
    activeModes: [],
  },
  decorators: [
    (Story) => (
      <div
        className="chartComparisonContainer"
        style={{ width: "min(840px, calc(100vw - 48px))" }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ElevationComparison>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Show values" }));
    await expect(
      canvas.getByRole("table", { name: "Elevation comparison values" }),
    ).toBeVisible();
  },
};
export const Empty: Story = {
  args: { document: { ...structuredClone(ELEVATION_DEFAULTS), layers: [] } },
};
export const Invalid: Story = {
  args: { document: { ...structuredClone(ELEVATION_DEFAULTS), depth: -1 } },
};
export const MultipleLayers: Story = {
  name: "Multiple layers",
  args: {
    document: {
      ...structuredClone(ELEVATION_DEFAULTS),
      layers: [
        ELEVATION_DEFAULTS.layers[0],
        {
          ...ELEVATION_DEFAULTS.layers[0],
          id: "00000000-0000-4000-8000-000000000002",
          label: "Ambient",
          base: 8,
        },
      ],
    },
  },
};
