# Contrast polarity compensation

## Model

Contrasts retain their existing internal reference polarity. The authoring interface no longer exposes a "Contrasts authored for" picker. Shared contrast steps are editable only in the default Color context, with no temporary Color preview. Shared-list scales retain that behavior. Optional scale-owned steps, described below, permit main-ratio overrides in Contrast modes. Typography-only selections do not restrict Color editing.

**Polarity compensation** (0–100%), under Color's **System settings**, adds up to 12 CIE L\* points to each contrast's lightness difference from black. The boost ramps in from 1:1 over about 3 L\* (`1 − e^(−L/3)`) so the lowest steps spread apart, holds a constant offset through the mid range, and rolls off toward 21:1 (`1 − (L/100)²`). Order is preserved. At 100%, 1.06 → 1.22, 1.15 → 1.48 and 2.6 → 3.85. Existing contrasts authored for dark backgrounds use the exact inverse.

The effective value at any background is a log-scale blend between the authored value (weight 0) and the opposite value (weight 1). The weight is the background's L\* distance from the authored extreme. Existing `oppositeValue` data and polarity-routing math remain compatible; this interface update does not change the schema or generation formulas.

Implementation: `src/features/color-system/polarity.ts`, applied as a pre-pass in `resolveColorDocument`.

## Overall contrast

**Overall contrast** (0–300%) scales every contrast after polarity compensation, using Spectrum studio's formula: `(c − 1) × m + 1`, capped at 21:1. 1:1 stays fixed, so at 200% 1.06 → 1.12 and 4.5 → 8. It also applies to surface contrasts. Contrast slider edits divide the multiplier back out before polarity routing.

It's a mode parameter. The default Contrast mode set uses 100% for Regular and 200% for High; existing saved mode sets gain it once, in the v3 migration.

## CSS output decision

The CSS library emits **precomputed values per color scheme mode**:

```css
:root { --bg: …; --contrast-100: 1.06; --surface-contrast-raised: 1.100; }
[data-color-scheme="dark"] { --bg: …; --contrast-100: 1.12; --surface-contrast-raised: 1.180; }
```

`:root` holds the default mode; other modes override only background and contrast variables. All tint math stays shared.

Contrast variables are emitted **before** the overall contrast multiplier, which is applied at paint time:

```css
:root { --contrast-multiplier: 1; }
[data-contrast="regular"] { --contrast-multiplier: 1; }
[data-contrast="high"] { --contrast-multiplier: 2; }
@media (prefers-contrast: more) { :root:not([data-contrast]) { --contrast-multiplier: 2; } }
.color-scale-blue.color-contrast-100 { --_c: min(21, calc((var(--contrast-100) - 1) * var(--contrast-multiplier) + 1)); }
```

An explicit `data-contrast` attribute always wins over the OS preference.

Why: explicit opposite values are designer decisions, not formula output. Precomputed values represent them exactly and keep the CSS readable.

## Optional custom steps per scale

In Foundations > Colors > Color scales, open a scale and choose **Use custom
contrast steps**. This copies the shared authored ratios and opposite values,
not preview or multiplied values. Other scales still use the shared list.
Choose a **Base swatch** and a **Naming rule** from Logic. The standard rule with
three swatches below its 100 base and nine above gives
25, 50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000.
Select another base before removing the current base swatch.

Logic's Scale naming rules define a positive base label, above-base increment,
and automatic clean or fixed below-base increments. Invalid, duplicate,
non-increasing or nonpositive labels are rejected, including when editing a
rule already used by a scale. Referenced rules cannot be deleted. Shared
colors and other foundations do not adopt these rules.

Shipped defaults start with a separate **Gray** scale: one neutral `#777777`
key, 13 custom steps, and the fourth step as index 100. Silver and the shared
16-step list stay unchanged. Gray's authored values are its Light targets;
explicit opposite values hold its Dark targets. Adaptive backgrounds interpolate
between those targets, and Overall contrast still applies afterward.
This updates new/reset default systems, not existing saved authoring records.
This seed is within [LTAX-002](design-data-gap-register.md); it does not change
reference alignment or manual acceptance.

