// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
} from "../../src/features/edit-session/storage";
import { selectColorPanelSection } from "./colorPanelSection";

const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  const snapshot = createDefaultSnapshot();
  for (const set of snapshot.modeSets) {
    set.authoringCapabilities = set.authoringCapabilities?.filter(
      (capability) => capability !== "color.scales",
    );
  }
  await page.addInitScript(
    ({ key, snapshot, version }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version,
          working: snapshot,
          saved: snapshot,
          isEditing: true,
          attachments: {},
          savedAttachments: {},
        }),
      );
    },
    { key: AUTHORING_STORAGE_KEY, snapshot, version: AUTHORING_RECORD_VERSION },
  );
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
});

test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function expectContentsFit(dialog: Locator) {
  await expect(dialog).toBeVisible();
  await expect
    .poll(async () =>
      dialog.evaluate((element) => {
        const wrapper = element.parentElement!;
        const bounds = element.getBoundingClientRect();
        const controls = Array.from(
          element.querySelectorAll("input, button, canvas, [role=slider]"),
        ).filter((control) => {
          const rect = control.getBoundingClientRect();
          return rect.width > 1 && rect.height > 1;
        });
        return {
          dialogOverflow: Math.max(
            0,
            element.scrollWidth - element.clientWidth,
          ),
          wrapperOverflow: Math.max(
            0,
            wrapper.scrollWidth - wrapper.clientWidth,
          ),
          outsideControls: controls
            .filter((control) => {
              const rect = control.getBoundingClientRect();
              return (
                rect.left < bounds.left - 1 || rect.right > bounds.right + 1
              );
            })
            .map(
              (control) =>
                control.getAttribute("aria-label") ?? control.tagName,
            ),
          outsideViewport:
            bounds.left < -1 || bounds.right > window.innerWidth + 1,
        };
      }),
    )
    .toEqual({
      dialogOverflow: 0,
      wrapperOverflow: 0,
      outsideControls: [],
      outsideViewport: false,
    });
}

async function exercisePicker(page: Page, dialog: Locator) {
  await expectContentsFit(dialog);
  await dialog.getByRole("radio", { name: "Channels", exact: true }).click();
  await expectContentsFit(dialog);
  const hex = dialog.getByRole("textbox", { name: "Hex", exact: true });
  await hex.fill("#336699");
  const slider = dialog.getByRole("slider").first();
  await slider.press("ArrowRight");
  await expect(hex).not.toHaveValue("#336699");
  const canvas = dialog.locator(".colorPickerSliderCanvas").first();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.click(
    bounds!.x + bounds!.width * 0.75,
    bounds!.y + bounds!.height / 2,
  );
  await expectContentsFit(dialog);
  await dialog.getByRole("radio", { name: "Color area", exact: true }).click();
  await expectContentsFit(dialog);
}

for (const width of [1600, 360]) {
  test(`color scale editor and expanded contrasts fit at ${width}px`, async ({
    page,
  }) => {
    await selectColorPanelSection(page, "Color scales");
    await page.setViewportSize({ width, height: 1100 });
    await page
      .getByRole("tabpanel", { name: "Colors", exact: true })
      .getByRole("button", { name: "Red", exact: true })
      .press("Enter");
    const dialog = page.getByRole("dialog", {
      name: "Edit Red scale",
      exact: true,
    });
    await exercisePicker(page, dialog);
    await dialog
      .getByRole("switch", { name: "Use custom contrast steps", exact: true })
      .locator("xpath=ancestor::label")
      .click();
    await dialog
      .getByRole("button", { name: "Custom contrast steps", exact: true })
      .click();
    await expectContentsFit(dialog);
    await page.setViewportSize({ width, height: 450 });
    await expectContentsFit(dialog);
    await expect
      .poll(async () =>
        dialog.evaluate((element) => {
          const wrapper = element.parentElement!;
          wrapper.scrollTop = wrapper.scrollHeight;
          return wrapper.scrollTop;
        }),
      )
      .toBeGreaterThan(0);
  });

  test(`palette value picker fits at ${width}px`, async ({ page }) => {
    await selectColorPanelSection(page, "Palette");
    await page
      .getByRole("button", { name: /^Edit value of / })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: / value$/ });
    await page.setViewportSize({ width, height: 1100 });
    await exercisePicker(page, dialog);
  });

  test(`mode and nested shadow-color popovers fit at ${width}px`, async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Elevation", exact: true }).click();
    await page.getByRole("button", { name: "Mode sets", exact: true }).click();
    await page
      .getByRole("button", { name: "Edit Dark for elevation", exact: true })
      .click();
    const mode = page.getByRole("dialog", {
      name: "Edit Dark for elevation",
      exact: true,
    });
    await page.setViewportSize({ width, height: 1100 });
    await expectContentsFit(mode);
    await mode
      .getByRole("button", { name: "Edit shadow color", exact: true })
      .click();
    await exercisePicker(
      page,
      page.getByRole("dialog", { name: "Shadow color", exact: true }),
    );
  });

  test(`adaptive controls fit at ${width}px`, async ({ page }) => {
    await page.getByRole("radio", { name: "Preview", exact: true }).click();
    await page
      .getByRole("button", { name: "Adaptive controls", exact: true })
      .click();
    await page.setViewportSize({ width, height: 1100 });
    await expectContentsFit(
      page.getByRole("dialog", { name: "Adaptive controls", exact: true }),
    );
  });

  test(`continuous data-vis editor fits at ${width}px`, async ({ page }) => {
    await selectColorPanelSection(page, "Data vis");
    await page
      .getByRole("button", { name: "Add data vis scale", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Sequential", exact: true })
      .click();
    await page
      .getByRole("button", { name: /^Open .* data vis scale$/ })
      .first()
      .click();
    const dialog = page.getByRole("dialog", {
      name: /^Edit .* data vis scale$/,
    });
    await page.setViewportSize({ width, height: 1100 });
    await expectContentsFit(dialog);
    await dialog.getByRole("button", { name: /Color source/ }).click();
    await page
      .getByRole("option", { name: "Independent key color", exact: true })
      .click();
    await exercisePicker(page, dialog);
  });

  test(`categorical data-vis chooser fits at ${width}px`, async ({ page }) => {
    await selectColorPanelSection(page, "Data vis");
    await page
      .getByRole("button", { name: "Add data vis scale", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Categorical", exact: true })
      .click();
    await page.setViewportSize({ width, height: 1100 });
    await expectContentsFit(
      page.getByRole("dialog", { name: "New categorical scale", exact: true }),
    );
  });
}
