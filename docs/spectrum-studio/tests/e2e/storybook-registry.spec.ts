// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    )
      collected.push(message.text());
  });
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));
const accepted = (page: Page) =>
  page.getByTestId("registry-accepted").textContent();
const card = (page: Page, name: string) =>
  page.getByRole("article", { name: `${name} category`, exact: true });

test("Card edits, explicit term creation, and keyboard-accessible reordering", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/iframe.html?id=views-registry--editing&viewMode=story");
  const role = card(page, "Example role");
  const baseline = await accepted(page);
  await role
    .getByRole("textbox", { name: "Category description", exact: true })
    .fill("Changed on blur");
  await role
    .getByRole("textbox", { name: "Category name", exact: true })
    .click();
  await expect.poll(() => accepted(page)).toContain("Changed on blur");
  await role.getByRole("button", { name: "Add term", exact: true }).click();
  const input = role.getByRole("textbox", {
    name: "New term name",
    exact: true,
  });
  await expect(input).toBeFocused();
  await input.fill("   ");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await input.fill("Registry created");
  await input.press("Tab");
  await expect.poll(() => accepted(page)).not.toContain("registry created");
  await role.getByRole("button", { name: "Accept term", exact: true }).click();
  await expect.poll(() => accepted(page)).toContain("registry created");
  await expect(input).toHaveCount(0);
  await role
    .getByRole("button", {
      name: "Reorder options for Example role",
      exact: true,
    })
    .click();
  await page.getByRole("menuitem", { name: "Move later", exact: true }).click();
  await expect
    .poll(async () => JSON.parse((await accepted(page))!).order.slice(0, 2))
    .toEqual(JSON.parse(baseline!).order.slice(0, 2).reverse());
  const changed = JSON.parse((await accepted(page))!);
  await card(page, "Example surface")
    .getByRole("button", { name: "Reorder Example surface", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator(".registryDropIndicator[data-drop-target]"),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  expect(JSON.parse((await accepted(page))!).order).toEqual(changed.order);
  await page.screenshot({
    path: info.outputPath("registry-board.png"),
    animations: "disabled",
  });
});

test("Pointer dragging updates the actual category order", async ({ page }) => {
  await page.goto("/iframe.html?id=views-registry--editing&viewMode=story");
  const baseline = JSON.parse((await accepted(page))!);
  const target = card(page, "Example surface");
  const handle = await card(page, "Example role")
    .getByRole("button", { name: "Reorder Example role", exact: true })
    .boundingBox();
  if (!handle) throw new Error("The category drag handle is not visible.");
  await test.step(
    "Start native pointer dragging",
    async () => {
      await page.mouse.move(
        handle.x + handle.width / 2,
        handle.y + handle.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        handle.x + handle.width / 2 + 12,
        handle.y + handle.height / 2,
        { steps: 4 },
      );
    },
    { timeout: 8000 },
  );
  await expect(
    page.locator(".registryCategoryItem[data-dragging]"),
  ).toHaveCount(1);
  await test.step(
    "Move to the relocated drop target",
    async () => {
      const box = await target.boundingBox();
      if (!box) throw new Error("The drop target is not visible.");
      await page.mouse.move(box.x + box.width - 4, box.y + 48, { steps: 8 });
      await page.mouse.move(box.x + box.width - 5, box.y + 48);
    },
    { timeout: 8000 },
  );
  await test.step("Drop the category", () => page.mouse.up(), {
    timeout: 8000,
  });
  await expect
    .poll(async () => JSON.parse((await accepted(page))!).order.slice(0, 2))
    .toEqual(baseline.order.slice(0, 2).reverse());
});

test("Nested term saves stay in the category draft until category Save", async ({
  page,
}, info) => {
  await page.goto("/iframe.html?id=views-registry--editing&viewMode=story");
  const baseline = await accepted(page);
  await page
    .getByRole("button", { name: "Open Example role category", exact: true })
    .click();
  const category = page.getByRole("dialog", {
    name: "Example role",
    exact: true,
  });
  await expect(category).toContainText("Linked category");
  await category.screenshot({
    path: info.outputPath("registry-category.png"),
    animations: "disabled",
  });
  await category
    .getByRole("button", { name: "Open Registry example term", exact: true })
    .click();
  const term = page.getByRole("dialog", {
    name: "Registry example",
    exact: true,
  });
  const referenceTable = term.getByRole("table", {
    name: "References",
    exact: true,
  });
  await expect(term).toContainText("References (3)");
  await expect(referenceTable.getByRole("columnheader")).toHaveText([
    "Reference",
    "Page",
  ]);
  await expect(referenceTable.locator("tbody tr")).toHaveCount(3);
  await term
    .getByRole("textbox", { name: "Term", exact: true })
    .fill("Registry staged");
  await term.getByRole("button", { name: "Save", exact: true }).click();
  await expect(category).toContainText("Registry staged");
  expect(await accepted(page)).toEqual(baseline);
  await category.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await accepted(page)).toEqual(baseline);
  await page
    .getByRole("button", { name: "Open Example role category", exact: true })
    .click();
  await category
    .getByRole("textbox", { name: "Category description", exact: true })
    .fill("Accepted category draft");
  await category
    .getByRole("searchbox", { name: "Search terms", exact: true })
    .fill("no matching entry");
  await expect(category).toContainText("No matching terms.");
  await category.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => accepted(page)).toContain("Accepted category draft");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Read-only references and narrow dark layout remain usable", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(
    "/iframe.html?id=views-registry--references-unavailable&viewMode=story&globals=colorScheme:dark",
  );
  await expect(
    card(page, "Example role").getByRole("textbox", {
      name: "Category name",
      exact: true,
    }),
  ).toHaveAttribute("readonly", "");
  await expect(
    page.getByRole("button", {
      name: /^(Add term|Reorder Example|Delete Example)/,
    }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const board = page.getByRole("grid", {
    name: "Registry category order",
    exact: true,
  });
  expect(
    await board.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Open Registry example term", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Reference information is unavailable.",
  );
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("registry-term-narrow-dark.png"),
    animations: "disabled",
  });
});
