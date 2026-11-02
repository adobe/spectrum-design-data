// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import { platformSwitcher } from "../../plugins/site/assets/platform-switcher.js";

const ios = { id: "ios", name: "iOS" };
const platforms = [
  { id: "react-spectrum", label: "React Spectrum", path: "rsp/" },
  { id: "ios", label: "Spectrum iOS", path: "spios/" },
];
const serve =
  (body, ok = true) =>
  async () => ({ ok, json: async () => body });

test("lists the other platforms, keeps the component, and links to all platforms", async (t) => {
  const html = await platformSwitcher(ios, "button", serve(platforms));
  t.true(html.includes('href="../rsp/?c=button"'));
  t.false(html.includes("spios"));
  t.true(html.includes('href="../"'));
});

test("shows nothing without platforms.json or without a platform build", async (t) => {
  t.is(await platformSwitcher(ios, "button", serve({}, false)), "");
  t.is(await platformSwitcher(ios, "button", serve({ not: "a list" })), "");
  t.is(
    await platformSwitcher(ios, "button", async () => {
      throw new Error("offline");
    }),
    "",
  );
  t.is(await platformSwitcher(undefined, "button", serve(platforms)), "");
});
