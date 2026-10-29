// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createStore } from "jotai";
import { computeAnalysisComparison } from "../../src/features/design-data/analysisWork";
import {
  reportWithFreshness,
  type AnalysisInput,
  type AnalysisReport,
} from "../../src/features/design-data/comparison";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
} from "../../src/features/edit-session/storage";
import { selectColorPanelSection } from "./colorPanelSection";
import { buildColorLibrary } from "../../src/features/color-system/cssLibrary";
import {
  colorSchemeDocumentsAtom,
  contrastModesAtom,
  cssBaseDocumentAtom,
  customContrastModeDocumentsAtom,
  scaleModeDocumentsAtom,
} from "../../src/features/color-system/state";
import { taxonomyDocumentAtom } from "../../src/features/taxonomy/state";
import { rulesAtom } from "../../src/features/logic/library";
import {
  browserModeContextAtom,
  browserTokensAtom,
  editBrowserTokensAtom,
} from "../../src/features/tokens/browserState";
import {
  filterBrowserTokens,
  parseBrowserTokenValue,
  tokenValueText,
} from "../../src/features/tokens/browserModel";
import { isSelectableBrowserToken } from "../../src/features/tokens/view/tokenTablePresentation";
import { buildTypographyCss } from "../../src/features/typography/typographyCss";
import { generateTypography } from "../../src/features/typography/typographyGeneration";
import { typographyTokenValues } from "../../src/features/typography/typographyTokens";
import { lineHeightName } from "../../src/features/typography/lineHeightNames";
import { formatTypographyLength } from "../../src/features/typography/units";
import {
  captureSnapshot,
  enterEditModeAtom,
  restoreAuthoringSnapshotAtom,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  hexToLinear,
  linearToOklch,
  luminance,
  targetLuminance,
} from "../../src/features/color-system/colorMath";
import {
  contrastForEffectiveEdit,
  contrastMultiplier,
  divideContrast,
  polarityContext,
} from "../../src/features/color-system/polarity";
import { paletteColorHex } from "../../src/features/color-system/paletteValue";
import { assessClassificationStandard } from "../../src/features/taxonomy/standardization";
import { CLASSIFICATION_REVIEW_LABEL } from "../../src/features/taxonomy/reviewPresentation";

interface ContinuousContrastAudit {
  running: boolean;
  dragging: boolean;
  input?: HTMLInputElement;
  moves: { epoch: number; x: number; trusted: boolean }[];
  frames: {
    epoch: number;
    value: number;
    output: string;
    thumbX: number;
    ramp: number;
  }[];
}
declare global {
  interface Window {
    continuousContrastAudit: ContinuousContrastAudit;
  }
}
interface PickerTypingAudit {
  keys: { expected: string; trusted: boolean }[];
  inputs: { value: string; trusted: boolean }[];
}
declare global {
  interface Window {
    pickerTypingAudit: PickerTypingAudit;
  }
}

const reference: AnalysisInput = {
  source: {
    kind: "reference",
    root: "Priority fixture",
    hash: "1".repeat(64),
    revision: "priority-fixture",
    dirty: false,
    version: "fixture",
    validator: "Fixture transport, not upstream conformance",
  },
  records: [
    {
      id: "priority-fixture",
      category: "tokens",
      name: "Priority fixture token",
      value: 12,
      unit: "px",
      source: "tokens/fixture.json",
      pointer: "/0",
      classification: "authored",
    },
  ],
  categories: ["tokens"],
  schemas: [],
  errors: [],
  limitations: [],
  inventoryStatus: "complete",
};
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    let active = 0,
      peak = 0,
      totalActive = 0,
      authoringResults = 0;
    window.Worker = class extends OriginalWorker {
      private tracked: boolean;
      private disposed = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        totalActive += 1;
        document.documentElement.dataset.priorityWorkersActive =
          String(totalActive);
        this.addEventListener("error", (event) => {
          document.documentElement.dataset.derivedWorkerError = `${String(url)}: ${event.message}`;
        });
        if (String(url).includes("recordPreparation.worker"))
          this.addEventListener("message", (event) => {
            if (event.data.type === "ready") {
              authoringResults += 1;
              document.documentElement.dataset.authoringWorkerResults =
                String(authoringResults);
              document.documentElement.dataset.authoringWorkerReady = String(
                event.data.value.record.version,
              );
              document.documentElement.dataset.componentContrastProof = String(
                event.data.value.componentContrastWitness !== null,
              );
              document.documentElement.dataset.componentColorProof = String(
                Boolean(event.data.value.componentColorWitness?.tokens.length),
              );
              document.documentElement.dataset.componentScaleProof = String(
                event.data.value.componentColorWitness?.scaleColors?.length ??
                  0,
              );
            }
          });
        this.tracked = String(url).includes("analysis.worker");
        if (this.tracked) {
          active += 1;
          peak = Math.max(peak, active);
          document.documentElement.dataset.analysisWorkersActive =
            String(active);
          document.documentElement.dataset.analysisWorkersPeak = String(peak);
        }
      }
      terminate() {
        if (!this.disposed) {
          this.disposed = true;
          totalActive -= 1;
          document.documentElement.dataset.priorityWorkersActive =
            String(totalActive);
        }
        if (this.tracked) {
          active -= 1;
          this.tracked = false;
          document.documentElement.dataset.analysisWorkersActive =
            String(active);
        }
        super.terminate();
      }
    };
  });
  await page.route("**/__design-data/reference", (route) =>
    route.fulfill({ json: reference }),
  );
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-derived-worker-error",
    /.+/,
  );
});
async function navigate(page: Page, hash: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .locator(`a[href="#${hash}"]`)
    .click();
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("button", { name: new RegExp(`${label}$`) }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function download(page: Page): Promise<AnalysisReport> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  return JSON.parse(await readFile((await (await event).path())!, "utf8"));
}
async function revealTokenValue(page: Page, id: string) {
  const row = page.locator(`[data-token-id="${id}"]`);
  const value = row.locator(".tokenValue");
  const table = page.getByRole("treegrid", { name: "Tokens", exact: true });
  await expect(table).toBeVisible();
  const bounds = (await table.boundingBox())!;
  expect(bounds.height).toBeGreaterThan(80);
  await page.mouse.move(
    bounds.x + Math.min(bounds.width / 2, 300),
    bounds.y + bounds.height / 2,
  );
  let visible = false;
  for (let step = 0; step < 90; step++) {
    if (await value.count())
      visible = await value.evaluate((element) => {
        const value = element.getBoundingClientRect();
        const table = element.closest('[role="treegrid"]')!;
        const body = table.getBoundingClientRect();
        const header = table
          .querySelector('[role="columnheader"]')
          ?.closest('[role="row"]')
          ?.getBoundingClientRect();
        return (
          value.top >= Math.max(body.top, header?.bottom ?? body.top, 0) &&
          value.bottom <= Math.min(body.bottom, innerHeight) &&
          value.left >= Math.max(body.left, 0) &&
          value.right <= Math.min(body.right, innerWidth)
        );
      });
    if (visible) break;
    await page.mouse.wheel(0, Math.floor(bounds.height / 2));
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }
  expect(visible).toBe(true);
  await expect(value).toBeInViewport({ ratio: 1 });
}

test("Repeated navigation, shell controls and resizing preserve authoring and release inactive work", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180_000);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-authoring-worker-ready",
    String(AUTHORING_RECORD_VERSION),
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.isEditing,
        AUTHORING_STORAGE_KEY,
      ),
    )
    .toBe(true);
  await expect(page.locator("html")).toHaveAttribute(
    "data-priority-workers-active",
    "0",
  );
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  const navigation = page.getByRole("navigation", {
    name: "Navigation",
    exact: true,
  });
  const main = page.locator('[data-component="BrowsingContext-main"]');
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const rounds: { round: number; heap: number; nodes: number }[] = [];
  try {
    for (let round = 0; round < 4; round++) {
      for (const route of [
        "foundations",
        "design",
        "tokens",
        "components",
        "logic",
        "modes",
        "registry",
        "analysis",
        "system-health",
        "themes",
        "platforms",
        "home",
      ]) {
        await navigate(page, route);
        await expect(navigation.locator(`a[href="#${route}"]`)).toHaveAttribute(
          "aria-current",
          "page",
        );
        await expect(main).not.toHaveAttribute("inert", "");
        await expect(
          main.locator('[data-derived-state="pending"]'),
        ).toHaveCount(0);
        await expect(page.locator("html")).toHaveAttribute(
          "data-priority-workers-active",
          "0",
        );
        await expect(page.locator(".tokenComboBoxMenuMeasurement")).toHaveCount(
          0,
        );
      }
      const appearance = page.getByRole("button", {
        name: "Dark app appearance",
        exact: true,
      });
      await appearance.click();
      await expect(appearance).toHaveAttribute(
        "aria-pressed",
        round % 2 === 0 ? "true" : "false",
      );
      const search = page.getByRole("button", { name: "Search", exact: true });
      await search.click();
      const field = page.getByRole("searchbox", {
        name: "Search design data",
        exact: true,
      });
      await expect(field).toBeFocused();
      await field.pressSequentially(`Round ${round + 1}`, { delay: 35 });
      await expect(field).toHaveValue(`Round ${round + 1}`);
      await field.press("Tab");
      await expect(field).toHaveCount(0);
      await navigation
        .getByRole("button", { name: "Collapse", exact: true })
        .click();
      await navigation
        .getByRole("button", { name: "Expand", exact: true })
        .click();
      await page.setViewportSize({
        width: round % 2 === 0 ? 1100 : 1600,
        height: 900,
      });
      expect(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          AUTHORING_STORAGE_KEY,
        ),
      ).toBe(before);
      await cdp.send("HeapProfiler.collectGarbage");
      const { metrics } = await cdp.send("Performance.getMetrics");
      const heap = metrics.find(
        (metric) => metric.name === "JSHeapUsedSize",
      )?.value;
      const nodes = metrics.find((metric) => metric.name === "Nodes")?.value;
      expect(heap).toBeDefined();
      expect(nodes).toBeDefined();
      rounds.push({ round, heap: heap!, nodes: nodes! });
    }
    expect(rounds.at(-1)!.heap - rounds[0].heap).toBeLessThan(16 * 1024 * 1024);
    expect(rounds.at(-1)!.nodes - rounds[0].nodes).toBeLessThan(512);
    await expect(page.locator("html")).toHaveAttribute(
      "data-priority-workers-active",
      "0",
    );
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        AUTHORING_STORAGE_KEY,
      ),
    ).toBe(before);
    await info.attach("shell-resource-observations", {
      contentType: "application/json",
      body: JSON.stringify({
        rounds,
        routesPerRound: 12,
        finalAuthoringUnchanged: true,
        limitations: [
          "Four local navigation rounds with collected garbage are a bounded resource smoke, not a long-running memory-leak proof.",
          "Functional navigation and shell checks are not interaction latency distributions.",
        ],
      }),
    });
  } finally {
    await cdp.detach();
  }
});

