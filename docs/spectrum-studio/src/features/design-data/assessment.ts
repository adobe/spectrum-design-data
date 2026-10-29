// Copyright 2026 Adobe. All rights reserved.
export type AssessmentPlane =
  | "current-state"
  | "target-contract"
  | "generated-output";
export type EvidenceAuthority =
  | "specification"
  | "dataset"
  | "sdk-source"
  | "app-code"
  | "review-record"
  | "target-direction"
  | "proposal";
export type ReviewMethod =
  | "source-review"
  | "recorded-check"
  | "reported-check"
  | "confirmed-direction"
  | "proposal";
export type CapabilityLevel =
  | "declared"
  | "shape-valid"
  | "reference-validated"
  | "generated"
  | "serialized"
  | "queryable"
  | "authorable"
  | "round-trippable";

export interface AssessmentProfile {
  id: string;
  label: string;
  kind: "working-tree" | "pinned-git" | "target-documents";
  root: string;
  reviewedRevision: string;
  observedRevision: string | null;
  status: "available" | "unavailable" | "tracked-ref-advanced";
  trackedRef?: { name: string; observedRevision: string | null };
  limitation: string;
  versions?: { dataset?: string; specPackage?: string };
}

export interface EvidenceDefinition {
  id: string;
  profileId: string;
  authority: EvidenceAuthority;
  method: ReviewMethod;
  path: string;
  format: "file" | "json-tree";
  location: string;
  reviewedSha256: string;
  reviewedAt: string;
  statement: string;
  recordedCheck?: { scope: string; result: string; limitation: string };
}

export interface EvidenceObservation {
  evidenceId: string;
  sha256: string | null;
  reason?: string;
}

export interface AssessedEvidence extends EvidenceDefinition {
  verification: {
    method: "sha256-only";
    state: "snapshot-matched" | "changed" | "unavailable";
    observedSha256: string | null;
    reason?: string;
  };
  execution: "review-not-rerun";
}

export interface TargetRequirement {
  id: string;
  title: string;
  statement: string;
  status: "confirmed-direction" | "proposed-model";
  evidenceIds: string[];
  decision: "open";
}

export interface ArchitecturalFinding {
  id: string;
  title: string;
  plane: "current-state" | "target-contract";
  classification:
    | "semantic-disagreement"
    | "representation-difference"
    | "schema-expressiveness-gap"
    | "dataset-content-difference"
    | "app-capability-gap"
    | "implementation-limit"
    | "sdk-spec-disagreement"
    | "intentional-policy"
    | "unassessable";
  priority: "high" | "medium" | "low";
  scope: string;
  statement: string;
  consequence: string;
  recommendation: string;
  owner: "joint" | "leonardo" | "upstream";
  evidenceIds: string[];
  requirementIds: string[];
  decision: "open";
  discriminatingCheck: string;
  capabilities?: {
    profileId: string;
    subject: string;
    level: CapabilityLevel;
    status: "reviewed-support" | "reviewed-limit" | "proposed" | "unknown";
  }[];
}

export interface AssessmentRegistry {
  version: string;
  evidence: EvidenceDefinition[];
  requirements: TargetRequirement[];
  findings: ArchitecturalFinding[];
}

export interface ArchitectureAssessment {
  schemaVersion: 1;
  registryVersion: string;
  planes: { id: AssessmentPlane; description: string }[];
  profiles: AssessmentProfile[];
  evidence: AssessedEvidence[];
  requirements: (TargetRequirement & {
    freshness: "reviewed-snapshot" | "stale" | "unverified";
  })[];
  findings: (ArchitecturalFinding & {
    freshness: "reviewed-snapshot" | "stale" | "unverified";
  })[];
  requiredInputFailures: string[];
  outputComparison: {
    findingsPointer: "#/findings";
    metricsPointer: "#/metrics";
    interpretation: string;
  };
  limitations: string[];
  sdkBinary?: SdkExecutionEvidence;
}

