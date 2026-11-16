---
"@adobe/design-data-spec": minor
---

An engine MUST refuse a relationship record whose `scope` has a field it does not know
(`component`, `part`, `property` and `options` are the known ones), and MUST NOT ignore it. This
is the gate that ships before new scope fields (`between`, bead p6ga.21.24) are allowed in data,
so an engine built before them fails loudly instead of treating two records that differ only by
such a field as identical.
