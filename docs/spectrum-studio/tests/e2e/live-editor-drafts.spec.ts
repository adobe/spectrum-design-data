// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { enableEditMode } from "./editMode";
import {
  createDefaultSnapshot,
  isSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import type { AuthoringRecord } from "../../src/features/edit-session/storage";
import { decodeAuthoringStorage } from "../../src/features/edit-session/authoringStorageCodec";
import { decodeStructureSource } from "../../src/features/edit-session/structureSourceCodec";
import { reconcileStructureNames } from "../../src/features/structures/registeredNames";
import { styleName } from "../../src/features/styles/generation";
import {
  createStructure,
  structureSelection,
} from "../../src/features/structures/model";
import { createDataVisSnapshot, DATA_VIS_IDS } from "../fixtures/dataVis";
import { selectColorPanelSection } from "./colorPanelSection";

type TimingWindow = typeof window & {
  liveEditorTiming: {
    start?: number;
    feedback?: number;
    dispatch?: number;
    reply?: number;
    preview?: number;
    timedOut?: boolean;
    messages?: { type: string; id?: number; time: number }[];
  };
};
// DOM snapshot tracing adds main-thread work to the latency being measured.
test.use({ viewport: { width: 1800, height: 1000 }, trace: "off" });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const failures: string[] = [];
  errors.set(page, failures);
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      (message.text().includes("worker") || message.text().includes("same key"))
    )
      failures.push(message.text());
  });
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

async function open(page: Page, snapshot: EditSessionSnapshot, hash: string) {
  // Exercise real workers without Chromium's failing dev JSON-module cache.
  await page.route("**/*", (route) => route.continue());
  await page.addInitScript(() => {
    const state = window as TimingWindow;
    window.Worker = class extends Worker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (
          !String(url).includes("/edit-session/editorPreview.worker") &&
          !String(url).includes("/data-vis/preview.worker")
        )
          return;
        const send = this.postMessage.bind(this);
        this.postMessage = (
          message: unknown,
          transfer?: Transferable[] | StructuredSerializeOptions,
        ) => {
          const timing = state.liveEditorTiming;
          if (timing?.start !== undefined) {
            timing.dispatch ??= performance.now() - timing.start;
            (timing.messages ??= []).push({
              type: "request",
              id: (message as { id?: number }).id,
              time: performance.now() - timing.start,
            });
          }
          if (Array.isArray(transfer)) send(message, transfer);
          else send(message, transfer);
        };
        this.addEventListener("message", (event) => {
          const timing = state.liveEditorTiming;
          if (timing?.start !== undefined && timing.dispatch !== undefined) {
            timing.reply ??= performance.now() - timing.start;
            (timing.messages ??= []).push({
              type: "reply",
              id: (event.data as { id?: number }).id,
              time: performance.now() - timing.start,
            });
          }
        });
      }
    };
  });
  await enableEditMode(page, snapshot);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: hash === "design" ? /^Objects/ : "Foundations" })
    .dispatchEvent("click");
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  const text = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  if (!text) throw new Error("Missing authoring record.");
  const stored: AuthoringRecord<unknown> = JSON.parse(
    decodeAuthoringStorage(text),
  );
  const working = decodeStructureSource(stored.working);
  const saved = decodeStructureSource(stored.saved);
  if (!working || !saved || !isSnapshot(working) || !isSnapshot(saved))
    throw new Error("Invalid authoring snapshot.");
  return { ...stored, working, saved };
}
async function editAndMeasure(
  page: Page,
  field: Locator,
  value: string,
  selector: string,
  property: "fontWeight" | "width" | "height" | "backgroundImage",
) {
  await field.evaluate(
    (input, { selector, property }) => {
      const state = window as TimingWindow;
      state.liveEditorTiming = {};
      const sample = document.querySelector(selector);
      if (!sample) throw new Error("Missing live preview sample.");
      const before = getComputedStyle(sample)[property];
      input.addEventListener(
        "input",
        () => {
          const start = performance.now();
          state.liveEditorTiming.start = start;
          const observe = () => {
            state.liveEditorTiming.feedback ??= performance.now() - start;
            const sample = document.querySelector(selector);
            if (sample && getComputedStyle(sample)[property] !== before)
              state.liveEditorTiming.preview = performance.now() - start;
            else if (performance.now() - start > 1000)
              state.liveEditorTiming.timedOut = true;
            else requestAnimationFrame(observe);
          };
          requestAnimationFrame(observe);
        },
        { once: true },
      );
    },
    { selector, property },
  );
  await field.fill(value);
  await page.waitForFunction(
    () => {
      const timing = (window as TimingWindow).liveEditorTiming;
      return timing.preview !== undefined || timing.timedOut === true;
    },
    undefined,
    { polling: "raf" },
  );
  const timing = await page.evaluate(
    () => (window as TimingWindow).liveEditorTiming,
  );
  await expect(field).toHaveValue(value);
  await expect(field).toBeFocused();
  console.log(
    `${property}: feedback ${timing.feedback} ms, dispatch ${timing.dispatch} ms, reply ${timing.reply} ms, preview ${timing.preview} ms.`,
  );
  console.log(timing.messages);
  expect
    .soft(timing.timedOut, "The preview must change within one second")
    .not.toBe(true);
  expect.soft(timing.feedback).toBeLessThanOrEqual(50);
  expect.soft(timing.preview).toBeLessThanOrEqual(100);
}

