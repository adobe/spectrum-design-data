// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("Brand navigation supports keyboard focus without growing the Top Bar", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    "/iframe.html?id=components-top-bar--home-navigation&viewMode=story",
  );
  await expect(page.locator("#storybook-root")).toHaveAttribute(
    "data-play-complete",
    "true",
  );
  const home = page.getByRole("button", { name: "Spectrum Studio home" });
  await home.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(home).toBeFocused();
  const geometry = await home.evaluate((element) => {
    const header = element.closest("header")!.getBoundingClientRect();
    const button = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    return {
      headerHeight: header.height,
      buttonHeight: button.height,
      topSpace: button.top - header.top,
      bottomSpace: header.bottom - button.bottom,
      radius: parseFloat(styles.borderTopLeftRadius),
      outlineWidth: parseFloat(styles.outlineWidth),
      outlineOffset: parseFloat(styles.outlineOffset),
      outlineStyle: styles.outlineStyle,
      outlineColor: styles.outlineColor,
    };
  });
  expect(geometry.headerHeight).toBe(56);
  expect(geometry.buttonHeight).toBe(32);
  expect(geometry.radius).toBeGreaterThan(0);
  expect(geometry.outlineWidth).toBeGreaterThan(0);
  expect(geometry.outlineStyle).not.toBe("none");
  expect(geometry.outlineColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(geometry.outlineColor).not.toBe("transparent");
  const outlineSize = geometry.outlineWidth + geometry.outlineOffset;
  expect(geometry.topSpace).toBeGreaterThanOrEqual(outlineSize);
  expect(geometry.bottomSpace).toBeGreaterThanOrEqual(outlineSize);
  await expect(home.locator("img")).toHaveAttribute("alt", "");
  expect(errors).toEqual([]);
});
