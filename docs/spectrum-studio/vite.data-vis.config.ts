// Copyright 2026 Adobe. All rights reserved.
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const license = readFileSync(
  new URL("./node_modules/colorjs.io/LICENSE", import.meta.url),
  "utf8",
);

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "public/data-vis",
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: "src/features/color-system/data-vis/adapter.ts",
      formats: ["es"],
      fileName: () => "data-vis.js",
    },
    rolldownOptions: {
      output: {
        codeSplitting: false,
        banner: `/*!\nData vis adapter includes Color.js.\n${license}\n*/`,
      },
    },
  },
  plugins: [
    {
      name: "pure-data-vis-adapter",
      generateBundle(_options, bundle) {
        for (const output of Object.values(bundle))
          if (output.type === "chunk") {
            const forbidden = Object.entries(output.modules)
              .filter(([, module]) => module.renderedLength > 0)
              .map(([id]) => id)
              .filter((id) =>
                /node_modules\/(?:\.pnpm\/)?(?:react|jotai|@react-spectrum)|\/src\/(?:components|panels|pages|views)\/|\/src\/data\/defaults\.ts|\/(?:state|categorical|suggestionWorker|useSuggestions)\.tsx?$/.test(
                  id,
                ),
              );
            if (forbidden.length)
              throw new Error(
                `The data vis adapter pulled in application or search runtime: ${forbidden.join(", ")}`,
              );
          }
      },
    },
  ],
});
