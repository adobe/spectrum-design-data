<!-- Copyright 2026 Adobe. All rights reserved. -->

# Accordion: Lauryn Lesley's spec template vs the generated spec sheet

**Status:** Draft crosswalk (bead `spectrum-design-data-hzje.48.1`)\
**Scope:** Accordion only. No data, schema or recipe changes.\
**Why here:** `docs/proposals/` already holds un-numbered analysis docs (for example `repo-organization-and-ai-resources.md`). A crosswalk is input to later proposals and slices, not a numbered format RFC.

## What was compared

* **Template:** Figma file `5Lpmh3QXue3bq4sYVyksK7`, page "Accordion | Spec working session v1" (frames Accordion, Anatomy, Usage, States / interactions / responsive behavior, Accessibility, Decision log, How to use, Developer and design feedback). Read through the Figma REST API. The later pages (v2 working session, SWC+RSP doc site specs, Design data gap comparison with its 27 findings DD-01 to DD-27, Spectrum Hub gap comparison) are context, not authority.
* **Generated sheet:** `design-data spec-sheet accordion --changelog packages/design-data/changelog/accordion.json` (the command `tools/figma-spec-plugin/plan.mjs:107` runs for `--all`), built from this worktree. Pages: **Layout** (51 blocks), **Typography** (1), **Color** (3), plus a changelog frame. `tools/figma-spec-plugin/payloads.mjs` draws only those: `beginSheet`, `appendChangelog`, `appendBlocks`, `finishSheet` (`payloads.mjs:101-109`). The sheet's top-level keys are `visual, size, datasetRevision, block, pages` (no anatomy, API, usage or accessibility section).
* **Sources the sheet reads:** `packages/design-data/components/accordion.json`, `relationships/accordion.json`, `visuals/accordion.json`, `changelog/accordion.json`.

## Summary table

