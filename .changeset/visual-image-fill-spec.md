---
"@adobe/design-data-spec": minor
---

Add an `image` fill to component visual recipes.

A `box` with `image` draws a picture from a `source` (a string option or a literal) with
`fit` (`cover`, `contain`, `fill`, `none`) and `position`, clipped to the box's corners. The
engine reads only `data:image/png;base64` URIs (2 MiB, 4096 px a side, 4 million pixels):
it never fetches a URL or reads a file. A part with no source draws a neutral checkerboard
placeholder; a source that cannot be drawn draws it with a diagnostic.

New rule SPEC-117 checks the declaration. The scene node carries `image` (`href`, `fit`,
`position`, `dest`, `size`, `placeholder`).
