// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { ActionButton, Badge, Button, Text } from "@react-spectrum/s2";
import Channel from "@react-spectrum/s2/icons/Channel";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import {
  CategoryIcon,
  CategoryIconConfigurationContext,
  getCategoryIcon,
} from "./CategoryIcon";
import { categoryIconConfiguration } from "../features/icons/categoryIcons";
import { NavSidebar } from "./NavSidebar";
import { SubPanelTabs } from "./SubPanelTabs";
import { TokenBrowserView } from "../views/tokens/TokenBrowserView";

const meta = {
  title: "Components/Category icon",
  component: CategoryIcon,
  args: { category: "tokens" },
  parameters: { layout: "padded" },
} satisfies Meta<typeof CategoryIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 16 }}>
      <ActionButton>
        <CategoryIcon {...args} />
        <Text>Tokens</Text>
      </ActionButton>
      <ActionButton aria-label="Tokens">
        <CategoryIcon {...args} />
      </ActionButton>
      <ActionButton aria-label="Native icon reference">
        <Channel />
      </ActionButton>
    </div>
  ),
};
export const Associations: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 16,
      }}
    >
      {Object.entries(categoryIconConfiguration.categories).map(
        ([category, name]) => (
          <div
            key={category}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <CategoryIcon category={category} />
            <span>
              {category}: {name}
            </span>
          </div>
        ),
      )}
    </div>
  ),
};
export const Dark: Story = { ...Default, globals: { colorScheme: "dark" } };
export const MissingCategory: Story = {
  args: { category: "unmapped-category" },
  render: (args) => (
    <>
      <CategoryIcon {...args} />
      <CategoryIcon {...args} />
    </>
  ),
};
export const InvalidIcon: Story = {
  render: () => (
    <CategoryIconConfigurationContext.Provider
      value={{
        ...categoryIconConfiguration,
        categories: {
          ...categoryIconConfiguration.categories,
          color: "NotAnInstalledIcon",
        },
      }}
    >
      <CategoryIcon category="color" />
    </CategoryIconConfigurationContext.Provider>
  ),
};

function SharedConfigurationFixture() {
  const [store] = useState(createStore);
  const [config, setConfig] = useState(categoryIconConfiguration);
  return (
    <Provider store={store}>
      <CategoryIconConfigurationContext.Provider value={config}>
        <Button
          variant="secondary"
          onPress={() =>
            setConfig({
              ...config,
              categories: {
                ...config.categories,
                color: "Star",
                foundations: "Circle",
              },
            })
          }
        >
          Change associations
        </Button>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <div style={{ width: 200, height: 400 }}>
            <NavSidebar
              page="foundations"
              isSidebarCollapsed={false}
              onPageChange={fn()}
              onToggleSidebar={fn()}
            />
          </div>
          <div data-testid="foundation-tabs" style={{ width: 240 }}>
            <SubPanelTabs
              stateKey="category-icon-fixture"
              aria-label="Foundation sections"
              tabs={[
                {
                  id: "colors",
                  label: "Colors",
                  icon: <CategoryIcon category="color" />,
                  content: <Text>Color settings</Text>,
                },
                {
                  id: "spacing",
                  label: "Spacing",
                  icon: <CategoryIcon category="spacing" />,
                  content: <Text>Spacing settings</Text>,
                },
              ]}
            />
          </div>
          <div data-testid="change-log-icons">
            <h3>
              <CategoryIcon category="foundations" />
              Foundations
            </h3>
            <Badge aria-label="settings change" variant="neutral">
              <CategoryIcon category="source.settings" />
            </Badge>
          </div>
        </div>
        <div style={{ height: 340 }}>
          <TokenBrowserView
            tokens={[]}
            isEditing={false}
            query=""
            type="all"
            view="list"
            selectedIds={new Set()}
            onQueryChange={fn()}
            onTypeChange={fn()}
            onViewChange={fn()}
            onSelectionChange={fn()}
            onOpen={fn()}
            onBulkEdit={fn()}
          />
        </div>
      </CategoryIconConfigurationContext.Provider>
    </Provider>
  );
}
export const SharedConfiguration: Story = {
  render: () => <SharedConfigurationFixture />,
  play: async ({ canvasElement }) => {
    await expect(getCategoryIcon("tokens")).toBe(getCategoryIcon("tokens"));
    const canvas = within(canvasElement);
    const colorIcons = () =>
      canvasElement.querySelectorAll(
        '[data-category="color"], [data-category="source.settings"]',
      );
    await waitFor(() => {
      expect(colorIcons()).toHaveLength(3);
      for (const icon of colorIcons())
        expect(icon).toHaveAttribute(
          "data-category-icon",
          categoryIconConfiguration.categories.color,
        );
    });
    await userEvent.click(
      canvas.getByRole("button", { name: "Change associations" }),
    );
    await waitFor(() => {
      for (const icon of colorIcons())
        expect(icon).toHaveAttribute("data-category-icon", "Star");
      for (const icon of canvasElement.querySelectorAll(
        '[data-category="foundations"]',
      ))
        expect(icon).toHaveAttribute("data-category-icon", "Circle");
    });
    await expect(
      canvas.getByRole("link", { name: "Foundations" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("tab", { name: "Colors" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Colors" })).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
