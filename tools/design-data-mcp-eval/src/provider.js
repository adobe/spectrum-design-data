// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.
export function createProvider({ endpoint, model, apiKey, fetchImpl = fetch }) {
  if (!endpoint || !model) {
    throw new Error(
      "Set EVAL_ENDPOINT and EVAL_MODEL explicitly; no paid provider is selected automatically.",
    );
  }
  const url = new URL(endpoint);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !(url.protocol === "https:" || (local && url.protocol === "http:"))
  ) {
    throw new Error(
      "EVAL_ENDPOINT must be an HTTPS chat-completions URL (HTTP allowed only on loopback), without credentials, query, or fragment.",
    );
  }
  return async ({ messages, tools, signal }) => {
    const response = await fetchImpl(url, {
      method: "POST",
      redirect: "error",
      signal,
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0,
        max_tokens: 1024,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Provider HTTP ${response.status}; evaluation could not run.`,
      );
    }
    const result = await response.json();
    const message = result.choices?.[0]?.message;
    if (
      !message ||
      (!message.tool_calls?.length && typeof message.content !== "string")
    ) {
      throw new Error("Provider returned neither tool calls nor an answer.");
    }
    return { message, usage: result.usage ?? null };
  };
}
