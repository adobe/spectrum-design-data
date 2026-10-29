# Data vis color scales

## Shared authoring gamut and output format

Platforms and Color > System settings share one saved color configuration.
Gamut offers sRGB, Display P3, and Rec 2020. Color format offers RGB, OKLCh,
Hex, and HSL. RGB uses `rgb(...)` for sRGB, `color(display-p3 ...)` for Display P3,
and `color(rec2020 ...)` for Rec 2020. OKLCh uses `oklch(...)`; HSL uses `hsl(...)`.
Hex and HSL are available only when output is sRGB. A change that makes the
current format incompatible selects RGB and displays an explanation.

**Map outputs to sRGB** preserves wide-gamut authored sources while mapping
generated output, including Static/manual colors, to sRGB. Mapping uses the
installed Color.js `css` method on cloned colors. Alpha is retained, including
eight-digit Hex when needed. Functional formats use up to 12 decimal places;
Hex retains its inherent eight-bit channel precision.
Changing notation alone preserves the existing native-gamut ramp and palette
algorithms. Appearance-preserving ramp/palette mapping is enabled only for
explicit wide-to-sRGB output mapping.

Final generated contrast is verified after formatting. A manually edited UI
swatch is formatted but never recolored to repair its target. Failed relationships
retain their authored sources and block dependent output/export. Exact final-token
links do not receive a second independent contrast adjustment.

Normal color pickers use the shared authoring gamut when opened. Wide-gamut
defaults use OKLCh polar editing. Local display/gamut choices do not change the
saved setting, and an open picker is not reset by a changed shared default.

Adaptive UI CSS remains runtime-free and uses functional colors even when
precomputed token output is Hex. Its declared contexts are checked before export;
host-injected backgrounds must also make the requested targets feasible. Browser
relative-color conversion uses a small endpoint-bounded numerical margin rather
than a soft blend between contrast sides. This does not certify a physical
display's gamut mapping or arbitrary host-created background/target combinations.
Independent declared color backgrounds and custom contrast targets are also
preflighted together; individually feasible presets cannot certify an infeasible
combination. Base-sourced surfaces can move toward white when the original hue,
including exact black, cannot supply their requested lighter contrast.

Continuous editors use a stable, scrolling viewport while point controls change.
This avoids resizing an overlay inside its own positioning observer when an
inline custom picker replaces a token field. The token/custom transition and
viewport resizing pass unfiltered page-error checks in all three browser engines.
All 30 original sequential token selections, including Seahawks, retain their
nearest ranking under the default output policy. Thirteen historical Hex values
were just below their requested contrast after rounding; their exact corrected
values are pinned separately, meet the final target and differ by at most one
byte step per channel. Original selection fixtures and authored references remain
unchanged. The full data vis regression suite passes.

Foundations > Colors > Data vis contains sequential, diverging and categorical
scales. **Add data vis scale** opens a menu for those three types. The list groups
scales under **Sequential**, **Diverging**, and **Categorical** headings, showing
only types that contain scales. Cards show an aligned color preview and name,
without a type badge; editing mode places the delete button beside each card.
The overall empty message appears only when the entire list is empty.
New scales appear at the top of their type, and sequential/diverging scales open their editor
with the scale name focused. A new categorical chooser also appears first with
its name focused; Cancel discards the draft, and Apply inserts the scale first
within Categorical. Editing an existing scale does not move it. Save and reload
preserve the order within each type; grouping does not reorder saved data.
Shipped defaults include **Fire, Meadow, Seahawks, Rose, Sunset, and Ice**,
each with five live Color token links at 0%, 25%, 50%, 75%, and 100%.
Their sources were chosen once using the existing CIEDE2000 calculation against
published Light-mode primitive colors at normal contrast and the other shipped
default modes, with stable token IDs breaking ties. The pool includes Palette
colors and Wireframe swatches, but excludes hidden/invalid colors, semantic
tokens, aliases and presentation samples.
Later output mapping or final-contrast corrections can change which value is
currently nearest; they do not rematch these authored references. Historical
selection values remain covered separately from current live output.

