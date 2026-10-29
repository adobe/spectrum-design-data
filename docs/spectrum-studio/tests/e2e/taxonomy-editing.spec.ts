// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import type { TaxonomyDocument } from "../../src/features/taxonomy/model";
import type { SpacingDocument } from "../../src/features/spacing/model";
import type { SizeDocument } from "../../src/features/size/model";
import { openTaxonomyCell as openCell } from "./taxonomyCell";

interface RegistrySnapshot {
  taxonomy: TaxonomyDocument;
  spacing: SpacingDocument;
  size: SizeDocument;
  tokens: {
    id: string;
    name: string;
    value: string | number;
    classification?: Record<string, string | string[]>;
  }[];
}

async function snapshot(page: Page): Promise<RegistrySnapshot> {
  return page.evaluate(async () => {
    // Follow Vite's active module URLs so HMR timestamps cannot create a second set of atoms.
    function dependency(source: string, path: string) {
      const url = source
        .split('"')
        .find((entry) => entry.split("?")[0] === path);
      if (!url) throw new Error(`Missing browser module ${path}.`);
      return url;
    }
    const view = await (
      await fetch("/src/views/registry/TaxonomyView.tsx")
    ).text();
    const tokensPath = dependency(view, "/src/features/tokens/browserState.ts");
    const tokenSource = await (await fetch(tokensPath)).text();
    const [jotai, taxonomy, spacing, size, tokens] = await Promise.all(
      [
        dependency(view, "/node_modules/.vite/deps/jotai.js"),
        dependency(view, "/src/features/taxonomy/state.ts"),
        dependency(tokenSource, "/src/features/spacing/state.ts"),
        dependency(tokenSource, "/src/features/size/state.ts"),
        tokensPath,
      ].map((path) => import(path)),
    );
    const store = jotai.getDefaultStore();
    return {
      taxonomy: store.get(taxonomy.taxonomyDocumentAtom),
      spacing: store.get(spacing.spacingDocumentAtom),
      size: store.get(size.sizeDocumentAtom),
      tokens: store.get(tokens.browserTokensAtom).map(
        (
          token: RegistrySnapshot["tokens"][number] & {
            projection?: {
              classification: Record<string, string | string[]>;
            };
          },
        ) => ({
          id: token.id,
          name: token.name,
          value: token.value,
          classification: token.projection?.classification,
        }),
      ),
    };
  });
}

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  await page.goto("/");
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function registry(page: Page) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Registry", exact: true })
    .click();
}
async function edit(page: Page) {
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: /^Change log/ }).click();
}
async function discard(page: Page) {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
}
async function saveCell(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
}

