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
 * Authoring-session, lifecycle, and mode-set tools for design-data-agent-mcp.
 *
 * All operations delegate to the `design-data` CLI, which is already a hard
 * prerequisite of this server (every read tool shells out the same way). This
 * guarantees output byte-identical to the CLI by construction and avoids a
 * parallel JS reimplementation of the Rust cascade write path.
 *
 * The one exception — authoring_session_step_intent — was the original CLI
 * shell-out; it is left unchanged.
 *
 * CLI surface used:
 *   design-data authoring-session {start | step intent|classification|values |
 *                                   commit | cancel | get | list}
 *   design-data lifecycle {edit | deprecate | rename | rewire-alias | remove}
 *   design-data mode-set  {add-mode | rename-mode | remove-mode |
 *                           create-mode-set | remove-mode-set}
 */

import { runCli } from "../cli.js";
import { config } from "../config.js";

/**
 * Run CLI args, throw on non-zero exit, return parsed JSON.
 *
 * @param {string[]} args
 * @param {{ timeout?: number }} [opts]
 * @returns {Promise<unknown>}
 */
async function runJson(args, { timeout = 30_000 } = {}) {
  const { exitCode, stdout, stderr } = await runCli(args, { timeout });
  if (exitCode !== 0)
    throw new Error(stderr || `design-data ${args[0]} exited ${exitCode}`);
  return JSON.parse(stdout);
}

