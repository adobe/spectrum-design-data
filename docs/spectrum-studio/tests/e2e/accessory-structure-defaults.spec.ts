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
import { formatTshirtName } from "../../src/features/design-data/tshirtProfile";
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
async function selectStructure(page: Page, name: string) {
  await navigate(page, "Design");
  await page.getByRole("tab", { name: "Structures", exact: true }).click();
  const card = page
    .locator('[data-component="StructureCard"]')
    .filter({ has: page.getByText(name, { exact: true }) });
  if (await card.count()) {
    await card.click({ position: { x: 4, y: 4 } });
    return;
  }
  await page
    .locator('[data-component="StructureCard"]')
    .filter({ has: page.getByText("Accessory", { exact: true }) })
    .click({ position: { x: 4, y: 4 } });
  await page.getByRole("row", { name, exact: true }).first().click();
  await page.getByRole("button", { name: "Open source Structure" }).click();
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot> | null> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    AUTHORING_STORAGE_KEY,
  );
}
const sample = (page: Page, index: number) =>
  page
    .locator(".structureVariantOption")
    .nth(index)
    .locator(".structurePreview:not([aria-hidden])");

test("Fresh Accessory variants, second item, Save/Cancel and confirmed Reset all", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.goto("/");
  await navigate(page, "Design");
  await page.getByRole("tab", { name: "Structures", exact: true }).click();
  for (const name of ["Accessory item", "Accessory workflow item"])
    await expect(
      page
        .locator('[data-component="StructureCard"]')
        .filter({ has: page.getByText(name, { exact: true }) }),
    ).toHaveCount(0);
  await selectStructure(page, "Accessory");
  await expect(page.locator(".structureVariantOption")).toHaveCount(3);
  const before = await record(page);
  for (const [index, gap, height] of [
    [0, 6, 32],
    [1, 6, 32],
    [2, 4, 18],
  ]) {
    const root = sample(page, index);
    await expect(root).toBeVisible();
    await expect(root).toHaveCSS("gap", `${gap}px`);
    await expect(root.locator(":scope > [data-element-id]")).toHaveCount(1);
    await expect
      .poll(() => root.evaluate((element) => element.clientHeight))
      .toBe(height);
  }
  const second = page.getByRole("switch", { name: "Second item", exact: true });
  await expect(second).not.toBeChecked();
  await second.press("Space");
  await expect(
    sample(page, 0).locator(":scope > [data-element-id]"),
  ).toHaveCount(2);
  await expect(
    sample(page, 1).locator(":scope > [data-element-id]"),
  ).toHaveCount(2);
  await expect(
    sample(page, 2).locator(":scope > [data-element-id]"),
  ).toHaveCount(1);
  expect(await record(page)).toEqual(before);
  await page
    .getByRole("button", { name: /Accessory presentation option$/ })
    .click();
  await page.getByRole("option", { name: "Affixed", exact: true }).click();
  await expect(page.locator(".structureVariantOption").nth(2)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await page.screenshot({
    path: info.outputPath("accessory-variants.png"),
    animations: "disabled",
  });

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const description = page.getByRole("textbox", {
    name: "Description",
    exact: true,
  });
  const original = await description.inputValue();
  await description.fill("Accessory save/cancel verification");
  await description.press("Tab");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await record(page))?.saved.structures?.structures[2].description,
    )
    .toBe("Accessory save/cancel verification");
  await page.reload();
  await selectStructure(page, "Accessory");
  await expect(description).toHaveValue("Accessory save/cancel verification");
  await description.fill("Discard this temporary edit");
  await description.press("Tab");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog", { name: "Discard all edits", exact: true })
    .getByRole("button", { name: "Discard", exact: true })
    .click();
  await expect(description).toHaveValue("Accessory save/cancel verification");

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
  await selectStructure(page, "Accessory");
  await expect(description).toHaveValue(original);
  await expect(second).not.toBeChecked();
});

test("Accessory tokens appear in the browser and the generated download matches the full output", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.goto("/");
  await navigate(page, "Tokens");
  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("accessory-item-padding-medium");
  await expect(
    page.getByRole("button", {
      name: "Open accessory-item-padding-medium",
      exact: true,
    }),
  ).toBeVisible();
  const failure = page
    .getByRole("alert")
    .filter({ hasText: "Invalid classification review packet" });
  const outcome = Promise.race([
    (async () => ({
      download: await page.waitForEvent("download", { timeout: 15_000 }),
    }))(),
    (async () => {
      await failure.waitFor({ state: "visible", timeout: 15_000 });
      return { error: await failure.innerText() };
    })(),
  ]);
  await page
    .getByRole("button", {
      name: "Export generated compatibility bundle",
      exact: true,
    })
    .click();
  const result = await outcome;
  if ("error" in result) throw new Error(result.error);
  const path = await result.download.path();
  if (!path) throw new Error("Accessory output download was not retained.");
  const packet: GeneratedClassificationCompatibility = JSON.parse(
    await readFile(path, "utf8"),
  );
  const expected = buildTshirtArtifacts(createDefaultSnapshot());
  expect(
    packet.bundle.semantics.map((row) => [
      formatTshirtName(row.token.name),
      row.target.value,
    ]),
  ).toEqual(
    expected.semantics.map((row) => [
      formatTshirtName(row.token.name),
      row.target.value,
    ]),
  );
  expect(packet.bundle.semantics).toHaveLength(97);
});

