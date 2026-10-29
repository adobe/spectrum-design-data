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
  "components-panel--default",
  "components-token-combobox--default",
  "components-dividable-combobox--default",
]) {
  test(`${story} completes its keyboard and pointer interactions`, async ({
    page,
  }) => {
    await page.goto(`/iframe.html?id=${story}&viewMode=story`);
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
  });
}

for (const appearance of ["light", "dark"])
  for (const width of [1280, 480]) {
    test(`Token tags and ComboBoxes keep exact styles and native input geometry in ${appearance} at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(
        `/iframe.html?id=components-token-name-tag--long-name&viewMode=story&globals=colorScheme:${appearance}`,
      );
      const tag = page.locator(".tokenNameTag");
      await expect(tag).toHaveCSS("font-size", "12px");
      await expect(tag).toHaveCSS("padding-left", "5px");
      await expect(tag).toHaveCSS("padding-right", "5px");
      await expect(tag).toHaveCSS("border-radius", "4px");
      await expect(tag).toHaveCSS("text-overflow", "ellipsis");
      expect(
        await tag.evaluate((element) => {
          const probe = document.createElement("span");
          probe.style.backgroundColor = "var(--spectrum-gray-100)";
          element.parentElement!.append(probe);
          const matches =
            getComputedStyle(element).backgroundColor ===
            getComputedStyle(probe).backgroundColor;
          probe.remove();
          return matches;
        }),
      ).toBe(true);
      await page.goto(
        `/iframe.html?id=components-token-combobox--narrow-long-name&viewMode=story&globals=colorScheme:${appearance}`,
      );
      const input = page.getByRole("combobox", {
        name: /^Default size(?: |$)/,
      });
      const selectedTag = page
        .locator(".tokenComboBoxPrefix")
        .getByTitle("size-container-layout-for-small-screens-100");
      await expect(selectedTag).toBeVisible();
      expect((await input.boundingBox())!.width).toBe(0);
      expect((await selectedTag.boundingBox())!.width).toBeGreaterThanOrEqual(
        50,
      );
      await expect(selectedTag).toHaveCSS("display", "block");
      await expect(selectedTag).toHaveCSS("text-overflow", "ellipsis");
      const clear = page.getByRole("button", { name: "Clear Default size" });
      expect((await clear.boundingBox())!.y).toBeGreaterThanOrEqual(
        (await input.boundingBox())!.y + (await input.boundingBox())!.height,
      );
      expect(
        await page
          .locator('[data-component="TokenComboBox"]')
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      await page.locator('[data-component="TokenComboBox"]').screenshot({
        path: info.outputPath(`token-combobox-${appearance}-${width}.png`),
      });
      await selectedTag.click();
      await expect(input).toBeFocused();
      expect((await input.boundingBox())!.width).toBeGreaterThanOrEqual(20);
      await expect(input).toHaveValue("");
      await input.fill("not a token");
      await input.press("Escape");
      await input.press("Tab");
      await expect(selectedTag).toBeVisible();
      await expect(input).toHaveAccessibleName(
        "Default size size-container-layout-for-small-screens-100",
      );
      await page.goto(
        `/iframe.html?id=components-token-combobox--compact-required&viewMode=story&globals=colorScheme:${appearance}`,
      );
      const compactInput = page.getByRole("combobox", {
        name: /^Default size width(?: |$)/,
      });
      const compactTag = page
        .locator(".tokenComboBoxPrefix")
        .getByTitle("size-global-100");
      await expect(compactTag).toBeVisible();
      expect((await compactInput.boundingBox())!.width).toBe(0);
      expect((await compactTag.boundingBox())!.width).toBeGreaterThanOrEqual(
        45,
      );
      expect(
        await page
          .locator('[data-component="TokenComboBox"]')
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      await expect(
        page.getByRole("button", { name: "Clear Default size width" }),
      ).toHaveCount(0);
      await page.keyboard.press("Tab");
      await expect(compactInput).toBeFocused();
      expect((await compactInput.boundingBox())!.width).toBeGreaterThanOrEqual(
        20,
      );
      await compactInput.press("ArrowDown");
      await expect(
        page.getByRole("option", { name: "size-global-200", exact: true }),
      ).toBeVisible();
    });
  }

for (const width of [800, 320]) {
  test(`Native menus exceed compact fields and stay within a ${width}px viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto(
      "/iframe.html?id=components-token-combobox--compact-required&viewMode=story",
    );
    const control = page.locator('[data-component="TokenComboBox"]');
    await expect(control.locator(".tokenComboBoxMenuMeasurement")).toHaveCount(
      0,
    );
    await control.locator('button[aria-haspopup="listbox"]').click();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await expect(control.locator(".tokenComboBoxMenuMeasurement")).toHaveCount(
      1,
    );
    await page.evaluate(() => document.fonts.ready);
    const intrinsicWidth = await control
      .locator(".tokenComboBoxMenuMeasurement")
      .evaluate((element) =>
        Math.ceil(element.getBoundingClientRect().width + 60),
      );
    await expect
      .poll(async () => Math.round((await list.boundingBox())!.width))
      .toBe(Math.min(intrinsicWidth, width - 24));
    const bounds = (await list.boundingBox())!;
    expect(bounds.width).toBeGreaterThan((await control.boundingBox())!.width);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    const tag = list.getByTitle("size-global-200", { exact: true });
    await expect(tag).toBeVisible();
    await expect
      .poll(() =>
        tag.evaluate((element) => element.scrollWidth <= element.clientWidth),
      )
      .toBe(true);
    if (width === 800) {
      const description = list.getByText(
        "This token cannot resolve to a valid length.",
        { exact: true },
      );
      await expect(description).toBeVisible();
      expect((await description.boundingBox())!.height).toBe(16);
      await page.setViewportSize({ width: 320, height: 700 });
      await expect
        .poll(async () => Math.round((await list.boundingBox())!.width))
        .toBe(Math.min(intrinsicWidth, 296));
      await expect
        .poll(async () => (await list.boundingBox())!.x)
        .toBeGreaterThanOrEqual(0);
      await expect
        .poll(async () => {
          const resized = (await list.boundingBox())!;
          return resized.x + resized.width;
        })
        .toBeLessThanOrEqual(320);
    }
    await page.mouse.click(0, 0);
    await expect(list).toHaveCount(0);
    await expect(control.locator(".tokenComboBoxMenuMeasurement")).toHaveCount(
      0,
    );
  });
}

