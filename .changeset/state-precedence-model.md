---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

State model: combined interaction states now resolve per property, with
`keyboard-focus` as a non-layered state between `hover` (50) and `down` (70), so
pressed beats focus beats hover. `prop` states pick the token set and a token
that matches more active states wins before precedence is compared.
`layered` is deprecated: schemas still accept it and resolvers ignore it. The
state registry now carries default precedence (hover 50, focus and
keyboard-focus 60, down and active 70), so components declare precedence only
to deviate. The renderer does not read precedence yet (follow-up work).
