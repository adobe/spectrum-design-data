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
 * Implements SPEC-018 through SPEC-024: semantic rules that validate token
 * name-object fields against component declarations, and validate component
 * declarations internally.
 *
 * @see spec/component-format.md#spec-rules
 * @see spec/anatomy-format.md#spec-rules
 * @see spec/state-model.md#spec-rules
 */

import {
  CANONICAL_SLOTS,
  CANONICAL_ANATOMY_PARTS,
  CANONICAL_STATES,
} from "./canonical.js";

/**
 * @typedef {{ ruleId: string, severity: 'error'|'warning', message: string, tokenName?: string, componentName?: string }} Diagnostic
 * @typedef {{ name: string|object, [key: string]: unknown }} Token
 * @typedef {{ name: string, options?: object, anatomy?: Array<{name:string,description?:string}>, slots?: Array<{name:string,description?:string}>, states?: Array<{name:string,trigger?:string,precedence?:number,layered?:boolean,description?:string}> }} ComponentDeclaration
 * @typedef {{ tokens?: Token[], components?: ComponentDeclaration[] }} Dataset
 */

/**
 * Validate a dataset for SPEC-018 through SPEC-024 compliance.
 *
 * @param {Dataset} dataset
 * @returns {Diagnostic[]}
 */
export function validateDataset(dataset) {
  const tokens = dataset.tokens ?? [];
  const components = dataset.components ?? [];

  // Build component lookup map keyed by name.
  const componentMap = new Map(components.map((c) => [c.name, c]));

  const diagnostics = [];

  // --- Token cross-reference rules ---
  for (const token of tokens) {
    const name = token.name;
    // String names (SPEC-017 escape hatch) skip cross-reference checks.
    if (typeof name !== "object" || name === null) continue;

    const tokenLabel = JSON.stringify(name);

    if (name.component != null) {
      // SPEC-018: component name must be declared
      if (!componentMap.has(name.component)) {
        diagnostics.push({
          ruleId: "SPEC-018",
          severity: "error",
          message: `Token '${tokenLabel}' references undeclared component '${name.component}'`,
          tokenName: tokenLabel,
        });
        // Can't validate further fields without a component declaration.
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
  }

  // --- Component declaration internal rules ---
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

    // SPEC-024: custom state names should have descriptions
    for (const state of component.states ?? []) {
      if (!CANONICAL_STATES.has(state.name) && !state.description) {
        diagnostics.push({
          ruleId: "SPEC-024",
          severity: "warning",
          message: `Component '${cName}' has custom state '${state.name}' with no description`,
          componentName: cName,
        });
      }
    }
  }

  return diagnostics;
}
