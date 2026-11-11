// Copyright 2026 Adobe. All rights reserved.
import { canonicalJson } from "../design-data/canonicalJson";
import {
  buildTshirtArtifacts,
  type TshirtAuthoringSource,
} from "../design-data/tshirtArtifacts";
import {
  canonicalAliasRows,
  completeAliasSource,
  type CanonicalAliasRow,
} from "../tokens/aliasTargets";
import { canonicalTokenDefinitions } from "../tokens/canonicalCatalogue";
import {
  canonicalPrimitiveProperties,
  tokenIdentity,
  tokenIdentityRow,
  reconcileTokenIdentityRows,
  type TokenIdentity,
} from "../tokens/canonicalIdentity";
import { componentTokenCatalog } from "../components/references";
import type { ComponentsDocument } from "../components/model";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import type { BrowserTokenEdits } from "../tokens/browserEditTypes";
import { tokenUuid } from "../tokens/model";

function serializedName(row: CanonicalAliasRow, axes: Set<string>) {
  const name =
    row.token.semantic?.token.name ?? row.token.projection?.flat ?? {};
  const result = Object.fromEntries(
    Object.entries(name).filter(
      ([key]) => !axes.has(key) && key !== "legacyKey",
    ),
  );
  const property = canonicalPrimitiveProperties[row.token.type];
  if (!result.property && property) result.property = property;
  if (
    row.token.type === "typography" &&
    result.element === "text" &&
    result.property === "size"
  ) {
    delete result.element;
    result.property = `font-size-${result.scaleIndex}`;
  } else if (row.token.type === "colors" && result.property === "color") {
    if (typeof result.colorName === "string") {
      result.colorFamily = result.colorName;
      delete result.colorName;
    }
    if (
      typeof result.contrastValue === "string" &&
      /^\d+$/.test(result.contrastValue)
    ) {
      result.scaleIndex = Number(result.contrastValue);
      delete result.contrastValue;
    }
  }
  if (typeof result.scaleIndex === "string" && /^\d+$/.test(result.scaleIndex))
    result.scaleIndex = Number(result.scaleIndex);
  return result;
}

/** Reconcile authored identities once; generation only reads the resulting publications. */
export function upgradeCanonicalTokenIdentities<
  T extends TshirtAuthoringSource & { components?: ComponentsDocument },
