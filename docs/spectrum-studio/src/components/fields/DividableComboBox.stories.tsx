// Copyright 2026 Adobe. All rights reserved.
import RectangleHoriz from "@react-spectrum/s2/icons/RectangleHoriz";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { NotificationProvider } from "../notifications/NotificationProvider";
import { normalizeNumericEntry, numericEntryValue } from "./tokenEntry";
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
      <NotificationProvider>
        <div style={{ width: 280, maxWidth: "100%" }}>
          <Story />
        </div>
      </NotificationProvider>
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
function LiteralFields(args: DividableComboBoxProps) {
  const [values, setValues] = useState(["4px", "6px", "4px", "4px"]);
  const [selected, setSelected] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  function accept(text: string, index?: number) {
    const value = numericEntryValue(text, "px");
    if (value === undefined || value < 0)
      throw new Error("Enter a non-negative pixel length.");
    setValues((current) =>
      current.map((item, position) =>
        index === undefined || index === position ? `${value}px` : item,
      ),
    );
    setSelected((current) =>
      current.map((item, position) =>
        index === undefined || index === position ? null : item,
      ),
    );
  }
  return (
    <DividableComboBox
      {...args}
      normalizeValue={(text) => normalizeNumericEntry(text, "px")}
      fields={[
        {
          ...fields[0],
          selectedKey: selected[0],
          customValue: {
            displayValue: values[0],
            onAccept: (text) => accept(text, 0),
          },
        },
        {
          ...fields[1],
          selectedKey: selected[1],
          customValue: {
            displayValue: values[1],
            onAccept: (text) => accept(text, 1),
          },
        },
        {
          ...fields[2],
          selectedKey: selected[2],
          customValue: {
            displayValue: values[2],
            onAccept: (text) => accept(text, 2),
          },
        },
        {
          ...fields[3],
          selectedKey: selected[3],
          customValue: {
            displayValue: values[3],
            onAccept: (text) => accept(text, 3),
            isAllowed: (text) => {
              const value = numericEntryValue(text, "px");
              return value !== undefined && value <= 64;
            },
          },
        },
      ]}
      onSharedCustomValue={(text) => accept(text)}
      onSharedChange={(id) => {
        setSelected([id, id, id, id]);
        if (id === null) setValues(["", "", "", ""]);
      }}
      onIndividualChange={(index, id) => {
        setSelected((current) =>
          current.map((item, position) => (index === position ? id : item)),
        );
        if (id === null)
          setValues((current) =>
            current.map((item, position) => (index === position ? "" : item)),
          );
      }}
    />
  );
}
export const LiteralValues: Story = {
  render: (args) => <LiteralFields {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", {
      name: "Use individual padding values",
    });
    const top = canvas.getByRole("combobox", { name: "Top padding" });
    await expect(top).toHaveValue("4px");
    await expect(
      canvas.getByRole("combobox", { name: "Right padding" }),
    ).toHaveValue("6px");
    await userEvent.click(toggle);
    const shared = canvas.getByRole("combobox", { name: "Padding" });
    await expect(shared).toHaveAttribute("placeholder", "Mixed");
    await userEvent.click(shared);
    await userEvent.type(shared, "0px{Enter}");
    await userEvent.tab();
    await expect(shared).toHaveValue("0px");
    await userEvent.click(toggle);
    for (const label of ["Top", "Right", "Bottom", "Left"])
      await expect(
        canvas.getByRole("combobox", { name: `${label} padding` }),
      ).toHaveValue("0px");
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Top padding" }),
    );
    await userEvent.clear(
      canvas.getByRole("combobox", { name: "Top padding" }),
    );
    await userEvent.type(
      canvas.getByRole("combobox", { name: "Top padding" }),
      "8px{Enter}",
    );
    await userEvent.tab();
    await expect(
      canvas.getByRole("combobox", { name: "Top padding" }),
    ).toHaveValue("8px");
    await userEvent.click(toggle);
    await expect(shared).toHaveAttribute("placeholder", "Mixed");
    await userEvent.click(shared);
    await userEvent.type(shared, "96px{Enter}");
    await expect(shared).toHaveAttribute("aria-invalid", "true");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(toggle);
    await expect(
      canvas.getByRole("combobox", { name: "Top padding" }),
    ).toHaveValue("8px");
    await expect(
      canvas.getByRole("combobox", { name: "Left padding" }),
    ).toHaveValue("0px");
    canvasElement.dataset.playComplete = "true";
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
