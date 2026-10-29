// Copyright 2026 Adobe. All rights reserved.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { editModeAtom } from "../state/view/editMode";
import {
  browserModeContextAtom,
  browserTokensAtom,
  editBrowserTokensAtom,
} from "../features/tokens/browserState";
import { savedBrowserConceptIdsAtom } from "../features/tokens/browserSavedState";
import { TokenDetailsDialog } from "../panels/tokens/TokenDetailsDialog";
import type { TokenPanelId } from "../features/tokens/view/tokenPanelRegistry";
import { TokenBrowserView } from "../views/tokens/TokenBrowserView";
import { taxonomyDocumentAtom } from "../features/taxonomy/state";
import {
  buildClassificationReviewExport,
  type ClassificationExportKind,
} from "../features/taxonomy/reviewedExport";
import { assessClassificationStandard } from "../features/taxonomy/standardization";
import {
  ALIAS_REVIEW_MESSAGE,
  classificationReviewMessages,
} from "../features/taxonomy/reviewPresentation";
import { buildGeneratedClassificationCompatibility } from "../features/taxonomy/generatedReviewExport";
import { workingTshirtArtifactsAtom } from "../features/design-data/tshirtState";
import { semanticBrowserStateAtom } from "../features/tokens/semanticBrowserState";
import { tshirtCacheStatusAtom } from "../features/design-data/tshirtCacheState";
import { deleteAliasAtom, aliasesAtom } from "../features/tokens/aliasState";
import { authoringSnapshotAtom } from "../features/edit-session/state";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../features/tokens/aliasTargets";
import { isSelectableBrowserToken } from "../features/tokens/view/tokenTablePresentation";
import { PreviewToolbar } from "../components/PreviewToolbar";
import { withTaxonomyProjection } from "../features/taxonomy/model";

function downloadJson(packet: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Tokens() {
  const tokens = useAtomValue(browserTokensAtom);
  const taxonomy = useAtomValue(taxonomyDocumentAtom);
  const generated = useAtomValue(workingTshirtArtifactsAtom);
  const semantic = useAtomValue(semanticBrowserStateAtom);
  const cache = useAtomValue(tshirtCacheStatusAtom);
  const [exportError, setExportError] = useState("");
  const isEditing = useAtomValue(editModeAtom);
  const mode = useAtomValue(browserModeContextAtom);
  const savedIds = useAtomValue(savedBrowserConceptIdsAtom);
  const editTokens = useSetAtom(editBrowserTokensAtom);
  const deleteAlias = useSetAtom(deleteAliasAtom);
  const aliases = useAtomValue(aliasesAtom);
  const snapshot = useAtomValue(authoringSnapshotAtom);
  const [dialog, setDialog] = useState<{
    ids: string[];
    bulk: boolean;
    modeKey: string;
    modeLabel: string;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TokenPanelId | "all">("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const assessment = useMemo(
    () =>
      withTaxonomyProjection(taxonomy, () =>
        assessClassificationStandard(
          taxonomy,
          tokens
            .filter((token) => !token.alias)
            .map((token) => ({
              id: token.id,
              scope: token.semantic ? "structures" : token.type,
              classification: token.projection?.classification,
              projectionIssues: token.projection?.issues,
              measurement: token.measurement,
            })),
        ),
      ),
    [taxonomy, tokens],
  );
  const classificationIssues = useMemo(() => {
    const reviews = new Map<string, string[]>();
    for (const entry of assessment.occurrences)
      if (entry.recordKind === "token-usage" && entry.fixRequired) {
        reviews.set(entry.recordId, [
          ...new Set([
            ...(reviews.get(entry.recordId) ?? []),
            ...classificationReviewMessages(taxonomy, [entry]),
          ]),
        ]);
      }
    for (const token of tokens)
      if (token.alias) {
        const target = tokens.find(
          (candidate) => candidate.id === token.alias?.$ref,
        );
        const issues = target && reviews.get(target.id);
        reviews.set(token.id, [...(issues ?? []), ALIAS_REVIEW_MESSAGE]);
      }
    return reviews;
  }, [assessment, tokens, taxonomy]);
  async function reviewExport(kind: ClassificationExportKind) {
    if (generated.status !== "ready") throw new Error(generated.error);
    const rows = canonicalAliasRows(
      completeAliasSource(snapshot),
      generated.bundle,
      "preserve-for-review",
    );
    return buildClassificationReviewExport(
      taxonomy,
      rows,
      snapshot.aliases ?? aliases,
      kind,
    );
  }
  async function exportTaxonomy(kind: ClassificationExportKind) {
    try {
      downloadJson(await reviewExport(kind), `leonardo-taxonomy-${kind}.json`);
      setExportError("");
    } catch (failure) {
      setExportError(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  }
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
  return (
    <>
      <TokenBrowserView
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
        exportError={
          exportError ||
          (cache.status === "error" ? `Generated cache: ${cache.error}` : "")
        }
        classificationIssues={classificationIssues}
        generationError={
          semantic.status === "error" ? semantic.error : undefined
        }
        canExportGenerated={
          generated.status === "ready" && generated.bundle.semantics.length > 0
        }
        onExportGenerated={async () => {
          try {
            if (generated.status !== "ready") throw new Error(generated.error);
            downloadJson(
              await buildGeneratedClassificationCompatibility(
                generated.bundle,
                await reviewExport("compatibility"),
              ),
              "leonardo-generated-tshirt-compatibility.json",
            );
            setExportError("");
          } catch (failure) {
            setExportError(
              failure instanceof Error ? failure.message : String(failure),
            );
          }
        }}
        onExport={() => {
          void exportTaxonomy("standard-compliant");
        }}
        onExportCompatibility={() => {
          void exportTaxonomy("compatibility");
        }}
        onBulkEdit={() =>
          setDialog({
            ids: [...selectedIds],
            bulk: true,
            modeKey: mode.key,
            modeLabel: mode.label,
          })
        }
      />
      {dialog && (
        <TokenDetailsDialog
          key={`${dialog.modeKey}:${dialog.ids.join(",")}`}
          tokens={tokens.filter((token) => dialog.ids.includes(token.id))}
          bulk={dialog.bulk}
          isEditing={isEditing}
          modeLabel={dialog.modeLabel}
          savedIds={savedIds}
          classificationIssues={[
            ...new Set(
              dialog.ids.flatMap((id) => classificationIssues.get(id) ?? []),
            ),
          ]}
          onClose={() => setDialog(null)}
          onDeleteAlias={deleteAlias}
          onSave={(patch) =>
            editTokens({ ids: dialog.ids, modeKey: dialog.modeKey, patch })
          }
        />
      )}
    </>
  );
}