test("Automatic menus fit long token names; custom pixel widths override content sizing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto(
    "/iframe.html?id=components-token-combobox--narrow-long-name&viewMode=story",
  );
  await page
    .locator('[data-component="TokenComboBox"] button[aria-haspopup="listbox"]')
    .click();
  const list = page.getByRole("listbox");
  const tag = list.getByTitle("size-container-layout-for-small-screens-100");
  await expect(tag).toBeVisible();
  expect(
    await tag.evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  const longWidth = (await list.boundingBox())!.width;
  await page.goto(
    "/iframe.html?id=components-token-combobox--custom-menu-width&viewMode=story",
  );
  await page
    .locator('[data-component="TokenComboBox"] button[aria-haspopup="listbox"]')
    .click();
  await expect
    .poll(async () => Math.round((await list.boundingBox())!.width))
    .toBe(300);
  await expect(page.locator(".tokenComboBoxMenuMeasurement")).toHaveCount(0);
  await page.setViewportSize({ width: 280, height: 700 });
  await expect
    .poll(async () => Math.round((await list.boundingBox())!.width))
    .toBe(256);
  expect(longWidth).toBeGreaterThan(200);
});

test("Presets use plain text and native sections; token-only menus have no separator", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=components-token-combobox--preset&viewMode=story",
  );
  const field = page.getByRole("combobox", { name: /^Default size(?: |$)/ });
  await expect(field).toHaveValue("Hug");
  await expect(page.locator(".tokenComboBoxPrefix .tokenNameTag")).toHaveCount(
    0,
  );
  await field.click();
  await expect(field).toHaveValue("Hug");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await field.fill("");
  await expect(
    page.getByRole("option", { name: "Hug", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Fill", exact: true }),
  ).toBeVisible();
  const dividerCount = () =>
    page.getByRole("listbox").evaluate(
      (element) =>
        [...element.querySelectorAll("div")].filter((child) => {
          const css = getComputedStyle(child);
          return (
            css.height === "2px" && css.backgroundColor !== "rgba(0, 0, 0, 0)"
          );
        }).length,
    );
  await expect.poll(dividerCount).toBe(1);
  await page.goto(
    "/iframe.html?id=components-token-combobox--tokens-only&viewMode=story",
  );
  await field.focus();
  await field.press("ArrowDown");
  await expect.poll(dividerCount).toBe(0);
  await expect(
    page.getByRole("option").filter({ hasText: "size-invalid-100" }),
  ).toHaveAttribute("aria-disabled", "true");
});

