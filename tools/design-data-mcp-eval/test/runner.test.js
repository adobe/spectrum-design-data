// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.
import test from "ava";
import { runScenario, screenAnswer } from "../src/runner.js";
import { scenarios } from "../src/scenarios.js";

const scenario = {
  id: "fixture",
  question: "How do I write errors?",
  grounding: [
    { tool: "design-data-guideline", arguments: { id: "writing-for-errors" } },
  ],
  answerFacts: ["recover"],
  citations: ["https://spectrum.adobe.com/content/writing-for-errors"],
  forbiddenClaims: ["everything is safe"],
  review: "Review factual correctness.",
};
const result = { content: [{ type: "text", text: '{"documentBlocks":[]}' }] };
const call = {
  id: "call-1",
  type: "function",
  function: {
    name: "design-data-guideline",
    arguments: '{"id":"writing-for-errors"}',
  },
};
const client = {
  listTools: async () => ({
    tools: [
      { name: "design-data-guideline", inputSchema: { type: "object" } },
      { name: "write", inputSchema: { type: "object" } },
    ],
  }),
  callTool: async () => result,
};
const answer =
  "Explain recovery. https://spectrum.adobe.com/content/writing-for-errors";
const budget = () => ({ requests: 0, promptChars: 0 });

test("agent selects tools; retrieved content reaches the next model turn", async (t) => {
  let turn = 0;
  const report = await runScenario({
    client,
    scenario,
    budget: budget(),
    complete: async ({ messages, tools }) => {
      t.false(tools.some((tool) => tool.function.name === "write"));
      if (turn++ === 0) {
        t.is(messages.length, 2);
        t.false(messages[1].content.includes("documentBlocks"));
        return { message: { tool_calls: [call] } };
      }
      t.is(messages.at(-1).role, "tool");
      t.true(messages.at(-1).content.includes("documentBlocks"));
      return { message: { content: answer } };
    },
  });
  t.is(report.status, "screen_pass");
  t.is(report.trace.length, 1);
  t.true(report.humanReviewRequired);
});

test("a plausible answer without the required retrieval fails the screen", (t) => {
  t.is(screenAnswer(scenario, answer, []).status, "quality_regression");
});

test("missing facts/citations, forbidden claims, and failed tools fail independently", (t) => {
  const trace = [
    {
      name: call.function.name,
      arguments: { id: "writing-for-errors" },
      result: { isError: true },
    },
  ];
  const report = screenAnswer(scenario, "everything is safe", trace);
  t.is(report.status, "quality_regression");
  t.true(report.checks.every((check) => !check.passed));
});

test("provider failures are execution errors, not answer-quality regressions", async (t) => {
  const report = await runScenario({
    client,
    scenario,
    budget: budget(),
    complete: async () => {
      throw new Error("Provider HTTP 429");
    },
  });
  t.is(report.status, "execution_error");
  t.regex(report.error, /429/);
});

test("disallowed tools are never executed", async (t) => {
  const report = await runScenario({
    client: {
      ...client,
      callTool: () => {
        t.fail("must not run");
      },
    },
    scenario,
    budget: budget(),
    complete: async () => ({
      message: {
        tool_calls: [{ ...call, function: { name: "write", arguments: "{}" } }],
      },
    }),
  });
  t.is(report.status, "execution_error");
  t.regex(report.error, /disallowed/);
});

test("request and context budgets stop execution without model calls", async (t) => {
  for (const b of [
    { requests: 64, promptChars: 0 },
    { requests: 0, promptChars: 2_000_000 },
  ]) {
    const report = await runScenario({
      client,
      scenario,
      budget: b,
      complete: async () => {
        t.fail("budget must stop provider access");
      },
    });
    t.is(report.status, "execution_error");
  }
});

test("abstention screen requires catalog consultation, but is not a semantic proof", (t) => {
  const unsupported = scenarios.find((item) => item.expectAbstention);
  t.is(
    screenAnswer(unsupported, "No specification is available.", []).status,
    "quality_regression",
  );
  t.is(
    screenAnswer(unsupported, "No specification is available.", [
      { name: "design-data-guideline-list", arguments: {}, result },
    ]).status,
    "screen_pass",
  );
});

test("all scenarios have valid patterns and unique identities", (t) => {
  t.is(new Set(scenarios.map((item) => item.id)).size, scenarios.length);
  t.true(scenarios.length >= 10 && scenarios.length <= 15);
  for (const item of scenarios) {
    t.truthy(item.question);
    t.truthy(item.review);
    for (const pattern of [
      ...item.answerFacts,
      ...(item.forbiddenClaims ?? []),
    ]) {
      t.notThrows(() => new RegExp(pattern, "i"));
    }
  }
});
