// Copyright 2026 Adobe. All rights reserved.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { enableEditMode } from "./editMode";

const EXPECTED: number[] = JSON.parse(
  readFileSync(
    new URL("../fixtures/spacing-global.json", import.meta.url),
    "utf8",
  ),
);

async function openSpacing(page: Page) {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Spacing" }).dispatchEvent("click");
  await page.getByRole("radio", { name: "Elements" }).dispatchEvent("click");
}

function barWidths(page: Page, scaleName: string) {
  return page
    .getByRole("list", { name: `${scaleName} spacing values` })
    .locator("[data-testid='spacing-bar']")
    .evaluateAll((bars) =>
      bars.map((bar) => bar.getBoundingClientRect().width),
    );
}

test("Spacing Elements renders the Global scale at its exact lengths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openSpacing(page);

  const list = page.getByRole("list", { name: "Global spacing values" });
  await expect(list.getByRole("listitem")).toHaveCount(EXPECTED.length);
  expect(await barWidths(page, "Global")).toEqual(EXPECTED);
  await expect(list.getByRole("listitem").first()).toContainText("20");
  await expect(list.getByRole("listitem").first()).toContainText("1px");
  await expect(list.getByRole("listitem").last()).toContainText("1400");
  const heights = await list
    .locator("[data-testid='spacing-bar']")
    .evaluateAll((bars) =>
      bars.map((bar) => bar.getBoundingClientRect().height),
    );
  expect(new Set(heights)).toEqual(new Set([40]));

  await expect(
    page.getByRole("button", { name: "Add spacing scale" }),
  ).toHaveCount(0);
  const card = page.getByRole("region", {
    name: "Global spacing scale",
    exact: true,
  });
  await expect(card.locator(".numericScaleRampBar")).toHaveCount(
    EXPECTED.length,
  );
  await expect(
    card.getByRole("textbox", { name: "Ratio", exact: true }),
  ).toBeDisabled();
  await expect(
    card.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveAttribute("readonly", "");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("editing spacing parameters updates bars, change log, and Tokens", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await openSpacing(page);

  const card = page.getByRole("region", {
    name: "Global spacing scale",
    exact: true,
  });
  const ratio = card.getByRole("textbox", { name: "Ratio", exact: true });
  await ratio.fill("1.5");
  await ratio.press("Enter");
  await expect
    .poll(async () => (await barWidths(page, "Global"))[17])
    .toBeGreaterThan(144);
  await page.getByRole("button", { name: "Add spacing scale" }).click();
  await expect(
    page
      .getByRole("list", { name: "Scale 4 spacing values" })
      .getByRole("listitem"),
  ).toHaveCount(18);
  const added = page.locator('[data-component="DimensionScaleCard"]').last();
  const scaleName = added.getByRole("textbox", { name: "Name", exact: true });
  await scaleName.fill("Layout");
  await scaleName.press("Enter");
  await added.getByRole("textbox", { name: "Larger values" }).fill("22");
  await added.getByRole("textbox", { name: "Larger values" }).press("Enter");
  await expect(
    page
      .getByRole("list", { name: "Layout spacing values" })
      .getByRole("listitem"),
  ).toHaveCount(27);
  await expect(added.locator(".numericScaleRampBar")).toHaveCount(27);

  const changelog = page.locator('[data-component="ChangelogPanel"]');
  await expect(
    changelog.locator('[data-metric="foundation-spacing"]'),
  ).toContainText("Spacing edits");
  await expect(
    changelog.locator('[data-metric="category-spacing"]'),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens" })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Spacing", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("global-100");
  await expect(
    page.getByRole("button", { name: "Open global-100", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("layout-100");
  await expect(
    page.getByRole("button", { name: "Open layout-100", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
