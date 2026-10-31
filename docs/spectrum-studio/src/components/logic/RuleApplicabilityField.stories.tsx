// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import type { RuleApplicability } from "../../features/logic/applicability";
import { RuleApplicabilityField } from "./RuleApplicabilityField";

const surfaceStyles = style({
  backgroundColor: "layer-1",
  color: "neutral",
  minHeight: "[100vh]",
  padding: 16,
});
const meta = {
  title: "Components/Rule token value types",
  component: RuleApplicabilityField,
  args: {
    rule: { type: "generator", applicability: { kind: "all" } },
    onChange: fn(),
  },
  render: function Controlled(args) {
    const [selection, setSelection] = useState<RuleApplicability>(
      args.rule.applicability ?? { kind: "all" },
    );
    return (
      <RuleApplicabilityField
        {...args}
        rule={{ ...args.rule, applicability: selection }}
        onChange={(value) => {
          setSelection(value);
          args.onChange(value);
        }}
      />
    );
  },
  decorators: [
    (Story) => (
      <div className={surfaceStyles}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RuleApplicabilityField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Add token value type" }),
    );
    await userEvent.click(body.getByRole("menuitem", { name: "Radius" }));
    await expect(args.onChange).toHaveBeenLastCalledWith({
      kind: "specific",
      types: ["radius"],
    });
    await userEvent.click(canvas.getByRole("row", { name: /Radius/ }));
    await userEvent.keyboard("{Delete}");
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Choose at least one token value type.",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Add token value type" }),
    );
    await userEvent.click(body.getByRole("menuitem", { name: "All" }));
    await expect(args.onChange).toHaveBeenLastCalledWith({ kind: "all" });
    canvasElement.dataset.playComplete = "true";
  },
};
export const Empty: Story = {
  args: {
    rule: { type: "rounding", applicability: { kind: "specific", types: [] } },
  },
};
export const ColorAndOpacity: Story = {
  args: {
    rule: {
      type: "conditional",
      applicability: { kind: "specific", types: ["color", "opacity"] },
    },
  },
};
export const ReadOnly: Story = { args: { isReadOnly: true } };
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
