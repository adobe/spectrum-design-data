// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import {
  CustomContrastEditor,
  type CustomContrastEditorProps,
} from "./CustomContrastEditor";
import { STANDARD_SCALE_NAMING_RULE } from "../../features/logic/scaleNaming";
import type { ColorScale } from "../../features/color-system/model";

const scale: ColorScale = {
  id: "story-gray",
  name: "Gray",
  stops: [{ id: "story-stop", lightness: 0.5, hue: 0, chroma: 0 }],
  customContrasts: {
    steps: Array.from({ length: 13 }, (_, index) => ({
      id: `story-step-${index}`,
      value: 1 + index * 0.5,
    })),
    baseContrastId: "story-step-3",
    namingRuleId: STANDARD_SCALE_NAMING_RULE.id,
  },
};
function Controlled(args: CustomContrastEditorProps) {
  const [current, setCurrent] = useState(args.scale);
  return (
    <CustomContrastEditor
      {...args}
      scale={current}
      onAction={(action) => {
        args.onAction(action);
        if (action.kind === "add")
          setCurrent({
            ...current,
            customContrasts: {
              ...current.customContrasts!,
              steps: [
                ...current.customContrasts!.steps,
                { id: "story-added", value: 8 },
              ],
            },
          });
        if (action.kind === "value")
          setCurrent({
            ...current,
            customContrasts: {
              ...current.customContrasts!,
              steps: current.customContrasts!.steps.map((step) =>
                step.id === action.stepId
                  ? {
                      ...step,
                      [action.opposite ? "oppositeValue" : "value"]:
                        action.value,
                    }
                  : step,
              ),
            },
          });
      }}
    />
  );
}
const meta = {
  title: "Panels/Custom contrast steps",
  component: CustomContrastEditor,
  args: { scale, rules: [STANDARD_SCALE_NAMING_RULE], onAction: fn() },
  render: (args) => <Controlled {...args} />,
  decorators: [
    (Story) => (
      <div style={{ width: "min(560px, 100%)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CustomContrastEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const GraySequence: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(
        "Names: 25, 50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000",
      ),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Remove 100" }),
    ).toBeDisabled();
    await userEvent.click(
      canvas.getByRole("button", { name: "Add contrast step" }),
    );
    await expect(
      canvas.getByRole("textbox", { name: "Contrast 1100" }),
    ).toBeVisible();
    const ratio = canvas.getByRole("textbox", { name: "Contrast 50" });
    await userEvent.clear(ratio);
    await userEvent.type(ratio, "1.07012345");
    await userEvent.tab();
    await expect(ratio).toHaveValue("1.07012345");
    const opposite = canvas.getByRole("textbox", {
      name: "Opposite contrast 50",
    });
    await userEvent.clear(opposite);
    await userEvent.type(opposite, "1.108");
    await userEvent.tab();
    await expect(opposite).toHaveValue("1.108");
    canvasElement.dataset.playComplete = "true";
  },
};
export const ModeOverride: Story = {
  args: {
    modeLabel: "Contrast: High contrast",
    patches: { "story-step-3": 5 },
  },
};
export const ReadOnly: Story = { args: { disabled: true } };
export const Shared: Story = {
  args: { scale: { ...scale, customContrasts: undefined } },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};
