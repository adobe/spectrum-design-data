// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { PROTOTYPE_STORAGE_KEYS } from "../../src/state/persist";

declare global {
  interface Window {
    prototypeWrites: string[];
  }
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  await page.addInitScript((keys) => {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of keys) storage.setItem(key, "obsolete prototype edits");
      storage.setItem("unrelated-app", "preserve");
    }
    window.prototypeWrites = [];
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (keys.includes(key)) window.prototypeWrites.push(key);
      setItem.call(this, key, value);
    };
  }, PROTOTYPE_STORAGE_KEYS);
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  expect(await page.evaluate(() => window.prototypeWrites)).toEqual([]);
  const storage = await page.evaluate(
    (keys) =>
      [localStorage, sessionStorage].map((storage) => ({
        owned: keys.filter((key) => storage.getItem(key) !== null),
        unrelated: storage.getItem("unrelated-app"),
      })),
    PROTOTYPE_STORAGE_KEYS,
  );
  expect(storage).toEqual([
    { owned: [], unrelated: "preserve" },
    { owned: [], unrelated: "preserve" },
  ]);
});
async function navigate(page: Page, name: string) {
  await page.getByRole("radio", { name, exact: true }).click();
}
async function colors(page: Page, tab: string) {
  await navigate(page, "Foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  if (await page.getByRole("tab", { name: tab, exact: true }).isVisible())
    await page.getByRole("tab", { name: tab, exact: true }).click();
  else {
    await page.getByRole("button", { name: /Color system controls/ }).click();
    await page.getByRole("option", { name: tab, exact: true }).click();
  }
}
for (const width of [1280, 800, 390]) {
  test(`Names-only foundations, shared rename and clean reload at ${width}px`, async ({
    page,
  }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width === 390)
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("button", { name: /^Change log/ }).click();
    await colors(page, "Palette");
    await expect(
      page.getByRole("button", { name: "Token classification", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Add palette color", exact: true })
      .click();
    let name = page
      .getByRole("combobox", { name: "Palette color name", exact: true })
      .last();
    await name.fill("Red");
    if ((await name.getAttribute("aria-expanded")) !== "true")
      await name.press("ArrowDown");
    await page.getByRole("option", { name: "Red", exact: true }).click();
    await expect(name).toHaveValue("Red");
    await name.fill("My Orange");
    await name.press("Enter");
    await expect(
      page.getByRole("button", {
        name: "Delete palette color My Orange",
        exact: true,
      }),
    ).toBeVisible();
    await colors(page, "Color scales");
    await expect(
      page.getByRole("button", { name: "My Orange", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Token classification", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "My Orange", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "Color scale name", exact: true }),
    ).toHaveValue("My Orange");
    await page.screenshot({
      path: info.outputPath(`scale-names-${width}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await navigate(page, "Tokens");
    await page
      .getByRole("searchbox", { name: "Search tokens" })
      .fill("my-orange-100");
    await expect(
      page.getByRole("row", { name: "my-orange-100", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("treegrid")).toContainText(
      "Color name: My Orange",
    );
    if (width === 390) {
      await page.getByRole("radio", { name: "Grid view", exact: true }).click();
      await page.getByRole("row", { name: /^my-orange-100\s/ }).click();
    } else
      await page
        .getByRole("button", { name: "Open my-orange-100", exact: true })
        .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(
      "Names, types and steps come from the foundation",
    );
    await expect(
      dialog.getByRole("button", { name: /Property|Scale index|Color name/ }),
    ).toHaveCount(0);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await colors(page, "Palette");
    name = page
      .getByRole("combobox", { name: "Palette color name", exact: true })
      .last();
    await name.fill("Blue");
    await name.press("Tab");
    await expect(page.getByText(/already owned/)).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Delete palette color My Orange",
        exact: true,
      }),
    ).toBeVisible();
    await name.fill("Later draft");
    await name.press("Enter");
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Discard edits", exact: true })
      .click();
    await expect(
      page
        .locator("[data-palette-source]")
        .getByText("My Orange", { exact: true }),
    ).toBeVisible();
    await page.reload();
    if (width === 390)
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Change log", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Change log/ }).click();
    await colors(page, "Color scales");
    await expect(
      page
        .getByRole("tabpanel", { name: "Colors", exact: true })
        .getByRole("button", { name: "Red", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "My Orange", exact: true }),
    ).toHaveCount(0);
    for (const tab of ["Typography", "Spacing", "Size"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Token classification", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Token names and step mappings", { exact: true }),
      ).toHaveCount(0);
      if (tab !== "Typography") {
        await expect(
          page
            .getByRole("region", {
              name: `Global ${tab.toLowerCase()} scale`,
              exact: true,
            })
            .getByRole("textbox", { name: "Name", exact: true }),
        ).toHaveValue("Global");
        await page.screenshot({
          path: info.outputPath(`${tab.toLowerCase()}-${width}.png`),
          animations: "disabled",
        });
      }
    }
    await navigate(page, "Registry");
    await expect(page.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "horizontal",
    );
    await page.screenshot({
      path: info.outputPath(`registry-${width}.png`),
      animations: "disabled",
    });
  });
}
