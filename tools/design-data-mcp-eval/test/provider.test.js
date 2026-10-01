// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.
import test from "ava";
import { createProvider } from "../src/provider.js";

test("provider and model must be explicit; unsafe endpoints are rejected", (t) => {
  t.throws(() => createProvider({}), { message: /explicitly/ });
  for (const endpoint of [
    "http://example.com",
    "https://user:secret@example.com",
    "https://example.com?key=secret",
  ]) {
    t.throws(() => createProvider({ endpoint, model: "fixture" }));
  }
});

test("OpenAI-compatible adapter sends bounded tool requests and carries cancellation", async (t) => {
  const signal = new AbortController().signal;
  const complete = createProvider({
    endpoint: "http://127.0.0.1:9999/v1/chat/completions",
    model: "fixture",
    apiKey: "fixture-secret",
    fetchImpl: async (url, options) => {
      t.is(url.hostname, "127.0.0.1");
      t.is(options.redirect, "error");
      t.is(options.signal, signal);
      t.is(options.headers.authorization, "Bearer fixture-secret");
      const body = JSON.parse(options.body);
      t.is(body.model, "fixture");
      t.is(body.max_tokens, 1024);
      t.is(body.tool_choice, "auto");
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "answer" } }],
          usage: { total_tokens: 10 },
        }),
      };
    },
  });
  const result = await complete({ messages: [], tools: [], signal });
  t.is(result.message.content, "answer");
  t.is(result.usage.total_tokens, 10);
});

test("HTTP failures expose status without provider body or credentials", async (t) => {
  const complete = createProvider({
    endpoint: "https://example.com/v1/chat/completions",
    model: "fixture",
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => "secret",
    }),
  });
  await t.throwsAsync(() => complete({ messages: [], tools: [] }), {
    message: /HTTP 401/,
  });
});

test("invalid completion shapes are explicit errors", async (t) => {
  const complete = createProvider({
    endpoint: "https://example.com/v1/chat/completions",
    model: "fixture",
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
  });
  await t.throwsAsync(() => complete({ messages: [], tools: [] }), {
    message: /neither/,
  });
});
