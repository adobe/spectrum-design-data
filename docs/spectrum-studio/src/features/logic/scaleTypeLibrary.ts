// Copyright 2026 Adobe. All rights reserved.
import { atom, type WritableAtom } from "jotai";
import { designSystemDefaults } from "../../data/defaults";
import { persistedAtom } from "../../state/persist";
import {
  isInterpolation,
  interpolationIssues,
  type Interpolation,
} from "../scales/interpolationDefinition";
import {
  isScaleType,
  migrateScaleTypeLibrary,
  SCALE_TYPE_DEFAULTS,
  scaleTypeIssues,
  TYPOGRAPHY_SCALE_TYPE_ID,
  type ScaleType,
} from "../scales/scaleType";
import { typographyDocumentAtom } from "../typography/state";
import { interpolationConsumers } from "./interpolationConsumers";
import { validateTypographyGeneration } from "../typography/typographyGeneration";
import { rulesAtom } from "./library";

export { SCALE_TYPE_DEFAULTS };

// 3 adds the canonical adaptive Type scale; generic formulas retain per-part flags.
export const LOGIC_LIBRARY_SCHEMA_VERSION = 3;
// 4 stores reusable shapes; consumers own their ranges.
export const INTERPOLATIONS_SCHEMA_VERSION = 4;

/** Shipped interpolations, such as the typography line-height interpolations. */
export const INTERPOLATION_DEFAULTS: readonly Interpolation[] =
  designSystemDefaults.system.interpolations;

export function isScaleTypeList(value: unknown): value is ScaleType[] {
  return (
    Array.isArray(value) &&
    value.every(isScaleType) &&
    value.filter((item) => item.id === TYPOGRAPHY_SCALE_TYPE_ID).length === 1 &&
    new Set(value.map((item) => item.id)).size === value.length
  );
}

export function isInterpolationList(value: unknown): value is Interpolation[] {
  return (
    Array.isArray(value) &&
    value.every(isInterpolation) &&
    value.every((item) => interpolationIssues(item).length === 0) &&
    new Set(value.map((item) => item.id)).size === value.length
  );
}

export const scaleTypesAtom = persistedAtom<ScaleType[]>({
  key: "logic/scale-types",
  schemaVersion: LOGIC_LIBRARY_SCHEMA_VERSION,
  initialize: () => structuredClone([...SCALE_TYPE_DEFAULTS]),
  validate: isScaleTypeList,
  migrate: (data, fromVersion) =>
    fromVersion === 1 ? migrateScaleTypeLibrary(data) : null,
});

export const interpolationsAtom = persistedAtom<Interpolation[]>({
  key: "logic/interpolations",
  schemaVersion: INTERPOLATIONS_SCHEMA_VERSION,
  initialize: () => structuredClone([...INTERPOLATION_DEFAULTS]),
  validate: isInterpolationList,
});

interface LibraryItem {
  id: string;
  name: string;
  locked?: boolean;
}

type LibraryAtom<T> = WritableAtom<T[], [T[] | ((previous: T[]) => T[])], void>;

export interface RemovedLibraryItem<T> {
  item: T;
  index: number;
}

function libraryActions<T extends LibraryItem>(library: LibraryAtom<T>) {
  /** Authored items are never locked; only shipped built-ins are. */
  const authored = (item: T): T => {
    const { locked, ...rest } = item;
    void locked;
    return rest as T;
  };
  return {
    add: atom(null, (get, set, item: T) => {
      if (get(library).some((candidate) => candidate.id === item.id)) return;
      set(library, [...get(library), authored(item)]);
    }),
    replace: atom(null, (get, set, item: T) => {
      set(
        library,
        get(library).map((candidate) =>
          candidate.id === item.id && !candidate.locked
            ? authored(item)
            : candidate,
        ),
      );
    }),
    remove: atom(null, (get, set, id: string): RemovedLibraryItem<T> | null => {
      const items = get(library);
      const index = items.findIndex((candidate) => candidate.id === id);
      if (
        index === -1 ||
        items[index].locked ||
        id === TYPOGRAPHY_SCALE_TYPE_ID
      )
        return null;
      set(
        library,
        items.filter((candidate) => candidate.id !== id),
      );
      return { item: items[index], index };
    }),
    restore: atom(null, (get, set, removed: RemovedLibraryItem<T>) => {
      const items = get(library);
      if (items.some((candidate) => candidate.id === removed.item.id)) return;
      const next = [...items];
      next.splice(Math.min(removed.index, next.length), 0, removed.item);
      set(library, next);
    }),
  };
}