export interface SdkExecutionEvidence {
  method: "existing-adapter-record";
  sourceProfileId: "reference-checkout";
  availability: "adapter-reported" | "unavailable";
  identity: string;
  inputContentHash: string;
  sourceCorrespondence: "not-established";
  pinnedProfileExecution: "not-performed";
  resolution?: {
    fixtureHash: string;
    resolvedValueComparison: "disabled";
    checks: {
      name: string;
      status: "passed" | "failed" | "unsupported";
      message?: string;
    }[];
    error?: string;
  };
}

/** Carry executed adapter provenance separately; no curated review is promoted to an executed check. */
export function sdkExecutionEvidence(source: {
  validator: string;
  hash: string;
  resolutionConformance?: SdkExecutionEvidence["resolution"];
}): SdkExecutionEvidence {
  return {
    method: "existing-adapter-record",
    sourceProfileId: "reference-checkout",
    availability:
      source.validator === "unavailable" ? "unavailable" : "adapter-reported",
    identity: source.validator,
    inputContentHash: source.hash,
    sourceCorrespondence: "not-established",
    pinnedProfileExecution: "not-performed",
    ...(source.resolutionConformance
      ? { resolution: structuredClone(source.resolutionConformance) }
      : {}),
  };
}

const sorted = <T extends { id: string }>(items: readonly T[]): T[] =>
  [...items].sort((left, right) => left.id.localeCompare(right.id, "en"));

