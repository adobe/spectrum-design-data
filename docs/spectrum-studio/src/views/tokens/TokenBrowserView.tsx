// Copyright 2026 Adobe. All rights reserved.
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActionBar, ActionButton, Badge, Card, CardPreview, CardView, Content, SearchField, Text, ToggleButton, ToggleButtonGroup, Tooltip, TooltipTrigger } from "@react-spectrum/s2";
import { Cell, Collection, Column, Row, TableBody, TableHeader, TableView } from "@react-spectrum/s2/TableView";
import { Checkbox } from "@react-spectrum/s2/Checkbox";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Edit from "@react-spectrum/s2/icons/Edit";
import OpenIn from "@react-spectrum/s2/icons/OpenIn";
import Search from "@react-spectrum/s2/icons/Search";
import ViewGrid from "@react-spectrum/s2/icons/ViewGrid";
import ViewList from "@react-spectrum/s2/icons/ViewList";
import AlertTriangle from "@react-spectrum/s2/icons/AlertTriangle";
import { Focusable } from "react-aria-components";
import type { Key, TableProps } from "react-aria-components";
import { tokenPanelRegistry, type TokenPanelId } from "../../features/tokens/view/tokenPanelRegistry";
import { filterBrowserTokens, groupBrowserCards, tokenValueText, type BrowserToken, type TokenLifecycle } from "../../features/tokens/browserModel";
import "./TokenBrowserView.css";
import { ValuePreview } from "../../components/value-preview/ValuePreview";
import { TokenTypeFilters } from "../../components/tokens/TokenTypeFilters";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";
import { sourceValuePreview } from "../../features/tokens/valuePreview";
import { taxonomyTokenTree } from "../../features/taxonomy/tree";
import {
  compactTokenTableTree, isSelectableBrowserToken, resolveTokenTableSelection, selectedTokenTableRows,
  tokenSelectionState, tokenTableSelectionIndex, toggleTokenSelection, type TokenTablePresentationRow,
} from "../../features/tokens/view/tokenTablePresentation";
import { filterAllModeTokenTableRows } from "../../features/tokens/view/allModeTokenTable";
import { TokenNameTag } from "../../components/tokens/TokenNameTag";
import { overrideContrastMessage } from "../../features/tokens/colorOutput";

const summaryTextStyles = style({ color: "neutral-subdued" });

export interface TokenBrowserViewProps {
  modeView?: "selected" | "all";
  onModeViewChange?: (view: "selected" | "all") => void;
  modeRows?: TokenTablePresentationRow[];
  catalogError?: string;
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
  onAddToken?: () => void;
  generationError?: string;
}

const statusLabels: Record<TokenLifecycle, string> = { draft: "Draft", released: "Released", deprecated: "Deprecated" };
const emptySelection = new Set<string>();

// S2 forwards this React Aria option but omits it from TableViewProps.
// Toggle selection avoids selecting a row merely by focusing a checkbox.
const tokenTableSelectionProps = { selectionBehavior: "toggle" } satisfies Pick<TableProps, "selectionBehavior">;

export function TokenStatusBadge({ status }: { status: TokenLifecycle }) {
  return <Badge data-token-release styles={style({ width: "fit" })} variant={status === "released" ? "positive" : status === "deprecated" ? "notice" : "neutral"} fillStyle="subtle">{statusLabels[status]}</Badge>;
}

