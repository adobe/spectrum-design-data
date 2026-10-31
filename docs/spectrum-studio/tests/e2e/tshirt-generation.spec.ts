// Copyright 2026 Adobe. All rights reserved.
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { createTshirtFixture, TSHIRT_NAME_TERM_ID } from "../fixtures/tshirt";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import { buildTshirtArtifacts } from "../../src/features/design-data/tshirtArtifacts";
import {
  assertTshirtGraph,
  formatTshirtName,
} from "../../src/features/design-data/tshirtProfile";
import { TSHIRT_CACHE_KEY } from "../../src/features/design-data/tshirtCache";
import type { TshirtArtifactBundle } from "../../src/features/design-data/tshirtTypes";
import { projectClassification } from "../../src/features/taxonomy/model";
import { SIZE_TERM_IDS } from "../../src/features/taxonomy/variantVocabulary";
import { structureBinding } from "../../src/features/structures/model";
import { COMPONENT_SIZES } from "../../src/features/foundations/componentSizes";
import {
  assertGeneratedClassificationCompatibility,
  type GeneratedClassificationCompatibility,
} from "../../src/features/taxonomy/generatedReviewExport";

test.setTimeout(90_000);
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

function snapshotFor(fixture: ReturnType<typeof createTshirtFixture>) {
  return Object.assign(
    createDefaultSnapshot(),
    structuredClone(fixture.source),
  );
}
async function seed(
  page: Page,
  snapshot: EditSessionSnapshot,
  appearance = "light",
  width = 1800,
) {
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(
    ({ key, preferences, record, appearance }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(record));
      if (!localStorage.getItem(preferences))
        localStorage.setItem(
          preferences,
          JSON.stringify({ version: 1, appearance, modeSelection: {} }),
        );
    },
    {
      key: AUTHORING_STORAGE_KEY,
      preferences: PREFERENCES_STORAGE_KEY,
      appearance,
      record: {
        version: AUTHORING_RECORD_VERSION,
        working: snapshot,
        saved: snapshot,
        isEditing: true,
        attachments: {},
        savedAttachments: {},
      },
    },
  );
  await page.goto("/");
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
async function cached(page: Page): Promise<TshirtArtifactBundle | null> {
  return page.evaluate((key) => {
    const cache = JSON.parse(localStorage.getItem(key) ?? "null");
    return cache?.bundle ?? null;
  }, TSHIRT_CACHE_KEY);
}
async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("row", { name, exact: true })
    .getByRole("link")
    .click();
}
const card = (page: Page) =>
  page.locator('[data-component="StructureCard"]').first();
async function design(page: Page) {
  await navigate(page, "Design");
  const structureRow = page
    .getByRole("grid", { name: "Structures", exact: true })
    .getByRole("row", { name: "Base", exact: true });
  if ((await structureRow.getAttribute("aria-selected")) !== "true")
    await card(page).click({ position: { x: 4, y: 4 } });
  await expect(structureRow).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("region", { name: "Structure settings for Base" }),
  ).toBeVisible();
}
function browserName(
  snapshot: EditSessionSnapshot,
  row: TshirtArtifactBundle["semantics"][number],
) {
  const projection = projectClassification(
    snapshot.taxonomy!,
    row.classification,
    "structures",
  );
  if (projection.issues.length) throw new Error(projection.issues.join(" "));
  return projection.name;
}
async function downloadBundle(page: Page): Promise<TshirtArtifactBundle> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", {
        name: "Export generated compatibility bundle",
        exact: true,
      })
      .click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    "leonardo-generated-tshirt-compatibility.json",
  );
  const path = await download.path();
  if (!path) throw new Error("The generated token download was not retained.");
  const packet: GeneratedClassificationCompatibility = JSON.parse(
    await readFile(path, "utf8"),
  );
  await assertGeneratedClassificationCompatibility(packet);
  expect(packet.exportKind).toBe("compatibility");
  expect(packet.standardConforming).toBe(false);
  expect(packet.review.occurrences.length).toBeGreaterThan(0);
  expect(
    packet.review.occurrences.every(
      (entry) => entry.status === "non-standard" && entry.fixRequired,
    ),
  ).toBe(true);
  const bundle = packet.bundle;
  assertTshirtGraph(bundle.tokens);
  return bundle;
}

