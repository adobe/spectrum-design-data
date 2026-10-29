// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor, within } from "@storybook/test";
import { Button } from "@react-spectrum/s2";
import { useState } from "react";
import { CodeBlock } from "./CodeBlock";

const cssSample = `:root {\n  --bg: #ffffff;\n  --contrast-100: 1.06;\n}\n\n.color-system-tint-bg {\n  background-color: var(--color-system-tint);\n}`;
const jsSample = `function add(a, b) {\n  // sum two numbers\n  return a + b;\n}`;
const tsSample = `interface Point {\n  x: number;\n  y: number;\n}\n\nconst origin: Point = { x: 0, y: 0 };`;
const jsonSample = `{\n  "name": "leonardo",\n  "version": 1,\n  "enabled": true\n}`;
const largeSample = Array.from(
  { length: 16_000 },
  (_, index) =>
    `.sample-${index} {\n  --measure: calc(16px * ${(index % 8) + 1});\n  background-color: rgb(20 40 60 / 70%);\n}\n`,
).join("");

function ReplacementExample() {
  const [code, setCode] = useState(largeSample);
  const [visible, setVisible] = useState(true);
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, height: 480 }}
    >
      <Button
        variant="secondary"
        onPress={() => setCode(":root { --latest: 24px; }")}
      >
        Replace code
      </Button>
      <Button variant="secondary" onPress={() => setVisible(false)}>
        Hide code
      </Button>
      {visible && <CodeBlock code={code} />}
    </div>
  );
}

const meta = {
  title: "Components/Code block",
  component: CodeBlock,
  parameters: {
    layout: "padded",
  },
  args: {
    code: cssSample,
    language: "css",
  },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const code = canvas.getByText("--bg", { exact: false });
    await expect(code).toBeTruthy();
    await waitFor(() =>
      expect(canvasElement.querySelectorAll(".token").length).toBeGreaterThan(
        0,
      ),
    );
  },
};

export const JavaScript: Story = {
  args: { code: jsSample, language: "javascript" },
};

export const TypeScript: Story = {
  args: { code: tsSample, language: "typescript" },
};

export const Json: Story = {
  args: { code: jsonSample, language: "json" },
};

export const Empty: Story = {
  args: { code: "", language: "css" },
};

export const DarkTheme: Story = {
  args: { code: cssSample, language: "css" },
  globals: { colorScheme: "dark" },
};

export const LargeOutput: Story = {
  args: { code: largeSample },
  render: (args) => (
    <div style={{ height: 480, display: "flex", flexDirection: "column" }}>
      <CodeBlock {...args} />
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    await expect(canvasElement.querySelector("code")?.textContent).toBe(
      args.code,
    );
    await waitFor(
      () =>
        expect(canvasElement.querySelectorAll(".token").length).toBeGreaterThan(
          0,
        ),
      { timeout: 10_000 },
    );
    canvasElement.dataset.playComplete = "true";
  },
};

export const Replacement: Story = {
  render: () => <ReplacementExample />,
};

export const Whitespace: Story = {
  args: {
    code: 'const text = "\u00a0<script>&";\r\n'.repeat(100),
    language: "javascript",
  },
  render: (args) => (
    <div style={{ height: 480, display: "flex", flexDirection: "column" }}>
      <CodeBlock {...args} />
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    await waitFor(() =>
      expect(canvasElement.querySelectorAll(".token").length).toBeGreaterThan(
        0,
      ),
    );
    await expect(canvasElement.querySelector("code")?.textContent).toBe(
      args.code,
    );
    canvasElement.dataset.playComplete = "true";
  },
};
