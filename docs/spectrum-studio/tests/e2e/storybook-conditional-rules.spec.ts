// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("logic buttons toggle with pointer and keyboard and respect editing locks", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-conditional-rule-builder--simple&viewMode=story",
  );
  const root = page.getByRole("group", {
    name: "Shared conditions",
    exact: true,
  });
  const button = root.getByRole("button", {
    name: /Shared conditions operator/,
  });
  await expect(button).toHaveText("And");
  const blue = await button.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  await button.click();
  await expect(button).toHaveText("Or");
  const fuchsia = await button.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  expect(fuchsia).not.toBe(blue);
  await button.press("Space");
  await expect(button).toHaveText("And");
  await button.press("Enter");
  await expect(button).toHaveText("Or");
  await expect(button).toBeFocused();
  await root
    .getByRole("button", { name: "Edit Attribute is Background" })
    .click();
  await expect(button).toBeDisabled();
  await expect(button).toHaveText("Or");
  await root
    .getByRole("group", { name: "Edit statement" })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(button).toBeEnabled();
  await expect(button).toHaveText("Or");
  expect(errors).toEqual([]);
});

test("inline Save/Cancel and single-row editing preserve keyboard focus", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-conditional-rule-builder--interaction-state-colors&viewMode=story",
  );
  await expect(page.locator('[data-play-complete="true"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("nested groups and source menus work at root and nested scopes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-conditional-rule-builder--simple&viewMode=story",
  );
  const root = page.getByRole("group", {
    name: "Shared conditions",
    exact: true,
  });
  await root.getByRole("button", { name: "Add group", exact: true }).click();
  const group = root.getByRole("group", {
    name: "Condition group",
    exact: true,
  });
  const nestedLogic = group.getByRole("button", {
    name: /Condition group operator/,
  });
  await nestedLogic.click();
  await expect(nestedLogic).toHaveText("Or");
  await expect(group).toHaveAttribute("data-operator", "or");
  await group
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  await expect(
    page
      .getByRole("menuitem", { name: "Mode set", exact: true })
      .locator('[data-category="modes"][data-category-icon="Filters"]'),
  ).toBeVisible();
  await expect(
    page
      .getByRole("menuitem", { name: "Token category", exact: true })
      .locator('[data-category="tokens"][data-category-icon="Channel"]'),
  ).toBeVisible();
  await page.getByRole("menuitem", { name: "Mode set", exact: true }).hover();
  const colorScheme = page.getByRole("menuitem", {
    name: "Color scheme",
    exact: true,
  });
  await expect(colorScheme).toHaveAttribute("data-mode-icon", "light");
  await expect(colorScheme.locator("svg")).toBeVisible();
  const contrast = page.getByRole("menuitem", {
    name: "Contrast",
    exact: true,
  });
  await expect(contrast).toHaveAttribute("data-mode-icon", "contrast");
  await expect(contrast.locator("svg")).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("condition-mode-menu.png"),
    animations: "disabled",
  });
  await page
    .getByRole("menuitem", { name: "Color scheme", exact: true })
    .click();
  const editor = group.getByRole("group", { name: "Edit statement" });
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: /Value/ }).click();
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(group.getByText("Dark", { exact: false })).toBeVisible();
  await group
    .getByRole("button", { name: "Delete Color scheme is Dark" })
    .click();
  await expect(
    group.getByRole("button", { name: "Add condition", exact: true }),
  ).toBeVisible();
  await expect(
    group.getByRole("button", { name: "Condition group operator" }),
  ).toBeFocused();
  await group.getByRole("button", { name: "Delete condition group" }).click();
  await expect(
    root.getByRole("button", { name: "Shared conditions operator" }),
  ).toBeFocused();
  await root
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Token category", exact: true })
    .hover();
  await expect(
    page
      .getByRole("menu", { name: "Token category", exact: true })
      .locator("svg"),
  ).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Visibility", exact: true }).click();
  const rootEditor = root.getByRole("group", { name: "Edit statement" });
  await rootEditor.getByRole("button", { name: /Value/ }).click();
  await page.getByRole("option", { name: "Emphasized", exact: true }).click();
  await rootEditor.getByRole("button", { name: "Save", exact: true }).click();
  await root
    .getByRole("button", { name: "Edit Visibility is Emphasized" })
    .click();
  await rootEditor.getByRole("button", { name: /Source/ }).click();
  await page.getByRole("listbox", { name: "Source", exact: true }).press("End");
  await page.getByRole("option", { name: "Color scheme", exact: true }).click();
  await expect(
    rootEditor.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
  await rootEditor.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    root.getByRole("button", { name: "Edit Visibility is Emphasized" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Add branch", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "Branch 1 conditions", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete branch 1", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Results", exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("read-only, missing references, themes and narrow layouts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const scheme of ["light", "dark"]) {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(
      `/iframe.html?id=components-conditional-rule-builder--long-names&viewMode=story&globals=colorScheme:${scheme}`,
    );
    const builder = page.locator('[data-component="ConditionalRuleBuilder"]');
    await expect(builder).toBeVisible();
    expect(
      await builder.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    for (const logicButton of await builder
      .locator('button[data-component="LogicButton"]')
      .all()) {
      expect(
        await logicButton.evaluate((node) => {
          const css = getComputedStyle(node);
          const luminance = (color: string) => {
            const channels = color
              .match(/[\d.]+/g)!
              .slice(0, 3)
              .map(Number)
              .map((value) => {
                const channel = value / 255;
                return channel <= 0.04045
                  ? channel / 12.92
                  : ((channel + 0.055) / 1.055) ** 2.4;
              });
            return (
              channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
            );
          };
          const foreground = luminance(css.color);
          const background = luminance(css.backgroundColor);
          return (
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05)
          );
        }),
      ).toBeGreaterThanOrEqual(4.5);
      expect((await logicButton.boundingBox())!.height).toBe(24);
      expect((await logicButton.boundingBox())!.width).toBeLessThan(60);
    }
    for (const rail of await builder
      .locator(".conditional-rule-children")
      .all()) {
      expect(
        await rail.evaluate((node) => {
          const css = getComputedStyle(node);
          return css.borderInlineStartColor !== css.color;
        }),
      ).toBe(true);
    }
    await page.screenshot({
      path: test.info().outputPath(`conditional-builder-${scheme}-narrow.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.goto(
    "/iframe.html?id=components-conditional-rule-builder--read-only&viewMode=story",
  );
  await expect(
    page.getByRole("button", {
      name: /Edit|Delete|Add condition|Add group|Add branch/,
    }),
  ).toHaveCount(0);
  await expect(page.locator('[data-component="LogicButton"]')).toHaveCount(3);
  await expect(
    page.locator('button[data-component="LogicButton"]'),
  ).toHaveCount(0);
  await page.goto(
    "/iframe.html?id=components-conditional-rule-builder--unavailable-reference&viewMode=story",
  );
  await expect(
    page.getByText("Unavailable source", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
