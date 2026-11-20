// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { NotificationProvider } from "../components/notifications/NotificationProvider";
import {
  renderSkill,
  type SkillSource,
} from "../features/design-data/agentSkills";
import { AgentSkillsView } from "./AgentSkillsView";

const color: SkillSource = {
  area: "color",
  name: "spectrum-color",
  title: "Spectrum color",
  description: "Choose Spectrum color tokens by role, step and state.",
  sections: [
    {
      heading: "Purpose",
      paragraphs: ["Use this skill to choose color tokens by intent."],
    },
    { heading: "Color roles", bullets: ["**Accent**: Uses the blue scale."] },
  ],
  diagnostics: [
    {
      area: "color",
      subject: "Color role “Accent”",
      message: "It has no description, so its purpose was left out.",
      fix: "Add a description to the Accent term in the Registry.",
    },
  ],
};
const index: SkillSource = {
  area: "index",
  name: "spectrum-design-system",
  title: "Spectrum design system",
  description: "Start here to find the right Spectrum skill.",
  sections: [
    {
      heading: "Skills",
      bullets: ["[spectrum-color](../spectrum-color/SKILL.md)"],
    },
  ],
  diagnostics: [],
};
const skills = [index, color].map(renderSkill);

const meta = {
  title: "Views/Agent skills",
  component: AgentSkillsView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NotificationProvider>
        <div style={{ display: "flex", height: 640, width: 960 }}>
          <Story />
        </div>
      </NotificationProvider>
    ),
  ],
  args: { skills },
} satisfies Meta<typeof AgentSkillsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AllSkills: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("spectrum-design-system/SKILL.md"),
    ).toBeTruthy();
    await expect(canvas.queryByText("1 thing to fill in")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /Skill/ }));
    await userEvent.click(
      within(document.body).getByRole("option", { name: "Spectrum color" }),
    );
    await expect(canvas.getByText("1 thing to fill in")).toBeTruthy();
    await expect(
      canvas.getByRole("button", { name: "Download all skills (.zip)" }),
    ).toBeTruthy();
    canvasElement.dataset.playComplete = "true";
  },
};

export const ColorTab: Story = {
  name: "Color tab (one area)",
  args: { area: "color" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button", { name: /Skill/ })).toBeNull();
    await expect(canvas.getByText("1 thing to fill in")).toBeTruthy();
    await expect(canvas.getByText("spectrum-color/SKILL.md")).toBeTruthy();
    canvasElement.dataset.playComplete = "true";
  },
};
