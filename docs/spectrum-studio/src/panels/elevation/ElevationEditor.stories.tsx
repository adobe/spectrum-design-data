// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { ElevationEditor, type ElevationEditorProps } from "./ElevationEditor";
import { ELEVATION_DEFAULTS } from "../../features/elevation/defaults";
import { generateElevation } from "../../features/elevation/generate";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const frame = style({
  backgroundColor: "layer-1",
  color: "neutral",
  padding: 16,
});

function Harness(args: ElevationEditorProps) {
  const [document, setDocument] = useState(() =>
    structuredClone(args.document),
  );
  const [error, setError] = useState<string>();
  const apply = (candidate: typeof document) => {
    try {
      generateElevation(candidate);
      setDocument(candidate);
      setError(undefined);
      return undefined;
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : String(failure);
      setError(message);
      return message;
    }
  };
  return (
    <div style={{ width: "min(360px, 100%)" }}>
      <ElevationEditor
        {...args}
        document={document}
        error={error ?? args.error}
        onChange={(patch) => apply({ ...document, ...patch })}
        onLayerChange={(id, patch) =>
          apply({
            ...document,
            layers: document.layers.map((layer) =>
              layer.id === id ? { ...layer, ...patch } : layer,
            ),
          })
        }
        onAdd={() =>
          apply({
            ...document,
            layers: [
              ...document.layers,
              {
                ...ELEVATION_DEFAULTS.layers[0],
                id: `00000000-0000-4000-8000-${String(document.layers.length + 1).padStart(12, "0")}`,
                label: `Shadow ${document.layers.length + 1}`,
              },
            ],
          })
        }
        onRemove={(id) =>
          apply({
            ...document,
            layers: document.layers.filter((layer) => layer.id !== id),
          })
        }
        onMove={(id, direction) => {
          const layers = [...document.layers],
            index = layers.findIndex((layer) => layer.id === id);
          [layers[index], layers[index + direction]] = [
            layers[index + direction],
            layers[index],
          ];
          apply({ ...document, layers });
        }}
      />
    </div>
  );
}
const meta = {
  title: "Panels/Elevation editor",
  component: ElevationEditor,
  render: Harness,
  decorators: [
    (Story) => (
      <div className={frame}>
        <Story />
      </div>
    ),
  ],
  args: {
    document: structuredClone(ELEVATION_DEFAULTS),
    isReadOnly: false,
    onChange: fn(),
    onLayerChange: fn(),
    onAdd: fn(),
    onRemove: fn(),
    onMove: fn(),
  },
} satisfies Meta<typeof ElevationEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("textbox", { name: "Shadow name" }),
    ).toHaveValue("Shadow 1");
    await userEvent.click(canvas.getByRole("button", { name: "Add shadow" }));
    await expect(
      canvas.getByRole("button", { name: "Delete Shadow 2" }),
    ).toBeVisible();
  },
};
export const Empty: Story = {
  args: { document: { ...ELEVATION_DEFAULTS, layers: [] } },
};
export const ReadOnly: Story = {
  name: "Read-only",
  args: { isReadOnly: true },
};
export const Maximum: Story = {
  args: {
    document: {
      ...ELEVATION_DEFAULTS,
      layers: Array.from({ length: 8 }, (_, index) => ({
        ...ELEVATION_DEFAULTS.layers[0],
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        label: `Shadow ${index + 1}`,
      })),
    },
  },
};
export const Invalid: Story = {
  args: {
    error:
      "Smaller levels would have negative blur. Increase the base or reduce the increment.",
  },
};
export const ModeOwned: Story = {
  name: "Mode-owned values",
  args: {
    owned: {
      "elevation.depth": "scheme",
      "elevation.color": "scheme",
      "elevation.layerOpacities": "scheme",
    },
  },
};
