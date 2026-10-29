// Copyright 2026 Adobe. All rights reserved.
import type {
  GeneratedTypographyToken,
  TypographyDocument,
  TypographyMetricId,
} from "./model";
import type { TypographyUnit } from "./units";
import {
  assertTaxonomy,
  resolveSourceClassification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import { registeredSourceName } from "../taxonomy/naming";
import { foundationNameSegment } from "../taxonomy/formatting";
import { governedFoundationContext } from "../taxonomy/foundationGovernance";
import { projectClassification } from "../taxonomy/model";

export const NOMINAL_FONT_SIZE_MEASUREMENT = {
  kind: "nominal-font-size",
  unit: "px",
  reference:
    "CSS font-size: nominal em-square size, not measured glyph width or height",
} as const;

export interface TypographyTokenGroup {
  id: TypographyMetricId;
  label: string;
  isUnitless?: boolean;
  measurement?: typeof NOMINAL_FONT_SIZE_MEASUREMENT;
  value: (token: GeneratedTypographyToken) => number;
}

export function typographyTokenGroups(
  source:
    | Pick<TypographyDocument, "lineHeights">
    | readonly GeneratedTypographyToken[],
  naming?: TypographyNamingContext,
): TypographyTokenGroup[] {
  const ids =
    "lineHeights" in source
      ? source.lineHeights.map((card) => card.id)
      : Object.keys(source[0]?.lineHeights ?? {});
  const label = (id: string) => {
    const reference = naming?.names?.[`${id}-lineHeight`];
    const name =
      naming && reference
        ? registeredSourceName(
            naming.registry,
            reference,
            "typography",
          ).replace(/-lineHeight$/, "")
        : id;
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  };
  return [
    {
      id: "font-size",
      label: "Font size",
      measurement: NOMINAL_FONT_SIZE_MEASUREMENT,
      value: (token) => token.fontSize,
    },
    ...ids.flatMap((id): TypographyTokenGroup[] => [
      {
        id: `${id}-lineHeight`,
        label: `${label(id)} line height`,
        value: (token) => token.lineHeights[id].length,
      },
      {
        id: `${id}-unitlessLineHeight`,
        label: `${label(id)} unitless line height`,
        isUnitless: true,
        value: (token) => token.lineHeights[id].multiplier,
      },
    ]),
    {
      id: "workflow-icon-size",
      label: "Icon size",
      value: (token) => token.iconSize,
    },
  ];
}

export interface TypographyNamingContext {
  names?: TypographyDocument["metricNames"];
  registry: TaxonomyDocument;
  outputUnit?: TypographyUnit;
}

export function typographyTokenName(
  group: Pick<TypographyTokenGroup, "id">,
  token: GeneratedTypographyToken,
  naming?: TypographyNamingContext,
) {
  const reference = naming?.names?.[group.id];
  if (naming && !reference)
    throw new Error(
      `Typography metric ${group.id} has no registered name reference.`,
    );
  const name =
    naming && reference
      ? registeredSourceName(naming.registry, reference, "typography")
      : group.id;
  if (naming && reference) {
    const context = governedFoundationContext(
      naming.registry,
      "typography",
      reference,
      `typography:${group.id}`,
      token.scale,
    );
    const projection = projectClassification(
      naming.registry,
      context.governed!,
      "typography",
    );
    if (projection.issues.length) throw new Error(projection.issues.join(" "));
    return projection.name;
  }
  return `${foundationNameSegment(name)}-${token.scale}`;
}

export function typographyTokenValues(
  tokens: readonly GeneratedTypographyToken[],
  taxonomy?: TaxonomyDocument,
  naming?: TypographyNamingContext,
) {
  if (taxonomy) assertTaxonomy(taxonomy);
  const values = typographyTokenGroups(tokens, naming).flatMap((group) =>
    tokens.map((token) => ({
      group,
      name: typographyTokenName(group, token, naming),
      id: `typography-${group.id}-${token.scale}`,
      scale: token.scale,
      value: group.value(token),
    })),
  );
  if (!taxonomy) return values;
  const owners = new Map<string, string>();
  return values.map((token) => {
    const reference = naming?.names?.[token.group.id];
    const context = reference
      ? governedFoundationContext(
          taxonomy,
          "typography",
          reference,
          `typography:${token.group.id}`,
          token.scale,
        )
      : { id: `typography:${token.group.id}`, stepId: String(token.scale) };
    const projection = resolveSourceClassification(
      taxonomy,
      token.id,
      {
        property: "typography",
        typographyMetric: token.group.id,
        scaleIndex: token.scale,
      },
      "typography",
      context,
    );
    if (projection.issues.length)
      throw new Error(
        `${token.id}: taxonomy CSS export blocked. ${projection.issues.join(" ")}`,
      );
    const key = projection.name.toLowerCase();
    if (owners.has(key))
      throw new Error(
        `Taxonomy CSS export blocked: serialized-name collision ${projection.name}.`,
      );
    owners.set(key, token.id);
    return { ...token, name: projection.name };
  });
}
