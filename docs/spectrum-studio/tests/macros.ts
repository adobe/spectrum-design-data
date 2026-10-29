// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const plugin = require("unplugin-parcel-macros").vite() as {
  transform(code: string, filePath: string): Promise<{ code: string }>;
  resolveId(id: string): string | undefined;
  load(id: string): string;
};
const context = { addWatchFile: () => undefined };
const source = (padding: number) =>
  `import { style } from "@react-spectrum/s2/style" with { type: "macro" }; export const styles = style({ padding: ${padding} });`;
const firstPath = resolve("src/components/TopBar.tsx");
const secondPath = resolve("src/components/ChangelogPanel.tsx");
const first = await plugin.transform.call(context, source(4), firstPath);
const assetIds = [
  ...first.code.matchAll(/import "(macro-[a-f0-9]+\.css)";/g),
].map((match) => match[1]);
assert(assetIds.length > 0, "The real Spectrum macro must emit CSS.");
const second = await plugin.transform.call(context, source(4), secondPath);
assert(
  assetIds.every((id) => second.code.includes(id)),
  "Two source modules must share content-addressed CSS.",
);
const contents = assetIds.map((id) => plugin.load(id));
await plugin.transform.call(context, source(8), firstPath);
assetIds.forEach((id, index) => {
  assert.equal(
    plugin.resolveId(id),
    id,
    "Retransforming one module must not remove another module's CSS.",
  );
  assert.equal(plugin.load(id), contents[index]);
});
console.log("Shared macro CSS survives module retransforms.");
