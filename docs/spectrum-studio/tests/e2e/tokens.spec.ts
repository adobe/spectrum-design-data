// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    )
      errors.push(message.text().split("\n").slice(0, 5).join("\n"));
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function edit(page: Page) {
  const enter = page.getByRole("button", { name: "Edit", exact: true });
  if (await enter.isVisible()) await enter.click();
  if (await page.locator('[data-component="ChangelogPanel"]').isVisible())
    await page.getByRole("button", { name: /^Change log/ }).click();
}

function tokenRow(page: Page, name: string) {
  return page
    .getByRole("treegrid", { name: "Tokens", exact: true })
    .getByRole("row")
    .and(page.locator(`[data-token-name=${JSON.stringify(name)}]`));
}

for (const foundation of [
  {
    tab: "Colors",
    type: "Colors",
    scale: "Red",
    token: "red-500",
    key: "color",
  },
  {
    tab: "Spacing",
    type: "Spacing",
    scale: "Global spacing scale",
    token: "global-100",
    key: "spacing",
  },
  {
    tab: "Size",
    type: "Size",
    scale: "Global size scale",
    token: "global-100",
    key: "size",
  },
]) {
  test(`${foundation.tab} publishing visibility updates tokens and survives reload`, async ({
    page,
  }) => {
    await edit(page);
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .click();
    await page.getByRole("tab", { name: foundation.tab, exact: true }).click();
    if (foundation.key === "color")
      await page
        .getByRole("tabpanel", { name: "Colors", exact: true })
        .getByRole("button", { name: foundation.scale, exact: true })
        .click();
    const visibility = (
      foundation.key === "color"
        ? page.getByRole("dialog")
        : page.getByRole("region", { name: foundation.scale, exact: true })
    ).getByRole("checkbox", { name: "Hide from publishing", exact: true });
    await visibility.press("Space");
    await expect(visibility).toBeChecked();
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(`leonardo:v1:foundations/${key}`),
        foundation.key,
      ),
    ).toBeNull();
    if (foundation.key === "color") await page.keyboard.press("Escape");
    if (foundation.key === "color") {
      await page.getByRole("radio", { name: "Elements", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Color ramps", exact: true }),
      ).toBeVisible();
    }
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Tokens", exact: true })
      .click();
    await page
      .getByRole("radio", { name: foundation.type, exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "Search tokens" })
      .fill(foundation.token);
    await expect(
      page.getByRole("button", {
        name: `Open ${foundation.token}`,
        exact: true,
      }),
    ).toHaveCount(0);
    await page.reload();
    await edit(page);
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .click();
    await page.getByRole("tab", { name: foundation.tab, exact: true }).click();
    if (foundation.key === "color")
      await page
        .getByRole("tabpanel", { name: "Colors", exact: true })
        .getByRole("button", { name: foundation.scale, exact: true })
        .click();
    await expect(visibility).toBeChecked();
    await visibility.press("Space");
    await expect(visibility).not.toBeChecked();
    if (foundation.key === "color") await page.keyboard.press("Escape");
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Tokens", exact: true })
      .click();
    await page
      .getByRole("radio", { name: foundation.type, exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "Search tokens" })
      .fill(foundation.token);
    await expect(
      page.getByRole("button", {
        name: `Open ${foundation.token}`,
        exact: true,
      }),
    ).toBeVisible();
  });
}

