(function () {
  "use strict";
  function A() {
    return Math.random().toString(36).substring(7);
  }
  const T = ":*;",
    p = class {
      constructor() {
        (this._dirtyTopology = !0),
          (this._state = JSON.parse(JSON.stringify(p.DEFAULT_STATE))),
          (this._stringifiedState = "");
      }
      filter(t) {
        const e = new p(),
          i = Object.keys(this._state.nodes),
          c = Object.keys(this._state.adjacencyList);
        return (
          i.forEach((o) => {
            t(this._state.nodes[o]) &&
              e.createNode(JSON.parse(JSON.stringify(this._state.nodes[o])));
          }),
          c.forEach((o) => {
            e._state.nodes[o] &&
              this._state.adjacencyList[o].forEach((h) => {
                e._state.nodes[h] && e.createAdjacency(o, h);
              });
          }),
          e
        );
      }
      dirtyState() {
        this._stringifiedState = "";
      }
      get stringifiedState() {
        return (
          this._stringifiedState ||
            (this._dirtyTopology === !0 &&
              ((this._state.topologyKey = A()), (this._dirtyTopology = !1)),
            (this._stringifiedState = JSON.stringify(this._state))),
          this._stringifiedState
        );
      }
      orphanNodes() {
        let t = Object.keys(this._state.nodes);
        return (
          Object.values(this._state.adjacencyList).forEach(
            (i) => (t = t.filter((c) => !i.includes(c))),
          ),
          t
        );
      }
      hasNode(t) {
        return !!this._state.nodes[t];
      }
      createNode(t) {
        (this._state.nodes[t.id] = t), this.dirtyState();
      }
      updateNode(t, e) {
        const i = this._state.nodes[t];
        i && (Object.assign(i, e), this.dirtyState());
      }
      deleteNode(t) {
        delete this._state.nodes[t], delete this._state.adjacencyList[t];
        for (const e in this._state.adjacencyList) {
          const i = this._state.adjacencyList[e].indexOf(t);
          i >= 0 && this._state.adjacencyList[e].splice(i, 1);
        }
        (this._dirtyTopology = !0), this.dirtyState();
      }
      createAdjacency(t, e, i) {
        const c = this._state.adjacencyList[t] || [];
        if (
          (c.indexOf(e) === -1 &&
            (c.push(e), (this._state.adjacencyList[t] = c)),
          i)
        ) {
          const o = this._state.nodes[t];
          if (o) {
            const d = o.adjacencyLabels || {};
            (d[e] = i), Object.assign(o, { adjacencyLabels: d });
          }
        }
        (this._dirtyTopology = !0), this.dirtyState();
      }
      deleteAdjacency(t, e) {
        const i = this._state.adjacencyList[t] || [],
          c = i.indexOf(e);
        c >= 0 && (i.splice(c, 1), (this._state.adjacencyList[t] = i)),
          (this._dirtyTopology = !0),
          this.dirtyState();
      }
      setSize(t, e) {
        (this._state.width = t), (this._state.height = e), this.dirtyState();
      }
      reset() {
        (this._state = JSON.parse(JSON.stringify(p.DEFAULT_STATE))),
          (this._dirtyTopology = !0),
          this.dirtyState();
      }
      get state() {
        return JSON.parse(this.stringifiedState);
      }
      set state(t) {
        (this._state = t), this.dirtyState();
      }
    };
  let L = p;
  L.DEFAULT_STATE = {
    width: 0,
    height: 0,
    topologyKey: "",
    nodes: {},
    adjacencyList: {},
  };
  const E = 650,
    m = 16,
    x = 2,
    I = 3,
    M = 4;
  function G(t) {
    const e = new L();
    e.state = t;
    const c = e
      .orphanNodes()
      .sort((s, n) => {
        const a = t.nodes[s],
          r = t.nodes[n];
        return a.type === r.type
          ? s === n
            ? 0
            : s > n
            ? 1
            : -1
          : a.type === "component"
          ? -1
          : 1;
      })
      .map((s) => [s, 0]);
    c.sort((s, n) => {
      const a = s[1],
        r = n[1];
      return a === r ? 0 : a > r ? 1 : -1;
    });
    const o = [],
      d = [],
      h = {};
    let S = 0,
      l = 0;
    for (; c.length > 0; ) {
      const [s, n] = c.shift(),
        a = e._state.nodes[s],
        j = (a.value || "").split(T).length,
        y = e._state.adjacencyList[s] || [];
      y.sort();
      const _ = n + 1,
        f = y.map((u) => [u, _]);
      if (
        (c.push(...f),
        typeof d[n] != "number" && ((d[n] = 0), (o[n] = [])),
        (a.x = n * E),
        (a.y = d[n]),
        (d[n] += M + j * m + (x * j - 1) + I * 2),
        o[n].indexOf(s) === -1)
      ) {
        o[n].push(s);
        for (let u = 0; u < n; u++) {
          const N = o[u],
            O = N.indexOf(s);
          O >= 0 && N.splice(O, 1);
        }
        h[s] = [];
      }
      h[s] || (h[s] = []),
        h[s].push(a.y),
        (S = Math.max(S, a.x)),
        (l = Math.max(l, a.y));
    }
    for (const [s, n] of Object.entries(h))
      if (n.length > 2) {
        const a = Math.floor(n.length / 2),
          r = n[a];
        e._state.nodes[s].y = r;
      }
    for (let s = 0; s <= d.length - 1; s++) d[s];
    let g = [0];
    o.forEach((s, n) => {
      const a = g.reduce((y, _) => y + _, 0) / g.length;
      g = [];
      const r = d[n],
        j = n === 0 ? 0 : a - r / 2;
      s.forEach((y) => {
        const { y: _ } = e._state.nodes[y],
          f = _ + j;
        (e._state.nodes[y].y = f),
          (l = Math.max(l, f)),
          e._state.adjacencyList[y] && g.push(f);
      });
    }),
      e.setSize(S, l),
      self.postMessage(e.state);
  }
  self.addEventListener("message", (t) => G(t.data));
})();
