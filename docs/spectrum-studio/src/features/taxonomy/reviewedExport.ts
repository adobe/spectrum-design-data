// Copyright 2026 Adobe. All rights reserved.
import Ajv from "ajv";
import reviewSchema from "../../data/classification-review.schema.json" with { type: "json" };
import standardSchema from "../../data/classification-standard.schema.json" with { type: "json" };
import { canonicalJson } from "../design-data/canonicalJson";
import type { CanonicalAliasRow } from "../tokens/aliasTargets";
import { aliasReferencePacket, type AliasDocument } from "../tokens/aliases";
import {
  assertTaxonomy,
  projectClassification,
  type Classification,
  type TaxonomyDocument,
  type TaxonomySegment,
  type TaxonomyValue,
} from "./model";
import { canonicalTaxonomyValue, TAXONOMY_PROFILE } from "./export";
import {
  classificationStandard,
  assertClassificationStandard,
  type ClassificationStandard,
} from "./standardContract";
import {
  assessClassificationStandard,
  assertStandardClassification,
  type ClassificationAssessment,
  type StandardizationUsage,
} from "./standardization";

export type ClassificationExportKind = "standard-compliant" | "compatibility";
const scope =
  "Native taxonomy definitions, stored classifications, published token rows and compatibility alias uses across declared owner-scoped modes";
export interface ClassificationReviewExport {
  schemaVersion: 1;
  profileId: "spectrum-classification-review-v1";
  exportKind: ClassificationExportKind;
  standardConforming: boolean;
  upstreamAdopted: false;
  scope: typeof scope;
  hashes: { sourceSha256: string; standardSha256: string };
  standard: ClassificationStandard;
  source: {
    profileId: typeof TAXONOMY_PROFILE;
    datasetKind: "working";
    taxonomy: TaxonomyDocument;
    records: CanonicalAliasRow[];
    aliases: AliasDocument;
    usages: StandardizationUsage[];
  };
  assessment: ClassificationAssessment;
  tokens: ({
    id: string;
    conceptId: string;
    context: string;
    name: string;
    classification?: Classification;
    flatName?: Record<string, TaxonomyValue | TaxonomyValue[]>;
    path?: TaxonomySegment[];
  } & ReturnType<typeof canonicalTaxonomyValue>)[];
  aliases: ReturnType<typeof aliasReferencePacket>;
}

const validate = new Ajv({ allErrors: true, strict: true })
  .addSchema(standardSchema)
  .compile<ClassificationReviewExport>(reviewSchema);
export const classificationContentHash = async (value: unknown) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson(value)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

function usagesFor(
  document: TaxonomyDocument,
  rows: readonly CanonicalAliasRow[],
  aliases: AliasDocument,
): StandardizationUsage[] {
  const canonical: StandardizationUsage[] = rows.map((row) => {
    const scope = row.token.semantic ? "structures" : row.token.type;
    const projection = row.token.projection;
    const computed =
      projection &&
      scope !== "motion" &&
      projectClassification(document, projection.classification, scope);
    const projectionIssues = [
      ...(projection?.issues ?? []),
      ...(row.token.validationError ? [row.token.validationError] : []),
    ];
    if (
      computed &&
      projection &&
      (canonicalJson(computed.flat) !== canonicalJson(projection.flat) ||
        canonicalJson(computed.segments) !==
          canonicalJson(projection.segments) ||
        computed.name !== projection.name)
    ) {
      projectionIssues.push(
        "Retained projection fields differ from the explicit classification.",
      );
    }
    if (projection && !projection.issues.length && row.name !== projection.name)
      projectionIssues.push(
        "Retained name differs from the explicit classification.",
      );
    if (
      row.token.measurement &&
      (row.token.unit !== row.token.measurement.unit ||
        typeof row.token.value !== "number")
    )
      projectionIssues.push(
        "Nominal font-size value or units differ from its explicit measurement.",
      );
    return {
      id: row.rowId,
      recordKind: "token-usage",
      scope,
      classification: projection?.classification,
      projectionIssues,
      ...(row.token.measurement && { measurement: row.token.measurement }),
    };
  });
  const byRowId = new Map(canonical.map((usage) => [usage.id, usage]));
  const retained = aliasReferencePacket(aliases, rows).map(
    (alias): StandardizationUsage => {
      const target = byRowId.get(alias.$ref);
      if (!target)
        throw new Error(
          `Alias "${alias.name}" has no assessed target in this mode context.`,
        );
      return {
        ...target,
        id: alias.uuid,
        recordKind: "alias-usage",
      };
    },
  );
  return [...canonical, ...retained];
}

