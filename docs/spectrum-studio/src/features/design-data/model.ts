// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../color-system/model";
import type { TypographyDocument } from "../typography/model";
import type { SpacingDocument } from "../spacing/model";
import type { SizeDocument } from "../size/model";
import type { RadiusDocument } from "../radius/model";
import type { ElevationDocument } from "../elevation/model";
import type { CanonicalRadiusDocument } from "../taxonomy/naming";
import type { ModeSet, AdaptiveClaims } from "../modes/model";
import type { Platform } from "../platforms/model";
import type { TokenOverrideMap } from "../tokens/model";
import type { Rule } from "../logic/model";
import type { Interpolation } from "../scales/interpolationDefinition";
import type { ScaleType } from "../scales/scaleType";
import type { TaxonomyDocument } from "../taxonomy/model";
import type { StructuresDocument } from "../structures/model";
import type { AliasDocument } from "../tokens/aliases";
import type { ComponentsDocument } from "../components/model";
import type { BrowserTokenEdits } from "../tokens/browserEditTypes";
import type {
  CanonicalColorDocument,
  CanonicalSpacingDocument,
  CanonicalSizeDocument,
  CanonicalTypographyDocument,
} from "../taxonomy/naming";

export interface DesignSystemDataset {
  $schema: string;
  schemaVersion: 1;
  dataset: { id: string; name: string; description: string; revision: number };
  system: {
    components?: ComponentsDocument;
    aliases?: AliasDocument;
    browserTokenEdits?: BrowserTokenEdits;
    taxonomy?: TaxonomyDocument;
    structures: StructuresDocument;
    foundations: {
      color: ColorSystemDocument;
      typography: TypographyDocument;
      spacing: SpacingDocument;
      size: SizeDocument;
      radius: RadiusDocument;
      elevation: ElevationDocument;
    };
    modeSets: ModeSet[];
    platforms: Platform[];
    adaptiveClaims: AdaptiveClaims;
    tokenOverrides: TokenOverrideMap;
    rules: Rule[];
    interpolations: Interpolation[];
  };
  authoringDefaults: Record<string, never>;
}

export interface CompleteDesignSystemDataset extends DesignSystemDataset {
  system: DesignSystemDataset["system"] & {
    scaleTypes: ScaleType[];
    taxonomy: TaxonomyDocument;
  };
}

export type AuthoringDataset =
  | DesignSystemDataset
  | CompleteDesignSystemDataset;

export interface CanonicalDesignSystemDataset extends Omit<
  DesignSystemDataset,
  "system"
> {
  system: Omit<DesignSystemDataset["system"], "foundations" | "taxonomy"> & {
    taxonomy: TaxonomyDocument;
    foundations: {
      color: CanonicalColorDocument;
      typography: CanonicalTypographyDocument;
      spacing: CanonicalSpacingDocument;
      size: CanonicalSizeDocument;
      radius: CanonicalRadiusDocument;
      elevation: ElevationDocument;
    };
  };
}

export interface CompleteCanonicalDesignSystemDataset extends CanonicalDesignSystemDataset {
  system: CanonicalDesignSystemDataset["system"] & { scaleTypes: ScaleType[] };
}

export type CanonicalAuthoringDataset =
  | CanonicalDesignSystemDataset
  | CompleteCanonicalDesignSystemDataset;