>(snapshot: T, allocations = new Map<string, string>()): T {
  const source = completeAliasSource(snapshot);
  for (const edit of Object.values(source.browserTokenEdits)) {
    const identity = edit.authoring?.identity;
    if (!identity) continue;
    const conceptKey = `concept:${identity.sourceId}`;
    if (!allocations.has(conceptKey))
      allocations.set(conceptKey, identity.conceptId);
    for (const [context, uuid] of Object.entries(identity.rows)) {
      const rowKey = `row:${identity.sourceId}:${context}`;
      if (!allocations.has(rowKey)) allocations.set(rowKey, uuid);
    }
  }
  const allocate = (key: string) => {
    let id = allocations.get(key);
    if (!id) {
      id = crypto.randomUUID();
      allocations.set(key, id);
    }
    return id;
  };
  const bundle = buildTshirtArtifacts(snapshot);
  // Styles already own durable concept and mode-row publications.
  const rows = canonicalAliasRows(source, bundle, "preserve-for-review").filter(
    (row) => !row.token.style && !row.token.fontId,
  );
  const contexts = new Map<string, Set<string>>();
  for (const row of rows) {
    const coordinate = row.token.sourceId ?? row.token.id;
    const required = contexts.get(coordinate) ?? new Set<string>();
    required.add(row.context);
    contexts.set(coordinate, required);
  }
  const reconciledEdits = reconcileTokenIdentityRows(
    source.browserTokenEdits,
    source.modeSets,
    source.modeSets,
    contexts,
    (sourceId, context) => allocate(`row:${sourceId}:${context}`),
  );
  let componentTargets = snapshot.components?.components.some(
    (component) => component.assignments.length,
  )
    ? componentTokenCatalog({ ...snapshot, ...source })
    : [];
  if (
    snapshot.components?.components.some((component) =>
      component.assignments.some(
        (assignment) =>
          assignment.$ref &&
          !componentTargets.some((target) => target.id === assignment.$ref),
      ),
    )
  ) {
    const legacyEdits: BrowserTokenEdits = Object.fromEntries(
      Object.entries(source.browserTokenEdits).flatMap(([id, edit]) => {
        const { identity, ...authoring } = edit.authoring ?? {
          assignments: {},
        };
        const hasAuthoring =
          Object.keys(authoring.assignments).length ||
          Object.keys(authoring).some((key) => key !== "assignments");
        const rest = { ...edit };
        delete rest.authoring;
        const hasEdits =
          Object.keys(rest).some((key) => key !== "values") ||
          Object.keys(edit.values).length;
        if (!hasAuthoring && !hasEdits) return [];
        return [
          [
            identity?.sourceId ?? id,
            {
              ...rest,
              ...(edit.authoring && { authoring }),
            },
          ],
        ];
      }),
    );
    componentTargets = [
      ...componentTargets,
      ...componentTokenCatalog({
        ...snapshot,
        ...source,
        browserTokenEdits: legacyEdits,
      }),
    ];
  }
  const axes = new Set(source.modeSets.map((axis) => axis.key));
  const names = new Map<string, typeof canonicalTokenDefinitions>();
  for (const token of canonicalTokenDefinitions) {
    const name = Object.fromEntries(
      Object.entries(token.name).filter(
        ([key]) => key !== "legacyKey" && !axes.has(key),
      ),
    );
    const key = canonicalJson(name);
    names.set(key, [...(names.get(key) ?? []), token]);
  }
  const edits: BrowserTokenEdits = structuredClone(reconciledEdits);
  const remap = new Map<string, string>();
  const generated = new Map<string, typeof rows>();
  for (const row of rows) {
    const coordinate = row.token.sourceId ?? row.token.id;
    generated.set(coordinate, [...(generated.get(coordinate) ?? []), row]);
  }
  for (const [coordinate, group] of generated) {
    const existing = tokenIdentity(reconciledEdits, coordinate);
    const namedCandidates =
      names.get(canonicalJson(serializedName(group[0], axes))) ?? [];
    const concepts = new Set(namedCandidates.map((token) => token.conceptId));
    if (!existing && concepts.size > 1) continue;
    // Inactive sources retain their publications, even when a new source has the same name.
    const candidates = namedCandidates.filter((candidate) => {
      const owner = edits[candidate.conceptId]?.authoring?.identity?.sourceId;
      return !owner || owner === coordinate || generated.has(owner);
    });
    const conceptId =
      existing?.conceptId ??
      candidates[0]?.conceptId ??
      allocate(`concept:${coordinate}`);
    const name =
      existing?.name ??
      Object.fromEntries(
        Object.entries(
          candidates[0]?.name ?? serializedName(group[0], axes),
        ).filter(([key]) => !axes.has(key)),
      );
    const identity: TokenIdentity = {
      sourceId: coordinate,
      conceptId,
      name,
      rows: { ...existing?.rows },
    };
    const property = serializedName(group[0], axes).property;
    if (!identity.name.property && typeof property === "string")
      identity.name = { ...identity.name, property };
    for (const row of group) {
      const selected = new Map(JSON.parse(row.context) as [string, string][]);
      const named = Object.fromEntries(
        source.modeSets.flatMap((axis) => {
          const mode = axis.modes.find(
            (mode) => mode.id === selected.get(axis.id),
          );
          return mode ? [[axis.key, mode.key]] : [];
        }),
      );
      const matches = candidates.filter(
        (token) =>
          token.conceptId === conceptId &&
          [...axes].every((key) => {
            const axis = source.modeSets.find((axis) => axis.key === key)!;
            const fallback = axis.modes.find(
              (mode) => mode.id === axis.defaultModeId,
            )?.key;
            return (token.name[key] ?? fallback) === (named[key] ?? fallback);
          }),
      );
      const exactMatches = matches.filter((token) =>
        [...axes].every((key) => token.name[key] === named[key]),
      );
      const matched =
        exactMatches.length === 1
          ? exactMatches[0]
          : matches.length === 1
            ? matches[0]
            : undefined;
      const uuid =
        identity.rows[row.context] ??
        matched?.uuid ??
        allocate(`row:${coordinate}:${row.context}`);
      identity.rows[row.context] = uuid;
      remap.set(row.rowId, uuid);
      remap.set(row.id, conceptId);
      remap.set(coordinate, conceptId);
      if (row.token.semantic) {
        remap.set(row.token.semantic.token.uuid, uuid);
        const oldContext = canonicalTokenModeKey(row.token.semantic.selection);
        remap.set(
          tokenUuid(`canonical-token-row:v1:${coordinate}:${oldContext}`),
          uuid,
        );
      }
    }
    const claimed = edits[conceptId]?.authoring?.identity;
    if (claimed && claimed.sourceId !== coordinate)
      throw new Error(
        `Token sources ${claimed.sourceId} and ${coordinate} claim the same canonical concept. Resolve the conflicting publications before saving.`,
      );
    const old = edits[coordinate];
    const current = edits[conceptId];
    if (old && current && canonicalJson(old) !== canonicalJson(current))
      throw new Error(
        `Token edits for ${coordinate} and ${conceptId} conflict. Resolve them before adopting canonical identity.`,
      );
    if (coordinate !== conceptId) delete edits[coordinate];
    const previous = current ?? old;
    edits[conceptId] = {
      ...(previous ?? { values: {} }),
      authoring: { ...(previous?.authoring ?? { assignments: {} }), identity },
    };
  }
  const rewrite = (value: unknown, key = ""): unknown => {
    if (typeof value === "string")
      return [
        "$ref",
        "targetId",
        "referenceId",
        "tokenId",
        "replacementIds",
      ].includes(key)
        ? (remap.get(value) ?? value)
        : value;
    if (Array.isArray(value)) return value.map((item) => rewrite(item, key));
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value).map(([field, item]) => [
        key === "classifications" ? (remap.get(field) ?? field) : field,
        field === "identity" ||
        (field === "tokenId" &&
          "kind" in value &&
          value.kind === "primitive-token")
          ? item
          : rewrite(item, field),
      ]),
    );
  };
  // Source-coordinate references used by Structure generators are not token identities.
  const { structures, ...rest } = snapshot;
  const rewritten = rewrite({ ...rest, browserTokenEdits: edits }) as Omit<
    T,
    "structures"
  >;
  const components = snapshot.components && {
    ...snapshot.components,
    components: snapshot.components.components.map((component) => ({
      ...component,
      assignments: component.assignments.map((assignment) => {
        if (!assignment.$ref) return assignment;
        const target = componentTargets.find(
          (target) => target.id === assignment.$ref,
        );
        const identity = tokenIdentity(
          edits,
          target?.browserId ?? assignment.$ref,
        );
        const uuid =
          identity &&
          tokenIdentityRow(identity, source.modeSets, target?.context ?? {});
        return {
          ...assignment,
          $ref: uuid ?? remap.get(assignment.$ref) ?? assignment.$ref,
        };
      }),
    })),
  };
  return { ...rewritten, structures, ...(components && { components }) } as T;
}
