// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import { generateTypography } from "../../src/features/typography/typographyGeneration";
import { formatTypographyLength } from "../../src/features/typography/units";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function openTypography(
  page: Page,
  width: number,
  alignment: "text" | "line-height" = "text",
) {
  const snapshot = createDefaultSnapshot();
  snapshot.typography.outputUnit = "px";
  snapshot.typography.iconography =
    alignment === "text"
      ? { alignment, baseSize: 18 }
      : { alignment, baseSize: 18, lineHeightId: "heading" };
  await page.addInitScript(
    ({ key, snapshot }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            working: snapshot,
            saved: snapshot,
            isEditing: false,
            attachments: {},
            savedAttachments: {},
          }),
        );
    },
    { key: AUTHORING_STORAGE_KEY, snapshot },
  );
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("tab", { name: "Typography", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("navigation", { name: "Navigation" })
    .getByRole("button", { name: "Collapse", exact: true })
    .press("Enter");
  await expect(page.locator(".typographyElementIcon svg")).toHaveCount(
    generateTypography(snapshot.typography).length,
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished),
    );
  });
  return snapshot;
}

async function geometry(page: Page) {
  return page.locator(".typographyRampPreview").evaluate((root) =>
    [
      ...root.querySelectorAll<HTMLElement>(
        ".typographyElement:not(.typographyElementHeader)",
      ),
    ].map((row) => {
      const sample = row.querySelector<HTMLElement>(
        ".typographyElementSample",
      )!;
      const icon = row.querySelector<SVGElement>(".typographyElementIcon svg")!;
      const text = getComputedStyle(sample);
      return {
        fontSize: text.fontSize,
        lineHeight: text.lineHeight,
        sampleWidth: sample.getBoundingClientRect().width,
        sampleHeight: sample.getBoundingClientRect().height,
        iconWidth: icon.getBoundingClientRect().width,
        iconHeight: icon.getBoundingClientRect().height,
        rowWidth: row.getBoundingClientRect().width,
        rowHeight: row.getBoundingClientRect().height,
        grid: getComputedStyle(row).gridTemplateColumns,
      };
    }),
  );
}

