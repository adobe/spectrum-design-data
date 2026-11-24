// Copyright 2026 Adobe. All rights reserved.
import { render } from '@solidjs/web';
import { Switch, SwitchThumb } from '@ui-sdk/solid/switch';
import { Checkbox, CheckboxIndicator } from '@ui-sdk/solid/checkbox';
import '../../switch.css';
import '../../checkbox.css';
import { sizes, combos, attrsFor, checkedFor, disabledFor, install } from './check.js';

const which = new URLSearchParams(location.search).get('c') ?? 'switch';
install(which);
const rows = sizes.flatMap((size) => combos(which).map((c) => ({ size, c, key: `${size}_${c.join('_')}` })));

const Mark = () => (
  <svg viewBox="0 0 10 10" width="100%" height="100%" aria-hidden="true"><path d="M1 5l3 3 5-6" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
);

function App() {
  return (
    <div style={{ padding: '16px' }}>
      {rows.map((r) => (
        <div style={{ margin: '8px' }}><label>
          {which === 'switch' ? (
            <Switch data-key={r.key} data-size={r.size} defaultChecked={checkedFor(r.c) === true} disabled={disabledFor(r.c)} {...attrsFor(which, r.c)}>
              <SwitchThumb />
            </Switch>
          ) : (
            <Checkbox data-key={r.key} data-size={r.size} defaultChecked={checkedFor(r.c)} disabled={disabledFor(r.c)} {...attrsFor(which, r.c)}>
              <CheckboxIndicator><Mark /></CheckboxIndicator>
            </Checkbox>
          )}
          {' '}{r.key}
        </label></div>
      ))}
    </div>
  );
}
render(() => <App />, document.getElementById('root'));
