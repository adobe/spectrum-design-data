// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import { compareAuthoring } from "../../src/features/changelog/registry";
import { comparePrimitiveTokens } from "../../src/features/changelog/tokenComparison";
import { canonicalTokenModeKey } from "../../src/features/tokens/browserModel";
import { selectColorPanelSection } from "./colorPanelSection";
import { selectMode } from "./modeControl";
import { browserSourcesForSnapshot } from "../../src/features/tokens/browserSavedState";

const errors = new WeakMap<Page, string[]>();
test.use({ viewport: { width: 1400, height: 1000 } });
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

async function seed(
  page: Page,
  working = createDefaultSnapshot(),
  saved = createDefaultSnapshot(),
  editing = true,
) {
  await page.addInitScript(
    ({ working, saved, editing, key, version }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(
          key,
          JSON.stringify({
            version,
            working,
            saved,
            isEditing: editing,
            attachments: {},
            savedAttachments: {},
          }),
        );
    },
    {
      working,
      saved,
      editing,
      key: AUTHORING_STORAGE_KEY,
      version: AUTHORING_RECORD_VERSION,
    },
  );
  await page.goto("/");
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
const panel = (page: Page) => page.locator('[data-component="ChangelogPanel"]');
async function log(page: Page) {
  await panel(page).getByRole("tab", { name: "Log", exact: true }).click();
}
const tokenCard = (page: Page, id: string) =>
  panel(page).locator(`[data-change-id=${JSON.stringify(id)}]`);
function typographyEdit() {
  const snapshot = createDefaultSnapshot();
  snapshot.typography.textZoom += 1;
  return snapshot;
}
async function openGeneratedReset(page: Page) {
  await tokenCard(page, "typography-font-size-50")
    .getByRole("button", { name: /^Reset Value,/ })
    .first()
    .click();
  return page.getByRole("alertdialog");
}

for (const appearance of ["light", "dark"]) {
  test(`five impact sections have clean defaults, compact breakdowns and fit the ${appearance} panel`, async ({
    page,
  }) => {
    await seed(page);
    if (appearance === "dark")
      await page
        .getByRole("button", { name: "Dark app appearance", exact: true })
        .click();
    await expect(
      panel(page).getByRole("heading", { name: "Changes", exact: true }),
    ).toBeVisible();
    await expect(panel(page)).toContainText(
      "No changes from the default data.",
    );
    expect(await panel(page).locator("section h4").allTextContents()).toEqual([
      "System impact",
      "Foundational impact",
      "Design impact",
      "Token impact",
      "Component impact",
    ]);
    await expect(
      panel(page).getByRole("img", {
        name: /^Token impact: 0 of \d+ affected/,
      }),
    ).toBeVisible();
    for (const title of [
      "System impact",
      "Foundational impact",
      "Design impact",
      "Token impact",
    ]) {
      const section = panel(page).getByRole("region", {
        name: title,
        exact: true,
      });
      const trigger = section.getByRole("button", {
        name: "Breakdown",
        exact: true,
      });
      const expanded = title === "System impact";
      const chart = section.getByRole("img");
      const originalImpact = await chart.getAttribute("aria-label");
      await expect(trigger).toHaveAttribute("aria-expanded", String(expanded));
      await expect(trigger).toHaveCSS("font-size", "14px");
      if (expanded) await expect(section.locator("dl")).toBeVisible();
      else await expect(section.locator("dl")).not.toBeVisible();
      await trigger.focus();
      await trigger.press("Enter");
      await expect(trigger).toHaveAttribute("aria-expanded", String(!expanded));
      if (expanded) await expect(section.locator("dl")).not.toBeVisible();
      else await expect(section.locator("dl")).toBeVisible();
      await expect(chart).toBeVisible();
      await expect(chart).toHaveAttribute("aria-label", originalImpact!);
      await trigger.press("Space");
      await expect(trigger).toHaveAttribute("aria-expanded", String(expanded));
    }
    const components = panel(page).getByRole("region", {
      name: "Component impact",
      exact: true,
    });
    await expect(
      components.getByRole("button", { name: "Breakdown", exact: true }),
    ).toHaveCount(0);
    await expect(components.locator("dl")).toBeVisible();
    expect((await record(page)).working).toEqual(createDefaultSnapshot());
    for (const width of [1400, 800]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await panel(page)
          .getByRole("tabpanel", { name: "Impact", exact: true })
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
    }
    await expect(
      panel(page).getByRole("button", { name: "Reset all", exact: true }),
    ).toBeDisabled();
  });
}

test("unsaved edits use shipped data; direct field resets preserve other edits, tab and accordion state", async ({
  page,
}) => {
  const working = typographyEdit();
  working.typography.maxTextSize += 1;
  working.platforms[0].name = "Updated platform";
  await seed(page, working);
  await expect(
    panel(page).getByRole("img", { name: /^System impact: 3 of/ }),
  ).toBeVisible();
  await log(page);
  const source = tokenCard(page, JSON.stringify(["typography"]));
  await source
    .getByRole("button", { name: "Reset Text zoom", exact: true })
    .click();
  await expect
    .poll(async () => (await record(page)).working.typography.textZoom)
    .toBe(createDefaultSnapshot().typography.textZoom);
  const after = await record(page);
  expect(after.working.typography.maxTextSize).toBe(
    working.typography.maxTextSize,
  );
  expect(after.working.platforms[0].name).toBe("Updated platform");
  expect(after.saved.typography).toEqual(createDefaultSnapshot().typography);
  const trigger = panel(page)
    .locator(".changelogTopicHeader")
    .filter({ hasText: "Foundations" })
    .locator('button[slot="trigger"]');
  await trigger.click();
  expect(await panel(page).getByRole("tab").allTextContents()).toEqual([
    "Impact",
    "System health",
    "Log",
  ]);
  await panel(page).getByRole("tab", { name: "Impact", exact: true }).click();
  await panel(page).getByRole("tab", { name: "Impact", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    panel(page).getByRole("tab", { name: "System health", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(panel(page).getByRole("tab", { name: "Log" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: /^Change log/ }).click();
  await page.getByRole("button", { name: /^Change log/ }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("mode-specific source impact is system-wide and independent of the selected preview mode", async ({
  page,
}) => {
  const working = createDefaultSnapshot();
  working.modeSets
    .find((set) => set.key === "colorScheme")!
    .modes.find(
      (mode) => mode.key === "dark",
    )!.foundations.color.backgroundLightness = 0.01;
  await seed(page, working);
  const impact = panel(page).getByRole("img", {
    name: /^Token impact: \d+ of \d+ affected/,
  });
  await expect(impact).toBeVisible();
  const before = await impact.getAttribute("aria-label");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Foundations/ })
    .click();
  await selectMode(page, "Dark");
  await expect(impact).toHaveAttribute("aria-label", before!);
  await selectMode(page, "Light");
  await expect(impact).toHaveAttribute("aria-label", before!);
  expect((await record(page)).working).toEqual(working);
  await expect(
    panel(page).getByRole("img", { name: /^System impact: 1 of/ }),
  ).toBeVisible();
  await log(page);
  await expect(
    panel(page).getByText("Foundations / Color / Background lightness", {
      exact: true,
    }),
  ).toBeVisible();
  await panel(page)
    .getByRole("button", {
      name: "Reset Foundations / Color / Background lightness",
      exact: true,
    })
    .click();
  await expect(panel(page)).toContainText("No changes from the default data.");
});

test("generated resets require an explicit full context and cancellation is inert", async ({
  page,
}) => {
  const working = typographyEdit();
  const shipped = createDefaultSnapshot();
  const expected = comparePrimitiveTokens(
    shipped,
    working,
    compareAuthoring(shipped, working),
  )
    .items.find((item) => item.id === "typography-font-size-50")!
    .fields.find((field) => field.key === "Value")!;
  await seed(page, working);
  await log(page);
  let dialog = await openGeneratedReset(page);
  const contexts = dialog.getByRole("radio", { name: /^Use shipped value:/ });
  await expect(contexts).toHaveCount(expected.tokenValue!.contexts!.length);
  await expect(
    dialog.getByRole("button", { name: "Reset selected change" }),
  ).toBeDisabled();
  await contexts.first().press("Space");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await record(page)).working.browserTokenEdits).toEqual({});
  dialog = await openGeneratedReset(page);
  await dialog
    .getByRole("radio", { name: /^Use shipped value:/ })
    .first()
    .press("Space");
  await dialog.getByRole("button", { name: "Reset selected change" }).click();
  await expect
    .poll(async () =>
      Object.keys((await record(page)).working.browserTokenEdits!),
    )
    .toEqual(["typography-font-size-50"]);
  const after = await record(page);
  const values =
    after.working.browserTokenEdits!["typography-font-size-50"].values;
  expect(Object.keys(values)).toEqual([expected.tokenValue!.contexts![0].key]);
  expect(values[expected.tokenValue!.contexts![0].key].value).toBe(
    expected.tokenValue!.shippedValue,
  );
  expect(after.working.typography).toEqual(working.typography);
  expect(after.saved).toEqual(shipped);
  await tokenCard(page, "typography-font-size-50")
    .getByRole("button", { name: /^Reset Manual override,/ })
    .first()
    .click();
  await expect(tokenCard(page, "typography-font-size-50")).not.toContainText(
    "Manual override",
  );
  await expect(
    tokenCard(page, "typography-font-size-50").getByRole("button", {
      name: /^Reset Value,/,
    }),
  ).not.toHaveCount(0);
  expect((await record(page)).working.typography.textZoom).toBe(
    working.typography.textZoom,
  );
});

test("a shipped color override that breaks the working contrast target is rejected without mutation", async ({
  page,
}) => {
  const working = createDefaultSnapshot();
  const red = working.colorSystem.scales.find((scale) => scale.name === "Red")!;
  const contrast = (red.customContrasts?.steps ??
    working.colorSystem.contrasts)[0];
  const original = browserSourcesForSnapshot(
    working,
    working.modeSets.map((set) => set.modes[0]),
  ).find(
    (source) =>
      source.groupId === red.id &&
      source.taxonomySource?.stepId === contrast.id,
  )!;
  contrast.value += 0.5;
  await seed(page, working);
  await log(page);
  await tokenCard(page, original.id)
    .getByRole("button", { name: /^Reset Value,/ })
    .first()
    .click();
  const dialog = page.getByRole("alertdialog");
  await dialog
    .getByRole("radio", { name: /^Use shipped value/ })
    .first()
    .press("Space");
  await dialog.getByRole("button", { name: "Reset selected change" }).click();
  await expect(dialog.getByRole("alert")).toContainText(/contrast/i);
  expect((await record(page)).working).toEqual(working);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test("generated and token-category resets select real upstream fields without reverting unrelated edits", async ({
  page,
}) => {
  const working = typographyEdit();
  working.typography.iconography.baseSize += 2;
  working.typography.lineHeights[0].isAdaptive = false;
  working.typography.lineHeights[0].defaultValue += 0.25;
  working.platforms[0].name = "Retain this platform";
  await seed(page, working);
  await log(page);
  const dialog = await openGeneratedReset(page);
  await expect(
    dialog.getByRole("radio", { name: /Restore Typography \/ Iconography/ }),
  ).toHaveCount(0);
  await dialog
    .getByRole("radio", { name: "Restore Typography / Text zoom", exact: true })
    .press("Space");
  await dialog.getByRole("button", { name: "Reset selected change" }).click();
  await expect
    .poll(async () => (await record(page)).working.typography.textZoom)
    .toBe(createDefaultSnapshot().typography.textZoom);
  await panel(page)
    .getByRole("button", { name: "Reset tokens changes", exact: true })
    .click();
  const category = page.getByRole("alertdialog");
  await expect(
    category.getByRole("radio", { name: "Clear manual token edits" }),
  ).toBeDisabled();
  await category
    .getByRole("radio", {
      name: "Restore Typography / Line heights",
      exact: true,
    })
    .press("Space");
  await category.getByRole("button", { name: "Reset selected change" }).click();
  await expect
    .poll(async () => (await record(page)).working.typography.lineHeights)
    .toEqual(createDefaultSnapshot().typography.lineHeights);
  expect((await record(page)).working.typography.iconography.baseSize).toBe(
    working.typography.iconography.baseSize,
  );
  expect((await record(page)).working.platforms[0].name).toBe(
    "Retain this platform",
  );
});

test("deprecated metadata, manual category clearing, saving, cancelling and reloading remain distinct", async ({
  page,
}) => {
  const working = typographyEdit();
  const context = canonicalTokenModeKey(
    Object.fromEntries(
      working.modeSets.map((set) => [set.id, set.defaultModeId]),
    ),
  );
  working.browserTokenEdits!["typography-font-size-50"] = {
    status: "deprecated",
    values: {
      [context]: { value: 17, baseline: 12 },
    },
  };
  await seed(page, working);
  await log(page);
  await expect(
    tokenCard(page, "typography-font-size-50").getByText("Deprecated", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await panel(page)
    .getByRole("button", { name: "Reset tokens changes", exact: true })
    .click();
  const dialog = page.getByRole("alertdialog");
  await dialog
    .getByRole("radio", { name: "Clear manual token edits" })
    .press("Space");
  await dialog.getByRole("button", { name: "Reset selected change" }).click();
  await expect
    .poll(async () => (await record(page)).working.browserTokenEdits)
    .toEqual({});
  expect((await record(page)).saved.browserTokenEdits).toEqual(
    working.browserTokenEdits,
  );
  expect((await record(page)).working.typography.textZoom).toBe(
    working.typography.textZoom,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits" })
    .click();
  await page.reload();
  expect((await record(page)).working.browserTokenEdits).toEqual(
    working.browserTokenEdits,
  );
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await log(page);
  await expect(
    tokenCard(page, "typography-font-size-50").getByText("Deprecated", {
      exact: true,
    }),
  ).toBeVisible();
});

test("unavailable generated output retains authored differences rather than claiming zero impact", async ({
  page,
}) => {
  const working = createDefaultSnapshot();
  working.modeSets
    .find((set) => set.key === "colorScheme")!
    .modes.find(
      (mode) => mode.key === "dark",
    )!.foundations.color.backgroundLightness = 0.2;
  await seed(page, working);
  await expect(
    panel(page).getByText("Token output unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(
    panel(page).getByRole("region", { name: "Token impact" }),
  ).toContainText("Token impact is unavailable");
  await expect(
    panel(page).getByRole("img", { name: /^System impact: 1 of/ }),
  ).toBeVisible();
  await log(page);
  await expect(
    panel(page).getByText("No changes from the default data."),
  ).toHaveCount(0);
  await panel(page)
    .getByRole("button", {
      name: "Reset Foundations / Color / Background lightness",
      exact: true,
    })
    .click();
  await expect(
    panel(page).getByText("Token output unavailable.", { exact: false }),
  ).toHaveCount(0);
  await expect(panel(page)).toContainText("No changes from the default data.");
});

test("batching, category confirmation and Reset all preserve their intended scopes", async ({
  page,
}) => {
  const working = createDefaultSnapshot();
  working.colorSystem.palette.forEach((color) => {
    color.lightness = Math.max(0, color.lightness - 1);
  });
  working.colorSystem.contrasts.forEach((contrast) => {
    contrast.value = Math.max(1, contrast.value - 0.001);
  });
  working.platforms[0].name = "Retain the platform";
  await seed(page, working);
  await log(page);
  const more = panel(page).getByRole("button", {
    name: "Show more foundations",
    exact: true,
  });
  await expect(more).toBeVisible();
  await more.click();
  await panel(page)
    .getByRole("button", { name: "Reset foundations changes", exact: true })
    .click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Reset selected change" }).click();
  await expect
    .poll(async () => (await record(page)).working.colorSystem.palette)
    .toEqual(createDefaultSnapshot().colorSystem.palette);
  expect((await record(page)).working.platforms[0].name).toBe(
    "Retain the platform",
  );
  await panel(page)
    .getByRole("button", { name: "Reset all", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reset all", exact: true })
    .click();
  await expect(panel(page)).toContainText("No changes from the default data.");
  const after = await record(page);
  expect(after.working).toEqual(createDefaultSnapshot());
  expect(after.saved).toEqual(createDefaultSnapshot());
});

test("shared color consumers open without render errors after a Changes source reset", async ({
  page,
}) => {
  const working = createDefaultSnapshot();
  working.colorSystem.settings.colorOutput.outputFormat = "rgb";
  await seed(page, working);
  await log(page);
  await panel(page)
    .getByRole("button", {
      name: "Reset Settings / Color output / Output format",
      exact: true,
    })
    .click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Foundations/ })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Color scales");
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: "Red", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  await expect(page.locator(".colorEvaluationPaletteContent")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Color ramps", exact: true }),
  ).toBeVisible();
});
