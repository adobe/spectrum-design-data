// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { NotificationProvider } from "../components/notifications/NotificationProvider";
import { ViewSwitcher } from "./ViewSwitcher";

function Fixture() {
  const [store] = useState(() => createStore());
  return (
    <Provider store={store}>
      <NotificationProvider>
        <div style={{ display: "flex", height: 360, width: 960 }}>
          <ViewSwitcher
            hasElementsSurface
            elements={<p>Elements content</p>}
            apps={<p>Apps content</p>}
            code={<p>Code content</p>}
          />
        </div>
      </NotificationProvider>
    </Provider>
  );
}

const meta = {
  title: "Views/View switcher",
  component: ViewSwitcher,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof ViewSwitcher>;
export default meta;
type Story = StoryObj<typeof meta>;

export const HeaderToolbar: Story = {
  name: "Preview controls in header",
  args: { elements: null, apps: null, code: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switcher = canvas.getByRole("radiogroup", { name: "Content views" });
    for (const view of ["Elements", "Apps", "Analyze", "Code"]) {
      await userEvent.click(canvas.getByRole("radio", { name: view }));
      const toolbars = canvas.getAllByRole("group", {
        name: "Design-system preview controls",
      });
      await expect(toolbars).toHaveLength(1);
      const [toolbar] = toolbars;
      await expect(toolbar.closest("[data-view]")).toBeNull();
      const bar = switcher.getBoundingClientRect();
      const controls = toolbar.getBoundingClientRect();
      await expect(controls.left).toBeGreaterThanOrEqual(bar.right);
      await expect(Math.abs(controls.top - bar.top)).toBeLessThan(
        Math.max(bar.height, controls.height),
      );
    }
    canvasElement.dataset.playComplete = "true";
  },
};
