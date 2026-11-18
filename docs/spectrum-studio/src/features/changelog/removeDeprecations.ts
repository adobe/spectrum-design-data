// Copyright 2026 Adobe. All rights reserved.
// "Remove all deprecations": deletes every deprecated item from the working
// data. Uses of a deprecated item move to its replacement, or tokens get the
// deprecated token's value hard-coded. Each step is checked and rolled back on
// its own, so an item that can't go is kept and reported instead of blocking
// the rest. The result carries a snapshot for one-step Undo.
// See docs/rfcs/deletion-and-deprecation.md.
import { atom, type Getter, type Setter } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import { isDeprecated } from "../edit-session/lifecycle";
import {
  assertStoredSnapshot,
  captureSnapshot,
  restoreAuthoringSnapshotAtom,
  type EditSessionSnapshot,
} from "../edit-session/state";
import type { ColorSystemDocument } from "../color-system/model";
import { colorScaleStepTokenIds } from "../color-system/lifecycle";
import {
  colorSystemDocumentAtom,
  removeColorScaleAtom,
} from "../color-system/state";
import { componentColorWitnessAtom } from "../components/colorWitness";
import {
  componentDraftRevisionAtom,
  componentsDocumentAtom,
} from "../components/documentState";
import { componentTokensAtom } from "../components/state";
import { workingTshirtArtifactsAtom } from "../design-data/tshirtState";
import type { TaxonomyDocument } from "../taxonomy/model";
import {
  editReferencedTaxonomyAtom,
  referencedTaxonomySourceAtom,
} from "../taxonomy/editing";
import { deprecatedTaxonomyItems } from "../taxonomy/lifecycle";
import { validateReferencedTaxonomy } from "../taxonomy/referenceValidation";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { termLabel } from "../taxonomy/termPresentation";
import { aliasesAtom } from "../tokens/aliasState";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../tokens/aliasTargets";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import type { BrowserTokenEdits } from "../tokens/browserEditTypes";
import {
  finalTermReplacement,
  planTokenRemoval,
  replaceIdDeep,
  type TokenRemovalPlan,
} from "./deprecationRemoval";

export type DeprecatedItemKind = "category" | "term" | "colorScale" | "token";

export interface DeprecatedItem {
  kind: DeprecatedItemKind;
  id: string;
  label: string;
}

export interface DeprecationRemovalCounts {
  /** Items that will be deleted. */
  deleted: number;
  /** Uses moved to a replacement. */
  repointed: number;
  /** Token values written in place of a removed token. */
  hardCoded: number;
  /** Deprecated items that stay because they can't be removed safely. */
  kept: number;
}

export interface DeprecationRemovalResult {
  removed: DeprecatedItem[];
  kept: (DeprecatedItem & { reason: string })[];
  repointed: number;
  hardCoded: number;
  /** Working data from before the removal, for Undo. */
  undo: EditSessionSnapshot;
}

/**
 * Lists deprecated items in removal order: categories (with their terms),
 * then terms, then color scales (with their step tokens), then tokens.
 * Tokens that were already removed are left out.
 */
export function deprecatedItems(input: {
  taxonomy: TaxonomyDocument;
  colorSystem: ColorSystemDocument;
  edits: BrowserTokenEdits;
}): DeprecatedItem[] {
  const { terms, categories } = deprecatedTaxonomyItems(input.taxonomy);
  const removedCategories = new Set(categories.map((item) => item.id));
  const scales = input.colorSystem.scales.filter((scale) =>
    isDeprecated(scale),
  );
  const scaleTokens = new Set(
    scales.flatMap((scale) => colorScaleStepTokenIds(input.colorSystem, scale)),
  );
  return [
    ...categories.map((item) => ({
      kind: "category" as const,
      id: item.id,
      label: item.name,
    })),
    ...terms
      .filter((item) => !removedCategories.has(item.categoryId))
      .map((item) => ({
        kind: "term" as const,
        id: item.id,
        label: termLabel(item.value),
      })),
    ...scales.map((item) => ({
      kind: "colorScale" as const,
      id: item.id,
      label: termLabel(item.name),
    })),
    ...Object.entries(input.edits)
      .filter(
        ([id, edit]) =>
          edit.status === "deprecated" && !edit.removed && !scaleTokens.has(id),
      )
      .map(([id, edit]) => ({
        kind: "token" as const,
        id,
        label: edit.name ?? id,
      })),
  ];
}

function withoutCategory(document: TaxonomyDocument, categoryId: string) {
  return {
    ...document,
    categories: document.categories.filter((item) => item.id !== categoryId),
    terms: document.terms.filter((item) => item.categoryId !== categoryId),
    order: document.order.filter((id) => id !== categoryId),
  };
}

function withoutTerm(document: TaxonomyDocument, termId: string) {
  return {
    ...document,
    terms: document.terms.filter((item) => item.id !== termId),
  };
}

const message = (failure: unknown) =>
  failure instanceof Error ? failure.message : String(failure);

