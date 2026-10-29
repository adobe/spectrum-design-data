// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { FoundationsTypographyPanel } from "./FoundationsTypographyPanel";
import { editModeAtom } from "../../state/view/editMode";
import { DeletionToastProvider } from "../../components/DeletionToastProvider";

function Fixture({ editing = true }: { editing?: boolean }) {
  const [store] = useState(() => {
    const value = createStore();
    value.set(editModeAtom, editing);
    return value;
  });
  return (
    <Provider store={store}>
      <DeletionToastProvider>
        <div style={{ width: "100%", maxWidth: 340 }}>
          <FoundationsTypographyPanel />
        </div>
      </DeletionToastProvider>
    </Provider>
  );
}
const meta = {
  title: "Panels/Typography foundation",
  component: FoundationsTypographyPanel,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof FoundationsTypographyPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const InitialSections: Story = {
  name: "Five sections with Font sizes open",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Font sizes" }),
    ).toHaveAttribute("aria-expanded", "true");
    for (const title of [
      "System settings",
      "Mode sets",
      "Line heights",
      "Iconography",
    ]) {
      await expect(canvas.getByRole("button", { name: title })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    }
    await expect(canvas.queryByRole("button", { name: /^Formula/ })).toBeNull();
    await expect(canvas.queryByText("Component size")).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};
export const UsedCardReplacement: Story = {
  name: "Used line height requires replacement",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("button", { name: "Line heights" }));
    await waitFor(() =>
      expect(
        canvas.getByRole("region", { name: "body line height" }),
      ).toBeVisible(),
    );
    const original = within(
      canvas.getByRole("region", { name: "body line height" }),
    );
    await userEvent.click(
      original.getByRole("button", { name: "Adaptive settings" }),
    );
    await userEvent.clear(original.getByRole("textbox", { name: "Name" }));
    await userEvent.type(
      original.getByRole("textbox", { name: "Name" }),
      "Reading",
    );
    await userEvent.tab();
    const renamed = within(
      canvas.getByRole("region", { name: "Reading line height" }),
    );
    await expect(
      renamed.getByRole("button", { name: "Adaptive settings" }),
    ).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete Reading line height" }),
    );
    await waitFor(() => expect(body.getByRole("dialog")).toBeVisible());
    await expect(
      body.getByText("Used by: Elements text sample."),
    ).toBeVisible();
    await expect(
      body.getByRole("button", { name: "Replace and delete" }),
    ).toBeDisabled();
    await userEvent.click(
      body.getByRole("button", { name: /Replacement line height/ }),
    );
    await userEvent.click(body.getByRole("option", { name: "heading" }));
    await userEvent.click(
      body.getByRole("button", { name: "Replace and delete" }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole("region", { name: "Reading line height" }),
      ).toBeNull(),
    );
    await expect(
      canvas.getByRole("region", { name: "heading line height" }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const UnitsAndPublishing: Story = {
  name: "Output units and publishing settings",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "System settings" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: /Output format/ }),
    );
    await userEvent.click(body.getByRole("option", { name: "px" }));
    await expect(
      canvas.getByRole("textbox", { name: "Base size (px)" }),
    ).toHaveValue("14");
    await expect(
      canvas.getByRole("textbox", { name: "Min text size (px)" }),
    ).toHaveValue("9");
    await expect(
      canvas.getByRole("textbox", { name: "Max text size (px)" }),
    ).toHaveValue("200");
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Hide from publishing" }),
    );
    await expect(
      canvas.getByRole("checkbox", { name: "Hide from publishing" }),
    ).toBeChecked();
    canvasElement.dataset.playComplete = "true";
  },
};
export const ReadOnly: Story = {
  name: "Read-only authoring",
  render: () => <Fixture editing={false} />,
};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const Narrow: Story = {
  name: "Narrow panel",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
