---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
---

Add eleven relationship-context terms: `gripper`, `section-header`, `selection`,
`preview` and the item types `tab-item`, `breadcrumb-item`, `navigation-item`,
`menu-item`, `list-view-item`, `tree-view-item` and `segmented-control-item`
(category `item`). Each links to its nearest term with `relatedTerms`.
`breadcrumb item` and `navigation item` move from `pagination` and `navigation`
to their own terms. Plural strings such as `Tab items` stay aliases of the
container term.

SPEC-090 now accepts a `context` string whose main word is a registry alias of
the same term(s) as `contextRole` (`Text` with `[label]`, `Drop shadow` with
`[shadow]`). A case variant or an alias of a different term still warns. No
relationship data changes.
