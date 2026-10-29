// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Delete from "@react-spectrum/s2/icons/Delete";
import { useAtomValue } from "jotai";
import { foundationDocumentsAtom } from "../features/modes/foundationDocuments";
import type { Mode } from "../features/modes/model";
import {
  formatParameterValue,
  modeOverridesParameter,
  parametersForFoundations,
  parameterValue,
  type FoundationId,
} from "../features/modes/parameters";

const tableStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
});
const headerStyles = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto",
  gap: 8,
  font: "detail",
  color: "neutral-subdued",
});
const rowStyles = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
  font: "body-sm",
});
const emptyStyles = style({ font: "body-sm", color: "neutral-subdued" });

export function ModeOverridesTable({
  mode,
  foundations,
  onClear,
}: {
  mode: Mode;
  foundations: FoundationId[];
  onClear: (parameterId: string) => void;
}) {
  const document = useAtomValue(foundationDocumentsAtom);
  const rows = parametersForFoundations(foundations).filter((parameter) =>
    modeOverridesParameter(mode, parameter.id),
  );
  const opacities = foundations.includes("elevation")
    ? Object.entries(mode.foundations.elevation?.layerOpacities ?? {})
    : [];
  const dataVis = foundations.includes("color")
    ? [
        {
          id: "color.dataVisSources",
          label: "Data vis sources",
          patches: mode.foundations.color?.dataVisSources,
        },
        {
          id: "color.dataVisContrasts",
          label: "Data vis contrasts",
          patches: mode.foundations.color?.dataVisContrasts,
        },
      ]
        .map((field) => ({
          ...field,
          count: Object.values(field.patches ?? {}).reduce(
            (count, points) => count + Object.keys(points).length,
            0,
          ),
        }))
        .filter((field) => field.count > 0)
    : [];

  if (rows.length === 0 && opacities.length === 0 && dataVis.length === 0) {
    return (
      <p className={emptyStyles}>
        No overrides. Edit global parameters while this mode is selected to add
        one.
      </p>
    );
  }

  return (
    <div
      className={tableStyles}
      role="table"
      aria-label={`${mode.name} overrides`}
    >
      <div className={headerStyles} role="row">
        <span role="columnheader">Global parameter</span>
        <span role="columnheader">Value</span>
        <span role="columnheader">
          <Text slot="description">Actions</Text>
        </span>
      </div>
      {rows.map((parameter) => (
        <div key={parameter.id} className={rowStyles} role="row">
          <span role="cell">{parameter.label}</span>
          <span role="cell">
            {formatParameterValue(
              parameter,
              parameterValue(mode, parameter.id),
              document,
            )}
          </span>
          <span role="cell">
            <ActionButton
              isQuiet
              size="S"
              aria-label={`Remove ${parameter.label} override from ${mode.name}`}
              onPress={() => onClear(parameter.id)}
            >
              <Delete />
            </ActionButton>
          </span>
        </div>
      ))}
      {opacities.map(([id, opacity]) => {
        const label =
          document.elevation?.layers.find((layer) => layer.id === id)?.label ??
          id;
        return (
          <div key={id} className={rowStyles} role="row">
            <span role="cell">{label} opacity</span>
            <span role="cell">{opacity}%</span>
            <span role="cell">
              <ActionButton
                isQuiet
                size="S"
                aria-label={`Remove ${label} opacity override from ${mode.name}`}
                onPress={() => onClear(`elevation.layerOpacities/${id}`)}
              >
                <Delete />
              </ActionButton>
            </span>
          </div>
        );
      })}
      {dataVis.map((field) => (
        <div key={field.id} className={rowStyles} role="row">
          <span role="cell">{field.label}</span>
          <span role="cell">{field.count} control-point overrides</span>
          <span role="cell">
            <ActionButton
              isQuiet
              size="S"
              aria-label={`Remove ${field.label.toLowerCase()} overrides from ${mode.name}`}
              onPress={() => onClear(field.id)}
            >
              <Delete />
            </ActionButton>
          </span>
        </div>
      ))}
    </div>
  );
}
