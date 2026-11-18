// Copyright 2026 Adobe. All rights reserved.
import { expect, type Page } from "@playwright/test";

export async function openTaxonomyCell(
  page: Page,
  term: string,
  field: "term" | "description",
) {
  await page
    .getByRole("button", {
      name: `Open ${term} term`,
      exact: true,
    })
    .click();
  const input = page.getByRole("dialog").getByRole("textbox", {
    name: field === "term" ? "Term" : "Description",
    exact: true,
  });
  await expect(input).toBeVisible();
  await input.focus();
  return input;
}

export async function moveTaxonomyCategory(
  page: Page,
  name: string,
  direction: "earlier" | "later",
) {
  await page
    .getByRole("button", {
      name: `Reorder options for ${name}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("menuitem", {
      name: `Move ${direction}`,
      exact: true,
    })
    .click();
}