for (const width of [1280, 390]) {
  test(`Draft row, editable cells and durable lifecycle at ${width}px`, async ({
    page,
  }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    if (width === 390)
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
    await registry(page);
    await expect(
      page.getByRole("button", { name: "Add term", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^Edit .+ (term|description)$/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Category name", exact: true }),
    ).toHaveAttribute("readonly", "");
    await edit(page);
    const baseline = await snapshot(page);
    await expect(
      page.getByText("Advanced settings", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: /field key/i })).toHaveCount(
      0,
    );

    await page.getByRole("button", { name: "Add term", exact: true }).click();
    const name = page.getByRole("textbox", {
      name: "New term name",
      exact: true,
    });
    await expect(name).toBeFocused();
    await page
      .getByRole("button", { name: "Accept term", exact: true })
      .click();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    expect((await snapshot(page)).taxonomy).toEqual(baseline.taxonomy);
    await name.fill("100");
    await page
      .getByRole("button", { name: "Accept term", exact: true })
      .click();
    await expect(page.getByRole("row").filter({ has: name })).toContainText(
      "already owned",
    );
    await name.fill("  rED  ");
    await page
      .getByRole("button", { name: "Accept term", exact: true })
      .click();
    await expect(page.getByRole("row").filter({ has: name })).toContainText(
      "already owned",
    );
    expect((await snapshot(page)).taxonomy).toEqual(baseline.taxonomy);
    await name.press("Escape");
    await expect(name).toHaveCount(0);
    expect((await snapshot(page)).taxonomy).toEqual(baseline.taxonomy);

    await page
      .getByRole("searchbox", { name: "Search terms", exact: true })
      .fill("nothing matches");
    await page.getByRole("button", { name: "Add term", exact: true }).click();
    await expect(name).toBeFocused();
    await name.fill(" Halo mark ");
    await name.press("Tab");
    expect((await snapshot(page)).taxonomy).toEqual(baseline.taxonomy);
    await name.press("Enter");
    await expect(name).toHaveCount(0);
    await expect(
      page.getByRole("searchbox", { name: "Search terms", exact: true }),
    ).toHaveValue("");
    await page
      .getByRole("searchbox", { name: "Search terms", exact: true })
      .fill("Halo mark");
    const added = (await snapshot(page)).taxonomy.terms.find(
      (term) => term.value === "Halo mark",
    )!;
    expect(added.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(added.description).toBe("");
    const cell = await openCell(page, "Halo mark", "term");
    await expect(cell).toBeFocused();
    await cell.fill("Red");
    await saveCell(page);
    await expect(cell).toHaveAttribute("aria-invalid", "true");
    await cell.fill("Halo outline");
    await cell.press("Enter");
    await expect(cell).toHaveCount(0);
    expect(
      (await snapshot(page)).taxonomy.terms.find(
        (term) => term.id === added.id,
      ),
    ).toEqual({ ...added, value: "Halo outline" });

    let description = await openCell(page, "Halo outline", "description");
    await description.fill("Discard this description");
    await description.press("Escape");
    await expect(description).toHaveCount(0);
    expect(
      (await snapshot(page)).taxonomy.terms.find((term) => term.id === added.id)
        ?.description,
    ).toBe("");
    description = await openCell(page, "Halo outline", "description");
    await description.fill("Discard this description");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    expect(
      (await snapshot(page)).taxonomy.terms.find((term) => term.id === added.id)
        ?.description,
    ).toBe("");
    description = await openCell(page, "Halo outline", "description");
    await description.fill("Saved description");
    await saveCell(page);
    await page.getByRole("button", { name: /^Change log/ }).click();
    await page.getByRole("tab", { name: "Log", exact: true }).click();
    await expect(
      page.locator('[data-component="ChangelogPanel"]'),
    ).toContainText("Saved description");
    await page.getByRole("button", { name: /^Change log/ }).click();
    await page.screenshot({
      path: info.outputPath(`registry-terms-${width}.png`),
      animations: "disabled",
    });
    expect(
      await page
        .locator(".taxonomyView")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const saved = (await snapshot(page)).taxonomy;
    description = await openCell(page, "Halo outline", "description");
    await description.fill("Unsaved description");
    await saveCell(page);
    await page.getByRole("button", { name: "Add term", exact: true }).click();
    await name.fill("Unaccepted draft");
    expect(
      (await snapshot(page)).taxonomy.terms.some(
        (term) => term.value === "Unaccepted draft",
      ),
    ).toBe(false);
    await discard(page);
    expect((await snapshot(page)).taxonomy).toEqual(saved);
    await expect(name).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Add term", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^Edit .+ (term|description)$/ }),
    ).toHaveCount(0);
    await page.reload();
    if (width === 390)
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
    await registry(page);
    expect((await snapshot(page)).taxonomy).toEqual(saved);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /^Change log/ }),
    ).toBeVisible();
  });
}

