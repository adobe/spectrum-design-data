// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { colorSystemDocumentAtom } from "../color-system/state";
import { spacingDocumentAtom } from "../spacing/state";
import { sizeDocumentAtom } from "../size/state";
import { radiusDocumentAtom } from "../radius/state";
import { elevationDocumentAtom } from "../elevation/state";
import { editModeAtom } from "../../state/view/editMode";
import { taxonomyDocumentAtom } from "./state";
import {
  taxonomyColorSourceId,
  taxonomyPaletteSourceId,
  taxonomySurfaceSourceId,
} from "./model";
import {
  assertRegisteredSourceNames,
  registeredSourceName,
  selectSourceName,
} from "./naming";
import { typographyDocumentAtom } from "../typography/state";
import { typographyTokenGroups } from "../typography/typographyTokens";
import { dataVisSourceId } from "../color-system/data-vis/identity";

export const taxonomyFoundationSourcesAtom = atom((get) => [
  ...get(colorSystemDocumentAtom).palette.map((source) => ({
    ...source,
    id: taxonomyPaletteSourceId(source.id),
    scope: "colors" as const,
  })),
  ...get(colorSystemDocumentAtom).scales.map((source) => ({
    ...source,
    id: taxonomyColorSourceId(source.id),
    scope: "colors" as const,
  })),
  ...get(colorSystemDocumentAtom).surfaces.map((source) => ({
    ...source,
    id: taxonomySurfaceSourceId(source.id),
    scope: "colors" as const,
  })),
  ...get(colorSystemDocumentAtom).dataVisScales.map((source) => ({
    ...source,
    id: dataVisSourceId(source.id),
    scope: "colors" as const,
  })),
  ...get(spacingDocumentAtom).scales.map((source) => ({
    ...source,
    id: `spacing:${source.id}`,
    scope: "spacing" as const,
  })),
  ...get(sizeDocumentAtom).scales.map((source) => ({
    ...source,
    id: `size:${source.id}`,
    scope: "size" as const,
  })),
  ...get(radiusDocumentAtom).scales.map((source) => ({
    ...source,
    id: `radius:${source.id}`,
    scope: "radius" as const,
  })),
  {
    id: `elevation:${get(elevationDocumentAtom).id}`,
    name: registeredSourceName(
      get(taxonomyDocumentAtom),
      get(elevationDocumentAtom).name,
      "elevation",
    ),
    nameRef: get(elevationDocumentAtom).name,
    scope: "elevation" as const,
  },
  ...typographyTokenGroups(get(typographyDocumentAtom)).map((group) => {
    const nameRef = get(typographyDocumentAtom).metricNames?.[group.id];
    if (!nameRef)
      throw new Error(`Typography metric ${group.id} has no registered name.`);
    return {
      id: `typography:${group.id}`,
      name: registeredSourceName(
        get(taxonomyDocumentAtom),
        nameRef,
        "typography",
      ),
      nameRef,
      scope: "typography" as const,
      ...(group.measurement && { measurement: group.measurement }),
    };
  }),
]);

export const editFoundationNameAtom = atom(
  null,
  (get, set, input: { id: string; value?: string; termId?: string }) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change foundation names.");
    const source = get(taxonomyFoundationSourcesAtom).find(
      (source) => source.id === input.id,
    );
    if (!source?.nameRef)
      throw new Error("This source has no registered name reference.");
    const reference = input.termId
      ? selectSourceName(source.nameRef, input.termId)
      : source.nameRef;
    const value = input.termId
      ? registeredSourceName(get(taxonomyDocumentAtom), reference, source.scope)
      : input.value?.trim();
    if (!value) throw new Error("Enter a source name.");
    if (source.scope === "elevation") {
      if (input.termId)
        set(elevationDocumentAtom, {
          ...get(elevationDocumentAtom),
          name: reference,
        });
      else
        set(taxonomyDocumentAtom, {
          ...get(taxonomyDocumentAtom),
          terms: get(taxonomyDocumentAtom).terms.map((term) =>
            term.id === reference.termId ? { ...term, value } : term,
          ),
        });
      return;
    }
    const colors = get(colorSystemDocumentAtom);
    const matchesColor =
      colors.palette.some(
        (row) => taxonomyPaletteSourceId(row.id) === input.id,
      ) ||
      colors.scales.some((row) => taxonomyColorSourceId(row.id) === input.id) ||
      colors.surfaces.some(
        (row) => taxonomySurfaceSourceId(row.id) === input.id,
      ) ||
      colors.dataVisScales.some((row) => dataVisSourceId(row.id) === input.id);
    if (matchesColor) {
      set(colorSystemDocumentAtom, {
        ...colors,
        palette: colors.palette.map((row) =>
          taxonomyPaletteSourceId(row.id) === input.id
            ? { ...row, name: value, nameRef: reference }
            : row,
        ),
        scales: colors.scales.map((row) =>
          taxonomyColorSourceId(row.id) === input.id
            ? { ...row, name: value, nameRef: reference }
            : row,
        ),
        surfaces: colors.surfaces.map((row) =>
          taxonomySurfaceSourceId(row.id) === input.id
            ? { ...row, name: value, nameRef: reference }
            : row,
        ),
        dataVisScales: colors.dataVisScales.map((row) =>
          dataVisSourceId(row.id) === input.id
            ? { ...row, name: value, nameRef: reference }
            : row,
        ),
      });
      return;
    }
    for (const scope of ["spacing", "size", "radius"] as const) {
      const document =
        scope === "spacing"
          ? get(spacingDocumentAtom)
          : scope === "size"
            ? get(sizeDocumentAtom)
            : get(radiusDocumentAtom);
      if (!document.scales.some((row) => `${scope}:${row.id}` === input.id))
        continue;
      const next = {
        ...document,
        scales: document.scales.map((row) =>
          `${scope}:${row.id}` === input.id
            ? { ...row, name: value, nameRef: reference }
            : row,
        ),
      };
      if (scope === "spacing")
        set(spacingDocumentAtom, {
          ...next,
          schemaVersion: get(spacingDocumentAtom).schemaVersion,
        });
      else if (scope === "size")
        set(sizeDocumentAtom, {
          ...next,
          schemaVersion: get(sizeDocumentAtom).schemaVersion,
        });
      else
        set(radiusDocumentAtom, {
          ...next,
          schemaVersion: get(radiusDocumentAtom).schemaVersion,
        });
      return;
    }
    const typography = get(typographyDocumentAtom);
    const metric = typographyTokenGroups(typography).find(
      (group) => `typography:${group.id}` === input.id,
    );
    if (!metric) throw new Error("This foundation source no longer exists.");
    const current = get(taxonomyDocumentAtom);
    const nextRegistry = input.termId
      ? current
      : {
          ...current,
          terms: current.terms.map((term) =>
            term.id === reference.termId ? { ...term, value } : term,
          ),
        };
    assertRegisteredSourceNames(
      typographyTokenGroups(typography).map((group) => ({
        id: group.id,
        name: group.id,
        nameRef:
          group.id === metric.id
            ? reference
            : typography.metricNames?.[group.id],
      })),
      nextRegistry,
      "typography",
    );
    if (input.termId) {
      set(typographyDocumentAtom, {
        ...typography,
        metricNames: { ...typography.metricNames, [metric.id]: reference },
      });
    } else {
      const taxonomy = get(taxonomyDocumentAtom);
      set(taxonomyDocumentAtom, {
        ...taxonomy,
        terms: taxonomy.terms.map((term) =>
          term.id === reference.termId ? { ...term, value } : term,
        ),
      });
    }
  },
);