| Scale | 0% | 25% | 50% | 75% | 100% |
|---|---|---|---|---|---|
| Fire | Yellow 300 | Illustrator orange | Red 800 | Magenta 1200 | Fuchsia 1500 |
| Meadow | Yellow 300 | Dimension green | Celery 800 | Green 1200 | Turquoise 1500 |
| Seahawks | Celery 400 | Green 500 | Turquoise 800 | Wireframe 1100 | Blue 1500 |
| Rose | Red 300 | Pink 600 | Fuchsia 900 | Purple 1200 | Indigo 1500 |
| Sunset | Yellow 400 | Magenta 600 | Pink 900 | Fuchsia 1200 | Purple 1500 |
| Ice | Turquoise 300 | Cyan 500 | Blue 800 | Indigo 1100 | Purple 1500 |

These nearest matches do not reproduce every supplied hex value exactly:
Fire/Meadow's `#fff197` maps to Yellow 300 (`#f3ddba`), and Meadow's `#98c32f`
maps to Dimension green (`#99e83f`). The links use stable token IDs and follow
source edits, renames and mode/contrast values without rematching or applying
a second contrast adjustment. They add authored continuous inputs, not new
primitive tokens or mode-value rows. Existing source protection requires a
replacement before removing or hiding a linked color.
Deleting an entire linked UI scale is blocked before its token edits are
cleaned up, with the same actionable replacement message as individual sources.

Fresh systems and confirmed Reset all adopt this catalog. Existing working
and saved designs are not merged with new defaults, including earlier Static
Fire colors. Fire keeps its existing scale, point and taxonomy identities.
Other examples and suggestions are temporary, not hardcoded authoring edits.
`pnpm test:sequential-defaults` checks the exact IDs, nearest matches, live
behavior, runtime/export parity, clean baselines, unchanged token counts,
saved preservation, Reset and Revert; it also runs within `pnpm test:data-vis`.

This is the approved Color/modes architecture slice under EPIC-1.1 and EPIC-2.1,
with bounded native token, vocabulary, accounting and export integration. The
separate JavaScript adapter is an explicitly approved exception for data vis,
not a change to the existing CSS-only UI color library.

## Sequential and diverging scales

These scales define a continuous color function, not a fixed number of output
swatches. Endpoints remain at 0% and 100%; a diverging scale also has one exact
center at 50%. Additional control points have stable IDs and shared positions.
The gradient uses the same selectable stops as the normal Color scales editor.
Select a stop to edit it; move interior stops by dragging or with arrow keys.
Shift plus an arrow makes a smaller move. Small add/remove buttons manage
interior stops; endpoints and the diverging center cannot move or be removed.
**More options** contains precise position, opposite contrast and mode/reset
actions. Duplicate or reordered positions are rejected rather than silently
moved.

Each point can use:

| Source | Behavior |
|---|---|
| Custom color | The existing color picker plus an arbitrary contrast target |
| UI color scale | Scale picker beside Contrast; linked scale geometry supports arbitrary targets such as 2.4:1, even when they are not existing swatches |
| Color token | The shared token picker, filtered to published primitive colors; exact final values, including applicable manual edits, with no second contrast adjustment |

Color token includes Palette colors, UI-scale swatches and categorical members.
Semantic tokens, aliases, unpublished colors and preview samples are excluded.
Links use stable native identities, not names or list positions. Categorical
suggestions keep their narrower UI-swatch source pool.

Owned targets support the same main/opposite reference semantics as UI
contrasts. Global contrast and polarity apply once to adaptive contrast targets.
Unattainable targets remain visible as warnings without routine generated-point
explanations in the primary form.

Contrast fields retain up to eight decimal places through commit, including
the UI scales' custom main/opposite targets. Position entry retains six decimal
places in its percentage display; fixed endpoints and centers remain locked.

