// Copyright 2026 Adobe. All rights reserved.
import type { RgbGamut } from "../colorMath";
import { colorOklab, concreteColor } from "./colors";
import { MeasurementCache } from "./measurements";
import {
  isCategoricalPreferences,
  type CategoricalPreferences,
  type PaletteStyle,
  type VisionProfile,
} from "./model";
import type { UiSwatch } from "./resolution";

export const AESTHETIC_VERSION = "fixed-token-order-1";
export const SEARCH_BUDGET = {
  startsPerStyle: 6,
  measurements: 32768,
  operations: 200000,
  yieldEvery: 256,
  improvementPasses: 2,
} as const;
export const MAX_CANDIDATE_POOL = 8192;
export const INSPECTION_BUDGET = {
  measurements: 131072,
  operations: 139264,
  yieldEvery: 256,
  displayedFailures: 50,
} as const;

export interface PaletteReport {
  failures: string[];
  failureCount: number;
  minimumDeltaE: number | null;
  pairCount: number;
}

function* paletteChecks(
  members: readonly UiSwatch[],
  preferences: CategoricalPreferences,
  background: string,
  gamut: RgbGamut,
  cache: MeasurementCache,
): Generator<void, PaletteReport> {
  if (!isCategoricalPreferences(preferences))
    throw new Error("The categorical selection targets are invalid.");
  if (!members.length)
    throw new Error("Choose at least one categorical color.");
  if (members.length > MAX_CANDIDATE_POOL)
    throw new Error(
      `The selection exceeds the supported ${MAX_CANDIDATE_POOL}-color limit. No colors were omitted.`,
    );
  concreteColor(background);
  const failures: string[] = [];
  let failureCount = 0;
  const fail = (message: string) => {
    failureCount++;
    if (failures.length < INSPECTION_BUDGET.displayedFailures)
      failures.push(message);
  };
  if (
    preferences.size.kind === "count" &&
    preferences.size.count !== members.length
  ) {
    fail(
      `The selection has ${members.length} colors; the requested count is ${preferences.size.count}.`,
    );
  }
  let minimumDeltaE: number | null = null;
  const profiles: VisionProfile[] = ["normal", ...preferences.cvdProfiles];
  for (const member of members) {
    concreteColor(member.value);
    if (
      cache.backgroundContrast(member.value, background, gamut) <
      preferences.minimumBackgroundContrast
    ) {
      fail(
        `${member.label} does not reach ${preferences.minimumBackgroundContrast}:1 against the UI background.`,
      );
    }
    yield;
  }
  for (let a = 0; a < members.length; a++)
    for (let b = a + 1; b < members.length; b++)
      for (const profile of profiles) {
        const value = cache.pair(
          members[a].value,
          members[b].value,
          background,
          profile,
          gamut,
        ).deltaE;
        minimumDeltaE =
          minimumDeltaE === null ? value : Math.min(minimumDeltaE, value);
        if (value < preferences.minimumDeltaE)
          fail(
            `${members[a].label} and ${members[b].label} are below Delta E ${preferences.minimumDeltaE} (${profile}).`,
          );
        yield;
      }
  return {
    failures,
    failureCount,
    minimumDeltaE,
    pairCount: (members.length * (members.length - 1)) / 2,
  };
}

export function inspectPalette(
  members: readonly UiSwatch[],
  preferences: CategoricalPreferences,
  background: string,
  gamut: RgbGamut = "srgb",
  cache = new MeasurementCache(),
): PaletteReport {
  const checks = paletteChecks(members, preferences, background, gamut, cache);
  for (let step = checks.next(); ; step = checks.next())
    if (step.done) return step.value;
}

