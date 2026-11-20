// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { NotificationProvider } from "../components/notifications/NotificationProvider";
import { createRule } from "../features/logic/model";
import { rulesAtom } from "../features/logic/library";
import { editModeAtom } from "../state/view/editMode";
import Rules from "./Rules";

function Fixture({ isEditing = true, empty = false }) {
  const [store] = useState(() => {
    const store = createStore();
    store.set(editModeAtom, isEditing);
    const fixtures = [
      createRule("conditional"),
      createRule("rounding"),
      createRule("generator"),
      createRule("scale-naming"),
    ].map((rule) => ({ ...rule, name: `Example ${rule.type}` }));
    const generator = createRule("tshirt-sizing");
    store.set(rulesAtom, [
      ...store
        .get(rulesAtom)
        .filter((rule) => !empty || rule.type !== "conditional"),
      ...(empty
        ? []
        : [...fixtures, { ...generator, name: "Legacy generator" }]),
    ]);
    return store;
  });
  return (
    <Provider store={store}>
      <NotificationProvider>
        <div style={{ height: 800, width: 1100 }}>
          <Rules />
        </div>
      </NotificationProvider>
    </Provider>
  );
}

const meta = {
  title: "Pages/Rules",
  component: Rules,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof Rules>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Types: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const [tab, type] of [
      ["Rounding", "rounding"],
      ["Naming", "scale-naming"],
      ["Generators", "generator"],
      ["Conditions", "conditional"],
    ]) {
      await userEvent.click(
        canvas.getByRole("tab", { name: tab, exact: true }),
      );
      await expect(
        canvas.getByRole("article", {
          name: `Example ${type}`,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole("article", {
          name: `Example ${type === "rounding" ? "conditional" : "rounding"}`,
          exact: true,
        }),
      ).toBeNull();
      if (type === "generator") {
        await expect(
          canvas.getByRole("article", { name: "Legacy generator" }),
        ).toBeVisible();
      }
      await userEvent.click(canvas.getByRole("button", { name: "Add rule" }));
      const body = within(canvasElement.ownerDocument.body);
      const dialog = within(body.getByRole("dialog"));
      await expect(
        dialog.getByRole("button", { name: /Type/ }),
      ).toHaveTextContent(
        type === "rounding"
          ? "Rounding"
          : type === "scale-naming"
            ? "Scale naming"
            : type === "generator"
              ? "Generator"
              : "Conditional",
      );
      await userEvent.click(
        dialog.getByRole("button", { name: "Cancel", exact: true }),
      );
    }
    canvasElement.dataset.playComplete = "true";
  },
};

export const ChangedType: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Naming" }));
    await userEvent.click(canvas.getByRole("button", { name: "Add rule" }));
    const body = within(canvasElement.ownerDocument.body);
    const dialog = within(body.getByRole("dialog"));
    await userEvent.clear(
      dialog.getByRole("textbox", { name: "Name", exact: true }),
    );
    await userEvent.type(
      dialog.getByRole("textbox", { name: "Name", exact: true }),
      "New rounding",
    );
    await userEvent.click(dialog.getByRole("button", { name: /Type/ }));
    await userEvent.click(
      body.getByRole("option", { name: "Rounding", exact: true }),
    );
    await userEvent.click(
      dialog.getByRole("button", { name: "Save", exact: true }),
    );
    await expect(canvas.getByRole("tab", { name: "Rounding" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      canvas.getByRole("article", { name: "New rounding" }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

export const EmptyConditions: Story = {
  render: () => <Fixture empty />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Conditions" }));
    await expect(canvas.getByText("No rules yet.")).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

export const ReadOnly: Story = {
  render: () => <Fixture isEditing={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button", { name: "Add rule" })).toBeNull();
    await expect(
      canvas.getByRole("article", { name: "Example rounding" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /^Edit rule/ }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole("tab", { name: "Generators" }));
    await expect(
      canvas.getByRole("article", { name: "Legacy generator" }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