export function buildArchitectureAssessment(
  registry: AssessmentRegistry,
  profiles: readonly AssessmentProfile[],
  observations: readonly EvidenceObservation[],
  inputFailures: readonly string[] = [],
): ArchitectureAssessment {
  const unique = (items: readonly { id: string }[], kind: string) => {
    const ids = new Set<string>();
    for (const item of items) {
      if (!item.id.trim() || ids.has(item.id))
        throw new Error(`Invalid ${kind} identity: ${item.id}`);
      ids.add(item.id);
    }
    return ids;
  };
  const profileIds = unique(profiles, "profile");
  const evidenceIds = unique(registry.evidence, "evidence");
  const requirementIds = unique(registry.requirements, "requirement");
  unique(registry.findings, "finding");
  const reference = (id: string, ids: ReadonlySet<string>) => {
    if (!ids.has(id)) throw new Error(`Unresolved assessment reference: ${id}`);
  };
  for (const item of registry.evidence) {
    reference(item.profileId, profileIds);
    if (
      ![
        "source-review",
        "recorded-check",
        "reported-check",
        "confirmed-direction",
        "proposal",
      ].includes(item.method)
    )
      throw new Error(`Unsupported assessment method: ${item.id}`);
    if (!/^[a-f0-9]{64}$/.test(item.reviewedSha256))
      throw new Error(`Invalid reviewed SHA-256: ${item.id}`);
    if (
      (item.method === "recorded-check" || item.method === "reported-check") &&
      !item.recordedCheck
    )
      throw new Error(`Missing review-time check scope: ${item.id}`);
  }
  for (const item of registry.requirements) {
    if (
      item.decision !== "open" ||
      !["confirmed-direction", "proposed-model"].includes(item.status)
    )
      throw new Error(`Unapproved requirement status: ${item.id}`);
    if (!item.evidenceIds.length)
      throw new Error(`Requirement has no evidence: ${item.id}`);
    for (const id of item.evidenceIds) reference(id, evidenceIds);
  }
  for (const item of registry.findings) {
    if (item.decision !== "open")
      throw new Error(`Unapproved finding closure: ${item.id}`);
    if (!item.evidenceIds.length)
      throw new Error(`Finding has no evidence: ${item.id}`);
    for (const id of item.evidenceIds) reference(id, evidenceIds);
    for (const id of item.requirementIds) reference(id, requirementIds);
    for (const capability of item.capabilities ?? [])
      reference(capability.profileId, profileIds);
  }
  const observed = new Map<string, EvidenceObservation>();
  for (const item of observations) {
    reference(item.evidenceId, evidenceIds);
    if (observed.has(item.evidenceId))
      throw new Error(`Duplicate observation: ${item.evidenceId}`);
    if (item.sha256 !== null && !/^[a-f0-9]{64}$/.test(item.sha256))
      throw new Error(`Invalid observed SHA-256: ${item.evidenceId}`);
    observed.set(item.evidenceId, item);
  }
  const evidence: AssessedEvidence[] = sorted(registry.evidence).map((item) => {
    const observation = observed.get(item.id);
    const hash = observation?.sha256 ?? null;
    return {
      ...item,
      execution: "review-not-rerun",
      verification: {
        method: "sha256-only",
        state:
          hash === null
            ? "unavailable"
            : hash === item.reviewedSha256
              ? "snapshot-matched"
              : "changed",
        observedSha256: hash,
        ...(observation?.reason ? { reason: observation.reason } : {}),
      },
    };
  });
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const byProfile = new Map(profiles.map((item) => [item.id, item]));
  const freshness = (
    ids: readonly string[],
  ): "reviewed-snapshot" | "stale" | "unverified" => {
    const dependencies = ids.map((id) => byId.get(id)!);
    if (
      dependencies.some(
        (entry) =>
          entry.verification.state === "changed" ||
          byProfile.get(entry.profileId)?.status === "tracked-ref-advanced",
      )
    )
      return "stale";
    if (
      dependencies.some(
        (entry) =>
          entry.verification.state === "unavailable" ||
          byProfile.get(entry.profileId)?.status === "unavailable",
      )
    )
      return "unverified";
    return "reviewed-snapshot";
  };
  return {
    schemaVersion: 1,
    registryVersion: registry.version,
    planes: [
      {
        id: "current-state",
        description:
          "Reviewed observations per pinned profile, including draft snapshots; not a claim that a draft is merged or that checks ran now.",
      },
      {
        id: "target-contract",
        description:
          "Confirmed direction and proposed model requirements; equality of outputs does not close an architectural decision.",
      },
      {
        id: "generated-output",
        description:
          "Existing report output fields retain their independent records, contexts, metrics, and validity.",
      },
    ],
    profiles: structuredClone(sorted(profiles)),
    evidence: structuredClone(evidence),
    requirements: sorted(registry.requirements).map((item) => ({
      ...structuredClone(item),
      freshness: freshness(item.evidenceIds),
    })),
    findings: sorted(registry.findings).map((item) => ({
      ...structuredClone(item),
      freshness: freshness(item.evidenceIds),
    })),
    requiredInputFailures: [...new Set(inputFailures)].sort(),
    outputComparison: {
      findingsPointer: "#/findings",
      metricsPointer: "#/metrics",
      interpretation:
        "Values and names may differ legitimately. Existing mode rows can be evaluation output; no new canonical materialization or architectural coverage denominator is inferred.",
    },
    limitations: [
      "Only evidence byte hashes are checked here. Curated reviews, recorded schema checks, and reported CI are not rerun or promoted to current conformance.",
      "The registry is a bounded reviewed assessment, not exhaustive automated capability discovery or an accepted upstream schema.",
      "No output match/equality count closes a requirement; no combined health score is defined.",
      "Pinned draft objects are optional and read-only. Remote PR lifecycle and SDK binary/source correspondence are not established.",
    ],
  };
}

