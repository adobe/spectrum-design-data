// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { FoundationsOpacityPanel } from "./FoundationsOpacityPanel";
import { createOpacityStoryStore } from "../../views/opacity/opacityStoryFixture";
import { OpacityStoryProvider } from "../../views/opacity/OpacityStoryProvider";

function Fixture({
  appearance = "light",
  darkMode = false,
  override = false,
  boundaries = false,
  stale = false,
}: {
  appearance?: "light" | "dark";
  darkMode?: boolean;
  override?: boolean;
  boundaries?: boolean;
  stale?: boolean;
}) {
  const [store] = useState(() =>
    createOpacityStoryStore({
      appearance,
      editing: true,
      darkMode,
      override,
      boundaries,
      stale,
    }),
  );
  return (
    <OpacityStoryProvider store={store} deletionToast>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <FoundationsOpacityPanel />
      </div>
    </OpacityStoryProvider>
  );
}

const meta = {
  title: "Panels/Opacity foundation",
  component: FoundationsOpacityPanel,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof FoundationsOpacityPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LightAppearance: Story = { name: "Light app appearance" };

export const DarkAppearance: Story = {
  name: "Dark app appearance",
  render: () => <Fixture appearance="dark" />,
  globals: { colorScheme: "dark" },
};

export const DarkModeInLightAppearance: Story = {
  name: "Dark design mode in light app appearance",
  render: () => <Fixture darkMode />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("slider", { name: "800" })).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

export const ManualOverride: Story = {
  name: "Manual override in dark mode",
  render: () => <Fixture darkMode override />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Edited", { exact: true })).toBeVisible();
    await expect(
      canvas.getByRole("button", {
        name: "Reset opacity 800 to generated",
      }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Reset opacity 800 to generated",
      }),
    );
    await expect(canvas.queryByText("Edited", { exact: true })).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};
export const StaleOverride: Story = {
  name: "Out of date manual override",
  render: () => <Fixture darkMode override stale />,
};

export const KeyboardEditing: Story = {
  name: "Keyboard editing and focused marker",
  play: async ({ canvasElement }) => {
    const slider = within(canvasElement).getByRole("slider", { name: "100" });
    await userEvent.click(slider);
    await userEvent.keyboard("{Home}");
    await expect(slider).toHaveValue("0");
    await userEvent.keyboard("{ArrowRight}");
    await expect(slider).toHaveFocus();
    await expect(slider).toHaveValue("0.01");
    canvasElement.dataset.playComplete = "true";
  },
};

export const Endpoints: Story = {
  name: "Transparent and opaque endpoints",
  render: () => <Fixture boundaries />,
};

export const Narrow: Story = {
  name: "Narrow panel",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