test("Values retain token identity, invalid references are visible, and read-only split inspection preserves Mixed", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=components-token-combobox--values&viewMode=story",
  );
  const valueField = page.getByRole("combobox", { name: "Default size" });
  await expect(valueField).toHaveValue("24px");
  await valueField.click();
  await expect(valueField).toHaveValue("24px");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.goto(
    "/iframe.html?id=components-token-combobox--filtered-selection&viewMode=story",
  );
  await expect(
    page.getByRole("combobox", { name: /^Default size(?: |$)/ }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.locator(".tokenComboBoxPrefix").getByTitle("size-global-200"),
  ).toBeVisible();
  await page.goto(
    "/iframe.html?id=components-token-combobox--missing&viewMode=story",
  );
  await expect(
    page.getByRole("combobox", { name: "Default size" }),
  ).toHaveAttribute("placeholder", "Unavailable token");
  await expect(
    page.getByText("This token is no longer available."),
  ).toBeVisible();
  await page.goto(
    "/iframe.html?id=components-dividable-combobox--mixed&viewMode=story",
  );
  const combined = page.getByRole("combobox", { name: /^Padding(?: |$)/ });
  await expect(combined).toBeDisabled();
  await page
    .getByRole("button", { name: "Use individual padding values" })
    .click();
  await expect(combined).toHaveAttribute("placeholder", "Mixed");
  await page.goto(
    "/iframe.html?id=components-dividable-combobox--disabled&viewMode=story",
  );
  await page
    .getByRole("button", { name: "Use individual padding values" })
    .click();
  await expect(
    page.getByRole("combobox", { name: /^Top padding(?: |$)/ }),
  ).toBeDisabled();
});

test("Panel scrolling, stable sample geometry, and invalid output are inspectable without application state", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=components-panel--scrolling&viewMode=story");
  const panel = page.getByRole("region", {
    name: "Example settings",
    exact: true,
  });
  await page
    .getByRole("textbox", { name: "Setting 12", exact: true })
    .scrollIntoViewIfNeeded();
  expect(await panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  await expect(panel).toHaveCSS("border-radius", "16px");
  await page.goto(
    "/iframe.html?id=views-structure-preview--hug&viewMode=story",
  );
  await expect(
    page.getByRole("img", { name: "Example structure preview" }),
  ).toHaveCSS("width", "130px");
  await expect(
    page.getByRole("img", { name: "Example structure preview" }),
  ).toHaveCSS("height", "66px");
  await page.goto(
    "/iframe.html?id=views-structure-preview--spacing&viewMode=story",
  );
  await expect(
    page.getByRole("img", { name: "Example structure preview" }),
  ).toHaveCSS("width", "178px");
  await expect(
    page.getByRole("img", { name: "Example structure preview" }),
  ).toHaveCSS("height", "98px");
  await page.goto(
    "/iframe.html?id=views-structure-preview--fill-and-align&viewMode=story",
  );
  const sample = page.getByRole("img", { name: "Example structure preview" });
  await expect(sample).toHaveCSS("width", "480px");
  await expect(sample).toHaveCSS("height", "240px");
  await expect(sample).toHaveCSS("justify-content", "center");
  await expect(sample).toHaveCSS("align-items", "flex-end");
  await page.goto(
    "/iframe.html?id=views-structure-preview--invalid&viewMode=story",
  );
  await expect(page.getByRole("alert")).toContainText(
    "linked token is unavailable",
  );
  await expect(
    page.getByRole("img", { name: "Example structure preview" }),
  ).toHaveCount(0);
});
