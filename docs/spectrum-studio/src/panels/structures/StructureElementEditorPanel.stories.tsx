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
  return (
    <div
      style={{
        width: 320,
        maxWidth: "100%",
        height: 650,
        position: "relative",
      }}
    >
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
      />
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
    report: fn(),
    onChange: fn(),
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Structure settings" }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("heading", { name: /^visual$/i }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("button", { name: "Delete element" }),
    ).toBeNull();
    await expect(canvas.getByRole("combobox", { name: "Width" })).toBeVisible();
    await expect(
      canvas.getByRole("combobox", { name: "Height" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Constraints" }));
    for (const name of [
      "Minimum width",
      "Minimum height",
      "Maximum width",
      "Maximum height",
    ])
      await expect(canvas.getByRole("combobox", { name })).toBeVisible();
    await expect(
      canvas.queryByRole("combobox", { name: "Font size" }),
    ).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};
export const ReadOnly: Story = {
  args: { element: fixture.create("text", 15, true), isReadOnly: true },
};
export const MissingReference: Story = {
  args: { element: fixture.create("text", 16, true), references: [] },
};
export const UnitlessLineHeight: Story = {
  args: { element: fixture.create("text", 17, true) },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