test("Shared rename preserves UUIDs, source identities and generated values", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await edit(page);
  await registry(page);
  const before = await snapshot(page);
  const reference = before.spacing.scales[0].nameRef!;
  expect(before.size.scales[0].nameRef!.termId).toEqual(reference.termId);
  const category = before.taxonomy.categories.find(
    (entry) => entry.id === reference.categoryId,
  )!;
  await page
    .getByRole("radio", { name: category.name, exact: true })
    .press("Space");
  const field = await openCell(page, "Global", "term");
  await field.fill("Universal");
  await saveCell(page);
  const after = await snapshot(page);
  expect(
    after.taxonomy.terms.find((entry) => entry.id === reference.termId),
  ).toEqual({
    ...before.taxonomy.terms.find((entry) => entry.id === reference.termId),
    value: "Universal",
  });
  expect(after.spacing.scales[0]).toEqual({
    ...before.spacing.scales[0],
    name: "Universal",
  });
  expect(after.size.scales[0]).toEqual({
    ...before.size.scales[0],
    name: "Universal",
  });
  expect(after.tokens).toEqual(before.tokens);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  for (const name of ["Spacing", "Size"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(
      page
        .getByRole("region", {
          name: `Universal ${name.toLowerCase()} scale`,
          exact: true,
        })
        .getByRole("textbox", { name: "Name", exact: true }),
    ).toHaveValue("Universal");
    await expect(
      page.getByRole("button", { name: "Token classification", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Token names and step mappings", { exact: true }),
    ).toHaveCount(0);
  }
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search tokens", exact: true })
    .fill("spacing-100");
  await expect(
    page.getByRole("row", { name: "spacing-100", exact: true }),
  ).toBeVisible();
  await registry(page);
  await page
    .getByRole("radio", { name: category.name, exact: true })
    .press("Space");
  await page
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .fill("Universal");
  await page
    .getByRole("button", { name: "Delete Universal", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirm taxonomy change", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Category editor", exact: true })
      .getByRole("alert"),
  ).toContainText(/Unresolved|remap/i);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await discard(page);
  expect((await snapshot(page)).taxonomy).toEqual(before.taxonomy);
  expect((await snapshot(page)).spacing).toEqual(before.spacing);
  expect((await snapshot(page)).size).toEqual(before.size);
});

test("Category creation and display rename retain internal mapping and UUID", async ({
  page,
}) => {
  await edit(page);
  await registry(page);
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "New category name", exact: true })
    .fill("Custom labels");
  await expect(
    page.getByRole("textbox", { name: "New category field key", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  const created = (await snapshot(page)).taxonomy.categories.find(
    (entry) => entry.name === "Custom labels",
  )!;
  expect(created.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(created.key).toBe(`taxonomy${created.id.replaceAll("-", "")}`);
  await page
    .getByRole("textbox", { name: "Category name", exact: true })
    .fill("Renamed labels");
  await page
    .getByRole("button", { name: "Apply category changes", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirm taxonomy change", exact: true })
    .click();
  expect(
    (await snapshot(page)).taxonomy.categories.find(
      (entry) => entry.id === created.id,
    ),
  ).toEqual({ ...created, name: "Renamed labels" });
  await page.getByRole("button", { name: "Add term", exact: true }).click();
  const name = page.getByRole("textbox", {
    name: "New term name",
    exact: true,
  });
  await expect(name).toBeFocused();
  await name.fill("Discarded draft");
  await page
    .getByRole("button", { name: "Cancel new term", exact: true })
    .click();
  expect(
    (await snapshot(page)).taxonomy.terms.some(
      (entry) => entry.categoryId === created.id,
    ),
  ).toBe(false);
});

test("Numeric draft focus, validation and UUID survive the virtualized table", async ({
  page,
}) => {
  await edit(page);
  await registry(page);
  await page
    .getByRole("radio", { name: "Scale index", exact: true })
    .press("Space");
  const before = (await snapshot(page)).taxonomy;
  await page.getByRole("button", { name: "Add term", exact: true }).click();
  const name = page.getByRole("textbox", {
    name: "New term name",
    exact: true,
  });
  await expect(name).toBeFocused();
  const row = page.getByRole("row").filter({ has: name });
  const id = await row.getAttribute("data-key");
  expect(id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  await name.fill("Infinity");
  await name.press("Enter");
  await expect(row).toContainText("Enter a finite number.");
  await name.fill("100");
  await name.press("Enter");
  await expect(row).toContainText("already owned");
  expect((await snapshot(page)).taxonomy).toEqual(before);
  expect(await row.getAttribute("data-key")).toBe(id);
  await name.fill("9900");
  await name.press("Enter");
  expect(
    (await snapshot(page)).taxonomy.terms.find((term) => term.id === id),
  ).toEqual({
    id,
    categoryId: before.categories.find(
      (category) => category.key === "scaleIndex",
    )!.id,
    value: 9900,
    description: "",
  });
});
