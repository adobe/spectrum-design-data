---
name: component-catalog
description: Choose the right UI component in spectrum-studio before writing any view, panel, field, or dialog. Lists the project's own components under src/components and says when to use them instead of plain React Spectrum S2 components (Picker, NumberField, TextField, Slider, ComboBox, ProgressCircle, ToastQueue). Use whenever adding or editing UI, form controls, previews, cards, loading states, toasts, delete confirmations, mode controls, color pickers, or editors.
---

# Component catalog

Before using a React Spectrum S2 component, check this list. If a project
component fits, use it. If nothing fits, **ask the user** before creating a new
component, and ask whether they want a Storybook story (see
`.agents/rules/storybook-stories.mdc`). Do not invent UI that was not requested
(AGENTS.md, Working rule 1).

Counts are importing files at the time of writing. Prefer the most-used
component when two overlap.

## Need to use / not to use

| Need                                                                             | Use                                                                                                                                                                                                                                                                                                                                                                            | Not                                                                                                          |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Select field                                                                     | `components/fields/Picker`                                                                                                                                                                                                                                                                                                                                                     | raw S2 `Picker` (a layout wrapper: default `labelPosition="side"`)                                           |
| Number field                                                                     | `components/fields/NumberField`                                                                                                                                                                                                                                                                                                                                                | raw S2 `NumberField`                                                                                         |
| A field that becomes read-only text outside edit mode                            | `components/editable`: `EditablePicker` (needs `displayValue`), `EditableNumberField`, `EditableTextField`, `EditableSlider`. All accept `isReadOnly` to override the edit-mode atom                                                                                                                                                                                           | raw `TextField`, `Slider`, `Picker` plus a hand-written edit-mode branch                                     |
| A slider that saves authored data                                                | `EditableSlider`, or `DraftSlider` / `DraftLightnessSlider` (0–1 lightness) from `components/editable` when it is always editable. They move locally while dragging and save once on release, on each keyboard step, or on an assistive-technology change                                                                                                                      | raw S2 `Slider` or `ColorSlider` that saves on every movement                                                |
| Hide authoring buttons outside edit mode                                         | `<EditOnly>`; `useIsReadOnly(override?)`                                                                                                                                                                                                                                                                                                                                       | `if (editMode)` checks inside views                                                                          |
| Search tokens by name or value, select a token/preset, or type a custom value    | `fields/TokenComboBox` (`options`, `selectedKey`, `customValue`, `normalizeValue`, `displayMode`, `isMixed`); `fields/DividableComboBox` for shared versus individual values                                                                                                                                                                                                   | raw S2 `ComboBox`, a Manual/Custom menu sentinel, a companion input, or page-owned keyboard/acceptance logic |
| Pick an icon                                                                     | `fields/IconSamplePicker`                                                                                                                                                                                                                                                                                                                                                      | a Picker of icon names                                                                                       |
| Show a predefined category icon                                                  | `CategoryIcon` (`category` key), or `getCategoryIcon` when a component type is needed; mappings live in `src/data/category-icons.json`                                                                                                                                                                                                                                         | direct icon imports or local category-to-icon maps                                                           |
| Toggle a Boolean group's And/Or operator                                         | `logic/LogicButton` (`value`, `onChange`, `isDisabled`, `isReadOnly`): compact blue And / fuchsia Or; click, Space, or Enter toggles, read-only renders a badge                                                                                                                                                                                                                | a Picker or custom badge-button                                                                              |
| Select supported token value types for a rule                                    | `logic/RuleApplicabilityField` (`rule`, `onChange`, `isReadOnly`): wrapping icon-bearing tags, exclusive All, visible empty-selection error; labels/icons and capabilities come from `features/logic/applicability.ts`                                                                                                                                                         | local family checkboxes, parsing token names, or treating every Typography metric as Font size               |
| Show a token or value preview                                                    | `value-preview/ValuePreview` (`preview` descriptor, `label`, `large`, `icon`; `fillSurface` for full-area opacity with foreground children; `opacitySurface` for dialog-local authored modes, otherwise uses the authored global surface)                                                                                                                                      | hand-drawn swatches. `TextValuePreview` and `IconValuePreview` are internal                                  |
| Show a list row with a preview, name and actions                                 | `PreviewListItem` (`preview`, `label`, optional `actions`, `inset`)                                                                                                                                                                                                                                                                                                            | panel-specific copies of row layout or spacing                                                               |
| Compare two versions of a value by eye (from → to, app vs design data)           | Two touching halves with no gap or border; follow `.agents/rules/side-by-side-comparison.mdc` (reference: `AdjacentComparison` in `views/analysis/ColorOpacityTable.tsx`)                                                                                                                                                                                                      | two separate `ValuePreview`s with a gap, or text values alone                                                |
| Theme-aware transparency preview                                                 | `PreviewSurfaceProvider` inside the S2 Provider; `transparencyBackground` / `transparencyRampBackground`; `checkerboardSurfaceStyle` for explicit local surfaces (see `color-management`)                                                                                                                                                                                      | hardcoded checkerboard colors or per-cell background observers                                               |
| Show a token name                                                                | `tokens/TokenNameTag`                                                                                                                                                                                                                                                                                                                                                          | `Tag` or plain `Text`                                                                                        |
| Filter a token table by foundational type                                        | `tokens/TokenTypeFilters` (`value`, `onChange`): controlled single selection with All; labels and icons come from `tokenPanelRegistry`                                                                                                                                                                                                                                         | local category toggle groups or duplicated label/icon maps                                                   |
| Create a new token                                                               | `panels/tokens/AddTokenDialog` (`onCreated`, optional `initialAnswers`) inside a `DialogContainer`; questions, names and drafts come from `features/tokens/creationFlow.ts` and `createNewTokenAtom`                                                                                                                                                                           | a bespoke form or writing `browserTokenEditsAtom` directly                                                   |
| Apply Design Data values to selected token/mode instances                        | `views/analysis/ReferenceOverrideDialog` (`count`, `onApply`, `onClose`) inside a `DialogContainer`; one opt-in checkbox, gated Apply, and recoverable errors                                                                                                                                                                                                                  | a second bulk-edit form, global-mode writes, or automatic Save                                               |
| Card or bento layout                                                             | `BentoGrid` with `BentoCard` (`colSpan` 1-4, `rowSpan` 1-2); foundation cards use `foundationCardStyles`                                                                                                                                                                                                                                                                       | custom grid divs                                                                                             |
| Code display                                                                     | `CodeBlock` (`code`, `language`)                                                                                                                                                                                                                                                                                                                                               | `<pre>`                                                                                                      |
| Loading spinner                                                                  | `LoadingIndicator` (`size` L or M)                                                                                                                                                                                                                                                                                                                                             | raw `ProgressCircle`                                                                                         |
| Async or derived content that may be pending or unavailable                      | `DerivedContentBoundary` (`state` pending, ready, or unavailable; `label`; `presentation` overlay or skeleton; `onRetry`)                                                                                                                                                                                                                                                      | ad hoc spinners or empty states                                                                              |
| Any toast or delete confirmation (adds, deletes with Undo, errors, copied, info) | `useNotify()` from `components/notifications/notificationContext` (see the `notifications` skill)                                                                                                                                                                                                                                                                              | `ToastQueue`, `ToastContainer`, or a hand-built delete `AlertDialog`                                         |
| Mode selection and editing                                                       | `ModeSetPicker` (controlled, local selection; exported from `ModeSetControl`), `ModeSetControl` (app-wide selection), `ModesPicker` (compact combined menu), `ModeSetCard`, `ModeSetEditorDialog`, `ModeCapabilityChoices`, `ModeOverridesTable`, `AdaptiveControlsMenu`, `ModeParameterControl` (switches `DraftSlider`, Picker, or `DraftLightnessSlider` by parameter type) | a bespoke Picker or duplicated mode controls                                                                 |
| Color picking                                                                    | `color-picker/ColorPickerContents` (`color`, `onChange`, `showGamutPicker`), `ColorScalePicker`, `GradientStopControl`. Building blocks: `ColorArea`, `ColorSlider`, `ColorCanvas`, `ColorHandle`, `ColorLoupe`                                                                                                                                                                | S2 `ColorArea` or `ColorSlider`                                                                              |
| Palette colors                                                                   | `palette/PaletteColorRow`, `palette/PaletteSwatchPicker`                                                                                                                                                                                                                                                                                                                       | custom swatch lists                                                                                          |
| Rule and interpolation editing                                                   | `logic/RuleEditorDialog`, `InterpolationEditorDialog` (`trigger`, `title`, `createDraft`, `onSave`, `onDelete`), `ConditionList`, `ParameterListEditor`, `RoundingRulePicker`, `RoundingRuleEditor`; cards `RuleCard`, `InterpolationCard`, `ScaleTypeCard`; visuals `ScaleSparkline`, `ScaleTypeGraph`, `MathFormula` (`latex` plus `fallback`), `UsedByTags`                 |                                                                                                              |
| Panels and tabs                                                                  | `Panel`, `SubPanel`, `SubPanelTabs`, `NestedPanelAccordion`, `ScaleEditor`                                                                                                                                                                                                                                                                                                     | S2 `Tabs` or `Accordion` directly                                                                            |
| Proportion bar                                                                   | `StackedBar`                                                                                                                                                                                                                                                                                                                                                                   |                                                                                                              |
| Preview toolbar, edit-mode actions                                               | `PreviewToolbar` (`placement` overlay or header; `showAdaptiveControls` defaults to true), `EditModeActions`                                                                                                                                                                                                                                                                   |                                                                                                              |
| Online, offline, or update-available status (installed app)                      | `AppStatusButton` (in `TopBar`); state comes from `useAppStatus()` in `features/app-status/`                                                                                                                                                                                                                                                                                   | reading `navigator.onLine` or registering the service worker in components                                   |

