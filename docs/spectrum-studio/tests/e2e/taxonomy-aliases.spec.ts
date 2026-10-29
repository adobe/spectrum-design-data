// Copyright 2026 Adobe. All rights reserved.
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import type { EditSessionSnapshot } from "../../src/features/edit-session/state";
import {
  assertClassificationReviewExport,
  type ClassificationReviewExport,
} from "../../src/features/taxonomy/reviewedExport";

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

interface TaxonomyPacket {
  tokens: {
    id: string;
    conceptId: string;
    name: string;
    context: string;
    classification: Record<string, string>;
    value?: string | number;
    $ref?: string;
  }[];
  aliases: {
    uuid: string;
    aliasId: string;
    name: string;
    $ref: string;
    context: string;
  }[];
}

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name, exact: true })
    .click();
}

async function record(
  page: Page,
): Promise<{ working: EditSessionSnapshot; saved: EditSessionSnapshot }> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}

async function renameText(page: Page, name: string, previous = "Text") {
  await navigate(page, "Registry");
  await page
    .getByRole("radio", { name: "Element", exact: true })
    .press("Space");
  await page
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .fill(previous);
  const cell = page.getByRole("rowheader").filter({
    has: page.getByRole("button", {
      name: `Edit ${previous} term`,
      exact: true,
      includeHidden: true,
    }),
  });
  await cell.hover();
  await page
    .getByRole("button", { name: `Edit ${previous} term`, exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Term", exact: true })
    .fill(name);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
}

async function exportPacket(page: Page): Promise<TaxonomyPacket> {
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Export taxonomy compatibility packet",
      exact: true,
    })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("leonardo-taxonomy-compatibility.json");
  const packet: ClassificationReviewExport = JSON.parse(
    await readFile((await file.path())!, "utf8"),
  );
  await assertClassificationReviewExport(packet);
  expect(packet.exportKind).toBe("compatibility");
  expect(packet.standardConforming).toBe(false);
  expect(packet.assessment.counts.nonStandard).toBeGreaterThan(0);
  for (const alias of packet.aliases) {
    expect(
      packet.assessment.occurrences.some(
        (entry) =>
          entry.recordKind === "alias-usage" &&
          entry.recordId === alias.uuid &&
          entry.fixRequired,
      ),
    ).toBe(true);
  }
  return {
    ...packet,
    tokens: packet.tokens.map((token) => {
      if (!token.classification)
        throw new Error(
          "The canonical fixture is missing its preserved classification.",
        );
      return { ...token, classification: token.classification };
    }),
  };
}

async function discard(page: Page) {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  const confirmation = page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true });
  if (await confirmation.isVisible()) await confirmation.click();
}

async function enterEditMode(page: Page) {
  const banner = page.getByRole("banner");
  const edit = banner.getByRole("button", { name: "Edit", exact: true });
  const save = banner.getByRole("button", { name: "Save", exact: true });
  await expect(edit.or(save)).toBeVisible();
  if (await edit.isVisible()) await edit.click();
  await expect(save).toBeVisible();
  if (
    await page
      .getByRole("heading", { name: "Changes", exact: true })
      .isVisible()
  ) {
    await page.getByRole("button", { name: /^Change log/ }).click();
  }
}

async function openListToken(page: Page, name: string) {
  await page.locator(".tokenCollectionScroll").evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await page
    .getByRole("button", { name: `Open ${name}`, exact: true })
    .click({ timeout: 5000 });
}

function listToken(page: Page, name: string) {
  return page
    .getByRole("treegrid", { name: "Tokens", exact: true })
    .getByRole("row")
    .and(page.locator(`[data-token-name=${JSON.stringify(name)}]`));
}

