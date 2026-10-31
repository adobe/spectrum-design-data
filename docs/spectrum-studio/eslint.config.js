// Copyright 2026 Adobe. All rights reserved.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "storybook-static"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@react-spectrum/s2",
              importNames: ["ToastQueue", "ToastContainer"],
              message:
                "Use useNotify() from components/notifications. See .agents/rules/notifications.mdc.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/notifications/NotificationProvider.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
);
