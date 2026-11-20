// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.
import { readFile } from "node:fs/promises";

// Color questions answered with and without the generated `spectrum-color`
// skill. `skillFacts` are phrases the sample skill must contain, so a scenario
// can't pass on guidance the skill no longer gives.
export const skillScenarios = [
  {
    id: "skill-hover-state",
    skills: ["spectrum-color"],
    question:
      "I'm styling an emphasized accent button background. Which color should its hover state use, and does that change in dark mode?",
    skillFacts: [
      "Use the generated state token; don't shift steps yourself.",
      "When Color scheme is Dark, the state token moves 1 step lower",
    ],
    grounding: [],
    answerFacts: ["hover", "token", "dark"],
    forbiddenClaims: ["#[0-9a-f]{6}\\b"],
    citations: [],
    review:
      "Uses the hover state token rather than picking a step by hand, and explains that the direction reverses in dark mode without quoting color values.",
  },
  {
    id: "skill-success-message",
    skills: ["spectrum-color"],
    question:
      "Which color tokens should I use for the icon and text of a success message?",
    skillFacts: [
      "**Positive**",
      "Don't choose a color by its look. Choose the role that matches the meaning.",
    ],
    grounding: [],
    answerFacts: ["positive"],
    forbiddenClaims: ["\\bgreen-\\d{3,4}\\b"],
    citations: [],
    review:
      "Chooses the positive role for its meaning, not a raw green scale token, and picks a high-contrast step for text and icons.",
  },
  {
    id: "skill-dark-mode",
    skills: ["spectrum-color"],
    question:
      "My design uses Spectrum color tokens. What do I need to change to support dark mode?",
    skillFacts: [
      "Modes change resolved colors without changing token names.",
      "Don't switch tokens for each mode. Let modes resolve them.",
    ],
    grounding: [],
    answerFacts: ["same tokens?", "(mode|color scheme)"],
    forbiddenClaims: ["\\bdark-(accent|positive|negative|neutral)\\b"],
    citations: [],
    review:
      "Keeps the same tokens and lets the color scheme mode resolve them, instead of swapping tokens or copying values per mode.",
  },
];

const skillsDir = new URL("../skills/", import.meta.url);

export async function loadSkill(name) {
  return readFile(new URL(`${name}/SKILL.md`, skillsDir), "utf8");
}
