// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { gapRegister } from "../../src/features/design-data/gaps";
import type { AnalysisReport } from "../../src/features/design-data/comparison";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  await page.goto("/");
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
async function navigate(page: Page, name: string) {
  await page.getByRole("radio", { name, exact: true }).click();
}

test("Registry order changes shared names/tree, rejects collisions and resets on reload", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await navigate(page, "Registry");
  await expect(page.getByRole("tablist")).toHaveAttribute(
    "aria-orientation",
    "horizontal",
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: /^Change log/ }).click();
  await page.getByRole("button", { name: "Add term", exact: true }).click();
  await page
    .getByRole("textbox", { name: "New term name", exact: true })
    .fill("100");
  await page.getByRole("button", { name: "Accept term", exact: true }).click();
  await expect(
    page.getByRole("row").filter({
      has: page.getByRole("textbox", { name: "New term name", exact: true }),
    }),
  ).toContainText("already owned");
  await page
    .getByRole("button", { name: "Cancel new term", exact: true })
    .click();
  await page.screenshot({
    path: info.outputPath("registry-edit.png"),
    animations: "disabled",
  });
  for (let index = 0; index < 6; index++)
    await page
      .getByRole("button", { name: "Move Scale index earlier", exact: true })
      .click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await navigate(page, "Tokens");
  await page.getByRole("searchbox", { name: "Search tokens" }).fill("100-red");
  await expect(
    page.getByRole("row", { name: "100-red", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("treegrid")).toContainText("Scale index: 100");
  await expect(page.getByRole("treegrid")).toContainText("Color name: Red");
  await page.getByRole("radio", { name: "Grid view", exact: true }).click();
  await expect(page.getByRole("main")).toContainText("Scale index: 100");
  await page.reload();
  await navigate(page, "Tokens");
  await page.getByRole("searchbox", { name: "Search tokens" }).fill("red-100");
  await expect(
    page.getByRole("row", { name: "red-100", exact: true }),
  ).toBeVisible();
});

test("Analysis JSON/Markdown parity and affected foundation/export consumers", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await navigate(page, "Analysis");
  await page.getByRole("button", { name: /Analysis view/ }).click();
  await page
    .getByRole("option", { name: "Alignment gap register", exact: true })
    .click();
  const gaps = page.getByRole("region", {
    name: "Alignment gap register",
    exact: true,
  });
  await expect(gaps).toContainText("LTAX-001");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const path = await (await download).path();
  if (!path) throw new Error("Analysis download unavailable.");
  const report: AnalysisReport = JSON.parse(await readFile(path, "utf8"));
  expect(report.gaps?.map((result) => result.gap.id)).toEqual(
    gapRegister.gaps.map((gap) => gap.id),
  );
  for (const result of report.gaps ?? [])
    await expect(gaps).toContainText(result.disposition);
  const markdownDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  const markdownPath = await (await markdownDownload).path();
  if (!markdownPath) throw new Error("Markdown download unavailable.");
  const markdown = await readFile(markdownPath, "utf8");
  for (const result of report.gaps ?? [])
    expect(markdown).toContain(`${result.gap.id}: ${result.gap.title}`);
  await navigate(page, "Foundations");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: /^Change log/ }).click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page.getByRole("tab", { name: "Color scales", exact: true }).click();
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: "Red", exact: true })
    .click();
  await expect(page.locator(".colorPickerCanvas").first()).toBeVisible();
  await page.keyboard.press("Escape");
  for (const tab of ["Colors", "Typography", "Spacing", "Size"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await navigate(page, "Elements");
    await expect(page.locator('[data-view="elements"]')).toBeVisible();
    await navigate(page, "Analyze");
    await expect(page.locator('[data-view="analyze"]')).toBeVisible();
    await navigate(page, "Code");
    await expect(page.getByRole("main")).not.toContainText(
      "Invalid authoring dataset",
    );
  }
});
