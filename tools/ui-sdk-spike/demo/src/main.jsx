// Copyright 2026 Adobe. All rights reserved.
import { createRoot } from 'react-dom/client';
import { Switch, SwitchThumb } from '@ui-sdk/react/switch';
import '../../switch.css';

const sizes = ['s', 'm', 'l', 'xl'];
const rows = [
  { name: 'default', props: {} },
  { name: 'emphasized', props: { 'data-variant': 'emphasized' } },
  { name: 'disabled', props: { disabled: true } },
];

function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <button onClick={() => { const r = document.documentElement; r.dataset.colorScheme = r.dataset.colorScheme === 'dark' ? 'light' : 'dark'; }}>Toggle scheme</button>
      {rows.map((row) => sizes.map((size) => [false, true].map((on) => (
        <div key={`${row.name}${size}${on}`} style={{ margin: 8 }}>
          <label>
            <Switch data-size={size} defaultChecked={on} {...row.props}>
              <SwitchThumb />
            </Switch>
            {row.name} {size} {on ? 'on' : 'off'}
          </label>
        </div>
      ))))}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
