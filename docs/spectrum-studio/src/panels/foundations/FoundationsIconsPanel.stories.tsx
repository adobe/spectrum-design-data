// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { FoundationsIconsPanel } from "./FoundationsIconsPanel";
import { editModeAtom } from "../../state/view/editMode";
import { NotificationProvider } from "../../components/notifications/NotificationProvider";

function Fixture({ editing = true }: { editing?: boolean }) {
  const [store] = useState(() => {
    const value = createStore();
    value.set(editModeAtom, editing);
    return value;
  });
  return (
    <Provider store={store}>
      <NotificationProvider>
        <div style={{ width: "100%", maxWidth: 340 }}>
          <FoundationsIconsPanel />
        </div>
      </NotificationProvider>
    </Provider>
  );
}
const meta = {
  title: "Panels/Icons foundation",
  component: FoundationsIconsPanel,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof FoundationsIconsPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Workflow: Story = {
  name: "Workflow scale",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const title of ["System settings", "Mode sets"])
      await expect(canvas.getByRole("button", { name: title })).toBeVisible();
    const card = within(
      canvas.getByRole("region", { name: "Workflow icon scale" }),
    );
    await expect(
      card.queryByRole("button", { name: /^Delete icon scale/ }),
    ).toBeNull();
    await expect(
      card.getByText(
        "Workflow publishes one icon size per Typography type step.",
      ),
    ).toBeInTheDocument();
    canvasElement.dataset.playComplete = "true";
  },
};

export const AddScale: Story = {
  name: "Add an icon scale",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Add icon scale" }),
    );
    await waitFor(() =>
      expect(
        canvasElement.querySelectorAll('[data-component="DimensionScaleCard"]'),
      ).toHaveLength(2),
    );
    canvasElement.dataset.playComplete = "true";
  },
};

export const ReadOnly: Story = {
  name: "Read only",
  render: () => <Fixture editing={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Add icon scale" }),
    ).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};

export const Narrow: Story = {
  name: "Narrow panel",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
