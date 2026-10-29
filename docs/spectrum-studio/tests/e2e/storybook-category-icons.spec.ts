// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { categoryIconConfiguration } from "../../src/features/icons/categoryIcons";

const pageErrors = new WeakMap<Page, string[]>();
const consoleErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [],
    diagnostics: string[] = [];
  pageErrors.set(page, errors);
  consoleErrors.set(page, diagnostics);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.push(message.text());
  });
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

for (const appearance of ["light", "dark"])
  for (const width of [1280, 390]) {
    test(`Category associations load in ${appearance} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=components-category-icon--associations&viewMode=story&globals=colorScheme:${appearance}`,
      );
      const icons = page.locator("[data-category]");
      await expect(icons).toHaveCount(
        Object.keys(categoryIconConfiguration.categories).length,
      );
      await expect(page.locator("[data-category-icon-loading]")).toHaveCount(0);
      for (const icon of await icons.all()) {
        await expect(icon).toHaveAttribute("data-category-icon", /.+/);
        expect(
          await icon.evaluate(
            (element) =>
              element.querySelectorAll(
                "path, circle, rect, polygon, ellipse, line",
              ).length,
          ),
        ).toBeGreaterThan(0);
      }
      expect(consoleErrors.get(page)).toEqual([]);
    });
  }

test("One injected JSON change updates existing category consumers", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=components-category-icon--shared-configuration&viewMode=story",
  );
  await expect(page.locator("#storybook-root")).toHaveAttribute(
    "data-play-complete",
    "true",
  );
  expect(consoleErrors.get(page)).toEqual([]);
});

test("Icon-only controls preserve their accessible name and native icon styles", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=components-category-icon--default&viewMode=story",
  );
  const buttons = page.getByRole("button", { name: "Tokens", exact: true });
  await expect(buttons).toHaveCount(2);
  await expect(page.locator("[data-category-icon-loading]")).toHaveCount(0);
  const native = page
    .getByRole("button", { name: "Native icon reference" })
    .locator("svg");
  const nativeStyles = await native.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: style.width,
      height: style.height,
      color: style.color,
      display: style.display,
    };
  });
  for (const button of await buttons.all()) {
    await expect(button.locator("svg")).toHaveAttribute("aria-hidden", "true");
    expect(
      await button.locator("svg").evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          width: style.width,
          height: style.height,
          color: style.color,
          display: style.display,
        };
      }),
    ).toEqual(nativeStyles);
    await button.focus();
    await expect(button).toBeFocused();
  }
  expect(consoleErrors.get(page)).toEqual([]);
});

test("A failed icon download reports its cause and renders Circle", async ({
  page,
}) => {
  let failedUrl = "";
  await page.route("**/assets/Layers-*.js", async (route) => {
    failedUrl = route.request().url();
    await route.abort("failed");
  });
  await page.goto(
    "/iframe.html?id=components-category-icon--associations&viewMode=story",
  );
  const icon = page.locator('[data-category="elevation"]');
  await expect(icon).toHaveAttribute("data-category-icon", "Circle");
  expect(failedUrl).not.toBe("");
  const cause = `Could not load Layers: Failed to fetch dynamically imported module: ${failedUrl}`;
  await expect(icon).toHaveAttribute("data-category-icon-error", cause);
  await expect
    .poll(() => consoleErrors.get(page)?.slice().sort())
    .toEqual([cause, "Failed to load resource: net::ERR_FAILED"].sort());
});

for (const scenario of [
  {
    story: "missing-category",
    count: 2,
    error:
      'Category icon configuration: missing association for "unmapped-category".',
  },
  {
    story: "invalid-icon",
    count: 1,
    error:
      'Category icon configuration: unsupported icon "NotAnInstalledIcon" for "color".',
  },
]) {
  test(`${scenario.story} reports the exact error and renders Circle`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=components-category-icon--${scenario.story}&viewMode=story`,
    );
    await expect(page.locator('[data-category-icon="Circle"]')).toHaveCount(
      scenario.count,
    );
    await expect.poll(() => consoleErrors.get(page)).toEqual([scenario.error]);
    for (const icon of await page.locator("[data-category-icon-error]").all())
      await expect(icon).toHaveAttribute(
        "data-category-icon-error",
        scenario.error,
      );
  });
}
