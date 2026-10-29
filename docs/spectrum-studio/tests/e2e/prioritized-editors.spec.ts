// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createStore } from "jotai";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import {
  restoreAuthoringSnapshotAtom,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import { openTaxonomyCell } from "./taxonomyCell";
import { browserTokensAtom } from "../../src/features/tokens/browserState";
import { taxonomyTokenTree } from "../../src/features/taxonomy/tree";
import {
  compactTokenTableTree,
  type TokenTablePresentationRow,
} from "../../src/features/tokens/view/tokenTablePresentation";
import { primitiveReferencesAtom } from "../../src/features/tokens/primitiveReferenceState";
import {
  assignStructure,
  structureSelection,
} from "../../src/features/structures/model";
import { resolveStructure } from "../../src/features/structures/resolution";

interface EditorObservation {
  name: string;
  start: number;
  end?: number;
  events: { type: string; duration: number; start: number }[];
  tasks: { duration: number; start: number }[];
  fields: {
    before: string;
    expected: string;
    input?: string;
    frame?: string;
    frameMs?: number;
  }[];
}
interface EditorAudit {
  observations: EditorObservation[];
  current?: EditorObservation;
  workerErrors: string[];
  activeWorkers: number;
  peakWorkers: number;
  authoringResults: number;
  colorResults: number;
  validationResults: { valid: boolean; error?: string }[];
  activeValidationWorkers: number;
  peakValidationWorkers: number;
  wheels: { trusted: boolean; target: string | null; deltaY: number }[];
}
interface StructureSelectionAudit {
  running: boolean;
  keys: { epoch: number; key: string; focused: string | null }[];
  frames: { epoch: number; selected: string | null; delivered: number }[];
}
declare global {
  interface Window {
    priorityEditorAudit: EditorAudit;
    priorityStructureSelectionAudit: StructureSelectionAudit;
    structureEditPendingAudit: {
      states: boolean[];
      observer: MutationObserver;
    };
    releasePriorityValidation?: () => void;
    releasePriorityCatalogProof?: () => void;
    registryReviewPendingAudit: {
      states: (string | null)[];
      observer: MutationObserver;
    };
  }
}

test.use({ viewport: { width: 1600, height: 1000 } });
test.setTimeout(60_000);
const errors = new WeakMap<Page, string[]>();
const expectedWorkerErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  await page.addInitScript(() => {
    const audit: EditorAudit = (window.priorityEditorAudit = {
      observations: [],
      workerErrors: [],
      activeWorkers: 0,
      peakWorkers: 0,
      authoringResults: 0,
      colorResults: 0,
      validationResults: [],
      activeValidationWorkers: 0,
      peakValidationWorkers: 0,
      wheels: [],
    });
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      private active = true;
      private validation: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.validation = String(url).includes("taxonomyValidation.worker");
        if (this.validation)
          audit.peakValidationWorkers = Math.max(
            audit.peakValidationWorkers,
            ++audit.activeValidationWorkers,
          );
        audit.peakWorkers = Math.max(audit.peakWorkers, ++audit.activeWorkers);
        this.addEventListener("error", (event) =>
          audit.workerErrors.push(`${String(url)}: ${event.message}`),
        );
        this.addEventListener("message", (event) => {
          if (event.data.type === "error")
            audit.workerErrors.push(event.data.error);
          if (
            event.data.type === "ready" &&
            String(url).includes("recordPreparation.worker")
          ) {
            audit.authoringResults += 1;
            if (event.data.value.componentColorWitness?.tokens.length)
              audit.colorResults += 1;
          }
          if (event.data.type === "ready" && this.validation)
            audit.validationResults.push(event.data.value);
        });
      }
      terminate() {
        if (this.active) {
          this.active = false;
          audit.activeWorkers -= 1;
          if (this.validation) audit.activeValidationWorkers -= 1;
        }
        super.terminate();
      }
    };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const observation = audit.observations.findLast(
          (item) =>
            entry.startTime >= item.start &&
            (item.end === undefined || entry.startTime <= item.end),
        );
        observation?.events.push({
          type: entry.name,
          duration: entry.duration,
          start: entry.startTime,
        });
      }
    }).observe({ type: "event", durationThreshold: 16 });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const observation = audit.observations.findLast(
          (item) =>
            entry.startTime >= item.start &&
            (item.end === undefined || entry.startTime <= item.end),
        );
        observation?.tasks.push({
          duration: entry.duration,
          start: entry.startTime,
        });
      }
    }).observe({ type: "longtask" });
    document.addEventListener(
      "keydown",
      (event) => {
        const input = event.target;
        if (
          !audit.current ||
          !event.isTrusted ||
          event.key.length !== 1 ||
          event.metaKey ||
          event.ctrlKey ||
          !(
            input instanceof HTMLInputElement ||
            input instanceof HTMLTextAreaElement
          )
        )
          return;
        const sample: EditorObservation["fields"][number] = {
          before: input.value,
          expected:
            input.value.slice(0, input.selectionStart ?? input.value.length) +
            event.key +
            input.value.slice(input.selectionEnd ?? input.value.length),
        };
        audit.current.fields.push(sample);
        requestAnimationFrame(() => {
          sample.frame = input.value;
          sample.frameMs = performance.now() - event.timeStamp;
        });
      },
      true,
    );
    document.addEventListener(
      "input",
      (event) => {
        if (
          !event.isTrusted ||
          !(
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement
          )
        )
          return;
        const sample = audit.current?.fields.at(-1);
        if (sample) sample.input = event.target.value;
      },
      true,
    );
    document.addEventListener(
      "wheel",
      (event) => {
        audit.wheels.push({
          trusted: event.isTrusted,
          deltaY: event.deltaY,
          target:
            event.target instanceof Element
              ? (event.target
                  .closest('[role="grid"], [role="treegrid"]')
                  ?.getAttribute("aria-label") ?? null)
              : null,
        });
      },
      { passive: true, capture: true },
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.priorityEditorAudit.authoringResults),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key) ?? "null")?.isEditing === true,
        AUTHORING_STORAGE_KEY,
      ),
    )
    .toBe(true);
});
test.afterEach(async ({ page }, info) => {
  expect(errors.get(page)).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => window.priorityEditorAudit.activeWorkers))
    .toBe(0);
  const audit = await page.evaluate(() => window.priorityEditorAudit);
  expect(audit.workerErrors).toEqual(expectedWorkerErrors.get(page) ?? []);
  expect(audit.peakValidationWorkers).toBeLessThanOrEqual(1);
  expect(audit.authoringResults).toBeGreaterThan(0);
  for (const observation of audit.observations) {
    for (const field of observation.fields)
      expect(field.input).toBe(field.expected);
  }
  await info.attach("editor-performance-observations", {
    contentType: "application/json",
    body: JSON.stringify(
      {
        ...audit,
        limitations: [
          "Local headless observations, not field INP or population-tail acceptance.",
          "Event Timing is rounded and omits events below its reporting threshold.",
          "Field frames observe DOM values and paint opportunities, not physical pixels.",
        ],
      },
      null,
      2,
    ),
  });
});

