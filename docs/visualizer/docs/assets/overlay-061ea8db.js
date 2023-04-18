import {
  i as Ft,
  f as B,
  S as St,
  g as Mt,
  y as ht,
  h as G,
} from "./stvt-31b52f5e.js";
function Dt(t, e, n = []) {
  for (let o = 0; o < e.length; ++o) {
    const i = e[o],
      s = t[o],
      r = s.parentElement || s.getRootNode();
    n[o] && n[o](i), r && r !== s && r.replaceChild(i, s), delete t[o];
  }
  return e;
}
const Nt = (
    t,
    e,
    { position: n, prepareCallback: o } = { position: "beforeend" },
  ) => {
    let { length: i } = t;
    if (i === 0) return () => t;
    let s = 1,
      r = 0;
    (n === "afterbegin" || n === "afterend") && ((s = -1), (r = i - 1));
    const a = new Array(i),
      l = new Array(i),
      c = document.createComment("placeholder for reparented element");
    do {
      const h = t[r];
      o && (l[r] = o(h)), (a[r] = c.cloneNode());
      const d = h.parentElement || h.getRootNode();
      d && d !== h && d.replaceChild(a[r], h),
        e.insertAdjacentElement(n, h),
        (r += s);
    } while (--i > 0);
    return function () {
      return Dt(a, t, l);
    };
  },
  Wt = Ft`
@keyframes sp-overlay-fade-in{0%{opacity:0;transform:var(--sp-overlay-from)}to{opacity:1;transform:translate(0)}}@keyframes sp-overlay-fade-out{0%{opacity:1;transform:translate(0)}to{opacity:0;transform:var(--sp-overlay-from)}}:host{display:inline-block;left:-9999em;pointer-events:none;position:absolute;top:-9999em;z-index:1000}:host(:focus){outline:none}:host([placement=none]){height:100vh;height:100dvh;height:-webkit-fill-available;height:fill-available;left:0;position:fixed;top:0}#contents,sp-theme{height:100%}#contents{--swc-overlay-animation-distance:var(
--spectrum-picker-m-texticon-popover-offset-y,var(--spectrum-global-dimension-size-75)
);animation-duration:var(
--swc-test-duration,var(--spectrum-global-animation-duration-200,.16s)
);animation-timing-function:var(
--spectrum-global-animation-ease-out,ease-out
);box-sizing:border-box;display:inline-block;opacity:1;pointer-events:none;visibility:visible}:host([actual-placement*=top]) #contents{--sp-overlay-from:translateY(var(--spectrum-global-dimension-size-75));align-items:flex-end;display:inline-flex;padding-top:var(--swc-overlay-animation-distance)}:host([actual-placement*=right]) #contents{--sp-overlay-from:translateX(calc(var(--spectrum-global-dimension-size-75)*-1));padding-right:var(--swc-overlay-animation-distance)}:host([actual-placement*=bottom]) #contents{--sp-overlay-from:translateY(calc(var(--spectrum-global-dimension-size-75)*-1));padding-bottom:var(--swc-overlay-animation-distance)}:host([actual-placement*=left]) #contents{--sp-overlay-from:translateX(var(--spectrum-global-dimension-size-75));padding-left:var(--swc-overlay-animation-distance)}:host([animating]) ::slotted(*){pointer-events:none}:host(:not([animating])) ::slotted(*){pointer-events:auto}#contents ::slotted(*){position:relative}
`,
  _t = Wt,
  D = (t) => {
    if (!t) return null;
    const e = t.closest("active-overlay");
    if (e) return e;
    const n = t.getRootNode();
    return n.host ? D(n.host) : null;
  },
  ot = (t, e) => {
    const n = [];
    if (!t) return [];
    for (const o of e)
      !o.root || (D(o.root) === t && (n.push(o), n.push(...ot(o, e))));
    return n;
  };
function N(t) {
  return t.split("-")[0];
}
function U(t) {
  return t.split("-")[1];
}
function q(t) {
  return ["top", "bottom"].includes(N(t)) ? "x" : "y";
}
function rt(t) {
  return t === "y" ? "height" : "width";
}
function dt(t, e, n) {
  let { reference: o, floating: i } = t;
  const s = o.x + o.width / 2 - i.width / 2,
    r = o.y + o.height / 2 - i.height / 2,
    a = q(e),
    l = rt(a),
    c = o[l] / 2 - i[l] / 2,
    h = N(e),
    d = a === "x";
  let u;
  switch (h) {
    case "top":
      u = { x: s, y: o.y - i.height };
      break;
    case "bottom":
      u = { x: s, y: o.y + o.height };
      break;
    case "right":
      u = { x: o.x + o.width, y: r };
      break;
    case "left":
      u = { x: o.x - i.width, y: r };
      break;
    default:
      u = { x: o.x, y: o.y };
  }
  switch (U(e)) {
    case "start":
      u[a] -= c * (n && d ? -1 : 1);
      break;
    case "end":
      u[a] += c * (n && d ? -1 : 1);
      break;
  }
  return u;
}
const $t = async (t, e, n) => {
  const {
      placement: o = "bottom",
      strategy: i = "absolute",
      middleware: s = [],
      platform: r,
    } = n,
    a = s.filter(Boolean),
    l = await (r.isRTL == null ? void 0 : r.isRTL(e));
  let c = await r.getElementRects({ reference: t, floating: e, strategy: i }),
    { x: h, y: d } = dt(c, o, l),
    u = o,
    p = {},
    m = 0;
  for (let f = 0; f < a.length; f++) {
    const { name: g, fn: y } = a[f],
      {
        x: b,
        y: w,
        data: x,
        reset: v,
      } = await y({
        x: h,
        y: d,
        initialPlacement: o,
        placement: u,
        strategy: i,
        middlewareData: p,
        rects: c,
        platform: r,
        elements: { reference: t, floating: e },
      });
    if (
      ((h = b ?? h),
      (d = w ?? d),
      (p = { ...p, [g]: { ...p[g], ...x } }),
      v && m <= 50)
    ) {
      m++,
        typeof v == "object" &&
          (v.placement && (u = v.placement),
          v.rects &&
            (c =
              v.rects === !0
                ? await r.getElementRects({
                    reference: t,
                    floating: e,
                    strategy: i,
                  })
                : v.rects),
          ({ x: h, y: d } = dt(c, u, l))),
        (f = -1);
      continue;
    }
  }
  return { x: h, y: d, placement: u, strategy: i, middlewareData: p };
};
function zt(t) {
  return { top: 0, right: 0, bottom: 0, left: 0, ...t };
}
function Ot(t) {
  return typeof t != "number"
    ? zt(t)
    : { top: t, right: t, bottom: t, left: t };
}
function Z(t) {
  return {
    ...t,
    top: t.y,
    left: t.x,
    right: t.x + t.width,
    bottom: t.y + t.height,
  };
}
async function at(t, e) {
  var n;
  e === void 0 && (e = {});
  const { x: o, y: i, platform: s, rects: r, elements: a, strategy: l } = t,
    {
      boundary: c = "clippingAncestors",
      rootBoundary: h = "viewport",
      elementContext: d = "floating",
      altBoundary: u = !1,
      padding: p = 0,
    } = e,
    m = Ot(p),
    g = a[u ? (d === "floating" ? "reference" : "floating") : d],
    y = Z(
      await s.getClippingRect({
        element:
          (n = await (s.isElement == null ? void 0 : s.isElement(g))) == null ||
          n
            ? g
            : g.contextElement ||
              (await (s.getDocumentElement == null
                ? void 0
                : s.getDocumentElement(a.floating))),
        boundary: c,
        rootBoundary: h,
        strategy: l,
      }),
    ),
    b = d === "floating" ? { ...r.floating, x: o, y: i } : r.reference,
    w = await (s.getOffsetParent == null
      ? void 0
      : s.getOffsetParent(a.floating)),
    x = (await (s.isElement == null ? void 0 : s.isElement(w)))
      ? (await (s.getScale == null ? void 0 : s.getScale(w))) || { x: 1, y: 1 }
      : { x: 1, y: 1 },
    v = Z(
      s.convertOffsetParentRelativeRectToViewportRelativeRect
        ? await s.convertOffsetParentRelativeRectToViewportRelativeRect({
            rect: b,
            offsetParent: w,
            strategy: l,
          })
        : b,
    );
  return {
    top: (y.top - v.top + m.top) / x.y,
    bottom: (v.bottom - y.bottom + m.bottom) / x.y,
    left: (y.left - v.left + m.left) / x.x,
    right: (v.right - y.right + m.right) / x.x,
  };
}
const Bt = Math.min,
  F = Math.max;
