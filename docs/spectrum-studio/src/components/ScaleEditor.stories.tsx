// Copyright 2026 Adobe. All rights reserved.
import { NumberField, Provider, TextField } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import {
  NumericScaleRamp,
  ScaleEditor,
  type ScaleEditorProps,
} from "./ScaleEditor";

const values = [
  1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120, 144,
];

const meta = {
  title: "Components/Scale editor",
  component: ScaleEditor,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 280, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    name: "Layout",
    label: "Layout spacing scale",
    preview: <NumericScaleRamp values={values} />,
    children: <TextField label="Scale name" defaultValue="Layout" />,
  },
} satisfies Meta<typeof ScaleEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledEditor(args: ScaleEditorProps) {
  const [name, setName] = useState(args.name);
  const [count, setCount] = useState(values.length);
  return (
    <ScaleEditor
      {...args}
      name={name}
      label={`${name} spacing scale`}
      preview={<NumericScaleRamp values={values.slice(0, count)} />}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TextField label="Scale name" value={name} onChange={setName} />
        <NumberField
          label="Number of values"
          value={count}
          onChange={setCount}
          minValue={1}
          maxValue={values.length}
        />
      </div>
    </ScaleEditor>
  );
}

export const Default: Story = {
  render: (args) => <ControlledEditor {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", {
      name: "Layout spacing scale",
    });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(
        body.getByRole("dialog", { name: "Layout spacing scale" }),
      ).toBeVisible(),
    );
    const field = body.getByRole("textbox", { name: "Scale name" });
    await userEvent.clear(field);
    await userEvent.type(field, "Compact");
    const count = body.getByRole("textbox", { name: "Number of values" });
    await userEvent.clear(count);
    await userEvent.type(count, "1");
    await userEvent.tab();
    await waitFor(() =>
      expect(
        canvasElement.querySelectorAll(".numericScaleRampBar"),
      ).toHaveLength(1),
    );
    await userEvent.click(field);
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Compact spacing scale" }),
      ).toHaveFocus(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};

export const Dark: Story = {
  render: (args) => (
    <Provider colorScheme="dark" UNSAFE_className="spectrum spectrum--dark">
      <div className={style({ backgroundColor: "base", padding: 16 })}>
        <ControlledEditor {...args} />
      </div>
    </Provider>
  ),
};

export const NarrowLongName: Story = {
  name: "Narrow long name",
  args: { name: "Compact-layout-spacing-for-small-screens" },
  decorators: [
    (Story) => (
      <div style={{ width: 220 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <ControlledEditor {...args} />,
};

export const SingleValue: Story = {
  name: "Single value",
  args: { preview: <NumericScaleRamp values={[1]} /> },
};

export const Empty: Story = {
  args: { preview: <NumericScaleRamp values={[]} /> },
};

export const InvalidValues: Story = {
  name: "Invalid values",
  args: { preview: <NumericScaleRamp values={[-1, NaN, Infinity, 0, 8]} /> },
};
