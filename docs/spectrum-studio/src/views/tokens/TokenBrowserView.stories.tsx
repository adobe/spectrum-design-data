// Copyright 2026 Adobe. All rights reserved.
import { Provider } from "@react-spectrum/s2";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import {
  aliasStoryTokens,
  browserStoryTokens,
  hierarchyStoryTokens,
  prefixStoryTokens,
  singletonStoryTokens,
} from "../../../tests/fixtures/token-browser";
import {
  TokenBrowserView,
  type TokenBrowserViewProps,
} from "./TokenBrowserView";

function ControlledBrowser(args: TokenBrowserViewProps) {
  const [query, setQuery] = useState(args.query);
  const [type, setType] = useState(args.type);
  const [view, setView] = useState(args.view);
  const [selectedIds, setSelectedIds] = useState(args.selectedIds);
  return (
    <TokenBrowserView
      {...args}
      query={query}
      type={type}
      view={view}
      selectedIds={selectedIds}
      onQueryChange={(value) => {
        setQuery(value);
        setSelectedIds(new Set());
        args.onQueryChange(value);
      }}
      onTypeChange={(value) => {
        setType(value);
        setSelectedIds(new Set());
        args.onTypeChange(value);
      }}
      onViewChange={(value) => {
        setView(value);
        args.onViewChange(value);
      }}
      onSelectionChange={(value) => {
        setSelectedIds(value);
        args.onSelectionChange(value);
      }}
    />
  );
}

