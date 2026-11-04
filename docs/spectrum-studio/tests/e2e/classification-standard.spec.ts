// Copyright 2026 Adobe. All rights reserved.
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
} from "../../src/features/edit-session/storage";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  assertClassificationReviewExport,
  type ClassificationReviewExport,
} from "../../src/features/taxonomy/reviewedExport";
import {
  assertGeneratedClassificationCompatibility,
  type GeneratedClassificationCompatibility,
} from "../../src/features/taxonomy/generatedReviewExport";
import { classificationStandard } from "../../src/features/taxonomy/standardContract";
import { buildTshirtArtifacts } from "../../src/features/design-data/tshirtArtifacts";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../../src/features/tokens/aliasTargets";

const errors = new WeakMap<Page, string[]>();
test.use({ actionTimeout: 10_000 });
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: new RegExp(`^${name}(?:\\s|$)`) })
    .click();
}
async function migrationReview(page: Page) {
  await navigate(page, "Migration analysis");
  await page.getByRole("button", { name: /Analysis view/ }).click();
  await page
    .getByRole("option", { name: "Classification review", exact: true })
    .click();
  await page.getByRole("button", { name: /Comparison source/ }).click();
  await page
    .getByRole("option", { name: "Working authoring", exact: true })
    .click();
  return page.getByRole("region", {
    name: "Classification migration review",
    exact: true,
  });
}
async function record(
  page: Page,
): Promise<{ working: EditSessionSnapshot; saved: EditSessionSnapshot }> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
async function seedAuthoring(page: Page, snapshot: EditSessionSnapshot) {
  await page.addInitScript(
    ({ key, version, snapshot }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(
          key,
          JSON.stringify({
            version,
            working: snapshot,
            saved: snapshot,
            isEditing: false,
            attachments: {},
            savedAttachments: {},
          }),
        );
    },
    { key: AUTHORING_STORAGE_KEY, version: AUTHORING_RECORD_VERSION, snapshot },
  );
}
async function body(page: Page) {
  await navigate(page, "Registry");
  await page
    .getByRole("radio", { name: "Element", exact: true })
    .press("Space");
  await page
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .fill("Body");
  const grid = page.getByRole("grid", { name: "Element terms", exact: true });
  await grid.evaluate((element) => {
    element.scrollLeft = 0;
  });
  return grid.getByRole("row", { name: /^Body(?:\s|$)/ });
}
async function editBody(page: Page, description: string) {
  const row = await body(page);
  expect(
    await row.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(240);
  const grid = page.getByRole("grid", { name: "Element terms", exact: true });
  await grid.scrollIntoViewIfNeeded();
  await grid.evaluate((element) => {
    element.scrollLeft = 220;
  });
  const cell = row.getByRole("gridcell").filter({
    has: page.getByRole("button", {
      name: "Edit Body description",
      exact: true,
      includeHidden: true,
    }),
  });
  await cell.scrollIntoViewIfNeeded();
  // S2 suppresses pointer events while its virtualized table is scrolling.
  await expect(cell).toHaveCSS("pointer-events", "auto");
  await cell.hover();
  await page
    .getByRole("button", { name: "Edit Body description", exact: true })
    .click({ timeout: 10_000 });
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Description", exact: true })
    .fill(description);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
}

test("Parity diagnostics stay out of authoring in both modes and token presentations", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seedAuthoring(page, createDefaultSnapshot());
  await page.goto("/");
  for (const editing of [false, true]) {
    if (editing) {
      await page
        .getByRole("banner")
        .getByRole("button", { name: "Edit", exact: true })
        .click();
      if (
        await page
          .getByRole("heading", { name: "Changes", exact: true })
          .isVisible()
      )
        await page.getByRole("button", { name: /^Change log/ }).click();
    }
    await navigate(page, "Registry");
    await expect(
      page.getByText("Classification review needed", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Classification review", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Migration review", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("radio", { name: "Visibility", exact: true }),
    ).toBeVisible();
    await navigate(page, "Tokens");
    await page
      .getByRole("searchbox", { name: "Search tokens", exact: true })
      .fill("red-color");
    for (const view of ["List view", "Grid view"]) {
      await page.getByRole("radio", { name: view, exact: true }).click();
      await expect(
        page.getByText("Classification review needed", { exact: true }),
      ).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^Export / })).toHaveCount(
        0,
      );
    }
    await page.getByRole("radio", { name: "List view", exact: true }).click();
    const table = page.getByRole("treegrid", { name: "Tokens", exact: true });
    const dialog = page.getByRole("dialog");
    if (editing) {
      await page.locator(".tokenCollectionScroll").evaluate((element) => {
        element.scrollLeft = 0;
      });
      await table
        .getByRole("checkbox", { name: /^Select / })
        .nth(1)
        .press("Space");
      await page
        .getByRole("button", { name: "Bulk edit", exact: true })
        .click();
      await expect(
        dialog.getByRole("heading", { name: /^Bulk edit/ }),
      ).toBeVisible();
      await expect(dialog).not.toContainText("proposed");
      await expect(dialog).not.toContainText("Classification review");
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    }
    await table
      .getByRole("button", { name: /^Open / })
      .first()
      .click();
    await expect(
      dialog.locator('[data-component="TokenInspector"]'),
    ).toBeVisible();
    await expect(dialog).not.toContainText("proposed");
    await expect(dialog).not.toContainText("classification review");
    await dialog
      .getByRole("button", { name: editing ? "Cancel" : "Close", exact: true })
      .click();
  }
  await navigate(page, "System health");
  await expect(page.getByText("Spec conformance", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText(/design-data spec rules/)).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Platform divergence", exact: true }),
  ).toBeVisible();
  const migration = await migrationReview(page);
  await expect(
    migration.getByRole("heading", {
      name: "Classification review",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    migration.getByRole("grid", {
      name: "Classification entries needing review",
      exact: true,
    }),
  ).toContainText("proposed");
  await expect(
    migration.getByRole("button", {
      name: "Export taxonomy compatibility packet",
      exact: true,
    }),
  ).toBeVisible();
});

