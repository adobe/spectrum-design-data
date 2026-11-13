// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { InstallAppDialog } from "./InstallAppDialog";

const meta = {
  title: "Components/Install app dialog",
  component: InstallAppDialog,
  parameters: { layout: "padded" },
  args: {
    isOpen: true,
    canPromptInstall: true,
    browser: "other",
    colorScheme: "light",
    onInstall: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof InstallAppDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NativePrompt: Story = {
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole("dialog")).toBeVisible());
    await userEvent.click(body.getByRole("button", { name: "Install app" }));
    await expect(args.onInstall).toHaveBeenCalledOnce();
    await userEvent.click(body.getByRole("button", { name: "Maybe later" }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const SafariSteps: Story = {
  args: { canPromptInstall: false, browser: "safari" },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(
        body.getByText("In Safari, choose File › Add to Dock."),
      ).toBeVisible(),
    );
    await expect(
      body.queryByRole("button", { name: "Install app" }),
    ).not.toBeInTheDocument();
  },
};

export const FirefoxSteps: Story = {
  args: { canPromptInstall: false, browser: "firefox", colorScheme: "dark" },
};