const meta = {
  title: "Views/Token browser",
  component: TokenBrowserView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", minHeight: 360 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <ControlledBrowser {...args} />,
  args: {
    tokens: browserStoryTokens,
    isEditing: false,
    query: "",
    type: "all",
    view: "list",
    selectedIds: new Set<string>(),
    onQueryChange: fn(),
    onTypeChange: fn(),
    onViewChange: fn(),
    onSelectionChange: fn(),
    onOpen: fn(),
    onBulkEdit: fn(),
  },
} satisfies Meta<typeof TokenBrowserView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", {
        name: "Export standard-compliant taxonomy",
      }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", {
        name: "Export taxonomy compatibility packet",
      }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", {
        name: "Export generated compatibility bundle",
      }),
    ).not.toBeInTheDocument();
    await userEvent.type(
      canvas.getByRole("searchbox", { name: "Search tokens" }),
      "red 100",
    );
    await waitFor(() =>
      expect(canvas.getByRole("row", { name: "Red color 100" })).toBeVisible(),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Open red-color-100" }),
    );
    await userEvent.clear(
      canvas.getByRole("searchbox", { name: "Search tokens" }),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const Editing: Story = {
  args: { isEditing: true, type: "spacing" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = within(
      await canvas.findByRole("row", { name: "100" }),
    ).getByRole("checkbox");
    await userEvent.click(checkbox);
    await waitFor(() =>
      expect(
        canvas.getByRole("checkbox", { name: "Select Spacing 100" }),
      ).toBeChecked(),
    );
    await userEvent.click(canvas.getByRole("radio", { name: "Grid view" }));
    await waitFor(() =>
      expect(canvas.getAllByRole("checkbox", { checked: true })).toHaveLength(
        1,
      ),
    );
    await expect(
      canvas.getByRole("button", { name: "Bulk edit" }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Grid: Story = { args: { view: "grid" } };
export const Empty: Story = { args: { tokens: [] } };
export const NoMatches: Story = { args: { query: "unknown token" } };
export const Dark: Story = {
  args: { view: "grid", isEditing: true },
  decorators: [
    (Story) => (
      <Provider colorScheme="dark" UNSAFE_className="spectrum spectrum--dark">
        <Story />
      </Provider>
    ),
  ],
};
export const Narrow: Story = {
  args: { view: "grid", isEditing: true },
  decorators: [
    (Story) => (
      <div style={{ width: 360, height: 760 }}>
        <Story />
      </div>
    ),
  ],
};

export const Singleton: Story = {
  args: {
    tokens: singletonStoryTokens,
    classificationIssues: new Map([
      [
        singletonStoryTokens[0].id,
        [
          "The proposed standard has not finalized how this color source name should be recorded.",
        ],
      ],
    ]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("row", { name: "Illustrator orange color" }),
    ).toBeVisible();
    await expect(canvas.getAllByRole("row")).toHaveLength(2);
    await expect(canvas.queryByText("Color name:")).not.toBeInTheDocument();
    const scroll = canvasElement.querySelector<HTMLDivElement>(
      ".tokenCollectionScroll",
    )!;
    scroll.scrollLeft = scroll.scrollWidth;
    await expect(
      await canvas.findByRole("button", {
        name: "Open illustrator-orange-color",
      }),
    ).toBeVisible();
    scroll.scrollLeft = 0;
    await waitFor(() =>
      expect(canvas.getByRole("rowheader")).toHaveTextContent(
        "Illustrator orange color",
      ),
    );
    canvasElement.dataset.playComplete = "true";
  },
};

export const ParentSelection: Story = {
  args: { tokens: hierarchyStoryTokens, isEditing: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("row", { name: /^(Collapse|Expand) Red color$/ });
    const parentCheckbox = () =>
      canvas.getByRole("checkbox", { name: "Select Red color" });
    const firstCheckbox = within(
      canvas.getByRole("row", { name: "100" }),
    ).getByRole("checkbox");
    await userEvent.click(firstCheckbox);
    await waitFor(() => expect(parentCheckbox()).toBePartiallyChecked());
    await userEvent.click(parentCheckbox());
    await waitFor(() => expect(parentCheckbox()).toBeChecked());
    await expect(canvas.getByRole("status")).toHaveTextContent("3 tokens");
    await expect(canvas.getByRole("status")).toHaveTextContent("2 selected");
    await userEvent.click(
      canvas.getByRole("button", { name: "Collapse Red color" }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole("row", { name: "100" }),
      ).not.toBeInTheDocument(),
    );
    parentCheckbox().focus();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(parentCheckbox()).not.toBeChecked());
    parentCheckbox().focus();
    await userEvent.keyboard(" ");
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("2 selected"),
    );
    await userEvent.click(canvas.getByRole("radio", { name: "Grid view" }));
    await waitFor(() =>
      expect(canvas.getAllByRole("checkbox", { checked: true })).toHaveLength(
        2,
      ),
    );
    await expect(canvas.getByRole("heading", { name: "Red" })).toBeVisible();
    await userEvent.click(canvas.getByRole("radio", { name: "List view" }));
    await waitFor(() =>
      expect(
        within(
          canvas.getByRole("row", { name: /^(Collapse|Expand) Red color$/ }),
        ).getByRole("checkbox"),
      ).toBeChecked(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};

export const TokenAsParent: Story = {
  args: { tokens: prefixStoryTokens, isEditing: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const parent = await canvas.findByRole("row", {
      name: /^(Collapse|Expand) Red color$/,
    });
    await expect(
      within(parent).getByRole("button", { name: "Open red-color" }),
    ).toBeVisible();
    await expect(
      canvas.getAllByRole("button", { name: /^Open / }),
    ).toHaveLength(3);
    await userEvent.click(within(parent).getByRole("checkbox"));
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("3 selected"),
    );
    await userEvent.click(
      within(canvas.getByRole("row", { name: "100" })).getByRole("checkbox"),
    );
    await waitFor(() =>
      expect(within(parent).getByRole("checkbox")).toBePartiallyChecked(),
    );
    await expect(canvas.getByRole("status")).toHaveTextContent("2 selected");
    canvasElement.dataset.playComplete = "true";
  },
};

export const FilteredSelection: Story = {
  args: { tokens: hierarchyStoryTokens, isEditing: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole("searchbox", { name: "Search tokens" }),
      "red 100",
    );
    await waitFor(() =>
      expect(canvas.getByRole("row", { name: "Red color 100" })).toBeVisible(),
    );
    await userEvent.click(
      within(canvas.getByRole("row", { name: "Red color 100" })).getByRole(
        "checkbox",
      ),
    );
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("1 selected"),
    );
    await userEvent.clear(
      canvas.getByRole("searchbox", { name: "Search tokens" }),
    );
    await waitFor(() =>
      expect(canvas.getByRole("status")).not.toHaveTextContent("selected"),
    );
    await expect(
      canvas.getByRole("row", { name: /^(Collapse|Expand) Red color$/ }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};

export const ReadOnlyAliases: Story = {
  args: { tokens: aliasStoryTokens, isEditing: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      within(
        await canvas.findByRole("row", { name: "old-red Alias" }),
      ).queryByRole("checkbox"),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select all" }));
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("3 selected"),
    );
    await userEvent.click(canvas.getByRole("radio", { name: "Grid view" }));
    await expect(
      canvas.getByRole("heading", { name: "Compatibility aliases" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("checkbox", { name: /old-red/ }),
    ).toBeDisabled();
    canvasElement.dataset.playComplete = "true";
  },
};

export const Exports: Story = {
  args: {
    onExport: fn(),
    onExportCompatibility: fn(),
    onExportGenerated: fn(),
    canExportGenerated: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    for (const view of ["List view", "Grid view"]) {
      await userEvent.click(canvas.getByRole("radio", { name: view }));
      await userEvent.click(
        canvas.getByRole("button", {
          name: "Export standard-compliant taxonomy",
        }),
      );
      await userEvent.click(
        canvas.getByRole("button", {
          name: "Export taxonomy compatibility packet",
        }),
      );
      await userEvent.click(
        canvas.getByRole("button", {
          name: "Export generated compatibility bundle",
        }),
      );
    }
    await expect(args.onExport).toHaveBeenCalledTimes(2);
    await expect(args.onExportCompatibility).toHaveBeenCalledTimes(2);
    await expect(args.onExportGenerated).toHaveBeenCalledTimes(2);
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    canvasElement.dataset.playComplete = "true";
  },
};

export const ExportUnavailable: Story = {
  args: {
    onExport: fn(),
    onExportCompatibility: fn(),
    onExportGenerated: fn(),
    canExportGenerated: false,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    for (const view of ["List view", "Grid view"]) {
      await userEvent.click(canvas.getByRole("radio", { name: view }));
      const generated = canvas.getByRole("button", {
        name: "Export generated compatibility bundle",
      });
      await expect(generated).toBeDisabled();
      await userEvent.click(generated);
      await expect(
        canvas.getByRole("button", {
          name: "Export standard-compliant taxonomy",
        }),
      ).toBeEnabled();
      await expect(
        canvas.getByRole("button", {
          name: "Export taxonomy compatibility packet",
        }),
      ).toBeEnabled();
    }
    await expect(args.onExportGenerated).not.toHaveBeenCalled();
    canvasElement.dataset.playComplete = "true";
  },
};

export const ExportErrors: Story = {
  args: {
    generationError: "Missing generation rule.",
    exportError: "Could not prepare the export.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const view of ["List view", "Grid view"]) {
      await userEvent.click(canvas.getByRole("radio", { name: view }));
      const alerts = canvas.getAllByRole("alert");
      await expect(alerts).toHaveLength(2);
      await expect(alerts[0]).toHaveTextContent(
        "Structure generation needs repair: Missing generation rule.",
      );
      await expect(alerts[1]).toHaveTextContent(
        "Could not prepare the export.",
      );
    }
    canvasElement.dataset.playComplete = "true";
  },
};
