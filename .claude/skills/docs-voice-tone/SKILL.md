---
name: docs-voice-tone
description: >-
  Reviews docs-site prose (articles, spec pages, READMEs) against Spectrum's voice
  principles (Clear, Genuine, Concise, Upfront), adapted for public/reference docs rather
  than in-product UI strings. Use after drafting or editing an article, README, or spec
  page, or when asked to check tone/voice on written docs. Complements (run after, not
  instead of) the `humanizer` skill — humanizer strips AI-writing tells; this checks
  Spectrum voice fit on top of clean prose.
license: Apache-2.0
---

# Docs voice & tone (Spectrum-adapted)

Source: Spectrum Voice and Tone Framework, Adobe Design
(spectrum.adobe.com/page/voice-and-tone), Spectrum 2 alignment.

That framework governs **in-product, authenticated UI strings** — buttons, errors,
onboarding. This repo's docs (articles, `/spec/` pages, READMEs, CLI help prose) are
public reference/marketing-adjacent content, not in-product strings, so treat the four
voice principles below as a prose-review lens, not a literal rule (there's no "tone
variant by moment" here — that part of the framework doesn't apply to docs).

## The four voice principles

**Clear** — direct, not buried. One idea per sentence. No jargon left unexplained, no
action buried three clauses in.

* Do: "The `export` command emits the whole dataset as one DTCG document."
* Don't: "The `export` functionality has been designed to facilitate the retrieval of
  the complete resolved token dataset in DTCG-conformant form."

**Genuine** — honest, not performed. No marketing verbs, no claimed enthusiasm, no
significance-inflation about what a change means.

* Do: "This fixes a stale token reference in the article."
* Don't: "This exciting update ensures our documentation stays cutting-edge."

**Concise** — necessary, not more. No padding, no redundant restatement, no hedging
qualifiers that add nothing.

* Do: "Every example below is a real token you can look up on the Tokens page."
* Don't: "It's worth noting that, in general, most of the examples below tend to be
  real tokens that you can typically look up."

**Upfront** — actor and limit disclosed, not implied. Say what's still in progress,
what's provisional, what changed and why, rather than letting a reader assume.

* Do: "The Design Data Specification is still in development; the legacy format keeps
  shipping in the meantime."
* Don't: silently describing a future-state format as if it's already the one people
  should use today.

## How to apply this in review

1. Read the doc once for content correctness first (that's a separate pass — see
   accuracy review conventions elsewhere in this repo). This skill is voice/tone only.
2. Run `humanizer` first if the doc hasn't already been through it — this skill assumes
   AI-writing tells (em dashes, testament/pivotal/showcase, inline-header lists, etc.)
   are already gone. Don't re-litigate those here.
3. Walk the four principles in order (Clear → Genuine → Concise → Upfront) and flag
   violations with the specific line and which principle it breaks. Don't rewrite
   wholesale — this is a targeted pass on top of otherwise-good prose.
4. Common docs-specific failure modes to watch for, mapped to the principle they break:
   * Feature announcements dressed up as significant ("this powerful new capability") →
     **Genuine**.
   * Spec/status ambiguity — describing a draft/in-progress spec section as settled fact
     → **Upfront**.
   * Nested clauses explaining *how* something works before saying *what* it does →
     **Clear**.
   * Restating the heading in the first sentence under it, or repeating a claim already
     made two paragraphs up → **Concise**.
5. Report findings as a short list: `[principle] — [line/quote] — [what to change]`. No
   need for a formal score; this isn't the monetization system's 1–4 rubric, which is
   built for conversion surfaces, not reference docs.

## What NOT to flag

* Technical precision that reads a little dry (API names, exact token names, code
  blocks). Reference docs are allowed to be plain — that's Clear and Concise doing their
  job, not a violation.
* Necessary caveats and version/compatibility notes — that's Upfront, not padding.
* First-person or opinion is not expected here (unlike humanizer's "personality and
  soul" guidance for blog-style writing) unless the doc is explicitly an opinion piece.
  Neutral and plain is correct voice for spec/reference content.
