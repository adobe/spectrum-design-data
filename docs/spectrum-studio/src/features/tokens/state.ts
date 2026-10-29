// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import type { Atom } from "jotai";
import { selectAtom } from "jotai/utils";
import type { LinearRgb } from "../color-system/colorMath";
import type { ColorScale, ContrastToken } from "../color-system/model";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
  updatePaletteColorAtom,
} from "../color-system/state";
import { paletteChannelsFromCss } from "../color-system/palette";
import { resolvedBackgroundLinear } from "../color-system/surfaceGeneration";
import { activeModesAtom } from "../modes/selection";
import { previewOverridesAtom } from "../modes/previewState";
import { modeSetsAtom } from "../modes/state";
import { buildCascadeTokenExport } from "./cascadeExport";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import {
  generateColorTokensForScale,
  generatePaletteTokens,
} from "./generation";
import {
  TOKEN_SET_SCHEMA_VERSION,
  type GeneratedToken,
  type TokenName,
  type TokenSet,
  isPaletteToken,
  tokenDisplayName,
  tokenNamesEqual,
  tokenStableKey,
  isTokenOverrideStale as isStale,
  resolveToken,
} from "./model";
export { resolveToken } from "./model";
import {
  tokenOverridesAtom,
  type TokenOverride,
  type TokenOverrideMap,
} from "./overrides";
import { browserTokenEditsAtom } from "./browserEdits";
import {
  canonicalTokenModeKey,
  resolveBrowserColorToken,
} from "./browserModel";
import { rulesAtom } from "../logic/library";

const scaleIdsAtom = selectAtom(
  resolvedColorSystemDocumentAtom,
  (document) => document.scales.map((scale) => scale.id),
  (previous, next) =>
    previous.length === next.length &&
    previous.every((id, index) => id === next[index]),
);

const contrastsAtom = selectAtom(
  resolvedColorSystemDocumentAtom,
  (document) => document.contrasts,
);
const settingsAtom = selectAtom(
  resolvedColorSystemDocumentAtom,
  (document) => document.settings,
);

export const outputGamutAtom = selectAtom(
  resolvedColorSystemDocumentAtom,
  (document) => document.settings.colorOutput,
);

const backgroundLinearAtom = selectAtom(
  resolvedColorSystemDocumentAtom,
  resolvedBackgroundLinear,
  (previous, next) =>
    previous[0] === next[0] &&
    previous[1] === next[1] &&
    previous[2] === next[2],
);

const paletteAtom = selectAtom(
  resolvedColorSystemDocumentAtom,
  (document) => document.palette,
);

const paletteTokensAtom = atom((get): GeneratedToken[] =>
  generatePaletteTokens(get(paletteAtom), get(outputGamutAtom)),
);

// jotai 3 dropped atomFamily; this keeps per-scale derivations isolated so editing one
// scale never recomputes the other eighteen.
const scaleTokensFamily = (() => {
  const cache = new Map<string, Atom<GeneratedToken[]>>();
  return (scaleId: string) => {
    const cached = cache.get(scaleId);
    if (cached) return cached;

    const scaleAtom = selectAtom(
      resolvedColorSystemDocumentAtom,
      (document): ColorScale | null =>
        document.scales.find((scale) => scale.id === scaleId) ?? null,
    );

    const tokensAtom = atom((get): GeneratedToken[] => {
      const scale = get(scaleAtom);
      if (!scale) return [];
      const contrasts: ContrastToken[] = get(contrastsAtom);
      const settings = get(settingsAtom);
      const background: LinearRgb = get(backgroundLinearAtom);
      return generateColorTokensForScale(
        scale,
        contrasts,
        background,
        settings,
        settings.colorOutput,
        get(rulesAtom),
      );
    });

    cache.set(scaleId, tokensAtom);
    return tokensAtom;
  };
})();

export const generatedColorTokensAtom = atom((get) => [
  ...get(paletteTokensAtom),
  ...get(scaleIdsAtom).flatMap((scaleId) => get(scaleTokensFamily(scaleId))),
]);

export const colorTokenSetAtom = atom((get): TokenSet => {
  const overrides = get(tokenOverridesAtom);
  const edits = get(browserTokenEditsAtom);
  const modes = get(activeModesAtom);
  const modeKey = canonicalTokenModeKey(
    Object.fromEntries(
      get(modeSetsAtom).flatMap((modeSet) => {
        const mode = modes.find((active) =>
          modeSet.modes.some((candidate) => candidate.id === active.id),
        );
        return mode ? [[modeSet.id, mode.id]] : [];
      }),
    ),
  );
  return {
    schemaVersion: TOKEN_SET_SCHEMA_VERSION,
    id: "light",
    name: "light",
    tokens: get(generatedColorTokensAtom).map((generated) =>
      resolveBrowserColorToken(
        resolveToken(generated, overrides[generated.uuid]),
        edits,
        modeKey,
        get(resolvedColorSystemDocumentAtom),
      ),
    ),
  };
});

const hasTokenEditsAtom = atom(
  (get) =>
    Object.keys(get(tokenOverridesAtom)).length > 0 ||
    Object.keys(get(browserTokenEditsAtom)).length > 0,
);
export const overriddenTokenCountAtom = atom((get) =>
  get(hasTokenEditsAtom)
    ? get(colorTokenSetAtom).tokens.filter(
        (token) => token.nameOverridden || token.valueOverridden,
      ).length
    : 0,
);
export const staleTokenCountAtom = atom((get) =>
  get(hasTokenEditsAtom)
    ? get(colorTokenSetAtom).tokens.filter((token) => token.stale).length
    : 0,
);

