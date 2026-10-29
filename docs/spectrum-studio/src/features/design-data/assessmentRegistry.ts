// Copyright 2026 Adobe. All rights reserved.
import type {
  ArchitecturalFinding,
  AssessmentRegistry,
  EvidenceAuthority,
  EvidenceDefinition,
  ReviewMethod,
  TargetRequirement,
} from "./assessment";
import { reviewedAssessmentPins } from "./assessmentPins";

export const REVIEWED_REFERENCE_REVISION =
  "838a6835b746f9d77b2697374408901f334d854e";
export const REVIEWED_DRAFT_REVISION =
  "fa714564eaa33bc37f905fad64162d60d6a48087";
export const REVIEWED_DRAFT_BASE = "282fc49fb452534367f58632eca6f5e75c234f9c";
export const REVIEWED_DRAFT_REF =
  "refs/remotes/origin/feat/token-taxonomy-vocabulary-split";

function evidence(
  id: string,
  profileId: string,
  authority: EvidenceAuthority,
  method: ReviewMethod,
  path: string,
  location: string,
  statement: string,
  format: "file" | "json-tree" = "file",
  recordedCheck?: EvidenceDefinition["recordedCheck"],
): EvidenceDefinition {
  return {
    id,
    profileId,
    authority,
    method,
    path,
    location,
    statement,
    format,
    reviewedSha256: reviewedAssessmentPins[id],
    reviewedAt: "2026-10-05",
    ...(recordedCheck ? { recordedCheck } : {}),
  };
}