`PreviewListItem` owns the shared grid spans and preview/name/action layout.
Styles and Structures pass `inset` for 8 px padding and use the `previewList`
class on their S2 `ListView` to share divider styling. Keep row padding and
divider styling in `PreviewListItem.tsx` and `PreviewListItem.css`, not in
individual panels. `inset` defaults to false so unpadded consumers such as
`ScaleEditor` retain their existing spacing.

`ModeSetPicker` owns the shared per-set presentation: two modes use a segmented
control, and larger sets use a picker. Option icons appear only when every mode
has a distinct icon and the set has no icon of its own; repeated or missing icons
use text labels. Use this component for dialog-local selection rather than
changing app-wide mode state. `ModeSetControl` connects the same presentation to
app-wide selection. Keep adaptive controls optional and separate from named-mode
selection.

`ReferenceOverrideDialog` presents the confirmation, not the authoring write.
Use `features/design-data/referenceOverrides.ts` for eligibility, exact mode
targets, stale-source checks, and an atomic validated batch. The connected
`views/analysis/AnalysisTokens.tsx` supplies that action and switches the
comparison source to Working authoring after Apply without saving. Keep the
dialog's button-based layout; `isDismissible` hides its Apply/Cancel action group.
See `views/analysis/ReferenceOverrideDialog.stories.tsx` for confirmation and
error states, and `ColorOpacityTable.stories.tsx` for type filters and selection.

