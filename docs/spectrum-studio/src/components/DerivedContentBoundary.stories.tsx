// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { Button, Heading, Text } from "@react-spectrum/s2";
import { useState } from "react";
import {
  DerivedContentBoundary,
  type DerivedContentBoundaryProps,
} from "./DerivedContentBoundary";

const preview = (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}
  >
    <Heading>Current scale</Heading>
    <Text>8 px · 12 px · 16 px</Text>
  </div>
);
const meta = {
  title: "Components/Derived content boundary",
  component: DerivedContentBoundary,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div
        style={{
          display: "flex",
          minHeight: 220,
          width: 420,
          maxWidth: "100%",
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    state: "ready",
    label: "Calculating preview",
    children: preview,
    onRetry: fn(),
  },
} satisfies Meta<typeof DerivedContentBoundary>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Current scale"),
    ).toBeVisible();
    await expect(canvasElement.querySelector("[aria-busy]")).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};
export const PendingOverlay: Story = {
  args: { state: "pending" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Current scale")).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.getByRole("progressbar", { name: "Calculating preview" }),
      ).toBeVisible(),
    );
    await expect(
      canvasElement.querySelector("[data-derived-state]"),
    ).toHaveAttribute("aria-busy", "true");
    canvasElement.dataset.playComplete = "true";
  },
};
export const PendingSkeleton: Story = {
  args: { state: "pending", presentation: "skeleton" },
};
export const DarkOverlay: Story = {
  ...PendingOverlay,
  globals: { colorScheme: "dark" },
};
export const ReducedMotion: Story = {
  ...PendingOverlay,
  parameters: {
    docs: {
      description: {
        story:
          "Uses Spectrum's native loading presentation. Inspect with reduced motion enabled; no application animation is added.",
      },
    },
  },
};

function InteractivePreview(args: DerivedContentBoundaryProps) {
  const [state, setState] =
    useState<DerivedContentBoundaryProps["state"]>("ready");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" onPress={() => setState("pending")}>
          Update preview
        </Button>
        <Button variant="secondary" onPress={() => setState("ready")}>
          Finish update
        </Button>
      </div>
      <DerivedContentBoundary {...args} state={state} />
    </div>
  );
}
export const ControlsRemainAvailable: Story = {
  render: (args) => <InteractivePreview {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Update preview" }),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole("progressbar", { name: "Calculating preview" }),
      ).toBeVisible(),
    );
    const finish = canvas.getByRole("button", { name: "Finish update" });
    await expect(finish).toBeEnabled();
    finish.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.queryByRole("progressbar")).toBeNull());
    await expect(canvas.getByText("Current scale")).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

function RetryPreview(args: DerivedContentBoundaryProps) {
  const [state, setState] =
    useState<DerivedContentBoundaryProps["state"]>("unavailable");
  return (
    <DerivedContentBoundary
      {...args}
      state={state}
      onRetry={() => {
        args.onRetry?.();
        setState("ready");
      }}
    />
  );
}
export const ErrorAndRetry: Story = {
  args: {
    state: "unavailable",
    error: "The current comparison could not be calculated.",
  },
  render: (args) => <RetryPreview {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("The current comparison could not be calculated."),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
    await expect(canvas.queryByText("Output unavailable")).toBeNull();
    await expect(canvas.getByText("Current scale")).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
