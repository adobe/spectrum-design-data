(function () {
  const t = document.createElement("link").relList;
  if (t && t.supports && t.supports("modulepreload")) return;
  for (const o of document.querySelectorAll('link[rel="modulepreload"]')) r(o);
  new MutationObserver((o) => {
    for (const s of o)
      if (s.type === "childList")
        for (const i of s.addedNodes)
          i.tagName === "LINK" && i.rel === "modulepreload" && r(i);
  }).observe(document, { childList: !0, subtree: !0 });
  function e(o) {
    const s = {};
    return (
      o.integrity && (s.integrity = o.integrity),
      o.referrerpolicy && (s.referrerPolicy = o.referrerpolicy),
      o.crossorigin === "use-credentials"
        ? (s.credentials = "include")
        : o.crossorigin === "anonymous"
        ? (s.credentials = "omit")
        : (s.credentials = "same-origin"),
      s
    );
  }
  function r(o) {
    if (o.ep) return;
    o.ep = !0;
    const s = e(o);
    fetch(o.href, s);
  }
})();
const ee = window,
  de =
    ee.ShadowRoot &&
    (ee.ShadyCSS === void 0 || ee.ShadyCSS.nativeShadow) &&
    "adoptedStyleSheets" in Document.prototype &&
    "replace" in CSSStyleSheet.prototype,
  Xe = Symbol(),
  nr = new WeakMap();
let Fr = class {
  constructor(t, e, r) {
    if (((this._$cssResult$ = !0), r !== Xe))
      throw Error(
        "CSSResult is not constructable. Use `unsafeCSS` or `css` instead.",
      );
    (this.cssText = t), (this.t = e);
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (de && t === void 0) {
      const r = e !== void 0 && e.length === 1;
      r && (t = nr.get(e)),
        t === void 0 &&
          ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText),
          r && nr.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const $o = (a) => new Fr(typeof a == "string" ? a : a + "", void 0, Xe),
  v = (a, ...t) => {
    const e =
      a.length === 1
        ? a[0]
        : t.reduce(
            (r, o, s) =>
              r +
              ((i) => {
                if (i._$cssResult$ === !0) return i.cssText;
                if (typeof i == "number") return i;
                throw Error(
                  "Value passed to 'css' function must be a 'css' function result: " +
                    i +
                    ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.",
                );
              })(o) +
              a[s + 1],
            a[0],
          );
    return new Fr(e, a, Xe);
  },
  Co = (a, t) => {
    de
      ? (a.adoptedStyleSheets = t.map((e) =>
          e instanceof CSSStyleSheet ? e : e.styleSheet,
        ))
      : t.forEach((e) => {
          const r = document.createElement("style"),
            o = ee.litNonce;
          o !== void 0 && r.setAttribute("nonce", o),
            (r.textContent = e.cssText),
            a.appendChild(r);
        });
  },
  ur = de
    ? (a) => a
    : (a) =>
        a instanceof CSSStyleSheet
          ? ((t) => {
              let e = "";
              for (const r of t.cssRules) e += r.cssText;
              return $o(e);
            })(a)
          : a;
var fe;
const ce = window,
  dr = ce.trustedTypes,
  So = dr ? dr.emptyScript : "",
  pr = ce.reactiveElementPolyfillSupport,
  je = {
    toAttribute(a, t) {
      switch (t) {
        case Boolean:
          a = a ? So : null;
          break;
        case Object:
        case Array:
          a = a == null ? a : JSON.stringify(a);
      }
      return a;
    },
    fromAttribute(a, t) {
      let e = a;
      switch (t) {
        case Boolean:
          e = a !== null;
          break;
        case Number:
          e = a === null ? null : Number(a);
          break;
        case Object:
        case Array:
          try {
            e = JSON.parse(a);
          } catch {
            e = null;
          }
      }
      return e;
    },
  },
  Mr = (a, t) => t !== a && (t == t || a == a),
  ye = {
    attribute: !0,
    type: String,
    converter: je,
    reflect: !1,
    hasChanged: Mr,
  };
let wt = class extends HTMLElement {
  constructor() {
    super(),
      (this._$Ei = new Map()),
      (this.isUpdatePending = !1),
      (this.hasUpdated = !1),
      (this._$El = null),
      this.u();
  }
  static addInitializer(t) {
    var e;
    this.finalize(),
      ((e = this.h) !== null && e !== void 0 ? e : (this.h = [])).push(t);
  }
  static get observedAttributes() {
    this.finalize();
    const t = [];
    return (
      this.elementProperties.forEach((e, r) => {
        const o = this._$Ep(r, e);
        o !== void 0 && (this._$Ev.set(o, r), t.push(o));
      }),
      t
    );
  }
  static createProperty(t, e = ye) {
    if (
      (e.state && (e.attribute = !1),
      this.finalize(),
      this.elementProperties.set(t, e),
      !e.noAccessor && !this.prototype.hasOwnProperty(t))
    ) {
      const r = typeof t == "symbol" ? Symbol() : "__" + t,
        o = this.getPropertyDescriptor(t, r, e);
      o !== void 0 && Object.defineProperty(this.prototype, t, o);
    }
  }
  static getPropertyDescriptor(t, e, r) {
    return {
      get() {
        return this[e];
      },
      set(o) {
        const s = this[t];
        (this[e] = o), this.requestUpdate(t, s, r);
      },
      configurable: !0,
      enumerable: !0,
    };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) || ye;
  }
  static finalize() {
    if (this.hasOwnProperty("finalized")) return !1;
    this.finalized = !0;
    const t = Object.getPrototypeOf(this);
    if (
      (t.finalize(),
      t.h !== void 0 && (this.h = [...t.h]),
      (this.elementProperties = new Map(t.elementProperties)),
      (this._$Ev = new Map()),
      this.hasOwnProperty("properties"))
    ) {
      const e = this.properties,
        r = [
          ...Object.getOwnPropertyNames(e),
          ...Object.getOwnPropertySymbols(e),
        ];
      for (const o of r) this.createProperty(o, e[o]);
    }
    return (this.elementStyles = this.finalizeStyles(this.styles)), !0;
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const r = new Set(t.flat(1 / 0).reverse());
      for (const o of r) e.unshift(ur(o));
    } else t !== void 0 && e.push(ur(t));
    return e;
  }
  static _$Ep(t, e) {
    const r = e.attribute;
    return r === !1
      ? void 0
      : typeof r == "string"
      ? r
      : typeof t == "string"
      ? t.toLowerCase()
      : void 0;
  }
  u() {
    var t;
    (this._$E_ = new Promise((e) => (this.enableUpdating = e))),
      (this._$AL = new Map()),
      this._$Eg(),
      this.requestUpdate(),
      (t = this.constructor.h) === null ||
        t === void 0 ||
        t.forEach((e) => e(this));
  }
  addController(t) {
    var e, r;
    ((e = this._$ES) !== null && e !== void 0 ? e : (this._$ES = [])).push(t),
      this.renderRoot !== void 0 &&
        this.isConnected &&
        ((r = t.hostConnected) === null || r === void 0 || r.call(t));
  }
  removeController(t) {
    var e;
    (e = this._$ES) === null ||
      e === void 0 ||
      e.splice(this._$ES.indexOf(t) >>> 0, 1);
  }
  _$Eg() {
    this.constructor.elementProperties.forEach((t, e) => {
      this.hasOwnProperty(e) && (this._$Ei.set(e, this[e]), delete this[e]);
    });
  }
  createRenderRoot() {
    var t;
    const e =
      (t = this.shadowRoot) !== null && t !== void 0
        ? t
        : this.attachShadow(this.constructor.shadowRootOptions);
    return Co(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    var t;
    this.renderRoot === void 0 && (this.renderRoot = this.createRenderRoot()),
      this.enableUpdating(!0),
      (t = this._$ES) === null ||
        t === void 0 ||
        t.forEach((e) => {
          var r;
          return (r = e.hostConnected) === null || r === void 0
            ? void 0
            : r.call(e);
        });
  }
  enableUpdating(t) {}
  disconnectedCallback() {
    var t;
    (t = this._$ES) === null ||
      t === void 0 ||
      t.forEach((e) => {
        var r;
        return (r = e.hostDisconnected) === null || r === void 0
          ? void 0
          : r.call(e);
      });
  }
  attributeChangedCallback(t, e, r) {
    this._$AK(t, r);
  }
  _$EO(t, e, r = ye) {
    var o;
    const s = this.constructor._$Ep(t, r);
    if (s !== void 0 && r.reflect === !0) {
      const i = (
        ((o = r.converter) === null || o === void 0
          ? void 0
          : o.toAttribute) !== void 0
          ? r.converter
          : je
      ).toAttribute(e, r.type);
      (this._$El = t),
        i == null ? this.removeAttribute(s) : this.setAttribute(s, i),
        (this._$El = null);
    }
  }
  _$AK(t, e) {
    var r;
    const o = this.constructor,
      s = o._$Ev.get(t);
    if (s !== void 0 && this._$El !== s) {
      const i = o.getPropertyOptions(s),
        c =
          typeof i.converter == "function"
            ? { fromAttribute: i.converter }
            : ((r = i.converter) === null || r === void 0
                ? void 0
                : r.fromAttribute) !== void 0
            ? i.converter
            : je;
      (this._$El = s),
        (this[s] = c.fromAttribute(e, i.type)),
        (this._$El = null);
    }
  }
  requestUpdate(t, e, r) {
    let o = !0;
    t !== void 0 &&
      (((r = r || this.constructor.getPropertyOptions(t)).hasChanged || Mr)(
        this[t],
        e,
      )
        ? (this._$AL.has(t) || this._$AL.set(t, e),
          r.reflect === !0 &&
            this._$El !== t &&
            (this._$EC === void 0 && (this._$EC = new Map()),
            this._$EC.set(t, r)))
        : (o = !1)),
      !this.isUpdatePending && o && (this._$E_ = this._$Ej());
  }
  async _$Ej() {
    this.isUpdatePending = !0;
    try {
      await this._$E_;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && (await t), !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var t;
    if (!this.isUpdatePending) return;
    this.hasUpdated,
      this._$Ei &&
        (this._$Ei.forEach((o, s) => (this[s] = o)), (this._$Ei = void 0));
    let e = !1;
    const r = this._$AL;
    try {
      (e = this.shouldUpdate(r)),
        e
          ? (this.willUpdate(r),
            (t = this._$ES) === null ||
              t === void 0 ||
              t.forEach((o) => {
                var s;
                return (s = o.hostUpdate) === null || s === void 0
                  ? void 0
                  : s.call(o);
              }),
            this.update(r))
          : this._$Ek();
    } catch (o) {
      throw ((e = !1), this._$Ek(), o);
    }
    e && this._$AE(r);
  }
  willUpdate(t) {}
  _$AE(t) {
    var e;
    (e = this._$ES) === null ||
      e === void 0 ||
      e.forEach((r) => {
        var o;
        return (o = r.hostUpdated) === null || o === void 0
          ? void 0
          : o.call(r);
      }),
      this.hasUpdated || ((this.hasUpdated = !0), this.firstUpdated(t)),
      this.updated(t);
  }
  _$Ek() {
    (this._$AL = new Map()), (this.isUpdatePending = !1);
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$E_;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$EC !== void 0 &&
      (this._$EC.forEach((e, r) => this._$EO(r, this[r], e)),
      (this._$EC = void 0)),
      this._$Ek();
  }
  updated(t) {}
  firstUpdated(t) {}
};
(wt.finalized = !0),
  (wt.elementProperties = new Map()),
  (wt.elementStyles = []),
  (wt.shadowRootOptions = { mode: "open" }),
  pr == null || pr({ ReactiveElement: wt }),
  ((fe = ce.reactiveElementVersions) !== null && fe !== void 0
    ? fe
    : (ce.reactiveElementVersions = [])
  ).push("1.4.2");
var ke;
const le = window,
  Ct = le.trustedTypes,
  mr = Ct ? Ct.createPolicy("lit-html", { createHTML: (a) => a }) : void 0,
  X = `lit$${(Math.random() + "").slice(9)}$`,
  We = "?" + X,
  _o = `<${We}>`,
  St = document,
  Ut = (a = "") => St.createComment(a),
  Rt = (a) => a === null || (typeof a != "object" && typeof a != "function"),
  Dr = Array.isArray,
  qr = (a) =>
    Dr(a) || typeof (a == null ? void 0 : a[Symbol.iterator]) == "function",
  Nt = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,
  br = /-->/g,
  hr = />/g,
  lt = RegExp(
    `>|[ 	
\f\r](?:([^\\s"'>=/]+)([ 	
\f\r]*=[ 	
\f\r]*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,
    "g",
  ),
  gr = /'/g,
  vr = /"/g,
  Br = /^(?:script|style|textarea|title)$/i,
  Hr = (a) => (t, ...e) => ({ _$litType$: a, strings: t, values: e }),
  d = Hr(1),
  fr = Hr(2),
  M = Symbol.for("lit-noChange"),
  z = Symbol.for("lit-nothing"),
  yr = new WeakMap(),
  $t = St.createTreeWalker(St, 129, null, !1),
  Ur = (a, t) => {
    const e = a.length - 1,
      r = [];
    let o,
      s = t === 2 ? "<svg>" : "",
      i = Nt;
    for (let n = 0; n < e; n++) {
      const u = a[n];
      let m,
        b,
        p = -1,
        h = 0;
      for (; h < u.length && ((i.lastIndex = h), (b = i.exec(u)), b !== null); )
        (h = i.lastIndex),
          i === Nt
            ? b[1] === "!--"
              ? (i = br)
              : b[1] !== void 0
              ? (i = hr)
              : b[2] !== void 0
              ? (Br.test(b[2]) && (o = RegExp("</" + b[2], "g")), (i = lt))
              : b[3] !== void 0 && (i = lt)
            : i === lt
            ? b[0] === ">"
              ? ((i = o ?? Nt), (p = -1))
              : b[1] === void 0
              ? (p = -2)
              : ((p = i.lastIndex - b[2].length),
                (m = b[1]),
                (i = b[3] === void 0 ? lt : b[3] === '"' ? vr : gr))
            : i === vr || i === gr
            ? (i = lt)
            : i === br || i === hr
            ? (i = Nt)
            : ((i = lt), (o = void 0));
      const g = i === lt && a[n + 1].startsWith("/>") ? " " : "";
      s +=
        i === Nt
          ? u + _o
          : p >= 0
          ? (r.push(m), u.slice(0, p) + "$lit$" + u.slice(p) + X + g)
          : u + X + (p === -2 ? (r.push(void 0), n) : g);
    }
    const c = s + (a[e] || "<?>") + (t === 2 ? "</svg>" : "");
    if (!Array.isArray(a) || !a.hasOwnProperty("raw"))
      throw Error("invalid template strings array");
    return [mr !== void 0 ? mr.createHTML(c) : c, r];
  };
class Gt {
  constructor({ strings: t, _$litType$: e }, r) {
    let o;
    this.parts = [];
    let s = 0,
      i = 0;
    const c = t.length - 1,
      n = this.parts,
      [u, m] = Ur(t, e);
    if (
      ((this.el = Gt.createElement(u, r)),
      ($t.currentNode = this.el.content),
      e === 2)
    ) {
      const b = this.el.content,
        p = b.firstChild;
      p.remove(), b.append(...p.childNodes);
    }
    for (; (o = $t.nextNode()) !== null && n.length < c; ) {
      if (o.nodeType === 1) {
        if (o.hasAttributes()) {
          const b = [];
          for (const p of o.getAttributeNames())
            if (p.endsWith("$lit$") || p.startsWith(X)) {
              const h = m[i++];
              if ((b.push(p), h !== void 0)) {
                const g = o.getAttribute(h.toLowerCase() + "$lit$").split(X),
                  f = /([.?@])?(.*)/.exec(h);
                n.push({
                  type: 1,
                  index: s,
                  name: f[2],
                  strings: g,
                  ctor:
                    f[1] === "."
                      ? Gr
                      : f[1] === "?"
                      ? Kr
                      : f[1] === "@"
                      ? Vr
                      : Kt,
                });
              } else n.push({ type: 6, index: s });
            }
          for (const p of b) o.removeAttribute(p);
        }
        if (Br.test(o.tagName)) {
          const b = o.textContent.split(X),
            p = b.length - 1;
          if (p > 0) {
            o.textContent = Ct ? Ct.emptyScript : "";
            for (let h = 0; h < p; h++)
              o.append(b[h], Ut()),
                $t.nextNode(),
                n.push({ type: 2, index: ++s });
            o.append(b[p], Ut());
          }
        }
      } else if (o.nodeType === 8)
        if (o.data === We) n.push({ type: 2, index: s });
        else {
          let b = -1;
          for (; (b = o.data.indexOf(X, b + 1)) !== -1; )
            n.push({ type: 7, index: s }), (b += X.length - 1);
        }
      s++;
    }
  }
  static createElement(t, e) {
    const r = St.createElement("template");
    return (r.innerHTML = t), r;
  }
}
function ut(a, t, e = a, r) {
  var o, s, i, c;
  if (t === M) return t;
  let n =
    r !== void 0
      ? (o = e._$Co) === null || o === void 0
        ? void 0
        : o[r]
      : e._$Cl;
  const u = Rt(t) ? void 0 : t._$litDirective$;
  return (
    (n == null ? void 0 : n.constructor) !== u &&
      ((s = n == null ? void 0 : n._$AO) === null ||
        s === void 0 ||
        s.call(n, !1),
      u === void 0 ? (n = void 0) : ((n = new u(a)), n._$AT(a, e, r)),
      r !== void 0
        ? (((i = (c = e)._$Co) !== null && i !== void 0 ? i : (c._$Co = []))[
            r
          ] = n)
        : (e._$Cl = n)),
    n !== void 0 && (t = ut(a, n._$AS(a, t.values), n, r)),
    t
  );
}
class Rr {
  constructor(t, e) {
    (this.u = []), (this._$AN = void 0), (this._$AD = t), (this._$AM = e);
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  v(t) {
    var e;
    const {
        el: { content: r },
        parts: o,
      } = this._$AD,
      s = (
        (e = t == null ? void 0 : t.creationScope) !== null && e !== void 0
          ? e
          : St
      ).importNode(r, !0);
    $t.currentNode = s;
    let i = $t.nextNode(),
      c = 0,
      n = 0,
      u = o[0];
    for (; u !== void 0; ) {
      if (c === u.index) {
        let m;
        u.type === 2
          ? (m = new Et(i, i.nextSibling, this, t))
          : u.type === 1
          ? (m = new u.ctor(i, u.name, u.strings, this, t))
          : u.type === 6 && (m = new Yr(i, this, t)),
          this.u.push(m),
          (u = o[++n]);
      }
      c !== (u == null ? void 0 : u.index) && ((i = $t.nextNode()), c++);
    }
    return s;
  }
  p(t) {
    let e = 0;
    for (const r of this.u)
      r !== void 0 &&
        (r.strings !== void 0
          ? (r._$AI(t, r, e), (e += r.strings.length - 2))
          : r._$AI(t[e])),
        e++;
  }
}
class Et {
  constructor(t, e, r, o) {
    var s;
    (this.type = 2),
      (this._$AH = z),
      (this._$AN = void 0),
      (this._$AA = t),
      (this._$AB = e),
      (this._$AM = r),
      (this.options = o),
      (this._$Cm =
        (s = o == null ? void 0 : o.isConnected) === null || s === void 0 || s);
  }
  get _$AU() {
    var t, e;
    return (e = (t = this._$AM) === null || t === void 0 ? void 0 : t._$AU) !==
      null && e !== void 0
      ? e
      : this._$Cm;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && t.nodeType === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    (t = ut(this, t, e)),
      Rt(t)
        ? t === z || t == null || t === ""
          ? (this._$AH !== z && this._$AR(), (this._$AH = z))
          : t !== this._$AH && t !== M && this.g(t)
        : t._$litType$ !== void 0
        ? this.$(t)
        : t.nodeType !== void 0
        ? this.T(t)
        : qr(t)
        ? this.k(t)
        : this.g(t);
  }
  O(t, e = this._$AB) {
    return this._$AA.parentNode.insertBefore(t, e);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), (this._$AH = this.O(t)));
  }
  g(t) {
    this._$AH !== z && Rt(this._$AH)
      ? (this._$AA.nextSibling.data = t)
      : this.T(St.createTextNode(t)),
      (this._$AH = t);
  }
  $(t) {
    var e;
    const { values: r, _$litType$: o } = t,
      s =
        typeof o == "number"
          ? this._$AC(t)
          : (o.el === void 0 && (o.el = Gt.createElement(o.h, this.options)),
            o);
    if (((e = this._$AH) === null || e === void 0 ? void 0 : e._$AD) === s)
      this._$AH.p(r);
    else {
      const i = new Rr(s, this),
        c = i.v(this.options);
      i.p(r), this.T(c), (this._$AH = i);
    }
  }
  _$AC(t) {
    let e = yr.get(t.strings);
    return e === void 0 && yr.set(t.strings, (e = new Gt(t))), e;
  }
  k(t) {
    Dr(this._$AH) || ((this._$AH = []), this._$AR());
    const e = this._$AH;
    let r,
      o = 0;
    for (const s of t)
      o === e.length
        ? e.push((r = new Et(this.O(Ut()), this.O(Ut()), this, this.options)))
        : (r = e[o]),
        r._$AI(s),
        o++;
    o < e.length && (this._$AR(r && r._$AB.nextSibling, o), (e.length = o));
  }
  _$AR(t = this._$AA.nextSibling, e) {
    var r;
    for (
      (r = this._$AP) === null || r === void 0 || r.call(this, !1, !0, e);
      t && t !== this._$AB;
    ) {
      const o = t.nextSibling;
      t.remove(), (t = o);
    }
  }
  setConnected(t) {
    var e;
    this._$AM === void 0 &&
      ((this._$Cm = t),
      (e = this._$AP) === null || e === void 0 || e.call(this, t));
  }
}
let Kt = class {
  constructor(t, e, r, o, s) {
    (this.type = 1),
      (this._$AH = z),
      (this._$AN = void 0),
      (this.element = t),
      (this.name = e),
      (this._$AM = o),
      (this.options = s),
      r.length > 2 || r[0] !== "" || r[1] !== ""
        ? ((this._$AH = Array(r.length - 1).fill(new String())),
          (this.strings = r))
        : (this._$AH = z);
  }
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t, e = this, r, o) {
    const s = this.strings;
    let i = !1;
    if (s === void 0)
      (t = ut(this, t, e, 0)),
        (i = !Rt(t) || (t !== this._$AH && t !== M)),
        i && (this._$AH = t);
    else {
      const c = t;
      let n, u;
      for (t = s[0], n = 0; n < s.length - 1; n++)
        (u = ut(this, c[r + n], e, n)),
          u === M && (u = this._$AH[n]),
          i || (i = !Rt(u) || u !== this._$AH[n]),
          u === z ? (t = z) : t !== z && (t += (u ?? "") + s[n + 1]),
          (this._$AH[n] = u);
    }
    i && !o && this.j(t);
  }
  j(t) {
    t === z
      ? this.element.removeAttribute(this.name)
      : this.element.setAttribute(this.name, t ?? "");
  }
};
class Gr extends Kt {
  constructor() {
    super(...arguments), (this.type = 3);
  }
  j(t) {
    this.element[this.name] = t === z ? void 0 : t;
  }
}
const Eo = Ct ? Ct.emptyScript : "";
class Kr extends Kt {
  constructor() {
    super(...arguments), (this.type = 4);
  }
  j(t) {
    t && t !== z
      ? this.element.setAttribute(this.name, Eo)
      : this.element.removeAttribute(this.name);
  }
}
class Vr extends Kt {
  constructor(t, e, r, o, s) {
    super(t, e, r, o, s), (this.type = 5);
  }
  _$AI(t, e = this) {
    var r;
    if ((t = (r = ut(this, t, e, 0)) !== null && r !== void 0 ? r : z) === M)
      return;
    const o = this._$AH,
      s =
        (t === z && o !== z) ||
        t.capture !== o.capture ||
        t.once !== o.once ||
        t.passive !== o.passive,
      i = t !== z && (o === z || s);
    s && this.element.removeEventListener(this.name, this, o),
      i && this.element.addEventListener(this.name, this, t),
      (this._$AH = t);
  }
  handleEvent(t) {
    var e, r;
    typeof this._$AH == "function"
      ? this._$AH.call(
          (r =
            (e = this.options) === null || e === void 0 ? void 0 : e.host) !==
            null && r !== void 0
            ? r
            : this.element,
          t,
        )
      : this._$AH.handleEvent(t);
  }
}
let Yr = class {
  constructor(t, e, r) {
    (this.element = t),
      (this.type = 6),
      (this._$AN = void 0),
      (this._$AM = e),
      (this.options = r);
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    ut(this, t);
  }
};
const Ao = {
    P: "$lit$",
    A: X,
    M: We,
    C: 1,
    L: Ur,
    R: Rr,
    D: qr,
    V: ut,
    I: Et,
    H: Kt,
    N: Kr,
    U: Vr,
    B: Gr,
    F: Yr,
  },
  kr = le.litHtmlPolyfillSupport;
kr == null || kr(Gt, Et),
  ((ke = le.litHtmlVersions) !== null && ke !== void 0
    ? ke
    : (le.litHtmlVersions = [])
  ).push("2.4.0");
const To = (a, t, e) => {
  var r, o;
  const s =
    (r = e == null ? void 0 : e.renderBefore) !== null && r !== void 0 ? r : t;
  let i = s._$litPart$;
  if (i === void 0) {
    const c =
      (o = e == null ? void 0 : e.renderBefore) !== null && o !== void 0
        ? o
        : null;
    s._$litPart$ = i = new Et(t.insertBefore(Ut(), c), c, void 0, e ?? {});
  }
  return i._$AI(a), i;
};
var xe, we;
let j = class extends wt {
  constructor() {
    super(...arguments),
      (this.renderOptions = { host: this }),
      (this._$Do = void 0);
  }
  createRenderRoot() {
    var t, e;
    const r = super.createRenderRoot();
    return (
      ((t = (e = this.renderOptions).renderBefore) !== null && t !== void 0) ||
        (e.renderBefore = r.firstChild),
      r
    );
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected),
      super.update(t),
      (this._$Do = To(e, this.renderRoot, this.renderOptions));
  }
  connectedCallback() {
    var t;
    super.connectedCallback(),
      (t = this._$Do) === null || t === void 0 || t.setConnected(!0);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(),
      (t = this._$Do) === null || t === void 0 || t.setConnected(!1);
  }
  render() {
    return M;
  }
};
(j.finalized = !0),
  (j._$litElement$ = !0),
  (xe = globalThis.litElementHydrateSupport) === null ||
    xe === void 0 ||
    xe.call(globalThis, { LitElement: j });
const xr = globalThis.litElementPolyfillSupport;
xr == null || xr({ LitElement: j });
((we = globalThis.litElementVersions) !== null && we !== void 0
  ? we
  : (globalThis.litElementVersions = [])
).push("3.2.2");
const Oo = (a) => (t) =>
  typeof t == "function"
    ? ((e, r) => (customElements.define(e, r), r))(a, t)
    : ((e, r) => {
        const { kind: o, elements: s } = r;
        return {
          kind: o,
          elements: s,
          finisher(i) {
            customElements.define(e, i);
          },
        };
      })(a, t);
const Po = (a, t) =>
  t.kind === "method" && t.descriptor && !("value" in t.descriptor)
    ? {
        ...t,
        finisher(e) {
          e.createProperty(t.key, a);
        },
      }
    : {
        kind: "field",
        key: Symbol(),
        placement: "own",
        descriptor: {},
        originalKey: t.key,
        initializer() {
          typeof t.initializer == "function" &&
            (this[t.key] = t.initializer.call(this));
        },
        finisher(e) {
          e.createProperty(t.key, a);
        },
      };
function l(a) {
  return (t, e) =>
    e !== void 0
      ? ((r, o, s) => {
          o.constructor.createProperty(s, r);
        })(a, t, e)
      : Po(a, t);
}
function Xr(a) {
  return l({ ...a, state: !0 });
}
const Ze =
  ({ finisher: a, descriptor: t }) =>
  (e, r) => {
    var o;
    if (r === void 0) {
      const s = (o = e.originalKey) !== null && o !== void 0 ? o : e.key,
        i =
          t != null
            ? {
                kind: "method",
                placement: "prototype",
                key: s,
                descriptor: t(e.key),
              }
            : { ...e, key: s };
      return (
        a != null &&
          (i.finisher = function (c) {
            a(c, s);
          }),
        i
      );
    }
    {
      const s = e.constructor;
      t !== void 0 && Object.defineProperty(e, r, t(r)), a == null || a(s, r);
    }
  };
function W(a, t) {
  return Ze({
    descriptor: (e) => {
      const r = {
        get() {
          var o, s;
          return (s =
            (o = this.renderRoot) === null || o === void 0
              ? void 0
              : o.querySelector(a)) !== null && s !== void 0
            ? s
            : null;
        },
        enumerable: !0,
        configurable: !0,
      };
      if (t) {
        const o = typeof e == "symbol" ? Symbol() : "__" + e;
        r.get = function () {
          var s, i;
          return (
            this[o] === void 0 &&
              (this[o] =
                (i =
                  (s = this.renderRoot) === null || s === void 0
                    ? void 0
                    : s.querySelector(a)) !== null && i !== void 0
                  ? i
                  : null),
            this[o]
          );
        };
      }
      return r;
    },
  });
}
var ze;
const Io =
  ((ze = window.HTMLSlotElement) === null || ze === void 0
    ? void 0
    : ze.prototype.assignedElements) != null
    ? (a, t) => a.assignedElements(t)
    : (a, t) =>
        a.assignedNodes(t).filter((e) => e.nodeType === Node.ELEMENT_NODE);
function No(a) {
  const { slot: t, selector: e } = a ?? {};
  return Ze({
    descriptor: (r) => ({
      get() {
        var o;
        const s = "slot" + (t ? `[name=${t}]` : ":not([name])"),
          i =
            (o = this.renderRoot) === null || o === void 0
              ? void 0
              : o.querySelector(s),
          c = i != null ? Io(i, a) : [];
        return e ? c.filter((n) => n.matches(e)) : c;
      },
      enumerable: !0,
      configurable: !0,
    }),
  });
}
function jo(a, t, e) {
  let r,
    o = a;
  return (
    typeof a == "object" ? ((o = a.slot), (r = a)) : (r = { flatten: t }),
    e
      ? No({ slot: o, flatten: t, selector: e })
      : Ze({
          descriptor: (s) => ({
            get() {
              var i, c;
              const n = "slot" + (o ? `[name=${o}]` : ":not([name])"),
                u =
                  (i = this.renderRoot) === null || i === void 0
                    ? void 0
                    : i.querySelector(n);
              return (c = u == null ? void 0 : u.assignedNodes(r)) !== null &&
                c !== void 0
                ? c
                : [];
            },
            enumerable: !0,
            configurable: !0,
          }),
        })
  );
}
function Lo() {
  return new Worker(
    "" + new URL("graph-layout-f190626e.js", import.meta.url).href,
  );
}
function Wr() {
  return Math.random().toString(36).substring(7);
}
function x(a, t, e = {}) {
  a.dispatchEvent(
    new CustomEvent(t, {
      bubbles: !0,
      cancelable: !0,
      composed: !0,
      detail: e,
    }),
  );
}
const Fo = (a, t) => {
    let e = null;
    return (...o) => {
      e !== null && (clearTimeout(e), (e = null)),
        (e = setTimeout(() => a(...o), t));
    };
  },
  Mo = 2,
  Do = 300,
  qo = "gesture-start",
  Bo = "gesture-drag-move",
  Ho = "gesture-drag-start",
  Uo = "gesture-drag-end",
  Ro = "gesture-click",
  Go = "gesture-doubleclick",
  Ko = "gesture-singleclick";
class pe {
  constructor(t, e) {
    (this.startPoint = { x: 0, y: 0 }),
      (this.currentPoint = { x: 0, y: 0 }),
      (this.priorPoint = { x: 0, y: 0 }),
      (this.totalDistance = 0),
      (this.isDragGesture = !1),
      (this.waitingForDoubleClick = !1),
      (this.active = !1),
      (this.promiseResolve = () => {}),
      (this.id = Wr()),
      (this.boundUpHandler = this.handlePointerUp.bind(this)),
      (this.boundMoveHandler = this.handlePointerMove.bind(this)),
      (this.boundDownHandler = this.handlePointerDown.bind(this)),
      (this.element = e),
      (this.active = !0),
      (this.startPoint = { x: t.clientX, y: t.clientY }),
      (this.currentPoint = this.startPoint),
      (this.priorPoint = this.startPoint),
      document.body.addEventListener("pointermove", this.boundMoveHandler),
      document.body.addEventListener("pointerup", this.boundUpHandler),
      document.body.addEventListener("pointerdown", this.boundDownHandler),
      this.emitEvent(qo, t),
      (this.promise = new Promise((r) => {
        this.promiseResolve = r;
      }));
  }
  static distance(t, e) {
    return Math.sqrt((t.x - e.x) ** 2 + (t.y - e.y) ** 2);
  }
  emitEvent(t, e) {
    const { altKey: r, ctrlKey: o, shiftKey: s, metaKey: i } = e,
      c = {
        altKey: r,
        ctrlKey: o,
        shiftKey: s,
        metaKey: i,
        gestureId: this.id,
        deltaX: this.currentPoint.x - this.priorPoint.x,
        deltaY: this.currentPoint.y - this.priorPoint.y,
        totalDistance: this.totalDistance,
        totalDeltaX: this.currentPoint.x - this.startPoint.x,
        totalDeltaY: this.currentPoint.y - this.startPoint.y,
        startX: this.startPoint.x,
        startY: this.startPoint.y,
        currentX: this.currentPoint.x,
        currentY: this.currentPoint.y,
        originalEvent: e,
      };
    this.element.dispatchEvent(
      new CustomEvent(t, {
        bubbles: !0,
        cancelable: !0,
        composed: !0,
        detail: c,
      }),
    );
  }
  unbind() {
    document.body.removeEventListener("pointermove", this.boundMoveHandler),
      document.body.removeEventListener("pointerup", this.boundUpHandler),
      document.body.removeEventListener("pointerdown", this.boundDownHandler),
      (this.active = !1),
      this.promiseResolve("gesturecomplete");
  }
  handlePointerMove(t) {
    if (t.buttons === 0) {
      this.handlePointerUp(t);
      return;
    }
    (this.priorPoint = this.currentPoint),
      (this.currentPoint = { x: t.clientX, y: t.clientY }),
      (this.totalDistance = pe.distance(this.startPoint, this.currentPoint)),
      this.isDragGesture
        ? this.emitEvent(Bo, t)
        : this.totalDistance > Mo &&
          ((this.isDragGesture = !0), this.emitEvent(Ho, t));
  }
  handlePointerDown(t) {
    this.waitingForDoubleClick &&
      (this.emitEvent(Go, t),
      (this.waitingForDoubleClick = !1),
      this.waitingForDoubleClickTimeout &&
        clearTimeout(this.waitingForDoubleClickTimeout),
      this.unbind());
  }
  handlePointerUp(t) {
    this.isDragGesture
      ? (this.emitEvent(Uo, t), this.unbind())
      : this.waitingForDoubleClick ||
        (this.emitEvent(Ro, t),
        (this.waitingForDoubleClick = !0),
        (this.waitingForDoubleClickTimeout = setTimeout(() => {
          this.emitEvent(Ko, t),
            (this.waitingForDoubleClick = !1),
            this.unbind();
        }, Do)));
  }
}
async function wr(a) {
  const t = await fetch(a);
  if (!t.ok) throw new Error(`HTTP error! status: ${t.status}`);
  return await t.json();
}
const Zr = ":^;",
  Jr = ":*;",
  re = class {
    constructor() {
      (this._dirtyTopology = !0),
        (this._state = JSON.parse(JSON.stringify(re.DEFAULT_STATE))),
        (this._stringifiedState = "");
    }
    filter(a) {
      const t = new re(),
        e = Object.keys(this._state.nodes),
        r = Object.keys(this._state.adjacencyList);
      return (
        e.forEach((o) => {
          a(this._state.nodes[o]) &&
            t.createNode(JSON.parse(JSON.stringify(this._state.nodes[o])));
        }),
        r.forEach((o) => {
          t._state.nodes[o] &&
            this._state.adjacencyList[o].forEach((i) => {
              t._state.nodes[i] && t.createAdjacency(o, i);
            });
        }),
        t
      );
    }
    dirtyState() {
      this._stringifiedState = "";
    }
    get stringifiedState() {
      return (
        this._stringifiedState ||
          (this._dirtyTopology === !0 &&
            ((this._state.topologyKey = Wr()), (this._dirtyTopology = !1)),
          (this._stringifiedState = JSON.stringify(this._state))),
        this._stringifiedState
      );
    }
    orphanNodes() {
      let a = Object.keys(this._state.nodes);
      return (
        Object.values(this._state.adjacencyList).forEach(
          (e) => (a = a.filter((r) => !e.includes(r))),
        ),
        a
      );
    }
    hasNode(a) {
      return !!this._state.nodes[a];
    }
    createNode(a) {
      (this._state.nodes[a.id] = a), this.dirtyState();
    }
    updateNode(a, t) {
      const e = this._state.nodes[a];
      e && (Object.assign(e, t), this.dirtyState());
    }
    deleteNode(a) {
      delete this._state.nodes[a], delete this._state.adjacencyList[a];
      for (const t in this._state.adjacencyList) {
        const e = this._state.adjacencyList[t].indexOf(a);
        e >= 0 && this._state.adjacencyList[t].splice(e, 1);
      }
      (this._dirtyTopology = !0), this.dirtyState();
    }
    createAdjacency(a, t, e) {
      const r = this._state.adjacencyList[a] || [];
      if (
        (r.indexOf(t) === -1 && (r.push(t), (this._state.adjacencyList[a] = r)),
        e)
      ) {
        const o = this._state.nodes[a];
        if (o) {
          const s = o.adjacencyLabels || {};
          (s[t] = e), Object.assign(o, { adjacencyLabels: s });
        }
      }
      (this._dirtyTopology = !0), this.dirtyState();
    }
    deleteAdjacency(a, t) {
      const e = this._state.adjacencyList[a] || [],
        r = e.indexOf(t);
      r >= 0 && (e.splice(r, 1), (this._state.adjacencyList[a] = e)),
        (this._dirtyTopology = !0),
        this.dirtyState();
    }
    setSize(a, t) {
      (this._state.width = a), (this._state.height = t), this.dirtyState();
    }
    reset() {
      (this._state = JSON.parse(JSON.stringify(re.DEFAULT_STATE))),
        (this._dirtyTopology = !0),
        this.dirtyState();
    }
    get state() {
      return JSON.parse(this.stringifiedState);
    }
    set state(a) {
      (this._state = a), this.dirtyState();
    }
  };
let R = re;
R.DEFAULT_STATE = {
  width: 0,
  height: 0,
  topologyKey: "",
  nodes: {},
  adjacencyList: {},
};
const Le = class {
  constructor() {
    (this._state = JSON.parse(JSON.stringify(Le.DEFAULT_STATE))),
      (this._stringifiedState = "");
  }
  dirtyState() {
    this._stringifiedState = "";
  }
  get stringifiedState() {
    return (
      this._stringifiedState ||
        (this._stringifiedState = JSON.stringify(this._state)),
      this._stringifiedState
    );
  }
  setFullscreenMode(a) {
    (this._state.fullscreenMode = a), this.dirtyState();
  }
  setIsDragging(a) {
    (this._state.isDragging = a), this.dirtyState();
  }
  setPan(a, t) {
    (this._state.panX = a), (this._state.panY = t), this.dirtyState();
  }
  setZoom(a) {
    (this._state.zoom = a), this.dirtyState();
  }
  setHoverId(a) {
    a !== this._state.hoverNodeId &&
      ((this._state.hoverNodeId = a), this.dirtyState());
  }
  getSetFilters() {
    return JSON.parse(JSON.stringify(this._state.setFilters));
  }
  setSetFilters(a) {
    (this._state.setFilters = a), this.dirtyState();
  }
  getSelectedComponents() {
    return JSON.parse(JSON.stringify(this._state.selectedComponents));
  }
  setSelectedComponents(a) {
    (this._state.selectedComponents = a), this.dirtyState();
  }
  setSpectrumColorTheme(a) {
    (this._state.spectrumColorTheme = a), this.dirtyState();
  }
  getSelectedTokens() {
    return JSON.parse(JSON.stringify(this._state.selectedTokens));
  }
  setSelectedTokens(a) {
    (this._state.selectedTokens = a), this.dirtyState();
  }
  setSelectionAncestorNodes(a) {
    (this._state.selectionAncestorNodes = a), this.dirtyState();
  }
  setSelectionDescendentNodes(a) {
    (this._state.selectionDescendentNodes = a), this.dirtyState();
  }
  setSelectionDescendentIntersectNodes(a) {
    (this._state.selectionDescendentIntersectNodes = a), this.dirtyState();
  }
  setListOfComponents(a) {
    (this._state.listOfComponents = a), this.dirtyState();
  }
  setComponentDescendentNodes(a) {
    (this._state.componentDescendentNodes = a), this.dirtyState();
  }
  setHoverUpstreamNodes(a) {
    (this._state.hoverUpstreamNodes = a), this.dirtyState();
  }
  reset() {
    (this._state = JSON.parse(JSON.stringify(Le.DEFAULT_STATE))),
      this.dirtyState();
  }
  get state() {
    return JSON.parse(this.stringifiedState);
  }
  set state(a) {
    (this._state = JSON.parse(JSON.stringify(a))), this.dirtyState();
  }
};
let _t = Le;
_t.DEFAULT_STATE = {
  panX: 380,
  panY: 130,
  zoom: 0.7,
  spectrumColorTheme: "darkest",
  isDragging: !1,
  fullscreenMode: !1,
  hoverNodeId: "",
  setFilters: ["spectrum", "light", "desktop"],
  listOfComponents: [],
  selectedTokens: [],
  selectionAncestorNodes: [],
  selectionDescendentNodes: [],
  selectionDescendentIntersectNodes: [],
  componentDescendentNodes: [],
  selectedComponents: [],
  hoverUpstreamNodes: [],
};
const zr = "https://raw.githubusercontent.com/adobe/spectrum-tokens/beta/",
  Vo = "manifest.json";
class Yo {
  constructor() {
    (this.listOfComponents = []),
      (this.listOfOrphanTokens = []),
      (this._completeSpectrumTokenJson = {});
  }
  async getCompleteSpectrumTokenJson() {
    if (Object.keys(this._completeSpectrumTokenJson).length > 0)
      return this._completeSpectrumTokenJson;
    const t = await wr(zr + Vo),
      e = {};
    for (let r = 0; r < t.length; r++) {
      const o = await wr(zr + t[r]);
      Object.assign(e, o);
    }
    return e;
  }
  async getAllComponentNames() {
    if (this.listOfComponents.length > 0) return this.listOfComponents;
    const t = await this.getCompleteSpectrumTokenJson();
    return Object.keys(t).reduce((o, s) => {
      const i = t[s].component;
      return i && o.indexOf(i) === -1 && o.push(i), o;
    }, []);
  }
  async getFilteredGraphModel(t) {
    const e = new R(),
      r = await this.getCompleteSpectrumTokenJson(),
      o = Object.keys(r);
    for (let c = 0; c < o.length; c++) {
      const n = o[c],
        u = r[n],
        m = [],
        b = [];
      for (
        u.value && m.push({ path: [], value: u.value }),
          u.sets && b.push({ path: [], sets: u.sets }),
          u.component &&
            (e.hasNode(u.component) === !1 &&
              (e.createNode({ type: "component", id: u.component, x: 0, y: 0 }),
              this.listOfComponents.push(u.component)),
            e.createAdjacency(u.component, n));
        b.length > 0;
      ) {
        let h = b.pop(),
          g = h.sets,
          f = h.path;
        t.forEach((w) => {
          let S = g[w];
          const y = [...f, w];
          S &&
            (S.value && m.push({ path: y, value: S.value }),
            S.sets && b.push({ path: y, sets: S.sets }));
        });
      }
      e.createNode({ type: "token", id: n, x: 0, y: 0 });
      let p = [];
      m.forEach((h) => {
        const g = h.path;
        let f = h.value;
        if (f.charAt(0) + f.charAt(f.length - 1) === "{}") {
          const w = f.substring(1, f.length - 1),
            S = e._state.nodes[n],
            $ = (S.adjacencyLabels ? S.adjacencyLabels : {})[w] || "",
            L = $.length > 0 ? $.split(",") : [],
            A = [...new Set([...L, ...g])];
          e.createAdjacency(n, w, A.join(","));
        } else g.length > 0 && (f += `${Zr}${g.join(",")}`), p.push(f);
      }),
        p.length > 0 && e.updateNode(n, { value: p.join(Jr) });
    }
    let s = e.orphanNodes();
    s = s.filter((c) => e._state.nodes[c].type !== "component");
    const i = [];
    return (
      s.forEach((c) => {
        const u = c.split("-")[0];
        i.includes(u) ||
          (i.push(u),
          e.createNode({ type: "orphan-category", id: `${u}-*`, x: 0, y: 0 }));
      }),
      i.forEach((c) => {
        const n = `${c}-`;
        o.forEach((u) => {
          u.indexOf(n) === 0 && e.createAdjacency(`${c}-*`, u);
        });
      }),
      e
    );
  }
}
class Xo {
  constructor() {
    (this.newGraphStateCallbacks = []),
      (this.newDictionaryCallbacks = []),
      (this.selectedComponent = "slider"),
      (this.listOfComponents = []),
      (this.listOfOrphanNodes = []),
      (this.graphDataSource = new Yo()),
      (this.graphLayoutWorker = new Lo()),
      (this.graphLayoutWorker.onmessage =
        this.recieveNewGraphLayout.bind(this)),
      (this.completeGraphModel = new R()),
      (this.displayGraphModel = new R()),
      (this.baseDisplayGraphModel = new R()),
      (this.appState = JSON.parse(JSON.stringify(_t.DEFAULT_STATE)));
  }
  getNodeType(t) {
    const { type: e } = this.completeGraphModel._state.nodes[t];
    return e;
  }
  getDownstreamGraphFrom(...t) {
    const e = new R(),
      r = [...t],
      o = this.completeGraphModel.state;
    for (; r.length > 0; ) {
      const s = r.shift(),
        i = o.nodes[s];
      if (!i) continue;
      const c = o.adjacencyList[s] || [];
      r.push(...c),
        (e._state.nodes[s] = i),
        c.length > 0 && (e._state.adjacencyList[s] = c);
    }
    return e;
  }
  getUpstreamGraphFrom(t, e = this.completeGraphModel) {
    const r = new R(),
      o = [...t],
      s = e.state;
    for (; o.length > 0; ) {
      const i = o.shift(),
        c = s.nodes[i];
      if (c) {
        r._state.nodes[i] = c;
        for (const n in s.adjacencyList)
          s.adjacencyList[n].indexOf(i) >= 0 &&
            (r.hasNode(n) || o.push(n), r.createAdjacency(n, i));
      }
    }
    return r.dirtyState(), r;
  }
  getAncestorNodes(...t) {
    const e = this.getUpstreamGraphFrom(t);
    return Object.keys(e._state.nodes);
  }
  getDescendentNodes(...t) {
    const e = this.getDownstreamGraphFrom(...t);
    return Object.keys(e._state.nodes);
  }
  getDescendentIntersectNodes(...t) {
    const e = t.map((o) =>
      Object.keys(this.getDownstreamGraphFrom(o)._state.nodes),
    );
    return e.length <= 1
      ? []
      : e.reduce((o, s) => o.filter((i) => s.includes(i)));
  }
  assignGraphs(t, ...e) {
    return (
      e.forEach((r) => {
        Object.assign(t._state.nodes, r._state.nodes),
          Object.entries(r._state.adjacencyList).forEach(([o, s]) => {
            const i = t._state.adjacencyList[o];
            i
              ? (t._state.adjacencyList[o] = [...new Set([...i, ...s])])
              : (t._state.adjacencyList[o] = s);
          });
      }),
      t.dirtyState(),
      t
    );
  }
  async hydrateFromJson() {
    const t = this.appState.setFilters;
    (this.completeGraphModel = await this.graphDataSource.getFilteredGraphModel(
      t,
    )),
      (this.listOfComponents =
        await this.graphDataSource.getAllComponentNames()),
      (this.baseDisplayGraphModel = this.completeGraphModel.filter((e) => {
        const r = e.type === "component",
          o = e.type === "orphan-category";
        return r || o;
      })),
      this.updateDisplayGraph(),
      this.emitNewDictionary(),
      this.requestGraphLayout(this.displayGraphModel);
  }
  emitNewGraphState() {
    const t = this.displayGraphModel.state;
    this.newGraphStateCallbacks.forEach((e) =>
      e(t, [...this.listOfComponents]),
    );
  }
  emitNewDictionary() {
    const e = Object.keys(this.completeGraphModel._state.nodes).map((r) => {
      const o = this.completeGraphModel._state.nodes[r];
      return { value: r, type: o.type, metadata: o.value || "" };
    });
    this.newDictionaryCallbacks.forEach((r) => r(e));
  }
  onNewGraphState(t) {
    this.newGraphStateCallbacks.push(t);
  }
  onDictionaryAvailable(t) {
    this.newDictionaryCallbacks.push(t);
  }
  async doSomeMutation() {
    this.emitNewGraphState();
  }
  updateDisplayGraph() {
    const e =
        this.appState.selectedComponents.join(",") === "ALL"
          ? [...this.listOfComponents]
          : this.appState.selectedComponents,
      r = this.appState.selectedTokens,
      o = this.getDownstreamGraphFrom(...e),
      s = this.getUpstreamGraphFrom(r),
      i = this.getDownstreamGraphFrom(...r);
    this.displayGraphModel = this.assignGraphs(
      o,
      s,
      i,
      this.baseDisplayGraphModel,
    );
  }
  async setAppState(t) {
    let e = !1,
      r = !1;
    const o = this.appState.setFilters.join(","),
      s = t.setFilters.join(","),
      i = this.appState.selectedComponents.join(","),
      c = t.selectedComponents.join(","),
      n = this.appState.selectedTokens.join(","),
      u = t.selectedTokens.join(",");
    (i !== c || n !== u) && (e = !0),
      o !== s && (r = !0),
      (this.appState = t),
      r
        ? await this.hydrateFromJson()
        : e &&
          (this.updateDisplayGraph(),
          this.requestGraphLayout(this.displayGraphModel));
  }
  recieveNewGraphLayout(t) {
    (this.displayGraphModel.state = t.data), this.emitNewGraphState();
  }
  requestGraphLayout(t) {
    this.graphLayoutWorker.postMessage(t._state);
  }
  handleEvent(t, e) {
    switch (t) {
      case "node-dragmove":
        const r = this.appState.zoom,
          o = this.displayGraphModel._state.nodes[e.id],
          { deltaX: s, deltaY: i } = e.data;
        (o.x = o.x + s / r),
          (o.y = o.y + i / r),
          (this.displayGraphModel._state.nodes[e.id] = o),
          this.displayGraphModel.dirtyState();
        break;
    }
    this.emitNewGraphState();
  }
}
const Je = 450,
  Fe = 20,
  Me = 16,
  Qr = 2,
  to = 3,
  De = 0.1,
  qe = 2,
  $e = 55,
  qt = 250,
  Wo = ["theme", "color", "scale"],
  Zo = {
    theme: ["spectrum", "express"],
    color: ["light", "dark", "darkest", "wireframe"],
    scale: ["desktop", "mobile"],
  },
  Jo = { theme: "Theme", color: "Color Theme", scale: "Scale" };
class Qo {
  constructor({
    graphController: t,
    selectedComponents: e,
    selectedTokens: r,
    setFilters: o,
  }) {
    (this.newAppStateCallbacks = []),
      (this._priorTopologyKey = ""),
      (this._priorAppState = JSON.parse(JSON.stringify(_t.DEFAULT_STATE))),
      (this.graphController = t),
      (this.appModel = new _t()),
      this.initialize({
        selectedComponents: e,
        selectedTokens: r,
        setFilters: o,
      });
  }
  async initialize({
    selectedComponents: t,
    selectedTokens: e,
    setFilters: r,
  }) {
    this.graphController.setAppState(this.appModel.state),
      this.graphController.onNewGraphState(this.handleNewGraphState.bind(this)),
      await this.graphController.hydrateFromJson(),
      this.appModel.setListOfComponents(this.graphController.listOfComponents);
    const s =
      t.join(",") === "ALL" ? [...this.graphController.listOfComponents] : t;
    this.appModel.setSelectedComponents(s),
      this.appModel.setSelectedTokens(e),
      this.appModel.setSetFilters(r),
      this.emitNewAppState();
  }
  emitNewAppState() {
    const t = this.appModel.state;
    (this._priorAppState = t),
      this.newAppStateCallbacks.forEach((e) => e(t)),
      this.graphController.setAppState(t);
  }
  onNewAppState(t) {
    this.newAppStateCallbacks.push(t);
  }
  handleNewGraphState() {
    const t = this.appModel._state.fullscreenMode,
      e = this.graphController.displayGraphModel._state.topologyKey + t;
    if (this._priorTopologyKey === e) return;
    this._priorTopologyKey = e;
    const r = this.appModel._state.selectedTokens,
      o = this.appModel._state.selectedComponents,
      s = this.graphController.getAncestorNodes(...r),
      i = this.graphController.getDescendentNodes(...r, ...o),
      c = this.graphController.getDescendentIntersectNodes(...r, ...o);
    this.appModel.setSelectionAncestorNodes(s),
      this.appModel.setSelectionDescendentNodes(i),
      this.appModel.setSelectionDescendentIntersectNodes(c);
    const n = [...r, ...o, ...i, ...s];
    let u, m, b, p;
    const h = this.appModel._state.zoom;
    n.forEach((y) => {
      const $ = this.graphController.displayGraphModel._state.nodes[y];
      $ &&
        ((u = Math.min(u || $.x, $.x - 50)),
        (m = Math.min(m || $.y, $.y - 50)),
        (b = Math.max(b || $.x, $.x + 50 + Je)),
        (p = Math.max(p || $.y, $.y + 50 + Fe)));
    });
    const g = u || 0,
      f = b || 0,
      w = m || 0,
      S = p || 0;
    if (n.length >= 1) {
      const y = t ? 0 : qt,
        $ = t ? 0 : $e,
        L = window.innerWidth - y,
        A = window.innerHeight - $,
        I = f - g,
        k = S - w,
        V = 1 / Math.max((I * h) / L, (k * h) / A);
      let D = h * V;
      D = Math.min(qe, Math.max(De, D));
      const It = I * D,
        it = k * D,
        ct = g * D - y,
        gt = w * D - $,
        ve = (L - It) / 2,
        Wt = (A - it) / 2;
      this.appModel.setZoom(D), this.appModel.setPan(-ct + ve, -gt + Wt);
    }
    this.emitNewAppState();
  }
  handleHoverOver(t) {
    if (this.appModel._state.hoverNodeId === t) return;
    const e = this.graphController.getAncestorNodes(t),
      r = this.appModel._state.selectionAncestorNodes,
      o = this.appModel._state.selectionDescendentNodes,
      s = r.concat(o),
      i = e.filter((c) => s.includes(c));
    this.appModel.setHoverId(t), this.appModel.setHoverUpstreamNodes(i);
  }
  handleHoverOut(t) {
    this.appModel._state.hoverNodeId === t &&
      (this.appModel.setHoverId(""), this.appModel.setHoverUpstreamNodes([]));
  }
  toggleGraphNodeSelection(t, e = !1) {
    const r = this.graphController.completeGraphModel._state.nodes[t],
      o = r ? r.type === "component" : !1;
    let s = this.appModel.getSelectedComponents(),
      i = this.appModel.getSelectedTokens(),
      c = s.indexOf(t) >= 0 || i.indexOf(t) >= 0;
    c
      ? o
        ? s.splice(s.indexOf(t), 1)
        : i.splice(i.indexOf(t), 1)
      : e
      ? o
        ? s.push(t)
        : i.push(t)
      : o
      ? ((s = t ? [t] : []), (i = []))
      : ((s = []), (i = t ? [t] : []));
    let n = [...s, ...i];
    const u = this.graphController.getAncestorNodes(...n),
      m = this.graphController.getDescendentNodes(...n),
      b = this.graphController.getDescendentIntersectNodes(...n);
    c &&
      (this.appModel.setHoverId(""), this.appModel.setHoverUpstreamNodes([])),
      this.appModel.setSelectedComponents(s),
      this.appModel.setSelectedTokens(i),
      this.appModel.setSelectionAncestorNodes(u),
      this.appModel.setSelectionDescendentNodes(m),
      this.appModel.setSelectionDescendentIntersectNodes(b);
  }
  setZoomCenteredOnCanvas(t) {
    t = Math.min(qe, Math.max(De, t));
    const e = t / this.appModel._state.zoom,
      r = qt + (window.innerWidth - qt) / 2,
      o = $e + (window.innerHeight - $e) / 2,
      s = this.appModel._state.panX - r,
      i = this.appModel._state.panY - o,
      c = r + s * e,
      n = o + i * e;
    this.appModel.setPan(c, n), this.appModel.setZoom(t);
  }
  handleEvent(t, e) {
    switch (t) {
      case "node-pointerover":
        this.handleHoverOver(e.id);
        break;
      case "node-pointerout":
        this.handleHoverOut(e.id);
        break;
      case "generic-gesture-start":
      case "node-dragstart":
        this.appModel.setIsDragging(!0);
        break;
      case "generic-gesture-end":
      case "node-dragend":
        this.appModel.setIsDragging(!1);
        break;
      case "filters-selected":
        this.appModel.setSetFilters(e.value);
        break;
      case "set-fullscreen-mode":
        this.appModel.setFullscreenMode(e.value), this.handleNewGraphState();
        break;
      case "set-zoom":
        this.appModel.setZoom(e.value);
        break;
      case "set-zoom-centered-on-canvas":
        this.setZoomCenteredOnCanvas(e.value);
        break;
      case "select-id":
        this.toggleGraphNodeSelection(e.id, !0);
        break;
      case "panning-input-delta":
        const r = this.appModel._state.panX + e.x,
          o = this.appModel._state.panY + e.y;
        this.appModel.setPan(r, o);
        break;
      case "set-panning-position":
        this.appModel.setPan(e.x, e.y);
        break;
      case "close-tab":
        this.toggleGraphNodeSelection(e.value, !0);
        break;
      case "close-all-tabs":
        this.toggleGraphNodeSelection("", !1);
        break;
      case "node-click":
        this.toggleGraphNodeSelection(e.id, !0);
        break;
      case "set-spectrum-color-theme":
        this.appModel.setSpectrumColorTheme(e.value);
        break;
    }
    this.emitNewAppState();
  }
  async doSomeMutation() {
    this.emitNewAppState();
  }
}
var ta = Object.defineProperty,
  ea = Object.getOwnPropertyDescriptor,
  ra = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? ea(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && ta(t, e, o), o;
  };
const Be = new Set(),
  oa = () => {
    const a =
      document.documentElement.dir === "rtl"
        ? document.documentElement.dir
        : "ltr";
    Be.forEach((t) => {
      t.setAttribute("dir", a);
    });
  },
  aa = new MutationObserver(oa);
aa.observe(document.documentElement, {
  attributes: !0,
  attributeFilter: ["dir"],
});
const sa = (a) =>
  typeof a.startManagingContentDirection < "u" || a.tagName === "SP-THEME";
function ia(a) {
  class t extends a {
    constructor() {
      super(...arguments), (this.dir = "ltr");
    }
    get isLTR() {
      return this.dir === "ltr";
    }
    hasVisibleFocusInTree() {
      const r = this.getRootNode().activeElement;
      if (!r) return !1;
      try {
        return r.matches(":focus-visible") || r.matches(".focus-visible");
      } catch {
        return r.matches(".focus-visible");
      }
    }
    connectedCallback() {
      if (!this.hasAttribute("dir")) {
        let r = this.assignedSlot || this.parentNode;
        for (; r !== document.documentElement && !sa(r); )
          r = r.assignedSlot || r.parentNode || r.host;
        const o = this.dir;
        if (
          ((this.dir = r.dir === "rtl" ? r.dir : this.dir || "ltr"),
          o === this.dir && this.setAttribute("dir", this.dir),
          r === document.documentElement)
        )
          Be.add(this);
        else {
          const { localName: s } = r;
          s.search("-") > -1 && !customElements.get(s)
            ? customElements.whenDefined(s).then(() => {
                r.startManagingContentDirection(this);
              })
            : r.startManagingContentDirection(this);
        }
        this._dirParent = r;
      }
      super.connectedCallback();
    }
    disconnectedCallback() {
      super.disconnectedCallback(),
        this._dirParent &&
          (this._dirParent === document.documentElement
            ? Be.delete(this)
            : this._dirParent.stopManagingContentDirection(this),
          this.removeAttribute("dir"));
    }
  }
  return ra([l({ reflect: !0 })], t.prototype, "dir", 2), t;
}
class ot extends ia(j) {}
var ca = Object.defineProperty,
  la = Object.getOwnPropertyDescriptor,
  na = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? la(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && ca(t, e, o), o;
  };
function dt(
  a,
  {
    validSizes: t = ["s", "m", "l", "xl"],
    noDefaultSize: e,
    defaultSize: r = "m",
  } = {},
) {
  class o extends a {
    constructor() {
      super(...arguments), (this._size = r);
    }
    get size() {
      return this._size || r;
    }
    set size(i) {
      const c = e ? null : r,
        n = i && i.toLocaleLowerCase(),
        u = t.includes(n) ? n : c;
      if ((u && this.setAttribute("size", u), this._size === u)) return;
      const m = this._size;
      (this._size = u), this.requestUpdate("size", m);
    }
    update(i) {
      !this.hasAttribute("size") && !e && this.setAttribute("size", this.size),
        super.update(i);
    }
  }
  return na([l({ type: String, reflect: !0 })], o.prototype, "size", 1), o;
}
const ua = ["spectrum", "express"],
  da = ["medium", "large", "medium-express", "large-express"],
  pa = [
    "light",
    "lightest",
    "dark",
    "darkest",
    "light-express",
    "lightest-express",
    "dark-express",
    "darkest-express",
  ],
  P = class extends HTMLElement {
    constructor() {
      super(),
        (this._dir = ""),
        (this._theme = "spectrum"),
        (this._color = ""),
        (this._scale = ""),
        (this.trackedChildren = new Set()),
        (this._updateRequested = !1),
        (this._contextConsumers = new Map()),
        this.attachShadow({ mode: "open" });
      const t = document.importNode(P.template.content, !0);
      this.shadowRoot.appendChild(t),
        this.shouldAdoptStyles(),
        this.addEventListener("sp-query-theme", this.onQueryTheme),
        this.addEventListener(
          "sp-language-context",
          this._handleContextPresence,
        ),
        (this.updateComplete = this.__createDeferredPromise());
    }
    static get observedAttributes() {
      return ["color", "scale", "theme", "lang", "dir"];
    }
    set dir(t) {
      if (t === this.dir) return;
      this.setAttribute("dir", t), (this._dir = t);
      const e = t === "rtl" ? t : "ltr";
      this.trackedChildren.forEach((r) => {
        r.setAttribute("dir", e);
      });
    }
    get dir() {
      return this._dir;
    }
    attributeChangedCallback(t, e, r) {
      e !== r &&
        (t === "color"
          ? (this.color = r)
          : t === "scale"
          ? (this.scale = r)
          : t === "lang" && r
          ? ((this.lang = r), this._provideContext())
          : t === "theme"
          ? (this.theme = r)
          : t === "dir" && (this.dir = r));
    }
    requestUpdate() {
      window.ShadyCSS !== void 0 && !window.ShadyCSS.nativeShadow
        ? window.ShadyCSS.styleElement(this)
        : this.shouldAdoptStyles();
    }
    get theme() {
      const t = P.themeFragmentsByKind.get("theme"),
        { name: e } = (t && t.get("default")) || {};
      return this._theme || e || "";
    }
    set theme(t) {
      if (t === this._theme) return;
      const e = t && ua.includes(t) ? t : this.theme;
      e !== this._theme && ((this._theme = e), this.requestUpdate()),
        e ? this.setAttribute("theme", e) : this.removeAttribute("theme");
    }
    get color() {
      const t = P.themeFragmentsByKind.get("color"),
        { name: e } = (t && t.get("default")) || {};
      return this._color || e || "";
    }
    set color(t) {
      if (t === this._color) return;
      const e = t && pa.includes(t) ? t : this.color;
      e !== this._color && ((this._color = e), this.requestUpdate()),
        e ? this.setAttribute("color", e) : this.removeAttribute("color");
    }
    get scale() {
      const t = P.themeFragmentsByKind.get("scale"),
        { name: e } = (t && t.get("default")) || {};
      return this._scale || e || "";
    }
    set scale(t) {
      if (t === this._scale) return;
      const e = t && da.includes(t) ? t : this.scale;
      e !== this._scale && ((this._scale = e), this.requestUpdate()),
        e ? this.setAttribute("scale", e) : this.removeAttribute("scale");
    }
    get styles() {
      const t = [...P.themeFragmentsByKind.keys()],
        e = (r, o, s) => {
          const i =
              s && s !== "theme" && this.theme === "express"
                ? r.get(`${o}-express`)
                : r.get(o),
            c = o === "spectrum" || !s || this.hasAttribute(s);
          if (i && c) return i.styles;
        };
      return [
        ...t.reduce((r, o) => {
          const s = P.themeFragmentsByKind.get(o);
          let i;
          if (o === "app" || o === "core") i = e(s, o);
          else {
            const { [o]: c } = this;
            i = e(s, c, o);
          }
          return i && r.push(i), r;
        }, []),
      ];
    }
    static get template() {
      return (
        this.templateElement ||
          ((this.templateElement = document.createElement("template")),
          (this.templateElement.innerHTML = "<slot></slot>")),
        this.templateElement
      );
    }
    __createDeferredPromise() {
      return new Promise((t) => {
        this.__resolve = t;
      });
    }
    onQueryTheme(t) {
      if (t.defaultPrevented) return;
      t.preventDefault();
      const { detail: e } = t;
      (e.color = this.color || void 0),
        (e.scale = this.scale || void 0),
        (e.lang =
          this.lang || document.documentElement.lang || navigator.language),
        (e.theme = this.theme || void 0);
    }
    connectedCallback() {
      if (
        (this.shouldAdoptStyles(),
        window.ShadyCSS !== void 0 && window.ShadyCSS.styleElement(this),
        P.instances.add(this),
        !this.hasAttribute("dir"))
      ) {
        let t = this.assignedSlot || this.parentNode;
        for (; t !== document.documentElement && !(t instanceof P); )
          t = t.assignedSlot || t.parentNode || t.host;
        this.dir = t.dir === "rtl" ? t.dir : "ltr";
      }
    }
    disconnectedCallback() {
      P.instances.delete(this);
    }
    startManagingContentDirection(t) {
      this.trackedChildren.add(t);
    }
    stopManagingContentDirection(t) {
      this.trackedChildren.delete(t);
    }
    async shouldAdoptStyles() {
      this._updateRequested ||
        ((this.updateComplete = this.__createDeferredPromise()),
        (this._updateRequested = !0),
        (this._updateRequested = await !1),
        this.adoptStyles(),
        this.__resolve(!0));
    }
    adoptStyles() {
      const t = this.styles;
      if (
        window.ShadyCSS !== void 0 &&
        !window.ShadyCSS.nativeShadow &&
        window.ShadyCSS.ScopingShim
      ) {
        const e = [];
        for (const [r, o] of P.themeFragmentsByKind)
          for (const [s, { styles: i }] of o) {
            if (s === "default") continue;
            let c = i.cssText;
            P.defaultFragments.has(s) ||
              (c = c.replace(":host", `:host([${r}='${s}'])`)),
              e.push(c);
          }
        window.ShadyCSS.ScopingShim.prepareAdoptedCssText(e, this.localName),
          window.ShadyCSS.prepareTemplate(P.template, this.localName);
      } else if (de) {
        const e = [];
        for (const r of t) e.push(r.styleSheet);
        this.shadowRoot.adoptedStyleSheets = e;
      } else
        this.shadowRoot.querySelectorAll("style").forEach((e) => e.remove()),
          t.forEach((e) => {
            const r = document.createElement("style");
            (r.textContent = e.cssText), this.shadowRoot.appendChild(r);
          });
    }
    static registerThemeFragment(t, e, r) {
      const o = P.themeFragmentsByKind.get(e) || new Map();
      o.size === 0 &&
        (P.themeFragmentsByKind.set(e, o),
        o.set("default", { name: t, styles: r }),
        P.defaultFragments.add(t)),
        o.set(t, { name: t, styles: r }),
        P.instances.forEach((s) => s.shouldAdoptStyles());
    }
    _provideContext() {
      this._contextConsumers.forEach(([t, e]) => t(this.lang, e));
    }
    _handleContextPresence(t) {
      const e = t.composedPath()[0];
      if (this._contextConsumers.has(e)) return;
      this._contextConsumers.set(e, [
        t.detail.callback,
        () => this._contextConsumers.delete(e),
      ]);
      const [r, o] = this._contextConsumers.get(e) || [];
      r &&
        o &&
        r(this.lang || document.documentElement.lang || navigator.language, o);
    }
  };
let tt = P;
(tt.themeFragmentsByKind = new Map()),
  (tt.defaultFragments = new Set(["spectrum"])),
  (tt.instances = new Set());
customElements.define("sp-theme", tt);
const ma = v`
:host,:root{--spectrum-global-dimension-scale-factor:1;--spectrum-global-dimension-size-0:0px;--spectrum-global-dimension-size-10:1px;--spectrum-global-dimension-size-25:2px;--spectrum-global-dimension-size-30:2px;--spectrum-global-dimension-size-40:3px;--spectrum-global-dimension-size-50:4px;--spectrum-global-dimension-size-65:5px;--spectrum-global-dimension-size-75:6px;--spectrum-global-dimension-size-85:7px;--spectrum-global-dimension-size-100:8px;--spectrum-global-dimension-size-115:9px;--spectrum-global-dimension-size-125:10px;--spectrum-global-dimension-size-130:11px;--spectrum-global-dimension-size-150:12px;--spectrum-global-dimension-size-160:13px;--spectrum-global-dimension-size-175:14px;--spectrum-global-dimension-size-185:15px;--spectrum-global-dimension-size-200:16px;--spectrum-global-dimension-size-225:18px;--spectrum-global-dimension-size-250:20px;--spectrum-global-dimension-size-275:22px;--spectrum-global-dimension-size-300:24px;--spectrum-global-dimension-size-325:26px;--spectrum-global-dimension-size-350:28px;--spectrum-global-dimension-size-400:32px;--spectrum-global-dimension-size-450:36px;--spectrum-global-dimension-size-500:40px;--spectrum-global-dimension-size-550:44px;--spectrum-global-dimension-size-600:48px;--spectrum-global-dimension-size-650:52px;--spectrum-global-dimension-size-675:54px;--spectrum-global-dimension-size-700:56px;--spectrum-global-dimension-size-750:60px;--spectrum-global-dimension-size-800:64px;--spectrum-global-dimension-size-900:72px;--spectrum-global-dimension-size-1000:80px;--spectrum-global-dimension-size-1125:90px;--spectrum-global-dimension-size-1200:96px;--spectrum-global-dimension-size-1250:100px;--spectrum-global-dimension-size-1600:128px;--spectrum-global-dimension-size-1700:136px;--spectrum-global-dimension-size-1800:144px;--spectrum-global-dimension-size-2000:160px;--spectrum-global-dimension-size-2400:192px;--spectrum-global-dimension-size-2500:200px;--spectrum-global-dimension-size-3000:240px;--spectrum-global-dimension-size-3400:272px;--spectrum-global-dimension-size-3600:288px;--spectrum-global-dimension-size-4600:368px;--spectrum-global-dimension-size-5000:400px;--spectrum-global-dimension-size-6000:480px;--spectrum-global-dimension-font-size-25:10px;--spectrum-global-dimension-font-size-50:11px;--spectrum-global-dimension-font-size-75:12px;--spectrum-global-dimension-font-size-100:14px;--spectrum-global-dimension-font-size-150:15px;--spectrum-global-dimension-font-size-200:16px;--spectrum-global-dimension-font-size-300:18px;--spectrum-global-dimension-font-size-400:20px;--spectrum-global-dimension-font-size-500:22px;--spectrum-global-dimension-font-size-600:25px;--spectrum-global-dimension-font-size-700:28px;--spectrum-global-dimension-font-size-800:32px;--spectrum-global-dimension-font-size-900:36px;--spectrum-global-dimension-font-size-1000:40px;--spectrum-global-dimension-font-size-1100:45px;--spectrum-global-dimension-font-size-1200:50px;--spectrum-global-dimension-font-size-1300:60px;--spectrum-alias-item-text-padding-top-l:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-text-padding-bottom-s:var(--spectrum-global-dimension-static-size-65);--spectrum-alias-item-workflow-padding-left-m:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-rounded-workflow-padding-left-m:var(--spectrum-global-dimension-size-175);--spectrum-alias-item-rounded-workflow-padding-left-xl:21px;--spectrum-alias-item-mark-padding-top-m:var(--spectrum-global-dimension-static-size-75);--spectrum-alias-item-mark-padding-bottom-m:var(--spectrum-global-dimension-static-size-75);--spectrum-alias-item-mark-padding-left-m:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-control-1-size-l:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-control-1-size-xl:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-control-2-size-s:var(--spectrum-global-dimension-size-150);--spectrum-alias-item-control-3-height-s:var(--spectrum-global-dimension-size-150);--spectrum-alias-item-control-3-width-s:23px;--spectrum-alias-item-control-3-width-m:var(--spectrum-global-dimension-static-size-325);--spectrum-alias-item-control-3-width-l:29px;--spectrum-alias-item-control-3-width-xl:33px;--spectrum-alias-item-mark-size-m:var(--spectrum-global-dimension-size-250);--spectrum-alias-component-focusring-border-radius:var(--spectrum-global-dimension-static-size-65);--spectrum-alias-control-two-size-s:var(--spectrum-global-dimension-size-150);--spectrum-alias-control-three-height-s:var(--spectrum-global-dimension-size-150);--spectrum-alias-control-three-width-s:23px;--spectrum-alias-control-three-width-m:var(--spectrum-global-dimension-static-size-325);--spectrum-alias-control-three-width-l:29px;--spectrum-alias-control-three-width-xl:33px;--spectrum-alias-search-padding-left-m:var(--spectrum-global-dimension-size-125);--spectrum-alias-focus-ring-border-radius-regular:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-focus-ring-radius-default:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-workflow-icon-size-l:var(--spectrum-global-dimension-static-size-250);--spectrum-alias-ui-icon-chevron-size-75:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-chevron-size-100:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-chevron-size-200:var(--spectrum-global-dimension-static-size-150);--spectrum-alias-ui-icon-chevron-size-300:var(--spectrum-global-dimension-static-size-175);--spectrum-alias-ui-icon-chevron-size-400:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-ui-icon-chevron-size-500:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-ui-icon-checkmark-size-50:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-checkmark-size-75:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-checkmark-size-100:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-checkmark-size-200:var(--spectrum-global-dimension-static-size-150);--spectrum-alias-ui-icon-checkmark-size-300:var(--spectrum-global-dimension-static-size-175);--spectrum-alias-ui-icon-checkmark-size-400:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-ui-icon-checkmark-size-500:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-ui-icon-checkmark-size-600:var(--spectrum-global-dimension-static-size-225);--spectrum-alias-ui-icon-dash-size-50:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-ui-icon-dash-size-75:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-ui-icon-dash-size-100:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-dash-size-200:var(--spectrum-global-dimension-static-size-150);--spectrum-alias-ui-icon-dash-size-300:var(--spectrum-global-dimension-static-size-150);--spectrum-alias-ui-icon-dash-size-400:var(--spectrum-global-dimension-static-size-175);--spectrum-alias-ui-icon-dash-size-500:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-ui-icon-dash-size-600:var(--spectrum-global-dimension-static-size-225);--spectrum-alias-ui-icon-cross-size-75:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-ui-icon-cross-size-100:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-ui-icon-cross-size-200:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-cross-size-300:var(--spectrum-global-dimension-static-size-150);--spectrum-alias-ui-icon-cross-size-400:var(--spectrum-global-dimension-static-size-150);--spectrum-alias-ui-icon-cross-size-500:var(--spectrum-global-dimension-static-size-175);--spectrum-alias-ui-icon-cross-size-600:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-ui-icon-arrow-size-75:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-arrow-size-100:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-arrow-size-200:var(--spectrum-global-dimension-static-size-150);--spectrum-alias-ui-icon-arrow-size-300:var(--spectrum-global-dimension-static-size-175);--spectrum-alias-ui-icon-arrow-size-400:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-ui-icon-arrow-size-500:var(--spectrum-global-dimension-static-size-225);--spectrum-alias-ui-icon-arrow-size-600:var(--spectrum-global-dimension-static-size-250);--spectrum-alias-ui-icon-triplegripper-size-100-width:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-doublegripper-size-100-height:var(--spectrum-global-dimension-static-size-50);--spectrum-alias-ui-icon-singlegripper-size-100-height:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-ui-icon-cornertriangle-size-100:var(--spectrum-global-dimension-static-size-65);--spectrum-alias-ui-icon-cornertriangle-size-300:var(--spectrum-global-dimension-static-size-85);--spectrum-alias-ui-icon-asterisk-size-200:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-ui-icon-asterisk-size-300:var(--spectrum-global-dimension-static-size-125);--spectrum-alias-avatar-size-100:var(--spectrum-global-dimension-size-250);--spectrum-alias-avatar-size-400:var(--spectrum-global-dimension-size-350);--spectrum-alias-avatar-size-600:var(--spectrum-global-dimension-size-450);--spectrum-button-s-primary-fill-textonly-text-padding-bottom:var(--spectrum-global-dimension-static-size-65);--spectrum-button-m-primary-fill-texticon-padding-left:var(--spectrum-global-dimension-size-175);--spectrum-button-l-primary-fill-textonly-text-padding-top:var(--spectrum-global-dimension-size-115);--spectrum-button-xl-primary-fill-texticon-padding-left:21px;--spectrum-button-m-primary-outline-texticon-padding-left:var(--spectrum-global-dimension-size-175);--spectrum-dialog-confirm-title-text-size:var(--spectrum-alias-heading-s-text-size);--spectrum-dialog-confirm-description-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-dialog-confirm-padding:var(--spectrum-global-dimension-static-size-500);--spectrum-listitem-m-texticon-padding-left:var(--spectrum-global-dimension-size-125);--spectrum-listitem-m-textthumbnail-padding-left:var(--spectrum-global-dimension-size-125);--spectrum-picker-m-texticon-padding-left:var(--spectrum-global-dimension-size-125);--spectrum-progressbar-s-border-radius:var(--spectrum-global-dimension-static-size-25);--spectrum-progressbar-m-border-radius:var(--spectrum-global-dimension-static-size-40);--spectrum-progressbar-xl-border-radius:var(--spectrum-global-dimension-static-size-65);--spectrum-textfield-m-texticon-padding-left:var(--spectrum-global-dimension-size-125);--spectrum-tooltip-neutral-text-margin-bottom:var(--spectrum-global-dimension-static-size-65)}:host,:root{--spectrum-global-alias-appframe-border-size:2px}:host,:root{--spectrum-component-pill-edge-to-visual-75:10px;--spectrum-component-pill-edge-to-visual-100:14px;--spectrum-component-pill-edge-to-visual-200:18px;--spectrum-component-pill-edge-to-visual-300:21px;--spectrum-component-pill-edge-to-visual-only-75:4px;--spectrum-component-pill-edge-to-visual-only-100:7px;--spectrum-component-pill-edge-to-visual-only-200:10px;--spectrum-component-pill-edge-to-visual-only-300:13px;--spectrum-component-pill-edge-to-text-75:12px;--spectrum-component-pill-edge-to-text-100:16px;--spectrum-component-pill-edge-to-text-200:20px;--spectrum-component-pill-edge-to-text-300:24px;--spectrum-component-edge-to-visual-50:6px;--spectrum-component-edge-to-visual-75:7px;--spectrum-component-edge-to-visual-100:10px;--spectrum-component-edge-to-visual-200:13px;--spectrum-component-edge-to-visual-300:15px;--spectrum-component-edge-to-visual-only-50:3px;--spectrum-component-edge-to-visual-only-75:4px;--spectrum-component-edge-to-visual-only-100:7px;--spectrum-component-edge-to-visual-only-200:10px;--spectrum-component-edge-to-visual-only-300:13px;--spectrum-component-edge-to-text-50:8px;--spectrum-component-edge-to-text-75:9px;--spectrum-component-edge-to-text-100:12px;--spectrum-component-edge-to-text-200:15px;--spectrum-component-edge-to-text-300:18px;--spectrum-component-height-50:20px;--spectrum-component-height-75:24px;--spectrum-component-height-100:32px;--spectrum-component-height-200:40px;--spectrum-component-height-300:48px;--spectrum-component-top-to-workflow-icon-50:3px;--spectrum-component-top-to-workflow-icon-75:4px;--spectrum-component-top-to-workflow-icon-100:7px;--spectrum-component-top-to-workflow-icon-200:10px;--spectrum-component-top-to-workflow-icon-300:13px;--spectrum-component-top-to-text-50:3px;--spectrum-component-top-to-text-75:4px;--spectrum-component-top-to-text-100:6px;--spectrum-component-top-to-text-200:9px;--spectrum-component-top-to-text-300:12px;--spectrum-component-bottom-to-text-50:3px;--spectrum-component-bottom-to-text-75:5px;--spectrum-component-bottom-to-text-100:9px;--spectrum-component-bottom-to-text-200:11px;--spectrum-component-bottom-to-text-300:14px;--spectrum-component-to-menu-small:6px;--spectrum-component-to-menu-medium:6px;--spectrum-component-to-menu-large:7px;--spectrum-component-to-menu-extra-large:8px;--spectrum-action-bar-height:48px;--spectrum-action-bar-top-to-item-counter:14px;--spectrum-action-button-edge-to-hold-icon-extra-small:3px;--spectrum-action-button-edge-to-hold-icon-small:3px;--spectrum-action-button-edge-to-hold-icon-medium:4px;--spectrum-action-button-edge-to-hold-icon-large:5px;--spectrum-action-button-edge-to-hold-icon-extra-large:6px;--spectrum-field-label-text-to-asterisk-small:4px;--spectrum-field-label-text-to-asterisk-medium:4px;--spectrum-field-label-text-to-asterisk-large:5px;--spectrum-field-label-text-to-asterisk-extra-large:5px;--spectrum-field-label-top-to-asterisk-small:8px;--spectrum-field-label-top-to-asterisk-medium:12px;--spectrum-field-label-top-to-asterisk-large:15px;--spectrum-field-label-top-to-asterisk-extra-large:19px;--spectrum-field-label-top-margin-small:0px;--spectrum-field-label-top-margin-medium:4px;--spectrum-field-label-top-margin-large:4px;--spectrum-field-label-top-margin-extra-large:4px;--spectrum-field-label-to-component-quiet-small:-8px;--spectrum-field-label-to-component-quiet-medium:-8px;--spectrum-field-label-to-component-quiet-large:-12px;--spectrum-field-label-to-component-quiet-extra-large:-15px;--spectrum-help-text-top-to-workflow-icon-small:4px;--spectrum-help-text-top-to-workflow-icon-medium:3px;--spectrum-help-text-top-to-workflow-icon-large:6px;--spectrum-help-text-top-to-workflow-icon-extra-large:9px;--spectrum-in-line-alert-minimum-width:320px;--spectrum-menu-item-edge-to-content-not-selected-small:28px;--spectrum-menu-item-edge-to-content-not-selected-medium:32px;--spectrum-menu-item-edge-to-content-not-selected-large:38px;--spectrum-menu-item-edge-to-content-not-selected-extra-large:45px;--spectrum-menu-item-top-to-disclosure-icon-small:7px;--spectrum-menu-item-top-to-disclosure-icon-medium:11px;--spectrum-menu-item-top-to-disclosure-icon-large:14px;--spectrum-menu-item-top-to-disclosure-icon-extra-large:17px;--spectrum-meter-default-width:192px;--spectrum-meter-thickness-small:4px;--spectrum-meter-thickness-medium:6px;--spectrum-swatch-size-extra-small:16px;--spectrum-swatch-size-small:24px;--spectrum-swatch-size-medium:32px;--spectrum-swatch-size-large:40px;--spectrum-progress-bar-thickness-small:4px;--spectrum-progress-bar-thickness-medium:6px;--spectrum-progress-bar-thickness-large:8px;--spectrum-progress-bar-thickness-extra-large:10px;--spectrum-progress-circle-size-small:16px;--spectrum-progress-circle-size-medium:32px;--spectrum-progress-circle-size-large:64px;--spectrum-progress-circle-thickness-small:2px;--spectrum-progress-circle-thickness-medium:3px;--spectrum-progress-circle-thickness-large:4px;--spectrum-status-light-dot-size-small:8px;--spectrum-status-light-dot-size-medium:8px;--spectrum-status-light-dot-size-large:10px;--spectrum-status-light-dot-size-extra-large:10px;--spectrum-status-light-top-to-dot-small:8px;--spectrum-status-light-top-to-dot-medium:12px;--spectrum-status-light-top-to-dot-large:15px;--spectrum-status-light-top-to-dot-extra-large:19px;--spectrum-toast-height:48px;--spectrum-toast-top-to-workflow-icon:15px;--spectrum-toast-top-to-text:14px;--spectrum-toast-bottom-to-text:17px;--spectrum-tooltip-tip-width:8px;--spectrum-tooltip-tip-height:4px;--spectrum-tooltip-maximum-width:160px;--spectrum-tag-top-to-avatar-small:4px;--spectrum-tag-top-to-avatar-medium:6px;--spectrum-tag-top-to-avatar-large:9px;--spectrum-tag-top-to-cross-icon-small:8px;--spectrum-tag-top-to-cross-icon-medium:12px;--spectrum-tag-top-to-cross-icon-large:15px;--spectrum-thumbnail-size-50:16px;--spectrum-thumbnail-size-75:18px;--spectrum-thumbnail-size-100:20px;--spectrum-thumbnail-size-200:22px;--spectrum-thumbnail-size-300:26px;--spectrum-thumbnail-size-400:28px;--spectrum-thumbnail-size-500:32px;--spectrum-thumbnail-size-600:36px;--spectrum-thumbnail-size-700:40px;--spectrum-thumbnail-size-800:44px;--spectrum-thumbnail-size-900:50px;--spectrum-thumbnail-size-1000:56px;--spectrum-popover-top-to-content-area:4px;--spectrum-text-area-minimum-width:112px;--spectrum-text-area-minimum-height:56px;--spectrum-font-size-50:11px;--spectrum-font-size-75:12px;--spectrum-font-size-100:14px;--spectrum-font-size-200:16px;--spectrum-font-size-300:18px;--spectrum-font-size-400:20px;--spectrum-font-size-500:22px;--spectrum-font-size-600:25px;--spectrum-font-size-700:28px;--spectrum-font-size-800:32px;--spectrum-font-size-900:36px;--spectrum-font-size-1000:40px;--spectrum-font-size-1100:45px;--spectrum-font-size-1200:50px;--spectrum-font-size-1300:60px;--spectrum-workflow-icon-size-50:14px;--spectrum-workflow-icon-size-75:16px;--spectrum-workflow-icon-size-100:18px;--spectrum-workflow-icon-size-200:20px;--spectrum-workflow-icon-size-300:22px;--spectrum-text-to-visual-50:6px;--spectrum-text-to-visual-75:7px;--spectrum-text-to-visual-100:8px;--spectrum-text-to-visual-200:9px;--spectrum-text-to-visual-300:10px;--spectrum-text-to-control-75:9px;--spectrum-text-to-control-100:10px;--spectrum-text-to-control-200:11px;--spectrum-text-to-control-300:13px;--spectrum-field-edge-to-disclosure-icon-75:7px;--spectrum-field-edge-to-disclosure-icon-100:11px;--spectrum-field-edge-to-disclosure-icon-200:14px;--spectrum-field-edge-to-disclosure-icon-300:17px;--spectrum-field-top-to-alert-icon-small:4px;--spectrum-field-top-to-alert-icon-medium:7px;--spectrum-field-top-to-alert-icon-large:10px;--spectrum-field-top-to-alert-icon-extra-large:13px;--spectrum-field-top-to-validation-icon-small:7px;--spectrum-field-top-to-validation-icon-medium:11px;--spectrum-field-top-to-validation-icon-large:14px;--spectrum-field-top-to-validation-icon-extra-large:17px;--spectrum-field-top-to-progress-circle-small:4px;--spectrum-field-top-to-progress-circle-medium:8px;--spectrum-field-top-to-progress-circle-large:12px;--spectrum-field-top-to-progress-circle-extra-large:16px;--spectrum-field-edge-to-alert-icon-small:9px;--spectrum-field-edge-to-alert-icon-medium:12px;--spectrum-field-edge-to-alert-icon-large:15px;--spectrum-field-edge-to-alert-icon-extra-large:18px;--spectrum-field-edge-to-validation-icon-small:9px;--spectrum-field-edge-to-validation-icon-medium:12px;--spectrum-field-edge-to-validation-icon-large:15px;--spectrum-field-edge-to-validation-icon-extra-large:18px;--spectrum-field-text-to-alert-icon-small:8px;--spectrum-field-text-to-alert-icon-medium:12px;--spectrum-field-text-to-alert-icon-large:15px;--spectrum-field-text-to-alert-icon-extra-large:18px;--spectrum-field-text-to-validation-icon-small:8px;--spectrum-field-text-to-validation-icon-medium:12px;--spectrum-field-text-to-validation-icon-large:15px;--spectrum-field-text-to-validation-icon-extra-large:18px;--spectrum-character-count-to-field-quiet-small:-3px;--spectrum-character-count-to-field-quiet-medium:-3px;--spectrum-character-count-to-field-quiet-large:-3px;--spectrum-character-count-to-field-quiet-extra-large:-4px;--spectrum-side-label-character-count-to-field:12px;--spectrum-side-label-character-count-top-margin-small:4px;--spectrum-side-label-character-count-top-margin-medium:8px;--spectrum-side-label-character-count-top-margin-large:10px;--spectrum-side-label-character-count-top-margin-extra-large:13px;--spectrum-disclosure-indicator-top-to-disclosure-icon-small:7px;--spectrum-disclosure-indicator-top-to-disclosure-icon-medium:11px;--spectrum-disclosure-indicator-top-to-disclosure-icon-large:14px;--spectrum-disclosure-indicator-top-to-disclosure-icon-extra-large:17px}:host,:root{--spectrum-edge-to-visual-only-75:4px;--spectrum-edge-to-visual-only-100:7px;--spectrum-edge-to-visual-only-200:10px;--spectrum-edge-to-visual-only-300:13px}:host,:root{--spectrum-checkbox-control-size-small:12px;--spectrum-checkbox-control-size-medium:14px;--spectrum-checkbox-control-size-large:16px;--spectrum-checkbox-control-size-extra-large:18px;--spectrum-checkbox-top-to-control-small:6px;--spectrum-checkbox-top-to-control-medium:9px;--spectrum-checkbox-top-to-control-large:12px;--spectrum-checkbox-top-to-control-extra-large:15px;--spectrum-radio-button-control-size-small:12px;--spectrum-radio-button-control-size-medium:14px;--spectrum-radio-button-control-size-large:16px;--spectrum-radio-button-control-size-extra-large:18px;--spectrum-radio-button-top-to-control-small:6px;--spectrum-radio-button-top-to-control-medium:9px;--spectrum-radio-button-top-to-control-large:12px;--spectrum-radio-button-top-to-control-extra-large:15px;--spectrum-switch-control-width-small:23px;--spectrum-switch-control-width-medium:26px;--spectrum-switch-control-width-large:29px;--spectrum-switch-control-width-extra-large:33px;--spectrum-switch-control-height-small:12px;--spectrum-switch-control-height-medium:14px;--spectrum-switch-control-height-large:16px;--spectrum-switch-control-height-extra-large:18px;--spectrum-switch-top-to-control-small:6px;--spectrum-switch-top-to-control-medium:9px;--spectrum-switch-top-to-control-large:12px;--spectrum-switch-top-to-control-extra-large:15px;--spectrum-slider-control-height-small:14px;--spectrum-slider-control-height-medium:16px;--spectrum-slider-control-height-large:18px;--spectrum-slider-control-height-extra-large:20px;--spectrum-slider-handle-size-small:14px;--spectrum-slider-handle-size-medium:16px;--spectrum-slider-handle-size-large:18px;--spectrum-slider-handle-size-extra-large:20px;--spectrum-slider-handle-border-width-down-small:5px;--spectrum-slider-handle-border-width-down-medium:6px;--spectrum-slider-handle-border-width-down-large:7px;--spectrum-slider-handle-border-width-down-extra-large:8px;--spectrum-slider-bottom-to-handle-small:5px;--spectrum-slider-bottom-to-handle-medium:8px;--spectrum-slider-bottom-to-handle-large:11px;--spectrum-slider-bottom-to-handle-extra-large:14px;--spectrum-picker-visual-to-disclosure-icon-small:7px;--spectrum-picker-visual-to-disclosure-icon-medium:8px;--spectrum-picker-visual-to-disclosure-icon-large:9px;--spectrum-picker-visual-to-disclosure-icon-extra-large:10px;--spectrum-combo-box-visual-to-field-button-small:7px;--spectrum-combo-box-visual-to-field-button-medium:8px;--spectrum-combo-box-visual-to-field-button-large:9px;--spectrum-combo-box-visual-to-field-button-extra-large:10px;--spectrum-corner-radius-75:2px;--spectrum-corner-radius-100:4px;--spectrum-corner-radius-200:8px;--spectrum-drop-shadow-x:0px;--spectrum-drop-shadow-y:1px;--spectrum-drop-shadow-blur:4px}
`,
  ba = ma,
  ha = v`
:host,:root{--spectrum-global-animation-linear:cubic-bezier(0,0,1,1);--spectrum-global-animation-duration-0:0ms;--spectrum-global-animation-duration-100:130ms;--spectrum-global-animation-duration-200:160ms;--spectrum-global-animation-duration-300:190ms;--spectrum-global-animation-duration-400:220ms;--spectrum-global-animation-duration-500:250ms;--spectrum-global-animation-duration-600:300ms;--spectrum-global-animation-duration-700:350ms;--spectrum-global-animation-duration-800:400ms;--spectrum-global-animation-duration-900:450ms;--spectrum-global-animation-duration-1000:500ms;--spectrum-global-animation-duration-2000:1000ms;--spectrum-global-animation-duration-4000:2000ms;--spectrum-global-animation-ease-in-out:cubic-bezier(.45,0,.40,1);--spectrum-global-animation-ease-in:cubic-bezier(.50,0,1,1);--spectrum-global-animation-ease-out:cubic-bezier(0,0,0.40,1);--spectrum-global-animation-ease-linear:cubic-bezier(0,0,1,1);--spectrum-global-color-status:Verified;--spectrum-global-color-version:5.1.0;--spectrum-global-color-static-black-rgb:0,0,0;--spectrum-global-color-static-black:rgb(var(--spectrum-global-color-static-black-rgb));--spectrum-global-color-static-white-rgb:255,255,255;--spectrum-global-color-static-white:rgb(var(--spectrum-global-color-static-white-rgb));--spectrum-global-color-static-blue-rgb:0,87,191;--spectrum-global-color-static-blue:rgb(var(--spectrum-global-color-static-blue-rgb));--spectrum-global-color-static-gray-50-rgb:255,255,255;--spectrum-global-color-static-gray-50:rgb(var(--spectrum-global-color-static-gray-50-rgb));--spectrum-global-color-static-gray-75-rgb:255,255,255;--spectrum-global-color-static-gray-75:rgb(var(--spectrum-global-color-static-gray-75-rgb));--spectrum-global-color-static-gray-100-rgb:255,255,255;--spectrum-global-color-static-gray-100:rgb(var(--spectrum-global-color-static-gray-100-rgb));--spectrum-global-color-static-gray-200-rgb:235,235,235;--spectrum-global-color-static-gray-200:rgb(var(--spectrum-global-color-static-gray-200-rgb));--spectrum-global-color-static-gray-300-rgb:217,217,217;--spectrum-global-color-static-gray-300:rgb(var(--spectrum-global-color-static-gray-300-rgb));--spectrum-global-color-static-gray-400-rgb:179,179,179;--spectrum-global-color-static-gray-400:rgb(var(--spectrum-global-color-static-gray-400-rgb));--spectrum-global-color-static-gray-500-rgb:146,146,146;--spectrum-global-color-static-gray-500:rgb(var(--spectrum-global-color-static-gray-500-rgb));--spectrum-global-color-static-gray-600-rgb:110,110,110;--spectrum-global-color-static-gray-600:rgb(var(--spectrum-global-color-static-gray-600-rgb));--spectrum-global-color-static-gray-700-rgb:71,71,71;--spectrum-global-color-static-gray-700:rgb(var(--spectrum-global-color-static-gray-700-rgb));--spectrum-global-color-static-gray-800-rgb:34,34,34;--spectrum-global-color-static-gray-800:rgb(var(--spectrum-global-color-static-gray-800-rgb));--spectrum-global-color-static-gray-900-rgb:0,0,0;--spectrum-global-color-static-gray-900:rgb(var(--spectrum-global-color-static-gray-900-rgb));--spectrum-global-color-static-red-400-rgb:237,64,48;--spectrum-global-color-static-red-400:rgb(var(--spectrum-global-color-static-red-400-rgb));--spectrum-global-color-static-red-500-rgb:217,28,21;--spectrum-global-color-static-red-500:rgb(var(--spectrum-global-color-static-red-500-rgb));--spectrum-global-color-static-red-600-rgb:187,2,2;--spectrum-global-color-static-red-600:rgb(var(--spectrum-global-color-static-red-600-rgb));--spectrum-global-color-static-red-700-rgb:154,0,0;--spectrum-global-color-static-red-700:rgb(var(--spectrum-global-color-static-red-700-rgb));--spectrum-global-color-static-red-800-rgb:124,0,0;--spectrum-global-color-static-red-800:rgb(var(--spectrum-global-color-static-red-800-rgb));--spectrum-global-color-static-orange-400-rgb:250,139,26;--spectrum-global-color-static-orange-400:rgb(var(--spectrum-global-color-static-orange-400-rgb));--spectrum-global-color-static-orange-500-rgb:233,117,0;--spectrum-global-color-static-orange-500:rgb(var(--spectrum-global-color-static-orange-500-rgb));--spectrum-global-color-static-orange-600-rgb:209,97,0;--spectrum-global-color-static-orange-600:rgb(var(--spectrum-global-color-static-orange-600-rgb));--spectrum-global-color-static-orange-700-rgb:182,80,0;--spectrum-global-color-static-orange-700:rgb(var(--spectrum-global-color-static-orange-700-rgb));--spectrum-global-color-static-orange-800-rgb:155,64,0;--spectrum-global-color-static-orange-800:rgb(var(--spectrum-global-color-static-orange-800-rgb));--spectrum-global-color-static-yellow-200-rgb:250,237,123;--spectrum-global-color-static-yellow-200:rgb(var(--spectrum-global-color-static-yellow-200-rgb));--spectrum-global-color-static-yellow-300-rgb:250,224,23;--spectrum-global-color-static-yellow-300:rgb(var(--spectrum-global-color-static-yellow-300-rgb));--spectrum-global-color-static-yellow-400-rgb:238,205,0;--spectrum-global-color-static-yellow-400:rgb(var(--spectrum-global-color-static-yellow-400-rgb));--spectrum-global-color-static-yellow-500-rgb:221,185,0;--spectrum-global-color-static-yellow-500:rgb(var(--spectrum-global-color-static-yellow-500-rgb));--spectrum-global-color-static-yellow-600-rgb:201,164,0;--spectrum-global-color-static-yellow-600:rgb(var(--spectrum-global-color-static-yellow-600-rgb));--spectrum-global-color-static-yellow-700-rgb:181,144,0;--spectrum-global-color-static-yellow-700:rgb(var(--spectrum-global-color-static-yellow-700-rgb));--spectrum-global-color-static-yellow-800-rgb:160,125,0;--spectrum-global-color-static-yellow-800:rgb(var(--spectrum-global-color-static-yellow-800-rgb));--spectrum-global-color-static-chartreuse-300-rgb:176,222,27;--spectrum-global-color-static-chartreuse-300:rgb(var(--spectrum-global-color-static-chartreuse-300-rgb));--spectrum-global-color-static-chartreuse-400-rgb:157,203,13;--spectrum-global-color-static-chartreuse-400:rgb(var(--spectrum-global-color-static-chartreuse-400-rgb));--spectrum-global-color-static-chartreuse-500-rgb:139,182,4;--spectrum-global-color-static-chartreuse-500:rgb(var(--spectrum-global-color-static-chartreuse-500-rgb));--spectrum-global-color-static-chartreuse-600-rgb:122,162,0;--spectrum-global-color-static-chartreuse-600:rgb(var(--spectrum-global-color-static-chartreuse-600-rgb));--spectrum-global-color-static-chartreuse-700-rgb:106,141,0;--spectrum-global-color-static-chartreuse-700:rgb(var(--spectrum-global-color-static-chartreuse-700-rgb));--spectrum-global-color-static-chartreuse-800-rgb:90,120,0;--spectrum-global-color-static-chartreuse-800:rgb(var(--spectrum-global-color-static-chartreuse-800-rgb));--spectrum-global-color-static-celery-200-rgb:126,229,114;--spectrum-global-color-static-celery-200:rgb(var(--spectrum-global-color-static-celery-200-rgb));--spectrum-global-color-static-celery-300-rgb:87,212,86;--spectrum-global-color-static-celery-300:rgb(var(--spectrum-global-color-static-celery-300-rgb));--spectrum-global-color-static-celery-400-rgb:48,193,61;--spectrum-global-color-static-celery-400:rgb(var(--spectrum-global-color-static-celery-400-rgb));--spectrum-global-color-static-celery-500-rgb:15,172,38;--spectrum-global-color-static-celery-500:rgb(var(--spectrum-global-color-static-celery-500-rgb));--spectrum-global-color-static-celery-600-rgb:0,150,20;--spectrum-global-color-static-celery-600:rgb(var(--spectrum-global-color-static-celery-600-rgb));--spectrum-global-color-static-celery-700-rgb:0,128,15;--spectrum-global-color-static-celery-700:rgb(var(--spectrum-global-color-static-celery-700-rgb));--spectrum-global-color-static-celery-800-rgb:0,107,15;--spectrum-global-color-static-celery-800:rgb(var(--spectrum-global-color-static-celery-800-rgb));--spectrum-global-color-static-green-400-rgb:29,169,115;--spectrum-global-color-static-green-400:rgb(var(--spectrum-global-color-static-green-400-rgb));--spectrum-global-color-static-green-500-rgb:0,148,97;--spectrum-global-color-static-green-500:rgb(var(--spectrum-global-color-static-green-500-rgb));--spectrum-global-color-static-green-600-rgb:0,126,80;--spectrum-global-color-static-green-600:rgb(var(--spectrum-global-color-static-green-600-rgb));--spectrum-global-color-static-green-700-rgb:0,105,65;--spectrum-global-color-static-green-700:rgb(var(--spectrum-global-color-static-green-700-rgb));--spectrum-global-color-static-green-800-rgb:0,86,53;--spectrum-global-color-static-green-800:rgb(var(--spectrum-global-color-static-green-800-rgb));--spectrum-global-color-static-seafoam-200-rgb:75,206,199;--spectrum-global-color-static-seafoam-200:rgb(var(--spectrum-global-color-static-seafoam-200-rgb));--spectrum-global-color-static-seafoam-300-rgb:32,187,180;--spectrum-global-color-static-seafoam-300:rgb(var(--spectrum-global-color-static-seafoam-300-rgb));--spectrum-global-color-static-seafoam-400-rgb:0,166,160;--spectrum-global-color-static-seafoam-400:rgb(var(--spectrum-global-color-static-seafoam-400-rgb));--spectrum-global-color-static-seafoam-500-rgb:0,145,139;--spectrum-global-color-static-seafoam-500:rgb(var(--spectrum-global-color-static-seafoam-500-rgb));--spectrum-global-color-static-seafoam-600-rgb:0,124,118;--spectrum-global-color-static-seafoam-600:rgb(var(--spectrum-global-color-static-seafoam-600-rgb));--spectrum-global-color-static-seafoam-700-rgb:0,103,99;--spectrum-global-color-static-seafoam-700:rgb(var(--spectrum-global-color-static-seafoam-700-rgb));--spectrum-global-color-static-seafoam-800-rgb:10,83,80;--spectrum-global-color-static-seafoam-800:rgb(var(--spectrum-global-color-static-seafoam-800-rgb));--spectrum-global-color-static-blue-200-rgb:130,193,251;--spectrum-global-color-static-blue-200:rgb(var(--spectrum-global-color-static-blue-200-rgb));--spectrum-global-color-static-blue-300-rgb:98,173,247;--spectrum-global-color-static-blue-300:rgb(var(--spectrum-global-color-static-blue-300-rgb));--spectrum-global-color-static-blue-400-rgb:66,151,244;--spectrum-global-color-static-blue-400:rgb(var(--spectrum-global-color-static-blue-400-rgb));--spectrum-global-color-static-blue-500-rgb:27,127,245;--spectrum-global-color-static-blue-500:rgb(var(--spectrum-global-color-static-blue-500-rgb));--spectrum-global-color-static-blue-600-rgb:4,105,227;--spectrum-global-color-static-blue-600:rgb(var(--spectrum-global-color-static-blue-600-rgb));--spectrum-global-color-static-blue-700-rgb:0,87,190;--spectrum-global-color-static-blue-700:rgb(var(--spectrum-global-color-static-blue-700-rgb));--spectrum-global-color-static-blue-800-rgb:0,72,153;--spectrum-global-color-static-blue-800:rgb(var(--spectrum-global-color-static-blue-800-rgb));--spectrum-global-color-static-indigo-200-rgb:178,181,255;--spectrum-global-color-static-indigo-200:rgb(var(--spectrum-global-color-static-indigo-200-rgb));--spectrum-global-color-static-indigo-300-rgb:155,159,255;--spectrum-global-color-static-indigo-300:rgb(var(--spectrum-global-color-static-indigo-300-rgb));--spectrum-global-color-static-indigo-400-rgb:132,137,253;--spectrum-global-color-static-indigo-400:rgb(var(--spectrum-global-color-static-indigo-400-rgb));--spectrum-global-color-static-indigo-500-rgb:109,115,246;--spectrum-global-color-static-indigo-500:rgb(var(--spectrum-global-color-static-indigo-500-rgb));--spectrum-global-color-static-indigo-600-rgb:87,93,232;--spectrum-global-color-static-indigo-600:rgb(var(--spectrum-global-color-static-indigo-600-rgb));--spectrum-global-color-static-indigo-700-rgb:68,74,208;--spectrum-global-color-static-indigo-700:rgb(var(--spectrum-global-color-static-indigo-700-rgb));--spectrum-global-color-static-indigo-800-rgb:68,74,208;--spectrum-global-color-static-indigo-800:rgb(var(--spectrum-global-color-static-indigo-800-rgb));--spectrum-global-color-static-purple-400-rgb:178,121,250;--spectrum-global-color-static-purple-400:rgb(var(--spectrum-global-color-static-purple-400-rgb));--spectrum-global-color-static-purple-500-rgb:161,93,246;--spectrum-global-color-static-purple-500:rgb(var(--spectrum-global-color-static-purple-500-rgb));--spectrum-global-color-static-purple-600-rgb:142,67,234;--spectrum-global-color-static-purple-600:rgb(var(--spectrum-global-color-static-purple-600-rgb));--spectrum-global-color-static-purple-700-rgb:120,43,216;--spectrum-global-color-static-purple-700:rgb(var(--spectrum-global-color-static-purple-700-rgb));--spectrum-global-color-static-purple-800-rgb:98,23,190;--spectrum-global-color-static-purple-800:rgb(var(--spectrum-global-color-static-purple-800-rgb));--spectrum-global-color-static-fuchsia-400-rgb:228,93,230;--spectrum-global-color-static-fuchsia-400:rgb(var(--spectrum-global-color-static-fuchsia-400-rgb));--spectrum-global-color-static-fuchsia-500-rgb:211,63,212;--spectrum-global-color-static-fuchsia-500:rgb(var(--spectrum-global-color-static-fuchsia-500-rgb));--spectrum-global-color-static-fuchsia-600-rgb:188,39,187;--spectrum-global-color-static-fuchsia-600:rgb(var(--spectrum-global-color-static-fuchsia-600-rgb));--spectrum-global-color-static-fuchsia-700-rgb:163,10,163;--spectrum-global-color-static-fuchsia-700:rgb(var(--spectrum-global-color-static-fuchsia-700-rgb));--spectrum-global-color-static-fuchsia-800-rgb:135,0,136;--spectrum-global-color-static-fuchsia-800:rgb(var(--spectrum-global-color-static-fuchsia-800-rgb));--spectrum-global-color-static-magenta-200-rgb:253,127,175;--spectrum-global-color-static-magenta-200:rgb(var(--spectrum-global-color-static-magenta-200-rgb));--spectrum-global-color-static-magenta-300-rgb:242,98,157;--spectrum-global-color-static-magenta-300:rgb(var(--spectrum-global-color-static-magenta-300-rgb));--spectrum-global-color-static-magenta-400-rgb:226,68,135;--spectrum-global-color-static-magenta-400:rgb(var(--spectrum-global-color-static-magenta-400-rgb));--spectrum-global-color-static-magenta-500-rgb:205,40,111;--spectrum-global-color-static-magenta-500:rgb(var(--spectrum-global-color-static-magenta-500-rgb));--spectrum-global-color-static-magenta-600-rgb:179,15,89;--spectrum-global-color-static-magenta-600:rgb(var(--spectrum-global-color-static-magenta-600-rgb));--spectrum-global-color-static-magenta-700-rgb:149,0,72;--spectrum-global-color-static-magenta-700:rgb(var(--spectrum-global-color-static-magenta-700-rgb));--spectrum-global-color-static-magenta-800-rgb:119,0,58;--spectrum-global-color-static-magenta-800:rgb(var(--spectrum-global-color-static-magenta-800-rgb));--spectrum-global-color-static-transparent-white-200:hsla(0,0%,100%,.1);--spectrum-global-color-static-transparent-white-300:hsla(0,0%,100%,.25);--spectrum-global-color-static-transparent-white-400:hsla(0,0%,100%,.4);--spectrum-global-color-static-transparent-white-500:hsla(0,0%,100%,.55);--spectrum-global-color-static-transparent-white-600:hsla(0,0%,100%,.7);--spectrum-global-color-static-transparent-white-700:hsla(0,0%,100%,.8);--spectrum-global-color-static-transparent-white-800:hsla(0,0%,100%,.9);--spectrum-global-color-static-transparent-white-900-rgb:255,255,255;--spectrum-global-color-static-transparent-white-900:rgb(var(--spectrum-global-color-static-transparent-white-900-rgb));--spectrum-global-color-static-transparent-black-200:rgba(0,0,0,.1);--spectrum-global-color-static-transparent-black-300:rgba(0,0,0,.25);--spectrum-global-color-static-transparent-black-400:rgba(0,0,0,.4);--spectrum-global-color-static-transparent-black-500:rgba(0,0,0,.55);--spectrum-global-color-static-transparent-black-600:rgba(0,0,0,.7);--spectrum-global-color-static-transparent-black-700:rgba(0,0,0,.8);--spectrum-global-color-static-transparent-black-800:rgba(0,0,0,.9);--spectrum-global-color-static-transparent-black-900-rgb:0,0,0;--spectrum-global-color-static-transparent-black-900:rgb(var(--spectrum-global-color-static-transparent-black-900-rgb));--spectrum-global-color-sequential-cerulean:#e9fff1,#c8f1e4,#a5e3d7,#82d5ca,#68c5c1,#54b4ba,#3fa2b2,#2991ac,#2280a2,#1f6d98,#1d5c8d,#1a4b83,#1a3979,#1a266f,#191264,#180057;--spectrum-global-color-sequential-forest:#ffffdf,#e2f6ba,#c4eb95,#a4e16d,#8dd366,#77c460,#5fb65a,#48a754,#36984f,#2c894d,#237a4a,#196b47,#105c45,#094d41,#033f3e,#00313a;--spectrum-global-color-sequential-rose:#fff4dd,#ffddd7,#ffc5d2,#feaecb,#fa96c4,#f57ebd,#ef64b5,#e846ad,#d238a1,#bb2e96,#a3248c,#8a1b83,#71167c,#560f74,#370b6e,#000968;--spectrum-global-color-diverging-orange-yellow-seafoam:#580000,#79260b,#9c4511,#bd651a,#dd8629,#f5ad52,#fed693,#ffffe0,#bbe4d1,#76c7be,#3ea8a6,#208288,#076769,#00494b,#002c2d;--spectrum-global-color-diverging-red-yellow-blue:#4a001e,#751232,#a52747,#c65154,#e47961,#f0a882,#fad4ac,#ffffe0,#bce2cf,#89c0c4,#579eb9,#397aa8,#1c5796,#163771,#10194d;--spectrum-global-color-diverging-red-blue:#4a001e,#731331,#9f2945,#cc415a,#e06e85,#ed9ab0,#f8c3d9,#faf0ff,#c6d0f2,#92b2de,#5d94cb,#2f74b3,#265191,#163670,#0b194c;--spectrum-semantic-negative-background-color:var(--spectrum-global-color-static-red-600);--spectrum-semantic-negative-color-default:var(--spectrum-global-color-red-500);--spectrum-semantic-negative-color-hover:var(--spectrum-global-color-red-600);--spectrum-semantic-negative-color-dark:var(--spectrum-global-color-red-600);--spectrum-semantic-negative-border-color:var(--spectrum-global-color-red-400);--spectrum-semantic-negative-icon-color:var(--spectrum-global-color-red-600);--spectrum-semantic-negative-status-color:var(--spectrum-global-color-red-400);--spectrum-semantic-negative-text-color-large:var(--spectrum-global-color-red-500);--spectrum-semantic-negative-text-color-small:var(--spectrum-global-color-red-600);--spectrum-semantic-negative-text-color-small-hover:var(--spectrum-global-color-red-700);--spectrum-semantic-negative-text-color-small-down:var(--spectrum-global-color-red-700);--spectrum-semantic-negative-text-color-small-key-focus:var(--spectrum-global-color-red-600);--spectrum-semantic-negative-color-down:var(--spectrum-global-color-red-700);--spectrum-semantic-negative-color-key-focus:var(--spectrum-global-color-red-400);--spectrum-semantic-negative-background-color-default:var(--spectrum-global-color-static-red-600);--spectrum-semantic-negative-background-color-hover:var(--spectrum-global-color-static-red-700);--spectrum-semantic-negative-background-color-down:var(--spectrum-global-color-static-red-800);--spectrum-semantic-negative-background-color-key-focus:var(--spectrum-global-color-static-red-700);--spectrum-semantic-notice-background-color:var(--spectrum-global-color-static-orange-600);--spectrum-semantic-notice-color-default:var(--spectrum-global-color-orange-500);--spectrum-semantic-notice-color-dark:var(--spectrum-global-color-orange-600);--spectrum-semantic-notice-border-color:var(--spectrum-global-color-orange-400);--spectrum-semantic-notice-icon-color:var(--spectrum-global-color-orange-600);--spectrum-semantic-notice-status-color:var(--spectrum-global-color-orange-400);--spectrum-semantic-notice-text-color-large:var(--spectrum-global-color-orange-500);--spectrum-semantic-notice-text-color-small:var(--spectrum-global-color-orange-600);--spectrum-semantic-notice-color-down:var(--spectrum-global-color-orange-700);--spectrum-semantic-notice-color-key-focus:var(--spectrum-global-color-orange-400);--spectrum-semantic-notice-background-color-default:var(--spectrum-global-color-static-orange-600);--spectrum-semantic-notice-background-color-hover:var(--spectrum-global-color-static-orange-700);--spectrum-semantic-notice-background-color-down:var(--spectrum-global-color-static-orange-800);--spectrum-semantic-notice-background-color-key-focus:var(--spectrum-global-color-static-orange-700);--spectrum-semantic-positive-background-color:var(--spectrum-global-color-static-green-600);--spectrum-semantic-positive-color-default:var(--spectrum-global-color-green-500);--spectrum-semantic-positive-color-dark:var(--spectrum-global-color-green-600);--spectrum-semantic-positive-border-color:var(--spectrum-global-color-green-400);--spectrum-semantic-positive-icon-color:var(--spectrum-global-color-green-600);--spectrum-semantic-positive-status-color:var(--spectrum-global-color-green-400);--spectrum-semantic-positive-text-color-large:var(--spectrum-global-color-green-500);--spectrum-semantic-positive-text-color-small:var(--spectrum-global-color-green-600);--spectrum-semantic-positive-color-down:var(--spectrum-global-color-green-700);--spectrum-semantic-positive-color-key-focus:var(--spectrum-global-color-green-400);--spectrum-semantic-positive-background-color-default:var(--spectrum-global-color-static-green-600);--spectrum-semantic-positive-background-color-hover:var(--spectrum-global-color-static-green-700);--spectrum-semantic-positive-background-color-down:var(--spectrum-global-color-static-green-800);--spectrum-semantic-positive-background-color-key-focus:var(--spectrum-global-color-static-green-700);--spectrum-semantic-informative-background-color:var(--spectrum-global-color-static-blue-600);--spectrum-semantic-informative-color-default:var(--spectrum-global-color-blue-500);--spectrum-semantic-informative-color-dark:var(--spectrum-global-color-blue-600);--spectrum-semantic-informative-border-color:var(--spectrum-global-color-blue-400);--spectrum-semantic-informative-icon-color:var(--spectrum-global-color-blue-600);--spectrum-semantic-informative-status-color:var(--spectrum-global-color-blue-400);--spectrum-semantic-informative-text-color-large:var(--spectrum-global-color-blue-500);--spectrum-semantic-informative-text-color-small:var(--spectrum-global-color-blue-600);--spectrum-semantic-informative-color-down:var(--spectrum-global-color-blue-700);--spectrum-semantic-informative-color-key-focus:var(--spectrum-global-color-blue-400);--spectrum-semantic-informative-background-color-default:var(--spectrum-global-color-static-blue-600);--spectrum-semantic-informative-background-color-hover:var(--spectrum-global-color-static-blue-700);--spectrum-semantic-informative-background-color-down:var(--spectrum-global-color-static-blue-800);--spectrum-semantic-informative-background-color-key-focus:var(--spectrum-global-color-static-blue-700);--spectrum-semantic-cta-background-color-default:var(--spectrum-global-color-static-blue-600);--spectrum-semantic-cta-background-color-hover:var(--spectrum-global-color-static-blue-700);--spectrum-semantic-cta-background-color-down:var(--spectrum-global-color-static-blue-800);--spectrum-semantic-cta-background-color-key-focus:var(--spectrum-global-color-static-blue-700);--spectrum-semantic-emphasized-border-color-default:var(--spectrum-global-color-blue-500);--spectrum-semantic-emphasized-border-color-hover:var(--spectrum-global-color-blue-600);--spectrum-semantic-emphasized-border-color-down:var(--spectrum-global-color-blue-700);--spectrum-semantic-emphasized-border-color-key-focus:var(--spectrum-global-color-blue-600);--spectrum-semantic-neutral-background-color-default:var(--spectrum-global-color-static-gray-700);--spectrum-semantic-neutral-background-color-hover:var(--spectrum-global-color-static-gray-800);--spectrum-semantic-neutral-background-color-down:var(--spectrum-global-color-static-gray-900);--spectrum-semantic-neutral-background-color-key-focus:var(--spectrum-global-color-static-gray-800);--spectrum-semantic-presence-color-1:var(--spectrum-global-color-static-red-500);--spectrum-semantic-presence-color-2:var(--spectrum-global-color-static-orange-400);--spectrum-semantic-presence-color-3:var(--spectrum-global-color-static-yellow-400);--spectrum-semantic-presence-color-4-rgb:75,204,162;--spectrum-semantic-presence-color-4:rgb(var(--spectrum-semantic-presence-color-4-rgb));--spectrum-semantic-presence-color-5-rgb:0,199,255;--spectrum-semantic-presence-color-5:rgb(var(--spectrum-semantic-presence-color-5-rgb));--spectrum-semantic-presence-color-6-rgb:0,140,184;--spectrum-semantic-presence-color-6:rgb(var(--spectrum-semantic-presence-color-6-rgb));--spectrum-semantic-presence-color-7-rgb:126,75,243;--spectrum-semantic-presence-color-7:rgb(var(--spectrum-semantic-presence-color-7-rgb));--spectrum-semantic-presence-color-8:var(--spectrum-global-color-static-fuchsia-600);--spectrum-global-dimension-static-percent-50:50%;--spectrum-global-dimension-static-percent-70:70%;--spectrum-global-dimension-static-percent-100:100%;--spectrum-global-dimension-static-breakpoint-xsmall:304px;--spectrum-global-dimension-static-breakpoint-small:768px;--spectrum-global-dimension-static-breakpoint-medium:1280px;--spectrum-global-dimension-static-breakpoint-large:1768px;--spectrum-global-dimension-static-breakpoint-xlarge:2160px;--spectrum-global-dimension-static-grid-columns:12;--spectrum-global-dimension-static-grid-fluid-width:100%;--spectrum-global-dimension-static-grid-fixed-max-width:1280px;--spectrum-global-dimension-static-size-0:0px;--spectrum-global-dimension-static-size-10:1px;--spectrum-global-dimension-static-size-25:2px;--spectrum-global-dimension-static-size-40:3px;--spectrum-global-dimension-static-size-50:4px;--spectrum-global-dimension-static-size-65:5px;--spectrum-global-dimension-static-size-75:6px;--spectrum-global-dimension-static-size-85:7px;--spectrum-global-dimension-static-size-100:8px;--spectrum-global-dimension-static-size-115:9px;--spectrum-global-dimension-static-size-125:10px;--spectrum-global-dimension-static-size-130:11px;--spectrum-global-dimension-static-size-150:12px;--spectrum-global-dimension-static-size-160:13px;--spectrum-global-dimension-static-size-175:14px;--spectrum-global-dimension-static-size-185:15px;--spectrum-global-dimension-static-size-200:16px;--spectrum-global-dimension-static-size-225:18px;--spectrum-global-dimension-static-size-250:20px;--spectrum-global-dimension-static-size-275:22px;--spectrum-global-dimension-static-size-300:24px;--spectrum-global-dimension-static-size-325:26px;--spectrum-global-dimension-static-size-350:28px;--spectrum-global-dimension-static-size-400:32px;--spectrum-global-dimension-static-size-450:36px;--spectrum-global-dimension-static-size-500:40px;--spectrum-global-dimension-static-size-550:44px;--spectrum-global-dimension-static-size-600:48px;--spectrum-global-dimension-static-size-700:56px;--spectrum-global-dimension-static-size-800:64px;--spectrum-global-dimension-static-size-900:72px;--spectrum-global-dimension-static-size-1000:80px;--spectrum-global-dimension-static-size-1200:96px;--spectrum-global-dimension-static-size-1700:136px;--spectrum-global-dimension-static-size-2400:192px;--spectrum-global-dimension-static-size-2500:200px;--spectrum-global-dimension-static-size-2600:208px;--spectrum-global-dimension-static-size-2800:224px;--spectrum-global-dimension-static-size-3200:256px;--spectrum-global-dimension-static-size-3400:272px;--spectrum-global-dimension-static-size-3500:280px;--spectrum-global-dimension-static-size-3600:288px;--spectrum-global-dimension-static-size-3800:304px;--spectrum-global-dimension-static-size-4600:368px;--spectrum-global-dimension-static-size-5000:400px;--spectrum-global-dimension-static-size-6000:480px;--spectrum-global-dimension-static-size-16000:1280px;--spectrum-global-dimension-static-font-size-50:11px;--spectrum-global-dimension-static-font-size-75:12px;--spectrum-global-dimension-static-font-size-100:14px;--spectrum-global-dimension-static-font-size-150:15px;--spectrum-global-dimension-static-font-size-200:16px;--spectrum-global-dimension-static-font-size-300:18px;--spectrum-global-dimension-static-font-size-400:20px;--spectrum-global-dimension-static-font-size-500:22px;--spectrum-global-dimension-static-font-size-600:25px;--spectrum-global-dimension-static-font-size-700:28px;--spectrum-global-dimension-static-font-size-800:32px;--spectrum-global-dimension-static-font-size-900:36px;--spectrum-global-dimension-static-font-size-1000:40px;--spectrum-global-font-family-base:adobe-clean,"Source Sans Pro",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,"Trebuchet MS","Lucida Grande",sans-serif;--spectrum-global-font-family-serif:adobe-clean-serif,"Source Serif Pro",Georgia,serif;--spectrum-global-font-family-code:"Source Code Pro",Monaco,monospace;--spectrum-global-font-weight-thin:100;--spectrum-global-font-weight-ultra-light:200;--spectrum-global-font-weight-light:300;--spectrum-global-font-weight-regular:400;--spectrum-global-font-weight-medium:500;--spectrum-global-font-weight-semi-bold:600;--spectrum-global-font-weight-bold:700;--spectrum-global-font-weight-extra-bold:800;--spectrum-global-font-weight-black:900;--spectrum-global-font-style-regular:normal;--spectrum-global-font-style-italic:italic;--spectrum-global-font-letter-spacing-none:0;--spectrum-global-font-letter-spacing-small:0.0125em;--spectrum-global-font-letter-spacing-han:0.05em;--spectrum-global-font-letter-spacing-medium:0.06em;--spectrum-global-font-line-height-large:1.7;--spectrum-global-font-line-height-medium:1.5;--spectrum-global-font-line-height-small:1.3;--spectrum-global-font-multiplier-0:0em;--spectrum-global-font-multiplier-25:0.25em;--spectrum-global-font-multiplier-75:0.75em;--spectrum-global-font-font-family-ar:myriad-arabic,adobe-clean,"Source Sans Pro",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,"Trebuchet MS","Lucida Grande",sans-serif;--spectrum-global-font-font-family-he:myriad-hebrew,adobe-clean,"Source Sans Pro",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,"Trebuchet MS","Lucida Grande",sans-serif;--spectrum-global-font-font-family-zh:adobe-clean-han-traditional,source-han-traditional,"MingLiu","Heiti TC Light","sans-serif";--spectrum-global-font-font-family-zhhans:adobe-clean-han-simplified-c,source-han-simplified-c,"SimSun","Heiti SC Light","sans-serif";--spectrum-global-font-font-family-ko:adobe-clean-han-korean,source-han-korean,"Malgun Gothic","Apple Gothic","sans-serif";--spectrum-global-font-font-family-ja:adobe-clean-han-japanese,"Hiragino Kaku Gothic ProN","ヒラギノ角ゴ ProN W3","Osaka",YuGothic,"Yu Gothic","メイリオ",Meiryo,"ＭＳ Ｐゴシック","MS PGothic","sans-serif";--spectrum-global-font-font-family-condensed:adobe-clean-han-traditional,source-han-traditional,"MingLiu","Heiti TC Light",adobe-clean,"Source Sans Pro",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,"Trebuchet MS","Lucida Grande",sans-serif;--spectrum-alias-loupe-entry-animation-duration:var(--spectrum-global-animation-duration-300);--spectrum-alias-loupe-exit-animation-duration:var(--spectrum-global-animation-duration-300);--spectrum-alias-heading-text-line-height:var(--spectrum-global-font-line-height-small);--spectrum-alias-heading-text-font-weight-regular:var(--spectrum-global-font-weight-bold);--spectrum-alias-heading-text-font-weight-regular-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-heading-text-font-weight-light:var(--spectrum-global-font-weight-light);--spectrum-alias-heading-text-font-weight-light-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-heading-text-font-weight-heavy:var(--spectrum-global-font-weight-black);--spectrum-alias-heading-text-font-weight-heavy-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-heading-text-font-weight-quiet:var(--spectrum-global-font-weight-light);--spectrum-alias-heading-text-font-weight-quiet-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-heading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-heading-text-font-weight-strong-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-heading-margin-bottom:var(--spectrum-global-font-multiplier-25);--spectrum-alias-subheading-text-font-weight:var(--spectrum-global-font-weight-bold);--spectrum-alias-subheading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-body-text-font-family:var(--spectrum-global-font-family-base);--spectrum-alias-body-text-line-height:var(--spectrum-global-font-line-height-medium);--spectrum-alias-body-text-font-weight:var(--spectrum-global-font-weight-regular);--spectrum-alias-body-text-font-weight-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-body-margin-bottom:var(--spectrum-global-font-multiplier-75);--spectrum-alias-detail-text-font-weight:var(--spectrum-global-font-weight-bold);--spectrum-alias-detail-text-font-weight-regular:var(--spectrum-global-font-weight-bold);--spectrum-alias-detail-text-font-weight-light:var(--spectrum-global-font-weight-regular);--spectrum-alias-detail-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-article-heading-text-font-weight:var(--spectrum-global-font-weight-bold);--spectrum-alias-article-heading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-article-heading-text-font-weight-quiet:var(--spectrum-global-font-weight-regular);--spectrum-alias-article-heading-text-font-weight-quiet-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-article-body-text-font-weight:var(--spectrum-global-font-weight-regular);--spectrum-alias-article-body-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-article-subheading-text-font-weight:var(--spectrum-global-font-weight-bold);--spectrum-alias-article-subheading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-article-detail-text-font-weight:var(--spectrum-global-font-weight-regular);--spectrum-alias-article-detail-text-font-weight-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-code-text-font-family:var(--spectrum-global-font-family-code);--spectrum-alias-code-text-font-weight-regular:var(--spectrum-global-font-weight-regular);--spectrum-alias-code-text-font-weight-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-code-text-line-height:var(--spectrum-global-font-line-height-medium);--spectrum-alias-code-margin-bottom:var(--spectrum-global-font-multiplier-0);--spectrum-alias-font-family-ar:var(--spectrum-global-font-font-family-ar);--spectrum-alias-font-family-he:var(--spectrum-global-font-font-family-he);--spectrum-alias-font-family-zh:var(--spectrum-global-font-font-family-zh);--spectrum-alias-font-family-zhhans:var(--spectrum-global-font-font-family-zhhans);--spectrum-alias-font-family-ko:var(--spectrum-global-font-font-family-ko);--spectrum-alias-font-family-ja:var(--spectrum-global-font-font-family-ja);--spectrum-alias-font-family-condensed:var(--spectrum-global-font-font-family-condensed);--spectrum-alias-button-text-line-height:var(--spectrum-global-font-line-height-small);--spectrum-alias-component-text-line-height:var(--spectrum-global-font-line-height-small);--spectrum-alias-han-component-text-line-height:var(--spectrum-global-font-line-height-medium);--spectrum-alias-serif-text-font-family:var(--spectrum-global-font-family-serif);--spectrum-alias-han-heading-text-line-height:var(--spectrum-global-font-line-height-medium);--spectrum-alias-han-heading-text-font-weight-regular:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-heading-text-font-weight-regular-emphasis:var(--spectrum-global-font-weight-extra-bold);--spectrum-alias-han-heading-text-font-weight-regular-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-han-heading-text-font-weight-quiet-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-heading-text-font-weight-light:var(--spectrum-global-font-weight-light);--spectrum-alias-han-heading-text-font-weight-light-emphasis:var(--spectrum-global-font-weight-regular);--spectrum-alias-han-heading-text-font-weight-light-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-heading-text-font-weight-heavy:var(--spectrum-global-font-weight-black);--spectrum-alias-han-heading-text-font-weight-heavy-emphasis:var(--spectrum-global-font-weight-black);--spectrum-alias-han-heading-text-font-weight-heavy-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-han-body-text-line-height:var(--spectrum-global-font-line-height-large);--spectrum-alias-han-body-text-font-weight-regular:var(--spectrum-global-font-weight-regular);--spectrum-alias-han-body-text-font-weight-emphasis:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-body-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-han-subheading-text-font-weight-regular:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-subheading-text-font-weight-emphasis:var(--spectrum-global-font-weight-extra-bold);--spectrum-alias-han-subheading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-han-detail-text-font-weight:var(--spectrum-global-font-weight-regular);--spectrum-alias-han-detail-text-font-weight-emphasis:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-detail-text-font-weight-strong:var(--spectrum-global-font-weight-black)}:host,:root{--spectrum-alias-item-height-s:var(--spectrum-global-dimension-size-300);--spectrum-alias-item-height-m:var(--spectrum-global-dimension-size-400);--spectrum-alias-item-height-l:var(--spectrum-global-dimension-size-500);--spectrum-alias-item-height-xl:var(--spectrum-global-dimension-size-600);--spectrum-alias-item-rounded-border-radius-s:var(--spectrum-global-dimension-size-150);--spectrum-alias-item-rounded-border-radius-m:var(--spectrum-global-dimension-size-200);--spectrum-alias-item-rounded-border-radius-l:var(--spectrum-global-dimension-size-250);--spectrum-alias-item-rounded-border-radius-xl:var(--spectrum-global-dimension-size-300);--spectrum-alias-item-text-size-s:var(--spectrum-global-dimension-font-size-75);--spectrum-alias-item-text-size-m:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-item-text-size-l:var(--spectrum-global-dimension-font-size-200);--spectrum-alias-item-text-size-xl:var(--spectrum-global-dimension-font-size-300);--spectrum-alias-item-text-padding-top-s:var(--spectrum-global-dimension-static-size-50);--spectrum-alias-item-text-padding-top-m:var(--spectrum-global-dimension-size-75);--spectrum-alias-item-text-padding-top-xl:var(--spectrum-global-dimension-size-150);--spectrum-alias-item-text-padding-bottom-m:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-text-padding-bottom-l:var(--spectrum-global-dimension-size-130);--spectrum-alias-item-text-padding-bottom-xl:var(--spectrum-global-dimension-size-175);--spectrum-alias-item-icon-padding-top-s:var(--spectrum-global-dimension-size-50);--spectrum-alias-item-icon-padding-top-m:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-icon-padding-top-l:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-icon-padding-top-xl:var(--spectrum-global-dimension-size-160);--spectrum-alias-item-icon-padding-bottom-s:var(--spectrum-global-dimension-size-50);--spectrum-alias-item-icon-padding-bottom-m:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-icon-padding-bottom-l:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-icon-padding-bottom-xl:var(--spectrum-global-dimension-size-160);--spectrum-alias-item-padding-s:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-padding-m:var(--spectrum-global-dimension-size-150);--spectrum-alias-item-padding-l:var(--spectrum-global-dimension-size-185);--spectrum-alias-item-padding-xl:var(--spectrum-global-dimension-size-225);--spectrum-alias-item-rounded-padding-s:var(--spectrum-global-dimension-size-150);--spectrum-alias-item-rounded-padding-m:var(--spectrum-global-dimension-size-200);--spectrum-alias-item-rounded-padding-l:var(--spectrum-global-dimension-size-250);--spectrum-alias-item-rounded-padding-xl:var(--spectrum-global-dimension-size-300);--spectrum-alias-item-icononly-padding-s:var(--spectrum-global-dimension-size-50);--spectrum-alias-item-icononly-padding-m:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-icononly-padding-l:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-icononly-padding-xl:var(--spectrum-global-dimension-size-160);--spectrum-alias-item-control-gap-s:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-control-gap-m:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-control-gap-l:var(--spectrum-global-dimension-size-130);--spectrum-alias-item-control-gap-xl:var(--spectrum-global-dimension-size-160);--spectrum-alias-item-workflow-icon-gap-s:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-workflow-icon-gap-m:var(--spectrum-global-dimension-size-100);--spectrum-alias-item-workflow-icon-gap-l:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-workflow-icon-gap-xl:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-mark-gap-s:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-mark-gap-m:var(--spectrum-global-dimension-size-100);--spectrum-alias-item-mark-gap-l:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-mark-gap-xl:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-ui-icon-gap-s:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-ui-icon-gap-m:var(--spectrum-global-dimension-size-100);--spectrum-alias-item-ui-icon-gap-l:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-ui-icon-gap-xl:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-clearbutton-gap-s:var(--spectrum-global-dimension-size-50);--spectrum-alias-item-clearbutton-gap-m:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-clearbutton-gap-l:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-clearbutton-gap-xl:var(--spectrum-global-dimension-size-150);--spectrum-alias-item-workflow-padding-left-s:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-workflow-padding-left-l:var(--spectrum-global-dimension-size-160);--spectrum-alias-item-workflow-padding-left-xl:var(--spectrum-global-dimension-size-185);--spectrum-alias-item-rounded-workflow-padding-left-s:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-rounded-workflow-padding-left-l:var(--spectrum-global-dimension-size-225);--spectrum-alias-item-mark-padding-top-s:var(--spectrum-global-dimension-size-40);--spectrum-alias-item-mark-padding-top-l:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-mark-padding-top-xl:var(--spectrum-global-dimension-size-130);--spectrum-alias-item-mark-padding-bottom-s:var(--spectrum-global-dimension-size-40);--spectrum-alias-item-mark-padding-bottom-l:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-mark-padding-bottom-xl:var(--spectrum-global-dimension-size-130);--spectrum-alias-item-mark-padding-left-s:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-mark-padding-left-l:var(--spectrum-global-dimension-size-160);--spectrum-alias-item-mark-padding-left-xl:var(--spectrum-global-dimension-size-185);--spectrum-alias-item-control-1-size-s:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-item-control-1-size-m:var(--spectrum-global-dimension-size-100);--spectrum-alias-item-control-2-size-m:var(--spectrum-global-dimension-size-175);--spectrum-alias-item-control-2-size-l:var(--spectrum-global-dimension-size-200);--spectrum-alias-item-control-2-size-xl:var(--spectrum-global-dimension-size-225);--spectrum-alias-item-control-2-size-xxl:var(--spectrum-global-dimension-size-250);--spectrum-alias-item-control-2-border-radius-s:var(--spectrum-global-dimension-size-75);--spectrum-alias-item-control-2-border-radius-m:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-control-2-border-radius-l:var(--spectrum-global-dimension-size-100);--spectrum-alias-item-control-2-border-radius-xl:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-control-2-border-radius-xxl:var(--spectrum-global-dimension-size-125);--spectrum-alias-item-control-2-padding-s:var(--spectrum-global-dimension-size-75);--spectrum-alias-item-control-2-padding-m:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-control-2-padding-l:var(--spectrum-global-dimension-size-150);--spectrum-alias-item-control-2-padding-xl:var(--spectrum-global-dimension-size-185);--spectrum-alias-item-control-3-height-m:var(--spectrum-global-dimension-size-175);--spectrum-alias-item-control-3-height-l:var(--spectrum-global-dimension-size-200);--spectrum-alias-item-control-3-height-xl:var(--spectrum-global-dimension-size-225);--spectrum-alias-item-control-3-border-radius-s:var(--spectrum-global-dimension-size-75);--spectrum-alias-item-control-3-border-radius-m:var(--spectrum-global-dimension-size-85);--spectrum-alias-item-control-3-border-radius-l:var(--spectrum-global-dimension-size-100);--spectrum-alias-item-control-3-border-radius-xl:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-control-3-padding-s:var(--spectrum-global-dimension-size-75);--spectrum-alias-item-control-3-padding-m:var(--spectrum-global-dimension-size-115);--spectrum-alias-item-control-3-padding-l:var(--spectrum-global-dimension-size-150);--spectrum-alias-item-control-3-padding-xl:var(--spectrum-global-dimension-size-185);--spectrum-alias-item-mark-size-s:var(--spectrum-global-dimension-size-225);--spectrum-alias-item-mark-size-l:var(--spectrum-global-dimension-size-275);--spectrum-alias-item-mark-size-xl:var(--spectrum-global-dimension-size-325);--spectrum-alias-heading-xxxl-text-size:var(--spectrum-global-dimension-font-size-1300);--spectrum-alias-heading-xxl-text-size:var(--spectrum-global-dimension-font-size-1100);--spectrum-alias-heading-xl-text-size:var(--spectrum-global-dimension-font-size-900);--spectrum-alias-heading-l-text-size:var(--spectrum-global-dimension-font-size-700);--spectrum-alias-heading-m-text-size:var(--spectrum-global-dimension-font-size-500);--spectrum-alias-heading-s-text-size:var(--spectrum-global-dimension-font-size-300);--spectrum-alias-heading-xs-text-size:var(--spectrum-global-dimension-font-size-200);--spectrum-alias-heading-xxs-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-heading-xxxl-margin-top:var(--spectrum-global-dimension-font-size-1200);--spectrum-alias-heading-xxl-margin-top:var(--spectrum-global-dimension-font-size-900);--spectrum-alias-heading-xl-margin-top:var(--spectrum-global-dimension-font-size-800);--spectrum-alias-heading-l-margin-top:var(--spectrum-global-dimension-font-size-600);--spectrum-alias-heading-m-margin-top:var(--spectrum-global-dimension-font-size-400);--spectrum-alias-heading-s-margin-top:var(--spectrum-global-dimension-font-size-200);--spectrum-alias-heading-xs-margin-top:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-heading-xxs-margin-top:var(--spectrum-global-dimension-font-size-75);--spectrum-alias-heading-han-xxxl-text-size:var(--spectrum-global-dimension-font-size-1300);--spectrum-alias-heading-han-xxl-text-size:var(--spectrum-global-dimension-font-size-900);--spectrum-alias-heading-han-xl-text-size:var(--spectrum-global-dimension-font-size-800);--spectrum-alias-heading-han-l-text-size:var(--spectrum-global-dimension-font-size-600);--spectrum-alias-heading-han-m-text-size:var(--spectrum-global-dimension-font-size-400);--spectrum-alias-heading-han-s-text-size:var(--spectrum-global-dimension-font-size-300);--spectrum-alias-heading-han-xs-text-size:var(--spectrum-global-dimension-font-size-200);--spectrum-alias-heading-han-xxs-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-heading-han-xxxl-margin-top:var(--spectrum-global-dimension-font-size-1200);--spectrum-alias-heading-han-xxl-margin-top:var(--spectrum-global-dimension-font-size-800);--spectrum-alias-heading-han-xl-margin-top:var(--spectrum-global-dimension-font-size-700);--spectrum-alias-heading-han-l-margin-top:var(--spectrum-global-dimension-font-size-500);--spectrum-alias-heading-han-m-margin-top:var(--spectrum-global-dimension-font-size-300);--spectrum-alias-heading-han-s-margin-top:var(--spectrum-global-dimension-font-size-200);--spectrum-alias-heading-han-xs-margin-top:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-heading-han-xxs-margin-top:var(--spectrum-global-dimension-font-size-75);--spectrum-alias-component-border-radius:var(--spectrum-global-dimension-size-50);--spectrum-alias-component-border-radius-quiet:var(--spectrum-global-dimension-static-size-0);--spectrum-alias-component-focusring-gap:var(--spectrum-global-dimension-static-size-0);--spectrum-alias-component-focusring-gap-emphasized:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-component-focusring-size:var(--spectrum-global-dimension-static-size-10);--spectrum-alias-component-focusring-size-emphasized:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-input-border-size:var(--spectrum-global-dimension-static-size-10);--spectrum-alias-input-focusring-gap:var(--spectrum-global-dimension-static-size-0);--spectrum-alias-input-quiet-focusline-gap:var(--spectrum-global-dimension-static-size-10);--spectrum-alias-control-two-size-m:var(--spectrum-global-dimension-size-175);--spectrum-alias-control-two-size-l:var(--spectrum-global-dimension-size-200);--spectrum-alias-control-two-size-xl:var(--spectrum-global-dimension-size-225);--spectrum-alias-control-two-size-xxl:var(--spectrum-global-dimension-size-250);--spectrum-alias-control-two-border-radius-s:var(--spectrum-global-dimension-size-75);--spectrum-alias-control-two-border-radius-m:var(--spectrum-global-dimension-size-85);--spectrum-alias-control-two-border-radius-l:var(--spectrum-global-dimension-size-100);--spectrum-alias-control-two-border-radius-xl:var(--spectrum-global-dimension-size-115);--spectrum-alias-control-two-border-radius-xxl:var(--spectrum-global-dimension-size-125);--spectrum-alias-control-two-focus-ring-border-radius-s:var(--spectrum-global-dimension-size-125);--spectrum-alias-control-two-focus-ring-border-radius-m:var(--spectrum-global-dimension-size-130);--spectrum-alias-control-two-focus-ring-border-radius-l:var(--spectrum-global-dimension-size-150);--spectrum-alias-control-two-focus-ring-border-radius-xl:var(--spectrum-global-dimension-size-160);--spectrum-alias-control-two-focus-ring-border-radius-xxl:var(--spectrum-global-dimension-size-175);--spectrum-alias-control-three-height-m:var(--spectrum-global-dimension-size-175);--spectrum-alias-control-three-height-l:var(--spectrum-global-dimension-size-200);--spectrum-alias-control-three-height-xl:var(--spectrum-global-dimension-size-225);--spectrum-alias-infieldbutton-icon-margin-y-s:var(--spectrum-global-dimension-size-50);--spectrum-alias-infieldbutton-icon-margin-y-m:var(--spectrum-global-dimension-size-85);--spectrum-alias-infieldbutton-icon-margin-y-l:var(--spectrum-global-dimension-size-125);--spectrum-alias-infieldbutton-icon-margin-y-xl:var(--spectrum-global-dimension-size-160);--spectrum-alias-infieldbutton-border-radius:var(--spectrum-global-dimension-size-50);--spectrum-alias-infieldbutton-border-radius-sided:0;--spectrum-alias-infieldbutton-border-size:var(--spectrum-global-dimension-static-size-10);--spectrum-alias-infieldbutton-fill-padding-s:var(--spectrum-global-dimension-size-50);--spectrum-alias-infieldbutton-fill-padding-m:var(--spectrum-global-dimension-size-85);--spectrum-alias-infieldbutton-fill-padding-l:var(--spectrum-global-dimension-size-125);--spectrum-alias-infieldbutton-fill-padding-xl:var(--spectrum-global-dimension-size-160);--spectrum-alias-infieldbutton-padding-s:0;--spectrum-alias-infieldbutton-padding-m:0;--spectrum-alias-infieldbutton-padding-l:0;--spectrum-alias-infieldbutton-padding-xl:0;--spectrum-alias-infieldbutton-full-height-s:var(--spectrum-global-dimension-size-300);--spectrum-alias-infieldbutton-full-height-m:var(--spectrum-global-dimension-size-400);--spectrum-alias-infieldbutton-full-height-l:var(--spectrum-global-dimension-size-500);--spectrum-alias-infieldbutton-full-height-xl:var(--spectrum-global-dimension-size-600);--spectrum-alias-infieldbutton-half-height-s:var(--spectrum-global-dimension-size-150);--spectrum-alias-infieldbutton-half-height-m:var(--spectrum-global-dimension-size-200);--spectrum-alias-infieldbutton-half-height-l:var(--spectrum-global-dimension-size-250);--spectrum-alias-infieldbutton-half-height-xl:var(--spectrum-global-dimension-size-300);--spectrum-alias-stepperbutton-gap:0;--spectrum-alias-stepperbutton-width-s:var(--spectrum-global-dimension-size-225);--spectrum-alias-stepperbutton-width-m:var(--spectrum-global-dimension-size-300);--spectrum-alias-stepperbutton-width-l:var(--spectrum-global-dimension-size-400);--spectrum-alias-stepperbutton-width-xl:var(--spectrum-global-dimension-size-450);--spectrum-alias-stepperbutton-icon-x-offset-s:var(--spectrum-global-dimension-size-50);--spectrum-alias-stepperbutton-icon-x-offset-m:var(--spectrum-global-dimension-size-85);--spectrum-alias-stepperbutton-icon-x-offset-l:var(--spectrum-global-dimension-size-125);--spectrum-alias-stepperbutton-icon-x-offset-xl:var(--spectrum-global-dimension-size-130);--spectrum-alias-stepperbutton-icon-y-offset-top-s:var(--spectrum-global-dimension-size-25);--spectrum-alias-stepperbutton-icon-y-offset-top-m:var(--spectrum-global-dimension-size-50);--spectrum-alias-stepperbutton-icon-y-offset-top-l:var(--spectrum-global-dimension-size-65);--spectrum-alias-stepperbutton-icon-y-offset-top-xl:var(--spectrum-global-dimension-size-75);--spectrum-alias-stepperbutton-icon-y-offset-bottom-s:var(--spectrum-global-dimension-size-10);--spectrum-alias-stepperbutton-icon-y-offset-bottom-m:var(--spectrum-global-dimension-size-25);--spectrum-alias-stepperbutton-icon-y-offset-bottom-l:var(--spectrum-global-dimension-size-40);--spectrum-alias-stepperbutton-icon-y-offset-bottom-xl:var(--spectrum-global-dimension-size-50);--spectrum-alias-stepperbutton-radius-touching:0;--spectrum-alias-clearbutton-icon-margin-s:var(--spectrum-global-dimension-size-100);--spectrum-alias-clearbutton-icon-margin-m:var(--spectrum-global-dimension-size-150);--spectrum-alias-clearbutton-icon-margin-l:var(--spectrum-global-dimension-size-185);--spectrum-alias-clearbutton-icon-margin-xl:var(--spectrum-global-dimension-size-225);--spectrum-alias-clearbutton-border-radius:var(--spectrum-global-dimension-size-50);--spectrum-alias-pickerbutton-icononly-padding-x-s:var(--spectrum-global-dimension-size-85);--spectrum-alias-pickerbutton-icononly-padding-x-m:var(--spectrum-global-dimension-size-125);--spectrum-alias-pickerbutton-icononly-padding-x-l:var(--spectrum-global-dimension-size-160);--spectrum-alias-pickerbutton-icononly-padding-x-xl:var(--spectrum-global-dimension-size-200);--spectrum-alias-pickerbutton-icon-margin-y-s:var(--spectrum-global-dimension-size-85);--spectrum-alias-pickerbutton-icon-margin-y-m:var(--spectrum-global-dimension-size-125);--spectrum-alias-pickerbutton-icon-margin-y-l:var(--spectrum-global-dimension-size-160);--spectrum-alias-pickerbutton-icon-margin-y-xl:var(--spectrum-global-dimension-size-200);--spectrum-alias-pickerbutton-label-padding-y-s:var(--spectrum-global-dimension-size-50);--spectrum-alias-pickerbutton-label-padding-y-m:var(--spectrum-global-dimension-size-75);--spectrum-alias-pickerbutton-label-padding-y-l:var(--spectrum-global-dimension-size-115);--spectrum-alias-pickerbutton-label-padding-y-xl:var(--spectrum-global-dimension-size-150);--spectrum-alias-pickerbutton-border-radius-rounded:var(--spectrum-global-dimension-size-50);--spectrum-alias-pickerbutton-border-radius-rounded-sided:0;--spectrum-alias-search-border-radius:var(--spectrum-global-dimension-size-50);--spectrum-alias-search-border-radius-quiet:0;--spectrum-alias-combobox-quiet-button-offset-x:var(--spectrum-global-dimension-size-100);--spectrum-alias-thumbnail-border-radius-small:var(--spectrum-global-dimension-size-25);--spectrum-alias-search-padding-left-s:var(--spectrum-global-dimension-size-85);--spectrum-alias-search-padding-left-l:var(--spectrum-global-dimension-size-160);--spectrum-alias-search-padding-left-xl:var(--spectrum-global-dimension-size-185);--spectrum-alias-percent-50:50%;--spectrum-alias-percent-70:70%;--spectrum-alias-percent-100:100%;--spectrum-alias-breakpoint-xsmall:304px;--spectrum-alias-breakpoint-small:768px;--spectrum-alias-breakpoint-medium:1280px;--spectrum-alias-breakpoint-large:1768px;--spectrum-alias-breakpoint-xlarge:2160px;--spectrum-alias-grid-columns:12;--spectrum-alias-grid-fluid-width:100%;--spectrum-alias-grid-fixed-max-width:1280px;--spectrum-alias-border-size-thin:var(--spectrum-global-dimension-static-size-10);--spectrum-alias-border-size-thick:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-border-size-thicker:var(--spectrum-global-dimension-static-size-50);--spectrum-alias-border-size-thickest:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-border-offset-thin:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-border-offset-thick:var(--spectrum-global-dimension-static-size-50);--spectrum-alias-border-offset-thicker:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-border-offset-thickest:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-grid-baseline:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-grid-gutter-xsmall:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-grid-gutter-small:var(--spectrum-global-dimension-static-size-300);--spectrum-alias-grid-gutter-medium:var(--spectrum-global-dimension-static-size-400);--spectrum-alias-grid-gutter-large:var(--spectrum-global-dimension-static-size-500);--spectrum-alias-grid-gutter-xlarge:var(--spectrum-global-dimension-static-size-600);--spectrum-alias-grid-margin-xsmall:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-grid-margin-small:var(--spectrum-global-dimension-static-size-300);--spectrum-alias-grid-margin-medium:var(--spectrum-global-dimension-static-size-400);--spectrum-alias-grid-margin-large:var(--spectrum-global-dimension-static-size-500);--spectrum-alias-grid-margin-xlarge:var(--spectrum-global-dimension-static-size-600);--spectrum-alias-grid-layout-region-margin-bottom-xsmall:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-grid-layout-region-margin-bottom-small:var(--spectrum-global-dimension-static-size-300);--spectrum-alias-grid-layout-region-margin-bottom-medium:var(--spectrum-global-dimension-static-size-400);--spectrum-alias-grid-layout-region-margin-bottom-large:var(--spectrum-global-dimension-static-size-500);--spectrum-alias-grid-layout-region-margin-bottom-xlarge:var(--spectrum-global-dimension-static-size-600);--spectrum-alias-radial-reaction-size-default:var(--spectrum-global-dimension-static-size-550);--spectrum-alias-focus-ring-gap:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-focus-ring-size:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-focus-ring-gap-small:var(--spectrum-global-dimension-static-size-0);--spectrum-alias-focus-ring-size-small:var(--spectrum-global-dimension-static-size-10);--spectrum-alias-dropshadow-blur:var(--spectrum-global-dimension-size-50);--spectrum-alias-dropshadow-offset-y:var(--spectrum-global-dimension-size-10);--spectrum-alias-font-size-default:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-layout-label-gap-size:var(--spectrum-global-dimension-size-100);--spectrum-alias-pill-button-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-pill-button-text-baseline:var(--spectrum-global-dimension-static-size-150);--spectrum-alias-border-radius-xsmall:var(--spectrum-global-dimension-size-10);--spectrum-alias-border-radius-small:var(--spectrum-global-dimension-size-25);--spectrum-alias-border-radius-regular:var(--spectrum-global-dimension-size-50);--spectrum-alias-border-radius-medium:var(--spectrum-global-dimension-size-100);--spectrum-alias-border-radius-large:var(--spectrum-global-dimension-size-200);--spectrum-alias-border-radius-xlarge:var(--spectrum-global-dimension-size-300);--spectrum-alias-focus-ring-border-radius-xsmall:var(--spectrum-global-dimension-size-50);--spectrum-alias-focus-ring-border-radius-small:var(--spectrum-global-dimension-static-size-65);--spectrum-alias-focus-ring-border-radius-medium:var(--spectrum-global-dimension-size-150);--spectrum-alias-focus-ring-border-radius-large:var(--spectrum-global-dimension-size-250);--spectrum-alias-focus-ring-border-radius-xlarge:var(--spectrum-global-dimension-size-350);--spectrum-alias-single-line-height:var(--spectrum-global-dimension-size-400);--spectrum-alias-single-line-width:var(--spectrum-global-dimension-size-2400);--spectrum-alias-workflow-icon-size-s:var(--spectrum-global-dimension-size-200);--spectrum-alias-workflow-icon-size-m:var(--spectrum-global-dimension-size-225);--spectrum-alias-workflow-icon-size-xl:var(--spectrum-global-dimension-size-275);--spectrum-alias-ui-icon-alert-size-75:var(--spectrum-global-dimension-size-200);--spectrum-alias-ui-icon-alert-size-100:var(--spectrum-global-dimension-size-225);--spectrum-alias-ui-icon-alert-size-200:var(--spectrum-global-dimension-size-250);--spectrum-alias-ui-icon-alert-size-300:var(--spectrum-global-dimension-size-275);--spectrum-alias-ui-icon-triplegripper-size-100-height:var(--spectrum-global-dimension-size-100);--spectrum-alias-ui-icon-doublegripper-size-100-width:var(--spectrum-global-dimension-size-200);--spectrum-alias-ui-icon-singlegripper-size-100-width:var(--spectrum-global-dimension-size-300);--spectrum-alias-ui-icon-cornertriangle-size-75:var(--spectrum-global-dimension-size-65);--spectrum-alias-ui-icon-cornertriangle-size-200:var(--spectrum-global-dimension-size-75);--spectrum-alias-ui-icon-asterisk-size-75:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-ui-icon-asterisk-size-100:var(--spectrum-global-dimension-size-100);--spectrum-alias-avatar-size-50:var(--spectrum-global-dimension-size-200);--spectrum-alias-avatar-size-75:var(--spectrum-global-dimension-size-225);--spectrum-alias-avatar-size-200:var(--spectrum-global-dimension-size-275);--spectrum-alias-avatar-size-300:var(--spectrum-global-dimension-size-325);--spectrum-alias-avatar-size-500:var(--spectrum-global-dimension-size-400);--spectrum-alias-avatar-size-700:var(--spectrum-global-dimension-size-500);--spectrum-alias-avatar-border-size:var(--spectrum-global-dimension-size-0);--spectrum-alias-colorloupe-width:var(--spectrum-global-dimension-static-size-600);--spectrum-alias-colorloupe-height:var(--spectrum-global-dimension-static-size-800)}:host,:root{--spectrum-alias-colorhandle-outer-border-color:rgba(0,0,0,.42);--spectrum-alias-transparent-blue-background-color-hover:rgba(0,87,190,.15);--spectrum-alias-transparent-blue-background-color-down:rgba(0,72,153,.3);--spectrum-alias-transparent-blue-background-color-key-focus:var(--spectrum-alias-transparent-blue-background-color-hover);--spectrum-alias-transparent-blue-background-color-mouse-focus:var(--spectrum-alias-transparent-blue-background-color-hover);--spectrum-alias-transparent-blue-background-color:var(--spectrum-alias-component-text-color-default);--spectrum-alias-transparent-red-background-color-hover:rgba(154,0,0,.15);--spectrum-alias-transparent-red-background-color-down:rgba(124,0,0,.3);--spectrum-alias-transparent-red-background-color-key-focus:var(--spectrum-alias-transparent-red-background-color-hover);--spectrum-alias-transparent-red-background-color-mouse-focus:var(--spectrum-alias-transparent-red-background-color-hover);--spectrum-alias-transparent-red-background-color:var(--spectrum-alias-component-text-color-default);--spectrum-alias-component-text-color-disabled:var(--spectrum-global-color-gray-500);--spectrum-alias-component-text-color-default:var(--spectrum-global-color-gray-800);--spectrum-alias-component-text-color-hover:var(--spectrum-global-color-gray-900);--spectrum-alias-component-text-color-down:var(--spectrum-global-color-gray-900);--spectrum-alias-component-text-color-key-focus:var(--spectrum-alias-component-text-color-hover);--spectrum-alias-component-text-color-mouse-focus:var(--spectrum-alias-component-text-color-hover);--spectrum-alias-component-text-color:var(--spectrum-alias-component-text-color-default);--spectrum-alias-component-text-color-selected-default:var(--spectrum-alias-component-text-color-default);--spectrum-alias-component-text-color-selected-hover:var(--spectrum-alias-component-text-color-hover);--spectrum-alias-component-text-color-selected-down:var(--spectrum-alias-component-text-color-down);--spectrum-alias-component-text-color-selected-key-focus:var(--spectrum-alias-component-text-color-key-focus);--spectrum-alias-component-text-color-selected-mouse-focus:var(--spectrum-alias-component-text-color-mouse-focus);--spectrum-alias-component-text-color-selected:var(--spectrum-alias-component-text-color-selected-default);--spectrum-alias-component-text-color-emphasized-selected-default:var(--spectrum-global-color-static-white);--spectrum-alias-component-text-color-emphasized-selected-hover:var(--spectrum-alias-component-text-color-emphasized-selected-default);--spectrum-alias-component-text-color-emphasized-selected-down:var(--spectrum-alias-component-text-color-emphasized-selected-default);--spectrum-alias-component-text-color-emphasized-selected-key-focus:var(--spectrum-alias-component-text-color-emphasized-selected-default);--spectrum-alias-component-text-color-emphasized-selected-mouse-focus:var(--spectrum-alias-component-text-color-emphasized-selected-default);--spectrum-alias-component-text-color-emphasized-selected:var(--spectrum-alias-component-text-color-emphasized-selected-default);--spectrum-alias-component-text-color-error-default:var(--spectrum-semantic-negative-text-color-small);--spectrum-alias-component-text-color-error-hover:var(--spectrum-semantic-negative-text-color-small-hover);--spectrum-alias-component-text-color-error-down:var(--spectrum-semantic-negative-text-color-small-down);--spectrum-alias-component-text-color-error-key-focus:var(--spectrum-semantic-negative-text-color-small-key-focus);--spectrum-alias-component-text-color-error-mouse-focus:var(--spectrum-semantic-negative-text-color-small-key-focus);--spectrum-alias-component-text-color-error:var(--spectrum-alias-component-text-color-error-default);--spectrum-alias-component-icon-color-disabled:var(--spectrum-alias-icon-color-disabled);--spectrum-alias-component-icon-color-default:var(--spectrum-alias-icon-color);--spectrum-alias-component-icon-color-hover:var(--spectrum-alias-icon-color-hover);--spectrum-alias-component-icon-color-down:var(--spectrum-alias-icon-color-down);--spectrum-alias-component-icon-color-key-focus:var(--spectrum-alias-icon-color-hover);--spectrum-alias-component-icon-color-mouse-focus:var(--spectrum-alias-icon-color-down);--spectrum-alias-component-icon-color:var(--spectrum-alias-component-icon-color-default);--spectrum-alias-component-icon-color-selected:var(--spectrum-alias-icon-color-selected-neutral-subdued);--spectrum-alias-component-icon-color-emphasized-selected-default:var(--spectrum-global-color-static-white);--spectrum-alias-component-icon-color-emphasized-selected-hover:var(--spectrum-alias-component-icon-color-emphasized-selected-default);--spectrum-alias-component-icon-color-emphasized-selected-down:var(--spectrum-alias-component-icon-color-emphasized-selected-default);--spectrum-alias-component-icon-color-emphasized-selected-key-focus:var(--spectrum-alias-component-icon-color-emphasized-selected-default);--spectrum-alias-component-icon-color-emphasized-selected:var(--spectrum-alias-component-icon-color-emphasized-selected-default);--spectrum-alias-component-background-color-disabled:var(--spectrum-global-color-gray-200);--spectrum-alias-component-background-color-quiet-disabled:var(--spectrum-alias-background-color-transparent);--spectrum-alias-component-background-color-quiet-selected-disabled:var(--spectrum-alias-component-background-color-disabled);--spectrum-alias-component-background-color-default:var(--spectrum-global-color-gray-75);--spectrum-alias-component-background-color-hover:var(--spectrum-global-color-gray-50);--spectrum-alias-component-background-color-down:var(--spectrum-global-color-gray-200);--spectrum-alias-component-background-color-key-focus:var(--spectrum-global-color-gray-50);--spectrum-alias-component-background-color:var(--spectrum-alias-component-background-color-default);--spectrum-alias-component-background-color-selected-default:var(--spectrum-global-color-gray-200);--spectrum-alias-component-background-color-selected-hover:var(--spectrum-global-color-gray-200);--spectrum-alias-component-background-color-selected-down:var(--spectrum-global-color-gray-200);--spectrum-alias-component-background-color-selected-key-focus:var(--spectrum-global-color-gray-200);--spectrum-alias-component-background-color-selected:var(--spectrum-alias-component-background-color-selected-default);--spectrum-alias-component-background-color-quiet-default:var(--spectrum-alias-background-color-transparent);--spectrum-alias-component-background-color-quiet-hover:var(--spectrum-alias-background-color-transparent);--spectrum-alias-component-background-color-quiet-down:var(--spectrum-global-color-gray-300);--spectrum-alias-component-background-color-quiet-key-focus:var(--spectrum-alias-background-color-transparent);--spectrum-alias-component-background-color-quiet:var(--spectrum-alias-component-background-color-quiet-default);--spectrum-alias-component-background-color-quiet-selected-default:var(--spectrum-alias-component-background-color-selected-default);--spectrum-alias-component-background-color-quiet-selected-hover:var(--spectrum-alias-component-background-color-selected-hover);--spectrum-alias-component-background-color-quiet-selected-down:var(--spectrum-alias-component-background-color-selected-down);--spectrum-alias-component-background-color-quiet-selected-key-focus:var(--spectrum-alias-component-background-color-selected-key-focus);--spectrum-alias-component-background-color-quiet-selected:var(--spectrum-alias-component-background-color-selected-default);--spectrum-alias-component-background-color-emphasized-selected-default:var(--spectrum-semantic-cta-background-color-default);--spectrum-alias-component-background-color-emphasized-selected-hover:var(--spectrum-semantic-cta-background-color-hover);--spectrum-alias-component-background-color-emphasized-selected-down:var(--spectrum-semantic-cta-background-color-down);--spectrum-alias-component-background-color-emphasized-selected-key-focus:var(--spectrum-semantic-cta-background-color-key-focus);--spectrum-alias-component-background-color-emphasized-selected:var(--spectrum-alias-component-background-color-emphasized-selected-default);--spectrum-alias-component-border-color-disabled:var(--spectrum-alias-border-color-disabled);--spectrum-alias-component-border-color-quiet-disabled:var(--spectrum-alias-border-color-transparent);--spectrum-alias-component-border-color-default:var(--spectrum-alias-border-color);--spectrum-alias-component-border-color-hover:var(--spectrum-alias-border-color-hover);--spectrum-alias-component-border-color-down:var(--spectrum-alias-border-color-down);--spectrum-alias-component-border-color-key-focus:var(--spectrum-alias-border-color-key-focus);--spectrum-alias-component-border-color:var(--spectrum-alias-component-border-color-default);--spectrum-alias-component-border-color-selected-default:var(--spectrum-alias-border-color);--spectrum-alias-component-border-color-selected-hover:var(--spectrum-alias-border-color-hover);--spectrum-alias-component-border-color-selected-down:var(--spectrum-alias-border-color-down);--spectrum-alias-component-border-color-selected-key-focus:var(--spectrum-alias-border-color-key-focus);--spectrum-alias-component-border-color-selected:var(--spectrum-alias-component-border-color-selected-default);--spectrum-alias-component-border-color-quiet-default:var(--spectrum-alias-border-color-transparent);--spectrum-alias-component-border-color-quiet-hover:var(--spectrum-alias-border-color-transparent);--spectrum-alias-component-border-color-quiet-down:var(--spectrum-alias-border-color-transparent);--spectrum-alias-component-border-color-quiet-key-focus:var(--spectrum-alias-border-color-key-focus);--spectrum-alias-component-border-color-quiet:var(--spectrum-alias-component-border-color-quiet-default);--spectrum-alias-component-border-color-quiet-selected-default:var(--spectrum-global-color-gray-200);--spectrum-alias-component-border-color-quiet-selected-hover:var(--spectrum-global-color-gray-200);--spectrum-alias-component-border-color-quiet-selected-down:var(--spectrum-global-color-gray-200);--spectrum-alias-component-border-color-quiet-selected-key-focus:var(--spectrum-alias-border-color-key-focus);--spectrum-alias-component-border-color-quiet-selected:var(--spectrum-alias-component-border-color-quiet-selected-default);--spectrum-alias-component-border-color-emphasized-selected-default:var(--spectrum-semantic-cta-background-color-default);--spectrum-alias-component-border-color-emphasized-selected-hover:var(--spectrum-semantic-cta-background-color-hover);--spectrum-alias-component-border-color-emphasized-selected-down:var(--spectrum-semantic-cta-background-color-down);--spectrum-alias-component-border-color-emphasized-selected-key-focus:var(--spectrum-semantic-cta-background-color-key-focus);--spectrum-alias-component-border-color-emphasized-selected:var(--spectrum-alias-component-border-color-emphasized-selected-default);--spectrum-alias-avatar-border-color-default:var(--spectrum-alias-background-color-transparent);--spectrum-alias-avatar-border-color-hover:var(--spectrum-alias-background-color-transparent);--spectrum-alias-avatar-border-color-down:var(--spectrum-alias-background-color-transparent);--spectrum-alias-avatar-border-color-key-focus:var(--spectrum-alias-background-color-transparent);--spectrum-alias-avatar-border-color:var(--spectrum-alias-avatar-border-color-default);--spectrum-alias-avatar-border-color-disabled:var(--spectrum-alias-background-color-transparent);--spectrum-alias-avatar-border-color-selected-default:var(--spectrum-alias-background-color-transparent);--spectrum-alias-avatar-border-color-selected-hover:var(--spectrum-alias-background-color-transparent);--spectrum-alias-avatar-border-color-selected-down:var(--spectrum-alias-background-color-transparent);--spectrum-alias-avatar-border-color-selected-key-focus:var(--spectrum-alias-background-color-transparent);--spectrum-alias-avatar-border-color-selected:var(--spectrum-alias-avatar-border-color-selected-default);--spectrum-alias-avatar-border-color-selected-disabled:var(--spectrum-alias-background-color-transparent);--spectrum-alias-toggle-background-color-default:var(--spectrum-global-color-gray-700);--spectrum-alias-toggle-background-color-hover:var(--spectrum-global-color-gray-800);--spectrum-alias-toggle-background-color-down:var(--spectrum-global-color-gray-900);--spectrum-alias-toggle-background-color-key-focus:var(--spectrum-global-color-gray-800);--spectrum-alias-toggle-background-color:var(--spectrum-alias-toggle-background-color-default);--spectrum-alias-toggle-background-color-emphasized-selected-default:var(--spectrum-global-color-blue-500);--spectrum-alias-toggle-background-color-emphasized-selected-hover:var(--spectrum-global-color-blue-600);--spectrum-alias-toggle-background-color-emphasized-selected-down:var(--spectrum-global-color-blue-700);--spectrum-alias-toggle-background-color-emphasized-selected-key-focus:var(--spectrum-global-color-blue-600);--spectrum-alias-toggle-background-color-emphasized-selected:var(--spectrum-alias-toggle-background-color-emphasized-selected-default);--spectrum-alias-toggle-border-color-default:var(--spectrum-global-color-gray-700);--spectrum-alias-toggle-border-color-hover:var(--spectrum-global-color-gray-800);--spectrum-alias-toggle-border-color-down:var(--spectrum-global-color-gray-900);--spectrum-alias-toggle-border-color-key-focus:var(--spectrum-global-color-gray-800);--spectrum-alias-toggle-border-color:var(--spectrum-alias-toggle-border-color-default);--spectrum-alias-toggle-icon-color-selected:var(--spectrum-global-color-gray-75);--spectrum-alias-toggle-icon-color-emphasized-selected:var(--spectrum-global-color-gray-75);--spectrum-alias-button-primary-background-color-default:var(--spectrum-alias-background-color-transparent);--spectrum-alias-button-primary-background-color-hover:var(--spectrum-global-color-gray-800);--spectrum-alias-button-primary-background-color-down:var(--spectrum-global-color-gray-900);--spectrum-alias-button-primary-background-color-key-focus:var(--spectrum-global-color-gray-800);--spectrum-alias-button-primary-background-color:var(--spectrum-alias-button-primary-background-color-default);--spectrum-alias-button-primary-border-color-default:var(--spectrum-global-color-gray-800);--spectrum-alias-button-primary-border-color-hover:var(--spectrum-alias-button-primary-background-color-hover);--spectrum-alias-button-primary-border-color-down:var(--spectrum-alias-button-primary-background-color-down);--spectrum-alias-button-primary-border-color-key-focus:var(--spectrum-alias-button-primary-background-color-key-focus);--spectrum-alias-button-primary-border-color:var(--spectrum-alias-button-primary-border-color-default);--spectrum-alias-button-primary-text-color-default:var(--spectrum-global-color-gray-800);--spectrum-alias-button-primary-text-color-hover:var(--spectrum-global-color-gray-50);--spectrum-alias-button-primary-text-color-down:var(--spectrum-global-color-gray-50);--spectrum-alias-button-primary-text-color-key-focus:var(--spectrum-global-color-gray-50);--spectrum-alias-button-primary-text-color:var(--spectrum-alias-button-primary-text-color-default);--spectrum-alias-button-primary-icon-color-default:var(--spectrum-alias-button-primary-text-color-default);--spectrum-alias-button-primary-icon-color-hover:var(--spectrum-alias-button-primary-text-color-hover);--spectrum-alias-button-primary-icon-color-down:var(--spectrum-alias-button-primary-text-color-down);--spectrum-alias-button-primary-icon-color-key-focus:var(--spectrum-alias-button-primary-text-color-key-focus);--spectrum-alias-button-primary-icon-color:var(--spectrum-alias-button-primary-icon-color-default);--spectrum-alias-button-secondary-background-color-default:var(--spectrum-alias-background-color-transparent);--spectrum-alias-button-secondary-background-color-hover:var(--spectrum-global-color-gray-700);--spectrum-alias-button-secondary-background-color-down:var(--spectrum-global-color-gray-800);--spectrum-alias-button-secondary-background-color-key-focus:var(--spectrum-global-color-gray-700);--spectrum-alias-button-secondary-background-color:var(--spectrum-alias-button-secondary-background-color-default);--spectrum-alias-button-secondary-border-color-default:var(--spectrum-global-color-gray-700);--spectrum-alias-button-secondary-border-color-hover:var(--spectrum-alias-button-secondary-background-color-hover);--spectrum-alias-button-secondary-border-color-down:var(--spectrum-alias-button-secondary-background-color-down);--spectrum-alias-button-secondary-border-color-key-focus:var(--spectrum-alias-button-secondary-background-color-key-focus);--spectrum-alias-button-secondary-border-color:var(--spectrum-alias-button-secondary-border-color-default);--spectrum-alias-button-secondary-text-color-default:var(--spectrum-global-color-gray-700);--spectrum-alias-button-secondary-text-color-hover:var(--spectrum-global-color-gray-50);--spectrum-alias-button-secondary-text-color-down:var(--spectrum-global-color-gray-50);--spectrum-alias-button-secondary-text-color-key-focus:var(--spectrum-global-color-gray-50);--spectrum-alias-button-secondary-text-color:var(--spectrum-alias-button-secondary-text-color-default);--spectrum-alias-button-secondary-icon-color-default:var(--spectrum-alias-button-secondary-text-color-default);--spectrum-alias-button-secondary-icon-color-hover:var(--spectrum-alias-button-secondary-text-color-hover);--spectrum-alias-button-secondary-icon-color-down:var(--spectrum-alias-button-secondary-text-color-down);--spectrum-alias-button-secondary-icon-color-key-focus:var(--spectrum-alias-button-secondary-text-color-key-focus);--spectrum-alias-button-secondary-icon-color:var(--spectrum-alias-button-secondary-icon-color-default);--spectrum-alias-button-negative-background-color-default:var(--spectrum-alias-background-color-transparent);--spectrum-alias-button-negative-background-color-hover:var(--spectrum-semantic-negative-text-color-small);--spectrum-alias-button-negative-background-color-down:var(--spectrum-global-color-red-700);--spectrum-alias-button-negative-background-color-key-focus:var(--spectrum-semantic-negative-text-color-small);--spectrum-alias-button-negative-background-color:var(--spectrum-alias-button-negative-background-color-default);--spectrum-alias-button-negative-border-color-default:var(--spectrum-semantic-negative-text-color-small);--spectrum-alias-button-negative-border-color-hover:var(--spectrum-semantic-negative-text-color-small);--spectrum-alias-button-negative-border-color-down:var(--spectrum-global-color-red-700);--spectrum-alias-button-negative-border-color-key-focus:var(--spectrum-semantic-negative-text-color-small);--spectrum-alias-button-negative-border-color:var(--spectrum-alias-button-negative-border-color-default);--spectrum-alias-button-negative-text-color-default:var(--spectrum-semantic-negative-text-color-small);--spectrum-alias-button-negative-text-color-hover:var(--spectrum-global-color-gray-50);--spectrum-alias-button-negative-text-color-down:var(--spectrum-global-color-gray-50);--spectrum-alias-button-negative-text-color-key-focus:var(--spectrum-global-color-gray-50);--spectrum-alias-button-negative-text-color:var(--spectrum-alias-button-negative-text-color-default);--spectrum-alias-button-negative-icon-color-default:var(--spectrum-alias-button-negative-text-color-default);--spectrum-alias-button-negative-icon-color-hover:var(--spectrum-alias-button-negative-text-color-hover);--spectrum-alias-button-negative-icon-color-down:var(--spectrum-alias-button-negative-text-color-down);--spectrum-alias-button-negative-icon-color-key-focus:var(--spectrum-alias-button-negative-text-color-key-focus);--spectrum-alias-button-negative-icon-color:var(--spectrum-alias-button-negative-icon-color-default);--spectrum-alias-input-border-color-disabled:var(--spectrum-alias-border-color-transparent);--spectrum-alias-input-border-color-quiet-disabled:var(--spectrum-alias-border-color-mid);--spectrum-alias-input-border-color-default:var(--spectrum-alias-border-color);--spectrum-alias-input-border-color-hover:var(--spectrum-alias-border-color-hover);--spectrum-alias-input-border-color-down:var(--spectrum-alias-border-color-mouse-focus);--spectrum-alias-input-border-color-mouse-focus:var(--spectrum-alias-border-color-mouse-focus);--spectrum-alias-input-border-color-key-focus:var(--spectrum-alias-border-color-key-focus);--spectrum-alias-input-border-color:var(--spectrum-alias-input-border-color-default);--spectrum-alias-input-border-color-invalid-default:var(--spectrum-semantic-negative-color-default);--spectrum-alias-input-border-color-invalid-hover:var(--spectrum-semantic-negative-color-hover);--spectrum-alias-input-border-color-invalid-down:var(--spectrum-semantic-negative-color-down);--spectrum-alias-input-border-color-invalid-mouse-focus:var(--spectrum-semantic-negative-color-hover);--spectrum-alias-input-border-color-invalid-key-focus:var(--spectrum-alias-border-color-key-focus);--spectrum-alias-input-border-color-invalid:var(--spectrum-alias-input-border-color-invalid-default);--spectrum-alias-background-color-yellow-default:var(--spectrum-global-color-static-yellow-300);--spectrum-alias-background-color-yellow-hover:var(--spectrum-global-color-static-yellow-400);--spectrum-alias-background-color-yellow-key-focus:var(--spectrum-global-color-static-yellow-400);--spectrum-alias-background-color-yellow-down:var(--spectrum-global-color-static-yellow-500);--spectrum-alias-background-color-yellow:var(--spectrum-alias-background-color-yellow-default);--spectrum-alias-infieldbutton-background-color:var(--spectrum-global-color-gray-200);--spectrum-alias-infieldbutton-fill-loudnessLow-border-color-disabled:transparent;--spectrum-alias-infieldbutton-fill-loudnessMedium-border-color-disabled:transparent;--spectrum-alias-infieldbutton-fill-loudnessHigh-border-color-disabled:var(--spectrum-alias-component-background-color-disabled);--spectrum-alias-infieldbutton-fill-border-color-default:var(--spectrum-alias-input-border-color-default);--spectrum-alias-infieldbutton-fill-border-color-hover:var(--spectrum-alias-input-border-color-hover);--spectrum-alias-infieldbutton-fill-border-color-down:var(--spectrum-alias-input-border-color-down);--spectrum-alias-infieldbutton-fill-border-color-mouse-focus:var(--spectrum-alias-input-border-color-mouse-focus);--spectrum-alias-infieldbutton-fill-border-color-key-focus:var(--spectrum-alias-input-border-color-key-focus);--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-default:transparent;--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-hover:transparent;--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-down:transparent;--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-key-focus:transparent;--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-disabled:transparent;--spectrum-alias-infieldbutton-fill-loudnessMedium-background-color-default:var(--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-default);--spectrum-alias-infieldbutton-fill-loudnessMedium-background-color-hover:var(--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-hover);--spectrum-alias-infieldbutton-fill-loudnessMedium-background-color-down:var(--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-down);--spectrum-alias-infieldbutton-fill-loudnessMedium-background-color-key-focus:var(--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-key-focus);--spectrum-alias-infieldbutton-fill-loudnessMedium-background-color-disabled:transparent;--spectrum-alias-infieldbutton-fill-loudnessHigh-background-color-default:var(--spectrum-alias-component-background-color-default);--spectrum-alias-infieldbutton-fill-loudnessHigh-background-color-hover:var(--spectrum-alias-component-background-color-hover);--spectrum-alias-infieldbutton-fill-loudnessHigh-background-color-down:var(--spectrum-alias-component-background-color-down);--spectrum-alias-infieldbutton-fill-loudnessHigh-background-color-key-focus:var(--spectrum-alias-component-background-color-key-focus);--spectrum-alias-infieldbutton-fill-loudnessHigh-background-color-disabled:var(--spectrum-alias-component-background-color-disabled);--spectrum-alias-tabs-divider-background-color-default:var(--spectrum-global-color-gray-300);--spectrum-alias-tabs-divider-background-color-quiet:var(--spectrum-alias-background-color-transparent);--spectrum-alias-tabitem-text-color-default:var(--spectrum-alias-label-text-color);--spectrum-alias-tabitem-text-color-hover:var(--spectrum-alias-text-color-hover);--spectrum-alias-tabitem-text-color-down:var(--spectrum-alias-text-color-down);--spectrum-alias-tabitem-text-color-key-focus:var(--spectrum-alias-text-color-hover);--spectrum-alias-tabitem-text-color-mouse-focus:var(--spectrum-alias-text-color-hover);--spectrum-alias-tabitem-text-color:var(--spectrum-alias-tabitem-text-color-default);--spectrum-alias-tabitem-text-color-selected-default:var(--spectrum-global-color-gray-900);--spectrum-alias-tabitem-text-color-selected-hover:var(--spectrum-alias-tabitem-text-color-selected-default);--spectrum-alias-tabitem-text-color-selected-down:var(--spectrum-alias-tabitem-text-color-selected-default);--spectrum-alias-tabitem-text-color-selected-key-focus:var(--spectrum-alias-tabitem-text-color-selected-default);--spectrum-alias-tabitem-text-color-selected-mouse-focus:var(--spectrum-alias-tabitem-text-color-selected-default);--spectrum-alias-tabitem-text-color-selected:var(--spectrum-alias-tabitem-text-color-selected-default);--spectrum-alias-tabitem-text-color-emphasized:var(--spectrum-alias-tabitem-text-color-default);--spectrum-alias-tabitem-text-color-emphasized-selected-default:var(--spectrum-global-color-static-blue-500);--spectrum-alias-tabitem-text-color-emphasized-selected-hover:var(--spectrum-alias-tabitem-text-color-emphasized-selected-default);--spectrum-alias-tabitem-text-color-emphasized-selected-down:var(--spectrum-alias-tabitem-text-color-emphasized-selected-default);--spectrum-alias-tabitem-text-color-emphasized-selected-key-focus:var(--spectrum-alias-tabitem-text-color-emphasized-selected-default);--spectrum-alias-tabitem-text-color-emphasized-selected-mouse-focus:var(--spectrum-alias-tabitem-text-color-emphasized-selected-default);--spectrum-alias-tabitem-text-color-emphasized-selected:var(--spectrum-alias-tabitem-text-color-emphasized-selected-default);--spectrum-alias-tabitem-selection-indicator-color-default:var(--spectrum-alias-tabitem-text-color-selected-default);--spectrum-alias-tabitem-selection-indicator-color-emphasized:var(--spectrum-alias-tabitem-text-color-emphasized-selected-default);--spectrum-alias-tabitem-icon-color-disabled:var(--spectrum-alias-text-color-disabled);--spectrum-alias-tabitem-icon-color-default:var(--spectrum-alias-icon-color);--spectrum-alias-tabitem-icon-color-hover:var(--spectrum-alias-icon-color-hover);--spectrum-alias-tabitem-icon-color-down:var(--spectrum-alias-icon-color-down);--spectrum-alias-tabitem-icon-color-key-focus:var(--spectrum-alias-icon-color-hover);--spectrum-alias-tabitem-icon-color-mouse-focus:var(--spectrum-alias-icon-color-down);--spectrum-alias-tabitem-icon-color:var(--spectrum-alias-tabitem-icon-color-default);--spectrum-alias-tabitem-icon-color-selected:var(--spectrum-alias-icon-color-selected-neutral);--spectrum-alias-tabitem-icon-color-emphasized:var(--spectrum-alias-tabitem-text-color-default);--spectrum-alias-tabitem-icon-color-emphasized-selected:var(--spectrum-alias-tabitem-text-color-emphasized-selected-default);--spectrum-alias-assetcard-selectionindicator-background-color-ordered:var(--spectrum-global-color-blue-500);--spectrum-alias-assetcard-overlay-background-color:rgba(27,127,245,.1);--spectrum-alias-assetcard-border-color-selected:var(--spectrum-global-color-blue-500);--spectrum-alias-assetcard-border-color-selected-hover:var(--spectrum-global-color-blue-500);--spectrum-alias-assetcard-border-color-selected-down:var(--spectrum-global-color-blue-600);--spectrum-alias-background-color-default:var(--spectrum-global-color-gray-100);--spectrum-alias-background-color-disabled:var(--spectrum-global-color-gray-200);--spectrum-alias-background-color-transparent:transparent;--spectrum-alias-background-color-overbackground-down:hsla(0,0%,100%,.2);--spectrum-alias-background-color-quiet-overbackground-hover:hsla(0,0%,100%,.1);--spectrum-alias-background-color-quiet-overbackground-down:hsla(0,0%,100%,.2);--spectrum-alias-background-color-overbackground-disabled:hsla(0,0%,100%,.1);--spectrum-alias-background-color-quickactions-overlay:rgba(0,0,0,.2);--spectrum-alias-placeholder-text-color:var(--spectrum-global-color-gray-800);--spectrum-alias-placeholder-text-color-hover:var(--spectrum-global-color-gray-900);--spectrum-alias-placeholder-text-color-down:var(--spectrum-global-color-gray-900);--spectrum-alias-placeholder-text-color-selected:var(--spectrum-global-color-gray-800);--spectrum-alias-label-text-color:var(--spectrum-global-color-gray-700);--spectrum-alias-text-color:var(--spectrum-global-color-gray-800);--spectrum-alias-text-color-hover:var(--spectrum-global-color-gray-900);--spectrum-alias-text-color-down:var(--spectrum-global-color-gray-900);--spectrum-alias-text-color-key-focus:var(--spectrum-global-color-blue-600);--spectrum-alias-text-color-mouse-focus:var(--spectrum-global-color-blue-600);--spectrum-alias-text-color-disabled:var(--spectrum-global-color-gray-500);--spectrum-alias-text-color-invalid:var(--spectrum-global-color-red-500);--spectrum-alias-text-color-selected:var(--spectrum-global-color-blue-600);--spectrum-alias-text-color-selected-neutral:var(--spectrum-global-color-gray-900);--spectrum-alias-text-color-overbackground:var(--spectrum-global-color-static-white);--spectrum-alias-text-color-overbackground-disabled:hsla(0,0%,100%,.2);--spectrum-alias-text-color-quiet-overbackground-disabled:hsla(0,0%,100%,.2);--spectrum-alias-heading-text-color:var(--spectrum-global-color-gray-900);--spectrum-alias-border-color:var(--spectrum-global-color-gray-400);--spectrum-alias-border-color-hover:var(--spectrum-global-color-gray-500);--spectrum-alias-border-color-down:var(--spectrum-global-color-gray-500);--spectrum-alias-border-color-key-focus:var(--spectrum-global-color-blue-400);--spectrum-alias-border-color-mouse-focus:var(--spectrum-global-color-blue-500);--spectrum-alias-border-color-disabled:var(--spectrum-global-color-gray-200);--spectrum-alias-border-color-extralight:var(--spectrum-global-color-gray-100);--spectrum-alias-border-color-light:var(--spectrum-global-color-gray-200);--spectrum-alias-border-color-mid:var(--spectrum-global-color-gray-300);--spectrum-alias-border-color-dark:var(--spectrum-global-color-gray-400);--spectrum-alias-border-color-darker-default:var(--spectrum-global-color-gray-600);--spectrum-alias-border-color-darker-hover:var(--spectrum-global-color-gray-900);--spectrum-alias-border-color-darker-down:var(--spectrum-global-color-gray-900);--spectrum-alias-border-color-transparent:transparent;--spectrum-alias-border-color-translucent-dark:rgba(0,0,0,.05);--spectrum-alias-border-color-translucent-darker:rgba(0,0,0,.1);--spectrum-alias-focus-color:var(--spectrum-global-color-blue-400);--spectrum-alias-focus-ring-color:var(--spectrum-alias-focus-color);--spectrum-alias-track-color-default:var(--spectrum-global-color-gray-300);--spectrum-alias-track-fill-color-overbackground:var(--spectrum-global-color-static-white);--spectrum-alias-track-color-disabled:var(--spectrum-global-color-gray-300);--spectrum-alias-thumbnail-darksquare-background-color:var(--spectrum-global-color-gray-300);--spectrum-alias-thumbnail-lightsquare-background-color:var(--spectrum-global-color-static-white);--spectrum-alias-track-color-overbackground:hsla(0,0%,100%,.2);--spectrum-alias-icon-color:var(--spectrum-global-color-gray-700);--spectrum-alias-icon-color-overbackground:var(--spectrum-global-color-static-white);--spectrum-alias-icon-color-hover:var(--spectrum-global-color-gray-900);--spectrum-alias-icon-color-down:var(--spectrum-global-color-gray-900);--spectrum-alias-icon-color-key-focus:var(--spectrum-global-color-gray-900);--spectrum-alias-icon-color-disabled:var(--spectrum-global-color-gray-400);--spectrum-alias-icon-color-overbackground-disabled:hsla(0,0%,100%,.2);--spectrum-alias-icon-color-quiet-overbackground-disabled:hsla(0,0%,100%,.15);--spectrum-alias-icon-color-selected-neutral:var(--spectrum-global-color-gray-900);--spectrum-alias-icon-color-selected-neutral-subdued:var(--spectrum-global-color-gray-800);--spectrum-alias-icon-color-selected:var(--spectrum-global-color-blue-500);--spectrum-alias-icon-color-selected-hover:var(--spectrum-global-color-blue-600);--spectrum-alias-icon-color-selected-down:var(--spectrum-global-color-blue-700);--spectrum-alias-icon-color-selected-focus:var(--spectrum-global-color-blue-600);--spectrum-alias-image-opacity-disabled:var(--spectrum-global-color-opacity-30);--spectrum-alias-toolbar-background-color:var(--spectrum-global-color-gray-100);--spectrum-alias-code-highlight-color-default:var(--spectrum-global-color-gray-800);--spectrum-alias-code-highlight-background-color:var(--spectrum-global-color-gray-75);--spectrum-alias-code-highlight-color-keyword:var(--spectrum-global-color-fuchsia-600);--spectrum-alias-code-highlight-color-section:var(--spectrum-global-color-red-600);--spectrum-alias-code-highlight-color-literal:var(--spectrum-global-color-blue-600);--spectrum-alias-code-highlight-color-attribute:var(--spectrum-global-color-seafoam-600);--spectrum-alias-code-highlight-color-class:var(--spectrum-global-color-magenta-600);--spectrum-alias-code-highlight-color-variable:var(--spectrum-global-color-purple-600);--spectrum-alias-code-highlight-color-title:var(--spectrum-global-color-indigo-600);--spectrum-alias-code-highlight-color-string:var(--spectrum-global-color-fuchsia-600);--spectrum-alias-code-highlight-color-function:var(--spectrum-global-color-blue-600);--spectrum-alias-code-highlight-color-comment:var(--spectrum-global-color-gray-700);--spectrum-alias-categorical-color-1:var(--spectrum-global-color-static-seafoam-200);--spectrum-alias-categorical-color-2:var(--spectrum-global-color-static-indigo-700);--spectrum-alias-categorical-color-3:var(--spectrum-global-color-static-orange-500);--spectrum-alias-categorical-color-4:var(--spectrum-global-color-static-magenta-500);--spectrum-alias-categorical-color-5:var(--spectrum-global-color-static-indigo-200);--spectrum-alias-categorical-color-6:var(--spectrum-global-color-static-celery-200);--spectrum-alias-categorical-color-7:var(--spectrum-global-color-static-blue-500);--spectrum-alias-categorical-color-8:var(--spectrum-global-color-static-purple-800);--spectrum-alias-categorical-color-9:var(--spectrum-global-color-static-yellow-500);--spectrum-alias-categorical-color-10:var(--spectrum-global-color-static-orange-700);--spectrum-alias-categorical-color-11:var(--spectrum-global-color-static-green-600);--spectrum-alias-categorical-color-12:var(--spectrum-global-color-static-chartreuse-300);--spectrum-alias-categorical-color-13:var(--spectrum-global-color-static-blue-200);--spectrum-alias-categorical-color-14:var(--spectrum-global-color-static-fuchsia-500);--spectrum-alias-categorical-color-15:var(--spectrum-global-color-static-magenta-200);--spectrum-alias-categorical-color-16:var(--spectrum-global-color-static-yellow-200)}:host,:root{--spectrum-colorloupe-express-visibility:none;--spectrum-colorloupe-spectrum-visibility:block;--spectrum-colorloupe-outer-border-color:transparent;--spectrum-colorloupe-outer-border-size:0;--spectrum-colorloupe-outer-stroke-color:var(--spectrum-global-color-static-transparent-black-200);--spectrum-colorloupe-outer-stroke-width:var(--spectrum-alias-border-size-thick);--spectrum-colorhandle-background-offset:calc(var(--spectrum-global-dimension-static-size-25)*-1);--spectrum-colorhandle-inner-shadow-color:var(--spectrum-colorhandle-outer-shadow-color);--spectrum-colorhandle-outer-shadow-color:rgba(0,0,0,.42);--spectrum-colorhandle-outer-shadow-blur:0;--spectrum-colorhandle-outer-shadow-spread:var(--spectrum-alias-border-size-thin);--spectrum-colorcontrol-checkerboard-light-color:var(--spectrum-global-color-static-white);--spectrum-colorcontrol-checkerboard-dark-color:var(--spectrum-global-color-static-gray-300);--spectrum-slider-m-track-inside-border-radius:var(--spectrum-slider-m-track-border-radius);--spectrum-slider-label-text-size:var(--spectrum-global-dimension-font-size-75)}:host,:root{-webkit-tap-highlight-color:rgba(0,0,0,0)}:host,:root{--spectrum-transparent-white-100:hsla(0,0%,100%,0);--spectrum-transparent-white-200:hsla(0,0%,100%,.1);--spectrum-transparent-white-300:hsla(0,0%,100%,.25);--spectrum-transparent-white-400:hsla(0,0%,100%,.4);--spectrum-transparent-white-500:hsla(0,0%,100%,.55);--spectrum-transparent-white-600:hsla(0,0%,100%,.7);--spectrum-transparent-white-700:hsla(0,0%,100%,.8);--spectrum-transparent-white-800:hsla(0,0%,100%,.9);--spectrum-transparent-white-900:#fff;--spectrum-transparent-black-100:transparent;--spectrum-transparent-black-200:rgba(0,0,0,.1);--spectrum-transparent-black-300:rgba(0,0,0,.25);--spectrum-transparent-black-400:rgba(0,0,0,.4);--spectrum-transparent-black-500:rgba(0,0,0,.55);--spectrum-transparent-black-600:rgba(0,0,0,.7);--spectrum-transparent-black-700:rgba(0,0,0,.8);--spectrum-transparent-black-800:rgba(0,0,0,.9);--spectrum-transparent-black-900:#000;--spectrum-focus-indicator-color:var(--spectrum-blue-800);--spectrum-static-white-focus-indicator-color:var(--spectrum-white);--spectrum-static-black-focus-indicator-color:var(--spectrum-black);--spectrum-overlay-color:var(--spectrum-black);--spectrum-neutral-content-color-default:var(--spectrum-gray-800);--spectrum-neutral-content-color-hover:var(--spectrum-gray-900);--spectrum-neutral-content-color-down:var(--spectrum-gray-900);--spectrum-neutral-content-color-key-focus:var(--spectrum-gray-900);--spectrum-neutral-subdued-content-color-default:var(--spectrum-gray-700);--spectrum-neutral-subdued-content-color-hover:var(--spectrum-gray-800);--spectrum-neutral-subdued-content-color-down:var(--spectrum-gray-900);--spectrum-neutral-subdued-content-color-key-focus:var(--spectrum-gray-800);--spectrum-accent-content-color-default:var(--spectrum-accent-color-900);--spectrum-accent-content-color-hover:var(--spectrum-accent-color-1000);--spectrum-accent-content-color-down:var(--spectrum-accent-color-1100);--spectrum-accent-content-color-key-focus:var(--spectrum-accent-color-1000);--spectrum-negative-content-color-default:var(--spectrum-negative-color-900);--spectrum-negative-content-color-hover:var(--spectrum-negative-color-1000);--spectrum-negative-content-color-down:var(--spectrum-negative-color-1100);--spectrum-negative-content-color-key-focus:var(--spectrum-negative-color-1000);--spectrum-disabled-content-color:var(--spectrum-gray-400);--spectrum-disabled-static-white-content-color:var(--spectrum-transparent-white-500);--spectrum-disabled-static-black-content-color:var(--spectrum-transparent-black-500);--spectrum-disabled-background-color:var(--spectrum-gray-200);--spectrum-disabled-static-white-background-color:var(--spectrum-transparent-white-200);--spectrum-disabled-static-black-background-color:var(--spectrum-transparent-black-200);--spectrum-disabled-border-color:var(--spectrum-gray-300);--spectrum-disabled-static-white-border-color:var(--spectrum-transparent-white-300);--spectrum-disabled-static-black-border-color:var(--spectrum-transparent-black-300);--spectrum-opacity-disabled:0.3;--spectrum-background-opacity-default:0;--spectrum-background-opacity-hover:0.1;--spectrum-background-opacity-down:0.1;--spectrum-background-opacity-key-focus:0.1;--spectrum-negative-border-color-default:var(--spectrum-negative-color-900);--spectrum-negative-border-color-hover:var(--spectrum-negative-color-1000);--spectrum-negative-border-color-down:var(--spectrum-negative-color-1100);--spectrum-negative-border-color-key-focus:var(--spectrum-negative-color-1000);--spectrum-informative-color-100:var(--spectrum-blue-100);--spectrum-informative-color-200:var(--spectrum-blue-200);--spectrum-informative-color-300:var(--spectrum-blue-300);--spectrum-informative-color-400:var(--spectrum-blue-400);--spectrum-informative-color-500:var(--spectrum-blue-500);--spectrum-informative-color-600:var(--spectrum-blue-600);--spectrum-informative-color-700:var(--spectrum-blue-700);--spectrum-informative-color-800:var(--spectrum-blue-800);--spectrum-informative-color-900:var(--spectrum-blue-900);--spectrum-informative-color-1000:var(--spectrum-blue-1000);--spectrum-informative-color-1100:var(--spectrum-blue-1100);--spectrum-informative-color-1200:var(--spectrum-blue-1200);--spectrum-informative-color-1300:var(--spectrum-blue-1300);--spectrum-informative-color-1400:var(--spectrum-blue-1400);--spectrum-negative-color-100:var(--spectrum-red-100);--spectrum-negative-color-200:var(--spectrum-red-200);--spectrum-negative-color-300:var(--spectrum-red-300);--spectrum-negative-color-400:var(--spectrum-red-400);--spectrum-negative-color-500:var(--spectrum-red-500);--spectrum-negative-color-600:var(--spectrum-red-600);--spectrum-negative-color-700:var(--spectrum-red-700);--spectrum-negative-color-800:var(--spectrum-red-800);--spectrum-negative-color-900:var(--spectrum-red-900);--spectrum-negative-color-1000:var(--spectrum-red-1000);--spectrum-negative-color-1100:var(--spectrum-red-1100);--spectrum-negative-color-1200:var(--spectrum-red-1200);--spectrum-negative-color-1300:var(--spectrum-red-1300);--spectrum-negative-color-1400:var(--spectrum-red-1400);--spectrum-notice-color-100:var(--spectrum-orange-100);--spectrum-notice-color-200:var(--spectrum-orange-200);--spectrum-notice-color-300:var(--spectrum-orange-300);--spectrum-notice-color-400:var(--spectrum-orange-400);--spectrum-notice-color-500:var(--spectrum-orange-500);--spectrum-notice-color-600:var(--spectrum-orange-600);--spectrum-notice-color-700:var(--spectrum-orange-700);--spectrum-notice-color-800:var(--spectrum-orange-800);--spectrum-notice-color-900:var(--spectrum-orange-900);--spectrum-notice-color-1000:var(--spectrum-orange-1000);--spectrum-notice-color-1100:var(--spectrum-orange-1100);--spectrum-notice-color-1200:var(--spectrum-orange-1200);--spectrum-notice-color-1300:var(--spectrum-orange-1300);--spectrum-notice-color-1400:var(--spectrum-orange-1400);--spectrum-positive-color-100:var(--spectrum-green-100);--spectrum-positive-color-200:var(--spectrum-green-200);--spectrum-positive-color-300:var(--spectrum-green-300);--spectrum-positive-color-400:var(--spectrum-green-400);--spectrum-positive-color-500:var(--spectrum-green-500);--spectrum-positive-color-600:var(--spectrum-green-600);--spectrum-positive-color-700:var(--spectrum-green-700);--spectrum-positive-color-800:var(--spectrum-green-800);--spectrum-positive-color-900:var(--spectrum-green-900);--spectrum-positive-color-1000:var(--spectrum-green-1000);--spectrum-positive-color-1100:var(--spectrum-green-1100);--spectrum-positive-color-1200:var(--spectrum-green-1200);--spectrum-positive-color-1300:var(--spectrum-green-1300);--spectrum-positive-color-1400:var(--spectrum-green-1400);--spectrum-black:#000;--spectrum-white:#fff;--spectrum-swatch-border-color:var(--spectrum-gray-900);--spectrum-swatch-border-opacity:0.51;--spectrum-swatch-disabled-icon-border-color:var(--spectrum-black);--spectrum-swatch-disabled-icon-border-opacity:0.51;--spectrum-alert-dialog-minimum-width:288px;--spectrum-alert-dialog-maximum-width:480px;--spectrum-button-minimum-width-multiplier:2.25;--spectrum-divider-thickness-small:1px;--spectrum-divider-thickness-medium:2px;--spectrum-divider-thickness-large:4px;--spectrum-field-label-to-component:0px;--spectrum-menu-item-label-to-description:1px;--spectrum-meter-minimum-width:48px;--spectrum-meter-maximum-width:768px;--spectrum-swatch-rectangle-width-multiplier:2;--spectrum-swatch-slash-thickness-extra-small:2px;--spectrum-swatch-slash-thickness-small:3px;--spectrum-swatch-slash-thickness-medium:4px;--spectrum-swatch-slash-thickness-large:5px;--spectrum-progress-bar-minimum-width:48px;--spectrum-progress-bar-maximum-width:768px;--spectrum-radio-button-selection-indicator:4px;--spectrum-help-text-to-component:0px;--spectrum-popover-tip-width:16px;--spectrum-popover-tip-height:8px;--spectrum-sans-serif-heading-light:var(--spectrum-font-light-default);--spectrum-serif-heading-light:var(--spectrum-font-regular-default);--spectrum-heading-heavy:var(--spectrum-font-black-default);--spectrum-heading-light-strong:var(--spectrum-font-bold-default);--spectrum-heading-strong:var(--spectrum-font-black-default);--spectrum-heading-heavy-strong:var(--spectrum-font-black-default);--spectrum-sans-serif-heading-light-emphasized:var(--spectrum-font-light-italic-default);--spectrum-serif-heading-light-emphasized:var(--spectrum-font-italic-default);--spectrum-heading-heavy-emphasized:var(--spectrum-font-black-italic-default);--spectrum-heading-light-strong-emphasized:var(--spectrum-font-bold-italic-default);--spectrum-heading-strong-emphasized:var(--spectrum-font-black-italic-default);--spectrum-heading-heavy-strong-emphasized:var(--spectrum-font-black-italic-default);--spectrum-cjk-heading-light:var(--spectrum-font-light-cjk);--spectrum-cjk-heading-heavy:var(--spectrum-font-black-cjk);--spectrum-cjk-heading-light-strong:var(--spectrum-font-extra-bold-cjk);--spectrum-cjk-heading-strong:var(--spectrum-font-black-cjk);--spectrum-cjk-heading-heavy-strong:var(--spectrum-font-black-cjk);--spectrum-cjk-heading-light-emphasized:var(--spectrum-font-black-cjk);--spectrum-cjk-heading-emphasized:var(--spectrum-font-black-cjk);--spectrum-cjk-heading-heavy-emphasized:var(--spectrum-font-black-cjk);--spectrum-cjk-heading-light-strong-emphasized:var(--spectrum-font-extra-bold-cjk);--spectrum-cjk-heading-strong-emphasized:var(--spectrum-font-black-cjk);--spectrum-cjk-heading-heavy-strong-emphasized:var(--spectrum-font-black-cjk);--spectrum-heading-size-xxxl:var(--spectrum-font-size-1300);--spectrum-heading-size-xxl:var(--spectrum-font-size-1100);--spectrum-heading-size-xl:var(--spectrum-font-size-900);--spectrum-heading-size-l:var(--spectrum-font-size-700);--spectrum-heading-size-m:var(--spectrum-font-size-500);--spectrum-heading-size-s:var(--spectrum-font-size-300);--spectrum-heading-size-xs:var(--spectrum-font-size-200);--spectrum-heading-size-xxs:var(--spectrum-font-size-100);--spectrum-heading-line-height:var(--spectrum-line-height-100);--spectrum-cjk-heading-line-height:var(--spectrum-cjk-line-height-100);--spectrum-heading-margin-top-multiplier:0.8889;--spectrum-heading-margin-bottom-multiplier:0.25;--spectrum-body:var(--spectrum-font-regular-default);--spectrum-body-strong:var(--spectrum-font-bold-default);--spectrum-body-emphasized:var(--spectrum-font-italic-default);--spectrum-body-strong-emphasized:var(--spectrum-font-bold-italic-default);--spectrum-cjk-body:var(--spectrum-font-regular-cjk);--spectrum-cjk-body-strong:var(--spectrum-font-black-cjk);--spectrum-cjk-body-emphasized:var(--spectrum-font-extra-bold-cjk);--spectrum-cjk-body-strong-emphasized:var(--spectrum-font-black-cjk);--spectrum-body-size-xxxl:var(--spectrum-font-size-600);--spectrum-body-size-xxl:var(--spectrum-font-size-500);--spectrum-body-size-xl:var(--spectrum-font-size-400);--spectrum-body-size-l:var(--spectrum-font-size-300);--spectrum-body-size-m:var(--spectrum-font-size-200);--spectrum-body-size-s:var(--spectrum-font-size-100);--spectrum-body-size-xs:var(--spectrum-font-size-75);--spectrum-body-line-height:var(--spectrum-line-height-200);--spectrum-cjk-body-line-height:var(--spectrum-cjk-line-height-200);--spectrum-body-margin-multiplier:0.75;--spectrum-detail:var(--spectrum-font-bold-default);--spectrum-detail-light:var(--spectrum-font-regular-default);--spectrum-detail-strong:var(--spectrum-font-bold-default);--spectrum-detail-light-strong:var(--spectrum-font-regular-default);--spectrum-detail-emphasized:var(--spectrum-font-bold-italic-default);--spectrum-detail-light-emphasized:var(--spectrum-font-italic-default);--spectrum-detail-strong-emphasized:var(--spectrum-font-bold-italic-default);--spectrum-detail-light-strong-emphasized:var(--spectrum-font-italic-default);--spectrum-cjk-detail:var(--spectrum-font-extra-bold-cjk);--spectrum-cjk-detail-light:var(--spectrum-font-light-cjk);--spectrum-cjk-detail-strong:var(--spectrum-font-black-cjk);--spectrum-cjk-detail-light-strong:var(--spectrum-font-extra-bold-cjk);--spectrum-cjk-detail-emphasized:var(--spectrum-font-black-cjk);--spectrum-cjk-detail-light-emphasized:var(--spectrum-font-regular-cjk);--spectrum-cjk-detail-strong-emphasized:var(--spectrum-font-black-cjk);--spectrum-cjk-detail-light-strong-emphasized:var(--spectrum-font-extra-bold-cjk);--spectrum-detail-size-xl:var(--spectrum-font-size-200);--spectrum-detail-size-l:var(--spectrum-font-size-100);--spectrum-detail-size-m:var(--spectrum-font-size-75);--spectrum-detail-size-s:var(--spectrum-font-size-50);--spectrum-detail-line-height:var(--spectrum-line-height-100);--spectrum-cjk-detail-line-height:var(--spectrum-cjk-line-height-100);--spectrum-detail-margin-top-mulitplier:0.8889;--spectrum-detail-margin-bottom-multiplier:0.25;--spectrum-detail-letter-spacing:0.06em;--spectrum-code:var(--spectrum-font-regular-default);--spectrum-code-strong:var(--spectrum-font-bold-default);--spectrum-code-emphasized:var(--spectrum-font-italic-default);--spectrum-code-strong-emphasized:var(--spectrum-font-bold-italic-default);--spectrum-cjk-code:var(--spectrum-font-regular-cjk);--spectrum-cjk-code-strong:var(--spectrum-font-black-cjk);--spectrum-cjk-code-emphasized:var(--spectrum-font-bold-cjk);--spectrum-cjk-code-strong-emphasized:var(--spectrum-font-black-cjk);--spectrum-code-size-xl:var(--spectrum-font-size-400);--spectrum-code-size-l:var(--spectrum-font-size-300);--spectrum-code-size-m:var(--spectrum-font-size-200);--spectrum-code-size-s:var(--spectrum-font-size-100);--spectrum-code-size-xs:var(--spectrum-font-size-75);--spectrum-code-line-height:var(--spectrum-line-height-200);--spectrum-cjk-code-line-height:var(--spectrum-cjk-line-height-200);--spectrum-picker-minimum-width-multiplier:2;--spectrum-text-field-minimum-width-multiplier:1.5;--spectrum-combo-box-minimum-width-multiplier:2.5;--spectrum-combo-box-quiet-minimum-width-multiplier:2;--spectrum-combo-box-visual-to-field-button-quiet:0;--spectrum-android-elevation:2dp;--spectrum-spacing-50:2px;--spectrum-spacing-75:4px;--spectrum-spacing-100:8px;--spectrum-spacing-200:12px;--spectrum-spacing-300:16px;--spectrum-spacing-400:24px;--spectrum-spacing-500:32px;--spectrum-spacing-600:40px;--spectrum-spacing-700:48px;--spectrum-spacing-800:64px;--spectrum-spacing-900:80px;--spectrum-spacing-1000:96px;--spectrum-focus-indicator-thickness:2px;--spectrum-focus-indicator-gap:2px;--spectrum-border-width-200:2px;--spectrum-border-width-400:4px;--spectrum-line-height-100:1.3;--spectrum-line-height-200:1.5;--spectrum-font-family-default:var(--spectrum-font-family-sans-serif);--spectrum-font-family-sans-serif:adobe clean;--spectrum-font-family-serif:adobe clean serif;--spectrum-font-family-code:source code pro;--spectrum-font-light-default:adobe clean light;--spectrum-font-light-cjk:adobe clean han light;--spectrum-font-light-monospace:source code pro;--spectrum-font-light-italic-default:adobe clean light italic;--spectrum-font-light-italic-monospace:source code pro light italic;--spectrum-font-regular-default:adobe clean regular;--spectrum-font-regular-cjk:adobe clean han regular;--spectrum-font-regular-serif:adobe clean serif regular;--spectrum-font-regular-monospace:source code pro regular;--spectrum-font-italic-default:adobe clean italic;--spectrum-font-italic-serif:adobe clean serif italic;--spectrum-font-italic-monospace:source code pro italic;--spectrum-font-medium-default:adobe clean medium;--spectrum-font-medium-serif:adobe clean serif medium;--spectrum-font-medium-monospace:source code pro medium;--spectrum-font-bold-default:adobe clean bold;--spectrum-font-bold-cjk:adobe clean han bold;--spectrum-font-bold-serif:adobe clean serif bold;--spectrum-font-bold-monospace:source code pro bold;--spectrum-font-bold-italic-default:adobe clean bold italic;--spectrum-font-bold-italic-serif:adobe clean serif bold italic;--spectrum-font-bold-italic-monospace:source code pro bold italic;--spectrum-font-extra-bold-default:adobe clean extra bold;--spectrum-font-extra-bold-cjk:adobe clean han extra bold;--spectrum-font-black-default:adobe clean #000;--spectrum-font-black-cjk:adobe clean han #000;--spectrum-font-black-serif:adobe clean serif #000;--spectrum-font-black-monospace:source code pro #000;--spectrum-font-black-italic-default:adobe clean #000 italic;--spectrum-font-black-italic-serif:adobe clean serif #000 italic;--spectrum-font-black-italic-monospace:source code pro #000 italic;--spectrum-cjk-letter-spacing:0.05em;--spectrum-cjk-line-height-100:1.5;--spectrum-cjk-line-height-200:1.7;--spectrum-field-edge-to-text-quiet:0px;--spectrum-field-edge-to-border-quiet:0px;--spectrum-field-edge-to-alert-icon-quiet:0px;--spectrum-field-edge-to-validation-icon-quiet:0px}:host,:root{--spectrum-accent-color-100:var(--spectrum-blue-100);--spectrum-accent-color-200:var(--spectrum-blue-200);--spectrum-accent-color-300:var(--spectrum-blue-300);--spectrum-accent-color-400:var(--spectrum-blue-400);--spectrum-accent-color-500:var(--spectrum-blue-500);--spectrum-accent-color-600:var(--spectrum-blue-600);--spectrum-accent-color-700:var(--spectrum-blue-700);--spectrum-accent-color-800:var(--spectrum-blue-800);--spectrum-accent-color-900:var(--spectrum-blue-900);--spectrum-accent-color-1000:var(--spectrum-blue-1000);--spectrum-accent-color-1100:var(--spectrum-blue-1100);--spectrum-accent-color-1200:var(--spectrum-blue-1200);--spectrum-accent-color-1300:var(--spectrum-blue-1300);--spectrum-accent-color-1400:var(--spectrum-blue-1400);--spectrum-heading:var(--spectrum-font-bold-default);--spectrum-heading-emphasized:var(--spectrum-font-bold-italic-default);--spectrum-cjk-heading:var(--spectrum-font-extra-bold-cjk);--spectrum-slider-track-thickness:2px;--spectrum-slider-handle-gap:4px;--spectrum-border-width-100:1px}:host,:root{--system-spectrum-actionbutton-background-color-default:var(--spectrum-gray-75);--system-spectrum-actionbutton-background-color-hover:var(--spectrum-gray-200);--system-spectrum-actionbutton-background-color-down:var(--spectrum-gray-300);--system-spectrum-actionbutton-background-color-focus:var(--spectrum-gray-200);--system-spectrum-actionbutton-border-color-default:var(--spectrum-gray-400);--system-spectrum-actionbutton-border-color-hover:var(--spectrum-gray-500);--system-spectrum-actionbutton-border-color-down:var(--spectrum-gray-600);--system-spectrum-actionbutton-border-color-focus:var(--spectrum-gray-500);--system-spectrum-actionbutton-content-color-default:var(--spectrum-neutral-content-color-default);--system-spectrum-actionbutton-content-color-hover:var(--spectrum-neutral-content-color-hover);--system-spectrum-actionbutton-content-color-down:var(--spectrum-neutral-content-color-down);--system-spectrum-actionbutton-content-color-focus:var(--spectrum-neutral-content-color-key-focus);--system-spectrum-actionbutton-background-color-disabled:transparent;--system-spectrum-actionbutton-border-color-disabled:var(--spectrum-disabled-border-color);--system-spectrum-actionbutton-content-color-disabled:var(--spectrum-disabled-content-color);--system-spectrum-actionbutton-quiet-background-color-default:transparent;--system-spectrum-actionbutton-quiet-background-color-hover:var(--spectrum-gray-200);--system-spectrum-actionbutton-quiet-background-color-down:var(--spectrum-gray-300);--system-spectrum-actionbutton-quiet-background-color-focus:var(--spectrum-gray-200);--system-spectrum-actionbutton-quiet-border-color-default:transparent;--system-spectrum-actionbutton-quiet-border-color-hover:transparent;--system-spectrum-actionbutton-quiet-border-color-down:transparent;--system-spectrum-actionbutton-quiet-border-color-focus:transparent;--system-spectrum-actionbutton-quiet-background-color-disabled:transparent;--system-spectrum-actionbutton-quiet-border-color-disabled:transparent;--system-spectrum-actionbutton-selected-background-color-default:var(--spectrum-neutral-subdued-background-color-default);--system-spectrum-actionbutton-selected-background-color-hover:var(--spectrum-neutral-subdued-background-color-hover);--system-spectrum-actionbutton-selected-background-color-down:var(--spectrum-neutral-subdued-background-color-down);--system-spectrum-actionbutton-selected-background-color-focus:var(--spectrum-neutral-subdued-background-color-key-focus);--system-spectrum-actionbutton-selected-border-color-default:transparent;--system-spectrum-actionbutton-selected-border-color-hover:transparent;--system-spectrum-actionbutton-selected-border-color-down:transparent;--system-spectrum-actionbutton-selected-border-color-focus:transparent;--system-spectrum-actionbutton-selected-content-color-default:var(--spectrum-white);--system-spectrum-actionbutton-selected-content-color-hover:var(--spectrum-white);--system-spectrum-actionbutton-selected-content-color-down:var(--spectrum-white);--system-spectrum-actionbutton-selected-content-color-focus:var(--spectrum-white);--system-spectrum-actionbutton-selected-background-color-disabled:var(--spectrum-disabled-background-color);--system-spectrum-actionbutton-selected-border-color-disabled:transparent;--system-spectrum-actionbutton-selected-emphasized-background-color-default:var(--spectrum-accent-background-color-default);--system-spectrum-actionbutton-selected-emphasized-background-color-hover:var(--spectrum-accent-background-color-hover);--system-spectrum-actionbutton-selected-emphasized-background-color-down:var(--spectrum-accent-background-color-down);--system-spectrum-actionbutton-selected-emphasized-background-color-focus:var(--spectrum-accent-background-color-key-focus);--system-spectrum-actionbutton-staticblack-quiet-border-color-default:transparent;--system-spectrum-actionbutton-staticwhite-quiet-border-color-default:transparent;--system-spectrum-actionbutton-staticblack-quiet-border-color-hover:transparent;--system-spectrum-actionbutton-staticwhite-quiet-border-color-hover:transparent;--system-spectrum-actionbutton-staticblack-quiet-border-color-down:transparent;--system-spectrum-actionbutton-staticwhite-quiet-border-color-down:transparent;--system-spectrum-actionbutton-staticblack-quiet-border-color-focus:transparent;--system-spectrum-actionbutton-staticwhite-quiet-border-color-focus:transparent;--system-spectrum-actionbutton-staticblack-quiet-border-color-disabled:transparent;--system-spectrum-actionbutton-staticwhite-quiet-border-color-disabled:transparent;--system-spectrum-actionbutton-staticblack-background-color-default:transparent;--system-spectrum-actionbutton-staticblack-background-color-hover:var(--spectrum-transparent-black-300);--system-spectrum-actionbutton-staticblack-background-color-down:var(--spectrum-transparent-black-400);--system-spectrum-actionbutton-staticblack-background-color-focus:var(--spectrum-transparent-black-300);--system-spectrum-actionbutton-staticblack-border-color-default:var(--spectrum-transparent-black-400);--system-spectrum-actionbutton-staticblack-border-color-hover:var(--spectrum-transparent-black-500);--system-spectrum-actionbutton-staticblack-border-color-down:var(--spectrum-transparent-black-600);--system-spectrum-actionbutton-staticblack-border-color-focus:var(--spectrum-transparent-black-500);--system-spectrum-actionbutton-staticblack-content-color-default:var(--spectrum-black);--system-spectrum-actionbutton-staticblack-content-color-hover:var(--spectrum-black);--system-spectrum-actionbutton-staticblack-content-color-down:var(--spectrum-black);--system-spectrum-actionbutton-staticblack-content-color-focus:var(--spectrum-black);--system-spectrum-actionbutton-staticblack-focus-indicator-color:var(--spectrum-static-black-focus-indicator-color);--system-spectrum-actionbutton-staticblack-background-color-disabled:transparent;--system-spectrum-actionbutton-staticblack-border-color-disabled:var(--spectrum-disabled-static-black-border-color);--system-spectrum-actionbutton-staticblack-content-color-disabled:var(--spectrum-disabled-static-black-content-color);--system-spectrum-actionbutton-staticblack-selected-background-color-default:var(--spectrum-transparent-black-800);--system-spectrum-actionbutton-staticblack-selected-background-color-hover:var(--spectrum-transparent-black-900);--system-spectrum-actionbutton-staticblack-selected-background-color-down:var(--spectrum-transparent-black-900);--system-spectrum-actionbutton-staticblack-selected-background-color-focus:var(--spectrum-transparent-black-900);--system-spectrum-actionbutton-staticblack-selected-border-color-disabled:transparent;--system-spectrum-actionbutton-staticblack-selected-content-color-default:var(--spectrum-white);--system-spectrum-actionbutton-staticblack-selected-content-color-hover:var(--spectrum-white);--system-spectrum-actionbutton-staticblack-selected-content-color-down:var(--spectrum-white);--system-spectrum-actionbutton-staticblack-selected-content-color-focus:var(--spectrum-white);--system-spectrum-actionbutton-staticblack-selected-background-color-disabled:var(--spectrum-disabled-static-black-background-color);--system-spectrum-actionbutton-staticwhite-background-color-default:transparent;--system-spectrum-actionbutton-staticwhite-background-color-hover:var(--spectrum-transparent-white-300);--system-spectrum-actionbutton-staticwhite-background-color-down:var(--spectrum-transparent-white-400);--system-spectrum-actionbutton-staticwhite-background-color-focus:var(--spectrum-transparent-white-300);--system-spectrum-actionbutton-staticwhite-border-color-default:var(--spectrum-transparent-white-400);--system-spectrum-actionbutton-staticwhite-border-color-hover:var(--spectrum-transparent-white-500);--system-spectrum-actionbutton-staticwhite-border-color-down:var(--spectrum-transparent-white-600);--system-spectrum-actionbutton-staticwhite-border-color-focus:var(--spectrum-transparent-white-500);--system-spectrum-actionbutton-staticwhite-content-color-default:var(--spectrum-white);--system-spectrum-actionbutton-staticwhite-content-color-hover:var(--spectrum-white);--system-spectrum-actionbutton-staticwhite-content-color-down:var(--spectrum-white);--system-spectrum-actionbutton-staticwhite-content-color-focus:var(--spectrum-white);--system-spectrum-actionbutton-staticwhite-focus-indicator-color:var(--spectrum-static-white-focus-indicator-color);--system-spectrum-actionbutton-staticwhite-background-color-disabled:transparent;--system-spectrum-actionbutton-staticwhite-border-color-disabled:var(--spectrum-disabled-static-white-border-color);--system-spectrum-actionbutton-staticwhite-content-color-disabled:var(--spectrum-disabled-static-white-content-color);--system-spectrum-actionbutton-staticwhite-selected-background-color-default:var(--spectrum-transparent-white-800);--system-spectrum-actionbutton-staticwhite-selected-background-color-hover:var(--spectrum-transparent-white-900);--system-spectrum-actionbutton-staticwhite-selected-background-color-down:var(--spectrum-transparent-white-900);--system-spectrum-actionbutton-staticwhite-selected-background-color-focus:var(--spectrum-transparent-white-900);--system-spectrum-actionbutton-staticwhite-selected-content-color-default:var(--spectrum-black);--system-spectrum-actionbutton-staticwhite-selected-content-color-hover:var(--spectrum-black);--system-spectrum-actionbutton-staticwhite-selected-content-color-down:var(--spectrum-black);--system-spectrum-actionbutton-staticwhite-selected-content-color-focus:var(--spectrum-black);--system-spectrum-actionbutton-staticwhite-selected-background-color-disabled:var(--spectrum-disabled-static-white-background-color);--system-spectrum-actionbutton-staticwhite-selected-border-color-disabled:transparent}:host,:root{--system-spectrum-checkbox-control-color-default:var(--spectrum-gray-600);--system-spectrum-checkbox-control-color-hover:var(--spectrum-gray-700);--system-spectrum-checkbox-control-color-down:var(--spectrum-gray-800);--system-spectrum-checkbox-control-color-focus:var(--spectrum-gray-700);--system-spectrum-checkbox-control-selected-color-default:var(--spectrum-gray-700);--system-spectrum-checkbox-control-selected-color-hover:var(--spectrum-gray-800);--system-spectrum-checkbox-control-selected-color-down:var(--spectrum-gray-900)}:host,:root{--system-spectrum-closebutton-background-color-default:transparent;--system-spectrum-closebutton-background-color-hover:var(--spectrum-gray-200);--system-spectrum-closebutton-background-color-down:var(--spectrum-gray-300);--system-spectrum-closebutton-background-color-focus:var(--spectrum-gray-200)}:host,:root{--system-spectrum-radio-button-border-color-default:var(--spectrum-gray-600);--system-spectrum-radio-button-border-color-hover:var(--spectrum-gray-700);--system-spectrum-radio-button-border-color-down:var(--spectrum-gray-800);--system-spectrum-radio-button-border-color-focus:var(--spectrum-gray-700);--system-spectrum-radio-button-checked-border-color-default:var(--spectrum-gray-700);--system-spectrum-radio-button-checked-border-color-hover:var(--spectrum-gray-800);--system-spectrum-radio-button-checked-border-color-down:var(--spectrum-gray-900);--system-spectrum-radio-button-checked-border-color-focus:var(--spectrum-gray-800);--system-spectrum-radio-emphasized-button-checked-border-color-default:var(--spectrum-accent-color-900);--system-spectrum-radio-emphasized-button-checked-border-color-hover:var(--spectrum-accent-color-1000);--system-spectrum-radio-emphasized-button-checked-border-color-down:var(--spectrum-accent-color-1100);--system-spectrum-radio-emphasized-button-checked-border-color-focus:var(--spectrum-accent-color-1000)}:host,:root{--system-spectrum-switch-background-color-selected-default:var(--spectrum-gray-700);--system-spectrum-switch-background-color-selected-hover:var(--spectrum-gray-800);--system-spectrum-switch-background-color-selected-down:var(--spectrum-gray-900);--system-spectrum-switch-background-color-selected-focus:var(--spectrum-gray-800);--system-spectrum-switch-handle-border-color-default:var(--spectrum-gray-600);--system-spectrum-switch-handle-border-color-hover:var(--spectrum-gray-700);--system-spectrum-switch-handle-border-color-down:var(--spectrum-gray-800);--system-spectrum-switch-handle-border-color-focus:var(--spectrum-gray-700);--system-spectrum-switch-handle-border-color-selected-default:var(--spectrum-gray-700);--system-spectrum-switch-handle-border-color-selected-hover:var(--spectrum-gray-800);--system-spectrum-switch-handle-border-color-selected-down:var(--spectrum-gray-900);--system-spectrum-switch-handle-border-color-selected-focus:var(--spectrum-gray-800)}:host,:root{--system-spectrum-toast-background-color-default:var(--spectrum-neutral-subdued-background-color-default)}:host,:root{--system-spectrum-actiongroup-gap-size-compact:0;--system-spectrum-actiongroup-horizontal-spacing-compact:-1px;--system-spectrum-actiongroup-vertical-spacing-compact:-1px}:host,:root{--system-spectrum-tag-border-color:var(--spectrum-gray-700);--system-spectrum-tag-border-color-hover:var(--spectrum-gray-800);--system-spectrum-tag-border-color-active:var(--spectrum-gray-900);--system-spectrum-tag-border-color-focus:var(--spectrum-gray-800);--system-spectrum-tag-size-small-corner-radius:var(--spectrum-corner-radius-100);--system-spectrum-tag-size-medium-corner-radius:var(--spectrum-corner-radius-100);--system-spectrum-tag-size-large-corner-radius:var(--spectrum-corner-radius-100);--system-spectrum-tag-background-color:var(--spectrum-gray-75);--system-spectrum-tag-background-color-hover:var(--spectrum-gray-75);--system-spectrum-tag-background-color-active:var(--spectrum-gray-200);--system-spectrum-tag-background-color-focus:var(--spectrum-gray-75);--system-spectrum-tag-content-color:var(--spectrum-neutral-subdued-content-color-default);--system-spectrum-tag-content-color-hover:var(--spectrum-neutral-subdued-content-color-hover);--system-spectrum-tag-content-color-active:var(--spectrum-neutral-subdued-content-color-down);--system-spectrum-tag-content-color-focus:var(--spectrum-neutral-subdued-content-color-key-focus);--system-spectrum-tag-border-color-selected:var(--spectrum-neutral-subdued-background-color-default);--system-spectrum-tag-border-color-selected-hover:var(--spectrum-neutral-subdued-background-color-hover);--system-spectrum-tag-border-color-selected-active:var(--spectrum-neutral-subdued-background-color-down);--system-spectrum-tag-border-color-selected-focus:var(--spectrum-neutral-subdued-background-color-key-focus);--system-spectrum-tag-background-color-selected:var(--spectrum-neutral-subdued-background-color-default);--system-spectrum-tag-background-color-selected-hover:var(--spectrum-neutral-subdued-background-color-hover);--system-spectrum-tag-background-color-selected-active:var(--spectrum-neutral-subdued-background-color-down);--system-spectrum-tag-background-color-selected-focus:var(--spectrum-neutral-subdued-background-color-key-focus);--system-spectrum-tag-border-color-disabled:transparent;--system-spectrum-tag-background-color-disabled:var(--spectrum-disabled-background-color);--system-spectrum-tag-size-small-spacing-inline-start:var(--spectrum-component-edge-to-visual-75);--system-spectrum-tag-size-small-label-spacing-inline-end:var(--spectrum-component-edge-to-text-75);--system-spectrum-tag-size-small-clear-button-spacing-inline-end:var(--spectrum-component-edge-to-visual-75);--system-spectrum-tag-size-medium-spacing-inline-start:var(--spectrum-component-edge-to-visual-100);--system-spectrum-tag-size-medium-label-spacing-inline-end:var(--spectrum-component-edge-to-text-100);--system-spectrum-tag-size-medium-clear-button-spacing-inline-end:var(--spectrum-component-edge-to-visual-100);--system-spectrum-tag-size-large-spacing-inline-start:var(--spectrum-component-edge-to-visual-200);--system-spectrum-tag-size-large-label-spacing-inline-end:var(--spectrum-component-edge-to-text-200);--system-spectrum-tag-size-large-clear-button-spacing-inline-end:var(--spectrum-component-edge-to-visual-200)}:host,:root{--system:spectrum}:host,:root{--spectrum-animation-duration-100:130ms;--spectrum-animation-duration-200:160ms;--spectrum-font-family-base:adobe-clean,"Source Sans Pro",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,"Trebuchet MS","Lucida Grande",sans-serif;--spectrum-font-family-serif:adobe-clean-serif,"Source Serif Pro",Georgia,serif;--spectrum-font-family-code:"Source Code Pro",Monaco,monospace;--spectrum-line-height-large:1.7;--spectrum-line-height-medium:1.5;--spectrum-line-height-small:1.3;--spectrum-font-weight-thin:100;--spectrum-font-weight-ultra-light:200;--spectrum-font-weight-light:300;--spectrum-font-weight-regular:400;--spectrum-font-weight-medium:500;--spectrum-font-weight-semi-bold:600;--spectrum-font-weight-bold:700;--spectrum-font-weight-extra-bold:800;--spectrum-font-weight-black:900;--spectrum-docs-static-white-background-color:#0f797d;--spectrum-docs-static-black-background-color:#cef7f3}:host,:root{font-family:var(--spectrum-alias-body-text-font-family);font-size:var(--spectrum-alias-font-size-default)}:host:lang(ar),:root:lang(ar){font-family:var(--spectrum-alias-font-family-ar)}:host:lang(he),:root:lang(he){font-family:var(--spectrum-alias-font-family-he)}:host:lang(zh-Hans),:root:lang(zh-Hans){font-family:var(--spectrum-alias-font-family-zhhans)}:host:lang(zh-Hant),:root:lang(zh-Hant){font-family:var(--spectrum-alias-font-family-zh)}:host:lang(zh),:root:lang(zh){font-family:var(--spectrum-alias-font-family-zh)}:host:lang(ko),:root:lang(ko){font-family:var(--spectrum-alias-font-family-ko)}:host:lang(ja),:root:lang(ja){font-family:var(--spectrum-alias-font-family-ja)}:host{display:block}#scale,#theme{height:100%;width:100%}
`,
  ga = ha;
tt.registerThemeFragment("spectrum", "theme", ga);
tt.registerThemeFragment("medium", "scale", ba);
const va = v`
:host,:root{--spectrum-global-color-status:Verified;--spectrum-global-color-version:5.1.0;--spectrum-global-color-opacity-100:1;--spectrum-global-color-opacity-90:0.9;--spectrum-global-color-opacity-80:0.8;--spectrum-global-color-opacity-70:0.7;--spectrum-global-color-opacity-60:0.6;--spectrum-global-color-opacity-55:0.55;--spectrum-global-color-opacity-50:0.5;--spectrum-global-color-opacity-42:0.42;--spectrum-global-color-opacity-40:0.4;--spectrum-global-color-opacity-30:0.3;--spectrum-global-color-opacity-25:0.25;--spectrum-global-color-opacity-20:0.2;--spectrum-global-color-opacity-15:0.15;--spectrum-global-color-opacity-10:0.1;--spectrum-global-color-opacity-8:0.08;--spectrum-global-color-opacity-7:0.07;--spectrum-global-color-opacity-6:0.06;--spectrum-global-color-opacity-5:0.05;--spectrum-global-color-opacity-4:0.04;--spectrum-global-color-opacity-0:0.00;--spectrum-global-color-celery-400-rgb:13,171,37;--spectrum-global-color-celery-400:rgb(var(--spectrum-global-color-celery-400-rgb));--spectrum-global-color-celery-500-rgb:45,191,58;--spectrum-global-color-celery-500:rgb(var(--spectrum-global-color-celery-500-rgb));--spectrum-global-color-celery-600-rgb:80,208,82;--spectrum-global-color-celery-600:rgb(var(--spectrum-global-color-celery-600-rgb));--spectrum-global-color-celery-700-rgb:115,224,107;--spectrum-global-color-celery-700:rgb(var(--spectrum-global-color-celery-700-rgb));--spectrum-global-color-chartreuse-400-rgb:138,180,3;--spectrum-global-color-chartreuse-400:rgb(var(--spectrum-global-color-chartreuse-400-rgb));--spectrum-global-color-chartreuse-500-rgb:154,198,11;--spectrum-global-color-chartreuse-500:rgb(var(--spectrum-global-color-chartreuse-500-rgb));--spectrum-global-color-chartreuse-600-rgb:170,216,22;--spectrum-global-color-chartreuse-600:rgb(var(--spectrum-global-color-chartreuse-600-rgb));--spectrum-global-color-chartreuse-700-rgb:187,232,41;--spectrum-global-color-chartreuse-700:rgb(var(--spectrum-global-color-chartreuse-700-rgb));--spectrum-global-color-yellow-400-rgb:216,181,0;--spectrum-global-color-yellow-400:rgb(var(--spectrum-global-color-yellow-400-rgb));--spectrum-global-color-yellow-500-rgb:233,199,0;--spectrum-global-color-yellow-500:rgb(var(--spectrum-global-color-yellow-500-rgb));--spectrum-global-color-yellow-600-rgb:247,216,4;--spectrum-global-color-yellow-600:rgb(var(--spectrum-global-color-yellow-600-rgb));--spectrum-global-color-yellow-700-rgb:249,233,97;--spectrum-global-color-yellow-700:rgb(var(--spectrum-global-color-yellow-700-rgb));--spectrum-global-color-magenta-400-rgb:209,43,114;--spectrum-global-color-magenta-400:rgb(var(--spectrum-global-color-magenta-400-rgb));--spectrum-global-color-magenta-500-rgb:227,69,137;--spectrum-global-color-magenta-500:rgb(var(--spectrum-global-color-magenta-500-rgb));--spectrum-global-color-magenta-600-rgb:241,97,156;--spectrum-global-color-magenta-600:rgb(var(--spectrum-global-color-magenta-600-rgb));--spectrum-global-color-magenta-700-rgb:252,124,173;--spectrum-global-color-magenta-700:rgb(var(--spectrum-global-color-magenta-700-rgb));--spectrum-global-color-fuchsia-400-rgb:191,43,191;--spectrum-global-color-fuchsia-400:rgb(var(--spectrum-global-color-fuchsia-400-rgb));--spectrum-global-color-fuchsia-500-rgb:211,65,213;--spectrum-global-color-fuchsia-500:rgb(var(--spectrum-global-color-fuchsia-500-rgb));--spectrum-global-color-fuchsia-600-rgb:228,91,229;--spectrum-global-color-fuchsia-600:rgb(var(--spectrum-global-color-fuchsia-600-rgb));--spectrum-global-color-fuchsia-700-rgb:239,120,238;--spectrum-global-color-fuchsia-700:rgb(var(--spectrum-global-color-fuchsia-700-rgb));--spectrum-global-color-purple-400-rgb:145,70,236;--spectrum-global-color-purple-400:rgb(var(--spectrum-global-color-purple-400-rgb));--spectrum-global-color-purple-500-rgb:162,94,246;--spectrum-global-color-purple-500:rgb(var(--spectrum-global-color-purple-500-rgb));--spectrum-global-color-purple-600-rgb:178,119,250;--spectrum-global-color-purple-600:rgb(var(--spectrum-global-color-purple-600-rgb));--spectrum-global-color-purple-700-rgb:192,143,252;--spectrum-global-color-purple-700:rgb(var(--spectrum-global-color-purple-700-rgb));--spectrum-global-color-indigo-400-rgb:90,96,235;--spectrum-global-color-indigo-400:rgb(var(--spectrum-global-color-indigo-400-rgb));--spectrum-global-color-indigo-500-rgb:110,115,246;--spectrum-global-color-indigo-500:rgb(var(--spectrum-global-color-indigo-500-rgb));--spectrum-global-color-indigo-600-rgb:132,136,253;--spectrum-global-color-indigo-600:rgb(var(--spectrum-global-color-indigo-600-rgb));--spectrum-global-color-indigo-700-rgb:153,157,255;--spectrum-global-color-indigo-700:rgb(var(--spectrum-global-color-indigo-700-rgb));--spectrum-global-color-seafoam-400-rgb:0,146,140;--spectrum-global-color-seafoam-400:rgb(var(--spectrum-global-color-seafoam-400-rgb));--spectrum-global-color-seafoam-500-rgb:0,165,159;--spectrum-global-color-seafoam-500:rgb(var(--spectrum-global-color-seafoam-500-rgb));--spectrum-global-color-seafoam-600-rgb:26,185,178;--spectrum-global-color-seafoam-600:rgb(var(--spectrum-global-color-seafoam-600-rgb));--spectrum-global-color-seafoam-700-rgb:66,202,195;--spectrum-global-color-seafoam-700:rgb(var(--spectrum-global-color-seafoam-700-rgb));--spectrum-global-color-red-400-rgb:221,33,24;--spectrum-global-color-red-400:rgb(var(--spectrum-global-color-red-400-rgb));--spectrum-global-color-red-500-rgb:238,67,49;--spectrum-global-color-red-500:rgb(var(--spectrum-global-color-red-500-rgb));--spectrum-global-color-red-600-rgb:249,99,76;--spectrum-global-color-red-600:rgb(var(--spectrum-global-color-red-600-rgb));--spectrum-global-color-red-700-rgb:255,129,107;--spectrum-global-color-red-700:rgb(var(--spectrum-global-color-red-700-rgb));--spectrum-global-color-orange-400-rgb:232,116,0;--spectrum-global-color-orange-400:rgb(var(--spectrum-global-color-orange-400-rgb));--spectrum-global-color-orange-500-rgb:249,137,23;--spectrum-global-color-orange-500:rgb(var(--spectrum-global-color-orange-500-rgb));--spectrum-global-color-orange-600-rgb:255,162,59;--spectrum-global-color-orange-600:rgb(var(--spectrum-global-color-orange-600-rgb));--spectrum-global-color-orange-700-rgb:255,188,102;--spectrum-global-color-orange-700:rgb(var(--spectrum-global-color-orange-700-rgb));--spectrum-global-color-green-400-rgb:0,149,98;--spectrum-global-color-green-400:rgb(var(--spectrum-global-color-green-400-rgb));--spectrum-global-color-green-500-rgb:28,168,114;--spectrum-global-color-green-500:rgb(var(--spectrum-global-color-green-500-rgb));--spectrum-global-color-green-600-rgb:52,187,132;--spectrum-global-color-green-600:rgb(var(--spectrum-global-color-green-600-rgb));--spectrum-global-color-green-700-rgb:75,205,149;--spectrum-global-color-green-700:rgb(var(--spectrum-global-color-green-700-rgb));--spectrum-global-color-blue-400-rgb:29,128,245;--spectrum-global-color-blue-400:rgb(var(--spectrum-global-color-blue-400-rgb));--spectrum-global-color-blue-500-rgb:64,150,243;--spectrum-global-color-blue-500:rgb(var(--spectrum-global-color-blue-500-rgb));--spectrum-global-color-blue-600-rgb:94,170,247;--spectrum-global-color-blue-600:rgb(var(--spectrum-global-color-blue-600-rgb));--spectrum-global-color-blue-700-rgb:124,189,250;--spectrum-global-color-blue-700:rgb(var(--spectrum-global-color-blue-700-rgb));--spectrum-global-color-gray-50-rgb:0,0,0;--spectrum-global-color-gray-50:rgb(var(--spectrum-global-color-gray-50-rgb));--spectrum-global-color-gray-75-rgb:14,14,14;--spectrum-global-color-gray-75:rgb(var(--spectrum-global-color-gray-75-rgb));--spectrum-global-color-gray-100-rgb:29,29,29;--spectrum-global-color-gray-100:rgb(var(--spectrum-global-color-gray-100-rgb));--spectrum-global-color-gray-200-rgb:48,48,48;--spectrum-global-color-gray-200:rgb(var(--spectrum-global-color-gray-200-rgb));--spectrum-global-color-gray-300-rgb:75,75,75;--spectrum-global-color-gray-300:rgb(var(--spectrum-global-color-gray-300-rgb));--spectrum-global-color-gray-400-rgb:106,106,106;--spectrum-global-color-gray-400:rgb(var(--spectrum-global-color-gray-400-rgb));--spectrum-global-color-gray-500-rgb:141,141,141;--spectrum-global-color-gray-500:rgb(var(--spectrum-global-color-gray-500-rgb));--spectrum-global-color-gray-600-rgb:176,176,176;--spectrum-global-color-gray-600:rgb(var(--spectrum-global-color-gray-600-rgb));--spectrum-global-color-gray-700-rgb:208,208,208;--spectrum-global-color-gray-700:rgb(var(--spectrum-global-color-gray-700-rgb));--spectrum-global-color-gray-800-rgb:235,235,235;--spectrum-global-color-gray-800:rgb(var(--spectrum-global-color-gray-800-rgb));--spectrum-global-color-gray-900-rgb:255,255,255;--spectrum-global-color-gray-900:rgb(var(--spectrum-global-color-gray-900-rgb));--spectrum-alias-background-color-primary:var(--spectrum-global-color-gray-100);--spectrum-alias-background-color-secondary:var(--spectrum-global-color-gray-75);--spectrum-alias-background-color-tertiary:var(--spectrum-global-color-gray-50);--spectrum-alias-background-color-modal-overlay:rgba(0,0,0,.6);--spectrum-alias-dropshadow-color:rgba(0,0,0,.8);--spectrum-alias-background-color-hover-overlay:hsla(0,0%,100%,.08);--spectrum-alias-highlight-hover:hsla(0,0%,100%,.08);--spectrum-alias-highlight-down:hsla(0,0%,100%,.15);--spectrum-alias-highlight-selected:rgba(64,150,243,.2);--spectrum-alias-highlight-selected-hover:rgba(64,150,243,.3);--spectrum-alias-text-highlight-color:rgba(64,150,243,.3);--spectrum-alias-background-color-quickactions:rgba(29,29,29,.9);--spectrum-alias-border-color-selected:var(--spectrum-global-color-blue-600);--spectrum-alias-border-color-translucent:hsla(0,0%,100%,.1);--spectrum-alias-radial-reaction-color-default:hsla(0,0%,92%,.6);--spectrum-alias-pasteboard-background-color:var(--spectrum-global-color-gray-50);--spectrum-alias-appframe-border-color:var(--spectrum-global-color-gray-50);--spectrum-alias-appframe-separator-color:var(--spectrum-global-color-gray-50);--spectrum-scrollbar-mac-s-track-background-color:var(--spectrum-global-color-gray-100);--spectrum-scrollbar-mac-m-track-background-color:var(--spectrum-global-color-gray-100);--spectrum-scrollbar-mac-l-track-background-color:var(--spectrum-global-color-gray-100);--spectrum-slider-s-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-ramp-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-range-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-ramp-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-range-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-ramp-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-range-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-ramp-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-s-range-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-ramp-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-range-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-ramp-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-range-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-ramp-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-range-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-ramp-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-m-range-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-ramp-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-range-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-ramp-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-range-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-ramp-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-range-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-ramp-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-l-range-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-ramp-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-range-tick-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-ramp-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-range-tick-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-ramp-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-range-editable-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-ramp-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-slider-xl-range-radial-reaction-color:hsla(0,0%,92%,.6);--spectrum-well-background-color:hsla(0,0%,92%,.02)}:host,:root{color-scheme:dark}:host,:root{--spectrum-overlay-opacity:0.6;--spectrum-gray-background-color-default:var(--spectrum-gray-700);--spectrum-red-background-color-default:var(--spectrum-red-700);--spectrum-orange-background-color-default:var(--spectrum-orange-800);--spectrum-yellow-background-color-default:var(--spectrum-yellow-1000);--spectrum-chartreuse-background-color-default:var(--spectrum-chartreuse-900);--spectrum-celery-background-color-default:var(--spectrum-celery-800);--spectrum-green-background-color-default:var(--spectrum-green-700);--spectrum-seafoam-background-color-default:var(--spectrum-seafoam-700);--spectrum-cyan-background-color-default:var(--spectrum-cyan-700);--spectrum-blue-background-color-default:var(--spectrum-blue-700);--spectrum-indigo-background-color-default:var(--spectrum-indigo-700);--spectrum-purple-background-color-default:var(--spectrum-purple-700);--spectrum-fuchsia-background-color-default:var(--spectrum-fuchsia-700);--spectrum-magenta-background-color-default:var(--spectrum-magenta-700);--spectrum-neutral-background-color-default:var(--spectrum-gray-400);--spectrum-neutral-background-color-hover:var(--spectrum-gray-300);--spectrum-neutral-background-color-down:var(--spectrum-gray-200);--spectrum-neutral-background-color-key-focus:var(--spectrum-gray-300);--spectrum-neutral-subdued-background-color-default:var(--spectrum-gray-400);--spectrum-neutral-subdued-background-color-hover:var(--spectrum-gray-300);--spectrum-neutral-subdued-background-color-down:var(--spectrum-gray-200);--spectrum-neutral-subdued-background-color-key-focus:var(--spectrum-gray-300);--spectrum-accent-background-color-default:var(--spectrum-accent-color-600);--spectrum-accent-background-color-hover:var(--spectrum-accent-color-500);--spectrum-accent-background-color-down:var(--spectrum-accent-color-400);--spectrum-accent-background-color-key-focus:var(--spectrum-accent-color-500);--spectrum-informative-background-color-default:var(--spectrum-informative-color-600);--spectrum-informative-background-color-hover:var(--spectrum-informative-color-500);--spectrum-informative-background-color-down:var(--spectrum-informative-color-400);--spectrum-informative-background-color-key-focus:var(--spectrum-informative-color-500);--spectrum-negative-background-color-default:var(--spectrum-negative-color-600);--spectrum-negative-background-color-hover:var(--spectrum-negative-color-500);--spectrum-negative-background-color-down:var(--spectrum-negative-color-400);--spectrum-negative-background-color-key-focus:var(--spectrum-negative-color-500);--spectrum-positive-background-color-default:var(--spectrum-positive-color-600);--spectrum-positive-background-color-hover:var(--spectrum-positive-color-500);--spectrum-positive-background-color-down:var(--spectrum-positive-color-400);--spectrum-positive-background-color-key-focus:var(--spectrum-positive-color-500);--spectrum-neutral-visual-color:var(--spectrum-gray-600);--spectrum-accent-visual-color:var(--spectrum-accent-color-900);--spectrum-informative-visual-color:var(--spectrum-informative-color-900);--spectrum-negative-visual-color:var(--spectrum-negative-color-700);--spectrum-notice-visual-color:var(--spectrum-notice-color-900);--spectrum-positive-visual-color:var(--spectrum-positive-color-800);--spectrum-gray-visual-color:var(--spectrum-gray-600);--spectrum-red-visual-color:var(--spectrum-red-700);--spectrum-orange-visual-color:var(--spectrum-orange-900);--spectrum-yellow-visual-color:var(--spectrum-yellow-1100);--spectrum-chartreuse-visual-color:var(--spectrum-chartreuse-900);--spectrum-celery-visual-color:var(--spectrum-celery-800);--spectrum-green-visual-color:var(--spectrum-green-800);--spectrum-seafoam-visual-color:var(--spectrum-seafoam-800);--spectrum-cyan-visual-color:var(--spectrum-cyan-900);--spectrum-blue-visual-color:var(--spectrum-blue-900);--spectrum-indigo-visual-color:var(--spectrum-indigo-900);--spectrum-purple-visual-color:var(--spectrum-purple-900);--spectrum-fuchsia-visual-color:var(--spectrum-fuchsia-900);--spectrum-magenta-visual-color:var(--spectrum-magenta-900);--spectrum-drop-shadow-color:rgba(0,0,0,.8);--spectrum-background-base-color:var(--spectrum-gray-50);--spectrum-background-layer-1-color:var(--spectrum-gray-75);--spectrum-background-layer-2-color:var(--spectrum-gray-100);--spectrum-gray-50:#000;--spectrum-gray-75:#0e0e0e;--spectrum-gray-100:#1d1d1d;--spectrum-gray-200:#303030;--spectrum-gray-300:#4b4b4b;--spectrum-gray-400:#6a6a6a;--spectrum-gray-500:#8d8d8d;--spectrum-gray-600:#b0b0b0;--spectrum-gray-700:#d0d0d0;--spectrum-gray-800:#ebebeb;--spectrum-gray-900:#fff;--spectrum-red-100:#570000;--spectrum-red-200:#6e0000;--spectrum-red-300:#8a0000;--spectrum-red-400:#a70000;--spectrum-red-500:#c40706;--spectrum-red-600:#dd2118;--spectrum-red-700:#ee4331;--spectrum-red-800:#f9634c;--spectrum-red-900:#ff816b;--spectrum-red-1000:#ff9e8c;--spectrum-red-1100:#ffb7a9;--spectrum-red-1200:#ffcdc3;--spectrum-red-1300:#ffdfd9;--spectrum-red-1400:#ffedea;--spectrum-orange-100:#481801;--spectrum-orange-200:#5c2000;--spectrum-orange-300:#732b00;--spectrum-orange-400:#8a3700;--spectrum-orange-500:#a24400;--spectrum-orange-600:#ba5200;--spectrum-orange-700:#d26200;--spectrum-orange-800:#e87400;--spectrum-orange-900:#f98917;--spectrum-orange-1000:#ffa23b;--spectrum-orange-1100:#ffbc66;--spectrum-orange-1200:#fdd291;--spectrum-orange-1300:#ffe2b5;--spectrum-orange-1400:#ffefd5;--spectrum-yellow-100:#352400;--spectrum-yellow-200:#442f00;--spectrum-yellow-300:#563e00;--spectrum-yellow-400:#674d00;--spectrum-yellow-500:#7a5c00;--spectrum-yellow-600:#8d6c00;--spectrum-yellow-700:#a17e00;--spectrum-yellow-800:#b49000;--spectrum-yellow-900:#c7a200;--spectrum-yellow-1000:#d8b500;--spectrum-yellow-1100:#e9c700;--spectrum-yellow-1200:#f7d804;--spectrum-yellow-1300:#f9e961;--spectrum-yellow-1400:#fcf3aa;--spectrum-chartreuse-100:#202b00;--spectrum-chartreuse-200:#2a3800;--spectrum-chartreuse-300:#364800;--spectrum-chartreuse-400:#425800;--spectrum-chartreuse-500:#4f6900;--spectrum-chartreuse-600:#5d7b00;--spectrum-chartreuse-700:#6b8e00;--spectrum-chartreuse-800:#7aa100;--spectrum-chartreuse-900:#8ab403;--spectrum-chartreuse-1000:#9ac60b;--spectrum-chartreuse-1100:#aad816;--spectrum-chartreuse-1200:#bbe829;--spectrum-chartreuse-1300:#cdf648;--spectrum-chartreuse-1400:#e1fd84;--spectrum-celery-100:#002f07;--spectrum-celery-200:#003d09;--spectrum-celery-300:#004d0c;--spectrum-celery-400:#005f0f;--spectrum-celery-500:#00710f;--spectrum-celery-600:#00840f;--spectrum-celery-700:#009714;--spectrum-celery-800:#0dab25;--spectrum-celery-900:#2dbf3a;--spectrum-celery-1000:#50d052;--spectrum-celery-1100:#73e06b;--spectrum-celery-1200:#93ed83;--spectrum-celery-1300:#b4f7a2;--spectrum-celery-1400:#d5fcca;--spectrum-green-100:#0a2c1c;--spectrum-green-200:#073b24;--spectrum-green-300:#004c2e;--spectrum-green-400:#005d39;--spectrum-green-500:#006f45;--spectrum-green-600:#008252;--spectrum-green-700:#009562;--spectrum-green-800:#1ca872;--spectrum-green-900:#34bb84;--spectrum-green-1000:#4bcd95;--spectrum-green-1100:#67dea8;--spectrum-green-1200:#89ecbc;--spectrum-green-1300:#b1f4d1;--spectrum-green-1400:#d6f9e4;--spectrum-seafoam-100:#122b2a;--spectrum-seafoam-200:#133937;--spectrum-seafoam-300:#104946;--spectrum-seafoam-400:#035b58;--spectrum-seafoam-500:#006c68;--spectrum-seafoam-600:#007f79;--spectrum-seafoam-700:#00928c;--spectrum-seafoam-800:#00a59f;--spectrum-seafoam-900:#1ab9b2;--spectrum-seafoam-1000:#42cac3;--spectrum-seafoam-1100:#66dad3;--spectrum-seafoam-1200:#8be8e1;--spectrum-seafoam-1300:#b3f2ed;--spectrum-seafoam-1400:#d7f8f4;--spectrum-cyan-100:#002944;--spectrum-cyan-200:#003658;--spectrum-cyan-300:#00456c;--spectrum-cyan-400:#005680;--spectrum-cyan-500:#006793;--spectrum-cyan-600:#0079a7;--spectrum-cyan-700:#008cba;--spectrum-cyan-800:#04a0cd;--spectrum-cyan-900:#17b4dd;--spectrum-cyan-1000:#39c7ea;--spectrum-cyan-1100:#60d8f3;--spectrum-cyan-1200:#86e6fa;--spectrum-cyan-1300:#aaf2ff;--spectrum-cyan-1400:#cef9ff;--spectrum-blue-100:#002651;--spectrum-blue-200:#00326a;--spectrum-blue-300:#004087;--spectrum-blue-400:#004ea6;--spectrum-blue-500:#005cc8;--spectrum-blue-600:#066ce7;--spectrum-blue-700:#1d80f5;--spectrum-blue-800:#4096f3;--spectrum-blue-900:#5eaaf7;--spectrum-blue-1000:#7cbdfa;--spectrum-blue-1100:#98cefd;--spectrum-blue-1200:#b3defe;--spectrum-blue-1300:#ceeaff;--spectrum-blue-1400:#e3f3ff;--spectrum-indigo-100:#1a1d61;--spectrum-indigo-200:#23277d;--spectrum-indigo-300:#2e329e;--spectrum-indigo-400:#3a3fbd;--spectrum-indigo-500:#494ed8;--spectrum-indigo-600:#5a60eb;--spectrum-indigo-700:#6e73f6;--spectrum-indigo-800:#8488fd;--spectrum-indigo-900:#999dff;--spectrum-indigo-1000:#aeb1ff;--spectrum-indigo-1100:#c2c4ff;--spectrum-indigo-1200:#d4d5ff;--spectrum-indigo-1300:#e3e4ff;--spectrum-indigo-1400:#f0f0ff;--spectrum-purple-100:#321068;--spectrum-purple-200:#430d8c;--spectrum-purple-300:#5610ad;--spectrum-purple-400:#6a1dc8;--spectrum-purple-500:#7e31de;--spectrum-purple-600:#9146ec;--spectrum-purple-700:#a25ef6;--spectrum-purple-800:#b277fa;--spectrum-purple-900:#c08ffc;--spectrum-purple-1000:#cea6fd;--spectrum-purple-1100:#dbbcfe;--spectrum-purple-1200:#e6cfff;--spectrum-purple-1300:#f0e0ff;--spectrum-purple-1400:#f8edff;--spectrum-fuchsia-100:#460e44;--spectrum-fuchsia-200:#5d095c;--spectrum-fuchsia-300:#780078;--spectrum-fuchsia-400:#920093;--spectrum-fuchsia-500:#a913aa;--spectrum-fuchsia-600:#bf2bbf;--spectrum-fuchsia-700:#d341d5;--spectrum-fuchsia-800:#e45be5;--spectrum-fuchsia-900:#ef78ee;--spectrum-fuchsia-1000:#f695f3;--spectrum-fuchsia-1100:#fbaff6;--spectrum-fuchsia-1200:#fec7f8;--spectrum-fuchsia-1300:#ffdcfa;--spectrum-fuchsia-1400:#ffebfc;--spectrum-magenta-100:#530329;--spectrum-magenta-200:#6a0034;--spectrum-magenta-300:#850041;--spectrum-magenta-400:#a1004e;--spectrum-magenta-500:#ba165d;--spectrum-magenta-600:#d12b72;--spectrum-magenta-700:#e34589;--spectrum-magenta-800:#f1619c;--spectrum-magenta-900:#fc7cad;--spectrum-magenta-1000:#ff98bf;--spectrum-magenta-1100:#ffb3cf;--spectrum-magenta-1200:#ffcadd;--spectrum-magenta-1300:#ffdde9;--spectrum-magenta-1400:#ffecf3}
`,
  fa = va;
tt.registerThemeFragment("darkest", "color", fa);
const ya = v`
:host,:root{--spectrum-global-color-status:Verified;--spectrum-global-color-version:5.1.0;--spectrum-global-color-opacity-100:1;--spectrum-global-color-opacity-90:0.9;--spectrum-global-color-opacity-80:0.8;--spectrum-global-color-opacity-70:0.7;--spectrum-global-color-opacity-60:0.6;--spectrum-global-color-opacity-55:0.55;--spectrum-global-color-opacity-50:0.5;--spectrum-global-color-opacity-42:0.42;--spectrum-global-color-opacity-40:0.4;--spectrum-global-color-opacity-30:0.3;--spectrum-global-color-opacity-25:0.25;--spectrum-global-color-opacity-20:0.2;--spectrum-global-color-opacity-15:0.15;--spectrum-global-color-opacity-10:0.1;--spectrum-global-color-opacity-8:0.08;--spectrum-global-color-opacity-7:0.07;--spectrum-global-color-opacity-6:0.06;--spectrum-global-color-opacity-5:0.05;--spectrum-global-color-opacity-4:0.04;--spectrum-global-color-opacity-0:0.00;--spectrum-global-color-celery-400-rgb:39,187,54;--spectrum-global-color-celery-400:rgb(var(--spectrum-global-color-celery-400-rgb));--spectrum-global-color-celery-500-rgb:7,167,33;--spectrum-global-color-celery-500:rgb(var(--spectrum-global-color-celery-500-rgb));--spectrum-global-color-celery-600-rgb:0,145,18;--spectrum-global-color-celery-600:rgb(var(--spectrum-global-color-celery-600-rgb));--spectrum-global-color-celery-700-rgb:0,124,15;--spectrum-global-color-celery-700:rgb(var(--spectrum-global-color-celery-700-rgb));--spectrum-global-color-chartreuse-400-rgb:152,197,10;--spectrum-global-color-chartreuse-400:rgb(var(--spectrum-global-color-chartreuse-400-rgb));--spectrum-global-color-chartreuse-500-rgb:135,177,3;--spectrum-global-color-chartreuse-500:rgb(var(--spectrum-global-color-chartreuse-500-rgb));--spectrum-global-color-chartreuse-600-rgb:118,156,0;--spectrum-global-color-chartreuse-600:rgb(var(--spectrum-global-color-chartreuse-600-rgb));--spectrum-global-color-chartreuse-700-rgb:103,136,0;--spectrum-global-color-chartreuse-700:rgb(var(--spectrum-global-color-chartreuse-700-rgb));--spectrum-global-color-yellow-400-rgb:232,198,0;--spectrum-global-color-yellow-400:rgb(var(--spectrum-global-color-yellow-400-rgb));--spectrum-global-color-yellow-500-rgb:215,179,0;--spectrum-global-color-yellow-500:rgb(var(--spectrum-global-color-yellow-500-rgb));--spectrum-global-color-yellow-600-rgb:196,159,0;--spectrum-global-color-yellow-600:rgb(var(--spectrum-global-color-yellow-600-rgb));--spectrum-global-color-yellow-700-rgb:176,140,0;--spectrum-global-color-yellow-700:rgb(var(--spectrum-global-color-yellow-700-rgb));--spectrum-global-color-magenta-400-rgb:222,61,130;--spectrum-global-color-magenta-400:rgb(var(--spectrum-global-color-magenta-400-rgb));--spectrum-global-color-magenta-500-rgb:200,34,105;--spectrum-global-color-magenta-500:rgb(var(--spectrum-global-color-magenta-500-rgb));--spectrum-global-color-magenta-600-rgb:173,9,85;--spectrum-global-color-magenta-600:rgb(var(--spectrum-global-color-magenta-600-rgb));--spectrum-global-color-magenta-700-rgb:142,0,69;--spectrum-global-color-magenta-700:rgb(var(--spectrum-global-color-magenta-700-rgb));--spectrum-global-color-fuchsia-400-rgb:205,58,206;--spectrum-global-color-fuchsia-400:rgb(var(--spectrum-global-color-fuchsia-400-rgb));--spectrum-global-color-fuchsia-500-rgb:182,34,183;--spectrum-global-color-fuchsia-500:rgb(var(--spectrum-global-color-fuchsia-500-rgb));--spectrum-global-color-fuchsia-600-rgb:157,3,158;--spectrum-global-color-fuchsia-600:rgb(var(--spectrum-global-color-fuchsia-600-rgb));--spectrum-global-color-fuchsia-700-rgb:128,0,129;--spectrum-global-color-fuchsia-700:rgb(var(--spectrum-global-color-fuchsia-700-rgb));--spectrum-global-color-purple-400-rgb:157,87,244;--spectrum-global-color-purple-400:rgb(var(--spectrum-global-color-purple-400-rgb));--spectrum-global-color-purple-500-rgb:137,61,231;--spectrum-global-color-purple-500:rgb(var(--spectrum-global-color-purple-500-rgb));--spectrum-global-color-purple-600-rgb:115,38,211;--spectrum-global-color-purple-600:rgb(var(--spectrum-global-color-purple-600-rgb));--spectrum-global-color-purple-700-rgb:93,19,183;--spectrum-global-color-purple-700:rgb(var(--spectrum-global-color-purple-700-rgb));--spectrum-global-color-indigo-400-rgb:104,109,244;--spectrum-global-color-indigo-400:rgb(var(--spectrum-global-color-indigo-400-rgb));--spectrum-global-color-indigo-500-rgb:82,88,228;--spectrum-global-color-indigo-500:rgb(var(--spectrum-global-color-indigo-500-rgb));--spectrum-global-color-indigo-600-rgb:64,70,202;--spectrum-global-color-indigo-600:rgb(var(--spectrum-global-color-indigo-600-rgb));--spectrum-global-color-indigo-700-rgb:50,54,168;--spectrum-global-color-indigo-700:rgb(var(--spectrum-global-color-indigo-700-rgb));--spectrum-global-color-seafoam-400-rgb:0,161,154;--spectrum-global-color-seafoam-400:rgb(var(--spectrum-global-color-seafoam-400-rgb));--spectrum-global-color-seafoam-500-rgb:0,140,135;--spectrum-global-color-seafoam-500:rgb(var(--spectrum-global-color-seafoam-500-rgb));--spectrum-global-color-seafoam-600-rgb:0,119,114;--spectrum-global-color-seafoam-600:rgb(var(--spectrum-global-color-seafoam-600-rgb));--spectrum-global-color-seafoam-700-rgb:0,99,95;--spectrum-global-color-seafoam-700:rgb(var(--spectrum-global-color-seafoam-700-rgb));--spectrum-global-color-red-400-rgb:234,56,41;--spectrum-global-color-red-400:rgb(var(--spectrum-global-color-red-400-rgb));--spectrum-global-color-red-500-rgb:211,21,16;--spectrum-global-color-red-500:rgb(var(--spectrum-global-color-red-500-rgb));--spectrum-global-color-red-600-rgb:180,0,0;--spectrum-global-color-red-600:rgb(var(--spectrum-global-color-red-600-rgb));--spectrum-global-color-red-700-rgb:147,0,0;--spectrum-global-color-red-700:rgb(var(--spectrum-global-color-red-700-rgb));--spectrum-global-color-orange-400-rgb:246,133,17;--spectrum-global-color-orange-400:rgb(var(--spectrum-global-color-orange-400-rgb));--spectrum-global-color-orange-500-rgb:228,111,0;--spectrum-global-color-orange-500:rgb(var(--spectrum-global-color-orange-500-rgb));--spectrum-global-color-orange-600-rgb:203,93,0;--spectrum-global-color-orange-600:rgb(var(--spectrum-global-color-orange-600-rgb));--spectrum-global-color-orange-700-rgb:177,76,0;--spectrum-global-color-orange-700:rgb(var(--spectrum-global-color-orange-700-rgb));--spectrum-global-color-green-400-rgb:0,143,93;--spectrum-global-color-green-400:rgb(var(--spectrum-global-color-green-400-rgb));--spectrum-global-color-green-500-rgb:0,122,77;--spectrum-global-color-green-500:rgb(var(--spectrum-global-color-green-500-rgb));--spectrum-global-color-green-600-rgb:0,101,62;--spectrum-global-color-green-600:rgb(var(--spectrum-global-color-green-600-rgb));--spectrum-global-color-green-700-rgb:0,81,50;--spectrum-global-color-green-700:rgb(var(--spectrum-global-color-green-700-rgb));--spectrum-global-color-blue-400-rgb:20,122,243;--spectrum-global-color-blue-400:rgb(var(--spectrum-global-color-blue-400-rgb));--spectrum-global-color-blue-500-rgb:2,101,220;--spectrum-global-color-blue-500:rgb(var(--spectrum-global-color-blue-500-rgb));--spectrum-global-color-blue-600-rgb:0,84,182;--spectrum-global-color-blue-600:rgb(var(--spectrum-global-color-blue-600-rgb));--spectrum-global-color-blue-700-rgb:0,68,145;--spectrum-global-color-blue-700:rgb(var(--spectrum-global-color-blue-700-rgb));--spectrum-global-color-gray-50-rgb:255,255,255;--spectrum-global-color-gray-50:rgb(var(--spectrum-global-color-gray-50-rgb));--spectrum-global-color-gray-75-rgb:253,253,253;--spectrum-global-color-gray-75:rgb(var(--spectrum-global-color-gray-75-rgb));--spectrum-global-color-gray-100-rgb:248,248,248;--spectrum-global-color-gray-100:rgb(var(--spectrum-global-color-gray-100-rgb));--spectrum-global-color-gray-200-rgb:230,230,230;--spectrum-global-color-gray-200:rgb(var(--spectrum-global-color-gray-200-rgb));--spectrum-global-color-gray-300-rgb:213,213,213;--spectrum-global-color-gray-300:rgb(var(--spectrum-global-color-gray-300-rgb));--spectrum-global-color-gray-400-rgb:177,177,177;--spectrum-global-color-gray-400:rgb(var(--spectrum-global-color-gray-400-rgb));--spectrum-global-color-gray-500-rgb:144,144,144;--spectrum-global-color-gray-500:rgb(var(--spectrum-global-color-gray-500-rgb));--spectrum-global-color-gray-600-rgb:109,109,109;--spectrum-global-color-gray-600:rgb(var(--spectrum-global-color-gray-600-rgb));--spectrum-global-color-gray-700-rgb:70,70,70;--spectrum-global-color-gray-700:rgb(var(--spectrum-global-color-gray-700-rgb));--spectrum-global-color-gray-800-rgb:34,34,34;--spectrum-global-color-gray-800:rgb(var(--spectrum-global-color-gray-800-rgb));--spectrum-global-color-gray-900-rgb:0,0,0;--spectrum-global-color-gray-900:rgb(var(--spectrum-global-color-gray-900-rgb));--spectrum-alias-background-color-primary:var(--spectrum-global-color-gray-50);--spectrum-alias-background-color-secondary:var(--spectrum-global-color-gray-100);--spectrum-alias-background-color-tertiary:var(--spectrum-global-color-gray-300);--spectrum-alias-background-color-modal-overlay:rgba(0,0,0,.4);--spectrum-alias-dropshadow-color:rgba(0,0,0,.15);--spectrum-alias-background-color-hover-overlay:rgba(0,0,0,.04);--spectrum-alias-highlight-hover:rgba(0,0,0,.06);--spectrum-alias-highlight-down:rgba(0,0,0,.1);--spectrum-alias-highlight-selected:rgba(2,101,220,.1);--spectrum-alias-highlight-selected-hover:rgba(2,101,220,.2);--spectrum-alias-text-highlight-color:rgba(2,101,220,.2);--spectrum-alias-background-color-quickactions:hsla(0,0%,97%,.9);--spectrum-alias-border-color-selected:var(--spectrum-global-color-blue-500);--spectrum-alias-border-color-translucent:rgba(0,0,0,.1);--spectrum-alias-radial-reaction-color-default:rgba(34,34,34,.6);--spectrum-alias-pasteboard-background-color:var(--spectrum-global-color-gray-300);--spectrum-alias-appframe-border-color:var(--spectrum-global-color-gray-300);--spectrum-alias-appframe-separator-color:var(--spectrum-global-color-gray-300);--spectrum-scrollbar-mac-s-track-background-color:var(--spectrum-global-color-gray-75);--spectrum-scrollbar-mac-m-track-background-color:var(--spectrum-global-color-gray-75);--spectrum-scrollbar-mac-l-track-background-color:var(--spectrum-global-color-gray-75);--spectrum-slider-s-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-ramp-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-range-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-ramp-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-range-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-ramp-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-range-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-ramp-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-s-range-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-ramp-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-range-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-ramp-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-range-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-ramp-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-range-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-ramp-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-m-range-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-ramp-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-range-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-ramp-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-range-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-ramp-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-range-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-ramp-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-l-range-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-ramp-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-range-tick-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-ramp-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-range-tick-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-ramp-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-range-editable-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-ramp-radial-reaction-color:rgba(34,34,34,.6);--spectrum-slider-xl-range-radial-reaction-color:rgba(34,34,34,.6);--spectrum-well-background-color:rgba(34,34,34,.02)}:host,:root{color-scheme:light}:host,:root{--spectrum-overlay-opacity:0.4;--spectrum-gray-background-color-default:var(--spectrum-gray-700);--spectrum-red-background-color-default:var(--spectrum-red-600);--spectrum-orange-background-color-default:var(--spectrum-orange-600);--spectrum-yellow-background-color-default:var(--spectrum-yellow-400);--spectrum-chartreuse-background-color-default:var(--spectrum-chartreuse-500);--spectrum-celery-background-color-default:var(--spectrum-celery-600);--spectrum-green-background-color-default:var(--spectrum-green-900);--spectrum-seafoam-background-color-default:var(--spectrum-seafoam-900);--spectrum-cyan-background-color-default:var(--spectrum-cyan-900);--spectrum-blue-background-color-default:var(--spectrum-blue-900);--spectrum-indigo-background-color-default:var(--spectrum-indigo-900);--spectrum-purple-background-color-default:var(--spectrum-purple-900);--spectrum-fuchsia-background-color-default:var(--spectrum-fuchsia-900);--spectrum-magenta-background-color-default:var(--spectrum-magenta-900);--spectrum-neutral-background-color-default:var(--spectrum-gray-800);--spectrum-neutral-background-color-hover:var(--spectrum-gray-900);--spectrum-neutral-background-color-down:var(--spectrum-gray-900);--spectrum-neutral-background-color-key-focus:var(--spectrum-gray-900);--spectrum-neutral-subdued-background-color-default:var(--spectrum-gray-600);--spectrum-neutral-subdued-background-color-hover:var(--spectrum-gray-700);--spectrum-neutral-subdued-background-color-down:var(--spectrum-gray-800);--spectrum-neutral-subdued-background-color-key-focus:var(--spectrum-gray-700);--spectrum-accent-background-color-default:var(--spectrum-accent-color-900);--spectrum-accent-background-color-hover:var(--spectrum-accent-color-1000);--spectrum-accent-background-color-down:var(--spectrum-accent-color-1100);--spectrum-accent-background-color-key-focus:var(--spectrum-accent-color-1000);--spectrum-informative-background-color-default:var(--spectrum-informative-color-900);--spectrum-informative-background-color-hover:var(--spectrum-informative-color-1000);--spectrum-informative-background-color-down:var(--spectrum-informative-color-1100);--spectrum-informative-background-color-key-focus:var(--spectrum-informative-color-1000);--spectrum-negative-background-color-default:var(--spectrum-negative-color-900);--spectrum-negative-background-color-hover:var(--spectrum-negative-color-1000);--spectrum-negative-background-color-down:var(--spectrum-negative-color-1100);--spectrum-negative-background-color-key-focus:var(--spectrum-negative-color-1000);--spectrum-positive-background-color-default:var(--spectrum-positive-color-900);--spectrum-positive-background-color-hover:var(--spectrum-positive-color-1000);--spectrum-positive-background-color-down:var(--spectrum-positive-color-1100);--spectrum-positive-background-color-key-focus:var(--spectrum-positive-color-1000);--spectrum-neutral-visual-color:var(--spectrum-gray-500);--spectrum-accent-visual-color:var(--spectrum-accent-color-800);--spectrum-informative-visual-color:var(--spectrum-informative-color-800);--spectrum-negative-visual-color:var(--spectrum-negative-color-800);--spectrum-notice-visual-color:var(--spectrum-notice-color-700);--spectrum-positive-visual-color:var(--spectrum-positive-color-700);--spectrum-gray-visual-color:var(--spectrum-gray-500);--spectrum-red-visual-color:var(--spectrum-red-800);--spectrum-orange-visual-color:var(--spectrum-orange-700);--spectrum-yellow-visual-color:var(--spectrum-yellow-600);--spectrum-chartreuse-visual-color:var(--spectrum-chartreuse-600);--spectrum-celery-visual-color:var(--spectrum-celery-700);--spectrum-green-visual-color:var(--spectrum-green-700);--spectrum-seafoam-visual-color:var(--spectrum-seafoam-700);--spectrum-cyan-visual-color:var(--spectrum-cyan-600);--spectrum-blue-visual-color:var(--spectrum-blue-800);--spectrum-indigo-visual-color:var(--spectrum-indigo-800);--spectrum-purple-visual-color:var(--spectrum-purple-800);--spectrum-fuchsia-visual-color:var(--spectrum-fuchsia-800);--spectrum-magenta-visual-color:var(--spectrum-magenta-800);--spectrum-drop-shadow-color:rgba(0,0,0,.15);--spectrum-background-base-color:var(--spectrum-gray-200);--spectrum-background-layer-1-color:var(--spectrum-gray-100);--spectrum-background-layer-2-color:var(--spectrum-gray-50);--spectrum-gray-50:#fff;--spectrum-gray-75:#fdfdfd;--spectrum-gray-100:#f8f8f8;--spectrum-gray-200:#e6e6e6;--spectrum-gray-300:#d5d5d5;--spectrum-gray-400:#b1b1b1;--spectrum-gray-500:#909090;--spectrum-gray-600:#6d6d6d;--spectrum-gray-700:#464646;--spectrum-gray-800:#222;--spectrum-gray-900:#000;--spectrum-red-100:#ffebe7;--spectrum-red-200:#ffddd6;--spectrum-red-300:#ffcdc3;--spectrum-red-400:#ffb7a9;--spectrum-red-500:#ff9b88;--spectrum-red-600:#ff7c65;--spectrum-red-700:#f75c46;--spectrum-red-800:#ea3829;--spectrum-red-900:#d31510;--spectrum-red-1000:#b40000;--spectrum-red-1100:#930000;--spectrum-red-1200:#740000;--spectrum-red-1300:#590000;--spectrum-red-1400:#430000;--spectrum-orange-100:#ffeccc;--spectrum-orange-200:#ffdfad;--spectrum-orange-300:#fdd291;--spectrum-orange-400:#ffbb63;--spectrum-orange-500:#ffa037;--spectrum-orange-600:#f68511;--spectrum-orange-700:#e46f00;--spectrum-orange-800:#cb5d00;--spectrum-orange-900:#b14c00;--spectrum-orange-1000:#953d00;--spectrum-orange-1100:#7a2f00;--spectrum-orange-1200:#612300;--spectrum-orange-1300:#491901;--spectrum-orange-1400:#351201;--spectrum-yellow-100:#fbf198;--spectrum-yellow-200:#f8e750;--spectrum-yellow-300:#f8d904;--spectrum-yellow-400:#e8c600;--spectrum-yellow-500:#d7b300;--spectrum-yellow-600:#c49f00;--spectrum-yellow-700:#b08c00;--spectrum-yellow-800:#9b7800;--spectrum-yellow-900:#856600;--spectrum-yellow-1000:#705300;--spectrum-yellow-1100:#5b4300;--spectrum-yellow-1200:#483300;--spectrum-yellow-1300:#362500;--spectrum-yellow-1400:#281a00;--spectrum-chartreuse-100:#dbfc6e;--spectrum-chartreuse-200:#cbf443;--spectrum-chartreuse-300:#bce92a;--spectrum-chartreuse-400:#aad816;--spectrum-chartreuse-500:#98c50a;--spectrum-chartreuse-600:#87b103;--spectrum-chartreuse-700:#769c00;--spectrum-chartreuse-800:#678800;--spectrum-chartreuse-900:#577400;--spectrum-chartreuse-1000:#486000;--spectrum-chartreuse-1100:#3a4d00;--spectrum-chartreuse-1200:#2c3b00;--spectrum-chartreuse-1300:#212c00;--spectrum-chartreuse-1400:#181f00;--spectrum-celery-100:#cdfcbf;--spectrum-celery-200:#aef69d;--spectrum-celery-300:#96ee85;--spectrum-celery-400:#72e06a;--spectrum-celery-500:#4ecf50;--spectrum-celery-600:#27bb36;--spectrum-celery-700:#07a721;--spectrum-celery-800:#009112;--spectrum-celery-900:#007c0f;--spectrum-celery-1000:#00670f;--spectrum-celery-1100:#00530d;--spectrum-celery-1200:#00400a;--spectrum-celery-1300:#003007;--spectrum-celery-1400:#002205;--spectrum-green-100:#cef8e0;--spectrum-green-200:#adf4ce;--spectrum-green-300:#89ecbc;--spectrum-green-400:#67dea8;--spectrum-green-500:#49cc93;--spectrum-green-600:#2fb880;--spectrum-green-700:#15a46e;--spectrum-green-800:#008f5d;--spectrum-green-900:#007a4d;--spectrum-green-1000:#00653e;--spectrum-green-1100:#005132;--spectrum-green-1200:#053f27;--spectrum-green-1300:#0a2e1d;--spectrum-green-1400:#0a2015;--spectrum-seafoam-100:#cef7f3;--spectrum-seafoam-200:#aaf1ea;--spectrum-seafoam-300:#8ce9e2;--spectrum-seafoam-400:#65dad2;--spectrum-seafoam-500:#3fc9c1;--spectrum-seafoam-600:#0fb5ae;--spectrum-seafoam-700:#00a19a;--spectrum-seafoam-800:#008c87;--spectrum-seafoam-900:#007772;--spectrum-seafoam-1000:#00635f;--spectrum-seafoam-1100:#0c4f4c;--spectrum-seafoam-1200:#123c3a;--spectrum-seafoam-1300:#122c2b;--spectrum-seafoam-1400:#0f1f1e;--spectrum-cyan-100:#c5f8ff;--spectrum-cyan-200:#a4f0ff;--spectrum-cyan-300:#88e7fa;--spectrum-cyan-400:#60d8f3;--spectrum-cyan-500:#33c5e8;--spectrum-cyan-600:#12b0da;--spectrum-cyan-700:#019cc8;--spectrum-cyan-800:#0086b4;--spectrum-cyan-900:#00719f;--spectrum-cyan-1000:#005d89;--spectrum-cyan-1100:#004a73;--spectrum-cyan-1200:#00395d;--spectrum-cyan-1300:#002a46;--spectrum-cyan-1400:#001e33;--spectrum-blue-100:#e0f2ff;--spectrum-blue-200:#cae8ff;--spectrum-blue-300:#b5deff;--spectrum-blue-400:#96cefd;--spectrum-blue-500:#78bbfa;--spectrum-blue-600:#59a7f6;--spectrum-blue-700:#3892f3;--spectrum-blue-800:#147af3;--spectrum-blue-900:#0265dc;--spectrum-blue-1000:#0054b6;--spectrum-blue-1100:#004491;--spectrum-blue-1200:#003571;--spectrum-blue-1300:#002754;--spectrum-blue-1400:#001c3c;--spectrum-indigo-100:#edeeff;--spectrum-indigo-200:#e0e2ff;--spectrum-indigo-300:#d3d5ff;--spectrum-indigo-400:#c1c4ff;--spectrum-indigo-500:#acafff;--spectrum-indigo-600:#9599ff;--spectrum-indigo-700:#7e84fc;--spectrum-indigo-800:#686df4;--spectrum-indigo-900:#5258e4;--spectrum-indigo-1000:#4046ca;--spectrum-indigo-1100:#3236a8;--spectrum-indigo-1200:#262986;--spectrum-indigo-1300:#1b1e64;--spectrum-indigo-1400:#141648;--spectrum-purple-100:#f6ebff;--spectrum-purple-200:#edf;--spectrum-purple-300:#e6d0ff;--spectrum-purple-400:#dbbbfe;--spectrum-purple-500:#cca4fd;--spectrum-purple-600:#bd8bfc;--spectrum-purple-700:#ae72f9;--spectrum-purple-800:#9d57f4;--spectrum-purple-900:#893de7;--spectrum-purple-1000:#7326d3;--spectrum-purple-1100:#5d13b7;--spectrum-purple-1200:#470c94;--spectrum-purple-1300:#33106a;--spectrum-purple-1400:#230f49;--spectrum-fuchsia-100:#ffe9fc;--spectrum-fuchsia-200:#ffdafa;--spectrum-fuchsia-300:#fec7f8;--spectrum-fuchsia-400:#fbaef6;--spectrum-fuchsia-500:#f592f3;--spectrum-fuchsia-600:#ed74ed;--spectrum-fuchsia-700:#e055e2;--spectrum-fuchsia-800:#cd3ace;--spectrum-fuchsia-900:#b622b7;--spectrum-fuchsia-1000:#9d039e;--spectrum-fuchsia-1100:#800081;--spectrum-fuchsia-1200:#640664;--spectrum-fuchsia-1300:#470e46;--spectrum-fuchsia-1400:#320d31;--spectrum-magenta-100:#ffeaf1;--spectrum-magenta-200:#ffdce8;--spectrum-magenta-300:#ffcadd;--spectrum-magenta-400:#ffb2ce;--spectrum-magenta-500:#ff95bd;--spectrum-magenta-600:#fa77aa;--spectrum-magenta-700:#ef5a98;--spectrum-magenta-800:#de3d82;--spectrum-magenta-900:#c82269;--spectrum-magenta-1000:#ad0955;--spectrum-magenta-1100:#8e0045;--spectrum-magenta-1200:#700037;--spectrum-magenta-1300:#54032a;--spectrum-magenta-1400:#3c061d}
`,
  ka = ya;
tt.registerThemeFragment("light", "color", ka);
const C = (a) => a ?? z;
const U = {
    ATTRIBUTE: 1,
    CHILD: 2,
    PROPERTY: 3,
    BOOLEAN_ATTRIBUTE: 4,
    EVENT: 5,
    ELEMENT: 6,
  },
  At = (a) => (...t) => ({ _$litDirective$: a, values: t });
let Tt = class {
  constructor(t) {}
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t, e, r) {
    (this._$Ct = t), (this._$AM = e), (this._$Ci = r);
  }
  _$AS(t, e) {
    return this.update(t, e);
  }
  update(t, e) {
    return this.render(...e);
  }
};
const { I: xa } = Ao,
  eo = (a) => a.strings === void 0,
  $r = () => document.createComment(""),
  jt = (a, t, e) => {
    var r;
    const o = a._$AA.parentNode,
      s = t === void 0 ? a._$AB : t._$AA;
    if (e === void 0) {
      const i = o.insertBefore($r(), s),
        c = o.insertBefore($r(), s);
      e = new xa(i, c, a, a.options);
    } else {
      const i = e._$AB.nextSibling,
        c = e._$AM,
        n = c !== a;
      if (n) {
        let u;
        (r = e._$AQ) === null || r === void 0 || r.call(e, a),
          (e._$AM = a),
          e._$AP !== void 0 && (u = a._$AU) !== c._$AU && e._$AP(u);
      }
      if (i !== s || n) {
        let u = e._$AA;
        for (; u !== i; ) {
          const m = u.nextSibling;
          o.insertBefore(u, s), (u = m);
        }
      }
    }
    return e;
  },
  nt = (a, t, e = a) => (a._$AI(t, e), a),
  wa = {},
  ro = (a, t = wa) => (a._$AH = t),
  za = (a) => a._$AH,
  Ce = (a) => {
    var t;
    (t = a._$AP) === null || t === void 0 || t.call(a, !1, !0);
    let e = a._$AA;
    const r = a._$AB.nextSibling;
    for (; e !== r; ) {
      const o = e.nextSibling;
      e.remove(), (e = o);
    }
  };
const Cr = (a, t, e) => {
    const r = new Map();
    for (let o = t; o <= e; o++) r.set(a[o], o);
    return r;
  },
  He = At(
    class extends Tt {
      constructor(a) {
        if ((super(a), a.type !== U.CHILD))
          throw Error("repeat() can only be used in text expressions");
      }
      ht(a, t, e) {
        let r;
        e === void 0 ? (e = t) : t !== void 0 && (r = t);
        const o = [],
          s = [];
        let i = 0;
        for (const c of a) (o[i] = r ? r(c, i) : i), (s[i] = e(c, i)), i++;
        return { values: s, keys: o };
      }
      render(a, t, e) {
        return this.ht(a, t, e).values;
      }
      update(a, [t, e, r]) {
        var o;
        const s = za(a),
          { values: i, keys: c } = this.ht(t, e, r);
        if (!Array.isArray(s)) return (this.ut = c), i;
        const n = (o = this.ut) !== null && o !== void 0 ? o : (this.ut = []),
          u = [];
        let m,
          b,
          p = 0,
          h = s.length - 1,
          g = 0,
          f = i.length - 1;
        for (; p <= h && g <= f; )
          if (s[p] === null) p++;
          else if (s[h] === null) h--;
          else if (n[p] === c[g]) (u[g] = nt(s[p], i[g])), p++, g++;
          else if (n[h] === c[f]) (u[f] = nt(s[h], i[f])), h--, f--;
          else if (n[p] === c[f])
            (u[f] = nt(s[p], i[f])), jt(a, u[f + 1], s[p]), p++, f--;
          else if (n[h] === c[g])
            (u[g] = nt(s[h], i[g])), jt(a, s[p], s[h]), h--, g++;
          else if (
            (m === void 0 && ((m = Cr(c, g, f)), (b = Cr(n, p, h))),
            m.has(n[p]))
          )
            if (m.has(n[h])) {
              const w = b.get(c[g]),
                S = w !== void 0 ? s[w] : null;
              if (S === null) {
                const y = jt(a, s[p]);
                nt(y, i[g]), (u[g] = y);
              } else (u[g] = nt(S, i[g])), jt(a, s[p], S), (s[w] = null);
              g++;
            } else Ce(s[h]), h--;
          else Ce(s[p]), p++;
        for (; g <= f; ) {
          const w = jt(a, u[f + 1]);
          nt(w, i[g]), (u[g++] = w);
        }
        for (; p <= h; ) {
          const w = s[p++];
          w !== null && Ce(w);
        }
        return (this.ut = c), ro(a, u), M;
      }
    },
  );
const Ue = At(
  class extends Tt {
    constructor(a) {
      var t;
      if (
        (super(a),
        a.type !== U.ATTRIBUTE ||
          a.name !== "class" ||
          ((t = a.strings) === null || t === void 0 ? void 0 : t.length) > 2)
      )
        throw Error(
          "`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.",
        );
    }
    render(a) {
      return (
        " " +
        Object.keys(a)
          .filter((t) => a[t])
          .join(" ") +
        " "
      );
    }
    update(a, [t]) {
      var e, r;
      if (this.nt === void 0) {
        (this.nt = new Set()),
          a.strings !== void 0 &&
            (this.st = new Set(
              a.strings
                .join(" ")
                .split(/\s/)
                .filter((s) => s !== ""),
            ));
        for (const s in t)
          t[s] &&
            !(!((e = this.st) === null || e === void 0) && e.has(s)) &&
            this.nt.add(s);
        return this.render(t);
      }
      const o = a.element.classList;
      this.nt.forEach((s) => {
        s in t || (o.remove(s), this.nt.delete(s));
      });
      for (const s in t) {
        const i = !!t[s];
        i === this.nt.has(s) ||
          (!((r = this.st) === null || r === void 0) && r.has(s)) ||
          (i ? (o.add(s), this.nt.add(s)) : (o.remove(s), this.nt.delete(s)));
      }
      return M;
    }
  },
);
const Qe = At(
  class extends Tt {
    constructor(a) {
      var t;
      if (
        (super(a),
        a.type !== U.ATTRIBUTE ||
          a.name !== "style" ||
          ((t = a.strings) === null || t === void 0 ? void 0 : t.length) > 2)
      )
        throw Error(
          "The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.",
        );
    }
    render(a) {
      return Object.keys(a).reduce((t, e) => {
        const r = a[e];
        return r == null
          ? t
          : t +
              `${(e = e
                .replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&")
                .toLowerCase())}:${r};`;
      }, "");
    }
    update(a, [t]) {
      const { style: e } = a.element;
      if (this.vt === void 0) {
        this.vt = new Set();
        for (const r in t) this.vt.add(r);
        return this.render(t);
      }
      this.vt.forEach((r) => {
        t[r] == null &&
          (this.vt.delete(r),
          r.includes("-") ? e.removeProperty(r) : (e[r] = ""));
      });
      for (const r in t) {
        const o = t[r];
        o != null &&
          (this.vt.add(r), r.includes("-") ? e.setProperty(r, o) : (e[r] = o));
      }
      return M;
    }
  },
);
const Bt = (a, t) => {
    var e, r;
    const o = a._$AN;
    if (o === void 0) return !1;
    for (const s of o)
      (r = (e = s)._$AO) === null || r === void 0 || r.call(e, t, !1), Bt(s, t);
    return !0;
  },
  ne = (a) => {
    let t, e;
    do {
      if ((t = a._$AM) === void 0) break;
      (e = t._$AN), e.delete(a), (a = t);
    } while ((e == null ? void 0 : e.size) === 0);
  },
  oo = (a) => {
    for (let t; (t = a._$AM); a = t) {
      let e = t._$AN;
      if (e === void 0) t._$AN = e = new Set();
      else if (e.has(a)) break;
      e.add(a), Sa(t);
    }
  };
function $a(a) {
  this._$AN !== void 0
    ? (ne(this), (this._$AM = a), oo(this))
    : (this._$AM = a);
}
function Ca(a, t = !1, e = 0) {
  const r = this._$AH,
    o = this._$AN;
  if (o !== void 0 && o.size !== 0)
    if (t)
      if (Array.isArray(r))
        for (let s = e; s < r.length; s++) Bt(r[s], !1), ne(r[s]);
      else r != null && (Bt(r, !1), ne(r));
    else Bt(this, a);
}
const Sa = (a) => {
  var t, e, r, o;
  a.type == U.CHILD &&
    (((t = (r = a)._$AP) !== null && t !== void 0) || (r._$AP = Ca),
    ((e = (o = a)._$AQ) !== null && e !== void 0) || (o._$AQ = $a));
};
let _a = class extends Tt {
  constructor() {
    super(...arguments), (this._$AN = void 0);
  }
  _$AT(t, e, r) {
    super._$AT(t, e, r), oo(this), (this.isConnected = t._$AU);
  }
  _$AO(t, e = !0) {
    var r, o;
    t !== this.isConnected &&
      ((this.isConnected = t),
      t
        ? (r = this.reconnected) === null || r === void 0 || r.call(this)
        : (o = this.disconnected) === null || o === void 0 || o.call(this)),
      e && (Bt(this, t), ne(this));
  }
  setValue(t) {
    if (eo(this._$Ct)) this._$Ct._$AI(t, this);
    else {
      const e = [...this._$Ct._$AH];
      (e[this._$Ci] = t), this._$Ct._$AI(e, this, 0);
    }
  }
  disconnected() {}
  reconnected() {}
};
const Ea = At(
  class extends Tt {
    constructor(a) {
      if (
        (super(a),
        a.type !== U.PROPERTY &&
          a.type !== U.ATTRIBUTE &&
          a.type !== U.BOOLEAN_ATTRIBUTE)
      )
        throw Error(
          "The `live` directive is not allowed on child or event bindings",
        );
      if (!eo(a))
        throw Error("`live` bindings can only contain a single expression");
    }
    render(a) {
      return a;
    }
    update(a, [t]) {
      if (t === M || t === z) return t;
      const e = a.element,
        r = a.name;
      if (a.type === U.PROPERTY) {
        if (t === e[r]) return M;
      } else if (a.type === U.BOOLEAN_ATTRIBUTE) {
        if (!!t === e.hasAttribute(r)) return M;
      } else if (a.type === U.ATTRIBUTE && e.getAttribute(r) === t + "")
        return M;
      return ro(a), t;
    }
  },
);
var Aa = Object.defineProperty,
  Ta = Object.getOwnPropertyDescriptor,
  Lt = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Ta(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Aa(t, e, o), o;
  };
function ao(a) {
  class t extends a {
    renderAnchor({
      id: r,
      className: o,
      ariaHidden: s,
      labelledby: i,
      tabindex: c,
      anchorContent: n = d`<slot></slot>`,
    }) {
      return d`<a
                    id=${r}
                    class=${C(o)}
                    href=${C(this.href)}
                    download=${C(this.download)}
                    target=${C(this.target)}
                    aria-label=${C(this.label)}
                    aria-labelledby=${C(i)}
                    aria-hidden=${C(s ? "true" : void 0)}
                    tabindex=${C(c)}
                    rel=${C(this.rel)}
                >${n}</a>`;
    }
  }
  return (
    Lt([l({ reflect: !0 })], t.prototype, "download", 2),
    Lt([l()], t.prototype, "label", 2),
    Lt([l({ reflect: !0 })], t.prototype, "href", 2),
    Lt([l({ reflect: !0 })], t.prototype, "target", 2),
    Lt([l({ reflect: !0 })], t.prototype, "rel", 2),
    t
  );
}
const Oa = "modulepreload",
  Pa = function (a, t) {
    return new URL(a, t).href;
  },
  Sr = {},
  tr = function (t, e, r) {
    if (!e || e.length === 0) return t();
    const o = document.getElementsByTagName("link");
    return Promise.all(
      e.map((s) => {
        if (((s = Pa(s, r)), s in Sr)) return;
        Sr[s] = !0;
        const i = s.endsWith(".css"),
          c = i ? '[rel="stylesheet"]' : "";
        if (!!r)
          for (let m = o.length - 1; m >= 0; m--) {
            const b = o[m];
            if (b.href === s && (!i || b.rel === "stylesheet")) return;
          }
        else if (document.querySelector(`link[href="${s}"]${c}`)) return;
        const u = document.createElement("link");
        if (
          ((u.rel = i ? "stylesheet" : Oa),
          i || ((u.as = "script"), (u.crossOrigin = "")),
          (u.href = s),
          document.head.appendChild(u),
          i)
        )
          return new Promise((m, b) => {
            u.addEventListener("load", m),
              u.addEventListener("error", () =>
                b(new Error(`Unable to preload CSS for ${s}`)),
              );
          });
      }),
    ).then(() => t());
  };
let Re = !0;
try {
  document.body.querySelector(":focus-visible");
} catch {
  (Re = !1),
    tr(
      () => import("./focus-visible-f45633b4.js").then((t) => t.f),
      [],
      import.meta.url,
    );
}
const Ia = (a) => {
  var t;
  const e = (s) => {
      if (s.shadowRoot == null || s.hasAttribute("data-js-focus-visible"))
        return () => {};
      if (self.applyFocusVisiblePolyfill)
        self.applyFocusVisiblePolyfill(s.shadowRoot),
          s.manageAutoFocus && s.manageAutoFocus();
      else {
        const i = () => {
          self.applyFocusVisiblePolyfill &&
            s.shadowRoot &&
            self.applyFocusVisiblePolyfill(s.shadowRoot),
            s.manageAutoFocus && s.manageAutoFocus();
        };
        return (
          self.addEventListener("focus-visible-polyfill-ready", i, {
            once: !0,
          }),
          () => {
            self.removeEventListener("focus-visible-polyfill-ready", i);
          }
        );
      }
      return () => {};
    },
    r = Symbol("endPolyfillCoordination");
  class o extends a {
    constructor() {
      super(...arguments), (this[t] = null);
    }
    connectedCallback() {
      super.connectedCallback && super.connectedCallback(),
        Re ||
          requestAnimationFrame(() => {
            this[r] == null && (this[r] = e(this));
          });
    }
    disconnectedCallback() {
      super.disconnectedCallback && super.disconnectedCallback(),
        Re ||
          requestAnimationFrame(() => {
            this[r] != null && (this[r](), (this[r] = null));
          });
    }
  }
  return (t = r), o;
};
var Na = Object.defineProperty,
  ja = Object.getOwnPropertyDescriptor,
  Se = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? ja(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Na(t, e, o), o;
  };
function _r() {
  return new Promise((a) => requestAnimationFrame(() => a()));
}
class et extends Ia(ot) {
  constructor() {
    super(...arguments),
      (this.disabled = !1),
      (this.autofocus = !1),
      (this._tabIndex = 0),
      (this.manipulatingTabindex = !1),
      (this._recentlyConnected = !1);
  }
  get tabIndex() {
    if (this.focusElement === this) {
      const e = this.hasAttribute("tabindex")
        ? Number(this.getAttribute("tabindex"))
        : NaN;
      return isNaN(e) ? -1 : e;
    }
    const t = parseFloat(
      (this.hasAttribute("tabindex") && this.getAttribute("tabindex")) || "0",
    );
    return this.disabled || t < 0
      ? -1
      : this.focusElement
      ? this.focusElement.tabIndex
      : t;
  }
  set tabIndex(t) {
    if (this.manipulatingTabindex) {
      this.manipulatingTabindex = !1;
      return;
    }
    if (this.focusElement === this) {
      if (t !== this.tabIndex) {
        this._tabIndex = t;
        const e = this.disabled ? "-1" : "" + t;
        this.setAttribute("tabindex", e);
      }
      return;
    }
    if (
      (t === -1
        ? this.addEventListener(
            "pointerdown",
            this.onPointerdownManagementOfTabIndex,
          )
        : ((this.manipulatingTabindex = !0),
          this.removeEventListener(
            "pointerdown",
            this.onPointerdownManagementOfTabIndex,
          )),
      t === -1 || this.disabled)
    ) {
      this.setAttribute("tabindex", "-1"),
        this.removeAttribute("focusable"),
        t !== -1 && this.manageFocusElementTabindex(t);
      return;
    }
    this.setAttribute("focusable", ""),
      this.hasAttribute("tabindex")
        ? this.removeAttribute("tabindex")
        : (this.manipulatingTabindex = !1),
      this.manageFocusElementTabindex(t);
  }
  onPointerdownManagementOfTabIndex() {
    this.tabIndex === -1 &&
      ((this.tabIndex = 0), this.focus({ preventScroll: !0 }));
  }
  async manageFocusElementTabindex(t) {
    this.focusElement || (await this.updateComplete),
      t === null
        ? this.focusElement.removeAttribute("tabindex")
        : (this.focusElement.tabIndex = t);
  }
  get focusElement() {
    throw new Error("Must implement focusElement getter!");
  }
  focus(t) {
    this.disabled ||
      !this.focusElement ||
      (this.focusElement !== this
        ? this.focusElement.focus(t)
        : HTMLElement.prototype.focus.apply(this, [t]));
  }
  blur() {
    const t = this.focusElement || this;
    t !== this ? t.blur() : HTMLElement.prototype.blur.apply(this);
  }
  click() {
    if (this.disabled) return;
    const t = this.focusElement || this;
    t !== this ? t.click() : HTMLElement.prototype.click.apply(this);
  }
  manageAutoFocus() {
    this.autofocus &&
      (this.dispatchEvent(new KeyboardEvent("keydown", { code: "Tab" })),
      this.focusElement.focus());
  }
  firstUpdated(t) {
    super.firstUpdated(t),
      (!this.hasAttribute("tabindex") ||
        this.getAttribute("tabindex") !== "-1") &&
        this.setAttribute("focusable", "");
  }
  update(t) {
    t.has("disabled") &&
      this.handleDisabledChanged(this.disabled, t.get("disabled")),
      super.update(t);
  }
  updated(t) {
    super.updated(t), t.has("disabled") && this.disabled && this.blur();
  }
  async handleDisabledChanged(t, e) {
    const r = () =>
      this.focusElement !== this && typeof this.focusElement.disabled < "u";
    t
      ? ((this.manipulatingTabindex = !0),
        this.setAttribute("tabindex", "-1"),
        await this.updateComplete,
        r()
          ? (this.focusElement.disabled = !0)
          : this.setAttribute("aria-disabled", "true"))
      : e &&
        ((this.manipulatingTabindex = !0),
        this.focusElement === this
          ? this.setAttribute("tabindex", "" + this._tabIndex)
          : this.removeAttribute("tabindex"),
        await this.updateComplete,
        r()
          ? (this.focusElement.disabled = !1)
          : this.removeAttribute("aria-disabled"));
  }
  async getUpdateComplete() {
    const t = await super.getUpdateComplete();
    return (
      this._recentlyConnected &&
        ((this._recentlyConnected = !1), await _r(), await _r()),
      t
    );
  }
  connectedCallback() {
    super.connectedCallback(),
      (this._recentlyConnected = !0),
      this.updateComplete.then(() => {
        this.manageAutoFocus();
      });
  }
}
Se([l({ type: Boolean, reflect: !0 })], et.prototype, "disabled", 2),
  Se([l({ type: Boolean })], et.prototype, "autofocus", 2),
  Se([l({ type: Number })], et.prototype, "tabIndex", 1);
const La =
    'button:not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([tabindex="-1"]), select:not([tabindex="-1"]), textarea:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"]), [focusable]:not([tabindex="-1"])',
  Fa = (a) => a.querySelector(La);
let er = class {
  constructor(t, { target: e, config: r, callback: o, skipInitial: s }) {
    (this.t = new Set()),
      (this.o = !1),
      (this.i = !1),
      (this.h = t),
      e !== null && this.t.add(e ?? t),
      (this.l = r),
      (this.o = s ?? this.o),
      (this.callback = o),
      window.MutationObserver
        ? ((this.u = new MutationObserver((i) => {
            this.handleChanges(i), this.h.requestUpdate();
          })),
          t.addController(this))
        : console.warn(
            "MutationController error: browser does not support MutationObserver.",
          );
  }
  handleChanges(t) {
    var e;
    this.value =
      (e = this.callback) === null || e === void 0
        ? void 0
        : e.call(this, t, this.u);
  }
  hostConnected() {
    for (const t of this.t) this.observe(t);
  }
  hostDisconnected() {
    this.disconnect();
  }
  async hostUpdated() {
    const t = this.u.takeRecords();
    (t.length || (!this.o && this.i)) && this.handleChanges(t), (this.i = !1);
  }
  observe(t) {
    this.t.add(t),
      this.u.observe(t, this.l),
      (this.i = !0),
      this.h.requestUpdate();
  }
  disconnect() {
    this.u.disconnect();
  }
};
const vt = Symbol("slotContentIsPresent");
function Ma(a, t) {
  var e;
  const r = Array.isArray(t) ? t : [t];
  class o extends a {
    constructor(...i) {
      super(i),
        (this[e] = new Map()),
        (this.managePresenceObservedSlot = () => {
          let c = !1;
          r.forEach((n) => {
            const u = !!this.querySelector(n),
              m = this[vt].get(n) || !1;
            (c = c || m !== u), this[vt].set(n, !!this.querySelector(n));
          }),
            c &&
              this.updateComplete.then(() => {
                this.requestUpdate();
              });
        }),
        new er(this, {
          config: { childList: !0, subtree: !0 },
          callback: () => {
            this.managePresenceObservedSlot();
          },
        }),
        this.managePresenceObservedSlot();
    }
    get slotContentIsPresent() {
      if (r.length === 1) return this[vt].get(r[0]) || !1;
      throw new Error(
        "Multiple selectors provided to `ObserveSlotPresence` use `getSlotContentPresence(selector: string)` instead.",
      );
    }
    getSlotContentPresence(i) {
      if (this[vt].has(i)) return this[vt].get(i) || !1;
      throw new Error(`The provided selector \`${i}\` is not being observed.`);
    }
  }
  return (e = vt), o;
}
var Da = Object.defineProperty,
  qa = Object.getOwnPropertyDescriptor,
  Er = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? qa(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Da(t, e, o), o;
  };
const _e = Symbol("assignedNodes");
function so(a, t) {
  var e;
  class r extends a {
    constructor(...s) {
      super(s),
        (this.slotHasContent = !1),
        new er(this, {
          config: { characterData: !0, subtree: !0 },
          callback: (i) => {
            for (const c of i)
              if (c.type === "characterData") {
                this.manageTextObservedSlot();
                return;
              }
          },
        });
    }
    manageTextObservedSlot() {
      if (!this[_e]) return;
      const s = [...this[_e]].filter((i) =>
        i.tagName ? !0 : i.textContent ? i.textContent.trim() : !1,
      );
      this.slotHasContent = s.length > 0;
    }
    update(s) {
      if (!this.hasUpdated) {
        const { childNodes: i } = this,
          c = [...i].filter((n) =>
            n.tagName
              ? t
                ? n.getAttribute("slot") === t
                : !n.hasAttribute("slot")
              : n.textContent
              ? n.textContent.trim()
              : !1,
          );
        this.slotHasContent = c.length > 0;
      }
      super.update(s);
    }
    firstUpdated(s) {
      super.firstUpdated(s),
        this.updateComplete.then(() => {
          this.manageTextObservedSlot();
        });
    }
  }
  return (
    (e = _e),
    Er([l({ type: Boolean, attribute: !1 })], r.prototype, "slotHasContent", 2),
    Er([jo(t, !0)], r.prototype, e, 2),
    r
  );
}
function Ba(a) {
  return typeof window < "u" && window.navigator != null
    ? a.test(window.navigator.userAgent)
    : !1;
}
function rr(a) {
  return typeof window < "u" && window.navigator != null
    ? a.test(window.navigator.platform)
    : !1;
}
function Ha() {
  return rr(/^Mac/);
}
function Ua() {
  return rr(/^iPhone/);
}
function Ra() {
  return rr(/^iPad/) || (Ha() && navigator.maxTouchPoints > 1);
}
function Ga() {
  return Ua() || Ra();
}
function Ka() {
  return Ba(/Android/);
}
var Va = Object.defineProperty,
  Ya = Object.getOwnPropertyDescriptor,
  Ee = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Ya(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Va(t, e, o), o;
  };
class Ht extends ao(so(Ma(et, '[slot="icon"]'))) {
  constructor() {
    super(),
      (this.active = !1),
      (this.type = "button"),
      (this.proxyFocus = this.proxyFocus.bind(this)),
      this.addEventListener("click", this.handleClickCapture, { capture: !0 });
  }
  get hasIcon() {
    return this.slotContentIsPresent;
  }
  get hasLabel() {
    return this.slotHasContent;
  }
  get focusElement() {
    return this;
  }
  get buttonContent() {
    const t = [
      d`
                <div id="label" ?hidden=${!this.hasLabel}>
                    <slot
                        id="slot"
                        @slotchange=${this.manageTextObservedSlot}
                    ></slot>
                </div>
            `,
    ];
    return (
      this.hasIcon &&
        t.unshift(d`
                <slot name="icon" ?icon-only=${!this.hasLabel}></slot>
            `),
      t
    );
  }
  click() {
    this.disabled || this.shouldProxyClick() || super.click();
  }
  handleClickCapture(t) {
    if (this.disabled)
      return (
        t.preventDefault(),
        t.stopImmediatePropagation(),
        t.stopPropagation(),
        !1
      );
  }
  proxyFocus() {
    this.focus();
  }
  shouldProxyClick() {
    let t = !1;
    if (this.anchorElement) this.anchorElement.click(), (t = !0);
    else if (this.type !== "button") {
      const e = document.createElement("button");
      (e.type = this.type),
        this.insertAdjacentElement("afterend", e),
        e.click(),
        e.remove(),
        (t = !0);
    }
    return t;
  }
  renderAnchor() {
    return d`
            ${this.buttonContent}
            ${super.renderAnchor({
              id: "button",
              ariaHidden: !0,
              className: "button anchor hidden",
            })}
        `;
  }
  renderButton() {
    return d`
            ${this.buttonContent}
        `;
  }
  render() {
    return this.href && this.href.length > 0
      ? this.renderAnchor()
      : this.renderButton();
  }
  handleKeydown(t) {
    const { code: e } = t;
    switch (e) {
      case "Space":
        t.preventDefault(),
          typeof this.href > "u" &&
            (this.addEventListener("keyup", this.handleKeyup),
            (this.active = !0));
        break;
    }
  }
  handleKeypress(t) {
    const { code: e } = t;
    switch (e) {
      case "Enter":
      case "NumpadEnter":
        this.click();
        break;
    }
  }
  handleKeyup(t) {
    const { code: e } = t;
    switch (e) {
      case "Space":
        this.removeEventListener("keyup", this.handleKeyup),
          (this.active = !1),
          this.click();
        break;
    }
  }
  handleRemoveActive() {
    this.active = !1;
  }
  handlePointerdown() {
    this.active = !0;
  }
  manageAnchor() {
    this.href && this.href.length > 0
      ? (this.getAttribute("role") === "button" &&
          this.setAttribute("role", "link"),
        this.removeEventListener("click", this.shouldProxyClick))
      : ((!this.hasAttribute("role") || this.getAttribute("role") === "link") &&
          this.setAttribute("role", "button"),
        this.addEventListener("click", this.shouldProxyClick));
  }
  firstUpdated(t) {
    super.firstUpdated(t),
      this.hasAttribute("tabindex") || (this.tabIndex = 0),
      this.manageAnchor(),
      this.addEventListener("keydown", this.handleKeydown),
      this.addEventListener("keypress", this.handleKeypress),
      this.addEventListener("pointerdown", this.handlePointerdown);
  }
  updated(t) {
    super.updated(t),
      t.has("href") && this.manageAnchor(),
      t.has("label") && this.setAttribute("aria-label", this.label || ""),
      t.has("active") &&
        (this.active
          ? (this.addEventListener("focusout", this.handleRemoveActive),
            this.addEventListener("pointerup", this.handleRemoveActive),
            this.addEventListener("pointercancel", this.handleRemoveActive),
            this.addEventListener("pointerleave", this.handleRemoveActive))
          : (this.removeEventListener("focusout", this.handleRemoveActive),
            this.removeEventListener("pointerup", this.handleRemoveActive),
            this.removeEventListener("pointercancel", this.handleRemoveActive),
            this.removeEventListener("pointerleave", this.handleRemoveActive))),
      this.anchorElement &&
        (this.anchorElement.addEventListener("focus", this.proxyFocus),
        (this.anchorElement.tabIndex = -1));
  }
}
Ee([l({ type: Boolean, reflect: !0 })], Ht.prototype, "active", 2),
  Ee([l({ type: String })], Ht.prototype, "type", 2),
  Ee([W(".anchor")], Ht.prototype, "anchorElement", 2);
const Xa = v`
:host{display:inline-flex;vertical-align:top}:host([dir]){-webkit-appearance:none}:host([disabled]){cursor:auto;pointer-events:none}#button{inset:0;position:absolute}:host:after{pointer-events:none}slot[name=icon]::slotted(img),slot[name=icon]::slotted(svg){fill:currentcolor;stroke:currentcolor;height:var(
--spectrum-alias-workflow-icon-size-m,var(--spectrum-global-dimension-size-225)
);width:var(
--spectrum-alias-workflow-icon-size-m,var(--spectrum-global-dimension-size-225)
)}
`,
  Wa = Xa;
class or extends Ht {
  static get styles() {
    return [Wa];
  }
}
const Za = v`
:host{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-appearance:button;border-style:solid;box-sizing:border-box;cursor:pointer;font-family:var(--spectrum-font-family-base);line-height:var(--spectrum-line-height-small);margin:0;overflow:visible;text-decoration:none;text-transform:none;transition:background var(--spectrum-animation-duration-100) ease-out,border-color var(--spectrum-animation-duration-100) ease-out,color var(--spectrum-animation-duration-100) ease-out,box-shadow var(--spectrum-animation-duration-100) ease-out;user-select:none;-webkit-user-select:none;vertical-align:top}:host(:focus){outline:none}:host(::-moz-focus-inner){border:0;border-style:none;margin-block-end:-2px;margin-block-start:-2px;padding:0}:host(:disabled){cursor:default}:host{--spectrum-closebutton-size-300:24px;--spectrum-closebutton-size-400:32px;--spectrum-closebutton-size-500:40px;--spectrum-closebutton-size-600:48px;--spectrum-closebutton-icon-color-default:var(
--spectrum-neutral-content-color-default
);--spectrum-closebutton-icon-color-hover:var(
--spectrum-neutral-content-color-hover
);--spectrum-closebutton-icon-color-down:var(
--spectrum-neutral-content-color-down
);--spectrum-closebutton-icon-color-focus:var(
--spectrum-neutral-content-color-key-focus
);--spectrum-closebutton-icon-color-disabled:var(
--spectrum-disabled-content-color
);--spectrum-closebutton-focus-indicator-thickness:var(
--spectrum-focus-indicator-thickness
);--spectrum-closebutton-focus-indicator-gap:var(
--spectrum-focus-indicator-gap
);--spectrum-closebutton-focus-indicator-color:var(
--spectrum-focus-indicator-color
);--spectrum-closebutton-height:var(--spectrum-component-height-100);--spectrum-closebutton-width:var(--spectrum-closebutton-height);--spectrum-closebutton-size:var(--spectrum-closebutton-size-400);--spectrum-closebutton-border-radius:var(--spectrum-closebutton-size-400);--spectrum-closebutton-animation-duration:var(
--spectrum-animation-duration-100
)}:host([variant=white]){--spectrum-closebutton-static-background-color-default:transparent;--spectrum-closebutton-static-background-color-hover:var(
--spectrum-transparent-white-300
);--spectrum-closebutton-static-background-color-down:var(
--spectrum-transparent-white-400
);--spectrum-closebutton-static-background-color-focus:var(
--spectrum-transparent-white-300
);--spectrum-closebutton-icon-color-default:var(--spectrum-white);--spectrum-closebutton-icon-color-disabled:var(
--spectrum-disabled-static-white-content-color
);--spectrum-closebutton-focus-indicator-color:var(
--spectrum-static-white-focus-indicator-color
)}:host([variant=black]){--spectrum-closebutton-static-background-color-default:transparent;--spectrum-closebutton-static-background-color-hover:var(
--spectrum-transparent-black-300
);--spectrum-closebutton-static-background-color-down:var(
--spectrum-transparent-black-400
);--spectrum-closebutton-static-background-color-focus:var(
--spectrum-transparent-black-300
);--spectrum-closebutton-icon-color-default:var(--spectrum-black);--spectrum-closebutton-icon-color-disabled:var(
--spectrum-disabled-static-black-content-color
);--spectrum-closebutton-focus-indicator-color:var(
--spectrum-static-black-focus-indicator-color
)}@media (forced-colors:active){:host{--highcontrast-closebutton-icon-color-disabled:GrayText;--highcontrast-closebutton-icon-color-down:Highlight;--highcontrast-closebutton-icon-color-hover:Highlight;--highcontrast-closebutton-icon-color-focus:Highlight;--highcontrast-closebutton-background-color-default:ButtonFace;--highcontrast-closebutton-focus-indicator-color:ButtonText}:host(.focus-visible):after{border-radius:100%;bottom:0;box-shadow:0 0 0 var(
--mod-closebutton-focus-indicator-thickness,var(--spectrum-closebutton-focus-indicator-thickness)
) var(
--highcontrast-closebutton-focus-indicator-color,var(
--mod-closebutton-focus-indicator-color,var(--spectrum-closebutton-focus-indicator-color)
)
);content:"";display:block;forced-color-adjust:none;left:0;margin:var(
--mod-closebutton-focus-indicator-gap,var(--spectrum-closebutton-focus-indicator-gap)
);position:absolute;right:0;top:0;transition:opacity var(
--mod-closebutton-animation-duration,var(--spectrum-closebutton-animation-duration)
) ease-out,margin var(
--mod-closebutton-animation-duraction,var(--spectrum-closebutton-animation-duration)
) ease-out}:host(:focus-visible):after{border-radius:100%;bottom:0;box-shadow:0 0 0 var(
--mod-closebutton-focus-indicator-thickness,var(--spectrum-closebutton-focus-indicator-thickness)
) var(
--highcontrast-closebutton-focus-indicator-color,var(
--mod-closebutton-focus-indicator-color,var(--spectrum-closebutton-focus-indicator-color)
)
);content:"";display:block;forced-color-adjust:none;left:0;margin:var(
--mod-closebutton-focus-indicator-gap,var(--spectrum-closebutton-focus-indicator-gap)
);position:absolute;right:0;top:0;transition:opacity var(
--mod-closebutton-animation-duration,var(--spectrum-closebutton-animation-duration)
) ease-out,margin var(
--mod-closebutton-animation-duraction,var(--spectrum-closebutton-animation-duration)
) ease-out}:host([variant=black]){--highcontrast-closebutton-static-background-color-default:ButtonFace;--highcontrast-closebutton-icon-color-default:Highlight;--highcontrast-closebutton-icon-color-disabled:GrayText}:host([variant=white]){--highcontrast-closebutton-static-background-color-default:ButtonFace;--highcontrast-closebutton-icon-color-default:Highlight;--highcontrast-closebutton-icon-color-disabled:Highlight}}:host{align-items:center;border-color:transparent;border-radius:var(
--mod-closebutton-border-radius,var(--spectrum-closebutton-border-radius)
);border-width:0;color:inherit;display:inline-flex;flex-direction:row;height:var(
--mod-closebutton-height,var(--spectrum-closebutton-height)
);justify-content:center;padding:0;position:relative;transition:border-color var(
--mod-closebutton-animation-duration,var(--spectrum-closebutton-animation-duration)
) ease-in-out;width:var(--mod-closebutton-width,var(--spectrum-closebutton-width))}:host:after{border-radius:calc(var(--mod-closebutton-size, var(--spectrum-closebutton-size)) + var(
--mod-closebutton-focus-indicator-gap,
var(--spectrum-closebutton-focus-indicator-gap)
));bottom:0;content:"";left:0;margin:calc(var(
--mod-closebutton-focus-indicator-gap,
var(--spectrum-closebutton-focus-indicator-gap)
)*-1);pointer-events:none;position:absolute;right:0;top:0;transition:box-shadow var(
--mod-closebutton-animation-duration,var(--spectrum-closebutton-animation-duration)
) ease-in-out}:host(.focus-visible){box-shadow:none}:host(:focus-visible){box-shadow:none}:host(.focus-visible):after{box-shadow:0 0 0 var(
--mod-closebutton-focus-indicator-thickness,var(--spectrum-closebutton-focus-indicator-thickness)
) var(
--highcontrast-closebutton-focus-indicator-color,var(
--mod-closebutton-focus-indicator-color,var(--spectrum-closebutton-focus-indicator-color)
)
)}:host(:focus-visible):after{box-shadow:0 0 0 var(
--mod-closebutton-focus-indicator-thickness,var(--spectrum-closebutton-focus-indicator-thickness)
) var(
--highcontrast-closebutton-focus-indicator-color,var(
--mod-closebutton-focus-indicator-color,var(--spectrum-closebutton-focus-indicator-color)
)
)}:host(:not(:disabled)){background-color:var(
--highcontrast-closebutton-background-color-default,var(
--mod-closebutton-background-color-default,var(--spectrum-closebutton-background-color-default)
)
)}:host(:not(:disabled):hover){background-color:var(
--mod-closebutton-background-color-hover,var(--spectrum-closebutton-background-color-hover)
)}:host(:not(:disabled):hover) .icon{color:var(
--highcontrast-closebutton-icon-color-hover,var(
--mod-closebutton-icon-color-hover,var(--spectrum-closebutton-icon-color-hover)
)
)}:host(:not(:disabled)[active]){background-color:var(
--mod-closebutton-background-color-down,var(--spectrum-closebutton-background-color-down)
)}:host(:not(:disabled)[active]) .icon{color:var(
--highcontrast-closebutton-icon-color-down,var(
--mod-closebutton-icon-color-down,var(--spectrum-closebutton-icon-color-down)
)
)}:host(:not(:disabled).focus-visible),:host(:not(:disabled)[focused]){background-color:var(
--mod-closebutton-background-color-focus,var(--spectrum-closebutton-background-color-focus)
)}:host(:not(:disabled):focus-visible),:host(:not(:disabled)[focused]){background-color:var(
--mod-closebutton-background-color-focus,var(--spectrum-closebutton-background-color-focus)
)}:host(:not(:disabled).focus-visible) .icon,:host(:not(:disabled)[focused]) .icon{color:var(
--highcontrast-closebutton-icon-color-focus,var(
--mod-closebutton-icon-color-focus,var(--spectrum-closebutton-icon-color-focus)
)
)}:host(:not(:disabled):focus-visible) .icon,:host(:not(:disabled)[focused]) .icon{color:var(
--highcontrast-closebutton-icon-color-focus,var(
--mod-closebutton-icon-color-focus,var(--spectrum-closebutton-icon-color-focus)
)
)}:host(:not(:disabled)) .icon{color:var(
--mod-closebutton-icon-color-default,var(--spectrum-closebutton-icon-color-default)
)}:host(:not(:disabled).is-focused) .icon,:host(:not(:disabled):focus) .icon{color:var(
--highcontrast-closebutton-icon-color-focus,var(
--mod-closebutton-icon-color-focus,var(--spectrum-closebutton-icon-color-focus)
)
)}:host(:disabled){background-color:var(
--mod-closebutton-background-color-default,var(--spectrum-closebutton-background-color-default)
)}:host(:disabled) .icon{color:var(
--highcontrast-closebutton-icon-color-disabled,var(
--mod-closebutton-icon-color-disabled,var(--spectrum-closebutton-icon-color-disabled)
)
)}:host([variant=black]:not(:disabled)),:host([variant=white]:not(:disabled)){background-color:var(
--highcontrast-closebutton-static-background-color-default,var(
--mod-closebutton-static-background-color-default,var(--spectrum-closebutton-static-background-color-default)
)
)}:host([variant=black]:not(:disabled):hover),:host([variant=white]:not(:disabled):hover){background-color:var(
--highcontrast-closebutton-static-background-color-hover,var(
--mod-closebutton-static-background-color-hover,var(--spectrum-closebutton-static-background-color-hover)
)
)}:host([variant=black]:not(:disabled):hover) .icon,:host([variant=white]:not(:disabled):hover) .icon{color:var(
--highcontrast-closebutton-icon-color-default,var(
--mod-closebutton-icon-color-default,var(--spectrum-closebutton-icon-color-default)
)
)}:host([variant=black][active]:not(:disabled)),:host([variant=white][active]:not(:disabled)){background-color:var(
--highcontrast-closebutton-static-background-color-down,var(
--mod-closebutton-static-background-color-down,var(--spectrum-closebutton-static-background-color-down)
)
)}:host([variant=black][active]:not(:disabled)) .icon,:host([variant=white][active]:not(:disabled)) .icon{color:var(
--highcontrast-closebutton-icon-color-default,var(
--mod-closebutton-icon-color-default,var(--spectrum-closebutton-icon-color-default)
)
)}:host([variant=black]:not(:disabled).focus-visible),:host([variant=black][focused]:not(:disabled)),:host([variant=white]:not(:disabled).focus-visible),:host([variant=white][focused]:not(:disabled)){background-color:var(
--highcontrast-closebutton-static-background-color-focus,var(
--mod-closebutton-static-background-color-focus,var(--spectrum-closebutton-static-background-color-focus)
)
)}:host([variant=black]:not(:disabled):focus-visible),:host([variant=black][focused]:not(:disabled)),:host([variant=white]:not(:disabled):focus-visible),:host([variant=white][focused]:not(:disabled)){background-color:var(
--highcontrast-closebutton-static-background-color-focus,var(
--mod-closebutton-static-background-color-focus,var(--spectrum-closebutton-static-background-color-focus)
)
)}:host([variant=black]:not(:disabled).focus-visible) .icon,:host([variant=black][focused]:not(:disabled)) .icon,:host([variant=white]:not(:disabled).focus-visible) .icon,:host([variant=white][focused]:not(:disabled)) .icon{color:var(
--highcontrast-closebutton-icon-color-default,var(
--mod-closebutton-icon-color-default,var(--spectrum-closebutton-icon-color-default)
)
)}:host([variant=black]:not(:disabled):focus-visible) .icon,:host([variant=black][focused]:not(:disabled)) .icon,:host([variant=white]:not(:disabled):focus-visible) .icon,:host([variant=white][focused]:not(:disabled)) .icon{color:var(
--highcontrast-closebutton-icon-color-default,var(
--mod-closebutton-icon-color-default,var(--spectrum-closebutton-icon-color-default)
)
)}:host([variant=black]:not(:disabled)) .is-focused .icon,:host([variant=black]:not(:disabled):focus) .icon,:host([variant=white]:not(:disabled)) .is-focused .icon,:host([variant=white]:not(:disabled):focus) .icon{color:var(
--highcontrast-closebutton-icon-color-default,var(
--mod-closebutton-icon-color-default,var(--spectrum-closebutton-icon-color-default)
)
)}:host([variant=black]:not(:disabled)) .icon,:host([variant=white]:not(:disabled)) .icon{color:var(
--mod-closebutton-icon-color-default,var(--spectrum-closebutton-icon-color-default)
)}:host([variant=black]:disabled) .icon,:host([variant=white]:disabled) .icon{color:var(
--highcontrast-closebutton-icon-disabled,var(
--mod-closebutton-icon-color-disabled,var(--spectrum-closebutton-icon-color-disabled)
)
)}.icon{margin:0}:host{--spectrum-closebutton-background-color-default:var(
--system-spectrum-closebutton-background-color-default
);--spectrum-closebutton-background-color-hover:var(
--system-spectrum-closebutton-background-color-hover
);--spectrum-closebutton-background-color-down:var(
--system-spectrum-closebutton-background-color-down
);--spectrum-closebutton-background-color-focus:var(
--system-spectrum-closebutton-background-color-focus
)}
`,
  Ja = Za,
  Qa = v`
:host{fill:currentColor;color:inherit;display:inline-block;pointer-events:none}:host(:not(:root)){overflow:hidden}@media (forced-colors:active){.spectrum-UIIcon,:host{forced-color-adjust:auto}}:host{--spectrum-icon-size-s:var(
--spectrum-alias-workflow-icon-size-s,var(--spectrum-global-dimension-size-200)
);--spectrum-icon-size-m:var(
--spectrum-alias-workflow-icon-size-m,var(--spectrum-global-dimension-size-225)
);--spectrum-icon-size-l:var(--spectrum-alias-workflow-icon-size-l);--spectrum-icon-size-xl:var(
--spectrum-alias-workflow-icon-size-xl,var(--spectrum-global-dimension-size-275)
);--spectrum-icon-size-xxl:var(--spectrum-global-dimension-size-400)}:host([size=s]){height:var(
--spectrum-icon-size-s
);width:var(--spectrum-icon-size-s)}:host([size=m]){height:var(
--spectrum-icon-size-m
);width:var(--spectrum-icon-size-m)}:host([size=l]){height:var(
--spectrum-icon-size-l
);width:var(--spectrum-icon-size-l)}:host([size=xl]){height:var(
--spectrum-icon-size-xl
);width:var(--spectrum-icon-size-xl)}:host([size=xxl]){height:var(
--spectrum-icon-size-xxl
);width:var(--spectrum-icon-size-xxl)}:host{height:var(
--spectrum-icon-tshirt-size-height,var(
--spectrum-alias-workflow-icon-size,var(--spectrum-global-dimension-size-225)
)
);width:var(
--spectrum-icon-tshirt-size-width,var(
--spectrum-alias-workflow-icon-size,var(--spectrum-global-dimension-size-225)
)
)}#container{height:100%}::slotted(*),img,svg{color:inherit;height:100%;vertical-align:top;width:100%}@media (forced-colors:active){::slotted(*),img,svg{forced-color-adjust:auto}}
`,
  ts = Qa;
var es = Object.defineProperty,
  rs = Object.getOwnPropertyDescriptor,
  Ar = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? rs(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && es(t, e, o), o;
  };
class q extends ot {
  static get styles() {
    return [ts];
  }
  render() {
    return d`
            <slot></slot>
        `;
  }
}
Ar([l()], q.prototype, "label", 2),
  Ar([l({ reflect: !0 })], q.prototype, "size", 2);
let Ge;
const pt = function (a, ...t) {
    return Ge ? Ge(a, ...t) : t.reduce((e, r, o) => e + r + a[o + 1], a[0]);
  },
  mt = (a) => {
    Ge = a;
  },
  os = () => pt`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 8 8"
    aria-hidden="true"
    fill="currentColor"
  >
    <path
      d="M5.188 4l2.14-2.14A.84.84 0 106.141.672L4 2.812 1.86.672A.84.84 0 00.672 1.86L2.812 4 .672 6.14A.84.84 0 101.86 7.328L4 5.188l2.14 2.14A.84.84 0 107.328 6.14z"
    />
  </svg>`;
class as extends q {
  render() {
    return mt(d), os();
  }
}
customElements.define("sp-icon-cross75", as);
const ss = () => pt`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 8 8"
    aria-hidden="true"
    fill="currentColor"
  >
    <path
      d="M5.238 4l2.456-2.457A.875.875 0 106.456.306L4 2.763 1.543.306A.875.875 0 00.306 1.544L2.763 4 .306 6.457a.875.875 0 101.238 1.237L4 5.237l2.456 2.457a.875.875 0 101.238-1.237z"
    />
  </svg>`;
class is extends q {
  render() {
    return mt(d), ss();
  }
}
customElements.define("sp-icon-cross100", is);
const cs = () => pt`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 10 10"
    aria-hidden="true"
    fill="currentColor"
  >
    <path
      d="M6.29 5l2.922-2.922a.911.911 0 00-1.29-1.29L5 3.712 2.078.789a.911.911 0 00-1.29 1.289L3.712 5 .79 7.922a.911.911 0 101.289 1.29L5 6.288 7.923 9.21a.911.911 0 001.289-1.289z"
    />
  </svg>`;
class ls extends q {
  render() {
    return mt(d), cs();
  }
}
customElements.define("sp-icon-cross200", ls);
const ns = () => pt`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 12 12"
    aria-hidden="true"
    fill="currentColor"
  >
    <path
      d="M7.344 6l3.395-3.396a.95.95 0 00-1.344-1.342L6 4.657 2.604 1.262a.95.95 0 00-1.342 1.342L4.657 6 1.262 9.396a.95.95 0 001.343 1.343L6 7.344l3.395 3.395a.95.95 0 001.344-1.344z"
    />
  </svg>`;
class us extends q {
  render() {
    return mt(d), ns();
  }
}
customElements.define("sp-icon-cross300", us);
const ds = v`
@media (forced-colors:active){.spectrum-Icon,.spectrum-UIIcon{forced-color-adjust:auto}}.spectrum-UIIcon-Cross75{height:var(--spectrum-alias-ui-icon-cross-size-75);width:var(
--spectrum-alias-ui-icon-cross-size-75
)}.spectrum-UIIcon-Cross100{height:var(--spectrum-alias-ui-icon-cross-size-100);width:var(
--spectrum-alias-ui-icon-cross-size-100
)}.spectrum-UIIcon-Cross200{height:var(--spectrum-alias-ui-icon-cross-size-200);width:var(
--spectrum-alias-ui-icon-cross-size-200
)}.spectrum-UIIcon-Cross300{height:var(--spectrum-alias-ui-icon-cross-size-300);width:var(
--spectrum-alias-ui-icon-cross-size-300
)}.spectrum-UIIcon-Cross400{height:var(--spectrum-alias-ui-icon-cross-size-400);width:var(
--spectrum-alias-ui-icon-cross-size-400
)}.spectrum-UIIcon-Cross500{height:var(--spectrum-alias-ui-icon-cross-size-500);width:var(
--spectrum-alias-ui-icon-cross-size-500
)}.spectrum-UIIcon-Cross600{height:var(--spectrum-alias-ui-icon-cross-size-600);width:var(
--spectrum-alias-ui-icon-cross-size-600
)}
`,
  io = ds;
var ps = Object.defineProperty,
  ms = Object.getOwnPropertyDescriptor,
  bs = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? ms(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && ps(t, e, o), o;
  };
const hs = {
  s: () => d`
        <sp-icon-cross75
            slot="icon"
            class="icon spectrum-UIIcon-Cross75"
        ></sp-icon-cross75>
    `,
  m: () => d`
        <sp-icon-cross100
            slot="icon"
            class="icon spectrum-UIIcon-Cross100"
        ></sp-icon-cross100>
    `,
  l: () => d`
        <sp-icon-cross200
            slot="icon"
            class="icon spectrum-UIIcon-Cross200"
        ></sp-icon-cross200>
    `,
  xl: () => d`
        <sp-icon-cross300
            slot="icon"
            class="icon spectrum-UIIcon-Cross300"
        ></sp-icon-cross300>
    `,
};
class co extends dt(or) {
  constructor() {
    super(...arguments), (this.variant = "");
  }
  static get styles() {
    return [...super.styles, Ja, io];
  }
  get buttonContent() {
    return [hs[this.size]()];
  }
}
bs([l({ reflect: !0 })], co.prototype, "variant", 2);
customElements.define("sp-close-button", co);
let Ke;
const me = function (a, ...t) {
    return Ke ? Ke(a, ...t) : t.reduce((e, r, o) => e + r + a[o + 1], a[0]);
  },
  be = (a) => {
    Ke = a;
  },
  gs = ({
    width: a = 24,
    height: t = 24,
    hidden: e = !1,
    title: r = "Alert",
  } = {}) => me`<svg
    xmlns="http://www.w3.org/2000/svg"
    height="${t}"
    viewBox="0 0 36 36"
    width="${a}"
    aria-hidden="${e ? "true" : "false"}"
    role="img"
    fill="currentColor"
    aria-label="${r}"
  >
    <path
      d="M17.127 2.579.4 32.512A1 1 0 0 0 1.272 34h33.456a1 1 0 0 0 .872-1.488L18.873 2.579a1 1 0 0 0-1.746 0ZM20 29.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5Zm0-6a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5Z"
    />
  </svg>`;
class vs extends q {
  render() {
    return be(d), gs({ hidden: !this.label, title: this.label });
  }
}
customElements.define("sp-icon-alert", vs);
const fs = ({
  width: a = 24,
  height: t = 24,
  hidden: e = !1,
  title: r = "Info",
} = {}) => me`<svg
    xmlns="http://www.w3.org/2000/svg"
    height="${t}"
    viewBox="0 0 36 36"
    width="${a}"
    aria-hidden="${e ? "true" : "false"}"
    role="img"
    fill="currentColor"
    aria-label="${r}"
  >
    <path
      d="M18 2a16 16 0 1 0 16 16A16 16 0 0 0 18 2Zm-.3 4.3a2.718 2.718 0 0 1 2.864 2.824 2.664 2.664 0 0 1-2.864 2.863 2.705 2.705 0 0 1-2.864-2.864A2.717 2.717 0 0 1 17.7 6.3ZM22 27a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1v-6h-1a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v9h1a1 1 0 0 1 1 1Z"
    />
  </svg>`;
class ys extends q {
  render() {
    return be(d), fs({ hidden: !this.label, title: this.label });
  }
}
customElements.define("sp-icon-info", ys);
const ks = ({
  width: a = 24,
  height: t = 24,
  hidden: e = !1,
  title: r = "Checkmark Circle",
} = {}) => me`<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${a}"
    height="${t}"
    viewBox="0 0 36 36"
    aria-hidden="${e ? "true" : "false"}"
    role="img"
    fill="currentColor"
    aria-label="${r}"
  >
    <path
      d="M18 2a16 16 0 1 0 16 16A16 16 0 0 0 18 2Zm10.666 9.08L16.018 27.341a1.208 1.208 0 0 1-.875.461c-.024.002-.05.002-.073.002a1.2 1.2 0 0 1-.85-.351l-7.784-7.795a1.2 1.2 0 0 1 0-1.698l1.326-1.325a1.201 1.201 0 0 1 1.695 0l5.346 5.347L25.314 8.473A1.203 1.203 0 0 1 27 8.263l1.455 1.133a1.205 1.205 0 0 1 .211 1.684Z"
    />
  </svg>`;
class xs extends q {
  render() {
    return be(d), ks({ hidden: !this.label, title: this.label });
  }
}
customElements.define("sp-icon-checkmark-circle", xs);
const ws = v`
:host{--spectrum-toast-font-weight:var(
--spectrum-font-weight-regular
);--spectrum-toast-font-size:var(--spectrum-font-size-100);--spectrum-toast-corner-radius:var(--spectrum-corner-radius-100);--spectrum-toast-block-size:var(--spectrum-toast-height);--spectrum-toast-border-width:var(--spectrum-border-width-100);--spectrum-toast-line-height:var(--spectrum-line-height-100);--spectrum-toast-line-height-cjk:var(--spectrum-line-height-cjk-100);--spectrum-toast-spacing-icon-to-text:var(--spectrum-text-to-visual-100);--spectrum-toast-spacing-start-edge-to-text-and-icon:var(
--spectrum-spacing-300
);--spectrum-toast-spacing-text-and-action-button-to-divider:var(
--spectrum-spacing-300
);--spectrum-toast-spacing-top-edge-to-divider:var(--spectrum-spacing-100);--spectrum-toast-spacing-bottom-edge-to-divider:var(
--spectrum-spacing-100
);--spectrum-toast-spacing-top-edge-to-icon:var(
--spectrum-toast-top-to-workflow-icon
);--spectrum-toast-spacing-text-to-action-button-horizontal:var(
--spectrum-spacing-300
);--spectrum-toast-spacing-close-button:var(--spectrum-spacing-100);--spectrum-toast-spacing-block-start:var(--spectrum-spacing-100);--spectrum-toast-spacing-block-end:var(--spectrum-spacing-100);--spectrum-toast-spacing-top-edge-to-text:var(
--spectrum-toast-top-to-text
);--spectrum-toast-spacing-bottom-edge-to-text:var(
--spectrum-toast-bottom-to-text
);--spectrum-toast-negative-background-color-default:var(
--spectrum-negative-background-color-default
);--spectrum-toast-positive-background-color-default:var(
--spectrum-positive-background-color-default
);--spectrum-toast-informative-background-color-default:var(
--spectrum-informative-background-color-default
);--spectrum-toast-text-and-icon-color:var(--spectrum-white);--spectrum-toast-divider-color:var(--spectrum-transparent-white-300)}@media (forced-colors:active){:host{--highcontrast-toast-border-color:ButtonText;border:var(
--mod-toast-border-width,var(--spectrum-toast-border-width)
) solid var(--highcontrast-toast-border-color,transparent)}}:host{-webkit-font-smoothing:antialiased;align-items:stretch;background-color:var(
--highcontrast-toast-background-color-default,var(
--mod-toast-background-color-default,var(--spectrum-toast-background-color-default)
)
);border-radius:var(
--mod-toast-corner-radius,var(--spectrum-toast-corner-radius)
);box-sizing:border-box;color:var(
--highcontrast-toast-background-color-default,var(
--mod-toast-background-color-default,var(--spectrum-toast-background-color-default)
)
);display:inline-flex;flex-direction:row;font-size:var(--mod-toast-font-size,var(--spectrum-toast-font-size));font-weight:var(
--mod-toast-font-weight,var(--spectrum-toast-font-weight)
);min-block-size:var(--spectrum-toast-block-size);padding-inline-start:var(
--mod-toast-spacing-start-edge-to-text-and-icon,var(--spectrum-toast-spacing-start-edge-to-text-and-icon)
)}:host([variant=negative]){background-color:var(
--highcontrast-toast-negative-background-color-default,var(
--mod-toast-negative-background-color-default,var(--spectrum-toast-negative-background-color-default)
)
);color:var(
--highcontrast-toast-negative-background-color-default,var(
--mod-toast-negative-background-color-default,var(--spectrum-toast-negative-background-color-default)
)
)}:host([variant=negative]) .closeButton.focus-visible:not(:active){color:var(
--highcontrast-toast-negative-background-color-default,var(
--mod-toast-negative-background-color-default,var(--spectrum-toast-negative-background-color-default)
)
)}:host([variant=negative]) .closeButton:focus-visible:not(:active){color:var(
--highcontrast-toast-negative-background-color-default,var(
--mod-toast-negative-background-color-default,var(--spectrum-toast-negative-background-color-default)
)
)}:host([variant=info]){background-color:var(
--highcontrast-toast-informative-background-color-default,var(
--mod-toast-informative-background-color-default,var(--spectrum-toast-informative-background-color-default)
)
);color:var(
--highcontrast-toast-informative-background-color-default,var(
--mod-toast-informative-background-color-default,var(--spectrum-toast-informative-background-color-default)
)
)}:host([variant=info]) .closeButton.focus-visible:not(:active){color:var(
--highcontrast-toast-informative-background-color-default,var(
--mod-toast-informative-background-color-default,var(--spectrum-toast-informative-background-color-default)
)
)}:host([variant=info]) .closeButton:focus-visible:not(:active){color:var(
--highcontrast-toast-informative-background-color-default,var(
--mod-toast-informative-background-color-default,var(--spectrum-toast-informative-background-color-default)
)
)}:host([variant=positive]){background-color:var(
--highcontrast-toast-positive-background-color-default,var(
--mod-toast-positive-background-color-default,var(--spectrum-toast-positive-background-color-default)
)
);color:var(
--highcontrast-toast-positive-background-color-default,var(
--mod-toast-positive-background-color-default,var(--spectrum-toast-positive-background-color-default)
)
)}:host([variant=positive]) .closeButton.focus-visible:not(:active){color:var(
--highcontrast-toast-positive-background-color-default,var(
--mod-toast-positive-background-color-default,var(--spectrum-toast-positive-background-color-default)
)
)}:host([variant=positive]) .closeButton:focus-visible:not(:active){color:var(
--highcontrast-toast-positive-background-color-default,var(
--mod-toast-positive-background-color-default,var(--spectrum-toast-positive-background-color-default)
)
)}.type{flex-grow:0;flex-shrink:0;margin-block-start:var(
--mod-toast-spacing-top-edge-to-icon,var(--spectrum-toast-spacing-top-edge-to-icon)
);margin-inline-end:var(
--mod-toast-spacing-icon-to-text,var(--spectrum-toast-spacing-icon-to-text)
);margin-inline-start:0}.content,.type{color:var(
--highcontrast-toast-text-and-icon-color,var(
--mod-toast-text-and-icon-color,var(--spectrum-toast-text-and-icon-color)
)
)}.content{box-sizing:border-box;display:inline-block;flex:1 1 auto;line-height:var(
--mod-toast-line-height,var(--spectrum-toast-line-height)
);padding-block-end:calc(var(
--mod-toast-spacing-bottom-edge-to-text,
var(--spectrum-toast-spacing-bottom-edge-to-text)
) - var(
--mod-toast-spacing-block-end,
var(--spectrum-toast-spacing-block-end)
));padding-block-start:calc(var(
--mod-toast-spacing-top-edge-to-text,
var(--spectrum-toast-spacing-top-edge-to-text)
) - var(
--mod-toast-spacing-block-start,
var(--spectrum-toast-spacing-block-start)
));padding-inline-end:var(
--mod-toast-spacing-text-to-action-button-horizontal,var(--spectrum-toast-spacing-text-to-action-button-horizontal)
);padding-inline-start:0;text-align:start}.content:lang(ja),.content:lang(ko),.content:lang(zh){line-height:var(
--mod-toast-line-height-cjk,var(--spectrum-toast-line-height-cjk)
)}.buttons{align-items:flex-start;border-inline-start-color:var(
--mod-toast-divider-color,var(--spectrum-toast-divider-color)
);display:flex;flex:0 0 auto;margin-block-end:var(
--mod-toast-spacing-bottom-edge-to-divider,var(--spectrum-toast-spacing-bottom-edge-to-divider)
);margin-block-start:var(
--mod-toast-spacing-top-edge-to-divider,var(--spectrum-toast-spacing-top-edge-to-divider)
);padding-inline-end:var(
--mod-toast-spacing-close-button,var(--spectrum-toast-spacing-close-button)
)}.buttons .spectrum-CloseButton{align-self:flex-start}.body{align-items:center;align-self:center;display:flex;flex:1 1 auto;flex-wrap:wrap;padding-block-end:var(
--mod-toast-spacing-block-end,var(--spectrum-toast-spacing-block-end)
);padding-block-start:var(
--mod-toast-spacing-block-start,var(--spectrum-toast-spacing-block-start)
)}.body ::slotted([slot=action]){margin-inline-end:var(
--mod-toast-spacing-text-and-action-button-to-divider,var(--spectrum-toast-spacing-text-and-action-button-to-divider)
)}:host([dir=ltr]) .body ::slotted([slot=action]){margin-left:auto}:host([dir=rtl]) .body ::slotted([slot=action]){margin-right:auto;margin-inline-end:var(
--mod-toast-spacing-text-and-action-button-to-divider,var(--spectrum-toast-spacing-text-and-action-button-to-divider)
)}.body+.buttons{border-inline-start-style:solid;border-inline-start-width:1px;padding-inline-start:var(
--mod-toast-spacing-close-button,var(--spectrum-toast-spacing-close-button)
)}:host{--spectrum-toast-background-color-default:var(
--system-spectrum-toast-background-color-default
)}:host(:not([open])){display:none}
`,
  zs = ws;
var $s = Object.defineProperty,
  Cs = Object.getOwnPropertyDescriptor,
  Ae = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Cs(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && $s(t, e, o), o;
  };
const Ss = ["negative", "positive", "info", "error", "warning"];
class oe extends ot {
  constructor() {
    super(...arguments),
      (this.open = !1),
      (this._timeout = null),
      (this._variant = ""),
      (this.countdownStart = 0),
      (this.nextCount = -1),
      (this.doCountdown = (t) => {
        this.countdownStart || (this.countdownStart = performance.now()),
          t - this.countdownStart > this._timeout
            ? (this.shouldClose(), (this.countdownStart = 0))
            : this.countdown();
      }),
      (this.countdown = () => {
        cancelAnimationFrame(this.nextCount),
          (this.nextCount = requestAnimationFrame(this.doCountdown));
      }),
      (this.holdCountdown = () => {
        this.stopCountdown(),
          this.addEventListener("focusout", this.resumeCountdown);
      }),
      (this.resumeCountdown = () => {
        this.removeEventListener("focusout", this.holdCountdown),
          this.countdown();
      });
  }
  static get styles() {
    return [zs];
  }
  set timeout(t) {
    const e = typeof t !== null && t > 0 ? Math.max(6e3, t) : null,
      r = this.timeout;
    e && this.countdownStart && (this.countdownStart = performance.now()),
      (this._timeout = e),
      this.requestUpdate("timeout", r);
  }
  get timeout() {
    return this._timeout;
  }
  set variant(t) {
    if (t === this.variant) return;
    const e = this.variant;
    Ss.includes(t)
      ? (this.setAttribute("variant", t), (this._variant = t))
      : (this.removeAttribute("variant"), (this._variant = "")),
      this.requestUpdate("variant", e);
  }
  get variant() {
    return this._variant;
  }
  renderIcon(t) {
    switch (t) {
      case "info":
        return d`
                    <sp-icon-info
                        label="Information"
                        class="type"
                    ></sp-icon-info>
                `;
      case "negative":
      case "error":
      case "warning":
        return d`
                    <sp-icon-alert label="Error" class="type"></sp-icon-alert>
                `;
      case "positive":
      case "success":
        return d`
                    <sp-icon-checkmark-circle
                        label="Success"
                        class="type"
                    ></sp-icon-checkmark-circle>
                `;
      default:
        return d``;
    }
  }
  startCountdown() {
    this.countdown(), this.addEventListener("focusin", this.holdCountdown);
  }
  stopCountdown() {
    cancelAnimationFrame(this.nextCount), (this.countdownStart = 0);
  }
  shouldClose() {
    this.dispatchEvent(
      new CustomEvent("close", { composed: !0, bubbles: !0, cancelable: !0 }),
    ) && this.close();
  }
  close() {
    this.open = !1;
  }
  render() {
    return d`
            ${this.renderIcon(this.variant)}
            <div class="body" role="alert">
                <div class="content">
                    <slot></slot>
                </div>
                <slot name="action"></slot>
            </div>
            <div class="buttons">
                <sp-close-button
                    @click=${this.shouldClose}
                    label="Close"
                    variant="white"
                ></sp-close-button>
            </div>
        `;
  }
  updated(t) {
    super.updated(t),
      t.has("open") &&
        (this.open
          ? this.timeout && this.startCountdown()
          : this.timeout && this.stopCountdown()),
      t.has("timeout") &&
        (this.timeout !== null && this.open
          ? this.startCountdown()
          : this.stopCountdown());
  }
}
Ae([l({ type: Boolean, reflect: !0 })], oe.prototype, "open", 2),
  Ae([l({ type: Number })], oe.prototype, "timeout", 1),
  Ae([l({ type: String })], oe.prototype, "variant", 1);
customElements.define("sp-toast", oe);
const _s = v`
:host{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;align-items:center;-webkit-appearance:button;box-sizing:border-box;cursor:pointer;display:inline-flex;font-family:var(
--spectrum-alias-body-text-font-family,var(--spectrum-global-font-family-base)
);justify-content:center;line-height:var(
--spectrum-alias-component-text-line-height,var(--spectrum-global-font-line-height-small)
);margin:0;overflow:visible;position:relative;text-decoration:none;text-transform:none;transition:background var(--spectrum-global-animation-duration-100,.13s) ease-out,border-color var(--spectrum-global-animation-duration-100,.13s) ease-out,color var(--spectrum-global-animation-duration-100,.13s) ease-out,box-shadow var(--spectrum-global-animation-duration-100,.13s) ease-out;user-select:none;-webkit-user-select:none;vertical-align:top}:host(:focus){outline:none}:host(::-moz-focus-inner){border:0;border-style:none;margin-bottom:-2px;margin-top:-2px;padding:0}:host([disabled]){cursor:default}::slotted([slot=icon]){flex-shrink:0;max-height:100%}:host:after{border-radius:calc(var(
--spectrum-button-m-primary-fill-texticon-border-radius,
var(--spectrum-global-dimension-size-200)
) + var(
--spectrum-alias-focus-ring-gap,
var(--spectrum-global-dimension-static-size-25)
));bottom:0;content:"";display:block;left:0;margin:calc(var(
--spectrum-alias-focus-ring-gap,
var(--spectrum-global-dimension-static-size-25)
)*-1);position:absolute;right:0;top:0;transition:opacity var(--spectrum-global-animation-duration-100,.13s) ease-out,margin var(--spectrum-global-animation-duration-100,.13s) ease-out}:host(.focus-visible):after{margin:calc(var(
--spectrum-alias-focus-ring-gap,
var(--spectrum-global-dimension-static-size-25)
)*-2)}:host(:focus-visible):after{margin:calc(var(
--spectrum-alias-focus-ring-gap,
var(--spectrum-global-dimension-static-size-25)
)*-2)}#label{align-self:center;justify-self:center;text-align:center}#label:empty{display:none}:host([size=s]){--spectrum-button-primary-fill-textonly-text-padding-bottom:var(
--spectrum-button-s-primary-fill-textonly-text-padding-bottom
);--spectrum-button-primary-fill-texticon-text-size:var(
--spectrum-button-s-primary-fill-texticon-text-size,var(--spectrum-global-dimension-font-size-75)
);--spectrum-button-primary-fill-texticon-text-font-weight:var(
--spectrum-button-s-primary-fill-texticon-text-font-weight,var(--spectrum-global-font-weight-bold)
);--spectrum-button-primary-fill-texticon-text-line-height:var(
--spectrum-button-s-primary-fill-texticon-text-line-height,var(--spectrum-alias-component-text-line-height)
);--spectrum-button-primary-fill-texticon-icon-gap:var(
--spectrum-button-s-primary-fill-texticon-icon-gap,var(--spectrum-global-dimension-size-85)
);--spectrum-button-primary-fill-texticon-focus-ring-size:var(
--spectrum-button-s-primary-fill-texticon-focus-ring-size,var(--spectrum-alias-focus-ring-size)
);--spectrum-button-primary-fill-texticon-border-size:var(
--spectrum-button-s-primary-fill-texticon-border-size,var(--spectrum-alias-border-size-thick)
);--spectrum-button-primary-fill-texticon-padding-left:var(
--spectrum-button-s-primary-fill-texticon-padding-left,var(--spectrum-global-dimension-size-125)
);--spectrum-button-primary-fill-texticon-border-radius:var(
--spectrum-button-s-primary-fill-texticon-border-radius,var(--spectrum-global-dimension-size-150)
);--spectrum-button-primary-fill-textonly-border-size:var(
--spectrum-button-s-primary-fill-textonly-border-size,var(--spectrum-alias-border-size-thick)
);--spectrum-button-primary-fill-textonly-min-width:var(
--spectrum-button-s-primary-fill-textonly-min-width,var(--spectrum-global-dimension-size-675)
);--spectrum-button-primary-fill-textonly-padding-left:var(
--spectrum-button-s-primary-fill-textonly-padding-left,var(--spectrum-global-dimension-size-150)
);--spectrum-button-primary-fill-textonly-padding-right:var(
--spectrum-button-s-primary-fill-textonly-padding-right,var(--spectrum-global-dimension-size-150)
);--spectrum-button-primary-fill-textonly-height:var(
--spectrum-button-s-primary-fill-textonly-height,var(--spectrum-global-dimension-size-300)
);--spectrum-button-primary-fill-textonly-text-padding-top:calc(var(
--spectrum-button-s-primary-fill-textonly-text-padding-top,
var(--spectrum-global-dimension-static-size-50)
) - 1px)}:host([size=m]){--spectrum-button-primary-fill-texticon-padding-left:var(
--spectrum-button-m-primary-fill-texticon-padding-left
);--spectrum-button-primary-fill-texticon-text-size:var(
--spectrum-button-m-primary-fill-texticon-text-size,var(--spectrum-global-dimension-font-size-100)
);--spectrum-button-primary-fill-texticon-text-font-weight:var(
--spectrum-button-m-primary-fill-texticon-text-font-weight,var(--spectrum-global-font-weight-bold)
);--spectrum-button-primary-fill-texticon-text-line-height:var(
--spectrum-button-m-primary-fill-texticon-text-line-height,var(--spectrum-alias-component-text-line-height)
);--spectrum-button-primary-fill-texticon-icon-gap:var(
--spectrum-button-m-primary-fill-texticon-icon-gap,var(--spectrum-global-dimension-size-100)
);--spectrum-button-primary-fill-texticon-focus-ring-size:var(
--spectrum-button-m-primary-fill-texticon-focus-ring-size,var(--spectrum-alias-focus-ring-size)
);--spectrum-button-primary-fill-texticon-border-size:var(
--spectrum-button-m-primary-fill-texticon-border-size,var(--spectrum-alias-border-size-thick)
);--spectrum-button-primary-fill-texticon-border-radius:var(
--spectrum-button-m-primary-fill-texticon-border-radius,var(--spectrum-global-dimension-size-200)
);--spectrum-button-primary-fill-textonly-text-padding-top:var(
--spectrum-button-m-primary-fill-textonly-text-padding-top,var(--spectrum-global-dimension-size-75)
);--spectrum-button-primary-fill-textonly-border-size:var(
--spectrum-button-m-primary-fill-textonly-border-size,var(--spectrum-alias-border-size-thick)
);--spectrum-button-primary-fill-textonly-min-width:var(
--spectrum-button-m-primary-fill-textonly-min-width,var(--spectrum-global-dimension-size-900)
);--spectrum-button-primary-fill-textonly-padding-left:var(
--spectrum-button-m-primary-fill-textonly-padding-left,var(--spectrum-global-dimension-size-200)
);--spectrum-button-primary-fill-textonly-padding-right:var(
--spectrum-button-m-primary-fill-textonly-padding-right,var(--spectrum-global-dimension-size-200)
);--spectrum-button-primary-fill-textonly-height:var(
--spectrum-button-m-primary-fill-textonly-height,var(--spectrum-global-dimension-size-400)
);--spectrum-button-primary-fill-textonly-text-padding-bottom:calc(var(
--spectrum-button-m-primary-fill-textonly-text-padding-bottom,
var(--spectrum-global-dimension-size-115)
) - 1px)}:host([size=l]){--spectrum-button-primary-fill-textonly-text-padding-top:var(
--spectrum-button-l-primary-fill-textonly-text-padding-top
);--spectrum-button-primary-fill-texticon-text-size:var(
--spectrum-button-l-primary-fill-texticon-text-size,var(--spectrum-global-dimension-font-size-200)
);--spectrum-button-primary-fill-texticon-text-font-weight:var(
--spectrum-button-l-primary-fill-texticon-text-font-weight,var(--spectrum-global-font-weight-bold)
);--spectrum-button-primary-fill-texticon-text-line-height:var(
--spectrum-button-l-primary-fill-texticon-text-line-height,var(--spectrum-alias-component-text-line-height)
);--spectrum-button-primary-fill-texticon-icon-gap:var(
--spectrum-button-l-primary-fill-texticon-icon-gap,var(--spectrum-global-dimension-size-115)
);--spectrum-button-primary-fill-texticon-focus-ring-size:var(
--spectrum-button-l-primary-fill-texticon-focus-ring-size,var(--spectrum-alias-focus-ring-size)
);--spectrum-button-primary-fill-texticon-border-size:var(
--spectrum-button-l-primary-fill-texticon-border-size,var(--spectrum-alias-border-size-thick)
);--spectrum-button-primary-fill-texticon-padding-left:var(
--spectrum-button-l-primary-fill-texticon-padding-left,var(--spectrum-global-dimension-size-225)
);--spectrum-button-primary-fill-texticon-border-radius:var(
--spectrum-button-l-primary-fill-texticon-border-radius,var(--spectrum-global-dimension-size-250)
);--spectrum-button-primary-fill-textonly-text-padding-bottom:var(
--spectrum-button-l-primary-fill-textonly-text-padding-bottom,var(--spectrum-global-dimension-size-130)
);--spectrum-button-primary-fill-textonly-border-size:var(
--spectrum-button-l-primary-fill-textonly-border-size,var(--spectrum-alias-border-size-thick)
);--spectrum-button-primary-fill-textonly-min-width:var(
--spectrum-button-l-primary-fill-textonly-min-width,var(--spectrum-global-dimension-size-1125)
);--spectrum-button-primary-fill-textonly-padding-left:var(
--spectrum-button-l-primary-fill-textonly-padding-left,var(--spectrum-global-dimension-size-250)
);--spectrum-button-primary-fill-textonly-padding-right:var(
--spectrum-button-l-primary-fill-textonly-padding-right,var(--spectrum-global-dimension-size-250)
);--spectrum-button-primary-fill-textonly-height:var(
--spectrum-button-l-primary-fill-textonly-height,var(--spectrum-global-dimension-size-500)
)}:host([size=xl]){--spectrum-button-primary-fill-texticon-padding-left:var(
--spectrum-button-xl-primary-fill-texticon-padding-left
);--spectrum-button-primary-fill-texticon-text-size:var(
--spectrum-button-xl-primary-fill-texticon-text-size,var(--spectrum-global-dimension-font-size-300)
);--spectrum-button-primary-fill-texticon-text-font-weight:var(
--spectrum-button-xl-primary-fill-texticon-text-font-weight,var(--spectrum-global-font-weight-bold)
);--spectrum-button-primary-fill-texticon-text-line-height:var(
--spectrum-button-xl-primary-fill-texticon-text-line-height,var(--spectrum-alias-component-text-line-height)
);--spectrum-button-primary-fill-texticon-icon-gap:var(
--spectrum-button-xl-primary-fill-texticon-icon-gap,var(--spectrum-global-dimension-size-125)
);--spectrum-button-primary-fill-texticon-focus-ring-size:var(
--spectrum-button-xl-primary-fill-texticon-focus-ring-size,var(--spectrum-alias-focus-ring-size)
);--spectrum-button-primary-fill-texticon-border-size:var(
--spectrum-button-xl-primary-fill-texticon-border-size,var(--spectrum-alias-border-size-thick)
);--spectrum-button-primary-fill-texticon-border-radius:var(
--spectrum-button-xl-primary-fill-texticon-border-radius,var(--spectrum-global-dimension-size-300)
);--spectrum-button-primary-fill-textonly-text-padding-top:var(
--spectrum-button-xl-primary-fill-textonly-text-padding-top,var(--spectrum-global-dimension-size-150)
);--spectrum-button-primary-fill-textonly-border-size:var(
--spectrum-button-xl-primary-fill-textonly-border-size,var(--spectrum-alias-border-size-thick)
);--spectrum-button-primary-fill-textonly-min-width:var(
--spectrum-button-xl-primary-fill-textonly-min-width,var(--spectrum-global-dimension-size-1250)
);--spectrum-button-primary-fill-textonly-padding-left:var(
--spectrum-button-xl-primary-fill-textonly-padding-left,var(--spectrum-global-dimension-size-300)
);--spectrum-button-primary-fill-textonly-padding-right:var(
--spectrum-button-xl-primary-fill-textonly-padding-right,var(--spectrum-global-dimension-size-300)
);--spectrum-button-primary-fill-textonly-height:var(
--spectrum-button-xl-primary-fill-textonly-height,var(--spectrum-global-dimension-size-600)
);--spectrum-button-primary-fill-textonly-text-padding-bottom:calc(var(
--spectrum-button-xl-primary-fill-textonly-text-padding-bottom,
var(--spectrum-global-dimension-size-175)
) - 1px)}:host{--spectrum-button-primary-fill-padding-left-adjusted:calc(var(--spectrum-button-primary-fill-texticon-padding-left) - var(--spectrum-button-primary-fill-texticon-border-size));--spectrum-button-primary-fill-textonly-padding-left-adjusted:calc(var(--spectrum-button-primary-fill-textonly-padding-left) - var(--spectrum-button-primary-fill-texticon-border-size));--spectrum-button-primary-fill-textonly-padding-right-adjusted:calc(var(--spectrum-button-primary-fill-textonly-padding-right) - var(--spectrum-button-primary-fill-texticon-border-size))}:host([dir=ltr]){padding-left:var(
--spectrum-button-primary-fill-textonly-padding-left-adjusted
);padding-right:var(
--spectrum-button-primary-fill-textonly-padding-right-adjusted
)}:host([dir=rtl]){padding-left:var(
--spectrum-button-primary-fill-textonly-padding-right-adjusted
);padding-right:var(
--spectrum-button-primary-fill-textonly-padding-left-adjusted
)}:host{--spectrum-button-focus-ring-color:var(
--spectrum-button-m-primary-fill-texticon-focus-ring-color-key-focus,var(--spectrum-alias-focus-ring-color)
);border-radius:var(--spectrum-button-primary-fill-texticon-border-radius);border-style:solid;border-width:var(
--spectrum-button-primary-fill-texticon-border-size
);color:inherit;font-size:var(--spectrum-button-primary-fill-texticon-text-size);font-weight:var(--spectrum-button-primary-fill-texticon-text-font-weight);height:auto;min-height:var(--spectrum-button-primary-fill-textonly-height);min-width:var(--spectrum-button-primary-fill-textonly-min-width);padding-bottom:0;padding-top:0}:host(:hover),:host([active]){box-shadow:none}:host([dir=ltr]) ::slotted([slot=icon]){margin-left:calc((var(
--spectrum-button-primary-fill-textonly-padding-left-adjusted
) - var(--spectrum-button-primary-fill-padding-left-adjusted))*-1)}:host([dir=rtl]) ::slotted([slot=icon]){margin-right:calc((var(
--spectrum-button-primary-fill-textonly-padding-left-adjusted
) - var(--spectrum-button-primary-fill-padding-left-adjusted))*-1)}:host([dir=ltr]) slot[name=icon]+#label{padding-left:var(
--spectrum-button-primary-fill-texticon-icon-gap
)}:host([dir=rtl]) slot[name=icon]+#label{padding-right:var(
--spectrum-button-primary-fill-texticon-icon-gap
)}:host([dir=ltr]) slot[name=icon]+#label{padding-right:0}:host([dir=rtl]) slot[name=icon]+#label{padding-left:0}:host:after{border-radius:calc(var(--spectrum-button-primary-fill-texticon-border-radius) + var(
--spectrum-alias-focus-ring-gap,
var(--spectrum-global-dimension-static-size-25)
))}#label{line-height:var(
--spectrum-button-primary-fill-texticon-text-line-height
);padding-bottom:calc(var(--spectrum-button-primary-fill-textonly-text-padding-bottom) - var(--spectrum-button-primary-fill-textonly-border-size));padding-top:calc(var(--spectrum-button-primary-fill-textonly-text-padding-top) - var(--spectrum-button-primary-fill-textonly-border-size))}:host(.focus-visible):after,:host([focused]):after{box-shadow:0 0 0 var(--spectrum-button-primary-fill-texticon-focus-ring-size) var(--spectrum-button-focus-ring-color)}:host(:focus-visible):after,:host([focused]):after{box-shadow:0 0 0 var(--spectrum-button-primary-fill-texticon-focus-ring-size) var(--spectrum-button-focus-ring-color)}:host([variant=white]){--spectrum-button-focus-ring-color:var(
--spectrum-button-m-primary-fill-white-texticon-focus-ring-color-key-focus,var(--spectrum-global-color-static-white)
)}:host([variant=black]){--spectrum-button-focus-ring-color:var(
--spectrum-button-m-primary-fill-black-texticon-focus-ring-color-key-focus,var(--spectrum-global-color-static-black)
)}:host(:not([variant=white]):not([variant=black])[disabled]) ::slotted([slot=icon]){color:var(
--spectrum-button-m-primary-fill-texticon-icon-color-disabled,var(--spectrum-global-color-gray-500)
)}:host(:not([variant=white]):not([variant=black])[disabled]) #label{color:var(
--spectrum-button-m-primary-fill-texticon-text-color-disabled,var(--spectrum-global-color-gray-500)
)}:host([variant=white][disabled]) ::slotted([slot=icon]){color:var(
--spectrum-button-m-primary-fill-white-texticon-icon-color-disabled,var(--spectrum-global-color-static-transparent-white-500)
)}:host([variant=white][disabled]) #label{color:var(
--spectrum-button-m-primary-fill-white-texticon-text-color-disabled,var(--spectrum-global-color-static-transparent-white-500)
)}:host([variant=white][treatment=fill]:not([variant=secondary]):not([disabled])){background-color:var(
--spectrum-button-m-primary-fill-white-texticon-background-color,var(--spectrum-global-color-static-white)
)}:host([variant=white][treatment=fill]:not([variant=secondary]):not([disabled])) ::slotted([slot=icon]){color:inherit}:host([variant=white][treatment=fill]:not([variant=secondary]):not([disabled])) #label{color:inherit}:host([variant=white][treatment=fill][variant=secondary]:not([disabled])){background-color:var(
--spectrum-button-m-secondary-fill-white-texticon-background-color,var(--spectrum-global-color-static-transparent-white-200)
)}:host([variant=white][treatment=fill][variant=secondary]:not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-fill-white-texticon-icon-color,var(--spectrum-global-color-static-white)
)}:host([variant=white][treatment=fill][variant=secondary]:not([disabled])) #label{color:var(
--spectrum-button-m-secondary-fill-white-texticon-text-color,var(--spectrum-global-color-static-white)
)}:host([variant=white][treatment=fill][variant=secondary]:not([disabled]):hover){background-color:var(
--spectrum-button-m-secondary-fill-white-texticon-background-color-hover,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=fill][variant=secondary]:not([disabled])[active]){background-color:var(
--spectrum-button-m-secondary-fill-white-texticon-background-color-down,var(--spectrum-global-color-static-transparent-white-400)
)}:host([variant=white][treatment=fill][variant=secondary]:not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-secondary-fill-white-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=fill][variant=secondary]:not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-secondary-fill-white-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=fill][variant=secondary]:not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-secondary-fill-white-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=fill][disabled]){background-color:var(
--spectrum-button-m-secondary-fill-white-texticon-background-color-disabled,var(--spectrum-global-color-static-transparent-white-200)
)}:host([variant=white][treatment=outline]:not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-outline-white-texticon-icon-color,var(--spectrum-global-color-static-white)
)}:host([variant=white][treatment=outline]:not([disabled])) #label{color:var(
--spectrum-button-m-secondary-outline-white-texticon-text-color,var(--spectrum-global-color-static-white)
)}:host([variant=white][treatment=outline][disabled]){background-color:var(
--spectrum-button-m-secondary-outline-white-texticon-background-color-disabled,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-secondary-outline-white-texticon-border-color-disabled,var(--spectrum-global-color-static-transparent-white-200)
)}:host([variant=white][treatment=outline]:not([variant=secondary]):not([disabled])){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-primary-outline-white-texticon-border-color,var(--spectrum-global-color-static-white)
)}:host([variant=white][treatment=outline]:not([variant=secondary]):not([disabled]):hover){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color-hover,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=outline]:not([variant=secondary]):not([disabled])[active]){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color-down,var(--spectrum-global-color-static-transparent-white-400)
)}:host([variant=white][treatment=outline]:not([variant=secondary]):not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=outline]:not([variant=secondary]):not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=outline]:not([variant=secondary]):not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=outline][variant=secondary]:not([disabled])){background-color:var(
--spectrum-button-m-secondary-outline-white-texticon-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-secondary-outline-white-texticon-border-color,var(--spectrum-global-color-static-transparent-white-200)
)}:host([variant=white][treatment=outline][variant=secondary]:not([disabled]):hover){background-color:var(
--spectrum-button-m-secondary-outline-white-texticon-background-color-hover,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=outline][variant=secondary]:not([disabled])[active]){background-color:var(
--spectrum-button-m-secondary-outline-white-texticon-background-color-down,var(--spectrum-global-color-static-transparent-white-400)
)}:host([variant=white][treatment=outline][variant=secondary]:not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-secondary-outline-white-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=outline][variant=secondary]:not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-secondary-outline-white-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=white][treatment=outline][variant=secondary]:not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-secondary-outline-white-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-white-300)
)}:host([variant=black][disabled]) ::slotted([slot=icon]){color:var(
--spectrum-button-m-primary-fill-black-texticon-icon-color-disabled,var(--spectrum-global-color-static-transparent-black-500)
)}:host([variant=black][disabled]) #label{color:var(
--spectrum-button-m-primary-fill-black-texticon-text-color-disabled,var(--spectrum-global-color-static-transparent-black-500)
)}:host([variant=black][treatment=fill]:not([variant=secondary]):not([disabled])){background-color:var(
--spectrum-button-m-primary-fill-black-texticon-background-color,var(--spectrum-global-color-static-black)
)}:host([variant=black][treatment=fill]:not([variant=secondary]):not([disabled])) ::slotted([slot=icon]){color:inherit}:host([variant=black][treatment=fill]:not([variant=secondary]):not([disabled])) #label{color:inherit}:host([variant=black][treatment=fill][variant=secondary]:not([disabled])){background-color:var(
--spectrum-button-m-secondary-fill-black-texticon-background-color,var(--spectrum-global-color-static-transparent-black-200)
)}:host([variant=black][treatment=fill][variant=secondary]:not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-fill-black-texticon-icon-color,var(--spectrum-global-color-static-black)
)}:host([variant=black][treatment=fill][variant=secondary]:not([disabled])) #label{color:var(
--spectrum-button-m-secondary-fill-black-texticon-text-color,var(--spectrum-global-color-static-black)
)}:host([variant=black][treatment=fill][variant=secondary]:not([disabled]):hover){background-color:var(
--spectrum-button-m-secondary-fill-black-texticon-background-color-hover,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=fill][variant=secondary]:not([disabled])[active]){background-color:var(
--spectrum-button-m-secondary-fill-black-texticon-background-color-down,var(--spectrum-global-color-static-transparent-black-400)
)}:host([variant=black][treatment=fill][variant=secondary]:not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-secondary-fill-black-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=fill][variant=secondary]:not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-secondary-fill-black-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=fill][variant=secondary]:not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-secondary-fill-black-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=fill][disabled]){background-color:var(
--spectrum-button-m-secondary-fill-black-texticon-background-color-disabled,var(--spectrum-global-color-static-transparent-black-200)
)}:host([variant=black][treatment=outline]:not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-outline-black-texticon-icon-color,var(--spectrum-global-color-static-black)
)}:host([variant=black][treatment=outline]:not([disabled])) #label{color:var(
--spectrum-button-m-secondary-outline-black-texticon-text-color,var(--spectrum-global-color-static-black)
)}:host([variant=black][treatment=outline][disabled]){background-color:var(
--spectrum-button-m-secondary-outline-black-texticon-background-color-disabled,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-secondary-outline-black-texticon-border-color-disabled,var(--spectrum-global-color-static-transparent-black-200)
)}:host([variant=black][treatment=outline]:not([variant=secondary]):not([disabled])){background-color:var(
--spectrum-button-m-primary-outline-black-texticon-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-primary-outline-black-texticon-border-color,var(--spectrum-global-color-static-black)
)}:host([variant=black][treatment=outline]:not([variant=secondary]):not([disabled]):hover){background-color:var(
--spectrum-button-m-primary-outline-black-texticon-background-color-hover,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=outline]:not([variant=secondary]):not([disabled])[active]){background-color:var(
--spectrum-button-m-primary-outline-black-texticon-background-color-down,var(--spectrum-global-color-static-transparent-black-400)
)}:host([variant=black][treatment=outline]:not([variant=secondary]):not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-primary-outline-black-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=outline]:not([variant=secondary]):not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-primary-outline-black-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=outline]:not([variant=secondary]):not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-primary-outline-black-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=outline][variant=secondary]:not([disabled])){background-color:var(
--spectrum-button-m-secondary-outline-black-texticon-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-secondary-outline-black-texticon-border-color,var(--spectrum-global-color-static-transparent-black-200)
)}:host([variant=black][treatment=outline][variant=secondary]:not([disabled]):hover){background-color:var(
--spectrum-button-m-secondary-outline-black-texticon-background-color-hover,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=outline][variant=secondary]:not([disabled])[active]){background-color:var(
--spectrum-button-m-secondary-outline-black-texticon-background-color-down,var(--spectrum-global-color-static-transparent-black-400)
)}:host([variant=black][treatment=outline][variant=secondary]:not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-secondary-outline-black-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=outline][variant=secondary]:not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-secondary-outline-black-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-black-300)
)}:host([variant=black][treatment=outline][variant=secondary]:not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-secondary-outline-black-texticon-background-color-key-focus,var(--spectrum-global-color-static-transparent-black-300)
)}:host([treatment=fill][variant=accent]:not([variant=white]):not([variant=black]):not([disabled])){background-color:var(
--spectrum-button-m-accent-fill-texticon-background-color,var(--spectrum-semantic-cta-background-color-default)
)}:host([treatment=fill][variant=accent]:not([variant=white]):not([variant=black]):not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-accent-fill-texticon-icon-color,var(--spectrum-global-color-static-white)
)}:host([treatment=fill][variant=accent]:not([variant=white]):not([variant=black]):not([disabled])) #label{color:var(
--spectrum-button-m-accent-fill-texticon-text-color,var(--spectrum-global-color-static-white)
)}:host([treatment=fill][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]):hover){background-color:var(
--spectrum-button-m-accent-fill-texticon-background-color-hover,var(--spectrum-semantic-cta-background-color-hover)
)}:host([treatment=fill][variant=accent]:not([variant=white]):not([variant=black]):not([disabled])[active]){background-color:var(
--spectrum-button-m-accent-fill-texticon-background-color-down,var(--spectrum-semantic-cta-background-color-down)
)}:host([treatment=fill][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-accent-fill-texticon-background-color-key-focus,var(--spectrum-semantic-cta-background-color-key-focus)
)}:host([treatment=fill][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-accent-fill-texticon-background-color-key-focus,var(--spectrum-semantic-cta-background-color-key-focus)
)}:host([treatment=fill][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-accent-fill-texticon-background-color-key-focus,var(--spectrum-semantic-cta-background-color-key-focus)
)}:host([treatment=fill][variant=negative]:not([variant=white]):not([variant=black]):not([disabled])){background-color:var(
--spectrum-button-m-negative-fill-texticon-background-color,var(--spectrum-global-color-static-red-600)
)}:host([treatment=fill][variant=negative]:not([variant=white]):not([variant=black]):not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-negative-fill-texticon-icon-color,var(--spectrum-global-color-static-white)
)}:host([treatment=fill][variant=negative]:not([variant=white]):not([variant=black]):not([disabled])) #label{color:var(
--spectrum-button-m-negative-fill-texticon-text-color,var(--spectrum-global-color-static-white)
)}:host([treatment=fill][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]):hover){background-color:var(
--spectrum-button-m-negative-fill-texticon-background-color-hover,var(--spectrum-global-color-static-red-700)
)}:host([treatment=fill][variant=negative]:not([variant=white]):not([variant=black]):not([disabled])[active]){background-color:var(
--spectrum-button-m-negative-fill-texticon-background-color-down,var(--spectrum-global-color-static-red-800)
)}:host([treatment=fill][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-negative-fill-texticon-background-color-key-focus,var(--spectrum-global-color-static-red-700)
)}:host([treatment=fill][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-negative-fill-texticon-background-color-key-focus,var(--spectrum-global-color-static-red-700)
)}:host([treatment=fill][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-negative-fill-texticon-background-color-key-focus,var(--spectrum-global-color-static-red-700)
)}:host([treatment=fill][variant=primary]:not([variant=white]):not([variant=black]):not([disabled])){background-color:var(
--spectrum-button-m-primary-fill-texticon-background-color,var(--spectrum-global-color-gray-800)
)}:host([treatment=fill][variant=primary]:not([variant=white]):not([variant=black]):not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-primary-fill-texticon-icon-color,var(--spectrum-global-color-gray-50)
)}:host([treatment=fill][variant=primary]:not([variant=white]):not([variant=black]):not([disabled])) #label{color:var(
--spectrum-button-m-primary-fill-texticon-text-color,var(--spectrum-global-color-gray-50)
)}:host([treatment=fill][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]):hover){background-color:var(
--spectrum-button-m-primary-fill-texticon-background-color-hover,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=primary]:not([variant=white]):not([variant=black]):not([disabled])[active]){background-color:var(
--spectrum-button-m-primary-fill-texticon-background-color-down,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-primary-fill-texticon-background-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-primary-fill-texticon-background-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-primary-fill-texticon-background-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])){background-color:var(
--spectrum-button-m-secondary-fill-texticon-background-color,var(--spectrum-global-color-gray-200)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-fill-texticon-icon-color,var(--spectrum-global-color-gray-800)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):hover){background-color:var(
--spectrum-button-m-secondary-fill-texticon-background-color-hover,var(--spectrum-global-color-gray-300)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):hover) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-fill-texticon-icon-color-hover,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):hover) #label{color:var(
--spectrum-button-m-secondary-fill-texticon-text-color-hover,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])[active]){background-color:var(
--spectrum-button-m-secondary-fill-texticon-background-color-down,var(--spectrum-global-color-gray-400)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])[active]) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-fill-texticon-icon-color-down,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])[active]) #label{color:var(
--spectrum-button-m-secondary-fill-texticon-text-color-down,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-secondary-fill-texticon-background-color-key-focus,var(--spectrum-global-color-gray-300)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-secondary-fill-texticon-background-color-key-focus,var(--spectrum-global-color-gray-300)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-fill-texticon-icon-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-fill-texticon-icon-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible) #label{color:var(
--spectrum-button-m-secondary-fill-texticon-text-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible) #label{color:var(
--spectrum-button-m-secondary-fill-texticon-text-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-secondary-fill-texticon-background-color-key-focus,var(--spectrum-global-color-gray-300)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-fill-texticon-icon-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused) #label{color:var(
--spectrum-button-m-secondary-fill-texticon-text-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=fill][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])) #label{color:var(
--spectrum-button-m-secondary-fill-texticon-text-color,var(--spectrum-global-color-gray-800)
)}:host([treatment=fill]:not([variant=white]):not([variant=black])[disabled]){background-color:var(
--spectrum-button-m-primary-fill-texticon-background-color-disabled,var(--spectrum-global-color-gray-200)
)}:host([treatment=fill][disabled]){border-color:var(
--spectrum-button-m-primary-fill-texticon-border-color-disabled,transparent
)}:host([treatment=fill]:not([disabled])){border-color:var(
--spectrum-button-m-primary-fill-texticon-border-color,transparent
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled])){background-color:var(
--spectrum-button-m-accent-outline-texticon-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-accent-outline-texticon-border-color,var(--spectrum-semantic-emphasized-border-color-default)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-accent-outline-texticon-icon-color,var(--spectrum-semantic-emphasized-border-color-default)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]):hover){background-color:var(
--spectrum-button-m-accent-outline-texticon-background-color-hover,var(--spectrum-alias-transparent-blue-background-color-hover)
);border-color:var(
--spectrum-button-m-accent-outline-texticon-border-color-hover,var(--spectrum-semantic-emphasized-border-color-hover)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]):hover) ::slotted([slot=icon]){color:var(
--spectrum-button-m-accent-outline-texticon-icon-color-hover,var(--spectrum-semantic-emphasized-border-color-hover)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]):hover) #label{color:var(
--spectrum-button-m-accent-outline-texticon-text-color-hover,var(--spectrum-semantic-emphasized-border-color-hover)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled])[active]){background-color:var(
--spectrum-button-m-accent-outline-texticon-background-color-down,var(--spectrum-alias-transparent-blue-background-color-down)
);border-color:var(
--spectrum-button-m-accent-outline-texticon-border-color-down,var(--spectrum-semantic-emphasized-border-color-down)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled])[active]) ::slotted([slot=icon]){color:var(
--spectrum-button-m-accent-outline-texticon-icon-color-down,var(--spectrum-semantic-emphasized-border-color-down)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled])[active]) #label{color:var(
--spectrum-button-m-accent-outline-texticon-text-color-down,var(--spectrum-semantic-emphasized-border-color-down)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-accent-outline-texticon-background-color-key-focus,var(--spectrum-alias-transparent-blue-background-color-key-focus)
);border-color:var(
--spectrum-button-m-accent-outline-texticon-border-color-key-focus,var(--spectrum-semantic-emphasized-border-color-key-focus)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-accent-outline-texticon-background-color-key-focus,var(--spectrum-alias-transparent-blue-background-color-key-focus)
);border-color:var(
--spectrum-button-m-accent-outline-texticon-border-color-key-focus,var(--spectrum-semantic-emphasized-border-color-key-focus)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible) ::slotted([slot=icon]){color:var(
--spectrum-button-m-accent-outline-texticon-icon-color-key-focus,var(--spectrum-semantic-emphasized-border-color-key-focus)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible) ::slotted([slot=icon]){color:var(
--spectrum-button-m-accent-outline-texticon-icon-color-key-focus,var(--spectrum-semantic-emphasized-border-color-key-focus)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible) #label{color:var(
--spectrum-button-m-accent-outline-texticon-text-color-key-focus,var(--spectrum-semantic-emphasized-border-color-key-focus)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible) #label{color:var(
--spectrum-button-m-accent-outline-texticon-text-color-key-focus,var(--spectrum-semantic-emphasized-border-color-key-focus)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-accent-outline-texticon-background-color-key-focus,var(--spectrum-alias-transparent-blue-background-color-key-focus)
);border-color:var(
--spectrum-button-m-accent-outline-texticon-border-color-key-focus,var(--spectrum-semantic-emphasized-border-color-key-focus)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused) ::slotted([slot=icon]){color:var(
--spectrum-button-m-accent-outline-texticon-icon-color-key-focus,var(--spectrum-semantic-emphasized-border-color-key-focus)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused) #label{color:var(
--spectrum-button-m-accent-outline-texticon-text-color-key-focus,var(--spectrum-semantic-emphasized-border-color-key-focus)
)}:host([treatment=outline][variant=accent]:not([variant=white]):not([variant=black]):not([disabled])) #label{color:var(
--spectrum-button-m-accent-outline-texticon-text-color,var(--spectrum-semantic-emphasized-border-color-default)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled])){background-color:var(
--spectrum-button-m-negative-outline-texticon-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-negative-outline-texticon-border-color,var(--spectrum-global-color-red-500)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-negative-outline-texticon-icon-color,var(--spectrum-global-color-red-500)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]):hover){background-color:var(
--spectrum-button-m-negative-outline-texticon-background-color-hover,var(--spectrum-alias-transparent-red-background-color-hover)
);border-color:var(
--spectrum-button-m-negative-outline-texticon-border-color-hover,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]):hover) ::slotted([slot=icon]){color:var(
--spectrum-button-m-negative-outline-texticon-icon-color-hover,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]):hover) #label{color:var(
--spectrum-button-m-negative-outline-texticon-text-color-hover,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled])[active]){background-color:var(
--spectrum-button-m-negative-outline-texticon-background-color-down,var(--spectrum-alias-transparent-red-background-color-down)
);border-color:var(
--spectrum-button-m-negative-outline-texticon-border-color-down,var(--spectrum-global-color-red-700)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled])[active]) ::slotted([slot=icon]){color:var(
--spectrum-button-m-negative-outline-texticon-icon-color-down,var(--spectrum-global-color-red-700)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled])[active]) #label{color:var(
--spectrum-button-m-negative-outline-texticon-text-color-down,var(--spectrum-global-color-red-700)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-negative-outline-texticon-background-color-key-focus,var(--spectrum-alias-transparent-red-background-color-key-focus)
);border-color:var(
--spectrum-button-m-negative-outline-texticon-border-color-key-focus,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-negative-outline-texticon-background-color-key-focus,var(--spectrum-alias-transparent-red-background-color-key-focus)
);border-color:var(
--spectrum-button-m-negative-outline-texticon-border-color-key-focus,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible) ::slotted([slot=icon]){color:var(
--spectrum-button-m-negative-outline-texticon-icon-color-key-focus,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible) ::slotted([slot=icon]){color:var(
--spectrum-button-m-negative-outline-texticon-icon-color-key-focus,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible) #label{color:var(
--spectrum-button-m-negative-outline-texticon-text-color-key-focus,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible) #label{color:var(
--spectrum-button-m-negative-outline-texticon-text-color-key-focus,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-negative-outline-texticon-background-color-key-focus,var(--spectrum-alias-transparent-red-background-color-key-focus)
);border-color:var(
--spectrum-button-m-negative-outline-texticon-border-color-key-focus,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused) ::slotted([slot=icon]){color:var(
--spectrum-button-m-negative-outline-texticon-icon-color-key-focus,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused) #label{color:var(
--spectrum-button-m-negative-outline-texticon-text-color-key-focus,var(--spectrum-global-color-red-600)
)}:host([treatment=outline][variant=negative]:not([variant=white]):not([variant=black]):not([disabled])) #label{color:var(
--spectrum-button-m-negative-outline-texticon-text-color,var(--spectrum-global-color-red-500)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled])){background-color:var(
--spectrum-button-m-primary-outline-texticon-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-primary-outline-texticon-border-color,var(--spectrum-global-color-gray-800)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-primary-outline-texticon-icon-color,var(--spectrum-global-color-gray-800)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]):hover){background-color:var(
--spectrum-button-m-primary-outline-texticon-background-color-hover,var(--spectrum-global-color-gray-300)
);border-color:var(
--spectrum-button-m-primary-outline-texticon-border-color-hover,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]):hover) ::slotted([slot=icon]){color:var(
--spectrum-button-m-primary-outline-texticon-icon-color-hover,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]):hover) #label{color:var(
--spectrum-button-m-primary-outline-texticon-text-color-hover,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled])[active]){background-color:var(
--spectrum-button-m-primary-outline-texticon-background-color-down,var(--spectrum-global-color-gray-400)
);border-color:var(
--spectrum-button-m-primary-outline-texticon-border-color-down,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled])[active]) ::slotted([slot=icon]){color:var(
--spectrum-button-m-primary-outline-texticon-icon-color-down,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled])[active]) #label{color:var(
--spectrum-button-m-primary-outline-texticon-text-color-down,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-primary-outline-texticon-background-color-key-focus,var(--spectrum-global-color-gray-300)
);border-color:var(
--spectrum-button-m-primary-outline-texticon-border-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-primary-outline-texticon-background-color-key-focus,var(--spectrum-global-color-gray-300)
);border-color:var(
--spectrum-button-m-primary-outline-texticon-border-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible) ::slotted([slot=icon]){color:var(
--spectrum-button-m-primary-outline-texticon-icon-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible) ::slotted([slot=icon]){color:var(
--spectrum-button-m-primary-outline-texticon-icon-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible) #label{color:var(
--spectrum-button-m-primary-outline-texticon-text-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible) #label{color:var(
--spectrum-button-m-primary-outline-texticon-text-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-primary-outline-texticon-background-color-key-focus,var(--spectrum-global-color-gray-300)
);border-color:var(
--spectrum-button-m-primary-outline-texticon-border-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused) ::slotted([slot=icon]){color:var(
--spectrum-button-m-primary-outline-texticon-icon-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused) #label{color:var(
--spectrum-button-m-primary-outline-texticon-text-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=primary]:not([variant=white]):not([variant=black]):not([disabled])) #label{color:var(
--spectrum-button-m-primary-outline-texticon-text-color,var(--spectrum-global-color-gray-800)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])){background-color:var(
--spectrum-button-m-secondary-outline-texticon-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-secondary-outline-texticon-border-color,var(--spectrum-global-color-gray-300)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-outline-texticon-icon-color,var(--spectrum-global-color-gray-800)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):hover){background-color:var(
--spectrum-button-m-secondary-outline-texticon-background-color-hover,var(--spectrum-global-color-gray-300)
);border-color:var(
--spectrum-button-m-secondary-outline-texticon-border-color-hover,var(--spectrum-global-color-gray-400)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):hover) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-outline-texticon-icon-color-hover,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):hover) #label{color:var(
--spectrum-button-m-secondary-outline-texticon-text-color-hover,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])[active]){background-color:var(
--spectrum-button-m-secondary-outline-texticon-background-color-down,var(--spectrum-global-color-gray-400)
);border-color:var(
--spectrum-button-m-secondary-outline-texticon-border-color-down,var(--spectrum-global-color-gray-500)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])[active]) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-outline-texticon-icon-color-down,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])[active]) #label{color:var(
--spectrum-button-m-secondary-outline-texticon-text-color-down,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible){background-color:var(
--spectrum-button-m-secondary-outline-texticon-background-color-key-focus,var(--spectrum-global-color-gray-300)
);border-color:var(
--spectrum-button-m-secondary-outline-texticon-border-color-key-focus,var(--spectrum-global-color-gray-400)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible){background-color:var(
--spectrum-button-m-secondary-outline-texticon-background-color-key-focus,var(--spectrum-global-color-gray-300)
);border-color:var(
--spectrum-button-m-secondary-outline-texticon-border-color-key-focus,var(--spectrum-global-color-gray-400)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-outline-texticon-icon-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-outline-texticon-icon-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).focus-visible) #label{color:var(
--spectrum-button-m-secondary-outline-texticon-text-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]):focus-visible) #label{color:var(
--spectrum-button-m-secondary-outline-texticon-text-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused){background-color:var(
--spectrum-button-m-secondary-outline-texticon-background-color-key-focus,var(--spectrum-global-color-gray-300)
);border-color:var(
--spectrum-button-m-secondary-outline-texticon-border-color-key-focus,var(--spectrum-global-color-gray-400)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused) ::slotted([slot=icon]){color:var(
--spectrum-button-m-secondary-outline-texticon-icon-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled]).is-keyboardFocused) #label{color:var(
--spectrum-button-m-secondary-outline-texticon-text-color-key-focus,var(--spectrum-global-color-gray-900)
)}:host([treatment=outline][variant=secondary]:not([variant=white]):not([variant=black]):not([disabled])) #label{color:var(
--spectrum-button-m-secondary-outline-texticon-text-color,var(--spectrum-global-color-gray-800)
)}:host([treatment=outline]:not([variant=white]):not([variant=black])[disabled]){background-color:var(
--spectrum-button-m-primary-outline-texticon-background-color-disabled,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-primary-outline-texticon-border-color-disabled,var(--spectrum-global-color-gray-200)
)}@media (forced-colors:active){:host{--spectrum-button-m-accent-fill-texticon-background-color-down:Highlight;--spectrum-button-m-accent-fill-texticon-background-color-hover:Highlight;--spectrum-button-m-accent-fill-texticon-background-color-key-focus:Highlight;--spectrum-button-m-accent-fill-texticon-background-color:ButtonText;--spectrum-button-m-accent-fill-texticon-icon-color:ButtonFace;--spectrum-button-m-accent-fill-texticon-text-color:ButtonFace;--spectrum-button-m-accent-outline-texticon-background-color:ButtonFace;--spectrum-button-m-accent-outline-texticon-background-color-down:ButtonFace;--spectrum-button-m-accent-outline-texticon-background-color-hover:ButtonFace;--spectrum-button-m-accent-outline-texticon-background-color-key-focus:ButtonFace;--spectrum-button-m-accent-outline-texticon-border-color:ButtonText;--spectrum-button-m-accent-outline-texticon-border-color-down:Highlight;--spectrum-button-m-accent-outline-texticon-border-color-hover:Highlight;--spectrum-button-m-accent-outline-texticon-border-color-key-focus:Highlight;--spectrum-button-m-accent-outline-texticon-icon-color:ButtonText;--spectrum-button-m-accent-outline-texticon-icon-color-down:ButtonText;--spectrum-button-m-accent-outline-texticon-icon-color-hover:ButtonText;--spectrum-button-m-accent-outline-texticon-icon-color-key-focus:ButtonText;--spectrum-button-m-accent-outline-texticon-text-color:ButtonText;--spectrum-button-m-accent-outline-texticon-text-color-down:ButtonText;--spectrum-button-m-accent-outline-texticon-text-color-hover:ButtonText;--spectrum-button-m-accent-outline-texticon-text-color-key-focus:ButtonText;--spectrum-button-m-primary-fill-texticon-icon-color-disabled:GrayText;--spectrum-button-m-primary-fill-texticon-text-color-disabled:GrayText;--spectrum-button-m-primary-fill-white-texticon-icon-color-disabled:GrayText;--spectrum-button-m-primary-fill-white-texticon-text-color-disabled:GrayText;--spectrum-button-m-secondary-fill-white-texticon-background-color-disabled:ButtonFace;--spectrum-button-m-secondary-outline-white-texticon-background-color-disabled:ButtonFace;--spectrum-button-m-primary-fill-black-texticon-icon-color-disabled:GrayText;--spectrum-button-m-primary-fill-black-texticon-text-color-disabled:GrayText;--spectrum-button-m-secondary-fill-black-texticon-background-color-disabled:ButtonFace;--spectrum-button-m-secondary-outline-black-texticon-background-color-disabled:ButtonFace;--spectrum-button-m-primary-fill-texticon-background-color-disabled:ButtonFace;--spectrum-button-m-primary-outline-texticon-background-color-disabled:ButtonFace}:host(.focus-visible):after,:host([focused]):after{box-shadow:0 0 0 var(--spectrum-button-primary-fill-texticon-focus-ring-size) ButtonText;forced-color-adjust:none}:host(:focus-visible):after,:host([focused]):after{box-shadow:0 0 0 var(--spectrum-button-primary-fill-texticon-focus-ring-size) ButtonText;forced-color-adjust:none}:host([variant=accent]) #label{forced-color-adjust:none}}:host([size=s]){--spectrum-icon-tshirt-size-height:var(
--spectrum-alias-workflow-icon-size-s
);--spectrum-icon-tshirt-size-width:var(
--spectrum-alias-workflow-icon-size-s
);--spectrum-ui-icon-tshirt-size-height:var(
--spectrum-alias-ui-icon-cornertriangle-size-75
);--spectrum-ui-icon-tshirt-size-width:var(
--spectrum-alias-ui-icon-cornertriangle-size-75
)}:host([size=m]){--spectrum-icon-tshirt-size-height:var(
--spectrum-alias-workflow-icon-size-m
);--spectrum-icon-tshirt-size-width:var(
--spectrum-alias-workflow-icon-size-m
);--spectrum-ui-icon-tshirt-size-height:var(
--spectrum-alias-ui-icon-cornertriangle-size-100
);--spectrum-ui-icon-tshirt-size-width:var(
--spectrum-alias-ui-icon-cornertriangle-size-100
)}:host([size=l]){--spectrum-icon-tshirt-size-height:var(
--spectrum-alias-workflow-icon-size-l
);--spectrum-icon-tshirt-size-width:var(
--spectrum-alias-workflow-icon-size-l
);--spectrum-ui-icon-tshirt-size-height:var(
--spectrum-alias-ui-icon-cornertriangle-size-200
);--spectrum-ui-icon-tshirt-size-width:var(
--spectrum-alias-ui-icon-cornertriangle-size-200
)}:host([size=xl]){--spectrum-icon-tshirt-size-height:var(
--spectrum-alias-workflow-icon-size-xl
);--spectrum-icon-tshirt-size-width:var(
--spectrum-alias-workflow-icon-size-xl
);--spectrum-ui-icon-tshirt-size-height:var(
--spectrum-alias-ui-icon-cornertriangle-size-300
);--spectrum-ui-icon-tshirt-size-width:var(
--spectrum-alias-ui-icon-cornertriangle-size-300
)}@media (forced-colors:active){:host([treatment][disabled]){border-color:graytext}:host([treatment]:not([disabled]):hover){border-color:highlight}}
`,
  Es = _s;
var As = Object.defineProperty,
  Ts = Object.getOwnPropertyDescriptor,
  Te = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Ts(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && As(t, e, o), o;
  };
const Os = ["accent", "primary", "secondary", "negative", "white", "black"];
class ae extends dt(or) {
  constructor() {
    super(...arguments), (this._variant = "accent"), (this.treatment = "fill");
  }
  static get styles() {
    return [...super.styles, Es];
  }
  get variant() {
    return this._variant;
  }
  set variant(t) {
    if (t !== this.variant) {
      switch ((this.requestUpdate("variant", this.variant), t)) {
        case "cta":
          this._variant = "accent";
          break;
        case "overBackground":
          (this._variant = "white"), (this.treatment = "outline");
          break;
        default:
          Os.includes(t) ? (this._variant = t) : (this._variant = "accent");
          break;
      }
      this.setAttribute("variant", this.variant);
    }
  }
  set quiet(t) {
    this.treatment = t ? "outline" : "fill";
  }
  firstUpdated(t) {
    super.firstUpdated(t),
      this.hasAttribute("variant") ||
        this.setAttribute("variant", this.variant);
  }
}
Te([l()], ae.prototype, "variant", 1),
  Te([l({ reflect: !0 })], ae.prototype, "treatment", 2),
  Te([l({ type: Boolean })], ae.prototype, "quiet", 1);
const Ps = v`
:host{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;align-items:center;-webkit-appearance:button;border-style:solid;box-sizing:border-box;cursor:pointer;display:inline-flex;font-family:var(
--spectrum-alias-body-text-font-family,var(--spectrum-global-font-family-base)
);justify-content:center;line-height:var(
--spectrum-alias-component-text-line-height,var(--spectrum-global-font-line-height-small)
);overflow:visible;position:relative;text-decoration:none;text-transform:none;transition:background var(--spectrum-global-animation-duration-100,.13s) ease-out,border-color var(--spectrum-global-animation-duration-100,.13s) ease-out,color var(--spectrum-global-animation-duration-100,.13s) ease-out,box-shadow var(--spectrum-global-animation-duration-100,.13s) ease-out;user-select:none;-webkit-user-select:none;vertical-align:top}:host(:focus){outline:none}:host(::-moz-focus-inner){border:0;border-style:none;margin-bottom:-2px;margin-top:-2px;padding:0}:host([disabled]){cursor:default}:host{background-color:transparent;border:none;border-radius:100%;margin:0;padding:var(--spectrum-clearbutton-padding)}:host>.icon{margin:0 auto}:host([size=s]){--spectrum-clearbutton-fill-uiicon-color-disabled:var(
--spectrum-clearbutton-s-fill-uiicon-color-disabled,var(--spectrum-alias-component-icon-color-disabled)
);--spectrum-clearbutton-fill-background-color-disabled:var(
--spectrum-clearbutton-s-fill-background-color-disabled,var(--spectrum-alias-background-color-transparent)
);--spectrum-clearbutton-fill-uiicon-color:var(
--spectrum-clearbutton-s-fill-uiicon-color,var(--spectrum-alias-component-icon-color-default)
);--spectrum-clearbutton-fill-background-color:var(
--spectrum-clearbutton-s-fill-background-color,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-default
)
);--spectrum-clearbutton-fill-uiicon-color-down:var(
--spectrum-clearbutton-s-fill-uiicon-color-down,var(--spectrum-alias-component-icon-color-down)
);--spectrum-clearbutton-fill-background-color-down:var(
--spectrum-clearbutton-s-fill-background-color-down,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-down
)
);--spectrum-clearbutton-fill-background-color-hover:var(
--spectrum-clearbutton-s-fill-background-color-hover,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-hover
)
);--spectrum-clearbutton-fill-uiicon-color-key-focus:var(
--spectrum-clearbutton-s-fill-uiicon-color-key-focus,var(--spectrum-alias-component-icon-color-key-focus)
);--spectrum-clearbutton-fill-background-color-key-focus:var(
--spectrum-clearbutton-s-fill-background-color-key-focus,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-key-focus
)
);--spectrum-clearbutton-fill-size:var(
--spectrum-clearbutton-s-fill-size,var(--spectrum-alias-infieldbutton-full-height-s)
);--spectrum-clearbutton-padding:var(
--spectrum-clearbutton-s-padding,var(--spectrum-alias-infieldbutton-padding-s)
)}:host([size=m]){--spectrum-clearbutton-fill-uiicon-color-disabled:var(
--spectrum-clearbutton-m-fill-uiicon-color-disabled,var(--spectrum-alias-component-icon-color-disabled)
);--spectrum-clearbutton-fill-background-color-disabled:var(
--spectrum-clearbutton-m-fill-background-color-disabled,var(--spectrum-alias-background-color-transparent)
);--spectrum-clearbutton-fill-uiicon-color:var(
--spectrum-clearbutton-m-fill-uiicon-color,var(--spectrum-alias-component-icon-color-default)
);--spectrum-clearbutton-fill-background-color:var(
--spectrum-clearbutton-m-fill-background-color,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-default
)
);--spectrum-clearbutton-fill-uiicon-color-down:var(
--spectrum-clearbutton-m-fill-uiicon-color-down,var(--spectrum-alias-component-icon-color-down)
);--spectrum-clearbutton-fill-background-color-down:var(
--spectrum-clearbutton-m-fill-background-color-down,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-down
)
);--spectrum-clearbutton-fill-background-color-hover:var(
--spectrum-clearbutton-m-fill-background-color-hover,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-hover
)
);--spectrum-clearbutton-fill-uiicon-color-key-focus:var(
--spectrum-clearbutton-m-fill-uiicon-color-key-focus,var(--spectrum-alias-component-icon-color-key-focus)
);--spectrum-clearbutton-fill-background-color-key-focus:var(
--spectrum-clearbutton-m-fill-background-color-key-focus,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-key-focus
)
);--spectrum-clearbutton-fill-size:var(
--spectrum-clearbutton-m-fill-size,var(--spectrum-alias-infieldbutton-full-height-m)
);--spectrum-clearbutton-padding:var(
--spectrum-clearbutton-m-padding,var(--spectrum-alias-infieldbutton-padding-m)
)}:host([size=l]){--spectrum-clearbutton-fill-uiicon-color-disabled:var(
--spectrum-clearbutton-l-fill-uiicon-color-disabled,var(--spectrum-alias-component-icon-color-disabled)
);--spectrum-clearbutton-fill-background-color-disabled:var(
--spectrum-clearbutton-l-fill-background-color-disabled,var(--spectrum-alias-background-color-transparent)
);--spectrum-clearbutton-fill-uiicon-color:var(
--spectrum-clearbutton-l-fill-uiicon-color,var(--spectrum-alias-component-icon-color-default)
);--spectrum-clearbutton-fill-background-color:var(
--spectrum-clearbutton-l-fill-background-color,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-default
)
);--spectrum-clearbutton-fill-uiicon-color-down:var(
--spectrum-clearbutton-l-fill-uiicon-color-down,var(--spectrum-alias-component-icon-color-down)
);--spectrum-clearbutton-fill-background-color-down:var(
--spectrum-clearbutton-l-fill-background-color-down,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-down
)
);--spectrum-clearbutton-fill-background-color-hover:var(
--spectrum-clearbutton-l-fill-background-color-hover,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-hover
)
);--spectrum-clearbutton-fill-uiicon-color-key-focus:var(
--spectrum-clearbutton-l-fill-uiicon-color-key-focus,var(--spectrum-alias-component-icon-color-key-focus)
);--spectrum-clearbutton-fill-background-color-key-focus:var(
--spectrum-clearbutton-l-fill-background-color-key-focus,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-key-focus
)
);--spectrum-clearbutton-fill-size:var(
--spectrum-clearbutton-l-fill-size,var(--spectrum-alias-infieldbutton-full-height-l)
);--spectrum-clearbutton-padding:var(
--spectrum-clearbutton-l-padding,var(--spectrum-alias-infieldbutton-padding-l)
)}:host([size=xl]){--spectrum-clearbutton-fill-uiicon-color-disabled:var(
--spectrum-clearbutton-xl-fill-uiicon-color-disabled,var(--spectrum-alias-component-icon-color-disabled)
);--spectrum-clearbutton-fill-background-color-disabled:var(
--spectrum-clearbutton-xl-fill-background-color-disabled,var(--spectrum-alias-background-color-transparent)
);--spectrum-clearbutton-fill-uiicon-color:var(
--spectrum-clearbutton-xl-fill-uiicon-color,var(--spectrum-alias-component-icon-color-default)
);--spectrum-clearbutton-fill-background-color:var(
--spectrum-clearbutton-xl-fill-background-color,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-default
)
);--spectrum-clearbutton-fill-uiicon-color-down:var(
--spectrum-clearbutton-xl-fill-uiicon-color-down,var(--spectrum-alias-component-icon-color-down)
);--spectrum-clearbutton-fill-background-color-down:var(
--spectrum-clearbutton-xl-fill-background-color-down,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-down
)
);--spectrum-clearbutton-fill-background-color-hover:var(
--spectrum-clearbutton-xl-fill-background-color-hover,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-hover
)
);--spectrum-clearbutton-fill-uiicon-color-key-focus:var(
--spectrum-clearbutton-xl-fill-uiicon-color-key-focus,var(--spectrum-alias-component-icon-color-key-focus)
);--spectrum-clearbutton-fill-background-color-key-focus:var(
--spectrum-clearbutton-xl-fill-background-color-key-focus,var(
--spectrum-alias-infieldbutton-fill-loudnessLow-background-color-key-focus
)
);--spectrum-clearbutton-fill-size:var(
--spectrum-clearbutton-xl-fill-size,var(--spectrum-alias-infieldbutton-full-height-xl)
);--spectrum-clearbutton-padding:var(
--spectrum-clearbutton-xl-padding,var(--spectrum-alias-infieldbutton-padding-xl)
)}.fill{align-items:center;background-color:var(
--spectrum-clearbutton-fill-background-color
);border-radius:100%;display:flex;height:var(--spectrum-clearbutton-fill-size);justify-content:center;width:var(--spectrum-clearbutton-fill-size)}:host{color:var(
--spectrum-clearbutton-m-fill-uiicon-color,var(--spectrum-alias-component-icon-color-default)
)}:host(:hover){color:var(
--spectrum-clearbutton-fill-uiicon-color
)}:host([active]){color:var(
--spectrum-clearbutton-fill-uiicon-color-down
)}:host(.focus-visible){color:var(
--spectrum-clearbutton-fill-uiicon-color-key-focus
)}:host(:focus-visible){color:var(
--spectrum-clearbutton-fill-uiicon-color-key-focus
)}:host([disabled]),:host([disabled]){color:var(
--spectrum-clearbutton-fill-uiicon-color-disabled
)}:host(:hover) .fill{background-color:var(
--spectrum-clearbutton-fill-background-color-hover
)}:host([active]) .fill{background-color:var(
--spectrum-clearbutton-fill-background-color-down
)}:host(.focus-visible) .fill{background-color:var(
--spectrum-clearbutton-fill-background-color-key-focus
)}:host(:focus-visible) .fill{background-color:var(
--spectrum-clearbutton-fill-background-color-key-focus
)}:host([disabled]) .fill,:host([disabled]) .fill{background-color:var(
--spectrum-clearbutton-fill-background-color-disabled
)}:host([variant=overBackground]){color:var(
--spectrum-alias-icon-color-overbackground,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground]:hover){color:var(
--spectrum-alias-icon-color-overbackground,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground][active]){color:var(
--spectrum-alias-icon-color-overbackground,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground].focus-visible){color:var(
--spectrum-alias-icon-color-overbackground,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground]:focus-visible){color:var(
--spectrum-alias-icon-color-overbackground,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground][disabled]),:host([variant=overBackground][disabled]) .fill{background-color:var(
--spectrum-alias-icon-color-overbackground-disabled,hsla(0,0%,100%,.2)
)}:host([variant=overBackground]){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-primary-outline-white-texticon-border-color,var(--spectrum-global-color-static-white)
);color:var(
--spectrum-button-m-primary-outline-white-texticon-text-color,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground]:hover){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color-hover,var(--spectrum-global-color-static-transparent-white-300)
);border-color:var(
--spectrum-button-m-primary-outline-white-texticon-border-color-hover,var(--spectrum-global-color-static-white)
);color:var(
--spectrum-button-m-primary-outline-white-texticon-text-color-hover,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground].focus-visible){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color-hover,var(--spectrum-global-color-static-transparent-white-300)
);border-color:var(
--spectrum-button-m-primary-outline-white-texticon-border-color-hover,var(--spectrum-global-color-static-white)
);box-shadow:none;color:var(
--spectrum-button-m-primary-outline-white-texticon-text-color-hover,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground]:focus-visible){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color-hover,var(--spectrum-global-color-static-transparent-white-300)
);border-color:var(
--spectrum-button-m-primary-outline-white-texticon-border-color-hover,var(--spectrum-global-color-static-white)
);box-shadow:none;color:var(
--spectrum-button-m-primary-outline-white-texticon-text-color-hover,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground].focus-visible):after{box-shadow:0 0 0 var(
--spectrum-alias-focus-ring-size,var(--spectrum-global-dimension-static-size-25)
) var(
--spectrum-button-m-primary-outline-white-texticon-border-color-key-focus,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground]:focus-visible):after{box-shadow:0 0 0 var(
--spectrum-alias-focus-ring-size,var(--spectrum-global-dimension-static-size-25)
) var(
--spectrum-button-m-primary-outline-white-texticon-border-color-key-focus,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground][active]){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color-down,var(--spectrum-global-color-static-transparent-white-400)
);border-color:var(
--spectrum-button-m-primary-outline-white-texticon-border-color-down,var(--spectrum-global-color-static-white)
);color:var(
--spectrum-button-m-primary-outline-white-texticon-text-color-down,var(--spectrum-global-color-static-white)
)}:host([variant=overBackground][disabled]),:host([variant=overBackground][disabled]){background-color:var(
--spectrum-button-m-primary-outline-white-texticon-background-color-disabled,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-button-m-primary-outline-white-texticon-border-color-disabled,var(--spectrum-global-color-static-transparent-white-200)
);color:var(
--spectrum-button-m-primary-outline-white-texticon-text-color-disabled,var(--spectrum-global-color-static-transparent-white-500)
)}@media (-ms-high-contrast:none),screen and (-ms-high-contrast:active){:host>.icon{margin:0}}@media (forced-colors:active){:host{--spectrum-alias-icon-color-overbackground:ButtonText;--spectrum-alias-icon-color-overbackground-disabled:GrayText;--spectrum-button-m-primary-outline-white-texticon-background-color:ButtonFace;--spectrum-button-m-primary-outline-white-texticon-background-color-disabled:ButtonFace;--spectrum-button-m-primary-outline-white-texticon-background-color-down:ButtonFace;--spectrum-button-m-primary-outline-white-texticon-background-color-hover:ButtonFace;--spectrum-button-m-primary-outline-white-texticon-border-color:ButtonText;--spectrum-button-m-primary-outline-white-texticon-border-color-disabled:GrayText;--spectrum-button-m-primary-outline-white-texticon-border-color-down:ButtonText;--spectrum-button-m-primary-outline-white-texticon-border-color-hover:ButtonText;--spectrum-button-m-primary-outline-white-texticon-border-color-key-focus:ButtonText;--spectrum-button-m-primary-outline-white-texticon-text-color:ButtonText;--spectrum-button-m-primary-outline-white-texticon-text-color-disabled:GrayText;--spectrum-button-m-primary-outline-white-texticon-text-color-down:Highlight;--spectrum-button-m-primary-outline-white-texticon-text-color-hover:Highlight;--spectrum-clearbutton-fill-background-color:ButtonFace;--spectrum-clearbutton-fill-background-color-disabled:ButtonFace;--spectrum-clearbutton-fill-background-color-down:ButtonFace;--spectrum-clearbutton-fill-background-color-hover:ButtonFace;--spectrum-clearbutton-fill-background-color-key-focus:ButtonFace;--spectrum-clearbutton-fill-uiicon-color:ButtonText;--spectrum-clearbutton-fill-uiicon-color-disabled:GrayText;--spectrum-clearbutton-fill-uiicon-color-down:Highlight;--spectrum-clearbutton-fill-uiicon-color-key-focus:Highlight;--spectrum-clearbutton-m-fill-uiicon-color:ButtonText}:host(:hover){color:var(--spectrum-clearbutton-fill-uiicon-color-key-focus)}:host([disabled]){color:var(--spectrum-clearbutton-fill-uiicon-color-disabled)}}
`,
  Is = Ps;
var Ns = Object.defineProperty,
  js = Object.getOwnPropertyDescriptor,
  Ls = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? js(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Ns(t, e, o), o;
  };
const Fs = {
  s: () => d`
        <sp-icon-cross75
            slot="icon"
            class="icon spectrum-UIIcon-Cross75"
        ></sp-icon-cross75>
    `,
  m: () => d`
        <sp-icon-cross100
            slot="icon"
            class="icon spectrum-UIIcon-Cross100"
        ></sp-icon-cross100>
    `,
  l: () => d`
        <sp-icon-cross200
            slot="icon"
            class="icon spectrum-UIIcon-Cross200"
        ></sp-icon-cross200>
    `,
  xl: () => d`
        <sp-icon-cross300
            slot="icon"
            class="icon spectrum-UIIcon-Cross300"
        ></sp-icon-cross300>
    `,
};
class lo extends dt(or) {
  constructor() {
    super(...arguments), (this.variant = "");
  }
  static get styles() {
    return [...super.styles, Is, io];
  }
  get buttonContent() {
    return [Fs[this.size]()];
  }
  render() {
    return d`
            <div class="fill">${super.render()}</div>
        `;
  }
}
Ls([l({ reflect: !0 })], lo.prototype, "variant", 2);
const Ms = v`
:host{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;align-items:center;-webkit-appearance:button;border-style:solid;box-sizing:border-box;cursor:pointer;font-family:var(--spectrum-font-family-base);justify-content:center;line-height:var(--spectrum-line-height-small);margin:0;overflow:visible;text-decoration:none;text-transform:none;transition:background var(--spectrum-animation-duration-100) ease-out,border-color var(--spectrum-animation-duration-100) ease-out,color var(--spectrum-animation-duration-100) ease-out,box-shadow var(--spectrum-animation-duration-100) ease-out;user-select:none;-webkit-user-select:none;vertical-align:top}:host(:focus){outline:none}:host(::-moz-focus-inner){border:0;border-style:none;margin-block-end:-2px;margin-block-start:-2px;padding:0}:host([disabled]){cursor:default}::slotted([slot=icon]){max-block-size:100%}#label{align-self:center;justify-self:center;text-align:center}#label:empty{display:none}:host{--spectrum-actionbutton-animation-duration:var(
--spectrum-animation-duration-100
);--spectrum-actionbutton-border-radius:var(--spectrum-corner-radius-100);--spectrum-actionbutton-border-width:var(--spectrum-border-width-100);--spectrum-actionbutton-focus-indicator-gap:var(
--spectrum-focus-indicator-gap
);--spectrum-actionbutton-focus-indicator-thickness:var(
--spectrum-focus-indicator-thickness
);--spectrum-actionbutton-focus-indicator-color:var(
--spectrum-focus-indicator-color
);--spectrum-actionbutton-focus-indicator-border-radius:calc(var(--spectrum-actionbutton-border-radius) + var(--spectrum-actionbutton-focus-indicator-gap))}:host([size=xs]){--spectrum-actionbutton-min-width:calc(var(--spectrum-component-edge-to-visual-only-75)*2 + var(--spectrum-workflow-icon-size-75));--spectrum-actionbutton-height:var(--spectrum-component-height-50);--spectrum-actionbutton-icon-size:var(--spectrum-workflow-icon-size-50);--spectrum-actionbutton-font-size:var(--spectrum-font-size-50);--spectrum-actionbutton-text-to-visual:var(--spectrum-text-to-visual-50);--spectrum-actionbutton-edge-to-hold-icon:var(
--spectrum-action-button-edge-to-hold-icon-extra-small
);--spectrum-actionbutton-edge-to-visual:calc(var(--spectrum-component-edge-to-visual-50) - var(--spectrum-actionbutton-border-width));--spectrum-actionbutton-edge-to-text:calc(var(--spectrum-component-edge-to-text-50) - var(--spectrum-actionbutton-border-width));--spectrum-actionbutton-edge-to-visual-only:calc(var(--spectrum-component-edge-to-visual-only-50) - var(--spectrum-actionbutton-border-width))}:host([size=s]){--spectrum-actionbutton-min-width:calc(var(--spectrum-component-edge-to-visual-only-75)*2 + var(--spectrum-workflow-icon-size-75));--spectrum-actionbutton-height:var(--spectrum-component-height-75);--spectrum-actionbutton-icon-size:var(--spectrum-workflow-icon-size-75);--spectrum-actionbutton-font-size:var(--spectrum-font-size-75);--spectrum-actionbutton-text-to-visual:var(--spectrum-text-to-visual-75);--spectrum-actionbutton-edge-to-hold-icon:var(
--spectrum-action-button-edge-to-hold-icon-small
);--spectrum-actionbutton-edge-to-visual:calc(var(--spectrum-component-edge-to-visual-75) - var(--spectrum-actionbutton-border-width));--spectrum-actionbutton-edge-to-text:calc(var(--spectrum-component-edge-to-text-75) - var(--spectrum-actionbutton-border-width));--spectrum-actionbutton-edge-to-visual-only:calc(var(--spectrum-component-edge-to-visual-only-75) - var(--spectrum-actionbutton-border-width))}:host([size=m]){--spectrum-actionbutton-min-width:calc(var(--spectrum-component-edge-to-visual-only-100)*2 + var(--spectrum-workflow-icon-size-100));--spectrum-actionbutton-height:var(--spectrum-component-height-100);--spectrum-actionbutton-icon-size:var(--spectrum-workflow-icon-size-100);--spectrum-actionbutton-font-size:var(--spectrum-font-size-100);--spectrum-actionbutton-text-to-visual:var(--spectrum-text-to-visual-100);--spectrum-actionbutton-edge-to-hold-icon:var(
--spectrum-action-button-edge-to-hold-icon-medium
);--spectrum-actionbutton-edge-to-visual:calc(var(--spectrum-component-edge-to-visual-100) - var(--spectrum-actionbutton-border-width));--spectrum-actionbutton-edge-to-text:calc(var(--spectrum-component-edge-to-text-100) - var(--spectrum-actionbutton-border-width));--spectrum-actionbutton-edge-to-visual-only:calc(var(--spectrum-component-edge-to-visual-only-100) - var(--spectrum-actionbutton-border-width))}:host([size=l]){--spectrum-actionbutton-min-width:calc(var(--spectrum-component-edge-to-visual-only-200)*2 + var(--spectrum-workflow-icon-size-200));--spectrum-actionbutton-height:var(--spectrum-component-height-200);--spectrum-actionbutton-icon-size:var(--spectrum-workflow-icon-size-200);--spectrum-actionbutton-font-size:var(--spectrum-font-size-200);--spectrum-actionbutton-text-to-visual:var(--spectrum-text-to-visual-200);--spectrum-actionbutton-edge-to-hold-icon:var(
--spectrum-action-button-edge-to-hold-icon-large
);--spectrum-actionbutton-edge-to-visual:calc(var(--spectrum-component-edge-to-visual-200) - var(--spectrum-actionbutton-border-width));--spectrum-actionbutton-edge-to-text:calc(var(--spectrum-component-edge-to-text-200) - var(--spectrum-actionbutton-border-width));--spectrum-actionbutton-edge-to-visual-only:calc(var(--spectrum-component-edge-to-visual-only-200) - var(--spectrum-actionbutton-border-width))}:host([size=xl]){--spectrum-actionbutton-min-width:calc(var(--spectrum-component-edge-to-visual-only-300)*2 + var(--spectrum-workflow-icon-size-300));--spectrum-actionbutton-height:var(--spectrum-component-height-300);--spectrum-actionbutton-icon-size:var(--spectrum-workflow-icon-size-300);--spectrum-actionbutton-font-size:var(--spectrum-font-size-300);--spectrum-actionbutton-text-to-visual:var(--spectrum-text-to-visual-300);--spectrum-actionbutton-edge-to-hold-icon:var(
--spectrum-action-button-edge-to-hold-icon-extra-large
);--spectrum-actionbutton-edge-to-visual:calc(var(--spectrum-component-edge-to-visual-300) - var(--spectrum-actionbutton-border-width));--spectrum-actionbutton-edge-to-text:calc(var(--spectrum-component-edge-to-text-300) - var(--spectrum-actionbutton-border-width));--spectrum-actionbutton-edge-to-visual-only:calc(var(--spectrum-component-edge-to-visual-only-300) - var(--spectrum-actionbutton-border-width))}@media (forced-colors:active){:host{--highcontrast-actionbutton-focus-indicator-color:ButtonText}:host:after{forced-color-adjust:none}:host([selected]){--highcontrast-actionbutton-background-color-default:Highlight;--highcontrast-actionbutton-background-color-hover:Highlight;--highcontrast-actionbutton-background-color-focus:Highlight;--highcontrast-actionbutton-background-color-down:Highlight;--highcontrast-actionbutton-background-color-disabled:ButtonFace;--highcontrast-actionbutton-border-color-default:HighlightText;--highcontrast-actionbutton-border-color-hover:HighlightText;--highcontrast-actionbutton-border-color-focus:HighlightText;--highcontrast-actionbutton-border-color-down:HighlightText;--highcontrast-actionbutton-border-color-disabled:GrayText;--highcontrast-actionbutton-content-color-default:HighlightText;--highcontrast-actionbutton-content-color-hover:HighlightText;--highcontrast-actionbutton-content-color-focus:HighlightText;--highcontrast-actionbutton-content-color-down:HighlightText;--highcontrast-actionbutton-content-color-disabled:GrayText}:host([selected]) #label,:host([selected]) .hold-affordance,:host([selected]) ::slotted([slot=icon]){forced-color-adjust:none}}:host{background-color:var(
--highcontrast-actionbutton-background-color-default,var(
--mod-actionbutton-background-color-default,var(--spectrum-actionbutton-background-color-default)
)
);border-color:var(
--highcontrast-actionbutton-border-color-default,var(
--mod-actionbutton-border-color-default,var(--spectrum-actionbutton-border-color-default)
)
);border-radius:var(
--mod-actionbutton-border-radius,var(--spectrum-actionbutton-border-radius)
);border-width:var(
--mod-actionbutton-border-width,var(--spectrum-actionbutton-border-width)
);color:var(
--highcontrast-actionbutton-content-color-default,var(
--mod-actionbutton-content-color-default,var(--spectrum-actionbutton-content-color-default)
)
);height:var(--mod-actionbutton-height,var(--spectrum-actionbutton-height));min-inline-size:var(
--mod-actionbutton-min-width,var(--spectrum-actionbutton-min-width)
);padding-inline-end:var(
--mod-actionbutton-edge-to-text,var(--spectrum-actionbutton-edge-to-text)
);padding-inline-start:var(
--mod-actionbutton-edge-to-text,var(--spectrum-actionbutton-edge-to-text)
);position:relative}:host(:hover){background-color:var(
--highcontrast-actionbutton-background-color-hover,var(
--mod-actionbutton-background-color-hover,var(--spectrum-actionbutton-background-color-hover)
)
);border-color:var(
--highcontrast-actionbutton-border-color-hover,var(
--mod-actionbutton-border-color-hover,var(--spectrum-actionbutton-border-color-hover)
)
);color:var(
--highcontrast-actionbutton-content-color-hover,var(
--mod-actionbutton-content-color-hover,var(--spectrum-actionbutton-content-color-hover)
)
)}:host(.focus-visible){background-color:var(
--highcontrast-actionbutton-background-color-focus,var(
--mod-actionbutton-background-color-focus,var(--spectrum-actionbutton-background-color-focus)
)
);border-color:var(
--highcontrast-actionbutton-border-color-focus,var(
--mod-actionbutton-border-color-focus,var(--spectrum-actionbutton-border-color-focus)
)
);color:var(
--highcontrast-actionbutton-content-color-focus,var(
--mod-actionbutton-content-color-focus,var(--spectrum-actionbutton-content-color-focus)
)
)}:host(:focus-visible){background-color:var(
--highcontrast-actionbutton-background-color-focus,var(
--mod-actionbutton-background-color-focus,var(--spectrum-actionbutton-background-color-focus)
)
);border-color:var(
--highcontrast-actionbutton-border-color-focus,var(
--mod-actionbutton-border-color-focus,var(--spectrum-actionbutton-border-color-focus)
)
);color:var(
--highcontrast-actionbutton-content-color-focus,var(
--mod-actionbutton-content-color-focus,var(--spectrum-actionbutton-content-color-focus)
)
)}:host([active]){background-color:var(
--highcontrast-actionbutton-background-color-down,var(
--mod-actionbutton-background-color-down,var(--spectrum-actionbutton-background-color-down)
)
);border-color:var(
--highcontrast-actionbutton-border-color-down,var(
--mod-actionbutton-border-color-down,var(--spectrum-actionbutton-border-color-down)
)
);color:var(
--highcontrast-actionbutton-content-color-down,var(
--mod-actionbutton-content-color-down,var(--spectrum-actionbutton-content-color-down)
)
)}:host([disabled]),:host([disabled]){background-color:var(
--highcontrast-actionbutton-background-color-disabled,var(
--mod-actionbutton-background-color-disabled,var(--spectrum-actionbutton-background-color-disabled)
)
);border-color:var(
--highcontrast-actionbutton-border-color-disabled,var(
--mod-actionbutton-border-color-disabled,var(--spectrum-actionbutton-border-color-disabled)
)
);color:var(
--highcontrast-actionbutton-content-color-disabled,var(
--mod-actionbutton-content-color-disabled,var(--spectrum-actionbutton-content-color-disabled)
)
)}::slotted([slot=icon]){color:inherit;height:var(
--mod-actionbutton-icon-size,var(--spectrum-actionbutton-icon-size)
);margin-inline-start:calc((var(
--mod-actionbutton-edge-to-text,
var(--spectrum-actionbutton-edge-to-text)
) - var(
--mod-actionbutton-edge-to-visual,
var(--spectrum-actionbutton-edge-to-visual)
))*-1);padding-inline-start:calc((var(
--mod-actionbutton-edge-to-text,
var(--spectrum-actionbutton-edge-to-text)
) - var(
--mod-actionbutton-edge-to-visual,
var(--spectrum-actionbutton-edge-to-visual)
))*-1);width:var(
--mod-actionbutton-icon-size,var(--spectrum-actionbutton-icon-size)
)}slot[name=icon]+#label{padding-inline-end:0;padding-inline-start:var(
--mod-actionbutton-text-to-visual,var(--spectrum-actionbutton-text-to-visual)
)}.hold-affordance+::slotted([slot=icon]),slot[icon-only]::slotted([slot=icon]){margin-inline-end:calc((var(
--mod-actionbutton-edge-to-text,
var(--spectrum-actionbutton-edge-to-text)
) - var(
--mod-actionbutton-edge-to-visual-only,
var(--spectrum-actionbutton-edge-to-visual-only)
))*-1);margin-inline-start:calc((var(
--mod-actionbutton-edge-to-text,
var(--spectrum-actionbutton-edge-to-text)
) - var(
--mod-actionbutton-edge-to-visual-only,
var(--spectrum-actionbutton-edge-to-visual-only)
))*-1)}#label{color:inherit;font-size:var(
--mod-actionbutton-font-size,var(--spectrum-actionbutton-font-size)
);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}[dir=rtl] .hold-affordance{transform:matrix(-1,0,0,1,0,0)}.hold-affordance{color:inherit;inset-block-end:calc(var(
--mod-actionbutton-edge-to-hold-icon,
var(--spectrum-actionbutton-edge-to-hold-icon)
) - var(
--mod-actionbutton-border-width,
var(--spectrum-actionbutton-border-width)
));inset-inline-end:calc(var(
--mod-actionbutton-edge-to-hold-icon,
var(--spectrum-actionbutton-edge-to-hold-icon)
) - var(
--mod-actionbutton-border-width,
var(--spectrum-actionbutton-border-width)
));position:absolute}:host{transition:border-color var(
--mod-actionbutton-animation-duration,var(--spectrum-actionbutton-animation-duration)
) ease-in-out}:host:after{border-radius:var(
--mod-actionbutton-focus-indicator-border-radius,var(--spectrum-actionbutton-focus-indicator-border-radius)
);content:"";inset:0;margin:calc((var(
--mod-actionbutton-focus-indicator-gap,
var(--spectrum-actionbutton-focus-indicator-gap)
) + var(
--mod-actionbutton-border-width,
var(--spectrum-actionbutton-border-width)
))*-1);pointer-events:none;position:absolute;transition:box-shadow var(
--mod-actionbutton-animation-duration,var(--spectrum-actionbutton-animation-duration)
) ease-in-out}:host(.focus-visible){box-shadow:none}:host(:focus-visible){box-shadow:none}:host(.focus-visible):after{box-shadow:0 0 0 var(
--mod-actionbutton-focus-indicator-thickness,var(--spectrum-actionbutton-focus-indicator-thickness)
) var(
--highcontrast-actionbutton-focus-indicator-color,var(
--mod-actionbutton-focus-indicator-color,var(--spectrum-actionbutton-focus-indicator-color)
)
)}:host(:focus-visible):after{box-shadow:0 0 0 var(
--mod-actionbutton-focus-indicator-thickness,var(--spectrum-actionbutton-focus-indicator-thickness)
) var(
--highcontrast-actionbutton-focus-indicator-color,var(
--mod-actionbutton-focus-indicator-color,var(--spectrum-actionbutton-focus-indicator-color)
)
)}:host{--spectrum-actionbutton-background-color-default:var(
--system-spectrum-actionbutton-background-color-default
);--spectrum-actionbutton-background-color-hover:var(
--system-spectrum-actionbutton-background-color-hover
);--spectrum-actionbutton-background-color-down:var(
--system-spectrum-actionbutton-background-color-down
);--spectrum-actionbutton-background-color-focus:var(
--system-spectrum-actionbutton-background-color-focus
);--spectrum-actionbutton-border-color-default:var(
--system-spectrum-actionbutton-border-color-default
);--spectrum-actionbutton-border-color-hover:var(
--system-spectrum-actionbutton-border-color-hover
);--spectrum-actionbutton-border-color-down:var(
--system-spectrum-actionbutton-border-color-down
);--spectrum-actionbutton-border-color-focus:var(
--system-spectrum-actionbutton-border-color-focus
);--spectrum-actionbutton-content-color-default:var(
--system-spectrum-actionbutton-content-color-default
);--spectrum-actionbutton-content-color-hover:var(
--system-spectrum-actionbutton-content-color-hover
);--spectrum-actionbutton-content-color-down:var(
--system-spectrum-actionbutton-content-color-down
);--spectrum-actionbutton-content-color-focus:var(
--system-spectrum-actionbutton-content-color-focus
);--spectrum-actionbutton-background-color-disabled:var(
--system-spectrum-actionbutton-background-color-disabled
);--spectrum-actionbutton-border-color-disabled:var(
--system-spectrum-actionbutton-border-color-disabled
);--spectrum-actionbutton-content-color-disabled:var(
--system-spectrum-actionbutton-content-color-disabled
)}:host([quiet]){--spectrum-actionbutton-background-color-default:var(
--system-spectrum-actionbutton-quiet-background-color-default
);--spectrum-actionbutton-background-color-hover:var(
--system-spectrum-actionbutton-quiet-background-color-hover
);--spectrum-actionbutton-background-color-down:var(
--system-spectrum-actionbutton-quiet-background-color-down
);--spectrum-actionbutton-background-color-focus:var(
--system-spectrum-actionbutton-quiet-background-color-focus
);--spectrum-actionbutton-border-color-default:var(
--system-spectrum-actionbutton-quiet-border-color-default
);--spectrum-actionbutton-border-color-hover:var(
--system-spectrum-actionbutton-quiet-border-color-hover
);--spectrum-actionbutton-border-color-down:var(
--system-spectrum-actionbutton-quiet-border-color-down
);--spectrum-actionbutton-border-color-focus:var(
--system-spectrum-actionbutton-quiet-border-color-focus
);--spectrum-actionbutton-background-color-disabled:var(
--system-spectrum-actionbutton-quiet-background-color-disabled
);--spectrum-actionbutton-border-color-disabled:var(
--system-spectrum-actionbutton-quiet-border-color-disabled
)}:host([selected]){--spectrum-actionbutton-background-color-default:var(
--system-spectrum-actionbutton-selected-background-color-default
);--spectrum-actionbutton-background-color-hover:var(
--system-spectrum-actionbutton-selected-background-color-hover
);--spectrum-actionbutton-background-color-down:var(
--system-spectrum-actionbutton-selected-background-color-down
);--spectrum-actionbutton-background-color-focus:var(
--system-spectrum-actionbutton-selected-background-color-focus
);--spectrum-actionbutton-border-color-default:var(
--system-spectrum-actionbutton-selected-border-color-default
);--spectrum-actionbutton-border-color-hover:var(
--system-spectrum-actionbutton-selected-border-color-hover
);--spectrum-actionbutton-border-color-down:var(
--system-spectrum-actionbutton-selected-border-color-down
);--spectrum-actionbutton-border-color-focus:var(
--system-spectrum-actionbutton-selected-border-color-focus
);--spectrum-actionbutton-content-color-default:var(
--system-spectrum-actionbutton-selected-content-color-default
);--spectrum-actionbutton-content-color-hover:var(
--system-spectrum-actionbutton-selected-content-color-hover
);--spectrum-actionbutton-content-color-down:var(
--system-spectrum-actionbutton-selected-content-color-down
);--spectrum-actionbutton-content-color-focus:var(
--system-spectrum-actionbutton-selected-content-color-focus
);--spectrum-actionbutton-background-color-disabled:var(
--system-spectrum-actionbutton-selected-background-color-disabled
);--spectrum-actionbutton-border-color-disabled:var(
--system-spectrum-actionbutton-selected-border-color-disabled
)}:host([selected][emphasized]){--spectrum-actionbutton-background-color-default:var(
--system-spectrum-actionbutton-selected-emphasized-background-color-default
);--spectrum-actionbutton-background-color-hover:var(
--system-spectrum-actionbutton-selected-emphasized-background-color-hover
);--spectrum-actionbutton-background-color-down:var(
--system-spectrum-actionbutton-selected-emphasized-background-color-down
);--spectrum-actionbutton-background-color-focus:var(
--system-spectrum-actionbutton-selected-emphasized-background-color-focus
)}:host([variant=black][quiet]){--spectrum-actionbutton-border-color-default:var(
--system-spectrum-actionbutton-staticblack-quiet-border-color-default
);--spectrum-actionbutton-border-color-hover:var(
--system-spectrum-actionbutton-staticblack-quiet-border-color-hover
);--spectrum-actionbutton-border-color-down:var(
--system-spectrum-actionbutton-staticblack-quiet-border-color-down
);--spectrum-actionbutton-border-color-focus:var(
--system-spectrum-actionbutton-staticblack-quiet-border-color-focus
);--spectrum-actionbutton-border-color-disabled:var(
--system-spectrum-actionbutton-staticblack-quiet-border-color-disabled
)}:host([variant=white][quiet]){--spectrum-actionbutton-border-color-default:var(
--system-spectrum-actionbutton-staticwhite-quiet-border-color-default
);--spectrum-actionbutton-border-color-hover:var(
--system-spectrum-actionbutton-staticwhite-quiet-border-color-hover
);--spectrum-actionbutton-border-color-down:var(
--system-spectrum-actionbutton-staticwhite-quiet-border-color-down
);--spectrum-actionbutton-border-color-focus:var(
--system-spectrum-actionbutton-staticwhite-quiet-border-color-focus
);--spectrum-actionbutton-border-color-disabled:var(
--system-spectrum-actionbutton-staticwhite-quiet-border-color-disabled
)}:host([variant=black]){--spectrum-actionbutton-background-color-default:var(
--system-spectrum-actionbutton-staticblack-background-color-default
);--spectrum-actionbutton-background-color-hover:var(
--system-spectrum-actionbutton-staticblack-background-color-hover
);--spectrum-actionbutton-background-color-down:var(
--system-spectrum-actionbutton-staticblack-background-color-down
);--spectrum-actionbutton-background-color-focus:var(
--system-spectrum-actionbutton-staticblack-background-color-focus
);--spectrum-actionbutton-border-color-default:var(
--system-spectrum-actionbutton-staticblack-border-color-default
);--spectrum-actionbutton-border-color-hover:var(
--system-spectrum-actionbutton-staticblack-border-color-hover
);--spectrum-actionbutton-border-color-down:var(
--system-spectrum-actionbutton-staticblack-border-color-down
);--spectrum-actionbutton-border-color-focus:var(
--system-spectrum-actionbutton-staticblack-border-color-focus
);--spectrum-actionbutton-content-color-default:var(
--system-spectrum-actionbutton-staticblack-content-color-default
);--spectrum-actionbutton-content-color-hover:var(
--system-spectrum-actionbutton-staticblack-content-color-hover
);--spectrum-actionbutton-content-color-down:var(
--system-spectrum-actionbutton-staticblack-content-color-down
);--spectrum-actionbutton-content-color-focus:var(
--system-spectrum-actionbutton-staticblack-content-color-focus
);--spectrum-actionbutton-focus-indicator-color:var(
--system-spectrum-actionbutton-staticblack-focus-indicator-color
);--spectrum-actionbutton-background-color-disabled:var(
--system-spectrum-actionbutton-staticblack-background-color-disabled
);--spectrum-actionbutton-border-color-disabled:var(
--system-spectrum-actionbutton-staticblack-border-color-disabled
);--spectrum-actionbutton-content-color-disabled:var(
--system-spectrum-actionbutton-staticblack-content-color-disabled
)}:host([variant=black][selected]){--spectrum-actionbutton-background-color-default:var(
--system-spectrum-actionbutton-staticblack-selected-background-color-default
);--spectrum-actionbutton-background-color-hover:var(
--system-spectrum-actionbutton-staticblack-selected-background-color-hover
);--spectrum-actionbutton-background-color-down:var(
--system-spectrum-actionbutton-staticblack-selected-background-color-down
);--spectrum-actionbutton-background-color-focus:var(
--system-spectrum-actionbutton-staticblack-selected-background-color-focus
);--spectrum-actionbutton-border-color-disabled:var(
--system-spectrum-actionbutton-staticblack-selected-border-color-disabled
);--spectrum-actionbutton-content-color-default:var(
--mod-actionbutton-static-content-color,var(
--system-spectrum-actionbutton-staticblack-selected-content-color-default
)
);--spectrum-actionbutton-content-color-hover:var(
--mod-actionbutton-static-content-color,var(
--system-spectrum-actionbutton-staticblack-selected-content-color-hover
)
);--spectrum-actionbutton-content-color-down:var(
--mod-actionbutton-static-content-color,var(
--system-spectrum-actionbutton-staticblack-selected-content-color-down
)
);--spectrum-actionbutton-content-color-focus:var(
--mod-actionbutton-static-content-color,var(
--system-spectrum-actionbutton-staticblack-selected-content-color-focus
)
);--spectrum-actionbutton-background-color-disabled:var(
--system-spectrum-actionbutton-staticblack-selected-background-color-disabled
)}:host([variant=white]){--spectrum-actionbutton-background-color-default:var(
--system-spectrum-actionbutton-staticwhite-background-color-default
);--spectrum-actionbutton-background-color-hover:var(
--system-spectrum-actionbutton-staticwhite-background-color-hover
);--spectrum-actionbutton-background-color-down:var(
--system-spectrum-actionbutton-staticwhite-background-color-down
);--spectrum-actionbutton-background-color-focus:var(
--system-spectrum-actionbutton-staticwhite-background-color-focus
);--spectrum-actionbutton-border-color-default:var(
--system-spectrum-actionbutton-staticwhite-border-color-default
);--spectrum-actionbutton-border-color-hover:var(
--system-spectrum-actionbutton-staticwhite-border-color-hover
);--spectrum-actionbutton-border-color-down:var(
--system-spectrum-actionbutton-staticwhite-border-color-down
);--spectrum-actionbutton-border-color-focus:var(
--system-spectrum-actionbutton-staticwhite-border-color-focus
);--spectrum-actionbutton-content-color-default:var(
--system-spectrum-actionbutton-staticwhite-content-color-default
);--spectrum-actionbutton-content-color-hover:var(
--system-spectrum-actionbutton-staticwhite-content-color-hover
);--spectrum-actionbutton-content-color-down:var(
--system-spectrum-actionbutton-staticwhite-content-color-down
);--spectrum-actionbutton-content-color-focus:var(
--system-spectrum-actionbutton-staticwhite-content-color-focus
);--spectrum-actionbutton-focus-indicator-color:var(
--system-spectrum-actionbutton-staticwhite-focus-indicator-color
);--spectrum-actionbutton-background-color-disabled:var(
--system-spectrum-actionbutton-staticwhite-background-color-disabled
);--spectrum-actionbutton-border-color-disabled:var(
--system-spectrum-actionbutton-staticwhite-border-color-disabled
);--spectrum-actionbutton-content-color-disabled:var(
--system-spectrum-actionbutton-staticwhite-content-color-disabled
)}:host([variant=white][selected]){--spectrum-actionbutton-background-color-default:var(
--system-spectrum-actionbutton-staticwhite-selected-background-color-default
);--spectrum-actionbutton-background-color-hover:var(
--system-spectrum-actionbutton-staticwhite-selected-background-color-hover
);--spectrum-actionbutton-background-color-down:var(
--system-spectrum-actionbutton-staticwhite-selected-background-color-down
);--spectrum-actionbutton-background-color-focus:var(
--system-spectrum-actionbutton-staticwhite-selected-background-color-focus
);--spectrum-actionbutton-content-color-default:var(
--mod-actionbutton-static-content-color,var(
--system-spectrum-actionbutton-staticwhite-selected-content-color-default
)
);--spectrum-actionbutton-content-color-hover:var(
--mod-actionbutton-static-content-color,var(
--system-spectrum-actionbutton-staticwhite-selected-content-color-hover
)
);--spectrum-actionbutton-content-color-down:var(
--mod-actionbutton-static-content-color,var(
--system-spectrum-actionbutton-staticwhite-selected-content-color-down
)
);--spectrum-actionbutton-content-color-focus:var(
--mod-actionbutton-static-content-color,var(
--system-spectrum-actionbutton-staticwhite-selected-content-color-focus
)
);--spectrum-actionbutton-background-color-disabled:var(
--system-spectrum-actionbutton-staticwhite-selected-background-color-disabled
);--spectrum-actionbutton-border-color-disabled:var(
--system-spectrum-actionbutton-staticwhite-selected-border-color-disabled
)}:host{display:inline-flex;flex-direction:row}:host([disabled]){cursor:auto;pointer-events:none}:host([dir]){-webkit-appearance:none}::slotted([slot=icon]){flex-shrink:0}#button{inset:0;position:absolute}#label{flex-grow:var(--spectrum-actionbutton-label-flex-grow);text-align:var(--spectrum-actionbutton-label-text-align)}:host([size=xs]){--spectrum-icon-tshirt-size-height:var(
--spectrum-alias-workflow-icon-size-xs
);--spectrum-icon-tshirt-size-width:var(
--spectrum-alias-workflow-icon-size-xs
);--spectrum-ui-icon-tshirt-size-height:var(
--spectrum-alias-ui-icon-cornertriangle-size-75
);--spectrum-ui-icon-tshirt-size-width:var(
--spectrum-alias-ui-icon-cornertriangle-size-75
);min-width:var(--spectrum-actionbutton-height,0)}:host([size=s]){--spectrum-icon-tshirt-size-height:var(
--spectrum-alias-workflow-icon-size-s
);--spectrum-icon-tshirt-size-width:var(
--spectrum-alias-workflow-icon-size-s
);--spectrum-ui-icon-tshirt-size-height:var(
--spectrum-alias-ui-icon-cornertriangle-size-75
);--spectrum-ui-icon-tshirt-size-width:var(
--spectrum-alias-ui-icon-cornertriangle-size-75
)}:host([size=m]){--spectrum-icon-tshirt-size-height:var(
--spectrum-alias-workflow-icon-size-m
);--spectrum-icon-tshirt-size-width:var(
--spectrum-alias-workflow-icon-size-m
);--spectrum-ui-icon-tshirt-size-height:var(
--spectrum-alias-ui-icon-cornertriangle-size-100
);--spectrum-ui-icon-tshirt-size-width:var(
--spectrum-alias-ui-icon-cornertriangle-size-100
)}:host([size=l]){--spectrum-icon-tshirt-size-height:var(
--spectrum-alias-workflow-icon-size-l
);--spectrum-icon-tshirt-size-width:var(
--spectrum-alias-workflow-icon-size-l
);--spectrum-ui-icon-tshirt-size-height:var(
--spectrum-alias-ui-icon-cornertriangle-size-200
);--spectrum-ui-icon-tshirt-size-width:var(
--spectrum-alias-ui-icon-cornertriangle-size-200
)}:host([size=xl]){--spectrum-icon-tshirt-size-height:var(
--spectrum-alias-workflow-icon-size-xl
);--spectrum-icon-tshirt-size-width:var(
--spectrum-alias-workflow-icon-size-xl
);--spectrum-ui-icon-tshirt-size-height:var(
--spectrum-alias-ui-icon-cornertriangle-size-300
);--spectrum-ui-icon-tshirt-size-width:var(
--spectrum-alias-ui-icon-cornertriangle-size-300
)}@media (forced-colors:active){:host{--highcontrast-actionbutton-border-color-disabled:GrayText;--highcontrast-actionbutton-content-color-disabled:GrayText}}
`,
  Ds = Ms,
  qs = v`
@media (forced-colors:active){.spectrum-Icon,.spectrum-UIIcon{forced-color-adjust:auto}}.spectrum-UIIcon-CornerTriangle75{height:var(
--spectrum-alias-ui-icon-cornertriangle-size-75,var(--spectrum-global-dimension-size-65)
);width:var(
--spectrum-alias-ui-icon-cornertriangle-size-75,var(--spectrum-global-dimension-size-65)
)}.spectrum-UIIcon-CornerTriangle100{height:var(--spectrum-alias-ui-icon-cornertriangle-size-100);width:var(
--spectrum-alias-ui-icon-cornertriangle-size-100
)}.spectrum-UIIcon-CornerTriangle200{height:var(
--spectrum-alias-ui-icon-cornertriangle-size-200,var(--spectrum-global-dimension-size-75)
);width:var(
--spectrum-alias-ui-icon-cornertriangle-size-200,var(--spectrum-global-dimension-size-75)
)}.spectrum-UIIcon-CornerTriangle300{height:var(--spectrum-alias-ui-icon-cornertriangle-size-300);width:var(
--spectrum-alias-ui-icon-cornertriangle-size-300
)}
`,
  Bs = qs,
  Hs = () => pt`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 7 7"
    aria-hidden="true"
    fill="currentColor"
  >
    <path
      d="M6.683.67a.315.315 0 00-.223.093l-5.7 5.7a.316.316 0 00.224.54h5.7A.316.316 0 007 6.687V.986A.316.316 0 006.684.67z"
    />
  </svg>`;
class Us extends q {
  render() {
    return mt(d), Hs();
  }
}
customElements.define("sp-icon-corner-triangle300", Us);
var Rs = Object.defineProperty,
  Gs = Object.getOwnPropertyDescriptor,
  Z = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Gs(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Rs(t, e, o), o;
  };
const Ks = {
    xs: "spectrum-UIIcon-CornerTriangle75",
    s: "spectrum-UIIcon-CornerTriangle75",
    m: "spectrum-UIIcon-CornerTriangle100",
    l: "spectrum-UIIcon-CornerTriangle200",
    xl: "spectrum-UIIcon-CornerTriangle300",
  },
  Vs = 300;
let Tr;
class Y extends dt(Ht, { validSizes: ["xs", "s", "m", "l", "xl"] }) {
  constructor() {
    super(),
      (this.emphasized = !1),
      (this.holdAffordance = !1),
      (this.quiet = !1),
      (this.role = "button"),
      (this.selected = !1),
      (this.toggles = !1),
      (this._value = ""),
      (this.onClick = () => {
        this.toggles &&
          ((this.selected = !this.selected),
          this.dispatchEvent(new Event("change", { cancelable: !0 })) ||
            (this.selected = !this.selected));
      }),
      this.addEventListener("click", this.onClick),
      this.addEventListener("pointerdown", this.onPointerdown);
  }
  static get styles() {
    return [Ds, Bs];
  }
  get value() {
    return this._value || this.itemText;
  }
  set value(t) {
    t !== this._value &&
      ((this._value = t || ""),
      this._value
        ? this.setAttribute("value", this._value)
        : this.removeAttribute("value"));
  }
  get itemText() {
    return (this.textContent || "").trim();
  }
  onPointerdown(t) {
    t.button === 0 &&
      (this.addEventListener("pointerup", this.onPointerup),
      this.addEventListener("pointercancel", this.onPointerup),
      (Tr = setTimeout(() => {
        this.dispatchEvent(
          new CustomEvent("longpress", {
            bubbles: !0,
            composed: !0,
            detail: { source: "pointer" },
          }),
        );
      }, Vs)));
  }
  onPointerup() {
    clearTimeout(Tr),
      this.removeEventListener("pointerup", this.onPointerup),
      this.removeEventListener("pointercancel", this.onPointerup);
  }
  handleKeydown(t) {
    if (!this.holdAffordance) return super.handleKeydown(t);
    const { code: e, altKey: r } = t;
    (e === "Space" || (r && e === "ArrowDown")) &&
      (t.preventDefault(),
      e === "ArrowDown" && (t.stopPropagation(), t.stopImmediatePropagation()),
      this.addEventListener("keyup", this.handleKeyup),
      (this.active = !0));
  }
  handleKeyup(t) {
    if (!this.holdAffordance) return super.handleKeyup(t);
    const { code: e, altKey: r } = t;
    (e === "Space" || (r && e === "ArrowDown")) &&
      (t.stopPropagation(),
      this.dispatchEvent(
        new CustomEvent("longpress", {
          bubbles: !0,
          composed: !0,
          detail: { source: "keyboard" },
        }),
      ),
      (this.active = !1));
  }
  get buttonContent() {
    const t = super.buttonContent;
    return (
      this.holdAffordance &&
        t.unshift(d`
                <sp-icon-corner-triangle300
                    class="hold-affordance ${Ks[this.size]}"
                ></sp-icon-corner-triangle300>
            `),
      t
    );
  }
  updated(t) {
    super.updated(t);
    const e = this.role === "button" && (this.selected || this.toggles);
    (t.has("selected") || t.has("role")) &&
      (e
        ? this.setAttribute("aria-pressed", this.selected ? "true" : "false")
        : this.removeAttribute("aria-pressed"));
  }
}
Z([l({ type: Boolean, reflect: !0 })], Y.prototype, "emphasized", 2),
  Z(
    [l({ type: Boolean, reflect: !0, attribute: "hold-affordance" })],
    Y.prototype,
    "holdAffordance",
    2,
  ),
  Z([l({ type: Boolean, reflect: !0 })], Y.prototype, "quiet", 2),
  Z([l({ reflect: !0 })], Y.prototype, "role", 2),
  Z([l({ type: Boolean, reflect: !0 })], Y.prototype, "selected", 2),
  Z([l({ type: Boolean, reflect: !0 })], Y.prototype, "toggles", 2),
  Z([l({ reflect: !0 })], Y.prototype, "variant", 2),
  Z([l({ type: String })], Y.prototype, "value", 1);
customElements.define("sp-action-button", Y);
var Ys = Object.defineProperty,
  Xs = Object.getOwnPropertyDescriptor,
  G = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Xs(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Ys(t, e, o), o;
  };
class B extends j {
  constructor() {
    super(...arguments),
      (this.id = ""),
      (this.value = ""),
      (this.type = "token"),
      (this.isFaded = !1),
      (this.isIntersect = !1),
      (this.selected = !1),
      (this.selectionAncestor = !1),
      (this.selectionDescendent = !1),
      (this.hasDownstream = !1),
      (this.hoverUpstream = !1),
      (this.isValidDrag = !1),
      (this.decomposedValues = []),
      (this.rowCount = 1),
      (this.pointerOverDepth = 0),
      (this.isInteractingWithButton = !1),
      (this.fillColor = "#000000"),
      (this.textColor = "#FFFFFF");
  }
  willUpdate(t) {
    if (t.has("value")) {
      const e = this.value.split(Jr);
      e.length === 1 && e[0] === ""
        ? (this.decomposedValues = [])
        : (this.decomposedValues = e.map((r) => {
            const o = r.split(Zr);
            return [o[0], o[1] || ""];
          })),
        (this.rowCount = Math.max(this.decomposedValues.length, 1));
    }
    if (this.selected)
      (this.fillColor = "--spectrum-yellow-visual-color"),
        (this.textColor = "--spectrum-yellow-100");
    else {
      let e = "celery",
        r = 200,
        o = 900;
      this.type === "token"
        ? ((e = this.selectionDescendent ? "fuchsia" : "purple"),
          (this.isIntersect ||
            (this.selectionDescendent && this.selectionAncestor)) &&
            ((e = "orange"), (r = 600), (o = 1300)))
        : this.type === "component"
        ? ((e = "gray"), this.hasDownstream && (r = 300))
        : this.type === "orphan-category" &&
          ((e = "cyan"), this.hasDownstream && (r = 300)),
        this.isFaded && ((r -= 100), (o -= 400)),
        this.hoverUpstream && (o = Math.min(1300, o + 400)),
        (this.fillColor = `--spectrum-${e}-${r}`),
        (this.textColor = `--spectrum-${e}-${o}`);
    }
  }
  preventDefault(t) {
    return (
      t.preventDefault && t.preventDefault(),
      t.stopPropagation && t.stopPropagation(),
      t.stopImmediatePropagation && t.stopImmediatePropagation(),
      !1
    );
  }
  handlePointerDownOnIcon() {
    this.isInteractingWithButton = !0;
  }
  handlePointerUpOnIcon() {
    this.isInteractingWithButton = !1;
  }
  handlePointerDown(t) {
    var r;
    if ((this.gesture && this.gesture.active) || this.isInteractingWithButton)
      return;
    const e =
      (r = this.shadowRoot) == null
        ? void 0
        : r.getElementById("gesture-target");
    e &&
      (x(this, "node-pointerdown", { id: this.id, data: t.detail }),
      (this.gesture = new pe(t, e)),
      (t.ctrlKey || t.altKey || t.metaKey || t.shiftKey) &&
        ((this.isValidDrag = !0), this.preventDefault(t)));
  }
  handlePointerOver() {
    this.pointerOverDepth++, x(this, "node-pointerover", { id: this.id });
  }
  handlePointerOut() {
    setTimeout(() => {
      this.pointerOverDepth--,
        this.pointerOverDepth === 0 &&
          x(this, "node-pointerout", { id: this.id });
    }, 1);
  }
  handleDragMove(t) {
    !this.gesture ||
      !this.isValidDrag ||
      x(this, "node-dragmove", { id: this.id, data: t.detail });
  }
  handleDragStart(t) {
    this.gesture &&
      ((t.detail.ctrlKey ||
        t.detail.altKey ||
        t.detail.metaKey ||
        t.detail.shiftKey) &&
        (this.isValidDrag = !0),
      x(this, "node-dragstart", { id: this.id, data: t.detail }));
  }
  handleDragEnd(t) {
    this.gesture &&
      ((this.isValidDrag = !1),
      x(this, "node-dragend", { id: this.id, data: t.detail }));
  }
  handleClick(t) {
    x(this, "node-click", {
      id: this.id,
      shiftKey: t.detail.shiftKey,
      ctrlKey: t.detail.ctrlKey,
      metaKey: t.detail.metaKey,
      altKey: t.detail.altKey,
    });
  }
  handleSingleClick(t) {
    x(this, "node-singleclick", {
      id: this.id,
      shiftKey: t.detail.shiftKey,
      ctrlKey: t.detail.ctrlKey,
      metaKey: t.detail.metaKey,
      altKey: t.detail.altKey,
    });
  }
  handleDoubleClick(t) {
    x(this, "node-doubleclick", {
      id: this.id,
      shiftKey: t.detail.shiftKey,
      ctrlKey: t.detail.ctrlKey,
      metaKey: t.detail.metaKey,
      altKey: t.detail.altKey,
    });
  }
  copyToClipboard(t) {
    navigator.clipboard.writeText(this.id).then(
      () => {
        x(this, "copied-to-clipboard", { id: this.id });
      },
      () => {
        console.info("FAILED TO COPY TO CLIPBOARD");
      },
    ),
      t.preventDefault(),
      t.stopPropagation(),
      t.stopImmediatePropagation();
  }
  get valueHtml() {
    return this.decomposedValues.length === 0
      ? d``
      : d`
      <ol>${this.decomposedValues.map(
        (t) => d`<li><b>${t[1] || "*"}</b><i>${t[0]}</i></li>`,
      )}</ol>
    `;
  }
  render() {
    return d`
      <div
        class="${this.selected ? "selected" : ""} ${this.isFaded ? "faded" : ""}"
        id="gesture-target"
        @pointerdown=${this.handlePointerDown}
        @gesture-click=${this.handleClick}
        @gesture-singleclick=${this.handleSingleClick}
        @gesture-doubleclick=${this.handleDoubleClick}
        @gesture-drag-end=${this.handleDragEnd}
        @gesture-drag-start=${this.handleDragStart}
        @gesture-drag-move=${this.handleDragMove}
        @mouseout=${this.handlePointerOut}
        @mouseover=${this.handlePointerOver}
        style="background-color:var(${this.fillColor});color:var(${
      this.textColor
    });height:${this.rowCount * Me + (this.rowCount - 1) * Qr + to * 2}px;"
      >
        <h3>${this.id}</h3>
        <i
          @pointerdown=${this.handlePointerDownOnIcon}
          @pointerup=${this.handlePointerUpOnIcon}
          @click=${this.copyToClipboard}
          class="copyIcon"
          slot="icon"
          style="background-color:var(${this.textColor});"
        ></i>
        ${this.valueHtml}
      </div>
    `;
  }
}
B.styles = v`

    div {
      position: absolute;
      width: ${Je}px;
      display: flex;
      align-items: center;
      justify-content: left;
      text-align: left;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      border-radius: 3px;
    }

    h3 {
      font-size: 12px;
      padding: 0;
      margin: 0;
      text-align: left;
      padding-left: 26px;
      pointer-events: none;
    }

    ol {
      list-style: none;
      font-size: 12px;
      position: absolute;
      margin: 0;
      padding: 0;
      display: block;
      right: ${to}px;
      white-space: nowrap;
      text-align: right;
      pointer-events: none;
    }

    ol li {
      margin-bottom: ${Qr}px;
      position: relative;
      display: block;
      height: ${Me}px;
    }

    ol b,
    ol i {
      padding: 0 5px;
      height: 100%;
      position: relative;
      display: inline-block;
      line-height: ${Me}px;
      font-weight: normal;
      font-style: normal;
    }

    ol b {
      color: var(--spectrum-gray-800);
      background-color: var(--spectrum-gray-100);
      border-radius: 2px 0 0 2px;
    }

    ol i {
      color: var(--spectrum-gray-100);
      background-color: var(--spectrum-gray-900);
      border-radius: 0 2px 2px 0;
    }

    .faded ol b {
      color: var(--spectrum-gray-600);
      background-color: var(--spectrum-gray-200);
    }

    .faded ol i {
      color: var(--spectrum-gray-200);
      background-color: var(--spectrum-gray-600);
    }

    .selected ol b {
      color: var(--spectrum-yellow-800);
      background-color: var(--spectrum-yellow-100);
    }

    .selected ol i {
      color: var(--spectrum-yellow-100);
      background-color: var(--spectrum-yellow-1300);
    }

    .copyIcon {
      position: absolute;
      display: none;
      cursor: pointer;
      top: 0;
      left: 0;
      height: 100%;
      width: 28px;
      -webkit-mask-image: url('./Smock_Copy_18_N.svg');
      mask-image: url('./Smock_Copy_18_N.svg');
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center center;
      mask-position: center center;
      -webkit-mask-size: 18px;
      mask-size: 18px;
      opacity: 0.7;
      background-color: #FFFFFF;
    }

    .copyIcon:hover {
      opacity: 0.8;
    }

    .copyIcon:active {
      opacity: 1;
    }

    div:hover .copyIcon {
      display: block;
    }
  `;
G([l({ type: String })], B.prototype, "id", 2);
G([l({ type: String })], B.prototype, "value", 2);
G([l({ type: String })], B.prototype, "type", 2);
G([l({ type: Boolean })], B.prototype, "isFaded", 2);
G([l({ type: Boolean })], B.prototype, "isIntersect", 2);
G([l({ type: Boolean })], B.prototype, "selected", 2);
G([l({ type: Boolean })], B.prototype, "selectionAncestor", 2);
G([l({ type: Boolean })], B.prototype, "selectionDescendent", 2);
G([l({ type: Boolean })], B.prototype, "hasDownstream", 2);
G([l({ type: Boolean })], B.prototype, "hoverUpstream", 2);
customElements.define("token-graph-node", B);
var Ws = Object.defineProperty,
  Zs = Object.getOwnPropertyDescriptor,
  at = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Zs(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Ws(t, e, o), o;
  };
const Zt = 10;
function Js(a, t, e, r, o, s, i, c) {
  const n = (-3 * a + 9 * e - 9 * i + 3 * o) / 8,
    u = (-3 * t + 9 * r - 9 * c + 3 * s) / 8;
  return ((Math.atan2(u, n) + Math.PI) * 180) / Math.PI;
}
function ft(a) {
  return Math.round(a * 10) / 10;
}
class K extends j {
  constructor() {
    super(...arguments),
      (this.fromX = 0),
      (this.fromY = 0),
      (this.toX = 0),
      (this.toY = 0),
      (this.role = "descendentPath"),
      (this.isHighlighted = !1),
      (this.isFaded = !1),
      (this.label = ""),
      (this.fillLabel = ""),
      (this.top = 0),
      (this.left = 0),
      (this.width = 0),
      (this.height = 0),
      (this.Ax = 0),
      (this.Ay = 0),
      (this.Bx = 0),
      (this.By = 0),
      (this.angle = 0),
      (this.handleDistance = 0),
      (this.fillColor = "#000000"),
      (this.labelColor = "#FFFFFF");
  }
  willUpdate(t) {
    if (t.has("role") || t.has("isFaded") || t.has("isHighlighted")) {
      let i = "celery",
        c = 300,
        n = 900;
      switch (this.role) {
        case "selectionConnection":
          (i = "orange"), (c = 300), (n = 1100);
          break;
        case "ancestorPath":
          i = "purple";
          break;
        case "descendentPath":
          i = "fuchsia";
          break;
      }
      this.isFaded && ((c -= 200), (n -= 200)),
        this.isHighlighted && ((c += 200), (n += 200)),
        (this.fillColor = `--spectrum-${i}-${c}`),
        (this.labelColor = `--spectrum-${i}-${n}`);
    }
    const e = Math.min(this.fromX, this.toX),
      r = Math.min(this.fromY, this.toY);
    this.fillLabel = new Array(this.label.length + 2).join("█");
    const o = Math.sqrt(
      Math.pow(this.fromX - this.toX, 2) + Math.pow(this.fromY - this.toY, 2),
    );
    (this.handleDistance = o / 3),
      (this.angle = Js(
        this.fromX,
        this.fromY,
        this.fromX + this.handleDistance,
        this.fromY,
        this.toX - this.handleDistance,
        this.toY,
        this.toX,
        this.toY,
      ));
    const s = Math.max(0, this.handleDistance - (this.toX - this.fromX));
    (this.Ax = ft(this.fromX - e + s / 2)),
      (this.Ay = ft(this.fromY - r + Zt / 2)),
      (this.Bx = ft(this.toX - e + s / 2)),
      (this.By = ft(this.toY - r + Zt / 2)),
      (this.top = ft(r - Zt / 2)),
      (this.left = ft(e - s / 2)),
      (this.width = Math.ceil(Math.abs(this.fromX - this.toX) + s)),
      (this.height = Math.ceil(Math.abs(this.fromY - this.toY) + Zt));
  }
  render() {
    return d`
      <svg style="top:${this.top}px;left:${this.left}px;" width=${
      this.width
    } height=${this.height}>
        <path
            d="M ${this.Ax},${this.Ay} C ${this.Ax + this.handleDistance},${
      this.Ay
    } ${this.Bx - this.handleDistance},${this.By} ${this.Bx},${this.By}"
            stroke="var(${this.fillColor})"
            stroke-width="2"
            fill="none"
          />
        ${
          this.label
            ? fr`<g transform="rotate(${this.angle},${this.width / 2},${
                this.height / 2
              })">
            <text font-family="Courier New, monospace" x="50%" y="50%" fill="var(${
              this.fillColor
            })" text-anchor="middle" font-size="smaller" dominant-baseline="middle">◀${
                this.fillLabel
              }▶</text>
            <text font-family="Courier New, monospace" x="50%" y="50%" fill="var(${
              this.labelColor
            })" text-anchor="middle" font-size="smaller" dominant-baseline="middle">${
                this.label
              }</text>
            </g>
          `
            : fr``
        }
      </svg>
    `;
  }
}
K.styles = v`
    svg {
      position: absolute;
    }
  `;
at([l({ type: Number })], K.prototype, "fromX", 2);
at([l({ type: Number })], K.prototype, "fromY", 2);
at([l({ type: Number })], K.prototype, "toX", 2);
at([l({ type: Number })], K.prototype, "toY", 2);
at([l({ type: String })], K.prototype, "role", 2);
at([l({ type: Boolean })], K.prototype, "isHighlighted", 2);
at([l({ type: Boolean })], K.prototype, "isFaded", 2);
at([l({ type: String })], K.prototype, "label", 2);
customElements.define("token-graph-adjacency", K);
var Qs = Object.defineProperty,
  ti = Object.getOwnPropertyDescriptor,
  Ot = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? ti(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Qs(t, e, o), o;
  };
function ei(a) {
  return 1 << (31 - Math.clz32(a));
}
let rt = class extends j {
  constructor() {
    super(...arguments),
      (this.scale = 1),
      (this.posx = 0),
      (this.posy = 0),
      (this.theme = "paper"),
      (this.size = 7),
      (this.maximumRepeatingTileSize = 200),
      (this.cellFadeOutThresh = 50),
      (this.lineWidth = 1),
      (this.lineColorR = 0),
      (this.lineColorG = 0),
      (this.lineColorB = 0),
      (this.backgroundColor = "#000");
  }
  willUpdate(a) {
    if (a.has("theme"))
      switch (this.theme) {
        case "darkest":
        case "dark":
          (this.lineColorR = 40),
            (this.lineColorG = 40),
            (this.lineColorB = 40),
            (this.backgroundColor = "#000000");
          break;
        case "light":
        case "wireframe":
          (this.lineColorR = 230),
            (this.lineColorG = 230),
            (this.lineColorB = 230),
            (this.backgroundColor = "#FFFFFF");
          break;
        case "paper":
        default:
          (this.lineColorR = 167),
            (this.lineColorG = 220),
            (this.lineColorB = 240),
            (this.backgroundColor = "#F5FFFA");
          break;
      }
  }
  render() {
    const {
        lineColorR: a,
        lineColorG: t,
        lineColorB: e,
        backgroundColor: r,
        cellFadeOutThresh: o,
        posx: s,
        posy: i,
        scale: c,
        size: n,
        maximumRepeatingTileSize: u,
        lineWidth: m,
      } = this,
      b = u / (n * 4);
    let h = (c / b) * u,
      g = u;
    h > u && (g = h);
    const f = Math.min(16, ei(g / h)),
      w = h * f,
      S = Math.max(0, 2 * ((g - g + w) / g) - 0.5),
      $ = 0.5 + 0.5 * Math.max(0, S * 2 - 1),
      L = Array.from({ length: f }, (k, N) => {
        const V = N * h,
          D = V + m,
          It = D,
          it = (N + 1) * h,
          ct = N === 0 || N % 8 === 0 ? 1 : N === f / 2 ? $ : 0.5,
          gt = `rgba(${a},${t},${e},${ct.toFixed(2)})`;
        return `${gt} ${V.toFixed(1)}px,
              ${gt} ${D.toFixed(1)}px,
              transparent ${It.toFixed(1)}px,
              transparent ${it.toFixed(1)}px`;
      }).join(", "),
      A = Math.sqrt(Math.min(1, h / o)),
      I = {
        backgroundImage: `linear-gradient(to right, ${L}), linear-gradient(to bottom, ${L})`,
        backgroundSize: `${w.toFixed(2)}px ${w.toFixed(2)}px`,
        backgroundPosition: `${s.toFixed(2)}px ${i.toFixed(2)}px`,
        opacity: `${0.1 + 0.9 * A}`,
      };
    return d`
      <div style="background-color:${r};"></div>
      <div style=${Qe(I)}></div>
    `;
  }
};
rt.styles = v`
    :host,
    div {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  `;
Ot([l({ type: Number })], rt.prototype, "scale", 2);
Ot([l({ type: Number })], rt.prototype, "posx", 2);
Ot([l({ type: Number })], rt.prototype, "posy", 2);
Ot([l({ type: String })], rt.prototype, "theme", 2);
Ot([l({ type: Number })], rt.prototype, "size", 2);
rt = Ot([Oo("graph-grid")], rt);
var ri = Object.defineProperty,
  oi = Object.getOwnPropertyDescriptor,
  no = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? oi(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && ri(t, e, o), o;
  };
class he extends j {
  constructor() {
    super(),
      (this.appState = _t.DEFAULT_STATE),
      (this.graphState = R.DEFAULT_STATE),
      (this.nodeIds = []),
      (this._priorComponentsCacheStr = ""),
      (this._priorGraphState = R.DEFAULT_STATE),
      (this._gestureStartZoom = 1),
      (this._isGestureActive = !1),
      (this.adjacencyTuples = []),
      (this.debouncedAfterWheel = () => {}),
      (this.debouncedAfterWheel = Fo(
        this._debouncedAfterWheel.bind(this),
        150,
      ));
  }
  willUpdate(t) {
    if (t.has("graphState")) {
      const { nodes: e, adjacencyList: r } = this.graphState,
        o = [];
      for (const s in r) {
        const i = r[s];
        for (let c = 0; c < i.length; c++) {
          const n = i[c];
          o.push([s, n]);
        }
      }
      (this.nodeIds = Object.keys(e)),
        (this.adjacencyTuples = o),
        (this._priorGraphState = this.graphState);
    }
  }
  handleZoomGestureEnd(t) {
    (this._gestureStartZoom = 1),
      (this._isGestureActive = !1),
      t.preventDefault(),
      x(this, "generic-gesture-end", { id: this.id, data: t.detail });
  }
  handleZoomGestureStart(t) {
    (this._gestureStartZoom = this.appState.zoom),
      (this._isGestureActive = !0),
      t.preventDefault(),
      x(this, "generic-gesture-start", { id: this.id, data: t.detail });
  }
  handleZoomGesture(t) {
    let e = 0;
    if (t.deltaY && !this._isGestureActive) {
      const r = this.appState.zoom,
        o = -t.deltaY * 0.0075 * r;
      e = r + o;
    } else t.scale && (e = this._gestureStartZoom * t.scale);
    if (e) {
      e = Math.min(qe, Math.max(De, e));
      const r = e / this.appState.zoom,
        o = this.appState.panX - t.pageX,
        s = this.appState.panY - t.pageY,
        i = t.pageX + o * r,
        c = t.pageY + s * r;
      x(this, "set-panning-position", { x: i, y: c }),
        x(this, "set-zoom", { value: e });
    }
    t.preventDefault();
  }
  _debouncedAfterWheel() {
    x(this, "generic-gesture-end", { id: this.id });
  }
  handleWheelEvents(t) {
    if (
      (x(this, "generic-gesture-start", { id: this.id }),
      this.debouncedAfterWheel(),
      t.ctrlKey || t.altKey || t.metaKey || t.shiftKey)
    )
      return this.handleZoomGesture(t);
    x(this, "panning-input-delta", { x: -t.deltaX * 2, y: -t.deltaY * 2 }),
      t.preventDefault();
  }
  handlePointerDown(t) {
    var r;
    if (this.gesture && this.gesture.active) return;
    const e =
      (r = this.shadowRoot) == null
        ? void 0
        : r.getElementById("panning-drag-surface");
    e &&
      ((this.gesture = new pe(t, e)), t.preventDefault(), t.stopPropagation());
  }
  handleDragStart(t) {
    x(this, "generic-gesture-start", { id: this.id, data: t.detail });
  }
  handleDragEnd(t) {
    x(this, "generic-gesture-end", { id: this.id, data: t.detail });
  }
  handleDragMove(t) {
    this.gesture &&
      this.gesture.id === t.detail.gestureId &&
      x(this, "panning-input-delta", {
        x: t.detail.deltaX,
        y: t.detail.deltaY,
      });
  }
  render() {
    const {
      isDragging: t,
      zoom: e,
      panX: r,
      panY: o,
      selectedTokens: s,
      selectedComponents: i,
      selectionDescendentIntersectNodes: c,
      selectionAncestorNodes: n,
      selectionDescendentNodes: u,
      hoverUpstreamNodes: m,
      spectrumColorTheme: b,
    } = this.appState;
    let p = n.filter((y) => u.includes(y));
    const h = [...i, ...s];
    (p = [...p, ...c]), (p = p.filter((y) => !h.includes(y)));
    const g = p.length > 0,
      f = [...p, ...h],
      w = [e.toFixed(3), 0, 0, e.toFixed(3), r.toFixed(0), o.toFixed(0)],
      S = t ? [] : m;
    return d`
      <div
        id="panning-drag-surface"
        class=${t ? "is-dragging" : "not-dragging"}
        @wheel=${this.handleWheelEvents}
        @gesturechange=${this.handleZoomGesture}
        @gesturestart=${this.handleZoomGestureStart}
        @gestureend=${this.handleZoomGestureEnd}
        @pointerdown=${this.handlePointerDown}
        @gesture-drag-start=${this.handleDragStart}
        @gesture-drag-end=${this.handleDragEnd}
        @gesture-drag-move=${this.handleDragMove}
        >
        <graph-grid
            .scale=${e}
            .posx=${r}
            .posy=${o}
            .theme=${b}
          >
        </graph-grid>
        <div class="contents ${
          g ? "focus-mode" : ""
        }" style="transform: matrix(${w.join(",")});">
          ${He(
            this.adjacencyTuples,
            (y) => y.join(":"),
            (y) => {
              const [$, L] = y,
                A = this.graphState.nodes[$],
                I = this.graphState.nodes[L];
              if (!A || !I) return d``;
              const k = A.adjacencyLabels ? A.adjacencyLabels[I.id] : "",
                N = A.x + Je,
                V = A.y + Fe / 2,
                D = I.x,
                It = I.y + Fe / 2,
                it = n.indexOf(A.id) >= 0 && n.indexOf(I.id) >= 0,
                ct = u.indexOf(A.id) >= 0 && u.indexOf(I.id) >= 0,
                gt = S.indexOf(A.id) >= 0 && S.indexOf(I.id) >= 0,
                cr = f.indexOf($) >= 0 && f.indexOf(L) >= 0,
                ve = g && !cr,
                lr =
                  it && ct
                    ? "selectionConnection"
                    : it
                    ? "ancestorPath"
                    : "descendentPath",
                Wt = gt || (it && ct);
              return d`
              <token-graph-adjacency
                isHighlighted=${Wt}
                .isHighlighted=${Wt}
                .role=${lr}
                .isFaded=${ve}
                .label=${k}
                .fromX=${N}
                .fromY=${V}
                .toX=${D}
                .toY=${It}
              ></token-graph-adjacency>
            `;
            },
          )}
          ${He(
            this.nodeIds,
            (y) => y,
            (y) => {
              const {
                  type: $,
                  value: L = "",
                  x: A,
                  y: I,
                } = this.graphState.nodes[y],
                k = !!this.graphState.adjacencyList[y],
                N = s.indexOf(y) >= 0 || i.indexOf(y) >= 0,
                V = p.indexOf(y) >= 0;
              return d`
              <token-graph-node
                style="transform: matrix(1,0,0,1,${A},${I});"
                isFocused=${V}
                .isFaded=${g && !V}
                isSelected=${N}
                type=${$}
                ?isIntersect =${c.indexOf(y) >= 0}
                ?selected=${N}
                ?selectionAncestor=${n.indexOf(y) >= 0}
                ?selectionDescendent=${u.indexOf(y) >= 0}
                ?hasDownstream=${k}
                ?hoverUpstream=${S.indexOf(y) >= 0}
                id=${y}
                value=${L}
              ></token-graph-node>
            `;
            },
          )}
        </div>
      </div>
    `;
  }
}
he.styles = v`

    #panning-drag-surface {
      position: absolute;
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--spectrum-gray-50);
      color: var(--spectrum-gray-900);
    }

    graph-grid {
      position: absolute;
    }

    div.contents {
      position: absolute;
      transform-origin: 0 0;
    }

    .not-dragging div.contents {
      transition: transform 0.2s;
    }

    token-graph-adjacency {
      position: absolute;
      display: block;
      top: 0;
      left: 0;
      pointer-events: none;
    }

    token-graph-adjacency[isHighlighted=true] {
      z-index: 2;
    }

    token-graph-node {
      position: absolute;
      display: block;
    }

    /* .focus-mode token-graph-node {
      opacity: 0.5;
    } */

    /* .focus-mode token-graph-node[isSelected=true],
    .focus-mode token-graph-node[isFocused=true] {
      opacity: 1;
    }

    .focus-mode token-graph-adjacency {
      opacity: 0.5;
    }

    .focus-mode token-graph-adjacency[isFocused=true] {
      opacity: 1;
    } */


  `;
no([l({ type: Object })], he.prototype, "appState", 2);
no([l({ type: Object })], he.prototype, "graphState", 2);
customElements.define("token-graph", he);
var ai = Object.defineProperty,
  si = Object.getOwnPropertyDescriptor,
  Oe = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? si(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && ai(t, e, o), o;
  };
class se extends et {
  constructor() {
    super(...arguments), (this.checked = !1), (this.readonly = !1);
  }
  get focusElement() {
    return this.inputElement;
  }
  handleChange() {
    if (this.readonly) {
      this.inputElement.checked = this.checked;
      return;
    }
    this.checked = this.inputElement.checked;
    const t = new CustomEvent("change", {
      bubbles: !0,
      cancelable: !0,
      composed: !0,
    });
    this.dispatchEvent(t) ||
      ((this.checked = !this.inputElement.checked),
      (this.inputElement.checked = this.checked));
  }
  render() {
    return d`
            <input
                id="input"
                aria-labelledby="label"
                type="checkbox"
                .checked=${this.checked}
                @change=${this.handleChange}
            />
        `;
  }
}
Oe([l({ type: Boolean, reflect: !0 })], se.prototype, "checked", 2),
  Oe([l({ type: Boolean, reflect: !0 })], se.prototype, "readonly", 2),
  Oe([W("#input")], se.prototype, "inputElement", 2);
const ii = v`
:host{--spectrum-switch-label-color-default:var(
--spectrum-neutral-content-color-default
);--spectrum-switch-label-color-hover:var(
--spectrum-neutral-content-color-hover
);--spectrum-switch-label-color-down:var(
--spectrum-neutral-content-color-down
);--spectrum-switch-label-color-focus:var(
--spectrum-neutral-content-color-key-focus
);--spectrum-switch-label-color-disabled:var(
--spectrum-disabled-content-color
);--spectrum-switch-background-color:var(--spectrum-gray-300);--spectrum-switch-background-color-disabled:var(--spectrum-gray-300);--spectrum-switch-background-color-selected-disabled:var(
--spectrum-gray-400
);--spectrum-switch-focus-indicator-thickness:var(
--mod-focus-indicator-thickness,var(--spectrum-focus-indicator-thickness)
);--spectrum-switch-focus-indicator-color:var(
--spectrum-focus-indicator-color
);--spectrum-switch-handle-background-color:var(--spectrum-gray-75);--spectrum-switch-handle-border-color-disabled:var(--spectrum-gray-400)}.spectrum-Switch--disabled{--spectrum-switch-label-color-default:var(
--spectrum-disabled-content-color
)}:host([emphasized]){--spectrum-switch-background-color-selected-default:var(
--spectrum-accent-color-900
);--spectrum-switch-background-color-selected-hover:var(
--spectrum-accent-color-1000
);--spectrum-switch-background-color-selected-down:var(
--spectrum-accent-color-1100
);--spectrum-switch-background-color-selected-focus:var(
--spectrum-accent-color-1000
);--spectrum-switch-handle-border-color-selected-default:var(
--spectrum-accent-color-900
);--spectrum-switch-handle-border-color-selected-hover:var(
--spectrum-accent-color-1000
);--spectrum-switch-handle-border-color-selected-down:var(
--spectrum-accent-color-1100
);--spectrum-switch-handle-border-color-selected-focus:var(
--spectrum-accent-color-1000
)}:host([size=s]){--spectrum-switch-min-height:var(
--spectrum-component-height-75
);--spectrum-switch-control-width:var(--spectrum-switch-control-width-small);--spectrum-switch-control-height:var(
--spectrum-switch-control-height-small
);--spectrum-switch-control-label-spacing:var(--spectrum-text-to-control-75);--spectrum-switch-spacing-top-to-control:var(
--spectrum-switch-top-to-control-small
);--spectrum-switch-spacing-top-to-label:var(
--spectrum-component-top-to-text-75
);--spectrum-switch-font-size:var(--spectrum-font-size-75)}:host([size=m]){--spectrum-switch-min-height:var(
--spectrum-component-height-100
);--spectrum-switch-control-width:var(
--spectrum-switch-control-width-medium
);--spectrum-switch-control-height:var(
--spectrum-switch-control-height-medium
);--spectrum-switch-control-label-spacing:var(
--spectrum-text-to-control-100
);--spectrum-switch-spacing-top-to-control:var(
--spectrum-switch-top-to-control-medium
);--spectrum-switch-spacing-top-to-label:var(
--spectrum-component-top-to-text-100
);--spectrum-switch-font-size:var(--spectrum-font-size-100)}:host([size=l]){--spectrum-switch-min-height:var(
--spectrum-component-height-200
);--spectrum-switch-control-width:var(--spectrum-switch-control-width-large);--spectrum-switch-control-height:var(
--spectrum-switch-control-height-large
);--spectrum-switch-control-label-spacing:var(
--spectrum-text-to-control-200
);--spectrum-switch-spacing-top-to-control:var(
--spectrum-switch-top-to-control-large
);--spectrum-switch-spacing-top-to-label:var(
--spectrum-component-top-to-text-200
);--spectrum-switch-font-size:var(--spectrum-font-size-200)}:host([size=xl]){--spectrum-switch-min-height:var(
--spectrum-component-height-300
);--spectrum-switch-control-width:var(
--spectrum-switch-control-width-extra-large
);--spectrum-switch-control-height:var(
--spectrum-switch-control-height-extra-large
);--spectrum-switch-control-label-spacing:var(
--spectrum-text-to-control-300
);--spectrum-switch-spacing-top-to-control:var(
--spectrum-switch-top-to-control-extra-large
);--spectrum-switch-spacing-top-to-label:var(
--spectrum-component-top-to-text-300
);--spectrum-switch-font-size:var(--spectrum-font-size-300)}:host{align-items:flex-start;display:inline-flex;max-inline-size:100%;min-block-size:var(--mod-switch-height,var(--spectrum-switch-min-height));position:relative;vertical-align:top}#input{block-size:100%;box-sizing:border-box;cursor:pointer;inline-size:100%;inset-block-start:0;inset-inline-start:0;margin:0;opacity:0;padding:0;position:absolute;z-index:1}:host([dir=ltr][checked]) #input+#switch:before{transform:translateX(calc(var(
--mod-switch-control-width,
var(--spectrum-switch-control-width)
) - 100%))}:host([dir=rtl][checked]) #input+#switch:before{transform:translateX(calc((var(
--mod-switch-control-width,
var(--spectrum-switch-control-width)
) - 100%)*-1))}#input[disabled],:host([disabled]) #input{cursor:default}#input.focus-visible+#switch:after{margin:calc(var(--mod-focus-indicator-gap, var(--spectrum-focus-indicator-gap))*-1)}#input:focus-visible+#switch:after{margin:calc(var(--mod-focus-indicator-gap, var(--spectrum-focus-indicator-gap))*-1)}#label{color:var(
--highcontrast-switch-label-color-default,var(
--mod-switch-label-color-default,var(--spectrum-switch-label-color-default)
)
);font-size:var(--mod-switch-font-size,var(--spectrum-switch-font-size));line-height:var(--mod-line-height-100,var(--spectrum-line-height-100));margin-block-end:0;margin-block-start:var(
--mod-switch-spacing-top-to-label,var(--spectrum-switch-spacing-top-to-label)
);margin-inline:var(
--mod-switch-control-label-spacing,var(--spectrum-switch-control-label-spacing)
);transition:color var(
--mod-animation-duration-200,var(--spectrum-animation-duration-200)
) ease-in-out}#switch{block-size:var(
--mod-switch-control-height,var(--spectrum-switch-control-height)
);border-radius:calc(var(--mod-switch-control-height, var(--spectrum-switch-control-height))/2);box-sizing:border-box;display:inline-block;flex-grow:0;flex-shrink:0;inline-size:var(
--mod-switch-control-width,var(--spectrum-switch-control-width)
);inset-inline-end:0;inset-inline-start:0;margin-block:calc(var(--mod-switch-height, var(--spectrum-switch-min-height)) - var(
--mod-switch-control-height,
var(--spectrum-switch-control-height)
) - var(
--mod-switch-spacing-top-to-control,
var(--spectrum-switch-spacing-top-to-control)
));margin-inline:0;position:relative;transition:background var(
--mod-animation-duration-100,var(--spectrum-animation-duration-100)
) ease-in-out,border var(
--mod-animation-duration-100,var(--spectrum-animation-duration-100)
) ease-in-out;vertical-align:middle}#switch:before{box-sizing:border-box;content:"";display:block;position:absolute}#switch:before{block-size:var(
--mod-switch-control-height,var(--spectrum-switch-control-height)
);border-radius:calc(var(--mod-switch-control-height, var(--spectrum-switch-control-height))/2);border-style:solid;border-width:var(--mod-border-width-200,var(--spectrum-border-width-200));inline-size:var(
--mod-switch-control-height,var(--spectrum-switch-control-height)
);inset-block-start:0;inset-inline-start:0;transition:background var(
--mod-animation-duration-100,var(--spectrum-animation-duration-100)
) ease-in-out,border var(
--mod-animation-duration-100,var(--spectrum-animation-duration-100)
) ease-in-out,transform var(
--mod-animation-duration-100,var(--spectrum-animation-duration-100)
) ease-in-out,box-shadow var(
--mod-animation-duration-100,var(--spectrum-animation-duration-100)
) ease-in-out}#switch:after{border-radius:calc(var(--mod-switch-control-height, var(--spectrum-switch-control-height)) + var(--mod-focus-indicator-gap, var(--spectrum-focus-indicator-gap)));content:"";display:block;inset-block-end:0;inset-block-start:0;inset-inline-end:0;inset-inline-start:0;margin:0;position:absolute;transition:opacity var(
--mod-animation-duration-100,var(--spectrum-animation-duration-100)
) ease-out,margin var(
--spectrum-animation-duration-100,var(--spectrum-animation-duration-100)
) ease-out}#switch{background-color:var(
--highcontrast-switch-background-color,var(
--mod-switch-background-color,var(--spectrum-switch-background-color)
)
)}#switch:before{background-color:var(
--highcontrast-switch-handle-background-color,var(
--mod-switch-handle-background-color,var(--spectrum-switch-handle-background-color)
)
);border-color:var(
--highcontrast-switch-handle-border-color-default,var(
--mod-switch-handle-border-color-default,var(--spectrum-switch-handle-border-color-default)
)
)}:host(:hover) #input+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-hover,var(
--mod-switch-handle-border-color-hover,var(--spectrum-switch-handle-border-color-hover)
)
);box-shadow:none}:host(:hover) #input~#label{color:var(
--highcontrast-switch-label-color-hover,var(
--mod-switch-label-color-hover,var(--spectrum-switch-label-color-hover)
)
)}:host(:hover[checked]) #input:enabled+#switch{background-color:var(
--highcontrast-switch-background-color-selected-hover,var(
--mod-switch-background-color-selected-hover,var(--spectrum-switch-background-color-selected-hover)
)
)}:host(:hover[checked]) #input:enabled+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-selected-hover,var(
--mod-switch-handle-border-color-selected-hover,var(--spectrum-switch-handle-border-color-selected-hover)
)
)}:host(:hover) #input[disabled]+#switch,:host(:hover[disabled]) #input+#switch{background-color:var(
--highcontrast-switch-background-color-disabled,var(
--mod-switch-background-color-disabled,var(--spectrum-switch-background-color-disabled)
)
)}:host(:hover) #input[disabled]+#switch:before,:host(:hover[disabled]) #input+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-disabled,var(
--mod-switch-handle-border-color-disabled,var(--spectrum-switch-handle-border-color-disabled)
)
)}:host(:hover) #input[disabled]~#label,:host(:hover[disabled]) #input~#label{color:var(
--highcontrast-switch-label-color-disabled,var(
--mod-switch-label-color-disabled,var(--spectrum-switch-label-color-disabled)
)
)}:host(:hover[checked]) #input[disabled]+#switch,:host(:hover[disabled][checked]) #input+#switch{background-color:var(
--highcontrast-switch-background-color-selected-disabled,var(
--mod-switch-background-color-selected-disabled,var(--spectrum-switch-background-color-selected-disabled)
)
)}:host(:hover[checked]) #input[disabled]+#switch:before,:host(:hover[disabled][checked]) #input+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-disabled,var(
--mod-switch-handle-border-color-disabled,var(--spectrum-switch-handle-border-color-disabled)
)
)}:host(:hover[checked]) #input[disabled]~#label,:host(:hover[disabled][checked]) #input~#label{color:var(
--highcontrast-switch-label-color-disabled,var(
--mod-switch-label-color-disabled,var(--spectrum-switch-label-color-disabled)
)
)}:host(:active) #input+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-down,var(
--mod-switch-handle-border-color-down,var(--spectrum-switch-handle-border-color-down)
)
)}:host(:active) #input~#label{color:var(
--highcontrast-switch-label-color-down,var(
--mod-switch-label-color-down,var(--spectrum-switch-label-color-down)
)
)}:host(:active[checked]) #input:enabled+#switch{background-color:var(
--highcontrast-switch-background-color-selected-down,var(
--mod-switch-background-color-selected-down,var(--spectrum-switch-background-color-selected-down)
)
)}:host(:active[checked]) #input:enabled+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-selected-down,var(
--mod-switch-handle-border-color-selected-down,var(--spectrum-switch-handle-border-color-selected-down)
)
)}#input.focus-visible+#switch:after,:host(:hover) #input.focus-visible+#switch:after{box-shadow:0 0 0 var(
--mod-switch-focus-indicator-thickness,var(--spectrum-switch-focus-indicator-thickness)
) var(
--highcontrast-switch-focus-indicator-color,var(
--mod-switch-focus-indicator-color,var(--spectrum-switch-focus-indicator-color)
)
)}#input:focus-visible+#switch:after,:host(:hover) #input:focus-visible+#switch:after{box-shadow:0 0 0 var(
--mod-switch-focus-indicator-thickness,var(--spectrum-switch-focus-indicator-thickness)
) var(
--highcontrast-switch-focus-indicator-color,var(
--mod-switch-focus-indicator-color,var(--spectrum-switch-focus-indicator-color)
)
)}#input.focus-visible+#switch:before,:host(:hover) #input.focus-visible+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-focus,var(
--mod-switch-handle-border-color-focus,var(--spectrum-switch-handle-border-color-focus)
)
)}#input:focus-visible+#switch:before,:host(:hover) #input:focus-visible+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-focus,var(
--mod-switch-handle-border-color-focus,var(--spectrum-switch-handle-border-color-focus)
)
)}:host(:hover[checked]) #input.focus-visible+#switch,:host([checked]) #input.focus-visible+#switch{background-color:var(
--highcontrast-switch-background-color-selected-focus,var(
--mod-switch-background-color-selected-focus,var(--spectrum-switch-background-color-selected-focus)
)
)}:host(:hover[checked]) #input:focus-visible+#switch,:host([checked]) #input:focus-visible+#switch{background-color:var(
--highcontrast-switch-background-color-selected-focus,var(
--mod-switch-background-color-selected-focus,var(--spectrum-switch-background-color-selected-focus)
)
)}:host(:hover[checked]) #input.focus-visible+#switch:before,:host([checked]) #input.focus-visible+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-selected-focus,var(
--mod-switch-handle-border-color-selected-focus,var(--spectrum-switch-handle-border-color-selected-focus)
)
)}:host(:hover[checked]) #input:focus-visible+#switch:before,:host([checked]) #input:focus-visible+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-selected-focus,var(
--mod-switch-handle-border-color-selected-focus,var(--spectrum-switch-handle-border-color-selected-focus)
)
)}#input.focus-visible~#label,:host(:hover) #input.focus-visible~#label{color:var(
--highcontrast-switch-label-color-focus,var(
--mod-switch-label-color-focus,var(--spectrum-switch-label-color-focus)
)
)}#input:focus-visible~#label,:host(:hover) #input:focus-visible~#label{color:var(
--highcontrast-switch-label-color-focus,var(
--mod-switch-label-color-focus,var(--spectrum-switch-label-color-focus)
)
)}:host([checked]) #input+#switch{background-color:var(
--highcontrast-switch-background-color-selected-default,var(
--mod-switch-background-color-selected-default,var(--spectrum-switch-background-color-selected-default)
)
)}:host([checked]) #input+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-selected-default,var(
--mod-switch-handle-border-color-selected-default,var(--spectrum-switch-handle-border-color-selected-default)
)
)}#input[disabled]+#switch,:host([disabled]) #input+#switch{background-color:var(
--highcontrast-switch-background-color-disabled,var(
--mod-switch-background-color-disabled,var(--spectrum-switch-background-color-disabled)
)
)}#input[disabled]+#switch:before,:host([disabled]) #input+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-disabled,var(
--mod-switch-handle-border-color-disabled,var(--spectrum-switch-handle-border-color-disabled)
)
)}#input[disabled]~#label,:host([disabled]) #input~#label{color:var(
--highcontrast-switch-label-color-disabled,var(
--mod-switch-label-color-disabled,var(--spectrum-switch-label-color-disabled)
)
)}:host([checked]) #input[disabled]+#switch,:host([disabled][checked]) #input+#switch{background-color:var(
--highcontrast-switch-background-color-selected-disabled,var(
--mod-switch-background-color-selected-disabled,var(--spectrum-switch-background-color-selected-disabled)
)
)}:host([checked]) #input[disabled]+#switch:before,:host([disabled][checked]) #input+#switch:before{border-color:var(
--highcontrast-switch-handle-border-color-disabled,var(
--mod-switch-handle-border-color-disabled,var(--spectrum-switch-handle-border-color-disabled)
)
)}:host([checked]) #input[disabled]~#label,:host([disabled][checked]) #input~#label{color:var(
--highcontrast-switch-label-color-disabled,var(
--mod-switch-label-color-disabled,var(--spectrum-switch-label-color-disabled)
)
)}@media (forced-colors:active){:host{--highcontrast-switch-label-color-default:ButtonText;--highcontrast-switch-label-color-hover:ButtonText;--highcontrast-switch-label-color-down:ButtonText;--highcontrast-switch-label-color-focus:ButtonText;--highcontrast-switch-label-color-disabled:GrayText;--highcontrast-switch-handle-background-color:ButtonFace;--highcontrast-switch-handle-border-color-default:ButtonText;--highcontrast-switch-handle-border-color-focus:Highlight;--highcontrast-switch-handle-border-color-disabled:Highlight;--highcontrast-switch-handle-border-color-selected-default:Highlight;--highcontrast-switch-handle-border-color-selected-hover:Highlight;--highcontrast-switch-handle-border-color-selected-down:Highlight;--highcontrast-switch-handle-border-color-selected-focus:Highlight;--highcontrast-switch-background-color:ButtonFace;--highcontrast-switch-background-color-selected-default:Highlight;--highcontrast-switch-background-color-selected-hover:Highlight;--highcontrast-switch-background-color-selected-down:Highlight;--highcontrast-switch-background-color-selected-focus:Highlight;--highcontrast-switch-background-color-selected-disabled:Highlight;--highcontrast-switch-handle-border-color-hover:Highlight;--highcontrast-switch-handle-border-color-down:Highlight;--highcontrast-switch-focus-indicator-color:ButtonText;forced-color-adjust:none}#input:not([checked])+#switch{box-shadow:inset 0 0 0 1px ButtonText}:host(:hover) #input:not([checked])+#switch{box-shadow:inset 0 0 0 1px Highlight}:host(:hover[checked]) #input[disabled]+#switch,:host(:hover[disabled][checked]) #input+#switch{background-color:GrayText;box-shadow:inset 0 0 0 1px GrayText}:host(:hover[checked]) #input[disabled]+#switch:before,:host(:hover[disabled][checked]) #input+#switch:before{background-color:ButtonFace;border-color:GrayText}#input[disabled]:not([checked])+#switch,:host([disabled]) #input:not([checked])+#switch{background-color:ButtonFace;box-shadow:inset 0 0 0 1px GrayText}#input[disabled]:not([checked])+#switch:before,:host([disabled]) #input:not([checked])+#switch:before{background-color:ButtonFace;border-color:GrayText}:host([checked]) #input[disabled]+#switch,:host([disabled][checked][dir]) #input+#switch{background-color:GrayText;box-shadow:inset 0 0 0 1px GrayText}:host([checked]) #input[disabled]+#switch:before,:host([disabled][checked][dir]) #input+#switch:before{background-color:ButtonFace;border-color:GrayText}#input[disabled]~#label,:host([disabled]) #input~#label{color:GrayText}}:host{--spectrum-switch-background-color-selected-default:var(
--system-spectrum-switch-background-color-selected-default
);--spectrum-switch-background-color-selected-hover:var(
--system-spectrum-switch-background-color-selected-hover
);--spectrum-switch-background-color-selected-down:var(
--system-spectrum-switch-background-color-selected-down
);--spectrum-switch-background-color-selected-focus:var(
--system-spectrum-switch-background-color-selected-focus
);--spectrum-switch-handle-border-color-default:var(
--system-spectrum-switch-handle-border-color-default
);--spectrum-switch-handle-border-color-hover:var(
--system-spectrum-switch-handle-border-color-hover
);--spectrum-switch-handle-border-color-down:var(
--system-spectrum-switch-handle-border-color-down
);--spectrum-switch-handle-border-color-focus:var(
--system-spectrum-switch-handle-border-color-focus
);--spectrum-switch-handle-border-color-selected-default:var(
--system-spectrum-switch-handle-border-color-selected-default
);--spectrum-switch-handle-border-color-selected-hover:var(
--system-spectrum-switch-handle-border-color-selected-hover
);--spectrum-switch-handle-border-color-selected-down:var(
--system-spectrum-switch-handle-border-color-selected-down
);--spectrum-switch-handle-border-color-selected-focus:var(
--system-spectrum-switch-handle-border-color-selected-focus
)}:host([disabled]){pointer-events:none}
`,
  Or = ii,
  ci = v`
#switch:before{transition:background var(--spectrum-global-animation-duration-100,.13s) ease-in-out,border var(--spectrum-global-animation-duration-100,.13s) ease-in-out,box-shadow var(--spectrum-global-animation-duration-100,.13s) ease-in-out}
`,
  li = ci;
var ni = Object.defineProperty,
  ui = Object.getOwnPropertyDescriptor,
  di = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? ui(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && ni(t, e, o), o;
  };
class uo extends dt(se) {
  constructor() {
    super(...arguments), (this.emphasized = !1);
  }
  static get styles() {
    return window.hasOwnProperty("ShadyDOM") ? [Or, li] : [Or];
  }
  render() {
    return d`
            ${super.render()}
            <span id="switch"></span>
            <label id="label" for="input"><slot></slot></label>
        `;
  }
  firstUpdated(t) {
    super.firstUpdated(t), this.inputElement.setAttribute("role", "switch");
  }
  updated(t) {
    t.has("checked") &&
      this.inputElement.setAttribute(
        "aria-checked",
        this.checked ? "true" : "false",
      );
  }
}
di([l({ type: Boolean, reflect: !0 })], uo.prototype, "emphasized", 2);
customElements.define("sp-switch", uo);
customElements.define("sp-button", ae);
const pi = v`
:host{--spectrum-buttongroup-spacing-horizontal:var(
--spectrum-spacing-300
);--spectrum-buttongroup-spacing-vertical:var(--spectrum-spacing-300)}:host([size=s]){--spectrum-buttongroup-spacing-horizontal:var(
--spectrum-spacing-200
);--spectrum-buttongroup-spacing-vertical:var(--spectrum-spacing-200)}:host([size=m]){--spectrum-buttongroup-spacing-horizontal:var(
--spectrum-spacing-300
);--spectrum-buttongroup-spacing-vertical:var(--spectrum-spacing-300)}:host([size=l]){--spectrum-buttongroup-spacing-horizontal:var(
--spectrum-spacing-300
);--spectrum-buttongroup-spacing-vertical:var(--spectrum-spacing-300)}:host([size=xl]){--spectrum-buttongroup-spacing-horizontal:var(
--spectrum-spacing-300
);--spectrum-buttongroup-spacing-vertical:var(--spectrum-spacing-300)}:host{display:flex;flex-wrap:wrap;gap:var(
--mod-buttongroup-spacing-horizontal,var(--spectrum-buttongroup-spacing-horizontal)
)}::slotted(*){flex-shrink:0}:host([vertical]){display:inline-flex;flex-direction:column;gap:var(
--mod-buttongroup-spacing-vertical,var(--spectrum-buttongroup-spacing-vertical)
)}:host([vertical]) ::slotted(sp-action-button){--spectrum-actionbutton-label-flex-grow:1}:host([dir=ltr][vertical]) ::slotted(sp-action-button){--spectrum-actionbutton-label-text-align:left}:host([dir=rtl][vertical]) ::slotted(sp-action-button){--spectrum-actionbutton-label-text-align:right}
`,
  mi = pi;
var bi = Object.defineProperty,
  hi = Object.getOwnPropertyDescriptor,
  gi = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? hi(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && bi(t, e, o), o;
  };
class po extends dt(ot) {
  constructor() {
    super(...arguments), (this.vertical = !1);
  }
  static get styles() {
    return [mi];
  }
  handleSlotchange({ target: t }) {
    t.assignedElements().forEach((e) => {
      e.size = this.size;
    });
  }
  render() {
    return d`
            <slot @slotchange=${this.handleSlotchange}></slot>
        `;
  }
}
gi([l({ type: Boolean, reflect: !0 })], po.prototype, "vertical", 2);
customElements.define("sp-button-group", po);
const vi = v`
:host{--spectrum-link-animation-duration:var(
--spectrum-animation-duration-100
);--spectrum-link-text-color-primary-default:var(
--spectrum-accent-content-color-default
);--spectrum-link-text-color-primary-hover:var(
--spectrum-accent-content-color-hover
);--spectrum-link-text-color-primary-active:var(
--spectrum-accent-content-color-down
);--spectrum-link-text-color-primary-focus:var(
--spectrum-accent-content-color-key-focus
);--spectrum-link-text-color-secondary-default:var(
--spectrum-neutral-content-color-default
);--spectrum-link-text-color-secondary-hover:var(
--spectrum-neutral-content-color-hover
);--spectrum-link-text-color-secondary-active:var(
--spectrum-neutral-content-color-down
);--spectrum-link-text-color-secondary-focus:var(
--spectrum-neutral-content-color-key-focus
);--spectrum-link-text-color-white:var(--spectrum-white);--spectrum-link-text-color-black:var(--spectrum-black)}@media (forced-colors:active){a{--highcontrast-link-focus-color:CanvasText}:host([variant=secondary]) a{color:LinkText}:host([variant=secondary]) a:hover{color:LinkText}:host([variant=secondary]) a:active{color:LinkText}:host([variant=secondary]) a:focus{color:LinkText}&--staticBlack{--highcontrast-link-text-color-black:ButtonText}&--staticWhite{--highcontrast-link-text-color-white:ButtonText}}a{-webkit-text-decoration-skip:objects;background-color:transparent;color:var(
--mod-link-text-color-primary-default,var(--spectrum-link-text-color-primary-default)
);cursor:pointer;outline:none;text-decoration:underline;transition:color var(
--mod-link-animation-duration,var(--spectrum-link-animation-duration)
) ease-in-out}a:hover{color:var(
--mod-link-text-color-primary-hover,var(--spectrum-link-text-color-primary-hover)
)}a:active{color:var(
--mod-link-text-color-primary-active,var(--spectrum-link-text-color-primary-active)
)}a.focus-visible{color:var(
--mod-link-text-color-primary-focus,var(--spectrum-link-text-color-primary-focus)
);text-decoration:underline;text-decoration-color:var(--highcontrast-link-focus-color,inherit);text-decoration-style:double}a:focus-visible{color:var(
--mod-link-text-color-primary-focus,var(--spectrum-link-text-color-primary-focus)
);text-decoration:underline;text-decoration-color:var(--highcontrast-link-focus-color,inherit);text-decoration-style:double}:host([variant=secondary]) a{color:var(
--mod-link-text-color-secondary-default,var(--spectrum-link-text-color-secondary-default)
)}:host([variant=secondary]) a:hover{color:var(
--mod-link-text-color-secondary-hover,var(--spectrum-link-text-color-secondary-hover)
)}:host([variant=secondary]) a:active{color:var(
--mod-link-text-color-secondary-active,var(--spectrum-link-text-color-secondary-active)
)}:host([variant=secondary]) a:focus{color:var(
--mod-link-text-color-secondary-focus,var(--spectrum-link-text-color-secondary-focus)
)}:host([quiet]) a{text-decoration:none}:host([quiet]) a:hover{text-decoration:underline}:host([static=white]) a{color:var(
--highcontrast-link-text-color-white,var(--mod-link-text-color-white,var(--spectrum-link-text-color-white))
)}:host([static=white]) a:active,:host([static=white]) a:focus,:host([static=white]) a:hover{color:var(
--highcontrast-link-text-color-white,var(--mod-link-text-color-white,var(--spectrum-link-text-color-white))
)}:host([static=black]) a{color:var(
--highcontrast-link-text-color-black,var(--mod-link-text-color-black,var(--spectrum-link-text-color-black))
)}:host([static=black]) a:active,:host([static=black]) a:focus,:host([static=black]) a:hover{color:var(
--highcontrast-link-text-color-black,var(--mod-link-text-color-black,var(--spectrum-link-text-color-black))
)}:host{display:inline}:host(:focus){outline:none}:host([href]) a.focus-visible{text-decoration:underline;text-decoration-style:double}:host([href]) a:focus-visible{text-decoration:underline;text-decoration-style:double}
`,
  fi = vi;
var yi = Object.defineProperty,
  ki = Object.getOwnPropertyDescriptor,
  Pe = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? ki(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && yi(t, e, o), o;
  };
class ie extends ao(et) {
  static get styles() {
    return [fi];
  }
  get focusElement() {
    return this.anchorElement;
  }
  render() {
    return this.renderAnchor({ id: "anchor" });
  }
}
Pe([W("#anchor")], ie.prototype, "anchorElement", 2),
  Pe([l({ type: String, reflect: !0 })], ie.prototype, "variant", 2),
  Pe([l({ type: String, reflect: !0 })], ie.prototype, "static", 2);
customElements.define("sp-link", ie);
const xi = async (a, t, e, r) => {
    const { Overlay: o } = await tr(
      () => import("./overlay-061ea8db.js"),
      [],
      import.meta.url,
    );
    return o.open(a, t, e, r);
  },
  wi = v`
:host([disabled]) ::slotted([slot=trigger]){pointer-events:none}#overlay-content slot{display:none}
`,
  zi = wi;
var $i = Object.defineProperty,
  Ci = Object.getOwnPropertyDescriptor,
  yt = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Ci(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && $i(t, e, o), o;
  };
const Si = {
    touch: "Double tap and long press for additional options",
    keyboard: "Press Space or Alt+Down Arrow for additional options",
    mouse: "Click and hold for additional options",
  },
  mo = class extends ot {
    constructor() {
      super(...arguments),
        (this.placement = "bottom"),
        (this.offset = 6),
        (this.disabled = !1),
        (this.hasLongpressContent = !1),
        (this._longpressId = "longpress-describedby-descriptor"),
        (this.abortOverlay = () => {}),
        (this.openStatePromise = Promise.resolve());
    }
    static get styles() {
      return [zi];
    }
    handleClose(t) {
      (t &&
        t.detail.interaction !== this.open &&
        t.detail.interaction !== this.type) ||
        this.removeAttribute("open");
    }
    render() {
      return d`
            <slot
                id="trigger"
                @click=${this.onTrigger}
                @longpress=${this.onTrigger}
                @mouseenter=${this.onTrigger}
                @mouseleave=${this.onTrigger}
                @focusin=${this.onTrigger}
                @focusout=${this.onTrigger}
                @sp-closed=${this.handleClose}
                @slotchange=${this.onTargetSlotChange}
                name="trigger"
            ></slot>
            <div id="overlay-content">
                <slot
                    @slotchange=${this.onClickSlotChange}
                    name="click-content"
                ></slot>
                <slot
                    @slotchange=${this.onLongpressSlotChange}
                    name="longpress-content"
                ></slot>
                <slot
                    @slotchange=${this.onHoverSlotChange}
                    name="hover-content"
                ></slot>
                <slot name=${this._longpressId}></slot>
            </div>
        `;
    }
    updated(t) {
      if ((super.updated(t), this.disabled && t.has("disabled"))) {
        this.closeAllOverlays();
        return;
      }
      t.has("open") && this.manageOpen(),
        t.has("hasLongpressContent") && this.manageLongpressDescriptor();
    }
    manageLongpressDescriptor() {
      const t = this.querySelector('[slot="trigger"]'),
        e = t.getAttribute("aria-describedby");
      let r = e ? e.split(/\s+/) : [];
      if (this.hasLongpressContent) {
        this.longpressDescriptor ||
          ((this.longpressDescriptor = document.createElement("div")),
          (this.longpressDescriptor.id = this._longpressId),
          (this.longpressDescriptor.slot = this._longpressId));
        const o = Ga() || Ka() ? "touch" : "keyboard";
        (this.longpressDescriptor.textContent = Si[o]),
          this.appendChild(this.longpressDescriptor),
          r.push(this._longpressId);
      } else
        this.longpressDescriptor && this.longpressDescriptor.remove(),
          (r = r.filter((o) => o !== this._longpressId));
      r.length
        ? t.setAttribute("aria-describedby", r.join(" "))
        : t.removeAttribute("aria-describedby");
    }
    closeAllOverlays() {
      this.abortOverlay && this.abortOverlay(!0),
        [
          "closeClickOverlay",
          "closeHoverOverlay",
          "closeLongpressOverlay",
        ].forEach(async (t) => {
          const e = this[t];
          e != null && (delete this[t], (await e)());
        }),
        (this.overlaidContent = void 0);
    }
    manageOpen() {
      var t;
      ({
        click: () => this.onTriggerClick(),
        hover: () => this.onTriggerMouseEnter(),
        longpress: () => this.onTriggerLongpress(),
        none: () => this.closeAllOverlays(),
      })[(t = this.open) != null ? t : "none"]();
    }
    async openOverlay(t, e, r, o) {
      return (
        (this.openStatePromise = new Promise(
          (s) => (this.openStateResolver = s),
        )),
        this.addEventListener(
          "sp-opened",
          () => {
            this.openStateResolver();
          },
          { once: !0 },
        ),
        (this.overlaidContent = r),
        mo.openOverlay(t, e, r, o)
      );
    }
    get overlayOptions() {
      return {
        offset: this.offset,
        placement: this.placement,
        receivesFocus:
          !this.type || this.type === "inline" || this.open === "hover"
            ? void 0
            : "auto",
      };
    }
    onTrigger(t) {
      if (
        t.type === "mouseleave" &&
        this.open === "hover" &&
        t.relatedTarget === this.overlaidContent &&
        this.overlaidContent
      ) {
        this.overlaidContent.addEventListener(
          "mouseleave",
          (e) => {
            e.relatedTarget !== this.targetContent && this.onTrigger(e);
          },
          { once: !0 },
        );
        return;
      }
      if (!this.disabled)
        switch (t.type) {
          case "mouseenter":
          case "focusin":
            !this.open && this.hoverContent && (this.open = "hover");
            return;
          case "mouseleave":
          case "focusout":
            this.open === "hover" && this.handleClose();
            return;
          case "click":
            this.clickContent && (this.open = t.type);
            return;
          case "longpress":
            this.longpressContent &&
              ((this._longpressEvent = t), (this.open = t.type));
            return;
        }
    }
    prepareToFocusOverlayContent(t) {
      this.type === "modal" && (Fa(t) || (t.tabIndex = 0));
    }
    async onTriggerClick() {
      if (!this.targetContent || !this.clickContent || this.closeClickOverlay)
        return;
      const { targetContent: t, clickContent: e } = this;
      this.closeAllOverlays(),
        this.prepareToFocusOverlayContent(e),
        (this.closeClickOverlay = this.openOverlay(
          t,
          this.type ? this.type : "click",
          e,
          this.overlayOptions,
        ));
    }
    async onTriggerLongpress() {
      var t, e;
      if (
        !this.targetContent ||
        !this.longpressContent ||
        this.closeLongpressOverlay
      )
        return;
      const { targetContent: r, longpressContent: o } = this;
      this.closeAllOverlays(), this.prepareToFocusOverlayContent(o);
      const s =
        ((e = (t = this._longpressEvent) == null ? void 0 : t.detail) == null
          ? void 0
          : e.source) !== "keyboard";
      (this.closeLongpressOverlay = this.openOverlay(
        r,
        this.type ? this.type : "longpress",
        o,
        {
          ...this.overlayOptions,
          receivesFocus: "auto",
          notImmediatelyClosable: s,
        },
      )),
        (this._longpressEvent = void 0);
    }
    async onTriggerMouseEnter() {
      if (!this.targetContent || !this.hoverContent || this.closeHoverOverlay)
        return;
      const t = new Promise((o) => {
          this.abortOverlay = o;
        }),
        { targetContent: e, hoverContent: r } = this;
      this.closeHoverOverlay = this.openOverlay(e, "hover", r, {
        abortPromise: t,
        ...this.overlayOptions,
      });
    }
    onClickSlotChange(t) {
      (this.clickContent = this.extractSlotContentFromEvent(t)),
        this.manageOpen();
    }
    onLongpressSlotChange(t) {
      (this.longpressContent = this.extractSlotContentFromEvent(t)),
        (this.hasLongpressContent =
          !!this.longpressContent || !!this.closeLongpressOverlay),
        this.manageOpen();
    }
    onHoverSlotChange(t) {
      (this.hoverContent = this.extractSlotContentFromEvent(t)),
        this.manageOpen();
    }
    onTargetSlotChange(t) {
      this.targetContent = this.extractSlotContentFromEvent(t);
    }
    extractSlotContentFromEvent(t) {
      return t.target
        .assignedNodes({ flatten: !0 })
        .find((e) => e instanceof HTMLElement);
    }
    async getUpdateComplete() {
      const t = await super.getUpdateComplete();
      return await this.openStatePromise, t;
    }
    disconnectedCallback() {
      this.closeAllOverlays(), super.disconnectedCallback();
    }
  };
let J = mo;
(J.openOverlay = async (a, t, e, r) => xi(a, t, e, r)),
  yt([l({ reflect: !0 })], J.prototype, "placement", 2),
  yt([l()], J.prototype, "type", 2),
  yt([l({ type: Number, reflect: !0 })], J.prototype, "offset", 2),
  yt([l({ reflect: !0 })], J.prototype, "open", 2),
  yt([l({ type: Boolean, reflect: !0 })], J.prototype, "disabled", 2),
  yt([Xr()], J.prototype, "hasLongpressContent", 2);
customElements.define("overlay-trigger", J);
const _i = v`
:host{--spectrum-overlay-animation-distance:var(
--spectrum-picker-m-texticon-popover-offset-y,var(--spectrum-global-dimension-size-75)
);opacity:0;pointer-events:none;transition:transform var(--spectrum-global-animation-duration-100,.13s) ease-in-out,opacity var(--spectrum-global-animation-duration-100,.13s) ease-in-out,visibility 0ms linear var(--spectrum-global-animation-duration-100,.13s);visibility:hidden}:host([open]){opacity:1;pointer-events:auto;transition-delay:0ms;visibility:visible}:host([placement*=bottom][open]){transform:translateY(var(--spectrum-overlay-animation-distance))}:host([placement*=top][open]){transform:translateY(calc(var(--spectrum-overlay-animation-distance)*-1))}:host([placement*=right][open]){transform:translateX(var(--spectrum-overlay-animation-distance))}:host([placement*=left][open]){transform:translateX(calc(var(--spectrum-overlay-animation-distance)*-1))}:host{--spectrum-popover-target-offset:13px;--spectrum-popover-dialog-padding:30px 29px;--spectrum-popover-dialog-min-width:270px;--spectrum-popover-min-width:var(--spectrum-global-dimension-size-400);--spectrum-popover-min-height:var(--spectrum-global-dimension-size-400)}:host{border-radius:var(
--spectrum-popover-border-radius,var(--spectrum-alias-border-radius-regular)
);border-style:solid;border-width:var(
--spectrum-popover-border-size,var(--spectrum-alias-border-size-thin)
);box-sizing:border-box;display:inline-flex;flex-direction:column;min-height:var(
--spectrum-popover-min-height,var(--spectrum-global-dimension-size-400)
);min-width:var(
--spectrum-popover-min-width,var(--spectrum-global-dimension-size-400)
);outline:none;position:absolute}#tip{position:absolute;-webkit-transform:translate(0)}#tip .triangle{stroke-linecap:square;stroke-linejoin:miter;stroke-width:var(
--spectrum-popover-border-size,var(--spectrum-alias-border-size-thin)
)}:host([dialog]){min-width:var(
--spectrum-popover-dialog-min-width
);padding:var(--spectrum-popover-dialog-padding)}:host([placement*=left][tip]){margin-right:var(
--spectrum-popover-target-offset
)}:host([placement*=left]) #tip{left:100%}:host([placement*=right][tip]){margin-left:var(
--spectrum-popover-target-offset
)}:host([placement*=right]) #tip{right:100%;transform:scaleX(-1)}:host([placement*=left]) #tip,:host([placement*=right]) #tip{margin-top:calc(var(--spectrum-global-dimension-size-150)*-1);top:50%}:host([placement*=bottom][tip]){margin-top:var(
--spectrum-popover-target-offset
)}:host([placement*=bottom]) #tip{bottom:100%;transform:scaleY(-1)}:host([placement*=top][tip]){margin-bottom:var(
--spectrum-popover-target-offset
)}:host([placement*=top]) #tip{top:100%}:host([placement*=bottom]) #tip,:host([placement*=top]) #tip{left:50%;margin-left:calc(var(--spectrum-global-dimension-size-150)*-1)}:host{background-color:var(
--spectrum-popover-background-color,var(--spectrum-global-color-gray-50)
);border-color:var(
--spectrum-popover-border-color,var(--spectrum-alias-border-color-dark)
);clip-path:inset(-30px -30px);filter:drop-shadow(0 1px 4px var(
--spectrum-popover-shadow-color,var(--spectrum-alias-dropshadow-color)
));-webkit-filter:drop-shadow(0 1px 4px var(
--spectrum-popover-shadow-color,var(--spectrum-alias-dropshadow-color)
));will-change:filter}#tip .triangle{fill:var(
--spectrum-popover-background-color,var(--spectrum-global-color-gray-50)
);stroke:var(
--spectrum-popover-border-color,var(--spectrum-alias-border-color-dark)
)}:host{--sp-popover-tip-size:24px;max-height:100%;max-width:100%;min-width:min-content}::slotted(*){overscroll-behavior:contain}.tip{height:calc(var(--sp-popover-tip-size)/2);left:0;position:absolute;width:var(--sp-popover-tip-size)}:host([placement*=right]) #tip{transform:none}:host([placement*=bottom]) #tip{transform:none}:host([placement*=top]) .tip{top:100%}:host([placement*=bottom]) .tip{bottom:100%;transform:scaleY(-1)}:host([placement*=left]) .tip{transform:rotate(-90deg) translateY(-200%);transform-origin:100% 0}:host([placement*=right]) .tip{transform:rotate(90deg);transform-origin:0 0}::slotted(.visually-hidden){clip:rect(0,0,0,0);border:0;clip-path:inset(50%);height:1px;margin:0 -1px -1px 0;overflow:hidden;padding:0;position:absolute;white-space:nowrap;width:1px}
`,
  Ei = _i;
var Ai = Object.defineProperty,
  Ti = Object.getOwnPropertyDescriptor,
  Jt = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Ti(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Ai(t, e, o), o;
  };
class Mt extends ot {
  constructor() {
    super(...arguments),
      (this.dialog = !1),
      (this.open = !1),
      (this.placement = "none"),
      (this.tip = !1);
  }
  static get styles() {
    return [Ei];
  }
  renderTip() {
    return d`
            <div id="tip">
                <svg
                    xmlns="http://www.w3.org/svg/2000"
                    class="tip"
                    viewBox="0 0 24 12"
                >
                    <path
                        class="triangle"
                        d="M 0.7071067811865476 0 L 11.414213562373096 10.707106781186548 L 22.121320343559645 0"
                    ></path>
                </svg>
            </div>
        `;
  }
  connectedCallback() {
    super.connectedCallback(),
      this.addEventListener("sp-overlay-query", this.onOverlayQuery);
  }
  disconnectedCallback() {
    super.disconnectedCallback(),
      this.removeEventListener("sp-overlay-query", this.onOverlayQuery);
  }
  onOverlayQuery(t) {
    if (!t.target || t.target !== this) return;
    const e = this.shadowRoot.querySelector("#tip");
    e && (t.detail.overlayContentTipElement = e);
  }
  render() {
    return d`
            <slot></slot>
            ${this.tip ? this.renderTip() : z}
        `;
  }
}
Jt([l({ type: Boolean, reflect: !0 })], Mt.prototype, "dialog", 2),
  Jt([l({ type: Boolean, reflect: !0 })], Mt.prototype, "open", 2),
  Jt([l({ reflect: !0 })], Mt.prototype, "placement", 2),
  Jt([l({ type: Boolean, reflect: !0 })], Mt.prototype, "tip", 2);
customElements.define("sp-popover", Mt);
function bo(a, t, e) {
  const r = a.getAttribute(t);
  let o = r ? r.split(/\s+/) : [];
  (o = o.filter((s) => !e.find((i) => s === i))),
    o.length ? a.setAttribute(t, o.join(" ")) : a.removeAttribute(t);
}
function ho(a, t, e) {
  const r = Array.isArray(e) ? e : [e],
    o = a.getAttribute(t),
    s = o ? o.split(/\s+/) : [];
  return r.every((i) => s.indexOf(i) > -1)
    ? () => {}
    : (s.push(...r), a.setAttribute(t, s.join(" ")), () => bo(a, t, r));
}
const go = class {
  constructor(t, { mode: e } = { mode: "internal" }) {
    (this.mode = "internal"),
      (this.handleSlotchange = ({ target: r }) => {
        this.handleHelpText(r), this.handleNegativeHelpText(r);
      }),
      (this.host = t),
      (this.instanceCount = go.instanceCount++),
      (this.id = `sp-help-text-${this.instanceCount}`),
      (this.mode = e);
  }
  get isInternal() {
    return this.mode === "internal";
  }
  render(t) {
    return d`
            <div id=${C(this.isInternal ? this.id : void 0)}>
                <slot
                    name=${
                      t
                        ? "negative-help-text"
                        : `pass-through-help-text-${this.instanceCount}`
                    }
                    @slotchange=${this.handleSlotchange}
                >
                    <slot name="help-text"></slot>
                </slot>
            </div>
        `;
  }
  addId() {
    const t = this.helpTextElement ? this.helpTextElement.id : this.id;
    (this.conditionId = ho(this.host, "aria-describedby", t)),
      this.host.hasAttribute("tabindex") &&
        (this.previousTabindex = parseFloat(
          this.host.getAttribute("tabindex"),
        )),
      (this.host.tabIndex = 0);
  }
  removeId() {
    this.conditionId && (this.conditionId(), delete this.conditionId),
      !this.helpTextElement &&
        (this.previousTabindex
          ? (this.host.tabIndex = this.previousTabindex)
          : this.host.removeAttribute("tabindex"));
  }
  handleHelpText(t) {
    if (this.isInternal) return;
    this.helpTextElement &&
      this.helpTextElement.id === this.id &&
      this.helpTextElement.removeAttribute("id"),
      this.removeId();
    const e = t.assignedElements()[0];
    (this.helpTextElement = e), e && (e.id || (e.id = this.id), this.addId());
  }
  handleNegativeHelpText(t) {
    t.name === "negative-help-text" &&
      t.assignedElements().forEach((e) => (e.variant = "negative"));
  }
};
let vo = go;
vo.instanceCount = 0;
function fo(a, { mode: t } = { mode: "internal" }) {
  class e extends a {
    constructor() {
      super(...arguments), (this.helpTextManager = new vo(this, { mode: t }));
    }
    get helpTextId() {
      return this.helpTextManager.id;
    }
    renderHelpText(o) {
      return this.helpTextManager.render(o);
    }
  }
  return e;
}
const Oi = v`
:host{--spectrum-fieldgroup-margin:var(
--spectrum-spacing-300
);--spectrum-fieldgroup-readonly-delimiter:"\\002c"}.spectrum-FieldGroup--toplabel{flex-direction:column}.spectrum-FieldGroup--sidelabel{flex-direction:row}.group{align-items:top;display:flex;flex-direction:column;flex-wrap:wrap}:host([vertical]) .group{flex-direction:column}:host([horizontal]) .group{flex-direction:row}:host([horizontal]) .group slot:not([name])::slotted(:not(:last-child)){margin-inline-end:var(
--spectrum-fieldgroup-margin
)}:host([horizontal]) .group .spectrum-HelpText{flex-basis:100%}.spectrum-Checkbox.is-readOnly .spectrum-Checkbox-box{display:none}.spectrum-Checkbox.is-readOnly:not(:last-child) .spectrum-Checkbox-label:after{content:var(
--spectrum-fieldgroup-readonly-delimiter
)}:host([dir=rtl]:not([vertical])) slot:not([name])::slotted(:not(:last-child)),:host([horizontal][dir=rtl]) slot:not([name])::slotted(:not(:last-child)){margin:0 0 0 var(--spectrum-fieldgroup-margin)}:host([dir=ltr]:not([vertical])) slot:not([name])::slotted(:not(:last-child)),:host([horizontal][dir=ltr]) slot:not([name])::slotted(:not(:last-child)){margin:0 var(--spectrum-fieldgroup-margin) 0 0}
`,
  Pi = Oi;
var Ii = Object.defineProperty,
  Ni = Object.getOwnPropertyDescriptor,
  Qt = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Ni(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Ii(t, e, o), o;
  };
class Dt extends fo(ot, { mode: "external" }) {
  constructor() {
    super(...arguments),
      (this.horizontal = !1),
      (this.invalid = !1),
      (this.label = ""),
      (this.vertical = !1);
  }
  static get styles() {
    return [Pi];
  }
  handleSlotchange() {}
  render() {
    return d`
            <div class="group" role="presentation">
                <slot @slotchange=${this.handleSlotchange}></slot>
            </div>
            ${this.renderHelpText(this.invalid)}
        `;
  }
  updated(t) {
    super.updated(t),
      t.has("label") &&
        (this.label
          ? this.setAttribute("aria-label", this.label)
          : this.removeAttribute("aria-label"));
  }
}
Qt([l({ type: Boolean, reflect: !0 })], Dt.prototype, "horizontal", 2),
  Qt([l({ type: Boolean, reflect: !0 })], Dt.prototype, "invalid", 2),
  Qt([l()], Dt.prototype, "label", 2),
  Qt([l({ type: Boolean, reflect: !0 })], Dt.prototype, "vertical", 2);
customElements.define("sp-field-group", Dt);
const ji = () => pt`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 8 8"
    aria-hidden="true"
    fill="currentColor"
  >
    <path
      d="M6.575 6.555c.055.056.092.13 0 .2l-1.149.741c-.092.056-.129.019-.166-.074L3.834 4.94 1.963 7c-.019.036-.074.073-.129 0l-.889-.927c-.093-.055-.074-.111 0-.166l2.111-1.76L.648 3.24c-.037 0-.092-.074-.056-.167l.63-1.259a.097.097 0 01.167-.036L3.5 3.148l.13-2.7a.1.1 0 01.081-.111.15.15 0 01.03 0l1.537.2c.093 0 .111.037.093.13l-.723 2.647 2.445-.741c.055-.037.111-.037.148.074l.241 1.37c.018.093 0 .13-.074.13l-2.556.2z"
    />
  </svg>`;
class Li extends q {
  render() {
    return mt(d), ji();
  }
}
customElements.define("sp-icon-asterisk100", Li);
const Fi = v`
@media (forced-colors:active){.spectrum-Icon,.spectrum-UIIcon{forced-color-adjust:auto}}.spectrum-UIIcon-Asterisk75{height:var(--spectrum-alias-ui-icon-asterisk-size-300);width:var(
--spectrum-alias-ui-icon-asterisk-size-75,var(--spectrum-global-dimension-static-size-100)
)}.spectrum-UIIcon-Asterisk100{height:var(
--spectrum-alias-ui-icon-asterisk-size-100,var(--spectrum-global-dimension-size-100)
);width:var(
--spectrum-alias-ui-icon-asterisk-size-100,var(--spectrum-global-dimension-size-100)
)}.spectrum-UIIcon-Asterisk200{height:var(--spectrum-alias-ui-icon-asterisk-size-200);width:var(
--spectrum-alias-ui-icon-asterisk-size-200
)}.spectrum-UIIcon-Asterisk300{height:var(--spectrum-alias-ui-icon-asterisk-size-300);width:var(
--spectrum-alias-ui-icon-asterisk-size-300
)}
`,
  Mi = Fi,
  yo = Symbol("element resolver updated");
class Di {
  constructor(t, { selector: e } = { selector: "" }) {
    (this._element = null),
      (this._selector = ""),
      (this.mutationCallback = (r) => {
        let o = !1;
        r.forEach((s) => {
          if (!o) {
            if (s.type === "childList") {
              const i =
                  this.element && [...s.removedNodes].includes(this.element),
                c =
                  !!this.selector &&
                  [...s.addedNodes].some((n) => {
                    var u;
                    return (u = n == null ? void 0 : n.matches) == null
                      ? void 0
                      : u.call(n, this.selector);
                  });
              o = o || i || c;
            }
            if (s.type === "attributes") {
              const i = s.target === this.element,
                c = !!this.selector && s.target.matches(this.selector);
              o = o || i || c;
            }
          }
        }),
          o && this.resolveElement();
      }),
      (this.host = t),
      (this.selector = e),
      (this.observer = new MutationObserver(this.mutationCallback)),
      this.host.addController(this);
  }
  get element() {
    return this._element;
  }
  set element(t) {
    if (t === this.element) return;
    const e = this.element;
    (this._element = t), this.host.requestUpdate(yo, e);
  }
  get selector() {
    return this._selector;
  }
  set selector(t) {
    t !== this.selector &&
      (this.releaseElement(), (this._selector = t), this.resolveElement());
  }
  hostConnected() {
    this.resolveElement(),
      this.observer.observe(this.host.getRootNode(), {
        subtree: !0,
        childList: !0,
        attributes: !0,
      });
  }
  hostDisconnected() {
    this.releaseElement(), this.observer.disconnect();
  }
  resolveElement() {
    if (!this.selector) {
      this.releaseElement();
      return;
    }
    const t = this.host.getRootNode();
    this.element = t.querySelector(this.selector);
  }
  releaseElement() {
    this.element = null;
  }
}
const qi = v`
:host([size=s]){--spectrum-fieldlabel-top-to-text:var(
--spectrum-component-top-to-text-75
);--spectrum-fieldlabel-bottom-to-text:var(
--spectrum-component-bottom-to-text-75
);--spectrum-fieldlabel-font-size:var(--spectrum-font-size-75);--spectrum-fieldlabel-line-height:var(--spectrum-line-height-100);--spectrum-fieldlabel-line-height-cjk:var(--spectrum-line-height-cjk-100);--spectrum-fieldlabel-asterisk-gap:var(
--spectrum-field-label-top-to-asterisk-small
);--spectrum-fieldlabel-side-padding-top:var(
--spectrum-component-top-to-text-75
);--spectrum-fieldlabel-side-padding-right:var(--spectrum-spacing-100);--spectrum-field-label-text-to-asterisk:var(
--spectrum-field-label-text-to-asterisk-small
)}:host([size=m]){--spectrum-fieldlabel-top-to-text:var(
--spectrum-component-top-to-text-75
);--spectrum-fieldlabel-bottom-to-text:var(
--spectrum-component-bottom-to-text-75
);--spectrum-fieldlabel-font-size:var(--spectrum-font-size-75);--spectrum-fieldlabel-line-height:var(--spectrum-line-height-200);--spectrum-fieldlabel-line-height-cjk:var(--spectrum-line-height-cjk-200);--spectrum-fieldlabel-asterisk-gap:var(
--spectrum-field-label-top-to-asterisk-medium
);--spectrum-fieldlabel-side-padding-top:var(
--spectrum-component-top-to-text-75
);--spectrum-fieldlabel-side-padding-right:var(--spectrum-spacing-200);--spectrum-field-label-text-to-asterisk:var(
--spectrum-field-label-text-to-asterisk-medium
)}:host([size=l]){--spectrum-fieldlabel-top-to-text:var(
--spectrum-component-top-to-text-100
);--spectrum-fieldlabel-bottom-to-text:var(
--spectrum-component-bottom-to-text-100
);--spectrum-fieldlabel-font-size:var(--spectrum-font-size-100);--spectrum-fieldlabel-line-height:var(--spectrum-line-height-100);--spectrum-fieldlabel-line-height-cjk:var(--spectrum-line-height-cjk-100);--spectrum-fieldlabel-asterisk-gap:var(
--spectrum-field-label-top-to-asterisk-large
);--spectrum-fieldlabel-side-padding-top:var(
--spectrum-component-top-to-text-100
);--spectrum-fieldlabel-side-padding-right:var(--spectrum-spacing-200);--spectrum-field-label-text-to-asterisk:var(
--spectrum-field-label-text-to-asterisk-large
)}:host([size=xl]){--spectrum-fieldlabel-top-to-text:var(
--spectrum-component-top-to-text-200
);--spectrum-fieldlabel-bottom-to-text:var(
--spectrum-component-bottom-to-text-200
);--spectrum-fieldlabel-font-size:var(--spectrum-font-size-200);--spectrum-fieldlabel-line-height:var(--spectrum-line-height-200);--spectrum-fieldlabel-line-height-cjk:var(--spectrum-line-height-cjk-200);--spectrum-fieldlabel-asterisk-gap:var(
--spectrum-field-label-top-to-asterisk-extra-large
);--spectrum-fieldlabel-side-padding-top:var(
--spectrum-component-top-to-text-200
);--spectrum-fieldlabel-side-padding-right:var(--spectrum-spacing-200);--spectrum-field-label-text-to-asterisk:var(
--spectrum-field-label-text-to-asterisk-extra-large
)}:host{-webkit-font-smoothing:subpixel-antialiased;-moz-osx-font-smoothing:auto;font-smoothing:subpixel-antialiased;box-sizing:border-box;display:block;font-size:var(
--mod-fieldlabel-font-size,var(--spectrum-fieldlabel-font-size)
);font-weight:var(
--mod-font-weight-regular,var(--spectrum-font-weight-regular)
);line-height:var(
--mod-fieldlabel-line-height,var(--spectrum-fieldlabel-line-height)
);padding-block:var(--spectrum-fieldlabel-top-to-text) var(--spectrum-fieldlabel-bottom-to-text);padding-inline:0;vertical-align:top}:host(:lang(ja)),:host(:lang(ko)),:host(:lang(zh)){line-height:var(
--mod-fieldlabel-line-height-cjk,var(--spectrum-fieldlabel-line-height-cjk)
)}.required-icon{margin-block:0;margin-inline:var(
--mod-fieldlabel-asterisk-gap,var(--spectrum-fieldlabel-asterisk-gap)
) 0}:host([side-aligned=start]){display:inline-block;padding-block:var(
--mod-fieldlabel-side-padding-top,var(--spectrum-fieldlabel-side-padding-top)
) 0;padding-inline:0 var(
--mod-fieldlabel-side-padding-right,var(--spectrum-fieldlabel-side-padding-right)
)}:host([side-aligned=start]) .required-icon{margin-block:var(
--mod-field-label-text-to-asterisk,var(--spectrum-field-label-text-to-asterisk)
) 0;margin-inline:var(
--mod-fieldlabel-asterisk-gap,var(--spectrum-fieldlabel-asterisk-gap)
) 0}:host([side-aligned=end]){display:inline-block;padding-block:var(
--mod-fieldlabel-side-padding-top,var(--spectrum-fieldlabel-side-padding-top)
) 0;padding-inline:0 var(
--mod-fieldlabel-side-padding-right,var(--spectrum-fieldlabel-side-padding-right)
);text-align:end}:host([disabled]){color:var(
--mod-disabled-content-color,var(--spectrum-disabled-content-color)
)}:host([disabled]) .required-icon{color:var(
--mod-disabled-content-color,var(--spectrum-disabled-content-color)
)}
`,
  Bi = qi;
var Hi = Object.defineProperty,
  Ui = Object.getOwnPropertyDescriptor,
  kt = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Ui(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Hi(t, e, o), o;
  };
const ko = class extends dt(ot) {
  constructor() {
    super(...arguments),
      (this.disabled = !1),
      (this.id = ""),
      (this.for = ""),
      (this.required = !1),
      (this.resolvedElement = new Di(this));
  }
  static get styles() {
    return [Bi, Mi];
  }
  handleClick(t) {
    if (!this.target || this.disabled || t.defaultPrevented) return;
    this.target.focus();
    const e = this.getRootNode(),
      r = this.target,
      o = r.getRootNode(),
      s = o.host;
    o === e && r.forceFocusVisible
      ? r.forceFocusVisible()
      : s && s.forceFocusVisible && s.forceFocusVisible();
  }
  addTarget(t) {
    (this.target = t.focusElement || t),
      this.target.getRootNode() === this.getRootNode()
        ? ho(this.target, "aria-labelledby", [this.id])
        : this.target.setAttribute("aria-label", this.labelText);
  }
  removeTarget() {
    this.target &&
      (this.target.getRootNode() === this.getRootNode()
        ? bo(this.target, "aria-labelledby", [this.id])
        : this.target.removeAttribute("aria-label"));
  }
  async manageTarget() {
    this.removeTarget();
    const t = this.resolvedElement.element;
    if (!t) {
      this.target = t;
      return;
    }
    t.localName.search("-") > 0 &&
      (await customElements.whenDefined(t.localName)),
      typeof t.updateComplete < "u" && (await t.updateComplete),
      this.addTarget(t);
  }
  get labelText() {
    const t = this.slotEl.assignedNodes({ flatten: !0 });
    return t.length ? t.map((e) => (e.textContent || "").trim()).join(" ") : "";
  }
  render() {
    return d`
            <label>
                <slot></slot>
                ${
                  this.required
                    ? d`
                          <sp-icon-asterisk100
                              class="required-icon spectrum-UIIcon-Asterisk100"
                          ></sp-icon-asterisk100>
                      `
                    : d``
                }
            </label>
        `;
  }
  firstUpdated(t) {
    super.firstUpdated(t), this.addEventListener("click", this.handleClick);
  }
  willUpdate(t) {
    this.hasAttribute("id") ||
      this.setAttribute(
        "id",
        `${this.tagName.toLowerCase()}-${ko.instanceCount++}`,
      ),
      t.has("for") &&
        (this.resolvedElement.selector = this.for ? `#${this.for}` : ""),
      (t.has("id") || t.has(yo)) && this.manageTarget();
  }
};
let Q = ko;
(Q.instanceCount = 0),
  kt([l({ type: Boolean, reflect: !0 })], Q.prototype, "disabled", 2),
  kt([l({ type: String })], Q.prototype, "id", 2),
  kt([l({ type: String })], Q.prototype, "for", 2),
  kt([l({ type: Boolean, reflect: !0 })], Q.prototype, "required", 2),
  kt([W("slot")], Q.prototype, "slotEl", 2),
  kt(
    [l({ type: String, reflect: !0, attribute: "side-aligned" })],
    Q.prototype,
    "sideAligned",
    2,
  );
customElements.define("sp-field-label", Q);
var Ri = Object.defineProperty,
  Gi = Object.getOwnPropertyDescriptor,
  Ki = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Gi(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Ri(t, e, o), o;
  };
class ar extends j {
  constructor() {
    super(...arguments), (this.filters = []);
  }
  handleFilterChange() {
    var o;
    const r = [
      ...((o = this.shadowRoot) == null
        ? void 0
        : o.firstElementChild
      ).getElementsByTagName("sp-switch"),
    ].reduce((s, i) => {
      const c = i;
      return i.checked && s.push(c.getAttribute("value") || ""), s;
    }, []);
    x(this, "filters-selected", { value: r });
  }
  listOfOptions(t) {
    return Zo[t].map(
      (e) => d`
      <sp-switch emphasized value=${e} ?checked=${
        this.filters.indexOf(e) >= 0
      }>${e}</sp-switch>
    `,
    );
  }
  get listOfCategorizedOptionLists() {
    return Wo.map(
      (t) => d`
      <sp-field-label for=${t} size="xl">
        ${Jo[t]}
      </sp-field-label>
      <sp-field-group selected="first" name=${t} id=${t} vertical>
        ${this.listOfOptions(t)}
      </sp-field-group>
    `,
    );
  }
  render() {
    return d`
      <div @change=${this.handleFilterChange}>
        ${this.listOfCategorizedOptionLists}
      </div>
    `;
  }
}
ar.styles = v`

    :host {
      position: relative;
      display: block;
      padding-bottom: 20px;
    }

    sp-field-label {
      margin-top: 20px;
    }

    sp-switch {
      text-transform: capitalize;
    }
  `;
Ki([l({ type: Object })], ar.prototype, "filters", 2);
customElements.define("stvt-filters-menu", ar);
let Ve = class extends Tt {
  constructor(t) {
    if ((super(t), (this.it = z), t.type !== U.CHILD))
      throw Error(
        this.constructor.directiveName +
          "() can only be used in child bindings",
      );
  }
  render(t) {
    if (t === z || t == null) return (this._t = void 0), (this.it = t);
    if (t === M) return t;
    if (typeof t != "string")
      throw Error(
        this.constructor.directiveName + "() called with a non-string value",
      );
    if (t === this.it) return this._t;
    this.it = t;
    const e = [t];
    return (
      (e.raw = e),
      (this._t = {
        _$litType$: this.constructor.resultType,
        strings: e,
        values: [],
      })
    );
  }
};
(Ve.directiveName = "unsafeHTML"), (Ve.resultType = 1);
const Vi = At(Ve);
customElements.define("sp-clear-button", lo);
const Yi = () => pt`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 10 10"
    aria-hidden="true"
    fill="currentColor"
  >
    <path
      d="M3.5 9.5a.999.999 0 01-.774-.368l-2.45-3a1 1 0 111.548-1.264l1.657 2.028 4.68-6.01A1 1 0 019.74 2.114l-5.45 7a1 1 0 01-.777.386z"
    />
  </svg>`;
class Xi extends q {
  render() {
    return mt(d), Yi();
  }
}
customElements.define("sp-icon-checkmark100", Xi);
const Wi = v`
:host{--spectrum-textfield-texticon-padding-left:var(
--spectrum-textfield-m-texticon-padding-left
);--spectrum-textfield-quiet-texticon-border-bottom-size:var(
--spectrum-textfield-m-quiet-texticon-border-bottom-size,var(--spectrum-alias-input-border-size)
);--spectrum-textfield-quiet-texticon-success-icon-margin-left:var(
--spectrum-textfield-m-quiet-texticon-success-icon-margin-left,var(--spectrum-global-dimension-size-150)
);--spectrum-textfield-quiet-texticon-invalid-icon-margin-left:var(
--spectrum-textfield-m-quiet-texticon-invalid-icon-margin-left,var(--spectrum-global-dimension-size-150)
);--spectrum-textfield-quiet-texticon-border-radius:var(
--spectrum-textfield-m-quiet-texticon-border-radius,var(--spectrum-global-dimension-size-0)
);--spectrum-textfield-quiet-texticon-padding-left:var(
--spectrum-textfield-m-quiet-texticon-padding-left,var(--spectrum-global-dimension-size-0)
);--spectrum-textfield-quiet-texticon-padding-right:var(
--spectrum-textfield-m-quiet-texticon-padding-right,var(--spectrum-global-dimension-size-0)
);--spectrum-textfield-texticon-border-size:var(
--spectrum-textfield-m-texticon-border-size,var(--spectrum-alias-input-border-size)
);--spectrum-textfield-texticon-text-line-height:var(
--spectrum-textfield-m-texticon-text-line-height,var(--spectrum-alias-component-text-line-height)
);--spectrum-textfield-texticon-text-size:var(
--spectrum-textfield-m-texticon-text-size,var(--spectrum-global-dimension-font-size-100)
);--spectrum-textfield-texticon-placeholder-text-font-style:var(
--spectrum-textfield-m-texticon-placeholder-text-font-style,var(--spectrum-global-font-style-italic)
);--spectrum-textfield-texticon-placeholder-text-font-weight:var(
--spectrum-textfield-m-texticon-placeholder-text-font-weight,var(--spectrum-global-font-weight-regular)
);--spectrum-textfield-texticon-success-icon-height:var(
--spectrum-textfield-m-texticon-success-icon-height,var(--spectrum-alias-ui-icon-checkmark-size-100)
);--spectrum-textfield-texticon-success-icon-width:var(
--spectrum-textfield-m-texticon-success-icon-width,var(--spectrum-alias-ui-icon-checkmark-size-100)
);--spectrum-textfield-texticon-success-icon-margin-left:var(
--spectrum-textfield-m-texticon-success-icon-margin-left,var(--spectrum-global-dimension-size-150)
);--spectrum-textfield-texticon-invalid-icon-height:var(
--spectrum-textfield-m-texticon-invalid-icon-height,var(--spectrum-alias-ui-icon-alert-size-100)
);--spectrum-textfield-texticon-invalid-icon-width:var(
--spectrum-textfield-m-texticon-invalid-icon-width,var(--spectrum-alias-ui-icon-alert-size-100)
);--spectrum-textfield-texticon-invalid-icon-margin-left:var(
--spectrum-textfield-m-texticon-invalid-icon-margin-left,var(--spectrum-global-dimension-size-150)
);--spectrum-textfield-texticon-min-width:var(
--spectrum-textfield-m-texticon-min-width,var(--spectrum-global-dimension-size-600)
);--spectrum-textfield-texticon-border-radius:var(
--spectrum-textfield-m-texticon-border-radius,var(--spectrum-alias-border-radius-regular)
);--spectrum-textfield-texticon-padding-right:var(
--spectrum-textfield-m-texticon-padding-right,var(--spectrum-global-dimension-size-150)
);--spectrum-textfield-texticon-height:var(
--spectrum-textfield-m-texticon-height,var(--spectrum-global-dimension-size-400)
);--spectrum-textarea-text-padding-top:var(
--spectrum-textarea-m-text-padding-top,var(--spectrum-global-dimension-size-75)
);--spectrum-textarea-text-padding-bottom:var(
--spectrum-textarea-m-text-padding-bottom,var(--spectrum-global-dimension-size-115)
);--spectrum-textarea-padding-left:var(
--spectrum-textarea-m-padding-left,var(--spectrum-global-dimension-size-150)
);--spectrum-textarea-padding-right:var(
--spectrum-textarea-m-padding-right,var(--spectrum-global-dimension-size-150)
);--spectrum-textarea-height:var(
--spectrum-textarea-m-height,var(--spectrum-global-dimension-size-400)
);--spectrum-textfield-texticon-padding-top:3px;--spectrum-textfield-texticon-padding-bottom:5px;--spectrum-textfield-texticon-text-font-family:var(
--spectrum-alias-body-text-font-family,var(--spectrum-global-font-family-base)
);--spectrum-textfield-texticon-icon-gap:var(
--spectrum-global-dimension-size-65
);--spectrum-textfield-quiet-texticon-icon-gap:var(
--spectrum-global-dimension-size-75
);--spectrum-textarea-min-height:var(--spectrum-textarea-height);--spectrum-textarea-height-adjusted:auto;--spectrum-textarea-padding-top:var(--spectrum-textarea-text-padding-top);--spectrum-textarea-padding-bottom:var(
--spectrum-textarea-text-padding-bottom
)}#textfield{display:inline-flex;min-width:var(--spectrum-textfield-texticon-min-width);position:relative;width:var(
--spectrum-alias-single-line-width,var(--spectrum-global-dimension-size-2400)
)}:host([quiet][multiline]) #textfield .input{height:var(
--spectrum-textfield-texticon-height
);min-height:var(--spectrum-textfield-texticon-height)}#textfield:after{border-color:transparent;border-radius:calc(var(--spectrum-textfield-texticon-border-radius) + var(
--spectrum-textfield-m-texticon-focus-ring-gap,
var(--spectrum-alias-input-focusring-gap)
));bottom:0;content:"";left:0;margin:calc(var(
--spectrum-textfield-m-texticon-focus-ring-gap,
var(--spectrum-alias-input-focusring-gap)
)*-1);pointer-events:none;position:absolute;right:0;top:0;transition:box-shadow var(--spectrum-global-animation-duration-100,.13s) ease-in-out,border-color var(--spectrum-global-animation-duration-100,.13s) ease-in-out}:host([quiet]) #textfield:after{border-radius:0}.input{-webkit-appearance:none;-moz-appearance:textfield;border:var(--spectrum-textfield-texticon-border-size) solid;border-radius:var(--spectrum-textfield-texticon-border-radius);box-sizing:border-box;font-family:var(--spectrum-textfield-texticon-text-font-family);font-size:var(--spectrum-textfield-texticon-text-size);height:var(--spectrum-textfield-texticon-height);line-height:var(--spectrum-textfield-texticon-text-line-height);margin:0;outline:none;overflow:visible;padding:var(--spectrum-textfield-texticon-padding-top) var(--spectrum-textfield-texticon-padding-right) var(--spectrum-textfield-texticon-padding-bottom) calc(var(--spectrum-textfield-texticon-padding-left) + 1px);text-indent:0;text-overflow:ellipsis;transition:border-color var(--spectrum-global-animation-duration-100,.13s) ease-in-out;vertical-align:top;width:100%}.input::placeholder{font-style:var(--spectrum-textfield-texticon-placeholder-text-font-style);font-weight:var(
--spectrum-textfield-texticon-placeholder-text-font-weight
);opacity:1;transition:color var(--spectrum-global-animation-duration-100,.13s) ease-in-out}.input:lang(ja)::placeholder,.input:lang(ko)::placeholder,.input:lang(zh)::placeholder{font-style:normal}.input:hover::placeholder{font-weight:var(
--spectrum-textfield-texticon-placeholder-text-font-weight
)}.input:disabled{opacity:1;resize:none}.input:disabled::placeholder{font-weight:var(
--spectrum-textfield-texticon-placeholder-text-font-weight
)}.input::-ms-clear{height:0;width:0}.input::-webkit-inner-spin-button,.input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.input:-moz-ui-invalid{box-shadow:none}:host([dir=ltr][valid]) #textfield .input{padding-right:calc(var(--spectrum-textfield-texticon-padding-right) + var(--spectrum-textfield-texticon-success-icon-width) + var(
--spectrum-textfield-icon-inline-end-override,
var(--spectrum-textfield-texticon-success-icon-margin-left)
))}:host([dir=rtl][valid]) #textfield .input{padding-left:calc(var(--spectrum-textfield-texticon-padding-right) + var(--spectrum-textfield-texticon-success-icon-width) + var(
--spectrum-textfield-icon-inline-end-override,
var(--spectrum-textfield-texticon-success-icon-margin-left)
))}:host([dir=ltr][invalid]) #textfield .input{padding-right:calc(var(--spectrum-textfield-texticon-padding-right) + var(--spectrum-textfield-texticon-invalid-icon-width) + var(
--spectrum-textfield-icon-inline-end-override,
var(--spectrum-textfield-texticon-invalid-icon-margin-left)
))}:host([dir=rtl][invalid]) #textfield .input{padding-left:calc(var(--spectrum-textfield-texticon-padding-right) + var(--spectrum-textfield-texticon-invalid-icon-width) + var(
--spectrum-textfield-icon-inline-end-override,
var(--spectrum-textfield-texticon-invalid-icon-margin-left)
))}:host([multiline]) .input{height:var(
--spectrum-textarea-height-adjusted
);min-height:var(--spectrum-textarea-min-height);overflow:auto;padding:var(--spectrum-textarea-padding-top) var(--spectrum-textarea-padding-right) var(--spectrum-textarea-padding-bottom) calc(var(--spectrum-textarea-padding-left) - 1px)}:host([dir=ltr][quiet]) .input{padding-left:var(
--spectrum-textfield-quiet-texticon-padding-left
)}:host([dir=rtl][quiet]) .input{padding-right:var(
--spectrum-textfield-quiet-texticon-padding-left
)}:host([dir=ltr][quiet]) .input{padding-right:var(
--spectrum-textfield-quiet-texticon-padding-right
)}:host([dir=rtl][quiet]) .input{padding-left:var(
--spectrum-textfield-quiet-texticon-padding-right
)}:host([quiet]) .input{border-bottom-width:var(
--spectrum-textfield-quiet-texticon-border-bottom-size
);border-left-width:0;border-radius:var(
--spectrum-textfield-quiet-texticon-border-radius
);border-right-width:0;border-top-width:0;overflow-y:hidden;resize:none}:host([dir=ltr][invalid][quiet]) .input{padding-right:calc(var(--spectrum-textfield-texticon-invalid-icon-width) + var(--spectrum-textfield-quiet-texticon-invalid-icon-margin-left))}:host([dir=rtl][invalid][quiet]) .input{padding-left:calc(var(--spectrum-textfield-texticon-invalid-icon-width) + var(--spectrum-textfield-quiet-texticon-invalid-icon-margin-left))}:host([dir=ltr][valid][quiet]) .input{padding-right:calc(var(--spectrum-textfield-texticon-success-icon-width) + var(--spectrum-textfield-quiet-texticon-success-icon-margin-left))}:host([dir=rtl][valid][quiet]) .input{padding-left:calc(var(--spectrum-textfield-texticon-success-icon-width) + var(--spectrum-textfield-quiet-texticon-success-icon-margin-left))}.icon{pointer-events:all;position:absolute}:host([dir=ltr][quiet]) .icon{padding-right:0}:host([dir=rtl][quiet]) .icon{padding-left:0}:host([dir=ltr][invalid]) #textfield .icon{right:var(
--spectrum-textfield-icon-inline-end-override,var(--spectrum-textfield-texticon-invalid-icon-margin-left)
)}:host([dir=rtl][invalid]) #textfield .icon{left:var(
--spectrum-textfield-icon-inline-end-override,var(--spectrum-textfield-texticon-invalid-icon-margin-left)
)}:host([invalid]) #textfield .icon{bottom:calc(var(--spectrum-textfield-texticon-height)/2 - var(--spectrum-textfield-texticon-invalid-icon-height)/2);height:var(--spectrum-textfield-texticon-invalid-icon-height);width:var(
--spectrum-textfield-texticon-invalid-icon-width
)}:host([dir=ltr][quiet][invalid]) #textfield .icon{right:var(
--spectrum-textfield-icon-inline-end-override,0
)}:host([dir=rtl][quiet][invalid]) #textfield .icon{left:var(
--spectrum-textfield-icon-inline-end-override,0
)}:host([dir=ltr][valid]) #textfield .icon{right:var(
--spectrum-textfield-icon-inline-end-override,var(--spectrum-textfield-texticon-success-icon-margin-left)
)}:host([dir=rtl][valid]) #textfield .icon{left:var(
--spectrum-textfield-icon-inline-end-override,var(--spectrum-textfield-texticon-success-icon-margin-left)
)}:host([valid]) #textfield .icon{bottom:calc(var(--spectrum-textfield-texticon-height)/2 - var(--spectrum-textfield-texticon-success-icon-height)/2);height:var(--spectrum-textfield-texticon-success-icon-height);width:var(
--spectrum-textfield-texticon-success-icon-width
)}:host([dir=ltr][quiet][valid]) #textfield .icon{right:var(
--spectrum-textfield-icon-inline-end-override,0
)}:host([dir=rtl][quiet][valid]) #textfield .icon{left:var(
--spectrum-textfield-icon-inline-end-override,0
)}:host([dir=ltr]) .icon-workflow{left:var(
--spectrum-textfield-texticon-padding-left
)}:host([dir=rtl]) .icon-workflow{right:var(
--spectrum-textfield-texticon-padding-left
)}.icon-workflow{display:block;height:var(
--spectrum-alias-workflow-icon-size-m,var(--spectrum-global-dimension-size-225)
);position:absolute;top:calc(var(--spectrum-textfield-texticon-height)/2 - var(
--spectrum-alias-workflow-icon-size-m,
var(--spectrum-global-dimension-size-225)
)/2);width:var(
--spectrum-alias-workflow-icon-size-m,var(--spectrum-global-dimension-size-225)
)}:host([dir=ltr][quiet]) .icon-workflow{left:0}:host([dir=rtl][quiet]) .icon-workflow{right:0}:host([dir=ltr][quiet]) .icon-workflow~.input{padding-left:calc(var(
--spectrum-alias-workflow-icon-size-m,
var(--spectrum-global-dimension-size-225)
) + var(--spectrum-textfield-quiet-texticon-icon-gap))}:host([dir=rtl][quiet]) .icon-workflow~.input{padding-right:calc(var(
--spectrum-alias-workflow-icon-size-m,
var(--spectrum-global-dimension-size-225)
) + var(--spectrum-textfield-quiet-texticon-icon-gap))}:host([dir=ltr]) .icon-workflow+.input{padding-left:calc(var(--spectrum-textfield-texticon-padding-left) + var(
--spectrum-alias-workflow-icon-size-m,
var(--spectrum-global-dimension-size-225)
) + var(--spectrum-textfield-texticon-icon-gap))}:host([dir=rtl]) .icon-workflow+.input{padding-right:calc(var(--spectrum-textfield-texticon-padding-left) + var(
--spectrum-alias-workflow-icon-size-m,
var(--spectrum-global-dimension-size-225)
) + var(--spectrum-textfield-texticon-icon-gap))}:host([multiline]) .icon-workflow~.input{height:var(
--spectrum-textfield-texticon-height
);min-height:var(--spectrum-textfield-texticon-height)}#textfield:hover .input{border-color:var(
--spectrum-textfield-m-texticon-border-color-hover,var(--spectrum-alias-input-border-color-hover)
);box-shadow:none}#textfield:hover .input::placeholder{color:var(
--spectrum-textfield-m-texticon-placeholder-text-color-hover,var(--spectrum-alias-placeholder-text-color-hover)
)}#textfield:hover .icon-workflow{color:var(
--spectrum-textfield-m-texticon-icon-color-hover,var(--spectrum-alias-component-icon-color-hover)
)}#textfield:active .input{border-color:var(
--spectrum-textfield-m-texticon-border-color-down,var(--spectrum-alias-input-border-color-down)
)}#textfield:active .icon-workflow{color:var(
--spectrum-textfield-m-texticon-icon-color-down,var(--spectrum-alias-component-icon-color-down)
)}:host([valid]) #textfield .icon{color:var(
--spectrum-textfield-m-texticon-validation-icon-color-valid,var(--spectrum-semantic-positive-icon-color)
)}:host([invalid]) #textfield .icon{color:var(
--spectrum-textfield-m-texticon-validation-icon-color-invalid,var(--spectrum-semantic-negative-icon-color)
)}:host([invalid]) #textfield:hover .input{border-color:var(
--spectrum-textfield-m-texticon-border-color-invalid-hover,var(--spectrum-alias-input-border-color-invalid-hover)
)}:host([disabled]) #textfield .icon{color:var(
--spectrum-textfield-m-texticon-validation-icon-color-invalid-disabled,var(--spectrum-alias-background-color-transparent)
)}:host([disabled]) #textfield .icon-workflow{color:var(
--spectrum-textfield-m-texticon-icon-color-disabled,var(--spectrum-alias-component-icon-color-disabled)
)}.icon-workflow{color:var(
--spectrum-textfield-m-texticon-icon-color,var(--spectrum-alias-component-icon-color-default)
)}:host([focused]) #textfield:after{box-shadow:0 0 0 var(
--spectrum-textfield-m-texticon-focus-ring-border-width,var(--spectrum-alias-component-focusring-size)
) var(
--spectrum-textfield-m-textonly-focus-ring-border-color-key-focus,var(--spectrum-alias-focus-ring-color)
)}:host([focused][quiet]) #textfield .input{box-shadow:none}:host([focused][quiet]) #textfield:after{border-bottom:2px solid var(
--spectrum-textfield-m-textonly-focus-ring-border-color-key-focus,var(--spectrum-alias-focus-ring-color)
);bottom:calc(var(
--spectrum-alias-input-quiet-focusline-gap,
var(--spectrum-global-dimension-static-size-10)
)*-1);box-shadow:none;margin:0}.input{background-color:var(
--spectrum-textfield-m-texticon-background-color,var(--spectrum-global-color-gray-50)
);border-color:var(
--spectrum-textfield-m-texticon-border-color,var(--spectrum-alias-input-border-color-default)
);color:var(
--spectrum-textfield-m-texticon-text-color,var(--spectrum-alias-component-text-color-default)
)}.input::placeholder{color:var(
--spectrum-textfield-m-texticon-placeholder-text-color,var(--spectrum-global-color-gray-600)
)}.input:focus,:host([focused]) #textfield .input{border-color:var(
--spectrum-textfield-m-texticon-border-color-down,var(--spectrum-alias-input-border-color-down)
)}.input.focus-visible,:host([focused]) #textfield .input{border-color:var(
--spectrum-textfield-m-texticon-border-color-key-focus,var(--spectrum-alias-input-border-color-key-focus)
)}.input:focus-visible,:host([focused]) #textfield .input{border-color:var(
--spectrum-textfield-m-texticon-border-color-key-focus,var(--spectrum-alias-input-border-color-key-focus)
)}:host([invalid]) #textfield .input{border-color:var(
--spectrum-textfield-m-texticon-border-color-invalid,var(--spectrum-alias-input-border-color-invalid-default)
)}:host([focused][invalid]) #textfield .input,:host([invalid]) #textfield .input:focus{border-color:var(
--spectrum-textfield-m-texticon-border-color-invalid-mouse-focus,var(--spectrum-alias-input-border-color-invalid-mouse-focus)
)}:host([focused][invalid]) #textfield .input,:host([invalid]) #textfield .input.focus-visible{border-color:var(
--spectrum-textfield-m-texticon-border-color-invalid-key-focus,var(--spectrum-alias-input-border-color-invalid-key-focus)
)}:host([focused][invalid]) #textfield .input,:host([invalid]) #textfield .input:focus-visible{border-color:var(
--spectrum-textfield-m-texticon-border-color-invalid-key-focus,var(--spectrum-alias-input-border-color-invalid-key-focus)
)}.input :disabled,:host([disabled]) #textfield .input,:host([disabled]) #textfield:hover .input{-webkit-text-fill-color:var(
--spectrum-textfield-m-texticon-text-color-disabled,var(--spectrum-alias-component-text-color-disabled)
);background-color:var(
--spectrum-textfield-m-texticon-background-color-disabled,var(--spectrum-global-color-gray-200)
);border-color:var(
--spectrum-textfield-m-texticon-border-color-disabled,var(--spectrum-alias-input-border-color-disabled)
);color:var(
--spectrum-textfield-m-texticon-text-color-disabled,var(--spectrum-alias-component-text-color-disabled)
)}.input :disabled::placeholder,:host([disabled]) #textfield .input::placeholder,:host([disabled]) #textfield:hover .input::placeholder{color:var(
--spectrum-textfield-m-texticon-placeholder-text-color-disabled,var(--spectrum-alias-text-color-disabled)
)}.input:read-only,:host([readonly]) #textfield .input,:host([readonly]) #textfield:hover .input{-webkit-text-fill-color:var(--spectrum-global-color-gray-800);background-color:var(
--spectrum-alias-background-color-transparent,transparent
);border-color:var(
--spectrum-alias-background-color-transparent,transparent
);color:var(--spectrum-global-color-gray-800)}:host([quiet]) .input{background-color:var(
--spectrum-textfield-m-quiet-texticon-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-textfield-m-quiet-texticon-border-color,var(--spectrum-alias-input-border-color-default)
)}:host([focused][quiet]) #textfield .input,:host([quiet]) .input:focus{border-color:var(
--spectrum-textfield-m-quiet-texticon-border-color-mouse-focus,var(--spectrum-alias-input-border-color-mouse-focus)
)}:host([focused][quiet]) #textfield .input,:host([quiet]) .input.focus-visible{border-color:var(
--spectrum-textfield-m-texticon-border-color-key-focus,var(--spectrum-alias-input-border-color-key-focus)
);box-shadow:0 1px 0 var(
--spectrum-textfield-m-texticon-border-color-key-focus,var(--spectrum-alias-input-border-color-key-focus)
)}:host([focused][quiet]) #textfield .input,:host([quiet]) .input:focus-visible{border-color:var(
--spectrum-textfield-m-texticon-border-color-key-focus,var(--spectrum-alias-input-border-color-key-focus)
);box-shadow:0 1px 0 var(
--spectrum-textfield-m-texticon-border-color-key-focus,var(--spectrum-alias-input-border-color-key-focus)
)}:host([invalid][quiet]) #textfield .input{border-color:var(
--spectrum-textfield-m-quiet-texticon-border-color-invalid,var(--spectrum-alias-input-border-color-invalid-default)
)}:host([focused][invalid][quiet]) #textfield .input,:host([invalid][quiet]) #textfield .input:focus{border-color:var(
--spectrum-textfield-m-quiet-texticon-border-color-invalid-mouse-focus,var(--spectrum-alias-input-border-color-invalid-mouse-focus)
)}:host([focused][invalid][quiet]) #textfield .input,:host([invalid][quiet]) #textfield .input.focus-visible{border-color:var(
--spectrum-textfield-m-quiet-texticon-border-color-invalid-key-focus,var(--spectrum-alias-input-border-color-invalid-key-focus)
);box-shadow:0 1px 0 var(
--spectrum-textfield-m-quiet-texticon-border-color-invalid-key-focus,var(--spectrum-alias-input-border-color-invalid-key-focus)
)}:host([focused][invalid][quiet]) #textfield .input,:host([invalid][quiet]) #textfield .input:focus-visible{border-color:var(
--spectrum-textfield-m-quiet-texticon-border-color-invalid-key-focus,var(--spectrum-alias-input-border-color-invalid-key-focus)
);box-shadow:0 1px 0 var(
--spectrum-textfield-m-quiet-texticon-border-color-invalid-key-focus,var(--spectrum-alias-input-border-color-invalid-key-focus)
)}:host([disabled][quiet]) #textfield .input,:host([disabled][quiet]) #textfield:hover .input,:host([quiet]) .input :disabled{background-color:var(
--spectrum-textfield-m-quiet-texticon-background-color-disabled,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-textfield-m-quiet-texticon-border-color-disabled,var(--spectrum-alias-input-border-color-quiet-disabled)
)}@media (forced-colors:active){#textfield{--spectrum-textfield-m-quiet-texticon-border-color-disabled:GrayText;--spectrum-textfield-m-quiet-texticon-border-color-down:Highlight;--spectrum-textfield-m-quiet-texticon-border-color-hover:Highlight;--spectrum-textfield-m-quiet-texticon-border-color-invalid:Highlight;--spectrum-textfield-m-quiet-texticon-border-color-invalid-key-focus:Highlight;--spectrum-textfield-m-quiet-texticon-border-color-invalid-mouse-focus:Highlight;--spectrum-textfield-m-quiet-texticon-border-color-mouse-focus:Highlight;--spectrum-textfield-m-texticon-border-color-disabled:GrayText;--spectrum-textfield-m-texticon-border-color-down:Highlight;--spectrum-textfield-m-texticon-border-color-hover:Highlight;--spectrum-textfield-m-texticon-border-color-invalid:Highlight;--spectrum-textfield-m-texticon-border-color-invalid-hover:Highlight;--spectrum-textfield-m-texticon-border-color-invalid-key-focus:Highlight;--spectrum-textfield-m-texticon-border-color-invalid-mouse-focus:Highlight;--spectrum-textfield-m-texticon-border-color-key-focus:Highlight;--spectrum-textfield-m-texticon-placeholder-text-color:GrayText;--spectrum-textfield-m-texticon-placeholder-text-color-disabled:GrayText;--spectrum-textfield-m-texticon-placeholder-text-color-hover:GrayText;--spectrum-textfield-m-texticon-text-color-disabled:GrayText;--spectrum-textfield-m-textonly-focus-ring-border-color-key-focus:Highlight;--spectrum-textfield-m-texticon-focus-ring-border-width:2px}:host([focused]) #textfield:after{forced-color-adjust:none}}:host{display:inline-flex;flex-direction:column;width:var(
--spectrum-alias-single-line-width,var(--spectrum-global-dimension-size-2400)
)}:host([multiline]){resize:both}:host([multiline][readonly]){resize:none}#textfield{width:100%}#textfield,textarea{resize:inherit}.input{min-width:var(--spectrum-textfield-texticon-min-width)}:host([focused]) .input{caret-color:var(--swc-test-caret-color);forced-color-adjust:var(--swc-test-forced-color-adjust)}:host([grows]) .input{height:100%;left:0;overflow:hidden;position:absolute;resize:none;top:0}:host([grows]) #sizer{-webkit-appearance:none;-moz-appearance:textfield;border:var(--spectrum-textfield-texticon-border-size) solid;border-radius:var(--spectrum-textfield-texticon-border-radius);box-sizing:border-box;font-family:var(--spectrum-textfield-texticon-text-font-family);font-size:var(--spectrum-textfield-texticon-text-size);line-height:var(--spectrum-textfield-texticon-text-line-height);margin:0;outline:none;overflow:visible;overflow-wrap:break-word;padding:var(--spectrum-textarea-padding-top) var(--spectrum-textarea-padding-right) var(--spectrum-textarea-padding-bottom) calc(var(--spectrum-textarea-padding-left) - 1px);text-indent:0;text-overflow:ellipsis;transition:border-color var(--spectrum-global-animation-duration-100,.13s) ease-in-out,box-shadow var(--spectrum-global-animation-duration-100,.13s) ease-in-out;vertical-align:top;white-space:pre-wrap;width:100%;word-break:break-word}:host([grows][quiet]) #sizer{border-radius:var(--spectrum-textfield-quiet-texticon-border-radius);border-width:0 0 var(--spectrum-textfield-quiet-texticon-border-size) 0;overflow-y:hidden;resize:none}.icon,.icon-workflow{pointer-events:none}:host([multiline]) #textfield{display:inline-grid}:host([multiline]) textarea{transition:box-shadow var(--spectrum-global-animation-duration-100,.13s) ease-in-out,border-color var(--spectrum-global-animation-duration-100,.13s) ease-in-out}:host([multiline][focused]:not([quiet])) textarea,:host([multiline][focused]:not([quiet]):hover) textarea{box-shadow:0 0 0 calc(var(
--spectrum-textfield-m-texticon-focus-ring-border-width,
var(--spectrum-alias-component-focusring-size)
)) var(
--spectrum-textfield-m-textonly-focus-ring-border-color-key-focus,var(--spectrum-alias-focus-ring-color)
)!important}:host([multiline]:not([quiet])) #textfield:after{box-shadow:none}
`,
  Zi = Wi,
  Ji = v`
@media (forced-colors:active){.spectrum-Icon,.spectrum-UIIcon{forced-color-adjust:auto}}.spectrum-UIIcon-Checkmark50{height:var(--spectrum-alias-ui-icon-checkmark-size-50);width:var(
--spectrum-alias-ui-icon-checkmark-size-50
)}.spectrum-UIIcon-Checkmark75{height:var(--spectrum-alias-ui-icon-checkmark-size-75);width:var(
--spectrum-alias-ui-icon-checkmark-size-75
)}.spectrum-UIIcon-Checkmark100{height:var(--spectrum-alias-ui-icon-checkmark-size-100);width:var(
--spectrum-alias-ui-icon-checkmark-size-100
)}.spectrum-UIIcon-Checkmark200{height:var(--spectrum-alias-ui-icon-checkmark-size-200);width:var(
--spectrum-alias-ui-icon-checkmark-size-200
)}.spectrum-UIIcon-Checkmark300{height:var(--spectrum-alias-ui-icon-checkmark-size-300);width:var(
--spectrum-alias-ui-icon-checkmark-size-300
)}.spectrum-UIIcon-Checkmark400{height:var(--spectrum-alias-ui-icon-checkmark-size-400);width:var(
--spectrum-alias-ui-icon-checkmark-size-400
)}.spectrum-UIIcon-Checkmark500{height:var(--spectrum-alias-ui-icon-checkmark-size-500);width:var(
--spectrum-alias-ui-icon-checkmark-size-500
)}.spectrum-UIIcon-Checkmark600{height:var(--spectrum-alias-ui-icon-checkmark-size-600);width:var(
--spectrum-alias-ui-icon-checkmark-size-600
)}
`,
  Qi = Ji;
var tc = Object.defineProperty,
  ec = Object.getOwnPropertyDescriptor,
  _ = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? ec(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && tc(t, e, o), o;
  };
const rc = ["text", "url", "tel", "email", "password"];
class E extends fo(et) {
  constructor() {
    super(...arguments),
      (this.allowedKeys = ""),
      (this.focused = !1),
      (this.invalid = !1),
      (this.label = ""),
      (this.placeholder = ""),
      (this._type = "text"),
      (this.grows = !1),
      (this.maxlength = -1),
      (this.minlength = -1),
      (this.multiline = !1),
      (this.readonly = !1),
      (this.valid = !1),
      (this._value = ""),
      (this.quiet = !1),
      (this.required = !1);
  }
  static get styles() {
    return [Zi, Qi];
  }
  get type() {
    var t;
    return (t = rc.find((e) => e === this._type)) != null ? t : "text";
  }
  set type(t) {
    const e = this._type;
    (this._type = t), this.requestUpdate("type", e);
  }
  set value(t) {
    if (t === this.value) return;
    const e = this._value;
    (this._value = t), this.requestUpdate("value", e);
  }
  get value() {
    return this._value;
  }
  get focusElement() {
    return this.inputElement;
  }
  setSelectionRange(t, e, r = "none") {
    this.inputElement.setSelectionRange(t, e, r);
  }
  select() {
    this.inputElement.select();
  }
  handleInput() {
    if (
      this.allowedKeys &&
      this.inputElement.value &&
      !new RegExp(`^[${this.allowedKeys}]*$`, "u").test(this.inputElement.value)
    ) {
      const t = this.inputElement.selectionStart - 1;
      (this.inputElement.value = this.value.toString()),
        this.inputElement.setSelectionRange(t, t);
      return;
    }
    this.value = this.inputElement.value;
  }
  handleChange() {
    this.dispatchEvent(new Event("change", { bubbles: !0, composed: !0 }));
  }
  onFocus() {
    this.focused = !this.readonly && !0;
  }
  onBlur() {
    this.focused = !this.readonly && !1;
  }
  renderStateIcons() {
    return this.invalid
      ? d`
                <sp-icon-alert id="invalid" class="icon"></sp-icon-alert>
            `
      : this.valid
      ? d`
                <sp-icon-checkmark100
                    id="valid"
                    class="icon spectrum-UIIcon-Checkmark100"
                ></sp-icon-checkmark100>
            `
      : z;
  }
  get displayValue() {
    return this.value.toString();
  }
  get renderMultiline() {
    return d`
            ${
              this.grows && !this.quiet
                ? d`
                      <div id="sizer">${this.value}&#8203;</div>
                  `
                : z
            }
            <!-- @ts-ignore -->
            <textarea
                aria-describedby=${this.helpTextId}
                aria-label=${this.label || this.placeholder}
                aria-invalid=${C(this.invalid || void 0)}
                class="input"
                maxlength=${C(this.maxlength > -1 ? this.maxlength : void 0)}
                minlength=${C(this.minlength > -1 ? this.minlength : void 0)}
                pattern=${C(this.pattern)}
                placeholder=${this.placeholder}
                .value=${this.displayValue}
                @change=${this.handleChange}
                @input=${this.handleInput}
                @focus=${this.onFocus}
                @blur=${this.onBlur}
                ?disabled=${this.disabled}
                ?required=${this.required}
                ?readonly=${this.readonly}
                autocomplete=${C(this.autocomplete)}
            ></textarea>
        `;
  }
  get renderInput() {
    return d`
            <!-- @ts-ignore -->
            <input
                type=${this.type}
                aria-describedby=${this.helpTextId}
                aria-label=${this.label || this.placeholder}
                aria-invalid=${C(this.invalid || void 0)}
                class="input"
                maxlength=${C(this.maxlength > -1 ? this.maxlength : void 0)}
                minlength=${C(this.minlength > -1 ? this.minlength : void 0)}
                pattern=${C(this.pattern)}
                placeholder=${this.placeholder}
                .value=${Ea(this.displayValue)}
                @change=${this.handleChange}
                @input=${this.handleInput}
                @focus=${this.onFocus}
                @blur=${this.onBlur}
                ?disabled=${this.disabled}
                ?required=${this.required}
                ?readonly=${this.readonly}
                autocomplete=${C(this.autocomplete)}
            />
        `;
  }
  renderField() {
    return d`
            ${this.renderStateIcons()}
            ${this.multiline ? this.renderMultiline : this.renderInput}
        `;
  }
  render() {
    return d`
            <div id="textfield">${this.renderField()}</div>
            ${this.renderHelpText(this.invalid)}
        `;
  }
  update(t) {
    (t.has("value") || (t.has("required") && this.required)) &&
      this.updateComplete.then(() => {
        this.checkValidity();
      }),
      super.update(t);
  }
  checkValidity() {
    let t = this.inputElement.checkValidity();
    return (
      (this.required || (this.value && this.pattern)) &&
        ((this.disabled || this.multiline) &&
          this.pattern &&
          (t = new RegExp(`^${this.pattern}$`, "u").test(
            this.value.toString(),
          )),
        typeof this.minlength < "u" &&
          (t = t && this.value.toString().length > this.minlength),
        (this.valid = t),
        (this.invalid = !t)),
      t
    );
  }
}
_([l({ attribute: "allowed-keys" })], E.prototype, "allowedKeys", 2),
  _([l({ type: Boolean, reflect: !0 })], E.prototype, "focused", 2),
  _([W(".input")], E.prototype, "inputElement", 2),
  _([l({ type: Boolean, reflect: !0 })], E.prototype, "invalid", 2),
  _([l()], E.prototype, "label", 2),
  _([l()], E.prototype, "placeholder", 2),
  _([l({ attribute: "type", reflect: !0 })], E.prototype, "_type", 2),
  _([Xr()], E.prototype, "type", 1),
  _([l()], E.prototype, "pattern", 2),
  _([l({ type: Boolean, reflect: !0 })], E.prototype, "grows", 2),
  _([l({ type: Number })], E.prototype, "maxlength", 2),
  _([l({ type: Number })], E.prototype, "minlength", 2),
  _([l({ type: Boolean, reflect: !0 })], E.prototype, "multiline", 2),
  _([l({ type: Boolean, reflect: !0 })], E.prototype, "readonly", 2),
  _([l({ type: Boolean, reflect: !0 })], E.prototype, "valid", 2),
  _([l({ type: String })], E.prototype, "value", 1),
  _([l({ type: Boolean, reflect: !0 })], E.prototype, "quiet", 2),
  _([l({ type: Boolean, reflect: !0 })], E.prototype, "required", 2),
  _([l({ type: String, reflect: !0 })], E.prototype, "autocomplete", 2);
class sr extends E {
  constructor() {
    super(...arguments), (this._value = "");
  }
  set value(t) {
    if (t === this.value) return;
    const e = this._value;
    (this._value = t), this.requestUpdate("value", e);
  }
  get value() {
    return this._value;
  }
}
_([l({ type: String })], sr.prototype, "value", 1);
customElements.define("sp-textfield", sr);
const oc = ({
  width: a = 24,
  height: t = 24,
  hidden: e = !1,
  title: r = "Magnify",
} = {}) => me`<svg
    xmlns="http://www.w3.org/2000/svg"
    height="${t}"
    viewBox="0 0 36 36"
    width="${a}"
    aria-hidden="${e ? "true" : "false"}"
    role="img"
    fill="currentColor"
    aria-label="${r}"
  >
    <path
      d="M33.173 30.215 25.4 22.443a12.826 12.826 0 1 0-2.957 2.957l7.772 7.772a2.1 2.1 0 0 0 2.958-2.958ZM6 15a9 9 0 1 1 9 9 9 9 0 0 1-9-9Z"
    />
  </svg>`;
class ac extends q {
  render() {
    return be(d), oc({ hidden: !this.label, title: this.label });
  }
}
customElements.define("sp-icon-magnify", ac);
const sc = v`
:host{--spectrum-search-quiet-button-offset:calc(var(
--spectrum-actionbutton-m-texticon-min-width,
var(--spectrum-global-dimension-size-400)
)/2 - var(--spectrum-alias-ui-icon-cross-size-100)/2)}#textfield{display:inline-block;position:relative}:host([dir=ltr]) #button{right:0}:host([dir=rtl]) #button{left:0}#button{position:absolute;top:0}.input{-webkit-appearance:none;border-radius:var(
--spectrum-alias-search-border-radius,var(--spectrum-global-dimension-size-50)
);outline-offset:-2px}.input::-webkit-search-cancel-button,.input::-webkit-search-decoration{-webkit-appearance:none}#textfield:after{border-radius:var(
--spectrum-alias-search-border-radius,var(--spectrum-global-dimension-size-50)
)}:host([dir=ltr]:not([quiet])) #textfield .icon{left:var(
--spectrum-alias-search-padding-left-m
)}:host([dir=rtl]:not([quiet])) #textfield .icon{right:var(
--spectrum-alias-search-padding-left-m
)}:host([dir=ltr]:not([quiet])) #textfield .input{padding-left:calc(var(--spectrum-alias-search-padding-left-m) + var(
--spectrum-alias-workflow-icon-size-m,
var(--spectrum-global-dimension-size-225)
) + var(
--spectrum-textfield-m-texticon-icon-gap,
var(--spectrum-global-dimension-size-100)
) - var(
--spectrum-textfield-m-texticon-border-size,
var(--spectrum-alias-input-border-size)
))}:host([dir=rtl]:not([quiet])) #textfield .input{padding-right:calc(var(--spectrum-alias-search-padding-left-m) + var(
--spectrum-alias-workflow-icon-size-m,
var(--spectrum-global-dimension-size-225)
) + var(
--spectrum-textfield-m-texticon-icon-gap,
var(--spectrum-global-dimension-size-100)
) - var(
--spectrum-textfield-m-texticon-border-size,
var(--spectrum-alias-input-border-size)
))}:host([quiet]) #button{transform:translateX(var(--spectrum-search-quiet-button-offset))}:host([quiet]) .input{border-radius:var(
--spectrum-alias-search-border-radius-quiet,0
)}:host([quiet]) #textfield:after{border-radius:var(
--spectrum-alias-search-border-radius-quiet,0
)}.icon{color:var(
--spectrum-textfield-m-texticon-icon-color,var(--spectrum-alias-component-icon-color-default)
)}.input:hover~.icon{color:var(
--spectrum-search-m-icon-color-hover,var(--spectrum-alias-component-icon-color-hover)
)}.input:active~.icon{color:var(
--spectrum-search-m-icon-color-down,var(--spectrum-alias-component-icon-color-down)
)}.input.focus-visible~.icon{color:var(
--spectrum-search-m-icon-color-key-focus,var(--spectrum-alias-component-icon-color-key-focus)
)}.input:focus-visible~.icon{color:var(
--spectrum-search-m-icon-color-key-focus,var(--spectrum-alias-component-icon-color-key-focus)
)}.input:disabled~.icon{color:var(
--spectrum-textfield-m-texticon-text-color-disabled,var(--spectrum-alias-component-text-color-disabled)
)}:host([dir=ltr]){--spectrum-textfield-texticon-padding-right:var(
--spectrum-alias-infieldbutton-full-height-m
)}:host([dir=rtl]){--spectrum-textfield-texticon-padding-left:var(
--spectrum-alias-infieldbutton-full-height-m
)}input::-webkit-search-cancel-button{display:none}
`,
  ic = sc;
var cc = Object.defineProperty,
  lc = Object.getOwnPropertyDescriptor,
  Ft = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? lc(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && cc(t, e, o), o;
  };
const nc = (a) => a.stopPropagation();
class zt extends sr {
  constructor() {
    super(...arguments),
      (this.action = ""),
      (this.label = "Search"),
      (this.placeholder = "Search");
  }
  static get styles() {
    return [...super.styles, ic];
  }
  handleSubmit(t) {
    this.dispatchEvent(new Event("submit", { cancelable: !0, bubbles: !0 })) ||
      t.preventDefault();
  }
  handleKeydown(t) {
    const { code: e } = t;
    !this.value || e !== "Escape" || this.reset();
  }
  async reset() {
    (this.value = ""),
      await this.updateComplete,
      this.focusElement.dispatchEvent(
        new InputEvent("input", { bubbles: !0, composed: !0 }),
      ),
      this.focusElement.dispatchEvent(
        new InputEvent("change", { bubbles: !0 }),
      );
  }
  renderField() {
    return d`
            <form
                action=${this.action}
                id="form"
                method=${C(this.method)}
                @submit=${this.handleSubmit}
                @reset=${this.reset}
                @keydown=${this.handleKeydown}
            >
                <sp-icon-magnify
                    class="icon magnifier icon-workflow"
                ></sp-icon-magnify>
                ${super.renderField()}
                ${
                  this.value
                    ? d`
                          <sp-clear-button
                              id="button"
                              label="Reset"
                              tabindex="-1"
                              type="reset"
                              @keydown=${nc}
                          ></sp-clear-button>
                      `
                    : d``
                }
            </form>
        `;
  }
  firstUpdated(t) {
    super.firstUpdated(t), this.inputElement.setAttribute("type", "search");
  }
  willUpdate() {
    this.multiline = !1;
  }
}
Ft([l()], zt.prototype, "action", 2),
  Ft([l()], zt.prototype, "label", 2),
  Ft([l()], zt.prototype, "method", 2),
  Ft([l()], zt.prototype, "placeholder", 2),
  Ft([W("#form")], zt.prototype, "form", 2);
customElements.define("sp-search", zt);
function uc() {
  return new Worker(
    "" + new URL("string-match-c1d19615.js", import.meta.url).href,
  );
}
var dc = Object.defineProperty,
  pc = Object.getOwnPropertyDescriptor,
  Vt = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? pc(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && dc(t, e, o), o;
  };
const mc = v`rgb(0, 140, 186)`,
  bc = v`rgb(208, 208, 208)`,
  hc = v`rgb(211, 65, 213)`;
class bt extends j {
  constructor() {
    super(),
      (this.graphState = R.DEFAULT_STATE),
      (this.dictionary = []),
      (this.searchResults = []),
      (this.searchQuery = ""),
      (this.targetIndex = 0),
      (this.stringMatchWorker = new uc()),
      (this.stringMatchWorker.onmessage =
        this.handleStringMatchWorkerResponse.bind(this));
  }
  willUpdate(t) {
    t.has("searchQuery") &&
      this.stringMatchWorker.postMessage({
        name: "find-matches",
        value: this.searchQuery,
      }),
      t.has("dictionary") &&
        (this.stringMatchWorker.postMessage({
          name: "set-dictionary",
          value: this.dictionary,
        }),
        this.stringMatchWorker.postMessage({
          name: "find-matches",
          value: this.searchQuery,
        }));
  }
  handleStringMatchWorkerResponse(t) {
    (this.targetIndex = 0), (this.searchResults = t.data);
  }
  handleChange() {
    var e;
    const t =
      (e = this.shadowRoot) == null ? void 0 : e.getElementById("search");
    this.searchQuery = t.value;
  }
  selectItemAtIndex(t) {
    var o;
    const e = this.searchResults[t];
    if (!e) return;
    const r =
      (o = this.shadowRoot) == null ? void 0 : o.getElementById("search");
    r.blur(),
      (this.searchQuery = ""),
      (r.value = this.searchQuery),
      x(this, "select-id", { id: e.value });
  }
  handlePointerDown(t) {
    this.selectItemAtIndex(t);
  }
  setNewTargetIndex(t) {
    var u, m;
    const e =
        (u = this.shadowRoot) == null
          ? void 0
          : u.getElementById(`search-result-${t}`),
      r =
        (m = this.shadowRoot) == null
          ? void 0
          : m.getElementById("list-container"),
      o = e.offsetHeight,
      s = r.offsetHeight,
      i = r.scrollTop,
      c = i + s,
      n = e.offsetTop;
    n < i && (r.scrollTop = n),
      n > c - o && (r.scrollTop = n + o - s),
      (this.targetIndex = t);
  }
  handleKeydown(t) {
    var e;
    switch (t.code) {
      case "KeyZ":
        t.stopImmediatePropagation(), t.stopPropagation();
        break;
      case "ArrowDown":
        let r = this.targetIndex + 1;
        this.targetIndex++,
          this.searchResults.length <= r && (r = 0),
          this.setNewTargetIndex(r),
          t.preventDefault(),
          t.stopImmediatePropagation(),
          t.stopPropagation();
        break;
      case "ArrowUp":
        let o = this.targetIndex - 1;
        o < 0 && (o = this.searchResults.length - 1),
          this.setNewTargetIndex(o),
          t.preventDefault(),
          t.stopImmediatePropagation(),
          t.stopPropagation();
        break;
      case "Enter":
        this.selectItemAtIndex(this.targetIndex);
        break;
      case "Escape":
        const s =
          (e = this.shadowRoot) == null ? void 0 : e.getElementById("search");
        s.blur(), (this.searchQuery = ""), (s.value = this.searchQuery);
        break;
    }
  }
  render() {
    return d`
      <div>
        <sp-search
            @change=${this.handleChange}
            @input=${this.handleChange}
            @keydown=${this.handleKeydown}
            id="search"
            placeholder="Search"
        ></sp-search>
        <div class="list" id="list-container">
          <ul>
          ${this.searchResults.map(
            (t, e) => d`
            <li
              id="search-result-${e}"
              ?selected=${e === this.targetIndex}
              @pointerdown=${() => this.handlePointerDown(e)}
            ><i class=${t.type}></i>${Vi(t.matchMarkup)}</li>
            `,
          )}
          ${
            this.searchResults.length === 0
              ? d`
            <li
              selected
            >No matching results</li>
          `
              : d``
          }
          </ul>
        </div>
      </div>
    `;
  }
}
bt.styles = v`

    :host {
      position: relative;
      display: block;
      width: 100%;
      /* max-width: 400px; */
    }

    sp-search {
      width: 100%;
    }

    .list {
      display: none;
      position: absolute;
      left: 0px;
      top: 110%;
      width: 400px;
      margin-top: 1px;
      max-height: 300px;
      background: var(--spectrum-gray-50);
      overflow: auto;
      box-shadow: inset 0 0 0 1px var(--spectrum-gray-200), 0px 3px 6px rgba(0,0,0,0.1);
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      border-radius: 5px;
    }

    .list ul {
      padding: 10px;
      margin: 0;
      list-style: none;
    }

    .list ul li {
      position: relative;
      padding: 0;
      margin: 0;
      font-size: 12px;
      color: var(--spectrum-gray-500);
      line-height: 16px;
      cursor: pointer;
      padding: 4px 8px 4px 30px;
    }

    .list ul li[selected] {
      color: var(--spectrum-gray-900);
      background: var(--spectrum-gray-100);
      border-radius: 3px;
    }

    .list ul li:hover {
      background: var(--spectrum-gray-100);
      border-radius: 3px;
    }

    .list ul li span {
      color: var(--spectrum-yellow-visual-color);
      font-weight: bold;
    }

    .list ul li i {
      position: absolute;
      display: block;
      top: 4px;
      left: 6px;
      width: 18px;
      height: 18px;
      -webkit-mask-size: 75%;
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center center;
      mask-size: 75%;
      mask-repeat: no-repeat;
      mask-position: center center;
    }

    .list ul li i.component {
      background-color: ${bc};
      -webkit-mask-image: url('./Smock_Note_18_N.svg');
      mask-image: url('./Smock_Note_18_N.svg');
    }

    .list ul li i.orphan-category {
      background-color: ${mc};
      -webkit-mask-image: url('./Smock_Selection_18_N.svg');
      mask-image: url('./Smock_Selection_18_N.svg');
    }

    .list ul li i.token {
      background-color: ${hc};
      -webkit-mask-image: url('./Smock_Label_18_N.svg');
      mask-image: url('./Smock_Label_18_N.svg');
    }

    #search:focus + .list {
      display: block;
    }

  `;
Vt([l({ type: Object })], bt.prototype, "graphState", 2);
Vt([l({ type: Object })], bt.prototype, "dictionary", 2);
Vt([l({ type: Object })], bt.prototype, "searchResults", 2);
Vt([l({ type: String })], bt.prototype, "searchQuery", 2);
Vt([l({ type: Number })], bt.prototype, "targetIndex", 2);
customElements.define("stvt-search", bt);
var gc = Object.defineProperty,
  vc = Object.getOwnPropertyDescriptor,
  ir = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? vc(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && gc(t, e, o), o;
  };
const fc = v`rgb(0, 140, 186)`,
  yc = v`rgb(208, 208, 208)`,
  kc = v`rgb(211, 65, 213)`;
class Yt extends j {
  constructor() {
    super(...arguments),
      (this.dictionary = []),
      (this.selectedTokens = []),
      (this.selectedComponents = ["slider"]),
      (this.tabItems = []),
      (this.graphNodeTypeLookup = {});
  }
  willUpdate(t) {
    (t.has("selectedTokens") || t.has("selectedComponents")) &&
      (this.tabItems = this.selectedComponents.concat(this.selectedTokens)),
      t.has("dictionary") &&
        this.dictionary.forEach(
          (e) => (this.graphNodeTypeLookup[e.value] = e.type),
        );
  }
  handleWheelEvents(t) {
    var e;
    if (Math.abs(t.deltaY) > Math.abs(t.deltaX)) {
      const r =
        (e = this.shadowRoot) == null
          ? void 0
          : e.getElementById("tab-scroller");
      (r.scrollLeft += t.deltaY), t.preventDefault();
    }
  }
  handleCloseTabClick(t) {
    x(this, "close-tab", { value: t });
  }
  handleDeselectAll() {
    x(this, "close-all-tabs");
  }
  tabsItemHtml(t) {
    return d`<li class=${this.graphNodeTypeLookup[t]}><i></i>${t}<button
      @click=${() => this.handleCloseTabClick(t)}
    ><i></i></button></li>`;
  }
  render() {
    const t = this.tabItems.length;
    return d`
      <div
        id="tab-scroller"
        class="tabs"
        @wheel=${this.handleWheelEvents}
      >
        <label>Selected:</label>
        ${t === 0 ? d`<span>none</span>` : ""}
        <ul>
          ${this.selectedComponents.map(this.tabsItemHtml.bind(this))}
          ${this.selectedTokens.map(this.tabsItemHtml.bind(this))}
          ${
            t <= 3
              ? d``
              : d`
            <div class="tabs-endcap">
              <sp-action-button @click=${this.handleDeselectAll} size="xs" quiet>Deselect All</sp-action-button>
            </div>
          `
          }
        </ul>
      </div>
    `;
  }
}
Yt.styles = v`
    :host {
      position: relative;
      display: block;
    }

    .tabs {
      position: absolute;
      display: block;
      top: 0;
      left: ${qt}px;
      right: 0;
      height: 55px;
      background: var(--spectrum-gray-100);
      z-index: 0;
      box-shadow: 0px -3px 8px var(--spectrum-gray-50);
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: thin;
      scrollbar-color: #404040 #303030;
      display: flex;
      align-items: center;
      gap: 20px;
      color: var(--spectrum-gray-900);
    }

    .tabs label {
      padding-left: 30px;
    }

    .tabs span {
      color: var(--spectrum-gray-600);
      font-style: italic;
    }

    .tabs ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      gap: 10px;
      /* background-color: red; */
      /* min-width: 100%; */
      user-select: none;
    }


    .tabs::-webkit-scrollbar {
      height: 1px;
      background: var(--spectrum-gray-100);
    }

    .tabs::-webkit-scrollbar-track {
      background-color: transparent;
    }

    .tabs::-webkit-scrollbar-thumb {
      /* background-color: #4B4B4B; */
      background-color: var(--spectrum-gray-400);
      outline: 0px;
    }

    .tabs li {
      margin: 0;
      padding: 0 34px 0 26px;
      position: relative;
      display: inline-block;
      background: var(--spectrum-gray-50);
      border-radius: 3px;
      /* box-shadow: 0 0 0 1px #D0D0D0; */
      box-shadow: 0 0 0 1px var(--spectrum-gray-200);
      height: 24px;
      color: var(--spectrum-gray-600);
      font-size: 12px;
      line-height: 24px;
      white-space: nowrap;
    }

    .tabs li > i {
      position: absolute;
      display: block;
      top: 3px;
      left: 4px;
      width: 18px;
      height: 18px;
      -webkit-mask-size: 75%;
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center center;
      mask-size: 75%;
      mask-repeat: no-repeat;
      mask-position: center center;
      opacity: 0.6;
    }

    .tabs li.component > i {
      background-color: ${yc};
      -webkit-mask-image: url('./Smock_Note_18_N.svg');
      mask-image: url('./Smock_Note_18_N.svg');
    }

    .tabs li.orphan-category > i {
      background-color: ${fc};
      -webkit-mask-image: url('./Smock_Selection_18_N.svg');
      mask-image: url('./Smock_Selection_18_N.svg');
    }

    .tabs li.token > i {
      background-color: ${kc};
      -webkit-mask-image: url('./Smock_Label_18_N.svg');
      mask-image: url('./Smock_Label_18_N.svg');
    }

    .tabs li button {
      position: relative;
      display: block;
      background-color: transparent;
      width: 18px;
      height: 18px;
      position: absolute;
      top: 3px;
      right: 3px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }

    .tabs li button i {
      position: absolute;
      display: block;
      top: 5px;
      left: 5px;
      width: 8px;
      height: 8px;
      background-color: var(--spectrum-gray-800);
      -webkit-mask-image: url('./CrossSize100.svg');
      mask-image: url('./CrossSize100.svg');
    }

    .tabs li:hover button {
      display: block;
    }

    .tabs li button:hover {
      background-color: var(--spectrum-gray-100);
    }

    .tabs li button:active {
      background-color: var(--spectrum-gray-200);
    }

    .tabs-endcap {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 10px;
    }
  `;
ir([l({ type: Object })], Yt.prototype, "dictionary", 2);
ir([l({ type: Object })], Yt.prototype, "selectedTokens", 2);
ir([l({ type: Object })], Yt.prototype, "selectedComponents", 2);
customElements.define("stvt-tabs", Yt);
var xc = Object.defineProperty,
  wc = Object.getOwnPropertyDescriptor,
  Pt = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? wc(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && xc(t, e, o), o;
  };
class st extends j {
  constructor() {
    super(...arguments),
      (this.dictionary = []),
      (this.filters = []),
      (this.listOfComponents = []),
      (this.selectedTokens = []),
      (this.selectedComponents = ["slider"]),
      (this.spectrumColorTheme = "darkest");
  }
  handleSwitchValueChange() {
    var r;
    const e = ((r = this.shadowRoot) == null
      ? void 0
      : r.getElementById("spectrum-color-theme-switch")
    ).checked
      ? "light"
      : "darkest";
    x(this, "set-spectrum-color-theme", { value: e });
  }
  toggleAbout() {}
  render() {
    const t = this.spectrumColorTheme === "light";
    return d`
      <section class="top">
        <div class="branding">
          <img width=30 height=26 src="./adobe.svg"/>
          <div>
            <h1>Spectrum</h1>
            <h2>Token Visualization Tool</h2>
          </div>
        </div>
        <stvt-search
          id="stvt-search"
          .dictionary=${this.dictionary}
        ></stvt-search>
      </section>
      <section class="middle">
        <stvt-filters-menu
          .filters=${this.filters}
        ></stvt-filters-menu>
      </section>
      <section class="bottom">
        <footer>
          <ul>
            <li><i><span>⌘</span> F</i> Search Tokens</li>
            <li><i><span>⌘</span> drag</i> Pan / Move Token</li>
            <li><i>← ↑ ↓ →</i> Pan</li>
            <li><i><span>⌘</span> scroll</i> Zoom In / Out</li>
            <li><i>Z / Shift Z</i> Zoom In / Out</li>
            <li><i>BACK</i> Undo Selection</li>
            <li><i>FORWARD</i> Redo Selection</li>
          </ul>
          <section>
            <overlay-trigger id="trigger" placement="bottom" offset="6">
                <sp-button
                  size="s"
                  variant="accent"
                  slot="trigger"
                >About</sp-button>
                <sp-popover dialog slot="click-content" direction="bottom" style="max-width: 500px;">
                    <div style="color: var(--spectrum-global-color-gray-800);">
                      <p>Design tokens are all the values needed to construct and maintain a design system — spacing, color, typography, object styles, animation, etc. — represented as data. These can represent anything defined by design: a color as a RGB value, an opacity as a number, an animation ease as Bezier coordinates. They’re used in place of hard-coded values in order to ensure flexibility and unity across all product experiences.</p>
                      <p>Design tokens are directly integrated into our component libraries, UI kits, and the Spectrum XD plugin. They cover the various options of platform scales, color themes, component states, and more. We also offer teams a variety of token types to use directly within their products if they are not using a Spectrum component library.</p>
                      <p>This tool allows you to organically explore the relationship between these tokens by directly selecting tokens to expand their connections, filtering displayed values and connections by scale and theme, and by directly searching for token names or values.</p>
                      <sp-link target="_new" href="https://github.com/adobe/spectrum-tokens" variant="secondary">Spectrum Tokens on GitHub</sp-link>
                      <br/>
                      <sp-link target="_new" href="https://git.corp.adobe.com/aportill/stvt/" variant="secondary">This Tool on GitHub</sp-link>
                    </div>
                </sp-popover>
            </overlay-trigger>
            <sp-switch
              ?checked=${t}
              id="spectrum-color-theme-switch"
              @change=${this.handleSwitchValueChange}
            >
                Lights on
            </sp-switch>
          </section>
        </footer>
      </section>
    `;
  }
}
st.styles = v`

    :host {
      position: absolute;
      display: flex;
      flex-direction: column;
      height: 100%;
      width: ${qt}px;
      background: var(--spectrum-gray-100);
      justify-content: space-between;
      box-shadow: 2px 0 0 0 var(--spectrum-gray-50);
      color: var(--spectrum-gray-900);
    }

    section {
      position: relative;
      display: block;
      padding: 0 10px;
    }

    .top {
      padding-top: 20px;
      z-index: 1;
    }

    .middle {
      flex-grow: 1;
      overflow: scroll;
      flex-shrink: 1;
      z-index: 0;
    }

    .bottom {
      bottom: 0;
      padding: 0;
      border-top: 1px var(--spectrum-gray-200) solid;
    }

    .branding {
      display: flex;
      align-items: center;
      gap: 15px;
      padding-bottom: 20px;
    }

    stvt-search {
      z-index: 1;
    }


    footer {
      background: var(--spectrum-gray-100);
      padding: 20px;
    }

    footer ul {
      position: relative;

      list-style: none;
      margin: 0;
      padding: 0;
      padding-bottom: 20px;
      font-size: 11px;
      margin-left: 85px;
    }

    footer ul i {
      color: var(--spectrum-gray-500);
      margin-right: 10px;
      font-style: normal;
      position: absolute;
      right: 100%;
      text-align: right;
      white-space: nowrap;
    }

    footer ul i span {
      font-family: Arial, Helvetica, sans-serif;
    }

    footer section {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h1 {
      margin: 0;
      padding: 0;
      font-size: 18px;
      font-style: normal;
      font-family: var(--spectrum-alias-body-text-font-family,var(--spectrum-global-font-family-base));
      font-weight: normal;
      line-height: 24px;
    }

    h2 {
      margin: 0;
      padding: 0;
      font-size: 11px;
      font-style: normal;
      font-family: var(--spectrum-alias-body-text-font-family,var(--spectrum-global-font-family-base));
      font-weight: normal;
      line-height: 18px;
      text-transform: uppercase
    }

  `;
Pt([l({ type: Object })], st.prototype, "dictionary", 2);
Pt([l({ type: Object })], st.prototype, "filters", 2);
Pt([l({ type: Object })], st.prototype, "listOfComponents", 2);
Pt([l({ type: Object })], st.prototype, "selectedTokens", 2);
Pt([l({ type: Object })], st.prototype, "selectedComponents", 2);
Pt([l({ type: String })], st.prototype, "spectrumColorTheme", 2);
customElements.define("stvt-sidebar", st);
const xo = Symbol("language resolver updated");
class zc {
  constructor(t) {
    (this.language = document.documentElement.lang || navigator.language),
      (this.host = t),
      this.host.addController(this);
  }
  hostConnected() {
    this.resolveLanguage();
  }
  hostDisconnected() {
    var t;
    (t = this.unsubscribe) == null || t.call(this);
  }
  resolveLanguage() {
    const t = new CustomEvent("sp-language-context", {
      bubbles: !0,
      composed: !0,
      detail: {
        callback: (e, r) => {
          const o = this.language;
          (this.language = e),
            (this.unsubscribe = r),
            this.host.requestUpdate(xo, o);
        },
      },
      cancelable: !0,
    });
    this.host.dispatchEvent(t);
  }
}
let Ie = new Map(),
  Ye = !1;
try {
  Ye =
    new Intl.NumberFormat("de-DE", {
      signDisplay: "exceptZero",
    }).resolvedOptions().signDisplay === "exceptZero";
} catch {}
let ue = !1;
try {
  ue =
    new Intl.NumberFormat("de-DE", {
      style: "unit",
      unit: "degree",
    }).resolvedOptions().style === "unit";
} catch {}
const wo = {
  degree: {
    narrow: { default: "°", "ja-JP": " 度", "zh-TW": "度", "sl-SI": " °" },
  },
};
class Pr {
  format(t) {
    let e = "";
    if (
      (!Ye && this.options.signDisplay != null
        ? (e = Cc(this.numberFormatter, this.options.signDisplay, t))
        : (e = this.numberFormatter.format(t)),
      this.options.style === "unit" && !ue)
    ) {
      var r;
      let {
          unit: o,
          unitDisplay: s = "short",
          locale: i,
        } = this.resolvedOptions(),
        c = (r = wo[o]) === null || r === void 0 ? void 0 : r[s];
      e += c[i] || c.default;
    }
    return e;
  }
  formatToParts(t) {
    return this.numberFormatter.formatToParts(t);
  }
  formatRange(t, e) {
    if (typeof this.numberFormatter.formatRange == "function")
      return this.numberFormatter.formatRange(t, e);
    if (e < t) throw new RangeError("End date must be >= start date");
    return `${this.format(t)} – ${this.format(e)}`;
  }
  formatRangeToParts(t, e) {
    if (typeof this.numberFormatter.formatRangeToParts == "function")
      return this.numberFormatter.formatRangeToParts(t, e);
    if (e < t) throw new RangeError("End date must be >= start date");
    let r = this.numberFormatter.formatToParts(t),
      o = this.numberFormatter.formatToParts(e);
    return [
      ...r.map((s) => ({ ...s, source: "startRange" })),
      { type: "literal", value: " – ", source: "shared" },
      ...o.map((s) => ({ ...s, source: "endRange" })),
    ];
  }
  resolvedOptions() {
    let t = this.numberFormatter.resolvedOptions();
    return (
      !Ye &&
        this.options.signDisplay != null &&
        (t = { ...t, signDisplay: this.options.signDisplay }),
      !ue &&
        this.options.style === "unit" &&
        (t = {
          ...t,
          style: "unit",
          unit: this.options.unit,
          unitDisplay: this.options.unitDisplay,
        }),
      t
    );
  }
  constructor(t, e = {}) {
    (this.numberFormatter = $c(t, e)), (this.options = e);
  }
}
function $c(a, t = {}) {
  let { numberingSystem: e } = t;
  if (
    (e && a.indexOf("-u-nu-") === -1 && (a = `${a}-u-nu-${e}`),
    t.style === "unit" && !ue)
  ) {
    var r;
    let { unit: i, unitDisplay: c = "short" } = t;
    if (!i) throw new Error('unit option must be provided with style: "unit"');
    if (!(!((r = wo[i]) === null || r === void 0) && r[c]))
      throw new Error(`Unsupported unit ${i} with unitDisplay = ${c}`);
    t = { ...t, style: "decimal" };
  }
  let o =
    a +
    (t
      ? Object.entries(t)
          .sort((i, c) => (i[0] < c[0] ? -1 : 1))
          .join()
      : "");
  if (Ie.has(o)) return Ie.get(o);
  let s = new Intl.NumberFormat(a, t);
  return Ie.set(o, s), s;
}
function Cc(a, t, e) {
  if (t === "auto") return a.format(e);
  if (t === "never") return a.format(Math.abs(e));
  {
    let r = !1;
    if (
      (t === "always"
        ? (r = e > 0 || Object.is(e, 0))
        : t === "exceptZero" &&
          (Object.is(e, -0) || Object.is(e, 0)
            ? (e = Math.abs(e))
            : (r = e > 0)),
      r)
    ) {
      let o = a.format(-e),
        s = a.format(e),
        i = o.replace(s, "").replace(/\u200e|\u061C/, "");
      return (
        [...i].length !== 1 &&
          console.warn(
            "@react-aria/i18n polyfill for NumberFormat signDisplay: Unsupported case",
          ),
        o.replace(s, "!!!").replace(i, "+").replace("!!!", s)
      );
    } else return a.format(e);
  }
}
const Sc = new RegExp("^.*\\(.*\\).*$"),
  _c = ["latn", "arab", "hanidec"];
class il {
  parse(t) {
    return Ne(this.locale, this.options, t).parse(t);
  }
  isValidPartialNumber(t, e, r) {
    return Ne(this.locale, this.options, t).isValidPartialNumber(t, e, r);
  }
  getNumberingSystem(t) {
    return Ne(this.locale, this.options, t).options.numberingSystem;
  }
  constructor(t, e = {}) {
    (this.locale = t), (this.options = e);
  }
}
const Ir = new Map();
function Ne(a, t, e) {
  let r = Nr(a, t);
  if (!a.includes("-nu-") && !r.isValidPartialNumber(e)) {
    for (let o of _c)
      if (o !== r.options.numberingSystem) {
        let s = Nr(a + (a.includes("-u-") ? "-nu-" : "-u-nu-") + o, t);
        if (s.isValidPartialNumber(e)) return s;
      }
  }
  return r;
}
function Nr(a, t) {
  let e =
      a +
      (t
        ? Object.entries(t)
            .sort((o, s) => (o[0] < s[0] ? -1 : 1))
            .join()
        : ""),
    r = Ir.get(e);
  return r || ((r = new Ec(a, t)), Ir.set(e, r)), r;
}
class Ec {
  parse(t) {
    let e = this.sanitize(t);
    e = te(e, this.symbols.group, "")
      .replace(this.symbols.decimal, ".")
      .replace(this.symbols.minusSign, "-")
      .replace(this.symbols.numeral, this.symbols.index);
    let r = e ? +e : NaN;
    if (isNaN(r)) return NaN;
    if (
      (this.options.currencySign === "accounting" && Sc.test(t) && (r = -1 * r),
      this.options.style === "percent")
    ) {
      r /= 100;
      var o;
      r = +r.toFixed(
        ((o = this.options.maximumFractionDigits) !== null && o !== void 0
          ? o
          : 0) + 2,
      );
    }
    return r;
  }
  sanitize(t) {
    return (
      (t = t.replace(this.symbols.literals, "")),
      (t = t.replace("-", this.symbols.minusSign)),
      this.options.numberingSystem === "arab" &&
        ((t = t.replace(",", this.symbols.decimal)),
        (t = t.replace(String.fromCharCode(1548), this.symbols.decimal)),
        (t = te(t, ".", this.symbols.group))),
      this.options.locale === "fr-FR" &&
        (t = te(t, ".", String.fromCharCode(8239))),
      t
    );
  }
  isValidPartialNumber(t, e = -1 / 0, r = 1 / 0) {
    return (
      (t = this.sanitize(t)),
      t.startsWith(this.symbols.minusSign) && e < 0
        ? (t = t.slice(this.symbols.minusSign.length))
        : this.symbols.plusSign &&
          t.startsWith(this.symbols.plusSign) &&
          r > 0 &&
          (t = t.slice(this.symbols.plusSign.length)),
      t.startsWith(this.symbols.group)
        ? !1
        : ((t = te(t, this.symbols.group, "")
            .replace(this.symbols.numeral, "")
            .replace(this.symbols.decimal, "")),
          t.length === 0)
    );
  }
  constructor(t, e = {}) {
    (this.formatter = new Intl.NumberFormat(t, e)),
      (this.options = this.formatter.resolvedOptions()),
      (this.symbols = Ac(this.formatter, this.options, e));
  }
}
const jr = new Set([
  "decimal",
  "fraction",
  "integer",
  "minusSign",
  "plusSign",
  "group",
]);
function Ac(a, t, e) {
  var r, o, s, i;
  let c = a.formatToParts(-10000.111),
    n = a.formatToParts(10000.111),
    u = a.formatToParts(1);
  var m;
  let b =
      (m =
        (r = c.find((k) => k.type === "minusSign")) === null || r === void 0
          ? void 0
          : r.value) !== null && m !== void 0
        ? m
        : "-",
    p =
      (o = n.find((k) => k.type === "plusSign")) === null || o === void 0
        ? void 0
        : o.value;
  !p &&
    ((e == null ? void 0 : e.signDisplay) === "exceptZero" ||
      (e == null ? void 0 : e.signDisplay) === "always") &&
    (p = "+");
  let h =
      (s = c.find((k) => k.type === "decimal")) === null || s === void 0
        ? void 0
        : s.value,
    g =
      (i = c.find((k) => k.type === "group")) === null || i === void 0
        ? void 0
        : i.value,
    f = c.filter((k) => !jr.has(k.type)).map((k) => Lr(k.value)),
    w = u.filter((k) => !jr.has(k.type)).map((k) => Lr(k.value)),
    S = [...new Set([...w, ...f])].sort((k, N) => N.length - k.length),
    y =
      S.length === 0
        ? new RegExp("[\\p{White_Space}]", "gu")
        : new RegExp(`${S.join("|")}|[\\p{White_Space}]`, "gu"),
    $ = [
      ...new Intl.NumberFormat(t.locale, { useGrouping: !1 }).format(
        9876543210,
      ),
    ].reverse(),
    L = new Map($.map((k, N) => [k, N])),
    A = new RegExp(`[${$.join("")}]`, "g");
  return {
    minusSign: b,
    plusSign: p,
    decimal: h,
    group: g,
    literals: y,
    numeral: A,
    index: (k) => String(L.get(k)),
  };
}
function te(a, t, e) {
  return a.replaceAll ? a.replaceAll(t, e) : a.split(t).join(e);
}
function Lr(a) {
  return a.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}
var Tc = Object.defineProperty,
  Oc = Object.getOwnPropertyDescriptor,
  H = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Oc(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Tc(t, e, o), o;
  };
const Pc = {
    toNormalized(a, t, e) {
      return (a - t) / (e - t);
    },
    fromNormalized(a, t, e) {
      return a * (e - t) + t;
    },
  },
  Ic = {
    fromAttribute: (a) => (a === "previous" ? a : parseFloat(a)),
    toAttribute: (a) => a.toString(),
  },
  Nc = {
    fromAttribute: (a) => (a === "next" ? a : parseFloat(a)),
    toAttribute: (a) => a.toString(),
  };
class F extends et {
  constructor() {
    super(...arguments),
      (this._forcedUnit = ""),
      (this.dragging = !1),
      (this.highlight = !1),
      (this.name = ""),
      (this.label = ""),
      (this.getAriaHandleText = (t, e) => e.format(t)),
      (this.languageResolver = new zc(this)),
      (this.normalization = Pc);
  }
  get handleName() {
    return this.name;
  }
  get focusElement() {
    var t, e;
    return (e =
      (t = this.handleController) == null ? void 0 : t.inputForHandle(this)) !=
      null
      ? e
      : this;
  }
  update(t) {
    var e;
    if (!this.hasUpdated) {
      const { max: r, min: o } = this;
      this.value == null &&
        !isNaN(r) &&
        !isNaN(o) &&
        (this.value = r < o ? o : o + (r - o) / 2);
    }
    (t.has("formatOptions") || t.has(xo)) && delete this._numberFormatCache,
      t.has("value") &&
        t.get("value") != null &&
        this.updateComplete.then(() => {
          var r;
          (r = this.handleController) == null || r.setValueFromHandle(this);
        }),
      (e = this.handleController) == null || e.handleHasChanged(this),
      super.update(t);
  }
  firstUpdated(t) {
    super.firstUpdated(t),
      this.dispatchEvent(new CustomEvent("sp-slider-handle-ready"));
  }
  dispatchInputEvent() {
    const t = new Event("input", { bubbles: !0, composed: !0 });
    this.dispatchEvent(t);
  }
  getNumberFormat() {
    var t;
    if (
      !this._numberFormatCache ||
      this.languageResolver.language !== this._numberFormatCache.language
    ) {
      let e;
      try {
        (e = new Pr(this.languageResolver.language, this.formatOptions)),
          (this._forcedUnit = "");
      } catch {
        const {
          style: o,
          unit: s,
          unitDisplay: i,
          ...c
        } = this.formatOptions || {};
        o === "unit" && (this._forcedUnit = s),
          (e = new Pr(this.languageResolver.language, c));
      }
      this._numberFormatCache = {
        language: this.languageResolver.language,
        numberFormat: e,
      };
    }
    return (t = this._numberFormatCache) == null ? void 0 : t.numberFormat;
  }
  get numberFormat() {
    if (this.formatOptions) return this.getNumberFormat();
  }
}
H([l({ type: Number })], F.prototype, "value", 2),
  H([l({ type: Boolean, reflect: !0 })], F.prototype, "dragging", 2),
  H([l({ type: Boolean })], F.prototype, "highlight", 2),
  H([l({ type: String })], F.prototype, "name", 2),
  H([l({ reflect: !0, converter: Ic })], F.prototype, "min", 2),
  H([l({ reflect: !0, converter: Nc })], F.prototype, "max", 2),
  H([l({ type: Number, reflect: !0 })], F.prototype, "step", 2),
  H(
    [l({ type: Object, attribute: "format-options" })],
    F.prototype,
    "formatOptions",
    2,
  ),
  H([l({ type: String })], F.prototype, "label", 2),
  H([l({ attribute: !1 })], F.prototype, "getAriaHandleText", 2),
  H([l({ attribute: !1 })], F.prototype, "normalization", 2);
customElements.define("sp-slider-handle", F);
const jc = v`
:host{--spectrum-slider-tick-mark-width:var(
--spectrum-slider-m-tick-mark-width,var(--spectrum-alias-border-size-thick)
);--spectrum-slider-tick-mark-height:var(
--spectrum-slider-m-tick-mark-height,var(--spectrum-global-dimension-size-125)
);--spectrum-slider-tick-mark-border-radius:var(
--spectrum-slider-m-tick-mark-border-radius,var(--spectrum-alias-border-radius-xsmall)
);--spectrum-slider-track-border-radius:var(
--spectrum-slider-m-track-border-radius,var(--spectrum-global-dimension-static-size-10)
);--spectrum-slider-track-height:var(
--spectrum-slider-m-track-height,var(--spectrum-alias-border-size-thick)
);--spectrum-slider-handle-width:var(
--spectrum-slider-m-handle-width,var(--spectrum-alias-control-two-size-l)
);--spectrum-slider-handle-height:var(
--spectrum-slider-m-handle-height,var(--spectrum-alias-control-two-size-l)
);--spectrum-slider-handle-gap:var(
--spectrum-slider-m-handle-gap,var(--spectrum-alias-border-size-thicker)
);--spectrum-slider-handle-border-size:var(
--spectrum-slider-m-handle-border-size,var(--spectrum-alias-border-size-thick)
);--spectrum-slider-handle-border-radius:var(
--spectrum-slider-m-handle-border-radius,var(--spectrum-global-dimension-size-100)
);--spectrum-slider-height:var(
--spectrum-slider-m-height,var(--spectrum-global-dimension-size-400)
);--spectrum-slider-min-width:var(
--spectrum-slider-m-min-width,var(--spectrum-global-dimension-size-1250)
);--spectrum-slider-animation-duration:var(
--spectrum-slider-m-animation-duration,var(--spectrum-global-animation-duration-100)
);--spectrum-slider-ramp-track-color-disabled:var(
--spectrum-slider-m-ramp-track-color-disabled,var(--spectrum-global-color-gray-300)
);--spectrum-slider-ramp-track-height:var(
--spectrum-slider-m-ramp-track-height,var(--spectrum-global-dimension-size-200)
);--spectrum-slider-label-gap-y:var(--spectrum-global-dimension-size-85);--spectrum-slider-controls-margin:calc(var(--spectrum-slider-handle-width)/2);--spectrum-slider-track-margin-offset:calc(var(--spectrum-slider-controls-margin)*-1);--spectrum-slider-handle-margin-top:calc(var(--spectrum-slider-handle-width)/-2);--spectrum-slider-handle-margin-left:calc(var(--spectrum-slider-handle-width)/-2);--spectrum-slider-track-handleoffset:var(--spectrum-slider-handle-gap);--spectrum-slider-track-middle-handleoffset:calc(var(--spectrum-slider-handle-gap) + var(--spectrum-slider-handle-width)/2);--spectrum-slider-input-top:calc(var(--spectrum-slider-handle-margin-top)/4);--spectrum-slider-input-left:calc(var(--spectrum-slider-handle-margin-left)/4);--spectrum-slider-ramp-margin-top:0;--spectrum-slider-range-track-reset:0;--spectrum-slider-label-margin-bottom:-3px;--spectrum-slider-label-gap-x:var(
--spectrum-alias-item-control-gap-m,var(--spectrum-global-dimension-size-125)
);--spectrum-slider-label-text-line-height:var(
--spectrum-global-font-line-height-small,1.3
)}:host{display:block;min-height:var(--spectrum-slider-height);min-width:var(--spectrum-slider-min-width);position:relative;-webkit-user-select:none;user-select:none;z-index:1}:host([dir=ltr]) #controls{margin-left:var(
--spectrum-slider-controls-margin
)}:host([dir=rtl]) #controls{margin-right:var(
--spectrum-slider-controls-margin
)}#controls{box-sizing:border-box;display:inline-block;min-height:var(--spectrum-slider-height);position:relative;vertical-align:top;width:calc(100% - var(--spectrum-slider-controls-margin)*2);z-index:auto}:host([dir=ltr]) #fill,:host([dir=ltr]) .track{left:0}:host([dir=rtl]) #fill,:host([dir=rtl]) .track{right:0}:host([dir=ltr]) #fill,:host([dir=ltr]) .track{right:auto}:host([dir=rtl]) #fill,:host([dir=rtl]) .track{left:auto}#fill,.track{box-sizing:border-box;height:var(
--spectrum-slider-track-height
);margin-top:calc(var(--spectrum-slider-track-height)/-2);pointer-events:none;position:absolute;top:calc(var(--spectrum-slider-height)/2);z-index:1}:host([dir=ltr]) #fill,:host([dir=ltr]) .track{padding-left:0;padding-right:var(--spectrum-slider-track-handleoffset)}:host([dir=rtl]) #fill,:host([dir=rtl]) .track{padding-left:var(--spectrum-slider-track-handleoffset);padding-right:0}:host([dir=ltr]) #fill,:host([dir=ltr]) .track{margin-left:var(
--spectrum-slider-track-margin-offset
)}:host([dir=rtl]) #fill,:host([dir=rtl]) .track{margin-right:var(
--spectrum-slider-track-margin-offset
)}#fill,.track{padding-bottom:0;padding-top:0}:host([dir=ltr]) #fill:before,:host([dir=ltr]) .track:before{border-top-left-radius:0}:host([dir=rtl]) #fill:before,:host([dir=rtl]) .track:before{border-top-right-radius:0}:host([dir=ltr]) #fill:before,:host([dir=ltr]) .track:before{border-bottom-left-radius:0}:host([dir=rtl]) #fill:before,:host([dir=rtl]) .track:before{border-bottom-right-radius:0}:host([dir=ltr]) #fill:before,:host([dir=ltr]) .track:before{border-top-right-radius:0}:host([dir=rtl]) #fill:before,:host([dir=rtl]) .track:before{border-top-left-radius:0}:host([dir=ltr]) #fill:before,:host([dir=ltr]) .track:before{border-bottom-right-radius:0}:host([dir=rtl]) #fill:before,:host([dir=rtl]) .track:before{border-bottom-left-radius:0}#fill:before,.track:before{content:"";display:block;height:100%}:host([dir=ltr]) .track:first-of-type:before{border-top-left-radius:var(
--spectrum-slider-track-border-radius
)}:host([dir=rtl]) .track:first-of-type:before{border-top-right-radius:var(
--spectrum-slider-track-border-radius
)}:host([dir=ltr]) .track:first-of-type:before{border-bottom-left-radius:var(
--spectrum-slider-track-border-radius
)}:host([dir=rtl]) .track:first-of-type:before{border-bottom-right-radius:var(
--spectrum-slider-track-border-radius
)}:host([dir=ltr]) .track:first-of-type:before{border-top-right-radius:0}:host([dir=rtl]) .track:first-of-type:before{border-top-left-radius:0}:host([dir=ltr]) .track:first-of-type:before{border-bottom-right-radius:0}:host([dir=rtl]) .track:first-of-type:before{border-bottom-left-radius:0}:host([dir=ltr]) .track:last-of-type:before{border-top-left-radius:0}:host([dir=rtl]) .track:last-of-type:before{border-top-right-radius:0}:host([dir=ltr]) .track:last-of-type:before{border-bottom-left-radius:0}:host([dir=rtl]) .track:last-of-type:before{border-bottom-right-radius:0}:host([dir=ltr]) .track:last-of-type:before{border-top-right-radius:var(
--spectrum-slider-track-border-radius
)}:host([dir=rtl]) .track:last-of-type:before{border-top-left-radius:var(
--spectrum-slider-track-border-radius
)}:host([dir=ltr]) .track:last-of-type:before{border-bottom-right-radius:var(
--spectrum-slider-track-border-radius
)}:host([dir=rtl]) .track:last-of-type:before{border-bottom-left-radius:var(
--spectrum-slider-track-border-radius
)}:host([dir=ltr]) .track~.track{left:auto}:host([dir=rtl]) .track~.track{right:auto}:host([dir=ltr]) .track~.track{right:var(
--spectrum-slider-range-track-reset
)}:host([dir=rtl]) .track~.track{left:var(
--spectrum-slider-range-track-reset
)}:host([dir=ltr]) .track~.track{padding-left:var(
--spectrum-slider-track-handleoffset
);padding-right:0}:host([dir=rtl]) .track~.track{padding-left:0;padding-right:var(
--spectrum-slider-track-handleoffset
)}:host([dir=ltr]) .track~.track{margin-left:var(
--spectrum-slider-range-track-reset
)}:host([dir=rtl]) .track~.track{margin-right:var(
--spectrum-slider-range-track-reset
)}:host([dir=ltr]) .track~.track{margin-right:var(
--spectrum-slider-track-margin-offset
)}:host([dir=rtl]) .track~.track{margin-left:var(
--spectrum-slider-track-margin-offset
)}.track~.track{padding-bottom:0;padding-top:0}:host([dir=ltr]) #fill{margin-left:0}:host([dir=rtl]) #fill{margin-right:0}:host([dir=ltr]) #fill{padding-left:calc(var(--spectrum-slider-controls-margin) + var(--spectrum-slider-track-handleoffset));padding-right:0}:host([dir=rtl]) #fill{padding-left:0;padding-right:calc(var(--spectrum-slider-controls-margin) + var(--spectrum-slider-track-handleoffset))}#fill{padding-bottom:0;padding-top:0}:host([dir=ltr]) .spectrum-Slider-fill--right{padding-left:0;padding-right:calc(var(--spectrum-slider-controls-margin) + var(--spectrum-slider-track-handleoffset))}:host([dir=rtl]) .spectrum-Slider-fill--right{padding-left:calc(var(--spectrum-slider-controls-margin) + var(--spectrum-slider-track-handleoffset));padding-right:0}.spectrum-Slider-fill--right{padding-bottom:0;padding-top:0}:host([variant=range]) #value{-webkit-user-select:text;user-select:text}:host([dir=ltr][variant=range]) .track:before{border-top-left-radius:0}:host([dir=rtl][variant=range]) .track:before{border-top-right-radius:0}:host([dir=ltr][variant=range]) .track:before{border-bottom-left-radius:0}:host([dir=rtl][variant=range]) .track:before{border-bottom-right-radius:0}:host([dir=ltr][variant=range]) .track:before{border-top-right-radius:0}:host([dir=rtl][variant=range]) .track:before{border-top-left-radius:0}:host([dir=ltr][variant=range]) .track:before{border-bottom-right-radius:0}:host([dir=rtl][variant=range]) .track:before{border-bottom-left-radius:0}:host([dir=ltr][variant=range]) .track:first-of-type{padding-left:0;padding-right:var(--spectrum-slider-track-handleoffset)}:host([dir=rtl][variant=range]) .track:first-of-type{padding-left:var(--spectrum-slider-track-handleoffset);padding-right:0}:host([dir=ltr][variant=range]) .track:first-of-type{left:var(
--spectrum-slider-range-track-reset
)}:host([dir=rtl][variant=range]) .track:first-of-type{right:var(
--spectrum-slider-range-track-reset
)}:host([dir=ltr][variant=range]) .track:first-of-type{right:auto}:host([dir=rtl][variant=range]) .track:first-of-type{left:auto}:host([dir=ltr][variant=range]) .track:first-of-type{margin-left:var(
--spectrum-slider-track-margin-offset
)}:host([dir=rtl][variant=range]) .track:first-of-type{margin-right:var(
--spectrum-slider-track-margin-offset
)}:host([dir=ltr][variant=range]) .track:first-of-type:before{border-top-left-radius:var(
--spectrum-slider-m-track-border-radius,var(--spectrum-global-dimension-static-size-10)
)}:host([dir=rtl][variant=range]) .track:first-of-type:before{border-top-right-radius:var(
--spectrum-slider-m-track-border-radius,var(--spectrum-global-dimension-static-size-10)
)}:host([dir=ltr][variant=range]) .track:first-of-type:before{border-bottom-left-radius:var(
--spectrum-slider-m-track-border-radius,var(--spectrum-global-dimension-static-size-10)
)}:host([dir=rtl][variant=range]) .track:first-of-type:before{border-bottom-right-radius:var(
--spectrum-slider-m-track-border-radius,var(--spectrum-global-dimension-static-size-10)
)}:host([dir=ltr][variant=range]) .track:first-of-type:before{border-top-right-radius:0}:host([dir=rtl][variant=range]) .track:first-of-type:before{border-top-left-radius:0}:host([dir=ltr][variant=range]) .track:first-of-type:before{border-bottom-right-radius:0}:host([dir=rtl][variant=range]) .track:first-of-type:before{border-bottom-left-radius:0}:host([dir=ltr][variant=range]) [dir=ltr] .track,:host([dir=ltr][variant=range]) [dir=rtl] .track{left:auto}:host([dir=ltr][variant=range]) [dir=rtl] .track,:host([dir=rtl][variant=range]) [dir=rtl] .track{right:auto}:host([dir=ltr][variant=range]) [dir=ltr] .track,:host([dir=ltr][variant=range]) [dir=rtl] .track{right:auto}:host([dir=ltr][variant=range]) [dir=rtl] .track,:host([dir=rtl][variant=range]) [dir=rtl] .track{left:auto}:host([dir=ltr][variant=range]) .track,:host([dir=rtl][variant=range]) .track{margin-left:var(--spectrum-slider-range-track-reset);margin-right:var(--spectrum-slider-range-track-reset);padding-left:var(
--spectrum-slider-track-middle-handleoffset
);padding-right:var(--spectrum-slider-track-middle-handleoffset)}:host([dir=ltr][variant=range]) .track:last-of-type{padding-left:var(
--spectrum-slider-track-handleoffset
);padding-right:0}:host([dir=rtl][variant=range]) .track:last-of-type{padding-left:0;padding-right:var(
--spectrum-slider-track-handleoffset
)}:host([dir=ltr][variant=range]) .track:last-of-type{left:auto}:host([dir=rtl][variant=range]) .track:last-of-type{right:auto}:host([dir=ltr][variant=range]) .track:last-of-type{right:var(
--spectrum-slider-range-track-reset
)}:host([dir=rtl][variant=range]) .track:last-of-type{left:var(
--spectrum-slider-range-track-reset
)}:host([dir=ltr][variant=range]) .track:last-of-type{margin-right:var(
--spectrum-slider-track-margin-offset
)}:host([dir=rtl][variant=range]) .track:last-of-type{margin-left:var(
--spectrum-slider-track-margin-offset
)}:host([dir=ltr][variant=range]) .track:last-of-type:before{border-top-right-radius:var(
--spectrum-slider-m-track-border-radius,var(--spectrum-global-dimension-static-size-10)
)}:host([dir=rtl][variant=range]) .track:last-of-type:before{border-top-left-radius:var(
--spectrum-slider-m-track-border-radius,var(--spectrum-global-dimension-static-size-10)
)}:host([dir=ltr][variant=range]) .track:last-of-type:before{border-bottom-right-radius:var(
--spectrum-slider-m-track-border-radius,var(--spectrum-global-dimension-static-size-10)
)}:host([dir=rtl][variant=range]) .track:last-of-type:before{border-bottom-left-radius:var(
--spectrum-slider-m-track-border-radius,var(--spectrum-global-dimension-static-size-10)
)}:host([dir=ltr][variant=range]) .track:last-of-type:before{border-top-left-radius:0}:host([dir=rtl][variant=range]) .track:last-of-type:before{border-top-right-radius:0}:host([dir=ltr][variant=range]) .track:last-of-type:before{border-bottom-left-radius:0}:host([dir=rtl][variant=range]) .track:last-of-type:before{border-bottom-right-radius:0}:host([dir=ltr]) #ramp{left:var(
--spectrum-slider-track-margin-offset
)}:host([dir=rtl]) #ramp{right:var(
--spectrum-slider-track-margin-offset
)}:host([dir=ltr]) #ramp{right:var(
--spectrum-slider-track-margin-offset
)}:host([dir=rtl]) #ramp{left:var(
--spectrum-slider-track-margin-offset
)}#ramp{height:var(--spectrum-slider-ramp-track-height);margin-top:var(
--spectrum-slider-ramp-margin-top
);position:absolute;top:calc(var(--spectrum-slider-ramp-track-height)/2)}:host([dir=rtl]) #ramp svg{transform:matrix(-1,0,0,1,0,0)}#ramp svg{height:100%;width:100%}:host([dir=ltr]) .handle{left:0}:host([dir=rtl]) .handle{right:0}:host([dir=ltr]) .handle{margin-left:calc(var(--spectrum-slider-handle-width)/-2);margin-right:0}:host([dir=rtl]) .handle{margin-left:0;margin-right:calc(var(--spectrum-slider-handle-width)/-2)}.handle{border-radius:var(--spectrum-slider-handle-border-radius);border-style:solid;border-width:var(--spectrum-slider-handle-border-size);box-sizing:border-box;display:inline-block;height:var(--spectrum-slider-handle-height);margin-bottom:0;margin-top:var(--spectrum-slider-handle-margin-top);outline:none;position:absolute;top:calc(var(--spectrum-slider-height)/2);transition:border-width var(--spectrum-slider-animation-duration) ease-in-out;width:var(--spectrum-slider-handle-width);z-index:2}.handle.dragging,.handle.handle-highlight,.handle:active{border-width:var(
--spectrum-slider-handle-border-size
)}.handle.dragging,.handle.handle-highlight,.handle.is-tophandle,.handle:active{z-index:3}.handle:before{border-radius:100%;content:" ";display:block;height:var(--spectrum-slider-handle-height);left:50%;position:absolute;top:50%;transform:translate(-50%,-50%);transition:box-shadow var(--spectrum-global-animation-duration-100,.13s) ease-out,width var(--spectrum-global-animation-duration-100,.13s) ease-out,height var(--spectrum-global-animation-duration-100,.13s) ease-out;width:var(--spectrum-slider-handle-width)}.handle.handle-highlight:before{height:calc(var(--spectrum-slider-handle-height) + var(
--spectrum-alias-focus-ring-gap,
var(--spectrum-global-dimension-static-size-25)
)*2);width:calc(var(--spectrum-slider-handle-width) + var(
--spectrum-alias-focus-ring-gap,
var(--spectrum-global-dimension-static-size-25)
)*2)}:host([dir=ltr]) .input{left:var(
--spectrum-slider-input-left
)}:host([dir=rtl]) .input{right:var(
--spectrum-slider-input-left
)}.input{-webkit-appearance:none;border:0;cursor:default;height:var(--spectrum-slider-handle-height);margin:0;opacity:.000001;overflow:hidden;padding:0;pointer-events:none;position:absolute;top:var(--spectrum-slider-input-top);width:var(--spectrum-slider-handle-width)}.input:focus{outline:none}#label-container{display:flex;font-size:var(
--spectrum-slider-label-text-size,var(--spectrum-global-dimension-font-size-75)
);line-height:var(--spectrum-slider-label-text-line-height);margin-bottom:var(--spectrum-slider-label-margin-bottom);padding-top:var(
--spectrum-fieldlabel-m-padding-top,var(--spectrum-global-dimension-size-50)
);position:relative;width:auto}:host([dir=ltr]) #label{padding-left:0}:host([dir=rtl]) #label{padding-right:0}#label{flex-grow:1}:host([dir=ltr]) #value{padding-right:0}:host([dir=rtl]) #value{padding-left:0}:host([dir=ltr]) #value{text-align:right}:host([dir=rtl]) #value{text-align:left}#value{font-feature-settings:"tnum";cursor:default;flex-grow:0}:host([dir=ltr]) #value{margin-left:var(
--spectrum-slider-label-gap-x
)}:host([dir=rtl]) #value{margin-right:var(
--spectrum-slider-label-gap-x
)}.ticks{display:flex;justify-content:space-between;margin:0 var(--spectrum-slider-track-margin-offset);margin-top:calc(var(--spectrum-slider-tick-mark-height) + 1px);z-index:0}.tick{position:relative;width:var(--spectrum-slider-tick-mark-width)}:host([dir=ltr]) .tick:after{left:calc(50% - var(--spectrum-slider-tick-mark-width)/2)}:host([dir=rtl]) .tick:after{right:calc(50% - var(--spectrum-slider-tick-mark-width)/2)}.tick:after{border-radius:var(--spectrum-slider-tick-mark-border-radius);content:"";display:block;height:var(--spectrum-slider-tick-mark-height);position:absolute;top:0;width:var(--spectrum-slider-tick-mark-width)}.tick .tickLabel{align-items:center;display:flex;font-size:var(
--spectrum-slider-label-text-size,var(--spectrum-global-dimension-font-size-75)
);justify-content:center;line-height:var(--spectrum-slider-label-text-line-height);margin-bottom:0;margin-left:calc(var(--spectrum-slider-label-gap-x)*-1);margin-right:calc(var(--spectrum-slider-label-gap-x)*-1);margin-top:calc(var(--spectrum-slider-label-gap-y) + var(--spectrum-slider-tick-mark-height))}.tick:first-of-type .tickLabel,.tick:last-of-type .tickLabel{display:block;margin-left:0;margin-right:0;position:absolute}:host([dir=ltr]) .tick:first-of-type{left:calc(var(--spectrum-slider-tick-mark-width)/-2)}:host([dir=rtl]) .tick:first-of-type{right:calc(var(--spectrum-slider-tick-mark-width)/-2)}:host([dir=ltr]) .tick:first-of-type .tickLabel{left:0}:host([dir=rtl]) .tick:first-of-type .tickLabel{right:0}:host([dir=ltr]) .tick:last-of-type{right:calc(var(--spectrum-slider-tick-mark-width)/-2)}:host([dir=rtl]) .tick:last-of-type{left:calc(var(--spectrum-slider-tick-mark-width)/-2)}:host([dir=ltr]) .tick:last-of-type .tickLabel{right:0}:host([dir=rtl]) .tick:last-of-type .tickLabel{left:0}:host([disabled]){cursor:default}:host([disabled]) .handle{cursor:default;pointer-events:none}.spectrum-Slider-handleContainer,.spectrum-Slider-trackContainer{margin-left:calc(var(--spectrum-slider-handle-width)/2*-1);position:absolute;top:calc(var(--spectrum-slider-track-height)/2 - 1px);width:calc(100% + var(--spectrum-slider-handle-width))}.spectrum-Slider-trackContainer{height:var(--spectrum-slider-height);overflow:hidden}:host{--spectrum-slider-m-focus-ring-size:var(
--spectrum-alias-focus-ring-size,var(--spectrum-global-dimension-static-size-25)
);--spectrum-slider-m-handle-border-color-key-focus:var(
--spectrum-global-color-gray-800
);--spectrum-slider-m-handle-focus-ring-color-key-focus:var(
--spectrum-alias-focus-color,var(--spectrum-global-color-blue-400)
);--spectrum-slider-m-label-text-color:var(
--spectrum-alias-label-text-color,var(--spectrum-global-color-gray-700)
);--spectrum-slider-m-label-text-color-disabled:var(
--spectrum-alias-text-color-disabled,var(--spectrum-global-color-gray-500)
)}.track:before{background:var(
--spectrum-slider-m-track-color,var(--spectrum-global-color-gray-400)
)}#label-container{color:var(
--spectrum-slider-m-label-text-color
)}:host([variant=filled]) .track:first-child:before{background:var(
--spectrum-slider-m-track-fill-color,var(--spectrum-global-color-gray-700)
)}#fill:before{background:var(
--spectrum-slider-m-track-fill-color,var(--spectrum-global-color-gray-700)
)}#ramp path{fill:var(
--spectrum-slider-m-track-color,var(--spectrum-global-color-gray-400)
)}.handle{background:var(
--spectrum-slider-m-handle-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-slider-m-handle-border-color,var(--spectrum-global-color-gray-700)
)}.handle:hover{border-color:var(
--spectrum-slider-m-handle-border-color-hover,var(--spectrum-global-color-gray-800)
)}.handle.handle-highlight{border-color:var(
--spectrum-slider-m-handle-border-color-key-focus,var(--spectrum-global-color-gray-800)
)}.handle.handle-highlight:before{box-shadow:0 0 0 var(
--spectrum-slider-m-focus-ring-size,var(--spectrum-alias-focus-ring-size)
) var(--spectrum-slider-m-handle-focus-ring-color-key-focus)}.handle.dragging,.handle:active{border-color:var(
--spectrum-slider-m-handle-border-color-down,var(--spectrum-global-color-gray-800)
)}:host([variant=ramp]) .handle{box-shadow:0 0 0 var(
--spectrum-slider-m-handle-gap,var(--spectrum-alias-border-size-thicker)
) var(
--spectrum-alias-background-color-default,var(--spectrum-global-color-gray-100)
)}.input{background:transparent}.tick:after{background-color:var(
--spectrum-slider-m-tick-mark-color,var(--spectrum-global-color-gray-400)
)}.handle.dragging{background:var(
--spectrum-slider-m-handle-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-slider-m-handle-border-color-down,var(--spectrum-global-color-gray-800)
)}:host([variant=range]) .track:not(:first-of-type):not(:last-of-type):before{background:var(
--spectrum-slider-m-track-fill-color,var(--spectrum-global-color-gray-700)
)}:host([disabled]) #label-container{color:var(
--spectrum-slider-m-label-text-color-disabled
)}:host([disabled]) .handle{background:var(
--spectrum-alias-background-color-default,var(--spectrum-global-color-gray-100)
);border-color:var(
--spectrum-slider-m-handle-border-color-disabled,var(--spectrum-global-color-gray-400)
)}:host([disabled]) .handle:active,:host([disabled]) .handle:hover{background:var(
--spectrum-slider-m-handle-background-color,var(--spectrum-alias-background-color-transparent)
);border-color:var(
--spectrum-slider-m-handle-border-color-disabled,var(--spectrum-global-color-gray-400)
)}:host([disabled]) .track:before{background:var(
--spectrum-slider-m-track-color-disabled,var(--spectrum-global-color-gray-300)
)}:host([disabled][variant=filled]) .track:first-child:before{background:var(
--spectrum-slider-m-track-fill-color-disabled,var(--spectrum-global-color-gray-300)
)}:host([disabled]) #fill:before{background:var(
--spectrum-slider-m-track-fill-color-disabled,var(--spectrum-global-color-gray-300)
)}:host([disabled]) #ramp path{fill:var(
--spectrum-slider-ramp-track-color-disabled
)}:host([disabled][variant=range]) .track:not(:first-of-type):not(:last-of-type):before{background:var(
--spectrum-slider-m-track-fill-color-disabled,var(--spectrum-global-color-gray-300)
)}@media (forced-colors:active){:host{--spectrum-alias-background-color-default:ButtonFace;--spectrum-alias-focus-color:ButtonText;--spectrum-alias-label-text-color:CanvasText;--spectrum-alias-text-color-disabled:GrayText;--spectrum-slider-m-handle-background-color:ButtonFace;--spectrum-slider-m-handle-border-color:ButtonText;--spectrum-slider-m-handle-border-color-disabled:GrayText;--spectrum-slider-m-handle-border-color-down:Highlight;--spectrum-slider-m-handle-border-color-hover:Highlight;--spectrum-slider-m-handle-border-color-key-focus:Highlight;--spectrum-slider-m-handle-focus-ring-color-key-focus:ButtonText;--spectrum-slider-m-label-text-color:CanvasText;--spectrum-slider-m-label-text-color-disabled:GrayText;--spectrum-slider-m-tick-mark-color:ButtonText;--spectrum-slider-m-track-color:ButtonText;--spectrum-slider-m-track-color-disabled:GrayText;--spectrum-slider-m-track-fill-color:ButtonText;--spectrum-slider-m-track-fill-color-disabled:GrayText;--spectrum-slider-ramp-track-color-disabled:GrayText}.handle:before{forced-color-adjust:none}:host([variant=ramp]) .handle{forced-color-adjust:none}}:host{--spectrum-slider-handle-default-background-color:var(
--spectrum-slider-m-handle-background-color,var(--spectrum-alias-background-color-transparent)
);--spectrum-slider-handle-default-border-color:var(
--spectrum-slider-m-handle-border-color,var(--spectrum-global-color-gray-700)
)}sp-field-label{padding-bottom:0;padding-top:0}:host(:focus){outline:0}:host([editable]){display:grid;grid-template-areas:"label ." "slider number";grid-template-columns:1fr auto}:host([editable]) #label-container{grid-area:label}:host([editable]) #label-container+div{grid-area:slider}:host([editable]) sp-number-field{--spectrum-stepper-width:var(
--spectrum-slider-editable-number-field-width,var(--spectrum-global-dimension-size-1000)
);grid-area:number}:host([hide-stepper]) sp-number-field{--spectrum-stepper-width:var(
--spectrum-slider-editable-number-field-width,var(--spectrum-global-dimension-size-900)
)}:host([editable][dir=ltr]) sp-number-field{margin-left:var(--spectrum-global-dimension-size-200)}:host([editable][dir=rtl]) sp-number-field{margin-right:var(--spectrum-global-dimension-size-200)}:host([editable]) output{clip:rect(0,0,0,0);border:0;clip-path:inset(50%);height:1px;margin:0 -1px -1px 0;overflow:hidden;padding:0;position:absolute;white-space:nowrap;width:1px}:host([disabled]){pointer-events:none}#track,:host([dragging]){touch-action:none;-webkit-user-select:none;user-select:none}.not-exact.ticks{justify-content:start}:host([dir=ltr]) .not-exact .tick{padding-right:var(--sp-slider-tick-offset)}:host([dir=rtl]) .not-exact .tick{padding-left:var(--sp-slider-tick-offset)}:host([dir=ltr]) .not-exact .tick:after{left:auto;transform:translate(-50%)}:host([dir=rtl]) .not-exact .tick:after{right:auto;transform:translate(50%)}.track:before{background-size:var(--spectrum-slider-track-background-size)!important}:host([dir=ltr]) .track:before{background:var(
--spectrum-slider-m-track-color,var(
--spectrum-slider-track-color,var(--spectrum-global-color-gray-300)
)
)}:host([dir=rtl]) .track:before{background:var(
--spectrum-slider-m-track-color,var(
--spectrum-slider-track-color-rtl,var(
--spectrum-slider-track-color,var(--spectrum-global-color-gray-300)
)
)
)}:host([dir=ltr]) .track:last-of-type:before{background-position:100%}:host([dir=rtl]) .track:first-of-type:before{background-position:100%}.track:not(:first-of-type,:last-of-type){padding-left:calc(var(--spectrum-slider-handle-width)/2 + var(--spectrum-slider-track-handleoffset))!important;padding-right:calc(var(--spectrum-slider-handle-width)/2 + var(--spectrum-slider-track-handleoffset))!important}:host([dir=ltr]) .track:not(:first-of-type,:last-of-type){left:var(--spectrum-slider-track-segment-position)}:host([dir=rtl]) .track:not(:first-of-type,:last-of-type){right:var(--spectrum-slider-track-segment-position)}.visually-hidden{clip:rect(0 0 0 0);clip-path:inset(50%);height:1px;overflow:hidden;position:absolute;white-space:nowrap;width:1px}:host([label-visibility=value][dir=ltr]) #value{margin-left:auto}:host([label-visibility=value][dir=rtl]) #value{margin-right:auto}:host([label-visibility=none]) #label-container{margin:0;padding:0}
`,
  Lc = jc;
class Fc {
  constructor(t) {
    (this.handles = new Map()),
      (this.model = []),
      (this.handleOrder = []),
      (this.handleOrientation = () => {
        this.updateBoundingRect();
      }),
      (this.extractModelFromLightDom = () => {
        let e = [...this.host.querySelectorAll('[slot="handle"]')];
        e.length === 0 && (e = [this.host]),
          !e.some((r) => this.waitForUpgrade(r)) &&
            ((this.handles = new Map()),
            (this.handleOrder = []),
            e.forEach((r, o) => {
              var s;
              ((s = r.handleName) != null && s.length) ||
                (r.name = `handle${o + 1}`),
                this.handles.set(r.handleName, r),
                this.handleOrder.push(r.handleName),
                (r.handleController = this);
            }),
            this.requestUpdate());
      }),
      (this.onInputChange = (e) => {
        const r = e.target;
        (r.model.handle.value = r.valueAsNumber),
          this.requestUpdate(),
          this.dispatchChangeEvent(r, r.model.handle);
      }),
      (this.onInputFocus = (e) => {
        const r = e.target;
        let o;
        try {
          o =
            r.matches(":focus-visible") || this.host.matches(".focus-visible");
        } catch {
          o = this.host.matches(".focus-visible");
        }
        (r.model.handle.highlight = o), this.requestUpdate();
      }),
      (this.onInputBlur = (e) => {
        const r = e.target;
        (r.model.handle.highlight = !1), this.requestUpdate();
      }),
      (this.onInputKeydown = (e) => {
        const r = e.target;
        (r.model.handle.highlight = !0), this.requestUpdate();
      }),
      (this.host = t),
      new er(this.host, {
        config: { subtree: !0, childList: !0 },
        callback: () => {
          this.extractModelFromLightDom();
        },
      }),
      this.extractModelFromLightDom();
  }
  get values() {
    const t = {};
    for (const e of this.handles.values()) t[e.handleName] = e.value;
    return t;
  }
  get size() {
    return this.handles.size;
  }
  inputForHandle(t) {
    if (this.handles.has(t.handleName)) {
      const { input: e } = this.getHandleElements(t);
      return e;
    }
    throw new Error(`No input for handle "${t.name}"`);
  }
  requestUpdate() {
    this.host.hasUpdated && this.host.requestUpdate();
  }
  setValueFromHandle(t) {
    const e = this.getHandleElements(t);
    if (!e) return;
    const { input: r } = e;
    r.valueAsNumber === t.value
      ? t.dragging && t.dispatchInputEvent()
      : ((r.valueAsNumber = t.value), this.requestUpdate()),
      (t.value = r.valueAsNumber);
  }
  handleHasChanged(t) {
    t !== this.host && this.requestUpdate();
  }
  formattedValueForHandle(t) {
    var e;
    const { handle: r } = t,
      o = (e = r.numberFormat) != null ? e : this.host.numberFormat;
    return r.getAriaHandleText(t.value, o);
  }
  get formattedValues() {
    const t = new Map();
    for (const e of this.model) t.set(e.name, this.formattedValueForHandle(e));
    return t;
  }
  get focusElement() {
    const { input: t } = this.getActiveHandleElements();
    return this.host.editable && !t.model.handle.dragging
      ? this.host.numberField
      : t;
  }
  hostConnected() {
    "orientation" in screen
      ? screen.orientation.addEventListener("change", this.handleOrientation)
      : window.addEventListener("orientationchange", this.handleOrientation);
  }
  hostDisconnected() {
    "orientation" in screen
      ? screen.orientation.removeEventListener("change", this.handleOrientation)
      : window.removeEventListener("orientationchange", this.handleOrientation);
  }
  hostUpdate() {
    this.updateModel();
  }
  waitForUpgrade(t) {
    return t instanceof F
      ? !1
      : (t.addEventListener(
          "sp-slider-handle-ready",
          () => this.extractModelFromLightDom(),
          { once: !0, passive: !0 },
        ),
        !0);
  }
  get activeHandle() {
    return this.handleOrder[this.handleOrder.length - 1];
  }
  get activeHandleInputId() {
    const t = this.activeHandle;
    return `input-${this.model.findIndex((e) => e.name === t)}`;
  }
  activateHandle(t) {
    const e = this.handleOrder.findIndex((r) => r === t);
    e >= 0 && this.handleOrder.splice(e, 1), this.handleOrder.push(t);
  }
  getActiveHandleElements() {
    const t = this.activeHandle,
      e = this.handles.get(t),
      r = this.getHandleElements(e);
    return { model: e, ...r };
  }
  getHandleElements(t) {
    if (!this.handleRefMap) {
      this.handleRefMap = new WeakMap();
      const e = this.host.shadowRoot.querySelectorAll(".handle > input");
      for (const r of e) {
        const o = r,
          s = o.parentElement,
          i = this.handles.get(s.getAttribute("name"));
        i && this.handleRefMap.set(i, { input: o, handle: s });
      }
    }
    return this.handleRefMap.get(t);
  }
  clearHandleComponentCache() {
    delete this.handleRefMap;
  }
  get boundingClientRect() {
    return (
      this._boundingClientRect ||
        (this._boundingClientRect = this.host.track.getBoundingClientRect()),
      this._boundingClientRect
    );
  }
  updateBoundingRect() {
    delete this._boundingClientRect;
  }
  extractDataFromEvent(t) {
    if (!this._activePointerEventData) {
      let e = t.target.querySelector(":scope > .input");
      const r = !e,
        o = e ? e.model : this.model.find((s) => s.name === this.activeHandle);
      !e && o && (e = o.handle.focusElement),
        (this._activePointerEventData = {
          input: e,
          model: o,
          resolvedInput: r,
        });
    }
    return this._activePointerEventData;
  }
  handlePointerdown(t) {
    const { resolvedInput: e, model: r } = this.extractDataFromEvent(t);
    if (!r || this.host.disabled || t.button !== 0) {
      t.preventDefault();
      return;
    }
    this.host.track.setPointerCapture(t.pointerId),
      this.updateBoundingRect(),
      t.pointerType === "mouse" && this.host.labelEl.click(),
      (this.draggingHandle = r.handle),
      (r.handle.dragging = !0),
      this.activateHandle(r.name),
      e && this.handlePointermove(t),
      this.requestUpdate();
  }
  handlePointerup(t) {
    const { input: e, model: r } = this.extractDataFromEvent(t);
    delete this._activePointerEventData,
      r &&
        (t.pointerType === "mouse" && this.host.labelEl.click(),
        this.cancelDrag(r),
        this.requestUpdate(),
        this.host.track.releasePointerCapture(t.pointerId),
        this.dispatchChangeEvent(e, r.handle));
  }
  handlePointermove(t) {
    const { input: e, model: r } = this.extractDataFromEvent(t);
    !r ||
      !this.draggingHandle ||
      (t.stopPropagation(),
      (e.value = this.calculateHandlePosition(t, r).toString()),
      (r.handle.value = parseFloat(e.value)),
      (this.host.indeterminate = !1),
      this.requestUpdate());
  }
  cancelDrag(t) {
    (t = t || this.model.find((e) => e.name === this.activeHandle)),
      t &&
        ((t.handle.highlight = !1),
        delete this.draggingHandle,
        (t.handle.dragging = !1));
  }
  dispatchChangeEvent(t, e) {
    t.valueAsNumber = e.value;
    const r = new Event("change", { bubbles: !0, composed: !0 });
    e.dispatchEvent(r);
  }
  calculateHandlePosition(t, e) {
    const r = this.boundingClientRect,
      o = r.left,
      s = t.clientX,
      i = r.width,
      c = (this.host.isLTR ? s - o : i - (s - o)) / i;
    return e.normalization.fromNormalized(c, e.range.min, e.range.max);
  }
  renderHandle(t, e, r, o) {
    var s;
    const i = {
        handle: !0,
        dragging:
          ((s = this.draggingHandle) == null ? void 0 : s.handleName) ===
          t.name,
        "handle-highlight": t.highlight,
      },
      c = {
        [this.host.isLTR ? "left" : "right"]: `${t.normalizedValue * 100}%`,
        "z-index": r.toString(),
        "background-color": `var(--spectrum-slider-handle-background-color-${e}, var(--spectrum-slider-handle-default-background-color))`,
        "border-color": `var(--spectrum-slider-handle-border-color-${e}, var(-spectrum-slider-handle-default-border-color))`,
      },
      n = o ? `label input-${e}` : "label";
    return d`
            <div
                class=${Ue(i)}
                name=${t.name}
                style=${Qe(c)}
                role="presentation"
            >
                <input
                    type="range"
                    class="input"
                    id="input-${e}"
                    min=${t.clamp.min}
                    max=${t.clamp.max}
                    step=${t.step}
                    value=${t.value}
                    aria-disabled=${C(this.host.disabled ? "true" : void 0)}
                    tabindex=${C(this.host.editable ? -1 : void 0)}
                    aria-label=${C(t.ariaLabel)}
                    aria-labelledby=${n}
                    aria-valuetext=${this.formattedValueForHandle(t)}
                    @change=${this.onInputChange}
                    @focus=${this.onInputFocus}
                    @blur=${this.onInputBlur}
                    @keydown=${this.onInputKeydown}
                    .model=${t}
                />
            </div>
        `;
  }
  render() {
    return (
      this.clearHandleComponentCache(),
      this.model.map((t, e) => {
        const r = this.handleOrder.indexOf(t.name) + 1;
        return this.renderHandle(t, e, r, this.model.length > 1);
      })
    );
  }
  trackSegments() {
    const t = this.model.map((e) => e.normalizedValue);
    return (
      t.sort((e, r) => e - r),
      t.unshift(0),
      t.map((e, r, o) => {
        var s;
        return [e, (s = o[r + 1]) != null ? s : 1];
      })
    );
  }
  updateModel() {
    const t = [...this.handles.values()],
      e = (o) => {
        const s = t[o],
          i = t[o - 1],
          c = t[o + 1],
          n = typeof s.min == "number" ? s.min : this.host.min,
          u = typeof s.max == "number" ? s.max : this.host.max,
          m = { range: { min: n, max: u }, clamp: { min: n, max: u } };
        if (s.min === "previous" && i) {
          for (let b = o - 1; b >= 0; b--) {
            const p = t[b];
            if (typeof p.min == "number") {
              m.range.min = p.min;
              break;
            }
          }
          m.clamp.min = Math.max(i.value, m.range.min);
        }
        if (s.max === "next" && c) {
          for (let b = o + 1; b < t.length; b++) {
            const p = t[b];
            if (typeof p.max == "number") {
              m.range.max = p.max;
              break;
            }
          }
          m.clamp.max = Math.min(c.value, m.range.max);
        }
        return m;
      },
      r = t.map((o, s) => {
        var i;
        const c = e(s),
          { toNormalized: n } = o.normalization,
          u = Math.max(Math.min(o.value, c.clamp.max), c.clamp.min),
          m = n(u, c.range.min, c.range.max);
        return {
          name: o.handleName,
          value: u,
          normalizedValue: m,
          highlight: o.highlight,
          step: (i = o.step) != null ? i : this.host.step,
          normalization: o.normalization,
          handle: o,
          ariaLabel:
            o !== this.host && (o == null ? void 0 : o.label.length) > 0
              ? o.label
              : void 0,
          ...c,
        };
      });
    this.model = r;
  }
  async handleUpdatesComplete() {
    const t = [...this.handles.values()]
      .filter((e) => e !== this.host)
      .map((e) => e.updateComplete);
    await Promise.all(t);
  }
}
const xt = ["", () => {}];
class Mc extends _a {
  constructor() {
    super(...arguments),
      (this.start = xt),
      (this.streamInside = xt),
      (this.end = xt),
      (this.streamOutside = xt),
      (this.state = "off"),
      (this.handleStart = (t) => {
        this.callHandler(this.start[1], t),
          !t.defaultPrevented &&
            (this.removeListeners(), this.addListeners("on"));
      }),
      (this.handleStream = (t) => {
        this.callHandler(this.streamInside[1], t);
      }),
      (this.handleEnd = (t) => {
        this.callHandler(this.end[1], t),
          this.removeListeners(),
          this.addListeners("off");
      }),
      (this.handleBetween = (t) => {
        this.callHandler(this.streamOutside[1], t);
      });
  }
  render(t) {
    return z;
  }
  update(
    t,
    [{ start: e, end: r, streamInside: o = xt, streamOutside: s = xt }],
  ) {
    var i;
    this.element !== t.element &&
      ((this.element = t.element), this.removeListeners()),
      (this.host = ((i = t.options) == null ? void 0 : i.host) || this.element),
      (this.start = e),
      (this.end = r),
      (this.streamInside = o),
      (this.streamOutside = s),
      this.addListeners();
  }
  addListeners(t) {
    (this.state = t || this.state),
      this.state === "off"
        ? (this.addListener(this.streamOutside[0], this.handleBetween),
          this.addListener(this.start[0], this.handleStart))
        : this.state === "on" &&
          (this.addListener(this.streamInside[0], this.handleStream),
          this.addListener(this.end[0], this.handleEnd));
  }
  callHandler(t, e) {
    typeof t == "function" ? t.call(this.host, e) : t.handleEvent(e);
  }
  addListener(t, e) {
    Array.isArray(t)
      ? t.map((r) => {
          this.element.addEventListener(r, e);
        })
      : this.element.addEventListener(t, e);
  }
  removeListener(t, e) {
    Array.isArray(t)
      ? t.map((r) => {
          this.element.removeEventListener(r, e);
        })
      : this.element.removeEventListener(t, e);
  }
  removeListeners() {
    this.removeListener(this.start[0], this.handleStart),
      this.removeListener(this.streamInside[0], this.handleStream),
      this.removeListener(this.end[0], this.handleEnd),
      this.removeListener(this.streamOutside[0], this.handleBetween);
  }
  disconnected() {
    this.removeListeners();
  }
  reconnected() {
    this.addListeners();
  }
}
const Dc = At(Mc);
var qc = Object.defineProperty,
  Bc = Object.getOwnPropertyDescriptor,
  O = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Bc(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && qc(t, e, o), o;
  };
const Hc = ["filled", "ramp", "range", "tick"];
class T extends so(F, "") {
  constructor() {
    super(...arguments),
      (this.handleController = new Fc(this)),
      (this._editable = !1),
      (this.hideStepper = !1),
      (this.type = ""),
      (this._variant = ""),
      (this.getAriaValueText = (t) => {
        const e = [...t.values()];
        return e.length === 2
          ? `${e[0]}${this._forcedUnit} - ${e[1]}${this._forcedUnit}`
          : e.join(`${this._forcedUnit}, `) + this._forcedUnit;
      }),
      (this.min = 0),
      (this.max = 100),
      (this.step = 1),
      (this.tickStep = 0),
      (this.tickLabels = !1),
      (this.disabled = !1),
      (this.quiet = !1),
      (this.indeterminate = !1),
      (this._numberFieldInput = Promise.resolve());
  }
  static get styles() {
    return [Lc];
  }
  get editable() {
    return this._editable;
  }
  set editable(t) {
    if (t === this.editable) return;
    const e = this.editable;
    (this._editable = this.handleController.size < 2 ? t : !1),
      this.editable &&
        (this._numberFieldInput = tr(
          () => import("./sp-number-field-795cf3e6.js"),
          [],
          import.meta.url,
        )),
      e !== this.editable && this.requestUpdate("editable", e);
  }
  set variant(t) {
    const e = this.variant;
    t !== this.variant &&
      (Hc.includes(t)
        ? (this.setAttribute("variant", t), (this._variant = t))
        : (this.removeAttribute("variant"), (this._variant = "")),
      this.requestUpdate("variant", e));
  }
  get variant() {
    return this._variant;
  }
  get values() {
    return this.handleController.values;
  }
  get handleName() {
    return "value";
  }
  get ariaValueText() {
    return this.getAriaValueText
      ? this.getAriaValueText(this.handleController.formattedValues)
      : `${this.value}${this._forcedUnit}`;
  }
  get numberFormat() {
    return this.getNumberFormat();
  }
  get focusElement() {
    return this.handleController.focusElement;
  }
  handleLabelClick(t) {
    this.editable && (t.preventDefault(), this.focus());
  }
  render() {
    return d`
            ${this.renderLabel()} ${this.renderTrack()}
            ${
              this.editable
                ? d`
                      <sp-number-field
                          .formatOptions=${this.formatOptions || {}}
                          id="number-field"
                          min=${this.min}
                          max=${this.max}
                          step=${this.step}
                          value=${this.value}
                          ?hide-stepper=${this.hideStepper}
                          ?disabled=${this.disabled}
                          ?quiet=${this.quiet}
                          ?indeterminate=${this.indeterminate}
                          @input=${this.handleNumberInput}
                          @change=${this.handleNumberChange}
                      ></sp-number-field>
                  `
                : d``
            }
        `;
  }
  connectedCallback() {
    super.connectedCallback(), this.handleController.hostConnected();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.handleController.hostDisconnected();
  }
  update(t) {
    this.handleController.hostUpdate(),
      t.has("disabled") && this.disabled && this.handleController.cancelDrag(),
      super.update(t);
  }
  renderLabel() {
    const t =
        this.labelVisibility === "none" || this.labelVisibility === "value",
      e = this.labelVisibility === "none" || this.labelVisibility === "text";
    return d`
            <div id="label-container">
                <sp-field-label
                    class=${Ue({ "visually-hidden": t })}
                    ?disabled=${this.disabled}
                    id="label"
                    for=${
                      this.editable
                        ? "number-field"
                        : this.handleController.activeHandleInputId
                    }
                    @click=${this.handleLabelClick}
                >
                    ${this.slotHasContent ? d`` : this.label}
                    <slot>${this.label}</slot>
                </sp-field-label>
                <output
                    class=${Ue({ "visually-hidden": e })}
                    id="value"
                    aria-live="off"
                    for="input"
                >
                    ${this.ariaValueText}
                </output>
            </div>
        `;
  }
  renderRamp() {
    return this.variant !== "ramp"
      ? d``
      : d`
            <div id="ramp">
                <svg
                    viewBox="0 0 240 16"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path
                        d="M240,4v8c0,2.3-1.9,4.1-4.2,4L1,9C0.4,9,0,8.5,0,8c0-0.5,0.4-1,1-1l234.8-7C238.1-0.1,240,1.7,240,4z"
                    ></path>
                </svg>
            </div>
        `;
  }
  renderTicks() {
    if (this.variant !== "tick") return d``;
    const t = this.tickStep || this.step,
      e = (this.max - this.min) / t,
      r = e % 1 !== 0,
      o = new Array(Math.floor(e + 1));
    return (
      o.fill(0, 0, e + 1),
      d`
            <div
                class="${r ? "not-exact " : ""}ticks"
                style=${C(
                  r
                    ? `--sp-slider-tick-offset: calc(100% / ${this.max} * ${this.tickStep}`
                    : void 0,
                )}
            >
                ${o.map(
                  (s, i) => d`
                        <div class="tick">
                            ${
                              this.tickLabels
                                ? d`
                                      <div class="tickLabel">
                                          ${i * t + this.min}
                                      </div>
                                  `
                                : d``
                            }
                        </div>
                    `,
                )}
            </div>
        `
    );
  }
  renderTrackSegment(t, e) {
    return this.variant === "ramp"
      ? d``
      : d`
            <div
                class="track"
                style=${Qe(this.trackSegmentStyles(t, e))}
                role="presentation"
            ></div>
        `;
  }
  renderTrack() {
    const t = this.handleController.trackSegments(),
      e = [
        { id: "track0", html: this.renderTrackSegment(...t[0]) },
        { id: "ramp", html: this.renderRamp() },
        { id: "ticks", html: this.renderTicks() },
        { id: "handles", html: this.handleController.render() },
        ...t
          .slice(1)
          .map(([r, o], s) => ({
            id: `track${s + 1}`,
            html: this.renderTrackSegment(r, o),
          })),
      ];
    return d`
            <div
                id="track"
                ${Dc({
                  start: ["pointerdown", this.handlePointerdown],
                  streamInside: ["pointermove", this.handlePointermove],
                  end: [["pointerup", "pointercancel"], this.handlePointerup],
                })}
            >
                <div id="controls">
                    ${He(
                      e,
                      (r) => r.id,
                      (r) => r.html,
                    )}
                </div>
            </div>
        `;
  }
  handlePointerdown(t) {
    this.handleController.handlePointerdown(t);
  }
  handlePointermove(t) {
    this.handleController.handlePointermove(t);
  }
  handlePointerup(t) {
    this.handleController.handlePointerup(t);
  }
  handleNumberInput(t) {
    var e;
    const { value: r } = t.target;
    if ((e = t.target) != null && e.managedInput && !isNaN(r)) {
      this.value = r;
      return;
    }
    t.stopPropagation();
  }
  handleNumberChange(t) {
    var e;
    const { value: r } = t.target;
    isNaN(r)
      ? ((t.target.value = this.value), t.stopPropagation())
      : ((this.value = r),
        ((e = t.target) != null && e.managedInput) ||
          this.dispatchInputEvent()),
      (this.indeterminate = !1);
  }
  trackSegmentStyles(t, e) {
    const r = e - t;
    return {
      width: `${r * 100}%`,
      "--spectrum-slider-track-background-size": `${(1 / r) * 100}%`,
      "--spectrum-slider-track-segment-position": `${t * 100}%`,
    };
  }
  async getUpdateComplete() {
    const t = await super.getUpdateComplete();
    return (
      this.editable &&
        (await this._numberFieldInput, await this.numberField.updateComplete),
      await this.handleController.handleUpdatesComplete(),
      t
    );
  }
}
O([l({ type: Boolean, reflect: !0 })], T.prototype, "editable", 1),
  O(
    [l({ type: Boolean, reflect: !0, attribute: "hide-stepper" })],
    T.prototype,
    "hideStepper",
    2,
  ),
  O([l()], T.prototype, "type", 2),
  O([l({ type: String })], T.prototype, "variant", 1),
  O([l({ attribute: !1 })], T.prototype, "getAriaValueText", 2),
  O(
    [l({ type: String, reflect: !0, attribute: "label-visibility" })],
    T.prototype,
    "labelVisibility",
    2,
  ),
  O([l({ type: Number, reflect: !0 })], T.prototype, "min", 2),
  O([l({ type: Number, reflect: !0 })], T.prototype, "max", 2),
  O([l({ type: Number })], T.prototype, "step", 2),
  O([l({ type: Number, attribute: "tick-step" })], T.prototype, "tickStep", 2),
  O(
    [l({ type: Boolean, attribute: "tick-labels" })],
    T.prototype,
    "tickLabels",
    2,
  ),
  O([l({ type: Boolean, reflect: !0 })], T.prototype, "disabled", 2),
  O([l({ type: Boolean })], T.prototype, "quiet", 2),
  O([l({ type: Boolean })], T.prototype, "indeterminate", 2),
  O([W("#label")], T.prototype, "labelEl", 2),
  O([W("#number-field")], T.prototype, "numberField", 2),
  O([W("#track")], T.prototype, "track", 2);
customElements.define("sp-slider", T);
var Uc = Object.defineProperty,
  Rc = Object.getOwnPropertyDescriptor,
  zo = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Rc(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Uc(t, e, o), o;
  };
class ge extends j {
  constructor() {
    super(...arguments), (this.fullscreenMode = !1), (this.zoom = 1);
  }
  handleZoomSliderChange() {
    var r;
    const e = (
      (r = this.shadowRoot) == null ? void 0 : r.getElementById("zoom-slider")
    ).value;
    x(this, "set-zoom-centered-on-canvas", { value: e });
  }
  handleFullscreenToggle() {
    x(this, "set-fullscreen-mode", { value: !this.fullscreenMode });
  }
  render() {
    return d`
      <div class="slider-panel ${this.fullscreenMode ? "hidden" : ""}">
        <sp-slider id="zoom-slider" @input=${
          this.handleZoomSliderChange
        } label-visibility="none" label="Zoom" min=0.1 max=2 step=0.05 value=${this.zoom.toFixed(
      2,
    )}></sp-slider>
      </div>
      <div class="button-panel">
        <sp-action-button
          @click=${this.handleFullscreenToggle}
          quiet
          ?emphasized=${this.fullscreenMode}
          ?selected=${this.fullscreenMode}
        ><i class=${
          this.fullscreenMode ? "exit-fullscreen" : "enter-fullscreen"
        } slot="icon"></i></sp-action-button>
      </div>
    `;
  }
}
ge.styles = v`

    :host {
      position: fixed;
      display: flex;
      bottom: 20px;
      right: 20px;
      z-index: 2;
      align-items: center;
      gap: 20px;
    }

    .slider-panel {
      position: relative;
      background: var(--spectrum-gray-100);
      box-shadow: 0px 2px 4px rgba(0,0,0,0.1);
      border-radius: 4px;
      padding: 0px 16px;
      display: inline-block;
      opacity: 1;
      top: 0;
      transition: opacity 0.25s, top 0.25s;
    }

    .slider-panel.hidden {
      top: 25px;
      opacity: 0;
    }

    .button-panel {
      position: relative;
      background: var(--spectrum-gray-100);
      box-shadow: 0px 2px 4px rgba(0,0,0,0.1);
      border-radius: 4px;
      padding: 0px;
      display: inline-block;
    }

    sp-slider {
      width: 150px;
    }

    sp-action-button i {
      position: relative;
      display: inline-block;
      width: 18px;
      height: 18px;
      /* -webkit-mask-size: 75%; */
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center center;
      /* mask-size: 75%; */
      mask-repeat: no-repeat;
      mask-position: center center;
    }

    sp-action-button i.enter-fullscreen {
      background-color: var( --system-spectrum-actionbutton-content-color-default );
      -webkit-mask-image: url('./Smock_FullScreen_18_N.svg');
      mask-image: url('./Smock_FullScreen_18_N.svg');
    }

    sp-action-button i.exit-fullscreen {
      background-color: var( --system-spectrum-actionbutton-selected-content-color-default );
      -webkit-mask-image: url('./Smock_FullScreenExit_18_N.svg');
      mask-image: url('./Smock_FullScreenExit_18_N.svg');
    }

  `;
zo([l({ type: Boolean })], ge.prototype, "fullscreenMode", 2);
zo([l({ type: Number })], ge.prototype, "zoom", 2);
customElements.define("stvt-hud", ge);
var Gc = Object.defineProperty,
  Kc = Object.getOwnPropertyDescriptor,
  Xt = (a, t, e, r) => {
    for (
      var o = r > 1 ? void 0 : r ? Kc(t, e) : t, s = a.length - 1, i;
      s >= 0;
      s--
    )
      (i = a[s]) && (o = (r ? i(t, e, o) : i(o)) || o);
    return r && o && Gc(t, e, o), o;
  };
class ht extends j {
  constructor() {
    super(),
      (this.graphState = R.DEFAULT_STATE),
      (this.appState = _t.DEFAULT_STATE),
      (this.dictionary = []),
      (this.showAlert = !1),
      (this.alertMessage = "Alert!"),
      (this.alertKey = ""),
      (this.urlParamComponent = ""),
      (this.urlParamToken = ""),
      (this.urlParamFilter = ""),
      (this.urlParams = new URLSearchParams(window.location.search)),
      (this.urlParamComponent = this.urlParams.get("component") || ""),
      (this.urlParamToken = this.urlParams.get("token") || ""),
      (this.urlParamFilter = this.urlParams.get("filter") || ""),
      (this.graphController = new Xo());
    const t = this.urlParamToken.split(","),
      e = this.urlParamComponent.split(","),
      r = this.urlParamFilter.split(",");
    t.length === 1 && t[0] === "" && t.pop(),
      e.length === 1 && e[0] === "" && e.pop(),
      r.length === 1 && r[0] === "" && r.pop(),
      this.urlParams.has("filter") || r.push("spectrum", "light", "desktop"),
      (this.appController = new Qo({
        graphController: this.graphController,
        selectedComponents: e,
        selectedTokens: t,
        setFilters: r,
      })),
      this.graphController.onDictionaryAvailable((o) => (this.dictionary = o)),
      this.graphController.onNewGraphState((o) => (this.graphState = o)),
      this.appController.onNewAppState((o) => {
        this.appState = o;
      }),
      (this.graphState = this.graphController.displayGraphModel.state),
      (this.appState = this.appController.appModel.state),
      window.addEventListener(
        "popstate",
        () => {
          (this.urlParams = new URLSearchParams(window.location.search)),
            (this.urlParamComponent = this.urlParams.get("component") || ""),
            (this.urlParamToken = this.urlParams.get("token") || ""),
            (this.urlParamFilter = this.urlParams.get("filter") || "");
          const o = this.urlParamToken.split(","),
            s = this.urlParamComponent.split(","),
            i = this.urlParamFilter.split(",");
          o.length === 1 && o[0] === "" && o.pop(),
            s.length === 1 && s[0] === "" && s.pop(),
            i.length === 1 && i[0] === "" && i.pop(),
            this.appController.appModel.setSelectedComponents(s),
            this.appController.appModel.setSelectedTokens(o),
            this.appController.appModel.setSetFilters(i),
            this.appController.emitNewAppState();
        },
        !1,
      ),
      window.addEventListener("keydown", (o) => {
        var s, i, c;
        switch (o.code) {
          case "KeyZ":
            this.appController.handleEvent("set-zoom-centered-on-canvas", {
              value: this.appState.zoom * (o.shiftKey ? 0.8 : 1.2),
            });
            break;
          case "ArrowUp":
            this.appController.handleEvent("set-panning-position", {
              x: this.appState.panX,
              y: this.appState.panY + 30 * (o.shiftKey ? 10 : 1),
            });
            break;
          case "ArrowDown":
            this.appController.handleEvent("set-panning-position", {
              x: this.appState.panX,
              y: this.appState.panY - 30 * (o.shiftKey ? 10 : 1),
            });
            break;
          case "ArrowLeft":
            this.appController.handleEvent("set-panning-position", {
              x: this.appState.panX + 30 * (o.shiftKey ? 10 : 1),
              y: this.appState.panY,
            });
            break;
          case "ArrowRight":
            this.appController.handleEvent("set-panning-position", {
              x: this.appState.panX - 30 * (o.shiftKey ? 10 : 1),
              y: this.appState.panY,
            });
            break;
          case "KeyF":
            if (o.metaKey || o.ctrlKey) {
              o.preventDefault();
              try {
                const m =
                  (c = (
                    (i = (
                      (s = this.shadowRoot) == null
                        ? void 0
                        : s.getElementById("stvt-sidebar")
                    ).shadowRoot) == null
                      ? void 0
                      : i.getElementById("stvt-search")
                  ).shadowRoot) == null
                    ? void 0
                    : c.getElementById("search");
                m == null || m.focus();
              } catch {
                console.info(
                  "failed to traverse shadow dom looking for search input to focus",
                );
              }
            }
            break;
        }
      });
  }
  willUpdate(t) {
    if (t.has("appState")) {
      let e = !1;
      const r = this.appState.selectedComponents.join(","),
        o = this.appState.selectedTokens.join(","),
        s = this.appState.setFilters.join(",");
      r !== this.urlParamComponent &&
        ((this.urlParamComponent = r),
        r === ""
          ? this.urlParams.delete("component")
          : this.urlParams.set("component", r),
        (e = !0)),
        o !== this.urlParamToken &&
          ((this.urlParamToken = o),
          o === ""
            ? this.urlParams.delete("token")
            : this.urlParams.set("token", o),
          (e = !0)),
        s !== this.urlParamFilter &&
          ((this.urlParamFilter = s),
          s === ""
            ? this.urlParams.set("filter", s)
            : this.urlParams.set("filter", s),
          (e = !0)),
        e &&
          window.history.pushState(
            {},
            "",
            `${location.pathname}?${this.urlParams}`,
          );
    }
  }
  async handleCopiedToClipboard(t) {
    this.showAlert = !0;
    const e = t.detail.id;
    (this.alertMessage = `${e} copied to clipboard.`),
      (this.alertKey = e),
      setTimeout(() => {
        this.alertKey === e && (this.showAlert = !1);
      }, 2500);
  }
  render() {
    return d`
      <sp-theme scale="medium" color=${
        this.appState.spectrumColorTheme
      } class=${this.appState.fullscreenMode ? "fullscreen-mode" : ""}>
        <stvt-sidebar
          id="stvt-sidebar"
          @gesturechange=${(t) => t.preventDefault()}
          @gesturestart=${(t) => t.preventDefault()}
          @gestureend=${(t) => t.preventDefault()}
          @set-spectrum-color-theme=${(t) =>
            this.appController.handleEvent(
              "set-spectrum-color-theme",
              t.detail,
            )}
          @filters-selected=${(t) =>
            this.appController.handleEvent("filters-selected", t.detail)}
          @select-id=${(t) =>
            this.appController.handleEvent("select-id", t.detail)}
          .dictionary=${this.dictionary}
          .filters=${this.appState.setFilters}
          .spectrumColorTheme=${this.appState.spectrumColorTheme}
        ></stvt-sidebar>
        <stvt-tabs
          @gesturechange=${(t) => t.preventDefault()}
          @gesturestart=${(t) => t.preventDefault()}
          @gestureend=${(t) => t.preventDefault()}
          @close-tab=${(t) =>
            this.appController.handleEvent("close-tab", t.detail)}
          @close-all-tabs=${(t) =>
            this.appController.handleEvent("close-all-tabs", t.detail)}
          .dictionary=${this.dictionary}
          .selectedTokens=${this.appState.selectedTokens}
          .selectedComponents=${this.appState.selectedComponents}
        ></stvt-tabs>
        <token-graph
          @set-zoom=${(t) =>
            this.appController.handleEvent("set-zoom", t.detail)}
          @set-panning-position=${(t) =>
            this.appController.handleEvent("set-panning-position", t.detail)}
          @panning-input-delta=${(t) =>
            this.appController.handleEvent("panning-input-delta", t.detail)}
          @node-click=${(t) =>
            this.appController.handleEvent("node-click", t.detail)}
          @node-dragmove=${(t) =>
            this.graphController.handleEvent("node-dragmove", t.detail)}
          @node-pointerover=${(t) =>
            this.appController.handleEvent("node-pointerover", t.detail)}
          @node-pointerout=${(t) =>
            this.appController.handleEvent("node-pointerout", t.detail)}
          @node-dragstart=${(t) =>
            this.appController.handleEvent("node-dragstart", t.detail)}
          @node-dragend=${(t) =>
            this.appController.handleEvent("node-dragend", t.detail)}
          @generic-gesture-start=${(t) =>
            this.appController.handleEvent("generic-gesture-start", t.detail)}
          @generic-gesture-end=${(t) =>
            this.appController.handleEvent("generic-gesture-end", t.detail)}
          @copied-to-clipboard=${this.handleCopiedToClipboard}
          .graphState=${this.graphState}
          .appState=${this.appState}
        ></token-graph>
        <stvt-hud
          @set-zoom-centered-on-canvas=${(t) =>
            this.appController.handleEvent(
              "set-zoom-centered-on-canvas",
              t.detail,
            )}
          @set-fullscreen-mode=${(t) =>
            this.appController.handleEvent("set-fullscreen-mode", t.detail)}
          .fullscreenMode=${this.appState.fullscreenMode}
          .zoom=${this.appState.zoom}
        ></stvt-hud>
        <sp-toast ?open=${this.showAlert} variant="positive">
          ${this.alertMessage}
        </sp-toast>
      </sp-theme>
    `;
  }
}
ht.styles = v`

    :host {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      position: absolute;
      display: block;
      top: 0;
      left: 0;
      width: 100%;
      min-height: 100%;
      overflow: hidden;
      /* background: rgb(34,34,66); */
      /* background: #000000;
      color: #FFFFFF; */
    }

    stvt-sidebar {
      z-index: 2;
      left: 0;
      opacity: 1;
      transition: opacity 0.25s, left 0.25s;
    }

    stvt-tabs {
      z-index: 1;
      opacity: 1;
      top: 0;
      transition: opacity 0.25s, top 0.25s;
    }

    .fullscreen-mode stvt-sidebar {
      opacity: 0;
      left: -50px;
      pointer-events: none;
    }

    .fullscreen-mode stvt-tabs {
      opacity: 0;
      top: -25px;
      pointer-events: none;
    }

    token-graph {
      z-index: 0;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    sp-toast {
      position: absolute;
      top: 110px;
      left: 50%;
      z-index: 3;
      left: 50%;
      transform: translate(-50%, 0);
    }

  `;
Xt([l({ type: Object })], ht.prototype, "graphState", 2);
Xt([l({ type: Object })], ht.prototype, "appState", 2);
Xt([l({ type: Object })], ht.prototype, "dictionary", 2);
Xt([l({ type: Boolean })], ht.prototype, "showAlert", 2);
Xt([l({ type: String })], ht.prototype, "alertMessage", 2);
customElements.define("stvt-app", ht);
export {
  Pr as $,
  q as I,
  zc as L,
  ot as S,
  E as T,
  Ua as a,
  il as b,
  Dc as c,
  Ka as d,
  W as e,
  l as f,
  Fa as g,
  C as h,
  v as i,
  xo as l,
  mt as s,
  pt as t,
  d as y,
};
