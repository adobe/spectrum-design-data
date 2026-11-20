// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { designSystemDefaults } from "../../data/defaults";
import {
  authoringSourceSnapshotAtom,
  editSessionSnapshotAtom,
  type EditSessionSnapshot,
} from "../edit-session/state";
import { RULE_DEFAULTS } from "../logic/library";
import { EMPTY_STYLES } from "../styles/model";
import {
  buildIndexSkillSource,
  renderSkill,
  type GeneratedSkill,
  type SkillDiagnostic,
  type SkillSource,
  type SkillSystem,
} from "./agentSkills";
import { buildColorSkillSource } from "./agentSkillsColor";
import { createZip } from "./zipArchive";

export function skillSystemFromSnapshot(
  snapshot: EditSessionSnapshot,
): SkillSystem {
  return {
    taxonomy: snapshot.taxonomy ?? designSystemDefaults.system.taxonomy,
    colorSystem: snapshot.colorSystem,
    styles: snapshot.styles ?? EMPTY_STYLES,
    rules: snapshot.rules ?? RULE_DEFAULTS,
    modeSets: snapshot.modeSets,
    adaptiveClaims: snapshot.adaptiveClaims,
  };
}

function uniqueDiagnostics(source: SkillSource): SkillSource {
  const seen = new Set<string>();
  const diagnostics: SkillDiagnostic[] = [];
  for (const diagnostic of source.diagnostics) {
    const key = JSON.stringify([diagnostic.subject, diagnostic.message]);
    if (seen.has(key)) continue;
    seen.add(key);
    diagnostics.push(diagnostic);
  }
  return { ...source, diagnostics };
}

/** The index skill first, then one skill per area, in a fixed order. */
export function generateAgentSkills(system: SkillSystem): GeneratedSkill[] {
  const areas = [uniqueDiagnostics(buildColorSkillSource(system))];
  return [buildIndexSkillSource(areas), ...areas].map(renderSkill);
}

export function agentSkillsArchive(skills: readonly GeneratedSkill[]) {
  return createZip(
    skills.map((skill) => ({ path: skill.path, text: skill.markdown })),
  );
}

/**
 * Skills describe the saved system. The baseline captured when editing starts or
 * is saved wins; before any edit, the current documents are the saved system.
 */
export const agentSkillsAtom = atom((get) =>
  generateAgentSkills(
    skillSystemFromSnapshot(
      get(editSessionSnapshotAtom) ?? get(authoringSourceSnapshotAtom),
    ),
  ),
);