export interface TokenOverrideStatus {
  uuid: string;
  stale: boolean;
  /** Name/value as generated when the edit was made, for diffing against the override. */
  baselineName: TokenName;
  baselineValue: string;
  /** Name/value the user edited to, if that field was overridden. */
  overrideName?: TokenName;
  overrideValue?: string;
}

/**
 * Override status keyed by `scaleId:contrastId` so the foundations ramps can flag
 * edited tokens without rebuilding the whole token set.
 */
export const overrideStatusBySourceAtom = atom((get) => {
  const statuses = new Map<string, TokenOverrideStatus>();
  const overrides = get(tokenOverridesAtom);
  if (Object.keys(overrides).length === 0) return statuses;

  for (const scaleId of get(scaleIdsAtom)) {
    for (const token of get(scaleTokensFamily(scaleId))) {
      const override = overrides[token.uuid];
      if (!override) continue;
      statuses.set(
        tokenStableKey(token.source.scaleId, token.source.contrastId),
        {
          uuid: token.uuid,
          stale: isStale(override, token),
          baselineName: override.baseline.name,
          baselineValue: override.baseline.value,
          overrideName: override.name,
          overrideValue: override.value,
        },
      );
    }
  }
  return statuses;
});

/** Serializable token data as design-data cascade rows with a mode-set catalog. */
export const colorTokenJsonAtom = atom((get) =>
  JSON.stringify(
    buildCascadeTokenExport({
      taxonomy: get(taxonomyDocumentAtom),
      base: get(colorSystemDocumentAtom),
      modeSets: get(modeSetsAtom),
      activeModes: get(activeModesAtom),
      activeTokens: get(colorTokenSetAtom).tokens,
      overrides: get(tokenOverridesAtom),
      browserEdits: get(browserTokenEditsAtom),
      preview: get(previewOverridesAtom),
      rules: get(rulesAtom),
    }),
    null,
    2,
  ),
);

function generatedByUuid(
  get: (atom: Atom<GeneratedToken[]>) => GeneratedToken[],
) {
  return new Map(
    get(generatedColorTokensAtom).map((token) => [token.uuid, token]),
  );
}

function withoutToken(
  overrides: TokenOverrideMap,
  uuid: string,
): TokenOverrideMap {
  const next = { ...overrides };
  delete next[uuid];
  return next;
}

function withoutField(
  override: TokenOverride,
  field: "name" | "value",
): TokenOverride {
  const next = { ...override };
  delete next[field];
  return next;
}

export const setTokenNameAtom = atom(
  null,
  (get, set, update: { uuid: string; name: TokenName }) => {
    const generated = generatedByUuid(get).get(update.uuid);
    if (!generated) return;
    if (isPaletteToken(generated)) {
      if (!tokenNamesEqual(update.name, generated.name))
        set(updatePaletteColorAtom, {
          id: generated.source.contrastId,
          name: tokenDisplayName(update.name),
        });
      return;
    }
    const overrides = get(tokenOverridesAtom);
    const existing = overrides[update.uuid];

    if (tokenNamesEqual(update.name, generated.name)) {
      if (!existing || existing.value === undefined) {
        set(tokenOverridesAtom, withoutToken(overrides, update.uuid));
        return;
      }
      set(tokenOverridesAtom, {
        ...overrides,
        [update.uuid]: {
          ...withoutField(existing, "name"),
          baseline: { name: generated.name, value: generated.value },
        },
      });
      return;
    }

    set(tokenOverridesAtom, {
      ...overrides,
      [update.uuid]: {
        ...existing,
        name: update.name,
        baseline: { name: generated.name, value: generated.value },
        editedAt: new Date().toISOString(),
      },
    });
  },
);

export const setTokenValueAtom = atom(
  null,
  (get, set, update: { uuid: string; value: string }) => {
    const generated = generatedByUuid(get).get(update.uuid);
    if (!generated) return;
    if (isPaletteToken(generated)) {
      const channels = paletteChannelsFromCss(
        update.value,
        get(outputGamutAtom),
      );
      if (channels && update.value !== generated.value)
        set(updatePaletteColorAtom, {
          id: generated.source.contrastId,
          ...channels,
        });
      return;
    }
    const overrides = get(tokenOverridesAtom);
    const existing = overrides[update.uuid];

    if (update.value === generated.value) {
      if (!existing || existing.name === undefined) {
        set(tokenOverridesAtom, withoutToken(overrides, update.uuid));
        return;
      }
      set(tokenOverridesAtom, {
        ...overrides,
        [update.uuid]: {
          ...withoutField(existing, "value"),
          baseline: { name: generated.name, value: generated.value },
        },
      });
      return;
    }

    set(tokenOverridesAtom, {
      ...overrides,
      [update.uuid]: {
        ...existing,
        value: update.value,
        baseline: { name: generated.name, value: generated.value },
        editedAt: new Date().toISOString(),
      },
    });
  },
);

export const resetTokenAtom = atom(null, (get, set, uuid: string) => {
  const overrides = get(tokenOverridesAtom);
  if (!(uuid in overrides)) return;
  set(tokenOverridesAtom, withoutToken(overrides, uuid));
});

export const resetAllTokenOverridesAtom = atom(null, (_get, set) => {
  set(tokenOverridesAtom, {});
});

/** Drops only the overrides whose foundational source has changed since they were edited. */
export const resetStaleTokenOverridesAtom = atom(null, (get, set) => {
  const overrides = get(tokenOverridesAtom);
  const stale = new Set(
    get(colorTokenSetAtom)
      .tokens.filter((token) => token.stale)
      .map((token) => token.uuid),
  );
  if (stale.size === 0) return;
  set(
    tokenOverridesAtom,
    Object.fromEntries(
      Object.entries(overrides).filter(([uuid]) => !stale.has(uuid)),
    ),
  );
});
