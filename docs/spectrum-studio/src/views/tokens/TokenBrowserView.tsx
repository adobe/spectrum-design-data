// Copyright 2026 Adobe. All rights reserved.
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActionBar, ActionButton, Badge, Card, CardPreview, CardView, Content, SearchField, Text, ToggleButton, ToggleButtonGroup, Tooltip, TooltipTrigger } from "@react-spectrum/s2";
import { Cell, Collection, Column, Row, TableBody, TableHeader, TableView } from "@react-spectrum/s2/TableView";
import { Checkbox } from "@react-spectrum/s2/Checkbox";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import AppsAll from "@react-spectrum/s2/icons/AppsAll";
import Edit from "@react-spectrum/s2/icons/Edit";
import OpenIn from "@react-spectrum/s2/icons/OpenIn";
import Search from "@react-spectrum/s2/icons/Search";
import ViewGrid from "@react-spectrum/s2/icons/ViewGrid";
import ViewList from "@react-spectrum/s2/icons/ViewList";
import type { Key, TableProps } from "react-aria-components";
import { tokenPanelRegistry, type TokenPanelId } from "../../features/tokens/view/tokenPanelRegistry";
import { filterBrowserTokens, groupBrowserCards, tokenValueText, type BrowserToken, type TokenLifecycle } from "../../features/tokens/browserModel";
import "./TokenBrowserView.css";
import { ValuePreview } from "../../components/value-preview/ValuePreview";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";
import { sourceValuePreview } from "../../features/tokens/valuePreview";
import { taxonomyTokenTree } from "../../features/taxonomy/tree";
import { CLASSIFICATION_REVIEW_CONTEXT, CLASSIFICATION_REVIEW_LABEL } from "../../features/taxonomy/reviewPresentation";
import {
  compactTokenTableTree, isSelectableBrowserToken, resolveTokenTableSelection, selectedTokenTableRows,
  tokenSelectionState, tokenTableSelectionIndex, toggleTokenSelection, type TokenTablePresentationRow,
} from "../../features/tokens/view/tokenTablePresentation";

export interface TokenBrowserViewProps {
  headerControls?: ReactNode;
  tokens: BrowserToken[];
  isEditing: boolean;
  query: string;
  type: TokenPanelId | "all";
  view: "list" | "grid";
  selectedIds: Set<string>;
  onQueryChange: (query: string) => void;
  onTypeChange: (type: TokenPanelId | "all") => void;
  onViewChange: (view: "list" | "grid") => void;
  onSelectionChange: (ids: Set<string>) => void;
  onOpen: (id: string) => void;
  onBulkEdit: () => void;
  onExport?: () => void;
  onExportCompatibility?: () => void;
  classificationIssues?: ReadonlyMap<string, readonly string[]>;
  exportError?: string;
  onExportGenerated?: () => void;
  canExportGenerated?: boolean;
  generationError?: string;
}

const statusLabels: Record<TokenLifecycle, string> = { draft: "Draft", released: "Released", deprecated: "Deprecated" };

// S2 forwards this React Aria option but omits it from TableViewProps.
// Toggle selection avoids selecting a row merely by focusing a checkbox.
const tokenTableSelectionProps = { selectionBehavior: "toggle" } satisfies Pick<TableProps, "selectionBehavior">;

export function TokenStatusBadge({ status }: { status: TokenLifecycle }) {
  return <Badge variant={status === "released" ? "positive" : status === "deprecated" ? "notice" : "neutral"} fillStyle="subtle">{statusLabels[status]}</Badge>;
}