Custom-color versus scale versus exact-token source families, point inventories,
positions and opposite targets stay shared. Exact-token choices can use any
published primitive in an authored mode, including points saved with the older
named-UI-swatch representation. Updating the shared exact-token representation
preserves existing mode selections.
The existing Color scales owner manages source patches; Overall contrast's
owner manages main-target patches. Reset returns a field to inheritance.
**Use this source in all modes** updates the shared source and clears its source
patches, not unrelated contrast patches. Editing a temporary adaptive preview
requires an explicit destination before writing a mode.

Clear a mode's data vis patches before making it the default or removing their
owner. This prevents the ordinary default-mode normalization from silently
discarding those patches. Removing a mode clears its mode-specific token
values; removing a whole set supports scoped Undo that preserves later metadata
and rejects conflicting later values, ownership changes, unavailable point
sources and value records for categorical members removed since deletion.

Sequential interpolation is bounded, piecewise OKLCh, with the shorter hue path
used by normal UI scales. Neutral stops borrow the other stop's hue instead of
introducing an arbitrary hue. Lightness and chroma are alpha-premultiplied; hue
is an angle and is not. Sequential panel/Elements gradients explicitly use
OKLCh too. Diverging interpolation retains its alpha-aware OKLab behavior.
Neither extends to white or black. Exact authored endpoints and the diverging
center retain their final values; interior colors are mapped to the selected
output gamut. Sequential OKLCh output retains enough precision to keep mapped
colors inside that gamut after serialization.
Collapsed colors, nonmonotonic arms and out-of-gamut linked points remain
visible diagnostics, not reordered or replaced inputs.

Charts own their datasets, numeric domains, bins and diverging data midpoint.
The function accepts finite normalized values and clamps values outside 0-1;
nonfinite values are errors. Presentation samples do not create authored
points, token IDs or saved impact counts.

## Categorical scales

The chooser draws only from final, published UI-scale swatches. It excludes
Palette entries, raw keys, hidden points, continuous samples and other data vis
outputs. Source links and saved member order remain stable across modes;
changes update values and warnings, never automatically choose another palette.

Suggestions offer balanced and bold ranking styles, a requested count or the
largest set found. Exact requested counts are required for a suggestion; an
unsatisfied request reports the largest set found without disguising it as a
complete result. Duplicate ordered suggestions appear once.

Balanced favors steadier lightness/chroma and smoother ordering. Bold favors
stronger adjacent changes. The versioned `fixed-token-order-1` heuristic ranks
unchanged source colors; it is not a scientifically validated harmony score.
Source IDs provide deterministic tie-breaking.

Starting targets are normal-vision background contrast of 3:1 and CIEDE2000
of at least 11 under normal vision and the selected CVD profiles. These targets
are adjustable. Individual selection, replacement and reordering are supported.
Replacing a source retains the member ID; moving a member retains its source.
Manual failures require an explicit acknowledgment. Missing or nonconcrete
sources cannot be waived. Direct member-token overrides are shown and checked
as the final colors, not as the original source values.

Changing modes or sources while choosing makes the selection stale. Review and
refresh before Apply. Cancellation interrupts pending work; a stale asynchronous
Apply cannot write members or clear token records.

Search and large inspections use a typed worker, bounded caches and yielded
cancellation. The pool limit is 8,192 colors, with explicit rejection rather
than truncation. Search has six starts per style, a 32,768-measurement budget
and a 200,000-operation budget. Large manual inspections also have explicit
budgets; reaching one is not treated as a completed check. Candidate display
is searched/paginated independently of the full search pool.

## Static and Adaptive colors

New and migrated scales are Adaptive. All three types have a **Static**
checkbox. Turning it on offers **Current colors** or **Default-mode colors**.
Current colors includes final source/member edits and the displayed adaptive
preview; default-mode colors evaluates the actual default context. Cancel
changes nothing.

Static captures authored continuous stops or categorical members, not sampled
gradient colors. Mode and global-contrast changes no longer regenerate those
values. Alpha and wide-gamut authored values are retained. Background changes
can still change contrast and Delta E measurements.