test("live draft Style weight reaches the sample before blur and accepts canonically", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const snapshot = createDefaultSnapshot();
  const recipe = snapshot.styles!.recipes.find(
    (recipe) => recipe.kind === "text",
  );
  if (!recipe) throw new Error("Missing shipped text Style.");
  await open(page, snapshot, "design");
  await page.getByRole("tab", { name: "Styles", exact: true }).click();
  const panel = page.locator('[data-component="StylesPanel"]');
  await panel
    .getByText(styleName(recipe, snapshot.taxonomy!), { exact: true })
    .first()
    .click();
  const field = page.getByRole("combobox", {
    name: "Font weight",
    exact: true,
  });
  const selector = ".stylesCanvas [data-value-preview] > :first-child";
  await expect(page.locator(selector).first()).toBeVisible();
  await editAndMeasure(page, field, "450", selector, "fontWeight");
  await expect(page.locator(selector).first()).toHaveCSS("font-weight", "450");
  await expect
    .poll(
      async () =>
        (await record(page)).working.styles!.recipes.find(
          (item) => item.id === recipe.id,
        )?.appearance.fontWeight?.value,
      { timeout: 45_000 },
    )
    .toBe(450);
  expect((await record(page)).saved.styles).toEqual(snapshot.styles);
});

test("live draft Structure width reaches the canvas before blur and accepts canonically", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const snapshot = createDefaultSnapshot();
  snapshot.structures!.structures.unshift(
    createStructure("Example structure", crypto.randomUUID()),
  );
  const named = reconcileStructureNames(
    snapshot.taxonomy!,
    snapshot.structures!,
    snapshot.structures!,
  );
  snapshot.taxonomy = named.taxonomy;
  snapshot.structures = named.document;
  const structure = snapshot.structures!.structures[0];
  await open(page, snapshot, "design");
  await page.getByRole("tab", { name: "Structures", exact: true }).click();
  await page
    .locator('[data-component="StructureCard"]')
    .filter({ hasText: "Example structure" })
    .click({ position: { x: 4, y: 4 } });
  const field = page.getByRole("combobox", { name: /^Default size width/ });
  const selector = '.structureDesignWork [data-component="StructurePreview"]';
  await expect(page.locator(selector).first()).toBeVisible();
  await editAndMeasure(page, field, "274", selector, "width");
  await expect(page.locator(selector).first()).toHaveCSS("width", "274px");
  await expect
    .poll(
      async () => {
        const accepted = (
          await record(page)
        ).working.structures!.structures.find(
          (item) => item.conceptId === structure.conceptId,
        );
        if (!accepted) throw new Error("Missing accepted Structure.");
        return structureSelection(accepted, "width");
      },
      { timeout: 45_000 },
    )
    .toEqual({ value: { kind: "number", value: 274, unit: "px" } });
  const height = page.getByRole("combobox", { name: /^Default size height/ });
  await editAndMeasure(page, height, "275", selector, "height");
  await expect(page.locator(selector).first()).toHaveCSS("height", "275px");
  await expect
    .poll(
      async () => {
        const accepted = (
          await record(page)
        ).working.structures!.structures.find(
          (item) => item.conceptId === structure.conceptId,
        );
        if (!accepted) throw new Error("Missing accepted Structure.");
        return [
          structureSelection(accepted, "width"),
          structureSelection(accepted, "height"),
        ];
      },
      { timeout: 45_000 },
    )
    .toEqual([
      { value: { kind: "number", value: 274, unit: "px" } },
      { value: { kind: "number", value: 275, unit: "px" } },
    ]);
  expect((await record(page)).saved.structures).toEqual(snapshot.structures);
});

test("live draft Data Vis contrast reaches Elements and the mounted Analyze worker", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const snapshot = createDataVisSnapshot();
  await open(page, snapshot, "foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Data vis");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  const selector =
    '[data-component="DataVisElements"] [aria-label="Data sequence colors"]';
  await expect(page.locator(selector)).toBeVisible();
  await page
    .getByRole("button", {
      name: "Open Data sequence data vis scale",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit Data sequence data vis scale",
    exact: true,
  });
  const field = dialog.getByRole("textbox", { name: "Contrast", exact: true });
  await editAndMeasure(page, field, "3.5", selector, "backgroundImage");
  await expect
    .poll(
      async () => {
        const scale = (
          await record(page)
        ).working.colorSystem.dataVisScales.find(
          (scale) => scale.id === DATA_VIS_IDS.sequential,
        );
        if (!scale || scale.kind === "categorical")
          throw new Error("Missing continuous scale.");
        return scale.points[0].contrast?.value;
      },
      { timeout: 15_000 },
    )
    .toBe(3.5);
  await dialog.focus();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Analyze", exact: true }).click();
  const analysis = page.locator('[data-component="DataVisAnalyze"]');
  await analysis.getByRole("button", { name: /Data vis scale/ }).click();
  await page
    .getByRole("option", { name: "Data sequence", exact: true })
    .click();
  await expect(
    analysis.getByRole("img", { name: "0%", exact: true }),
  ).toBeVisible();
  expect((await record(page)).saved.colorSystem).toEqual(snapshot.colorSystem);
});
