<!--
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
-->

# Diagram house style

The composition rules that make every docs-site diagram read as one restrained system,
not a set of independently tinted flowcharts. These apply on top of the FigJam preset
mechanics in `spectrum-brand.md` — that file says *which preset is available*; this file
says *which node gets which preset, and why*.

## Accent discipline

`blue` is reserved for **the one node the diagram exists to explain** — never assigned by
habit (e.g. "the last node" or "the rightmost tier"). Ask: if a reader could only take away
one node from this diagram, which is it? That node gets `blue`. Every other node in a
sequence is `lightGray`/`gray` regardless of its position.

* A cascade/precedence diagram accents the **outcome** (the resolved value), not an
  intermediate override stage — the diagram is about what wins, not about enumerating stages.
* A tiers/composition diagram accents whichever tier the surrounding prose is actually
  teaching in that section, not the "most important-sounding" tier by default.
* At most one `blue` node per diagram. If two nodes feel equally important, the diagram is
  probably trying to say two things — split it or pick one.
* `black` is reserved for a genuine terminal/output node (a diagram that ends in a produced
  value or artifact), never used as a second accent.

## Precedence without color-per-stage

When a diagram shows increasing precedence or override order (Foundation → Platform →
Product, or similar), express the *ordering* with a light→dark neutral step
(`lightGray` → `gray` → darker `gray`), not with a distinct hue per stage. Color is reserved
for the accent discipline above; a rainbow of stage colors competes with it and reads as
decorative rather than structural.

## Connectors recede

Connector strokes are always a dark neutral (`Black` from the connector palette in
`figjam-colors.md`), never colored to match an adjacent node. An edge's job is to show
relationship, not to carry meaning of its own.

**Drop repetitive edge labels.** If every edge in a diagram would carry the same label
(e.g. "referenced by" on every arrow), that label is redundant — the diagram type itself
(a left-to-right reference chain) already says it. Label an edge only when it disambiguates
something the shape alone doesn't (a conditional, a named transformation step, a resolved
value handoff). A diagram with 4+ identical edge labels should have 0 or 1.

## Layout discipline

* One flow direction per diagram (`flowchart LR` is the default for this repo's diagrams —
  matches how English reads and how the architecture layout already works).
* Consistent node size and corner radius across a single diagram — don't let node width
  vary with label length beyond FigJam's own auto-sizing; keep the visual weight even.
* When a diagram has named phases or tiers (Primitive/Semantic/Component,
  Foundation/Platform/Product), add a small header label above each column/group stating
  the phase name once, rather than repeating it inside every node label in that column.
* Multiple parallel chains in one diagram (e.g. two independent reference chains) should
  share the same column alignment and vertical spacing — they should look like restatements
  of the same pattern, not two unrelated diagrams glued together.

## One message per diagram

Every diagram earns a one-sentence figure caption. If you can't write that sentence before
building the diagram, the diagram doesn't have a clear job yet — go back to the article
section and find the one thing it's illustrating. Anything in the diagram that doesn't
serve that sentence gets cut, including "for completeness" nodes.

## Cross-diagram consistency

Across all diagrams on the shared board: same corner radius, same type treatment, same
connector weight, same accent discipline. A reader moving between articles should recognize
the house style, not notice that diagram 5 looks different from diagram 2.

## Review loop

After recoloring and before final export, run the `diagram-critic` agent against the
Mermaid source and a screenshot of the rendered board. It checks for: clutter, weak visual
hierarchy, accent misuse, redundant labels, and whether the one-message caption actually
matches what's on the canvas. Apply its findings in one batch, take one more look if needed,
then stop — this is a bounded check, not an open-ended polish loop.
