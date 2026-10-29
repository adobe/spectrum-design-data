---
name: component-catalog
description: Choose the right UI component in spectrum-studio before writing any view, panel, field, or dialog. Lists the project's own components under src/components and says when to use them instead of plain React Spectrum S2 components (Picker, NumberField, TextField, Slider, ComboBox, ProgressCircle, ToastQueue). Use whenever adding or editing UI, form controls, previews, cards, loading states, toasts, mode controls, color pickers, or editors.
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

| Need | Use | Not |
| --- | --- | --- |
| Select field | `components/fields/Picker` | raw S2 `Picker` (a layout wrapper: default `labelPosition="side"`) |
| Number field | `components/fields/NumberField` | raw S2 `NumberField` |
| A field that becomes read-only text outside edit mode | `components/editable`: `EditablePicker` (needs `displayValue`), `EditableNumberField`, `EditableTextField`, `EditableSlider`. All accept `isReadOnly` to override the edit-mode atom | raw `TextField`, `Slider`, `Picker` plus a hand-written edit-mode branch |
| Hide authoring buttons outside edit mode | `<EditOnly>`; `useIsReadOnly(override?)` | `if (editMode)` checks inside views |
| Pick a token or preset by name or value | `fields/TokenComboBox` (`options`, `selectedKey`, `displayMode` tokens or values, `isMixed`); `fields/DividableComboBox` for shared versus individual values | raw S2 `ComboBox` |
| Pick an icon | `fields/IconSamplePicker` | a Picker of icon names |
| Show a token or value preview | `value-preview/ValuePreview` (`preview` descriptor, `label`, `large`, `icon`) | hand-drawn swatches. `TextValuePreview` and `IconValuePreview` are internal |
| Show a token name | `tokens/TokenNameTag` | `Tag` or plain `Text` |
| Card or bento layout | `BentoGrid` with `BentoCard` (`colSpan` 1-4, `rowSpan` 1-2); foundation cards use `foundationCardStyles` | custom grid divs |
| Code display | `CodeBlock` (`code`, `language`) | `<pre>` |
| Loading spinner | `LoadingIndicator` (`size` L or M) | raw `ProgressCircle` |
| Async or derived content that may be pending or unavailable | `DerivedContentBoundary` (`state` pending, ready, or unavailable; `label`; `presentation` overlay or skeleton; `onRetry`) | ad hoc spinners or empty states |
| Deletion feedback with undo | `useDeletionToast().notifyDeleted(label, onUndo)` | `ToastQueue.negative("... deleted")` |
| Mode selection and editing | `ModesPicker`, `ModeSetControl`, `ModeSetCard`, `ModeSetEditorDialog`, `ModeCapabilityChoices`, `ModeOverridesTable`, `AdaptiveControlsMenu`, `ModeParameterControl` (switches Slider, Picker, or ColorSlider by parameter type) | a bespoke Picker |
| Color picking | `color-picker/ColorPickerContents` (`color`, `onChange`, `showGamutPicker`), `ColorScalePicker`, `GradientStopControl`. Building blocks: `ColorArea`, `ColorSlider`, `ColorCanvas`, `ColorHandle`, `ColorLoupe` | S2 `ColorArea` or `ColorSlider` |
| Palette colors | `palette/PaletteColorRow`, `palette/PaletteSwatchPicker` | custom swatch lists |
| Rule and interpolation editing | `logic/RuleEditorDialog`, `InterpolationEditorDialog` (`trigger`, `title`, `createDraft`, `onSave`, `onDelete`), `ConditionList`, `ParameterListEditor`, `RoundingRulePicker`, `RoundingRuleEditor`; cards `RuleCard`, `InterpolationCard`, `ScaleTypeCard`; visuals `ScaleSparkline`, `ScaleTypeGraph`, `MathFormula` (`latex` plus `fallback`), `UsedByTags` | |
| Panels and tabs | `Panel`, `SubPanel`, `SubPanelTabs`, `NestedPanelAccordion`, `ScaleEditor` | S2 `Tabs` or `Accordion` directly |
| Proportion bar | `StackedBar` | |
| Preview toolbar, edit-mode actions | `PreviewToolbar` (`placement` overlay or header), `EditModeActions` | |

Reusable pieces that live outside `components/` (reuse them, do not copy):
`views/FoundationsElementsHeader.tsx`, `views/system-health/shared.tsx`,
`views/color-system/ScaleColorPreview.tsx`, `views/color-system/ContrastRamp.tsx`,
`panels/registry/SourceNameEditor.tsx`, `panels/foundations/DimensionFoundationPanel.tsx`,
`panels/components/ComponentsPanel.tsx`.

## Existing inconsistencies (not precedent)

Raw S2 components are still used where a wrapper exists, in about 15 files for
`Picker`, 7 for `NumberField`, 14 for `TextField` (only one file uses
`EditableTextField`), 5 for `Slider`, 2 for `ComboBox`, and 6 for
`ProgressCircle`. Some are deliberate non-edit view controls (for example
`views/color-system/ColorEvaluation.tsx`). Do not copy those uses into new code,
and do not refactor them unless asked. `views/SampleApp.tsx` is a sample app and
may use raw S2.

Raw `ToastQueue.negative` is used for error messages in
`panels/structures/StructureCard.tsx`, `StructureEditorPanel.tsx`, and
`App.tsx`. The project has no wrapper for error toasts, so matching that is
acceptable. Deletion toasts must use `useDeletionToast`.

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