async function working(page: Page): Promise<EditSessionSnapshot> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).working,
    AUTHORING_STORAGE_KEY,
  );
}
async function navigate(page: Page, hash: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .locator(`a[href="#${hash}"]`)
    .click();
}
async function observe(
  page: Page,
  name: string,
  action: () => Promise<unknown>,
) {
  await page.evaluate((name) => {
    const audit = window.priorityEditorAudit;
    audit.current = {
      name,
      start: performance.now(),
      events: [],
      tasks: [],
      fields: [],
    };
    audit.observations.push(audit.current);
  }, name);
  try {
    await action();
  } finally {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (window.priorityEditorAudit.current)
                window.priorityEditorAudit.current.end = performance.now();
              window.priorityEditorAudit.current = undefined;
              resolve();
            }),
          ),
        ),
    );
  }
}
async function type(page: Page, name: string, field: Locator, value: string) {
  await field.focus();
  await field.press("ControlOrMeta+A");
  await observe(page, name, async () => {
    await field.pressSequentially(value, { delay: 35 });
    await expect(field).toHaveValue(value);
    await expect(field).toBeFocused();
  });
}
async function failNextValidation(page: Page) {
  expectedWorkerErrors.set(page, ["Injected Registry validation failure"]);
  await page.evaluate(() => {
    const OriginalWorker = window.Worker;
    let failNext = true;
    window.Worker = class extends OriginalWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes("taxonomyValidation.worker") && failNext) {
          failNext = false;
          queueMicrotask(() =>
            this.dispatchEvent(
              new MessageEvent("message", {
                data: {
                  type: "error",
                  error: "Injected Registry validation failure",
                },
              }),
            ),
          );
        }
      }
    };
  });
}

test("Registry drafts respond locally and accepted terms retain their source identity", async ({
  page,
}) => {
  await observe(page, "Registry navigation", () => navigate(page, "registry"));
  const before = await working(page);
  await observe(page, "Registry new-term focus", async () => {
    await page.getByRole("button", { name: "Add term", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "New term name", exact: true }),
    ).toBeFocused();
  });
  const name = page.getByRole("textbox", {
    name: "New term name",
    exact: true,
  });
  await type(page, "Registry term typing", name, "Priority fixture");
  await expect
    .poll(() =>
      page.evaluate(
        () => window.priorityEditorAudit.validationResults.at(-1)?.valid,
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("region", { name: "Registered terms", exact: true }),
  ).not.toHaveAttribute("aria-busy", "true");
  expect((await working(page)).taxonomy).toEqual(before.taxonomy);
  await observe(page, "Registry accept term", async () => {
    await name.press("Enter");
    await expect(name).toHaveCount(0);
  });
  await expect
    .poll(async () =>
      (await working(page)).taxonomy?.terms.some(
        (term) => term.value === "Priority fixture",
      ),
    )
    .toBe(true);
  const term = (await working(page)).taxonomy!.terms.find(
    (term) => term.value === "Priority fixture",
  )!;
  expect(term.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(
    (await working(page)).taxonomy!.terms.find((item) => item.id === term.id),
  ).toEqual(term);
  const editing = await openTaxonomyCell(page, "Priority fixture", "term");
  const checksBeforeEdit = await page.evaluate(
    () => window.priorityEditorAudit.validationResults.length,
  );
  await type(
    page,
    "Registry existing-term typing",
    editing,
    "Renamed priority fixture",
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.priorityEditorAudit.validationResults.length),
    )
    .toBeGreaterThan(checksBeforeEdit);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.priorityEditorAudit.validationResults.at(-1)?.valid,
      ),
    )
    .toBe(true);
  await editing.press("Enter");
  await expect(editing).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await working(page)).taxonomy!.terms.find(
          (entry) => entry.id === term.id,
        )?.value,
    )
    .toBe("Renamed priority fixture");
});

test("Repeated Registry acceptance preserves complete working data, authoritative checks and saved data", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await navigate(page, "registry");
  const before = await working(page);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).saved,
    AUTHORING_STORAGE_KEY,
  );
  const added: NonNullable<EditSessionSnapshot["taxonomy"]>["terms"] = [];
  for (let index = 0; index < 10; index++) {
    const checked = await page.evaluate(
      () => window.priorityEditorAudit.validationResults.length,
    );
    await page.getByRole("button", { name: "Add term", exact: true }).click();
    const field = page.getByRole("textbox", {
      name: "New term name",
      exact: true,
    });
    await expect(field).toBeFocused();
    const value = `Transaction fixture ${index + 1}`;
    await field.fill(value);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.priorityEditorAudit.validationResults.length,
        ),
      )
      .toBeGreaterThan(checked);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.priorityEditorAudit.validationResults.at(-1)?.valid,
        ),
      )
      .toBe(true);
    await expect
      .poll(() => page.evaluate(() => window.priorityEditorAudit.activeWorkers))
      .toBe(0);
    await observe(
      page,
      `Registry validated acceptance ${index + 1}`,
      async () => {
        await field.press("Enter");
        await expect(field).toHaveCount(0);
      },
    );
    await expect
      .poll(async () =>
        (await working(page)).taxonomy!.terms.some(
          (term) => term.value === value,
        ),
      )
      .toBe(true);
    const term = (await working(page)).taxonomy!.terms.find(
      (term) => term.value === value,
    )!;
    expect(term.id).toMatch(/^[0-9a-f-]{36}$/);
    added.push(term);
    expect(await working(page)).toEqual({
      ...before,
      taxonomy: {
        ...before.taxonomy!,
        terms: [...before.taxonomy!.terms, ...added],
      },
    });
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).saved,
        AUTHORING_STORAGE_KEY,
      ),
    ).toEqual(saved);
  }
});

