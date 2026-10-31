// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import { NotificationProvider } from "../../components/notifications/NotificationProvider";
import { emptyGeneratorEdit } from "../../features/logic/generatorEdit";
import { createRule, createTshirtMappings } from "../../features/logic/model";
import { SIZE_TERM_IDS } from "../../features/taxonomy/variantVocabulary";
import { primitiveReferenceId } from "../../features/tokens/primitiveIdentity";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";
import {
  TshirtSizingRuleEditor,
  type TshirtSizingRuleEditorProps,
} from "./TshirtSizingRuleEditor";

const rule = {
  ...createRule("generator"),
  id: "rule-story-tshirt",
  name: "Adjacent sizes",
};
const surfaceStyles = style({
  backgroundColor: "layer-1",
  minHeight: "[100vh]",
  padding: 16,
});
const editorStyles = style({
  width: "full",
  maxWidth: "[680px]",
  marginX: "auto",
});
const references: PrimitiveReference[] = Array.from(
  { length: 8 },
  (_, index) => ({
    id: primitiveReferenceId("spacing", "story-spacing", index),
    family: "spacing",
    sourceId: "story-spacing",
    sourceName: "Global",
    index,
    step: (index + 1) * 100,
    nativeId: `spacing-story-${(index + 1) * 100}`,
    name: `global-spacing-${(index + 1) * 100}`,
    value: 4 + index * 4,
    displayValue: `${4 + index * 4}px`,
    hidden: false,
  }),
);
function ControlledEditor(args: TshirtSizingRuleEditorProps) {
  const [current, setCurrent] = useState(args.rule);
  const [edit, setEdit] = useState(emptyGeneratorEdit);
  return (
    <TshirtSizingRuleEditor
      {...args}
      rule={current}
      edit={edit}
      onEditChange={setEdit}
      onChange={(next) => {
        setCurrent(next);
        args.onChange(next);
      }}
    />
  );
}
const meta = {
  title: "Panels/Generator rule",
  component: TshirtSizingRuleEditor,
  args: { rule, references, onChange: fn() },
  render: (args) => <ControlledEditor {...args} />,
  decorators: [
    (Story) => (
      <NotificationProvider>
        <div className={surfaceStyles}>
          <div className={editorStyles}>
            <Story />
          </div>
        </div>
      </NotificationProvider>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TshirtSizingRuleEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    const input = canvas.getByRole("combobox", {
      name: "Default value",
    });
    await userEvent.click(input);
    await userEvent.type(input, "500");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    const grid = within(
      await canvas.findByRole("grid", { name: "Generator preview" }),
    );
    await waitFor(() =>
      expect(grid.getByText("global-spacing-300")).toBeVisible(),
    );
    await waitFor(() =>
      expect(grid.getByText("global-spacing-700")).toBeVisible(),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: /Move along the scale by$/ }),
    );
    await userEvent.click(
      body.getByRole("option", { name: "Numeric scale index" }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ movement: "scale-index" }),
    );
    const medium = canvas.getByRole("textbox", {
      name: /^Medium token offset(?: |$)/,
    });
    await expect(medium).toHaveAttribute("readonly");
    canvasElement.dataset.playComplete = "true";
  },
};
export const NumericIndices: Story = {
  args: {
    rule: {
      ...rule,
      movement: "scale-index",
      mappings: createTshirtMappings("scale-index"),
    },
  },
};
export const KeyboardOffsets: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const offset = canvas.getByRole("textbox", {
      name: /^Small token offset(?: |$)/,
    });
    offset.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(args.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mappings: expect.arrayContaining([
          { termId: SIZE_TERM_IDS.s, offset: -2 },
        ]),
      }),
    );
    await expect(
      canvas.getByRole("textbox", { name: /^Medium token offset(?: |$)/ }),
    ).toHaveAttribute("readonly");
    canvasElement.dataset.playComplete = "true";
  },
};
export const NearestTargets: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("combobox", {
      name: "Default value",
    });
    await userEvent.click(input);
    await userEvent.type(input, "100");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(
      await canvas.findAllByText("Nearest available token"),
    ).toHaveLength(2);
    canvasElement.dataset.playComplete = "true";
  },
};
export const HiddenSources: Story = {
  args: {
    references: references.map((reference) => ({ ...reference, hidden: true })),
  },
};
export const InvalidOffsets: Story = {
  args: {
    rule: {
      ...rule,
      mappings: rule.mappings.map((mapping) =>
        mapping.termId === SIZE_TERM_IDS.s
          ? { ...mapping, offset: NaN }
          : mapping,
      ),
    },
  },
};
export const ReadOnly: Story = { args: { isReadOnly: true } };
export const NoSources: Story = { args: { references: [] } };
export const CustomOptions: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add option" }));
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("menuitem", {
        name: "New Size option",
      }),
    );
    const names = canvas.getAllByRole("textbox", { name: "Name" });
    await userEvent.type(names.at(-1)!, "Jumbo size");
    await expect(names.at(-1)).toHaveValue("Jumbo size");
    await userEvent.click(
      canvas.getByRole("button", { name: "Use Small as default" }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ defaultTermId: SIZE_TERM_IDS.s }),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};
