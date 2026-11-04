// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("Modes uses a centered 1600 px layout that fits smaller screens", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Modes\b/ })
    .click();

  const content = page.locator('[data-component="Modes"] > div');
  await expect(
    content.getByRole("heading", { name: "Modes", exact: true }),
  ).toBeVisible();
  for (const width of [2400, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () =>
        content.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const parent = element.parentElement!;
          const parentBounds = parent.getBoundingClientRect();
          const parentStyles = getComputedStyle(parent);
          const availableWidth =
            parent.clientWidth -
            parseFloat(parentStyles.paddingLeft) -
            parseFloat(parentStyles.paddingRight);
          const availableLeft =
            parentBounds.left +
            parent.clientLeft +
            parseFloat(parentStyles.paddingLeft);
          const expectedWidth = Math.min(1600, availableWidth);
          return {
            widthDifference: Math.round(bounds.width - expectedWidth),
            centered:
              Math.abs(
                bounds.left -
                  availableLeft -
                  (availableWidth - bounds.width) / 2,
              ) < 1,
            noHorizontalOverflow: parent.scrollWidth === parent.clientWidth,
          };
        }),
      )
      .toEqual({
        widthDifference: 0,
        centered: true,
        noHorizontalOverflow: true,
      });
  }
  expect(errors).toEqual([]);
});

test("mode card previews fill the padded column and color samples keep vertical padding", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Modes\b/ })
    .click();

  const cards = page.locator('[data-component="ModeSetCard"]');
  await expect(cards.first()).toBeVisible();
  let colorRows = 0;
  for (const card of await cards.all()) {
    const preview = card.locator('[aria-label$=" previews"]');
    await expect(preview).toBeVisible();
    const initialHeight = await card.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    for (const extraHeight of [120, 240]) {
      await card.evaluate((element, height) => {
        element.style.minHeight = `${height}px`;
      }, initialHeight + extraHeight);
      const layout = await preview.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const styles = getComputedStyle(element);
        const content = element.firstElementChild!;
        const contentStyles = getComputedStyle(content);
        const rows = Array.from(content.children).map((row) => {
          const rowBounds = row.getBoundingClientRect();
          return {
            top: rowBounds.top - bounds.top,
            bottom: rowBounds.bottom - bounds.top,
            height: rowBounds.height,
            left: rowBounds.left - bounds.left,
            right: bounds.right - rowBounds.right,
            borderRadius: getComputedStyle(row).borderRadius,
            swatches: Array.from(
              row.querySelectorAll<HTMLElement>("span[style]"),
            )
              .filter((swatch) => swatch.style.backgroundColor)
              .map((swatch) => {
                const swatchBounds = swatch.getBoundingClientRect();
                return {
                  height: swatchBounds.height,
                  left: swatchBounds.left,
                  right: swatchBounds.right,
                  top: swatchBounds.top - rowBounds.top,
                  bottom: rowBounds.bottom - swatchBounds.bottom,
                  borderRadius: getComputedStyle(swatch).borderRadius,
                };
              }),
          };
        });
        return {
          height: bounds.height,
          corners: [
            contentStyles.borderTopLeftRadius,
            contentStyles.borderTopRightRadius,
            contentStyles.borderBottomRightRadius,
            contentStyles.borderBottomLeftRadius,
          ],
          overflow: contentStyles.overflow,
          borders: [
            styles.borderTopWidth,
            styles.borderRightWidth,
            styles.borderBottomWidth,
            styles.borderLeftWidth,
          ],
          paddingTop: parseFloat(styles.paddingTop),
          paddingBottom: parseFloat(styles.paddingBottom),
          paddingLeft: parseFloat(styles.paddingLeft),
          paddingRight: parseFloat(styles.paddingRight),
          gap: styles.rowGap === "normal" ? 0 : parseFloat(styles.rowGap),
          rows,
        };
      });

      expect(layout.paddingTop).toBe(8);
      expect(layout.corners).toEqual(["8px", "0px", "0px", "8px"]);
      expect(layout.overflow).toBe("hidden");
      expect(layout.borders).toEqual(["0px", "0px", "0px", "0px"]);
      expect(layout.paddingBottom).toBe(8);
      expect(layout.paddingLeft).toBe(8);
      expect(layout.paddingRight).toBe(0);
      expect(layout.gap).toBe(0);
      expect(layout.rows.length).toBeGreaterThan(0);
      const expectedRowHeight =
        (layout.height -
          layout.paddingTop -
          layout.paddingBottom -
          layout.gap * (layout.rows.length - 1)) /
        layout.rows.length;
      expect(layout.rows[0].top).toBeCloseTo(layout.paddingTop, 0);
      expect(layout.rows.at(-1)!.bottom).toBeCloseTo(
        layout.height - layout.paddingBottom,
        0,
      );
      for (const [index, row] of layout.rows.entries()) {
        expect(row.height).toBeCloseTo(expectedRowHeight, 0);
        expect(row.left).toBeCloseTo(8, 0);
        expect(row.right).toBeCloseTo(0, 0);
        expect(row.borderRadius).toBe("0px");
        if (index > 0) {
          expect(row.top - layout.rows[index - 1].bottom).toBeCloseTo(
            layout.gap,
            0,
          );
        }
        if (row.swatches.length > 0) colorRows += 1;
        for (const [swatchIndex, swatch] of row.swatches.entries()) {
          expect(swatch.top).toBeCloseTo(8, 0);
          expect(swatch.bottom).toBeCloseTo(8, 0);
          expect(swatch.height).toBeCloseTo(row.height - 16, 0);
          expect(swatch.borderRadius).toBe("0px");
          if (swatchIndex > 0) {
            expect(swatch.left).toBeCloseTo(
              row.swatches[swatchIndex - 1].right,
              0,
            );
          }
        }
      }
    }
  }
  expect(colorRows).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
