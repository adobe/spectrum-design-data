// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Provider } from "@react-spectrum/s2";
import { useState } from "react";
import {
  ColorOutputControls,
  type ColorOutputControlsProps,
} from "./ColorOutputControls";
import { DEFAULT_COLOR_OUTPUT } from "../../features/color-system/outputSettings";

function ControlledControls(args: ColorOutputControlsProps) {
  const [value, setValue] = useState(args.value);
  return (
    <ColorOutputControls
      {...args}
      value={value}
      onChange={(next) => {
        args.onChange(next);
        setValue(next);
      }}
    />
  );
}

const meta = {
  title: "Panels/Color output settings",
  component: ColorOutputControls,
  parameters: { layout: "padded" },
  args: {
    value: { ...DEFAULT_COLOR_OUTPUT },
    onChange: fn(),
    isReadOnly: false,
  },
  decorators: [
    (Story) => (
      <Provider colorScheme="light">
        <div style={{ maxWidth: 480 }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
  render: (args) => <ControlledControls {...args} />,
} satisfies Meta<typeof ColorOutputControls>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WideOutput: Story = {
  name: "Wide output",
  args: {
    value: {
      authoringGamut: "display-p3",
      outputFormat: "rgb",
      mapOutputsToSrgb: false,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: /Color format$/ }),
    );
    await expect(body.getByRole("option", { name: "Hex" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(body.getByRole("option", { name: "HSL" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};
export const MappedRec2020: Story = {
  name: "Mapped Rec 2020",
  args: {
    value: {
      authoringGamut: "rec2020",
      outputFormat: "hex",
      mapOutputsToSrgb: true,
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Map outputs to sRGB" }),
    );
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Color format changed to RGB",
    );
    await expect(args.onChange).toHaveBeenCalledWith({
      authoringGamut: "rec2020",
      outputFormat: "rgb",
      mapOutputsToSrgb: false,
    });
  },
};
export const ReadOnly: Story = {
  name: "Read only",
  args: { isReadOnly: true },
};
export const NarrowDark: Story = {
  name: "Narrow dark",
  args: {
    value: {
      authoringGamut: "rec2020",
      outputFormat: "oklch",
      mapOutputsToSrgb: false,
    },
  },
  decorators: [
    (Story) => (
      <Provider colorScheme="dark">
        <div style={{ width: 280 }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
};
export const RejectedChange: Story = {
  name: "Rejected change",
  args: {
    onChange: fn(() => {
      throw new Error(
        "This setting cannot be saved because its source reference is unavailable.",
      );
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("button", { name: /Gamut$/ }));
    await userEvent.click(body.getByRole("option", { name: "Rec 2020" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "source reference is unavailable",
    );
    await expect(
      canvas.getByRole("button", { name: /Gamut$/ }),
    ).toHaveTextContent("sRGB");
  },
};
