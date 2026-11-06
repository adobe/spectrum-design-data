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

// A corner radius cannot exceed half the box's width or height, like CSS `border-radius`.
const clampRadius = (r, w, h) => Math.min(r, w / 2, h / 2);

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

// A `px` value is the line box height; a bare number multiplies the font size. Unbound: 1.3.
const lineHeight = (r, fontSize) => {
  const n = num(r);
  if (n === undefined) return fontSize * 1.3;
  return r.value.trim().endsWith("px") ? n : n * fontSize;
};

// A root layout keyword: the first allowed value is the default when unbound, `center` for
// `align` and `justify`. Any other value is a diagnostic.
const layoutKeyword = (cx, name, r, allowed) => {
  const fallback = name === "direction" ? allowed[0] : "center";
  if (!r) return fallback;
  const v = r.value.trim();
  if (allowed.includes(v)) return v;
  cx.diags.push(`${name} '${v}' is not one of ${allowed.join(", ")}`);
  return fallback;
};

// Offset of a box inside `free` space along an axis for start, center or end.
const axisOffset = (mode, free) =>
  mode === "start" ? 0 : mode === "end" ? free : free / 2;

const textWidth = (text, fontSize) =>
  [...text].length * fontSize * AVG_ADVANCE_EM;

// `true` also matches any non-empty string, e.g. an icon name; an unset option
// matches `false`.
const matches = (have) => (want) =>
  have === want ||
  (have === null && want === false) ||
  (want === true && typeof have === "string" && have !== "");

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
      const ok = (Array.isArray(want) ? want : [want]).some(matches(have));
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

  // Keep the relationships whose pinned options match the request, preferring the ones that
  // pin the most options. A candidate with no `options` is the default: used only when no
  // more specific one matches. Mirrors `select_by_options` in Rust.
  const selectByOptions = (cands) => {
    const scored = [];
    for (const c of cands) {
      const score = c.options ? whenScore({ options: c.options }) : 0;
      if (score !== null) scored.push([score, c]);
    }
    const best = Math.max(0, ...scored.map(([score]) => score));
    return scored.filter(([score]) => score === best).map(([, c]) => c);
  };

  const withRel = (r, entry) =>
    r && entry.relativeTo ? { ...r, relativeTo: entry.relativeTo } : r;

  const resolveCands = (entry) => {
    const rec = pick(selectByOptions(entry.candidates));
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
    // `icon: "none"` removes an optional content icon like a failed `visibleWhen`.
    visible: (part) =>
      !(req.icon === "none" && part.icon?.content && part.icon?.optional) &&
      whenScore(part.visibleWhen) !== null,
    option,
    shownByRecipe: (part) => whenScore(part.visibleWhen) !== null,
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
 * @param {{size, states, options, mode, label, icon}} req `icon` is `"none"` or `{set, name}`
 * @param {object} [icons] drawings (`{viewBox, paths}`) by `set:name` for a `req.icon` to
 *   draw, such as `data.icons`; an icon not in it draws the placeholder
 */
export function renderScene(compiled, req, icons = {}) {
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
  const padBS = rp(root, "paddingBlockStart");
  const padBE = rp(root, "paddingBlockEnd");
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
    ["paddingBlockStart", padBS],
    ["paddingBlockEnd", padBE],
    ["gap", gapR],
    ["cornerRadius", radius],
    ["fill", fill],
  ]) {
    track(containerTokens, n, r);
  }
  const pBS = num(padBS) ?? 0;
  const pBE = num(padBE) ?? 0;
  const pS = num(padS) ?? 0;
  const pE = num(padE) ?? 0;
  const gap = num(gapR) ?? 0;
  const pressDiff = rp(root, "pressDifference");
  const pressRatio = rp(root, "pressWidthRatio");
  const pressMin = rp(root, "pressMinPerspective");
  const pressMax = rp(root, "pressMaxPerspective");
  const opacityR = rp(root, "opacity");
  const column =
    layoutKeyword(cx, "direction", rp(root, "direction"), ["row", "column"]) ===
    "column";
  const align = layoutKeyword(cx, "align", rp(root, "align"), [
    "start",
    "center",
    "end",
  ]);
  const justify = layoutKeyword(cx, "justify", rp(root, "justify"), [
    "start",
    "center",
    "end",
  ]);
  for (const [n, r] of [
    ["pressDifference", pressDiff],
    ["pressWidthRatio", pressRatio],
    ["pressMinPerspective", pressMin],
    ["pressMaxPerspective", pressMax],
    ["opacity", opacityR],
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
      fill: null,
      strokeWidth: 0,
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
      // A flowed box paints itself and hosts its children, like a nested box.
      const bfill = rp(part, "fill");
      const bstroke = rp(part, "stroke");
      const bsw = rp(part, "strokeWidth");
      track(c.tokens, "fill", bfill);
      track(c.tokens, "stroke", bstroke);
      track(c.tokens, "strokeWidth", bsw);
      c.fill = bfill ? bfill.value : null;
      c.stroke = bstroke ? bstroke.value : null;
      c.strokeWidth = num(bsw) ?? 0;
      const pads = [
        "paddingInlineStart",
        "paddingInlineEnd",
        "paddingBlockStart",
        "paddingBlockEnd",
      ].map((n) => {
        const r = rp(part, n);
        track(c.tokens, n, r);
        return num(r) ?? 0;
      });
      const rdir = rp(part, "direction");
      if (!rdir) {
        if (!bh) c.h = pads[2] + pads[3];
      } else {
        layoutKeyword(cx, "direction", rdir, ["row"]);
        const ralign = layoutKeyword(cx, "align", rp(part, "align"), [
          "start",
          "center",
          "end",
        ]);
        const rgapR = rp(part, "gap");
        track(c.tokens, "gap", rgapR);
        const rgap = num(rgapR) ?? 0;
        const items = [];
        for (const nid of part.children ?? []) {
          const np = parts[nid];
          if (!np || !cx.visible(np)) continue;
          const nkind = np.kind ?? "box";
          const ntokens = [];
          const nw = rp(np, "width");
          const nh = rp(np, "height");
          const ncolor = rp(np, "color");
          track(ntokens, "width", nw);
          track(ntokens, "height", nh);
          track(ntokens, "color", ncolor);
          const extra = { color: ncolor ? ncolor.value : null };
          let w2 = 0;
          let h2 = 0;
          let ow;
          let oh;
          let ox = 0;
          let oy = 0;
          if (nkind === "icon") {
            w2 = num(nw) ?? 16;
            h2 = num(nh) ?? w2;
            const rot = rp(np, "rotation");
            track(ntokens, "rotation", rot);
            if (num(rot) !== undefined) extra.rotation = num(rot);
            ow = w2;
            oh = h2;
          } else if (nkind === "text") {
            const fs = rp(np, "fontSize");
            const fw = rp(np, "fontWeight");
            const ff = rp(np, "fontFamily");
            const lh = rp(np, "lineHeight");
            track(ntokens, "fontSize", fs);
            track(ntokens, "fontWeight", fw);
            track(ntokens, "fontFamily", ff);
            track(ntokens, "lineHeight", lh);
            const tp = [
              "paddingInlineStart",
              "paddingInlineEnd",
              "paddingBlockStart",
              "paddingBlockEnd",
            ].map((n) => {
              const r = rp(np, n);
              track(ntokens, n, r);
              return num(r) ?? 0;
            });
            extra.font_size = num(fs) ?? 14;
            extra.font_weight = fw ? fw.value : null;
            if (ff) extra.font_family = ff.value;
            extra.text = req.label ?? "";
            w2 = textWidth(extra.text, extra.font_size);
            h2 = lineHeight(lh, extra.font_size);
            ow = w2 + tp[0] + tp[1];
            oh = h2 + tp[2] + tp[3];
            ox = tp[0];
            oy = tp[2];
          } else {
            const nfill = rp(np, "fill");
            const nstroke = rp(np, "stroke");
            const nsw = rp(np, "strokeWidth");
            const nr = rp(np, "cornerRadius");
            for (const [n, r] of [
              ["fill", nfill],
              ["stroke", nstroke],
              ["strokeWidth", nsw],
              ["cornerRadius", nr],
            ]) {
              track(ntokens, n, r);
            }
            w2 = num(nw) ?? 0;
            h2 = num(nh) ?? 0;
            extra.fill = nfill ? nfill.value : null;
            extra.stroke = nstroke ? nstroke.value : null;
            extra.stroke_width = num(nsw) ?? 0;
            extra.radius = clampRadius(
              num(nr) === undefined
                ? 0
                : num(nr) * (nr.relativeTo === "height" ? h2 : 1),
              w2,
              h2,
            );
            ow = w2;
            oh = h2;
          }
          items.push({
            node: node(nid, nkind, 0, 0, w2, h2, { ...extra, tokens: ntokens }),
            ow,
            oh,
            ox,
            oy,
          });
        }
        const sum =
          items.reduce((a, i) => a + i.ow, 0) +
          rgap * Math.max(items.length - 1, 0);
        const tall = Math.max(0, ...items.map((i) => i.oh));
        if (!bw) c.w = pads[0] + sum + pads[1];
        if (!bh) c.h = tall + pads[2] + pads[3];
        c.row = {
          items,
          align: ralign,
          gap: rgap,
          padS: pads[0],
          padBS: pads[2],
          padBE: pads[3],
        };
      }
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
      const ff = rp(part, "fontFamily");
      const lh = rp(part, "lineHeight");
      track(c.tokens, "fontFamily", ff);
      track(c.tokens, "lineHeight", lh);
      c.fontFamily = ff ? ff.value : null;
      c.fontSize = num(fs) ?? 14;
      c.fontWeight = fw ? fw.value : null;
      c.text = req.label ?? "";
      c.w = textWidth(c.text, c.fontSize);
      if (lh && num(lh) === undefined)
        cx.diags.push(
          `lineHeight '${lh.value}' is not a number or px value; using 1.3 x font size`,
        );
      c.h = lineHeight(lh, c.fontSize);
    }
    flow.push(c);
  }

  // As in Figma, an icon taller than the label line adds only the line height to the row,
  // so the icon overflows the content box evenly instead of growing the container.
  const line = Math.max(
    0,
    ...flow.filter((c) => c.kind === "text").map((c) => c.h),
  );
  const gaps = gap * Math.max(flow.length - 1, 0);
  const widest = Math.max(0, ...flow.map((c) => c.w));
  const tallest = Math.max(
    0,
    ...flow.map((c) =>
      c.kind === "icon" && line > 0 ? Math.min(c.h, line) : c.h,
    ),
  );
  const sumW = flow.reduce((a, c) => a + c.w, 0) + gaps;
  const sumH = flow.reduce((a, c) => a + c.h, 0) + gaps;
  const w = pS + (column ? widest : sumW) + pE;
  // An unset `height` is the content plus the block padding: the tallest flowed child in a
  // row (only when the recipe binds block padding; otherwise the 32 default), or the
  // stacked children in a column.
  const h =
    num(height) ??
    (column ? sumH + pBS + pBE : padBS || padBE ? tallest + pBS + pBE : 32);
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
  const rootRadius = clampRadius(
    anyCorner && !mixed ? ss : baseRadius,
    radii ? Infinity : w,
    radii ? Infinity : h,
  );
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
  const x = ox + pS;
  let main = column ? oy + pBS + axisOffset(justify, h - pBS - pBE - sumH) : x;
  for (const c of flow) {
    // A column stretches a box that has no width of its own across its inner width.
    const cw = column && c.kind === "box" && c.w === 0 ? w - pS - pE : c.w;
    const cx0 = column ? x + axisOffset(align, w - pS - pE - cw) : main;
    const cy0 = column
      ? main
      : oy + pBS + axisOffset(align, h - pBS - pBE - c.h);
    nodes.push(
      node(c.id, c.kind, cx0, cy0, cw, c.h, {
        fill: c.fill,
        stroke: c.stroke,
        stroke_width: c.strokeWidth,
        radius: c.kind === "box" ? clampRadius(px(c.radius, c.h), cw, c.h) : 0,
        text: c.text,
        font_size: c.fontSize,
        font_weight: c.fontWeight,
        ...(c.fontFamily ? { font_family: c.fontFamily } : {}),
        color: c.color,
        tokens: c.tokens,
      }),
    );
    main += (column ? c.h : cw) + gap;

    if (c.row) {
      const r = c.row;
      const innerH = c.h - r.padBS - r.padBE;
      let rx = cx0 + r.padS;
      for (const it of r.items) {
        it.node.x = rx + it.ox;
        it.node.y = cy0 + r.padBS + axisOffset(r.align, innerH - it.oh) + it.oy;
        rx += it.ow + r.gap;
        nodes.push(it.node);
      }
      continue;
    }

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
        const rot = rp(np, "rotation");
        track(tokens, "width", nw);
        track(tokens, "height", nh);
        track(tokens, "color", color);
        track(tokens, "rotation", rot);
        const w2 = num(nw) ?? cw;
        const h2 = num(nh) ?? w2;
        const extra = {
          color: color ? color.value : null,
          tokens,
        };
        if (num(rot) !== undefined) extra.rotation = num(rot);
        nodes.push(
          node(
            nid,
            "icon",
            cx0 + (cw - w2) / 2,
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
      const w2 = num(nw) ?? cw;
      const h2 = num(nh) ?? c.h;
      const inset = (c.h - h2) / 2;
      const nx =
        justify?.value === "end"
          ? cx0 + cw - w2 - inset
          : justify?.value === "center"
            ? cx0 + (cw - w2) / 2
            : cx0 + inset;
      nodes.push(
        node(nid, "box", nx, cy0 + inset, w2, h2, {
          fill: nfill ? nfill.value : null,
          stroke: nstroke ? nstroke.value : null,
          stroke_width: num(nsw) ?? 0,
          radius: clampRadius(px(nradius, h2), w2, h2),
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
    // Parts nested inside the target, at any depth, scale together with it.
    const nested = [];
    const collect = (id) => {
      for (const kid of parts[id]?.children ?? []) {
        if (!nested.includes(kid)) {
          nested.push(kid);
          collect(kid);
        }
      }
    };
    if (part) collect(part);
    press = {
      part,
      ...(nested.length ? { nested } : {}),
      scale: p / (p - z),
      cx: t.x + t.w / 2,
      cy: t.y + t.h / 2,
    };
  }

  if (
    req.icon === "none" &&
    cx.option("isLabelHidden") === true &&
    Object.values(parts).some(
      (p) => p.icon?.content && p.icon?.optional && cx.shownByRecipe(p),
    )
  )
    cx.diags.push(
      "icon none with isLabelHidden leaves the component with nothing to draw",
    );

  // Every icon node names the icon its part references and carries its compiled drawing.
  for (const n of nodes) {
    const part = n.kind === "icon" ? parts[n.part] : undefined;
    if (!part) continue;
    if (req.icon === "none" && part.icon?.content && !part.icon.optional) {
      cx.diags.push(
        `icon none is not allowed on part '${n.part}' (its icon is not optional); keeping the recipe's icon`,
      );
    }
    const pick = part.icon?.content && req.icon?.set ? req.icon : undefined;
    const ref = pick ?? part.icon;
    if (ref?.set && ref?.name) {
      n.icon = { set: ref.set, name: ref.name };
      const drawing = pick
        ? icons[`${ref.set}:${ref.name}`]
        : compiled.drawings?.[part.drawing];
      if (drawing) n.icon.drawing = drawing;
      else if (pick)
        cx.diags.push(
          `icon ${ref.set}:${ref.name} has no drawing for size '${req.size}'; drawing a placeholder`,
        );
    }
    if (!pick && part.drawingMiss) cx.diags.push(part.drawingMiss);
  }

  const opacity = num(opacityR);
  return {
    component: compiled.component,
    width: w + 2 * RING_MARGIN,
    height: h + 2 * RING_MARGIN,
    press,
    ...(opacity !== undefined ? { opacity } : {}),
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

const DEFAULT_FONT_STACK =
  "adobe-clean-spectrum-vf, Adobe Clean, 'Source Sans 3', sans-serif";

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
]);

// Mirror of css_font_family in sdk/core/src/visual.rs: every bound family is quoted unless
// it is a generic keyword, since an unquoted name such as `Source Sans 3` is invalid CSS.
const cssFamilyName = (f) => {
  const t = f.replace(/^['"]+|['"]+$/g, "").trim();
  return GENERIC_FAMILIES.has(t)
    ? t
    : `'${t.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
};

const cssFontFamily = (f) => {
  const bound = (f ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map(cssFamilyName);
  return bound.length
    ? `${bound.join(", ")}, ${DEFAULT_FONT_STACK}`
    : DEFAULT_FONT_STACK;
};

export const cssFontWeight = (w) => WEIGHTS[w ?? "400"] ?? w ?? "400";

const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");

/**
 * Uniform scale `k` and offset that fit an icon `viewBox` into the box `x, y, w, h`,
 * centered, for `translate(tx ty) scale(k)`. Mirrors `icon_fit` in Rust.
 */
export function iconFit(viewBox, x, y, w, h) {
  const v = String(viewBox)
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (v.length !== 4 || v.some((n) => Number.isNaN(n))) return undefined;
  const [vx, vy, vw, vh] = v;
  if (!(vw > 0 && vh > 0)) return undefined;
  const k = Math.min(w / vw, h / vh);
  return {
    k,
    tx: x + (w - vw * k) / 2 - vx * k,
    ty: y + (h - vh * k) / 2 - vy * k,
  };
}

/**
 * An icon node's drawing, or undefined without one: a group with the part attributes and
 * rotation, an unfilled rect of the part box, and the fitted paths in the node color.
 * Mirrors `icon_svg` in Rust.
 */
export function iconSvg(n, attrs = "") {
  const drawing = n.icon?.drawing;
  const fit = drawing && iconFit(drawing.viewBox, n.x, n.y, n.w, n.h);
  if (!fit || !Array.isArray(drawing.paths)) return undefined;
  const color = esc(n.color ?? "currentColor");
  const rot = n.rotation
    ? ` transform="rotate(${n.rotation} ${n.x + n.w / 2} ${n.y + n.h / 2})"`
    : "";
  const paths = drawing.paths
    .map(
      (p) =>
        `<path d="${esc(p.d ?? "")}" fill="${color}"${p.fillRule ? ` fill-rule="${esc(p.fillRule)}"` : ""}/>`,
    )
    .join("");
  return `<g ${attrs}${rot}><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="none"/><g transform="translate(${fit.tx} ${fit.ty}) scale(${fit.k})">${paths}</g></g>`;
}

// A plus sized to the part box, drawn for an icon with no drawing.
const placeholderSvg = (n, attrs) => {
  const cx = n.x + n.w / 2;
  const cy = n.y + n.h / 2;
  const r = Math.min(n.w, n.h) * 0.35;
  return `<path ${attrs} d="M${cx - r} ${cy}H${cx + r}M${cx} ${cy - r}V${cy + r}" stroke="${esc(n.color ?? "currentColor")}" stroke-width="${Math.max(n.w / 10, 1)}" stroke-linecap="round" fill="none"/>`;
};

/** Serialize a scene as SVG, matching `scene_to_svg` in Rust. */
export function renderSvg(scene) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">`;
  const dim = scene.opacity !== undefined;
  if (dim) s += `<g opacity="${scene.opacity}">`;
  const p = scene.press;
  const pressOpen = p
    ? `<g transform="translate(${p.cx} ${p.cy}) scale(${p.scale}) translate(${-p.cx} ${-p.cy})">`
    : "";
  if (p && !p.part) s += pressOpen;
  // The scaled group wraps the target node and the nodes nested in it, which follow it.
  let spanStart = -1;
  let spanEnd = -1;
  if (p?.part) {
    spanStart = scene.nodes.findIndex((n) => n.part === p.part);
    if (spanStart >= 0) {
      spanEnd = spanStart;
      while (
        spanEnd + 1 < scene.nodes.length &&
        (p.nested ?? []).includes(scene.nodes[spanEnd + 1].part)
      ) {
        spanEnd += 1;
      }
    }
  }
  for (const [i, n] of scene.nodes.entries()) {
    if (i === spanStart) s += pressOpen;
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
      s += `<text ${attrs} x="${n.x}" y="${n.y + n.h / 2}" font-family="${esc(cssFontFamily(n.font_family))}" font-size="${n.font_size}" font-weight="${esc(cssFontWeight(n.font_weight))}" dominant-baseline="central" fill="${esc(n.color ?? "currentColor")}">${esc(n.text ?? "")}</text>`;
    } else if (n.kind === "progress") {
      const cx = n.x + n.w / 2;
      const cy = n.y + n.h / 2;
      const r = min / 2 - min / 18;
      const sw = Math.max(min / 9, 1);
      s += `<g ${attrs} fill="none" stroke-width="${sw}"><circle cx="${cx}" cy="${cy}" r="${r}" stroke="${esc(n.stroke ?? "none")}"/><path d="M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx + r} ${cy}" stroke="${esc(n.color ?? "currentColor")}" stroke-linecap="round"/></g>`;
    } else if (n.kind === "icon") {
      s += iconSvg(n, attrs) ?? placeholderSvg(n, attrs);
    }
    if (i === spanEnd) s += "</g>";
  }
  return `${s}${p && !p.part ? "</g>" : ""}${dim ? "</g>" : ""}</svg>`;
}
