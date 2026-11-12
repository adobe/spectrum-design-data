// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    )
      errors.push(message.text().split("\n").slice(0, 5).join("\n"));
  });
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

for (const story of [
  "default",
  "editing",
  "singleton",
  "parent-selection",
  "token-as-parent",
  "filtered-selection",
  "read-only-aliases",
  "generation-errors",
]) {
  test(`Token browser ${story} completes its interactions`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=views-token-browser--${story}&viewMode=story`,
    );
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
  });
}

for (const appearance of ["light", "dark"])
  for (const width of [1280, 390]) {
    test(`A compact root token has no hierarchy indentation in ${appearance} at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=views-token-browser--singleton&viewMode=story&globals=colorScheme:${appearance}`,
      );
      await expect(page.locator("#storybook-root")).toHaveAttribute(
        "data-play-complete",
        "true",
      );
      const row = page.getByRole("row", {
        name: "Illustrator orange color",
        exact: true,
      });
      await expect(row).toHaveAttribute("aria-level", "1");
      await expect(row.getByRole("rowheader")).toHaveCSS(
        "padding-left",
        "16px",
      );
      await expect(
        row.getByRole("button", { name: /Expand|Collapse/ }),
      ).toHaveCount(0);
      await expect(row.getByRole("rowheader")).toHaveText(
        "Illustrator orange color",
      );
      await page.locator(".tokenCollectionScroll").evaluate((element) => {
        element.scrollLeft = 500;
      });
      const warning = row.getByText("Classification review needed", {
        exact: true,
      });
      await expect(warning).toHaveCount(0);
      await page.locator(".tokenCollectionScroll").evaluate((element) => {
        element.scrollLeft = 0;
      });
      await page.locator(".tokenBrowser").screenshot({
        path: info.outputPath(`singleton-${appearance}-${width}.png`),
        animations: "disabled",
      });
    });
  }

for (const story of ["override-diagnostics", "all-mode-override-diagnostics"]) {
  test(`Token browser ${story} keeps compact badges, alias chips and contrast tooltips`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(
      `/iframe.html?id=views-token-browser--${story}&viewMode=story`,
    );
    const table = page.getByRole("treegrid", { name: "Tokens", exact: true });
    await expect(table).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: "Release status", exact: true }),
    ).toBeVisible();
    const header = table.getByRole("columnheader", {
      name: "Override",
      exact: true,
    });
    await expect(header).toHaveText("");
    if (story.startsWith("all-mode")) {
      for (const token of ["red-900", "red-workflow"]) {
        await table
          .getByRole("rowheader")
          .filter({
            hasText: token === "red-900" ? /^red-900$/ : /^red-workflow-icon$/,
          })
          .getByRole("button", { name: /Expand/ })
          .click();
      }
    }
    const overridden = table.locator(
      '[data-token-id="red-900"][data-token-leaf="true"]',
    );
    const referenced = table.locator(
      '[data-token-id="red-workflow"][data-token-leaf="true"]',
    );
    const release = overridden.locator("[data-token-release]");
    const badge = await release.boundingBox();
    const cell = await overridden
      .getByRole("gridcell")
      .filter({
        has: page.locator("[data-token-release]"),
      })
      .boundingBox();
    expect(badge).not.toBeNull();
    expect(cell).not.toBeNull();
    expect(badge!.width).toBeLessThan(cell!.width);
    await overridden.getByText("Override", { exact: true }).hover();
    await expect(page.getByRole("tooltip")).toHaveText(
      "This value is an override to the original generated value",
    );
    const message =
      "Override value does not meet system defined contrast for red 900 of 4.5:1";
    await overridden.getByLabel(message, { exact: true }).hover();
    await expect(page.getByRole("tooltip")).toHaveText(message);
    await expect(referenced.locator(".tokenNameTag")).toHaveText("red-900");
    await expect(referenced.getByText("Override", { exact: true })).toHaveCount(
      0,
    );
    await expect(referenced.getByRole("gridcell").nth(2)).toBeEmpty();
  });
}
