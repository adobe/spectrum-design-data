// Copyright 2026 Adobe. All rights reserved.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { TYPOGRAPHY_DEFAULTS } from "../../src/features/typography/defaults";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import {
  AUTHORING_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
} from "../../src/features/edit-session/storage";
import { typeScaleWithRatios } from "../typography-fixtures";

interface ReferenceCase {
  userTextZoom: number;
  tokens: Record<string, number>;
}

const REFERENCE: ReferenceCase[] = JSON.parse(
  readFileSync(
    new URL("../fixtures/spectrum-density-text-zoom.json", import.meta.url),
    "utf8",
  ),
);
const TEXT_ZOOM_MIN = -4;

// spectrum-density's adaptive ratios; app defaults may differ.
async function seedReferenceTypography(page: Page, isEditing = false) {
  const snapshot = createDefaultSnapshot();
  snapshot.typography = {
    ...structuredClone(TYPOGRAPHY_DEFAULTS),
    outputUnit: "px",
  };
  snapshot.scaleTypes = typeScaleWithRatios(1.118, 1.069);
  await page.addInitScript(
    ({ key, preferencesKey, record, editing }) => {
      if (localStorage.getItem(key) !== null) return;
      localStorage.setItem(key, JSON.stringify(record));
      if (editing)
        localStorage.setItem(
          preferencesKey,
          JSON.stringify({
            version: 1,
            appearance: "light",
            modeSelection: { textScaling: "mode-text-scaling-larger" },
          }),
        );
    },
    {
      key: AUTHORING_STORAGE_KEY,
      preferencesKey: PREFERENCES_STORAGE_KEY,
      editing: isEditing,
      record: {
        version: 1,
        working: snapshot,
        saved: snapshot,
        isEditing,
        attachments: {},
        savedAttachments: {},
      },
    },
  );
}

async function setTextZoom(page: Page, zoom: number) {
  await page
    .getByRole("radio", { name: "Preview", exact: true })
    .dispatchEvent("click");
  await page.getByRole("button", { name: "Adaptive controls" }).first().click();
  const slider = page.getByRole("slider", { name: "Text size" });
  await slider.focus();
  await page.keyboard.press("Home");
  for (let step = TEXT_ZOOM_MIN; step < zoom; step++)
    await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");
}

async function readRamp(page: Page) {
  return page.locator(".typographyRampPreview").evaluate((preview) => {
    const rows = [
      ...preview.querySelectorAll(
        ".typographyElement:not(.typographyElementHeader)",
      ),
    ];
    return {
      rows: rows.map((row) => {
        const sample = row.querySelector<HTMLElement>(
          ".typographyElementSample",
        )!;
        const computed = getComputedStyle(sample);
        return {
          scale: row
            .querySelector(".typographyElementMeta")!
            .textContent!.trim(),
          values: [...row.querySelectorAll(".typographyElementValue")].map(
            (cell) => cell.textContent!.trim(),
          ),
          fontSize: Number.parseFloat(computed.fontSize),
          lineHeight: Number.parseFloat(computed.lineHeight),
        };
      }),
    };
  });
}

async function cssVariables(page: Page, names: string[]) {
  return page
    .locator(".typographyRampPreview")
    .evaluate((preview, tokenNames) => {
      const css = getComputedStyle(preview);
      const rootFontSize = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      return Object.fromEntries(
        tokenNames.map((name) => {
          const raw = css.getPropertyValue(`--${name}`).trim();
          return [
            name,
            raw.endsWith("rem")
              ? Number.parseFloat(raw) * rootFontSize
              : Number.parseFloat(raw),
          ];
        }),
      );
    }, names);
}

test("Elements font sizes match spectrum-density at every reference text zoom", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seedReferenceTypography(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Typography" }).dispatchEvent("click");
  await page.getByRole("radio", { name: "Elements" }).dispatchEvent("click");

  for (const { userTextZoom, tokens } of REFERENCE) {
    await setTextZoom(page, userTextZoom);
    await expect(page.locator(".typographyRampPreview")).toHaveAttribute(
      "data-text-zoom",
      String(userTextZoom),
    );

    const { rows } = await readRamp(page);
    const mismatches: string[] = [];
    for (const row of rows) {
      const fontSize = tokens[`font-size-${row.scale}`];
      if (fontSize === undefined) {
        mismatches.push(`row ${row.scale} is not in the reference ramp`);
        continue;
      }
      if (row.values[0] !== `${fontSize}px`)
        mismatches.push(
          `displayed font-size-${row.scale}: ${row.values[0]} ≠ ${fontSize}px`,
        );
      if (Math.abs(row.fontSize - fontSize) > 0.01)
        mismatches.push(
          `rendered font-size-${row.scale}: ${row.fontSize} ≠ ${fontSize}`,
        );
      expect(row.lineHeight).toBeGreaterThan(0);
    }
    expect(rows.length, `zoom ${userTextZoom} row count`).toBe(
      Object.keys(tokens).filter((name) => name.startsWith("font-size-"))
        .length,
    );

    const fontTokens = Object.entries(tokens).filter(([name]) =>
      name.startsWith("font-size-"),
    );
    const variables = await cssVariables(
      page,
      fontTokens.map(([name]) => name),
    );
    for (const [name, expected] of fontTokens) {
      if (!(Math.abs(variables[name] - expected) <= 0.01))
        mismatches.push(`--${name}: ${variables[name]} ≠ ${expected}`);
    }
    expect(mismatches, `zoom ${userTextZoom}`).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test("Text size in its owning mode popover matches spectrum-density", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seedReferenceTypography(page, true);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Typography" }).dispatchEvent("click");
  await page.getByRole("radio", { name: "Elements" }).dispatchEvent("click");
  await page.getByRole("button", { name: "Mode sets", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Larger for typography", exact: true })
    .click();

  for (const { userTextZoom, tokens } of REFERENCE) {
    const slider = page
      .getByRole("dialog")
      .getByRole("slider", { name: "Text size", exact: true });
    await slider.press("Home");
    for (let step = TEXT_ZOOM_MIN; step < userTextZoom; step++)
      await slider.press("ArrowRight");
    await expect(page.locator(".typographyRampPreview")).toHaveAttribute(
      "data-text-zoom",
      String(userTextZoom),
    );
    const { rows } = await readRamp(page);
    const mismatches = rows.flatMap((row) => {
      const fontSize = tokens[`font-size-${row.scale}`];
      return Math.abs(row.fontSize - fontSize) > 0.01 ||
        row.values[0] !== `${fontSize}px`
        ? [
            `font-size-${row.scale}: shown ${row.values[0]}, rendered ${row.fontSize} ≠ ${fontSize}`,
          ]
        : [];
    });
    expect(mismatches, `edit zoom ${userTextZoom}`).toEqual([]);
  }
  expect(errors).toEqual([]);
});
