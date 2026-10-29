// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import type { EditSessionSnapshot } from "../../src/features/edit-session/state";
import { enableEditMode } from "./editMode";
import {
  assertClassificationReviewExport,
  type ClassificationReviewExport,
} from "../../src/features/taxonomy/reviewedExport";
import { geometry } from "./fieldLayout";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function working(page: Page): Promise<EditSessionSnapshot> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).working,
    AUTHORING_STORAGE_KEY,
  );
}

test("Scale Picker alone overrides its columns while the group keeps its existing layout", async ({
  page,
}) => {
  const fields = page.locator('[data-component="TypeScaleFields"]');
  const picker = fields.getByRole("button", { name: / Scale$/ }).locator("..");
  const group = picker.locator("..");
  const original = await working(page);
  for (const width of [1600, 480]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () => {
        const bounds = await geometry(picker);
        return bounds.labelWidth / bounds.valueWidth;
      })
      .toBeCloseTo(0.5, 1);
    const bounds = await geometry(picker);
    expect(bounds.rootOverflow).toBeLessThanOrEqual(1);
    const groupColumns = await group.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").map(parseFloat),
    );
    expect(groupColumns).toHaveLength(2);
    expect(groupColumns[0] / groupColumns[1]).toBeCloseTo(2, 1);
    const ratioField = group.locator("> div").last();
    expect(
      await ratioField.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      ),
    ).toBe(1);
  }
  await page.setViewportSize({ width: 1600, height: 900 });
  await fields.getByRole("button", { name: / Scale$/ }).click();
  await expect(
    page.getByRole("option", { name: "Major third", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect(fields.getByRole("button", { name: / Scale$/ })).toBeDisabled();
  const disabledBounds = await geometry(picker);
  expect(disabledBounds.labelWidth / disabledBounds.valueWidth).toBeCloseTo(
    0.5,
    1,
  );
  expect(await working(page)).toEqual(original);
});

for (const width of [1280, 480]) {
  test(`nested panel accordions share root styling and independent keyboard expansion at ${width}px`, async ({
    page,
  }, info) => {
    if (width < 800) {
      await page
        .getByRole("banner")
        .getByRole("button", { name: /^Change log/ })
        .click();
      await page
        .getByRole("navigation", { name: "Navigation" })
        .getByRole("button", { name: "Collapse", exact: true })
        .click();
    }
    await page.setViewportSize({ width, height: 900 });
    const panel = page.locator('[data-component="FoundationsTypographyPanel"]');
    const original = await working(page);
    const typeScale = panel.locator(
      '[data-component="TypeScaleFields"] [data-component="NestedPanelAccordion"]',
    );
    await panel
      .getByRole("button", { name: "Line heights", exact: true })
      .click();
    const body = panel.getByRole("region", {
      name: "body line height",
      exact: true,
    });
    const lineHeight = body.locator('[data-component="NestedPanelAccordion"]');
    const rootStyle = (node: HTMLElement) => {
      const style = getComputedStyle(node);
      return {
        padding: [
          style.paddingTop,
          style.paddingRight,
          style.paddingBottom,
          style.paddingLeft,
        ],
        background: style.backgroundColor,
        radius: style.borderRadius,
      };
    };
    const expected = await typeScale.evaluate(rootStyle);
    expect(expected.padding).toEqual(["8px", "8px", "8px", "8px"]);
    expect(expected.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(expected.radius).not.toBe("0px");
    expect(await lineHeight.evaluate(rootStyle)).toEqual(expected);
    const typeToggle = typeScale.getByRole("button", {
      name: "Adaptive settings",
      exact: true,
    });
    const lineToggle = lineHeight.getByRole("button", {
      name: "Adaptive settings",
      exact: true,
    });
    await expect(typeToggle).toHaveAttribute("aria-expanded", "false");
    await expect(lineToggle).toHaveAttribute("aria-expanded", "false");
    await typeToggle.press("Enter");
    await lineToggle.press("Space");
    await expect(typeToggle).toHaveAttribute("aria-expanded", "true");
    await expect(lineToggle).toHaveAttribute("aria-expanded", "true");
    await expect(
      typeScale.getByRole("textbox", {
        name: "Ratio at smallest setting",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      lineHeight.getByRole("textbox", {
        name: "From line height",
        exact: true,
      }),
    ).toBeVisible();
    for (const accordion of [typeScale, lineHeight]) {
      expect(
        await accordion.evaluate(
          (node) => node.scrollWidth <= node.clientWidth,
        ),
      ).toBe(true);
      expect(
        await accordion
          .getByRole("group", { name: "Adaptive settings", exact: true })
          .evaluate((node) => ({
            background: getComputedStyle(node).backgroundColor,
            radius: getComputedStyle(node).borderRadius,
          })),
      ).toEqual({ background: "rgba(0, 0, 0, 0)", radius: "0px" });
    }
    await page.screenshot({
      path: info.outputPath(`nested-accordions-${width}.png`),
      animations: "disabled",
    });
    await lineHeight.screenshot({
      path: info.outputPath(`nested-line-height-${width}.png`),
      animations: "disabled",
    });
    await lineToggle.press("Enter");
    await expect(lineToggle).toHaveAttribute("aria-expanded", "false");
    await expect(typeToggle).toHaveAttribute("aria-expanded", "true");
    expect(await working(page)).toEqual(original);
  });
}

test("five sections and shared Type scale edits stay consistent with Logic", async ({
  page,
}) => {
  const panel = page.locator('[data-component="FoundationsTypographyPanel"]');
  await expect(
    panel.getByRole("button", {
      name: /^(System settings|Mode sets|Font sizes|Line heights|Iconography)$/,
    }),
  ).toHaveText([
    "System settings",
    "Mode sets",
    "Font sizes",
    "Line heights",
    "Iconography",
  ]);
  await expect(
    panel.getByRole("button", { name: "Font sizes", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  for (const name of [
    "System settings",
    "Mode sets",
    "Line heights",
    "Iconography",
  ]) {
    await expect(
      panel.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
  }
  await expect(panel.getByRole("button", { name: /^Formula / })).toHaveCount(0);
  await expect(panel.getByText("Component size", { exact: true })).toHaveCount(
    0,
  );
  await expect(panel.getByText("Offset", { exact: true })).toHaveCount(0);
  await panel.getByRole("button", { name: / Scale$/ }).click();
  await page.getByRole("option", { name: "Major third", exact: true }).click();
  const ratio = panel.getByRole("textbox", { name: "Ratio", exact: true });
  await expect(ratio).toHaveValue("1.25");
  await ratio.fill("1.234");
  await ratio.press("Enter");
  await expect(panel.getByRole("button", { name: / Scale$/ })).toContainText(
    "Custom",
  );
  await expect
    .poll(
      async () =>
        (await working(page)).scaleTypes!.find(
          (formula) => formula.kind === "type-scale",
        )!.parameters[0].default,
    )
    .toBe(1.234);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Logic", exact: true })
    .click();
  await page.getByRole("tab", { name: "Formulas", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit formula Type scale", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Ratio", exact: true }),
  ).toHaveValue("1.234");
  await expect(page.getByText("Offset", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Adaptive", exact: true }),
  ).toHaveCount(0);
  const base = page.getByRole("textbox", {
    name: "Base size (px)",
    exact: true,
  });
  await base.fill("20");
  await base.press("Enter");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await expect(
    panel.getByRole("textbox", { name: "Base size (rem)", exact: true }),
  ).toHaveValue("1.25");
  await expect(
    panel.getByRole("textbox", { name: "Ratio", exact: true }),
  ).toHaveValue("1.234");
});

test("line-height cards preserve local ranges and require an explicit replacement", async ({
  page,
}) => {
  const panel = page.locator('[data-component="FoundationsTypographyPanel"]');
  const original = await working(page);
  await panel
    .getByRole("button", { name: "Line heights", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "Add line height", exact: true })
    .click();
  const added = panel.getByRole("region", {
    name: "New line height line height",
    exact: true,
  });
  const name = added.getByRole("textbox", { name: "Name", exact: true });
  await name.fill("Reading");
  await name.press("Tab");
  const card = panel.getByRole("region", {
    name: "Reading line height",
    exact: true,
  });
  await expect(
    card.getByRole("checkbox", { name: "Make adaptive", exact: true }),
  ).not.toBeChecked();
  await expect(
    card.getByRole("button", { name: "Adaptive settings", exact: true }),
  ).toHaveCount(0);
  const defaultHeight = card.getByRole("textbox", {
    name: "Default line height",
    exact: true,
  });
  await defaultHeight.fill("2");
  await defaultHeight.press("Enter");
  await card
    .getByRole("checkbox", { name: "Make adaptive", exact: true })
    .press("Space");
  await card
    .getByRole("button", { name: "Adaptive settings", exact: true })
    .click();
  await expect(
    card.getByRole("textbox", { name: "From line height", exact: true }),
  ).toHaveValue("2");
  const endpoint = card.getByRole("textbox", {
    name: "To line height",
    exact: true,
  });
  await expect(endpoint).toHaveValue("2");
  await endpoint.fill("1.4");
  await endpoint.press("Enter");
  await card
    .getByRole("checkbox", { name: "Make adaptive", exact: true })
    .press("Space");
  await card
    .getByRole("checkbox", { name: "Make adaptive", exact: true })
    .press("Space");
  await card
    .getByRole("button", { name: "Adaptive settings", exact: true })
    .click();
  await expect(
    card.getByRole("textbox", { name: "To line height", exact: true }),
  ).toHaveValue("1.4");
  const addedId = (await working(page)).typography.lineHeights.find(
    (item) =>
      !original.typography.lineHeights.some((before) => before.id === item.id),
  )!.id;
  await expect
    .poll(
      async () =>
        (await working(page)).typography.lineHeights.find(
          (item) => item.id === addedId,
        )!.adaptive.outputAtTo,
    )
    .toBe(1.4);
  const beforeRemove = await working(page);
  expect(beforeRemove.interpolations).toEqual(original.interpolations);
  await panel
    .getByRole("button", { name: "Delete body line height", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Replace and delete", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await working(page)).toEqual(beforeRemove);
  await panel
    .getByRole("button", { name: "Delete body line height", exact: true })
    .click();
  await dialog.getByRole("button", { name: /Replacement line height/ }).click();
  await page.getByRole("option", { name: "Reading", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Replace and delete", exact: true })
    .click();
  await expect(
    panel.getByRole("region", { name: "body line height", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(async () => (await working(page)).typography.previewLineHeightId)
    .toBe(addedId);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  const saved = await working(page);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await panel
    .getByRole("button", { name: "Line heights", exact: true })
    .click();
  await expect(
    card.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Reading");
  expect(await working(page)).toEqual(saved);
  const renamed = card.getByRole("textbox", { name: "Name", exact: true });
  await renamed.fill("Temporary");
  await renamed.press("Tab");
  await expect(
    panel.getByRole("region", { name: "Temporary line height", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect(
    card.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Reading");
  expect(await working(page)).toEqual(saved);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const invalidName = card.getByRole("textbox", { name: "Name", exact: true });
  await invalidName.fill("heading");
  await invalidName.press("Tab");
  await expect(invalidName).toHaveAttribute("aria-invalid", "true");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect(invalidName).toHaveValue("Reading");
  await expect(invalidName).not.toHaveAttribute("aria-invalid", "true");
  expect(await working(page)).toEqual(saved);
});

test("units, icon alignment and publishing visibility preserve authoring previews", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const panel = page.locator('[data-component="FoundationsTypographyPanel"]');
  const original = await working(page);
  await panel
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  for (const [unit, value] of [
    ["px", "14"],
    ["pt", "10.5"],
    ["em", "0.875"],
    ["rem", "0.875"],
  ]) {
    await panel.getByRole("button", { name: / Output format$/ }).click();
    await page.getByRole("option", { name: unit, exact: true }).click();
    await expect(
      panel.getByRole("textbox", { name: `Base size (${unit})`, exact: true }),
    ).toHaveValue(value);
    await expect
      .poll(async () => (await working(page)).typography.outputUnit)
      .toBe(unit);
    const current = await working(page);
    expect(current.scaleTypes).toEqual(original.scaleTypes);
    expect(current.typography).toEqual({
      ...original.typography,
      outputUnit: unit,
    });
  }
  await panel.getByRole("button", { name: "Iconography", exact: true }).click();
  await panel.getByRole("button", { name: / Alignment$/ }).click();
  await page.getByRole("option", { name: "Text sizes", exact: true }).click();
  const iconBase = panel
    .getByRole("textbox", { name: "Base size (rem)", exact: true })
    .last();
  await iconBase.fill("2");
  await iconBase.press("Enter");
  await expect
    .poll(async () => (await working(page)).typography.iconography)
    .toEqual({ alignment: "text", baseSize: 32 });
  await panel.getByRole("button", { name: / Alignment$/ }).click();
  await page.getByRole("option", { name: "Line heights", exact: true }).click();
  await panel.getByRole("button", { name: / Line height$/ }).click();
  await page.getByRole("option", { name: "Heading", exact: true }).click();
  await expect
    .poll(async () => (await working(page)).typography.iconography)
    .toEqual({
      alignment: "line-height",
      baseSize: 32,
      lineHeightId: "heading",
    });
  await panel.getByRole("button", { name: / Alignment$/ }).click();
  await page.getByRole("option", { name: "Text sizes", exact: true }).click();
  await expect(iconBase).toHaveValue("2");
  await panel
    .getByRole("checkbox", { name: "Hide from publishing", exact: true })
    .press("Space");
  await page.getByRole("radio", { name: "Code", exact: true }).click();
  await expect(
    page.getByText(
      "Typography is hidden from publishing. Its tokens and previews remain available in the authoring space.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy CSS", exact: true }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  await expect(
    page.locator(".typographyRampPreview .typographyElementSample").last(),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Analyze", exact: true }).click();
  await expect(
    page.locator('[data-component="TypographyAnalyze"]'),
  ).toBeVisible();
  // Exclude the existing Spacing/Size flat-name collision from this download fixture.
  await page.getByRole("tab", { name: "Size", exact: true }).click();
  await page
    .getByRole("region", { name: "Global size scale", exact: true })
    .getByRole("checkbox", { name: "Hide from publishing", exact: true })
    .press("Space");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await page.getByRole("radio", { name: "Typography", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search tokens", exact: true })
    .fill("text-size-100");
  await page.locator(".tokenCollectionScroll").evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect(
    page.getByRole("button", { name: "Open text-size-100", exact: true }),
  ).toBeVisible();
  const downloadPending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Export taxonomy compatibility packet",
      exact: true,
    })
    .click();
  const download = await downloadPending;
  const path = await download.path();
  if (!path) throw new Error("The taxonomy packet download is unavailable.");
  const packet: ClassificationReviewExport = JSON.parse(
    await readFile(path, "utf8"),
  );
  await assertClassificationReviewExport(packet);
  expect(
    packet.source.records.filter(
      (record) => record.token.type === "typography",
    ),
  ).toEqual([]);
  expect(packet.tokens.length).toBeGreaterThan(0);
});
