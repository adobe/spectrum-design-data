// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { createTshirtFixture } from "../../../tests/fixtures/tshirt";
import { buildTshirtArtifacts } from "../../features/design-data/tshirtArtifacts";
import { assignStructure } from "../../features/structures/model";
import { SIZE_TERM_IDS } from "../../features/taxonomy/variantVocabulary";
import { StructurePermutationsView } from "./StructurePermutationsView";

const fixture = createTshirtFixture({ fiveSizes: true });
const surfaceStyles = style({
  width: "full",
  maxWidth: "[1500px]",
  minHeight: "[100vh]",
  backgroundColor: "pasteboard",
});
const meta = {
  title: "Views/Structure size permutations",
  component: StructurePermutationsView,
  args: {
    structure: fixture.structure,
    bundle: fixture.bundle,
    references: fixture.references,
    selection: fixture.selection,
  },
  decorators: [
    (Story) => (
      <div className={surfaceStyles}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StructurePermutationsView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FiveSizes: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of [
      "Extra small",
      "Small",
      "Medium",
      "Large",
      "Extra large",
    ])
      await expect(canvas.getByRole("heading", { name })).toBeVisible();
    await expect(canvas.getAllByRole("img")).toHaveLength(5);
    canvasElement.dataset.playComplete = "true";
  },
};
const medium = createTshirtFixture();
medium.structure.generation!.sizeTermIds = [SIZE_TERM_IDS.m];
export const MediumOnly: Story = {
  args: {
    structure: medium.structure,
    bundle: buildTshirtArtifacts(medium.source),
    references: medium.references,
    selection: medium.selection,
  },
};
const asymmetric = createTshirtFixture({ asymmetric: true, fiveSizes: true });
export const AsymmetricPadding: Story = {
  args: { structure: asymmetric.structure, bundle: asymmetric.bundle },
};
const hidden = createTshirtFixture({ hidden: true, fiveSizes: true });
export const HiddenLiterals: Story = {
  args: {
    structure: hidden.structure,
    bundle: hidden.bundle,
    references: hidden.references,
  },
};
const nearest = createTshirtFixture({ nearest: true, fiveSizes: true });
export const NearestTargets: Story = {
  args: {
    structure: nearest.structure,
    bundle: nearest.bundle,
    references: nearest.references,
  },
};
const constrained = createTshirtFixture({ fiveSizes: true });
const minWidth = constrained.references.find(
  (reference) => reference.family === "size" && reference.step === 100,
)!;
constrained.source.structures!.structures[0] = assignStructure(
  constrained.structure,
  { minWidth: { $ref: minWidth.id } },
);
export const Constraints: Story = {
  args: {
    structure: constrained.source.structures!.structures[0],
    bundle: buildTshirtArtifacts(constrained.source),
  },
};
const unattached = createTshirtFixture({ unattached: true });
export const NoApplication: Story = {
  args: {
    structure: unattached.structure,
    bundle: unattached.bundle,
    references: unattached.references,
  },
};
export const NoSelection: Story = { args: { structure: null } };
export const GenerationError: Story = {
  args: {
    bundle: undefined,
    error:
      "Top padding is no longer token-backed. Restore its token or edit the application.",
  },
};
export const AdaptivePreview: Story = { args: { isPreview: true } };
export const Dark: Story = { globals: { colorScheme: "dark" } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 360, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};
