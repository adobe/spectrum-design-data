// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { Accordion } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { ColorRolesAccordionItem } from "./ColorRoles";
import { editModeAtom } from "../../state/view/editMode";
import { stylesDocumentAtom } from "../../features/styles/state";
import {
  NotificationContext,
  type Notify,
} from "../../components/notifications/notificationContext";
import "../../views/styles/Styles.css";

function Fixture({
  editing = true,
  empty = false,
}: {
  editing?: boolean;
  empty?: boolean;
}) {
  const [store] = useState(() => {
    const current = createStore();
    current.set(editModeAtom, true);
    if (empty)
      current.set(stylesDocumentAtom, {
        ...current.get(stylesDocumentAtom),
        colorRoles: [],
      });
    current.set(editModeAtom, editing);
    return current;
  });
  const [notifications] = useState<Notify>(() => ({
    added: (_kind, run) => run(),
    edit: (run) => run(),
    quietly: (run) => run(),
    remove: (request) => {
      request.run(store);
    },
    error: fn(),
    info: fn(),
    copied: fn(),
  }));
  return (
    <Provider store={store}>
      <NotificationContext.Provider value={notifications}>
        <div
          className={style({ backgroundColor: "layer-2" })}
          style={{ maxWidth: 360 }}
        >
          <Accordion
            size="M"
            density="spacious"
            allowsMultipleExpanded
            defaultExpandedKeys={["color-roles"]}
          >
            <ColorRolesAccordionItem />
          </Accordion>
        </div>
      </NotificationContext.Provider>
    </Provider>
  );
}
const meta = {
  title: "Panels/Styles/Color roles",
  component: Fixture,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Fixture>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Editing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await expect(canvas.getAllByRole("row")).toHaveLength(6);
    await expect(
      canvas.getAllByTestId("color-role-gradient")[0].style.backgroundImage,
    ).toContain("linear-gradient");
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit Negative" }),
    );
    await waitFor(() =>
      expect(body.getByRole("dialog", { name: "Edit Negative" })).toBeVisible(),
    );
    await expect(
      body.getByRole("button", { name: /Color scale/ }),
    ).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete Negative" }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole("row", { name: "Negative" }),
      ).not.toBeInTheDocument(),
    );
    await expect(canvas.getAllByRole("row")).toHaveLength(5);
    canvasElement.dataset.playComplete = "true";
  },
};
export const ReadOnly: Story = {
  name: "Read-only",
  args: { editing: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Delete Negative" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Add color role" }),
    ).not.toBeInTheDocument();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Empty: Story = {
  name: "No color roles",
  args: { empty: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("No color roles"),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
