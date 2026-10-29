// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
} from "../../src/features/edit-session/storage";
import { resolveColorDocument } from "../../src/features/color-system/resolution";
import {
  resolvedBackgroundLinear,
  surfaceCss,
} from "../../src/features/color-system/surfaceGeneration";
import {
  outputColorCss,
  renderGamutForOutput,
} from "../../src/features/color-system/colorMath";
import { selectMode as selectPreviewMode } from "./modeControl";

const foundations = [
  "Colors",
  "Typography",
  "Spacing",
  "Size",
  "Corner radius",
  "Elevation",
  "Motion",
] as const;
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function seed(
  page: Page,
  snapshot = createDefaultSnapshot(),
  appearance: "light" | "dark" = "light",
) {
  await page.addInitScript(
    ({ snapshot, appearance, key, preferencesKey }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 3,
          working: snapshot,
          saved: snapshot,
          isEditing: false,
          attachments: {},
          savedAttachments: {},
        }),
      );
      localStorage.setItem(
        preferencesKey,
        JSON.stringify({ version: 1, appearance, modeSelection: {} }),
      );
    },
    {
      snapshot,
      appearance,
      key: AUTHORING_STORAGE_KEY,
      preferencesKey: PREFERENCES_STORAGE_KEY,
    },
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");
}

async function open(page: Page, name: (typeof foundations)[number]) {
  await page.getByRole("tab", { name, exact: true }).dispatchEvent("click");
  const surface = page.locator(
    '[data-component="Foundations"] [data-view="elements"] [data-elements-surface]',
  );
  await expect(surface).toHaveCount(1);
  await expect(surface).toBeVisible();
  return surface;
}

async function renderedColor(page: Page, color: string) {
  return page.evaluate((color) => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = color;
    document.body.append(probe);
    const result = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return result;
  }, color);
}

function colorDocument(snapshot: EditSessionSnapshot, dark = false) {
  const modes = snapshot.modeSets.flatMap((set) => {
    const mode = set.modes.find((mode) =>
      dark && set.key === "colorScheme"
        ? mode.key === "dark"
        : mode.id === set.defaultModeId,
    );
    return mode ? [mode] : [];
  });
  return resolveColorDocument(snapshot.colorSystem, modes, undefined, {
    modeSets: snapshot.modeSets,
  });
}

function expectedBackground(snapshot: EditSessionSnapshot, dark = false) {
  const document = colorDocument(snapshot, dark);
  return outputColorCss(
    resolvedBackgroundLinear(document),
    document.settings.colorOutput,
    renderGamutForOutput(document.settings.colorOutput),
  );
}

async function expectSurface(surface: Locator, background: string) {
  await expect(surface).toHaveCSS("background-color", background);
  const corners = await surface.evaluate((element) => {
    const style = getComputedStyle(element);
    return [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomLeftRadius,
      style.borderBottomRightRadius,
    ];
  });
  expect(corners.every((corner) => Number.parseFloat(corner) > 0)).toBe(true);
  expect(new Set(corners).size).toBe(1);
}

async function geometry(page: Page) {
  return page
    .locator(
      ".typographyElementSample, .typographyElementIcon svg, .spacingElementBar, .radiusSample, [data-shadow-sample]",
    )
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect(),
          style = getComputedStyle(element);
        return {
          width: rect.width,
          height: rect.height,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          radius: style.borderTopRightRadius,
        };
      }),
    );
}

async function selectMode(page: Page, name: "Light" | "Dark") {
  await page
    .getByRole("radio", { name: "Preview", exact: true })
    .dispatchEvent("click");
  await selectPreviewMode(page, name);
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");
}

for (const appearance of ["light", "dark"] as const)
  test(`Elevation sample fills follow the preview background independently of ${appearance} app appearance`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    const snapshot = createDefaultSnapshot();
    await seed(page, snapshot, appearance);
    const surface = await open(page, "Elevation");
    const samples = surface.locator("[data-shadow-sample]");
    await expect(samples).toHaveCount(3);
    const appearanceToggle = page.getByRole("button", {
      name: "Dark app appearance",
      exact: true,
    });
    await expect(appearanceToggle).toHaveAttribute(
      "aria-pressed",
      String(appearance === "dark"),
    );
    const original = await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    );
    const before = await geometry(page);
    for (const mode of ["Light", "Dark", "Light"] as const) {
      await selectMode(page, mode);
      await expectSurface(
        surface,
        await renderedColor(
          page,
          expectedBackground(snapshot, mode === "Dark"),
        ),
      );
      const fill = mode === "Light" ? "rgb(255, 255, 255)" : "rgb(91, 91, 91)";
      for (const sample of await samples.all())
        await expect(sample).toHaveCSS("background-color", fill);
      expect(await geometry(page)).toEqual(before);
      const shadows = await samples.evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).boxShadow),
      );
      await appearanceToggle.click();
      await expect(appearanceToggle).toHaveAttribute(
        "aria-pressed",
        String(appearance === "light"),
      );
      for (const sample of await samples.all())
        await expect(sample).toHaveCSS("background-color", fill);
      expect(
        await samples.evaluateAll((elements) =>
          elements.map((element) => getComputedStyle(element).boxShadow),
        ),
      ).toEqual(shadows);
      await expectSurface(
        surface,
        await renderedColor(
          page,
          expectedBackground(snapshot, mode === "Dark"),
        ),
      );
      await page.locator('[data-component="ElevationElements"]').screenshot({
        path: info.outputPath(
          `elevation-${mode.toLowerCase()}-${appearance}-app.png`,
        ),
      });
      await appearanceToggle.click();
      await expect(appearanceToggle).toHaveAttribute(
        "aria-pressed",
        String(appearance === "dark"),
      );
    }
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        AUTHORING_STORAGE_KEY,
      ),
    ).toBe(original);
  });

