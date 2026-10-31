// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";

async function openRules(page: Page) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Logic\b/ })
    .click();
  await page.getByRole("tab", { name: "Rules", exact: true }).click();
}

test("Generator options, default rebasing, Cancel and reload keep Registry edits together", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.goto("/");
  await openRules(page);
  const edit = page.getByRole("button", {
    name: "Edit rule T-shirt sizing",
    exact: true,
  });
  await edit.click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Delete option Medium" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Add option", exact: true }).click();
  await page.getByRole("menuitem", { name: "New Size option" }).click();
  await dialog
    .getByRole("textbox", { name: "Name", exact: true })
    .last()
    .fill("Jumbo size");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await edit.click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveCount(6);
  await dialog.getByRole("button", { name: "Add option", exact: true }).click();
  await page.getByRole("menuitem", { name: "New Size option" }).click();
  await dialog
    .getByRole("textbox", { name: "Name", exact: true })
    .last()
    .fill("Jumbo size");
  await dialog.getByRole("button", { name: "Use Small as default" }).click();
  await expect(
    dialog.getByRole("textbox", { name: /^Small token offset(?: |$)/ }),
  ).toHaveValue("0");
  await expect(
    dialog.getByRole("textbox", { name: /^Medium token offset(?: |$)/ }),
  ).toHaveValue("1");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const record = JSON.parse(localStorage.getItem(key) ?? "null");
        return record?.working.taxonomy.terms.some(
          (term: { value: string }) => term.value === "jumbo size",
        );
      }, AUTHORING_STORAGE_KEY),
    )
    .toBe(true);
  await page.reload();
  await openRules(page);
  await edit.click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Name", exact: true }).last(),
  ).toHaveValue("Jumbo size");
  await expect(
    dialog.getByRole("button", { name: "Small is the default" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("Rounding sentence edits stay local until the dialog is saved", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.goto("/");
  await openRules(page);
  const edit = page.getByRole("button", {
    name: "Edit rule Spacing rounding",
    exact: true,
  });
  await edit.click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit condition 1" }).click();
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }).last(),
  ).toBeDisabled();
  await dialog
    .getByRole("textbox", { name: "Condition 1 threshold" })
    .fill("99");
  await dialog
    .getByRole("button", { name: "Save", exact: true })
    .first()
    .click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await edit.click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit condition 1" }).click();
  await expect(
    dialog.getByRole("textbox", { name: "Condition 1 threshold" }),
  ).not.toHaveValue("99");
  await dialog
    .getByRole("button", { name: "Cancel", exact: true })
    .first()
    .click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(errors).toEqual([]);
});
