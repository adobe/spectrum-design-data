// Copyright 2026 Adobe. All rights reserved.
import { expect, type Page } from "@playwright/test";

export async function openTaxonomyCell(
  page: Page,
  term: string,
  field: "term" | "description",
) {
  await page
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .fill(term);
  const grid = page.getByRole("grid");
  await grid.evaluate((element, column) => {
    element.scrollLeft = column === "description" ? 160 : 0;
  }, field);
  const cell = grid
    .getByRole(field === "term" ? "rowheader" : "gridcell")
    .filter({
      has: page.getByRole("button", {
        name: `Edit ${term} ${field}`,
        exact: true,
        includeHidden: true,
      }),
    });
  await expect(cell).toBeVisible();
  await expect(cell).toHaveCSS("pointer-events", "auto");
  await cell.hover();
  const trigger = page.getByRole("button", {
    name: `Edit ${term} ${field}`,
    exact: true,
  });
  await expect(trigger).toBeVisible();
  await expect
    .poll(() =>
      trigger.evaluate((button) => {
        const rect = button.getBoundingClientRect();
        return (
          document
            .elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
            ?.closest("button") === button
        );
      }),
    )
    .toBe(true);
  await trigger.click({ timeout: 5000 });
  return page.getByRole("textbox", {
    name: field === "term" ? "Term" : "Description",
    exact: true,
  });
}
