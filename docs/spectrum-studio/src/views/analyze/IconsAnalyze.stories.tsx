// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { ICONS_DEFAULTS } from "../../features/icons/defaults";
import { IconsAnalyze, IconsAnalyzeContent } from "./IconsAnalyze";

function Fixture() {
  const [store] = useState(() => createStore());
  return (
    <Provider store={store}>
      <div style={{ width: "100%", maxWidth: 960 }}>
        <IconsAnalyze />
      </div>
    </Provider>
  );
}
const meta = {
  title: "Views/Icons analysis",
  component: IconsAnalyze,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof IconsAnalyze>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /Icon scale/ }),
    ).toHaveTextContent("All scales");
    await expect(
      canvasElement.querySelector('[data-scale-chart="workflow"]'),
    ).not.toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};

export const Detail: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Icon scale/ }));
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole("option", {
        name: ICONS_DEFAULTS.scales[0].name,
      }),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /Settings shown/ }),
      ).toBeVisible(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};

export const Error: Story = {
  name: "Scale that cannot be compared",
  render: () => (
    <IconsAnalyzeContent
      comparisons={[
        {
          scale: ICONS_DEFAULTS.scales[0],
          error: "The selected line height no longer exists.",
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Could not compare Workflow"),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

export const Narrow: Story = {
  name: "Narrow view",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
