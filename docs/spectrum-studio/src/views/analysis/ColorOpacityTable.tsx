// Copyright 2026 Adobe. All rights reserved.
import { useMemo, useState, type CSSProperties } from "react";
import { useAtomValue } from "jotai";
import {
  ActionButton,
  Badge,
  Collection,
  SearchField,
  PickerItem,
} from "@react-spectrum/s2";
import {
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
} from "@react-spectrum/s2/TableView";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Picker } from "../../components/fields/Picker";
import { ValuePreview } from "../../components/value-preview/ValuePreview";
import { transparencyBackground } from "../../components/transparencyBackground";
import { elementsSurfaceStyleAtom } from "../../state/view/elementsSurface";
import { ChangeFields } from "../changelog/ChangeFields";
import {
  colorOpacityTree,
  colorOpacityClassificationChanges,
  comparisonPaint,
  valueBadgeVariant,
  type ColorOpacityTreeRow,
} from "./colorOpacityPresentation";
import {
  normalizedOpacity,
  verdictLabel,
  type ColorOpacityAssessment,
  type ValueVerdict,
} from "../../features/design-data/colorOpacityAssessment";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { fieldLabel } from "./palettePresentation";
import type { ModeSelection } from "../../features/design-data/modeResults";

function ResultBadge({ verdict }: { verdict: ValueVerdict }) {
  return (
    <Badge variant={valueBadgeVariant[verdict]} fillStyle="subtle">
      {verdictLabel[verdict]}
    </Badge>
  );
}

function ComparedValue({
  value,
  type,
}: {
  value: unknown;
  type: "color" | "opacity";
}) {
  const alpha = type === "opacity" ? normalizedOpacity(value) : undefined;
  return (
    <span className="analysisComparedValue">
      {type === "color" && typeof value === "string" ? (
        <ValuePreview preview={{ kind: "color", value }} />
      ) : alpha !== undefined ? (
        <ValuePreview preview={{ kind: "opacity", value: alpha }} />
      ) : null}
      <code>
        {value === undefined || value === null
          ? "Unavailable"
          : typeof value === "object"
            ? "Unresolved value"
            : String(value)}
      </code>
    </span>
  );
}

function AdjacentComparison({
  app,
  reference,
  type,
}: {
  app: unknown;
  reference: unknown;
  type: "color" | "opacity";
}) {
  const surface = useAtomValue(elementsSurfaceStyleAtom);
  const half = (value: unknown): CSSProperties | undefined => {
    const paint = comparisonPaint(value, type);
    if (!paint) return undefined;
    return "color" in paint
      ? { backgroundColor: paint.color }
      : ({
          "--checkerboard-theme-base": surface["--checkerboard-base"],
          "--checkerboard-theme-alternate": surface["--checkerboard-alternate"],
          ...transparencyBackground(
            `var(--elements-preview-foreground, ${surface["--elements-preview-foreground"]})`,
            paint.alpha,
          ),
        } as CSSProperties);
  };
  const appStyle = half(app);
  const referenceStyle = half(reference);
  if (!appStyle || !referenceStyle) return <span>Unavailable</span>;
  return (
    <span
      className="analysisAdjacentComparison"
      role="img"
      aria-label="App value beside design data value"
    >
      <span data-side="app" style={appStyle} />
      <span data-side="reference" style={referenceStyle} />
    </span>
  );
}