test("Production-safe authoring workers finish before independent contrast edits and never load DOM styles", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-authoring-worker-ready",
    String(AUTHORING_RECORD_VERSION),
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-component-contrast-proof",
    "true",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-component-color-proof",
    "true",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-component-scale-proof",
    /^[1-9]\d*$/,
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await navigate(page, "foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Contrasts");
  const slider = page.getByRole("slider", { name: "100", exact: true });
  const before = Number(await slider.inputValue());
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue((before + 0.01).toFixed(2));
  await expect
    .poll(
      async () =>
        await page.evaluate(
          (key) =>
            JSON.parse(localStorage.getItem(key) ?? "null")?.working.colorSystem
              .contrasts[0].value,
          AUTHORING_STORAGE_KEY,
        ),
    )
    .toBeGreaterThan(before);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-authoring-worker-ready",
    String(AUTHORING_RECORD_VERSION),
  );
});

for (const collapsed of [false, true])
  test(`Continuous contrast dragging preserves coherent feedback and the last release with Changes ${collapsed ? "collapsed" : "open"}`, async ({
    page,
    context,
  }, testInfo) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(
      "data-component-contrast-proof",
      "true",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-component-color-proof",
      "true",
    );
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await navigate(page, "foundations");
    await page.getByRole("tab", { name: "Colors", exact: true }).click();
    await selectColorPanelSection(page, "Contrasts");
    if (collapsed)
      await page
        .getByRole("banner")
        .getByRole("button", { name: /^Change log/ })
        .click();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.isEditing,
          AUTHORING_STORAGE_KEY,
        ),
      )
      .toBe(true);
    await expect(page.locator("html")).toHaveAttribute(
      "data-priority-workers-active",
      "0",
    );
    const before: { working: EditSessionSnapshot; saved: EditSessionSnapshot } =
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        AUTHORING_STORAGE_KEY,
      );
    const successfulAuthoring = Number(
      await page.locator("html").getAttribute("data-authoring-worker-results"),
    );
    const background = (await page
      .getByRole("button", { name: /^Copy resolved background color / })
      .getAttribute("aria-label"))!.replace(
      "Copy resolved background color ",
      "",
    );
    const slider = page.getByRole("slider", { name: "100", exact: true });
    await slider.scrollIntoViewIfNeeded();
    const geometry = await slider.evaluate((input: HTMLInputElement) => {
      const audit: ContinuousContrastAudit = (window.continuousContrastAudit = {
        running: true,
        dragging: false,
        input,
        moves: [],
        frames: [],
      });
      const row = input.closest("[data-contrast-id]")!;
      document.addEventListener(
        "pointerdown",
        (event) => {
          if (
            event.isTrusted &&
            event.target instanceof Node &&
            row.contains(event.target)
          )
            audit.dragging = true;
        },
        true,
      );
      document.addEventListener(
        "pointermove",
        (event) => {
          if (audit.dragging)
            audit.moves.push({
              epoch: performance.timeOrigin + performance.now(),
              x: event.clientX,
              trusted: event.isTrusted,
            });
        },
        true,
      );
      document.addEventListener(
        "pointerup",
        () => {
          audit.dragging = false;
        },
        true,
      );
      const frame = () => {
        if (!audit.running) return;
        audit.frames.push({
          epoch: performance.timeOrigin + performance.now(),
          value: Number(input.value),
          output: row.querySelector("output")!.textContent!,
          thumbX: input.parentElement!.parentElement!.getBoundingClientRect().x,
          ramp: Number.parseFloat(
            document.querySelector<HTMLElement>(
              '[aria-label="Contrast lightness ramp"] > span',
            )!.style.top,
          ),
        });
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      const track = input
        .closest<HTMLElement>('[data-orientation="horizontal"]')!
        .getBoundingClientRect();
      return {
        x: input.parentElement!.parentElement!.getBoundingClientRect().x,
        y: track.y + track.height / 2,
        width: track.width,
        id: row.getAttribute("data-contrast-id")!,
      };
    });
    const cdp = await context.newCDPSession(page);
    const sent: { index: number; epoch: number; x: number }[] = [];
    const pending: Promise<unknown>[] = [];
    const failures: string[] = [];
    try {
      await page.mouse.move(geometry.x, geometry.y);
      await page.mouse.down();
      expect(
        await page.evaluate(() => window.continuousContrastAudit.dragging),
      ).toBe(true);
      await new Promise<void>((resolve) => {
        for (let index = 0; index <= 80; index++)
          setTimeout(
            () => {
              const epoch = performance.timeOrigin + performance.now();
              const x =
                index === 80
                  ? sent[index - 1].x
                  : geometry.x +
                    (index < 40
                      ? ((index + 1) * 14) / 40
                      : 14 - ((index - 39) * 7) / 40);
              sent.push({ index, epoch, x });
              pending.push(
                cdp
                  .send("Input.dispatchMouseEvent", {
                    type: index === 80 ? "mouseReleased" : "mouseMoved",
                    x,
                    y: geometry.y,
                    button: "left",
                    buttons: index === 80 ? 0 : 1,
                    timestamp: epoch / 1000,
                    clickCount: index === 80 ? 1 : 0,
                    pointerType: "mouse",
                  })
                  .then(undefined, (failure: unknown) => {
                    failures.push(String(failure));
                  }),
              );
              if (index === 80) resolve();
            },
            ((index + 1) * 1000) / 60,
          );
      });
      await Promise.all(pending);
      expect(failures).toEqual([]);
      expect(
        await page.evaluate(() => window.continuousContrastAudit.dragging),
      ).toBe(false);
      const value = Number(await slider.inputValue());
      const previous = before.working.colorSystem.contrasts.find(
        (item) => item.id === geometry.id,
      )!;
      expect(value).not.toBe(previous.value);
      const expected = contrastForEffectiveEdit(
        previous,
        divideContrast(value, contrastMultiplier(before.working.colorSystem)),
        polarityContext(before.working.colorSystem),
      );
      await expect
        .poll(() =>
          page.evaluate(
            ({ key, id }) =>
              JSON.parse(
                localStorage.getItem(key)!,
              ).working.colorSystem.contrasts.find(
                (item: { id: string }) => item.id === id,
              ),
            { key: AUTHORING_STORAGE_KEY, id: geometry.id },
          ),
        )
        .toEqual(expected);
      await expect(page.locator("html")).toHaveAttribute(
        "data-priority-workers-active",
        "0",
      );
      expect(
        Number(
          await page
            .locator("html")
            .getAttribute("data-authoring-worker-results"),
        ),
      ).toBeGreaterThan(successfulAuthoring);
      await expect(page.locator('[data-derived-state="pending"]')).toHaveCount(
        0,
      );
      const after: {
        working: EditSessionSnapshot;
        saved: EditSessionSnapshot;
      } = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        AUTHORING_STORAGE_KEY,
      );
      expect(after.saved).toEqual(before.saved);
      expect(after.working).toEqual({
        ...before.working,
        colorSystem: {
          ...before.working.colorSystem,
          contrasts: before.working.colorSystem.contrasts.map((item) =>
            item.id === geometry.id ? expected : item,
          ),
        },
      });
      const audit = await page.evaluate(() => {
        const audit = window.continuousContrastAudit;
        return { moves: audit.moves, frames: audit.frames };
      });
      expect(audit.moves.length).toBeGreaterThanOrEqual(10);
      expect(audit.moves.every((move) => move.trusted)).toBe(true);
      const backgroundY = luminance(hexToLinear(background));
      const side = before.working.colorSystem.settings.side;
      const dark = side === "dark" || (side === "auto" && backgroundY > 0.1791);
      for (const frame of audit.frames) {
        expect(Number(frame.output)).toBe(frame.value);
        const target = targetLuminance(backgroundY, frame.value, dark);
        expect(frame.ramp).toBeCloseTo(
          (1 - linearToOklch([target, target, target])[0]) * 100,
          4,
        );
      }
      const tolerance = (geometry.width * 0.01) / 20 / 2 + 0.02;
      expect(
        audit.frames.some(
          (frame) =>
            frame.epoch >= sent[79].epoch &&
            Math.abs(frame.thumbX - sent[79].x) < tolerance,
        ),
      ).toBe(true);
      await testInfo.attach("continuous-contrast", {
        contentType: "application/json",
        body: JSON.stringify({ geometry, sent, audit, value, expected }),
      });
    } finally {
      await page.evaluate(() => {
        window.continuousContrastAudit.running = false;
      });
      await cdp.detach();
    }
  });

