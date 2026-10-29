// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { utimes } from "node:fs/promises";

test("Artifact validator refresh preserves a name draft and recovers without browser cache", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let current = false;
  await page.route(
    "**/src/features/design-data/dimensionArtifacts.ts*",
    async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      await route.fulfill({
        response,
        body: current
          ? body
          : body.replace(
              "definitions: nativeSchema.definitions",
              "definitions: (() => { const definitions = structuredClone(nativeSchema.definitions); delete definitions.TaxonomyDocument.properties.classifications; return definitions; })()",
            ),
      });
    },
  );
  await page.goto("/");
  await expect(
    page.getByRole("alert").filter({
      hasText: "data/source/taxonomy must NOT have additional properties",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: /^Change log/ }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page.getByRole("tab", { name: "Palette", exact: true }).click();
  await page
    .getByRole("button", { name: "Add palette color", exact: true })
    .click();
  const name = page
    .getByRole("combobox", { name: "Palette color name", exact: true })
    .last();
  await name.fill("Preserved uncommitted label");
  current = true;
  const now = new Date();
  await utimes("src/features/design-data/dimensionArtifacts.ts", now, now);
  await expect(name).toHaveValue("Preserved uncommitted label");
  await name.press("Enter");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await page.getByRole("button", { name: /Analysis view/ }).click();
  await page
    .getByRole("option", { name: "Detailed comparison", exact: true })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Generated foundation artifacts",
      exact: true,
    }),
  ).toContainText("ready", { timeout: 20_000 });
  expect(
    await page.evaluate(() =>
      localStorage.getItem("leonardo:v1:artifacts/dimensions"),
    ),
  ).toBeNull();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page.getByRole("tab", { name: "Palette", exact: true }).click();
  await expect(
    page.getByText("Preserved uncommitted label", { exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
