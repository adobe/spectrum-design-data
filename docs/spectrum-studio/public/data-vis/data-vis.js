/*!
Data vis adapter includes Color.js.
MIT License

Copyright (c) 2021 Lea Verou, Chris Lilley

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
//#region src/features/modes/ownership.ts
function e(e) {
	let t = {};
	for (let n of e) for (let e of n.authoringCapabilities ?? []) t[e] ??= n.id;
	return t;
}
//#endregion
//#region src/features/color-system/paletteReferences.ts
function t(e) {
	let t = { ...e };
	return delete t.paletteColorId, t;
}
function n(e) {
	if (!e.scales.some((e) => e.stops.some((e) => e.paletteColorId !== void 0))) return e;
	let n = new Map(e.palette.map((e) => [e.id, e]));
	return {
		...e,
		scales: e.scales.map((e) => ({
			...e,
			stops: e.stops.map((e) => {
				if (e.paletteColorId === void 0) return e;
				let r = n.get(e.paletteColorId);
				return r ? {
					...e,
					lightness: r.lightness,
					hue: r.hue,
					chroma: r.chroma
				} : t(e);
			})
		}))
	};
}
//#endregion
//#region ../../node_modules/.pnpm/colorjs.io@0.5.2/node_modules/colorjs.io/dist/color.js
function r(e, t) {
	let n = e.length;
	Array.isArray(e[0]) || (e = [e]), Array.isArray(t[0]) || (t = t.map((e) => [e]));
	let r = t[0].length, i = t[0].map((e, n) => t.map((e) => e[n])), a = e.map((e) => i.map((t) => {
		let n = 0;
		if (!Array.isArray(e)) {
			for (let r of t) n += e * r;
			return n;
		}
		for (let r = 0; r < e.length; r++) n += e[r] * (t[r] || 0);
		return n;
	}));
	return n === 1 && (a = a[0]), r === 1 ? a.map((e) => e[0]) : a;
}
function i(e) {
	return a(e) === "string";
}
function a(e) {
	return (Object.prototype.toString.call(e).match(/^\[object\s+(.*?)\]$/)[1] || "").toLowerCase();
}
function o(e, { precision: t, unit: n }) {
	return s(e) ? "none" : l(e, t) + (n ?? "");
}
function s(e) {
	return Number.isNaN(e) || e instanceof Number && e?.none;
}
function c(e) {
	return s(e) ? 0 : e;
}
function l(e, t) {
	if (e === 0) return 0;
	let n = ~~e, r = 0;
	n && t && (r = ~~Math.log10(Math.abs(n)) + 1);
	let i = 10 ** (t - r);
	return Math.floor(e * i + .5) / i;
}
var u = {
	deg: 1,
	grad: .9,
	rad: 180 / Math.PI,
	turn: 360
};
function d(e) {
	if (!e) return;
	e = e.trim();
	let t = /^([a-z]+)\((.+?)\)$/i, n = /^-?[\d.]+$/, r = /%|deg|g?rad|turn$/, i = /\/?\s*(none|[-\w.]+(?:%|deg|g?rad|turn)?)/g, a = e.match(t);
	if (a) {
		let e = [];
		return a[2].replace(i, (t, i) => {
			let a = i.match(r), o = i;
			if (a) {
				let e = a[0], t = o.slice(0, -e.length);
				e === "%" ? (o = /* @__PURE__ */ new Number(t / 100), o.type = "<percentage>") : (o = new Number(t * u[e]), o.type = "<angle>", o.unit = e);
			} else n.test(o) ? (o = new Number(o), o.type = "<number>") : o === "none" && (o = /* @__PURE__ */ new Number(NaN), o.none = !0);
			t.startsWith("/") && (o = o instanceof Number ? o : new Number(o), o.alpha = !0), typeof o == "object" && o instanceof Number && (o.raw = i), e.push(o);
		}), {
			name: a[1].toLowerCase(),
			rawName: a[1],
			rawArgs: a[2],
			args: e
		};
	}
}
function f(e) {
	return e[e.length - 1];
}
function p(e, t, n) {
	return isNaN(e) ? t : isNaN(t) ? e : e + (t - e) * n;
}
function m(e, t, n) {
	return (n - e) / (t - e);
}
function h(e, t, n) {
	return p(t[0], t[1], m(e[0], e[1], n));
}
function g(e) {
	return e.map((e) => e.split("|").map((e) => {
		e = e.trim();
		let t = e.match(/^(<[a-z]+>)\[(-?[.\d]+),\s*(-?[.\d]+)\]?$/);
		if (t) {
			let e = new String(t[1]);
			return e.range = [+t[2], +t[3]], e;
		}
		return e;
	}));
}
function _(e, t, n) {
	return Math.max(Math.min(n, t), e);
}
function v(e, t) {
	return Math.sign(e) === Math.sign(t) ? e : -e;
}
function y(e, t) {
	return v(Math.abs(e) ** t, e);
}
function b(e, t) {
	return t === 0 ? 0 : e / t;
}
function ee(e, t, n = 0, r = e.length) {
	for (; n < r;) {
		let i = n + r >> 1;
		e[i] < t ? n = i + 1 : r = i;
	}
	return n;
}
var te = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	bisectLeft: ee,
	clamp: _,
	copySign: v,
	interpolate: p,
	interpolateInv: m,
	isNone: s,
	isString: i,
	last: f,
	mapRange: h,
	multiplyMatrices: r,
	parseCoordGrammar: g,
	parseFunction: d,
	serializeNumber: o,
	skipNone: c,
	spow: y,
	toPrecision: l,
	type: a,
	zdiv: b
}), x = new class {
	add(e, t, n) {
		if (typeof arguments[0] != "string") {
			for (var e in arguments[0]) this.add(e, arguments[0][e], arguments[1]);
			return;
		}
		(Array.isArray(e) ? e : [e]).forEach(function(e) {
			this[e] = this[e] || [], t && this[e][n ? "unshift" : "push"](t);
		}, this);
	}
	run(e, t) {
		this[e] = this[e] || [], this[e].forEach(function(e) {
			e.call(t && t.context ? t.context : t, t);
		});
	}
}(), S = {
	gamut_mapping: "css",
	precision: 5,
	deltaE: "76",
	verbose: globalThis?.process?.env?.NODE_ENV?.toLowerCase() !== "test",
	warn: function(e) {
		this.verbose && globalThis?.console?.warn?.(e);
	}
}, C = {
	D50: [
		.3457 / .3585,
		1,
		.2958 / .3585
	],
	D65: [
		.3127 / .329,
		1,
		.3583 / .329
	]
};
function ne(e) {
	return Array.isArray(e) ? e : C[e];
}
function w(e, t, n, i = {}) {
	if (e = ne(e), t = ne(t), !e || !t) throw TypeError(`Missing white point to convert ${e ? "" : "from"}${!e && !t ? "/" : ""}${t ? "" : "to"}`);
	if (e === t) return n;
	let a = {
		W1: e,
		W2: t,
		XYZ: n,
		options: i
	};
	if (x.run("chromatic-adaptation-start", a), a.M || (a.W1 === C.D65 && a.W2 === C.D50 ? a.M = [
		[
			1.0479297925449969,
			.022946870601609652,
			-.05019226628920524
		],
		[
			.02962780877005599,
			.9904344267538799,
			-.017073799063418826
		],
		[
			-.009243040646204504,
			.015055191490298152,
			.7518742814281371
		]
	] : a.W1 === C.D50 && a.W2 === C.D65 && (a.M = [
		[
			.955473421488075,
			-.02309845494876471,
			.06325924320057072
		],
		[
			-.0283697093338637,
			1.0099953980813041,
			.021041441191917323
		],
		[
			.012314014864481998,
			-.020507649298898964,
			1.330365926242124
		]
	])), x.run("chromatic-adaptation-end", a), a.M) return r(a.M, a.XYZ);
	throw TypeError("Only Bradford CAT with white points D50 and D65 supported for now.");
}
var re = new Set([
	"<number>",
	"<percentage>",
	"<angle>"
]);
function ie(e, t, n, r) {
	return Object.entries(e.coords).map(([e, i], a) => {
		let o = t.coordGrammar[a], s = r[a], c = s?.type, l;
		if (l = s.none ? o.find((e) => re.has(e)) : o.find((e) => e == c), !l) {
			let t = i.name || e;
			throw TypeError(`${c ?? s.raw} not allowed for ${t} in ${n}()`);
		}
		let u = l.range;
		c === "<percentage>" && (u ||= [0, 1]);
		let d = i.range || i.refRange;
		return u && d && (r[a] = h(u, d, r[a])), l;
	});
}
function ae(e, { meta: t } = {}) {
	let n = { str: String(e)?.trim() };
	if (x.run("parse-start", n), n.color) return n.color;
	if (n.parsed = d(n.str), n.parsed) {
		let e = n.parsed.name;
		if (e === "color") {
			let e = n.parsed.args.shift(), r = e.startsWith("--") ? e.substring(2) : `--${e}`, i = [e, r], a = n.parsed.rawArgs.indexOf("/") > 0 ? n.parsed.args.pop() : 1;
			for (let r of E.all) {
				let o = r.getFormat("color");
				if (o && (i.includes(o.id) || o.ids?.filter((e) => i.includes(e)).length)) {
					let i = Object.keys(r.coords).map((e, t) => n.parsed.args[t] || 0), s;
					return o.coordGrammar && (s = ie(r, o, "color", i)), t && Object.assign(t, {
						formatId: "color",
						types: s
					}), o.id.startsWith("--") && !e.startsWith("--") && S.warn(`${r.name} is a non-standard space and not currently supported in the CSS spec. Use prefixed color(${o.id}) instead of color(${e}).`), e.startsWith("--") && !o.id.startsWith("--") && S.warn(`${r.name} is a standard space and supported in the CSS spec. Use color(${o.id}) instead of prefixed color(${e}).`), {
						spaceId: r.id,
						coords: i,
						alpha: a
					};
				}
			}
			let o = "", s = e in E.registry ? e : r;
			if (s in E.registry) {
				let e = E.registry[s].formats?.color?.id;
				e && (o = `Did you mean color(${e})?`);
			}
			throw TypeError(`Cannot parse color(${e}). ` + (o || "Missing a plugin?"));
		} else for (let r of E.all) {
			let i = r.getFormat(e);
			if (i && i.type === "function") {
				let a = 1;
				(i.lastAlpha || f(n.parsed.args).alpha) && (a = n.parsed.args.pop());
				let o = n.parsed.args, s;
				return i.coordGrammar && (s = ie(r, i, e, o)), t && Object.assign(t, {
					formatId: i.name,
					types: s
				}), {
					spaceId: r.id,
					coords: o,
					alpha: a
				};
			}
		}
	} else for (let e of E.all) for (let r in e.formats) {
		let i = e.formats[r];
		if (i.type !== "custom" || i.test && !i.test(n.str)) continue;
		let a = i.parse(n.str);
		if (a) return a.alpha ??= 1, t && (t.formatId = r), a;
	}
	throw TypeError(`Could not parse ${e} as a color. Missing a plugin?`);
}
function T(e) {
	if (Array.isArray(e)) return e.map(T);
	if (!e) throw TypeError("Empty color reference");
	i(e) && (e = ae(e));
	let t = e.space || e.spaceId;
	return t instanceof E || (e.space = E.get(t)), e.alpha === void 0 && (e.alpha = 1), e;
}
var oe = 75e-6, E = class e {
	constructor(t) {
		this.id = t.id, this.name = t.name, this.base = t.base ? e.get(t.base) : null, this.aliases = t.aliases, this.base && (this.fromBase = t.fromBase, this.toBase = t.toBase);
		let n = t.coords ?? this.base.coords;
		for (let e in n) "name" in n[e] || (n[e].name = e);
		this.coords = n;
		let r = t.white ?? this.base.white ?? "D65";
		this.white = ne(r), this.formats = t.formats ?? {};
		for (let e in this.formats) {
			let t = this.formats[e];
			t.type ||= "function", t.name ||= e;
		}
		this.formats.color?.id || (this.formats.color = {
			...this.formats.color ?? {},
			id: t.cssId || this.id
		}), t.gamutSpace ? this.gamutSpace = t.gamutSpace === "self" ? this : e.get(t.gamutSpace) : this.isPolar ? this.gamutSpace = this.base : this.gamutSpace = this, this.gamutSpace.isUnbounded && (this.inGamut = (e, t) => !0), this.referred = t.referred, Object.defineProperty(this, "path", {
			value: se(this).reverse(),
			writable: !1,
			enumerable: !0,
			configurable: !0
		}), x.run("colorspace-init-end", this);
	}
	inGamut(e, { epsilon: t = oe } = {}) {
		if (!this.equals(this.gamutSpace)) return e = this.to(this.gamutSpace, e), this.gamutSpace.inGamut(e, { epsilon: t });
		let n = Object.values(this.coords);
		return e.every((e, r) => {
			let i = n[r];
			if (i.type !== "angle" && i.range) {
				if (Number.isNaN(e)) return !0;
				let [n, r] = i.range;
				return (n === void 0 || e >= n - t) && (r === void 0 || e <= r + t);
			}
			return !0;
		});
	}
	get isUnbounded() {
		return Object.values(this.coords).every((e) => !("range" in e));
	}
	get cssId() {
		return this.formats?.color?.id || this.id;
	}
	get isPolar() {
		for (let e in this.coords) if (this.coords[e].type === "angle") return !0;
		return !1;
	}
	getFormat(e) {
		if (typeof e == "object") return e = ce(e, this), e;
		let t;
		return t = e === "default" ? Object.values(this.formats)[0] : this.formats[e], t ? (t = ce(t, this), t) : null;
	}
	equals(e) {
		return e ? this === e || this.id === e || this.id === e.id : !1;
	}
	to(t, n) {
		if (arguments.length === 1) {
			let e = T(t);
			[t, n] = [e.space, e.coords];
		}
		if (t = e.get(t), this.equals(t)) return n;
		n = n.map((e) => Number.isNaN(e) ? 0 : e);
		let r = this.path, i = t.path, a, o;
		for (let e = 0; e < r.length && r[e].equals(i[e]); e++) a = r[e], o = e;
		if (!a) throw Error(`Cannot convert between color spaces ${this} and ${t}: no connection space was found`);
		for (let e = r.length - 1; e > o; e--) n = r[e].toBase(n);
		for (let e = o + 1; e < i.length; e++) n = i[e].fromBase(n);
		return n;
	}
	from(t, n) {
		if (arguments.length === 1) {
			let e = T(t);
			[t, n] = [e.space, e.coords];
		}
		return t = e.get(t), t.to(this, n);
	}
	toString() {
		return `${this.name} (${this.id})`;
	}
	getMinCoords() {
		let e = [];
		for (let t in this.coords) {
			let n = this.coords[t], r = n.range || n.refRange;
			e.push(r?.min ?? 0);
		}
		return e;
	}
	static registry = {};
	static get all() {
		return [...new Set(Object.values(e.registry))];
	}
	static register(e, t) {
		if (arguments.length === 1 && (t = arguments[0], e = t.id), t = this.get(t), this.registry[e] && this.registry[e] !== t) throw Error(`Duplicate color space registration: '${e}'`);
		if (this.registry[e] = t, arguments.length === 1 && t.aliases) for (let e of t.aliases) this.register(e, t);
		return t;
	}
	static get(t, ...n) {
		if (!t || t instanceof e) return t;
		if (a(t) === "string") {
			let n = e.registry[t.toLowerCase()];
			if (!n) throw TypeError(`No color space found with id = "${t}"`);
			return n;
		}
		if (n.length) return e.get(...n);
		throw TypeError(`${t} is not a valid color space`);
	}
	static resolveCoord(t, n) {
		let r = a(t), i, o;
		if (r === "string" ? t.includes(".") ? [i, o] = t.split(".") : [i, o] = [, t] : Array.isArray(t) ? [i, o] = t : (i = t.space, o = t.coordId), i = e.get(i), i ||= n, !i) throw TypeError(`Cannot resolve coordinate reference ${t}: No color space specified and relative references are not allowed here`);
		if (r = a(o), r === "number" || r === "string" && o >= 0) {
			let e = Object.entries(i.coords)[o];
			if (e) return {
				space: i,
				id: e[0],
				index: o,
				...e[1]
			};
		}
		i = e.get(i);
		let s = o.toLowerCase(), c = 0;
		for (let e in i.coords) {
			let t = i.coords[e];
			if (e.toLowerCase() === s || t.name?.toLowerCase() === s) return {
				space: i,
				id: e,
				index: c,
				...t
			};
			c++;
		}
		throw TypeError(`No "${o}" coordinate found in ${i.name}. Its coordinates are: ${Object.keys(i.coords).join(", ")}`);
	}
	static DEFAULT_FORMAT = {
		type: "functions",
		name: "color"
	};
};
function se(e) {
	let t = [e];
	for (let n = e; n = n.base;) t.push(n);
	return t;
}
function ce(e, { coords: t } = {}) {
	if (e.coords && !e.coordGrammar) {
		e.type ||= "function", e.name ||= "color", e.coordGrammar = g(e.coords);
		let n = Object.entries(t).map(([t, n], r) => {
			let i = e.coordGrammar[r][0], a = n.range || n.refRange, o = i.range, s = "";
			return i == "<percentage>" ? (o = [0, 100], s = "%") : i == "<angle>" && (s = "deg"), {
				fromRange: a,
				toRange: o,
				suffix: s
			};
		});
		e.serializeCoords = (e, t) => e.map((e, r) => {
			let { fromRange: i, toRange: a, suffix: s } = n[r];
			return i && a && (e = h(i, a, e)), e = o(e, {
				precision: t,
				unit: s
			}), e;
		});
	}
	return e;
}
var D = new E({
	id: "xyz-d65",
	name: "XYZ D65",
	coords: {
		x: { name: "X" },
		y: { name: "Y" },
		z: { name: "Z" }
	},
	white: "D65",
	formats: { color: { ids: ["xyz-d65", "xyz"] } },
	aliases: ["xyz"]
}), O = class extends E {
	constructor(e) {
		e.coords ||= {
			r: {
				range: [0, 1],
				name: "Red"
			},
			g: {
				range: [0, 1],
				name: "Green"
			},
			b: {
				range: [0, 1],
				name: "Blue"
			}
		}, e.base ||= D, e.toXYZ_M && e.fromXYZ_M && (e.toBase ??= (t) => {
			let n = r(e.toXYZ_M, t);
			return this.white !== this.base.white && (n = w(this.white, this.base.white, n)), n;
		}, e.fromBase ??= (t) => (t = w(this.base.white, this.white, t), r(e.fromXYZ_M, t))), e.referred ??= "display", super(e);
	}
};
function le(e, t) {
	return e = T(e), !t || e.space.equals(t) ? e.coords.slice() : (t = E.get(t), t.from(e));
}
function k(e, t) {
	e = T(e);
	let { space: n, index: r } = E.resolveCoord(t, e.space);
	return le(e, n)[r];
}
function ue(e, t, n) {
	return e = T(e), t = E.get(t), e.coords = t.to(e.space, n), e;
}
ue.returns = "color";
function A(e, t, n) {
	if (e = T(e), arguments.length === 2 && a(arguments[1]) === "object") {
		let t = arguments[1];
		for (let n in t) A(e, n, t[n]);
	} else {
		typeof n == "function" && (n = n(k(e, t)));
		let { space: r, index: i } = E.resolveCoord(t, e.space), a = le(e, r);
		a[i] = n, ue(e, r, a);
	}
	return e;
}
A.returns = "color";
var de = new E({
	id: "xyz-d50",
	name: "XYZ D50",
	white: "D50",
	base: D,
	fromBase: (e) => w(D.white, "D50", e),
	toBase: (e) => w("D50", D.white, e)
}), fe = 216 / 24389, pe = 24 / 116, me = 24389 / 27, he = C.D50, j = new E({
	id: "lab",
	name: "Lab",
	coords: {
		l: {
			refRange: [0, 100],
			name: "Lightness"
		},
		a: { refRange: [-125, 125] },
		b: { refRange: [-125, 125] }
	},
	white: he,
	base: de,
	fromBase(e) {
		let t = e.map((e, t) => e / he[t]).map((e) => e > fe ? Math.cbrt(e) : (me * e + 16) / 116);
		return [
			116 * t[1] - 16,
			500 * (t[0] - t[1]),
			200 * (t[1] - t[2])
		];
	},
	toBase(e) {
		let t = [];
		return t[1] = (e[0] + 16) / 116, t[0] = e[1] / 500 + t[1], t[2] = t[1] - e[2] / 200, [
			t[0] > pe ? t[0] ** 3 : (116 * t[0] - 16) / me,
			e[0] > 8 ? ((e[0] + 16) / 116) ** 3 : e[0] / me,
			t[2] > pe ? t[2] ** 3 : (116 * t[2] - 16) / me
		].map((e, t) => e * he[t]);
	},
	formats: { lab: { coords: [
		"<number> | <percentage>",
		"<number> | <percentage>[-1,1]",
		"<number> | <percentage>[-1,1]"
	] } }
});
function M(e) {
	return (e % 360 + 360) % 360;
}
function ge(e, t) {
	if (e === "raw") return t;
	let [n, r] = t.map(M), i = r - n;
	return e === "increasing" ? i < 0 && (r += 360) : e === "decreasing" ? i > 0 && (n += 360) : e === "longer" ? -180 < i && i < 180 && (i > 0 ? n += 360 : r += 360) : e === "shorter" && (i > 180 ? n += 360 : i < -180 && (r += 360)), [n, r];
}
var _e = new E({
	id: "lch",
	name: "LCH",
	coords: {
		l: {
			refRange: [0, 100],
			name: "Lightness"
		},
		c: {
			refRange: [0, 150],
			name: "Chroma"
		},
		h: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		}
	},
	base: j,
	fromBase(e) {
		let [t, n, r] = e, i, a = .02;
		return i = Math.abs(n) < a && Math.abs(r) < a ? NaN : Math.atan2(r, n) * 180 / Math.PI, [
			t,
			Math.sqrt(n ** 2 + r ** 2),
			M(i)
		];
	},
	toBase(e) {
		let [t, n, r] = e;
		return n < 0 && (n = 0), isNaN(r) && (r = 0), [
			t,
			n * Math.cos(r * Math.PI / 180),
			n * Math.sin(r * Math.PI / 180)
		];
	},
	formats: { lch: { coords: [
		"<number> | <percentage>",
		"<number> | <percentage>",
		"<number> | <angle>"
	] } }
}), ve = 25 ** 7, ye = Math.PI, be = 180 / ye, xe = ye / 180;
function Se(e) {
	let t = e * e;
	return t * t * t * e;
}
function Ce(e, t, { kL: n = 1, kC: r = 1, kH: i = 1 } = {}) {
	[e, t] = T([e, t]);
	let [a, o, s] = j.from(e), c = _e.from(j, [
		a,
		o,
		s
	])[1], [l, u, d] = j.from(t), f = _e.from(j, [
		l,
		u,
		d
	])[1];
	c < 0 && (c = 0), f < 0 && (f = 0);
	let p = Se((c + f) / 2), m = .5 * (1 - Math.sqrt(p / (p + ve))), h = (1 + m) * o, g = (1 + m) * u, _ = Math.sqrt(h ** 2 + s ** 2), v = Math.sqrt(g ** 2 + d ** 2), y = h === 0 && s === 0 ? 0 : Math.atan2(s, h), b = g === 0 && d === 0 ? 0 : Math.atan2(d, g);
	y < 0 && (y += 2 * ye), b < 0 && (b += 2 * ye), y *= be, b *= be;
	let ee = l - a, te = v - _, x = b - y, C = y + b, ne = Math.abs(x), w;
	_ * v === 0 ? w = 0 : ne <= 180 ? w = x : x > 180 ? w = x - 360 : x < -180 ? w = x + 360 : S.warn("the unthinkable has happened");
	let re = 2 * Math.sqrt(v * _) * Math.sin(w * xe / 2), ie = (a + l) / 2, ae = (_ + v) / 2, oe = Se(ae), E;
	E = _ * v === 0 ? C : ne <= 180 ? C / 2 : C < 360 ? (C + 360) / 2 : (C - 360) / 2;
	let se = (ie - 50) ** 2, ce = 1 + .015 * se / Math.sqrt(20 + se), D = 1 + .045 * ae, O = 1;
	O -= .17 * Math.cos((E - 30) * xe), O += .24 * Math.cos(2 * E * xe), O += .32 * Math.cos((3 * E + 6) * xe), O -= .2 * Math.cos((4 * E - 63) * xe);
	let le = 1 + .015 * ae * O, k = 30 * Math.exp(-1 * ((E - 275) / 25) ** 2), ue = 2 * Math.sqrt(oe / (oe + ve)), A = -1 * Math.sin(2 * k * xe) * ue, de = (ee / (n * ce)) ** 2;
	return de += (te / (r * D)) ** 2, de += (re / (i * le)) ** 2, de += A * (te / (r * D)) * (re / (i * le)), Math.sqrt(de);
}
var we = [
	[
		.819022437996703,
		.3619062600528904,
		-.1288737815209879
	],
	[
		.0329836539323885,
		.9292868615863434,
		.0361446663506424
	],
	[
		.0481771893596242,
		.2642395317527308,
		.6335478284694309
	]
], Te = [
	[
		1.2268798758459243,
		-.5578149944602171,
		.2813910456659647
	],
	[
		-.0405757452148008,
		1.112286803280317,
		-.0717110580655164
	],
	[
		-.0763729366746601,
		-.4214933324022432,
		1.5869240198367816
	]
], Ee = [
	[
		.210454268309314,
		.7936177747023054,
		-.0040720430116193
	],
	[
		1.9779985324311684,
		-2.42859224204858,
		.450593709617411
	],
	[
		.0259040424655478,
		.7827717124575296,
		-.8086757549230774
	]
], De = [
	[
		1,
		.3963377773761749,
		.2158037573099136
	],
	[
		1,
		-.1055613458156586,
		-.0638541728258133
	],
	[
		1,
		-.0894841775298119,
		-1.2914855480194092
	]
], Oe = new E({
	id: "oklab",
	name: "Oklab",
	coords: {
		l: {
			refRange: [0, 1],
			name: "Lightness"
		},
		a: { refRange: [-.4, .4] },
		b: { refRange: [-.4, .4] }
	},
	white: "D65",
	base: D,
	fromBase(e) {
		return r(Ee, r(we, e).map((e) => Math.cbrt(e)));
	},
	toBase(e) {
		return r(Te, r(De, e).map((e) => e ** 3));
	},
	formats: { oklab: { coords: [
		"<percentage> | <number>",
		"<number> | <percentage>[-1,1]",
		"<number> | <percentage>[-1,1]"
	] } }
});
function ke(e, t) {
	[e, t] = T([e, t]);
	let [n, r, i] = Oe.from(e), [a, o, s] = Oe.from(t), c = n - a, l = r - o, u = i - s;
	return Math.sqrt(c ** 2 + l ** 2 + u ** 2);
}
var Ae = 75e-6;
function je(e, t, { epsilon: n = Ae } = {}) {
	e = T(e), t ||= e.space, t = E.get(t);
	let r = e.coords;
	return t !== e.space && (r = t.from(e)), t.inGamut(r, { epsilon: n });
}
function Me(e) {
	return {
		space: e.space,
		coords: e.coords.slice(),
		alpha: e.alpha
	};
}
function Ne(e, t, n = "lab") {
	n = E.get(n);
	let r = n.from(e), i = n.from(t);
	return Math.sqrt(r.reduce((e, t, n) => {
		let r = i[n];
		return isNaN(t) || isNaN(r) ? e : e + (r - t) ** 2;
	}, 0));
}
function Pe(e, t) {
	return Ne(e, t, "lab");
}
var Fe = Math.PI / 180;
function Ie(e, t, { l: n = 2, c: r = 1 } = {}) {
	[e, t] = T([e, t]);
	let [i, a, o] = j.from(e), [, s, c] = _e.from(j, [
		i,
		a,
		o
	]), [l, u, d] = j.from(t), f = _e.from(j, [
		l,
		u,
		d
	])[1];
	s < 0 && (s = 0), f < 0 && (f = 0);
	let p = i - l, m = s - f, h = a - u, g = o - d, _ = h ** 2 + g ** 2 - m ** 2, v = .511;
	i >= 16 && (v = .040975 * i / (1 + .01765 * i));
	let y = .0638 * s / (1 + .0131 * s) + .638, b;
	Number.isNaN(c) && (c = 0), b = c >= 164 && c <= 345 ? .56 + Math.abs(.2 * Math.cos((c + 168) * Fe)) : .36 + Math.abs(.4 * Math.cos((c + 35) * Fe));
	let ee = s ** 4, te = Math.sqrt(ee / (ee + 1900)), x = y * (te * b + 1 - te), S = (p / (n * v)) ** 2;
	return S += (m / (r * y)) ** 2, S += _ / x ** 2, Math.sqrt(S);
}
var Le = 203, Re = new E({
	id: "xyz-abs-d65",
	cssId: "--xyz-abs-d65",
	name: "Absolute XYZ D65",
	coords: {
		x: {
			refRange: [0, 9504.7],
			name: "Xa"
		},
		y: {
			refRange: [0, 1e4],
			name: "Ya"
		},
		z: {
			refRange: [0, 10888.3],
			name: "Za"
		}
	},
	base: D,
	fromBase(e) {
		return e.map((e) => Math.max(e * Le, 0));
	},
	toBase(e) {
		return e.map((e) => Math.max(e / Le, 0));
	}
}), ze = 1.15, Be = .66, Ve = 2610 / 2 ** 14, He = 2 ** 14 / 2610, Ue = 3424 / 2 ** 12, We = 2413 / 2 ** 7, Ge = 2392 / 2 ** 7, Ke = 1.7 * 2523 / 2 ** 5, qe = 2 ** 5 / (1.7 * 2523), Je = -.56, Ye = 16295499532821565e-27, Xe = [
	[
		.41478972,
		.579999,
		.014648
	],
	[
		-.20151,
		1.120649,
		.0531008
	],
	[
		-.0166008,
		.2648,
		.6684799
	]
], Ze = [
	[
		1.9242264357876067,
		-1.0047923125953657,
		.037651404030618
	],
	[
		.35031676209499907,
		.7264811939316552,
		-.06538442294808501
	],
	[
		-.09098281098284752,
		-.3127282905230739,
		1.5227665613052603
	]
], Qe = [
	[
		.5,
		.5,
		0
	],
	[
		3.524,
		-4.066708,
		.542708
	],
	[
		.199076,
		1.096799,
		-1.295875
	]
], $e = [
	[
		1,
		.1386050432715393,
		.05804731615611886
	],
	[
		.9999999999999999,
		-.1386050432715393,
		-.05804731615611886
	],
	[
		.9999999999999998,
		-.09601924202631895,
		-.8118918960560388
	]
], et = new E({
	id: "jzazbz",
	name: "Jzazbz",
	coords: {
		jz: {
			refRange: [0, 1],
			name: "Jz"
		},
		az: { refRange: [-.5, .5] },
		bz: { refRange: [-.5, .5] }
	},
	base: Re,
	fromBase(e) {
		let [t, n, i] = e, [a, o, s] = r(Qe, r(Xe, [
			ze * t - (ze - 1) * i,
			Be * n - (Be - 1) * t,
			i
		]).map(function(e) {
			return ((Ue + We * (e / 1e4) ** Ve) / (1 + Ge * (e / 1e4) ** Ve)) ** Ke;
		}));
		return [
			(1 + Je) * a / (1 + Je * a) - Ye,
			o,
			s
		];
	},
	toBase(e) {
		let [t, n, i] = e, [a, o, s] = r(Ze, r($e, [
			(t + Ye) / (1 + Je - Je * (t + Ye)),
			n,
			i
		]).map(function(e) {
			return 1e4 * ((Ue - e ** qe) / (Ge * e ** qe - We)) ** He;
		})), c = (a + (ze - 1) * s) / ze;
		return [
			c,
			(o + (Be - 1) * c) / Be,
			s
		];
	},
	formats: { color: { coords: [
		"<number> | <percentage>",
		"<number> | <percentage>[-1,1]",
		"<number> | <percentage>[-1,1]"
	] } }
}), tt = new E({
	id: "jzczhz",
	name: "JzCzHz",
	coords: {
		jz: {
			refRange: [0, 1],
			name: "Jz"
		},
		cz: {
			refRange: [0, 1],
			name: "Chroma"
		},
		hz: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		}
	},
	base: et,
	fromBase(e) {
		let [t, n, r] = e, i, a = 2e-4;
		return i = Math.abs(n) < a && Math.abs(r) < a ? NaN : Math.atan2(r, n) * 180 / Math.PI, [
			t,
			Math.sqrt(n ** 2 + r ** 2),
			M(i)
		];
	},
	toBase(e) {
		return [
			e[0],
			e[1] * Math.cos(e[2] * Math.PI / 180),
			e[1] * Math.sin(e[2] * Math.PI / 180)
		];
	}
});
function nt(e, t) {
	[e, t] = T([e, t]);
	let [n, r, i] = tt.from(e), [a, o, s] = tt.from(t), c = n - a, l = r - o;
	Number.isNaN(i) && Number.isNaN(s) ? (i = 0, s = 0) : Number.isNaN(i) ? i = s : Number.isNaN(s) && (s = i);
	let u = i - s, d = 2 * Math.sqrt(r * o) * Math.sin(u / 2 * (Math.PI / 180));
	return Math.sqrt(c ** 2 + l ** 2 + d ** 2);
}
var rt = 3424 / 4096, it = 2413 / 128, at = 2392 / 128, ot = 2610 / 16384, st = 2523 / 32, ct = 16384 / 2610, lt = 32 / 2523, ut = [
	[
		.3592832590121217,
		.6976051147779502,
		-.035891593232029
	],
	[
		-.1920808463704993,
		1.100476797037432,
		.0753748658519118
	],
	[
		.0070797844607479,
		.0748396662186362,
		.8433265453898765
	]
], dt = [
	[
		2048 / 4096,
		2048 / 4096,
		0
	],
	[
		6610 / 4096,
		-13613 / 4096,
		7003 / 4096
	],
	[
		17933 / 4096,
		-17390 / 4096,
		-543 / 4096
	]
], ft = [
	[
		.9999999999999998,
		.0086090370379328,
		.111029625003026
	],
	[
		.9999999999999998,
		-.0086090370379328,
		-.1110296250030259
	],
	[
		.9999999999999998,
		.5600313357106791,
		-.3206271749873188
	]
], pt = [
	[
		2.0701522183894223,
		-1.3263473389671563,
		.2066510476294053
	],
	[
		.3647385209748072,
		.6805660249472273,
		-.0453045459220347
	],
	[
		-.0497472075358123,
		-.0492609666966131,
		1.1880659249923042
	]
], mt = new E({
	id: "ictcp",
	name: "ICTCP",
	coords: {
		i: {
			refRange: [0, 1],
			name: "I"
		},
		ct: {
			refRange: [-.5, .5],
			name: "CT"
		},
		cp: {
			refRange: [-.5, .5],
			name: "CP"
		}
	},
	base: Re,
	fromBase(e) {
		return ht(r(ut, e));
	},
	toBase(e) {
		return r(pt, gt(e));
	}
});
function ht(e) {
	return r(dt, e.map(function(e) {
		return ((rt + it * (e / 1e4) ** ot) / (1 + at * (e / 1e4) ** ot)) ** st;
	}));
}
function gt(e) {
	return r(ft, e).map(function(e) {
		return 1e4 * (Math.max(e ** lt - rt, 0) / (it - at * e ** lt)) ** ct;
	});
}
function _t(e, t) {
	[e, t] = T([e, t]);
	let [n, r, i] = mt.from(e), [a, o, s] = mt.from(t);
	return 720 * Math.sqrt((n - a) ** 2 + .25 * (r - o) ** 2 + (i - s) ** 2);
}
var vt = C.D65, yt = .42, bt = 1 / yt, xt = 2 * Math.PI, St = [
	[
		.401288,
		.650173,
		-.051461
	],
	[
		-.250268,
		1.204414,
		.045854
	],
	[
		-.002079,
		.048952,
		.953127
	]
], Ct = [
	[
		1.8620678550872327,
		-1.0112546305316843,
		.14918677544445175
	],
	[
		.38752654323613717,
		.6214474419314753,
		-.008973985167612518
	],
	[
		-.015841498849333856,
		-.03412293802851557,
		1.0499644368778496
	]
], wt = [
	[
		460,
		451,
		288
	],
	[
		460,
		-891,
		-261
	],
	[
		460,
		-220,
		-6300
	]
], Tt = {
	dark: [
		.8,
		.525,
		.8
	],
	dim: [
		.9,
		.59,
		.9
	],
	average: [
		1,
		.69,
		1
	]
}, Et = {
	h: [
		20.14,
		90,
		164.25,
		237.53,
		380.14
	],
	e: [
		.8,
		.7,
		1,
		1.2,
		.8
	],
	H: [
		0,
		100,
		200,
		300,
		400
	]
}, Dt = 180 / Math.PI, Ot = Math.PI / 180;
function kt(e, t) {
	return e.map((e) => {
		let n = y(t * Math.abs(e) * .01, yt);
		return 400 * v(n, e) / (n + 27.13);
	});
}
function At(e, t) {
	let n = 100 / t * 27.13 ** bt;
	return e.map((e) => {
		let t = Math.abs(e);
		return v(n * y(t / (400 - t), bt), e);
	});
}
function jt(e) {
	let t = M(e);
	t <= Et.h[0] && (t += 360);
	let n = ee(Et.h, t) - 1, [r, i] = Et.h.slice(n, n + 2), [a, o] = Et.e.slice(n, n + 2), s = Et.H[n], c = (t - r) / a;
	return s + 100 * c / (c + (i - t) / o);
}
function Mt(e) {
	let t = (e % 400 + 400) % 400, n = Math.floor(.01 * t);
	t %= 100;
	let [r, i] = Et.h.slice(n, n + 2), [a, o] = Et.e.slice(n, n + 2);
	return M((t * (o * r - a * i) - 100 * r * o) / (t * (o - a) - 100 * o));
}
function Nt(e, t, n, i, a) {
	let o = {};
	o.discounting = a, o.refWhite = e, o.surround = i;
	let s = e.map((e) => e * 100);
	o.la = t, o.yb = n;
	let c = s[1], l = r(St, s);
	i = Tt[o.surround];
	let u = i[0];
	o.c = i[1], o.nc = i[2];
	let d = (1 / (5 * o.la + 1)) ** 4;
	o.fl = d * o.la + .1 * (1 - d) * (1 - d) * Math.cbrt(5 * o.la), o.flRoot = o.fl ** .25, o.n = o.yb / c, o.z = 1.48 + Math.sqrt(o.n), o.nbb = .725 * o.n ** -.2, o.ncb = o.nbb;
	let f = a ? 1 : Math.max(Math.min(u * (1 - 1 / 3.6 * Math.exp((-o.la - 42) / 92)), 1), 0);
	o.dRgb = l.map((e) => p(1, c / e, f)), o.dRgbInv = o.dRgb.map((e) => 1 / e);
	let m = kt(l.map((e, t) => e * o.dRgb[t]), o.fl);
	return o.aW = o.nbb * (2 * m[0] + m[1] + .05 * m[2]), o;
}
var Pt = Nt(vt, 64 / Math.PI * .2, 20, "average", !1);
function Ft(e, t) {
	if (!(e.J !== void 0 ^ e.Q !== void 0)) throw Error("Conversion requires one and only one: 'J' or 'Q'");
	if (!(e.C !== void 0 ^ e.M !== void 0 ^ e.s !== void 0)) throw Error("Conversion requires one and only one: 'C', 'M' or 's'");
	if (!(e.h !== void 0 ^ e.H !== void 0)) throw Error("Conversion requires one and only one: 'h' or 'H'");
	if (e.J === 0 || e.Q === 0) return [
		0,
		0,
		0
	];
	let n = 0;
	n = e.h === void 0 ? Mt(e.H) * Ot : M(e.h) * Ot;
	let i = Math.cos(n), a = Math.sin(n), o = 0;
	e.J === void 0 ? e.Q !== void 0 && (o = .25 * t.c * e.Q / ((t.aW + 4) * t.flRoot)) : o = y(e.J, 1 / 2) * .1;
	let s = 0;
	e.C === void 0 ? e.M === void 0 ? e.s !== void 0 && (s = 4e-4 * e.s ** 2 * (t.aW + 4) / t.c) : s = e.M / t.flRoot / o : s = e.C / o;
	let c = y(s * (1.64 - .29 ** t.n) ** -.73, 10 / 9), l = .25 * (Math.cos(n + 2) + 3.8), u = t.aW * y(o, 2 / t.c / t.z), d = 5e4 / 13 * t.nc * t.ncb * l, f = u / t.nbb, p = 23 * (f + .305) * b(c, 23 * d + c * (11 * i + 108 * a));
	return r(Ct, At(r(wt, [
		f,
		p * i,
		p * a
	]).map((e) => e * 1 / 1403), t.fl).map((e, n) => e * t.dRgbInv[n])).map((e) => e / 100);
}
function It(e, t) {
	let n = kt(r(St, e.map((e) => e * 100)).map((e, n) => e * t.dRgb[n]), t.fl), i = n[0] + (-12 * n[1] + n[2]) / 11, a = (n[0] + n[1] - 2 * n[2]) / 9, o = (Math.atan2(a, i) % xt + xt) % xt, s = .25 * (Math.cos(o + 2) + 3.8), c = y(5e4 / 13 * t.nc * t.ncb * b(s * Math.sqrt(i ** 2 + a ** 2), n[0] + n[1] + 1.05 * n[2] + .305), .9) * (1.64 - .29 ** t.n) ** .73, l = y(t.nbb * (2 * n[0] + n[1] + .05 * n[2]) / t.aW, .5 * t.c * t.z), u = 100 * y(l, 2), d = 4 / t.c * l * (t.aW + 4) * t.flRoot, f = c * l, p = f * t.flRoot, m = M(o * Dt), h = jt(m);
	return {
		J: u,
		C: f,
		h: m,
		s: 50 * y(t.c * c / (t.aW + 4), 1 / 2),
		Q: d,
		M: p,
		H: h
	};
}
var Lt = new E({
	id: "cam16-jmh",
	cssId: "--cam16-jmh",
	name: "CAM16-JMh",
	coords: {
		j: {
			refRange: [0, 100],
			name: "J"
		},
		m: {
			refRange: [0, 105],
			name: "Colorfulness"
		},
		h: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		}
	},
	base: D,
	fromBase(e) {
		let t = It(e, Pt);
		return [
			t.J,
			t.M,
			t.h
		];
	},
	toBase(e) {
		return Ft({
			J: e[0],
			M: e[1],
			h: e[2]
		}, Pt);
	}
}), Rt = C.D65, zt = 216 / 24389, Bt = 24389 / 27;
function Vt(e) {
	return 116 * (e > zt ? Math.cbrt(e) : (Bt * e + 16) / 116) - 16;
}
function Ht(e) {
	return e > 8 ? ((e + 16) / 116) ** 3 : e / Bt;
}
function Ut(e, t) {
	let [n, r, i] = e, a = [], o = 0;
	if (i === 0) return [
		0,
		0,
		0
	];
	let s = Ht(i);
	o = i > 0 ? .00379058511492914 * i ** 2 + .608983189401032 * i + .9155088574762233 : 9514440756550361e-21 * i ** 2 + .08693057439788597 * i - 21.928975842194614;
	let c = 0, l = Infinity;
	for (; c <= 15;) {
		a = Ft({
			J: o,
			C: r,
			h: n
		}, t);
		let e = Math.abs(a[1] - s);
		if (e < l) {
			if (e <= 2e-12) return a;
			l = e;
		}
		o -= (a[1] - s) * o / (2 * a[1]), c += 1;
	}
	return Ft({
		J: o,
		C: r,
		h: n
	}, t);
}
function Wt(e, t) {
	let n = Vt(e[1]);
	if (n === 0) return [
		0,
		0,
		0
	];
	let r = It(e, Gt);
	return [
		M(r.h),
		r.C,
		n
	];
}
var Gt = Nt(Rt, 200 / Math.PI * Ht(50), Ht(50) * 100, "average", !1), Kt = new E({
	id: "hct",
	name: "HCT",
	coords: {
		h: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		},
		c: {
			refRange: [0, 145],
			name: "Colorfulness"
		},
		t: {
			refRange: [0, 100],
			name: "Tone"
		}
	},
	base: D,
	fromBase(e) {
		return Wt(e);
	},
	toBase(e) {
		return Ut(e, Gt);
	},
	formats: { color: {
		id: "--hct",
		coords: [
			"<number> | <angle>",
			"<percentage> | <number>",
			"<percentage> | <number>"
		]
	} }
}), qt = Math.PI / 180, Jt = [
	1,
	.007,
	.0228
];
function Yt(e) {
	e[1] < 0 && (e = Kt.fromBase(Kt.toBase(e)));
	let t = Math.log(Math.max(1 + Jt[2] * e[1] * Gt.flRoot, 1)) / Jt[2], n = e[0] * qt, r = t * Math.cos(n), i = t * Math.sin(n);
	return [
		e[2],
		r,
		i
	];
}
function Xt(e, t) {
	[e, t] = T([e, t]);
	let [n, r, i] = Yt(Kt.from(e)), [a, o, s] = Yt(Kt.from(t));
	return Math.sqrt((n - a) ** 2 + (r - o) ** 2 + (i - s) ** 2);
}
var Zt = {
	deltaE76: Pe,
	deltaECMC: Ie,
	deltaE2000: Ce,
	deltaEJz: nt,
	deltaEITP: _t,
	deltaEOK: ke,
	deltaEHCT: Xt
};
function Qt(e) {
	return Math.max(parseFloat(`1e${(e ? Math.floor(Math.log10(Math.abs(e))) : 0) - 2}`), 1e-6);
}
var $t = {
	hct: {
		method: "hct.c",
		jnd: 2,
		deltaEMethod: "hct",
		blackWhiteClamp: {}
	},
	"hct-tonal": {
		method: "hct.c",
		jnd: 0,
		deltaEMethod: "hct",
		blackWhiteClamp: {
			channel: "hct.t",
			min: 0,
			max: 100
		}
	}
};
function N(e, { method: t = S.gamut_mapping, space: n = void 0, deltaEMethod: r = "", jnd: a = 2, blackWhiteClamp: o = {} } = {}) {
	if (e = T(e), i(arguments[1]) ? n = arguments[1] : n ||= e.space, n = E.get(n), je(e, n, { epsilon: 0 })) return e;
	let c;
	if (t === "css") c = tn(e, { space: n });
	else {
		if (t !== "clip" && !je(e, n)) {
			Object.prototype.hasOwnProperty.call($t, t) && ({method: t, jnd: a, deltaEMethod: r, blackWhiteClamp: o} = $t[t]);
			let i = Ce;
			if (r !== "") {
				for (let e in Zt) if ("deltae" + r.toLowerCase() === e.toLowerCase()) {
					i = Zt[e];
					break;
				}
			}
			let l = N(P(e, n), {
				method: "clip",
				space: n
			});
			if (i(e, l) > a) {
				if (Object.keys(o).length === 3) {
					let t = E.resolveCoord(o.channel), n = k(P(e, t.space), t.id);
					if (s(n) && (n = 0), n >= o.max) return P({
						space: "xyz-d65",
						coords: C.D65
					}, e.space);
					if (n <= o.min) return P({
						space: "xyz-d65",
						coords: [
							0,
							0,
							0
						]
					}, e.space);
				}
				let r = E.resolveCoord(t), l = r.space, u = r.id, d = P(e, l);
				d.coords.forEach((e, t) => {
					s(e) && (d.coords[t] = 0);
				});
				let f = (r.range || r.refRange)[0], p = Qt(a), m = f, h = k(d, u);
				for (; h - m > p;) {
					let e = Me(d);
					e = N(e, {
						space: n,
						method: "clip"
					}), i(d, e) - a < p ? m = k(d, u) : h = k(d, u), A(d, u, (m + h) / 2);
				}
				c = P(d, n);
			} else c = l;
		} else c = P(e, n);
		if (t === "clip" || !je(c, n, { epsilon: 0 })) {
			let e = Object.values(n.coords).map((e) => e.range || []);
			c.coords = c.coords.map((t, n) => {
				let [r, i] = e[n];
				return r !== void 0 && (t = Math.max(r, t)), i !== void 0 && (t = Math.min(t, i)), t;
			});
		}
	}
	return n !== e.space && (c = P(c, e.space)), e.coords = c.coords, e;
}
N.returns = "color";
var en = {
	WHITE: {
		space: Oe,
		coords: [
			1,
			0,
			0
		]
	},
	BLACK: {
		space: Oe,
		coords: [
			0,
			0,
			0
		]
	}
};
function tn(e, { space: t } = {}) {
	let n = .02, r = 1e-4;
	e = T(e), t ||= e.space, t = E.get(t);
	let i = E.get("oklch");
	if (t.isUnbounded) return P(e, t);
	let a = P(e, i), o = a.coords[0];
	if (o >= 1) {
		let n = P(en.WHITE, t);
		return n.alpha = e.alpha, P(n, t);
	}
	if (o <= 0) {
		let n = P(en.BLACK, t);
		return n.alpha = e.alpha, P(n, t);
	}
	if (je(a, t, { epsilon: 0 })) return P(a, t);
	function s(e) {
		let n = P(e, t), r = Object.values(t.coords);
		return n.coords = n.coords.map((e, t) => {
			if ("range" in r[t]) {
				let [n, i] = r[t].range;
				return _(n, e, i);
			}
			return e;
		}), n;
	}
	let c = 0, l = a.coords[1], u = !0, d = Me(a), f = s(d), p = ke(f, d);
	if (p < n) return f;
	for (; l - c > r;) {
		let e = (c + l) / 2;
		if (d.coords[1] = e, u && je(d, t, { epsilon: 0 })) c = e;
		else if (f = s(d), p = ke(f, d), p < n) {
			if (n - p < r) break;
			u = !1, c = e;
		} else l = e;
	}
	return f;
}
function P(e, t, { inGamut: n } = {}) {
	e = T(e), t = E.get(t);
	let r = t.from(e), i = {
		space: t,
		coords: r,
		alpha: e.alpha
	};
	return n && (i = N(i, n === !0 ? void 0 : n)), i;
}
P.returns = "color";
function nn(e, { precision: t = S.precision, format: n = "default", inGamut: r = !0, ...i } = {}) {
	let a;
	e = T(e);
	let s = n;
	n = e.space.getFormat(n) ?? e.space.getFormat("default") ?? E.DEFAULT_FORMAT;
	let c = e.coords.slice();
	if (r ||= n.toGamut, r && !je(e) && (c = N(Me(e), r === !0 ? void 0 : r).coords), n.type === "custom") if (i.precision = t, n.serialize) a = n.serialize(c, e.alpha, i);
	else throw TypeError(`format ${s} can only be used to parse colors, not for serialization`);
	else {
		let r = n.name || "color";
		n.serializeCoords ? c = n.serializeCoords(c, t) : t !== null && (c = c.map((e) => o(e, { precision: t })));
		let i = [...c];
		if (r === "color") {
			let t = n.id || n.ids?.[0] || e.space.id;
			i.unshift(t);
		}
		let s = e.alpha;
		t !== null && (s = o(s, { precision: t }));
		let l = e.alpha >= 1 || n.noAlpha ? "" : `${n.commas ? "," : " /"} ${s}`;
		a = `${r}(${i.join(n.commas ? ", " : " ")}${l})`;
	}
	return a;
}
var rn = new O({
	id: "rec2020-linear",
	cssId: "--rec2020-linear",
	name: "Linear REC.2020",
	white: "D65",
	toXYZ_M: [
		[
			.6369580483012914,
			.14461690358620832,
			.1688809751641721
		],
		[
			.2627002120112671,
			.6779980715188708,
			.05930171646986196
		],
		[
			0,
			.028072693049087428,
			1.060985057710791
		]
	],
	fromXYZ_M: [
		[
			1.716651187971268,
			-.355670783776392,
			-.25336628137366
		],
		[
			-.666684351832489,
			1.616481236634939,
			.0157685458139111
		],
		[
			.017639857445311,
			-.042770613257809,
			.942103121235474
		]
	]
}), an = 1.09929682680944, on = .018053968510807, sn = new O({
	id: "rec2020",
	name: "REC.2020",
	base: rn,
	toBase(e) {
		return e.map(function(e) {
			return e < on * 4.5 ? e / 4.5 : ((e + an - 1) / an) ** (1 / .45);
		});
	},
	fromBase(e) {
		return e.map(function(e) {
			return e >= on ? an * e ** .45 - (an - 1) : 4.5 * e;
		});
	}
}), cn = new O({
	id: "p3-linear",
	cssId: "--display-p3-linear",
	name: "Linear P3",
	white: "D65",
	toXYZ_M: [
		[
			.4865709486482162,
			.26566769316909306,
			.1982172852343625
		],
		[
			.2289745640697488,
			.6917385218365064,
			.079286914093745
		],
		[
			0,
			.04511338185890264,
			1.043944368900976
		]
	],
	fromXYZ_M: [
		[
			2.493496911941425,
			-.9313836179191239,
			-.40271078445071684
		],
		[
			-.8294889695615747,
			1.7626640603183463,
			.023624685841943577
		],
		[
			.03584583024378447,
			-.07617238926804182,
			.9568845240076872
		]
	]
}), ln = [
	[
		.41239079926595934,
		.357584339383878,
		.1804807884018343
	],
	[
		.21263900587151027,
		.715168678767756,
		.07219231536073371
	],
	[
		.01933081871559182,
		.11919477979462598,
		.9505321522496607
	]
], F = [
	[
		3.2409699419045226,
		-1.537383177570094,
		-.4986107602930034
	],
	[
		-.9692436362808796,
		1.8759675015077202,
		.04155505740717559
	],
	[
		.05563007969699366,
		-.20397695888897652,
		1.0569715142428786
	]
], un = new O({
	id: "srgb-linear",
	name: "Linear sRGB",
	white: "D65",
	toXYZ_M: ln,
	fromXYZ_M: F
}), dn = {
	aliceblue: [
		240 / 255,
		248 / 255,
		1
	],
	antiquewhite: [
		250 / 255,
		235 / 255,
		215 / 255
	],
	aqua: [
		0,
		1,
		1
	],
	aquamarine: [
		127 / 255,
		1,
		212 / 255
	],
	azure: [
		240 / 255,
		1,
		1
	],
	beige: [
		245 / 255,
		245 / 255,
		220 / 255
	],
	bisque: [
		1,
		228 / 255,
		196 / 255
	],
	black: [
		0,
		0,
		0
	],
	blanchedalmond: [
		1,
		235 / 255,
		205 / 255
	],
	blue: [
		0,
		0,
		1
	],
	blueviolet: [
		138 / 255,
		43 / 255,
		226 / 255
	],
	brown: [
		165 / 255,
		42 / 255,
		42 / 255
	],
	burlywood: [
		222 / 255,
		184 / 255,
		135 / 255
	],
	cadetblue: [
		95 / 255,
		158 / 255,
		160 / 255
	],
	chartreuse: [
		127 / 255,
		1,
		0
	],
	chocolate: [
		210 / 255,
		105 / 255,
		30 / 255
	],
	coral: [
		1,
		127 / 255,
		80 / 255
	],
	cornflowerblue: [
		100 / 255,
		149 / 255,
		237 / 255
	],
	cornsilk: [
		1,
		248 / 255,
		220 / 255
	],
	crimson: [
		220 / 255,
		20 / 255,
		60 / 255
	],
	cyan: [
		0,
		1,
		1
	],
	darkblue: [
		0,
		0,
		139 / 255
	],
	darkcyan: [
		0,
		139 / 255,
		139 / 255
	],
	darkgoldenrod: [
		184 / 255,
		134 / 255,
		11 / 255
	],
	darkgray: [
		169 / 255,
		169 / 255,
		169 / 255
	],
	darkgreen: [
		0,
		100 / 255,
		0
	],
	darkgrey: [
		169 / 255,
		169 / 255,
		169 / 255
	],
	darkkhaki: [
		189 / 255,
		183 / 255,
		107 / 255
	],
	darkmagenta: [
		139 / 255,
		0,
		139 / 255
	],
	darkolivegreen: [
		85 / 255,
		107 / 255,
		47 / 255
	],
	darkorange: [
		1,
		140 / 255,
		0
	],
	darkorchid: [
		153 / 255,
		50 / 255,
		204 / 255
	],
	darkred: [
		139 / 255,
		0,
		0
	],
	darksalmon: [
		233 / 255,
		150 / 255,
		122 / 255
	],
	darkseagreen: [
		143 / 255,
		188 / 255,
		143 / 255
	],
	darkslateblue: [
		72 / 255,
		61 / 255,
		139 / 255
	],
	darkslategray: [
		47 / 255,
		79 / 255,
		79 / 255
	],
	darkslategrey: [
		47 / 255,
		79 / 255,
		79 / 255
	],
	darkturquoise: [
		0,
		206 / 255,
		209 / 255
	],
	darkviolet: [
		148 / 255,
		0,
		211 / 255
	],
	deeppink: [
		1,
		20 / 255,
		147 / 255
	],
	deepskyblue: [
		0,
		191 / 255,
		1
	],
	dimgray: [
		105 / 255,
		105 / 255,
		105 / 255
	],
	dimgrey: [
		105 / 255,
		105 / 255,
		105 / 255
	],
	dodgerblue: [
		30 / 255,
		144 / 255,
		1
	],
	firebrick: [
		178 / 255,
		34 / 255,
		34 / 255
	],
	floralwhite: [
		1,
		250 / 255,
		240 / 255
	],
	forestgreen: [
		34 / 255,
		139 / 255,
		34 / 255
	],
	fuchsia: [
		1,
		0,
		1
	],
	gainsboro: [
		220 / 255,
		220 / 255,
		220 / 255
	],
	ghostwhite: [
		248 / 255,
		248 / 255,
		1
	],
	gold: [
		1,
		215 / 255,
		0
	],
	goldenrod: [
		218 / 255,
		165 / 255,
		32 / 255
	],
	gray: [
		128 / 255,
		128 / 255,
		128 / 255
	],
	green: [
		0,
		128 / 255,
		0
	],
	greenyellow: [
		173 / 255,
		1,
		47 / 255
	],
	grey: [
		128 / 255,
		128 / 255,
		128 / 255
	],
	honeydew: [
		240 / 255,
		1,
		240 / 255
	],
	hotpink: [
		1,
		105 / 255,
		180 / 255
	],
	indianred: [
		205 / 255,
		92 / 255,
		92 / 255
	],
	indigo: [
		75 / 255,
		0,
		130 / 255
	],
	ivory: [
		1,
		1,
		240 / 255
	],
	khaki: [
		240 / 255,
		230 / 255,
		140 / 255
	],
	lavender: [
		230 / 255,
		230 / 255,
		250 / 255
	],
	lavenderblush: [
		1,
		240 / 255,
		245 / 255
	],
	lawngreen: [
		124 / 255,
		252 / 255,
		0
	],
	lemonchiffon: [
		1,
		250 / 255,
		205 / 255
	],
	lightblue: [
		173 / 255,
		216 / 255,
		230 / 255
	],
	lightcoral: [
		240 / 255,
		128 / 255,
		128 / 255
	],
	lightcyan: [
		224 / 255,
		1,
		1
	],
	lightgoldenrodyellow: [
		250 / 255,
		250 / 255,
		210 / 255
	],
	lightgray: [
		211 / 255,
		211 / 255,
		211 / 255
	],
	lightgreen: [
		144 / 255,
		238 / 255,
		144 / 255
	],
	lightgrey: [
		211 / 255,
		211 / 255,
		211 / 255
	],
	lightpink: [
		1,
		182 / 255,
		193 / 255
	],
	lightsalmon: [
		1,
		160 / 255,
		122 / 255
	],
	lightseagreen: [
		32 / 255,
		178 / 255,
		170 / 255
	],
	lightskyblue: [
		135 / 255,
		206 / 255,
		250 / 255
	],
	lightslategray: [
		119 / 255,
		136 / 255,
		153 / 255
	],
	lightslategrey: [
		119 / 255,
		136 / 255,
		153 / 255
	],
	lightsteelblue: [
		176 / 255,
		196 / 255,
		222 / 255
	],
	lightyellow: [
		1,
		1,
		224 / 255
	],
	lime: [
		0,
		1,
		0
	],
	limegreen: [
		50 / 255,
		205 / 255,
		50 / 255
	],
	linen: [
		250 / 255,
		240 / 255,
		230 / 255
	],
	magenta: [
		1,
		0,
		1
	],
	maroon: [
		128 / 255,
		0,
		0
	],
	mediumaquamarine: [
		102 / 255,
		205 / 255,
		170 / 255
	],
	mediumblue: [
		0,
		0,
		205 / 255
	],
	mediumorchid: [
		186 / 255,
		85 / 255,
		211 / 255
	],
	mediumpurple: [
		147 / 255,
		112 / 255,
		219 / 255
	],
	mediumseagreen: [
		60 / 255,
		179 / 255,
		113 / 255
	],
	mediumslateblue: [
		123 / 255,
		104 / 255,
		238 / 255
	],
	mediumspringgreen: [
		0,
		250 / 255,
		154 / 255
	],
	mediumturquoise: [
		72 / 255,
		209 / 255,
		204 / 255
	],
	mediumvioletred: [
		199 / 255,
		21 / 255,
		133 / 255
	],
	midnightblue: [
		25 / 255,
		25 / 255,
		112 / 255
	],
	mintcream: [
		245 / 255,
		1,
		250 / 255
	],
	mistyrose: [
		1,
		228 / 255,
		225 / 255
	],
	moccasin: [
		1,
		228 / 255,
		181 / 255
	],
	navajowhite: [
		1,
		222 / 255,
		173 / 255
	],
	navy: [
		0,
		0,
		128 / 255
	],
	oldlace: [
		253 / 255,
		245 / 255,
		230 / 255
	],
	olive: [
		128 / 255,
		128 / 255,
		0
	],
	olivedrab: [
		107 / 255,
		142 / 255,
		35 / 255
	],
	orange: [
		1,
		165 / 255,
		0
	],
	orangered: [
		1,
		69 / 255,
		0
	],
	orchid: [
		218 / 255,
		112 / 255,
		214 / 255
	],
	palegoldenrod: [
		238 / 255,
		232 / 255,
		170 / 255
	],
	palegreen: [
		152 / 255,
		251 / 255,
		152 / 255
	],
	paleturquoise: [
		175 / 255,
		238 / 255,
		238 / 255
	],
	palevioletred: [
		219 / 255,
		112 / 255,
		147 / 255
	],
	papayawhip: [
		1,
		239 / 255,
		213 / 255
	],
	peachpuff: [
		1,
		218 / 255,
		185 / 255
	],
	peru: [
		205 / 255,
		133 / 255,
		63 / 255
	],
	pink: [
		1,
		192 / 255,
		203 / 255
	],
	plum: [
		221 / 255,
		160 / 255,
		221 / 255
	],
	powderblue: [
		176 / 255,
		224 / 255,
		230 / 255
	],
	purple: [
		128 / 255,
		0,
		128 / 255
	],
	rebeccapurple: [
		102 / 255,
		51 / 255,
		153 / 255
	],
	red: [
		1,
		0,
		0
	],
	rosybrown: [
		188 / 255,
		143 / 255,
		143 / 255
	],
	royalblue: [
		65 / 255,
		105 / 255,
		225 / 255
	],
	saddlebrown: [
		139 / 255,
		69 / 255,
		19 / 255
	],
	salmon: [
		250 / 255,
		128 / 255,
		114 / 255
	],
	sandybrown: [
		244 / 255,
		164 / 255,
		96 / 255
	],
	seagreen: [
		46 / 255,
		139 / 255,
		87 / 255
	],
	seashell: [
		1,
		245 / 255,
		238 / 255
	],
	sienna: [
		160 / 255,
		82 / 255,
		45 / 255
	],
	silver: [
		192 / 255,
		192 / 255,
		192 / 255
	],
	skyblue: [
		135 / 255,
		206 / 255,
		235 / 255
	],
	slateblue: [
		106 / 255,
		90 / 255,
		205 / 255
	],
	slategray: [
		112 / 255,
		128 / 255,
		144 / 255
	],
	slategrey: [
		112 / 255,
		128 / 255,
		144 / 255
	],
	snow: [
		1,
		250 / 255,
		250 / 255
	],
	springgreen: [
		0,
		1,
		127 / 255
	],
	steelblue: [
		70 / 255,
		130 / 255,
		180 / 255
	],
	tan: [
		210 / 255,
		180 / 255,
		140 / 255
	],
	teal: [
		0,
		128 / 255,
		128 / 255
	],
	thistle: [
		216 / 255,
		191 / 255,
		216 / 255
	],
	tomato: [
		1,
		99 / 255,
		71 / 255
	],
	turquoise: [
		64 / 255,
		224 / 255,
		208 / 255
	],
	violet: [
		238 / 255,
		130 / 255,
		238 / 255
	],
	wheat: [
		245 / 255,
		222 / 255,
		179 / 255
	],
	white: [
		1,
		1,
		1
	],
	whitesmoke: [
		245 / 255,
		245 / 255,
		245 / 255
	],
	yellow: [
		1,
		1,
		0
	],
	yellowgreen: [
		154 / 255,
		205 / 255,
		50 / 255
	]
}, fn = [
	,
	,
	,
].fill("<percentage> | <number>[0, 255]"), pn = [
	,
	,
	,
].fill("<number>[0, 255]"), mn = new O({
	id: "srgb",
	name: "sRGB",
	base: un,
	fromBase: (e) => e.map((e) => {
		let t = e < 0 ? -1 : 1, n = e * t;
		return n > .0031308 ? t * (1.055 * n ** (1 / 2.4) - .055) : 12.92 * e;
	}),
	toBase: (e) => e.map((e) => {
		let t = e < 0 ? -1 : 1, n = e * t;
		return n <= .04045 ? e / 12.92 : t * ((n + .055) / 1.055) ** 2.4;
	}),
	formats: {
		rgb: { coords: fn },
		rgb_number: {
			name: "rgb",
			commas: !0,
			coords: pn,
			noAlpha: !0
		},
		color: {},
		rgba: {
			coords: fn,
			commas: !0,
			lastAlpha: !0
		},
		rgba_number: {
			name: "rgba",
			commas: !0,
			coords: pn
		},
		hex: {
			type: "custom",
			toGamut: !0,
			test: (e) => /^#([a-f0-9]{3,4}){1,2}$/i.test(e),
			parse(e) {
				e.length <= 5 && (e = e.replace(/[a-f0-9]/gi, "$&$&"));
				let t = [];
				return e.replace(/[a-f0-9]{2}/gi, (e) => {
					t.push(parseInt(e, 16) / 255);
				}), {
					spaceId: "srgb",
					coords: t.slice(0, 3),
					alpha: t.slice(3)[0]
				};
			},
			serialize: (e, t, { collapse: n = !0 } = {}) => {
				t < 1 && e.push(t), e = e.map((e) => Math.round(e * 255));
				let r = n && e.every((e) => e % 17 == 0);
				return "#" + e.map((e) => r ? (e / 17).toString(16) : e.toString(16).padStart(2, "0")).join("");
			}
		},
		keyword: {
			type: "custom",
			test: (e) => /^[a-z]+$/i.test(e),
			parse(e) {
				e = e.toLowerCase();
				let t = {
					spaceId: "srgb",
					coords: null,
					alpha: 1
				};
				if (e === "transparent" ? (t.coords = dn.black, t.alpha = 0) : t.coords = dn[e], t.coords) return t;
			}
		}
	}
}), hn = new O({
	id: "p3",
	cssId: "display-p3",
	name: "P3",
	base: cn,
	fromBase: mn.fromBase,
	toBase: mn.toBase
});
S.display_space = mn;
var gn;
if (typeof CSS < "u" && CSS.supports) for (let e of [
	j,
	sn,
	hn
]) {
	let t = nn({
		space: e,
		coords: e.getMinCoords(),
		alpha: 1
	});
	if (CSS.supports("color", t)) {
		S.display_space = e;
		break;
	}
}
function _n(e, { space: t = S.display_space, ...n } = {}) {
	let r = nn(e, n);
	if (typeof CSS > "u" || CSS.supports("color", r) || !S.display_space) r = new String(r), r.color = e;
	else {
		let i = e;
		if ((e.coords.some(s) || s(e.alpha)) && !(gn ??= CSS.supports("color", "hsl(none 50% 50%)")) && (i = Me(e), i.coords = i.coords.map(c), i.alpha = c(i.alpha), r = nn(i, n), CSS.supports("color", r))) return r = new String(r), r.color = i, r;
		i = P(i, t), r = new String(nn(i, n)), r.color = i;
	}
	return r;
}
function vn(e, t) {
	return e = T(e), t = T(t), e.space === t.space && e.alpha === t.alpha && e.coords.every((e, n) => e === t.coords[n]);
}
function I(e) {
	return k(e, [D, "y"]);
}
function yn(e, t) {
	A(e, [D, "y"], t);
}
function bn(e) {
	Object.defineProperty(e.prototype, "luminance", {
		get() {
			return I(this);
		},
		set(e) {
			yn(this, e);
		}
	});
}
var xn = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	getLuminance: I,
	register: bn,
	setLuminance: yn
});
function Sn(e, t) {
	e = T(e), t = T(t);
	let n = Math.max(I(e), 0), r = Math.max(I(t), 0);
	return r > n && ([n, r] = [r, n]), (n + .05) / (r + .05);
}
var Cn = .56, wn = .57, Tn = .62, En = .65, Dn = .022, On = 1.414, kn = .1, An = 5e-4, jn = 1.14, Mn = .027, Nn = 1.14;
function Pn(e) {
	return e >= Dn ? e : e + (Dn - e) ** On;
}
function Fn(e) {
	return (e < 0 ? -1 : 1) * Math.abs(e) ** 2.4;
}
function In(e, t) {
	t = T(t), e = T(e);
	let n, r, i, a, o, s;
	t = P(t, "srgb"), [a, o, s] = t.coords;
	let c = Fn(a) * .2126729 + Fn(o) * .7151522 + Fn(s) * .072175;
	e = P(e, "srgb"), [a, o, s] = e.coords;
	let l = Fn(a) * .2126729 + Fn(o) * .7151522 + Fn(s) * .072175, u = Pn(c), d = Pn(l), f = d > u;
	return Math.abs(d - u) < An ? r = 0 : f ? (n = d ** Cn - u ** wn, r = n * jn) : (n = d ** En - u ** Tn, r = n * Nn), i = Math.abs(r) < kn ? 0 : r > 0 ? r - Mn : r + Mn, i * 100;
}
function Ln(e, t) {
	e = T(e), t = T(t);
	let n = Math.max(I(e), 0), r = Math.max(I(t), 0);
	r > n && ([n, r] = [r, n]);
	let i = n + r;
	return i === 0 ? 0 : (n - r) / i;
}
var Rn = 5e4;
function zn(e, t) {
	e = T(e), t = T(t);
	let n = Math.max(I(e), 0), r = Math.max(I(t), 0);
	return r > n && ([n, r] = [r, n]), r === 0 ? Rn : (n - r) / r;
}
function Bn(e, t) {
	e = T(e), t = T(t);
	let n = k(e, [j, "l"]), r = k(t, [j, "l"]);
	return Math.abs(n - r);
}
var Vn = 216 / 24389, Hn = 24 / 116, Un = 24389 / 27, Wn = C.D65, Gn = new E({
	id: "lab-d65",
	name: "Lab D65",
	coords: {
		l: {
			refRange: [0, 100],
			name: "Lightness"
		},
		a: { refRange: [-125, 125] },
		b: { refRange: [-125, 125] }
	},
	white: Wn,
	base: D,
	fromBase(e) {
		let t = e.map((e, t) => e / Wn[t]).map((e) => e > Vn ? Math.cbrt(e) : (Un * e + 16) / 116);
		return [
			116 * t[1] - 16,
			500 * (t[0] - t[1]),
			200 * (t[1] - t[2])
		];
	},
	toBase(e) {
		let t = [];
		return t[1] = (e[0] + 16) / 116, t[0] = e[1] / 500 + t[1], t[2] = t[1] - e[2] / 200, [
			t[0] > Hn ? t[0] ** 3 : (116 * t[0] - 16) / Un,
			e[0] > 8 ? ((e[0] + 16) / 116) ** 3 : e[0] / Un,
			t[2] > Hn ? t[2] ** 3 : (116 * t[2] - 16) / Un
		].map((e, t) => e * Wn[t]);
	},
	formats: { "lab-d65": { coords: [
		"<number> | <percentage>",
		"<number> | <percentage>[-1,1]",
		"<number> | <percentage>[-1,1]"
	] } }
}), Kn = 5 ** .5 * .5 + .5;
function qn(e, t) {
	e = T(e), t = T(t);
	let n = k(e, [Gn, "l"]), r = k(t, [Gn, "l"]), i = Math.abs(n ** +Kn - r ** +Kn) ** (1 / Kn) * Math.SQRT2 - 40;
	return i < 7.5 ? 0 : i;
}
var Jn = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	contrastAPCA: In,
	contrastDeltaPhi: qn,
	contrastLstar: Bn,
	contrastMichelson: Ln,
	contrastWCAG21: Sn,
	contrastWeber: zn
});
function Yn(e, t, n = {}) {
	i(n) && (n = { algorithm: n });
	let { algorithm: r, ...a } = n;
	if (!r) {
		let e = Object.keys(Jn).map((e) => e.replace(/^contrast/, "")).join(", ");
		throw TypeError(`contrast() function needs a contrast algorithm. Please specify one of: ${e}`);
	}
	e = T(e), t = T(t);
	for (let n in Jn) if ("contrast" + r.toLowerCase() === n.toLowerCase()) return Jn[n](e, t, a);
	throw TypeError(`Unknown contrast algorithm: ${r}`);
}
function Xn(e) {
	let [t, n, r] = le(e, D), i = t + 15 * n + 3 * r;
	return [4 * t / i, 9 * n / i];
}
function Zn(e) {
	let [t, n, r] = le(e, D), i = t + n + r;
	return [t / i, n / i];
}
function Qn(e) {
	Object.defineProperty(e.prototype, "uv", { get() {
		return Xn(this);
	} }), Object.defineProperty(e.prototype, "xy", { get() {
		return Zn(this);
	} });
}
var $n = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	register: Qn,
	uv: Xn,
	xy: Zn
});
function er(e, t, n = {}) {
	i(n) && (n = { method: n });
	let { method: r = S.deltaE, ...a } = n;
	for (let n in Zt) if ("deltae" + r.toLowerCase() === n.toLowerCase()) return Zt[n](e, t, a);
	throw TypeError(`Unknown deltaE method: ${r}`);
}
function tr(e, t = .25) {
	return A(e, [E.get("oklch", "lch"), "l"], (e) => e * (1 + t));
}
function nr(e, t = .25) {
	return A(e, [E.get("oklch", "lch"), "l"], (e) => e * (1 - t));
}
var rr = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	darken: nr,
	lighten: tr
});
function ir(e, t, n = .5, r = {}) {
	return [e, t] = [T(e), T(t)], a(n) === "object" && ([n, r] = [.5, n]), or(e, t, r)(n);
}
function ar(e, t, n = {}) {
	let r;
	sr(e) && ([r, n] = [e, t], [e, t] = r.rangeArgs.colors);
	let { maxDeltaE: i, deltaEMethod: a, steps: o = 2, maxSteps: s = 1e3, ...c } = n;
	r ||= ([e, t] = [T(e), T(t)], or(e, t, c));
	let l = er(e, t), u = i > 0 ? Math.max(o, Math.ceil(l / i) + 1) : o, d = [];
	if (s !== void 0 && (u = Math.min(u, s)), u === 1) d = [{
		p: .5,
		color: r(.5)
	}];
	else {
		let e = 1 / (u - 1);
		d = Array.from({ length: u }, (t, n) => {
			let i = n * e;
			return {
				p: i,
				color: r(i)
			};
		});
	}
	if (i > 0) {
		let e = d.reduce((e, t, n) => {
			if (n === 0) return 0;
			let r = er(t.color, d[n - 1].color, a);
			return Math.max(e, r);
		}, 0);
		for (; e > i;) {
			e = 0;
			for (let t = 1; t < d.length && d.length < s; t++) {
				let n = d[t - 1], i = d[t], a = (i.p + n.p) / 2, o = r(a);
				e = Math.max(e, er(o, n.color), er(o, i.color)), d.splice(t, 0, {
					p: a,
					color: r(a)
				}), t++;
			}
		}
	}
	return d = d.map((e) => e.color), d;
}
function or(e, t, n = {}) {
	if (sr(e)) {
		let [n, r] = [e, t];
		return or(...n.rangeArgs.colors, {
			...n.rangeArgs.options,
			...r
		});
	}
	let { space: r, outputSpace: i, progression: a, premultiplied: o } = n;
	e = T(e), t = T(t), e = Me(e), t = Me(t);
	let s = {
		colors: [e, t],
		options: n
	};
	if (r = r ? E.get(r) : E.registry[S.interpolationSpace] || e.space, i = i ? E.get(i) : r, e = P(e, r), t = P(t, r), e = N(e), t = N(t), r.coords.h && r.coords.h.type === "angle") {
		let i = n.hue = n.hue || "shorter", a = [r, "h"], [o, s] = [k(e, a), k(t, a)];
		isNaN(o) && !isNaN(s) ? o = s : isNaN(s) && !isNaN(o) && (s = o), [o, s] = ge(i, [o, s]), A(e, a, o), A(t, a, s);
	}
	return o && (e.coords = e.coords.map((t) => t * e.alpha), t.coords = t.coords.map((e) => e * t.alpha)), Object.assign((n) => {
		n = a ? a(n) : n;
		let s = e.coords.map((e, r) => {
			let i = t.coords[r];
			return p(e, i, n);
		}), c = p(e.alpha, t.alpha, n), l = {
			space: r,
			coords: s,
			alpha: c
		};
		return o && (l.coords = l.coords.map((e) => e / c)), i !== r && (l = P(l, i)), l;
	}, { rangeArgs: s });
}
function sr(e) {
	return a(e) === "function" && !!e.rangeArgs;
}
S.interpolationSpace = "lab";
function cr(e) {
	e.defineFunction("mix", ir, { returns: "color" }), e.defineFunction("range", or, { returns: "function<color>" }), e.defineFunction("steps", ar, { returns: "array<color>" });
}
var lr = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	isRange: sr,
	mix: ir,
	range: or,
	register: cr,
	steps: ar
}), ur = new E({
	id: "hsl",
	name: "HSL",
	coords: {
		h: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		},
		s: {
			range: [0, 100],
			name: "Saturation"
		},
		l: {
			range: [0, 100],
			name: "Lightness"
		}
	},
	base: mn,
	fromBase: (e) => {
		let t = Math.max(...e), n = Math.min(...e), [r, i, a] = e, [o, s, c] = [
			NaN,
			0,
			(n + t) / 2
		], l = t - n;
		if (l !== 0) {
			switch (s = c === 0 || c === 1 ? 0 : (t - c) / Math.min(c, 1 - c), t) {
				case r:
					o = (i - a) / l + (i < a ? 6 : 0);
					break;
				case i:
					o = (a - r) / l + 2;
					break;
				case a: o = (r - i) / l + 4;
			}
			o *= 60;
		}
		return s < 0 && (o += 180, s = Math.abs(s)), o >= 360 && (o -= 360), [
			o,
			s * 100,
			c * 100
		];
	},
	toBase: (e) => {
		let [t, n, r] = e;
		t %= 360, t < 0 && (t += 360), n /= 100, r /= 100;
		function i(e) {
			let i = (e + t / 30) % 12, a = n * Math.min(r, 1 - r);
			return r - a * Math.max(-1, Math.min(i - 3, 9 - i, 1));
		}
		return [
			i(0),
			i(8),
			i(4)
		];
	},
	formats: {
		hsl: { coords: [
			"<number> | <angle>",
			"<percentage>",
			"<percentage>"
		] },
		hsla: {
			coords: [
				"<number> | <angle>",
				"<percentage>",
				"<percentage>"
			],
			commas: !0,
			lastAlpha: !0
		}
	}
}), dr = new E({
	id: "hsv",
	name: "HSV",
	coords: {
		h: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		},
		s: {
			range: [0, 100],
			name: "Saturation"
		},
		v: {
			range: [0, 100],
			name: "Value"
		}
	},
	base: ur,
	fromBase(e) {
		let [t, n, r] = e;
		n /= 100, r /= 100;
		let i = r + n * Math.min(r, 1 - r);
		return [
			t,
			i === 0 ? 0 : 200 * (1 - r / i),
			100 * i
		];
	},
	toBase(e) {
		let [t, n, r] = e;
		n /= 100, r /= 100;
		let i = r * (1 - n / 2);
		return [
			t,
			i === 0 || i === 1 ? 0 : (r - i) / Math.min(i, 1 - i) * 100,
			i * 100
		];
	},
	formats: { color: {
		id: "--hsv",
		coords: [
			"<number> | <angle>",
			"<percentage> | <number>",
			"<percentage> | <number>"
		]
	} }
}), fr = new E({
	id: "hwb",
	name: "HWB",
	coords: {
		h: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		},
		w: {
			range: [0, 100],
			name: "Whiteness"
		},
		b: {
			range: [0, 100],
			name: "Blackness"
		}
	},
	base: dr,
	fromBase(e) {
		let [t, n, r] = e;
		return [
			t,
			r * (100 - n) / 100,
			100 - r
		];
	},
	toBase(e) {
		let [t, n, r] = e;
		n /= 100, r /= 100;
		let i = n + r;
		if (i >= 1) return [
			t,
			0,
			n / i * 100
		];
		let a = 1 - r;
		return [
			t,
			(a === 0 ? 0 : 1 - n / a) * 100,
			a * 100
		];
	},
	formats: { hwb: { coords: [
		"<number> | <angle>",
		"<percentage> | <number>",
		"<percentage> | <number>"
	] } }
}), pr = new O({
	id: "a98rgb-linear",
	cssId: "--a98-rgb-linear",
	name: "Linear Adobe® 98 RGB compatible",
	white: "D65",
	toXYZ_M: [
		[
			.5766690429101305,
			.1855582379065463,
			.1882286462349947
		],
		[
			.29734497525053605,
			.6273635662554661,
			.07529145849399788
		],
		[
			.02703136138641234,
			.07068885253582723,
			.9913375368376388
		]
	],
	fromXYZ_M: [
		[
			2.0415879038107465,
			-.5650069742788596,
			-.34473135077832956
		],
		[
			-.9692436362808795,
			1.8759675015077202,
			.04155505740717557
		],
		[
			.013444280632031142,
			-.11836239223101838,
			1.0151749943912054
		]
	]
}), mr = new O({
	id: "a98rgb",
	cssId: "a98-rgb",
	name: "Adobe® 98 RGB compatible",
	base: pr,
	toBase: (e) => e.map((e) => Math.abs(e) ** (563 / 256) * Math.sign(e)),
	fromBase: (e) => e.map((e) => Math.abs(e) ** (256 / 563) * Math.sign(e))
}), hr = new O({
	id: "prophoto-linear",
	cssId: "--prophoto-rgb-linear",
	name: "Linear ProPhoto",
	white: "D50",
	base: de,
	toXYZ_M: [
		[
			.7977666449006423,
			.13518129740053308,
			.0313477341283922
		],
		[
			.2880748288194013,
			.711835234241873,
			8993693872564e-17
		],
		[
			0,
			0,
			.8251046025104602
		]
	],
	fromXYZ_M: [
		[
			1.3457868816471583,
			-.25557208737979464,
			-.05110186497554526
		],
		[
			-.5446307051249019,
			1.5082477428451468,
			.02052744743642139
		],
		[
			0,
			0,
			1.2119675456389452
		]
	]
}), gr = 1 / 512, _r = 16 / 512, vr = new O({
	id: "prophoto",
	cssId: "prophoto-rgb",
	name: "ProPhoto",
	base: hr,
	toBase(e) {
		return e.map((e) => e < _r ? e / 16 : e ** 1.8);
	},
	fromBase(e) {
		return e.map((e) => e >= gr ? e ** (1 / 1.8) : 16 * e);
	}
}), yr = new E({
	id: "oklch",
	name: "Oklch",
	coords: {
		l: {
			refRange: [0, 1],
			name: "Lightness"
		},
		c: {
			refRange: [0, .4],
			name: "Chroma"
		},
		h: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		}
	},
	white: "D65",
	base: Oe,
	fromBase(e) {
		let [t, n, r] = e, i, a = 2e-4;
		return i = Math.abs(n) < a && Math.abs(r) < a ? NaN : Math.atan2(r, n) * 180 / Math.PI, [
			t,
			Math.sqrt(n ** 2 + r ** 2),
			M(i)
		];
	},
	toBase(e) {
		let [t, n, r] = e, i, a;
		return isNaN(r) ? (i = 0, a = 0) : (i = n * Math.cos(r * Math.PI / 180), a = n * Math.sin(r * Math.PI / 180)), [
			t,
			i,
			a
		];
	},
	formats: { oklch: { coords: [
		"<percentage> | <number>",
		"<number> | <percentage>[0,1]",
		"<number> | <angle>"
	] } }
}), br = C.D65, xr = 216 / 24389, Sr = 24389 / 27, [Cr, wr] = Xn({
	space: D,
	coords: br
}), Tr = new E({
	id: "luv",
	name: "Luv",
	coords: {
		l: {
			refRange: [0, 100],
			name: "Lightness"
		},
		u: { refRange: [-215, 215] },
		v: { refRange: [-215, 215] }
	},
	white: br,
	base: D,
	fromBase(e) {
		let t = [
			c(e[0]),
			c(e[1]),
			c(e[2])
		], n = t[1], [r, i] = Xn({
			space: D,
			coords: t
		});
		if (!Number.isFinite(r) || !Number.isFinite(i)) return [
			0,
			0,
			0
		];
		let a = n <= xr ? Sr * n : 116 * Math.cbrt(n) - 16;
		return [
			a,
			13 * a * (r - Cr),
			13 * a * (i - wr)
		];
	},
	toBase(e) {
		let [t, n, r] = e;
		if (t === 0 || s(t)) return [
			0,
			0,
			0
		];
		n = c(n), r = c(r);
		let i = n / (13 * t) + Cr, a = r / (13 * t) + wr, o = t <= 8 ? t / Sr : ((t + 16) / 116) ** 3;
		return [
			o * (9 * i / (4 * a)),
			o,
			o * ((12 - 3 * i - 20 * a) / (4 * a))
		];
	},
	formats: { color: {
		id: "--luv",
		coords: [
			"<number> | <percentage>",
			"<number> | <percentage>[-1,1]",
			"<number> | <percentage>[-1,1]"
		]
	} }
}), Er = new E({
	id: "lchuv",
	name: "LChuv",
	coords: {
		l: {
			refRange: [0, 100],
			name: "Lightness"
		},
		c: {
			refRange: [0, 220],
			name: "Chroma"
		},
		h: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		}
	},
	base: Tr,
	fromBase(e) {
		let [t, n, r] = e, i, a = .02;
		return i = Math.abs(n) < a && Math.abs(r) < a ? NaN : Math.atan2(r, n) * 180 / Math.PI, [
			t,
			Math.sqrt(n ** 2 + r ** 2),
			M(i)
		];
	},
	toBase(e) {
		let [t, n, r] = e;
		return n < 0 && (n = 0), isNaN(r) && (r = 0), [
			t,
			n * Math.cos(r * Math.PI / 180),
			n * Math.sin(r * Math.PI / 180)
		];
	},
	formats: { color: {
		id: "--lchuv",
		coords: [
			"<number> | <percentage>",
			"<number> | <percentage>",
			"<number> | <angle>"
		]
	} }
}), Dr = 216 / 24389, Or = 24389 / 27, kr = F[0][0], Ar = F[0][1], jr = F[0][2], Mr = F[1][0], Nr = F[1][1], Pr = F[1][2], Fr = F[2][0], Ir = F[2][1], Lr = F[2][2];
function Rr(e, t, n) {
	let r = t / (Math.sin(n) - e * Math.cos(n));
	return r < 0 ? Infinity : r;
}
function zr(e) {
	let t = (e + 16) ** 3 / 1560896, n = t > Dr ? t : e / Or, r = n * (284517 * kr - 94839 * jr), i = n * (838422 * jr + 769860 * Ar + 731718 * kr), a = n * (632260 * jr - 126452 * Ar), o = n * (284517 * Mr - 94839 * Pr), s = n * (838422 * Pr + 769860 * Nr + 731718 * Mr), c = n * (632260 * Pr - 126452 * Nr), l = n * (284517 * Fr - 94839 * Lr), u = n * (838422 * Lr + 769860 * Ir + 731718 * Fr), d = n * (632260 * Lr - 126452 * Ir);
	return {
		r0s: r / a,
		r0i: i * e / a,
		r1s: r / (a + 126452),
		r1i: (i - 769860) * e / (a + 126452),
		g0s: o / c,
		g0i: s * e / c,
		g1s: o / (c + 126452),
		g1i: (s - 769860) * e / (c + 126452),
		b0s: l / d,
		b0i: u * e / d,
		b1s: l / (d + 126452),
		b1i: (u - 769860) * e / (d + 126452)
	};
}
function Br(e, t) {
	let n = t / 360 * Math.PI * 2, r = Rr(e.r0s, e.r0i, n), i = Rr(e.r1s, e.r1i, n), a = Rr(e.g0s, e.g0i, n), o = Rr(e.g1s, e.g1i, n), s = Rr(e.b0s, e.b0i, n), c = Rr(e.b1s, e.b1i, n);
	return Math.min(r, i, a, o, s, c);
}
var Vr = new E({
	id: "hsluv",
	name: "HSLuv",
	coords: {
		h: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		},
		s: {
			range: [0, 100],
			name: "Saturation"
		},
		l: {
			range: [0, 100],
			name: "Lightness"
		}
	},
	base: Er,
	gamutSpace: mn,
	fromBase(e) {
		let [t, n, r] = [
			c(e[0]),
			c(e[1]),
			c(e[2])
		], i;
		return t > 99.9999999 ? (i = 0, t = 100) : t < 1e-8 ? (i = 0, t = 0) : i = n / Br(zr(t), r) * 100, [
			r,
			i,
			t
		];
	},
	toBase(e) {
		let [t, n, r] = [
			c(e[0]),
			c(e[1]),
			c(e[2])
		], i;
		return r > 99.9999999 ? (r = 100, i = 0) : r < 1e-8 ? (r = 0, i = 0) : i = Br(zr(r), t) / 100 * n, [
			r,
			i,
			t
		];
	},
	formats: { color: {
		id: "--hsluv",
		coords: [
			"<number> | <angle>",
			"<percentage> | <number>",
			"<percentage> | <number>"
		]
	} }
});
F[0][0], F[0][1], F[0][2], F[1][0], F[1][1], F[1][2], F[2][0], F[2][1], F[2][2];
function Hr(e, t) {
	return Math.abs(t) / Math.sqrt(e ** 2 + 1);
}
function Ur(e) {
	let t = Hr(e.r0s, e.r0i), n = Hr(e.r1s, e.r1i), r = Hr(e.g0s, e.g0i), i = Hr(e.g1s, e.g1i), a = Hr(e.b0s, e.b0i), o = Hr(e.b1s, e.b1i);
	return Math.min(t, n, r, i, a, o);
}
var Wr = new E({
	id: "hpluv",
	name: "HPLuv",
	coords: {
		h: {
			refRange: [0, 360],
			type: "angle",
			name: "Hue"
		},
		s: {
			range: [0, 100],
			name: "Saturation"
		},
		l: {
			range: [0, 100],
			name: "Lightness"
		}
	},
	base: Er,
	gamutSpace: "self",
	fromBase(e) {
		let [t, n, r] = [
			c(e[0]),
			c(e[1]),
			c(e[2])
		], i;
		return t > 99.9999999 ? (i = 0, t = 100) : t < 1e-8 ? (i = 0, t = 0) : i = n / Ur(zr(t)) * 100, [
			r,
			i,
			t
		];
	},
	toBase(e) {
		let [t, n, r] = [
			c(e[0]),
			c(e[1]),
			c(e[2])
		], i;
		return r > 99.9999999 ? (r = 100, i = 0) : r < 1e-8 ? (r = 0, i = 0) : i = Ur(zr(r)) / 100 * n, [
			r,
			i,
			t
		];
	},
	formats: { color: {
		id: "--hpluv",
		coords: [
			"<number> | <angle>",
			"<percentage> | <number>",
			"<percentage> | <number>"
		]
	} }
}), Gr = 203, Kr = 2610 / 2 ** 14, qr = 2 ** 14 / 2610, Jr = 2523 / 2 ** 5, Yr = 2 ** 5 / 2523, Xr = 3424 / 2 ** 12, Zr = 2413 / 2 ** 7, Qr = 2392 / 2 ** 7, $r = new O({
	id: "rec2100pq",
	cssId: "rec2100-pq",
	name: "REC.2100-PQ",
	base: rn,
	toBase(e) {
		return e.map(function(e) {
			return (Math.max(e ** Yr - Xr, 0) / (Zr - Qr * e ** Yr)) ** qr * 1e4 / Gr;
		});
	},
	fromBase(e) {
		return e.map(function(e) {
			let t = Math.max(e * Gr / 1e4, 0);
			return ((Xr + Zr * t ** Kr) / (1 + Qr * t ** Kr)) ** Jr;
		});
	}
}), ei = .17883277, ti = .28466892, ni = .55991073, ri = 3.7743, ii = new O({
	id: "rec2100hlg",
	cssId: "rec2100-hlg",
	name: "REC.2100-HLG",
	referred: "scene",
	base: rn,
	toBase(e) {
		return e.map(function(e) {
			return e <= .5 ? e ** 2 / 3 * ri : (Math.exp((e - ni) / ei) + ti) / 12 * ri;
		});
	},
	fromBase(e) {
		return e.map(function(e) {
			return e /= ri, e <= 1 / 12 ? Math.sqrt(3 * e) : ei * Math.log(12 * e - ti) + ni;
		});
	}
}), ai = {};
x.add("chromatic-adaptation-start", (e) => {
	e.options.method && (e.M = si(e.W1, e.W2, e.options.method));
}), x.add("chromatic-adaptation-end", (e) => {
	e.M ||= si(e.W1, e.W2, e.options.method);
});
function oi({ id: e, toCone_M: t, fromCone_M: n }) {
	ai[e] = arguments[0];
}
function si(e, t, n = "Bradford") {
	let i = ai[n], [a, o, s] = r(i.toCone_M, e), [c, l, u] = r(i.toCone_M, t), d = r([
		[
			c / a,
			0,
			0
		],
		[
			0,
			l / o,
			0
		],
		[
			0,
			0,
			u / s
		]
	], i.toCone_M);
	return r(i.fromCone_M, d);
}
oi({
	id: "von Kries",
	toCone_M: [
		[
			.40024,
			.7076,
			-.08081
		],
		[
			-.2263,
			1.16532,
			.0457
		],
		[
			0,
			0,
			.91822
		]
	],
	fromCone_M: [
		[
			1.8599363874558397,
			-1.1293816185800916,
			.21989740959619328
		],
		[
			.3611914362417676,
			.6388124632850422,
			-6370596838649899e-21
		],
		[
			0,
			0,
			1.0890636230968613
		]
	]
}), oi({
	id: "Bradford",
	toCone_M: [
		[
			.8951,
			.2664,
			-.1614
		],
		[
			-.7502,
			1.7135,
			.0367
		],
		[
			.0389,
			-.0685,
			1.0296
		]
	],
	fromCone_M: [
		[
			.9869929054667121,
			-.14705425642099013,
			.15996265166373122
		],
		[
			.4323052697233945,
			.5183602715367774,
			.049291228212855594
		],
		[
			-.00852866457517732,
			.04004282165408486,
			.96848669578755
		]
	]
}), oi({
	id: "CAT02",
	toCone_M: [
		[
			.7328,
			.4296,
			-.1624
		],
		[
			-.7036,
			1.6975,
			.0061
		],
		[
			.003,
			.0136,
			.9834
		]
	],
	fromCone_M: [
		[
			1.0961238208355142,
			-.27886900021828726,
			.18274517938277307
		],
		[
			.4543690419753592,
			.4735331543074117,
			.07209780371722911
		],
		[
			-.009627608738429355,
			-.00569803121611342,
			1.0153256399545427
		]
	]
}), oi({
	id: "CAT16",
	toCone_M: [
		[
			.401288,
			.650173,
			-.051461
		],
		[
			-.250268,
			1.204414,
			.045854
		],
		[
			-.002079,
			.048952,
			.953127
		]
	],
	fromCone_M: [
		[
			1.862067855087233,
			-1.0112546305316845,
			.14918677544445172
		],
		[
			.3875265432361372,
			.6214474419314753,
			-.008973985167612521
		],
		[
			-.01584149884933386,
			-.03412293802851557,
			1.0499644368778496
		]
	]
}), Object.assign(C, {
	A: [
		1.0985,
		1,
		.35585
	],
	C: [
		.98074,
		1,
		1.18232
	],
	D55: [
		.95682,
		1,
		.92149
	],
	D75: [
		.94972,
		1,
		1.22638
	],
	E: [
		1,
		1,
		1
	],
	F2: [
		.99186,
		1,
		.67393
	],
	F7: [
		.95041,
		1,
		1.08747
	],
	F11: [
		1.00962,
		1,
		.6435
	]
}), C.ACES = [
	.32168 / .33767,
	1,
	.34065 / .33767
];
var ci = new O({
	id: "acescg",
	cssId: "--acescg",
	name: "ACEScg",
	coords: {
		r: {
			range: [0, 65504],
			name: "Red"
		},
		g: {
			range: [0, 65504],
			name: "Green"
		},
		b: {
			range: [0, 65504],
			name: "Blue"
		}
	},
	referred: "scene",
	white: C.ACES,
	toXYZ_M: [
		[
			.6624541811085053,
			.13400420645643313,
			.1561876870049078
		],
		[
			.27222871678091454,
			.6740817658111484,
			.05368951740793705
		],
		[
			-.005574649490394108,
			.004060733528982826,
			1.0103391003129971
		]
	],
	fromXYZ_M: [
		[
			1.6410233796943257,
			-.32480329418479,
			-.23642469523761225
		],
		[
			-.6636628587229829,
			1.6153315916573379,
			.016756347685530137
		],
		[
			.011721894328375376,
			-.008284441996237409,
			.9883948585390215
		]
	]
}), li = 2 ** -16, ui = -.35828683, di = (Math.log2(65504) + 9.72) / 17.52, fi = new O({
	id: "acescc",
	cssId: "--acescc",
	name: "ACEScc",
	coords: {
		r: {
			range: [ui, di],
			name: "Red"
		},
		g: {
			range: [ui, di],
			name: "Green"
		},
		b: {
			range: [ui, di],
			name: "Blue"
		}
	},
	referred: "scene",
	base: ci,
	toBase(e) {
		return e.map(function(e) {
			return e <= -.3013698630136986 ? (2 ** (e * 17.52 - 9.72) - li) * 2 : e < di ? 2 ** (e * 17.52 - 9.72) : 65504;
		});
	},
	fromBase(e) {
		return e.map(function(e) {
			return e <= 0 ? (Math.log2(li) + 9.72) / 17.52 : e < li ? (Math.log2(li + e * .5) + 9.72) / 17.52 : (Math.log2(e) + 9.72) / 17.52;
		});
	}
}), pi = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	A98RGB: mr,
	A98RGB_Linear: pr,
	ACEScc: fi,
	ACEScg: ci,
	CAM16_JMh: Lt,
	HCT: Kt,
	HPLuv: Wr,
	HSL: ur,
	HSLuv: Vr,
	HSV: dr,
	HWB: fr,
	ICTCP: mt,
	JzCzHz: tt,
	Jzazbz: et,
	LCH: _e,
	LCHuv: Er,
	Lab: j,
	Lab_D65: Gn,
	Luv: Tr,
	OKLCH: yr,
	OKLab: Oe,
	P3: hn,
	P3_Linear: cn,
	ProPhoto: vr,
	ProPhoto_Linear: hr,
	REC_2020: sn,
	REC_2020_Linear: rn,
	REC_2100_HLG: ii,
	REC_2100_PQ: $r,
	XYZ_ABS_D65: Re,
	XYZ_D50: de,
	XYZ_D65: D,
	sRGB: mn,
	sRGB_Linear: un
}), L = class e {
	constructor(...e) {
		let t;
		e.length === 1 && (t = T(e[0]));
		let n, r, i;
		t ? (n = t.space || t.spaceId, r = t.coords, i = t.alpha) : [n, r, i] = e, Object.defineProperty(this, "space", {
			value: E.get(n),
			writable: !1,
			enumerable: !0,
			configurable: !0
		}), this.coords = r ? r.slice() : [
			0,
			0,
			0
		], this.alpha = i > 1 || i === void 0 ? 1 : i < 0 ? 0 : i;
		for (let e = 0; e < this.coords.length; e++) this.coords[e] === "NaN" && (this.coords[e] = NaN);
		for (let e in this.space.coords) Object.defineProperty(this, e, {
			get: () => this.get(e),
			set: (t) => this.set(e, t)
		});
	}
	get spaceId() {
		return this.space.id;
	}
	clone() {
		return new e(this.space, this.coords, this.alpha);
	}
	toJSON() {
		return {
			spaceId: this.spaceId,
			coords: this.coords,
			alpha: this.alpha
		};
	}
	display(...t) {
		let n = _n(this, ...t);
		return n.color = new e(n.color), n;
	}
	static get(t, ...n) {
		return t instanceof e ? t : new e(t, ...n);
	}
	static defineFunction(t, n, r = n) {
		let { instance: i = !0, returns: a } = r, o = function(...t) {
			let r = n(...t);
			if (a === "color") r = e.get(r);
			else if (a === "function<color>") {
				let t = r;
				r = function(...n) {
					let r = t(...n);
					return e.get(r);
				}, Object.assign(r, t);
			} else a === "array<color>" && (r = r.map((t) => e.get(t)));
			return r;
		};
		t in e || (e[t] = o), i && (e.prototype[t] = function(...e) {
			return o(this, ...e);
		});
	}
	static defineFunctions(t) {
		for (let n in t) e.defineFunction(n, t[n], t[n]);
	}
	static extend(t) {
		if (t.register) t.register(e);
		else for (let n in t) e.defineFunction(n, t[n]);
	}
};
L.defineFunctions({
	get: k,
	getAll: le,
	set: A,
	setAll: ue,
	to: P,
	equals: vn,
	inGamut: je,
	toGamut: N,
	distance: Ne,
	toString: nn
}), Object.assign(L, {
	util: te,
	hooks: x,
	WHITES: C,
	Space: E,
	spaces: E.registry,
	parse: ae,
	defaults: S
});
for (let e of Object.keys(pi)) E.register(pi[e]);
for (let e in E.registry) mi(e, E.registry[e]);
x.add("colorspace-init-end", (e) => {
	mi(e.id, e), e.aliases?.forEach((t) => {
		mi(t, e);
	});
});
function mi(e, t) {
	let n = e.replace(/-/g, "_");
	Object.defineProperty(L.prototype, n, {
		get() {
			let n = this.getAll(e);
			return typeof Proxy > "u" ? n : new Proxy(n, {
				has: (e, n) => {
					try {
						return E.resolveCoord([t, n]), !0;
					} catch {}
					return Reflect.has(e, n);
				},
				get: (e, n, r) => {
					if (n && typeof n != "symbol" && !(n in e)) {
						let { index: r } = E.resolveCoord([t, n]);
						if (r >= 0) return e[r];
					}
					return Reflect.get(e, n, r);
				},
				set: (n, r, i, a) => {
					if (r && typeof r != "symbol" && !(r in n) || r >= 0) {
						let { index: a } = E.resolveCoord([t, r]);
						if (a >= 0) return n[a] = i, this.setAll(e, n), !0;
					}
					return Reflect.set(n, r, i, a);
				}
			});
		},
		set(t) {
			this.setAll(e, t);
		},
		configurable: !0,
		enumerable: !0
	});
}
L.extend(Zt), L.extend({ deltaE: er }), Object.assign(L, { deltaEMethods: Zt }), L.extend(rr), L.extend({ contrast: Yn }), L.extend($n), L.extend(xn), L.extend(lr), L.extend(Jn);
//#endregion
//#region src/features/color-system/outputSettings.ts
var hi = [
	"srgb",
	"display-p3",
	"rec2020"
], gi = [
	"rgb",
	"oklch",
	"hex",
	"hsl"
], _i = {
	authoringGamut: "srgb",
	outputFormat: "rgb",
	mapOutputsToSrgb: !1
}, vi = {
	srgb: "sRGB",
	"display-p3": "Display P3",
	rec2020: "Rec 2020"
};
function R(e) {
	return e.mapOutputsToSrgb ? "srgb" : e.authoringGamut;
}
function yi(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) return !1;
	let t = e;
	return Object.keys(t).length === 3 && hi.some((e) => e === t.authoringGamut) && gi.some((e) => e === t.outputFormat) && typeof t.mapOutputsToSrgb == "boolean" && (t.mapOutputsToSrgb || t.authoringGamut === "srgb" || t.outputFormat === "rgb" || t.outputFormat === "oklch");
}
function bi(e) {
	if (e === "srgb") return {
		..._i,
		outputFormat: "hex"
	};
	if (e === "display-p3") return {
		authoringGamut: "display-p3",
		outputFormat: "rgb",
		mapOutputsToSrgb: !1
	};
	if (e === "oklch") return {
		authoringGamut: "srgb",
		outputFormat: "oklch",
		mapOutputsToSrgb: !1
	};
	throw Error(`Unsupported legacy color output: ${String(e)}.`);
}
function z(e) {
	return e === "display-p3" ? "p3" : e;
}
function B(e) {
	if (!Number.isFinite(e)) throw Error("Color output contains an unavailable channel.");
	let t = e.toFixed(2);
	return Number(t) === 0 ? "0" : t.replace(/(?:\.0+|(\.\d*?)0+)$/, "$1");
}
function xi(e) {
	let [t, n, r] = e.coords;
	if (t === null || n === null || r === null || ![
		t,
		n,
		r
	].every((e) => Number.isFinite(Number(e)))) throw Error("Color output contains an unavailable channel.");
	return [
		Number(t),
		Number(n),
		Number(r)
	];
}
function Si(e, t, n) {
	if (n.outputFormat === "hex") {
		let n = (e) => Math.round(Math.min(1, Math.max(0, e)) * 255).toString(16).padStart(2, "0"), r = n(t);
		return `#${e.map(n).join("")}${r === "ff" ? "" : r}`;
	}
	let r = t === 1 ? "" : ` / ${B(t)}`, i = e.map((e) => Math.min(1, Math.max(0, e)));
	if (R(n) === "srgb") {
		let e = i.map((e) => Math.round(e * 255)).join(", ");
		return t === 1 ? `rgb(${e})` : `rgba(${e}, ${B(t)})`;
	}
	return `color(${R(n)} ${i.map(B).join(" ")}${r})`;
}
function Ci(e, t, n, r, i) {
	let a = Number(B(e * 100)) / 100, o = Number(B(n)) % 360, s = 25e3, c = 0, l = Math.round(t * s), u = z(R(i)), d = (e) => new L("oklch", [
		a,
		e / s,
		o
	]).inGamut(u, { epsilon: 1e-8 });
	if (!d(l)) {
		for (; c < l;) {
			let e = Math.ceil((c + l) / 2);
			d(e) ? c = e : l = e - 1;
		}
		l = c;
	}
	return `oklch(${B(a * 100)}% ${B(l / 100)}% ${l === 0 ? "0" : B(o)}${r})`;
}
function wi(e, t) {
	let n = z(R(t));
	if (yi(t) && (t.outputFormat === "hex" || t.outputFormat === "rgb") && e.length === 3 && e.every((e) => Number.isFinite(e) && e >= 0 && e <= 1)) {
		let r = L.Space.get(`${n}-linear`).to(n, [...e]);
		if (r.some((e) => e === null || !Number.isFinite(e))) throw Error("Color output contains an unavailable channel.");
		return Si(r.map(Number), 1, t);
	}
	return V(new L(`${n}-linear`, [...e]), t);
}
function Ti(e, t) {
	if (!yi(t)) throw Error("Invalid color output configuration.");
	let n = Number(e.alpha);
	if (e.alpha === null || !Number.isFinite(n) || n < 0 || n > 1) throw Error("Color output has invalid opacity.");
	let r = e.clone();
	r.coords = xi(e), r.alpha = n;
	let i = z(R(t));
	return r.toGamut({
		space: i,
		method: "css"
	}).to(i);
}
function V(e, t) {
	let n = Ti(e, t), r = t.outputFormat === "hex" ? Number(n.alpha) : Number(B(Number(n.alpha))), i = r === 1 ? "" : ` / ${B(r)}`;
	if (t.outputFormat === "hex" || t.outputFormat === "rgb") return Si(xi(n), r, t);
	if (t.outputFormat === "hsl") {
		let e = n.to("hsl");
		Number.isFinite(e.coords[0]) || (e.coords[0] = 0);
		let [t, r, a] = xi(e);
		return `hsl(${B(t)} ${B(r)}% ${B(a)}%${i})`;
	}
	let a = n.to("oklch"), o = xi(n);
	if (Math.max(...o) - Math.min(...o) < 1e-12) {
		let e = xi(n.to(`${z(R(t))}-linear`));
		return Ci(Math.cbrt(e[0]), 0, 0, i, t);
	}
	Number.isFinite(a.coords[2]) || (a.coords[2] = 0);
	let [s, c, l] = xi(a);
	return Ci(s, c, l, i, t);
}
//#endregion
//#region src/features/color-system/colorMath.ts
var Ei = {
	srgb: {
		linearThreshold: .0031308,
		encodedThreshold: .04045,
		slope: 12.92,
		factor: 1.055,
		offset: .055,
		exponent: 1 / 2.4
	},
	rec2020: {
		linearThreshold: .018053968510807,
		encodedThreshold: .0812428582986315,
		slope: 4.5,
		factor: 1.09929682680944,
		offset: .09929682680944,
		exponent: .45
	}
};
function H(e) {
	return Math.min(1, Math.max(0, e));
}
function Di(e, t) {
	return [
		t(e[0], 0),
		t(e[1], 1),
		t(e[2], 2)
	];
}
function U(e, t = "srgb") {
	let n = Ei[t === "rec2020" ? "rec2020" : "srgb"], r = t === "rec2020" ? Math.abs(e) : e, i = r <= n.encodedThreshold ? r / n.slope : ((r + n.offset) / n.factor) ** (1 / n.exponent);
	return t === "rec2020" ? Math.sign(e) * i : i;
}
function Oi(e, t = "srgb") {
	let n = Ei[t === "rec2020" ? "rec2020" : "srgb"], r = t === "rec2020" ? Math.abs(e) : e, i = r <= n.linearThreshold ? r * n.slope : n.factor * r ** n.exponent - n.offset;
	return t === "rec2020" ? Math.sign(e) * i : i;
}
function ki(e, t, n) {
	return t === n ? e : ji(Ai(e, t), n);
}
function Ai([e, t, n], r = "srgb") {
	return qi(Gi[r], [
		e,
		t,
		n
	]);
}
function ji([e, t, n], r = "srgb") {
	return qi(Ki[r], [
		e,
		t,
		n
	]);
}
function Mi(e, t = "srgb") {
	return `#${ki(e, t, "srgb").map((e) => Math.round(H(Oi(e)) * 255).toString(16).padStart(2, "0")).join("")}`;
}
function Ni(e) {
	return typeof e == "object" ? e : {
		authoringGamut: e === "oklch" ? "srgb" : e,
		outputFormat: e === "srgb" ? "hex" : e === "oklch" ? "oklch" : "rgb",
		mapOutputsToSrgb: !1
	};
}
function W(e, t = "srgb", n = G(t)) {
	let r = Ni(t);
	return n === R(r) ? wi(e, r) : V(new L(`${z(n)}-linear`, [...e]), r);
}
function G(e) {
	return typeof e == "object" ? R(e) : e === "oklch" ? "srgb" : e;
}
function K([e, t, n], r = "srgb") {
	return e === t && t === n ? e : r === "rec2020" ? .2627002120112671 * e + .6779980715188708 * t + .05930171646986196 * n : r === "display-p3" ? .2289745640697488 * e + .6917385218365064 * t + .079286914093745 * n : .2126 * e + .7152 * t + .0722 * n;
}
function Pi(e, t) {
	return (Math.max(e, t) + .05) / (Math.min(e, t) + .05);
}
function Fi(e, t, n) {
	return H(n ? (e + .05) / t - .05 : t * (e + .05) - .05);
}
function Ii([e, t, n]) {
	let r = .4122214708 * e + .5363325363 * t + .0514459929 * n, i = .2119034982 * e + .6806995451 * t + .1073969566 * n, a = .0883024619 * e + .2817188376 * t + .6299787005 * n, o = Math.cbrt(r), s = Math.cbrt(i), c = Math.cbrt(a);
	return [
		.2104542553 * o + .793617785 * s - .0040720468 * c,
		1.9779984951 * o - 2.428592205 * s + .4505937099 * c,
		.0259040371 * o + .7827717662 * s - .808675766 * c
	];
}
function Li([e, t, n]) {
	let r = (e + .3963377774 * t + .2158037573 * n) ** 3, i = (e - .1055613458 * t - .0638541728 * n) ** 3, a = (e - .0894841775 * t - 1.291485548 * n) ** 3;
	return [
		4.0767416621 * r - 3.3077115913 * i + .2309699292 * a,
		-1.2684380046 * r + 2.6097574011 * i - .3413193965 * a,
		-.0041960863 * r - .7034186147 * i + 1.707614701 * a
	];
}
function Ri([e, t, n]) {
	return [
		e,
		Math.hypot(t, n),
		(Math.atan2(n, t) * 180 / Math.PI + 360) % 360
	];
}
function zi([e, t, n]) {
	let r = n * Math.PI / 180;
	return [
		e,
		t * Math.cos(r),
		t * Math.sin(r)
	];
}
function Bi(e) {
	return Ri(Ii(e));
}
function Vi(e) {
	return Li(zi(e));
}
function Hi(e) {
	return e.every((e) => e >= 0 && e <= 1);
}
function Ui(e) {
	let [t, n, r] = e.coords;
	if (t === null || n === null || r === null || ![
		t,
		n,
		r
	].every(Number.isFinite)) throw Error("Color conversion returned unavailable channels.");
	return [
		t,
		n,
		r
	];
}
function Wi(e, t) {
	return [
		Ui(new L(e, [
			1,
			0,
			0
		]).to(t)),
		Ui(new L(e, [
			0,
			1,
			0
		]).to(t)),
		Ui(new L(e, [
			0,
			0,
			1
		]).to(t))
	];
}
var Gi = {
	srgb: Wi("srgb-linear", "xyz-d65"),
	"display-p3": Wi("p3-linear", "xyz-d65"),
	rec2020: Wi("rec2020-linear", "xyz-d65")
}, Ki = {
	srgb: Wi("xyz-d65", "srgb-linear"),
	"display-p3": Wi("xyz-d65", "p3-linear"),
	rec2020: Wi("xyz-d65", "rec2020-linear")
};
function qi([e, t, n], [r, i, a]) {
	return [
		e[0] * r + t[0] * i + n[0] * a,
		e[1] * r + t[1] * i + n[1] * a,
		e[2] * r + t[2] * i + n[2] * a
	];
}
function Ji(e) {
	return typeof e == "object" && e.mapOutputsToSrgb && e.authoringGamut !== "srgb";
}
function Yi(e, t, n, r = "srgb", i = !1) {
	if (e <= 0) return [
		0,
		0,
		0
	];
	if (e >= 1) return [
		1,
		1,
		1
	];
	if (i) return Ui(new L("oklch", [
		e,
		t,
		n
	]).toGamut({
		space: z(r),
		method: "css"
	}).to(`${z(r)}-linear`));
	let a = (e) => Hi(ki(e, "srgb", r)), o = Vi([
		e,
		t,
		n
	]);
	if (a(o)) return ki(o, "srgb", r);
	let s = 0, c = t;
	for (let t = 0; t < 22; t += 1) {
		let t = (s + c) / 2;
		a(Vi([
			e,
			t,
			n
		])) ? s = t : c = t;
	}
	return ki(Vi([
		e,
		s,
		n
	]), "srgb", r);
}
function Xi(e, t, n) {
	return (e + ((t - e + 540) % 360 - 180) * n + 360) % 360;
}
function Zi(e, t) {
	return Math.hypot(e[0] - t[0], e[1] - t[1], e[2] - t[2]);
}
//#endregion
//#region src/features/color-system/scaleInterpolation.ts
function Qi(e) {
	return e.interpolation ?? "oklch";
}
//#endregion
//#region src/features/color-system/paletteValue.ts
var $i = .4;
function ea(e, t) {
	return Yi(e.lightness, e.chroma / 100 * $i, e.hue, G(t), Ji(t));
}
function ta(e, t) {
	return W(ea(e, t), t);
}
//#endregion
//#region src/features/color-system/scaleGeneration.ts
var na = 2, ra = 33, ia = [
	4,
	9,
	14,
	19,
	24,
	28
], aa = [
	2,
	5,
	8,
	11,
	14,
	17,
	20,
	23,
	26,
	29
], oa = [
	.05,
	.1,
	.2,
	.3,
	.4,
	.5,
	.6,
	.7,
	.8,
	.9,
	.95
], sa = /* @__PURE__ */ new Map();
function ca(e, t) {
	return `${JSON.stringify(t)}|${e.id}|${e.name}|${Qi(e)}|${e.stops.map((e) => `${e.lightness},${e.hue},${e.chroma}`).join(";")}`;
}
function la(e) {
	return [...e].sort((e, t) => e.lightness - t.lightness);
}
function ua(e, t) {
	let n = la(e);
	if (n.length === 0) throw Error("A color scale requires at least one stop.");
	let r = n[0], i = n.at(-1);
	if (t <= r.lightness || n.length === 1) return {
		hue: r.hue,
		chroma: r.chroma
	};
	if (t >= i.lightness) return {
		hue: i.hue,
		chroma: i.chroma
	};
	let a = n.findIndex((e) => e.lightness >= t), o = n[a - 1], s = n[a], c = s.lightness - o.lightness, l = c === 0 ? 0 : (t - o.lightness) / c;
	return {
		hue: Xi(o.hue, s.hue, l),
		chroma: o.chroma + (s.chroma - o.chroma) * l
	};
}
function da(e, t, n) {
	return Yi(H(e.lightness), e.chroma / 100 * $i, e.hue, t, n);
}
function fa(e, t, n, r) {
	let i = [
		{
			lightness: 0,
			gamma: [
				0,
				0,
				0
			]
		},
		...la(e).map((e) => ({
			lightness: H(e.lightness),
			gamma: da(e, n, r).map((e) => Oi(e, n))
		})),
		{
			lightness: 1,
			gamma: [
				1,
				1,
				1
			]
		}
	], a = H(t), o = Math.max(1, i.findIndex((e) => e.lightness >= a)), s = i[o - 1], c = i[o], l = c.lightness - s.lightness, u = l <= 0 ? 1 : (a - s.lightness) / l;
	return s.gamma.map((e, t) => U(e + (c.gamma[t] - e) * u, n));
}
function pa(e, t, n, r) {
	if (Qi(e) === "rgb") {
		let i = fa(e.stops, t, n, r), [, a, o] = Bi(ki(i, n, "srgb"));
		return {
			linear: i,
			hue: Number.isFinite(o) ? o : 0,
			chroma: a / $i * 100
		};
	}
	let { hue: i, chroma: a } = ua(e.stops, t);
	return {
		linear: Yi(H(t), a / 100 * $i, i, n, r),
		hue: i,
		chroma: a
	};
}
function ma(e, t, n = "srgb") {
	let r = G(n), i = H(t), { linear: a, hue: o, chroma: s } = pa(e, i, r, Ji(n));
	return {
		linear: a,
		css: W(a, n, r),
		hex: Mi(a, r),
		lightness: i,
		hue: o,
		chroma: s,
		gamut: r
	};
}
function ha(e, t = "srgb") {
	let n = G(t), r = Math.min(...e.stops.map((e) => e.lightness), 0), i = Math.max(...e.stops.map((e) => e.lightness), 1);
	return Array.from({ length: ra }, (a, o) => {
		let s = r + (i - r) * o / (ra - 1), { linear: c } = pa(e, s, n, Ji(t));
		return {
			lightness: s,
			linear: c,
			luminance: K(c, n),
			hex: Mi(c, n),
			css: W(c, t, n)
		};
	}).sort((e, t) => e.luminance - t.luminance);
}
function ga(e, t = []) {
	let n = t.length > 0 ? aa : ia, r = [
		{
			luminance: 0,
			linear: [
				0,
				0,
				0
			]
		},
		...t,
		...n.map((t) => ({
			luminance: e[t].luminance,
			linear: e[t].linear
		})),
		{
			luminance: 1,
			linear: [
				1,
				1,
				1
			]
		}
	];
	return r.sort((e, t) => e.luminance - t.luminance), r.filter((e, t) => t === 0 || e.luminance - r[t - 1].luminance >= 1e-4);
}
function _a(e, t) {
	let n = H(t);
	if (n <= e[0].luminance) return e[0].linear;
	let r = e.at(-1);
	if (n >= r.luminance) return r.linear;
	let i = e.findIndex((e) => e.luminance >= n), a = e[i - 1], o = e[i], s = (n - a.luminance) / (o.luminance - a.luminance);
	return [
		a.linear[0] + (o.linear[0] - a.linear[0]) * s,
		a.linear[1] + (o.linear[1] - a.linear[1]) * s,
		a.linear[2] + (o.linear[2] - a.linear[2]) * s
	];
}
function va(e, t = "srgb") {
	let n = G(t), r = ca(e, t), i = sa.get(r);
	if (i) return i;
	let a = ha(e, t), o = ga(a, Qi(e) === "rgb" ? e.stops.map((e) => {
		let r = da(e, n, Ji(t));
		return {
			luminance: K(r, n),
			linear: r
		};
	}) : []), s = {
		scale: e,
		neutral: e.stops.every((e) => e.chroma < na),
		ramp: a,
		anchors: o,
		referencePalette: Object.fromEntries(oa.map((e) => [Math.round(e * 1e3), W(_a(o, e), t, n)])),
		gamut: n,
		output: t
	};
	if (sa.set(r, s), sa.size > 256) {
		let e = sa.keys().next().value;
		e && sa.delete(e);
	}
	return s;
}
var ya = 2, ba = 3, xa = 1, Sa = 21;
function Ca(e) {
	return Math.min(Sa, Math.max(xa, e));
}
function wa(e) {
	return e > 216 / 24389 ? 116 * Math.cbrt(e) - 16 : 24389 / 27 * e;
}
function Ta(e) {
	return e > 8 ? ((e + 16) / 116) ** 3 : e * 27 / 24389;
}
function Ea(e) {
	return wa(.05 * (Ca(e) - 1));
}
function Da(e) {
	return Ca(1 + Ta(Math.min(100, Math.max(0, e))) / .05);
}
function Oa(e, t) {
	return e + t * (1 - Math.exp(-e / ba)) * (1 - (e / 100) ** ya);
}
function ka(e, t) {
	let n = 0, r = 100;
	for (let i = 0; i < 40; i += 1) {
		let i = (n + r) / 2;
		Oa(i, t) < e ? n = i : r = i;
	}
	return (n + r) / 2;
}
function Aa(e) {
	return e.settings.contrastReference ?? "light";
}
function ja(e) {
	return e.settings.polarityCompensation ?? 0;
}
function Ma(e) {
	return e.settings.contrastMultiplier ?? 1;
}
function Na(e, t) {
	return Ca((Ca(e) - 1) * Math.max(0, t) + 1);
}
function Pa(e) {
	let t = Ma(e);
	return t === 1 ? e : {
		...e,
		contrasts: e.contrasts.map((e) => ({
			...e,
			value: Na(e.value, t)
		})),
		scales: e.scales.map((e) => e.customContrasts ? {
			...e,
			customContrasts: {
				...e.customContrasts,
				steps: e.customContrasts.steps.map((e) => ({
					...e,
					value: Na(e.value, t)
				}))
			}
		} : e),
		surfaces: e.surfaces.map((e) => e.base || e.contrast === void 0 ? e : {
			...e,
			contrast: Na(e.contrast, t)
		})
	};
}
function Fa(e, t, n) {
	let r = Math.min(1, Math.max(0, t)) * 12;
	if (r === 0) return Ca(e);
	let i = Ea(e);
	return Da(n === "light" ? Oa(i, r) : ka(i, r));
}
function Ia(e, t) {
	let n = Math.min(100, Math.max(0, wa(e))) / 100;
	return t === "light" ? 1 - n : n;
}
function La(e, t) {
	return e.oppositeValue ?? Fa(e.value, t.strength, t.reference);
}
function Ra(e, t) {
	let n = Ca(e.value);
	if (t.weight <= 0) return n;
	let r = La(e, t);
	return t.weight >= 1 ? Ca(r) : Ca(Math.exp(Math.log(n) + t.weight * (Math.log(r) - Math.log(n))));
}
function za(e) {
	return K(ma(e.scales.find((t) => t.id === e.backgroundScaleId) ?? e.scales[0], e.backgroundLightness, e.settings.colorOutput).linear, G(e.settings.colorOutput));
}
function Ba(e) {
	let t = Aa(e);
	return {
		weight: Ia(za(e), t),
		strength: ja(e),
		reference: t
	};
}
function Va(e) {
	let t = Ba(e), n = [...e.contrasts, ...e.scales.flatMap((e) => e.customContrasts?.steps ?? [])].some((e) => e.oppositeValue !== void 0);
	return t.weight === 0 || t.strength === 0 && !n ? e : {
		...e,
		contrasts: e.contrasts.map((e) => ({
			...e,
			value: Ra(e, t)
		})),
		scales: e.scales.map((e) => e.customContrasts ? {
			...e,
			customContrasts: {
				...e.customContrasts,
				steps: e.customContrasts.steps.map((e) => ({
					...e,
					value: Ra(e, t)
				}))
			}
		} : e),
		surfaces: e.surfaces.map((e) => e.base || e.contrast === void 0 ? e : {
			...e,
			contrast: Ra({ value: e.contrast }, t)
		})
	};
}
//#endregion
//#region src/features/foundations/types.ts
function Ha(e) {
	return e.hideFromPublishing !== !0;
}
function Ua(e) {
	return e.hideFromPublishing === void 0 || typeof e.hideFromPublishing == "boolean";
}
//#endregion
//#region src/features/color-system/outputContrast.ts
var Wa = class extends Error {
	details;
	constructor(e) {
		super(`${e.source} cannot reach ${e.requestedContrast}:1 contrast against ${e.background} in ${vi[e.gamut]}. The achievable contrast is ${e.achievableContrast.toFixed(2)}:1. Change the target, background or contrast side before exporting.`), this.details = e, this.name = "ColorOutputError";
	}
}, Ga = /* @__PURE__ */ new Map(), Ka = 0;
function qa(e, t) {
	let n = `${t}\0${e}`, r = Ga.get(n);
	if (r) return r;
	let i = { color: new L(e) };
	if (n.length > 512) return i;
	for (; Ga.size >= 4096 || Ka + n.length > 262144;) {
		let e = Ga.keys().next().value;
		if (e === void 0) break;
		Ga.delete(e), Ka -= e.length;
	}
	return Ga.set(n, i), Ka += n.length, i;
}
function Ja(e, t) {
	let n = qa(e, t);
	if (n.linear) return [...n.linear];
	let r = n.color;
	if (r.space.id === "oklch" && Number(r.coords[1]) === 0) {
		let e = Number(r.coords[0]) ** 3;
		return n.linear = [
			e,
			e,
			e
		], [
			e,
			e,
			e
		];
	}
	let i = r.to(`${z(t)}-linear`).coords.map(Number);
	if (i.length !== 3 || !i.every(Number.isFinite)) throw Error(`Cannot measure output color ${e}.`);
	return n.linear = [
		i[0],
		i[1],
		i[2]
	], [...n.linear];
}
function Ya(e, t, n) {
	let r = qa(e, n), i = qa(t, n), a = r.color, o = i.color;
	if (Number(o.alpha) !== 1) throw Error("A contrast background must be opaque.");
	let s = Number(a.alpha);
	if (!Number.isFinite(s) || s < 0 || s > 1) throw Error("A contrast foreground has invalid opacity.");
	let c = (e) => {
		if (e.encoded) return e.encoded;
		let t = e.color;
		if (t.space.id === "oklch" && Number(t.coords[1]) === 0) {
			let r = Oi(Number(t.coords[0]) ** 3, n);
			e.encoded = [
				r,
				r,
				r
			];
		} else e.encoded = t.to(z(n)).coords.map(Number);
		return e.encoded;
	}, l = c(r), u = c(i), d = l.map((e, t) => e * s + u[t] * (1 - s));
	if (!d.every(Number.isFinite)) throw Error("Cannot measure the composited output color.");
	return [
		U(d[0], n),
		U(d[1], n),
		U(d[2], n)
	];
}
function Xa(e, t, n) {
	return Pi(K(Ya(e, t, n), n), K(Ja(t, n), n));
}
function Za(e) {
	if (!Number.isFinite(e) || e < 1 || e > 21) throw Error("Choose a finite contrast target from 1:1 to 21:1.");
}
function Qa(e, t, n, r, i, a) {
	Za(n);
	let o = R(r), s = /* @__PURE__ */ new Map(), c = (e) => {
		let n = wi(e, r), i = s.get(n);
		if (i) return i;
		let a = {
			css: n,
			linear: Ja(n, o),
			measuredContrast: Xa(n, t, o)
		};
		return s.set(n, a), a;
	}, l = c(e);
	if (l.measuredContrast >= n) return l;
	let u = i ? [
		0,
		0,
		0
	] : [
		1,
		1,
		1
	], d = c(u);
	if (d.measuredContrast < n) return d;
	let f = 0, p = 1;
	for (let t = 0; t < 46; t += 1) {
		let t = (f + p) / 2, r = c(Di(e, (e, n) => e + t * (u[n] - e)));
		r.measuredContrast >= n ? (p = t, d = r) : f = t;
	}
	return d;
}
function $a(e, t, n, r, i, a) {
	let o = R(r), s = Qa(e, t, n, r, i, a), c = (e) => {
		let n = new L(s.css);
		n.alpha = H(e);
		let i = V(n, r);
		return {
			css: i,
			linear: Ya(i, t, o),
			alpha: Number(new L(i).alpha),
			measuredContrast: Xa(i, t, o),
			sourceCss: s.css,
			sourceLinear: s.linear
		};
	}, l = 0, u = 1, d = c(1);
	for (let e = 0; e < 46; e += 1) {
		let e = c((l + u) / 2);
		e.measuredContrast >= n ? (u = (l + u) / 2, d = e) : l = (l + u) / 2;
	}
	return d;
}
//#endregion
//#region src/features/color-system/data-vis/colors.ts
function q(e) {
	if (!e.trim() || /\b(?:var|env)\(|\bcurrentcolor\b/i.test(e)) throw Error(`Unavailable concrete color: ${e || "(empty)"}.`);
	let t;
	try {
		t = new L(e);
	} catch (t) {
		throw Error(`Unavailable concrete color: ${e}.`, { cause: t });
	}
	if (t.alpha === null || !Number.isFinite(Number(t.alpha)) || t.coords.some((e) => e === null || !Number.isFinite(Number(e)))) throw Error(`Color ${e} has unavailable channels.`);
	return t.alpha = Number(t.alpha), t.coords = [
		Number(t.coords[0]),
		Number(t.coords[1]),
		Number(t.coords[2])
	], t;
}
function eo(e) {
	let [t, n, r] = e.coords;
	if ([
		t,
		n,
		r
	].some((e) => e === null || !Number.isFinite(e))) throw Error("Color conversion has unavailable channels.");
	return [
		t,
		n,
		r
	];
}
function to(e) {
	return eo(e.to("oklab"));
}
function no(e, t, n = "srgb") {
	let r = z(n), i = q(e), a = q(t);
	if (i.inGamut(r) && a.inGamut(r)) return new L(`${r}-linear`, [...Ya(e, t, n)]).to(r);
	let o = i.toGamut({
		space: r,
		method: "css"
	}).to(r), s = a.toGamut({
		space: r,
		method: "css"
	}).to(r);
	if (s.alpha < 1) throw Error("The comparison background must be opaque.");
	let c = H(o.alpha), l = eo(o), u = eo(s);
	return new L(r, [
		l[0] * c + u[0] * (1 - c),
		l[1] * c + u[1] * (1 - c),
		l[2] * c + u[2] * (1 - c)
	]);
}
function ro(e, t, n) {
	return ao(Ri(e), t, n);
}
function io(e, t, n) {
	return ao(e, t, n);
}
function ao([e, t, n], r, i) {
	if (typeof i == "object") {
		let a = new L("oklch", [
			H(e),
			t,
			n
		]);
		return a.alpha = r, V(a, i);
	}
	let a = Yi(H(e), t, n, G(i)), o = new L(`${z(G(i))}-linear`, [...a]);
	return o.alpha = r, V(o, Ni(i));
}
//#endregion
//#region src/features/color-system/data-vis/model.ts
var J = (e) => typeof e == "object" && !!e && !Array.isArray(e), Y = (e) => typeof e == "string" && e.trim().length > 0, X = (e, t, n) => typeof e == "number" && Number.isFinite(e) && e >= t && e <= n;
function oo(e) {
	return e === "protanopia" || e === "deuteranopia" || e === "tritanopia" || e === "achromatopsia";
}
function so(e) {
	return J(e) && X(e.lightness, 0, 1) && X(e.hue, 0, 360) && X(e.chroma, 0, 125);
}
function co(e) {
	return J(e) && e.kind === "ui-swatch" && Y(e.scaleId) && Y(e.contrastId);
}
function lo(e) {
	return J(e) && e.kind === "primitive-token" && Y(e.tokenId);
}
function uo(e) {
	if (typeof e != "string") return !1;
	try {
		return q(e), !0;
	} catch {
		return !1;
	}
}
function fo(e) {
	return J(e) && Y(e.id) && uo(e.value) && (e.position === void 0 || X(e.position, 0, 1)) && (e.tokenId === void 0 || Y(e.tokenId)) && (e.overrideValue === void 0 || uo(e.overrideValue));
}
function po(e) {
	return e.overrideValue ?? e.value;
}
function mo(e) {
	return J(e) && X(e.value, 1, 21) && (e.oppositeValue === void 0 || X(e.oppositeValue, 1, 21));
}
function ho(e) {
	if (!J(e) || !Y(e.id) || !X(e.position, 0, 1) || !J(e.source)) return !1;
	if (co(e.source) || lo(e.source)) return e.contrast === void 0;
	let t = e.source;
	return mo(e.contrast) && (t.kind === "key-color" && so(t.color) || t.kind === "ui-scale" && Y(t.scaleId));
}
function go(e) {
	return !J(e) || !J(e.size) ? !1 : (e.size.kind === "auto" || e.size.kind === "count" && typeof e.size.count == "number" && Number.isSafeInteger(e.size.count) && e.size.count >= 1) && X(e.minimumBackgroundContrast, 1, 21) && typeof e.minimumDeltaE == "number" && Number.isFinite(e.minimumDeltaE) && e.minimumDeltaE >= 0 && Array.isArray(e.cvdProfiles) && e.cvdProfiles.every(oo) && new Set(e.cvdProfiles).size === e.cvdProfiles.length && (e.style === "balanced" || e.style === "bold");
}
function _o(e) {
	if (!J(e) || !Y(e.id) || !Y(e.name) || !Ua(e) || e.staticColors !== void 0 && (!Array.isArray(e.staticColors) || !e.staticColors.length || !e.staticColors.every(fo) || new Set(e.staticColors.map((e) => e.id)).size !== e.staticColors.length)) return !1;
	if (e.kind === "categorical") {
		let t = e.members;
		return Array.isArray(t) ? go(e.preferences) && t.length > 0 && t.every((e) => J(e) && Y(e.id) && co(e.source)) && new Set(t.map((e) => e.id)).size === t.length && (e.staticColors === void 0 || e.staticColors.length === t.length && e.staticColors.every((e) => e.position === void 0 && t.some((t) => t.id === e.id))) : !1;
	}
	if (e.kind !== "sequential" && e.kind !== "diverging" || !Array.isArray(e.points) || e.points.length < 2 || !e.points.every(ho)) return !1;
	let t = e.points;
	if (e.staticColors !== void 0) {
		let t = e.staticColors;
		if (t.length < 2 || t[0].position !== 0 || t.at(-1)?.position !== 1 || !t.every((e, n) => e.position !== void 0 && (n === 0 || e.position > t[n - 1].position)) || e.kind === "diverging" && !t.some((e) => e.position === .5)) return !1;
	}
	return t[0].position === 0 && t.at(-1)?.position === 1 && new Set(t.map((e) => e.id)).size === t.length && t.every((e, n) => n === 0 || e.position > t[n - 1].position) && (e.kind !== "diverging" || t.some((e) => e.position === .5));
}
function vo(e) {
	return Array.isArray(e) && e.every(_o) && new Set(e.map((e) => e.id)).size === e.length;
}
function yo(e) {
	if (!J(e) || !Object.keys(e).every((e) => [
		"color",
		"scaleId",
		"contrastId",
		"tokenId"
	].includes(e)) || e.scaleId !== void 0 && !Y(e.scaleId) || e.contrastId !== void 0 && !Y(e.contrastId) || e.tokenId !== void 0 && !Y(e.tokenId)) return !1;
	if (e.color !== void 0) {
		let t = e.color;
		if (!J(t) || !Object.keys(t).every((e) => [
			"lightness",
			"hue",
			"chroma"
		].includes(e)) || t.lightness !== void 0 && !X(t.lightness, 0, 1) || t.hue !== void 0 && !X(t.hue, 0, 360) || t.chroma !== void 0 && !X(t.chroma, 0, 125)) return !1;
	}
	return !0;
}
function bo(e) {
	return J(e) && Object.values(e).every((e) => J(e) && Object.values(e).every(yo));
}
function xo(e) {
	return J(e) && Object.values(e).every((e) => J(e) && Object.values(e).every((e) => X(e, 1, 21)));
}
function So(e, t) {
	return t ? e.map((e) => e.kind === "categorical" ? e : {
		...e,
		points: e.points.map((n) => {
			let r = t[e.id]?.[n.id];
			if (r === void 0) return n;
			if (!n.contrast) throw Error(`Linked point ${n.id} cannot own a contrast override.`);
			return {
				...n,
				contrast: {
					...n.contrast,
					value: r
				}
			};
		})
	}) : e;
}
//#endregion
//#region src/features/color-system/scaleAdjustment.ts
var Co = {
	hue: 0,
	chroma: 100
};
function wo(e) {
	if (e.method === "absolute") return e;
	let t = e.hue ?? Co.hue, n = e.chroma ?? Co.chroma;
	if (!(t === 0 && n === 100 && e.enabled === void 0)) return {
		method: "relative",
		...e.enabled !== void 0 && { enabled: e.enabled },
		...t !== 0 && { hue: t },
		...n !== 100 && { chroma: n }
	};
}
var To = (e) => typeof e == "number" && Number.isFinite(e);
function Eo(e) {
	return !e || typeof e != "object" || Array.isArray(e) || !("method" in e) || "enabled" in e && typeof e.enabled != "boolean" ? !1 : e.method === "relative" ? (!("hue" in e) || To(e.hue)) && (!("chroma" in e) || To(e.chroma)) : e.method === "absolute" && "color" in e && so(e.color);
}
function Do(e) {
	return (e % 360 + 360) % 360;
}
function Oo(e, t) {
	if (t.enabled === !1) return e;
	if (t.method === "absolute") return {
		...e,
		...t.color
	};
	let { hue: n = 0, chroma: r = 100 } = t;
	return {
		...e,
		...t.hue !== void 0 && { hue: Do(e.hue + n) },
		...t.chroma !== void 0 && { chroma: Math.min(100, Math.max(0, e.chroma * r / 100)) }
	};
}
function ko(e, t) {
	return !t || t.enabled === !1 || !wo(t) ? e : {
		...e,
		scales: e.scales.map((e) => t.method === "absolute" ? {
			...e,
			interpolation: "rgb",
			stops: [{
				id: e.stops[0].id,
				...t.color
			}]
		} : {
			...e,
			stops: e.stops.map((e) => Oo(e, t))
		}),
		dataVisScales: e.dataVisScales.map((e) => e.kind === "categorical" ? e : {
			...e,
			points: e.points.map((e) => e.source.kind !== "key-color" || !e.contrast ? e : {
				...e,
				contrast: e.contrast,
				source: {
					kind: "key-color",
					color: Oo(e.source.color, t)
				}
			})
		})
	};
}
//#endregion
//#region src/features/color-system/resolution.ts
function Ao(t, r, i, { applyMultiplier: a = !0, applyPolarity: o = !0, modeSets: s } = {}) {
	let c = t, l = s ? e(s) : void 0, u;
	for (let e of r) {
		let t = e.foundations.color;
		if (!t) continue;
		let n = s?.find((t) => t.modes.some((t) => t.id === e.id));
		if (n && e.id === n.defaultModeId) continue;
		let r = !l || n?.id === l["color.contrastMultiplier"] ? t.scaleContrasts : void 0, i = !l || n?.id === l["color.contrastMultiplier"] ? t.dataVisContrasts : void 0;
		t.scaleAdjustment && (!l || n?.id === l["color.scaleAdjustment"]) && (u = t.scaleAdjustment), c = {
			...c,
			...i && { dataVisScales: So(c.dataVisScales, i) },
			...r && { scales: c.scales.map((e) => ({
				...e,
				...e.customContrasts && { customContrasts: {
					...e.customContrasts,
					steps: e.customContrasts.steps.map((t) => ({
						...t,
						value: r[e.id]?.[t.id] ?? t.value
					}))
				} }
			})) },
			...t.backgroundScaleId !== void 0 && (!l || n?.id === l["color.backgroundScaleId"]) ? { backgroundScaleId: t.backgroundScaleId } : {},
			...t.backgroundLightness !== void 0 && (!l || n?.id === l["color.backgroundLightness"]) ? { backgroundLightness: t.backgroundLightness } : {},
			...t.contrastMultiplier !== void 0 && (!l || n?.id === l["color.contrastMultiplier"]) ? { settings: {
				...c.settings,
				contrastMultiplier: t.contrastMultiplier
			} } : {}
		};
	}
	if (c = ko(n(c), u), i) {
		let e = i["color.hueShift"], t = i["color.saturation"];
		(typeof e == "number" || typeof t == "number") && (c = ko(c, {
			method: "relative",
			...typeof e == "number" && { hue: e },
			...typeof t == "number" && { chroma: t }
		}));
		let n = i["color.backgroundScaleId"], r = i["color.backgroundLightness"], a = i["color.contrastMultiplier"];
		c = {
			...c,
			...typeof n == "string" ? { backgroundScaleId: n } : {},
			...typeof r == "number" ? { backgroundLightness: r } : {},
			...typeof a == "number" ? { settings: {
				...c.settings,
				contrastMultiplier: a
			} } : {}
		};
	}
	let d = o ? Va(c) : c;
	return a ? Pa(d) : d;
}
//#endregion
//#region src/features/modes/combinations.ts
function jo(e) {
	return e.modes.find((t) => t.id === e.defaultModeId) ?? e.modes[0];
}
function Mo(e, t) {
	return Object.fromEntries(e.map((e, n) => [e.id, t[n].id]));
}
//#endregion
//#region src/features/tokens/model.ts
function No(e, t) {
	return e.value !== void 0 && e.baseline.value !== t.value ? !0 : e.name !== void 0 && !Ro(e.baseline.name, t.name);
}
function Po(e, t) {
	return {
		...e,
		name: t?.name ?? e.name,
		value: t?.value ?? e.value,
		generated: {
			name: e.name,
			value: e.value
		},
		nameOverridden: t?.name !== void 0,
		valueOverridden: t?.value !== void 0,
		stale: t ? No(t, e) : !1
	};
}
function Fo(e, t) {
	return `${e}:${t}`;
}
var Io = "palette";
function Lo(e) {
	return e.contrastValue ? `${e.colorName}-${e.contrastValue}` : e.colorName;
}
function Ro(e, t) {
	return e.colorName === t.colorName && e.contrastValue === t.contrastValue;
}
function zo(e, t) {
	let n = t;
	for (let t = 0; t < e.length; t += 1) n ^= e.charCodeAt(t), n = Math.imul(n, 16777619) >>> 0;
	return n ^= n >>> 16, n = Math.imul(n, 2246822507) >>> 0, n ^= n >>> 13, n >>> 0;
}
function Bo(e) {
	return e.toString(16).padStart(8, "0");
}
var Vo = /* @__PURE__ */ new Map(), Ho = 8192, Uo = 1048576, Wo = 0;
function Go(e) {
	let t = Vo.get(e);
	if (t !== void 0) return t;
	let n = Ko(e), r = e.length + n.length;
	if (r > Uo) return n;
	for (; Vo.size >= Ho || Wo + r > Uo;) {
		let e = Vo.keys().next().value;
		Wo -= e.length + Vo.get(e).length, Vo.delete(e);
	}
	return Vo.set(e, n), Wo += r, n;
}
function Ko(e) {
	let t = [
		Bo(zo(e, 2166136261)),
		Bo(zo(e, 1099511628)),
		Bo(zo(e, 374761393)),
		Bo(zo(e, 668265263))
	].join(""), n = `8${t.slice(13, 16)}`, r = `${(parseInt(t[16], 16) & 3 | 8).toString(16)}${t.slice(17, 20)}`;
	return `${t.slice(0, 8)}-${t.slice(8, 12)}-${n}-${r}-${t.slice(20, 32)}`;
}
//#endregion
//#region src/features/color-system/dynamicGeneration.ts
var qo = /* @__PURE__ */ new WeakMap();
function Jo(e, t, n) {
	return {
		linear: e,
		hex: Mi(e, n.gamut),
		css: W(e, n.output, n.gamut),
		measuredContrast: Pi(K(e, n.gamut), t)
	};
}
function Yo(e, t, n, r) {
	return Di(t, (t, i) => U(Oi(t, r) * n + Oi(e[i], r) * (1 - n), r));
}
function Xo(e, t, n, r, i) {
	let a = JSON.stringify([
		t,
		n,
		r.side,
		r.backgroundBlend,
		r.colorSourceCurveOffset,
		i
	]), o = qo.get(e) ?? /* @__PURE__ */ new Map(), s = o.get(a);
	if (s) return s;
	let c = W(t, e.output, e.gamut);
	typeof e.output == "object" && (t = Ja(c, e.gamut));
	let l = K(t, e.gamut), u = i ?? (r.side === "dark" || r.side === "auto" && l > .1791), d = Fi(l, n, u), f = H(d + (e.neutral ? 1 : H(r.backgroundBlend + r.colorSourceCurveOffset * (n - 1) / 11)) * (+!u - d)), p = _a(e.anchors, f), m = u ? Math.min(K(p, e.gamut) - l, -1e-4) : Math.max(K(p, e.gamut) - l, 1e-4), h = H((d - l) / m), g = Di(p, (e, n) => h * e + (1 - h) * t[n]), _ = _a(e.anchors, d), v = h;
	if (e.neutral) {
		let n = 0, r = 1;
		for (let i = 0; i < 30; i += 1) {
			let i = (n + r) / 2, a = K(Yo(t, p, i, e.gamut), e.gamut);
			(u ? a > d : a < d) ? n = i : r = i;
		}
		v = (n + r) / 2;
	}
	let y = Yo(t, p, v, e.gamut), b = (t) => {
		if (typeof e.output != "object") return Jo(t, l, e);
		let r = Qa(t, c, n, e.output, u, e.scale.name);
		return {
			...r,
			hex: Mi(r.linear, e.gamut)
		};
	}, ee, te, x, S = () => te ??= b(_), C = {
		targetContrast: n,
		targetLuminance: d,
		sourceLuminance: f,
		alpha: h,
		isDark: u,
		sourceLinear: p,
		get dynamic() {
			return ee ??= b(g);
		},
		get opaque() {
			return S();
		},
		get transparent() {
			if (x) return x;
			let t = typeof e.output == "object" ? $a(p, c, n, e.output, u, e.scale.name) : void 0;
			return x = {
				...Jo(y, l, e),
				sourceHex: Mi(p, e.gamut),
				sourceCss: W(p, e.output, e.gamut),
				alpha: v,
				...t && {
					css: t.css,
					linear: t.linear,
					measuredContrast: t.measuredContrast,
					sourceCss: t.sourceCss,
					sourceHex: Mi(t.sourceLinear, e.gamut),
					alpha: t.alpha
				}
			};
		},
		get chromaDeltaE() {
			return Zi(Ii(ki(C.dynamic.linear, e.gamut, "srgb")), Ii(ki(S().linear, e.gamut, "srgb")));
		}
	};
	return o.set(a, C), o.size > 128 && o.delete(o.keys().next().value), qo.set(e, o), C;
}
//#endregion
//#region src/features/color-system/surfaceGeneration.ts
function Zo(e) {
	return ma(e.scales.find((t) => t.id === e.backgroundScaleId) ?? e.scales[0], e.backgroundLightness, e.settings.colorOutput).linear;
}
//#endregion
//#region src/features/color-system/colorScaleType.ts
var Qo = class extends Error {
	constructor(e) {
		super(e), this.name = "ColorScaleOutputError";
	}
};
function $o(e) {
	return "kind" in e && e.kind === "opacity" && "opacity" in e;
}
function es(e) {
	return e.colorScaleType === "transparent" && e.syncDefaultStopsWithOpacity === !0;
}
function ts(e, t, n) {
	return t.side === "dark" || t.side === "auto" && K(e, n.gamut) > .1791;
}
function ns(e, t, n, r) {
	if (e.issues.length) throw new Qo(e.issues.join(" "));
	let i = ts(t, n, { gamut: r }) ? [
		0,
		0,
		0
	] : [
		1,
		1,
		1
	];
	return e.levels.map((e) => ({
		id: e.id,
		scaleIndex: e.scaleIndex,
		kind: "opacity",
		opacity: e.value,
		value: Pi(K(Yo(t, i, e.value, r), r), K(t, r))
	}));
}
function rs(e, t, n, r) {
	if (!$o(n)) {
		let i = Xo(e, t, n.value, r);
		return r.colorScaleType === "opaque" ? i.opaque : r.colorScaleType === "transparent" ? i.transparent : i.dynamic;
	}
	let i = W(t, e.output, e.gamut), a = Ja(i, e.gamut), o = K(a, e.gamut), s = ts(a, r, e), c = K(Yo(a, s ? [
		0,
		0,
		0
	] : [
		1,
		1,
		1
	], n.opacity, e.gamut), e.gamut), l = Pi(c, o), u = e.neutral ? 1 : Math.min(1, Math.max(0, r.backgroundBlend + r.colorSourceCurveOffset * (l - 1) / 11)), d = new L(W(_a(e.anchors, Math.min(1, Math.max(0, c + u * (+!s - c)))), e.output, e.gamut));
	d.alpha = n.opacity;
	let f = typeof e.output == "object" ? e.output : {
		..._i,
		authoringGamut: e.gamut
	}, p = Math.round(n.opacity * 255) / 255 === n.opacity, m = V(d, f.outputFormat === "hex" && !p ? {
		...f,
		outputFormat: "rgb"
	} : f), h = Ya(m, i, e.gamut);
	return {
		css: m,
		linear: h,
		hex: Mi(h, e.gamut),
		measuredContrast: Pi(K(h, e.gamut), o)
	};
}
//#endregion
//#region src/features/tokens/colorOutput.ts
function is(e, t, n) {
	return V(e, n && t.outputFormat === "hex" && Math.round(Number(e.alpha) * 255) / 255 !== Number(e.alpha) ? {
		...t,
		outputFormat: "rgb"
	} : t);
}
function as(e, t) {
	if (!e.valueOverridden) return e;
	let n = t.settings.colorOutput, r = new L(e.value), i = t.scales.find((t) => t.id === e.source.scaleId), a = (i?.customContrasts?.steps ?? t.contrasts).find((t) => t.id === e.source.contrastId), o = is(r, n, !!a && $o(a));
	if (i && a && !$o(a)) {
		let r = W(Zo(t), n), i = Xa(o, r, R(n));
		if (i < a.value) throw new Wa({
			requestedContrast: a.value,
			achievableContrast: i,
			gamut: R(n),
			background: r,
			source: `Manual color ${e.uuid}`,
			observedColor: o,
			tokenId: e.uuid
		});
	}
	return {
		...e,
		value: o
	};
}
//#endregion
//#region src/features/tokens/colorResolution.ts
function os(e) {
	return JSON.stringify(Object.entries(e).sort(([e], [t]) => e.localeCompare(t)));
}
function ss(e) {
	let t = JSON.parse(e);
	if (!Array.isArray(t)) throw Error("This token has an invalid mode assignment.");
	let n = [];
	for (let e of t) {
		if (!Array.isArray(e) || e.length !== 2 || typeof e[0] != "string" || typeof e[1] != "string") throw Error("This token has an invalid mode assignment.");
		n.push([e[0], e[1]]);
	}
	return n;
}
function cs(e, t, n, r) {
	let i = t[e.uuid];
	if (!i) return r ? as(e, r) : e;
	let a = i.name, o = i.values[n], s = {
		...e,
		name: a === void 0 ? e.name : {
			colorName: a,
			contrastValue: ""
		},
		value: o ? String(o.value) : e.value,
		nameOverridden: e.nameOverridden || a !== void 0,
		valueOverridden: e.valueOverridden || o !== void 0,
		stale: e.stale || !!(o && o.baseline !== e.generated.value) || !!(i.nameBaseline && i.nameBaseline !== Lo(e.generated.name))
	};
	return r ? as(s, r) : s;
}
//#endregion
//#region src/features/scales/swatchIndices.ts
var ls = (e) => typeof e == "number" && Number.isFinite(e) && e > 0;
function us(e, t) {
	return e.scaleIndex ?? (t + 1) * 100;
}
//#endregion
//#region src/features/opacity/model.ts
var ds = (e) => typeof e == "number" && Number.isFinite(e) && e >= 0 && e <= 1, fs = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, ps = (e) => !!e && typeof e == "object" && !Array.isArray(e);
function ms(e) {
	if (!ps(e) || e.schemaVersion !== 1 || !ds(e.polarityCompensation) || !Array.isArray(e.levels)) return !1;
	let t = /* @__PURE__ */ new Set();
	return e.levels.every((e) => {
		if (!ps(e) || typeof e.id != "string" || !fs.test(e.id) || !ds(e.value) || e.scaleIndex !== void 0 && !ls(e.scaleIndex) || !ps(e.rows)) return !1;
		for (let n of [e.id, ...Object.values(e.rows)]) {
			if (typeof n != "string" || !fs.test(n) || t.has(n)) return !1;
			t.add(n);
		}
		return !0;
	});
}
//#endregion
//#region src/features/opacity/polarity.ts
function hs(e, t, n = 1) {
	if (![
		e,
		t,
		n
	].every(ds)) throw Error("Opacity, compensation and polarity weight must be between 0 and 1.");
	if (e === 0 || e === 1 || t === 0 || n === 0) return e;
	let r = Oi(Fi(0, Fa(Pi(U(e), 0), t, "light"), !1));
	return Math.min(1, Math.max(0, e + n * (r - e)));
}
//#endregion
//#region src/features/opacity/generation.ts
var gs = ["color.backgroundLightness", "color.backgroundScaleId"];
function _s(t) {
	let n = e(t.modeSets), r = new Set(gs.flatMap((e) => n[e] ? [n[e]] : []));
	for (let e of t.opacity?.levels ?? []) for (let n of Object.keys(t.browserTokenEdits?.[e.id]?.values ?? {})) for (let [e] of ss(n)) r.add(e);
	return t.modeSets.filter((e) => r.has(e.id) && e.modes.length);
}
function vs(e, t) {
	let n = _s(e);
	return os(Mo(n, ys(n, t)));
}
function ys(e, t) {
	return e.map((e) => t.find((t) => e.modes.some((e) => e.id === t.id)) ?? jo(e));
}
function bs(e, t, n) {
	let r = {
		levels: [],
		issues: [],
		weight: 0,
		modeKey: ""
	};
	if (!ms(e.opacity)) return r.issues.push("Opacity data is unavailable. Restore or repair the opacity foundation."), r;
	try {
		r.modeKey = vs(e, t), r.weight = Ia(za(Ao(e.colorSystem, t, n, {
			modeSets: e.modeSets,
			applyMultiplier: !1,
			applyPolarity: !1
		})), "light");
		let i = e.modeSets.filter((e) => e.modes.length), a = Mo(i, ys(i, t));
		r.levels = e.opacity.levels.map((t, n) => {
			let i = Math.round(hs(t.value, e.opacity.polarityCompensation, r.weight) * 100) / 100, o = e.browserTokenEdits?.[t.id]?.values ?? {}, s = Object.entries(o).filter(([e]) => ss(e).every(([e, t]) => a[e] === t)).sort(([e], [t]) => ss(t).length - ss(e).length), c = s[0]?.[1];
			return c && !ds(c.value) && r.issues.push(`Opacity ${us(t, n)} has an invalid manual value.`), {
				id: t.id,
				uuid: t.rows[r.modeKey],
				scaleIndex: us(t, n),
				name: `opacity-${us(t, n)}`,
				generatedValue: i,
				value: c && ds(c.value) ? Math.round(c.value * 100) / 100 : i,
				overridden: !!c,
				stale: !!c && (ds(c.baseline) ? Math.round(c.baseline * 100) / 100 : c.baseline) !== i,
				...s[0] && { overrideKey: s[0][0] }
			};
		});
	} catch (e) {
		r.issues.push(`Opacity output is unavailable: ${e instanceof Error ? e.message : String(e)}`);
	}
	return r;
}
//#endregion
//#region src/features/color-system/colorScaleResolution.ts
function xs(e) {
	if (e.colorOutputIssues?.length) throw new Qo(e.colorOutputIssues.join(" "));
}
function Ss(e, t, n, r = {}) {
	let i = Ao(e, t, n, r);
	if (!es(i.settings)) return i;
	let a = bs({
		colorSystem: e,
		opacity: r.opacity,
		browserTokenEdits: r.browserTokenEdits,
		modeSets: r.modeSets ?? []
	}, t, n);
	return a.issues.length ? {
		...i,
		contrasts: [],
		colorOutputIssues: a.issues
	} : {
		...i,
		contrasts: ns(a, Zo(i), i.settings, G(i.settings.colorOutput))
	};
}
//#endregion
//#region src/features/taxonomy/formatting.ts
var Cs = {
	formatValue: (e) => typeof e == "number" ? String(e).replace(/^-/, "minus-").replace("+", "plus-").replace(".", "-") : e.trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, "-").replace(/^-+|-+$/g, ""),
	separator: "-"
};
function ws(e) {
	let t = Cs.formatValue(e);
	if (!t) throw Error("A foundation name must contain letters or numbers to generate a token name.");
	return t;
}
//#endregion
//#region src/features/color-system/customContrastConfig.ts
function Ts(e) {
	return e.customContrasts ?? e.disabledCustomContrasts;
}
function Es(e) {
	return typeof e == "object" && !!e;
}
function Ds(e) {
	if (!Es(e) || typeof e.baseContrastId != "string" || typeof e.namingRuleId != "string" || !Array.isArray(e.steps) || e.steps.length === 0) return !1;
	let t = /* @__PURE__ */ new Set();
	return e.steps.every((e) => !Es(e) || typeof e.id != "string" || !e.id || t.has(e.id) || typeof e.value != "number" || e.scaleIndex !== void 0 && !ls(e.scaleIndex) || !Number.isFinite(e.value) || e.value < 1 || e.value > 21 || e.oppositeValue !== void 0 && (typeof e.oppositeValue != "number" || !Number.isFinite(e.oppositeValue) || e.oppositeValue < 1 || e.oppositeValue > 21) ? !1 : (t.add(e.id), !0)) && t.has(e.baseContrastId);
}
//#endregion
//#region src/features/scales/stepNames.ts
var Os = [
	50,
	25,
	20,
	10,
	5,
	2,
	1
];
function ks(e) {
	let t = Math.max(1, Math.round(e));
	return Os.find((e) => t * e < 100) ?? 1;
}
//#endregion
//#region src/features/foundations/componentSizes.ts
var As = [
	{
		id: "xs",
		label: "Extra small",
		index: -2
	},
	{
		id: "s",
		label: "Small",
		index: -1
	},
	{
		id: "m",
		label: "Medium",
		index: 0
	},
	{
		id: "l",
		label: "Large",
		index: 1
	},
	{
		id: "xl",
		label: "Extra large",
		index: 2
	}
], js = {
	structure: "b07988e3-0510-4bf5-a531-86ea718b1003",
	size: "b07988e3-0510-4bf5-a531-86ea718b1004"
}, Ms = {
	xs: "b07988e3-0510-4bf5-a531-86ea718b1500",
	s: "b07988e3-0510-4bf5-a531-86ea718b1501",
	m: "b07988e3-0510-4bf5-a531-86ea718b1502",
	l: "b07988e3-0510-4bf5-a531-86ea718b1503",
	xl: "b07988e3-0510-4bf5-a531-86ea718b1504"
};
[{
	id: js.structure,
	key: "structure",
	name: "Structure"
}, {
	id: js.size,
	key: "size",
	name: "Size"
}].map((e) => ({
	...e,
	description: "",
	valueType: "string",
	cardinality: "one",
	scopes: ["structures"],
	required: !1,
	includeInProjections: !0
})), As.map((e) => ({
	id: Ms[e.id],
	categoryId: js.size,
	value: e.label.toLowerCase(),
	description: ""
}));
//#endregion
//#region src/features/logic/applicability.ts
var Ns = [
	{
		id: "color",
		label: "Color",
		icon: "color"
	},
	{
		id: "opacity",
		label: "Opacity",
		icon: "opacity"
	},
	{
		id: "spacing",
		label: "Spacing",
		icon: "spacing"
	},
	{
		id: "size",
		label: "Sizing",
		icon: "size"
	},
	{
		id: "font-size",
		label: "Font size",
		icon: "typography"
	},
	{
		id: "line-height",
		label: "Line height",
		icon: "typography"
	},
	{
		id: "line-height-multiplier",
		label: "Line height multiplier",
		icon: "typography"
	},
	{
		id: "workflow-icon-size",
		label: "Workflow icon size",
		icon: "typography"
	},
	{
		id: "radius",
		label: "Radius",
		icon: "radius"
	},
	{
		id: "elevation",
		label: "Elevation",
		icon: "elevation"
	}
];
function Ps(e) {
	return Ns.filter(({ id: t }) => e === "scale-naming" ? t === "color" : e === "conditional" ? t === "color" || t === "opacity" : e === "rounding" ? t !== "color" && t !== "elevation" : t !== "color" && t !== "opacity").map(({ id: e }) => e);
}
function Fs(e, t) {
	return !e || typeof e != "object" || !("kind" in e) ? !1 : e.kind === "all" ? Object.keys(e).length === 1 : e.kind === "specific" && "types" in e && Array.isArray(e.types) && e.types.length > 0 && new Set(e.types).size === e.types.length && e.types.every((e) => Ps(t).includes(e)) && Object.keys(e).every((e) => e === "kind" || e === "types");
}
//#endregion
//#region src/features/logic/model.ts
var Is = [
	{
		id: "lt",
		label: "Less than",
		symbol: "<"
	},
	{
		id: "lte",
		label: "Less than or equal to",
		symbol: "≤"
	},
	{
		id: "gt",
		label: "Greater than",
		symbol: ">"
	},
	{
		id: "gte",
		label: "Greater than or equal to",
		symbol: "≥"
	}
], Ls = [
	1,
	10,
	100,
	1e3
], Rs = "rule-standard-scale-naming";
function zs(e) {
	return typeof e == "number" && Number.isFinite(e);
}
function Bs(e) {
	if (!e || typeof e != "object") return !1;
	let t = e;
	return t.kind === "value" ? Object.keys(t).every((e) => e === "kind" || e === "value") && zs(t.value) && t.value > 0 : t.kind === "parameter" && Object.keys(t).every((e) => [
		"kind",
		"scaleTypeId",
		"parameterId"
	].includes(e)) && typeof t.scaleTypeId == "string" && !!t.scaleTypeId.trim() && typeof t.parameterId == "string" && !!t.parameterId.trim();
}
function Vs(e) {
	return e.movement === "ratio" ? Bs(e.ratio) && (e.roundingRuleId === void 0 || typeof e.roundingRuleId == "string" && !!e.roundingRuleId.trim()) : (e.movement === "available-token" || e.movement === "scale-index") && e.ratio === void 0 && e.roundingRuleId === void 0;
}
function Hs(e) {
	return !!e && typeof e == "object" && zs(e.factor) && e.factor >= 0;
}
function Us(e) {
	if (!e || typeof e != "object") return !1;
	let t = e;
	return typeof t.id == "string" && Is.some((e) => e.id === t.comparator) && zs(t.threshold) && Hs(t.outcome);
}
function Ws(e) {
	if (!e || typeof e != "object") return !1;
	let t = e;
	return !(typeof t.id == "string" && t.id.trim() && typeof t.name == "string" && typeof t.description == "string" && (t.locked === void 0 || typeof t.locked == "boolean")) || t.type && t.applicability !== void 0 && !Fs(t.applicability, t.type) ? !1 : t.type === "generator" ? Vs(t) && Object.keys(t).every((e) => [
		"id",
		"name",
		"description",
		"locked",
		"type",
		"movement",
		"mappings",
		"defaultTermId",
		"applicability",
		"ratio",
		"roundingRuleId"
	].includes(e)) && Array.isArray(t.mappings) && t.mappings.length > 0 && new Set(t.mappings.map((e) => e?.termId)).size === t.mappings.length && t.mappings.every((e) => e && typeof e.termId == "string" && !!e.termId.trim() && Number.isSafeInteger(e.offset) && Object.keys(e).every((e) => e === "termId" || e === "offset")) && t.mappings.some((e) => e.termId === t.defaultTermId && e.offset === 0) && t.applicability !== void 0 : t.type === "conditional" ? Gs(t) : t.type === "scale-naming" ? Number.isFinite(t.baseLabel) && t.baseLabel > 0 && Number.isFinite(t.aboveIncrement) && t.aboveIncrement > 0 && !!t.below && (t.below.kind === "automatic" || t.below.kind === "fixed" && Number.isFinite(t.below.increment) && t.below.increment > 0) : t.type === "tshirt-sizing" ? Vs(t) && Array.isArray(t.mappings) && t.mappings.length === As.length && Object.keys(t).every((e) => [
		"id",
		"name",
		"description",
		"locked",
		"type",
		"movement",
		"mappings",
		"applicability",
		"defaultTermId",
		"ratio",
		"roundingRuleId"
	].includes(e)) && As.every((e) => {
		let n = t.mappings.filter((t) => t && t.termId === Ms[e.id]);
		return n.length === 1 && Number.isSafeInteger(n[0].offset) && (e.id !== "m" || n[0].offset === 0) && Object.keys(n[0]).every((e) => e === "termId" || e === "offset");
	}) : t.type === "rounding" && Ls.includes(t.depth) && Hs(t.defaultOutcome) && Array.isArray(t.conditions) && t.conditions.every(Us);
}
function Gs(e) {
	if (!Array.isArray(e.branches) || !Ks(e.otherwise)) return !1;
	let t = /* @__PURE__ */ new Set(), n = (e) => typeof e != "string" || !e.trim() || t.has(e) ? !1 : (t.add(e), !0), r = [e.when];
	for (let t of e.branches) {
		if (!t || !n(t.id) || !Ks(t.then)) return !1;
		r.push(t.when);
	}
	let i = [...r];
	if (r.some((e) => !e || typeof e != "object" || !("kind" in e) || e.kind !== "group")) return !1;
	for (; i.length;) {
		let e = i.pop();
		if (!e || typeof e != "object" || !("id" in e) || !n(e.id) || !("kind" in e)) return !1;
		if (e.kind === "group") {
			if (!("operator" in e) || !["and", "or"].includes(String(e.operator)) || !("children" in e) || !Array.isArray(e.children)) return !1;
			i.push(...e.children);
		} else if (e.kind === "condition") {
			if (!("source" in e) || !["taxonomy", "mode"].includes(String(e.source)) || !("sourceId" in e) || typeof e.sourceId != "string" || !e.sourceId.trim() || !("valueId" in e) || typeof e.valueId != "string" || !e.valueId.trim() || !("matcher" in e) || !["is", "is-not"].includes(String(e.matcher))) return !1;
		} else return !1;
	}
	return !0;
}
function Ks(e) {
	return !!e && typeof e == "object" && "offset" in e && Number.isSafeInteger(e.offset);
}
//#endregion
//#region src/features/logic/scaleNaming.ts
var qs = {
	id: Rs,
	name: "Standard scale naming",
	description: "Base 100, clean smaller indices, and increments of 100 above the base.",
	type: "scale-naming",
	locked: !0,
	baseLabel: 100,
	aboveIncrement: 100,
	below: { kind: "automatic" }
};
function Js(e, t, n) {
	if (!Ws(e) || !Number.isSafeInteger(t) || t < 1 || !Number.isSafeInteger(n) || n < 0 || n >= t) throw Error("Choose a valid naming rule and an existing base swatch.");
	let r = e.below.kind === "fixed" ? e.below.increment : ks(n) * e.baseLabel / 100, i = Array.from({ length: t }, (t, i) => {
		let a = i - n;
		return Number((e.baseLabel + a * (a < 0 ? r : e.aboveIncrement)).toPrecision(15));
	});
	if (i.some((e, t) => !Number.isFinite(e) || e <= 0 || t > 0 && e <= i[t - 1])) throw Error("This naming rule cannot give every swatch a positive, distinct, increasing index. Reduce the below-base increment or choose another base.");
	return i;
}
function Ys(e, t) {
	let n = e.find((e) => e.id === t);
	if (!n || n.type !== "scale-naming") throw Error(`Scale naming rule ${t} is unavailable.`);
	return n;
}
//#endregion
//#region src/features/color-system/contrastSteps.ts
function Xs(e, t, n = [qs], r = []) {
	if (t?.customContrasts) {
		let r = t.customContrasts, i = r.steps[e]?.scaleIndex;
		if (i !== void 0) return i;
		let a = Js(Ys(n, r.namingRuleId), r.steps.length, r.steps.findIndex((e) => e.id === r.baseContrastId));
		if (a[e] === void 0) throw Error("The requested contrast step is unavailable.");
		return a[e];
	}
	return us(r[e] ?? {}, e);
}
//#endregion
//#region src/features/color-system/data-vis/identity.ts
var Zs = (e, t) => Go(`data-vis-member:v1:${JSON.stringify([e, t])}`);
//#endregion
//#region src/features/tokens/colorGeneration.ts
function Qs(e, t, n, r, i, a) {
	return $s(e, t, n, r, i, a).map((e) => {
		if (e.status === "blocked") throw e.error;
		return e.token;
	});
}
function $s(e, t, n, r, i, a, o) {
	if (!Ha(e)) return [];
	if (o) return o([
		e,
		t,
		n,
		r,
		i,
		a
	], () => $s(e, t, n, r, i, a));
	let s = va(e, i), c = ws(e.name);
	return (e.customContrasts?.steps ?? t).map((i, o) => {
		let l = {
			uuid: Go(Fo(e.id, i.id)),
			name: {
				colorName: c,
				contrastValue: String(Xs(o, e, a, t))
			},
			source: {
				tokenType: "color",
				scaleId: e.id,
				contrastId: i.id
			}
		};
		try {
			return {
				status: "ready",
				token: {
					...l,
					value: rs(s, n, i, r).css
				}
			};
		} catch (e) {
			if (!(e instanceof Wa)) throw e;
			return {
				status: "blocked",
				token: l,
				error: e
			};
		}
	});
}
//#endregion
//#region src/features/color-system/cssLibrary.ts
function ec(e) {
	return ws(e);
}
//#endregion
//#region src/features/tokens/paletteGeneration.ts
function tc(e, t) {
	return e.map((e) => ({
		uuid: Go(Fo(Io, e.id)),
		name: {
			colorName: ec(e.name),
			contrastValue: ""
		},
		value: ta(e, t),
		source: {
			tokenType: "color",
			scaleId: Io,
			contrastId: e.id
		}
	}));
}
//#endregion
//#region src/features/color-system/data-vis/continuous.ts
function nc(e, t, n = "srgb") {
	if (t.length < 2 || t[0].position !== 0 || t.at(-1)?.position !== 1 || t.some((e, n) => !Number.isFinite(e.position) || e.position < 0 || e.position > 1 || n > 0 && e.position <= t[n - 1].position) || e.kind === "diverging" && !t.some((e) => e.position === .5)) throw Error("A continuous scale requires ordered endpoints and a diverging center at 50%.");
	let r = t.map((e) => {
		let t = q(e.value), n = to(t);
		return {
			...e,
			lab: n,
			lch: Ri(n),
			alpha: t.alpha
		};
	}), i = t.filter((e) => e.targetReached === !1).map((e) => `Point ${Math.round(e.position * 100)}% cannot reach ${e.targetContrast}:1; its rendered contrast is ${e.actualContrast.toFixed(2)}:1.`);
	for (let e of t) q(e.value).inGamut(z(G(n))) || i.push(`Point ${Math.round(e.position * 100)}% uses a linked color outside the interpolation output gamut. Interior colors are gamut-mapped; the exact linked endpoint is preserved.`);
	for (let e = 1; e < r.length; e++) Zi(r[e - 1].lab, r[e].lab) < 1e-6 && Math.abs(r[e - 1].alpha - r[e].alpha) < 1e-6 && i.push(`Points ${Math.round(t[e - 1].position * 100)}% and ${Math.round(t[e].position * 100)}% have collapsed colors.`);
	let a = e.kind === "sequential" ? [r] : [r.filter((e) => e.position <= .5), r.filter((e) => e.position >= .5)];
	for (let e of a) {
		let t = Math.sign(e.at(-1).lab[0] - e[0].lab[0]);
		e.some((n, r) => r > 0 && (t === 0 ? Math.abs(n.lab[0] - e[r - 1].lab[0]) > 1e-5 : (n.lab[0] - e[r - 1].lab[0]) * t < -1e-5)) && i.push("Lightness changes direction within an arm. This recipe is not a monotonic lightness progression.");
	}
	return {
		...e,
		points: t,
		diagnostics: i,
		evaluate(t) {
			if (!Number.isFinite(t)) throw Error("A data vis function requires a finite normalized value.");
			let i = H(t), a = r.find((e) => e.position === i);
			if (a) return a.value;
			let o = r.findIndex((e) => e.position > i), s = r[o - 1], c = r[o], l = (i - s.position) / (c.position - s.position), u = s.alpha * (1 - l) + c.alpha * l, d = e.kind === "sequential" ? s.lch : s.lab, f = e.kind === "sequential" ? c.lch : c.lab, p = (e) => u <= 0 ? 0 : (d[e] * s.alpha * (1 - l) + f[e] * c.alpha * l) / u;
			if (e.kind === "sequential") {
				let e = s.lch[1] < 4e-6 ? c.lch[2] : s.lch[2], t = c.lch[1] < 4e-6 ? e : c.lch[2];
				return io([
					p(0),
					p(1),
					Xi(e, t, l)
				], u, n);
			}
			return ro([
				p(0),
				p(1),
				p(2)
			], u, n);
		}
	};
}
//#endregion
//#region src/features/color-system/data-vis/packetValidation.ts
var Z = (e) => typeof e == "string" && e.trim().length > 0, rc = (e) => typeof e == "number" && Number.isFinite(e), ic = (e, t, n) => rc(e) && e >= t && e <= n, Q = (e, t) => e === void 0 || t(e), $ = (e) => new Set(e).size === e.length, ac = (e) => Array.isArray(e) && e.length > 0 && e.every((e) => J(e) && Z(e.id) && mo(e)) && $(e.map((e) => e.id)), oc = (e) => J(e) && yo({ color: Object.fromEntries(Object.entries(e).filter(([e]) => e !== "paletteColorId")) }) && Q(e.paletteColorId, Z);
function sc(e) {
	if (J(e) && e.schemaVersion === 1) {
		if (!J(e.color) || e.color.schemaVersion !== 3 || !vo(e.color.dataVisScales) || e.color.dataVisScales.some((e) => e.staticColors !== void 0 || e.kind !== "categorical" && e.points.some((e) => e.source.kind === "primitive-token"))) throw Error("Use an unmodified version-one packet for migration.");
		let t = cc({
			...e,
			schemaVersion: 2,
			color: {
				...e.color,
				schemaVersion: 4
			}
		});
		if (t.modeSets.some((e) => e.modes.some((e) => Object.values(e.foundations.color?.dataVisSources ?? {}).some((e) => Object.values(e).some((e) => e.tokenId !== void 0))))) throw Error("Version-one packets cannot contain primitive-token patches.");
		return t;
	}
	return J(e) && e.schemaVersion === 2 ? cc(e) : (lc(e), e);
}
function cc(e) {
	if (!J(e.color) || e.color.schemaVersion !== 4 || !J(e.color.settings)) throw Error("Use an unmodified version-two packet with Color version four.");
	let { outputGamut: t, ...n } = e.color.settings;
	if (typeof t != "string" || ![
		"srgb",
		"display-p3",
		"oklch"
	].includes(t) || "colorOutput" in n) throw Error("The legacy packet has invalid Color settings.");
	let r = (e) => so(e) && e.chroma <= 100;
	if (!Array.isArray(e.color.palette) || !e.color.palette.every(r) || !Array.isArray(e.color.scales) || !e.color.scales.every((e) => J(e) && Array.isArray(e.stops) && e.stops.every(r)) || !vo(e.color.dataVisScales) || e.color.dataVisScales.some((e) => e.kind !== "categorical" && e.points.some((e) => e.source.kind === "key-color" && !r(e.source.color)))) throw Error("The legacy packet has invalid version-four color geometry.");
	let i = {
		...e,
		schemaVersion: 3,
		color: {
			...e.color,
			schemaVersion: 5,
			settings: {
				...n,
				colorOutput: bi(t)
			}
		}
	};
	lc(i);
	for (let e of i.modeSets) for (let t of e.modes) {
		let e = t.foundations.color;
		if (Object.values(e?.scaleStops ?? {}).some((e) => Object.values(e).some((e) => e.chroma !== void 0 && e.chroma > 100)) || Object.values(e?.dataVisSources ?? {}).some((e) => Object.values(e).some((e) => e.color?.chroma !== void 0 && e.color.chroma > 100))) throw Error("The legacy packet has invalid version-four mode color geometry.");
	}
	return i;
}
function lc(e) {
	if (!J(e) || e.schemaVersion !== 3 || !J(e.color) || e.color.schemaVersion !== 5 || !vo(e.color.dataVisScales)) throw Error("Use a valid version-three data vis packet with Color version five recipes.");
	let t = e, n = t.color;
	if (!n) throw Error("The packet has no Color foundation.");
	if (!Q(t.opacity, ms)) throw Error("The packet has invalid Opacity source data.");
	if (!Q(n.settings?.colorScaleType, (e) => e === "dynamic-blend" || e === "opaque" || e === "transparent") || !Q(n.settings?.syncDefaultStopsWithOpacity, (e) => typeof e == "boolean")) throw Error("The packet has invalid Color scale type settings.");
	if (!Z(n.backgroundScaleId) || !ic(n.backgroundLightness, 0, 1) || !Array.isArray(n.palette) || !n.palette.every((e) => J(e) && Z(e.id) && Z(e.name) && so(e)) || !$(n.palette.map((e) => e.id))) throw Error("The packet has invalid background or Palette geometry.");
	if (!Array.isArray(n.scales) || !n.scales.length || !n.scales.every((e) => J(e) && Z(e.id) && Z(e.name) && Ua(e) && Array.isArray(e.stops) && e.stops.length > 0 && e.stops.every((e) => J(e) && Z(e.id) && so(e) && Q(e.paletteColorId, Z)) && $(e.stops.map((e) => e.id)) && Q(e.customContrasts, (e) => J(e) && ac(e.steps) && Z(e.namingRuleId) && Z(e.baseContrastId) && Array.isArray(e.steps) && e.steps.some((t) => t.id === e.baseContrastId)) && Q(e.disabledCustomContrasts, Ds) && !(e.customContrasts && e.disabledCustomContrasts)) || !$(n.scales.map((e) => e.id))) throw Error("The packet has invalid UI scale geometry or swatch identities.");
	if (!ac(n.contrasts)) throw Error("The packet has invalid UI contrast targets.");
	let r = n.settings;
	if (!J(r) || ![
		"auto",
		"light",
		"dark"
	].includes(r.side) || !yi(r.colorOutput) || "outputGamut" in r || !rc(r.backgroundBlend) || !rc(r.colorSourceCurveOffset) || !rc(r.guardThreshold) || !Q(r.contrastReference, (e) => e === "light" || e === "dark") || !Q(r.contrastMultiplier, (e) => ic(e, 0, 3)) || !Q(r.polarityCompensation, (e) => ic(e, 0, 1))) throw Error("The packet has invalid generation settings.");
	if (!Array.isArray(t.namingRules) || !t.namingRules.every((e) => Ws(e) && e.type === "scale-naming") || !$(t.namingRules.map((e) => e.id))) throw Error("The packet has an invalid scale-naming library.");
	let i = new Set(n.palette.map((e) => e.id)), a = (e) => e === void 0 || i.has(e), o = new Map(n.scales.map((e) => [e.id, e]));
	if (!o.has(n.backgroundScaleId) || n.scales.some((e) => e.stops.some((e) => !a(e.paletteColorId)))) throw Error("The packet is missing its background or linked Palette source.");
	if (!Array.isArray(t.modeSets) || !t.modeSets.every(J) || !$(t.modeSets.map((e) => e.id)) || !$(t.modeSets.map((e) => e.key))) throw Error("The packet has duplicate or invalid mode sets.");
	let s = /* @__PURE__ */ new Set(), c = /* @__PURE__ */ new Set();
	for (let e of t.modeSets) {
		if (!Z(e.id) || !Z(e.key) || !Array.isArray(e.modes) || !e.modes.length || !e.modes.every(J) || !e.modes.some((t) => t.id === e.defaultModeId) || !$(e.modes.map((e) => e.key)) || !Q(e.authoringCapabilities, Array.isArray)) throw Error("Each packet mode set needs unique modes and an available default.");
		for (let t of e.authoringCapabilities ?? []) {
			if (![
				"color.scales",
				"color.contrastMultiplier",
				"color.backgroundScaleId",
				"color.backgroundLightness",
				"color.scaleAdjustment"
			].includes(t) || s.has(t)) throw Error("Packet color capabilities require one valid owner each.");
			s.add(t);
		}
		for (let t of e.modes) {
			if (!J(t) || !Z(t.id) || !Z(t.key) || c.has(t.id) || !J(t.foundations)) throw Error("The packet has invalid or duplicate mode identities.");
			c.add(t.id);
			let e = t.foundations.color;
			if (e !== void 0) {
				if (!J(e) || !Q(e.backgroundLightness, (e) => ic(e, 0, 1)) || !Q(e.contrastMultiplier, (e) => ic(e, 0, 3)) || !Q(e.backgroundScaleId, (e) => Z(e) && o.has(e)) || !Q(e.dataVisSources, bo) || !Q(e.dataVisContrasts, xo) || !Q(e.scaleAdjustment, Eo)) throw Error(`Mode ${t.key} has invalid color parameters.`);
				if (e.scaleStops !== void 0) {
					if (!J(e.scaleStops)) throw Error(`Mode ${t.key} has invalid UI scale patches.`);
					for (let [n, r] of Object.entries(e.scaleStops)) {
						let e = o.get(n);
						if (!e || !J(r) || Object.entries(r).some(([t, n]) => !e.stops.some((e) => e.id === t) || !oc(n) || !a(n.paletteColorId))) throw Error(`Mode ${t.key} references invalid UI stops or Palette colors.`);
					}
				}
				if (e.scaleContrasts !== void 0) {
					if (!J(e.scaleContrasts)) throw Error(`Mode ${t.key} has invalid UI contrast patches.`);
					for (let [n, r] of Object.entries(e.scaleContrasts)) {
						let e = o.get(n), i = e && Ts(e);
						if (!i || !J(r) || Object.entries(r).some(([e, t]) => !i.steps.some((t) => t.id === e) || !ic(t, 1, 21))) throw Error(`Mode ${t.key} references invalid custom UI contrasts.`);
					}
				}
			}
		}
	}
	if (!J(t.tokenOverrides) || !Object.values(t.tokenOverrides).every((e) => J(e) && Q(e.value, Z) && Q(e.name, J))) throw Error("The packet has invalid legacy UI overrides.");
	if (!J(t.browserTokenEdits) || !Object.values(t.browserTokenEdits).every((e) => J(e) && J(e.values) && Object.values(e.values).every((e) => J(e) && Z(e.value) && Z(e.baseline)))) throw Error("The packet has invalid color-token edits.");
}
//#endregion
//#region src/features/color-system/data-vis/patches.ts
function uc(t) {
	let n = e([...t]), r = [];
	for (let e of t) for (let t of e.modes) Object.values(t.foundations.color?.dataVisContrasts ?? {}).some((e) => Object.keys(e).length) && (t.id === e.defaultModeId && r.push(`${t.name}: clear its data vis contrast overrides before making it the default mode.`), n["color.contrastMultiplier"] !== e.id && r.push(`${t.name}: clear its data vis contrast overrides before removing their contrast owner.`));
	return r;
}
//#endregion
//#region src/features/color-system/data-vis/primitiveColors.ts
function dc(e) {
	return [
		...e.palette.map((e) => ({
			id: Go(Fo(Io, e.id)),
			origin: {
				kind: "palette",
				paletteColorId: e.id
			},
			hidden: !1
		})),
		...e.scales.flatMap((t) => (t.customContrasts?.steps ?? e.contrasts).map((e) => ({
			id: Go(Fo(t.id, e.id)),
			origin: {
				kind: "ui-swatch",
				scaleId: t.id,
				contrastId: e.id
			},
			hidden: !Ha(t)
		}))),
		...e.dataVisScales.flatMap((e) => e.kind === "categorical" ? e.members.map((t) => ({
			id: Zs(e.id, t.id),
			origin: {
				kind: "categorical",
				scaleId: e.id,
				memberId: t.id
			},
			hidden: !Ha(e)
		})) : [])
	];
}
function fc(e, t, n, r = /* @__PURE__ */ new Map()) {
	let i = new Map([...t.map((e) => [e.uuid, {
		value: e.value,
		generatedValue: e.generated.value,
		manuallyOverridden: e.valueOverridden,
		name: r.get(e.uuid) ?? e.uuid
	}]), ...n.map((e) => [e.id, {
		value: e.value,
		generatedValue: e.generatedValue,
		manuallyOverridden: e.valueOverridden,
		name: r.get(e.id) ?? e.name,
		error: e.validationError
	}])]);
	return dc(e).filter((e) => !e.hidden).map((e) => {
		let t = i.get(e.id), n = t?.error;
		if (!t || typeof t.value != "string" || typeof t.generatedValue != "string") n = "This primitive color has no concrete value.";
		else if (!n) try {
			q(t.value);
		} catch (e) {
			n = e instanceof Error ? e.message : String(e);
		}
		return {
			...e,
			name: t?.name ?? e.id,
			value: typeof t?.value == "string" ? t.value : "",
			generatedValue: typeof t?.generatedValue == "string" ? t.generatedValue : "",
			manuallyOverridden: t?.manuallyOverridden ?? !1,
			...n && { error: n }
		};
	});
}
function pc(e, t) {
	let n = t.find((t) => t.id === e);
	if (!n || n.hidden || n.error) throw Error(n?.error ?? `Primitive color ${e} is unavailable. Choose a replacement color.`);
	return q(n.value), n;
}
//#endregion
//#region src/features/color-system/data-vis/references.ts
function mc(e, t, n) {
	return n.source.kind === "key-color" ? [] : [{
		scaleId: e,
		scaleName: t,
		inputId: n.id,
		inputLabel: `${Math.round(n.position * 100)}% point`,
		source: n.source
	}];
}
function hc(e) {
	return e.dataVisScales.flatMap((e) => {
		let t = (e.staticColors ?? []).flatMap((t) => t.tokenId ? [{
			scaleId: e.id,
			scaleName: e.name,
			inputId: t.id,
			inputLabel: "Static color",
			source: {
				kind: "primitive-token",
				tokenId: t.tokenId
			}
		}] : []);
		return e.kind === "categorical" ? [...t, ...e.members.map((t, n) => ({
			scaleId: e.id,
			scaleName: e.name,
			inputId: t.id,
			inputLabel: `Color ${n + 1}`,
			source: t.source
		}))] : [...t, ...e.points.flatMap((t) => mc(e.id, e.name, t))];
	});
}
function gc(e, t = []) {
	let n = uc(t), r = new Map(dc(e).map((e) => [e.id, e]));
	for (let t of hc(e)) {
		let i = t.source, a = `${t.scaleName}, ${t.inputLabel}`;
		if (i.kind === "primitive-token") {
			let e = r.get(i.tokenId);
			(!e || e.hidden) && n.push(`${a}: primitive color ${i.tokenId} is unavailable or unpublished. Choose a replacement color.`);
			continue;
		}
		let o = e.scales.find((e) => e.id === i.scaleId);
		o ? i.kind === "ui-swatch" && ((o.customContrasts?.steps ?? e.contrasts).some((e) => e.id === i.contrastId) || n.push(`${a}: linked UI swatch ${i.contrastId} is unavailable.`), o.hideFromPublishing && n.push(`${a}: its linked UI swatch is hidden from publishing.`)) : n.push(`${a}: linked UI scale ${i.scaleId} is unavailable.`);
	}
	for (let r of t) for (let t of r.modes) for (let [r, i] of Object.entries(t.foundations.color?.dataVisContrasts ?? {})) {
		let a = e.dataVisScales.find((e) => e.id === r);
		for (let e of Object.keys(i)) (a?.kind === "categorical" ? void 0 : a?.points.find((t) => t.id === e))?.contrast || n.push(`${t.name}: data vis contrast override ${r}/${e} has no owned point.`);
	}
	return n;
}
function _c(e, t) {
	let n = (e) => {
		let t = e.space.id === "rec2020" ? "rec2020" : e.space.id === "p3" ? "p3" : "srgb", [n, r, i] = e.to(t).coords;
		if (![
			n,
			r,
			i
		].every(Number.isFinite)) throw Error("Contrast has unavailable color channels.");
		let a = t === "p3" ? "display-p3" : t;
		return K([
			U(n, a),
			U(r, a),
			U(i, a)
		], a);
	};
	return Pi(n(e), n(t));
}
//#endregion
//#region src/features/color-system/data-vis/resolution.ts
function vc(e) {
	return JSON.stringify([e.scaleId, e.contrastId]);
}
function yc(e, t) {
	let n = new Map(e.scales.filter(Ha).map((e) => [e.id, e]));
	return t.filter((t) => {
		let r = n.get(t.source.scaleId);
		return !!r && (r.customContrasts?.steps ?? e.contrasts).some((e) => e.id === t.source.contrastId);
	}).map((e) => ({
		id: vc(e.source),
		source: {
			kind: "ui-swatch",
			scaleId: e.source.scaleId,
			contrastId: e.source.contrastId
		},
		label: Lo(e.name),
		value: e.value,
		generatedValue: e.generated.value,
		manuallyOverridden: e.valueOverridden
	}));
}
function bc(e) {
	return W(Zo(e), e.settings.colorOutput);
}
function xc(e, t) {
	let n = t.find((t) => t.id === vc(e));
	if (!n) throw Error(`Linked UI swatch ${e.scaleId}/${e.contrastId} is unavailable. Choose a replacement color.`);
	return q(n.value), n;
}
function Sc(e, t, n, r = []) {
	let i = Zo(e), a = bc(e), o = Ba(e), s = G(e.settings.colorOutput);
	return t.staticColors ? t.staticColors.map((t) => {
		if (t.position === void 0) throw Error("A Static continuous color has no position.");
		let n = V(q(po(t)), e.settings.colorOutput), r = t.tokenId ? {
			kind: "primitive-token",
			tokenId: t.tokenId
		} : {
			kind: "static-color",
			value: n
		};
		return {
			id: t.id,
			position: t.position,
			source: r,
			value: n,
			actualContrast: _c(no(n, a, s), q(a)),
			manuallyOverridden: t.overrideValue !== void 0
		};
	}) : t.points.map((c) => {
		if (c.source.kind === "primitive-token") {
			let e = pc(c.source.tokenId, r);
			return {
				id: c.id,
				position: c.position,
				source: c.source,
				value: e.value,
				actualContrast: _c(no(e.value, a, s), q(a)),
				manuallyOverridden: e.manuallyOverridden
			};
		}
		if (c.source.kind === "ui-swatch") {
			let e = xc(c.source, n);
			return {
				id: c.id,
				position: c.position,
				source: c.source,
				value: e.value,
				actualContrast: _c(no(e.value, a, s), q(a)),
				manuallyOverridden: e.manuallyOverridden
			};
		}
		if (!c.contrast) throw Error(`Data vis point ${c.id} has no owned contrast recipe.`);
		let l = c.source, u = l.kind === "key-color" ? {
			id: `data-vis-point:${t.id}:${c.id}`,
			name: t.name,
			stops: [{
				id: c.id,
				...l.color
			}]
		} : e.scales.find((e) => e.id === l.scaleId);
		if (!u) throw Error(`Data vis point ${c.id} has an unavailable UI scale. Choose a replacement color.`);
		let d = Na(Ra(c.contrast, o), Ma(e)), f = Xo(va(u, e.settings.colorOutput), i, d, e.settings), p = _c(no(f.dynamic.css, a, s), q(a));
		return {
			id: c.id,
			position: c.position,
			source: c.source,
			value: f.dynamic.css,
			targetContrast: d,
			actualContrast: p,
			targetReached: Math.abs(d - p) <= Math.max(.035, d * .006),
			manuallyOverridden: !1
		};
	});
}
//#endregion
//#region src/features/color-system/data-vis/categoricalValues.ts
function Cc(e, t, n, r) {
	let i = e.members.find((e) => e.id === t);
	if (!i) throw Error("This categorical member is unavailable.");
	if (!e.staticColors) {
		let e = xc(i.source, n).value;
		return {
			value: e,
			generatedValue: e,
			overridden: !1
		};
	}
	let a = e.staticColors.find((e) => e.id === t);
	if (!a) throw Error("This categorical member has no captured Static color.");
	let o = (e) => r ? V(q(e), r) : e, s = o(po(a));
	return q(s), {
		value: s,
		generatedValue: o(a.value),
		overridden: a.overrideValue !== void 0
	};
}
function wc(e, t, n, r, { includeUnpublished: i = !1 } = {}) {
	return e.dataVisScales.flatMap((a) => a.kind === "categorical" && (i || Ha(a)) ? a.members.map((i, o) => {
		let s = Cc(a, i.id, t, e.settings.colorOutput), c = Zs(a.id, i.id), l = Po({
			uuid: c,
			name: {
				colorName: a.name,
				contrastValue: String(o + 1)
			},
			value: s.generatedValue,
			source: {
				tokenType: "color",
				scaleId: a.id,
				contrastId: i.id
			}
		}, void 0), u = a.staticColors ? {
			...l,
			value: s.value,
			valueOverridden: s.overridden
		} : cs(l, n, r, e);
		return q(u.value), {
			id: c,
			name: `${a.name} ${o + 1}`,
			value: u.value,
			generatedValue: s.generatedValue,
			valueOverridden: u.valueOverridden
		};
	}) : []);
}
//#endregion
//#region src/features/color-system/data-vis/adapter.ts
function Tc(e, t = {}) {
	let n = sc(e), r = Ss(n.color, [], void 0, {
		modeSets: n.modeSets,
		opacity: n.opacity,
		browserTokenEdits: n.browserTokenEdits
	});
	xs(r);
	let i = gc(r, n.modeSets);
	if (i.length) throw Error(i.join(" "));
	for (let e of Object.keys(t.modes ?? {})) if (!n.modeSets.some((t) => t.key === e)) throw Error(`Unknown mode set ${e}.`);
	let a = n.modeSets.map((e) => {
		let n = t.modes?.[e.key], r = n === void 0 ? e.modes.find((t) => t.id === e.defaultModeId) : e.modes.find((e) => e.key === n);
		if (!r) throw Error(`Mode ${n ?? "(default)"} is unavailable in ${e.key}.`);
		return r;
	});
	if (t.contrastMultiplier !== void 0 && (!Number.isFinite(t.contrastMultiplier) || t.contrastMultiplier < 0 || t.contrastMultiplier > 3)) throw Error("Choose a supported finite global contrast multiplier.");
	if (t.backgroundLightness !== void 0 && (!Number.isFinite(t.backgroundLightness) || t.backgroundLightness < 0 || t.backgroundLightness > 1)) throw Error("Choose a finite background lightness from zero to one.");
	let o = {
		...t.contrastMultiplier !== void 0 && { "color.contrastMultiplier": t.contrastMultiplier },
		...t.backgroundLightness !== void 0 && { "color.backgroundLightness": t.backgroundLightness },
		...t.backgroundScaleId !== void 0 && { "color.backgroundScaleId": t.backgroundScaleId }
	}, s = Ao(n.color, a, o, {
		modeSets: n.modeSets,
		applyMultiplier: !1,
		applyPolarity: !1
	});
	if (!s.scales.some((e) => e.id === s.backgroundScaleId)) throw Error("The requested background scale is outside this source-closed packet.");
	let c = Ss(n.color, a, o, {
		modeSets: n.modeSets,
		opacity: n.opacity,
		browserTokenEdits: n.browserTokenEdits
	});
	xs(c);
	let l = os(Object.fromEntries(n.modeSets.map((e, t) => [e.id, a[t].id]))), u = [...tc(c.palette, c.settings.colorOutput), ...c.scales.flatMap((e) => Qs(e, c.contrasts, Zo(c), c.settings, c.settings.colorOutput, n.namingRules))].map((e) => cs(Po(e, n.tokenOverrides[e.uuid]), n.browserTokenEdits, l, c)), d = yc(c, u), f = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map(), m = wc(s, d, n.browserTokenEdits, l), h = fc(c, u, m);
	for (let e of s.dataVisScales) e.kind === "categorical" ? p.set(e.id, e.members.map((t) => {
		let n = m.find((n) => n.id === Zs(e.id, t.id));
		if (!n) throw Error("A categorical runtime color is unavailable.");
		return n.value;
	})) : f.set(e.id, nc(e, Sc(s, e, d, h), s.settings.colorOutput));
	let g = (e) => {
		let t = s.dataVisScales.filter((t) => t.id === e || t.name === e);
		if (t.length !== 1) throw Error(`Choose one available data vis scale ID or unique name: ${e}.`);
		return t[0];
	};
	return {
		definitions: s.dataVisScales.map(({ id: e, name: t, kind: n }) => ({
			id: e,
			name: t,
			kind: n
		})),
		continuous(e) {
			let t = g(e), n = f.get(t.id);
			if (!n) throw Error(`${t.name} is categorical, not a continuous function.`);
			return n.evaluate;
		},
		categorical(e) {
			let t = g(e), n = p.get(t.id);
			if (!n) throw Error(`${t.name} is continuous, not a categorical palette.`);
			return [...n];
		},
		diagnostics(e) {
			let t = g(e);
			return [...f.get(t.id)?.diagnostics ?? []];
		},
		withContext(e) {
			return Tc(n, {
				...t,
				...e,
				modes: {
					...t.modes,
					...e.modes
				}
			});
		}
	};
}
//#endregion
export { Tc as createDataVisRuntime };
