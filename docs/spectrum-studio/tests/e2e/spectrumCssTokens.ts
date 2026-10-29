// Copyright 2026 Adobe. All rights reserved.
import { expect, type Locator, type Page } from "@playwright/test";

export async function spectrumCssReference(
  page: Page,
  scheme: "light" | "dark",
) {
  return page.evaluate((scheme) => {
    const reference = document.createElement("div");
    reference.className = `spectrum spectrum--${scheme}`;
    reference.style.borderBottom = "1px solid var(--spectrum-gray-300)";
    reference.style.borderTop = "1px solid var(--spectrum-gray-200)";
    document.body.append(reference);
    const style = getComputedStyle(reference);
    const result = {
      gray200: style.getPropertyValue("--spectrum-gray-200").trim(),
      gray300: style.getPropertyValue("--spectrum-gray-300").trim(),
      global: style.getPropertyValue("--spectrum-opacity-disabled").trim(),
      headerBorder: style.borderBottomColor,
      rowBorder: style.borderTopColor,
    };
    reference.remove();
    return result;
  }, scheme);
}

export async function expectSpectrumCssTokens(
  root: Locator,
  reference: Awaited<ReturnType<typeof spectrumCssReference>>,
) {
  expect(reference.gray200).not.toBe("");
  expect(reference.gray300).not.toBe("");
  expect(reference.global).not.toBe("");
  await expect
    .poll(() =>
      root.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          gray200: style.getPropertyValue("--spectrum-gray-200").trim(),
          gray300: style.getPropertyValue("--spectrum-gray-300").trim(),
          global: style.getPropertyValue("--spectrum-opacity-disabled").trim(),
        };
      }),
    )
    .toEqual({
      gray200: reference.gray200,
      gray300: reference.gray300,
      global: reference.global,
    });
}
