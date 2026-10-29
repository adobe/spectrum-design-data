// Copyright 2026 Adobe. All rights reserved.
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValueRawSync } from "jotai";
import {
  ActionButton,
  Badge,
  Button,
  Disclosure,
  DisclosurePanel,
  DisclosureTitle,
  Heading,
  Picker,
  PickerItem,
  ProgressBar,
  ProgressCircle,
  SearchField,
  Text,
} from "@react-spectrum/s2";
import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2/TableView";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Refresh from "@react-spectrum/s2/icons/Refresh";
import Download from "@react-spectrum/s2/icons/Download";
import ChevronLeft from "@react-spectrum/s2/icons/ChevronLeft";
import ChevronRight from "@react-spectrum/s2/icons/ChevronRight";
import {
  canonicalJson,
  reportMarkdown,
  reportWithFreshness,
  type AnalysisInput,
  type AnalysisRecord,
  type AnalysisReport,
} from "../../features/design-data/comparison";
import { useAnalysisWork } from "../../features/design-data/useAnalysisWork";
import { gapRegisterLoadIssues } from "../../features/design-data/gaps";
import type { AnalysisDataset } from "../../features/design-data/analysisWork";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";
import {
  isArchitectureAssessment,
  type AssessmentPlane,
} from "../../features/design-data/assessment";
import { analysisRows, architecturalEvidence } from "./reportRows";
import {
  isOutputMetadata,
  outputEvidence,
} from "../../features/design-data/materialization";
import { dimensionArtifactStateAtom } from "../../features/design-data/dimensionArtifactState";
import {
  coverageInventoryRecords,
  type CoverageGroup,
  type CoverageUnit,
} from "../../features/design-data/coverage";
import "./AnalysisView.css";

const classifications = [
  "all",
  "invalid-input",
  "field-gap",
  "type-gap",
  "mode-gap",
  "platform-gap",
  "value-difference",
  "structure-difference",
  "extension",
  "app-only",
  "reference-only",
  "ambiguous",
  "unassessable",
  "equal",
];

