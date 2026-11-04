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
import { buildTshirtArtifacts } from "../../src/features/design-data/tshirtArtifacts";
import type { GeneratedClassificationCompatibility } from "../../src/features/taxonomy/generatedReviewExport";

const errors = new WeakMap<Page, string[]>();
test.use({ actionTimeout: 15_000 });
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: new RegExp(`^${name}(?: |$)`) })
    .click();
}
async function openBase(page: Page) {
  await navigate(page, "Design");
  await page.getByRole("tab", { name: "Structures", exact: true }).click();
  await page
    .locator('[data-component="StructureCard"]')
    .filter({ has: page.getByText("Base", { exact: true }) })
    .click({ position: { x: 4, y: 4 } });
}
async function choose(page: Page, property: string, value: string) {
  await page
    .getByRole("button", { name: new RegExp(`${property} option$`) })
    .click();
  const options = page.getByRole("listbox", {
    name: `${property} option`,
    exact: true,
  });
  await options.getByRole("option", { name: value, exact: true }).click();
  await expect(options).toBeHidden();
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot> | null> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    AUTHORING_STORAGE_KEY,
  );
}
const selected = (page: Page) =>
  page.locator(
    '.structureVariantOption[data-selected="true"] .structurePreview:not([aria-hidden])',
  );

test("Base position and independent padding variants cover all 18 combinations without saving preview choices", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.goto("/");
  await openBase(page);
  const before = await record(page);
  for (const position of ["Start", "End", "Both"])
    for (const horizontal of ["Default", "Uniform", "None"])
      for (const vertical of ["Default", "None"]) {
        await choose(page, "Icon position", position);
        await choose(page, "Horizontal padding", horizontal);
        await choose(page, "Vertical padding", vertical);
        const root = selected(page);
        await expect(root).toBeVisible();
        await expect(
          root.locator('[data-element-kind="workflowIcon"]'),
        ).toHaveCount(position === "Both" ? 2 : 1);
        await expect(root.locator('[data-element-kind="uiIcon"]')).toHaveCount(
          1,
        );
        await expect(root.locator('[data-element-kind="text"]')).toHaveCount(2);
        await expect(root).toHaveCSS("gap", "6px");
        const hp =
          horizontal === "None" ? 0 : horizontal === "Uniform" ? 7 : 12;
        const vp = vertical === "None" ? 0 : 7;
        await expect(root).toHaveCSS("padding-left", `${hp}px`);
        await expect(root).toHaveCSS("padding-right", `${hp}px`);
        await expect(root).toHaveCSS("padding-top", `${vp}px`);
        await expect(root).toHaveCSS("padding-bottom", `${vp}px`);
      }
  expect(await record(page)).toEqual(before);
  await page.screenshot({
    path: info.outputPath("base-variants.png"),
    animations: "disabled",
  });
});

test("Base size previews match desktop padding and both icon scales", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.goto("/");
  await openBase(page);
  await choose(page, "Icon position", "Both");
  await page.getByRole("radio", { name: "Permutations", exact: true }).click();
  for (const [index, size] of ["xs", "s", "m", "l", "xl"].entries()) {
    const root = page.locator(
      `.structurePermutation[data-size="${size}"] .structurePreview:not([aria-hidden])`,
    );
    await expect(root).toBeVisible();
    await expect(root).toHaveCSS("gap", `${[4, 4, 6, 6, 6][index]}px`);
    await expect(root).toHaveCSS(
      "padding-left",
      `${[8, 10, 12, 16, 18][index]}px`,
    );
    await expect(root).toHaveCSS(
      "padding-top",
      `${[3, 4, 7, 10, 13][index]}px`,
    );
    const workflows = root.locator('[data-element-kind="workflowIcon"]');
    await expect(workflows).toHaveCount(2);
    for (const icon of await workflows.all())
      await expect(icon).toHaveCSS(
        "height",
        `${[14, 16, 18, 20, 22][index]}px`,
      );
    await expect(root.locator('[data-element-kind="uiIcon"]')).toHaveCSS(
      "height",
      `${[8, 10, 10, 12, 14][index]}px`,
    );
  }
  await page.screenshot({
    path: info.outputPath("base-size-pairings.png"),
    animations: "disabled",
  });
  await page.getByRole("radio", { name: "Design", exact: true }).click();
  await choose(page, "Horizontal padding", "None");
  await choose(page, "Vertical padding", "None");
  await page.getByRole("radio", { name: "Permutations", exact: true }).click();
  for (const size of ["xs", "s", "m", "l", "xl"]) {
    const root = page.locator(
      `.structurePermutation[data-size="${size}"] .structurePreview:not([aria-hidden])`,
    );
    for (const side of ["top", "right", "bottom", "left"])
      await expect(root).toHaveCSS(`padding-${side}`, "0px");
  }
});

test("Base generated download, Save/Cancel/reload and confirmed Reset all use the real defaults", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.goto("/");
  await navigate(page, "Tokens");
  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("base-padding-vertical-medium");
  await expect(
    page.getByRole("button", {
      name: "Open base-padding-vertical-medium",
      exact: true,
    }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Export generated compatibility bundle",
      exact: true,
    })
    .click();
  const path = await (await download).path();
  if (!path) throw new Error("The generated download was not retained.");
  const packet: GeneratedClassificationCompatibility = JSON.parse(
    await readFile(path, "utf8"),
  );
  const expected = buildTshirtArtifacts(createDefaultSnapshot());
  expect(packet.bundle.semantics).toEqual(expected.semantics);
  expect(packet.bundle.semantics).toHaveLength(97);
  expect(packet.standardConforming).toBe(false);
  expect(packet.upstreamAdopted).toBe(false);

  await openBase(page);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const description = page.getByRole("textbox", {
    name: "Description",
    exact: true,
  });
  const original = await description.inputValue();
  await description.fill("Base saved description");
  await description.press("Tab");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await record(page))?.saved.structures?.structures[0].description,
    )
    .toBe("Base saved description");
  await page.reload();
  await openBase(page);
  await expect(description).toHaveValue("Base saved description");
  await description.fill("Discard this temporary edit");
  await description.press("Tab");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog", { name: "Discard all edits", exact: true })
    .getByRole("button", { name: "Discard", exact: true })
    .click();
  await expect(description).toHaveValue("Base saved description");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const log = page.getByRole("complementary", {
    name: "Change log",
    exact: true,
  });
  if (!(await log.isVisible()))
    await page.getByRole("button", { name: /^Change log/ }).click();
  await log.getByRole("button", { name: "Reset all", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reset", exact: true })
    .click();
  await expect
    .poll(async () => (await record(page))?.working.structures)
    .toEqual(createDefaultSnapshot().structures);
  await page.reload();
  await openBase(page);
  await expect(description).toHaveValue(original);
  await expect(selected(page)).toHaveCSS("padding-top", "7px");
});
