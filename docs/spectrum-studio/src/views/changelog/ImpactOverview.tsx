// Copyright 2026 Adobe. All rights reserved.
import {
  Disclosure,
  DisclosurePanel,
  DisclosureTitle,
  ProgressCircle,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { StackedBar } from "../../components/StackedBar";
import {
  TOKEN_IMPACT_METRICS,
  visibleMetricRows,
  type ImpactMetricRow,
} from "../../features/impact/metrics";
import type { Ratio } from "../../features/impact/model";
import {
  componentImpactRows,
  componentImpactSegments,
  tokenImpactSegments,
  type BarSegment,
} from "../../features/impact/segments";
import { summarizeTokenImpact } from "../../features/impact/summaries";
import { summarizeAuthoredImpact } from "../../features/impact/authored";
import { shippedChangeSnapshot } from "../../features/changelog/comparisonState";
import type {
  ComparisonOutput,
  ComparisonProgress,
} from "../../features/changelog/comparisonWork";
import type { OverviewId } from "../../features/changelog/registry";

const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});
const headerStyles = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 8,
});
const titleStyles = style({ font: "title", margin: 0 });
const headlineStyles = style({ font: "title" });
const breakdownTitleStyles = style({ fontSize: "[14px]" });
const listStyles = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  columnGap: 16,
  rowGap: 8,
  margin: 0,
});
const rowStyles = style({ display: "contents" });
const primaryStyles = style({
  font: "ui",
  fontWeight: "bold",
  margin: 0,
  overflowWrap: "anywhere",
});
const detailStyles = style({ font: "ui", margin: 0, overflowWrap: "anywhere" });
const numberStyles = style({ font: "ui", margin: 0, textAlign: "end" });
const legendStyles = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  font: "body-xs",
});
const LITERAL_COUNTS =
  "Percentages compare working data with shipped defaults. Unsaved edits are included; temporary previews are excluded.";
const SECTION_TITLES: Record<OverviewId, string> = {
  system: "System impact",
  foundations: "Foundational impact",
  design: "Design impact",
  components: "Component impact",
};

