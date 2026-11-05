// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// Functions run inside the page through `handle.evaluate(fn, arg)`, so each is
// self-contained: no imports or outer references.

// Reads what `design-data render-compare` understands, in CSS px, from the
// unscaled layout box. `role` is container (a box), label (text) or icon.
// `details` carries extras the comparison ignores (font family).
export function measureElement(el, role) {
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const px = (v) => Math.round(parseFloat(v) * 1000) / 1000;
  const props = { width: px(rect.width), height: px(rect.height) };
  const details = {};
  if (role === "container") {
    props.paddingTop = px(cs.paddingTop);
    props.paddingRight = px(cs.paddingRight);
    props.paddingBottom = px(cs.paddingBottom);
    props.paddingLeft = px(cs.paddingLeft);
    // Capsules compute to huge or percentage radii; the drawn radius is capped at half the short side.
    const r = cs.borderTopLeftRadius.split(" ")[0];
    const half = Math.min(rect.width, rect.height) / 2;
    props.cornerRadius = px(r.endsWith("%") ? (parseFloat(r) / 100) * Math.min(rect.width, rect.height) : Math.min(parseFloat(r), half));
    props.fill = cs.backgroundColor;
  } else if (role === "label") {
    // Union of the text boxes; slotted text is read through the slot's assigned nodes.
    const texts = [];
    const gather = (n) => {
      if (n.nodeType === 3) {
        if (n.textContent.trim()) texts.push(n);
      } else if (n.localName === "slot") {
        n.assignedNodes({ flatten: true }).forEach(gather);
      } else {
        n.childNodes.forEach(gather);
      }
    };
    gather(el);
    const boxes = texts.map((t) => {
      const range = document.createRange();
      range.selectNodeContents(t);
      return range.getBoundingClientRect();
    });
    const left = Math.min(...boxes.map((b) => b.left));
    const right = Math.max(...boxes.map((b) => b.right));
    props.width = boxes.length ? px(right - left) : 0;
    // Height is the line height, which is what the scene models. The element's own box can stretch
    // (flex align) and the text range is only the glyph box; fall back to the range for `normal`.
    const lh = parseFloat(cs.lineHeight);
    props.height = Number.isFinite(lh) ? px(lh) : boxes.length ? px(Math.max(...boxes.map((b) => b.bottom)) - Math.min(...boxes.map((b) => b.top))) : 0;
    props.fontSize = px(cs.fontSize);
    props.fontWeight = Number(cs.fontWeight);
    props.color = cs.color;
    details.fontFamily = cs.fontFamily;
  } else if (role === "icon") {
    props.color = cs.color;
  }
  return { props, details };
}

// Finds a part inside the component when the state gives no selector: the label is
// the first element holding its own text, the icon the first svg. Pierces open shadow roots.
export function findDefaultPart(root, role) {
  const walk = (node) => {
    const out = [];
    for (const child of node.children ?? []) {
      out.push(child);
      out.push(...walk(child));
      if (child.shadowRoot) out.push(...walk(child.shadowRoot));
    }
    return out;
  };
  const all = [...walk(root), ...(root.shadowRoot ? walk(root.shadowRoot) : [])];
  if (role === "icon") return all.find((e) => e.localName === "svg") ?? null;
  return all.find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) ?? null;
}

// Which design-token custom properties (prefixes `--spectrum-` and `--swc-` by default; the
// deployed SWC gen2 Storybook uses `--swc-*`) the stylesheets apply to this element, with their
// resolved values. Walks the document and shadow-root sheets; it lists every matching
// declaration and does not resolve the cascade, so overridden declarations also appear.
export function collectTokenProperties(el, prefixes = ["--spectrum-", "--swc-"]) {
  const root = el.getRootNode();
  const cs = getComputedStyle(el);
  const sources = [document, root, el.shadowRoot].filter(Boolean);
  const seen = new Set();
  const found = [];
  const matches = (selector) => {
    const s = selector.replace(/:host(\(([^)]*)\))?/g, (_, p, inner) => (inner ? inner : "*"));
    try {
      return el.matches(s);
    } catch {
      return false;
    }
  };
  const visit = (rules) => {
    for (const rule of rules) {
      if (rule.selectorText && rule.style && matches(rule.selectorText)) {
        // cssText keeps shorthands with var() intact; iterating the style yields empty longhands.
        for (const [, prop, value] of rule.style.cssText.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) {
          const vars = [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]).filter((v) => prefixes.some((p) => v.startsWith(p)));
          if (!vars.length) continue;
          const key = `${rule.selectorText}|${prop}|${value}`;
          if (seen.has(key)) continue;
          seen.add(key);
          found.push({
            selector: rule.selectorText,
            property: prop,
            value: value.trim(),
            resolved: Object.fromEntries(vars.map((v) => [v, cs.getPropertyValue(v).trim()])),
          });
        }
      }
      if (rule.cssRules) visit(rule.cssRules);
    }
  };
  for (const src of new Set(sources)) {
    for (const sheet of [...(src.styleSheets ?? []), ...(src.adoptedStyleSheets ?? [])]) {
      try {
        visit(sheet.cssRules);
      } catch {} // cross-origin sheet
    }
  }
  return found;
}
