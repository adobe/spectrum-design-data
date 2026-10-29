// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { createElementFixture } from "../../../tests/fixtures/structureElements";
import { resolveElements } from "../../features/structures/elementResolution";
import { resolveStructure } from "../../features/structures/resolution";
import { STRUCTURE_TERM_IDS } from "../../features/structures/vocabulary";
import { StructurePreview } from "./StructurePreview";

const fixture = createElementFixture();
function ControlledTemplate({
  populated = false,
  readOnly = false,
  verticalBar = false,
}: {
  populated?: boolean;
  readOnly?: boolean;
  verticalBar?: boolean;
}) {
  const [structure, setStructure] = useState(() => ({
    ...fixture.structure,
    elements: populated
      ? [
          fixture.create("workflowIcon", 101, true),
          fixture.create("uiIcon", 102, true),
          fixture.create("text", 103, true),
          fixture.create("visual", 104, true),
          {
            ...fixture.create("bar", 105, true),
            ...(verticalBar && { orientation: STRUCTURE_TERM_IDS.vertical }),
          },
        ]
      : [],
  }));
  const [selected, setSelected] = useState<string | null>(null);
  const elements = resolveElements(
    structure,
    fixture.references,
    fixture.rules,
  );
  return (
    <div
      style={{
        padding: 48,
        background:
          "var(--spectrum-pasteboard-background-color, var(--spectrum-gray-100))",
        minHeight: 240,
        minWidth: 240,
      }}
    >
      <StructurePreview
        name={structure.name}
        resolved={resolveStructure(structure, fixture.references)}
        elements={elements}
        taxonomy={fixture.taxonomy}
        selectedElementId={selected}
        onSelectElement={setSelected}
        onInsert={
          readOnly
            ? undefined
            : (kind, index) => {
                const element = fixture.create(
                  kind,
                  200 + structure.elements.length,
                );
                setStructure((before) => ({
                  ...before,
                  elements: [
                    ...before.elements.slice(0, index),
                    element,
                    ...before.elements.slice(index),
                  ],
                }));
                setSelected(element.id);
              }
        }
      />
      <p role="status">
        {structure.elements.length} template elements; 0 added tokens
      </p>
    </div>
  );
}
const meta = {
  title: "Views/Structure elements",
  component: ControlledTemplate,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ControlledTemplate>;
export default meta;
type Story = StoryObj<typeof meta>;
export const EmptyInsertion: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Add element at position 1" }),
    );
    await userEvent.click(
      await body.findByRole("menuitem", { name: /^text$/i }),
    );
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "1 template elements; 0 added tokens",
    );
    await expect(
      canvas.getByRole("button", { name: /^Text element 1$/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        canvas.getByRole("group", {
          name: "Element template structure preview",
        }),
      ).toHaveFocus(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const AllFive: Story = { args: { populated: true } };
export const VerticalBar: Story = {
  args: { populated: true, verticalBar: true },
};
export const ReadOnly: Story = { args: { populated: true, readOnly: true } };
export const Dark: Story = {
  args: { populated: true },
  globals: { colorScheme: "dark" },
};