for (const width of [1600, 480]) {
  test(`Show labels never resize samples and icon selection is temporary at ${width}px`, async ({
    page,
  }, info) => {
    const snapshot = await openTypography(page, width);
    const expected = generateTypography(snapshot.typography);
    const originalRecord = await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    );
    const baseline = await geometry(page);
    for (const [index, row] of baseline.entries()) {
      expect(Number.parseFloat(row.fontSize)).toBe(expected[index].fontSize);
      expect(row.iconWidth).toBeCloseTo(expected[index].iconSize, 2);
      expect(row.iconHeight).toBeCloseTo(expected[index].iconSize, 2);
    }
    const labels = ["Font size", "Line height", "Icon size"];
    const metrics = ["font-size", "line-height", "icon-size"];
    let mask = 7;
    for (const next of [0, 1, 2, 3, 4, 5, 6, 7]) {
      await page.getByRole("button", { name: /Show$/ }).press("Enter");
      for (let index = 0; index < labels.length; index++) {
        if (Boolean(mask & (1 << index)) !== Boolean(next & (1 << index))) {
          await page
            .getByRole("option", { name: labels[index], exact: true })
            .press("Space");
        }
      }
      await page.keyboard.press("Escape");
      mask = next;
      for (let index = 0; index < metrics.length; index++) {
        await expect(
          page.locator(
            `.typographyElementHeader [data-metric="${metrics[index]}"]`,
          ),
        ).toHaveAttribute("aria-hidden", String(!(next & (1 << index))));
      }
      expect(await geometry(page)).toEqual(baseline);
    }
    await expect(page.getByRole("button", { name: /Show$/ })).toBeFocused();
    const picker = page.getByRole("combobox", {
      name: "Sample icon",
      exact: true,
    });
    const originalGlyph = await page
      .locator(".typographyElementIcon svg")
      .first()
      .innerHTML();
    await picker.scrollIntoViewIfNeeded();
    await picker.click();
    await picker.press("Home");
    await expect(picker).toBeFocused();
    await picker.fill("Bell");
    await expect(
      page.getByRole("option", { name: "Bell", exact: true }),
    ).toBeVisible();
    await picker.press("ArrowDown");
    await picker.press("Enter");
    await expect(picker).toHaveValue("Bell");
    await expect
      .poll(async () =>
        page.locator(".typographyElementIcon svg").first().innerHTML(),
      )
      .not.toBe(originalGlyph);
    await expect(page.locator(".typographyElementIcon svg")).toHaveCount(
      expected.length,
    );
    expect(await geometry(page)).toEqual(baseline);
    const sampleText = page.getByRole("textbox", {
      name: "Sample text",
      exact: true,
    });
    await sampleText.scrollIntoViewIfNeeded();
    await sampleText.fill("");
    await expect(
      page
        .locator(
          ".typographyElement:not(.typographyElementHeader) .typographyElementSample",
        )
        .first(),
    ).toBeEmpty();
    expect(
      (await geometry(page)).map(
        ({ fontSize, lineHeight, iconWidth, iconHeight }) => ({
          fontSize,
          lineHeight,
          iconWidth,
          iconHeight,
        }),
      ),
    ).toEqual(
      baseline.map(({ fontSize, lineHeight, iconWidth, iconHeight }) => ({
        fontSize,
        lineHeight,
        iconWidth,
        iconHeight,
      })),
    );
    await sampleText.fill(
      "A longer sample text with several words repeated to verify wrapping. ".repeat(
        3,
      ),
    );
    const longText = await geometry(page);
    await page.getByRole("button", { name: /Show$/ }).press("Enter");
    await page
      .getByRole("option", { name: "Font size", exact: true })
      .press("Space");
    await page.keyboard.press("Escape");
    expect(await geometry(page)).toEqual(longText);
    await sampleText.fill("The quick brown fox jumps over the lazy dog");
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        AUTHORING_STORAGE_KEY,
      ),
    ).toBe(originalRecord);
    await page.screenshot({
      path: info.outputPath(`typography-icons-${width}.png`),
      animations: "disabled",
    });
    await page.reload();
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .dispatchEvent("click");
    await page
      .getByRole("tab", { name: "Typography", exact: true })
      .dispatchEvent("click");
    await page
      .getByRole("radio", { name: "Elements", exact: true })
      .dispatchEvent("click");
    await expect(
      page.getByRole("combobox", { name: "Sample icon" }),
    ).toHaveValue("Home");
    await expect(
      page.locator(
        ".typographyElementHeader .typographyElementValue[aria-hidden='false']",
      ),
    ).toHaveCount(3);
  });
}

test("Failed icon loading is visible and another selection restores samples", async ({
  page,
}) => {
  await openTypography(page, 1280);
  await page.route("**/*BellRotated*", (route) => route.abort("failed"));
  const picker = page.getByRole("combobox", {
    name: "Sample icon",
    exact: true,
  });
  await picker.fill("Bell Rotated");
  await picker.press("ArrowDown");
  await picker.press("Enter");
  await expect(
    page.getByRole("alert").filter({ hasText: "Could not load BellRotated" }),
  ).toContainText("Could not load BellRotated");
  await expect(page.locator(".typographyElementIcon svg")).toHaveCount(0);
  await picker.fill("Home");
  await picker.press("ArrowDown");
  await picker.press("Enter");
  await expect(page.locator(".typographyElementIcon svg")).toHaveCount(17);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Menu choices show their actual icons, including 3D, without loading the whole catalog", async ({
  page,
}, info) => {
  const iconRequests = new Set<string>();
  page.on("request", (request) => {
    if (/icons[_/]/.test(request.url())) iconRequests.add(request.url());
  });
  await openTypography(page, 1280);
  const initialCount = iconRequests.size;
  await page
    .getByRole("button", { name: "Show suggestions Sample icon", exact: true })
    .click();
  const list = page.getByRole("listbox", {
    name: "Suggestions Sample icon",
    exact: true,
  });
  await expect(list.locator('[data-icon-name="3D"] svg')).toHaveCount(1);
  expect(iconRequests.size - initialCount).toBeLessThan(100);
  await page.screenshot({
    path: info.outputPath("typography-icon-menu.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  const picker = page.getByRole("combobox", {
    name: "Sample icon",
    exact: true,
  });
  await picker.fill("3D");
  await expect(
    page
      .getByRole("option", { name: "3D", exact: true })
      .locator('[data-icon-name="3D"] svg'),
  ).toHaveCount(1);
  await picker.press("ArrowDown");
  await picker.press("Enter");
  await expect(picker).toHaveValue("3D");
  await expect(page.locator(".typographyElementIcon svg")).toHaveCount(17);
});

