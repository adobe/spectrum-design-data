// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { ActionButton } from "@react-spectrum/s2";
import { createColorDefaults } from "../../data/defaults";
import { DEFAULT_COLOR_ANALYSIS } from "../../state/view/colorSystemView";
import {
  ColorAnalysisView,
  type ColorAnalysisViewProps,
} from "./ColorAnalysisView";

const document = createColorDefaults();
const frameStyles = style({ backgroundColor: "gray-25", color: "neutral" });
const meta = {
  title: "Views/Color analysis",
  component: ColorAnalysisView,
  parameters: { layout: "padded" },
  args: {
    document,
    authoredContrasts: document.contrasts,
    preferences: DEFAULT_COLOR_ANALYSIS,
    surfaceId: null,
    onPreferencesChange: fn(),
    onSurfaceChange: fn(),
  },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof ColorAnalysisView>;
export default meta;
type Story = StoryObj<typeof meta>;

function Controlled(args: ColorAnalysisViewProps) {
  const [preferences, setPreferences] = useState(args.preferences);
  const [surfaceId, setSurfaceId] = useState(args.surfaceId);
  return (
    <div
      className={`chartViewContainer ${frameStyles}`}
      style={{ width: "100%", maxWidth: 1200 }}
    >
      <ColorAnalysisView
        {...args}
        preferences={preferences}
        surfaceId={surfaceId}
        onPreferencesChange={(value) => {
          setPreferences(value);
          args.onPreferencesChange(value);
        }}
        onSurfaceChange={(value) => {
          setSurfaceId(value);
          args.onSurfaceChange(value);
        }}
      />
    </div>
  );
}

export const Chromaticity: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("img", { name: "Hue and chroma projections" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "hue along generated scales" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "chroma along generated scales" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("img", { name: "lightness along generated scales" }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("img", { name: "Lightness (OKLab)" }),
    ).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Lightness: Story = {
  args: { preferences: { ...DEFAULT_COLOR_ANALYSIS, tab: "lightness" } },
};
export const KeysAndPaths: Story = {
  name: "Keys and paths",
  args: {
    preferences: { ...DEFAULT_COLOR_ANALYSIS, markerMode: "keys", paths: true },
  },
};
export const Curve: Story = {
  args: {
    preferences: {
      ...DEFAULT_COLOR_ANALYSIS,
      tab: "lightness",
      lineType: "curve",
    },
  },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};
export const DisplayP3: Story = {
  name: "Display P3",
  args: {
    document: {
      ...document,
      settings: {
        ...document.settings,
        colorOutput: {
          authoringGamut: "display-p3",
          outputFormat: "rgb",
          mapOutputsToSrgb: false,
        },
      },
    },
  },
};
export const Empty: Story = { args: { document: { ...document, scales: [] } } };
export const OneStop: Story = {
  name: "One stop",
  args: {
    document: { ...document, contrasts: [document.contrasts[0]] },
    preferences: { ...DEFAULT_COLOR_ANALYSIS, tab: "lightness" },
  },
};
export const NoStops: Story = {
  name: "No stops",
  args: {
    document: { ...document, contrasts: [] },
    preferences: { ...DEFAULT_COLOR_ANALYSIS, tab: "lightness" },
  },
};
export const InvalidKey: Story = {
  name: "Invalid key",
  args: {
    document: {
      ...document,
      scales: [
        {
          ...document.scales[0],
          stops: [{ ...document.scales[0].stops[0], lightness: -1 }],
        },
      ],
    },
  },
};
export const OverridesAndPreview: Story = {
  name: "Overrides and preview",
  args: { overrideCount: 3, isPreview: true },
};
export const KeyboardControls: Story = {
  name: "Keyboard controls",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Lightness" }));
    await expect(
      canvas.getByRole("img", { name: "Lightness (OKLab)" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Show values" }));
    await expect(
      canvas.getByRole("table", { name: /output values$/ }),
    ).toBeVisible();
    const tab = canvas.getByRole("tab", { name: "Chromaticity" });
    tab.focus();
    await userEvent.keyboard("{Enter}");
    await expect(tab).toHaveAttribute("aria-selected", "true");
    canvasElement.dataset.playComplete = "true";
  },
};

function ReferenceChangesHarness(args: ColorAnalysisViewProps) {
  const [current, setCurrent] = useState(args.document);
  const scaleId = document.scales[1].id;
  const surfaceId = document.surfaces[1].id;
  return (
    <div>
      <ActionButton
        onPress={() =>
          setCurrent({ ...current, scales: [...current.scales].reverse() })
        }
      >
        Reorder scales
      </ActionButton>
      <ActionButton
        isDisabled={!current.scales.some((item) => item.id === scaleId)}
        onPress={() =>
          setCurrent({
            ...current,
            scales: current.scales.map((item) =>
              item.id === scaleId
                ? { ...item, name: "Renamed reference" }
                : item,
            ),
          })
        }
      >
        Rename reference
      </ActionButton>
      <ActionButton
        isDisabled={!current.scales.some((item) => item.id === scaleId)}
        onPress={() =>
          setCurrent({
            ...current,
            scales: current.scales.filter((item) => item.id !== scaleId),
          })
        }
      >
        Remove reference
      </ActionButton>
      <ActionButton
        isDisabled={!current.surfaces.some((item) => item.id === surfaceId)}
        onPress={() =>
          setCurrent({
            ...current,
            surfaces: current.surfaces.filter((item) => item.id !== surfaceId),
          })
        }
      >
        Remove surface
      </ActionButton>
      <Controlled {...args} document={current} />
    </div>
  );
}

export const ReferenceChanges: Story = {
  name: "Reference changes",
  args: {
    preferences: {
      ...DEFAULT_COLOR_ANALYSIS,
      tab: "lightness",
      referenceScaleId: document.scales[1].id,
      showValues: true,
    },
    surfaceId: document.surfaces[1].id,
  },
  render: (args) => <ReferenceChangesHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const colors = () =>
      [
        ...canvas
          .getByRole("table", { name: /output values$/ })
          .querySelectorAll("tbody tr"),
      ].map((row) => row.lastElementChild?.textContent);
    const original = colors();
    await userEvent.click(
      canvas.getByRole("button", { name: "Reorder scales" }),
    );
    await expect(colors()).toEqual(original);
    await userEvent.click(
      canvas.getByRole("button", { name: "Rename reference" }),
    );
    await expect(
      canvas.getByRole("table", { name: "Renamed reference output values" }),
    ).toBeVisible();
    await expect(colors()).toEqual(original);
    await userEvent.click(
      canvas.getByRole("button", { name: "Remove reference" }),
    );
    await expect(
      canvas.getByText(
        "The reference scale was removed. Analysis now uses an available scale.",
      ),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("table", { name: "Renamed reference output values" }),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", { name: "Remove surface" }),
    );
    await expect(
      canvas.getByText(
        "The reference surface was removed. Analysis now uses an available surface.",
      ),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
