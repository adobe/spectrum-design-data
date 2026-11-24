// Copyright 2026 Adobe. All rights reserved.
import { createRoot } from 'react-dom/client';
import { Switch, SwitchThumb } from '@ui-sdk/react/switch';
import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox';
import '../../switch.css';
import '../../checkbox.css';

const sizes = ['s', 'm', 'l', 'xl'];
const params = new URLSearchParams(location.search);
const which = params.get('c') ?? 'switch';

const specs = {
  switch: {
    axes: [['off', 'on'], ['std', 'emph'], ['en', 'dis']],
    render: ([value, emph, dis], size, key) => (
      <Switch key={key} data-key={key} data-size={size} defaultChecked={value === 'on'}
        {...(emph === 'emph' && { 'data-variant': 'emphasized' })} disabled={dis === 'dis'}>
        <SwitchThumb />
      </Switch>
    ),
  },
  checkbox: {
    axes: [['off', 'on', 'mixed'], ['std', 'emph'], ['ok', 'err'], ['en', 'dis']],
    render: ([value, emph, err, dis], size, key) => (
      <Checkbox key={key} data-key={key} data-size={size}
        defaultChecked={value === 'on' ? true : value === 'mixed' ? 'indeterminate' : false}
        {...(emph === 'emph' && { 'data-variant': 'emphasized' })}
        {...(err === 'err' && { 'data-invalid': '' })} disabled={dis === 'dis'}>
        <CheckboxIndicator><svg viewBox="0 0 10 10" width="100%" height="100%" aria-hidden="true"><path d="M1 5l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></CheckboxIndicator>
      </Checkbox>
    ),
  },
};
const spec = specs[which];
const combos = spec.axes.reduce((acc, a) => acc.flatMap((c) => a.map((v) => [...c, v])), [[]]);

function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      {sizes.flatMap((size) => combos.map((c) => (
        <div key={size + c} style={{ margin: 8 }}>
          <label>{spec.render(c, size, `${size}_${c.join('_')}`)} {size} {c.join(' ')}</label>
        </div>
      )))}
    </div>
  );
}

// Compares computed styles with <component>.expected.json for the current scheme; returns mismatches.
window.check = async (scheme) => {
  document.documentElement.dataset.colorScheme = scheme;
  const expected = await (await fetch(`/${which}.expected.json`)).json();
  const bad = [];
  let n = 0;
  for (const [id, e] of Object.entries(expected)) {
    const [s, size, ...rest] = id.split('_');
    if (s !== scheme) continue;
    const el = document.querySelector(`[data-key="${size}_${rest.join('_')}"]`);
    const cs = getComputedStyle(el);
    const got = { w: parseFloat(cs.width), h: parseFloat(cs.height), bg: cs.backgroundColor, border: cs.borderTopColor };
    const want = { w: e.w, h: e.h, bg: e.bg, border: e.border };
    if (which === 'checkbox') {
      got.borderW = parseFloat(cs.borderTopWidth); got.radius = parseFloat(cs.borderTopLeftRadius);
      want.borderW = e.borderW; want.radius = e.radius;
      const ind = el.querySelector('[data-slot="checkbox-indicator"]');
      if (ind && e.markW) { const ic = getComputedStyle(ind); got.markW = parseFloat(ic.width); got.markColor = ic.color; want.markW = e.markW; want.markColor = e.markColor; }
    } else {
      const t = getComputedStyle(el.querySelector('[data-slot="switch-thumb"]'));
      got.thumbW = parseFloat(t.width); got.thumbBg = t.backgroundColor; want.thumbW = e.thumbW; want.thumbBg = e.thumbBg;
    }
    n++;
    for (const k of Object.keys(want)) {
      const w = want[k], g = got[k];
      const same = typeof w === 'number' ? Math.abs(w - g) < 0.51 : w === 'transparent' ? /rgba\(0, 0, 0, 0\)|transparent/.test(g) : g.replace(/\s/g, '') === w.replace(/\s/g, '') || g.replace(/\s/g, '').replace('rgba', 'rgb').replace(',1)', ')') === w.replace(/\s/g, '');
      if (!same) bad.push({ id, k, want: w, got: g });
    }
  }
  return { checked: n, bad };
};

createRoot(document.getElementById('root')).render(<App />);