function it(t, e, n) {
  return F(t, Bt(e, n));
}
const Ht = (t) => ({
    name: "arrow",
    options: t,
    async fn(e) {
      const { element: n, padding: o = 0 } = t ?? {},
        { x: i, y: s, placement: r, rects: a, platform: l } = e;
      if (n == null) return {};
      const c = Ot(o),
        h = { x: i, y: s },
        d = q(r),
        u = U(r),
        p = rt(d),
        m = await l.getDimensions(n),
        f = d === "y" ? "top" : "left",
        g = d === "y" ? "bottom" : "right",
        y = a.reference[p] + a.reference[d] - h[d] - a.floating[p],
        b = h[d] - a.reference[d],
        w = await (l.getOffsetParent == null ? void 0 : l.getOffsetParent(n));
      let x = w ? (d === "y" ? w.clientHeight || 0 : w.clientWidth || 0) : 0;
      x === 0 && (x = a.floating[p]);
      const v = y / 2 - b / 2,
        M = c[f],
        W = x - m[p] - c[g],
        E = x / 2 - m[p] / 2 + v,
        O = it(M, E, W),
        X =
          (u === "start" ? c[f] : c[g]) > 0 &&
          E !== O &&
          a.reference[p] <= a.floating[p]
            ? E < M
              ? M - E
              : W - E
            : 0;
      return { [d]: h[d] - X, data: { [d]: O, centerOffset: E - O } };
    },
  }),
  It = { left: "right", right: "left", bottom: "top", top: "bottom" };
function tt(t) {
  return t.replace(/left|right|bottom|top/g, (e) => It[e]);
}
function Vt(t, e, n) {
  n === void 0 && (n = !1);
  const o = U(t),
    i = q(t),
    s = rt(i);
  let r =
    i === "x"
      ? o === (n ? "end" : "start")
        ? "right"
        : "left"
      : o === "start"
      ? "bottom"
      : "top";
  return (
    e.reference[s] > e.floating[s] && (r = tt(r)), { main: r, cross: tt(r) }
  );
}
const jt = { start: "end", end: "start" };
function ut(t) {
  return t.replace(/start|end/g, (e) => jt[e]);
}
function Kt(t) {
  const e = tt(t);
  return [ut(t), e, ut(e)];
}
const mt = function (t) {
  return (
    t === void 0 && (t = {}),
    {
      name: "flip",
      options: t,
      async fn(e) {
        var n;
        const {
            placement: o,
            middlewareData: i,
            rects: s,
            initialPlacement: r,
            platform: a,
            elements: l,
          } = e,
          {
            mainAxis: c = !0,
            crossAxis: h = !0,
            fallbackPlacements: d,
            fallbackStrategy: u = "bestFit",
            flipAlignment: p = !0,
            ...m
          } = t,
          f = N(o),
          y = d || (f === r || !p ? [tt(r)] : Kt(r)),
          b = [r, ...y],
          w = await at(e, m),
          x = [];
        let v = ((n = i.flip) == null ? void 0 : n.overflows) || [];
        if ((c && x.push(w[f]), h)) {
          const { main: O, cross: _ } = Vt(
            o,
            s,
            await (a.isRTL == null ? void 0 : a.isRTL(l.floating)),
          );
          x.push(w[O], w[_]);
        }
        if (
          ((v = [...v, { placement: o, overflows: x }]),
          !x.every((O) => O <= 0))
        ) {
          var M, W;
          const O =
              ((M = (W = i.flip) == null ? void 0 : W.index) != null ? M : 0) +
              1,
            _ = b[O];
          if (_)
            return {
              data: { index: O, overflows: v },
              reset: { placement: _ },
            };
          let $ = "bottom";
          switch (u) {
            case "bestFit": {
              var E;
              const X =
                (E = v
                  .map((Y) => [
                    Y,
                    Y.overflows
                      .filter((z) => z > 0)
                      .reduce((z, Lt) => z + Lt, 0),
                  ])
                  .sort((Y, z) => Y[1] - z[1])[0]) == null
                  ? void 0
                  : E[0].placement;
              X && ($ = X);
              break;
            }
            case "initialPlacement":
              $ = r;
              break;
          }
          if (o !== $) return { reset: { placement: $ } };
        }
        return {};
      },
    }
  );
};
async function Ut(t, e) {
  const { placement: n, platform: o, elements: i } = t,
    s = await (o.isRTL == null ? void 0 : o.isRTL(i.floating)),
    r = N(n),
    a = U(n),
    l = q(n) === "x",
    c = ["left", "top"].includes(r) ? -1 : 1,
    h = s && l ? -1 : 1,
    d = typeof e == "function" ? e(t) : e;
  let {
    mainAxis: u,
    crossAxis: p,
    alignmentAxis: m,
  } = typeof d == "number"
    ? { mainAxis: d, crossAxis: 0, alignmentAxis: null }
    : { mainAxis: 0, crossAxis: 0, alignmentAxis: null, ...d };
  return (
    a && typeof m == "number" && (p = a === "end" ? m * -1 : m),
    l ? { x: p * h, y: u * c } : { x: u * c, y: p * h }
  );
}
const qt = function (t) {
  return (
    t === void 0 && (t = 0),
    {
      name: "offset",
      options: t,
      async fn(e) {
        const { x: n, y: o } = e,
          i = await Ut(e, t);
        return { x: n + i.x, y: o + i.y, data: i };
      },
    }
  );
};
function Xt(t) {
  return t === "x" ? "y" : "x";
}
const Yt = function (t) {
    return (
      t === void 0 && (t = {}),
      {
        name: "shift",
        options: t,
        async fn(e) {
          const { x: n, y: o, placement: i } = e,
            {
              mainAxis: s = !0,
              crossAxis: r = !1,
              limiter: a = {
                fn: (g) => {
                  let { x: y, y: b } = g;
                  return { x: y, y: b };
                },
              },
              ...l
            } = t,
            c = { x: n, y: o },
            h = await at(e, l),
            d = q(N(i)),
            u = Xt(d);
          let p = c[d],
            m = c[u];
          if (s) {
            const g = d === "y" ? "top" : "left",
              y = d === "y" ? "bottom" : "right",
              b = p + h[g],
              w = p - h[y];
            p = it(b, p, w);
          }
          if (r) {
            const g = u === "y" ? "top" : "left",
              y = u === "y" ? "bottom" : "right",
              b = m + h[g],
              w = m - h[y];
            m = it(b, m, w);
          }
          const f = a.fn({ ...e, [d]: p, [u]: m });
          return { ...f, data: { x: f.x - n, y: f.y - o } };
        },
      }
    );
  },
  Gt = function (t) {
    return (
      t === void 0 && (t = {}),
      {
        name: "size",
        options: t,
        async fn(e) {
          const { placement: n, rects: o, platform: i, elements: s } = e,
            { apply: r = () => {}, ...a } = t,
            l = await at(e, a),
            c = N(n),
            h = U(n);
          let d, u;
          c === "top" || c === "bottom"
            ? ((d = c),
              (u =
                h ===
                ((await (i.isRTL == null ? void 0 : i.isRTL(s.floating)))
                  ? "start"
                  : "end")
                  ? "left"
                  : "right"))
            : ((u = c), (d = h === "end" ? "top" : "bottom"));
          const p = F(l.left, 0),
            m = F(l.right, 0),
            f = F(l.top, 0),
            g = F(l.bottom, 0),
            y = {
              availableHeight:
                o.floating.height -
                (["left", "right"].includes(n)
                  ? 2 * (f !== 0 || g !== 0 ? f + g : F(l.top, l.bottom))
                  : l[d]),
              availableWidth:
                o.floating.width -
                (["top", "bottom"].includes(n)
                  ? 2 * (p !== 0 || m !== 0 ? p + m : F(l.left, l.right))
                  : l[u]),
            };
          await r({ ...e, ...y });
          const b = await i.getDimensions(s.floating);
          return o.floating.width !== b.width || o.floating.height !== b.height
            ? { reset: { rects: !0 } }
            : {};
        },
      }
    );
  };
