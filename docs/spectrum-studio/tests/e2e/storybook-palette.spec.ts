// Copyright 2026 Adobe. All rights reserved.
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

type StorybookIndex = { entries: Record<string, { id: string; type: string }> };

// Storybook emits these on its channel; the setter hook catches the channel before the preview renders.
const trackStoryResult = () => {
  let channel:
    | {
        on: (
          event: string,
          handler: (payload?: { message?: string }) => void,
        ) => void;
      }
    | undefined;
  Object.defineProperty(window, "__STORYBOOK_ADDONS_CHANNEL__", {
    configurable: true,
    get: () => channel,
    set: (value) => {
      channel = value;
      value.on("storyRendered", () => {
        (window as unknown as { __storyResult: string }).__storyResult =
          "rendered";
      });
      for (const event of [
        "playFunctionThrewException",
        "storyThrewException",
        "storyErrored",
        "storyMissing",
      ]) {
        value.on(event, (payload?: { message?: string }) => {
          (window as unknown as { __storyResult: string }).__storyResult =
            `${event}: ${payload?.message ?? ""}`;
        });
      }
    },
  });
};

async function expectStoriesPass(
  page: Page,
  request: APIRequestContext,
  pattern: RegExp,
  minimum: number,
) {
  const index = (await (
    await request.get("/index.json")
  ).json()) as StorybookIndex;
  const ids = Object.values(index.entries)
    .filter((entry) => entry.type === "story" && pattern.test(entry.id))
    .map((entry) => entry.id);
  expect(ids.length).toBeGreaterThanOrEqual(minimum);

  await page.addInitScript(trackStoryResult);
  for (const id of ids) {
    const errors: string[] = [];
    const onPageError = (error: Error) => errors.push(error.message);
    page.on("pageerror", onPageError);
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    const result = await page.waitForFunction(
      () => (window as unknown as { __storyResult?: string }).__storyResult,
    );
    expect(await result.jsonValue(), id).toBe("rendered");
    expect(errors, id).toEqual([]);
    page.off("pageerror", onPageError);
  }
}

test("palette stories render and their play functions pass", async ({
  page,
  request,
}) => {
  await expectStoriesPass(
    page,
    request,
    /^components-palette-(swatch-picker|color-row)--/,
    15,
  );
});

test("Logic card and preview stories render and their play functions pass", async ({
  page,
  request,
}) => {
  await expectStoriesPass(
    page,
    request,
    /^components-(rule-card|scale-card|interpolation-card|used-by-tags|scale-sparkline|interpolation-preview|math-formula)--/,
    25,
  );
});
