// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { ICONS_DEFAULTS } from "../features/icons/defaults";
import { IconsElements, IconsElementsContent } from "./IconsElements";

function Fixture() {
  const [store] = useState(() => createStore());
  return (
    <Provider store={store}>
      <div style={{ width: "100%", maxWidth: 960 }}>
        <IconsElements />
      </div>
    </Provider>
  );
}
const meta = {
  title: "Views/Icons preview",
  component: IconsElements,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof IconsElements>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Workflow: Story = {
  name: "Workflow icon set",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const section = within(
      canvas.getByRole("region", { name: "Workflow icon scale" }),
    );
    const sizes = section.getByRole("list", { name: "Workflow sizes" });
    const iconSet = section.getByRole("list", {
      name: /^Workflow icon set at /,
    });
    await expect(sizes).toBeVisible();
    await expect(iconSet).toBeVisible();
    // Sizes stack vertically, with the icon browser beside them on the right.
    const [first, second] = within(sizes).getAllByRole("listitem");
    await expect(second.getBoundingClientRect().top).toBeGreaterThan(
      first.getBoundingClientRect().top,
    );
    await expect(iconSet.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      sizes.getBoundingClientRect().right,
    );
    // The section hugs every size; only the icon browser scrolls.
    await expect(sizes.scrollHeight).toBeLessThanOrEqual(sizes.clientHeight);
    const browser = section.getByRole("group", {
      name: "Workflow icon browser",
    });
    const side = sizes.parentElement!.getBoundingClientRect();
    const browserBox = browser.getBoundingClientRect();
    await expect(
      Math.abs(browserBox.height - Math.max(240, side.height)),
    ).toBeLessThanOrEqual(1);
    const scroller = browser.querySelector<HTMLElement>(
      "[data-icon-browser-scroll]",
    );
    await expect(scroller?.scrollHeight).toBeGreaterThan(
      scroller?.clientHeight ?? 0,
    );
    // Only the size column carries the system background; the section has no padding.
    const region = canvas.getByRole("region", { name: "Workflow icon scale" });
    await expect(sizes).toHaveAttribute("data-elements-surface");
    await expect(region).not.toHaveAttribute("data-elements-surface");
    await expect(getComputedStyle(region).padding).toBe("0px");
    // Ramp icons are filled dark or light to match the surface text color.
    const brightness = (color: string) => {
      const [r, g, b] = color.match(/\d+(\.\d+)?/g)!.map(Number);
      return (r + g + b) / 3;
    };
    const lightText = brightness(getComputedStyle(sizes).color) > 128;
    await waitFor(() => {
      const glyph = sizes.querySelector("svg");
      expect(glyph).not.toBeNull();
      expect(brightness(getComputedStyle(glyph!).fill) > 128).toBe(lightText);
    });
    canvasElement.dataset.playComplete = "true";
  },
};

export const NoMatches: Story = {
  name: "Filter with no matches",
  play: async ({ canvasElement }) => {
    const browser = within(
      within(canvasElement).getByRole("group", {
        name: "Workflow icon browser",
      }),
    );
    await userEvent.type(
      browser.getByRole("searchbox", { name: "Filter icons" }),
      "zzzz-not-an-icon",
    );
    await waitFor(() =>
      expect(
        browser.getByText('No icons match "zzzz-not-an-icon".'),
      ).toBeVisible(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};

const twoScaleValues = (scaleId: string) =>
  [
    { index: -1, step: 75, value: 14 },
    { index: 0, step: 100, value: 18 },
    { index: 1, step: 200, value: 20 },
  ].map((value) => ({ ...value, scaleId, raw: value.value }));

export const TwoScales: Story = {
  name: "Each scale has its own sample icon and filter",
  render: () => (
    <IconsElementsContent
      scales={[
        { scale: ICONS_DEFAULTS.scales[0], values: twoScaleValues("workflow") },
        {
          scale: { ...ICONS_DEFAULTS.scales[0], id: "ui", name: "UI" },
          values: twoScaleValues("ui"),
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of ["Workflow", "UI"]) {
      const section = within(
        canvas.getByRole("region", { name: `${name} icon scale` }),
      );
      const sizes = section.getByRole("list", { name: `${name} sizes` });
      const picker = section.getByRole("combobox", { name: "Sample icon" });
      // The sample icon picker sits above that scale's size ramp.
      await expect(picker.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        sizes.getBoundingClientRect().top,
      );
      await expect(
        within(
          section.getByRole("group", { name: `${name} icon browser` }),
        ).getByRole("searchbox", { name: "Filter icons" }),
      ).toBeVisible();
    }
    // Filtering one scale's browser leaves the other scale's browser unchanged.
    const workflowBrowser = within(
      canvas.getByRole("group", { name: "Workflow icon browser" }),
    );
    await userEvent.type(
      workflowBrowser.getByRole("searchbox", { name: "Filter icons" }),
      "zzzz-not-an-icon",
    );
    await waitFor(() =>
      expect(
        workflowBrowser.getByText('No icons match "zzzz-not-an-icon".'),
      ).toBeVisible(),
    );
    await expect(
      canvas.getByRole("list", { name: /^UI icon set at / }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

export const Issue: Story = {
  name: "Scale that cannot be shown",
  render: () => (
    <IconsElementsContent
      scales={[
        {
          scale: ICONS_DEFAULTS.scales[0],
          values: [],
          issue: "The selected line height no longer exists.",
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Could not show Workflow"),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

export const Narrow: Story = {
  name: "Narrow view",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
