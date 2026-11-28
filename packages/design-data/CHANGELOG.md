# @adobe/spectrum-design-data

## 0.0.0-tp-check-20261128031303

### Minor Changes

- [#2235](https://github.com/adobe/spectrum-design-data/pull/2235) [`ba2c840`](https://github.com/adobe/spectrum-design-data/commit/ba2c840e9fc8ab1b601244fc17b94f83aa27b74d) Thanks [@GarthDB](https://github.com/GarthDB)! - Draw the list-view focus ring on one row, not every row.
  - New `isFocusVisible` option, per row as `items[].isFocusVisible`. The name follows the React
    Spectrum S2 ListView item render prop of the same name. The `focus-indicator` ring is present
    only for a row that sets it; with no row set, no ring is drawn.
  - The `keyboard-focus` state no longer draws the ring. It still applies the background and text
    color to every row, as before.
  - The ring still uses the existing focus-indicator color, thickness and gap records. The
    description stays under the checkbox and a multiple-selection row stays 48 px.
  - Not verified against Figma: the Figma list view focus spec was not checked here.

- [#2239](https://github.com/adobe/spectrum-design-data/pull/2239) [`0503e40`](https://github.com/adobe/spectrum-design-data/commit/0503e4088e2ec41def198bf88d5e6707da3cf5cd) Thanks [@GarthDB](https://github.com/GarthDB)! - Add visual recipes for date-field, time-field and segmented-text-field.
  - Each component gains a `segments` collection slot: the request supplies the segments (a
    value, a separator, or an empty segment that shows its format text) and the recipe draws
    one copy of the `segment` part per entry. Nothing builds them from the granularity, the
    hour cycle or the locale.
  - date-field and time-field reuse the text-field chrome: label, bordered field, help text,
    the four sizes, the border and text colors for hover, focus, error and disabled, the focus
    ring and the alert icon. New relationship records point at the same tokens. The fields gain
    the `focus` state and the options `label`, `size`, `necessityIndicator`, `isRequired`,
    `helpText`, `isPlaceholder` and `isLiteral`.
  - segmented-text-field draws only the row of segments, with no field chrome.
  - Segment rounding and padding come from the existing segmented-text-field rounding
    and `spacing-50` records. Deprecated records are not bound.
  - Not drawn yet: the error icon inside the field, and the focused segment's own fill (no
    token). The explorer shows one empty segment until `demo` can describe a collection slot.

- [#2233](https://github.com/adobe/spectrum-design-data/pull/2233) [`cb17ae3`](https://github.com/adobe/spectrum-design-data/commit/cb17ae3eeb4f1293c2e4e713283d58fcc96abb76) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the visual recipes for drop-zone and select-box.
  - drop-zone: a dashed container (the stroke reads the dash length and gap relationship records),
    corner radius, padding, width, border color, the illustration image fill, title and description.
    The component gains `title` and `description` string options. The gap between illustration and
    title reads its relationship record. The `s`, `m` and `l` sizes render identically today (no
    size-varying tokens).
  - select-box: a vertical or horizontal card with corner radius, padding, background (and the
    disabled background), the hover, keyboard-focus and rest shadows, the down press scale, the
    illustration image fill and the label. The illustration part is present unless
    `hideIllustration` is set.
  - Description font-size records for drop-zone name the token of their own scale, as the
    illustrated-message title records do.
  - Not drawn yet: the drag-and-drop border and background (the 10% background cannot be drawn: no
    fill alpha), the replace banner and action button, a disabled drop zone, the select-box selected
    border (two records resolve to different colors), checkbox, description and focus ring, and the
    illustration itself (no size record).
  - Legacy output is unchanged; the embedded dataset changes, so wasm gets a patch.

### Patch Changes

- [#2238](https://github.com/adobe/spectrum-design-data/pull/2238) [`5e583a8`](https://github.com/adobe/spectrum-design-data/commit/5e583a8cd69e218987bba2e272664d5f356bf622) Thanks [@GarthDB](https://github.com/GarthDB)! - Raise the dataset `requires.cli` from 0.63.8 to 0.63.9, the oldest released CLI
  that draws and checks this data.
  - Older CLIs now refuse the data with a `requires.cli` message instead of misreading it.
    The list-view, takeover-dialog and illustrated-message recipes, the per-axis aria checks
    (`axisAria`) and the inline collection item semantics lint (SPEC-118) are in the 0.63.9
    binary only.
  - `layoutRevision` stays at 8. No recipe, data or engine change.

## 4.9.0

### Minor Changes

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

### Patch Changes

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

- [#2207](https://github.com/adobe/spectrum-design-data/pull/2207) [`1d15af6`](https://github.com/adobe/spectrum-design-data/commit/1d15af6649c9608a16a5da0831080140c1788c5e) Thanks [@GarthDB](https://github.com/GarthDB)! - Drop `maximum: 5` from the Rating `value` option, which conflicted with the
  configurable `maxValue` option (default 5). `multipleOf: 0.5` stays as display precision.

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

- [#2199](https://github.com/adobe/spectrum-design-data/pull/2199) [`3839b90`](https://github.com/adobe/spectrum-design-data/commit/3839b90d11459e815ab2665495fa6700825f9f45) Thanks [@GarthDB](https://github.com/GarthDB)! - Raise the dataset `requires.cli` from 0.63.7 to 0.63.8, the released CLI that reads this data.
  - Older CLIs now refuse the data with a `requires.cli` message instead of misreading it.
    The `scope.ordinal` identity field (SPEC-125) and the spec-sheet plugin are in the 0.63.8
    binary only, so older CLIs cannot load datasets that use `scope.ordinal` (avatar is the first).
  - `layoutRevision` stays at 8. No recipe, data or engine change.

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

## 4.8.0

### Minor Changes

- [#2191](https://github.com/adobe/spectrum-design-data/pull/2191) [`36b0fcb`](https://github.com/adobe/spectrum-design-data/commit/36b0fcb5be3f5a56fc6823d87b5f2f801f71a968) Thanks [@GarthDB](https://github.com/GarthDB)! - Collection items can carry accessibility state, key steps can address an item, and a group with no
  `traversal` ignores `navigate-*`.
  - An inline collection item takes `semantics` (same shape as a contract's). A vector reads them with
    the new `expect.itemAria` (per item).
  - An `input` step takes `item`: the key resolves through the role of that item's part and the
    intents run on that item.
  - A collection with no `traversal` declares no navigation; `navigate-*` on its group does nothing.
  - Accordion headers expose `aria-expanded` from the `expanded` facet; three vectors pin it and the
    no-navigation rule.

- [#2192](https://github.com/adobe/spectrum-design-data/pull/2192) [`f9f6c7b`](https://github.com/adobe/spectrum-design-data/commit/f9f6c7b7fef02225ed6df7d5cb45237f6e6d6622) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the `value`, `minValue`, `maxValue` and `step` options to the number-field component.
  - `value` is a number and `step` is a number that defaults to 1. `minValue` and `maxValue`
    are numbers with no default, because a number field has no built-in bounds (slider defaults
    them to 0 and 100).
  - The options match the slider declarations, and the number-field recipe lists the four in
    `notVisual`, so renders are unchanged. The spec sheet options table gains four rows.
  - `isReadOnly` is not added here; it follows later for the text-entry components and slider.
  - The legacy `@adobe/spectrum-tokens` output is unchanged.

### Patch Changes

- [#2181](https://github.com/adobe/spectrum-design-data/pull/2181) [`33a62fc`](https://github.com/adobe/spectrum-design-data/commit/33a62fc9e19a840655b6a07320a399645c4dfa48) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove 17 misfiled `Step text` and `Step visual` records from the action-bar
  relationships. Each `$ref` already has a record in `steplist.json` with the
  proper `label`, `visual` or `track` part. The records had no legacy key and
  nothing referenced them, so the legacy `@adobe/spectrum-tokens` output is
  byte-identical. Action-bar now reads L2 (was L1). The embedded relationships
  change, hence the wasm patch.

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

- [#2186](https://github.com/adobe/spectrum-design-data/pull/2186) [`13bcdc5`](https://github.com/adobe/spectrum-design-data/commit/13bcdc59c1425704da0ec63bf7d480c5f66472a0) Thanks [@GarthDB](https://github.com/GarthDB)! - Raise the dataset `requires.cli` from 0.63.6 to 0.63.7, the released CLI that reads this data.
  - Older CLIs now refuse the data with a `requires.cli` message instead of misreading it.
    The behavior contracts (collection block, accordion, swatch, tooltip, group and display
    contracts), the behavior runner and the registry facets are in the 0.63.7 binary only.
  - `layoutRevision` stays at 8. No recipe, data or engine change.

## 4.7.0

### Minor Changes

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

- [#2165](https://github.com/adobe/spectrum-design-data/pull/2165) [`9fe574d`](https://github.com/adobe/spectrum-design-data/commit/9fe574d74025256d5cac834679c922ddd1e7a56f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add behavior contracts for the group components.
  - Data: contracts for Button group, Swatch group, Checkbox group and
    Avatar group: a `container` part with `focus: none` and the role the
    component declares (Checkbox group declares none, so none is carried),
    the `orientation` and `disabled` facets where the options exist, and
    vectors with `pins`. Item behavior stays in the item contracts.
  - No accessibility block, format, runner or CLI change; renders and spec
    sheets are unchanged. Open questions are beads under hd0g.4.

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

- [#2166](https://github.com/adobe/spectrum-design-data/pull/2166) [`6e41b8e`](https://github.com/adobe/spectrum-design-data/commit/6e41b8e3231c197d72d751d0fd9554fe478c02ca) Thanks [@GarthDB](https://github.com/GarthDB)! - Declare role `group` for the Checkbox group.
  - Data: the Checkbox group `accessibility` block gains `role: "group"` (the only
    block change; nothing else in any block changes) and its behavior contract
    carries the same role on the `container` part, pinned in its conformance suite.
    Spec sheets and renders are unchanged: Checkbox group has no spec sheet.
  - The contract still carries no arrow-key navigation: the usage prose says arrows
    move focus, while React Spectrum S2 and Web Components give each checkbox its
    own tab stop. This is an open decision (hd0g.4.15), not modeled.
  - The wasm package embeds the contract, so it ships the changed data.

### Patch Changes

- [#2168](https://github.com/adobe/spectrum-design-data/pull/2168) [`a8a24d2`](https://github.com/adobe/spectrum-design-data/commit/a8a24d29a699a6bed5677050e24de236e3b4e72d) Thanks [@GarthDB](https://github.com/GarthDB)! - Correct the Checkbox group keyboard text: no arrow-key navigation.
  - Each checkbox is its own tab stop; Tab and Shift + Tab move between them.
  - The arrow keys, Page Up/Down and Home/End rows are removed: React Spectrum S2 and
    Web Components do no roving focus in a checkbox group.
  - Data text only. No render or spec sheet changes.

- [#2175](https://github.com/adobe/spectrum-design-data/pull/2175) [`5f0cdaf`](https://github.com/adobe/spectrum-design-data/commit/5f0cdafd9ff88a89df8e0afb1dfca63072fe24da) Thanks [@GarthDB](https://github.com/GarthDB)! - Correct the Checkbox keyboard text: no group focus handling.
  - Each checkbox is its own tab stop; Tab and Shift + Tab move between them.
  - Removes "Tabbing into a group places the focus on the first checkbox".
  - Data text only. No render or spec sheet changes.

- [#2179](https://github.com/adobe/spectrum-design-data/pull/2179) [`a1f1b76`](https://github.com/adobe/spectrum-design-data/commit/a1f1b76b9d71353b17afb51de938cd09ad86ee80) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove the unused composite states `focus-+-hover` and `focus-+-not-hover` from the
  date-field, time-field and tag-field component declarations. No relationship, recipe
  or visual uses them there, so renders and spec sheets are unchanged. The other field
  components keep them: pinning `focus` there changes which record keyboard-focus
  renders select.

- [#2170](https://github.com/adobe/spectrum-design-data/pull/2170) [`2db54c1`](https://github.com/adobe/spectrum-design-data/commit/2db54c11a255a8425466b50901f39e4b6aed82fc) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate body and heading relationship records to structured identity (level 2). The status check
  now reads level 3 for both (the recipe check is not applicable: one anatomy part, `text`, and no
  recipe). The legacy `@adobe/spectrum-tokens` output is byte-identical.
  - All 119 live records already had `scope.part: text`. Ten identities (property, part) mixed
    records with `context: "Text"` and records with no `context`. The 101 `Text` records lose that
    `context` (37 in body, 64 in heading), so each identity has one authored context. The 15
    context-less records, which other components reference by uuid as scoped tokens, are not
    touched. No uuid, `legacyKey`, `$ref`, option or `contextRole` changes; deprecated records are
    untouched.
  - Spec sheets for body and heading change shape: the 37 and 64 records that sat in one `Text`
    block now sit in per-property blocks with their siblings. Every record still appears once.
    Renders and every other component's sheet are unchanged.

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

- [#2162](https://github.com/adobe/spectrum-design-data/pull/2162) [`2ea6a24`](https://github.com/adobe/spectrum-design-data/commit/2ea6a246ae569a68facce12ae4440f81f59e5ce6) Thanks [@GarthDB](https://github.com/GarthDB)! - Raise the dataset `requires.cli` from 0.63.5 to 0.63.6, the released CLI that draws this data.
  - Older CLIs now refuse the data with a `requires.cli` message instead of drawing it wrongly.
    0.63.5 reads `inherit` contentColor as cornerRadius and ignores strokeDash, per-side stroke
    properties, the new recipe features, and the color-slider and color-area defaults.
  - `layoutRevision` stays at 8. No recipe, data or engine change.

## 4.6.0

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

- [#2147](https://github.com/adobe/spectrum-design-data/pull/2147) [`6d455ab`](https://github.com/adobe/spectrum-design-data/commit/6d455abbccf06bba76ab55ea12aef8f431894a03) Thanks [@GarthDB](https://github.com/GarthDB)! - A nested `component` part can list `inherit: ["contentColor"]`: its icon and
  text parts take the color of the host root's first icon or text child instead
  of their own. The tag's clear button uses it, so the cross is drawn in the
  label's color in every selected, emphasized and color scheme look (#2120).

## 4.5.0

### Minor Changes

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

## 4.4.0

### Minor Changes

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

## 4.3.0

### Minor Changes

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

## 4.2.0

### Minor Changes

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

- [#2069](https://github.com/adobe/spectrum-design-data/pull/2069) [`e356cda`](https://github.com/adobe/spectrum-design-data/commit/e356cda6155f3db35a4db4cabbe9f52fa59d2f83) Thanks [@GarthDB](https://github.com/GarthDB)! - In-field button, coach indicator, standard panel and bar panel: first visual recipes.
  - In-field button draws a square (16, 20, 24 or 32 px) with a gray-100 fill, a gray-200 hover
    fill, a disabled look and a content icon.
    The component gains `size`, `isDisabled` and the `hover` state.
    Its four stacked-width records now use the sizes `s`, `m`, `l` and `xl`.
  - Coach indicator draws a static frame of the ring: 4 px and full strength collapsed, 8 px and 20%
    expanded, white or the default color, around a target with any `cornerRounding`.
  - Standard panel draws the gripper, title, nested close button and divider, and an accordion in
    its slot, in primary and secondary style, three densities and the anchored, floating and dragged
    types.
    The anatomy gains `header-area` and `content`, and the content slot accepts an accordion. The
    dragged gripper record is pinned to `type: dragged`.
  - Bar panel draws the gripper, action buttons and divider, vertical or horizontal, in five
    densities. The component gains `style`, `density`, `orientation`, `isFloating`, `hideDragHandle`
    and `hideDivider`.
  - Not drawn yet: panel drop shadows, the back button, the second ring of the expanded coach
    indicator, the stacked and quiet in-field button, the gripper as an icon (a plain box).

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

- [#2066](https://github.com/adobe/spectrum-design-data/pull/2066) [`93d07ba`](https://github.com/adobe/spectrum-design-data/commit/93d07ba3f9b8b7f531e131614c1d1e5a35d018a7) Thanks [@GarthDB](https://github.com/GarthDB)! - Bind the status light label line height per size to the px line-height tokens instead of the 1.3
  ratio: 16, 18, 20 and 22 px on desktop, 20, 22, 24 and 26 px on mobile (S, M, L, XL). This matches
  the Figma Web POC, React Spectrum S2 and SWC. Rendered label heights change by +0.4, -0.2, -0.8
  and -1.4 px on desktop and by +0.5, -0.1, -0.7 and -2.6 px on mobile. Fixes #1756.

## 4.1.0

### Minor Changes

- [#2054](https://github.com/adobe/spectrum-design-data/pull/2054) [`3e55d13`](https://github.com/adobe/spectrum-design-data/commit/3e55d131306f367fc4c4e808bc6a3c12feb8a6cb) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(design-data): accordion headingLevel option and per-item isDisabled
  - Add the `headingLevel` option to accordion (integer 1 to 6, default 3).
    It matches React Spectrum S2 `AccordionItemTitle` `level`.
    It is an accessibility value and changes no render.
  - Add `isDisabled` (boolean, default false) to the accordion `items[]`
    entries, matching S2 `AccordionItem`.
  - List `headingLevel` in the accordion visuals `notVisual`.
  - The accordion visuals still read the component-level `isDisabled`.
    Drawing one disabled item needs the engine to read `items[].isDisabled`.

- [#2053](https://github.com/adobe/spectrum-design-data/pull/2053) [`9d4a10c`](https://github.com/adobe/spectrum-design-data/commit/9d4a10c0ceb37513db3985e24a23022004fd7204) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the status light label wrap and dot size.
  - The label now wraps like the switch, checkbox and radio button (#2047).
  - The dot binds the `ui-icon` size tokens on both scales (#2046). Small is 8px
    desktop and 10px mobile again.
  - The Extra-large dot is 16px desktop and 18px mobile (`ui-icon-2x-large`), up
    from 14px and 16px (#1798).
  - The deprecated `status-light-dot-size-small` now points to
    `ui-icon-extra-small` (`renamed` in `@adobe/spectrum-tokens`).

## 4.0.0

### Major Changes

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

### Minor Changes

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

- [#2039](https://github.com/adobe/spectrum-design-data/pull/2039) [`f563f96`](https://github.com/adobe/spectrum-design-data/commit/f563f96ff5aef38caa8c892263495bd6efbd76c2) Thanks [@GarthDB](https://github.com/GarthDB)! - Color handle and color loupe: first visual recipes.
  - The handle draws a 16px circle (32px on keyboard focus, 20 and 40px on mobile) with the sampled
    `color` over an opacity checkerboard, a 2px white ring, a dark outer border and a disabled look.
    The loupe draws its sampled color over the checkerboard with a 2px white border and a 1px inner
    border. Both are drawn in light, dark and wireframe, on desktop and mobile.
  - Sizes, colors and border widths come from the relationships. The border width records of both
    components now carry `attribute: border`, like the swatch, so the outer and inner position pins
    select the right width.
  - The loupe binds its white border and inner border by token name because its records still alias
    palette tokens deprecated in 15.6.0.
  - Not drawn yet: the loupe above the handle (`isOpen`) and its offset, the teardrop shape of the
    loupe (drawn as a rounded box), the loupe drop shadow, the handle inner border over the fill,
    the handle drop shadow.

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

- [#2034](https://github.com/adobe/spectrum-design-data/pull/2034) [`c37b680`](https://github.com/adobe/spectrum-design-data/commit/c37b6809884cac367c148b2f1f9e3d72c81ad407) Thanks [@GarthDB](https://github.com/GarthDB)! - Add 15 Title and Body composite typography tokens (Title xs to xxxl,
  Body xxs to xxxl), built from the per-axis aliases in `title.json` and
  `body.json`. They set `excludeFromLegacy`, so legacy output is unchanged.
  - Register the `title` and `body` typography-role variants.
  - Add type-style records for the in-line-alert title and description.

### Patch Changes

- [#2040](https://github.com/adobe/spectrum-design-data/pull/2040) [`b836045`](https://github.com/adobe/spectrum-design-data/commit/b836045680bb838600769ba506e72bbdbb529c53) Thanks [@GarthDB](https://github.com/GarthDB)! - Identity migration for clear-button, close-button, link, in-field-progress-circle,
  progress-circle and divider. All six reach level 2. The legacy `@adobe/spectrum-tokens` output is
  byte-identical. opacity-checkerboard stays at level 1 (it needs an owner decision).
  - clear-button and close-button: `component-height-75/100/200/300` becomes `height` on the
    container with a `size` pin. Records get the parts `container`, `icon` and `focus-indicator`.
    Static-color variants share one context per identity, and the close-button background records
    get a `background` attribute.
  - link: records move to `text`, `focus-indicator` and `container`. `font-size-100`,
    `line-height-100` and `text-underline-gap` become `font-size`, `line-height` (the CJK record
    pins `script`) and `gap`.
  - progress-circle and in-field-progress-circle: records move to `track` and `fill`, and the
    legacy size and thickness records share the context of their siblings.
  - divider: records move to `line`, and `horizontal-minimum-width` and `vertical-minimum-height`
    become `minimum-width` and `minimum-height`, with the existing `orientation` pin.
  - The six recipes follow the renamed properties and contexts and render byte-identical.
  - All record uuids are kept and deprecated records are untouched.

- [#2036](https://github.com/adobe/spectrum-design-data/pull/2036) [`fcdce33`](https://github.com/adobe/spectrum-design-data/commit/fcdce330770f35d5b768566b55219d17ee2d6940) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the status-light, toast and alert-banner visual recipes to `typeStyle`.
  - Text parts bind `type-style` instead of font-family, font-weight and font-size.
  - Removed the unused font-family, font-weight, font-style and font-size
    relationship records of those text parts. Line-height records stay.
  - Geometry, fills and font attributes render identically.
  - The SVG `data-tokens` label now names the type style (for example
    `component-m-regular` instead of `font-size-100`).

## 3.31.1

### Patch Changes

- [#2030](https://github.com/adobe/spectrum-design-data/pull/2030) [`2370b99`](https://github.com/adobe/spectrum-design-data/commit/2370b994c5b72d8a51672b6310d8df77c3293b8a) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe renderer: no matching state now falls back to the default record, and a
  relationship pinned to a `scale` applies only at that scale.
  - Alert banner: the close button end spacing is bound, so the close button sits 8px
    (desktop) or 16px (mobile) in from the end edge instead of flush.
  - Dataset `layoutRevision` is now 5, since the recipe layout output changed.
  - Dataset `requires.cli` is raised to 0.62.1 (the CLI bump in this change).

- [#2029](https://github.com/adobe/spectrum-design-data/pull/2029) [`f3fa576`](https://github.com/adobe/spectrum-design-data/commit/f3fa5763b0060a71c0f9eec966078c228b38c222) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate menu relationship records to structured identity (level 2). Fused names
  (`component-height-75`, `component-edge-to-text-100`, `font-size-100`) become real properties
  with a part, a `between` and a size pin. The legacy `@adobe/spectrum-tokens` output is
  byte-identical.
  - Every live record has a part or a `between`; deprecated records and all uuids are untouched.
  - Start/end edge-to-content records split into a start-edge and an end-edge record (new v5 uuids).

- [#2031](https://github.com/adobe/spectrum-design-data/pull/2031) [`cc2bccd`](https://github.com/adobe/spectrum-design-data/commit/cc2bccd6fde88765f41ff4be282bc7dba58d8762) Thanks [@GarthDB](https://github.com/GarthDB)! - Identity migration for drop-zone, illustrated-message, coach-mark and contextual-help. All four
  reach level 2. The legacy `@adobe/spectrum-tokens` output is byte-identical.
  - drop-zone: fused banner and title properties (`component-height-300`,
    `component-edge-to-text-300`, `component-bottom-to-text-300`, `font-size-300`,
    `line-height-100`) become `height`, `padding-horizontal`, `padding-vertical`, `font-size` and
    `line-height`, with `scale` pins. The part-less `font-family` record moves to `title`. Color
    records split into `background` and `border` attributes. The two opacity records share the
    context of their sibling.
  - illustrated-message: `line-height-200` becomes `line-height`.
  - coach-mark and contextual-help: part-less `spacing` records move to the root part `container`.
    Color records get a `background` attribute.
  - All record uuids are kept and deprecated records are untouched.

- [#2033](https://github.com/adobe/spectrum-design-data/pull/2033) [`6f91b01`](https://github.com/adobe/spectrum-design-data/commit/6f91b0186b2b8907ab6ece55b4c0a5984dcc4fdb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add type-style records to status-light, toast and alert-banner.

  Each text part gets one `type-style` record that references the Component
  composite typography token: `component-{s,m,l,xl}-regular` for status-light,
  `component-m-regular` for toast and alert-banner.

  The per-axis font records and the recipes are unchanged for now, so recipe
  renders and the legacy token output stay byte-identical. Converting the
  recipes to `typeStyle` changes the `data-tokens` labels in the rendered SVG,
  so it waits for a decision on regenerating the snapshots and goldens.

## 3.31.0

### Minor Changes

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

- [#2024](https://github.com/adobe/spectrum-design-data/pull/2024) [`fd29bb7`](https://github.com/adobe/spectrum-design-data/commit/fd29bb7b5b24685c04b139207165b0bfbdc4a8a0) Thanks [@GarthDB](https://github.com/GarthDB)! - Combo box: first visual recipe.
  - The recipe draws the field label above a bordered field with the value, and the description
    below, at sizes s, m, l and xl, in light, dark and wireframe, on desktop and mobile. The field
    width comes from the `width` option, because the data has no width token.
  - States drawn: default, hover over the text area, focus, keyboard focus, disabled and invalid
    (error border). Heights, padding, radius, colors, type style, border and focus ring come from
    the combo box relationships. The label and description reuse the field-label and help-text
    recipes.
  - The value color records for focus and focus-hover are pinned to their states, so a value at
    keyboard focus no longer reports a tie. Resolved colors are unchanged.
  - Not drawn yet: the field button (no recipe), menu container, placeholder, error icon and message,
    in-field progress circle, leading icon, prefix, side and in line label, read-only look.

- [#2022](https://github.com/adobe/spectrum-design-data/pull/2022) [`1ae6569`](https://github.com/adobe/spectrum-design-data/commit/1ae6569690f1429b734139c8703f678e59884f64) Thanks [@GarthDB](https://github.com/GarthDB)! - Toast, alert banner and in-line alert: first visual recipes.
  - The three recipes share one structure and bind the same relationships where parts match: the
    semantic fill, the edge to content spacing, the status icon, the message text and the nested
    close button.
  - Drawn: toast (neutral, informative, positive, negative) and alert banner (neutral, informative,
    negative) with a close button; in-line alert in the outline, subtle and bold styles for five
    variants. All in light, dark and wireframe, on desktop and mobile, with wrapped text.
  - The toast and banner status icon draws for negative only, because the icon catalog has no info
    or success icon.
  - Six live toast and in-line alert text colour records now point at the replacement static white
    and black tokens instead of the deprecated ones. The colors are unchanged.
  - Not drawn yet: action button and link, the in-line alert icon, the accent variant, the banner
    close button end spacing (two desktop and mobile records tie), shadow and animation.

- [#2026](https://github.com/adobe/spectrum-design-data/pull/2026) [`e452a23`](https://github.com/adobe/spectrum-design-data/commit/e452a2357402f424ec10d115e23150b786a4f007) Thanks [@GarthDB](https://github.com/GarthDB)! - Number field: first visual recipe.
  - The recipe draws the field label above a bordered field with the value, at sizes s, m, l and
    xl, in light, dark and wireframe, on desktop and mobile. The value text is the render request
    label, because the component has no value option.
  - States drawn: default, hover, keyboard focus, disabled and invalid (error border). Width,
    height, padding, radius, colors, type style, border and focus ring come from the number field
    relationships. The label reuses the field-label recipe.
  - Not drawn yet: the stepper buttons, help text (no text option), error icon, placeholder,
    leading icon, prefix, minimum width, side label.

- [#2015](https://github.com/adobe/spectrum-design-data/pull/2015) [`57f0542`](https://github.com/adobe/spectrum-design-data/commit/57f05425d8621bdd841a24ff5dfdc019ab4c7102) Thanks [@GarthDB](https://github.com/GarthDB)! - Picker: first visual recipe.
  - The recipe draws the field label above a field with the selected value or the placeholder, a
    chevron at the end and the description below, at sizes s, m, l and xl, in light, dark and
    wireframe, on desktop and mobile.
  - States drawn: default, hover, down (the box scales), keyboard focus, disabled and invalid (error
    border). Fill, heights, padding, radius, type style, text colors, the error border, the press
    look and the focus ring come from the picker relationships. The label and description reuse the
    field-label and help-text recipes.
  - Known limits: the chevron has no color and no size (no usable records, and its color would tie
    at keyboard focus), and at keyboard focus the value color has two tied records.
  - Not drawn yet: menu container, quiet look, error icon and message, in-field progress circle,
    leading icon, prefix, side label.

- [#2025](https://github.com/adobe/spectrum-design-data/pull/2025) [`ce87951`](https://github.com/adobe/spectrum-design-data/commit/ce87951b8034359e5dc7320a5eae2564ed227861) Thanks [@GarthDB](https://github.com/GarthDB)! - Search field: first visual recipe.
  - The recipe draws the field label above a pill shaped field with the search icon and the value
    or the placeholder, and the help text below, at sizes s, m, l and xl, in light, dark and
    wireframe, on desktop and mobile.
  - States drawn: default, hover, keyboard focus and disabled. Heights, padding, icon size, colors,
    type style, border and focus ring come from the search field relationships. The label and help
    text reuse the field-label and help-text recipes.
  - The width token exists only for the medium size, so the other sizes take the `width` option.
  - Not drawn yet: the clear button (no recipe), the pressed look (no records), a width token for the
    other sizes, minimum width, side label.

- [#2021](https://github.com/adobe/spectrum-design-data/pull/2021) [`88a4427`](https://github.com/adobe/spectrum-design-data/commit/88a44271269f3f278f8de3a2841e4ae333b35d14) Thanks [@GarthDB](https://github.com/GarthDB)! - Status light: first visual recipe.
  - The recipe draws a round dot beside the label at sizes s, m, l and xl, in light, dark and
    wireframe, on desktop and mobile.
  - Variants drawn: the six semantic variants (informative, accent, neutral, positive, notice,
    negative) and the named colors (celery, chartreuse, cyan, fuchsia, purple, magenta, indigo,
    seafoam, yellow, pink, turquoise, cinnamon, brown, silver, gray, red, orange, green, blue).
  - Dot size and color, the gap between dot and label, and the label font and color all come from
    the relationships. No context selectors are used.
  - Not drawn yet: wrapping of a long label, and the label type style (the component has no
    type-style records, so the font axes are bound one by one).

- [#2020](https://github.com/adobe/spectrum-design-data/pull/2020) [`3576f7d`](https://github.com/adobe/spectrum-design-data/commit/3576f7de9ea88eae0dd3db73734e3960d257e029) Thanks [@GarthDB](https://github.com/GarthDB)! - Tag: first visual recipe.
  - The recipe draws a rounded tag with a label, an optional leading icon or avatar and an optional
    clear button, at sizes s, m and l, in light, dark and wireframe, on desktop and mobile.
  - States drawn: default, hover, down (label color only), keyboard focus, selected, selected and
    emphasized, and disabled. Fill, height, minimum width, padding, radius, label font and colors and
    the focus ring come from the tag relationships. The avatar and clear button reuse their recipes.
  - Data fix: the four selected label color records are now `content-color` (they shared `color`
    with the background and could not be told apart), and the unselected hover and keyboard focus
    background record is split into one record per state (it required both states at once).
  - Known limits: the clear button on a selected tag keeps its neutral color, so it is hard to see on
    the dark fill. The label to clear button gap is 12px when there is no avatar, 6px with one.
  - Not drawn yet: error look (no records), border, maximum width, avatar image and initials.

- [#2027](https://github.com/adobe/spectrum-design-data/pull/2027) [`1aae2d7`](https://github.com/adobe/spectrum-design-data/commit/1aae2d73e9b2f2b5ba227881a8aaed230ddadc76) Thanks [@GarthDB](https://github.com/GarthDB)! - Text area: first visual recipe.
  - The recipe draws the field label above a tall bordered field with the value at the top, a
    valid check and the help text below, at sizes s, m, l and xl, in light, dark and wireframe, on
    desktop and mobile.
  - States drawn: default, hover, keyboard focus, disabled and invalid (error border). Width,
    padding, radius, colors, type style, border and focus ring come from the text area
    relationships. The label and help text reuse the field-label and help-text recipes.
  - The height token exists only for the large size, so the other sizes take the `height` option.
    Vertical padding is drawn for sizes m, l and xl only.
  - Not drawn yet: wrapped multi line text, the drag handle, character count, error icon, minimum
    width, size s vertical padding, side label.

- [#2008](https://github.com/adobe/spectrum-design-data/pull/2008) [`4544078`](https://github.com/adobe/spectrum-design-data/commit/4544078251ccaee511a1e5aca89945d8d8f9ae82) Thanks [@GarthDB](https://github.com/GarthDB)! - Text field: first visual recipe.
  - The recipe draws the field label above a bordered field, the value, a valid check and the help
    text below, at sizes s, m, l and xl, in light, dark and wireframe, on desktop and mobile.
  - States drawn: default, hover, keyboard focus, disabled and invalid (error border). Colors,
    heights, padding, radius, border width and the focus ring come from the relationships.
  - The label and help text reuse the field-label and help-text recipes. The field-label recipe now
    reads its text from the `label` option when a host sets it.
  - Known limit: at keyboard focus the value color has two records (focus and keyboard focus) that
    tie, so a render with a value reports an ambiguity diagnostic.
  - Not drawn yet: error icon, error message, placeholder, leading icon, prefix, character
    count, in-field progress circle and button, side label.

### Patch Changes

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

- [#2023](https://github.com/adobe/spectrum-design-data/pull/2023) [`003f55c`](https://github.com/adobe/spectrum-design-data/commit/003f55ca2089e2c6aeadbef21250e3bf7bc2cbe5) Thanks [@GarthDB](https://github.com/GarthDB)! - Picker: the chevron now has a color.
  - The chevron takes the value text color from the picker relationships and the disabled text
    color when the picker is disabled, so it is readable on the dark scheme.
  - The chevron size is still the engine default: its size records are deprecated and have no size
    pin.

- [#2009](https://github.com/adobe/spectrum-design-data/pull/2009) [`76e46e3`](https://github.com/adobe/spectrum-design-data/commit/76e46e36b710a6362446a41504295b87284be80c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the render ambiguity check so a record pinned to an inactive state
  no longer ties with the chosen candidate. A text field in its default
  or error state keeps its border and value text colors.

## 3.30.0

### Minor Changes

- [#2003](https://github.com/adobe/spectrum-design-data/pull/2003) [`15f49f2`](https://github.com/adobe/spectrum-design-data/commit/15f49f2c55f494739e463b2029d9e91498d7f687) Thanks [@GarthDB](https://github.com/GarthDB)! - Accordion: expanded items now draw their content.
  - The `content` part of the recipe is a text part bound to the entry's `content`,
    through a new string option `content` and `repeat.with.content`.
  - It uses the title's font and colour relationships and the content padding relationships.
  - A collapsed item, or an expanded one with no content, draws no content area.

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

### Patch Changes

- [#2006](https://github.com/adobe/spectrum-design-data/pull/2006) [`f6285d8`](https://github.com/adobe/spectrum-design-data/commit/f6285d8d380fa73810b4d63c5c25b560be0b7335) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can draw a second stroke, stack parts and pick a stroke by position.
  - Root props `innerStroke`, `innerStrokeWidth` and `innerStrokeOpacity` draw a second border
    just inside the first, over the children, as the ring node `<root>.inner-border`.
  - A root with `direction: "stack"` overlays its children in declaration order.
  - A relationship selector can add `position: "inner"` or `"outer"` (default outer). A record
    pinned to one position serves only that selector, so two strokes no longer collide.
  - A nested component now inherits a corner radius given as a ratio of the host height.
  - The swatch draws its checkerboard behind the fill and its inner band when selected.

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

## 3.29.0

### Minor Changes

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

### Patch Changes

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

- [#1993](https://github.com/adobe/spectrum-design-data/pull/1993) [`fc69dda`](https://github.com/adobe/spectrum-design-data/commit/fc69dda6c1054f2a7d3be88f921690eb3a927aef) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate status-light, in-line-alert, alert-banner and toast to level 2 identity (5m92.6).
  coach-indicator is already level 2.
  - Fused names become real terms: `font-size-N` to `font-size` (status-light keeps its
    four sizes as `size` pins), `line-height-100` to `line-height`, `workflow-icon-size-100`
    to `size` on the icon, `component-height-50` to `minimum-height`. Every uuid is kept.
  - alert-banner's two close-button to end-edge gaps are told apart by a `scale` pin:
    8px on desktop, 12px on mobile.
  - toast's note-like "Toast token changes (Jan 2025)" colour record becomes the neutral
    container background, so every toast record has a part.
  - Colour attributes were already set by the anatomy review; no `background-color` or
    `border-color` record is added.

  Legacy `@adobe/spectrum-tokens` output is byte-identical.

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

## 3.28.0

### Minor Changes

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

### Patch Changes

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

## 3.27.1

### Patch Changes

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

## 3.27.0

### Minor Changes

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

## 3.26.0

### Minor Changes

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

## 3.25.0

### Minor Changes

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

## 3.24.0

### Minor Changes

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

### Patch Changes

- [#1958](https://github.com/adobe/spectrum-design-data/pull/1958) [`226f89b`](https://github.com/adobe/spectrum-design-data/commit/226f89bc6154fe99e20d90eac19f6d9a851de882) Thanks [@GarthDB](https://github.com/GarthDB)! - Data fixes for two relationship records. Renders and legacy tokens are unchanged.
  - date-picker: removed the "Popover minimum width" record
    (`5e17a7f7-00b3-50ec-b353-c28ec608d1f8`, `spacing` scope, `$ref` spacing-500 / 32px).
    A spacing token used as a width was a data error; Figma and React Spectrum show no
    32px popover width.
  - select-box: the selected-border thickness record
    (`c0dcf46a-f713-5fda-89df-5e82cda2dbe0`) now points at `border-width-200` (2px)
    instead of `focus-indicator-thickness` (2px). It is a border width, not the focus
    ring. Same value, uuid, scope and context.

## 3.23.0

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

- [#1956](https://github.com/adobe/spectrum-design-data/pull/1956) [`8933364`](https://github.com/adobe/spectrum-design-data/commit/893336404e98fb7c1559d904843fe2fac45d04e1) Thanks [@GarthDB](https://github.com/GarthDB)! - Stop four live accordion relationship records from pointing at deprecated legacy records.
  - The `divider` "between accordion item and divider" and `content` "end edges to content" spacing
    records carry an inline `0px` instead of a `$ref` to the deprecated `accordion-item-to-divider`
    and `accordion-edge-to-text` records.
  - The `content` "Expanded (content area top/bottom to text)" record now references
    `container-padding-extra-small` (8px). Its twin, which carried the legacy mobile 10px, is removed
    because it would repeat the first record. Figma Web POC has no mobile mode or 10px padding there.

- [#1955](https://github.com/adobe/spectrum-design-data/pull/1955) [`3530b31`](https://github.com/adobe/spectrum-design-data/commit/3530b31faf929d7712bcfa632c68821778190654) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix relationship records whose `context` role disagreed with their property. No token value or
  render changes.
  - color-area, color-loupe and takeover-dialog: "Size" and "Height & width" become "Width",
    "Height", "Minimum width" or "Minimum height" to match the property.
  - tree-view disclosure indicator width and height: "Spacing (disclosure indicator)" becomes
    "Width (...)" and "Height (...)".
  - color-slider and drop-zone corner radius become "Corner radius"; drop-zone border width becomes
    "Border width".
  - date-picker minimum height: "Popover minimum width" becomes "Popover minimum height", a new
    alias of the height role.
  - in-field-progress-circle size records: "Height" becomes "Size", and the visual recipe selector
    follows.

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

## 3.22.0

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

- [#1936](https://github.com/adobe/spectrum-design-data/pull/1936) [`67a4cab`](https://github.com/adobe/spectrum-design-data/commit/67a4cabd057de53e36b8ee3c561dbdff9ee2f3b7) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the thumbnail visual recipe.
  - Draws size (all 12 values, desktop and mobile), the opacity checkerboard, the rounded corners,
    the inset border and the disabled look (opacity 0.3). The image is not drawn yet.
  - The 24 Size relationships now pin the `size` option, so each size picks its own token.
  - thumbnail declares `hideImage` and `isDisabled` options and a default `size` of 500.
    Anatomy is still draft until reviewed.

## 3.21.0

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

- [#1924](https://github.com/adobe/spectrum-design-data/pull/1924) [`581dcb7`](https://github.com/adobe/spectrum-design-data/commit/581dcb7dde593787893c6a905164f487cececff1) Thanks [@GarthDB](https://github.com/GarthDB)! - Change the `maxValue` default from 1 to 100 on progress-bar, progress-circle and meter.

  React Spectrum S2 passes `value` through to React Aria, whose range is 0 to 100, so `value: 50`
  with no `maxValue` is now half. Anything that relied on a 0 to 1 range must set `maxValue: 1`.
  `minValue` stays 0. Visual recipe renders and goldens are unchanged for the same share.

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

## 3.20.0

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

- [#1914](https://github.com/adobe/spectrum-design-data/pull/1914) [`adb103c`](https://github.com/adobe/spectrum-design-data/commit/adb103c86d4864b2a87576d08229561f6409d6cf) Thanks [@GarthDB](https://github.com/GarthDB)! - Raise the dataset's `requires.cli` to 0.50.0. The progress-bar recipe uses the `fraction` and
  `text` recipe keys, so an older CLI now refuses the dataset instead of drawing an empty fill.

## 3.19.0

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

## 3.18.0

### Minor Changes

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

## 3.17.0

### Minor Changes

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

## 3.16.0

### Minor Changes

- [#1852](https://github.com/adobe/spectrum-design-data/pull/1852) [`0d84587`](https://github.com/adobe/spectrum-design-data/commit/0d845872dab9a2ef86dbd4afb688fb9e4b5e2c67) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the selected, indeterminate, emphasized, error and disabled qualifiers out of the `checkbox`
  relationship contexts and into `scope.options` (rule SPEC-093), using an any-of for
  "selected or indeterminate". The selected fills are now `background-color` / `Control` records
  pinned with `anyOf: [{ isSelected }, { isIndeterminate }]`, and the error and disabled records pin
  `isDisabled: false` or `isDisabled: true` so disabled beats error beats emphasized, as the recipe
  priorities did. The `checkbox` recipe binds the same selector for every state, so its emphasized,
  error and disabled entries are gone. Six unreferenced duplicate records are removed. Renders are
  unchanged. `checkbox` was the last component in the SPEC-093 baseline, which is now empty.

### Patch Changes

- [#1853](https://github.com/adobe/spectrum-design-data/pull/1853) [`a3c769f`](https://github.com/adobe/spectrum-design-data/commit/a3c769f4fb1ecadd645086e405076a0d07966595) Thanks [@GarthDB](https://github.com/GarthDB)! - Replace the `Breadcrumb item (hover, down, focus states)` context on two `breadcrumbs`
  relationships (`underline-thickness`, `text-underline-gap`) with `Breadcrumb item` and a
  state any-of, `scope.options.state: [{ anyOf: ["hover", "down", "keyboard-focus"] }]`.
  `breadcrumbs` has no visual recipe, so nothing renders differently.

- [#1854](https://github.com/adobe/spectrum-design-data/pull/1854) [`6ea7910`](https://github.com/adobe/spectrum-design-data/commit/6ea7910820cc3d32ca5f09c8ea33d504553428f7) Thanks [@GarthDB](https://github.com/GarthDB)! - Drop six redundant `when` entries from the `radio-button` and `switch` visual recipes. Each
  bound the same relationship selector as an entry that stays, and the records' `scope.options`
  pins already choose the disabled and emphasized values. Renders are unchanged.

- [#1857](https://github.com/adobe/spectrum-design-data/pull/1857) [`2a1e521`](https://github.com/adobe/spectrum-design-data/commit/2a1e521b6f62f5e65f5b3db15379a7888c929392) Thanks [@GarthDB](https://github.com/GarthDB)! - Merge relationship records that said the same thing twice (SPEC-100): the three `accordion`
  `padding-horizontal` records per scale become one with `size: [m, l, xl]`, the six
  `action-button` static-color `Background` pairs become six records with
  `staticColor: [black, white]`, and nine `button` records pinning `variant` to a subset of a
  sibling's values are dropped. Nineteen records go. Nothing renders differently.

- [#1855](https://github.com/adobe/spectrum-design-data/pull/1855) [`d3d8bc5`](https://github.com/adobe/spectrum-design-data/commit/d3d8bc5bcc7fcace8aa410c7d563a3ca6fcae780) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `medium` qualifier out of nine `breadcrumbs` relationship contexts and into
  `scope.options.size: m` (rule SPEC-093). Two of them also pin `isMultiline: false`, so a
  multiline request never ties with the `isMultiline` records. `breadcrumbs` has no visual
  recipe, so nothing renders differently.

## 3.15.1

### Patch Changes

- [#1840](https://github.com/adobe/spectrum-design-data/pull/1840) [`e755433`](https://github.com/adobe/spectrum-design-data/commit/e75543372e5a75e0e0f6580047191af3f0de2e1b) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `variant` qualifier out of 8 `alert-dialog` relationship contexts and into
  `scope.options` (rule SPEC-093).
  - `Icon (error variant)` and `Icon (warning variant)` become `Icon` with `variant: error` or
    `variant: warning` pinned.
  - `Icon (error and warning variants)` becomes `Icon` with the any-of pin
    `variant: ["error", "warning"]`.
  - `alert-dialog` declares five variants and the default, `confirmation`, has no record, so every
    record keeps its pin.

  `alert-dialog` has no visual recipe, so nothing renders differently.

- [#1842](https://github.com/adobe/spectrum-design-data/pull/1842) [`bb70755`](https://github.com/adobe/spectrum-design-data/commit/bb7075540461e38400ed5ab7aeacda2632fb5e11) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `image` qualifier out of 6 `avatar` relationship contexts and into `scope.options`
  (rule SPEC-093). `Text (initials)` becomes `Text` with `image: initials` pinned. The default
  `image` is `user image` and no `Text` record covers the other values, so the pin stays and an
  avatar showing a picture has no `Text` binding, as before. `avatar` has no visual recipe, so
  nothing renders differently.

- [#1837](https://github.com/adobe/spectrum-design-data/pull/1837) [`6296be3`](https://github.com/adobe/spectrum-design-data/commit/6296be3701c705fb73cd370f8f65a06122cd3ec1) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `isMultiline` qualifier out of 11 `breadcrumbs` relationship contexts and into
  `scope.options` (rule SPEC-093). `Spacing (top and bottom edge to text, multiline)` becomes
  `Spacing (top and bottom edge to text)` with `isMultiline: true` pinned, next to the existing
  unpinned default record of the same context, and the same for the other `Spacing` and `Text`
  multiline contexts. The `(medium)` contexts and `(hover, down, focus states)` are unchanged.
  `breadcrumbs` has no visual recipe, so nothing renders differently.

- [#1843](https://github.com/adobe/spectrum-design-data/pull/1843) [`d7bec9f`](https://github.com/adobe/spectrum-design-data/commit/d7bec9ffae3b320fa4ddccd612d812c99d36570e) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `isError` qualifier out of 26 `Border (error)` relationship contexts in `picker`,
  `combo-box`, `number-field`, `text-area` and `text-field`, and into `scope.options` (rule
  SPEC-093). Each becomes `Border` with `isError: true` pinned. The plain `Border` records use a
  different property (`border-width`), so no unpinned `color` record exists and a field without an
  error has no `Border` color binding, as before. None of these components has a visual recipe, so
  nothing renders differently.

- [#1830](https://github.com/adobe/spectrum-design-data/pull/1830) [`458a8a5`](https://github.com/adobe/spectrum-design-data/commit/458a8a5785ce10b782c6dc1b91de9710b38ddc92) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `variant` qualifier out of 46 `in-line-alert` relationship contexts and into
  `scope.options` (rule SPEC-093). `Background (Bold fill, Informative)` becomes
  `Background (Bold fill)` with `variant: informative` pinned, and the same for the negative,
  notice and positive variants and for the subtle and border fills. The `neutral` records keep an
  explicit `variant: neutral` pin: the component also declares `accent`, which has no records,
  so an unpinned neutral record would answer an `accent` request. `in-line-alert` has no visual
  recipe, so nothing renders differently.

- [#1839](https://github.com/adobe/spectrum-design-data/pull/1839) [`897182b`](https://github.com/adobe/spectrum-design-data/commit/897182b53d1a8f814881f27d1cc05771b40fdb02) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `variant` and `staticColor` qualifiers out of 10 `link` relationship contexts and into
  `scope.options` (rule SPEC-093). `Text (secondary)` becomes `Text` with `variant: secondary`
  pinned, and `Text (white)` and `Text (black)` become `Text` with `staticColor` pinned. `primary`
  is the default variant and the secondary records cover the only other value, so the four
  `Text (primary)` records become the unpinned default of `Text`. `link` has no visual recipe, so
  nothing renders differently.

- [#1832](https://github.com/adobe/spectrum-design-data/pull/1832) [`4dc0b99`](https://github.com/adobe/spectrum-design-data/commit/4dc0b99e96c11388055f1b21a7c8f0af6cbf5706) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `orientation` and `isSelected` qualifiers out of 29 `select-box` relationship contexts
  and into `scope.options` (rule SPEC-093). `Text (horizontal)` and `Text (vertical)` become `Text`
  with `orientation` pinned, and `Border (selected)` becomes `Border` with `isSelected: true`
  pinned. `orientation` defaults to `vertical`, so the vertical `font-weight` record is the only
  unpinned one; every other vertical record keeps `orientation: vertical`, because no horizontal
  record covers its property. `select-box` has no visual recipe, so nothing renders differently.

- [#1845](https://github.com/adobe/spectrum-design-data/pull/1845) [`46c51e6`](https://github.com/adobe/spectrum-design-data/commit/46c51e6dc5d7a729f8836cf0a53434f428333fcd) Thanks [@GarthDB](https://github.com/GarthDB)! - Move option qualifiers out of 21 relationship contexts in ten small components and into
  `scope.options` (rule SPEC-093): `tabs`, `action-group`, `button-group`, `illustrated-message` and
  `swatch-group` pin `orientation` or `density`, `progress-bar` pins `staticColor: white`, and
  `color-handle`, `search-field`, `field-label` and `help-text` pin `isDisabled`. A default pin is
  dropped only where records for the same property cover every other declared value (the regular
  `action-group` spacing). None of these components has a visual recipe, so nothing renders
  differently.

- [#1836](https://github.com/adobe/spectrum-design-data/pull/1836) [`2d4d639`](https://github.com/adobe/spectrum-design-data/commit/2d4d639c756af46abd6ecb0caff2a57ace6000c1) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `shape` and `isSelected` qualifiers out of 16 `swatch` relationship contexts and into
  `scope.options` (rule SPEC-093). `Size (square)` becomes `Size` with `shape: square` pinned,
  `Width (rectangle)` becomes `Width` with `shape: rectangle` pinned, and `Border and inner border
(selected)` becomes `Border and inner border` with `isSelected: true` pinned. `square` is the
  default shape, but no `Width` or `Size` record for the other shape shares its property, so the
  square pin stays. The structured `contextPart` field is dropped with the qualifier it held.
  `swatch` has no visual recipe, so nothing renders differently.

- [#1831](https://github.com/adobe/spectrum-design-data/pull/1831) [`56221a6`](https://github.com/adobe/spectrum-design-data/commit/56221a6e992a8923ac63562c6a4ac449159c222b) Thanks [@GarthDB](https://github.com/GarthDB)! - Pin `isEmphasized: false` on the four `switch` `background-color / Track` records for a selected
  switch, and add one record for selected + disabled + not emphasized that uses the disabled token.
  The records came from `Control (selected, non emphasized)`, and the emphasized fill lives under a
  different key (`content-color / Control`), so an emphasized request could resolve to the
  non-emphasized token. Selected + disabled still applies to both emphasis values. Render output is
  unchanged.

- [#1834](https://github.com/adobe/spectrum-design-data/pull/1834) [`7a1c9a1`](https://github.com/adobe/spectrum-design-data/commit/7a1c9a1f835887368a149d807fa7d3352702644e) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `density` qualifier out of 22 `table` relationship contexts and into `scope.options`
  (rule SPEC-093). `Row height (minimum, compact density)` and `(minimum, spacious density)` become
  `Row height (minimum)` with `density` pinned, and `Spacing (row top/bottom to text, compact
density)` and `(… spacious density)` become `Spacing (row top/bottom to text)`. `regular` is the
  default density and compact and spacious records cover the other values of that property, so the
  regular `Row height (minimum)` records are unpinned. `table` has no visual recipe, so nothing
  renders differently.

- [#1841](https://github.com/adobe/spectrum-design-data/pull/1841) [`17451d4`](https://github.com/adobe/spectrum-design-data/commit/17451d427120a5a0e9148c5ae8223855cfad8e4b) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `variant` qualifier out of 7 `tooltip` relationship contexts and into `scope.options`
  (rule SPEC-093).
  - `Background (Informative)` and `Background (Negative)` become `Background` with
    `variant: informative` or `variant: negative` pinned.
  - `neutral` is the default variant and the other two declared values both have records, so the
    `Background (Neutral)` record becomes the unpinned default of `Background`.

  `tooltip` has no visual recipe, so nothing renders differently.

- [#1835](https://github.com/adobe/spectrum-design-data/pull/1835) [`5ce2aa3`](https://github.com/adobe/spectrum-design-data/commit/5ce2aa3c4ed45b01a5fb6200d45ba478b6d9d8e9) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the `selectionStyle` qualifier out of 18 `tree-view` relationship contexts and into
  `scope.options` (rule SPEC-093). `Background (selected, highlight)`, `Border (selected,
highlight)` and `Border width (selected, highlight)` pin `selectionStyle: highlight`;
  `Spacing (edge to checkbox, checkbox)` pins `selectionStyle: checkbox`. `checkbox` is the default
  style, and the color records of `Background (selected)` are unpinned because a highlight record
  covers the other style. `Label and icon (selected, checkbox and highlight)` named both styles,
  so it becomes `Label and icon (selected)` with no pin. `tree-view` has no visual recipe, so
  nothing renders differently.

## 3.15.0

### Minor Changes

- [#1827](https://github.com/adobe/spectrum-design-data/pull/1827) [`2e21148`](https://github.com/adobe/spectrum-design-data/commit/2e21148898b9b9df5150510c21a7c94106e0f0a8) Thanks [@GarthDB](https://github.com/GarthDB)! - Move option qualifiers out of the relationship `context` strings of `action-button` and into
  `scope.options` (rule SPEC-093).
  - `Background (selected, emphasized)` and `(selected, non emphasized)`, `(disabled)`,
    `(disabled, black)` and `(disabled, white)` become `Background` with `isSelected`,
    `isEmphasized`, `isDisabled` and `staticColor` pinned. `Label, icon, and hold icon` and
    `Focus ring (black)` / `(white)` follow the same pattern.
  - Two records are added so that selected + disabled resolves to the disabled token, as the
    recipe's `when` order did before.
  - **Render change:** the keyboard-focus ring of a static black or white action button is now
    black or white. The `Focus ring (black)` and `(white)` records were not reachable before, so
    the ring fell back to the default blue. All other states render unchanged.

  A platform recipe that binds the old context strings must use the new ones. Record `uuid`
  values do not change.

### Patch Changes

- [#1829](https://github.com/adobe/spectrum-design-data/pull/1829) [`4d5b3fd`](https://github.com/adobe/spectrum-design-data/commit/4d5b3fd12e0144d8c554a96e7176c5f8fe592e96) Thanks [@GarthDB](https://github.com/GarthDB)! - Move the emphasized option out of eight `action-bar` relationship contexts and into
  `scope.options` (rule SPEC-093). `Control (selected, emphasized)` and `Background (emphasized)`
  pin `isEmphasized: true`; `Control (selected, non emphasized)` is the unpinned default of
  `Control (selected)`. `action-bar` has no visual recipe, so nothing renders differently.

## 3.14.0

### Minor Changes

- [#1825](https://github.com/adobe/spectrum-design-data/pull/1825) [`158ff7c`](https://github.com/adobe/spectrum-design-data/commit/158ff7c6dcf3542a7c157546f84ac6f0bc52023b) Thanks [@GarthDB](https://github.com/GarthDB)! - Move option qualifiers out of the relationship `context` strings of `radio-button` and `switch`
  and into `scope.options` (rule SPEC-093).
  - `Control (selected, non emphasized)` and `Control (selected, emphasized)` become `Control`
    with `isSelected` and `isEmphasized` pinned. `Control (disabled)` and `Label (disabled)`
    become `Control` and `Label` with `isDisabled` pinned.
  - `switch` track fills move to the `Track` context.
  - `radio-button` selected fills move from `content-color` to `background-color`, matching
    `switch`.
  - The foundation recipes are updated. Render output is unchanged.

  A platform recipe that binds the old context strings must use the new ones. Record `uuid`
  values do not change.

- [#1793](https://github.com/adobe/spectrum-design-data/pull/1793) [`87c45e3`](https://github.com/adobe/spectrum-design-data/commit/87c45e3f76bcac529106629619d923544ca9d1e5) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove the `status-light` "Height", "Spacing (top/bottom edge to label)" and
  "Spacing (top edge to dot)" relationships (20 records). They described a 32px
  control container with 7px of block padding, carried over from the deprecated
  `status-light-top-to-dot-*` tokens. Both the official S2 - Web Figma file and
  React Spectrum S2 render Status light as one text line (18px at M) with no
  minimum height or block padding. A recipe should size it from the label line
  height and place the dot by centring on the first line.

## 3.13.1

### Patch Changes

- [#1816](https://github.com/adobe/spectrum-design-data/pull/1816) [`8b06028`](https://github.com/adobe/spectrum-design-data/commit/8b06028b7d5cf01ec1d2bf824a8d8f06b0d954e8) Thanks [@GarthDB](https://github.com/GarthDB)! - Mark the action-button and badge content icon as optional, so the component explorer
  offers a "None" icon choice. Figma and React Spectrum S2 let both omit the icon.

## 3.13.0

### Minor Changes

- [#1804](https://github.com/adobe/spectrum-design-data/pull/1804) [`039914f`](https://github.com/adobe/spectrum-design-data/commit/039914f80477d12846434c8024daa6defcf2b3e8) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `layoutRevision` to `dataset.json` and publish `dataset.json` with the data package. The
  renderer has its own layout revision and the CLI warns when it differs from the data's, so a
  CLI newer than the data (the #1799 case) is reported instead of silently rendering differently.

- [#1796](https://github.com/adobe/spectrum-design-data/pull/1796) [`331dc43`](https://github.com/adobe/spectrum-design-data/commit/331dc43983087cfd807dd364240b234fc4ef0dab) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `repeat` to visual recipes: a recipe can draw its root once per entry of an
  array option, stacked in a column. The accordion recipe repeats its item over
  `items`, so a render can show several items with their own titles and open state
  (`isExpanded`, `hasSwitch`, `hasActionButton`). A request without `items` renders
  exactly as before.

- [#1805](https://github.com/adobe/spectrum-design-data/pull/1805) [`0276017`](https://github.com/adobe/spectrum-design-data/commit/027601793b6ea70dc113669d3037b0797761930f) Thanks [@GarthDB](https://github.com/GarthDB)! - A row recipe that binds no `minHeight` and no block padding now hugs its content instead of
  being 32px high (layout revision 2). A row with no flowed children is now 0 high, not 32.
  Recipes outside this repository that relied on the 32 must bind `minHeight` or block padding.
  No shipped recipe changes: the render snapshots and the iOS recipes are identical. Fixes #1800.

### Patch Changes

- [#1803](https://github.com/adobe/spectrum-design-data/pull/1803) [`9dd92e4`](https://github.com/adobe/spectrum-design-data/commit/9dd92e4bd18784ce73d697bf8442ef6680958b4f) Thanks [@GarthDB](https://github.com/GarthDB)! - Release the `justify: start` pins on the `checkbox`, `radio-button` and `switch` visual
  recipes (merged in #1781, in no earlier data release). This data matches `design-data` CLI
  0.34.1 and later, which centres a row that has free width. Fixes #1799.

- [#1807](https://github.com/adobe/spectrum-design-data/pull/1807) [`5b20b30`](https://github.com/adobe/spectrum-design-data/commit/5b20b303e2eb2a24942f208bdc405beb99bd4a45) Thanks [@GarthDB](https://github.com/GarthDB)! - Declare the `selected` state of `select-box`, `stack-item` and `tree-view` with
  `trigger: "prop"`, as the state model and RFC-A require for a state driven by
  `isSelected`. It was `interaction`. The compound `selected-*` states keep their
  `interaction` trigger.

## 3.12.0

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

## 3.11.4

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

- [#1763](https://github.com/adobe/spectrum-design-data/pull/1763) [`d1123a1`](https://github.com/adobe/spectrum-design-data/commit/d1123a17afa74644b4fab739e70d55077d1cd40f) Thanks [@GarthDB](https://github.com/GarthDB)! - Pin `scope.options.variant` on the 57 `status-light` "Semantic (Dot)" and
  "Non-semantic (Dot)" relationships, taken from each referenced token's
  `colorRole` or `colorFamily`. A `variant` selector now resolves to one token
  instead of one per colour family. The `gray`, `red`, `orange` and `green`
  options still have no dot token.

## 3.11.3

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

## 3.11.2

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

## 3.11.1

### Patch Changes

- [#1728](https://github.com/adobe/spectrum-design-data/pull/1728) [`0cea3f1`](https://github.com/adobe/spectrum-design-data/commit/0cea3f1ecd14c744491458beb3720fa5bb55a7f8) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the relationship context "Text" (role `label`) to 200 typography records in
  heading, detail, body, title and code that had none, and "Margins" (role
  `spacing`) to 5 margin records. Existing context strings are unchanged. Adding
  a context is a documentation-class change.

## 3.11.0

### Minor Changes

- [#1718](https://github.com/adobe/spectrum-design-data/pull/1718) [`fdf63d7`](https://github.com/adobe/spectrum-design-data/commit/fdf63d7badc50670759c0b28236b0f821ec190dd) Thanks [@GarthDB](https://github.com/GarthDB)! - Retire 24 accordion `top-to-text-*` and `bottom-to-text-*` relationship records
  (compact, regular and spacious, by size).

  Header vertical padding now depends on size only (`Title (vertical)`,
  `base-padding-vertical-medium` to `2x-large`). Density adds outer padding through the
  `Header (vertical)` records: `list-item-padding-vertical-regular` and `-spacious`.
  Compact has none. This matches the current S2 Web Figma accordion item.

  The deprecated legacy tokens stay.

- [#1724](https://github.com/adobe/spectrum-design-data/pull/1724) [`4387ec1`](https://github.com/adobe/spectrum-design-data/commit/4387ec187851d5ffd554b437f53beb8ae72b513d) Thanks [@GarthDB](https://github.com/GarthDB)! - Add eleven relationship-context terms: `gripper`, `section-header`, `selection`,
  `preview` and the item types `tab-item`, `breadcrumb-item`, `navigation-item`,
  `menu-item`, `list-view-item`, `tree-view-item` and `segmented-control-item`
  (category `item`). Each links to its nearest term with `relatedTerms`.
  `breadcrumb item` and `navigation item` move from `pagination` and `navigation`
  to their own terms. Plural strings such as `Tab items` stay aliases of the
  container term.

  SPEC-090 now accepts a `context` string whose main word is a registry alias of
  the same term(s) as `contextRole` (`Text` with `[label]`, `Drop shadow` with
  `[shadow]`). A case variant or an alias of a different term still warns. No
  relationship data changes.

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

- [#1721](https://github.com/adobe/spectrum-design-data/pull/1721) [`6136cd7`](https://github.com/adobe/spectrum-design-data/commit/6136cd760b966dc72b64d8284fcb0172a17aa3f9) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove two options that exist only in Spectrum 1, not in any current design or code source.
  - `badge`: removed the `fixed` option (none/top/right/bottom/left) and the eight recipe
    branches that squared corners per edge. Badges always render with full corner rounding.
  - `action-button`: removed the `selectedTextColor` option, which the recipe never used.

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

### Patch Changes

- [#1722](https://github.com/adobe/spectrum-design-data/pull/1722) [`7515f70`](https://github.com/adobe/spectrum-design-data/commit/7515f705b68e050efce9a88ae6fa811540a99c29) Thanks [@GarthDB](https://github.com/GarthDB)! - Normalize relationship context strings: trim stray whitespace and merge case
  variants of the same string (52 strings, 210 relationship records, 1 component
  tokenBinding). One string had an embedded paragraph break collapsed to a single
  space. Nothing is renamed beyond case and whitespace; recipes and render
  snapshots are unchanged.

## 3.10.0

### Minor Changes

- [#1704](https://github.com/adobe/spectrum-design-data/pull/1704) [`f7cf8f0`](https://github.com/adobe/spectrum-design-data/commit/f7cf8f02df71ee69d116cbd1b929305ea5eb03c7) Thanks [@GarthDB](https://github.com/GarthDB)! - Button: the `variant` default is now `primary`, matching Figma, React Spectrum S2
  and SWC Gen2 (it was `accent`). The visual recipe binds
  "Minimum height" as `minHeight`, the label sets `overflow: wrap`, and the root
  `minWidth` reads the `minimum-width-multiplier` token (2.25 times the height) when
  a label shows. The `focus` state is renamed `keyboard-focus`, as in the other recipes and in the
  relationship scopes, and the focus fill now takes the hover look (the key-focus
  tokens for accent, negative and primary, gray-200 for secondary), as React
  Spectrum S2 and SWC Gen2 do.
  The renderer reads `relativeTo: "height"` on a root `minWidth`.

### Patch Changes

- [#1708](https://github.com/adobe/spectrum-design-data/pull/1708) [`2e6bc57`](https://github.com/adobe/spectrum-design-data/commit/2e6bc5767d35ad32418b800f98b2162733eda879) Thanks [@GarthDB](https://github.com/GarthDB)! - State model: combined interaction states now resolve per property, with
  `keyboard-focus` as a non-layered state between `hover` (50) and `down` (70), so
  pressed beats focus beats hover. `prop` states pick the token set and a token
  that matches more active states wins before precedence is compared.
  `layered` is deprecated: schemas still accept it and resolvers ignore it. The
  state registry now carries default precedence (hover 50, focus and
  keyboard-focus 60, down and active 70), so components declare precedence only
  to deviate. The renderer does not read precedence yet (follow-up work).

  Button no longer declares explicit precedence or `layered`; it uses the registry defaults.

## 3.9.3

### Patch Changes

- [#1702](https://github.com/adobe/spectrum-design-data/pull/1702) [`dc9fed6`](https://github.com/adobe/spectrum-design-data/commit/dc9fed67d02e83eb2d22ec710a44d5dd845b9563) Thanks [@GarthDB](https://github.com/GarthDB)! - Checkbox, radio button and switch visual recipes: the container binds its
  "Minimum height" relationship as `minHeight` and the label sets
  `overflow: wrap`, so a long label wraps at a narrow width and the control stays
  on the first line. One-line renders are unchanged.

- [#1703](https://github.com/adobe/spectrum-design-data/pull/1703) [`5f38c0a`](https://github.com/adobe/spectrum-design-data/commit/5f38c0a00507a59c5c575dfd8efedf9ca9d92251) Thanks [@GarthDB](https://github.com/GarthDB)! - Accordion: the item can show its direct actions, an icon-only action button and a
  switch, spaced by the "Spacing (section title to action area)" relationship. The
  component gains the `hasActionButton` and `hasSwitch` options (per item in a
  data-driven accordion: `items[].hasActionButton`, `items[].hasSwitch`) and the
  anatomy parts `direct-actions`, `action-button` and `switch`. Renders with both
  options off are unchanged.

- [#1700](https://github.com/adobe/spectrum-design-data/pull/1700) [`2a6ccd3`](https://github.com/adobe/spectrum-design-data/commit/2a6ccd3796290fa0e4de081072d8d28556524ce7) Thanks [@GarthDB](https://github.com/GarthDB)! - Accordion visual recipe: the item's root binds `width` (the field width tokens
  through its "Width (default)" relationship) for sizes m, l and xl, and the title
  grows to fill the header row.

- [#1701](https://github.com/adobe/spectrum-design-data/pull/1701) [`6ee52bc`](https://github.com/adobe/spectrum-design-data/commit/6ee52bc9f0e03eca4bbb063a175171b6f4e886a1) Thanks [@GarthDB](https://github.com/GarthDB)! - Badge visual recipe: the container binds its "Minimum height" relationship as
  `minHeight` and the label sets `overflow: wrap`, so a long label wraps at a
  narrow width and the badge grows. One-line renders are unchanged.

## 3.9.2

### Patch Changes

- [#1681](https://github.com/adobe/spectrum-design-data/pull/1681) [`31332b8`](https://github.com/adobe/spectrum-design-data/commit/31332b8ab5b9a8987e8670c9dabd6262408fa7b1) Thanks [@GarthDB](https://github.com/GarthDB)! - Action button, badge, checkbox, radio button and switch labels now bind line-height tokens.

  These recipes left the label line height unbound, so it rendered at 1.3 times the font size.
  New Label relationships (desktop and mobile, per size) and a `lineHeight` binding in each recipe
  give the Figma and React Spectrum S2 line heights. SPEC-087 now passes on desktop for all five.

## 3.9.1

### Patch Changes

- [#1678](https://github.com/adobe/spectrum-design-data/pull/1678) [`c223628`](https://github.com/adobe/spectrum-design-data/commit/c2236288e5cfa47bfe9f4099abb24d03f7c10acf) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove 477 exact duplicate relationship records in 40 components.

  Two records in the same file with equal scope, context and `$ref` (or value) were repeated. The
  first copy stays, and no `uuid` that other data references was removed. Token values and legacy
  output are unchanged. `packages/design-data/scripts/dedupe-relationship-records.mjs` re-runs the
  cleanup.

## 3.9.0

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

- [#1673](https://github.com/adobe/spectrum-design-data/pull/1673) [`dd30d97`](https://github.com/adobe/spectrum-design-data/commit/dd30d97159cb02c9efe6cdd916c2faf5795fb9c1) Thanks [@GarthDB](https://github.com/GarthDB)! - Six recipes declare their vertical edge spacing as derived.

  Action button, badge, button, checkbox, radio button and switch list the contexts "Spacing (top
  edge to icon/control/label)" and "Spacing (top/bottom edge to label)" under the new `derived`
  array, with the formula `(height - label.lineHeight) / 2`. The recipes bind no new padding, so
  rendered output is unchanged. Spec sheets show these contexts with a marker and a measurement
  labelled "derived from height". SPEC-087 compares each token with the formula per size and scale.

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

### Patch Changes

- [#1662](https://github.com/adobe/spectrum-design-data/pull/1662) [`176277a`](https://github.com/adobe/spectrum-design-data/commit/176277ae913a94b5985b150bf715bceeb684a96d) Thanks [@GarthDB](https://github.com/GarthDB)! - Button icon sizes now use the live `workflow-icon-small/medium/large/extra-large` tokens.

  The Button Icon relationships pointed at the deprecated `workflow-icon-size-75..300` tokens,
  which gave 16/20/22/26 px on desktop. Figma, React Spectrum S2 and Spectrum Web Components all
  use 16/18/20/22 px. Mobile values are unchanged (18/24/28/30 px).

- [#1663](https://github.com/adobe/spectrum-design-data/pull/1663) [`f65e062`](https://github.com/adobe/spectrum-design-data/commit/f65e0628d3e1e4adfde7c98439075e19e8382989) Thanks [@GarthDB](https://github.com/GarthDB)! - Button labels now bind the per-size `line-height-font-size-75..300` tokens.

  The Button recipe left the label line height unbound, so it rendered at 1.3 times the font size
  (23.4 px at XL). New Label relationships and a `lineHeight` binding in the visual recipe give
  16/18/20/22 px on desktop, matching Figma and React Spectrum S2.

- [#1659](https://github.com/adobe/spectrum-design-data/pull/1659) [`c3f714b`](https://github.com/adobe/spectrum-design-data/commit/c3f714bd2543fd7a623b6d4c00d755fe073c63c8) Thanks [@GarthDB](https://github.com/GarthDB)! - Button accent and negative label and icon colours are now static white in every colour scheme.

  The relationships bound them to `gray-25`, which turns near-black in dark mode. The
  Figma Web POC binds `Palette/white` and React Spectrum S2 renders white.
  - Accent/negative Label and Icon now reference `transparent-static-white-1000`.
  - The dark and wireframe duplicates of those two relationships are removed.
  - The `gray-25` Label and Icon relationships (light, dark and wireframe) now apply to the
    primary variant only.

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

## 3.8.2

### Patch Changes

- [#1644](https://github.com/adobe/spectrum-design-data/pull/1644) [`13f4851`](https://github.com/adobe/spectrum-design-data/commit/13f4851adab6c4e01ef3299cafb8c156bcfdfa19) Thanks [@GarthDB](https://github.com/GarthDB)! - Stop the component changelog from reading re-scoped records as removals.
  - Relationship records that match on component, property, context and target pair
    as an update when `scope.options` differ.
  - A context rename on the same target is a documentation update. Trailing
    whitespace in a context is not a change.
  - Removing a relationship whose exact twin survives is metadata, not major.
  - Changelogs are regenerated: button and accordion leave 2.0.0 (1.2.0), combo-box
    and text-area leave 2.0.0 (1.1.2).

## 3.8.1

### Patch Changes

- [#1641](https://github.com/adobe/spectrum-design-data/pull/1641) [`c4f6c2a`](https://github.com/adobe/spectrum-design-data/commit/c4f6c2abbbd7754deaf87c84bb4e3067364db9eb) Thanks [@GarthDB](https://github.com/GarthDB)! - Make the component changelog backfill reproducible.
  - Duplicate relationship records without a uuid pair by file position.
  - Token entries sort within each change group.
  - A release's `commit` is the last commit before its Version Packages
    commit (the tag's first parent).
  - Changelogs are regenerated to match.

## 3.8.0

### Minor Changes

- [#1604](https://github.com/adobe/spectrum-design-data/pull/1604) [`21c4d24`](https://github.com/adobe/spectrum-design-data/commit/21c4d240453333a8830c68a2e0afc4b18e9403b0) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(design-data): accordion item visual recipe and row boxes in the renderer

  Adds the accordion item recipe (sizes s to xl, density, quiet, open, hover, disabled).
  It needs three renderer features, in both the Rust solver and the JS runtime:
  - A flowed box that binds `direction: "row"` lays out icon, text and box children in a row.
  - A column root stretches a box with no width across its width.
  - An icon can bind `rotation`, and the `chevron` glyph is new.

  A relationship that pins `size`, or binds a single token, no longer loses that token to the
  token's own size name. A templated numeric selector field (`{sizeIndex}`) now matches a number.

- [#1618](https://github.com/adobe/spectrum-design-data/pull/1618) [`7b38617`](https://github.com/adobe/spectrum-design-data/commit/7b38617df24442d22724fb890cef69aa198b9e3a) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(design-data): per-component changelogs, versioned from the changes (hzje.8)

  The package ships `changelog/<component>.json`: for every component, each release's changes
  by commit (what changed, which relationship context, class, PR or commit) and a component
  version derived from them, starting at 1.0.0. Backfilled from 2.1.0; changes after 3.7.1 sit
  under `unreleased` until the next release takes them over. `changeset version` now appends the
  release being versioned (`design-data:version`), so new entries land in the Version Packages PR.

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

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `constraints` to the component format: if-then rules that limit valid option combinations.
  - **spec/option-constraints.md**: `when` / `require` / `severity` (`error` or `advisory`).
  - **component.schema.json**: optional `constraints` array. Layer 1 checks shape only; Layer 2
    checks names and values.
  - **button, action-button, checkbox**: first constraints, taken from react-spectrum S2.

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

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the Button visual recipe for static color black and white.
  - **label/icon**: static colors apply to primary and secondary; accent and negative stay white.
  - **accent/negative fill**: backgrounds require `style: fill`, so outline no longer gets a fill.
  - **focus ring**: static color uses transparent black or white 1000.
  - **disabled**: static color uses overlay 100 fill, 300 border and 400 content.
  - **hover/down**: static outline background is overlay 100; static border ignores gray hover.
  - **static outline border**: primary 800, secondary 300.

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

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - A box placed directly in a row now paints itself, so checkbox and switch no longer need a
  render-only `control` part.
  - Renderer and JS runtime read `fill`, `stroke` and `strokeWidth` on a flowed box.
  - Checkbox and switch drop `control`. The box and the track carry the size and hold the marks
    and the handle. Rendered geometry, colors and press scale are unchanged.
  - Relationships that named `control` now name `box` (checkbox) or `track` (switch).
  - Checkbox and switch anatomy are now reviewed.

- [#1603](https://github.com/adobe/spectrum-design-data/pull/1603) [`4be4b79`](https://github.com/adobe/spectrum-design-data/commit/4be4b79699b7926bd59a71b3c145c673fe1bc5f2) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the radio-button visual recipe.
  - Radio button gets reviewed anatomy (container, control, selection-indicator, label,
    focus-indicator) and `size` and `isDisabled` options.
  - The three Spectrum 1 `Control (selected, non emphasized)` records (neutral background
    colors) are replaced by content-color records for the neutral selected tokens that the
    component's token bindings already name.
  - New `Control`, `Control (disabled)` and `Control (rounding)` relationships.
  - The recipe binds everything through relationships and has render snapshots.

- [#1610](https://github.com/adobe/spectrum-design-data/pull/1610) [`2ec8e9e`](https://github.com/adobe/spectrum-design-data/commit/2ec8e9ed217a01bb81eefe8b1950be79e81cf98d) Thanks [@GarthDB](https://github.com/GarthDB)! - fix(design-data): give every relationship record a stable uuid

  4,857 relationship records had no `uuid`. Each now has a deterministic UUIDv5 from
  `scripts/backfill-relationship-uuid.mjs`. Existing uuids are unchanged. Changelogs and
  platform overrides can now target any relationship. Legacy output is unchanged.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe `when.options` conditions now accept an array of values, as the spec already described.
  - **sdk/core, site runtime**: an array matches when any value matches and counts as one condition.
  - **SPEC-061**: checks each element of an array condition against the option's declared values.
  - **spec**: component-visuals states that an array counts as one condition.
  - **button**: static color rules for primary and secondary share one entry with `variant: [...]`.

## 3.7.1

### Patch Changes

- [#1572](https://github.com/adobe/spectrum-design-data/pull/1572) [`a60aeea`](https://github.com/adobe/spectrum-design-data/commit/a60aeea243b2ac4e812d46bbd9f7140c9f62f398) Thanks [@GarthDB](https://github.com/GarthDB)! - Point the second duplicate relationship at the mobile token in 17 components.

  103 relationship records referenced the desktop token twice, so the mobile token was never
  reachable through the relationship. The second record of each pair now references the token with
  the same name and the mobile scale.

  Components: accordion, combo-box, date-picker, drop-zone, list-view, menu, number-field, picker,
  search-field, segmented-control, side-navigation, tag, tag-field, text-area, text-field, tooltip
  and tree-view.

## 3.7.0

### Minor Changes

- [#1561](https://github.com/adobe/spectrum-design-data/pull/1561) [`be208ce`](https://github.com/adobe/spectrum-design-data/commit/be208cef23415ab779adbc49e2fcf7c9fdeca9b1) Thanks [@GarthDB](https://github.com/GarthDB)! - Sync component content from Spectrum Hub (automated).
  - **packages/design-data/components**: 97 component schemas refreshed (was 97).

- [#1562](https://github.com/adobe/spectrum-design-data/pull/1562) [`21841d7`](https://github.com/adobe/spectrum-design-data/commit/21841d7f5712234eb9b9280d6bc75205114f6870) Thanks [@GarthDB](https://github.com/GarthDB)! - Sync guideline content from Spectrum Hub (automated).
  - **packages/design-data/guidelines**: 58 guideline documents (was 58).

## 3.6.1

### Patch Changes

- [#1550](https://github.com/adobe/spectrum-design-data/pull/1550) [`18431aa`](https://github.com/adobe/spectrum-design-data/commit/18431aa6bb40fee2838030592940195c42a6a1d4) Thanks [@GarthDB](https://github.com/GarthDB)! - Incubate the iOS manifest proof of concept under monorepo-maintainer stewardship.

  <!-- Copyright 2026 Adobe. All rights reserved. -->
  - **platforms/ios/**: preserve external data and attribution; target compatible foundation `3.6.0`.
  - **registry/platform-implementations.json**: record the canonical iOS authoring location.

## 3.6.0

### Minor Changes

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

### Patch Changes

- [`54ee322`](https://github.com/adobe/spectrum-design-data/commit/54ee322dc2fa9c6556549597a74610c290638664) - Pin the corrected banner/list legacy keys explicitly (follow-up to #1517).
  - **packages/design-data/tokens/layout.tokens.json**: add `name.legacyKey` to the five live
    `banner-gap-*`, `banner-padding-*` and `list-gap-regular` records. Generated output is unchanged.

## 3.5.0

### Minor Changes

- [#1483](https://github.com/adobe/spectrum-design-data/pull/1483) [`418cc0d`](https://github.com/adobe/spectrum-design-data/commit/418cc0d4b95e3b6b7cc70779e55d09173c88c357) Thanks [@GarthDB](https://github.com/GarthDB)! - Add platform-specific component option aliases and validate their canonical values.
  - **packages/design-data-spec**: Add `componentOptions` extensions with canonical-value validation.
  - **packages/design-data**: Add Button option mappings for React Spectrum and Web Components.

### Patch Changes

- [#1533](https://github.com/adobe/spectrum-design-data/pull/1533) [`6375e4b`](https://github.com/adobe/spectrum-design-data/commit/6375e4b83333f51f012d8f95df35a20d8a792340) Thanks [@GarthDB](https://github.com/GarthDB)! - Ship a generated `llms.txt` with each consumer-facing package (closes #1533).
  - **package.json (10 packages)**: add `llms.txt` to the npm `files` list.
  - **llms.txt**: generated from each README and `.ai/inventory.json` by `pnpm ai:sync`.

## 3.4.0

### Minor Changes

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

- [#1524](https://github.com/adobe/spectrum-design-data/pull/1524) [`ec3376f`](https://github.com/adobe/spectrum-design-data/commit/ec3376fa833f2c31dd0b2340590134b2747b00c4) Thanks [@GarthDB](https://github.com/GarthDB)! - Promote public Spectrum Hub guidance to the stable release channel.
  - **packages/design-data**: refresh component guidance and publish the Hub guideline
    corpus, including the October 1 public-site sync.
  - **sdk/wasm**: rebuild embedded guidance for MCP and JavaScript consumers.
  - **tools/s2-docs-to-document-blocks**: reject duplicate component slugs and retain
    section introductions alongside their subsections in published guidance.
  - **tools/spectrum-hub-fetcher**: fetch and merge public Hub pages for component and
    guideline syncs, reconciling obsolete slugs and category paths, preserving text
    boundaries, and decoding HTML entities before transformation.

## 3.3.0

### Minor Changes

- [#1513](https://github.com/adobe/spectrum-design-data/pull/1513) [`b9888b8`](https://github.com/adobe/spectrum-design-data/commit/b9888b8ce9a0e4ec5b607e088942999629d5d43d) Thanks [@GarthDB](https://github.com/GarthDB)! - Add Spectrum 2 implementation metadata for components with exact verified exports.
  - **spectrum-design-data**: replace S1 mappings with verified Spectrum 2 exports.
  - **design-data-wasm**: include the updated component data in the WASM package.

### Patch Changes

- [#1514](https://github.com/adobe/spectrum-design-data/pull/1514) [`9d3a14f`](https://github.com/adobe/spectrum-design-data/commit/9d3a14fb4c7ed956f93b87ccee6565c73b940ed5) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove `web-components-states.json` from the foundation registry (closes DNA-1741).
  - **registry/platform-extensions/web-components-states.json**: removed — the
    canonical copy now lives in `platforms/web-components/extensions/platform-extensions/`
    and is reachable via the manifest cascade, mirroring the earlier
    `ios-states.json` migration.

## 3.2.5

### Patch Changes

- [#1489](https://github.com/adobe/spectrum-design-data/pull/1489) [`132e66c`](https://github.com/adobe/spectrum-design-data/commit/132e66c541eaf4749d6e1b199705f8feb5621b56) Thanks [@GarthDB](https://github.com/GarthDB)! - Derive `figma diff`'s scale/colorScheme resolution from declared mode-set
  schema instead of hardcoded literals (closes spectrum-design-data-11k.16).
  - **sdk/core/src/graph.rs**: `rebuild_legacy_name_index`'s desktop/light
    tie-break now reads its defaults from `graph.mode_sets` when declared,
    falling back to the historical `"desktop"`/`"light"` literals otherwise;
    `with_mode_sets` rebuilds the index afterward so attaching mode sets
    after tokens (redb cache hydration, `from_json_dir_with_names_and_catalogs`)
    no longer leaves a stale, schema-unaware index.
  - **sdk/plugins/figma/src/import/resolve.rs**: `default_source_context` now
    derives its checked discriminator fields from `graph.mode_sets` instead
    of hardcoding `scale`/`colorScheme`, so a token disambiguated by any
    declared mode set (e.g. `contrast`) keeps its alias-chain context pinned.
  - **sdk/cli/src/main.rs**: fixed a stale comment miscounting `figma diff`'s
    pretty-print columns.

## 3.2.4

### Patch Changes

- [#1484](https://github.com/adobe/spectrum-design-data/pull/1484) [`a6b8360`](https://github.com/adobe/spectrum-design-data/commit/a6b83605ff76405d4de830169ab5101b04eb788c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix `figma pair` to consult CTR resolution before value-matching (closes #11k.10.13).
  - **sdk/plugins/figma/src/import/pair.rs**: `pair_by_value`'s already-resolved
    skip gate now also checks `resolve_relationship_ref`, matching `figma
diff`'s resolution order, so Typography-grouping and other CTR-only names
    (`Heading/`, `Body/`, `Title/`, `Detail/`, `Code/`, some `Alias/`) no longer
    wrongly fall through to the value-matching path and land in `ambiguous`.

## 3.2.3

### Patch Changes

- [#1452](https://github.com/adobe/spectrum-design-data/pull/1452) [`d88be4e`](https://github.com/adobe/spectrum-design-data/commit/d88be4e0204abb31d9f02ce680acd0fe478057a7) Thanks [@GarthDB](https://github.com/GarthDB)! - Correct `stack-item-selected-background-color-down` to gray-200 (discussion #1415).
  - **packages/design-data/relationships/stack-item.json**: rewired selected-down
    background from gray-300 to gray-200, matching hover/key-focus — S2's down states
    don't darken further, unlike S1. Regenerated legacy `packages/tokens/src/stack-item.json`
    follows automatically.

## 3.2.2

### Patch Changes

- [#1446](https://github.com/adobe/spectrum-design-data/pull/1446) [`63daf55`](https://github.com/adobe/spectrum-design-data/commit/63daf55e40fe469dc1b30248e57df7664afa005a) Thanks [@GarthDB](https://github.com/GarthDB)! - Resolve the remaining code-font `figma_only` entries in `figma diff` (closes #11k.10.12).
  - **sdk/core/src/graph.rs**: added `font-family.json` to `INLINE_CTR_COMPARABLE_SCHEMAS`
    so the inline `code-font-family` CTR resolves, letting `Code/Font family`,
    `platformScale/code-cjk-font-family`, and `platformScale/code-font-family` match
    against their Figma STRING values instead of showing as `figma_only`.

## 3.2.1

### Patch Changes

- [#1442](https://github.com/adobe/spectrum-design-data/pull/1442) [`009ccdd`](https://github.com/adobe/spectrum-design-data/commit/009ccdd50f5e73ee7cb2d25658797e6b2e19efd5) Thanks [@GarthDB](https://github.com/GarthDB)! - Resolve inline-value opacity CTRs in `figma diff`.
  - **sdk/core/src/graph.rs**: added `opacity.json` to `INLINE_CTR_COMPARABLE_SCHEMAS`
    so component-level opacity CTRs (e.g. `table-row-hover-opacity`) index into
    `relationship_tokens` and resolve during diff, matching the existing
    dimension/multiplier/gradient-stop handling.

## 3.2.0

### Minor Changes

- [#1438](https://github.com/adobe/spectrum-design-data/pull/1438) [`e357170`](https://github.com/adobe/spectrum-design-data/commit/e3571706e0aba86418b7d97c3986684c8159775c) Thanks [@GarthDB](https://github.com/GarthDB)! - Correct desktop `base-padding-horizontal` values for large/extra-large/2x-large
  to match the design decision confirmed in Figma/Tokens Studio, which never
  propagated to design-data (closes DNA-1926).
  - **packages/design-data/tokens/layout.tokens.json**: `base-padding-horizontal-large`
    14px→16px, `base-padding-horizontal-extra-large` 16px→18px,
    `base-padding-horizontal-2x-large` 18px→20px (desktop scale only; mobile unchanged).

## 3.1.0

### Minor Changes

- [#1435](https://github.com/adobe/spectrum-design-data/pull/1435) [`905bc1d`](https://github.com/adobe/spectrum-design-data/commit/905bc1d31e059349767bd4f9faf0deb4d4893ebe) Thanks [@GarthDB](https://github.com/GarthDB)! - Route opacity tokens to the `.Color theme` collection in the Figma variables
  exporter and diff (they were misrouted to `.Platform scale` despite being a
  FLOAT), and resolve `S2.Color-theme`'s bare-named alias variables through
  their `.Color theme` targets instead of reporting them `figma-only`
  (closes DNA-1953).
  - **sdk/core/src/figma/mapping.rs**: opacity tokens now route to `.Color
theme` (`colorTheme/*`) in both the alias-target pre-pass and the flat-token
    dispatch; `process_color_set_token`'s FLOAT/COLOR type inference now checks
    all `sets` members instead of only the first.
  - **sdk/core/src/figma/import.rs**: `diff_values` now falls back to
    `resolve_alias_target` for bare (slash-less) Figma names, recovering all 35
    `S2.Color-theme` opacity variables as matches.

## 3.0.0

### Major Changes

- [#1428](https://github.com/adobe/spectrum-design-data/pull/1428) [`6005339`](https://github.com/adobe/spectrum-design-data/commit/6005339a0678226eee3e827fd5bbfa793f5bccc7) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a canonical `conceptId` UUID shared by every mode row of a design concept (closes the
  concept-identity gap in proposal 013), and retire the transitional `set_uuid` cascade-migration
  bridge field in the same release now that `conceptId` fully subsumes its role.
  - **packages/tokens/schemas/token-types/alias.json**: removed `set_uuid`; `conceptId` was
    already documented alongside `uuid` on the token schema.
  - **packages/design-data/tokens/\*.tokens.json**: backfilled `conceptId` on every token
    (reusing existing `set_uuid` values where present) and removed `set_uuid`.
  - **sdk/core/src/{graph,legacy,migrate,figma/import}.rs**: re-keyed concept grouping,
    legacy-output reconstruction, migration, and Figma import onto `conceptId`; CTR-side
    camelCase `setUuid`/`setSchema` bridging is unchanged. `set_schema` is retained as-is —
    it encodes set-type, not concept identity.
  - **sdk/core/src/validate/rules/spec059.rs** (new): `alias-mode-context-compatibility`,
    a mode analogue of SPEC-002 flagging an alias pinned to a mode-mismatched target.
  - **spec/{cascade,token-format}.md**: normativize `conceptId` and context-aware `$ref`
    resolution against a `conceptId` anchor.
  - **conformance fixtures**: renamed `set_uuid` → `conceptId` throughout.

## 2.7.0

### Minor Changes

- [#1416](https://github.com/adobe/spectrum-design-data/pull/1416) [`936b203`](https://github.com/adobe/spectrum-design-data/commit/936b20300349220b9d8f30baf8f592b929d847c6) Thanks [@GarthDB](https://github.com/GarthDB)! - `figma diff` now compares genuinely multi-mode variables (e.g. `.Color
theme`'s Light/Dark/Wireframe and `.Platform scale`'s Desktop/Mobile)
  mode-by-mode instead of discarding them as `skipped-uncovered` the moment
  two modes disagree, recovering 469 previously uncovered `.Color theme`
  variables.
  - **sdk/core/src/figma/import.rs**: new `DiffClass::MultiModeMismatch` and
    `DiffCounts.multi_mode_mismatch`. Alias/`$ref` chains stay mode-aware
    instead of falling back to a first/Light candidate; `approx_eq`'s tolerance
    absorbs float32 round-trip noise; a name-inverted match onto a composite
    token is rejected for the real flat sibling; the multi-mode routing guard
    also recognizes CTR-only records' camelCase `setUuid`.
  - **sdk/core/src/graph.rs**: CTR siblings sharing one `legacyKey` resolve via
    the matching `scope.options` sibling, now per-context instead of a single
    shared default, with ties broken on smallest uuid; `from_records` builds
    `legacy_name_index` deterministically instead of first-wins.
  - **sdk/cli/src/main.rs**: `figma diff` summary reports `multi-mode-mismatch`.
  - **sdk/README.md**: documents the new `multi-mode-mismatch` class.

- [#1394](https://github.com/adobe/spectrum-design-data/pull/1394) [`5e22a7a`](https://github.com/adobe/spectrum-design-data/commit/5e22a7a18cd1a4f2a5957cba9cafa66bef73ed63) Thanks [@GarthDB](https://github.com/GarthDB)! - Re-point component/token relationship (CTR) `$ref`s that pointed at deprecated tokens
  (e.g. accordion spacing bindings still referencing tokens deprecated by SDS-15500) onto
  their live `lifecycle.replacedBy` target, and add a rule that catches regressions.
  - **packages/design-data/relationships/\*.json**: 1,366 relationship-only `$ref`s
    re-pointed to their live replacement via `lifecycle.replacedBy`; 285 with no
    replacement pointer are left as-is and now surface as SPEC-058 warnings. Does not
    change `packages/tokens/src/` (`@adobe/spectrum-tokens`) — verified byte-identical.
  - **migrate-to-relationships.mjs** and **seed-token-bindings.mjs**: resolve through
    `lifecycle.replacedBy` when emitting a `$ref`, so re-running either generator can't
    reintroduce a deprecated reference.
  - **sdk/core/src/validate/rules/spec058.rs**: new warning rule (`ctr-ref-not-deprecated`)
    flagging a relationship-only CTR whose `$ref` resolves to a deprecated token.
  - **packages/design-data-spec/rules/rules.yaml**: catalogs SPEC-058.

## 2.6.0

### Minor Changes

- [#1413](https://github.com/adobe/spectrum-design-data/pull/1413) [`7f7b1d4`](https://github.com/adobe/spectrum-design-data/commit/7f7b1d465d7280551fffc8a3ab2b66132c50a1b8) Thanks [@GarthDB](https://github.com/GarthDB)! - `figma diff`/`figma import` now resolve CTR `$ref`s that target another CTR's
  own `uuid`/`setUuid` instead of a token, recovering 3 `drop-zone-*-font-size`
  `.Platform scale` variables previously reported `figma-only`
  (closes spectrum-design-data-11k.10.9).
  - **sdk/core/src/graph.rs**: `resolve_relationship_ref` recurses into a
    sibling CTR when its `$ref` target isn't a token, following chains up to
    16 hops deep (e.g. `drop-zone-title-font-size` → `illustrated-message-*` →
    `body-*` → a token). `relationship_target_exists` now shares the same
    sibling lookup. `code-cjk-font-family` still doesn't resolve — its chain
    bottoms out at an inline `font-family` CTR, out of scope by design.

- [#1411](https://github.com/adobe/spectrum-design-data/pull/1411) [`9acf536`](https://github.com/adobe/spectrum-design-data/commit/9acf53640c3e02a4efdf38aba81b1f087666d8f9) Thanks [@GarthDB](https://github.com/GarthDB)! - `figma diff`/`figma import` now resolve Component/Token Relationship (CTR)
  entries that carry their value inline instead of a `$ref`, recovering 438
  `.Platform scale` variables previously reported `figma-only` for lacking a
  design-data token (closes spectrum-design-data-11k.10.8).
  - **sdk/core/src/graph.rs**: `resolve_relationship_ref` falls back to a new
    `relationship_tokens` index of inline-value CTRs (dimension, multiplier,
    gradient-stop). Scale-set CTRs carry all scale values along, so per-mode
    diffs align to Figma's own mode rather than a hardcoded scale. Inline
    `font-family` CTRs still don't resolve — no comparison rule for them.
  - **sdk/core/src/figma/import.rs**: `scale_aligned_source_value` reads the
    new per-scale values directly, since CTR scale-sets never enter
    `set_uuid_index`.
  - **sdk/core/src/validate/mod.rs**: reindexes `relationship_tokens` after
    loading a `relationships_path` catalog.

- [#1409](https://github.com/adobe/spectrum-design-data/pull/1409) [`7cc6005`](https://github.com/adobe/spectrum-design-data/commit/7cc600534a0cd5666b0b82d2b99731c5d6ef9b4f) Thanks [@GarthDB](https://github.com/GarthDB)! - `figma diff` now resolves variables whose own name can't invert to a legacy
  key but which are themselves a Figma alias into a resolvable variable,
  recovering the `Layout` collection and more of `S2.Color-theme` (closes
  spectrum-design-data-11k.10.4).
  - **sdk/core/src/figma/import.rs**: new `resolve_alias_target` fallback in
    `diff_values` follows a `VARIABLE_ALIAS` to its target and inverts the
    target's name when the variable's own name doesn't resolve, turning ~586
    `figma-only` variables into `match`/`value-mismatch` (all 329 `Layout`
    variables, plus previously-uncovered `S2.Color-theme`/`.Platform
scale`/`Iconography` variables) without a per-collection override table.

- [#1404](https://github.com/adobe/spectrum-design-data/pull/1404) [`b09aa84`](https://github.com/adobe/spectrum-design-data/commit/b09aa84a062456b3ae875b40053792e057a74c6a) Thanks [@GarthDB](https://github.com/GarthDB)! - `figma diff`/`figma pair` now resolve most of the `S2.Color-theme` collection
  instead of reporting it almost entirely `figma-only` (closes
  spectrum-design-data-11k.10.2).
  - **sdk/core/src/figma/import.rs**: `invert_name` normalizes nested Figma
    names (`Palette/blue/100`) to dash-form legacy keys instead of only
    stripping the first slash, recovering ~370 Palette variables.
  - **sdk/core/src/figma/import.rs**: `collapse_modes` now follows
    `VARIABLE_ALIAS` chains via a new `resolve_figma_value` resolver instead of
    giving up, turning hundreds of `skipped-uncovered` variables into real
    `match`/`value-mismatch` results.
  - **sdk/core/src/figma/import.rs**: new `pair_by_value` auto-pairs
    name-unresolvable `Alias/`/`Icon/` variables to design-data tokens by
    resolved value, for human review via a `--mapping` override.
  - **sdk/cli/src/main.rs**: new `figma pair` subcommand exposes
    `pair_by_value` (mirrors `figma diff`'s flags).

- [#1407](https://github.com/adobe/spectrum-design-data/pull/1407) [`715bc9d`](https://github.com/adobe/spectrum-design-data/commit/715bc9d19da54eb39a3397bba3bca8cb0149a38c) Thanks [@GarthDB](https://github.com/GarthDB)! - `figma diff`/`figma pair` now resolve the atomic Typography leaf variables
  instead of reporting them `figma-only` (closes spectrum-design-data-11k.10.3).
  - **sdk/core/src/figma/import.rs**: `invert_name` normalizes atomic
    Typography-collection names (`Font size/100`, `Line height/Font size 100`,
    `Font weight/Extra bold`, etc.) to their legacy keys, recovering 47 of the
    177 `figma-only` Typography variables.
  - **sdk/cli/src/main.rs**: `PAIR_NAME_PREFIXES` adds the Typography grouping
    prefixes (`Heading/`, `Body/`, `Title/`, `Detail/`, `Code/`) so `figma pair`
    covers them; most report `ambiguous` since design-data models these
    groupings as composites, not per-field tokens.
  - **sdk/core/tests/fixtures/figma/s2-typography.mapping.json**: new curated
    mapping for the 5 grouping variables that pair cleanly by value.

- [#1408](https://github.com/adobe/spectrum-design-data/pull/1408) [`294486e`](https://github.com/adobe/spectrum-design-data/commit/294486e8c753c69b4786fb7d6cdbcb09fde606f9) Thanks [@GarthDB](https://github.com/GarthDB)! - `figma diff` now resolves Typography grouping variables against their
  Component/Token Relationship (CTR) targets instead of reporting them
  `figma-only` (closes spectrum-design-data-11k.10.7).
  - **sdk/core/src/figma/import.rs**: `invert_name` normalizes the Typography
    grouping prefixes (`Heading/`, `Body/`, `Title/`, `Detail/`, `Code/`) to
    their CTR `legacyKey`, recovering 129 of the remaining 130 `figma-only`
    Typography variables.
  - **sdk/core/src/graph.rs**: new `TokenGraph::resolve_relationship_ref`
    follows a CTR's `$ref` to its target token, as a fallback when
    `resolve_alias_key` finds no direct token match.
  - **sdk/cli/src/main.rs**: `figma diff`'s graph now loads
    `packages/design-data/relationships` so CTRs are available to resolve
    against, also recovering non-Typography CTR-backed variables previously
    reported `figma-only`.

- [#1406](https://github.com/adobe/spectrum-design-data/pull/1406) [`1750f5d`](https://github.com/adobe/spectrum-design-data/commit/1750f5d1bcc4db52a64bb7d4c68eb2addb175587) Thanks [@GarthDB](https://github.com/GarthDB)! - `figma pair` resolves nearly all remaining `S2.Color-theme` value collisions
  instead of leaving them ambiguous (closes spectrum-design-data-11k.10.6).
  - **sdk/core/src/figma/import.rs**: replace `figma_path_score`'s
    cascade-field matching with a Jaccard word-overlap score between a Figma
    path and the design-data key itself — the words that actually carry
    semantic identity (e.g. `notice`, `key-focus`) live in the key, not its
    raw cascade fields — ignoring bare numeric words (a shared scale index
    like `100` isn't semantic overlap). Cuts ambiguous collisions from 321 to 6.
  - **sdk/core/src/figma/import.rs**: `pair_by_value` now demotes any
    legacy_key chosen by more than one Figma variable back to ambiguous,
    since a mapping artifact can only hold one figmaName per key.
  - **sdk/cli/src/main.rs**: `figma pair`'s pretty-format ambiguous label now
    also covers entries demoted by the collision guard above, not just ties.
  - **sdk/core/tests/fixtures/figma/s2-color-theme.mapping.json**: new curated
    `--mapping` artifact (322 entries) for `figma diff`/`figma export`,
    covering the resolved collisions plus one hand-picked true tie.

## 2.5.0

### Minor Changes

- [#1401](https://github.com/adobe/spectrum-design-data/pull/1401) [`ac24aa5`](https://github.com/adobe/spectrum-design-data/commit/ac24aa5c754c11fdb236baf8d43f91eed0d3acc5) Thanks [@GarthDB](https://github.com/GarthDB)! - The Figma export generator's collection routing is now file-aware instead of
  purely schema-based, as plumbing for wiring up new Figma collections
  (closes spectrum-design-data-11k.10.1).
  - **sdk/core/src/figma/mapping.rs**: adds `TokenKind`/`CollectionSpec` and a
    `COLLECTION_SPECS` table (still 2 wildcard entries — `.Color theme` and
    `.Platform scale` — so behavior is unchanged); `resolve_collections`/
    `pick_collection` replace the two hardcoded `find_collection` calls;
    `load_all_tokens` and `build_export_payload` thread each token's source
    file through as a `(name, file, value)` triple so a future spec can route
    by file; `process_alias_token` takes its color/scale prefixes as
    parameters.
  - **sdk/core/src/figma/import.rs**: `diff_values` accepts the same 3-tuple
    token shape.
  - **sdk/cli/src/main.rs**: manifest-cascade export and `figma diff` build
    the 3-tuple token list, including each token's file.

- [#1400](https://github.com/adobe/spectrum-design-data/pull/1400) [`11e8084`](https://github.com/adobe/spectrum-design-data/commit/11e8084a80d68a7a08ac5f02a04e389485f37772) Thanks [@GarthDB](https://github.com/GarthDB)! - The Figma export generator now emits native `VARIABLE_ALIAS` references for
  mode values that alias another exported variable, instead of flattening them
  to a literal (closes spectrum-design-data-11k.8.3).
  - **sdk/core/src/figma/mapping.rs**: `process_color_set_token` and
    `process_scale_set_token` push a `VARIABLE_ALIAS` value when a mode's alias
    target is part of the export run, falling back to today's literal
    flattening only when the target is outside the exported set;
    `resolve_variable_id` is extracted from `make_variable_action` and a
    pre-pass resolves every token's variable id up front so alias targets
    processed later in the token list still resolve; `ExportSummary` gains
    `mode_values_aliased`.
  - **sdk/cli/src/main.rs**: `figma export`'s summary line reports how many
    mode values were aliased.

### Patch Changes

- [#1400](https://github.com/adobe/spectrum-design-data/pull/1400) [`11e8084`](https://github.com/adobe/spectrum-design-data/commit/11e8084a80d68a7a08ac5f02a04e389485f37772) Thanks [@GarthDB](https://github.com/GarthDB)! - `figma diff` no longer reports garbage `path:index` names for cascade-format
  tokens, which was masking the real design-data-only coverage gap (closes
  spectrum-design-data-11k.9).
  - **sdk/cli/src/main.rs**: `run_figma_diff` resolves each token's real legacy
    key via `naming::extract_legacy_key` instead of using the raw graph key,
    which is a synthetic `path:index` string for cascade-format tokens.
  - **sdk/core/src/figma/import.rs**: a name that still falls back to its
    synthetic key is now classified `skipped-uncovered` with reason
    `legacy-key-unresolved`, instead of leaking into `design-data-only`.

- [#1403](https://github.com/adobe/spectrum-design-data/pull/1403) [`c23cc54`](https://github.com/adobe/spectrum-design-data/commit/c23cc5457a50e3253ce57a7e04d93e92f20300a1) Thanks [@GarthDB](https://github.com/GarthDB)! - Figma export no longer sends `VARIABLE_ALIAS` references to variable ids that
  were never created, which Figma would reject (closes spectrum-design-data-qz1o).
  - **sdk/core/src/figma/mapping.rs**: `build_export_payload` now drops any
    `ModeValueAction` whose `VARIABLE_ALIAS` targets an id absent from the
    emitted `variables` list (e.g. an alias target with malformed `sets`) and
    records a `mode_warnings` entry instead of emitting the dangling reference.

- [#1400](https://github.com/adobe/spectrum-design-data/pull/1400) [`11e8084`](https://github.com/adobe/spectrum-design-data/commit/11e8084a80d68a7a08ac5f02a04e389485f37772) Thanks [@GarthDB](https://github.com/GarthDB)! - Figma export now warns when a token's mode has no matching mode in the
  target collection, instead of silently dropping that mode value (closes
  spectrum-design-data-11k.8.2).
  - **sdk/core/src/figma/mapping.rs**: `ExportSummary` gains `mode_warnings`;
    `process_color_set_token`/`process_scale_set_token` record a warning
    naming the token, mode, and collection when the target collection has no
    matching mode, instead of silently skipping.
  - **sdk/cli/src/main.rs**: `figma export` prints mode warnings after the
    summary.

## 2.4.0

### Minor Changes

- [#1399](https://github.com/adobe/spectrum-design-data/pull/1399) [`05e89b2`](https://github.com/adobe/spectrum-design-data/commit/05e89b2a6c440837de12362b24a526b9f160d7f4) Thanks [@GarthDB](https://github.com/GarthDB)! - New `figma diff` CLI command reports a value-level, read-only comparison
  between the manifest-resolved dataset and a Figma file's actual variable
  values (closes spectrum-design-data-11k.6).
  - **sdk/core/src/figma/import.rs**: add `diff_values`, classifying every
    Figma variable and design-data token as match / value-mismatch /
    figma-only / design-data-only / renamed / skipped-uncovered, reusing
    the value-comparison codec `build_import_overrides` uses.
  - **sdk/cli/src/main.rs**: `figma diff --file-key --token [--snapshot]
[--mapping] [--manifest] --format pretty|json`.
  - **sdk/core/src/figma/{mapping,import}.rs**: normalizes opacity,
    font-weight/style naming, `dp` units, and per-scale mode alignment
    (only when the aligned scale actually matches) so `figma diff` reports
    only genuine drift; a `--mapping`-renamed design-data-only entry now
    reports its real legacy key; `renamed` prints separately from the
    counts it can overlap with.

- [#1396](https://github.com/adobe/spectrum-design-data/pull/1396) [`f122a90`](https://github.com/adobe/spectrum-design-data/commit/f122a901858ca1ed3d833e934b8c94197534b22f) Thanks [@GarthDB](https://github.com/GarthDB)! - The Figma export generator can now export from a manifest-resolved dataset
  instead of a raw token-source directory (closes spectrum-design-data-h890.11).
  - **sdk/core/src/figma/mapping.rs**: `build_export_payload` takes a
    `tokens: &[(String, Value)]` slice instead of a token-source directory
    path; `load_all_tokens` is now `pub` so callers load tokens themselves
    before building the payload.
  - **sdk/cli/src/main.rs**: `figma export` gains a `--manifest <PATH>` flag;
    when given, tokens are resolved through the platform manifest cascade
    (include/exclude, overrides, extensions) before export instead of reading
    `path` as a raw token directory. Behavior without `--manifest` is unchanged.

- [#1398](https://github.com/adobe/spectrum-design-data/pull/1398) [`13ec65c`](https://github.com/adobe/spectrum-design-data/commit/13ec65cd489c0cdb75258c071e3d6e6fa743b20d) Thanks [@GarthDB](https://github.com/GarthDB)! - New `figma import` CLI command reads a Figma file's current variable values and
  emits manifest `overrides` entries for the ones a designer edited (closes
  spectrum-design-data-h890.12).
  - **sdk/core/src/figma/import.rs**: new module — inverts the `{prefix}/{legacyKey}`
    Figma Variable naming convention back to a token, diffs its per-mode Figma value
    against the manifest-resolved source, and emits an override only when it diverged.
  - **sdk/core/src/figma/color.rs**: adds `format_color`, the reverse of `parse_color`.
  - **sdk/core/src/figma/mod.rs**: registers the new `import` module.
  - **sdk/cli/src/main.rs**: `figma import <path> --file-key <k> --manifest <m.json>
[--mapping <artifact>] [--out <PATH>]` fetches Figma variables and writes the
    resulting overrides manifest, reporting unmapped/multi-mode-divergent/unconvertible
    variables to stderr.

## 2.3.1

### Patch Changes

- [#1393](https://github.com/adobe/spectrum-design-data/pull/1393) [`63d0ef4`](https://github.com/adobe/spectrum-design-data/commit/63d0ef4a7d82db80caf6229dac55c9d820443927) Thanks [@GarthDB](https://github.com/GarthDB)! - Register the iOS pressed/down state synonym surfaced by the iOS platform-manifest POC
  (spectrum-design-data-h890.17).
  - **packages/design-data/registry/states.json**: `active` gains `aliases: ["pressed"]`
    (iOS's pressed/down terms) and cross-references `down`; regenerated
    `sdk/core/src/registry_data.rs`.

## 2.3.0

### Minor Changes

- [#1385](https://github.com/adobe/spectrum-design-data/pull/1385) [`6d070af`](https://github.com/adobe/spectrum-design-data/commit/6d070af0f289fc18d23b7406ed23bc606ccc7e65) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove iOS-specific component and platform-extension data now served from the
  external `spectrum-ios-design-data` repo via the manifest cascade (closes bead
  h890.22.5).
  - **components/tab-bar-ios.json**: removed — canonical copy now lives external,
    wired through `extensions.components`.
  - **registry/platform-extensions/ios-states.json**: removed — canonical copy
    now lives external, wired through `extensions.platformExtensions`.

## 2.2.0

### Minor Changes

- [#1336](https://github.com/adobe/spectrum-design-data/pull/1336) [`9c697cf`](https://github.com/adobe/spectrum-design-data/commit/9c697cfcee3820ddc7bc3688ea000552de708641) Thanks [@GarthDB](https://github.com/GarthDB)! - Resolve SPEC-027 dangling `tokenBindings` via design-owner triage
  (spectrum-design-data-vpk.1).
  - **components/cards.json**: drop 4 `card-selection-background-corner-radius-*`
    bindings — card-selection only has background-size/-color tokens, no
    corner-radius family exists.
  - **components/menu.json**: drop the `popover-submenu-to-menu-item-position`
    binding — no "submenu" token exists anywhere in the dataset.
  - **components/alert-dialog.json**: drop the `alert-dialog-top-to-alert-icon`
    binding — no matching spacing token exists in the live Figma spec.
  - **components/date-picker.json**: drop the 3 `range-border-dash-*` bindings —
    the live spec documents a solid range fill, not a dashed border.
  - **tokens/token-types/angle.json**: add a new `angle` token type (degrees) for
    rotation/direction values like gradient angle.
  - **tokens**: define 8 tokens confirmed live in Figma but missing from the
    corpus — tabs gap/indicator-thickness, `neutral-content-color-selected-*`,
    date-picker strikethrough thickness/angle and in-field-button gap.

## 2.1.1

### Patch Changes

- [#1333](https://github.com/adobe/spectrum-design-data/pull/1333) [`0b2d328`](https://github.com/adobe/spectrum-design-data/commit/0b2d328b9dbfe7adf3cb762853faa15a4ba92dd0) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove SPEC-027 dangling `tokenBindings` superseded by CTR relationships or
  referencing no real token (closes spectrum-design-data-vpk).
  - **components/cards.json**: drop 3 legacy bindings (`card-header-to-footer`,
    `card-title-to-description`, `horizontal-card-edge-to-content-regular`) now
    covered by CTR relationships.
  - **components/table.json**: drop 4 duplicate selected-row-background bindings
    covered by CTR.
  - **components/combo-box.json**: drop the `in-field-progress-circle` binding
    (that name is an anatomy anchor, not a token; covered by CTR).
  - **components/list-view.json**: drop the stale `stack-item-*` binding
    covered by CTR.
  - **components/tree-view.json**: drop 2 drag-handle spacing bindings covered
    by CTR.
  - **components/drop-zone.json**: drop 4 bindings referencing non-Spectrum
    garbage token names.

## 2.1.0

### Minor Changes

- [#1330](https://github.com/adobe/spectrum-design-data/pull/1330) [`afbadb2`](https://github.com/adobe/spectrum-design-data/commit/afbadb23a3ddd75640777909cdf97b849fc0daa7) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate component `tokenBindings` and `name.component`-scoped tokens into
  Component/Token Relationships (CTRs), closing spectrum-design-data-x29.4.
  - **packages/design-data/components/\*.json**: `tokenBindings` entries that
    resolve to a single component's own scope are removed (superseded by
    CTRs); shared/ambiguous bindings are left in place.
  - **packages/design-data/relationships/\*.json**: new — 91 files, one per
    component, holding the migrated CTRs (`scope` + `$ref` to the token).
  - **packages/design-data/tokens/\*.tokens.json** (color-component,
    color-palette, layout-component, layout, typography): `name.component`-scoped
    tokens removed (now represented as CTRs).
  - **packages/design-data/scripts/migrate-to-relationships.mjs**: new
    re-runnable migration script.

## 2.0.0

### Major Changes

- [#1325](https://github.com/adobe/spectrum-design-data/pull/1325) [`6ef9247`](https://github.com/adobe/spectrum-design-data/commit/6ef9247f997dc34c2eea54f12bc9c9a4cbcda2df) Thanks [@GarthDB](https://github.com/GarthDB)! - Nest token lifecycle fields under a single `lifecycle` object, matching the component
  schema's existing `lifecycle` pattern (closes spectrum-design-data-u6w). `deprecated`
  is renamed to `lifecycle.deprecatedIn` — the old name read as boolean-ish even though
  it holds a version string. Legacy output (`@adobe/spectrum-tokens`) is unchanged;
  `deprecated`/`deprecated_comment`/`renamed` there stay flat.
  - **packages/design-data-spec/schemas/token.schema.json**: new `$defs.lifecycle`
    (`introduced`, `deprecatedIn`, `deprecatedComment`, `replacedBy`, `plannedRemoval`),
    referenced from `tokenWithValue`/`tokenWithRef` in place of the 5 removed flat fields.
  - **packages/design-data-spec/schemas/component.schema.json**: renamed the existing
    `lifecycle.deprecated` to `lifecycle.deprecatedIn` so token and component schemas match.
  - **packages/design-data/tokens/\*.tokens.json** (7 of 8 files): 1,323 tokens migrated
    from flat `deprecated`/`deprecated_comment`/`replaced_by`/`plannedRemoval`/`introduced`
    into the nested `lifecycle` object.
  - **packages/design-data/scripts/migrate-lifecycle-nesting.js**: new re-runnable
    migration script.
  - **sdk/core/src** (`legacy.rs`, `migrate.rs`, `diff.rs`, `authoring/{lifecycle,session}.rs`,
    `validate/rules/spec0{10,11,12,13,14,36,37}.rs`): retargeted to `lifecycle.*`.

### Minor Changes

- [#1322](https://github.com/adobe/spectrum-design-data/pull/1322) [`fe338ee`](https://github.com/adobe/spectrum-design-data/commit/fe338ee9143b3fa95dc045ac43b3a0b9e5934af2) Thanks [@GarthDB](https://github.com/GarthDB)! - The Figma export generator now honors a name-mapping override artifact
  (closes spectrum-design-data-11k.5).
  - **sdk/core/src/figma/mapping.rs**: `build_export_payload` takes an optional
    `overrides: Option<&HashMap<String, String>>` (legacyKey to Figma name);
    absent or empty overrides keep today's `{prefix}/{legacyKey}` naming;
    remapping an existing name creates a new variable rather than renaming.
  - **sdk/cli/src/main.rs**: `figma export` gains a `--mapping <PATH>` flag
    that loads overrides from a `figma audit` artifact (or a bare
    `{legacyKey: name}` JSON object).

### Patch Changes

- [#1325](https://github.com/adobe/spectrum-design-data/pull/1325) [`6ef9247`](https://github.com/adobe/spectrum-design-data/commit/6ef9247f997dc34c2eea54f12bc9c9a4cbcda2df) Thanks [@GarthDB](https://github.com/GarthDB)! - Backfill the `deprecated: "unknown"` migration placeholder with the real `@adobe/spectrum-tokens`
  release version each token was deprecated in (closes spectrum-design-data-3xf). Legacy output is
  unchanged — `deprecated` stays truthy either way.
  - **packages/design-data/tokens/\*.tokens.json** (7 of 8 files): 1,323 tokens' deprecation
    version replaced `"unknown"` with the release version recovered from
    `packages/tokens/CHANGELOG.md`'s "Newly Deprecated" history (1,242 tokens) or git
    archaeology on `packages/tokens/src/*.json` (81 tokens).
  - **packages/design-data/scripts/backfill-deprecated-versions.js**: new re-runnable recovery script
    documenting the two-source resolution method.

- [#1321](https://github.com/adobe/spectrum-design-data/pull/1321) [`b879343`](https://github.com/adobe/spectrum-design-data/commit/b8793437edeb815c960263de896b9c56b79aa6c5) Thanks [@GarthDB](https://github.com/GarthDB)! - Audit generated Figma Variable names against the real S2-Web baseline
  snapshot (closes spectrum-design-data-11k.4).
  - **sdk/core/src/figma/audit.rs**: new `audit_names` — diffs generator
    output against a real `VariablesMeta` snapshot per collection, reporting
    matched/figma-only/generated-only names and a legacyKey override scaffold.
  - **sdk/cli/src/main.rs**: new `design-data figma audit --snapshot <FILE>
--token-dir <DIR>` subcommand (offline, no network).
  - **sdk/core/tests/fixtures/figma/name-mapping.audit.json**: committed audit
    artifact against the 11k.3 baseline.

- [#1319](https://github.com/adobe/spectrum-design-data/pull/1319) [`d35aea8`](https://github.com/adobe/spectrum-design-data/commit/d35aea805d1315d294f312c7bedba4de3edaf2ae) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a checked-in baseline snapshot of Figma variables for the "S2 – Web" file, the
  ground truth for the upcoming name-mapping audit and offline `figma diff` work
  (closes spectrum-design-data-11k.3).
  - **sdk/core/tests/fixtures/figma/s2-web-variables.baseline.json**: key-sorted
    `VariablesMeta` captured via `design-data figma read --format json`.
  - **sdk/core/tests/fixtures/figma/README.md**: collection/mode/variable-count summary
    and capture provenance.
  - **sdk/core/src/figma/mapping.rs**: smoke test deserializing the fixture back into
    `VariablesMeta`.

## 1.0.3

### Patch Changes

- [#1317](https://github.com/adobe/spectrum-design-data/pull/1317) [`f7f8bef`](https://github.com/adobe/spectrum-design-data/commit/f7f8beff6b82d9431c17a84e8286677aa3e27e61) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose the last remaining fused `name.property`: the stack-item selected/highlight
  background-color token (closes spectrum-design-data-284). Legacy output is unchanged
  (`legacyKey` pinned).
  - **packages/design-data/tokens/color-aliases.tokens.json**: split
    `stack-item-selected-background-color-highlight`'s fused `stack-item-background-color`
    property into `object:"background"` + `property:"color"`. The `stack-item` prefix isn't
    reintroduced as a `component` field — the legacy reference data for this cross-component
    alias never tagged it with one, so `legacyKey` is the only place it's preserved.

## 1.0.2

### Patch Changes

- [#1315](https://github.com/adobe/spectrum-design-data/pull/1315) [`3f5f00f`](https://github.com/adobe/spectrum-design-data/commit/3f5f00fe724257099316e33d608305fe86e1fffa) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose the last fused `name.property` residue: the 15 `component-{size}-{weight}`
  typography tokens (closes spectrum-design-data-284.9). Legacy output is unchanged
  (`legacyKey` pinned throughout).
  - **packages/design-data/tokens/typography.tokens.json**: split `component-l-bold` etc.
    into `variant:"component"` + `property:"typography"` + `size` + existing `weight`.
  - **packages/design-data/registry/variants.json**: registered `component` under a new
    `typography-role` category (compact in-component scale, alongside body/detail/heading/title).
  - **packages/design-data/registry/property-terms.json**: registered `typography`
    (composite type-style property, the only non-atomic typography term left in the corpus).
  - **sdk/core/src/registry_data.rs**: regenerated from the registry JSON above.

## 1.0.1

### Patch Changes

- [#1314](https://github.com/adobe/spectrum-design-data/pull/1314) [`3862608`](https://github.com/adobe/spectrum-design-data/commit/3862608509174f10e92d3c90aeae29f2fe9a4769) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose remaining background/opacity fusion residue missed by 284.3
  (closes spectrum-design-data-284.6).
  - **packages/design-data/tokens/color-aliases.tokens.json**:
    `background-opacity-key-focus` split into `object`/`property`, matching
    the sibling `background-*-opacity` state tokens.
  - **packages/design-data/tokens/color-component.tokens.json**:
    `card-background-loading-color`, `table-selected-row-background-opacity`
    (+ hover/non-emphasized variants), `tree-view-row-background-hover`, and
    `tree-view-selected-row-background-{default,hover}` split into
    `object`/`property`, keeping existing `legacyKey` pins.
  - `background-base-color`, `background-layer-1-color`/`-2-color`, and
    `stack-item-selected-background-color-highlight` left unsplit — they'd
    need a new registered `variant`/`anatomy` id (`base`, `layer`, `item`)
    that doesn't exist today; that's a registry decision, not a data-only
    change, so out of scope here.

- [#1310](https://github.com/adobe/spectrum-design-data/pull/1310) [`3f91a83`](https://github.com/adobe/spectrum-design-data/commit/3f91a8388a0fb0675721d1eebbd747c83fadba8e) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose 8 fused compound-state opacity tokens in `stack-item`/`tree-view`
  into structured `name` fields (closes spectrum-design-data-284.5).
  - **packages/design-data/tokens/layout-component.tokens.json**: split each
    token's fused `property` string (e.g.
    `stack-item-selected-background-opacity-emphasized-hover`) into
    `component`/`anatomy`/`object`/`property`/`state`/`emphasis`/`qualifier`,
    keeping the existing pinned `legacyKey` unchanged.

- [#1314](https://github.com/adobe/spectrum-design-data/pull/1314) [`3862608`](https://github.com/adobe/spectrum-design-data/commit/3862608509174f10e92d3c90aeae29f2fe9a4769) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose the final grab-bag of fused `name.property` residue left after
  284.3/284.6 (closes spectrum-design-data-284.7).
  - **registry/variants.json**: register `base`/`layer` (context) and `hero`
    (card emphasis) variant ids.
  - **registry/property-terms.json**: register `rounding-increment`.
  - **color-aliases.tokens.json**: `background-{base,layer-1,layer-2}-color`
    split into `variant`/`object`/`property`.
  - **typography.tokens.json**: `default-font-family` simplified to atomic
    `property:"font-family"`.
  - **layout-component.tokens.json**: split `card-selection-background-size`,
    coach-indicator ring rounding-increments, `menu-item-section-divider-
height`, `radio-button-selection-indicator`, `table-border-divider-width`,
    `collection-card-minimum-height-hero-*`, `drop-zone-cjk-title-font-size`.
  - **layout.tokens.json**: `side-focus-indicator` split into
    `orientation`/`anatomy`/`property`.
  - `opacity-checkerboard-square-{dark,light}` intentionally left atomic
    (design-asset swatch).

- [#1312](https://github.com/adobe/spectrum-design-data/pull/1312) [`1d9a3b3`](https://github.com/adobe/spectrum-design-data/commit/1d9a3b36ad03dd772f4fd1f3db93a38538404b94) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose 81 fused position/size/state tokens into structured `name` fields
  (closes spectrum-design-data-284.2).
  - **packages/design-data/tokens/layout-component.tokens.json**: split 70
    tokens' fused `property` strings (e.g. `default-width`, `cjk-size-l`,
    `handle-large`, `steplist-step-default-height-large`) into
    `property`/`size`/`state`/`anatomy`/`density`/`script`, keeping each
    token's pinned or newly-reconstructed `legacyKey` unchanged.
  - **packages/design-data/tokens/layout.tokens.json**: split 7
    `base-padding-horizontal-uniform-*` tokens into `property`/`orientation`/
    `shape`/`size`.
  - **packages/design-data/tokens/typography.tokens.json**: split 4
    `margin-{top,bottom}-multiplier` tokens (detail, heading) into
    `property`/`position`.
  - Triaged 22 genuinely ambiguous tokens without forcing a naming call:
    `side-focus-indicator`, `default-font-family`, 15 `component-*` typography
    tokens, and 5 `collection-card-minimum-height-hero-*` tokens (no
    registered `hero` variant id).

- [#1314](https://github.com/adobe/spectrum-design-data/pull/1314) [`3862608`](https://github.com/adobe/spectrum-design-data/commit/3862608509174f10e92d3c90aeae29f2fe9a4769) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose the four registered legacy-alias surface-color properties into
  `object` + `property` (closes spectrum-design-data-284.8).
  - **color-aliases.tokens.json**, **color-component.tokens.json**,
    **icons.tokens.json**, **layout-component.tokens.json**,
    **semantic-color-palette.tokens.json**: split `background-color`,
    `border-color`, `visual-color`, and `border-opacity` into
    `object:"background"|"border"|"visual"` + `property:"color"|"opacity"`,
    pinning an explicit `legacyKey` on every changed token.
  - `content-color`/`fill-color` intentionally left atomic (already-registered
    atomic property terms, per prior epic-284 decisions).

- [#1313](https://github.com/adobe/spectrum-design-data/pull/1313) [`4358f73`](https://github.com/adobe/spectrum-design-data/commit/4358f736dfe999f786af618c7395a2596ac1baf7) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose fused surface/anatomy + colorRole property values into structured
  `name` fields (closes spectrum-design-data-284.3).
  - **packages/design-data/tokens/color-aliases.tokens.json**: split
    `overlay-color`/`overlay-opacity`, `static-*-text-color`,
    `static-*-track-color`, and `static-*-track-indicator-color` into
    `object`/`anatomy` + atomic `property`, keeping existing `legacyKey` pins.
  - **packages/design-data/tokens/icons.tokens.json**: split
    `icon-color-disabled-primary` and `icon-color-emphasized-background` into
    `icon` + `property`/`state`/`colorRole`/`emphasis`.
  - **packages/design-data/tokens/semantic-color-palette.tokens.json**: split
    `icon-color-{informative,negative,neutral,notice,positive}` into
    `anatomy:"icon"` + `property`/`colorRole`.
  - `background-color`, `border-color`, `visual-color`, `content-color`, and
    `fill-color` are registered atomic property terms and were intentionally
    left unsplit.

## 1.0.0

### Major Changes

- [#1302](https://github.com/adobe/spectrum-design-data/pull/1302) [`50d0ffe`](https://github.com/adobe/spectrum-design-data/commit/50d0ffe75b7303bea6b113877b7e559fd4a985de) Thanks [@GarthDB](https://github.com/GarthDB)! - Change token name-object `state` from a single (optionally hyphenated) string to
  an ordered array of atomic state ids (Proposal 006, supersedes Proposal 005's
  hyphenated-compound encoding).
  - **docs/proposals/006-compound-states-as-array.md**: new proposal; Proposal 005
    marked superseded.
  - **packages/design-data/fields/state.json**, **registry/states.json**: `state`
    is now `array` type; dropped the dead compound-hyphenation pattern.
  - **packages/design-data-spec/schemas**: name-object `state` is now an array of
    atomic ids, `minItems: 1`; `field.schema.json`'s `valueType` enum gained
    `"array"` so `state.json` validates structurally.
  - **packages/design-data/tokens/\*.tokens.json**: every token's `name.state`
    migrated to array form (`"hover"` → `["hover"]`, `"selected-hover"` →
    `["selected", "hover"]`).
  - **sdk/core**: `NameObject.state` is `Option<Vec<String>>`; legacy-key
    generation and validation rules updated for array state. Query filters
    (`state=x`) now match any element of a compound array — see `spec/query.md`.
  - **tools/token-mapping-analyzer**: JS decomposer kept in parity with Rust.

## 0.17.0

### Minor Changes

- [#1300](https://github.com/adobe/spectrum-design-data/pull/1300) [`2065df4`](https://github.com/adobe/spectrum-design-data/commit/2065df4d9703daa92065579976546d64561f25f7) Thanks [@GarthDB](https://github.com/GarthDB)! - Resolve the generic-scope taxonomy call from issue #1290 (bead
  `spectrum-design-data-88m`): decompose `container-*`/`text-*`/`workflow-icon-*`
  layout tokens into structured name objects, each pinned with a `legacyKey` so
  the fused legacy key is unchanged.
  - **packages/design-data/registry/anatomy-terms.json**: flag `text` and
    `workflow-icon` as `standaloneScope: true` so SPEC-025 accepts them as a
    bare `anatomy` value with no owning component/structure.
  - **packages/design-data/tokens/layout.tokens.json**: re-author 37 active
    tokens — 15 `container-*` to `structure: "container"`, 6 `text-*` to
    `anatomy: "text"`, 16 `workflow-icon-*` to `anatomy: "workflow-icon"` —
    each with an explicit `property`/`size` and pinned `legacyKey`.
    `component-*` tokens are left unchanged (intentionally scopeless).
    `workflow-icon-*`'s `property: "size"` is a distinct name-object field from
    the `size` t-shirt-scale field on the same token (e.g. `xxl`) — no collision.

## 0.16.3

### Patch Changes

- [#1298](https://github.com/adobe/spectrum-design-data/pull/1298) [`51ceb0b`](https://github.com/adobe/spectrum-design-data/commit/51ceb0bce5744858549ef5157ec44f3857ecd2b7) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove SPEC-027 dangling `tokenBindings` with no backing token or Figma spec
  entry (bead `spectrum-design-data-vpk.1`, no-spec-entry noise subset).
  - **packages/design-data/components/date-picker.json**: remove `current-day-indicator-size-100`.
  - **packages/design-data/components/avatar.json**: remove `gradient-angle`.
  - **packages/design-data/components/title.json**: remove the bare Title-XXXL
    `font-family`/`font-weight`/`font-size`/`line-height`/`font-style` bindings
    (keeps `letter-spacing`, which resolves to a real token).
  - **packages/design-data/components/tree-view.json**: remove `title-content-color`.

## 0.16.2

### Patch Changes

- [`a869f46`](https://github.com/adobe/spectrum-design-data/commit/a869f46db5a6e2a1d2d10fddcd96a95a6acdf4a9) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix SPEC-027 dangling `component-top-to-workflow-icon-400` tokenBindings
  (bead spectrum-design-data-vpk.1, group A).
  - **packages/design-data/components/combo-box.json**, **number-field.json**,
    **text-area.json**, **text-field.json**: rebind the leading-icon spacing
    entry from `component-top-to-workflow-icon-400` — a step that doesn't
    exist in the token family (which caps at `-300`) and isn't referenced
    anywhere else — to the existing `component-top-to-workflow-icon-300`.

- [`a869f46`](https://github.com/adobe/spectrum-design-data/commit/a869f46db5a6e2a1d2d10fddcd96a95a6acdf4a9) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix SPEC-027 dangling `tokenBindings` for three "safe rebind" cases (bead
  `spectrum-design-data-vpk.1`) where the S2 spec names an existing token, so no
  new token or design-owner sign-off was needed.
  - **packages/design-data/components/cards.json**: rebind
    `card-thumbnail-to-title` to `spacing-100` — the spec documents this gap as
    `8px (spacing-100)`.
  - **packages/design-data/components/menu.json**: rebind `menu-item-to-items`
    to `spacing-50` — the spec documents this gap as `2px (spacing-50)`.
  - **packages/design-data/components/list-view.json**: rebind the bare
    `component-edge-to-text` to `component-edge-to-text-100`, matching every
    other numbered token already bound in this component's `-100` step.

## 0.16.1

### Patch Changes

- [#1291](https://github.com/adobe/spectrum-design-data/pull/1291) [`3b7af28`](https://github.com/adobe/spectrum-design-data/commit/3b7af28c5bb071ac4f0374d2efa0dfbc03cd76ee) Thanks [@GarthDB](https://github.com/GarthDB)! - Triaged the 114 remaining untracked residual tokens in
  `layout-component.tokens.json` (bead spectrum-design-data-opk). No new registry
  vocabulary was needed; published legacy names are unaffected.
  - **packages/design-data/tokens/layout-component.tokens.json**: pinned
    `legacyKey` on 93 deprecated and idiosyncratic-live tokens, and decomposed 21
    live tokens (popover/media/preview/header minimum/maximum dimensions,
    disclosure-indicator height/width, indicator thickness, corner-radius
    family) into existing property and anatomy terms with `legacyKey` pinned.
  - **packages/design-data/components/card.json**: declared the `preview`
    anatomy part used by the decomposed `card-preview-minimum-height` token.
  - **packages/design-data/components/tree-view.json**: declared the
    `disclosure-indicator` anatomy part used by the decomposed
    `tree-view-disclosure-indicator-height/width` tokens.

## 0.16.0

### Minor Changes

- [#1281](https://github.com/adobe/spectrum-design-data/pull/1281) [`5684c8a`](https://github.com/adobe/spectrum-design-data/commit/5684c8afbf34fc391717fdb975699e06eb677a4e) Thanks [@GarthDB](https://github.com/GarthDB)! - Added the `in-field-progress-circle` anatomy term and structured the last 8
  fused `field-top-to-progress-circle-*` layout tokens accordingly (bead
  spectrum-design-data-bzo, bucket 1); legacy names are unaffected.
  - **packages/design-data/registry/anatomy-terms.json**: added
    `in-field-progress-circle` anatomy term.
  - **packages/design-data/tokens/layout.tokens.json**: structured the 8
    `field-top-to-progress-circle-*` tokens into `space-between`/`from`/`to`
    form with `legacyKey`.

### Patch Changes

- [#1283](https://github.com/adobe/spectrum-design-data/pull/1283) [`018f18e`](https://github.com/adobe/spectrum-design-data/commit/018f18e4175e4058fee2ad8f7678c8b07bd278c8) Thanks [@GarthDB](https://github.com/GarthDB)! - Pinned `legacyKey` on the 25 remaining registry-gap residual tokens in
  `layout.tokens.json` (bead spectrum-design-data-rst). 22 of the 25 are already
  deprecated with a `replaced_by` token, so registering new anatomy/qualifier
  vocabulary for them was not worthwhile; published legacy names are unaffected.
  - **packages/design-data/tokens/layout.tokens.json**: pinned `legacyKey` on
    `android-elevation`, `corner-triangle-icon-size-*` (8),
    `navigational-indicator-top-to-back-icon-*` (8), `side-focus-indicator`,
    and `side-label-character-count-*` (6).

## 0.15.0

### Minor Changes

- [#1280](https://github.com/adobe/spectrum-design-data/pull/1280) [`fb94215`](https://github.com/adobe/spectrum-design-data/commit/fb942159265526230b069ffd38f6f52590979582) Thanks [@GarthDB](https://github.com/GarthDB)! - Relaxed SPEC-025 so `anatomy` can anchor to a `structure` or a registry
  term flagged `standaloneScope` (not just `component`), and added SPEC-049 to
  validate the anatomy vocabulary for those non-component cases. Structured 27
  previously-fused layout tokens accordingly (bead spectrum-design-data-bzo,
  bucket 2); legacy names are unaffected.
  - **sdk/core/src/validate/rules/spec025.rs**: relaxed anchor rule.
  - **sdk/core/src/validate/rules/spec049.rs**: new rule, validates
    non-component anatomy values against `anatomy-terms.json`.
  - **packages/design-data/registry/anatomy-terms.json**: flagged
    `focus-ring`/`focus-indicator` `standaloneScope: true`.
  - **packages/design-data/components/table.json**: added `item` anatomy part.
  - **packages/design-data/registry/property-terms.json**: added `indent`.
  - **packages/design-data/tokens/layout.tokens.json**: structured
    `accessory-item-*`, `list-*`, `table-item-*`, `popover-*`, `field-width*`,
    and `focus-ring`/`focus-indicator` tokens.
  - **tools/token-mapping-analyzer/src/apply.js**: matching guard relaxation.
  - **design-data-spec**: `registry-value.json` schema + SPEC-049 rules/fixtures.

### Patch Changes

- [#1279](https://github.com/adobe/spectrum-design-data/pull/1279) [`2f1c008`](https://github.com/adobe/spectrum-design-data/commit/2f1c0088309739e4a8c7d8aa5bba24da8833d7d4) Thanks [@GarthDB](https://github.com/GarthDB)! - Structured 14 untracked fused-property singleton tokens into the `name`
  object (bead spectrum-design-data-dsi.13). Published legacy names are
  unaffected since each token's `legacyKey` pins the flat output name.
  - **packages/design-data/tokens/color-aliases.tokens.json**: extracted
    `structure`/`emphasis`/`state` from the two `drop-shadow-emphasized(-hover)-key-color`
    families (6 tokens); extracted `object` (`focus-indicator`/`title`/`track`)
    and `variant`/`colorFamily` where applicable from 5 generic-alias singletons
    previously fused as `*-color`.
  - **packages/design-data/tokens/color-palette.tokens.json**: extracted
    `component:"avatar"` from the 3 `gradient-stop-N-avatar` tokens.
  - **packages/design-data/tokens/color-component.tokens.json**: pinned
    `legacyKey` on the 3 `opacity-checkerboard` `square-dark` tokens (verified
    the light/dark/wireframe `colorScheme` mismatch flagged in the bead is a
    naming artifact — "dark" names the darker of two alternating tiles, not the
    color scheme — no value change).
  - **packages/design-data/tokens/typography.tokens.json**: pinned `legacyKey`
    on `default-font-family` (no registered segment to extract).

- [#1277](https://github.com/adobe/spectrum-design-data/pull/1277) [`49fd896`](https://github.com/adobe/spectrum-design-data/commit/49fd8968146f9c0fd6acb95e004d00f1df66731e) Thanks [@GarthDB](https://github.com/GarthDB)! - Structured fused `-to-` spacing tokens in `layout.tokens.json` into the `name`
  object (bead spectrum-design-data-dsi.8). Published legacy names are
  unaffected since each migrated token's `legacyKey` pins the flat output name.
  - **packages/design-data/registry/icon-terms.json**: registered `alert` and
    `validation` icon ids so icon-family space-between endpoints resolve.
  - **packages/design-data/tokens/layout.tokens.json**: 48 tokens migrated to
    `{property:"space-between", from, to, icon?}` shape; 29 idiosyncratic
    tokens hand-authored with a pinned `legacyKey`; additional `structure`,
    `size`, `variant`, `qualifier` fields extracted where safe.
  - **packages/design-data/tokens/layout-component.tokens.json**: 41 tokens
    migrated to the `space-between` shape (fix applies corpus-wide, not just
    this bead's file).
  - **packages/design-data/tokens/color-aliases.tokens.json**: `variant`
    extracted from fused property strings (e.g. `informative`, `negative`)
    on keyboard-focus color-scheme tokens.

## 0.14.2

### Patch Changes

- [#1270](https://github.com/adobe/spectrum-design-data/pull/1270) [`b3d1803`](https://github.com/adobe/spectrum-design-data/commit/b3d1803e4c3bb0c3189525d6683571fcc8ce2b1b) Thanks [@GarthDB](https://github.com/GarthDB)! - Converged the drifted `key-focus` state alias onto its registry-canonical form
  `keyboard-focus` (bead spectrum-design-data-bja). Published legacy names are
  unaffected since each token's `legacyKey` already pins the flat output name.
  - **packages/design-data/tokens/color-aliases.tokens.json**: 22 tokens'
    `name.state` changed from `key-focus` to `keyboard-focus`.
  - **packages/design-data/tokens/color-component.tokens.json**: 1 token's
    `name.state` changed from `key-focus` to `keyboard-focus`.
  - **packages/design-data/tokens/layout-component.tokens.json**: 2 tokens'
    `name.state` changed from `key-focus` to `keyboard-focus`.
  - **packages/design-data/tokens/semantic-color-palette.tokens.json**: 1
    token's `name.state` changed from `key-focus` to `keyboard-focus`.
  - **packages/design-data/components/stack-item.json**: declared state
    renamed from `key-focus` to `keyboard-focus` to match.

- [#1275](https://github.com/adobe/spectrum-design-data/pull/1275) [`fe842e9`](https://github.com/adobe/spectrum-design-data/commit/fe842e99a4f95ee4bac624ad956cd06dde170b97) Thanks [@GarthDB](https://github.com/GarthDB)! - Remove 3 duplicate/typo'd tokenBindings on cards (SPEC-027 dangling-binding triage).
  - **packages/design-data/components/cards.json**: removed
    `card-edge-to-content-{compact,default,spacious}-extra-medium` bindings — exact
    duplicates of the existing `-medium` bindings with an invalid `-extra-` scale step
    that doesn't exist in the token set.

## 0.14.1

### Patch Changes

- [#1272](https://github.com/adobe/spectrum-design-data/pull/1272) [`d3c2323`](https://github.com/adobe/spectrum-design-data/commit/d3c23237f90cfa8053bd6949b06c5d88fe270c9e) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix placeholder documentationUrls on 17 new components (fixes Deploy Docs).
  - **packages/design-data/components/**: set per-component documentationUrl
    (page/<name>/) on the 17 components added in #1266 so component slugs are
    unique and match filename stems.

## 0.14.0

### Minor Changes

- [#1267](https://github.com/adobe/spectrum-design-data/pull/1267) [`555f25d`](https://github.com/adobe/spectrum-design-data/commit/555f25d6dcba8a5e8918039f2bab2020b8cf72c7) Thanks [@GarthDB](https://github.com/GarthDB)! - Triaged the SPEC-027 dangling `tokenBindings` backlog surfaced by CI's component
  validation (bead spectrum-design-data-vpk): 84 of 134 were confident typo/word-order
  renames or garbage removals; 50 genuinely ambiguous ones are escalated for
  design-owner sign-off.
  - **packages/design-data/components/\*.json**: fixed 64 dangling `tokenBindings[].token`
    typos/word-order mismatches and removed 20 confirmed-garbage/duplicate entries
    across 26 files; 50 remaining ambiguous bindings left untouched and tracked in
    bead spectrum-design-data-vpk.1.
  - **packages/design-data/moon.yml**: updated the `--components-report-only`
    explanatory comment to reflect the real remaining SPEC-027 count (50, down from 134) and reference the new escalation bead.

## 0.13.0

### Minor Changes

- [#1266](https://github.com/adobe/spectrum-design-data/pull/1266) [`e0c0411`](https://github.com/adobe/spectrum-design-data/commit/e0c0411f6242d1ba4a3972d4fad6084f069a4439) Thanks [@GarthDB](https://github.com/GarthDB)! - `design-data:validate` now loads component JSON so component-aware SPEC rules
  actually run in CI instead of silently short-circuiting (closes bead 0jm).
  - **packages/design-data/moon.yml**: `validate` task now passes `--components-path
./components --components-report-only`. Report-only until SPEC-027's remaining
    ~134 genuinely-dangling `tokenBindings` are triaged; SPEC-018/020/022 are already
    at 0.
  - **sdk/cli/src/main.rs**, **sdk/core/src/report.rs**: new `--components-report-only`
    flag downgrading component-rule errors to warnings.
  - **packages/design-data/components/\*.json**: declared 16 previously-undeclared
    components; added missing anatomy/state declarations across 13 components; fixed
    combo-box's malformed state names.

### Patch Changes

- [#1261](https://github.com/adobe/spectrum-design-data/pull/1261) [`e6c8cd4`](https://github.com/adobe/spectrum-design-data/commit/e6c8cd4b8ef5bb7e6cf1245f6eeb89cdd9d01693) Thanks [@GarthDB](https://github.com/GarthDB)! - Add icon-domain recognition to decompose/serialize and migrate icon `size-N` tokens
  to `scaleIndex` (5p3, dsi.6 follow-up).
  - **tools/token-mapping-analyzer/src/registry-index.js**: index each term's `tokenName`
    (e.g. "checkmark" → "checkmark-icon") as its own matchable segment set, not just a
    serialization alias, so decompose can recognize the icon's expanded legacy form.
  - **tools/token-mapping-analyzer/src/decomposer.js**: `serialize()` gained an icon-owner
    branch (mirrors `naming.rs`'s icon-first legacy key ordering); `decompose()` now accepts
    metadata-provided `icon` (mirrors existing `component` handling) to disambiguate
    tokenName/anatomy-term collisions of equal segment length (e.g. `link-out-icon`); added
    `"icon"` to the stale `FALLBACK_SERIALIZATION_ORDER`.
  - **tools/token-mapping-analyzer/src/apply.js**, **index.js**: thread `token.name.icon`
    metadata into `decompose()` calls.
  - **packages/design-data/tokens/layout-component.tokens.json**: 112 icon `size-N` tokens
    migrated from fused `property: "size-N"` to `property: "size"` + numeric `scaleIndex`,
    following the dsi.6 recipe; legacy-verify confirms byte-identical output.
  - **packages/design-data/tokens/layout.tokens.json**: 1 additional `space-between` token
    picked up by the same full-cascade run.

- [#1264](https://github.com/adobe/spectrum-design-data/pull/1264) [`cd5c385`](https://github.com/adobe/spectrum-design-data/commit/cd5c385487d58c0615b432ca6c07c42c00975fa6) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix SPEC-020/SPEC-022 component anatomy/state gaps surfaced by strict
  `--components-path` validation (7a5).
  - **packages/design-data/components/tree-view.json**: declare the `default` state,
    used by the `space-between` token but previously undeclared.
  - **packages/design-data/components/swatch.json**: declare the `slash` anatomy part,
    used by 4 `thickness` tokens but previously undeclared.
  - **packages/design-data/components/stack-item.json**: new component file — 32 tokens
    reference `component: "stack-item"` but no schema existed; declares its
    `down`/`hover`/`key-focus` states.

- [#1259](https://github.com/adobe/spectrum-design-data/pull/1259) [`2f59ddf`](https://github.com/adobe/spectrum-design-data/commit/2f59ddf14bdc0a46741e0d00ffc1ab281ef445e6) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose fused `corner-radius-N` ramp into `property` + `scaleIndex` (a3z).
  - **packages/design-data/tokens/layout.tokens.json**: 11 `corner-radius-{0,75,100..800,1000}`
    tokens migrated from fused `property: "corner-radius-N"` to `property: "corner-radius"`
    plus numeric `scaleIndex`, following the dsi.6 recipe. Each token keeps its existing
    dimension/multiplier token type; roundtrip verified unchanged.

- [#1257](https://github.com/adobe/spectrum-design-data/pull/1257) [`d9bdf1c`](https://github.com/adobe/spectrum-design-data/commit/d9bdf1c4ac3211d1c0916265e0f5c24ee090b990) Thanks [@GarthDB](https://github.com/GarthDB)! - Pin `name.legacyKey` on 133 fused-property residual tokens in
  `layout-component.tokens.json` (a9t) whose `property` string fuses a
  relation and size term with no density term (e.g.
  `card-default-width-extra-large`). These already round-trip correctly via
  `naming.rs`'s thin-format/general-walk fallback — the pin is a
  forward-compat anchor against a future decompose() migration silently
  renaming them, not a fix for an active `serialize()` bug.
  - **packages/design-data/tokens/layout-component.tokens.json**: pinned
    `legacyKey` on 133 tokens (86 distinct property strings) across `card`,
    `collection-card`, `field-label`, `in-field-button`, `menu`, `slider`,
    `steplist`, `switch`, `table`, and `tag-field`, resolved by `uuid` match
    against `packages/tokens/src/layout-component.json`. All 133 are pure
    relation+size compounds needing no `property-terms.json` registration
    (the atomic-term examples the bead flagged belong to the separate `opk`
    bead).

- [#1258](https://github.com/adobe/spectrum-design-data/pull/1258) [`47a35e9`](https://github.com/adobe/spectrum-design-data/commit/47a35e97708f4e9e793a011c6e2ad01bf4e523f4) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-009 now validates compound `state` values segment-by-segment instead of
  requiring the whole hyphenated string to match a literal registry entry,
  silencing 6 permanent-noise warnings from Proposal 005's compound-state
  convention (closes bead boh).
  - **sdk/core/src/validate/rules/spec009.rs**: for the `state` field, a value
    that fails the whole-string registry lookup is now checked at every hyphen
    boundary (`{mode-state}-{interaction-state}`), so multi-word interaction
    states like `keyboard-focus` aren't mis-split; a value only warns if no
    split has both halves in the registry.

- [#1256](https://github.com/adobe/spectrum-design-data/pull/1256) [`7573ed3`](https://github.com/adobe/spectrum-design-data/commit/7573ed3a243470e549bfcec672f3729a91b2710a) Thanks [@GarthDB](https://github.com/GarthDB)! - Pin `name.legacyKey` on 56 fused-property residual tokens in
  `layout-component.tokens.json` (dg2) whose `property` string fuses a
  relation, size, and density term in the reverse order from dsi.7
  (size-before-density, e.g. `row-height-extra-large-regular`). These
  currently already round-trip correctly via `naming.rs`'s thin-format/
  general-walk fallback (no active `serialize()` bug today) — the pin is a
  forward-compatibility anchor so a future decompose() migration that splits
  `property` into registered `size`/`density` sub-fields can't silently
  reorder and rename the published key.
  - **packages/design-data/tokens/layout-component.tokens.json**: pinned
    `legacyKey` on 56 tokens (28 distinct property strings) across the
    `table` and `thumbnail` component families, resolved by `uuid` match against
    `packages/tokens/src/layout-component.json` — never reconstructed from
    the serialized name, per the dsi.3/dsi.7 house convention.

- [#1254](https://github.com/adobe/spectrum-design-data/pull/1254) [`cb762ce`](https://github.com/adobe/spectrum-design-data/commit/cb762ce98de91253b4d52b8e694886a5d52c4926) Thanks [@GarthDB](https://github.com/GarthDB)! - Register `corner-radius` as the canonical property term (unifying the
  previously-unregistered `corner-radius` and the single-use `border-radius`
  entry) and decompose the last fused `corner-radius-medium` residual (dsi.10).
  - **packages/design-data/registry/property-terms.json**: renamed the
    `border-radius` term to `corner-radius` (label + id) to match actual
    token usage; no more unregistered `corner-radius` property.
  - **packages/design-data/tokens/layout-component.tokens.json**: migrated
    the one `border-radius` token to `property: corner-radius` (existing
    pinned `legacyKey` keeps serialized output unchanged).
  - **packages/design-data/tokens/layout.tokens.json**: decomposed
    `corner-radius-medium` + `state: default` into
    `property: corner-radius`, `state: default`, `size: m`, matching its
    `xl`/`l`/`s` siblings; verified byte-identical via
    `design-data:roundtrip-verify`.

- [#1262](https://github.com/adobe/spectrum-design-data/pull/1262) [`7dfc335`](https://github.com/adobe/spectrum-design-data/commit/7dfc33565899295084de1eef40e72763673f8810) Thanks [@GarthDB](https://github.com/GarthDB)! - Split state/anatomy/emphasis fields out of 20 fused `property` values in
  `color-component.tokens.json` (dsi.11).
  - **packages/design-data/tokens/color-component.tokens.json**: 20 tokens across
    select-box, stack-item, swatch, table, and tree-view had `property` strings
    that duplicated the component name and fused state (`selected`/`disabled`,
    optionally compounded with `hover`/`down`/`key-focus`/`default`), anatomy
    (`row`/`icon`), and emphasis (`emphasized`/`non-emphasized`) together. Each
    component places these modifiers in its own legacy order (state can lead or
    sit mid-key, not just trail), so `serialize()` can't reconstruct the
    original key from split fields — `legacyKey` pins the exact original string
    per the a9t precedent (`d9bdf1c4`). `design-data migrate legacy-verify`
    confirms byte-identical legacy output.

- [#1260](https://github.com/adobe/spectrum-design-data/pull/1260) [`d1dc7cc`](https://github.com/adobe/spectrum-design-data/commit/d1dc7cce646b1fa50fa07a3fe4a488911101922c) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose fused `line-height-font-size-N` into `line-height` + `referenceScaleIndex` (dsi.12).
  - **packages/design-data/fields/referenceScaleIndex.json**: new field declaring a numeric
    index that references a step in another scale (here, the font-size tier a line-height
    is paired with), distinct from `scaleIndex` (a token's own ramp position).
  - **packages/design-data/tokens/typography.tokens.json**: 36 `line-height-font-size-N`
    tokens migrated to `property: "line-height"` + `referenceScaleIndex`, with an
    explicit `legacyKey` pin preserving the original flat key until naming.rs learns
    to reconstruct it from the new field. Verified byte-identical via
    `design-data migrate legacy-verify` against `packages/tokens/src`.

- [#1251](https://github.com/adobe/spectrum-design-data/pull/1251) [`c9fab75`](https://github.com/adobe/spectrum-design-data/commit/c9fab753d8779f4c83f0a054bc30accde0184c0f) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose fused ramp/scale-index compounds flagged by dsi.6 into proper
  `colorRole`/`scaleIndex` fields, closing a serializer gap where Rust and
  JS silently disagreed on scaleIndex placement.
  - **packages/design-data/tokens/semantic-color-palette.tokens.json**: split
    80 `{accent,informative,negative,notice,positive}-color-N` tokens into
    `colorRole` + `property:"color"` + `scaleIndex`.
  - **packages/design-data/tokens/layout-component.tokens.json**: split 73
    fused `{property}-N` tokens into `property` + `scaleIndex`.
  - **packages/design-data/tokens/layout.tokens.json**: split 66 fused
    `{property}-N` tokens (incl. space-between gaps) into `property`/
    `from`/`to` + `scaleIndex`.
  - **sdk/core/src/naming.rs**: new `colorRole` semantic-ramp branch; now
    appends `scaleIndex` in the icon, space-between, and general branches.
  - **tools/token-mapping-analyzer/src/decomposer.js**: `scaleIndex` now
    serializes as a number (was silently dropped by Rust's `.as_i64()`);
    added `colorRole` promotion + serialize branch.
  - **tools/token-mapping-analyzer/src/apply.js**: added `applyScaleIndex()`.

- [#1253](https://github.com/adobe/spectrum-design-data/pull/1253) [`10c04a0`](https://github.com/adobe/spectrum-design-data/commit/10c04a0e33626009c538f4073f3e1d75939f0760) Thanks [@GarthDB](https://github.com/GarthDB)! - Pin `name.legacyKey` on the untracked density-before-size residual flagged
  by dsi.7, following the dsi.3 precedent (preserve published legacy names
  via the escape hatch rather than reordering the serializer or renaming
  tokens).
  - **packages/design-data/tokens/layout-component.tokens.json**: pinned
    `legacyKey` on 49 `accordion`/`card` tokens (34 distinct property
    strings) whose property fuses a relation, density, and size in
    size-incompatible order (e.g. `bottom-to-text-compact-large`); resolved
    from `packages/tokens/src/layout-component.json` by uuid match, not by
    string reconstruction, per the lesson from dsi.3's initial mis-pin.

- [#1255](https://github.com/adobe/spectrum-design-data/pull/1255) [`92ad1bf`](https://github.com/adobe/spectrum-design-data/commit/92ad1bfd3f93fa8b946de37f495be8fa6e8ce531) Thanks [@GarthDB](https://github.com/GarthDB)! - Split fused `colorRole`/`state`/`variant` segments out of `name.property` for
  the 41 no-legacyKey residual tokens flagged by dsi.9, pinning `name.legacyKey`
  on each to preserve the published legacy name (matches the existing
  convention already used by every correctly-authored `colorRole` entry in the
  same files).
  - **packages/design-data/tokens/color-aliases.tokens.json**: 37 tokens
    re-authored: role words to `colorRole`, `disabled` to `state` (it's a
    registered state, not a color role), `static`+`black`/`white` to
    `variant`+`colorFamily`, and double-stacked state tokens to Proposal 005's
    compound-state convention (`state: "focus-hover"`, `"selected-default"`) —
    its first real implementation.
  - **packages/design-data/tokens/semantic-color-palette.tokens.json**: 4
    `negative-subdued-background-color-*` tokens split to `colorRole`+`variant`.
  - **docs/proposals/005-compound-states.md**: marked Accepted for the
    `color-aliases.json` instances; `color-component.json` instances remain
    tracked under dsi.11.

- [#1265](https://github.com/adobe/spectrum-design-data/pull/1265) [`c591174`](https://github.com/adobe/spectrum-design-data/commit/c591174961dc3837b3f0f5d8ab95e65157a89cf9) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-027 now resolves each token's legacy key via the shared `naming::extract_legacy_key`
  resolver instead of assuming a flat string `name`, eliminating ~2948 false-positive
  `tokenBindings` errors caused by the name-object migration (closes bead soc).
  - **sdk/core/src/validate/rules/spec027.rs**: `token_names` is built by resolving each
    token's structured (or plain-string) `name` through `extract_legacy_key`, the same
    resolver used by `legacy.rs` and the graph's `legacy_name_index`, so `tokenBindings[].token`
    references match correctly regardless of name shape; added a regression test covering a
    structured `name` object.

## 0.12.0

### Minor Changes

- [#1249](https://github.com/adobe/spectrum-design-data/pull/1249) [`6717f58`](https://github.com/adobe/spectrum-design-data/commit/6717f58d3c0e6ed756d15a540e0482155e23f624) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose fused `{colorFamily}-{background|visual}-color` properties in
  color-aliases into `colorFamily` + `property`, preserving legacy output
  via `legacyKey`.
  - **packages/design-data/tokens/color-aliases.tokens.json**: split 114
    fused-property tokens (19 color families × background/visual-color ×
    light/dark/wireframe) into `colorFamily` + plain `property`, pinning
    `legacyKey` to keep serialized output byte-identical.

## 0.11.0

### Minor Changes

- [#1246](https://github.com/adobe/spectrum-design-data/pull/1246) [`f9f339c`](https://github.com/adobe/spectrum-design-data/commit/f9f339cabb15ecc27170c7230a9d5f7fdafea00c) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose fused `accent-*` surface color properties to `colorRole: accent`.
  - **packages/design-data/registry/property-terms.json**: register
    `content-color` and `visual-color` property terms.
  - **packages/design-data/tokens/color-aliases.tokens.json**: decompose the 11
    `accent-background-color` / `accent-content-color` / `accent-visual-color`
    fused properties, and migrate the 9 stray `variant: accent` tokens, to
    `colorRole: accent` + a plain `property` — pinning `legacyKey` on every
    affected token to keep `packages/tokens/src/` byte-identical.
  - **sdk/core/src/registry_data.rs**: regenerated from the registry change.

## 0.10.0

### Minor Changes

- [#1243](https://github.com/adobe/spectrum-design-data/pull/1243) [`a214eba`](https://github.com/adobe/spectrum-design-data/commit/a214eba18b230b24cbf99f0ca05cebbd70bb83b5) Thanks [@GarthDB](https://github.com/GarthDB)! - Register `width-multiplier`/`minimum-width-multiplier`/`maximum-width-multiplier`
  property terms and `quiet` variant (closes spectrum-design-data-dsi.2.2).
  - **packages/design-data/registry/property-terms.json**: add
    `width-multiplier`, `minimum-width-multiplier`, `maximum-width-multiplier` —
    unitless ratios used at the implementation level to derive a dimension from
    another dimension (design-data has no `calc()`; reuses the existing
    `multiplier.json` value schema shared with line-height/margin multipliers).
  - **packages/design-data/registry/variants.json**: add `quiet` emphasis variant.
  - **packages/design-data/tokens/layout-component.tokens.json**: decompose
    `combo-box-quiet-minimum-width-multiplier` to `variant: quiet` +
    `property: minimum-width-multiplier` (was fused into `property`).
  - **tools/token-mapping-analyzer/src/decomposer.js**: register the three
    compounds in `COMPOUND_PROPERTIES` so they decompose cleanly.
  - **packages/tokens/schemas/token-types/multiplier.json**: broaden description
    to mention width/height (dimension) multipliers.
  - **sdk/core/src/registry_data.rs**: regenerated from the registry changes.

- [#1244](https://github.com/adobe/spectrum-design-data/pull/1244) [`e6a8046`](https://github.com/adobe/spectrum-design-data/commit/e6a80463a9fc5603afaf14898e015056816f3670) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a `tab` → `tab-item` anatomy alias and decompose the 4 `tab-gap-horizontal-*` tokens
  (closes spectrum-design-data-iqn).
  - **registry/anatomy-terms.json**: register `tab` as an alias of the existing `tab-item`
    anatomy term, per the dsi.2.4 taxonomy call (tab is an anatomy part nested inside the
    `tabs` component, not a component alias).
  - **tokens/layout.tokens.json**: decompose `tab-gap-horizontal-{extra-large,large,medium,small}`
    to `component=tabs, anatomy=tab-item, property=gap, orientation=horizontal, size`,
    pinning `legacyKey` to preserve the published token names.
  - **packages/tokens/naming-exceptions.json**, **snapshots/validation-snapshot.json**: the
    `tab-item` alias changes the tokens' canonical re-serialization, so the 4 keys are added
    to the anatomy-decomposition exceptions allowlist and the golden snapshot is refreshed.

## 0.9.0

### Minor Changes

- [#1223](https://github.com/adobe/spectrum-design-data/pull/1223) [`e77c2b3`](https://github.com/adobe/spectrum-design-data/commit/e77c2b3519e75a07815c2905ac0bd0d7bef042c2) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-048 to validate nested anatomy `contains` references, and populate `contains`
  for the menu, list-view, and table composite items (closes spectrum-design-data-5us).
  - **packages/design-data-spec/rules/rules.yaml**: add SPEC-048 `anatomy-contains-resolves`
    (warning) — a `contains` entry SHOULD match a sibling anatomy part's `name`.
  - **packages/design-data-spec/schemas/{anatomy-part,component}.schema.json**: update the
    `contains` field description now that it has a validation rule.
  - **packages/design-data-spec/spec/anatomy-format.md**: document the flat-vs-`contains`
    authoring convention and the new rule.
  - **sdk/core/src/validate/rules/spec048.rs**: implement the rule; register in `mod.rs`.
  - **packages/design-data/components/menu.json**: declare `menu-item`'s child parts
    (icon, label, description, value, switch, checkbox, thumbnail, drill-in-chevron,
    link-out-icon) and populate `contains`.
  - **packages/design-data/components/list-view.json**: add an `anatomy` array with
    `list-item` and its child parts.
  - **packages/design-data/components/table.json**: populate `row`'s `contains` with the
    existing `row-checkbox` part.

- [#1232](https://github.com/adobe/spectrum-design-data/pull/1232) [`555047a`](https://github.com/adobe/spectrum-design-data/commit/555047a1c54366342a3a1fc550918b14cb3d5820) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose density-compound `property` slugs into the atomic `density` (and
  co-occurring `size`/`space-between`) fields (closes spectrum-design-data-7zs).
  - **packages/design-data/tokens/layout-component.tokens.json**,
    **layout.tokens.json**: migrate 71 tokens whose `property` baked in
    `compact`/`spacious` (e.g. `height-compact`, `spacing-spacious`) into
    `density` plus the already-registered `size`/`space-between` fields, via
    `tools/token-mapping-analyzer/src/apply.js --field density`. Data-only —
    no Rust or tooling changes required; the density field, registry, and
    `naming.rs` roundtrip already existed.
  - **packages/design-data/tokens/layout.tokens.json**: decomposing the
    `accessory`/`base`/`group`/`list`/`banner` qualifier into the `structure`
    field would have silently changed 52 published keys in
    `packages/tokens/src/layout.json` (`structure` is excluded from legacy-key
    reconstruction). Pinned `name.legacyKey` on those 52 tokens to their
    original published keys so the decomposition stays publish-invisible.

- [#1234](https://github.com/adobe/spectrum-design-data/pull/1234) [`84c3f09`](https://github.com/adobe/spectrum-design-data/commit/84c3f09d7b48744c24d45e63ecba7f07cc94e5fd) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose drop-shadow-property and context-modifier residual tokens per
  proposal 004 (closes spectrum-design-data-dsi.1).
  - **packages/design-data/registry/structures.json**: add the `drop-shadow`
    structure entry.
  - **packages/design-data/registry/variants.json**: register `ambient`,
    `dragged`, `elevated`, `pasteboard`, `elevated-key`, `dragged-key` context
    variants.
  - **packages/design-data/registry/property-terms.json**: add `x`/`y`
    property terms for drop-shadow offsets.
  - **tools/token-mapping-analyzer/src/decomposer.js**: remove `drop-shadow`
    from `COMPOUND_PROPERTIES` and drop the now-redundant `context-modifier`/
    `drop-shadow-property` `KNOWN_GAP_TERMS` entries.
  - **packages/design-data/tokens/{color-aliases,color-component,layout,
    layout-component}.tokens.json**: migrate 70 tokens into `structure`/
    `variant`/`property` fields. `structure` is excluded from legacy-key
    reconstruction in `naming.rs`, so `name.legacyKey` is pinned on every
    touched token to keep the decomposition publish-invisible.

- [#1240](https://github.com/adobe/spectrum-design-data/pull/1240) [`14d3b48`](https://github.com/adobe/spectrum-design-data/commit/14d3b48b7efd80f06f42587b05b230fa2f353a6e) Thanks [@GarthDB](https://github.com/GarthDB)! - Register `has-stepper` qualifier + `default-width` property and decompose the
  number-field stepper and field default-width tokens (closes spectrum-design-data-dsi.2.1).
  - **packages/design-data/registry/{qualifiers,property-terms}.json**: add
    `has-stepper` qualifier and `default-width` property term.
  - **packages/design-data/tokens/layout-component.tokens.json**: decompose 4
    `number-field-with-stepper-minimum-width-*` tokens to `qualifier: has-stepper`
    - `property: minimum-width`, pinning `name.legacyKey`; decompose
      `field-default-width-*` to `{component: field, property: default-width, size}`
      (roundtrips clean, no legacyKey needed).
  - **tools/token-mapping-analyzer/src/decomposer.js**: register the `with`+
    `stepper` phrase as the `has-stepper` qualifier so the published key still
    decomposes cleanly.
  - **sdk/core/src/registry_data.rs**: regenerated from the registry changes.

- [#1241](https://github.com/adobe/spectrum-design-data/pull/1241) [`519c444`](https://github.com/adobe/spectrum-design-data/commit/519c4443474e01f807f383fc482cabe30fa1a456) Thanks [@GarthDB](https://github.com/GarthDB)! - Register a `role` name-object field and `full`/`none` shape values, and decompose the
  11 corner-radius special-value tokens (closes spectrum-design-data-dsi.2.3).
  - **packages/design-data/fields/role.json**, **registry/roles.json**: new `role`
    name-object field (`container`, `control`) distinguishing an object's position in a
    nesting relationship from its `size` — the 9 `corner-radius-{small,medium}-size-*`
    tokens are two overlapping radius scales (container vs. nested control rounding),
    not one scale modulated by size.
  - **registry/shapes.json**: add `full`/`none` shape values for `corner-radius-full`
    and `corner-radius-none`.
  - **packages/design-data/tokens/layout.tokens.json**: decompose all 11 tokens to
    `{property: corner-radius, shape | role, size}`, pinning `name.legacyKey` on each.
  - **packages/design-data-spec/schemas/token.schema.json**, **spec/{taxonomy,token-format}.md**:
    document the new `role` field.
  - **tools/token-mapping-analyzer/src/decomposer.js**: add `role` to the fallback
    serialization order.
  - **sdk/core/src/registry_data.rs**: regenerated from the registry changes.

- [#1236](https://github.com/adobe/spectrum-design-data/pull/1236) [`9f5401f`](https://github.com/adobe/spectrum-design-data/commit/9f5401f1281932e7efff0bcbdbc50f69d2f3fea5) Thanks [@GarthDB](https://github.com/GarthDB)! - Register color/layout/qualifier vocab and migrate affected tokens per
  proposal 006 (closes spectrum-design-data-dsi.2.5).
  - **packages/design-data/fields/qualifier.json**, **registry/qualifiers.json**:
    new `qualifier` name-object field (`stacked`, `multiline`, `precision`,
    `collapsed`, `expanded`, `drag`, `highlight`).
  - **registry/{positions,anatomy-terms,sizes,property-terms,shapes,
    structures,color-roles,components}.json**: register `inner`/`outer`/
    `below`, `pagination`/`slash`/`square`/`well`, `xxxxl`, `minimum`/
    `minimum-padding-vertical`/`component-size-minimum-perspective`,
    `rectangle`, `drop-target`, `color-control`, and 6 semantic color roles.
  - **tools/token-mapping-analyzer/src/decomposer.js**: register two compound
    property terms; drop `inner`/`outer` from `KNOWN_GAP_TERMS`.
  - **packages/design-data-spec/schemas/token.schema.json**: list `qualifier`
    explicitly in `$defs.nameObject.properties`.
  - **packages/design-data/tokens/{color-aliases,semantic-color-palette,
    color-component,layout-component,layout,typography}.tokens.json**: migrate
    affected tokens into structured fields, pinning `name.legacyKey` on each.

- [#1239](https://github.com/adobe/spectrum-design-data/pull/1239) [`204d1ad`](https://github.com/adobe/spectrum-design-data/commit/204d1ad43300d516d75e384509c33b480342b217) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix compound-property matching for line-height/component-size tokens and
  register the missing component-size vocabulary (closes
  spectrum-design-data-dsi.2.6).
  - **tools/token-mapping-analyzer/src/decomposer.js**: register
    `line-height-font-size`, `component-height`, `component-size-difference`,
    `component-size-maximum-perspective`, and `component-size-width-ratio` as
    compound properties, fixing 26 tokens previously flagged as unmatched
    vocabulary gaps.
  - **registry/property-terms.json**: register `component-size-maximum-perspective`,
    `component-size-difference`, and `component-size-width-ratio` (parity with
    the existing `component-size-minimum-perspective` entry); these calculate
    the CSS perspective transform for S2 components' pressed/"down"-state
    scale-down effect.

- [#1242](https://github.com/adobe/spectrum-design-data/pull/1242) [`46449db`](https://github.com/adobe/spectrum-design-data/commit/46449dbcbdbeffb256fb857d3f878b8b376ccb91) Thanks [@GarthDB](https://github.com/GarthDB)! - Promote `weight`/`style` to Phase D decomposition for 8 typography tokens
  whose qualifier was fused into `property` (closes spectrum-design-data-dsi.2.7).
  - **packages/design-data/fields/weight.json**, **style.json**: drop
    `excludeFromLegacyKey` (mirrors `size`).
  - **packages/design-data/tokens/typography.tokens.json**,
    **packages/token-names/names/typography.json**: strip the qualifier
    from `property` and pin `legacyKey` on the 8 affected tokens.
  - **sdk/core/src/registry_data.rs**: regenerated field catalog
    (`sdk:codegen`). `packages/tokens/src/typography.json` diff is empty.
  - **sdk/core/src/naming.rs**: update design-intent comment and tests.
  - **tools/token-mapping-analyzer/src/decomposer.js**: fix a
    field-priority ambiguity that misassigned `black`/`medium` to
    `variant`/`size` instead of `weight` once `property` is font-weight/style.

- [#1226](https://github.com/adobe/spectrum-design-data/pull/1226) [`d7976e0`](https://github.com/adobe/spectrum-design-data/commit/d7976e05dc1d70b8330ff716f35d74f6b2f8fcbb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a typography `emphasis` field and decompose overloaded typography `property`
  values into `family`/`emphasis` (closes spectrum-design-data-pur).
  - **packages/design-data/fields/emphasis.json**: new field for typography emphasis
    (`strong`, `light`, `heavy`, `emphasized`, `non-emphasized`, and compounds).
  - **packages/design-data/registry/typography-emphasis.json**: new registry backing
    the `emphasis` field.
  - **packages/design-data/fields/family.json**: `excludeFromLegacyKey` flipped to
    `false` so `family` now participates in legacy key reconstruction.
  - **packages/design-data/registry/property-terms.json**: register atomic typography
    properties (margin/margin-multiplier variants, `text-transform`).
  - **sdk/core/src/naming.rs**: serialize `family`/`emphasis` into the legacy key.
  - **tools/token-mapping-analyzer/src/decomposer.js**: match `family`/`emphasis`
    registry terms (including compound runs) instead of parking them as gaps.
  - **packages/design-data/tokens/typography.tokens.json**,
    **layout-component.tokens.json**: migrate 197 tokens to the new `family`/`emphasis`
    fields via `tools/token-mapping-analyzer/src/apply.js`.

- [#1231](https://github.com/adobe/spectrum-design-data/pull/1231) [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024) Thanks [@GarthDB](https://github.com/GarthDB)! - Register 4 cross-cutting anatomy sub-parts as first-class components (part of
  spectrum-design-data-46d), clearing the remaining 71 SPEC-009 warnings. No token data
  changes — these values are reused across multiple unrelated components with no single
  accurate parent, so each is registered directly rather than routed via `anatomy`.
  - **packages/design-data/registry/components.json**: add `bar-panel` (6 tokens),
    `field` (8), `in-field-button` (25), `stack-item` (32).

- [#1229](https://github.com/adobe/spectrum-design-data/pull/1229) [`b4f79db`](https://github.com/adobe/spectrum-design-data/commit/b4f79db78d8b889b46b98d0fc26d424c1d4fe5fe) Thanks [@GarthDB](https://github.com/GarthDB)! - Route tab-item, menu-item, and in-field-stepper anatomy sub-parts to their real parent
  component, clearing 123 SPEC-009 warnings (part of spectrum-design-data-uep; remaining
  71 tokens tracked separately pending a taxonomy ruling).
  - **packages/design-data/registry/anatomy-terms.json**: add `in-field-stepper`; mark
    `tab-item`/`menu-item` `usedIn: ["tokens"]`.
  - **packages/design-data/tokens/{layout,color}-component.tokens.json**: 123 tokens gain
    `component` (real parent: `tabs`, `menu`, `number-field`) + `anatomy` (sub-part) + a
    pinned `legacyKey` so the published key is unchanged.
  - **packages/tokens/src/{layout,color}-component.json**: regenerated; only the flat
    `component` attribute value changed (67 tokens), no key renames.
  - **packages/tokens/naming-exceptions.json** / **validation-snapshot.json**: track the
    49 tokens whose pinned legacy key no longer roundtrips through canonical name
    generation (category `anatomy-decomposition`).
  - **packages/tokens/test/checkComponentProps.js**: recognize anatomy sub-part prefixes
    (via the anatomy registry) as valid even when they don't match `component`.
  - **sdk/core/src/migrate.rs**: `thin_name_val` now pins `legacyKey` when a corrected
    `component` no longer reproduces the original key, fixing legacy→cascade roundtrip.

- [#1231](https://github.com/adobe/spectrum-design-data/pull/1231) [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a first-class `icon` name field (part of spectrum-design-data-p89), the Rust
  prerequisite for re-keying icon tokens off `component` to clear ~315 SPEC-009 warnings.
  No token data changes yet — `icon` is not used by any token in this change.
  - **packages/design-data/fields/icon.json**: new field, registry-backed, advisory.
  - **packages/design-data/registry/icon-terms.json**: 12 icon ids (`icon`, `ui`,
    `checkmark`, `chevron`, `dash`, `arrow`, `cross`, `add`, `link-out`, `drag-handle`,
    `asterisk`, `gripper`), with `tokenName` long-form expansions for legacy keys.
  - **sdk/core/src/naming.rs**: `extract_legacy_key` treats `icon` as an alternate,
    mutually-exclusive owner to `component` — both in the color-domain branch
    (`{icon}-{property}-{colorFamily?}-{colorRole?}-{state?}`) and a new non-color branch
    (`{icon-tokenName}-{property}-{state?}`) for layout/dimension icon tokens.

- [#1231](https://github.com/adobe/spectrum-design-data/pull/1231) [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024) Thanks [@GarthDB](https://github.com/GarthDB)! - Re-key icon tokens off the new `icon` name field (part of spectrum-design-data-aui),
  clearing ~315 SPEC-009 warnings. Published legacy keys are unchanged.
  - **packages/design-data/registry/icon-terms.json**: new registry, 12 icon ids (`icon`,
    `ui`, `checkmark`, `chevron`, `dash`, `arrow`, `cross`, `add`, `link-out`,
    `drag-handle`, `asterisk`, `gripper`), with `tokenName` long-form expansions.
  - **packages/design-data/tokens/icons.tokens.json**: 191 tokens re-keyed
    `component:'icon'` → `icon:'icon'`.
  - **packages/design-data/tokens/layout-component.tokens.json**: 124 tokens re-keyed
    `component:'X-icon'` → `icon:'X'` across 11 distinct values.
  - **sdk/core/src/naming.rs**: `extract_legacy_key` gains an icon (non-color) branch and
    a thin-format guard so re-keyed tokens still resolve to their original legacy key.
  - **sdk/core/src/legacy.rs**: legacy-metadata hoisting (`resolve_owner_component`) now
    falls back to the icon field so published `component` metadata is unaffected.
  - **packages/tokens/src/icons.json**, **layout-component.json**: regenerated, byte-identical
    to their pre-change state.

- [#1238](https://github.com/adobe/spectrum-design-data/pull/1238) [`8d8bf09`](https://github.com/adobe/spectrum-design-data/commit/8d8bf0904e716ed86b10f890251980f73f0215c7) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose the 16 remaining fused-property typography tokens onto proper
  `component`/`property`/`family`/`script`/`emphasis`/`size` fields (closes
  spectrum-design-data-1lf).
  - **packages/design-data/tokens/typography.tokens.json**:
    `body-cjk-size-{l,m,s,xl,xs,xxl,xxs,xxxl}`, `body-size-xxs`, `heading-cjk-font-weight`,
    `heading-cjk-size-xxxxl`, `heading-size-xxxxl` get `component`/`property`/`script`/`size`
    fields, retaining `legacyKey` to pin their published fused name.
    `heading-{sans-serif,serif}[-emphasized]-font-weight` get `component`/`property`/`family`/
    `emphasis` fields; their reconstructed names already match the fused originals, so no
    `legacyKey` pin is needed.
  - **packages/tokens/src/typography.json**: regenerated legacy output now carries a
    `component` attribute on these 16 tokens (previously absent) — an accepted, additive
    publish diff.

- [#1237](https://github.com/adobe/spectrum-design-data/pull/1237) [`02cc09f`](https://github.com/adobe/spectrum-design-data/commit/02cc09fc2a40c8b93ff759dec5573d360815c707) Thanks [@GarthDB](https://github.com/GarthDB)! - Reinstate the `script` field for CJK typography tokens and decompose all
  font-size tokens to `property:"font-size"` + `size` (closes
  spectrum-design-data-wix, amends Proposal 001, see spectrum-design-data-526).
  - **packages/design-data/fields/script.json**, **registry/scripts.json**:
    new `script` field/registry — `cjk` writing-system variant, orthogonal
    to `family` (typeface classification). 22 sibling fields renumbered
    (`serialization.position` +1) to make room.
  - **packages/design-data/registry/typography-families.json**: drop `cjk`.
  - **packages/design-data/tokens/typography.tokens.json**: rename
    `family:"cjk"` → `script:"cjk"` (~63 tokens); decompose fused
    `code-cjk-*` tokens; decompose most font-size tokens to
    `property:"font-size"` + `size` + `script`?, `legacyKey` pinned
    (~47 tokens). 12 tokens kept fused-`property` (legacy escape hatch) to
    avoid adding a `component` attribute to `@adobe/spectrum-tokens`.
    `packages/tokens/src/typography.json` diff against `main` is empty.
  - **sdk/core/src/validate/rules/spec043.rs**: accept `script` as a
    typography domain-identifying field alongside `family`.

### Patch Changes

- [#1235](https://github.com/adobe/spectrum-design-data/pull/1235) [`b97a7ef`](https://github.com/adobe/spectrum-design-data/commit/b97a7ef5a205969f83eeca421e75983b8b214a72) Thanks [@GarthDB](https://github.com/GarthDB)! - Pin `name.legacyKey` on ordering-mismatch residual tokens to keep published
  keys stable (closes spectrum-design-data-dsi.3).
  - **packages/design-data/tokens/{color-aliases,color-component,icons,layout,
    layout-component,semantic-color-palette,typography}.tokens.json**: 224
    tokens decompose cleanly but their published legacy key's field order
    (e.g. density-before-size, `key-focus` state ordering) doesn't match
    the canonical serialize order. `name.legacyKey` is pinned to each
    token's existing published key via the same escape hatch used by
    dsi.1, keeping the change publish-invisible.

- [#1225](https://github.com/adobe/spectrum-design-data/pull/1225) [`96ec195`](https://github.com/adobe/spectrum-design-data/commit/96ec1957d0e7ad064c5d25b5b876c2fd3d61c450) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix decomposition of `icon.color-inverse`, `icon.color-inverse-background`, and
  `color-wheel.color-area-margin` name objects (closes spectrum-design-data-2mh). No
  behavior change for `@adobe/spectrum-tokens` consumers — the legacy flat keys are pinned
  via the new `legacyKey` escape hatch.
  - **packages/design-data/tokens/icons.tokens.json**: decompose the two inverse icon
    color tokens into `{component, property, variant: "inverse", legacyKey}`.
  - **packages/design-data/tokens/layout-component.tokens.json**: decompose
    `color-wheel.color-area-margin` into `{component: "color-wheel", property: "margin",
anatomy: "color-area"}`.
  - **sdk/core/src/naming.rs**: `NameObject` gains a `variant` field; `parse_legacy_name`
    and `generate_legacy_name` recognize context-category variant words (`inverse`,
    `static`, `over-background`) as a leading key segment. `extract_legacy_key` honors a new
    `name.legacyKey` override, checked before reconstruction.
  - **sdk/core/src/migrate.rs**: `build_flat`'s no-context path now attempts decomposition
    via `naming::roundtrips` before falling back to a thin name, matching `resolve_name`.
  - **packages/design-data-spec/schemas/token.schema.json**: document the `legacyKey`
    escape-hatch field on the name object.

- [#1228](https://github.com/adobe/spectrum-design-data/pull/1228) [`ecd5f38`](https://github.com/adobe/spectrum-design-data/commit/ecd5f38dd679730bf1f2b9b3980cd5032ac4a9f1) Thanks [@GarthDB](https://github.com/GarthDB)! - Sync `components.json` with existing component definitions and decompose a misclassified
  drop-shadow state (part of SPEC-009 triage epic, closes spectrum-design-data-dm2.3).
  - **packages/design-data/registry/components.json**: add 32 missing component ids — 20 with
    existing `components/*.json` definitions (`heading`, `tree-view`, `body`, …) and 12 without a
    dedicated file yet (`date-field`, `floating-action-button`, `card`, the card variants
    `collection-card`/`user-card`/`card-horizontal`, …).
  - **packages/design-data/tokens/color-aliases.tokens.json**: decompose the drop-shadow
    `emphasized` token from `{property: "drop-shadow", state: "emphasized"}` to
    `{property: "drop-shadow", variant: "emphasized"}` — emphasis isn't an interactive state.
    A `legacyKey` pins the published flat name so `@adobe/spectrum-tokens` consumers see no change.
  - **packages/design-data/registry/variants.json**: add `emphasized` (category `emphasis`).

## 0.8.0

### Minor Changes

- [#1216](https://github.com/adobe/spectrum-design-data/pull/1216) [`c923bd2`](https://github.com/adobe/spectrum-design-data/commit/c923bd27bba0ee484ba251d9baf6a63c5cfc68d0) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase D: register `space-between` property term and paired `from`/`to` endpoint fields.
  - **packages/design-data/registry/property-terms.json**: added `space-between` term for
    {a}-to-{b} spacing tokens.
  - **packages/design-data/fields/from.json, to.json**: new paired semantic fields modeling a
    space-between token's two endpoints; excluded from legacy-key catalog serialization pending
    a dedicated `naming.rs` branch (04c.2).
  - **packages/design-data-spec/schemas/token.schema.json**: declared `from`/`to` on the
    nameObject definition.
  - **packages/design-data-spec/rules/rules.yaml**: added SPEC-047 validating `from`/`to` values
    against positions, generic anatomy terms, or the referenced component's declared anatomy.

- [#1219](https://github.com/adobe/spectrum-design-data/pull/1219) [`f9585da`](https://github.com/adobe/spectrum-design-data/commit/f9585daf01d5dab651793ce6f1d816f320623204) Thanks [@GarthDB](https://github.com/GarthDB)! - Register gap-endpoint vocabulary for space-between decomposition (closes 04c.3).
  - **packages/design-data/registry/positions.json**: Add edge-family positions
    `edge`, `start-edge`, `end-edge`, `bottom-edge`.
  - **packages/design-data/registry/anatomy-terms.json**: Add generic anatomy
    terms `content`, `visual`, `action`, `navigation`, `disclosure`,
    `content-area`, `disclosure-indicator`, `disclosure-icon`, `drag-handle`,
    `field-button`.
  - **packages/design-data/components/\*.json**: Add component-scoped `anatomy[]`
    parts for 14 components (action-bar, tree-view, tag, alert-banner,
    number-field, slider, steplist, side-navigation, breadcrumbs, field-label,
    menu, status-light, table, coach-mark).
  - **sdk/core/src/validate/rules/spec047.rs**: Retry unresolved endpoints by
    stripping a registered position affix and validating the remainder as
    anatomy, covering fused endpoints like `content-area-bottom`/`item-top`.
  - **sdk/core/src/registry_data.rs**: Regenerated via `sdk:codegen`.

- [#1221](https://github.com/adobe/spectrum-design-data/pull/1221) [`09b3970`](https://github.com/adobe/spectrum-design-data/commit/09b39705547954ba44dabe41c70c5b76a6f8b43e) Thanks [@GarthDB](https://github.com/GarthDB)! - Apply space-between gap-endpoint decomposition to layout-component tokens (closes 04c.6).
  - **packages/design-data/tokens/layout-component.tokens.json**: Decompose 115
    `{a}-to-{b}` compound property values into structured `property: "space-between"`
    plus `from`/`to` endpoint fields; legacy keys unchanged (verified by roundtrip).

- [#1222](https://github.com/adobe/spectrum-design-data/pull/1222) [`82bb4c4`](https://github.com/adobe/spectrum-design-data/commit/82bb4c46f67a0b4a1a74fb18514d53925f85a3ca) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate the final 19 space-between gap endpoints; defer SPEC-047's declared-anatomy
  check when no component catalog is loaded (closes 04c.8).
  - **sdk/core/src/validate/rules/spec047.rs**: defer (don't error) on a component-scoped
    gap endpoint when `validate-dataset` runs with no component catalog loaded, since its
    declared-anatomy-part arm can't be evaluated; mirrors SPEC-018's empty-catalog guard.
  - **packages/design-data/tokens/layout-component.tokens.json**: decompose the last 19
    `{a}-to-{b}` tokens (menu, tree-view, status-light, alert-banner, etc.) into structured
    `from`/`to` fields — all 134 eligible gap tokens are now migrated.

- [#1215](https://github.com/adobe/spectrum-design-data/pull/1215) [`212ec82`](https://github.com/adobe/spectrum-design-data/commit/212ec825e25c5ce7ae7342072522423b3ce07483) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase D: decompose compound size-\* property values into structured size field for 24 tokens.
  - **packages/design-data/tokens/layout-component.tokens.json**: extracted size field from
    compound properties (e.g. `handle-size-large` → `property: size` + `size: l`);
    legacy keys unchanged.

- [#1203](https://github.com/adobe/spectrum-design-data/pull/1203) [`0297e7e`](https://github.com/adobe/spectrum-design-data/commit/0297e7ee77e102a3756302f83ab9236cd142ee58) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase D: taxonomy field serializer + size decomposition pilot.
  - **sdk/core/src/naming.rs**: Generalize `extract_legacy_key` to walk the
    field catalog in `serialization.position` order, expanding registry ids to
    their `tokenName` long-forms (e.g. `size:"xl"` → `"extra-large"`). Excludes
    mode-set, color-domain, and legacy metadata annotation fields. Output is
    byte-identical for all current tokens (all gates pass).
  - **sdk/core/src/registry.rs**: Add `token_name(field, id) -> Option<&str>`
    to `RegistryData`, backed by the embedded registry JSON.
  - **sdk/scripts/generate-registry-data.js** + **registry_data.rs**: Generate
    `build_token_name_map()` alongside the existing `build_registry_map()`.
  - **packages/design-data/tokens/layout-component.tokens.json**,
    **layout.tokens.json**: 68 layout tokens decomposed — `size` extracted from
    `property` into the structured field (HIGH-confidence, all roundtrip-verified).
  - **tools/token-mapping-analyzer/test/apply.test.js**: Verify roundtrip
    invariant on already-migrated tokens.

- [#1214](https://github.com/adobe/spectrum-design-data/pull/1214) [`5e7db36`](https://github.com/adobe/spectrum-design-data/commit/5e7db3605547e680f777fc345f0005d7e3637a7e) Thanks [@GarthDB](https://github.com/GarthDB)! - Register color-handle, color-loupe components and color-area anatomy term.
  - **packages/design-data/registry/components.json**: Add `color-handle` and
    `color-loupe` entries backing existing refs in `color-component.tokens.json`.
  - **packages/design-data/registry/anatomy-terms.json**: Add `color-area`
    anatomy term for the embedded gradient surface in color-wheel and relatives.
  - **sdk/core/src/registry_data.rs**: Regenerated via `sdk:codegen` to include
    all three new entries.

- [#1213](https://github.com/adobe/spectrum-design-data/pull/1213) [`035a1f9`](https://github.com/adobe/spectrum-design-data/commit/035a1f95d909f8e443a5e51baee6e30d11eedde5) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose component color properties into colorFamily + colorRole fields (closes beads #72c).
  - **packages/design-data/fields/colorRole.json**: new `colorRole` field
    (position 16, scope color, excludeFromLegacyKey).
  - **packages/design-data/registry/color-roles.json**: new registry —
    `primary` and `background` role values.
  - **packages/design-data/tokens/icons.tokens.json**: 187 tokens atomized
    (`color-blue-primary` → `property:color` + `colorFamily:blue` + `colorRole:primary`).
  - **sdk/core/src/naming.rs**: color-domain branch extended for component color
    tokens (`{component}-{property}-{colorFamily?}-{colorRole?}-{state?}`).
  - **tools/token-mapping-analyzer/src/migrate-color-role.js**: new migration
    script for multi-field color property decomposition.
  - **tools/token-mapping-analyzer/src/decomposer.js**: `serialize()` gains
    JS-parity color-domain branches matching the Rust serializer.

### Patch Changes

- [#1218](https://github.com/adobe/spectrum-design-data/pull/1218) [`e38c4e1`](https://github.com/adobe/spectrum-design-data/commit/e38c4e19f97aa590991b0c1ac40c2e1b24620cde) Thanks [@GarthDB](https://github.com/GarthDB)! - naming.rs: serialize `space-between` endpoint fields in `extract_legacy_key` (04c.2).
  - **sdk/core/src/naming.rs**: added an explicit branch for `property: "space-between"`
    tokens that reconstructs the legacy `{from}-to-{to}` connective from the paired `from`/`to`
    fields, mirroring the existing color-domain branches. Falls through to the generic walk
    when either endpoint is missing.

- [#1201](https://github.com/adobe/spectrum-design-data/pull/1201) [`11c4d5a`](https://github.com/adobe/spectrum-design-data/commit/11c4d5a937064ba24f69437c59ab5ad1bfbe5f8c) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(authoring): Phase C — create/edit authoring for non-token data categories.
  - **tools/design-data-agent-mcp**: adds `data_create` and `data_edit` MCP tools for
    components, fields, registry, mode-sets, and guidelines; delegate to the CLI.
  - **packages/design-data/AUTHORING.md**: documents the new `design-data data create|edit`
    CLI commands and the `data_create`/`data_edit` MCP tools.

- [#1204](https://github.com/adobe/spectrum-design-data/pull/1204) [`4218d6a`](https://github.com/adobe/spectrum-design-data/commit/4218d6a1694db70cb37f656cd0250e306e48912d) Thanks [@GarthDB](https://github.com/GarthDB)! - Replace opt-out SKIP const in naming.rs with opt-in `excludeFromLegacyKey`
  catalog flag (ye1.9).
  - **sdk/core/src/registry.rs**: Added `exclude_from_legacy_key: bool`
    to `FieldCatalogEntry`; absent in field JSON defaults to false (opt-in).
  - **sdk/scripts/generate-registry-data.js**: Emits the new field from
    `d.excludeFromLegacyKey` in each generated literal.
  - **sdk/core/src/naming.rs**: Deleted hardcoded `SKIP` const; walk now
    skips entries where `exclude_from_legacy_key` is true.
  - **packages/design-data/fields/**: Added `"excludeFromLegacyKey": true`
    to the 9 formerly-SKIPped fields (colorScheme, scale, contrast,
    colorFamily, scaleIndex, weight, family, style, structure).
  - **packages/design-data-spec/schemas/field.schema.json**: Added
    `excludeFromLegacyKey` boolean to allow the flag in field declarations.

## 0.7.1

### Patch Changes

- [#1186](https://github.com/adobe/spectrum-design-data/pull/1186) [`dcf0832`](https://github.com/adobe/spectrum-design-data/commit/dcf083214d56989817db192801638e3ec20e2306) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Sync layout token values from Spectrum Tokens Studio (#1186).
  - **tokens/layout.tokens.json**: revert small/extra-small accessory-gap and
    base-padding-vertical to original S2 values (accessory-gap-extra-small 4→3px,
    accessory-gap-small 5→4px, base-padding-vertical-extra-small 4→3px,
    base-padding-vertical-small 5→4px).

## 0.7.0

### Minor Changes

- [#1157](https://github.com/adobe/spectrum-design-data/pull/1157) [`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `guidelines/` — structured guideline documents for non-component S2 pages.
  - **guidelines/\*.json**: generated from `docs/s2-docs/{designing,fundamentals,developing,support}/`;
    each file validates against `guideline.schema.json` with `documentBlocks` body.
  - **guidelines/manifest.json**: catalog for MCP discovery (`slug`, `title`, `category`,
    `status`, `sourceUrl`, `file` per entry).
  - **package.json**: adds `"./guidelines/*"` export subpath and `"guidelines/"` to `files`.

- [#1157](https://github.com/adobe/spectrum-design-data/pull/1157) [`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454) Thanks [@GarthDB](https://github.com/GarthDB)! - Populate documentBlocks on all 69 component JSON files from s2-docs source.
  - **packages/design-data/components/\*.json**: Add `documentBlocks` to all 69
    components — typed blocks (purpose, guideline, do-dont) from docs/s2-docs/. All
    69 have a leading `purpose` block seeded from Overview or the component description.
  - **docs/s2-docs/components/inputs/color-handle.md**: Replace stub with full
    scraped content (Overview, Behaviors, Usage guidelines, Component options).
  - **tools/s2-docs-to-document-blocks**: Generator — near-duplicate dedup via
    `normalizeForDedup()` collapses scrape artefacts differing by smart quotes or
    punctuation; seeds `purpose` blocks from component `description` when no Overview
    section is scraped; formats output with Prettier for clean diffs.

## 0.6.0

### Minor Changes

- [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `guidelines/` — structured guideline documents for non-component S2 pages.
  - **guidelines/\*.json**: generated from `docs/s2-docs/{designing,fundamentals,developing,support}/`;
    each file validates against `guideline.schema.json` with `documentBlocks` body.
  - **guidelines/manifest.json**: catalog for MCP discovery (`slug`, `title`, `category`,
    `status`, `sourceUrl`, `file` per entry).
  - **package.json**: adds `"./guidelines/*"` export subpath and `"guidelines/"` to `files`.

- [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978) Thanks [@GarthDB](https://github.com/GarthDB)! - Populate documentBlocks on all 69 component JSON files from s2-docs source.
  - **packages/design-data/components/\*.json**: Add `documentBlocks` to all 69
    components — typed blocks (purpose, guideline, do-dont) from docs/s2-docs/. All
    69 have a leading `purpose` block seeded from Overview or the component description.
  - **docs/s2-docs/components/inputs/color-handle.md**: Replace stub with full
    scraped content (Overview, Behaviors, Usage guidelines, Component options).
  - **tools/s2-docs-to-document-blocks**: Generator — near-duplicate dedup via
    `normalizeForDedup()` collapses scrape artefacts differing by smart quotes or
    punctuation; seeds `purpose` blocks from component `description` when no Overview
    section is scraped; formats output with Prettier for clean diffs.

## 0.4.0

### Minor Changes

- [#1150](https://github.com/adobe/spectrum-design-data/pull/1150) [`f84bce2`](https://github.com/adobe/spectrum-design-data/commit/f84bce215d20f1bc8b109f3f23b15bfab6b239d0) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Mirror PR #1150 changes into the cascade source of truth.
  - **tokens/layout.tokens.json**: Convert 5 `base-padding-horizontal-*` tokens
    from flat dimension to desktop/mobile scale-sets with updated desktop values.
  - **tokens/layout.tokens.json**: Add 5 `group-gap-*-spacious` alias tokens.
  - **tokens/layout-component.tokens.json**: Add 4 `form-item-gap-*` alias tokens.
  - **tokens/layout.tokens.json**, **tokens/layout-component.tokens.json**:
    Update `replaced_by` refs to new scale-set member UUIDs.

## 0.3.0

### Minor Changes

- [#1126](https://github.com/adobe/spectrum-design-data/pull/1126) [`60a4835`](https://github.com/adobe/spectrum-design-data/commit/60a4835e245965639a4ac89b41d2884dd63a0bbb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-043 domain-identifying fields to all 72 typography token name objects
  (closes #1125).
  - **tokens/typography.tokens.json**: add `weight` (font-weight × 6, composite × 15),
    `style` (× 2), `family` (× 4), `scaleIndex` (font-size × 36), `structure` (margin
    multipliers × 5), and `scaleIndex`+`family:cjk` (line-height × 4) — zero SPEC-043
    advisory warnings for this file.
  - **registry/scale-values.json**: add `25` entry for `font-size-25` (`scaleIndex: 25`).
  - **spec/taxonomy.md**: add `structure` row to the typography field table; broaden
    NORMATIVE SHOULD clause to all five fields accepted by SPEC-043.

## 0.2.0

### Minor Changes

- [#1110](https://github.com/adobe/spectrum-design-data/pull/1110) [`073c22a`](https://github.com/adobe/spectrum-design-data/commit/073c22a75c27fbb44eb57eb6cb7311e294066d76) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate cascade token `$ref` aliases from name strings to UUIDs.
  - **packages/design-data/tokens/\*.tokens.json**: alias `$ref` now holds the
    target's UUID (rename-proof, cascade canonical). Legacy `packages/tokens/src`
    is unchanged — roundtrip-verify stays clean.
  - **sdk/core/src/graph.rs**: add `resolve_alias_key` (UUID-first + slug + legacy-
    name-index fallback); fix cycle-guard to key on resolved graph key; index
    `set_uuid` so set-targeted aliases resolve.
  - **sdk/core/src/migrate.rs**: emit UUID `$ref` via `global_name_to_uuid`;
    add `MigrateSummary.dangling_alias_refs` counter.
  - **sdk/core/src/legacy.rs**: denormalize UUID `$ref` → `{name}` via
    `global_uuid_to_name` so legacy output is byte-semantically identical.
  - **sdk/core/src/validate/rules/spec001–003,015,042**: route alias lookups
    through `resolve_alias_key` for correct UUID resolution.
  - **packages/tokens/schemas/token-types/alias.json**: accept `value: "{name}"`
    (legacy) or `$ref: "<uuid>"` (cascade) via `oneOf`.
  - **packages/design-data-spec/schemas/token.schema.json**, **spec/token-format.md**:
    document UUID as the cascade canonical `$ref`; activate the reserved direction.

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Consolidate Spectrum-specific design data into a single package.
  - **`@adobe/design-data-spec`**: removed `components/`, `fields/`, and `mode-sets/` directories
    and their exports. Now a pure generalized format definition (schemas, spec, rules, conformance).
    The `./components/*.json` export is no longer published — major bump because removing a
    published export is a breaking change per semver.
  - **`@adobe/spectrum-design-data`**: added `components/` (81 component declarations), `fields/`
    (24 field catalog files), and `mode-sets/` (3 mode-set instances) alongside the existing
    `tokens/`. New exports: `./components/*`, `./fields/*`, `./mode-sets/*`.

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Move Spectrum registry vocabulary into spectrum-design-data; deprecate design-system-registry.
  - **@adobe/spectrum-design-data**: gains `registry/` (27 vocabulary files) with
    subpath exports (`./registry/*.json`); now the single source of truth for all Spectrum data.
  - **@adobe/design-system-registry**: reduced to a compatibility shim. Migrate imports to
    `@adobe/spectrum-design-data` — this shim will be removed in a future major version.
  - **@adobe/design-data-spec**: gains `registry-value.json` and `platform-extension.json`
    schema exports; `manifest.schema.json` `conceptOrder` enum relaxed to open `string` type
    (no longer hardcodes Spectrum's field names — configurable per field catalog).

### Patch Changes

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix stale `replaced_by` UUIDs and re-enable cascade token validation in CI.
  - **`packages/design-data/tokens/`**: corrected 70 deprecated tokens whose `replaced_by`
    (and co-located `$ref`) fields held legacy scale-set wrapper UUIDs that no longer exist
    in the cascade dataset. Targets are now remapped to the correct cascade-format UUIDs via
    `set_uuid` lookup + scale matching.
  - **`packages/design-data/moon.yml`**: removed `runInCI: false` from the `validate` task
    now that SPEC-010 errors are resolved.
  - **`sdk/core/src/validate/rules/spec018.rs`**: SPEC-018 now skips when no component
    catalog is loaded (empty graph), matching the intended semantics — the rule cannot
    validate component references against a catalog that was not provided.
  - **`packages/design-data-spec/conformance/invalid/SPEC-018/dataset.json`**: updated
    fixture to use a non-empty component catalog so SPEC-018 fires for the right reason
    (referenced component not in the declared catalog).

## 0.1.0

### Minor Changes

- [#1099](https://github.com/adobe/spectrum-design-data/pull/1099) [`66d9984`](https://github.com/adobe/spectrum-design-data/commit/66d9984fb6a04ae3c038d0da2dffdc1d44a293d9) Thanks [@GarthDB](https://github.com/GarthDB)! - Initial release of `@adobe/spectrum-design-data` — Spectrum design tokens in cascade format.

  New canonical source of truth for `@adobe/spectrum-tokens`: 4 166 cascade tokens
  (8 files) with structured name objects from the full token taxonomy.
  `packages/tokens/src/` is regenerated via `moon run design-data:legacy-output`.