The editor shows captured colors instead of Contrast and adaptive-mode controls.
Selecting a token while Static captures its current value; it does not create a
live link. Adding, moving, removing or editing Static stops does not overwrite
the retained Adaptive recipe. Turning Static off restores that recipe and its
source/contrast/member configuration, without reverting unrelated global edits.

Categorical value edits in Tokens show **All modes (Static)** and update one
shared Static value. Changes labels these edits **Value (all modes)**. They
survive Save/reload and support revert. Previous mode-specific member values
remain dormant until Adaptive is restored; they do not affect Static output,
appear as active value changes or create additional published mode-value rows.

## Elements and Analyze

Elements shows the scales and small, deterministic sample heatmaps or numbered
category bars. **Sample values** provides an equivalent data table. The
diverging example owns a -4 to 7 range with a zero midpoint; none of that data
is stored in the Foundation. Elements uses the shared generated-background
surface, independently of the app's appearance. Data vis panel and chooser
previews also render transparency over that actual UI background.

Analyze plots lightness, chroma, hue or background contrast. Comparisons can
use the actual generated UI background, one selected color, adjacent colors
or paginated all-pairs rows. Swatch previews and Spectrum meters show the
rendered colors, contrast and Delta E 2000.

The comparison table has its own 400-pixel scroll region, so stacked controls
cannot collapse its rows on a narrow screen. Scroll horizontally to reach
offscreen measurement columns. The existing navigation collapse control can
free more space for the main view without changing the editing panel.

Keep these meanings separate:

- Normal-vision 3:1 non-text contrast is a WCAG comparison where the graphical
  use actually requires it, not a whole-chart certification.
- Delta E is a distinctness target, not a WCAG pass rule. A continuous
  progression is not required to pass a categorical pair threshold.
- Protanopia, deuteranopia and tritanopia use full-severity linear-sRGB Machado
  simulations. Wide-gamut colors are explicitly mapped to the documented
  sRGB simulation space; the background is simulated too. Grayscale is a
  luminance-based approximation.
- Simulated contrast/difference and aesthetic scores are estimates, not
  accessibility certification or medical diagnosis.

Alpha is composited against the actual opaque UI background before
measurements. CIEDE2000 is explicitly selected through Color.js, using Lab D50
reference checks. Existing Euclidean OKLab measurements are unchanged.
One categorical color has zero pairs and no minimum pair difference, not
Infinity. Meters use a common range within each comparison page.

Finite samples cannot prove accessibility for every function value or chart.
The chart still needs suitable labels, patterns, adjacency, interaction and
other non-color cues. See the [calculation notices](third-party/data-vis-notices.md)
for coefficient provenance and licenses.

## References, tokens and saved changes

Palette/UI source removal, member/swatch removal, unpublishing and custom/shared list changes
require valid replacement links first when they would remove a data vis input.
The guard examines shared inputs, all authored mode patches, captured token
provenance and retained Adaptive recipes. There is no
nearest-color, same-index or fixed-hex fallback.

Each categorical member generates one native color primitive. Its UUID uses an
unambiguous scale/member tuple, independent of label, ordinal, source value or
selected mode. Ordinals use the existing Number vocabulary; they are not UI
contrast indices. Native Browser edits, references, aliases, cascade output and
governed names use the existing owners. Member/scale removal also protects
primitive consumers and compatibility aliases.

Continuous functions and hidden points create no primitive concepts.
Working edits remain separate from the last-saved Cancel baseline and from
saved-versus-shipped impact. Only saved categorical inventories and actual
owner-scoped values enter those denominators. Unrelated axes, equal values,
previews, suggestions, CVD views, compatibility aliases and Cartesian samples
cannot invent or erase native concepts.

An upstream manual UI value updates linked categorical output but does not
classify the member as directly manual. A direct member-token value edit does.
Reordering and source replacement retain member IDs/counts. Removal cleans
only removed records; scoped Undo preserves unrelated later edits.
Static members have one shared active value scope. Captured colors are their
generated baseline; direct shared Tokens overrides retain that baseline and
are visibly manual. Continuous Static stops still create zero primitives.