/** Runtime boundary for the development response; reviewed metadata is not a conformance assertion. */
export function isArchitectureAssessment(
  value: unknown,
): value is ArchitectureAssessment {
  const object = (item: unknown): item is Record<string, unknown> =>
    Boolean(item) && typeof item === "object" && !Array.isArray(item);
  const strings = (item: unknown): item is string[] =>
    Array.isArray(item) &&
    item.every((entry: unknown) => typeof entry === "string");
  const fields = (item: Record<string, unknown>, names: string[]) =>
    names.every((name) => typeof item[name] === "string");
  const member = (item: unknown, values: string[]) =>
    typeof item === "string" && values.includes(item);
  const freshness = ["reviewed-snapshot", "stale", "unverified"];
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    typeof value.registryVersion !== "string" ||
    !strings(value.limitations) ||
    !strings(value.requiredInputFailures) ||
    !Array.isArray(value.planes) ||
    !Array.isArray(value.profiles) ||
    !Array.isArray(value.evidence) ||
    !Array.isArray(value.requirements) ||
    !Array.isArray(value.findings) ||
    !object(value.outputComparison) ||
    value.outputComparison.findingsPointer !== "#/findings" ||
    value.outputComparison.metricsPointer !== "#/metrics" ||
    typeof value.outputComparison.interpretation !== "string"
  )
    return false;
  if (
    value.planes.length !== 3 ||
    new Set(
      value.planes.map((plane: unknown) => (object(plane) ? plane.id : null)),
    ).size !== 3 ||
    !value.planes.every(
      (plane: unknown) =>
        object(plane) &&
        typeof plane.description === "string" &&
        member(plane.id, [
          "current-state",
          "target-contract",
          "generated-output",
        ]),
    )
  )
    return false;
  if (
    !value.profiles.every(
      (profile: unknown) =>
        object(profile) &&
        fields(profile, [
          "id",
          "label",
          "root",
          "reviewedRevision",
          "limitation",
        ]) &&
        (profile.observedRevision === null ||
          typeof profile.observedRevision === "string") &&
        member(profile.kind, [
          "working-tree",
          "pinned-git",
          "target-documents",
        ]) &&
        member(profile.status, [
          "available",
          "unavailable",
          "tracked-ref-advanced",
        ]) &&
        (profile.trackedRef === undefined ||
          (object(profile.trackedRef) &&
            typeof profile.trackedRef.name === "string" &&
            (profile.trackedRef.observedRevision === null ||
              typeof profile.trackedRef.observedRevision === "string"))) &&
        (profile.versions === undefined ||
          (object(profile.versions) &&
            ["dataset", "specPackage"].every(
              (key) =>
                profile.versions &&
                object(profile.versions) &&
                (profile.versions[key] === undefined ||
                  typeof profile.versions[key] === "string"),
            ))),
    )
  )
    return false;
  if (
    !value.evidence.every(
      (evidence: unknown) =>
        object(evidence) &&
        fields(evidence, [
          "id",
          "profileId",
          "path",
          "location",
          "reviewedSha256",
          "reviewedAt",
          "statement",
        ]) &&
        member(evidence.authority, [
          "specification",
          "dataset",
          "sdk-source",
          "app-code",
          "review-record",
          "target-direction",
          "proposal",
        ]) &&
        member(evidence.method, [
          "source-review",
          "recorded-check",
          "reported-check",
          "confirmed-direction",
          "proposal",
        ]) &&
        member(evidence.format, ["file", "json-tree"]) &&
        evidence.execution === "review-not-rerun" &&
        object(evidence.verification) &&
        evidence.verification.method === "sha256-only" &&
        member(evidence.verification.state, [
          "snapshot-matched",
          "changed",
          "unavailable",
        ]) &&
        (evidence.verification.observedSha256 === null ||
          typeof evidence.verification.observedSha256 === "string") &&
        (evidence.verification.reason === undefined ||
          typeof evidence.verification.reason === "string") &&
        (evidence.recordedCheck === undefined ||
          (object(evidence.recordedCheck) &&
            fields(evidence.recordedCheck, ["scope", "result", "limitation"]))),
    )
  )
    return false;
  if (
    !value.requirements.every(
      (item: unknown) =>
        object(item) &&
        fields(item, ["id", "title", "statement"]) &&
        item.decision === "open" &&
        member(item.status, ["confirmed-direction", "proposed-model"]) &&
        member(item.freshness, freshness) &&
        strings(item.evidenceIds),
    )
  )
    return false;
  if (
    !value.findings.every(
      (item: unknown) =>
        object(item) &&
        fields(item, [
          "id",
          "title",
          "scope",
          "statement",
          "consequence",
          "recommendation",
          "discriminatingCheck",
        ]) &&
        item.decision === "open" &&
        member(item.plane, ["current-state", "target-contract"]) &&
        member(item.freshness, freshness) &&
        strings(item.evidenceIds) &&
        strings(item.requirementIds) &&
        member(item.priority, ["high", "medium", "low"]) &&
        member(item.owner, ["joint", "leonardo", "upstream"]) &&
        member(item.classification, [
          "semantic-disagreement",
          "representation-difference",
          "schema-expressiveness-gap",
          "dataset-content-difference",
          "app-capability-gap",
          "implementation-limit",
          "sdk-spec-disagreement",
          "intentional-policy",
          "unassessable",
        ]) &&
        (item.capabilities === undefined ||
          (Array.isArray(item.capabilities) &&
            item.capabilities.every(
              (capability: unknown) =>
                object(capability) &&
                fields(capability, ["profileId", "subject"]) &&
                member(capability.level, [
                  "declared",
                  "shape-valid",
                  "reference-validated",
                  "generated",
                  "serialized",
                  "queryable",
                  "authorable",
                  "round-trippable",
                ]) &&
                member(capability.status, [
                  "reviewed-support",
                  "reviewed-limit",
                  "proposed",
                  "unknown",
                ]),
            ))),
    )
  )
    return false;
  if (value.sdkBinary !== undefined) {
    const sdk = value.sdkBinary;
    if (
      !object(sdk) ||
      !fields(sdk, ["identity", "inputContentHash"]) ||
      sdk.method !== "existing-adapter-record" ||
      sdk.sourceProfileId !== "reference-checkout" ||
      sdk.sourceCorrespondence !== "not-established" ||
      sdk.pinnedProfileExecution !== "not-performed" ||
      !member(sdk.availability, ["adapter-reported", "unavailable"])
    )
      return false;
    if (
      sdk.resolution !== undefined &&
      (!object(sdk.resolution) ||
        typeof sdk.resolution.fixtureHash !== "string" ||
        sdk.resolution.resolvedValueComparison !== "disabled" ||
        !Array.isArray(sdk.resolution.checks) ||
        !sdk.resolution.checks.every(
          (check: unknown) =>
            object(check) &&
            typeof check.name === "string" &&
            member(check.status, ["passed", "failed", "unsupported"]) &&
            (check.message === undefined || typeof check.message === "string"),
        ) ||
        (sdk.resolution.error !== undefined &&
          typeof sdk.resolution.error !== "string"))
    )
      return false;
  }
  try {
    const assessment = value as unknown as ArchitectureAssessment;
    const rebuilt = buildArchitectureAssessment(
      {
        version: assessment.registryVersion,
        evidence: assessment.evidence,
        requirements: assessment.requirements,
        findings: assessment.findings,
      },
      assessment.profiles,
      assessment.evidence.map((item) => ({
        evidenceId: item.id,
        sha256: item.verification.observedSha256,
      })),
      assessment.requiredInputFailures,
    );
    return (
      rebuilt.evidence.every(
        (item, index) =>
          item.id === assessment.evidence[index].id &&
          item.verification.state ===
            assessment.evidence[index].verification.state,
      ) &&
      rebuilt.findings.every(
        (item, index) =>
          item.id === assessment.findings[index].id &&
          item.freshness === assessment.findings[index].freshness,
      ) &&
      rebuilt.requirements.every(
        (item, index) =>
          item.id === assessment.requirements[index].id &&
          item.freshness === assessment.requirements[index].freshness,
      )
    );
  } catch {
    return false;
  }
}

