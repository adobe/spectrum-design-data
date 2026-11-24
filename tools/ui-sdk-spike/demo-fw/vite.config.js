import { svelte } from '@sveltejs/vite-plugin-svelte';
import vue from '@vitejs/plugin-vue';
import solid from '@solidjs/vite-plugin';

export default {
  plugins: [vue(), svelte(), solid({ include: /(src\/solid|@ui-sdk\/solid\/dist\/.*)\.jsx$/ })],
  optimizeDeps: { exclude: ["@ui-sdk/core", "@ui-sdk/solid"] },
};
