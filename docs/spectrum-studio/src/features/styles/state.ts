// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter, type Setter } from "jotai";
import { selectAtom } from "jotai/utils";
import { persistedAtom } from "../../state/persist";
import { editModeAtom } from "../../state/view/editMode";
import { authoringSourceSnapshotAtom } from "../edit-session/state";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import type { TaxonomyDocument } from "../taxonomy/model";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import { styleContexts } from "./artifacts";
import { completeAliasSource } from "../tokens/aliasTargets";
import { synchronizeStylePublications } from "./generation";
import {
  buildStyleArtifacts,
  mergeStyleArtifacts,
  type StyleContext,
} from "./generation";
import { registerStyleName, withStylesVocabulary } from "./vocabulary";
import {
  EMPTY_STYLES,
  isStylesDocument,
  type StyleRecipe,
  type StylesDocument,
} from "./model";
import type { StylePropertiesEditor } from "./variants";
import { designSystemDefaults } from "../../data/defaults";
import { browserModeContextAtom } from "../tokens/browserState";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import { structureTextStyleIssues } from "./textAppearance";
import type { SpectrumIconName } from "../icons/spectrumIconNames.generated";

export const stylesDocumentAtom = persistedAtom<StylesDocument>({
  key: "design/styles",
  schemaVersion: 1,
  initialize: () =>
    structuredClone(designSystemDefaults.system.styles ?? EMPTY_STYLES),
  validate: isStylesDocument,
});
const selectedStyleAtom = atom<string | null>(null);
export const styleSampleTextAtom = atom("Ag");
export const styleSampleIconsAtom = atom<Record<string, SpectrumIconName>>({});
export const selectedStyleIdAtom = atom(
  (get) => get(selectedStyleAtom),
  (get, set, id: string | null) => {
    if (get(selectedStyleAtom) !== id) {
      set(selectedStyleAtom, id);
      set(stylePreviewAtom, {
        options: {},
        display: get(stylePreviewAtom).display,
      });
    }
  },
);
export const stylePreviewAtom = atom<{
  options: Record<string, string>;
  familyId?: string;
  outputId?: string;
  scaleIndex?: number;
  display: "tokens" | "values";
}>({
  options: {},
  display: "tokens",
});
const styleContextInputAtom = atom((get) => ({
  ...completeAliasSource(get(authoringSourceSnapshotAtom)),
  styles: undefined,
}));
const styleFoundationSourceAtom = selectAtom(
  styleContextInputAtom,
  (source) => source,
  (left, right) =>
    Object.keys(left).every(
      (key) =>
        left[key as keyof typeof left] === right[key as keyof typeof right],
    ),
);
export const styleContextsStateAtom = atom((get) => {
  try {
    return {
      contexts: styleContexts(get(styleFoundationSourceAtom)),
      error: "",
    };
  } catch (failure) {
    return {
      contexts: [],
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
});
function currentStyleContexts(get: Getter) {
  const state = get(styleContextsStateAtom);
  if (state.error) throw new Error(state.error);
  return state.contexts;
}
const styleDisplayContextsAtom = atom((get) => {
  const source = get(styleFoundationSourceAtom);
  const modeKey = get(browserModeContextAtom).key;
  const defaults = Object.fromEntries(
    source.modeSets
      .filter((axis) => axis.modes.length)
      .map((axis) => [axis.id, axis.defaultModeId]),
  );
  const current = Object.fromEntries(JSON.parse(modeKey) as [string, string][]);
  return styleContexts(
    source,
    canonicalTokenModeKey(defaults) === modeKey
      ? [current]
      : [current, defaults],
  );
});
const styleCurrentContextsAtom = atom((get) => {
  const modeKey = get(browserModeContextAtom).key;
  return get(styleDisplayContextsAtom).filter(
    (context) => canonicalTokenModeKey(context.selection) === modeKey,
  );
});
const stylePublicationRowsAtom = selectAtom(
  stylesDocumentAtom,
  (document) => document.publications,
);
const stylePublicationIndexAtom = atom((get) => {
  const index = new Map<string, StylesDocument["publications"]>();
  for (const publication of get(stylePublicationRowsAtom)) {
    const records = index.get(publication.recipeId) ?? [];
    records.push(publication);
    index.set(publication.recipeId, records);
  }
  return index;
});
interface CachedPreview {
  inputs: readonly unknown[];
  artifacts: ReturnType<typeof buildStyleArtifacts>;
}
const previewRepositoryAtom = atom(
  () => new Map<string, Partial<Record<"preview" | "text", CachedPreview>>>(),
);
function scopedStyleArtifacts(
  get: Getter,
  recipes: StyleRecipe[],
  contexts: StyleContext[],
  kind: "preview" | "text",
): ReturnType<typeof buildStyleArtifacts> {
  const source = get(styleFoundationSourceAtom);
  const document = get(stylesDocumentAtom);
  const publications = get(stylePublicationIndexAtom);
  const cache = get(previewRepositoryAtom);
  const currentIds = new Set(document.recipes.map((recipe) => recipe.id));
  for (const id of cache.keys()) if (!currentIds.has(id)) cache.delete(id);
  const results = recipes.map((recipe) => {
    const rows = publications.get(recipe.id);
    const inputs = [
      recipe,
      rows,
      contexts,
      source.taxonomy,
      source.rules,
      source.modeSets,
    ];
    const entry = cache.get(recipe.id) ?? {};
    const previous = entry[kind];
    if (previous?.inputs.every((value, index) => value === inputs[index]))
      return previous.artifacts;
    const artifacts = buildStyleArtifacts(
      { ...document, recipes: [recipe], publications: rows ?? [] },
      source.taxonomy,
      source.rules,
      source.modeSets,
      contexts,
      undefined,
      kind === "preview",
      false,
    );
    entry[kind] = { inputs, artifacts };
    cache.set(recipe.id, entry);
    return artifacts;
  });
  return mergeStyleArtifacts(results, kind !== "preview");
}
export const stylePreviewContextsStateAtom = atom((get) => {
  try {
    return { contexts: get(styleDisplayContextsAtom), error: "" };
  } catch (failure) {
    return {
      contexts: [],
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
});
export const styleArtifactsAtom = atom((get) => {
  try {
    const source = get(authoringSourceSnapshotAtom),
      contexts = get(styleContextsStateAtom);
    if (contexts.error) throw new Error(contexts.error);
    if (!source.taxonomy)
      throw new Error("Style output needs an available Registry.");
    return buildStyleArtifacts(
      source.styles ?? EMPTY_STYLES,
      source.taxonomy,
      source.rules ?? [],
      source.modeSets,
      contexts.contexts,
    );
  } catch (failure) {
    return {
      rows: [],
      issues: [
        {
          recipeId: "",
          message: failure instanceof Error ? failure.message : String(failure),
        },
      ],
    };
  }
});
export const textStyleSourceAtom = atom((get) => ({
  document: get(stylesDocumentAtom),
  artifacts: get(styleArtifactsAtom),
  modeKey: get(browserModeContextAtom).key,
}));
export const previewTextStyleSourceAtom = atom((get) => {
  const source = get(authoringSourceSnapshotAtom);
  try {
    if (!source.taxonomy)
      throw new Error("Style preview needs an available Registry.");
    return {
      document: get(stylesDocumentAtom),
      artifacts: scopedStyleArtifacts(
        get,
        source.styles?.recipes ?? [],
        get(styleDisplayContextsAtom),
        "text",
      ),
      modeKey: get(browserModeContextAtom).key,
    };
  } catch (failure) {
    return {
      document: get(stylesDocumentAtom),
      artifacts: {
        rows: [],
        issues: [
          {
            recipeId: "",
            message:
              failure instanceof Error ? failure.message : String(failure),
          },
        ],
      },
      modeKey: get(browserModeContextAtom).key,
    };
  }
});
function previewArtifacts(get: Getter, selectedOnly: boolean) {
  const source = get(authoringSourceSnapshotAtom);
  try {
    const selectedId = selectedOnly ? get(selectedStyleIdAtom) : null;
    return source.taxonomy
      ? scopedStyleArtifacts(
          get,
          (source.styles?.recipes ?? []).filter(
            (recipe) => !selectedOnly || recipe.id === selectedId,
          ),
          get(styleCurrentContextsAtom),
          "preview",
        )
      : {
          rows: [],
          issues: [
            {
              recipeId: "",
              message: "Style preview needs an available Registry.",
            },
          ],
        };
  } catch (failure) {
    return {
      rows: [],
      issues: [
        {
          recipeId: "",
          message: failure instanceof Error ? failure.message : String(failure),
        },
      ],
    };
  }
}
export const stylePreviewArtifactsAtom = atom((get) =>
  previewArtifacts(get, true),
);
export const styleLibraryArtifactsAtom = atom((get) =>
  previewArtifacts(get, false),
);
export const prepareStylePublicationsAtom = atom(null, (get, set) => {
  const source = get(authoringSourceSnapshotAtom),
    document = get(stylesDocumentAtom);
  if (!document.recipes.length) return;
  const next = synchronizeStylePublications(
    document,
    currentStyleContexts(get),
    source.rules ?? [],
  );
  if (next !== document) set(stylesDocumentAtom, next);
});
export const renameStyleAtom = atom(
  null,
  (get, set, input: { id: string; name: string }) => {
    if (!get(editModeAtom))
      throw new Error("Enter Edit mode to rename styles.");
    const document = get(stylesDocumentAtom);
    const recipe = document.recipes.find((item) => item.id === input.id);
    if (!recipe) throw new Error("This style is no longer available.");
    const named = registerStyleName(get(taxonomyDocumentAtom), input.name);
    const next = {
      ...document,
      recipes: document.recipes.map((item) =>
        item.id === input.id ? { ...recipe, name: named.name } : item,
      ),
    };
    withValidatedAuthoringUpdates(
      get,
      new Map<string, unknown>([
        ["registry/taxonomy", named.taxonomy],
        ["design/styles", next],
      ]),
      () => {
        set(taxonomyDocumentAtom, named.taxonomy);
        set(stylesDocumentAtom, next);
      },
    );
  },
);
function writeStyleRecipe(
  get: Getter,
  set: Setter,
  recipe: StyleRecipe,
  taxonomy: TaxonomyDocument,
  index?: number,
) {
  if (!get(editModeAtom)) throw new Error("Enter Edit mode to change styles.");
  const previous = get(stylesDocumentAtom);
  const recipes = [...previous.recipes];
  const existing = recipes.findIndex((item) => item.id === recipe.id);
  recipes.splice(
    existing >= 0 ? existing : (index ?? recipes.length),
    existing >= 0 ? 1 : 0,
    recipe,
  );
  const source = {
    ...get(authoringSourceSnapshotAtom),
    taxonomy,
    styles: { ...previous, recipes },
  };
  const document = synchronizeStylePublications(
    source.styles,
    taxonomy === get(taxonomyDocumentAtom)
      ? currentStyleContexts(get)
      : styleContexts(source),
    source.rules ?? [],
  );
  const issues = structureTextStyleIssues(
    source.structures?.structures ?? [],
    document,
  );
  if (issues.length) throw new Error(issues.join(" "));
  const updates = new Map<string, unknown>([["design/styles", document]]);
  const taxonomyChanged = taxonomy !== get(taxonomyDocumentAtom);
  if (taxonomyChanged) updates.set("registry/taxonomy", taxonomy);
  withValidatedAuthoringUpdates(get, updates, () => {
    if (taxonomyChanged) set(taxonomyDocumentAtom, taxonomy);
    set(stylesDocumentAtom, document);
  });
}
export const saveStyleAtom = atom(null, (get, set, recipe: StyleRecipe) => {
  writeStyleRecipe(
    get,
    set,
    recipe,
    withStylesVocabulary(get(taxonomyDocumentAtom)),
  );
});
export const editStylePropertiesAtom = atom(
  null,
  (
    get,
    set,
    input: {
      recipeId: string;
      editor: StylePropertiesEditor;
      taxonomy?: TaxonomyDocument;
    },
  ) => {
    const recipe = get(stylesDocumentAtom).recipes.find(
      (entry) => entry.id === input.recipeId,
    );
    if (!recipe) throw new Error("This style is no longer available.");
    writeStyleRecipe(
      get,
      set,
      {
        ...recipe,
        options: input.editor.properties,
        differences: input.editor.differences,
      },
      withStylesVocabulary(input.taxonomy ?? get(taxonomyDocumentAtom)),
    );
  },
);
export const createStyleAtom = atom(
  null,
  (
    get,
    set,
    input: { recipe: Omit<StyleRecipe, "id" | "name">; name: string },
  ) => {
    if (!get(editModeAtom)) throw new Error("Enter Edit mode to add a style.");
    const named = registerStyleName(
      withStylesVocabulary(get(taxonomyDocumentAtom)),
      input.name,
    );
    const recipe = {
      ...input.recipe,
      id: crypto.randomUUID(),
      name: named.name,
    };
    writeStyleRecipe(get, set, recipe, named.taxonomy);
    set(selectedStyleIdAtom, recipe.id);
    return recipe;
  },
);
export const removeStyleAtom = atom(null, (get, set, id: string) => {
  if (!get(editModeAtom)) throw new Error("Enter Edit mode to delete a style.");
  const document = get(stylesDocumentAtom);
  const recipe = document.recipes.find((recipe) => recipe.id === id);
  if (!recipe) throw new Error("This style is no longer available.");
  const next = {
    ...document,
    recipes: document.recipes.filter((recipe) => recipe.id !== id),
  };
  const issues = structureTextStyleIssues(
    get(authoringSourceSnapshotAtom).structures?.structures ?? [],
    next,
  );
  if (issues.length)
    throw new Error(
      "This Text Style is used by a Structure. Change its Style reference before deleting it.",
    );
  set(stylesDocumentAtom, {
    ...next,
  });
  if (get(selectedStyleIdAtom) === id) set(selectedStyleIdAtom, null);
  return {
    recipe,
    index: document.recipes.findIndex((recipe) => recipe.id === id),
  };
});
export const restoreStyleAtom = atom(
  null,
  (get, set, removed: { recipe: StyleRecipe; index: number }) => {
    const { recipe, index } = removed;
    if (get(stylesDocumentAtom).recipes.some((item) => item.id === recipe.id))
      throw new Error("This style already exists.");
    writeStyleRecipe(
      get,
      set,
      recipe,
      withStylesVocabulary(get(taxonomyDocumentAtom)),
      index,
    );
  },
);
