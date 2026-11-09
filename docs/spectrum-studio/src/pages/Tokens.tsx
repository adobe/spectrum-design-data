// Copyright 2026 Adobe. All rights reserved.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "../components/notifications/notificationContext";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { editModeAtom } from "../state/view/editMode";
import {
  browserModeContextAtom,
  browserTokensAtom,
  editBrowserTokensAtom,
} from "../features/tokens/browserState";
import { savedBrowserConceptIdsAtom } from "../features/tokens/browserSavedState";
import { TokenDetailsDialog } from "../panels/tokens/TokenDetailsDialog";
import { AddTokenDialog } from "../panels/tokens/AddTokenDialog";
import { DialogContainer } from "@react-spectrum/s2";
import { TokenInspectorContainer } from "../panels/tokens/TokenInspectorContainer";
import type { TokenPanelId } from "../features/tokens/view/tokenPanelRegistry";
import {
  TokenBrowserView,
  type TokenBrowserViewProps,
} from "../views/tokens/TokenBrowserView";
import { semanticBrowserStateAtom } from "../features/tokens/semanticBrowserState";
import { tshirtCacheStatusAtom } from "../features/design-data/tshirtCacheState";
import { deleteAliasAtom, aliasesAtom } from "../features/tokens/aliasState";
import { isSelectableBrowserToken } from "../features/tokens/view/tokenTablePresentation";
import { PreviewToolbar } from "../components/PreviewToolbar";
import { tokenDialogCatalogAtom } from "../features/tokens/dialogState";
import { allModeTokenTableRows } from "../features/tokens/view/allModeTokenTable";

function AllModeTokenBrowser(props: TokenBrowserViewProps) {
  const catalog = useAtomValue(tokenDialogCatalogAtom);
  const aliases = useAtomValue(aliasesAtom);
  const rows = useMemo(
    () =>
      catalog.status === "ready"
        ? allModeTokenTableRows(
            catalog.rows,
            catalog.snapshot.modeSets,
            aliases,
          )
        : [],
    [catalog, aliases],
  );
  return (
    <TokenBrowserView
      {...props}
      modeRows={rows}
      catalogError={
        catalog.status === "unavailable" ? catalog.error : undefined
      }
    />
  );
}

export default function Tokens() {
  const notify = useNotify();
  const store = useStore();
  const tokens = useAtomValue(browserTokensAtom);
  const semantic = useAtomValue(semanticBrowserStateAtom);
  const cache = useAtomValue(tshirtCacheStatusAtom);
  const isEditing = useAtomValue(editModeAtom);
  const mode = useAtomValue(browserModeContextAtom);
  const savedIds = useAtomValue(savedBrowserConceptIdsAtom);
  const editTokens = useSetAtom(editBrowserTokensAtom);
  const [dialog, setDialog] = useState<{
    ids: string[];
    bulk: boolean;
    modeKey: string;
    modeLabel: string;
  } | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TokenPanelId | "all">("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [modeView, setModeView] = useState<"selected" | "all">("selected");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const openToken = useCallback(
    (id: string) =>
      setDialog({
        ids: [id],
        bulk: false,
        modeKey: mode.key,
        modeLabel: mode.label,
      }),
    [mode.key, mode.label],
  );
  useEffect(() => {
    if (!isEditing) setSelectedIds(new Set());
  }, [isEditing]);
  useEffect(() => {
    const eligible = new Set(
      tokens.filter(isSelectableBrowserToken).map((token) => token.id),
    );
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => eligible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [tokens]);
  const Browser = modeView === "all" ? AllModeTokenBrowser : TokenBrowserView;
  return (
    <>
      <Browser
        modeView={modeView}
        onModeViewChange={(value) => {
          setModeView(value);
          setSelectedIds(new Set());
        }}
        tokens={tokens}
        isEditing={isEditing}
        query={query}
        type={type}
        view={view}
        selectedIds={selectedIds}
        headerControls={<PreviewToolbar placement="header" />}
        onQueryChange={(value) => {
          setQuery(value);
          setSelectedIds((current) => (current.size ? new Set() : current));
        }}
        onTypeChange={(value) => {
          setType(value);
          setSelectedIds((current) => (current.size ? new Set() : current));
        }}
        onViewChange={setView}
        onSelectionChange={setSelectedIds}
        onOpen={openToken}
        generationError={
          semantic.status === "error"
            ? semantic.error
            : cache.status === "error"
              ? `Generated cache: ${cache.error}`
              : undefined
        }
        onAddToken={() => setAdding(true)}
        onBulkEdit={() =>
          setDialog({
            ids: [...selectedIds],
            bulk: true,
            modeKey: mode.key,
            modeLabel: mode.label,
          })
        }
      />
      <DialogContainer onDismiss={() => setAdding(false)}>
        {adding && isEditing && (
          <AddTokenDialog onCreated={(id) => openToken(id)} />
        )}
      </DialogContainer>
      {dialog && !dialog.bulk && (
        <TokenInspectorContainer
          key={dialog.ids[0]}
          id={dialog.ids[0]}
          onClose={() => setDialog(null)}
          onOpenToken={openToken}
        />
      )}
      {dialog?.bulk && (
        <TokenDetailsDialog
          key={`${dialog.modeKey}:${dialog.ids.join(",")}`}
          tokens={tokens.filter((token) => dialog.ids.includes(token.id))}
          bulk={dialog.bulk}
          isEditing={isEditing}
          modeLabel={dialog.modeLabel}
          savedIds={savedIds}
          onClose={() => setDialog(null)}
          onDeleteAlias={(id) =>
            notify.remove({
              kind: "alias",
              run: (store) => {
                const aliases = store.get(aliasesAtom);
                const index = aliases.tokens.findIndex(
                  (alias) => alias.id === id,
                );
                const alias = aliases.tokens[index];
                store.set(deleteAliasAtom, id);
                return { alias, index };
              },
              undo: ({ alias, index }) => {
                if (!alias || index < 0) return;
                const current = store.get(aliasesAtom);
                if (current.tokens.some((item) => item.id === alias.id)) return;
                const tokens = [...current.tokens];
                tokens.splice(Math.min(index, tokens.length), 0, alias);
                store.set(aliasesAtom, { ...current, tokens });
              },
            })
          }
          onSave={(patch) =>
            editTokens({ ids: dialog.ids, modeKey: dialog.modeKey, patch })
          }
        />
      )}
    </>
  );
}
