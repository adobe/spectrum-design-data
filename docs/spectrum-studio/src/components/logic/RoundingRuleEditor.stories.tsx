// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import { createCondition, createRule } from "../../features/logic/model";
import { RoundingRuleEditor } from "./RoundingRuleEditor";

const condition = { ...createCondition(10, 2), id: "story-rounding-condition" };
const rule = { ...createRule(), id: "story-rounding", conditions: [condition] };
const surfaceStyles = style({
  backgroundColor: "layer-1",
  color: "neutral",
  minHeight: "[100vh]",
  padding: 16,
});
const meta = {
  title: "Components/Rounding rule editor",
  component: RoundingRuleEditor,
  args: { rule, onChange: fn(), onEditingChange: fn() },
  render: function Controlled(args) {
    const [value, setValue] = useState(args.rule);
    return (
      <RoundingRuleEditor
        {...args}
        rule={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
  decorators: [
    (Story) => (
      <div className={surfaceStyles} data-story-surface>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RoundingRuleEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("When value is less than 10, use rounding factor 2."),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit condition 1" }),
    );
    await expect(args.onEditingChange).toHaveBeenLastCalledWith(true);
    const threshold = canvas.getByRole("textbox", {
      name: /^Condition 1 threshold(?: |$)/,
    });
    await userEvent.clear(threshold);
    await userEvent.type(threshold, "20");
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(
      canvas.getByText("When value is less than 10, use rounding factor 2."),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit condition 1" }),
    );
    await userEvent.clear(
      canvas.getByRole("textbox", { name: /^Condition 1 threshold(?: |$)/ }),
    );
    await userEvent.type(
      canvas.getByRole("textbox", { name: /^Condition 1 threshold(?: |$)/ }),
      "20",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(
      canvas.getByText("When value is less than 20, use rounding factor 2."),
    ).toBeVisible();
    await expect(args.onEditingChange).toHaveBeenLastCalledWith(false);
    canvasElement.dataset.playComplete = "true";
  },
};
export const NoConditions: Story = {
  args: { rule: { ...rule, conditions: [] } },
};
export const NoRounding: Story = {
  args: { rule: { ...rule, defaultOutcome: { factor: 0 }, conditions: [] } },
};
export const ReadOnly: Story = { args: { isReadOnly: true } };
export const Dark: Story = { globals: { colorScheme: "dark" } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
};
