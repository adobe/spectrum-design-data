// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { designSystemDefaults } from "../../../data/defaults";
import { conditionSources } from "../../../features/logic/conditional";
import {
  INTERACTION_COLORS_RULE_ID,
  type ConditionalRule,
} from "../../../features/logic/model";
import {
  ConditionalRuleBuilder,
  type ConditionalRuleBuilderProps,
} from "./ConditionalRuleBuilder";

const example = designSystemDefaults.system.rules.find(
  (rule): rule is ConditionalRule =>
    rule.id === INTERACTION_COLORS_RULE_ID && rule.type === "conditional",
)!;
const sources = conditionSources(
  designSystemDefaults.system.taxonomy,
  designSystemDefaults.system.modeSets,
);
const storyStyles = style({
  maxWidth: 840,
  width: "full",
  minWidth: 0,
  padding: 16,
  boxSizing: "border-box",
  backgroundColor: "base",
  color: "neutral",
});
const narrowStyles = style({ maxWidth: 360, width: "full", minWidth: 0 });

function Controlled(props: ConditionalRuleBuilderProps) {
  const [rule, setRule] = useState(props.rule);
  return (
    <ConditionalRuleBuilder
      {...props}
      rule={rule}
      onChange={(next) => {
        setRule(next);
        props.onChange(next);
      }}
    />
  );
}
const meta = {
  title: "Components/Conditional rule builder",
  component: ConditionalRuleBuilder,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className={storyStyles}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <Controlled {...args} />,
  args: { rule: example, sources, onChange: fn(), onEditingChange: fn() },
} satisfies Meta<typeof ConditionalRuleBuilder>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InteractionStateColors: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Otherwise", { exact: true })).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit Attribute is Background" }),
    );
    const editor = canvas.getByRole("group", { name: "Edit statement" });
    await expect(editor).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit Interaction is Hover" }),
    );
    await expect(editor).toBeVisible();
    await expect(args.onChange).not.toHaveBeenCalled();
    await userEvent.click(
      within(editor).getByRole("button", { name: "Cancel" }),
    );
    await expect(
      canvas.getByRole("button", { name: "Edit Attribute is Background" }),
    ).toHaveFocus();
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit then offset" }),
    );
    const offsetEditor = within(
      canvas.getByRole("group", { name: "Edit statement" }),
    );
    const input = offsetEditor.getByRole("textbox", { name: "Token offset" });
    await userEvent.clear(input);
    await userEvent.type(input, "-2");
    await userEvent.click(offsetEditor.getByRole("button", { name: "Save" }));
    await expect(args.onChange).toHaveBeenCalled();
    await expect(canvas.getByText(/offset token by -2/)).toBeVisible();
    canvasElement.setAttribute("data-play-complete", "true");
  },
};
export const Simple: Story = {
  args: {
    rule: {
      ...example,
      when: { ...example.when, children: [example.when.children[0]] },
      branches: [],
    },
  },
};
export const Empty: Story = {
  args: {
    rule: { ...example, when: { ...example.when, children: [] }, branches: [] },
  },
};
export const ReadOnly: Story = { args: { isReadOnly: true } };
export const UnavailableReference: Story = {
  args: {
    sources: sources.filter(
      (source) => source.id !== "ca732a26-decb-4746-9afc-3567ec0d445e",
    ),
  },
};
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className={narrowStyles}>
        <Story />
      </div>
    ),
  ],
};
export const LongNames: Story = {
  args: {
    sources: sources.map((source) =>
      source.kind === "taxonomy"
        ? {
            ...source,
            label: `${source.label} with a longer descriptive category name`,
          }
        : source,
    ),
  },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
