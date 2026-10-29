// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../model";
import type { ModeSet } from "../../modes/model";
import {
  applyDataVisPointPatch,
  type DataVisPoint,
  type DataVisSourcePatch,
  type UiSwatchSource,
  type PrimitiveColorSource,
} from "./model";
import { dataVisModeOwnershipIssues } from "./patches";
import { primitiveColorIdentities } from "./primitiveColors";
import { tokenStableKey, tokenUuid } from "../../tokens/model";

export interface DataVisConsumer {
  scaleId: string;
  scaleName: string;
  inputId: string;
  inputLabel: string;
  source:
    | UiSwatchSource
    | PrimitiveColorSource
    | { kind: "ui-scale"; scaleId: string };
  modeId?: string;
  modeName?: string;
}

function pointConsumer(
  scaleId: string,
  scaleName: string,
  point: DataVisPoint,
): DataVisConsumer[] {
  if (point.source.kind === "key-color") return [];
  return [
    {
      scaleId,
      scaleName,
      inputId: point.id,
      inputLabel: `${Math.round(point.position * 100)}% point`,
      source: point.source,
    },
  ];
}

export function dataVisConsumers(
  document: ColorSystemDocument,
  modeSets: readonly ModeSet[] = [],
): DataVisConsumer[] {
  return document.dataVisScales.flatMap((scale): DataVisConsumer[] => {
    const captured: DataVisConsumer[] = (scale.staticColors ?? []).flatMap(
      (color) =>
        color.tokenId
          ? [
              {
                scaleId: scale.id,
                scaleName: scale.name,
                inputId: color.id,
                inputLabel: "Static color",
                source: { kind: "primitive-token", tokenId: color.tokenId },
              },
            ]
          : [],
    );
    if (scale.kind === "categorical") {
      return [
        ...captured,
        ...scale.members.map((member, index) => ({
          scaleId: scale.id,
          scaleName: scale.name,
          inputId: member.id,
          inputLabel: `Color ${index + 1}`,
          source: member.source,
        })),
      ];
    }
    return [
      ...captured,
      ...scale.points.flatMap((point) =>
        pointConsumer(scale.id, scale.name, point),
      ),
      ...modeSets.flatMap((set) =>
        set.modes.flatMap((mode) => {
          const patches = mode.foundations.color?.dataVisSources?.[scale.id];
          if (!patches || mode.id === set.defaultModeId) return [];
          return scale.points.flatMap((point) =>
            !patches[point.id] ||
            !compatibleSourcePatch(point, patches[point.id])
              ? []
              : pointConsumer(
                  scale.id,
                  scale.name,
                  applyDataVisPointPatch(point, patches[point.id]),
                ).map((consumer) => ({
                  ...consumer,
                  modeId: mode.id,
                  modeName: mode.name,
                })),
          );
        }),
      ),
    ];
  });
}

export function dataVisSourceIssues(
  document: ColorSystemDocument,
  modeSets: readonly ModeSet[] = [],
): string[] {
  const issues = dataVisModeOwnershipIssues(modeSets);
  const primitives = new Map(
    primitiveColorIdentities(document).map((color) => [color.id, color]),
  );
  for (const consumer of dataVisConsumers(document, modeSets)) {
    const source = consumer.source;
    const prefix = `${consumer.scaleName}, ${consumer.inputLabel}${consumer.modeName ? ` (${consumer.modeName})` : ""}`;
    if (source.kind === "primitive-token") {
      const color = primitives.get(source.tokenId);
      if (!color || color.hidden)
        issues.push(
          `${prefix}: primitive color ${source.tokenId} is unavailable or unpublished. Choose a replacement color.`,
        );
      continue;
    }
    const uiScale = document.scales.find(
      (scale) => scale.id === source.scaleId,
    );
    if (!uiScale)
      issues.push(
        `${prefix}: linked UI scale ${source.scaleId} is unavailable.`,
      );
    else if (source.kind === "ui-swatch") {
      if (
        !(uiScale.customContrasts?.steps ?? document.contrasts).some(
          (step) => step.id === source.contrastId,
        )
      ) {
        issues.push(
          `${prefix}: linked UI swatch ${source.contrastId} is unavailable.`,
        );
      }
      if (uiScale.hideFromPublishing)
        issues.push(
          `${prefix}: its linked UI swatch is hidden from publishing.`,
        );
    }
  }
  for (const set of modeSets)
    for (const mode of set.modes) {
      for (const [scaleId, patches] of Object.entries(
        mode.foundations.color?.dataVisSources ?? {},
      )) {
        const scale = document.dataVisScales.find(
          (candidate) => candidate.id === scaleId,
        );
        for (const [pointId, patch] of Object.entries(patches)) {
          const point =
            scale?.kind !== "categorical"
              ? scale?.points.find((candidate) => candidate.id === pointId)
              : undefined;
          if (!point)
            issues.push(
              `${mode.name}: data vis source override ${scaleId}/${pointId} is unavailable.`,
            );
          else validateSourcePatch(point, patch, issues, mode.name);
        }
      }
      for (const [scaleId, patches] of Object.entries(
        mode.foundations.color?.dataVisContrasts ?? {},
      )) {
        const scale = document.dataVisScales.find(
          (candidate) => candidate.id === scaleId,
        );
        for (const pointId of Object.keys(patches)) {
          const point =
            scale?.kind !== "categorical"
              ? scale?.points.find((candidate) => candidate.id === pointId)
              : undefined;
          if (!point?.contrast)
            issues.push(
              `${mode.name}: data vis contrast override ${scaleId}/${pointId} has no owned point.`,
            );
        }
      }
    }
  return issues;
}