test("Elevation sample fills follow adaptive preview backgrounds without changing shadows or saved data", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const snapshot = createDefaultSnapshot();
  snapshot.adaptiveClaims["color.backgroundLightness"] = snapshot.modeSets.find(
    (set) => set.key === "colorScheme",
  )!.id;
  await seed(page, snapshot);
  const surface = await open(page, "Elevation");
  const samples = surface.locator("[data-shadow-sample]");
  await expect(samples).toHaveCount(3);
  const before = await geometry(page);
  const shadows = await samples.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).boxShadow),
  );
  const original = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  for (const lightness of ["0", "100", "0"]) {
    await page
      .getByRole("radio", { name: "Preview", exact: true })
      .dispatchEvent("click");
    await page
      .getByRole("button", { name: "Adaptive controls", exact: true })
      .first()
      .click();
    await page
      .getByRole("slider", { name: "Background lightness", exact: true })
      .fill(lightness);
    await page.keyboard.press("Escape");
    await page
      .getByRole("radio", { name: "Elements", exact: true })
      .dispatchEvent("click");
    await expect(surface).toHaveCSS(
      "color",
      lightness === "100" ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)",
    );
    const fill = lightness === "100" ? "rgb(255, 255, 255)" : "rgb(91, 91, 91)";
    for (const sample of await samples.all())
      await expect(sample).toHaveCSS("background-color", fill);
    expect(await geometry(page)).toEqual(before);
    expect(
      await samples.evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).boxShadow),
      ),
    ).toEqual(shadows);
  }
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(original);
});

for (const width of [1600, 800])
  test(`Every Elements surface follows modes at ${width}px without changing samples or saved data`, async ({
    page,
  }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 1000 });
    const snapshot = createDefaultSnapshot();
    await seed(page, snapshot);
    const light = await renderedColor(page, expectedBackground(snapshot));
    const dark = await renderedColor(page, expectedBackground(snapshot, true));
    expect(light).not.toBe(dark);
    const original = await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    );
    for (const name of foundations) {
      const surface = await open(page, name);
      await selectMode(page, "Light");
      await expectSurface(surface, light);
      await expect(surface.locator("header")).toHaveCount(0);
      if (name === "Typography") {
        await expect(page.locator(".typographyElementIcon svg")).toHaveCount(
          17,
        );
        await expect(
          surface.locator(".typographyElementIcon svg path").first(),
        ).toHaveCSS("fill", "rgb(0, 0, 0)");
      }
      const before = await geometry(page);
      await selectMode(page, "Dark");
      await expectSurface(surface, dark);
      if (name === "Typography")
        await expect(page.locator(".typographyElementIcon svg")).toHaveCount(
          17,
        );
      expect(await geometry(page)).toEqual(before);
      if (["Typography", "Spacing", "Size"].includes(name)) {
        const sample = surface
          .locator(".typographyElementSample, .spacingElementBar")
          .first();
        await expect(sample).toHaveCSS("color", "rgb(255, 255, 255)");
        if (name !== "Typography")
          await expect(sample).toHaveCSS(
            "background-color",
            "rgb(255, 255, 255)",
          );
      }
      if (name === "Typography") {
        await expect(
          surface.locator(".typographyElementIcon svg").first(),
        ).toHaveCSS("color", "rgb(255, 255, 255)");
        await expect(
          surface.locator(".typographyElementIcon svg path").first(),
        ).toHaveCSS("fill", "rgb(255, 255, 255)");
      }
      if (["Spacing", "Size", "Corner radius"].includes(name)) {
        await expect(surface.getByRole("heading").first()).toHaveCSS(
          "color",
          "rgb(255, 255, 255)",
        );
      }
      if (name === "Corner radius")
        await expect(
          surface.locator(".radiusElementDetails").first(),
        ).toHaveCSS("color", "rgb(255, 255, 255)");
      if (name === "Elevation") {
        await expect(surface.locator("[data-elevation-id]").first()).toHaveCSS(
          "color",
          "rgb(255, 255, 255)",
        );
        await expect(surface.locator("summary").first()).toHaveCSS(
          "color",
          "rgb(255, 255, 255)",
        );
      }
      expect(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          AUTHORING_STORAGE_KEY,
        ),
      ).toBe(original);
      await page.locator('[data-component="Foundations"]').screenshot({
        path: info.outputPath(
          `${name.toLowerCase().replaceAll(" ", "-")}-${width}-dark.png`,
        ),
      });
      if (name !== "Motion") {
        await page
          .getByRole("radio", { name: "Analyze", exact: true })
          .dispatchEvent("click");
        await expect(
          page.locator(
            '[data-component="Foundations"] [data-elements-surface]',
          ),
        ).toHaveCount(0);
        await page
          .getByRole("radio", { name: "Code", exact: true })
          .dispatchEvent("click");
        await expect(
          page.locator(
            '[data-component="Foundations"] [data-elements-surface]',
          ),
        ).toHaveCount(0);
        await page
          .getByRole("radio", { name: "Elements", exact: true })
          .dispatchEvent("click");
      }
    }
  });

