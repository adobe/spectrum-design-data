// Copyright 2026 Adobe. All rights reserved.
import { expect, type Locator } from "@playwright/test";

export async function expectChartColumns(root: Locator, columns: 1 | 2 | 3) {
  const grid = root.locator("[data-chart-grid]");
  await expect
    .poll(() =>
      grid.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      ),
    )
    .toBe(columns);
  const width = await grid.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  const cards = await grid
    .locator('section[aria-label$=" chart"]')
    .evaluateAll((elements) =>
      elements.map((card) => {
        const { x, y, width, height } = card.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
  expect(cards.length).toBeGreaterThan(0);
  for (const card of cards)
    expect(card.width).toBeCloseTo((width - (columns - 1) * 16) / columns, 1);
  if (cards.length < 2) return;
  if (columns > 1) {
    expect(cards[1].y).toBe(cards[0].y);
    expect(cards[1].x).toBeCloseTo(cards[0].x + cards[0].width + 16, 1);
  } else {
    expect(cards[1].x).toBe(cards[0].x);
    expect(cards[1].y).toBeGreaterThanOrEqual(
      cards[0].y + cards[0].height + 16,
    );
  }
  if (cards.length > columns) {
    expect(cards[columns].x).toBe(cards[0].x);
    expect(cards[columns].y).toBeGreaterThanOrEqual(
      Math.max(...cards.slice(0, columns).map((card) => card.y + card.height)) +
        16,
    );
  }
}

export async function expectFixedChartSizing(root: Locator) {
  const graphs = root.locator('svg[role="img"]:has(polyline)');
  await expect(graphs.first()).toBeVisible();
  expect(await graphs.count()).toBeGreaterThan(0);
  await expect
    .poll(() =>
      graphs.evaluateAll((elements) =>
        elements.every((element) => {
          const svg = element as SVGSVGElement;
          const matrix = svg.getScreenCTM();
          return (
            matrix &&
            Math.abs(Math.hypot(matrix.a, matrix.b) - 1) < 0.001 &&
            Math.abs(Math.hypot(matrix.c, matrix.d) - 1) < 0.001
          );
        }),
      ),
    )
    .toBe(true);
  const measurements = await graphs.evaluateAll((elements) =>
    elements.map((element) => {
      const svg = element as SVGSVGElement;
      return {
        height: svg.getBoundingClientRect().height,
        fonts: [...svg.querySelectorAll("text")].map((text) => {
          const matrix = text.getScreenCTM()!;
          return (
            parseFloat(getComputedStyle(text).fontSize) *
            Math.hypot(matrix.c, matrix.d)
          );
        }),
        strokes: [...svg.querySelectorAll("polyline")].map((line) => ({
          width: parseFloat(getComputedStyle(line).strokeWidth),
          effect: getComputedStyle(line).vectorEffect,
        })),
        markers: [...svg.querySelectorAll("circle, rect")].map((marker) => {
          const bounds = marker.getBoundingClientRect();
          return { width: bounds.width, height: bounds.height };
        }),
      };
    }),
  );
  for (const graph of measurements) {
    expect(graph.height).toBeCloseTo(360, 2);
    expect(graph.fonts.length).toBeGreaterThan(0);
    for (const font of graph.fonts) {
      expect(font).toBeGreaterThanOrEqual(11.99);
      expect(font).toBeLessThanOrEqual(14.01);
    }
    for (const stroke of graph.strokes) {
      expect(stroke.width).toBe(2);
      expect(stroke.effect).toBe("non-scaling-stroke");
    }
    expect(graph.markers.length).toBeGreaterThan(0);
    for (const marker of graph.markers) {
      expect(marker.width).toBeGreaterThanOrEqual(4);
      expect(marker.width).toBeLessThanOrEqual(8);
      expect(marker.height).toBeGreaterThanOrEqual(4);
      expect(marker.height).toBeLessThanOrEqual(8);
    }
  }
  const labels = await root
    .locator(
      'section[aria-label$=" chart"] > h3, section[aria-label="Graph"] > h3, h4, ul[aria-label$=" lines"]',
    )
    .evaluateAll((elements) =>
      elements.map((element) => parseFloat(getComputedStyle(element).fontSize)),
    );
  for (const font of labels) {
    expect(font).toBeGreaterThanOrEqual(12);
    expect(font).toBeLessThanOrEqual(14);
  }
}
