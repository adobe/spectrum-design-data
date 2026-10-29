// Copyright 2026 Adobe. All rights reserved.
import RectangleHoriz from "@react-spectrum/s2/icons/RectangleHoriz";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import {
  TokenComboBox,
  type TokenComboBoxOption,
  type TokenComboBoxProps,
} from "./TokenComboBox";

const options: TokenComboBoxOption[] = [
  { id: "hug", kind: "preset", name: "Hug", displayValue: "Hug" },
  { id: "fill", kind: "preset", name: "Fill", displayValue: "Fill" },
  {
    id: "size-a",
    kind: "token",
    name: "size-global-100",
    displayValue: "24px",
  },
  {
    id: "size-b",
    kind: "token",
    name: "size-global-200",
    displayValue: "48px",
    hidden: true,
  },
  {
    id: "size-invalid",
    kind: "token",
    name: "size-invalid-100",
    displayValue: "Unavailable",
    error: "This token cannot resolve to a valid length.",
  },
];
function ControlledField(args: TokenComboBoxProps) {
  const [selected, setSelected] = useState(args.selectedKey);
  return (
    <TokenComboBox
      {...args}
      selectedKey={selected}
      onChange={(id) => {
        setSelected(id);
        args.onChange(id);
      }}
    />
  );
}
const meta = {
  title: "Components/Token ComboBox",
  component: TokenComboBox,
  args: {
    label: "Default size",
    prefix: <RectangleHoriz />,
    options,
    selectedKey: "size-a",
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 260, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <ControlledField {...args} />,
} satisfies Meta<typeof TokenComboBox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const input = canvas.getByRole("combobox", {
      name: /^Default size(?: |$)/,
    });
    await expect(canvas.getByTitle("size-global-100")).toBeVisible();
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, "size-global-200");
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(
      await body.findByRole("option", { name: "size-global-200" }),
    ).toBeVisible();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith("size-b"));
    await userEvent.tab();
    await expect(canvas.getByTitle("size-global-200")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear Default size" }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(null);
    canvasElement.dataset.playComplete = "true";
  },
};
export const Preset: Story = { args: { selectedKey: "hug" } };
export const TokensOnly: Story = {
  name: "Without system presets",
  args: { options: options.filter((option) => option.kind === "token") },
};
export const Values: Story = {
  name: "Show values",
  args: { displayMode: "values" },
};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const Disabled: Story = { args: { isDisabled: true } };
export const Empty: Story = { args: { options: [], selectedKey: null } };
export const Invalid: Story = { args: { selectedKey: "size-invalid" } };
export const Missing: Story = {
  name: "Unavailable reference",
  args: { selectedKey: "removed" },
};
export const FilteredSelection: Story = {
  name: "Incompatible selection retained",
  args: {
    selectedKey: "size-b",
    isOptionAllowed: (option) => option.id !== "size-b",
    error: "The selected size exceeds the maximum in this preview.",
  },
};
export const NarrowLongName: Story = {
  name: "Narrow long name",
  args: {
    options: [
      {
        id: "long",
        kind: "token",
        name: "size-container-layout-for-small-screens-100",
        displayValue: "32px",
      },
    ],
    selectedKey: "long",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 140 }}>
        <Story />
      </div>
    ),
  ],
};
export const CompactRequired: Story = {
  name: "Compact required size",
  args: { prefix: "W", ariaLabel: "Default size width", isRequired: true },
  decorators: [
    (Story) => (
      <div style={{ width: 124 }}>
        <Story />
      </div>
    ),
  ],
};
export const CustomMenuWidth: Story = {
  args: { menuWidth: 300 },
  decorators: [
    (Story) => (
      <div style={{ width: 140 }}>
        <Story />
      </div>
    ),
  ],
};

function LiteralField(args: TokenComboBoxProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [value, setValue] = useState("4px");
  return (
    <>
      <TokenComboBox
        {...args}
        selectedKey={selected}
        onChange={(id) => {
          setSelected(id);
          args.onChange(id);
        }}
        customValue={{
          displayValue: value,
          onAccept: (text) => {
            if (!/^\d+px$/.test(text))
              throw new Error("Enter a non-negative pixel length.");
            setSelected(null);
            setValue(text);
          },
        }}
      />
      <output aria-label="Accepted value">{selected ?? value}</output>
    </>
  );
}
export const LiteralAndReference: Story = {
  name: "Explicit literal and reference",
  args: {
    label: "Value",
    selectedKey: null,
    options: options.filter((option) => option.kind === "token"),
  },
  render: (args) => <LiteralField {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    const input = canvas.getByRole("combobox", { name: "Value" });
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, "8px");
    await userEvent.tab();
    await expect(canvas.getByLabelText("Accepted value")).toHaveTextContent(
      "4px",
    );
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, "8px");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() =>
      expect(canvas.getByLabelText("Accepted value")).toHaveTextContent("8px"),
    );
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, "invalid");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(
      await body.findByText("Enter a non-negative pixel length."),
    ).toBeVisible();
    await expect(canvas.getByLabelText("Accepted value")).toHaveTextContent(
      "8px",
    );
    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveValue("8px");
    await userEvent.clear(input);
    await userEvent.type(input, "size-global-100");
    await userEvent.click(
      await body.findByRole("option", { name: "size-global-100" }),
    );
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith("size-a"));
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, "24px");
    await userEvent.click(
      await body.findByRole("option", { name: "Use this value" }),
    );
    await waitFor(() =>
      expect(canvas.getByLabelText("Accepted value")).toHaveTextContent("24px"),
    );
    await userEvent.tab();
    await expect(canvas.getByLabelText("Accepted value")).toHaveTextContent(
      "24px",
    );
    await waitFor(() =>
      expect(body.queryByRole("listbox")).not.toBeInTheDocument(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
