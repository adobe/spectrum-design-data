// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { Button, DialogTrigger, Provider } from "@react-spectrum/s2";
import { ChangeResetDialog } from "./ChangeResetDialog";
import type { ResetChoice } from "../../features/changelog/resetPlans";

const choices: ResetChoice[] = [
  {
    id: "override",
    label: "Use shipped value in this context",
    description: "Keep automation and other mode values unchanged.",
    plan: {
      kind: "override",
      title: "Spacing",
      tokenId: "spacing-100",
      modeKey: "[]",
      shippedValue: 8,
      expectedSource: {
        id: "spacing-100",
        type: "spacing",
        groupId: "spacing",
        groupLabel: "Spacing",
        name: "space-100",
        generatedName: "space-100",
        value: 12,
        generatedValue: 12,
        unit: "px",
      },
      expectedEdit: undefined,
    },
  },
  {
    id: "source",
    label: "Restore Global / Base",
    description: "All dependent scale values may change.",
    plan: {
      kind: "source",
      title: "Global / Base",
      addresses: [
        {
          path: ["spacing", "scales", { key: "id", id: "global" }, "base"],
          expected: 12,
        },
      ],
    },
  },
];

const meta = {
  title: "Changes/Reset confirmation",
  component: ChangeResetDialog,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Provider colorScheme="light">
        <Story />
      </Provider>
    ),
  ],
  args: {
    title: "Reset generated value?",
    explanation:
      "This value is automated. Choose a context-scoped shipped value or a changed source.",
    choices,
    onApply: fn(),
  },
  render: (args) => (
    <DialogTrigger>
      <Button variant="secondary">Reset generated value</Button>
      <ChangeResetDialog {...args} />
    </DialogTrigger>
  ),
} satisfies Meta<typeof ChangeResetDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

async function open(canvasElement: HTMLElement) {
  await userEvent.click(
    within(canvasElement).getByRole("button", {
      name: "Reset generated value",
    }),
  );
  const dialog = await within(canvasElement.ownerDocument.body).findByRole(
    "alertdialog",
  );
  await waitFor(() => expect(dialog).toBeVisible());
  return dialog;
}

export const Normal: Story = {
  name: "Normal",
  args: { choices: [choices[1]] },
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await expect(
      dialog.getByRole("button", { name: "Reset selected change" }),
    ).toBeEnabled();
    await userEvent.click(
      dialog.getByRole("button", { name: "Reset selected change" }),
    );
    await expect(args.onApply).toHaveBeenCalledWith(choices[1].plan);
    canvasElement.dataset.playComplete = "true";
  },
};
export const MultipleSources: Story = {
  name: "Multiple sources require a choice",
  args: {
    choices: [
      ...choices,
      { ...choices[1], id: "rule", label: "Restore Spacing / Rounding rule" },
    ],
  },
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await expect(
      dialog.getByRole("button", { name: "Reset selected change" }),
    ).toBeDisabled();
    await userEvent.click(
      dialog.getByRole("radio", { name: "Use shipped value in this context" }),
    );
    await userEvent.keyboard("{ArrowDown}");
    await expect(
      dialog.getByRole("radio", { name: "Restore Global / Base" }),
    ).toBeChecked();
    await userEvent.tab();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.tab();
    await expect(
      dialog.getByRole("button", { name: "Reset selected change" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onApply).toHaveBeenCalledWith(choices[1].plan);
    canvasElement.dataset.playComplete = "true";
  },
};
export const Locked: Story = {
  name: "Locked formula",
  args: {
    choices: [
      {
        ...choices[0],
        plan: undefined,
        disabledReason:
          "This output includes locked formula parts. Restore its changed source instead.",
      },
      choices[1],
    ],
  },
  play: async ({ canvasElement }) => {
    const dialog = within(await open(canvasElement));
    await expect(
      dialog.getByRole("radio", { name: "Use shipped value in this context" }),
    ).toBeDisabled();
    await expect(dialog.getByText(/locked formula parts/)).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Unavailable: Story = {
  name: "Unavailable independent value",
  args: {
    choices: [
      {
        ...choices[0],
        plan: undefined,
        disabledReason:
          "Static categorical edits are shared across all modes, not independent context overrides.",
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const dialog = within(await open(canvasElement));
    await expect(dialog.getByRole("status")).toHaveTextContent(
      "No safe reset is available",
    );
    await expect(
      dialog.getByRole("button", { name: "Reset selected change" }),
    ).toBeDisabled();
    canvasElement.dataset.playComplete = "true";
  },
};
export const ValidationError: Story = {
  name: "Validation error retains dialog",
  args: {
    choices: [choices[1]],
    onApply: fn(() => {
      throw new Error(
        "A component still references this source. Reassign it before resetting.",
      );
    }),
  },
  play: async ({ canvasElement }) => {
    const dialog = within(await open(canvasElement));
    await userEvent.click(
      dialog.getByRole("button", { name: "Reset selected change" }),
    );
    await expect(dialog.getByRole("alert")).toHaveTextContent(
      "A component still references",
    );
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Cancel: Story = {
  name: "Cancel leaves changes intact",
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await userEvent.click(
      dialog.getByRole("radio", { name: "Restore Global / Base" }),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    await expect(args.onApply).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        within(canvasElement).getByRole("button", {
          name: "Reset generated value",
        }),
      ).toHaveFocus(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const NarrowDark: Story = {
  name: "Narrow dark",
  decorators: [
    (Story) => (
      <Provider colorScheme="dark">
        <div style={{ width: 280 }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    canvasElement.dataset.playComplete = "true";
  },
};
export const NarrowLight: Story = {
  name: "Narrow light",
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    canvasElement.dataset.playComplete = "true";
  },
};
