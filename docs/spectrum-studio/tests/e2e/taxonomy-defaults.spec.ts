// Copyright 2026 Adobe. All rights reserved.
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import {
  assertClassificationReviewExport,
  type ClassificationReviewExport,
} from "../../src/features/taxonomy/reviewedExport";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name, exact: true })
    .click();
}

async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}

for (const width of [1440, 390]) {
  test(`Reconciled shipped vocabulary and foundation names at ${width}px`, async ({
    page,
  }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width === 390)
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
    await navigate(page, "Registry");
    await page
      .getByRole("radio", { name: "Typography metric", exact: true })
      .press("Space");
    await expect(
      page.getByRole("grid", { name: "Typography metric terms", exact: true }),
    ).toContainText("No terms registered yet.");
    await expect(
      page.getByRole("button", { name: "Add term", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("radio", { name: "Element", exact: true })
      .press("Space");
    await page
      .getByRole("searchbox", { name: "Search terms", exact: true })
      .fill("Text");
    await expect(
      page.getByRole("rowheader", { name: /^Text(?:\s|$)/ }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`default-elements-${width}.png`),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    if (
      await page
        .getByRole("heading", { name: "Changes", exact: true })
        .isVisible()
    ) {
      await page.getByRole("button", { name: /^Change log/ }).click();
    }
    const defaults = createDefaultSnapshot();
    await expect
      .poll(async () => (await record(page))?.working.taxonomy)
      .toEqual(defaults.taxonomy);
    expect((await record(page)).saved.taxonomy).toEqual(defaults.taxonomy);
    expect((await record(page)).working.elevation!.name).toEqual(
      defaults.elevation!.name,
    );
    expect((await record(page)).working.aliases!.tokens).toEqual([]);
    await navigate(page, "Tokens");
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: "Export taxonomy compatibility packet",
        exact: true,
      })
      .click();
    const file = await download;
    const packet: ClassificationReviewExport = JSON.parse(
      await readFile((await file.path())!, "utf8"),
    );
    await assertClassificationReviewExport(packet);
    const names = [
      "text-size-100",
      "body-line-height-100",
      "body-unitless-line-height-100",
      "heading-line-height-100",
      "heading-unitless-line-height-100",
      "component-line-height-100",
      "component-unitless-line-height-100",
      "workflow-icon-size-100",
      "spacing-100",
      "size-100",
      "radius-100",
      "surface-shadow-100",
    ];
    for (const name of names)
      expect(
        packet.tokens.some((token) => token.name === name),
        name,
      ).toBe(true);
    const metricCategory = "3b8d399b-9a38-4c85-b3da-fa242530b721";
    expect(packet.tokens.every((token) => token.classification)).toBe(true);
    expect(
      packet.tokens.some(
        (token) =>
          token.classification && metricCategory in token.classification,
      ),
    ).toBe(false);
    await navigate(page, "Foundations");
    await page.getByRole("tab", { name: "Typography", exact: true }).click();
    await page.getByRole("radio", { name: "Elements", exact: true }).click();
    await expect(
      page.locator(".typographyRampPreview [data-scale='100']"),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Elevation", exact: true }).click();
    await expect(
      page.getByRole("img", { name: "surface-shadow-100 shadow", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-component="ElevationElements"] [data-shadow-sample]'),
    ).toHaveCount(3);
    await page.reload();
    expect((await record(page)).working.taxonomy).toEqual(defaults.taxonomy);
    expect((await record(page)).saved.taxonomy).toEqual(defaults.taxonomy);
  });
}

test("Saved vocabulary is preserved until confirmed Reset all adopts the corrected defaults", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const saved = createDefaultSnapshot();
  saved.taxonomy!.terms.push({
    id: "5fa1d788-9cac-432e-bd81-59f6f44cca74",
    categoryId: "3b8d399b-9a38-4c85-b3da-fa242530b721",
    value: "font-size",
    description: "Existing saved vocabulary",
  });
  const working = structuredClone(saved);
  working.spacing!.scales[0].base = 9;
  await page.addInitScript(
    ({ working, saved, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 6,
            working,
            saved,
            isEditing: true,
            attachments: {},
            savedAttachments: {},
          }),
        );
    },
    { working, saved, key: AUTHORING_STORAGE_KEY },
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await navigate(page, "Registry");
  await page
    .getByRole("radio", { name: "Typography metric", exact: true })
    .press("Space");
  await expect(
    page.getByRole("grid", { name: "Typography metric terms", exact: true }),
  ).toContainText("font-size");
  expect((await record(page)).saved.taxonomy).toEqual(saved.taxonomy);
  if (
    !(await page
      .getByRole("heading", { name: "Changes", exact: true })
      .isVisible())
  ) {
    await page.getByRole("button", { name: /^Change log/ }).click();
  }
  await page.getByRole("button", { name: "Reset all", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reset all", exact: true })
    .click();
  await expect(
    page.getByRole("grid", { name: "Typography metric terms", exact: true }),
  ).toContainText("No terms registered yet.");
  const defaults = createDefaultSnapshot();
  await expect
    .poll(async () => (await record(page)).working.taxonomy)
    .toEqual(defaults.taxonomy);
  expect((await record(page)).saved.taxonomy).toEqual(defaults.taxonomy);
  await page.reload();
  expect((await record(page)).working.taxonomy).toEqual(defaults.taxonomy);
  expect((await record(page)).saved.taxonomy).toEqual(defaults.taxonomy);
});
