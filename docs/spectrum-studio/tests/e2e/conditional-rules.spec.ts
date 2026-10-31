// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";

test("conditional rule row transactions, dialog Save/Cancel and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Logic\b/ })
    .click();
  await page.getByRole("tab", { name: "Rules", exact: true }).click();
  const card = page.getByRole("article", {
    name: "Interaction state colors",
    exact: true,
  });
  await card
    .getByRole("button", { name: "Edit rule Interaction state colors" })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit otherwise offset" }).click();
  let editor = dialog.getByRole("group", { name: "Edit statement" });
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }).last(),
  ).toBeDisabled();
  await editor
    .getByRole("textbox", { name: "Token offset", exact: true })
    .fill("2");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await card
    .getByRole("button", { name: "Edit rule Interaction state colors" })
    .click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Otherwise", { exact: true }).locator(".."),
  ).toContainText("+1");
  const storedBeforePreview = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  await dialog.getByRole("combobox", { name: "Default color" }).fill("gray");
  await page.getByRole("option").first().click();
  const preview = dialog.getByRole("grid", {
    name: "Conditional rule preview",
  });
  await expect(preview).toContainText("Otherwise");
  await expect(
    preview.getByRole("gridcell", { name: "+1", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("radio", { name: "Dark", exact: true }).click();
  await expect(preview).toContainText("Branch 1");
  await expect(
    preview.getByRole("gridcell", { name: "-1", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(storedBeforePreview);
  await dialog.screenshot({
    path: test.info().outputPath("interaction-state-colors-dialog.png"),
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Edit otherwise offset" }).click();
  editor = dialog.getByRole("group", { name: "Edit statement" });
  await editor
    .getByRole("textbox", { name: "Token offset", exact: true })
    .fill("2");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const record = JSON.parse(localStorage.getItem(key) ?? "null");
        return record?.working.rules.find(
          (rule: { id: string }) => rule.id === "rule-interaction-state-colors",
        )?.otherwise.offset;
      }, AUTHORING_STORAGE_KEY),
    )
    .toBe(2);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Logic\b/ })
    .click();
  await page.getByRole("tab", { name: "Rules", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit rule Interaction state colors" })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Otherwise", { exact: true })
      .locator(".."),
  ).toContainText("+2");
  expect(errors).toEqual([]);
});
