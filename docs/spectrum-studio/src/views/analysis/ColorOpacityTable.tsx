// Copyright 2026 Adobe. All rights reserved.
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import {
  ActionBar,
  ActionButton,
  Badge,
  Collection,
  SearchField,
  PickerItem,
  Text,
} from "@react-spectrum/s2";
import { Checkbox } from "@react-spectrum/s2/Checkbox";
import {
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
} from "@react-spectrum/s2/TableView";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Edit from "@react-spectrum/s2/icons/Edit";
import Checkmark from "@react-spectrum/s2/icons/Checkmark";
import AlertDiamond from "@react-spectrum/s2/icons/AlertDiamond";
import AlertTriangle from "@react-spectrum/s2/icons/AlertTriangle";
import InfoCircle from "@react-spectrum/s2/icons/InfoCircle";
import type { TableProps } from "react-aria-components";
import { Picker } from "../../components/fields/Picker";
import { ModeSetPicker, ALL_MODES_KEY } from "../../components/ModeSetControl";
import { TokenTypeFilters } from "../../components/tokens/TokenTypeFilters";
import { StackedBar } from "../../components/StackedBar";
import { ValuePreview } from "../../components/value-preview/ValuePreview";
import { transparencyBackground } from "../../components/transparencyBackground";
import type { ElementsSurfaceStyle } from "../../features/color-system/previewSurface";
import { ChangeFields } from "../changelog/ChangeFields";
import {
  colorOpacityClassificationChanges,
  comparisonPaint,
  valueBadgeVariant,
} from "./colorOpacityPresentation";
import {
  verdictLabel,
  type ColorOpacityAssessment,
  type ColorOpacityConcept,
  type ColorOpacityRow,
  type ValueVerdict,
} from "../../features/design-data/colorOpacityAssessment";
import { differenceText } from "../../features/design-data/foundationValues";
import {
  comparisonSelectionIndex,
  tokenComparisonRows,
  modeResultSegments,
  comparisonModeSets,
  inventoryComparisonRows,
  type TokenComparisonTreeRow,
} from "./tokenComparisonPresentation";
import { comparisonValuePreview } from "./tokenComparisonPreview";
import {
  tokenSelectionState,
  toggleTokenSelection,
  resolveTokenTableSelection,
  selectedTokenTableRows,
} from "../../features/tokens/view/tokenTablePresentation";
import type { TokenPanelId } from "../../features/tokens/view/tokenPanelRegistry";
import type { ReferenceOverrideEligibility } from "../../features/design-data/referenceOverrides";
import type { ModeSet } from "../../features/modes/model";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { fieldLabel } from "./palettePresentation";
import type { ModeSelection } from "../../features/design-data/modeResults";
import { isDeprecatedInventoryToken } from "../../features/design-data/tokenInventory";
import { canonicalJson } from "../../features/design-data/canonicalJson";
import "../tokens/TokenBrowserView.css";

const tableStyles = style({ width: "full", height: "fit" });
const selectionProps = { selectionBehavior: "toggle" } satisfies Pick<
  TableProps,
  "selectionBehavior"
>;

export function ResultBadge({ verdict }: { verdict: ValueVerdict }) {
  return (
    <span className="analysisResultBadge">
      <Badge
        variant={valueBadgeVariant[verdict]}
        fillStyle={verdict === "fail" ? "bold" : "subtle"}
      >
        {verdict === "pass" ? (
          <Checkmark />
        ) : verdict === "unassessable" ? (
          <InfoCircle />
        ) : verdict === "fail" ? (
          <AlertDiamond />
        ) : (
          <AlertTriangle />
        )}
        <Text>{verdictLabel[verdict]}</Text>
      </Badge>
    </span>
  );
}

function valueText(value: unknown, unit?: string) {
  return value === undefined || value === null
    ? "Unavailable"
    : typeof value === "object"
      ? JSON.stringify(value)
      : `${value}${unit && typeof value === "number" ? unit : ""}`;
}