export const deprecatedItemsAtom = atom((get) =>
  deprecatedItems({
    taxonomy: get(taxonomyDocumentAtom),
    colorSystem: get(colorSystemDocumentAtom),
    edits: get(browserTokenEditsAtom),
  }),
);

function scaleStepIds(get: Getter, items: readonly DeprecatedItem[]) {
  const document = get(colorSystemDocumentAtom);
  return new Map(
    items.flatMap((item) => {
      const scale = document.scales.find((entry) => entry.id === item.id);
      return item.kind === "colorScale" && scale
        ? [[item.id, colorScaleStepTokenIds(document, scale)] as const]
        : [];
    }),
  );
}

/** Plans the token step. Throws when the token data can't be generated. */
function planTokens(
  get: Getter,
  items: readonly DeprecatedItem[],
  scaleSteps: ReadonlyMap<string, readonly string[]>,
): TokenRemovalPlan | undefined {
  const tokenIds = items
    .filter((item) => item.kind === "token")
    .map((item) => item.id);
  const scaleTokenIds = [...scaleSteps.values()].flat();
  if (!tokenIds.length && !scaleTokenIds.length) return undefined;
  const generated = get(workingTshirtArtifactsAtom);
  if (generated.status !== "ready") throw new Error(generated.error);
  const snapshot = captureSnapshot(get);
  return planTokenRemoval({
    rows: canonicalAliasRows(
      completeAliasSource(snapshot),
      generated.bundle,
      "preserve-for-review",
    ),
    edits: get(browserTokenEditsAtom),
    taxonomy: snapshot.taxonomy!,
    aliases: get(aliasesAtom),
    components: get(componentsDocumentAtom),
    componentTokens: get(componentTokensAtom),
    fixedReferences: [snapshot.styles, snapshot.structures],
    tokenIds,
    scaleTokenIds,
  });
}

function applyTokenPlan(get: Getter, set: Setter, plan: TokenRemovalPlan) {
  withValidatedAuthoringUpdates(
    get,
    new Map<string, unknown>([
      ["tokens/browser/edits", plan.edits],
      ["tokens/aliases", plan.aliases],
      ["components", plan.components],
    ]),
    () => {
      set(browserTokenEditsAtom, plan.edits);
      set(aliasesAtom, plan.aliases);
      if (get(componentsDocumentAtom) !== plan.components)
        set(componentDraftRevisionAtom, (revision) => revision + 1);
      set(componentsDocumentAtom, plan.components);
      return undefined;
    },
  );
}

/**
 * Counts shown in the confirmation before anything changes. Read it only
 * while the confirmation is open: it plans the whole removal.
 */
export const deprecationRemovalPreviewAtom = atom(
  (get): DeprecationRemovalCounts => {
    const items = get(deprecatedItemsAtom);
    const counts = { deleted: 0, repointed: 0, hardCoded: 0, kept: 0 };
    const scaleSteps = scaleStepIds(get, items);
    let plan: TokenRemovalPlan | undefined;
    let tokensFailed = false;
    try {
      plan = planTokens(get, items, scaleSteps);
    } catch {
      tokensFailed = true;
    }
    const keptTokens = new Set(plan?.kept.map((item) => item.id));
    for (const item of items) {
      const ids =
        item.kind === "token"
          ? [item.id]
          : item.kind === "colorScale"
            ? (scaleSteps.get(item.id) ?? [])
            : undefined;
      if (!ids) continue;
      if (tokensFailed || ids.some((id) => keptTokens.has(id)))
        counts.kept += 1;
      else counts.deleted += 1;
    }
    counts.repointed += plan?.repointed ?? 0;
    counts.hardCoded += plan?.hardCoded ?? 0;

    const taxonomy = get(taxonomyDocumentAtom);
    const source = get(referencedTaxonomySourceAtom);
    for (const item of items) {
      if (item.kind !== "term" && item.kind !== "category") continue;
      const replacement =
        item.kind === "term"
          ? finalTermReplacement(taxonomy, item.id)
          : undefined;
      if (replacement) {
        const record = source.snapshot.taxonomy?.terms.find(
          (term) => term.id === item.id,
        );
        counts.repointed += replaceIdDeep(
          source.snapshot,
          item.id,
          replacement,
          record,
        ).count;
        counts.deleted += 1;
        continue;
      }
      try {
        validateReferencedTaxonomy(
          source,
          item.kind === "category"
            ? withoutCategory(taxonomy, item.id)
            : withoutTerm(taxonomy, item.id),
        );
        counts.deleted += 1;
      } catch {
        counts.kept += 1;
      }
    }
    return counts;
  },
);