export function TokenBrowserView(props: TokenBrowserViewProps) {
  const { selectedIds } = props;
  const incoming = useMemo(() => ({
    tokens: props.tokens, query: props.query, type: props.type, view: props.view,
    isEditing: props.isEditing, classificationIssues: props.classificationIssues,
    onSelectionChange: props.onSelectionChange, onOpen: props.onOpen,
  }), [props.tokens, props.query, props.type, props.view, props.isEditing,
    props.classificationIssues, props.onSelectionChange, props.onOpen]);
  const presentation = useDeferredValue(incoming);
  const pending = incoming !== presentation;
  const { tokens, query, type, view, isEditing, classificationIssues, onSelectionChange, onOpen } = presentation;
  const filtered = useMemo(() => filterBrowserTokens(tokens, type, query), [tokens, type, query]);
  const previews = useMemo(() => new Map(tokens.map((token) => [token.id, sourceValuePreview(token)])), [tokens]);
  const tree = useMemo(() => compactTokenTableTree(taxonomyTokenTree(filtered)), [filtered]);
  const selection = useMemo(() => tokenTableSelectionIndex(tree), [tree]);
  const selectedRows = useMemo(() => selectedTokenTableRows(selection, selectedIds), [selection, selectedIds]);
  const rootIds = useMemo(() => new Set(tree.map((item) => item.id)), [tree]);
  const groups = selection.parents;
  const allSelection = useMemo(() => tokenSelectionState(selection.eligibleIds, selectedIds), [selection, selectedIds]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusedRow = useRef<{ element: HTMLElement; tokenId: string | null } | null>(null);
  const [width, setWidth] = useState(800);
  // Inert rows cannot receive dialog focus restoration until the collection is ready.
  useLayoutEffect(() => {
    if (pending || !focusedRow.current) return;
    const { element, tokenId } = focusedRow.current;
    if (element.isConnected && document.activeElement === document.body
      && (element.closest("[data-token-id]")?.getAttribute("data-token-id") ?? null) === tokenId) {
      element.focus({ preventScroll: true });
    }
  }, [pending]);
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const select = useCallback((keys: "all" | Set<Key>) => {
    onSelectionChange(resolveTokenTableSelection(keys === "all" ? keys : new Set([...keys].map(String)), selection, selectedIds));
  }, [onSelectionChange, selection, selectedIds]);

  const renderRow = useCallback(function renderRow(item: TokenTablePresentationRow) {
    const token = item.token;
    const ids = selection.rows.get(item.id)!;
    const state = tokenSelectionState(ids, selectedIds);
    const description = [token?.description, ...(token?.projection?.issues ?? []),
      classificationIssues?.get(token?.id ?? "")?.length ? "Open this token for classification review details and next steps." : ""].filter(Boolean).join(" ");
    return (
      <Row id={item.id} textValue={item.contextLabel} dependencies={[selectedIds, isEditing, classificationIssues]}
        data-token-root={rootIds.has(item.id)} data-token-leaf={item.children.length === 0} data-token-name={token?.name} data-token-id={token?.id}>
        {isEditing && <Cell data-token-selection focusMode="child">
          {ids.size > 0 && <Checkbox slot={null} {...state} aria-label={`Select ${item.contextLabel}`}
            onChange={(checked) => onSelectionChange(toggleTokenSelection(selectedIds, ids, checked))} />}
        </Cell>}
        <Cell><span className="tokenName">{item.label}</span>{token?.semantic && <Badge variant="neutral" fillStyle="subtle">Semantic</Badge>}{token?.alias && <Badge variant="informative" fillStyle="subtle">Alias</Badge>}</Cell>
        <Cell>{token && <ValuePreview preview={previews.get(token.id)!} />}</Cell>
        <Cell>{token && <span className="tokenValue">{tokenValueText(token)}</span>}</Cell>
        <Cell>{token && <><TokenStatusBadge status={token.status} />{classificationIssues?.get(token.id)?.length ? <Badge variant="notice" fillStyle="subtle">{CLASSIFICATION_REVIEW_LABEL}</Badge> : null}</>}</Cell>
        <Cell>{token?.alias?.targetName ?? (token?.semantic ? "$ref" in token.semantic.token ? token.semantic.target.name : "Generated literal" : "")}</Cell>
        <Cell><span className="tokenDescription" title={description || undefined}>{description}</span></Cell>
        <Cell>{token && <div className="tokenRowActions">
          <TooltipTrigger><ActionButton preventFocusOnPress aria-label={`Open ${token.name}`} onPress={() => onOpen(token.id)}><OpenIn /></ActionButton><Tooltip>Open</Tooltip></TooltipTrigger>
          <TooltipTrigger><ActionButton aria-label={`See impact for ${token.name}`} isDisabled><Search /></ActionButton><Tooltip>See impact</Tooltip></TooltipTrigger>
        </div>}</Cell>
        {item.children.length > 0 && <Collection items={item.children} dependencies={[selectedIds, isEditing, classificationIssues]}>{renderRow}</Collection>}
      </Row>
    );
  }, [onOpen, onSelectionChange, selectedIds, selection, rootIds, isEditing, classificationIssues, previews]);

  const emptyMessage = query.trim() ? `No tokens match "${query.trim()}".`
    : type === "all" ? "No tokens available."
      : `No ${tokenPanelRegistry[type].label.toLowerCase()} tokens are available yet.`;

  const collection = useMemo(() => view === "list" ? (
    <TableView {...tokenTableSelectionProps} key={isEditing ? "editing" : "readonly"} aria-label="Tokens" treeColumn="token-column:name" isQuiet overflowMode="wrap" selectionMode={isEditing ? "multiple" : "none"} selectionStyle="highlight" selectedKeys={selectedRows}
      onSelectionChange={select} disabledKeys={[...selection.rows].filter(([, ids]) => ids.size === 0).map(([id]) => id)} disabledBehavior="selection"
      expandedKeys={groups.filter((group) => query.trim() || !group.sourcePathIds.some((id) => collapsed.has(id))).map((group) => group.id)}
      onExpandedChange={(keys) => {
        if (!query.trim()) setCollapsed((current) => {
          const next = new Set(current);
          for (const group of groups) for (const id of group.sourcePathIds) {
            if (keys.has(group.id)) next.delete(id);
            else next.add(id);
          }
          return next;
        });
      }}
      styles={style({ width: "full", height: "full" })} UNSAFE_className="tokenBrowserTable" UNSAFE_style={{ minWidth: 1120 }}>
      <TableHeader>
        {isEditing && <Column id="token-column:selection" width={48} focusMode="child" data-token-selection>
          <Checkbox slot={null} {...allSelection} aria-label="Select all"
            onChange={(checked) => onSelectionChange(toggleTokenSelection(selectedIds, selection.eligibleIds, checked))} />
        </Column>}
        <Column id="token-column:name" isRowHeader width={260}>Name</Column><Column id="token-column:preview" width={100}>Preview</Column>
        <Column id="token-column:value" width={140}>Value</Column><Column id="token-column:status" width={240}>Status</Column>
        <Column id="token-column:alias" width={110}>Alias</Column><Column id="token-column:description" minWidth={200}>Description</Column><Column id="token-column:actions" width={100}>Actions</Column>
      </TableHeader>
      <TableBody items={tree} dependencies={[selectedIds, isEditing, classificationIssues]} renderEmptyState={() => <div className="tokenEmpty" role="status">{emptyMessage}</div>}>{renderRow}</TableBody>
    </TableView>
  ) : filtered.length === 0 ? <div className="tokenEmpty" role="status">{emptyMessage}</div> : groupBrowserCards(filtered).map((group) => {
    const columns = Math.max(1, Math.floor((width + 16) / 216));
    const height = Math.ceil(group.tokens.length / columns) * 296 + 16;
    return <section className="tokenCardSection" key={group.id} aria-labelledby={`token-group-${group.id}`}>
      <h2 id={`token-group-${group.id}`}>{group.label}</h2>
      <CardView styles={style({ height: "fit" })} aria-label={`${group.label} tokens`} items={group.tokens} dependencies={[classificationIssues]} size="M" selectionMode={isEditing ? "multiple" : "none"} selectionStyle="checkbox"
        disabledKeys={group.tokens.filter((token) => !isSelectableBrowserToken(token)).map((token) => token.id)} disabledBehavior="selection"
        selectedKeys={new Set(group.tokens.filter((token) => selectedIds.has(token.id)).map((token) => token.id))}
        onSelectionChange={(keys) => {
          const groupIds = new Set(group.tokens.map((token) => token.id));
          const localIds = new Set(group.tokens.filter(isSelectableBrowserToken).map((token) => token.id));
          const next = new Set([...selectedIds].filter((id) => !groupIds.has(id)));
          for (const id of keys === "all" ? localIds : keys) if (localIds.has(String(id))) next.add(String(id));
          onSelectionChange(next);
        }} onAction={(id) => onOpen(String(id))} UNSAFE_style={{ height }}>
        {(token) => <Card id={token.id} textValue={token.name}>
          <CardPreview><ValuePreview preview={previews.get(token.id)!} large /></CardPreview>
          <Content><Text slot="title">{token.name}</Text><Text slot="description">{tokenValueText(token)}{token.alias ? ` - Alias of ${token.alias.targetName}` : token.semantic ? ` - Semantic ${"$ref" in token.semantic.token ? "alias" : "literal"}` : ""}</Text><TokenStatusBadge status={token.status} />{classificationIssues?.get(token.id)?.length ? <Badge variant="notice" fillStyle="subtle">{CLASSIFICATION_REVIEW_LABEL}</Badge> : null}</Content>
        </Card>}
      </CardView>
    </section>;
  }), [view, isEditing, selectedRows, select, selection, groups, query, collapsed, tree, renderRow,
    emptyMessage, filtered, width, previews, classificationIssues, onSelectionChange, onOpen, selectedIds, allSelection]);

  return (
    <div className={`tokenBrowser ${props.onExport || props.onExportCompatibility || props.onExportGenerated ? "hasTokenExports" : ""}`}
      onFocusCapture={(event) => {
        const element = event.target;
        focusedRow.current = element instanceof HTMLElement && scrollRef.current?.contains(element)
          ? { element, tokenId: element.closest("[data-token-id]")?.getAttribute("data-token-id") ?? null } : null;
      }}>
      <div className="tokenBrowserHeader" >
        <h1 className={style({font: "heading-xl", margin: 0})}>Tokens</h1>
        {props.headerControls}
      </div>
      <div className="tokenBrowserToolbar">
        <SearchField aria-label="Search tokens" placeholder="Search tokens..." value={props.query} onChange={props.onQueryChange} styles={style({ width: 400, maxWidth: "full" })} />
        <div className="tokenTypeFilters">
          <ToggleButtonGroup isQuiet aria-label="Token types" selectionMode="single" disallowEmptySelection selectedKeys={[props.type]} onSelectionChange={(keys) => props.onTypeChange(String([...keys][0]) as TokenPanelId | "all")}>
            <ToggleButton id="all"><AppsAll /><Text>All</Text></ToggleButton>
            {Object.values(tokenPanelRegistry).map((definition) => <ToggleButton key={definition.id} id={definition.id}>{definition.icon}<Text>{definition.label}</Text></ToggleButton>)}
          </ToggleButtonGroup>
        </div>
        <ToggleButtonGroup aria-label="Token presentation" selectionMode="single" disallowEmptySelection selectedKeys={[props.view]} onSelectionChange={(keys) => props.onViewChange(String([...keys][0]) as "list" | "grid")}>
          <TooltipTrigger><ToggleButton id="list" aria-label="List view"><ViewList /></ToggleButton><Tooltip>List view</Tooltip></TooltipTrigger>
          <TooltipTrigger><ToggleButton id="grid" aria-label="Grid view"><ViewGrid /></ToggleButton><Tooltip>Grid view</Tooltip></TooltipTrigger>
        </ToggleButtonGroup>
      </div>
      <div className="tokenBrowserSummary" role="status" aria-busy={pending || undefined}>{filtered.length} {filtered.length === 1 ? "token" : "tokens"}{selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}</div>
      {(props.onExport || props.onExportCompatibility || props.onExportGenerated) && <div className="tokenBrowserExports">
        {props.onExport && <ActionButton onPress={props.onExport}>Export standard-compliant taxonomy</ActionButton>}
        {props.onExportCompatibility && <ActionButton onPress={props.onExportCompatibility}>Export taxonomy compatibility packet</ActionButton>}
        {props.onExportGenerated && <ActionButton isDisabled={!props.canExportGenerated} onPress={props.onExportGenerated}>Export generated compatibility bundle</ActionButton>}
        <p>{CLASSIFICATION_REVIEW_CONTEXT} Open a flagged token for reasons and next steps. Standard-compliant taxonomy export requires all classifications to pass. Compatibility exports keep your data and include the detailed review; they do not clear warnings.</p>
      </div>}
      {props.generationError && <p role="alert">Structure generation needs repair: {props.generationError}</p>}
      {props.exportError && <p role="alert" style={{ maxHeight: 160, overflow: "auto" }}>{props.exportError}</p>}
      <div className="tokenCollectionWork">
        <DerivedContentBoundary state={pending ? "pending" : "ready"} label="Updating tokens">
          <div ref={scrollRef} className={`tokenCollectionScroll ${selectedIds.size ? "hasTokenSelection" : ""}`} inert={pending || undefined}>
            {collection}
          </div>
        </DerivedContentBoundary>
      </div>
      {props.isEditing && selectedIds.size > 0 && <ActionBar selectedItemCount={selectedIds.size} onClearSelection={() => props.onSelectionChange(new Set())} scrollRef={scrollRef}>
        <ActionButton preventFocusOnPress isDisabled={props.tokens.some((token) => (token.semantic || token.alias) && selectedIds.has(token.id))} onPress={props.onBulkEdit}><Edit /><Text>Bulk edit</Text></ActionButton>
      </ActionBar>}
    </div>
  );
}
