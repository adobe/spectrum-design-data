// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

interface StoryIndex {
  entries: Record<
    string,
    { id: string; title: string; name: string; type: "story" | "docs" }
  >;
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

const families = [
  {
    title: "Panels/Data vis point",
    interaction: ["Owned contrast", "Mode override", "Static color"],
  },
  {
    title: "Panels/Categorical chooser",
    interaction: [
      "Selection and order",
      "Manual acknowledgment",
      "Rename while choosing",
      "Stale context",
      "Failed apply",
      "Cancel pending apply",
      "Transparent source",
    ],
  },
  {
    title: "Views/Data vis comparisons",
    interaction: ["Background", "Simulation"],
  },
  {
    title: "Views/Data vis examples",
    interaction: ["Sequential", "Categorical"],
  },
];

for (const family of families)
  test(`${family.title}: interactions and visual states`, async ({
    page,
    request,
  }, info) => {
    test.setTimeout(180_000);
    const index: StoryIndex = await (await request.get("/index.json")).json();
    const stories = Object.values(index.entries).filter(
      (entry) => entry.title === family.title && entry.type === "story",
    );
    expect(stories.length).toBeGreaterThan(5);
    for (const story of stories) {
      await page.setViewportSize({
        width: story.name === "Narrow" ? 390 : 1280,
        height: 1000,
      });
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
      const canvas = page.locator("#storybook-root");
      await expect(canvas).not.toBeEmpty();
      if (family.interaction.includes(story.name))
        await expect(page.locator('[data-play-complete="true"]')).toBeVisible();
      if (
        family.title === "Panels/Data vis point" &&
        story.name === "Read-only"
      ) {
        await expect(
          page.getByRole("textbox", { name: "Contrast", exact: true }),
        ).toHaveAttribute("readonly", "");
        await expect(
          page.getByText("Color source", { exact: true }),
        ).toBeVisible();
        await expect(page.getByText("Blue", { exact: true })).toBeVisible();
        await expect(
          page.getByRole("button", { name: / Color source$/ }),
        ).toHaveCount(0);
      }
      if (family.title === "Panels/Categorical chooser") {
        if (story.name === "Loading")
          await expect(
            page.getByRole("progressbar", {
              name: "Finding categorical suggestions",
            }),
          ).toBeVisible();
        if (story.name === "Suggestion error")
          await expect(page.getByRole("alert")).toContainText(
            "worker is unavailable",
          );
        if (story.name === "Empty" || story.name === "Unavailable source")
          await expect(
            page.getByRole("button", { name: "Apply", exact: true }),
          ).toBeDisabled();
        if (story.name === "Transparent source") {
          await expect(
            page.getByRole("img", {
              name: "Selected categorical colors",
              exact: true,
            }),
          ).toHaveCSS("background-color", "rgb(40, 40, 40)");
        }
      }
      if (story.name === "Narrow") {
        expect(
          await canvas.evaluate(
            (element) => element.scrollWidth - element.clientWidth,
          ),
        ).toBeLessThanOrEqual(1);
        if (family.title === "Views/Data vis comparisons") {
          expect(
            await canvas.evaluate((element) =>
              Array.from(element.querySelectorAll("*")).some(
                (child) =>
                  child.scrollWidth > child.clientWidth + 1 &&
                  ["auto", "scroll"].includes(
                    getComputedStyle(child).overflowX,
                  ),
              ),
            ),
          ).toBe(true);
        }
      }
      await page.screenshot({
        path: info.outputPath(`${story.id}.png`),
        animations: "disabled",
      });
    }
  });

for (const title of [
  "Panels/Data vis point",
  "Panels/Categorical chooser",
  "Views/Data vis comparisons",
  "Views/Data vis examples",
]) {
  test(`${title}: light and dark narrow interactions`, async ({
    page,
    request,
  }, info) => {
    test.setTimeout(120_000);
    const index: StoryIndex = await (await request.get("/index.json")).json();
    const first = Object.values(index.entries).find(
      (entry) => entry.title === title && entry.type === "story",
    );
    if (!first) throw new Error(`Missing approved story family ${title}.`);
    for (const scheme of ["light", "dark"]) {
      await page.setViewportSize({ width: 390, height: 1000 });
      await page.goto(
        `/iframe.html?id=${first.id}&viewMode=story&globals=colorScheme:${scheme}`,
      );
      await expect(page.locator('[data-play-complete="true"]')).toBeVisible();
      const background = await page
        .locator("[data-data-vis-story]")
        .evaluate((element) => {
          const channels =
            getComputedStyle(element).backgroundColor.match(/\d+(?:\.\d+)?/g);
          if (!channels || channels.length < 3)
            throw new Error(
              "The story surface requires a concrete background.",
            );
          return (
            channels
              .slice(0, 3)
              .reduce((sum, channel) => sum + Number(channel), 0) / 3
          );
        });
      if (scheme === "dark") expect(background).toBeLessThan(80);
      else expect(background).toBeGreaterThan(200);
      expect(
        await page
          .locator("#storybook-root")
          .evaluate((element) => element.scrollWidth - element.clientWidth),
      ).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: info.outputPath(`${scheme}-narrow.png`),
        animations: "disabled",
      });
    }
  });
}