test("Registry acceptance keeps ordered edits, native focus and quiet pending feedback", async ({
  page,
}) => {
  await navigate(page, "registry");
  const before = await working(page);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).saved,
    AUTHORING_STORAGE_KEY,
  );
  const region = page.getByRole("region", {
    name: "Registered terms",
    exact: true,
  });
  await region.evaluate((element) => {
    const states: (string | null)[] = [];
    const observer = new MutationObserver((records) => {
      states.push(
        ...records.map((record) => record.oldValue),
        element.getAttribute("data-registry-commit-pending"),
      );
    });
    observer.observe(element, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["data-registry-commit-pending"],
    });
    window.registryReviewPendingAudit = { states, observer };
  });
  await page.getByRole("button", { name: "Add term", exact: true }).click();
  const field = page.getByRole("textbox", {
    name: "New term name",
    exact: true,
  });
  await field.fill("Ordered acceptance fixture");
  await field.press("Enter");
  await expect(field).toHaveCount(0);
  await expect
    .poll(async () =>
      (await working(page)).taxonomy?.terms.some(
        (term) => term.value === "Ordered acceptance fixture",
      ),
    )
    .toBe(true);
  const accepted = (await working(page)).taxonomy!.terms.find(
    (entry) => entry.value === "Ordered acceptance fixture",
  )!;
  const description = await openTaxonomyCell(
    page,
    "Ordered acceptance fixture",
    "description",
  );
  await description.fill("An ordered description");
  await description.press("Enter");
  await expect(description).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await working(page)).taxonomy!.terms.find(
          (entry) => entry.id === accepted.id,
        )?.description,
    )
    .toBe("An ordered description");
  await expect(
    page.getByRole("button", {
      name: "Edit Ordered acceptance fixture description",
      exact: true,
    }),
  ).toBeFocused();
  expect(await working(page)).toEqual({
    ...before,
    taxonomy: {
      ...before.taxonomy!,
      terms: [
        ...before.taxonomy!.terms,
        { ...accepted, description: "An ordered description" },
      ],
    },
  });
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).saved,
      AUTHORING_STORAGE_KEY,
    ),
  ).toEqual(saved);
  await expect(region).not.toHaveAttribute("aria-busy", "true");
  expect(
    await page.evaluate(() => {
      window.registryReviewPendingAudit.observer.disconnect();
      return window.registryReviewPendingAudit.states;
    }),
  ).toContain("true");
  await expect(region.getByText(/^(Loading|Updating)/)).toHaveCount(0);
});

test("Registry accepts current terms before deferred review settles without changing unrelated source data", async ({
  page,
}) => {
  await navigate(page, "registry");
  const before = await working(page);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).saved,
    AUTHORING_STORAGE_KEY,
  );
  await page.getByRole("button", { name: "Add term", exact: true }).click();
  const field = page.getByRole("textbox", {
    name: "New term name",
    exact: true,
  });
  await field.fill("Deferred review fixture");
  await expect
    .poll(() =>
      page.evaluate(
        () => window.priorityEditorAudit.validationResults.at(-1)?.valid,
      ),
    )
    .toBe(true);
  const review = page.locator("[data-taxonomy-review]");
  await review.evaluate((element) => {
    const boundary = element.closest("[data-derived-state]")!;
    const terms = document.querySelector('[aria-label="Registered terms"]')!;
    const states: (string | null)[] = [];
    const observer = new MutationObserver((records) => {
      states.push(
        ...records.map((record) =>
          record.attributeName === "data-registry-commit-pending"
            ? record.oldValue === "true"
              ? "pending"
              : null
            : record.oldValue,
        ),
        boundary.getAttribute("data-derived-state"),
        terms.getAttribute("data-registry-commit-pending") === "true"
          ? "pending"
          : null,
      );
    });
    observer.observe(boundary, {
      attributes: true,
      attributeFilter: ["data-derived-state"],
      attributeOldValue: true,
    });
    observer.observe(terms, {
      attributes: true,
      attributeFilter: ["data-registry-commit-pending"],
      attributeOldValue: true,
    });
    window.registryReviewPendingAudit = { states, observer };
  });
  await field.press("Enter");
  await expect(field).toHaveCount(0);
  await expect
    .poll(async () =>
      (await working(page)).taxonomy!.terms.some(
        (term) => term.value === "Deferred review fixture",
      ),
    )
    .toBe(true);
  await expect(review).not.toHaveAttribute("inert", "");
  expect(
    await page.evaluate(() => {
      window.registryReviewPendingAudit.observer.disconnect();
      return window.registryReviewPendingAudit.states;
    }),
  ).toContain("pending");
  const after = await working(page);
  const added = after.taxonomy!.terms.find(
    (term) => term.value === "Deferred review fixture",
  )!;
  expect(after).toEqual({
    ...before,
    taxonomy: {
      ...before.taxonomy!,
      terms: [...before.taxonomy!.terms, added],
    },
  });
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).saved,
      AUTHORING_STORAGE_KEY,
    ),
  ).toEqual(saved);
});

test("Registry category dialog drafts preserve the active term and hidden review content", async ({
  page,
}) => {
  await observe(page, "Registry navigation", () => navigate(page, "registry"));
  const before = await working(page);
  await page.getByRole("button", { name: "Add term", exact: true }).click();
  const term = page.getByRole("textbox", {
    name: "New term name",
    exact: true,
  });
  await term.fill("Unaccepted local term");
  await expect
    .poll(() => page.evaluate(() => window.priorityEditorAudit.activeWorkers))
    .toBe(0);
  const review = page.getByRole("grid", {
    name: "Classification entries needing review",
    exact: true,
    includeHidden: true,
  });
  await expect(review).toHaveCount(1);
  expect(
    await review.evaluate((element) =>
      element.closest("[hidden]")?.getAttribute("hidden"),
    ),
  ).toBe("until-found");
  const create = page
    .getByRole("region", { name: "Global category order", exact: true })
    .getByRole("button", { name: "Create category", exact: true });
  await observe(page, "Registry category dialog", () => create.click());
  const dialog = page.getByRole("dialog");
  const name = dialog.getByRole("textbox", {
    name: "New category name",
    exact: true,
  });
  await type(
    page,
    "Registry category-name typing",
    name,
    "Priority category draft example",
  );
  expect(await working(page)).toEqual(before);
  await expect(review).toHaveCount(1);
  expect(
    await review.evaluate((element) =>
      element.closest("[hidden]")?.getAttribute("hidden"),
    ),
  ).toBe("until-found");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(create).toBeFocused();
  await expect(term).toHaveValue("Unaccepted local term");
  await create.click();
  await expect(name).toHaveValue("");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await working(page)).toEqual(before);
});

test("Registry rejects duplicate drafts, rechecks corrections and cancels abandoned input", async ({
  page,
}) => {
  await navigate(page, "registry");
  const before = (await working(page)).taxonomy!;
  const duplicate = before.terms.find(
    (term) => term.categoryId === before.order[0],
  )!;
  await page.getByRole("button", { name: "Add term", exact: true }).click();
  const name = page.getByRole("textbox", {
    name: "New term name",
    exact: true,
  });
  await type(page, "Registry duplicate typing", name, String(duplicate.value));
  await expect
    .poll(() =>
      page.evaluate(
        () => window.priorityEditorAudit.validationResults.at(-1)?.valid,
      ),
    )
    .toBe(false);
  await name.press("Enter");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  expect((await working(page)).taxonomy).toEqual(before);
  await type(
    page,
    "Registry correction typing",
    name,
    "Corrected priority term",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => window.priorityEditorAudit.validationResults.at(-1)?.valid,
      ),
    )
    .toBe(true);
  await name.press("Enter");
  await expect(name).toHaveCount(0);
  await expect
    .poll(async () =>
      (await working(page)).taxonomy!.terms.some(
        (term) => term.value === "Corrected priority term",
      ),
    )
    .toBe(true);
  const accepted = (await working(page)).taxonomy;
  await page.getByRole("button", { name: "Add term", exact: true }).click();
  await name.pressSequentially("Abandoned draft");
  await name.press("Escape");
  await expect(name).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Registered terms", exact: true }),
  ).not.toHaveAttribute("aria-busy", "true");
  expect((await working(page)).taxonomy).toEqual(accepted);
  await navigate(page, "foundations");
});