The mode set owning **Overall contrast** owns custom main-ratio patches too.
In its default mode, edit the list, base, rule, authored main values and optional
opposite values. Nondefault modes edit main ratios only; missing patches inherit
the scale's authored value, and **Reset** removes the patch. Names, step IDs,
base and rule stay shared. Color-stop ownership is separate. Temporary Color
previews and read-only authoring disable these controls.

Custom patches resolve before the existing polarity compensation and multiplier;
both apply exactly once. The editor distinguishes authored/overridden ratios
from effective adapted values. Elements/Evaluation, Analyze values and charts,
token names and CSS use the same scale-specific indices. CSS variables are
scale-scoped, for example `--contrast-gray-25`; owned Color scheme/Contrast
combinations receive precomputed custom ratios before paint-time multiplication.
An explicit Contrast attribute takes precedence over the OS preference.
Fractional indices use the existing numeric taxonomy formatter in CSS names:
index `0.25` becomes suffix `0-25`, keeping selectors and custom properties valid.

**Use shared contrast steps** confirms removal of custom configuration and its
mode patches. Removing steps or scales cleans affected overrides and aliases;
Undo restores scoped records without undoing unrelated edits. Working and saved
states remain separate through Save, Cancel and reload.

Token IDs follow scale/step IDs, not labels. Save creates compatibility aliases
for unambiguous old names. During custom-step renumbering only, an old name now
used by a different swatch cannot remain an alias: Save omits that alias and
shows a notice. Other token/alias collision checks remain strict.

## Switching to runtime calculation

To adapt to any background at runtime instead:

1. Emit `--polarity-compensation` and `--contrast-reference` (0 or 1) plus each authored `--contrast-N`.
2. Derive the weight from `--_luma` (already computed per rule) with the L\* formula.
3. Port the lightness-difference boost to `calc()` using `pow()` for the L\* cube root, then blend with `exp()`/`log()`.
4. Drop the `[data-color-scheme]` contrast overrides.

Trade-offs: explicit `oppositeValue` overrides can't be represented; `pow()`, `exp()` and `log()` require recent browsers; output becomes much harder to read.

## Read-only color analysis

Foundations > Colors > Analyze uses the same resolved modes, palette links, polarity compensation, contrast multiplier, scale anchors, and Dynamic generator as the other foundation views. Analysis controls are navigation-only preferences: they reset on page refresh and do not change saved source, token counts, or publishing.

Chromaticity shows a fixed-lightness OKLCh gamut slice with transparent outside pixels, plus Hue and Chroma charts along each underlying scale's relative-luminance positions. Circular guides represent actual chroma, not hue-dependent relative saturation. Keys and complete generator paths retain their true positions even outside the current slice's colored shape. The generator's linear-light anchor path is distinct from the editor's direct OKLCh ramp and from final background-blended output. Lightness is charted only in the Lightness tab; the slice-lightness control and exact lightness values remain available in Chromaticity.

Lightness analyzes generated Dynamic colors against the selected surface. It distinguishes authored targets, effective targets, full-precision calculated contrast, and achieved contrast measured from serialized CSS. Measurement uses decoded channel values before device-specific gamut mapping, including any small boundary excursions introduced by serialization. It does not simulate a particular browser or monitor. Manual token overrides are disclosed, not substituted into these charts.

Both views and the grayscale preview use **OKLab lightness**. This is deliberately different from Spectrum studio's CIE-lightness charts; it does not alter the existing CIE-based polarity-compensation calculation described above. Curve display passes through observations without overshoot and never creates new tokens. The analyzed gamut follows foundation output; OKLCh serialization currently uses the sRGB generator gamut.
