// Copyright 2026 Adobe. All rights reserved.
import type { AliasAuthoringSource } from "../../tokens/aliasTargets";
import { buildCascadeTokenExport } from "../../tokens/cascadeExport";
import { tokenStableKey, tokenUuid } from "../../tokens/model";
import { dataAttribute, sanitizeTokenName } from "../cssLibrary";
import { contrastStepIndex, scaleContrasts } from "../contrastSteps";
import { isFoundationPublished } from "../../foundations/types";
import { concreteColor } from "./colors";
import { dataVisMemberId } from "./identity";
import { kebabCaseNameFormatter } from "../../taxonomy/formatting";

export function buildDataVisCategoricalCss(
  source: AliasAuthoringSource,
): string {
  const members = new Map(
    source.colorSystem.dataVisScales
      .filter(isFoundationPublished)
      .flatMap((scale) =>
        scale.kind === "categorical"
          ? scale.members.map((member, index) => {
              const id = dataVisMemberId(scale.id, member.id);
              return [
                tokenUuid(`concept:${id}`),
                { id, member, scale, index },
              ] as const;
            })
          : [],
      ),
  );
  if (!members.size)
    return "/* Continuous data vis scales use the separate JavaScript adapter. */";
  const exported = buildCascadeTokenExport({
    base: source.colorSystem,
    modeSets: source.modeSets,
    activeModes: [],
    activeTokens: [],
    overrides: source.tokenOverrides,
    browserEdits: source.browserTokenEdits,
    taxonomy: source.taxonomy,
    rules: source.rules,
  });
  const blocks = new Map<
    string,
    { fields: [string, string][]; declarations: string[]; links: string[] }
  >();
  for (const row of exported.tokens) {
    const entry = members.get(row.conceptId);
    if (!entry) continue;
    if (typeof row.value !== "string")
      throw new Error("Categorical CSS requires concrete color values.");
    concreteColor(row.value);
    const name = exported.taxonomy?.projections[row.uuid]?.name;
    if (!name)
      throw new Error(
        "Categorical CSS requires the authoritative member classification.",
      );
    const fields = source.modeSets.flatMap((axis): [string, string][] => {
      const key = row.name[axis.key];
      return typeof key === "string" ? [[axis.key, key]] : [];
    });
    const selector = `:root${fields.map(([key, value]) => `[${dataAttribute(key)}=${JSON.stringify(value)}]`).join("")}`;
    const block = blocks.get(selector) ?? {
      fields,
      declarations: [],
      links: [],
    };
    block.declarations.push(`  --${name}: ${row.value};`);
    const ui = source.colorSystem.scales.find(
      (scale) => scale.id === entry.member.source.scaleId,
    );
    if (!ui) throw new Error("Categorical CSS is missing a linked UI scale.");
    const uiId = tokenUuid(
      tokenStableKey(ui.id, entry.member.source.contrastId),
    );
    const edited = [uiId, entry.id].some(
      (id) =>
        source.tokenOverrides[id]?.value !== undefined ||
        source.tokenOverrides[id]?.name !== undefined ||
        Object.keys(source.browserTokenEdits[id]?.values ?? {}).length > 0 ||
        source.browserTokenEdits[id]?.name !== undefined ||
        source.taxonomy.classifications[id] !== undefined,
    );
    if (!edited && !entry.scale.staticColors) {
      const step = scaleContrasts(source.colorSystem, ui).findIndex(
        (step) => step.id === entry.member.source.contrastId,
      );
      if (step < 0)
        throw new Error("Categorical CSS is missing a linked UI swatch.");
      const label = kebabCaseNameFormatter.formatValue(
        contrastStepIndex(step, ui, source.rules),
      );
      const uiRoot = exported.tokens.find(
        (candidate) => candidate.uuid === uiId,
      );
      const uiName =
        uiRoot && exported.taxonomy?.projections[uiRoot.uuid]?.name;
      if (!uiName)
        throw new Error("A referenced UI CSS variable is unavailable.");
      const classes = `.data-vis-${sanitizeTokenName(entry.scale.name)}-${entry.index + 1}.color-scale-${sanitizeTokenName(ui.name)}.color-contrast-${label}`;
      block.links.push(
        `${selector} ${classes} {\n  --${name}: var(--${uiName});\n}`,
      );
    }
    blocks.set(selector, block);
  }
  const ordered = [...blocks.entries()].sort(
    ([a, first], [b, second]) =>
      first.fields.length - second.fields.length || a.localeCompare(b),
  );
  return [
    "/* Exact authored-mode categorical values. Continuous functions and fluid controls use data-vis.js.",
    " * Optional .data-vis-* rules reuse existing UI CSS only on elements carrying the matching UI source classes.",
    " * Include the existing UI color library before these optional rules. Manual value edits use scoped literals. */",
    ...ordered.flatMap(([selector, block]) => [
      `${selector} {\n${block.declarations.join("\n")}\n}`,
      ...block.links,
    ]),
  ].join("\n\n");
}
