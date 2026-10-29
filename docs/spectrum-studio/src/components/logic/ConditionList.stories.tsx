// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import {
  createCondition,
  type Condition,
  type RoundingOutcome,
} from "../../features/logic/model";
import { ConditionList } from "./ConditionList";

function ControlledConditionList({
  initialConditions,
  unreachableIds = [],
  isReadOnly = false,
}: {
  initialConditions: Condition<RoundingOutcome>[];
  unreachableIds?: string[];
  isReadOnly?: boolean;
}) {
  const [conditions, setConditions] = useState(initialConditions);
  return (
    <ConditionList
      conditions={conditions}
      onChange={setConditions}
      unreachableIds={unreachableIds}
      isReadOnly={isReadOnly}
    />
  );
}

const conditions = [
  { ...createCondition(2, 1), id: "small" },
  { ...createCondition(10, 2), id: "medium" },
];

const meta = {
  title: "Components/Rule condition list",
  component: ConditionList,
  parameters: { layout: "padded" },
  args: { conditions, onChange: fn() },
} satisfies Meta<typeof ConditionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OrderedConditions: Story = {
  render: () => <ControlledConditionList initialConditions={conditions} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Move condition 2 up" }),
    );
    const items = canvas.getAllByRole("listitem");
    await expect(items[0]).toHaveAttribute("aria-label", "Condition 1");
    await expect(
      canvas.getByRole("button", { name: "Move condition 1 down" }),
    ).toBeEnabled();
  },
};

export const UnreachableCondition: Story = {
  render: () => (
    <ControlledConditionList
      initialConditions={conditions}
      unreachableIds={["medium"]}
    />
  ),
};

export const ReadOnly: Story = {
  render: () => (
    <ControlledConditionList initialConditions={conditions} isReadOnly />
  ),
};
