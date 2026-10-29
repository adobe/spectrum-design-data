// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("Foundations and Design retain independent views without changing the Tokens browser", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await expect(page.getByRole("radio", { name: "Elements" })).toBeChecked();
  await page.getByRole("radio", { name: "Code" }).click();
  await expect(page.getByRole("radio", { name: "Code" })).toBeChecked();

  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Design(?: |$)/ })
    .click();
  await expect(
    page.getByRole("radio", { name: "Design", exact: true }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "Preview", exact: true }).click();

  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Code", exact: true }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "Preview", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await expect(
    page.getByRole("radiogroup", { name: "Token presentation", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Grid view", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Grid view", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Preview", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Design(?: |$)/ })
    .click();
  await expect(
    page.getByRole("radio", { name: "Preview", exact: true }),
  ).toBeChecked();

  expect(errors).toEqual([]);
});

test("Design remembers its own compact sections and pasteboard views", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await page.getByRole("radio", { name: "Code", exact: true }).click();

  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Design(?: |$)/ })
    .click();
  const layout = page.locator('[data-component="DesignLayout"]');
  await expect(layout).toBeVisible();
  await expect(
    layout.getByRole("tab", { name: "Structures", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    layout.getByRole("radio", { name: "Design", exact: true }),
  ).toBeChecked();

  for (const section of ["Concepts", "Elements", "Structures"]) {
    const tab = layout.getByRole("tab", { name: section, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    if (section !== "Structures")
      await expect(layout.getByRole("tabpanel")).toContainText(
        "is coming soon.",
      );
  }

  const colors: string[] = [];
  for (const view of ["Design", "Permutations", "Preview"]) {
    const radio = layout.getByRole("radio", { name: view, exact: true });
    await radio.click();
    await expect(radio).toBeChecked();
    await expect(
      layout.locator(`[data-view="${view.toLowerCase()}"]`),
    ).toBeVisible();
    colors.push(
      await layout
        .locator(`[data-view="${view.toLowerCase()}"]`)
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    );
  }
  expect(new Set(colors).size).toBe(1);
  expect(colors[0]).not.toBe("rgba(0, 0, 0, 0)");

  await layout.getByRole("tab", { name: "Elements", exact: true }).click();
  await layout
    .getByRole("radio", { name: "Permutations", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Typography", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("radio", { name: "Code", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Design(?: |$)/ })
    .click();
  await expect(
    layout.getByRole("tab", { name: "Elements", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    layout.getByRole("radio", { name: "Permutations", exact: true }),
  ).toBeChecked();

  expect(errors).toEqual([]);
});
