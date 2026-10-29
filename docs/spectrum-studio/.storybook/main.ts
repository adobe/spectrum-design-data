// Copyright 2026 Adobe. All rights reserved.
import type { StorybookConfig } from "@storybook/react-vite";
import macros from "unplugin-parcel-macros";

const config: StorybookConfig = {
  stories: [
    "../src/components/**/*.stories.@(ts|tsx|mdx)",
    "../src/views/**/*.stories.@(ts|tsx|mdx)",
    "../src/panels/**/*.stories.@(ts|tsx|mdx)",
  ],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), macros.vite()],
  }),
};

export default config;
