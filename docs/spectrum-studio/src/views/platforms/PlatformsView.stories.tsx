// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { PlatformsView } from "./PlatformsView";
import { editModeAtom } from "../../state/view/editMode";
import { NotificationProvider } from "../../components/notifications/NotificationProvider";
import { FoundationsTypographyPanel } from "../../panels/foundations/FoundationsTypographyPanel";

function Fixture({ editing = true }: { editing?: boolean }) {
  const [store] = useState(() => {
    const value = createStore();
    value.set(editModeAtom, editing);
    return value;
  });
  return (
    <Provider store={store}>
      <NotificationProvider>
        <PlatformsView />
        <div
          style={{ width: "100%", maxWidth: 340 }}
          aria-label="Typography panel"
          role="region"
        >
          <FoundationsTypographyPanel />
        </div>
      </NotificationProvider>
    </Provider>
  );
}

const meta = {
  title: "Views/Platforms settings",
  component: PlatformsView,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof PlatformsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SharedTypographyOutputFormat: Story = {
  name: "Typography output format is shared with the Typography panel",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    const settings = within(
      within(
        canvas.getByRole("region", { name: "Platform-wide settings" }),
      ).getByRole("region", { name: "Typography" }),
    );
    const panel = within(
      canvas.getByRole("region", { name: "Typography panel" }),
    );
    await userEvent.click(
      panel.getByRole("button", { name: "System settings" }),
    );
    await userEvent.click(
      settings.getByRole("button", { name: /Output format/ }),
    );
    await userEvent.click(body.getByRole("option", { name: "px" }));
    await waitFor(() =>
      expect(
        panel.getByRole("button", { name: /Output format/ }),
      ).toHaveTextContent("px"),
    );
    await expect(
      panel.getByRole("textbox", { name: "Min text size (px)" }),
    ).toHaveValue("9");
    canvasElement.dataset.playComplete = "true";
  },
};

export const ReadOnly: Story = {
  name: "Read-only outside edit mode",
  render: () => <Fixture editing={false} />,
  play: async ({ canvasElement }) => {
    const settings = within(
      within(
        within(canvasElement).getByRole("region", {
          name: "Platform-wide settings",
        }),
      ).getByRole("region", { name: "Typography" }),
    );
    await expect(settings.getByText("Output format")).toBeVisible();
    await expect(
      settings.queryByRole("button", { name: /Output format/ }),
    ).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};
