// Copyright 2026 Adobe. All rights reserved.
import '@ui-sdk/web/switch';
import '@ui-sdk/web/checkbox';
import '../../switch.css';
import '../../checkbox.css';
import { sizes, combos, attrsFor, checkedFor, disabledFor, install } from './check.js';

const which = new URLSearchParams(location.search).get('c') ?? 'switch';
install(which);
const mark = '<svg viewBox="0 0 10 10" width="100%" height="100%" aria-hidden="true"><path d="M1 5l3 3 5-6" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>';
const html = sizes.flatMap((size) => combos(which).map((c) => {
  const key = `${size}_${c.join('_')}`;
  const attrs = Object.entries({ 'data-key': key, 'data-size': size, ...attrsFor(which, c) }).map(([k, v]) => `${k}="${v}"`).join(' ');
  const dis = disabledFor(c) ? ' disabled' : '';
  const ck = checkedFor(c);
  const control = which === 'switch'
    ? `<ui-switch ${attrs}${dis}${ck === true ? ' default-checked' : ''}><ui-switch-thumb></ui-switch-thumb></ui-switch>`
    : `<ui-checkbox ${attrs}${dis}${ck === true ? ' default-checked' : ''}${ck === 'indeterminate' ? ' default-checked="indeterminate"' : ''}><ui-checkbox-indicator>${mark}</ui-checkbox-indicator></ui-checkbox>`;
  return `<div style="margin:8px"><label>${control} ${key}</label></div>`;
})).join('');
document.getElementById('root').innerHTML = `<div style="padding:16px">${html}</div>`;
