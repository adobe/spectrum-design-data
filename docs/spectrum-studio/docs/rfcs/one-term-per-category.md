<!-- Copyright 2026 Adobe. All rights reserved. -->

# RFC draft: one term per category per token

Status: local draft, not submitted or accepted upstream. Studio's Token editor
term menu follows this rule. The published design-data schema, the Registry
editor and the canonical token corpus are unchanged.

## Problem

A token's classification maps each taxonomy category to the term or terms
that describe it. Categories declare `cardinality`:

* `"one"` allows a single term.
* `"ordered"` allows a list of terms, which naming and projections read in
  order.

A list of terms in one category makes a token harder to read and name, and
tools cannot tell which term is the main one. In practice each category
answers one question about a token, such as "which color role?", and one
answer is enough.

## Proposal

A token holds at most one term in each category, everywhere in Studio and
in the design-data system.

* Classification editors offer only the categories that apply to the token's
  type and tier and that do not already have a term.
* Choosing a term for a category that already has one replaces it.
* Validators report a token that holds more than one term in a category.

## Conflict with existing data

`cardinality: "ordered"` exists to allow several terms, so it conflicts with
this rule. Until this RFC is resolved:

* Studio's Token editor still stores ordered categories as a list, but always
  as a single-item list (`["term-id"]`).
* Existing tokens with several terms in an ordered category keep them. Their
  tags still show and can be removed one at a time. Editing such a tag
  replaces the whole list with the chosen term.
* Naming, projections, the Registry editor and validation are unchanged.

## Open questions

1. Should `cardinality` be removed, or kept with `"one"` as its only value?
2. Which existing tokens hold several terms in one category, and what single
   term should each keep?
3. Should multi-term needs be modelled as separate categories instead?
