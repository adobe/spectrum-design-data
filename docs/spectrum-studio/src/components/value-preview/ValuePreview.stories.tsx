// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { createValuePreview } from "../../features/tokens/valuePreview";
import { valuePreviewExamples } from "../../../tests/fixtures/value-preview";
import { ValuePreview } from "./ValuePreview";

const meta = {
  title: "Components/Value preview",
  component: ValuePreview,
  parameters: { layout: "padded" },
  args: {
    preview: createValuePreview("font-size", 16, "px"),
    label: "Text size",
    fontSize: 16,
    fontWeight: 400,
    fontStyle: "normal",
  },
  argTypes: {
    fontSize: { control: { type: "number", min: 1 } },
    fontWeight: { control: "number" },
    fontStyle: { control: "select", options: ["normal", "italic", "oblique"] },
    fontFamily: { control: "text" },
    icon: { control: false },
  },
} satisfies Meta<typeof ValuePreview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: "Text size" })).toBeVisible();
    await expect(canvas.getByText("Ag")).toHaveStyle({ fontSize: "16px" });
    canvasElement.dataset.playComplete = "true";
  },
};
export const Gallery: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
      {valuePreviewExamples.map(({ label, preview }) => (
        <figure
          key={label}
          style={{ margin: 0, width: 160 }}
          data-preview-example={label}
        >
          <ValuePreview {...args} preview={preview} label={label} />
          <figcaption style={{ fontSize: 12 }}>{label}</figcaption>
          <div style={{ fontSize: 12, overflowWrap: "anywhere" }}>
            {preview.kind === "unavailable"
              ? preview.message
              : `${preview.value}${preview.unit === "px" ? "px" : ""}`}
          </div>
        </figure>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas
        .getByRole("img", { name: "Unitless line height" })
        .querySelector(".valuePreviewText"),
    ).toHaveStyle({ height: "24px" });
    await expect(
      canvas
        .getByRole("img", { name: "Radius" })
        .querySelector(".valuePreviewShape"),
    ).toHaveStyle({ borderTopLeftRadius: "8px" });
    await expect(
      canvas
        .getByRole("img", { name: "Large spacing" })
        .querySelector(".valuePreviewShape"),
    ).toHaveStyle({ width: "2048px" });
    await expect(
      canvas.getByRole("img", { name: /^Invalid color:/ }),
    ).toHaveAttribute("data-preview-unavailable", "true");
    canvasElement.dataset.playComplete = "true";
  },
};
export const GridSize: Story = {
  args: {
    preview: createValuePreview("shadow", "0 2px 4px #0008, 0 6px 12px #0004"),
    label: "Complete shadow",
    large: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 200 }}>
        <Story />
      </div>
    ),
  ],
};
export const CustomText: Story = {
  args: {
    preview: createValuePreview("text-color", "#c40000"),
    label: "Customized text",
    fontSize: 20,
    fontWeight: 600,
    fontStyle: "italic",
    fontFamily: "serif",
  },
};
export const RemLength: Story = {
  args: {
    preview: createValuePreview("font-size", "1.5rem"),
    label: "Relative text size",
  },
};
