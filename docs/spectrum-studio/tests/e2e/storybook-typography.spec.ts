// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

type StoryIndex = { entries: Record<string, { id: string; type: string }> };

test("Typography stories render and their interactions pass", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const index = (await (await request.get("/index.json")).json()) as StoryIndex;
  const stories = Object.values(index.entries).filter(
    (entry) =>
      entry.type === "story" &&
      /^panels-(typography-foundation|line-height-card|type-scale-settings)--/.test(
        entry.id,
      ),
  );
  expect(stories).toHaveLength(17);
  await page.addInitScript(() => {
    let channel:
      | {
          on: (
            event: string,
            handler: (payload?: { message?: string }) => void,
          ) => void;
        }
      | undefined;
    const state = window as unknown as { typographyStoryResult?: string };
    Object.defineProperty(window, "__STORYBOOK_ADDONS_CHANNEL__", {
      configurable: true,
      get: () => channel,
      set: (value) => {
        channel = value;
        value.on("storyRendered", () => {
          state.typographyStoryResult = "rendered";
        });
        for (const event of [
          "playFunctionThrewException",
          "storyThrewException",
          "storyErrored",
          "storyMissing",
        ]) {
          value.on(event, (payload?: { message?: string }) => {
            state.typographyStoryResult = `${event}: ${payload?.message ?? ""}`;
          });
        }
      },
    });
  });
  const interactions = new Set([
    "initial-sections",
    "used-card-replacement",
    "units-and-publishing",
    "adaptive",
    "name-validation",
    "shared-ratio",
  ]);
  for (const story of stories) {
    const key = story.id.split("--")[1];
    await page.setViewportSize({
      width: key === "narrow" ? 480 : 1280,
      height: 900,
    });
    const errors: string[] = [];
    const collect = (error: Error) => errors.push(error.message);
    page.on("pageerror", collect);
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    const result = await page.waitForFunction(
      () =>
        (window as unknown as { typographyStoryResult?: string })
          .typographyStoryResult,
    );
    expect(await result.jsonValue(), story.id).toBe("rendered");
    if (interactions.has(key))
      await expect(
        page.locator('[data-play-complete="true"]'),
        story.id,
      ).toHaveCount(1);
    expect(errors, story.id).toEqual([]);
    page.off("pageerror", collect);
  }
});
