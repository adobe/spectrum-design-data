// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { StyleAppearanceFields } from "./StyleAppearanceFields";
import {
  NotificationContext,
  type Notify,
} from "../../components/notifications/notificationContext";
import type { StyleAppearance } from "../../features/styles/model";
import "../../views/styles/Styles.css";

const notifications: Notify = {
  added: (_kind, run) => run(),
  edit: (run) => run(),
  quietly: (run) => run(),
  remove: fn(),
  error: fn(),
  info: fn(),
  copied: fn(),
};
const meta = {
  title: "Styles/Appearance",
  component: StyleAppearanceFields,
  args: {
    kind: "text",
    value: {
      color: { kind: "single", binding: { $ref: "blue-900" } },
      fontFamily: { value: "sans-serif" },
      fontWeight: { value: 400 },
    },
    references: [
      {
        id: "blue-900",
        uuid: "blue-row",
        familyId: "blue",
        index: 900,
        property: "color",
        name: "blue-900",
        value: "#1473e6",
      },
      {
        id: "line-100",
        uuid: "line-row",
        familyId: "line",
        metricId: "line",
        index: 100,
        property: "lineHeight",
        name: "line-height-100",
        value: 1.5,
      },
    ],
    families: [{ id: "blue", name: "Blue" }],
    display: "tokens",
    isReadOnly: false,
    onChange: fn(),
  },
  render: function Controlled(args) {
    const [value, setValue] = useState<StyleAppearance>(args.value);
    return (
      <NotificationContext.Provider value={notifications}>
        <div style={{ width: 300, maxWidth: "100%" }}>
          <StyleAppearanceFields
            {...args}
            value={value}
            onChange={(difference) => {
              setValue((previous) => ({ ...previous, ...difference }));
              args.onChange(difference);
            }}
          />
          <pre data-testid="style-source">{JSON.stringify(value)}</pre>
        </div>
      </NotificationContext.Provider>
    );
  },
} satisfies Meta<typeof StyleAppearanceFields>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {};
export const ColorOptions: Story = {
  args: {
    kind: "background",
    value: {
      color: { kind: "families", familyIds: ["blue"], scaleIndex: 900 },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const index = canvas.getByRole("textbox", { name: "Scale index" });
    await userEvent.clear(index);
    await userEvent.type(index, "1000");
    await userEvent.tab();
    await expect(canvas.getByTestId("style-source")).toHaveTextContent(
      '"scaleIndex":1000',
    );
  },
};
export const Values: Story = { args: { display: "values" } };
export const ReadOnly: Story = { args: { isReadOnly: true } };
export const DarkBorder: Story = {
  globals: { colorScheme: "dark" },
  args: {
    kind: "border",
    value: {
      color: { kind: "single", binding: { value: "#ffffff" } },
      borderWidth: { value: 2 },
    },
  },
};