for (const width of [1440, 390]) {
  test(`Registry names and Save-only compatibility aliases at ${width}px`, async ({
    page,
  }, info) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width === 390)
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
    await navigate(page, "Tokens");
    const originalPacket = await exportPacket(page);
    const original = originalPacket.tokens.find(
      (token) => token.name === "text-size-100",
    )!;
    expect(original).toBeDefined();
    await enterEditMode(page);
    await expect.poll(async () => await record(page)).not.toBeNull();
    const originalReference = (await record(page)).saved.typography.metricNames[
      "font-size"
    ];
    await renameText(page, "Article");
    await navigate(page, "Tokens");
    await page
      .getByRole("searchbox", { name: "Search tokens", exact: true })
      .fill("article-size-100");
    await expect(listToken(page, "article-size-100")).toBeVisible();
    await expect
      .poll(async () =>
        (await record(page)).working.taxonomy!.terms.some(
          (term) => term.value === "Article",
        ),
      )
      .toBe(true);
    expect((await record(page)).working.aliases!.tokens).toEqual([]);
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Save", exact: true })
      .click();
    await expect
      .poll(async () =>
        (await record(page)).saved.aliases!.tokens.some(
          (alias) => alias.name === "text-size-100",
        ),
      )
      .toBe(true);
    const saved = (await record(page)).saved;
    const alias = saved.aliases!.tokens.find(
      (token) => token.name === "text-size-100",
    )!;
    const packet = await exportPacket(page);
    const current = packet.tokens.find((token) => token.id === original.id)!;
    expect(current.name).toBe("article-size-100");
    for (const field of [
      "id",
      "conceptId",
      "value",
      "context",
      "classification",
    ] as const)
      expect(current[field]).toEqual(original[field]);
    expect(saved.typography.metricNames["font-size"]).toEqual(
      originalReference,
    );
    expect(
      packet.aliases
        .filter((token) => token.aliasId === alias.id)
        .every((token) =>
          packet.tokens.some((target) => target.id === token.$ref),
        ),
    ).toBe(true);
    expect(packet.aliases.every((token) => !("value" in token))).toBe(true);
    await page
      .getByRole("searchbox", { name: "Search tokens", exact: true })
      .fill("text-size-100");
    const row = page.getByRole("row", {
      name: "text-size-100 Alias",
      exact: true,
    });
    await expect(row).toContainText("Alias");
    await enterEditMode(page);
    await expect(row.getByRole("checkbox")).toHaveCount(0);
    await expect(
      page
        .getByRole("treegrid", { name: "Tokens", exact: true })
        .getByRole("checkbox", { name: "Select all", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Bulk edit", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("radio", { name: "Grid view", exact: true }).click();
    const card = page.getByRole("row", { name: /^text-size-100\s/ });
    await expect(card).toContainText("Alias of article-size-100");
    await expect(card.getByRole("checkbox")).toBeDisabled();
    await card.click();
    let dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", {
        name: "Classification review needed",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("textbox", { name: "Value", exact: true }),
    ).toHaveAttribute("readonly", "");
    await expect(
      dialog.getByRole("button", { name: "Save", exact: true }),
    ).toHaveCount(0);
    await dialog
      .getByRole("button", { name: "Delete alias", exact: true })
      .click();
    await expect
      .poll(async () =>
        (await record(page)).working.aliases!.tokens.some(
          (token) => token.id === alias.id,
        ),
      )
      .toBe(false);
    await discard(page);
    await page.getByRole("radio", { name: "List view", exact: true }).click();
    await expect(row).toBeVisible();
    await openListToken(page, "text-size-100");
    dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: "Delete alias", exact: true }),
    ).toHaveCount(0);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.locator(".tokenCollectionScroll").evaluate((element) => {
      element.scrollLeft = 0;
    });
    const mainWidth = await page
      .getByRole("main")
      .evaluate((element) => element.clientWidth);
    expect(
      await page
        .locator(".tokenBrowser")
        .evaluate((element) => element.clientWidth),
    ).toBeLessThanOrEqual(mainWidth);
    await page.screenshot({
      path: info.outputPath(`aliases-${width}.png`),
      animations: "disabled",
    });
    await page.reload();
    await navigate(page, "Tokens");
    await page
      .getByRole("searchbox", { name: "Search tokens", exact: true })
      .fill("text-size-100");
    await expect(row).toBeVisible();
    expect(
      await page
        .locator(".tokenCollectionScroll")
        .evaluate((element) => element.clientHeight),
    ).toBeGreaterThanOrEqual(240);
    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeInViewport();
    expect((await record(page)).saved).toEqual(saved);
    if (width === 1440) {
      await enterEditMode(page);
      await renameText(page, "Text", "Article");
      await page
        .getByRole("banner")
        .getByRole("button", { name: "Save", exact: true })
        .click();
      expect(
        (await record(page)).saved.aliases!.tokens.some(
          (token) => token.name === "text-size-100",
        ),
      ).toBe(false);
      expect(
        (await record(page)).saved.aliases!.tokens.some(
          (token) => token.name === "article-size-100",
        ),
      ).toBe(true);
      await navigate(page, "Tokens");
      await page
        .getByRole("searchbox", { name: "Search tokens", exact: true })
        .fill("article-size-100");
      await openListToken(page, "article-size-100");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Delete alias", exact: true })
        .click();
      await page
        .getByRole("banner")
        .getByRole("button", { name: "Save", exact: true })
        .click();
      await page.reload();
      expect(
        (await record(page)).saved.aliases!.tokens.some(
          (token) => token.name === "article-size-100",
        ),
      ).toBe(false);
    }
  });
}

