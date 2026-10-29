// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { TextField } from "@react-spectrum/s2";
import { useState } from "react";
import { createElementFixture } from "../../../tests/fixtures/structureElements";
import { resolveCompositionResult } from "../../features/structures/composition";
import {
  structureCandidates,
  type StructureChild,
} from "../../features/structures/children";
import {
  assignStructure,
  type Structure,
} from "../../features/structures/model";
import { STRUCTURE_TERM_IDS } from "../../features/structures/vocabulary";
import { ELEMENT_CATEGORY_ID } from "../../features/structures/elements";
import { StructureEditorPanel } from "../../panels/structures/StructureEditorPanel";
import { StructurePreview } from "./StructurePreview";

const fixture = createElementFixture();
const layout = {
  availableWidth: 600,
  availableHeight: 300,
  naturalWidth: 60,
  naturalHeight: 40,
};
function ReusableTemplate({
  column = false,
  repeated = false,
  readOnly = false,
  broken = false,
  editor = false,
}: {
  column?: boolean;
  repeated?: boolean;
  readOnly?: boolean;
  broken?: boolean;
  editor?: boolean;
}) {
  const [source, setSource] = useState<Structure>(() => {
    const base = structuredClone(fixture.structures[0]);
    if (repeated)
      base.elements!.push({
        ...base.elements![0],
        id: "d0000000-0000-4000-8000-000000000211",
      });
    return column
      ? assignStructure(base, {
          direction: {
            value: { kind: "term", termId: STRUCTURE_TERM_IDS.vertical },
          },
        })
      : base;
  });
  const [selected, select] = useState<string | null>(null);
  const [label, setLabel] = useState(source.name);
  const [labelError, setLabelError] = useState<string | undefined>();
  const catalog = broken ? [source] : [source, fixture.structures[1]];
  const result = resolveCompositionResult(
    source,
    catalog,
    fixture.references,
    fixture.rules,
    undefined,
    {},
    "m",
    layout,
  );
  const insert = (child: StructureChild, index: number) => {
    setSource((before) => ({
      ...before,
      elements: [
        ...before.elements!.slice(0, index),
        child,
        ...before.elements!.slice(index),
      ],
    }));
    select(child.id);
  };
  return (
    <div
      style={{
        padding: 40,
        background:
          "var(--spectrum-pasteboard-background-color, var(--spectrum-gray-100))",
        minHeight: 240,
      }}
    >
      {result.status === "error" ? (
        <p role="alert">{result.error}</p>
      ) : (
        <>
          <StructurePreview
            name={source.name}
            resolved={result.value.resolved}
            composition={result.value}
            taxonomy={fixture.taxonomy}
            selectedElementId={selected}
            onSelectElement={select}
            structures={structureCandidates(catalog, source.conceptId)}
            onInsert={
              readOnly
                ? undefined
                : (kind, index) =>
                    insert(
                      fixture.create(kind, 300 + source.elements!.length),
                      index,
                    )
            }
            onInsertStructure={
              readOnly
                ? undefined
                : (structureId, index) =>
                    insert(
                      {
                        id: `d0000000-0000-4000-8000-${String(400 + source.elements!.length).padStart(12, "0")}`,
                        kind: "structureReference",
                        structureId,
                      },
                      index,
                    )
            }
          />
          <p role="status">{source.elements!.length} direct children</p>
          {editor && (
            <>
              <TextField
                label="Name"
                value={label}
                onChange={setLabel}
                isReadOnly={readOnly}
                isRequired
                isInvalid={!!labelError}
                errorMessage={labelError}
                onBlur={() => {
                  if (!label.trim()) {
                    setLabelError("Enter a Structure name.");
                    return;
                  }
                  setLabelError(undefined);
                  setSource((before) => ({ ...before, name: label.trim() }));
                }}
              />
              <StructureEditorPanel
                structure={source}
                references={fixture.references}
                layout={layout}
                taxonomy={fixture.taxonomy}
                isReadOnly={readOnly}
                onChange={(changes) =>
                  setSource((before) => assignStructure(before, changes))
                }
                onTokenNaming={({ termId }) => {
                  const term = fixture.taxonomy.terms.find(
                    (term) => term.id === termId,
                  );
                  if (!term)
                    throw new Error(
                      "Choose an existing Registry term in this story.",
                    );
                  setSource((before) => ({
                    ...before,
                    generation: {
                      ...before.generation!,
                      nameRef: { categoryId: term.categoryId, termId: term.id },
                    },
                  }));
                }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
const meta = {
  title: "Views/Reusable Structures",
  component: ReusableTemplate,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ReusableTemplate>;
export default meta;
type Story = StoryObj<typeof meta>;
export const GroupedInsertion: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    canvas.getByRole("button", { name: "Add element at position 2" }).focus();
    await userEvent.click(
      canvas.getByRole("button", { name: "Add element at position 2" }),
    );
    await waitFor(() =>
      expect(body.getByRole("group", { name: "Elements" })).toBeVisible(),
    );
    const group = await body.findByRole("group", { name: "Structures" });
    await userEvent.click(
      within(group).getByRole("menuitem", { name: "Text" }),
    );
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "2 direct children",
    );
    await expect(
      canvas.getByRole("button", { name: "Text Structure instance 2" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      canvas.queryByRole("button", { name: /Text element/ }),
    ).not.toBeInTheDocument();
    canvasElement.dataset.playComplete = "true";
  },
};
export const VerticalInsertion: Story = {
  args: { column: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    canvas.getByRole("button", { name: "Add element at position 1" }).focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.click(await body.findByRole("menuitem", { name: "Bar" }));
    await expect(
      canvas.getByRole("button", { name: "Bar element 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Add element at position 1" }),
      ).toHaveFocus(),
    );
    await userEvent.keyboard("{Escape}");
    await expect(
      canvas.getByRole("group", { name: "Base structure preview" }),
    ).toHaveFocus();
    canvasElement.dataset.playComplete = "true";
  },
};
export const IndependentNaming: Story = {
  args: { editor: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    const label = canvas.getByRole("textbox", { name: "Name" });
    await userEvent.clear(label);
    await userEvent.type(label, "Module example");
    await userEvent.tab();
    const naming = canvas.getByRole("combobox", { name: "Token naming" });
    await expect(naming).toHaveValue("Base");
    await userEvent.clear(naming);
    await userEvent.type(naming, "Visual");
    await userEvent.click(await body.findByRole("option", { name: "Visual" }));
    await expect(label).toHaveValue("Module example");
    await expect(naming).toHaveValue(
      String(
        fixture.taxonomy.terms.find(
          (term) =>
            term.categoryId === ELEMENT_CATEGORY_ID && term.value === "Visual",
        )!.value,
      ),
    );
    await userEvent.click(canvas.getByRole("radio", { name: "Vertical" }));
    await expect(
      canvas.getByRole("group", { name: "Module example structure preview" }),
    ).toHaveAttribute("data-direction", "vertical");
    canvasElement.dataset.playComplete = "true";
  },
};
export const RepeatedModules: Story = { args: { repeated: true } };
export const ReadOnly: Story = {
  args: { repeated: true, readOnly: true, editor: true },
};
export const MissingSource: Story = { args: { broken: true } };
