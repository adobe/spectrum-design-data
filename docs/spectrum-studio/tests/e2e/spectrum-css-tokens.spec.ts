// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import { selectMode } from "./modeControl";
import {
  expectSpectrumCssTokens,
  spectrumCssReference,
} from "./spectrumCssTokens";

test("Spectrum CSS variables resolve in app themes, overlays and independent preview scopes", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  const header = page.locator(".typographyElementHeader");
  const row = page
    .locator(".typographyElement:not(.typographyElementHeader)")
    .first();
  await expect(header).toBeVisible();
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  const light = await spectrumCssReference(page, "light");
  const dark = await spectrumCssReference(page, "dark");
  const appearance = page.getByRole("button", {
    name: "Dark app appearance",
    exact: true,
  });
  expect(light.gray300).not.toBe(dark.gray300);
  for (const scheme of ["light", "dark", "light"] as const) {
    if (
      (await appearance.getAttribute("aria-pressed")) !==
      String(scheme === "dark")
    ) {
      await appearance.click();
    }
    const reference = scheme === "light" ? light : dark;
    await expectSpectrumCssTokens(header, reference);
    await expectSpectrumCssTokens(page.locator("body"), reference);
    await expect(header).toHaveCSS("border-bottom-style", "solid");
    await expect(header).toHaveCSS("border-bottom-width", "1px");
    await expect(header).toHaveCSS(
      "border-bottom-color",
      reference.headerBorder,
    );
    await expect(row).toHaveCSS("border-bottom-width", "1px");
    await expect(row).toHaveCSS("border-bottom-color", reference.rowBorder);
    await page.getByRole("button", { name: /Show$/ }).click();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await expectSpectrumCssTokens(list, reference);
    await page.keyboard.press("Escape");
  }
  for (const width of [1600, 480]) {
    await page.setViewportSize({ width, height: 900 });
    await expectSpectrumCssTokens(header, light);
    await expect(header).toHaveCSS("border-bottom-width", "1px");
    await page.screenshot({
      path: info.outputPath(`spectrum-typography-${width}.png`),
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 1600, height: 900 });
  await appearance.click();
  await page.getByRole("radio", { name: "Preview", exact: true }).click();
  const preview = page.locator(".sampleApp");
  await expect(preview).toHaveAttribute("data-scheme", "light");
  await expectSpectrumCssTokens(preview, light);
  await expectSpectrumCssTokens(page.locator("body"), dark);
  await selectMode(page, "Dark");
  await expect(preview).toHaveAttribute("data-scheme", "dark");
  await expectSpectrumCssTokens(preview, dark);
  await appearance.click();
  await expectSpectrumCssTokens(page.locator("body"), light);
  await expectSpectrumCssTokens(preview, dark);
  await selectMode(page, "Light");
  await expect(preview).toHaveAttribute("data-scheme", "light");
  await expectSpectrumCssTokens(preview, light);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(stored);
  expect(errors).toEqual([]);
});
