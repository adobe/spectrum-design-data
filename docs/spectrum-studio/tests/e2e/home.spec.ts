// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("raw Spectrum tokens follow chrome appearance without leaking into authored previews", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 2400, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "leonardo:v1:modes/adaptive-claims",
      JSON.stringify({
        schemaVersion: 1,
        data: { "color.backgroundLightness": "mode-set-color-scheme" },
      }),
    );
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Home", exact: true })
    .dispatchEvent("click");

  const home = page.locator('[data-component="Home"]');
  const officialColors = {
    Light: {
      red: "rgba(255, 246, 245)",
      blue: "rgba(245, 249, 255)",
      purple: "rgba(251, 247, 254)",
    },
    Dark: {
      red: "rgba(54, 10, 3)",
      blue: "rgba(14, 23, 63)",
      purple: "rgba(41, 0, 79)",
    },
  };
  for (const appearance of ["Light", "Dark", "Light"] as const) {
    await page.getByRole("radio", { name: appearance, exact: true }).click();
    await expect(home).toHaveClass(
      new RegExp(`spectrum--${appearance.toLowerCase()}`),
    );
    const colors = await home.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        red: computed.getPropertyValue("--spectrum-red-100").trim(),
        blue: computed.getPropertyValue("--spectrum-blue-100").trim(),
        purple: computed.getPropertyValue("--spectrum-purple-100").trim(),
        transparentBlack: computed
          .getPropertyValue("--spectrum-transparent-black-100")
          .trim(),
        disabledOpacity: computed
          .getPropertyValue("--spectrum-opacity-disabled")
          .trim(),
      };
    });
    expect(colors).toEqual({
      ...officialColors[appearance],
      transparentBlack: "rgba(0, 0, 0, 0.09)",
      disabledOpacity: "0.3",
    });
    expect(
      await page
        .locator('[data-component="TopBar"]')
        .evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue("--spectrum-red-100")
            .trim(),
        ),
    ).toBe(officialColors[appearance].red);
    const gradient = await home
      .locator(".homeHero")
      .evaluate((element) => getComputedStyle(element).backgroundImage);
    expect(gradient).toContain("radial-gradient(");
    expect(gradient).toContain("linear-gradient(");
    expect(gradient).not.toContain("var(");

    await page
      .getByRole("button", { name: "Adaptive controls", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Adaptive controls",
      exact: true,
    });
    await expect(dialog).toHaveClass(
      new RegExp(`spectrum--${appearance.toLowerCase()}`),
    );
    expect(
      await dialog.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--spectrum-red-100").trim(),
      ),
    ).toBe(officialColors[appearance].red);
    await page.keyboard.press("Escape");
  }

  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Preview", exact: true })
    .dispatchEvent("click");
  const preview = page.getByRole("region", {
    name: "Sample application preview",
    exact: true,
  });
  await expect(preview).toBeVisible();
  for (const appearance of ["Dark", "Light"] as const) {
    await page.getByRole("radio", { name: appearance, exact: true }).click();
    const previewStyles = await preview.evaluate((element) => ({
      scopedAncestor:
        element.closest(".spectrum, .spectrum--light, .spectrum--dark") !==
        null,
      red: getComputedStyle(element)
        .getPropertyValue("--spectrum-red-100")
        .trim(),
      disabledOpacity: getComputedStyle(element)
        .getPropertyValue("--spectrum-opacity-disabled")
        .trim(),
      authoredColor: getComputedStyle(element)
        .getPropertyValue("--sample-canvas")
        .trim(),
    }));
    expect(previewStyles).toMatchObject({
      scopedAncestor: false,
      red: "",
      disabledOpacity: "",
    });
    expect(previewStyles.authoredColor).not.toBe("");
  }
  expect(errors).toEqual([]);
});

test("System health page renders the six sample insight cards separately from Home", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Home" })
    .dispatchEvent("click");

  const home = page.locator('[data-component="Home"]');
  await expect(
    home.getByRole("heading", { name: "Quick links", exact: true }),
  ).toBeVisible();
  await expect(home.locator("[data-pillar]")).toHaveCount(0);
  await home.locator('a[href="#system-health"]').click();

  const health = page.locator('[data-component="SystemHealth"]');
  await expect(
    health.getByRole("heading", {
      name: "System health",
      level: 1,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    health.getByText(
      "Sample data previews system health. Live metrics are not connected yet.",
    ),
  ).toBeVisible();
  await expect(
    health.locator(
      '[data-component="BentoGrid"] > [data-component="BentoCard"]',
    ),
  ).toHaveCount(6);
  await expect(health.locator("[data-pillar]")).toHaveCount(5);
  await expect(health.getByRole("meter", { name: /score$/ })).toHaveCount(5);
  await expect(health.locator(".homeHealthPillars")).toHaveCSS(
    "display",
    "grid",
  );

  const attention = health.getByRole("region", { name: "Needs attention" });
  await expect
    .poll(() => attention.getByRole("listitem").count())
    .toBeGreaterThan(0);

  const heatmap = health
    .getByRole("region", { name: "Platform divergence" })
    .getByRole("table");
  await expect(heatmap.getByRole("row")).toHaveCount(7);
  await expect(heatmap.getByRole("cell").first()).toHaveText(/\d+%/);

  await expect(
    health.getByRole("region", { name: "Derived vs overridden" }),
  ).toBeVisible();
  await expect(
    health
      .getByRole("region", { name: "Accessibility across modes" })
      .getByRole("meter")
      .first(),
  ).toBeVisible();
  await expect(
    health
      .getByRole("region", { name: "Foundation coverage" })
      .getByRole("row"),
  ).toHaveCount(8);

  for (const appearance of ["Dark", "Light"] as const) {
    const toggle = page.getByRole("button", {
      name: "Dark app appearance",
      exact: true,
    });
    if (
      (await toggle.getAttribute("aria-pressed")) !==
      String(appearance === "Dark")
    )
      await toggle.click();
    await expect(health).toHaveClass(
      new RegExp(`spectrum--${appearance.toLowerCase()}`),
    );
  }
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Home", exact: true })
    .click();
  await expect(
    home.getByRole("heading", { name: "Recent updates", exact: true }),
  ).toBeVisible();
  await expect(health).toHaveCount(0);
  const navigation = page.getByRole("navigation", {
    name: "Navigation",
    exact: true,
  });
  await navigation
    .getByRole("link", { name: "System health", exact: true })
    .click();
  await expect(health).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "System health", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  expect(errors).toEqual([]);
});
