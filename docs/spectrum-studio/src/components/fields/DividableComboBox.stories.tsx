// Copyright 2026 Adobe. All rights reserved.
import RectangleHoriz from "@react-spectrum/s2/icons/RectangleHoriz";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import {
  DividableComboBox,
  type DividableComboBoxProps,
} from "./DividableComboBox";

function ControlledFields(args: DividableComboBoxProps) {
  const [fields, setFields] = useState(args.fields);
  return (
    <DividableComboBox
      {...args}
      fields={fields}
      onSharedChange={(id) => {
        setFields((current) => [
          { ...current[0], selectedKey: id },
          { ...current[1], selectedKey: id },
          { ...current[2], selectedKey: id },
          { ...current[3], selectedKey: id },
        ]);
        args.onSharedChange(id);
      }}
      onIndividualChange={(index, id) => {
        setFields((current) => [
          index === 0 ? { ...current[0], selectedKey: id } : current[0],
          index === 1 ? { ...current[1], selectedKey: id } : current[1],
          index === 2 ? { ...current[2], selectedKey: id } : current[2],
          index === 3 ? { ...current[3], selectedKey: id } : current[3],
        ]);
        args.onIndividualChange(index, id);
      }}
    />
  );
}
const fields: DividableComboBoxProps["fields"] = [
  {
    label: "Top padding",
    prefix: <RectangleHoriz />,
    selectedKey: "spacing-a",
  },
  {
    label: "Right padding",
    prefix: <RectangleHoriz />,
    selectedKey: "spacing-a",
  },
  {
    label: "Bottom padding",
    prefix: <RectangleHoriz />,
    selectedKey: "spacing-a",
  },
  {
    label: "Left padding",
    prefix: <RectangleHoriz />,
    selectedKey: "spacing-a",
  },
];
const meta = {
  title: "Components/Dividable ComboBox",
  component: DividableComboBox,
  args: {
    label: "Padding",
    prefix: <RectangleHoriz />,
    fields,
    options: [
      {
        id: "spacing-a",
        kind: "token",
        name: "spacing-global-100",
        displayValue: "8px",
      },
      {
        id: "spacing-b",
        kind: "token",
        name: "spacing-compact-100",
        displayValue: "8px",
        hidden: true,
      },
    ],
    onSharedChange: fn(),
    onIndividualChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <ControlledFields {...args} />,
} satisfies Meta<typeof DividableComboBox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const toggle = canvas.getByRole("button", {
      name: "Use individual padding values",
    });
    await userEvent.click(toggle);
    await expect(
      canvas.getByRole("combobox", { name: /^Padding(?: |$)/ }),
    ).toBeDisabled();
    const top = canvas.getByRole("combobox", { name: /^Top padding(?: |$)/ });
    await userEvent.click(top);
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(
        body.getByRole("option", { name: "spacing-global-100" }),
      ).toBeVisible(),
    );
    await waitFor(() =>
      expect(
        body.getByRole("option", { name: "spacing-compact-100" }),
      ).toBeVisible(),
    );
    await expect(args.onIndividualChange).not.toHaveBeenCalled();
    await userEvent.clear(top);
    await userEvent.type(top, "spacing-compact");
    await userEvent.click(
      await body.findByRole("option", { name: "spacing-compact-100" }),
    );
    await expect(args.onIndividualChange).toHaveBeenCalledWith(0, "spacing-b");
    await userEvent.click(toggle);
    await expect(
      canvas.getByRole("combobox", { name: /^Padding(?: |$)/ }),
    ).toHaveAttribute("placeholder", "Mixed");
    await expect(args.onSharedChange).not.toHaveBeenCalled();
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(
        canvas.getByRole("group", { name: "Individual padding" }),
      ).toBeVisible(),
    );
    const topField = canvas
      .getByRole("combobox", { name: /^Top padding(?: |$)/ })
      .closest('[data-component="TokenComboBox"]')!;
    await expect(
      within(topField as HTMLElement).getByTitle("spacing-compact-100"),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Mixed: Story = {
  name: "Equal values with different references",
  args: {
    fields: [
      { ...fields[0], selectedKey: "spacing-b" },
      fields[1],
      fields[2],
      fields[3],
    ],
  },
};
export const Empty: Story = {
  args: {
    fields: [
      { ...fields[0], selectedKey: null },
      { ...fields[1], selectedKey: null },
      { ...fields[2], selectedKey: null },
      { ...fields[3], selectedKey: null },
    ],
  },
};
export const Disabled: Story = { args: { isDisabled: true } };
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 220 }}>
        <Story />
      </div>
    ),
  ],
};
export const Invalid: Story = {
  args: {
    fields: [
      { ...fields[0], error: "The linked spacing token is unavailable." },
      fields[1],
      fields[2],
      fields[3],
    ],
  },
};