test("A conforming definition has no warning or empty keyboard-scroll region", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  const taxonomy = snapshot.taxonomy;
  const facet = classificationStandard.facets.find(
    (entry) => entry.key === "element",
  );
  const concept = classificationStandard.concepts.find(
    (entry) => entry.id === "element:text",
  );
  const category = taxonomy?.categories.find(
    (entry) => entry.key === "element",
  );
  const term = taxonomy?.terms.find(
    (entry) => entry.categoryId === category?.id && entry.value === "text",
  );
  if (!taxonomy || !facet || !concept || !category || !term)
    throw new Error("The reviewed Text fixture is unavailable.");
  category.description = facet.question;
  term.description = concept.definition;
  await page.addInitScript(
    ({ key, record }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(key, JSON.stringify(record));
    },
    {
      key: AUTHORING_STORAGE_KEY,
      record: {
        version: AUTHORING_RECORD_VERSION,
        working: snapshot,
        saved: snapshot,
        isEditing: false,
        attachments: {},
        savedAttachments: {},
      },
    },
  );
  await page.goto("/");
  await navigate(page, "Registry");
  await page
    .getByRole("radio", { name: "Element", exact: true })
    .press("Space");
  await page
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .fill("Text");
  const row = page
    .getByRole("grid", { name: "Element terms", exact: true })
    .getByRole("row", { name: /^Text(?:\s|$)/ });
  await expect(row.getByText("Proposed standard", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    row.getByText("Classification review needed", { exact: true }),
  ).toHaveCount(0);
  await expect(
    row.getByRole("region", {
      name: "Text classification review",
      exact: true,
    }),
  ).toHaveCount(0);
  expect((await record(page)).saved.taxonomy).toEqual(taxonomy);
});