for (const appearance of ["light", "dark"]) {
  test(`Fresh ${appearance} defaults show Base and all five generated size previews`, async ({
    page,
  }, info) => {
    const snapshot = createDefaultSnapshot();
    const expected = buildTshirtArtifacts(snapshot);
    await page.setViewportSize({
      width: appearance === "light" ? 1800 : 1100,
      height: 1000,
    });
    await page.addInitScript(
      ({ key, appearance }) => {
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, appearance, modeSelection: {} }),
        );
      },
      { key: PREFERENCES_STORAGE_KEY, appearance },
    );
    await page.goto("/");
    await expect
      .poll(async () => (await cached(page))?.semantics.length)
      .toBe(20);
    await design(page);
    await expect(
      page
        .getByRole("grid", { name: "Structures", exact: true })
        .getByRole("row"),
    ).toHaveCount(2);
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    expect((await record(page)).working).toEqual(snapshot);
    expect((await record(page)).saved).toEqual(snapshot);
    for (const size of COMPONENT_SIZES) {
      await expect(
        card(page).getByRole("checkbox", { name: size.label, exact: true }),
      ).toBeChecked();
    }
    const mediumPreview = page.getByRole("group", {
      name: "Base structure preview",
      exact: true,
    });
    await expect(mediumPreview).toHaveCSS("gap", "6px");
    await expect(mediumPreview).toHaveCSS("padding-left", "10px");
    await expect(mediumPreview).toHaveCSS("padding-right", "10px");
    await expect(mediumPreview).toHaveCSS("border-top-left-radius", "8px");
    await page
      .getByRole("radio", { name: "Permutations", exact: true })
      .click();
    for (const size of COMPONENT_SIZES) {
      const rows = expected.semantics.filter(
        (row) =>
          row.size === size.id &&
          row.structureId === snapshot.structures!.structures[0].conceptId,
      );
      const value = (property: string) =>
        `${rows.find((row) => row.token.name.property === property)!.target.value}px`;
      const preview = page.getByRole("img", {
        name: `Base (${size.label}) structure preview`,
        exact: true,
      });
      await expect(preview).toHaveCSS("gap", value("gap"));
      await expect(preview).toHaveCSS("padding-left", value("padding"));
      await expect(preview).toHaveCSS("padding-right", value("padding"));
      await expect(preview).toHaveCSS("padding-top", "0px");
      await expect(preview).toHaveCSS("padding-bottom", "0px");
      for (const corner of [
        "top-left",
        "top-right",
        "bottom-right",
        "bottom-left",
      ]) {
        await expect(preview).toHaveCSS(
          `border-${corner}-radius`,
          value("corner-radius"),
        );
      }
    }
    await page
      .locator('[data-component="StructurePermutationsView"]')
      .screenshot({
        path: info.outputPath(`shipped-base-${appearance}.png`),
        animations: "disabled",
      });
    await page.reload();
    await expect
      .poll(async () => (await cached(page))?.semantics.length)
      .toBe(20);
    expect((await record(page)).working).toEqual(snapshot);
    expect((await record(page)).saved).toEqual(snapshot);
  });
}

test("New Base defaults preserve an existing saved design without Structures or sizing rules", async ({
  page,
}) => {
  const existing = createDefaultSnapshot();
  existing.structures!.structures = [];
  existing.rules = existing.rules!.filter(
    (rule) => rule.type !== "tshirt-sizing" && rule.type !== "generator",
  );
  await seed(page, existing);
  await navigate(page, "Design");
  await expect(page.locator('[data-component="StructureCard"]')).toHaveCount(0);
  await expect.poll(async () => (await cached(page))?.semantics.length).toBe(0);
  expect((await record(page)).working).toEqual(existing);
  expect((await record(page)).saved).toEqual(existing);
  await page.reload();
  await navigate(page, "Design");
  await expect(page.locator('[data-component="StructureCard"]')).toHaveCount(0);
  expect((await record(page)).working).toEqual(existing);
  expect((await record(page)).saved).toEqual(existing);
});

