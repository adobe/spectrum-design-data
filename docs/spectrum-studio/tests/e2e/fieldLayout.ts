// Copyright 2026 Adobe. All rights reserved.
import { expect, type Locator, type Page } from "@playwright/test";

export function field(page: Page, id: string) {
  return page.getByTestId(id).locator("> div").first();
}

export async function geometry(root: Locator) {
  return root.evaluate((element) => {
    const children = Array.from(element.children);
    const label = children.find((child) =>
      getComputedStyle(child).gridArea.startsWith("label"),
    );
    const input = children.find((child) =>
      getComputedStyle(child).gridArea.startsWith("input"),
    );
    if (!label || !input || !element.parentElement)
      throw new Error("The Spectrum field slots are missing.");
    const rootStyle = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const labelBounds = label.getBoundingClientRect();
    const inputBounds = input.getBoundingClientRect();
    return {
      width: bounds.width,
      usableWidth:
        bounds.width -
        parseFloat(rootStyle.paddingLeft) -
        parseFloat(rootStyle.paddingRight) -
        parseFloat(rootStyle.borderLeftWidth) -
        parseFloat(rootStyle.borderRightWidth),
      labelWidth: labelBounds.width,
      valueWidth: inputBounds.width,
      gap: parseFloat(rootStyle.columnGap),
      valueStart: inputBounds.left - bounds.left,
      labelTop: labelBounds.top,
      valueTop: inputBounds.top,
      rootOverflow: element.scrollWidth - element.clientWidth,
      parentOverflow:
        element.parentElement.scrollWidth - element.parentElement.clientWidth,
      valueOverflow: input.scrollWidth - input.clientWidth,
      areas: rootStyle.gridTemplateAreas,
    };
  });
}

export async function expectEqualColumns(root: Locator) {
  await expect(root).toBeVisible();
  await expect
    .poll(() =>
      root.evaluate(
        (element) =>
          Array.from(element.children).filter((child) =>
            ["label", "input"].some((area) =>
              getComputedStyle(child).gridArea.startsWith(area),
            ),
          ).length,
      ),
    )
    .toBe(2);
  await expect
    .poll(async () => {
      const bounds = await geometry(root);
      return Math.abs(bounds.labelWidth - bounds.valueWidth);
    })
    .toBeLessThanOrEqual(1);
  const bounds = await geometry(root);
  expect(bounds.labelWidth).toBeGreaterThan(0);
  expect(
    Math.abs(
      bounds.labelWidth + bounds.valueWidth + bounds.gap - bounds.usableWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(bounds.rootOverflow).toBeLessThanOrEqual(1);
  expect(bounds.parentOverflow).toBeLessThanOrEqual(1);
  return bounds;
}
