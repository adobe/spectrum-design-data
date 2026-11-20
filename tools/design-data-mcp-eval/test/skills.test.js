// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.
import test from "ava";
import { runScenario, screenAnswer, systemPrompt } from "../src/runner.js";
import { loadSkill, skillScenarios } from "../src/skillScenarios.js";

const client = {
  listTools: async () => ({
    tools: [{ name: "design-data-resolve", inputSchema: { type: "object" } }],
  }),
  callTool: async () => {
    throw new Error("no tool calls expected");
  },
};

test("skills reach the system message only when supplied", async (t) => {
  const skill = await loadSkill("spectrum-color");
  const seen = [];
  for (const skills of [[], [skill]]) {
    await runScenario({
      client,
      scenario: skillScenarios[0],
      budget: { requests: 0, promptChars: 0 },
      skills,
      complete: async ({ messages }) => {
        seen.push(messages[0].content);
        return { message: { content: "Use the hover token in dark mode." } };
      },
    });
  }
  t.is(seen[0], systemPrompt());
  t.false(seen[0].includes("# Spectrum color"));
  t.true(seen[1].startsWith(systemPrompt()));
  t.true(seen[1].includes(skill));
});

test("the sample skill is generator output and contains every skill fact", async (t) => {
  const skill = await loadSkill("spectrum-color");
  t.regex(skill, /^---\nname: spectrum-color\n/);
  t.regex(skill, /\n {2}generator: spectrum-studio\n/);
  t.notRegex(skill, /#[0-9a-f]{6}\b/i, "skills carry no color values");
  for (const scenario of skillScenarios) {
    for (const fact of scenario.skillFacts) {
      t.true(skill.includes(fact), `${scenario.id}: ${fact}`);
    }
  }
});

test("skill scenarios have valid patterns and unique identities", (t) => {
  const ids = skillScenarios.map((item) => item.id);
  t.is(new Set(ids).size, ids.length);
  for (const item of skillScenarios) {
    t.truthy(item.question);
    t.truthy(item.review);
    t.true(item.skills.length > 0);
    for (const pattern of [...item.answerFacts, ...item.forbiddenClaims]) {
      t.notThrows(() => new RegExp(pattern, "i"));
    }
  }
});

test("a forbidden raw scale token fails the success-message screen", (t) => {
  const scenario = skillScenarios.find(
    (item) => item.id === "skill-success-message",
  );
  t.is(
    screenAnswer(scenario, "Use positive tokens for meaning.", []).status,
    "screen_pass",
  );
  t.is(
    screenAnswer(scenario, "Use positive meaning, so green-900.", []).status,
    "quality_regression",
  );
});