test("Create a reusable rule, stage an application and enable shared size permutations", async ({
  page,
}, info) => {
  const fixture = createTshirtFixture({ unattached: true });
  const snapshot = snapshotFor(fixture);
  snapshot.rules = snapshot.rules!.filter(
    (rule) => rule.type !== "tshirt-sizing" && rule.type !== "generator",
  );
  snapshot.structures!.structures[0].generation = {
    sizeTermIds: [SIZE_TERM_IDS.m],
    applications: [],
  };
  snapshot.taxonomy!.terms = snapshot.taxonomy!.terms.filter(
    (term) => term.id !== TSHIRT_NAME_TERM_ID,
  );
  await seed(page, snapshot);
  await design(page);
  await card(page)
    .getByRole("button", { name: "Add generation rule", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Create a Generator rule in Logic first.",
  );
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Apply" }),
  ).toBeDisabled();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await navigate(page, "Logic");
  await page.getByRole("button", { name: "Add rule", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Adjacent sizes");
  await dialog.getByRole("button", { name: /Type$/ }).click();
  await page.getByRole("option", { name: "Generator", exact: true }).click();
  await expect(
    dialog.getByRole("textbox", { name: /^Medium token offset(?: |$)/ }),
  ).toHaveAttribute("readonly");
  await dialog
    .getByRole("button", { name: /Move along the scale by$/ })
    .click();
  await page
    .getByRole("option", { name: "Numeric scale index", exact: true })
    .click();
  const representative = dialog.getByRole("combobox", {
    name: "Default value",
  });
  await representative.fill(fixture.anchor.name);
  await page
    .getByRole("option")
    .filter({ has: page.getByTitle(fixture.anchor.name, { exact: true }) })
    .click();
  await expect(
    dialog.getByRole("grid", { name: "Generator preview" }),
  ).toContainText(
    fixture.references.find(
      (reference) =>
        reference.sourceId === fixture.anchor.sourceId &&
        reference.step === 300,
    )!.name,
  );
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.rules!.find(
          (rule) => rule.name === "Adjacent sizes",
        )?.type,
    )
    .toBe("generator");
  const rule = (await record(page)).working.rules!.find(
    (rule) => rule.name === "Adjacent sizes",
  )!;
  expect(rule.type).toBe("generator");
  if (rule.type !== "generator") throw new Error("Expected a Generator rule.");
  expect(rule.mappings.map((mapping) => mapping.offset)).toEqual([
    -200, -100, 0, 100, 200,
  ]);
  expect("anchor" in rule).toBe(false);

  await design(page);
  const naming = page
    .getByRole("region", { name: "Structure settings for Base" })
    .getByRole("combobox", { name: "Token naming", exact: true });
  await naming.fill("Base");
  await naming.press("ArrowDown");
  const existingName = page.getByRole("option", { name: "Base", exact: true });
  if (await existingName.count()) await existingName.click();
  else {
    await naming.press("Escape");
    await page
      .getByRole("button", { name: "Create Structure term", exact: true })
      .click();
  }
  await expect
    .poll(
      async () =>
        (await record(page)).working.structures!.structures[0].generation!
          .nameRef?.termId,
    )
    .toBeTruthy();
  const before = (await record(page)).working;
  await card(page)
    .getByRole("button", { name: "Add generation rule", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("radio", { name: "All token-backed properties" }),
  ).toBeChecked();
  await expect(
    dialog.getByRole("grid", { name: "Generated token preview" }),
  ).toContainText("base-padding-medium");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await record(page)).working).toEqual(before);
  await card(page)
    .getByRole("button", { name: "Add generation rule", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Apply", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(
      async () =>
        (await record(page)).working.structures!.structures[0].generation!
          .applications.length,
    )
    .toBe(1);
  expect(
    (await record(page)).working.structures!.structures[0].properties,
  ).toEqual(before.structures!.structures[0].properties);
  await expect(
    card(page).getByRole("checkbox", { name: "Medium", exact: true }),
  ).toBeChecked();
  await expect(
    card(page).getByRole("checkbox", { name: "Medium", exact: true }),
  ).toBeDisabled();
  await card(page).getByText("Small", { exact: true }).click();
  await expect(
    card(page).getByRole("checkbox", { name: "Small", exact: true }),
  ).toBeChecked();
  await card(page).getByText("Large", { exact: true }).click();
  await expect(
    card(page).getByRole("checkbox", { name: "Large", exact: true }),
  ).toBeChecked();
  await expect.poll(async () => (await cached(page))?.semantics.length).toBe(3);
  await page.getByRole("radio", { name: "Permutations", exact: true }).click();
  for (const [size, step] of [
    ["s", 400],
    ["m", 500],
    ["l", 600],
  ] as const) {
    const sample = page
      .locator(
        `[data-component="StructurePermutationsView"] [data-size="${size}"]`,
      )
      .getByRole("img", { name: /^Base \(/ });
    const value = fixture.references.find(
      (reference) =>
        reference.sourceId === fixture.anchor.sourceId &&
        reference.step === step,
    )!.value;
    await expect(sample).toHaveCSS("padding-top", `${value}px`);
    await expect(sample).toHaveCSS("padding-left", `${value}px`);
  }
  await page
    .locator('[data-component="StructurePermutationsView"]')
    .screenshot({
      path: info.outputPath("authored-size-permutations.png"),
      animations: "disabled",
    });
  await page.getByRole("radio", { name: "Design", exact: true }).click();
  expect(
    (await record(page)).working.structures!.structures[0].properties,
  ).toEqual(before.structures!.structures[0].properties);
});

test("Saved semantics share inspection, pinned export, cache and source-directed Cancel", async ({
  page,
}) => {
  const fixture = createTshirtFixture();
  const snapshot = snapshotFor(fixture);
  await seed(page, snapshot);
  await navigate(page, "Tokens");
  const medium = fixture.bundle.semantics.find((row) => row.size === "m")!;
  const mediumName = browserName(snapshot, medium);
  await page.getByRole("searchbox", { name: "Search tokens" }).fill(mediumName);
  const row = page
    .getByRole("treegrid", { name: "Tokens", exact: true })
    .getByRole("row")
    .filter({
      has: page.getByRole("button", {
        name: `Open ${mediumName}`,
        exact: true,
      }),
    });
  await expect(row).toContainText("Semantic");
  await expect(row).toContainText(fixture.anchor.name);
  await page
    .getByRole("button", { name: `Open ${mediumName}`, exact: true })
    .click();
  const details = page.getByRole("dialog");
  await expect(
    details.getByRole("textbox", { name: "Value", exact: true }),
  ).toHaveAttribute("readonly");
  await expect(
    details.getByRole("button", { name: "Save", exact: true }),
  ).toHaveCount(0);
  await expect(details).toContainText(
    "direct variant overrides are not supported yet",
  );
  await expect(details).toContainText(medium.token.$ref!);
  await expect(details).toContainText("Requested / actual mapping");
  await details.getByRole("button", { name: "Close", exact: true }).click();
  const exported = await downloadBundle(page);
  expect(exported.profile).toEqual(fixture.bundle.profile);
  expect(exported.semantics).toHaveLength(3);
  for (const semantic of exported.semantics) {
    expect("$ref" in semantic.token).toBe(true);
    const target = exported.tokens.find(
      (token) => token.uuid === semantic.token.$ref,
    )!;
    expect(target).toBeDefined();
    expect("value" in target).toBe(true);
    expect(semantic.token.$ref).not.toBe(semantic.target.id);
  }
  expect(formatTshirtName(medium.token.name)).toBe("base-padding-medium");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await navigate(page, "Tokens");
  await expect
    .poll(
      async () =>
        (await cached(page))?.semantics.find((item) => item.size === "m")?.token
          .uuid,
    )
    .toBe(medium.token.uuid);
  await navigate(page, "Logic");
  await page
    .getByRole("button", { name: "Edit rule Adjacent sizes", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: /^Large token offset(?: |$)/ })
    .fill("2");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  const large = exported.semantics.find((item) => item.size === "l")!;
  const nextTarget = fixture.references.find(
    (reference) =>
      reference.sourceId === fixture.anchor.sourceId && reference.step === 700,
  )!;
  await expect
    .poll(
      async () =>
        (await cached(page))?.semantics.find((item) => item.size === "l")
          ?.target.id,
    )
    .toBe(nextTarget.id);
  expect(
    (await cached(page))!.semantics.find((item) => item.size === "l")!.token
      .uuid,
  ).toBe(large.token.uuid);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await cached(page))?.semantics.find((item) => item.size === "l")
          ?.target.id,
    )
    .toBe(large.target.id);
  expect((await record(page)).working).toEqual((await record(page)).saved);
  await design(page);
  await expect(
    card(page).getByRole("button", {
      name: "Add generation rule",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    card(page).getByRole("checkbox", { name: "Small", exact: true }),
  ).toBeDisabled();
});

test("Hidden nearest variants preserve exact literals and stable alias transitions in a narrow dark editor", async ({
  page,
}, info) => {
  const fixture = createTshirtFixture({
    hidden: true,
    nearest: true,
    fiveSizes: true,
  });
  const snapshot = snapshotFor(fixture);
  const modeKey = JSON.stringify(
    Object.entries(fixture.selection).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  snapshot.browserTokenEdits![fixture.anchor.nativeId] = {
    values: {
      [modeKey]: { value: 20.1250001, baseline: Number(fixture.anchor.value) },
    },
  };
  const expected = buildTshirtArtifacts(snapshot);
  await seed(page, snapshot, "dark", 1100);
  await design(page);
  await page.getByRole("radio", { name: "Permutations", exact: true }).click();
  await expect(page.locator('[data-size="xs"]')).toContainText(
    "Nearest available targets",
  );
  await expect(page.locator('[data-size="m"]').getByRole("img")).toHaveCSS(
    "padding-top",
    "20.125px",
  );
  await page
    .locator('[data-component="StructurePermutationsView"]')
    .screenshot({
      path: info.outputPath("dark-nearest-permutations.png"),
      animations: "disabled",
    });
  await navigate(page, "Tokens");
  const small = expected.semantics.find(
    (item) => item.size === "s" && item.kind === "override",
  )!;
  const name = browserName(snapshot, small);
  await page.getByRole("searchbox", { name: "Search tokens" }).fill(name);
  await page.getByRole("button", { name: `Open ${name}`, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Exact generated literal",
  );
  await expect(page.getByRole("dialog").locator("pre")).toContainText(
    '"20.1250001px"',
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Nearest available token",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  const literalBundle = await downloadBundle(page);
  expect(literalBundle.tokens.every((token) => "value" in token)).toBe(true);
  expect(literalBundle.primitiveLineage).toHaveLength(0);
  await navigate(page, "Foundations");
  await page.getByRole("tab", { name: "Spacing", exact: true }).click();
  const scale = page.getByRole("region", {
    name: "Global spacing scale",
    exact: true,
  });
  const visibility = scale.getByRole("checkbox", {
    name: "Hide from publishing",
    exact: true,
  });
  await scale.getByText("Hide from publishing", { exact: true }).click();
  await expect(visibility).not.toBeChecked();
  await expect
    .poll(
      async () =>
        (await cached(page))?.semantics.find(
          (item) => item.token.uuid === small.token.uuid,
        )?.token.$ref !== undefined,
    )
    .toBe(true);
  const published = (await cached(page))!;
  assertTshirtGraph(published.tokens);
  expect(
    published.semantics.find((item) => item.token.uuid === small.token.uuid)!
      .conceptId,
  ).toBe(small.conceptId);
  await scale.getByText("Hide from publishing", { exact: true }).click();
  await expect(visibility).toBeChecked();
  await expect
    .poll(
      async () =>
        (await cached(page))?.semantics.find(
          (item) => item.token.uuid === small.token.uuid,
        )?.token.value,
    )
    .toBe("20.1250001px");
});

test("Custom-target repair, disjoint applications and Remove/Undo preserve authoring intent", async ({
  page,
}) => {
  const fixture = createTshirtFixture();
  const snapshot = snapshotFor(fixture);
  const structure = snapshot.structures!.structures[0];
  structure.generation!.applications[0].targets = {
    kind: "custom",
    bindingIds: [structureBinding(structure, "paddingTop")!.id],
  };
  await seed(page, snapshot);
  await design(page);
  const settings = page.getByRole("region", {
    name: "Structure settings for Base",
  });
  await settings
    .getByRole("button", { name: "Use individual padding values", exact: true })
    .click();
  await settings
    .getByRole("button", { name: "Clear Top padding", exact: true })
    .click();
  await expect(
    page.locator('[data-component="StructuresPanel"]'),
  ).toContainText("no longer token-backed");
  await card(page)
    .getByRole("button", { name: "Edit generation rule for Base", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  const stale = dialog.getByRole("checkbox", {
    name: "Top padding",
    exact: true,
  });
  await expect(stale).toBeChecked();
  await expect(stale).toBeEnabled();
  await dialog.getByText("Top padding", { exact: true }).click();
  await expect(stale).not.toBeChecked();
  await dialog.getByText("Bottom padding", { exact: true }).click();
  await expect(
    dialog.getByRole("checkbox", { name: "Bottom padding", exact: true }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.structures!.structures[0].generation!
          .applications[0].targets,
    )
    .toEqual({
      kind: "custom",
      bindingIds: [structureBinding(structure, "paddingBottom")!.id],
    });
  await expect.poll(async () => (await cached(page))?.semantics.length).toBe(3);
  const repaired = buildTshirtArtifacts(
    (await record(page)).working,
  ).semantics.map((item) => item.token.uuid);
  await expect
    .poll(async () =>
      (await cached(page))?.semantics.map((item) => item.token.uuid),
    )
    .toEqual(repaired);
  await card(page)
    .getByRole("button", {
      name: "Remove generation rule from Base",
      exact: true,
    })
    .click();
  await expect.poll(async () => (await cached(page))?.semantics.length).toBe(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () =>
      (await cached(page))?.semantics.map((item) => item.token.uuid),
    )
    .toEqual(repaired);
  await card(page)
    .getByRole("button", { name: "Add generation rule", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("overlap");
  await expect(
    dialog.getByRole("button", { name: "Apply", exact: true }),
  ).toBeDisabled();
  await dialog.getByText("Custom properties", { exact: true }).click();
  await expect(
    dialog.getByRole("radio", { name: "Custom properties", exact: true }),
  ).toBeChecked();
  await dialog.getByText("Bottom padding", { exact: true }).click();
  await expect(
    dialog.getByRole("checkbox", { name: "Bottom padding", exact: true }),
  ).not.toBeChecked();
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await record(page)).working.structures!.structures[0].generation!
          .applications.length,
    )
    .toBe(2);
  await card(page).getByText("Extra small", { exact: true }).click();
  await expect(
    card(page).getByRole("checkbox", { name: "Extra small", exact: true }),
  ).toBeChecked();
  await expect.poll(async () => (await cached(page))?.semantics.length).toBe(8);
  expect(
    (
      await record(page)
    ).working.structures!.structures[0].generation!.applications.every(
      (application) => !("sizeTermIds" in application),
    ),
  ).toBe(true);
});

test("Foundation consumers retain rounding-only controls and render all variant-source families", async ({
  page,
}) => {
  const fixture = createTshirtFixture();
  await seed(page, snapshotFor(fixture));
  await navigate(page, "Foundations");
  for (const [tab, label] of [
    ["Spacing", "Global spacing scale"],
    ["Size", "Global size scale"],
    ["Corner radius", "Global radius scale"],
  ]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const scale = page.getByRole("region", { name: label, exact: true });
    await expect(scale).toBeVisible();
    await scale.getByRole("button", { name: / Rounding$/ }).click();
    await expect(
      page.getByRole("option", { name: "Adjacent sizes", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("option", { name: "Whole numbers", exact: true })
      .click();
    await page.getByRole("radio", { name: "Elements", exact: true }).click();
    await expect(
      page.getByRole("radio", { name: "Elements", exact: true }),
    ).toBeChecked();
  }
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await page
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  await page.getByRole("button", { name: / Text size rounding$/ }).click();
  await expect(
    page.getByRole("option", { name: "Adjacent sizes", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("option", { name: "No rounding", exact: true }).click();
  await page.getByRole("tab", { name: "Elevation", exact: true }).click();
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  await expect(page.locator("[data-shadow-sample]").first()).toBeVisible();
  await page.getByRole("radio", { name: "Code", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Code", exact: true }),
  ).toBeChecked();
});
