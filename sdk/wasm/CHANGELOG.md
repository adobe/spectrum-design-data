# @adobe/design-data-wasm

## 0.41.0

### Minor Changes

- [#2197](https://github.com/adobe/spectrum-design-data/pull/2197) [`7161bb0`](https://github.com/adobe/spectrum-design-data/commit/7161bb00cb098860da8b68a7859f4a2d5ae1c6f2) Thanks [@GarthDB](https://github.com/GarthDB)! - Every place that shows or matches a token name now uses the legacy name the engine
  derives (`extract_legacy_key`), pinned or not (proposal 023, slice 1).
  - Wasm `TokenResult` gains `legacyName`.
  - Recipe renders, scene `token` labels, the site and spec sheets show legacy names for
    unpinned tokens (about 1,808 live token rows, 930 distinct names; pixels do not).
  - A recipe selector's `legacyKey` matches the derived legacy name, and `rank_key` no
    longer counts the `legacyKey` pin as a name field, so site `candidates[].rank`
    changes for pinned tokens and pinned and unpinned tokens can now tie.
  - MCP `design-data-query`, `token-usage` and friends return the legacy name, resolve
    mode-dependent aliases through it, and still accept the old `field=value` text.
  - Removes 164 token `legacyKey` pins that now equal the derived name. Legacy output
    (`@adobe/spectrum-tokens`) is byte-identical.

### Patch Changes

- [#2216](https://github.com/adobe/spectrum-design-data/pull/2216) [`e562a93`](https://github.com/adobe/spectrum-design-data/commit/e562a932cd3a026fd9b822fe4a75263883cf5f8c) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the behavior contracts for Color wheel and Color area on the range runner, covered by intent.
  - Color wheel: one `range` with `wrap` over the hue 0 to 360 (`minValue`, `maxValue`, `step`), a
    page of 15 degrees, no right-to-left mirror (React Aria; Spectrum Web Components flips the
    arrows). `value`, `minValue` and `maxValue` are `aria-valuenow`, `aria-valuemin` and
    `aria-valuemax` on the `color-handle` part. Steps give 0 to 359; 360 only from `set-max` or a
    drag to the end.
  - Color area: two axes, `x` and `y`, in `ranges` (`x-value`, `y-value` and their bounds, one
    `step`), no wrap, a page of a tenth of each span. Every intent names its `axis`, a drag is one
    `move` per axis. Its `semantics` (an `axis` on each entry) come with the per-axis semantics
    change.
  - `isDisabled` ignores every value intent. An unset value reads the minimum on a step.
  - Component suites only. The `color-handle` part has focus `tab-stop` and no `role`, so no web
    key suite runs (decision A662: a `slider` role would run the shared slider suite). Spec sheets
    gain the keyboard-intent rows. No render change. The embedded dataset changes, so wasm gets
    a patch.

- [#2221](https://github.com/adobe/spectrum-design-data/pull/2221) [`5317fa5`](https://github.com/adobe/spectrum-design-data/commit/5317fa5872af945bb60382908eaf0beb1862180e) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the press-only behavior contract for Drop zone and exempt Color control as a sub-part.
  - Drop zone extends `press`: `isDisabled`, one `container` part with focus `tab-stop` and press
    `activate`, no `role` (decision A667 c). It has no drag-and-drop intents and no drop-target
    facet. With no role no web key suite runs, so it is covered by intent.
  - Color control gets a `sub-part` exemption (decision A665 a): it holds the shared `track` part
    under Color slider, Color area and Color wheel, which carry the behavior.
  - Scroll zoom bar is not covered here (deprecated, decision A733 a).
  - Spec sheets and renders are byte-identical. The embedded registry changes, so wasm gets a patch.

- [#2208](https://github.com/adobe/spectrum-design-data/pull/2208) [`e7ce3e2`](https://github.com/adobe/spectrum-design-data/commit/e7ce3e20426ed7809dbf428d97ca8969d8a2c28a) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the behavior contract for Number field on the range runner.
  - Role `spinbutton` on the `field` part (a tab stop). ArrowUp and PageUp `increment`, ArrowDown
    and PageDown `decrement`, Home `set-min`, End `set-max`, all on key down. A page is one `step`,
    not a fraction of the span. ArrowLeft and ArrowRight are not bound: they move the caret.
  - The `in-field-button` part (the stepper buttons) has focus `none`, so it is not in the tab order.
  - `value`, `minValue` and `maxValue` are exposed as `aria-valuenow`, `aria-valuemin` and
    `aria-valuemax`; `aria-valuenow` is absent while `value` is unset. `isDisabled` ignores every
    value intent. An unset `minValue` or `maxValue` is unbounded and an unset
    `value` follows React Aria (see range-unbounded-empty-value).
  - A component suite and a web `spinbutton` key suite. Spec sheets gain the number field value
    keyboard-intent rows. No render change. Read-only, hold to repeat, wheel, IME and number
    formatting are not modeled. The embedded dataset changes, so wasm gets a patch.

- [#2204](https://github.com/adobe/spectrum-design-data/pull/2204) [`c46cf6e`](https://github.com/adobe/spectrum-design-data/commit/c46cf6eebf93a9e11d401c8c5093855db5bb12fe) Thanks [@GarthDB](https://github.com/GarthDB)! - Add behavior contracts for Slider, Color slider and Rating on the range runner.
  - Each is a single-thumb `range` contract with role `slider`: arrows step, PageUp and PageDown
    page (a tenth of the span), Home and End set the bounds, a drag is `move` with a position.
    Right to left swaps ArrowLeft and ArrowRight from `direction` only, so orientation does not
    change the arrow order. `isDisabled` ignores every value intent.
  - Semantics expose `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-orientation`
    (Rating: value and `aria-valuemax` only; its minimum 0 is the ARIA default).
  - Slider gains an `orientation` option (horizontal or vertical, as on Color slider). Rating
    gains a `maxValue` option (default 5), because a range names its maximum as an option.
  - A component suite per contract plus a shared `slider` web key suite. Spec sheets gain the
    new option rows and the value keyboard-intent rows for the three components. No render change.
  - Two thumbs (`isRange`) and read-only are not modeled. The embedded dataset changes, so wasm
    gets a patch.

- [#2224](https://github.com/adobe/spectrum-design-data/pull/2224) [`3c88728`](https://github.com/adobe/spectrum-design-data/commit/3c887287d06b810fcc8d08d32ceab5dc742c78ce) Thanks [@GarthDB](https://github.com/GarthDB)! - Key behavior contract `semantics` per axis, and give Color area its accessibility attributes.
  - Spec: a `semantics` entry may name an `axis` (a key of the contract's `ranges`), so one
    attribute can be exposed once per axis (`aria-valuenow` for x and for y). An entry without an
    `axis` works as before. A vector reads an axis through `expect.axisAria`
    (`{ "x": { "aria-valuenow": "40" } }`); `expect.aria` does not see an entry that names an axis.
  - SPEC-118 and the runner's contract check reject an `axis` that is not a key of `ranges`, an
    `axis` on a contract with a single `range`, and the same attribute twice for one axis. A vector
    whose `axisAria` names an undeclared axis fails.
  - Data: Color area exposes `aria-valuenow`, `aria-valuemin` and `aria-valuemax` per axis on the
    `color-handle` part (copies of `x-value`, `x-minValue`, `x-maxValue` and the `y` equivalents,
    absent while the option is unset). The part keeps no `role` (decision A721).
  - 12 new Color area vectors: set and unset per axis, axis independence, bounds, disabled.
  - The embedded dataset changes, so wasm gets a patch.
  - An older CLI runs the new Color area suite without reading `axisAria` (it never checks those
    expectations), so a release that ships this needs `requires.cli` raised to the CLI that has it.

- [#2223](https://github.com/adobe/spectrum-design-data/pull/2223) [`be416a9`](https://github.com/adobe/spectrum-design-data/commit/be416a95f6630f10528118bacab2932042185d4f) Thanks [@GarthDB](https://github.com/GarthDB)! - Behavior contracts for text field, text area and search field, built on the text runner
  (decisions A664 a, A666 a).
  - Each contract extends `text` (`isDisabled`, `value`, `hasValue`, `clear`, `submit`) and has a
    `field` part with focus `tab-stop`. Text field and text area are `textbox` and bind no key.
    Search field is `searchbox`: Escape clears, Enter submits. Its `in-field-button` has focus `none`.
  - `aria-invalid` and `aria-required` (text field, text area) are copied from `isError` and
    `isRequired`, absent while `false`. `aria-label` is copied from `label`, absent unless
    `hideLabel` is set. No `describedby` or `labelledby`, no `isReadOnly` (later changes).
  - The search field component's `accessibility.role` changes from `textbox` to `searchbox`, so its
    spec sheet role row changes. Text field and text area list the `clear` and `submit` intents in
    their keyboard intents.
  - Known: the spec sheet Keyboard table lists `clear` and `submit` rows with empty keys for text
    field and text area, and no Escape or Enter row for search field (a later Rust change may fix).
  - Conformance: a suite per component and the web key suites `searchbox` and `textbox`.

- [#2229](https://github.com/adobe/spectrum-design-data/pull/2229) [`a8c2821`](https://github.com/adobe/spectrum-design-data/commit/a8c28218ef86fc755f997cc7d3ff221092c61c3e) Thanks [@GarthDB](https://github.com/GarthDB)! - Deprecate five components (`lifecycle.deprecatedIn` on the component files).
  - `single-calendar`, `double-calendar`, `triple-calendar`: use `calendar` with
    its `months` slot (option `visibleMonths` 1, 2 or 3) instead.
    Their two records each stay frozen with their legacy keys and are not
    marked deprecated, so legacy output does not change.
  - `scroll-zoom-bar`, `bottom-navigation-android`: no records, no anatomy and no
    recipe, and the migration had already dropped them.

  No record, relationship, recipe or behavior changes. `validate-dataset`,
  `status`, `behavior test --all` and `spec-sheet --all` are unchanged.

- [#2227](https://github.com/adobe/spectrum-design-data/pull/2227) [`6f12d24`](https://github.com/adobe/spectrum-design-data/commit/6f12d245d062e6f892c216e33a714bfcc80e0eab) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the options a later recipe slice and the Drop zone contract need.
  - Drop zone gets `isDisabled` (boolean, default false), so the `isDisabled` state its behavior
    contract lists is an option of the component. This clears one SPEC-118 warning.
  - Drop zone and Select box each get an `illustration` string option, declared as Illustrated
    message declares it. No recipe binds it yet.
  - Renders are byte-identical. The embedded dataset changes, so wasm gets a patch.

- [#2228](https://github.com/adobe/spectrum-design-data/pull/2228) [`33161dc`](https://github.com/adobe/spectrum-design-data/commit/33161dce8ed8f68ccd4054131c7b85d063571e85) Thanks [@GarthDB](https://github.com/GarthDB)! - Draw the list-view checkbox and give the focused row a focus ring.
  - The `checkbox` part is present when `selectionMode` is `multiple`, as in menu. Each row draws
    the checkbox recipe (checked when selected, dimmed when disabled) before the icon and label.
    Single or no selection draws nothing. `selectionMode` leaves `notVisual`.
  - The `keyboard-focus` state draws the `focus-indicator` ring around each row from the
    focus-indicator color, thickness and gap records, replacing the row stroke workaround.
  - Differs or not drawn: a multiple-selection row is 8 px taller than a single one (48 vs 40,
    as in menu); a long label overflows 22 px further than before.
  - The description starts under the checkbox, not under the label.
  - The checkbox does not follow the hover or down state.
  - The ring on the first and last row has radius 3 against a row corner of 8 (the engine ignores
    per-corner radii).
  - Keyboard focus is global, so multi-row goldens ring every row.
  - Not drawn: per-item `hideCheckbox`, drag handle, actions, section header.

- [#2196](https://github.com/adobe/spectrum-design-data/pull/2196) [`335e55c`](https://github.com/adobe/spectrum-design-data/commit/335e55cddfa2dd35ed97c9f8fa4e848487bcc300) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate avatar relationship records and recipe to structured identity. Every record now has a part.
  Avatar stays at status level 1 with 3 collisions (the gradient-stop value records) until the status
  follow-up lands. The legacy `@adobe/spectrum-tokens` output is unchanged.
  - All 24 live records without a `scope.part` get one: `container` (size, border, opacity, focus
    indicator, gradient stops and fills), `initials` (font and text color), `guest-icon` (icon color).
  - The three gradient stops become one identity each through the new `scope.ordinal` field:
    `gradient-stop-1..3` becomes `gradient-stop` with ordinal 1 to 3 (the three private value records
    too), and the three `Background (gradient stop N)` colors become `color` / `background` with
    the same ordinals. The recipe selects the stops by `{part, ordinal}` instead of by context.
  - Fused names decompose: `font-size-100` becomes `font-size`, `line-height-100` becomes
    `line-height`; initials and icon `color` becomes `content-color`, as in other migrated components.
  - Legacy names keep their `legacyKey` pins (`avatar-border-color`, `avatar-opacity-disabled`,
    `avatar-border-width`, `gradient-stop-N-avatar`).
  - Renders are unchanged: 6,434 avatar, tag and related scenes render byte-identical SVG before
    and after, plus 600 PNGs. The avatar spec sheet merges the three gradient-stop token blocks into
    one block with three rows; every row still appears once.

- [#2202](https://github.com/adobe/spectrum-design-data/pull/2202) [`1eb5fb9`](https://github.com/adobe/spectrum-design-data/commit/1eb5fb94759c238d21e97b273c3238d308b76499) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate button, action-button and badge relationship records and recipes to structured identity.
  The legacy `@adobe/spectrum-tokens` output and every rendered SVG are unchanged.
  - Button, action-button and badge move from status level 1 to level 3. Every live record gets a
    `scope.part` (and `scope.attribute` for background and border color), and the recipes bind by
    property, part and `between` instead of `context` (context selectors 86 to 0).
  - Fused names decompose: `component-height-*` becomes `minimum-height` (`height` on action-button),
    `font-size-*` and `line-height-font-size-*` become `font-size` and `line-height`, and the edge
    spacing names become `space-between` between a `start-edge`, `top-edge`, `bottom-edge` or
    `end-edge` and `icon`, `label` or `hold-icon`, each with a `size` pin. The icon-only records pin
    `isLabelHidden`, `hideLabel` or `label: false`.
  - Identity collisions clear by giving the colliding records one `context`: button `Fill`, `Outline`
    and the two static focus-indicator records (which pin `staticColor`), the badge `Background`
    records, the button wrapping corner radii (which pin the new `isLabelWrapped` option, default
    false) and the icon-only spacing records. The progress fill records of button and action-button
    use `content-color`.
  - Their spec sheets merge a few rows that share a token and value.

- [#2214](https://github.com/adobe/spectrum-design-data/pull/2214) [`82a1b1d`](https://github.com/adobe/spectrum-design-data/commit/82a1b1dcb80bbef7cfe0946e190167bc579162ea) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate the clear-button, close-button and link recipes to structured identity. All three go from
  status level 2 to level 3: their 61 recipe bindings select by `property` plus `part` instead of a
  `context` label. The relationship records already carried a part, so no relationship record changes.
  The legacy `@adobe/spectrum-tokens` output is unchanged.
  - clear-button (16 bindings), close-button (30) and link (15): the contexts `Button size`, `Cross
icon size`, `Cross icon`, `Focus ring`, `Background`, `Button size (down)` and `Text` become
    `part` (container, icon, focus-indicator, text).
  - Each selector resolves to the same records as before, so renders are byte-identical and the
    spec sheets are unchanged.
  - The status baseline moves the three components to level 3 and the context-selector baseline
    drops their entries.

- [#2212](https://github.com/adobe/spectrum-design-data/pull/2212) [`365bf9f`](https://github.com/adobe/spectrum-design-data/commit/365bf9f3b8f185ae1047195f6a40b88d68d77f78) Thanks [@GarthDB](https://github.com/GarthDB)! - Bind the progress-circle, in-field-progress-circle, divider, field-label and help-text
  recipes to structured identity.
  The legacy `@adobe/spectrum-tokens` output, every rendered SVG and every spec sheet are unchanged.
  - The five components move from status level 2 to level 3. Each recipe binding that selected a
    relationship by `context` now selects it by `property` and `part` (progress-circle and
    in-field-progress-circle: `track` and `fill`; divider: `line`; field-label: `container` and
    `necessity-indicator`; help-text: `icon`, `container` and `text`). Context selectors 31 to 0.
  - No relationship record changes: they already carried the part.

- [#2213](https://github.com/adobe/spectrum-design-data/pull/2213) [`37a8405`](https://github.com/adobe/spectrum-design-data/commit/37a8405aacbd838417eca0378fc8fe98729aa8e1) Thanks [@GarthDB](https://github.com/GarthDB)! - Bind 18 of the 19 swatch recipe selectors to structured identity. The legacy
  `@adobe/spectrum-tokens` output, every rendered SVG and every spec sheet are unchanged.
  - Swatch bindings select by `property`, `part` and (for the border color and width) `attribute`
    instead of `context`: context selectors 19 to 1. Swatch stays at status level 2: the disabled
    icon color binding keeps its `context`, because its record shares `property` and `part` with
    the disabled icon outline color and a structured selector would name two identities.
  - The swatch recipe snapshots gain the `value` option axis (24 option sets become 72): the
    part-only selectors now also match the `value: add` records, so the recipe counts `value` as
    read. Output is the same for every value.

- [#2210](https://github.com/adobe/spectrum-design-data/pull/2210) [`00620bb`](https://github.com/adobe/spectrum-design-data/commit/00620bb8d94d9e80347692e5f82c36384d09cee1) Thanks [@GarthDB](https://github.com/GarthDB)! - The behavior runner supports ranges keyed by axis and wrapping ranges (decisions A660, A661, A662).
  - A contract may declare `ranges` (one `range` block per axis, for color-area `x` and `y`) instead
    of `range`. `do.adjust` takes an `axis`, or else the `axis` of the vector step; a `move` carries
    one axis and one `position`.
  - `wrap: true` on a block makes a cycle (color-wheel hue 0 to 360): a step or page step reduces
    into `[min, max)`, so 359 up is 0 and 0 down is 359. `to: max` and a `move` to 1 reach max;
    `to: min` and `to: max` never wrap. Snap, clamp, decimals and emit-only-on-change are as before.
  - A missing, unknown or conflicting axis, and a wrap span that is not a multiple of the step,
    fail the vector. SPEC-119 warns on `range` with `ranges`, two axes with one value option, an
    `adjust` axis the `ranges` do not list, and `wrap` without `min` and `max`.
  - No component has an axis or wrap contract yet.

- [#2195](https://github.com/adobe/spectrum-design-data/pull/2195) [`3f4c588`](https://github.com/adobe/spectrum-design-data/commit/3f4c5884c886cfebdef8a17384b19093cc7764f7) Thanks [@GarthDB](https://github.com/GarthDB)! - The behavior runner supports single-thumb value ranges (slider), decisions A658 and A661.
  - A contract may carry a `range` block (value, min, max, step options, `page`, `mirror`) and the
    one action `do.adjust` (`by` one step or page, or `to` min, max or a pointer position).
  - The runner snaps to the step (half away from the minimum), clamps, keeps whole numbers whole
    and emits `change` only when the value changed.
  - New intents `increment-page`, `decrement-page`, `set-min`, `set-max` and the event `move`
    (a step carries `position`, 0 to 1); a new `range` pattern; web binds the `slider` role.
  - SPEC-119 warns on a `range` option missing from `state` and on `do.adjust` with no `range`.
  - No component has a range contract yet.
  - A decimal half snaps away from the minimum despite float noise; a non-numeric option fails.

- [#2211](https://github.com/adobe/spectrum-design-data/pull/2211) [`9f22db7`](https://github.com/adobe/spectrum-design-data/commit/9f22db7215a4717a582c18742c14eda930984274) Thanks [@GarthDB](https://github.com/GarthDB)! - The behavior runner treats an unset range bound as unbounded and an empty value like React Aria
  (decisions A712 b and A713 a).
  - An unset `min` or `max` option means no bound on that side: no clamp, snapping from 0 when
    there is no minimum, Home does nothing without a minimum and End nothing without a maximum.
    A page by a fraction and a `move` position need both bounds and change nothing without them;
    `wrap` needs both and fails the vector. A key a block leaves out (Rating's `min`) keeps its
    default.
  - With `value` unset, increment goes to the minimum and decrement to the maximum (0 without
    one). Home and End are unchanged.
  - The number-field `known limit` vectors are rewritten to this behavior. Rating's two vectors
    that relied on an unset value and an unset `maxValue` follow it.

- [#2207](https://github.com/adobe/spectrum-design-data/pull/2207) [`1d15af6`](https://github.com/adobe/spectrum-design-data/commit/1d15af6649c9608a16a5da0831080140c1788c5e) Thanks [@GarthDB](https://github.com/GarthDB)! - Drop `maximum: 5` from the Rating `value` option, which conflicted with the
  configurable `maxValue` option (default 5). `multipleOf: 0.5` stays as display precision.

- [#2222](https://github.com/adobe/spectrum-design-data/pull/2222) [`ed99a50`](https://github.com/adobe/spectrum-design-data/commit/ed99a50ff4a1d96acf6192e54f4e2d153e85685d) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the visual recipe for illustrated-message.
  - illustrated-message: a centered column with the illustration image fill (placeholder),
    title, description and a `button-group` slot of buttons. The width follows `orientation`;
    type and colors read the relationship records.
  - The component gains a `button-group` slot (up to two buttons), a temporary stand-in for
    the nested group (bead 5m92.32.22), as in the dialogs and coach-mark.
  - The 16 title relationship records point at the final token, not at a `title` record that
    carries a context, which a recipe binding cannot follow. Values are unchanged.
  - The title font-size records name the token of their own scale, so the sheet shows
    each scale's value.
  - Not drawn yet: the illustration (a zero-height box: no size record, qkj5.243); spacing between
    parts (qkj5.288; a column root takes one gap); the horizontal layout (the `horizontal` golden is
    the vertical column at 512 px); wrapped lines are left-aligned in the centered column.

- [#2217](https://github.com/adobe/spectrum-design-data/pull/2217) [`e9efde3`](https://github.com/adobe/spectrum-design-data/commit/e9efde3608f392c6b21d1d2ba81b04a1223b6f26) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the visual recipe for list-view.
  - One row per `items` entry: selected, unselected and disabled rows,
    an optional description line and the navigation chevron.
  - First and last rows round their outer corners; the selected row gets
    the accent border; the focus state draws the focus outline.
  - New `isSelected`, `isDisabled` and `description` options, and the
    `hover`, `down`, `default` and `selected` states.
  - Row background, label and padding records pin state, selection and
    scale; the background records reference their color tokens (not
    stack-item records) and scope to `list-item`, so selected and
    hovered rows draw a subtle fill.
  - A disabled row only dims; it has no fill of its own.
  - Not drawn yet: checkbox, drag handle, actions, section header,
    container border and background, emphasized and dragged rows,
    text truncation.

- [#2203](https://github.com/adobe/spectrum-design-data/pull/2203) [`ebc93d2`](https://github.com/adobe/spectrum-design-data/commit/ebc93d2844fe357dd9bff2b407b460913da3bf6e) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the Switch, Checkbox, Radio button, Button, Action button, Close button, Clear button,
  In-field button, Link and Swatch recipes from option names to behavior facets in their `when`
  clauses (`disabled`, `selected`, `checked`, `pending`, and the `hovered`, `pressed` and
  `focusVisible` interaction facets). Every rendered SVG and PNG, spec sheet and the legacy
  `@adobe/spectrum-tokens` output are unchanged.

  The recipes need an engine that reads facet clauses: CLI 0.63.7 or later, the first to load
  contracts in wasm, the MCP server and the TUI preview (already the `requires.cli` of the dataset).
  An older TUI build, which is not checked against `requires.cli`, may draw these components'
  previews wrongly (a state or option clause that never matches).

  Not converted: Checkbox `isSelected` (its `checked` facet also fixes `isIndeterminate`),
  and the `orientation` clauses of Button group, Checkbox group and Radio group (SPEC-066 does not
  yet read facet clauses and would warn that the option is unused).

- [#2225](https://github.com/adobe/spectrum-design-data/pull/2225) [`523e156`](https://github.com/adobe/spectrum-design-data/commit/523e156068b9ff7bad4cc24391cc559a32993282) Thanks [@GarthDB](https://github.com/GarthDB)! - Draw a `ring` part that is a child of a repeated copy (a collection item or a nested repeat).
  - A `ring` listed in `children` of a repeated part no longer joins the flow, where the solver
    read `color` on it (a debug assertion). Recipe compilation moves it out of `children` and
    names its parent as the ring's `host`; each copy draws its own ring around its box, or the
    `around` part, exactly as a ring on a plain root is drawn.
  - A ring is drawn by the scene its `host` roots, and an orphan ring (listed nowhere) only by the
    recipe's own root, so a repeat no longer repeats an orphan ring around every copy.
  - No component recipe changes and every existing render is byte-identical.

- [#2231](https://github.com/adobe/spectrum-design-data/pull/2231) [`6c09a68`](https://github.com/adobe/spectrum-design-data/commit/6c09a68a1a5349f4769ba9fb4f1d459bc44dc0b8) Thanks [@GarthDB](https://github.com/GarthDB)! - Draw the takeover dialog full-screen variant with its background and square corners.
  - The layer-2 background records now pin `variant` to `dialog` and `full screen`, so the full-screen
    variant draws its fill. Its dark render no longer shows light text on no fill.
  - New corner-radius record for `full screen` bound to `corner-radius-none` (0). The `dialog`
    record points at `corner-radius-800` (16px, the value it resolved to) rather than the size
    `xl` alias, because the render engine drops a size-named token when two records compete for
    one binding.
  - Not modeled on purpose: width and height. Figma shows both variants filling the parent (dialog is
    the viewport minus the 40px margin, full screen is the viewport), so there is no fixed size to
    record. The deprecated `takeover-dialog-width` and `-height` records are untouched.
  - Not drawn (literals only, no records): margin (no recipe prop), overlay (Figma 0.44), padding 32,
    container gap 32, header gap 24, button-group gap 8, title 22 bold. The recipe's title and button
    gap differ from Figma: title 22 bold vs 14 regular, gap 8 vs `spacing-200`, which renders 12.
  - Spec sheet: the dialog radius row loses its "Extra Large" label (same 16px value) and the
    background rows lose their variant condition.
  - Legacy output is unchanged. The embedded dataset changes, so wasm gets a patch.

- [#2218](https://github.com/adobe/spectrum-design-data/pull/2218) [`b47404c`](https://github.com/adobe/spectrum-design-data/commit/b47404c4d050457146073ec3bfc0478afe8954c5) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a structure-only visual recipe for takeover-dialog.
  - Structure only: no padding, title type or gaps (no records), so the title and
    steplist touch and a long title does not wrap. Renders look unfinished.
  - Rounding and background bind by relationship for the dialog variant only. The
    full-screen variant has no records and draws no fill, so its dark render is
    near-white text on nothing.
  - The title binds its color. Header row: title, header-content slot, button
    group. Body: the default slot.
  - takeover-dialog gains a `header` anatomy part and a temporary `button-group`
    slot (bead 5m92.32.22). Header-content and default slots declare `accepts`
    and `demo`.
  - Not drawn: overlay (its color record points at a deprecated black token),
    margin, width and height (deprecated records). No shadow, as in Figma and S2.
  - Snapshots and goldens are regenerated. Legacy token output is unchanged.

- [#2215](https://github.com/adobe/spectrum-design-data/pull/2215) [`8d8c79e`](https://github.com/adobe/spectrum-design-data/commit/8d8c79ec0131dd7fc7abbaf20844bf80472cc630) Thanks [@GarthDB](https://github.com/GarthDB)! - The behavior runner models text inputs: a `text` pattern, the `hasValue` facet and the `clear`
  and `submit` intents (decisions A664 a, A666 a, A667 c).
  - A facet `values` entry may be an any-of array for one source option, and a facet may add
    `otherwise`, the value when no entry matches. `hasValue` is `false` for an unset, null or
    empty `value`, else `true`. A recipe cannot select such a facet value (SPEC-122).
  - The `text` pattern answers `clear` (sets `value` to `""`, emits `change`, only while there is
    a value) and `submit` (emits `submit`, changes nothing). Both are ignored while disabled.
    `do: {}` is allowed only on a transition that emits (SPEC-119 warns otherwise). `clear` writes
    `""`, which the range runner now reads as an unset value.
  - Web bindings: role `searchbox` binds Escape to `clear` and Enter to `submit`; role `textbox`
    binds no keys. SPEC-118 checks `otherwise` and any-of use.
  - No component has a text contract yet (text field, text area and search field follow).

## 0.40.1

### Patch Changes

- [#2181](https://github.com/adobe/spectrum-design-data/pull/2181) [`33a62fc`](https://github.com/adobe/spectrum-design-data/commit/33a62fc9e19a840655b6a07320a399645c4dfa48) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove 17 misfiled `Step text` and `Step visual` records from the action-bar
  relationships. Each `$ref` already has a record in `steplist.json` with the
  proper `label`, `visual` or `track` part. The records had no legacy key and
  nothing referenced them, so the legacy `@adobe/spectrum-tokens` output is
  byte-identical. Action-bar now reads L2 (was L1). The embedded relationships
  change, hence the wasm patch.

- [#2191](https://github.com/adobe/spectrum-design-data/pull/2191) [`36b0fcb`](https://github.com/adobe/spectrum-design-data/commit/36b0fcb5be3f5a56fc6823d87b5f2f801f71a968) Thanks [@GarthDB](https://github.com/GarthDB)! - Collection items can carry accessibility state, key steps can address an item, and a group with no
  `traversal` ignores `navigate-*`.
  - An inline collection item takes `semantics` (same shape as a contract's). A vector reads them with
    the new `expect.itemAria` (per item).
  - An `input` step takes `item`: the key resolves through the role of that item's part and the
    intents run on that item.
  - A collection with no `traversal` declares no navigation; `navigate-*` on its group does nothing.
  - Accordion headers expose `aria-expanded` from the `expanded` facet; three vectors pin it and the
    no-navigation rule.

- [#2184](https://github.com/adobe/spectrum-design-data/pull/2184) [`a302bb1`](https://github.com/adobe/spectrum-design-data/commit/a302bb18a4c62e28bcf2225cd1982565fa3b2e7c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the focus states of text-field, number-field, text-area, search-field and picker.
  Keyboard-focus and focus + hover borders now match Figma.
  - The focus records pinned the composite states `focus-+-hover` and `focus-+-not-hover`,
    which no render ever activates. They now pin `["focus", "hover"]` and `["focus"]`
    (AND-state pins), and the components declare `focus` instead of the composite states.
  - Keyboard focus draws the gray-800 border (was gray-300); keyboard focus + hover draws
    gray-900 (was gray-400); error + keyboard focus + hover draws negative/focus-hover
    (was negative/hover). Default, hover, error, error + hover and disabled are unchanged.
  - The unpinned `key-focus` border and value records that duplicated the focus records are
    removed, so keyboard-focus renders no longer report `ambiguous: 2 candidates remain`.
  - The legacy `@adobe/spectrum-tokens` output is unchanged.

- [#2193](https://github.com/adobe/spectrum-design-data/pull/2193) [`19c3c5f`](https://github.com/adobe/spectrum-design-data/commit/19c3c5fc821ebc02a3d0da2ebf576cb0c0351b4d) Thanks [@GarthDB](https://github.com/GarthDB)! - A key suite can run against the item parts of a collection.
  - A suite in `conformance/behavior/bindings/<platform>/<role>.item.json` sets `"item": true`. The
    runner then selects every component whose collection item contract has a part with that role,
    not the group's own part, so Accordion (a group with no role) runs the `button` key vectors.
  - The Accordion key vectors (Enter, Space, an arrow) moved from a Rust-only test into
    `bindings/web/button.item.json`.

- [#2180](https://github.com/adobe/spectrum-design-data/pull/2180) [`7f72fe6`](https://github.com/adobe/spectrum-design-data/commit/7f72fe60e6d08a50cdc0f1c20091b09161fb7391) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate accordion relationship records and recipe to structured identity. Accordion moves from
  status level 1 to level 3. The legacy `@adobe/spectrum-tokens` output is unchanged.
  - Fused names decompose: `component-height-75..300` becomes `height` with a `size` pin,
    `font-size-100..400` becomes `font-size` with a `size` pin, `line-height-100` becomes
    `line-height`, `accordion-focus-indicator-gap` becomes `gap`, and `content-color` becomes `color`.
  - 30 header and content `space-between` records get a `between`, and the three header `Paddings`
    records use `padding`, so each context has its own identity. The `Disabled` title color moves to
    part `accordion-item`; the recipe's title, chevron and content colors read it when `isDisabled`.
  - The recipe binds by part and identity instead of by `context` (context selectors 17 to 0).
  - Renders are unchanged except one case: an open item with `content` text in the `down` state now
    draws the content in the neutral text color; before, an accidental solver pick drew it in
    disabled grey.
  - The accordion spec sheet regroups size rows (the size moves into a row condition); every row
    still appears once. The recipe snapshots now set `content` text for accordion.

- [#2182](https://github.com/adobe/spectrum-design-data/pull/2182) [`142e355`](https://github.com/adobe/spectrum-design-data/commit/142e3551826885603e908c9a0c0fb6c5ae6ee9fd) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate list-view and table relationship records to structured identity. Both components move from
  status level 1 to level 2 (neither has a recipe, so level 3 does not apply). The legacy
  `@adobe/spectrum-tokens` output and every rendered SVG are unchanged.
  - 149 live records get a `scope.part` from the components' anatomy, and fused names decompose:
    `component-edge-to-text-100`, `component-top-to-text-100` and similar become `space-between`
    with a `between`; `font-size-100` becomes `font-size` (with a `size` pin in table);
    `row-height` becomes `height` on its part.
  - Identity collisions (6 in list-view, 8 in table) are cleared by giving each colliding identity
    one context and, in table, by a `density` pin on three checkbox spacing records. No uuid,
    `legacyKey`, `$ref` or `contextRole` change; deprecated records are untouched.
  - The list-view and table spec sheets regroup, and three duplicate `base-padding-vertical-medium`
    rows (same token and value) collapse; the other 90 sheets are unchanged.

- [#2183](https://github.com/adobe/spectrum-design-data/pull/2183) [`07569f2`](https://github.com/adobe/spectrum-design-data/commit/07569f2b0925208188b1b835236763abbec42a61) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate checkbox, switch and radio-button relationship records and recipes toward structured
  identity. The legacy `@adobe/spectrum-tokens` output and every rendered SVG are unchanged.
  - Checkbox, switch and radio-button move from status level 1 to level 3. The two switch
    `line-height-100` records get `contextRole` `["label"]` and `context` `Label` (the `size` role was
    an authoring slip). The 7 radio-button `background-color` records gain `scope.part` `control`;
    the other 29 `background-color` and `border-color` records are left as they are.
  - Fused names decompose: `component-height-*` becomes `minimum-height`, `font-size-*` and
    `line-height-font-size-*` become `font-size` and `line-height`, and
    `component-top|bottom-to-text-*` becomes `space-between` between `top-edge` or `bottom-edge` and
    `label`, each with a `size` pin.
  - Radio-button records get a `scope.part` and `between` from the anatomy. The recipes bind by
    property, part and `between` instead of `context` (radio-button context selectors 24 to 0).
  - 25 `legacyKey` records get the `context` of their alias record, which clears the identity
    collisions. No uuid, `legacyKey` or `$ref` change; deprecated records are untouched.
  - The switch, checkbox and radio-button spec sheets lose four duplicate bottom-edge rows each, and
    the legacy-pinned switch rows split by scale.

- [#2192](https://github.com/adobe/spectrum-design-data/pull/2192) [`f9f6c7b`](https://github.com/adobe/spectrum-design-data/commit/f9f6c7b7fef02225ed6df7d5cb45237f6e6d6622) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the `value`, `minValue`, `maxValue` and `step` options to the number-field component.
  - `value` is a number and `step` is a number that defaults to 1. `minValue` and `maxValue`
    are numbers with no default, because a number field has no built-in bounds (slider defaults
    them to 0 and 100).
  - The options match the slider declarations, and the number-field recipe lists the four in
    `notVisual`, so renders are unchanged. The spec sheet options table gains four rows.
  - `isReadOnly` is not added here; it follows later for the text-entry components and slider.
  - The legacy `@adobe/spectrum-tokens` output is unchanged.

- [#2188](https://github.com/adobe/spectrum-design-data/pull/2188) [`849bd9a`](https://github.com/adobe/spectrum-design-data/commit/849bd9a1845e7257e4db1dd89e46e4e5891378bd) Thanks [@GarthDB](https://github.com/GarthDB)! - Relationships can carry an ordinal in their identity.
  - **relationship-format.md, relationship.schema.json**: new `scope.ordinal` (integer, 1 or
    more). Records that differ only by it are distinct identities, so the stops of one gradient
    need no digit in the property name. A record without it is unchanged.
  - **Rule SPEC-125** (`relationship-ordinal-valid`, error): the ordinal is a positive integer.
  - **component-visual.schema.json**: a structured selector may name `ordinal`.
  - **Engine**: the identity line, the status collision check, the changelog identity class
    (an ordinal change is an API change) and the record diff label read the ordinal.
  - No data uses the field yet; the avatar gradient stops migrate in a follow-up.

- [#2190](https://github.com/adobe/spectrum-design-data/pull/2190) [`a5c3872`](https://github.com/adobe/spectrum-design-data/commit/a5c38722cd696272eeff263af75efa8c0b0aa1d8) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove 194 redundant `name.legacyKey` pins from live tokens (color-aliases 7,
  layout 133, layout-component 54). Each name is rebuilt from the name object,
  so the legacy `@adobe/spectrum-tokens` output is byte-identical and the
  spec-sheet, render and site output are unchanged. Deprecated tokens and
  relationship record pins are untouched. The embedded tokens change, hence the
  wasm patch.

  For MCP users: `design-data-query` now returns the cascade-derived `name` for
  these tokens (for example `property=key-color emphasis=emphasized
structure=drop-shadow colorScheme=light` instead of
  `drop-shadow-emphasized-key-color`), and `design-data-token-usage` no longer
  finds up to 129 of them by their legacy name. Look them up by uuid or the
  cascade label.

## 0.40.0

### Minor Changes

- [#2160](https://github.com/adobe/spectrum-design-data/pull/2160) [`2da7210`](https://github.com/adobe/spectrum-design-data/commit/2da721047556bfaa4347f1c9d6621545191c5d54) Thanks [@GarthDB](https://github.com/GarthDB)! - Add behavior contracts for the display components and harden the runner.
  - Runner: a suite now pins its contract's `state`, `wcag` and each part's
    `role`, `focus`, `press` and `handles` (`pins`); a changed focus mode, a
    dropped `isDisabled` or a mistyped role fails. A key step or key suite for
    a role with no binding fails instead of skipping. The CLI is 0.63.7 (the
    runner is in the binary); `requires.cli` is unchanged.
  - Format: `semantics` may copy an option to an attribute (`copy`, with
    `absentWhen`), and a vector may expect `aria` attributes.
  - Data: contracts for Progress bar, Progress circle, In-field progress
    circle and Meter (role, `focus: none`, value, `aria-valuetext` and
    `aria-label` attributes, no transitions), with vectors. No accessibility
    block changed; renders and spec sheets are unchanged.

- [#2164](https://github.com/adobe/spectrum-design-data/pull/2164) [`4efe4f6`](https://github.com/adobe/spectrum-design-data/commit/4efe4f68e158e46f06ccfec0c65e1227050da038) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the behavior contracts and patterns in the dataset, so a recipe that reads `facets` resolves.
  - `Dataset.embedded()` now carries `behaviors/*.json` and `behaviors/patterns/*.json` next to
    the recipes, as `design-data render` loads them. No recipe reads `facets` yet, so no render
    changes.
  - The package grows by about 17 KB raw and 1.8 KB gzip (the embed's marginal cost).

### Patch Changes

- [#2176](https://github.com/adobe/spectrum-design-data/pull/2176) [`d574a13`](https://github.com/adobe/spectrum-design-data/commit/d574a1313b6ba5b5137639a0712891c53024dbda) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the Accordion behavior contract, the second to use the `collection` block.
  - Data: Accordion has an inline item contract. Its header has role `button`,
    `tab-stop` focus and `press: activate`. `activate` chooses `isExpanded`
    unless the item is disabled, and emits `change`. The `choose` mode comes
    from the new facet `expansion` (`isMultiple`: single or multiple) and
    `allowsEmpty` is true, so closing the open item leaves none open. There is
    no `traversal`: headers are not an arrow-key group.
  - Registry: facets `expanded` (`collapsed`, `expanded`) and `expansion`
    (`single`, `multiple`).
  - Spec: 12 conformance vectors; the Collections section names Accordion.
  - The `accessibility` block stays; the spec sheet and the render are
    unchanged. The embedded registry changes, hence the wasm patch.

- [#2173](https://github.com/adobe/spectrum-design-data/pull/2173) [`6a03010`](https://github.com/adobe/spectrum-design-data/commit/6a03010383dfd24e91f6e40ea85d71ee3fc25f61) Thanks [@GarthDB](https://github.com/GarthDB)! - Harden the behavior contract `collection` block.
  - Spec: `traversal.focus` is metadata only (the runner does not model focus), in the schema
    description and the Collections section. The section also says that the runner fails an
    expectation on `items` or `focused` without `start.items`, and a start item that sets an option
    its item contract does not list. A disabled group still navigates in the runner, because the
    group's `isDisabled` reaches its items in the adapter; the radio group vector says so.
  - Rules: SPEC-120 numbers `expect.items` per expectation, so a vector with several expectations
    no longer gets false "expects item N" warnings.
  - Runner: fails a vector that expects `items` or `focused` with no group, and a start item with an
    option the item contract does not declare (a mistyped `isDisabeld`). New tests pin
    `navigate-last`, the last-on guards of `single` and `multiple`, and a choose that changes nothing.
  - No render, spec sheet or wasm size change. Linting the separate suite vectors with SPEC-118 to
    SPEC-120 is a follow-up.

- [#2172](https://github.com/adobe/spectrum-design-data/pull/2172) [`c0f615a`](https://github.com/adobe/spectrum-design-data/commit/c0f615a7a84012535d6f917459ec02b1dec2e554) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the `collection` block to behavior contracts; the radio group's rules become data.
  - Spec: a group contract may carry `collection` (`slot`, `item`, `choose`, `traversal`). The new
    item action `do.choose` is resolved by the group (single, multiple or none; `allowsEmpty`) and
    raises one group `change` with the indices that are on. Traversal says `wrap`, `skip`,
    `first`, `last`, `selectOnMove` and `mirror` (swaps ArrowLeft and ArrowRight while a group
    guard holds). Vectors gain `start.items`, `start.focused`, item steps, `expect.items` and
    `expect.focused`. SPEC-118 to SPEC-120 check them. New "Collections" section answers proposal
    022 question 5 (a group is a collection).
  - Data: Radio group declares its `collection` (single choice, wrap, skip a disabled radio,
    select on move, mirror while `arrowOrder` is `mirrored`). Radio button's `activate` uses
    `choose`, and its `navigate-next` and `navigate-previous` transitions are removed. The arrow
    bindings move from role `radio` to role `radiogroup`. The four dead group vectors and the
    "lands on a radio" key vectors are replaced by group vectors.
  - Runner: executes a group over its items by index. Mutation tests fail when wrap, skip, mirror,
    select-on-move, a choose mode or a pair of arrow bindings is broken.
  - No render or spec sheet change. Embedded contracts change slightly, hence the wasm patch.

- [#2177](https://github.com/adobe/spectrum-design-data/pull/2177) [`bd1b27a`](https://github.com/adobe/spectrum-design-data/commit/bd1b27a7fd52b809ed92b3b734a59070ea71e4e2) Thanks [@GarthDB](https://github.com/GarthDB)! - Add behavior contracts for Swatch and Swatch group.
  - Swatch: states `isSelected` and `isDisabled`; `activate` chooses it while enabled. No role yet
    (open question), tab stop focus.
  - Swatch group: `selection` (from `enableSelection` and `selectionMode`) and `allowsEmpty` facets,
    registered in the facets registry, and a `collection` of swatches: choose by selection mode,
    no wrap, skip a disabled swatch, no select on move. Role `group` and the accessibility blocks
    stay. Arrow keys have no web binding until the role is decided.
  - 23 group vectors and 7 swatch vectors; mutation tests fail when a traversal flag, choose mode
    or guard is broken. No render or spec sheet change.
  - Embedded contracts and the facets registry change, hence the wasm patch.

- [#2174](https://github.com/adobe/spectrum-design-data/pull/2174) [`93ab1a2`](https://github.com/adobe/spectrum-design-data/commit/93ab1a2903998c6e224e9b408015921bace540fa) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the behavior contract for Tooltip's trigger semantics.
  - Data: `behaviors/tooltip.json` extends the new `trigger-reveal` pattern (state `isOpen`,
    `isDisabled`; part `container`, role `tooltip`, `focus: none`). Keyboard focus and hover open
    it; pointer and programmatic focus do not. Leaving, blur, a press on the trigger and `dismiss`
    close it, and leaving or blur closes it even while the other signal holds it (React Spectrum S2).
    A disabled tooltip does not open. Escape is bound to `dismiss` on key down, as in S2 and SWC.
  - Tooltip declares the options `isOpen` and `isDisabled`, listed in its recipe's `notVisual`; its
    spec sheet gains two option rows and a Keyboard table (`keyboardIntents: ["dismiss"]`).
  - Spec: a "Tooltip" section. Delays, one open tooltip at a time, `aria-describedby` and closing on
    `isDisabled` are adapter-owned. The `open` facet is registered (hence the wasm patch).
  - Vectors: 31 contract and 4 Escape key vectors, plus mutation tests.

- [#2168](https://github.com/adobe/spectrum-design-data/pull/2168) [`a8a24d2`](https://github.com/adobe/spectrum-design-data/commit/a8a24d29a699a6bed5677050e24de236e3b4e72d) Thanks [@GarthDB](https://github.com/GarthDB)! - Correct the Checkbox group keyboard text: no arrow-key navigation.
  - Each checkbox is its own tab stop; Tab and Shift + Tab move between them.
  - The arrow keys, Page Up/Down and Home/End rows are removed: React Spectrum S2 and
    Web Components do no roving focus in a checkbox group.
  - Data text only. No render or spec sheet changes.

- [#2166](https://github.com/adobe/spectrum-design-data/pull/2166) [`6e41b8e`](https://github.com/adobe/spectrum-design-data/commit/6e41b8e3231c197d72d751d0fd9554fe478c02ca) Thanks [@GarthDB](https://github.com/GarthDB)! - Declare role `group` for the Checkbox group.
  - Data: the Checkbox group `accessibility` block gains `role: "group"` (the only
    block change; nothing else in any block changes) and its behavior contract
    carries the same role on the `container` part, pinned in its conformance suite.
    Spec sheets and renders are unchanged: Checkbox group has no spec sheet.
  - The contract still carries no arrow-key navigation: the usage prose says arrows
    move focus, while React Spectrum S2 and Web Components give each checkbox its
    own tab stop. This is an open decision (hd0g.4.15), not modeled.
  - The wasm package embeds the contract, so it ships the changed data.

- [#2175](https://github.com/adobe/spectrum-design-data/pull/2175) [`5f0cdaf`](https://github.com/adobe/spectrum-design-data/commit/5f0cdafd9ff88a89df8e0afb1dfca63072fe24da) Thanks [@GarthDB](https://github.com/GarthDB)! - Correct the Checkbox keyboard text: no group focus handling.
  - Each checkbox is its own tab stop; Tab and Shift + Tab move between them.
  - Removes "Tabbing into a group places the focus on the first checkbox".
  - Data text only. No render or spec sheet changes.

- [#2179](https://github.com/adobe/spectrum-design-data/pull/2179) [`a1f1b76`](https://github.com/adobe/spectrum-design-data/commit/a1f1b76b9d71353b17afb51de938cd09ad86ee80) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove the unused composite states `focus-+-hover` and `focus-+-not-hover` from the
  date-field, time-field and tag-field component declarations. No relationship, recipe
  or visual uses them there, so renders and spec sheets are unchanged. The other field
  components keep them: pinning `focus` there changes which record keyboard-focus
  renders select.

- [#2178](https://github.com/adobe/spectrum-design-data/pull/2178) [`0751b09`](https://github.com/adobe/spectrum-design-data/commit/0751b091c67e1d1f6864749bc27ade960ec4306a) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate progress-bar and meter relationship records and recipes to structured identity. Both
  components move from status level 1 to level 3. The legacy `@adobe/spectrum-tokens` output and the
  rendered SVGs are unchanged.
  - All 97 live records get a `scope.part` (container, header, label, track, fill) from the
    components' anatomy. The fused names decompose: `font-size-75..300` becomes `font-size` with a
    `size` pin, `line-height-100` becomes `line-height`, `component-top-to-text-75..300` becomes
    `space-between` between `top-edge` and `text` with a `size` pin.
  - The recipes bind by part and identity instead of by `context`. Their context selectors go to 0.
  - The `maximum-width` record pinned by `legacyKey` gets the same `context` as its alias record,
    which clears the last identity collision in each component. No uuid, `legacyKey`, `$ref` or
    `contextRole` change; deprecated records are untouched.
  - The progress-bar and meter spec sheets drop one duplicate inline `maximum-width` row each and
    regroup the size-dependent rows; the other 90 sheets are unchanged.

- [#2169](https://github.com/adobe/spectrum-design-data/pull/2169) [`7ff7975`](https://github.com/adobe/spectrum-design-data/commit/7ff79759a691b3c885d3339fba0d7be0b091c61a) Thanks [@GarthDB](https://github.com/GarthDB)! - Build the PNG renderer from the new `design-data-png` plugin crate instead of
  `design-data-core`. The package API is unchanged; the wasm binary is about
  5 KB larger (17,899,724 to 17,904,989 B raw, 3,106,947 to 3,107,616 B gzip).

  In the CLI, `design-data render --format png` with a broken, empty or truncated
  `--font` and an explicit `--text-metrics` now fails early (exit 2, no file
  written). It used to warn and draw placeholder bars.

- [#2170](https://github.com/adobe/spectrum-design-data/pull/2170) [`2db54c1`](https://github.com/adobe/spectrum-design-data/commit/2db54c11a255a8425466b50901f39e4b6aed82fc) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-092 no longer flags a live relationship record that has a `legacyKey`. The legacy token name
  addresses it, so it needs no `context` or contexted referrer. Deprecated records stay exempt. The
  CLI check and the embedded `Dataset.validate()` output change with it (no CLI version bump).

## 0.39.0

### Minor Changes

- [#2155](https://github.com/adobe/spectrum-design-data/pull/2155) [`ea5fa64`](https://github.com/adobe/spectrum-design-data/commit/ea5fa640075f81854392f207f22c5004eaef5f06) Thanks [@GarthDB](https://github.com/GarthDB)! - Add behavior contracts for Button and Close button on the `press` pattern, and
  selected and pending behavior for Action button (proposal 022).
  - Data: `button.json` and `close-button.json` extend `press`. Button adds a
    `pending` facet and a rule that a pending button ignores `activate`. Action
    button now toggles `isSelected` on `activate` (emits `press` with the new
    value, exposes `aria-pressed`) and ignores `activate` while `isPending`.
    The hold icon stays out. In-field progress button has no data, so no contract.
  - Registry: facets `selected` and `pending`.
  - Runner and spec: `emit` stays exact; a vector may set `emitOptions: "listed"`
    (used by the shared `button` role key vectors) to check only listed options.
  - Vectors: Button, Close button and Action button suites, including selected
    plus press and pending. The `button` role key vectors now run on all three.
  - No accessibility block changed; sheets derived from the contracts equal the
    block-derived ones. No render or spec sheet output changes.

- [#2158](https://github.com/adobe/spectrum-design-data/pull/2158) [`cfa233d`](https://github.com/adobe/spectrum-design-data/commit/cfa233d29d01dec8de0f25feb7a795ef68c3e9ed) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the behavior contract for Clear button (proposal 022).
  - Data: `clear-button.json` extends `press` and raises `press` on `activate`,
    the same shape as Close button. It is a subcomponent; the flag does not
    change any contract rule.
  - Bindings: the existing web role `button` applies without edits.
  - Vectors: a suite for the component.
  - No accessibility block changed; the Clear button sheet derived from the
    contract equals the block-derived one. No render or spec sheet output changes.

- [#2143](https://github.com/adobe/spectrum-design-data/pull/2143) [`ff59961`](https://github.com/adobe/spectrum-design-data/commit/ff59961021dd08b03a9490948cdfb112ea97c04b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the behavior contract reference runner, event intents and patterns
  (proposal 022), expand step. No render or spec sheet changes.
  - Registry: `intents.json` gains the `event` intents (`focus`, `blur`,
    `press-start`, `press-end`, `press-cancel`, `pointer-enter`, `pointer-leave`,
    `navigate-next`, `navigate-previous`, `navigate-first`, `navigate-last`).
    `facets.json` gains `blocksInteraction` (the `disabled` facet blocks focus,
    press and hover).
  - Spec: `parts.<part>.handles` lists intents that change no state; shared base
    contracts live in `behaviors/patterns/` (`behavior-pattern.schema.json`,
    first pattern `interactive`). SPEC-118 warns on an unresolved `extends`,
    SPEC-119 on an unregistered `handles` intent.
  - `design-data behavior test <component|--all>` runs conformance vectors against
    the contract state machines with no browser; `conformance/behavior/` holds the
    Switch and Checkbox suites, and `behaviors/switch.json` and `checkbox.json`
    are their contracts.
  - The `accessibility` block is untouched.

- [#2139](https://github.com/adobe/spectrum-design-data/pull/2139) [`3d02271`](https://github.com/adobe/spectrum-design-data/commit/3d022713e7f332d6f8eb7912b5155fad6a06b03b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the behavior contract format (proposal 022), expand step only. No
  component has a contract yet and renders are unchanged.
  - Spec: `spec/behavior-contract.md` and `schemas/behavior.schema.json` for
    `behaviors/<component>.json` (state options, facets, intents, parts, guarded
    transitions, `wcag`, conformance vectors).
  - Registries `facets.json`, `intents.json` (today's `intents` and
    `keyboardIntents` vocabulary, nothing else) and `capabilities.json`, embedded
    in the SDK.
  - Rules SPEC-118 to SPEC-120 (warnings) check that a contract's options,
    facets, parts, intents, capabilities and vectors resolve. `behaviors/` is read
    as a sibling of `visuals/`; a dataset without it is unaffected.
  - `design-data:validate-behaviors` checks contracts against the schema.
  - The `accessibility` block stays; the contract is planned to replace it.

- [#2148](https://github.com/adobe/spectrum-design-data/pull/2148) [`184612a`](https://github.com/adobe/spectrum-design-data/commit/184612abb1695edca5b0415ae58c90351777cda3) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the behavior exemptions registry (proposal 022), expand step. No render or
  spec sheet changes.
  - Registry: `exemption-reasons.json` (`static-text`, `static-display`,
    `container`, `sub-part`, `decorative`) and `behavior-exemptions.json`, which lists the 26
    components that take no interaction and so have no contract, each with a
    reason.
  - New rule SPEC-123 (warning): a component with no `accessibility.role` needs a
    contract or an exemption, not both, and an exemption's reason must be
    registered. Components with neither are the migration backlog.
  - Spec: new Exemptions section in the behavior contract page.

- [#2144](https://github.com/adobe/spectrum-design-data/pull/2144) [`51696d4`](https://github.com/adobe/spectrum-design-data/commit/51696d4007e14d86aaaf70b76ba9a1a47ac79b31) Thanks [@GarthDB](https://github.com/GarthDB)! - Add facets to recipe conditions and a contract-driven spec sheet section
  (proposal 022), expand step. No render or spec sheet changes.
  - Recipes: `when` and `visibleWhen` accept `facets: { checked: "indeterminate" }`
    beside `options` and `states`. Opt-in: a facet clause folds into the options
    and states the compiler already solves, so recipes without it are unchanged.
    New rule SPEC-122 (warning) flags a facet the component's contract cannot
    publish.
  - Spec sheet: for a component with a behavior contract (Switch, Checkbox), the
    accessibility section reads role, focus, keyboard intents and WCAG criteria
    from the contract. The result equals the one built from the `accessibility`
    block; the component-level `intents` labels still come from the block.

- [#2151](https://github.com/adobe/spectrum-design-data/pull/2151) [`16c9590`](https://github.com/adobe/spectrum-design-data/commit/16c95907ff7452b367417d03c123ac79f5751c65) Thanks [@GarthDB](https://github.com/GarthDB)! - Add per-platform key bindings to the behavior contract (proposal 022), and say
  that Space alone toggles Switch and Checkbox. No render or spec sheet changes.
  - Schema: `behavior-bindings.schema.json` for a bindings file keyed by role;
    a vector step may be an `input` (`key`, `phase` of `down` or `up`).
  - Data: `behaviors/bindings/web.json` (Space on Switch and Checkbox); key
    vectors per platform and role in `conformance/behavior/bindings/web/`,
    including "Space toggles" and "Enter does not toggle".
  - Runner: `design-data behavior test --platform <id>`; a platform with no
    keyboard makes key vectors not applicable.
  - SPEC-124 checks a bindings file. Spec page and proposal text updated.
  - Switch and Checkbox keyboard guideline text said "Space or Enter toggles";
    it now says Space.

- [#2156](https://github.com/adobe/spectrum-design-data/pull/2156) [`22a48fd`](https://github.com/adobe/spectrum-design-data/commit/22a48fda909f8a786ca8b4a3470cc6c1d54b36d3) Thanks [@GarthDB](https://github.com/GarthDB)! - Add behavior contracts for Link, Floating action button and In-field button
  (proposal 022).
  - Data: `link.json` extends `interactive` and raises `press` on `activate`
    (the link declares no `isDisabled`). `in-field-button.json` and
    `floating-action-button.json` extend `press`. The floating action button
    data declares no `isDisabled`, so SPEC-118 warns once (accepted, A559).
  - Bindings: web role `link` (Enter on key down, Space unbound), measured.
  - Vectors: suites for the three components and the `link` key vectors.
  - No accessibility block changed; the Link sheet derived from the contract
    equals the block-derived one. No render or spec sheet output changes.

- [#2149](https://github.com/adobe/spectrum-design-data/pull/2149) [`af2f1e8`](https://github.com/adobe/spectrum-design-data/commit/af2f1e805cb9b96ff9adfccf62fc848b9cabec71) Thanks [@GarthDB](https://github.com/GarthDB)! - Carry the interaction event transitions as data in the `interactive` behavior
  pattern (proposal 022). No render or spec sheet changes.
  - Schema: a transition may name the event's `via`, and `do` may `raise` the
    part's `press` intent. A pattern's `do.set` may set the interaction facets it
    publishes.
  - Data: `behaviors/patterns/interactive.json` holds what `focus`, `blur`,
    `press-start`, `press-end`, `press-cancel`, `pointer-enter` and
    `pointer-leave` do to `focusVisible`, `pressed` and `hovered`.
  - `press-end` without a prior `press-start` (or after `press-cancel`) no longer
    raises `press`. Two new vectors each for Switch and Checkbox cover it.
  - SPEC-119 now also checks a pattern's transitions. Spec page and proposal
    text updated.

- [#2153](https://github.com/adobe/spectrum-design-data/pull/2153) [`064fd46`](https://github.com/adobe/spectrum-design-data/commit/064fd46c901e7b9133929242c088a9e37a528a19) Thanks [@GarthDB](https://github.com/GarthDB)! - Add behavior contracts for Radio button, Radio group and Action button, and
  the shared `press` pattern (proposal 022).
  - Data: `behaviors/patterns/press.json` (extends `interactive`; `disabled`
    facet, `activate` emits `press`) is the base of Action button.
    `radio-button.json` selects on `activate` and when arrow navigation lands
    on it; `radio-group.json` carries `orientation`, `direction` and the
    `arrowOrder` facet (Left and Right swap only when horizontal and rtl).
  - Registry: facets `orientation` and `arrowOrder`, and a new
    `environment.json` (`direction`: ltr, rtl, initial ltr) that contracts may
    list in `state` and vectors set in `start`. Radio group now has the role
    `radiogroup` in its accessibility block and its contract.
  - Web key bindings for `button` (Enter on key down, Space on key up) and
    `radio` (Space on key up, arrows, no Home or End), with key vectors and
    component vectors. Only radio-group's `accessibility` block changed (role
    `radiogroup`); sheets derived from the contracts equal the block-derived.
  - Proposal 022 evidence table: measured button, link and radio keys.
  - The component explorer data gains the radio-group role; no render changes.

- [#2152](https://github.com/adobe/spectrum-design-data/pull/2152) [`511dd95`](https://github.com/adobe/spectrum-design-data/commit/511dd9587e541cadb7be3fb345a7765756095c08) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the shared `toggle` behavior pattern (proposal 022) that Switch and
  Checkbox extend, and a read-only Checkbox.
  - Data: `behaviors/patterns/toggle.json` holds the `checked`, `disabled` and
    `readOnly` facets and the `activate` transition. Switch extends it as is;
    Checkbox overrides `checked` (adds indeterminate) and `activate` (also
    clears `isIndeterminate`).
  - Checkbox gains an `isReadOnly` option: it keeps focus and hover and press
    feedback, ignores activation and exposes `aria-readonly` (Switch's contract
    exposes it too). The component data and spec sheet option list
    gain the option; no distinct read-only visual. Scenes list it in
    `optionDefaults`; every other render is unchanged.
  - Activating a checkbox with `isSelected` and `isIndeterminate` both true
    unchecks it, as a native input does.
  - Validation: SPEC-118 to SPEC-120 follow `extends` for facets, patterns may
    toggle options, SPEC-124 warns when a binding targets an intent the role
    does not handle. The spec page maps DOM keys to key names.
  - The Checkbox group keyboard guideline says Space, not "Space or Enter".

- [#2142](https://github.com/adobe/spectrum-design-data/pull/2142) [`b1da385`](https://github.com/adobe/spectrum-design-data/commit/b1da3859c7cd25a64dab4f98fe3046d518b0a969) Thanks [@GarthDB](https://github.com/GarthDB)! - The engine draws dashed and per-side strokes; the calendar range band gets its dashed outline.
  - **@adobe/design-data-spec**: new optional box and root props `strokeDash`, `strokeGap`,
    `strokeCap`, `strokeSides` and `strokeDashAnchor` (component-visuals.md, "Dashed and per-side
    strokes"). A recipe that binds none draws what it did before. `strokeSides` lists top, end,
    bottom, start; a corner arc is drawn where both its sides are, and a `scene` anchor lines up
    the dashes of boxes that touch. New SPEC-121 checks the literal values.
  - **@adobe/spectrum-design-data**: the calendar `range-fill` binds a 1px dashed stroke (3 on,
    3 off) that outlines the joined band: top and bottom on every cell, start on the row's first
    cell, end on its last. Color is the focus indicator, or the negative border for an error range
    (two new relationship records: border width, error border color). Figma's stroke is solid; the
    component docs say dashed.
  - **@adobe/design-data-wasm**: the SVG writes `stroke-dasharray`, `stroke-dashoffset` and
    `stroke-linecap` paths; scene nodes carry `stroke_style`; the PNG rasterizer draws the same.

- [#2137](https://github.com/adobe/spectrum-design-data/pull/2137) [`9ac6deb`](https://github.com/adobe/spectrum-design-data/commit/9ac6deb925ea33b70d6c99cdb630cf5b4997d2e5) Thanks [@GarthDB](https://github.com/GarthDB)! - A component slot can declare `demo`, the fills a host shows it with.
  - **@adobe/design-data-spec**: new optional `demo` array on a slot declaration (component schema,
    component-format.md "Slot demo"). Entries have the shape of a render request slot fill
    (`{component, options}`), so a host passes them through as `slots`. SPEC-104 checks them: the
    slot has a part and is not a collection, each entry names an accepted component, options are
    declared by it (and listed values respected), and the count is within `min` and `max`.
  - **@adobe/spectrum-design-data**: `demo` on the 13 components that host slot fills
    (radio-group, checkbox-group, button-group, action-group, swatch-group, popover, accordion,
    alert-dialog, standard-dialog, coach-mark, bar-panel, stack-item, standard-panel), following
    the Figma Web POC where it shows content.
  - **@adobe/design-data-tui**: SPEC-104 validates `demo`; the explorer reads it (the first-accepted
    component heuristic stays as the fallback for a slot without `demo`).

### Patch Changes

- [#2146](https://github.com/adobe/spectrum-design-data/pull/2146) [`96efb8e`](https://github.com/adobe/spectrum-design-data/commit/96efb8e7adeb5ed093c4c755df110675e0ff7db3) Thanks [@GarthDB](https://github.com/GarthDB)! - The color slider and color area default to Figma's default variants, so they draw a gradient
  instead of a bare checkerboard or an empty square.
  - **color-slider**: `color` `#3b63fb`, `channel` blue and `label` Blue. `colorSpace` has no
    default: the space follows the channel and the color. It declares that each `colorSpace` only
    has its own
    channels (`hue` is not an `rgb` channel), and lists the spaces as hsl, hsb, rgb.
  - **color-area**: `color` `#ff0000`, `xChannel` saturation, `yChannel` brightness and
    `colorSpace` hsb, which is Figma's red square.

- [#2157](https://github.com/adobe/spectrum-design-data/pull/2157) [`bceef53`](https://github.com/adobe/spectrum-design-data/commit/bceef532dc1943f67280563cc997f1cc40b57f81) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove stale data the Design decisions retired. No render changes.
  - `combo-box`: remove the unused `placeholder` anatomy part (React Spectrum has none).
  - `calendar`: remove the unused `current-day-indicator` content-color relationship; the
    recipe already binds the day content color through the `day` relationship.
  - `close-button` docs no longer list the removed `iconSize` option.

## 0.38.4

### Patch Changes

- [#2117](https://github.com/adobe/spectrum-design-data/pull/2117) [`e7dd109`](https://github.com/adobe/spectrum-design-data/commit/e7dd109667fb380b6b7ef38d6ee9fe3d176e0e6d) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix Button keyboard-focus and outline down colors.
  - Keyboard-focus now takes the hover look for secondary and outline buttons: the
    label and icon use `gray-900` (they stayed `gray-800`), and the outline border
    uses `gray-900` (primary) or `gray-400` (secondary).
  - Outline buttons get a `gray-100` background on keyboard-focus (it was
    transparent). The visual recipe has a matching `keyboard-focus` fill entry.
    Static outline buttons now draw the static overlay on focus as well.
  - The outline `down` background is `gray-100`, the same as hover (it was
    `gray-200`).

  Figma draws only Default, Hover and Disabled for Button. React Spectrum S2 and
  Spectrum Web Components gen 2 both give hover, pressed and focus the same colors.

- [#2102](https://github.com/adobe/spectrum-design-data/pull/2102) [`53d831f`](https://github.com/adobe/spectrum-design-data/commit/53d831fc76fde3f2bb934c01256dc8229de9ccd6) Thanks [@GarthDB](https://github.com/GarthDB)! - Draw range selection in the calendar recipe.
  - Anatomy: `range-fill` moves from `month` to `day`, and `day` gains a
    `day-fill` part (the circle behind the number, new registry term
    `day-fill`). `label` is now drawn on the day.
  - A selected day in `selectionMode` range draws the range band behind its
    number: the whole 40px day cell for a day inside the range, half a cell
    for the two ends (`isRangeStart`, `isRangeEnd`), which also draw the
    selected circle, so the band meets the circle flush and is continuous.
    The band is capped (pill ends) at the ends of a week row. A one-day
    range draws only the circle. A single selected day in `single` mode is
    unchanged.
  - Relationships: error range-fill band (red subtle background) and the
    neutral day number inside a range (it is not white like the end circles).
  - Day and weekday cells are 40 wide with no column gap (32 plus the 8
    weekday gap), so the band is continuous within a week row.
  - Not drawn: band stroke, unavailable strike.
  - Snapshots and goldens are regenerated. Legacy token output is unchanged.

- [#2116](https://github.com/adobe/spectrum-design-data/pull/2116) [`36748e9`](https://github.com/adobe/spectrum-design-data/commit/36748e96392f05b8e41c6b2aecfe480ec614b8af) Thanks [@GarthDB](https://github.com/GarthDB)! - Draw the calendar today marker.
  - A day with `isToday` draws a 4px dot at the bottom of its cell (4px above the
    edge, centered), the `current-day-indicator` anatomy part, as in Figma
    `.Day` (Current day indicator) and React Spectrum S2 (bottom 12.5%).
  - The dot takes the day's content color relationship, so it is white on a
    selected or error day, gray on a disabled day and neutral otherwise.
  - `isToday` leaves the recipe's `notVisual` list. The day box gains 4px block
    padding (centered children do not move) so the dot can sit at the bottom
    with the stack child `align: end`.
  - The Figma-bound relationship on `current-day-indicator` (neutral hover
    content color) is not used by the recipe.
  - Goldens and snapshots are regenerated. Legacy token output is unchanged.

- [#2101](https://github.com/adobe/spectrum-design-data/pull/2101) [`ac0d750`](https://github.com/adobe/spectrum-design-data/commit/ac0d75035b589ab4df3f3b2fe040068080b20767) Thanks [@GarthDB](https://github.com/GarthDB)! - Rename `hideImage` to `showImage` on `standard-dialog` and `coach-mark`, with Figma defaults.
  - `standard-dialog` `showImage` defaults to false (Figma "Show preview" is false).
  - `coach-mark` `showImage` defaults to true (Figma "Show cover image" is true).
  - Migration: replace `hideImage: false` with `showImage: true` and drop `hideImage: true`.
    A bare `standard-dialog` no longer includes the cover image.
  - No other component nests either one, and neither recipe draws the cover image, so no
    render changes.

- [#2112](https://github.com/adobe/spectrum-design-data/pull/2112) [`5f32e67`](https://github.com/adobe/spectrum-design-data/commit/5f32e67bef710b6d1fc5dca1fca661ff06df8392) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe engine features for the calendar range band (all opt-in, no layout revision change).
  - A stack child that binds no `direction` places itself with its own `justify` and `align`;
    its `width` may be a fraction of the stack (`relativeTo: parent`).
  - A flowed box below the root draws per-corner radii (`cornerRadiusStartStart`, ...).
  - `when.rowPosition` (`first`, `middle`, `last`, `only`): a repeat inside a grid tells each copy
    its place in its grid row. SPEC-061 validates it. Spec and schema updated.
  - The calendar band is flush with the range end circles, continuous, and capped at week row
    edges. Goldens and snapshots are regenerated. Legacy token output is unchanged.
  - Not done: the dashed range border (needs per-side stroke and dashed stroke support).

- [#2119](https://github.com/adobe/spectrum-design-data/pull/2119) [`f3dbfc8`](https://github.com/adobe/spectrum-design-data/commit/f3dbfc82b22d5bf72b1edbda8ca95cc999313b7e) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe engine: a `dimension` source may carry a `fallback` (opt-in, no layout revision change).
  - `{"dimension": "width", "fallback": {"relationship": {...}}}` reads the numeric option when
    it is a positive number, else resolves the fallback (usually the default width relationship).
    Before, an unset `dimension` hugged the content and could not fall back.
  - The combo-box and search-field recipes use it: hosts that pass the `width` option
    (`--option width=300`, WASM `opt.width`) now get that width, and no option keeps the
    relationship default (144/192/240/288). Search-field's `width` option was dead before.
    The explorer's Width (px) control sets the demo width and is unchanged.
  - A renderer that does not read `fallback` treats the size as unset (hug), as before.
  - Limits: `fallback` is one source (not a `when` list); spec sheets do not read it.

- [#2125](https://github.com/adobe/spectrum-design-data/pull/2125) [`b32eb66`](https://github.com/adobe/spectrum-design-data/commit/b32eb6630a42f5f17cff4f59214e50afcbe1385d) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe engine: a nested component's label follows the request label (layout revision 8).
  - A `with.label` that reads the host's `label` option got an empty label unless that option was a
    string. The explorer and `design-data render --label "x"` send the label as the request label,
    so the field label of checkbox-group, color-slider, combo-box, number-field, picker,
    radio-group, search-field, slider, text-area and text-field drew nothing. The request label
    now flows to the nested label when the option is a presence flag (`true`).
  - An empty request label, a `label` option of `false` and a string option behave as before.
  - Output changes for those ten recipes only (their snapshots and 29 goldens); every other
    recipe is byte-identical. `LAYOUT_REVISION` and the dataset `layoutRevision` are now 8;
    `requires.cli` stays at the unreleased 0.63.5, which carries revision 7 and 8 together.

- [#2108](https://github.com/adobe/spectrum-design-data/pull/2108) [`5129ac5`](https://github.com/adobe/spectrum-design-data/commit/5129ac567430ed2f752db1d35f0f78b55e8e101a) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix two layout bugs in the visual recipe engine (layout revision 7).
  - An icon that is a direct child of the root flow now honors its `rotation`.
    The in-field button chevron (and so the combo-box chevron) points down, as in
    Figma and React Spectrum S2.
  - A row box now honors its `justify` (`start`, `center`, `end`). Before, it
    packed items at the start whatever the recipe said. An unbound row box still
    packs at the start. The alert dialog button row (`justify: end`) now draws at
    the end, and the combo-box in-field button sits at the field end when empty.
  - `LAYOUT_REVISION` and the dataset `layoutRevision` move to 7, and the dataset
    `requires.cli` is raised to the unreleased 0.63.5. Goldens and recipe
    snapshots are regenerated. Legacy token output is unchanged.

- [#2118](https://github.com/adobe/spectrum-design-data/pull/2118) [`db18b8f`](https://github.com/adobe/spectrum-design-data/commit/db18b8fc7cc699d4a73bf5cf09e73269b9f90d1b) Thanks [@GarthDB](https://github.com/GarthDB)! - Draw the explorer's progress-circle track and fill as one ring.
  - The explorer drew a stroked `box` with a centered stroke (half of it outside the
    box) and a `progress` arc with its own radius and a thickness of a ninth of the
    diameter, so the fill was thicker than the track and sat at a different radius.
  - `draw-helpers.js` now has `boxSvg` (border drawn inside the box) and `progressSvg`
    (bound thickness, ring inside the bounds, the scene's `sweep`), which match
    `design-data render`. This also fixes every explorer box whose border was drawn
    half outside its bounds.
  - `sdk/wasm-visual/test/progress-ring.test.mjs` checks track and fill share radius
    and stroke width for sizes s, m and l, determinate and indeterminate.
  - No engine, recipe or token change; goldens and snapshots are unchanged.

- [#2105](https://github.com/adobe/spectrum-design-data/pull/2105) [`84a4efe`](https://github.com/adobe/spectrum-design-data/commit/84a4efed661b6b64348fe86f36e4ed8726f6661f) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the combo-box visual recipe, which drew every state as a tiny empty square.
  - The container width now binds the `width` relationship (field-width-\*), so the
    field has a size without a width option. `width` is listed in `notVisual`,
    like picker and text-field.
  - The field draws the in-field menu trigger button (the `in-field-button`
    component) at the end and the alert icon when `isError` is set. The
    `error-icon` anatomy part gains `presentWhen: isError`.
  - Not drawn: the chevron points right (the engine ignores `rotation` on a root
    icon), the button sits at the field start while there is no value (nested row
    `justify` is not supported), the placeholder, autocomplete suggestion,
    loading circle and the label position.
  - Goldens and recipe snapshots are regenerated. Legacy token output is unchanged.

## 0.38.3

### Patch Changes

- [#2094](https://github.com/adobe/spectrum-design-data/pull/2094) [`7f9260e`](https://github.com/adobe/spectrum-design-data/commit/7f9260eb9ee3c2de4829c4244ec3b4035e454e69) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the `src` image option to avatar and thumbnail and draw it in their recipes.
  - `avatar` and `thumbnail` gain a string option `src` (React Spectrum S2 `Avatar` `src`;
    the thumbnail picture). A host passes a `data:image/png;base64` URI.
  - The avatar `image` part draws `src` clipped to the circle for the User image style
    (`presentWhen` image is `user image`); the thumbnail `image` part draws it over the
    checkerboard, hidden by `hideImage`. With no `src` both draw the placeholder.
  - Both containers now stack their parts: the thumbnail image no longer lands beside the frame.
  - The Gradient image swirl artwork is still not drawn (qkj5.198).

- [#2090](https://github.com/adobe/spectrum-design-data/pull/2090) [`a6f11f0`](https://github.com/adobe/spectrum-design-data/commit/a6f11f066167f6baff7966074daed551c1320146) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a `months` collection slot to calendar.
  - The calendar repeats a `month` part per entry of the new `months` option
    (visibleMonths one to three). Each month holds a `title`, a `weekday-grid`
    and a `day-grid`; the grids repeat `weekday-label` (option `weekdays`) and
    `day` (the month's `days`).
  - New anatomy registry terms: `month`, `weekday-grid`, `day-grid`.
  - No recipe yet; the calendar and date-picker recipes follow.

- [#2095](https://github.com/adobe/spectrum-design-data/pull/2095) [`c58d755`](https://github.com/adobe/spectrum-design-data/commit/c58d7552f51a359c06a70e0d6c54582487aa42b1) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a visual recipe for calendar.
  - The calendar draws its months side by side, each a title, a weekday grid
    and a day grid (nested repeat in the grid engine). Days draw a circle
    that is filled when selected (accent, negative with `isError`), hover
    fill, disabled text and the day number. Binds live tokens; day size is
    the `size-500` token (32).
  - Options: `isSelected`, `isRangeStart`, `isRangeEnd`, `isUnavailable` and
    `isToday` on the component, and `label` on `days[]`. Anatomy gains a
    `label` part in `day`, a `text` part in `weekday-label`, and
    `presentWhen` on the current-day, unavailable and range-fill parts.
  - Calendar relationships pin day colors to `isSelected` (and `isError`);
    the selected text color now points at the live
    `transparent-static-white-1000` instead of the deprecated `white`.
  - Not drawn: previous and next buttons, help text, range band and ends,
    today marker, unavailable strike, focus ring.
  - SPEC-116 skips its placement check when no component catalog is loaded.
  - Snapshots and goldens are regenerated. Legacy token output is unchanged.

- [#2091](https://github.com/adobe/spectrum-design-data/pull/2091) [`bb3f543`](https://github.com/adobe/spectrum-design-data/commit/bb3f5435935c03cc4524010f8c0b8afea732e45d) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a `variant` option (`default`, `emphasized`) to steplist.
  - `default` draws the neutral colours; `emphasized` draws the accent colours
    (completed and current fills, current label, track), matching the Figma Web
    POC step list.
  - The accent relationship records pin `variant: emphasized` and the neutral
    fill and label records pin `variant: default`. Disabled records pin both
    variants so they still win.
  - The default variant has no neutral track record, so its track is not drawn.
  - Legacy token output is unchanged.

- [#2096](https://github.com/adobe/spectrum-design-data/pull/2096) [`93cacaf`](https://github.com/adobe/spectrum-design-data/commit/93cacaf71c816a8487e0597ee731be0473434253) Thanks [@GarthDB](https://github.com/GarthDB)! - Rename the thumbnail option `hideImage` to `showImage` and default it to false.
  - Figma Thumbnail "Show image" defaults to false, so a thumbnail draws only the
    checkerboard until `showImage` is true. The `image` part is present when `showImage`
    is true and draws `src`, or the placeholder when there is no `src`.
  - Migration: replace `hideImage: false` with `showImage: true` and drop `hideImage: true`.
    A bare thumbnail with no options no longer draws an image.
  - `standard-dialog` and `coach-mark` keep `hideImage` (unchanged).
  - Nested thumbnails in `menu` and `stack-item` pin `showImage: true` (Figma sets Show image
    on those instances), so their renders are unchanged.

## 0.38.2

### Patch Changes

- [#2078](https://github.com/adobe/spectrum-design-data/pull/2078) [`1501aee`](https://github.com/adobe/spectrum-design-data/commit/1501aeed0277a01d90e98f63e9a3e500af8242e8) Thanks [@GarthDB](https://github.com/GarthDB)! - Add visual recipes for color-slider and color-area.
  - color-slider draws the channel ramp (computed from `color`, `channel`
    and `colorSpace`) over the opacity checkerboard, the nested color-handle
    at the value and the nested field-label above. One recipe covers both
    orientations; the label is hidden when vertical.
  - color-area draws two stacked ramps for `xChannel`, `yChannel` and
    `colorSpace` (hsl and hsb) and the nested color-handle at (x, y).
    An rgb area draws no ramp.
  - A disabled control has no ramp or checkerboard. With no `color` the
    ramp is not drawn.
  - color-handle and color-loupe `color` is a plain string, like the
    slider's, so a host can pass one color to both.
  - Anatomy: color-area gains `fill` and `overlay`; color-slider
    `container.contains` also lists the checkerboard and fill (interim).
  - Snapshots and goldens are regenerated. Legacy token output is unchanged.

- [#2088](https://github.com/adobe/spectrum-design-data/pull/2088) [`7b7c335`](https://github.com/adobe/spectrum-design-data/commit/7b7c3350ac2f67ea62e2684b6c5737e7f01f344f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a visual recipe for menu.
  - The menu draws its items as a repeat: each item has a leading check
    mark (single selection), nested checkbox or switch (multiple), icon or
    thumbnail, label and value, with hover and keyboard-focus fill and
    disabled colors. Sizes s, m, l and xl bind live base tokens.
  - Options: `isSelected`, `isDisabled`, `value`, `hasIcon` and `hasThumbnail`
    on the component, and `isSelected`, `hasIcon` and `hasThumbnail` on
    `items[]`. Anatomy parts checkmark, checkbox, switch, icon, thumbnail
    and value gain `presentWhen`.
  - The four menu-item `Rounding` records are pinned to a size (s 7px,
    m 8px, l 9px, xl 10px) so the radius binds through the relationship.
  - Not drawn: sections and section headers, submenus, indent, truncation,
    description, the container surface and the focus ring.
  - Snapshots and goldens are regenerated. Legacy token output is unchanged.

- [#2085](https://github.com/adobe/spectrum-design-data/pull/2085) [`c148ebc`](https://github.com/adobe/spectrum-design-data/commit/c148ebc969a000dfcaefe717addec91b52341929) Thanks [@GarthDB](https://github.com/GarthDB)! - Add visual recipes for breadcrumbs and steplist.
  - Both bind through the component relationships.
  - Breadcrumbs: new `isCurrent` and `isDisabled` options.
  - Breadcrumbs: `separator` is present only when the option is `chevron`.
  - Breadcrumbs: size l spacing records pin `size: l`; disabled text pins `isDisabled`.
  - Steplist: new `stepState` and `isDisabled` options and a `row` anatomy part.
  - Steplist: text and visual colors pin `stepState` and `isDisabled`.
  - Not drawn yet: multiline, truncation menu, hover and focus states.
  - Not drawn yet: steplist vertical layout, check mark and step number.

- [#2087](https://github.com/adobe/spectrum-design-data/pull/2087) [`b62d1a4`](https://github.com/adobe/spectrum-design-data/commit/b62d1a4536b7331391f3e26f4a8661067c75329e) Thanks [@GarthDB](https://github.com/GarthDB)! - Add visual recipes for side-navigation and stack-item.
  - Side navigation draws a heading and selected, unselected and disabled items.
  - New `sectionTitle` option; the selection indicator shows only when `isSelected`.
  - Selection-indicator color records now pin `isSelected` (gray-800 or gray-400).
  - Stack item gets `isSelected`, `isDisabled`, `selectionStyle`, `visual` and an `actions` slot.
  - Stack item nests checkbox and thumbnail; new live padding, gap and label color records.
  - Not drawn yet: indent levels, hover bar, focus ring, description, drag handle, chevron.

## 0.38.1

### Patch Changes

- [#2081](https://github.com/adobe/spectrum-design-data/pull/2081) [`87b260b`](https://github.com/adobe/spectrum-design-data/commit/87b260bbe5d94c023288877de921a06ef084fed3) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the React Spectrum S2 channel options to the color components.
  - color-slider and color-area: `color` and `colorSpace`.
  - color-area: `xChannel` and `yChannel`.
  - color-wheel: `color`.
  - color-slider `channel`: add `brightness`.

- [#2075](https://github.com/adobe/spectrum-design-data/pull/2075) [`575b3ec`](https://github.com/adobe/spectrum-design-data/commit/575b3ece28c445b5959c8806b6dc97c975c69d5f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add visual recipes for alert-dialog and standard-dialog.
  - The dialog surface binds width, minimum width, rounding, padding and
    background through relationships. Dialogs have no shadow in Figma or S2.
  - Title and description bind type, color and the title-to-description gap.
  - Both dialogs gain `header` and `footer` anatomy parts (terms already in the
    registry). alert-dialog draws the status icon at the end of the title row for
    the warning and error variants.
  - The actions are a slot that takes up to three buttons; both dialogs gain an
    `button-group` slot (a temporary stand-in for a nested button-group, bead
    5m92.32.22). standard-dialog draws the
    footer-content slot (a checkbox) beside the actions in the footer.
  - Not drawn yet: the overlay scrim, the standard-dialog cover image, header
    content and close button. Long titles do not wrap in the header row.
  - Render snapshots and goldens are regenerated. Legacy token output is unchanged.

- [#2064](https://github.com/adobe/spectrum-design-data/pull/2064) [`793d0af`](https://github.com/adobe/spectrum-design-data/commit/793d0af5f07fb2cbc57434b93353cdfa2fa7b6ef) Thanks [@GarthDB](https://github.com/GarthDB)! - Bind search-field width and text-area field height through relationships for every size.
  - Adds live field width tokens `width-field-{desktop,mobile}-{75,100,200,300}` (no legacy key).
  - search-field width binds them for s, m, l and xl.
    Desktop 192, 208, 224, 240; mobile 240, 256, 272, 288.
    Size m now draws 208 instead of 192.
  - text-area `minimum-height` binds `base-height-*` for s, m, l and xl.
    Desktop 24, 32, 40, 48; mobile 30, 40, 50, 60.
    Size l now draws 40 instead of 56.
  - text-area size s gains top and bottom edge to text spacing (4px).
  - Render snapshots and goldens are regenerated. Legacy token output is unchanged.

- [#2079](https://github.com/adobe/spectrum-design-data/pull/2079) [`7b4561f`](https://github.com/adobe/spectrum-design-data/commit/7b4561fcae97ec7e33358c78dbd7536063017b7e) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a nested component part float by `side`.
  - SPEC-112 accepts a `component` part with `floating.side` (a slider's
    field label above its track), as it already did for `position`.
  - A nested floating component that is zero wide (a field label with no
    text) is kept and draws nothing, with no diagnostic.
  - Unit tests cover both; no recipe or data changes.

- [#2067](https://github.com/adobe/spectrum-design-data/pull/2067) [`d7d3e96`](https://github.com/adobe/spectrum-design-data/commit/d7d3e968328070873cf228e99fdc4cd96cfda205) Thanks [@GarthDB](https://github.com/GarthDB)! - Add visual recipes for button-group, action-group, swatch-group,
  checkbox-group and radio-group, drawn from their default slot.
  Button, action and swatch groups get a host part for the slot
  (`buttons`, `action-buttons`, `swatches`). The gap records of
  button-group and action-group now pin `size` and `density`, and
  swatch-group gains the missing regular-density gap record.

- [#2077](https://github.com/adobe/spectrum-design-data/pull/2077) [`f65c726`](https://github.com/adobe/spectrum-design-data/commit/f65c726128ebd8c1b21f021d0eb1e3a47310dd44) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a visual recipe for slider.
  - Draws the label, value text, track, fill and a handle at the value.
  - The handle and fill use `floating.position` on the track; `fillStart` offsets the fill.
  - Sizes s to xl, `trackStyle` thin and thick, `isEmphasized`, `hasFill`, disabled, hover, down
    and keyboard focus.
  - The editable field is the nested `number-field` recipe, placed beside the track.
  - Handle colours bind through relationships that now pin `attribute` and the hover, down and
    focus states. Live size pins also accept the deprecated size names.
  - A floating leaf part reads a `cornerRadius` relative to its height (a round handle).
  - Not drawn yet: range, vertical, ramp track, precise handle, focus ring, side label.

- [#2076](https://github.com/adobe/spectrum-design-data/pull/2076) [`feb65dc`](https://github.com/adobe/spectrum-design-data/commit/feb65dc75506e06fe04dfc143cd80ac365945c98) Thanks [@GarthDB](https://github.com/GarthDB)! - Add visual recipes for contextual-help and coach-mark.
  - contextual-help: nested action button and, while open, a popover with title,
    description and a nested link.
  - The popover surface is a box of the recipe, not the nested popover: a nested
    popover gets no slot fills yet (bead 5m92.32.22). The anatomy still says
    `component: popover`; they differ on purpose until then.
  - coach-mark: card (width, padding, radius, fill, elevated shadow), title,
    description and a `button-group` slot of buttons (temporary, bead 5m92.32.22).
  - contextual-help gains `title` and `description` options; the link shows when `href` is set.
  - SPEC-083 accepts root props on a floating part with children.
  - Not drawn yet: coach-mark cover image (its height tokens are deprecated),
    action button and pagination; popover border and three-layer shadow; the
    nested button draws `+`, not the info/help icon; the mobile coach-mark footer
    overflows the card.

- [#2069](https://github.com/adobe/spectrum-design-data/pull/2069) [`e356cda`](https://github.com/adobe/spectrum-design-data/commit/e356cda6155f3db35a4db4cabbe9f52fa59d2f83) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the in-field button, coach indicator, standard panel and bar panel recipes.

- [#2065](https://github.com/adobe/spectrum-design-data/pull/2065) [`4e45d4c`](https://github.com/adobe/spectrum-design-data/commit/4e45d4c97756992716e6882e3edcea2b1b52015a) Thanks [@GarthDB](https://github.com/GarthDB)! - Add visual recipes for tabs and segmented-control.
  - Both bind through the component relationships; all sizes draw from design-data tokens.
  - New `isSelected` and `isDisabled` options and `items[].isSelected` on both components.
  - `selection-indicator` is present only when `isSelected` is true.
  - Tab text colors pin `isSelected`; segmented gap pins `hideTracker`.
  - New live `Height` relationships for tabs `regular` density.
  - The 12px tabs `Spacing` record is pinned to vertical orientation.
  - Not drawn yet: overflow, truncation, vertical selection bar, focus ring and per-item states.

- [#2074](https://github.com/adobe/spectrum-design-data/pull/2074) [`71a0014`](https://github.com/adobe/spectrum-design-data/commit/71a0014bd670c3e6b750ded51b28fa1feee811be) Thanks [@GarthDB](https://github.com/GarthDB)! - Add visual recipes for tooltip and popover.
  - Both bind through the component relationships.
  - The popover shadow binds the elevated drop-shadow tokens.
  - The tip is a floating path part on the edge that faces the source.
  - Each edge is its own anatomy part: `tip-top`, `tip-bottom`, `tip-start`, `tip-end`.
  - `placement` picks the edge; popover `hideTip` draws no tip.
  - The popover `default` slot moves to a new `content` part and lists `accepts`.
  - Not drawn yet: popover border, tip shadow, tip radius, tooltip max width.
  - Registers the `tip-top`, `tip-bottom`, `tip-start` and `tip-end` anatomy terms.

## 0.38.0

### Minor Changes

- [#2060](https://github.com/adobe/spectrum-design-data/pull/2060) [`07fc360`](https://github.com/adobe/spectrum-design-data/commit/07fc360003c82cfd5b277ffbf941c338465dd914) Thanks [@GarthDB](https://github.com/GarthDB)! - The reference SDK loads a platform manifest's `extensions/deviations/` and enforces SPEC-109 to 111.
  - SPEC-109: a deviations file matches its schema; ids are unique per file.
  - SPEC-110: component, part, states, options and modes of a deviation resolve.
  - SPEC-111 (warning): a deviation's `property` is one its `part` sets in the recipe.
  - `render-compare`, `validate-manifest` and `platform impact` ignore them for now.

## 0.37.0

### Minor Changes

- [#2051](https://github.com/adobe/spectrum-design-data/pull/2051) [`df4012b`](https://github.com/adobe/spectrum-design-data/commit/df4012b1d5b92bce207592e807483a734bf9255b) Thanks [@GarthDB](https://github.com/GarthDB)! - A nested component part's `with.label` sets the nested request's label text.
  - `with.label` is a string literal or `{"option": name}` naming a string host option. It is
    the nested component's text, not an option; SPEC-089 checks that it is a string.
  - A slot fill's `options.label` works the same way.
  - A group of labelled radios can now be expressed: each nested item carries its own text.
  - Without `with.label` the nested label stays empty, as before.

### Patch Changes

- [#2054](https://github.com/adobe/spectrum-design-data/pull/2054) [`3e55d13`](https://github.com/adobe/spectrum-design-data/commit/3e55d131306f367fc4c4e808bc6a3c12feb8a6cb) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(design-data): accordion headingLevel option and per-item isDisabled
  - Add the `headingLevel` option to accordion (integer 1 to 6, default 3).
    It matches React Spectrum S2 `AccordionItemTitle` `level`.
    It is an accessibility value and changes no render.
  - Add `isDisabled` (boolean, default false) to the accordion `items[]`
    entries, matching S2 `AccordionItem`.
  - List `headingLevel` in the accordion visuals `notVisual`.
  - The accordion visuals still read the component-level `isDisabled`.
    Drawing one disabled item needs the engine to read `items[].isDisabled`.

- [#2056](https://github.com/adobe/spectrum-design-data/pull/2056) [`d11b4ae`](https://github.com/adobe/spectrum-design-data/commit/d11b4ae1ee5254d29a3b59981c522485898fc472) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(design-data): warn when a request slot key matches no slot
  - A render request `slots` key that is no slot name of a slot part now adds a
    scene warning. It lists the slots that have a part, and says so when the key
    is the part id (radio-group: `default`, not `options`). The render succeeds.
  - Document that `--slots` keys are slot names, not part ids.

## 0.36.0

### Minor Changes

- [#2037](https://github.com/adobe/spectrum-design-data/pull/2037) [`5d6bd00`](https://github.com/adobe/spectrum-design-data/commit/5d6bd008a946579c54356ac519cfb220dd07b3de) Thanks [@GarthDB](https://github.com/GarthDB)! - Anatomy parts can be another component; recipes read that link. Part of the 7.0.0 bundle.
  - **anatomy-format.md**: new "What is a part" rule replaces "What is not anatomy"; new `component`
    field on a part, checked by SPEC-106.
  - **component-format.md**: new `subcomponent: boolean`; hosts are derived ("Used in"), not stored.
  - **component-visuals.md and schemas**: BREAKING. A recipe `kind: component` part drops its
    `component` and reads the host's anatomy part of the same key (SPEC-089 reports a missing link).
  - **@adobe/spectrum-design-data**: BREAKING data shape. `component` on 95 anatomy parts in 46
    components, removed from 21 recipe parts in 12 recipes, 5 components marked `subcomponent`.
  - **@adobe/design-data-wasm**: the engine reads the nested component from anatomy; spec sheets
    and the site list gain `subcomponent` and `usedIn`. CLI is 0.62.2.
  - **@adobe/design-data, @adobe/design-data-mcp**: component search results gain `subcomponent`
    and `usedIn`.
  - Dataset `requires.cli` is raised to 0.62.2: older CLIs cannot read a part `component`.

- [#2041](https://github.com/adobe/spectrum-design-data/pull/2041) [`2ee32ce`](https://github.com/adobe/spectrum-design-data/commit/2ee32ce2e9c4de2a1542b0deb60ceb5c7de927c9) Thanks [@GarthDB](https://github.com/GarthDB)! - Relationships can scope to the place of a repeated item. Part of the 7.0.0 bundle.
  - **relationship-format.md, relationship.schema.json**: new `scope.itemPosition` (`first`,
    `middle`, `last`, `only`), counted over the drawn copies like a recipe `when.position`.
    `scope.position` (sides and corners) is unchanged.
  - **SPEC-107** (error): `itemPosition` needs a `scope.part` that is the repeated part of a
    collection slot, or a part inside it.
  - **@adobe/spectrum-design-data**: list-view's two "Item rounding" records move from
    `options.position` top/bottom to `itemPosition` first/last. Their `legacyKey` pins stay, so the
    legacy tokens are unchanged.
  - **@adobe/design-data-wasm**: the engine resolves a record per drawn copy by `itemPosition`
    (one satisfied condition) and refuses `itemPosition` values it does not know. CLI is 0.62.2.
  - Dataset `requires.cli` is unchanged: 0.62.2 is untagged and carries this.

- [#2042](https://github.com/adobe/spectrum-design-data/pull/2042) [`55328cc`](https://github.com/adobe/spectrum-design-data/commit/55328ccb343be47b437ec1d56b40d76cfc9f19f1) Thanks [@GarthDB](https://github.com/GarthDB)! - A nested recipe part's `with` entry can map a host option value to a nested value.
  Part of the 7.0.0 bundle.
  - **component-visuals.md, component-visual.schema.json**: a third `with` form,
    `{"option": "<host option>", "map": {"<host value as string>": "<nested value>"}}`, next to the
    literal and `{option}` forms. Booleans key as `"true"`/`"false"`.
  - **SPEC-089** (error) now checks the form: the host option exists, every key is a value of it,
    every mapped value is valid for the nested option. No new rule.
  - **@adobe/spectrum-design-data**: text-field, text-area, combo-box and picker draw their help text
    from `isError` (`true` is `negative`, `false` is `neutral`).
  - **@adobe/design-data-wasm**: the engine resolves the map. A host value with no key keeps the
    nested option's default and adds a scene diagnostic (a warning, not an error). CLI is 0.62.2.
  - Dataset `requires.cli` is unchanged: 0.62.2 is untagged and carries this.

- [#2044](https://github.com/adobe/spectrum-design-data/pull/2044) [`1951adf`](https://github.com/adobe/spectrum-design-data/commit/1951adf71da6c4b0d9e5419d91134dfe522e1b69) Thanks [@GarthDB](https://github.com/GarthDB)! - BREAKING: `presentWhen` replaces `presentIn` on anatomy parts (spec 7.0.0).
  - **Migrate** `presentIn: ["keyboard-focus"]` to `presentWhen: {"states": ["keyboard-focus"]}`.
    A part shown while an option is set takes `presentWhen: {"options": {"isSelected": true}}`. The
    key holds only `states` and `options`; `position` and `modes` fail the schema.
  - **ANY-of became ALL-of**: `presentIn` drew a part when any listed state was active, `states` needs
    every listed state. Do not copy a multi-state `presentIn` over: `selected-keyboard-focus`
    implies `keyboard-focus`, so stack-item takes `states: ["keyboard-focus"]`.
  - **Recipes**: `visibleWhen` keeps only `position`. Its `states` and `options` move to the anatomy
    part of the same name, and the renderer applies both (anatomy `presentWhen` and recipe position).
  - **Rules**: SPEC-075 is removed. SPEC-074 (`anatomy-present-when-declared`) now covers the whole
    condition: declared states, declared options, allowed values.
  - **@adobe/spectrum-design-data**: 42 `presentIn` keys became `presentWhen`, and 62 recipe
    conditions on 78 parts moved into 47 components. Renders are unchanged.
  - **CLI 0.63.0**: older CLIs read no presence condition and draw every part, so the dataset
    `requires.cli` is raised to 0.63.0. `presentIn` and recipe `states` and `options` are not read.

- [#2045](https://github.com/adobe/spectrum-design-data/pull/2045) [`84a3a3a`](https://github.com/adobe/spectrum-design-data/commit/84a3a3a25b832fed1b94bd2edae8141c1013dd49) Thanks [@GarthDB](https://github.com/GarthDB)! - BREAKING: accordion drops the `hasActionButton` and `hasSwitch` options; slot fills replace them.
  - **Migrate** a consumer that passed `hasActionButton` or `hasSwitch` (or the same keys on
    `items[]`) to fill the `actions` slot: a render request `slots: {"actions": [{"component":
"action-button"}, {"component": "switch"}]}`. The CLI takes `--slots <json>`, a batch state takes
    `slots`. Fills are the same for every item of the accordion.
  - **Spec**: a new `slot` recipe part kind draws a request's fills through the nested-component path.
    Fills past the slot's `max`, or outside its `accepts`, are scene diagnostics, never a failure. An
    optional `placeholder` literal (with a required `reason`) draws an empty slot. New rule SPEC-108.
  - **Data**: accordion loses the two options, their `items[]` copies and the `action-button` and
    `switch` parts; its `actions` part draws the slot. The "section title to action area" spacing
    record is scoped by `between` (title, actions) instead of `part: header`.
  - **Layout revision 6**: the accordion snapshot option sets changed. Renders with fills are
    unchanged apart from the part ids (`actions-1`, `actions-2`, replacing `action-button`, `switch`).
  - **Engine**: `RenderRequest` gains `slots`; older engines ignore it and draw no fills.

### Patch Changes

- [#2043](https://github.com/adobe/spectrum-design-data/pull/2043) [`d6236ca`](https://github.com/adobe/spectrum-design-data/commit/d6236ca9bf616fa4a9933517061f0d3db386a895) Thanks [@GarthDB](https://github.com/GarthDB)! - Identity migration for opacity-checkerboard. It reaches level 2 (and its recipe selectors carry no
  `context`, so the status check also reads level 3). The legacy `@adobe/spectrum-tokens` output is
  byte-identical. Recipe snapshots and goldens pass unchanged; the standalone checkerboard
  render now draws its pattern.
  - New anatomy parts `light-tile` and `dark-tile` (new registry terms) model the two alternating
    tiles; `square` keeps the size and now contains both. No tone option, no renamed terms.
  - The `square-light` and `square-dark` properties become `color` on `light-tile` and `dark-tile`.
    Records keep their uuids and legacy keys. Deprecated records are untouched.
  - The 4 non-legacy color records get a `background` attribute (interim): without it the recipe finds
    no relationship. `render --strict` still reports `patternFill` and `patternSize` as ambiguous
    (main already failed --strict on these recipes); the unlabelled size records get the `Square size`
    context their siblings already carry.
  - The recipe binds `fill` to the light tile and `patternFill` to the dark tile by part, not by
    context. `square` joins the relationship contexts registry.
  - tree-view and thumbnail records that restate these tokens are not part of this change.

- [#2039](https://github.com/adobe/spectrum-design-data/pull/2039) [`f563f96`](https://github.com/adobe/spectrum-design-data/commit/f563f96ff5aef38caa8c892263495bd6efbd76c2) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the color handle and color loupe recipes.

- [#2034](https://github.com/adobe/spectrum-design-data/pull/2034) [`c37b680`](https://github.com/adobe/spectrum-design-data/commit/c37b6809884cac367c148b2f1f9e3d72c81ad407) Thanks [@GarthDB](https://github.com/GarthDB)! - Skip tokens with `excludeFromLegacy` in legacy output. The embedded
  registry gains the `title` and `body` variants.

## 0.35.2

### Patch Changes

- [#2030](https://github.com/adobe/spectrum-design-data/pull/2030) [`2370b99`](https://github.com/adobe/spectrum-design-data/commit/2370b994c5b72d8a51672b6310d8df77c3293b8a) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe renderer: no matching state now falls back to the default record, and a
  relationship pinned to a `scale` applies only at that scale.
  - Alert banner: the close button end spacing is bound, so the close button sits 8px
    (desktop) or 16px (mobile) in from the end edge instead of flush.
  - Dataset `layoutRevision` is now 5, since the recipe layout output changed.
  - Dataset `requires.cli` is raised to 0.62.1 (the CLI bump in this change).

## 0.35.1

### Patch Changes

- [#2011](https://github.com/adobe/spectrum-design-data/pull/2011) [`dbedcc0`](https://github.com/adobe/spectrum-design-data/commit/dbedcc0084584e4cf75d6fcfd6d32aabd6dd548b) Thanks [@GarthDB](https://github.com/GarthDB)! - Anatomy review of the calendar and its three legacy holders (A9, part 2 of 3). calendar
  and the holders reach level 2. The legacy `@adobe/spectrum-tokens` output is byte-identical.
  - calendar: reviewed anatomy with container, previous-button, next-button, title, weekday-label,
    day (current-day-indicator, unavailable-indicator, focus-indicator), range-fill and help-text,
    plus a `days` slot. New option `visibleMonths` (1, 2, 3); `showTimeZone` is removed; the
    `days[].state` value `keyboard focus` becomes `keyboard-focus`.
  - single-, double- and triple-calendar: frozen legacy holders with a container part only. Their
    six legacy records move from part `popover` to `container`; the components are not deprecated.
  - The 27 calendar styling records move from date-picker to calendar (same uuids), with parts,
    background and border attributes, `between` pairs and pins for hover, error and disabled.
  - Registry: terms day, weekday-label, range-fill, current-day-indicator, unavailable-indicator,
    previous-button and next-button; aliases on calendar, title and range-fill.
  - CLI 0.62.0. Component-status and same-pin-set baselines are updated.

- [#2018](https://github.com/adobe/spectrum-design-data/pull/2018) [`1712d51`](https://github.com/adobe/spectrum-design-data/commit/1712d5161d085f81ca157cdf6b3fb4cef30b5b38) Thanks [@GarthDB](https://github.com/GarthDB)! - Anatomy review of date-picker and level 2 identity (A9, PR 3 of 3). The legacy
  `@adobe/spectrum-tokens` output is byte-identical.
  - Anatomy: container, field-label, field (segment, error-icon, in-field-button, focus-indicator),
    help-text, and a top-level popover (present when open, no tip) that holds the calendar and, with
    time granularity, a time-field. The draft part `value` is removed; `day` is deprecated
    (replaced by calendar's day) and stays declared only for the strikethrough tokens.
  - Options flattened from the nested `dateField` and `calendarPopover` objects, matching picker.
    Added `granularity`, `hourCycle`, `hideTimeZone`, `selectionMode` and `visibleMonths` (1, 2, 3).
    Removed `variant`, the nested `state` enum, `showTimeZone`, `is24Hour` and `timeFields`.
  - States hover, focus-+-hover, focus-+-not-hover, keyboard-focus and open.
  - Records are scoped to field, segment, error-icon, in-field-button, focus-indicator, popover or a
    `between`. The popover minimum sizes are pinned by `visibleMonths`. Removed records restate other
    components: popover radius, date-field and time-field minimum widths, help-text colours.
  - Registry: alias date-range-picker on date-picker. Component-status baseline is updated.

- [#2013](https://github.com/adobe/spectrum-design-data/pull/2013) [`325fad1`](https://github.com/adobe/spectrum-design-data/commit/325fad1ff8a05ec6fe349ab5773bc1a2f8c9b85e) Thanks [@GarthDB](https://github.com/GarthDB)! - Anatomy review of date-field, time-field and segmented-text-field (A9, PR 1 of 3). The legacy
  `@adobe/spectrum-tokens` output is byte-identical.
  - date-field: adds `error-icon` and `focus-indicator`, options `granularity` (day, hour, minute,
    second), `hourCycle`, `hideTimeZone`, `isError` and `isDisabled`, and the text-field state set.
  - time-field: aligned to date-field. The bordered box is now the `field` part under a new root
    `container`; adds `error-icon` and `focus-indicator`. It gets its first options, `granularity`,
    `hourCycle`, `hideTimeZone`, `isError` and `isDisabled`, and the text-field states. The
    minimum-width record moves to `container`.
  - segmented-text-field: becomes the shared segment base (container and segment) that date-field,
    time-field and date-picker copy. The rounding record moves to `segment`.
  - Registry: aliases Placeholder cell and DateSegment on `segment`; date-field and time-field terms
    reworded. Component-status baseline is updated.

- [#2017](https://github.com/adobe/spectrum-design-data/pull/2017) [`4b64f17`](https://github.com/adobe/spectrum-design-data/commit/4b64f17d6a8928e5fb3f67d7998ecaf11a96e400) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the options that tell merged records apart in tabs, segmented control, steplist and side
  navigation (5m92.6.2).

  Tabs declare size (s, m, l, xl) and density (regular, compact). Segmented control and steplist
  declare size. Side navigation declares isSelected and isDisabled.

  Records pin them, read off the token a record points at or off its former context. Tabs and
  steplist font sizes pin per size, tab height pins per density, segmented control items pin
  hideTracker (no track or with track), and side navigation pins its selected (not disabled) and
  disabled records.

  Same pin set groups fall from 4 to 1 in tabs, and from 2 to 1 in steplist, side navigation and
  segmented control. One tabs record that differed from its twin only by density, with the same
  token, is merged.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#2019](https://github.com/adobe/spectrum-design-data/pull/2019) [`145cdf5`](https://github.com/adobe/spectrum-design-data/commit/145cdf5d70ec23b3691a49ecbc1cc9f107484da9) Thanks [@GarthDB](https://github.com/GarthDB)! - Field value text: the focus and focus-hover color records now say which state they apply to.
  - In text-field, picker, search-field, number-field and text-area, the `focus` value color record
    is pinned to `focus-+-not-hover` and the `focus-hover` one to `focus-+-hover`, as the border
    records already are. At keyboard focus only the keyboard-focus record applies, so a render with a
    value no longer reports two tied candidates (bead qkj5.293).
  - Resolved colors are unchanged. Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#2014](https://github.com/adobe/spectrum-design-data/pull/2014) [`500a4e0`](https://github.com/adobe/spectrum-design-data/commit/500a4e00ffce7eceabf26a826987fac54e2318e2) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate side-navigation, stack-item and tree-view to level 2 identity (5m92.6).
  - Every live record now names a part or a between, no property name carries structure, and
    no identity is shared by records with different contexts.
  - Fused names are decomposed: icon size, minimum and fixed heights, font size and line height
    get a part and a scale pin. Edge, item and indicator spacing becomes space-between with
    start-edge, end-edge, top-edge and bottom-edge endpoints.
  - Colour records get an attribute (background or border) and colorScheme pins. Background,
    opacity and label colour records of stack-item and tree-view share one context each and pin
    the state that the old qualifier named.
  - Side navigation: the second and third level indent records pointed at the same tokens, so
    four exact duplicates are removed.
  - Deprecated records and legacy keys are untouched.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#2016](https://github.com/adobe/spectrum-design-data/pull/2016) [`7130289`](https://github.com/adobe/spectrum-design-data/commit/7130289e7cdbbbb3cc278e7dfd49d7f6fb1d5057) Thanks [@GarthDB](https://github.com/GarthDB)! - Picker: the field background records now say which state they apply to.
  - The three gray-200 background records are pinned to the hover state, so the default
    background (gray-100) and the hover background no longer tie when a recipe binds them.
  - Picker declares the `down` interaction state, as button and search-field do.
  - Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#2023](https://github.com/adobe/spectrum-design-data/pull/2023) [`003f55c`](https://github.com/adobe/spectrum-design-data/commit/003f55ca2089e2c6aeadbef21250e3bf7bc2cbe5) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the picker chevron color.

- [#2024](https://github.com/adobe/spectrum-design-data/pull/2024) [`fd29bb7`](https://github.com/adobe/spectrum-design-data/commit/fd29bb7b5b24685c04b139207165b0bfbdc4a8a0) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the combo box recipe.

- [#2022](https://github.com/adobe/spectrum-design-data/pull/2022) [`1ae6569`](https://github.com/adobe/spectrum-design-data/commit/1ae6569690f1429b734139c8703f678e59884f64) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the toast, alert banner and in-line alert recipes.

- [#2026](https://github.com/adobe/spectrum-design-data/pull/2026) [`e452a23`](https://github.com/adobe/spectrum-design-data/commit/e452a2357402f424ec10d115e23150b786a4f007) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the number field recipe.

- [#2015](https://github.com/adobe/spectrum-design-data/pull/2015) [`57f0542`](https://github.com/adobe/spectrum-design-data/commit/57f05425d8621bdd841a24ff5dfdc019ab4c7102) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the picker recipe.

- [#2025](https://github.com/adobe/spectrum-design-data/pull/2025) [`ce87951`](https://github.com/adobe/spectrum-design-data/commit/ce87951b8034359e5dc7320a5eae2564ed227861) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the search field recipe.

- [#2021](https://github.com/adobe/spectrum-design-data/pull/2021) [`88a4427`](https://github.com/adobe/spectrum-design-data/commit/88a44271269f3f278f8de3a2841e4ae333b35d14) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the status light recipe.

- [#2020](https://github.com/adobe/spectrum-design-data/pull/2020) [`3576f7d`](https://github.com/adobe/spectrum-design-data/commit/3576f7de9ea88eae0dd3db73734e3960d257e029) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the tag recipe and its relationship fixes.

- [#2027](https://github.com/adobe/spectrum-design-data/pull/2027) [`1aae2d7`](https://github.com/adobe/spectrum-design-data/commit/1aae2d73e9b2f2b5ba227881a8aaed230ddadc76) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the text area recipe.

- [#2008](https://github.com/adobe/spectrum-design-data/pull/2008) [`4544078`](https://github.com/adobe/spectrum-design-data/commit/4544078251ccaee511a1e5aca89945d8d8f9ae82) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the text field recipe and the field-label text option.

- [#2009](https://github.com/adobe/spectrum-design-data/pull/2009) [`76e46e3`](https://github.com/adobe/spectrum-design-data/commit/76e46e36b710a6362446a41504295b87284be80c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the render ambiguity check so a record pinned to an inactive state
  no longer ties with the chosen candidate. A text field in its default
  or error state keeps its border and value text colors.

## 0.35.0

### Minor Changes

- [#2006](https://github.com/adobe/spectrum-design-data/pull/2006) [`f6285d8`](https://github.com/adobe/spectrum-design-data/commit/f6285d8d380fa73810b4d63c5c25b560be0b7335) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can draw a second stroke, stack parts and pick a stroke by position.
  - Root props `innerStroke`, `innerStrokeWidth` and `innerStrokeOpacity` draw a second border
    just inside the first, over the children, as the ring node `<root>.inner-border`.
  - A root with `direction: "stack"` overlays its children in declaration order.
  - A relationship selector can add `position: "inner"` or `"outer"` (default outer). A record
    pinned to one position serves only that selector, so two strokes no longer collide.
  - A nested component now inherits a corner radius given as a ratio of the host height.
  - The swatch draws its checkerboard behind the fill and its inner band when selected.

### Patch Changes

- [#2003](https://github.com/adobe/spectrum-design-data/pull/2003) [`15f49f2`](https://github.com/adobe/spectrum-design-data/commit/15f49f2c55f494739e463b2029d9e91498d7f687) Thanks [@GarthDB](https://github.com/GarthDB)! - Embed the Accordion data change: expanded items draw their content (`items[].content`).

- [#2000](https://github.com/adobe/spectrum-design-data/pull/2000) [`de570f2`](https://github.com/adobe/spectrum-design-data/commit/de570f2598546e75f64ec6ae4322771c26569e89) Thanks [@GarthDB](https://github.com/GarthDB)! - Anatomy review of the anchored overlays and modal dialogs (A8, part 1).
  - popover and tooltip: explicit `container` root; `tip` is a top-level sibling part (popover
    keeps a `default` slot on the container). tooltip loses `icon` and the `hasIcon` option.
  - standard-dialog, alert-dialog, takeover-dialog: a top-level `overlay` part (colour, opacity),
    one `button-group` part in place of the primary, secondary and cancel action parts, and
    `description` as the secondary text (`body` stays only as the slot host in standard-dialog and
    takeover). takeover-dialog declares slots and drops its `slots` option. The registry terms
    `overlay-color` and `overlay-opacity` are retired.
  - coach-mark: explicit root, `cover-image` (was `media`), `description` (was `body`),
    `button-group`, `menu-container`; `pagination-text` removed. contextual-help: top-level
    `popover` part with `description`; the radius record, two S2 records on deprecated
    targets and the `down` and `keyboard-focus` states are removed.
  - Records move to part, attribute, between and option pins; legacy records take their S2
    alias's part and context. popover, tooltip and the three dialogs reach level 2; coach-mark
    and contextual-help reach level 1. Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#2001](https://github.com/adobe/spectrum-design-data/pull/2001) [`bc09586`](https://github.com/adobe/spectrum-design-data/commit/bc0958652fa2b1ad9cf8559f556d174be92c26cd) Thanks [@GarthDB](https://github.com/GarthDB)! - Anatomy review of panels and empty states (A8, part 2 of 3).
  - standard-panel, bar-panel, drop-zone and illustrated-message are reviewed, each with a root
    `container`. The panel grip part is `drag-handle` (was `gripper`; legacy records moved, gripper
    contexts harmonised). standard-panel option `container` is now `type`. bar-panel gets an
    `actions` slot and the alias `toolbar`.
  - The secondary text part is `description` (was `body`); illustrated-message `actions` is the
    `button-group` part; drop-zone has its own parts, `button` (was `action`) and a `banner` part
    (state `drag-and-drop`, new option `isFilled`). tray is archived as Spectrum 1 only.
  - Records get parts, `between` and size/script/scale pins from their `$ref` targets. New term
    `banner`; `gripper` is an alias of `drag-handle`.
  - Status: standard-panel and bar-panel reach level 2; drop-zone and illustrated-message level 1.
    Legacy `@adobe/spectrum-tokens` output is byte-identical.
  - **Published options:** standard-panel `hideGripper` is renamed `hideDragHandle`.

- [#2002](https://github.com/adobe/spectrum-design-data/pull/2002) [`f6c40de`](https://github.com/adobe/spectrum-design-data/commit/f6c40de77fc87ca84dc1976ca6fb2e6f4e2f9230) Thanks [@GarthDB](https://github.com/GarthDB)! - Anatomy review and identity migration of slider, rating and select-box (A8, PR 3 of 3). All three
  reach level 2. The legacy `@adobe/spectrum-tokens` output is byte-identical.
  - slider: reviewed anatomy with container, field-label, value, control, track, fill, handle,
    number-field and focus-indicator; `text-field` is removed. Options gain `size`, `isEmphasized`,
    `trackStyle` (thin, thick, ramp) and `handleStyle`; `hasGradient` and `progressionScale` are
    removed. Records get parts, size pins and `between`; `component-height-N`,
    `control-to-field-label-*` and `font-size-N` are decomposed.
    The Label font records move to `value`.
  - slider: the old `size` values small, medium, large and extra-large stay as deprecated
    values (replaced by s, m, l, xl).
  - rating: the star part `indicator` is renamed `icon`; option `size` (s, m) added.
    The `indicator` part is kept as deprecated.
  - select-box: state `selected` is removed (the option `isSelected` covers it); the `vertical-` and
    `horizontal-` name prefixes become an `orientation` pin; shadows get `attribute: shadow`.
  - Registry: `number-field` anatomy term. Disabled and shadow collisions are resolved by a pin.
    Component-status, recipe-lint and same-pin-set baselines are updated.

- [#2007](https://github.com/adobe/spectrum-design-data/pull/2007) [`16de304`](https://github.com/adobe/spectrum-design-data/commit/16de304f900ebb1d4021f71f5c57e9c5825668e5) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate breadcrumbs and steplist to level 2 identity (5m92.6).
  - Every live record now names a part or a between, no property name carries structure, and
    no identity is shared by records with different contexts.
  - Breadcrumbs: the current page title is a breadcrumb-title part that owns the multiline
    font and the top text to bottom text spacing. Edge and item spacing becomes space-between
    with start-edge, end-edge, top-edge and bottom-edge endpoints.
  - Steplist: track is a child part of step. Font names lose their size suffix.
  - Colour records get an attribute (background or border) and colorScheme pins. Records that
    scale carry scale pins; breadcrumbs records are pinned to isMultiline false or true.
  - Disabled colour records share the context of their sibling records, because the disabled
    state is not a declared option. The state stays on the referenced token.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#2005](https://github.com/adobe/spectrum-design-data/pull/2005) [`c66f9a2`](https://github.com/adobe/spectrum-design-data/commit/c66f9a2e7a40c2414e625cf76eb3bba3574dedc5) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate tabs and segmented-control to level 2 identity (5m92.6).
  - Every live record now names a part or a between, so no record is left without structure.
  - Fused names become real terms: `font-size-N` to `font-size`, `workflow-icon-size-100` to
    `size` on the icon. Edge spacing becomes `space-between` with start-edge, end-edge,
    top-edge and bottom-edge endpoints; symmetric pairs are two records sharing one `$ref`.
  - Colour records get an `attribute` (background or border). No `background-color` or
    `border-color` record is added.
  - Records that scale or change by colour scheme carry `scale` and `colorScheme` pins.
  - Contexts (and the qualifier that goes with them) were made equal only where two records
    shared one identity. One duplicate segmented-control spacing pair was removed.
  - Tab gap records and the compact tab heights now share one identity and context.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

## 0.34.2

### Patch Changes

- [#1994](https://github.com/adobe/spectrum-design-data/pull/1994) [`5168ad1`](https://github.com/adobe/spectrum-design-data/commit/5168ad1aa4398ec0e9d67a6740537a7dfc90f8bf) Thanks [@GarthDB](https://github.com/GarthDB)! - Anatomy review of the collections family (A3, level 1).
  - menu, list-view, side-navigation, tabs, segmented-control, breadcrumbs, steplist, tree-view, table
    and stack-item get a `container` root and a reviewed anatomy. Collections declare a `default` slot
    (the part repeats per entry of `items`); table has three, `columns` feeding two.
  - New registry term `selection-indicator` (the marker inside a tab, side-navigation item or
    segment, replacing `indicator` and `selection`), plus `column-header-row`, `row-checkbox`,
    `header-row-checkbox` and `trailing-accessory-area`. `trailing-icon`, `drag-icon` and
    `step-item` are removed.
  - Expand and collapse is `disclosure-button` (tree-view, side-navigation); `drill-in-chevron` and
    `link-out-icon` are non-interactive indicators. `track` is a child of `step`; `breadcrumb-title`
    is a part; `separator-icon` is `separator`; `item` is `cell` in table; `action-area` is
    `actions`.
  - **Published options:** menu gets a flat `items` option; its `label`, `icon`, `description`,
    `value`, `isDisabled` and `isUnavailable` options move into the entry schema;
    side-navigation entries get a `level`; list-view drops the authored `itemRounding` entry
    option (the position is derived from the entry order); `"keyboard focus"` becomes
    `keyboard-focus` in state enums. Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#1988](https://github.com/adobe/spectrum-design-data/pull/1988) [`a07d781`](https://github.com/adobe/spectrum-design-data/commit/a07d7812b11f8a319a3b240b09b05af3998ea86d) Thanks [@GarthDB](https://github.com/GarthDB)! - Anatomy review of the groups family (A6).
  - button-group, action-group and swatch-group stay components: an explicit root `container` and
    one `default` slot (part `container`, accepts the child component, min 1). `button`,
    `action-button` and `swatch` are no longer parts.
  - avatar-group (`avatars` host plus `label`), tag-group (`tags` host; `action-button` is a
    sibling part shown by `actionLabel`), checkbox-group and radio-group (`options` host; radio
    needs 2 or more) declare a slot whose part is the host. checkbox-group and radio-group get
    anatomy with no records yet.
  - action-bar: `counter` merged into `item-counter`, `action-group-area` renamed `action-group`,
    `close-button` added; the 3 Border colour records are pinned to `colorScheme` light, dark and
    wireframe.
  - Group spacing records become `space-between` with `between` on the repeated child. avatar-group
    `to-avatar-{size}` and `font-size-{N}` records are decomposed (size pin, part `label`);
    tag-group "text area to help text" is now "field to help text". New anatomy terms in the registry.
  - Status: action-bar, avatar-group and swatch-group reach level 1; action-group, button-group,
    checkbox-group, radio-group and tag-group reach level 2. form-item is untouched.
    Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#1996](https://github.com/adobe/spectrum-design-data/pull/1996) [`23810ae`](https://github.com/adobe/spectrum-design-data/commit/23810aed8b8f2fc745bbaa75b3e24a6be61c5c8a) Thanks [@GarthDB](https://github.com/GarthDB)! - Apply the colour anatomy (A7) and migrate identity (5m92.5.8).
  - color-handle, color-loupe, color-area, color-slider, color-wheel: anatomy reviewed, explicit
    `container`, nested-component parts and a `fill` part. Options `color`, `hasFill`, `isOpen`,
    `label` added; `background` and `channel` dropped. The loupe is a second top-level part of
    the handle; its 12px offset moves to the handle as `space-between`.
  - color-wheel drops its `color-area` part; color-control is a reviewed shared base.
  - swatch: `border` and `inner-border` become container styling (selected border and band are
    records pinned `isSelected`, the band colour is `outline-color`); `value` option; `tooltip`
    part. The inner band is no longer drawn (the renderer has no second stroke).
  - thumbnail: the 4px checkerboard record is rescoped to `size` on `opacity-checkerboard`.
  - Legacy records take the part, attribute and context of the S2 record that aliases them.
    Three loupe "S1 Shadows" records with no legacy key are removed.
  - Levels: the six colour components 0 to 2; swatch and thumbnail 1 to 2.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#1991](https://github.com/adobe/spectrum-design-data/pull/1991) [`beeb84b`](https://github.com/adobe/spectrum-design-data/commit/beeb84b48b539a25c67383b9a66ada585488a91c) Thanks [@GarthDB](https://github.com/GarthDB)! - Identity migration of the remaining groups: avatar-group and swatch-group reach level 2; action-bar
  gains parts but stays at level 1.
  - avatar-group: the 7 size records get part `avatars` and a size pin, the font-family, weight,
    style and size records get part `label`, and `font-size-600` / `line-height-100` become
    `font-size` / `line-height` on `label` (the CJK line height is pinned `script: cjk`).
  - swatch-group: the border colour and opacity records get part `container`; the colour record gets
    `attribute: border`. The legacy opacity record takes the context "Border" to end a collision.
  - action-bar: every record outside the 17 misfiled Step records gets a part (`container`,
    `item-counter` or `close-button`) or a `between`; padding becomes `padding-vertical` /
    `padding-horizontal`; background, border and shadow colours get an attribute; the 3 "Background
    (default)" records join "Background".
  - The `same-pin-set` and component-status baselines are regenerated. Legacy `@adobe/spectrum-tokens`
    output is byte-identical.

- [#1992](https://github.com/adobe/spectrum-design-data/pull/1992) [`1eaeba5`](https://github.com/adobe/spectrum-design-data/commit/1eaeba52595db95f7efd1c333697bfdd2772052b) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate tag and combo-box to level 2 identity (5m92.6).
  - tag: every live record gets a `part` (container, icon, label, clear-button, focus-indicator).
    Fused names become terms plus structure: `component-height-N` to `minimum-height`,
    `workflow-icon-size-N` to `size` on the icon, edge, top and gap spacing to `space-between`
    with `between` endpoints and a size pin, `font-size-N` to `font-size` + size pin,
    `line-height-100` to `line-height` on the label. The five identity collisions are gone.
  - tag colour records get `attribute: background`; the disabled fill context is harmonised to
    Background. The seven `legacyKey` records take the identity and context of the record that
    aliases them. Every uuid is kept.
  - combo-box: the stale `visual-to-field-button-quiet` record, a duplicate of the live
    alert-icon to field-button spacing record, is removed.
  - Status baseline: tag and combo-box 1 to 2. `background-color`/`border-color` stay frozen at 36.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

## 0.34.1

### Patch Changes

- [#1987](https://github.com/adobe/spectrum-design-data/pull/1987) [`8cbc6c0`](https://github.com/adobe/spectrum-design-data/commit/8cbc6c0d92dbffc8bfa8b064e3cd4348e1bfd9de) Thanks [@GarthDB](https://github.com/GarthDB)! - Review the anatomy of the messages and status components (A5).
  - status-light, in-line-alert, alert-banner, toast and coach-indicator are reviewed (level 1;
    coach-indicator reaches level 2). Each gets the explicit root part `container`.
  - status-light: the `visual-75`..`visual-300` pseudo parts go (the `size` option carries the dot
    size); the dot is the part `dot` (registry alias `light`).
  - in-line-alert: text parts are `title` and `description`; `link` and `button` are separate
    parts. The `style` option names the container fill (Figma "Border fill" is `outline`). The 27
    combined "X and Icon" colour records are split into a container record and an icon record that
    share one `$ref`.
  - alert-banner and toast: parts `icon` (registry alias `alert-icon`), `text`, `button` and
    `close-button`; the 21 Background colour records are pinned to a `variant`.
  - Gaps and edge paddings become `between` records (axis endpoints like `start-edge`).
  - coach-indicator: `collapsed` and `expanded` are states of the pulse (new registry states), not a
    qualifier.
  - floating-action-button is archive-only (Spectrum 1 only); its legacy-keyed records stay live.

  Legacy `@adobe/spectrum-tokens` output is byte-identical. Deprecated records are untouched.

- [#1986](https://github.com/adobe/spectrum-design-data/pull/1986) [`505afb5`](https://github.com/adobe/spectrum-design-data/commit/505afb59188619568db1c7bfaa046bbd0556aef8) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate field-label and help-text to level 2 identity and `typeStyle` recipes (5m92.6.1).
  - Both components reach level 2. Fused names become real terms: `component-height-N` to
    `minimum-height`, `workflow-icon-size-N` to `size` on the icon, the asterisk, edge and alert
    icon gaps to `space-between` with `between` endpoints and a size pin. Every uuid is kept.
  - The 13 font records per component become four `type-style` records (composite
    `component-{size}-regular`) plus the two line-height records, renamed to `line-height` with a
    part (the x1.3 overrides stay). The font-style record is dropped.
  - help-text's three `content-color` records get distinct parts (text, icon, container) so they no
    longer collide. field-label's white and black colour records are told apart by a new
    `staticColor` option pin.
  - The recipes bind `typeStyle`; rendered geometry and values are unchanged.
  - `requires.cli` is raised to 0.60.0.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

## 0.34.0

### Minor Changes

- [#1982](https://github.com/adobe/spectrum-design-data/pull/1982) [`8707903`](https://github.com/adobe/spectrum-design-data/commit/8707903e328dc037810aa9b1568ff513ebe4f479) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the `typeStyle` recipe prop (type styles, renderer half; 5m92.25.1).
  - A `text` part can bind `typeStyle` to a `type-style` relationship record. The renderer
    unpacks the composite it `$ref`s for the request's scale into `fontFamily`, `fontSize`,
    `fontWeight` and `lineHeight`. A font prop the part binds itself wins for its axis.
  - Diagnostics: `typeStyle: '<label>' is not a typography composite` and
    `typeStyle: <composite>.<axis> '{<alias>}' not found`.
  - Spec text for the prop and its precedence in component-visuals.md; the component-visual
    schema lists `typeStyle`.
  - Diagnostic also: `typeStyle: composite has no such axis`.
  - CLI 0.60.0 (0.59.0 is released); `requires.cli` is unchanged.
  - No recipe uses it yet, so no rendered output changes. `layoutRevision` is unchanged:
    nothing in the solver or layout semantics moves for existing recipes.
  - Core: `cascade::resolve_reference_in` and `typography::unpack_in` take a prebuilt alias
    index, so unpacking many composites does not rescan the tokens.

## 0.33.0

### Minor Changes

- [#1981](https://github.com/adobe/spectrum-design-data/pull/1981) [`3f4978c`](https://github.com/adobe/spectrum-design-data/commit/3f4978c0bb6300e7b81cbbed898fad973b4c71e6) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the `type-style` property and rule SPEC-105 (type styles, data half; 5m92.25.1).
  - New property term `type-style`. The 44 records that used `typography` to `$ref` a
    typography composite (text-field, text-area, search-field, number-field, combo-box,
    picker) now use it; uuids, `$ref`s and values are unchanged, and the composite tokens
    keep `name.property: typography`.
  - SPEC-105 (warning): a `type-style` record must `$ref` a typography composite and a
    typography `$ref` must have that property; the size must be a declared size; every
    inner alias must resolve in every `scale` mode. No existing record warns.
  - Spec text: type-style records, inner aliases resolve by mode, and `layoutRevision` bumps
    only for solver or layout changes, not for a data-only snapshot change.
  - Core: `typography::unpack` resolves a composite's sub-values per mode.
  - `design-data-component-tokens` returns a composite as `style` (resolved `fontFamily`,
    `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, by `scale` where they differ)
    instead of the raw `{font-size-100}` strings.
  - Spec sheets show a type style's resolved values on the Typography page.
  - The fused-property codemod treats a `$ref` to a typography composite as `type-style`.

### Patch Changes

- [#1981](https://github.com/adobe/spectrum-design-data/pull/1981) [`3f4978c`](https://github.com/adobe/spectrum-design-data/commit/3f4978c0bb6300e7b81cbbed898fad973b4c71e6) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the DTCG export of typography composites under a non-default scale. Inner aliases
  (`{font-size-300}`) always resolved to the desktop row, so `export --scale mobile --format dtcg`
  gave `component-xl-medium` a 18px font size and 22px line height instead of 22px and 26px.

- [#1979](https://github.com/adobe/spectrum-design-data/pull/1979) [`65094d9`](https://github.com/adobe/spectrum-design-data/commit/65094d9bad1b3b029869f634ce66e35721f0ab7f) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate the field hosts to structured identity (5m92.6, 5m92.22); extend the codemod.
  - text-area, search-field, number-field, in-field-button and tag-field reach status level 2.
    tag-field's 15 "Background and border" colour records stay unsplit (see the PR).
    combo-box and picker stay at level 1 on records that need a design call.
  - Fused `scope.property` names (`component-height-75`, `component-edge-to-text-100`,
    `to-component`, `workflow-icon-size-100`) become real terms plus a size pin, a `between`
    or a modifier pin. Every uuid is kept except four identical duplicates; new split
    uuids follow `backfill-relationship-uuid.mjs`.
  - Edge gaps use `space-between` with axis endpoints; a token that serves both edges is
    two records with the same `$ref`. Disabled colour records move to an `isDisabled` pin.
  - in-field-button: the four stacked width records get `part: container`.
  - Codemod: colour split rule (background and border into two records), `options.size`
    from the token's size word when records would otherwise tie, size words (`-small`,
    `-extra-large`), the edge axis from the token's padding property, and the CJK
    `name.legacyKey` check.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#1977](https://github.com/adobe/spectrum-design-data/pull/1977) [`2638998`](https://github.com/adobe/spectrum-design-data/commit/26389985bf106283474d8d375dabdd05ae069ae6) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate text-field to structured identity (level 2) and add the fused-property codemod
  (5m92.6, 5m92.22).
  - text-field: 46 live records lose their fused `scope.property` (`component-height-75`,
    `component-edge-to-text-100`, `to-component`) for a real term plus a size pin, a `between`
    or a modifier pin. Every uuid is kept except two duplicate records (see the PR).
  - Edge gaps use `space-between` with axis endpoints (`start-edge`, `end-edge`, `top-edge`,
    `bottom-edge`). A token that serves both edges is two records with the same `$ref`.
  - Registry: `top-edge` added to positions; `registry_data.rs` regenerated.
  - `scripts/decompose-fused-properties.mjs` (`--report`, `--write`, `--check`, `--family`) with
    tests. It refuses name modifiers the component lacks, skips legacyKey records, reports
    judgement cases and never touches `background-color` or `border-color` records.
  - Ratchet: live `background-color` and `border-color` records are held at 36.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

- [#1980](https://github.com/adobe/spectrum-design-data/pull/1980) [`d030738`](https://github.com/adobe/spectrum-design-data/commit/d0307386520360093719a6910edf14ea59e6ec73) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the `menu-container` part to combo-box and picker (5m92.22).
  - Each component's four `component-to-menu-{small,medium,large,extra-large}` records become
    one `space-between` record from `container` to `menu-container` that pins `size` to all
    four sizes (SPEC-100). It keeps the first uuid, the `$ref` (popover-gap) and the context;
    the other three uuids are dropped.
  - picker reaches status level 2. combo-box keeps its S1 quiet record until the tokens release.

## 0.32.1

### Patch Changes

- [#1974](https://github.com/adobe/spectrum-design-data/pull/1974) [`ff813dd`](https://github.com/adobe/spectrum-design-data/commit/ff813ddb3add6a16fdee77edd527dae8ae280d05) Thanks [@GarthDB](https://github.com/GarthDB)! - Review the anatomy of card and merge `cards` into it (A4, first pass).
  - Removed the `cards` component. Its 112 live relationship records, docs blocks and
    accessibility moved into `card` (10 records that only pointed at a `card` record were
    dropped). The Hub's `cards` page now maps to `card`.
  - card anatomy: `container` (root), `preview`, `selection` (the checkbox plate), `title`,
    `description` and `focus-indicator`. Records get a part; gaps whose endpoints are not card parts
    stay unstructured until the Patterns work. The selected stroke is a `container` state.
  - card options: `variant` (primary, secondary, tertiary, quiet), `size` and `density`. The old
    card-kind `variant` (asset, collection, flex, ...) is gone. States: hover, down,
    keyboard-focus, selected, disabled, loading.
  - Size, density and variant are pinned on records instead of prose contexts. The padding
    records keep their fused property names (5m92.6).
  - card-horizontal, collection-card and user-card are archive-only: no live records, component
    `lifecycle.deprecatedIn`, archived records untouched.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

## 0.32.0

### Minor Changes

- [#1967](https://github.com/adobe/spectrum-design-data/pull/1967) [`8390384`](https://github.com/adobe/spectrum-design-data/commit/83903848b0136b8b710154411d0719071903890b) Thanks [@GarthDB](https://github.com/GarthDB)! - A component's `slots` now own every fact about a slot (RFC #1801). Breaking for readers of the
  component and recipe formats.
  - `slotDeclaration` gains `part` (the anatomy part), `accepts` (component names), `acceptsOnly`,
    `min`, `max` and `collection` (the array option whose entries repeat `part`). `required` is
    removed: `min` of 1 or more replaces it.
  - New rule SPEC-104 checks the part, the `accepts` components, the collection option, its
    anatomy parent, `min` and `max`, unique names, and warns when a slot is not named `default` or
    after its part. It replaces SPEC-021 (the canonical slot vocabulary), which is retired.
  - A recipe's `repeat` loses `part` and `option`; it keeps `slot`, `label` and `with`. The
    collection slot gives the repeated part and the option. SPEC-060 checks the slot and that the
    declaring part is the repeated part's anatomy parent; SPEC-066 reads the option through it.
    Compiled recipe data (`data.json`) is unchanged, so the solver, WASM and the browser engine
    read the same shape and renders are byte-identical.
  - Button declares its two slots with a `part`; accordion declares `default` (the `items`
    collection), `actions` (accepts `action-button` and `switch`) and `content`. Migrate a recipe's
    `repeat: {part, option}` to a collection slot plus `repeat: {slot}`.

### Patch Changes

- [#1971](https://github.com/adobe/spectrum-design-data/pull/1971) [`f53a93e`](https://github.com/adobe/spectrum-design-data/commit/f53a93e1a0a57c6f4b666d572fd03b5530662796) Thanks [@GarthDB](https://github.com/GarthDB)! - Finish the fields anatomy review (A2-2).
  - in-field-button is reviewed as a component with its own anatomy, `container` and `icon`
    (`fill` is renamed `container`, and its stacked rounding record follows). Hosts already nest
    it as the part `in-field-button`. The stacked S1 width records stay active, with no part.
  - Removed the `in-field-progress-button` component: it had no relationship records, no anatomy
    and no design source (Figma only has the in-field progress circle). Its docs, schema mirror
    and changelog go with it.
  - date-field gets the root `container` / `field` anatomy and is reviewed (level 2).
  - text-field, text-area and combo-box no longer restate field-label's `top-to-asterisk`
    records (6 records, same tokens as field-label's own).

  Legacy `@adobe/spectrum-tokens` output is byte-identical. Deprecated records are untouched.

- [#1965](https://github.com/adobe/spectrum-design-data/pull/1965) [`3b10766`](https://github.com/adobe/spectrum-design-data/commit/3b1076632a42fddf9f5b041f085bf397ea14c5d3) Thanks [@GarthDB](https://github.com/GarthDB)! - The status report skips L3 (structured recipe) for a component with exactly one declared
  anatomy part, named `text`, and no visual recipe: the check passes, the report shows `n/a`,
  and the JSON output gains `l3NotApplicable`. Every other component still needs L3. In the
  committed baseline, code, detail and title rise from level 2 to 3; body and heading stay at 1.

## 0.31.2

### Patch Changes

- [#1968](https://github.com/adobe/spectrum-design-data/pull/1968) [`ddf5445`](https://github.com/adobe/spectrum-design-data/commit/ddf5445ba61dbf79cc25f19ed7e16f3d415e7ed0) Thanks [@GarthDB](https://github.com/GarthDB)! - Review the anatomy of the input fields: text-field, text-area, search-field, number-field,
  combo-box, picker, tag-field and the shared `field`. Every live relationship record (880) now
  names its part (`scope.part`), and inner spacings name their two ends (`scope.between`).
  - Each component has a root part `container` (width, and the spacing between label, field and
    help text) that holds `field-label`, `field` and `help-text`. The bordered box is the part
    `field` (it was `container`). tag-field renames `text-area` to `value`.
  - Colors on the box carry `attribute: border` or `background`.
  - number-field gets its first anatomy (field, stepper, two in-field buttons); its three
    "Positive icon" records (no source has one) are removed.
  - Picker: two copy-pasted contexts are corrected, and its subdued color is the `placeholder`.
  - Registry: `segment` is added, `field-button` and `stepper` are removed (`stepper` stays as an
    alias of `in-field-stepper`), and `field` is described as the box.
  - The eight components are marked `reviewed` (level 1, `field` level 2).

  Legacy `@adobe/spectrum-tokens` output is byte-identical. Deprecated records are untouched.

- [#1966](https://github.com/adobe/spectrum-design-data/pull/1966) [`a673ead`](https://github.com/adobe/spectrum-design-data/commit/a673ead72a74ff6d91001b077fe68037e2aec854) Thanks [@GarthDB](https://github.com/GarthDB)! - Component changelogs now list a change to a relationship's `scope.part`,
  `scope.between`, `scope.property` or `scope.attribute` as an `api` entry, because a
  recipe selector that named the old identity stops resolving. Moves that keep the
  identity stay metadata: `scope.options.from`/`to` to `scope.between`, `contextPart` to
  `scope.part`, the root part added to a record, and `contextRole`/`contextQualifier`
  changes. Option pins (`state`, `variant`) stay visual. Existing changelogs are not
  rewritten.

## 0.31.1

### Patch Changes

- [#1964](https://github.com/adobe/spectrum-design-data/pull/1964) [`676b08d`](https://github.com/adobe/spectrum-design-data/commit/676b08d9d3ed808075c931240c3a1ba438efdda4) Thanks [@GarthDB](https://github.com/GarthDB)! - Review the anatomy of body, heading, detail, title and code. Each stays a component with one
  root part, `text`, and its 239 live relationship records now say so (`scope.part`).
  - Title: `size` is renamed `font-size` (14 records), `family: cjk` becomes `script: cjk` (10),
    and its two duplicate margin records are removed.
  - Code: `size` becomes `font-size` (5), and its description is fixed.
  - Body, heading and detail: `margin-multiplier` becomes `margin` with `position`, and the
    margin `structure` option is dropped. The registry drops the `heading` and `detail`
    structures (unused).
  - Title: contexts are harmonised so each property has one (15 records gain `Text`, 2 margins gain
    `Margins`, letter-spacing goes from `Title-XXXL` to `Text`). Other components keep theirs.
  - Heading no longer lists React Spectrum `Heading` as its implementation (it is unstyled).
  - The five components are marked `reviewed`. Code, detail and title are at status level 2
    (body and heading at 1).

  Legacy `@adobe/spectrum-tokens` output is byte-identical. Deprecated records are untouched.

- [#1963](https://github.com/adobe/spectrum-design-data/pull/1963) [`22993f8`](https://github.com/adobe/spectrum-design-data/commit/22993f870acbb4d74b2f2febd6f369e95f0cc223) Thanks [@GarthDB](https://github.com/GarthDB)! - Component changelogs now classify a change to a relationship's `scope.options` pin
  as a visual change instead of metadata. A pin selects which record renders, so it
  was previously counted but not listed.

- [#1960](https://github.com/adobe/spectrum-design-data/pull/1960) [`e1b3e4a`](https://github.com/adobe/spectrum-design-data/commit/e1b3e4ac83eddfbc6056b5fa247d7ae7f23583ac) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a visual recipe name a relationship by its structured identity, and add `scope.attribute`
  (proposal 018).
  - **Spec:** a relationship's identity is `(scope.property, scope.attribute, scope.part,
scope.between)`. `scope.attribute` is new and optional: a sub-quality of the property
    (`border`, `background`, `dash`, `shadow`, `corner`, `overlay`, `gradient`). It is checked
    against `registry/attributes.json` as a warning (SPEC-101).
  - **Spec:** a recipe `relationship` selector may use `attribute`, `part` and `between` instead
    of `context`. It must name `part` or `between`, matches every record whose given fields are
    equal, and SPEC-062 rejects a selector that names more than one identity. Mixing `context`
    with them is invalid.
  - **Rules:** SPEC-062's one-identity check is an error where a component has no identity
    collisions, a baselined warning elsewhere. `context` selectors per recipe cannot rise.
  - **Data:** the switch and checkbox recipes bind by identity, and 190 relationship records gain
    `scope.part` (158) or `scope.between` (32); no other field changes.
    Renders and spec sheets are byte-identical. `@adobe/spectrum-tokens` is not affected.
  - **Engine:** the renderer, SPEC-062/066/071/090, the status report and the spec-sheet generator
    read both forms. A CLI or WASM build older than this one cannot resolve the new recipes.
  - **Release:** the dataset requires CLI 0.57.0; 0.56.0 cannot resolve selectors without `context`.

## 0.31.0

### Minor Changes

- [#1957](https://github.com/adobe/spectrum-design-data/pull/1957) [`527173e`](https://github.com/adobe/spectrum-design-data/commit/527173e35e91574fa263aa92b7e5ce3b0cba3af5) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the accordion `container-divider` part, following Figma.
  - The divider that opens the list is drawn once on the accordion container, above the first item.
    Each item keeps its own end divider.
  - Every non-quiet accordion render gains one 1px line at the top; the container is 1px taller.
    Quiet accordions are unchanged.
  - New registry term `container-divider`. Layout revision is unchanged.

- [#1952](https://github.com/adobe/spectrum-design-data/pull/1952) [`7afe677`](https://github.com/adobe/spectrum-design-data/commit/7afe677da514a49326fdd4e6b124cf61bd29afae) Thanks [@GarthDB](https://github.com/GarthDB)! - Review the anatomy of accordion, field-label, thumbnail and opacity-checkerboard. Their relationship
  records now say which part they belong to (`scope.part`).
  - Accordion: `item` is renamed `accordion-item` (the recipe root, so its render node ids change),
    `direct-actions` is renamed `actions`, and a state-only `focus-indicator` is added. The header's
    horizontal padding has its own "Header (horizontal)" records, not the content ones.
  - Field label and thumbnail: no anatomy change. Thumbnail border records move to `container`, its
    checkerboard records to `opacity-checkerboard`.
  - Opacity checkerboard: `container` is the root and `square` the tile.
  - The anatomy registry drops `small-divider`, `required-asterisk` and `required-text` (unused).
  - The four components are marked `reviewed`.

  Drawings are unchanged. Only the root part names of accordion and opacity-checkerboard differ.

- [#1945](https://github.com/adobe/spectrum-design-data/pull/1945) [`defcfe7`](https://github.com/adobe/spectrum-design-data/commit/defcfe7ba4864bc42f70ec4ebd2ccba1f56b01da) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a clear-button component and its visual recipe. The clear button is the icon-only control that
  clears or removes a value, such as the remove control on a tag. It is not the in-field button.
  - Declares `size` (s, m, l, xl), `staticColor` (white) and `isDisabled`. Anatomy (container, icon,
    focus-indicator) is reviewed.
  - The recipe draws a round, transparent button, as React Spectrum does: 24, 32, 40 and 48 px
    squares with an 8, 8, 10 and 12 px cross. Hover, down, keyboard focus, disabled and static white
    change the cross color or add the focus ring.
  - Relationships reuse the close-button size, content color and focus ring tokens. The cross size
    tokens are deprecated with no replacement, so the recipe has 8 SPEC-069 warnings (baselined).

- [#1953](https://github.com/adobe/spectrum-design-data/pull/1953) [`9f95e99`](https://github.com/adobe/spectrum-design-data/commit/9f95e992a2723198f52a06eb9bae4ac0d1133dac) Thanks [@GarthDB](https://github.com/GarthDB)! - Declare a collection on its container part, and add position conditions. Layout revision is 4.
  - `repeat` moves from the recipe to the root part (the container). It gains `part`, the direct
    child that repeats; the item does not know it is repeated. The recipe-level `repeat` is removed
    (draft spec; only the accordion used it).
  - Each copy is solved as its own root and placed as a flowed child of the container, so the
    container's `direction`, `gap` and padding apply. A container with a fixed width makes copies
    fill it; a container with no width hugs them (widest copy in a column, sum in a row).
  - A single copy (one entry or none) keeps plain node ids; several are `<part>-<n>`.
  - `when.position` and `visibleWhen.position` take `first`, `middle`, `last` or `only`, evaluated
    per copy. SPEC-061 checks the values and that `position` sits inside a repeated part; SPEC-060
    checks `repeat.part` is a child of the root.
  - Accordion gains a `container` root that owns the width records; its goldens gain the container
    node, and the width token moves to it.

- [#1947](https://github.com/adobe/spectrum-design-data/pull/1947) [`b62f6a5`](https://github.com/adobe/spectrum-design-data/commit/b62f6a51d96e8748bf1417e7d7eb945f4f3e4243) Thanks [@GarthDB](https://github.com/GarthDB)! - Draw linear gradients in visual recipes. The avatar and the swatch use it.
  - A new `gradient` value source on a box `fill`: `from` and `to` ends in the box's unit space and
    stops whose colors and offsets bind through relationships, so the `gradient-stop` tokens drive
    it. A scene node carries `gradient`; its `fill` keeps the first stop for solid-only consumers.
  - An option read by an `option` source may hold a CSS `linear-gradient()` (a `deg` angle or a
    `to` side or corner, and `<color> [<percentage>]` stops). The swatch `preview` takes one.
  - SVG and PNG output draw gradients. Images are still not drawn.
  - Avatar: the Gradient image, Initials and Guest styles draw Figma's turquoise gradient (400, 600
    and 800 at the 0, 66 and 100 percent stops, from the top-left to the bottom-right). New
    `Background (gradient stop N)` relationships bind the stop colors.
  - Dataset `requires.cli` is 0.56.0, which reads the new source.

- [#1952](https://github.com/adobe/spectrum-design-data/pull/1952) [`7afe677`](https://github.com/adobe/spectrum-design-data/commit/7afe677da514a49326fdd4e6b124cf61bd29afae) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a nested recipe fill its host, and draw a root border over its children. Layout revision is 3.
  - A `component` part can list `inherit`: `width`, `height` and `cornerRadius` of the host root. A
    width the host does not fix yet (a hugging root) is filled once the other parts are laid out.
  - A root can bind `strokeOver: true`. Its border is then a `ring` node `<root>.border` drawn last,
    and the root node's own `stroke` is unset.
  - Anatomy aliases are no longer valid part names. They document other implementations' names, and
    SPEC-035 warns when a part uses one. `small-divider`, `required-asterisk`, `required-text` and
    `direct-actions` are aliases of `divider`, `necessity-indicator` and `actions`.
  - The accordion draws its divider with the divider recipe. Thumbnail draws its checkerboard with
    the opacity-checkerboard recipe, so its mobile tile is 5px, not 4px, and its border is drawn on
    the container over the checkerboard. Thumbnail gains an empty `image` part.

- [#1946](https://github.com/adobe/spectrum-design-data/pull/1946) [`90fa890`](https://github.com/adobe/spectrum-design-data/commit/90fa8906b5f45d81d4a36c8099575f6257a544a7) Thanks [@GarthDB](https://github.com/GarthDB)! - Tokens now report semantic specificity, so people and agents can pick among tokens.
  - **Specificity:** derived from the name, never stored: tier rank, then the count of purpose fields.
    It orders tokens; it does not say one fits a use.
  - **Neighbors:** same-property tokens that add or drop purpose fields, each `drop-in` (same value
    in every mode) or `consider`. CLI `design-data refinements`, WASM `Dataset.refinements`, MCP
    `design-data-refinements` and agent MCP `token_refinements`.
  - **Results:** WASM `TokenResult` has `purposeFields` and `purposeCount`; MCP query shows
    `purposeFields`; CLI `query` and `resolve` print `Purpose`; MCP query takes `sort: "specificity"`.
  - **Query:** `object`, `anatomy` and `colorRole` are filter keys.
  - **Component tokens:** MCP `design-data-component-tokens` (WASM `componentRelationships`) returns
    what a component uses for each part and state, with values, in one call.
  - **Primer and docs:** `semanticSpecificity` in the primer; taxonomy, query and agent-surface
    chapters and the skill (with a custom-component recipe).

- [#1932](https://github.com/adobe/spectrum-design-data/pull/1932) [`d3e7593`](https://github.com/adobe/spectrum-design-data/commit/d3e7593bc4d72a4440cc070de38378bf23b49bbd) Thanks [@NateBaldwinDesign](https://github.com/NateBaldwinDesign)! - The token tier is now visible to people and tools.
  - **Query:** `tier=<primitive|semantic|component>` is a filter key; spec `query.md` lists it.
  - **Results:** WASM `TokenResult` has `tier` and `tierSource`; the MCP query tool shows `tier`; CLI
    `query` and `resolve` print it.
  - **Primer:** fields list `allowedTokenTiers` and `impliesTokenTier`; `tokenTiers` explains the
    derivation. The MCP primer returns `tokenTiers` and `fieldTiers`.
  - **Docs:** token-format, taxonomy, authoring-workflow and agent-surface chapters and the
    design-data skill describe tiers.

- [#1942](https://github.com/adobe/spectrum-design-data/pull/1942) [`1aee41c`](https://github.com/adobe/spectrum-design-data/commit/1aee41c0238ec008dda5babf746abd1d32db0e68) Thanks [@GarthDB](https://github.com/GarthDB)! - Clean up tag data so a visual recipe can choose between its records. Anatomy is a draft until
  the owner reviews it.
  - Tag declares `size` (s, m, l), `icon`, `isSelected` and `isEmphasized`. `isReadOnly` is removed,
    since Figma and React Spectrum have no read-only tag. Consumers that read it must stop.
  - Background and label/icon color records pin `isSelected`, `isEmphasized` and `isDisabled`, plus
    `state` for hover, down and keyboard focus. Emphasis recolors selected tags only, as in React
    Spectrum.
  - The selected, emphasized label color record binds `transparent-static-white-1000`, the
    replacement for the deprecated `color-white`. "Icon and Clear icon" contexts become "Label and
    icon".
  - Cross icon size records pin `size`.
  - Leading visual size records (`visual-size-50`, `-75`, `-100`) pin `size`.
  - Anatomy replaces `clear-icon` and `cross-icon` with container, avatar, icon, label,
    clear-button and focus-indicator. `clear-button` is a new anatomy term.

### Patch Changes

- [#1948](https://github.com/adobe/spectrum-design-data/pull/1948) [`53e922b`](https://github.com/adobe/spectrum-design-data/commit/53e922b0293f2b5c2be0e66c99e89b62afa6d605) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove the component `tokenBindings` field. Relationships carry that data.
  - **Spec (breaking):** `tokenBindings` is gone from `component.schema.json` and rule SPEC-027
    is retired. A component that still has the field now fails schema validation. Use
    `relationships/<component>.json`; SPEC-055 checks each `$ref`. To migrate, turn each
    `{ token, context }` entry into a relationship with the token's uuid as `$ref`.
  - **Button:** adds `corner-radius-button-small` (12px), `corner-radius-button-large` (20px)
    and `corner-radius-button-extra-large` (24px) for wrapping labels. The 16px wrapping
    relationship is now scoped to size `m`; `s`, `l` and `xl` have their own. The three names
    were referenced but never defined.
  - **Tabs, date picker:** four bindings with no relationship now have one.
  - **Component data:** declares anatomy parts, sizes and states that relationships already
    used (steplist, menu, table, tag-field, card, stack-item, body, heading, detail). List-view
    and radio-button relationships now name their existing parts. Illustrated message uses a
    `script: cjk` option instead of `-cjk` sizes.
  - **Validation:** `design-data:validate` no longer downgrades component-rule errors to warnings.
    Table declares the `xl` size its relationships use.
  - **Agent MCP:** `describe_component` returns `relationships`; docs drop `tokenBindings`.

- [#1932](https://github.com/adobe/spectrum-design-data/pull/1932) [`d3e7593`](https://github.com/adobe/spectrum-design-data/commit/d3e7593bc4d72a4440cc070de38378bf23b49bbd) Thanks [@NateBaldwinDesign](https://github.com/NateBaldwinDesign)! - Fields can now declare which token tiers they apply to.
  - **field.schema.json**: adds optional `allowedTokenTiers` (primitive, semantic, component).
  - **fields/scaleIndex.json**: limits `scaleIndex` to primitive and semantic tokens.
  - **token.schema.json**: adds optional `tokenTier`, an override of the derived tier.
  - **field.schema.json**: adds `impliesTokenTier`, which drives the derived tier.
  - **SPEC-102** warns when a field is used on a tier it excludes; **SPEC-103** reports overrides.
  - **spec/taxonomy.md**: defines the tiers and the derivation; foundation is a group, not a tier.
  - **conformance/manifest-extensions**: rejects an empty list and an unknown tier.

- [#1949](https://github.com/adobe/spectrum-design-data/pull/1949) [`9c4acb1`](https://github.com/adobe/spectrum-design-data/commit/9c4acb1572a5d75ee85f713976b4c55dedd9a758) Thanks [@GarthDB](https://github.com/GarthDB)! - Give the color relationships of text field, number field, text area, search field, combo box
  and picker a state, matching the Figma Web POC (Medium, Field stroke).
  - **Border:** default `gray-300`, hover `gray-400`, focus + hover `gray-900`, focus (not hover)
    `gray-800`. These were five grays with no state.
  - **Contexts:** `gray-25` is now `Background` (role `background`) and the grays are `Border`
    (role `border`), not `Background and border` with both roles.
  - **Error:** the `negative-border-color-*` records get hover, focus + hover, focus and
    keyboard-focus.
  - **Disabled:** new `disabled-border-color` record where missing, pinned to `isDisabled` and not
    `isError` (search field has no `isError`, so its record stays pinned to `isDisabled`).
  - **Differences:** combo box uses its own state names; picker only gets states on its error
    records (its Field has no border in Figma except on error); number field's keyboard-focus
    error record stays without a state.

  No existing `uuid` or `$ref` changes, and none of these components has a visual recipe.

## 0.30.0

### Minor Changes

- [#1931](https://github.com/adobe/spectrum-design-data/pull/1931) [`3d38baa`](https://github.com/adobe/spectrum-design-data/commit/3d38baa1177069600f2f3aa4810857dde98dc7d0) Thanks [@GarthDB](https://github.com/GarthDB)! - Add an in-field progress circle visual recipe. It draws one fixed arc frame, since the component
  has no determinate form.
  - Renders size (s, m, l, xl) and the white and black static colors, all bound through
    relationships. Anatomy (track, fill) is reviewed.
  - Static color records now pin `scope.options.staticColor` instead of naming the color in the
    context, and bind the `transparent-static-*` replacements for the deprecated
    `transparent-white` and `transparent-black` tokens. Their alpha moves to 0.16 and 0.96.
  - Sizes follow Figma S2 Web: 16, 18, 20 and 22 px on desktop (m, l and xl were 20, 22 and 26).
    Mobile m, l and xl become 23, 25 and 28 px (desktop x 1.25); mobile s stays 18 px.
  - Thickness uses `progress-circle-thickness-small` (2 px desktop, 3 px mobile) at every size, as
    Figma and React Spectrum draw it. The "S1 Thickness" medium and large records are removed.

- [#1933](https://github.com/adobe/spectrum-design-data/pull/1933) [`61399b3`](https://github.com/adobe/spectrum-design-data/commit/61399b3fa6f9c57e57db3f9cdc848cf2f01ef3e3) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the opacity-checkerboard visual recipe, with the renderer features it needs.
  - New box props `patternFill` and `patternSize`: a box draws a checkerboard of squares of
    `patternSize` in its `fill` and `patternFill`, `fill` at the top-left, clipped to its corners.
    SVG uses a `<pattern>`, PNG draws the squares. Scene nodes carry a `pattern` field.
  - New value source `{"dimension": "<name>"}`: a size in pixels the request carries in a numeric
    option, for an extent no token holds. An invalid value is dropped with a diagnostic.
  - Relationship-owned alias tokens (a `$ref` and no `context`) now resolve, so a relationship
    can bind the checkerboard colors, which alias palette tokens.
  - opacity-checkerboard declares a `size` option (`s`, `m`, default `m`) that its square size
    relationships already pinned, and defaults for `verticalSize` (16) and `horizontalSize` (24).
    Anatomy is still draft until reviewed.

- [#1936](https://github.com/adobe/spectrum-design-data/pull/1936) [`67a4cab`](https://github.com/adobe/spectrum-design-data/commit/67a4cabd057de53e36b8ee3c561dbdff9ee2f3b7) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the thumbnail visual recipe.
  - Draws size (all 12 values, desktop and mobile), the opacity checkerboard, the rounded corners,
    the inset border and the disabled look (opacity 0.3). The image is not drawn yet.
  - The 24 Size relationships now pin the `size` option, so each size picks its own token.
  - thumbnail declares `hideImage` and `isDisabled` options and a default `size` of 500.
    Anatomy is still draft until reviewed.

### Patch Changes

- [#1503](https://github.com/adobe/spectrum-design-data/pull/1503) [`0b8924f`](https://github.com/adobe/spectrum-design-data/commit/0b8924f15646d42b4787537648f079eb86d0c9c3) Thanks [@NateBaldwinDesign](https://github.com/NateBaldwinDesign)! - Refine size tokens per the Size semantic tokens RFC (SDS-16264, SDS-16083).
  - **New shared tokens**: 149 added (`banner-*`, `base-*`, `container-*`, `size-*`, `field-width-*`).
  - **Deprecations**: 231 deprecated, 17 with no replacement; 45 computed or platform tokens stay.
  - **Calculated sizing**: 6 replacements are calculated (input height x 4, media width / ratio).
  - **Mobile**: 59 shared tokens get a mobile value (x 1.25, half up); 4 widths keep their S2
    mobile values. 11 component tokens stay active at their S2 sizes: 3 color controls, 7 color
    area, wheel and handle sizes (x 1.25 on mobile), and the thumbnail checkerboard (4px).
  - **Width exceptions**: `illustrated-message-vertical-maximum-width` is 352px,
    `card-minimum-width-large` is 288px, and both dialog minimum widths stay 288px,
    on desktop and mobile.
  - **Divider and tooltip tip**: divider L is 4px desktop, 5px mobile; tooltip tip is 4x8px, 5x10px.
  - **Value changes**: `field-width-*` return at 144/192/240/288px; divider minimum length is 16px.
  - **Relationships**: 499 repointed to shared tokens, 24 duplicates removed.
  - **visuals/accordion.json**: size M preview width uses `field-width-large`.
  - **design-data-wasm**: rebuilt so the embedded dataset has these changes.

  <!-- Copyright 2026 Adobe. All rights reserved. -->

## 0.29.0

### Minor Changes

- [#1925](https://github.com/adobe/spectrum-design-data/pull/1925) [`684870c`](https://github.com/adobe/spectrum-design-data/commit/684870cc26bb38b21fd2a54df2c2bede0c870b30) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the avatar visual recipe and review its anatomy against Figma.
  - Anatomy is `container`, `image`, `initials` and `guest-icon`. `user-image` is removed: it was
    the same part as `image`. `focus-indicator` and the `down` and `keyboard-focus` states are
    removed too: Figma draws only Default and Disabled, and React Spectrum and SWC avatars are not
    focusable.
  - The `image` option value `guest image` is renamed `guest`, and `gradient` is removed (it is the
    backdrop of initials and guest). The values are `user image`, `gradient image`, `initials`
    and `guest`.
  - Size relationships pin the `size` option. New relationships bind the backdrop, the initials and
    guest glyph colors, and the stroke width. The workflow icon set gains `user`, drawn for guest.
  - The renderer picks a palette color for the request's color scheme when a relationship refers to
    a color set directly, and renders at a component's default `size` when the implicit `m` is not
    one of its sizes. SPEC-063 accepts numeric `size` values.

- [#1927](https://github.com/adobe/spectrum-design-data/pull/1927) [`e26c2a5`](https://github.com/adobe/spectrum-design-data/commit/e26c2a5c2689502c2bb598635473076666904ec0) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the link visual recipe, and `textDecoration` so a `text` part can draw an underline.
  - New `text` props: `textDecoration` (`underline` or `none`), `underlineThickness` and
    `underlineOffset`. A scene text node carries `underline: {thickness, offset}`. SVG and PNG draw
    the line under the label in the text color, with the baseline 0.35 x the font size below the
    center of the line box.
  - Link draws primary and secondary, standalone and inline, quiet, and white and black static
    colors, with hover, down and keyboard-focus. A quiet standalone link underlines on hover and
    keyboard focus, as React Spectrum does. Anatomy is reviewed: `text` and `focus-indicator`.
  - New `isStandalone` option (Figma Placement, React Spectrum `isStandalone`). The `icon` part is
    removed: only Figma has it, hidden in every variant.
  - Relationships pin `isStandalone` for font weight, use the `Text` context, and bind the static
    colors to `transparent-static-white-1000` and `transparent-static-black-1000`.

- [#1924](https://github.com/adobe/spectrum-design-data/pull/1924) [`581dcb7`](https://github.com/adobe/spectrum-design-data/commit/581dcb7dde593787893c6a905164f487cececff1) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a progress-circle visual recipe, and a `sweep` prop so a `progress` part draws an arc.
  - New `progress` props: `strokeWidth` (ring thickness, a ninth of the diameter when unbound) and
    `sweep` (share of the ring, 0 to 1, usually a `fraction`). The arc starts at 12 o'clock and runs
    clockwise. No `sweep` still draws the fixed quarter-arc frame, so button spinners are unchanged.
  - Progress circle renders size, value, indeterminate (one fixed frame) and white and black static
    colors, all bound through relationships. Anatomy is reviewed.
  - Removed the `variant` option ("over background"), which is Spectrum 1 only. Added `staticColor`
    (white, black); its static records pin it and the indicator ones now use `content-color`.

- [#1928](https://github.com/adobe/spectrum-design-data/pull/1928) [`c54ad0f`](https://github.com/adobe/spectrum-design-data/commit/c54ad0fcdb3450559eb80c46d5748384fa95485c) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the swatch visual recipe, with the renderer features it needs.
  - New value source `{"option": "<name>"}`: a solid CSS color the request carries in a string option
    (the swatch `preview`). A gradient, an image or an unparseable value draws the unset look with a
    diagnostic; an unset or fully transparent value draws it quietly.
  - New `strokeOpacity` prop on boxes and rings (alpha of the stroke), and `inside` on a ring (drawn
    within the outlined part). SPEC-070 now compares only rings named `focus*`.
  - The workflow icon set gains `slash` and `cancel`.
  - Swatch draws size, square and rectangle, none, partial and full rounding, selected (border and
    inner band), disabled and keyboard focus. Size relationships pin `size`; the selection colors
    became `Border` and `Inner border`; the disabled icon rebinds to the static white replacement.
    Anatomy is proposed and still marked draft until reviewed.

## 0.28.0

### Minor Changes

- [#1917](https://github.com/adobe/spectrum-design-data/pull/1917) [`8a4eaa3`](https://github.com/adobe/spectrum-design-data/commit/8a4eaa3c43eadaeacbed97efb838470c72cd48cf) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a close button visual recipe.
  - Close button renders size, hover, down and keyboard focus, `isDisabled` and the white and black
    static colors. Down, hover and keyboard focus share one fill, as in React Spectrum.
  - Close button anatomy is reviewed (`container`, `icon`, `focus-indicator`).
  - The `iconSize` option is removed: Figma and React Spectrum derive the cross size from `size`.
  - The hover fill relationship now points at gray-200 (was gray-100), as in Figma and React
    Spectrum. Cross size, static color and disabled color relationships are pinned in
    `scope.options`.

- [#1921](https://github.com/adobe/spectrum-design-data/pull/1921) [`323b31e`](https://github.com/adobe/spectrum-design-data/commit/323b31e190b7585a45fafb1bf4cb34610bc1e12d) Thanks [@GarthDB](https://github.com/GarthDB)! - Clean up help text data.
  - The `isDisabled` option no longer says help text cannot be both disabled and negative. Figma and
    React Spectrum draw the combination, and the recipe renders it.
  - Remove the help text `Minimum height` relationships (they pointed at control heights, 24 to
    48px) and the top/bottom edge spacing to text and to icon. Figma sizes help text to its text
    (16 to 22px) with no padding, and the recipe binds none of them.

### Patch Changes

- [#1922](https://github.com/adobe/spectrum-design-data/pull/1922) [`eb0cf53`](https://github.com/adobe/spectrum-design-data/commit/eb0cf536599de9748049b0c30d0843b6b21cb1fd) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the close button static colors to match Figma and React Spectrum. The hover fill uses
  `transparent-white/black-200` (0.14 / 0.12, was the 100 tokens) and the disabled cross uses
  `transparent-white/black-400` (0.21 / 0.22, was an alias of the 100 tokens). The same tokens
  `action-button` and `button` use for static hover and disabled.

## 0.27.0

### Minor Changes

- [#1900](https://github.com/adobe/spectrum-design-data/pull/1900) [`91bd3db`](https://github.com/adobe/spectrum-design-data/commit/91bd3db6028db50eedf16cd0cbf5922ae9018505) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a divider visual recipe and anatomy.
  - Divider declares one part, `line`, added to the anatomy registry.
  - New `staticColor` option (`white`, `black`); unset is the regular gray line.
  - Fill relationships pin `size`, `staticColor` and `orientation` in `scope.options`.
  - The four static fills now point at the non-deprecated `transparent-static-*` tokens, following
    their `replacedBy` links. Alpha changes: white s/m 0.14 to 0.16, white l 0.85 to 0.80, black l
    0.84 to 0.80. Black s/m stays 0.12. No token values change.

- [#1907](https://github.com/adobe/spectrum-design-data/pull/1907) [`004414b`](https://github.com/adobe/spectrum-design-data/commit/004414b89fe24cf5af1bc0b357cc30f0a9764b9f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a help text visual recipe.
  - Help text renders size, the neutral and negative variants, `hideIcon` and `isDisabled`. The alert
    icon shows only for the negative variant and follows the text color, gray when disabled.
  - Help text anatomy is reviewed: `container`, `icon` (was `error-icon`) and `text`.
  - The neutral and negative `content-color` relationships are pinned to `variant`.
  - The workflow icon set gains `alert-triangle`.

- [#1906](https://github.com/adobe/spectrum-design-data/pull/1906) [`08621b7`](https://github.com/adobe/spectrum-design-data/commit/08621b798e778b097d0384b13fa15ce10c25f111) Thanks [@GarthDB](https://github.com/GarthDB)! - Meter and progress-bar draw the gap between header, track and help text from `base-gap-*`.
  - The `Spacing (field label to progress bar)` relationship now points at `base-gap-small`,
    `-medium`, `-large` and `-extra-large` by size (4, 6, 6, 6px), the tokens Figma binds as
    `Base/Gap/*`. It pointed at `spacing-75` (4px at every size).
  - Removed the `labelPosition` option from meter, which Figma does not have. A consumer that
    passes it to meter now gets an unknown option.

- [#1904](https://github.com/adobe/spectrum-design-data/pull/1904) [`0f4550d`](https://github.com/adobe/spectrum-design-data/commit/0f4550df695bd0386595d7df6c8d8ee1427fd343) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a meter visual recipe.
  - Meter renders size, value (with `minValue` and `maxValue`), the four variants, `hideLabel`, help
    text, and white and black static colors. `labelPosition: side` is not drawn yet.
  - Meter anatomy is reviewed and gains a `header` part.
  - New options `staticColor`, `labelPosition`, `minValue` and `maxValue`; `value` loses its 0 to 1
    limit. Variant fill colors and static colors are pinned in relationships (new `Control` context).

- [#1901](https://github.com/adobe/spectrum-design-data/pull/1901) [`5030209`](https://github.com/adobe/spectrum-design-data/commit/5030209fdc50f8161684368b8d0c65f2537e9620) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a progress-bar visual recipe, and recipe support for a fill amount and option text.
  - New value source `fraction` (`value`, `min`, `max` option names) and `relativeTo: "parent"` size a
    nested box as a share of its parent. A text part's new `text` field reads a string option or shows
    the fraction as a percentage.
  - Progress bar renders size, value, indeterminate (one fixed frame), hideLabel, and white and black
    static colors. `labelPosition: side` is not drawn yet.
  - Progress bar anatomy is reviewed and gains a `header` part. The `variant` option (Spectrum 1 only)
    is removed, and `staticColor` gains `black` with its three relationships.

## 0.26.1

### Patch Changes

- [#1896](https://github.com/adobe/spectrum-design-data/pull/1896) [`12ddd7e`](https://github.com/adobe/spectrum-design-data/commit/12ddd7e78e685a853d7a1afb4ba837ab13a9660b) Thanks [@GarthDB](https://github.com/GarthDB)! - Added draft anatomy (`anatomyReview.status: draft`) to the 63 components that had relationships
  but no anatomy. Parts follow the S2 Web Figma file, with relationship contexts, React Spectrum
  and Spectrum Web Components as fallbacks. Shadows, borders and strokes are styling on a part,
  not parts (new line in the anatomy format chapter). Added the `prefix` and `opacity-checkerboard`
  anatomy terms. The required-field indicator is declared only on `field-label`. `tabs` and
  `segmented-control` declare a `keyboard-focus` state, and `segmented-control` a `disabled`
  state. A reviewer still has to confirm each component before a visual recipe depends on it.

- [#1895](https://github.com/adobe/spectrum-design-data/pull/1895) [`42efcfe`](https://github.com/adobe/spectrum-design-data/commit/42efcfe2c90937f421fd9b2f0aa2666505179939) Thanks [@GarthDB](https://github.com/GarthDB)! - Added a visual recipe for `field-label`: a label with an optional required-field indicator,
  bound through the component's relationships. The component now declares `container` and
  `label` anatomy parts, and its indicator part is renamed from `asterisk` to the registered
  `necessity-indicator` (draft anatomy, no known consumers). The asterisk size relationships are
  pinned by `size`, so each size resolves to one token.

- [#1894](https://github.com/adobe/spectrum-design-data/pull/1894) [`640ae79`](https://github.com/adobe/spectrum-design-data/commit/640ae7915659ed8d6977ba7aafd1ee7c20e516c1) Thanks [@GarthDB](https://github.com/GarthDB)! - Read `scope.between` and the descriptive scope fields (`object`, `position`, `structure`,
  `qualifier`, `icon`) wherever a reader looked at `from`, `to`, `object` and the like in
  `scope.options`: legacy token conversion and context suggestions. A record gives the same result
  in either place, and the new place wins when both are set. The tie ratchet and SPEC-100 treat
  records that differ only in those fields as different. The committed data is unchanged.

## 0.26.0

### Minor Changes

- [#1892](https://github.com/adobe/spectrum-design-data/pull/1892) [`7e03e89`](https://github.com/adobe/spectrum-design-data/commit/7e03e8989899c867205be26e7beb74796d2a50fd) Thanks [@GarthDB](https://github.com/GarthDB)! - PNG rendering now falls back to Adobe Clean VF (Roman .ttf) before the bundled Source Sans 3
  when Adobe Clean Spectrum VF is not installed.
  - Adobe Clean Serif VF, Italic and .otf files are never used.
  - `fallback` stays true for any font other than Spectrum VF, and `found` still means
    "Spectrum VF or a font you chose". The status gains `family` and `installed`.
  - The help text names the font used and warns that metrics, spacing and wrapping may differ.
  - `DESIGN_DATA_FONT` and `fontPath` behave as before.

- [#1893](https://github.com/adobe/spectrum-design-data/pull/1893) [`20035e0`](https://github.com/adobe/spectrum-design-data/commit/20035e0e291e73d48509f255c52c0d2daafbceb3) Thanks [@GarthDB](https://github.com/GarthDB)! - Accept `between`, `object`, `position`, `structure`, `qualifier` and `icon` in a relationship
  `scope` (they were refused since the scope gate), and report SPEC-101 for values outside their
  registry vocabulary. A value of the wrong shape is still refused. The committed data uses none, so
  nothing changes today.

### Patch Changes

- [#1881](https://github.com/adobe/spectrum-design-data/pull/1881) [`fd1c1c3`](https://github.com/adobe/spectrum-design-data/commit/fd1c1c3662fefbf6d6f0a84c010d707c8db2f4ba) Thanks [@GarthDB](https://github.com/GarthDB)! - `dataset.json` can declare `requires.cli`, the oldest design-data CLI that can read the dataset
  correctly, as an exact version (not a range; a dataset says what it needs, not what future CLIs
  will do). This dataset declares `0.40.0`: CLI 0.37.0 refuses its `anyOf` state pins ("the data
  is newer than this engine") and 0.40.0 reads them.

  `dataset.schema.json` and `spec/dataset-layout.md` gain the field. A CLI older than
  `requires.cli`, or older than a declared `layoutRevision`, now exits with an error instead of
  reading the data wrongly; `--ignore-data-requirements` reads it anyway and warns on every run
  (command line only, never a config file). Datasets released before this one have no `requires`
  and are not checked. CI renders a smoke set with the released minimum CLI and the current one
  and fails if the scenes differ.

## 0.25.0

### Minor Changes

- [#1865](https://github.com/adobe/spectrum-design-data/pull/1865) [`1b01d40`](https://github.com/adobe/spectrum-design-data/commit/1b01d40baf3edafef26ca9e3a2d96c288e86cf31) Thanks [@GarthDB](https://github.com/GarthDB)! - SVG label text now uses the font stack `'Adobe Clean Spectrum VF', adobe-clean-spectrum-vf,
'Adobe Clean', 'Source Sans 3', sans-serif`. Browsers match family names exactly, so the old
  lead name `adobe-clean-spectrum-vf` missed an installed Adobe Clean Spectrum VF and the label
  fell to the generic sans-serif, about 18 % wider: "Save changes" (700, 16 px) measured
  106.73 px against about 90 px and overran the button's right padding.

  `renderComponentSvg(request, fonts?)` takes the same font list as `renderComponentPng` and
  sizes the layout with the first non-fallback font. `design-data-render` passes the installed
  Adobe Clean Spectrum VF when it finds one, so SVG boxes fit the text a viewer with that font
  draws. Without it the Source Sans 3 table is used, as before.

## 0.24.0

### Minor Changes

- [#1857](https://github.com/adobe/spectrum-design-data/pull/1857) [`2a1e521`](https://github.com/adobe/spectrum-design-data/commit/2a1e521b6f62f5e65f5b3db15379a7888c929392) Thanks [@GarthDB](https://github.com/GarthDB)! - Report the new rule SPEC-100 (relationship records that differ only in one option's value)
  when validating.

- [#1848](https://github.com/adobe/spectrum-design-data/pull/1848) [`da44b61`](https://github.com/adobe/spectrum-design-data/commit/da44b61596c59dfdd3434fca196e7f48f3ff95b1) Thanks [@GarthDB](https://github.com/GarthDB)! - Report the any-of rules SPEC-094 to SPEC-099 when validating (proposal 017). No data uses an
  any-of yet, so existing data reports nothing new.

- [#1847](https://github.com/adobe/spectrum-design-data/pull/1847) [`d12b8bc`](https://github.com/adobe/spectrum-design-data/commit/d12b8bce115b3c2f494de0b9d3739191b4ed8287) Thanks [@GarthDB](https://github.com/GarthDB)! - Understand any-of in relationship scopes (proposal 017). The solver expands `scope.options.anyOf`
  and `{ "anyOf": [...] }` state elements into one candidate per alternative when a recipe is
  compiled, so a record can apply to "selected or indeterminate" without duplicates. The compiled
  recipe format is unchanged. No data uses an any-of yet.

- [#1863](https://github.com/adobe/spectrum-design-data/pull/1863) [`8d25409`](https://github.com/adobe/spectrum-design-data/commit/8d2540928d4618fe4340b570a33eb4f8f22cb680) Thanks [@GarthDB](https://github.com/GarthDB)! - Refuse a relationship record whose `scope` has a field the engine does not know. The error names
  the file, the record and the field and says the data is newer than the engine. The committed data
  has none, so nothing changes today.

- [#1856](https://github.com/adobe/spectrum-design-data/pull/1856) [`7a5a511`](https://github.com/adobe/spectrum-design-data/commit/7a5a51166a61074fd9435d415f1f7ee2248fcb2e) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-093 reports an error instead of a warning, so a relationship `context` that names an option
  value fails validation.

### Patch Changes

- [#1855](https://github.com/adobe/spectrum-design-data/pull/1855) [`d3d8bc5`](https://github.com/adobe/spectrum-design-data/commit/d3d8bc5bcc7fcace8aa410c7d563a3ca6fcae780) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-093 now reads a `size` value in its spelled form: `m` matches `medium` and `xl` matches
  `extra large`, so a context such as `Height (medium)` is reported.

## 0.23.0

### Minor Changes

- [#1846](https://github.com/adobe/spectrum-design-data/pull/1846) [`254adf1`](https://github.com/adobe/spectrum-design-data/commit/254adf11b565f4768a69340a5ccadc1e72303dbe) Thanks [@GarthDB](https://github.com/GarthDB)! - Refuse a relationship whose `scope.options` holds a value shape the engine does not understand,
  when a platform manifest adds or overrides a relationship (`applyPlatform`). The error names the
  record and says the data is newer than the engine. Every shape in use today is still accepted.

  The embedded relationship data goes through the same check when the engine loads it, so a build
  that embeds data newer than its own code fails at startup instead of rendering wrong output.

## 0.22.0

### Minor Changes

- [#1793](https://github.com/adobe/spectrum-design-data/pull/1793) [`87c45e3`](https://github.com/adobe/spectrum-design-data/commit/87c45e3f76bcac529106629619d923544ca9d1e5) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove the `status-light` "Height", "Spacing (top/bottom edge to label)" and
  "Spacing (top edge to dot)" relationships (20 records). They described a 32px
  control container with 7px of block padding, carried over from the deprecated
  `status-light-top-to-dot-*` tokens. Both the official S2 - Web Figma file and
  React Spectrum S2 render Status light as one text line (18px at M) with no
  minimum height or block padding. A recipe should size it from the label line
  height and place the dot by centring on the first line.

## 0.21.2

### Patch Changes

- [#1816](https://github.com/adobe/spectrum-design-data/pull/1816) [`8b06028`](https://github.com/adobe/spectrum-design-data/commit/8b06028b7d5cf01ec1d2bf824a8d8f06b0d954e8) Thanks [@GarthDB](https://github.com/GarthDB)! - Mark the action-button and badge content icon as optional, so the component explorer
  offers a "None" icon choice. Figma and React Spectrum S2 let both omit the icon.

## 0.21.1

### Patch Changes

- [#1804](https://github.com/adobe/spectrum-design-data/pull/1804) [`039914f`](https://github.com/adobe/spectrum-design-data/commit/039914f80477d12846434c8024daa6defcf2b3e8) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `layoutRevision` to `dataset.json` and publish `dataset.json` with the data package. The
  renderer has its own layout revision and the CLI warns when it differs from the data's, so a
  CLI newer than the data (the #1799 case) is reported instead of silently rendering differently.

- [#1796](https://github.com/adobe/spectrum-design-data/pull/1796) [`331dc43`](https://github.com/adobe/spectrum-design-data/commit/331dc43983087cfd807dd364240b234fc4ef0dab) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `repeat` to visual recipes: a recipe can draw its root once per entry of an
  array option, stacked in a column. The accordion recipe repeats its item over
  `items`, so a render can show several items with their own titles and open state
  (`isExpanded`, `hasSwitch`, `hasActionButton`). A request without `items` renders
  exactly as before.

- [#1795](https://github.com/adobe/spectrum-design-data/pull/1795) [`0e290c0`](https://github.com/adobe/spectrum-design-data/commit/0e290c08a5542f0bf107d76c1e4a4e1d34284ba1) Thanks [@GarthDB](https://github.com/GarthDB)! - `design-data-render` takes an `icon` field to replace a content icon: `{ "set": "workflow",
"name": "edit" }`, or `"none"`. It now reports a diagnostic when `options.icon` is passed,
  because that option is not drawn. Fixes #1794.

- [#1805](https://github.com/adobe/spectrum-design-data/pull/1805) [`0276017`](https://github.com/adobe/spectrum-design-data/commit/027601793b6ea70dc113669d3037b0797761930f) Thanks [@GarthDB](https://github.com/GarthDB)! - A row recipe that binds no `minHeight` and no block padding now hugs its content instead of
  being 32px high (layout revision 2). A row with no flowed children is now 0 high, not 32.
  Recipes outside this repository that relied on the 32 must bind `minHeight` or block padding.
  No shipped recipe changes: the render snapshots and the iOS recipes are identical. Fixes #1800.

- [#1807](https://github.com/adobe/spectrum-design-data/pull/1807) [`5b20b30`](https://github.com/adobe/spectrum-design-data/commit/5b20b303e2eb2a24942f208bdc405beb99bd4a45) Thanks [@GarthDB](https://github.com/GarthDB)! - Declare the `selected` state of `select-box`, `stack-item` and `tree-view` with
  `trigger: "prop"`, as the state model and RFC-A require for a state driven by
  `isSelected`. It was `interaction`. The compound `selected-*` states keep their
  `interaction` trigger.

## 0.21.0

### Minor Changes

- [#1780](https://github.com/adobe/spectrum-design-data/pull/1780) [`bc6caa2`](https://github.com/adobe/spectrum-design-data/commit/bc6caa297e546eb5b26b0613d0d5e50a9f52b83e) Thanks [@GarthDB](https://github.com/GarthDB)! - Render components to PNG, and pick the text font from descriptors.
  - **`Dataset.renderComponentPng(request, fonts, options)`**: returns `{ png, diagnostics }`.
    A font not marked `fallback` also sets the layout text widths, so boxes fit their text.
    `options` takes `pixelRatio` and `background`.
  - **`describeFont` and `chooseFont`**: WebAssembly cannot read the disk, so a caller reads each
    font's `name` table, describes it, and lets `chooseFont` pick Adobe Clean Spectrum VF with
    the same rules and wording as the `design-data` CLI.
  - The slim `@adobe/design-data-wasm-visual` build is unchanged and has no rasterizer.

### Patch Changes

- [#1781](https://github.com/adobe/spectrum-design-data/pull/1781) [`2f7023f`](https://github.com/adobe/spectrum-design-data/commit/2f7023f33fcd2e3ddcbac8c5e443a26142f5c0d8) Thanks [@GarthDB](https://github.com/GarthDB)! - Center a row's content in the visual renderer when `minWidth` or `width`
  leaves free space, so a button with no icon no longer pushes its label left.

## 0.20.0

### Minor Changes

- [#1775](https://github.com/adobe/spectrum-design-data/pull/1775) [`36b9c3d`](https://github.com/adobe/spectrum-design-data/commit/36b9c3d00a761a27cd9b50ad60da11b31a3de895) Thanks [@GarthDB](https://github.com/GarthDB)! - Add visual recipes to the embedded data and render them to SVG.
  - MCP: new `design-data-visual-recipe` and `design-data-render` tools.
  - WASM: `Dataset.embedded()` now carries recipes. New `visualRecipes()`,
    `visualRecipe(name)` and `renderComponentSvg(request)`.
  - `@adobe/spectrum-design-data` publishes `visuals/` and exports `./visuals/*`.

### Patch Changes

- [#1774](https://github.com/adobe/spectrum-design-data/pull/1774) [`d5a64c4`](https://github.com/adobe/spectrum-design-data/commit/d5a64c4c59c03a38f89e70f0cb11b959d4c84d84) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `status-light` dot relationships for the `gray`, `red`, `orange`, `green`
  and `blue` colors and the `accent` role (3 records each: light, dark, wireframe),
  pointing at the existing `*-visual-color` tokens. Add `accent` and `blue` to the
  component's `variant` options. The set now matches the official S2 - Web Figma
  file's status light.

## 0.19.3

### Patch Changes

- [#1770](https://github.com/adobe/spectrum-design-data/pull/1770) [`e3479b3`](https://github.com/adobe/spectrum-design-data/commit/e3479b3ea0c5855942b51e88e44b748045acae8d) Thanks [@GarthDB](https://github.com/GarthDB)! - Backfill the structured context fields on 4,187 existing relationship records
  that had a `context` string and no fields.
  - `contextRole` (registry term ids) is derived from the main word, through the
    registry labels and aliases. Text in the trailing parenthesis becomes
    `contextPart` when it is a declared anatomy part of the record's component or a
    registry anatomy term (103 records), otherwise `contextQualifier` (1,818).
  - No `context` string changes; it stays the identity key for recipes and the
    changelog. SPEC-090 is clean for every backfilled record.
  - 197 records are skipped: 76 main words not in the registry, 95 strings that
    would not agree with the derived label, and 26 with unusual parentheses.

- [#1766](https://github.com/adobe/spectrum-design-data/pull/1766) [`ea86c6d`](https://github.com/adobe/spectrum-design-data/commit/ea86c6d75726d6d9b1ba24c209328a4d386cc274) Thanks [@GarthDB](https://github.com/GarthDB)! - Add relationship contexts and structured context fields to 29 records in
  `stack-item`, `card`, `floating-action-button`, `color-handle`, `popover`,
  `avatar`, `color-loupe`, `contextual-help`, `meter` and `picker` that had none.
  - Each context reuses a string already on the component or used by a sibling
    component for the same relationship: `Border`, `Body`, `Title`, `Drop shadow`,
    `Background (selected, emphasized)`, and `Width (default)` for plain widths.
  - No existing context string is changed.
  - Lowers the SPEC-092 baseline for these components.

- [#1768](https://github.com/adobe/spectrum-design-data/pull/1768) [`f316446`](https://github.com/adobe/spectrum-design-data/commit/f31644653d65c700a5c603472656ec1e18d49633) Thanks [@GarthDB](https://github.com/GarthDB)! - Add relationship contexts and structured context fields to the 20 records in
  `bar-panel`, `standard-panel`, `in-field-button` and `form-item` that had none.
  - Panels: `Gripper` and `Gripper (drag)`, `Width (default)`, `Width (minimum)`,
    `Width (maximum)`, and `Title` for the standard-panel title font size.
  - `in-field-button`: `Width (stacked)` and `Rounding (stacked, inner)`.
  - `form-item` gap: `Spacing (label to field, field to help text)`.
  - No existing context string is changed.
  - Lowers the SPEC-092 baseline for these components.

- [#1772](https://github.com/adobe/spectrum-design-data/pull/1772) [`6bf292d`](https://github.com/adobe/spectrum-design-data/commit/6bf292db462f14344b6112f027dfc56cd886fa11) Thanks [@GarthDB](https://github.com/GarthDB)! - Align selected-row context wording with the highlight selection model, and fix a
  copy-pasted avatar string. Renames 17 existing relationship context strings and
  their structured fields; no recipe binds any of them.
  - `tree-view` and `stack-item`: `Background (selected, emphasized)` becomes
    `Background (selected, highlight)`. List view, Tree view and Table dropped the
    emphasized option for checkbox or highlight selection.
  - `tree-view`: the three `… (selected + highlight)` strings (two backgrounds and a
    border) become `… (selected, highlight)`, the same wording as the rest.
  - `table`: `Background (selected row, non-emphasized)` and its hover variant
    become `… (selected row, checkbox selection)`, the neutral selected fill.
  - `avatar`: `Text (List view item)` becomes `Text (initials)` on the six font
    records, which style the initials.
  - `action-button` `Background (selected, emphasized)` is unchanged.

- [#1764](https://github.com/adobe/spectrum-design-data/pull/1764) [`4bb0225`](https://github.com/adobe/spectrum-design-data/commit/4bb022593f50ce0834ffe7116aa5b5721cefb00e) Thanks [@GarthDB](https://github.com/GarthDB)! - The renderer now reports a diagnostic when a `relationship` or `token` selector
  still matches more than one token after narrowing by mode and options, naming
  the part, the selector and the candidate count. A candidate with fewer name
  fields still wins the tie-break silently, as before. The render uses the first
  candidate; previously a true tie was silent. No foundation or platform recipe
  is affected.

- [#1763](https://github.com/adobe/spectrum-design-data/pull/1763) [`d1123a1`](https://github.com/adobe/spectrum-design-data/commit/d1123a17afa74644b4fab739e70d55077d1cd40f) Thanks [@GarthDB](https://github.com/GarthDB)! - Pin `scope.options.variant` on the 57 `status-light` "Semantic (Dot)" and
  "Non-semantic (Dot)" relationships, taken from each referenced token's
  `colorRole` or `colorFamily`. A `variant` selector now resolves to one token
  instead of one per colour family. The `gray`, `red`, `orange` and `green`
  options still have no dot token.

## 0.19.2

### Patch Changes

- [#1731](https://github.com/adobe/spectrum-design-data/pull/1731) [`5613216`](https://github.com/adobe/spectrum-design-data/commit/561321665edf27babb14064aa344de2188afa26f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add relationship contexts and structured context fields to the 24 `table`
  records that had none, and rename three existing ones.
  - 15 row heights reuse `Row height (minimum, <density> density)`; a record with
    no `density` option is regular. 6 section-header heights reuse
    `Section header row height`.
  - The 3 existing `S1 Selected row background (highlight selection)` records
    (accent tint, 0.1 and 0.15 opacity) drop the `S1 ` prefix and become
    `Background (selected row, highlight selection)` and its hover variant.
  - The 3 non-emphasized selected-row backgrounds (neutral color) are a different
    relationship and get `Background (selected row, non-emphasized)` and its hover
    variant.
  - Lowers the `table` SPEC-091 and SPEC-092 baselines.

## 0.19.1

### Patch Changes

- [#1729](https://github.com/adobe/spectrum-design-data/pull/1729) [`0c00c78`](https://github.com/adobe/spectrum-design-data/commit/0c00c782a89e4491136cdb72ae440d2d518058ae) Thanks [@GarthDB](https://github.com/GarthDB)! - Add relationship contexts and structured context fields to 26 records in
  `tabs`, `list-view`, `segmented-control` and `tree-view` that had none.
  - Each new context reuses an existing string where the record is the same
    relationship at another size or option; `tabs` text uses `Label`.
  - Two existing `tabs` contexts are renamed: `Regular density` becomes `Height`
    (regular is the default, so it carries no density) and `Height`, which sits on
    the compact-density record, becomes `Height (compact density)`. No recipe
    binds either string.
  - Lowers the SPEC-091 and SPEC-092 baselines for these components.

## 0.19.0

### Minor Changes

- [#1727](https://github.com/adobe/spectrum-design-data/pull/1727) [`43850b0`](https://github.com/adobe/spectrum-design-data/commit/43850b0c1cdd7eef736289cd6f3febc73afe4cb8) Thanks [@GarthDB](https://github.com/GarthDB)! - Make component filtering and token resolution usable.
  - `query` (`component=button`) now matches tokens that a component's relationships
    reference, not only the few tokens with `name.component`. `component` is listed
    as an indexed field.
  - `resolve` (wasm, CLI and TUI property resolution) picks the winner among active
    tokens first, so an active token now beats a more specific deprecated one. A
    deprecated token still wins when no active token matches.
  - `design-data-resolve` accepts `component`, `variant`, `state`, `colorRole` and
    `excludeDeprecated` to narrow before the ambiguous fallback.
  - `design-data-primer` reports the real `modeSets` (colorScheme, scale, contrast
    modes); they were always empty.
  - `design-data-query` and `design-data-resolve` descriptions list only filterable
    fields and drop the `property=color-*` example, which matches nothing.

- [#1720](https://github.com/adobe/spectrum-design-data/pull/1720) [`d4b0bc3`](https://github.com/adobe/spectrum-design-data/commit/d4b0bc38e51641a48cfac06328a73a9d18934b47) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a relationship-context vocabulary and optional structured context fields.
  - New registry `registry/relationship-contexts.json`: 23 main words with aliases
    for today's head words.
  - `relationship.schema.json` gains optional `contextRole` (registry term ids),
    `contextPart` and `contextQualifier`. The `context` string stays the identity
    key that recipes bind on.
  - `relationship-format.md` states that a recipe binds on `context`, the string
    grammar, and when a live record may omit it.
  - New warning rules: SPEC-090 (fields agree with the string), SPEC-091 (main
    word is registered) and SPEC-092 (live record with no context that no
    contexted record reaches). SPEC-091 and SPEC-092 are held at a baseline in
    `recipe-lint-baseline.json`.

### Patch Changes

- [#1721](https://github.com/adobe/spectrum-design-data/pull/1721) [`6136cd7`](https://github.com/adobe/spectrum-design-data/commit/6136cd760b966dc72b64d8284fcb0172a17aa3f9) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove two options that exist only in Spectrum 1, not in any current design or code source.
  - `badge`: removed the `fixed` option (none/top/right/bottom/left) and the eight recipe
    branches that squared corners per edge. Badges always render with full corner rounding.
  - `action-button`: removed the `selectedTextColor` option, which the recipe never used.

- [#1722](https://github.com/adobe/spectrum-design-data/pull/1722) [`7515f70`](https://github.com/adobe/spectrum-design-data/commit/7515f705b68e050efce9a88ae6fa811540a99c29) Thanks [@GarthDB](https://github.com/GarthDB)! - Normalize relationship context strings: trim stray whitespace and merge case
  variants of the same string (52 strings, 210 relationship records, 1 component
  tokenBinding). One string had an embedded paragraph break collapsed to a single
  space. Nothing is renamed beyond case and whitespace; recipes and render
  snapshots are unchanged.

- [#1719](https://github.com/adobe/spectrum-design-data/pull/1719) [`e0df9f5`](https://github.com/adobe/spectrum-design-data/commit/e0df9f51102037f1d0799bf8083de923e00795cd) Thanks [@GarthDB](https://github.com/GarthDB)! - Set `lifecycle.replacedBy` on the deprecated `workflow-icon-size-*` tokens.

  Replacements go by t-shirt position:
  - 50 → `workflow-icon-extra-small`
  - 75 → `workflow-icon-small`
  - 100 → `workflow-icon-medium`
  - 200 → `workflow-icon-large`
  - 300 → `workflow-icon-extra-large`

  Relationships that bound the old tokens now point at the replacements.
  Desktop medium, large and extra-large sizes shrink on purpose
  (20/22/26 → 18/20/22px) to align icons with line height.
  This is a visible change for consumers of the new tokens,
  and the deprecation comments say so.
  Mobile values and sizes 50 and 75 are unchanged.
  The legacy `layout.json` gains `renamed` and `deprecated_comment`.

## 0.18.1

### Patch Changes

- [#1704](https://github.com/adobe/spectrum-design-data/pull/1704) [`f7cf8f0`](https://github.com/adobe/spectrum-design-data/commit/f7cf8f02df71ee69d116cbd1b929305ea5eb03c7) Thanks [@GarthDB](https://github.com/GarthDB)! - Button: the `variant` default is now `primary`, matching Figma, React Spectrum S2
  and SWC Gen2 (it was `accent`). The visual recipe binds
  "Minimum height" as `minHeight`, the label sets `overflow: wrap`, and the root
  `minWidth` reads the `minimum-width-multiplier` token (2.25 times the height) when
  a label shows. The `focus` state is renamed `keyboard-focus`, as in the other recipes and in the
  relationship scopes, and the focus fill now takes the hover look (the key-focus
  tokens for accent, negative and primary, gray-200 for secondary), as React
  Spectrum S2 and SWC Gen2 do.
  The renderer reads `relativeTo: "height"` on a root `minWidth`.

- [#1709](https://github.com/adobe/spectrum-design-data/pull/1709) [`dcc5be9`](https://github.com/adobe/spectrum-design-data/commit/dcc5be988f302a727233ec45c88c0bca16e899ed) Thanks [@GarthDB](https://github.com/GarthDB)! - The renderer resolves combined states per property by the state model instead of
  by token key order. Among candidates whose states are all active, the one
  matching more states wins, then the one with the higher interaction precedence
  (hover 50, keyboard-focus 60, down 70, or what the component declares), then
  the earlier one. `disabled` suppresses interaction states, and `active`,
  `pressed` and `focus-visible` normalize to `down` and `keyboard-focus`. Compiled
  candidates now carry a `precedence` list. Older compiled data has none, so it
  does not drop interaction candidates under `disabled`, and it now prefers the
  candidate matching more states before source order.

- [#1708](https://github.com/adobe/spectrum-design-data/pull/1708) [`2e6bc57`](https://github.com/adobe/spectrum-design-data/commit/2e6bc5767d35ad32418b800f98b2162733eda879) Thanks [@GarthDB](https://github.com/GarthDB)! - State model: combined interaction states now resolve per property, with
  `keyboard-focus` as a non-layered state between `hover` (50) and `down` (70), so
  pressed beats focus beats hover. `prop` states pick the token set and a token
  that matches more active states wins before precedence is compared.
  `layered` is deprecated: schemas still accept it and resolvers ignore it. The
  state registry now carries default precedence (hover 50, focus and
  keyboard-focus 60, down and active 70), so components declare precedence only
  to deviate. The renderer does not read precedence yet (follow-up work).

  Button no longer declares explicit precedence or `layered`; it uses the registry defaults.

## 0.18.0

### Minor Changes

- [#1700](https://github.com/adobe/spectrum-design-data/pull/1700) [`2a6ccd3`](https://github.com/adobe/spectrum-design-data/commit/2a6ccd3796290fa0e4de081072d8d28556524ce7) Thanks [@GarthDB](https://github.com/GarthDB)! - `renderScene` and `renderSvg` accept an optional `width` (px) in the request:
  the demo width of the root. It overrides the recipe's root `width` and never
  goes below its `minWidth`.

### Patch Changes

- [#1703](https://github.com/adobe/spectrum-design-data/pull/1703) [`5f38c0a`](https://github.com/adobe/spectrum-design-data/commit/5f38c0a00507a59c5c575dfd8efedf9ca9d92251) Thanks [@GarthDB](https://github.com/GarthDB)! - `renderScene` and `renderSvg` draw a recipe's `component` parts (a nested action
  button and switch in the accordion item), with namespaced scene parts such as
  `action-button.icon`. Renders of recipes without `component` parts are unchanged.

- [#1701](https://github.com/adobe/spectrum-design-data/pull/1701) [`6ee52bc`](https://github.com/adobe/spectrum-design-data/commit/6ee52bc9f0e03eca4bbb063a175171b6f4e886a1) Thanks [@GarthDB](https://github.com/GarthDB)! - `renderScene` and `renderSvg` wrap a text part that sets `overflow` when the
  request has a `width`: the scene has one text node per line and the root grows to
  fit. Renders of recipes without `overflow` are unchanged.

## 0.17.0

### Minor Changes

- [#1685](https://github.com/adobe/spectrum-design-data/pull/1685) [`2218913`](https://github.com/adobe/spectrum-design-data/commit/2218913b576cb2e60cb9a7a672613a3b4a077eea) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual renderer measures label text with a font table instead of a flat 0.46 em per character.

  The default table is Source Sans 3 (SIL OFL): glyph advances and pair kerning at weights 400
  and 700, with 500 and 600 interpolated. Labels are about 4 to 6.6% wider than React Spectrum S2
  at weight 700 (S2 uses Adobe Clean, a different font); container widths follow, heights do not
  change. Characters outside ASCII measure 0.46 em. `Dataset.renderScene`, `renderSvg` and
  `renderScene` in the site runtime accept a `textMetrics` table in the request to replace the
  default; a malformed table throws an error that names the problem.

  The site runtime's `renderScene` now throws `text metrics not loaded` unless `setTextMetrics` was
  called or the request has `textMetrics`. Callers of `visual-runtime.js` outside this repository
  must load the table first (the site ships it as `text-metrics.json`).

## 0.16.0

### Minor Changes

- [#1678](https://github.com/adobe/spectrum-design-data/pull/1678) [`c223628`](https://github.com/adobe/spectrum-design-data/commit/c2236288e5cfa47bfe9f4099abb24d03f7c10acf) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-088 (relationship-duplicate-record), a warning for exact duplicate relationship records.

  Two records in the same file with equal scope, context and `$ref` or value are reported, so
  `Dataset.validate()` in the WASM package can now return it. Spec sheets also resolve a `$ref`
  that names a mode-set group (`setUuid`), showing one value per member scale instead of
  skipping the record.

## 0.15.0

### Minor Changes

- [#1667](https://github.com/adobe/spectrum-design-data/pull/1667) [`160dcb0`](https://github.com/adobe/spectrum-design-data/commit/160dcb099128afc1574ec9c7fdab5df28526eb53) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe icon parts reference icons from the `icons/` catalog instead of the `glyph` enum.
  - **spec**: `"icon": {"set": "ui" | "workflow", "name": "<id>"}` is required on every `icon` part,
    and `glyph` is removed from the draft recipe schema with no alias. `content` and `optional` mark
    an icon a render request may replace or remove. `component-visuals.md` adds an Icons section that
    defines how a drawing is chosen from the size token (`scaleIndex`, else `size` key, else
    `sizeScale`, nearest scale on a miss). New rules: SPEC-085 (error, the icon exists) and SPEC-086
    (warning, a UI icon has a drawing at its scale). `icons/` joins the dataset discovery list.
  - **design-data**: accordion and checkbox reference `ui` chevron, checkmark and dash. Button,
    badge and action-button icons default to `workflow:add`, and the action-button hold icon is
    `ui:corner-triangle`.
  - **wasm**: scene icon nodes carry `icon` (`set`, `name`) instead of `glyph`. Drawings are
    unchanged.

- [#1669](https://github.com/adobe/spectrum-design-data/pull/1669) [`33a5908`](https://github.com/adobe/spectrum-design-data/commit/33a59089334aacd04e73bebf9c088bd743aa2b93) Thanks [@GarthDB](https://github.com/GarthDB)! - `renderScene` and `renderSvg` accept `request.icon`, next to `label`.
  - `{ set, name }` replaces the icon of every recipe part marked `content: true`.
  - `"none"` removes it where the part is also `optional: true` (a label-only Button).
  - `"none"` on a required icon keeps the recipe's icon and adds a diagnostic.
  - An icon missing from the catalog draws the placeholder with a diagnostic.

  The visual runtime's `renderScene(compiled, req, icons)` takes the drawings it can draw for
  `req.icon` as a third argument.

- [#1668](https://github.com/adobe/spectrum-design-data/pull/1668) [`4887473`](https://github.com/adobe/spectrum-design-data/commit/4887473689907243213225da695cc7944f9f0dfc) Thanks [@GarthDB](https://github.com/GarthDB)! - Renderers draw the real Spectrum 2 icon paths from the `icons/` catalog.
  - **wasm**: `renderScene`/`renderSvg` draw each icon part's catalog drawing, fitted to the part
    box, rotated about its center and filled with the part colour. Scene icon nodes carry
    `icon.drawing` (`viewBox`, `paths`). An icon with no drawing draws a placeholder plus and adds
    a diagnostic. Buttons, badges and action buttons now show `workflow:add`, the hold icon the
    corner triangle, and the accordion chevron and checkbox marks the S2 UI paths.
  - **spec**: the drawing is chosen once per size and mode, a non-square part box leaves the icon
    at its smaller side, and a missing drawing must draw a placeholder with a diagnostic.
  - **design-data**: the checkbox dash part box is the icon size (8/10/10/12, like the
    checkmark) instead of the bar size, so the S2 dash drawing fits it.

- [#1673](https://github.com/adobe/spectrum-design-data/pull/1673) [`dd30d97`](https://github.com/adobe/spectrum-design-data/commit/dd30d97159cb02c9efe6cdd916c2faf5795fb9c1) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can declare a relationship context as derived instead of bound.

  The recipe schema gains a `derived` array (`context`, `property`, `part`, optional `edge`, and
  `from`). The only formula is `(height - <part>.lineHeight) / 2` (or `.height`). New rule SPEC-087
  warns when the token of a derived context disagrees with its formula for any size and scale, so
  `Dataset.validate()` in the WASM package now reports those warnings. The spec sheet schema gains
  `derived` on markers and measurements.

### Patch Changes

- [#1661](https://github.com/adobe/spectrum-design-data/pull/1661) [`6080645`](https://github.com/adobe/spectrum-design-data/commit/608064534fc01696964d3dae7f09d61bd7dac29e) Thanks [@GarthDB](https://github.com/GarthDB)! - Add an `icons/` catalog with Spectrum 2 icon path data from React Spectrum.
  - `icons/ui.json` holds the 11 S2 UI icons with every size drawing (for example
    `chevron` at 50, 75, 100, 200, 300 and 400). `icons/workflow.json` holds five demo
    workflow icons: add, edit, delete, settings and search.
  - Paths carry no colour. Each set records the source commit, file names, licence
    (Apache-2.0) and copyright.
  - The spec adds `icon-set.schema.json` and registers `icons/` as an optional dataset
    directory, so `validate-dataset` checks it.
  - The WASM package embeds both sets in its dataset (about 38 KB raw, 12 KB gzip).
    Recipes do not use them yet.

## 0.14.3

### Patch Changes

- [#1650](https://github.com/adobe/spectrum-design-data/pull/1650) [`25df278`](https://github.com/adobe/spectrum-design-data/commit/25df2787641f42fbc3f845c09d36645e7846b1ac) Thanks [@GarthDB](https://github.com/GarthDB)! - Renderer SVG text uses a valid CSS `font-family` list.
  - The default stack quotes `'Source Sans 3'`. The unquoted name made browsers drop the
    whole list and render serif.
  - A family bound by a recipe token (such as `Adobe Clean Spectrum VF`) is quoted unless it
    is a generic keyword. The Rust renderer and the JS runtime produce the same list.
  - Spec R2 shows the quoted stack and requires quoting for names that are not CSS
    identifiers.

## 0.14.2

### Patch Changes

- [#1644](https://github.com/adobe/spectrum-design-data/pull/1644) [`13f4851`](https://github.com/adobe/spectrum-design-data/commit/13f4851adab6c4e01ef3299cafb8c156bcfdfa19) Thanks [@GarthDB](https://github.com/GarthDB)! - Stop the component changelog from reading re-scoped records as removals.
  - Relationship records that match on component, property, context and target pair
    as an update when `scope.options` differ.
  - A context rename on the same target is a documentation update. Trailing
    whitespace in a context is not a change.
  - Removing a relationship whose exact twin survives is metadata, not major.
  - Changelogs are regenerated: button and accordion leave 2.0.0 (1.2.0), combo-box
    and text-area leave 2.0.0 (1.1.2).

## 0.14.1

### Patch Changes

- [#1641](https://github.com/adobe/spectrum-design-data/pull/1641) [`c4f6c2a`](https://github.com/adobe/spectrum-design-data/commit/c4f6c2abbbd7754deaf87c84bb4e3067364db9eb) Thanks [@GarthDB](https://github.com/GarthDB)! - Make the component changelog backfill reproducible.
  - Duplicate relationship records without a uuid pair by file position.
  - Token entries sort within each change group.
  - A release's `commit` is the last commit before its Version Packages
    commit (the tag's first parent).
  - Changelogs are regenerated to match.

## 0.14.0

### Minor Changes

- [#1630](https://github.com/adobe/spectrum-design-data/pull/1630) [`9e9a6fa`](https://github.com/adobe/spectrum-design-data/commit/9e9a6fa618b8e65a3d6ba19d83e9e6f00ec6ec46) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): changelog attributes tokens a component reaches through tokenBindings (hzje.31)
  - **design-data changelog**: a token change reaches a component that names the token in
    `tokenBindings` (resolved by token name to every token uuid with that name), not only through
    relationships. Such entries carry `reachedBy: "tokenBinding"`; a token reached both ways is
    attributed once, unmarked.
  - **component-changelog.schema.json**: entries gain an optional `reachedBy`.

- [#1636](https://github.com/adobe/spectrum-design-data/pull/1636) [`371e96d`](https://github.com/adobe/spectrum-design-data/commit/371e96da286ddbf1341a8c9e5a60df06d06384a3) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): `design-data figma public-names` compares public Figma variable names with design-data
  - **design-data figma public-names**: reads a `variables/local` snapshot, pairs each public
    variable with the hidden variable it aliases and the token or relationship record behind it,
    generates the name that record would get, and classes the match (identical, reordered, adds or
    drops words, different, unresolved). Hidden variables without a public alias are listed with a
    generated name. Writes CSV and Markdown reports; designer names are never changed.

- [#1628](https://github.com/adobe/spectrum-design-data/pull/1628) [`b0fcd0a`](https://github.com/adobe/spectrum-design-data/commit/b0fcd0a4bfb3c1c7dd28290436413db866131379) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): scene measurements for nested parts, border, focus ring and press ratio (qkj5.93)
  - **core::visual**: the scene adds `width`, `height`, `radius` and `padding` measurements for
    nested parts, `border` for stroke widths, `focus-thickness` and `focus-gap` for the ring, and
    `press` for the press ratio. Each carries its token and relationship. Existing measurements
    and the SVG output are unchanged.
  - **design-data spec-sheet**: Layout blocks render in the states and options their bindings need
    (a focus ring in `keyboard-focus`, a pressed scale in `down`), so the scene shows the part
    the block documents. Measurements show on the Layout page only.
  - **component-spec-sheet.schema.json**: the `measurements` description lists the new kinds.

- [#1627](https://github.com/adobe/spectrum-design-data/pull/1627) [`1b331ec`](https://github.com/adobe/spectrum-design-data/commit/1b331ecf575ea170fbec2b402d5835c2822de939) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): spec sheets show relationship records that have no context (qkj5.106, qkj5.107)
  - **design-data spec-sheet**: records without a `context` form one block per relationship
    property, titled from the property and marked `titleSource: "property"`. Inline-value
    records are rows with `source: "inline"`, the value and no token. Every component with
    relationships now has at least one block.
  - **design-data spec-sheet**: scales of one token merge into a row; color schemes (`light`,
    `dark`, `wireframe`) get their own value key, so they no longer overwrite each other.
  - **component-spec-sheet.schema.json**: blocks gain required `titleSource` and `records`;
    items gain required `source`. Regenerate any sheet made before this change.

### Patch Changes

- [#1635](https://github.com/adobe/spectrum-design-data/pull/1635) [`1975c4d`](https://github.com/adobe/spectrum-design-data/commit/1975c4dafc66d83b136a270adf726ad3b105fdc0) Thanks [@GarthDB](https://github.com/GarthDB)! - fix(sdk): spec sheets are reproducible byte for byte
  - **design-data spec-sheet**: `render.request.mode` keys were written in hash-map order, so two runs
    on the same data differed. They are sorted now, which lets a sheet hash tell whether a Figma
    file is stale.

- [#1629](https://github.com/adobe/spectrum-design-data/pull/1629) [`435d06b`](https://github.com/adobe/spectrum-design-data/commit/435d06b705453297fbf0cb7337e3b1781c36f9a2) Thanks [@GarthDB](https://github.com/GarthDB)! - fix(sdk): spec sheet token names come from the token's structured name (qkj5.105, qkj5.85)
  - **design-data spec-sheet**: the token column shows the name the SDK serializes from the
    token's structured name (or its pinned `legacyKey`), not the relationship property. A focus
    ring thickness reads `focus-indicator-thickness`, a switch track width
    `switch-control-width-small`. Rows that use one token for two relationship properties stay
    separate rows.

## 0.13.0

### Minor Changes

- [#1621](https://github.com/adobe/spectrum-design-data/pull/1621) [`1ce36f6`](https://github.com/adobe/spectrum-design-data/commit/1ce36f66d777cd699034a2b87842a97e17315565) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): spec sheets for every component with relationships (`design-data spec-sheet --all`)

  `design-data spec-sheet --all -o <dir> [--changelog-dir <dir>]` writes one sheet per component
  with relationships plus `index.json` (visual flag, page and block counts, version and latest
  release). A component with a visual recipe gets a full sheet; any other gets a table-only
  sheet: `visual: false`, blocks with token rows and `render: null`, so views can say "No visual
  recipe yet". The same stub is the starting point for a new component.
  `component-spec-sheet.schema.json` gains a required `visual` and a nullable block `render`;
  regenerate any sheet made before this change.

  Line-height and font-family relationships now sit on the Typography page, not Layout.

## 0.12.0

### Minor Changes

- [#1604](https://github.com/adobe/spectrum-design-data/pull/1604) [`21c4d24`](https://github.com/adobe/spectrum-design-data/commit/21c4d240453333a8830c68a2e0afc4b18e9403b0) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(design-data): accordion item visual recipe and row boxes in the renderer

  Adds the accordion item recipe (sizes s to xl, density, quiet, open, hover, disabled).
  It needs three renderer features, in both the Rust solver and the JS runtime:
  - A flowed box that binds `direction: "row"` lays out icon, text and box children in a row.
  - A column root stretches a box with no width across its width.
  - An icon can bind `rotation`, and the `chevron` glyph is new.

  A relationship that pins `size`, or binds a single token, no longer loses that token to the
  token's own size name. A templated numeric selector field (`{sizeIndex}`) now matches a number.

- [#1617](https://github.com/adobe/spectrum-design-data/pull/1617) [`ab105f9`](https://github.com/adobe/spectrum-design-data/commit/ab105f972f0887aeaa9e385fb74a7384d6e761fa) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(cli): `design-data changelog` writes per-component changelogs (hzje.7)

  `design-data changelog --from <ref> --to <ref> [--component <id>] [--dataset <path>]` diffs the
  dataset between two git revisions, each first-parent commit once for all components, and appends
  a release to `<dataset>/changelog/<component>.json`. Releases already recorded are never
  rewritten, so a second run changes nothing. It calls `git` as a subprocess and assumes no
  monorepo paths, so platform repositories can run it too. `--tags <glob>` cuts a range into one
  release per stable tag (backfill), and a component that never changed gets a baseline-only
  file at `1.0.0`. `spec-sheet --changelog` reads the new format.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe lints and fixes for checkbox, switch and others; pressed scale includes nested parts.
  - **relationships**: strip the stray "S2 " prefix from contexts; add checkbox `Control`,
    disabled and error contexts; scope selected switch and radio-button records with
    `isSelected: true` (the schema allows boolean option values, the renderer maps them).
  - **visuals**: pressed parts scale nested children; checkbox `pressTarget`; `notVisual` option list.
  - **validate**: SPEC-066 to SPEC-070 warn on uncovered options and states, token selectors a
    relationship covers, literals, deprecated tokens and focus ring names; SPEC-071 is info.
    `recipe_lint_baseline` holds each recipe at its current warning count.
  - **spec**: authoring conventions in `component-visuals.md`; `notVisual` recipe field.
  - **sdk/core**: render snapshot test for every recipe; `SceneCache` speeds matrix renders.
  - **relationships**: `scope.options` pick a default or the most specific override (arrays allowed);
    badge colors, padding and fonts bind that way, shrinking its recipe by 1,600 lines.
    `scope.options.state` adds states to the bound token.
  - **switch**: `isReadOnly` has no distinct visual (hover and press only).
  - **button, action-button**: colors, press perspective, hold-icon inset bind via relationships.
  - **focus-indicator**: the `focus-ring` anatomy, gap token and recipe parts are now
    `focus-indicator` (legacy key `focus-ring-gap` kept).

- [#1616](https://github.com/adobe/spectrum-design-data/pull/1616) [`19318d9`](https://github.com/adobe/spectrum-design-data/commit/19318d96723c39526f9f909fa44734f1e49874d6) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(core): component changelog entries, classes and derived semver (hzje.4-6)

  New `component-changelog.schema.json` and `spec/component-changelog.md` define
  `changelog/<component>.json`: releases (append only) of entries, each with the component,
  relationship context, class (`visual`, `api`, `documentation`, `metadata`), bump, direct or
  indirect, field changes, `rationale` where the record has one, and its source (the PR from the
  squash subject, otherwise the commit). `core::changelog` builds the entries from a record diff
  and derives the component semver from them: major for a removed option, option value, state,
  anatomy part, slot or relationship, a renamed option, or a deprecated component; minor for
  additions; patch otherwise. A component's first release is `1.0.0`.

  Metadata-class changes (legacy keys, ids, implementations) are summarized per commit as
  `metadata: {count, fields}` rather than listed, each entry is one line in the committed file, and
  the pending `unreleased` release is taken over by the next real release.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a draft component visual recipe format for rendering to SVG, PNG, and Figma.
  - **spec/component-visuals.md**: draft RFC and schema; `design-data:validate` checks recipes.
  - **action-button**: pilot recipe `visuals/action-button.json`; adds `progress`, `isPending`.
  - **sdk (core, cli)**: `render` makes SVG; `compile_recipe` pre-binds tokens.
  - **sdk/wasm**: `Dataset.renderScene` and `Dataset.renderSvg` render recipes in the browser.
  - **button**: `visuals/button.json` recipe (variant, style, state, static color); `down` state.
  - **spec and renderers**: container `stroke`, `relativeTo: "height"` radius, pressed scale-down.
  - **badge**: recipe and anatomy.
  - **Removed**: badge option `isDisabled`, published in 3.7.1; the design has no disabled badge.
  - **renderers and site**: per-corner radius props, font weight names to numbers, label presence.
  - **sdk/plugins/site**: `design-data site --out <dir>` writes a static explorer (no WASM).
  - **sdk/plugins/figma**: `variable_names` maps tokens to Figma variable names offline.
  - **sdk/core**: scene token refs carry alias `chain`; press tokens are tracked.
  - **switch**: `visuals/switch.json` recipe, anatomy, `hideLabel`, and 15 color relationships.
  - **sdk/core, site**: nested box layout, `around` ring, `pressTarget`, component-scoped sizes.
  - **spec rules**: SPEC-060..063 check recipes against components (`validate --visuals-path`).
  - **checkbox**: `visuals/checkbox.json` recipe, anatomy, `box`/`dash` terms; `glyph` draws marks.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Validate option constraints in the Rust SDK.
  - **SPEC-064** (error, Layer 2): every option name and value in a constraint's `when` / `require`
    must be declared in the component's `options`. Silent when an option has no `values` list.
  - **SPEC-065** (warning, Layer 2): a visual recipe rule or relationship `scope.options` that
    matches only combinations excluded by an `error` constraint.
  - **sdk/core**: new `constraints` module reads `component.constraints` into a typed model.
  - Conformance fixtures for both rules under `conformance/{valid,invalid}`.

- [#1586](https://github.com/adobe/spectrum-design-data/pull/1586) [`706b12e`](https://github.com/adobe/spectrum-design-data/commit/706b12e542d49218571e4b9f2b478481a926c852) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipe selectors can use `{<option>}` placeholders, such as `{style}`, for any option.

  **Spec:**
  - `component-visuals.md`: `{<option>}` expands to each value the option declares. A candidate
    found for one value applies only when the request's option equals it.
  - A brace pair whose content is not a plain identifier stays literal text. `{size}` and
    `{sizeIndex}` are unchanged.
  - SPEC-061 also reports a `{name}` placeholder in a `token` or `relationship` selector that is
    not `size`, `sizeIndex` or a declared option that lists its values.
  - SPEC-062, 066, 067, 069 and 071 expand option placeholders before resolving.
  - The `invalid/SPEC-061` conformance fixture covers the new check.

  **WASM:** `compile_recipe` and `render` expand option placeholders. A recipe that uses none
  compiles to exactly the same output as before.

  **CLI:** `design-data render`, `site` and `validate` use the same expansion. The native binary
  is versioned by `@adobe/design-data-tui`.

- [#1596](https://github.com/adobe/spectrum-design-data/pull/1596) [`6d42e98`](https://github.com/adobe/spectrum-design-data/commit/6d42e98631aa1dd640fd244689ebb029f0f44f07) Thanks [@GarthDB](https://github.com/GarthDB)! - New rule SPEC-083 warns when a visual recipe binds a prop the renderer does not read.

  **Spec:**
  - `rules.yaml` and `component-visuals.md`: SPEC-083 (warning) flags a part prop the renderer
    ignores for that part, such as `opacity`, `direction` or `fill` on a text part. A conformance
    fixture covers it.

  **WASM and CLI:** `validate` runs SPEC-083 on foundation and platform recipes. The list of read
  props is the renderer's own table (`READ_PROPS` in `visual.rs`). The solver checks every prop it
  reads against that table in debug builds, through the same function the rule uses, so the two
  cannot drift. Rendering is unchanged. The five foundation recipes bind root `direction`, `align`
  and `justify`, which the solver never reads. They are in the recipe lint baseline and tracked as
  their own issues.

  Bump levels: all three are minor because validation gains a rule and no output changes.

- [#1615](https://github.com/adobe/spectrum-design-data/pull/1615) [`543d38a`](https://github.com/adobe/spectrum-design-data/commit/543d38aec31eb1b4893dc56ef710dca6b00b939e) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(core): record-level diff between two dataset revisions (hzje.3)

  `record_diff::diff_datasets` compares two dataset snapshots record by record: tokens through the
  existing semantic diff (spec/diff.md), relationships matched by uuid (then scope, context and
  target; a re-pointed binding is one update), component options, option values, anatomy parts,
  states, slots, document blocks, implementations and lifecycle, and visual recipes. Formatting and
  key order never produce a change. Tokens whose alias-resolved value moved are reported
  separately, so callers can mark them indirect.

- [#1589](https://github.com/adobe/spectrum-design-data/pull/1589) [`5770c02`](https://github.com/adobe/spectrum-design-data/commit/5770c0285f7c7d6a005752c7e37b8d89129a4e9a) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can bind `paddingBlockStart` and `paddingBlockEnd`, and the renderer now draws them.

  **Spec:**
  - `component-visuals.md`: a root `box` with no `height` is 32 high, unless the recipe binds block
    padding. Then its height is the tallest flowed child plus the block padding, and the children
    sit between the paddings. An explicit `height` always wins.

  **WASM and CLI:** `render`, `site` and the JS runtime apply block padding the same way. A recipe
  that binds no block padding renders exactly as before; no foundation recipe binds it today.
  The native binary is versioned by `@adobe/design-data-tui`.

  Bump levels: all three are minor because the renderer gains a capability (a new normative rule
  for the spec) and no output changes for existing recipes.

- [#1595](https://github.com/adobe/spectrum-design-data/pull/1595) [`76edc46`](https://github.com/adobe/spectrum-design-data/commit/76edc466c835b4afa6f0368f959e2b08a39c24bc) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can bind `lineHeight` and `fontFamily` on text parts, and the renderer honors them.

  **Spec:**
  - `component-visuals.md`: a `text` part is as high as its line box. A `lineHeight` ending in
    `px` is that height, a unitless one multiplies `fontSize`, and with none it stays 1.3 times
    `fontSize`. A bound `fontFamily` leads the SVG font stack.

  **WASM and CLI:** `render`, `site` and the JS runtime apply both the same way. A recipe that
  binds neither renders exactly as before; foundation snapshots and goldens are unchanged. A scene
  node gains `font_family` only when the recipe binds it. `button-ios` now binds both, so its
  Medium height is 39.04 against Figma's 39. The native binary is versioned by
  `@adobe/design-data-tui`.

  Bump levels: all three are minor because the renderer gains a capability and no output changes
  for existing foundation recipes.

- [#1584](https://github.com/adobe/spectrum-design-data/pull/1584) [`bb1c83b`](https://github.com/adobe/spectrum-design-data/commit/bb1c83b3900d17aa119da65d20f388a6d98cba75) Thanks [@GarthDB](https://github.com/GarthDB)! - Render a component through a platform's `componentAliases` and recipes.
  - `design-data render <component> --platform <id>` and `design-data site --platform <id>` look
    recipes up in the graph through `canonical_component`. An alias key such as `button` draws the
    recipe of its target (`button-ios`); `render button-ios` still works.
  - A platform's `extensions/visuals` recipes now reach `render` and `site`. Foundation recipes load
    into the graph before the platform is applied, so a platform recipe replaces them.
  - The site lists the alias key with the target's data and adds `source` and `aliasOf` to
    `data.json` under a platform. The raw alias target is hidden from the list.
  - A malformed recipe file now fails with its path.
  - WASM: `renderScene` and `renderSvg` map `request.component` through the applied platform's
    aliases. No API change; without a platform, output is unchanged.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Render component visuals through a platform manifest.
  - `design-data render` and `design-data site` accept the global `--platform <id>` (or
    `DESIGN_DATA_PLATFORM` / `default_platform`) and apply the Foundation to Platform cascade
    before building scenes: tokens are filtered and overridden, and extension components,
    relationships and tokens are layered in.
  - A recipe binding that does not resolve under a platform is reported as
    `warning: platform '<id>': ...`. The site lists these in a panel instead of drawing nothing.
  - The site writes the platform into `data.json` and names it in the nav heading
    ("Foundation" when none is selected).
  - WASM: `Dataset.applyPlatform(manifest)` applies a manifest with its `extensions` merged
    inline, so `renderScene` and `renderSvg` render a platform build.
  - With no platform selected, output is unchanged.

- [#1598](https://github.com/adobe/spectrum-design-data/pull/1598) [`63c60e0`](https://github.com/adobe/spectrum-design-data/commit/63c60e09e16045552cb4b62c6b4d6e6d0b193dfb) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can bind `opacity` on the root part, and the renderer honors it.

  **Spec:** `component-visuals.md` says renderers read `opacity` only on the root part and
  dim the whole component as one group, the way iOS dims a disabled control.

  **WASM and CLI:** `render`, `site` and the JS runtime wrap the drawing in one
  `<g opacity>` when the root binds `opacity`. A scene gains `opacity` only when it is bound,
  so existing scene JSON and SVG are unchanged. SPEC-083 no longer flags `opacity` on a root
  part. The native binary is versioned by `@adobe/design-data-tui`.

- [#1600](https://github.com/adobe/spectrum-design-data/pull/1600) [`8dbea28`](https://github.com/adobe/spectrum-design-data/commit/8dbea2863b11a7dbfc1aee58314ad8a5ca040475) Thanks [@GarthDB](https://github.com/GarthDB)! - The visual renderer reads the root part's `direction`, `align` and `justify`.
  - **direction**: `row` (default) or `column`. A column is as wide as its widest child.
  - **align**: `start`, `center` (default) or `end`, across the layout direction.
  - **justify**: `start`, `center` (default) or `end`, along a column with a set height.
    A row is as wide as its content, so `justify` does nothing there.
  - Any other value is a render diagnostic and keeps the default.
  - SPEC-083 no longer warns about these props; existing recipes render unchanged.

- [#1606](https://github.com/adobe/spectrum-design-data/pull/1606) [`e43e55b`](https://github.com/adobe/spectrum-design-data/commit/e43e55b6570eb6350ff0a07d40823355b9b54bc7) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(core): the visual scene records token-bound measurements

  `design-data render --format scene` and WASM `renderScene` add a `measurements` array.
  Each entry is a height, padding, gap or radius span of the layout with its token.
  Overlay backends draw dimension lines from it instead of recomputing layout.
  Recipes author no overlays. The array is omitted when no dimension is token-bound.
  The JS runtime does not emit it yet.

- [#1611](https://github.com/adobe/spectrum-design-data/pull/1611) [`6b25821`](https://github.com/adobe/spectrum-design-data/commit/6b25821dfde7fc9d0f6401f7cb8ab436cbd34cab) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(core): scene token refs carry the relationship that bound them

  `TokenRef` gains `relationship` (`uuid`, `context`, `property`) when a value came through a
  relationship binding, so overlays name the relationship property, not the token's legacy key.
  The spec-sheet `render.measurements` now lists the scene measurements whose relationship
  context is the block title, each labelled with the relationship property.

### Patch Changes

- [#1602](https://github.com/adobe/spectrum-design-data/pull/1602) [`326c51f`](https://github.com/adobe/spectrum-design-data/commit/326c51f09306fb0cc5fe493ec66ae89cb0f878ff) Thanks [@GarthDB](https://github.com/GarthDB)! - Accordion data: add anatomy, an `isOpen` option and Figma-aligned padding relationships.
  - **components**: `accordion` gains anatomy (item, header, disclosure-icon, title, content,
    divider) and a boolean `isOpen` option.
  - **relationships**: relabel the eight `S` contexts as top/bottom edge to text, drop 54 exact
    duplicate records, and add header, title and content padding relationships by size,
    density and scale that bind the semantic tokens Figma uses.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Define what an anatomy part is; review button, action-button and badge
  (`flowed-box-paints`: checkbox, switch).

  **Spec:**
  - `anatomy-format.md` says what counts as a part, how to name and nest parts, when a part
    is required, and what is not anatomy. It adds a review checklist.
  - New optional `presentIn` lists the states a part is present in. Not allowed on a required part.
  - New optional `anatomyReview` on a component records `draft` or `reviewed`.
  - New info rule SPEC-073 lists components with relationships but no anatomy, or draft anatomy.
  - New error SPEC-074: a part's `presentIn` states must be declared on the component.
  - New error SPEC-075: a recipe's `visibleWhen.states` must agree with the part's `presentIn`.

  **Data:**
  - Button, action-button and badge anatomy are reviewed.
  - Button `label` is now optional. The focus indicator is state-only on all four.

  **WASM:** the validator includes SPEC-073 to SPEC-075.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - A box placed directly in a row now paints itself, so checkbox and switch no longer need a
  render-only `control` part.
  - Renderer and JS runtime read `fill`, `stroke` and `strokeWidth` on a flowed box.
  - Checkbox and switch drop `control`. The box and the track carry the size and hold the marks
    and the handle. Rendered geometry, colors and press scale are unchanged.
  - Relationships that named `control` now name `box` (checkbox) or `track` (switch).
  - Checkbox and switch anatomy are now reviewed.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - The component explorer (`design-data site`) now honors option constraints.
  - **Matrix:** combinations excluded by an `error` constraint are not rendered, and rows or columns
    left empty are dropped. A note under the grid says what was left out and why, with the fix.
    `advisory` combinations render with a footnote saying they have no distinct design.
  - **Pickers:** values that lead to an unsupported combination read "(not supported)", and a status
    message under the pickers explains the current selection, with one-click fixes.
  - **Zoom view:** an unsupported selection shows the explanation instead of a render.
  - **sdk/plugins/site:** new `constraints.js` mirrors `sdk/core/src/constraints.rs`; a shared
    fixture keeps the Rust and JS evaluations in lockstep.

- [#1592](https://github.com/adobe/spectrum-design-data/pull/1592) [`0e42d28`](https://github.com/adobe/spectrum-design-data/commit/0e42d28bc2e6411bb950e3c4209d0c462e7ac43e) Thanks [@GarthDB](https://github.com/GarthDB)! - `validate --platform` now reports a platform manifest that cannot apply (SPEC-082).

  **Spec:** new rule SPEC-082 `platform-manifest-applies` (error). A platform manifest MUST apply
  to the foundation dataset; a validator that cannot apply it MUST report an error, not skip the
  platform rules silently. It stays silent when an `include`/`exclude` entry does not parse
  (SPEC-039 reports that).

  **CLI:** SPEC-076, SPEC-079 and the platform recipe checks returned nothing when the manifest
  failed to apply, so `validate --platform <id>` exited 0. It now reports SPEC-082 and **exits 1
  when the manifest cannot apply**. `validate --platform ios` without `--mode-sets-path` (the iOS
  manifest extends `contrast`) now fails instead of passing. Manifests that apply are unchanged.

  **WASM:** the rule is in the core set; WASM validate passes no manifest, so nothing changes.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Check that visual recipes still resolve under a platform manifest.

  **Spec:**
  - New warning SPEC-076: every token or relationship binding a recipe resolves on the foundation
    must also resolve once the platform manifest's cascade is applied.
  - New conformance fixture `invalid/SPEC-076`.

  **CLI:**
  - `design-data validate --platform <id> --visuals-path <dir>` runs SPEC-076 and names each binding
    the platform drops. It reuses the render scene diagnostics.

  **Platforms:**
  - The iOS manifest no longer carries an `include` whitelist. It shipped only a few properties,
    which dropped the height, padding, font-size and icon-size tokens recipes bind.

- [#1585](https://github.com/adobe/spectrum-design-data/pull/1585) [`8934646`](https://github.com/adobe/spectrum-design-data/commit/89346465f929583bd76494270e4454df5af22381) Thanks [@GarthDB](https://github.com/GarthDB)! - Validate platform-owned visual recipes. SPEC-079 and SPEC-080 are now enforced.

  **Spec:**
  - SPEC-079 (warning): a recipe in a platform's `extensions/visuals/` must render over the
    request grid without a scene diagnostic. It is planned to become an error in a later minor
    release.
  - SPEC-080 (info): a platform recipe that replaces a foundation recipe reports the pair.
  - Conformance fixtures `invalid/SPEC-079`, `invalid/SPEC-080` and `valid/SPEC-079`.

  **CLI:**
  - `design-data validate --platform <id>` runs the recipe rules SPEC-060 to 063, 066 to 071 and 075
    over platform-owned recipes. SPEC-076 skips a foundation recipe the platform replaces. Output
    is unchanged when the manifest ships no `extensions/visuals/`.

  **WASM:** the core change is compiled in; `Dataset.validate()` passes no manifest, so its
  output is unchanged.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Load platform-owned visual recipes and add `componentAliases`.

  **Spec:**
  - `manifest.schema.json` accepts `componentAliases` (string to string).
  - New error SPEC-081: an alias key must be a foundation component, its target must be declared in
    the platform's `extensions/components/`, aliases must not chain or cycle, and a key must not
    also be replaced there. New conformance fixture `invalid/SPEC-081`.

  **SDK core:**
  - A platform's `extensions/visuals/<component>.json` loads into `graph.visuals` with
    `layer: Platform` and replaces the foundation recipe of the same name. A bad fragment or a
    file name that differs from `component` is an error naming the file.
  - `TokenGraph::canonical_component` returns the alias target under the active platform.

- [#1603](https://github.com/adobe/spectrum-design-data/pull/1603) [`4be4b79`](https://github.com/adobe/spectrum-design-data/commit/4be4b79699b7926bd59a71b3c145c673fe1bc5f2) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the radio-button visual recipe.
  - Radio button gets reviewed anatomy (container, control, selection-indicator, label,
    focus-indicator) and `size` and `isDisabled` options.
  - The three Spectrum 1 `Control (selected, non emphasized)` records (neutral background
    colors) are replaced by content-color records for the neutral selected tokens that the
    component's token bindings already name.
  - New `Control`, `Control (disabled)` and `Control (rounding)` relationships.
  - The recipe binds everything through relationships and has render snapshots.

- [#1594](https://github.com/adobe/spectrum-design-data/pull/1594) [`f4b0426`](https://github.com/adobe/spectrum-design-data/commit/f4b0426f1e2f6ff5f67f3d089daa6789451d2306) Thanks [@GarthDB](https://github.com/GarthDB)! - A recipe selector with an `{option}` placeholder now counts that option as used. Patch: no WASM API
  changes; only the options the recipe-coverage validation requests change, and validation output on
  the current dataset is identical.

- [#1610](https://github.com/adobe/spectrum-design-data/pull/1610) [`2ec8e9e`](https://github.com/adobe/spectrum-design-data/commit/2ec8e9ed217a01bb81eefe8b1950be79e81cf98d) Thanks [@GarthDB](https://github.com/GarthDB)! - fix(design-data): give every relationship record a stable uuid

  4,857 relationship records had no `uuid`. Each now has a deterministic UUIDv5 from
  `scripts/backfill-relationship-uuid.mjs`. Existing uuids are unchanged. Changelogs and
  platform overrides can now target any relationship. Legacy output is unchanged.

- [#1590](https://github.com/adobe/spectrum-design-data/pull/1590) [`f3d8058`](https://github.com/adobe/spectrum-design-data/commit/f3d8058832f9932aebf6732aaf176da58e0cde77) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix corner rounding when a recipe's radius is larger than half the box.

  **Spec:** `component-visuals.md` gains a normative rule: a uniform `cornerRadius` larger than half
  the shorter side of its box is clamped to that value, so the corner stays circular.

  The renderer clamps a uniform corner radius to `min(radius, width/2, height/2)`, like CSS
  `border-radius`. Before, an SVG `rx` larger than half the height drew an ellipse.

  **Rendered output changes for existing recipes.** Foundation Button icon-only and pending
  variants at the mobile scale (a box narrower than tall) go from elliptical to round corners
  (for example 38x40 with a 20 radius now draws 19). The focus ring and the outline stroke
  follow. 72 of the 96 Button option sets in `recipe-snapshots.json` change; the other
  components are unchanged. Desktop output is unchanged.

  Bump levels: patch for wasm and tui, because this fixes wrong output and adds no API. The spec
  is minor because a new normative rule applies to every renderer. The native binary is versioned
  by `@adobe/design-data-tui`.

- [#1601](https://github.com/adobe/spectrum-design-data/pull/1601) [`7262883`](https://github.com/adobe/spectrum-design-data/commit/7262883c1d48038d08407ef6c907e896e13a415a) Thanks [@GarthDB](https://github.com/GarthDB)! - Two visual renderer fixes.
  - **lineHeight**: a value that does not parse (`128%`, `1.2em`) is a render diagnostic,
    not a silent fallback to 1.3 x font size.
  - **icon height**: an icon taller than the label line adds only the line height to a row with
    block padding, as in Figma. button-ios Large is 55.04 high (was 55.67; Figma 55).

- [#1598](https://github.com/adobe/spectrum-design-data/pull/1598) [`63c60e0`](https://github.com/adobe/spectrum-design-data/commit/63c60e09e16045552cb4b62c6b4d6e6d0b193dfb) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-063 lets a component with no `size` option declare a one-entry `sizeScale`, the single
  size renderers draw (for example the fixed-size iOS switch). Zero or several entries on such a
  component are an error. `component-visuals.md` and `rules.yaml` say so. The native binary
  is versioned by `@adobe/design-data-tui`.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe `when.options` conditions now accept an array of values, as the spec already described.
  - **sdk/core, site runtime**: an array matches when any value matches and counts as one condition.
  - **SPEC-061**: checks each element of an array condition against the option's declared values.
  - **spec**: component-visuals states that an array counts as one condition.
  - **button**: static color rules for primary and secondary share one entry with `variant: [...]`.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Speed up `Dataset.renderScene` and `Dataset.renderSvg` by compiling each recipe once per
  component, size and mode and reusing it. Repeated renders are 30 to 55 times faster
  (button 6.5 to 0.21 ms, badge 5.0 to 0.11 ms, switch 7.8 to 0.14 ms). Scene and SVG output
  are unchanged.

## 0.11.3

### Patch Changes

- [#1573](https://github.com/adobe/spectrum-design-data/pull/1573) [`6c59c1f`](https://github.com/adobe/spectrum-design-data/commit/6c59c1ffc26ee80e11b1354c8e97d1479023af30) Thanks [@GarthDB](https://github.com/GarthDB)! - A platform manifest override now keeps every field of the record it replaces.

  **Spec:**
  - `manifest.md` `overrides` now says what the code already did: the override replaces the
    foundation record for that platform's graph (same key and uuid).
  - `query` returns one record per token.
  - Defines the in-memory markers `overriddenBy` and `overriddenFrom`. Legacy output omits them.

  **Core and WASM:**
  - An override no longer drops `$schema`, `$valueType`, `lifecycle`, `description` or
    `conceptId`. It changes only `value` or `$ref`.
  - A replaced record carries `overriddenBy` (`{platform}` or `{manifest}`) and
    `overriddenFrom` (the foundation value, kept even after several overrides).
  - Output with no platform is unchanged. With the iOS manifest, the three teal overrides
    now keep their `$schema`, `uuid` and `private` fields.

- [#1572](https://github.com/adobe/spectrum-design-data/pull/1572) [`a60aeea`](https://github.com/adobe/spectrum-design-data/commit/a60aeea243b2ac4e812d46bbd9f7140c9f62f398) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-072, a warning for a relationship that duplicates another record's `$ref`.

  Two relationship records with the same scope, context and `$ref` leave the token's other scale
  unreachable when the token has a scale counterpart. Validation now reports the second record and
  names the counterpart. A repeated record on a token with no scale counterpart is not reported.
  The current data has no such duplicates after the repoint in this PR.

## 0.11.2

### Patch Changes

- [#1561](https://github.com/adobe/spectrum-design-data/pull/1561) [`be208ce`](https://github.com/adobe/spectrum-design-data/commit/be208cef23415ab779adbc49e2fcf7c9fdeca9b1) Thanks [@GarthDB](https://github.com/GarthDB)! - Sync component content from Spectrum Hub (automated).
  - **packages/design-data/components**: 97 component schemas refreshed (was 97).

## 0.11.1

### Patch Changes

- [#1382](https://github.com/adobe/spectrum-design-data/pull/1382) [`15f371e`](https://github.com/adobe/spectrum-design-data/commit/15f371e50e2ce95a624a93152e408e1bbe8844dc) Thanks [@GarthDB](https://github.com/GarthDB)! - Add static and theme-aware transparent colors, deprecate the old ones (#1345, #1346, #1347).
  - **tokens/color-palette.tokens.json**: add `transparent-static-white-*` and
    `transparent-static-black-*` (36 tokens), plus theme-aware `transparent-neutral-*` and
    `transparent-neutral-inverse-*` (108 tokens across light, dark, wireframe). Alpha equals the
    matching `opacity-*` step and matches the S2/Web Figma library's opacity links.
  - **tokens/color-palette.tokens.json**: deprecate `transparent-white-*`, `transparent-black-*`,
    `white`, and `black` with `replacedBy` mappings from #1346. Scales don't map 1:1: 8 of the
    26 numbered tokens match exactly, the rest are approximate, and `-25` maps to `-0`.
    Legacy values are unchanged.
  - **registry/color-families.json**: register the four new color families.
  - **packages/tokens/src/color-palette.json**: regenerated legacy output; the 28 deprecated
    tokens gain `deprecated`, `deprecated_comment`, and `renamed`.
  - **@adobe/design-data-wasm**: patch bump because the embedded dataset content changed.

- [`54ee322`](https://github.com/adobe/spectrum-design-data/commit/54ee322dc2fa9c6556549597a74610c290638664) - Rebuild the embedded dataset with the pinned structure-prefixed legacy keys.
  - **packages/design-data/tokens/layout.tokens.json**: `name.legacyKey` pins change the
    dataset that `sdk/core` embeds at compile time. Generated output is unchanged.

## 0.11.0

### Minor Changes

- [#1539](https://github.com/adobe/spectrum-design-data/pull/1539) [`da64677`](https://github.com/adobe/spectrum-design-data/commit/da6467789ff0277102c4972703842fc0112e73eb) Thanks [@GarthDB](https://github.com/GarthDB)! - <!-- Copyright 2026 Adobe. All rights reserved. -->

  Project canonical tokens into legacy maps for deprecated MCP compatibility.
  - **sdk/wasm**: Add `Dataset.legacyOutput()` with embedded relationship records.
  - **tools/spectrum-design-data-mcp**: Load tokens through wasm; keep existing tool APIs.

## 0.10.4

### Patch Changes

- [#1533](https://github.com/adobe/spectrum-design-data/pull/1533) [`6375e4b`](https://github.com/adobe/spectrum-design-data/commit/6375e4b83333f51f012d8f95df35a20d8a792340) Thanks [@GarthDB](https://github.com/GarthDB)! - Ship a generated `llms.txt` with each consumer-facing package (closes #1533).
  - **package.json (10 packages)**: add `llms.txt` to the npm `files` list.
  - **llms.txt**: generated from each README and `.ai/inventory.json` by `pnpm ai:sync`.

## 0.10.3

### Patch Changes

- [#1517](https://github.com/adobe/spectrum-design-data/pull/1517) [`e693b15`](https://github.com/adobe/spectrum-design-data/commit/e693b15fb1d233b6f70aed2a85532afdf949c8eb) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the `structure` field being silently dropped from generated legacy token
  keys, which broke five banner/list gap and padding tokens.
  - **fields/structure.json**: remove `excludeFromLegacyKey: true`; `structure`
    now participates in legacy key generation like any other field.
  - **layout.tokens.json**: regenerates `gap-horizontal`, `gap-vertical`,
    `padding-horizontal`, `padding-vertical` to `banner-gap-horizontal`,
    `banner-gap-vertical`, `banner-padding-horizontal`, `banner-padding-vertical`;
    regenerates `gap-regular` to `list-gap-regular`. The five old generic keys
    are kept as deprecated aliases (`renamed` to their corrected names) so no
    existing consumer breaks.
  - **spectrum-tokens**: `packages/tokens/src/layout.json` and the six files
    aliasing these tokens are regenerated with the corrected names.

- [#1525](https://github.com/adobe/spectrum-design-data/pull/1525) [`a0154dc`](https://github.com/adobe/spectrum-design-data/commit/a0154dc39e460942cd4ab4a755e9e76130400d5d) Thanks [@GarthDB](https://github.com/GarthDB)! - Keep embedded Hub guidance current when guideline files change.
  - **sdk/core/build.rs**: invalidate Cargo's embedded snapshot when guidelines change.
  - **sdk/wasm/moon.yml**: include guideline content and the core build script in WASM build inputs.

- [#1524](https://github.com/adobe/spectrum-design-data/pull/1524) [`ec3376f`](https://github.com/adobe/spectrum-design-data/commit/ec3376fa833f2c31dd0b2340590134b2747b00c4) Thanks [@GarthDB](https://github.com/GarthDB)! - Promote public Spectrum Hub guidance to the stable release channel.
  - **packages/design-data**: refresh component guidance and publish the Hub guideline
    corpus, including the October 1 public-site sync.
  - **sdk/wasm**: rebuild embedded guidance for MCP and JavaScript consumers.
  - **tools/s2-docs-to-document-blocks**: reject duplicate component slugs and retain
    section introductions alongside their subsections in published guidance.
  - **tools/spectrum-hub-fetcher**: fetch and merge public Hub pages for component and
    guideline syncs, reconciling obsolete slugs and category paths, preserving text
    boundaries, and decoding HTML entities before transformation.

- [#1516](https://github.com/adobe/spectrum-design-data/pull/1516) [`1cce74b`](https://github.com/adobe/spectrum-design-data/commit/1cce74b35a7ecb48302b7114cd89063604ca8440) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix standalone platform manifest loading with implementation fragments.
  - **sdk/core/src/data_source/embedded.rs**: embed fragment schemas and dependencies.
    Refresh older cached snapshot layouts.
  - **sdk/core/src/manifest.rs**: cover ejected mappings and reject invalid implementation rows.
  - **sdk/core/build.rs**, **sdk/moon.yml**: rebuild and check embedded schema changes.

  <!-- Copyright 2026 Adobe. All rights reserved. -->

## 0.10.2

### Patch Changes

- [#1519](https://github.com/adobe/spectrum-design-data/pull/1519) [`738ff48`](https://github.com/adobe/spectrum-design-data/commit/738ff487e7a858d846e998f6b370755fe5929b6b) Thanks [@GarthDB](https://github.com/GarthDB)! - Build and verify wasm artifacts before snapshot and stable publication.
  - **sdk/wasm**: check packed artifacts and isolated Node and web runtimes.
  - **release workflows**: build snapshot wasm separately and verify packages before publishing.

## 0.10.1

### Patch Changes

- [#1513](https://github.com/adobe/spectrum-design-data/pull/1513) [`b9888b8`](https://github.com/adobe/spectrum-design-data/commit/b9888b8ce9a0e4ec5b607e088942999629d5d43d) Thanks [@GarthDB](https://github.com/GarthDB)! - Add Spectrum 2 implementation metadata for components with exact verified exports.
  - **spectrum-design-data**: replace S1 mappings with verified Spectrum 2 exports.
  - **design-data-wasm**: include the updated component data in the WASM package.

## 0.10.0

### Minor Changes

- [#1500](https://github.com/adobe/spectrum-design-data/pull/1500) [`da4e7d1`](https://github.com/adobe/spectrum-design-data/commit/da4e7d14b5a35a6c1e516b54b1797425145599c0) Thanks [@GarthDB](https://github.com/GarthDB)! - Add narrowing and ambiguity metadata to property-based token resolution.
  - **resolve_token**: support component, variant, state, and colorRole narrowing while reporting
    deprecated and ambiguous matches.

### Patch Changes

- [#1502](https://github.com/adobe/spectrum-design-data/pull/1502) [`2ee9fa8`](https://github.com/adobe/spectrum-design-data/commit/2ee9fa8ccc042e00a57811477a6abdd341b13c1b) Thanks [@GarthDB](https://github.com/GarthDB)! - Clarify that component query filters are accepted for compatibility but are not
  indexed in the embedded dataset.
  - **sdk/core/src/query.rs**: exclude the unreliable component field from the
    canonical indexed-filter list.
  - **sdk/wasm/src/dataset.rs**: direct component discovery to component
    descriptions and token binding metadata.

- [#1500](https://github.com/adobe/spectrum-design-data/pull/1500) [`da4e7d1`](https://github.com/adobe/spectrum-design-data/commit/da4e7d14b5a35a6c1e516b54b1797425145599c0) Thanks [@GarthDB](https://github.com/GarthDB)! - Rebuild the embedded wasm dataset snapshot, stale since 3.1.0, to match published data 3.2.5.
  - **sdk/wasm**: rebuilt against current `packages/design-data` source, refreshing
    `embedded_cache.redb` and the `pkg/node`/`pkg/web` outputs; `primer().provenance
.designDataVersion` now reports `3.2.5`.

## 0.9.0

### Minor Changes

- [#1434](https://github.com/adobe/spectrum-design-data/pull/1434) [`47db5e9`](https://github.com/adobe/spectrum-design-data/commit/47db5e9c8069b90e7377a0096ad18fa72c86fb2c) Thanks [@GarthDB](https://github.com/GarthDB)! - Route `$ref`-backed color-set CTR tokens (e.g. `action-bar-border-color`,
  `popover-border-color`, `card-selection-background-color`) through the Figma
  variables diff's per-mode comparison instead of reporting them
  `skipped-uncovered` (closes spectrum-design-data-2god).
  - **sdk/core/src/figma/import.rs**: `diff_values`'s multi-mode routing gate
    now also accepts a variable whose design-data token is CTR/relationship-backed
    (`graph.has_relationship_record`), not only one carrying a `conceptId`/`setUuid`
    directly on its resolved record — the link a `$ref`-backed color-set CTR carries
    only on its `RelationshipRecord`, never on the resolved `TokenRecord`.

## 0.8.0

### Minor Changes

- [#1432](https://github.com/adobe/spectrum-design-data/pull/1432) [`0c2efe3`](https://github.com/adobe/spectrum-design-data/commit/0c2efe3b039cf5ee59e9dcbaa0c1fa9a59d807ee) Thanks [@GarthDB](https://github.com/GarthDB)! - Platform manifests can now declare platform-local mode sets via `extensions/mode-sets/`,
  scoped to that platform's resolution (declare-or-replace by name, same as
  `extensions/fields/`).
  - **sdk/core/src/manifest.rs**: added `mode-sets` to `CONCAT_CATEGORIES`, wiring
    per-fragment validation against `mode-set.schema.json`.
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` now reads `extensions.modeSets`
    and upserts each into `graph.mode_sets` (cascade and SPEC-005 already operate on it
    generically).
  - **design-data-spec**: documented `extensions/mode-sets/` in `manifest.md` and
    `mode-sets.md` (closes spectrum-design-data-h890.24).

- [#1430](https://github.com/adobe/spectrum-design-data/pull/1430) [`d3ae6e3`](https://github.com/adobe/spectrum-design-data/commit/d3ae6e3e0a5a35223ac687a72e4b7e6580256eea) Thanks [@GarthDB](https://github.com/GarthDB)! - Load platform-manifest extensions from the sibling `extensions/` directory
  (glob-discovered, per-fragment schema-validated, merged at load time) instead of an
  inline `extensions` object, matching the Layer 1 format change in design-data-spec@4.0.0
  (closes spectrum-design-data-h890.26.6).
  - **sdk/core manifest loader (surfaced via wasm/tui)**: glob-discovers
    `extensions/{tokens,components,fields,guidelines,relationships,platform-extensions}/`,
    validates each fragment against its category schema, and merges them at load time
    (deep-merge for `tokens/`, sorted-path-order/last-wins otherwise); manifests using the
    old inline `extensions` object are now rejected (#1422, #1423).

## 0.7.0

### Minor Changes

- [#1388](https://github.com/adobe/spectrum-design-data/pull/1388) [`17239f3`](https://github.com/adobe/spectrum-design-data/commit/17239f31fe23279e1034ef4dd1d1c3072d550a16) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a platform manifest carry field declarations as a first-class,
  cascade-consumable `extensions` section (bead spectrum-design-data-h890.23.2),
  continuing the cascade parity work started for components/platformExtensions
  in h890.22.
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
    gains `fields` (array of `field.schema.json` items).
  - **packages/design-data-spec/spec/manifest.md**: capability matrix and a new
    `extensions.fields` subsection document the add-or-replace-by-name
    semantics, including the `conceptOrder` name-reference caveat.
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` adds a guarded section
    that add-or-replaces into the field catalog by `name`, reusing the
    existing `FieldRecord`/`load_spec_fields` and `upsert_by_key` — no
    struct change, so no cache-schema-version bump is needed.

- [#1387](https://github.com/adobe/spectrum-design-data/pull/1387) [`eb6e57f`](https://github.com/adobe/spectrum-design-data/commit/eb6e57f47c6bb38e2675418e9ef7f0737a385f3b) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a platform manifest carry guideline documents as a first-class,
  cascade-consumable `extensions` section (bead spectrum-design-data-h890.23.1),
  continuing the cascade parity work started for components/platformExtensions
  in h890.22.
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
    gains `guidelines` (array of `guideline.schema.json` items).
  - **packages/design-data-spec/spec/manifest.md**: capability matrix and a new
    `extensions.guidelines` subsection document the add-or-replace-by-name
    semantics.
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` adds a guarded section
    that add-or-replaces into the guideline catalog by `name`, reusing the
    existing `GuidelineRecord`/`load_spec_guidelines` and `upsert_by_key` — no
    struct change, so no cache-schema-version bump is needed.

- [#1390](https://github.com/adobe/spectrum-design-data/pull/1390) [`3aa312d`](https://github.com/adobe/spectrum-design-data/commit/3aa312db6a055108f685b832dfafdf195ab088fc) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a platform manifest overlay add/remove naming exceptions onto the base
  set used by naming validation (bead spectrum-design-data-h890.23.4),
  completing the cascade parity work for h890.23.
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
    gains `namingExceptions` (`{ add, remove }`, both optional arrays of
    non-empty strings).
  - **packages/design-data-spec/spec/manifest.md**: capability matrix and a new
    `extensions.namingExceptions` subsection document the add/remove overlay
    semantics (`remove` applied before `add`, so add wins on overlap).
  - **sdk/core/src/naming.rs**: new `apply_naming_exceptions_overlay` helper;
    naming exceptions stay a plain `HashSet<String>` outside `TokenGraph`, so
    the overlay is applied where `validate_all_with_full_options` already
    loads the sibling `manifest.json`, rather than as a graph-cascade section.

- [#1389](https://github.com/adobe/spectrum-design-data/pull/1389) [`e0300ab`](https://github.com/adobe/spectrum-design-data/commit/e0300ab6167bc237c83d9d45885a10405c10b974) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a platform manifest add, override, or remove Component/Token
  Relationship (CTR) entries via a new `extensions.relationships` section
  (bead spectrum-design-data-h890.23.3), continuing the cascade parity work
  started for components/platformExtensions in h890.22.
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
    gains `relationships` (array of `relationship.schema.json` items, or
    `{op: "override"|"remove", uuid, value?}` targeting entries).
  - **packages/design-data-spec/spec/manifest.md**: capability matrix and a
    new `extensions.relationships` subsection document the identity model —
    add is positional, override/remove require a `uuid` since relationships
    have no other stable key.
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` adds a guarded
    section handling add/override/remove, reusing the existing
    `RelationshipRecord`. Add always appends, even on a `uuid` collision;
    override/remove require an explicit `uuid` or error.

## 0.6.0

### Minor Changes

- [#1380](https://github.com/adobe/spectrum-design-data/pull/1380) [`cc15f52`](https://github.com/adobe/spectrum-design-data/commit/cc15f524d616e7fe602fa7445950ec89ec7a7279) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a platform manifest carry component specs and platform-extension states
  as first-class, cascade-consumable sections, not just tokens — the first
  step in externalizing iOS-specific design data while keeping iOS capability
  in the monorepo (bead spectrum-design-data-h890.22).
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
    gains `components` (array of `component.schema.json` items) and
    `platformExtensions` (array of `platform-extension.json` items).
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` adds two guarded
    sections — `extensions.components` add-or-replaces into the component
    catalog by name; `extensions.platformExtensions` add-or-replaces by
    `(platform, extends)` and rejects a `termId` that doesn't exist in the
    referenced base registry.

- [#1376](https://github.com/adobe/spectrum-design-data/pull/1376) [`adf5595`](https://github.com/adobe/spectrum-design-data/commit/adf55951bf3c753f5c448d869c04959cc229bf6b) Thanks [@GarthDB](https://github.com/GarthDB)! - Schema-validate `extensions.tokens` in the platform manifest, closing a gap
  where malformed extension tokens (bad `$schema`, missing `name`) previously
  failed silently or downstream instead of at manifest-validation time (closes
  bead spectrum-design-data-9osr).
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions.tokens`
    now references `cascade-file.schema.json`, so entries must match the same
    cascade token shape as `token.schema.json`.
  - **sdk/core/src/schema.rs**: `SchemaRegistry::validate_manifest` now registers
    sibling schemas (`token.schema.json`, `cascade-file.schema.json`,
    `value-types/*`) via `collect_schema_resources`, so the new cross-schema
    `$ref` resolves offline instead of erroring.

## 0.5.0

### Minor Changes

- [#1365](https://github.com/adobe/spectrum-design-data/pull/1365) [`a7d3693`](https://github.com/adobe/spectrum-design-data/commit/a7d369357d997fa3f678225a220d26e5cb7f81ee) Thanks [@GarthDB](https://github.com/GarthDB)! - Enforce cascade type-safety on manifest overrides targeting alias-only tokens.
  - **sdk/core/src/graph.rs**: `resolve_override_targets` now resolves the shadowed
    token's value through its alias chain (`TokenRecord::resolve_leaf`) instead of
    only reading a literal `value`, so an override that changes a `$ref`-aliased
    token's value type (e.g. color → dimension) is rejected like the existing
    literal-value case, instead of silently applying.

- [#1367](https://github.com/adobe/spectrum-design-data/pull/1367) [`fdff7f5`](https://github.com/adobe/spectrum-design-data/commit/fdff7f5af05b19e61ecb6d20c87df0b77445109b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a standalone `validate-manifest` CLI subcommand (closes bead spectrum-design-data-h890.5).
  - **sdk/cli/src/main.rs**: new `validate-manifest [PATH] [--manifest FILE] [--format]`
    subcommand — validates a configured Layer 2 platform manifest (Layer 1 schema shape +
    apply-time cascade checks) with CI-friendly exit codes, without running a query.
  - **sdk/core/src/data_source/mod.rs**: `CliPathOverrides` gains a `platform_manifest`
    override so the manifest can be supplied on the command line, winning over the
    `.design-data.toml` `manifest` key.

### Patch Changes

- [#1360](https://github.com/adobe/spectrum-design-data/pull/1360) [`4b841f2`](https://github.com/adobe/spectrum-design-data/commit/4b841f2dba5089bd37f96afd6c22d98c93401f62) Thanks [@GarthDB](https://github.com/GarthDB)! - Load tokens from the resolved `[source]` for `query`/`resolve`/legacy-output-cascaded (h890.19).
  - **sdk/cli/src/main.rs**: `run_query`, `run_resolve`, and
    `run_migrate_legacy_output_cascaded` now load the dataset from
    `resolved.tokens_root` (an explicit PATH argument still wins) instead of always
    reading the raw CWD, so a `.design-data.toml` `[source]` block actually takes
    effect — matching the pattern already used by `run_primer`/`run_cache_build`.

- [#1366](https://github.com/adobe/spectrum-design-data/pull/1366) [`30a282c`](https://github.com/adobe/spectrum-design-data/commit/30a282c7c6493188cc6370e20be5eb3bd783048c) Thanks [@GarthDB](https://github.com/GarthDB)! - Ship spec schemas in the GitHub tarball so manifest Layer-1 validation runs (closes bead h890.4).
  - **sdk/core/src/data_source/fetch.rs**: `should_extract` now retains
    `packages/design-data-spec/schemas/**`, which was previously dropped during
    tarball extraction of a fetched foundation.
  - **sdk/core/src/manifest.rs**: `apply_configured` now errors when a platform
    manifest is configured but `manifest.schema.json` cannot be located, instead of
    silently skipping Layer 1 validation.
  - **sdk/core/src/data_source/embedded.rs**: the embedded fallback snapshot (used
    outside a monorepo checkout, with no fetched or local source) now also bakes in
    `manifest.schema.json`, so the new guard above doesn't newly break that path.

- [#1363](https://github.com/adobe/spectrum-design-data/pull/1363) [`01e7a9c`](https://github.com/adobe/spectrum-design-data/commit/01e7a9cce239d42167dc88fdc998c3a87413c1dd) Thanks [@GarthDB](https://github.com/GarthDB)! - Load tokens from the resolved `[source]` for `validate`/`dump-legacy-keys` (h890.20).
  - **sdk/cli/src/main.rs**: `run_validate` and `run_dump_legacy_keys` now load the
    dataset from `resolved.tokens_root` (an explicit PATH argument still wins)
    instead of always reading the raw CWD, so a `.design-data.toml` `[source]`
    block actually takes effect — matching the pattern already used by
    `run_query`/`run_resolve`/`run_migrate_legacy_output_cascaded` (h890.19).

## 0.4.5

### Patch Changes

- [#1358](https://github.com/adobe/spectrum-design-data/pull/1358) [`46a5a8b`](https://github.com/adobe/spectrum-design-data/commit/46a5a8baf54063697b476c90196adf186231654b) Thanks [@GarthDB](https://github.com/GarthDB)! - Expose legacy-name decomposition for platform-manifest tooling (closes h890.8).
  - **sdk/cli/src/main.rs**: new `decompose-legacy-name` subcommand (exposes
    `naming::parse_legacy_name`/`roundtrips`) and `dump-legacy-keys` subcommand
    (exposes `naming::extract_legacy_key` per token, undeduped) so external
    importers can resolve legacy slugs without reimplementing the algorithm.

- [#1358](https://github.com/adobe/spectrum-design-data/pull/1358) [`46a5a8b`](https://github.com/adobe/spectrum-design-data/commit/46a5a8baf54063697b476c90196adf186231654b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `migrate legacy-output-cascaded` for feeding classic-schema consumers (e.g. iOS
  tokentool) from a manifest-resolved dataset (h890.10).
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` overrides now replace the
    targeted Foundation-layer record in place instead of shadowing it under a
    synthetic key, so every graph consumer (not just this new command) sees one
    deterministic record per token.
  - **sdk/cli/src/main.rs**: new `migrate legacy-output-cascaded [PATH] --output FILE`
    applies the configured platform manifest cascade before converting to legacy
    schema.
  - **sdk/core/src/legacy.rs**: new `convert_records` entry point converts an
    already-cascaded in-memory array; `build_mode_entry`'s `$schema` fallback for
    schema-less override records now matches alias-ness instead of copying an
    unrelated sibling's schema, and no longer matches the token being processed.

- [#1356](https://github.com/adobe/spectrum-design-data/pull/1356) [`33225fb`](https://github.com/adobe/spectrum-design-data/commit/33225fb76a313247bcd054a6ef21eb6dbeb7ebbc) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix manifest overrides silently no-oping when targeted by a token's legacy slug.
  - **sdk/core/src/graph.rs**: `resolve_override_targets` now resolves non-query
    `target` values through `resolve_alias_key` (uuid → graph key → legacy-name
    index) instead of a partial uuid/direct-key-only lookup, so overrides written
    against legacy names (e.g. `blue-100`) actually apply.

## 0.4.4

### Patch Changes

- [#1285](https://github.com/adobe/spectrum-design-data/pull/1285) [`7652ef9`](https://github.com/adobe/spectrum-design-data/commit/7652ef92131342c3c2b8c3c1f3371f31ddc62fa8) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix `nameObject`/`raw`/`value` serializing as a JS `Map`, rendered as `{}` by
  `JSON.stringify`.
  - **sdk/wasm/src/types.rs**: added `#[tsify(hashmap_as_object)]` to the
    wasm-boundary result types so nested JSON fields cross as plain objects.

## 0.4.3

### Patch Changes

- [#1284](https://github.com/adobe/spectrum-design-data/pull/1284) [`6acda22`](https://github.com/adobe/spectrum-design-data/commit/6acda2204f29884a09760076357ddd89954889f5) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixed `Dataset.suggest()` returning raw `"<file>:<index>"` graph keys as
  `tokenName` for cascade-format tokens instead of the readable legacy name,
  since it skipped the `display_name()` derivation every other surface (diff,
  TUI wizard) already uses.
  - **sdk/wasm/src/types.rs**: `SuggestResult::from` now derives `token_name`
    via `SuggestionResult::display_name()`.

## 0.4.2

### Patch Changes

- [#1271](https://github.com/adobe/spectrum-design-data/pull/1271) [`df80f34`](https://github.com/adobe/spectrum-design-data/commit/df80f347baa0a9ae056804232228ae9fe3e55fae) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixes a packaging bug where the `@adobe/design-data-wasm` npm tarball omitted
  the nested `pkg/node/package.json` and `pkg/web/package.json` files. Without
  them, Node's ESM/CJS module-type resolution incorrectly inherited
  `"type": "module"` from the wasm package root, causing every real consumer's
  `import("@adobe/design-data-wasm")` to crash with `ENOENT: no such file or
directory, open './design_data_wasm_bg.wasm'`. The previously published
  `0.4.0` is permanently broken and unusable — this releases a fixed version and
  republishes the two dependents against it.
  - **@adobe/design-data-wasm**: fix the `files` allowlist to include the
    per-target `package.json` manifests.
  - **@adobe/design-data-agent-mcp**: bump `@adobe/design-data-wasm` dependency
    to the fixed version.
  - **@adobe/design-data**: bump `@adobe/design-data-wasm` dependency to the
    fixed version.

## 0.4.0

### Minor Changes

- [#1147](https://github.com/adobe/spectrum-design-data/pull/1147) [`cece05d`](https://github.com/adobe/spectrum-design-data/commit/cece05de03dd8b43cfeb697d045eb4302a34b26c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix set-level alias resolution in `resolve_reference` after cache reload.
  - **`sdk/core/src/graph.rs`**: add `set_uuid_index` (set_uuid → all children) populated in
    all graph builders and `rebuild_uuid_index`; add `resolve_set_in_context` and
    `resolve_alias_in_context` for context-aware chain walking through set-level UUID aliases.
  - **`sdk/core/src/cascade.rs`**: extract `resolve_reference(graph, slug, ctx)` as a
    testable core function with deterministic tie-breaking and graceful dangling-ref handling.
  - **`sdk/wasm/src/dataset.rs`**: delegate `resolveReference` to the core function;
    remove spike-status comment.
  - **`packages/design-data-spec/conformance/reference/`**: 4 new fixture-driven
    conformance cases (set-alias-light, set-alias-dark, dangling-ref, unknown-slug).
  - **`sdk/wasm/test/parity.test.js`**: 7 new parity tests (wireframe, scale, set-alias
    regression, dangling-ref degradation, stable tie-break).
  - **`docs/s2-tokens-viewer/scripts/resolve.mjs`**: remove JS fallback (now redundant);
    `wasm: 9062 | fallback: 0 | missing: 0`.

## 0.3.0

### Minor Changes

- [#1143](https://github.com/adobe/spectrum-design-data/pull/1143) [`f829426`](https://github.com/adobe/spectrum-design-data/commit/f8294264fdcc5905a8d33dbdde391d8d452597b6) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): expose Dataset.suggest() on wasm surface; swap MCP suggest to wasm.
  - **sdk/wasm/src/types.rs**: add `SuggestResult` DTO (camelCase tsify) and
    `SuggestResultArray` wrapper; `From<SuggestionResult>` conversion.
  - **sdk/wasm/src/dataset.rs**: add `Dataset.suggest(intent, propertyHint, limit)`
    binding over `design_data_core::suggest::suggest` — Jaccard scoring in-process,
    no full token allocation on the JS side.
  - **tools/design-data-mcp**: replace `ds.query("") + scoreTokensByKeyword` with
    `ds.suggest(intent, undefined, limit)`; remove dead `scoreTokensByKeyword` export.
    Output shape changes to the richer Rust shape (`tokenName`, `file`, `layer`,
    `nameObject`, `value`, `confidence`, `tokenUuid`).

## 0.2.0

### Minor Changes

- [#1141](https://github.com/adobe/spectrum-design-data/pull/1141) [`87f07af`](https://github.com/adobe/spectrum-design-data/commit/87f07af51cfdaa80788e943cd948232d78e6cfd7) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): expose Dataset.suggest() on wasm surface; swap MCP suggest to wasm.
  - **sdk/wasm/src/types.rs**: add `SuggestResult` DTO (camelCase tsify) and
    `SuggestResultArray` wrapper; `From<SuggestionResult>` conversion.
  - **sdk/wasm/src/dataset.rs**: add `Dataset.suggest(intent, propertyHint, limit)`
    binding over `design_data_core::suggest::suggest` — Jaccard scoring in-process,
    no full token allocation on the JS side.
  - **tools/design-data-mcp**: replace `ds.query("") + scoreTokensByKeyword` with
    `ds.suggest(intent, undefined, limit)`; remove dead `scoreTokensByKeyword` export.
    Output shape changes to the richer Rust shape (`tokenName`, `file`, `layer`,
    `nameObject`, `value`, `confidence`, `tokenUuid`).

## 0.1.0

### Minor Changes

- [#1138](https://github.com/adobe/spectrum-design-data/pull/1138) [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb) Thanks [@GarthDB](https://github.com/GarthDB)! - Extract portable domain logic from cli/tui/wasm into core; fix wasm resolve bug.
  - **wasm Dataset::resolve()**: delegates to `cascade::resolve_property`, fixing a
    latent bug where Platform-layer overrides did not beat Foundation tokens.
  - **core::authoring::draft**: `derive_token_key_from_parts` unifies TUI and MCP key
    assembly under one rule and fallback.
  - **core::component** (new): `validate_id`, `lookup`, `list` for disk-backed
    component lookup; feeds MCP `describe_component`.
  - **core::write**: `build_product_context_doc`, `merge_product_context_rationale`,
    `layer_target_filename`.
  - **core::cascade**: `parse_resolve_context`, `apply_restrictions`.
  - **core::graph**: `TokenGraph::infer_schema_url`.
  - **core::query**: `subsequence_score` (from TUI fuzzy.rs).
  - **core::validate**: `validate_catalog_dir`, `validate_catalog_schemas`.
  - **core::figma::mapping**: `summarize_variables`, `CollectionSummary`.

- [#1138](https://github.com/adobe/spectrum-design-data/pull/1138) [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `Dataset.primer()` to the wasm surface with full parity to the CLI payload.
  - **sdk/core/src/primer.rs** (new): shared `build()`, `PrimerData` structs, `SPEC_VERSION`.
    CLI and wasm now share primer assembly — no duplication.
  - **sdk/core/src/graph.rs**: `TokenGraph` gains `fields: Vec<FieldRecord>` and
    `manifest: serde_json::Value`; new `load_spec_fields()` and `with_fields()` helpers.
  - **sdk/core/src/cache/mod.rs**: schema v3 — new `FIELDS` ordinal table and `manifest`
    META key so fields and manifest survive blob round-trips.
  - **sdk/wasm/src/dataset.rs**: `Dataset.primer()` returns the standard primer shape
    `{ specVersion, tokenCount, modeSets, components, taxonomyFields, manifest, provenance }`.
  - **sdk/wasm/moon.yml**: `cache-build` adds `--fields-path` so embedded blob carries fields.

## 0.0.2

### Patch Changes

- [#1132](https://github.com/adobe/spectrum-design-data/pull/1132) [`9571455`](https://github.com/adobe/spectrum-design-data/commit/95714559f7598a74eb76513283ffc0ce9ec7d3fe) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix CI and apply post-review cleanups to `@adobe/design-data-wasm`.
  - **sdk/wasm/moon.yml**: add `local: true` to `cache-build` so moon CI skips it;
    the task is manual-only (embedded feature is disabled by default).
  - **.github/workflows/ci.yml**: use `dtolnay/rust-toolchain@1.88.0` tag form — removes
    the redundant `toolchain:` input and makes the pinned version self-evident.
  - **sdk/wasm/src/registry.rs**, **dataset.rs**: simplify `map_err(|e| js_err(e))` →
    `map_err(js_err)` at nine call sites.
  - **sdk/wasm/src/dataset.rs** (`resolve`): add NOTE comment on per-call sub-graph clone.
  - **sdk/wasm/src/types.rs** (`ValidationResult::from`): clarify intentional double-filter
    of `ValidationReport.errors` for error vs. warning split.
  - **sdk/wasm/README.md**: document that the `default` export condition resolves to the
    web build, requiring `await init()` in Deno/Bun and non-standard bundlers.
  - **sdk/wasm/test/parity.test.js**: add two tests asserting `fromTokens` throws on
    non-array input (plain object, string) rather than panicking.
  - **sdk/wasm/LICENSE**: correct appendix copyright to `Copyright 2026 Adobe` — matches
    the Apache-2.0 canonical template and Adobe's own OSS convention (e.g. react-spectrum).
