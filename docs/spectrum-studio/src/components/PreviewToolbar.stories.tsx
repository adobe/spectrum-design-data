// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { PreviewToolbar } from "./PreviewToolbar";
import { modeSetsAtom } from "../features/modes/state";
import { adaptiveClaimsAtom } from "../features/modes/adaptive";

function Fixture({ empty = false }: { empty?: boolean }) {
  const [store] = useState(() => {
    const current = createStore();
    if (empty) {
      current.set(modeSetsAtom, []);
      current.set(adaptiveClaimsAtom, {});
    }
    return current;
  });
  return (
    <Provider store={store}>
      <div
        className={style({ backgroundColor: "layer-2", borderRadius: "lg" })}
        style={{ position: "relative", height: 320, minWidth: 0 }}
      >
        <PreviewToolbar />
      </div>
    </Provider>
  );
}

const meta = {
  title: "Components/Preview toolbar",
  component: PreviewToolbar,
  parameters: { layout: "padded" },
  render: () => <Fixture />,
} satisfies Meta<typeof PreviewToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Adaptive controls" }),
    );
    await waitFor(() =>
      expect(body.getByRole("group", { name: "Text size" })).toBeVisible(),
    );
    const slider = body.getByRole("slider", { name: "Text size" });
    await expect(slider).toBeEnabled();
    slider.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(slider).toHaveValue("1");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Adaptive controls" }),
      ).toHaveFocus(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const Empty: Story = {
  name: "No mode controls",
  render: () => <Fixture empty />,
};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const Narrow: Story = {
  name: "Narrow viewport",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