## Code and the standalone adapter

The Code view downloads a source-closed `data-vis.json`, categorical CSS and the
actual built `data-vis.js`. The source packet is version 3 and includes Color
version 5 geometry and shared output settings, relevant Palette/member/naming sources, mode metadata/patches and
final token edits. It is not a complete native authoring snapshot and is not a
current-mode hex-only replacement for the generator.
Unmodified version-one/Color-three and version-two/Color-four packets have explicit migration support.
New native-token patches and Static features cannot be disguised as old packets.

```javascript
import { createDataVisRuntime } from "./data-vis.js";
import packet from "./data-vis.json" with { type: "json" };

const runtime = createDataVisRuntime(packet);
const color = runtime.continuous("Temperature");
const output = color(0.37); // The chart owns normalization.

const dark = runtime.withContext({
  modes: { colorScheme: "dark" },
  contrastMultiplier: 1.25,
});
```

Use an existing scale ID or unique name. `categorical(idOrName)` returns a copy
of the ordered final color list; `continuous(idOrName)` returns a normalized
callback. `diagnostics(idOrName)` reports continuous-recipe diagnostics.
`definitions` lists scale IDs/names/types. `withContext` preserves earlier
options and mode choices unless explicitly replaced. Rebuild once per context
change, not for every datum.

Categorical CSS emits exact authored-mode values with canonical Registry names.
Optional class rules reference existing UI CSS variables only on elements with
the matching UI scale/contrast classes. Those UI variables are element-scoped,
not global root variables. Manual source/member values use scoped literals.
Static categorical output uses shared literals, never live UI-variable links.
Use the adapter, not a sampled gradient or categorical CSS list, for continuous
functions and fluid context changes.

`pnpm build:data-vis` creates the pure ESM artifact at
`public/data-vis/data-vis.js`; the ordinary production build runs it first.
Development downloads show a visible build instruction if the artifact is
missing. The adapter excludes React, Jotai, Spectrum, application state,
categorical search and chart libraries, and embeds Color.js's MIT notice.
Compiled-consumer tests enforce parity and a 150,000-byte uncompressed budget.

## Verification and alignment boundaries

`pnpm test:data-vis` builds and checks contracts, migration, generation/science,
categorical search, native integration, worker behavior, lifecycle/accounting,
compact editors, Static restoration/shared edits and the compiled export.
`pnpm test:data-vis-editors` runs the focused contract, source, lifecycle and
gradient-helper checks. Focused stories isolate the point controls, chooser,
comparison table and examples from authentication and production state.
Application and Storybook browser paths collect page errors. The narrow-screen
paths use the actual comparison controls and horizontally reach the Delta E
meters; they also require a usable table height instead of checking overflow
alone. Dark stories use a Spectrum background matching their appearance.

The broader repository checks are not all passing. These limitations remain
visible rather than changing unrelated fixtures, historical pins or behavior:

| Check | Current limitation |
|---|---|
| `test:color-system` | A legacy hydrated fixture has an unresolved surface tint source, `scale-48`. |
| `test:defaults` | An older assertion still expects the retired `typographyMetric` category. |
| `test:design-data` | The pending spacing-rule/unowned-binding comparison cannot find its expected projected row; the cause remains unresolved. |
| `test:design-data-materialization` | The historical whole-source fingerprint differs after schema and shipped-default changes. |
| `test:design-data-sdk` | The read-only adapter does not accept the product context required by the precedence fixture; full resolved-value conformance remains unestablished. |

LTAX-010 in the canonical gap register tracks this local implementation.
LTAX-002 and LTAX-005 remain the naming and mode-ownership records. Continuous
recipes and the JavaScript adapter are local extensions with no accepted
upstream colormap contract. Local checks do not establish manual architecture,
reference-content or RFC acceptance. Historical review fingerprints remain
pinned; the Color schema/collection and concurrent shipped-default changes are
non-naming source changes, so stale whole-source evidence is not silently
repinned or presented as unchanged.
