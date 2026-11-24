// Copyright 2026 Adobe. All rights reserved.
// Framework-neutral parts of the demo: the combinations and the computed-style check.
export const sizes = ['s', 'm', 'l', 'xl'];
export const axes = {
  switch: [['off', 'on'], ['std', 'emph'], ['en', 'dis']],
  checkbox: [['off', 'on', 'mixed'], ['std', 'emph'], ['ok', 'err'], ['en', 'dis']],
};
export const combos = (which) => axes[which].reduce((acc, a) => acc.flatMap((c) => a.map((v) => [...c, v])), [[]]);
// Props every framework passes through to the control.
export const attrsFor = (which, c) => {
  const a = {};
  if (c[1] === 'emph') a['data-variant'] = 'emphasized';
  if (which === 'checkbox' && c[2] === 'err') a['data-invalid'] = '';
  return a;
};
export const checkedFor = (c) => (c[0] === 'on' ? true : c[0] === 'mixed' ? 'indeterminate' : false);
export const disabledFor = (c) => c[c.length - 1] === 'dis';

const rx = (s) => s.replace(/\s/g, '').replace('rgba', 'rgb').replace(',1)', ')');
export function install(which) {
  const part = which === 'switch' ? 'switch-thumb' : 'checkbox-indicator';
  window.check = async (scheme) => {
    document.documentElement.dataset.colorScheme = scheme;
    const expected = await (await fetch(`/${which}.expected.json`)).json();
    const bad = [];
    let n = 0, missing = 0;
    for (const [id, e] of Object.entries(expected)) {
      const [s, size, ...rest] = id.split('_');
      if (s !== scheme) continue;
      const host = document.querySelector(`[data-key="${size}_${rest.join('_')}"]`);
      const el = host?.matches(`[data-slot="${which}"]`) ? host : host?.querySelector(`[data-slot="${which}"]`);
      if (!el) { missing++; continue; }
      const cs = getComputedStyle(el);
      const got = { w: parseFloat(cs.width), h: parseFloat(cs.height), bg: cs.backgroundColor, border: cs.borderTopColor };
      const want = { w: e.w, h: e.h, bg: e.bg, border: e.border };
      const inner = el.querySelector(`[data-slot="${part}"]`);
      if (which === 'checkbox') {
        got.borderW = parseFloat(cs.borderTopWidth); got.radius = parseFloat(cs.borderTopLeftRadius);
        want.borderW = e.borderW; want.radius = e.radius;
        if (inner && e.markW) { const ic = getComputedStyle(inner); got.markW = parseFloat(ic.width); got.markColor = ic.color; want.markW = e.markW; want.markColor = e.markColor; }
      } else {
        const t = getComputedStyle(inner);
        got.thumbW = parseFloat(t.width); got.thumbBg = t.backgroundColor; want.thumbW = e.thumbW; want.thumbBg = e.thumbBg;
      }
      n++;
      for (const k of Object.keys(want)) {
        const w = want[k], g = got[k];
        const same = typeof w === 'number' ? Math.abs(w - g) < 0.51 : w === 'transparent' ? /rgba\(0, 0, 0, 0\)|transparent/.test(g) : rx(g) === rx(w);
        if (!same) bad.push({ id, k, want: w, got: g });
      }
    }
    return { checked: n, missing, bad };
  };
}
