// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { TypographyComparisonView } from "./TypographyComparisonView";
import type { ComparisonDataset } from "../../features/typography/comparisons";

const steps = [50, 100, 200, 300, 400].map((step, position) => ({
  id: String(step),
  label: `${step}${step === 100 ? " (base)" : ""}`,
  position: position - 1,
  isRequired: step === 100,
}));
const settings = [-1, 0, 1, 2].map((textZoom) => ({
  id: `zoom:${textZoom}`,
  textZoom,
  textSize: 1,
  position: textZoom,
  isRequired: textZoom === 0,
  label: textZoom === 0 ? "Default (100%)" : `Zoom ${textZoom}`,
}));
const zoom: ComparisonDataset = {
  settings,
  steps,
  metrics: [
    ["font-size", "Font size", 14],
    ["body-lineHeight", "Body line height", 21],
    ["workflow-icon-size", "Icon size", 18],
  ].map(([id, label, base]) => ({
    id: String(id),
    label: String(label),
    unit: "px",
    tokenNames: steps.map((step) => `${id}-${step.id}`),
    rows: settings.map((setting) =>
      steps.map((step) => {
        const value =
          Math.round(
            Number(base) *
              Math.pow(1.125, setting.textZoom + step.position) *
              10,
          ) / 10;
        return { raw: value, value };
      }),
    ),
  })),
};
const meta = {
  title: "Views/Typography comparisons",
  component: TypographyComparisonView,
  parameters: { layout: "padded" },
  args: { datasets: { zoom } },
  decorators: [
    (Story) => (
      <div
        className={style({ backgroundColor: "layer-1", padding: 16 })}
        style={{ width: "100%", maxWidth: 1000 }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TypographyComparisonView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const BySizeSetting: Story = { name: "By size setting" };
export const ByToken: Story = {
  name: "By token",
  args: { initialView: "tokens" },
};
export const KeyboardControls: Story = {
  name: "Keyboard controls",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radio = canvas.getByRole("radio", { name: "By token" });
    radio.focus();
    await userEvent.keyboard(" ");
    await expect(radio).toHaveAttribute("aria-checked", "true");
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Show values" })[0],
    );
    await expect(canvas.getByRole("table", { name: / values$/ })).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
const namedSettings = (labels: readonly string[]) =>
  settings.slice(0, labels.length).map((setting, position) => ({
    ...setting,
    id: `mode:${position}`,
    position,
    isRequired: position === 0,
    label: labels[position],
  }));
const namedDataset = (labels: readonly string[]): ComparisonDataset => ({
  ...zoom,
  settings: namedSettings(labels),
  metrics: zoom.metrics.map((metric) => ({
    ...metric,
    rows: metric.rows.slice(0, labels.length),
  })),
});
export const NamedModes: Story = {
  name: "Mode sets",
  args: {
    datasets: {
      zoom,
      modes: [
        {
          id: "scale",
          name: "Scale",
          data: namedDataset(["desktop (default) (100%)", "mobile (121.43%)"]),
        },
        {
          id: "text-size",
          name: "Text size",
          data: namedDataset([
            "Default (100%)",
            "Larger (127%)",
            "Largest (160%)",
          ]),
        },
      ],
    },
  },
};
export const OneSetting: Story = {
  name: "Mode set with one mode",
  args: {
    datasets: {
      zoom,
      modes: [
        {
          id: "text-size",
          name: "Text size",
          data: {
            ...zoom,
            settings: [settings[1]],
            metrics: zoom.metrics.map((metric) => ({
              ...metric,
              rows: [metric.rows[1]],
            })),
          },
        },
      ],
    },
  },
};
export const Error: Story = {
  name: "Invalid comparison data",
  args: {
    datasets: undefined,
    error: "Choose an available interpolation before comparing values.",
  },
};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const Narrow: Story = {
  name: "Narrow view",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
