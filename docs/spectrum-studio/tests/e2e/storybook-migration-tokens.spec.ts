// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    )
      collected.push(message.text());
  });
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

for (const story of [
  "analysis-token-comparison--all-modes",
  "analysis-token-comparison--filtered-mode",
  "analysis-token-comparison--selection",
  "analysis-token-comparison--dark",
  "analysis-token-comparison--narrow",
  "analysis-reference-override-dialog--unchecked",
  "analysis-reference-override-dialog--apply",
  "analysis-reference-override-dialog--stale",
  "analysis-reference-override-dialog--dark",
]) {
  test(`${story} completes its isolated interactions`, async ({ page }) => {
    if (story.endsWith("--narrow"))
      await page.setViewportSize({ width: 480, height: 900 });
    await page.goto(`/iframe.html?id=${story}&viewMode=story`);
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
  });
}

test("comparison tables hug their rows and expand with the tree", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=analysis-token-comparison--all-modes&viewMode=story",
  );
  await expect(page.locator("#storybook-root")).toHaveAttribute(
    "data-play-complete",
    "true",
  );
  const table = page.getByRole("treegrid", { name: "Token mode values" });
  const last = table.getByRole("row").last();
  const initial = await table.boundingBox();
  const lastRow = await last.boundingBox();
  expect(
    initial!.y + initial!.height - lastRow!.y - lastRow!.height,
  ).toBeLessThan(32);
  const row = table.getByRole("row").filter({
    has: page.getByRole("button", { name: "gray-100", exact: true }),
  });
  await row.press("ArrowRight");
  await expect(
    table.getByRole("button", { name: "Color scheme: Light", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await table.boundingBox())!.height)
    .toBeGreaterThan(initial!.height);
  const badges = table.locator(".analysisResultBadge");
  for (const badge of await badges.all()) {
    const dimensions = await badge.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      content: element.firstElementChild!.getBoundingClientRect().width,
    }));
    expect(Math.abs(dimensions.width - dimensions.content)).toBeLessThan(2);
  }
  const value = table.locator(".analysisComparedValue").first();
  const previews = value.locator(".valuePreview");
  await expect(previews).toHaveCSS("min-width", "24px");
  await expect(value).toHaveCSS("gap", "6px");
});

test("unavailable and empty results remain explicit", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=analysis-token-comparison--all-unavailable&viewMode=story",
  );
  await expect(
    page.getByRole("treegrid", { name: "Token mode values" }),
  ).toBeVisible();
  const bars = page.locator('[data-component="StackedBar"]');
  await expect(bars).toHaveCount(2);
  for (const bar of await bars.all()) {
    await expect(bar.locator("[data-segment]")).toHaveCount(1);
    await expect(bar.locator('[data-segment="unassessable"]')).toBeVisible();
  }
  await page.goto(
    "/iframe.html?id=analysis-token-comparison--empty&viewMode=story",
  );
  await expect(
    page.getByText("No matching tokens.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bulk edit", exact: true }),
  ).toHaveCount(0);
});
