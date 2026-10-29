// Copyright 2026 Adobe. All rights reserved.
import { concreteColor } from "../color-system/data-vis/colors";
import type { GeneratedShadow } from "../elevation/model";
import type { TokenPanelId } from "./view/tokenPanelRegistry";
import {
  formatTypographyLength,
  fromTypographyUnit,
  type TypographyUnit,
} from "../typography/units";
import { filterTokenTableData } from "./view/tokenTableModel";
import {
  resolveSourceClassification,
  withTaxonomyProjection,
  type Classification,
  type TaxonomyDocument,
  type TaxonomyProjection,
  type TaxonomySourceContext,
  type TaxonomyValue,
} from "../taxonomy/model";
import type { TshirtSemanticRow } from "../design-data/tshirtTypes";
import type { AliasToken } from "./aliases";
import type {
  BrowserTokenEdit,
  BrowserTokenEdits,
  TokenValue,
} from "./browserEditTypes";
import type { UiSwatchSource } from "../color-system/data-vis/model";
import type { ValuePreviewDescriptor } from "./valuePreview";
export {
  canonicalTokenModeKey,
  resolveBrowserColorToken,
} from "./colorResolution";
export type {
  BrowserTokenEdit,
  BrowserTokenEdits,
  TokenValue,
} from "./browserEditTypes";

export type TokenLifecycle = "draft" | "released" | "deprecated";

export interface NominalFontSizeMeasurement {
  kind: "nominal-font-size";
  unit: "px" | "rem" | "em";
  reference: string;
}

export interface BrowserTokenSource {
  rowId?: string;
  modeKey?: string;
  /** The foundation resolver has already applied scoped value edits. */
  resolvedValue?: { overridden: boolean; stale: boolean };
  id: string;
  type: TokenPanelId;
  groupId: string;
  groupLabel: string;
  name: string;
  value: TokenValue;
  generatedName: string;
  generatedValue: TokenValue;
  unit: "px" | "";
  /** Numeric source and override values stay canonical; only their presentation changes. */
  displayUnit?: TypographyUnit;
  measurement?: NominalFontSizeMeasurement;
  legacyOverridden?: boolean;
  legacyStale?: boolean;
  /** Set for palette tokens; their name and value edits write through to the palette color. */
  paletteColorId?: string;
  dataVis?: {
    scaleId: string;
    memberId: string;
    ordinal: number;
    source: UiSwatchSource;
    hidden: boolean;
    static?: boolean;
  };
  taxonomyEvidence?: Record<string, TaxonomyValue>;
  taxonomySource?: TaxonomySourceContext;
  projection?: TaxonomyProjection;
  validationError?: string;
  shadows?: GeneratedShadow[];
  /** Transient display context for a resolved compatibility alias. */
  valuePreview?: ValuePreviewDescriptor;
  semantic?: TshirtSemanticRow;
  alias?: AliasToken & { targetName: string };
}

export interface BrowserToken extends BrowserTokenSource {
  description: string;
  status: TokenLifecycle;
  nameOverridden: boolean;
  valueOverridden: boolean;
  stale: boolean;
}

export interface BrowserTokenPatch {
  classification?: Classification;
  name?: string;
  description?: string;
  status?: "draft" | "deprecated";
  value?: TokenValue;
}

export function tokenModePairs(modeKey: string): [string, string][] {
  const selection: unknown = JSON.parse(modeKey);
  if (!Array.isArray(selection))
    throw new Error("This token has an invalid mode assignment.");
  const pairs: [string, string][] = [];
  for (const pair of selection) {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      typeof pair[0] !== "string" ||
      typeof pair[1] !== "string"
    ) {
      throw new Error("This token has an invalid mode assignment.");
    }
    pairs.push([pair[0], pair[1]]);
  }
  return pairs;
}

export function tokenModeSetIds(modeKey: string): string[] {
  return tokenModePairs(modeKey).map(([id]) => id);
}