function R(t) {
  var e;
  return ((e = t.ownerDocument) == null ? void 0 : e.defaultView) || window;
}
function T(t) {
  return R(t).getComputedStyle(t);
}
function P(t) {
  return At(t) ? (t.nodeName || "").toLowerCase() : "";
}
let J;
function Tt() {
  if (J) return J;
  const t = navigator.userAgentData;
  return t && Array.isArray(t.brands)
    ? ((J = t.brands.map((e) => e.brand + "/" + e.version).join(" ")), J)
    : navigator.userAgent;
}
function A(t) {
  return t instanceof R(t).HTMLElement;
}
function C(t) {
  return t instanceof R(t).Element;
}
function At(t) {
  return t instanceof R(t).Node;
}
function pt(t) {
  if (typeof ShadowRoot > "u") return !1;
  const e = R(t).ShadowRoot;
  return t instanceof e || t instanceof ShadowRoot;
}
function et(t) {
  const { overflow: e, overflowX: n, overflowY: o, display: i } = T(t);
  return (
    /auto|scroll|overlay|hidden/.test(e + o + n) &&
    !["inline", "contents"].includes(i)
  );
}
function Jt(t) {
  return ["table", "td", "th"].includes(P(t));
}
function lt(t) {
  const e = /firefox/i.test(Tt()),
    n = T(t),
    o = n.backdropFilter || n.WebkitBackdropFilter;
  return (
    n.transform !== "none" ||
    n.perspective !== "none" ||
    (o ? o !== "none" : !1) ||
    (e && n.willChange === "filter") ||
    (e && (n.filter ? n.filter !== "none" : !1)) ||
    ["transform", "perspective"].some((i) => n.willChange.includes(i)) ||
    ["paint", "layout", "strict", "content"].some((i) => {
      const s = n.contain;
      return s != null ? s.includes(i) : !1;
    })
  );
}
function Et() {
  return !/^((?!chrome|android).)*safari/i.test(Tt());
}
function ct(t) {
  return ["html", "body", "#document"].includes(P(t));
}
const ft = Math.min,
  I = Math.max,
  gt = Math.round,
  st = { x: 1, y: 1 };
