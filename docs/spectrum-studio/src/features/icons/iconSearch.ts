// Copyright 2026 Adobe. All rights reserved.
import {
  spectrumIconLoaders,
  type SpectrumIconName,
} from "./spectrumIconCatalog.generated";

export interface SpectrumIconOption {
  id: SpectrumIconName;
  label: string;
}

/** Turns `ChevronDownSmall` into `Chevron Down Small`. */
export function spectrumIconLabel(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

/** Every bundled Spectrum icon with a readable label, in catalog order. */
export const SPECTRUM_ICON_OPTIONS: readonly SpectrumIconOption[] = (
  Object.keys(spectrumIconLoaders) as SpectrumIconName[]
).map((id) => ({ id, label: spectrumIconLabel(id) }));

const compact = (text: string) => text.toLowerCase().replace(/[\s_-]+/g, "");

/** Icons whose name contains the query, ignoring case, spaces, hyphens and underscores. */
export function filterSpectrumIcons(
  options: readonly SpectrumIconOption[],
  query: string,
): readonly SpectrumIconOption[] {
  const needle = compact(query.trim());
  return needle
    ? options.filter((option) => compact(option.id).includes(needle))
    : options;
}