function download(report: AnalysisReport, format: "json" | "md") {
  const blob = new Blob(
    [format === "json" ? `${canonicalJson(report)}\n` : reportMarkdown(report)],
    { type: format === "json" ? "application/json" : "text/markdown" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `design-data-${report.inputs.app.kind}.${format}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AnalysisView() {
  const storedArtifacts = useAtomValueRawSync(dimensionArtifactStateAtom);
  const [dataset, setDataset] = useState<AnalysisDataset>("defaults");
  const [view, setView] = useState("overview");
  const [coverageUnit, setCoverageUnit] = useState<CoverageUnit>("concepts");
  const [coverageGroup, setCoverageGroup] = useState<string>();
  const [coverageOffset, setCoverageOffset] = useState(0);
  const [plane, setPlane] = useState<AssessmentPlane>("generated-output");
  const [reference, setReference] = useState<AnalysisInput>();
  const previousReference = useRef<AnalysisInput | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState("all");
  const [classification, setClassification] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [freshness, setFreshness] = useState("all");
  const [method, setMethod] = useState("all");
  const [profile, setProfile] = useState("all");
  const [origin, setOrigin] = useState("all");
  const [offset, setOffset] = useState(0);
  const [evidence, setEvidence] = useState<string>();
  const [gapKind, setGapKind] = useState("all");
  const [gapStatus, setGapStatus] = useState("all");

  useEffect(() => {
    const reload = () => setRefresh((value) => value + 1);
    import.meta.hot?.on("analysis:changed", reload);
    return () => import.meta.hot?.off("analysis:changed", reload);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus(previousReference.current ? "refreshing" : "loading");
    setError("");
    if (!import.meta.env.DEV) {
      setStatus("unavailable");
      setError("Local reference data is unavailable in this hosted build.");
      return;
    }
    void fetch("/__design-data/reference", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Reference request failed (${response.status}).`);
        const input: AnalysisInput = await response.json();
        if (
          !input.source ||
          !Array.isArray(input.records) ||
          !Array.isArray(input.errors) ||
          !Array.isArray(input.schemas) ||
          !Array.isArray(input.categories) ||
          !Array.isArray(input.limitations)
        )
          throw new Error("Invalid reference response.");
        if (
          input.architecture !== undefined &&
          !isArchitectureAssessment(input.architecture)
        )
          throw new Error("Invalid architectural assessment response.");
        if (
          input.outputMetadata !== undefined &&
          !isOutputMetadata(input.outputMetadata, input.records)
        )
          throw new Error("Invalid output provenance metadata response.");
        if (
          input.inventoryStatus !== undefined &&
          !["complete", "partial", "unavailable"].includes(
            input.inventoryStatus,
          )
        )
          throw new Error("Invalid inventory status response.");
        if (!input.records.length && input.errors.length && !input.architecture)
          throw new Error(input.errors.join("\n"));
        if (controller.signal.aborted) return;
        previousReference.current = input;
        setReference(input);
        setStatus(input.errors.length ? "partial" : "live");
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setError(failure instanceof Error ? failure.message : String(failure));
        setStatus(previousReference.current ? "stale" : "unavailable");
      });
    return () => controller.abort();
  }, [refresh]);

  const staleReference = status === "stale" || status === "refreshing";
  const work = useAnalysisWork(
    dataset,
    reference,
    view === "gaps",
    staleReference,
  );
  const app = work.result?.app;
  const report = work.result?.report;

  useEffect(() => {
    setOffset(0);
    setEvidence(undefined);
  }, [
    dataset,
    plane,
    category,
    classification,
    severity,
    freshness,
    method,
    profile,
    origin,
    deferredQuery,
  ]);
  useEffect(() => {
    setCoverageOffset(0);
  }, [dataset, coverageGroup, report]);
  const rows = useMemo(
    () => (report && view === "details" ? analysisRows(report, plane) : []),
    [report, plane, view],
  );
  const output = plane === "generated-output";
  const assessment = report?.architecture;
  const findingTypes = output
    ? classifications
    : ["all", ...new Set(rows.map((row) => row.classification))];
  const findings = rows.filter(
    (row) =>
      (category === "all" || row.category === category) &&
      (classification === "all" || row.classification === classification) &&
      (severity === "all" || row.priority === severity) &&
      (freshness === "all" || row.freshness === freshness) &&
      (method === "all" || row.methods.includes(method)) &&
      (profile === "all" || row.profileIds.includes(profile)) &&
      (origin === "all" ||
        row.outputOrigins?.some((item) => item === origin)) &&
      `${row.name} ${row.message} ${row.evidenceIds.join(" ")} ${row.profileIds.join(" ")}${row.content.kind === "output" ? ` ${row.content.item.reference?.name ?? ""} ${row.content.item.app?.source ?? ""} ${row.content.item.reference?.source ?? ""}` : ""}`
        .toLowerCase()
        .includes(deferredQuery.toLowerCase()),
  );
  const visible = findings.slice(offset, offset + 50);
  const selected = rows.find((row) => row.id === evidence);
  const coverage = report?.coverage;
  const referenceUnavailable =
    reference?.inventoryStatus === "unavailable" ||
    (reference?.records.length === 0 && Boolean(reference.errors.length));
  const gapResults = work.gapResult?.selected ?? [];
  const savedGapResults = work.gapResult?.saved ?? [];
  const selectedCoverage = [
    coverage?.allTokens,
    ...(coverage?.categories ?? []),
    ...(coverage?.tokenTypes ?? []),
  ].find((item) => item?.id === coverageGroup);
  const details = useMemo(() => {
    if (
      view !== "overview" ||
      !selectedCoverage ||
      !reference ||
      !report ||
      !app
    )
      return [];
    const left = coverageInventoryRecords(app).filter((record) =>
      selectedCoverage.appRecordIds.includes(record.id),
    );
    const right = coverageInventoryRecords(reference).filter((record) =>
      selectedCoverage.referenceRecordIds.includes(record.id),
    );
    const pairedLeft = new Set<string>(),
      pairedRight = new Set<string>(),
      seen = new Set<string>();
    const result: {
      id: string;
      app?: (typeof left)[number];
      reference?: (typeof right)[number];
      relationship: string;
      values: string;
    }[] = [];
    for (const finding of report.findings)
      if (
        finding.app &&
        finding.reference &&
        finding.confidence !== "unassessable" &&
        finding.classification !== "ambiguous" &&
        selectedCoverage.appRecordIds.includes(finding.app.id) &&
        selectedCoverage.referenceRecordIds.includes(finding.reference.id)
      ) {
        pairedLeft.add(finding.app.id);
        pairedRight.add(finding.reference.id);
        const id = canonicalJson([finding.app.id, finding.reference.id]);
        const valueFinding = report.findings.find(
          (item) =>
            item.app?.id === finding.app!.id &&
            item.reference?.id === finding.reference!.id &&
            ["equal", "value-difference", "structure-difference"].includes(
              item.classification,
            ),
        );
        if (!seen.has(id))
          result.push({
            id,
            app: finding.app,
            reference: finding.reference,
            relationship: "Confirmed counterparts",
            values:
              valueFinding?.classification === "equal"
                ? "Same value"
                : valueFinding
                  ? "Different value or format"
                  : "Value not compared",
          });
        seen.add(id);
      }
    for (const record of right)
      if (!pairedRight.has(record.id)) {
        const missingType =
          record.category === "tokens" &&
          coverage?.tokenTypes.some(
            (item) =>
              item.id !== "type:other" &&
              item.counts.rows.missing > 0 &&
              item.referenceRecordIds.includes(record.id),
          );
        const missingCategory =
          selectedCoverage.counts[coverageUnit].app === 0 &&
          coverage?.inventories.app === "complete" &&
          selectedCoverage.id !== "type:other";
        result.push({
          id: `reference:${record.id}`,
          reference: record,
          relationship:
            missingType || missingCategory
              ? "No app data of this kind"
              : "Not matched yet",
          values: "Not compared",
        });
      }
    for (const record of left)
      if (!pairedLeft.has(record.id))
        result.push({
          id: `app:${record.id}`,
          app: record,
          relationship: "App data without a confirmed counterpart",
          values: "Not compared",
        });
    return result;
  }, [view, selectedCoverage, reference, report, app, coverage, coverageUnit]);
  const compareGroup = (group: CoverageGroup) => {
    setCoverageGroup(group.id);
    setCoverageOffset(0);
  };
  const label = (record?: AnalysisRecord) => {
    if (!record) return "No confirmed counterpart";
    if (!record.structuredName) return record.name;
    const fields = Object.entries(record.structuredName)
      .map(
        ([key, value]) =>
          `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`,
      )
      .join(" · ");
    return record.name === canonicalJson(record.structuredName)
      ? fields
      : `${record.name} · ${fields}`;
  };
  const value = (record?: AnalysisRecord) => {
    if (!record) return "—";
    if (record.reference) return `Alias → ${record.reference}`;
    if (typeof record.value === "number")
      return `${record.value}${record.unit ?? ""}`;
    if (typeof record.value === "string") return record.value;
    const serialized = canonicalJson(record.value) ?? "No value";
    return serialized.length > 180
      ? `${serialized.slice(0, 180)}…`
      : serialized;
  };
  const selectPlane = (key: string) => {
    setPlane(key as AssessmentPlane);
    setCategory("all");
    setClassification("all");
    setSeverity("all");
    setFreshness("all");
    setMethod("all");
    setProfile("all");
    setOrigin("all");
    setQuery("");
  };

  return (
    <section className="analysisView" data-component="Analysis">
      <header className="analysisHeading">
        <Heading level={1}>Analysis</Heading>
        <Badge variant={status === "live" ? "positive" : "notice"}>
          {view === "details"
            ? status
            : ((
                {
                  live: "Comparison ready",
                  partial: "Validation issues",
                  stale: "Last-good results",
                  refreshing: "Refreshing reference",
                  loading: "Loading reference",
                  unavailable: "Reference unavailable",
                } as Record<string, string>
              )[status] ?? status)}
        </Badge>
        <ActionButton
          aria-label="Refresh reference"
          onPress={() => setRefresh((value) => value + 1)}
        >
          <Refresh />
        </ActionButton>
      </header>
      <div className="analysisToolbar">
        <Picker
          label="Analysis view"
          selectedKey={view}
          onSelectionChange={(key) => setView(String(key))}
        >
          <PickerItem id="overview">Coverage overview</PickerItem>
          <PickerItem id="schemas">Schema and model gaps</PickerItem>
          <PickerItem id="details">Detailed comparison</PickerItem>
          <PickerItem id="gaps">Alignment gap register</PickerItem>
        </Picker>
        {view === "details" && (
          <Picker
            label="Assessment plane"
            selectedKey={plane}
            onSelectionChange={(key) => selectPlane(String(key))}
          >
            <PickerItem id="current-state">Current-state audit</PickerItem>
            <PickerItem id="target-contract">Joint target contract</PickerItem>
            <PickerItem id="generated-output">Generated output</PickerItem>
          </Picker>
        )}
        <Picker
          label="Comparison source"
          selectedKey={dataset}
          onSelectionChange={(key) => {
            if (key === "defaults" || key === "saved" || key === "working")
              setDataset(key);
          }}
        >
          <PickerItem id="defaults">Shipped defaults</PickerItem>
          <PickerItem id="saved">Saved authoring</PickerItem>
          <PickerItem id="working">Working authoring</PickerItem>
        </Picker>
        {view === "overview" && (
          <Picker
            label="Count tokens as"
            selectedKey={coverageUnit}
            onSelectionChange={(key) => {
              setCoverageUnit(key as CoverageUnit);
              setCoverageOffset(0);
            }}
          >
            <PickerItem id="concepts">
              Token identities (deduplicated)
            </PickerItem>
            <PickerItem id="rows">Mode / output rows</PickerItem>
          </Picker>
        )}
        {dataset !== "defaults" && work.result && (
          <Badge variant={work.result.unsaved ? "notice" : "neutral"}>
            {work.result.unsaved ? "Unsaved changes" : "Saved"}
          </Badge>
        )}
        <Button
          variant="secondary"
          isDisabled={!report || report.inputs.app.kind !== dataset}
          onPress={() =>
            report &&
            download(
              reportWithFreshness(report, staleReference ? "stale" : "current"),
              "json",
            )
          }
        >
          <Download />
          <Text>JSON</Text>
        </Button>
        <Button
          variant="secondary"
          isDisabled={!report || report.inputs.app.kind !== dataset}
          onPress={() =>
            report &&
            download(
              reportWithFreshness(report, staleReference ? "stale" : "current"),
              "md",
            )
          }
        >
          <Download />
          <Text>Markdown</Text>
        </Button>
      </div>
      {status === "loading" && (
        <ProgressCircle aria-label="Loading reference" isIndeterminate />
      )}
      {error && (
        <p role="status" className="analysisError">
          {error}
        </p>
      )}
      {gapRegisterLoadIssues.length > 0 && (
        <section
          role="status"
          aria-label="Gap register problems"
          className="analysisError"
        >
          <Heading level={2}>The gap register has problems</Heading>
          <p>
            Analysis still loads. Fix these in src/data/design-data-gaps.json,
            then run pnpm check:design-data-gaps.
          </p>
          <ul>
            {gapRegisterLoadIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      )}
      <DerivedContentBoundary
        state={work.state}
        label="Generating comparison"
        error={work.error}
        onRetry={work.retry}
      >
        {referenceUnavailable && view === "overview" && (
          <section aria-label="Reference connection unavailable">
            <Heading level={2}>Design-data could not be loaded</Heading>
            <p>
              This is a reference connection/configuration problem—not 0%
              coverage. Comparison percentages are unavailable until the
              repository is loaded.
            </p>
            <p className="analysisProvenance">
              Configured checkout: {reference?.source.root}
            </p>
            <ul>
              {reference?.errors.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <p>
              Set DESIGN_DATA_PATH in the local .env.local configuration,
              restart the dev server, then refresh this comparison.
            </p>
          </section>
        )}
        {view === "gaps" && (
          <section aria-label="Alignment gap register">
            <Heading level={2}>Alignment gap register</Heading>
            <p>
              Implementation, alignment and RFC acceptance are separate. Working
              progress is provisional. Unavailable or stale reference evidence
              cannot establish alignment.
            </p>
            <div className="analysisToolbar">
              <Picker
                label="Gap kind"
                selectedKey={gapKind}
                onSelectionChange={(key) => setGapKind(String(key))}
              >
                <PickerItem id="all">All kinds</PickerItem>
                {[
                  "app-capability",
                  "spec-schema",
                  "sdk",
                  "token-content",
                  "intentional-policy",
                  "unassessable",
                ].map((kind) => (
                  <PickerItem key={kind} id={kind}>
                    {kind}
                  </PickerItem>
                ))}
              </Picker>
              <Picker
                label="Implementation status"
                selectedKey={gapStatus}
                onSelectionChange={(key) => setGapStatus(String(key))}
              >
                <PickerItem id="all">All statuses</PickerItem>
                {[
                  "open",
                  "in progress",
                  "implemented",
                  "verified",
                  "blocked",
                ].map((item) => (
                  <PickerItem key={item} id={item}>
                    {item}
                  </PickerItem>
                ))}
              </Picker>
            </div>
            {gapResults
              .filter(
                (result) =>
                  (gapKind === "all" || result.gap.kind === gapKind) &&
                  (gapStatus === "all" ||
                    result.gap.implementation === gapStatus),
              )
              .map((result) => (
                <Disclosure key={result.gap.id}>
                  <DisclosureTitle>
                    {result.gap.id}: {result.gap.title} · {result.disposition}
                  </DisclosureTitle>
                  <DisclosurePanel>
                    <p>
                      Implementation: {result.gap.implementation}. Alignment:{" "}
                      {result.disposition}
                      {result.provisional ? " (provisional)" : ""}. RFC:{" "}
                      {result.gap.rfc.status}.
                    </p>
                    <p>
                      Saved evidence:{" "}
                      {
                        savedGapResults.find(
                          (item) => item.gap.id === result.gap.id,
                        )?.disposition
                      }
                      . {result.represented} of {result.denominator} scoped
                      expected records.{" "}
                      {result.denominator === 0
                        ? "No content denominator is declared; manual criteria cannot be closed by token counts."
                        : ""}
                    </p>
                    <p>{result.gap.scope}</p>
                    <p>
                      Direction: {result.gap.direction}. Owner:{" "}
                      {result.gap.owner}. Kind: {result.gap.kind}.
                    </p>
                    <p>
                      Profile: {result.gap.profile} @ {result.gap.revision}.
                      Evidence: {result.freshness}. Linked findings:{" "}
                      {result.gap.links.join(", ")}.
                    </p>
                    <ul>
                      {result.gap.criteria.map((criterion) => (
                        <li key={criterion.id}>
                          {criterion.id}: {criterion.description}.{" "}
                          {result.criteria.find(
                            (item) => item.id === criterion.id,
                          )?.passed
                            ? "Accepted"
                            : "Not accepted"}
                          . Evidence:{" "}
                          {criterion.evidence.join(", ") || "None recorded"}.
                        </li>
                      ))}
                    </ul>
                    <p>
                      Blockers:{" "}
                      {result.gap.blockers.join("; ") || "None recorded"}.
                    </p>
                    {result.gap.rfc.link && (
                      <p>RFC packet: {result.gap.rfc.link}</p>
                    )}
                    <ul>
                      {result.gap.history.map((entry, index) => (
                        <li key={index}>
                          {entry.date}: {entry.event}
                        </li>
                      ))}
                    </ul>
                  </DisclosurePanel>
                </Disclosure>
              ))}
          </section>
        )}
        {report && coverage && view === "overview" && !referenceUnavailable && (
          <section aria-label="Data coverage overview">
            <Heading level={2}>
              How much of design-data does your app represent?
            </Heading>
            <p>
              Coverage means a confirmed counterpart—not an identical value.
              Missing data may be intentional; not matched yet may need a
              mapping rather than more data.
            </p>
            {(coverage.inventories.app !== "complete" ||
              coverage.inventories.reference !== "complete") && (
              <p className="analysisCoverageNotice">
                Partial inventory: percentages describe observed records only.
                Missing data is not inferred from failed app input.
              </p>
            )}
            {(status === "stale" || status === "refreshing") && (
              <p className="analysisCoverageNotice">
                Reference data is stale or refreshing. These are last-good
                comparison results.
              </p>
            )}
            <div className="analysisCoverageSummary">
              <div>
                <Heading level={3}>All tokens</Heading>
                <strong>
                  {coverage.allTokens.counts[coverageUnit].percent === null
                    ? "Coverage unavailable"
                    : `${coverage.allTokens.counts[coverageUnit].percent}% confirmed`}
                </strong>
                <p>
                  {coverage.allTokens.counts[coverageUnit].represented} of{" "}
                  {coverage.allTokens.counts[coverageUnit].reference}{" "}
                  design-data{" "}
                  {coverageUnit === "concepts"
                    ? "token identities"
                    : "token rows"}{" "}
                  have a confirmed app counterpart.
                </p>
                <Button
                  variant="secondary"
                  onPress={() => compareGroup(coverage.allTokens)}
                >
                  Compare all tokens
                </Button>
              </div>
              {[
                coverage.tokenTypes.find((group) => group.id === "type:color"),
                coverage.categories.find(
                  (group) => group.id === "category:components",
                ),
              ]
                .filter((group): group is CoverageGroup => group !== undefined)
                .map((group) => {
                  const count = group.counts[coverageUnit];
                  return (
                    <div key={group.id}>
                      <Heading level={3}>{group.label}</Heading>
                      <strong>
                        {count.percent === null
                          ? "No reference data"
                          : `${count.percent}% confirmed`}
                      </strong>
                      <p>
                        {count.app} in app · {count.reference} in design-data.{" "}
                        {count.represented} confirmed counterparts.
                      </p>
                      <Button
                        variant="secondary"
                        onPress={() => compareGroup(group)}
                      >
                        Explore {group.label.toLowerCase()}
                      </Button>
                    </div>
                  );
                })}
              <div>
                <Heading level={3}>What is still a gap?</Heading>
                {coverage.allTokens.counts[coverageUnit].reference === 0 ? (
                  <p>
                    No reference token inventory is available for a gap
                    percentage.
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>
                        {coverage.allTokens.counts[coverageUnit].missingPercent}
                        %
                      </strong>{" "}
                      is missing from the app token output.
                    </p>
                    <p>
                      <strong>
                        {coverage.allTokens.counts[coverageUnit].unknownPercent}
                        %
                      </strong>{" "}
                      is not matched yet—not confirmed missing.
                    </p>
                  </>
                )}
              </div>
              <div>
                <Heading level={3}>How different are the values?</Heading>
                <p>
                  {coverage.values.equal} same · {coverage.values.different}{" "}
                  different · {coverage.values.notCompared} paired but not
                  value-compared.
                </p>
                <p>
                  {coverage.values.agreementPercent === null
                    ? "No comparable values yet."
                    : `${coverage.values.agreementPercent}% agreement among comparable pairs only.`}{" "}
                  Different values can be deliberate.
                </p>
              </div>
            </div>
            <Disclosure isQuiet>
              <DisclosureTitle>
                How are these percentages calculated?
              </DisclosureTitle>
              <DisclosurePanel>
                <p>
                  This compares the selected app dataset and its generated
                  output projection. It does not score every capability of the
                  authoring environment or prove token-schema validity.
                </p>
                <p>
                  {coverageUnit === "concepts"
                    ? "Each explicit concept ID is counted once, across modes. A counterpart in one context does not establish all-mode coverage."
                    : "Rows include mode contexts and app evaluation samples; these are not canonical materialized-token counts."}
                </p>
                {coverageUnit === "concepts" &&
                  (coverage.identityFallbackRows.app > 0 ||
                    coverage.identityFallbackRows.reference > 0) && (
                    <p>
                      {coverage.identityFallbackRows.app} app rows and{" "}
                      {coverage.identityFallbackRows.reference} reference rows
                      lack a concept ID. They are counted by UUID/record
                      identity instead; their mode grouping is unknown. These
                      are identified-token inventories, not canonical concept
                      counts.
                    </p>
                  )}
                {!report.valid && (
                  <p>
                    Some inputs have validation errors. Inventory coverage and
                    schema validity are separate questions; the errors are
                    available in Detailed comparison.
                  </p>
                )}
                <ul>
                  {coverage.limitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </DisclosurePanel>
            </Disclosure>
            {[
              [
                "Design-data categories",
                coverage.categories
                  .filter((group) => group.id !== "category:tokens")
                  .sort(
                    (left, right) =>
                      Number(right.counts[coverageUnit].reference > 0) -
                      Number(left.counts[coverageUnit].reference > 0),
                  ),
              ],
              ["Token types", coverage.tokenTypes],
            ].map(([title, items]) => (
              <section key={String(title)} aria-label={String(title)}>
                <Heading level={2}>{String(title)}</Heading>
                <div className="analysisCoverageGroups">
                  {(items as CoverageGroup[]).map((group) => {
                    const count = group.counts[coverageUnit];
                    return (
                      <section
                        className="analysisCoverageGroup"
                        key={group.id}
                        aria-label={`${group.label} coverage`}
                      >
                        <div>
                          <Heading level={3}>{group.label}</Heading>
                          <p>
                            {count.app} in app · {count.reference} in
                            design-data
                          </p>
                          {count.reference > 0 &&
                            (count.missing === count.reference ? (
                              <Badge variant="neutral">No app records</Badge>
                            ) : count.unknown === count.reference ? (
                              <Badge variant="neutral">
                                Matching not assessed
                              </Badge>
                            ) : null)}
                        </div>
                        <div>
                          {count.percent === null ? (
                            <p>No design-data records to compare</p>
                          ) : (
                            <ProgressBar
                              label={`${group.label} confirmed coverage`}
                              value={count.percent}
                              valueLabel={`${count.percent}% (${count.represented}/${count.reference})`}
                              size="S"
                            />
                          )}
                          <p>
                            {count.missing} missing app data · {count.unknown}{" "}
                            not matched yet · {count.appOnly} app items without
                            a confirmed match
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          onPress={() => compareGroup(group)}
                        >
                          Compare {group.label.toLowerCase()}
                        </Button>
                      </section>
                    );
                  })}
                </div>
              </section>
            ))}
            {selectedCoverage && (
              <section
                className="analysisCoverageDetail"
                aria-label="Coverage comparison"
              >
                <Heading level={2}>
                  {selectedCoverage.label}: explore the difference
                </Heading>
                <p>{selectedCoverage.explanation}</p>
                <p>
                  You could add missing data, define a mapping, propose a schema
                  change, or keep the difference intentionally. These counts do
                  not decide which solution is right.
                </p>
                <div className="analysisResults">
                  <TableView
                    aria-label="Side-by-side data comparison"
                    isQuiet
                    overflowMode="wrap"
                    styles={style({ height: 400 })}
                  >
                    <TableHeader>
                      <Column id="app" isRowHeader minWidth={220}>
                        App data
                      </Column>
                      <Column id="reference" minWidth={220}>
                        Design-data
                      </Column>
                      <Column id="relationship" minWidth={150}>
                        What differs
                      </Column>
                      <Column id="values" minWidth={150}>
                        Values
                      </Column>
                    </TableHeader>
                    <TableBody
                      items={details.slice(coverageOffset, coverageOffset + 50)}
                      renderEmptyState={() => (
                        <Text>No records in this comparison</Text>
                      )}
                    >
                      {(row) => (
                        <Row id={row.id}>
                          <Cell>
                            <Text>{label(row.app)}</Text>
                            <p>{value(row.app)}</p>
                          </Cell>
                          <Cell>
                            <Text>{label(row.reference)}</Text>
                            <p>{value(row.reference)}</p>
                          </Cell>
                          <Cell>{row.relationship}</Cell>
                          <Cell>{row.values}</Cell>
                        </Row>
                      )}
                    </TableBody>
                  </TableView>
                </div>
                <div className="analysisPagination">
                  <Text>
                    {details.length} output-record examples; showing{" "}
                    {Math.min(coverageOffset + 1, details.length)}–
                    {Math.min(coverageOffset + 50, details.length)}
                  </Text>
                  <ActionButton
                    aria-label="Previous comparison examples"
                    isDisabled={coverageOffset === 0}
                    onPress={() =>
                      setCoverageOffset(Math.max(0, coverageOffset - 50))
                    }
                  >
                    <ChevronLeft />
                  </ActionButton>
                  <ActionButton
                    aria-label="Next comparison examples"
                    isDisabled={coverageOffset + 50 >= details.length}
                    onPress={() => setCoverageOffset(coverageOffset + 50)}
                  >
                    <ChevronRight />
                  </ActionButton>
                </div>
              </section>
            )}
            <p className="analysisCoverageNotice">
              Grouping tokens by type does not match identities or validate
              schemas. Unknown and legacy properties remain in Other /
              unclassified tokens.
            </p>
          </section>
        )}
        {report && coverage && view === "schemas" && (
          <section aria-label="Schema and model gaps">
            <Heading level={2}>
              Missing data is not the same as missing schema support
            </Heading>
            <p>
              A category can have 0% app data even if its schema exists.
              Conversely, your app can author something the reference schema
              does not yet express. Neither observation tells you what you must
              build.
            </p>
            <p>
              {coverage.schemas.app.length} app projection schema identifiers ·{" "}
              {coverage.schemas.reference.length} discovered reference schema
              definitions. Schema compatibility percentage: not assessed.
            </p>
            <p>
              This is the compared input's schema inventory, not a census of all
              application models or local proposed storage schemas.
            </p>
            <p>{coverage.schemas.explanation}</p>
            <Heading level={3}>Reviewed differences to think about</Heading>
            {(assessment?.findings ?? [])
              .filter((item) =>
                [
                  "schema-expressiveness-gap",
                  "app-capability-gap",
                  "sdk-spec-disagreement",
                  "representation-difference",
                ].includes(item.classification),
              )
              .map((item) => (
                <section className="analysisCoverageGroup" key={item.id}>
                  <div>
                    <Heading level={3}>{item.title}</Heading>
                    <p>{item.statement}</p>
                    <p>Why it matters: {item.consequence}</p>
                    <p>
                      Reviewed evidence: {item.freshness.replaceAll("-", " ")}.
                      This is an observation or proposal, not an implementation
                      requirement.
                    </p>
                  </div>
                </section>
              ))}
            {!assessment && (
              <p>
                Reviewed schema assessments are unavailable for this response.
                No compatibility score is invented.
              </p>
            )}
            <p>
              Possible responses include adapting your export, changing the
              shared schema, or deliberately keeping an app-specific capability.
              Choose based on your intended system—not the raw mismatch count.
            </p>
            <Button variant="secondary" onPress={() => setView("details")}>
              Explore supporting evidence
            </Button>
          </section>
        )}
        {report && view === "details" && (
          <>
            <p className="analysisProvenance" data-testid="analysis-provenance">
              {report.inputs.app.kind} ·{" "}
              {report.valid
                ? "Valid inputs"
                : "Invalid inputs / partial comparison"}{" "}
              · App SHA-256: {report.inputs.app.hash} · Reference:{" "}
              {report.inputs.reference.revision} · Reference SHA-256:{" "}
              {report.inputs.reference.hash}
            </p>
            {!output && (
              <p
                className="analysisProvenance"
                data-testid="assessment-boundary"
              >
                Reviews concern source contracts and pinned profiles, not the
                selected authoring values. Snapshot matching is not conformance;
                proposals are not accepted schemas. Evidence status is from the
                last successful refresh.{" "}
                {status === "stale" || status === "refreshing"
                  ? "Report is stale or refreshing; downloads retain that status."
                  : ""}
              </p>
            )}
            {!output && !assessment && (
              <p role="status">
                Architectural assessment is unavailable. Generated output
                comparison remains available.
              </p>
            )}
            <div className="analysisMetrics">
              {output ? (
                <>
                  <span>
                    App token concepts <strong>{report.concepts.app}</strong>
                  </span>
                  <span>
                    Reference token concepts{" "}
                    <strong>{report.concepts.reference}</strong>
                  </span>
                  <span>
                    App mode rows <strong>{report.concepts.appRows}</strong>
                  </span>
                  <span>
                    Reference mode rows{" "}
                    <strong>{report.concepts.referenceRows}</strong>
                  </span>
                </>
              ) : assessment ? (
                <>
                  <span>
                    Reviewed findings{" "}
                    <strong>
                      {assessment?.findings.filter(
                        (item) => item.plane === plane,
                      ).length ?? 0}
                    </strong>
                  </span>
                  {plane === "target-contract" && (
                    <>
                      <span>
                        Confirmed directions{" "}
                        <strong>
                          {assessment?.requirements.filter(
                            (item) => item.status === "confirmed-direction",
                          ).length ?? 0}
                        </strong>
                      </span>
                      <span>
                        Proposed models{" "}
                        <strong>
                          {assessment?.requirements.filter(
                            (item) => item.status === "proposed-model",
                          ).length ?? 0}
                        </strong>
                      </span>
                    </>
                  )}
                  <span>
                    Unavailable profiles{" "}
                    <strong>
                      {assessment?.profiles.filter(
                        (item) => item.status === "unavailable",
                      ).length ?? 0}
                    </strong>
                  </span>
                </>
              ) : (
                <Text>
                  Assessment counts are unavailable until reviewed metadata is
                  loaded.
                </Text>
              )}
            </div>
            {output && report.materialization && (
              <section
                className="analysisLimitations"
                aria-label="Output materialization provenance"
              >
                <Heading level={2}>Evaluation and materialization</Heading>
                <p>
                  Existing row counts are output inventories, not canonical
                  dataset coverage. Omitted context is recorded as omitted; it
                  is not inferred as wildcard/default. Equal values do not merge
                  explicit assignments.
                </p>
                <p>
                  Provenance uses the selected authoring snapshot and last
                  successful reference load.{" "}
                  {status === "stale" || status === "refreshing"
                    ? "Reference evidence is stale or refreshing; downloads retain stale status."
                    : ""}
                </p>
                <ul>
                  {Object.entries(report.materialization.inputs).map(
                    ([kind, input]) => (
                      <li key={kind}>
                        {kind}: {input.status} ·{" "}
                        {input.counts.evaluationSamples} evaluation samples ·{" "}
                        {input.counts.generatedOutputs} generated output rows ·{" "}
                        {input.counts.authoredSourceRecords} authored source
                        records · {input.counts.unclassifiedRows} unclassified
                        rows · {input.counts.explicitAssignments} explicit
                        source assignments. Canonical materialized rows:
                        unavailable.
                      </li>
                    ),
                  )}
                </ul>
                <p>
                  Recipe references and bindings are declared intent, not proof
                  every sampled axis affects a value. Temporary previews are
                  excluded; working authoring state is not saved state.
                </p>
              </section>
            )}
            <div className="analysisToolbar">
              <SearchField
                aria-label="Search findings"
                placeholder="Search findings"
                value={query}
                onChange={setQuery}
              />
              <Picker
                label={output ? "Category" : "Owner"}
                selectedKey={category}
                onSelectionChange={(key) => setCategory(String(key))}
              >
                <PickerItem id="all">
                  {output ? "All categories" : "All owners"}
                </PickerItem>
                {(output
                  ? report.metrics.map((item) => item.category)
                  : [...new Set(rows.map((row) => row.category))]
                ).map((item) => (
                  <PickerItem key={item} id={item}>
                    {item}
                  </PickerItem>
                ))}
              </Picker>
              <Picker
                label="Finding type"
                selectedKey={classification}
                onSelectionChange={(key) => setClassification(String(key))}
              >
                {findingTypes.map((item) => (
                  <PickerItem key={item} id={item}>
                    {item.replaceAll("-", " ")}
                  </PickerItem>
                ))}
              </Picker>
              <Picker
                label={output ? "Severity" : "Priority"}
                selectedKey={severity}
                onSelectionChange={(key) => setSeverity(String(key))}
              >
                <PickerItem id="all">
                  {output ? "All severities" : "All priorities"}
                </PickerItem>
                {(output ? ["info", "error"] : ["high", "medium", "low"]).map(
                  (item) => (
                    <PickerItem key={item} id={item}>
                      {item === "info"
                        ? "Information"
                        : item === "error"
                          ? "Error"
                          : item}
                    </PickerItem>
                  ),
                )}
              </Picker>
              {output && (
                <Picker
                  label="Row provenance"
                  selectedKey={origin}
                  onSelectionChange={(key) => setOrigin(String(key))}
                >
                  <PickerItem id="all">All row provenance</PickerItem>
                  <PickerItem id="evaluation-sample">
                    Evaluation sample
                  </PickerItem>
                  <PickerItem id="generated-output">
                    Generated output
                  </PickerItem>
                  <PickerItem id="authored-source-record">
                    Authored source record
                  </PickerItem>
                  <PickerItem id="unclassified">Unclassified</PickerItem>
                </Picker>
              )}
              {!output && (
                <>
                  <Picker
                    label="Evidence status"
                    selectedKey={freshness}
                    onSelectionChange={(key) => setFreshness(String(key))}
                  >
                    <PickerItem id="all">All evidence states</PickerItem>
                    <PickerItem id="reviewed-snapshot">
                      Reviewed snapshot
                    </PickerItem>
                    <PickerItem id="stale">Stale</PickerItem>
                    <PickerItem id="unverified">Unverified</PickerItem>
                  </Picker>
                  <Picker
                    label="Review method"
                    selectedKey={method}
                    onSelectionChange={(key) => setMethod(String(key))}
                  >
                    <PickerItem id="all">All review methods</PickerItem>
                    {[
                      "source-review",
                      "recorded-check",
                      "reported-check",
                      "confirmed-direction",
                      "proposal",
                    ].map((item) => (
                      <PickerItem key={item} id={item}>
                        {item.replaceAll("-", " ")}
                      </PickerItem>
                    ))}
                  </Picker>
                  <Picker
                    label="Evidence profile"
                    selectedKey={profile}
                    onSelectionChange={(key) => setProfile(String(key))}
                  >
                    <PickerItem id="all">All profiles</PickerItem>
                    {(assessment?.profiles ?? []).map((item) => (
                      <PickerItem key={item.id} id={item.id}>
                        {item.label}
                      </PickerItem>
                    ))}
                  </Picker>
                </>
              )}
            </div>
            <div className="analysisResults" data-testid="analysis-results">
              <TableView
                aria-label="Analysis findings"
                isQuiet
                overflowMode="wrap"
                styles={style({ height: 400 })}
              >
                <TableHeader>
                  <Column id="name" isRowHeader minWidth={220}>
                    {output ? "Record" : "Finding or requirement"}
                  </Column>
                  <Column id="category" width={150}>
                    {output ? "Category" : "Owner"}
                  </Column>
                  <Column id="finding" width={160}>
                    Finding
                  </Column>
                  <Column id="evidence" width={110}>
                    Evidence
                  </Column>
                </TableHeader>
                <TableBody
                  items={visible}
                  renderEmptyState={() => <Text>No matching findings</Text>}
                >
                  {(finding) => (
                    <Row id={finding.id}>
                      <Cell>{finding.name}</Cell>
                      <Cell>{finding.category}</Cell>
                      <Cell>
                        {finding.classification.replaceAll("-", " ")}
                        {!output && (
                          <Text>{` · ${finding.freshness.replaceAll("-", " ")}`}</Text>
                        )}
                        {output && finding.outputOrigins?.length ? (
                          <Text>{` · ${finding.outputOrigins.map((item) => item.replaceAll("-", " ")).join(" / ")}`}</Text>
                        ) : null}
                      </Cell>
                      <Cell>
                        <Button
                          variant="secondary"
                          onPress={() => setEvidence(finding.id)}
                        >
                          Evidence
                        </Button>
                      </Cell>
                    </Row>
                  )}
                </TableBody>
              </TableView>
            </div>
            <div className="analysisPagination">
              <Text>
                {findings.length === 0
                  ? "0"
                  : `${offset + 1}–${Math.min(offset + 50, findings.length)}`}{" "}
                of {findings.length}
              </Text>
              <ActionButton
                aria-label="Previous findings"
                isDisabled={offset === 0}
                onPress={() => setOffset(Math.max(0, offset - 50))}
              >
                <ChevronLeft />
              </ActionButton>
              <ActionButton
                aria-label="Next findings"
                isDisabled={offset + 50 >= findings.length}
                onPress={() => setOffset(offset + 50)}
              >
                <ChevronRight />
              </ActionButton>
            </div>
            {selected && (
              <section
                className="analysisEvidence"
                aria-label="Finding evidence"
              >
                <Heading level={2}>Evidence</Heading>
                <p>
                  {selected.content.kind === "output"
                    ? selected.content.item.message
                    : selected.content.item.statement}
                </p>
                {selected.content.kind === "output" ? (
                  <>
                    <p>Confidence: {selected.content.item.confidence}</p>
                    <pre>
                      {JSON.stringify(
                        {
                          app: selected.content.item.app,
                          reference: selected.content.item.reference,
                          ...(report.materialization
                            ? {
                                outputProvenance: {
                                  app: outputEvidence(
                                    report.materialization.inputs.app,
                                    selected.content.item.app?.id,
                                  ),
                                  reference: outputEvidence(
                                    report.materialization.inputs.reference,
                                    selected.content.item.reference?.id,
                                  ),
                                },
                              }
                            : {}),
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </>
                ) : (
                  <>
                    <p>
                      Decision: open. Evidence status at last refresh:{" "}
                      {selected.freshness}. Review methods:{" "}
                      {selected.methods.join(", ")}. Curated reviews, recorded
                      checks, and reported CI are not rerun by snapshot
                      verification.
                    </p>
                    <pre>
                      {JSON.stringify(
                        assessment
                          ? architecturalEvidence(assessment, selected)
                          : null,
                        null,
                        2,
                      )}
                    </pre>
                  </>
                )}
              </section>
            )}
            {!output && assessment && (
              <section
                className="analysisLimitations"
                aria-label="Assessment provenance"
              >
                <Heading level={2}>Architectural provenance and limits</Heading>
                <p>
                  Assessment version: {assessment.schemaVersion} · Registry:{" "}
                  {assessment.registryVersion}. No output match count closes a
                  requirement; no combined health score.
                </p>
                <ul>
                  {assessment.profiles.map((item) => (
                    <li key={item.id}>
                      {item.label}: {item.status} · {item.kind} · Reviewed{" "}
                      {item.reviewedRevision} · Observed{" "}
                      {item.observedRevision ?? "unavailable"}.
                      {item.trackedRef
                        ? ` Tracked ref ${item.trackedRef.name}: ${item.trackedRef.observedRevision ?? "unavailable"}.`
                        : ""}{" "}
                      {item.limitation}
                    </li>
                  ))}
                </ul>
                {assessment.sdkBinary && (
                  <>
                    <Heading level={3}>Existing SDK adapter record</Heading>
                    <p>
                      {assessment.sdkBinary.availability}:{" "}
                      {assessment.sdkBinary.identity}. Source correspondence:{" "}
                      {assessment.sdkBinary.sourceCorrespondence}. Assessment
                      execution on pinned Git profiles:{" "}
                      {assessment.sdkBinary.pinnedProfileExecution}.
                    </p>
                    <p>
                      These are configured-checkout adapter records, not
                      architectural checks or a full conformance pass. Resolved
                      value comparison remains disabled.
                    </p>
                    <ul>
                      {(assessment.sdkBinary.resolution?.checks ?? []).map(
                        (item) => (
                          <li key={item.name}>
                            {item.name}: {item.status}
                            {item.message ? ` · ${item.message}` : ""}
                          </li>
                        ),
                      )}
                    </ul>
                    {assessment.sdkBinary.resolution?.error && (
                      <p>{assessment.sdkBinary.resolution.error}</p>
                    )}
                  </>
                )}
                <ul>
                  {assessment.limitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
            <section className="analysisLimitations">
              <Heading level={2}>Provenance and limits</Heading>
              <p>{report.inputs.reference.version}</p>
              <p>{report.inputs.reference.validator}</p>
              <p>Mapping version: {report.mappingVersion}</p>
              {report.inputs.reference.resolutionConformance && (
                <>
                  <Heading level={3}>Resolution conformance</Heading>
                  <p>
                    Resolved-value comparison:{" "}
                    {
                      report.inputs.reference.resolutionConformance
                        .resolvedValueComparison
                    }
                    . Fixture SHA-256:{" "}
                    {report.inputs.reference.resolutionConformance.fixtureHash}
                  </p>
                  <ul>
                    {report.inputs.reference.resolutionConformance.checks.map(
                      (check) => (
                        <li key={check.name}>
                          {check.name}: {check.status}
                          {check.message ? ` - ${check.message}` : ""}
                        </li>
                      ),
                    )}
                  </ul>
                  {report.inputs.reference.resolutionConformance.error && (
                    <p>{report.inputs.reference.resolutionConformance.error}</p>
                  )}
                </>
              )}
              <p>
                Numeric tolerance: {report.policy.numericTolerance}; color
                ΔE2000: {report.policy.colorDeltaE2000}.
              </p>
              <ul>
                {report.limitations.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
              <p>Schema inventory: {report.schemas.join(", ")}</p>
              <ul>
                {report.metrics.map((metric) => (
                  <li key={metric.category}>
                    {metric.category}: {metric.app} app / {metric.reference}{" "}
                    reference records ({metric.referenceFiles} reference files);{" "}
                    {metric.assessable} assessable, {metric.excluded} excluded.
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </DerivedContentBoundary>
      {view === "details" && (
        <section
          className="analysisLimitations"
          aria-label="Generated foundation artifacts"
        >
          <Heading level={2}>Generated foundation artifacts</Heading>
          <p>
            Spacing and size: {storedArtifacts.status}. Local proposed
            structured-token profile, not current upstream conformance. Other
            foundations are not converted by this slice.
          </p>
          <p>
            {storedArtifacts.bundle?.tokens.length ?? 0} generated tokens ·{" "}
            {storedArtifacts.isSaved
              ? "Matches the saved baseline"
              : "Working changes"}
            . Artifacts are rebuilt from your stored source after refresh.
          </p>
          {storedArtifacts.bundle && (
            <p className="analysisProvenance">
              Artifact source SHA-256: {storedArtifacts.bundle.sourceHash}
            </p>
          )}
          <ul>
            {storedArtifacts.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
