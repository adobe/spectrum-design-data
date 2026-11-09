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
            width: rowBounds.width,
            screenLeft: rowBounds.left,
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
                  width: swatchBounds.width,
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
          const swatchWidth = (row.width - 16) / row.swatches.length;
          expect(swatch.width).toBeCloseTo(swatchWidth, 0);
          expect(swatch.left).toBeCloseTo(
            row.screenLeft + 8 + swatchIndex * swatchWidth,
            0,
          );
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

test("individual modes use full-height previews in three equal columns and stack on small screens", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 2400, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Modes\b/ })
    .click();

  for (const name of ["Color scheme", "Adaptive text scaling"]) {
    await page
      .getByRole("button", { name: `Open mode set ${name}`, exact: true })
      .click();
    const cards = page.locator('[data-component="ModeCard"]');
    await expect(cards.first()).toBeVisible();
    for (const card of await cards.all()) {
      const height = await card.evaluate(
        (element) => element.getBoundingClientRect().height,
      );
      await card.evaluate((element, height) => {
        element.style.minHeight = `${height + 120}px`;
      }, height);
      await expect
        .poll(() =>
          card.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const columns = Array.from(element.children).map((child) =>
              child.getBoundingClientRect(),
            );
            const preview = element.querySelector('[aria-label$=" previews"]')!;
            const previewBounds = preview.getBoundingClientRect();
            const rows = Array.from(preview.firstElementChild!.children);
            const rowBounds = rows.map((row) => row.getBoundingClientRect());
            return {
              columns: columns.length,
              equalWidths: columns.every(
                (column) => Math.abs(column.width - bounds.width / 3) < 1,
              ),
              sameTop: columns.every(
                (column) => Math.abs(column.top - bounds.top) < 1,
              ),
              leftPreview: Math.abs(previewBounds.left - bounds.left) < 1,
              previewFillsColumn:
                Math.abs(previewBounds.width - columns[0].width) < 1 &&
                Math.abs(previewBounds.height - bounds.height) < 1,
              rowsFillPreview:
                rowBounds.length > 0 &&
                Math.abs(rowBounds[0].top - previewBounds.top - 8) < 1 &&
                Math.abs(previewBounds.bottom - rowBounds.at(-1)!.bottom - 8) <
                  1,
              swatchesFillRows: rows.every((row, rowIndex) => {
                const swatches = Array.from(
                  row.querySelectorAll<HTMLElement>("span[style]"),
                ).filter((swatch) => swatch.style.backgroundColor);
                return swatches.every((swatch, index) => {
                  const sample = swatch.getBoundingClientRect();
                  return (
                    Math.abs(
                      sample.height - (rowBounds[rowIndex].height - 16),
                    ) < 1 &&
                    Math.abs(
                      sample.width -
                        rowBounds[rowIndex].width / swatches.length,
                    ) < 1 &&
                    Math.abs(
                      sample.left -
                        rowBounds[rowIndex].left -
                        index * sample.width,
                    ) < 1
                  );
                });
              }),
            };
          }),
        )
        .toEqual({
          columns: 3,
          equalWidths: true,
          sameTop: true,
          leftPreview: true,
          previewFillsColumn: true,
          rowsFillPreview: true,
          swatchesFillRows: true,
        });
      await card.evaluate((element) =>
        element.style.removeProperty("min-height"),
      );
    }

    for (const width of [1200, 800]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const card of await cards.all()) {
        await expect
          .poll(() =>
            card.evaluate((element) => {
              const bounds = element.getBoundingClientRect();
              const columns = Array.from(element.children).map((child) =>
                child.getBoundingClientRect(),
              );
              return {
                fullWidth: columns.every(
                  (column) => Math.abs(column.width - bounds.width) < 1,
                ),
                stacked: columns
                  .slice(1)
                  .every(
                    (column, index) => column.top >= columns[index].bottom - 1,
                  ),
                previewVisible: columns[0].height >= 120,
                noOverflow: element.scrollWidth <= element.clientWidth + 1,
              };
            }),
          )
          .toEqual({
            fullWidth: true,
            stacked: true,
            previewVisible: true,
            noOverflow: true,
          });
      }
      const content = page.locator('[data-component="ModeSetEditorLayout"]');
      expect(
        await content.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
    }
    await page
      .getByRole("button", { name: "Back to Modes", exact: true })
      .click();
    await page.setViewportSize({ width: 2400, height: 1000 });
  }
  expect(errors).toEqual([]);
});

test("individual color modes preview the first, middle and last scales", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: /^Modes\b/ })
    .click();

  const openColorScheme = page.getByRole("button", {
    name: "Open mode set Color scheme",
    exact: true,
  });
  const colorSchemeCard = page
    .locator('[data-component="ModeSetCard"]')
    .filter({ has: openColorScheme });
  const cardScaleRows = colorSchemeCard.locator("[data-color-scale-id]");
  const cardScaleIds = await cardScaleRows.evaluateAll((rows) =>
    rows.map((row) => row.getAttribute("data-color-scale-id")),
  );
  expect(cardScaleIds.length).toBeGreaterThan(0);
  const scaleIds = [...new Set(cardScaleIds)];
  expect(scaleIds).toHaveLength(1);

  const expectedScaleIds = [
    ...new Set([
      scaleIds[0],
      scaleIds[Math.floor(scaleIds.length / 2)],
      scaleIds.at(-1),
    ]),
  ];

  await openColorScheme.click();
  const modeCards = page.locator('[data-component="ModeCard"]');
  await expect(modeCards.first()).toBeVisible();
  for (const card of await modeCards.all()) {
    await expect
      .poll(() =>
        card
          .locator("[data-color-scale-id]")
          .evaluateAll((rows) =>
            rows.map((row) => row.getAttribute("data-color-scale-id")),
          ),
      )
      .toEqual(expectedScaleIds);
    await expect(card.locator("[data-color-scale-id] span[style]")).toHaveCount(
      expectedScaleIds.length * 3,
    );
  }
  expect(errors).toEqual([]);
});
