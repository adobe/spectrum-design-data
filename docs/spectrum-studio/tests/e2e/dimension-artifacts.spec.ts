// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { showAnalysisDetails } from "./analysisNavigation";
import { DIMENSION_ARTIFACT_STORAGE_KEY } from "../../src/features/design-data/dimensionArtifactRepository";
import type { DimensionArtifactBundle } from "../../src/features/design-data/dimensionArtifacts";

async function stored(page: Page): Promise<DimensionArtifactBundle | null> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    DIMENSION_ARTIFACT_STORAGE_KEY,
  );
}
async function ready(page: Page) {
  await expect
    .poll(async () => (await stored(page))?.profileId)
    .toBe("leonardo-proposed-dimensions-v1");
  return (await stored(page))!;
}
for (const domain of ["spacing", "size"] as const) {
  test(`${domain} artifacts persist without Analysis and restore token edits through Save, Cancel and reload`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const baseline = await ready(page);
    expect(
      baseline.tokens.every((token) => /^[a-f0-9-]{36}$/.test(token.uuid)),
    ).toBe(true);
    expect(
      baseline.tokens.every((token) => Object.keys(token.name).length === 3),
    ).toBe(true);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const editToken = async (value: string) => {
      await page
        .getByRole("navigation", { name: "Navigation", exact: true })
        .getByRole("link", { name: "Tokens", exact: true })
        .click();
      await page
        .getByRole("radio", {
          name: domain === "spacing" ? "Spacing" : "Size",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: `Open ${domain}-global-100`, exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("textbox", { name: "Value", exact: true })
        .fill(value);
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect
        .poll(async () =>
          (await stored(page))?.tokens.some(
            (token) =>
              token.name.property === domain && token.value === `${value}px`,
          ),
        )
        .toBe(true);
    };
    await editToken("777");
    const working = (await stored(page))!;
    expect(working.tokens.length).toBe(baseline.tokens.length + 1);
    expect(working.lineage.filter((row) => row.edit)).toHaveLength(1);
    expect(
      working.tokens.find((token) => token.value === "777px")?.name,
    ).toMatchObject({
      property: domain,
      colorScheme: "light",
      contrast: "regular",
      textScaling: "default",
    });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Analysis", exact: true })
      .click();
    await showAnalysisDetails(page);
    await expect(
      page.getByRole("region", { name: "Stored foundation artifacts" }),
    ).toContainText("Matches saved dimension source");
    await editToken("888");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", { name: "Discard edits", exact: true })
      .click();
    await expect
      .poll(async () => (await stored(page))?.sourceHash)
      .toBe(working.sourceHash);
    expect(await stored(page)).toEqual(working);
    await page.reload();
    await ready(page);
    await expect
      .poll(async () => (await stored(page))?.sourceHash)
      .toBe(working.sourceHash);
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Tokens", exact: true })
      .click();
    await page
      .getByRole("radio", {
        name: domain === "spacing" ? "Spacing" : "Size",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("row", { name: `${domain}-global-100`, exact: true }),
    ).toContainText("777px");
    expect(errors).toEqual([]);
  });
}

test("Foundation edits and rename update paired artifacts while UUIDs remain stable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const baseline = await ready(page);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Spacing", exact: true }).click();
  const card = page.locator('[data-component="DimensionScaleCard"]').first();
  const ratio = card.getByRole("textbox", { name: "Ratio", exact: true });
  await ratio.fill("1.5");
  await ratio.press("Enter");
  await expect
    .poll(async () => (await stored(page))?.sourceHash)
    .not.toBe(baseline.sourceHash);
  const generated = (await stored(page))!;
  expect(generated.foundation.source.spacing.scales[0].parameters.ratio).toBe(
    1.5,
  );
  expect(generated.tokens.map((token) => token.uuid)).toEqual(
    baseline.tokens.map((token) => token.uuid),
  );
  expect(generated.tokens).not.toEqual(baseline.tokens);
  const name = card.getByRole("textbox", { name: "Name", exact: true });
  await name.fill("Layout");
  await name.press("Enter");
  await expect
    .poll(
      async () =>
        (await stored(page))?.foundation.source.spacing.scales[0].name,
    )
    .toBe("Layout");
  expect((await stored(page))!.tokens).toEqual(generated.tokens);
  await name.press("Tab");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect
    .poll(async () => (await stored(page))?.sourceHash)
    .toBe(baseline.sourceHash);
  expect(await stored(page)).toEqual(baseline);
  expect(errors).toEqual([]);
});

test("Quota failure exposes non-durable status and malformed artifact cache rebuilds without clearing source", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name: string, value: string) {
      if (
        name === key &&
        (window as unknown as Record<string, unknown>).artifactQuotaFailure
      )
        throw new DOMException("Fixture quota", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, DIMENSION_ARTIFACT_STORAGE_KEY);
  await page.goto("/");
  const baseline = await ready(page);
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).artifactQuotaFailure = true;
    localStorage.setItem("artifact-unrelated-fixture", "keep");
  });
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  await page
    .getByRole("button", { name: "Open spacing-global-100", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Value", exact: true }).fill("777");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Analysis", exact: true })
    .click();
  await showAnalysisDetails(page);
  const status = page.getByRole("region", {
    name: "Stored foundation artifacts",
  });
  await expect(status).toContainText("storage-error");
  await expect(status).toContainText("Artifact persistence failed");
  expect(await stored(page)).toEqual(baseline);
  await page.evaluate((key) => {
    (window as unknown as Record<string, unknown>).artifactQuotaFailure = false;
    localStorage.setItem(key, "{bad JSON");
  }, DIMENSION_ARTIFACT_STORAGE_KEY);
  await page.reload();
  await ready(page);
  await expect
    .poll(async () =>
      (await stored(page))?.tokens.some((token) => token.value === "777px"),
    )
    .toBe(true);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("artifact-unrelated-fixture"),
    ),
  ).toBe("keep");
  expect(errors).toEqual([]);
});
