// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
} from "../../src/features/edit-session/storage";
import { createRule } from "../../src/features/logic/model";
import {
  createScaleType,
  scaleTypeBadgeLabel,
} from "../../src/features/scales/scaleType";
import {
  interpolationBadgeLabel,
  type Interpolation,
} from "../../src/features/scales/interpolationDefinition";

test("Logic cards share type colors across rules, formulas and interpolations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const snapshot = createDefaultSnapshot();
  const types = [
    "rounding",
    "scale-naming",
    "generator",
    "conditional",
  ] as const;
  snapshot.rules = types.map((type) => ({
    ...createRule(type),
    id: `presentation-${type}`,
    name: `Example ${type}`,
  }));
  // Keep the shipped library for existing foundation references.
  snapshot.rules.push(...createDefaultSnapshot().rules!);
  const formulas = [
    snapshot.scaleTypes!.find((formula) => formula.kind === "type-scale")!,
    ...(["geometric", "linear", "expression"] as const).map((kind) => ({
      ...createScaleType(kind),
      name: `Example ${kind}`,
    })),
  ];
  snapshot.scaleTypes!.push(...formulas.slice(1));
  const interpolations: Interpolation[] = [
    ...(["linear", "cosine", "exponential"] as const).map((method) => ({
      id: `presentation-${method}`,
      name: `Example ${method} interpolation`,
      description: "",
      kind: "method" as const,
      method,
    })),
    {
      id: "presentation-custom",
      name: "Example custom interpolation",
      description: "",
      kind: "expression",
      expression: "x",
      parameters: [],
    },
  ];
  snapshot.interpolations!.push(...interpolations);
  await page.addInitScript(
    ({ key, record }) => {
      localStorage.setItem(key, JSON.stringify(record));
    },
    {
      key: AUTHORING_STORAGE_KEY,
      record: {
        version: AUTHORING_RECORD_VERSION,
        working: snapshot,
        saved: snapshot,
        isEditing: true,
        attachments: {},
        savedAttachments: {},
      },
    },
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Logic" })
    .click();
  await page.getByRole("tab", { name: "Rules", exact: true }).click();
  const labels = [
    "Rounding rules",
    "Naming rules",
    "Generators",
    "Conditional rules",
  ];
  const colors: string[] = [];
  for (const [index, label] of labels.entries()) {
    const section = page.getByRole("region", { name: label, exact: true });
    await expect(
      section.getByRole("heading", { name: label, exact: true }),
    ).toBeVisible();
    const card = section.getByRole("article", {
      name: `Example ${types[index]}`,
      exact: true,
    });
    await expect(card).toBeVisible();
    const badge = card.getByText(
      ["Rounding", "Scale naming", "Generator", "Conditional"][index],
      { exact: true },
    );
    colors.push(
      await badge.evaluate(
        (element) =>
          getComputedStyle(element.closest('[role="presentation"]')!)
            .backgroundColor,
      ),
    );
  }
  expect(new Set(colors).size).toBe(4);
  await page.getByRole("tab", { name: "Formulas", exact: true }).click();
  const formulaColors: string[] = [];
  for (const formula of formulas) {
    const card = page.getByRole("article", { name: formula.name, exact: true });
    await expect(card).toBeVisible();
    formulaColors.push(
      await card
        .locator('[role="presentation"]')
        .filter({ hasText: scaleTypeBadgeLabel(formula.kind) })
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    );
  }
  expect(new Set(formulaColors).size).toBe(4);
  const interpolationColors: string[] = [];
  for (const interpolation of interpolations) {
    const card = page.getByRole("article", {
      name: interpolation.name,
      exact: true,
    });
    await expect(card).toBeVisible();
    interpolationColors.push(
      await card
        .locator('[role="presentation"]')
        .filter({ hasText: interpolationBadgeLabel(interpolation) })
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    );
  }
  expect(new Set(interpolationColors).size).toBe(4);
  expect(
    interpolationColors.every((color) => color !== "rgba(0, 0, 0, 0)"),
  ).toBe(true);
  expect(interpolationColors[0]).toBe(formulaColors[2]);
  expect(interpolationColors[3]).toBe(formulaColors[3]);
  const formulaOrder = await page
    .locator('[data-component="ScaleTypeCard"]')
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-scale-type-id")),
    );
  expect(formulaOrder).toEqual(
    snapshot.scaleTypes!.map((formula) => formula.id),
  );
  const interpolationOrder = await page
    .locator('[data-component="InterpolationCard"]')
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-interpolation-id")),
    );
  expect(interpolationOrder).toEqual(
    snapshot.interpolations!.map((interpolation) => interpolation.id),
  );
  expect(errors).toEqual([]);
});
