// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { NotificationProvider } from "../../components/notifications/NotificationProvider";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import {
  createBooleanProperty,
  createVariantProperty,
} from "../../features/option-groups/model";
import {
  emptyStructureEditor,
  EMPTY_STRUCTURE_PREVIEW,
  type StructureEditorData,
} from "../../features/structures/variants";
import { restoreEditorRemoval } from "../../features/structures/variantOperations";
import { StructureProperties } from "./StructureProperties";
import "../../views/structures/StructureDesignView.css";

const behavior = "357cb46e-6da2-42d2-bf6d-750a4e44982b";
const placement = "0358a87a-a349-4c0c-9788-0ee32dcb64e2";
const position = "c9ae5d62-127f-4f70-b4e8-a886a73e612c";
const start = "d586c658-cfb7-46e9-a6d1-299c6a93bfd1";
const end = "4ea1b2f6-d4ba-4e8e-917d-b1207101b360";
const initialTaxonomy: TaxonomyDocument = {
  schemaVersion: 1,
  categories: [
    {
      id: behavior,
      key: "behavior",
      name: "Behavior",
      description: "",
      valueType: "string",
      cardinality: "one",
      scopes: ["structures"],
      required: false,
      includeInProjections: true,
    },
    {
      id: placement,
      key: "placement",
      name: "Placement",
      description: "",
      valueType: "string",
      cardinality: "one",
      scopes: ["structures"],
      required: false,
      includeInProjections: true,
    },
  ],
  terms: [
    {
      id: position,
      categoryId: behavior,
      value: "icon-position",
      description: "",
    },
    { id: start, categoryId: placement, value: "start", description: "" },
    { id: end, categoryId: placement, value: "end", description: "" },
  ],
  order: [behavior, placement],
  classifications: {},
};

function PropertiesHarness({
  empty = false,
  isReadOnly = false,
}: {
  empty?: boolean;
  isReadOnly?: boolean;
}) {
  const [taxonomy, setTaxonomy] = useState(initialTaxonomy);
  const [editor, setEditor] = useState<StructureEditorData>(() => ({
    ...emptyStructureEditor(),
    properties: empty
      ? []
      : [
          createVariantProperty("Icon position", { [behavior]: position }, [
            { name: "Start", classification: { [placement]: start } },
            { name: "End", classification: { [placement]: end } },
          ]),
          createBooleanProperty("Has icon"),
        ],
  }));
  const [preview, setPreview] = useState(EMPTY_STRUCTURE_PREVIEW);
  const [error, setError] = useState("");
  const boolean = editor.properties.find(
    (property) => property.kind === "boolean",
  );
  return (
    <NotificationProvider>
      <div style={{ width: 320, maxWidth: "100%" }}>
        <NestedPanelAccordion defaultExpandedKeys={["properties"]}>
          <StructureProperties
            editor={editor}
            taxonomy={taxonomy}
            preview={preview}
            isReadOnly={isReadOnly}
            onPreview={(patch) =>
              setPreview((current) => ({ ...current, ...patch }))
            }
            onChange={(next, registry) => {
              setEditor(next);
              if (registry) setTaxonomy(registry);
            }}
            onUndo={(before, after) =>
              setEditor((current) =>
                restoreEditorRemoval(current, before, after),
              )
            }
            report={(failure) =>
              setError(
                failure instanceof Error ? failure.message : String(failure),
              )
            }
          />
        </NestedPanelAccordion>
        <p role="status">
          {editor.properties.length} properties; icon preview:{" "}
          {boolean && (preview.booleans[boolean.id] ?? boolean.defaultValue)
            ? "visible"
            : "hidden"}
        </p>
        {error && <p role="alert">{error}</p>}
      </div>
    </NotificationProvider>
  );
}

const meta = {
  title: "Panels/Structure properties",
  component: PropertiesHarness,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PropertiesHarness>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PreviewOnlyBoolean: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("switch", { name: "Has icon" }));
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "2 properties; icon preview: hidden",
    );
    await expect(
      canvas.getByRole("button", { name: "boolean option not used" }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const InlineOptionName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Start" }));
    const field = await canvas.findByRole("textbox", { name: "Option name" });
    await expect(field).toHaveFocus();
    await expect(field).toHaveValue("Start");
    await userEvent.keyboard("{Escape}");
    await expect(
      canvas.queryByRole("textbox", { name: "Option name" }),
    ).not.toBeInTheDocument();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Empty: Story = {
  args: { empty: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Add property" }),
    ).toBeVisible();
    await expect(canvas.getByRole("status")).toHaveTextContent("0 properties");
    canvasElement.dataset.playComplete = "true";
  },
};
export const InlinePropertyName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit property Icon position" }),
    );
    const field = await canvas.findByRole("textbox", { name: "Property name" });
    await expect(field).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(
      canvas.queryByRole("textbox", { name: "Property name" }),
    ).not.toBeInTheDocument();
    canvasElement.dataset.playComplete = "true";
  },
};
export const ReadOnly: Story = {
  args: { isReadOnly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Add property" }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("switch", { name: "Has icon" }));
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "icon preview: hidden",
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