const sources: EvidenceDefinition[] = [
  evidence(
    "APP-REPORT",
    "leonardo",
    "app-code",
    "source-review",
    "src/features/design-data/comparison.ts",
    "AnalysisReport; compareDesignData",
    "Output matching and architectural assessment are different operations; optional assessment metadata does not validate the target contract.",
  ),
  evidence(
    "APP-PROJECTION",
    "leonardo",
    "app-code",
    "source-review",
    "src/features/design-data/projection.ts",
    "projectAuthoringDataset",
    "Non-color values are evaluated across declared app mode combinations; these results are not proof of canonical future materialization policy.",
  ),
  evidence(
    "APP-MODES",
    "leonardo",
    "app-code",
    "source-review",
    "src/features/modes/model.ts",
    "Mode and ModeSet",
    "The current mode model carries declarations, platform IDs, and foundation overrides together.",
  ),
  evidence(
    "APP-COLOR",
    "leonardo",
    "app-code",
    "source-review",
    "src/features/color-system/model.ts",
    "PaletteColor and ColorScale",
    "Identified palette colors and named scales are distinct from a hue-family classification or serialized token label.",
  ),
  evidence(
    "APP-FORMULAS",
    "leonardo",
    "app-code",
    "source-review",
    "src/features/scales/scaleType.ts",
    "ScaleType and parameter policies",
    "Existing declarative formulas preserve parameter and override policies; a generated value does not reconstruct that intent.",
  ),
  evidence(
    "APP-RULES",
    "leonardo",
    "app-code",
    "source-review",
    "src/features/logic/model.ts",
    "ConditionalRuleBody and RoundingRule",
    "Ordered conditions, rounding depth, and outcomes are reusable authoring definitions.",
  ),
  evidence(
    "APP-TOKEN-EDITS",
    "leonardo",
    "app-code",
    "source-review",
    "src/features/tokens/browserModel.ts",
    "BrowserTokenEdit",
    "Token name/value editing and generated baselines are not a taxonomy migration contract.",
  ),
  evidence(
    "APP-CONTRACT",
    "leonardo",
    "app-code",
    "source-review",
    "src/features/design-data/model.ts",
    "DesignSystemDataset",
    "The current root authoring contract is not a complete taxonomy/component/platform-manifest contract.",
  ),
  evidence(
    "APP-PLATFORMS",
    "leonardo",
    "app-code",
    "source-review",
    "src/features/platforms/model.ts",
    "Platform",
    "Platform ID/name declarations are not manifest selection, local catalogs, or layered token overrides.",
  ),
  evidence(
    "CURRENT-TAXONOMY",
    "reference-checkout",
    "specification",
    "source-review",
    "packages/design-data-spec/spec/taxonomy.md",
    "Naming layers and color taxonomy",
    "Category meaning, vocabulary, formatting, and color-family fields are separately described.",
  ),
  evidence(
    "CURRENT-MODES",
    "reference-checkout",
    "specification",
    "source-review",
    "packages/design-data-spec/spec/mode-sets.md",
    "Optional declarations, specificity, coverage, restrictions",
    "Mode declarations, defaults, explicit combinations, and restrictions are distinct contracts.",
  ),
  evidence(
    "CURRENT-MANIFEST",
    "reference-checkout",
    "specification",
    "source-review",
    "packages/design-data-spec/spec/manifest.md",
    "Overrides and extensions",
    "The inspected specification retains lower-layer records for query and supports local modes/extensions separately from restrictions.",
  ),
  evidence(
    "CURRENT-SCHEMAS",
    "reference-checkout",
    "specification",
    "source-review",
    "packages/design-data-spec/schemas",
    "Reviewed schema inventory",
    "The reviewed schema inventory lacks a dedicated portable formula/rule/recipe program family matching the app's intent.",
    "json-tree",
  ),
  evidence(
    "CURRENT-COLOR-FIELD",
    "reference-checkout",
    "dataset",
    "source-review",
    "packages/design-data/fields/colorFamily.json",
    "Description and scope",
    "Color-family description and authored color-source names require semantic review, not a universal rename.",
  ),
  evidence(
    "CURRENT-DENSITY",
    "reference-checkout",
    "dataset",
    "source-review",
    "packages/design-data/mode-sets/scale.json",
    "Desktop/mobile declaration",
    "Current density vocabulary is historical compatibility, not the approved future foundation architecture.",
  ),
  evidence(
    "CURRENT-GRAPH",
    "reference-checkout",
    "sdk-source",
    "source-review",
    "sdk/core/src/graph.rs",
    "apply_platform_manifest",
    "The inspected SDK replaces a shadowed entry in its in-memory map; this is separate from the spec's query-lineage model and does not write the foundation file.",
  ),
  evidence(
    "CURRENT-CASCADE",
    "reference-checkout",
    "sdk-source",
    "source-review",
    "sdk/core/src/cascade.rs",
    "specificity and matches_context",
    "Omitted-mode specificity and wildcard context matching are separate operations.",
  ),
  evidence(
    "DRAFT-TAXONOMY",
    "draft-pr1454",
    "specification",
    "source-review",
    "packages/design-data-spec/spec/taxonomy.md",
    "Universal fields, owner-scoped vocabulary, transitional prose",
    "The pinned draft introduces element/attribute/affordance/visibility and split interaction fields; some prose remains transitional.",
  ),
  evidence(
    "DRAFT-FIELDS",
    "draft-pr1454",
    "dataset",
    "source-review",
    "packages/design-data/fields",
    "Declared field catalog",
    "The reviewed draft field catalog declares semantic field kinds, array value types, scope, and serialization independently of query support.",
    "json-tree",
  ),
  evidence(
    "DRAFT-STATES",
    "draft-pr1454",
    "specification",
    "source-review",
    "packages/design-data-spec/spec/state-model.md",
    "Trigger and anchoring semantics",
    "The pinned draft describes trigger-specific buckets and component anchoring, independently of universal-field corpus usage.",
  ),
  evidence(
    "DRAFT-TOKEN-FORMAT",
    "draft-pr1454",
    "specification",
    "source-review",
    "packages/design-data-spec/spec/token-format.md",
    "Narrowed property examples",
    "The draft prose and property registry need separate evaluation during migration.",
  ),
  evidence(
    "DRAFT-REL-SCHEMA",
    "draft-pr1454",
    "specification",
    "source-review",
    "packages/design-data-spec/schemas/relationship.schema.json",
    "$defs.scope/options",
    "The pinned schema permits new interaction arrays and only strings for other option keys.",
  ),
  evidence(
    "DRAFT-REL-CORPUS",
    "draft-pr1454",
    "dataset",
    "recorded-check",
    "packages/design-data/relationships",
    "All 91 JSON files; scope-fragment check",
    "Ninety-two legacy state arrays conflicted with the reviewed draft scope shape.",
    "json-tree",
    {
      scope:
        "Exact $defs.scope fragment; Ajv 2020, strict false, formats disabled, all errors; not whole-schema/SDK validation",
      result:
        "173 invalid scopes at draft head versus 81 at merge base; 92 additional state type errors",
      limitation:
        "Recorded review-time result, not executed again by the assessment adapter.",
    },
  ),
  evidence(
    "BASE-REL-SCHEMA",
    "draft-merge-base",
    "specification",
    "source-review",
    "packages/design-data-spec/schemas/relationship.schema.json",
    "$defs.scope/options",
    "The historical merge-base schema explicitly allowed the old state arrays.",
  ),
  evidence(
    "BASE-REL-CORPUS",
    "draft-merge-base",
    "dataset",
    "source-review",
    "packages/design-data/relationships",
    "Historical relationship corpus",
    "The merge-base corpus is a separate validation baseline, not current main.",
    "json-tree",
  ),
  evidence(
    "DRAFT-TOKENS",
    "draft-pr1454",
    "dataset",
    "recorded-check",
    "packages/design-data/tokens",
    "Eight arrays; UUID-paired structured comparison",
    "The inspected token delta changed classification structure without changing UUIDs, values, or alias targets.",
    "json-tree",
    {
      scope:
        "Parsed merge-base/head token arrays; recursively key-sorted objects, original array order retained",
      result:
        "2,374 head rows; 551 structured changes; zero UUID additions/removals, literal-value changes, or alias-target changes",
      limitation:
        "Recorded JSON inspection, not proof of generated legacy bytes or current SDK conformance.",
    },
  ),
  evidence(
    "DRAFT-NAMING",
    "draft-pr1454",
    "sdk-source",
    "source-review",
    "sdk/core/src/naming.rs",
    "Catalog-driven array serialization",
    "Array-valued fields are processed using catalog metadata; legacy string recognition is a different operation.",
  ),
  evidence(
    "DRAFT-QUERY",
    "draft-pr1454",
    "sdk-source",
    "source-review",
    "sdk/core/src/query.rs",
    "ALLOWED_KEYS and NAME_OBJECT_KEYS",
    "Queryable keys are narrower than the declared taxonomy catalog.",
  ),
  evidence(
    "DRAFT-SPEC022",
    "draft-pr1454",
    "sdk-source",
    "source-review",
    "sdk/core/src/validate/rules/spec022.rs",
    "Component-state membership",
    "Both buckets are checked against one component states list, not against the trigger-specific bucket.",
  ),
  evidence(
    "DRAFT-SPEC054",
    "draft-pr1454",
    "sdk-source",
    "source-review",
    "sdk/core/src/validate/rules/spec054.rs",
    "Relationship state membership",
    "Relationship membership checking reads the new buckets; membership alone does not enforce trigger placement.",
  ),
  evidence(
    "TARGET-DIRECTION",
    "joint-target",
    "target-direction",
    "confirmed-direction",
    "docs/design-data-target-contract.md",
    "Directional requirements",
    "Joint future contract; portable derivations; optionally used foundation modes; names/values may legitimately differ.",
  ),
  evidence(
    "TARGET-PROPOSAL",
    "joint-target",
    "proposal",
    "proposal",
    "docs/design-data-target-contract.md",
    "Proposed boundaries and open decisions",
    "Exact taxonomy, identity, lineage, omission, and materialization policies remain proposed or unresolved.",
  ),
  evidence(
    "PR-REVIEW-RECORD",
    "joint-target",
    "review-record",
    "reported-check",
    "docs/design-data-pr-1454-review.md",
    "CI evidence and review limits",
    "PR-author and GitHub CI evidence is a reported review record, not a live CI query or a matching installed SDK.",
    "file",
    {
      scope:
        "GitHub PR metadata and author/CI statements observed at reviewed head",
      result:
        "Successful reported jobs; author reports 1,432 tests and zero errors/986 warnings for that scope",
      limitation:
        "Remote lifecycle/checks were not refreshed by this report; targeted scope checks have separate evidence.",
    },
  ),
];

