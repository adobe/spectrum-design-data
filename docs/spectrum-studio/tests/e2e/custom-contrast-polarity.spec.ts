// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
} from "../../src/features/edit-session/storage";
import { resolveColorDocument } from "../../src/features/color-system/resolution";
import { selectColorPanelSection } from "./colorPanelSection";
import { selectMode } from "./modeControl";

test.use({ viewport: { width: 1900, height: 1100 } });

async function colors(page: Page) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
}

async function openSteps(page: Page) {
  await selectColorPanelSection(page, "Color scales");
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: "Gray", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit Gray scale",
    exact: true,
  });
  const expander = dialog.getByRole("button", {
    name: "Custom contrast steps",
    exact: true,
  });
  if (await expander.count()) await expander.click();
  const controls = dialog.getByRole("region", {
    name: "Custom contrast steps",
  });
  const options = controls.getByRole("button", {
    name: "More options",
    exact: true,
  });
  if (await options.count()) await options.click();
  return { dialog, controls };
}

test("Dark contrast reset restores shared compensation and survives Save/Cancel/reload", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const snapshot = createDefaultSnapshot();
  snapshot.components!.components = snapshot.components!.components.map(
    (component) => ({ ...component, assignments: [] }),
  );
  snapshot.colorSystem.settings.polarityCompensation = 0.6;
  const gray = snapshot.colorSystem.scales.find(
    (scale) => scale.id === "scale-gray",
  )!;
  const step = gray.customContrasts!.steps[1];
  const dark = snapshot.modeSets
    .find((axis) => axis.key === "colorScheme")!
    .modes.find((mode) => mode.key === "dark")!;
  const ratio = (source = snapshot.colorSystem) =>
    resolveColorDocument(source, [dark], undefined, {
      applyMultiplier: false,
      modeSets: snapshot.modeSets,
    })
      .scales.find((scale) => scale.id === gray.id)!
      .customContrasts!.steps.find((item) => item.id === step.id)!.value;
  const existing = ratio();
  const automaticSource = structuredClone(snapshot.colorSystem);
  delete automaticSource.scales
    .find((scale) => scale.id === gray.id)!
    .customContrasts!.steps.find((item) => item.id === step.id)!.oppositeValue;
  const automatic = ratio(automaticSource);
  expect(existing).not.toBe(automatic);
  await page.addInitScript(
    ({ key, record }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(key, JSON.stringify(record));
    },
    {
      key: AUTHORING_STORAGE_KEY,
      record: {
        version: AUTHORING_RECORD_VERSION,
        working: snapshot,
        saved: snapshot,
        isEditing: true,
        attachments: {},
        savedAttachments: {},
      },
    },
  );
  await page.goto("/");
  await colors(page);
  let { dialog, controls } = await openSteps(page);
  await expect(
    controls.getByRole("textbox", {
      name: "Opposite contrast 50",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    controls.getByRole("button", { name: "Use compensation", exact: true }),
  ).toHaveCount(0);
  await expect(
    controls.getByRole("textbox", { name: "Contrast 50", exact: true }),
  ).toHaveValue(String(step.value));
  await dialog.press("Escape");
  await selectMode(page, "Dark");
  ({ dialog, controls } = await openSteps(page));
  const input = controls.getByRole("textbox", {
    name: "Contrast 50",
    exact: true,
  });
  await expect
    .poll(async () => Number(await input.inputValue()))
    .toBeCloseTo(existing, 7);
  const reset = controls.getByRole("button", { name: "Reset 50", exact: true });
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect
    .poll(async () => Number(await input.inputValue()))
    .toBeCloseTo(automatic, 7);
  await expect(reset).toBeDisabled();
  await expect(
    controls.getByText("Polarity adjusted", { exact: false }).first(),
  ).toBeVisible();
  await input.fill("2");
  await input.press("Tab");
  await expect.poll(async () => Number(await input.inputValue())).toBe(2);
  await expect(reset).toBeEnabled();
  await dialog.press("Escape");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await colors(page);
  await selectMode(page, "Dark");
  ({ dialog, controls } = await openSteps(page));
  await expect
    .poll(async () =>
      Number(
        await controls
          .getByRole("textbox", { name: "Contrast 50", exact: true })
          .inputValue(),
      ),
    )
    .toBe(2);
  await controls.getByRole("button", { name: "Reset 50", exact: true }).click();
  await dialog.press("Escape");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog", { name: "Discard all edits?", exact: true })
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  ({ dialog, controls } = await openSteps(page));
  await expect
    .poll(async () =>
      Number(
        await controls
          .getByRole("textbox", { name: "Contrast 50", exact: true })
          .inputValue(),
      ),
    )
    .toBe(2);
  await controls.getByRole("button", { name: "Reset 50", exact: true }).click();
  await dialog.press("Escape");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await colors(page);
  await selectMode(page, "Dark");
  ({ dialog, controls } = await openSteps(page));
  await expect
    .poll(async () =>
      Number(
        await controls
          .getByRole("textbox", { name: "Contrast 50", exact: true })
          .inputValue(),
      ),
    )
    .toBeCloseTo(automatic, 7);
  await expect(
    controls.getByRole("button", { name: "Reset 50", exact: true }),
  ).toBeDisabled();
  await dialog.press("Escape");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Color ramps", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
