// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import { browserSourcesForSnapshot } from "../tokens/browserSavedState";
import {
  canonicalTokenModeKey,
  projectBrowserTokens,
  resolveBrowserTokens,
  tokenModeSetIds,
  tokenValueText,
  type BrowserToken,
} from "../tokens/browserModel";
import { sourceValuePreview, shadowValuePreview } from "../tokens/valuePreview";
import type { TokenImpactRecord } from "../impact/model";
import type { ChangeField, ChangeItem } from "./changes";
import type { AuthoringComparison } from "./registry";
import { sameValue, type SourcePath } from "./contract";
import { parameterOwners, capabilityOwners } from "../modes/parameters";
import {
  modeCombinationCount,
  modeCombinations,
  selectionForModes,
} from "../modes/combinations";
import { elevationOwnerIds } from "../elevation/output";
import { categoricalMemberAxes } from "../color-system/data-vis/axes";
import { isFoundationPublished } from "../foundations/types";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import type { TshirtSemanticRow } from "../design-data/tshirtTypes";
import { formatTshirtName } from "../design-data/tshirtProfile";
import { normalizeBrowserColorOutputs } from "../tokens/colorOutput";
import { dataVisMemberId } from "../color-system/data-vis/identity";
import { withTaxonomyProjection } from "../taxonomy/model";

interface ValueRow {
  id: string;
  token: BrowserToken;
  modeKey: string;
  label: string;
  contexts: { key: string; label: string }[];
}
export interface TokenComparison {
  items: ChangeItem[];
  records: TokenImpactRecord[];
}
function modeLabel(key: string, snapshot: EditSessionSnapshot): string {
  const pairs: [string, string][] = JSON.parse(key);
  return (
    pairs
      .map(([setId, modeId]) => {
        const set = snapshot.modeSets.find((axis) => axis.id === setId);
        return `${set?.name ?? setId}: ${set?.modes.find((mode) => mode.id === modeId)?.name ?? modeId}`;
      })
      .join(" / ") || "Default"
  );
}
function scopeKey(
  token: BrowserToken,
  snapshot: EditSessionSnapshot,
  fullKey: string,
  other?: EditSessionSnapshot,
  allowMissing = false,
): string {
  const owners = parameterOwners(snapshot.modeSets);
  const axes = new Set<string>();
  const addOwner = (id: string) => {
    if (owners[id]) axes.add(owners[id]);
  };
  if (token.dataVis) {
    const scale = snapshot.colorSystem.dataVisScales.find(
      (candidate) => candidate.id === token.dataVis?.scaleId,
    );
    const member =
      scale?.kind === "categorical"
        ? scale.members.find(
            (candidate) => candidate.id === token.dataVis?.memberId,
          )
        : undefined;
    if (!scale || !member) {
      if (!allowMissing)
        throw new Error("A categorical Changes value has no authored member.");
    } else
      for (const axis of categoricalMemberAxes(
        scale.id,
        member,
        snapshot.modeSets,
        snapshot.browserTokenEdits ?? {},
        scale,
      ))
        axes.add(axis);
  } else if (token.type === "elevation") {
    for (const axis of elevationOwnerIds(snapshot.modeSets)) axes.add(axis);
  } else if (token.type === "colors" && !token.paletteColorId) {
    for (const key of [
      "color.backgroundScaleId",
      "color.backgroundLightness",
      "color.contrastMultiplier",
    ])
      addOwner(key);
    const scaleOwner = capabilityOwners(snapshot.modeSets)["color.scales"];
    if (scaleOwner) axes.add(scaleOwner);
  } else if (token.type === "typography") {
    addOwner("typography.textZoom");
  } else if (
    token.type === "spacing" ||
    token.type === "size" ||
    token.type === "radius"
  ) {
    const scale = snapshot[token.type]?.scales.find(
      (candidate) => candidate.id === token.groupId,
    );
    for (const binding of Object.values(scale?.bindings ?? {}))
      addOwner(binding.modeParameterId);
  }
  for (const key of Object.keys(
    snapshot.browserTokenEdits?.[token.id]?.values ?? {},
  )) {
    for (const axis of tokenModeSetIds(key)) axes.add(axis);
  }
  if (other)
    for (const axis of tokenModeSetIds(
      scopeKey(token, other, fullKey, undefined, true),
    ))
      axes.add(axis);
  const pairs: [string, string][] = JSON.parse(fullKey);
  return canonicalTokenModeKey(
    Object.fromEntries(pairs.filter(([id]) => axes.has(id))),
  );
}
function primitiveRows(
  snapshot: EditSessionSnapshot,
  other: EditSessionSnapshot,
): Map<string, Map<string, ValueRow>> {
  if (!snapshot.taxonomy)
    throw new Error("Changes requires the authored Registry.");
  return withTaxonomyProjection(snapshot.taxonomy, () =>
    projectPrimitiveRows(snapshot, other),
  );
}

