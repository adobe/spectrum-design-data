// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

for (const width of [1600, 320]) {
  test(`generic scale editor fits its popover at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto(
      "/iframe.html?id=components-scale-editor--narrow-long-name&viewMode=story",
    );
    const trigger = page.getByRole("button", { name: / spacing scale$/ });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: / spacing scale$/ });
    await expect(dialog).toBeVisible();
    await expect
      .poll(async () =>
        dialog.evaluate((element) => {
          const wrapper = element.parentElement!;
          const bounds = element.getBoundingClientRect();
          return {
            dialogOverflow: Math.max(
              0,
              element.scrollWidth - element.clientWidth,
            ),
            wrapperOverflow: Math.max(
              0,
              wrapper.scrollWidth - wrapper.clientWidth,
            ),
            outsideViewport:
              bounds.left < -1 || bounds.right > window.innerWidth + 1,
          };
        }),
      )
      .toEqual({
        dialogOverflow: 0,
        wrapperOverflow: 0,
        outsideViewport: false,
      });
    const name = dialog.getByRole("textbox", {
      name: "Scale name",
      exact: true,
    });
    await name.fill("Compact");
    await expect(trigger).toHaveAccessibleName("Compact spacing scale");
    expect(errors).toEqual([]);
  });
}