test("Uninterrupted Hex typing retains every character and persists the last canonical palette color", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-component-color-proof",
    "true",
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await navigate(page, "foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Palette");
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.isEditing,
        AUTHORING_STORAGE_KEY,
      ),
    )
    .toBe(true);
  await expect(page.locator("html")).toHaveAttribute(
    "data-priority-workers-active",
    "0",
  );
  const before: { working: EditSessionSnapshot; saved: EditSessionSnapshot } =
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      AUTHORING_STORAGE_KEY,
    );
  const trigger = page.getByRole("button", { name: /^Edit value of / }).first();
  const id = await trigger.evaluate(
    (element) =>
      element
        .closest("[data-palette-source]")!
        .getAttribute("data-palette-source")!,
  );
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: / value$/ });
  const field = dialog.getByRole("textbox", { name: "Hex", exact: true });
  await field.evaluate((input: HTMLInputElement) => {
    const audit: PickerTypingAudit = (window.pickerTypingAudit = {
      keys: [],
      inputs: [],
    });
    input.addEventListener(
      "keydown",
      (event) => {
        if (event.isTrusted && /^[0-9]$/.test(event.key))
          audit.keys.push({
            expected:
              input.value.slice(0, input.selectionStart!) +
              event.key +
              input.value.slice(input.selectionEnd!),
            trusted: event.isTrusted,
          });
      },
      true,
    );
    input.addEventListener(
      "input",
      (event) =>
        audit.inputs.push({ value: input.value, trusted: event.isTrusted }),
      true,
    );
  });
  await field.focus();
  await field.press("ControlOrMeta+A");
  const cdp = await context.newCDPSession(page);
  const sent: { index: number; epoch: number }[] = [];
  const pending: Promise<unknown>[] = [];
  const failures: string[] = [];
  const value = "336699";
  try {
    await new Promise<void>((resolve) => {
      for (let index = 0; index < value.length; index++)
        setTimeout(
          () => {
            const character = value[index],
              epoch = performance.timeOrigin + performance.now();
            const code = `Digit${character}`,
              windowsVirtualKeyCode = character.charCodeAt(0);
            sent.push({ index, epoch });
            for (const type of ["keyDown", "keyUp"])
              pending.push(
                cdp
                  .send("Input.dispatchKeyEvent", {
                    type,
                    key: character,
                    code,
                    windowsVirtualKeyCode,
                    timestamp: epoch / 1000,
                    ...(type === "keyDown" && {
                      text: character,
                      unmodifiedText: character,
                    }),
                  })
                  .then(undefined, (failure: unknown) => {
                    failures.push(String(failure));
                  }),
              );
            if (index === value.length - 1) resolve();
          },
          (index + 1) * 50,
        );
    });
    await Promise.all(pending);
    expect(failures).toEqual([]);
    await expect(field).toHaveValue(value);
    await expect(field).toBeFocused();
    await expect
      .poll(async () => {
        const source: EditSessionSnapshot = await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!).working,
          AUTHORING_STORAGE_KEY,
        );
        return paletteColorHex(
          source.colorSystem.palette.find((color) => color.id === id)!,
          source.colorSystem.settings.colorOutput,
        );
      })
      .toBe(`#${value}`);
    const after: { working: EditSessionSnapshot; saved: EditSessionSnapshot } =
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        AUTHORING_STORAGE_KEY,
      );
    expect(after.saved).toEqual(before.saved);
    expect(after.working).toEqual({
      ...before.working,
      colorSystem: {
        ...before.working.colorSystem,
        palette: before.working.colorSystem.palette.map((color) =>
          color.id === id
            ? after.working.colorSystem.palette.find((item) => item.id === id)!
            : color,
        ),
      },
    });
    const audit = await page.evaluate(() => window.pickerTypingAudit);
    expect(audit.keys.map((key) => key.expected)).toEqual(
      [...value].map((_, index) => value.slice(0, index + 1)),
    );
    expect(audit.inputs.map((input) => input.value)).toEqual(
      audit.keys.map((key) => key.expected),
    );
    expect(
      [...audit.keys, ...audit.inputs].every((event) => event.trusted),
    ).toBe(true);
    await testInfo.attach("uninterrupted-hex", {
      contentType: "application/json",
      body: JSON.stringify({ sent, audit }),
    });
    await dialog.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute(
      "data-priority-workers-active",
      "0",
    );
  } finally {
    await cdp.detach();
  }
});

