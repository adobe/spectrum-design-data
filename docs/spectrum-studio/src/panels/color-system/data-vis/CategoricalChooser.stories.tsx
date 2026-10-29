// Copyright 2026 Adobe. All rights reserved.
import { ActionButton } from "@react-spectrum/s2";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import {
  CategoricalChooser,
  type CategoricalChooserProps,
} from "./CategoricalChooser";
import {
  storyCategorical,
  storySuggestions,
  storySurface,
  storySwatches,
} from "../../../views/color-system/data-vis/storyFixtures";

function Controlled(args: CategoricalChooserProps) {
  const [name, setName] = useState(args.name);
  const [fingerprint, setFingerprint] = useState(args.fingerprint);
  const [applied, setApplied] = useState(""),
    [open, setOpen] = useState(true);
  return (
    <div>
      <ActionButton onPress={() => setFingerprint(`${fingerprint}:changed`)}>
        Change source context
      </ActionButton>
      {args.initial && (
        <ActionButton onPress={() => setName(`${name} renamed`)}>
          Rename scale
        </ActionButton>
      )}
      {open && (
        <CategoricalChooser
          {...args}
          name={name}
          initial={args.initial ? { ...args.initial, name } : undefined}
          fingerprint={fingerprint}
          onApply={async (...input) => {
            await args.onApply(...input);
            setApplied(`Applied ${input[0].members.length} colors`);
          }}
          onCancel={() => {
            args.onCancel();
            setOpen(false);
            setApplied("Selection cancelled");
          }}
        />
      )}
      {applied && <output>{applied}</output>}
    </div>
  );
}
const meta = {
  title: "Panels/Categorical chooser",
  component: CategoricalChooser,
  parameters: { layout: "padded" },
  args: {
    scaleId: storyCategorical.id,
    name: storyCategorical.name,
    initial: storyCategorical,
    swatches: storySwatches,
    background: "#ffffff",
    gamut: "srgb",
    fingerprint: "story-light",
    suggestionState: { status: "ready", result: storySuggestions },
    onApply: fn(),
    onCancel: fn(),
  },
  render: (args) => <Controlled {...args} />,
  decorators: [
    (Story) => (
      <div
        data-data-vis-story
        className={storySurface}
        style={{ width: "100%", maxWidth: 560, minWidth: 0 }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CategoricalChooser>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SelectionAndOrder: Story = {
  name: "Selection and order",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Choose balanced" }),
    );
    const later = canvas.getByRole("button", { name: "Move color 1 later" });
    later.focus();
    await userEvent.keyboard("{Enter}");
    await expect(
      canvas.getByRole("button", { name: / Color 1 source$/ }),
    ).toHaveTextContent(storySwatches[1].label);
    const apply = canvas.getByRole("button", { name: "Apply" });
    await waitFor(() => expect(apply).toBeEnabled());
    apply.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        members: [storyCategorical.members[1], storyCategorical.members[0]],
      }),
      "story-light",
      false,
      expect.any(AbortSignal),
    );
    await expect(canvas.getByText("Applied 2 colors")).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const ManualAcknowledgment: Story = {
  name: "Manual acknowledgment",
  args: {
    initial: {
      ...storyCategorical,
      preferences: {
        ...storyCategorical.preferences,
        minimumBackgroundContrast: 21,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      apply = canvas.getByRole("button", { name: "Apply" });
    await expect(apply).toBeDisabled();
    await userEvent.click(
      canvas.getByRole("checkbox", {
        name: "Apply this manual selection despite the unmet targets",
      }),
    );
    await expect(apply).toBeEnabled();
    await userEvent.click(apply);
    await expect(canvas.getByText("Applied 2 colors")).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const RenameWhileChoosing: Story = {
  name: "Rename while choosing",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Rename scale" }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Apply" })).toBeEnabled(),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Apply" }));
    await expect(args.onApply).toHaveBeenCalledWith(
      expect.objectContaining({ name: `${args.name} renamed` }),
      "story-light",
      false,
      expect.any(AbortSignal),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const StaleContext: Story = {
  name: "Stale context",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement),
      apply = canvas.getByRole("button", { name: "Apply" });
    await userEvent.click(
      canvas.getByRole("button", { name: "Change source context" }),
    );
    await expect(apply).toBeDisabled();
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "The source colors or modes changed",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Refresh selection" }),
    );
    await waitFor(() => expect(apply).toBeEnabled());
    await userEvent.click(apply);
    await expect(args.onApply).toHaveBeenCalledWith(
      expect.anything(),
      "story-light:changed",
      false,
      expect.any(AbortSignal),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const FailedApply: Story = {
  name: "Failed apply",
  args: {
    onApply: fn(() => {
      throw new Error(
        "Replace the saved token's source before removing this member.",
      );
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Apply" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Replace the saved token's source before removing this member.",
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const CancelPendingApply: Story = {
  name: "Cancel pending apply",
  args: {
    onApply: fn(
      (_scale, _fingerprint, _acknowledge, signal?: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new Error("The palette inspection was cancelled.")),
            { once: true },
          );
        }),
    ),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Apply" }));
    await expect(args.onApply).toHaveBeenCalledOnce();
    const cancel = canvas.getByRole("button", { name: "Cancel" });
    cancel.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(canvas.getByText("Selection cancelled")).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const NewScale: Story = {
  name: "New scale",
  args: { initial: undefined },
};
export const Loading: Story = {
  args: { suggestionState: { status: "loading" } },
};
export const SuggestionError: Story = {
  name: "Suggestion error",
  args: {
    suggestionState: {
      status: "error",
      error:
        "The suggestion worker is unavailable. Manual selection still works.",
    },
  },
};
export const Empty: Story = {
  args: {
    initial: undefined,
    swatches: [],
    suggestionState: {
      status: "ready",
      result: {
        ...storySuggestions,
        status: "empty",
        suggestions: [],
        message: "No published UI-scale swatches are available.",
      },
    },
  },
};
export const UnavailableSource: Story = {
  name: "Unavailable source",
  args: { swatches: storySwatches.slice(1) },
};
export const ManualTokenOverride: Story = {
  name: "Manual token override",
  args: {
    memberOverrides: { "story-member-0": "#ffffff" },
    initial: {
      ...storyCategorical,
      preferences: {
        ...storyCategorical.preferences,
        minimumBackgroundContrast: 3,
      },
    },
  },
};
export const DisplayP3: Story = {
  name: "Display P3",
  args: {
    gamut: "display-p3",
    swatches: storySwatches.map((swatch, index) =>
      index
        ? swatch
        : {
            ...swatch,
            value: "color(display-p3 0.2 0.4 0.8)",
            manuallyOverridden: true,
          },
    ),
  },
};
export const TransparentSource: Story = {
  name: "Transparent source",
  args: {
    background: "#282828",
    swatches: storySwatches.map((swatch, index) =>
      index
        ? swatch
        : {
            ...swatch,
            value: "rgb(255 255 255 / 50%)",
            manuallyOverridden: true,
          },
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("img", { name: "Selected categorical colors" }),
    ).toHaveStyle({ backgroundColor: "#282828" });
    canvasElement.dataset.playComplete = "true";
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
