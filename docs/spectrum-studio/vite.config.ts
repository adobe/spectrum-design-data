// Copyright 2026 Adobe. All rights reserved.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";
import macros from "unplugin-parcel-macros";
import checker from "vite-plugin-checker";
import { designDataAnalysisPlugin } from "./scripts/design-data-vite";

// https://vitejs.dev/config/
export default defineConfig(({ command, isPreview }) => {
  return {
    server: { https: {} },
    optimizeDeps: {
      entries: [
        "index.html",
        "src/views/analysis/AnalysisView.tsx",
        "src/features/code/highlight.worker.ts",
      ],
      exclude: ["@react-spectrum/s2/style"],
    },
    plugins: [
      react(),
      macros.vite(),
      mkcert(),
      designDataAnalysisPlugin(),
      command === "serve" &&
        !isPreview &&
        checker({ typescript: true, enableBuild: false }),
    ],
    build: {
      sourcemap: true,
      outDir: "./dist",
    },
  };
});