function validateSourcePatch(
  point: DataVisPoint,
  patch: DataVisSourcePatch,
  issues: string[],
  modeName: string,
) {
  if (!compatibleSourcePatch(point, patch)) {
    issues.push(
      `${modeName}: source patch for ${point.id} changes its source kind.`,
    );
  }
}

function compatibleSourcePatch(point: DataVisPoint, patch: DataVisSourcePatch) {
  if (point.source.kind === "ui-swatch" && patch.tokenId !== undefined) {
    return (
      patch.color === undefined &&
      patch.scaleId === undefined &&
      patch.contrastId === undefined
    );
  }
  return !(
    (point.source.kind === "key-color" &&
      (patch.scaleId !== undefined ||
        patch.contrastId !== undefined ||
        patch.tokenId !== undefined)) ||
    (point.source.kind !== "key-color" && patch.color !== undefined) ||
    (point.source.kind !== "primitive-token" && patch.tokenId !== undefined) ||
    (point.source.kind === "primitive-token" &&
      (patch.scaleId !== undefined || patch.contrastId !== undefined)) ||
    (point.source.kind === "ui-scale" && patch.contrastId !== undefined)
  );
}

export function blockedUiSourceRemoval(
  document: ColorSystemDocument,
  modeSets: readonly ModeSet[],
  scaleId: string,
  contrastId?: string,
): string | null {
  const tokenIds = new Set(
    contrastId === undefined
      ? primitiveColorIdentities(document)
          .filter(
            (color) =>
              color.origin.kind === "ui-swatch" &&
              color.origin.scaleId === scaleId,
          )
          .map((color) => color.id)
      : [tokenUuid(tokenStableKey(scaleId, contrastId))],
  );
  const consumers = dataVisConsumers(document, modeSets).filter((consumer) => {
    if (consumer.source.kind === "primitive-token")
      return tokenIds.has(consumer.source.tokenId);
    return (
      consumer.source.scaleId === scaleId &&
      (contrastId === undefined ||
        (consumer.source.kind === "ui-swatch" &&
          consumer.source.contrastId === contrastId))
    );
  });
  return consumers.length
    ? `Choose replacement colors first. Used by ${consumers
        .map(
          (consumer) =>
            `${consumer.scaleName} (${consumer.inputLabel}${consumer.modeName ? `, ${consumer.modeName}` : ""})`,
        )
        .join("; ")}.`
    : null;
}

export function assertNoDataVisSourceLoss(
  previous: ColorSystemDocument,
  next: ColorSystemDocument,
  sets: readonly ModeSet[],
) {
  const published = new Set(
    primitiveColorIdentities(next)
      .filter((color) => !color.hidden)
      .map((color) => color.id),
  );
  for (const consumer of dataVisConsumers(next, sets))
    if (
      consumer.source.kind === "primitive-token" &&
      !published.has(consumer.source.tokenId)
    ) {
      throw new Error(
        `Choose replacement colors first. ${consumer.scaleName} (${consumer.inputLabel}) uses an unavailable or unpublished primitive color.`,
      );
    }
  for (const old of previous.scales) {
    const current = next.scales.find((scale) => scale.id === old.id);
    if (!current) {
      const issue = blockedUiSourceRemoval(next, sets, old.id);
      if (issue) throw new Error(issue);
      continue;
    }
    const remaining = new Set(
      (current.customContrasts?.steps ?? next.contrasts).map((step) => step.id),
    );
    for (const step of old.customContrasts?.steps ?? previous.contrasts) {
      if (
        remaining.has(step.id) &&
        (!current.hideFromPublishing || old.hideFromPublishing)
      )
        continue;
      const issue = blockedUiSourceRemoval(next, sets, old.id, step.id);
      if (issue) throw new Error(issue);
    }
  }
}
