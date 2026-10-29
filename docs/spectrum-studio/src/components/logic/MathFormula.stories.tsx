// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor, within } from "@storybook/test";
import { MathFormula } from "./MathFormula";

const meta = {
  title: "Components/Math formula",
  component: MathFormula,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    latex: String.raw`(\mathrm{base} - \mathrm{offset}) \cdot \mathrm{ratio}^{i} + \mathrm{offset}`,
    fallback: "(base − offset) × ratio^i + offset",
  },
} satisfies Meta<typeof MathFormula>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Typeset: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector(".katex math")).not.toBeNull(),
    );
  },
};

export const Fraction: Story = {
  args: {
    latex: String.raw`\frac{\mathrm{base}}{2} + i`,
    fallback: "base / 2 + i",
  },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector(".katex math")).not.toBeNull(),
    );
  },
};

export const PlainWhenNoLatex: Story = {
  args: { latex: null, fallback: "base +" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Formula")).toHaveTextContent("base +");
    await expect(canvas.queryByRole("math")).toBeNull();
  },
};

export const PlainWhenLatexFails: Story = {
  args: { latex: String.raw`\undefinedcommand{x}`, fallback: "custom formula" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByLabelText("Formula"),
    ).toHaveTextContent("custom formula");
  },
};

export const Dark: Story = {
  globals: { colorScheme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
};
