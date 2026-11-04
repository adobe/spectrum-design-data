// Copyright 2026 Adobe. All rights reserved.
import { DialogContainer } from "@react-spectrum/s2";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { createStore, Provider } from "jotai";
import { useState } from "react";
import { NotificationProvider } from "../../components/notifications/NotificationProvider";
import {
  authoringSnapshotAtom,
  enterEditModeAtom,
} from "../../features/edit-session/state";
import type { NewTokenAnswers } from "../../features/tokens/creationFlow";
import { createNewTokenAtom } from "../../features/tokens/dialogState";
import { AddTokenDialog, type AddTokenDialogProps } from "./AddTokenDialog";

function editingStore(seed?: NewTokenAnswers) {
  const store = createStore();
  store.set(enterEditModeAtom);
  if (seed) store.set(createNewTokenAtom, { answers: seed });
  return store;
}

/** Answers built from term values so stories follow the shipped Registry. */
function answersFor(
  tier: NewTokenAnswers["tier"],
  type: NewTokenAnswers["type"],
  picks: [categoryKey: string, value: string | number][],
): NewTokenAnswers {
  const taxonomy = createStore().get(authoringSnapshotAtom).taxonomy!;
  return {
    tier,
    type,
    terms: Object.fromEntries(
      picks.map(([key, value]) => {
        const category = taxonomy.categories.find((item) => item.key === key)!;
        const term = taxonomy.terms.find(
          (item) => item.categoryId === category.id && item.value === value,
        )!;
        return [category.id, term.id];
      }),
    ),
  };
}

const rawColor = answersFor("raw", "colors", [
  ["colorFamily", "photoshop blue"],
  ["scaleIndex", 20],
]);

function Harness(props: AddTokenDialogProps & { seed?: NewTokenAnswers }) {
  const [store] = useState(() => editingStore(props.seed));
  const [open, setOpen] = useState(true);
  return (
    <Provider store={store}>
      <NotificationProvider>
        <DialogContainer onDismiss={() => setOpen(false)}>
          {open && (
            <AddTokenDialog
              onCreated={props.onCreated}
              initialAnswers={props.initialAnswers}
            />
          )}
        </DialogContainer>
      </NotificationProvider>
    </Provider>
  );
}

const meta = {
  title: "Panels/Add token",
  component: AddTokenDialog,
  render: (args) => <Harness {...args} />,
  args: { onCreated: fn() },
} satisfies Meta<typeof AddTokenDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WalkThrough: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole("dialog")).toBeVisible());
    await expect(body.getByText("Step 1 of 3")).toBeVisible();
    const next = body.getByRole("button", { name: "Next" });
    await expect(next).toBeDisabled();
    await userEvent.click(body.getByRole("option", { name: /Raw value/ }));
    await userEvent.click(next);
    await userEvent.click(body.getByRole("option", { name: /Colors/ }));
    await waitFor(() =>
      expect(body.getByText(/^Step 2 of \d+$/)).toBeVisible(),
    );
    await userEvent.click(body.getByRole("button", { name: "Next" }));
    await expect(body.getByRole("button", { name: "Skip" })).toBeVisible();
  },
};

export const RawColorReview: Story = {
  args: { initialAnswers: rawColor },
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole("dialog")).toBeVisible());
    const create = body.getByRole("button", { name: "Create" });
    await expect(create).toBeEnabled();
    await userEvent.click(create);
    await waitFor(() => expect(args.onCreated).toHaveBeenCalled());
  },
};

export const PurposeBasedSpacing: Story = {
  args: {
    initialAnswers: answersFor("purpose", "spacing", [
      ["structure", "list"],
      ["property", "gap"],
    ]),
  },
};

export const DuplicateName: Story = {
  args: { initialAnswers: rawColor },
  render: (args) => <Harness {...args} seed={rawColor} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByText("This token already exists")).toBeVisible(),
    );
    await expect(body.getByRole("button", { name: "Create" })).toBeDisabled();
  },
};
