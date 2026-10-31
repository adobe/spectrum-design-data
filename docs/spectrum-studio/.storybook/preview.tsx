// Copyright 2026 Adobe. All rights reserved.
import { Provider } from "@react-spectrum/s2";
import type { Preview } from "@storybook/react";
import "../src/index.css";
import "../src/components/color-picker/color-picker.css";
import { PreviewSurfaceProvider } from "../src/components/PreviewSurfaceProvider";

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: {
      expanded: true,
    },
    a11y: {
      test: "error",
    },
    viewport: {
      options: {
        desktop: {
          name: "Desktop",
          styles: { width: "1280px", height: "900px" },
        },
        narrow: { name: "Narrow", styles: { width: "480px", height: "900px" } },
      },
    },
  },
  decorators: [
    (Story, context) => (
      <Provider
        colorScheme={context.globals.colorScheme ?? "light"}
        UNSAFE_className={`spectrum spectrum--${context.globals.colorScheme ?? "light"}`}
      >
        <PreviewSurfaceProvider
          colorScheme={context.globals.colorScheme ?? "light"}
        >
          <Story />
        </PreviewSurfaceProvider>
      </Provider>
    ),
  ],
  globalTypes: {
    colorScheme: {
      description: "Spectrum color scheme",
      defaultValue: "light",
      toolbar: {
        title: "Color scheme",
        icon: "paintbrush",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
