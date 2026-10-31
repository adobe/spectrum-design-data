// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { ColorPickerContents } from "./ColorPickerContents";
import { ColorPickerDefaultsProvider } from "./ColorPickerDefaults";
import { Button } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ColorGamut } from "../../features/color-system/outputSettings";

const meta = {
  title: "Components/Color picker",
  component: ColorPickerContents,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    color: { control: "text" },
  },
  args: {
    color: "#707070",
    colorSpace: "sRGB",
    gamut: "sRGB",
    onChange: fn(),
  },
} satisfies Meta<typeof ColorPickerContents>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledPicker(
  args: React.ComponentProps<typeof ColorPickerContents>,
) {
  const [color, setColor] = useState(args.color);
  return (
    <div style={{ padding: 8 }}>
      <ColorPickerContents
        {...args}
        color={color}
        onChange={(nextColor, parsedColor) => {
          setColor(nextColor);
          args.onChange(nextColor, parsedColor);
        }}
      />
    </div>
  );
}

export const Default: Story = {
  render: (args) => <ControlledPicker {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("R × G", { exact: true })).toBeVisible();
  },
};

export const CompactToolbar: Story = {
  render: (args) => (
    <div className={style({ width: "full", maxWidth: 320 })}>
      <ControlledPicker {...args} />
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cartesian = canvas.getByRole("radio", { name: "Cartesian model" });
    await expect(cartesian).toBeChecked();
    await userEvent.click(cartesian);
    await expect(cartesian).toBeChecked();
    await userEvent.click(canvas.getByRole("radio", { name: "Polar model" }));
    await expect(cartesian).not.toBeChecked();
    await userEvent.click(canvas.getByRole("radio", { name: "Channels" }));
    await expect(canvas.getByRole("slider", { name: "Hue" })).toBeVisible();
    await userEvent.click(canvas.getByRole("radio", { name: "Color area" }));
    await expect(canvas.getByText("S × L", { exact: true })).toBeVisible();
    await expect(args.onChange).not.toHaveBeenCalled();
    canvasElement.dataset.playComplete = "true";
  },
};

export const DisplayP3: Story = {
  args: {
    color: "color(display-p3 1 0.2 0.1)",
    colorSpace: "Display P3",
    gamut: "Display-P3",
  },
  render: (args) => <ControlledPicker {...args} />,
};

export const OklchCartesian: Story = {
  args: {
    color: "oklch(70% 0.16 40deg)",
    colorSpace: "OKlch",
    gamut: "Display-P3",
    model: "cartesian",
  },
  render: (args) => <ControlledPicker {...args} />,
};

export const PolarModel: Story = {
  args: {
    color: "#4674d8",
  },
  render: (args) => <ControlledPicker {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "Polar model" }));
    await expect(canvas.getByText("S × L", { exact: true })).toBeVisible();
  },
};

export const InvalidInputFallback: Story = {
  args: {
    color: "not-a-color",
  },
  render: (args) => <ControlledPicker {...args} />,
};

export const WithoutGamutPicker: Story = {
  args: {
    showGamutPicker: false,
  },
  render: (args) => <ControlledPicker {...args} />,
};

export const SharedRec2020Defaults: Story = {
  name: "Shared Rec 2020 defaults",
  args: {
    color: "color(rec2020 0 1 0)",
    colorSpace: undefined,
    gamut: undefined,
  },
  render: (args) => (
    <ColorPickerDefaultsProvider gamut="rec2020">
      <ControlledPicker {...args} />
    </ColorPickerDefaultsProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /Gamut/ }),
    ).toHaveTextContent("Rec 2020");
    await expect(
      canvas.getByRole("radio", { name: "Polar model" }),
    ).toBeChecked();
    await expect(canvas.getByText("C × H", { exact: true })).toBeVisible();
  },
};

function ReopeningPicker(
  args: React.ComponentProps<typeof ColorPickerContents>,
) {
  const [gamut, setGamut] = useState<ColorGamut>("display-p3"),
    [open, setOpen] = useState(true);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Button onPress={() => setGamut("rec2020")}>Use Rec 2020 defaults</Button>
      <Button onPress={() => setOpen((value) => !value)}>
        {open ? "Close picker" : "Open picker"}
      </Button>
      <ColorPickerDefaultsProvider gamut={gamut}>
        {open && <ControlledPicker {...args} />}
      </ColorPickerDefaultsProvider>
    </div>
  );
}

export const DefaultsOnReopen: Story = {
  name: "Defaults on reopen",
  args: { colorSpace: undefined, gamut: undefined },
  render: (args) => <ReopeningPicker {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /Gamut/ }),
    ).toHaveTextContent("Display P3");
    await userEvent.click(
      canvas.getByRole("button", { name: "Use Rec 2020 defaults" }),
    );
    await expect(
      canvas.getByRole("button", { name: /Gamut/ }),
    ).toHaveTextContent("Display P3");
    await userEvent.click(canvas.getByRole("button", { name: "Close picker" }));
    await userEvent.click(canvas.getByRole("button", { name: "Open picker" }));
    await expect(
      canvas.getByRole("button", { name: /Gamut/ }),
    ).toHaveTextContent("Rec 2020");
    await expect(
      canvas.getByRole("radio", { name: "Polar model" }),
    ).toBeChecked();
  },
};