function j(t) {
  const e = !C(t) && t.contextElement ? t.contextElement : C(t) ? t : null;
  if (!e) return st;
  const n = e.getBoundingClientRect(),
    o = T(e);
  if (o.boxSizing !== "border-box")
    return A(e)
      ? {
          x: (e.offsetWidth > 0 && gt(n.width) / e.offsetWidth) || 1,
          y: (e.offsetHeight > 0 && gt(n.height) / e.offsetHeight) || 1,
        }
      : st;
  let i = n.width / parseFloat(o.width),
    s = n.height / parseFloat(o.height);
  return (
    (!i || !Number.isFinite(i)) && (i = 1),
    (!s || !Number.isFinite(s)) && (s = 1),
    { x: i, y: s }
  );
}
function k(t, e, n, o) {
  var i, s, r, a;
  e === void 0 && (e = !1), n === void 0 && (n = !1);
  const l = t.getBoundingClientRect();
  let c = st;
  e && (o ? C(o) && (c = j(o)) : (c = j(t)));
  const h = C(t) ? R(t) : window,
    d = !Et() && n,
    u =
      (l.left +
        (d &&
        (i = (s = h.visualViewport) == null ? void 0 : s.offsetLeft) != null
          ? i
          : 0)) /
      c.x,
    p =
      (l.top +
        (d &&
        (r = (a = h.visualViewport) == null ? void 0 : a.offsetTop) != null
          ? r
          : 0)) /
      c.y,
    m = l.width / c.x,
    f = l.height / c.y;
  return {
    width: m,
    height: f,
    top: p,
    right: u + m,
    bottom: p + f,
    left: u,
    x: u,
    y: p,
  };
}
function L(t) {
  return ((At(t) ? t.ownerDocument : t.document) || window.document)
    .documentElement;
}
function nt(t) {
  return C(t)
    ? { scrollLeft: t.scrollLeft, scrollTop: t.scrollTop }
    : { scrollLeft: t.pageXOffset, scrollTop: t.pageYOffset };
}
function Rt(t) {
  return k(L(t)).left + nt(t).scrollLeft;
}
function Qt(t, e, n) {
  const o = A(e),
    i = L(e),
    s = k(t, !0, n === "fixed", e);
  let r = { scrollLeft: 0, scrollTop: 0 };
  const a = { x: 0, y: 0 };
  if (o || (!o && n !== "fixed"))
    if (((P(e) !== "body" || et(i)) && (r = nt(e)), A(e))) {
      const l = k(e, !0);
      (a.x = l.x + e.clientLeft), (a.y = l.y + e.clientTop);
    } else i && (a.x = Rt(i));
  return {
    x: s.left + r.scrollLeft - a.x,
    y: s.top + r.scrollTop - a.y,
    width: s.width,
    height: s.height,
  };
}
function K(t) {
  if (P(t) === "html") return t;
  const e = t.assignedSlot || t.parentNode || (pt(t) ? t.host : null) || L(t);
  return pt(e) ? e.host : e;
}
function vt(t) {
  return !A(t) || T(t).position === "fixed" ? null : t.offsetParent;
}
function Zt(t) {
  let e = K(t);
  for (; A(e) && !ct(e); ) {
    if (lt(e)) return e;
    e = K(e);
  }
  return null;
}
function yt(t) {
  const e = R(t);
  let n = vt(t);
  for (; n && Jt(n) && T(n).position === "static"; ) n = vt(n);
  return n &&
    (P(n) === "html" ||
      (P(n) === "body" && T(n).position === "static" && !lt(n)))
    ? e
    : n || Zt(t) || e;
}
function te(t) {
  if (A(t)) return { width: t.offsetWidth, height: t.offsetHeight };
  const e = k(t);
  return { width: e.width, height: e.height };
}
function ee(t) {
  let { rect: e, offsetParent: n, strategy: o } = t;
  const i = A(n),
    s = L(n);
  if (n === s) return e;
  let r = { scrollLeft: 0, scrollTop: 0 },
    a = { x: 1, y: 1 };
  const l = { x: 0, y: 0 };
  if (
    (i || (!i && o !== "fixed")) &&
    ((P(n) !== "body" || et(s)) && (r = nt(n)), A(n))
  ) {
    const c = k(n);
    (a = j(n)), (l.x = c.x + n.clientLeft), (l.y = c.y + n.clientTop);
  }
  return {
    width: e.width * a.x,
    height: e.height * a.y,
    x: e.x * a.x - r.scrollLeft * a.x + l.x,
    y: e.y * a.y - r.scrollTop * a.y + l.y,
  };
}
function ne(t, e) {
  const n = R(t),
    o = L(t),
    i = n.visualViewport;
  let s = o.clientWidth,
    r = o.clientHeight,
    a = 0,
    l = 0;
  if (i) {
    (s = i.width), (r = i.height);
    const c = Et();
    (c || (!c && e === "fixed")) && ((a = i.offsetLeft), (l = i.offsetTop));
  }
  return { width: s, height: r, x: a, y: l };
}
function oe(t) {
  var e;
  const n = L(t),
    o = nt(t),
    i = (e = t.ownerDocument) == null ? void 0 : e.body,
    s = I(
      n.scrollWidth,
      n.clientWidth,
      i ? i.scrollWidth : 0,
      i ? i.clientWidth : 0,
    ),
    r = I(
      n.scrollHeight,
      n.clientHeight,
      i ? i.scrollHeight : 0,
      i ? i.clientHeight : 0,
    );
  let a = -o.scrollLeft + Rt(t);
  const l = -o.scrollTop;
  return (
    T(i || n).direction === "rtl" &&
      (a += I(n.clientWidth, i ? i.clientWidth : 0) - s),
    { width: s, height: r, x: a, y: l }
  );
}
function Pt(t) {
  const e = K(t);
  return ct(e) ? t.ownerDocument.body : A(e) && et(e) ? e : Pt(e);
}
function V(t, e) {
  var n;
  e === void 0 && (e = []);
  const o = Pt(t),
    i = o === ((n = t.ownerDocument) == null ? void 0 : n.body),
    s = R(o);
  return i
    ? e.concat(s, s.visualViewport || [], et(o) ? o : [])
    : e.concat(o, V(o));
}
function ie(t, e) {
  const n = k(t, !0, e === "fixed"),
    o = n.top + t.clientTop,
    i = n.left + t.clientLeft,
    s = A(t) ? j(t) : { x: 1, y: 1 },
    r = t.clientWidth * s.x,
    a = t.clientHeight * s.y,
    l = i * s.x,
    c = o * s.y;
  return {
    top: c,
    left: l,
    right: l + r,
    bottom: c + a,
    x: l,
    y: c,
    width: r,
    height: a,
  };
}
function bt(t, e, n) {
  return e === "viewport" ? Z(ne(t, n)) : C(e) ? ie(e, n) : Z(oe(L(t)));
}
function se(t, e) {
  const n = e.get(t);
  if (n) return n;
  let o = V(t).filter((a) => C(a) && P(a) !== "body"),
    i = null;
  const s = T(t).position === "fixed";
  let r = s ? K(t) : t;
  for (; C(r) && !ct(r); ) {
    const a = T(r),
      l = lt(r);
    (
      s
        ? !l && !i
        : !l &&
          a.position === "static" &&
          !!i &&
          ["absolute", "fixed"].includes(i.position)
    )
      ? (o = o.filter((h) => h !== r))
      : (i = a),
      (r = K(r));
  }
  return e.set(t, o), o;
}
function re(t) {
  let { element: e, boundary: n, rootBoundary: o, strategy: i } = t;
  const r = [...(n === "clippingAncestors" ? se(e, this._c) : [].concat(n)), o],
    a = r[0],
    l = r.reduce((c, h) => {
      const d = bt(e, h, i);
      return (
        (c.top = I(d.top, c.top)),
        (c.right = ft(d.right, c.right)),
        (c.bottom = ft(d.bottom, c.bottom)),
        (c.left = I(d.left, c.left)),
        c
      );
    }, bt(e, a, i));
  return {
    width: l.right - l.left,
    height: l.bottom - l.top,
    x: l.left,
    y: l.top,
  };
}
const ae = {
  getClippingRect: re,
  convertOffsetParentRelativeRectToViewportRelativeRect: ee,
  isElement: C,
  getDimensions: te,
  getOffsetParent: yt,
  getDocumentElement: L,
  getScale: j,
  async getElementRects(t) {
    let { reference: e, floating: n, strategy: o } = t;
    const i = this.getOffsetParent || yt,
      s = this.getDimensions;
    return {
      reference: Qt(e, await i(n), o),
      floating: { x: 0, y: 0, ...(await s(n)) },
    };
  },
  getClientRects: (t) => Array.from(t.getClientRects()),
  isRTL: (t) => T(t).direction === "rtl",
};
function le(t, e, n, o) {
  o === void 0 && (o = {});
  const {
      ancestorScroll: i = !0,
      ancestorResize: s = !0,
      elementResize: r = !0,
      animationFrame: a = !1,
    } = o,
    l = i && !a,
    c =
      l || s
        ? [
            ...(C(t) ? V(t) : t.contextElement ? V(t.contextElement) : []),
            ...V(e),
          ]
        : [];
  c.forEach((m) => {
    l && m.addEventListener("scroll", n, { passive: !0 }),
      s && m.addEventListener("resize", n);
  });
  let h = null;
  if (r) {
    let m = !0;
    (h = new ResizeObserver(() => {
      m || n(), (m = !1);
    })),
      C(t) && !a && h.observe(t),
      !C(t) && t.contextElement && !a && h.observe(t.contextElement),
      h.observe(e);
  }
  let d,
    u = a ? k(t) : null;
  a && p();
  function p() {
    const m = k(t);
    u &&
      (m.x !== u.x ||
        m.y !== u.y ||
        m.width !== u.width ||
        m.height !== u.height) &&
      n(),
      (u = m),
      (d = requestAnimationFrame(p));
  }
  return (
    n(),
    () => {
      var m;
      c.forEach((f) => {
        l && f.removeEventListener("scroll", n),
          s && f.removeEventListener("resize", n);
      }),
        (m = h) == null || m.disconnect(),
        (h = null),
        a && cancelAnimationFrame(d);
    }
  );
}
const ce = (t, e, n) => {
  const o = new Map(),
    i = { platform: ae, ...n },
    s = { ...i.platform, _c: o };
  return $t(t, e, { ...i, platform: s });
};
var he = Object.defineProperty,
  de = Object.getOwnPropertyDescriptor,
  H = (t, e, n, o) => {
    for (
      var i = o > 1 ? void 0 : o ? de(e, n) : e, s = t.length - 1, r;
      s >= 0;
      s--
    )
      (r = t[s]) && (i = (o ? r(e, n, i) : r(i)) || i);
    return o && i && he(e, n, i), i;
  };