function ComparedValue({
  concept,
  row,
  side,
  surface,
}: {
  concept: ColorOpacityConcept;
  row: ColorOpacityRow;
  side: "app" | "reference";
  surface?: ElementsSurfaceStyle;
}) {
  const preview = comparisonValuePreview(concept, row, side);
  if (concept.type === "opacity" && !surface)
    return (
      <span title="The matching mode's opacity preview surface is unavailable.">
        {valueText(side === "app" ? row.appValue : row.referenceValue)}
      </span>
    );
  return (
    <span className="analysisComparedValue">
      <ValuePreview preview={preview} compact opacitySurface={surface} />
      <code>
        {valueText(
          side === "app" ? row.appValue : row.referenceValue,
          (side === "app" ? row.app : row.reference)?.unit,
        )}
      </code>
    </span>
  );
}

function AdjacentComparison({
  concept,
  row,
  surface,
}: {
  concept: ColorOpacityConcept;
  row: ColorOpacityRow;
  surface?: ElementsSurfaceStyle;
}) {
  const app = comparisonValuePreview(concept, row, "app");
  const reference = comparisonValuePreview(concept, row, "reference");
  if (concept.type === "opacity" && !surface) return <span>Unavailable</span>;
  if (app.kind === "unavailable" || reference.kind === "unavailable")
    return (
      <span
        title={[app, reference]
          .flatMap((preview) =>
            preview.kind === "unavailable" ? [preview.message] : [],
          )
          .join(" ")}
      >
        Unavailable
      </span>
    );
  if (concept.type === "color" || concept.type === "opacity") {
    const paint = (value: unknown): CSSProperties | undefined => {
      const color = comparisonPaint(
        value,
        concept.type === "color" ? "color" : "opacity",
      );
      if (!color) return;
      return "color" in color
        ? { backgroundColor: color.color }
        : surface
          ? ({
              ...surface,
              ...transparencyBackground(
                surface["--elements-preview-foreground"],
                color.alpha,
              ),
            } as CSSProperties)
          : undefined;
    };
    const left = paint(row.appValue),
      right = paint(row.referenceValue);
    if (left && right)
      return (
        <span
          className="analysisAdjacentComparison"
          role="img"
          aria-label="App value beside design data value"
        >
          <span data-side="app" style={left} />
          <span data-side="reference" style={right} />
        </span>
      );
  }
  return (
    <span
      className="analysisAdjacentSamples"
      role="img"
      aria-label="App value beside design data value"
    >
      <ValuePreview preview={app} compact opacitySurface={surface} />
      <ValuePreview preview={reference} compact opacitySurface={surface} />
    </span>
  );
}

export interface TokenComparisonTableProps {
  assessment: ColorOpacityAssessment;
  modeSets?: readonly ModeSet[];
  isEditing?: boolean;
  eligibility?: ReadonlyMap<string, ReferenceOverrideEligibility>;
  onBulkEdit?: (ids: string[]) => void;
  surfaceForRow?: (row: ColorOpacityRow) => ElementsSurfaceStyle | undefined;
}

