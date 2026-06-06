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
 * Authoring-session tools for design-data-agent-mcp.
 *
 * Most operations use @adobe/design-data (on-disk session store) and run
 * fully in-process. The exception is authoring_session_step_intent, which still
 * delegates to the CLI because the NLP `suggest` ranking is not yet on the wasm
 * surface. When that API is added, step_intent can be migrated here too.
 */

import {
  startSession,
  getSession,
  listSessions,
  stepClassification,
  stepValues,
  commitSession,
  cancelSession,
} from "@adobe/design-data/session";
import { runCli } from "../cli.js";
import { config } from "../config.js";

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
        return startSession(path);
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
        // step_intent requires NLP suggest ranking — still uses the CLI.
        // Will be migrated when suggest is added to the wasm surface.
        const { exitCode, stdout, stderr } = await runCli(
          [
            "authoring-session",
            "step",
            "intent",
            "--session-id",
            session_id,
            "--intent",
            intent,
          ],
          { timeout: 30_000 },
        );
        if (exitCode !== 0)
          throw new Error(
            stderr || `authoring-session step intent exited ${exitCode}`,
          );
        return JSON.parse(stdout);
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
        return stepClassification(session_id, {
          layer,
          property,
          nameFields: name_fields,
        });
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
        return stepValues(session_id, rows);
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
              "Path to schemas directory containing token-types/ and token-file.json. " +
              "Used for Layer-1 JSON-Schema validation before writing. " +
              "Defaults to @adobe/spectrum-tokens schemas when omitted.",
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
        return commitSession({
          sessionId: session_id,
          schemaUrl: schema_url,
          target,
          rationale,
          productContext: product_context,
          schemaPath: schema_path ?? null,
          isOverride: is_override,
        });
      },
    },

    {
      name: "authoring_session_cancel",
      description: "Cancel a session and delete its on-disk file.",
      inputSchema: {
        type: "object",
        required: ["session_id"],
        properties: { session_id: { type: "string" } },
        additionalProperties: false,
      },
      async handler({ session_id }) {
        return cancelSession(session_id);
      },
    },

    {
      name: "authoring_session_get",
      description: "Get the current state of an authoring session.",
      inputSchema: {
        type: "object",
        required: ["session_id"],
        properties: { session_id: { type: "string" } },
        additionalProperties: false,
      },
      async handler({ session_id }) {
        return getSession(session_id);
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
        return listSessions();
      },
    },
  ];
}
