// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("sub panel resizes by pointer and keyboard within its limits", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");

  const panel = page.locator("[data-component=SubPanel]");
  const resizer = page.getByRole("separator", { name: "Resize panel" });
  // The 1px end border sits outside the content width.
  const width = async () => Math.round((await panel.boundingBox())!.width) - 1;
  await expect(resizer).toHaveAttribute("aria-valuenow", "360");
  expect(await width()).toBe(360);

  const handle = (await resizer.boundingBox())!;
  const y = handle.y + handle.height / 2;
  await page.mouse.move(handle.x + handle.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 120, y, { steps: 5 });
  await page.mouse.up();
  expect(await width()).toBe(480);

  await resizer.focus();
  await page.keyboard.press("ArrowLeft");
  expect(await width()).toBe(464);

  await page.keyboard.press("Home");
  expect(await width()).toBe(300);
  await page.keyboard.press("ArrowLeft");
  expect(await width()).toBe(300);

  await page.keyboard.press("End");
  const container = (await page.locator(".pageWithSubPanel").boundingBox())!;
  expect(await width()).toBe(Math.round(container.width - 300));
  await page.keyboard.press("ArrowRight");
  expect(await width()).toBe(Math.round(container.width - 300));

  await resizer.dblclick();
  expect(await width()).toBe(360);

  expect(errors).toEqual([]);
});
