// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { foundationModeAttachmentsAtom } from "../../state/view/foundationModeAttachments";
import { adaptiveClaimsAtom, commitModeSetClaimsAtom } from "./adaptive";
import {
  addModeSetAtom,
  modeSetsAtom,
  replaceModeSetAtom,
  writeModeSources,
  type ModeDimensionSources,
} from "./state";
import {
  AUTHORING_CAPABILITY_OPTIONS,
  capabilityFoundations,
  modeOverridesCapability,
  type FoundationId,
} from "./parameters";
import type { ModeSet } from "./model";
import { clearPreviewParametersAtom } from "./previewState";
import { colorSystemDocumentAtom } from "../color-system/state";
import { spacingDocumentAtom } from "../spacing/state";
import { sizeDocumentAtom } from "../size/state";
import { radiusDocumentAtom } from "../radius/state";
import { browserTokenEditsAtom } from "../tokens/browserEdits";
import { PALETTE_SCALE_ID, tokenStableKey, tokenUuid } from "../tokens/model";
import { tokenModeSetIds } from "../tokens/browserModel";
import { scaleContrasts } from "../color-system/contrastSteps";
import { dataVisMemberId } from "../color-system/data-vis/identity";
import { opacityDocumentAtom } from "../opacity/state";
import { clearRememberedModeSettingsAtom } from "./foundationSettingsState";
import { previewIdsForCapability } from "./foundationSettings";
import { capabilityOwners } from "./ownership";
import { tokenIdentity } from "../tokens/canonicalIdentity";

export const modeSetFoundationsAtom = atom((get) => {
  const attachments = get(foundationModeAttachmentsAtom);
  return Object.fromEntries(
    get(modeSetsAtom).map((set) => [
      set.id,
      [
        ...new Set([
          ...(attachments[set.id] ?? []),
          ...capabilityFoundations(set.authoringCapabilities ?? []),
        ]),
      ],
    ]),
  );
});

export function foundationRemovalIssue(
  set: ModeSet,
  foundation: FoundationId,
): string | null {
  const capabilities = AUTHORING_CAPABILITY_OPTIONS.filter(
    (option) => option.foundation === foundation,
  );
  if (
    capabilities.some(({ id }) =>
      set.modes.some(
        (mode) =>
          mode.id !== set.defaultModeId && modeOverridesCapability(mode, id),
      ),
    )
  ) {
    return "Remove this foundation's mode overrides before removing the mode set.";
  }
  return null;
}

export const attachFoundationModeSetAtom = atom(
  null,
  (get, set, input: { modeSetId: string; foundation: FoundationId }) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to add a mode set.");
    if (!get(modeSetsAtom).some((item) => item.id === input.modeSetId))
      throw new Error("This mode set is no longer available.");
    set(foundationModeAttachmentsAtom, (current) => ({
      ...current,
      [input.modeSetId]: [
        ...new Set([...(current[input.modeSetId] ?? []), input.foundation]),
      ],
    }));
  },
);

export const applyFoundationModeSetAtom = atom(
  null,
  (
    get,
    set,
    input: {
      modeSet: ModeSet;
      foundation: FoundationId;
      isNew: boolean;
      foundations?: FoundationId[];
      adaptiveIds?: string[];
    },
  ) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to add a mode set.");
    if (input.isNew) {
      set(addModeSetAtom, input.modeSet);
      set(commitModeSetClaimsAtom, {
        modeSetId: input.modeSet.id,
        parameterIds: (input.adaptiveIds ?? []).filter((id) =>
          input.modeSet.authoringCapabilities?.some(
            (capability) => capability === id,
          ),
        ),
      });
      set(foundationModeAttachmentsAtom, (current) => ({
        ...current,
        [input.modeSet.id]: [
          ...new Set([...(input.foundations ?? []), input.foundation]),
        ],
      }));
    } else {
      const current = get(modeSetsAtom).find(
        (item) => item.id === input.modeSet.id,
      );
      if (!current) throw new Error("This mode set is no longer available.");
      const capabilities = new Set(
        AUTHORING_CAPABILITY_OPTIONS.filter(
          (option) => option.foundation === input.foundation,
        ).map((option) => option.id),
      );
      set(replaceModeSetAtom, {
        ...current,
        authoringCapabilities: [
          ...(current.authoringCapabilities ?? []).filter(
            (id) => !capabilities.has(id),
          ),
          ...(input.modeSet.authoringCapabilities ?? []).filter((id) =>
            capabilities.has(id),
          ),
        ],
      });
      set(attachFoundationModeSetAtom, {
        modeSetId: current.id,
        foundation: input.foundation,
      });
    }
  },
);

