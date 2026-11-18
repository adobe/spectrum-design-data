// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { ElevationElements } from "./ElevationElements";

function Fixture() {
  const [store] = useState(() => createStore());
  return (
    <Provider store={store}>
      <ElevationElements />
    </Provider>
  );
}
const meta = {
  title: "Views/Elevation preview",
  component: ElevationElements,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof ElevationElements>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ShadowValues: Story = {
  name: "Shadow values as plain lines",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const values = canvasElement.querySelectorAll<HTMLElement>(
      "[data-shadow-values]",
    );
    await expect(values.length).toBeGreaterThan(0);
    // Values show directly, one property per line, without a disclosure.
    await expect(canvasElement.querySelector("details")).toBeNull();
    const [first] = values;
    await expect(first).toBeVisible();
    await expect(first.innerText).toMatch(
      /blur: [\d.]+px\nvertical offset: -?[\d.]+px\nopacity: [\d.]+%$/,
    );
    await expect(getComputedStyle(first).fontSize).toBe("12px");
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Show values" }),
    );
    await expect(
      canvasElement.querySelectorAll("[data-shadow-values]"),
    ).toHaveLength(0);
    canvasElement.dataset.playComplete = "true";
  },
};
