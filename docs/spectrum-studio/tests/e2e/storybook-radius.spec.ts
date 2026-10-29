// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("Radius sample stories retain exact geometry and explicit invalid feedback in both themes", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const cases = [
    ["base", 8],
    ["zero", 0],
    ["small", 4],
    ["large", 24],
    ["sample-boundary", 56],
    ["oversized", 80],
    ["negative", -2],
    ["invalid", NaN],
  ] as const;
  for (const theme of ["light", "dark"])
    for (const [story, radius] of cases) {
      await page.setViewportSize({
        width: theme === "dark" ? 320 : 1280,
        height: 500,
      });
      await page.goto(
        `/iframe.html?id=views-radius-sample--${story}&viewMode=story&globals=colorScheme:${theme}`,
      );
      const sample = page.locator('[data-component="RadiusSample"]');
      await expect(sample).toBeVisible();
      expect(
        await sample.evaluate(
          (element) => element.getBoundingClientRect().width,
        ),
      ).toBe(56);
      expect(
        await sample.evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
      ).toBe(56);
      if (Number.isFinite(radius) && radius >= 0) {
        await expect(sample).toHaveCSS(
          "border-top-right-radius",
          `${radius}px`,
        );
        await expect(sample).toHaveCSS("border-top-left-radius", "0px");
        await expect(sample).toHaveCSS("border-bottom-left-radius", "0px");
        await expect(sample).toHaveCSS("border-bottom-right-radius", "0px");
      } else await expect(sample).toContainText("Unavailable");
      await sample.screenshot({
        path: info.outputPath(`radius-${story}-${theme}.png`),
      });
    }
  expect(errors).toEqual([]);
});