export function createAuthoringTools() {
  return [
    // ── Authoring session ──────────────────────────────────────────────────

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
        return runJson(["authoring-session", "start", path]);
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
        // step_intent uses CLI for NLP suggest ranking (not yet on wasm surface).
        return runJson(
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
      },
    },

    {
      name: "authoring_session_step_classification",
      description:
        "Set the layer, property, and name-object fields for the token. " +
        "name_fields is an array of {key, value} objects. " +
        "Classification is validated against the active fields catalog.",
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
          // ponytail: CLI parse_name_fields uses split_once('=') — values with '=' are safe.
          args.push("--name-field", `${key}=${value}`);
        }
        return runJson(args);
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
        return runJson([
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
        "Build and write the token to disk as a cascade array element, then remove the session. " +
        "Requires schema_url (the JSON Schema URL for the token type) and target " +
        "(the *.tokens.json cascade file to write into).",
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
              "Target *.tokens.json cascade file to write into (created if absent, upserted if present).",
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
        if (schema_path) args.push("--schema-path", schema_path);
        if (product_context) args.push("--product-context", product_context);
        if (is_override) args.push("--is-override");
        return runJson(args, { timeout: 60_000 });
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
        return runJson([
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
        properties: { session_id: { type: "string" } },
        additionalProperties: false,
      },
      async handler({ session_id }) {
        return runJson([
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
        return runJson(["authoring-session", "list"]);
      },
    },

    // ── Token lifecycle ────────────────────────────────────────────────────

    {
      name: "edit_token",
      description:
        "Merge field updates into an already-committed cascade token, then re-validate. " +
        "The token's uuid is always preserved and silently ignored if included in updates.",
      inputSchema: {
        type: "object",
        required: ["uuid", "target", "updates"],
        properties: {
          uuid: { type: "string", description: "UUID of the token to edit." },
          target: {
            type: "string",
            description:
              "Path to the *.tokens.json cascade file containing the token.",
          },
          updates: {
            type: "object",
            description:
              'Fields to merge into the token object, e.g. { "value": "#ff0000" }.',
          },
          rationale: { type: "string", description: "Why the token changed." },
          tokens_root: {
            type: "string",
            description:
              "Root tokens directory — required when updates contains a $ref.",
          },
          schema_path: {
            type: "string",
            description:
              "Schemas directory for validation (default: auto-resolved from target).",
          },
        },
        additionalProperties: false,
      },
      async handler({
        uuid,
        target,
        updates,
        rationale = "",
        tokens_root,
        schema_path,
      }) {
        const args = [
          "lifecycle",
          "edit",
          "--uuid",
          uuid,
          "--target",
          target,
          "--updates",
          JSON.stringify(updates),
          "--rationale",
          rationale,
        ];
        if (tokens_root) args.push("--tokens-root", tokens_root);
        if (schema_path) args.push("--schema-path", schema_path);
        return runJson(args);
      },
    },

    {
      name: "deprecate_token",
      description:
        "Stamp a deprecation marker onto a cascade token. Optionally record a replacement UUID " +
        "and a planned-removal spec version.",
      inputSchema: {
        type: "object",
        required: ["uuid", "target", "spec_version"],
        properties: {
          uuid: {
            type: "string",
            description: "UUID of the token to deprecate.",
          },
          target: {
            type: "string",
            description:
              "Path to the *.tokens.json cascade file containing the token.",
          },
          spec_version: {
            type: "string",
            description:
              "Dataset specVersion string to stamp into the deprecated value, e.g. '1.0.0'.",
          },
          deprecated_comment: {
            type: "string",
            description:
              "Human-readable deprecation explanation / migration guidance.",
          },
          replaced_by: {
            type: "string",
            description:
              "Replacement token UUID (string) or JSON array of UUIDs.",
          },
          planned_removal: {
            type: "string",
            description: "Spec version at which the token will be removed.",
          },
          rationale: {
            type: "string",
            description: "Why the token was deprecated.",
          },
          schema_path: {
            type: "string",
            description: "Schemas directory for validation.",
          },
        },
        additionalProperties: false,
      },
      async handler({
        uuid,
        target,
        spec_version,
        deprecated_comment,
        replaced_by,
        planned_removal,
        rationale = "",
        schema_path,
      }) {
        const args = [
          "lifecycle",
          "deprecate",
          "--uuid",
          uuid,
          "--target",
          target,
          "--spec-version",
          spec_version,
          "--rationale",
          rationale,
        ];
        if (deprecated_comment)
          args.push("--deprecated-comment", deprecated_comment);
        if (replaced_by) args.push("--replaced-by", replaced_by);
        if (planned_removal) args.push("--planned-removal", planned_removal);
        if (schema_path) args.push("--schema-path", schema_path);
        return runJson(args);
      },
    },

    {
      name: "rename_token",
      description:
        "Assign a new name object to a cascade token, preserving its UUID. " +
        "Optionally set a replaced_by pointer on the token being renamed.",
      inputSchema: {
        type: "object",
        required: ["uuid", "target", "new_name"],
        properties: {
          uuid: { type: "string", description: "UUID of the token to rename." },
          target: {
            type: "string",
            description:
              "Path to the *.tokens.json cascade file containing the token.",
          },
          new_name: {
            description:
              'New name — either a JSON object ({"property":"…","component":"…"}) or a plain string.',
          },
          replaced_by_target: {
            type: "string",
            description:
              "UUID to set as the replaced_by pointer (for retiring the old name).",
          },
          rationale: {
            type: "string",
            description: "Why the token was renamed.",
          },
          schema_path: {
            type: "string",
            description: "Schemas directory for validation.",
          },
        },
        additionalProperties: false,
      },
      async handler({
        uuid,
        target,
        new_name,
        replaced_by_target,
        rationale = "",
        schema_path,
      }) {
        if (
          new_name === null ||
          new_name === undefined ||
          (typeof new_name !== "string" && typeof new_name !== "object")
        ) {
          throw new Error(
            "new_name must be a string or object, got: " +
              JSON.stringify(new_name),
          );
        }
        const newNameArg =
          typeof new_name === "object" ? JSON.stringify(new_name) : new_name;
        const args = [
          "lifecycle",
          "rename",
          "--uuid",
          uuid,
          "--target",
          target,
          "--new-name",
          newNameArg,
          "--rationale",
          rationale,
        ];
        if (replaced_by_target)
          args.push("--replaced-by-target", replaced_by_target);
        if (schema_path) args.push("--schema-path", schema_path);
        return runJson(args);
      },
    },

    {
      name: "rewire_alias",
      description:
        "Change the $ref target on an alias token. The new ref target must resolve in the cascade. " +
        "Rejects if the token is not an alias.",
      inputSchema: {
        type: "object",
        required: ["uuid", "target", "new_ref", "tokens_root"],
        properties: {
          uuid: {
            type: "string",
            description: "UUID of the alias token to rewire.",
          },
          target: {
            type: "string",
            description:
              "Path to the *.tokens.json cascade file containing the token.",
          },
          new_ref: {
            type: "string",
            description:
              "New $ref value — must be a UUID that resolves in the cascade.",
          },
          tokens_root: {
            type: "string",
            description:
              "Root tokens directory for ref-resolution verification.",
          },
          rationale: {
            type: "string",
            description: "Why the alias target changed.",
          },
          schema_path: {
            type: "string",
            description: "Schemas directory for validation.",
          },
        },
        additionalProperties: false,
      },
      async handler({
        uuid,
        target,
        new_ref,
        tokens_root,
        rationale = "",
        schema_path,
      }) {
        const args = [
          "lifecycle",
          "rewire-alias",
          "--uuid",
          uuid,
          "--target",
          target,
          "--new-ref",
          new_ref,
          "--tokens-root",
          tokens_root,
          "--rationale",
          rationale,
        ];
        if (schema_path) args.push("--schema-path", schema_path);
        return runJson(args);
      },
    },

    {
      name: "remove_token",
      description:
        "Delete a token from a cascade file. Aborts if any other token in the dataset " +
        "holds a $ref pointing at this token's UUID.",
      inputSchema: {
        type: "object",
        required: ["uuid", "target", "tokens_root"],
        properties: {
          uuid: { type: "string", description: "UUID of the token to remove." },
          target: {
            type: "string",
            description:
              "Path to the *.tokens.json cascade file containing the token.",
          },
          tokens_root: {
            type: "string",
            description: "Root tokens directory for inbound-reference guard.",
          },
        },
        additionalProperties: false,
      },
      async handler({ uuid, target, tokens_root }) {
        return runJson([
          "lifecycle",
          "remove",
          "--uuid",
          uuid,
          "--target",
          target,
          "--tokens-root",
          tokens_root,
        ]);
      },
    },

    // ── Mode-set ───────────────────────────────────────────────────────────

    {
      name: "add_mode",
      description: "Append a new mode to an existing mode-set file.",
      inputSchema: {
        type: "object",
        required: ["mode_set_file", "mode"],
        properties: {
          mode_set_file: {
            type: "string",
            description: "Path to the mode-set JSON file.",
          },
          mode: {
            type: "string",
            description: "Name of the new mode to add.",
          },
          make_default: {
            type: "boolean",
            description: "Make this the default mode.",
          },
        },
        additionalProperties: false,
      },
      async handler({ mode_set_file, mode, make_default = false }) {
        const args = [
          "mode-set",
          "add-mode",
          "--mode-set-file",
          mode_set_file,
          "--mode",
          mode,
        ];
        if (make_default) args.push("--make-default");
        return runJson(args);
      },
    },

    {
      name: "rename_mode",
      description:
        "Rename a mode in a mode-set file and propagate the change to all token files " +
        "under tokens_root that use that mode value.",
      inputSchema: {
        type: "object",
        required: ["mode_set_file", "tokens_root", "old", "new"],
        properties: {
          mode_set_file: {
            type: "string",
            description: "Path to the mode-set JSON file.",
          },
          tokens_root: {
            type: "string",
            description: "Root tokens directory for propagation.",
          },
          old: {
            type: "string",
            description: "Existing mode name to rename.",
          },
          new: {
            type: "string",
            description: "Replacement mode name.",
          },
        },
        additionalProperties: false,
      },
      async handler({ mode_set_file, tokens_root, old, new: new_mode }) {
        return runJson([
          "mode-set",
          "rename-mode",
          "--mode-set-file",
          mode_set_file,
          "--tokens-root",
          tokens_root,
          "--old",
          old,
          "--new",
          new_mode,
        ]);
      },
    },

    {
      name: "remove_mode",
      description:
        "Remove a mode from a mode-set file. Aborts if any token references that mode value " +
        "or if the mode is the current default.",
      inputSchema: {
        type: "object",
        required: ["mode_set_file", "tokens_root", "mode"],
        properties: {
          mode_set_file: {
            type: "string",
            description: "Path to the mode-set JSON file.",
          },
          tokens_root: {
            type: "string",
            description: "Root tokens directory for reference guard.",
          },
          mode: {
            type: "string",
            description: "Mode name to remove.",
          },
        },
        additionalProperties: false,
      },
      async handler({ mode_set_file, tokens_root, mode }) {
        return runJson([
          "mode-set",
          "remove-mode",
          "--mode-set-file",
          mode_set_file,
          "--tokens-root",
          tokens_root,
          "--mode",
          mode,
        ]);
      },
    },

    {
      name: "create_mode_set",
      description:
        "Author a new mode-set file for a new cascade dimension. " +
        "The file must not already exist. default must be a member of modes.",
      inputSchema: {
        type: "object",
        required: ["mode_set_file", "name", "modes", "default"],
        properties: {
          mode_set_file: {
            type: "string",
            description:
              "Destination path for the new mode-set JSON file (must not exist).",
          },
          name: {
            type: "string",
            description:
              "Logical name used as the key in token name objects, e.g. 'colorScheme'.",
          },
          modes: {
            type: "array",
            items: { type: "string" },
            description: "Ordered list of mode names, e.g. ['light', 'dark'].",
          },
          default: {
            type: "string",
            description: "Default mode — must be a member of modes.",
          },
          description: {
            type: "string",
            description: "Human-readable description embedded in the file.",
          },
        },
        additionalProperties: false,
      },
      async handler({
        mode_set_file,
        name,
        modes,
        default: defaultMode,
        description = "",
      }) {
        return runJson([
          "mode-set",
          "create-mode-set",
          "--mode-set-file",
          mode_set_file,
          "--name",
          name,
          "--modes",
          JSON.stringify(modes),
          "--default",
          defaultMode,
          "--description",
          description,
        ]);
      },
    },

    {
      name: "remove_mode_set",
      description:
        "Delete a mode-set file. Aborts if any token in the dataset references this dimension.",
      inputSchema: {
        type: "object",
        required: ["mode_set_file", "tokens_root"],
        properties: {
          mode_set_file: {
            type: "string",
            description: "Path to the mode-set JSON file to remove.",
          },
          tokens_root: {
            type: "string",
            description: "Root tokens directory for reference guard.",
          },
        },
        additionalProperties: false,
      },
      async handler({ mode_set_file, tokens_root }) {
        return runJson([
          "mode-set",
          "remove-mode-set",
          "--mode-set-file",
          mode_set_file,
          "--tokens-root",
          tokens_root,
        ]);
      },
    },
  ];
}
