// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
} from "../../src/features/edit-session/storage";
import { selectColorPanelSection } from "./colorPanelSection";

test.use({ viewport: { width: 1800, height: 1000 } });

async function openFoundations(page: Page) {
  const snapshot = createDefaultSnapshot();
  await page.addInitScript(
    ({ key, record }) => {
      if (localStorage.getItem(key) === null)
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
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
}

async function expectCompactIndex(control: Locator) {
  const layout = await control.evaluate((element) => {
    const container = element.closest<HTMLElement>("[data-swatch-index]");
    const slider = element.closest(".editableSliderCompactLabel");
    if (!container || !slider)
      throw new Error("The scale index must be the slider label.");
    const label = slider.children.item(0);
    const track = slider.children.item(1);
    if (!label || !track) throw new Error("The slider layout is incomplete.");
    const probe = document.createElement("span");
    probe.textContent = "000000000";
    probe.style.font = getComputedStyle(element).font;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const limit = probe.getBoundingClientRect().width;
    probe.remove();
    const field =
      element.closest('[data-component="TokenComboBox"]') ?? element;
    return {
      width: Math.max(
        field.getBoundingClientRect().width,
        element.parentElement?.getBoundingClientRect().width ?? 0,
      ),
      limit,
      gap:
        track.getBoundingClientRect().left -
        field.getBoundingClientRect().right,
      emptyLabel: label.childElementCount === 0,
    };
  });
  expect(layout.width).toBeLessThanOrEqual(layout.limit + 1);
  expect(layout.gap).toBeCloseTo(4, 0);
  expect(layout.emptyLabel).toBe(false);
}

for (const kind of ["shared contrast", "custom contrast", "opacity"] as const) {
  test(`${kind} indices edit inline, accept only numbers and persist`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openFoundations(page);
    let panel: Locator;
    let rows: Locator;
    if (kind === "opacity") {
      await page.getByRole("tab", { name: "Opacity", exact: true }).click();
      panel = page.getByRole("region", {
        name: "Opacity swatches",
        exact: true,
      });
      rows = panel.locator("[data-opacity-id]");
      await panel
        .getByRole("button", { name: "Add opacity", exact: true })
        .click();
    } else {
      await page.getByRole("tab", { name: "Colors", exact: true }).click();
      if (kind === "custom contrast") {
        await selectColorPanelSection(page, "Color scales");
        await page
          .getByRole("tabpanel", { name: "Colors", exact: true })
          .getByRole("button", { name: "Gray", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Custom contrast steps", exact: true })
          .click();
        panel = page.getByRole("region", {
          name: "Custom contrast steps",
          exact: true,
        });
      } else {
        await selectColorPanelSection(page, "Contrasts");
        panel = page.getByRole("tabpanel", { name: "Contrasts", exact: true });
      }
      rows = panel.locator("[data-contrast-id]");
      await panel
        .getByRole("button", { name: "Add contrast", exact: true })
        .click();
    }
    const idAttribute =
      kind === "opacity" ? "data-opacity-id" : "data-contrast-id";
    const id = await rows.last().getAttribute(idAttribute);
    const row = panel.locator(`[${idAttribute}="${id}"]`);
    const originalValue = await row.getByRole("slider").inputValue();
    const button = row.getByRole("button", { name: /^Scale index for / });
    const previousIndex = (await button.innerText()).trim();
    const input = row.getByRole("combobox");
    await expectCompactIndex(button);
    await expect(input).toHaveCount(0);
    await button.click();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(previousIndex);
    await expectCompactIndex(input);
    await input.pressSequentially("abc!?");
    await expect(input).toHaveValue(previousIndex);
    await input.fill("550abc");
    await expect(input).toHaveValue(previousIndex);

    await input.fill("500");
    await expect(
      page.getByRole("option", { name: "500", exact: true }),
    ).toHaveCount(0);
    await input.press("Escape");
    await expect(button).toHaveText(previousIndex);
    await expect(button).toBeFocused();
    await expect(input).toHaveCount(0);
    await button.click();
    await input.fill("550");
    await expect(
      page.getByRole("option", { name: /Use this value/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("option", { name: "550", exact: true }),
    ).toHaveCount(1);
    await page.getByRole("option", { name: "550", exact: true }).click();
    await expect(input).toHaveCount(0);
    await expect(button).toHaveText("550");
    await expect(row.getByRole("slider")).toHaveValue(originalValue);
    const values = (
      await rows
        .getByRole("button", { name: /^Scale index for / })
        .allTextContents()
    ).map((text) => Number(text.trim()));
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(values[values.indexOf(550) - 1]).toBe(500);
    expect(values[values.indexOf(550) + 1]).toBe(600);

    await button.click();
    await input.fill("500");
    await input.press("Enter");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await input.press("Escape");
    await expect(button).toHaveText("550");
    await button.click();
    await input.fill("0");
    await input.press("Enter");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveValue("0");
    await input.press("Escape");
    await expect(button).toHaveText("550");

    await button.click();
    await input.fill("575");
    await input.press("Tab");
    await expect(input).toHaveCount(0);
    await expect(button).toHaveText("575");
    await button.click();
    await input.fill("550");
    await input.press("Enter");
    await expect(button).toHaveText("550");

    if (kind === "custom contrast") {
      await page
        .getByRole("dialog", { name: "Edit Gray scale", exact: true })
        .focus();
      await page.keyboard.press("Escape");
    }
    await page.reload();
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .click();
    if (kind === "opacity") {
      await page.getByRole("tab", { name: "Opacity", exact: true }).click();
      panel = page.getByRole("region", {
        name: "Opacity swatches",
        exact: true,
      });
    } else {
      await page.getByRole("tab", { name: "Colors", exact: true }).click();
      if (kind === "custom contrast") {
        await selectColorPanelSection(page, "Color scales");
        await page
          .getByRole("tabpanel", { name: "Colors", exact: true })
          .getByRole("button", { name: "Gray", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Custom contrast steps", exact: true })
          .click();
        panel = page.getByRole("region", {
          name: "Custom contrast steps",
          exact: true,
        });
      } else {
        await selectColorPanelSection(page, "Contrasts");
        panel = page.getByRole("tabpanel", { name: "Contrasts", exact: true });
      }
    }
    await expect(
      panel
        .locator(`[${idAttribute}="${id}"]`)
        .getByRole("button", { name: /^Scale index for / }),
    ).toHaveText("550");
    expect(errors).toEqual([]);
  });
}
