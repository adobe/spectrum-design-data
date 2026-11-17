// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { ClassificationTerms } from "./ClassificationTerms";
import type {
  Classification,
  TaxonomyCategory,
  TaxonomyDocument,
} from "../../features/taxonomy/model";

const category = (
  id: string,
  name: string,
  description: string,
  overrides: Partial<TaxonomyCategory> = {},
): TaxonomyCategory => ({
  id,
  key: id,
  name,
  description,
  valueType: "string",
  cardinality: "one",
  scopes: ["colors", "spacing"],
  required: false,
  includeInProjections: true,
  ...overrides,
});

const taxonomy: TaxonomyDocument = {
  schemaVersion: 1,
  order: ["role", "family", "variant"],
  classifications: {},
  categories: [
    category("role", "Color role", "What the color communicates."),
    category("family", "Color family", "Hue group, such as blue or red.", {
      scopes: ["colors"],
    }),
    category("variant", "Variant", ""),
  ],
  terms: [
    {
      id: "accent",
      categoryId: "role",
      value: "accent",
      description: "Primary emphasis.",
    },
    {
      id: "negative",
      categoryId: "role",
      value: "negative",
      description: "Errors and destructive actions.",
    },
    { id: "blue", categoryId: "family", value: "blue", description: "" },
    { id: "red", categoryId: "family", value: "red", description: "" },
  ],
};

function Controlled(args: {
  value: Classification;
  scope: "colors" | "spacing";
  onChange: (value: Classification) => void;
  formulaValue?: Classification;
  description?: string;
  errorMessage?: string;
}) {
  const [value, setValue] = useState(args.value);
  return (
    <ClassificationTerms
      value={value}
      taxonomy={taxonomy}
      scope={args.scope}
      tier="semantic"
      formulaValue={args.formulaValue}
      description={args.description}
      errorMessage={args.errorMessage}
      onChange={(next) => {
        setValue(next);
        args.onChange(next);
      }}
    />
  );
}

const meta = {
  title: "Panels/Token inspector/Classification terms",
  component: Controlled,
  args: { value: {}, scope: "colors", onChange: fn() },
} satisfies Meta<typeof Controlled>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Browse: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole("button", { name: "Add term" }));
    const role = await body.findByRole("menuitem", { name: "Color role" });
    await expect(body.getByText("What the color communicates.")).toBeVisible();
    await userEvent.click(role);
    await expect(body.getByText("Primary emphasis.")).toBeVisible();
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Negative" }),
    );
    await expect(args.onChange).toHaveBeenCalledWith({ role: "negative" });
    await expect(
      await body.findByRole("gridcell", { name: /Color role: Negative/ }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

export const Search: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole("button", { name: "Add term" }));
    await userEvent.type(await body.findByLabelText("Search terms"), "hue");
    await expect(
      await body.findByRole("menuitem", { name: "Blue" }),
    ).toBeVisible();
    await expect(
      body.queryByRole("menuitem", { name: "Accent" }),
    ).not.toBeInTheDocument();
    await userEvent.click(body.getByRole("menuitem", { name: "Red" }));
    await expect(args.onChange).toHaveBeenCalledWith({ family: "red" });
    canvasElement.dataset.playComplete = "true";
  },
};

export const EditTag: Story = {
  args: { value: { role: "accent" } },
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByText("Accent", { exact: true }));
    await expect(await body.findByText("Change Color role")).toBeVisible();
    await expect(
      body.queryByRole("menuitem", { name: "Color family" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Negative" }),
    );
    await expect(args.onChange).toHaveBeenCalledWith({ role: "negative" });
    canvasElement.dataset.playComplete = "true";
  },
};

export const EmptyCategory: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole("button", { name: "Add term" }));
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Variant" }),
    );
    await waitFor(() => expect(body.getByText("No terms yet")).toBeVisible());
    await expect(
      body.getByText("Visit Registry to add new terms."),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

export const FormulaOverride: Story = {
  args: {
    value: { family: "blue", role: "negative" },
    formulaValue: { family: "blue", role: "accent" },
    errorMessage: "Classification overrides formula-generated classification.",
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(
      body.getByText(
        "Classification overrides formula-generated classification.",
      ),
    ).toBeVisible();
    await expect(body.getAllByLabelText("Overrides formula")).toHaveLength(1);
    await expect(
      body.getByRole("gridcell", { name: /Color role: Negative/ }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

export const SpacingToken: Story = {
  args: { scope: "spacing", value: { role: "accent" } },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole("button", { name: "Add term" }));
    await expect(
      await body.findByRole("menuitem", { name: "Variant" }),
    ).toBeVisible();
    await expect(
      body.queryByRole("menuitem", { name: "Color family" }),
    ).not.toBeInTheDocument();
    await expect(
      body.queryByRole("menuitem", { name: "Color role" }),
    ).not.toBeInTheDocument();
    canvasElement.dataset.playComplete = "true";
  },
};
