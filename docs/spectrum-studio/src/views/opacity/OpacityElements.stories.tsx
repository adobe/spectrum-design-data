// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { useState } from "react";
import { OpacityElements } from "./OpacityElements";
import { createOpacityStoryStore } from "./opacityStoryFixture";
import { OpacityStoryProvider } from "./OpacityStoryProvider";

function Fixture({
  appearance = "light",
  boundaries = false,
  darkMode = false,
  override = false,
}: {
  appearance?: "light" | "dark";
  boundaries?: boolean;
  darkMode?: boolean;
  override?: boolean;
}) {
  const [store] = useState(() =>
    createOpacityStoryStore({
      appearance,
      boundaries,
      darkMode,
      override,
    }),
  );
  return (
    <OpacityStoryProvider store={store}>
      <div style={{ height: 520, width: "100%", maxWidth: 1100 }}>
        <OpacityElements />
      </div>
    </OpacityStoryProvider>
  );
}

const meta = {
  title: "Views/Opacity elements",
  component: OpacityElements,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof OpacityElements>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LightAppearance: Story = { name: "Light app appearance" };
export const DarkAppearance: Story = {
  name: "Dark app appearance",
  render: () => <Fixture appearance="dark" />,
  globals: { colorScheme: "dark" },
};
export const TransparentAndOpaque: Story = {
  name: "Transparent and opaque endpoints",
  render: () => <Fixture boundaries />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("img", { name: /Opacity 100, 0%/ }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: /Opacity 1700, 100%/ }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const ManualOverride: Story = {
  name: "Manual override",
  render: () => <Fixture darkMode override />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("31% (edited)", { exact: true }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Narrow: Story = {
  name: "Narrow elements surface",
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
};
