<!-- Copyright 2026 Adobe. All rights reserved. -->
<script setup>
import { Switch, SwitchThumb } from '@ui-sdk/vue/switch';
import { Checkbox, CheckboxIndicator } from '@ui-sdk/vue/checkbox';
import { sizes, combos, attrsFor, checkedFor, disabledFor, install } from './check.js';

const which = new URLSearchParams(location.search).get('c') ?? 'switch';
install(which);
const rows = sizes.flatMap((size) => combos(which).map((c) => ({ size, c, key: `${size}_${c.join('_')}` })));
</script>

<template>
  <div style="padding: 16px">
    <div v-for="r in rows" :key="r.key" style="margin: 8px">
      <label>
        <Switch v-if="which === 'switch'" :data-key="r.key" :data-size="r.size" :default-checked="checkedFor(r.c) === true" :disabled="disabledFor(r.c)" v-bind="attrsFor(which, r.c)">
          <SwitchThumb />
        </Switch>
        <Checkbox v-else :data-key="r.key" :data-size="r.size" :default-checked="checkedFor(r.c)" :disabled="disabledFor(r.c)" v-bind="attrsFor(which, r.c)">
          <CheckboxIndicator><svg viewBox="0 0 10 10" width="100%" height="100%" aria-hidden="true"><path d="M1 5l3 3 5-6" fill="none" stroke="currentColor" stroke-width="1.5" /></svg></CheckboxIndicator>
        </Checkbox>
        {{ r.key }}
      </label>
    </div>
  </div>
</template>