function percent(value: Ratio["fraction"]) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}
function MetricRows({ rows }: { rows: ImpactMetricRow[] }) {
  return (
    <dl className={listStyles}>
      {rows.map((row) => (
        <div key={row.id} data-metric={row.id} className={rowStyles}>
          <dt
            className={
              row.emphasis === "primary" ? primaryStyles : detailStyles
            }
          >
            {row.label}
          </dt>
          <dd className={numberStyles}>
            {row.ratio.count} / {row.ratio.total}
          </dd>
          <dd className={numberStyles}>
            {row.showPercent && percent(row.ratio.fraction)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function ImpactSection({
  id,
  title,
  headline,
  segments,
  rows,
  children,
  collapsibleBreakdown = true,
}: {
  id: string;
  title: string;
  headline: Ratio;
  segments: BarSegment[];
  rows: ImpactMetricRow[];
  children?: React.ReactNode;
  collapsibleBreakdown?: boolean;
}) {
  const breakdown = (
    <>
      {headline.total > 0 && (
        <>
          {segments.length > 0 && (
            <div className={legendStyles} aria-label={`${title} breakdown`}>
              {segments.map((segment) => (
                <span key={segment.id}>
                  {segment.label}: {percent(segment.fraction)} of total
                </span>
              ))}
            </div>
          )}
          <MetricRows rows={rows} />
        </>
      )}
      {children}
    </>
  );
  return (
    <section aria-labelledby={`${id}-heading`} className={sectionStyles}>
      <div className={headerStyles}>
        <h4 id={`${id}-heading`} className={titleStyles}>
          {title}
        </h4>
        <span className={headlineStyles}>{percent(headline.fraction)}</span>
      </div>
      {headline.total > 0 ? (
        <StackedBar
          segments={segments}
          aria-label={`${title}: ${headline.count} of ${headline.total} affected. ${segments.map((segment) => `${segment.label}: ${percent(segment.fraction)} of total`).join("; ")}`}
        />
      ) : (
        <p className={detailStyles}>No authored data to assess.</p>
      )}
      {collapsibleBreakdown ? (
        <Disclosure
          isQuiet
          size="S"
          density="compact"
          defaultExpanded={id === "system-impact"}
          styles={style({ minWidth: 0 })}
        >
          <DisclosureTitle level={5} styles={breakdownTitleStyles}>
            Breakdown
          </DisclosureTitle>
          <DisclosurePanel>
            <div className={sectionStyles}>{breakdown}</div>
          </DisclosurePanel>
        </Disclosure>
      ) : (
        breakdown
      )}
    </section>
  );
}
export function ImpactOverview({
  value,
  tokens = { status: "pending" },
  componentImpact = { status: "pending" },
}: {
  value: ComparisonProgress;
  tokens?: ComparisonOutput["tokens"] | { status: "pending" };
  componentImpact?: ComparisonOutput["componentImpact"] | { status: "pending" };
}) {
  const authored = value.authored;
  const working = value.working;
  const tokenSummary =
    tokens.status === "ready"
      ? summarizeTokenImpact(tokens.comparison.records)
      : undefined;
  const objectCounts = (section: "design" | "components") => {
    const records =
      section === "design"
        ? working.structures?.structures
        : working.components?.components;
    const original =
      section === "design"
        ? shippedChangeSnapshot.structures?.structures
        : shippedChangeSnapshot.components?.components;
    const objectCount =
      records && original
        ? new Set(
            [...records, ...original].map((item) =>
              "conceptId" in item ? item.conceptId : item.id,
            ),
          ).size
        : undefined;
    const changedObjects =
      authored.groups.find(
        (group) =>
          group.id === (section === "design" ? "structures" : "components"),
      )?.items.length ?? 0;
    return { objectCount, changedObjects };
  };
  const componentSection = () => {
    if (componentImpact.status === "ready") {
      const { objectCount, changedObjects } = objectCounts("components");
      return (
        <ImpactSection
          id="components-impact"
          title={SECTION_TITLES.components}
          headline={componentImpact.summary.affected}
          segments={componentImpactSegments(componentImpact.summary)}
          rows={componentImpactRows(componentImpact.summary)}
          collapsibleBreakdown={false}
        >
          <p className={detailStyles}>
            {changedObjects} of {objectCount ?? 0} components affected.
            Component relationships do not add token concepts.
          </p>
        </ImpactSection>
      );
    }
    return (
      <section
        aria-labelledby="components-impact-heading"
        className={sectionStyles}
      >
        <h4 id="components-impact-heading" className={titleStyles}>
          {SECTION_TITLES.components}
        </h4>
        {componentImpact.status === "pending" ? (
          <ProgressCircle
            isIndeterminate
            aria-label="Calculating component impact"
          />
        ) : (
          <p role="alert">
            Component impact is unavailable: {componentImpact.error}. The total
            has not been reduced to omit unavailable values.
          </p>
        )}
      </section>
    );
  };
  const authoredSection = (section: OverviewId) => {
    const summary = summarizeAuthoredImpact(authored.slots, section);
    const { objectCount, changedObjects } =
      section === "design" || section === "components"
        ? objectCounts(section)
        : { objectCount: undefined, changedObjects: 0 };
    return (
      <ImpactSection
        key={section}
        id={`${section}-impact`}
        title={SECTION_TITLES[section]}
        headline={summary.headline}
        segments={summary.segments}
        rows={summary.rows}
        collapsibleBreakdown={section !== "components"}
      >
        {section === "system" && (
          <>
            <p className={detailStyles}>
              Authored fields only. Generated outputs are measured in Token
              impact.
            </p>
            <p className={detailStyles}>
              Themes: not implemented; excluded from the total.
            </p>
          </>
        )}
        {section === "foundations" && (
          <p className={detailStyles}>
            Manual foundation overrides: {summary.manualOverrides}.
            Mode-specific foundation values are included; ordinary mode presets
            and token overrides are not manual foundation overrides.
          </p>
        )}
        {(section === "design" || section === "components") && (
          <p className={detailStyles}>
            {changedObjects} of {objectCount ?? 0}{" "}
            {section === "design" ? "structures" : "components"} affected.
            {section === "design"
              ? " Styles are not implemented."
              : " Component relationships do not add token concepts."}
          </p>
        )}
      </ImpactSection>
    );
  };
  return (
    <div
      className={style({ display: "flex", flexDirection: "column", gap: 32 })}
    >
      <p className={detailStyles}>{LITERAL_COUNTS}</p>
      {authoredSection("system")}
      {authoredSection("foundations")}
      {authoredSection("design")}
      {tokenSummary ? (
        <ImpactSection
          id="token-impact"
          title="Token impact"
          headline={tokenSummary.affected}
          segments={tokenImpactSegments(tokenSummary)}
          rows={visibleMetricRows(TOKEN_IMPACT_METRICS, tokenSummary)}
        >
          <p className={detailStyles}>
            Token totals count distinct concepts. Value and reference rows use
            their own scoped inventories. Manual override totals count tokens
            with explicit value overrides. Compatibility aliases are authored
            references, not extra concepts.
          </p>
        </ImpactSection>
      ) : (
        <section
          aria-labelledby="token-impact-heading"
          className={sectionStyles}
        >
          <h4 id="token-impact-heading" className={titleStyles}>
            Token impact
          </h4>
          {tokens.status === "pending" ? (
            <ProgressCircle
              isIndeterminate
              aria-label="Calculating token impact"
            />
          ) : (
            <p role="alert">
              Token impact is unavailable:{" "}
              {tokens.status === "unavailable" && tokens.error}. The total has
              not been reduced to omit unavailable values.
            </p>
          )}
        </section>
      )}
      {componentSection()}
    </div>
  );
}