function projectPrimitiveRows(
  snapshot: EditSessionSnapshot,
  other: EditSessionSnapshot,
): Map<string, Map<string, ValueRow>> {
  const axes = snapshot.modeSets.filter((axis) => axis.modes.length);
  if (modeCombinationCount(axes) > 4096) {
    throw new Error(
      "Too many authored mode combinations to assess Changes. No values were omitted.",
    );
  }
  const combinations = modeCombinations(axes);
  const result = new Map<string, Map<string, ValueRow>>();
  if (!snapshot.taxonomy)
    throw new Error("Changes requires the authored Registry.");
  for (const modes of combinations) {
    const key = canonicalTokenModeKey(selectionForModes(axes, modes));
    const sources = browserSourcesForSnapshot(snapshot, modes);
    const finalUiValues = new Map(
      sources
        .filter((source) => source.type === "colors" && !source.dataVis)
        .map((source) => [source.id, String(source.value)]),
    );
    const tokens = projectBrowserTokens(
      normalizeBrowserColorOutputs(
        resolveBrowserTokens(sources, snapshot.browserTokenEdits ?? {}, key),
        snapshot.colorSystem.settings.colorOutput,
        finalUiValues,
      ),
      snapshot.taxonomy,
    );
    for (const token of tokens) {
      if (
        token.type === "typography" &&
        !isFoundationPublished(snapshot.typography)
      )
        continue;
      if (token.validationError) throw new Error(token.validationError);
      const scope = scopeKey(token, snapshot, key, other);
      const values = result.get(token.id) ?? new Map<string, ValueRow>();
      const previous = values.get(scope);
      if (previous && !sameValue(previous.token.value, token.value))
        throw new Error(
          "Changes found inconsistent values for one owned mode identity.",
        );
      if (previous)
        previous.contexts.push({ key, label: modeLabel(key, snapshot) });
      else
        values.set(scope, {
          id: `${token.id}:${scope}`,
          token,
          modeKey: key,
          label: modeLabel(scope, snapshot),
          contexts: [{ key, label: modeLabel(key, snapshot) }],
        });
      result.set(token.id, values);
    }
  }
  return result;
}
function startsWith(path: SourcePath, prefix: SourcePath) {
  return prefix.every((part, index) => sameValue(part, path[index]));
}
function dependencyPaths(
  token: Pick<
    BrowserToken,
    | "id"
    | "type"
    | "groupId"
    | "dataVis"
    | "paletteColorId"
    | "taxonomySource"
    | "projection"
  >,
  snapshot: EditSessionSnapshot,
  modeKey: string,
): SourcePath[] {
  const paths: SourcePath[] = [];
  const entity = (
    domain: string,
    collection: string | undefined,
    id: string,
  ): SourcePath => [
    domain,
    ...(collection ? [collection] : []),
    { key: "id", id },
  ];
  if (token.type === "colors")
    paths.push(["colorSystem", "settings", "colorOutput"]);
  const uiScale = (scaleId: string, contrastId?: string) => {
    paths.push(entity("colorSystem", "scales", scaleId));
    if (contrastId) paths.push(entity("colorSystem", "contrasts", contrastId));
    const scale = snapshot.colorSystem.scales.find(
      (candidate) => candidate.id === scaleId,
    );
    for (const stop of scale?.stops ?? [])
      if (stop.paletteColorId)
        paths.push(entity("colorSystem", "palette", stop.paletteColorId));
    if (scale?.customContrasts)
      paths.push(
        entity("rules", undefined, scale.customContrasts.namingRuleId),
      );
    for (const key of [
      "settings",
      "background",
      "backgroundScaleId",
      "backgroundLightness",
    ])
      paths.push(["colorSystem", key]);
    if (snapshot.colorSystem.backgroundScaleId !== scaleId) {
      paths.push(
        entity("colorSystem", "scales", snapshot.colorSystem.backgroundScaleId),
      );
    }
  };
  if (token.paletteColorId)
    paths.push(entity("colorSystem", "palette", token.paletteColorId));
  else if (token.dataVis) {
    paths.push(entity("colorSystem", "dataVisScales", token.dataVis.scaleId));
    paths.push(["colorSystem", "settings", "colorOutput"]);
    const source = token.dataVis.source;
    if (!token.dataVis.static && source.kind === "ui-swatch")
      uiScale(source.scaleId, source.contrastId);
  } else if (token.type === "colors") {
    uiScale(token.groupId, token.taxonomySource?.stepId);
  } else if (token.type === "typography") {
    for (const key of [
      "scaleTypeId",
      "smallSizes",
      "largeSizes",
      "componentSize",
      "textZoom",
      "minTextSize",
      "maxTextSize",
      "textRoundingRuleId",
      "hideFromPublishing",
    ]) {
      paths.push(["typography", key]);
    }
    paths.push(["typography", "metricNames", token.groupId]);
    const formula = snapshot.scaleTypes?.find(
      (candidate) => candidate.id === snapshot.typography.scaleTypeId,
    );
    paths.push(
      entity("scaleTypes", undefined, snapshot.typography.scaleTypeId),
      entity("rules", undefined, snapshot.typography.textRoundingRuleId),
    );
    if (formula?.textSizeAdaptation)
      paths.push(
        entity(
          "interpolations",
          undefined,
          formula.textSizeAdaptation.interpolationId,
        ),
      );
    const needsLineHeight =
      /-(?:unitlessLineHeight|lineHeight)$/.test(token.groupId) ||
      (token.groupId === "workflow-icon-size" &&
        snapshot.typography.iconography.alignment === "line-height");
    if (token.groupId === "workflow-icon-size")
      paths.push(["typography", "iconography"]);
    if (needsLineHeight) {
      paths.push(
        ["typography", "lineHeights"],
        ["typography", "lineHeightRoundingRuleId"],
        entity(
          "rules",
          undefined,
          snapshot.typography.lineHeightRoundingRuleId,
        ),
      );
      const lineId =
        token.groupId === "workflow-icon-size" &&
        snapshot.typography.iconography.alignment === "line-height"
          ? snapshot.typography.iconography.lineHeightId
          : token.groupId.replace(/-(?:unitlessLineHeight|lineHeight)$/, "");
      const lineHeight = snapshot.typography.lineHeights.find(
        (candidate) => candidate.id === lineId,
      );
      if (lineHeight?.isAdaptive)
        paths.push(
          entity(
            "interpolations",
            undefined,
            lineHeight.adaptive.interpolationId,
          ),
        );
    }
  } else if (token.type === "elevation") {
    paths.push(["elevation"]);
    for (const layer of snapshot.elevation?.layers ?? [])
      paths.push(entity("scaleTypes", undefined, layer.scaleTypeId));
  } else if (
    token.type === "spacing" ||
    token.type === "size" ||
    token.type === "radius"
  ) {
    const scale = snapshot[token.type]?.scales.find(
      (candidate) => candidate.id === token.groupId,
    );
    paths.push(entity(token.type, "scales", token.groupId));
    if (scale) {
      paths.push(
        entity("scaleTypes", undefined, scale.scaleTypeId),
        entity("rules", undefined, scale.roundingRuleId),
      );
      if (
        snapshot[token.type]?.pendingRules?.some(
          (rule) => rule.id === scale.roundingRuleId,
        )
      )
        paths.push([token.type, "pendingRules"]);
    }
  }
  const pairs: [string, string][] = JSON.parse(modeKey);
  for (const [setId, modeId] of pairs)
    paths.push([
      "modeSets",
      { key: "id", id: setId },
      "modes",
      { key: "id", id: modeId },
      "foundations",
      token.type === "colors" ? "color" : token.type,
    ]);
  const classification =
    token.taxonomySource?.governed ?? token.projection?.classification ?? {};
  for (const [categoryId, termId] of Object.entries(classification)) {
    paths.push(entity("taxonomy", "categories", categoryId));
    if (typeof termId === "string")
      paths.push(entity("taxonomy", "terms", termId));
  }
  paths.push(["taxonomy", "classifications", token.id]);
  return paths;
}
function upstream(
  paths: SourcePath[],
  authored: AuthoringComparison,
): NonNullable<ChangeItem["upstream"]> {
  return authored.groups.flatMap((group) =>
    group.items.flatMap((item) =>
      item.fields.flatMap((field) =>
        field.address &&
        paths.some((prefix) => startsWith(field.address!.path, prefix))
          ? [{ title: `${item.title} / ${field.key}`, address: field.address }]
          : [],
      ),
    ),
  );
}
export function comparePrimitiveTokens(
  shipped: EditSessionSnapshot,
  working: EditSessionSnapshot,
  authored: AuthoringComparison,
): TokenComparison {
  const before = primitiveRows(shipped, working),
    after = primitiveRows(working, shipped);
  const items: ChangeItem[] = [],
    records: TokenImpactRecord[] = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const left = before.get(id) ?? new Map<string, ValueRow>(),
      right = after.get(id) ?? new Map<string, ValueRow>();
    const original = left.values().next().value as ValueRow | undefined,
      latest = right.values().next().value as ValueRow | undefined;
    const token = latest?.token ?? original!.token;
    const fields: ChangeField[] = [];
    for (const [key, oldValue, newValue] of [
      ["Name", original?.token.name, latest?.token.name],
      ["Description", original?.token.description, latest?.token.description],
      ["Status", original?.token.status, latest?.token.status],
    ] as const)
      if (oldValue !== newValue) {
        const property =
          key === "Name"
            ? "name"
            : key === "Description"
              ? "description"
              : "status";
        const edit = working.browserTokenEdits?.[id]?.[property];
        const legacyName =
          key === "Name" ? working.tokenOverrides[id]?.name : undefined;
        fields.push({
          id: key,
          key,
          before: oldValue,
          after: newValue,
          generated: key === "Name" && !latest?.token.nameOverridden,
          ...(edit !== undefined
            ? {
                address: {
                  path: ["browserTokenEdits", id, property],
                  expected: edit,
                },
              }
            : legacyName !== undefined
              ? {
                  address: {
                    path: ["tokenOverrides", id, "name"],
                    expected: legacyName,
                  },
                }
              : {}),
        });
      }
    const values: TokenImpactRecord["modeValues"] = [];
    let manuallyOverridden = false;
    const dependencies: SourcePath[] = [];
    for (const key of new Set([...left.keys(), ...right.keys()])) {
      const old = left.get(key),
        next = right.get(key);
      const changed = !sameValue(old?.token.value, next?.token.value);
      values.push({ valueId: `${id}:${key}`, changed });
      manuallyOverridden ||= next?.token.valueOverridden ?? false;
      if (next)
        dependencies.push(
          ...dependencyPaths(next.token, working, next.modeKey),
        );
      const edit =
        next && working.browserTokenEdits?.[id]?.values[next.modeKey];
      const legacy = working.tokenOverrides[id];
      const staticScale = next?.token.dataVis?.static
        ? working.colorSystem.dataVisScales.find(
            (scale) => scale.id === next.token.dataVis?.scaleId,
          )
        : undefined;
      const staticColor =
        staticScale?.kind === "categorical"
          ? staticScale.staticColors?.find(
              (color) => color.id === next?.token.dataVis?.memberId,
            )
          : undefined;
      const address =
        staticColor?.overrideValue !== undefined
          ? {
              path: [
                "colorSystem",
                "dataVisScales",
                { key: "id" as const, id: staticScale!.id },
                "staticColors",
                { key: "id" as const, id: staticColor.id },
                "overrideValue",
              ],
              expected: staticColor.overrideValue,
            }
          : !next?.token.dataVis?.static && edit
            ? {
                path: ["browserTokenEdits", id, "values", next!.modeKey],
                expected: edit,
              }
            : !next?.token.dataVis?.static && legacy?.value !== undefined
              ? {
                  path: ["tokenOverrides", id, "value"],
                  expected: legacy.value,
                }
              : undefined;
      if (changed)
        fields.push({
          id: `value:${key}`,
          key: "Value",
          context: { key, label: next?.label ?? old!.label },
          before: old && tokenValueText(old.token),
          after: next && tokenValueText(next.token),
          generated: !!next && !next.token.valueOverridden,
          address,
          tokenValue: {
            tokenId: id,
            modeKey: next?.modeKey ?? old!.modeKey,
            shippedValue: old?.token.value,
            contexts: next?.contexts ?? old!.contexts,
          },
          ...(old && { beforePreview: sourceValuePreview(old.token) }),
          ...(next && { afterPreview: sourceValuePreview(next.token) }),
        });
      if (next?.token.valueOverridden && !old?.token.valueOverridden)
        fields.push({
          id: `override:${key}`,
          key: "Manual override",
          context: { key, label: next.label },
          before: "No",
          after: "Yes",
          address,
        });
    }
    records.push({
      tokenId: id,
      tier: "primitive",
      category: token.type === "colors" ? "color" : token.type,
      modeValues: values,
      nameChanged: original?.token.name !== latest?.token.name,
      metadataChanged:
        original?.token.description !== latest?.token.description ||
        original?.token.status !== latest?.token.status,
      manuallyOverridden,
    });
    if (fields.length)
      items.push({
        id,
        conceptId: id,
        topic: "tokens",
        sourceKind: "token",
        kind: !left.size
          ? "new"
          : !right.size
            ? "removed"
            : latest?.token.status === "deprecated" &&
                original?.token.status !== "deprecated"
              ? "deprecated"
              : "modified",
        title: token.name,
        fields,
        upstream: upstream(dependencies, authored),
      });
  }
  return { items, records };
}
function semanticPreview(row: TshirtSemanticRow) {
  return row.target.shadows
    ? shadowValuePreview(row.target.shadows)
    : sourceValuePreview({
        value: row.target.value,
        type: row.target.family === "color" ? "colors" : row.target.family,
        groupId: row.structureId,
        unit: row.target.unit === "px" ? "px" : "",
        semantic: row,
      });
}
export function compareSemanticTokens(
  shipped: EditSessionSnapshot,
  working: EditSessionSnapshot,
  authored: AuthoringComparison,
): TokenComparison {
  const group = (snapshot: EditSessionSnapshot) => {
    const result = new Map<string, Map<string, TshirtSemanticRow>>();
    for (const row of buildTshirtArtifacts(snapshot).semantics) {
      const rows =
        result.get(row.conceptId) ?? new Map<string, TshirtSemanticRow>();
      rows.set(row.token.uuid, row);
      result.set(row.conceptId, rows);
    }
    return result;
  };
  const before = group(shipped),
    after = group(working),
    items: ChangeItem[] = [],
    records: TokenImpactRecord[] = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const left = before.get(id) ?? new Map<string, TshirtSemanticRow>(),
      right = after.get(id) ?? new Map<string, TshirtSemanticRow>();
    const original = left.values().next().value as
        | TshirtSemanticRow
        | undefined,
      latest = right.values().next().value as TshirtSemanticRow | undefined;
    const fields: ChangeField[] = [],
      values: TokenImpactRecord["modeValues"] = [],
      referenceValues: TokenImpactRecord["modeValues"] = [];
    let referenceChanged = false;
    const title = formatTshirtName((latest ?? original!).token.name);
    const previousName = original && formatTshirtName(original.token.name),
      nextName = latest && formatTshirtName(latest.token.name);
    if (previousName !== nextName)
      fields.push({
        id: "name",
        key: "Name",
        before: previousName,
        after: nextName,
        generated: true,
      });
    const paths: SourcePath[] = [];
    for (const uuid of new Set([...left.keys(), ...right.keys()])) {
      const old = left.get(uuid),
        next = right.get(uuid),
        row = next ?? old!;
      const key = canonicalTokenModeKey(row.selection);
      const context = {
        key: uuid,
        label: modeLabel(key, next ? working : shipped),
      };
      const changed = !sameValue(
        old?.target.shadows ?? old?.target.value,
        next?.target.shadows ?? next?.target.value,
      );
      values.push({ valueId: uuid, changed });
      if (old?.token.$ref !== undefined || next?.token.$ref !== undefined)
        referenceValues.push({
          valueId: uuid,
          changed: old?.token.$ref !== next?.token.$ref,
        });
      if (old?.token.$ref !== next?.token.$ref) {
        referenceChanged = true;
        fields.push({
          id: `reference:${uuid}`,
          key: "Reference",
          context,
          before: old?.token.$ref,
          after: next?.token.$ref,
          generated: true,
        });
      }
      const output = (value: TshirtSemanticRow | undefined) =>
        value
          ? "$ref" in value.token
            ? "Reference"
            : "Generated literal"
          : undefined;
      if (output(old) !== output(next))
        fields.push({
          id: `output:${uuid}`,
          key: "Output",
          context,
          before: output(old),
          after: output(next),
          generated: true,
        });
      if (changed)
        fields.push({
          id: `value:${uuid}`,
          key: "Value",
          context,
          before: old && String(old.target.value),
          after: next && String(next.target.value),
          generated: true,
          ...(old && { beforePreview: semanticPreview(old) }),
          ...(next && { afterPreview: semanticPreview(next) }),
        });
      paths.push([
        "structures",
        "structures",
        { key: "conceptId", id: row.structureId },
      ]);
      for (const ruleId of row.ruleIds)
        paths.push(["rules", { key: "id", id: ruleId }]);
      if (row.target.family === "color") {
        const scale = working.colorSystem.dataVisScales.find(
          (candidate) => candidate.id === row.target.sourceId,
        );
        const member =
          scale?.kind === "categorical"
            ? scale.members.find(
                (candidate) =>
                  dataVisMemberId(scale.id, candidate.id) ===
                  row.target.nativeId,
              )
            : undefined;
        if (scale && member)
          paths.push(
            ...dependencyPaths(
              {
                id: row.target.nativeId,
                type: "colors",
                groupId: scale.id,
                dataVis: {
                  scaleId: scale.id,
                  memberId: member.id,
                  source: member.source,
                  ordinal: row.target.step ?? 0,
                  hidden: scale.hideFromPublishing ?? false,
                  static: scale.staticColors !== undefined,
                },
              },
              working,
              key,
            ),
          );
        else
          paths.push([
            "colorSystem",
            "dataVisScales",
            { key: "id", id: row.target.sourceId },
          ]);
      } else
        paths.push(
          ...dependencyPaths(
            {
              id: row.target.nativeId,
              type: row.target.family,
              groupId: row.target.metricId ?? row.target.sourceId,
            },
            working,
            key,
          ),
        );
      for (const [categoryId, termId] of Object.entries(row.classification)) {
        paths.push(
          ["taxonomy", "categories", { key: "id", id: categoryId }],
          ["taxonomy", "terms", { key: "id", id: termId }],
        );
      }
      paths.push(
        ["browserTokenEdits", row.target.nativeId],
        ["tokenOverrides", row.target.nativeId],
      );
    }
    records.push({
      tokenId: id,
      tier: "semantic",
      category: "structures",
      modeValues: values,
      nameChanged: previousName !== nextName,
      referenceChanged,
      referenceValues,
      referenceAssessment: "assessed",
      manuallyOverridden: false,
    });
    if (fields.length)
      items.push({
        id,
        conceptId: id,
        topic: "tokens",
        sourceKind: "semantic-token",
        kind: !left.size ? "new" : !right.size ? "removed" : "modified",
        title,
        fields,
        upstream: upstream(paths, authored),
      });
  }
  return { items, records };
}
