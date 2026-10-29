// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { Meta, StoryObj } from "@storybook/react";
import {
  assignStructure,
  createStructure,
} from "../../features/structures/model";
import { resolveStructure } from "../../features/structures/resolution";
import { STRUCTURE_TERM_IDS } from "../../features/structures/vocabulary";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";
import { StructurePreview } from "./StructurePreview";
import { createElement } from "../../features/structures/elements";
import { resolveElements } from "../../features/structures/elementResolution";

const reference: PrimitiveReference = {
  id: "a0000000-0000-8000-8000-000000000001",
  family: "spacing",
  sourceId: "fixture",
  index: 0,
  nativeId: "fixture-spacing",
  name: "spacing-global-100",
  value: 16,
  displayValue: "16px",
  hidden: false,
};
const structure = createStructure(
  "Example",
  "a0000000-0000-4000-8000-000000000001",
);
structure.elements = [createElement("visual"), createElement("visual")];
const layout = {
  availableWidth: 480,
  availableHeight: 240,
  naturalWidth: 130,
  naturalHeight: 66,
};
const spaced = assignStructure(structure, {
  gap: { $ref: reference.id },
  paddingTop: { $ref: reference.id },
  paddingRight: { $ref: reference.id },
  paddingBottom: { $ref: reference.id },
  paddingLeft: { $ref: reference.id },
});
const meta = {
  title: "Views/Structure preview",
  component: StructurePreview,
  args: {
    name: "Example",
    resolved: resolveStructure(structure, []),
    elements: resolveElements(structure, [], []),
  },
  decorators: [
    (Story) => (
      <div
        className={style({ backgroundColor: "pasteboard" })}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 480,
          maxWidth: "100%",
          height: 240,
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StructurePreview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Hug: Story = {};
export const Spacing: Story = {
  args: { resolved: resolveStructure(spaced, [reference], layout) },
};
export const FillAndAlign: Story = {
  name: "Fill and align",
  args: {
    resolved: resolveStructure(
      assignStructure(spaced, {
        width: { value: { kind: "sizing", preset: "fill" } },
        height: { value: { kind: "sizing", preset: "fill" } },
        horizontal: {
          value: { kind: "term", termId: STRUCTURE_TERM_IDS.center },
        },
        vertical: {
          value: { kind: "term", termId: STRUCTURE_TERM_IDS.bottom },
        },
      }),
      [reference],
      layout,
    ),
  },
};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const Invalid: Story = {
  args: { resolved: resolveStructure(spaced, [], layout) },
};
export const Constrained: Story = {
  args: {
    resolved: resolveStructure(
      assignStructure(spaced, {
        maxWidth: { value: { kind: "sizing", preset: "fill" } },
      }),
      [reference],
      layout,
    ),
  },
};