export function TokenBrowserView(props: TokenBrowserViewProps) {
  const allModeView = props.modeView === "all";
  const selectedIds = allModeView ? emptySelection : props.selectedIds;
  const editing = props.isEditing && !allModeView;
  const incoming = useMemo(() => ({
    tokens: props.tokens, query: props.query, type: props.type, view: allModeView ? "list" : props.view,
    isEditing: editing, allModes: allModeView, modeRows: props.modeRows,
    onSelectionChange: props.onSelectionChange, onOpen: props.onOpen,
  }), [props.tokens, props.query, props.type, props.view, editing, allModeView, props.modeRows,
    props.onSelectionChange, props.onOpen]);
  const presentation = useDeferredValue(incoming);
  const pending = incoming !== presentation;
  const { tokens, query, type, view, isEditing, onSelectionChange, onOpen, allModes, modeRows } = presentation;
  const modeTree = useMemo(() => allModes ? filterAllModeTokenTableRows(modeRows ?? [], type, query) : [], [allModes, modeRows, type, query]);
  const filtered = useMemo(() => allModes ? modeTree.flatMap((row) => row.token ? [row.token] : []) : filterBrowserTokens(tokens, type, query), [allModes, modeTree, tokens, type, query]);
  const previews = useMemo(() => new Map(
    allModes
      ? modeTree.flatMap((row) => row.children.flatMap((child) => child.token ? [[child.id, sourceValuePreview(child.token)] as const] : []))
      : tokens.map((token) => [token.id, sourceValuePreview(token)] as const),
  ), [allModes, modeTree, tokens]);
  const tree = useMemo(() => allModes ? modeTree : compactTokenTableTree(taxonomyTokenTree(filtered)), [allModes, modeTree, filtered]);
  const selection = useMemo(() => tokenTableSelectionIndex(tree), [tree]);
  const selectedRows = useMemo(() => selectedTokenTableRows(selection, selectedIds), [selection, selectedIds]);
  const rootIds = useMemo(() => new Set(tree.map((item) => item.id)), [tree]);
  const groups = selection.parents;
  const allSelection = useMemo(() => tokenSelectionState(selection.eligibleIds, selectedIds), [selection, selectedIds]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedModes, setExpandedModes] = useState<Set<Key>>(new Set());
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
    const showValue = !allModes || item.modeContext !== undefined;
    const ids = selection.rows.get(item.id)!;
    const state = tokenSelectionState(ids, selectedIds);
    const description = [token?.description, ...(token?.projection?.issues ?? [])].filter(Boolean).join(" ");
    const referenceName = token?.referenceName ?? token?.alias?.targetName ??
      (token?.semantic && "$ref" in token.semantic.token ? token.semantic.target.name : undefined);
    return (
      <Row id={item.id} textValue={item.contextLabel} dependencies={[selectedIds, isEditing]}
        data-token-root={rootIds.has(item.id)} data-token-leaf={item.children.length === 0} data-token-name={token?.name} data-token-id={token?.id}>
        {isEditing && <Cell data-token-selection focusMode="child">
          {ids.size > 0 && <Checkbox slot={null} {...state} aria-label={`Select ${item.contextLabel}`}
            onChange={(checked) => onSelectionChange(toggleTokenSelection(selectedIds, ids, checked))} />}
        </Cell>}
        <Cell><span className="tokenName">{item.label}</span>{token?.semantic && <Badge variant="neutral" fillStyle="subtle">Semantic</Badge>}{token?.alias && <Badge variant="informative" fillStyle="subtle">Alias</Badge>}</Cell>
        <Cell>{token && showValue && <ValuePreview preview={previews.get(allModes ? item.id : token.id)!} />}</Cell>
        <Cell>{token && showValue && <div className={style({ display: "flex", alignItems: "center", gap: 8 })}>
          <span className="tokenValue">{tokenValueText(token)}</span>
          {token.contrastWarning && <TooltipTrigger>
            <Focusable><span tabIndex={0} aria-label={overrideContrastMessage(token.contrastWarning)} className={style({ color: "negative", display: "flex" })}><AlertTriangle /></span></Focusable>
            <Tooltip>{overrideContrastMessage(token.contrastWarning)}</Tooltip>
          </TooltipTrigger>}
        </div>}</Cell>
        <Cell>{token && showValue && token.valueOverridden && <TooltipTrigger>
          <Focusable><span tabIndex={0} className={style({ width: "fit" })}><Badge variant="notice" fillStyle="subtle" styles={style({ width: "fit" })}>Override</Badge></span></Focusable>
          <Tooltip>This value is an override to the original generated value</Tooltip>
        </TooltipTrigger>}</Cell>
        <Cell>{token && <TokenStatusBadge status={token.status} />}</Cell>
        <Cell>{showValue && referenceName && <TokenNameTag name={referenceName} />}</Cell>
        <Cell><span className="tokenDescription" title={description || undefined}>{description}</span></Cell>
        {!allModes && <Cell>{token && <div className="tokenRowActions">
          <TooltipTrigger><ActionButton preventFocusOnPress aria-label={`Open ${token.name}`} onPress={() => onOpen(token.id)}><OpenIn /></ActionButton><Tooltip>Open</Tooltip></TooltipTrigger>
          <TooltipTrigger><ActionButton aria-label={`See impact for ${token.name}`} isDisabled><Search /></ActionButton><Tooltip>See impact</Tooltip></TooltipTrigger>
        </div>}</Cell>}
        {item.children.length > 0 && <Collection items={item.children} dependencies={[selectedIds, isEditing]}>{renderRow}</Collection>}
      </Row>
    );
  }, [onOpen, onSelectionChange, selectedIds, selection, rootIds, isEditing, previews, allModes]);

  const emptyMessage = query.trim() ? `No tokens match "${query.trim()}".`
    : type === "all" ? "No tokens available."
      : `No ${tokenPanelRegistry[type].label.toLowerCase()} tokens are available yet.`;

  const collection = useMemo(() => view === "list" ? (
    <TableView {...tokenTableSelectionProps} key={allModes ? "all-modes" : isEditing ? "editing" : "readonly"} aria-label="Tokens" treeColumn="token-column:name" isQuiet overflowMode="wrap" selectionMode={isEditing ? "multiple" : "none"} selectionStyle="highlight" selectedKeys={selectedRows}
      onSelectionChange={select} disabledKeys={[...selection.rows].filter(([, ids]) => ids.size === 0).map(([id]) => id)} disabledBehavior="selection"
      expandedKeys={allModes ? expandedModes : groups.filter((group) => query.trim() || !group.sourcePathIds.some((id) => collapsed.has(id))).map((group) => group.id)}
      onExpandedChange={(keys) => {
        if (allModes) {
          setExpandedModes(new Set(keys));
          return;
        }
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
        <Column id="token-column:value" width={160}>Value</Column>
        <Column id="token-column:override" width={110} aria-label="Override">{null}</Column>
        <Column id="token-column:status" width={150}>Release status</Column>
        <Column id="token-column:alias" width={160}>Alias</Column><Column id="token-column:description" minWidth={200}>Description</Column>{!allModes && <Column id="token-column:actions" width={100}>Actions</Column>}
      </TableHeader>
      <TableBody items={tree} dependencies={[selectedIds, isEditing]} renderEmptyState={() => <div className="tokenEmpty" role="status">{emptyMessage}</div>}>{renderRow}</TableBody>
    </TableView>
  ) : filtered.length === 0 ? <div className="tokenEmpty" role="status">{emptyMessage}</div> : groupBrowserCards(filtered).map((group) => {
    const columns = Math.max(1, Math.floor((width + 16) / 216));
    const height = Math.ceil(group.tokens.length / columns) * 296 + 16;
    return <section className="tokenCardSection" key={group.id} aria-labelledby={`token-group-${group.id}`}>
      <h2 id={`token-group-${group.id}`}>{group.label}</h2>
      <CardView styles={style({ height: "fit" })} aria-label={`${group.label} tokens`} items={group.tokens} size="M" selectionMode={isEditing ? "multiple" : "none"} selectionStyle="checkbox"
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
          <Content><Text slot="title">{token.name}</Text><Text slot="description">{tokenValueText(token)}{token.alias ? ` - Alias of ${token.alias.targetName}` : token.semantic ? ` - Semantic ${"$ref" in token.semantic.token ? "alias" : "literal"}` : ""}</Text><TokenStatusBadge status={token.status} /></Content>
        </Card>}
      </CardView>
    </section>;
  }), [view, isEditing, selectedRows, select, selection, groups, query, collapsed, tree, renderRow,
    emptyMessage, filtered, width, previews, onSelectionChange, onOpen, selectedIds, allSelection, allModes, expandedModes]);

  return (
    <div className="tokenBrowser"
      onFocusCapture={(event) => {
        const element = event.target;
        focusedRow.current = element instanceof HTMLElement && scrollRef.current?.contains(element)
          ? { element, tokenId: element.closest("[data-token-id]")?.getAttribute("data-token-id") ?? null } : null;
      }}>
      <div className="tokenBrowserHeader" >
        <h1 className={style({font: "heading-xl", margin: 0})}>Tokens</h1>
        {props.onModeViewChange && <ToggleButtonGroup aria-label="Token modes" selectionMode="single" disallowEmptySelection selectedKeys={[props.modeView ?? "selected"]} onSelectionChange={(keys) => {
          const value = [...keys][0];
          if (value === "selected" || value === "all") props.onModeViewChange?.(value);
        }}>
          <ToggleButton id="selected">Selected modes</ToggleButton>
          <ToggleButton id="all">All</ToggleButton>
        </ToggleButtonGroup>}
        {!allModeView && props.headerControls}
      </div>
      <div className="tokenBrowserToolbar">
        <SearchField aria-label="Search tokens" placeholder="Search tokens..." value={props.query} onChange={props.onQueryChange} styles={style({ width: 400, maxWidth: "full" })} />
        <div className="tokenTypeFilters">
          <TokenTypeFilters value={props.type} onChange={props.onTypeChange} />
        </div>
        {editing && props.onAddToken && <ActionButton onPress={props.onAddToken}><Add /><Text>Add token</Text></ActionButton>}
        {!allModeView && <ToggleButtonGroup aria-label="Token presentation" selectionMode="single" disallowEmptySelection selectedKeys={[props.view]} onSelectionChange={(keys) => props.onViewChange(String([...keys][0]) as "list" | "grid")}>
          <TooltipTrigger><ToggleButton id="list" aria-label="List view"><ViewList /></ToggleButton><Tooltip>List view</Tooltip></TooltipTrigger>
          <TooltipTrigger><ToggleButton id="grid" aria-label="Grid view"><ViewGrid /></ToggleButton><Tooltip>Grid view</Tooltip></TooltipTrigger>
        </ToggleButtonGroup>}
      </div>
      {!props.catalogError && <div className={`tokenBrowserSummary ${summaryTextStyles}`} role="status" aria-busy={pending || undefined}>{filtered.length} {filtered.length === 1 ? "token" : "tokens"}{selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}</div>}
      {props.generationError && <p role="alert">Structure generation needs repair: {props.generationError}</p>}
      <div className="tokenCollectionWork">
        <DerivedContentBoundary state={props.catalogError ? "unavailable" : pending ? "pending" : "ready"} error={props.catalogError} label="Updating tokens">
          {!props.catalogError && <div ref={scrollRef} className={`tokenCollectionScroll ${selectedIds.size ? "hasTokenSelection" : ""}`} inert={pending || undefined}>
            {collection}
          </div>}
        </DerivedContentBoundary>
      </div>
      {editing && selectedIds.size > 0 && <ActionBar selectedItemCount={selectedIds.size} onClearSelection={() => props.onSelectionChange(new Set())} scrollRef={scrollRef}>
        <ActionButton preventFocusOnPress isDisabled={props.tokens.some((token) => (token.semantic || token.alias) && selectedIds.has(token.id))} onPress={props.onBulkEdit}><Edit /><Text>Bulk edit</Text></ActionButton>
      </ActionBar>}
    </div>
  );
}
