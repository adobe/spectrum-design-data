// Copyright 2026 Adobe. All rights reserved.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";
import macros from "unplugin-parcel-macros";
import checker from "vite-plugin-checker";
import { VitePWA } from "vite-plugin-pwa";
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
      VitePWA({
        // "prompt" keeps a new version waiting until the next launch or the
        // header update button; registration lives in src/features/app-status.
        registerType: "prompt",
        injectRegister: false,
        manifest: {
          name: "Spectrum Studio",
          short_name: "Spectrum Studio",
          start_url: "/",
          scope: "/",
          display: "standalone",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          icons: [
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2,json}"],
          globIgnores: ["**/*.map"],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          navigateFallback: "index.html",
        },
        devOptions: { enabled: false },
      }),
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