export const detachFoundationModeSetAtom = atom(
  null,
  (get, set, input: { modeSetId: string; foundation: FoundationId }) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to remove a mode set.");
    const target = get(modeSetsAtom).find(
      (item) => item.id === input.modeSetId,
    );
    if (!target) throw new Error("This mode set is no longer available.");
    const capabilities = new Set<string>(
      AUTHORING_CAPABILITY_OPTIONS.filter(
        (option) => option.foundation === input.foundation,
      ).map((option) => option.id),
    );
    const claims = get(adaptiveClaimsAtom);
    const owners: Readonly<Partial<Record<string, string>>> = capabilityOwners(
      get(modeSetsAtom),
    );
    const removedParameters = [...capabilities].filter(
      (id) => owners[id] === target.id || claims[id] === target.id,
    );
    const color = get(colorSystemDocumentAtom);
    const colorTokenIds = new Set([
      ...color.scales.flatMap((scale) =>
        scaleContrasts(color, scale).map((contrast) =>
          tokenUuid(tokenStableKey(scale.id, contrast.id)),
        ),
      ),
      ...color.palette.map((item) =>
        tokenUuid(tokenStableKey(PALETTE_SCALE_ID, item.id)),
      ),
      ...color.dataVisScales.flatMap((scale) =>
        scale.kind === "categorical"
          ? scale.members.map((member) => dataVisMemberId(scale.id, member.id))
          : [],
      ),
    ]);
    const edits = get(browserTokenEditsAtom);
    const nextEdits = Object.fromEntries(
      Object.entries(edits).flatMap(([id, edit]) => {
        const sourceId = tokenIdentity(edits, id)?.sourceId ?? id;
        const belongs =
          input.foundation === "color"
            ? colorTokenIds.has(sourceId)
            : input.foundation === "opacity"
              ? get(opacityDocumentAtom).levels.some(
                  (level) => level.id === sourceId,
                )
              : sourceId.startsWith(`${input.foundation}-`);
        if (!belongs) return [[id, edit]];
        const values = Object.fromEntries(
          Object.entries(edit.values).filter(
            ([key]) => !tokenModeSetIds(key).includes(target.id),
          ),
        );
        if (
          !Object.keys(values).length &&
          edit.authoring === undefined &&
          edit.name === undefined &&
          edit.description === undefined &&
          edit.status === undefined
        )
          return [];
        const authoring = edit.authoring && {
          ...edit.authoring,
          assignments: Object.fromEntries(
            Object.entries(edit.authoring.assignments).filter(
              ([key]) => !tokenModeSetIds(key).includes(target.id),
            ),
          ),
          ...(edit.authoring.baselines && {
            baselines: Object.fromEntries(
              Object.entries(edit.authoring.baselines).filter(
                ([key]) => !tokenModeSetIds(key).includes(target.id),
              ),
            ),
          }),
        };
        return [[id, { ...edit, values, ...(authoring && { authoring }) }]];
      }),
    );
    const next = {
      ...target,
      authoringCapabilities: target.authoringCapabilities?.filter(
        (id) => !capabilities.has(id),
      ),
      modes: target.modes.map((mode) => {
        const foundations = { ...mode.foundations };
        if (
          input.foundation === "color" ||
          input.foundation === "typography" ||
          input.foundation === "elevation"
        )
          delete foundations[input.foundation];
        return { ...mode, foundations };
      }),
    };
    const dimensions: ModeDimensionSources = {};
    if (
      input.foundation === "spacing" ||
      input.foundation === "size" ||
      input.foundation === "radius"
    ) {
      const document =
        input.foundation === "spacing"
          ? get(spacingDocumentAtom)
          : input.foundation === "size"
            ? get(sizeDocumentAtom)
            : get(radiusDocumentAtom);
      const scales = document.scales.map((scale) => ({
        ...scale,
        ...(scale.bindings && {
          bindings: Object.fromEntries(
            Object.entries(scale.bindings).filter(
              ([, binding]) => owners[binding.modeParameterId] !== target.id,
            ),
          ),
        }),
      }));
      if (input.foundation === "spacing")
        dimensions.spacing = { ...get(spacingDocumentAtom), scales };
      else if (input.foundation === "size")
        dimensions.size = { ...get(sizeDocumentAtom), scales };
      else dimensions.radius = { ...get(radiusDocumentAtom), scales };
    }
    writeModeSources(
      get,
      set,
      get(modeSetsAtom).map((axis) => (axis.id === next.id ? next : axis)),
      nextEdits,
      undefined,
      dimensions,
    );
    set(
      adaptiveClaimsAtom,
      Object.fromEntries(
        Object.entries(claims).filter(
          ([id, owner]) => owner !== target.id || !capabilities.has(id),
        ),
      ),
    );
    set(
      clearPreviewParametersAtom,
      removedParameters.flatMap(previewIdsForCapability),
    );
    set(clearRememberedModeSettingsAtom, {
      modeSetId: target.id,
      foundation: input.foundation,
    });
    const attachments = { ...get(foundationModeAttachmentsAtom) };
    attachments[input.modeSetId] = (attachments[input.modeSetId] ?? []).filter(
      (id) => id !== input.foundation,
    );
    if (!attachments[input.modeSetId].length)
      delete attachments[input.modeSetId];
    set(foundationModeAttachmentsAtom, attachments);
  },
);