export function architectureMarkdown(
  assessment: ArchitectureAssessment,
): string {
  const text = (value: string) =>
    value.replaceAll("|", "\\|").replaceAll("\n", " ");
  return [
    "## Architectural assessment",
    "",
    `Assessment schema version: ${assessment.schemaVersion}. Registry version: ${text(assessment.registryVersion)}.`,
    "",
    ...assessment.planes.map(
      (plane) => `- **${plane.id}**: ${text(plane.description)}`,
    ),
    "",
    "### Evidence profiles",
    "",
    "| Profile | Kind | Reviewed revision | Observed revision | Status | Scope/limitation |",
    "| --- | --- | --- | --- | --- | --- |",
    ...assessment.profiles.map(
      (profile) =>
        `| ${text(profile.label)} | ${profile.kind} | ${text(profile.reviewedRevision)} | ${text(profile.observedRevision ?? "unavailable")} | ${profile.status} | ${text(profile.limitation)}${profile.versions ? `; dataset ${text(profile.versions.dataset ?? "unavailable")}; spec package ${text(profile.versions.specPackage ?? "unavailable")}` : ""}${profile.trackedRef ? `; tracked ref ${text(profile.trackedRef.name)}: ${text(profile.trackedRef.observedRevision ?? "unavailable")}` : ""} |`,
    ),
    "",
    ...(assessment.sdkBinary
      ? [
          "### Executed SDK adapter provenance (separate from reviewed source)",
          "",
          `${assessment.sdkBinary.availability}: ${text(assessment.sdkBinary.identity)}. Input content hash: ${text(assessment.sdkBinary.inputContentHash)}.`,
          "Source/binary correspondence: not established. Assessment SDK execution for pinned Git profiles: not performed. These are existing configured-checkout adapter records, not new assessment checks or a full conformance pass.",
          ...(assessment.sdkBinary.resolution?.checks ?? []).map(
            (check) =>
              `- ${text(check.name)}: ${check.status}${check.message ? ` - ${text(check.message)}` : ""}`,
          ),
          "",
        ]
      : []),
    "### Reviewed evidence (not rerun)",
    "",
    ...assessment.evidence.map(
      (item) =>
        `- **${item.id}** (${item.authority}; ${item.method}; ${item.verification.state}; ${item.execution}): ${text(item.statement)} [${text(item.profileId)}: ${text(item.path)} ${text(item.location)}]. Reviewed SHA-256: ${item.reviewedSha256}; observed: ${item.verification.observedSha256 ?? "unavailable"}.${item.verification.reason ? ` ${text(item.verification.reason)}` : ""}${item.recordedCheck ? ` Recorded scope: ${text(item.recordedCheck.scope)}. Result at review: ${text(item.recordedCheck.result)}. ${text(item.recordedCheck.limitation)}` : ""}`,
    ),
    "",
    "### Target requirements (decisions remain open)",
    "",
    ...assessment.requirements.map(
      (item) =>
        `- **${item.id}** (${item.status}; ${item.freshness}; decision: ${item.decision}): ${text(item.title)} - ${text(item.statement)} [${item.evidenceIds.join(", ")}]`,
    ),
    "",
    ...(["current-state", "target-contract"] as const).flatMap((plane) => [
      `### ${plane === "current-state" ? "Current-state architectural findings" : "Joint target-contract findings"}`,
      "",
      ...assessment.findings
        .filter((item) => item.plane === plane)
        .map(
          (item) =>
            `- **${item.id}** (${item.classification}; ${item.priority}; ${item.freshness}; decision: ${item.decision}): ${text(item.title)} - ${text(item.statement)} Consequence: ${text(item.consequence)} Owner: ${item.owner}. Recommendation: ${text(item.recommendation)}. Check: ${text(item.discriminatingCheck)} [${item.evidenceIds.join(", ")}]${item.capabilities ? ` Capabilities: ${item.capabilities.map((capability) => `${text(capability.profileId)}/${text(capability.subject)}: ${capability.level} ${capability.status}`).join("; ")}.` : ""}`,
        ),
      "",
    ]),
    "### Output comparison boundary",
    "",
    text(assessment.outputComparison.interpretation),
    "",
    "Existing output findings/metrics remain at #/findings and #/metrics; no token rows are duplicated here.",
    "",
    "### Assessment limitations",
    "",
    ...assessment.limitations.map((item) => `- ${text(item)}`),
    "",
    ...(assessment.requiredInputFailures.length
      ? [
          "Required-input failures remain visible in the output report and do not erase reviewed architectural findings:",
          ...assessment.requiredInputFailures.map((item) => `- ${text(item)}`),
          "",
        ]
      : []),
  ].join("\n");
}
