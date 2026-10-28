// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Dependency-free mirror of sdk/core/src/visual.rs `build_scene` and `scene_to_svg`.
// It renders a recipe compiled by `compile_recipe` (token bindings already resolved to
// ranked candidates), so no token graph or WASM is needed. Keep it in lockstep with the
// Rust renderer; sdk/wasm/test/visual-runtime-parity.test.js enforces that.

const AVG_ADVANCE_EM = 0.46;
const RING_MARGIN = 8;

const isStr = (v) => typeof v === "string";
const toStr = (v) =>
  isStr(v) ? v : typeof v === "number" ? String(v) : undefined;

const num = (r) => {
  if (!r) return undefined;
  let s = r.value.trim();
  while (s.endsWith("px")) s = s.slice(0, -2);
  s = s.trim();
  if (s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const textWidth = (text, fontSize) =>
  [...text].length * fontSize * AVG_ADVANCE_EM;

function makeCtx(compiled, req) {
  const options = { ...compiled.optionDefaults, ...req.options };
  const states = req.states ?? [];
  const mode = req.mode ?? {};
  // An unset `label` option follows the request label: empty means icon-only.
  // The request's size is the `size` option, so conditions can switch on it.
  const option = (name) =>
    name === "size"
      ? req.size
      : (options[name] ??
        (name === "label" ? (req.label ?? "").length > 0 : null));

  const active = [...states];
  if (option("isDisabled") === true) active.push("disabled");
  if (option("isSelected") === true) active.push("selected");
  if (states.length === 0) active.push("default");

  // Number of satisfied conditions, or null when `when` fails.
  const whenScore = (when) => {
    if (!when) return 0;
    let score = 0;
    for (const s of when.states ?? []) {
      if (!states.includes(s)) return null;
      score++;
    }
    for (const [k, want] of Object.entries(when.options ?? {})) {
      const have = option(k);
      // `true` also matches any non-empty string, e.g. an icon name.
      const ok =
        have === want ||
        (have === null && want === false) ||
        (want === true && typeof have === "string" && have !== "");
      if (!ok) return null;
      score++;
    }
    for (const [k, want] of Object.entries(when.modes ?? {})) {
      if (mode[k] !== want) return null;
      score++;
    }
    return score;
  };

  const diags = [];

  // Prefer a candidate whose `state` agrees with the request; otherwise the best fit.
  const pick = (cands) =>
    cands.find(
      (c) => c.states.length > 0 && c.states.every((s) => active.includes(s)),
    ) ?? cands[0];

  const withRel = (r, entry) =>
    r && entry.relativeTo ? { ...r, relativeTo: entry.relativeTo } : r;

  const resolveCands = (entry) => {
    const rec = pick(entry.candidates);
    if (!rec) {
      if (entry.miss) diags.push(entry.miss);
      return undefined;
    }
    if (rec.value === null || rec.value === undefined) return undefined;
    return withRel(
      { value: rec.value, token: rec.token, chain: rec.chain ?? [] },
      entry,
    );
  };

  const evalSource = (source) => {
    if (source === undefined || source === null) return undefined;
    let chosen;
    if (Array.isArray(source)) {
      let best;
      for (const e of source) {
        const sc = whenScore(e.when);
        if (sc === null) continue;
        const rank = [e.priority ?? 0, sc];
        if (
          !best ||
          rank[0] > best.rank[0] ||
          (rank[0] === best.rank[0] && rank[1] >= best.rank[1])
        ) {
          best = { rank, e };
        }
      }
      if (!best) return undefined;
      chosen = best.e;
    } else {
      if (whenScore(source.when) === null) return undefined;
      chosen = source;
    }
    if ("value" in chosen) {
      const v = toStr(chosen.value);
      return v === undefined
        ? undefined
        : withRel({ value: v, token: "", chain: [] }, chosen);
    }
    if (chosen.candidates) return resolveCands(chosen);
    return undefined;
  };

  return {
    visible: (part) => whenScore(part.visibleWhen) !== null,
    evalSource,
    diags,
  };
}

const node = (part, kind, x, y, w, h, extra = {}) => ({
  part,
  kind,
  x,
  y,
  w,
  h,
  fill: null,
  stroke: null,
  stroke_width: 0,
  radius: 0,
  radii: null,
  text: null,
  font_size: 0,
  font_weight: null,
  color: null,
  tokens: [],
  ...extra,
});

/**
 * Lay out a compiled recipe for one request.
 * @param {object} compiled one entry of `data.compiled` from `design-data site`
 * @param {{size, states, options, mode, label}} req
 */
export function renderScene(compiled, req) {
  if (!(req.size in compiled.sizeScale)) {
    throw new Error(`recipe has no sizeScale entry for size '${req.size}'`);
  }
  const mode = req.mode ?? {};
  const key = `${req.size}|${mode.colorScheme ?? ""}|${mode.scale ?? ""}`;
  const parts = compiled.variants[key];
  if (!parts) throw new Error(`recipe was not compiled for '${key}'`);
  const rootId = compiled.root;
  const root = parts[rootId];
  const cx = makeCtx(compiled, req);
  const rp = (part, name) => cx.evalSource(part.props?.[name]);
  const track = (tokens, prop, r) => {
    if (r && r.token)
      tokens.push({
        prop,
        token: r.token,
        value: r.value,
        chain: r.chain ?? [],
      });
  };

  const containerTokens = [];
  const height = rp(root, "height");
  const padS = rp(root, "paddingInlineStart");
  const padE = rp(root, "paddingInlineEnd");
  const gapR = rp(root, "gap");
  const radius = rp(root, "cornerRadius");
  const fill = rp(root, "fill");
  const stroke = rp(root, "stroke");
  const strokeW = rp(root, "strokeWidth");
  const cornerNames = [
    "cornerRadiusStartStart",
    "cornerRadiusStartEnd",
    "cornerRadiusEndEnd",
    "cornerRadiusEndStart",
  ];
  const corners = cornerNames.map((n) => rp(root, n));
  cornerNames.forEach((n, i) => track(containerTokens, n, corners[i]));
  for (const [n, r] of [
    ["stroke", stroke],
    ["strokeWidth", strokeW],
    ["height", height],
    ["paddingInlineStart", padS],
    ["paddingInlineEnd", padE],
    ["gap", gapR],
    ["cornerRadius", radius],
    ["fill", fill],
  ]) {
    track(containerTokens, n, r);
  }
  const h = num(height) ?? 32;
  const pS = num(padS) ?? 0;
  const pE = num(padE) ?? 0;
  const gap = num(gapR) ?? 0;
  const pressDiff = rp(root, "pressDifference");
  const pressRatio = rp(root, "pressWidthRatio");
  const pressMin = rp(root, "pressMinPerspective");
  const pressMax = rp(root, "pressMaxPerspective");
  for (const [n, r] of [
    ["pressDifference", pressDiff],
    ["pressWidthRatio", pressRatio],
    ["pressMinPerspective", pressMin],
    ["pressMaxPerspective", pressMax],
  ]) {
    track(containerTokens, n, r);
  }

  const flow = [];
  const placed = [];
  for (const id of root.children ?? []) {
    const part = parts[id];
    if (!part || !cx.visible(part)) continue;
    if (part.placement) {
      placed.push([id, part]);
      continue;
    }
    const kind = part.kind ?? "box";
    const tokens = [];
    const color = rp(part, "color");
    track(tokens, "color", color);
    const c = {
      id,
      kind,
      w: 0,
      h: 0,
      text: null,
      fontSize: 0,
      fontWeight: null,
      color: color ? color.value : null,
      stroke: null,
      radius: null,
      tokens,
    };
    if (kind === "box") {
      const bw = rp(part, "width");
      const bh = rp(part, "height");
      track(c.tokens, "width", bw);
      track(c.tokens, "height", bh);
      c.w = num(bw) ?? 0;
      c.h = num(bh) ?? 0;
      c.radius = rp(part, "cornerRadius");
      track(c.tokens, "cornerRadius", c.radius);
    } else if (kind === "icon" || kind === "progress") {
      const w = rp(part, "width");
      const ih = rp(part, "height");
      track(c.tokens, "width", w);
      track(c.tokens, "height", ih);
      c.w = num(w) ?? 16;
      c.h = num(ih) ?? c.w;
      if (kind === "progress") {
        const tc = rp(part, "trackColor");
        track(c.tokens, "trackColor", tc);
        c.stroke = tc ? tc.value : null;
      }
    } else if (kind === "text") {
      const fs = rp(part, "fontSize");
      const fw = rp(part, "fontWeight");
      track(c.tokens, "fontSize", fs);
      track(c.tokens, "fontWeight", fw);
      c.fontSize = num(fs) ?? 14;
      c.fontWeight = fw ? fw.value : null;
      c.text = req.label ?? "";
      c.w = textWidth(c.text, c.fontSize);
      c.h = c.fontSize * 1.3;
    }
    flow.push(c);
  }

  const inner =
    flow.reduce((a, c) => a + c.w, 0) + gap * Math.max(flow.length - 1, 0);
  const w = pS + inner + pE;
  const ox = RING_MARGIN;
  const oy = RING_MARGIN;
  const toPx = (r) => {
    const v = num(r);
    return v === undefined
      ? undefined
      : v * (r.relativeTo === "height" ? h : 1);
  };
  const baseRadius = toPx(radius) ?? 0;
  // Logical corners resolve left-to-right: start-start is top-left.
  const [ss, se, ee, es] = corners.map((c) => toPx(c) ?? baseRadius);
  const anyCorner = corners.some((c) => c);
  const mixed = !(ss === se && se === ee && ee === es);
  const radii = anyCorner && mixed ? [ss, se, ee, es] : null;
  const rootRadius = anyCorner && !mixed ? ss : baseRadius;
  const nodes = [
    node(rootId, "box", ox, oy, w, h, {
      fill: fill ? fill.value : null,
      stroke: stroke ? stroke.value : null,
      stroke_width: num(strokeW) ?? 0,
      radius: rootRadius,
      radii,
      tokens: containerTokens,
    }),
  ];

  const px = (r, basis) => {
    const v = num(r);
    return v === undefined ? 0 : v * (r.relativeTo === "height" ? basis : 1);
  };
  let x = ox + pS;
  for (const c of flow) {
    const cx0 = x;
    const cy0 = oy + (h - c.h) / 2;
    nodes.push(
      node(c.id, c.kind, cx0, cy0, c.w, c.h, {
        stroke: c.stroke,
        radius: c.kind === "box" ? px(c.radius, c.h) : 0,
        text: c.text,
        font_size: c.fontSize,
        font_weight: c.fontWeight,
        color: c.color,
        tokens: c.tokens,
      }),
    );
    x += c.w + gap;

    // A box's children sit inside it: centered across, and at the start, center or end
    // along the inline axis. The inset equals the cross-axis gap.
    for (const nid of parts[c.id].children ?? []) {
      const np = parts[nid];
      if (!np || !cx.visible(np)) continue;
      const tokens = [];
      const nw = rp(np, "width");
      const nh = rp(np, "height");
      if (np.kind === "icon") {
        const color = rp(np, "color");
        track(tokens, "width", nw);
        track(tokens, "height", nh);
        track(tokens, "color", color);
        const w2 = num(nw) ?? c.w;
        const h2 = num(nh) ?? w2;
        const extra = {
          color: color ? color.value : null,
          tokens,
        };
        if (np.glyph) extra.glyph = np.glyph;
        nodes.push(
          node(
            nid,
            "icon",
            cx0 + (c.w - w2) / 2,
            cy0 + (c.h - h2) / 2,
            w2,
            h2,
            extra,
          ),
        );
        continue;
      }
      const nfill = rp(np, "fill");
      const nstroke = rp(np, "stroke");
      const nsw = rp(np, "strokeWidth");
      const nradius = rp(np, "cornerRadius");
      const justify = rp(np, "justify");
      for (const [n, r] of [
        ["width", nw],
        ["height", nh],
        ["fill", nfill],
        ["stroke", nstroke],
        ["strokeWidth", nsw],
        ["cornerRadius", nradius],
        ["justify", justify],
      ]) {
        track(tokens, n, r);
      }
      const w2 = num(nw) ?? c.w;
      const h2 = num(nh) ?? c.h;
      const inset = (c.h - h2) / 2;
      const nx =
        justify?.value === "end"
          ? cx0 + c.w - w2 - inset
          : justify?.value === "center"
            ? cx0 + (c.w - w2) / 2
            : cx0 + inset;
      nodes.push(
        node(nid, "box", nx, cy0 + inset, w2, h2, {
          fill: nfill ? nfill.value : null,
          stroke: nstroke ? nstroke.value : null,
          stroke_width: num(nsw) ?? 0,
          radius: px(nradius, h2),
          tokens,
        }),
      );
    }
  }

  for (const [id, part] of placed) {
    const inset = num(cx.evalSource(part.placement.inset)) ?? 0;
    const size = 6;
    const color = rp(part, "color");
    const tokens = [];
    track(tokens, "color", color);
    nodes.push(
      node(
        id,
        "icon",
        ox + w - inset - size,
        oy + h - inset - size,
        size,
        size,
        { color: color ? color.value : null, tokens },
      ),
    );
  }

  for (const [id, part] of Object.entries(parts)) {
    if (part.kind !== "ring" || !cx.visible(part)) continue;
    const stroke = rp(part, "stroke");
    const sw = rp(part, "strokeWidth");
    const gp = rp(part, "gapToParent");
    const tokens = [];
    track(tokens, "stroke", stroke);
    track(tokens, "strokeWidth", sw);
    track(tokens, "gapToParent", gp);
    const swN = num(sw) ?? 2;
    const off = (num(gp) ?? 2) + swN / 2;
    const t = nodes.find((n) => n.part === part.around) ?? nodes[0];
    nodes.push(
      node(id, "ring", t.x - off, t.y - off, t.w + 2 * off, t.h + 2 * off, {
        stroke: stroke ? stroke.value : null,
        stroke_width: swN,
        radius: t.radius + off,
        tokens,
      }),
    );
  }

  // Pressed scale-down: CSS perspective(p) translateZ(z) scales by p / (p - z).
  let press = null;
  const z = num(pressDiff);
  const ratio = num(pressRatio);
  if (z !== undefined && ratio !== undefined) {
    const lo = num(pressMin) ?? 0;
    const hi = num(pressMax) ?? Number.MAX_VALUE;
    const part = root.pressTarget ?? null;
    const t = nodes.find((n) => n.part === part) ?? nodes[0];
    const p = Math.min(Math.max(t.w * ratio, lo), hi);
    press = {
      part,
      scale: p / (p - z),
      cx: t.x + t.w / 2,
      cy: t.y + t.h / 2,
    };
  }

  return {
    component: compiled.component,
    width: w + 2 * RING_MARGIN,
    height: h + 2 * RING_MARGIN,
    press,
    nodes,
    diagnostics: cx.diags,
  };
}

export const roundedPath = (x, y, w, h, [tl, tr, br, bl]) =>
  `M${x + tl} ${y}H${x + w - tr}A${tr} ${tr} 0 0 1 ${x + w} ${y + tr}V${y + h - br}A${br} ${br} 0 0 1 ${x + w - br} ${y + h}H${x + bl}A${bl} ${bl} 0 0 1 ${x} ${y + h - bl}V${y + tl}A${tl} ${tl} 0 0 1 ${x + tl} ${y}Z`;

const WEIGHTS = {
  thin: "100",
  "extra-light": "200",
  "ultra-light": "200",
  light: "300",
  regular: "400",
  normal: "400",
  medium: "500",
  "semi-bold": "600",
  semibold: "600",
  bold: "700",
  "extra-bold": "800",
  "ultra-bold": "800",
  black: "900",
  heavy: "900",
};

export const cssFontWeight = (w) => WEIGHTS[w ?? "400"] ?? w ?? "400";

const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");

/** Serialize a scene as SVG, matching `scene_to_svg` in Rust. */
export function renderSvg(scene) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">`;
  const p = scene.press;
  const pressOpen = p
    ? `<g transform="translate(${p.cx} ${p.cy}) scale(${p.scale}) translate(${-p.cx} ${-p.cy})">`
    : "";
  if (p && !p.part) s += pressOpen;
  for (const n of scene.nodes) {
    const pressed = p && p.part === n.part;
    if (pressed) s += pressOpen;
    const toks = n.tokens.map((t) => `${t.prop}=${t.token}`).join(";");
    const attrs = `data-part="${esc(n.part)}" data-tokens="${esc(toks)}"`;
    const min = Math.min(n.w, n.h);
    if (n.kind === "box") {
      s += n.radii
        ? `<path ${attrs} d="${roundedPath(n.x, n.y, n.w, n.h, n.radii)}" fill="${esc(n.fill ?? "none")}"/>`
        : `<rect ${attrs} x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.radius}" fill="${esc(n.fill ?? "none")}"/>`;
      if (n.stroke && n.stroke_width > 0) {
        const i = n.stroke_width / 2;
        if (n.radii) {
          const r = n.radii.map((v) => Math.max(v - i, 0));
          s += `<path d="${roundedPath(n.x + i, n.y + i, n.w - n.stroke_width, n.h - n.stroke_width, r)}" fill="none" stroke="${esc(n.stroke)}" stroke-width="${n.stroke_width}"/>`;
        } else
          s += `<rect x="${n.x + i}" y="${n.y + i}" width="${n.w - n.stroke_width}" height="${n.h - n.stroke_width}" rx="${Math.max(n.radius - i, 0)}" fill="none" stroke="${esc(n.stroke)}" stroke-width="${n.stroke_width}"/>`;
      }
    } else if (n.kind === "ring") {
      s += `<rect ${attrs} x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.radius}" fill="none" stroke="${esc(n.stroke ?? "none")}" stroke-width="${n.stroke_width}"/>`;
    } else if (n.kind === "text") {
      s += `<text ${attrs} x="${n.x}" y="${n.y + n.h / 2}" font-family="adobe-clean-spectrum-vf, Adobe Clean, Source Sans 3, sans-serif" font-size="${n.font_size}" font-weight="${esc(cssFontWeight(n.font_weight))}" dominant-baseline="central" fill="${esc(n.color ?? "currentColor")}">${esc(n.text ?? "")}</text>`;
    } else if (n.kind === "progress") {
      const cx = n.x + n.w / 2;
      const cy = n.y + n.h / 2;
      const r = min / 2 - min / 18;
      const sw = Math.max(min / 9, 1);
      s += `<g ${attrs} fill="none" stroke-width="${sw}"><circle cx="${cx}" cy="${cy}" r="${r}" stroke="${esc(n.stroke ?? "none")}"/><path d="M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx + r} ${cy}" stroke="${esc(n.color ?? "currentColor")}" stroke-linecap="round"/></g>`;
    } else if (
      n.kind === "icon" &&
      (n.glyph === "checkmark" || n.glyph === "dash")
    ) {
      const color = esc(n.color ?? "currentColor");
      if (n.glyph === "dash") {
        s += `<rect ${attrs} x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.h / 2}" fill="${color}"/>`;
      } else {
        s += `<path ${attrs} d="M${n.x + n.w * 0.1} ${n.y + n.h * 0.55}L${n.x + n.w * 0.38} ${n.y + n.h * 0.82}L${n.x + n.w * 0.9} ${n.y + n.h * 0.2}" stroke="${color}" stroke-width="${Math.max(n.w * 0.16, 1)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      }
    } else if (n.kind === "icon") {
      const cx = n.x + n.w / 2;
      const cy = n.y + n.h / 2;
      const r = min * 0.35;
      s += `<path ${attrs} d="M${cx - r} ${cy}H${cx + r}M${cx} ${cy - r}V${cy + r}" stroke="${esc(n.color ?? "currentColor")}" stroke-width="${Math.max(n.w / 10, 1)}" stroke-linecap="round" fill="none"/>`;
    }
    if (pressed) s += "</g>";
  }
  return `${s}${p && !p.part ? "</g>" : ""}</svg>`;
}
