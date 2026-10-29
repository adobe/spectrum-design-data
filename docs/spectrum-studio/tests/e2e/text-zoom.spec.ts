// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { TYPOGRAPHY_DEFAULTS } from "../../src/features/typography/defaults";
import { generateTypography } from "../../src/features/typography/typographyGeneration";
import { enableEditMode } from "./editMode";

function rampSample(page: Page, index: number) {
  return page
    .locator(
      ".typographyRampPreview .typographyElement:not(.typographyElementHeader) .typographyElementSample",
    )
    .nth(index);
}

async function fontSize(page: Page, index: number) {
  return rampSample(page, index).evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  );
}

test("text size adaptive control rescales the typography preview from exported CSS", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Typography" }).dispatchEvent("click");

  const atZero = generateTypography(TYPOGRAPHY_DEFAULTS, 0);
  await expect(page.locator(".typographyRampPreview")).toHaveAttribute(
    "data-text-zoom",
    "0",
  );
  expect(await fontSize(page, 2)).toBe(atZero[2].fontSize);
  expect(await fontSize(page, atZero.length - 1)).toBe(atZero.at(-1)!.fontSize);

  await page.getByRole("button", { name: "Adaptive controls" }).first().click();
  const slider = page.getByRole("slider", { name: "Text size" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");

  const atTwo = generateTypography(TYPOGRAPHY_DEFAULTS, 2);
  await expect(page.locator(".typographyRampPreview")).toHaveAttribute(
    "data-text-zoom",
    "2",
  );
  expect(await fontSize(page, 2)).toBe(atTwo[2].fontSize);
  expect(await fontSize(page, atTwo.length - 1)).toBe(atTwo.at(-1)!.fontSize);
  await expect(page.locator(".typographyRampPreview")).toContainText(
    `${atTwo[2].fontSize}px`,
  );

  await page.getByRole("radio", { name: "Code" }).dispatchEvent("click");
  const code = page.locator('[data-component="Foundations"]');
  await expect(code).toContainText('[data-text-zoom="8"]');
  await expect(code).toContainText("--workflow-icon-size-1500");
  await expect(code).not.toContainText("@media");
  expect(errors).toEqual([]);
});

test("editing a text scaling mode stores the zoom on that mode", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      "leonardo:v1:modes/selection",
      JSON.stringify({
        schemaVersion: 1,
        data: { textScaling: "mode-text-scaling-larger" },
      }),
    );
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Typography" }).dispatchEvent("click");
  await expect(page.locator(".typographyRampPreview")).toHaveAttribute(
    "data-text-zoom",
    "2",
  );

  const field = page.getByRole("textbox", { name: "Text size" });
  await field.fill("3");
  await field.press("Enter");
  await expect(page.locator(".typographyRampPreview")).toHaveAttribute(
    "data-text-zoom",
    "3",
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const stored = JSON.parse(
          localStorage.getItem("leonardo:v1:modes/mode-sets") ?? "null",
        );
        return stored?.data
          .find((set: { id: string }) => set.id === "mode-set-text-scaling")
          ?.modes.find(
            (mode: { id: string }) => mode.id === "mode-text-scaling-larger",
          )?.foundations.typography?.textZoom;
      }),
    )
    .toBe(3);
  const typography = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("leonardo:v1:foundations/typography") ?? "null",
    ),
  );
  expect(typography?.data.textZoom ?? 0).toBe(0);
  expect(errors).toEqual([]);
});
