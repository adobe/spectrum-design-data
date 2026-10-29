// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../model";
import { isFoundationPublished } from "../../foundations/types";
import { governedDataVisContext } from "../../taxonomy/colorGovernance";
import {
  projectClassification,
  type TaxonomyDocument,
} from "../../taxonomy/model";
import type { BrowserTokenSource } from "../../tokens/browserModel";
import { dataVisMemberId } from "./identity";
import type { UiSwatch } from "./resolution";
import { categoricalMemberValue } from "./categoricalValues";

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
    return scale.members.map((member, index) => {
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
      let value = "",
        generatedValue = "",
        overridden = false,
        validationError: string | undefined;
      try {
        ({ value, generatedValue, overridden } = categoricalMemberValue(
          scale,
          member.id,
          swatches,
          document.settings.colorOutput,
        ));
      } catch (error) {
        validationError =
          error instanceof Error ? error.message : String(error);
      }
      return {
        id: dataVisMemberId(scale.id, member.id),
        type: "colors" as const,
        groupId: scale.id,
        groupLabel: scale.name,
        name: projection.name,
        generatedName: projection.name,
        value,
        generatedValue,
        unit: "" as const,
        legacyOverridden: overridden,
        taxonomySource,
        taxonomyEvidence: {
          property: "color",
          colorName: scale.name,
          number: index + 1,
        },
        dataVis: {
          scaleId: scale.id,
          memberId: member.id,
          ordinal: index + 1,
          source: member.source,
          hidden: !isFoundationPublished(scale),
          static: !!scale.staticColors,
        },
        ...(validationError && { validationError }),
      };
    });
  });
}
