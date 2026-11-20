// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { expectEqualColumns, field, geometry } from "./fieldLayout";
import { enableEditMode } from "./editMode";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import type { AuthoringRecord } from "../../src/features/edit-session/storage";
import type { EditSessionSnapshot } from "../../src/features/edit-session/state";
import { decodeAuthoringStorage } from "../../src/features/edit-session/authoringStorageCodec";
import { generateTypography } from "../../src/features/typography/typographyGeneration";
import { resolveTypographyDocument } from "../../src/features/typography/resolution";
import { resolveActiveMode } from "../../src/features/modes/selection";

test.use({ trace: "off" });

function canonicalFontSize(snapshot: EditSessionSnapshot) {
  const modes = snapshot.modeSets.flatMap((set) => {
    const mode = resolveActiveMode(set, {});
    return mode ? [mode] : [];
  });
  return generateTypography(
    resolveTypographyDocument(snapshot.typography, modes, undefined, {
      modeSets: snapshot.modeSets,
    }),
    undefined,
    snapshot.rules,
    snapshot.scaleTypes,
    snapshot.interpolations,
    snapshot.icons,
  )[2].fontSize;
}

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function openFixture(page: Page, theme = "light") {
  await page.goto(`/tests/e2e/fixtures/editable-picker.html?theme=${theme}`);
  await expect(
    page.getByRole("button", { name: "Make read-only", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function openTypography(page: Page) {
  // An uncached load avoids Chromium's dev JSON-module cache write failure.
  await page.route("**/*", (route) => route.continue());
  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");
  const panel = page.locator('[data-component="FoundationsTypographyPanel"]');
  await panel.getByRole("tab", { name: "Font sizes", exact: true }).click();
  const base = panel.getByRole("textbox", { name: /^Base size/ });
  const sample = page
    .locator(
      ".typographyRampPreview .typographyElement:not(.typographyElementHeader) .typographyElementSample",
    )
    .nth(2);
  await expect(sample).toBeVisible();
  return { base, sample };
}

async function storedTypography(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  const text = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  if (!text) throw new Error("Missing authoring record.");
  return JSON.parse(decodeAuthoringStorage(text));
}

test("numeric drafts update visible typography before blur and preserve Save and Cancel", async ({
  page,
}) => {
  test.setTimeout(110_000);
  const { base, sample } = await openTypography(page);
  const fontSize = () =>
    sample.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
  const initial = await fontSize();
  await page.getByRole("button", { name: "Adaptive controls" }).first().click();
  const adaptive = page.getByRole("slider", {
    name: "Adaptive text scaling",
    exact: true,
  });
  await adaptive.focus();
  await adaptive.press("ArrowRight");
  await expect.poll(fontSize).toBeGreaterThan(initial);
  await expect(adaptive).toBeFocused();
  await adaptive.press("ArrowLeft");
  await expect.poll(fontSize).toBe(initial);
  await adaptive.press("Escape");
  await base.evaluate((input) => {
    const state = window as typeof window & {
      numericTiming: { feedback?: number; preview?: number };
    };
    state.numericTiming = {};
    const sample = document.querySelectorAll(
      ".typographyRampPreview .typographyElement:not(.typographyElementHeader) .typographyElementSample",
    )[2];
    if (!sample) throw new Error("Missing typography sample.");
    const before = getComputedStyle(sample).fontSize;
    input.addEventListener(
      "input",
      () => {
        const start = performance.now();
        requestAnimationFrame(() => {
          state.numericTiming.feedback = performance.now() - start;
        });
        const observe = () => {
          const current = document.querySelectorAll(
            ".typographyRampPreview .typographyElement:not(.typographyElementHeader) .typographyElementSample",
          )[2];
          if (current && getComputedStyle(current).fontSize !== before)
            state.numericTiming.preview = performance.now() - start;
          else requestAnimationFrame(observe);
        };
        requestAnimationFrame(observe);
      },
      { once: true },
    );
  });
  await base.fill("26");
  await expect(base).toHaveValue("26");
  await expect(base).toBeFocused();
  await expect.poll(fontSize).toBeGreaterThan(initial);
  await expect(base).toBeFocused();
  const timing = await page.evaluate(
    () =>
      (
        window as typeof window & {
          numericTiming: { feedback: number; preview: number };
        }
      ).numericTiming,
  );
  expect(timing.feedback).toBeLessThanOrEqual(50);
  expect(timing.preview).toBeLessThanOrEqual(100);
  console.log(
    `Numeric control feedback: ${timing.feedback.toFixed(1)} ms; visible typography: ${timing.preview.toFixed(1)} ms.`,
  );
  const stored = () => storedTypography(page);
  await expect
    .poll(async () => canonicalFontSize((await stored()).working), {
      timeout: 15_000,
    })
    .toBe(await fontSize());
  await base.evaluate((input: HTMLInputElement) =>
    input.setSelectionRange(1, 1),
  );
  await base.press(".");
  await expect(base).toHaveValue("2.6");
  expect(
    await base.evaluate((input: HTMLInputElement) => input.selectionStart),
  ).toBe(2);
  await base.press("Backspace");
  await expect(base).toHaveValue("26");
  await base.press("ArrowUp");
  await expect(base).toHaveValue("27");
  await base.press("ArrowDown");
  await expect(base).toHaveValue("26");
  await expect(base).toBeFocused();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click({ timeout: 30_000 });
  await expect
    .poll(async () => canonicalFontSize((await stored()).saved))
    .toBe(await fontSize());
  const saved = (await stored()).saved;
  await base.fill("");
  await expect(base).toHaveValue("");
  await expect(base).toHaveAttribute("aria-invalid", "true");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(base).toBeFocused();
  expect((await stored()).saved).toEqual(saved);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard", exact: true })
    .click({ timeout: 30_000 });
  expect((await stored()).working).toEqual(saved);
});

test("numeric drafts preserve adaptive dragging", async ({ page }) => {
  test.setTimeout(110_000);
  const { sample } = await openTypography(page);
  const saved = (await storedTypography(page)).saved;
  const fontSize = () =>
    sample.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
  const initial = await fontSize();
  await page.getByRole("button", { name: "Adaptive controls" }).first().click();
  const adaptive = page.getByRole("slider", {
    name: "Adaptive text scaling",
    exact: true,
  });
  await adaptive.evaluate(async (input) => {
    const popover = input.closest('[role="dialog"]')?.parentElement;
    if (!popover) throw new Error("Missing adaptive controls popover.");
    await Promise.all(
      popover
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished),
    );
  });
  const center = await adaptive.evaluate((input) => {
    const thumb = input.parentElement?.parentElement;
    if (!thumb) throw new Error("Missing adaptive slider thumb.");
    const box = thumb.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await adaptive.evaluate((input: HTMLInputElement) => {
    const state = window as typeof window & {
      adaptiveTiming: { feedback?: number; preview?: number; done?: boolean };
    };
    state.adaptiveTiming = {};
    const thumb = input.parentElement?.parentElement;
    const track = thumb?.parentElement;
    if (!thumb || !track) throw new Error("Missing adaptive slider geometry.");
    const position = () =>
      thumb.getBoundingClientRect().x - track.getBoundingClientRect().x;
    const before = position();
    const selector =
      ".typographyRampPreview .typographyElement:not(.typographyElementHeader) .typographyElementSample";
    const sample = document.querySelectorAll(selector)[2];
    if (!sample) throw new Error("Missing adaptive typography sample.");
    const size = getComputedStyle(sample).fontSize;
    window.addEventListener(
      "pointermove",
      () => {
        const start = performance.now();
        const observe = () => {
          if (position() !== before)
            state.adaptiveTiming.feedback ??= performance.now() - start;
          const current = document.querySelectorAll(selector)[2];
          if (current && getComputedStyle(current).fontSize !== size)
            state.adaptiveTiming.preview ??= performance.now() - start;
          if (
            (state.adaptiveTiming.feedback !== undefined &&
              state.adaptiveTiming.preview !== undefined) ||
            performance.now() - start > 1000
          )
            state.adaptiveTiming.done = true;
          else requestAnimationFrame(observe);
        };
        requestAnimationFrame(observe);
      },
      { once: true, capture: true },
    );
  });
  await page.mouse.move(center.x + 40, center.y);
  await page.waitForFunction(
    () =>
      (
        window as typeof window & {
          adaptiveTiming: { done?: boolean };
        }
      ).adaptiveTiming.done,
    undefined,
    { polling: "raf" },
  );
  const timing = await page.evaluate(
    () =>
      (
        window as typeof window & {
          adaptiveTiming: { feedback?: number; preview?: number };
        }
      ).adaptiveTiming,
  );
  console.log(
    `Adaptive drag: feedback ${timing.feedback} ms; preview ${timing.preview} ms.`,
  );
  expect.soft(timing.feedback).toBeLessThanOrEqual(50);
  expect.soft(timing.preview).toBeLessThanOrEqual(100);
  expect(await fontSize()).toBeGreaterThan(initial);
  expect((await storedTypography(page)).working).toEqual(saved);
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Reset to mode values", exact: true })
    .click();
  await expect.poll(fontSize).toBe(initial);
  await adaptive.press("Escape");
});

test("numeric drafts preserve navigation, pagehide and RFC ordering", async ({
  page,
}) => {
  test.setTimeout(110_000);
  const { base, sample } = await openTypography(page);
  const saved = (await storedTypography(page)).saved;
  const fontSize = () =>
    sample.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
  const initial = await fontSize();
  await base.fill("27");
  await expect.poll(fontSize).toBeGreaterThan(initial);
  const navigatedSize = await fontSize();
  const navigation = page.getByRole("navigation", {
    name: "Navigation",
    exact: true,
  });
  await navigation
    .getByRole("link", { name: /^Objects/ })
    .dispatchEvent("click");
  await expect
    .poll(
      async () => canonicalFontSize((await storedTypography(page)).working),
      { timeout: 45_000 },
    )
    .toBe(navigatedSize);
  expect((await storedTypography(page)).saved).toEqual(saved);
  await navigation
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await page
    .locator('[data-component="FoundationsTypographyPanel"]')
    .getByRole("tab", { name: "Font sizes", exact: true })
    .click();
  await expect(base).toHaveValue("27");

  await base.fill("32");
  await expect.poll(fontSize).toBeGreaterThan(navigatedSize);
  const hiddenSize = await fontSize();
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
  });
  const hiddenRecord = await storedTypography(page);
  expect(canonicalFontSize(hiddenRecord.working)).toBe(hiddenSize);
  expect((await storedTypography(page)).saved).toEqual(saved);

  await base.fill("");
  const banner = page.getByRole("banner");
  await banner.getByRole("button", { name: "Create RFC", exact: true }).click();
  await expect(base).toBeFocused();
  expect((await storedTypography(page)).isEditing).toBe(true);
  await base.fill("40");
  await expect.poll(fontSize).toBeGreaterThan(hiddenSize);
  const reviewedSize = await fontSize();
  await banner
    .getByRole("button", { name: "Create RFC", exact: true })
    .click({ timeout: 30_000 });
  await expect(
    banner.getByRole("button", { name: "Save", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(async () => (await storedTypography(page)).isEditing, {
      timeout: 45_000,
    })
    .toBe(false);
  const reviewed = await storedTypography(page);
  expect(reviewed.isEditing).toBe(false);
  expect(canonicalFontSize(reviewed.working)).toBe(reviewedSize);
  expect(reviewed.saved).toEqual(saved);
});

const gridFields = [
  "number-default",
  "number-grid",
  "number-long",
  "number-disabled",
  "number-readonly",
  "number-stepper-hidden",
  "number-styled",
  "number-required",
  "number-help",
  "number-ref",
  "number-uncontrolled",
  "editable-number",
  "editable-number-default",
  "layout-picker",
];

for (const theme of ["light", "dark"]) {
  for (const width of [760, 320]) {
    test(`${theme} ${width}px: NumberFields default to equal side columns and read-only values match`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await openFixture(page, theme);
      for (const id of gridFields) await expectEqualColumns(field(page, id));
      expect(
        await page
          .getByRole("main")
          .evaluate((node) => node.scrollWidth - node.clientWidth),
      ).toBeLessThanOrEqual(1);
      const editable = await geometry(field(page, "editable-number"));
      await page
        .getByRole("button", { name: "Make read-only", exact: true })
        .click();
      const readOnly = await expectEqualColumns(field(page, "editable-number"));
      expect(
        Math.abs(readOnly.valueStart - editable.valueStart),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(readOnly.valueWidth - editable.valueWidth),
      ).toBeLessThanOrEqual(1);
      await expect(
        field(page, "editable-number").getByRole("textbox"),
      ).toHaveCount(0);
      await expect(field(page, "editable-number")).toContainText("14.00");
      await expect(field(page, "editable-number-default")).toContainText(
        "27.125",
      );
      await expectEqualColumns(field(page, "editable-number-default"));
      await expect(
        field(page, "layout-picker").getByRole("button"),
      ).toBeEnabled();
      await expect(
        field(page, "number-default").getByRole("textbox"),
      ).toBeEditable();
    });
  }
}

test("NumberField preserves flex/top options, native stepping, constraints, formatting and refs", async ({
  page,
}) => {
  await openFixture(page);
  for (const id of ["number-flex", "editable-number-flex"]) {
    const bounds = await geometry(field(page, id));
    expect(Math.abs(bounds.labelWidth - bounds.valueWidth)).toBeGreaterThan(1);
  }
  for (const id of ["number-top", "editable-number-top"]) {
    const bounds = await geometry(field(page, id));
    expect(bounds.valueTop).toBeGreaterThan(bounds.labelTop);
  }
  const root = field(page, "number-default");
  const input = root.getByRole("textbox");
  await root.getByText("Native number", { exact: true }).click();
  await expect(input).toBeFocused();
  await input.press("ArrowUp");
  await expect(input).toHaveValue("14.25");
  await input.fill("20");
  await input.press("Tab");
  await expect(root.getByRole("button", { name: /Increase/ })).toBeDisabled();
  await root.getByRole("button", { name: /Decrease/ }).click();
  await expect(input).toHaveValue("19.75");
  await expect(
    field(page, "number-disabled").getByRole("textbox"),
  ).toBeDisabled();
  await expect(
    field(page, "number-readonly").getByRole("textbox"),
  ).not.toBeEditable();
  await expect(
    field(page, "number-stepper-hidden").getByRole("button"),
  ).toHaveCount(0);
  await expect(
    field(page, "number-uncontrolled").getByRole("textbox"),
  ).toHaveValue("3.5");
  const unlabeled = field(page, "number-unlabeled");
  expect(
    await unlabeled.evaluate((node) => {
      const group = node.querySelector('[role="group"]');
      if (!group) throw new Error("Missing NumberField input group.");
      return Math.abs(group.getBoundingClientRect().width - node.clientWidth);
    }),
  ).toBeLessThanOrEqual(1);
  await expect(unlabeled.getByRole("textbox")).toHaveAccessibleName(
    "Unlabeled number",
  );
  await page.getByRole("button", { name: "Focus number", exact: true }).click();
  const refInput = field(page, "number-ref").getByRole("textbox");
  await expect(refInput).toBeFocused();
  expect(
    await refInput.evaluate((node) => {
      const input = node as HTMLInputElement;
      return input.value.substring(
        input.selectionStart ?? 0,
        input.selectionEnd ?? 0,
      );
    }),
  ).toBe("19.75");
  await expect(field(page, "number-styled")).toHaveClass(/number-caller-class/);
  expect(
    await field(page, "number-styled").evaluate((node) => ({
      opacity: getComputedStyle(node).opacity,
      margin: getComputedStyle(node).marginTop,
      layout: node.getAttribute("layout"),
    })),
  ).toEqual({ opacity: "0.9", margin: "8px", layout: null });
  await expect(
    field(page, "number-required").getByRole("textbox"),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    field(page, "number-required").getByRole("textbox"),
  ).toHaveAccessibleDescription(/Check this number/);
  await field(page, "number-help")
    .getByRole("button", { name: /Number field information/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Number formatting does not change the source value.",
  );
  await page.keyboard.press("Escape");
});

test("Typography panel NumberFields and Pickers use equal columns and paired fields fit narrow panels", async ({
  page,
}) => {
  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  const panel = page.locator('[data-component="FoundationsTypographyPanel"]');
  await panel.getByRole("tab", { name: "Font sizes", exact: true }).click();
  const base = panel.getByRole("textbox", { name: /^Base size/ });
  const rootForInput = (input: ReturnType<typeof panel.getByRole>) =>
    input.locator("../..");
  await expectEqualColumns(rootForInput(base));
  const ratioRoot = rootForInput(
    panel.getByRole("textbox", { name: "Ratio", exact: true }),
  );
  expect(
    await ratioRoot.evaluate((node) => {
      const group = node.querySelector('[role="group"]');
      if (!group) throw new Error("Missing ratio input group.");
      return Math.abs(group.getBoundingClientRect().width - node.clientWidth);
    }),
  ).toBeLessThanOrEqual(1);
  const scaleRoot = panel
    .getByRole("button", { name: / Scale$/ })
    .locator("..");
  await expectEqualColumns(scaleRoot);
  expect(
    Math.abs(
      (await scaleRoot.boundingBox())!.y - (await ratioRoot.boundingBox())!.y,
    ),
  ).toBeLessThanOrEqual(1);
  await panel.getByRole("tab", { name: "Line heights", exact: true }).click();
  const card = panel.getByRole("region", {
    name: "body line height",
    exact: true,
  });
  await expectEqualColumns(
    rootForInput(
      card.getByRole("textbox", { name: "Default line height", exact: true }),
    ),
  );
  await card
    .getByRole("button", { name: "Adaptive settings", exact: true })
    .click();
  for (const name of [
    /^From text size/,
    /^To text size/,
    /^From line height$/,
    /^To line height$/,
  ]) {
    await expectEqualColumns(rootForInput(card.getByRole("textbox", { name })));
  }
  await panel.evaluate((node) => {
    (node as HTMLElement).style.width = "260px";
  });
  for (const name of [/^From text size/, /^To text size/]) {
    await expectEqualColumns(rootForInput(card.getByRole("textbox", { name })));
  }
  const from = await card
    .getByRole("textbox", { name: /^From text size/ })
    .boundingBox();
  const to = await card
    .getByRole("textbox", { name: /^To text size/ })
    .boundingBox();
  expect(to!.y).toBeGreaterThan(from!.y);
});

test("Registry and token detail Pickers use equal columns without changing editing gates or saved sources", async ({
  page,
}) => {
  await enableEditMode(page);
  await page.goto("/");
  const changes = page
    .getByRole("complementary", { name: "Change log", exact: true })
    .getByRole("heading", { name: "Changes", exact: true });
  if (await changes.isVisible())
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Change log/ })
      .click();
  await expect(changes).toHaveCount(0);
  const source = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Registry", exact: true })
    .click();
  const valueType = page.getByRole("button", { name: / Value type$/ });
  const cardinality = page.getByRole("button", { name: / Cardinality$/ });
  await expectEqualColumns(valueType.locator(".."));
  await expectEqualColumns(cardinality.locator(".."));
  await valueType.click();
  await page.getByRole("option", { name: "Number", exact: true }).click();
  await expect(valueType).toBeFocused();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search tokens", exact: true })
    .fill("red-500");
  await page.getByRole("button", { name: "Open red-500", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const status = dialog.getByRole("button", { name: / Status$/ });
  await expectEqualColumns(status.locator(".."));
  await expect(status).toBeEnabled();
  await status.click();
  await page.getByRole("option", { name: "Draft", exact: true }).click();
  await expect(status).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(source);
});
