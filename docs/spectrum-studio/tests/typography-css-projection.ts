// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import {
  buildTypographyCss,
  TEXT_ZOOM_ATTRIBUTE,
} from "../src/features/typography/typographyCss";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import { typographyTokenValues } from "../src/features/typography/typographyTokens";
import {
  TEXT_ZOOM_MAX,
  TEXT_ZOOM_MIN,
  type TypographyDocument,
} from "../src/features/typography/model";
import {
  formatTypographyLength,
  formatTypographyNumber,
} from "../src/features/typography/units";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";
import { SCALE_TYPE_DEFAULTS } from "../src/features/scales/scaleType";
import { TYPOGRAPHY_INTERPOLATIONS } from "../src/features/typography/lineHeightInterpolations";

type Options = NonNullable<Parameters<typeof buildTypographyCss>[1]>;
function uncached(
  document: TypographyDocument,
  {
    scope,
    purpose = "publishing",
    rules = RULE_DEFAULTS,
    scaleTypes = SCALE_TYPE_DEFAULTS,
    interpolations = TYPOGRAPHY_INTERPOLATIONS,
    taxonomy,
    registry,
  }: Options = {},
) {
  if (purpose === "publishing" && document.hideFromPublishing) return "";
  const activeRegistry = registry ?? taxonomy;
  const naming = activeRegistry
    ? { registry: activeRegistry, names: document.metricNames }
    : undefined;
  const selector = (zoom: number) => {
    const attribute = `[${TEXT_ZOOM_ATTRIBUTE}="${zoom}"]`;
    return scope ? `${scope}${attribute}, ${scope} ${attribute}` : attribute;
  };
  const declarations = (zoom: number) =>
    typographyTokenValues(
      generateTypography(document, zoom, rules, scaleTypes, interpolations),
      taxonomy,
      naming,
    ).map(
      ({ group, name, value }) =>
        `  --${name}: ${group.isUnitless ? formatTypographyNumber(value) : formatTypographyLength(value, document.outputUnit)};`,
    );
  const lines = [
    `${scope ?? ":root"}, ${selector(document.textZoom)} {`,
    ...declarations(document.textZoom),
    "}",
  ];
  for (let zoom = TEXT_ZOOM_MIN; zoom <= TEXT_ZOOM_MAX; zoom++)
    if (zoom !== document.textZoom) {
      lines.push("", `${selector(zoom)} {`, ...declarations(zoom), "}");
    }
  return lines.join("\n");
}
function result(build: () => string) {
  try {
    return { status: "ready", value: build() };
  } catch (failure) {
    assert(failure instanceof Error);
    return { status: "error", message: failure.message };
  }
}
const source = createDefaultSnapshot();
const registry = source.taxonomy!;
const before = structuredClone(source);
const renamed = structuredClone(registry);
const metric = source.typography.metricNames["body-lineHeight"];
renamed.terms.find((term) => term.id === metric.termId)!.value =
  "Reading height";
for (const outputUnit of ["px", "rem", "em", "pt"] as const)
  for (const options of [
    {},
    { scope: ".preview", purpose: "authoring", registry },
    { taxonomy: registry },
    { scope: ".preview", taxonomy: registry, registry },
    { scope: ".preview", taxonomy: registry, registry: renamed },
  ] satisfies Options[]) {
    const document = { ...source.typography, outputUnit };
    const actual = buildTypographyCss(document, options);
    assert.equal(
      actual,
      uncached(document, options),
      "Every full CSS byte, name, unit, declaration and zoom selector remains canonical.",
    );
    assert.equal(
      actual.split("\n\n").length,
      TEXT_ZOOM_MAX - TEXT_ZOOM_MIN + 1,
    );
  }
assert.deepEqual(
  source,
  before,
  "Projection batches do not mutate authoring input.",
);
const mutable = structuredClone(registry);
const original = buildTypographyCss(source.typography, { registry: mutable });
mutable.terms.find((term) => term.id === metric.termId)!.value =
  "Reading height";
const changed = buildTypographyCss(source.typography, { registry: mutable });
assert.notEqual(changed, original);
assert.equal(
  changed,
  uncached(source.typography, { registry: mutable }),
  "Caller mutations between calls are revalidated, not permanently trusted.",
);
const invalid = structuredClone(registry);
invalid.categories.push(structuredClone(invalid.categories[0]));
assert.deepEqual(
  result(() => buildTypographyCss(source.typography, { registry: invalid })),
  result(() => uncached(source.typography, { registry: invalid })),
  "Invalid Registry input preserves its explicit canonical error.",
);
assert.equal(
  result(() => buildTypographyCss(source.typography, { registry: invalid }))
    .status,
  "error",
);
invalid.categories.pop();
assert.equal(
  buildTypographyCss(source.typography, { registry: invalid }),
  original,
  "Failed batches leave no stale validation context.",
);
const missing = structuredClone(registry);
missing.terms = missing.terms.filter((term) => term.id !== metric.termId);
assert.deepEqual(
  result(() => buildTypographyCss(source.typography, { registry: missing })),
  result(() => uncached(source.typography, { registry: missing })),
);
assert.equal(
  buildTypographyCss(
    { ...source.typography, hideFromPublishing: true },
    { registry: invalid },
  ),
  "",
);
assert.equal(
  buildTypographyCss(
    { ...source.typography, hideFromPublishing: true },
    { purpose: "authoring", registry },
  ),
  uncached(
    { ...source.typography, hideFromPublishing: true },
    { purpose: "authoring", registry },
  ),
);
console.log(
  "Typography CSS projection: exact complete output across units, both naming inputs, every zoom, mutation safety, validation errors, failed-batch cleanup and publishing behavior passed.",
);
