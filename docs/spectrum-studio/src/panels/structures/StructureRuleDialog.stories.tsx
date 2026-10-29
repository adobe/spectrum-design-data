// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { ActionButton } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import { createTshirtFixture } from "../../../tests/fixtures/tshirt";
import { buildTshirtArtifacts } from "../../features/design-data/tshirtArtifacts";
import {
  assignStructure,
  structureBinding,
  structureGeneration,
} from "../../features/structures/model";
import {
  StructureRuleDialog,
  type StructureRuleDialogProps,
} from "./StructureRuleDialog";

const fixture = createTshirtFixture({ unattached: true });
const surfaceStyles = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  backgroundColor: "layer-1",
  minHeight: "[100vh]",
  padding: 16,
});
const preview: StructureRuleDialogProps["preview"] = (application) => {
  const source = structuredClone(fixture.source);
  source.structures!.structures[0].generation = {
    ...structureGeneration(fixture.structure),
    applications: [application],
  };
  return buildTshirtArtifacts(source);
};
function ControlledDialog(args: StructureRuleDialogProps) {
  const [applied, setApplied] = useState("");
  return (
    <>
      <StructureRuleDialog
        {...args}
        onApply={(application) => {
          args.onApply(application);
          setApplied(`${application.targets.kind} applied`);
        }}
      />
      <p role="status">{applied}</p>
    </>
  );
}
const meta = {
  title: "Panels/Structure generation rule",
  component: StructureRuleDialog,
  args: {
    structure: fixture.structure,
    rules: fixture.source.rules!,
    references: fixture.references,
    trigger: <ActionButton>Add generation rule</ActionButton>,
    preview,
    onApply: fn(),
  },
  render: (args) => <ControlledDialog {...args} />,
  decorators: [
    (Story) => (
      <div className={surfaceStyles}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StructureRuleDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Add generation rule" }),
    );
    const dialog = await body.findByRole("dialog");
    await waitFor(() => expect(dialog).toBeVisible());
    await expect(
      within(dialog).getByRole("radio", {
        name: "All token-backed properties",
      }),
    ).toBeChecked();
    await waitFor(() =>
      expect(within(dialog).getByText("base-padding-medium")).toBeVisible(),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );
    await expect(args.onApply).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Add generation rule" }),
      ).toHaveFocus(),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Add generation rule" }),
    );
    const reopened = await body.findByRole("dialog");
    await waitFor(() => expect(reopened).toBeVisible());
    await userEvent.click(
      within(reopened).getByRole("button", { name: "Apply" }),
    );
    await waitFor(() =>
      expect(args.onApply).toHaveBeenCalledWith(
        expect.objectContaining({ targets: { kind: "all" } }),
      ),
    );
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("all applied"),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const CustomProperties: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Add generation rule" }),
    );
    const element = await body.findByRole("dialog");
    await waitFor(() => expect(element).toBeVisible());
    const dialog = within(element);
    await userEvent.click(
      dialog.getByRole("radio", { name: "Custom properties" }),
    );
    await waitFor(() =>
      expect(
        dialog.getByRole("radio", { name: "Custom properties" }),
      ).toBeChecked(),
    );
    await userEvent.click(
      dialog.getByRole("checkbox", { name: "Right padding" }),
    );
    await waitFor(() =>
      expect(
        dialog.getByRole("checkbox", { name: "Right padding" }),
      ).not.toBeChecked(),
    );
    await userEvent.click(
      dialog.getByRole("checkbox", { name: "Left padding" }),
    );
    await waitFor(() =>
      expect(dialog.getByText("base-padding-vertical-medium")).toBeVisible(),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Apply" }));
    await expect(args.onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        targets: {
          kind: "custom",
          bindingIds: [
            structureBinding(fixture.structure, "paddingTop")!.id,
            structureBinding(fixture.structure, "paddingBottom")!.id,
          ],
        },
      }),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const KeyboardSelection: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Add generation rule" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const element = await body.findByRole("dialog");
    await waitFor(() => expect(element).toBeVisible());
    const dialog = within(element);
    dialog.getByRole("radio", { name: "All token-backed properties" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(
        dialog.getByRole("radio", { name: "Custom properties" }),
      ).toBeChecked(),
    );
    dialog.getByRole("checkbox", { name: "Top padding" }).focus();
    await userEvent.keyboard(" ");
    await waitFor(() =>
      expect(
        dialog.getByRole("checkbox", { name: "Top padding" }),
      ).not.toBeChecked(),
    );
    dialog.getByRole("button", { name: "Apply" }).focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(args.onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: {
            kind: "custom",
            bindingIds: [
              structureBinding(fixture.structure, "paddingRight")!.id,
              structureBinding(fixture.structure, "paddingBottom")!.id,
              structureBinding(fixture.structure, "paddingLeft")!.id,
            ],
          },
        }),
      ),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    canvasElement.dataset.playComplete = "true";
  },
};
const hidden = createTshirtFixture({ hidden: true, unattached: true });
export const HiddenSources: Story = {
  args: {
    references: hidden.references,
    preview: (application) => {
      const source = structuredClone(hidden.source);
      source.structures!.structures[0].generation!.applications = [application];
      return buildTshirtArtifacts(source);
    },
  },
};
const nearest = createTshirtFixture({ nearest: true, unattached: true });
export const NearestTargets: Story = {
  args: {
    structure: nearest.structure,
    references: nearest.references,
    preview: (application) => {
      const source = structuredClone(nearest.source);
      source.structures!.structures[0].generation!.applications = [application];
      return buildTshirtArtifacts(source);
    },
  },
};
export const NoRules: Story = { args: { rules: [] } };
const empty = assignStructure(fixture.structure, {
  paddingTop: null,
  paddingRight: null,
  paddingBottom: null,
  paddingLeft: null,
});
export const NoEligibleProperties: Story = {
  args: {
    structure: empty,
    preview: (application) => {
      const source = structuredClone(fixture.source);
      source.structures!.structures[0] = {
        ...empty,
        generation: {
          ...structureGeneration(empty),
          applications: [application],
        },
      };
      return buildTshirtArtifacts(source);
    },
  },
};
export const OverlappingApplications: Story = {
  args: {
    preview: (application) => {
      const source = structuredClone(fixture.source);
      source.structures!.structures[0].generation!.applications = [
        {
          id: "c0000000-0000-4000-8000-000000000031",
          ruleId: fixture.rule.id,
          targets: {
            kind: "custom",
            bindingIds: [structureBinding(fixture.structure, "paddingTop")!.id],
          },
        },
        application,
      ];
      return buildTshirtArtifacts(source);
    },
  },
};
const stale = createTshirtFixture({ unattached: true });
const staleTarget = structureBinding(stale.structure, "paddingTop")!.id;
const staleStructure = assignStructure(stale.structure, { paddingTop: null });
export const StaleTargetRepair: Story = {
  args: {
    structure: staleStructure,
    application: {
      ...stale.application,
      targets: {
        kind: "custom",
        bindingIds: [
          staleTarget,
          structureBinding(stale.structure, "paddingBottom")!.id,
        ],
      },
    },
    preview: (application) => {
      const source = structuredClone(stale.source);
      source.structures!.structures[0] = {
        ...staleStructure,
        generation: {
          ...structureGeneration(staleStructure),
          applications: [application],
        },
      };
      return buildTshirtArtifacts(source);
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Add generation rule" }),
    );
    const element = await body.findByRole("dialog");
    await waitFor(() => expect(element).toBeVisible());
    const dialog = within(element);
    await expect(dialog.getByRole("alert")).toHaveTextContent(
      "no longer token-backed",
    );
    const target = dialog.getByRole("checkbox", { name: "Top padding" });
    await expect(target).toBeChecked();
    await expect(target).not.toBeDisabled();
    await userEvent.click(target);
    await waitFor(() =>
      expect(dialog.getByRole("button", { name: "Apply" })).toBeEnabled(),
    );
    await waitFor(() =>
      expect(dialog.getByText("base-padding-bottom-medium")).toBeVisible(),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Apply" }));
    await expect(args.onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        targets: {
          kind: "custom",
          bindingIds: [structureBinding(stale.structure, "paddingBottom")!.id],
        },
      }),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const ApplyError: Story = {
  render: (args) => (
    <StructureRuleDialog
      {...args}
      onApply={(application) => {
        args.onApply(application);
        throw new Error(
          "The source changed. Review this application before applying.",
        );
      }}
    />
  ),
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
export const Narrow: Story = {
  parameters: { viewport: { defaultViewport: "narrow" } },
};
