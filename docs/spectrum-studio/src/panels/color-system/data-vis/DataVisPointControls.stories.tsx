// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import {
  DataVisPointControls,
  type DataVisPointControlsProps,
} from "./DataVisPointControls";
import type { DataVisPoint } from "../../../features/color-system/data-vis/model";
import { GradientStopControl } from "../../../components/color-picker/GradientStopControl";
import {
  storyDocument,
  storyPoint,
  storyPrimitiveColors,
  storySurface,
  storySwatches,
} from "../../../views/color-system/data-vis/storyFixtures";

function withSource(
  point: DataVisPoint,
  source: DataVisPoint["source"],
): DataVisPoint {
  const identity = { id: point.id, position: point.position };
  return source.kind === "ui-swatch" || source.kind === "primitive-token"
    ? { ...identity, source }
    : { ...identity, source, contrast: point.contrast ?? { value: 2.4 } };
}
function Controlled(args: DataVisPointControlsProps) {
  const [point, setPoint] = useState(args.point);
  const [sourceOverridden, setSourceOverridden] = useState(
    args.sourceOverridden,
  );
  const [contrastOverridden, setContrastOverridden] = useState(
    args.contrastOverridden,
  );
  const [staticColor, setStaticColor] = useState(args.staticColor);
  const move = (position: number) => {
    if (staticColor) setStaticColor({ ...staticColor, position });
    else setPoint({ ...point, position });
    args.onPositionChange(position);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <GradientStopControl
        gradient="linear-gradient(to right in oklch, #eaf0ff, #123456)"
        selectedId={point.id}
        isReadOnly={args.readOnly}
        onSelect={() => undefined}
        onMove={(_, position) => move(position)}
        stops={[
          ...(point.position > 0
            ? [
                {
                  id: "preview-start",
                  position: 0,
                  color: "#eaf0ff",
                  label: "Start (0%)",
                  movable: false,
                },
              ]
            : []),
          {
            id: point.id,
            position: staticColor?.position ?? point.position,
            color: staticColor?.value ?? "#336699",
            label: `Selected color stop`,
            movable: !args.fixedPosition,
            minimum: 0.00000001,
            maximum: 0.99999999,
          },
          ...(point.position < 1
            ? [
                {
                  id: "preview-end",
                  position: 1,
                  color: "#123456",
                  label: "End (100%)",
                  movable: false,
                },
              ]
            : []),
        ]}
      />
      <DataVisPointControls
        {...args}
        point={point}
        staticColor={staticColor}
        sourceOverridden={sourceOverridden}
        contrastOverridden={contrastOverridden}
        onStaticValueChange={(value) => {
          if (staticColor) setStaticColor({ ...staticColor, value });
          args.onStaticValueChange?.(value);
        }}
        onStaticTokenChange={(tokenId) => {
          if (!staticColor) return;
          const token = storyPrimitiveColors.find(
            (token) => token.id === tokenId,
          );
          setStaticColor({
            ...staticColor,
            tokenId: tokenId ?? undefined,
            value: token?.value ?? staticColor.value,
          });
          args.onStaticTokenChange?.(tokenId);
        }}
        onSourceChange={(source) => {
          setPoint(withSource(point, source));
          args.onSourceChange(source);
        }}
        onPositionChange={move}
        onContrastChange={(value, oppositeValue) => {
          if (
            point.source.kind === "ui-swatch" ||
            point.source.kind === "primitive-token"
          )
            return;
          setPoint({
            ...point,
            source: point.source,
            contrast: {
              value,
              ...(oppositeValue !== undefined && { oppositeValue }),
            },
          });
          args.onContrastChange(value, oppositeValue);
        }}
        onReset={(field) => {
          if (field === "source") {
            setPoint(withSource(point, storyPoint.source));
            setSourceOverridden(false);
          } else if (
            point.source.kind !== "ui-swatch" &&
            point.source.kind !== "primitive-token"
          ) {
            setPoint({
              ...point,
              source: point.source,
              contrast: { value: 2.4 },
            });
            setContrastOverridden(false);
          }
          args.onReset(field);
        }}
      />
    </div>
  );
}
const meta = {
  title: "Panels/Data vis point",
  component: DataVisPointControls,
  args: {
    point: storyPoint,
    document: storyDocument,
    swatches: storySwatches,
    primitiveColors: storyPrimitiveColors,
    fixedPosition: false,
    baseScope: true,
    onSourceChange: fn(),
    onContrastChange: fn(),
    onPositionChange: fn(),
    onReset: fn(),
    onAllModes: fn(),
    onStaticValueChange: fn(),
    onStaticTokenChange: fn(),
  },
  render: (args) => <Controlled {...args} />,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div
        data-data-vis-story
        className={storySurface}
        style={{ width: "100%", maxWidth: 520, minWidth: 0 }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DataVisPointControls>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OwnedContrast: Story = {
  name: "Owned contrast",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const contrast = canvas.getByRole("textbox", { name: "Contrast" });
    await userEvent.clear(contrast);
    await userEvent.type(contrast, "3.14159");
    await userEvent.tab();
    await expect(contrast).toHaveValue("3.14159");
    await userEvent.click(canvas.getByRole("button", { name: "More options" }));
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Use opposite contrast" }),
    );
    await expect(
      canvas.getByRole("textbox", { name: "Opposite contrast" }),
    ).toHaveValue("3.14159");
    await expect(args.onContrastChange).toHaveBeenCalledWith(3.14159, 3.14159);
    const source = canvas.getByRole("button", { name: / Color source$/ });
    source.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("option", {
        name: "Color token",
      }),
    );
    await expect(
      canvas.queryByRole("textbox", { name: "Contrast" }),
    ).toBeNull();
    await expect(
      canvas.getByRole("combobox", { name: /^Color token\b/ }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const ModeOverride: Story = {
  name: "Mode override",
  args: {
    baseScope: false,
    sourceModeName: "Dark",
    contrastModeName: "High contrast",
    sourceOverridden: true,
    contrastOverridden: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "More options" }));
    const reset = canvas.getByRole("button", {
      name: "Use inherited contrast",
    });
    reset.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onReset).toHaveBeenCalledWith("contrast");
    await expect(
      canvas.queryByRole("button", { name: "Use inherited contrast" }),
    ).toBeNull();
    await expect(
      canvas.getByText("Contrast: High contrast (inherited)"),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const NamedSwatch: Story = {
  name: "Named swatch",
  args: {
    point: { id: "story-linked", position: 0, source: storySwatches[0].source },
    fixedPosition: true,
  },
};
export const NativePalette: Story = {
  name: "Native palette",
  args: {
    point: {
      id: "story-palette",
      position: 0.25,
      source: {
        kind: "primitive-token",
        tokenId: storyPrimitiveColors.find(
          (color) => color.origin.kind === "palette",
        )!.id,
      },
    },
  },
};
export const NativeCategorical: Story = {
  name: "Native categorical",
  args: {
    point: {
      id: "story-category",
      position: 0.25,
      source: {
        kind: "primitive-token",
        tokenId: storyPrimitiveColors.find(
          (color) => color.origin.kind === "categorical",
        )!.id,
      },
    },
  },
};
export const StaticColor: Story = {
  name: "Static color",
  args: {
    staticColor: { id: storyPoint.id, position: 0.25, value: "#336699" },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("textbox", { name: "Contrast" }),
    ).toBeNull();
    const stop = canvas.getByRole("button", { name: "Selected color stop" });
    stop.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(args.onPositionChange).toHaveBeenCalledWith(0.26);
    await userEvent.click(canvas.getByRole("button", { name: "More options" }));
    await expect(canvas.getByRole("textbox", { name: "Position" })).toHaveValue(
      "26",
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const StaticToken: Story = {
  name: "Static token",
  args: {
    staticColor: {
      id: storyPoint.id,
      position: 0.25,
      value: "color(display-p3 0.12 0.23 0.34 / 0.45)",
      tokenId: storyPrimitiveColors[0].id,
    },
  },
};
export const IndependentKey: Story = {
  name: "Independent key",
  args: {
    point: {
      id: "story-key",
      position: 0.25,
      source: {
        kind: "key-color",
        color: { lightness: 0.6, hue: 260, chroma: 40 },
      },
      contrast: { value: 2.4, oppositeValue: 5.469 },
    },
  },
};
export const Inherited: Story = {
  args: {
    baseScope: false,
    sourceModeName: "Dark",
    contrastModeName: "High contrast",
  },
};
export const ReadOnly: Story = { name: "Read-only", args: { readOnly: true } };
export const EmptyUiSources: Story = {
  name: "Empty UI sources",
  args: {
    document: { ...storyDocument, scales: [] },
    swatches: [],
    primitiveColors: [],
    readOnly: true,
    point: {
      id: "story-key",
      position: 0.25,
      source: {
        kind: "key-color",
        color: { lightness: 0.6, hue: 260, chroma: 40 },
      },
      contrast: { value: 2.4 },
    },
  },
};
export const DisplayP3: Story = {
  name: "Display P3",
  args: {
    ...IndependentKey.args,
    document: {
      ...storyDocument,
      settings: {
        ...storyDocument.settings,
        colorOutput: {
          authoringGamut: "display-p3",
          outputFormat: "rgb",
          mapOutputsToSrgb: false,
        },
      },
    },
  },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: "min(320px, 100%)" }}>
        <Story />
      </div>
    ),
  ],
};
