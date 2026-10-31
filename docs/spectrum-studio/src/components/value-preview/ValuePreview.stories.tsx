// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { appColorSchemeAtom } from "../../state/view/appAppearance";
import { createValuePreview } from "../../features/tokens/valuePreview";
import { valuePreviewExamples } from "../../../tests/fixtures/value-preview";
import { ValuePreview } from "./ValuePreview";
import { ActionButton, Provider as SpectrumProvider } from "@react-spectrum/s2";
import { useMemo, useState } from "react";
import { PreviewSurfaceProvider } from "../PreviewSurfaceProvider";
import { elementsSurfaceStyle } from "../../features/color-system/previewSurface";
import { modeSelectionAtom } from "../../features/modes/selection";
import { previewOverridesAtom } from "../../features/modes/previewState";
import { renderedOutputLinear } from "../../features/color-system/outputContrast";

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

function opacityStore(scheme: "light" | "dark") {
  const store = createStore();
  store.set(appColorSchemeAtom, scheme);
  store.set(modeSelectionAtom, {
    colorScheme: scheme === "dark" ? "mode-dark" : "mode-light",
  });
  return store;
}

export const Opacity: Story = {
  args: { preview: createValuePreview("opacity", 0.4), label: "Opacity" },
  render: (args) => (
    <div style={{ display: "flex", gap: 16 }}>
      {(["light", "dark"] as const).map((scheme) => (
        <Provider key={scheme} store={opacityStore(scheme)}>
          <SpectrumProvider colorScheme={scheme}>
            <PreviewSurfaceProvider colorScheme={scheme}>
              <ValuePreview {...args} label={`Opacity ${scheme}`} />
            </PreviewSurfaceProvider>
          </SpectrumProvider>
        </Provider>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const light = canvas
      .getByRole("img", { name: "Opacity light" })
      .querySelector<HTMLElement>(".valuePreviewShape");
    const dark = canvas
      .getByRole("img", { name: "Opacity dark" })
      .querySelector<HTMLElement>(".valuePreviewShape");
    await expect(light?.style.backgroundImage).toContain(
      "repeating-conic-gradient",
    );
    await expect(getComputedStyle(light!).backgroundImage).not.toBe(
      getComputedStyle(dark!).backgroundImage,
    );
    canvasElement.dataset.playComplete = "true";
  },
};

function OpacitySurfaceExamples() {
  const [scheme, setScheme] = useState<"light" | "dark">("light");
  const [background, setBackground] = useState("#f0f0f0");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const store = useMemo(() => opacityStore(mode), [mode]);
  return (
    <SpectrumProvider colorScheme={scheme}>
      <PreviewSurfaceProvider colorScheme={scheme}>
        <Provider store={store}>
          <ActionButton
            onPress={() => setMode(mode === "light" ? "dark" : "light")}
          >
            Toggle authored mode
          </ActionButton>
          <ActionButton
            onPress={() =>
              store.set(previewOverridesAtom, {
                "color.backgroundLightness": 0.6,
              })
            }
          >
            Adjust authored background
          </ActionButton>
          <ActionButton
            onPress={() => setScheme(scheme === "light" ? "dark" : "light")}
          >
            Toggle appearance
          </ActionButton>
          <ActionButton
            onPress={() =>
              setBackground(background === "#f0f0f0" ? "#202020" : "#f0f0f0")
            }
          >
            Toggle local background
          </ActionButton>
          <ValuePreview
            preview={createValuePreview("opacity", 0.4)}
            label="Theme opacity"
          />
          <div
            style={{
              backgroundColor: background,
              ...elementsSurfaceStyle({
                css: background,
                linear: renderedOutputLinear(background, background, "srgb"),
                gamut: "srgb",
              }),
            }}
          >
            <ValuePreview
              preview={createValuePreview("opacity", 0.4)}
              label="Local opacity"
            />
          </div>
        </Provider>
      </PreviewSurfaceProvider>
    </SpectrumProvider>
  );
}

export const OpacitySurfaces: Story = {
  render: () => <OpacitySurfaceExamples />,
};
