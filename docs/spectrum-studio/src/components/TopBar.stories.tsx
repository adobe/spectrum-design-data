// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { createStore, Provider, useAtom } from "jotai";
import { useState } from "react";
import { editModeAtom } from "../state/view/editMode";
import { activePageAtom } from "../state/view/navigation";
import { NavSidebar } from "./NavSidebar";
import { TopBar } from "./TopBar";

function NavigationFixture() {
  const [page, setPage] = useAtom(activePageAtom);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <TopBar />
      <div style={{ width: collapsed ? 56 : 200, height: 600 }}>
        <NavSidebar
          page={page}
          onPageChange={setPage}
          isSidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
        />
      </div>
      <div data-testid="active-page" hidden>
        {page}
      </div>
    </>
  );
}

function Fixture() {
  const [store] = useState(() => {
    const store = createStore();
    store.set(editModeAtom, false);
    store.set(activePageAtom, "rules");
    return store;
  });
  return (
    <Provider store={store}>
      <NavigationFixture />
    </Provider>
  );
}

const meta = {
  title: "Components/Top bar",
  component: TopBar,
  parameters: { layout: "fullscreen" },
  render: () => <Fixture />,
} satisfies Meta<typeof TopBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const HomeNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const home = canvas.getByRole("button", { name: "Spectrum Studio home" });
    const nav = within(canvas.getByRole("navigation", { name: "Navigation" }));
    const currentPage = canvas.getByTestId("active-page");
    await expect(currentPage).toHaveTextContent("rules");
    await expect(
      nav.queryByRole("link", { name: "Home", exact: true }),
    ).toBeNull();
    await userEvent.click(home);
    await expect(currentPage).toHaveTextContent("home");
    await expect(nav.queryByRole("link", { current: "page" })).toBeNull();
    for (const key of ["{Enter}", " "]) {
      await userEvent.click(nav.getByRole("link", { name: /^Rules\b/ }));
      await expect(currentPage).toHaveTextContent("rules");
      home.focus();
      await userEvent.keyboard(key);
      await expect(currentPage).toHaveTextContent("home");
      await expect(home).toHaveFocus();
    }
    canvasElement.dataset.playComplete = "true";
  },
};