test("Registry exposes a draft-worker failure and retries without losing text or changing sources", async ({
  page,
}) => {
  await navigate(page, "registry");
  const before = (await working(page)).taxonomy;
  await failNextValidation(page);
  await page.getByRole("button", { name: "Add term", exact: true }).click();
  const name = page.getByRole("textbox", {
    name: "New term name",
    exact: true,
  });
  await observe(page, "Registry failed draft", () =>
    name.fill("Retry priority term"),
  );
  await expect(
    page.getByRole("heading", { name: "Could not check term", exact: true }),
  ).toBeVisible();
  await expect(name).toHaveValue("Retry priority term");
  expect((await working(page)).taxonomy).toEqual(before);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.priorityEditorAudit.validationResults.at(-1)?.valid,
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("heading", { name: "Could not check term", exact: true }),
  ).toHaveCount(0);
  await name.press("Enter");
  await expect(name).toHaveCount(0);
  await expect
    .poll(async () =>
      (await working(page)).taxonomy!.terms.some(
        (term) => term.value === "Retry priority term",
      ),
    )
    .toBe(true);
});

test("Registry editing-popover validation retries in place and preserves the accepted term identity", async ({
  page,
}) => {
  await navigate(page, "registry");
  const before = (await working(page)).taxonomy!;
  const term = before.terms.find(
    (entry) => entry.categoryId === before.order[0],
  )!;
  await failNextValidation(page);
  const description = await openTaxonomyCell(
    page,
    String(term.value),
    "description",
  );
  await observe(page, "Registry failed description draft", () =>
    description.fill("Retry priority description"),
  );
  await expect(
    page.getByRole("heading", { name: "Could not check term", exact: true }),
  ).toBeVisible();
  await expect(description).toHaveValue("Retry priority description");
  expect((await working(page)).taxonomy).toEqual(before);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.priorityEditorAudit.validationResults.at(-1)?.valid,
      ),
    )
    .toBe(true);
  await expect(description).toHaveValue("Retry priority description");
  await description.press("Enter");
  await expect(description).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await working(page)).taxonomy!.terms.find(
          (entry) => entry.id === term.id,
        )?.description,
    )
    .toBe("Retry priority description");
});

test("Registry keeps a rejected dependency edit open while its draft worker is still pending", async ({
  page,
}) => {
  await navigate(page, "registry");
  await page
    .getByRole("radio", { name: "Scale index", exact: true })
    .press("Space");
  const before = (await working(page)).taxonomy;
  const field = await openTaxonomyCell(page, "100", "term");
  await page.evaluate(() => {
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      private hold: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.hold = String(url).includes("taxonomyValidation.worker");
      }
      postMessage(input: unknown) {
        if (this.hold) {
          this.hold = false;
          window.releasePriorityValidation = () => {
            window.releasePriorityValidation = undefined;
            super.postMessage(input);
          };
        } else super.postMessage(input);
      }
    };
  });
  await field.fill("9900");
  await expect
    .poll(() =>
      page.evaluate(() => window.priorityEditorAudit.activeValidationWorkers),
    )
    .toBe(1);
  await field.press("Enter");
  await expect(field).toHaveValue("9900");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Could not apply change", exact: true }),
  ).toBeVisible();
  expect((await working(page)).taxonomy).toEqual(before);
  expect(
    await page.evaluate(() => window.priorityEditorAudit.validationResults),
  ).toEqual([]);
  await page.evaluate(() => {
    if (!window.releasePriorityValidation)
      throw new Error("The held draft worker was not started.");
    window.releasePriorityValidation();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.priorityEditorAudit.validationResults.at(-1)?.valid,
      ),
    )
    .toBe(false);
  await field.press("Escape");
  await expect(field).toHaveCount(0);
  expect((await working(page)).taxonomy).toEqual(before);
});

