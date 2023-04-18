(function () {
  "use strict";
  const p = ":^;",
    c = ":*;";
  let u = [];
  function r(t) {
    const s = [];
    u.forEach((a) => {
      let e = a.metadata;
      if (e) {
        const l = e.split(c);
        let n = [];
        l.length === 1 && l[0] === ""
          ? (n = [])
          : (n = l.map((v) => v.split(p)[0] || "")),
          (e = n.join(","));
      }
      if (t === "")
        s.push({ value: a.value, matchMarkup: a.value, type: a.type });
      else if (a.value.indexOf(t) >= 0)
        s.push({
          value: a.value,
          type: a.type,
          matchMarkup: a.value.replaceAll(t, `<span>${t}</span>`),
        });
      else if (e.indexOf(t) >= 0) {
        const l = e.replaceAll(t, `<span>${t}</span>`);
        s.push({
          value: a.value,
          type: a.type,
          matchMarkup: `${a.value} ${l}`,
        });
      }
    }),
      s.sort((a, e) => (a.value === e.value ? 0 : a.value > e.value ? 1 : -1)),
      self.postMessage(s);
  }
  self.addEventListener("message", (t) => {
    const s = t.data,
      a = s.name || "default",
      e = s.value || "";
    switch (a) {
      case "set-dictionary":
        u = e;
        break;
      case "find-matches":
        r(e);
        break;
    }
  });
})();
