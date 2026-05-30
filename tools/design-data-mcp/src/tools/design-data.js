// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * MCP tool definitions that wrap the @adobe/design-data CLI.
 *
 * Each tool shells out to `npx @adobe/design-data <subcommand>` and returns
 * the parsed JSON output. The CLI handles data resolution automatically —
 * it uses the embedded Spectrum snapshot when no `.design-data.toml` is present,
 * or the configured source/version if one exists in the project.
 */

import { spawnSync } from "child_process";

/**
 * Run `npx -y @adobe/design-data` with the given args and return parsed JSON stdout.
 *
 * Uses spawnSync (blocking) intentionally: this MCP server serves a single
 * stdio client and processes requests sequentially, so blocking the event
 * loop is safe. The -y flag suppresses the interactive "install?" prompt on
 * first run so the server doesn't hang waiting for user input.
 *
 * Throws if the process can't start (result.error) or exits non-zero.
 */
function runDesignData(args) {
  const result = spawnSync("npx", ["-y", "@adobe/design-data", ...args], {
    encoding: "utf8",
    // Allow up to 30s for first-run install + binary execution.
    timeout: 30_000,
  });

  // result.error is set when the process can't start at all (binary not found,
  // timeout exceeded, etc.) — check before result.status.
  if (result.error) throw result.error;

  if (result.status !== 0) {
    const msg = (result.stderr || result.stdout || "").trim();
    throw new Error(`design-data exited ${result.status}: ${msg}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    // Some commands (e.g. component) output valid JSON but without --format json.
    // If JSON.parse fails, return the raw string so the caller can decide.
    return result.stdout.trim();
  }
}

export function createDesignDataTools() {
  return [
    // ── primer ────────────────────────────────────────────────────────────────
    {
      name: "design-data-primer",
      description:
        "Get a structural overview of the Spectrum design dataset: token count, " +
        "available mode-sets (color-scheme, scale, contrast), component list, " +
        "taxonomy fields, and data provenance. Call this at the start of a " +
        "design-token session to understand what data is available.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      handler() {
        return runDesignData(["primer", "--format", "json"]);
      },
    },

    // ── query ─────────────────────────────────────────────────────────────────
    {
      name: "design-data-query",
      description:
        "Filter Spectrum tokens by a query expression. " +
        "Expression syntax: `component=button`, `component=button,state=hover`, " +
        "`property=color-*`, `colorScheme=dark`. " +
        "Returns an array of matching token objects.",
      inputSchema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description:
              'Query expression, e.g. "component=button" or "property=color-*,component=action-button"',
          },
        },
        required: ["filter"],
        additionalProperties: false,
      },
      handler({ filter }) {
        return runDesignData(["query", "--filter", filter, "--format", "json"]);
      },
    },

    // ── suggest ───────────────────────────────────────────────────────────────
    {
      name: "design-data-suggest",
      description:
        "Suggest Spectrum tokens matching a natural-language intent. " +
        "Returns ranked matches with confidence scores, token names, and values. " +
        "Use when the user describes what they need rather than knowing the token name.",
      inputSchema: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            description:
              'Natural-language description of the design need, e.g. "primary CTA button background color"',
          },
          limit: {
            type: "number",
            description: "Maximum number of suggestions to return (default: 5)",
            default: 5,
          },
        },
        required: ["intent"],
        additionalProperties: false,
      },
      handler({ intent, limit = 5 }) {
        return runDesignData([
          "suggest",
          intent,
          "--format",
          "json",
          "--limit",
          String(limit),
        ]);
      },
    },

    // ── component ─────────────────────────────────────────────────────────────
    {
      name: "design-data-component",
      description:
        "Get the full component declaration for a Spectrum component by ID. " +
        "Returns the component's displayName, description, and all available options " +
        "(variants, sizes, states, boolean props, etc.). " +
        "Component IDs are kebab-case, e.g. button, action-button, text-field, picker.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "Component ID in kebab-case, e.g. button, action-button, picker, text-field",
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
      handler({ id }) {
        // component always outputs JSON — no --format flag.
        return runDesignData(["component", id]);
      },
    },

    // ── resolve ───────────────────────────────────────────────────────────────
    {
      name: "design-data-resolve",
      description:
        "Resolve the concrete value of a Spectrum token property for a given " +
        "mode-set context (color-scheme, scale, contrast). " +
        "Returns the winning token with its resolved value.",
      inputSchema: {
        type: "object",
        properties: {
          property: {
            type: "string",
            description:
              "Token property name, e.g. background-color-default, accent-color",
          },
          colorScheme: {
            type: "string",
            description: 'Color scheme mode, e.g. "light" or "dark"',
          },
          scale: {
            type: "string",
            description: 'Scale mode, e.g. "medium" or "large"',
          },
          contrast: {
            type: "string",
            description: 'Contrast mode, e.g. "standard" or "high"',
          },
        },
        required: ["property"],
        additionalProperties: false,
      },
      handler({ property, colorScheme, scale, contrast }) {
        const args = ["resolve", property, "--format", "json"];
        if (colorScheme) args.push("--color-scheme", colorScheme);
        if (scale) args.push("--scale", scale);
        if (contrast) args.push("--contrast", contrast);
        return runDesignData(args);
      },
    },
  ];
}
