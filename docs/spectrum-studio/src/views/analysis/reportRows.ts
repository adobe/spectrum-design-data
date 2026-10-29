// Copyright 2026 Adobe. All rights reserved.
import type {
  AnalysisFinding,
  AnalysisReport,
} from "../../features/design-data/comparison";
import type {
  ArchitectureAssessment,
  ArchitecturalFinding,
  AssessmentPlane,
  TargetRequirement,
} from "../../features/design-data/assessment";
import type { OutputOrigin } from "../../features/design-data/materialization";

export interface AnalysisRow {
  id: string;
  name: string;
  category: string;
  classification: string;
  priority: string;
  freshness: string;
  message: string;
  evidenceIds: string[];
  methods: string[];
  profileIds: string[];
  outputOrigins?: OutputOrigin[];
  content:
    | { kind: "output"; item: AnalysisFinding }
    | { kind: "architecture"; item: ArchitecturalFinding }
    | { kind: "requirement"; item: TargetRequirement };
}

export function analysisRows(
  report: AnalysisReport,
  plane: AssessmentPlane,
): AnalysisRow[] {
  if (plane === "generated-output") {
    const origins = (kind: "app" | "reference") =>
      new Map(
        report.materialization?.inputs[kind].observations.map((item) => [
          item.recordId,
          item.origin,
        ]) ?? [],
      );
    const app = origins("app");
    const reference = origins("reference");
    return report.findings.map((item) => ({
      id: item.id,
      name: item.app?.name ?? item.reference?.name ?? item.message,
      category: item.category,
      classification: item.classification,
      priority: item.severity,
      freshness: report.freshness,
      message: item.message,
      evidenceIds: [],
      methods: [],
      profileIds: [],
      content: { kind: "output", item },
      outputOrigins: [
        ...new Set(
          [
            item.app ? app.get(item.app.id) : undefined,
            item.reference ? reference.get(item.reference.id) : undefined,
          ].filter((origin): origin is OutputOrigin => origin !== undefined),
        ),
      ],
    }));
  }
  const assessment = report.architecture;
  if (!assessment) return [];
  const links = (ids: string[]) => {
    const evidence = assessment.evidence.filter((item) =>
      ids.includes(item.id),
    );
    return {
      evidenceIds: ids,
      methods: [...new Set(evidence.map((item) => item.method))],
      profileIds: [...new Set(evidence.map((item) => item.profileId))],
    };
  };
  const findings: AnalysisRow[] = assessment.findings
    .filter((item) => item.plane === plane)
    .map((item) => ({
      id: `architecture:${item.id}`,
      name: `${item.id}: ${item.title}`,
      category: item.owner,
      classification: item.classification,
      priority: item.priority,
      freshness: item.freshness,
      message: `${item.statement} ${item.scope} ${item.consequence} ${item.recommendation} ${item.discriminatingCheck}`,
      ...links(item.evidenceIds),
      content: { kind: "architecture", item },
    }));
  if (plane === "target-contract")
    return [
      ...assessment.requirements.map(
        (item): AnalysisRow => ({
          id: `requirement:${item.id}`,
          name: `${item.id}: ${item.title}`,
          category: "joint",
          classification: item.status,
          priority: "not-assigned",
          freshness: item.freshness,
          message: item.statement,
          ...links(item.evidenceIds),
          content: { kind: "requirement", item },
        }),
      ),
      ...findings,
    ];
  return findings;
}

export function architecturalEvidence(
  assessment: ArchitectureAssessment,
  row: AnalysisRow,
) {
  return {
    reviewedItem: row.content.item,
    evidence: assessment.evidence.filter((item) =>
      row.evidenceIds.includes(item.id),
    ),
    profiles: assessment.profiles.filter((item) =>
      row.profileIds.includes(item.id),
    ),
  };
}
