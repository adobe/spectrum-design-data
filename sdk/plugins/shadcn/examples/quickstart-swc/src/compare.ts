// Copyright 2026 Adobe. All rights reserved.
// Compares --swc-<name> (SWC tokens.css) with --spectrum-<name> (our shadcn theme) as computed values.
import "@adobe/spectrum-wc/tokens.css";
import "@adobe/spectrum-wc/swc.css";
import "./theme-only.css";

const SYNTAXES = [
  ["<color>", "rgba(1, 2, 3, 0.5)"],
  ["<length>", "12345px"],
  ["<number>", "12345"],
] as const;

let seq = 0;
function resolve(expr: string): string | null {
  for (const [syntax, initial] of SYNTAXES) {
    const prop = `--cmp-${seq++}`;
    CSS.registerProperty({
      name: prop,
      syntax,
      inherits: false,
      initialValue: initial,
    });
    const el = document.createElement("div");
    el.style.setProperty(prop, expr);
    document.body.append(el);
    const value = getComputedStyle(el).getPropertyValue(prop).trim();
    el.remove();
    const sentinel = new RegExp(`^${initial.replace(/[().]/g, "\\$&")}$`);
    if (value && !sentinel.test(value)) return value.replace(/\s+/g, "");
    if (value && sentinel.test(value) && expr.includes(initial)) return value;
  }
  return null;
}

const names: string[] = await (await fetch("/names.json")).json();
const out: Record<string, unknown> = {};
for (const scheme of ["light", "dark"] as const) {
  document.documentElement.classList.toggle("dark", scheme === "dark");
  document.documentElement.style.colorScheme = scheme;
  const rows = names.map((name) => ({
    name,
    swc: resolve(`var(--swc-${name})`),
    ours: resolve(`var(--spectrum-${name})`),
  }));
  out[scheme] = rows;
}
(window as unknown as { __cmp: unknown }).__cmp = out;
document.getElementById("out")!.textContent = "done";
