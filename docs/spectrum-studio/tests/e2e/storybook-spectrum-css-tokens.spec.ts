// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import {
  expectSpectrumCssTokens,
  spectrumCssReference,
} from "./spectrumCssTokens";

test("Shared Spectrum CSS imports cover Storybook themes and nested dark Providers", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [story, scheme, global] of [
    ["grid", "light", "light"],
    ["grid", "dark", "dark"],
    ["dark", "dark", "light"],
  ] as const) {
    await page.goto(
      `/iframe.html?id=views-token-browser--${story}&viewMode=story&globals=colorScheme:${global}`,
    );
    const browser = page.locator(".tokenBrowser");
    await expect(browser).toBeVisible();
    await expectSpectrumCssTokens(
      browser,
      await spectrumCssReference(page, scheme),
    );
  }
  expect(errors).toEqual([]);
});
