// Copyright 2026 Adobe. All rights reserved.
// Read-only comparison (bead spectrum-design-data-qkj5.373): the token bindings our recipes resolve
// (`design-data render --batch`, scene output) against SWC gen 2's component CSS (token("...")).
// Usage: node tools/swc-crosscheck/compare.mjs <design-data binary> <SWC components dir> [swc tokens.css]
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [cli, swcDir, tokensCss = join(swcDir, "../stylesheets/tokens.css")] =
  process.argv.slice(2);

// ---------- SWC token values (from the published tokens.css) ----------
const tokenSrc = readFileSync(tokensCss, "utf8");
const rawTokens = new Map(
  [...tokenSrc.matchAll(/--swc-([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [
    m[1],
    m[2].replace(/\s+/g, " ").trim(),
  ]),
);

function splitArgs(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function resolveValue(value, scheme, seen = new Set()) {
  let v = value.trim();
  // Scale set: `var(--swc-theme--sizeM, 16px) var(--swc-theme--sizeL, 18px)` -> desktop value.
  const scale = v.match(
    /^var\(--swc-theme--sizeM,\s*([^)]+)\)\s+var\(--swc-theme--sizeL,/,
  );
  if (scale) return scale[1].trim();
  const ld = v.match(/^light-dark\((.*)\)$/);
  if (ld) {
    const [light, dark] = splitArgs(ld[1]);
    return resolveValue(scheme === "dark" ? dark : light, scheme, seen);
  }
  const ref = v.match(/^var\(--swc-([a-z0-9-]+)(?:,\s*(.*))?\)$/);
  if (ref) {
    if (seen.has(ref[1])) return null;
    seen.add(ref[1]);
    const target = rawTokens.get(ref[1]);
    return target === undefined
      ? ref[2]
        ? resolveValue(ref[2], scheme, seen)
        : null
      : resolveValue(target, scheme, seen);
  }
  return v;
}
const swcToken = (name, scheme) =>
  name.startsWith("literal:")
    ? name.slice(8)
    : rawTokens.has(name)
      ? resolveValue(rawTokens.get(name), scheme)
      : null;

// ---------- value normalization ----------
const WEIGHTS = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700,
  "extra-bold": 800,
  black: 900,
};
function hex(h) {
  const x = h.replace("#", "");
  const f = x.length === 3 ? [...x].map((c) => c + c).join("") : x;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
}
function norm(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (WEIGHTS[s]) return String(WEIGHTS[s]);
  if (/^#[0-9a-f]{3,6}$/i.test(s)) return `rgb(${hex(s).join(",")})`;
  const c = s.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/,
  );
  if (c) {
    let a = c[4] === undefined ? 1 : parseFloat(c[4]);
    if (c[5] === "%") a /= 100;
    const [r, g, b] = [c[1], c[2], c[3]].map((n) => Math.round(parseFloat(n)));
    return a >= 0.999
      ? `rgb(${r},${g},${b})`
      : `rgba(${r},${g},${b},${+a.toFixed(3)})`;
  }
  const n = s.match(/^(-?[\d.]+)(px)?$/);
  if (n) return `${+parseFloat(n[1]).toFixed(3)}${n[2] ?? ""}`;
  return s.replace(/\s+/g, " ");
}

// ---------- SWC CSS: hook -> token bindings per condition ----------
function blocks(css) {
  const out = [];
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const stack = [{ selector: "", decls: [], skip: false }];
  let buf = "";
  for (const ch of flat) {
    const top = stack[stack.length - 1];
    if (ch === "{") {
      let selector = buf.trim();
      if (selector.includes("&")) selector = selector.replace(/&/g, top.selector);
      stack.push({ selector, decls: [], skip: top.skip || selector.startsWith("@") });
      buf = "";
    } else if (ch === ";") {
      if (buf.trim()) top.decls.push(buf.trim());
      buf = "";
    } else if (ch === "}") {
      if (buf.trim()) top.decls.push(buf.trim());
      buf = "";
      const node = stack.pop();
      if (!node.skip) out.push({ selector: node.selector, body: node.decls.join(";") });
    } else buf += ch;
  }
  return out;
}
const STRUCTURAL = /^(size|outline|static|has|icon|truncate|justified|disabled|quiet|fixed|no|subtle|pending|selected|emphasized|hold)/;
function condition(selector) {
  const cond = {};
  if (/:lang\(|\[static-color|\[disabled|\[pending|\[selected|\[emphasized|\[quiet|\[icon-only|\[hold-icon|\[truncate|\[justified|\[fixed|\[hide-label|\[no-label/.test(selector)) cond.other = true;
  const size = selector.match(/\[size="([a-z]+)"\]/);
  if (size) cond.size = size[1];
  const variant = selector.match(/\[variant="([a-z]+)"\]/);
  if (variant) cond.variant = variant[1];
  for (const m of selector.matchAll(/\.swc-[A-Za-z]+--([A-Za-z]+)/g)) {
    if (/^size/.test(m[1])) cond.size = m[1].slice(4).toLowerCase();
    else if (m[1] === "subtle") cond.style = "subtle";
    else if (m[1] === "outline") cond.style = "outline";
    else if (!STRUCTURAL.test(m[1])) cond.variant = m[1];
    else cond.other = true;
  }
  if (/\[subtle\]/.test(selector)) cond.style = "subtle";
  const fill = selector.match(/\[fill-style="([a-z]+)"\]/);
  if (fill) cond.style = fill[1];
  if (selector.includes(":hover")) cond.state = "hover";
  if (selector.includes(":active")) cond.state = "down";
  if (selector.includes(":focus-visible")) cond.state = "focus";
  return cond;
}
const same = (a, b) =>
  ["size", "variant", "style", "state"].every((k) => a[k] === b[k]);

function swcBindings(file, prefix) {
  const css = readFileSync(join(swcDir, file), "utf8");
  const base = new Map(); // hook -> token from `var(--swc-x, token("t"))` fallbacks and literal token() declarations
  const literals = new Map(); // css property -> token (no hook)
  const rules = []; // {cond, hook, token}
  const parts = [];
  for (const { selector, body } of blocks(css)) {
    for (const part of splitArgs(selector)) parts.push({ selector: part, body });
  }
  for (const { selector, body } of parts) {
    const cond = condition(selector);
    if (cond.other) continue;
    for (const decl of body.split(";")) {
      const [prop, ...rest] = decl.split(":");
      const value = rest.join(":").trim();
      if (!prop || !value) continue;
      const p = prop.trim();
      const hookDecl = p.match(new RegExp(`^--${prefix}-([a-z-]+)$`));
      const direct = value.match(/^token\("([^"]+)"\)$/);
      if (hookDecl && direct)
        rules.push({ cond, hook: hookDecl[1], token: direct[1] });
      if (hookDecl && value === "transparent")
        rules.push({ cond, hook: hookDecl[1], token: "literal:transparent" });
      for (const m of value.matchAll(
        new RegExp(
          `var\\(--${prefix}-([a-z-]+),\\s*token\\("([^"]+)"\\)\\)`,
          "g",
        ),
      )) {
        if (!base.has(m[1]) || Object.keys(cond).length === 0)
          base.set(`${cond.state ?? "default"}:${m[1]}`, m[2]);
      }
      if (direct && !p.startsWith("--") && Object.keys(cond).length === 0)
        literals.set(p, direct[1]);
    }
  }
  return { base, literals, rules };
}

function effective(binds, cond) {
  const hooks = new Map();
  for (const [k, token] of binds.base) hooks.set(k, token);
  for (const r of binds.rules) {
    const c = r.cond;
    if (c.state) continue;
    const ok =
      (!c.size || c.size === cond.size) &&
      (!c.variant || c.variant === cond.variant) &&
      (!c.style || c.style === cond.style);
    if (ok) hooks.set(`default:${r.hook}`, r.token);
  }
  return hooks;
}

// ---------- our side: scenes ----------
const sizes = ["s", "m", "l", "xl"];
const schemes = ["light", "dark"];
const dir = mkdtempSync(join(tmpdir(), "swc-crosscheck-"));
function scenes(component, combos) {
  const jobs = combos.map((c) => ({
    id: c.id,
    component,
    size: c.size,
    colorScheme: c.scheme,
    states: c.state && c.state !== "default" ? [c.state] : [],
    options: c.options,
    icon: c.icon,
  }));
  writeFileSync(join(dir, `${component}.json`), JSON.stringify(jobs));
  execFileSync(
    cli,
    ["render", "--batch", join(dir, `${component}.json`), "--out", dir],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  return new Map(
    combos.map((c) => [
      c.id,
      JSON.parse(readFileSync(join(dir, `${c.id}.scene.json`), "utf8")),
    ]),
  );
}
function oursTokens(scene) {
  const map = new Map();
  for (const node of scene.nodes) {
    for (const t of node.tokens ?? [])
      map.set(`${node.part}.${t.prop}`, { token: t.token, value: t.value });
    if (node.stroke_width)
      map.set(`${node.part}.strokeWidth*`, {
        token: null,
        value: `${node.stroke_width}px`,
      });
    if (node.fill && !map.has(`${node.part}.fill`))
      map.set(`${node.part}.fill`, { token: null, value: node.fill });
    if (node.stroke && !map.has(`${node.part}.stroke`))
      map.set(`${node.part}.stroke`, { token: null, value: node.stroke });
  }
  return map;
}

// ---------- compare ----------
const findings = [];
function record(component, where, role, swc, ours) {
  const sv = swc?.value == null ? null : norm(swc.value);
  const ov = ours?.value == null ? null : norm(ours.value);
  let status;
  if (!swc && !ours) return;
  if (!swc) status = "ours-only";
  else if (!ours) status = "swc-only";
  else if (sv === ov)
    status =
      swc.token === ours.token ? "same token" : "same value, different token";
  else status = "VALUE DIFFERS";
  findings.push({
    component,
    where,
    role,
    swc: swc && { token: swc.token, value: sv },
    ours: ours && { token: ours.token, value: ov },
    status,
  });
}

function compare(component, file, prefix, spec) {
  const binds = swcBindings(file, prefix);
  const combos = spec.combos;
  const sc = scenes(component, combos);
  for (const c of combos) {
    const ours = oursTokens(sc.get(c.id));
    const hooks = effective(binds, c);
    for (const m of spec.map) {
      if (m.when && !m.when(c)) continue;
      const hookKey = `${m.state ?? c.state ?? "default"}:${m.hook}`;
      const token = m.literal
        ? binds.literals.get(m.literal)
        : (hooks.get(hookKey) ??
          (m.stateless ? hooks.get(`default:${m.hook}`) : undefined));
      const swc = token ? { token, value: swcToken(token, c.scheme) } : null;
      const o = m.ours.map((k) => ours.get(k)).find(Boolean) ?? null;
      record(component, c.label, m.role, swc, o);
    }
  }
}

const baseCombos = (extra) =>
  schemes.flatMap((scheme) =>
    sizes.map((size) => ({
      id: `${extra.name}_${scheme}_${size}`,
      label: `${extra.name} ${size} ${scheme}`,
      size,
      scheme,
      ...extra,
    })),
  );

// Badge: size geometry/type, then variant colors (default size).
const badgeVariants = [
  "neutral",
  "accent",
  "informative",
  "negative",
  "positive",
  "notice",
  "gray",
  "red",
  "orange",
  "yellow",
  "chartreuse",
  "celery",
  "green",
  "seafoam",
];
const badgeCombos = [
  ...baseCombos({
    name: "badge",
    options: { variant: 'neutral', icon: true },
    icon: { set: 'workflow', name: 'add' },
    variant: "neutral",
  }),
  ...badgeVariants.flatMap((variant) =>
    schemes.map((scheme) => ({
      id: `badgev_${variant}_${scheme}`,
      label: `badge variant ${variant} ${scheme}`,
      size: "m",
      scheme,
      options: { variant },
      variant,
    })),
  ),
];
compare("badge", "badge/badge.css", "swc-badge", {
  combos: badgeCombos,
  map: [
    {
      role: "height",
      hook: "height",
      ours: ["container.height"],
      when: (c) => c.id.startsWith("badge_") && c.scheme === "light",
    },
    {
      role: "corner radius",
      hook: "corner-radius",
      ours: ["container.cornerRadius"],
      when: (c) => c.id.startsWith("badge_") && c.scheme === "light",
    },
    {
      role: "gap",
      hook: "gap",
      ours: ["container.gap"],
      when: (c) => c.id.startsWith("badge_") && c.scheme === "light",
    },
    {
      role: "padding inline",
      hook: "padding-inline",
      ours: ["container.paddingInlineStart"],
      when: (c) => c.id.startsWith("badge_") && c.scheme === "light",
    },
    {
      role: "padding block",
      hook: "padding-block",
      ours: ["container.paddingBlock", "container.paddingBlockStart"],
      when: (c) => c.id.startsWith("badge_") && c.scheme === "light",
    },
    {
      role: "font size",
      hook: "font-size",
      ours: ["label.fontSize"],
      when: (c) => c.id.startsWith("badge_") && c.scheme === "light",
    },
    {
      role: "line height",
      hook: "line-height",
      ours: ["label.lineHeight"],
      when: (c) => c.id.startsWith("badge_") && c.scheme === "light",
    },
    {
      role: "icon size",
      hook: "icon-size",
      ours: ["icon.width"],
      when: (c) => c.id.startsWith("badge_") && c.scheme === "light",
    },
    {
      role: "font weight",
      literal: "font-weight",
      ours: ["label.fontWeight"],
      when: (c) => c.id === "badge_light_m",
    },
    {
      role: "background",
      hook: "background-color",
      ours: ["container.fill"],
      when: (c) => c.id.startsWith("badgev_") || c.id.startsWith("badge_"),
    },
    {
      role: "label color",
      hook: "label-icon-color",
      ours: ["label.color"],
      when: (c) => c.id.startsWith("badgev_") || c.id.startsWith("badge_"),
    },
  ],
});

// Button: size geometry, then variant x state colors at size m.
const btnVariants = ["accent", "negative", "primary", "secondary"];
const btnStates = ["default", "hover", "down", "keyboard-focus"];
const swcState = {
  default: "default",
  hover: "hover",
  down: "down",
  "keyboard-focus": "focus",
};
const buttonCombos = [
  ...baseCombos({
    name: "button",
    options: { variant: "accent" },
    icon: { set: 'workflow', name: 'add' },
    variant: "accent",
    style: "fill",
  }),
  ...btnVariants.flatMap((variant) =>
    ["fill", "outline"]
      .filter((style) => style === "fill" || ["primary", "secondary"].includes(variant))
      .flatMap((style) =>
      btnStates.flatMap((state) =>
        schemes.map((scheme) => ({
          id: `buttonv_${variant}_${style}_${state}_${scheme}`,
          label: `button ${variant} ${style} ${state} ${scheme}`,
          size: "m",
          scheme,
          state,
          options: { variant, style },
          variant,
          style,
        })),
      ),
    ),
  ),
];
const isGeom = (c) => c.id.startsWith("button_") && c.scheme === "light";
const buttonMap = [
  {
    role: "height",
    hook: "min-block-size",
    ours: ["container.height"],
    when: isGeom,
  },
  { role: "gap", hook: "gap", ours: ["container.gap"], when: isGeom },
  {
    role: "padding inline (edge to text)",
    hook: "edge-to-text",
    ours: ["container.paddingInlineStart"],
    when: isGeom,
  },
  {
    role: "padding block",
    hook: "padding-vertical",
    ours: ["container.paddingBlock", "container.paddingBlockStart"],
    when: isGeom,
  },
  {
    role: "font size",
    hook: "font-size",
    ours: ["label.fontSize"],
    when: isGeom,
  },
  { role: "icon size", hook: "icon-size", ours: ["icon.width"], when: isGeom },
  {
    role: "font weight",
    literal: "font-weight",
    ours: ["label.fontWeight"],
    when: (c) => c.id === "button_light_m",
  },
  {
    role: "corner radius",
    hook: "border-radius",
    ours: ["container.cornerRadius"],
    when: (c) => c.id === "button_light_m",
  },
];
compare("button", "button/button.css", "swc-button", {
  combos: buttonCombos,
  map: buttonMap,
});

// Button colors: SWC keys state by hook suffix (content-color-default, background-color-hover, ...).
{
  const binds = swcBindings("button/button.css", "swc-button");
  const sc = scenes(
    "button",
    buttonCombos.filter((c) => c.id.startsWith("buttonv_")),
  );
  for (const c of buttonCombos.filter((x) => x.id.startsWith("buttonv_"))) {
    const ours = oursTokens(sc.get(c.id));
    const hooks = new Map();
    for (const [k, token] of binds.base) hooks.set(k.split(":")[1], token);
    for (const r of binds.rules) {
      const rc = r.cond;
      if (rc.state) continue;
      const ok =
        (!rc.variant || rc.variant === c.variant) &&
        (!rc.style || rc.style === c.style) &&
        (!rc.size || rc.size === c.size);
      // A compound outline rule applies only to outline; a bare variant rule only sets fill colors.
      if (ok && (rc.style ? c.style === rc.style : true))
        hooks.set(r.hook, r.token);
    }
    const st = swcState[c.state];
    for (const [role, hook, key] of [
      ["label color", `content-color-${st}`, "label.color"],
      ["background", `background-color-${st}`, "container.fill"],
      ["border color", `border-color-${st}`, "container.stroke"],
    ]) {
      const token = hooks.get(hook);
      const swc = token
        ? { token, value: swcToken(token, c.scheme) }
        : { token: "(transparent)", value: "transparent" };
      record("button", c.label, role, swc, ours.get(key) ?? null);
    }
  }
}

// ---------- report ----------
const byStatus = {};
for (const f of findings)
  (byStatus[`${f.component}: ${f.status}`] ??= []).push(f);
const lines = [];
for (const [k, v] of Object.entries(byStatus).sort())
  lines.push(`${k}: ${v.length}`);
console.log(lines.join("\n"));
writeFileSync(
  process.env.OUT ?? "swc-crosscheck.json",
  JSON.stringify(findings, null, 1),
);