const wt = {
    initial: "idle",
    states: {
      idle: { on: { active: "active" } },
      active: { on: { hiding: "hiding", idle: "idle" } },
      hiding: { on: { dispose: "dispose" } },
      dispose: { on: { disposed: "disposed" } },
      disposed: { on: {} },
    },
  },
  xt = (t, e) => (t ? (e && wt.states[t].on[e]) || t : wt.initial),
  ue = (t) => {
    var e;
    return (e = {
      left: ["right", "bottom", "top"],
      "left-start": ["right-start", "bottom", "top"],
      "left-end": ["right-end", "bottom", "top"],
      right: ["left", "bottom", "top"],
      "right-start": ["left-start", "bottom", "top"],
      "right-end": ["left-end", "bottom", "top"],
      top: ["bottom", "left", "right"],
      "top-start": ["bottom-start", "left", "right"],
      "top-end": ["bottom-end", "left", "right"],
      bottom: ["top", "left", "right"],
      "bottom-start": ["top-start", "left", "right"],
      "bottom-end": ["top-end", "left", "right"],
    }[t]) != null
      ? e
      : [t];
  },
  kt = class extends St {
    constructor() {
      super(),
        (this.contentAnimationPromise = Promise.resolve(!0)),
        (this.resolveContentAnimationPromise = () => {}),
        (this._state = xt()),
        (this.animating = !1),
        (this.theme = {}),
        (this.tabbingAway = !1),
        (this.offset = 6),
        (this.skidding = 0),
        (this.interaction = "hover"),
        (this.positionAnimationFrame = 0),
        (this.willNotifyClosed = !1),
        (this.isConstrained = !1),
        (this.updateOverlayPosition = () => {
          if (this.interaction !== "modal" && this.cleanup) {
            this.dispatchEvent(new Event("close"));
            return;
          }
          this.setOverlayPosition();
        }),
        (this.setOverlayPosition = async () => {
          if (!this.placement || this.placement === "none") return;
          await (document.fonts ? document.fonts.ready : Promise.resolve());
          function t(c) {
            const h = window.devicePixelRatio || 1;
            return Math.round(c * h) / h || -1e4;
          }
          const e = 8,
            n = 100,
            o = this.virtualTrigger
              ? mt({ padding: e, fallbackPlacements: ue(this.placement) })
              : mt({ padding: e }),
            i = [
              qt({ mainAxis: this.offset, crossAxis: this.skidding }),
              Yt({ padding: e }),
              o,
              Gt({
                padding: e,
                apply: ({
                  availableWidth: c,
                  availableHeight: h,
                  rects: { floating: d },
                }) => {
                  const u = Math.max(n, Math.floor(h)),
                    p = d.height;
                  (this.initialHeight =
                    !this.isConstrained && !this.virtualTrigger
                      ? p
                      : this.initialHeight || p),
                    (this.isConstrained = p < this.initialHeight || u <= p);
                  const m = this.isConstrained ? `${u}px` : "";
                  Object.assign(this.style, {
                    maxWidth: `${Math.floor(c)}px`,
                    maxHeight: m,
                    height: m,
                  });
                },
              }),
            ];
          this.overlayContentTip &&
            i.push(Ht({ element: this.overlayContentTip }));
          const {
            x: s,
            y: r,
            placement: a,
            middlewareData: l,
          } = await ce(this.virtualTrigger || this.trigger, this, {
            placement: this.placement,
            middleware: i,
          });
          if (
            (Object.assign(this.style, {
              top: "0px",
              left: "0px",
              transform: `translate(${t(s)}px, ${t(r)}px)`,
            }),
            a !== this.getAttribute("actual-placement") &&
              (this.setAttribute("actual-placement", a),
              this.overlayContent.setAttribute("placement", a)),
            this.overlayContentTip && l.arrow)
          ) {
            const { x: c, y: h } = l.arrow;
            Object.assign(this.overlayContentTip.style, {
              left: c != null ? `${t(c)}px` : "",
              top: h != null ? `${t(h)}px` : "",
              right: "",
              bottom: "",
            });
          }
        }),
        (this.handleInlineTriggerKeydown = (t) => {
          const { code: e, shiftKey: n } = t;
          if (e === "Tab") {
            if (n) {
              (this.tabbingAway = !0), this.dispatchEvent(new Event("close"));
              return;
            }
            t.stopPropagation(), t.preventDefault(), this.focus();
          }
        }),
        (this.stealOverlayContentPromise = Promise.resolve()),
        (this.stealOverlayContentPromise = new Promise(
          (t) => (this.stealOverlayContentResolver = t),
        ));
    }
    get state() {
      return this._state;
    }
    set state(t) {
      const e = xt(this.state, t);
      e !== this.state &&
        ((this._state = e),
        this.state === "active" || this.state === "hiding"
          ? this.setAttribute("state", this.state)
          : this.removeAttribute("state"));
    }
    async focus() {
      const t = Mt(this);
      if (t) {
        t.updateComplete && (await t.updateComplete);
        const e = this.getRootNode().activeElement;
        (e === this || !this.contains(e)) && t.focus();
      } else super.focus();
      this.removeAttribute("tabindex");
    }
    get hasTheme() {
      return !!this.theme.color || !!this.theme.scale || !!this.theme.lang;
    }
    static get styles() {
      return [_t];
    }
    get hasModalRoot() {
      return !!this._modalRoot;
    }
    feature() {
      this.contains(document.activeElement) || (this.tabIndex = -1);
      const t = D(this.trigger);
      t && t.slot === "open" && (this._modalRoot = t._modalRoot || t),
        (this.interaction === "modal" || this._modalRoot) &&
          ((this.slot = "open"),
          this.interaction === "modal" &&
            this.setAttribute("aria-modal", "true"),
          this._modalRoot && (t == null || t.feature()));
    }
    obscure(t) {
      if (this.slot && t === "modal") {
        if (
          (this.removeAttribute("slot"),
          this.removeAttribute("aria-modal"),
          this.interaction !== "modal")
        ) {
          const e = D(this.trigger);
          return (
            (this._modalRoot = e == null ? void 0 : e.obscure(t)),
            this._modalRoot
          );
        }
        return this;
      }
    }
    async willUpdate() {
      this.hasUpdated ||
        !this.overlayContent ||
        !this.trigger ||
        (this.stealOverlayContent(this.overlayContent),
        (this.state = "active"),
        this.feature(),
        this.placement &&
          this.placement !== "none" &&
          (await this.updateOverlayPosition(),
          document.addEventListener(
            "sp-update-overlays",
            this.setOverlayPosition,
          )),
        this.placement &&
          this.placement !== "none" &&
          (this.contentAnimationPromise =
            this.applyContentAnimation("sp-overlay-fade-in")));
    }
    async openCallback(t) {
      await this.updateComplete,
        this.receivesFocus && (await this.focus()),
        await t(),
        this.trigger.dispatchEvent(
          new CustomEvent("sp-opened", {
            bubbles: !0,
            composed: !0,
            cancelable: !0,
            detail: { interaction: this.interaction },
          }),
        );
    }
    open(t) {
      this.extractDetail(t);
    }
    extractDetail(t) {
      (this.overlayContent = t.content),
        (this.overlayContentTip = t.contentTip),
        (this.trigger = t.trigger),
        (this.virtualTrigger = t.virtualTrigger),
        (this.placement = t.placement),
        (this.offset = t.offset),
        (this.skidding = t.skidding || 0),
        (this.interaction = t.interaction),
        (this.theme = t.theme),
        (this.receivesFocus = t.receivesFocus),
        (this.root = t.root);
    }
    dispose() {
      this.state === "dispose" &&
        (this.timeout && (clearTimeout(this.timeout), delete this.timeout),
        this.trigger.removeEventListener(
          "keydown",
          this.handleInlineTriggerKeydown,
        ),
        this.returnOverlayContent(),
        (this.state = "disposed"),
        this.willNotifyClosed &&
          (this.overlayContent.dispatchEvent(new Event("sp-overlay-closed")),
          (this.willNotifyClosed = !1)),
        this.cleanup && this.cleanup());
    }
    stealOverlayContent(t) {
      (this.originalPlacement = t.getAttribute("placement")),
        (this.restoreContent = Nt([t], this, {
          position: "beforeend",
          prepareCallback: (e) => {
            const n = e.slot,
              o = e.placement;
            return (
              e.removeAttribute("slot"),
              (i) => {
                (i.slot = n), (i.placement = o);
              }
            );
          },
        })),
        this.stealOverlayContentResolver();
    }
    returnOverlayContent() {
      if (!this.restoreContent) return;
      const [t] = this.restoreContent();
      (this.restoreContent = void 0),
        (this.willNotifyClosed = !0),
        this.originalPlacement &&
          (t.setAttribute("placement", this.originalPlacement),
          delete this.originalPlacement);
    }
    async placeOverlay() {
      !this.placement ||
        this.placement === "none" ||
        (this.cleanup = le(
          this.virtualTrigger || this.trigger,
          this,
          this.updateOverlayPosition,
          { elementResize: !1 },
        ));
    }
    async hide(t = !0) {
      this.state === "active" &&
        ((this.state = "hiding"),
        t && (await this.applyContentAnimation("sp-overlay-fade-out")),
        (this.state = "dispose"));
    }
    schedulePositionUpdate() {
      cancelAnimationFrame(this.positionAnimationFrame),
        (this.positionAnimationFrame = requestAnimationFrame(() => {
          this.cleanup ? this.updateOverlayPosition() : this.placeOverlay();
        }));
    }
    onSlotChange() {
      this.schedulePositionUpdate();
    }
    applyContentAnimation(t) {
      return this.placement === "none"
        ? Promise.resolve(!0)
        : (this.resolveContentAnimationPromise(),
          new Promise((e) => {
            this.resolveContentAnimationPromise = () => {
              e(!1);
            };
            const n = this.shadowRoot.querySelector("#contents"),
              o = (i) => {
                t === i.animationName &&
                  (n.removeEventListener("animationend", o),
                  n.removeEventListener("animationcancel", o),
                  (this.animating = !1),
                  e(i.type === "animationcancel"));
              };
            n.addEventListener("animationend", o),
              n.addEventListener("animationcancel", o),
              (n.style.animationName = t),
              (this.animating = !0);
          }));
    }
    renderTheme(t) {
      const { color: e, scale: n, lang: o, theme: i } = this.theme;
      return ht`
            <sp-theme
                theme=${G(i)}
                color=${G(e)}
                scale=${G(n)}
                lang=${G(o)}
                part="theme"
            >
                ${t}
            </sp-theme>
        `;
    }
    render() {
      const t = ht`
            <div id="contents">
                <slot @slotchange=${this.onSlotChange}></slot>
            </div>
        `;
      return this.hasTheme ? this.renderTheme(t) : t;
    }
    static create(t) {
      const e = new kt();
      return t.content && e.open(t), e;
    }
    async getUpdateComplete() {
      const t = [super.getUpdateComplete(), this.stealOverlayContentPromise];
      t.push(this.contentAnimationPromise),
        typeof this.overlayContent.updateComplete < "u" &&
          t.push(this.overlayContent.updateComplete);
      const [e] = await Promise.all(t);
      return e;
    }
    disconnectedCallback() {
      document.removeEventListener(
        "sp-update-overlays",
        this.setOverlayPosition,
      ),
        super.disconnectedCallback();
    }
  };