export function tokenValueText(
  token: Pick<
    BrowserTokenSource,
    "value" | "unit" | "displayUnit" | "validationError"
  > & { type?: string },
) {
  if (token.validationError) return token.validationError;
  if (token.type === "opacity" && typeof token.value === "number")
    return `${Math.round(token.value * 100)}%`;
  if (
    typeof token.value === "number" &&
    token.displayUnit &&
    token.unit === "px"
  )
    return formatTypographyLength(token.value, token.displayUnit);
  return typeof token.value === "number"
    ? `${Number(token.value.toFixed(4))}${token.unit}`
    : token.value;
}

export function resolveBrowserTokens(
  sources: BrowserTokenSource[],
  edits: BrowserTokenEdits,
  modeKey: string,
): BrowserToken[] {
  return sources.map((source) => {
    const edit = edits[source.id];
    const modeValue =
      source.dataVis?.static || source.resolvedValue
        ? undefined
        : edit?.values[source.modeKey ?? modeKey];
    return {
      ...source,
      name: edit?.name ?? source.name,
      value: modeValue?.value ?? source.value,
      description: edit?.description ?? "",
      status: edit?.status ?? "draft",
      nameOverridden:
        edit?.name !== undefined || source.name !== source.generatedName,
      valueOverridden:
        modeValue !== undefined ||
        !!source.legacyOverridden ||
        !!source.resolvedValue?.overridden,
      stale:
        (modeValue !== undefined &&
          modeValue.baseline !== source.generatedValue) ||
        (edit?.nameBaseline !== undefined &&
          edit.nameBaseline !== source.generatedName) ||
        !!source.legacyStale ||
        !!source.resolvedValue?.stale,
    };
  });
}

