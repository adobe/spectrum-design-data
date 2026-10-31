// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import defaults from "../../data/design-system.defaults.json";
import type { ComponentsDocument } from "../../features/components/model";
import {
  isComponentsDocument,
  assertComponentDocument,
} from "../../features/components/validation";
import { isTaxonomyDocument } from "../../features/taxonomy/model";
import { ComponentDataView } from "./ComponentDataView";
import { ComponentsPanel } from "../../panels/components/ComponentsPanel";
import { useComponentNavigation } from "../../panels/components/useComponentNavigation";
import { useNotify } from "../../components/notifications/notificationContext";
import { AlertDialog, DialogContainer } from "@react-spectrum/s2";

const input: unknown = defaults.system.components;
const registry: unknown = defaults.system.taxonomy;
if (!isComponentsDocument(input) || !isTaxonomyDocument(registry))
  throw new Error("Invalid component story defaults.");
const taxonomy = registry;
const document: ComponentsDocument = structuredClone(input);
for (const component of document.components)
  component.assignments = component.assignments.map((row) => {
    const { $ref, ...fields } = row;
    void $ref;
    const property = String(
      taxonomy.terms.find((term) => term.id === row.property.termId)!.value,
    ).toLowerCase();
    return {
      ...fields,
      value:
        property === "color"
          ? "rgb(0, 0, 0)"
          : property === "opacity"
            ? 1
            : "4px",
    };
  });
const catalog = document.components.map((component) => ({
  id: component.id,
  name: component.declaration.displayName,
  group: component.declaration.meta.category,
  configured: true,
}));
const meta = {
  title: "Views/Component data",
  component: ComponentDataView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="componentStory">
        <Story />
      </div>
    ),
  ],
  args: {
    document,
    catalog,
    taxonomy,
    tokens: [],
    editable: true,
    selected: document.components[0].id,
    onCommit: fn(),
    onSelect: fn(),
  },
  render: function Controlled(args) {
    const notify = useNotify();
    const [current, setCurrent] = useState(args.document),
      [selected, setSelected] = useState(args.selected);
    const navigation = useComponentNavigation(args.editable, (id) => {
      setSelected(id);
      args.onSelect(id);
    });
    const entries = [
      ...current.components.map((component) => ({
        id: component.id,
        name: component.declaration.displayName,
        group: component.declaration.meta.category,
        configured: true,
      })),
      ...args.catalog.filter((entry) => !entry.configured),
    ];
    return (
      <div className="componentsLayout" data-component="Components">
        <ComponentsPanel
          catalog={entries}
          selected={selected}
          editable={args.editable}
          search={navigation.search}
          onSearch={navigation.setSearch}
          onSelect={navigation.select}
          onAdd={() => navigation.create()}
        />
        <ComponentDataView
          {...args}
          key={`${args.editable}:${selected ?? ""}`}
          document={current}
          selected={selected}
          catalog={entries}
          creating={navigation.creating}
          onCreate={navigation.create}
          onCloseCreation={() => navigation.setCreating(undefined)}
          onCreated={() => {
            navigation.setCreating(undefined);
            navigation.setSearch("");
          }}
          onDefinitionDirtyChange={navigation.setDefinitionDirty}
          draftVersion={navigation.draftVersion}
          onSelect={(id) => {
            setSelected(id);
            args.onSelect(id);
          }}
          onCommit={(next) => {
            assertComponentDocument(next, taxonomy);
            setCurrent(next);
            args.onCommit(next);
          }}
        />
        <DialogContainer onDismiss={() => navigation.setPending(undefined)}>
          {navigation.pending && (
            <AlertDialog
              title="Discard unapplied changes"
              variant="warning"
              primaryActionLabel="Discard"
              cancelLabel="Keep editing"
              onPrimaryAction={() => notify.quietly(navigation.discard)}
            >
              Your definition edits have not been applied. Discard them to
              continue.
            </AlertDialog>
          )}
        </DialogContainer>
      </div>
    );
  },
} satisfies Meta<typeof ComponentDataView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ActionButton: Story = {};
export const Menu: Story = { args: { selected: document.components[1].id } };
export const ReadOnly: Story = {
  name: "Read-only data",
  args: { editable: false },
};
export const Empty: Story = {
  args: { document: { schemaVersion: 2, components: [] }, selected: null },
};
export const ReferenceError: Story = {
  name: "Unavailable references",
  args: { referenceError: "A selected source is not published." },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 390, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};
export const OrderedParts: Story = {
  name: "Edit and reorder Menu parts",
  args: { selected: document.components[1].id },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("tab", { name: "Parts" }));
    await expect(canvas.getByText("menu-item", { exact: true })).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit part label" }),
    );
    const dialog = within(
      await body.findByRole("dialog", { name: "Edit part" }),
    );
    const name = dialog.getByRole("textbox", { name: "Part name" });
    await expect(name).toHaveFocus();
    await userEvent.clear(name);
    await userEvent.type(name, "caption");
    await userEvent.click(
      dialog.getByRole("button", { name: "Apply changes" }),
    );
    await expect(canvas.getByText("caption", { exact: true })).toBeVisible();
    const drag = canvas.getByRole("button", { name: "Drag caption" });
    drag.focus();
    await userEvent.keyboard("{Enter}{ArrowUp}{Enter}");
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete part caption" }),
    );
    await expect(canvas.getByRole("alert")).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