test("Selected Analysis stays canonical, cancels replaced work and blocks stale downloads", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const expected = await computeAnalysisComparison({
    type: "compare",
    source: { dataset: "defaults" },
    reference,
  });
  await page.goto("/");
  await navigate(page, "analysis");
  await expect(
    page.getByRole("button", { name: "JSON", exact: true }),
  ).toBeEnabled();
  expect(await download(page)).toEqual(expected.report);
  await choose(page, "Analysis view", "Detailed comparison");
  await page
    .getByRole("searchbox", { name: "Search findings" })
    .fill("Priority fixture token");
  await expect(
    page.getByRole("grid", { name: "Analysis findings" }),
  ).toContainText("Priority fixture token");
  await page.getByRole("button", { name: "Evidence", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Finding evidence" }),
  ).toContainText("priority-fixture");
  const pattern = "**/*analysis.worker*";
  await page.route(pattern, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `${await response.text()}\nconst compute = self.onmessage; self.onmessage = event => setTimeout(() => compute.call(self, event), 750);`,
    });
  });
  await choose(page, "Comparison source", "Working authoring");
  await expect(
    page.getByRole("button", { name: "JSON", exact: true }),
  ).toBeDisabled();
  await choose(page, "Comparison source", "Saved authoring");
  await expect(
    page.getByRole("button", { name: "Markdown", exact: true }),
  ).toBeDisabled();
  await choose(page, "Comparison source", "Shipped defaults");
  await expect(
    page.getByRole("button", { name: "JSON", exact: true }),
  ).toBeEnabled();
  expect(await download(page)).toEqual(expected.report);
  await page.unroute(pattern);
  await choose(page, "Analysis view", "Alignment gap register");
  await expect(
    page.getByRole("region", { name: "Alignment gap register" }),
  ).toContainText("LTAX-001");
  await expect(
    page.getByRole("region", { name: "Alignment gap register" }),
  ).toContainText("unassessable");
  await expect(page.locator("html")).toHaveAttribute(
    "data-analysis-workers-active",
    "0",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-analysis-workers-peak",
    "1",
  );
  await navigate(page, "home");
  await expect(page.locator("html")).toHaveAttribute(
    "data-analysis-workers-active",
    "0",
  );
});

test("Analysis failure is explicit and retry restores the exact requested report", async ({
  page,
}) => {
  const pattern = "**/*analysis.worker*";
  await page.route(pattern, (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'self.onmessage = () => self.postMessage({ type: "error", error: "Injected Analysis failure" });',
    }),
  );
  await page.goto("/");
  await navigate(page, "analysis");
  await expect(
    page.getByText("Injected Analysis failure", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "JSON", exact: true }),
  ).toBeDisabled();
  await page.unroute(pattern);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "JSON", exact: true }),
  ).toBeEnabled();
  expect((await download(page)).inputs.app.kind).toBe("defaults");
  await expect(page.locator("html")).toHaveAttribute(
    "data-analysis-workers-active",
    "0",
  );
});

test("Reference refresh preserves canonical Analysis and explicit stale and partial evidence", async ({
  page,
}) => {
  test.setTimeout(60_000);
  let current = reference;
  let unavailable = false;
  let hold: Promise<void> | undefined;
  await page.route("**/__design-data/reference", async (route) => {
    if (hold) await hold;
    await route.fulfill(
      unavailable
        ? { status: 503, body: "Unavailable fixture" }
        : { json: current },
    );
  });
  const original = await computeAnalysisComparison({
    type: "compare",
    source: { dataset: "defaults" },
    reference,
  });
  await page.goto("/");
  await navigate(page, "analysis");
  await expect(
    page.getByRole("button", { name: "JSON", exact: true }),
  ).toBeEnabled();
  let release = () => {};
  hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  current = {
    ...reference,
    source: {
      ...reference.source,
      hash: "2".repeat(64),
      revision: "priority-refreshed",
    },
    records: [{ ...reference.records[0], value: 24 }],
  };
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  try {
    await expect(
      page.getByText("Refreshing reference", { exact: true }),
    ).toBeVisible();
    expect(await download(page)).toEqual(
      reportWithFreshness(original.report, "stale"),
    );
  } finally {
    hold = undefined;
    release();
  }
  await choose(page, "Analysis view", "Detailed comparison");
  await expect(page.getByTestId("analysis-provenance")).toContainText(
    "priority-refreshed",
  );
  await expect(
    page.getByRole("button", { name: "JSON", exact: true }),
  ).toBeEnabled();
  const refreshed = await computeAnalysisComparison({
    type: "compare",
    source: { dataset: "defaults" },
    reference: current,
  });
  expect(await download(page)).toEqual(refreshed.report);
  unavailable = true;
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(
    page.getByText("Reference request failed (503).", { exact: true }),
  ).toBeVisible();
  expect(await download(page)).toEqual(
    reportWithFreshness(refreshed.report, "stale"),
  );
  unavailable = false;
  current = {
    ...current,
    errors: ["Fixture inventory is incomplete."],
    inventoryStatus: "partial",
  };
  await page
    .getByRole("button", { name: "Refresh reference", exact: true })
    .click();
  await expect(page.getByText("partial", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "JSON", exact: true }),
  ).toBeEnabled();
  const partial = await download(page);
  expect(partial.valid).toBe(false);
  expect(partial.coverage.inventories.reference).toBe("partial");
  expect(partial).toEqual(
    (
      await computeAnalysisComparison({
        type: "compare",
        source: { dataset: "defaults" },
        reference: current,
      })
    ).report,
  );
});

