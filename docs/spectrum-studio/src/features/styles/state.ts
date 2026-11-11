// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter, type Setter } from "jotai";
import { persistedAtom } from "../../state/persist";
import { editModeAtom } from "../../state/view/editMode";
import { authoringSourceSnapshotAtom } from "../edit-session/state";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import type { TaxonomyDocument } from "../taxonomy/model";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import { styleContexts } from "./artifacts";
import { synchronizeStylePublications } from "./generation";
import { buildStyleArtifacts } from "./generation";
import { canonicalJson } from "../design-data/canonicalJson";
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
export const styleContextsStateAtom = atom((get) => {
  try {
    return {
      contexts: styleContexts(get(authoringSourceSnapshotAtom)),
      error: "",
    };
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
export const stylePreviewArtifactsAtom = atom((get) => {
  const source = get(authoringSourceSnapshotAtom);
  try {
    const contexts = get(styleContextsStateAtom);
    if (contexts.error) throw new Error(contexts.error);
    return source.taxonomy
      ? buildStyleArtifacts(
          source.styles ?? EMPTY_STYLES,
          source.taxonomy,
          source.rules ?? [],
          source.modeSets,
          contexts.contexts,
          undefined,
          true,
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
});
export const prepareStylePublicationsAtom = atom(null, (get, set) => {
  const source = get(authoringSourceSnapshotAtom),
    document = get(stylesDocumentAtom);
  if (!document.recipes.length) return;
  const next = synchronizeStylePublications(
    document,
    styleContexts(source),
    source.rules ?? [],
  );
  if (canonicalJson(next.publications) !== canonicalJson(document.publications))
    set(stylesDocumentAtom, next);
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
    styleContexts(source),
    source.rules ?? [],
  );
  const issues = structureTextStyleIssues(
    source.structures?.structures ?? [],
    document,
  );
  if (issues.length) throw new Error(issues.join(" "));
  withValidatedAuthoringUpdates(
    get,
    new Map<string, unknown>([
      ["registry/taxonomy", taxonomy],
      ["design/styles", document],
    ]),
    () => {
      set(taxonomyDocumentAtom, taxonomy);
      set(stylesDocumentAtom, document);
    },
  );
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