for (const { filtered, width } of [
  { filtered: false, width: 1600 },
  { filtered: false, width: 390 },
  { filtered: true, width: 1600 },
]) {
  test(`Registry numeric drafts keep finite-number errors local and accept the original numeric type (${filtered ? "filtered" : "unfiltered"}, ${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    if (width === 390) {
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
      await page.getByRole("button", { name: /^Change log/ }).click();
    }
    await navigate(page, "registry");
    await page
      .getByRole("radio", { name: "Scale index", exact: true })
      .press("Space");
    if (filtered)
      await page
        .getByRole("searchbox", { name: "Search terms", exact: true })
        .fill("Numeric draft fixture");
    const before = (await working(page)).taxonomy!;
    await page.getByRole("button", { name: "Add term", exact: true }).click();
    const field = page.getByRole("textbox", {
      name: "New term name",
      exact: true,
    });
    await expect(field).toBeFocused();
    await expect(field).toBeInViewport();
    const row = page.getByRole("row").filter({ has: field });
    const id = await row.getAttribute("data-key");
    await field.fill("Infinity");
    await field.press("Enter");
    await expect(row).toContainText("Enter a finite number.");
    expect((await working(page)).taxonomy).toEqual(before);
    await field.fill("9900");
    await expect
      .poll(() =>
        page.evaluate(
          () => window.priorityEditorAudit.validationResults.at(-1)?.valid,
        ),
      )
      .toBe(true);
    await field.press("Enter");
    await expect(field).toHaveCount(0);
    await expect
      .poll(
        async () =>
          (await working(page)).taxonomy!.terms.find((term) => term.id === id)
            ?.value,
      )
      .toBe(9900);
  });
}

test("Logic drafts, formula previews and committed Typography consumers remain coherent", async ({
  page,
}) => {
  await observe(page, "Logic navigation", () => navigate(page, "logic"));
  await page.getByRole("tab", { name: "Formulas", exact: true }).click();
  await observe(page, "Logic focused formula", async () => {
    await page
      .getByRole("button", { name: "Edit formula Type scale", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Base size (px)", exact: true }),
    ).toBeVisible();
  });
  const before = await working(page);
  const base = page.getByRole("textbox", {
    name: "Base size (px)",
    exact: true,
  });
  await type(page, "Logic formula typing", base, "17");
  await observe(page, "Logic nearby formula preview", () =>
    base.press("Enter"),
  );
  expect((await working(page)).scaleTypes).toEqual(before.scaleTypes);
  await observe(page, "Logic commit formula", () =>
    page.getByRole("button", { name: "Save changes", exact: true }).click(),
  );
  await expect
    .poll(
      async () =>
        (await working(page)).scaleTypes!.find(
          (formula) => formula.kind === "type-scale",
        )!.base.default,
    )
    .toBe(17);
  await navigate(page, "foundations");
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Base size (rem)", exact: true }),
  ).toHaveValue("1.0625");
});

test("Mode-set dialog drafts remain local and accepted metadata preserves modes", async ({
  page,
}) => {
  await observe(page, "Modes navigation", () => navigate(page, "modes"));
  const before = (await working(page)).modeSets;
  await observe(page, "Mode-set dialog", async () => {
    await page
      .getByRole("button", { name: "Edit mode set Color scheme", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
  const dialog = page.getByRole("dialog");
  await type(
    page,
    "Mode-set name typing",
    dialog.getByRole("textbox", { name: "Mode set name", exact: true }),
    "Priority appearance",
  );
  expect((await working(page)).modeSets).toEqual(before);
  await observe(page, "Mode-set metadata commit", () =>
    dialog.getByRole("button", { name: "Save", exact: true }).click(),
  );
  await expect
    .poll(async () => (await working(page)).modeSets[0].name)
    .toBe("Priority appearance");
  expect((await working(page)).modeSets[0]).toEqual({
    ...before[0],
    name: "Priority appearance",
  });
});

test("Structure names, selection and reference menus retain the shipped source identities", async ({
  page,
}) => {
  await observe(page, "Structures navigation", () => navigate(page, "design"));
  const card = page.locator('[data-component="StructureCard"]').first();
  await observe(page, "Structure selection", async () => {
    await card.click({ position: { x: 4, y: 4 } });
    await expect(
      page.getByRole("region", { name: /^Structure settings for/ }),
    ).toBeVisible();
  });
  const before = (await working(page)).structures!.structures[0];
  const name = card.getByRole("textbox", { name: "Name", exact: true });
  await type(page, "Structure name typing", name, `${before.name} priority`);
  await observe(page, "Structure name commit", () => name.press("Enter"));
  await expect
    .poll(async () => (await working(page)).structures!.structures[0].name)
    .toBe(`${before.name} priority`);
  expect((await working(page)).structures!.structures[0].id).toBe(before.id);
  const settings = page.getByRole("region", {
    name: /^Structure settings for/,
  });
  const width = settings.getByRole("combobox", {
    name: /^Default size width(?: |$)/,
  });
  const control = width.locator(
    'xpath=ancestor::*[@data-component="TokenComboBox"]',
  );
  await observe(page, "Structure reference menu", async () => {
    await control.locator('button[aria-haspopup="listbox"]').click();
    await expect(page.getByRole("option").first()).toBeVisible();
  });
  await width.press("Escape");
  expect((await working(page)).structures!.structures[0].properties).toEqual(
    before.properties,
  );
});

test("Rapid Structure selection preserves native focus, the latest settings and untouched authoring", async ({
  page,
  context,
}, info) => {
  await navigate(page, "design");
  const cards = page.locator('[data-component="StructureCard"]');
  expect(await cards.count()).toBeGreaterThanOrEqual(2);
  const first = cards.nth(0),
    second = cards.nth(1);
  const firstRow = first.locator('xpath=ancestor::*[@role="row"]');
  const secondRow = second.locator('xpath=ancestor::*[@role="row"]');
  const firstId = (await firstRow.getAttribute("data-key"))!;
  const secondId = (await secondRow.getAttribute("data-key"))!;
  const firstName = await first
    .getByRole("textbox", { name: "Name", exact: true })
    .inputValue();
  const secondName = await second
    .getByRole("textbox", { name: "Name", exact: true })
    .inputValue();
  const before = await working(page);
  await first.click({ position: { x: 4, y: 4 } });
  await expect(
    page.getByRole("region", {
      name: `Structure settings for ${firstName}`,
      exact: true,
    }),
  ).toBeVisible();
  const recordBefore = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  await firstRow.focus();
  await page.evaluate(() => {
    const audit: StructureSelectionAudit =
      (window.priorityStructureSelectionAudit = {
        running: true,
        keys: [],
        frames: [],
      });
    document.addEventListener(
      "keydown",
      (event) => {
        if (!event.isTrusted || !["ArrowDown", "ArrowUp"].includes(event.key))
          return;
        const row =
          event.target instanceof Element
            ? event.target.closest('[role="row"]')
            : null;
        if (!row?.closest('[data-component="StructuresPanel"]')) return;
        audit.keys.push({
          epoch: performance.timeOrigin + performance.now(),
          key: event.key,
          focused: row.getAttribute("data-key"),
        });
      },
      true,
    );
    const frame = () => {
      if (!audit.running) return;
      audit.frames.push({
        epoch: performance.timeOrigin + performance.now(),
        delivered: audit.keys.length,
        selected:
          document
            .querySelector(
              '[data-component="StructuresPanel"] [role="row"][aria-selected="true"]',
            )
            ?.getAttribute("data-key") ?? null,
      });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  const cdp = await context.newCDPSession(page);
  const sent: { epoch: number; expected: string }[] = [];
  const pending: Promise<unknown>[] = [];
  try {
    await observe(
      page,
      "Structure uninterrupted keyboard selection",
      async () => {
        await new Promise<void>((resolve) => {
          for (let index = 0; index < 8; index++)
            setTimeout(
              () => {
                const epoch = performance.timeOrigin + performance.now();
                const key = index % 2 === 0 ? "ArrowDown" : "ArrowUp";
                sent.push({
                  epoch,
                  expected: index % 2 === 0 ? secondId : firstId,
                });
                for (const type of ["keyDown", "keyUp"])
                  pending.push(
                    cdp.send("Input.dispatchKeyEvent", {
                      type,
                      key,
                      code: key,
                      windowsVirtualKeyCode: key === "ArrowDown" ? 40 : 38,
                      timestamp: epoch / 1000,
                    }),
                  );
                if (index === 7) resolve();
              },
              (index + 1) * 50,
            );
        });
        await Promise.all(pending);
        await expect
          .poll(() =>
            page.evaluate(
              () => window.priorityStructureSelectionAudit.keys.length,
            ),
          )
          .toBe(8);
        await expect(firstRow).toHaveAttribute("aria-selected", "true");
        await expect(firstRow).toBeFocused();
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document
                  .querySelector(".structureDesignWork")
                  ?.hasAttribute("inert") ?? false,
            ),
          )
          .toBe(false);
        await expect(
          page.getByRole("region", {
            name: `Structure settings for ${firstName}`,
            exact: true,
          }),
        ).toBeVisible();
      },
    );
    const audit = await page.evaluate(() => {
      window.priorityStructureSelectionAudit.running = false;
      return window.priorityStructureSelectionAudit;
    });
    expect(audit.keys.map((key) => key.focused)).toEqual(
      Array.from({ length: 8 }, (_, index) =>
        index % 2 === 0 ? firstId : secondId,
      ),
    );
    const published = audit.frames.map((frame) => ({
      ...frame,
      acknowledged: sent.findLastIndex(
        (sample, index) =>
          index < frame.delivered &&
          sample.epoch <= frame.epoch &&
          sample.expected === frame.selected,
      ),
    }));
    const response = sent.map((sample, index) => {
      const frame = published.find((frame) => frame.acknowledged >= index);
      expect(frame).toBeDefined();
      return frame!.epoch - sample.epoch;
    });
    const settings = page.getByRole("region", {
      name: `Structure settings for ${firstName}`,
      exact: true,
    });
    const width = settings.getByRole("combobox", {
      name: /^Default size width(?: |$)/,
    });
    await width
      .locator('xpath=ancestor::*[@data-component="TokenComboBox"]')
      .locator('button[aria-haspopup="listbox"]')
      .click();
    await expect(page.getByRole("option").first()).toBeVisible();
    await second.click({ position: { x: 4, y: 4 } });
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(
      page.getByRole("region", {
        name: `Structure settings for ${secondName}`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(secondRow).toBeFocused();
    expect(await working(page)).toEqual(before);
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        AUTHORING_STORAGE_KEY,
      ),
    ).toBe(recordBefore);
    await info.attach("structure-selection-observations", {
      contentType: "application/json",
      body: JSON.stringify({ sent, audit, response }),
    });
  } finally {
    await page.evaluate(() => {
      window.priorityStructureSelectionAudit.running = false;
    });
    await cdp.detach();
  }
});

test("Structure selection scheduling keeps live edits focused, exact and cancellable", async ({
  page,
}) => {
  await navigate(page, "design");
  const card = page.locator('[data-component="StructureCard"]').first();
  await card.click({ position: { x: 4, y: 4 } });
  const settings = page.getByRole("region", {
    name: /^Structure settings for/,
  });
  await expect(settings).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .querySelector(".structureDesignWork")
            ?.hasAttribute("inert") ?? false,
      ),
    )
    .toBe(false);
  const before = await working(page);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).saved,
    AUTHORING_STORAGE_KEY,
  );
  const structure = before.structures!.structures[0];
  const current = structureSelection(structure, "width");
  expect(current).not.toBeNull();
  const store = createStore();
  store.set(restoreAuthoringSnapshotAtom, before);
  const choice = store
    .get(primitiveReferencesAtom)
    .find(
      (reference) =>
        reference.family === "size" &&
        !reference.hidden &&
        !reference.error &&
        Number(reference.value) > 0 &&
        (!current || !("$ref" in current) || reference.id !== current.$ref),
    )!;
  expect(choice).toBeDefined();
  await page.evaluate(() => {
    const work = document.querySelector(".structureDesignWork");
    const states: boolean[] = [];
    const observer = new MutationObserver(() =>
      states.push(work!.hasAttribute("inert")),
    );
    if (work)
      observer.observe(work, { attributes: true, attributeFilter: ["inert"] });
    window.structureEditPendingAudit = { states, observer };
  });
  const width = settings.getByRole("combobox", {
    name: /^Default size width(?: |$)/,
  });
  await width.focus();
  await width.fill(choice.name);
  await page
    .getByRole("option")
    .filter({ has: page.getByTitle(choice.name, { exact: true }) })
    .click();
  await expect(width).toBeFocused();
  const expected = {
    ...before,
    structures: {
      ...before.structures!,
      structures: before.structures!.structures.map((item) =>
        item.conceptId === structure.conceptId
          ? assignStructure(item, { width: { $ref: choice.id } })
          : item,
      ),
    },
  };
  await expect.poll(() => working(page)).toEqual(expected);
  const resolved = resolveStructure(
    expected.structures.structures[0],
    store.get(primitiveReferencesAtom),
  );
  const expectedWidth =
    typeof resolved.styles.width === "number"
      ? `${resolved.styles.width}px`
      : resolved.styles.width;
  await expect
    .poll(() =>
      page
        .locator('[data-component="StructurePreview"]')
        .first()
        .evaluate((element: HTMLElement) => element.style.width),
    )
    .toBe(expectedWidth);
  const pending = await page.evaluate(() => {
    const audit = window.structureEditPendingAudit;
    audit.observer.disconnect();
    return audit.states;
  });
  expect(pending).not.toContain(true);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).saved,
      AUTHORING_STORAGE_KEY,
    ),
  ).toEqual(saved);
  await page.setViewportSize({ width: 1100, height: 760 });
  await expect
    .poll(() =>
      settings.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return (
          box.width > 0 &&
          box.left >= 0 &&
          box.right <= innerWidth &&
          box.bottom <= innerHeight
        );
      }),
    )
    .toBe(true);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect.poll(() => working(page)).toEqual(before);
  await expect(width).toBeDisabled();
});

test("Reference fields prepare only the open menu and preserve selection, sizing and authoring", async ({
  page,
}) => {
  await navigate(page, "design");
  await page
    .locator('[data-component="StructureCard"]')
    .first()
    .click({ position: { x: 4, y: 4 } });
  const settings = page.getByRole("region", {
    name: /^Structure settings for/,
  });
  await expect(settings).toBeVisible();
  await expect(page.locator(".tokenComboBoxMenuMeasurement")).toHaveCount(0);
  const before = await working(page);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).saved,
    AUTHORING_STORAGE_KEY,
  );
  for (const { name, dismiss } of [
    { name: /^Default size width(?: |$)/, dismiss: "Escape" },
    { name: /^Gap(?: |$)/, dismiss: "Tab" },
  ]) {
    const field = settings.getByRole("combobox", { name });
    const control = field.locator(
      'xpath=ancestor::*[@data-component="TokenComboBox"]',
    );
    await field.focus();
    await field.press("ArrowDown");
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await expect(page.locator(".tokenComboBoxMenuMeasurement")).toHaveCount(1);
    const desired = await control
      .locator(".tokenComboBoxMenuMeasurement")
      .evaluate((probe) => {
        const trigger =
          probe.parentElement!.querySelector("input")!.parentElement!;
        return Math.min(
          Math.max(
            Math.ceil(trigger.getBoundingClientRect().width),
            Math.ceil(probe.getBoundingClientRect().width + 60),
          ),
          innerWidth - 24,
        );
      });
    await expect
      .poll(async () => Math.round((await list.boundingBox())!.width))
      .toBe(desired);
    await field.press(dismiss);
    await expect(list).toHaveCount(0);
    await expect(page.locator(".tokenComboBoxMenuMeasurement")).toHaveCount(0);
    if (dismiss === "Escape") await expect(field).toBeFocused();
    else
      await expect(
        control.getByRole("button", { name: "Clear Gap", exact: true }),
      ).toBeFocused();
  }
  expect(await working(page)).toEqual(before);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).saved,
      AUTHORING_STORAGE_KEY,
    ),
  ).toEqual(saved);
});

test("Component property dialogs keep unaccepted values local and preserve assignment identity", async ({
  page,
}) => {
  await observe(page, "Components navigation", () =>
    navigate(page, "components"),
  );
  await page.getByRole("tab", { name: "Properties", exact: true }).click();
  const before = (await working(page)).components!.components[0].assignments[0];
  await observe(page, "Component property dialog", async () => {
    await page
      .getByRole("button", {
        name: "Edit property height whole component",
        exact: true,
      })
      .first()
      .click();
    await expect(
      page.getByRole("dialog", { name: "Edit property assignment" }),
    ).toBeVisible();
  });
  const dialog = page.getByRole("dialog", { name: "Edit property assignment" });
  const value = dialog.getByRole("combobox", { name: /^Value(?: |$)/ });
  await type(page, "Component value typing and suggestions", value, "40px");
  expect(
    (await working(page)).components!.components[0].assignments[0],
  ).toEqual(before);
  await page
    .getByRole("option", { name: "Use this value", exact: true })
    .click();
  await value.press("Tab");
  await observe(page, "Component assignment commit", () =>
    dialog.getByRole("button", { name: "Apply changes", exact: true }).click(),
  );
  await expect
    .poll(
      async () =>
        (await working(page)).components!.components[0].assignments[0].value,
    )
    .toBe("40px");
  expect(
    (await working(page)).components!.components[0].assignments[0].id,
  ).toBe(before.id);
});

test("Component reference preparation preserves an open field, selection and unapplied draft", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      private hold: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.hold = String(url).includes("recordPreparation.worker");
      }
      postMessage(input: unknown) {
        if (this.hold) {
          this.hold = false;
          window.releasePriorityCatalogProof = () => {
            window.releasePriorityCatalogProof = undefined;
            super.postMessage(input);
          };
        } else super.postMessage(input);
      }
    };
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(window.releasePriorityCatalogProof)),
    )
    .toBe(true);
  const before = await working(page);
  await navigate(page, "components");
  await page.getByRole("tab", { name: "Properties", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Edit property height whole component",
      exact: true,
    })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Edit property assignment" });
  const value = dialog.getByRole("combobox", { name: /^Value(?: |$)/ });
  await type(
    page,
    "Component draft before reference preparation",
    value,
    "40px",
  );
  await value.press("ArrowLeft");
  const selection = await value.evaluate((element: HTMLInputElement) => [
    element.selectionStart,
    element.selectionEnd,
  ]);
  await page.evaluate(() => {
    if (!window.releasePriorityCatalogProof)
      throw new Error("The held authoring worker was not started.");
    window.releasePriorityCatalogProof();
  });
  await expect
    .poll(() => page.evaluate(() => window.priorityEditorAudit.colorResults))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.priorityEditorAudit.activeWorkers))
    .toBe(0);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(value).toBeFocused();
  await expect(value).toHaveValue("40px");
  expect(
    await value.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]),
  ).toEqual(selection);
  expect(await working(page)).toEqual(before);
  await value.press("Tab");
  await dialog
    .getByRole("button", { name: "Cancel changes", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(await working(page)).toEqual(before);
});

for (const collection of ["terms", "review"] as const) {
  test(`Registry ${collection} scrolling preserves visible coverage and reaches both logical ends`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await navigate(page, "registry");
    if (collection === "terms")
      await page
        .getByRole("radio", { name: "Color name", exact: true })
        .press("Space");
    else
      await page
        .getByRole("button", { name: "Migration review", exact: true })
        .click();
    const grid = page.getByRole("grid", {
      name:
        collection === "terms"
          ? "Color name terms"
          : "Classification entries needing review",
      exact: true,
    });
    await expect(grid.getByRole("row").nth(1)).toBeVisible();
    await expect
      .poll(() =>
        grid.evaluate((element) => {
          for (
            let ancestor: Element | null = element;
            ancestor;
            ancestor = ancestor.parentElement
          ) {
            if (
              ancestor
                .getAnimations()
                .some(
                  (animation) =>
                    animation.playState === "running" &&
                    Number.isFinite(
                      animation.effect?.getComputedTiming().endTime,
                    ),
                )
            )
              return false;
          }
          return element.clientHeight > 200;
        }),
      )
      .toBe(true);
    await expect
      .poll(() => page.evaluate(() => window.priorityEditorAudit.activeWorkers))
      .toBe(0);
    const before = await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    );

    for (const direction of [1, -1]) {
      await grid.evaluate((element) =>
        element.scrollIntoView({ block: "center", behavior: "instant" }),
      );
      const box = await grid.boundingBox();
      if (!box) throw new Error("Registry table has no visible input target.");
      const point = {
        x: box.x + Math.min(200, box.width / 2),
        y: box.y + box.height / 2,
      };
      expect(
        await grid.evaluate(
          (element, point) =>
            element.contains(document.elementFromPoint(point.x, point.y)),
          point,
        ),
      ).toBe(true);
      await page.mouse.move(point.x, point.y);
      let reached = false;
      let maximumGapFraction = 0;
      for (let step = 0; step < 500 && !reached; step += 1) {
        await page.mouse.wheel(0, direction * (step % 2 ? 1920 : 960));
        const sample = await grid.evaluate(
          (element, direction) =>
            new Promise<{
              boundary: boolean;
              logicalBoundaryVisible: boolean;
              gapFraction: number;
            }>((resolve) =>
              requestAnimationFrame(() => {
                const bounds = element.getBoundingClientRect();
                const header = element
                  .querySelector('[role="columnheader"]')
                  ?.getBoundingClientRect();
                const top = Math.max(
                  bounds.top,
                  header?.bottom ?? bounds.top,
                  0,
                );
                const bottom = Math.min(innerHeight, bounds.bottom);
                const rows = [
                  ...element.querySelectorAll<HTMLElement>(
                    '[role="row"][data-key]',
                  ),
                ];
                const intervals = rows
                  .map((row) => row.getBoundingClientRect())
                  .filter((rect) => rect.bottom > top && rect.top < bottom)
                  .sort((a, b) => a.top - b.top);
                let cursor = top,
                  gap = 0;
                for (const rect of intervals) {
                  gap = Math.max(gap, Math.min(rect.top, bottom) - cursor);
                  cursor = Math.max(cursor, Math.min(rect.bottom, bottom));
                }
                gap = Math.max(gap, bottom - cursor);
                const index =
                  direction === 1
                    ? Number(element.getAttribute("aria-rowcount"))
                    : 2;
                const terminal = rows.find(
                  (row) => Number(row.getAttribute("aria-rowindex")) === index,
                );
                const terminalBounds = terminal?.getBoundingClientRect();
                resolve({
                  boundary:
                    direction === 1
                      ? element.scrollHeight -
                          element.scrollTop -
                          element.clientHeight <=
                        1
                      : element.scrollTop <= 1,
                  logicalBoundaryVisible:
                    !!terminalBounds &&
                    terminalBounds.bottom > top &&
                    terminalBounds.top < bottom,
                  gapFraction: gap > 24 ? gap / (bottom - top) : 0,
                });
              }),
            ),
          direction,
        );
        maximumGapFraction = Math.max(maximumGapFraction, sample.gapFraction);
        reached = sample.boundary;
        if (reached) expect(sample.logicalBoundaryVisible).toBe(true);
      }
      expect(reached).toBe(true);
      expect(maximumGapFraction).toBeLessThanOrEqual(0.25);
    }
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        AUTHORING_STORAGE_KEY,
      ),
    ).toBe(before);
  });
}

for (const width of [1600, 390]) {
  test(`Tokens ${width}px scrolling preserves visible coverage and reaches canonical logical ends`, async ({
    page,
  }, info) => {
    test.setTimeout(90_000);
    await navigate(page, "tokens");
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Change log/ })
      .click();
    await page.setViewportSize({ width, height: 1000 });
    if (width === 390)
      await page.getByRole("button", { name: "Collapse", exact: true }).click();
    const grid = page.getByRole("treegrid", { name: "Tokens", exact: true });
    await expect(grid.getByRole("row").nth(1)).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.priorityEditorAudit.activeWorkers))
      .toBe(0);
    const before = await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    );
    const store = createStore();
    store.set(restoreAuthoringSnapshotAtom, await working(page));
    const rows: TokenTablePresentationRow[] = [];
    const visit = (items: TokenTablePresentationRow[]) => {
      for (const item of items) {
        rows.push(item);
        visit(item.children);
      }
    };
    visit(
      compactTokenTableTree(taxonomyTokenTree(store.get(browserTokensAtom))),
    );
    expect(rows.length).toBeGreaterThan(1);
    const endpoints = { first: rows[0].id, last: rows.at(-1)!.id };
    const observations: {
      direction: number;
      wheels: number;
      maximumGapFraction: number;
      terminal: string;
    }[] = [];
    for (const direction of [1, -1]) {
      await grid.evaluate((element) =>
        element.scrollIntoView({ block: "center", behavior: "instant" }),
      );
      const box = await grid.boundingBox();
      if (!box) throw new Error("Tokens table has no visible input target.");
      const point = {
        x: Math.min(width - 8, box.x + Math.min(200, box.width / 2)),
        y: box.y + box.height / 2,
      };
      expect(
        await grid.evaluate(
          (element, point) =>
            element.contains(document.elementFromPoint(point.x, point.y)),
          point,
        ),
      ).toBe(true);
      await page.mouse.move(point.x, point.y);
      let reached = false,
        maximumGapFraction = 0,
        wheels = 0;
      const terminal = direction === 1 ? endpoints.last : endpoints.first;
      while (wheels < 500 && !reached) {
        await page.mouse.wheel(0, direction * (wheels++ % 2 ? 1920 : 960));
        const sample = await grid.evaluate(
          (element, { direction, terminal }) =>
            new Promise<{
              boundary: boolean;
              logicalBoundaryVisible: boolean;
              gapFraction: number;
              visibleHeight: number;
            }>((resolve) =>
              requestAnimationFrame(() => {
                const bounds = element.getBoundingClientRect();
                const viewport = element
                  .closest(".tokenCollectionScroll")!
                  .getBoundingClientRect();
                const header = element
                  .querySelector('[role="columnheader"]')!
                  .getBoundingClientRect();
                const top = Math.max(
                  bounds.top,
                  viewport.top,
                  header.bottom,
                  0,
                );
                const bottom = Math.min(
                  innerHeight,
                  bounds.bottom,
                  viewport.bottom,
                );
                const rows = [
                  ...element.querySelectorAll<HTMLElement>(
                    '[role="row"][data-key]',
                  ),
                ];
                const intervals = rows
                  .filter((row) => row.textContent?.trim())
                  .map((row) => row.getBoundingClientRect())
                  .filter((rect) => rect.bottom > top && rect.top < bottom)
                  .sort((a, b) => a.top - b.top);
                let cursor = top,
                  gap = 0;
                for (const rect of intervals) {
                  gap = Math.max(gap, Math.min(rect.top, bottom) - cursor);
                  cursor = Math.max(cursor, Math.min(rect.bottom, bottom));
                }
                gap = Math.max(gap, bottom - cursor);
                const terminalBounds = rows
                  .find((row) => row.getAttribute("data-key") === terminal)
                  ?.getBoundingClientRect();
                resolve({
                  boundary:
                    direction === 1
                      ? element.scrollHeight -
                          element.scrollTop -
                          element.clientHeight <=
                        1
                      : element.scrollTop <= 1,
                  logicalBoundaryVisible:
                    !!terminalBounds &&
                    terminalBounds.bottom > top &&
                    terminalBounds.top < bottom,
                  visibleHeight: bottom - top,
                  gapFraction: gap > 24 ? gap / (bottom - top) : 0,
                });
              }),
            ),
          { direction, terminal },
        );
        expect(sample.visibleHeight).toBeGreaterThan(24);
        maximumGapFraction = Math.max(maximumGapFraction, sample.gapFraction);
        reached = sample.boundary;
        if (reached) expect(sample.logicalBoundaryVisible).toBe(true);
      }
      expect(reached).toBe(true);
      expect(maximumGapFraction).toBeLessThanOrEqual(0.25);
      observations.push({ direction, wheels, maximumGapFraction, terminal });
    }
    const delivered = await page.evaluate(
      () => window.priorityEditorAudit.wheels,
    );
    expect(delivered.some((wheel) => wheel.deltaY > 0)).toBe(true);
    expect(delivered.some((wheel) => wheel.deltaY < 0)).toBe(true);
    expect(
      delivered.every((wheel) => wheel.trusted && wheel.target === "Tokens"),
    ).toBe(true);
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        AUTHORING_STORAGE_KEY,
      ),
    ).toBe(before);
    await info.attach("token-logical-end-observations", {
      contentType: "application/json",
      body: JSON.stringify({
        width,
        rows: rows.length,
        endpoints,
        observations,
        delivered,
        method:
          "Canonical current-snapshot public table model, not missing row-level aria-rowindex or scrollbar position alone.",
      }),
    });
  });
}