test("Navigation and token search retain current scope, focus and dialog cleanup", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const tokens = createStore().get(browserTokensAtom);
  const expectedBlue = filterBrowserTokens(tokens, "all", "blue");
  const eligibleSpacing = filterBrowserTokens(tokens, "spacing", "").filter(
    isSelectableBrowserToken,
  );
  expect(expectedBlue.length).toBeGreaterThan(0);
  expect(eligibleSpacing.length).toBeGreaterThan(0);
  await page.goto("/");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.evaluate(() => {
    const main = document.querySelector("main")!;
    new MutationObserver((records) => {
      if (
        main.inert ||
        records.some(
          (record) =>
            record.attributeName === "inert" && record.oldValue !== null,
        )
      ) {
        document.documentElement.dataset.pendingNavigationObserved = "true";
      }
    }).observe(main, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["inert"],
    });
  });
  await navigate(page, "tokens");
  const search = page.getByRole("searchbox", {
    name: "Search tokens",
    exact: true,
  });
  const table = page.getByRole("treegrid", { name: "Tokens", exact: true });
  await expect(search).toBeVisible();
  await search.pressSequentially("red", { delay: 5 });
  await search.fill("blue");
  await expect(search).toBeFocused();
  await expect(page.locator(".tokenBrowserSummary")).toHaveText(
    `${expectedBlue.length} tokens`,
  );
  await expect(page.locator(".tokenCollectionScroll")).not.toHaveAttribute(
    "inert",
  );
  const blueIds = new Set(expectedBlue.map((token) => token.id));
  const rendered = await table
    .locator("[data-token-id]")
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute("data-token-id")!),
    );
  expect(rendered.length).toBeGreaterThan(0);
  expect(rendered.every((id) => blueIds.has(id))).toBe(true);
  await search.fill("priority-search-no-matches");
  await expect(table).toContainText(
    'No tokens match "priority-search-no-matches".',
  );
  await expect(search).toBeFocused();
  await search.fill("");
  await page.getByRole("radio", { name: "Spacing", exact: true }).click();
  await table
    .getByRole("checkbox", { name: "Select all", exact: true })
    .press("Space");
  await expect(page.locator(".tokenBrowserSummary")).toContainText(
    `${eligibleSpacing.length} selected`,
  );
  const bulk = page.getByRole("button", { name: "Bulk edit", exact: true });
  await expect(bulk).toBeVisible();
  await expect
    .poll(() =>
      bulk.evaluate((button) => {
        for (
          let element: Element | null = button;
          element;
          element = element.parentElement
        ) {
          if (
            element
              .getAnimations()
              .some(
                (animation) =>
                  animation.pending || animation.playState === "running",
              )
          )
            return false;
        }
        return true;
      }),
    )
    .toBe(true);
  await bulk.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page.locator(".tokenBrowserSummary")).toContainText(
    `${eligibleSpacing.length} selected`,
  );
  await navigate(page, "home");
  await navigate(page, "components");
  await navigate(page, "tokens");
  await expect(search).toHaveValue("");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Bulk edit", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("main")).not.toHaveAttribute("inert");
  await expect(page.locator("html")).toHaveAttribute(
    "data-pending-navigation-observed",
    "true",
  );
});

for (const trigger of ["keyboard", "pointer"])
  test(`Deferred Tokens preserve atomic bulk edits, exact filtered scope, focus and the saved baseline (${trigger})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-authoring-worker-ready",
      String(AUTHORING_RECORD_VERSION),
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-priority-workers-active",
      "0",
    );
    await expect
      .poll(() =>
        page.evaluate(
          (key) =>
            JSON.parse(localStorage.getItem(key) ?? "null")?.isEditing === true,
          AUTHORING_STORAGE_KEY,
        ),
      )
      .toBe(true);
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key)!,
      AUTHORING_STORAGE_KEY,
    );
    const before: { working: EditSessionSnapshot; saved: EditSessionSnapshot } =
      JSON.parse(stored);
    const store = createStore();
    store.set(restoreAuthoringSnapshotAtom, before.working);
    store.set(enterEditModeAtom);
    const tokens = store.get(browserTokensAtom);
    const targets = filterBrowserTokens(tokens, "spacing", "100").filter(
      isSelectableBrowserToken,
    );
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.length).toBeLessThan(
      tokens.filter((token) => token.type === "spacing").length,
    );
    store.set(editBrowserTokensAtom, {
      ids: targets.map((token) => token.id),
      modeKey: store.get(browserModeContextAtom).key,
      patch: { value: 23 },
    });
    const expected = captureSnapshot(store.get);
    await navigate(page, "tokens");
    await page.getByRole("radio", { name: "Spacing", exact: true }).click();
    const search = page.getByRole("searchbox", {
      name: "Search tokens",
      exact: true,
    });
    await search.fill("100");
    const selectAll = page
      .getByRole("treegrid", { name: "Tokens", exact: true })
      .getByRole("checkbox", { name: "Select all", exact: true });
    await selectAll.press("Space");
    await expect(page.locator(".tokenBrowserSummary")).toContainText(
      `${targets.length} selected`,
    );
    const bulk = page.getByRole("button", { name: "Bulk edit", exact: true });
    if (trigger === "keyboard") {
      await bulk.focus();
      await expect(bulk).toBeFocused();
      await bulk.press("Enter");
    } else {
      await expect
        .poll(() =>
          bulk.evaluate((button) => {
            for (
              let element: Element | null = button;
              element;
              element = element.parentElement
            ) {
              if (
                element
                  .getAnimations()
                  .some(
                    (animation) =>
                      animation.pending || animation.playState === "running",
                  )
              )
                return false;
            }
            return true;
          }),
        )
        .toBe(true);
      await bulk.click();
    }
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "Replacement value", exact: true })
      .fill("invalid");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      dialog
        .getByRole("alert")
        .filter({ hasText: "Enter a non-negative numeric value." }),
    ).toHaveText("Enter a non-negative numeric value.");
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        AUTHORING_STORAGE_KEY,
      ),
    ).toBe(stored);
    await dialog
      .getByRole("textbox", { name: "Replacement value", exact: true })
      .fill("23");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!).working,
          AUTHORING_STORAGE_KEY,
        ),
      )
      .toEqual(expected);
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).saved,
        AUTHORING_STORAGE_KEY,
      ),
    ).toEqual(before.saved);
    await expect(
      trigger === "keyboard"
        ? bulk
        : page.locator('[data-token-root="true"]').first(),
    ).toBeFocused();
    for (const token of targets) {
      await search.fill(token.name);
      await expect(
        page.locator(`[data-token-id="${token.id}"] .tokenValue`),
      ).toHaveText(tokenValueText({ ...token, value: 23 }));
    }
    await expect(page.locator(".tokenCollectionScroll")).not.toHaveAttribute(
      "inert",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-priority-workers-active",
      "0",
    );
  });

for (const action of ["save", "cancel", "save-and-search"])
  test(`Deferred full Tokens restore collection focus after row dialogs without stealing a new focus choice (${action})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-authoring-worker-ready",
      String(AUTHORING_RECORD_VERSION),
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-priority-workers-active",
      "0",
    );
    await expect
      .poll(() =>
        page.evaluate(
          (key) =>
            JSON.parse(localStorage.getItem(key) ?? "null")?.isEditing === true,
          AUTHORING_STORAGE_KEY,
        ),
      )
      .toBe(true);
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key)!,
      AUTHORING_STORAGE_KEY,
    );
    const before: { working: EditSessionSnapshot; saved: EditSessionSnapshot } =
      JSON.parse(stored);
    const store = createStore();
    store.set(restoreAuthoringSnapshotAtom, before.working);
    store.set(enterEditModeAtom);
    const token = store
      .get(browserTokensAtom)
      .find(
        (token) =>
          token.type === "spacing" &&
          isSelectableBrowserToken(token) &&
          token.status === "draft",
      )!;
    await navigate(page, "tokens");
    await expect(page.locator(".tokenCollectionScroll")).not.toHaveAttribute(
      "inert",
    );
    await revealTokenValue(page, token.id);
    const row = page.locator(`[data-token-id="${token.id}"]`);
    const replacement = "23";
    store.set(editBrowserTokensAtom, {
      ids: [token.id],
      modeKey: store.get(browserModeContextAtom).key,
      patch: {
        value: parseBrowserTokenValue(token, replacement),
        status: "draft",
        ...(token.description === undefined ? { description: "" } : {}),
      },
    });
    const expected = captureSnapshot(store.get);
    const open = row.getByRole("button", {
      name: `Open ${token.name}`,
      exact: true,
    });
    await open.focus();
    await expect(open).toBeFocused();
    await open.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "Value", exact: true })
      .fill(replacement);
    const deferred = (await page.locator(".tokenCollectionWork").count()) > 0;
    if (action === "save-and-search")
      await page.evaluate(() => {
        const observer = new MutationObserver(() => {
          if (document.querySelector(".tokenDetailsFields")) return;
          observer.disconnect();
          const search = document.querySelector<HTMLInputElement>(
            'input[aria-label="Search tokens"]',
          )!;
          search.focus();
          document.documentElement.dataset.tokenSearchFocusDuringPending =
            String(
              document
                .querySelector(".tokenCollectionWork [data-derived-state]")
                ?.getAttribute("data-derived-state") === "pending" &&
                document.activeElement === search,
            );
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-derived-state"],
        });
      });
    await dialog
      .getByRole("button", {
        name: action === "cancel" ? "Cancel" : "Save",
        exact: true,
      })
      .click();
    await expect(dialog).toHaveCount(0);
    const search = page.getByRole("searchbox", {
      name: "Search tokens",
      exact: true,
    });
    if (action === "save-and-search" && deferred)
      await expect(page.locator("html")).toHaveAttribute(
        "data-token-search-focus-during-pending",
        "true",
      );
    if (action === "cancel") {
      expect(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          AUTHORING_STORAGE_KEY,
        ),
      ).toBe(stored);
    } else {
      await expect
        .poll(() =>
          page.evaluate(
            (key) => JSON.parse(localStorage.getItem(key)!).working,
            AUTHORING_STORAGE_KEY,
          ),
        )
        .toEqual(expected);
      expect(
        await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!).saved,
          AUTHORING_STORAGE_KEY,
        ),
      ).toEqual(before.saved);
    }
    await expect(page.locator(".tokenCollectionScroll")).not.toHaveAttribute(
      "inert",
    );
    if (action === "save-and-search") await expect(search).toBeFocused();
    else
      await expect
        .poll(() =>
          page
            .locator(".tokenCollectionScroll")
            .evaluate((collection) =>
              collection.contains(document.activeElement),
            ),
        )
        .toBe(true);
    await expect(page.locator("html")).toHaveAttribute(
      "data-priority-workers-active",
      "0",
    );
  });