Generator options use `panels/logic/TshirtSizingRuleEditor` (the retained module
name is a compatibility detail). Name/offset fields stay visible; exactly one
default is protected at zero. Pass `GeneratorEdit` separately from the rule so
Registry additions, shared renames and used-option replacements remain local
until `saveGeneratorDraftAtom` validates the complete proposal. Do not substitute
the conditional builder: Generator options are named outputs, not predicates.
Rounding uses `ConditionList` sentence rows and its row-editing callback to gate
the dialog's main Save. `RoundingRulePicker` accepts `valueType` or `valueTypes`
and retains a selected inactive binding rather than silently replacing it.

## Token entry contract

`TokenComboBox` already owns token-name/value search, list selection, direct
custom entry, matching, acceptance, cancellation and keyboard clearing. These
are standard uses, not missing features requiring a new control or local
editing mode. Configure the shared component; if a reusable capability is
missing, add it there with a focused test before migrating callers.

- Provide eligible `options` with stable IDs. `isOptionAllowed` adds domain
  restrictions and retains an incompatible current selection with diagnostics.
  Tokens show `TokenNameTag` at rest; presets and accepted custom values show
  normal Spectrum input text. `displayMode="values"` changes presentation,
  never reference identity.
- Supply `customValue` whenever the domain accepts literals, even when a token
  is currently selected. Its `onAccept` parses and validates through the existing
  domain owner, then writes a literal instead of a reference. Omit it only for
  identity-dependent operations such as replacement targets, existing Registry
  terms, and offset previews that require a source token.
- Enter or leaving the field accepts changed input. A unique exact name, then
  a unique exact value, selects the eligible option. `normalizeValue` can use
  existing unit-aware domain semantics for value equality. Use an option's
  `matchValue` for its raw value when `displayValue` adds context labels.
  Partial queries only filter suggestions; duplicate values never select an arbitrary token.
  The existing custom-value menu action explicitly keeps a literal, even if it
  equals a token value. Unchanged focus/blur never relinks an accepted literal.
- Escape cancels the draft. Invalid input stays visible with an error and does
  not write. Selecting a list item must not also commit the blur draft.
  Accepting a field inside a form does not Apply or Save the form.
- Delete/Backspace removes a selected token from the focused entry. Optional
  fields use the same null callback as Clear. Required fields allow an empty
  replacement draft, show an error, and retain valid authored data until a
  replacement is accepted; never substitute a default.
