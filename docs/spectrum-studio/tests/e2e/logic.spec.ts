// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import { expectFixedChartSizing } from "./chartSizing";

async function openLogic(page: Page) {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Logic" })
    .dispatchEvent("click");
}

test("create a conditional rounding rule and show its consumers", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await openLogic(page);

  await expect(
    page.getByRole("article", { name: "Spacing rounding", exact: true }),
  ).toContainText("Spacing › Global");
  await page.getByRole("button", { name: "Add rule" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Name" })
    .fill("Custom text rounding");
  await dialog.getByRole("button", { name: "Add condition" }).click();
  await dialog
    .getByRole("textbox", { name: "Condition 1 threshold Threshold" })
    .fill("12");
  await dialog
    .getByRole("textbox", { name: "Condition 1 factor Factor" })
    .fill("1");
  await dialog.getByRole("button", { name: "Save" }).click();

  const card = page.getByRole("article", { name: "Custom text rounding" });
  await expect(card.getByText("Rounding", { exact: true })).toBeVisible();
  await expect(card.getByText("Not used", { exact: true })).toBeVisible();
  await expect(card).not.toContainText("otherwise");
  await card
    .getByRole("button", { name: "Edit rule Custom text rounding" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Not used by any foundation or Structure.",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  expect(errors).toEqual([]);
});

test("Typography and Spacing can reference rounding rules", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");

  await page.getByRole("tab", { name: "Typography" }).dispatchEvent("click");
  await page
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Text size rounding Text size rounding" })
    .click();
  await page.getByRole("option", { name: "No rounding" }).click();
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const stored = JSON.parse(localStorage.getItem(key) ?? "null");
        return stored?.working.typography.textRoundingRuleId;
      }, AUTHORING_STORAGE_KEY),
    )
    .toBe("rule-no-rounding");

  await page.getByRole("tab", { name: "Spacing" }).dispatchEvent("click");
  await page
    .getByRole("region", { name: "Global spacing scale", exact: true })
    .getByRole("button", { name: / Rounding$/ })
    .click();
  await page.getByRole("option", { name: "Whole numbers" }).click();
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const stored = JSON.parse(localStorage.getItem(key) ?? "null");
        return stored?.working.spacing.scales[0].roundingRuleId;
      }, AUTHORING_STORAGE_KEY),
    )
    .toBe("rule-whole-numbers");
  expect(errors).toEqual([]);
});

test("author a custom formula and an interpolation on the Logic page", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await openLogic(page);

  await page.getByRole("tab", { name: "Formulas", exact: true }).click();
  await expect(page.getByRole("article", { name: "Type scale" })).toContainText(
    "Foundations can override: Base, Ratio",
  );
  await page.getByRole("button", { name: "Add formula", exact: true }).click();
  await page.getByRole("menuitem", { name: "Custom expression" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const form = page.getByRole("textbox", { name: "Name", exact: true });
  await form.fill("Custom grid");
  await page.getByRole("textbox", { name: "Value at index i" }).fill("base +");
  await expect(
    page.getByRole("button", { name: "Add formula", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Value at index i" })
    .fill("base * 2 + i");
  await expect(page.getByRole("table")).toContainText("16");
  await expectFixedChartSizing(
    page.locator('[data-component="ScaleTypePreviewView"]'),
  );
  await page.getByRole("button", { name: "Add formula", exact: true }).click();
  // Closing the focused editor returns to the Formulas tab.
  await expect(
    page.getByRole("tab", { name: "Formulas", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const customCard = page.getByRole("article", { name: "Custom grid" });
  await expect(customCard.getByText("Custom", { exact: true })).toBeVisible();
  await expect(customCard.getByRole("math")).toBeVisible();
  await expect(
    customCard.getByRole("img", {
      name: "Custom grid values for indices -4 to 8",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add interpolation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Half");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("article", { name: "Half" })).toBeVisible();

  await page.getByRole("button", { name: "Delete interpolation Half" }).click();
  await expect(page.getByRole("article", { name: "Half" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Rules and Formulas tabs hold their own cards", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openLogic(page);

  const tabs = page
    .getByRole("tablist", { name: "Logic sections" })
    .getByRole("tab");
  await expect(tabs).toHaveText(["Rules", "Formulas"]);
  await expect(
    page.getByRole("tab", { name: "Rules", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("article", { name: "Spacing rounding", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("article", { name: "Type scale" })).toHaveCount(
    0,
  );

  await page.getByRole("tab", { name: "Formulas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Formulas", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Interpolations", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Spacing rounding", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Logic cards show badges, previews and where each item is used", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openLogic(page);

  const rule = page.getByRole("article", {
    name: "Spacing rounding",
    exact: true,
  });
  await expect(rule.getByText("Rounding", { exact: true })).toBeVisible();
  await expect(rule.getByRole("grid", { name: "Used by" })).toContainText(
    "Spacing › Global",
  );

  await page.getByRole("tab", { name: "Formulas", exact: true }).click();
  const typeScale = page.getByRole("article", { name: "Type scale" });
  await expect(
    typeScale.getByText("Type scale", { exact: true }).last(),
  ).toBeVisible();
  await expect(
    typeScale.getByRole("img", {
      name: "Type scale values for indices -4 to 8",
    }),
  ).toBeVisible();
  await expect(typeScale.getByRole("math")).toBeVisible();
  await expect(typeScale).toContainText(
    "Foundations can override: Base, Ratio",
  );
  await expect(typeScale.getByRole("grid", { name: "Used by" })).toContainText(
    "Typography › Font sizes",
  );

  const interpolation = page.getByRole("article", { name: "Cosine" });
  await expect(
    interpolation.getByTestId("interpolation-preview"),
  ).toBeVisible();
  const box = await interpolation
    .getByTestId("interpolation-preview")
    .boundingBox();
  expect(box && Math.abs(box.width - box.height) < 1).toBe(true);
  await expect(
    interpolation.getByRole("grid", { name: "Used by" }),
  ).toContainText("Typography › Body line height");
  expect(errors).toEqual([]);
});

test("author a geometric formula with its own base and an overridable ratio", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await openLogic(page);

  await page.getByRole("tab", { name: "Formulas", exact: true }).click();
  await page.getByRole("button", { name: "Add formula", exact: true }).click();
  await page.getByRole("menuitem", { name: "Geometric progression" }).click();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Brand scale");
  await page
    .getByRole("textbox", { name: "Base value", exact: true })
    .fill("10");
  const ratioSection = page.getByRole("region", { name: "Parameters" });
  await ratioSection
    .getByRole("checkbox", { name: "Allow override" })
    .first()
    .dispatchEvent("click");
  await page.getByRole("button", { name: "Add formula", exact: true }).click();

  const card = page.getByRole("article", { name: "Brand scale" });
  await expect(card).toContainText("Foundations can override: Ratio");
  await expect(
    card.getByRole("img", { name: "Brand scale values for indices -4 to 8" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