export function ColorOpacityTable({
  assessment,
  modeSets = [],
  isEditing = false,
  eligibility,
  onBulkEdit,
  surfaceForRow,
}: TokenComparisonTableProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TokenPanelId | "all">("all");
  const [verdict, setVerdict] = useState("all");
  const [modes, setModes] = useState<ModeSelection>({});
  const [valueResult, setValueResult] = useState("all");
  const [details, setDetails] = useState<string>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const comparisonTree = useMemo(
    () =>
      tokenComparisonRows(
        assessment.concepts,
        query,
        verdict,
        modes,
        valueResult,
        type,
      ),
    [assessment, query, verdict, modes, valueResult, type],
  );
  const inventoryTree = useMemo(
    () =>
      inventoryComparisonRows(
        assessment.inventory?.entries ?? [],
        query,
        verdict,
        modes,
        valueResult,
        type,
        assessment.enhancements,
      ),
    [assessment, query, verdict, modes, valueResult, type],
  );
  const inventoryIndex = useMemo(
    () =>
      new Map(
        assessment.inventory?.entries.map((entry) => [
          canonicalJson([entry.side, entry.record.id]),
          entry,
        ]),
      ),
    [assessment],
  );
  const tree: TokenComparisonTreeRow[] = [
    ...comparisonTree,
    ...inventoryTree,
  ].sort((a, b) => a.label.localeCompare(b.label));
  const availableModes = useMemo(
    () => comparisonModeSets(assessment, modeSets),
    [assessment, modeSets],
  );
  const eligible = useMemo(
    () =>
      new Set(
        [...(eligibility ?? [])]
          .filter(([, value]) => value.targets.length)
          .map(([id]) => id),
      ),
    [eligibility],
  );
  const index = useMemo(
    () => comparisonSelectionIndex(comparisonTree, eligible),
    [comparisonTree, eligible],
  );
  const tableSelection = {
    rows: index.rows,
    eligibleIds: index.all,
    parents: [],
  };
  const selectedIds = new Set([...selected].filter((id) => index.all.has(id)));
  const allSelection = tokenSelectionState(index.all, selectedIds);
  const rows = tree.flatMap((row): TokenComparisonTreeRow[] => [
    row,
    ...row.children,
  ]);
  const selection = rows.find((row) => row.id === details);
  const visibleValues = rows.filter(
    (row) => !("inventory" in row) && row.value,
  ).length;
  const clear = () => {
    setSelected(new Set());
    setDetails(undefined);
  };
  const renderRow = (item: TokenComparisonTreeRow): ReactElement => {
    if ("inventory" in item) {
      const entry = item.inventory;
      const notes = [entry.reason, item.sample?.issue]
        .filter(Boolean)
        .join(" ");
      const label = isDeprecatedInventoryToken(entry.record)
        ? "Deprecated"
        : !entry.type
          ? "Unclassified"
          : (
              {
                matched: "Matched",
                "app-only": "App only",
                "reference-only": "Design data only",
                unconfirmed: "Not confirmed",
                ambiguous: "Ambiguous",
              } as const
            )[entry.presence];
      const counterpart =
        entry.counterparts.length === 1
          ? inventoryIndex.get(
              canonicalJson([
                entry.side === "app" ? "reference" : "app",
                entry.counterparts[0],
              ]),
            )
          : undefined;
      const otherValue = counterpart?.values.find(
        (value) =>
          canonicalJson(value.context) === canonicalJson(item.sample?.context),
      );
      const otherText = counterpart
        ? valueText(otherValue?.value, counterpart.record.unit)
        : "Not matched";
      return (
        <Row id={item.id} textValue={item.label}>
          {isEditing && (
            <Cell>
              <Checkbox
                slot={null}
                isDisabled
                aria-label={`Select ${item.label}`}
              />
            </Cell>
          )}
          <Cell>
            <ActionButton isQuiet onPress={() => setDetails(item.id)}>
              {item.label}
            </ActionButton>
          </Cell>
          <Cell>
            <span title={notes}>
              <Badge variant="neutral">{label}</Badge>
            </span>
          </Cell>
          <Cell>
            {item.sample &&
              (entry.side === "app"
                ? valueText(item.sample.value, entry.record.unit)
                : otherText)}
          </Cell>
          <Cell>
            {item.sample &&
              (entry.side === "reference"
                ? valueText(item.sample.value, entry.record.unit)
                : otherText)}
          </Cell>
          <Cell>{item.sample && "Not scored"}</Cell>
          <Cell>
            {item.sample?.issue ?? (item.sample ? "Not compared" : "")}
          </Cell>
          {item.children.length > 0 && (
            <Collection
              items={item.children}
              dependencies={[assessment, expanded]}
            >
              {renderRow}
            </Collection>
          )}
        </Row>
      );
    }
    const ids = index.rows.get(item.id) ?? new Set<string>();
    const state = tokenSelectionState(ids, selectedIds);
    const reason = item.value
      ? eligibility?.get(item.value.id)?.reason
      : undefined;
    const surface = item.value && surfaceForRow?.(item.value);
    return (
      <Row id={item.id} textValue={item.label}>
        {isEditing && (
          <Cell focusMode="child">
            <span title={reason}>
              <Checkbox
                slot={null}
                {...state}
                aria-label={`Select ${item.label}`}
                aria-description={reason}
                onChange={(checked) =>
                  setSelected(toggleTokenSelection(selectedIds, ids, checked))
                }
              />
            </span>
          </Cell>
        )}
        <Cell>
          <ActionButton
            isQuiet
            UNSAFE_className="analysisTokenName"
            onPress={() => setDetails(item.id)}
          >
            {item.label}
          </ActionButton>
        </Cell>
        <Cell>
          <ResultBadge verdict={item.value?.verdict ?? item.concept.verdict} />
        </Cell>
        <Cell>
          {item.value && (
            <ComparedValue
              concept={item.concept}
              row={item.value}
              side="app"
              surface={surface}
            />
          )}
        </Cell>
        <Cell>
          {item.value && (
            <ComparedValue
              concept={item.concept}
              row={item.value}
              side="reference"
              surface={surface}
            />
          )}
        </Cell>
        <Cell>
          {item.value && (
            <span
              title={
                item.value.deltaE2000 !== undefined
                  ? `Delta E 2000: ${item.value.deltaE2000}`
                  : item.value.issues.join(" ") || undefined
              }
            >
              {differenceText(item.value)}
            </span>
          )}
        </Cell>
        <Cell>
          {item.value && (
            <AdjacentComparison
              concept={item.concept}
              row={item.value}
              surface={surface}
            />
          )}
        </Cell>
        {item.children.length > 0 && (
          <Collection
            items={item.children}
            dependencies={[selectedIds, eligibility, expanded, assessment]}
          >
            {renderRow}
          </Collection>
        )}
      </Row>
    );
  };
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
            styles={tableStyles}
            UNSAFE_className="analysisFitTable"
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
              <Column id="mix" minWidth={220}>
                Results
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
                      {item.values ? (
                        <StackedBar
                          segments={modeResultSegments(item)}
                          aria-label={`${label}: ${item.counts.pass} Pass, ${item.counts.fail} Fail, ${item.counts.acceptable} Acceptable, ${item.counts.unassessable} Unable to evaluate`}
                        />
                      ) : (
                        "Unavailable"
                      )}
                    </Cell>
                    <Cell>
                      <ActionButton
                        aria-label={`View ${label} results`}
                        onPress={() => {
                          setModes({ [item.axis]: item.mode });
                          setQuery("");
                          setVerdict("all");
                          setValueResult("all");
                          setType("all");
                          clear();
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
      <section aria-label="Tokens">
        <div className="analysisTokenHeading">
          <h3>Tokens</h3>
          <div className="analysisModeControls">
            {availableModes.map((set) => (
              <ModeSetPicker
                key={set.id}
                modeSet={set}
                allModesLabel="All modes"
                selectedKey={
                  Object.hasOwn(modes, set.key)
                    ? JSON.stringify(modes[set.key])
                    : ALL_MODES_KEY
                }
                onSelectionChange={(key) => {
                  const next = { ...modes };
                  if (key === ALL_MODES_KEY) delete next[set.key];
                  else next[set.key] = JSON.parse(key) as string | null;
                  setModes(next);
                  clear();
                }}
              />
            ))}
          </div>
        </div>
        <div className="tokenBrowserToolbar analysisTokenToolbar">
          <SearchField
            aria-label="Search tokens"
            placeholder="Search tokens..."
            value={query}
            styles={style({ width: 400, maxWidth: "full" })}
            onChange={(value) => {
              setQuery(value);
              clear();
            }}
          />
          <div className="tokenTypeFilters">
            <TokenTypeFilters
              value={type}
              onChange={(value) => {
                setType(value);
                clear();
              }}
            />
          </div>
        </div>
        <div className="analysisToolbar">
          <Picker
            label="Token overview"
            selectedKey={verdict}
            onSelectionChange={(key) => {
              setVerdict(String(key));
              clear();
            }}
          >
            <PickerItem id="all">All results</PickerItem>
            {Object.entries(verdictLabel).map(([key, label]) => (
              <PickerItem key={key} id={key}>
                {label}
              </PickerItem>
            ))}
          </Picker>
          <Picker
            label="Mode value result"
            selectedKey={valueResult}
            onSelectionChange={(key) => {
              setValueResult(String(key));
              clear();
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
              clear();
            }}
          >
            Clear mode filters
          </ActionButton>
        </div>
        <p>
          {
            new Set(
              rows.map((row) =>
                "inventory" in row
                  ? canonicalJson([
                      row.inventory.side,
                      row.inventory.record.conceptId ??
                        row.inventory.record.identity ??
                        row.inventory.id,
                    ])
                  : row.concept.id,
              ),
            ).size
          }{" "}
          tokens; {visibleValues} required values shown.
          {inventoryTree.length
            ? ` ${inventoryTree.length} inventory-only ${Object.keys(modes).length ? "values" : "token groups"} shown.`
            : ""}
          {selectedIds.size ? ` ${selectedIds.size} selected.` : ""}
        </p>
        {assessment.inventory && (
          <p>
            App:{" "}
            {
              assessment.inventory.entries.filter(
                (entry) => entry.side === "app",
              ).length
            }{" "}
            source records ({assessment.inventory.status.app}). Design data:{" "}
            {
              assessment.inventory.entries.filter(
                (entry) => entry.side === "reference",
              ).length
            }{" "}
            source records ({assessment.inventory.status.reference}).
          </p>
        )}
        {assessment.inventory?.exclusions.map((item) => (
          <p key={item.source} role="status">
            {item.source}: {item.reason}
          </p>
        ))}
        {assessment.inventory?.issues.map((issue, index) => (
          <p key={index} role="status" className="analysisError">
            {issue}
          </p>
        ))}
        <div ref={scrollRef} className="analysisValueTable analysisTokenTable">
          <TableView
            {...selectionProps}
            key={isEditing ? "editing" : "readonly"}
            aria-label="Token mode values"
            treeColumn={Object.keys(modes).length ? undefined : "token"}
            isQuiet
            overflowMode="wrap"
            selectionMode={isEditing ? "multiple" : "none"}
            selectionStyle="highlight"
            selectedKeys={selectedTokenTableRows(tableSelection, selectedIds)}
            onSelectionChange={(keys) =>
              setSelected(
                resolveTokenTableSelection(
                  keys === "all" ? keys : new Set([...keys].map(String)),
                  tableSelection,
                  selectedIds,
                ),
              )
            }
            disabledKeys={[
              ...[...index.rows]
                .filter(([, ids]) => ids.size === 0)
                .map(([id]) => id),
              ...rows.filter((row) => "inventory" in row).map((row) => row.id),
            ]}
            disabledBehavior="selection"
            expandedKeys={expanded}
            onExpandedChange={(keys) =>
              setExpanded(new Set([...keys].map(String)))
            }
            styles={tableStyles}
            UNSAFE_className="analysisFitTable"
            UNSAFE_style={{ minWidth: 1200 }}
          >
            <TableHeader>
              {isEditing && (
                <Column id="selection" width={48} focusMode="child">
                  <Checkbox
                    slot={null}
                    {...allSelection}
                    aria-label="Select all"
                    onChange={(checked) =>
                      setSelected(
                        toggleTokenSelection(selectedIds, index.all, checked),
                      )
                    }
                  />
                </Column>
              )}
              <Column id="token" isRowHeader width={300}>
                Name
              </Column>
              <Column id="status" width={170}>
                Status
              </Column>
              <Column id="app" minWidth={210}>
                App value
              </Column>
              <Column id="reference" minWidth={210}>
                Design data value
              </Column>
              <Column id="difference" width={150}>
                Difference
              </Column>
              <Column id="adjacent" width={170}>
                Visual comparison
              </Column>
            </TableHeader>
            <TableBody
              items={tree}
              dependencies={[
                selectedIds,
                isEditing,
                eligibility,
                expanded,
                assessment,
              ]}
              renderEmptyState={() => <p>No matching tokens.</p>}
            >
              {renderRow}
            </TableBody>
          </TableView>
        </div>
        {isEditing && selectedIds.size > 0 && (
          <ActionBar
            selectedItemCount={selectedIds.size}
            onClearSelection={() => setSelected(new Set())}
            scrollRef={scrollRef}
          >
            <ActionButton
              preventFocusOnPress
              onPress={() => onBulkEdit?.([...selectedIds])}
            >
              <Edit />
              <Text>Bulk edit</Text>
            </ActionButton>
          </ActionBar>
        )}
      </section>
      {selection && "inventory" in selection && (
        <section aria-label="Selected token inventory details">
          <h3>{selection.inventory.label}</h3>
          <p>{selection.inventory.reason}</p>
          <p>
            {selection.inventory.side === "app" ? "App" : "Design data"}:{" "}
            {selection.inventory.record.source}
            {selection.inventory.record.pointer}
          </p>
          <p>
            Record ID: {selection.inventory.record.id}. UUID:{" "}
            {selection.inventory.record.identity ?? "Unavailable"}.
          </p>
          <p>
            Schema: {selection.inventory.record.schema ?? "Not declared"}.
            Reference: {selection.inventory.record.reference ?? "Literal"}.
          </p>
          {(selection.sample
            ? [selection.sample]
            : selection.children.flatMap((child) => child.sample ?? [])
          ).map((sample, index) => (
            <p key={index}>
              {JSON.stringify(sample.context)}:{" "}
              {valueText(sample.value, selection.inventory.record.unit)}.{" "}
              {sample.issue}
            </p>
          ))}
        </section>
      )}
      {selection && !("inventory" in selection) && (
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
          {(selection.value ? [selection.value] : selection.concept.rows).map(
            (row) => (
              <div key={row.id}>
                <h4>
                  {Object.entries(row.context)
                    .map(
                      ([axis, mode]) =>
                        `${fieldLabel(axis)}: ${termLabel(mode)}`,
                    )
                    .join(", ") || "All modes"}
                </h4>
                {row.issues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
                {row.modeFailures?.map((id) => (
                  <p key={id}>
                    <a href={`#mode-support-${id}`}>See missing mode support</a>
                  </p>
                ))}
                {(row.reference.reference || row.app?.reference) && (
                  <>
                    <p>
                      App reference: {row.app?.reference ?? "Literal"}. Design
                      data reference: {row.reference.reference ?? "Literal"}.
                    </p>
                    <p>
                      App chain: {row.appChain.join(" → ") || "Unavailable"}.
                      Design data chain:{" "}
                      {row.referenceChain.join(" → ") || "Unavailable"}.
                    </p>
                  </>
                )}
                <p className="analysisProvenance">
                  App name: {row.app?.name ?? "Not matched"}. Design data name:{" "}
                  {row.reference.name}. App:{" "}
                  {row.app
                    ? `${row.app.source}${row.app.pointer}`
                    : "Not matched"}
                  . Design data: {row.reference.source}
                  {row.reference.pointer}. UUID:{" "}
                  {row.reference.identity ?? "Unavailable"}.
                </p>
              </div>
            ),
          )}
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
            styles={tableStyles}
            UNSAFE_className="analysisFitTable"
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
              items={[
                ...assessment.modeCoverage.sets.flatMap((set) =>
                  set.result === "enhancement"
                    ? [
                        {
                          id: `set:${set.id}`,
                          label: fieldLabel(set.app?.key ?? ""),
                          context: "Entire mode set",
                          value: undefined,
                          reason: set.evidence,
                        },
                      ]
                    : set.modes
                        .filter((mode) => mode.result === "enhancement")
                        .map((mode) => ({
                          id: `mode:${mode.id}`,
                          label: fieldLabel(set.app?.key ?? ""),
                          context: termLabel(mode.app ?? ""),
                          value: undefined,
                          reason: mode.reason,
                        })),
                ),
                ...assessment.enhancements.map((row) => ({
                  id: `token:${row.id}`,
                  label: row.label,
                  context: Object.entries(row.context)
                    .map(
                      ([axis, mode]) =>
                        `${fieldLabel(axis)}: ${termLabel(mode)}`,
                    )
                    .join(", "),
                  value: row.value,
                  reason: [row.reason, row.issue].filter(Boolean).join(" "),
                })),
              ]}
              renderEmptyState={() => <p>No confirmed enhancements.</p>}
            >
              {(item) => (
                <Row id={item.id} textValue={item.label}>
                  <Cell>{item.label}</Cell>
                  <Cell>{item.context}</Cell>
                  <Cell>{valueText(item.value)}</Cell>
                  <Cell>
                    <Badge variant="neutral">Enhancement</Badge>
                  </Cell>
                  <Cell>{item.reason}</Cell>
                </Row>
              )}
            </TableBody>
          </TableView>
        </div>
      </section>
    </>
  );
}
