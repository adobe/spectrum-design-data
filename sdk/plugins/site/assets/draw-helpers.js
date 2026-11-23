// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Drawing helpers the explorer uses to paint scenes from the slim WASM engine. Layout lives in Rust.

export const roundedPath = (x, y, w, h, [tl, tr, br, bl]) =>
  `M${x + tl} ${y}H${x + w - tr}A${tr} ${tr} 0 0 1 ${x + w} ${y + tr}V${y + h - br}A${br} ${br} 0 0 1 ${x + w - br} ${y + h}H${x + bl}A${bl} ${bl} 0 0 1 ${x} ${y + h - bl}V${y + tl}A${tl} ${tl} 0 0 1 ${x + tl} ${y}Z`;

/**
 * A `box` node: the fill at the node's bounds, then the border drawn inside them (the stroke
 * is centered on a rect inset by half its width), as `design-data render` does.
 */
export function boxSvg(n, so = "") {
  const fill = n.fill ?? "none";
  const sw = n.stroke_width;
  const i = sw / 2;
  const border = n.stroke && sw > 0;
  if (n.radii) {
    return `<path d="${roundedPath(n.x, n.y, n.w, n.h, n.radii)}" fill="${fill}"/>${
      border
        ? `<path d="${roundedPath(
            n.x + i,
            n.y + i,
            n.w - sw,
            n.h - sw,
            n.radii.map((v) => Math.max(v - i, 0)),
          )}" fill="none" stroke="${n.stroke}" stroke-width="${sw}"${so}/>`
        : ""
    }`;
  }
  return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.radius}" fill="${fill}"/>${border ? `<rect x="${n.x + i}" y="${n.y + i}" width="${n.w - sw}" height="${n.h - sw}" rx="${Math.max(n.radius - i, 0)}" fill="none" stroke="${n.stroke}" stroke-width="${sw}"${so}/>` : ""}`;
}

/**
 * A `progress` node: a track ring and an arc on the same circle. The stroke is the bound
 * thickness (a ninth of the diameter when unbound) and sits inside the node's bounds; an unset
 * `sweep` is the spinner's quarter arc.
 */
export function progressSvg(n) {
  const side = Math.min(n.w, n.h);
  const sw = n.stroke_width > 0 ? n.stroke_width : Math.max(side / 9, 1);
  const cx = n.x + n.w / 2;
  const cy = n.y + n.h / 2;
  const r = side / 2 - sw / 2;
  const sweep = n.sweep ?? 0.25;
  const end = sweep * 2 * Math.PI;
  const round = (v) => Math.round(v * 1e6) / 1e6;
  let arc = "";
  if (sweep >= 1)
    arc = `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${n.color}"/>`;
  else if (sweep > 0) {
    const ex = n.sweep === undefined ? cx + r : round(cx + r * Math.sin(end));
    const ey = n.sweep === undefined ? cy : round(cy - r * Math.cos(end));
    arc = `<path d="M${cx} ${cy - r}A${r} ${r} 0 ${sweep > 0.5 ? 1 : 0} 1 ${ex} ${ey}" stroke="${n.color}" stroke-linecap="round"/>`;
  }
  return `<g fill="none" stroke-width="${sw}"><circle cx="${cx}" cy="${cy}" r="${r}" stroke="${n.stroke ?? "none"}"/>${arc}</g>`;
}

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

/**
 * Uniform scale `k` and offset that fit an icon `viewBox` into the box `x, y, w, h`,
 * centered, for `translate(tx ty) scale(k)`.
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
