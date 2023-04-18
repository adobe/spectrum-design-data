import { defineConfig } from "vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // use relative paths to the build assets in the index.html
  // so that the static site can live on arbitrary subdomain paths
  base: "./",
  server: {
    // open a browser when launching local dev server
    open: true,
  },
  build: {
    // use the /docs output directory
    // so that github static site hosting
    // can serve the commited build files
    outDir: "docs",
    rollupOptions: {
      input: {
        stvt: resolve(__dirname, "index.html"),
      },
    },
  },
});