let S = kt;
H([B()], S.prototype, "_state", 2),
  H([B({ reflect: !0, type: Boolean })], S.prototype, "animating", 2),
  H([B({ reflect: !0 })], S.prototype, "placement", 2),
  H([B({ attribute: !1 })], S.prototype, "theme", 2),
  H([B({ attribute: !1 })], S.prototype, "receivesFocus", 2);
class me {
  constructor(e = {}) {
    (this.warmUpDelay = 1e3),
      (this.coolDownDelay = 1e3),
      (this.isWarm = !1),
      (this.timeout = 0),
      Object.assign(this, e);
  }
  async openTimer(e) {
    if ((this.cancelCooldownTimer(), !this.component || e !== this.component))
      return (
        this.component &&
          (this.close(this.component), this.cancelCooldownTimer()),
        (this.component = e),
        this.isWarm
          ? !1
          : ((this.promise = new Promise((n) => {
              (this.resolve = n),
                (this.timeout = window.setTimeout(() => {
                  this.resolve && (this.resolve(!1), (this.isWarm = !0));
                }, this.warmUpDelay));
            })),
            this.promise)
      );
    if (this.promise) return this.promise;
    throw new Error("Inconsistent state");
  }
  close(e) {
    this.component &&
      this.component === e &&
      (this.resetCooldownTimer(),
      this.timeout > 0 && (clearTimeout(this.timeout), (this.timeout = 0)),
      this.resolve && (this.resolve(!0), delete this.resolve),
      delete this.promise,
      delete this.component);
  }
  resetCooldownTimer() {
    this.isWarm &&
      (this.cooldownTimeout && window.clearTimeout(this.cooldownTimeout),
      (this.cooldownTimeout = window.setTimeout(() => {
        (this.isWarm = !1), delete this.cooldownTimeout;
      }, this.coolDownDelay)));
  }
  cancelCooldownTimer() {
    this.cooldownTimeout && window.clearTimeout(this.cooldownTimeout),
      delete this.cooldownTimeout;
  }
}
customElements.define("active-overlay", S);
const pe = (t, e) => {
  let n = document.elementFromPoint(t, e);
  for (; n != null && n.shadowRoot; ) {
    const o = n.shadowRoot.elementFromPoint(t, e);
    if (!o || o === n) break;
    n = o;
  }
  return n;
};
function fe(t) {
  return t.button === 0;
}
function ge(t) {
  return !!(t.metaKey || t.altKey || t.ctrlKey || t.shiftKey);
}
function Ct() {
  return new Promise((t) => requestAnimationFrame(() => t()));
}
class ve {
  constructor() {
    (this.overlays = []),
      (this.preventMouseRootClose = !1),
      (this.root = document.body),
      (this.handlingResize = !1),
      (this.overlayTimer = new me()),
      (this.canTabTrap = !0),
      (this.trappingInited = !1),
      (this._eventsAreBound = !1),
      (this._bodyMarginsApplied = !1),
      (this.forwardContextmenuEvent = async (e) => {
        var n;
        const o = this.overlays[this.overlays.length - 1];
        !this.trappingInited ||
          o.interaction !== "modal" ||
          e.target !== this.overlayHolder ||
          (e.stopPropagation(),
          e.preventDefault(),
          await this.closeTopOverlay(),
          (n = pe(e.clientX, e.clientY)) == null ||
            n.dispatchEvent(new MouseEvent("contextmenu", e)));
      }),
      (this.handleOverlayClose = (e) => {
        const { root: n } = e;
        !n || this.closeOverlaysForRoot(n);
      }),
      (this.handleMouseCapture = (e) => {
        const n = this.topOverlay;
        if (!e.target || !n || !n.overlayContent || ge(e) || !fe(e)) {
          this.preventMouseRootClose = !0;
          return;
        }
        if (e.target instanceof Node) {
          if (e.composedPath().indexOf(n.overlayContent) >= 0) {
            this.preventMouseRootClose = !0;
            return;
          }
          this.preventMouseRootClose = !1;
        }
      }),
      (this._doesNotCloseOnFirstClick = !1),
      (this.handleMouse = (e) => {
        var n;
        if (this._doesNotCloseOnFirstClick) {
          this._doesNotCloseOnFirstClick = !1;
          return;
        }
        if (this.preventMouseRootClose || e.defaultPrevented) return;
        const o = [];
        let i = this.overlays.length;
        for (; i && o.length === 0; ) {
          i -= 1;
          const a = this.overlays[i],
            l = e.composedPath();
          (!l.includes(a.trigger) || a.interaction !== "hover") &&
            !l.includes(a.overlayContent) &&
            o.push(a);
        }
        let s = (n = this.topOverlay) == null ? void 0 : n.root,
          r = D(s);
        for (; s && r; )
          o.push(r), (r = D(s)), (s = r == null ? void 0 : r.root);
        r && o.push(r), o.forEach((a) => this.hideAndCloseOverlay(a));
      }),
      (this.handleKeydown = (e) => {
        e.code === "Escape" && this.closeTopOverlay();
      }),
      (this.handleResize = () => {
        this.handlingResize ||
          ((this.handlingResize = !0),
          requestAnimationFrame(async () => {
            const e = this.overlays.map((n) => n.updateOverlayPosition());
            await Promise.all(e), (this.handlingResize = !1);
          }));
      }),
      this.initTabTrapping();
  }
  initTabTrapping() {
    if (document.readyState === "loading") {
      document.addEventListener(
        "readystatechange",
        () => {
          this.initTabTrapping();
        },
        { once: !0 },
      );
      return;
    }
    if (this.trappingInited) return;
    if (((this.trappingInited = !0), this.document.body.shadowRoot)) {
      this.canTabTrap = !1;
      return;
    }
    if (
      (this.document.body.attachShadow({ mode: "open" }),
      !this.document.body.shadowRoot)
    )
      return;
    const e = this.document.body.shadowRoot;
    (e.innerHTML = `
            <style>
            :host {
                position: relative;
            }
            #actual {
                position: relative;
                height: calc(100% - var(--swc-body-margins-block, 0px));
                z-index: 0;
                min-height: calc(100vh - var(--swc-body-margins-block, 0px));
            }
            #holder {
                display: none;
                align-items: center;
                justify-content: center;
                flex-flow: column;
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                left: 0;
            }
            [name="open"]::slotted(*) {
                pointer-events: all;
            }
            #actual[aria-hidden] + #holder {
                display: flex;
            }
            </style>
            <div id="actual"><slot></slot></div>
            <div id="holder"><slot name="open"></slot></div>
        `),
      (this.tabTrapper = e.querySelector("#actual")),
      (this.overlayHolder = e.querySelector("#holder")),
      this.tabTrapper.attachShadow({ mode: "open" }),
      this.tabTrapper.shadowRoot &&
        (this.tabTrapper.shadowRoot.innerHTML = "<slot></slot>"),
      this.overlayHolder.addEventListener(
        "contextmenu",
        this.forwardContextmenuEvent,
        !0,
      ),
      requestAnimationFrame(() => {
        this.applyBodyMargins(),
          new ResizeObserver(() => {
            this.applyBodyMargins();
          }).observe(document.body);
      });
  }
  applyBodyMargins() {
    const {
        marginLeft: e,
        marginRight: n,
        marginTop: o,
        marginBottom: i,
      } = getComputedStyle(document.body),
      s =
        parseFloat(e) === 0 &&
        parseFloat(n) === 0 &&
        parseFloat(o) === 0 &&
        parseFloat(i) === 0;
    (s && !this._bodyMarginsApplied) ||
      (this.tabTrapper.style.setProperty(
        "--swc-body-margins-inline",
        `calc(${e} + ${n})`,
      ),
      this.tabTrapper.style.setProperty(
        "--swc-body-margins-block",
        `calc(${o} + ${i})`,
      ),
      (this._bodyMarginsApplied = !s));
  }
  startTabTrapping() {
    this.initTabTrapping(),
      this.canTabTrap &&
        ((this.tabTrapper.tabIndex = -1),
        this.tabTrapper.setAttribute("aria-hidden", "true"));
  }
  stopTabTrapping() {
    !this.canTabTrap ||
      !this.trappingInited ||
      (this.tabTrapper.removeAttribute("tabindex"),
      this.tabTrapper.removeAttribute("aria-hidden"));
  }
  get document() {
    return this.root.ownerDocument || document;
  }
  get topOverlay() {
    return this.overlays.slice(-1)[0];
  }
  findOverlayForContent(e) {
    for (const n of this.overlays) if (e === n.overlayContent) return n;
  }
  addEventListeners() {
    this._eventsAreBound ||
      ((this._eventsAreBound = !0),
      this.document.addEventListener("click", this.handleMouseCapture, !0),
      this.document.addEventListener("click", this.handleMouse),
      this.document.addEventListener("keydown", this.handleKeydown),
      this.document.addEventListener(
        "sp-overlay-close",
        this.handleOverlayClose,
      ),
      window.addEventListener("resize", this.handleResize));
  }
  isClickOverlayActiveForTrigger(e) {
    return this.overlays.some(
      (n) => e === n.trigger && n.interaction === "click",
    );
  }
  async openOverlay(e) {
    if ((this.addEventListeners(), this.findOverlayForContent(e.content)))
      return !1;
    e.notImmediatelyClosable && (this._doesNotCloseOnFirstClick = !0),
      e.interaction === "modal" && this.startTabTrapping();
    const n = e.content,
      { trigger: o } = e;
    if (
      (n.overlayWillOpenCallback && n.overlayWillOpenCallback({ trigger: o }),
      e.delayed)
    ) {
      const r = [this.overlayTimer.openTimer(e.content)];
      e.abortPromise && r.push(e.abortPromise);
      const a = await Promise.race(r);
      if (a)
        return (
          n.overlayOpenCancelledCallback &&
            n.overlayOpenCancelledCallback({ trigger: o }),
          a
        );
    }
    if (
      (e.root && this.closeOverlaysForRoot(e.root), e.interaction === "click")
    )
      this.closeAllHoverOverlays();
    else if (
      e.interaction === "hover" &&
      this.isClickOverlayActiveForTrigger(e.trigger)
    )
      return !0;
    const i = S.create(e);
    this.overlays.length &&
      this.overlays[this.overlays.length - 1].obscure(i.interaction),
      document.body.appendChild(i),
      await Ct(),
      this.overlays.push(i),
      await i.updateComplete,
      this.addOverlayEventListeners(i),
      typeof n.open < "u" && (await Ct(), (n.open = !0));
    let s = () => {};
    if (n.overlayOpenCallback) {
      const { trigger: r } = i,
        { overlayOpenCallback: a } = n;
      s = async () => await a({ trigger: r });
    }
    return await i.openCallback(s), !1;
  }
  addOverlayEventListeners(e) {
    switch (
      (e.addEventListener("close", () => {
        this.hideAndCloseOverlay(e, !0);
      }),
      e.interaction)
    ) {
      case "replace":
        this.addReplaceOverlayEventListeners(e);
        break;
      case "inline":
        this.addInlineOverlayEventListeners(e);
        break;
    }
  }
  addReplaceOverlayEventListeners(e) {
    e.addEventListener("keydown", (n) => {
      const { code: o } = n;
      o === "Tab" &&
        (n.stopPropagation(),
        this.closeOverlay(e.overlayContent),
        (e.tabbingAway = !0),
        e.trigger.focus(),
        e.trigger.dispatchEvent(new KeyboardEvent("keydown", n)));
    });
  }
  addInlineOverlayEventListeners(e) {
    e.trigger.addEventListener("keydown", e.handleInlineTriggerKeydown),
      e.addEventListener("keydown", (n) => {
        const { code: o, shiftKey: i } = n;
        if (o !== "Tab") return;
        if (((e.tabbingAway = !0), i)) {
          const r = document.createElement("span");
          (r.tabIndex = -1),
            e.trigger.hasAttribute("slot") && (r.slot = e.trigger.slot),
            e.trigger.insertAdjacentElement("afterend", r),
            r.focus(),
            r.remove();
          return;
        }
        n.stopPropagation();
        const s = e.trigger;
        typeof s.open < "u" && (s.open = !1),
          this.closeOverlay(e.overlayContent),
          e.trigger.focus();
      });
  }
  closeOverlay(e) {
    this.overlayTimer.close(e),
      requestAnimationFrame(() => {
        const n = this.findOverlayForContent(e),
          o = [n];
        o.push(...ot(n, this.overlays)),
          o.forEach((i) => this.hideAndCloseOverlay(i));
      });
  }
  closeAllHoverOverlays() {
    for (const e of this.overlays)
      e.interaction === "hover" && this.hideAndCloseOverlay(e, !1);
  }
  closeOverlaysForRoot(e) {
    const n = [];
    for (const o of this.overlays)
      o.root && o.root === e && (n.push(o), n.push(...ot(o, this.overlays)));
    n.forEach((o) => this.hideAndCloseOverlay(o, !0, !0));
  }
  async manageFocusAfterCloseWhenOverlaysRemain(e, n) {
    const o = this.overlays[this.overlays.length - 1];
    if ((o.feature(), o.interaction === "modal" || o.hasModalRoot)) {
      if (e) return;
      await (n || o).focus();
    } else this.stopTabTrapping();
  }
  manageFocusAfterCloseWhenLastOverlay(e) {
    this.stopTabTrapping();
    const n = e.interaction === "modal",
      o = e.receivesFocus === "auto",
      i = e.interaction === "replace",
      s = e.interaction === "inline",
      r = (i || s) && !e.tabbingAway;
    if (((e.tabbingAway = !1), !n && !o && !r)) return;
    const a = e.overlayContent.getRootNode().activeElement;
    let l, c;
    const h = () => e.overlayContent.contains(a),
      d = () => (
        (l = e.trigger.getRootNode()), (c = l.activeElement), l.contains(c)
      ),
      u = () => l.host && l.host === c;
    (n || h() || d() || u()) && e.trigger.focus();
  }
  async hideAndCloseOverlay(e, n, o) {
    if (!e) return;
    const i = e.overlayContent;
    if (typeof i.overlayWillCloseCallback < "u") {
      const { trigger: r } = e;
      if (i.overlayWillCloseCallback({ trigger: r })) return;
    }
    if (
      (await e.hide(n),
      typeof i.open < "u" && (i.open = !1),
      i.overlayCloseCallback)
    ) {
      const { trigger: r } = e;
      await i.overlayCloseCallback({ trigger: r });
    }
    if (e.state != "dispose") return;
    const s = this.overlays.indexOf(e);
    s >= 0 && this.overlays.splice(s, 1),
      this.overlays.length
        ? await this.manageFocusAfterCloseWhenOverlaysRemain(
            o || e.interaction === "hover",
            e.trigger,
          )
        : this.manageFocusAfterCloseWhenLastOverlay(e),
      await e.updateComplete,
      e.remove(),
      e.dispose(),
      e.trigger.dispatchEvent(
        new CustomEvent("sp-closed", {
          bubbles: !0,
          composed: !0,
          cancelable: !0,
          detail: { interaction: e.interaction },
        }),
      );
  }
  closeTopOverlay() {
    return this.hideAndCloseOverlay(this.topOverlay, !0);
  }
}
const Q = class {
  constructor(t, e, n) {
    (this.isOpen = !1),
      (this.owner = t),
      (this.overlayElement = n),
      (this.interaction = e);
  }
  static async open(t, e, n, o) {
    const i = new Q(t, e, n);
    return (
      await i.open(o),
      () => {
        i.close();
      }
    );
  }
  static update() {
    const t = new CustomEvent("sp-update-overlays", {
      bubbles: !0,
      composed: !0,
      cancelable: !0,
    });
    document.dispatchEvent(t);
  }
  async open({
    abortPromise: t,
    delayed: e,
    offset: n = 0,
    placement: o = "top",
    receivesFocus: i,
    notImmediatelyClosable: s,
    virtualTrigger: r,
    root: a,
  }) {
    if (this.isOpen) return !0;
    e === void 0 && (e = this.overlayElement.hasAttribute("delayed"));
    const l = { color: void 0, scale: void 0, lang: void 0, theme: void 0 },
      c = new CustomEvent("sp-query-theme", {
        bubbles: !0,
        composed: !0,
        detail: l,
        cancelable: !0,
      });
    this.owner.dispatchEvent(c);
    const h = {},
      d = new CustomEvent("sp-overlay-query", {
        bubbles: !0,
        composed: !0,
        detail: h,
        cancelable: !0,
      });
    return (
      this.overlayElement.dispatchEvent(d),
      await Q.overlayStack.openOverlay({
        abortPromise: t,
        content: this.overlayElement,
        contentTip: h.overlayContentTipElement,
        delayed: e,
        offset: n,
        placement: o,
        trigger: this.owner,
        interaction: this.interaction,
        theme: l,
        receivesFocus: i,
        root: a,
        notImmediatelyClosable: s,
        virtualTrigger: r,
        ...h,
      }),
      (this.isOpen = !0),
      !0
    );
  }
  close() {
    Q.overlayStack.closeOverlay(this.overlayElement);
  }
};
let ye = Q;
ye.overlayStack = new ve();
export { ye as Overlay };
