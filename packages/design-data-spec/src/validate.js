/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Layer 2 cross-reference validator for design-data-spec.
 *
 * Implements SPEC-007, SPEC-009, SPEC-018 through SPEC-031: semantic rules
 * that validate token name fields against component declarations, validate
 * component declarations internally, validate tokenBindings references, check
 * documentBlocks content, and validate accessibility declarations.
 *
 * @see spec/component-format.md#spec-rules
 * @see spec/anatomy-format.md#spec-rules
 * @see spec/state-model.md#canonical-state-vocabulary
 */

import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

import {
  CANONICAL_SLOTS,
  CANONICAL_ANATOMY_PARTS,
  CANONICAL_STATES,
} from "./canonical.js";

/**
 * @typedef {{ ruleId: string, severity: 'error'|'warning'|'info', message: string, tokenName?: string, componentName?: string }} Diagnostic
 * @typedef {{ name: string|object, [key: string]: unknown }} Token
 * @typedef {{ name: string, options?: object, anatomy?: Array<{name:string,description?:string}>, slots?: Array<{name:string,description?:string}>, states?: Array<{name:string,trigger?:string,precedence?:number,layered?:boolean,description?:string}>, documentBlocks?: Array<{type:string,content:string,agents?:string}>, accessibility?: object }} ComponentDeclaration
 * @typedef {{ tokens?: Token[], components?: ComponentDeclaration[] }} Dataset
 */

// ---------------------------------------------------------------------------
// SPEC-007: name-roundtrip helpers (port of sdk/core/src/naming.rs)
// ---------------------------------------------------------------------------

const STATE_WORDS = new Set([
  "default",
  "hover",
  "down",
  "focus",
  "selected",
  "disabled",
  "key-focus",
  "emphasized",
  "error",
  "invalid",
  "active",
  "open",
  "closed",
  "indeterminate",
  "keyboard-focus",
]);

function splitTrailingState(s) {
  const parts = s.split("-");
  if (parts.length >= 3) {
    const compound = `${parts[parts.length - 2]}-${parts[parts.length - 1]}`;
    if (STATE_WORDS.has(compound)) {
      const prop = parts.slice(0, -2).join("-");
      if (prop) return [prop, compound];
    }
  }
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 1];
    if (STATE_WORDS.has(candidate)) {
      const prop = parts.slice(0, -1).join("-");
      if (prop) return [prop, candidate];
    }
  }
  return [s, null];
}

function parseLegacyName(key, componentHint) {
  let remainder = key;
  if (componentHint && key.startsWith(componentHint + "-")) {
    remainder = key.slice(componentHint.length + 1);
  }
  const [property, state] = splitTrailingState(remainder);
  return { property, component: componentHint ?? null, state };
}

function generateLegacyName({ component, property, state }) {
  const parts = [];
  if (component) parts.push(component);
  parts.push(property);
  if (state) parts.push(state);
  return parts.join("-");
}

function hasEmbeddedState(property) {
  const segs = property.split("-");
  if (segs.length <= 1) return false;
  for (let i = 0; i < segs.length - 1; i++) {
    if (STATE_WORDS.has(segs[i])) return true;
    if (STATE_WORDS.has(`${segs[i]}-${segs[i + 1]}`)) return true;
  }
  return false;
}

function nameRoundtrips(key, componentHint) {
  const obj = parseLegacyName(key, componentHint);
  if (generateLegacyName(obj) !== key) return false;
  return !hasEmbeddedState(obj.property);
}

// ---------------------------------------------------------------------------
// SPEC-007 / SPEC-009: module-level data loading
// ---------------------------------------------------------------------------

const __moduleDir = dirname(fileURLToPath(import.meta.url));
const _specRoot = join(__moduleDir, "..");
const _repoRoot = join(_specRoot, "..", "..");

/** Load naming exceptions allowlist for SPEC-007. Silently empty if unavailable. */
const NAMING_EXCEPTIONS = (() => {
  try {
    const p = join(_repoRoot, "packages", "tokens", "naming-exceptions.json");
    const data = JSON.parse(readFileSync(p, "utf8"));
    return new Set((data.exceptions ?? []).map((e) => e.token));
  } catch {
    return new Set();
  }
})();