for (const scope of ["filtered", "all"])
  test(`Adaptive Text size preserves canonical token values, review warnings and untouched authoring through reset and reload (${scope})`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-authoring-worker-ready",
      String(AUTHORING_RECORD_VERSION),
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-priority-workers-active",
      "0",
    );
    await expect
      .poll(() =>
        page.evaluate(
          (key) =>
            JSON.parse(localStorage.getItem(key) ?? "null")?.isEditing === true,
          AUTHORING_STORAGE_KEY,
        ),
      )
      .toBe(true);
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key)!,
      AUTHORING_STORAGE_KEY,
    );
    const source: EditSessionSnapshot = JSON.parse(stored).working;
    const output = Array.from({ length: 5 }, (_, zoom) =>
      typographyTokenValues(
        generateTypography(
          source.typography,
          zoom,
          source.rules,
          source.scaleTypes,
          source.interpolations,
        ),
        source.taxonomy,
        {
          names: source.typography.metricNames,
          registry: source.taxonomy,
          outputUnit: source.typography.outputUnit,
        },
      ),
    );
    const target = output[0].find((token) => token.group.id === "font-size")!;
    const values = output.map((tokens) =>
      tokenValueText({
        value: tokens.find((token) => token.id === target.id)!.value,
        unit: "px",
        displayUnit: source.typography.outputUnit,
      }),
    );
    const store = createStore();
    store.set(restoreAuthoringSnapshotAtom, source);
    const tokens = store.get(browserTokensAtom);
    const assessment = assessClassificationStandard(
      source.taxonomy,
      tokens
        .filter((token) => !token.alias)
        .map((token) => ({
          id: token.id,
          scope: token.semantic ? "structures" : token.type,
          classification: token.projection?.classification,
          projectionIssues: token.projection?.issues,
          measurement: token.measurement,
        })),
    );
    const reviewed = assessment.occurrences.some(
      (entry) =>
        entry.recordKind === "token-usage" &&
        entry.recordId === target.id &&
        entry.fixRequired,
    );
    await navigate(page, "tokens");
    const row = page.locator(`[data-token-id="${target.id}"]`);
    const value = row.locator(".tokenValue");
    if (scope === "filtered") {
      await page
        .getByRole("radio", { name: "Typography", exact: true })
        .click();
      await page
        .getByRole("searchbox", { name: "Search tokens", exact: true })
        .fill(target.name);
    } else {
      await expect(
        page.getByRole("radio", { name: "All", exact: true }),
      ).toBeChecked();
      await expect(
        page.getByRole("searchbox", { name: "Search tokens", exact: true }),
      ).toHaveValue("");
      await revealTokenValue(page, target.id);
    }
    await expect(value).toHaveText(values[0]);
    const boundary = page.locator(".tokenCollectionWork [data-derived-state]");
    await expect(boundary).toHaveAttribute("data-derived-state", "ready");
    await page.evaluate(() => {
      const boundary = document.querySelector(
        ".tokenCollectionWork [data-derived-state]",
      )!;
      new MutationObserver((records) => {
        if (
          boundary.getAttribute("data-derived-state") === "pending" ||
          records.some((record) => record.oldValue === "pending")
        ) {
          document.documentElement.dataset.tokenCollectionPendingObserved =
            "true";
        }
        if (
          boundary.getAttribute("data-derived-state") === "pending" &&
          !document.querySelector<HTMLElement>(".tokenCollectionScroll")!.inert
        ) {
          document.documentElement.dataset.tokenCollectionUnsafePending =
            "true";
        }
      }).observe(boundary, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ["data-derived-state"],
      });
    });
    await page
      .getByRole("button", { name: "Adaptive controls", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Adaptive controls",
      exact: true,
    });
    const slider = dialog.getByRole("slider", {
      name: "Text size",
      exact: true,
    });
    await slider.focus();
    let current = 0;
    for (const key of [
      "ArrowRight",
      "ArrowRight",
      "ArrowRight",
      "ArrowRight",
      "ArrowLeft",
      "ArrowLeft",
      "ArrowLeft",
      "ArrowLeft",
    ]) {
      current += key === "ArrowRight" ? 1 : -1;
      await slider.press(key);
      await expect(slider).toHaveValue(String(current));
      await expect(slider).toBeFocused();
      await expect(value).toHaveText(values[current]);
      await expect(
        row.getByText(CLASSIFICATION_REVIEW_LABEL, { exact: true }),
      ).toHaveCount(reviewed ? 1 : 0);
    }
    await dialog
      .getByRole("button", { name: "Reset to mode values", exact: true })
      .click();
    await expect(slider).toHaveValue("0");
    await expect(
      dialog.getByRole("button", { name: "Reset to mode values", exact: true }),
    ).toBeDisabled();
    await slider.press("ArrowRight");
    await expect(value).toHaveText(values[1]);
    await dialog.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(boundary).toHaveAttribute("data-derived-state", "ready");
    await expect(page.locator("html")).toHaveAttribute(
      "data-token-collection-pending-observed",
      "true",
    );
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-token-collection-unsafe-pending",
      "true",
    );
    await page.getByRole("radio", { name: "Typography", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Search tokens", exact: true })
      .fill(target.name);
    await page.getByRole("radio", { name: "Grid view", exact: true }).click();
    const card = page.locator(`.tokenCardSection [data-key="${target.id}"]`);
    await expect(card.getByText(target.name, { exact: true })).toBeVisible();
    await expect(card.getByText(values[1], { exact: true })).toBeVisible();
    await expect(
      card.getByText(CLASSIFICATION_REVIEW_LABEL, { exact: true }),
    ).toHaveCount(reviewed ? 1 : 0);
    await page.getByRole("radio", { name: "List view", exact: true }).click();
    await expect(page.locator(".tokenBrowser").getByRole("alert")).toHaveCount(
      0,
    );
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        AUTHORING_STORAGE_KEY,
      ),
    ).toBe(stored);
    await page.reload();
    await navigate(page, "tokens");
    await page.getByRole("radio", { name: "Typography", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Search tokens", exact: true })
      .fill(target.name);
    await expect(value).toHaveText(values[0]);
    await expect(
      row.getByText(CLASSIFICATION_REVIEW_LABEL, { exact: true }),
    ).toHaveCount(reviewed ? 1 : 0);
    await expect(page.locator("html")).toHaveAttribute(
      "data-priority-workers-active",
      "0",
    );
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        AUTHORING_STORAGE_KEY,
      ),
    ).toEqual(JSON.parse(stored));
  });