test("Icon size Analysis chart and values follow the independent icon line-height card", async ({
  page,
}, info) => {
  const snapshot = await openTypography(page, 1280, "line-height");
  const expected = generateTypography(snapshot.typography);
  expect(
    expected.some((token) => token.iconSize !== token.lineHeights.body.length),
  ).toBe(true);
  await page
    .getByRole("radio", { name: "Analyze", exact: true })
    .dispatchEvent("click");
  const analysis = page.locator('[data-component="TypographyAnalyze"]');
  await expect(
    analysis.getByRole("img", {
      name: "Icon size by size setting",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    analysis.getByRole("heading", { name: "Icon size (px)", exact: true }),
  ).toBeVisible();
  await analysis
    .getByRole("button", { name: "Show values", exact: true })
    .click();
  const table = analysis.getByRole("table", { name: "Type scale values" });
  await expect(
    table.getByRole("columnheader", { name: "Icon size", exact: true }),
  ).toHaveCount(1);
  const actual = await table
    .locator('tbody tr[data-default-setting="true"]')
    .evaluateAll((rows) =>
      rows.map((row) => row.lastElementChild!.textContent),
    );
  expect(actual).toEqual(
    expected.map((token) => formatTypographyLength(token.iconSize, "px")),
  );
  await analysis
    .getByRole("img", { name: "Icon size by size setting", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath("typography-icon-analysis-desktop.png"),
    animations: "disabled",
  });
  await page.setViewportSize({ width: 480, height: 900 });
  await analysis
    .getByRole("columnheader", { name: "Icon size", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    analysis.getByRole("columnheader", { name: "Icon size", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: info.outputPath("typography-icon-analysis-narrow.png"),
    animations: "disabled",
  });
});

test("Adaptive text size updates icon samples without changing authored Analysis comparisons", async ({
  page,
}) => {
  const snapshot = await openTypography(page, 1280);
  const record = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  await page
    .getByRole("radio", { name: "Preview", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("button", { name: "Adaptive controls", exact: true })
    .first()
    .click();
  const slider = page.getByRole("slider", { name: "Text size", exact: true });
  await slider.press("Home");
  for (let step = -4; step < 3; step++) await slider.press("ArrowRight");
  await page.keyboard.press("Escape");
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");
  await expect(page.locator(".typographyRampPreview")).toHaveAttribute(
    "data-text-zoom",
    "3",
  );
  const expected = generateTypography(snapshot.typography, 3);
  await expect(page.locator(".typographyElementIcon svg")).toHaveCount(
    expected.length,
  );
  const samples = await geometry(page);
  expect(samples.map((sample) => sample.iconWidth)).toEqual(
    expected.map((token) => token.iconSize),
  );
  await page
    .getByRole("radio", { name: "Analyze", exact: true })
    .dispatchEvent("click");
  const analysis = page.locator('[data-component="TypographyAnalyze"]');
  await analysis
    .getByRole("button", { name: "Show values", exact: true })
    .click();
  const cells = await analysis
    .locator('tbody tr[data-default-setting="true"]')
    .evaluateAll((rows) =>
      rows.map((row) => row.lastElementChild!.textContent),
    );
  expect(cells).toEqual(
    generateTypography(snapshot.typography).map((token) =>
      formatTypographyLength(token.iconSize, "px"),
    ),
  );
  await analysis.getByRole("button", { name: /Compare$/ }).click();
  await page.getByRole("option", { name: "Zoom steps", exact: true }).click();
  await analysis.getByRole("button", { name: /Lines$/ }).click();
  await page.getByRole("option", { name: /Zoom 3/ }).click();
  await page.keyboard.press("Escape");
  const previewCells = await analysis
    .locator('tbody tr[data-setting-id="zoom:3"]')
    .evaluateAll((rows) =>
      rows.map((row) => row.lastElementChild!.textContent),
    );
  expect(previewCells).toEqual(
    expected.map((token) => formatTypographyLength(token.iconSize, "px")),
  );
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(record);
});
