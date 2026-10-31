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
var t = [
	"lightness",
	"hue",
	"chroma"
];
function n(e) {
	return t.some((t) => e[t] !== void 0);
}
function r(e) {
	let t = { ...e };
	return delete t.paletteColorId, t;
}
function i(e, t, r = []) {
	if (!t) return e;
	let i = t.paletteColorId === void 0 && n(t), a = i && e.paletteColorId !== void 0 ? r.find((t) => t.id === e.paletteColorId) : void 0, o = {
		...e,
		...a && {
			lightness: a.lightness,
			hue: a.hue,
			chroma: a.chroma
		},
		...t
	};
	return i && delete o.paletteColorId, o;
}
function a(e) {
	if (!e.scales.some((e) => e.stops.some((e) => e.paletteColorId !== void 0))) return e;
	let t = new Map(e.palette.map((e) => [e.id, e]));
	return {
		...e,
		scales: e.scales.map((e) => ({
			...e,
			stops: e.stops.map((e) => {
				if (e.paletteColorId === void 0) return e;
				let n = t.get(e.paletteColorId);
				return n ? {
					...e,
					lightness: n.lightness,
					hue: n.hue,
					chroma: n.chroma
				} : r(e);
			})
		}))
	};
}
//#endregion
//#region ../../node_modules/.pnpm/colorjs.io@0.5.2/node_modules/colorjs.io/dist/color.js
function o(e, t) {
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
function s(e) {
	return c(e) === "string";
}
function c(e) {
	return (Object.prototype.toString.call(e).match(/^\[object\s+(.*?)\]$/)[1] || "").toLowerCase();
}
function l(e, { precision: t, unit: n }) {
	return u(e) ? "none" : f(e, t) + (n ?? "");
}
function u(e) {
	return Number.isNaN(e) || e instanceof Number && e?.none;
}
function d(e) {
	return u(e) ? 0 : e;
}
function f(e, t) {
	if (e === 0) return 0;
	let n = ~~e, r = 0;
	n && t && (r = ~~Math.log10(Math.abs(n)) + 1);
	let i = 10 ** (t - r);
	return Math.floor(e * i + .5) / i;
}
var p = {
	deg: 1,
	grad: .9,
	rad: 180 / Math.PI,
	turn: 360
};
function m(e) {
	if (!e) return;
	e = e.trim();
	let t = /^([a-z]+)\((.+?)\)$/i, n = /^-?[\d.]+$/, r = /%|deg|g?rad|turn$/, i = /\/?\s*(none|[-\w.]+(?:%|deg|g?rad|turn)?)/g, a = e.match(t);
	if (a) {
		let e = [];
		return a[2].replace(i, (t, i) => {
			let a = i.match(r), o = i;
			if (a) {
				let e = a[0], t = o.slice(0, -e.length);
				e === "%" ? (o = /* @__PURE__ */ new Number(t / 100), o.type = "<percentage>") : (o = new Number(t * p[e]), o.type = "<angle>", o.unit = e);
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
function h(e) {
	return e[e.length - 1];
}
function g(e, t, n) {
	return isNaN(e) ? t : isNaN(t) ? e : e + (t - e) * n;
}
function _(e, t, n) {
	return (n - e) / (t - e);
}
function v(e, t, n) {
	return g(t[0], t[1], _(e[0], e[1], n));
}
function y(e) {
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
function b(e, t, n) {
	return Math.max(Math.min(n, t), e);
}
function x(e, t) {
	return Math.sign(e) === Math.sign(t) ? e : -e;
}
function S(e, t) {
	return x(Math.abs(e) ** t, e);
}
function C(e, t) {
	return t === 0 ? 0 : e / t;
}
function w(e, t, n = 0, r = e.length) {
	for (; n < r;) {
		let i = n + r >> 1;
		e[i] < t ? n = i + 1 : r = i;
	}
	return n;
}
var ee = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	bisectLeft: w,
	clamp: b,
	copySign: x,
	interpolate: g,
	interpolateInv: _,
	isNone: u,
	isString: s,
	last: h,
	mapRange: v,
	multiplyMatrices: o,
	parseCoordGrammar: y,
	parseFunction: m,
	serializeNumber: l,
	skipNone: d,
	spow: S,
	toPrecision: f,
	type: c,
	zdiv: C
}), T = new class {
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
}(), E = {
	gamut_mapping: "css",
	precision: 5,
	deltaE: "76",
	verbose: globalThis?.process?.env?.NODE_ENV?.toLowerCase() !== "test",
	warn: function(e) {
		this.verbose && globalThis?.console?.warn?.(e);
	}
}, D = {
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
function te(e) {
	return Array.isArray(e) ? e : D[e];
}
function ne(e, t, n, r = {}) {
	if (e = te(e), t = te(t), !e || !t) throw TypeError(`Missing white point to convert ${e ? "" : "from"}${!e && !t ? "/" : ""}${t ? "" : "to"}`);
	if (e === t) return n;
	let i = {
		W1: e,
		W2: t,
		XYZ: n,
		options: r
	};
	if (T.run("chromatic-adaptation-start", i), i.M || (i.W1 === D.D65 && i.W2 === D.D50 ? i.M = [
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
	] : i.W1 === D.D50 && i.W2 === D.D65 && (i.M = [
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
	])), T.run("chromatic-adaptation-end", i), i.M) return o(i.M, i.XYZ);
	throw TypeError("Only Bradford CAT with white points D50 and D65 supported for now.");
}
var re = new Set([
	"<number>",
	"<percentage>",
	"<angle>"
]);
function O(e, t, n, r) {
	return Object.entries(e.coords).map(([e, i], a) => {
		let o = t.coordGrammar[a], s = r[a], c = s?.type, l;
		if (l = s.none ? o.find((e) => re.has(e)) : o.find((e) => e == c), !l) {
			let t = i.name || e;
			throw TypeError(`${c ?? s.raw} not allowed for ${t} in ${n}()`);
		}
		let u = l.range;
		c === "<percentage>" && (u ||= [0, 1]);
		let d = i.range || i.refRange;
		return u && d && (r[a] = v(u, d, r[a])), l;
	});
}
function ie(e, { meta: t } = {}) {
	let n = { str: String(e)?.trim() };
	if (T.run("parse-start", n), n.color) return n.color;
	if (n.parsed = m(n.str), n.parsed) {
		let e = n.parsed.name;
		if (e === "color") {
			let e = n.parsed.args.shift(), r = e.startsWith("--") ? e.substring(2) : `--${e}`, i = [e, r], a = n.parsed.rawArgs.indexOf("/") > 0 ? n.parsed.args.pop() : 1;
			for (let r of A.all) {
				let o = r.getFormat("color");
				if (o && (i.includes(o.id) || o.ids?.filter((e) => i.includes(e)).length)) {
					let i = Object.keys(r.coords).map((e, t) => n.parsed.args[t] || 0), s;
					return o.coordGrammar && (s = O(r, o, "color", i)), t && Object.assign(t, {
						formatId: "color",
						types: s
					}), o.id.startsWith("--") && !e.startsWith("--") && E.warn(`${r.name} is a non-standard space and not currently supported in the CSS spec. Use prefixed color(${o.id}) instead of color(${e}).`), e.startsWith("--") && !o.id.startsWith("--") && E.warn(`${r.name} is a standard space and supported in the CSS spec. Use color(${o.id}) instead of prefixed color(${e}).`), {
						spaceId: r.id,
						coords: i,
						alpha: a
					};
				}
			}
			let o = "", s = e in A.registry ? e : r;
			if (s in A.registry) {
				let e = A.registry[s].formats?.color?.id;
				e && (o = `Did you mean color(${e})?`);
			}
			throw TypeError(`Cannot parse color(${e}). ` + (o || "Missing a plugin?"));
		} else for (let r of A.all) {
			let i = r.getFormat(e);
			if (i && i.type === "function") {
				let a = 1;
				(i.lastAlpha || h(n.parsed.args).alpha) && (a = n.parsed.args.pop());
				let o = n.parsed.args, s;
				return i.coordGrammar && (s = O(r, i, e, o)), t && Object.assign(t, {
					formatId: i.name,
					types: s
				}), {
					spaceId: r.id,
					coords: o,
					alpha: a
				};
			}
		}
	} else for (let e of A.all) for (let r in e.formats) {
		let i = e.formats[r];
		if (i.type !== "custom" || i.test && !i.test(n.str)) continue;
		let a = i.parse(n.str);
		if (a) return a.alpha ??= 1, t && (t.formatId = r), a;
	}
	throw TypeError(`Could not parse ${e} as a color. Missing a plugin?`);
}
function k(e) {
	if (Array.isArray(e)) return e.map(k);
	if (!e) throw TypeError("Empty color reference");
	s(e) && (e = ie(e));
	let t = e.space || e.spaceId;
	return t instanceof A || (e.space = A.get(t)), e.alpha === void 0 && (e.alpha = 1), e;
}
var ae = 75e-6, A = class e {
	constructor(t) {
		this.id = t.id, this.name = t.name, this.base = t.base ? e.get(t.base) : null, this.aliases = t.aliases, this.base && (this.fromBase = t.fromBase, this.toBase = t.toBase);
		let n = t.coords ?? this.base.coords;
		for (let e in n) "name" in n[e] || (n[e].name = e);
		this.coords = n;
		let r = t.white ?? this.base.white ?? "D65";
		this.white = te(r), this.formats = t.formats ?? {};
		for (let e in this.formats) {
			let t = this.formats[e];
			t.type ||= "function", t.name ||= e;
		}
		this.formats.color?.id || (this.formats.color = {
			...this.formats.color ?? {},
			id: t.cssId || this.id
		}), t.gamutSpace ? this.gamutSpace = t.gamutSpace === "self" ? this : e.get(t.gamutSpace) : this.isPolar ? this.gamutSpace = this.base : this.gamutSpace = this, this.gamutSpace.isUnbounded && (this.inGamut = (e, t) => !0), this.referred = t.referred, Object.defineProperty(this, "path", {
			value: oe(this).reverse(),
			writable: !1,
			enumerable: !0,
			configurable: !0
		}), T.run("colorspace-init-end", this);
	}
	inGamut(e, { epsilon: t = ae } = {}) {
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
		if (typeof e == "object") return e = se(e, this), e;
		let t;
		return t = e === "default" ? Object.values(this.formats)[0] : this.formats[e], t ? (t = se(t, this), t) : null;
	}
	equals(e) {
		return e ? this === e || this.id === e || this.id === e.id : !1;
	}
	to(t, n) {
		if (arguments.length === 1) {
			let e = k(t);
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
			let e = k(t);
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
		if (c(t) === "string") {
			let n = e.registry[t.toLowerCase()];
			if (!n) throw TypeError(`No color space found with id = "${t}"`);
			return n;
		}
		if (n.length) return e.get(...n);
		throw TypeError(`${t} is not a valid color space`);
	}
	static resolveCoord(t, n) {
		let r = c(t), i, a;
		if (r === "string" ? t.includes(".") ? [i, a] = t.split(".") : [i, a] = [, t] : Array.isArray(t) ? [i, a] = t : (i = t.space, a = t.coordId), i = e.get(i), i ||= n, !i) throw TypeError(`Cannot resolve coordinate reference ${t}: No color space specified and relative references are not allowed here`);
		if (r = c(a), r === "number" || r === "string" && a >= 0) {
			let e = Object.entries(i.coords)[a];
			if (e) return {
				space: i,
				id: e[0],
				index: a,
				...e[1]
			};
		}
		i = e.get(i);
		let o = a.toLowerCase(), s = 0;
		for (let e in i.coords) {
			let t = i.coords[e];
			if (e.toLowerCase() === o || t.name?.toLowerCase() === o) return {
				space: i,
				id: e,
				index: s,
				...t
			};
			s++;
		}
		throw TypeError(`No "${a}" coordinate found in ${i.name}. Its coordinates are: ${Object.keys(i.coords).join(", ")}`);
	}
	static DEFAULT_FORMAT = {
		type: "functions",
		name: "color"
	};
};
function oe(e) {
	let t = [e];
	for (let n = e; n = n.base;) t.push(n);
	return t;
}
function se(e, { coords: t } = {}) {
	if (e.coords && !e.coordGrammar) {
		e.type ||= "function", e.name ||= "color", e.coordGrammar = y(e.coords);
		let n = Object.entries(t).map(([t, n], r) => {
			let i = e.coordGrammar[r][0], a = n.range || n.refRange, o = i.range, s = "";
			return i == "<percentage>" ? (o = [0, 100], s = "%") : i == "<angle>" && (s = "deg"), {
				fromRange: a,
				toRange: o,
				suffix: s
			};
		});
		e.serializeCoords = (e, t) => e.map((e, r) => {
			let { fromRange: i, toRange: a, suffix: o } = n[r];
			return i && a && (e = v(i, a, e)), e = l(e, {
				precision: t,
				unit: o
			}), e;
		});
	}
	return e;
}
var j = new A({
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
}), M = class extends A {
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
		}, e.base ||= j, e.toXYZ_M && e.fromXYZ_M && (e.toBase ??= (t) => {
			let n = o(e.toXYZ_M, t);
			return this.white !== this.base.white && (n = ne(this.white, this.base.white, n)), n;
		}, e.fromBase ??= (t) => (t = ne(this.base.white, this.white, t), o(e.fromXYZ_M, t))), e.referred ??= "display", super(e);
	}
};
function ce(e, t) {
	return e = k(e), !t || e.space.equals(t) ? e.coords.slice() : (t = A.get(t), t.from(e));
}
function N(e, t) {
	e = k(e);
	let { space: n, index: r } = A.resolveCoord(t, e.space);
	return ce(e, n)[r];
}
function le(e, t, n) {
	return e = k(e), t = A.get(t), e.coords = t.to(e.space, n), e;
}
le.returns = "color";
function P(e, t, n) {
	if (e = k(e), arguments.length === 2 && c(arguments[1]) === "object") {
		let t = arguments[1];
		for (let n in t) P(e, n, t[n]);
	} else {
		typeof n == "function" && (n = n(N(e, t)));
		let { space: r, index: i } = A.resolveCoord(t, e.space), a = ce(e, r);
		a[i] = n, le(e, r, a);
	}
	return e;
}
P.returns = "color";
var ue = new A({
	id: "xyz-d50",
	name: "XYZ D50",
	white: "D50",
	base: j,
	fromBase: (e) => ne(j.white, "D50", e),
	toBase: (e) => ne("D50", j.white, e)
}), de = 216 / 24389, fe = 24 / 116, pe = 24389 / 27, me = D.D50, F = new A({
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
	white: me,
	base: ue,
	fromBase(e) {
		let t = e.map((e, t) => e / me[t]).map((e) => e > de ? Math.cbrt(e) : (pe * e + 16) / 116);
		return [
			116 * t[1] - 16,
			500 * (t[0] - t[1]),
			200 * (t[1] - t[2])
		];
	},
	toBase(e) {
		let t = [];
		return t[1] = (e[0] + 16) / 116, t[0] = e[1] / 500 + t[1], t[2] = t[1] - e[2] / 200, [
			t[0] > fe ? t[0] ** 3 : (116 * t[0] - 16) / pe,
			e[0] > 8 ? ((e[0] + 16) / 116) ** 3 : e[0] / pe,
			t[2] > fe ? t[2] ** 3 : (116 * t[2] - 16) / pe
		].map((e, t) => e * me[t]);
	},
	formats: { lab: { coords: [
		"<number> | <percentage>",
		"<number> | <percentage>[-1,1]",
		"<number> | <percentage>[-1,1]"
	] } }
});
function I(e) {
	return (e % 360 + 360) % 360;
}
function he(e, t) {
	if (e === "raw") return t;
	let [n, r] = t.map(I), i = r - n;
	return e === "increasing" ? i < 0 && (r += 360) : e === "decreasing" ? i > 0 && (n += 360) : e === "longer" ? -180 < i && i < 180 && (i > 0 ? n += 360 : r += 360) : e === "shorter" && (i > 180 ? n += 360 : i < -180 && (r += 360)), [n, r];
}
var ge = new A({
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
	base: F,
	fromBase(e) {
		let [t, n, r] = e, i, a = .02;
		return i = Math.abs(n) < a && Math.abs(r) < a ? NaN : Math.atan2(r, n) * 180 / Math.PI, [
			t,
			Math.sqrt(n ** 2 + r ** 2),
			I(i)
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
}), _e = 25 ** 7, ve = Math.PI, ye = 180 / ve, be = ve / 180;
function xe(e) {
	let t = e * e;
	return t * t * t * e;
}
function Se(e, t, { kL: n = 1, kC: r = 1, kH: i = 1 } = {}) {
	[e, t] = k([e, t]);
	let [a, o, s] = F.from(e), c = ge.from(F, [
		a,
		o,
		s
	])[1], [l, u, d] = F.from(t), f = ge.from(F, [
		l,
		u,
		d
	])[1];
	c < 0 && (c = 0), f < 0 && (f = 0);
	let p = xe((c + f) / 2), m = .5 * (1 - Math.sqrt(p / (p + _e))), h = (1 + m) * o, g = (1 + m) * u, _ = Math.sqrt(h ** 2 + s ** 2), v = Math.sqrt(g ** 2 + d ** 2), y = h === 0 && s === 0 ? 0 : Math.atan2(s, h), b = g === 0 && d === 0 ? 0 : Math.atan2(d, g);
	y < 0 && (y += 2 * ve), b < 0 && (b += 2 * ve), y *= ye, b *= ye;
	let x = l - a, S = v - _, C = b - y, w = y + b, ee = Math.abs(C), T;
	_ * v === 0 ? T = 0 : ee <= 180 ? T = C : C > 180 ? T = C - 360 : C < -180 ? T = C + 360 : E.warn("the unthinkable has happened");
	let D = 2 * Math.sqrt(v * _) * Math.sin(T * be / 2), te = (a + l) / 2, ne = (_ + v) / 2, re = xe(ne), O;
	O = _ * v === 0 ? w : ee <= 180 ? w / 2 : w < 360 ? (w + 360) / 2 : (w - 360) / 2;
	let ie = (te - 50) ** 2, ae = 1 + .015 * ie / Math.sqrt(20 + ie), A = 1 + .045 * ne, oe = 1;
	oe -= .17 * Math.cos((O - 30) * be), oe += .24 * Math.cos(2 * O * be), oe += .32 * Math.cos((3 * O + 6) * be), oe -= .2 * Math.cos((4 * O - 63) * be);
	let se = 1 + .015 * ne * oe, j = 30 * Math.exp(-1 * ((O - 275) / 25) ** 2), M = 2 * Math.sqrt(re / (re + _e)), ce = -1 * Math.sin(2 * j * be) * M, N = (x / (n * ae)) ** 2;
	return N += (S / (r * A)) ** 2, N += (D / (i * se)) ** 2, N += ce * (S / (r * A)) * (D / (i * se)), Math.sqrt(N);
}
var Ce = [
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
], we = [
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
], Te = [
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
], Ee = [
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
], De = new A({
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
	base: j,
	fromBase(e) {
		return o(Te, o(Ce, e).map((e) => Math.cbrt(e)));
	},
	toBase(e) {
		return o(we, o(Ee, e).map((e) => e ** 3));
	},
	formats: { oklab: { coords: [
		"<percentage> | <number>",
		"<number> | <percentage>[-1,1]",
		"<number> | <percentage>[-1,1]"
	] } }
});
function Oe(e, t) {
	[e, t] = k([e, t]);
	let [n, r, i] = De.from(e), [a, o, s] = De.from(t), c = n - a, l = r - o, u = i - s;
	return Math.sqrt(c ** 2 + l ** 2 + u ** 2);
}
var ke = 75e-6;
function Ae(e, t, { epsilon: n = ke } = {}) {
	e = k(e), t ||= e.space, t = A.get(t);
	let r = e.coords;
	return t !== e.space && (r = t.from(e)), t.inGamut(r, { epsilon: n });
}
function je(e) {
	return {
		space: e.space,
		coords: e.coords.slice(),
		alpha: e.alpha
	};
}
function Me(e, t, n = "lab") {
	n = A.get(n);
	let r = n.from(e), i = n.from(t);
	return Math.sqrt(r.reduce((e, t, n) => {
		let r = i[n];
		return isNaN(t) || isNaN(r) ? e : e + (r - t) ** 2;
	}, 0));
}
function Ne(e, t) {
	return Me(e, t, "lab");
}
var Pe = Math.PI / 180;
function Fe(e, t, { l: n = 2, c: r = 1 } = {}) {
	[e, t] = k([e, t]);
	let [i, a, o] = F.from(e), [, s, c] = ge.from(F, [
		i,
		a,
		o
	]), [l, u, d] = F.from(t), f = ge.from(F, [
		l,
		u,
		d
	])[1];
	s < 0 && (s = 0), f < 0 && (f = 0);
	let p = i - l, m = s - f, h = a - u, g = o - d, _ = h ** 2 + g ** 2 - m ** 2, v = .511;
	i >= 16 && (v = .040975 * i / (1 + .01765 * i));
	let y = .0638 * s / (1 + .0131 * s) + .638, b;
	Number.isNaN(c) && (c = 0), b = c >= 164 && c <= 345 ? .56 + Math.abs(.2 * Math.cos((c + 168) * Pe)) : .36 + Math.abs(.4 * Math.cos((c + 35) * Pe));
	let x = s ** 4, S = Math.sqrt(x / (x + 1900)), C = y * (S * b + 1 - S), w = (p / (n * v)) ** 2;
	return w += (m / (r * y)) ** 2, w += _ / C ** 2, Math.sqrt(w);
}
var Ie = 203, Le = new A({
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
	base: j,
	fromBase(e) {
		return e.map((e) => Math.max(e * Ie, 0));
	},
	toBase(e) {
		return e.map((e) => Math.max(e / Ie, 0));
	}
}), Re = 1.15, ze = .66, Be = 2610 / 2 ** 14, Ve = 2 ** 14 / 2610, He = 3424 / 2 ** 12, Ue = 2413 / 2 ** 7, We = 2392 / 2 ** 7, Ge = 1.7 * 2523 / 2 ** 5, Ke = 2 ** 5 / (1.7 * 2523), qe = -.56, Je = 16295499532821565e-27, Ye = [
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
], Xe = [
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
], Ze = [
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
], Qe = [
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
], $e = new A({
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
	base: Le,
	fromBase(e) {
		let [t, n, r] = e, [i, a, s] = o(Ze, o(Ye, [
			Re * t - (Re - 1) * r,
			ze * n - (ze - 1) * t,
			r
		]).map(function(e) {
			return ((He + Ue * (e / 1e4) ** Be) / (1 + We * (e / 1e4) ** Be)) ** Ge;
		}));
		return [
			(1 + qe) * i / (1 + qe * i) - Je,
			a,
			s
		];
	},
	toBase(e) {
		let [t, n, r] = e, [i, a, s] = o(Xe, o(Qe, [
			(t + Je) / (1 + qe - qe * (t + Je)),
			n,
			r
		]).map(function(e) {
			return 1e4 * ((He - e ** Ke) / (We * e ** Ke - Ue)) ** Ve;
		})), c = (i + (Re - 1) * s) / Re;
		return [
			c,
			(a + (ze - 1) * c) / ze,
			s
		];
	},
	formats: { color: { coords: [
		"<number> | <percentage>",
		"<number> | <percentage>[-1,1]",
		"<number> | <percentage>[-1,1]"
	] } }
}), et = new A({
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
	base: $e,
	fromBase(e) {
		let [t, n, r] = e, i, a = 2e-4;
		return i = Math.abs(n) < a && Math.abs(r) < a ? NaN : Math.atan2(r, n) * 180 / Math.PI, [
			t,
			Math.sqrt(n ** 2 + r ** 2),
			I(i)
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
function tt(e, t) {
	[e, t] = k([e, t]);
	let [n, r, i] = et.from(e), [a, o, s] = et.from(t), c = n - a, l = r - o;
	Number.isNaN(i) && Number.isNaN(s) ? (i = 0, s = 0) : Number.isNaN(i) ? i = s : Number.isNaN(s) && (s = i);
	let u = i - s, d = 2 * Math.sqrt(r * o) * Math.sin(u / 2 * (Math.PI / 180));
	return Math.sqrt(c ** 2 + l ** 2 + d ** 2);
}
var nt = 3424 / 4096, rt = 2413 / 128, it = 2392 / 128, at = 2610 / 16384, ot = 2523 / 32, st = 16384 / 2610, ct = 32 / 2523, lt = [
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
], ut = [
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
], dt = [
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
], ft = [
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
], pt = new A({
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
	base: Le,
	fromBase(e) {
		return mt(o(lt, e));
	},
	toBase(e) {
		return o(ft, ht(e));
	}
});
function mt(e) {
	return o(ut, e.map(function(e) {
		return ((nt + rt * (e / 1e4) ** at) / (1 + it * (e / 1e4) ** at)) ** ot;
	}));
}
function ht(e) {
	return o(dt, e).map(function(e) {
		return 1e4 * (Math.max(e ** ct - nt, 0) / (rt - it * e ** ct)) ** st;
	});
}
function gt(e, t) {
	[e, t] = k([e, t]);
	let [n, r, i] = pt.from(e), [a, o, s] = pt.from(t);
	return 720 * Math.sqrt((n - a) ** 2 + .25 * (r - o) ** 2 + (i - s) ** 2);
}
var _t = D.D65, vt = .42, yt = 1 / vt, bt = 2 * Math.PI, xt = [
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
], St = [
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
], Ct = [
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
], wt = {
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
}, Tt = {
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
}, Et = 180 / Math.PI, Dt = Math.PI / 180;
function Ot(e, t) {
	return e.map((e) => {
		let n = S(t * Math.abs(e) * .01, vt);
		return 400 * x(n, e) / (n + 27.13);
	});
}
function kt(e, t) {
	let n = 100 / t * 27.13 ** yt;
	return e.map((e) => {
		let t = Math.abs(e);
		return x(n * S(t / (400 - t), yt), e);
	});
}
function At(e) {
	let t = I(e);
	t <= Tt.h[0] && (t += 360);
	let n = w(Tt.h, t) - 1, [r, i] = Tt.h.slice(n, n + 2), [a, o] = Tt.e.slice(n, n + 2), s = Tt.H[n], c = (t - r) / a;
	return s + 100 * c / (c + (i - t) / o);
}
function jt(e) {
	let t = (e % 400 + 400) % 400, n = Math.floor(.01 * t);
	t %= 100;
	let [r, i] = Tt.h.slice(n, n + 2), [a, o] = Tt.e.slice(n, n + 2);
	return I((t * (o * r - a * i) - 100 * r * o) / (t * (o - a) - 100 * o));
}
function Mt(e, t, n, r, i) {
	let a = {};
	a.discounting = i, a.refWhite = e, a.surround = r;
	let s = e.map((e) => e * 100);
	a.la = t, a.yb = n;
	let c = s[1], l = o(xt, s);
	r = wt[a.surround];
	let u = r[0];
	a.c = r[1], a.nc = r[2];
	let d = (1 / (5 * a.la + 1)) ** 4;
	a.fl = d * a.la + .1 * (1 - d) * (1 - d) * Math.cbrt(5 * a.la), a.flRoot = a.fl ** .25, a.n = a.yb / c, a.z = 1.48 + Math.sqrt(a.n), a.nbb = .725 * a.n ** -.2, a.ncb = a.nbb;
	let f = i ? 1 : Math.max(Math.min(u * (1 - 1 / 3.6 * Math.exp((-a.la - 42) / 92)), 1), 0);
	a.dRgb = l.map((e) => g(1, c / e, f)), a.dRgbInv = a.dRgb.map((e) => 1 / e);
	let p = Ot(l.map((e, t) => e * a.dRgb[t]), a.fl);
	return a.aW = a.nbb * (2 * p[0] + p[1] + .05 * p[2]), a;
}
var Nt = Mt(_t, 64 / Math.PI * .2, 20, "average", !1);
function Pt(e, t) {
	if (!(e.J !== void 0 ^ e.Q !== void 0)) throw Error("Conversion requires one and only one: 'J' or 'Q'");
	if (!(e.C !== void 0 ^ e.M !== void 0 ^ e.s !== void 0)) throw Error("Conversion requires one and only one: 'C', 'M' or 's'");
	if (!(e.h !== void 0 ^ e.H !== void 0)) throw Error("Conversion requires one and only one: 'h' or 'H'");
	if (e.J === 0 || e.Q === 0) return [
		0,
		0,
		0
	];
	let n = 0;
	n = e.h === void 0 ? jt(e.H) * Dt : I(e.h) * Dt;
	let r = Math.cos(n), i = Math.sin(n), a = 0;
	e.J === void 0 ? e.Q !== void 0 && (a = .25 * t.c * e.Q / ((t.aW + 4) * t.flRoot)) : a = S(e.J, 1 / 2) * .1;
	let s = 0;
	e.C === void 0 ? e.M === void 0 ? e.s !== void 0 && (s = 4e-4 * e.s ** 2 * (t.aW + 4) / t.c) : s = e.M / t.flRoot / a : s = e.C / a;
	let c = S(s * (1.64 - .29 ** t.n) ** -.73, 10 / 9), l = .25 * (Math.cos(n + 2) + 3.8), u = t.aW * S(a, 2 / t.c / t.z), d = 5e4 / 13 * t.nc * t.ncb * l, f = u / t.nbb, p = 23 * (f + .305) * C(c, 23 * d + c * (11 * r + 108 * i));
	return o(St, kt(o(Ct, [
		f,
		p * r,
		p * i
	]).map((e) => e * 1 / 1403), t.fl).map((e, n) => e * t.dRgbInv[n])).map((e) => e / 100);
}
function Ft(e, t) {
	let n = Ot(o(xt, e.map((e) => e * 100)).map((e, n) => e * t.dRgb[n]), t.fl), r = n[0] + (-12 * n[1] + n[2]) / 11, i = (n[0] + n[1] - 2 * n[2]) / 9, a = (Math.atan2(i, r) % bt + bt) % bt, s = .25 * (Math.cos(a + 2) + 3.8), c = S(5e4 / 13 * t.nc * t.ncb * C(s * Math.sqrt(r ** 2 + i ** 2), n[0] + n[1] + 1.05 * n[2] + .305), .9) * (1.64 - .29 ** t.n) ** .73, l = S(t.nbb * (2 * n[0] + n[1] + .05 * n[2]) / t.aW, .5 * t.c * t.z), u = 100 * S(l, 2), d = 4 / t.c * l * (t.aW + 4) * t.flRoot, f = c * l, p = f * t.flRoot, m = I(a * Et), h = At(m);
	return {
		J: u,
		C: f,
		h: m,
		s: 50 * S(t.c * c / (t.aW + 4), 1 / 2),
		Q: d,
		M: p,
		H: h
	};
}
var It = new A({
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
	base: j,
	fromBase(e) {
		let t = Ft(e, Nt);
		return [
			t.J,
			t.M,
			t.h
		];
	},
	toBase(e) {
		return Pt({
			J: e[0],
			M: e[1],
			h: e[2]
		}, Nt);
	}
}), Lt = D.D65, Rt = 216 / 24389, zt = 24389 / 27;
function Bt(e) {
	return 116 * (e > Rt ? Math.cbrt(e) : (zt * e + 16) / 116) - 16;
}
function Vt(e) {
	return e > 8 ? ((e + 16) / 116) ** 3 : e / zt;
}
function Ht(e, t) {
	let [n, r, i] = e, a = [], o = 0;
	if (i === 0) return [
		0,
		0,
		0
	];
	let s = Vt(i);
	o = i > 0 ? .00379058511492914 * i ** 2 + .608983189401032 * i + .9155088574762233 : 9514440756550361e-21 * i ** 2 + .08693057439788597 * i - 21.928975842194614;
	let c = 0, l = Infinity;
	for (; c <= 15;) {
		a = Pt({
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
	return Pt({
		J: o,
		C: r,
		h: n
	}, t);
}
function Ut(e, t) {
	let n = Bt(e[1]);
	if (n === 0) return [
		0,
		0,
		0
	];
	let r = Ft(e, Wt);
	return [
		I(r.h),
		r.C,
		n
	];
}
var Wt = Mt(Lt, 200 / Math.PI * Vt(50), Vt(50) * 100, "average", !1), Gt = new A({
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
	base: j,
	fromBase(e) {
		return Ut(e);
	},
	toBase(e) {
		return Ht(e, Wt);
	},
	formats: { color: {
		id: "--hct",
		coords: [
			"<number> | <angle>",
			"<percentage> | <number>",
			"<percentage> | <number>"
		]
	} }
}), Kt = Math.PI / 180, qt = [
	1,
	.007,
	.0228
];
function Jt(e) {
	e[1] < 0 && (e = Gt.fromBase(Gt.toBase(e)));
	let t = Math.log(Math.max(1 + qt[2] * e[1] * Wt.flRoot, 1)) / qt[2], n = e[0] * Kt, r = t * Math.cos(n), i = t * Math.sin(n);
	return [
		e[2],
		r,
		i
	];
}
function Yt(e, t) {
	[e, t] = k([e, t]);
	let [n, r, i] = Jt(Gt.from(e)), [a, o, s] = Jt(Gt.from(t));
	return Math.sqrt((n - a) ** 2 + (r - o) ** 2 + (i - s) ** 2);
}
var Xt = {
	deltaE76: Ne,
	deltaECMC: Fe,
	deltaE2000: Se,
	deltaEJz: tt,
	deltaEITP: gt,
	deltaEOK: Oe,
	deltaEHCT: Yt
};
function Zt(e) {
	return Math.max(parseFloat(`1e${(e ? Math.floor(Math.log10(Math.abs(e))) : 0) - 2}`), 1e-6);
}
var Qt = {
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
function $t(e, { method: t = E.gamut_mapping, space: n = void 0, deltaEMethod: r = "", jnd: i = 2, blackWhiteClamp: a = {} } = {}) {
	if (e = k(e), s(arguments[1]) ? n = arguments[1] : n ||= e.space, n = A.get(n), Ae(e, n, { epsilon: 0 })) return e;
	let o;
	if (t === "css") o = tn(e, { space: n });
	else {
		if (t !== "clip" && !Ae(e, n)) {
			Object.prototype.hasOwnProperty.call(Qt, t) && ({method: t, jnd: i, deltaEMethod: r, blackWhiteClamp: a} = Qt[t]);
			let s = Se;
			if (r !== "") {
				for (let e in Xt) if ("deltae" + r.toLowerCase() === e.toLowerCase()) {
					s = Xt[e];
					break;
				}
			}
			let c = $t(L(e, n), {
				method: "clip",
				space: n
			});
			if (s(e, c) > i) {
				if (Object.keys(a).length === 3) {
					let t = A.resolveCoord(a.channel), n = N(L(e, t.space), t.id);
					if (u(n) && (n = 0), n >= a.max) return L({
						space: "xyz-d65",
						coords: D.D65
					}, e.space);
					if (n <= a.min) return L({
						space: "xyz-d65",
						coords: [
							0,
							0,
							0
						]
					}, e.space);
				}
				let r = A.resolveCoord(t), c = r.space, l = r.id, d = L(e, c);
				d.coords.forEach((e, t) => {
					u(e) && (d.coords[t] = 0);
				});
				let f = (r.range || r.refRange)[0], p = Zt(i), m = f, h = N(d, l);
				for (; h - m > p;) {
					let e = je(d);
					e = $t(e, {
						space: n,
						method: "clip"
					}), s(d, e) - i < p ? m = N(d, l) : h = N(d, l), P(d, l, (m + h) / 2);
				}
				o = L(d, n);
			} else o = c;
		} else o = L(e, n);
		if (t === "clip" || !Ae(o, n, { epsilon: 0 })) {
			let e = Object.values(n.coords).map((e) => e.range || []);
			o.coords = o.coords.map((t, n) => {
				let [r, i] = e[n];
				return r !== void 0 && (t = Math.max(r, t)), i !== void 0 && (t = Math.min(t, i)), t;
			});
		}
	}
	return n !== e.space && (o = L(o, e.space)), e.coords = o.coords, e;
}
$t.returns = "color";
var en = {
	WHITE: {
		space: De,
		coords: [
			1,
			0,
			0
		]
	},
	BLACK: {
		space: De,
		coords: [
			0,
			0,
			0
		]
	}
};
function tn(e, { space: t } = {}) {
	let n = .02, r = 1e-4;
	e = k(e), t ||= e.space, t = A.get(t);
	let i = A.get("oklch");
	if (t.isUnbounded) return L(e, t);
	let a = L(e, i), o = a.coords[0];
	if (o >= 1) {
		let n = L(en.WHITE, t);
		return n.alpha = e.alpha, L(n, t);
	}
	if (o <= 0) {
		let n = L(en.BLACK, t);
		return n.alpha = e.alpha, L(n, t);
	}
	if (Ae(a, t, { epsilon: 0 })) return L(a, t);
	function s(e) {
		let n = L(e, t), r = Object.values(t.coords);
		return n.coords = n.coords.map((e, t) => {
			if ("range" in r[t]) {
				let [n, i] = r[t].range;
				return b(n, e, i);
			}
			return e;
		}), n;
	}
	let c = 0, l = a.coords[1], u = !0, d = je(a), f = s(d), p = Oe(f, d);
	if (p < n) return f;
	for (; l - c > r;) {
		let e = (c + l) / 2;
		if (d.coords[1] = e, u && Ae(d, t, { epsilon: 0 })) c = e;
		else if (f = s(d), p = Oe(f, d), p < n) {
			if (n - p < r) break;
			u = !1, c = e;
		} else l = e;
	}
	return f;
}
function L(e, t, { inGamut: n } = {}) {
	e = k(e), t = A.get(t);
	let r = t.from(e), i = {
		space: t,
		coords: r,
		alpha: e.alpha
	};
	return n && (i = $t(i, n === !0 ? void 0 : n)), i;
}
L.returns = "color";
function nn(e, { precision: t = E.precision, format: n = "default", inGamut: r = !0, ...i } = {}) {
	let a;
	e = k(e);
	let o = n;
	n = e.space.getFormat(n) ?? e.space.getFormat("default") ?? A.DEFAULT_FORMAT;
	let s = e.coords.slice();
	if (r ||= n.toGamut, r && !Ae(e) && (s = $t(je(e), r === !0 ? void 0 : r).coords), n.type === "custom") if (i.precision = t, n.serialize) a = n.serialize(s, e.alpha, i);
	else throw TypeError(`format ${o} can only be used to parse colors, not for serialization`);
	else {
		let r = n.name || "color";
		n.serializeCoords ? s = n.serializeCoords(s, t) : t !== null && (s = s.map((e) => l(e, { precision: t })));
		let i = [...s];
		if (r === "color") {
			let t = n.id || n.ids?.[0] || e.space.id;
			i.unshift(t);
		}
		let o = e.alpha;
		t !== null && (o = l(o, { precision: t }));
		let c = e.alpha >= 1 || n.noAlpha ? "" : `${n.commas ? "," : " /"} ${o}`;
		a = `${r}(${i.join(n.commas ? ", " : " ")}${c})`;
	}
	return a;
}
var rn = new M({
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
}), an = 1.09929682680944, on = .018053968510807, sn = new M({
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
}), cn = new M({
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
], R = [
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
], un = new M({
	id: "srgb-linear",
	name: "Linear sRGB",
	white: "D65",
	toXYZ_M: ln,
	fromXYZ_M: R
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
].fill("<number>[0, 255]"), mn = new M({
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
}), hn = new M({
	id: "p3",
	cssId: "display-p3",
	name: "P3",
	base: cn,
	fromBase: mn.fromBase,
	toBase: mn.toBase
});
E.display_space = mn;
var gn;
if (typeof CSS < "u" && CSS.supports) for (let e of [
	F,
	sn,
	hn
]) {
	let t = nn({
		space: e,
		coords: e.getMinCoords(),
		alpha: 1
	});
	if (CSS.supports("color", t)) {
		E.display_space = e;
		break;
	}
}
function _n(e, { space: t = E.display_space, ...n } = {}) {
	let r = nn(e, n);
	if (typeof CSS > "u" || CSS.supports("color", r) || !E.display_space) r = new String(r), r.color = e;
	else {
		let i = e;
		if ((e.coords.some(u) || u(e.alpha)) && !(gn ??= CSS.supports("color", "hsl(none 50% 50%)")) && (i = je(e), i.coords = i.coords.map(d), i.alpha = d(i.alpha), r = nn(i, n), CSS.supports("color", r))) return r = new String(r), r.color = i, r;
		i = L(i, t), r = new String(nn(i, n)), r.color = i;
	}
	return r;
}
function vn(e, t) {
	return e = k(e), t = k(t), e.space === t.space && e.alpha === t.alpha && e.coords.every((e, n) => e === t.coords[n]);
}
function yn(e) {
	return N(e, [j, "y"]);
}
function bn(e, t) {
	P(e, [j, "y"], t);
}
function xn(e) {
	Object.defineProperty(e.prototype, "luminance", {
		get() {
			return yn(this);
		},
		set(e) {
			bn(this, e);
		}
	});
}
var Sn = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	getLuminance: yn,
	register: xn,
	setLuminance: bn
});
function Cn(e, t) {
	e = k(e), t = k(t);
	let n = Math.max(yn(e), 0), r = Math.max(yn(t), 0);
	return r > n && ([n, r] = [r, n]), (n + .05) / (r + .05);
}
var wn = .56, Tn = .57, En = .62, Dn = .65, On = .022, kn = 1.414, An = .1, jn = 5e-4, Mn = 1.14, Nn = .027, Pn = 1.14;
function Fn(e) {
	return e >= On ? e : e + (On - e) ** kn;
}
function In(e) {
	return (e < 0 ? -1 : 1) * Math.abs(e) ** 2.4;
}
function Ln(e, t) {
	t = k(t), e = k(e);
	let n, r, i, a, o, s;
	t = L(t, "srgb"), [a, o, s] = t.coords;
	let c = In(a) * .2126729 + In(o) * .7151522 + In(s) * .072175;
	e = L(e, "srgb"), [a, o, s] = e.coords;
	let l = In(a) * .2126729 + In(o) * .7151522 + In(s) * .072175, u = Fn(c), d = Fn(l), f = d > u;
	return Math.abs(d - u) < jn ? r = 0 : f ? (n = d ** wn - u ** Tn, r = n * Mn) : (n = d ** Dn - u ** En, r = n * Pn), i = Math.abs(r) < An ? 0 : r > 0 ? r - Nn : r + Nn, i * 100;
}
function Rn(e, t) {
	e = k(e), t = k(t);
	let n = Math.max(yn(e), 0), r = Math.max(yn(t), 0);
	r > n && ([n, r] = [r, n]);
	let i = n + r;
	return i === 0 ? 0 : (n - r) / i;
}
var zn = 5e4;
function Bn(e, t) {
	e = k(e), t = k(t);
	let n = Math.max(yn(e), 0), r = Math.max(yn(t), 0);
	return r > n && ([n, r] = [r, n]), r === 0 ? zn : (n - r) / r;
}
function Vn(e, t) {
	e = k(e), t = k(t);
	let n = N(e, [F, "l"]), r = N(t, [F, "l"]);
	return Math.abs(n - r);
}
var Hn = 216 / 24389, Un = 24 / 116, Wn = 24389 / 27, Gn = D.D65, Kn = new A({
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
	white: Gn,
	base: j,
	fromBase(e) {
		let t = e.map((e, t) => e / Gn[t]).map((e) => e > Hn ? Math.cbrt(e) : (Wn * e + 16) / 116);
		return [
			116 * t[1] - 16,
			500 * (t[0] - t[1]),
			200 * (t[1] - t[2])
		];
	},
	toBase(e) {
		let t = [];
		return t[1] = (e[0] + 16) / 116, t[0] = e[1] / 500 + t[1], t[2] = t[1] - e[2] / 200, [
			t[0] > Un ? t[0] ** 3 : (116 * t[0] - 16) / Wn,
			e[0] > 8 ? ((e[0] + 16) / 116) ** 3 : e[0] / Wn,
			t[2] > Un ? t[2] ** 3 : (116 * t[2] - 16) / Wn
		].map((e, t) => e * Gn[t]);
	},
	formats: { "lab-d65": { coords: [
		"<number> | <percentage>",
		"<number> | <percentage>[-1,1]",
		"<number> | <percentage>[-1,1]"
	] } }
}), qn = 5 ** .5 * .5 + .5;
function Jn(e, t) {
	e = k(e), t = k(t);
	let n = N(e, [Kn, "l"]), r = N(t, [Kn, "l"]), i = Math.abs(n ** +qn - r ** +qn) ** (1 / qn) * Math.SQRT2 - 40;
	return i < 7.5 ? 0 : i;
}
var Yn = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	contrastAPCA: Ln,
	contrastDeltaPhi: Jn,
	contrastLstar: Vn,
	contrastMichelson: Rn,
	contrastWCAG21: Cn,
	contrastWeber: Bn
});
function Xn(e, t, n = {}) {
	s(n) && (n = { algorithm: n });
	let { algorithm: r, ...i } = n;
	if (!r) {
		let e = Object.keys(Yn).map((e) => e.replace(/^contrast/, "")).join(", ");
		throw TypeError(`contrast() function needs a contrast algorithm. Please specify one of: ${e}`);
	}
	e = k(e), t = k(t);
	for (let n in Yn) if ("contrast" + r.toLowerCase() === n.toLowerCase()) return Yn[n](e, t, i);
	throw TypeError(`Unknown contrast algorithm: ${r}`);
}
function Zn(e) {
	let [t, n, r] = ce(e, j), i = t + 15 * n + 3 * r;
	return [4 * t / i, 9 * n / i];
}
function Qn(e) {
	let [t, n, r] = ce(e, j), i = t + n + r;
	return [t / i, n / i];
}
function $n(e) {
	Object.defineProperty(e.prototype, "uv", { get() {
		return Zn(this);
	} }), Object.defineProperty(e.prototype, "xy", { get() {
		return Qn(this);
	} });
}
var er = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	register: $n,
	uv: Zn,
	xy: Qn
});
function tr(e, t, n = {}) {
	s(n) && (n = { method: n });
	let { method: r = E.deltaE, ...i } = n;
	for (let n in Xt) if ("deltae" + r.toLowerCase() === n.toLowerCase()) return Xt[n](e, t, i);
	throw TypeError(`Unknown deltaE method: ${r}`);
}
function nr(e, t = .25) {
	return P(e, [A.get("oklch", "lch"), "l"], (e) => e * (1 + t));
}
function rr(e, t = .25) {
	return P(e, [A.get("oklch", "lch"), "l"], (e) => e * (1 - t));
}
var ir = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	darken: rr,
	lighten: nr
});
function ar(e, t, n = .5, r = {}) {
	return [e, t] = [k(e), k(t)], c(n) === "object" && ([n, r] = [.5, n]), sr(e, t, r)(n);
}
function or(e, t, n = {}) {
	let r;
	cr(e) && ([r, n] = [e, t], [e, t] = r.rangeArgs.colors);
	let { maxDeltaE: i, deltaEMethod: a, steps: o = 2, maxSteps: s = 1e3, ...c } = n;
	r ||= ([e, t] = [k(e), k(t)], sr(e, t, c));
	let l = tr(e, t), u = i > 0 ? Math.max(o, Math.ceil(l / i) + 1) : o, d = [];
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
			let r = tr(t.color, d[n - 1].color, a);
			return Math.max(e, r);
		}, 0);
		for (; e > i;) {
			e = 0;
			for (let t = 1; t < d.length && d.length < s; t++) {
				let n = d[t - 1], i = d[t], a = (i.p + n.p) / 2, o = r(a);
				e = Math.max(e, tr(o, n.color), tr(o, i.color)), d.splice(t, 0, {
					p: a,
					color: r(a)
				}), t++;
			}
		}
	}
	return d = d.map((e) => e.color), d;
}
function sr(e, t, n = {}) {
	if (cr(e)) {
		let [n, r] = [e, t];
		return sr(...n.rangeArgs.colors, {
			...n.rangeArgs.options,
			...r
		});
	}
	let { space: r, outputSpace: i, progression: a, premultiplied: o } = n;
	e = k(e), t = k(t), e = je(e), t = je(t);
	let s = {
		colors: [e, t],
		options: n
	};
	if (r = r ? A.get(r) : A.registry[E.interpolationSpace] || e.space, i = i ? A.get(i) : r, e = L(e, r), t = L(t, r), e = $t(e), t = $t(t), r.coords.h && r.coords.h.type === "angle") {
		let i = n.hue = n.hue || "shorter", a = [r, "h"], [o, s] = [N(e, a), N(t, a)];
		isNaN(o) && !isNaN(s) ? o = s : isNaN(s) && !isNaN(o) && (s = o), [o, s] = he(i, [o, s]), P(e, a, o), P(t, a, s);
	}
	return o && (e.coords = e.coords.map((t) => t * e.alpha), t.coords = t.coords.map((e) => e * t.alpha)), Object.assign((n) => {
		n = a ? a(n) : n;
		let s = e.coords.map((e, r) => {
			let i = t.coords[r];
			return g(e, i, n);
		}), c = g(e.alpha, t.alpha, n), l = {
			space: r,
			coords: s,
			alpha: c
		};
		return o && (l.coords = l.coords.map((e) => e / c)), i !== r && (l = L(l, i)), l;
	}, { rangeArgs: s });
}
function cr(e) {
	return c(e) === "function" && !!e.rangeArgs;
}
E.interpolationSpace = "lab";
function lr(e) {
	e.defineFunction("mix", ar, { returns: "color" }), e.defineFunction("range", sr, { returns: "function<color>" }), e.defineFunction("steps", or, { returns: "array<color>" });
}
var ur = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	isRange: cr,
	mix: ar,
	range: sr,
	register: lr,
	steps: or
}), dr = new A({
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
}), fr = new A({
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
	base: dr,
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
}), pr = new A({
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
	base: fr,
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
}), mr = new M({
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
}), hr = new M({
	id: "a98rgb",
	cssId: "a98-rgb",
	name: "Adobe® 98 RGB compatible",
	base: mr,
	toBase: (e) => e.map((e) => Math.abs(e) ** (563 / 256) * Math.sign(e)),
	fromBase: (e) => e.map((e) => Math.abs(e) ** (256 / 563) * Math.sign(e))
}), gr = new M({
	id: "prophoto-linear",
	cssId: "--prophoto-rgb-linear",
	name: "Linear ProPhoto",
	white: "D50",
	base: ue,
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
}), _r = 1 / 512, vr = 16 / 512, yr = new M({
	id: "prophoto",
	cssId: "prophoto-rgb",
	name: "ProPhoto",
	base: gr,
	toBase(e) {
		return e.map((e) => e < vr ? e / 16 : e ** 1.8);
	},
	fromBase(e) {
		return e.map((e) => e >= _r ? e ** (1 / 1.8) : 16 * e);
	}
}), br = new A({
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
	base: De,
	fromBase(e) {
		let [t, n, r] = e, i, a = 2e-4;
		return i = Math.abs(n) < a && Math.abs(r) < a ? NaN : Math.atan2(r, n) * 180 / Math.PI, [
			t,
			Math.sqrt(n ** 2 + r ** 2),
			I(i)
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
}), xr = D.D65, Sr = 216 / 24389, Cr = 24389 / 27, [wr, Tr] = Zn({
	space: j,
	coords: xr
}), Er = new A({
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
	white: xr,
	base: j,
	fromBase(e) {
		let t = [
			d(e[0]),
			d(e[1]),
			d(e[2])
		], n = t[1], [r, i] = Zn({
			space: j,
			coords: t
		});
		if (!Number.isFinite(r) || !Number.isFinite(i)) return [
			0,
			0,
			0
		];
		let a = n <= Sr ? Cr * n : 116 * Math.cbrt(n) - 16;
		return [
			a,
			13 * a * (r - wr),
			13 * a * (i - Tr)
		];
	},
	toBase(e) {
		let [t, n, r] = e;
		if (t === 0 || u(t)) return [
			0,
			0,
			0
		];
		n = d(n), r = d(r);
		let i = n / (13 * t) + wr, a = r / (13 * t) + Tr, o = t <= 8 ? t / Cr : ((t + 16) / 116) ** 3;
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
}), Dr = new A({
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
	base: Er,
	fromBase(e) {
		let [t, n, r] = e, i, a = .02;
		return i = Math.abs(n) < a && Math.abs(r) < a ? NaN : Math.atan2(r, n) * 180 / Math.PI, [
			t,
			Math.sqrt(n ** 2 + r ** 2),
			I(i)
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
}), Or = 216 / 24389, kr = 24389 / 27, Ar = R[0][0], jr = R[0][1], Mr = R[0][2], Nr = R[1][0], Pr = R[1][1], Fr = R[1][2], Ir = R[2][0], Lr = R[2][1], Rr = R[2][2];
function zr(e, t, n) {
	let r = t / (Math.sin(n) - e * Math.cos(n));
	return r < 0 ? Infinity : r;
}
function Br(e) {
	let t = (e + 16) ** 3 / 1560896, n = t > Or ? t : e / kr, r = n * (284517 * Ar - 94839 * Mr), i = n * (838422 * Mr + 769860 * jr + 731718 * Ar), a = n * (632260 * Mr - 126452 * jr), o = n * (284517 * Nr - 94839 * Fr), s = n * (838422 * Fr + 769860 * Pr + 731718 * Nr), c = n * (632260 * Fr - 126452 * Pr), l = n * (284517 * Ir - 94839 * Rr), u = n * (838422 * Rr + 769860 * Lr + 731718 * Ir), d = n * (632260 * Rr - 126452 * Lr);
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
function Vr(e, t) {
	let n = t / 360 * Math.PI * 2, r = zr(e.r0s, e.r0i, n), i = zr(e.r1s, e.r1i, n), a = zr(e.g0s, e.g0i, n), o = zr(e.g1s, e.g1i, n), s = zr(e.b0s, e.b0i, n), c = zr(e.b1s, e.b1i, n);
	return Math.min(r, i, a, o, s, c);
}
var Hr = new A({
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
	base: Dr,
	gamutSpace: mn,
	fromBase(e) {
		let [t, n, r] = [
			d(e[0]),
			d(e[1]),
			d(e[2])
		], i;
		return t > 99.9999999 ? (i = 0, t = 100) : t < 1e-8 ? (i = 0, t = 0) : i = n / Vr(Br(t), r) * 100, [
			r,
			i,
			t
		];
	},
	toBase(e) {
		let [t, n, r] = [
			d(e[0]),
			d(e[1]),
			d(e[2])
		], i;
		return r > 99.9999999 ? (r = 100, i = 0) : r < 1e-8 ? (r = 0, i = 0) : i = Vr(Br(r), t) / 100 * n, [
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
R[0][0], R[0][1], R[0][2], R[1][0], R[1][1], R[1][2], R[2][0], R[2][1], R[2][2];
function Ur(e, t) {
	return Math.abs(t) / Math.sqrt(e ** 2 + 1);
}
function Wr(e) {
	let t = Ur(e.r0s, e.r0i), n = Ur(e.r1s, e.r1i), r = Ur(e.g0s, e.g0i), i = Ur(e.g1s, e.g1i), a = Ur(e.b0s, e.b0i), o = Ur(e.b1s, e.b1i);
	return Math.min(t, n, r, i, a, o);
}
var Gr = new A({
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
	base: Dr,
	gamutSpace: "self",
	fromBase(e) {
		let [t, n, r] = [
			d(e[0]),
			d(e[1]),
			d(e[2])
		], i;
		return t > 99.9999999 ? (i = 0, t = 100) : t < 1e-8 ? (i = 0, t = 0) : i = n / Wr(Br(t)) * 100, [
			r,
			i,
			t
		];
	},
	toBase(e) {
		let [t, n, r] = [
			d(e[0]),
			d(e[1]),
			d(e[2])
		], i;
		return r > 99.9999999 ? (r = 100, i = 0) : r < 1e-8 ? (r = 0, i = 0) : i = Wr(Br(r)) / 100 * n, [
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
}), Kr = 203, qr = 2610 / 2 ** 14, Jr = 2 ** 14 / 2610, Yr = 2523 / 2 ** 5, Xr = 2 ** 5 / 2523, Zr = 3424 / 2 ** 12, Qr = 2413 / 2 ** 7, $r = 2392 / 2 ** 7, ei = new M({
	id: "rec2100pq",
	cssId: "rec2100-pq",
	name: "REC.2100-PQ",
	base: rn,
	toBase(e) {
		return e.map(function(e) {
			return (Math.max(e ** Xr - Zr, 0) / (Qr - $r * e ** Xr)) ** Jr * 1e4 / Kr;
		});
	},
	fromBase(e) {
		return e.map(function(e) {
			let t = Math.max(e * Kr / 1e4, 0);
			return ((Zr + Qr * t ** qr) / (1 + $r * t ** qr)) ** Yr;
		});
	}
}), ti = .17883277, ni = .28466892, ri = .55991073, ii = 3.7743, ai = new M({
	id: "rec2100hlg",
	cssId: "rec2100-hlg",
	name: "REC.2100-HLG",
	referred: "scene",
	base: rn,
	toBase(e) {
		return e.map(function(e) {
			return e <= .5 ? e ** 2 / 3 * ii : (Math.exp((e - ri) / ti) + ni) / 12 * ii;
		});
	},
	fromBase(e) {
		return e.map(function(e) {
			return e /= ii, e <= 1 / 12 ? Math.sqrt(3 * e) : ti * Math.log(12 * e - ni) + ri;
		});
	}
}), oi = {};
T.add("chromatic-adaptation-start", (e) => {
	e.options.method && (e.M = ci(e.W1, e.W2, e.options.method));
}), T.add("chromatic-adaptation-end", (e) => {
	e.M ||= ci(e.W1, e.W2, e.options.method);
});
function si({ id: e, toCone_M: t, fromCone_M: n }) {
	oi[e] = arguments[0];
}
function ci(e, t, n = "Bradford") {
	let r = oi[n], [i, a, s] = o(r.toCone_M, e), [c, l, u] = o(r.toCone_M, t), d = o([
		[
			c / i,
			0,
			0
		],
		[
			0,
			l / a,
			0
		],
		[
			0,
			0,
			u / s
		]
	], r.toCone_M);
	return o(r.fromCone_M, d);
}
si({
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
}), si({
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
}), si({
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
}), si({
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
}), Object.assign(D, {
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
}), D.ACES = [
	.32168 / .33767,
	1,
	.34065 / .33767
];
var li = new M({
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
	white: D.ACES,
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
}), ui = 2 ** -16, di = -.35828683, fi = (Math.log2(65504) + 9.72) / 17.52, pi = new M({
	id: "acescc",
	cssId: "--acescc",
	name: "ACEScc",
	coords: {
		r: {
			range: [di, fi],
			name: "Red"
		},
		g: {
			range: [di, fi],
			name: "Green"
		},
		b: {
			range: [di, fi],
			name: "Blue"
		}
	},
	referred: "scene",
	base: li,
	toBase(e) {
		return e.map(function(e) {
			return e <= -.3013698630136986 ? (2 ** (e * 17.52 - 9.72) - ui) * 2 : e < fi ? 2 ** (e * 17.52 - 9.72) : 65504;
		});
	},
	fromBase(e) {
		return e.map(function(e) {
			return e <= 0 ? (Math.log2(ui) + 9.72) / 17.52 : e < ui ? (Math.log2(ui + e * .5) + 9.72) / 17.52 : (Math.log2(e) + 9.72) / 17.52;
		});
	}
}), mi = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	A98RGB: hr,
	A98RGB_Linear: mr,
	ACEScc: pi,
	ACEScg: li,
	CAM16_JMh: It,
	HCT: Gt,
	HPLuv: Gr,
	HSL: dr,
	HSLuv: Hr,
	HSV: fr,
	HWB: pr,
	ICTCP: pt,
	JzCzHz: et,
	Jzazbz: $e,
	LCH: ge,
	LCHuv: Dr,
	Lab: F,
	Lab_D65: Kn,
	Luv: Er,
	OKLCH: br,
	OKLab: De,
	P3: hn,
	P3_Linear: cn,
	ProPhoto: yr,
	ProPhoto_Linear: gr,
	REC_2020: sn,
	REC_2020_Linear: rn,
	REC_2100_HLG: ai,
	REC_2100_PQ: ei,
	XYZ_ABS_D65: Le,
	XYZ_D50: ue,
	XYZ_D65: j,
	sRGB: mn,
	sRGB_Linear: un
}), z = class e {
	constructor(...e) {
		let t;
		e.length === 1 && (t = k(e[0]));
		let n, r, i;
		t ? (n = t.space || t.spaceId, r = t.coords, i = t.alpha) : [n, r, i] = e, Object.defineProperty(this, "space", {
			value: A.get(n),
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
z.defineFunctions({
	get: N,
	getAll: ce,
	set: P,
	setAll: le,
	to: L,
	equals: vn,
	inGamut: Ae,
	toGamut: $t,
	distance: Me,
	toString: nn
}), Object.assign(z, {
	util: ee,
	hooks: T,
	WHITES: D,
	Space: A,
	spaces: A.registry,
	parse: ie,
	defaults: E
});
for (let e of Object.keys(mi)) A.register(mi[e]);
for (let e in A.registry) hi(e, A.registry[e]);
T.add("colorspace-init-end", (e) => {
	hi(e.id, e), e.aliases?.forEach((t) => {
		hi(t, e);
	});
});
function hi(e, t) {
	let n = e.replace(/-/g, "_");
	Object.defineProperty(z.prototype, n, {
		get() {
			let n = this.getAll(e);
			return typeof Proxy > "u" ? n : new Proxy(n, {
				has: (e, n) => {
					try {
						return A.resolveCoord([t, n]), !0;
					} catch {}
					return Reflect.has(e, n);
				},
				get: (e, n, r) => {
					if (n && typeof n != "symbol" && !(n in e)) {
						let { index: r } = A.resolveCoord([t, n]);
						if (r >= 0) return e[r];
					}
					return Reflect.get(e, n, r);
				},
				set: (n, r, i, a) => {
					if (r && typeof r != "symbol" && !(r in n) || r >= 0) {
						let { index: a } = A.resolveCoord([t, r]);
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
z.extend(Xt), z.extend({ deltaE: tr }), Object.assign(z, { deltaEMethods: Xt }), z.extend(ir), z.extend({ contrast: Xn }), z.extend(er), z.extend(Sn), z.extend(ur), z.extend(Yn);
//#endregion
//#region src/features/color-system/outputSettings.ts
var gi = [
	"srgb",
	"display-p3",
	"rec2020"
], _i = [
	"rgb",
	"oklch",
	"hex",
	"hsl"
], vi = {
	authoringGamut: "srgb",
	outputFormat: "rgb",
	mapOutputsToSrgb: !1
}, yi = {
	srgb: "sRGB",
	"display-p3": "Display P3",
	rec2020: "Rec 2020"
};
function B(e) {
	return e.mapOutputsToSrgb ? "srgb" : e.authoringGamut;
}
function bi(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) return !1;
	let t = e;
	return Object.keys(t).length === 3 && gi.some((e) => e === t.authoringGamut) && _i.some((e) => e === t.outputFormat) && typeof t.mapOutputsToSrgb == "boolean" && (t.mapOutputsToSrgb || t.authoringGamut === "srgb" || t.outputFormat === "rgb" || t.outputFormat === "oklch");
}
function xi(e) {
	if (e === "srgb") return {
		...vi,
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
function V(e) {
	return e === "display-p3" ? "p3" : e;
}
function H(e) {
	if (!Number.isFinite(e)) throw Error("Color output contains an unavailable channel.");
	let t = e.toFixed(2);
	return Number(t) === 0 ? "0" : t.replace(/(?:\.0+|(\.\d*?)0+)$/, "$1");
}
function Si(e) {
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
function Ci(e, t, n) {
	if (n.outputFormat === "hex") {
		let n = (e) => Math.round(Math.min(1, Math.max(0, e)) * 255).toString(16).padStart(2, "0"), r = n(t);
		return `#${e.map(n).join("")}${r === "ff" ? "" : r}`;
	}
	let r = t === 1 ? "" : ` / ${H(t)}`, i = e.map((e) => Math.min(1, Math.max(0, e)));
	if (B(n) === "srgb") {
		let e = i.map((e) => Math.round(e * 255)).join(", ");
		return t === 1 ? `rgb(${e})` : `rgba(${e}, ${H(t)})`;
	}
	return `color(${B(n)} ${i.map(H).join(" ")}${r})`;
}
function wi(e, t, n, r, i) {
	let a = Number(H(e * 100)) / 100, o = Number(H(n)) % 360, s = 25e3, c = 0, l = Math.round(t * s), u = V(B(i)), d = (e) => new z("oklch", [
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
	return `oklch(${H(a * 100)}% ${H(l / 100)}% ${l === 0 ? "0" : H(o)}${r})`;
}
function Ti(e, t) {
	let n = V(B(t));
	if (bi(t) && (t.outputFormat === "hex" || t.outputFormat === "rgb") && e.length === 3 && e.every((e) => Number.isFinite(e) && e >= 0 && e <= 1)) {
		let r = z.Space.get(`${n}-linear`).to(n, [...e]);
		if (r.some((e) => e === null || !Number.isFinite(e))) throw Error("Color output contains an unavailable channel.");
		return Ci(r.map(Number), 1, t);
	}
	return U(new z(`${n}-linear`, [...e]), t);
}
function Ei(e, t) {
	if (!bi(t)) throw Error("Invalid color output configuration.");
	let n = Number(e.alpha);
	if (e.alpha === null || !Number.isFinite(n) || n < 0 || n > 1) throw Error("Color output has invalid opacity.");
	let r = e.clone();
	r.coords = Si(e), r.alpha = n;
	let i = V(B(t));
	return r.toGamut({
		space: i,
		method: "css"
	}).to(i);
}
function U(e, t) {
	let n = Ei(e, t), r = t.outputFormat === "hex" ? Number(n.alpha) : Number(H(Number(n.alpha))), i = r === 1 ? "" : ` / ${H(r)}`;
	if (t.outputFormat === "hex" || t.outputFormat === "rgb") return Ci(Si(n), r, t);
	if (t.outputFormat === "hsl") {
		let e = n.to("hsl");
		Number.isFinite(e.coords[0]) || (e.coords[0] = 0);
		let [t, r, a] = Si(e);
		return `hsl(${H(t)} ${H(r)}% ${H(a)}%${i})`;
	}
	let a = n.to("oklch"), o = Si(n);
	if (Math.max(...o) - Math.min(...o) < 1e-12) {
		let e = Si(n.to(`${V(B(t))}-linear`));
		return wi(Math.cbrt(e[0]), 0, 0, i, t);
	}
	Number.isFinite(a.coords[2]) || (a.coords[2] = 0);
	let [s, c, l] = Si(a);
	return wi(s, c, l, i, t);
}
//#endregion
//#region src/features/color-system/colorMath.ts
function W(e) {
	return Math.min(1, Math.max(0, e));
}
function Di(e, t) {
	return [
		t(e[0], 0),
		t(e[1], 1),
		t(e[2], 2)
	];
}
function Oi(e, t = "srgb") {
	if (t === "rec2020") {
		let t = Math.abs(e), n = t < .0812428582986315 ? t / 4.5 : ((t + .09929682680944) / 1.09929682680944) ** (1 / .45);
		return Math.sign(e) * n;
	}
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function ki(e, t = "srgb") {
	if (t === "rec2020") {
		let t = Math.abs(e), n = t < .018053968510807 ? 4.5 * t : 1.09929682680944 * t ** .45 - .09929682680944;
		return Math.sign(e) * n;
	}
	return e <= .0031308 ? e * 12.92 : 1.055 * e ** (1 / 2.4) - .055;
}
function Ai(e, t, n) {
	return t === n ? e : Mi(ji(e, t), n);
}
function ji([e, t, n], r = "srgb") {
	return qi(Gi[r], [
		e,
		t,
		n
	]);
}
function Mi([e, t, n], r = "srgb") {
	return qi(Ki[r], [
		e,
		t,
		n
	]);
}
function Ni(e, t = "srgb") {
	return `#${Ai(e, t, "srgb").map((e) => Math.round(W(ki(e)) * 255).toString(16).padStart(2, "0")).join("")}`;
}
function Pi(e) {
	return typeof e == "object" ? e : {
		authoringGamut: e === "oklch" ? "srgb" : e,
		outputFormat: e === "srgb" ? "hex" : e === "oklch" ? "oklch" : "rgb",
		mapOutputsToSrgb: !1
	};
}
function G(e, t = "srgb", n = K(t)) {
	let r = Pi(t);
	return n === B(r) ? Ti(e, r) : U(new z(`${V(n)}-linear`, [...e]), r);
}
function K(e) {
	return typeof e == "object" ? B(e) : e === "oklch" ? "srgb" : e;
}
function q([e, t, n], r = "srgb") {
	return e === t && t === n ? e : r === "rec2020" ? .2627002120112671 * e + .6779980715188708 * t + .05930171646986196 * n : r === "display-p3" ? .2289745640697488 * e + .6917385218365064 * t + .079286914093745 * n : .2126 * e + .7152 * t + .0722 * n;
}
function Fi(e, t) {
	return (Math.max(e, t) + .05) / (Math.min(e, t) + .05);
}
function Ii(e, t, n) {
	return W(n ? (e + .05) / t - .05 : t * (e + .05) - .05);
}
function Li([e, t, n]) {
	let r = .4122214708 * e + .5363325363 * t + .0514459929 * n, i = .2119034982 * e + .6806995451 * t + .1073969566 * n, a = .0883024619 * e + .2817188376 * t + .6299787005 * n, o = Math.cbrt(r), s = Math.cbrt(i), c = Math.cbrt(a);
	return [
		.2104542553 * o + .793617785 * s - .0040720468 * c,
		1.9779984951 * o - 2.428592205 * s + .4505937099 * c,
		.0259040371 * o + .7827717662 * s - .808675766 * c
	];
}
function Ri([e, t, n]) {
	let r = (e + .3963377774 * t + .2158037573 * n) ** 3, i = (e - .1055613458 * t - .0638541728 * n) ** 3, a = (e - .0894841775 * t - 1.291485548 * n) ** 3;
	return [
		4.0767416621 * r - 3.3077115913 * i + .2309699292 * a,
		-1.2684380046 * r + 2.6097574011 * i - .3413193965 * a,
		-.0041960863 * r - .7034186147 * i + 1.707614701 * a
	];
}
function zi([e, t, n]) {
	return [
		e,
		Math.hypot(t, n),
		(Math.atan2(n, t) * 180 / Math.PI + 360) % 360
	];
}
function Bi([e, t, n]) {
	let r = n * Math.PI / 180;
	return [
		e,
		t * Math.cos(r),
		t * Math.sin(r)
	];
}
function Vi(e) {
	return Ri(Bi(e));
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
		Ui(new z(e, [
			1,
			0,
			0
		]).to(t)),
		Ui(new z(e, [
			0,
			1,
			0
		]).to(t)),
		Ui(new z(e, [
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
	if (i) return Ui(new z("oklch", [
		e,
		t,
		n
	]).toGamut({
		space: V(r),
		method: "css"
	}).to(`${V(r)}-linear`));
	let a = (e) => Hi(Ai(e, "srgb", r)), o = Vi([
		e,
		t,
		n
	]);
	if (a(o)) return Ai(o, "srgb", r);
	let s = 0, c = t;
	for (let t = 0; t < 22; t += 1) {
		let t = (s + c) / 2;
		a(Vi([
			e,
			t,
			n
		])) ? s = t : c = t;
	}
	return Ai(Vi([
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
//#region src/features/color-system/paletteValue.ts
var Qi = .4;
function $i(e, t) {
	return Yi(e.lightness, e.chroma / 100 * Qi, e.hue, K(t), Ji(t));
}
function ea(e, t) {
	return G($i(e, t), t);
}
//#endregion
//#region src/features/color-system/scaleGeneration.ts
var ta = 2, na = 33, ra = [
	4,
	9,
	14,
	19,
	24,
	28
], ia = [
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
], aa = /* @__PURE__ */ new Map();
function oa(e, t) {
	return `${JSON.stringify(t)}|${e.id}|${e.name}|${e.stops.map((e) => `${e.lightness},${e.hue},${e.chroma}`).join(";")}`;
}
function sa(e) {
	return [...e].sort((e, t) => e.lightness - t.lightness);
}
function ca(e, t) {
	let n = sa(e);
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
function la(e, t, n = "srgb") {
	let r = K(n), i = W(t), { hue: a, chroma: o } = ca(e.stops, i), s = Yi(i, o / 100 * Qi, a, r, Ji(n));
	return {
		linear: s,
		css: G(s, n, r),
		hex: Ni(s, r),
		lightness: i,
		hue: a,
		chroma: o,
		gamut: r
	};
}
function ua(e, t = "srgb") {
	let n = K(t), r = Math.min(...e.stops.map((e) => e.lightness), 0), i = Math.max(...e.stops.map((e) => e.lightness), 1);
	return Array.from({ length: na }, (a, o) => {
		let s = r + (i - r) * o / (na - 1), { hue: c, chroma: l } = ca(e.stops, s), u = Yi(W(s), l / 100 * Qi, c, n, Ji(t));
		return {
			lightness: s,
			linear: u,
			luminance: q(u, n),
			hex: Ni(u, n),
			css: G(u, t, n)
		};
	}).sort((e, t) => e.luminance - t.luminance);
}
function da(e) {
	let t = [
		{
			luminance: 0,
			linear: [
				0,
				0,
				0
			]
		},
		...ra.map((t) => ({
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
	return t.sort((e, t) => e.luminance - t.luminance), t.filter((e, n) => n === 0 || e.luminance - t[n - 1].luminance >= 1e-4);
}
function fa(e, t) {
	let n = W(t);
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
function pa(e, t = "srgb") {
	let n = K(t), r = oa(e, t), i = aa.get(r);
	if (i) return i;
	let a = ua(e, t), o = da(a), s = {
		scale: e,
		neutral: e.stops.every((e) => e.chroma < ta),
		ramp: a,
		anchors: o,
		referencePalette: Object.fromEntries(ia.map((e) => [Math.round(e * 1e3), G(fa(o, e), t, n)])),
		gamut: n,
		output: t
	};
	if (aa.set(r, s), aa.size > 256) {
		let e = aa.keys().next().value;
		e && aa.delete(e);
	}
	return s;
}
var ma = 2, ha = 3, ga = 1, _a = 21;
function va(e) {
	return Math.min(_a, Math.max(ga, e));
}
function ya(e) {
	return e > 216 / 24389 ? 116 * Math.cbrt(e) - 16 : 24389 / 27 * e;
}
function ba(e) {
	return e > 8 ? ((e + 16) / 116) ** 3 : e * 27 / 24389;
}
function xa(e) {
	return ya(.05 * (va(e) - 1));
}
function Sa(e) {
	return va(1 + ba(Math.min(100, Math.max(0, e))) / .05);
}
function Ca(e, t) {
	return e + t * (1 - Math.exp(-e / ha)) * (1 - (e / 100) ** ma);
}
function wa(e, t) {
	let n = 0, r = 100;
	for (let i = 0; i < 40; i += 1) {
		let i = (n + r) / 2;
		Ca(i, t) < e ? n = i : r = i;
	}
	return (n + r) / 2;
}
function Ta(e) {
	return e.settings.contrastReference ?? "light";
}
function Ea(e) {
	return e.settings.polarityCompensation ?? 0;
}
function Da(e) {
	return e.settings.contrastMultiplier ?? 1;
}
function Oa(e, t) {
	return va((va(e) - 1) * Math.max(0, t) + 1);
}
function ka(e) {
	let t = Da(e);
	return t === 1 ? e : {
		...e,
		contrasts: e.contrasts.map((e) => ({
			...e,
			value: Oa(e.value, t)
		})),
		scales: e.scales.map((e) => e.customContrasts ? {
			...e,
			customContrasts: {
				...e.customContrasts,
				steps: e.customContrasts.steps.map((e) => ({
					...e,
					value: Oa(e.value, t)
				}))
			}
		} : e),
		surfaces: e.surfaces.map((e) => e.base || e.contrast === void 0 ? e : {
			...e,
			contrast: Oa(e.contrast, t)
		})
	};
}
function Aa(e, t, n) {
	let r = Math.min(1, Math.max(0, t)) * 12;
	if (r === 0) return va(e);
	let i = xa(e);
	return Sa(n === "light" ? Ca(i, r) : wa(i, r));
}
function ja(e, t) {
	let n = Math.min(100, Math.max(0, ya(e))) / 100;
	return t === "light" ? 1 - n : n;
}
function Ma(e, t) {
	return e.oppositeValue ?? Aa(e.value, t.strength, t.reference);
}
function Na(e, t) {
	let n = va(e.value);
	if (t.weight <= 0) return n;
	let r = Ma(e, t);
	return t.weight >= 1 ? va(r) : va(Math.exp(Math.log(n) + t.weight * (Math.log(r) - Math.log(n))));
}
function Pa(e) {
	return q(la(e.scales.find((t) => t.id === e.backgroundScaleId) ?? e.scales[0], e.backgroundLightness, e.settings.colorOutput).linear, K(e.settings.colorOutput));
}
function Fa(e) {
	let t = Ta(e);
	return {
		weight: ja(Pa(e), t),
		strength: Ea(e),
		reference: t
	};
}
function Ia(e) {
	let t = Fa(e), n = [...e.contrasts, ...e.scales.flatMap((e) => e.customContrasts?.steps ?? [])].some((e) => e.oppositeValue !== void 0);
	return t.weight === 0 || t.strength === 0 && !n ? e : {
		...e,
		contrasts: e.contrasts.map((e) => ({
			...e,
			value: Na(e, t)
		})),
		scales: e.scales.map((e) => e.customContrasts ? {
			...e,
			customContrasts: {
				...e.customContrasts,
				steps: e.customContrasts.steps.map((e) => ({
					...e,
					value: Na(e, t)
				}))
			}
		} : e),
		surfaces: e.surfaces.map((e) => e.base || e.contrast === void 0 ? e : {
			...e,
			contrast: Na({ value: e.contrast }, t)
		})
	};
}
//#endregion
//#region src/features/foundations/types.ts
function La(e) {
	return e.hideFromPublishing !== !0;
}
function Ra(e) {
	return e.hideFromPublishing === void 0 || typeof e.hideFromPublishing == "boolean";
}
//#endregion
//#region src/features/color-system/outputContrast.ts
var za = class extends Error {
	details;
	constructor(e) {
		super(`${e.source} cannot reach ${e.requestedContrast}:1 contrast against ${e.background} in ${yi[e.gamut]}. The achievable contrast is ${e.achievableContrast.toFixed(2)}:1. Change the target, background or contrast side before exporting.`), this.details = e, this.name = "ColorOutputError";
	}
}, Ba = /* @__PURE__ */ new Map(), Va = 0;
function Ha(e, t) {
	let n = `${t}\0${e}`, r = Ba.get(n);
	if (r) return r;
	let i = { color: new z(e) };
	if (n.length > 512) return i;
	for (; Ba.size >= 4096 || Va + n.length > 262144;) {
		let e = Ba.keys().next().value;
		if (e === void 0) break;
		Ba.delete(e), Va -= e.length;
	}
	return Ba.set(n, i), Va += n.length, i;
}
function Ua(e, t) {
	let n = Ha(e, t);
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
	let i = r.to(`${V(t)}-linear`).coords.map(Number);
	if (i.length !== 3 || !i.every(Number.isFinite)) throw Error(`Cannot measure output color ${e}.`);
	return n.linear = [
		i[0],
		i[1],
		i[2]
	], [...n.linear];
}
function Wa(e, t, n) {
	let r = Ha(e, n), i = Ha(t, n), a = r.color, o = i.color;
	if (Number(o.alpha) !== 1) throw Error("A contrast background must be opaque.");
	let s = Number(a.alpha);
	if (!Number.isFinite(s) || s < 0 || s > 1) throw Error("A contrast foreground has invalid opacity.");
	let c = (e) => {
		if (e.encoded) return e.encoded;
		let t = e.color;
		if (t.space.id === "oklch" && Number(t.coords[1]) === 0) {
			let r = ki(Number(t.coords[0]) ** 3, n);
			e.encoded = [
				r,
				r,
				r
			];
		} else e.encoded = t.to(V(n)).coords.map(Number);
		return e.encoded;
	}, l = c(r), u = c(i), d = l.map((e, t) => e * s + u[t] * (1 - s));
	if (!d.every(Number.isFinite)) throw Error("Cannot measure the composited output color.");
	return [
		Oi(d[0], n),
		Oi(d[1], n),
		Oi(d[2], n)
	];
}
function Ga(e, t, n) {
	return Fi(q(Wa(e, t, n), n), q(Ua(t, n), n));
}
function Ka(e) {
	if (!Number.isFinite(e) || e < 1 || e > 21) throw Error("Choose a finite contrast target from 1:1 to 21:1.");
}
function qa(e, t, n, r, i, a) {
	Ka(n);
	let o = B(r), s = /* @__PURE__ */ new Map(), c = (e) => {
		let n = Ti(e, r), i = s.get(n);
		if (i) return i;
		let a = {
			css: n,
			linear: Ua(n, o),
			measuredContrast: Ga(n, t, o)
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
function Ja(e, t, n, r, i, a) {
	let o = B(r), s = qa(e, t, n, r, i, a), c = (e) => {
		let n = new z(s.css);
		n.alpha = W(e);
		let i = U(n, r);
		return {
			css: i,
			linear: Wa(i, t, o),
			alpha: Number(new z(i).alpha),
			measuredContrast: Ga(i, t, o),
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
function J(e) {
	if (!e.trim() || /\b(?:var|env)\(|\bcurrentcolor\b/i.test(e)) throw Error(`Unavailable concrete color: ${e || "(empty)"}.`);
	let t;
	try {
		t = new z(e);
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
function Ya(e) {
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
function Xa(e) {
	return Ya(e.to("oklab"));
}
function Za(e, t, n = "srgb") {
	let r = V(n), i = J(e), a = J(t);
	if (i.inGamut(r) && a.inGamut(r)) return new z(`${r}-linear`, [...Wa(e, t, n)]).to(r);
	let o = i.toGamut({
		space: r,
		method: "css"
	}).to(r), s = a.toGamut({
		space: r,
		method: "css"
	}).to(r);
	if (s.alpha < 1) throw Error("The comparison background must be opaque.");
	let c = W(o.alpha), l = Ya(o), u = Ya(s);
	return new z(r, [
		l[0] * c + u[0] * (1 - c),
		l[1] * c + u[1] * (1 - c),
		l[2] * c + u[2] * (1 - c)
	]);
}
function Qa(e, t, n) {
	return eo(zi(e), t, n);
}
function $a(e, t, n) {
	return eo(e, t, n);
}
function eo([e, t, n], r, i) {
	if (typeof i == "object") {
		let a = new z("oklch", [
			W(e),
			t,
			n
		]);
		return a.alpha = r, U(a, i);
	}
	let a = Yi(W(e), t, n, K(i)), o = new z(`${V(K(i))}-linear`, [...a]);
	return o.alpha = r, U(o, Pi(i));
}
//#endregion
//#region src/features/color-system/data-vis/model.ts
var Y = (e) => typeof e == "object" && !!e && !Array.isArray(e), X = (e) => typeof e == "string" && e.trim().length > 0, Z = (e, t, n) => typeof e == "number" && Number.isFinite(e) && e >= t && e <= n;
function to(e) {
	return e === "protanopia" || e === "deuteranopia" || e === "tritanopia" || e === "achromatopsia";
}
function no(e) {
	return Y(e) && Z(e.lightness, 0, 1) && Z(e.hue, 0, 360) && Z(e.chroma, 0, 125);
}
function ro(e) {
	return Y(e) && e.kind === "ui-swatch" && X(e.scaleId) && X(e.contrastId);
}
function io(e) {
	return Y(e) && e.kind === "primitive-token" && X(e.tokenId);
}
function ao(e) {
	if (typeof e != "string") return !1;
	try {
		return J(e), !0;
	} catch {
		return !1;
	}
}
function oo(e) {
	return Y(e) && X(e.id) && ao(e.value) && (e.position === void 0 || Z(e.position, 0, 1)) && (e.tokenId === void 0 || X(e.tokenId)) && (e.overrideValue === void 0 || ao(e.overrideValue));
}
function so(e) {
	return e.overrideValue ?? e.value;
}
function co(e) {
	return Y(e) && Z(e.value, 1, 21) && (e.oppositeValue === void 0 || Z(e.oppositeValue, 1, 21));
}
function lo(e) {
	if (!Y(e) || !X(e.id) || !Z(e.position, 0, 1) || !Y(e.source)) return !1;
	if (ro(e.source) || io(e.source)) return e.contrast === void 0;
	let t = e.source;
	return co(e.contrast) && (t.kind === "key-color" && no(t.color) || t.kind === "ui-scale" && X(t.scaleId));
}
function uo(e) {
	return !Y(e) || !Y(e.size) ? !1 : (e.size.kind === "auto" || e.size.kind === "count" && typeof e.size.count == "number" && Number.isSafeInteger(e.size.count) && e.size.count >= 1) && Z(e.minimumBackgroundContrast, 1, 21) && typeof e.minimumDeltaE == "number" && Number.isFinite(e.minimumDeltaE) && e.minimumDeltaE >= 0 && Array.isArray(e.cvdProfiles) && e.cvdProfiles.every(to) && new Set(e.cvdProfiles).size === e.cvdProfiles.length && (e.style === "balanced" || e.style === "bold");
}
function fo(e) {
	if (!Y(e) || !X(e.id) || !X(e.name) || !Ra(e) || e.staticColors !== void 0 && (!Array.isArray(e.staticColors) || !e.staticColors.length || !e.staticColors.every(oo) || new Set(e.staticColors.map((e) => e.id)).size !== e.staticColors.length)) return !1;
	if (e.kind === "categorical") {
		let t = e.members;
		return Array.isArray(t) ? uo(e.preferences) && t.length > 0 && t.every((e) => Y(e) && X(e.id) && ro(e.source)) && new Set(t.map((e) => e.id)).size === t.length && (e.staticColors === void 0 || e.staticColors.length === t.length && e.staticColors.every((e) => e.position === void 0 && t.some((t) => t.id === e.id))) : !1;
	}
	if (e.kind !== "sequential" && e.kind !== "diverging" || !Array.isArray(e.points) || e.points.length < 2 || !e.points.every(lo)) return !1;
	let t = e.points;
	if (e.staticColors !== void 0) {
		let t = e.staticColors;
		if (t.length < 2 || t[0].position !== 0 || t.at(-1)?.position !== 1 || !t.every((e, n) => e.position !== void 0 && (n === 0 || e.position > t[n - 1].position)) || e.kind === "diverging" && !t.some((e) => e.position === .5)) return !1;
	}
	return t[0].position === 0 && t.at(-1)?.position === 1 && new Set(t.map((e) => e.id)).size === t.length && t.every((e, n) => n === 0 || e.position > t[n - 1].position) && (e.kind !== "diverging" || t.some((e) => e.position === .5));
}
function po(e) {
	return Array.isArray(e) && e.every(fo) && new Set(e.map((e) => e.id)).size === e.length;
}
function mo(e) {
	if (!Y(e) || !Object.keys(e).every((e) => [
		"color",
		"scaleId",
		"contrastId",
		"tokenId"
	].includes(e)) || e.scaleId !== void 0 && !X(e.scaleId) || e.contrastId !== void 0 && !X(e.contrastId) || e.tokenId !== void 0 && !X(e.tokenId)) return !1;
	if (e.color !== void 0) {
		let t = e.color;
		if (!Y(t) || !Object.keys(t).every((e) => [
			"lightness",
			"hue",
			"chroma"
		].includes(e)) || t.lightness !== void 0 && !Z(t.lightness, 0, 1) || t.hue !== void 0 && !Z(t.hue, 0, 360) || t.chroma !== void 0 && !Z(t.chroma, 0, 125)) return !1;
	}
	return !0;
}
function ho(e) {
	return Y(e) && Object.values(e).every((e) => Y(e) && Object.values(e).every(mo));
}
function go(e) {
	return Y(e) && Object.values(e).every((e) => Y(e) && Object.values(e).every((e) => Z(e, 1, 21)));
}
function _o(e, t, n) {
	let r = e.source;
	if (t) if (r.kind === "key-color") {
		if (t.scaleId !== void 0 || t.contrastId !== void 0 || t.tokenId !== void 0) throw Error(`Point ${e.id} requires a key-color patch.`);
		r = {
			...r,
			color: {
				...r.color,
				...t.color
			}
		};
	} else if (r.kind === "primitive-token") {
		if (t.color !== void 0 || t.scaleId !== void 0 || t.contrastId !== void 0) throw Error(`Point ${e.id} requires a primitive-token patch.`);
		r = {
			...r,
			...t.tokenId !== void 0 && { tokenId: t.tokenId }
		};
	} else if (r.kind === "ui-swatch" && t.tokenId !== void 0) {
		if (t.color !== void 0 || t.scaleId !== void 0 || t.contrastId !== void 0) throw Error(`Point ${e.id} requires one exact token source.`);
		r = {
			kind: "primitive-token",
			tokenId: t.tokenId
		};
	} else {
		if (t.color !== void 0 || t.tokenId !== void 0 || r.kind === "ui-scale" && t.contrastId !== void 0) throw Error(`Point ${e.id} requires a matching UI source patch.`);
		r = {
			...r,
			...t.scaleId !== void 0 && { scaleId: t.scaleId },
			...r.kind === "ui-swatch" && t.contrastId !== void 0 && { contrastId: t.contrastId }
		};
	}
	if (r.kind === "ui-swatch" || r.kind === "primitive-token") {
		if (n !== void 0) throw Error(`Linked point ${e.id} cannot own a contrast override.`);
		return {
			id: e.id,
			position: e.position,
			source: r
		};
	}
	if (!e.contrast) throw Error(`Point ${e.id} has no owned contrast.`);
	return {
		...e,
		source: r,
		contrast: {
			...e.contrast,
			...n !== void 0 && { value: n }
		}
	};
}
function vo(e, t, n) {
	return !t && !n ? e : e.map((e) => e.kind === "categorical" ? e : {
		...e,
		points: e.points.map((r) => _o(r, t?.[e.id]?.[r.id], n?.[e.id]?.[r.id]))
	});
}
//#endregion
//#region src/features/color-system/resolution.ts
function yo(t, n, r, { applyMultiplier: o = !0, applyPolarity: s = !0, modeSets: c } = {}) {
	let l = t, u = c ? e(c) : void 0, d = u?.["color.scales"];
	for (let e of n) {
		let t = e.foundations.color;
		if (!t) continue;
		let n = c?.find((t) => t.modes.some((t) => t.id === e.id));
		if (n && e.id === n.defaultModeId) continue;
		let r = !u || n?.id === d ? t.scaleStops : void 0, a = !u || n?.id === u["color.contrastMultiplier"] ? t.scaleContrasts : void 0, o = !u || n?.id === d ? t.dataVisSources : void 0, s = !u || n?.id === u["color.contrastMultiplier"] ? t.dataVisContrasts : void 0;
		l = {
			...l,
			...(o || s) && { dataVisScales: vo(l.dataVisScales, o, s) },
			...(r || a) && { scales: l.scales.map((e) => ({
				...e,
				...r && { stops: e.stops.map((t) => i(t, r[e.id]?.[t.id], l.palette)) },
				...e.customContrasts && a && { customContrasts: {
					...e.customContrasts,
					steps: e.customContrasts.steps.map((t) => ({
						...t,
						value: a[e.id]?.[t.id] ?? t.value
					}))
				} }
			})) },
			...t.backgroundScaleId !== void 0 && (!u || n?.id === u["color.backgroundScaleId"]) ? { backgroundScaleId: t.backgroundScaleId } : {},
			...t.backgroundLightness !== void 0 && (!u || n?.id === u["color.backgroundLightness"]) ? { backgroundLightness: t.backgroundLightness } : {},
			...t.contrastMultiplier !== void 0 && (!u || n?.id === u["color.contrastMultiplier"]) ? { settings: {
				...l.settings,
				contrastMultiplier: t.contrastMultiplier
			} } : {}
		};
	}
	if (l = a(l), r) {
		let e = r["color.backgroundScaleId"], t = r["color.backgroundLightness"], n = r["color.contrastMultiplier"];
		l = {
			...l,
			...typeof e == "string" ? { backgroundScaleId: e } : {},
			...typeof t == "number" ? { backgroundLightness: t } : {},
			...typeof n == "number" ? { settings: {
				...l.settings,
				contrastMultiplier: n
			} } : {}
		};
	}
	let f = s ? Ia(l) : l;
	return o ? ka(f) : f;
}
//#endregion
//#region src/features/color-system/dynamicGeneration.ts
var bo = /* @__PURE__ */ new WeakMap();
function xo(e, t, n) {
	return {
		linear: e,
		hex: Ni(e, n.gamut),
		css: G(e, n.output, n.gamut),
		measuredContrast: Fi(q(e, n.gamut), t)
	};
}
function So(e, t, n, r) {
	return Di(t, (t, i) => Oi(ki(t, r) * n + ki(e[i], r) * (1 - n), r));
}
function Co(e, t, n, r, i) {
	let a = JSON.stringify([
		t,
		n,
		r.side,
		r.extOffset,
		r.extSteep,
		i
	]), o = bo.get(e) ?? /* @__PURE__ */ new Map(), s = o.get(a);
	if (s) return s;
	let c = G(t, e.output, e.gamut);
	typeof e.output == "object" && (t = Ua(c, e.gamut));
	let l = q(t, e.gamut), u = i ?? (r.side === "dark" || r.side === "auto" && l > .1791), d = Ii(l, n, u), f = W(d + (e.neutral ? 1 : W(r.extOffset + r.extSteep * (n - 1) / 11)) * (+!u - d)), p = fa(e.anchors, f), m = u ? Math.min(q(p, e.gamut) - l, -1e-4) : Math.max(q(p, e.gamut) - l, 1e-4), h = W((d - l) / m), g = Di(p, (e, n) => h * e + (1 - h) * t[n]), _ = fa(e.anchors, d), v = h;
	if (e.neutral) {
		let n = 0, r = 1;
		for (let i = 0; i < 30; i += 1) {
			let i = (n + r) / 2, a = q(So(t, p, i, e.gamut), e.gamut);
			(u ? a > d : a < d) ? n = i : r = i;
		}
		v = (n + r) / 2;
	}
	let y = So(t, p, v, e.gamut), b = (t) => {
		if (typeof e.output != "object") return xo(t, l, e);
		let r = qa(t, c, n, e.output, u, e.scale.name);
		return {
			...r,
			hex: Ni(r.linear, e.gamut)
		};
	}, x = b(g), S, C, w = () => S ??= b(_), ee = {
		targetContrast: n,
		targetLuminance: d,
		sourceLuminance: f,
		alpha: h,
		isDark: u,
		sourceLinear: p,
		dynamic: x,
		get opaque() {
			return w();
		},
		get transparent() {
			if (C) return C;
			let t = typeof e.output == "object" ? Ja(p, c, n, e.output, u, e.scale.name) : void 0;
			return C = {
				...xo(y, l, e),
				sourceHex: Ni(p, e.gamut),
				sourceCss: G(p, e.output, e.gamut),
				alpha: v,
				...t && {
					css: t.css,
					linear: t.linear,
					measuredContrast: t.measuredContrast,
					sourceCss: t.sourceCss,
					sourceHex: Ni(t.sourceLinear, e.gamut),
					alpha: t.alpha
				}
			};
		},
		get chromaDeltaE() {
			return Zi(Li(Ai(x.linear, e.gamut, "srgb")), Li(Ai(w().linear, e.gamut, "srgb")));
		}
	};
	return o.set(a, ee), o.size > 128 && o.delete(o.keys().next().value), bo.set(e, o), ee;
}
//#endregion
//#region src/features/color-system/surfaceGeneration.ts
function wo(e) {
	return la(e.scales.find((t) => t.id === e.backgroundScaleId) ?? e.scales[0], e.backgroundLightness, e.settings.colorOutput).linear;
}
//#endregion
//#region src/features/taxonomy/formatting.ts
var To = {
	formatValue: (e) => typeof e == "number" ? String(e).replace(/^-/, "minus-").replace("+", "plus-").replace(".", "-") : e.trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, "-").replace(/^-+|-+$/g, ""),
	separator: "-"
};
function Eo(e) {
	let t = To.formatValue(e);
	if (!t) throw Error("A foundation name must contain letters or numbers to generate a token name.");
	return t;
}
//#endregion
//#region src/features/tokens/model.ts
function Do(e, t) {
	return e.value !== void 0 && e.baseline.value !== t.value ? !0 : e.name !== void 0 && !Mo(e.baseline.name, t.name);
}
function Oo(e, t) {
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
		stale: t ? Do(t, e) : !1
	};
}
function ko(e, t) {
	return `${e}:${t}`;
}
var Ao = "palette";
function jo(e) {
	return e.contrastValue ? `${e.colorName}-${e.contrastValue}` : e.colorName;
}
function Mo(e, t) {
	return e.colorName === t.colorName && e.contrastValue === t.contrastValue;
}
function No(e, t) {
	let n = t;
	for (let t = 0; t < e.length; t += 1) n ^= e.charCodeAt(t), n = Math.imul(n, 16777619) >>> 0;
	return n ^= n >>> 16, n = Math.imul(n, 2246822507) >>> 0, n ^= n >>> 13, n >>> 0;
}
function Po(e) {
	return e.toString(16).padStart(8, "0");
}
var Fo = /* @__PURE__ */ new Map(), Io = 8192, Lo = 1048576, Ro = 0;
function zo(e) {
	let t = Fo.get(e);
	if (t !== void 0) return t;
	let n = Bo(e), r = e.length + n.length;
	if (r > Lo) return n;
	for (; Fo.size >= Io || Ro + r > Lo;) {
		let e = Fo.keys().next().value;
		Ro -= e.length + Fo.get(e).length, Fo.delete(e);
	}
	return Fo.set(e, n), Ro += r, n;
}
function Bo(e) {
	let t = [
		Po(No(e, 2166136261)),
		Po(No(e, 1099511628)),
		Po(No(e, 374761393)),
		Po(No(e, 668265263))
	].join(""), n = `8${t.slice(13, 16)}`, r = `${(parseInt(t[16], 16) & 3 | 8).toString(16)}${t.slice(17, 20)}`;
	return `${t.slice(0, 8)}-${t.slice(8, 12)}-${n}-${r}-${t.slice(20, 32)}`;
}
//#endregion
//#region src/features/scales/stepNames.ts
var Vo = [
	50,
	25,
	20,
	10,
	5,
	2,
	1
];
function Ho(e) {
	let t = Math.max(1, Math.round(e));
	return Vo.find((e) => t * e < 100) ?? 1;
}
//#endregion
//#region src/features/foundations/componentSizes.ts
var Uo = [
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
], Wo = {
	structure: "b07988e3-0510-4bf5-a531-86ea718b1003",
	size: "b07988e3-0510-4bf5-a531-86ea718b1004"
}, Go = {
	xs: "b07988e3-0510-4bf5-a531-86ea718b1500",
	s: "b07988e3-0510-4bf5-a531-86ea718b1501",
	m: "b07988e3-0510-4bf5-a531-86ea718b1502",
	l: "b07988e3-0510-4bf5-a531-86ea718b1503",
	xl: "b07988e3-0510-4bf5-a531-86ea718b1504"
};
[{
	id: Wo.structure,
	key: "structure",
	name: "Structure"
}, {
	id: Wo.size,
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
})), Uo.map((e) => ({
	id: Go[e.id],
	categoryId: Wo.size,
	value: e.label.toLowerCase(),
	description: ""
}));
//#endregion
//#region src/features/logic/applicability.ts
var Ko = [
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
function qo(e) {
	return Ko.filter(({ id: t }) => e === "scale-naming" ? t === "color" : e === "conditional" ? t === "color" || t === "opacity" : e === "rounding" ? t !== "color" && t !== "elevation" : t !== "color" && t !== "opacity").map(({ id: e }) => e);
}
function Jo(e, t) {
	return !e || typeof e != "object" || !("kind" in e) ? !1 : e.kind === "all" ? Object.keys(e).length === 1 : e.kind === "specific" && "types" in e && Array.isArray(e.types) && e.types.length > 0 && new Set(e.types).size === e.types.length && e.types.every((e) => qo(t).includes(e)) && Object.keys(e).every((e) => e === "kind" || e === "types");
}
//#endregion
//#region src/features/logic/model.ts
var Yo = [
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
], Xo = [
	1,
	10,
	100,
	1e3
], Zo = "rule-standard-scale-naming";
function Qo(e) {
	return typeof e == "number" && Number.isFinite(e);
}
function $o(e) {
	return !!e && typeof e == "object" && Qo(e.factor) && e.factor >= 0;
}
function es(e) {
	if (!e || typeof e != "object") return !1;
	let t = e;
	return typeof t.id == "string" && Yo.some((e) => e.id === t.comparator) && Qo(t.threshold) && $o(t.outcome);
}
function ts(e) {
	if (!e || typeof e != "object") return !1;
	let t = e;
	return !(typeof t.id == "string" && t.id.trim() && typeof t.name == "string" && typeof t.description == "string" && (t.locked === void 0 || typeof t.locked == "boolean")) || t.type && t.applicability !== void 0 && !Jo(t.applicability, t.type) ? !1 : t.type === "generator" ? (t.movement === "available-token" || t.movement === "scale-index") && Object.keys(t).every((e) => [
		"id",
		"name",
		"description",
		"locked",
		"type",
		"movement",
		"mappings",
		"defaultTermId",
		"applicability"
	].includes(e)) && Array.isArray(t.mappings) && t.mappings.length > 0 && new Set(t.mappings.map((e) => e?.termId)).size === t.mappings.length && t.mappings.every((e) => e && typeof e.termId == "string" && !!e.termId.trim() && Number.isSafeInteger(e.offset) && Object.keys(e).every((e) => e === "termId" || e === "offset")) && t.mappings.some((e) => e.termId === t.defaultTermId && e.offset === 0) && t.applicability !== void 0 : t.type === "conditional" ? ns(t) : t.type === "scale-naming" ? Number.isFinite(t.baseLabel) && t.baseLabel > 0 && Number.isFinite(t.aboveIncrement) && t.aboveIncrement > 0 && !!t.below && (t.below.kind === "automatic" || t.below.kind === "fixed" && Number.isFinite(t.below.increment) && t.below.increment > 0) : t.type === "tshirt-sizing" ? (t.movement === "available-token" || t.movement === "scale-index") && Array.isArray(t.mappings) && t.mappings.length === Uo.length && Object.keys(t).every((e) => [
		"id",
		"name",
		"description",
		"locked",
		"type",
		"movement",
		"mappings",
		"applicability",
		"defaultTermId"
	].includes(e)) && Uo.every((e) => {
		let n = t.mappings.filter((t) => t && t.termId === Go[e.id]);
		return n.length === 1 && Number.isSafeInteger(n[0].offset) && (e.id !== "m" || n[0].offset === 0) && Object.keys(n[0]).every((e) => e === "termId" || e === "offset");
	}) : t.type === "rounding" && Xo.includes(t.depth) && $o(t.defaultOutcome) && Array.isArray(t.conditions) && t.conditions.every(es);
}
function ns(e) {
	if (!Array.isArray(e.branches) || !rs(e.otherwise)) return !1;
	let t = /* @__PURE__ */ new Set(), n = (e) => typeof e != "string" || !e.trim() || t.has(e) ? !1 : (t.add(e), !0), r = [e.when];
	for (let t of e.branches) {
		if (!t || !n(t.id) || !rs(t.then)) return !1;
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
function rs(e) {
	return !!e && typeof e == "object" && "offset" in e && Number.isSafeInteger(e.offset);
}
//#endregion
//#region src/features/logic/scaleNaming.ts
var is = {
	id: Zo,
	name: "Standard scale naming",
	description: "Base 100, clean smaller indices, and increments of 100 above the base.",
	type: "scale-naming",
	locked: !0,
	baseLabel: 100,
	aboveIncrement: 100,
	below: { kind: "automatic" }
};
function as(e, t, n) {
	if (!ts(e) || !Number.isSafeInteger(t) || t < 1 || !Number.isSafeInteger(n) || n < 0 || n >= t) throw Error("Choose a valid naming rule and an existing base swatch.");
	let r = e.below.kind === "fixed" ? e.below.increment : Ho(n) * e.baseLabel / 100, i = Array.from({ length: t }, (t, i) => {
		let a = i - n;
		return Number((e.baseLabel + a * (a < 0 ? r : e.aboveIncrement)).toPrecision(15));
	});
	if (i.some((e, t) => !Number.isFinite(e) || e <= 0 || t > 0 && e <= i[t - 1])) throw Error("This naming rule cannot give every swatch a positive, distinct, increasing index. Reduce the below-base increment or choose another base.");
	return i;
}
function os(e, t) {
	let n = e.find((e) => e.id === t);
	if (!n || n.type !== "scale-naming") throw Error(`Scale naming rule ${t} is unavailable.`);
	return n;
}
//#endregion
//#region src/features/color-system/contrastSteps.ts
function ss(e, t, n = [is]) {
	if (t?.customContrasts) {
		let r = t.customContrasts, i = as(os(n, r.namingRuleId), r.steps.length, r.steps.findIndex((e) => e.id === r.baseContrastId));
		if (i[e] === void 0) throw Error("The requested contrast step is unavailable.");
		return i[e];
	}
	return (e + 1) * 100;
}
//#endregion
//#region src/features/color-system/data-vis/identity.ts
var cs = (e, t) => zo(`data-vis-member:v1:${JSON.stringify([e, t])}`);
//#endregion
//#region src/features/tokens/colorGeneration.ts
function ls(e, t, n, r, i, a) {
	return us(e, t, n, r, i, a).map((e) => {
		if (e.status === "blocked") throw e.error;
		return e.token;
	});
}
function us(e, t, n, r, i, a, o) {
	if (!La(e)) return [];
	if (o) return o([
		e,
		t,
		n,
		r,
		i,
		a
	], () => us(e, t, n, r, i, a));
	let s = pa(e, i), c = Eo(e.name);
	return (e.customContrasts?.steps ?? t).map((t, i) => {
		let o = {
			uuid: zo(ko(e.id, t.id)),
			name: {
				colorName: c,
				contrastValue: String(ss(i, e, a))
			},
			source: {
				tokenType: "color",
				scaleId: e.id,
				contrastId: t.id
			}
		};
		try {
			return {
				status: "ready",
				token: {
					...o,
					value: Co(s, n, t.value, r).dynamic.css
				}
			};
		} catch (e) {
			if (!(e instanceof za)) throw e;
			return {
				status: "blocked",
				token: o,
				error: e
			};
		}
	});
}
//#endregion
//#region src/features/color-system/cssLibrary.ts
function ds(e) {
	return Eo(e);
}
//#endregion
//#region src/features/tokens/paletteGeneration.ts
function fs(e, t) {
	return e.map((e) => ({
		uuid: zo(ko(Ao, e.id)),
		name: {
			colorName: ds(e.name),
			contrastValue: ""
		},
		value: ea(e, t),
		source: {
			tokenType: "color",
			scaleId: Ao,
			contrastId: e.id
		}
	}));
}
//#endregion
//#region src/features/tokens/colorOutput.ts
function ps(e, t) {
	if (!e.valueOverridden) return e;
	let n = t.settings.colorOutput, r = U(new z(e.value), n), i = t.scales.find((t) => t.id === e.source.scaleId), a = (i?.customContrasts?.steps ?? t.contrasts).find((t) => t.id === e.source.contrastId);
	if (i && a) {
		let i = G(wo(t), n), o = Ga(r, i, B(n));
		if (o < a.value) throw new za({
			requestedContrast: a.value,
			achievableContrast: o,
			gamut: B(n),
			background: i,
			source: `Manual color ${e.uuid}`,
			observedColor: r,
			tokenId: e.uuid
		});
	}
	return {
		...e,
		value: r
	};
}
//#endregion
//#region src/features/tokens/colorResolution.ts
function ms(e) {
	return JSON.stringify(Object.entries(e).sort(([e], [t]) => e.localeCompare(t)));
}
function hs(e, t, n, r) {
	let i = t[e.uuid];
	if (!i) return r ? ps(e, r) : e;
	let a = i.name, o = i.values[n], s = {
		...e,
		name: a === void 0 ? e.name : {
			colorName: a,
			contrastValue: ""
		},
		value: o ? String(o.value) : e.value,
		nameOverridden: e.nameOverridden || a !== void 0,
		valueOverridden: e.valueOverridden || o !== void 0,
		stale: e.stale || !!(o && o.baseline !== e.generated.value) || !!(i.nameBaseline && i.nameBaseline !== jo(e.generated.name))
	};
	return r ? ps(s, r) : s;
}
//#endregion
//#region src/features/color-system/data-vis/continuous.ts
function gs(e, t, n = "srgb") {
	if (t.length < 2 || t[0].position !== 0 || t.at(-1)?.position !== 1 || t.some((e, n) => !Number.isFinite(e.position) || e.position < 0 || e.position > 1 || n > 0 && e.position <= t[n - 1].position) || e.kind === "diverging" && !t.some((e) => e.position === .5)) throw Error("A continuous scale requires ordered endpoints and a diverging center at 50%.");
	let r = t.map((e) => {
		let t = J(e.value), n = Xa(t);
		return {
			...e,
			lab: n,
			lch: zi(n),
			alpha: t.alpha
		};
	}), i = t.filter((e) => e.targetReached === !1).map((e) => `Point ${Math.round(e.position * 100)}% cannot reach ${e.targetContrast}:1; its rendered contrast is ${e.actualContrast.toFixed(2)}:1.`);
	for (let e of t) J(e.value).inGamut(V(K(n))) || i.push(`Point ${Math.round(e.position * 100)}% uses a linked color outside the interpolation output gamut. Interior colors are gamut-mapped; the exact linked endpoint is preserved.`);
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
			let i = W(t), a = r.find((e) => e.position === i);
			if (a) return a.value;
			let o = r.findIndex((e) => e.position > i), s = r[o - 1], c = r[o], l = (i - s.position) / (c.position - s.position), u = s.alpha * (1 - l) + c.alpha * l, d = e.kind === "sequential" ? s.lch : s.lab, f = e.kind === "sequential" ? c.lch : c.lab, p = (e) => u <= 0 ? 0 : (d[e] * s.alpha * (1 - l) + f[e] * c.alpha * l) / u;
			if (e.kind === "sequential") {
				let e = s.lch[1] < 4e-6 ? c.lch[2] : s.lch[2], t = c.lch[1] < 4e-6 ? e : c.lch[2];
				return $a([
					p(0),
					p(1),
					Xi(e, t, l)
				], u, n);
			}
			return Qa([
				p(0),
				p(1),
				p(2)
			], u, n);
		}
	};
}
//#endregion
//#region src/features/color-system/data-vis/packetValidation.ts
var Q = (e) => typeof e == "string" && e.trim().length > 0, _s = (e) => typeof e == "number" && Number.isFinite(e), vs = (e, t, n) => _s(e) && e >= t && e <= n, $ = (e, t) => e === void 0 || t(e), ys = (e) => new Set(e).size === e.length, bs = (e) => Array.isArray(e) && e.length > 0 && e.every((e) => Y(e) && Q(e.id) && co(e)) && ys(e.map((e) => e.id)), xs = (e) => Y(e) && mo({ color: Object.fromEntries(Object.entries(e).filter(([e]) => e !== "paletteColorId")) }) && $(e.paletteColorId, Q);
function Ss(e) {
	if (Y(e) && e.schemaVersion === 1) {
		if (!Y(e.color) || e.color.schemaVersion !== 3 || !po(e.color.dataVisScales) || e.color.dataVisScales.some((e) => e.staticColors !== void 0 || e.kind !== "categorical" && e.points.some((e) => e.source.kind === "primitive-token"))) throw Error("Use an unmodified version-one packet for migration.");
		let t = Cs({
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
	return Y(e) && e.schemaVersion === 2 ? Cs(e) : (ws(e), e);
}
function Cs(e) {
	if (!Y(e.color) || e.color.schemaVersion !== 4 || !Y(e.color.settings)) throw Error("Use an unmodified version-two packet with Color version four.");
	let { outputGamut: t, ...n } = e.color.settings;
	if (typeof t != "string" || ![
		"srgb",
		"display-p3",
		"oklch"
	].includes(t) || "colorOutput" in n) throw Error("The legacy packet has invalid Color settings.");
	let r = (e) => no(e) && e.chroma <= 100;
	if (!Array.isArray(e.color.palette) || !e.color.palette.every(r) || !Array.isArray(e.color.scales) || !e.color.scales.every((e) => Y(e) && Array.isArray(e.stops) && e.stops.every(r)) || !po(e.color.dataVisScales) || e.color.dataVisScales.some((e) => e.kind !== "categorical" && e.points.some((e) => e.source.kind === "key-color" && !r(e.source.color)))) throw Error("The legacy packet has invalid version-four color geometry.");
	let i = {
		...e,
		schemaVersion: 3,
		color: {
			...e.color,
			schemaVersion: 5,
			settings: {
				...n,
				colorOutput: xi(t)
			}
		}
	};
	ws(i);
	for (let e of i.modeSets) for (let t of e.modes) {
		let e = t.foundations.color;
		if (Object.values(e?.scaleStops ?? {}).some((e) => Object.values(e).some((e) => e.chroma !== void 0 && e.chroma > 100)) || Object.values(e?.dataVisSources ?? {}).some((e) => Object.values(e).some((e) => e.color?.chroma !== void 0 && e.color.chroma > 100))) throw Error("The legacy packet has invalid version-four mode color geometry.");
	}
	return i;
}
function ws(e) {
	if (!Y(e) || e.schemaVersion !== 3 || !Y(e.color) || e.color.schemaVersion !== 5 || !po(e.color.dataVisScales)) throw Error("Use a valid version-three data vis packet with Color version five recipes.");
	let t = e, n = t.color;
	if (!n) throw Error("The packet has no Color foundation.");
	if (!Q(n.backgroundScaleId) || !vs(n.backgroundLightness, 0, 1) || !Array.isArray(n.palette) || !n.palette.every((e) => Y(e) && Q(e.id) && Q(e.name) && no(e)) || !ys(n.palette.map((e) => e.id))) throw Error("The packet has invalid background or Palette geometry.");
	if (!Array.isArray(n.scales) || !n.scales.length || !n.scales.every((e) => Y(e) && Q(e.id) && Q(e.name) && Ra(e) && Array.isArray(e.stops) && e.stops.length > 0 && e.stops.every((e) => Y(e) && Q(e.id) && no(e) && $(e.paletteColorId, Q)) && ys(e.stops.map((e) => e.id)) && $(e.customContrasts, (e) => Y(e) && bs(e.steps) && Q(e.namingRuleId) && Q(e.baseContrastId) && Array.isArray(e.steps) && e.steps.some((t) => t.id === e.baseContrastId))) || !ys(n.scales.map((e) => e.id))) throw Error("The packet has invalid UI scale geometry or swatch identities.");
	if (!bs(n.contrasts)) throw Error("The packet has invalid UI contrast targets.");
	let r = n.settings;
	if (!Y(r) || ![
		"auto",
		"light",
		"dark"
	].includes(r.side) || !bi(r.colorOutput) || "outputGamut" in r || !_s(r.extOffset) || !_s(r.extSteep) || !_s(r.guardThreshold) || !$(r.contrastReference, (e) => e === "light" || e === "dark") || !$(r.contrastMultiplier, (e) => vs(e, 0, 3)) || !$(r.polarityCompensation, (e) => vs(e, 0, 1))) throw Error("The packet has invalid generation settings.");
	if (!Array.isArray(t.namingRules) || !t.namingRules.every((e) => ts(e) && e.type === "scale-naming") || !ys(t.namingRules.map((e) => e.id))) throw Error("The packet has an invalid scale-naming library.");
	let i = new Set(n.palette.map((e) => e.id)), a = (e) => e === void 0 || i.has(e), o = new Map(n.scales.map((e) => [e.id, e]));
	if (!o.has(n.backgroundScaleId) || n.scales.some((e) => e.stops.some((e) => !a(e.paletteColorId)))) throw Error("The packet is missing its background or linked Palette source.");
	if (!Array.isArray(t.modeSets) || !t.modeSets.every(Y) || !ys(t.modeSets.map((e) => e.id)) || !ys(t.modeSets.map((e) => e.key))) throw Error("The packet has duplicate or invalid mode sets.");
	let s = /* @__PURE__ */ new Set(), c = /* @__PURE__ */ new Set();
	for (let e of t.modeSets) {
		if (!Q(e.id) || !Q(e.key) || !Array.isArray(e.modes) || !e.modes.length || !e.modes.every(Y) || !e.modes.some((t) => t.id === e.defaultModeId) || !ys(e.modes.map((e) => e.key)) || !$(e.authoringCapabilities, Array.isArray)) throw Error("Each packet mode set needs unique modes and an available default.");
		for (let t of e.authoringCapabilities ?? []) {
			if (![
				"color.scales",
				"color.contrastMultiplier",
				"color.backgroundScaleId",
				"color.backgroundLightness"
			].includes(t) || s.has(t)) throw Error("Packet color capabilities require one valid owner each.");
			s.add(t);
		}
		for (let t of e.modes) {
			if (!Y(t) || !Q(t.id) || !Q(t.key) || c.has(t.id) || !Y(t.foundations)) throw Error("The packet has invalid or duplicate mode identities.");
			c.add(t.id);
			let e = t.foundations.color;
			if (e !== void 0) {
				if (!Y(e) || !$(e.backgroundLightness, (e) => vs(e, 0, 1)) || !$(e.contrastMultiplier, (e) => vs(e, 0, 3)) || !$(e.backgroundScaleId, (e) => Q(e) && o.has(e)) || !$(e.dataVisSources, ho) || !$(e.dataVisContrasts, go)) throw Error(`Mode ${t.key} has invalid color parameters.`);
				if (e.scaleStops !== void 0) {
					if (!Y(e.scaleStops)) throw Error(`Mode ${t.key} has invalid UI scale patches.`);
					for (let [n, r] of Object.entries(e.scaleStops)) {
						let e = o.get(n);
						if (!e || !Y(r) || Object.entries(r).some(([t, n]) => !e.stops.some((e) => e.id === t) || !xs(n) || !a(n.paletteColorId))) throw Error(`Mode ${t.key} references invalid UI stops or Palette colors.`);
					}
				}
				if (e.scaleContrasts !== void 0) {
					if (!Y(e.scaleContrasts)) throw Error(`Mode ${t.key} has invalid UI contrast patches.`);
					for (let [n, r] of Object.entries(e.scaleContrasts)) {
						let e = o.get(n);
						if (!e?.customContrasts || !Y(r) || Object.entries(r).some(([t, n]) => !e.customContrasts.steps.some((e) => e.id === t) || !vs(n, 1, 21))) throw Error(`Mode ${t.key} references invalid custom UI contrasts.`);
					}
				}
			}
		}
	}
	if (!Y(t.tokenOverrides) || !Object.values(t.tokenOverrides).every((e) => Y(e) && $(e.value, Q) && $(e.name, Y))) throw Error("The packet has invalid legacy UI overrides.");
	if (!Y(t.browserTokenEdits) || !Object.values(t.browserTokenEdits).every((e) => Y(e) && Y(e.values) && Object.values(e.values).every((e) => Y(e) && Q(e.value) && Q(e.baseline)))) throw Error("The packet has invalid color-token edits.");
}
//#endregion
//#region src/features/color-system/data-vis/patches.ts
function Ts(t) {
	let n = e([...t]), r = [];
	for (let e of t) for (let t of e.modes) for (let [i, a] of [["dataVisSources", "color.scales"], ["dataVisContrasts", "color.contrastMultiplier"]]) Object.values(t.foundations.color?.[i] ?? {}).some((e) => Object.keys(e).length) && (t.id === e.defaultModeId && r.push(`${t.name}: clear its data vis overrides before making it the default mode.`), n[a] !== e.id && r.push(`${t.name}: clear its data vis overrides before removing their ${a === "color.scales" ? "source" : "contrast"} owner.`));
	return r;
}
//#endregion
//#region src/features/color-system/data-vis/primitiveColors.ts
function Es(e) {
	return [
		...e.palette.map((e) => ({
			id: zo(ko(Ao, e.id)),
			origin: {
				kind: "palette",
				paletteColorId: e.id
			},
			hidden: !1
		})),
		...e.scales.flatMap((t) => (t.customContrasts?.steps ?? e.contrasts).map((e) => ({
			id: zo(ko(t.id, e.id)),
			origin: {
				kind: "ui-swatch",
				scaleId: t.id,
				contrastId: e.id
			},
			hidden: !La(t)
		}))),
		...e.dataVisScales.flatMap((e) => e.kind === "categorical" ? e.members.map((t) => ({
			id: cs(e.id, t.id),
			origin: {
				kind: "categorical",
				scaleId: e.id,
				memberId: t.id
			},
			hidden: !La(e)
		})) : [])
	];
}
function Ds(e, t, n, r = /* @__PURE__ */ new Map()) {
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
	return Es(e).filter((e) => !e.hidden).map((e) => {
		let t = i.get(e.id), n = t?.error;
		if (!t || typeof t.value != "string" || typeof t.generatedValue != "string") n = "This primitive color has no concrete value.";
		else if (!n) try {
			J(t.value);
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
function Os(e, t) {
	let n = t.find((t) => t.id === e);
	if (!n || n.hidden || n.error) throw Error(n?.error ?? `Primitive color ${e} is unavailable. Choose a replacement color.`);
	return J(n.value), n;
}
//#endregion
//#region src/features/color-system/data-vis/references.ts
function ks(e, t, n) {
	return n.source.kind === "key-color" ? [] : [{
		scaleId: e,
		scaleName: t,
		inputId: n.id,
		inputLabel: `${Math.round(n.position * 100)}% point`,
		source: n.source
	}];
}
function As(e, t = []) {
	return e.dataVisScales.flatMap((e) => {
		let n = (e.staticColors ?? []).flatMap((t) => t.tokenId ? [{
			scaleId: e.id,
			scaleName: e.name,
			inputId: t.id,
			inputLabel: "Static color",
			source: {
				kind: "primitive-token",
				tokenId: t.tokenId
			}
		}] : []);
		return e.kind === "categorical" ? [...n, ...e.members.map((t, n) => ({
			scaleId: e.id,
			scaleName: e.name,
			inputId: t.id,
			inputLabel: `Color ${n + 1}`,
			source: t.source
		}))] : [
			...n,
			...e.points.flatMap((t) => ks(e.id, e.name, t)),
			...t.flatMap((t) => t.modes.flatMap((n) => {
				let r = n.foundations.color?.dataVisSources?.[e.id];
				return !r || n.id === t.defaultModeId ? [] : e.points.flatMap((t) => !r[t.id] || !Ns(t, r[t.id]) ? [] : ks(e.id, e.name, _o(t, r[t.id])).map((e) => ({
					...e,
					modeId: n.id,
					modeName: n.name
				})));
			}))
		];
	});
}
function js(e, t = []) {
	let n = Ts(t), r = new Map(Es(e).map((e) => [e.id, e]));
	for (let i of As(e, t)) {
		let t = i.source, a = `${i.scaleName}, ${i.inputLabel}${i.modeName ? ` (${i.modeName})` : ""}`;
		if (t.kind === "primitive-token") {
			let e = r.get(t.tokenId);
			(!e || e.hidden) && n.push(`${a}: primitive color ${t.tokenId} is unavailable or unpublished. Choose a replacement color.`);
			continue;
		}
		let o = e.scales.find((e) => e.id === t.scaleId);
		o ? t.kind === "ui-swatch" && ((o.customContrasts?.steps ?? e.contrasts).some((e) => e.id === t.contrastId) || n.push(`${a}: linked UI swatch ${t.contrastId} is unavailable.`), o.hideFromPublishing && n.push(`${a}: its linked UI swatch is hidden from publishing.`)) : n.push(`${a}: linked UI scale ${t.scaleId} is unavailable.`);
	}
	for (let r of t) for (let t of r.modes) {
		for (let [r, i] of Object.entries(t.foundations.color?.dataVisSources ?? {})) {
			let a = e.dataVisScales.find((e) => e.id === r);
			for (let [e, o] of Object.entries(i)) {
				let i = a?.kind === "categorical" ? void 0 : a?.points.find((t) => t.id === e);
				i ? Ms(i, o, n, t.name) : n.push(`${t.name}: data vis source override ${r}/${e} is unavailable.`);
			}
		}
		for (let [r, i] of Object.entries(t.foundations.color?.dataVisContrasts ?? {})) {
			let a = e.dataVisScales.find((e) => e.id === r);
			for (let e of Object.keys(i)) (a?.kind === "categorical" ? void 0 : a?.points.find((t) => t.id === e))?.contrast || n.push(`${t.name}: data vis contrast override ${r}/${e} has no owned point.`);
		}
	}
	return n;
}
function Ms(e, t, n, r) {
	Ns(e, t) || n.push(`${r}: source patch for ${e.id} changes its source kind.`);
}
function Ns(e, t) {
	return e.source.kind === "ui-swatch" && t.tokenId !== void 0 ? t.color === void 0 && t.scaleId === void 0 && t.contrastId === void 0 : !(e.source.kind === "key-color" && (t.scaleId !== void 0 || t.contrastId !== void 0 || t.tokenId !== void 0) || e.source.kind !== "key-color" && t.color !== void 0 || e.source.kind !== "primitive-token" && t.tokenId !== void 0 || e.source.kind === "primitive-token" && (t.scaleId !== void 0 || t.contrastId !== void 0) || e.source.kind === "ui-scale" && t.contrastId !== void 0);
}
function Ps(e, t) {
	let n = (e) => {
		let t = e.space.id === "rec2020" ? "rec2020" : e.space.id === "p3" ? "p3" : "srgb", [n, r, i] = e.to(t).coords;
		if (![
			n,
			r,
			i
		].every(Number.isFinite)) throw Error("Contrast has unavailable color channels.");
		let a = t === "p3" ? "display-p3" : t;
		return q([
			Oi(n, a),
			Oi(r, a),
			Oi(i, a)
		], a);
	};
	return Fi(n(e), n(t));
}
//#endregion
//#region src/features/color-system/data-vis/resolution.ts
function Fs(e) {
	return JSON.stringify([e.scaleId, e.contrastId]);
}
function Is(e, t) {
	let n = new Map(e.scales.filter(La).map((e) => [e.id, e]));
	return t.filter((t) => {
		let r = n.get(t.source.scaleId);
		return !!r && (r.customContrasts?.steps ?? e.contrasts).some((e) => e.id === t.source.contrastId);
	}).map((e) => ({
		id: Fs(e.source),
		source: {
			kind: "ui-swatch",
			scaleId: e.source.scaleId,
			contrastId: e.source.contrastId
		},
		label: jo(e.name),
		value: e.value,
		generatedValue: e.generated.value,
		manuallyOverridden: e.valueOverridden
	}));
}
function Ls(e) {
	return G(wo(e), e.settings.colorOutput);
}
function Rs(e, t) {
	let n = t.find((t) => t.id === Fs(e));
	if (!n) throw Error(`Linked UI swatch ${e.scaleId}/${e.contrastId} is unavailable. Choose a replacement color.`);
	return J(n.value), n;
}
function zs(e, t, n, r = []) {
	let i = wo(e), a = Ls(e), o = Fa(e), s = K(e.settings.colorOutput);
	return t.staticColors ? t.staticColors.map((t) => {
		if (t.position === void 0) throw Error("A Static continuous color has no position.");
		let n = U(J(so(t)), e.settings.colorOutput), r = t.tokenId ? {
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
			actualContrast: Ps(Za(n, a, s), J(a)),
			manuallyOverridden: t.overrideValue !== void 0
		};
	}) : t.points.map((c) => {
		if (c.source.kind === "primitive-token") {
			let e = Os(c.source.tokenId, r);
			return {
				id: c.id,
				position: c.position,
				source: c.source,
				value: e.value,
				actualContrast: Ps(Za(e.value, a, s), J(a)),
				manuallyOverridden: e.manuallyOverridden
			};
		}
		if (c.source.kind === "ui-swatch") {
			let e = Rs(c.source, n);
			return {
				id: c.id,
				position: c.position,
				source: c.source,
				value: e.value,
				actualContrast: Ps(Za(e.value, a, s), J(a)),
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
		let d = Oa(Na(c.contrast, o), Da(e)), f = Co(pa(u, e.settings.colorOutput), i, d, e.settings), p = Ps(Za(f.dynamic.css, a, s), J(a));
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
function Bs(e, t, n, r) {
	let i = e.members.find((e) => e.id === t);
	if (!i) throw Error("This categorical member is unavailable.");
	if (!e.staticColors) {
		let e = Rs(i.source, n).value;
		return {
			value: e,
			generatedValue: e,
			overridden: !1
		};
	}
	let a = e.staticColors.find((e) => e.id === t);
	if (!a) throw Error("This categorical member has no captured Static color.");
	let o = (e) => r ? U(J(e), r) : e, s = o(so(a));
	return J(s), {
		value: s,
		generatedValue: o(a.value),
		overridden: a.overrideValue !== void 0
	};
}
function Vs(e, t, n, r, { includeUnpublished: i = !1 } = {}) {
	return e.dataVisScales.flatMap((a) => a.kind === "categorical" && (i || La(a)) ? a.members.map((i, o) => {
		let s = Bs(a, i.id, t, e.settings.colorOutput), c = cs(a.id, i.id), l = Oo({
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
		} : hs(l, n, r, e);
		return J(u.value), {
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
function Hs(e, t = {}) {
	let n = Ss(e), r = js(n.color, n.modeSets);
	if (r.length) throw Error(r.join(" "));
	for (let e of Object.keys(t.modes ?? {})) if (!n.modeSets.some((t) => t.key === e)) throw Error(`Unknown mode set ${e}.`);
	let i = n.modeSets.map((e) => {
		let n = t.modes?.[e.key], r = n === void 0 ? e.modes.find((t) => t.id === e.defaultModeId) : e.modes.find((e) => e.key === n);
		if (!r) throw Error(`Mode ${n ?? "(default)"} is unavailable in ${e.key}.`);
		return r;
	});
	if (t.contrastMultiplier !== void 0 && (!Number.isFinite(t.contrastMultiplier) || t.contrastMultiplier < 0 || t.contrastMultiplier > 3)) throw Error("Choose a supported finite global contrast multiplier.");
	if (t.backgroundLightness !== void 0 && (!Number.isFinite(t.backgroundLightness) || t.backgroundLightness < 0 || t.backgroundLightness > 1)) throw Error("Choose a finite background lightness from zero to one.");
	let a = {
		...t.contrastMultiplier !== void 0 && { "color.contrastMultiplier": t.contrastMultiplier },
		...t.backgroundLightness !== void 0 && { "color.backgroundLightness": t.backgroundLightness },
		...t.backgroundScaleId !== void 0 && { "color.backgroundScaleId": t.backgroundScaleId }
	}, o = yo(n.color, i, a, {
		modeSets: n.modeSets,
		applyMultiplier: !1,
		applyPolarity: !1
	});
	if (!o.scales.some((e) => e.id === o.backgroundScaleId)) throw Error("The requested background scale is outside this source-closed packet.");
	let s = yo(n.color, i, a, { modeSets: n.modeSets }), c = ms(Object.fromEntries(n.modeSets.map((e, t) => [e.id, i[t].id]))), l = [...fs(s.palette, s.settings.colorOutput), ...s.scales.flatMap((e) => ls(e, s.contrasts, wo(s), s.settings, s.settings.colorOutput, n.namingRules))].map((e) => hs(Oo(e, n.tokenOverrides[e.uuid]), n.browserTokenEdits, c, s)), u = Is(s, l), d = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), p = Vs(o, u, n.browserTokenEdits, c), m = Ds(s, l, p);
	for (let e of o.dataVisScales) e.kind === "categorical" ? f.set(e.id, e.members.map((t) => {
		let n = p.find((n) => n.id === cs(e.id, t.id));
		if (!n) throw Error("A categorical runtime color is unavailable.");
		return n.value;
	})) : d.set(e.id, gs(e, zs(o, e, u, m), o.settings.colorOutput));
	let h = (e) => {
		let t = o.dataVisScales.filter((t) => t.id === e || t.name === e);
		if (t.length !== 1) throw Error(`Choose one available data vis scale ID or unique name: ${e}.`);
		return t[0];
	};
	return {
		definitions: o.dataVisScales.map(({ id: e, name: t, kind: n }) => ({
			id: e,
			name: t,
			kind: n
		})),
		continuous(e) {
			let t = h(e), n = d.get(t.id);
			if (!n) throw Error(`${t.name} is categorical, not a continuous function.`);
			return n.evaluate;
		},
		categorical(e) {
			let t = h(e), n = f.get(t.id);
			if (!n) throw Error(`${t.name} is continuous, not a categorical palette.`);
			return [...n];
		},
		diagnostics(e) {
			let t = h(e);
			return [...d.get(t.id)?.diagnostics ?? []];
		},
		withContext(e) {
			return Hs(n, {
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
export { Hs as createDataVisRuntime };
