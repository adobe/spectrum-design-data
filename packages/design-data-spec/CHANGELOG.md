# @adobe/design-data-spec

## 0.0.0-tp-check-20261128031303

### Patch Changes

- [`4e9fe0a`](https://github.com/adobe/spectrum-design-data/commit/4e9fe0a8d794d081514b1909b340071ac94ddd9a) - Disposable snapshot check for npm trusted publisher validation. Never merged.

## 7.10.0

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

- [#2230](https://github.com/adobe/spectrum-design-data/pull/2230) [`34e9eaf`](https://github.com/adobe/spectrum-design-data/commit/34e9eaf5eff2be192d392b3cd231d9281f5f3471) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-118 lints inline collection item semantics; a Range vector pins the snap-back tolerance.
  - **sdk/core spec118.rs**: warns when an inline collection item names an unknown anatomy
    part in `parts` or `semantics`, exposes a facet the item does not declare, maps a value
    the facet lacks, or copies an option the item `state` omits. No new rule id, and no
    existing contract warns.
  - **conformance/invalid/SPEC-118**: gains an inline item with an unknown part and facet.
  - **conformance/behavior/number-field.json**: a vector pins that decrement from an empty
    value with max 0.3 and step 0.1 gives 0.3, not 0.2 (the 1e-9 snap-back tolerance).
  - **sdk/core/tests/fixtures/behavior-range.json**: the same vector for ArrowDown and
    for the decrement intent.

- [#2226](https://github.com/adobe/spectrum-design-data/pull/2226) [`d3607c4`](https://github.com/adobe/spectrum-design-data/commit/d3607c49861f080513ef76d0633ac0a25cfb9fcd) Thanks [@GarthDB](https://github.com/GarthDB)! - Spec sheet Keyboard table lists the keys of the web key bindings, not the registry defaults.
  - **sdk/plugins/spec-sheet**: for a contract whose part role the web bindings list, the table keeps
    an intent only when a binding gives it a key, and shows those keys. Checkbox, switch and radio
    button show Space only, link shows Enter only, number-field shows PageUp and PageDown and no
    ArrowRight or ArrowLeft, slider, color slider and rating gain Page and Home/End keys.
  - **sdk/plugins/spec-sheet**: color wheel and color area (no part role) drop the page and min/max
    rows that had an empty Keys cell. A contract with no bound role keeps the default keys.
  - **sdk/plugins/spec-sheet**: 18 sheets change: the 15 above plus text-field and text-area (no
    empty `clear` and `submit` rows, so no Keyboard block) and search-field (Escape and Enter).
  - **sdk/cli**: the spec-sheet graph loads `behaviors/bindings`.
  - **packages/design-data-spec/spec/accessibility.md**: documents the rule.

## 7.9.0

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

- [#2193](https://github.com/adobe/spectrum-design-data/pull/2193) [`19c3c5f`](https://github.com/adobe/spectrum-design-data/commit/19c3c5fc821ebc02a3d0da2ebf576cb0c0351b4d) Thanks [@GarthDB](https://github.com/GarthDB)! - A key suite can run against the item parts of a collection.
  - A suite in `conformance/behavior/bindings/<platform>/<role>.item.json` sets `"item": true`. The
    runner then selects every component whose collection item contract has a part with that role,
    not the group's own part, so Accordion (a group with no role) runs the `button` key vectors.
  - The Accordion key vectors (Enter, Space, an arrow) moved from a Rust-only test into
    `bindings/web/button.item.json`.

- [#2188](https://github.com/adobe/spectrum-design-data/pull/2188) [`849bd9a`](https://github.com/adobe/spectrum-design-data/commit/849bd9a1845e7257e4db1dd89e46e4e5891378bd) Thanks [@GarthDB](https://github.com/GarthDB)! - Relationships can carry an ordinal in their identity.
  - **relationship-format.md, relationship.schema.json**: new `scope.ordinal` (integer, 1 or
    more). Records that differ only by it are distinct identities, so the stops of one gradient
    need no digit in the property name. A record without it is unchanged.
  - **Rule SPEC-125** (`relationship-ordinal-valid`, error): the ordinal is a positive integer.
  - **component-visual.schema.json**: a structured selector may name `ordinal`.
  - **Engine**: the identity line, the status collision check, the changelog identity class
    (an ordinal change is an API change) and the record diff label read the ordinal.
  - No data uses the field yet; the avatar gradient stops migrate in a follow-up.

## 7.8.0

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

### Patch Changes

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

- [#2166](https://github.com/adobe/spectrum-design-data/pull/2166) [`6e41b8e`](https://github.com/adobe/spectrum-design-data/commit/6e41b8e3231c197d72d751d0fd9554fe478c02ca) Thanks [@GarthDB](https://github.com/GarthDB)! - Declare role `group` for the Checkbox group.
  - Data: the Checkbox group `accessibility` block gains `role: "group"` (the only
    block change; nothing else in any block changes) and its behavior contract
    carries the same role on the `container` part, pinned in its conformance suite.
    Spec sheets and renders are unchanged: Checkbox group has no spec sheet.
  - The contract still carries no arrow-key navigation: the usage prose says arrows
    move focus, while React Spectrum S2 and Web Components give each checkbox its
    own tab stop. This is an open decision (hd0g.4.15), not modeled.
  - The wasm package embeds the contract, so it ships the changed data.

- [#2170](https://github.com/adobe/spectrum-design-data/pull/2170) [`2db54c1`](https://github.com/adobe/spectrum-design-data/commit/2db54c11a255a8425466b50901f39e4b6aed82fc) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-092 no longer flags a live relationship record that has a `legacyKey`. The legacy token name
  addresses it, so it needs no `context` or contexted referrer. Deprecated records stay exempt. The
  CLI check and the embedded `Dataset.validate()` output change with it (no CLI version bump).

## 7.7.0

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

- [#2147](https://github.com/adobe/spectrum-design-data/pull/2147) [`6d455ab`](https://github.com/adobe/spectrum-design-data/commit/6d455abbccf06bba76ab55ea12aef8f431894a03) Thanks [@GarthDB](https://github.com/GarthDB)! - A nested `component` part can list `inherit: ["contentColor"]`: its icon and
  text parts take the color of the host root's first icon or text child instead
  of their own. The tag's clear button uses it, so the cross is drawn in the
  label's color in every selected, emphasized and color scheme look (#2120).

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

- [#2159](https://github.com/adobe/spectrum-design-data/pull/2159) [`5b27625`](https://github.com/adobe/spectrum-design-data/commit/5b27625e31d7c3969edf8ec6bb9f982092761193) Thanks [@GarthDB](https://github.com/GarthDB)! - Clarify when the layout revision is bumped: only for an engine change to how existing recipes
  lay out that an older renderer cannot reproduce. New data or new features that older renderers
  ignore are covered by `requires.cli`, not the revision.

## 7.6.0

### Minor Changes

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

## 7.5.0

### Minor Changes

- [#2092](https://github.com/adobe/spectrum-design-data/pull/2092) [`9bea19e`](https://github.com/adobe/spectrum-design-data/commit/9bea19ee4aa4671ccff1f1fdbe5d94a5350256b8) Thanks [@GarthDB](https://github.com/GarthDB)! - Add an `image` fill to component visual recipes.

  A `box` with `image` draws a picture from a `source` (a string option or a literal) with
  `fit` (`cover`, `contain`, `fill`, `none`) and `position`, clipped to the box's corners. The
  engine reads only `data:image/png;base64` URIs (2 MiB, 4096 px a side, 4 million pixels):
  it never fetches a URL or reads a file. A part with no source draws a neutral checkerboard
  placeholder; a source that cannot be drawn draws it with a diagnostic.

  New rule SPEC-117 checks the declaration. The scene node carries `image` (`href`, `fit`,
  `position`, `dest`, `size`, `placeholder`).

### Patch Changes

- [#2097](https://github.com/adobe/spectrum-design-data/pull/2097) [`59a4867`](https://github.com/adobe/spectrum-design-data/commit/59a4867312b2ddb6032f3888f714bde22f4958fd) Thanks [@GarthDB](https://github.com/GarthDB)! - Clarify that a single-size platform recipe serves every host size when nested.
  - **spec/component-visuals.md**: a nested platform recipe with one `sizeScale` entry
    (such as `switch-ios`) is used at every host size; a multi-size recipe that lacks
    the size still fails to compile.

## 7.4.0

### Minor Changes

- [#2086](https://github.com/adobe/spectrum-design-data/pull/2086) [`5195966`](https://github.com/adobe/spectrum-design-data/commit/5195966693d7d5a579d3bf890b740d4932178de5) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a `grid` layout, subtrees and nested repeats to component visual recipes.

  `direction: "grid"` lays cells out in `columns` per row, with `columnGap` and `rowGap`,
  filling row by row from flowed children or repeated copies (calendar months, tables).
  A `box` child that is a grid or declares `repeat` is laid out as its own subtree, so a
  calendar's title, weekday row and day grid, or a table's header and body, share one tree.
  A `repeat` may sit on a part another `repeat` draws (a tree's levels); a nested repeat
  with no entries draws nothing.

  New rule SPEC-116 checks the declaration. The engine clamps a bad column count, draws at
  most 5000 repeated copies and subtrees per scene, and nests at most 6 deep.

## 7.3.0

### Minor Changes

- [#2079](https://github.com/adobe/spectrum-design-data/pull/2079) [`7b4561f`](https://github.com/adobe/spectrum-design-data/commit/7b4561fcae97ec7e33358c78dbd7536063017b7e) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a nested component part float by `side`.
  - SPEC-112 accepts a `component` part with `floating.side` (a slider's
    field label above its track), as it already did for `position`.
  - A nested floating component that is zero wide (a field label with no
    text) is kept and draws nothing, with no diagnostic.
  - Unit tests cover both; no recipe or data changes.

- [#2068](https://github.com/adobe/spectrum-design-data/pull/2068) [`98214fa`](https://github.com/adobe/spectrum-design-data/commit/98214fab5b3b4e02a49bd51580a106f4af220b3e) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a `shadow` property to component visual recipes. A box draws one or more
  drop shadows (`x`, `y`, `blur`, optional `spread`, `color`). Each field is a
  value source, so a recipe binds the `drop-shadow` tokens. Blur is the Figma
  radius (Gaussian sigma is half of it). The shadow is not drawn inside the box
  and does not move layout.

- [#2071](https://github.com/adobe/spectrum-design-data/pull/2071) [`2ccb22a`](https://github.com/adobe/spectrum-design-data/commit/2ccb22a92e6d32a2fc466f81446a084f4918885e) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a `floating` property to component visual recipes. A top-level part with
  `floating` (`side`, `align`, `offset`, `crossOffset`) is drawn outside the root,
  beside one of its edges, for overlays, tips and loupes, and is present when its
  `visibleWhen` holds. The scene now grows to hold floating parts and the full
  drop shadow (blur, offset, spread) instead of cutting shadows at the 8px
  margin. Add rule SPEC-112, which checks a floating part's declaration.

- [#2073](https://github.com/adobe/spectrum-design-data/pull/2073) [`34bc650`](https://github.com/adobe/spectrum-design-data/commit/34bc65088ca920813259ef1f103dbc50906f8767) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `floating.position` to component visual recipes: a part placed at a fraction
  of a part's box along x and/or y, from a numeric option with `min`, `max`,
  `invert` and `align`, or a part whose length on an axis is the span between two
  fractions (`length`, `from`). It draws a slider or colour handle at a value and a
  fill that grows with it. Out of range values are clamped with a diagnostic. Add
  rule SPEC-114, which checks the declaration.

  An unset option value draws at the start with no diagnostic. An axis can be a list
  of entries picked by `when` (for example `orientation`), and a nested `component`
  part (a colour handle) can be positioned. SPEC-114 checks that option names are
  number options of the component.

- [#2072](https://github.com/adobe/spectrum-design-data/pull/2072) [`37fbe10`](https://github.com/adobe/spectrum-design-data/commit/37fbe10e393858cb020b8fecd9b9483d117776c1) Thanks [@GarthDB](https://github.com/GarthDB)! - A floating part can now host `children`: it is laid out as a subtree (its size comes
  from its own layout) anchored to the root, and the scene grows to hold the whole
  subtree and its shadows. A box can bind `path` (`d` of SVG path data without arcs,
  optional `viewBox` and `fillRule`) to draw as a closed shape, such as a teardrop loupe
  or a tip with a rounded point, with fill, checker pattern, centered stroke and shadow
  in the scene, SVG and PNG. Add rule SPEC-113 (path data the engine can draw) and relax
  SPEC-112 for floating subtrees. A shadow layer with `x`, `y` or `spread` beyond 1000px
  is skipped with a diagnostic, so SVG and PNG size the canvas alike; an unresolved
  floating `offset` or `crossOffset` now reports a diagnostic; floating parts of a nested
  recipe are dropped with a diagnostic.

- [#2080](https://github.com/adobe/spectrum-design-data/pull/2080) [`9d2f343`](https://github.com/adobe/spectrum-design-data/commit/9d2f343750e012eb2d060875eee7fcae4cd02c43) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `gradient.ramp` to component visual recipes: a linear gradient whose stops the
  engine computes from a color option and a channel (hue, saturation, lightness,
  brightness, red, green, blue, alpha) in hsl, hsb or rgb, the way React Spectrum
  draws a color slider's track (hue 7 stops, lightness 3, others 2). With `z` it is
  one layer of a color area (hue, saturation, lightness or brightness layers with
  the fixed channel held at its value). Add rule SPEC-115, which checks the
  declaration. An unset or unreadable color draws the ramp for red with a
  diagnostic, and a ramp that cannot be drawn (an rgb area) draws the plain fill.
  Floating parts now draw a gradient fill.

## 7.2.0

### Minor Changes

- [#2060](https://github.com/adobe/spectrum-design-data/pull/2060) [`07fc360`](https://github.com/adobe/spectrum-design-data/commit/07fc360003c82cfd5b277ffbf941c338465dd914) Thanks [@GarthDB](https://github.com/GarthDB)! - The reference SDK loads a platform manifest's `extensions/deviations/` and enforces SPEC-109 to 111.
  - SPEC-109: a deviations file matches its schema; ids are unique per file.
  - SPEC-110: component, part, states, options and modes of a deviation resolve.
  - SPEC-111 (warning): a deviation's `property` is one its `part` sets in the recipe.
  - `render-compare`, `validate-manifest` and `platform impact` ignore them for now.

- [#2061](https://github.com/adobe/spectrum-design-data/pull/2061) [`770ee85`](https://github.com/adobe/spectrum-design-data/commit/770ee854ae3e0b477c6466da88366d6b290ba830) Thanks [@GarthDB](https://github.com/GarthDB)! - A `slot` part may sit directly under the root (row or column) and is
  one flowed block. A component group (a box of `component` parts in a
  row box) also accepts `direction: column`. SPEC-108 allows the root.

## 7.1.0

### Minor Changes

- [#2050](https://github.com/adobe/spectrum-design-data/pull/2050) [`1509d43`](https://github.com/adobe/spectrum-design-data/commit/1509d43992dbf9564e9074dce79318821e937947) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `snake_case` as an explicit platform manifest `formatting.casing` value.
  Lowercase words joined by `_` (the default delimiter for it). Same output as
  `kebab-case` with delimiter `_`, which remains valid.

- [#2051](https://github.com/adobe/spectrum-design-data/pull/2051) [`df4012b`](https://github.com/adobe/spectrum-design-data/commit/df4012b1d5b92bce207592e807483a734bf9255b) Thanks [@GarthDB](https://github.com/GarthDB)! - A nested component part's `with.label` sets the nested request's label text.
  - `with.label` is a string literal or `{"option": name}` naming a string host option. It is
    the nested component's text, not an option; SPEC-089 checks that it is a string.
  - A slot fill's `options.label` works the same way.
  - A group of labelled radios can now be expressed: each nested item carries its own text.
  - Without `with.label` the nested label stays empty, as before.

- [#2057](https://github.com/adobe/spectrum-design-data/pull/2057) [`a0564ae`](https://github.com/adobe/spectrum-design-data/commit/a0564ae218c819939d7b6a65fb606b4109ebe24d) Thanks [@GarthDB](https://github.com/GarthDB)! - Platform manifests can declare `deviations`: where a platform cannot match a component's recipe.
  - New schema `platform-deviation.schema.json`; `manifest.md` gains `extensions/deviations/`.
  - SPEC-109 to SPEC-111 are defined in `rules.yaml`. The SDK does not load the directory yet,
    so none is enforced. Loading and tool behaviour follow.
  - `component-visuals.md`: a renderer MUST NOT read deviations.
  - Proposal 019 records the design.

- [#2052](https://github.com/adobe/spectrum-design-data/pull/2052) [`ebe9f5e`](https://github.com/adobe/spectrum-design-data/commit/ebe9f5e8d29bf732208bf0b9de660a49c75e0613) Thanks [@GarthDB](https://github.com/GarthDB)! - Document the `MANIFEST-001` to `MANIFEST-006` diagnostics that `validate-manifest` and
  `platform doctor` report, including the new checks for a platform's relationships,
  implementations and component aliases.

- [#2058](https://github.com/adobe/spectrum-design-data/pull/2058) [`7d30326`](https://github.com/adobe/spectrum-design-data/commit/7d30326545c8252f1b2e0d5bedb0fd28fa5dd758) Thanks [@GarthDB](https://github.com/GarthDB)! - A `slot` part accepts `direction: column`: fills stack vertically,
  with `gap` and `align` on the cross axis.

### Patch Changes

- [#2059](https://github.com/adobe/spectrum-design-data/pull/2059) [`d919378`](https://github.com/adobe/spectrum-design-data/commit/d9193786f28838841f2e9db3601103e2c352d24d) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the rune issue links in proposal 019.
  - `platform-deviation.schema.json` now notes that `when` mirrors the recipe condition.

- [#2056](https://github.com/adobe/spectrum-design-data/pull/2056) [`d11b4ae`](https://github.com/adobe/spectrum-design-data/commit/d11b4ae1ee5254d29a3b59981c522485898fc472) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(design-data): warn when a request slot key matches no slot
  - A render request `slots` key that is no slot name of a slot part now adds a
    scene warning. It lists the slots that have a part, and says so when the key
    is the part id (radio-group: `default`, not `options`). The render succeeds.
  - Document that `--slots` keys are slot names, not part ids.

## 7.0.0

### Major Changes

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

- [#2034](https://github.com/adobe/spectrum-design-data/pull/2034) [`c37b680`](https://github.com/adobe/spectrum-design-data/commit/c37b6809884cac367c148b2f1f9e3d72c81ad407) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the optional `excludeFromLegacy` token field. When `true`, legacy
  output generation omits the token. A token with no legacy counterpart
  can then be authored without changing `@adobe/spectrum-tokens`.

### Patch Changes

- [#1975](https://github.com/adobe/spectrum-design-data/pull/1975) [`80c3999`](https://github.com/adobe/spectrum-design-data/commit/80c399955eba3e1eeb484348b51a8c6dc1c26450) Thanks [@GarthDB](https://github.com/GarthDB)! - Document that SPEC-073 skips deprecated components (`lifecycle.deprecatedIn`).

## 6.4.0

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

- [#2003](https://github.com/adobe/spectrum-design-data/pull/2003) [`15f49f2`](https://github.com/adobe/spectrum-design-data/commit/15f49f2c55f494739e463b2029d9e91498d7f687) Thanks [@GarthDB](https://github.com/GarthDB)! - Document that a repeat `with` mapping can target a string option read by a text part
  (`text.option`), so a repeated entry can carry copy beyond its label.

## 6.3.0

### Minor Changes

- [#1997](https://github.com/adobe/spectrum-design-data/pull/1997) [`212a1cd`](https://github.com/adobe/spectrum-design-data/commit/212a1cd467dbc4a72be91c7307730f9465523a24) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a `gallery` section block to the component spec sheet schema.
  - A grid of small scene renders, each titled, with a caption, a column count and a cell size.
  - The generator fills Accordion's anatomy with a multi-item specimen (several items
    expanded) and a variants board (size x density x quiet).

- [#1997](https://github.com/adobe/spectrum-design-data/pull/1997) [`212a1cd`](https://github.com/adobe/spectrum-design-data/commit/212a1cd467dbc4a72be91c7307730f9465523a24) Thanks [@GarthDB](https://github.com/GarthDB)! - Add an optional `sections` array to the component spec sheet schema.
  - Prose, table and placeholder blocks for the non-measurement template sections.
  - Sections: anatomy, usage, states, accessibility, decision log, how to use, feedback.

## 6.2.0

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

## 6.1.0

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

## 6.0.0

### Major Changes

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

## 5.2.0

### Minor Changes

- [#1966](https://github.com/adobe/spectrum-design-data/pull/1966) [`a673ead`](https://github.com/adobe/spectrum-design-data/commit/a673ead72a74ff6d91001b077fe68037e2aec854) Thanks [@GarthDB](https://github.com/GarthDB)! - Component changelogs now list a change to a relationship's `scope.part`,
  `scope.between`, `scope.property` or `scope.attribute` as an `api` entry, because a
  recipe selector that named the old identity stops resolving. Moves that keep the
  identity stay metadata: `scope.options.from`/`to` to `scope.between`, `contextPart` to
  `scope.part`, the root part added to a record, and `contextRole`/`contextQualifier`
  changes. Option pins (`state`, `variant`) stay visual. Existing changelogs are not
  rewritten.

## 5.1.0

### Minor Changes

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

## 5.0.0

### Major Changes

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

### Minor Changes

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

- [#1932](https://github.com/adobe/spectrum-design-data/pull/1932) [`d3e7593`](https://github.com/adobe/spectrum-design-data/commit/d3e7593bc4d72a4440cc070de38378bf23b49bbd) Thanks [@NateBaldwinDesign](https://github.com/NateBaldwinDesign)! - Fields can now declare which token tiers they apply to.
  - **field.schema.json**: adds optional `allowedTokenTiers` (primitive, semantic, component).
  - **fields/scaleIndex.json**: limits `scaleIndex` to primitive and semantic tokens.
  - **token.schema.json**: adds optional `tokenTier`, an override of the derived tier.
  - **field.schema.json**: adds `impliesTokenTier`, which drives the derived tier.
  - **SPEC-102** warns when a field is used on a tier it excludes; **SPEC-103** reports overrides.
  - **spec/taxonomy.md**: defines the tiers and the derivation; foundation is a group, not a tier.
  - **conformance/manifest-extensions**: rejects an empty list and an unknown tier.

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

## 4.26.0

### Minor Changes

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

## 4.25.0

### Minor Changes

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

## 4.24.0

### Minor Changes

- [#1901](https://github.com/adobe/spectrum-design-data/pull/1901) [`5030209`](https://github.com/adobe/spectrum-design-data/commit/5030209fdc50f8161684368b8d0c65f2537e9620) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a progress-bar visual recipe, and recipe support for a fill amount and option text.
  - New value source `fraction` (`value`, `min`, `max` option names) and `relativeTo: "parent"` size a
    nested box as a share of its parent. A text part's new `text` field reads a string option or shows
    the fraction as a percentage.
  - Progress bar renders size, value, indeterminate (one fixed frame), hideLabel, and white and black
    static colors. `labelPosition: side` is not drawn yet.
  - Progress bar anatomy is reviewed and gains a `header` part. The `variant` option (Spectrum 1 only)
    is removed, and `staticColor` gains `black` with its three relationships.

## 4.23.0

### Minor Changes

- [#1896](https://github.com/adobe/spectrum-design-data/pull/1896) [`12ddd7e`](https://github.com/adobe/spectrum-design-data/commit/12ddd7e78e685a853d7a1afb4ba837ab13a9660b) Thanks [@GarthDB](https://github.com/GarthDB)! - Added draft anatomy (`anatomyReview.status: draft`) to the 63 components that had relationships
  but no anatomy. Parts follow the S2 Web Figma file, with relationship contexts, React Spectrum
  and Spectrum Web Components as fallbacks. Shadows, borders and strokes are styling on a part,
  not parts (new line in the anatomy format chapter). Added the `prefix` and `opacity-checkerboard`
  anatomy terms. The required-field indicator is declared only on `field-label`. `tabs` and
  `segmented-control` declare a `keyboard-focus` state, and `segmented-control` a `disabled`
  state. A reviewer still has to confirm each component before a visual recipe depends on it.

## 4.22.0

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

- [#1893](https://github.com/adobe/spectrum-design-data/pull/1893) [`20035e0`](https://github.com/adobe/spectrum-design-data/commit/20035e0e291e73d48509f255c52c0d2daafbceb3) Thanks [@GarthDB](https://github.com/GarthDB)! - A relationship `scope` may carry `between` (`{ from, to }`, the endpoints of a gap or padding) and
  the descriptive fields `object`, `position`, `structure`, `qualifier` and `icon`, each a registry
  term. New rule SPEC-101 (warning) checks each value against the vocabulary of the same-named
  name-object field; `between` ends resolve like a space-between endpoint (SPEC-047). An engine
  **MUST** refuse a `between` or descriptive value that is not the shape given. No data uses the
  fields yet.

## 4.21.1

### Patch Changes

- [#1865](https://github.com/adobe/spectrum-design-data/pull/1865) [`1b01d40`](https://github.com/adobe/spectrum-design-data/commit/1b01d40baf3edafef26ca9e3a2d96c288e86cf31) Thanks [@GarthDB](https://github.com/GarthDB)! - SVG label text now uses the font stack `'Adobe Clean Spectrum VF', adobe-clean-spectrum-vf,
'Adobe Clean', 'Source Sans 3', sans-serif`. Browsers match family names exactly, so the old
  lead name `adobe-clean-spectrum-vf` missed an installed Adobe Clean Spectrum VF and the label
  fell to the generic sans-serif, about 18 % wider: "Save changes" (700, 16 px) measured
  106.73 px against about 90 px and overran the button's right padding.

  `renderComponentSvg(request, fonts?)` takes the same font list as `renderComponentPng` and
  sizes the layout with the first non-fallback font. `design-data-render` passes the installed
  Adobe Clean Spectrum VF when it finds one, so SVG boxes fit the text a viewer with that font
  draws. Without it the Source Sans 3 table is used, as before.

## 4.21.0

### Minor Changes

- [#1857](https://github.com/adobe/spectrum-design-data/pull/1857) [`2a1e521`](https://github.com/adobe/spectrum-design-data/commit/2a1e521b6f62f5e65f5b3db15379a7888c929392) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-100 (warning): relationship records of one component that share `property`, `context`
  and `$ref` and differ only in the value of one declared option SHOULD be one record that pins
  an array. Records with a `legacyKey` and records that use an any-of are skipped. It has a
  conformance case.

- [#1848](https://github.com/adobe/spectrum-design-data/pull/1848) [`da44b61`](https://github.com/adobe/spectrum-design-data/commit/da44b61596c59dfdd3434fca196e7f48f3ff95b1) Thanks [@GarthDB](https://github.com/GarthDB)! - Add rules SPEC-094 to SPEC-099 for any-of in relationship scopes (proposal 017): a state repeated
  across elements of one state array (SPEC-094), a component option named `anyOf` (SPEC-095, error),
  an `anyOf` over one option (SPEC-096), a redundant alternative (SPEC-097), an alternative that
  pins no declared option (SPEC-098), and a record with a `legacyKey` that uses an any-of
  (SPEC-099, error). Each has a conformance case.

- [#1847](https://github.com/adobe/spectrum-design-data/pull/1847) [`d12b8bc`](https://github.com/adobe/spectrum-design-data/commit/d12b8bce115b3c2f494de0b9d3739191b4ed8287) Thanks [@GarthDB](https://github.com/GarthDB)! - Add any-of to relationship scopes (proposal 017). `scope.options.anyOf` is an array of option
  conditions: the record applies when its other pins match and at least one alternative matches, so
  "selected or indeterminate" is one record. An element of `scope.options.state` may be
  `{ "anyOf": [state, ...] }`. A record with an any-of is equivalent to one record per alternative
  with the same `$ref`. `anyOf` is reserved as an option name, an any-of cannot be used on a record
  that carries its own `value` or a `legacyKey`, and SPEC-053 and SPEC-054 check each alternative
  and member. `relationship.schema.json` accepts both forms.
  `relationship.schema.json` also allows numeric option pins (for example `scaleIndex`), which the
  data already uses.

- [#1863](https://github.com/adobe/spectrum-design-data/pull/1863) [`8d25409`](https://github.com/adobe/spectrum-design-data/commit/8d2540928d4618fe4340b570a33eb4f8f22cb680) Thanks [@GarthDB](https://github.com/GarthDB)! - An engine MUST refuse a relationship record whose `scope` has a field it does not know
  (`component`, `part`, `property` and `options` are the known ones), and MUST NOT ignore it. This
  is the gate that ships before new scope fields (`between`, bead p6ga.21.24) are allowed in data,
  so an engine built before them fails loudly instead of treating two records that differ only by
  such a field as identical.

- [#1856](https://github.com/adobe/spectrum-design-data/pull/1856) [`7a5a511`](https://github.com/adobe/spectrum-design-data/commit/7a5a51166a61074fd9435d415f1f7ee2248fcb2e) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-093 is now an error: a relationship `context` MUST NOT name a value of an option the
  component declares, a boolean option name or its negation (proposal 017, bead p6ga.21.9). A
  `size` value counts in its spelled form (`m` is `medium`). The data in this repository has no
  violation left, so the baseline entry is gone.

## 4.20.0

### Minor Changes

- [#1846](https://github.com/adobe/spectrum-design-data/pull/1846) [`254adf1`](https://github.com/adobe/spectrum-design-data/commit/254adf11b565f4768a69340a5ccadc1e72303dbe) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the rule that an engine must refuse a relationship record whose `scope.options` holds a value
  shape it does not understand, instead of ignoring the key. The understood shapes are an array of
  strings for `state`, and a string, number or boolean (or an array of those) for every other
  option. This lets a later version add a shape, such as an any-of across options, without an older
  engine silently applying the record to every request.

## 4.19.0

### Minor Changes

- [#1822](https://github.com/adobe/spectrum-design-data/pull/1822) [`5574cc4`](https://github.com/adobe/spectrum-design-data/commit/5574cc4b6835105742025f482c3305f5642dc6e3) Thanks [@GarthDB](https://github.com/GarthDB)! - Add rule SPEC-093 (`relationship-context-names-option`, warning). A relationship `context` that
  names a component option value, such as `Control (selected, non emphasized)`, should pin that
  option in `scope.options` instead. A record that pins no option is the default, so the default
  value needs no label in the context. Existing data is held at a baseline until it is migrated.

## 4.18.0

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

## 4.17.1

### Patch Changes

- [#1765](https://github.com/adobe/spectrum-design-data/pull/1765) [`599afd2`](https://github.com/adobe/spectrum-design-data/commit/599afd2ef8a2c22d0d7041bcd833732b683c99d6) Thanks [@GarthDB](https://github.com/GarthDB)! - Clarify `artifact-moves.md`: a platform in its own repo keeps replacing the
  foundation record until its pin bump deletes the copy; a recipe or relationship
  move is recorded on the component's `lifecycle.moves`; and a foundation-owned
  component that gains a recipe is a file move plus ordinary data edits.

## 4.17.0

### Minor Changes

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

## 4.16.0

### Minor Changes

- [#1708](https://github.com/adobe/spectrum-design-data/pull/1708) [`2e6bc57`](https://github.com/adobe/spectrum-design-data/commit/2e6bc5767d35ad32418b800f98b2162733eda879) Thanks [@GarthDB](https://github.com/GarthDB)! - State model: combined interaction states now resolve per property, with
  `keyboard-focus` as a non-layered state between `hover` (50) and `down` (70), so
  pressed beats focus beats hover. `prop` states pick the token set and a token
  that matches more active states wins before precedence is compared.
  `layered` is deprecated: schemas still accept it and resolvers ignore it. The
  state registry now carries default precedence (hover 50, focus and
  keyboard-focus 60, down and active 70), so components declare precedence only
  to deviate. The renderer does not read precedence yet (follow-up work).

  Button no longer declares explicit precedence or `layered`; it uses the registry defaults.

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

## 4.15.0

### Minor Changes

- [#1703](https://github.com/adobe/spectrum-design-data/pull/1703) [`5f38c0a`](https://github.com/adobe/spectrum-design-data/commit/5f38c0a00507a59c5c575dfd8efedf9ca9d92251) Thanks [@GarthDB](https://github.com/GarthDB)! - Component visuals: a part of kind `component` draws another component's recipe
  inside the host (nested recipes).

  The part names the `component`, a `sizeMap` from each host size to a nested size,
  and `with` options that are literals or `{"option": name}` read from the host's
  request. The nested recipe is solved on its own and its nodes join the scene: the
  root node keeps the host part id and the others are `<part>.<inner>`, so anatomy
  views and spec-sheet markers still see one part. Host states do not reach it.
  A row box can group `component` parts and drops out when none is visible. Nesting
  is limited to two levels and may not cycle. New rule SPEC-089
  (`visual-nested-component-valid`); `component-visual.schema.json` accepts the new
  kind and its `component`, `sizeMap` and `with` fields. Compiled recipes gain
  `nested` and `nestedSize` on `component` parts only.

- [#1700](https://github.com/adobe/spectrum-design-data/pull/1700) [`2a6ccd3`](https://github.com/adobe/spectrum-design-data/commit/2a6ccd3796290fa0e4de081072d8d28556524ce7) Thanks [@GarthDB](https://github.com/GarthDB)! - Component visuals: a root can bind `width` and `minWidth`, and a part can
  `grow` to fill the rest of a row.

  The root's outer width is `max(minWidth, width)`, padding inside it; a root
  with neither still hugs its content. `grow` (`true` or a positive share) on a
  `box` or `text` in a row splits the space left after the other parts, gaps and
  padding. A render request gains an optional `width` (px), the demo width, which
  overrides the recipe's `width` but not its `minWidth`. A fixed width narrower
  than the content overflows without clipping and adds a scene diagnostic.
  `component-visual.schema.json` accepts `grow`. A flowed row box with no `width`
  now fills a column root. SPEC-083's fixture uses `rotation` on a box, since
  `minWidth` is now read.

- [#1701](https://github.com/adobe/spectrum-design-data/pull/1701) [`6ee52bc`](https://github.com/adobe/spectrum-design-data/commit/6ee52bc9f0e03eca4bbb063a175171b6f4e886a1) Thanks [@GarthDB](https://github.com/GarthDB)! - Component visuals: a `text` part can wrap or truncate its label, and a root can
  bind `minHeight`.

  A text part that is a direct child of the root binds `overflow` (`wrap` or
  `truncate`, after React Spectrum's `overflowMode`). With a fixed width (a request
  `width` or a root `width`) it breaks greedily after spaces and hyphens against
  the width the root leaves it, measured with the text table; without one, or
  without `overflow`, it hugs on one line as before. A word wider than the width
  is never split: it overflows and adds a scene diagnostic. A wrapped label is one
  scene text node per line. `minHeight` makes the root a minimum: a row root with
  no block padding pads by `(minHeight - one line) / 2` and grows by a line height
  per extra line. `component-visual.schema.json` accepts `minHeight` and
  `overflow`.

- [#1692](https://github.com/adobe/spectrum-design-data/pull/1692) [`cc4a279`](https://github.com/adobe/spectrum-design-data/commit/cc4a279782ea922938fdf8f6f43706a341f60447) Thanks [@GarthDB](https://github.com/GarthDB)! - Add an optional `render.svg` string to the component spec-sheet schema.

  `design-data spec-sheet --svg` writes each block's visual as SVG (the same
  renderer as `design-data render`) next to its scene, so a view can draw the
  visual without a renderer of its own. Sheets written without `--svg` are
  unchanged.

### Patch Changes

- [#1698](https://github.com/adobe/spectrum-design-data/pull/1698) [`9590728`](https://github.com/adobe/spectrum-design-data/commit/95907289353fb320b85b66d7602ea8b19d591e2d) Thanks [@GarthDB](https://github.com/GarthDB)! - Component visuals: layout and text measurement now exist once, in Rust.
  The spec no longer describes a JavaScript runtime that mirrors the
  reference renderer. Browsers load the same solver as WASM and only draw
  the scene.

## 4.14.1

### Patch Changes

- [#1690](https://github.com/adobe/spectrum-design-data/pull/1690) [`c33212a`](https://github.com/adobe/spectrum-design-data/commit/c33212a8996e883625598123e95fec48ed7cd319) Thanks [@GarthDB](https://github.com/GarthDB)! - Compiled recipes describe `iconChoices` for content icons.

  A compiled recipe no longer depends on the request `icon`. Each content icon part lists the
  drawing key of every catalog icon in `iconChoices`, so a renderer with one precompiled variant
  and no catalog can apply the request icon. Existing `drawing`, `drawingMiss` and `drawings`
  fields are unchanged.

## 4.14.0

### Minor Changes

- [#1678](https://github.com/adobe/spectrum-design-data/pull/1678) [`c223628`](https://github.com/adobe/spectrum-design-data/commit/c2236288e5cfa47bfe9f4099abb24d03f7c10acf) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-088 (relationship-duplicate-record), a warning for exact duplicate relationship records.

  Two records in the same file with equal scope, context and `$ref` or value are reported, so
  `Dataset.validate()` in the WASM package can now return it. Spec sheets also resolve a `$ref`
  that names a mode-set group (`setUuid`), showing one value per member scale instead of
  skipping the record.

## 4.13.0

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

- [#1673](https://github.com/adobe/spectrum-design-data/pull/1673) [`dd30d97`](https://github.com/adobe/spectrum-design-data/commit/dd30d97159cb02c9efe6cdd916c2faf5795fb9c1) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can declare a relationship context as derived instead of bound.

  The recipe schema gains a `derived` array (`context`, `property`, `part`, optional `edge`, and
  `from`). The only formula is `(height - <part>.lineHeight) / 2` (or `.height`). New rule SPEC-087
  warns when the token of a derived context disagrees with its formula for any size and scale, so
  `Dataset.validate()` in the WASM package now reports those warnings. The spec sheet schema gains
  `derived` on markers and measurements.

## 4.12.1

### Patch Changes

- [#1650](https://github.com/adobe/spectrum-design-data/pull/1650) [`25df278`](https://github.com/adobe/spectrum-design-data/commit/25df2787641f42fbc3f845c09d36645e7846b1ac) Thanks [@GarthDB](https://github.com/GarthDB)! - Renderer SVG text uses a valid CSS `font-family` list.
  - The default stack quotes `'Source Sans 3'`. The unquoted name made browsers drop the
    whole list and render serif.
  - A family bound by a recipe token (such as `Adobe Clean Spectrum VF`) is quoted unless it
    is a generic keyword. The Rust renderer and the JS runtime produce the same list.
  - Spec R2 shows the quoted stack and requires quoting for names that are not CSS
    identifiers.

## 4.12.0

### Minor Changes

- [#1647](https://github.com/adobe/spectrum-design-data/pull/1647) [`37dbdb6`](https://github.com/adobe/spectrum-design-data/commit/37dbdb6d3676295c36e1d979fb66392119a7671f) Thanks [@GarthDB](https://github.com/GarthDB)! - Spec sheet markers say whether the visual draws them.
  - Each `render.markers[]` entry has a required `drawn` boolean. An undrawn marker keeps
    its number on the rows.
  - A measurement's `label` is the bound token's name, the name the token rows show.
  - A marker's `label` is its group's relationship property without the size part, so groups
    with identical rows are told apart.

## 4.11.1

### Patch Changes

- [#1644](https://github.com/adobe/spectrum-design-data/pull/1644) [`13f4851`](https://github.com/adobe/spectrum-design-data/commit/13f4851adab6c4e01ef3299cafb8c156bcfdfa19) Thanks [@GarthDB](https://github.com/GarthDB)! - Stop the component changelog from reading re-scoped records as removals.
  - Relationship records that match on component, property, context and target pair
    as an update when `scope.options` differ.
  - A context rename on the same target is a documentation update. Trailing
    whitespace in a context is not a change.
  - Removing a relationship whose exact twin survives is metadata, not major.
  - Changelogs are regenerated: button and accordion leave 2.0.0 (1.2.0), combo-box
    and text-area leave 2.0.0 (1.1.2).

## 4.11.0

### Minor Changes

- [#1630](https://github.com/adobe/spectrum-design-data/pull/1630) [`9e9a6fa`](https://github.com/adobe/spectrum-design-data/commit/9e9a6fa618b8e65a3d6ba19d83e9e6f00ec6ec46) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): changelog attributes tokens a component reaches through tokenBindings (hzje.31)
  - **design-data changelog**: a token change reaches a component that names the token in
    `tokenBindings` (resolved by token name to every token uuid with that name), not only through
    relationships. Such entries carry `reachedBy: "tokenBinding"`; a token reached both ways is
    attributed once, unmarked.
  - **component-changelog.schema.json**: entries gain an optional `reachedBy`.

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

- [#1629](https://github.com/adobe/spectrum-design-data/pull/1629) [`435d06b`](https://github.com/adobe/spectrum-design-data/commit/435d06b705453297fbf0cb7337e3b1781c36f9a2) Thanks [@GarthDB](https://github.com/GarthDB)! - fix(sdk): spec sheet token names come from the token's structured name (qkj5.105, qkj5.85)
  - **design-data spec-sheet**: the token column shows the name the SDK serializes from the
    token's structured name (or its pinned `legacyKey`), not the relationship property. A focus
    ring thickness reads `focus-indicator-thickness`, a switch track width
    `switch-control-width-small`. Rows that use one token for two relationship properties stay
    separate rows.

## 4.10.0

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

## 4.9.0

### Minor Changes

- [#1604](https://github.com/adobe/spectrum-design-data/pull/1604) [`21c4d24`](https://github.com/adobe/spectrum-design-data/commit/21c4d240453333a8830c68a2e0afc4b18e9403b0) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(design-data): accordion item visual recipe and row boxes in the renderer

  Adds the accordion item recipe (sizes s to xl, density, quiet, open, hover, disabled).
  It needs three renderer features, in both the Rust solver and the JS runtime:
  - A flowed box that binds `direction: "row"` lays out icon, text and box children in a row.
  - A column root stretches a box with no width across its width.
  - An icon can bind `rotation`, and the `chevron` glyph is new.

  A relationship that pins `size`, or binds a single token, no longer loses that token to the
  token's own size name. A templated numeric selector field (`{sizeIndex}`) now matches a number.

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

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the artifact-moves chapter: promoting and demoting one artifact between a platform
  and the foundation.
  - **spec/artifact-moves.md**: what can move, who decides, promotion criteria, the six steps,
    the demotion notice period (same as deprecation), and proposed `lifecycle.moves` provenance.
  - **Proposed, not implemented**: rule SPEC-077 `artifact-single-owner` for half-finished moves.
  - **spec/index.md, spec/manifest.md**: link to the new chapter.

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

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `constraints` to the component format: if-then rules that limit valid option combinations.
  - **spec/option-constraints.md**: `when` / `require` / `severity` (`error` or `advisory`).
  - **component.schema.json**: optional `constraints` array. Layer 1 checks shape only; Layer 2
    checks names and values.
  - **button, action-button, checkbox**: first constraints, taken from react-spectrum S2.

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

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Spec text for platform-owned visual recipes. SPEC-079 and SPEC-080 are planned, not yet enforced.
  - `component-visuals.md`: platform recipes in `extensions/visuals/` replace the
    foundation recipe whole; SPEC-079 and SPEC-080.
  - `manifest.md`: capability-matrix rows, the `extensions/visuals/` entry and the
    `componentAliases` field (SPEC-081, enforced; see `platform-recipes-core`).
  - `artifact-moves.md`: a platform recipe moves with its component and alias.
  - `rules.yaml`: adds SPEC-079 (warning, an error one minor version later) and
    SPEC-080 (info), both marked planned, and SPEC-081 (error). SPEC-077 and 078
    stay reserved by `artifact-moves.md`.

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

- [#1610](https://github.com/adobe/spectrum-design-data/pull/1610) [`2ec8e9e`](https://github.com/adobe/spectrum-design-data/commit/2ec8e9ed217a01bb81eefe8b1950be79e81cf98d) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): relationship `uuid` is required (SPEC-084)

  `relationship.schema.json` now requires `uuid`, and the new rule SPEC-084
  (`ctr-uuid-required`) also covers platform manifest adds. SPEC-056 still enforces
  uniqueness. A `uuid` no longer marks a value-owning relationship, so SPEC-058 and
  SPEC-072 identify those by `legacyKey`. Conformance fixtures now carry uuids.

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

- [#1607](https://github.com/adobe/spectrum-design-data/pull/1607) [`130285e`](https://github.com/adobe/spectrum-design-data/commit/130285e72a847e6ce15b73457d1813bed30cb94e) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): draft JSON Schema for the component spec-sheet model

  Adds `component-spec-sheet.schema.json`: pages of blocks, one block per relationship context.
  A block holds a render request with its scene, token rows with option labels, notes and
  change markers. `design-data spec-sheet <component>` generates the model from the recipe,
  relationships and scene output.

- [#1598](https://github.com/adobe/spectrum-design-data/pull/1598) [`63c60e0`](https://github.com/adobe/spectrum-design-data/commit/63c60e09e16045552cb4b62c6b4d6e6d0b193dfb) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-063 lets a component with no `size` option declare a one-entry `sizeScale`, the single
  size renderers draw (for example the fixed-size iOS switch). Zero or several entries on such a
  component are an error. `component-visuals.md` and `rules.yaml` say so. The native binary
  is versioned by `@adobe/design-data-tui`.

### Patch Changes

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - A box placed directly in a row now paints itself, so checkbox and switch no longer need a
  render-only `control` part.
  - Renderer and JS runtime read `fill`, `stroke` and `strokeWidth` on a flowed box.
  - Checkbox and switch drop `control`. The box and the track carry the size and hold the marks
    and the handle. Rendered geometry, colors and press scale are unchanged.
  - Relationships that named `control` now name `box` (checkbox) or `track` (switch).
  - Checkbox and switch anatomy are now reviewed.

- [#1612](https://github.com/adobe/spectrum-design-data/pull/1612) [`17f8c31`](https://github.com/adobe/spectrum-design-data/commit/17f8c318d0eba50640d4892bdd07f18ea3cd6920) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): spec-sheet markers per token group, Bindings changed badge, dataset revision

  In the draft `component-spec-sheet.schema.json`, `render.markers` number 1..n per group of
  token rows and each token item carries its `marker` (rows no longer do). Blocks can show a
  "Bindings changed" badge, and the sheet carries `datasetRevision`, the same revision the
  changelog records.

- [#1611](https://github.com/adobe/spectrum-design-data/pull/1611) [`6b25821`](https://github.com/adobe/spectrum-design-data/commit/6b25821dfde7fc9d0f6401f7cb8ab436cbd34cab) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(core): scene token refs carry the relationship that bound them

  `TokenRef` gains `relationship` (`uuid`, `context`, `property`) when a value came through a
  relationship binding, so overlays name the relationship property, not the token's legacy key.
  The spec-sheet `render.measurements` now lists the scene measurements whose relationship
  context is the block title, each labelled with the relationship property.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe `when.options` conditions now accept an array of values, as the spec already described.
  - **sdk/core, site runtime**: an array matches when any value matches and counts as one condition.
  - **SPEC-061**: checks each element of an array condition against the option's declared values.
  - **spec**: component-visuals states that an array counts as one condition.
  - **button**: static color rules for primary and secondary share one entry with `variant: [...]`.

## 4.8.1

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

## 4.8.0

### Minor Changes

- [#1550](https://github.com/adobe/spectrum-design-data/pull/1550) [`18431aa`](https://github.com/adobe/spectrum-design-data/commit/18431aa6bb40fee2838030592940195c42a6a1d4) Thanks [@GarthDB](https://github.com/GarthDB)! - <!-- Copyright 2026 Adobe. All rights reserved. -->

  Allow platform terminology crosswalks to reference existing modes in active mode sets.
  - **spec/manifest.md**: define mode-set targets and validate terms after manifest mode-set edits.
  - **schemas/platform-extension.json**: describe registry and mode-set crosswalk targets.

## 4.7.0

### Minor Changes

- [#1538](https://github.com/adobe/spectrum-design-data/pull/1538) [`a5fc42f`](https://github.com/adobe/spectrum-design-data/commit/a5fc42ff5dc5b1c0dbc569a733021061e3a57115) Thanks [@GarthDB](https://github.com/GarthDB)! - Token-type schemas and `naming-exceptions.json` now live in canonical packages.
  - **design-data-spec/schemas**: authoritative `token-types/` and `token-file.json`, exported as
    `@adobe/design-data-spec/schemas/*`. `sync-token-schemas.mjs` generates copies; CI checks drift.
  - **design-data/naming-exceptions.json**: moved here from `packages/tokens`.
  - **packages/tokens**: `schemas/` and `naming-exceptions.json` are now generated copies.
  - **docs/site/public/schemas**: regenerated, which updates six drifted files at the `$id` URLs.
  - **sdk CLI**: resolves the new locations first, falls back to the old layout for older tags,
    and bumps the embedded snapshot layout.
  - **tools/design-data**: `validate` resolves schemas through `@adobe/design-data-spec`.

### Patch Changes

- [#1539](https://github.com/adobe/spectrum-design-data/pull/1539) [`da64677`](https://github.com/adobe/spectrum-design-data/commit/da6467789ff0277102c4972703842fc0112e73eb) Thanks [@GarthDB](https://github.com/GarthDB)! - Platform manifests pin `foundationVersion` to the canonical package (closes xqln.18).
  - **platforms/**: pin `@adobe/spectrum-design-data@3.5.0` instead of `@adobe/spectrum-tokens`.
  - **packages/design-data-spec/**: document the tag format in the manifest spec and schema.
  - **sdk/cli/**: `platform show` drift check compares the version part of the tag.

## 4.6.0

### Minor Changes

- [#1483](https://github.com/adobe/spectrum-design-data/pull/1483) [`418cc0d`](https://github.com/adobe/spectrum-design-data/commit/418cc0d4b95e3b6b7cc70779e55d09173c88c357) Thanks [@GarthDB](https://github.com/GarthDB)! - Add platform-specific component option aliases and validate their canonical values.
  - **packages/design-data-spec**: Add `componentOptions` extensions with canonical-value validation.
  - **packages/design-data**: Add Button option mappings for React Spectrum and Web Components.

### Patch Changes

- [#1533](https://github.com/adobe/spectrum-design-data/pull/1533) [`6375e4b`](https://github.com/adobe/spectrum-design-data/commit/6375e4b83333f51f012d8f95df35a20d8a792340) Thanks [@GarthDB](https://github.com/GarthDB)! - Ship a generated `llms.txt` with each consumer-facing package (closes #1533).
  - **package.json (10 packages)**: add `llms.txt` to the npm `files` list.
  - **llms.txt**: generated from each README and `.ai/inventory.json` by `pnpm ai:sync`.

## 4.5.0

### Minor Changes

- [#1516](https://github.com/adobe/spectrum-design-data/pull/1516) [`1cce74b`](https://github.com/adobe/spectrum-design-data/commit/1cce74b35a7ecb48302b7114cd89063604ca8440) Thanks [@GarthDB](https://github.com/GarthDB)! - Platform manifests can now own their component implementation mappings through a new
  `extensions/implementations/` category, refining foundation defaults row by row.
  - **schemas/implementation-mapping.schema.json**: new fragment schema — `component` plus
    implementation rows to upsert, or `op: "remove"` selectors.
  - **schemas/component.schema.json**: implementations accept `package` and `importPath`
    together, and gain an optional `implementation` registry id.
  - **spec/manifest.md**, **spec/component-format.md**: document ownership, upsert identity,
    remove selectors, and foundation-default layering.
  - **conformance/manifest-extensions/**: valid and invalid fixtures for the new category.

## 4.4.0

### Minor Changes

- [#1514](https://github.com/adobe/spectrum-design-data/pull/1514) [`9d3a14f`](https://github.com/adobe/spectrum-design-data/commit/9d3a14fb4c7ed956f93b87ccee6565c73b940ed5) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a `prefix` property to manifest `formatting` (closes DNA-1741).
  - **manifest.schema.json**: `formatting.prefix` (string) is prepended to a
    formatted name, after casing/delimiter, unaffected by them — for wrapping
    conventions like CSS custom properties (`--spectrum-`).
  - **spec/manifest.md**: documents the new field alongside `conceptOrder`,
    `casing`, `delimiter`, `abbreviations`.

## 4.3.0

### Minor Changes

- [#1479](https://github.com/adobe/spectrum-design-data/pull/1479) [`e483c9c`](https://github.com/adobe/spectrum-design-data/commit/e483c9cf74acf463c9a3d2be4caba7689e3dc27c) Thanks [@GarthDB](https://github.com/GarthDB)! - Add foundation-owned component platform implementation metadata.
  - **schemas/component.schema.json**: support implementation names and package or
    import-path references for component consumers.

## 4.2.1

### Patch Changes

- [#1476](https://github.com/adobe/spectrum-design-data/pull/1476) [`046e4e6`](https://github.com/adobe/spectrum-design-data/commit/046e4e65930d5fd17b55ee2c9ce880e1e049f99a) Thanks [@GarthDB](https://github.com/GarthDB)! - Document the `export` CLI subcommand and `--format dtcg` output in the
  agent-readable surface spec.
  - **spec/agent-surface.md**: list `export` alongside the existing
    reference-CLI subcommands and note `--format dtcg` support on
    `resolve`/`query`/`export`.

## 4.2.0

### Minor Changes

- [#1449](https://github.com/adobe/spectrum-design-data/pull/1449) [`57b9a04`](https://github.com/adobe/spectrum-design-data/commit/57b9a04243a13b151931e5b36876b857f6ac5ffe) Thanks [@GarthDB](https://github.com/GarthDB)! - Platform manifests can now add, remove, or retarget a single mode value (or remove a whole
  set) in `extensions/mode-sets/` via an `op` field, instead of only declaring or replacing
  the entire set.
  - **spec/manifest.md**: documented the `addMode` / `removeMode` / `setDefault` / `remove`
    op grammar and updated the capability matrix.
  - **spec/mode-sets.md**: cross-referenced the new ops alongside the existing
    declare-or-replace semantics.
  - **conformance/manifest-extensions/**: added valid and invalid fixtures covering each op.

## 4.1.0

### Minor Changes

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

## 4.0.0

### Major Changes

- [#1420](https://github.com/adobe/spectrum-design-data/pull/1420) [`211d661`](https://github.com/adobe/spectrum-design-data/commit/211d66122892000939944b43427f35e356a5ae51) Thanks [@GarthDB](https://github.com/GarthDB)! - Redefine platform-manifest `extensions` as a sibling `extensions/` directory (one file
  per artifact, glob-discovered and merged at load time) instead of a single inline
  object, so per-platform additions can scale past a handful of components.
  - **schemas/manifest.schema.json**: removed the inline `extensions` object; a manifest
    using the old inline shape now fails Layer 1 validation. Added optional
    `extensionsDir` (default `"extensions"`) and promoted `namingExceptions`/`formatting`
    to top-level manifest fields.
  - **spec/manifest.md**: documents the `extensions/` directory layout, glob discovery,
    and merge/precedence rules (deep-merge for `tokens/`, sorted-path-order/last-wins for
    the other catalogs, override/remove-by-uuid for `relationships/`), and the
    per-fragment schema each subdirectory validates against.
  - **reference SDK loader**: glob-discovers and merges each `extensions/` subdirectory
    at manifest load time, schema-validating every fragment file against its category's
    real JSON schema before merging it in.

## 3.5.0

### Minor Changes

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

## 3.4.1

### Patch Changes

- [`a1d6e8a`](https://github.com/adobe/spectrum-design-data/commit/a1d6e8a8df15106aaaec047077d4d09011247227) Thanks [@GarthDB](https://github.com/GarthDB)! - Clarify two manifest cascade behaviors surfaced by the iOS platform manifest POC.
  - **spec/manifest.md**: documents that overrides land as new platform-layer records, not
    in-place edits (`query` double-counts an overridden token; only `resolve` picks the
    cascade winner), and recommends validators reject a pre-cascade-format `foundationVersion`.

## 3.4.0

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

### Patch Changes

- [#1386](https://github.com/adobe/spectrum-design-data/pull/1386) [`ca62801`](https://github.com/adobe/spectrum-design-data/commit/ca62801f3e84f295d5945c3e57793bb5d50a6b1b) Thanks [@GarthDB](https://github.com/GarthDB)! - Document the full platform manifest capability matrix and fill in missing `extensions` sub-keys.
  - **spec/manifest.md**: adds a capability matrix (what a platform manifest
    can override, alias, add, or remove, and what it can't) and documents
    `extensions.tokens`, `extensions.components`, and
    `extensions.platformExtensions`, previously undocumented despite being
    applied by the SDK.

- [#1391](https://github.com/adobe/spectrum-design-data/pull/1391) [`bdbf266`](https://github.com/adobe/spectrum-design-data/commit/bdbf266bc53e30d565531c1c8810688dba6f8348) Thanks [@GarthDB](https://github.com/GarthDB)! - Record the h890.23.5 decision on whether a platform manifest may override
  Layer-1 schemas.
  - **packages/design-data-spec/spec/manifest-schema-override-spike.md**: new
    decision doc — no-go, with rationale (circularity, broken conformance
    guarantees, no concrete need).
  - **packages/design-data-spec/spec/manifest.md**: capability matrix gains an
    explicit "Override Layer-1 schemas" row linking to the decision.

## 3.3.0

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

## 3.2.1

### Patch Changes

- [#1349](https://github.com/adobe/spectrum-design-data/pull/1349) [`16a8077`](https://github.com/adobe/spectrum-design-data/commit/16a807797bb8f204ca169bc8d98ed159f8ff04dc) Thanks [@GarthDB](https://github.com/GarthDB)! - Reconcile RFC coordination docs with shipped reality: Phase B, CTR, and guidelines
  were undocumented or stale.
  - **packages/design-data-spec/spec/authoring-workflow.md**: flip Phase B (foundation-corpus
    write path, token lifecycle ops, mode-set management) from "not yet shipped" to shipped;
    clarify `write_component` remains unscheduled.
  - **packages/design-data-spec/spec/agent-surface.md**: promote `write_token` from RECOMMENDED
    to NORMATIVE (MUST), matching the Phase B promotion now reflected in authoring-workflow.md.
  - **docs/rfc-coordination.md**: add RFC-E (Component/Token Relationships) and RFC-F
    (Guidelines/Phase 10) rows, a #1324 draft-RFC row, reference 6 previously-orphaned
    spec files, and refresh #806/#623/#625/#832 with rules and PRs shipped since the
    last update.
  - **docs/token-studio-sunset.md**: mark Phase 1 (foundation-corpus write target) done,
    unblocking Phase 2.

## 3.2.0

### Minor Changes

- [#1327](https://github.com/adobe/spectrum-design-data/pull/1327) [`7035973`](https://github.com/adobe/spectrum-design-data/commit/7035973b5b4b70d8ad89ec0c4979d7b687050a4d) Thanks [@GarthDB](https://github.com/GarthDB)! - Add Component/Token Relationship (CTR) foundation — an anonymous-token
  join entity unifying `tokenBindings` and name-object component scoping.
  - **schemas/relationship.schema.json**: new Layer-1 schema for
    `relationships/*.json`, mirroring `token.schema.json`'s value/`$ref` split.
  - **spec/relationship-format.md**: normative prose for the CTR scope
    model and interim legacy-compatibility fields.
  - **rules/rules.yaml**: SPEC-051..057, headlined by `ctr-option-valid`
    validating a CTR's options against the component's own options schema.

### Patch Changes

- [#1331](https://github.com/adobe/spectrum-design-data/pull/1331) [`38b1b13`](https://github.com/adobe/spectrum-design-data/commit/38b1b134db2ecb41281da6271f5234cd4d935587) Thanks [@GarthDB](https://github.com/GarthDB)! - Add conformance fixtures for the Component/Token Relationship (CTR) rules
  (closes spectrum-design-data-x29.5).
  - **conformance/invalid/SPEC-051..057**: one dataset + expected-errors
    fixture per CTR rule (undeclared component/part/option/state, unresolved
    `$ref`, duplicate `uuid`, missing `legacyKey` warning).
  - **conformance/valid/SPEC-051**: a zero-diagnostic baseline CTR dataset
    covering both value-owning and relationship-only shapes.
  - **conformance/generation/ctr-legacy-key**: proves a value-owning CTR
    reproduces its legacy token byte-identically and a relationship-only
    CTR is filtered out of legacy output.
  - **scripts/check-layout.mjs**: registers the new fixture paths.

## 3.1.0

### Minor Changes

- [#1309](https://github.com/adobe/spectrum-design-data/pull/1309) [`8a9aadb`](https://github.com/adobe/spectrum-design-data/commit/8a9aadbe97480f43675e692fc46293d1fc2e3643) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-050 to detect fused `name.property` values independent of roundtrip status
  (closes spectrum-design-data-284.1).
  - **rules/rules.yaml**: new advisory rule `SPEC-050` (`property-decomposition-complete`)
    flags a `property` value that fuses a structured field (anatomy, object, position,
    size, state, colorRole, emphasis) instead of being atomic, regardless of roundtrip
    or `naming-exceptions.json` status.
  - **conformance/invalid/SPEC-050/**: new fixture covering the fused-property case.

## 3.0.0

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

## 2.9.0

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

## 2.8.0

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

## 2.7.0

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

- [#1200](https://github.com/adobe/spectrum-design-data/pull/1200) [`45f2ef2`](https://github.com/adobe/spectrum-design-data/commit/45f2ef23b57b3116dce9d664bb97bf05d132d087) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(authoring): B7 — generation conformance fixtures and determinism gate
  (closes #122.7).
  - **packages/design-data-spec/conformance/generation/**: Four new lifecycle
    fixtures — `deprecated-token` (string→bool normalization + `plannedRemoval`
    drop), `renamed-token` (UUID→name `renamed` resolution), `alias-rewire`
    (`$ref`→`{name}` denormalization), `mode-set-edit` (lifecycle field hoisting
    to outer set level).
  - **sdk/core/src/lib.rs**: `generation_conformance` test module drives all six
    fixtures with byte-identical comparison and a determinism re-run gate.

### Patch Changes

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

## 2.6.0

### Minor Changes

- [#1184](https://github.com/adobe/spectrum-design-data/pull/1184) [`a6506b7`](https://github.com/adobe/spectrum-design-data/commit/a6506b7083587a22a62b42974a5922d053208e5f) Thanks [@GarthDB](https://github.com/GarthDB)! - Align agent-surface spec with the scheduled-promotion contract (Phase A5, RFC #625).
  - **packages/design-data-spec/spec/agent-surface.md**: reframe `write_component` from
    "deferred; no CLI subcommand" to Phase B scheduled; add `authoring-workflow.md#scheduled-
promotion` cross-references in the tool-catalog table, the NORMATIVE note, and the status
    line; note that `write_token` and `write_component` are scheduled to become MUST when
    Phase B ships.

- [#1184](https://github.com/adobe/spectrum-design-data/pull/1184) [`a6506b7`](https://github.com/adobe/spectrum-design-data/commit/a6506b7083587a22a62b42974a5922d053208e5f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add per-category authoring contracts to authoring-workflow.md (Phase A2, RFC #625).
  - **packages/design-data-spec/spec/authoring-workflow.md**: expand the per-category
    authoring contracts section from a status table into six normative subsections (tokens,
    components, fields, mode sets, guidelines, registry), each specifying required-at-creation
    fields, validation gate rules, file-naming conventions, and current authoring status.

- [#1183](https://github.com/adobe/spectrum-design-data/pull/1183) [`ae94df9`](https://github.com/adobe/spectrum-design-data/commit/ae94df9f53fc4bc7d50f0b6205cb6b337f2fff6d) Thanks [@GarthDB](https://github.com/GarthDB)! - Add normative authoring-workflow spec backbone (Phase A1, RFC #625).
  - **packages/design-data-spec/spec/authoring-workflow.md**: New spec document defining the
    authoritative source contract, lifecycle operations (create / edit / deprecate / rename /
    alias-rewire / mode-set management), taxonomy-aware authoring requirement, output-generation
    obligations, and scheduled promotion of write ops from RECOMMENDED to MUST when Phase B
    foundation-corpus write tooling ships.
  - **packages/design-data-spec/spec/index.md**: Register `authoring-workflow.md` in the Scope
    list (item 16) and Normative references table.
  - **docs/rfc-coordination.md**: Update RFC #625 row — authoritative spec now linked; Phase 4
    status updated to reflect Phase A progress.

- [#1184](https://github.com/adobe/spectrum-design-data/pull/1184) [`a6506b7`](https://github.com/adobe/spectrum-design-data/commit/a6506b7083587a22a62b42974a5922d053208e5f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add output-generator conformance fixtures and normative determinism contract (Phase A4, RFC #625).
  - **packages/design-data-spec/conformance/generation/flat-token/**: fixture pairing a single
    cascade flat-token input with its expected byte-identical legacy output; tests 1:1 slug
    mapping from name-object serialization.
  - **packages/design-data-spec/conformance/generation/mode-set-token/**: fixture pairing two
    cascade tokens sharing a `set_uuid` with their merged legacy `sets`-keyed expected output.
  - **packages/design-data-spec/conformance/README.md**: document the generation fixtures
    section, format, and SDK driver command.
  - **packages/design-data-spec/spec/evolution.md**: add normative output-generator determinism
    contract (byte-identical on successive runs, sorted keys, no ephemeral fields) with link to
    the generation conformance fixtures.
  - **packages/design-data-spec/scripts/check-layout.mjs**: require both generation fixture
    directories in the layout guard.

- [#1184](https://github.com/adobe/spectrum-design-data/pull/1184) [`a6506b7`](https://github.com/adobe/spectrum-design-data/commit/a6506b7083587a22a62b42974a5922d053208e5f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-043 severity schedule to taxonomy.md and fix dangling xref (Phase A3, RFC #625).
  - **packages/design-data-spec/spec/taxonomy.md**: add `### SPEC-043 severity schedule`
    subsection — documents current warning severity, the 2.0.0 graduation condition (no
    earlier than two minor versions after Phase B catalog-aware authoring ships), and the
    ≥ 90% per-domain compliance prerequisite; mirrors the SPEC-017 precedent.
  - **packages/design-data-spec/spec/authoring-workflow.md**: fix dangling cross-reference
    at line 98 — `[Taxonomy](taxonomy.md)` now resolves to the new anchor
    `taxonomy.md#spec-043-severity-schedule`.

## 2.5.0

### Minor Changes

- [#1157](https://github.com/adobe/spectrum-design-data/pull/1157) [`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `guideline` entity — standalone design guidance document type.
  - **schemas/guideline.schema.json**: new Layer 1 schema for non-component guidance
    pages; requires `$id`, `name`, `title`, `category`, `documentBlocks`; reuses
    `document-block.schema.json` for the body.
  - **rules/rules.yaml**: SPEC-045 (`guideline-missing-purpose`, warning) and
    SPEC-046 (`guideline-related-resolves`, warning).
  - **spec/guideline-format.md**: normative spec prose for the guideline entity.
  - **spec/index.md**, **spec/dataset-layout.md**: register `guidelines/` as an
    optional dataset directory.
  - **schemas/dataset.schema.json**: add `guidelines` to declared directories/paths.

## 2.4.0

### Minor Changes

- [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `guideline` entity — standalone design guidance document type.
  - **schemas/guideline.schema.json**: new Layer 1 schema for non-component guidance
    pages; requires `$id`, `name`, `title`, `category`, `documentBlocks`; reuses
    `document-block.schema.json` for the body.
  - **rules/rules.yaml**: SPEC-045 (`guideline-missing-purpose`, warning) and
    SPEC-046 (`guideline-related-resolves`, warning).
  - **spec/guideline-format.md**: normative spec prose for the guideline entity.
  - **spec/index.md**, **spec/dataset-layout.md**: register `guidelines/` as an
    optional dataset directory.
  - **schemas/dataset.schema.json**: add `guidelines` to declared directories/paths.

## 2.2.0

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

## 2.1.0

### Minor Changes

- [#1118](https://github.com/adobe/spectrum-design-data/pull/1118) [`8e017b2`](https://github.com/adobe/spectrum-design-data/commit/8e017b269f243a4842ba7239731041f8e56e4360) Thanks [@GarthDB](https://github.com/GarthDB)! - Define the normative dataset-directory layout and add the SPEC-044 structural
  pre-check (closes #1114).
  - **spec/dataset-layout.md**: new normative chapter for required/optional
    directories, the discovery algorithm, and the optional root descriptor.
  - **schemas/dataset.schema.json**: new optional `dataset.json` root descriptor;
    allow `$schema` in `mode-set.schema.json`.
  - **SPEC-044** (`dataset-structure`, error): pre-check that `tokens/` holds at
    least one `*.tokens.json`; warns on empty registered optional directories.
  - **sdk**: add `check_dataset_structure`, a `validate_dataset` entry point, and a
    `validate-dataset` CLI subcommand that schema-validates the catalog directories.

## 2.0.0

### Major Changes

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Consolidate Spectrum-specific design data into a single package.
  - **`@adobe/design-data-spec`**: removed `components/`, `fields/`, and `mode-sets/` directories
    and their exports. Now a pure generalized format definition (schemas, spec, rules, conformance).
    The `./components/*.json` export is no longer published — major bump because removing a
    published export is a breaking change per semver.
  - **`@adobe/spectrum-design-data`**: added `components/` (81 component declarations), `fields/`
    (24 field catalog files), and `mode-sets/` (3 mode-set instances) alongside the existing
    `tokens/`. New exports: `./components/*`, `./fields/*`, `./mode-sets/*`.

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

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Move Spectrum registry vocabulary into spectrum-design-data; deprecate design-system-registry.
  - **@adobe/spectrum-design-data**: gains `registry/` (27 vocabulary files) with
    subpath exports (`./registry/*.json`); now the single source of truth for all Spectrum data.
  - **@adobe/design-system-registry**: reduced to a compatibility shim. Migrate imports to
    `@adobe/spectrum-design-data` — this shim will be removed in a future major version.
  - **@adobe/design-data-spec**: gains `registry-value.json` and `platform-extension.json`
    schema exports; `manifest.schema.json` `conceptOrder` enum relaxed to open `string` type
    (no longer hardcodes Spectrum's field names — configurable per field catalog).

## 1.5.0

### Minor Changes

- [#971](https://github.com/adobe/spectrum-design-data/pull/971) [`d12173a`](https://github.com/adobe/spectrum-design-data/commit/d12173abf2915df5b1dae02ef000dae769ba4b66) Thanks [@GarthDB](https://github.com/GarthDB)! - Semantic alias foundation: SPEC-042 alias-target-domain + icon-color alias pilot.
  - **SPEC-042** (`sdk/core`): alias tokens now inherit domain from their target schema.
    A color alias carrying `colorFamily` is valid when its alias chain resolves to a
    color-domain schema (`color.json`, `color-set.json`).
  - **taxonomy.md**: new "Alias / semantic token name objects" section documenting the
    alias-target-domain rule with examples.
  - **icons.json**: 20 alias tokens gain `name` — 4 hue-background, 12 hue-primary,
    3 semantic primary, 1 disabled-primary. 3 polarity tokens deferred (RFC pending).
  - **token-corpus-migrate**: alias.json dispatch + 4 new `iconColorNameForKey` patterns.

- [#969](https://github.com/adobe/spectrum-design-data/pull/969) [`ba06968`](https://github.com/adobe/spectrum-design-data/commit/ba06968226adb268600e0ed1befc9d381e7986b6) Thanks [@GarthDB](https://github.com/GarthDB)! - Typography stragglers: structured `name` on text-align and letter-spacing tokens.
  - **typography.json**: 4 tokens gain `name` — 3 `text-align-*` and 1 bare
    `letter-spacing`.
  - **design-system-registry**: add `text-align` to `property-terms.json`;
    new `alignments.json` registry (start/center/end); regenerate `registry_data.rs`.
  - **design-data-spec**: new `alignment` spec field; `taxonomy.md` updated.
  - **token-corpus-migrate**: add `alignmentNameForKey`, `letterSpacingNameForKey`,
    `lineHeightMultiplierNameForKey` (exported for future use); extend dispatch.
  - Line-height multipliers and CJK line-height deferred — SPEC-006 collision
    and SPEC-042 constraint; follow-ups tracked in beads.

### Patch Changes

- [#972](https://github.com/adobe/spectrum-design-data/pull/972) [`e9974fb`](https://github.com/adobe/spectrum-design-data/commit/e9974fb7360e849e928b31518b073996b49ecd6b) Thanks [@GarthDB](https://github.com/GarthDB)! - Move token `name` objects out of @adobe/spectrum-tokens into a new private
  @adobe/token-names sidecar package.
  - **@adobe/spectrum-tokens**: 497 inline `name` objects removed from
    color-palette.json, icons.json, typography.json. Token data otherwise identical.
  - **@adobe/token-names** (private, new): sidecar package mirroring tokens/src
    layout; depends on @adobe/spectrum-tokens via workspace:\*.
  - **sdk/core**: `TokenGraph::from_json_dir_with_names` merges sidecar names at
    ingest; existing rules unchanged. CLI gains `--names-dir` flag.
  - **token-corpus-migrate**: writes nameMap to sidecar dir, not inline to tokens.

## 1.4.0

### Minor Changes

- [#961](https://github.com/adobe/spectrum-design-data/pull/961) [`cb48b36`](https://github.com/adobe/spectrum-design-data/commit/cb48b36bc7682e790e4b7c51ca157f58150fd462) Thanks [@GarthDB](https://github.com/GarthDB)! - Add normative color, typography, and motion token taxonomies (closes issue #942).
  - **spec/taxonomy.md**: four subsections under "Token-type taxonomies" — semantic/layout
    (existing), color, typography, motion; each with a field table and serialization order.
  - **spec/token-format.md**: split semantic fields table into universal and domain-scoped.
  - **fields/**: 6 new declarations (`colorFamily`, `family`, `weight`, `style`,
    `motionRole`, `easing`) with domain `scope`; `scaleIndex` position moved to 99.
  - **registry/**: 6 new value files for color families, typography families/weights/styles,
    and motion roles/easing curves (motion entries provisional).
  - **SPEC-042** (`field-scope-violation`, warning): domain-scoped field on wrong token type.
  - **SPEC-043** (`domain-required-fields`, warning): color/typography/motion token missing
    a domain-identifying field; advisory severity, does not block the existing corpus.
  - Conformance fixtures for SPEC-042 and SPEC-043.
  - `docs/rfc-coordination.md`: RFC #806 future-taxonomies question resolved.

## 1.3.0

### Minor Changes

- [#958](https://github.com/adobe/spectrum-design-data/pull/958) [`c5bd47e`](https://github.com/adobe/spectrum-design-data/commit/c5bd47e72c59c7b4132464af6b6f39864a77704d) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): add `modeSetRestrictions` to platform manifest and SPEC-041 coverage rule

  Platforms can now declare which mode values are valid in a given mode set via the optional
  `modeSetRestrictions` manifest field (e.g. iOS restricting `colorScheme` to `["light"]`).
  The cascade resolver filters restricted candidates before context matching (step 0 of the
  resolution algorithm). SPEC-041 (`mode-set-restriction-coverage`) enforces that every token
  group has at least one candidate surviving all restrictions simultaneously, and reports
  unknown mode set names and missing defaults as separate sub-diagnostics.

## 1.2.0

### Minor Changes

- [#955](https://github.com/adobe/spectrum-design-data/pull/955) [`e05c3ef`](https://github.com/adobe/spectrum-design-data/commit/e05c3eff28caecbdb9782eb62023876e0d1f4947) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): property field migration path + property-terms registry (#941)

  Adds normative migration policy for the `name.property` field per RFC #806:
  - New `### Name-object migration policy` section in `spec/token-format.md` —
    documents SPEC-017 severity escalation to `error` at spec `2.0.0`, narrowed
    `property` semantics (CSS/styling attribute only), and author migration steps.
  - New `property-terms.json` registry — 35 seeded CSS/styling attribute terms
    (`color`, `background-color`, `border-radius`, `font-size`, `gap`, etc.).
  - Updated `fields/property.json` — sets `registry` path to `property-terms.json`;
    exports `propertyTerms` from registry index.
  - Updated `spec/taxonomy.md` Property row — links to migration section and
    calls out anatomy/surface values as migration debt.
  - Closed RFC #806 open question in `docs/rfc-coordination.md`.

- [#950](https://github.com/adobe/spectrum-design-data/pull/950) [`a8dacbc`](https://github.com/adobe/spectrum-design-data/commit/a8dacbc3572f4e16da518707393a22d21d73272b) Thanks [@GarthDB](https://github.com/GarthDB)! - **SPEC-040 `component-option-field-valid` (Warning, Layer 2)**: token name-object keys
  that match a declared `options.<key>` with a `values[]` list are now cross-validated
  against that list. This generalises SPEC-019 (which covers `variant` at Error severity)
  to all remaining option-enum fields — `style`, `size`, `staticColor`, and any future
  component option with a declared `values` array.

  The rule is advisory (Warning) so datasets can absorb the new check incrementally.
  Tokens using option values not yet declared in `components/*.json` will emit warnings
  rather than errors. Promotion to Error is deferred until the option catalog stabilises.

  **Migration:** if your component declares `options.style.values` and your tokens
  reference `name.style`, ensure the style values in use appear in the declared `values`
  list. The warning message identifies the token, field, and undeclared value.

## 1.1.0

### Minor Changes

- [#936](https://github.com/adobe/spectrum-design-data/pull/936) [`d387252`](https://github.com/adobe/spectrum-design-data/commit/d3872520226ffe20fb8eda1e6bfc60f2fc4f3435) Thanks [@GarthDB](https://github.com/GarthDB)! - **Spec:** Lift manifest query notation from deferred to normative (RFC #715 / SPEC-039).

  `spec/manifest.md` previously instructed implementations to treat `include`/`exclude` entries as
  opaque identifiers. That clause is now removed: each entry MUST parse as a valid query expression
  per `spec/query.md` and MUST use only the supported query keys.

  New Layer 2 rule SPEC-039 (`manifest-query-parseable`) enforces this at validation time by calling
  the same parser used by the `query` and `diff --filter` CLI subcommands. Parse failures report the
  failing entry's instance path and the query parser's error message to guide migration.

  **Migration:** If your manifest uses non-query strings in `include`/`exclude`, update them to the
  query notation defined in `spec/query.md`. The SPEC-039 diagnostic reports the exact position and
  key that failed, so running `validate` against your manifest will surface any entries that need
  updating.

## 1.0.0

### Major Changes

- [#932](https://github.com/adobe/spectrum-design-data/pull/932) [`0f256ce`](https://github.com/adobe/spectrum-design-data/commit/0f256ce0d067c87503979676d09cb4de7e904321) Thanks [@GarthDB](https://github.com/GarthDB)! - **Breaking:** Replace `optionDescriptor.enum` + `deprecatedEnumValues` with a
  structured `values` array.

  Each entry in `values` is an `optionValue` object (`{ value, description?, lifecycle? }`),
  eliminating the key-drift hazard that existed when `deprecatedEnumValues` could reference
  values absent from `enum`.

  Migration: convert `"enum": ["a", "b"]` to
  `"values": [{"value": "a"}, {"value": "b"}]`. Any `deprecatedEnumValues` entries fold into
  the matching `values[].lifecycle` object.

  SDK rules updated: SPEC-019 (`component-variant-valid`) reads `values[].value` instead of
  `enum[]`; SPEC-037 (`sub-entity-deprecation-cascade`) reads `values[].lifecycle.deprecated`
  for the option-value cascade.

## 0.15.0

### Minor Changes

- [#930](https://github.com/adobe/spectrum-design-data/pull/930) [`4e8ad86`](https://github.com/adobe/spectrum-design-data/commit/4e8ad86998b0e168396badb8a2a12207ebf535ae) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-037 (`sub-entity-deprecation-cascade`) advisory rule: warn when a non-deprecated
  token references a deprecated anatomy part, deprecated component state, or deprecated
  option-enum value via its `name` object. Schemas extended to allow `lifecycle` on anatomy
  parts and states, and `deprecatedEnumValues` on option descriptors.

## 0.14.0

### Minor Changes

- [#928](https://github.com/adobe/spectrum-design-data/pull/928) [`1849738`](https://github.com/adobe/spectrum-design-data/commit/1849738b1a65d2656280aa7777d1169fcc3f036b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-036 (`component-deprecation-cascade`) advisory rule: warn when a
  non-deprecated token references a component declaration marked deprecated
  via `lifecycle.deprecated`. Closes the deprecation-cascade open question
  on rfc-coordination rows #735 / #832.

## 0.13.0

### Minor Changes

- [#924](https://github.com/adobe/spectrum-design-data/pull/924) [`20bb703`](https://github.com/adobe/spectrum-design-data/commit/20bb7035ad7d62513670bfb393b70766a295e51c) Thanks [@GarthDB](https://github.com/GarthDB)! - Expand canonical accessibility role vocabulary with `progressbar`, `meter`,
  `grid`, `listitem`, and `group` (issue #892, RFC-B Phase 7 follow-on).
  - `spec/accessibility.md` — 5 new rows added to the canonical role vocabulary
    table (21 total).
  - `spec/accessibility-adapters.md` — 5 new rows added to each platform mapping
    table (Web/ARIA, iOS, Android).
  - `components/meter.json` — `role: "meter"`, WCAG 4.1.2 added.
  - `components/progress-bar.json`, `progress-circle.json`,
    `in-field-progress-circle.json` — `role: "progressbar"`, WCAG 4.1.2 and
    4.1.3 added.
  - `components/table.json` — `role: "grid"` added.
  - `components/avatar-group.json`, `swatch-group.json`, `button-group.json` —
    `role: "group"` added.
  - `docs/rfc-coordination.md` — RFC-B open question for #892 marked resolved.

- [#924](https://github.com/adobe/spectrum-design-data/pull/924) [`20bb703`](https://github.com/adobe/spectrum-design-data/commit/20bb7035ad7d62513670bfb393b70766a295e51c) Thanks [@GarthDB](https://github.com/GarthDB)! - Close RFC #661 category validation gap: add SPEC-034 advisory rule and
  align the `data-visualization` category id across all surfaces.
  - `spec/registry.md` — marks the categories.json gap closed; SPEC-034
    is now the authoritative validator for `meta.category`.
  - `schemas/component.schema.json` — loosens `meta.category` from a
    hard-coded enum to a free-form string; SPEC-034 (warning-level) is
    the single source of validation.
  - `rules/rules.yaml` — adds SPEC-034
    (`component-category-registry-sync`, severity: warning).
  - `packages/design-system-registry/registry/categories.json` — removes
    the `"data visualization"` alias from `data-visualization`; kebab-case
    is the sole canonical form.
  - `components/table.json` — migrates `meta.category` from
    `"data visualization"` to `"data-visualization"`.
  - `docs/rfc-coordination.md` — RFC #661 open question marked resolved.
  - SDK: new `spec034.rs` rule + `categories()` accessor on `RegistryData`
    - codegen updated to embed `categories.json`.

- [#924](https://github.com/adobe/spectrum-design-data/pull/924) [`20bb703`](https://github.com/adobe/spectrum-design-data/commit/20bb7035ad7d62513670bfb393b70766a295e51c) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-035 (`anatomy-part-name-registry-sync`) advisory warning rule.

  Fires when a component anatomy part's `name` is not in the `anatomy-terms.json`
  registry from `@adobe/design-system-registry`. Sibling of SPEC-034
  (`component-category-registry-sync`) for the anatomy-terms vocabulary.
  - `rules/rules.yaml` — adds SPEC-035 (severity: warning, category: naming-consistency)
  - SDK: new `spec035.rs` rule using the existing `for_field("anatomy")` accessor on
    `RegistryData`
  - `spec/anatomy-format.md` — extends SPEC rules table; adds note pointing to registry as
    authoritative vocabulary
  - `spec/registry.md` — adds SPEC-035 to the "Validated by" line for `anatomy-terms.json`
  - `docs/rfc-coordination.md` — marks anatomy-part name registry-sync gap as resolved
  - Conformance fixtures: `conformance/valid/SPEC-035/` and `conformance/invalid/SPEC-035/`

## 0.12.0

### Minor Changes

- [#921](https://github.com/adobe/spectrum-design-data/pull/921) [`b98a17d`](https://github.com/adobe/spectrum-design-data/commit/b98a17dfeaff24bf1bc17d0705c1ff9ce734f7d7) Thanks [@GarthDB](https://github.com/GarthDB)! - Expand canonical accessibility role vocabulary with `progressbar`, `meter`,
  `grid`, `listitem`, and `group` (issue #892, RFC-B Phase 7 follow-on).
  - `spec/accessibility.md` — 5 new rows added to the canonical role vocabulary
    table (21 total).
  - `spec/accessibility-adapters.md` — 5 new rows added to each platform mapping
    table (Web/ARIA, iOS, Android).
  - `components/meter.json` — `role: "meter"`, WCAG 4.1.2 added.
  - `components/progress-bar.json`, `progress-circle.json`,
    `in-field-progress-circle.json` — `role: "progressbar"`, WCAG 4.1.2 and
    4.1.3 added.
  - `components/table.json` — `role: "grid"` added.
  - `components/avatar-group.json`, `swatch-group.json`, `button-group.json` —
    `role: "group"` added.
  - `docs/rfc-coordination.md` — RFC-B open question for #892 marked resolved.

- [#923](https://github.com/adobe/spectrum-design-data/pull/923) [`f3a0a6b`](https://github.com/adobe/spectrum-design-data/commit/f3a0a6b6bc03774e870aad989c16d9b532406aaf) Thanks [@GarthDB](https://github.com/GarthDB)! - Close RFC #661 category validation gap: add SPEC-034 advisory rule and
  align the `data-visualization` category id across all surfaces.
  - `spec/registry.md` — marks the categories.json gap closed; SPEC-034
    is now the authoritative validator for `meta.category`.
  - `schemas/component.schema.json` — loosens `meta.category` from a
    hard-coded enum to a free-form string; SPEC-034 (warning-level) is
    the single source of validation.
  - `rules/rules.yaml` — adds SPEC-034
    (`component-category-registry-sync`, severity: warning).
  - `packages/design-system-registry/registry/categories.json` — removes
    the `"data visualization"` alias from `data-visualization`; kebab-case
    is the sole canonical form.
  - `components/table.json` — migrates `meta.category` from
    `"data visualization"` to `"data-visualization"`.
  - `docs/rfc-coordination.md` — RFC #661 open question marked resolved.
  - SDK: new `spec034.rs` rule + `categories()` accessor on `RegistryData`
    - codegen updated to embed `categories.json`.

## 0.11.0

### Minor Changes

- [#918](https://github.com/adobe/spectrum-design-data/pull/918) [`e77379b`](https://github.com/adobe/spectrum-design-data/commit/e77379b24b3d66b09ce78b4cf20e2d15cefbe78b) Thanks [@GarthDB](https://github.com/GarthDB)! - docs(spec): add registry.md formalizing three-registry boundary and single-package strategy

## 0.10.0

### Minor Changes

- [#889](https://github.com/adobe/spectrum-design-data/pull/889) [`8726a99`](https://github.com/adobe/spectrum-design-data/commit/8726a991f01f08e57c3545e5bb9274fab12f96b0) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): accessibility.schema.json + component schema wiring (Phase 7.3)

- [#890](https://github.com/adobe/spectrum-design-data/pull/890) [`0650e39`](https://github.com/adobe/spectrum-design-data/commit/0650e39335edebfbefbadf7c39fb1cc399fa211e) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): SPEC-030/031 accessibility validation rules (Phase 7.4)

- [#891](https://github.com/adobe/spectrum-design-data/pull/891) [`9932351`](https://github.com/adobe/spectrum-design-data/commit/99323513890abb3ddad93f1394c756bf56526f27) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): add accessibility declarations to all foundation components (Phase 7)

## 0.9.0

### Minor Changes

- [#886](https://github.com/adobe/spectrum-design-data/pull/886) [`0710522`](https://github.com/adobe/spectrum-design-data/commit/071052225694d1442a3bdc8094f2a67f9a24277f) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): accessibility vocabulary for component declarations (Phase 7.1)

## 0.8.0

### Minor Changes

- [#877](https://github.com/adobe/spectrum-design-data/pull/877) [`d0297f0`](https://github.com/adobe/spectrum-design-data/commit/d0297f0042404a4e6381009ce80849c781f8db49) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): document blocks — typed prose for tokens, components, and anatomy (Phase 9)

## 0.7.0

### Minor Changes

- [#863](https://github.com/adobe/spectrum-design-data/pull/863) [`0e30511`](https://github.com/adobe/spectrum-design-data/commit/0e30511ec5ce916b76b97d116459a6421f0ddd4e) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 8.x: product context document
  - New spec chapter `spec/product-context.md` — defines the Layer 3 product context document:
    rationale, overrides, extensions, and agent capture behavior.
  - New schema `schemas/product-context.schema.json` — validates product-context.json documents.
  - `spec/cascade.md` — note on product context in the layers table.
  - `spec/manifest.md` — cross-reference to product context.
  - `spec/agent-surface.md` — add `write_token` and `write_component` to tool catalog (RECOMMENDED);
    note on rationale capture behavior.
  - `spec/index.md` — add product context to normative references.
  - `design-data write` CLI subcommand — creates or updates a product-context.json file; accepts
    `--output` (path) and `--rationale` (text) flags.

### Patch Changes

- [#863](https://github.com/adobe/spectrum-design-data/pull/863) [`0e30511`](https://github.com/adobe/spectrum-design-data/commit/0e30511ec5ce916b76b97d116459a6421f0ddd4e) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 1.x: add optional `rationale` string field to token schema
  - `schemas/token.schema.json`: add `rationale` to both `tokenWithValue` and `tokenWithRef`
    properties. Field is OPTIONAL; no validation rules.
  - `spec/token-format.md`: add `rationale` row to the lifecycle and metadata table.

## 0.6.0

### Minor Changes

- [#860](https://github.com/adobe/spectrum-design-data/pull/860) [`fd06340`](https://github.com/adobe/spectrum-design-data/commit/fd063404ebef790f37887611572a8ae1e49dc053) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 6.7: token binding declarations
  - Add optional `tokenBindings` array to component declarations (`component.schema.json`): lists
    tokens a component uses, including foundation/structure tokens not scoped to the component in
    their name-object. Each entry has a required `token` (name string) and optional `context` (Figma
    Group label).
  - Add optional `componentBindings` array to token declarations (`token.schema.json`): reverse index
    of `tokenBindings`; informative and derivable from component files.
  - Add SPEC-027 (`token-binding-token-exists`): each `tokenBindings[].token` MUST match a declared
    token name in the dataset.
  - Add conformance fixtures for SPEC-027 (`conformance/invalid/SPEC-027/`,
    `conformance/valid/token-bindings.json`).
  - Extend `spec/component-format.md` with Token bindings section and updated SPEC rules table.
  - Add `componentBindings` section to `spec/token-format.md`.
  - Update `describe_component` return shape in `spec/agent-surface.md` to include `tokenBindings`.
  - Seed `tokenBindings` on 58 component files from spec-snoop Figma extraction data.

## 0.5.0

### Minor Changes

- [#858](https://github.com/adobe/spectrum-design-data/pull/858) [`38127f5`](https://github.com/adobe/spectrum-design-data/commit/38127f556435783f31ab54c11d1ec6c93da17813) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 6.7: token binding declarations
  - Add optional `tokenBindings` array to component declarations (`component.schema.json`): lists
    tokens a component uses, including foundation/structure tokens not scoped to the component in
    their name-object. Each entry has a required `token` (name string) and optional `context` (Figma
    Group label).
  - Add optional `componentBindings` array to token declarations (`token.schema.json`): reverse index
    of `tokenBindings`; informative and derivable from component files.
  - Add SPEC-027 (`token-binding-token-exists`): each `tokenBindings[].token` MUST match a declared
    token name in the dataset.
  - Add conformance fixtures for SPEC-027 (`conformance/invalid/SPEC-027/`,
    `conformance/valid/token-bindings.json`).
  - Extend `spec/component-format.md` with Token bindings section and updated SPEC rules table.
  - Add `componentBindings` section to `spec/token-format.md`.
  - Update `describe_component` return shape in `spec/agent-surface.md` to include `tokenBindings`.
  - Seed `tokenBindings` on 58 component files from spec-snoop Figma extraction data.

## 0.4.0

### Minor Changes

- [#855](https://github.com/adobe/spectrum-design-data/pull/855) [`c9002db`](https://github.com/adobe/spectrum-design-data/commit/c9002db2da1d1bb40446b4991648dc7809a55f33) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(component-schemas): migrate source of truth to design-data-spec components

  `@adobe/spectrum-component-api-schemas` is now a thin adapter over
  `@adobe/design-data-spec/components/`. All 80 component declarations have been
  converted to the new format and live in `packages/design-data-spec/components/`.

  The API surface is unchanged: `getAllSchemas()`, `getAllSlugs()`,
  `getSchemaBySlug()`, `getSchemaFile()`, and `schemaFileNames` all behave
  identically. Returned objects now include new fields (`name`, `displayName`,
  `options`, `states`, `lifecycle`) alongside the existing aliases (`title`,
  `properties`, `slug`) — no consumer breakage.

  `@adobe/design-data-spec` minor: 79 component declarations added to
  `components/`. `optionDescriptor` in `component.schema.json` now allows
  additional JSON Schema keywords (`pattern`, `minimum`, `items`, etc.)
  to accommodate real-world component option descriptors.

## 0.3.0

### Minor Changes

- [#853](https://github.com/adobe/spectrum-design-data/pull/853) [`e4b9656`](https://github.com/adobe/spectrum-design-data/commit/e4b9656bead7b9513c9df42f30ff32b8a70d4568) Thanks [@GarthDB](https://github.com/GarthDB)! - Add Layer 2 cross-reference validator implementing SPEC-018–024, conformance fixtures,
  and a reference button component declaration. Export new component, anatomy-part, and
  state-declaration schemas from the package.

## 0.2.0

### Minor Changes

- [#837](https://github.com/adobe/spectrum-design-data/pull/837) [`29531ee`](https://github.com/adobe/spectrum-design-data/commit/29531ee2a9935922bab329c26edce1de8489a423) Thanks [@GarthDB](https://github.com/GarthDB)! - Add composite token support (Proposal 010). Introduces a `$valueType` field for
  declaring a token's value-type schema. Defines three composite value-type schemas
  (`typography`, `drop-shadow`, `typography-scale`) under `schemas/value-types/`.
  Adds inline alias reference rules and three new validation rules (SPEC-014,
  SPEC-015, SPEC-016). No breaking changes — `$valueType` is optional.

- [#837](https://github.com/adobe/spectrum-design-data/pull/837) [`29531ee`](https://github.com/adobe/spectrum-design-data/commit/29531ee2a9935922bab329c26edce1de8489a423) Thanks [@GarthDB](https://github.com/GarthDB)! - Add string-name escape hatch (Proposal 011). Allows a token's `name` to be
  a plain string when the structured taxonomy cannot express it. String-named
  tokens are schema-valid but trigger SPEC-017 (severity: warning,
  category: tech-debt), making tech debt visible and trackable. No breaking
  changes — all existing name-object tokens are unaffected.

## 0.1.1

### Patch Changes

- [#824](https://github.com/adobe/spectrum-design-data/pull/824) [`7ee19ea`](https://github.com/adobe/spectrum-design-data/commit/7ee19eae92051564f605497bd4ac4bf9a6f259fe) Thanks [@GarthDB](https://github.com/GarthDB)! - Reconcile spec with RFC discussion family.
  - Add `lastModified` lifecycle field on tokens (originally proposed in RFC #623,
    missed during initial implementation). Records the spec version when a token's
    value or non-formatting metadata last changed. Validated by new rule
    `SPEC-014: lastModified MUST NOT precede introduced`.
  - Clarify in `manifest.md` that the query notation defined in `spec/query.md` is
    normative for programmatic use; manifest `include`/`exclude` adoption is
    deferred to a post-`1.0.0-draft` revision.
  - Add a worked `card`-as-`structure`-vs-`component` example to `taxonomy.md` to
    disambiguate scope decisions.
  - Replace open-ended "additional taxonomies will be defined" sentence with a
    pointer to the open RFC discussion (#806 Q3).
  - Update legacy-format mapping table in `evolution.md` to note `lastModified`
    has no legacy equivalent.

  All changes are additive or clarifying; no token data or existing rule semantics
  change.

## 0.1.0

### Minor Changes

- [#810](https://github.com/adobe/spectrum-design-data/pull/810) [`4a55a5f`](https://github.com/adobe/spectrum-design-data/commit/4a55a5f2b027d7df73852cb62dd633bd5da17c93) Thanks [@GarthDB](https://github.com/GarthDB)! - Add taxonomy registries and expand token name object schema.
  - Split `anatomy-terms.json`: removed styling surfaces and positional terms
  - Added `token-objects.json` (background, border, edge, visual, content)
  - Added 6 new taxonomy registries:
    structures, substructures, orientations, positions, densities, shapes
  - Exported all 7 new registries from package index
  - Added all 13 semantic fields explicitly to `nameObject` in
    `token.schema.json`, distinguishing semantic from dimension fields

## 0.0.1

### Patch Changes

- [#738](https://github.com/adobe/spectrum-design-data/pull/738) [`880b365`](https://github.com/adobe/spectrum-design-data/commit/880b3650c297612b25d1b9ee1a01aa49abbacdd7) Thanks [@GarthDB](https://github.com/GarthDB)! - Add draft Design Data Specification prose (`1.0.0-draft`), v0 JSON Schemas,
  validation rule catalog (SPEC-001–SPEC-006), and conformance fixtures.
