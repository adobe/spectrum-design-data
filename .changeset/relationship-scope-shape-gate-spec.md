---
"@adobe/design-data-spec": minor
---

Add the rule that an engine must refuse a relationship record whose `scope.options` holds a value
shape it does not understand, instead of ignoring the key. The understood shapes are an array of
strings for `state`, and a string, number or boolean (or an array of those) for every other
option. This lets a later version add a shape, such as an any-of across options, without an older
engine silently applying the record to every request.
