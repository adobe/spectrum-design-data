// Copyright 2026 Adobe. All rights reserved.
import { type Page } from "@playwright/test";

/** Technical tests explicitly opt into supporting detail; coverage is the product default. */
export async function showAnalysisDetails(page: Page) {
  await page.getByRole("button", { name: /Analysis view/ }).click();
  await page
    .getByRole("option", { name: "Detailed comparison", exact: true })
    .click();
}
