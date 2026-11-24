<!-- Copyright 2026 Adobe. All rights reserved. -->
<script>
  import { Switch, SwitchThumb } from '@ui-sdk/svelte/switch';
  import { Checkbox, CheckboxIndicator } from '@ui-sdk/svelte/checkbox';
  import { sizes, combos, attrsFor, checkedFor, disabledFor, install } from './check.js';

  const which = new URLSearchParams(location.search).get('c') ?? 'switch';
  install(which);
  const rows = sizes.flatMap((size) => combos(which).map((c) => ({ size, c, key: `${size}_${c.join('_')}` })));
</script>

<div style="padding: 16px">
  {#each rows as r (r.key)}
    <div style="margin: 8px">
      <label>
        {#if which === 'switch'}
          <Switch data-key={r.key} data-size={r.size} defaultChecked={checkedFor(r.c) === true} disabled={disabledFor(r.c)} {...attrsFor(which, r.c)}>
            <SwitchThumb />
          </Switch>
        {:else}
          <Checkbox data-key={r.key} data-size={r.size} defaultChecked={checkedFor(r.c)} disabled={disabledFor(r.c)} {...attrsFor(which, r.c)}>
            <CheckboxIndicator><svg viewBox="0 0 10 10" width="100%" height="100%" aria-hidden="true"><path d="M1 5l3 3 5-6" fill="none" stroke="currentColor" stroke-width="1.5" /></svg></CheckboxIndicator>
          </Checkbox>
        {/if}
        {r.key}
      </label>
    </div>
  {/each}
</div>
