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
  "exports",
  "export-unavailable",
  "export-errors",
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
      await warning.scrollIntoViewIfNeeded();
      await expect(warning).toBeVisible();
      await expect
        .poll(async () =>
          warning.evaluate((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return new Set(
              Array.from(range.getClientRects(), (rect) =>
                Math.round(rect.top),
              ),
            ).size;
          }),
        )
        .toBe(1);
      await page.locator(".tokenCollectionScroll").evaluate((element) => {
        element.scrollLeft = 0;
      });
      await page.locator(".tokenBrowser").screenshot({
        path: info.outputPath(`singleton-${appearance}-${width}.png`),
        animations: "disabled",
      });
    });
  }
