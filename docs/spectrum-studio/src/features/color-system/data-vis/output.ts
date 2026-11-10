// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../model";
import { isFoundationPublished } from "../../foundations/types";
import { governedDataVisContext } from "../../taxonomy/colorGovernance";
import {
  projectClassification,
  type TaxonomyDocument,
} from "../../taxonomy/model";
import type { BrowserTokenSource } from "../../tokens/browserModel";
import type { UiSwatch } from "./resolution";
import { categoricalMemberSources } from "./categoricalValues";

export function categoricalBrowserSources(
  document: ColorSystemDocument,
  swatches: readonly UiSwatch[],
  taxonomy: TaxonomyDocument,
  { includeUnpublished = false }: { includeUnpublished?: boolean } = {},
): BrowserTokenSource[] {
  return document.dataVisScales.flatMap((scale) => {
    if (
      scale.kind !== "categorical" ||
      (!includeUnpublished && !isFoundationPublished(scale))
    )
      return [];
    return categoricalMemberSources(
      scale,
      swatches,
      document.settings.colorOutput,
    ).map((token, index) => {
      const member = scale.members[index];
      const taxonomySource = governedDataVisContext(
        document,
        taxonomy,
        scale.id,
        member.id,
      );
      const projection = projectClassification(
        taxonomy,
        taxonomySource.governed,
        "colors",
      );
      if (projection.issues.length)
        throw new Error(projection.issues.join(" "));
      return {
        ...token,
        name: projection.name,
        generatedName: projection.name,
        taxonomySource,
        taxonomyEvidence: {
          property: "color",
          colorName: scale.name,
          number: index + 1,
        },
      };
    });
  });
}