const requirements: TargetRequirement[] = [
  {
    id: "TGT-001",
    title: "Joint contract, not value convergence",
    statement:
      "Architectural representability is independent of output equality or token match counts.",
    status: "confirmed-direction",
    evidenceIds: ["TARGET-DIRECTION"],
    decision: "open",
  },
  {
    id: "TGT-002",
    title: "Portable authoring intent",
    statement:
      "Formulas, rules, bindings, and recipes should travel with design data under reviewed schemas.",
    status: "confirmed-direction",
    evidenceIds: ["TARGET-DIRECTION", "APP-FORMULAS", "APP-RULES"],
    decision: "open",
  },
  {
    id: "TGT-003",
    title: "Declared modes can be unused",
    statement:
      "A foundation mode declaration alone does not require token assignments or a Cartesian dataset.",
    status: "confirmed-direction",
    evidenceIds: ["TARGET-DIRECTION", "CURRENT-MODES"],
    decision: "open",
  },
  {
    id: "TGT-004",
    title: "Retire density duplication",
    statement:
      "Desktop/mobile foundation duplication will be retired without treating text scaling as density.",
    status: "confirmed-direction",
    evidenceIds: ["TARGET-DIRECTION", "CURRENT-DENSITY"],
    decision: "open",
  },
  {
    id: "TGT-005",
    title: "Universal and owner-scoped vocabulary",
    statement:
      "PR 1454 informs category ownership and split interaction fields; exact adoption and migrations remain proposals.",
    status: "proposed-model",
    evidenceIds: ["DRAFT-TAXONOMY", "TARGET-PROPOSAL"],
    decision: "open",
  },
  {
    id: "TGT-006",
    title: "Authored lineage is separate from effective output",
    statement:
      "Preserve lower-layer authored evidence and overlay intent separately from resolver views; choose exact semantics explicitly.",
    status: "proposed-model",
    evidenceIds: ["CURRENT-MANIFEST", "CURRENT-GRAPH", "TARGET-PROPOSAL"],
    decision: "open",
  },
  {
    id: "TGT-007",
    title: "Identity-preserving taxonomy evolution",
    statement:
      "Classifications and references need an explicit rename/split/migration policy, not string replacement or inferred UUID equality.",
    status: "proposed-model",
    evidenceIds: ["TARGET-PROPOSAL", "APP-TOKEN-EDITS"],
    decision: "open",
  },
  {
    id: "TGT-008",
    title: "Explicit evaluation/materialization boundaries",
    statement:
      "Separate evaluated scenarios from assignments and materialized records before changing current counts or generation.",
    status: "proposed-model",
    evidenceIds: ["TARGET-PROPOSAL", "APP-PROJECTION"],
    decision: "open",
  },
];

