// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { createElementFixture } from "../../../tests/fixtures/structureElements";
import {
  ELEMENT_TYPES,
  type ElementKind,
} from "../../features/structures/elements";
import {
  AddStructureElement,
  type AddStructureElementProps,
} from "./AddStructureElement";

const fixture = createElementFixture();
function ControlledPicker(args: AddStructureElementProps) {
  const [selected, setSelected] = useState("");
  return (
    <div style={{ padding: 32 }}>
      <AddStructureElement
        {...args}
        onInsert={(kind, index) => {
          args.onInsert(kind, index);
          setSelected(`${ELEMENT_TYPES[kind].label} at ${index + 1}`);
        }}
      />
      <p role="status">{selected}</p>
    </div>
  );
}
const meta = {
  title: "Views/Add Structure element",
  component: AddStructureElement,
  args: { taxonomy: fixture.taxonomy, index: 0, onInsert: fn() },
  render: (args) => <ControlledPicker {...args} />,
} satisfies Meta<typeof AddStructureElement>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pointer: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Add element at position 1" }),
    );
    await userEvent.click(
      await body.findByRole("menuitem", { name: /^text$/i }),
    );
    await expect(args.onInsert).toHaveBeenCalledWith("text", 0);
    await expect(canvas.getByRole("status")).toHaveTextContent("Text at 1");
    canvasElement.dataset.playComplete = "true";
  },
};
export const Keyboard: Story = {
  args: { index: 2 },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    const button = canvas.getByRole("button", {
      name: "Add element at position 3",
    });
    button.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body.getByRole("menu")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await expect(args.onInsert).not.toHaveBeenCalled();
    await waitFor(() => expect(button).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await userEvent.click(
      await body.findByRole("menuitem", { name: /^bar$/i }),
    );
    await expect(args.onInsert).toHaveBeenCalledWith(
      "bar" satisfies ElementKind,
      2,
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const MissingTypes: Story = {
  args: { taxonomy: { ...fixture.taxonomy, terms: [] } },
};
export const RenamedType: Story = {
  args: {
    taxonomy: {
      ...fixture.taxonomy,
      terms: fixture.taxonomy.terms.map((term) =>
        term.id === ELEMENT_TYPES.text.termId
          ? { ...term, value: "Copy sample" }
          : term,
      ),
    },
  },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