test("A default generated color has no proposed-definition messages in its dialog", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  const color = canonicalAliasRows(
    completeAliasSource(snapshot),
    buildTshirtArtifacts(snapshot),
  ).find(
    (entry) =>
      entry.token.type === "colors" &&
      !entry.token.paletteColorId &&
      !entry.token.valueOverridden &&
      !entry.token.dataVis?.static,
  );
  if (!color) throw new Error("Missing default generated color fixture.");
  await page.goto("/");
  await navigate(page, "Tokens");
  await page
    .getByRole("searchbox", { name: "Search tokens", exact: true })
    .fill(color.name);
  await page.locator(".tokenCollectionScroll").evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await page
    .getByRole("button", { name: `Open ${color.name}`, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const details = dialog.getByRole("region", {
    name: "Classification review details",
    exact: true,
  });
  await expect(details).toHaveCount(0);
  await expect(dialog).not.toContainText("proposed");
  await expect(
    dialog.locator('[data-component="TokenInspector"]'),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
});

for (const width of [1440, 390]) {
  test(`Review stays in Migration analysis while non-standard data saves and exports at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width, height: 1000 });
    await seedAuthoring(page, createDefaultSnapshot());
    await page.goto("/");
    if (width === 390)
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
    await navigate(page, "Registry");
    await expect(
      page.getByRole("heading", {
        name: "Classification needs review",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("not a count of unique tokens or color values.", {
        exact: false,
      }),
    ).toHaveCount(0);
    const original = await body(page);
    await expect(
      original
        .getByRole("rowheader")
        .getByText("Classification review needed", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("grid", { name: "Element terms", exact: true })
      .evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
    const reasons = original.getByRole("region", {
      name: "Body classification review",
      exact: true,
    });
    await expect(reasons).toHaveCount(0);
    await page
      .getByRole("radio", { name: "Visibility", exact: true })
      .press("Space");
    await expect(
      page.getByRole("textbox", { name: "Category name", exact: true }),
    ).toHaveValue("Visibility");
    await expect(
      page.getByText(/Your saved label remains Visibility/),
    ).toHaveCount(0);
    await migrationReview(page);
    await page
      .getByRole("button", { name: "Components and elements", exact: true })
      .click();
    const catalog = page.getByRole("grid", {
      name: "Proposed component catalog",
      exact: true,
    });
    await expect(catalog).toContainText("Body");
    await expect(catalog).toContainText("Button");
    await expect(catalog).toContainText("Typography");
    await expect(catalog).toContainText("Controls");
    await page
      .getByRole("button", { name: "Components and elements", exact: true })
      .click();

    await page
      .getByRole("banner")
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    if (
      await page
        .getByRole("heading", { name: "Changes", exact: true })
        .isVisible()
    )
      await page.getByRole("button", { name: /^Change log/ }).click();
    const baseline = (await record(page)).saved;
    const term = baseline.taxonomy!.terms.find(
      (entry) => entry.value === "body",
    )!;
    const description =
      "Retained Body instance needs a reviewed component migration";
    await editBody(page, description);
    await expect
      .poll(
        async () =>
          (await record(page)).working.taxonomy!.terms.find(
            (entry) => entry.id === term.id,
          )?.description,
      )
      .toBe(description);
    await expect(await body(page)).not.toContainText(
      "Classification review needed",
    );
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Save", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await record(page)).saved.taxonomy!.terms.find(
            (entry) => entry.id === term.id,
          )?.description,
      )
      .toBe(description);
    const saved = (await record(page)).saved;
    expect(
      saved.taxonomy!.terms.find((entry) => entry.id === term.id)?.categoryId,
    ).toBe(term.categoryId);
    expect(saved.aliases).toEqual(baseline.aliases);

    await navigate(page, "Tokens");
    await page
      .getByRole("searchbox", { name: "Search tokens", exact: true })
      .fill("text-size-100");
    await page.locator(".tokenCollectionScroll").evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await page
      .getByRole("button", { name: "Open text-size-100", exact: true })
      .click();
    const tokenDialog = page.getByRole("dialog");
    await expect(
      tokenDialog.getByRole("heading", {
        name: "Classification review needed",
        exact: true,
      }),
    ).toHaveCount(0);
    const reviewDetails = tokenDialog.getByRole("region", {
      name: "Classification review details",
      exact: true,
    });
    await expect(reviewDetails).toHaveCount(0);
    await expect(tokenDialog).not.toContainText("proposed");
    await tokenDialog
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await migrationReview(page);
    let downloads = 0;
    page.on("download", () => {
      downloads++;
    });
    await page
      .getByRole("button", {
        name: "Export standard-compliant taxonomy",
        exact: true,
      })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Standard-compliant export blocked" }),
    ).toContainText("Standard-compliant export blocked");
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Standard-compliant export blocked" }),
    ).toContainText("not a color-value check");
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Standard-compliant export blocked" }),
    ).not.toContainText("does not bind");
    expect(downloads).toBe(0);
    const compatibleDownload = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: "Export taxonomy compatibility packet",
        exact: true,
      })
      .click();
    const compatibleFile = await compatibleDownload;
    expect(compatibleFile.suggestedFilename()).toBe(
      "leonardo-taxonomy-compatibility.json",
    );
    const compatiblePath = await compatibleFile.path();
    if (!compatiblePath)
      throw new Error("The compatibility packet was not retained.");
    const packet: ClassificationReviewExport = JSON.parse(
      await readFile(compatiblePath, "utf8"),
    );
    await assertClassificationReviewExport(packet);
    expect(packet.standardConforming).toBe(false);
    expect(packet.upstreamAdopted).toBe(false);
    expect(packet.source.taxonomy).toEqual(saved.taxonomy);
    expect(packet.source.aliases).toEqual(saved.aliases);
    expect(packet.source.records).toHaveLength(packet.tokens.length);
    const uses = packet.assessment.occurrences.filter(
      (entry) => entry.termId === term.id,
    );
    expect(uses.length).toBeGreaterThan(1);
    expect(
      uses.every(
        (entry) =>
          entry.fixRequired &&
          entry.status === "non-standard" &&
          entry.targetId === "component:body",
      ),
    ).toBe(true);
    expect(packet.assessment.counts.occurrences).toBe(
      packet.assessment.occurrences.length,
    );
    expect(
      packet.aliases.every((alias) =>
        packet.tokens.some((token) => token.id === alias.$ref),
      ),
    ).toBe(true);
    await expect(page.getByRole("alert")).toHaveCount(0);

    const generatedDownload = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: "Export generated compatibility bundle",
        exact: true,
      })
      .click();
    const generatedFile = await generatedDownload;
    expect(generatedFile.suggestedFilename()).toBe(
      "leonardo-generated-tshirt-compatibility.json",
    );
    const generatedPath = await generatedFile.path();
    if (!generatedPath)
      throw new Error("The generated compatibility packet was not retained.");
    const generated: GeneratedClassificationCompatibility = JSON.parse(
      await readFile(generatedPath, "utf8"),
    );
    await assertGeneratedClassificationCompatibility(generated);
    expect(generated.bundle.semantics.length).toBeGreaterThan(0);
    expect(
      generated.review.occurrences.every(
        (entry) => entry.fixRequired && entry.status === "non-standard",
      ),
    ).toBe(true);
    expect(generated.classification.source.taxonomy).toEqual(saved.taxonomy);
    expect((await record(page)).saved).toEqual(
      saved,
      "Downloads do not save, clear warnings or mutate the baseline.",
    );

    await editBody(page, "Temporary investigation note");
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Discard", exact: true })
      .click();
    expect((await record(page)).working).toEqual(saved);
    await page.reload();
    const restored = await body(page);
    await expect(
      restored
        .getByRole("rowheader")
        .getByText("Classification review needed", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("grid", { name: "Element terms", exact: true })
      .evaluate((element) => {
        element.scrollLeft = 220;
      });
    await expect(restored).toContainText(description);
    expect((await record(page)).saved).toEqual(saved);
  });
}
