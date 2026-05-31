// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! MCP authoring-session tools (RFC #973 Q4).
//!
//! Each tool maps to one `design-data authoring-session` CLI subcommand.
//! State is held on disk (one JSON file per session); the CLI is stateless.

import { runCli } from "../cli.js";
import { config } from "../config.js";

async function callCli(args) {
  const { exitCode, stdout, stderr } = await runCli(args, { timeout: 30_000 });
  if (exitCode !== 0)
    throw new Error(stderr || `authoring-session exited ${exitCode}`);
  return JSON.parse(stdout);
}

export function createAuthoringTools() {
  return [
    {
      name: "start_authoring_session",
      description:
        "Start a new token authoring session. Returns a session_id and the initial wizard state. " +
        "The session persists across calls — use the returned session_id in subsequent steps.",
      inputSchema: {
        type: "object",
        properties: {
          dataset_path: {
            type: "string",
            description:
              "Path to the token dataset directory. Defaults to DESIGN_DATA_PATH.",
          },
        },
        additionalProperties: false,
      },
      async handler({ dataset_path } = {}) {
        const path = dataset_path ?? config.dataPath;
        if (!path) {
          throw new Error(
            "dataset_path is required (or set DESIGN_DATA_PATH in the environment)",
          );
        }
        return callCli(["authoring-session", "start", path]);
      },
    },

    {
      name: "authoring_session_step_intent",
      description:
        "Update the intent for a session and get ranked existing-token suggestions. " +
        "Returns suggestions and can_alias (true when a high-confidence match exists).",
      inputSchema: {
        type: "object",
        required: ["session_id", "intent"],
        properties: {
          session_id: { type: "string" },
          intent: {
            type: "string",
            description:
              "Natural-language description of what the token is for, e.g. 'accent background color'.",
          },
        },
        additionalProperties: false,
      },
      async handler({ session_id, intent }) {
        return callCli([
          "authoring-session",
          "step",
          "intent",
          "--session-id",
          session_id,
          "--intent",
          intent,
        ]);
      },
    },

    {
      name: "authoring_session_step_classification",
      description:
        "Set the layer, property, and name-object fields for the token. " +
        "name_fields is an array of {key, value} objects.",
      inputSchema: {
        type: "object",
        required: ["session_id", "layer", "property"],
        properties: {
          session_id: { type: "string" },
          layer: {
            type: "string",
            enum: ["foundation", "platform", "product"],
            description: "Token layer.",
          },
          property: {
            type: "string",
            description: "Token property, e.g. 'background-color'.",
          },
          name_fields: {
            type: "array",
            items: {
              type: "object",
              required: ["key", "value"],
              properties: {
                key: { type: "string" },
                value: { type: "string" },
              },
            },
            description: "Additional name-object fields beyond property.",
          },
        },
        additionalProperties: false,
      },
      async handler({ session_id, layer, property, name_fields = [] }) {
        const args = [
          "authoring-session",
          "step",
          "classification",
          "--session-id",
          session_id,
          "--layer",
          layer,
          "--property",
          property,
        ];
        for (const { key, value } of name_fields) {
          args.push("--name-field", `${key}=${value}`);
        }
        return callCli(args);
      },
    },

    {
      name: "authoring_session_step_values",
      description:
        "Set the value rows for the token. Each row specifies mode conditions and either " +
        "a literal value or an alias target. Most tokens need one row with empty mode_combo.",
      inputSchema: {
        type: "object",
        required: ["session_id", "rows"],
        properties: {
          session_id: { type: "string" },
          rows: {
            type: "array",
            description:
              "Value rows. Each: { mode_combo: [[key,val],...], kind: 'Literal'|'Alias', " +
              "alias_target: string, literal: string }",
            items: {
              type: "object",
              required: ["mode_combo", "kind", "alias_target", "literal"],
              properties: {
                mode_combo: {
                  type: "array",
                  items: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 2,
                  },
                },
                kind: { type: "string", enum: ["Literal", "Alias"] },
                alias_target: { type: "string" },
                literal: { type: "string" },
              },
            },
          },
        },
        additionalProperties: false,
      },
      async handler({ session_id, rows }) {
        return callCli([
          "authoring-session",
          "step",
          "values",
          "--session-id",
          session_id,
          "--rows",
          JSON.stringify(rows),
        ]);
      },
    },

    {
      name: "authoring_session_commit",
      description:
        "Build and write the token to disk, then remove the session. " +
        "Requires schema_url (the JSON Schema URL for the token type) and target (output file path).",
      inputSchema: {
        type: "object",
        required: ["session_id", "schema_url", "target"],
        properties: {
          session_id: { type: "string" },
          schema_url: {
            type: "string",
            description:
              "The $schema URL for the token type, e.g. https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
          },
          target: {
            type: "string",
            description:
              "Target legacy JSON file to write to (created if absent, merged if present).",
          },
          rationale: {
            type: "string",
            description: "Why this token is being created.",
          },
          product_context: {
            type: "string",
            description: "Path to product-context.json for rationale capture.",
          },
          schema_path: {
            type: "string",
            description:
              "Path to schemas directory. Defaults to packages/tokens/schemas relative to target.",
          },
          is_override: {
            type: "boolean",
            description:
              "True when this token overrides an existing foundation/platform token.",
          },
        },
        additionalProperties: false,
      },
      async handler({
        session_id,
        schema_url,
        target,
        rationale = "",
        product_context,
        schema_path,
        is_override = false,
      }) {
        const args = [
          "authoring-session",
          "commit",
          "--session-id",
          session_id,
          "--schema-url",
          schema_url,
          "--target",
          target,
          "--rationale",
          rationale,
        ];
        if (product_context) args.push("--product-context", product_context);
        if (schema_path) args.push("--schema-path", schema_path);
        if (is_override) args.push("--is-override");
        return callCli(args);
      },
    },

    {
      name: "authoring_session_cancel",
      description: "Cancel a session and delete its on-disk file.",
      inputSchema: {
        type: "object",
        required: ["session_id"],
        properties: {
          session_id: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler({ session_id }) {
        return callCli([
          "authoring-session",
          "cancel",
          "--session-id",
          session_id,
        ]);
      },
    },

    {
      name: "authoring_session_get",
      description: "Get the current state of an authoring session.",
      inputSchema: {
        type: "object",
        required: ["session_id"],
        properties: {
          session_id: { type: "string" },
        },
        additionalProperties: false,
      },
      async handler({ session_id }) {
        return callCli([
          "authoring-session",
          "get",
          "--session-id",
          session_id,
        ]);
      },
    },

    {
      name: "authoring_session_list",
      description: "List all active authoring sessions.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      async handler() {
        return callCli(["authoring-session", "list"]);
      },
    },
  ];
}
