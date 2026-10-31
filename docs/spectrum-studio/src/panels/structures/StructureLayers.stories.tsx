// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { NotificationProvider } from "../../components/notifications/NotificationProvider";
import { createBooleanProperty } from "../../features/option-groups/model";
import { createElement } from "../../features/structures/elements";
import {
  createStructure,
  type Structure,
} from "../../features/structures/model";
import {
  emptyStructureEditor,
  reconcileVariantLayers,
  resolveStructureOptions,
  structureEditor,
} from "../../features/structures/variants";
import { StructureLayers } from "./StructureLayers";
import "../../views/structures/StructureDesignView.css";

function LayersHarness({
  isReadOnly = false,
  empty = false,
}: {
  isReadOnly?: boolean;
  empty?: boolean;
}) {
  const [structure, setStructure] = useState<Structure>(() => {
    const text = createElement("text");
    const icon = createElement("workflowIcon");
    const boolean = createBooleanProperty("Has icon");
    return {
      ...createStructure("Example"),
      elements: empty ? [] : [text, icon, createElement("bar")],
      editor: {
        ...emptyStructureEditor(),
        properties: [boolean],
        visibilityBindings: empty
          ? {}
          : { [icon.id]: { propertyId: boolean.id, inverted: false } },
      },
    };
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const resolved = resolveStructureOptions(structure);
  return (
    <NotificationProvider>
      <div style={{ width: 360, maxWidth: "100%" }}>
        <StructureLayers
          structure={structure}
          catalog={[structure]}
          order={(structure.elements ?? []).map((child) => child.id)}
          visibility={resolved.visibility}
          selectedId={selectedId}
          isReadOnly={isReadOnly}
          onSelect={setSelectedId}
          onChange={(editor) =>
            setStructure((current) => ({ ...current, editor }))
          }
          onVisibility={(id, visible) =>
            setStructure((current) => ({
              ...current,
              editor: {
                ...structureEditor(current),
                visibility: {
                  ...structureEditor(current).visibility,
                  [id]: visible,
                },
              },
            }))
          }
          onOrder={(order) =>
            setStructure((current) => ({
              ...current,
              elements: order.map((id) => {
                const child = current.elements?.find((item) => item.id === id);
                if (!child)
                  throw new Error("The reordered layer is unavailable.");
                return child;
              }),
            }))
          }
          onDelete={(id) => {
            setStructure((current) =>
              reconcileVariantLayers({
                ...current,
                elements: current.elements?.filter((child) => child.id !== id),
              }),
            );
            setSelectedId(null);
          }}
          report={(failure) =>
            setError(
              failure instanceof Error ? failure.message : String(failure),
            )
          }
        />
        <p role="status">
          {resolved.structure.elements?.length ?? 0} visible layers
        </p>
        {error && <p role="alert">{error}</p>}
      </div>
    </NotificationProvider>
  );
}

const meta = {
  title: "Panels/Structure layers",
  component: LayersHarness,
  parameters: { layout: "padded" },
} satisfies Meta<typeof LayersHarness>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SelectAndHide: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Main structure")).toBeVisible();
    const text = canvas.getByText("Text");
    await userEvent.click(text);
    await expect(text.closest('[role="row"]')).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const hide = canvas.getByRole("button", { name: "Hide Text" });
    hide.focus();
    await expect(hide).toBeVisible();
    await userEvent.click(hide);
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "2 visible layers",
    );
    await expect(
      canvas.getByRole("button", { name: "Show Text" }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Empty: Story = {
  args: { empty: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Main structure")).toBeVisible();
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "0 visible layers",
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const ReadOnly: Story = {
  args: { isReadOnly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Hide Text" }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByText("Text"));
    await expect(
      canvas.getByText("Text").closest('[role="row"]'),
    ).toHaveAttribute("aria-selected", "true");
    canvasElement.dataset.playComplete = "true";
  },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
