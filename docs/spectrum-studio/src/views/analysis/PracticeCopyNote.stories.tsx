// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import type { AnalysisSource } from "../../features/design-data/comparison";
import { PracticeCopyNote } from "./PracticeCopyNote";
import "./AnalysisView.css";

const source: AnalysisSource = {
  kind: "reference",
  root: "packages/design-data",
  hash: "0".repeat(64),
  revision: "e2379a2e",
  dirty: false,
  version: "story",
  validator: "story",
};

const meta = {
  title: "Analysis/Practice copy note",
  component: PracticeCopyNote,
  args: { source },
} satisfies Meta<typeof PracticeCopyNote>;
export default meta;
type Story = StoryObj<typeof meta>;

const expectStatus =
  (status: string, text: RegExp): Story["play"] =>
  async ({ canvasElement }) => {
    const note = within(canvasElement).getByTestId("practice-copy-status");
    await expect(note).toHaveAttribute("data-status", status);
    await expect(note).toHaveTextContent(text);
    canvasElement.dataset.playComplete = "true";
  };

export const Current: Story = {
  args: {
    source: {
      ...source,
      practiceCopy: {
        status: "current",
        recordedCommit: "e2379a2e5f",
        changedFiles: 0,
      },
    },
  },
  play: expectStatus("current", /matches the design-data package/),
};

export const RefreshAvailable: Story = {
  args: {
    source: {
      ...source,
      practiceCopy: {
        status: "refresh-available",
        recordedCommit: "e2379a2e5f",
        changedFiles: 3,
      },
    },
  },
  play: expectStatus("refresh-available", /3 design-data files have changed/),
};

export const Missing: Story = {
  args: {
    source: {
      ...source,
      practiceCopy: { status: "missing", changedFiles: 0 },
    },
  },
  play: expectStatus("missing", /was not found/),
};
