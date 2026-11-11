// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Button, DialogContainer } from "@react-spectrum/s2";
import { useState } from "react";
import {
  StructureValueScaleDialog,
  type StructureValueScaleDialogProps,
} from "./StructureValueScaleDialog";
import { SCALE_TYPE_DEFAULTS } from "../../features/scales/scaleType";
import { isTshirtRule } from "../../features/logic/model";
import { RULE_DEFAULTS } from "../../features/logic/defaults";

const rule = RULE_DEFAULTS.find(
  (item) => isTshirtRule(item) && item.movement !== "ratio",
);
if (!rule || !isTshirtRule(rule))
  throw new Error("The story needs a Generator rule.");

function Example(args: StructureValueScaleDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onPress={() => setOpen(true)}>Choose scale behavior</Button>
      <DialogContainer onDismiss={() => setOpen(false)}>
        {open && (
          <StructureValueScaleDialog
            {...args}
            onCancel={() => {
              args.onCancel();
              setOpen(false);
            }}
            onAnswer={(answer) => {
              args.onAnswer(answer);
              setOpen(false);
            }}
          />
        )}
      </DialogContainer>
    </>
  );
}

const meta = {
  title: "Panels/Structure value scale",
  component: StructureValueScaleDialog,
  args: {
    question: {
      slots: ["paddingLeft", "paddingRight"],
      applicationId: "padding-application",
      rule,
      kind: "literal",
      value: 11,
    },
    formulas: [...SCALE_TYPE_DEFAULTS],
    onAnswer: fn(),
    onCreateFormula: fn(),
    onCancel: fn(),
  },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof StructureValueScaleDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const open = async (canvasElement: HTMLElement) => {
  await userEvent.click(
    within(canvasElement).getByRole("button", {
      name: "Choose scale behavior",
    }),
  );
  return within(document.body).findByRole("dialog");
};

export const ReuseFormula: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await expect(dialog.getByRole("button", { name: "Apply" })).toBeDisabled();
    await userEvent.click(dialog.getByRole("button", { name: /Formula/ }));
    await userEvent.click(
      await within(document.body).findByRole("option", { name: "Type scale" }),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Apply" }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      kind: "formula",
      formulaId: "scale-type-typography",
    });
  },
};
export const StaticValue: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await userEvent.click(
      dialog.getByRole("radio", { name: "Keep value static" }),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Apply" }));
    await expect(args.onAnswer).toHaveBeenCalledWith({ kind: "static" });
  },
};
export const NewFormula: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await userEvent.click(
      dialog.getByRole("radio", { name: "Create new formula" }),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Continue" }));
    await expect(args.onCreateFormula).toHaveBeenCalled();
    await expect(args.onAnswer).not.toHaveBeenCalled();
  },
};
export const Cancel: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    await expect(args.onCancel).toHaveBeenCalled();
    await expect(args.onAnswer).not.toHaveBeenCalled();
  },
};
export const ExcludedToken: Story = {
  args: { question: { ...meta.args.question, kind: "token" } },
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await expect(
      dialog.queryByRole("radio", { name: "Reuse existing formula" }),
    ).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "Apply" }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      kind: "follow",
      applicationId: "padding-application",
    });
  },
};
export const ChooseGenerationRule: Story = {
  args: {
    question: {
      ...meta.args.question,
      kind: "token",
      alternatives: [
        { applicationId: "padding-application", rule },
        {
          applicationId: "other-application",
          rule: { ...rule, id: "other-rule", name: "Other sizes" },
        },
      ],
    },
  },
  play: async ({ canvasElement, args }) => {
    const dialog = within(await open(canvasElement));
    await expect(dialog.getByRole("button", { name: "Apply" })).toBeDisabled();
    await userEvent.click(
      dialog.getByRole("button", { name: /Generation rule/ }),
    );
    await userEvent.click(
      await within(document.body).findByRole("option", { name: "Other sizes" }),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Apply" }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      kind: "follow",
      applicationId: "other-application",
    });
  },
};
export const LockedBase: Story = {
  args: {
    formulas: SCALE_TYPE_DEFAULTS.map((formula) => ({
      ...formula,
      base: { ...formula.base, overridable: false },
    })),
  },
};
export const InvalidValue: Story = {
  args: {
    error: "The formula produces negative values in the required range.",
  },
};
export const NoFormulas: Story = { args: { formulas: [] } };
