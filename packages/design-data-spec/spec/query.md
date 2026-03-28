# Query notation

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **query filter notation**: a concise syntax for selecting tokens from a dataset by matching against structured token fields.

## Filter notation

A **filter expression** is a string that describes a set of conditions a token must satisfy to be included in the result. The notation uses `key=value` pairs combined with logical operators.

| Operator | Syntax           | Meaning                                                 |
| -------- | ---------------- | ------------------------------------------------------- |
| `=`      | `key=value`      | Field `key` equals `value`.                             |
| `!=`     | `key!=value`     | Field `key` does not equal `value`.                     |
| `,`      | `a=x,b=y`        | Logical AND — both conditions must match.               |
| `\|`     | `a=x\|b=y`       | Logical OR — at least one condition must match.          |
| `*`      | `key=patt*ern`   | Glob wildcard — `*` matches zero or more characters.    |

## Supported keys

**NORMATIVE:** Implementations **MUST** support the following keys:

| Key              | Source                      | Description                                      |
| ---------------- | --------------------------- | ------------------------------------------------ |
| `property`       | `name.property`             | Token property identifier.                       |
| `component`      | `name.component`            | Associated component name.                       |
| `variant`        | `name.variant`              | Component variant.                               |
| `state`          | `name.state`                | Component or interaction state.                  |
| `colorScheme`    | `name.colorScheme`          | Color scheme dimension value.                    |
| `scale`          | `name.scale`                | Scale dimension value.                           |
| `contrast`       | `name.contrast`             | Contrast dimension value.                        |
| `uuid`           | `uuid`                      | Token UUID (top-level field).                    |
| `$schema`        | `$schema`                   | Token schema URL (top-level field).              |

**NORMATIVE:** Implementations **MUST** reject filter expressions containing keys not listed above with a parse error. Future spec versions MAY add keys.

**RATIONALE:** Restricting keys to a known set ensures that typos are caught early and that all implementations agree on which fields are queryable. This also enables implementations to build indexes for supported keys.

## Formal grammar

The following EBNF defines the filter expression syntax:

```ebnf
filter-expr = or-expr ;
or-expr     = and-expr { "|" and-expr } ;
and-expr    = condition { "," condition } ;
condition   = key operator value ;
key         = (letter | "$") { letter | digit | "$" | "_" } ;
operator    = "=" | "!=" ;
value       = { value-char } ;
value-char  = letter | digit | "-" | "_" | "." | "/" | ":" | "*" ;
letter      = "A"-"Z" | "a"-"z" ;
digit       = "0"-"9" ;
```

**NORMATIVE:** Whitespace around operators and delimiters is **NOT** significant and **MUST** be trimmed by the parser.

**NORMATIVE:** An empty filter expression **MUST** match all tokens (universal match).

## Operator precedence

**NORMATIVE:** The `,` (AND) operator binds more tightly than `|` (OR).

The expression `a=x,b=y|c=z` is equivalent to `(a=x AND b=y) OR (c=z)`.

**NORMATIVE:** Parentheses for grouping are **NOT** supported in `1.0.0-draft`. Implementations **MUST** reject parentheses with a parse error.

**RATIONALE:** Avoiding parentheses keeps the notation simple and shell-friendly. Most practical queries are either pure AND or pure OR; mixed expressions with the defined precedence cover the remaining common cases.

## Evaluation semantics

**NORMATIVE:** A filter expression is evaluated independently against each token in the dataset. A token is included in the result if and only if the expression evaluates to `true` for that token.

**NORMATIVE:** For equality (`=`), a condition matches when the token's field value equals the specified value. If the token does not have the field, the condition does **NOT** match.

**NORMATIVE:** For negation (`!=`), a condition matches when the token's field value does not equal the specified value **OR** the field is absent. A missing field satisfies `!=`.

**RATIONALE:** Negation matching absent fields follows the convention that "not equal to X" includes "does not exist" — the same semantics as label selectors in Kubernetes and CSS attribute selectors.

## Glob matching

**NORMATIVE:** The `*` character in a value is a **glob wildcard** matching zero or more characters.

**NORMATIVE:** Glob matching is **case-sensitive**.

**NORMATIVE:** Multiple `*` characters in a single value are permitted and each independently matches zero or more characters.

**NORMATIVE:** To match a literal `*` character, there is no escape mechanism in `1.0.0-draft`. Future versions MAY define one.

## Examples

### Select all tokens for a specific component

```
component=button
```

Matches tokens whose `name.component` is `"button"`.

### Select tokens matching multiple criteria

```
component=button,state=hover
```

Matches tokens where `name.component` is `"button"` **AND** `name.state` is `"hover"`.

### Select tokens for either of two properties

```
property=background-color|property=border-color
```

Matches tokens whose `name.property` is `"background-color"` **OR** `"border-color"`.

### Select color tokens using wildcard

```
property=color-*
```

Matches tokens whose `name.property` starts with `"color-"` (e.g. `color-default`, `color-hover`).

### Exclude a specific color scheme

```
component=button,colorScheme!=light
```

Matches button tokens that are **not** in the `light` color scheme. Tokens without a `colorScheme` field also match (absent field satisfies `!=`).

## References

* [#714 — Design Data Specification](https://github.com/adobe/spectrum-design-data/discussions/714)
* [#777 — Phase 3: Query notation definition](https://github.com/adobe/spectrum-design-data/issues/777)