/** Map<fieldName, Set<value>> for advisory fields with a registry (SPEC-009). */
const ADVISORY_REGISTRY = (() => {
  const map = new Map();
  try {
    const fieldsDir = join(_specRoot, "fields");
    const files = readdirSync(fieldsDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const field = JSON.parse(readFileSync(join(fieldsDir, file), "utf8"));
        if (field.validation !== "advisory" || !field.registry) continue;
        const regData = JSON.parse(
          readFileSync(join(_repoRoot, field.registry), "utf8"),
        );
        const values = new Set();
        for (const entry of regData.values ?? []) {
          if (entry.id) values.add(entry.id);
          for (const alias of entry.aliases ?? []) values.add(alias);
        }
        map.set(field.name, values);
      } catch {
        // Skip individual field or registry files that can't be read.
      }
    }
  } catch {
    // If fields dir is unavailable, SPEC-009 is silently disabled.
  }
  return map;
})();

const ADVISORY_FIELDS = [...ADVISORY_REGISTRY.keys()];

// ---------------------------------------------------------------------------
// validateDataset
// ---------------------------------------------------------------------------

/**
 * Validate a dataset for Layer 2 SPEC rule compliance.
 *
 * @param {Dataset} dataset
 * @returns {Diagnostic[]}
 */