for (const appearance of ["light", "dark"] as const)
  test(`Without a color mode, every Elements surface uses the authored background independently of ${appearance} app appearance`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    const snapshot = createDefaultSnapshot();
    snapshot.modeSets = snapshot.modeSets.filter(
      (set) => set.key !== "colorScheme",
    );
    snapshot.adaptiveClaims = Object.fromEntries(
      Object.entries(snapshot.adaptiveClaims).filter(([, owner]) =>
        snapshot.modeSets.some((set) => set.id === owner),
      ),
    );
    snapshot.colorSystem.backgroundLightness = 0.2;
    snapshot.colorSystem.backgroundScaleId = snapshot.colorSystem.scales.find(
      (scale) => scale.name === "Red",
    )!.id;
    await seed(page, snapshot, appearance);
    const background = await renderedColor(page, expectedBackground(snapshot));
    const original = await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    );
    await page
      .getByRole("radio", { name: "Preview", exact: true })
      .dispatchEvent("click");
    await expect(
      page.getByRole("radiogroup", { name: "Color scheme", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("radio", { name: "Elements", exact: true })
      .dispatchEvent("click");
    for (const name of foundations) {
      const surface = await open(page, name);
      await expectSurface(surface, background);
      if (name === "Elevation") {
        for (const sample of await surface
          .locator("[data-shadow-sample]")
          .all()) {
          await expect(sample).toHaveCSS("background-color", "rgb(91, 91, 91)");
        }
      }
    }
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        AUTHORING_STORAGE_KEY,
      ),
    ).toBe(original);
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Design", exact: true })
      .dispatchEvent("click");
    await expectSurface(
      page.locator('[data-component="Design"] [data-elements-surface]'),
      background,
    );
  });

test("Adaptive background previews update every Elements surface without saving", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const snapshot = createDefaultSnapshot();
  snapshot.adaptiveClaims["color.backgroundLightness"] = snapshot.modeSets.find(
    (set) => set.key === "colorScheme",
  )!.id;
  await seed(page, snapshot);
  const surface = await open(page, "Colors");
  const before = await surface.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  const original = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  await page
    .getByRole("radio", { name: "Preview", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("button", { name: "Adaptive controls", exact: true })
    .first()
    .click();
  const slider = page.getByRole("slider", {
    name: "Background lightness",
    exact: true,
  });
  await slider.fill("42");
  await page.keyboard.press("Escape");
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");
  await expect(surface).not.toHaveCSS("background-color", before);
  const preview = await surface.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  for (const name of foundations)
    await expectSurface(await open(page, name), preview);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(original);
});

test("Colors retains its Surface picker without changing the background of other Elements views", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const snapshot = createDefaultSnapshot();
  await seed(page, snapshot);
  const original = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  const surface = await open(page, "Colors");
  const selected = snapshot.colorSystem.surfaces.find(
    (surface) => !surface.base && (surface.contrast ?? 1) > 1,
  )!;
  const background = await renderedColor(page, expectedBackground(snapshot));
  const selectedBackground = await renderedColor(
    page,
    surfaceCss(selected, colorDocument(snapshot)),
  );
  expect(selectedBackground).not.toBe(background);
  await page
    .locator('[data-component="Foundations"] [data-view="elements"]')
    .getByRole("button", { name: / Surface$/ })
    .click();
  await page.getByRole("option", { name: selected.name, exact: true }).click();
  await expectSurface(surface, selectedBackground);
  await expectSurface(await open(page, "Spacing"), background);
  await expectSurface(await open(page, "Colors"), selectedBackground);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(original);
});
