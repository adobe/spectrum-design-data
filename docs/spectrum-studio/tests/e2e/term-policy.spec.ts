// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import { selectColorPanelSection } from "./colorPanelSection";

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: new RegExp(`^${name}\\b`) })
    .click();
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
async function colors(page: Page) {
  await navigate(page, "Foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Color scales");
}
async function closeScale(page: Page) {
  const dialog = page.getByRole("dialog", { name: /^Edit .+ scale$/ });
  await dialog.press("Escape");
  await expect(dialog).toHaveCount(0);
}
async function enterEdit(page: Page) {
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  if (
    await page
      .getByRole("heading", { name: "Changes", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: /^Change log/ }).click();
}

test("Fresh defaults use RGB and one Wireframe seed, with lowercase terms and sentence-case labels", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.goto("/");
  await enterEdit(page);
  await expect
    .poll(
      async () =>
        (await record(page))?.working.colorSystem.settings.colorOutput
          .outputFormat,
    )
    .toBe("rgb");

  await colors(page);
  await page.getByRole("button", { name: "Wireframe", exact: true }).click();
  const wireframe = page.getByRole("dialog", {
    name: "Edit Wireframe scale",
    exact: true,
  });
  await expect(
    wireframe.getByRole("combobox", { name: "Color scale name", exact: true }),
  ).toHaveValue("Wireframe");
  await expect(
    wireframe.getByRole("button", { name: /^Stop \d+,/ }),
  ).toHaveCount(1);
  await closeScale(page);

  await page.getByRole("button", { name: "Gray", exact: true }).click();
  const name = page.getByRole("combobox", {
    name: "Color scale name",
    exact: true,
  });
  await name.fill("MY-CUSTOM-COLOR");
  await name.press("Enter");
  await expect(name).toHaveValue("My custom color");
  await expect
    .poll(async () =>
      (await record(page)).working.taxonomy!.terms.some(
        (term) => term.value === "my-custom-color",
      ),
    )
    .toBe(true);
  await name.fill("MY CUSTOM COLOR");
  await name.press("Enter");
  await expect(name).toHaveValue("My custom color");
  await closeScale(page);
  await expect(
    page.getByRole("button", {
      name: "My custom color Base color scale",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Analyze", exact: true }).click();
  await expect(page.locator('[data-view="analyze"]')).toBeVisible();

  await navigate(page, "Registry");
  await page
    .getByRole("radio", { name: "Color family", exact: true })
    .press("Space");
  await page
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .fill("my custom color");
  await expect(
    page.getByRole("grid", { name: "Color family terms", exact: true }),
  ).toContainText("My custom color");
  await page
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .clear();
  await page.getByRole("button", { name: "Add term", exact: true }).click();
  await page
    .getByRole("textbox", { name: "New term name", exact: true })
    .fill("NeW-ReGiStRy");
  await page.getByRole("button", { name: "Accept term", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .fill("new registry");
  await expect(
    page.getByRole("grid", { name: "Color family terms", exact: true }),
  ).toContainText("New registry");

  await navigate(page, "Tokens");
  await page
    .getByRole("searchbox", { name: "Search tokens", exact: true })
    .fill("my-custom-color-color-100");
  await expect(
    page.getByRole("treegrid", { name: "Tokens", exact: true }),
  ).toContainText("My custom color");
  await expect(
    page.getByRole("button", {
      name: "Open my-custom-color-color-100",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Structure terms and saved lowercase names survive reload and Cancel with valid component references", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const snapshot = createDefaultSnapshot();
  const source = snapshot.colorSystem.scales.find(
    (scale) => scale.name === "gray",
  )!;
  // Default component assignments reference unavailable tokens at HEAD.
  // Keep this fixture focused on term authoring and the save lifecycle.
  snapshot.components!.components = snapshot.components!.components.map(
    (component) => ({ ...component, assignments: [] }),
  );
  await page.addInitScript(
    ({ key, snapshot, version }) => {
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
    {
      key: AUTHORING_STORAGE_KEY,
      snapshot,
      version: AUTHORING_RECORD_VERSION,
    },
  );
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.goto("/");
  await enterEdit(page);
  await colors(page);
  await page.getByRole("button", { name: "Gray", exact: true }).click();
  let name = page.getByRole("combobox", {
    name: "Color scale name",
    exact: true,
  });
  await name.fill("MY-CUSTOM-COLOR");
  await name.press("Enter");
  await expect(name).toHaveValue("My custom color");
  await closeScale(page);
  await navigate(page, "Design");
  await page
    .locator('[data-component="StructureCard"]')
    .first()
    .click({ position: { x: 4, y: 4 } });
  await page
    .getByRole("combobox", { name: "Token naming", exact: true })
    .fill("My-Structure-NAME");
  const suggestions = page.getByRole("listbox", {
    name: "Suggestions Token naming",
    exact: true,
  });
  await expect(suggestions).toBeVisible();
  await page
    .getByRole("button", { name: "Dismiss", exact: true })
    .press("Enter");
  await expect(suggestions).toHaveCount(0);
  await page
    .getByRole("button", { name: "Create Structure term", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Token naming", exact: true }),
  ).toHaveValue("My structure name");
  await expect(suggestions).toBeVisible();
  await page
    .getByRole("button", { name: "Dismiss", exact: true })
    .press("Enter");
  await expect(suggestions).toHaveCount(0);

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(async () =>
      (await record(page)).saved.taxonomy!.terms.some(
        (term) => term.value === "my-structure-name",
      ),
    )
    .toBe(true);
  const saved = (await record(page)).saved;
  expect(
    saved.taxonomy!.terms.every(
      (term) =>
        typeof term.value !== "string" ||
        term.value === term.value.toLowerCase(),
    ),
  ).toBe(true);
  expect(
    saved.taxonomy!.terms.find((term) => term.id === source.nameRef!.termId)!
      .value,
  ).toBe("my-custom-color");
  await page.reload();
  await expect(
    page
      .getByRole("banner")
      .getByRole("button", { name: "Cancel", exact: true }),
  ).toBeVisible();
  await colors(page);
  await page
    .getByRole("button", { name: "My custom color", exact: true })
    .click();
  name = page.getByRole("combobox", { name: "Color scale name", exact: true });
  await expect(name).toHaveValue("My custom color");
  await name.fill("Another-Working-NAME");
  await name.press("Enter");
  await expect(name).toHaveValue("Another working name");
  await closeScale(page);
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
        (await record(page)).working.taxonomy!.terms.find(
          (term) => term.id === source.nameRef!.termId,
        )!.value,
    )
    .toBe("my-custom-color");
  expect(errors).toEqual([]);
});
