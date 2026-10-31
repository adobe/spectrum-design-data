// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    )
      collected.push(message.text());
  });
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

for (const story of [
  "panels-generator-rule--default",
  "panels-generator-rule--keyboard-offsets",
  "panels-generator-rule--nearest-targets",
  "panels-generator-rule--custom-options",
  "components-rule-token-value-types--default",
  "components-rounding-rule-editor--default",
  "panels-structure-generation-rule--default",
  "panels-structure-generation-rule--custom-properties",
  "panels-structure-generation-rule--keyboard-selection",
  "panels-structure-generation-rule--stale-target-repair",
  "views-structure-size-permutations--five-sizes",
]) {
  test(`${story} completes its focused interaction`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${story}&viewMode=story`);
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
  });
}

test("Rule boundaries, empty sources and read-only inspection remain explicit", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=panels-generator-rule--invalid-offsets&viewMode=story",
  );
  await expect(
    page.getByRole("textbox", { name: /^Small token offset(?: |$)/ }),
  ).toHaveAttribute("aria-invalid", "true");
  await page.goto(
    "/iframe.html?id=panels-generator-rule--read-only&viewMode=story",
  );
  await expect(
    page.getByRole("textbox", { name: /^Small token offset(?: |$)/ }),
  ).toHaveAttribute("readonly");
  await expect(
    page.getByRole("button", { name: /Move along the scale by$/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Default value" }),
  ).toBeEnabled();
  await page.goto(
    "/iframe.html?id=panels-generator-rule--no-sources&viewMode=story",
  );
  await expect(
    page.getByRole("grid", { name: "Generator preview" }),
  ).toHaveCount(0);
});

for (const { story, message } of [
  {
    story: "no-rules",
    message: "Create a Generator rule in Logic first.",
  },
  { story: "no-eligible-properties", message: "Assign foundation tokens" },
  { story: "overlapping-applications", message: "overlap" },
]) {
  test(`Application ${story} blocks Apply without dropping intent`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=panels-structure-generation-rule--${story}&viewMode=story`,
    );
    await page.getByRole("button", { name: "Add generation rule" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(message);
    await expect(
      dialog.getByRole("button", { name: "Apply", exact: true }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add generation rule" }),
    ).toBeFocused();
  });
}

test("Hidden and nearest application previews show their actual output; failed Apply stays open", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=panels-structure-generation-rule--hidden-sources&viewMode=story",
  );
  await page.getByRole("button", { name: "Add generation rule" }).click();
  await expect(
    page.getByRole("grid", { name: "Generated token preview" }),
  ).toContainText("Literal");
  await expect(
    page.getByRole("grid", { name: "Generated token preview" }),
  ).not.toContainText("Alias");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await page.goto(
    "/iframe.html?id=panels-structure-generation-rule--nearest-targets&viewMode=story",
  );
  await page.getByRole("button", { name: "Add generation rule" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Nearest available targets",
  );
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Apply" }),
  ).toBeEnabled();
  await page.goto(
    "/iframe.html?id=panels-structure-generation-rule--apply-error&viewMode=story",
  );
  await page.getByRole("button", { name: "Add generation rule" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "The source changed",
  );
});