function outputsFor(rows: readonly CanonicalAliasRow[]) {
  const ids = new Set<string>();
  return rows.map((row) => {
    if (ids.has(row.rowId))
      throw new Error(`Duplicate exported token row: ${row.rowId}.`);
    ids.add(row.rowId);
    if (
      (typeof row.token.value !== "number" &&
        typeof row.token.value !== "string") ||
      (typeof row.token.value === "number" && !Number.isFinite(row.token.value))
    )
      throw new Error(`${row.rowId}: invalid preserved token value.`);
    const projection = row.token.projection;
    return {
      id: row.rowId,
      conceptId: row.id,
      context: row.context,
      name: row.name,
      ...(projection && {
        classification: projection.classification,
        flatName: projection.flat,
        path: projection.segments,
      }),
      ...canonicalTaxonomyValue(row, rows),
    };
  });
}

export async function buildClassificationReviewExport(
  document: TaxonomyDocument,
  rows: readonly CanonicalAliasRow[],
  aliases: AliasDocument,
  kind: ClassificationExportKind,
): Promise<ClassificationReviewExport> {
  if (!["standard-compliant", "compatibility"].includes(kind))
    throw new Error("Choose a supported classification export.");
  assertTaxonomy(document);
  const source: ClassificationReviewExport["source"] = {
    profileId: TAXONOMY_PROFILE,
    datasetKind: "working",
    taxonomy: structuredClone(document),
    records: structuredClone([...rows]),
    aliases: structuredClone(aliases),
    usages: structuredClone(usagesFor(document, rows, aliases)),
  };
  const standard = structuredClone(classificationStandard);
  const assessment = assessClassificationStandard(
    source.taxonomy,
    source.usages,
    standard,
  );
  if (kind === "standard-compliant" && !rows.length)
    throw new Error(
      "Standard-compliant export needs a nonempty declared token scope.",
    );
  if (kind === "standard-compliant") assertStandardClassification(assessment);
  const packet: ClassificationReviewExport = {
    schemaVersion: 1,
    profileId: "spectrum-classification-review-v1",
    exportKind: kind,
    standardConforming: kind === "standard-compliant",
    upstreamAdopted: false,
    scope,
    standard,
    source,
    assessment,
    hashes: {
      sourceSha256: await classificationContentHash(source),
      standardSha256: await classificationContentHash(standard),
    },
    tokens: outputsFor(source.records),
    aliases: aliasReferencePacket(source.aliases, source.records),
  };
  await assertClassificationReviewExport(packet);
  return packet;
}

export async function assertClassificationReviewExport(
  value: unknown,
): Promise<void> {
  if (!validate(value))
    throw new Error(
      `Invalid classification review packet.\n${(validate.errors ?? []).map((error) => `${error.instancePath}: ${error.message}`).join("\n")}`,
    );
  assertTaxonomy(value.source.taxonomy);
  assertClassificationStandard(value.standard);
  if (canonicalJson(value.standard) !== canonicalJson(classificationStandard))
    throw new Error("Unrecognized or stale proposed standard revision.");
  if (
    value.hashes.sourceSha256 !==
      (await classificationContentHash(value.source)) ||
    value.hashes.standardSha256 !==
      (await classificationContentHash(value.standard))
  )
    throw new Error("Classification source or standard fingerprint is stale.");
  if (
    canonicalJson(value.source.usages) !==
    canonicalJson(
      usagesFor(
        value.source.taxonomy,
        value.source.records,
        value.source.aliases,
      ),
    )
  )
    throw new Error(
      "Classification usages do not preserve the complete source rows and alias contexts.",
    );
  if (
    canonicalJson(value.assessment) !==
    canonicalJson(
      assessClassificationStandard(
        value.source.taxonomy,
        value.source.usages,
        value.standard,
      ),
    )
  )
    throw new Error(
      "Classification flags do not match every source occurrence.",
    );
  if (
    canonicalJson(value.tokens) !==
      canonicalJson(outputsFor(value.source.records)) ||
    canonicalJson(value.aliases) !==
      canonicalJson(
        aliasReferencePacket(value.source.aliases, value.source.records),
      )
  )
    throw new Error(
      "Classification output omitted or changed a source value or direct reference.",
    );
  if (value.exportKind === "standard-compliant")
    assertStandardClassification(value.assessment);
}