test("Accessory item pairings and group layout match XS through XL in the real size previews", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.goto("/");
  const sizes = ["xs", "s", "m", "l", "xl"];
  for (const [name, icons, paddings] of [
    ["Accessory item", [8, 10, 10, 12, 14], [3, 3, 5, 7, 9]],
    ["Accessory workflow item", [10, 12, 14, 16, 18], [2, 2, 3, 5, 7]],
  ] as const) {
    await selectStructure(page, name);
    await page
      .getByRole("radio", { name: "Permutations", exact: true })
      .click();
    for (const [index, size] of sizes.entries()) {
      const region = page.locator(`.structurePermutation[data-size="${size}"]`);
      const root = region.locator(".structurePreview:not([aria-hidden])");
      await expect(root).toBeVisible();
      await expect(root.locator("[data-element-kind]").first()).toHaveCSS(
        "height",
        `${icons[index]}px`,
      );
      await expect(root).toHaveCSS("padding-top", `${paddings[index]}px`);
      await expect
        .poll(() => root.evaluate((element) => element.clientHeight))
        .toBe([14, 16, 20, 26, 32][index]);
      await expect(region).not.toContainText("Check this size");
    }
    await page.screenshot({
      path: info.outputPath(`${name.replaceAll(" ", "-").toLowerCase()}.png`),
      animations: "disabled",
    });
    await page.getByRole("radio", { name: "Design", exact: true }).click();
  }
  await selectStructure(page, "Accessory");
  await page.getByRole("radio", { name: "Permutations", exact: true }).click();
  for (const [index, size] of sizes.entries()) {
    const root = page.locator(
      `.structurePermutation[data-size="${size}"] .structurePreview:not([aria-hidden])`,
    );
    await expect(root).toBeVisible();
    await expect(root).toHaveCSS("gap", `${[3, 4, 6, 7, 8][index]}px`);
    expect
      .soft(
        await root.locator(":scope > [data-element-id]").count(),
        `${size}: default size previews must honor the one-item variant visibility`,
      )
      .toBe(1);
    expect
      .soft(
        await root.evaluate((element) => element.clientWidth),
        `${size}: one square item plus equal outer gaps`,
      )
      .toBe([20, 24, 32, 40, 48][index]);
  }
  for (const name of ["Workflow icon", "Affixed", "Default UI icon"]) {
    await page.getByRole("radio", { name: "Design", exact: true }).click();
    await page
      .getByRole("button", { name: /Accessory presentation option$/ })
      .click();
    await page.getByRole("option", { name, exact: true }).click();
    const second = page.getByRole("switch", {
      name: "Second item",
      exact: true,
    });
    if (!(await second.isChecked())) await second.press("Space");
    const stored = await record(page);
    await page
      .getByRole("radio", { name: "Permutations", exact: true })
      .click();
    for (const [index, size] of sizes.entries()) {
      const root = page.locator(
        `.structurePermutation[data-size="${size}"] .structurePreview:not([aria-hidden])`,
      );
      const affixed = name === "Affixed";
      const gap = (affixed ? [3, 3, 4, 5, 6] : [3, 4, 6, 7, 8])[index];
      await expect(root).toHaveCSS("gap", `${gap}px`);
      await expect(root.locator(":scope > [data-element-id]")).toHaveCount(
        affixed ? 1 : 2,
      );
      for (const side of ["top", "right", "bottom", "left"])
        await expect(root).toHaveCSS(`padding-${side}`, `${gap}px`);
      const item = (affixed ? [8, 10, 10, 12, 14] : [14, 16, 20, 26, 32])[
        index
      ];
      await expect
        .poll(() => root.evaluate((element) => element.clientWidth))
        .toBe(affixed ? item + 2 * gap : 2 * item + 3 * gap);
      await expect
        .poll(() => root.evaluate((element) => element.clientHeight))
        .toBe(item + 2 * gap);
    }
    expect(await record(page)).toEqual(stored);
  }
});
