// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// Expands a platform-args matrix into the two files a comparison needs, with matching ids:
// a `design-data render --batch` states file and a Storybook capture file. Args the
// mapping has no recipe equivalent for are collected as `unmapped`, not rendered.

export function mapArgs(mapping, args) {
  const options = {};
  const unmapped = [];
  for (const [arg, value] of Object.entries(args)) {
    const rule = mapping.args[arg];
    if (!rule) {
      unmapped.push({ arg, value, reason: "no mapping for this arg" });
      continue;
    }
    const mapped = rule.values ? rule.values[value] : value;
    if (mapped === undefined || mapped === null) {
      unmapped.push({ arg, value, reason: "recipe has no equivalent value" });
      continue;
    }
    options[rule.to] = mapped;
  }
  return { options, unmapped };
}

const slug = (v) => String(v).toLowerCase();

export function stateId(mapping, args, colorScheme) {
  const bits = [mapping.component];
  for (const k of ["size", "variant", "fillStyle", "staticColor"]) if (args[k] !== undefined) bits.push(slug(args[k]));
  if (args.isDisabled) bits.push("disabled");
  if (args.isPending) bits.push("pending");
  bits.push(colorScheme);
  return bits.join("-");
}

// matrix: { axes: { arg: [values] }, cases: [{ arg: value }], colorSchemes: ["light", "dark"] }
export function expand(baseMapping, matrix, layout) {
  const mapping = { ...baseMapping, ...(baseMapping.layouts?.[layout] ?? {}) };
  if (!mapping.selector) throw new Error(`pick a layout: ${Object.keys(baseMapping.layouts ?? {}).join(", ")}`);
  const combos = [];
  const keys = Object.keys(matrix.axes ?? {});
  const walk = (i, acc) => {
    if (i === keys.length) return combos.push({ ...acc });
    for (const v of matrix.axes[keys[i]]) walk(i + 1, { ...acc, [keys[i]]: v });
  };
  if (keys.length) walk(0, {});
  combos.push(...(matrix.cases ?? []));

  const render = [];
  const capture = [];
  const unmapped = [];
  const seen = new Set();
  for (const raw of combos) {
    // Always pass defaults explicitly: S2 defaults to primary, the recipe to accent.
    const args = { ...Object.fromEntries(Object.entries(mapping.args).filter(([, r]) => r.default !== undefined).map(([k, r]) => [k, r.default])), ...raw };
    const { options, unmapped: u } = mapArgs(mapping, args);
    for (const scheme of matrix.colorSchemes ?? ["light", "dark"]) {
      const id = stateId(mapping, args, scheme);
      if (seen.has(id)) continue;
      seen.add(id);
      if (u.length) {
        unmapped.push({ id, args, unmapped: u });
        continue;
      }
      const { size, ...rest } = options;
      render.push({ id, component: mapping.component, platform: mapping.platform, size, options: rest, colorScheme: scheme, label: mapping.label });
      capture.push({ id, story: mapping.story, args, colorScheme: scheme, selector: mapping.selector, parts: mapping.parts });
    }
  }
  return { render, capture, unmapped };
}
