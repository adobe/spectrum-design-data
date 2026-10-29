// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { COLOR_SYSTEM_DEFAULTS } from "../../src/features/color-system/defaults";
import { hydrateColorSystem } from "../../src/features/color-system/model";
import { enableEditMode } from "./editMode";

test.beforeEach(async ({ page }) => {
  await enableEditMode(page);
});

// The sidebar transition keeps Playwright's actionability check from settling, so
// these specs dispatch clicks directly.
const evaluationReady = async (page: import("@playwright/test").Page) => {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");
  await expect(
    page.getByRole("heading", { name: "Color ramps" }),
  ).toBeVisible();
};

const openDisplayOptions = async (page: import("@playwright/test").Page) => {
  await page.getByRole("button", { name: /Show/ }).dispatchEvent("click");
  return page.getByRole("listbox", { name: "Show" });
};

for (const gamut of ["display-p3", "oklch"] as const) {
  test(`renders a saved ${gamut} background swatch across Foundations views`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const document = hydrateColorSystem(COLOR_SYSTEM_DEFAULTS);
    document.settings.colorOutput = gamut;
    document.backgroundLightness = 0.25;
    document.backgroundScaleId = document.scales.find(
      (scale) => scale.name === "Blue",
    )!.id;
    await page.addInitScript((data) => {
      localStorage.setItem(
        "leonardo:v1:foundations/color",
        JSON.stringify({ schemaVersion: 1, data }),
      );
    }, document);
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations" })
      .dispatchEvent("click");
    await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
    const copyColor = page.getByRole("button", {
      name: /Copy resolved background color/,
    });
    await expect(copyColor).toHaveAttribute(
      "aria-label",
      new RegExp(
        `Copy resolved background color ${gamut === "display-p3" ? "color\\(display-p3" : "oklch\\("}`,
      ),
    );
    await expect(
      copyColor.getByLabel("Resolved background color"),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Output gamut/ })
      .dispatchEvent("click");
    await page.getByRole("option", { name: "sRGB" }).dispatchEvent("click");
    await expect(copyColor).toHaveAttribute(
      "aria-label",
      /Copy resolved background color #[0-9a-f]{6}/i,
    );
    await page
      .getByRole("button", { name: /Output gamut/ })
      .dispatchEvent("click");
    await page
      .getByRole("option", {
        name: gamut === "display-p3" ? "Display P3" : "OKLCH",
      })
      .dispatchEvent("click");
    await expect(copyColor).toHaveAttribute(
      "aria-label",
      new RegExp(
        `Copy resolved background color ${gamut === "display-p3" ? "color\\(display-p3" : "oklch\\("}`,
      ),
    );

    await page
      .getByRole("button", { name: "Silver", exact: true })
      .dispatchEvent("click");
    await expect(page.getByLabel("Color scale name")).toBeVisible();
    await expect(page.getByRole("button", { name: /Stop 1/ })).toBeVisible();
    await page
      .getByRole("radio", { name: "Elements", exact: true })
      .dispatchEvent("click");
    await expect(
      page.getByRole("heading", { name: "Color ramps" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("renders the Evaluation palette without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await evaluationReady(page);

  await expect(
    page.locator("section").first().getByText("Silver", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Surface")).toBeVisible();
  expect(errors).toEqual([]);
});

test("exposes centered source-curve controls", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await page.getByRole("button", { name: /Advanced/ }).dispatchEvent("click");

  await expect(
    page.getByRole("slider", { name: "Background blend" }),
  ).toHaveValue("0.36");
  await expect(
    page.getByRole("slider", { name: "Source curve offset" }),
  ).toHaveValue("-1");
  await expect(
    page.getByRole("button", { name: /Source curve offset information/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("resolves the background from a scale and lightness", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");

  await expect(
    page.getByRole("button", { name: /Base color scale/ }),
  ).toBeVisible();
  const lightness = page.getByRole("slider", { name: "Background lightness" });
  await expect(lightness).toHaveValue("100");
  await expect(
    page.getByRole("button", {
      name: /Copy resolved background color #ffffff/,
    }),
  ).toBeVisible();

  await lightness.evaluate((element: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(element, "50");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // The resolved swatch tracks the scale at the chosen lightness, so it is no longer white.
  await expect(
    page.getByRole("button", {
      name: /Copy resolved background color #ffffff/,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /Copy resolved background color #[0-9a-f]{6}/,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("copies the resolved background color from its swatch", async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(testInfo.project.use.baseURL!).origin,
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");

  const copyButton = page.getByRole("button", {
    name: /Copy resolved background color/,
  });
  const label = await copyButton.getAttribute("aria-label");
  const cssValue = label?.replace("Copy resolved background color ", "").trim();
  await copyButton.dispatchEvent("click");

  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(cssValue);
  await expect(
    page.getByText(`${cssValue} copied to clipboard`, { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("shows compact gradient previews in the base scale picker", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await page
    .getByRole("button", { name: /Base color scale/ })
    .dispatchEvent("click");

  await expect(page.getByRole("option", { name: "Silver" })).toBeVisible();
  await expect(
    page.getByTestId("base-color-scale-gradient").first(),
  ).toBeVisible();
});

test("opens the Scale Editor without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");

  await page
    .getByRole("button", { name: "Silver", exact: true })
    .dispatchEvent("click");
  await expect(page.getByLabel("Color scale name")).toBeVisible();
  await expect(page.getByRole("button", { name: /Stop 1/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("comparison toggles render their rows", async ({ page }) => {
  await page.goto("/");
  await evaluationReady(page);

  const displayOptions = await openDisplayOptions(page);
  await expect(displayOptions.getByRole("option")).toHaveCount(4);
  for (const label of [
    "Opaque scale",
    "CSS opacity",
    "Show contrast",
    "Show values",
  ]) {
    await expect(
      displayOptions.getByRole("option", { name: label }),
    ).toBeVisible();
  }

  await displayOptions
    .getByRole("option", { name: "Opaque scale" })
    .dispatchEvent("click");
  await page.keyboard.press("Escape");
  await expect(
    page
      .locator(".colorEvaluationScale")
      .first()
      .getByText("Opaque", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("section").first().getByText("Silver", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Surface")).toBeVisible();
});

test("palette scroll remains responsive", async ({ page }) => {
  await page.goto("/");
  await evaluationReady(page);
  const start = performance.now();
  const scrollState = await page
    .locator(".colorEvaluationPaletteContent")
    .evaluate((content) => {
      const palette = content.parentElement;
      if (!(palette instanceof HTMLElement))
        throw new Error("Evaluation palette scroll container not found.");
      const styles = getComputedStyle(palette);
      if (styles.overflowX !== "auto" || styles.overflowY !== "auto") {
        throw new Error(
          "Evaluation palette is no longer the scroll container.",
        );
      }
      palette.scrollTop = Math.min(600, palette.scrollHeight);
      palette.scrollLeft = Math.min(600, palette.scrollWidth);
      return {
        scrollTop: palette.scrollTop,
        scrollLeft: palette.scrollLeft,
      };
    });
  await page.waitForTimeout(50);
  expect(performance.now() - start).toBeLessThan(500);
  expect(scrollState.scrollTop).toBeGreaterThan(0);
  expect(scrollState.scrollLeft).toBeGreaterThan(0);
  await expect(
    page.getByRole("heading", { name: "Color ramps" }),
  ).toBeVisible();
});

test("contrast ramp fills the available panel height and stays sticky", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page
    .getByRole("tab", { name: "Contrasts", exact: true })
    .dispatchEvent("click");

  const rampState = await page
    .locator('[aria-label="Contrast lightness ramp"]')
    .evaluate((ramp) => {
      const wrapper = ramp.parentElement;
      if (!wrapper) throw new Error("Contrast ramp wrapper not found.");
      const panel = wrapper.closest('[role="tabpanel"]');
      return {
        rampHeight: ramp.getBoundingClientRect().height,
        panelHeight: panel?.getBoundingClientRect().height ?? 0,
        position: getComputedStyle(wrapper).position,
      };
    });

  expect(rampState.rampHeight).toBeGreaterThanOrEqual(400);
  expect(rampState.rampHeight).toBeLessThanOrEqual(rampState.panelHeight);
  expect(rampState.position).toBe("sticky");
});

test("CSS export is generated without blocking the main thread", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");

  await page.evaluate(() => {
    (window as typeof window & { exportHeartbeat?: number }).exportHeartbeat =
      0;
    const tick = () => {
      (
        window as typeof window & { exportHeartbeat?: number }
      ).exportHeartbeat! += 1;
      if (
        (window as typeof window & { exportHeartbeat?: number })
          .exportHeartbeat! < 10
      )
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page
    .getByRole("radio", { name: "Code", exact: true })
    .dispatchEvent("click");
  await expect(page.getByRole("button", { name: "Copy CSS" })).toBeEnabled();
  await expect(page.locator("pre")).toContainText(
    "color(from var(--bg) srgb-linear",
  );
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { exportHeartbeat?: number })
          .exportHeartbeat,
    ),
  ).toBeGreaterThan(1);
});

test("Transparent swatches render the source color with CSS alpha", async ({
  page,
}) => {
  await page.goto("/");
  await evaluationReady(page);
  const displayOptions = await openDisplayOptions(page);
  await displayOptions
    .getByRole("option", { name: "CSS opacity" })
    .dispatchEvent("click");
  await page.keyboard.press("Escape");
  await expect(
    page
      .locator(".colorEvaluationScale")
      .first()
      .getByText("Transparent", { exact: true }),
  ).toBeVisible();
  const transparentSwatch = page
    .locator(".colorEvaluationScale")
    .first()
    .locator(".colorEvaluationSwatch")
    .nth(16);
  await expect(transparentSwatch).toBeVisible();
  const swatchState = await transparentSwatch.evaluate((element) => ({
    variable: getComputedStyle(element).getPropertyValue("--sw").trim(),
    background: getComputedStyle(element).backgroundColor,
  }));

  expect(swatchState.variable).toMatch(/rgba?\(|color\(|oklch\(/i);
  expect(swatchState.variable).toMatch(/\/|,\s*\d+(?:\.\d+)?%?\)?$/);
  expect(swatchState.variable).not.toMatch(/^#/);
  expect(swatchState.background).toMatch(/rgba?\(|color\(|oklch\(/i);
});
