// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { ShadowSample } from "./ShadowSample";
import { generateElevation } from "../../features/elevation/generate";
import { ELEVATION_DEFAULTS } from "../../features/elevation/defaults";

const meta = {
  title: "Views/Elevation sample",
  component: ShadowSample,
  args: {
    shadows: generateElevation(ELEVATION_DEFAULTS)[0].shadows,
    label: "Elevation sample",
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 48 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ShadowSample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Layered: Story = {
  args: {
    shadows: generateElevation({
      ...ELEVATION_DEFAULTS,
      layers: [
        ELEVATION_DEFAULTS.layers[0],
        {
          ...ELEVATION_DEFAULTS.layers[0],
          id: "00000000-0000-4000-8000-000000000002",
          label: "Ambient",
          base: 12,
          opacity: 10,
        },
      ],
    })[0].shadows,
  },
};
export const ZeroDepth: Story = {
  name: "Zero depth",
  args: {
    shadows: generateElevation({ ...ELEVATION_DEFAULTS, depth: 0 })[0].shadows,
  },
};
export const Transparent: Story = {
  args: {
    shadows: generateElevation({
      ...ELEVATION_DEFAULTS,
      layers: [{ ...ELEVATION_DEFAULTS.layers[0], opacity: 0 }],
    })[0].shadows,
  },
};
