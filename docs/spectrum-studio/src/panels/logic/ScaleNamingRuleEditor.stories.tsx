// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import type { ScaleNamingRule } from "../../features/logic/model";
import { STANDARD_SCALE_NAMING_RULE } from "../../features/logic/scaleNaming";
import { ScaleNamingRuleEditor } from "./ScaleNamingRuleEditor";

function Controlled(args: {
  rule: ScaleNamingRule;
  onChange: (rule: ScaleNamingRule) => void;
}) {
  const [rule, setRule] = useState(args.rule);
  return (
    <ScaleNamingRuleEditor
      rule={rule}
      onChange={(next) => {
        setRule(next);
        args.onChange(next);
      }}
    />
  );
}
const meta = {
  title: "Panels/Scale naming rule",
  component: ScaleNamingRuleEditor,
  args: {
    rule: { ...STANDARD_SCALE_NAMING_RULE, id: "story-naming", locked: false },
    onChange: fn(),
  },
  render: (args) => <Controlled {...args} />,
  decorators: [
    (Story) => (
      <div
        style={{
          width: "min(480px, 100%)",
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScaleNamingRuleEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const GraySequence: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/25, 50, 75, 100, 200/)).toBeVisible();
    const input = canvas.getByRole("textbox", { name: "Above-base increment" });
    await userEvent.clear(input);
    await userEvent.type(input, "200");
    await userEvent.tab();
    await expect(canvas.getByText(/100, 300, 500/)).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const FixedBelow: Story = {
  args: {
    rule: {
      ...STANDARD_SCALE_NAMING_RULE,
      below: { kind: "fixed", increment: 25 },
    },
  },
};
export const InvalidRange: Story = {
  args: {
    rule: {
      ...STANDARD_SCALE_NAMING_RULE,
      below: { kind: "fixed", increment: 50 },
    },
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
