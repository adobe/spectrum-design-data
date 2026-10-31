// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

for (const appearance of ["light", "dark"])
  for (const story of ["opacity", "opacity-editing", "opacity-deprecated"]) {
    test(`Token inspector ${story} fills its preview surface in ${appearance}`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(
        `/iframe.html?id=panels-token-inspector--${story}&viewMode=story&globals=colorScheme:${appearance}`,
      );
      const previews = page.locator('[data-token-preview="opacity"]');
      await expect(previews).toHaveCount(
        story === "opacity-deprecated" ? 2 : 1,
      );
      for (const preview of await previews.all()) {
        const shape = preview.locator(".valuePreviewShape-opacity");
        await expect(shape).toBeVisible();
        const area = await preview.boundingBox();
        const fill = await shape.boundingBox();
        expect(area).not.toBeNull();
        expect(fill).not.toBeNull();
        expect(Math.abs(area!.width - fill!.width)).toBeLessThan(1);
        expect(Math.abs(area!.height - fill!.height)).toBeLessThan(1);
        await expect(preview).toHaveCSS("outline-style", "none");
        expect(
          await shape.evaluate(
            (element) => getComputedStyle(element).backgroundImage,
          ),
        ).toContain("repeating-conic-gradient");
      }
      if (story === "opacity") {
        await expect(
          previews.first().getByRole("group", { name: "opacity-medium" }),
        ).toBeVisible();
        const label = previews.first().getByText("40%", { exact: true });
        await expect(label).toHaveCSS("opacity", "1");
        const before = await previews
          .first()
          .locator(".valuePreviewShape-opacity")
          .evaluate((element) => getComputedStyle(element).backgroundImage);
        expect(before).toMatch(/linear-gradient\(color\(srgb 0 0 0 \/ 0\.4\)/);
        await page.getByRole("radio", { name: "Dark", exact: true }).click();
        await expect(
          previews.first().getByText("70%", { exact: true }),
        ).toBeVisible();
        const after = await previews
          .first()
          .locator(".valuePreviewShape-opacity")
          .evaluate((element) => getComputedStyle(element).backgroundImage);
        expect(after).not.toBe(before);
        const colors = await previews
          .first()
          .locator(".valuePreviewShape-opacity")
          .evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              base: style.getPropertyValue("--checkerboard-base").trim(),
              image: style.backgroundImage,
            };
          });
        expect(colors.base).not.toBe("");
        expect(colors.image).toMatch(
          /linear-gradient\(color\(srgb 1 1 1 \/ 0\.7\)/,
        );
      }
      expect(errors).toEqual([]);
    });
  }

for (const appearance of ["light", "dark"])
  test(`Non-color previews use the theme layer surface and an inner border in ${appearance}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `/iframe.html?id=panels-token-inspector--spacing&viewMode=story&globals=colorScheme:${appearance}`,
    );
    const preview = page.locator('[data-token-preview="other"]');
    await expect(preview).toBeVisible();
    await expect(preview).toHaveCSS("outline-width", "1px");
    await expect(preview).toHaveCSS("outline-offset", "-1px");
    const theme = await page
      .locator("[data-preview-theme-surface]")
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    await expect(preview).toHaveCSS("background-color", theme);
    expect(errors).toEqual([]);
  });

for (const story of ["read-only", "editing", "overridden"]) {
  test(`Token inspector ${story} completes its interactions`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `/iframe.html?id=panels-token-inspector--${story}&viewMode=story`,
    );
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
    expect(errors).toEqual([]);
  });
}
for (const theme of ["light", "dark"])
  for (const width of [1280, 390]) {
    test(`Token inspector remains usable in ${theme} at ${width}px`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=panels-token-inspector--deprecated&viewMode=story&globals=colorScheme:${theme}`,
      );
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "action-background" }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("combobox", { name: "Mode value" }),
      ).toHaveCount(0);
      await expect(
        dialog.getByRole("textbox", { name: "Deprecation comment" }),
      ).toBeVisible();
      await expect(dialog.getByText("Values are not the same")).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBeLessThanOrEqual(width);
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
for (const story of [
  "reference",
  "spacing",
  "shadow",
  "multiple-replacements",
  "unavailable",
]) {
  test(`Token inspector renders ${story}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `/iframe.html?id=panels-token-inspector--${story}&viewMode=story`,
    );
    await expect(page.getByRole("dialog")).toBeVisible();
    if (story === "shadow") {
      await page.getByRole("button", { name: "Edit shadow layers" }).click();
      await expect(
        page.getByRole("textbox", { name: "Blur (px)" }),
      ).toBeVisible();
    }
    if (story === "reference")
      await expect(
        page.getByText("replacement-background", { exact: true }),
      ).toBeVisible();
    if (story === "unavailable") {
      await expect(
        page.getByText("Component references are unavailable."),
      ).toBeVisible();
      await expect(
        page.locator('[data-component="TokenInspector"] > :last-child'),
      ).toHaveText("Source membership could not be verified.");
    }
    expect(errors).toEqual([]);
  });
}