test("Automatic persistence stores current edits and preserves the saved baseline through reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await navigate(page, "foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Contrasts");
  const slider = page.getByRole("slider", { name: "100", exact: true });
  const original = Number(await slider.inputValue());
  for (let index = 0; index < 3; index++) await slider.press("ArrowRight");
  const current = Number(await slider.inputValue());
  expect(current).toBeGreaterThan(original);
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw
          ? JSON.parse(raw).working.colorSystem.contrasts[0].value
          : undefined;
      }, AUTHORING_STORAGE_KEY),
    )
    .toBeCloseTo(current, 2);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
  expect(saved.version).toBe(AUTHORING_RECORD_VERSION);
  expect(saved.saved.colorSystem.contrasts[0].value).toBeCloseTo(original, 2);
  await page.reload();
  await navigate(page, "foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Contrasts");
  await expect(slider).toHaveValue(String(current));
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeVisible();
  const reverted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
  expect(reverted.working.colorSystem.contrasts[0].value).toBeCloseTo(
    original,
    2,
  );
  expect(reverted.isEditing).toBe(false);
});

test("Contrast rows preserve nearby feedback, ordered Undo and Save/Cancel during pending work", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await navigate(page, "foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Contrasts");
  const first = page.getByRole("slider", { name: "100", exact: true });
  const second = page.getByRole("slider", { name: "200", exact: true });
  const secondValue = await second.inputValue();
  const ramp = page
    .locator('[aria-label="Contrast lightness ramp"] > span')
    .first();
  const oldPosition = await ramp.getAttribute("style");
  await first.press("ArrowRight");
  await expect(first).toBeFocused();
  await expect(ramp).not.toHaveAttribute("style", oldPosition!);
  await expect(second).toHaveValue(secondValue);
  const rows = page.locator("[data-contrast-id]");
  const count = await rows.count();
  const beforeIds = await rows.evaluateAll((items) =>
    items.map((item) => item.getAttribute("data-contrast-id")!),
  );
  await page.getByRole("button", { name: "Add contrast", exact: true }).click();
  await expect(rows).toHaveCount(count + 1);
  const addedIds = await rows.evaluateAll((items) =>
    items.map((item) => item.getAttribute("data-contrast-id")!),
  );
  const id = addedIds.find((candidate) => !beforeIds.includes(candidate))!;
  const added = page.locator(`[data-contrast-id="${id}"]`);
  await added.getByRole("button", { name: /^Remove contrast/ }).click();
  await expect(rows).toHaveCount(count);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(rows).toHaveCount(count + 1);
  expect(
    await rows.evaluateAll((items) =>
      items.map((item) => item.getAttribute("data-contrast-id")!),
    ),
  ).toEqual(addedIds);
  const pattern = "**/*recordPreparation.worker*";
  await page.route(pattern, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `${await response.text()}\nconst compute = self.onmessage; self.onmessage = event => setTimeout(() => compute.call(self, event), 750);`,
    });
  });
  await first.press("ArrowRight");
  const current = Number(await first.inputValue());
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
  expect(saved.working.colorSystem.contrasts).toEqual(
    saved.saved.colorSystem.contrasts,
  );
  expect(saved.saved.colorSystem.contrasts[0].value).toBeCloseTo(current, 2);
  expect(
    saved.saved.colorSystem.contrasts.map(
      (contrast: { id: string }) => contrast.id,
    ),
  ).toContain(id);
  await first.press("ArrowLeft");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeVisible();
  const reverted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
  expect(reverted.working.colorSystem.contrasts).toEqual(
    saved.saved.colorSystem.contrasts,
  );
  await page.unroute(pattern);
});

test("Complete application CSS copies exact bytes and cannot copy an obsolete source", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const store = createStore();
  const expected = buildColorLibrary(
    store.get(cssBaseDocumentAtom),
    store.get(colorSchemeDocumentsAtom),
    store.get(contrastModesAtom),
    store.get(scaleModeDocumentsAtom),
    store.get(taxonomyDocumentAtom),
    store.get(rulesAtom),
    store.get(customContrastModeDocumentsAtom),
  );
  await page.goto("/");
  const documentStart = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await navigate(page, "foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page.getByRole("radio", { name: "Code", exact: true }).press("Space");
  const code = page.locator('[data-view="code"] [data-code-block] > code');
  const copy = page.getByRole("button", { name: "Copy CSS", exact: true });
  await expect(copy).toBeEnabled();
  expect(await code.textContent()).toBe(expected);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStart);
  await copy.click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    expected,
  );
  const pattern = "**/*cssLibrary.worker*";
  await page.route(pattern, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `${await response.text()}\nconst compute = self.onmessage; self.onmessage = event => setTimeout(() => compute.call(self, event), 750);`,
    });
  });
  await selectColorPanelSection(page, "Contrasts");
  await page
    .getByRole("slider", { name: "100", exact: true })
    .press("ArrowRight");
  await expect(copy).toBeDisabled();
  await expect(copy).toBeEnabled();
  const updated = await code.textContent();
  expect(updated).not.toBe(expected);
  await copy.click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    updated,
  );
  await page.unroute(pattern);
});

