// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { useState } from "react";
import { OpacityAnalyze } from "./OpacityAnalyze";
import { createOpacityStoryStore } from "./opacityStoryFixture";
import { OpacityStoryProvider } from "./OpacityStoryProvider";

function Fixture({
  appearance = "light",
  darkMode = false,
  override = false,
}: {
  appearance?: "light" | "dark";
  darkMode?: boolean;
  override?: boolean;
}) {
  const [store] = useState(() =>
    createOpacityStoryStore({ appearance, darkMode, override }),
  );
  return (
    <OpacityStoryProvider store={store}>
      <div style={{ width: "100%", maxWidth: 1100 }}>
        <OpacityAnalyze />
      </div>
    </OpacityStoryProvider>
  );
}

const meta = {
  title: "Views/Opacity analysis",
  component: OpacityAnalyze,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof OpacityAnalyze>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LightMode: Story = {
  name: "Light design mode",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("list", { name: "Opacity step progression" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "Contrast (WCAG 2)" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "Opacity percentage" }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const DarkMode: Story = {
  name: "Dark design mode",
  render: () => <Fixture darkMode />,
};
export const DarkAppearance: Story = {
  name: "Dark app appearance",
  render: () => <Fixture appearance="dark" />,
  globals: { colorScheme: "dark" },
};
export const ManualOverride: Story = {
  name: "Manual override observations",
  render: () => <Fixture darkMode override />,
};
export const Narrow: Story = {
  name: "Narrow analysis",
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
};