| #  | Template section                                                                                                                            | Label       | One-line reason                                                                                                    |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| 1a | Anatomy: variants with structural indicators (nested instances, slots, required vs optional, sizes, density)                                | **PARTIAL** | Data is complete; the sheet draws single-item measurement specimens, not a variant board or structure indicators   |
| 1b | Anatomy: API table (name, type, default, options)                                                                                           | **MANUAL**  | `options` has all four columns; no sheet block emits it                                                            |
| 1c | Anatomy: Tokens table (name, type, alias?, alias of)                                                                                        | **PARTIAL** | Layout, Typography and Color blocks list token name and alias; no type column, no per-block alias flag             |
| 2  | Usage guidelines (do/don't, content rules, if/then, can/cannot)                                                                             | **MANUAL**  | `documentBlocks` holds prose; the sheet never reads it                                                             |
| 3  | States, interactions, responsive behavior                                                                                                   | **PARTIAL** | Hover and keyboard-focus values appear inside token blocks; no state board, interaction flow or responsive section |
| 4  | Accessibility (role, bluelines, focus order, keyboard, voice, screen readers, reduced motion, contrast, focus indicators, accessible names) | **MANUAL**  | Only a focus-ring color/layout block is generated; the `accessibility` block is not read                           |
| 5  | Decision log                                                                                                                                | **PARTIAL** | Changelog frame gives date, version, change class and PR; no Jira link, R\&R contacts, decision or rationale       |
| 6  | How to use                                                                                                                                  | **MANUAL**  | Static instructional text in Figma; nothing to generate                                                            |
| 7  | Feedback                                                                                                                                    | **MANUAL**  | Free-form human input by design                                                                                    |

No section is fully GENERATED. The closest are Tokens (1c) and Decision log (5).

## Section detail

### 1a. Anatomy: variants and structural indicators: PARTIAL

Template: "Component variants with structural indicators of nested instances, slots, required vs. optional UI elements, sizes, density" (frame `33561:14759`), over a specimen of five titled items, with SWC and RSP tabs. The v2 page adds "All 24 existing variants" (3 densities × 4 sizes × quiet/default).

Generated today:

* Each Layout block has a `render` scene with numbered markers and measurements for one specimen. Specimens are small: the only text drawn is the single label "Label". Option overrides across all 54 blocks: `{}` (45), `{size:l}`, `{size:s}` (4), `{density:regular}`, `{isOpen:true}` (2), `{isDisabled:true}`, `{hasActionButton:true, hasSwitch:true}`.
* The visual recipe repeats `accordion-item` once per `items` entry (`visuals/accordion.json:14-24`), but the sheet supplies no multi-item `items` array, so no block shows a stack of items.

Data that exists but is not drawn:

* 12 anatomy parts with `required` and `contains` (`components/accordion.json:149-212`): `container`, `accordion-item`, `header`, `disclosure-icon`, `title` required; `container-divider`, `actions`, `action-button`, `switch`, `content`, `divider`, `focus-indicator` optional (`focus-indicator` is `presentIn: keyboard-focus`).
* 3 slots: `default` (collection `items`), `actions` (accepts `action-button`, `switch`, max 2), `content` (`:128-148`).
* Options `size` s/m/l/xl, `density` compact/regular/spacious, `isQuiet` (`:52-127`).

Missing: a variant matrix; indicators that show nested instances (action-button, switch, divider are `kind: component` parts, `visuals/accordion.json:59,132,143`); a required/optional marker per part; a slot callout. "Show spacing" and "Variant" (template API rows) have no data counterpart; no 24-variant board exists.

### 1b. Anatomy: API table: MANUAL

Template columns Name / Type / Default / Options, with rows Slot, Show spacing, Size (XS-XL), State, Quiet, Density.

Data: `options` carries name, `type`, `default` and `values` for `size`, `isQuiet`, `isDisabled`, `isOpen`, `hasActionButton`, `hasSwitch`, `density`, `items`, `isMultiple` (`components/accordion.json:52-127`). Nothing in `payloads.mjs` or the sheet model emits an options table. The data is ready; the missing piece is a sheet block (or a doc-site table) that reads it.

Gaps against the template rows:

* Template lists size `XS`; the data has s/m/l/xl only. Token names do include "Extra Small" for `space-between` (`xs`), so confirm with design.
* Template has "State: Default, Hover, Disabled". Data splits this: `states` (hover, down, keyboard-focus; `:214-218`) and the option `isDisabled`. The template's "Show spacing" has no counterpart.
* Gap finding DD-05, DD-06, DD-09, DD-25: native adapters (ids/keys, per-item disabled, callbacks) are absent from the normalized options, so an API table from `options` alone would not match the SWC (30 members) or RSP (45 rows) APIs.

### 1c. Anatomy: Tokens table: PARTIAL

Template columns: `#`, Token-name, Alias?, Alias of; groups Color, Padding, Radius, typography.

Generated: every block has `rows[].items[]` with `marker`, `label`, `size`, `token.name`, `token.uuid`, and `values.value.alias` where it is an alias. For example, block `layout--paddings` lists `container-padding-extra-small` aliasing `spacing-100`. Markers match the numbered callouts on the specimen. The Typography page (`typography--value`) and Color page (`color--section-title-and-chevron`, `color--disabled`, `color--focus-ring`) cover the other two template groups.

Missing: a token `type` column; an explicit "Alias? yes/no" flag (derivable from `values.value.alias`); a flat all-tokens table instead of one block per property. Many blocks are `titleSource: property` rows with one record each (for example `layout--top-to-text-regular-medium--property`), which reads as 28 near-empty blocks. Also, per DD-20, all 53 Accordion-specific tokens are deprecated, with relationships pointing at current semantic tokens; the sheet follows the relationships, so alias targets are semantic, not legacy.

### 2. Usage guidelines: MANUAL

Template (frame `33561:14952`): do/don't (example: "Don't mix versions", default vs quiet items), content rules (label length, truncation, wrapping, localization), "If... then..." edge cases, "Can and cannot's".

Data: `documentBlocks` (`components/accordion.json:12-48`) has `purpose`, 4 `guideline` blocks (single vs multiple expansion, title wrapping, optional actions, progressive disclosure) and one `do-dont` ("Avoid accordion overuse", don't only). The generated sheet does not read `documentBlocks` at all.

Missing from data, not only from the sheet:

* A "do" for any `do-dont` block; the template pairs them.
* The template's mixed-version rule (quiet vs default items) has no data; `isQuiet` is a group option, so the rule is arguably moot. Ask design whether it applies to the v2 component.
* Content rules (label length, truncation, localization), if/then edge cases and can/cannot: none (DD-27: RTL, locale, copy limits and nesting rules are unknown for both platforms).
* Title wrapping is canonical data only; SWC and RSP docs do not state it (DD-16).

### 3. States, interactions, responsive behavior: PARTIAL

Template (frame `33561:14996`): States (Default, Hover), Interactions ("Default → Hover → Selected"), Responsive behavior, link to a prototype.

Generated: the state-dependent values show up as token rows inside blocks (hover fill in `visuals/accordion.json:73`; focus ring in `layout--focus-indicator` and `color--focus-ring`; disabled in `color--disabled`). The sheet carries no hover/down/focus specimen frame.

Data: `states` lists `hover`, `down`, `keyboard-focus` (`components/accordion.json:214-218`); `visuals/accordion.json:7` marks `down` and `isMultiple` as `notVisual`. `mode.scale` (desktop/mobile) drives width and typography values, which is the only responsive content.

Missing: a state board; interaction flow (expand/collapse, action isolation: DD-01, DD-14 events); responsive behavior beyond mobile/desktop token scale; prototype link. DD-15, DD-22 and DD-24 note state matrix coverage gaps, including that `focus-indicator` has no explicit recipe part.

### 4. Accessibility: MANUAL

Template (frame `33561:14576`): "Accessibility Checklist", SWC/RSP tabs, ARIA role, bluelines, Focus Order table (1 Chevron, 2 Switch, 3 Action button), Accessible Name, ARIA Note, VoiceOver, TalkBack, Narrator, React Native, General Note, TV Note, plus reserved sections for keyboard, voice, screen readers, reduced motion, contrast, focus indicators.

Generated: nothing from `accessibility`. The Color page's `color--focus-ring` and the Layout page's `layout--focus-indicator` cover only the visual focus indicator.

Data (`components/accordion.json:220-229`): `intents: [expand]`, `focusable: true`, `keyboardIntents: [activate, expand, collapse]`, `wcag: 2.1.1 (A) Keyboard, 4.1.2 (A) Name, Role, Value`.

Recorded gaps:

* **(a) No `role`.** Accordion's block has no `role`. `spec/accessibility.md` defines `role` as optional (`packages/design-data-spec/spec/accessibility.md:19`); 33 of the 96 `packages/design-data/components/*.json` files set one (the brief said 97). The canonical vocabulary (`:37-61`) has no accordion/disclosure/heading/region value; the nearest are `button` (trigger), `group` and `listitem`. SWC exposes a panel `region` with `aria-labeledby` and `aria-controls`/`aria-expanded` on the header; RSP defaults the panel to `group` with `region` opt-in (DD-12). Adding `role` needs a decision on which part owns it (see Questions).
* No heading level (SWC default 3, clamp 2-6; RSP `AccordionItemTitle.level`, default 3): DD-11.
* No literal keys, disabled-focus behavior, focus order or focus delegation: DD-13. The template's Focus Order is chevron → switch → action button, which the data can give (anatomy order in `header.contains`: disclosure-icon, title, actions) but does not state.
* Accessible names for icon-only action button and hidden-label switch: DD-19; `visuals/accordion.json` hides visible labels.
* No reduced motion, contrast beyond WCAG references, voice, screen reader sections: DD-27.
* **(c) iOS.** `platforms/ios/extensions/` has no accordion implementation, and spectrum-ios has no Accordion. An iOS column for VoiceOver is meaningful only where iOS ships the component. Where it does, the mapping from `accessibility` fields to `UIAccessibility` (`spec/accessibility-adapters.md:95`) is guidance only (the chapter is informative), so any iOS entry is "mapped, not verified": no repo evidence of a VoiceOver run exists. The phrase "mapped, not verified" is not yet defined in the spec; slice .5 should define it. For Accordion the iOS column is "not applicable: component not shipped", not blank. TalkBack, Narrator, React Native and TV have the same rule.
* Template wants bluelines (ARIA/focus diagrams drawn on the specimen): no data model exists.

### 5. Decision log: PARTIAL

Template (frame `33561:14496`): date (example "Jul 10, 2026"), version, Jira link, R\&R / points of contact, decision and rationale, class (New, Fixed, Deprecated, Removed).

Generated: the changelog frame (`appendChangelog`, fed by `slimChangelog`, `payloads.mjs`) lists per release: `version`, `bump`, `release`, `date`, and per commit: `date`, source (`type`, `number`, `title`, `sha`, `subject`) and entry `class`. For Accordion: baseline release 2.1.0 / version 1.0.0; release 2.7.0 / version 1.0.1, 2026-09-03, PR 1394 "fix(design-data): re-point CTR refs off deprecated tokens" (`changelog/accordion.json`).

Missing: Jira link (no field in the changelog schema), R\&R contacts, decision and rationale (the commit title is the only rationale), and a mapping from the changelog's `class` and `change` (`added`, `updated`, …) to New/Fixed/Deprecated/Removed. The template wants human decisions; the changelog records data diffs. These are different artifacts, so a decision log likely stays manual with the changelog attached.

### 6. How to use and 7. Feedback: MANUAL

Static workshop instructions ("Schedule a 1-1.5hr workshop") and free-text feedback prompts (frames `33561:23819`, `33561:14463`). Nothing is derivable. Copy them into any generated file as fixed boilerplate if the file is to stand alone.

## Required additions from the brief

* **(a) Accessibility has no `role`:** see section 4.
* **(b) v2 specimen shows multiple items open by default.** `isMultiple` exists (`components/accordion.json:122`; SWC `allow-multiple`, RSP `allowsMultipleExpanded`; both cached docs at `docs/s2-docs/web/{swc,rsp}/components/accordion.md:23`), but it is `notVisual` (`visuals/accordion.json:7`) and the sheet's specimens are single-item. To show several open items the specimen request needs `items` with several `isExpanded: true` entries; the recipe already maps `isOpen` from `items[].isExpanded` (`visuals/accordion.json:19-23`). Open question: whether the group should render this (changing `notVisual`, which is a recipe change and out of scope here) or the Figma template should hold a fixed hand-built specimen. Note the semantics differ: `isMultiple: false` is single-expand, so "multiple open by default" is a specimen state that only makes sense when `isMultiple` is true.
* **(c) iOS:** see section 4.

## Biggest gaps

1. **The sheet covers only token measurements.** Three of the template sections (Usage, Accessibility, API table) have data in the package that no block reads. This is a generator gap, not a data gap, for Usage and API.
2. **Accessibility is the thinnest data and the largest template section.** No `role`, no focus order, no names, no per-platform notes; DD-11, DD-12, DD-13, DD-19 already list this, and the template needs VoiceOver, TalkBack, Narrator, React Native and TV columns that the schema cannot hold.
3. **No variant board or multi-item specimen.** The template's anchor is the 24-variant, multi-item-open specimen. The sheet draws one-item measurement specimens (1a, (b)).
4. **Decision log is a different artifact from the changelog.** Jira link, R\&R and rationale have no home.
5. **Platform adapter gaps (SWC vs RSP vs iOS).** The template has SWC and RSP tabs everywhere; data records one normalized API (DD-05, DD-06, DD-09, DD-25), and iOS has no Accordion.

## Proposed order for slices .2-.6

The bead tree does not define the slices' content, so this order is a proposal based on the table above.

1. **.2 Usage guidelines block.** Read-only render of `documentBlocks` (purpose, guideline, do/don't). Lowest risk, data exists, closes one MANUAL row.
2. **.3 API table block.** Render `options` as name/type/default/options. Data exists; settles how the table handles `State` and `Show spacing`.
3. **.4 Anatomy and variants board.** Parts, required/optional, slots, sizes × density × quiet, multi-item specimen with several open items (b). Biggest visual change; may need the recipe `notVisual` decision.
4. **.5 Accessibility.** Needs the `role` decision and a schema extension for per-platform notes and focus order, plus the "mapped, not verified" rule for iOS, so it follows the earlier slices.
5. **.6 States/interactions and Decision log.** Largest authoring need (interaction flow, Jira/R\&R fields); keep the changelog as the source for the log's date/version/class.

## Questions for Garth

1. **Which canonical `role` for Accordion?** Options: (A) `button` on the header trigger (matches what both platforms expose), (B) `group` on the container, (C) add a new canonical value (`region` or `disclosure`) to the role vocabulary. **Recommend A**, scoped to the header, with a note that panels are platform-owned (DD-12). Blocks: slice .5. If unanswered: the accessibility section stays without a role and the slice ships with the gap listed.
2. **Should the generated sheet itself show multiple items open, or should the Figma specimen be hand-built?** Options: (A) change the recipe to render an `items` stack with several `isExpanded: true` (a recipe change, separate bead), (B) keep generated blocks single-item and put the multi-item specimen in the template, (C) generate it in the new variants board only (slice .4). **Recommend C**. Blocks: slice .4. If unanswered: slice .4 draws one item and flags it.
3. **What file does the generator produce: the full v1 template or only the data-backed sections?** Options: (A) full template with MANUAL sections as empty placeholders, (B) data-backed sections only, appended to Lauryn's file by hand. **Recommend A** so the working session starts from one file. Blocks: slices .2-.6 layout. If unanswered: assume B.
4. **Is the Decision log in scope for generation?** Options: (A) generate rows from the changelog and leave Jira/R\&R/rationale blank, (B) keep it fully manual. **Recommend A.** Blocks: slice .6. If unanswered: B.
5. **Does the template's "Don't mix versions" rule (quiet vs default items) still apply?** `isQuiet` is a group option in the data, so mixed items cannot happen there. Ask Lauryn. Options: drop from the template, or keep as a platform-specific note. **Recommend asking Lauryn.** Blocks: slice .2 content. If unanswered: left out of generated Usage.
6. **Is `XS` a real Accordion size?** Template lists XS-XL; `options.size` has s/m/l/xl, yet tokens such as `container-padding-extra-small` exist. Options: update the data, or fix the template. **Recommend asking design.** Blocks: slices .3 and .4. If unanswered: use the data's four sizes.

## Not checked

* The Figma master components (no render comparison; REST text only).
* Whether SWC/RSP behavior matches the cached docs; this crosswalk inherits DD-03's caveat that those caches are not versioned captures.
* The Hub prototype's `specs/` page renders the same sheet JSON plus changelog (`docs/hub-prototype/specs/specs.js:24-26`) and adds no sections.