type FindingInput = Omit<
  ArchitecturalFinding,
  "decision" | "scope" | "recommendation" | "discriminatingCheck"
> &
  Partial<
    Pick<
      ArchitecturalFinding,
      "scope" | "recommendation" | "discriminatingCheck"
    >
  >;
function finding(item: FindingInput): ArchitecturalFinding {
  return {
    ...item,
    decision: "open",
    scope: item.scope ?? item.title,
    recommendation:
      item.recommendation ??
      "Review the joint contract before implementation; preserve current behavior and source evidence",
    discriminatingCheck:
      item.discriminatingCheck ??
      "Evaluate the documented scenario against each profile independently; do not infer closure from equal values",
  };
}

const findings: ArchitecturalFinding[] = [
  finding({
    id: "JTC-001",
    title: "Compatibility is evidence, not the destination",
    plane: "target-contract",
    classification: "intentional-policy",
    priority: "high",
    owner: "joint",
    statement:
      "Output matching does not establish a joint authoring/interoperability contract.",
    consequence: "Current data can incorrectly constrain future architecture.",
    evidenceIds: ["APP-REPORT", "TARGET-DIRECTION"],
    requirementIds: ["TGT-001"],
  }),
  finding({
    id: "JTC-002",
    title: "Color name, identity, and family need distinct semantics",
    plane: "target-contract",
    classification: "semantic-disagreement",
    priority: "high",
    owner: "joint",
    statement:
      "Authored scale/source labels are not automatically hue-family terms or semantic roles.",
    consequence:
      "Blind field renames can lose identity or classification meaning.",
    evidenceIds: ["APP-COLOR", "CURRENT-COLOR-FIELD", "CURRENT-TAXONOMY"],
    requirementIds: ["TGT-007"],
    discriminatingCheck:
      "Rename an explicitly classified source label and retain its identity, classification, and alias targets",
  }),
  finding({
    id: "JTC-003",
    title: "Declarations do not imply materialized coverage",
    plane: "target-contract",
    classification: "representation-difference",
    priority: "high",
    owner: "leonardo",
    statement:
      "Current Cartesian evaluation results need an explicit boundary from future canonical assignments/records.",
    consequence:
      "Evaluation samples can inflate dataset coverage or imply unintended mode usage.",
    evidenceIds: [
      "APP-PROJECTION",
      "APP-MODES",
      "CURRENT-MODES",
      "CURRENT-CASCADE",
    ],
    requirementIds: ["TGT-003", "TGT-008"],
    discriminatingCheck:
      "Add an unused mode without forcing canonical records, while allowing separately labeled evaluations",
  }),
  finding({
    id: "JTC-004",
    title: "Foundation density is an intentional future transition",
    plane: "target-contract",
    classification: "intentional-policy",
    priority: "high",
    owner: "joint",
    statement:
      "Historical desktop/mobile data must not force a density axis into Spectrum studio or a text-scaling crosswalk.",
    consequence:
      "A compatibility adapter could preserve architecture intended for retirement.",
    evidenceIds: ["CURRENT-DENSITY", "APP-MODES", "TARGET-DIRECTION"],
    requirementIds: ["TGT-004"],
  }),
  finding({
    id: "JTC-005",
    title: "Override query lineage differs between spec and SDK source",
    plane: "current-state",
    classification: "sdk-spec-disagreement",
    priority: "high",
    owner: "upstream",
    statement:
      "The spec retains lower-layer query records while the inspected SDK map replaces a shadowed key in memory; foundation files remain unchanged.",
    consequence:
      "Flattened effective views can be mistaken for authored inventory or lineage.",
    evidenceIds: ["CURRENT-MANIFEST", "CURRENT-GRAPH"],
    requirementIds: ["TGT-006"],
    discriminatingCheck:
      "Compare authored lineage, query counts, alias targets, and resolved winners using a version-corresponding supported adapter",
  }),
  finding({
    id: "JTC-006",
    title: "Platform opt-in is more than an ID/name list",
    plane: "target-contract",
    classification: "app-capability-gap",
    priority: "medium",
    owner: "leonardo",
    statement:
      "Local modes, restrictions, simple overrides, and new qualified token records are separate platform mechanisms.",
    consequence:
      "Unused modes or different platform terms could be mislabeled as missing token support.",
    evidenceIds: [
      "APP-PLATFORMS",
      "APP-MODES",
      "CURRENT-MANIFEST",
      "CURRENT-GRAPH",
    ],
    requirementIds: ["TGT-003", "TGT-006"],
  }),
  finding({
    id: "JTC-007",
    title: "Generated values do not carry portable derivation intent",
    plane: "target-contract",
    classification: "schema-expressiveness-gap",
    priority: "high",
    owner: "joint",
    statement:
      "The reviewed schema catalog lacks a portable program family matching app formulas/rules/recipes; app-owned definitions are a transitional boundary.",
    consequence: "Exported numbers cannot reconstruct authoring intent.",
    evidenceIds: [
      "CURRENT-SCHEMAS",
      "APP-FORMULAS",
      "APP-RULES",
      "TARGET-DIRECTION",
    ],
    requirementIds: ["TGT-002"],
    discriminatingCheck:
      "Round-trip an existing recipe and typed references, then reproduce output under declared evaluator semantics",
  }),
  finding({
    id: "JTC-008",
    title: "Display-name editing is not taxonomy migration",
    plane: "target-contract",
    classification: "app-capability-gap",
    priority: "high",
    owner: "joint",
    statement:
      "Current token edits do not define category/term identity, semantic reclassification, or reference-preserving migration.",
    consequence: "A string rename can be mistaken for a safe semantic change.",
    evidenceIds: [
      "APP-TOKEN-EDITS",
      "APP-CONTRACT",
      "CURRENT-TAXONOMY",
      "TARGET-PROPOSAL",
    ],
    requirementIds: ["TGT-007"],
  }),
  finding({
    id: "JTC-009",
    title: "Components and relationships are taxonomy consumers",
    plane: "target-contract",
    classification: "app-capability-gap",
    priority: "medium",
    owner: "joint",
    statement:
      "Relationship/component reference semantics must be audited without populating unimplemented app domains to improve inventory counts.",
    consequence:
      "Token-only comparison misses ownership and migration effects on consumers.",
    evidenceIds: ["APP-CONTRACT", "CURRENT-SCHEMAS", "CURRENT-MANIFEST"],
    requirementIds: ["TGT-005", "TGT-007"],
  }),
  finding({
    id: "JTC-010",
    title: "Current validity is not future-contract conformance",
    plane: "target-contract",
    classification: "unassessable",
    priority: "high",
    owner: "joint",
    statement:
      "Curated source facts, input validity, target proposals, and executed SDK checks require separate provenance and scopes.",
    consequence:
      "A byte match, SDK status, or equal value can be promoted into a false architectural pass.",
    evidenceIds: [
      "APP-REPORT",
      "CURRENT-SCHEMAS",
      "PR-REVIEW-RECORD",
      "TARGET-PROPOSAL",
    ],
    requirementIds: ["TGT-001", "TGT-002"],
  }),
  finding({
    id: "JTC-011",
    title: "Draft taxonomy changes meaning without changing values",
    plane: "current-state",
    classification: "representation-difference",
    priority: "high",
    owner: "joint",
    statement:
      "PR 1454's universal/owner-scoped distinction and interaction split are prospective evidence, not a merged or complete target contract.",
    consequence:
      "Current and draft schemas/data could be combined into fictitious conformance.",
    evidenceIds: [
      "DRAFT-TAXONOMY",
      "DRAFT-TOKENS",
      "DRAFT-NAMING",
      "DRAFT-REL-SCHEMA",
      "DRAFT-REL-CORPUS",
    ],
    requirementIds: ["TGT-005", "TGT-007"],
  }),
  finding({
    id: "PR1454-001",
    title: "Legacy CTR state arrays do not match the draft scope shape",
    plane: "current-state",
    classification: "dataset-content-difference",
    priority: "high",
    owner: "upstream",
    statement:
      "The recorded scope-fragment check found 92 new state-array type errors relative to the historical merge base.",
    consequence:
      "Token migration and reported CI do not establish relationship migration/validation coverage.",
    evidenceIds: [
      "DRAFT-REL-SCHEMA",
      "DRAFT-REL-CORPUS",
      "BASE-REL-SCHEMA",
      "BASE-REL-CORPUS",
      "PR-REVIEW-RECORD",
    ],
    requirementIds: ["TGT-005", "TGT-007"],
    discriminatingCheck:
      "Run complete configured relationship shape/reference checks on a matching draft profile; preserve UUIDs during any approved migration",
  }),
  finding({
    id: "PR1454-002",
    title: "State membership does not prove trigger placement",
    plane: "current-state",
    classification: "schema-expressiveness-gap",
    priority: "medium",
    owner: "upstream",
    statement:
      "The two fields refer to one component states list, but inspected membership rules do not enforce which trigger belongs in which bucket.",
    consequence:
      "A referenced prop state could be placed in the transient field without a dedicated placement diagnostic.",
    evidenceIds: ["DRAFT-STATES", "DRAFT-SPEC022", "DRAFT-SPEC054"],
    requirementIds: ["TGT-005"],
    discriminatingCheck:
      "Deliberately misplace a declared prop-triggered state; any new token/CTR placement rule remains a proposal",
  }),
  finding({
    id: "PR1454-003",
    title: "Draft prose/catalog/data remain transitional",
    plane: "current-state",
    classification: "semantic-disagreement",
    priority: "medium",
    owner: "upstream",
    statement:
      "Visibility/property examples and universal versus component-anchored interaction semantics need reconciliation.",
    consequence:
      "A migration or authoring tool could follow contradictory instructions.",
    evidenceIds: [
      "DRAFT-TAXONOMY",
      "DRAFT-TOKEN-FORMAT",
      "DRAFT-STATES",
      "DRAFT-TOKENS",
      "PR-REVIEW-RECORD",
    ],
    requirementIds: ["TGT-005"],
  }),
  finding({
    id: "PR1454-004",
    title: "Catalog support is not query support",
    plane: "current-state",
    classification: "implementation-limit",
    priority: "medium",
    owner: "upstream",
    statement:
      "The inspected SDK query key list does not expose every declared new semantic field.",
    consequence:
      "A declared/serializable attribute could be incorrectly offered as a supported SDK or manifest query.",
    evidenceIds: [
      "DRAFT-TAXONOMY",
      "DRAFT-FIELDS",
      "DRAFT-NAMING",
      "DRAFT-QUERY",
    ],
    requirementIds: ["TGT-005"],
    capabilities: [
      {
        profileId: "draft-pr1454",
        subject: "element/attribute/affordance/visibility",
        level: "declared",
        status: "reviewed-support",
      },
      {
        profileId: "draft-pr1454",
        subject: "element/attribute/affordance/visibility",
        level: "queryable",
        status: "reviewed-limit",
      },
    ],
  }),
  finding({
    id: "PR1454-005",
    title: "Compatibility is profile- and consumer-specific",
    plane: "current-state",
    classification: "representation-difference",
    priority: "high",
    owner: "joint",
    statement:
      "Reported unchanged legacy output does not imply stable name-object, query, catalog, or SDK behavior; draft lifecycle is not checked live here.",
    consequence:
      "Same draft version strings or old binaries can hide incompatible contract revisions.",
    evidenceIds: [
      "DRAFT-TAXONOMY",
      "DRAFT-NAMING",
      "DRAFT-QUERY",
      "DRAFT-TOKENS",
      "PR-REVIEW-RECORD",
    ],
    requirementIds: ["TGT-001", "TGT-005", "TGT-007"],
  }),
];

export const architectureRegistry: AssessmentRegistry = {
  version: "joint-target-review-r1-v1",
  evidence: sources,
  requirements,
  findings,
};