export function validateDataset(dataset) {
  const tokens = dataset.tokens ?? [];
  const components = dataset.components ?? [];

  const componentMap = new Map(components.map((c) => [c.name, c]));
  const diagnostics = [];

  // Build UUID lookup for SPEC-010.
  const uuidSet = new Set(tokens.map((t) => t.uuid).filter(Boolean));

  // --- Token rules ---
  for (const token of tokens) {
    const name = token.name;

    // SPEC-010: replaced-by-target-exists
    if (
      typeof token.replaced_by === "string" &&
      !uuidSet.has(token.replaced_by)
    ) {
      const label = typeof name === "string" ? name : JSON.stringify(name);
      diagnostics.push({
        ruleId: "SPEC-010",
        severity: "error",
        message: `Token '${label}' replaced_by target UUID not found in dataset`,
        tokenName: label,
      });
    }

    // SPEC-011: replaced-by-array-requires-comment
    if (Array.isArray(token.replaced_by) && !token.deprecated_comment) {
      const label = typeof name === "string" ? name : JSON.stringify(name);
      diagnostics.push({
        ruleId: "SPEC-011",
        severity: "error",
        message: `Token '${label}' replaced_by is an array but deprecated_comment is missing`,
        tokenName: label,
      });
    }

    // SPEC-012: replaced-by-requires-deprecated
    if (token.replaced_by != null && !token.deprecated) {
      const label = typeof name === "string" ? name : JSON.stringify(name);
      diagnostics.push({
        ruleId: "SPEC-012",
        severity: "error",
        message: `Token '${label}' has replaced_by but is not marked deprecated`,
        tokenName: label,
      });
    }

    // SPEC-013: planned-removal-requires-deprecated
    if (token.plannedRemoval != null && !token.deprecated) {
      const label = typeof name === "string" ? name : JSON.stringify(name);
      diagnostics.push({
        ruleId: "SPEC-013",
        severity: "error",
        message: `Token '${label}' has plannedRemoval but is not marked deprecated`,
        tokenName: label,
      });
    }

    // SPEC-017: string-name-tech-debt
    if (typeof name === "string") {
      diagnostics.push({
        ruleId: "SPEC-017",
        severity: "warning",
        message: `Token '${name}' uses a string name instead of a name object — migrate to a structured name`,
        tokenName: name,
      });
    }

    // SPEC-007: name-roundtrip (string-named tokens only)
    if (typeof name === "string") {
      const componentHint =
        typeof token.component === "string" ? token.component : null;
      if (!nameRoundtrips(name, componentHint)) {
        if (NAMING_EXCEPTIONS.has(name)) {
          diagnostics.push({
            ruleId: "SPEC-007",
            severity: "info",
            message: `Known naming exception: '${name}' does not match canonical generation rules (tracked in naming-exceptions.json)`,
            tokenName: name,
          });
        } else {
          diagnostics.push({
            ruleId: "SPEC-007",
            severity: "warning",
            message: `Token '${name}' does not roundtrip through name-object generation rules and is not in the exceptions allowlist`,
            tokenName: name,
          });
        }
      }
    }

    // String names skip object-name cross-reference checks below.
    if (typeof name !== "object" || name === null) continue;

    const tokenLabel = JSON.stringify(name);

    // SPEC-009: name-field-enum-sync
    for (const field of ADVISORY_FIELDS) {
      const value = name[field];
      if (typeof value !== "string") continue;
      const registry = ADVISORY_REGISTRY.get(field);
      if (!registry) continue;
      if (!registry.has(value)) {
        diagnostics.push({
          ruleId: "SPEC-009",
          severity: "warning",
          message: `name.${field} value "${value}" is not in the design-system-registry ${field} vocabulary`,
          tokenName: tokenLabel,
        });
      }
    }

    // SPEC-025: anatomy field requires component field
    if (name.anatomy != null && name.component == null) {
      diagnostics.push({
        ruleId: "SPEC-025",
        severity: "error",
        message: `Token '${tokenLabel}' has 'anatomy' field without a 'component' field`,
        tokenName: tokenLabel,
      });
    }

    if (name.component != null) {
      // SPEC-018: component name must be declared
      if (!componentMap.has(name.component)) {
        diagnostics.push({
          ruleId: "SPEC-018",
          severity: "error",
          message: `Token '${tokenLabel}' references undeclared component '${name.component}'`,
          tokenName: tokenLabel,
        });
        continue;
      }

      const component = componentMap.get(name.component);

      // SPEC-019: variant must be in component's variant option enum
      if (name.variant != null) {
        const variantEnum = component.options?.variant?.enum;
        if (Array.isArray(variantEnum) && !variantEnum.includes(name.variant)) {
          diagnostics.push({
            ruleId: "SPEC-019",
            severity: "error",
            message: `Token '${tokenLabel}' has variant '${name.variant}' which is not declared on component '${name.component}'`,
            tokenName: tokenLabel,
            componentName: name.component,
          });
        }
      }

      // SPEC-020: anatomy must match a declared anatomy part name
      if (name.anatomy != null) {
        const declaredParts = new Set(
          (component.anatomy ?? []).map((p) => p.name),
        );
        if (declaredParts.size > 0 && !declaredParts.has(name.anatomy)) {
          diagnostics.push({
            ruleId: "SPEC-020",
            severity: "error",
            message: `Token '${tokenLabel}' references undeclared anatomy part '${name.anatomy}' on component '${name.component}'`,
            tokenName: tokenLabel,
            componentName: name.component,
          });
        }
      }

      // SPEC-022: state must match a declared state name (only when states are declared)
      if (name.state != null) {
        const declaredStates = new Set(
          (component.states ?? []).map((s) => s.name),
        );
        if (declaredStates.size > 0 && !declaredStates.has(name.state)) {
          diagnostics.push({
            ruleId: "SPEC-022",
            severity: "error",
            message: `Token '${tokenLabel}' references undeclared state '${name.state}' on component '${name.component}'`,
            tokenName: tokenLabel,
            componentName: name.component,
          });
        }
      }
    }

    // SPEC-028/029: tokens may also carry documentBlocks; the spec assertion
    // applies to any entity, not only components.
    checkDocumentBlocks(
      token.documentBlocks,
      `Token '${tokenLabel}'`,
      null,
      tokenLabel,
      diagnostics,
    );
  }

  // --- Component declaration rules ---
  for (const component of components) {
    const cName = component.name;

    // SPEC-021: custom slot names should have descriptions
    for (const slot of component.slots ?? []) {
      if (!CANONICAL_SLOTS.has(slot.name) && !slot.description) {
        diagnostics.push({
          ruleId: "SPEC-021",
          severity: "warning",
          message: `Component '${cName}' has custom slot '${slot.name}' with no description — add a description or use a canonical slot name`,
          componentName: cName,
        });
      }
    }

    // SPEC-023: custom anatomy part names should have descriptions
    for (const part of component.anatomy ?? []) {
      if (!CANONICAL_ANATOMY_PARTS.has(part.name) && !part.description) {
        diagnostics.push({
          ruleId: "SPEC-023",
          severity: "warning",
          message: `Component '${cName}' has custom anatomy part '${part.name}' with no description`,
          componentName: cName,
        });
      }
    }

    // SPEC-024: anatomy part names must be unique within a component
    const anatomyNames = new Set();
    for (const part of component.anatomy ?? []) {
      if (anatomyNames.has(part.name)) {
        diagnostics.push({
          ruleId: "SPEC-024",
          severity: "error",
          message: `Component '${cName}' declares duplicate anatomy part name '${part.name}'`,
          componentName: cName,
        });
      }
      anatomyNames.add(part.name);
    }

    // SPEC-026: custom state names should have descriptions
    for (const state of component.states ?? []) {
      if (!CANONICAL_STATES.has(state.name) && !state.description) {
        diagnostics.push({
          ruleId: "SPEC-026",
          severity: "warning",
          message: `Component '${cName}' has custom state '${state.name}' with no description`,
          componentName: cName,
        });
      }
    }

    // SPEC-028/029: documentBlocks on components
    checkDocumentBlocks(
      component.documentBlocks,
      `Component '${cName}'`,
      cName,
      null,
      diagnostics,
    );

    // SPEC-030: accessibility-empty
    if (
      component.accessibility != null &&
      typeof component.accessibility === "object"
    ) {
      const acc = component.accessibility;
      const hasField =
        acc.role != null ||
        acc.intents != null ||
        acc.focusable != null ||
        acc.keyboardIntents != null ||
        (Array.isArray(acc.wcag) && acc.wcag.length > 0);
      if (!hasField) {
        diagnostics.push({
          ruleId: "SPEC-030",
          severity: "warning",
          message: `Component '${cName}' has an empty accessibility object — populate at least one field or remove the property`,
          componentName: cName,
        });
      }
    }

    // SPEC-031: accessibility-wcag-missing
    if (component.accessibility?.role != null) {
      const wcag = component.accessibility.wcag;
      if (!Array.isArray(wcag) || wcag.length === 0) {
        diagnostics.push({
          ruleId: "SPEC-031",
          severity: "warning",
          message: `Component '${cName}' accessibility has a role but no wcag entries — add applicable WCAG 2.x success criteria`,
          componentName: cName,
        });
      }
    }
  }

  // --- Token binding rules ---

  // SPEC-027: each tokenBindings[].token must resolve to a known token name.
  const tokenNameSet = new Set(
    tokens
      .map((t) => (typeof t.name === "string" ? t.name : null))
      .filter(Boolean),
  );

  for (const component of components) {
    for (const binding of component.tokenBindings ?? []) {
      if (!tokenNameSet.has(binding.token)) {
        diagnostics.push({
          ruleId: "SPEC-027",
          severity: "error",
          message: `Component '${component.name}' tokenBindings references unknown token '${binding.token}'`,
          componentName: component.name,
        });
      }
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// SPEC-028 / SPEC-029 helper
// ---------------------------------------------------------------------------

/**
 * @param {Array|undefined} blocks
 * @param {string} entityLabel
 * @param {string|null} componentName
 * @param {string|null} tokenName
 * @param {Diagnostic[]} diagnostics
 */
function checkDocumentBlocks(
  blocks,
  entityLabel,
  componentName,
  tokenName,
  diagnostics,
) {
  if (!Array.isArray(blocks) || blocks.length === 0) return;

  for (const block of blocks) {
    if (
      typeof block.agents === "string" &&
      typeof block.content === "string" &&
      block.agents === block.content
    ) {
      diagnostics.push({
        ruleId: "SPEC-028",
        severity: "warning",
        message: `${entityLabel} has a document block whose agents text is identical to content — tailor it for agent consumption or omit the agents field`,
        ...(componentName != null ? { componentName } : {}),
        ...(tokenName != null ? { tokenName } : {}),
      });
    }
  }

  if (!blocks.some((b) => b.type === "purpose")) {
    diagnostics.push({
      ruleId: "SPEC-029",
      severity: "warning",
      message: `${entityLabel} has documentBlocks but no purpose block — add a block with type 'purpose'`,
      ...(componentName != null ? { componentName } : {}),
      ...(tokenName != null ? { tokenName } : {}),
    });
  }
}
