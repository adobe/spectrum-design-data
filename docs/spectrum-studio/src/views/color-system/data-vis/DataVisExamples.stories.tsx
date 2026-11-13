// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { Button } from "@react-spectrum/s2";
import { compileContinuousScale } from "../../../features/color-system/data-vis/continuous";
import { DataVisExamples, type DataVisExamplesProps } from "./DataVisExamples";
import { DataVisScaleHeader } from "./DataVisScaleHeader";

function scale(kind: "sequential" | "diverging") {
  const values =
    kind === "sequential"
      ? ["#d7e9ff", "#1645a1"]
      : ["#1645a1", "#eeeeee", "#b74716"];
  return compileContinuousScale(
    { id: kind, kind },
    values.map((value, index) => ({
      id: `${kind}-${index}`,
      position: index / (values.length - 1),
      value,
      source: { kind: "static-color", value },
      actualContrast: 1,
      manuallyOverridden: false,
    })),
  );
}
const sequential = scale("sequential");
const diverging = scale("diverging");
const palette = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    diverging.evaluate(count === 1 ? 0 : index / (count - 1)),
  );
const cssColors = [
  "rgb(31 119 180)",
  "rgb(255 127 14 / 0.6)",
  "oklch(0.55 0.18 300)",
  "color(display-p3 0.1 0.8 0.3)",
];

function ExampleScale(props: DataVisExamplesProps) {
  const colors =
    props.kind === "categorical"
      ? props.colors
      : Array.from({ length: 9 }, (_, index) => props.evaluate(index / 8));
  return (
    <section className="dataVisScale">
      <DataVisScaleHeader
        name={props.name}
        kind={props.kind}
        colors={colors}
        background={props.background}
      />
      <DataVisExamples {...props} />
    </section>
  );
}

const meta: Meta<typeof DataVisExamples> = {
  title: "Views/Data vis examples",
  component: DataVisExamples,
  args: {
    name: "Story sequence",
    kind: "sequential",
    evaluate: sequential.evaluate,
    background: "#ffffff",
    colorScheme: "light",
  },
  render: (args) => <ExampleScale {...args} />,
  parameters: { layout: "padded" },
  decorators: [
    (Story, context) => {
      const colorScheme =
        context.globals.colorScheme === "dark" ? "dark" : "light";
      const background = colorScheme === "dark" ? "#202020" : "#ffffff";
      return (
        <div
          data-data-vis-story
          style={{
            width: "100%",
            minWidth: 0,
            padding: 16,
            boxSizing: "border-box",
            background,
            color: colorScheme === "dark" ? "#ffffff" : "#000000",
          }}
        >
          <Story args={{ ...context.args, background, colorScheme }} />
        </div>
      );
    },
  ],
};
export default meta;
type Story = StoryObj<typeof DataVisExamples>;

export const Sequential: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const map = canvas.getByRole("img", {
      name: "Story sequence choropleth example",
    });
    const heatmap = canvas.getByRole("img", {
      name: "Story sequence heat map example",
    });
    const paths = [...map.querySelectorAll("path")];
    const cells = [...heatmap.querySelectorAll("rect")];
    await expect(paths).toHaveLength(50);
    await expect(cells).toHaveLength(50);
    await expect(paths.map((path) => path.getAttribute("fill"))).toEqual(
      cells.map((cell) => cell.getAttribute("fill")),
    );
    await expect(canvas.queryByRole("grid")).not.toBeInTheDocument();
    const disclosure = canvas.getByRole("button", { name: "Sample data" });
    disclosure.focus();
    await userEvent.keyboard("{Enter}");
    await expect(
      canvas.getByRole("grid", { name: "Story sequence sample data" }),
    ).toBeVisible();
    await expect(canvas.getByText("Region 1", { exact: true })).toBeVisible();
    await userEvent.click(disclosure);
    await expect(canvas.queryByRole("grid")).not.toBeInTheDocument();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Diverging: Story = {
  args: {
    name: "Story divergence",
    kind: "diverging",
    evaluate: diverging.evaluate,
  },
};

async function checkCategorical(
  canvasElement: HTMLElement,
  colors: readonly string[],
) {
  for (const [chart, mark, multiplier] of [
    ["bar", "mark-rect", 5],
    ["donut", "mark-arc", 1],
    ["scatter", "mark-symbol", 5],
  ] as const) {
    await waitFor(
      async () => {
        const marks = [
          ...canvasElement.querySelectorAll(
            `[data-chart="${chart}"] svg g.${mark}.role-mark > path, [data-chart="${chart}"] svg g.${mark}.role-mark > rect`,
          ),
        ];
        await expect(marks).toHaveLength(colors.length * multiplier);
        const expected = colors.map((color) => {
          const probe = document.createElement("span");
          probe.style.color = color;
          canvasElement.append(probe);
          const normalized = getComputedStyle(probe).color;
          probe.remove();
          return normalized;
        });
        await expect(
          new Set(marks.map((mark) => getComputedStyle(mark).fill)),
        ).toEqual(new Set(expected));
      },
      { timeout: 10000 },
    );
  }
}

export const Categorical: Story = {
  args: { name: "Story categories", kind: "categorical", colors: palette(3) },
  play: async ({ canvasElement }) => {
    await checkCategorical(canvasElement, palette(3));
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Sample data" }));
    await expect(
      canvas.getByRole("grid", { name: "Story categories sample data" }),
    ).toBeVisible();
    await expect(
      canvas.getAllByText("Category 3", { exact: true }),
    ).toHaveLength(5);
    canvasElement.dataset.playComplete = "true";
  },
};
export const OneCategory: Story = {
  args: { name: "One category", kind: "categorical", colors: palette(1) },
};
export const TwelveCategories: Story = {
  args: { name: "Twelve categories", kind: "categorical", colors: palette(12) },
};
export const ManyCategories: Story = {
  name: "Many categories",
  args: { name: "Many categories", kind: "categorical", colors: palette(25) },
  play: async ({ canvasElement }) => {
    await checkCategorical(canvasElement, palette(25));
    canvasElement.dataset.playComplete = "true";
  },
};
export const Empty: Story = {
  args: { name: "Empty categories", kind: "categorical", colors: [] },
};
export const Dark: Story = {
  globals: { colorScheme: "dark" },
  args: { name: "Dark categories", kind: "categorical", colors: palette(3) },
};
export const Narrow: Story = {
  args: { name: "Narrow categories", kind: "categorical", colors: palette(3) },
  decorators: [
    (Story) => (
      <div style={{ width: "min(320px, 100%)" }}>
        <Story />
      </div>
    ),
  ],
};

function LiveColorsExample({ background, colorScheme }: DataVisExamplesProps) {
  const [changed, setChanged] = useState(false);
  return (
    <div>
      <Button onPress={() => setChanged(!changed)}>Change colors</Button>
      <ExampleScale
        name="Live categories"
        kind="categorical"
        colors={changed ? palette(4) : cssColors}
        background={background}
        colorScheme={colorScheme}
      />
    </div>
  );
}
export const LiveColors: Story = {
  name: "Live colors",
  render: (args) => <LiveColorsExample {...args} />,
  play: async ({ canvasElement }) => {
    await checkCategorical(canvasElement, cssColors);
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Change colors" }),
    );
    await checkCategorical(canvasElement, palette(4));
    canvasElement.dataset.playComplete = "true";
  },
};
