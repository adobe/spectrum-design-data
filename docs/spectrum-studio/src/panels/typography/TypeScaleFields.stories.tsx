// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState, type ComponentProps } from "react";
import { TypeScaleFields } from "./TypeScaleFields";
import { SCALE_TYPE_DEFAULTS } from "../../features/scales/scaleType";
import { TYPOGRAPHY_INTERPOLATIONS } from "../../features/typography/lineHeightInterpolations";

function Fixture(props: ComponentProps<typeof TypeScaleFields>) {
  const [formula, setFormula] = useState(props.formula);
  return (
    <div style={{ maxWidth: 340 }}>
      <TypeScaleFields
        {...props}
        formula={formula}
        onChange={(next) => {
          props.onChange(next);
          setFormula(next);
        }}
      />
    </div>
  );
}
const meta = {
  title: "Panels/Type scale settings",
  component: TypeScaleFields,
  parameters: { layout: "padded" },
  args: {
    formula: structuredClone(SCALE_TYPE_DEFAULTS[0]),
    interpolations: [...TYPOGRAPHY_INTERPOLATIONS],
    unit: "rem",
    isReadOnly: false,
    onChange: fn(),
  },
  render: (args) => <Fixture {...args} />,
} satisfies Meta<typeof TypeScaleFields>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SharedRatio: Story = {
  name: "Preset and custom share one ratio",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("button", { name: /Scale/ }));
    await userEvent.click(body.getByRole("option", { name: "Major third" }));
    await expect(canvas.getByRole("textbox", { name: "Ratio" })).toHaveValue(
      "1.25",
    );
    const field = canvas.getByRole("textbox", { name: "Ratio" });
    await userEvent.clear(field);
    await userEvent.type(field, "1.234{Enter}");
    await expect(
      canvas.getByRole("button", { name: /Scale/ }),
    ).toHaveTextContent("Custom");
    await userEvent.click(
      canvas.getByRole("button", { name: "Adaptive settings" }),
    );
    await expect(
      canvas.getByRole("textbox", { name: "Ratio at smallest setting" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("checkbox", { name: /Adaptive/ }),
    ).toBeNull();
    await expect(canvas.queryByText("Offset")).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Pixels: Story = { name: "Pixel units", args: { unit: "px" } };
export const ReadOnly: Story = {
  name: "Read-only",
  args: { isReadOnly: true },
};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const Narrow: Story = {
  name: "Narrow panel",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
