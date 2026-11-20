// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { NotificationProvider } from "../components/notifications/NotificationProvider";
import { editModeAtom } from "../state/view/editMode";
import { interpolationsAtom } from "../features/logic/scaleTypeLibrary";
import Formulas from "./Formulas";

function Fixture({ isEditing = true, empty = false }) {
  const [store] = useState(() => {
    const store = createStore();
    store.set(editModeAtom, isEditing);
    if (empty) store.set(interpolationsAtom, []);
    return store;
  });
  return (
    <Provider store={store}>
      <NotificationProvider>
        <div style={{ height: 800, width: 1100 }}>
          <Formulas />
        </div>
      </NotificationProvider>
    </Provider>
  );
}

const meta = {
  title: "Pages/Formulas",
  component: Formulas,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof Formulas>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Libraries: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("tab", { name: "Progressions" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      canvas.getByRole("article", { name: "Type scale" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Add interpolation" }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole("tab", { name: "Interpolations" }));
    await expect(
      canvas.queryByRole("article", { name: "Type scale" }),
    ).toBeNull();
    await expect(
      canvas.getByRole("button", { name: "Add interpolation" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("tab", { name: "Progressions" }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Add formula", exact: true }),
    );
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      body.getByRole("menuitem", { name: "Custom expression" }),
    );
    await expect(
      canvas.getByRole("textbox", { name: "Name", exact: true }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Back to library" }),
    );
    await expect(
      canvas.getByRole("tab", { name: "Progressions" }),
    ).toHaveAttribute("aria-selected", "true");
    canvasElement.dataset.playComplete = "true";
  },
};

export const ReadOnly: Story = {
  render: () => <Fixture isEditing={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Add formula" }),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", { name: "View formula Type scale" }),
    );
    await expect(
      canvas.getByRole("button", { name: "Back to library" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Save changes" }),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", { name: "Back to library" }),
    );
    await userEvent.click(canvas.getByRole("tab", { name: "Interpolations" }));
    await expect(
      canvas.queryByRole("button", { name: "Add interpolation" }),
    ).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};

export const EmptyInterpolations: Story = {
  render: () => <Fixture empty />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Interpolations" }));
    await expect(canvas.getByText("No interpolations yet.")).toBeVisible();
    await expect(canvas.queryByRole("article")).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};
