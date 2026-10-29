// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    let active = 0,
      peak = 0;
    const record = () => {
      document.documentElement.dataset.codeWorkersActive = String(active);
      document.documentElement.dataset.codeWorkersPeak = String(peak);
    };
    window.Worker = class extends OriginalWorker {
      private tracked: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.tracked = String(url).includes("highlight.worker");
        if (this.tracked) {
          active += 1;
          peak = Math.max(peak, active);
          record();
        }
      }
      terminate() {
        if (this.tracked) {
          active -= 1;
          this.tracked = false;
          record();
        }
        super.terminate();
      }
    };
  });
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

for (const appearance of ["light", "dark"])
  for (const width of [1280, 390]) {
    test(`Complete large code stays selectable and bounded in ${appearance} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=components-code-block--large-output&viewMode=story&globals=colorScheme:${appearance}`,
      );
      await expect(page.locator("#storybook-root")).toHaveAttribute(
        "data-play-complete",
        "true",
      );
      const code = page.locator("[data-code-block] > code");
      const original = await code.textContent();
      expect(original!.length).toBeGreaterThan(1_000_000);
      await expect(page.locator(".token").first()).toBeVisible();
      expect(await page.locator(".token").count()).toBeLessThan(5000);
      const selected = await code.evaluate((element) => {
        const selection = getSelection()!;
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
        const actual = selection.toString();
        const reference = document.createElement("pre");
        reference.style.position = "fixed";
        reference.style.left = "-10000px";
        const referenceCode = document.createElement("code");
        referenceCode.textContent = element.textContent;
        reference.append(referenceCode);
        document.body.append(reference);
        range.selectNodeContents(referenceCode);
        selection.removeAllRanges();
        selection.addRange(range);
        const native = selection.toString();
        selection.removeAllRanges();
        reference.remove();
        return { actual, native };
      });
      expect(selected.actual).toBe(selected.native);
      await page.locator("[data-code-block]").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(page.locator("[data-code-chunk]").last()).toBeInViewport();
      await expect
        .poll(() => page.locator(".token").count())
        .toBeGreaterThan(0);
      expect(await code.textContent()).toBe(original);
      expect(await page.locator(".token").count()).toBeLessThan(5000);
      const found = await page.evaluate(() => {
        if (!("find" in window) || typeof window.find !== "function")
          throw new Error("Native find is unavailable.");
        return window.find(".sample-15999");
      });
      expect(found).toBe(true);
      await expect(page.locator("[data-code-chunk]").last()).toBeInViewport();
      await expect(page.locator("html")).toHaveAttribute(
        "data-code-workers-active",
        "0",
      );
      await expect(page.locator("html")).toHaveAttribute(
        "data-code-workers-peak",
        "1",
      );
    });
  }

test("Replacing or hiding code cancels obsolete coloring", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=components-code-block--replacement&viewMode=story",
  );
  await page.getByRole("button", { name: "Replace code", exact: true }).click();
  await expect(page.locator("[data-code-block] > code")).toHaveText(
    ":root { --latest: 24px; }",
  );
  await expect(page.locator(".token").first()).toBeVisible();
  await page.getByRole("button", { name: "Hide code", exact: true }).click();
  await expect(page.locator("[data-code-block]")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute(
    "data-code-workers-active",
    "0",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-code-workers-peak",
    "1",
  );
});

test("A coloring failure keeps the entire source and supports retry", async ({
  page,
}) => {
  const pattern = "**/*highlight.worker*";
  await page.route(pattern, (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'self.onmessage = () => self.postMessage({type: "error", error: "Injected syntax failure"});',
    }),
  );
  await page.goto(
    "/iframe.html?id=components-code-block--replacement&viewMode=story",
  );
  await expect(page.getByText(/Syntax coloring is unavailable/)).toBeVisible();
  const original = await page.locator("[data-code-block] > code").textContent();
  expect(original!.length).toBeGreaterThan(1_000_000);
  await page.unroute(pattern);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator(".token").first()).toBeVisible();
  expect(await page.locator("[data-code-block] > code").textContent()).toBe(
    original,
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-code-workers-active",
    "0",
  );
});

test("Coloring does not alter non-breaking spaces, CRLF or escaped source", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=components-code-block--whitespace&viewMode=story",
  );
  await expect(page.locator("#storybook-root")).toHaveAttribute(
    "data-play-complete",
    "true",
  );
  await expect(page.locator("[data-code-block] > code")).toHaveText(
    'const text = "\u00a0<script>&";\r\n'.repeat(100),
    { useInnerText: false },
  );
  expect(await page.locator("[data-code-block] script").count()).toBe(0);
});