export function ColorOpacityTable({
  assessment,
}: {
  assessment: ColorOpacityAssessment;
}) {
  const [query, setQuery] = useState("");
  const [verdict, setVerdict] = useState("all");
  const [modes, setModes] = useState<ModeSelection>({});
  const [valueResult, setValueResult] = useState("all");
  const [selected, setSelected] = useState<string>();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const tree = useMemo(
    () =>
      colorOpacityTree(assessment.concepts, query, verdict, modes, valueResult),
    [assessment, query, verdict, modes, valueResult],
  );
  const axes = useMemo(
    () => [...new Set(assessment.modeBreakdown.map((row) => row.axis))],
    [assessment],
  );
  const expandTokens = () =>
    setExpanded(
      new Set(assessment.concepts.map((concept) => `token:${concept.id}`)),
    );
  const visibleValues = tree.reduce((sum, row) => sum + row.children.length, 0);
  const selection = tree
    .flatMap((row) => [row, ...row.children])
    .find((row) => row.id === selected);
  const enhancements = [
    ...assessment.modeCoverage.sets.flatMap((set) =>
      set.result === "enhancement"
        ? [
            {
              id: `set:${set.id}`,
              label: fieldLabel(set.app?.key ?? ""),
              context: "Entire mode set",
              reason: set.evidence,
              type: undefined,
              value: undefined,
              issue: undefined,
            },
          ]
        : set.modes
            .filter((mode) => mode.result === "enhancement")
            .map((mode) => ({
              id: `mode:${mode.id}`,
              label: fieldLabel(set.app?.key ?? ""),
              context: termLabel(mode.app ?? ""),
              reason: mode.reason,
              type: undefined,
              value: undefined,
              issue: undefined,
            })),
    ),
    ...assessment.enhancements.map((row) => ({
      ...row,
      id: `token:${row.id}`,
      context: Object.entries(row.context)
        .map(([axis, mode]) => `${fieldLabel(axis)}: ${termLabel(mode)}`)
        .join(", "),
    })),
  ];
  const renderRow = (item: ColorOpacityTreeRow) => (
    <Row id={item.id} textValue={item.label}>
      <Cell>{item.label}</Cell>
      <Cell>
        {!item.value && <ResultBadge verdict={item.concept.verdict} />}
      </Cell>
      <Cell>
        {item.value && (
          <ComparedValue value={item.value.appValue} type={item.concept.type} />
        )}
      </Cell>
      <Cell>
        {item.value && (
          <ComparedValue
            value={item.value.referenceValue}
            type={item.concept.type}
          />
        )}
      </Cell>
      <Cell>{item.value && <ResultBadge verdict={item.value.verdict} />}</Cell>
      <Cell>
        {item.value && (
          <AdjacentComparison
            app={item.value.appValue}
            reference={item.value.referenceValue}
            type={item.concept.type}
          />
        )}
      </Cell>
      {item.children.length > 0 && (
        <Collection items={item.children}>{renderRow}</Collection>
      )}
    </Row>
  );
  return (
    <>
      <section aria-label="Results by mode">
        <h3>Results by mode</h3>
        <p>
          All required values, before table filters. Counts describe mode
          values, not whole-token results. Compare modes within the same mode
          set; do not add counts across mode sets. App enhancements are
          excluded.
        </p>
        <div className="analysisValueTable">
          <TableView
            aria-label="Mode value results"
            selectionMode="none"
            styles={style({ width: "full", height: "full" })}
          >
            <TableHeader>
              <Column id="mode" isRowHeader width={270}>
                Mode
              </Column>
              <Column id="tokens" width={90}>
                Tokens
              </Column>
              <Column id="values" width={120}>
                Required values
              </Column>
              <Column id="pass" width={90}>
                Pass
              </Column>
              <Column id="acceptable" width={110}>
                Acceptable
              </Column>
              <Column id="fail" width={90}>
                Fail
              </Column>
              <Column id="unable" width={160}>
                Unable to evaluate
              </Column>
              <Column id="aligned" width={160}>
                Pass or acceptable
              </Column>
              <Column id="view" width={130}>
                Compare
              </Column>
            </TableHeader>
            <TableBody
              items={assessment.modeBreakdown}
              dependencies={[assessment]}
              renderEmptyState={() => <p>No mode-specific required values.</p>}
            >
              {(item) => {
                const label = `${fieldLabel(item.axis)}: ${item.mode === null ? "Not mode-specific" : termLabel(item.mode)}`;
                return (
                  <Row id={item.id} textValue={label}>
                    <Cell>{label}</Cell>
                    <Cell>{item.tokens}</Cell>
                    <Cell>{item.values}</Cell>
                    <Cell>{item.counts.pass}</Cell>
                    <Cell>{item.counts.acceptable}</Cell>
                    <Cell>{item.counts.fail}</Cell>
                    <Cell>{item.counts.unassessable}</Cell>
                    <Cell>
                      {item.alignedPercent === null
                        ? "Unavailable"
                        : `${item.alignedPercent.toFixed(1)}%`}
                    </Cell>
                    <Cell>
                      <ActionButton
                        aria-label={`View ${label} results`}
                        onPress={() => {
                          setModes({ [item.axis]: item.mode });
                          setQuery("");
                          setVerdict("all");
                          setValueResult("all");
                          setSelected(undefined);
                          expandTokens();
                        }}
                      >
                        View results
                      </ActionButton>
                    </Cell>
                  </Row>
                );
              }}
            </TableBody>
          </TableView>
        </div>
      </section>
      <div className="analysisToolbar">
        <SearchField
          label="Search colors and opacities"
          value={query}
          onChange={setQuery}
        />
        <Picker
          label="Token overview"
          selectedKey={verdict}
          onSelectionChange={(key) => setVerdict(String(key))}
        >
          <PickerItem id="all">All results</PickerItem>
          {Object.entries(verdictLabel).map(([key, label]) => (
            <PickerItem id={key} key={key}>
              {label}
            </PickerItem>
          ))}
        </Picker>
        {axes.map((axis) => (
          <Picker
            key={axis}
            label={fieldLabel(axis)}
            selectedKey={
              Object.hasOwn(modes, axis) ? JSON.stringify(modes[axis]) : "all"
            }
            onSelectionChange={(key) => {
              const next = { ...modes };
              if (key === "all" || key === null) delete next[axis];
              else {
                const choice = assessment.modeBreakdown.find(
                  (row) =>
                    row.axis === axis && JSON.stringify(row.mode) === key,
                );
                if (!choice) return;
                next[axis] = choice.mode;
              }
              setModes(next);
              setSelected(undefined);
              expandTokens();
            }}
          >
            <PickerItem id="all">All modes</PickerItem>
            {assessment.modeBreakdown
              .filter((row) => row.axis === axis)
              .map((row) => (
                <PickerItem key={row.id} id={JSON.stringify(row.mode)}>
                  {row.mode === null
                    ? "Not mode-specific"
                    : termLabel(row.mode)}
                </PickerItem>
              ))}
          </Picker>
        ))}
        <Picker
          label="Mode value result"
          selectedKey={valueResult}
          onSelectionChange={(key) => {
            setValueResult(String(key));
            setSelected(undefined);
            expandTokens();
          }}
        >
          <PickerItem id="all">All results</PickerItem>
          {Object.entries(verdictLabel).map(([key, label]) => (
            <PickerItem key={key} id={key}>
              {label}
            </PickerItem>
          ))}
        </Picker>
        <ActionButton
          onPress={() => {
            setModes({});
            setValueResult("all");
            setSelected(undefined);
          }}
        >
          Clear mode filters
        </ActionButton>
      </div>
      <p>
        {tree.length} tokens; {visibleValues} required values shown. Token
        overview badges still include all required modes and classifications.
        Downloads include the full report.
      </p>
      <div className="analysisValueTable">
        <TableView
          aria-label="Color and opacity mode values"
          treeColumn="token"
          selectionMode="single"
          selectionStyle="highlight"
          selectedKeys={new Set(selected ? [selected] : [])}
          onSelectionChange={(keys) =>
            setSelected(keys === "all" ? undefined : [...keys].map(String)[0])
          }
          expandedKeys={expanded}
          onExpandedChange={(keys) =>
            setExpanded(new Set([...keys].map(String)))
          }
          styles={style({ width: "full", height: "full" })}
        >
          <TableHeader>
            <Column id="token" isRowHeader width={300}>
              Token / mode
            </Column>
            <Column id="overview" width={170}>
              Overview
            </Column>
            <Column id="app" minWidth={230}>
              App value
            </Column>
            <Column id="reference" minWidth={230}>
              Design data value
            </Column>
            <Column id="result" width={170}>
              Value result
            </Column>
            <Column id="adjacent" width={170}>
              Visual comparison
            </Column>
          </TableHeader>
          <TableBody
            items={tree}
            dependencies={[assessment]}
            renderEmptyState={() => <p>No matching tokens.</p>}
          >
            {renderRow}
          </TableBody>
        </TableView>
      </div>
      {selection && (
        <section aria-label="Selected token comparison details">
          <h3>{selection.concept.label}</h3>
          {selection.concept.differences.length ? (
            <>
              <h4>Classification differences</h4>
              <ChangeFields
                item={colorOpacityClassificationChanges(selection.concept)}
                editing={false}
                beforeLabel="App"
                afterLabel="Design data"
              />
            </>
          ) : (
            <p>
              {selection.concept.rows.every((row) => row.app)
                ? "Classifications match."
                : "Classification comparison needs a confirmed app counterpart."}
            </p>
          )}
          {(selection.value
            ? [selection.value]
            : selection.children.flatMap((child) =>
                child.value ? [child.value] : [],
              )
          ).map((row) => (
            <div key={row.id}>
              <h4>
                {selection.value
                  ? selection.label
                  : selection.children.find(
                      (child) => child.value?.id === row.id,
                    )?.label}
              </h4>
              {row.issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
              {row.modeFailures?.map((id) => (
                <p key={id}>
                  <a
                    href={`#mode-support-${id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      const section = document.querySelector<HTMLElement>(
                        '[aria-label="Mode coverage"]',
                      );
                      section?.scrollIntoView();
                      section?.focus();
                    }}
                  >
                    See missing mode support
                  </a>
                </p>
              ))}
              {(row.reference.reference || row.app?.reference) && (
                <>
                  <p>
                    App reference: {row.app?.reference ?? "Literal"}. Design
                    data reference: {row.reference.reference ?? "Literal"}.
                  </p>
                  <p>App chain: {row.appChain.join(" → ") || "Unavailable"}.</p>
                  <p>
                    Design data chain:{" "}
                    {row.referenceChain.join(" → ") || "Unavailable"}.
                  </p>
                </>
              )}
              <p className="analysisProvenance">
                App:{" "}
                {row.app
                  ? `${row.app.source}${row.app.pointer}`
                  : "Not matched"}
                . Design data: {row.reference.source}
                {row.reference.pointer}. UUID:{" "}
                {row.reference.identity ?? "Unavailable"}.
              </p>
            </div>
          ))}
        </section>
      )}
      <section aria-label="Enhancements">
        <h3>Enhancements</h3>
        <p>
          Additional app capabilities and token variants do not count against
          migration results.
        </p>
        <div className="analysisValueTable">
          <TableView
            aria-label="App enhancements"
            selectionMode="none"
            styles={style({ width: "full", height: "full" })}
          >
            <TableHeader>
              <Column id="item" isRowHeader>
                Token / mode set
              </Column>
              <Column id="context">App mode</Column>
              <Column id="value">App value</Column>
              <Column id="result">Result</Column>
              <Column id="reason">Reason</Column>
            </TableHeader>
            <TableBody
              items={enhancements}
              renderEmptyState={() => <p>No confirmed enhancements.</p>}
            >
              {(item) => (
                <Row id={item.id} textValue={item.label}>
                  <Cell>{item.label}</Cell>
                  <Cell>{item.context}</Cell>
                  <Cell>
                    {item.type ? (
                      <ComparedValue value={item.value} type={item.type} />
                    ) : (
                      "Not applicable"
                    )}
                  </Cell>
                  <Cell>
                    <Badge variant="neutral">Enhancement</Badge>
                  </Cell>
                  <Cell>
                    {item.reason}
                    {item.issue ? ` ${item.issue}` : ""}
                  </Cell>
                </Row>
              )}
            </TableBody>
          </TableView>
        </div>
      </section>
    </>
  );
}
