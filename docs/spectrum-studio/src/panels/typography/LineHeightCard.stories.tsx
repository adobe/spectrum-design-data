// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState, type ComponentProps } from "react";
import { LineHeightCard } from "./LineHeightCard";
import { TYPOGRAPHY_DEFAULTS } from "../../features/typography/defaults";
import { TYPOGRAPHY_INTERPOLATIONS } from "../../features/typography/lineHeightInterpolations";

function Fixture(props: ComponentProps<typeof LineHeightCard>) {
  const [card, setCard] = useState(props.card);
  const [name, setName] = useState(props.name);
  return (
    <div style={{ maxWidth: 340 }}>
      <LineHeightCard
        {...props}
        card={card}
        name={name}
        onChange={(next) => {
          props.onChange(next);
          setCard(next);
        }}
        onRename={(value) => {
          const error = props.onRename(value);
          if (!error) setName(value.trim());
          return error;
        }}
      />
    </div>
  );
}
const meta = {
  title: "Panels/Line height card",
  component: LineHeightCard,
  parameters: { layout: "padded" },
  args: {
    card: structuredClone(TYPOGRAPHY_DEFAULTS.lineHeights[0]),
    name: "Body",
    unit: "rem",
    interpolations: [...TYPOGRAPHY_INTERPOLATIONS],
    isReadOnly: false,
    onChange: fn(),
    onRename: fn<(name: string) => string | undefined>(),
    onDelete: fn(),
  },
  render: (args) => <Fixture {...args} />,
} satisfies Meta<typeof LineHeightCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Adaptive: Story = {
  name: "Adaptive ranges",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Adaptive settings" }),
    );
    await expect(
      canvas.getByRole("textbox", { name: "From text size (rem)" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("textbox", { name: "To text size (rem)" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("textbox", { name: "From line height" }),
    ).toHaveValue("1.5");
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Make adaptive" }),
    );
    await expect(
      canvas.queryByRole("button", { name: "Adaptive settings" }),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Make adaptive" }),
    );
    await expect(
      canvas.getByRole("button", { name: "Adaptive settings" }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Nonadaptive: Story = {
  name: "Default multiplier only",
  args: { card: { ...TYPOGRAPHY_DEFAULTS.lineHeights[0], isAdaptive: false } },
};
export const NameValidation: Story = {
  name: "Invalid name remains a draft",
  args: {
    onRename: fn<(name: string) => string | undefined>(
      () => "Another line height uses this name.",
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByRole("textbox", { name: "Name" });
    await userEvent.clear(name);
    await userEvent.type(name, "Heading");
    await userEvent.tab();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(
      canvas.getByText("Another line height uses this name."),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
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
