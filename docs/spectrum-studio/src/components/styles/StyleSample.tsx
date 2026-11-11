// Copyright 2026 Adobe. All rights reserved.
import { ValuePreview } from "../value-preview/ValuePreview";
import { stylePreview } from "../../features/styles/preview";
import type { StyleRecipe } from "../../features/styles/model";
import type { StyleRow } from "../../features/styles/generation";
import type { RgbGamut } from "../../features/color-system/colorMath";
import { useIconSample } from "../../features/icons/useIconSample";
import type { SpectrumIconName } from "../../features/icons/spectrumIconCatalog.generated";

export function StyleSample({
  recipe,
  rows,
  surface,
  gamut,
  icon = "Star",
  label,
  large = false,
  sampleText,
}: {
  recipe: StyleRecipe;
  rows: StyleRow[];
  surface: string;
  gamut: RgbGamut;
  icon?: SpectrumIconName;
  label: string;
  large?: boolean;
  sampleText?: string;
}) {
  const sample = useIconSample(icon, recipe.kind === "icon");
  let preview: ReturnType<typeof stylePreview>;
  try {
    preview = stylePreview(recipe, rows, surface, gamut);
  } catch (failure) {
    return (
      <ValuePreview
        label={label}
        preview={{
          kind: "unavailable",
          message: failure instanceof Error ? failure.message : String(failure),
        }}
      />
    );
  }
  if (recipe.kind === "icon" && sample.status !== "ready")
    return (
      <ValuePreview
        label={label}
        preview={{
          kind: "unavailable",
          message: sample.status === "error" ? sample.message : "Loading icon",
        }}
      />
    );
  return (
    <ValuePreview
      {...preview}
      label={label}
      large={large}
      compact={!large}
      sampleText={recipe.kind === "text" ? sampleText : undefined}
      icon={sample.status === "ready" ? <sample.Icon /> : undefined}
    />
  );
}
