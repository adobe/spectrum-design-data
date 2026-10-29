// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const MODE_SETS_WITH_DARK_OVERRIDE = [
  {
    id: "mode-set-color-scheme",
    key: "colorScheme",
    name: "Color scheme",
    description: "",
    iconId: "none",
    defaultModeId: "mode-light",
    modes: [
      {
        id: "mode-light",
        key: "light",
        name: "Light",
        description: "",
        iconId: "light",
        platformIds: ["react", "web-components", "ios", "android"],
        foundations: {},
      },
      {
        id: "mode-dark",
        key: "dark",
        name: "Dark",
        description: "",
        iconId: "dark",
        platformIds: ["react", "ios", "android"],
        foundations: { color: { backgroundLightness: 0.2 } },
      },
    ],
  },
];

async function seedDarkOverride(page: Page) {
  await page.addInitScript((modeSets) => {
    localStorage.setItem(
      "leonardo:v1:modes/mode-sets",
      JSON.stringify({ schemaVersion: 2, data: modeSets }),
    );
  }, MODE_SETS_WITH_DARK_OVERRIDE);
}

// The lightness control only reaches view mode once the color scheme set claims it as adaptive.
async function seedAdaptiveClaim(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "leonardo:v1:modes/adaptive-claims",
      JSON.stringify({
        schemaVersion: 1,
        data: { "color.backgroundLightness": "mode-set-color-scheme" },
      }),
    );
  });
}

async function openColors(page: Page) {
  await seedAdaptiveClaim(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await page
    .getByRole("button", { name: "Adaptive controls" })
    .dispatchEvent("click");
}

test("previewing a global parameter shows a custom mode, and selecting a mode resets it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await openColors(page);

  const slider = page.getByRole("slider", { name: "Background lightness" });
  const lightValue = await slider.inputValue();
  const lightRadio = page.getByRole("radio", { name: "Light", exact: true });
  await expect(lightRadio).toHaveAttribute("aria-checked", "true");

  await slider.fill("42");
  await expect(lightRadio).toHaveAttribute("aria-checked", "false");
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-checked", "false");

  await lightRadio.dispatchEvent("click");
  await expect.poll(() => slider.inputValue()).toBe(lightValue);
  await expect(lightRadio).toHaveAttribute("aria-checked", "true");

  expect(errors).toEqual([]);
});

test("selecting the other mode while previewing applies that mode's saved value", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await seedDarkOverride(page);
  await openColors(page);

  const slider = page.getByRole("slider", { name: "Background lightness" });
  const lightRadio = page.getByRole("radio", { name: "Light", exact: true });
  const darkRadio = page.getByRole("radio", { name: "Dark", exact: true });

  await darkRadio.dispatchEvent("click");
  await expect.poll(() => slider.inputValue()).toBe("20");

  await slider.fill("42");
  await expect(darkRadio).toHaveAttribute("aria-checked", "false");

  await darkRadio.dispatchEvent("click");
  await expect.poll(() => slider.inputValue()).toBe("20");

  await slider.fill("42");
  await lightRadio.dispatchEvent("click");
  await expect.poll(() => slider.inputValue()).toBe("100");
  await expect(lightRadio).toHaveAttribute("aria-checked", "true");

  expect(errors).toEqual([]);
});

test("previewing onto a mode's saved value re-selects that mode", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await seedDarkOverride(page);
  await openColors(page);

  const slider = page.getByRole("slider", { name: "Background lightness" });
  await slider.fill("20");
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-checked", "true");

  expect(errors).toEqual([]);
});

test("the mode control stays keyboard reachable while no mode is selected", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await seedDarkOverride(page);
  await openColors(page);

  const slider = page.getByRole("slider", { name: "Background lightness" });
  await slider.fill("42");
  // The adaptive controls popover covers the top bar, so close it before real keyboard interaction.
  await page.keyboard.press("Escape");

  const group = page.getByRole("radiogroup", { name: /Color scheme/ });
  await expect(group).toHaveAttribute("aria-label", "Color scheme, custom");

  // With nothing checked, every option stays tabbable, matching native radio group behavior.
  const tabbable = group.getByRole("radio").and(page.locator('[tabindex="0"]'));
  expect(await tabbable.count()).toBeGreaterThan(0);

  await tabbable.first().focus();
  await page.keyboard.press("Enter");
  await expect(group).toHaveAttribute("aria-label", "Color scheme");

  await page
    .getByRole("button", { name: "Adaptive controls" })
    .dispatchEvent("click");
  await expect.poll(() => slider.inputValue()).not.toBe("42");

  expect(errors).toEqual([]);
});

test("a preview is discarded on reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await seedDarkOverride(page);
  await openColors(page);

  const slider = page.getByRole("slider", { name: "Background lightness" });
  await slider.fill("42");
  await expect(
    page.getByRole("radio", { name: "Light", exact: true }),
  ).toHaveAttribute("aria-checked", "false");

  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await page
    .getByRole("button", { name: "Adaptive controls" })
    .dispatchEvent("click");
  await expect.poll(() => slider.inputValue()).toBe("100");
  await expect(
    page.getByRole("radio", { name: "Light", exact: true }),
  ).toHaveAttribute("aria-checked", "true");

  expect(errors).toEqual([]);
});
