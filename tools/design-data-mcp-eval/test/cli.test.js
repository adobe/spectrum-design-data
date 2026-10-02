// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.
import test from "ava";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createFreshBundle } from "../../design-data-mcp/test/helpers/ensure-bundle.js";

const exec = promisify(execFile);
const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));

for (const mode of ["pass", "regression", "outage"]) {
  test.serial(
    `CLI with real MCP and local fixture provider: ${mode}`,
    async (t) => {
      const directory = await mkdtemp(join(tmpdir(), "hub-eval-cli-"));
      t.teardown(() => rm(directory, { recursive: true, force: true }));
      const artifact = await createFreshBundle();
      t.teardown(() => rm(artifact, { recursive: true, force: true }));
      let requests = 0;
      let retrieved = false;
      const server = createServer(async (req, res) => {
        let body = "";
        for await (const chunk of req) body += chunk;
        const request = JSON.parse(body);
        requests++;
        t.is(request.model, "fixture-model");
        if (mode === "outage") {
          res.writeHead(503);
          res.end("unavailable");
          return;
        }
        const toolMessage = request.messages.find(
          (item) => item.role === "tool",
        );
        if (!toolMessage) {
          t.is(request.messages.length, 2);
          res.end(
            JSON.stringify({
              choices: [
                {
                  message: {
                    role: "assistant",
                    tool_calls: [
                      {
                        id: "fixture-call",
                        type: "function",
                        function: {
                          name: "design-data-guideline",
                          arguments: '{"id":"typography-system"}',
                        },
                      },
                    ],
                  },
                },
              ],
            }),
          );
        } else {
          retrieved = toolMessage.content.includes("ExtraBold");
          res.end(
            JSON.stringify({
              choices: [
                {
                  message: {
                    role: "assistant",
                    content:
                      mode === "pass"
                        ? "Use ExtraBold normally. Black is a limited branding exception for headings at 18 px or larger. https://spectrum.adobe.com/foundations/typography/typography-system"
                        : "Black is always forbidden.",
                  },
                },
              ],
              usage: { total_tokens: 100 },
            }),
          );
        }
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      t.teardown(() => new Promise((resolve) => server.close(resolve)));
      const port = server.address().port;
      let code = 0;
      try {
        await exec(
          process.execPath,
          [
            cli,
            "--scenario",
            "heading-weight-exception",
            "--output",
            directory,
            "--artifact",
            artifact,
          ],
          {
            timeout: 30_000,
            env: {
              ...process.env,
              GITHUB_STEP_SUMMARY: "",
              EVAL_API_KEY: "",
              EVAL_ENDPOINT: `http://127.0.0.1:${port}/v1/chat/completions`,
              EVAL_MODEL: "fixture-model",
            },
          },
        );
      } catch (error) {
        if (typeof error.code !== "number") throw error;
        code = error.code;
      }
      t.is(code, mode === "pass" ? 0 : mode === "regression" ? 1 : 2);
      const report = JSON.parse(await readFile(join(directory, "report.json")));
      t.is(
        report.results[0].status,
        mode === "pass"
          ? "screen_pass"
          : mode === "regression"
            ? "quality_regression"
            : "execution_error",
      );
      t.regex(report.manifestSha256, /^[a-f0-9]{64}$/);
      t.regex(report.wasmSha256, /^[a-f0-9]{64}$/);
      t.regex(report.scenarioSha256, /^[a-f0-9]{64}$/);
      t.is(report.budget.requests, requests);
      t.true(report.results[0].humanReviewRequired);
      if (mode !== "outage") {
        t.true(retrieved);
        t.is(report.results[0].trace.length, 1);
      }
      t.true(
        (await readFile(join(directory, "summary.md"), "utf8")).includes(
          "human",
        ) ||
          (await readFile(join(directory, "summary.md"), "utf8")).includes(
            "rubric",
          ),
      );
    },
  );
}