export const removeDeprecationsAtom = atom(
  null,
  (get, set): DeprecationRemovalResult => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to remove deprecations.");
    const undo = captureSnapshot(get);
    const items = get(deprecatedItemsAtom);
    const removed: DeprecatedItem[] = [];
    const kept = new Map<DeprecatedItem, string>();
    let repointed = 0;
    let hardCoded = 0;

    // Runs one step, then checks all working data. A failed step is undone
    // so the next step starts from valid data.
    const attempt = (run: () => void) => {
      const before = captureSnapshot(get);
      try {
        run();
        assertStoredSnapshot(
          captureSnapshot(get),
          get(componentColorWitnessAtom),
        );
      } catch (failure) {
        if (JSON.stringify(captureSnapshot(get)) !== JSON.stringify(before))
          set(restoreAuthoringSnapshotAtom, before);
        throw failure;
      }
    };

    // 1. Tokens, including the step tokens of deprecated color scales.
    const scaleSteps = scaleStepIds(get, items);
    let plan: TokenRemovalPlan | undefined;
    let tokenError: string | undefined;
    try {
      plan = planTokens(get, items, scaleSteps);
      if (plan) {
        const ready = plan;
        attempt(() => applyTokenPlan(get, set, ready));
      }
    } catch (failure) {
      tokenError = message(failure);
      plan = undefined;
    }
    const keptTokens = new Map(
      plan?.kept.map((item) => [item.id, item.reason] as const),
    );
    for (const item of items) {
      if (item.kind !== "token") continue;
      const reason = tokenError ?? keptTokens.get(item.id);
      if (reason) kept.set(item, reason);
      else removed.push(item);
    }
    repointed += plan?.repointed ?? 0;
    hardCoded += plan?.hardCoded ?? 0;

    // 2. Color scales whose step tokens could all go.
    for (const item of items) {
      if (item.kind !== "colorScale") continue;
      const reason =
        tokenError ??
        (scaleSteps.get(item.id) ?? [])
          .map((id) => keptTokens.get(id))
          .find((text) => text);
      if (reason) {
        kept.set(item, `A step token is kept. ${reason}`);
        continue;
      }
      try {
        attempt(() => {
          const result = set(removeColorScaleAtom, item.id);
          if (!result.ok) throw new Error(result.error);
        });
        removed.push(item);
      } catch (failure) {
        kept.set(item, message(failure));
      }
    }

    // 3. Terms and categories. A term with a replacement first moves every
    // use to it. Items that point at other deprecated items can only go
    // after them, so retry until a pass removes nothing.
    const removeTaxonomy = (item: DeprecatedItem) => {
      const replacement =
        item.kind === "term"
          ? finalTermReplacement(get(taxonomyDocumentAtom), item.id)
          : undefined;
      let moved = 0;
      attempt(() => {
        if (replacement) {
          const snapshot = captureSnapshot(get);
          const record = snapshot.taxonomy?.terms.find(
            (term) => term.id === item.id,
          );
          const remap = replaceIdDeep(snapshot, item.id, replacement, record);
          if (remap.count) set(restoreAuthoringSnapshotAtom, remap.value);
          moved = remap.count;
        }
        const document = get(taxonomyDocumentAtom);
        set(
          editReferencedTaxonomyAtom,
          item.kind === "category"
            ? withoutCategory(document, item.id)
            : withoutTerm(document, item.id),
        );
      });
      repointed += moved;
    };
    let pending = items.filter(
      (item) => item.kind === "term" || item.kind === "category",
    );
    while (pending.length) {
      const next: DeprecatedItem[] = [];
      for (const item of pending) {
        try {
          removeTaxonomy(item);
          removed.push(item);
          kept.delete(item);
        } catch (failure) {
          kept.set(item, message(failure));
          next.push(item);
        }
      }
      if (next.length === pending.length) break;
      pending = next;
    }

    return {
      removed,
      kept: [...kept].map(([item, reason]) => ({ ...item, reason })),
      repointed,
      hardCoded,
      undo,
    };
  },
);

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/** Plain-language summary for the toast after removal. */
export function removalSummary(
  result: Pick<
    DeprecationRemovalResult,
    "removed" | "kept" | "repointed" | "hardCoded"
  >,
) {
  const removed = result.removed.length;
  const kept = result.kept.length;
  if (!removed && !kept) return "No deprecated items to remove";
  const parts = [`Removed ${plural(removed, "deprecated item")}`];
  if (result.repointed)
    parts.push(`moved ${plural(result.repointed, "use")} to replacements`);
  if (result.hardCoded)
    parts.push(`hard-coded ${plural(result.hardCoded, "value")}`);
  const text = parts.join(", ");
  return kept ? `${text}. Kept ${kept} still in use` : text;
}

/** Plain-language counts for the confirmation dialog. */
export function previewSummary(counts: DeprecationRemovalCounts) {
  const parts = [`deletes ${plural(counts.deleted, "deprecated item")}`];
  if (counts.repointed)
    parts.push(`moves ${plural(counts.repointed, "use")} to replacements`);
  if (counts.hardCoded)
    parts.push(`hard-codes ${plural(counts.hardCoded, "value")}`);
  if (counts.kept)
    parts.push(`keeps ${counts.kept} that can't be removed safely`);
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`
    : parts[0];
}