test("search, type filters, hierarchy, and read-only details share one collection", async ({
  page,
}) => {
  const table = page.getByRole("treegrid", { name: "Tokens", exact: true });
  await expect(table).toBeVisible();
  await expect(table.getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search tokens" }).fill("red 500");
  await expect(tokenRow(page, "red-500")).toBeVisible();
  await expect(tokenRow(page, "silver-100")).toHaveCount(0);
  await page.getByRole("button", { name: "Open red-500", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveAttribute("readonly", "");
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search tokens" }).fill("");
  for (const type of ["Corner radius", "Elevation", "Motion"]) {
    await page.getByRole("radio", { name: type, exact: true }).click();
    await expect(table).toContainText("are available yet");
  }
  await page.getByRole("radio", { name: "Size", exact: true }).click();
  await expect(table).toContainText("global-100");
  await page.getByRole("radio", { name: "Typography", exact: true }).click();
  await expect(table).toContainText("font-size-100");
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  await expect(table).toContainText("global-100");
  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("no-such-token");
  await expect(table).toContainText('No tokens match "no-such-token"');
});

test("details validate current-page value edits and support Cancel and reload", async ({
  page,
}) => {
  await edit(page);
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  await page
    .getByRole("button", { name: "Open global-100", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Value", exact: true })
    .fill("invalid");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("non-negative");
  await dialog.getByRole("textbox", { name: "Value", exact: true }).fill("17");
  await expect(
    dialog.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveAttribute("readonly", "");
  await expect(dialog).toContainText(
    "Names, types and steps come from the foundation",
  );
  await expect(
    dialog.getByRole("button", { name: /Foundation scale/ }),
  ).toHaveCount(0);
  await dialog
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Custom gap");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(tokenRow(page, "global-100")).toContainText("17px");
  await expect(tokenRow(page, "global-100")).toContainText("Custom gap");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("leonardo:v1:tokens/browser/edits"),
    ),
  ).toBeNull();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect(tokenRow(page, "global-100")).not.toContainText("Custom gap");
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  await expect(tokenRow(page, "global-100")).toBeVisible();
});

test("selection crosses views and bulk deprecation requires confirmation", async ({
  page,
}) => {
  await edit(page);
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  const row = tokenRow(page, "global-100");
  await row.locator("label").click();
  await expect(
    page.getByRole("button", { name: "Bulk edit", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Grid view", exact: true }).click();
  await expect(
    page.getByRole("main").getByRole("checkbox", { checked: true }),
  ).toHaveCount(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Bulk edit", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Status", { exact: true }).click();
  await page.getByRole("option", { name: "Deprecated", exact: true }).click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toContainText("saved tokens");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog.getByRole("heading")).toContainText("Bulk edit");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Deprecate", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("radio", { name: "List view", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search tokens" }).fill("100");
  await expect(row).toContainText("Deprecated");
  await expect(
    page.getByRole("button", { name: "Bulk edit", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("radio", { name: "Grid view", exact: true }).click();
  await page.getByRole("row", { name: /^global-100\s/ }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("global-100");
});

test("bulk replacement values validate atomically and mixed selections disable values", async ({
  page,
}) => {
  await edit(page);
  await page
    .getByRole("treegrid", { name: "Tokens", exact: true })
    .getByRole("columnheader")
    .first()
    .locator("label")
    .click();
  await page
    .getByRole("toolbar", { name: "Actions" })
    .evaluate(async (toolbar) => {
      for (
        let element: Element | null = toolbar;
        element;
        element = element.parentElement
      )
        await Promise.all(
          element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => {})),
        );
    });
  await page.getByRole("button", { name: "Bulk edit", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Replacement value" }),
  ).toHaveAttribute("readonly", "");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search tokens" }).fill("");
  for (const name of ["global-100", "global-200"])
    await tokenRow(page, name).locator("label").click();
  await page.getByRole("button", { name: "Bulk edit", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Replacement value" })
    .fill("23");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  for (const name of ["global-100", "global-200"])
    await expect(tokenRow(page, name)).toContainText("23px");
});

for (const width of [1440, 390]) {
  test(`compact token paths are unique, unindented and term-only at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByRole("searchbox", { name: "Search tokens" })
      .fill("illustrator-orange-color");
    const table = page.getByRole("treegrid", { name: "Tokens", exact: true });
    const row = tokenRow(page, "illustrator-orange-color");
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(row).toHaveAttribute("aria-level", "1");
    await expect(row.getByRole("rowheader")).toHaveText(
      "Illustrator Orange color",
    );
    await expect(row.getByRole("rowheader")).toHaveCSS("padding-left", "16px");
    await expect(
      row.getByRole("button", { name: /Expand|Collapse/ }),
    ).toHaveCount(0);
    await expect(table).not.toContainText("Color name:");
    await expect(table).not.toContainText("Property:");
    await page.getByRole("radio", { name: "Grid view" }).click();
    await expect(
      page.getByRole("heading", { name: "Illustrator Orange", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".tokenCardSection h2")).not.toContainText(
      "Color name:",
    );
  });
}

test("cascading parent selection includes collapsed children and stays mixed across views", async ({
  page,
}) => {
  await edit(page);
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  const parentCheckbox = page.getByRole("checkbox", {
    name: "Select Spacing",
    exact: true,
  });
  const parent = page.getByRole("row").filter({ has: parentCheckbox });
  const first = tokenRow(page, "spacing-100").getByRole("checkbox");
  const count = Number(
    (await page.locator(".tokenBrowserSummary").innerText()).match(
      /^(\d+)/,
    )![1],
  );
  await first.press("Space");
  await expect(first).toBeChecked();
  await expect(page.locator(".tokenBrowserSummary")).toContainText(
    "1 selected",
  );
  await expect(first).toBeFocused();
  await page.keyboard.press("Space");
  await expect(first).not.toBeChecked();
  await expect(page.locator(".tokenBrowserSummary")).not.toContainText(
    "selected",
  );
  await page.keyboard.press("Space");
  await expect(parentCheckbox).toBeChecked({ indeterminate: true });
  await parentCheckbox.press("Space");
  await expect(parentCheckbox).toBeChecked();
  await expect(page.locator(".tokenBrowserSummary")).toContainText(
    `${count} selected`,
  );
  await parent.getByRole("button", { name: /Collapse/ }).click();
  await expect(first).toHaveCount(0);
  await parentCheckbox.press("Space");
  await expect(parentCheckbox).not.toBeChecked();
  await expect(page.locator(".tokenBrowserSummary")).not.toContainText(
    "selected",
  );
  await parentCheckbox.press("Space");
  await expect(page.locator(".tokenBrowserSummary")).toContainText(
    `${count} selected`,
  );
  await page.getByRole("radio", { name: "Grid view" }).click();
  await expect(page.locator(".tokenBrowserSummary")).toContainText(
    `${count} selected`,
  );
  await expect(
    page.getByRole("main").getByRole("checkbox", { checked: false }),
  ).toHaveCount(0);
  await page.getByRole("radio", { name: "List view" }).click();
  await expect(parentCheckbox).toBeChecked();
  await expect(first).toHaveCount(0);
});

test("cascading selection respects matching tokens and preserves details and bulk editing", async ({
  page,
}) => {
  await edit(page);
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search tokens" }).fill("100");
  const table = page.getByRole("treegrid", { name: "Tokens", exact: true });
  const selectAll = table.getByRole("checkbox", {
    name: "Select all",
    exact: true,
  });
  const selectionColumn = table.getByRole("columnheader").filter({
    has: page.getByRole("checkbox", { name: "Select all", exact: true }),
  });
  await expect(selectionColumn).toHaveCSS("padding-left", "16px");
  await expect(selectionColumn).toHaveCSS("padding-right", "8px");
  await selectAll.focus();
  await expect(page.locator(".tokenBrowserSummary")).not.toContainText(
    "selected",
  );
  await page.keyboard.press("Space");
  const count = Number(
    (await page.locator(".tokenBrowserSummary").innerText()).match(
      /^(\d+)/,
    )![1],
  );
  await expect(page.locator(".tokenBrowserSummary")).toContainText(
    `${count} selected`,
  );
  await page.getByRole("button", { name: "Bulk edit", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Replacement value" })
    .fill("23");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(tokenRow(page, "spacing-100")).toContainText("23px");
  await page.getByRole("searchbox", { name: "Search tokens" }).fill("");
  await expect(page.locator(".tokenBrowserSummary")).not.toContainText(
    "selected",
  );
  await expect(tokenRow(page, "spacing-200")).not.toContainText("23px");
  await page.locator(".tokenCollectionScroll").evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await page
    .getByRole("button", { name: "Open spacing-100", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("spacing-100");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Value", exact: true }),
  ).toHaveValue("23px");
});

test("native row keyboard selection uses distinct token counts", async ({
  page,
}) => {
  await edit(page);
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  const first = tokenRow(page, "spacing-100");
  const second = tokenRow(page, "spacing-200");
  const count = Number(
    (await page.locator(".tokenBrowserSummary").innerText()).match(
      /^(\d+)/,
    )![1],
  );
  await first.getByRole("rowheader").focus();
  await expect(page.locator(".tokenBrowserSummary")).not.toContainText(
    "selected",
  );
  await page.keyboard.press("Space");
  await expect(first).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".tokenBrowserSummary")).toContainText(
    "1 selected",
  );
  await page.keyboard.press("Shift+ArrowDown");
  await expect(second).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".tokenBrowserSummary")).toContainText(
    "2 selected",
  );
  await page.keyboard.press("ControlOrMeta+A");
  await expect(page.locator(".tokenBrowserSummary")).toContainText(
    `${count} selected`,
  );
});

for (const width of [1440, 390]) {
  test(`token descriptions stay on one line with full hover text at ${width}px`, async ({
    page,
  }) => {
    const description = `${"A lengthy token description with all its original details. ".repeat(20)}\nA final line that must remain available on hover.`;
    await page.setViewportSize({ width, height: 900 });
    if (width === 390)
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
    await edit(page);
    await page
      .getByRole("searchbox", { name: "Search tokens" })
      .fill("text-size-100");
    await page.locator(".tokenCollectionScroll").evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await page
      .getByRole("button", { name: "Open text-size-100", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Description", exact: true })
      .fill(description);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save", exact: true })
      .click();
    const cell = tokenRow(page, "text-size-100").locator(".tokenDescription");
    await expect(cell).toBeVisible();
    await expect(cell).toContainText(description);
    await expect(cell).toHaveCSS("white-space", "nowrap");
    await expect(cell).toHaveCSS("text-overflow", "ellipsis");
    await expect(cell).toHaveCSS("overflow", "hidden");
    expect(
      await cell.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    ).toBe(true);
    const lineTops = await cell.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return [...range.getClientRects()].map((rect) => rect.top);
    });
    expect(new Set(lineTops).size).toBe(1);
    const fullText = await cell.evaluate(
      (element) => element.textContent ?? "",
    );
    expect(fullText).toContain(description);
    await cell.hover();
    await expect(cell).toHaveAttribute("title", fullText);
    await page
      .getByRole("button", { name: "Open text-size-100", exact: true })
      .click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("textbox", { name: "Description", exact: true }),
    ).toHaveValue(description);
  });
}