export async function inspectPaletteAsync(
  members: readonly UiSwatch[],
  preferences: CategoricalPreferences,
  background: string,
  gamut: RgbGamut = "srgb",
  options: {
    cache?: MeasurementCache;
    signal?: AbortSignal;
    yieldControl?: () => Promise<void>;
    budget?: Partial<{
      measurements: number;
      operations: number;
      yieldEvery: number;
    }>;
  } = {},
): Promise<PaletteReport> {
  const cache = options.cache ?? new MeasurementCache(),
    start = cache.comparisons,
    budget = { ...INSPECTION_BUDGET, ...options.budget };
  const checks = paletteChecks(members, preferences, background, gamut, cache);
  const yieldControl =
    options.yieldControl ??
    (() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  for (let operations = 0; ; operations++) {
    if (options.signal?.aborted)
      throw new Error("The palette inspection was cancelled.");
    if (
      operations > budget.operations ||
      cache.comparisons - start >= budget.measurements
    ) {
      throw new Error(
        "The palette inspection budget was reached. This selection has not been fully checked; choose fewer colors.",
      );
    }
    const step = checks.next();
    if (step.done) return step.value;
    if ((operations + 1) % budget.yieldEvery === 0) await yieldControl();
  }
}

interface PreparedCandidate {
  swatch: UiSwatch;
  lightness: number;
  chroma: number;
  hue: number;
}
export interface PaletteSuggestion {
  style: PaletteStyle;
  sourceIds: string[];
  sizeLabel: "requested count" | "largest found";
  score: number;
  aestheticVersion: typeof AESTHETIC_VERSION;
}
export interface SuggestionResult {
  status:
    | "ready"
    | "empty"
    | "unavailable"
    | "no-result"
    | "budget-exhausted"
    | "cancelled";
  suggestions: PaletteSuggestion[];
  message: string;
  exclusions: { id: string; reason: string }[];
  stats: {
    pool: number;
    eligible: number;
    distinct: number;
    largestFound: number;
    measurements: number;
    operations: number;
    conversions: number;
    cacheHits: number;
  };
}
export interface SuggestionRequest {
  candidates: UiSwatch[];
  preferences: CategoricalPreferences;
  background: string;
  gamut: RgbGamut;
}

class BudgetExhausted extends Error {}
class SearchCancelled extends Error {}

function prepare(
  swatch: UiSwatch,
  cache: MeasurementCache,
  request: SuggestionRequest,
): PreparedCandidate {
  const [l, a, b] = colorOklab(
    cache.color(swatch.value, request.background, "normal", request.gamut),
  );
  return {
    swatch,
    lightness: l,
    chroma: Math.hypot(a, b),
    hue: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
  };
}

function hueDistance(a: PreparedCandidate, b: PreparedCandidate) {
  if (Math.min(a.chroma, b.chroma) < 0.005) return 0;
  const distance = Math.abs(a.hue - b.hue);
  return Math.min(distance, 360 - distance) / 180;
}

export function paletteAestheticScore(
  colors: readonly { lightness: number; chroma: number; hue: number }[],
  style: PaletteStyle,
) {
  if (colors.length < 2) return 0;
  const meanL =
    colors.reduce((sum, color) => sum + color.lightness, 0) / colors.length;
  const meanC =
    colors.reduce((sum, color) => sum + color.chroma, 0) / colors.length;
  const spread =
    colors.reduce(
      (sum, color) =>
        sum +
        Math.abs(color.lightness - meanL) +
        Math.abs(color.chroma - meanC),
      0,
    ) / colors.length;
  const changes =
    colors
      .slice(1)
      .reduce(
        (sum, color, index) =>
          sum +
          Math.abs(color.lightness - colors[index].lightness) +
          Math.abs(color.chroma - colors[index].chroma),
        0,
      ) /
    (colors.length - 1);
  return style === "balanced"
    ? 100 - 35 * spread - 20 * changes
    : 35 * spread + 40 * changes;
}

function orderColors(
  colors: PreparedCandidate[],
  style: PaletteStyle,
): PreparedCandidate[] {
  if (colors.length < 2) return colors;
  const pool = [...colors].sort((a, b) =>
    a.swatch.id.localeCompare(b.swatch.id),
  );
  const ordered = [pool.shift()!];
  while (pool.length) {
    const previous = ordered.at(-1)!;
    const ranked = pool
      .map((color, index) => ({
        index,
        color,
        distance:
          Math.abs(color.lightness - previous.lightness) +
          Math.abs(color.chroma - previous.chroma) +
          hueDistance(color, previous) * 0.25,
      }))
      .sort(
        (a, b) =>
          (style === "bold"
            ? b.distance - a.distance
            : a.distance - b.distance) ||
          a.color.swatch.id.localeCompare(b.color.swatch.id),
      );
    ordered.push(pool.splice(ranked[0].index, 1)[0]);
  }
  return ordered;
}

export async function suggestCategorical(
  request: SuggestionRequest,
  options: {
    signal?: AbortSignal;
    cache?: MeasurementCache;
    yieldControl?: () => Promise<void>;
    budget?: Partial<{
      startsPerStyle: number;
      measurements: number;
      operations: number;
      yieldEvery: number;
      improvementPasses: number;
    }>;
  } = {},
): Promise<SuggestionResult> {
  if (!isCategoricalPreferences(request.preferences))
    throw new Error("The categorical selection targets are invalid.");
  concreteColor(request.background);
  if (request.candidates.length > MAX_CANDIDATE_POOL)
    throw new Error(
      `The ${request.candidates.length}-color pool exceeds the supported ${MAX_CANDIDATE_POOL}-color budget. No colors were silently omitted.`,
    );
  if (
    new Set(request.candidates.map((candidate) => candidate.id)).size !==
    request.candidates.length
  )
    throw new Error("The candidate pool has duplicate source identities.");
  const cache = options.cache ?? new MeasurementCache(),
    budget = { ...SEARCH_BUDGET, ...options.budget };
  const startMeasurements = cache.comparisons,
    startConversions = cache.conversions,
    startHits = cache.hits;
  const yieldControl =
    options.yieldControl ??
    (() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  const exclusions: SuggestionResult["exclusions"] = [],
    suggestions: PaletteSuggestion[] = [];
  let operations = 0,
    eligibleCount = 0,
    distinctCount = 0,
    largestFound = 0;
  const result = (
    status: SuggestionResult["status"],
    message: string,
  ): SuggestionResult => ({
    status,
    message,
    suggestions,
    exclusions,
    stats: {
      pool: request.candidates.length,
      eligible: eligibleCount,
      distinct: distinctCount,
      largestFound,
      measurements: cache.comparisons - startMeasurements,
      operations,
      conversions: cache.conversions - startConversions,
      cacheHits: cache.hits - startHits,
    },
  });
  const tick = async () => {
    if (options.signal?.aborted) throw new SearchCancelled();
    operations++;
    if (
      operations > budget.operations ||
      cache.comparisons - startMeasurements >= budget.measurements
    )
      throw new BudgetExhausted();
    if (operations % budget.yieldEvery === 0) {
      await yieldControl();
      if (options.signal?.aborted) throw new SearchCancelled();
    }
  };
  try {
    const distinct = new Map<string, PreparedCandidate>();
    for (const swatch of [...request.candidates].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      await tick();
      let candidate: PreparedCandidate;
      try {
        candidate = prepare(swatch, cache, request);
      } catch (error) {
        exclusions.push({
          id: swatch.id,
          reason: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      if (
        cache.backgroundContrast(
          swatch.value,
          request.background,
          request.gamut,
        ) < request.preferences.minimumBackgroundContrast
      ) {
        exclusions.push({
          id: swatch.id,
          reason: `Below ${request.preferences.minimumBackgroundContrast}:1 background contrast.`,
        });
        continue;
      }
      eligibleCount++;
      const rendered = cache
        .color(swatch.value, request.background, "normal", request.gamut)
        .to(request.gamut === "display-p3" ? "p3" : "srgb");
      const key = rendered.coords
        .map((value) => value.toPrecision(12))
        .join(",");
      if (!distinct.has(key)) distinct.set(key, candidate);
    }
    const eligible = [...distinct.values()];
    distinctCount = eligible.length;
    if (!request.candidates.length)
      return result(
        "empty",
        "Publish UI color-scale swatches before choosing categorical colors.",
      );
    if (!eligible.length)
      return result(
        exclusions.some((item) => item.reason.includes("concrete"))
          ? "unavailable"
          : "no-result",
        "No suitable source colors are available for the current background and targets. Adjust the targets or edit the UI scales.",
      );
    const size = request.preferences.size;
    if (size.kind === "count" && size.count > eligible.length)
      return result(
        "no-result",
        `The requested ${size.count} colors exceed the ${eligible.length} distinct eligible colors. This is not proof that another context is infeasible.`,
      );
    const profiles: VisionProfile[] = [
      "normal",
      ...request.preferences.cvdProfiles,
    ];
    const distance = async (a: PreparedCandidate, b: PreparedCandidate) => {
      let minimum = Infinity;
      for (const profile of profiles) {
        await tick();
        minimum = Math.min(
          minimum,
          cache.pair(
            a.swatch.value,
            b.swatch.value,
            request.background,
            profile,
            request.gamut,
          ).deltaE,
        );
      }
      return minimum;
    };
    for (const style of ["balanced", "bold"] as const) {
      let best: PreparedCandidate[] = [],
        bestScore = -Infinity;
      for (
        let start = 0;
        start < Math.min(budget.startsPerStyle, eligible.length);
        start++
      ) {
        const selected = [
          eligible[
            Math.floor(
              (start * eligible.length) /
                Math.min(budget.startsPerStyle, eligible.length),
            )
          ],
        ];
        largestFound = Math.max(largestFound, selected.length);
        const remaining = eligible.filter((color) => color !== selected[0]);
        while (
          remaining.length &&
          (size.kind === "auto" || selected.length < size.count)
        ) {
          let bestIndex = -1,
            candidateScore = -Infinity;
          for (let index = 0; index < remaining.length; index++) {
            let minimum = Infinity;
            for (const chosen of selected) {
              minimum = Math.min(
                minimum,
                await distance(remaining[index], chosen),
              );
              if (minimum < request.preferences.minimumDeltaE) break;
            }
            if (minimum < request.preferences.minimumDeltaE) continue;
            const averageL =
              selected.reduce((sum, color) => sum + color.lightness, 0) /
              selected.length;
            const averageC =
              selected.reduce((sum, color) => sum + color.chroma, 0) /
              selected.length;
            const spread =
              Math.abs(remaining[index].lightness - averageL) +
              Math.abs(remaining[index].chroma - averageC);
            const score =
              minimum + (style === "balanced" ? -20 * spread : 20 * spread);
            if (score > candidateScore) {
              candidateScore = score;
              bestIndex = index;
            }
          }
          if (bestIndex < 0) break;
          selected.push(remaining.splice(bestIndex, 1)[0]);
          largestFound = Math.max(largestFound, selected.length);
        }
        if (size.kind === "count" && selected.length !== size.count) continue;
        let ordered = orderColors(selected, style);
        for (let pass = 0; pass < budget.improvementPasses; pass++) {
          for (let index = 1; index < ordered.length - 1; index++) {
            await tick();
            const changed = [...ordered];
            [changed[index], changed[index + 1]] = [
              changed[index + 1],
              changed[index],
            ];
            if (
              paletteAestheticScore(changed, style) >
              paletteAestheticScore(ordered, style)
            )
              ordered = changed;
          }
        }
        const score = paletteAestheticScore(ordered, style);
        if (
          ordered.length > best.length ||
          (ordered.length === best.length && score > bestScore)
        ) {
          best = ordered;
          bestScore = score;
        }
      }
      if (
        best.length &&
        !suggestions.some(
          (suggestion) =>
            JSON.stringify(suggestion.sourceIds) ===
            JSON.stringify(best.map((color) => color.swatch.id)),
        )
      )
        suggestions.push({
          style,
          sourceIds: best.map((color) => color.swatch.id),
          sizeLabel: size.kind === "auto" ? "largest found" : "requested count",
          score: bestScore,
          aestheticVersion: AESTHETIC_VERSION,
        });
    }
    return result(
      suggestions.length ? "ready" : "no-result",
      suggestions.length
        ? "Suggestions meet the current selection targets. Balanced and bold are aesthetic heuristics, not certifications."
        : `No exact requested set was found in the bounded search; the largest set found has ${largestFound} colors. Try a smaller count or adjust the targets; this does not prove infeasibility.`,
    );
  } catch (error) {
    if (error instanceof SearchCancelled)
      return result("cancelled", "The suggestion request was cancelled.");
    if (error instanceof BudgetExhausted)
      return result(
        "budget-exhausted",
        "The search budget was reached. Any listed sets are suitable sets found so far, not proof of a largest possible palette.",
      );
    throw error;
  }
}