test("Typography keeps exact active CSS variables, inline previews and complete exports after base-size editing", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await navigate(page, "foundations");
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  const field = page.getByRole("textbox", {
    name: "Base size (rem)",
    exact: true,
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-component-color-proof",
    "true",
  );
  await field.fill("1.0625");
  await field.press("Enter");
  await expect(field).toHaveValue("1.0625");
  const preview = page.locator(".typographyRampPreview");
  await expect(preview).toHaveAttribute("data-text-zoom", "0");
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const working = JSON.parse(
          localStorage.getItem(key) ?? "null",
        )?.working;
        return working?.scaleTypes.find(
          (formula: { kind: string }) => formula.kind === "type-scale",
        )?.base.default;
      }, AUTHORING_STORAGE_KEY),
    )
    .toBe(17);
  const source: EditSessionSnapshot = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).working,
    AUTHORING_STORAGE_KEY,
  );
  const tokens = generateTypography(
    source.typography,
    0,
    source.rules,
    source.scaleTypes,
    source.interpolations,
  );
  const values = typographyTokenValues(tokens, undefined, {
    registry: source.taxonomy!,
    names: source.typography.metricNames,
  });
  const computed = await preview.evaluate(
    (element, names) =>
      Object.fromEntries(
        names.map((name) => [
          name,
          getComputedStyle(element).getPropertyValue(`--${name}`).trim(),
        ]),
      ),
    values.map((value) => value.name),
  );
  const expectedPreview = buildTypographyCss(source.typography, {
    scope: ".typographyRampPreview",
    purpose: "authoring",
    rules: source.rules,
    scaleTypes: source.scaleTypes,
    interpolations: source.interpolations,
    registry: source.taxonomy,
  });
  const declarations = Object.fromEntries(
    [...expectedPreview.split("\n\n")[0].matchAll(/--([^:]+): ([^;]+);/g)].map(
      ([, name, value]) => [name, value],
    ),
  );
  expect(computed).toEqual(declarations);
  expect(
    await preview
      .locator(
        ".typographyElement:not(.typographyElementHeader) .typographyElementSample",
      )
      .evaluateAll((elements) =>
        elements.map((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        ),
      ),
  ).toEqual(tokens.map((token) => token.fontSize));
  await page.getByRole("radio", { name: "Code", exact: true }).press("Space");
  const code = page.locator('[data-view="code"] [data-code-block] > code');
  const copy = page.getByRole("button", { name: "Copy CSS", exact: true });
  await expect(copy).toBeEnabled();
  for (const strict of [false, true]) {
    if (strict) {
      const naming = page.getByRole("checkbox", {
        name: "Use registered taxonomy names",
        exact: true,
      });
      await naming.press("Space");
      await expect(naming).toBeChecked();
    }
    const expected = buildTypographyCss(source.typography, {
      rules: source.rules,
      scaleTypes: source.scaleTypes,
      interpolations: source.interpolations,
      registry: source.taxonomy,
      ...(strict && { taxonomy: source.taxonomy }),
    });
    await expect.poll(() => code.textContent()).toBe(expected);
    await copy.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      expected,
    );
  }
});

test("Typography keeps local header text responsive and settles the latest coherent preview", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-authoring-worker-ready",
    String(AUTHORING_RECORD_VERSION),
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-component-color-proof",
    "true",
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await navigate(page, "foundations");
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.isEditing,
        AUTHORING_STORAGE_KEY,
      ),
    )
    .toBe(true);
  const preview = page.locator(".typographyRampPreview");
  const boundary = preview.locator("xpath=ancestor::*[@data-derived-state][1]");
  await expect(boundary).toHaveAttribute("data-derived-state", "ready");
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  await boundary.evaluate((element) => {
    const observer = new MutationObserver((records) => {
      if (
        element.getAttribute("data-derived-state") === "pending" ||
        records.some((record) => record.oldValue === "pending")
      ) {
        element.setAttribute("data-observed-pending", "true");
        observer.disconnect();
      }
    });
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-derived-state"],
      attributeOldValue: true,
    });
  });
  const sample = page.getByRole("textbox", {
    name: "Sample text",
    exact: true,
  });
  await sample.fill("Latest local sample");
  await expect(sample).toHaveValue("Latest local sample");
  await expect(sample).toBeFocused();
  await expect(boundary).toHaveAttribute("data-observed-pending", "true");
  await expect(boundary).toHaveAttribute("data-derived-state", "ready");
  expect(
    await preview
      .locator(
        ".typographyElement:not(.typographyElementHeader) .typographyElementSample",
      )
      .allTextContents(),
  ).toEqual(
    Array(
      await preview
        .locator(".typographyElement:not(.typographyElementHeader)")
        .count(),
    ).fill("Latest local sample"),
  );
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(before);
  const base = page.getByRole("textbox", {
    name: "Base size (rem)",
    exact: true,
  });
  for (const value of ["1.125", "1.0625"]) {
    await base.fill(value);
    await base.press("Enter");
  }
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).working.scaleTypes.find(
            (formula: { kind: string }) => formula.kind === "type-scale",
          ).base.default,
        AUTHORING_STORAGE_KEY,
      ),
    )
    .toBe(17);
  await expect(boundary).toHaveAttribute("data-derived-state", "ready");
  let source: EditSessionSnapshot = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).working,
    AUTHORING_STORAGE_KEY,
  );
  await page
    .locator('[data-component="FoundationsTypographyPanel"]')
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  await choose(page, "Output format", "px");
  await choose(
    page,
    "Sample line height",
    lineHeightName(source.typography, source.taxonomy, "heading"),
  );
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).working.typography,
        AUTHORING_STORAGE_KEY,
      ),
    )
    .toMatchObject({ outputUnit: "px", previewLineHeightId: "heading" });
  await expect(boundary).toHaveAttribute("data-derived-state", "ready");
  source = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).working,
    AUTHORING_STORAGE_KEY,
  );
  const tokens = generateTypography(
    source.typography,
    0,
    source.rules,
    source.scaleTypes,
    source.interpolations,
  );
  expect(
    await preview
      .locator(
        ".typographyElement:not(.typographyElementHeader) .typographyElementSample",
      )
      .evaluateAll((elements) =>
        elements.map((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        ),
      ),
  ).toEqual(tokens.map((token) => token.fontSize));
  expect(
    await preview
      .locator(
        '.typographyElement:not(.typographyElementHeader) [data-metric="font-size"]',
      )
      .allTextContents(),
  ).toEqual(
    tokens.map((token) =>
      formatTypographyLength(token.fontSize, source.typography.outputUnit),
    ),
  );
  const multipliers = await preview
    .locator(
      ".typographyElement:not(.typographyElementHeader) .typographyElementSample",
    )
    .evaluateAll((elements) =>
      elements.map((element) =>
        Number.parseFloat((element as HTMLElement).style.lineHeight),
      ),
    );
  multipliers.forEach((multiplier, index) =>
    expect(multiplier).toBeCloseTo(
      tokens[index].lineHeights.heading.multiplier,
      5,
    ),
  );
  await expect
    .poll(() => page.locator('[data-view="elements"] style').textContent())
    .toBe(
      buildTypographyCss(source.typography, {
        scope: ".typographyRampPreview",
        purpose: "authoring",
        rules: source.rules,
        scaleTypes: source.scaleTypes,
        interpolations: source.interpolations,
        registry: source.taxonomy,
      }),
    );
});
