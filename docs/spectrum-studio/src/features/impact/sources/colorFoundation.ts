// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  CONTRAST_FIELDS,
  PALETTE_FIELDS,
  SURFACE_FIELDS,
  colorSettingsPair,
  defaultColorDocument,
} from "../../changelog/changes";
import type { ColorSystemDocument } from "../../color-system/model";
import { colorSystemDocumentAtom } from "../../color-system/state";
import type { DataVisScale } from "../../color-system/data-vis/model";
import type {
  FoundationImpactSource,
  FoundationParameterRecord,
} from "../model";

function same(before: unknown, after: unknown) {
  return JSON.stringify(before) === JSON.stringify(after);
}

function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function objectParameters<T extends { id: string }>(
  prefix: string,
  defaults: T[],
  current: T[],
  fields: string[],
): FoundationParameterRecord[] {
  const before = byId(defaults);
  const after = byId(current);
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((id) =>
    fields.map((field) => {
      const old = before.get(id) as Record<string, unknown> | undefined;
      const next = after.get(id) as Record<string, unknown> | undefined;
      return {
        id: `${prefix}/${id}/${field}`,
        category: "color" as const,
        edited: !old || !next || !same(old[field], next[field]),
      };
    }),
  );
}

function dataVisParameters(
  defaults: DataVisScale[],
  current: DataVisScale[],
): FoundationParameterRecord[] {
  const before = byId(defaults),
    after = byId(current);
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((id) => {
    const old = before.get(id),
      next = after.get(id);
    const prefix = `data-vis/${id}`;
    const staticBefore = byId(old?.staticColors ?? []),
      staticAfter = byId(next?.staticColors ?? []);
    const records: FoundationParameterRecord[] = [
      {
        id: `${prefix}/name`,
        category: "color",
        edited: !old || !next || old.name !== next.name,
      },
      {
        id: `${prefix}/publishing`,
        category: "color",
        edited:
          !old ||
          !next ||
          (old.hideFromPublishing === true) !==
            (next.hideFromPublishing === true),
      },
      {
        id: `${prefix}/static`,
        category: "color",
        edited: !old || !next || !!old.staticColors !== !!next.staticColors,
      },
      ...[...new Set([...staticBefore.keys(), ...staticAfter.keys()])].map(
        (colorId) => ({
          id: `${prefix}/static/${colorId}`,
          category: "color" as const,
          edited: !same(staticBefore.get(colorId), staticAfter.get(colorId)),
        }),
      ),
    ];
    if (old?.kind === "categorical" || next?.kind === "categorical") {
      const oldCategory = old?.kind === "categorical" ? old : undefined;
      const nextCategory = next?.kind === "categorical" ? next : undefined;
      const membersBefore = byId(oldCategory?.members ?? []),
        membersAfter = byId(nextCategory?.members ?? []);
      records.push(
        {
          id: `${prefix}/order`,
          category: "color",
          edited: !same(
            oldCategory?.members.map((member) => member.id),
            nextCategory?.members.map((member) => member.id),
          ),
        },
        ...[...new Set([...membersBefore.keys(), ...membersAfter.keys()])].map(
          (memberId) => ({
            id: `${prefix}/member/${memberId}`,
            category: "color" as const,
            edited: !same(
              membersBefore.get(memberId),
              membersAfter.get(memberId),
            ),
          }),
        ),
        ...objectParameters(
          prefix,
          oldCategory
            ? [{ id: "preferences", ...oldCategory.preferences }]
            : [],
          nextCategory
            ? [{ id: "preferences", ...nextCategory.preferences }]
            : [],
          Object.keys(
            oldCategory?.preferences ?? nextCategory?.preferences ?? {},
          ),
        ),
      );
    } else {
      const pointsBefore = byId(old?.points ?? []),
        pointsAfter = byId(next?.points ?? []);
      for (const pointId of new Set([
        ...pointsBefore.keys(),
        ...pointsAfter.keys(),
      ])) {
        const beforePoint = pointsBefore.get(pointId),
          afterPoint = pointsAfter.get(pointId);
        const fields = [
          "source",
          "position",
          ...(beforePoint?.contrast || afterPoint?.contrast
            ? (["contrast"] as const)
            : []),
        ] as const;
        records.push(
          ...fields.map((key) => ({
            id: `${prefix}/point/${pointId}/${key}`,
            category: "color" as const,
            edited: !same(beforePoint?.[key], afterPoint?.[key]),
          })),
        );
      }
    }
    return records;
  });
}

/** Every scale name and stop, palette color, contrast value, surface field, and color setting counts as one parameter. */
export function colorFoundationParameters(
  document: ColorSystemDocument,
): FoundationParameterRecord[] {
  const defaults = defaultColorDocument;
  const before = byId(defaults.scales);
  const after = byId(document.scales);
  const scales = [...new Set([...before.keys(), ...after.keys()])].flatMap(
    (id) => {
      const old = before.get(id);
      const next = after.get(id);
      const stopCount = Math.max(
        old?.stops.length ?? 0,
        next?.stops.length ?? 0,
      );
      return [
        {
          id: `scale/${id}/name`,
          category: "color" as const,
          edited: !old || !next || old.name !== next.name,
        },
        {
          id: `scale/${id}/hideFromPublishing`,
          category: "color" as const,
          edited:
            !old ||
            !next ||
            (old.hideFromPublishing === true) !==
              (next.hideFromPublishing === true),
        },
        ...(old?.customContrasts || next?.customContrasts
          ? [
              {
                id: `scale/${id}/customContrasts`,
                category: "color" as const,
                edited: !same(old?.customContrasts, next?.customContrasts),
              },
            ]
          : []),
        ...Array.from({ length: stopCount }, (_, index) => ({
          id: `scale/${id}/stop/${index}`,
          category: "color" as const,
          edited: !same(old?.stops[index], next?.stops[index]),
        })),
      ];
    },
  );
  const settings = colorSettingsPair(document);
  return [
    ...scales,
    ...dataVisParameters(defaults.dataVisScales, document.dataVisScales),
    ...objectParameters(
      "palette",
      defaults.palette,
      document.palette,
      PALETTE_FIELDS,
    ),
    ...objectParameters(
      "contrast",
      defaults.contrasts,
      document.contrasts,
      CONTRAST_FIELDS,
    ),
    ...objectParameters(
      "surface",
      defaults.surfaces,
      document.surfaces,
      SURFACE_FIELDS,
    ),
    ...settings.keys.map((key) => ({
      id: `settings/${key}`,
      category: "color" as const,
      edited: !same(settings.before[key], settings.after[key]),
    })),
  ];
}

export const colorFoundationSource: FoundationImpactSource = {
  id: "color-foundation",
  recordsAtom: atom((get) =>
    colorFoundationParameters(get(colorSystemDocumentAtom)),
  ),
};
