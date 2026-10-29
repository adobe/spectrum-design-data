// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { enableEditMode } from "./editMode";

// Stored v5 state from a session where Light/Dark stopped changing the preview: no ownership was recorded.
const storedV5 = [
  {
    id: "mode-set-color-scheme",
    key: "colorScheme",
    name: "Color scheme",
    description: "",
    defaultModeId: "mode-light",
    iconId: "none",
    modes: [
      {
        id: "mode-light",
        key: "light",
        name: "Light",
        description: "",
        iconId: "light",
        platformIds: ["react"],
        foundations: {},
      },
      {
        id: "mode-dark",
        key: "dark",
        name: "Dark",
        description: "",
        iconId: "dark",
        platformIds: ["react"],
        foundations: {
          color: { backgroundScaleId: "scale-1", backgroundLightness: 0 },
        },
      },
    ],
  },
  {
    id: "mode-set-custom-contrast",
    key: "contrast",
    name: "Contrast",
    description: "",
    defaultModeId: "mode-regular",
    iconId: "contrast",
    modes: [
      {
        id: "mode-regular",
        key: "regular",
        name: "Regular",
        description: "",
        iconId: "none",
        platformIds: [],
        foundations: {},
      },
      {
        id: "mode-high",
        key: "high",
        name: "High",
        description: "",
        iconId: "none",
        platformIds: [],
        foundations: {},
      },
    ],
  },
];

async function seed(page: Page) {
  await page.addInitScript((modeSets) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem(
      "leonardo:v1:modes/mode-sets",
      JSON.stringify({ schemaVersion: 5, data: modeSets }),
    );
    localStorage.setItem(
      "leonardo:v1:modes/selection",
      JSON.stringify({ schemaVersion: 1, data: { colorScheme: "mode-light" } }),
    );
    localStorage.setItem(
      "leonardo:v1:modes/adaptive-claims",
      JSON.stringify({
        schemaVersion: 1,
        data: { "color.backgroundLightness": "mode-set-color-scheme" },
      }),
    );
  }, storedV5);
}

async function openColorElements(page: Page) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");
  return page.getByRole("button", { name: /Copy resolved background color/ });
}

test("Light/Dark switches the preview after loading legacy mode data with inline controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1600, height: 900 });
  await seed(page);
  await page.goto("/");
  const background = await openColorElements(page);
  const light = await background.getAttribute("aria-label");
  await page
    .getByRole("radio", { name: "Dark", exact: true })
    .dispatchEvent("click");
  await expect(background).not.toHaveAttribute("aria-label", light!);

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("leonardo:v1:modes/mode-sets")!)
            .schemaVersion,
      ),
    )
    .toBe(6);
  await page.reload();
  await expect(await openColorElements(page)).not.toHaveAttribute(
    "aria-label",
    light!,
  );
  expect(errors).toEqual([]);
});

test("Light/Dark switches the preview from the collapsed Modes picker", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 850 });
  await enableEditMode(page);
  await seed(page);
  await page.goto("/");
  const background = await openColorElements(page);
  const light = await background.getAttribute("aria-label");
  await page.getByRole("button", { name: /^Modes/ }).click();
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(background).not.toHaveAttribute("aria-label", light!);
  expect(errors).toEqual([]);
});
