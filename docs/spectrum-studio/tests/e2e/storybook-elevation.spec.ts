// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
for (const theme of ["light", "dark"])
  for (const width of [1280, 480])
    test(`Elevation stories render in ${theme} at ${width}px without page errors`, async ({
      page,
    }, info) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      for (const story of [
        "panels-elevation-editor--default",
        "panels-elevation-editor--maximum",
        "panels-elevation-editor--empty",
        "panels-elevation-editor--read-only",
        "panels-elevation-editor--invalid",
        "panels-elevation-editor--mode-owned",
        "views-elevation-sample--layered",
        "views-elevation-sample--zero-depth",
        "views-elevation-sample--transparent",
        "views-elevation-comparison--default",
        "views-elevation-comparison--invalid",
        "views-elevation-comparison--multiple-layers",
      ]) {
        await page.goto(
          `/iframe.html?id=${story}&viewMode=story&globals=colorScheme:${theme}`,
        );
        await expect(page.locator("#storybook-root > *")).not.toHaveCount(0);
        await expect(page.locator("#storybook-root")).toBeVisible();
        await expect(page.locator("#storybook-root")).not.toContainText(
          "Couldn't find story",
        );
        if (story === "panels-elevation-editor--default")
          await expect(
            page.getByRole("button", { name: "Delete Shadow 2" }),
          ).toBeVisible();
        if (story === "views-elevation-comparison--default")
          await expect(page.getByRole("table")).toBeVisible();
        if (
          story === "views-elevation-comparison--default" &&
          theme === "dark"
        ) {
          expect(
            await page
              .getByRole("table")
              .evaluate((element) => getComputedStyle(element).color),
          ).not.toBe("rgb(0, 0, 0)");
        }
        if (story === "panels-elevation-editor--read-only")
          await expect(
            page.getByRole("button", { name: "Add shadow" }),
          ).toHaveCount(0);
        if (story === "panels-elevation-editor--maximum")
          await expect(
            page.getByRole("button", { name: "Add shadow" }),
          ).toBeDisabled();
        if (story === "panels-elevation-editor--mode-owned")
          await expect(
            page.getByRole("textbox", { name: "Opacity (%)" }),
          ).toHaveCount(0);
        if (story === "views-elevation-comparison--invalid")
          await expect(page.getByRole("alert")).toContainText("Depth");
        await page.locator("#storybook-root").screenshot({
          path: info.outputPath(`${story}-${theme}-${width}.png`),
        });
      }
      expect(errors).toEqual([]);
    });

test("each shadow has its own nested accordion and retains its expansion through edits", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=panels-elevation-editor--default&viewMode=story",
  );
  const editor = page.locator('[data-component="ElevationEditor"]');
  const accordions = editor.locator('[data-component="NestedPanelAccordion"]');
  await expect(
    editor.getByRole("button", { name: "Delete Shadow 2", exact: true }),
  ).toBeVisible();
  await expect(accordions).toHaveCount(2);
  for (const [index, label] of ["Shadow 1", "Shadow 2"].entries()) {
    await expect(
      accordions.nth(index).getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(
      accordions
        .nth(index)
        .getByRole("textbox", { name: "Shadow name", exact: true }),
    ).toHaveValue(label);
  }
  await accordions
    .first()
    .getByRole("button", { name: "Shadow 1", exact: true })
    .press("Enter");
  await expect(
    accordions.first().getByRole("button", { name: "Shadow 1", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    accordions
      .last()
      .getByRole("textbox", { name: "Shadow name", exact: true }),
  ).toHaveValue("Shadow 2");
  await editor
    .getByRole("button", { name: "Move Shadow 2 up", exact: true })
    .click();
  await expect(
    accordions.first().getByRole("button", { name: "Shadow 2", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    accordions.last().getByRole("button", { name: "Shadow 1", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  const name = accordions
    .first()
    .getByRole("textbox", { name: "Shadow name", exact: true });
  await name.fill("Ambient");
  await name.press("Tab");
  await expect(
    accordions.first().getByRole("button", { name: "Ambient", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await editor.getByRole("button", { name: "Add shadow", exact: true }).click();
  await expect(accordions).toHaveCount(3);
  await expect(
    accordions.last().getByRole("button", { name: "Shadow 3", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    accordions
      .last()
      .getByRole("textbox", { name: "Shadow name", exact: true }),
  ).toHaveValue("Shadow 3");
  await editor
    .getByRole("button", { name: "Delete Ambient", exact: true })
    .click();
  await expect(accordions).toHaveCount(2);
  await expect(
    accordions.first().getByRole("button", { name: "Shadow 1", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    accordions.last().getByRole("button", { name: "Shadow 3", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  expect(errors).toEqual([]);
});

test("Elevation analysis shows all shadows for every metric and compared mode", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=views-elevation-comparison--multiple-layers&viewMode=story",
  );
  const chart = page.locator('[data-component="ElevationComparison"]');
  await expect(
    chart.getByRole("img", { name: "Elevation comparison", exact: true }),
  ).toBeVisible();
  await expect(chart.getByRole("button", { name: /Shadows$/ })).toHaveCount(0);
  await chart.getByRole("button", { name: "Show values", exact: true }).click();
  const table = chart.getByRole("table", {
    name: "Elevation comparison values",
    exact: true,
  });
  for (const metric of ["Blur", "Vertical offset", "Opacity"]) {
    await chart.getByRole("button", { name: /Metric$/ }).click();
    await page.getByRole("option", { name: metric, exact: true }).click();
    await expect(chart.locator("polyline")).toHaveCount(2);
    for (const shadow of ["Shadow 1", "Ambient"]) {
      await expect(
        table.getByRole("rowheader", {
          name: `${shadow} - Current modes`,
          exact: true,
        }),
      ).toHaveCount(3);
    }
  }
  await chart
    .getByRole("checkbox", { name: "Compare named modes", exact: true })
    .press("Space");
  await chart.getByRole("button", { name: /Modes$/ }).click();
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(chart.locator("polyline")).toHaveCount(4);
  for (const shadow of ["Shadow 1", "Ambient"]) {
    for (const mode of ["Light", "Dark"]) {
      await expect(
        table.getByRole("rowheader", {
          name: `${shadow} - ${mode}`,
          exact: true,
        }),
      ).toHaveCount(3);
    }
  }
  expect(errors).toEqual([]);
});
