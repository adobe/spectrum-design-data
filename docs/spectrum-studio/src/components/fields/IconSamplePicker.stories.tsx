// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { Picker, PickerItem } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import type { GeneratedTypographyToken } from "../../features/typography/model";
import { IconSamplePicker } from "./IconSamplePicker";
import { TypographyRamp } from "../../views/typography/TypographyRamp";
import {
  typographyDisplayModes,
  type TypographyDisplayMode,
} from "../../views/typography/typographyPreview";
import type { SpectrumIconName } from "../../features/icons/spectrumIconCatalog.generated";
import { useIconSample } from "../../features/icons/useIconSample";

const tokens: GeneratedTypographyToken[] = [14, 24, 48].map(
  (fontSize, position) => ({
    name: `font-size-${100 + position * 100}`,
    scale: 100 + position * 100,
    position,
    fontSize,
    iconSize: fontSize + 4,
    lineHeights: { body: { length: fontSize * 1.5, multiplier: 1.5 } },
    textZoom: 0,
    ratio: 1.2,
  }),
);

function Fixture({
  hidden = false,
  large = false,
  state,
  initialIcon = "Home",
  onChange,
}: {
  hidden?: boolean;
  large?: boolean;
  state?: "loading" | "error";
  initialIcon?: SpectrumIconName;
  onChange?: (icon: SpectrumIconName) => void;
}) {
  const [selectedIcon, setSelectedIcon] =
    useState<SpectrumIconName>(initialIcon);
  const [displayModes, setDisplayModes] = useState<TypographyDisplayMode[]>(
    hidden ? [] : typographyDisplayModes,
  );
  const loaded = useIconSample(selectedIcon);
  const status = state ?? loaded.status;
  return (
    <div
      className={style({ backgroundColor: "layer-1", padding: 16 })}
      style={{ width: "100%", maxWidth: 1000 }}
      data-icon-preview
    >
      <div
        style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}
      >
        <IconSamplePicker
          selectedIcon={selectedIcon}
          onChange={(icon) => {
            setSelectedIcon(icon);
            onChange?.(icon);
          }}
        />
        <Picker
          label="Show"
          selectionMode="multiple"
          value={displayModes}
          onChange={(keys) =>
            setDisplayModes(
              typographyDisplayModes.filter((mode) => keys.includes(mode)),
            )
          }
        >
          <PickerItem id="font-size">Font size</PickerItem>
          <PickerItem id="line-height">Line height</PickerItem>
          <PickerItem id="icon-size">Icon size</PickerItem>
        </Picker>
      </div>
      {status === "loading" && <p role="status">Loading sample icon...</p>}
      {status === "error" && (
        <p role="alert">
          Could not load sample icon. Choose another sample icon or reload to
          retry.
        </p>
      )}
      <div style={{ overflowX: "auto" }}>
        <TypographyRamp
          tokens={
            large
              ? tokens.map((token) => ({
                  ...token,
                  iconSize: token.iconSize * 4,
                }))
              : tokens
          }
          lineHeightId="body"
          outputUnit="px"
          sampleText="The quick brown fox jumps over the lazy dog"
          displayModes={displayModes}
          renderIcon={(size) =>
            status === "ready" && loaded.status === "ready" ? (
              <loaded.Icon
                aria-hidden="true"
                UNSAFE_style={{ width: size, height: size }}
              />
            ) : (
              <span style={{ display: "block", width: size, height: size }} />
            )
          }
        />
      </div>
    </div>
  );
}

const meta = {
  title: "Views/Typography icon samples",
  component: IconSamplePicker,
  parameters: { layout: "padded" },
  args: { selectedIcon: "Home", onChange: fn() },
  render: (args) => (
    <Fixture initialIcon={args.selectedIcon} onChange={args.onChange} />
  ),
} satisfies Meta<typeof IconSamplePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SearchAndKeyboard: Story = {
  name: "Search and keyboard selection",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("combobox", { name: "Sample icon" });
    await waitFor(() =>
      expect(
        canvasElement.querySelectorAll(".typographyElementIcon svg"),
      ).toHaveLength(3),
    );
    await userEvent.clear(input);
    await userEvent.type(input, "Bell");
    await waitFor(() =>
      expect(
        within(canvasElement.ownerDocument.body).getByRole("option", {
          name: "Bell",
        }),
      ).toBeVisible(),
    );
    await waitFor(() =>
      expect(
        canvasElement.ownerDocument.querySelector(
          '[role="option"] [data-icon-name="Bell"] svg',
        ),
      ).not.toBeNull(),
    );
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(input).toHaveValue("Bell");
    await userEvent.clear(input);
    await userEvent.type(input, "No matching Spectrum icon");
    await expect(
      within(canvasElement.ownerDocument.body).getByRole("option", {
        name: "No results",
      }),
    ).toBeVisible();
    await userEvent.keyboard("{Escape}");
    canvasElement.dataset.playComplete = "true";
  },
};
export const HiddenLabels: Story = {
  name: "Hidden labels keep sample geometry",
  render: () => <Fixture hidden />,
};
export const LargeIcons: Story = {
  name: "Large generated icons",
  render: () => <Fixture large />,
};
export const Loading: Story = {
  name: "Loading sample",
  render: () => <Fixture state="loading" />,
};
export const LoadError: Story = {
  name: "Explicit load error",
  render: () => <Fixture state="error" />,
};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const Narrow: Story = {
  name: "Narrow preview",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
