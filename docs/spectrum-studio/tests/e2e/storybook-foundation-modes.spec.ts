// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { FOUNDATIONS } from "../../src/features/modes/parameters";

for (const id of [
  "components-preview-toolbar--default",
  "panels-foundation-mode-settings--editing",
  "panels-foundation-mode-settings--removal",
  "panels-foundation-mode-settings--add-menu",
]) {
  test(`interaction coverage for ${id}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await expect(page.locator('[data-play-complete="true"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`desktop and narrow appearance for ${id}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const width of [1280, 390])
      for (const scheme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(
          `/iframe.html?id=${id}&viewMode=story&globals=colorScheme:${scheme}`,
        );
        await expect(page.locator('[data-play-complete="true"]')).toBeVisible();
        const canvas = page.locator("#storybook-root");
        expect(
          await canvas.evaluate((node) => node.scrollWidth <= node.clientWidth),
        ).toBe(true);
        await page.screenshot({
          path: info.outputPath(`${scheme}-${width}.png`),
          animations: "disabled",
        });
      }

    expect(errors).toEqual([]);
  });
}

test("short and long mode lists fit their content on desktop and narrow layouts", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1280, 390])
    for (const story of ["editing", "long-list"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=panels-foundation-mode-settings--${story}&viewMode=story`,
      );
      const list = page.getByRole("grid", {
        name: "Color scheme modes for color",
      });
      await expect(list.getByRole("row")).toHaveCount(
        story === "long-list" ? 10 : 2,
      );
      const sizes = await list.evaluate((node) => {
        const wrapper = node.parentElement!;
        return {
          maxHeight: getComputedStyle(wrapper).maxHeight,
          height: node.clientHeight,
          content: node.scrollHeight,
          wrapper: wrapper.clientHeight,
        };
      });
      expect(sizes.maxHeight).toBe("fit-content");
      expect(Math.abs(sizes.height - sizes.content)).toBeLessThanOrEqual(2);
      expect(Math.abs(sizes.wrapper - sizes.content)).toBeLessThanOrEqual(2);
      if (story === "long-list") expect(sizes.height).toBeGreaterThan(320);
      await expect(list.getByRole("row").last()).toBeInViewport();
      await page.screenshot({
        path: info.outputPath(`${story}-${width}.png`),
        animations: "disabled",
      });
    }
  expect(errors).toEqual([]);
});

test("empty mode sets use canonical category labels and state-specific guidance", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const { id, label } of FOUNDATIONS)
    for (const editing of [true, false]) {
      const story = editing ? "empty" : "empty-read-only";
      await page.goto(
        `/iframe.html?id=panels-foundation-mode-settings--${story}&viewMode=story&args=foundation:${id}`,
      );
      await expect(page.locator('[data-play-complete="true"]')).toBeVisible();
      const message = page.locator(
        '[data-component="FoundationModeEmptyState"]',
      );
      await expect(message).toHaveText(
        `${label} has no mode sets. ${editing ? "Add one to create options." : "Select Edit to add one."}`,
      );
      await expect(message.getByRole("heading")).toHaveCount(0);
      await expect(message.getByRole("button")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: `Add mode set to ${id}` }),
      ).toHaveCount(editing ? 1 : 0);
      await expect(
        page.getByText(
          "This foundation has no mode-specific variables yet. Shared mode selection is available.",
        ),
      ).toHaveCount(0);
    }
  expect(errors).toEqual([]);
});

test("empty illustrations are vertical, transparent and unclipped across themes and widths", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const story of ["empty", "empty-read-only"])
    for (const width of [1280, 390])
      for (const scheme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(
          `/iframe.html?id=panels-foundation-mode-settings--${story}&viewMode=story&globals=colorScheme:${scheme}`,
        );
        await expect(page.locator('[data-play-complete="true"]')).toBeVisible();
        const message = page.locator(
          '[data-component="FoundationModeEmptyState"]',
        );
        const image = message.locator("img");
        await expect(image).toHaveAttribute("alt", "");
        await expect
          .poll(() =>
            image.evaluate(
              (node) =>
                node instanceof HTMLImageElement &&
                node.complete &&
                node.naturalWidth === 96,
            ),
          )
          .toBe(true);
        const artwork = await image.evaluate((node) => {
          if (!(node instanceof HTMLImageElement) || !node.parentElement)
            throw new Error("Missing illustration image.");
          const wrapper = getComputedStyle(node.parentElement);
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 96;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Missing image inspection context.");
          context.drawImage(node, 0, 0, 96, 96);
          const bounds = node.getBoundingClientRect();
          return {
            width: bounds.width,
            height: bounds.height,
            naturalHeight: node.naturalHeight,
            gridArea: wrapper.gridArea,
            background: wrapper.backgroundColor,
            cornerAlpha: context.getImageData(0, 0, 1, 1).data[3],
          };
        });
        expect(artwork.width).toBe(96);
        expect(artwork.height).toBe(96);
        expect(artwork.naturalHeight).toBe(96);
        expect(artwork.gridArea).toContain("illustration");
        expect(artwork.background).toBe("rgba(0, 0, 0, 0)");
        expect(artwork.cornerAlpha).toBe(0);
        const imageBox = (await image.boundingBox())!;
        const contentBox = (await message
          .getByText(/Color has no mode sets\./)
          .boundingBox())!;
        const messageBox = (await message.boundingBox())!;
        expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(contentBox.y);
        expect(
          Math.abs(
            imageBox.x +
              imageBox.width / 2 -
              messageBox.x -
              messageBox.width / 2,
          ),
        ).toBeLessThanOrEqual(1);
        expect(
          await page
            .locator("#storybook-root")
            .evaluate((node) => node.scrollWidth <= node.clientWidth),
        ).toBe(true);
        await expect(image).toBeInViewport();
        await expect(
          message.getByText(/Color has no mode sets\./),
        ).toBeInViewport();
        await page.screenshot({
          path: info.outputPath(`${story}-${scheme}-${width}.png`),
          animations: "disabled",
        });
      }
  expect(errors).toEqual([]);
});

test("empty attachments retain the keyboard Add workflow and return after removal", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=panels-foundation-mode-settings--empty&viewMode=story&args=foundation:spacing",
  );
  await expect(page.locator('[data-play-complete="true"]')).toBeVisible();
  const message = page.locator('[data-component="FoundationModeEmptyState"]');
  const trigger = page.getByRole("button", { name: "Add mode set to spacing" });
  await trigger.focus();
  await trigger.press("ArrowDown");
  const available = page.getByRole("menuitem", {
    name: "Color scheme",
    exact: true,
  });
  await expect(available).toBeFocused();
  await available.press("Enter");
  await expect(
    page
      .getByRole("dialog")
      .getByText(
        "This foundation has no mode-specific variables yet. You can still use this mode set to switch modes.",
      ),
  ).toBeVisible();
  await expect(message).toBeVisible();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(message).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Color scheme mode set" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This foundation has no mode-specific variables yet. Shared mode selection is available.",
    ),
  ).toBeVisible();
  await expect(trigger).toBeFocused();
  await page
    .getByRole("button", { name: "Remove Color scheme from spacing" })
    .click();
  await expect(message).toHaveText(
    "Spacing has no mode sets. Add one to create options.",
  );
  await expect(
    page.getByText(
      "This foundation has no mode-specific variables yet. Shared mode selection is available.",
    ),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("one mode and equal values still render attached mode sets", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const story of ["single-mode", "equal-values"]) {
    await page.goto(
      `/iframe.html?id=panels-foundation-mode-settings--${story}&viewMode=story`,
    );
    const card = page.getByRole("region", { name: "Color scheme mode set" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("row")).toHaveCount(
      story === "single-mode" ? 1 : 2,
    );
    await expect(
      page.locator('[data-component="FoundationModeEmptyState"]'),
    ).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("the empty message adds no height to a collapsed Mode sets accordion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let populatedHeight = 0;
  for (const story of ["unsupported", "empty"]) {
    await page.goto(
      `/iframe.html?id=panels-foundation-mode-settings--${story}&viewMode=story&args=foundation:spacing`,
    );
    const toggle = page.getByRole("button", { name: "Mode sets", exact: true });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.locator('[data-component="FoundationModeEmptyState"]'),
    ).not.toBeVisible();
    await expect
      .poll(() =>
        page
          .locator("#storybook-root")
          .evaluate((node) => node.getAnimations({ subtree: true }).length),
      )
      .toBe(0);
    const height = (await page.locator("#storybook-root").boundingBox())!
      .height;
    if (story === "unsupported") populatedHeight = height;
    else expect(Math.abs(height - populatedHeight)).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});
