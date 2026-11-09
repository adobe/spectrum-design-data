// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { ColorOpacityTable } from "./ColorOpacityTable";
import { migrationTokensFixture } from "../../../tests/fixtures/migration-tokens";
import type { ReferenceOverrideEligibility } from "../../features/design-data/referenceOverrides";
import "./AnalysisView.css";

const assessment = migrationTokensFixture();
const eligibility = new Map<string, ReferenceOverrideEligibility>(
  assessment.concepts.flatMap((concept) =>
    concept.rows.map((row): [string, ReferenceOverrideEligibility] => [
      row.id,
      row.verdict === "unassessable" ||
      (typeof row.referenceValue !== "number" &&
        typeof row.referenceValue !== "string")
        ? {
            targets: [],
            reason: "Motion generation is not available in Studio.",
          }
        : {
            targets: [
              {
                tokenId: concept.id,
                modeKey: row.id,
                assignment: { kind: "literal", value: row.referenceValue },
              },
            ],
          },
    ]),
  ),
);
const meta = {
  title: "Analysis/Token comparison",
  component: ColorOpacityTable,
  args: { assessment, eligibility, onBulkEdit: fn() },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ width: 1440, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ColorOpacityTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AllModes: Story = {
  name: "All-mode tree and mixed results",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "All modes Color scheme" }),
    ).toHaveTextContent("All modes");
    const table = canvas.getByRole("treegrid", { name: "Token mode values" });
    await expect(table).toBeVisible();
    await userEvent.click(
      within(table).getByRole("columnheader", { name: "Name" }),
    );
    await userEvent.keyboard(
      "{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}",
    );
    await expect(
      await within(table).findByRole("columnheader", { name: "Difference" }),
    ).toBeVisible();
    const wrappers = canvasElement.querySelectorAll<HTMLElement>(
      ".analysisValueTable",
    );
    for (const wrapper of wrappers) {
      const table = wrapper.firstElementChild!;
      await expect(table.getBoundingClientRect().height).toBeGreaterThan(0);
      await expect(wrapper.getBoundingClientRect().height).toBeLessThanOrEqual(
        table.getBoundingClientRect().height + 20,
      );
    }
    canvasElement.dataset.playComplete = "true";
  },
};
export const FilteredMode: Story = {
  name: "Filtered mode uses flat rows",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "All modes Color scheme" }),
    );
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole("option", {
        name: "Light",
      }),
    );
    await expect(
      canvas.getByRole("grid", { name: "Token mode values" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("treegrid", { name: "Token mode values" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /spacing-100.*Light/ }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Selection: Story = {
  name: "Selection and bulk action",
  args: { isEditing: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Select gray-100" }),
    );
    const all = canvas.getByRole("checkbox", { name: "Select all" });
    await expect(all).toBePartiallyChecked();
    await userEvent.click(canvas.getByRole("button", { name: "Bulk edit" }));
    await expect(args.onBulkEdit).toHaveBeenCalledWith(
      expect.arrayContaining(
        assessment.concepts
          .find((concept) => concept.id === "gray-100")!
          .rows.map((row) => row.id),
      ),
    );
    await userEvent.click(all);
    await expect(all).toBeChecked();
    await expect(
      canvas.getByRole("checkbox", { name: "Select duration-100" }),
    ).toBeDisabled();
    canvasElement.dataset.playComplete = "true";
  },
};
export const AllUnavailable: Story = {
  name: "All values unavailable",
  args: { assessment: migrationTokensFixture(), eligibility: new Map() },
  render: (args) => (
    <ColorOpacityTable
      {...args}
      assessment={{
        ...args.assessment,
        concepts: args.assessment.concepts.filter(
          (concept) => concept.type === "motion",
        ),
        modeBreakdown: args.assessment.modeBreakdown.map((row) => ({
          ...row,
          values: 1,
          tokens: 1,
          counts: { pass: 0, fail: 0, acceptable: 0, unassessable: 1 },
          alignedPercent: null,
        })),
      }}
    />
  ),
};
export const Empty: Story = {
  args: {
    assessment: {
      ...assessment,
      concepts: [],
      modeBreakdown: [],
      enhancements: [],
    },
  },
};
export const Dark: Story = {
  globals: { colorScheme: "dark" },
  play: AllModes.play,
};
export const Narrow: Story = {
  globals: { viewport: { value: "narrow", isRotated: false } },
  play: AllModes.play,
};
