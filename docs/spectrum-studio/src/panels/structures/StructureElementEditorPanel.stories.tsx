// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { createElementFixture } from "../../../tests/fixtures/structureElements";
import { elementBindingId } from "../../features/structures/elements";
import {
  StructureElementEditorPanel,
  type StructureElementEditorPanelProps,
} from "./StructureElementEditorPanel";

const fixture = createElementFixture();
function ControlledPanel(args: StructureElementEditorPanelProps) {
  const [element, setElement] = useState(args.element);
  const [deleted, setDeleted] = useState(false);
  return (
    <div
      style={{
        width: 320,
        maxWidth: "100%",
        height: 650,
        position: "relative",
      }}
    >
      {deleted ? (
        <p role="status">Element deleted</p>
      ) : (
        <StructureElementEditorPanel
          {...args}
          element={element}
          onChange={(changes) => {
            args.onChange(changes);
            const reference = fixture.references.find(
              (reference) => reference.id === changes.referenceId,
            );
            setElement((current) => ({
              ...current,
              ...(changes.glyph && { glyph: changes.glyph }),
              ...(changes.orientation && { orientation: changes.orientation }),
              bindings: changes.slot
                ? [
                    ...current.bindings.filter(
                      (binding) => binding.slot !== changes.slot,
                    ),
                    ...(reference &&
                    (reference.family === "size" ||
                      reference.family === "typography")
                      ? [
                          {
                            id: elementBindingId(current.id, changes.slot),
                            slot: changes.slot,
                            $ref: reference.id,
                            family: reference.family,
                          },
                        ]
                      : []),
                  ]
                : current.bindings,
            }));
          }}
          onDelete={() => {
            args.onDelete();
            setDeleted(true);
          }}
        />
      )}
    </div>
  );
}
const meta = {
  title: "Panels/Structure element",
  component: StructureElementEditorPanel,
  args: {
    element: fixture.create("text", 10),
    references: fixture.references,
    isReadOnly: false,
    onChange: fn(),
    onDelete: fn(),
    onBack: fn(),
  },
  render: (args) => <ControlledPanel {...args} />,
} satisfies Meta<typeof StructureElementEditorPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TextBindings: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    const input = canvas.getByRole("combobox", { name: /^Font size/ });
    const font = fixture.references.find(
      (reference) =>
        reference.metricId === "font-size" && reference.index === 0,
    )!;
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, font.name);
    await expect(
      await body.findByRole("option", { name: font.name }),
    ).toBeVisible();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(args.onChange).toHaveBeenCalledWith({
      slot: "fontSize",
      referenceId: font.id,
    });
    await waitFor(() =>
      expect(
        canvasElement.querySelector(".tokenComboBoxPrefix .tokenNameTag"),
      ).not.toBeNull(),
    );
    await userEvent.click(canvas.getByRole("radio", { name: "Values" }));
    await waitFor(() => expect(input).toHaveValue(font.displayValue));
    canvasElement.dataset.playComplete = "true";
  },
};
export const Bar: Story = {
  args: { element: fixture.create("bar", 11, true) },
};
export const WorkflowIcon: Story = {
  args: { element: fixture.create("workflowIcon", 12) },
};
export const UiIcon: Story = {
  args: { element: fixture.create("uiIcon", 13) },
};
export const Visual: Story = {
  args: { element: fixture.create("visual", 14) },
};
export const ReadOnly: Story = {
  args: { element: fixture.create("text", 15, true), isReadOnly: true },
};
export const CustomDeletion: Story = {
  args: { hasCustomTargets: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete element" }),
    );
    const dialog = await body.findByRole("dialog");
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );
    await expect(args.onDelete).not.toHaveBeenCalled();
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete element" }),
    );
    await userEvent.click(
      within(await body.findByRole("dialog")).getByRole("button", {
        name: "Delete",
      }),
    );
    await expect(args.onDelete).toHaveBeenCalledOnce();
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Element deleted",
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const MissingReference: Story = {
  args: { element: fixture.create("text", 16, true), references: [] },
};
export const UnitlessLineHeight: Story = {
  args: { element: fixture.create("text", 17, true) },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
