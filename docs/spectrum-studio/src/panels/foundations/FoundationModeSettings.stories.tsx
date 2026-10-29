// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { FoundationModeSettings } from "./FoundationModeSettings";
import { editModeAtom } from "../../state/view/editMode";
import { modeSetsAtom } from "../../features/modes/state";
import {
  FOUNDATIONS,
  type FoundationId,
} from "../../features/modes/parameters";
import { foundationModeAttachmentsAtom } from "../../state/view/foundationModeAttachments";
import {
  detachFoundationModeSetAtom,
  modeSetFoundationsAtom,
} from "../../features/modes/foundationAttachments";

function Fixture({
  foundation,
  editing = true,
  empty = false,
  manyModes = false,
  modeValues,
}: {
  foundation: FoundationId;
  editing?: boolean;
  empty?: boolean;
  manyModes?: boolean;
  modeValues?: "single" | "equal";
}) {
  const [store] = useState(() => {
    const current = createStore();
    current.set(editModeAtom, true);
    if (empty) {
      const attached = current.get(modeSetFoundationsAtom);
      for (const set of current.get(modeSetsAtom)) {
        if (attached[set.id]?.includes(foundation))
          current.set(detachFoundationModeSetAtom, {
            modeSetId: set.id,
            foundation,
          });
      }
    }
    if (modeValues)
      current.set(modeSetsAtom, (sets) =>
        sets.map((set) => ({
          ...set,
          modes:
            modeValues === "single"
              ? set.modes.filter((mode) => mode.id === set.defaultModeId)
              : set.modes.map((mode) => ({ ...mode, foundations: {} })),
        })),
      );
    if (manyModes)
      current.set(modeSetsAtom, (sets) =>
        sets.map((set, index) =>
          index
            ? set
            : {
                ...set,
                modes: [
                  ...set.modes,
                  ...Array.from({ length: 8 }, (_, item) => ({
                    ...set.modes[1],
                    id: `story-mode-${item}`,
                    key: `extra${item}`,
                    name: `Extra mode ${item + 1}`,
                  })),
                ],
              },
        ),
      );
    if (foundation === "spacing" && !empty)
      current.set(foundationModeAttachmentsAtom, {
        [current.get(modeSetsAtom)[0].id]: ["spacing"],
      });
    current.set(editModeAtom, editing);
    return current;
  });
  return (
    <Provider store={store}>
      <div
        className={style({
          backgroundColor: "layer-2",
          padding: 16,
          borderRadius: "lg",
          boxSizing: "border-box",
        })}
        style={{ maxWidth: 360 }}
      >
        <FoundationModeSettings
          foundation={foundation}
          defaultExpandedKeys={["mode-sets"]}
        />
      </div>
    </Provider>
  );
}
const meta = {
  title: "Panels/Foundation mode settings",
  component: FoundationModeSettings,
  args: { foundation: "color" },
  render: (args) => <Fixture {...args} />,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FoundationModeSettings>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit Dark for color" }),
    );
    await waitFor(() =>
      expect(
        body.getByRole("group", { name: "Background lightness" }),
      ).toBeVisible(),
    );
    await expect(
      body.getByRole("slider", { name: "Background lightness" }),
    ).toBeEnabled();
    await waitFor(() =>
      expect(
        body.getByRole("slider", { name: "Background lightness" }),
      ).toHaveFocus(),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(canvas.getByRole("row", { name: "Dark" })).toHaveFocus(),
    );
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Edit Dark for color" }),
      ).toHaveFocus(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const ReadOnly: Story = {
  name: "Read-only selection",
  render: (args) => <Fixture {...args} editing={false} />,
};
export const Empty: Story = {
  name: "No attached mode sets",
  render: (args) => <Fixture {...args} empty />,
  parameters: {
    docs: {
      description: {
        story:
          "Mode sets still exist globally, but none are attached to this foundation. The existing header menu adds options.",
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const category = FOUNDATIONS.find((item) => item.id === args.foundation);
    await expect(
      canvas.getByText(
        `${category?.label} has no mode sets. Add one to create options.`,
      ),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", {
        name: `Add mode set to ${args.foundation}`,
      }),
    ).toBeEnabled();
    canvasElement.dataset.playComplete = "true";
  },
};
export const EmptyReadOnly: Story = {
  name: "No attached mode sets, read-only",
  render: (args) => <Fixture {...args} empty editing={false} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const category = FOUNDATIONS.find((item) => item.id === args.foundation);
    await expect(
      canvas.getByText(
        `${category?.label} has no mode sets. Select Edit to add one.`,
      ),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", {
        name: `Add mode set to ${args.foundation}`,
      }),
    ).not.toBeInTheDocument();
    canvasElement.dataset.playComplete = "true";
  },
};
export const SingleMode: Story = {
  name: "Attached set with one mode",
  render: (args) => <Fixture {...args} modeValues="single" />,
};
export const EqualValues: Story = {
  name: "Attached modes with equal values",
  render: (args) => <Fixture {...args} modeValues="equal" />,
};
export const Unsupported: Story = {
  name: "Unsupported variables",
  args: { foundation: "spacing" },
};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const Narrow: Story = {
  name: "Narrow viewport",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
export const Removal: Story = {
  name: "Remove configured mode set",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Remove Color scheme from color" }),
    ).toBeEnabled();
    await userEvent.click(
      canvas.getByRole("button", { name: "Remove Color scheme from color" }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole("region", { name: "Color scheme mode set" }),
      ).not.toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole("region", { name: "Contrast mode set" }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const LongList: Story = {
  name: "Content-sized mode list",
  render: (args) => <Fixture {...args} manyModes />,
};
export const AddMenu: Story = {
  name: "Add mode set menu",
  args: { foundation: "spacing" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", {
      name: "Add mode set to spacing",
    });
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(body.getByRole("menuitem", { name: "Contrast" })).toHaveFocus(),
    );
    await expect(
      within(body.getByRole("menu")).getAllByRole("separator"),
    ).toHaveLength(1);
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(
        body.getByRole("heading", { name: "Select mode-specific variables" }),
      ).toBeVisible(),
    );
    await expect(
      canvas.queryByRole("region", { name: "Contrast mode set" }),
    ).not.toBeInTheDocument();
    await userEvent.click(body.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(
        canvas.getByRole("region", { name: "Contrast mode set" }),
      ).toBeVisible(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.click(trigger);
    await expect(
      body.queryByRole("menuitem", { name: "Contrast" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      body.getByRole("menuitem", { name: "Create new mode set" }),
    );
    await waitFor(() => expect(body.getByRole("dialog")).toBeVisible());
    await expect(
      body.getByRole("button", { name: /Foundations$/ }),
    ).toHaveTextContent("Spacing");
    await userEvent.clear(body.getByRole("textbox", { name: "Mode set name" }));
    await userEvent.type(
      body.getByRole("textbox", { name: "Mode set name" }),
      "Discarded draft",
    );
    await userEvent.click(body.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await userEvent.click(trigger);
    await userEvent.click(
      body.getByRole("menuitem", { name: "Create new mode set" }),
    );
    await waitFor(() =>
      expect(
        body.getByRole("textbox", { name: "Mode set name" }),
      ).not.toHaveValue("Discarded draft"),
    );
    await userEvent.clear(body.getByRole("textbox", { name: "Mode set name" }));
    await userEvent.type(
      body.getByRole("textbox", { name: "Mode set name" }),
      "Story mode set",
    );
    await userEvent.click(body.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(
        body.getByRole("heading", { name: "Select mode-specific variables" }),
      ).toBeVisible(),
    );
    await expect(
      canvas.queryByRole("region", { name: "Story mode set mode set" }),
    ).not.toBeInTheDocument();
    await userEvent.click(body.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(
        canvas.getByRole("region", { name: "Story mode set mode set" }),
      ).toBeVisible(),
    );
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