export function filterBrowserTokens(
  tokens: BrowserToken[],
  type: TokenPanelId | "all",
  query: string,
) {
  const candidates = tokens.filter(
    (token) => type === "all" || token.type === type,
  );
  if (query.trim() && candidates.some((token) => token.projection)) {
    const terms = query.trim().toLowerCase().split(/\s+/);
    return candidates.filter((token) => {
      const text =
        `${token.name} ${tokenValueText(token)} ${token.groupLabel} ${token.alias ? `compatibility alias ${token.alias.targetName}` : token.semantic ? `semantic generated ${"$ref" in token.semantic.token ? "alias" : "literal"} ${token.semantic.target.name}` : "primitive"} ${token.projection?.segments.map((segment) => `${segment.categoryName} ${segment.values.join(" ")}`).join(" ")} ${token.projection?.issues.join(" ")}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    });
  }
  const groups = new Map<
    string,
    {
      id: string;
      label: string;
      rows: {
        id: string;
        cells: { name: { text: string }; value: { text: string } };
      }[];
    }
  >();
  for (const token of candidates) {
    const key = `${token.type}:${token.groupId}`;
    const group = groups.get(key) ?? {
      id: key,
      label: token.groupLabel,
      rows: [],
    };
    group.rows.push({
      id: token.id,
      cells: {
        name: { text: token.name },
        value: { text: tokenValueText(token) },
      },
    });
    groups.set(key, group);
  }
  const matches = new Set(
    filterTokenTableData(
      { groups: [...groups.values()] },
      query,
    ).groups.flatMap((group) => group.rows.map((row) => row.id)),
  );
  return candidates.filter((token) => matches.has(token.id));
}

export function groupBrowserCards(tokens: BrowserToken[]) {
  const groups = new Map<
    string,
    { id: string; label: string; tokens: BrowserToken[] }
  >();
  for (const token of tokens) {
    const segment =
      token.projection?.issues.length === 0
        ? token.projection.segments[0]
        : undefined;
    const label = token.alias
      ? "Compatibility aliases"
      : segment
        ? segment.values.join(", ")
        : "Unresolved classification";
    const id = token.alias
      ? "aliases"
      : segment
        ? JSON.stringify([segment.categoryId, segment.termIds])
        : "unresolved";
    const group = groups.get(id) ?? { id, label, tokens: [] };
    group.tokens.push(token);
    groups.set(id, group);
  }

  return [...groups.values()].sort((first, second) =>
    first.id.localeCompare(second.id),
  );
}

export function projectBrowserTokens(
  tokens: BrowserToken[],
  document: TaxonomyDocument,
): BrowserToken[] {
  return withTaxonomyProjection(document, () =>
    projectTokenBatch(tokens, document),
  );
}

function projectTokenBatch(
  tokens: BrowserToken[],
  document: TaxonomyDocument,
): BrowserToken[] {
  const projected = tokens.map((token) => {
    if (token.alias)
      return {
        ...token,
        projection: {
          classification: {},
          segments: [],
          flat: {},
          name: token.name,
          issues: [],
        },
      };
    if (token.semantic && token.projection)
      return {
        ...token,
        projection: {
          ...token.projection,
          issues: [...token.projection.issues],
        },
      };
    const assigned = document.classifications[token.id];
    const projection = resolveSourceClassification(
      document,
      token.id,
      token.taxonomyEvidence ?? {},
      token.type as
        | "colors"
        | "typography"
        | "spacing"
        | "size"
        | "radius"
        | "opacity"
        | "elevation",
      token.taxonomySource,
    );
    if (token.validationError) projection.issues.push(token.validationError);
    if (token.nameOverridden && !assigned)
      projection.issues.push(
        "Legacy name edit requires reviewed classification; the original edit is preserved.",
      );
    return {
      ...token,
      name: projection.issues.length ? token.name : projection.name,
      projection,
    };
  });
  const names = new Map<string, typeof projected>();
  for (const token of projected)
    if (token.projection.issues.length === 0)
      names.set(token.name, [...(names.get(token.name) ?? []), token]);
  for (const [name, members] of names)
    if (new Set(members.map((token) => token.id)).size > 1) {
      for (const token of members)
        token.projection.issues.push(
          `Serialized name collision "${name}" with ${members
            .filter((member) => member.id !== token.id)
            .map((member) => member.id)
            .join(", ")}.`,
        );
    }
  return projected;
}
export function canBulkEditValue(tokens: BrowserToken[]) {
  if (
    tokens.some(
      (token) => token.type === "elevation" || token.semantic || token.alias,
    )
  )
    return false;
  const first = tokens[0];
  // Palette colors must stay distinct, so one shared value cannot be applied to several of them.
  return (
    !!first &&
    !(tokens.length > 1 && tokens.some((token) => token.paletteColorId)) &&
    tokens.every(
      (token) =>
        token.status !== "released" &&
        (token.type === "opacity") === (first.type === "opacity") &&
        (token.type === "colors") === (first.type === "colors") &&
        token.unit === first.unit &&
        (token.displayUnit ?? token.unit) === (first.displayUnit ?? first.unit),
    )
  );
}

export function parseBrowserTokenValue(
  token: BrowserTokenSource,
  input: string,
): TokenValue {
  if (token.alias)
    throw new Error(
      "Aliases resolve their canonical token's value. Delete the alias or edit its source.",
    );
  if (token.semantic)
    throw new Error(
      "Edit generated variants through their Structure, rule or foundation source.",
    );
  if (token.type === "elevation")
    throw new Error("Edit complete shadows in the Elevation foundation.");
  if (token.type === "opacity") {
    const text = input.trim();
    const value =
      Number(text.replace(/%$/, "").trim()) / (text.endsWith("%") ? 100 : 1);
    if (!text || !Number.isFinite(value) || value < 0 || value > 1)
      throw new Error("Enter an opacity from 0% to 100%.");
    return value;
  }
  if (token.type === "colors") {
    const value = input.trim();
    try {
      concreteColor(value);
      return value;
    } catch {
      throw new Error("Enter a valid color value.");
    }
  }
  const shownUnit = token.displayUnit ?? token.unit;
  const text = input
    .trim()
    .replace(shownUnit ? new RegExp(`${shownUnit}$`, "i") : /$^/, "")
    .trim();
  const value = text === "" ? NaN : Number(text);
  if (!Number.isFinite(value) || value < 0)
    throw new Error("Enter a non-negative numeric value.");
  return token.displayUnit && token.unit === "px"
    ? fromTypographyUnit(value, token.displayUnit)
    : value;
}

export function applyBrowserTokenEdits(
  sources: BrowserTokenSource[],
  edits: BrowserTokenEdits,
  ids: string[],
  modeKey: string,
  patch: BrowserTokenPatch,
): BrowserTokenEdits {
  const selectedIds = new Set(ids);
  const selected = sources.filter((token) => selectedIds.has(token.id));
  if (selected.length === 0 || selected.length !== selectedIds.size)
    throw new Error("The selected tokens are no longer available.");
  if (selected.some((token) => token.alias))
    throw new Error("Aliases have no independent values or metadata to edit.");
  if (selected.some((token) => token.semantic))
    throw new Error(
      "Generated variants are read-only here. Edit their Structure, rule or foundation source.",
    );
  if (patch.name !== undefined && (selected.length !== 1 || !patch.name.trim()))
    throw new Error("Enter a token name.");
  if (
    patch.status !== undefined &&
    patch.status !== "draft" &&
    patch.status !== "deprecated"
  )
    throw new Error("Released status cannot be assigned locally.");
  const resolved = resolveBrowserTokens(sources, edits, modeKey);
  if (
    patch.value !== undefined &&
    !canBulkEditValue(resolved.filter((token) => selectedIds.has(token.id)))
  )
    throw new Error("Selected values have incompatible types or units.");
  const next = structuredClone(edits);
  for (const source of selected) {
    const edit = next[source.id] ?? { values: {} };
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (
        resolved.some(
          (token) =>
            token.id !== source.id &&
            token.type === source.type &&
            token.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      )
        throw new Error("A token with this name already exists in this type.");
      if (name === source.name) {
        delete edit.name;
        delete edit.nameBaseline;
      } else {
        edit.name = name;
        edit.nameBaseline = source.generatedName;
      }
    }
    if (patch.description !== undefined) {
      if (patch.description.trim()) edit.description = patch.description.trim();
      else delete edit.description;
    }
    if (patch.status !== undefined) {
      if (patch.status === "draft") delete edit.status;
      else edit.status = patch.status;
    }
    if (patch.value !== undefined) {
      // Numeric patches are canonical; text values use the displayed unit.
      const value = parseBrowserTokenValue(
        typeof patch.value === "number"
          ? { ...source, displayUnit: undefined }
          : source,
        String(patch.value),
      );
      const key = source.modeKey ?? modeKey;
      if (
        value ===
        (source.type === "opacity" ? source.generatedValue : source.value)
      )
        delete edit.values[key];
      else edit.values[key] = { value, baseline: source.generatedValue };
    }
    if (
      Object.keys(edit.values).length ||
      edit.name !== undefined ||
      edit.description !== undefined ||
      edit.status !== undefined
    )
      next[source.id] = edit;
    else delete next[source.id];
  }
  return next;
}

export function isBrowserTokenEdits(
  value: unknown,
): value is BrowserTokenEdits {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      return false;
    const edit = entry as BrowserTokenEdit;
    if (edit.name !== undefined && typeof edit.name !== "string") return false;
    if (
      edit.nameBaseline !== undefined &&
      typeof edit.nameBaseline !== "string"
    )
      return false;
    if (edit.description !== undefined && typeof edit.description !== "string")
      return false;
    if (
      edit.status !== undefined &&
      edit.status !== "draft" &&
      edit.status !== "deprecated"
    )
      return false;
    if (
      !edit.values ||
      typeof edit.values !== "object" ||
      Array.isArray(edit.values)
    )
      return false;
    return Object.entries(edit.values).every(([key, modeValue]) => {
      try {
        const pairs: unknown = JSON.parse(key);
        if (
          !Array.isArray(pairs) ||
          !pairs.every(
            (pair: unknown) =>
              Array.isArray(pair) &&
              pair.length === 2 &&
              pair.every((part: unknown) => typeof part === "string"),
          )
        )
          return false;
      } catch {
        return false;
      }
      return (
        !!modeValue &&
        [modeValue.value, modeValue.baseline].every(
          (field) =>
            typeof field === "string" ||
            (typeof field === "number" && Number.isFinite(field)),
        )
      );
    });
  });
}
