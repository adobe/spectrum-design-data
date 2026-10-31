// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("Token dialog switches from view-only to editing and retains saved values after reload", async ({
  page,
}) => {
  test.slow();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Tokens\b/ })
    .click();
  await page.getByRole("radio", { name: "Colors", exact: true }).click();
  const open = page
    .getByRole("treegrid", { name: "Tokens", exact: true })
    .getByRole("button", { name: /^Open / })
    .first();
  const openerName = await open.getAttribute("aria-label");
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("combobox", { name: "Mode value" }),
  ).toHaveCount(0);
  await expect(dialog.getByText("Released", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await open.click();
  const field = dialog.getByRole("combobox", { name: "Mode value" });
  await field.fill("#123456");
  await field.press("ArrowDown");
  await page.getByRole("option", { name: /Use this value/ }).click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Tokens\b/ })
    .click();
  await page.getByRole("radio", { name: "Colors", exact: true }).click();
  await page.getByRole("button", { name: openerName!, exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Mode value" })).toHaveValue(
    "#123456",
  );
  await page.getByRole("button", { name: "Reset value", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.getByRole("button", { name: openerName!, exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Mode value" })).toHaveValue(
    "#123456",
  );
  expect(errors).toEqual([]);
});
