// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Option constraints (`component.constraints[]`) in the browser. Mirrors
// sdk/core/src/constraints.rs; sdk/wasm/test/constraints-parity.test.js runs both
// against sdk/core/tests/fixtures/option-constraint-cases.json.
//
// A combination is a plain object of option name -> value. A missing, null or
// undefined value is unknown, and unknown values never prove an exclusion.

const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
const has = (list, v) => list.some((x) => same(x, v));
const known = (combo, name) => {
  const v = combo[name];
  return v === undefined || v === null ? undefined : v;
};

// One constraint object, or null when its shape is invalid.
export function parseConstraint(v, index) {
  if (!v || typeof v.when !== "object" || v.when === null) return null;
  if (typeof v.require !== "object" || v.require === null) return null;
  if (v.severity !== "error" && v.severity !== "advisory") return null;
  const when = {};
  for (const [k, val] of Object.entries(v.when))
    when[k] = Array.isArray(val) ? val : [val];
  const require = {};
  for (const [k, val] of Object.entries(v.require)) {
    if (Array.isArray(val)) require[k] = { oneOf: val };
    else if (val && typeof val === "object" && val.present === true)
      require[k] = { present: true };
  }
  return {
    index,
    when,
    require,
    severity: v.severity,
    description: typeof v.description === "string" ? v.description : undefined,
    source: typeof v.source === "string" ? v.source : undefined,
  };
}

// All valid constraints on a component, keeping their array index.
export function readConstraints(component) {
  const items = Array.isArray(component?.constraints)
    ? component.constraints
    : [];
  return items.flatMap((v, i) => {
    const c = parseConstraint(v, i);
    return c ? [c] : [];
  });
}

// Whether `combo` matches `when` and violates `require`. Presence requirements
// are never proven violated.
export function excludes(c, combo) {
  const matches = Object.entries(c.when).every(([name, vals]) => {
    const v = known(combo, name);
    return v !== undefined && has(vals, v);
  });
  return (
    matches &&
    Object.entries(c.require).some(([name, req]) => {
      const v = known(combo, name);
      return req.oneOf !== undefined && v !== undefined && !has(req.oneOf, v);
    })
  );
}

// Constraints that apply to `combo`, errors first.
export function matching(constraints, combo) {
  return constraints
    .filter((c) => excludes(c, combo))
    .sort((a, b) =>
      a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
    );
}

export const errorsOf = (matches) =>
  matches.filter((c) => c.severity === "error");
export const advisoriesOf = (matches) =>
  matches.filter((c) => c.severity === "advisory");

// For each option a violated constraint requires, the values that would satisfy it.
export function fixes(c) {
  return Object.entries(c.require)
    .filter(([, req]) => req.oneOf)
    .map(([option, req]) => ({ option, values: req.oneOf }));
}