- `inline` changes presentation only. `customValue.inputType="number"` changes
  the custom suggestion label, not valid ranges or token-name search. Numeric
  bounds, units, duplicate-index rules and literal/reference writes belong to
  the domain. Do not hard-code positive-only input into the shared field.
- `DividableComboBox` forwards per-field custom entry, validation and required
  state. Use `onSharedCustomValue` for one atomic shared write. Mixed state
  compares reference identities or accepted literal values, not just null keys.

For example, shadow opacity uses one field with opacity token options,
`selectedKey={layer.opacityTokenId ?? null}`, and `customValue` that parses
`3` or `3%` as three percent and stores `manualOpacity: 0.03`. It must not add
a “Manual percentage” option that reveals a NumberField. A scale-index field
uses the same component with `parseScaleIndex` and duplicate-index validation;
its positive-only rule must not affect opacity's valid 0%.

Keep genuine domain tools: a graphical color picker, a structured shadow
editor, or a scale-source selector edits more than a scalar token/literal
choice. Do not copy their domain state into `TokenComboBox`. Static data-vis
colors use shared token/custom entry; adaptive scale-source selection retains
its relationship semantics.

Checks: `pnpm test:token-combobox`, the TokenComboBox/DividableComboBox stories
in `tests/e2e/storybook-structures.spec.ts`, and affected application specs.
Run browser checks only when needed, after the feature is complete. Use isolated
stories for basic interactions. App-page browser checks require explicit user
permission and a reason an isolated story cannot cover the behavior; follow
`verify-change`.

For a mode-set menu entry, use `modeSetGroupIconId` from
`features/modes/controlPresentation.ts`, then render through `MODE_ICONS` from
`features/modes/icons.ts`. It prefers the configured group icon, then the default
mode's icon only when `modeSetUsesOptionIcons` permits distinct option icons.
If it returns `"none"`, use `<CategoryIcon category="modes" />`. This keeps menu
icons tied to authored data, not temporary mode selection.

The conditional builder's Add condition menu uses `CategoryIcon` with `"modes"`
and `"tokens"` for the source labels. Token-category submenu entries are text-only:
repeating the same token icon adds no distinction. Use S2 `Text` for labels beside
icons; do not create a second icon registry.

Reusable pieces that live outside `components/` (reuse them, do not copy):
`views/FoundationsElementsHeader.tsx`, `views/system-health/shared.tsx`,
`views/color-system/ScaleColorPreview.tsx`, `views/color-system/ContrastRamp.tsx`,
`panels/registry/SourceNameEditor.tsx`, `panels/foundations/DimensionFoundationPanel.tsx`,
`panels/components/ComponentsPanel.tsx`.

## Existing inconsistencies (not precedent)

Raw S2 components are still used where a wrapper exists, in about 15 files for
`Picker`, 7 for `NumberField`, 14 for `TextField` (only one file uses
`EditableTextField`), 3 for `Slider`, 2 for `ComboBox`, and 6 for
`ProgressCircle`. Some are deliberate non-edit view controls (for example
`views/color-system/ColorEvaluation.tsx`). Do not copy those uses into new code,
and do not refactor them unless asked. `views/SampleApp.tsx` is a sample app and
may use raw S2.

Every toast goes through `useNotify()`. Only
`components/notifications/NotificationProvider.tsx` may import `ToastQueue` or
`ToastContainer`; ESLint and `pnpm test:notifications` enforce this.

## Styling convention

- Static layout and spacing: the S2 `style()` macro
  (`import { style } from "@react-spectrum/s2/style" with { type: "macro" }`),
  applied through `className`. Use S2 tokens such as `"layer-1"`, `"lg"`,
  `font: "ui"`. 148 of 257 `.tsx` files do this.
- CSS files: only for what the macro cannot express (grid spans in
  `BentoCard.css`, the color picker, `TokenComboBox.css`, `ValuePreview.css`).
  Keep a view's CSS beside the view.
- Inline `style={{ }}`: only for runtime-computed values (a swatch's
  `backgroundColor`, sizes, positions).
- Sentence case for all text. Follow `.agents/rules/s2-general.mdc`.

## Stories

Most components in `components/` have a `*.stories.tsx`. Read the story for
usage before using a component. These have none: `fields/Picker`,
`fields/NumberField`, `editable/*`, `BentoCard`, `LoadingIndicator`,
`ModeSetControl`, `ModeSetCard`, `SubPanelTabs`, `StackedBar`.
Do not add a story without the user's approval.

## Keeping this list current

When a component is added, renamed, or replaced, include the catalog update in
the Rule suggestions block (AGENTS.md, Working rule 4). Do not edit this file
without approval.