for (const appearance of ["light", "dark"])
  for (const width of [1440, 480]) {
    test(`Three isolated surfaces remain usable in ${appearance} at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      const globals = `&globals=colorScheme:${appearance}`;
      await page.goto(
        `/iframe.html?id=panels-generator-rule--numeric-indices&viewMode=story${globals}`,
      );
      const representative = page.getByRole("combobox", {
        name: "Default value",
      });
      await representative.fill("500");
      await page
        .getByRole("option")
        .filter({ has: page.getByTitle("global-spacing-500", { exact: true }) })
        .click();
      await expect(
        page.getByRole("grid", { name: "Generator preview" }),
      ).toContainText("global-spacing-300");
      await expect(page.getByRole("listbox")).toHaveCount(0);
      const editor = page.locator('[data-component="TshirtSizingRuleEditor"]');
      const editorBounds = (await editor.boundingBox())!;
      expect(editorBounds.x).toBeGreaterThanOrEqual(0);
      expect(editorBounds.x + editorBounds.width).toBeLessThanOrEqual(width);
      expect(
        await editor.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await editor.screenshot({
        path: info.outputPath(`rule-${appearance}-${width}.png`),
        animations: "disabled",
      });
      await page.goto(
        `/iframe.html?id=components-rounding-rule-editor--default&viewMode=story${globals}`,
      );
      await expect(page.locator("#storybook-root")).toHaveAttribute(
        "data-play-complete",
        "true",
      );
      const rounding = page.locator('[data-component="RoundingRuleEditor"]');
      const surfaceColors = await page
        .locator("[data-story-surface]")
        .evaluate((element) => {
          const computed = getComputedStyle(element);
          return {
            color: computed.color,
            background: computed.backgroundColor,
          };
        });
      expect(surfaceColors.background).not.toBe("rgba(0, 0, 0, 0)");
      expect(surfaceColors.color).not.toBe(surfaceColors.background);
      expect(
        await rounding
          .getByText("When value is less than 20, use rounding factor 2.")
          .evaluate((element) => getComputedStyle(element).color),
      ).toBe(surfaceColors.color);
      expect(
        await rounding.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await rounding.screenshot({
        path: info.outputPath(`rounding-${appearance}-${width}.png`),
        animations: "disabled",
      });
      await page.goto(
        `/iframe.html?id=panels-structure-generation-rule--hidden-sources&viewMode=story${globals}`,
      );
      await page.getByRole("button", { name: "Add generation rule" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("button", { name: "Apply" })).toBeEnabled();
      await expect(
        dialog.getByRole("grid", { name: "Generated token preview" }),
      ).toBeVisible();
      await dialog.screenshot({
        path: info.outputPath(`application-${appearance}-${width}.png`),
        animations: "disabled",
      });
      const dialogBounds = (await dialog.boundingBox())!;
      expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
      expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(width);
      const tokenPreview = dialog.getByRole("grid", {
        name: "Generated token preview",
      });
      await tokenPreview.scrollIntoViewIfNeeded();
      await expect(tokenPreview).toContainText("Literal");
      await dialog.screenshot({
        path: info.outputPath(`application-preview-${appearance}-${width}.png`),
        animations: "disabled",
      });
      await page.goto(
        `/iframe.html?id=views-structure-size-permutations--hidden-literals&viewMode=story${globals}`,
      );
      const permutations = page.locator(
        '[data-component="StructurePermutationsView"]',
      );
      await expect(permutations.getByRole("img")).toHaveCount(5);
      const dimensions: number[] = [];
      for (const size of ["xs", "s", "m", "l", "xl"]) {
        const sample = permutations
          .locator(`[data-size="${size}"]`)
          .getByRole("img");
        await expect(sample).toBeVisible();
        dimensions.push(
          Number.parseFloat(
            await sample.evaluate(
              (element) => getComputedStyle(element).paddingTop,
            ),
          ),
        );
      }
      expect(dimensions).toEqual(
        [...dimensions].sort((left, right) => left - right),
      );
      expect(new Set(dimensions).size).toBeGreaterThan(1);
      expect(
        await permutations.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await permutations.screenshot({
        path: info.outputPath(`permutations-${appearance}-${width}.png`),
        animations: "disabled",
      });
    });
  }

test("Permutation empty/error states do not masquerade as valid generated sizes", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=views-structure-size-permutations--no-selection&viewMode=story",
  );
  await expect(
    page.getByText("Select a structure to see its sizes."),
  ).toBeVisible();
  await page.goto(
    "/iframe.html?id=views-structure-size-permutations--generation-error&viewMode=story",
  );
  await expect(page.getByRole("alert")).toContainText(
    "Generation needs repair",
  );
  await expect(page.locator('[data-component="StructurePreview"]')).toHaveCount(
    0,
  );
  await page.goto(
    "/iframe.html?id=views-structure-size-permutations--no-application&viewMode=story",
  );
  await expect(
    page.getByText(/Untargeted settings keep their Medium values/),
  ).toBeVisible();
  await page.goto(
    "/iframe.html?id=views-structure-size-permutations--nearest-targets&viewMode=story",
  );
  await expect(page.locator('[data-size="xs"]')).toContainText(
    "Nearest available targets",
  );
  await page.goto(
    "/iframe.html?id=views-structure-size-permutations--constraints&viewMode=story",
  );
  await expect(page.locator('[data-size="m"]').getByRole("img")).toHaveCSS(
    "min-width",
    "24px",
  );
});