const scaleTypeActions = libraryActions(scaleTypesAtom);
export const addScaleTypeAtom = atom(null, (get, set, item: ScaleType) => {
  if (get(scaleTypesAtom).some((candidate) => candidate.id === item.id))
    throw new Error("This formula already exists.");
  if (!isScaleType(item) || scaleTypeIssues(item).length)
    throw new Error("Enter a valid formula.");
  set(scaleTypeActions.add, item);
});
export const replaceScaleTypeAtom = atom(null, (get, set, item: ScaleType) => {
  if (!get(scaleTypesAtom).some((candidate) => candidate.id === item.id))
    throw new Error("This formula is no longer available.");
  const issues = scaleTypeIssues(item);
  if (!isScaleType(item) || issues.length)
    throw new Error(issues.join(" ") || "Enter a valid formula.");
  if (
    item.textSizeAdaptation &&
    !get(interpolationsAtom).some(
      (shape) => shape.id === item.textSizeAdaptation!.interpolationId,
    )
  )
    throw new Error("Choose an available adaptive interpolation.");
  if (item.id === TYPOGRAPHY_SCALE_TYPE_ID) {
    validateTypographyGeneration(
      get(typographyDocumentAtom),
      get(rulesAtom),
      get(scaleTypesAtom).map((formula) =>
        formula.id === item.id ? item : formula,
      ),
      get(interpolationsAtom),
    );
  }
  set(scaleTypeActions.replace, item);
});
export const removeScaleTypeAtom = scaleTypeActions.remove;
export const restoreScaleTypeAtom = scaleTypeActions.restore;

const interpolationActions = libraryActions(interpolationsAtom);
function assertInterpolation(item: Interpolation) {
  if (!isInterpolation(item)) throw new Error("Enter a valid interpolation.");
  const issues = interpolationIssues(item);
  if (issues.length) throw new Error(issues.join(" "));
}
export const addInterpolationAtom = atom(
  null,
  (get, set, item: Interpolation) => {
    assertInterpolation(item);
    if (get(interpolationsAtom).some((candidate) => candidate.id === item.id))
      throw new Error("This interpolation already exists.");
    set(interpolationActions.add, item);
  },
);
export const replaceInterpolationAtom = atom(
  null,
  (get, set, item: Interpolation) => {
    assertInterpolation(item);
    if (!get(interpolationsAtom).some((candidate) => candidate.id === item.id))
      throw new Error("This interpolation is no longer available.");
    validateTypographyGeneration(
      get(typographyDocumentAtom),
      get(rulesAtom),
      get(scaleTypesAtom),
      get(interpolationsAtom).map((shape) =>
        shape.id === item.id ? item : shape,
      ),
    );
    set(interpolationActions.replace, item);
  },
);
export const removeInterpolationAtom = atom(
  null,
  (get, set, id: string): RemovedLibraryItem<Interpolation> | null => {
    if (
      interpolationConsumers(
        get(typographyDocumentAtom),
        get(scaleTypesAtom),
      ).some((consumer) => consumer.interpolationId === id)
    ) {
      throw new Error(
        "This interpolation is still used. Choose another interpolation in its consumers first.",
      );
    }
    return set(interpolationActions.remove, id);
  },
);
export const restoreInterpolationAtom = interpolationActions.restore;

/** Built-ins always exist and match what ships; everything else is left alone. */
export function normalizeBuiltIns<T extends LibraryItem>(
  library: readonly T[],
  builtIns: readonly T[],
  label: string,
) {
  const corrections: string[] = [];
  const next = [...library];
  for (const builtIn of builtIns.filter((item) => item.locked)) {
    const index = next.findIndex((item) => item.id === builtIn.id);
    if (index === -1) {
      next.splice(
        Math.min(builtIns.indexOf(builtIn), next.length),
        0,
        structuredClone(builtIn),
      );
      corrections.push(`Restored built-in ${label} ${builtIn.name}`);
    } else if (JSON.stringify(next[index]) !== JSON.stringify(builtIn)) {
      next[index] = structuredClone(builtIn);
      corrections.push(`Reset built-in ${label} ${builtIn.name}`);
    }
  }
  return { library: next, corrections };
}

/** Writes back only when something was corrected, so it is safe to run after every change. */
export const normalizeLogicLibraryAtom = atom(null, (get, set) => {
  const scaleTypes = normalizeBuiltIns(
    get(scaleTypesAtom),
    SCALE_TYPE_DEFAULTS,
    "scale type",
  );
  const interpolations = normalizeBuiltIns(
    get(interpolationsAtom),
    INTERPOLATION_DEFAULTS,
    "interpolation",
  );
  if (scaleTypes.corrections.length > 0)
    set(scaleTypesAtom, scaleTypes.library);
  if (interpolations.corrections.length > 0)
    set(interpolationsAtom, interpolations.library);
  return [...scaleTypes.corrections, ...interpolations.corrections];
});
