// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, TextField } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Panel } from "./Panel";

const surfaceStyles = style({ backgroundColor: "pasteboard", padding: 16 });
const meta = {
  title: "Components/Panel",
  component: Panel,
  args: {
    label: "Example settings",
    children: <TextField label="Name" defaultValue="Example" />,
  },
  parameters: { layout: "padded" },
  render: (args) => (
    <div
      className={surfaceStyles}
      style={{
        position: "relative",
        width: 600,
        maxWidth: "100%",
        height: 300,
      }}
    >
      <ActionButton>Outside action</ActionButton>
      <Panel
        {...args}
        className={style({
          position: "absolute",
          top: 16,
          end: 16,
          width: 240,
          maxWidth: "[calc(100% - 32px)]",
          maxHeight: "[calc(100% - 32px)]",
        })}
      />
    </div>
  ),
} satisfies Meta<typeof Panel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("region", { name: "Example settings" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("textbox", { name: "Name" }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Outside action" }),
    );
    await expect(
      canvas.getByRole("button", { name: "Outside action" }),
    ).toHaveFocus();
    await expect(
      canvas.getByRole("region", { name: "Example settings" }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const Scrolling: Story = {
  args: {
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: 12 }, (_, index) => (
          <TextField key={index} label={`Setting ${index + 1}`} />
        ))}
      </div>
    ),
  },
};