test("A different canonical owner cannot reuse a saved compatibility name", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await enterEditMode(page);
  await renameText(page, "Article");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  const saved = (await record(page)).saved;
  expect(
    saved.aliases!.tokens.some((alias) => alias.name === "text-size-100"),
  ).toBe(true);
  await renameText(page, "Text", "Workflow-icon");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(
    page
      .getByText(
        /Token name "text-size-.+" conflicts with another token or alias/,
      )
      .first(),
  ).toBeVisible();
  expect((await record(page)).saved).toEqual(saved);
  await discard(page);
  expect((await record(page)).working).toEqual(saved);
  await page.reload();
  expect((await record(page)).saved).toEqual(saved);
});

test("Global category order updates names and hierarchy and survives Save and Cancel", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await navigate(page, "Tokens");
  const original = (await exportPacket(page)).tokens.find(
    (token) => token.name === "text-size-100",
  )!;
  expect(original).toBeDefined();
  await enterEditMode(page);
  await navigate(page, "Registry");
  await expect.poll(async () => await record(page)).not.toBeNull();
  const baseline = (await record(page)).saved;
  const propertyId = baseline.taxonomy!.categories.find(
    (category) => category.key === "property",
  )!.id;
  const elementId = baseline.taxonomy!.categories.find(
    (category) => category.key === "element",
  )!.id;
  const moves =
    baseline.taxonomy!.order.indexOf(propertyId) -
    baseline.taxonomy!.order.indexOf(elementId);
  expect(moves).toBeGreaterThan(0);
  for (let index = 0; index < moves; index++) {
    await page
      .getByRole("button", { name: "Move Property earlier", exact: true })
      .click();
  }
  const reordered = [...baseline.taxonomy!.order];
  reordered.splice(reordered.indexOf(propertyId), 1);
  reordered.splice(reordered.indexOf(elementId), 0, propertyId);
  await expect
    .poll(async () => (await record(page)).working.taxonomy!.order)
    .toEqual(reordered);
  expect((await record(page)).working.aliases!.tokens).toEqual([]);
  await navigate(page, "Tokens");
  await page
    .getByRole("searchbox", { name: "Search tokens", exact: true })
    .fill("size-text-100");
  await expect(listToken(page, "size-text-100")).toBeVisible();
  const table = page.getByRole("treegrid", { name: "Tokens", exact: true });
  await expect(
    table
      .getByRole("row", { name: /^(Collapse|Expand) size Text$/ })
      .getByRole("rowheader"),
  ).toHaveText("size Text");
  await expect(
    listToken(page, "size-text-100").getByRole("rowheader"),
  ).toHaveText("100");
  await expect(table).not.toContainText("Property:");
  await expect(table).not.toContainText("Element:");
  const reorderedToken = (await exportPacket(page)).tokens.find(
    (token) => token.id === original.id,
  )!;
  expect(reorderedToken.name).toBe("size-text-100");
  for (const field of [
    "id",
    "conceptId",
    "value",
    "context",
    "classification",
  ] as const) {
    expect(reorderedToken[field]).toEqual(original[field]);
  }
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect
    .poll(async () => (await record(page)).saved.taxonomy!.order)
    .toEqual(reordered);
  const saved = (await record(page)).saved;
  expect(
    saved.aliases!.tokens.some((alias) => alias.name === "text-size-100"),
  ).toBe(true);
  await navigate(page, "Registry");
  await page
    .getByRole("button", { name: "Move Property later", exact: true })
    .click();
  await discard(page);
  expect((await record(page)).working).toEqual(saved);
  await page.reload();
  await navigate(page, "Registry");
  expect((await record(page)).saved).toEqual(saved);
  await expect(
    page.getByRole("button", { name: /^Move .+ (earlier|later)$/ }),
  ).toHaveCount(0);
  await navigate(page, "Tokens");
  await page
    .getByRole("searchbox", { name: "Search tokens", exact: true })
    .fill("size-text-100");
  await expect(listToken(page, "size-text-100")).toBeVisible();
});

test("Color editor, evaluation and canonical CSS output remain usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1800, height: 950 });
  await enterEditMode(page);
  await navigate(page, "Foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  const scales = page.getByRole("tab", { name: "Color scales", exact: true });
  if (await scales.isVisible()) await scales.click();
  else {
    await page.getByRole("button", { name: /Color system controls$/ }).click();
    await page
      .getByRole("option", { name: "Color scales", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Red", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Edit Red scale", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Color scale name", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Color scale name", exact: true }),
  ).not.toHaveAttribute("readonly", "");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Color ramps", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Analyze", exact: true }).click();
  await expect(page.locator('[data-component="ColorAnalyze"]')).toBeVisible();
  await page.getByRole("radio", { name: "Code", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Copy CSS", exact: true }),
  ).toBeEnabled();
  await expect(page.locator('[data-view="code"]')).toContainText(
    "--illustrator-orange-color:",
  );
  await expect(page.locator('[data-view="code"]')).toContainText(
    "--floating-surface-color:",
  );
});
