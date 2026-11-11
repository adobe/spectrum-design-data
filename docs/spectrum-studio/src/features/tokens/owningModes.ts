// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import { capabilityOwners } from "../modes/ownership";
import { elevationOwnerIds } from "../elevation/output";
import { opacityAxes } from "../opacity/generation";
import { opacityStopsEnabled } from "../color-system/colorScaleType";
import { COLOR_PARAMETERS } from "../color-system/resolution";
import { categoricalMemberAxes } from "../color-system/data-vis/axes";
import { tokenEdit } from "./canonicalIdentity";
import {
  canonicalTokenModeKey,
  tokenModeSetIds,
  type BrowserToken,
} from "./browserModel";

/** Owning mode axes, shared by generated Changes and saved token Impact. */
export function tokenOwningModeKey(
  token: BrowserToken,
  snapshot: EditSessionSnapshot,
  fullKey: string,
  other?: EditSessionSnapshot,
  allowMissing = false,
): string {
  const owners: Readonly<Partial<Record<string, string>>> = capabilityOwners(
    snapshot.modeSets,
  );
  const axes = new Set<string>();
  let staticCategorical = false;
  const addOwner = (id: string) => {
    if (owners[id]) axes.add(owners[id]);
  };
  if (token.dataVis) {
    const scale = snapshot.colorSystem.dataVisScales.find(
      (candidate) => candidate.id === token.dataVis?.scaleId,
    );
    const member =
      scale?.kind === "categorical"
        ? scale.members.find(
            (candidate) => candidate.id === token.dataVis?.memberId,
          )
        : undefined;
    if (!scale || !member) {
      if (!allowMissing)
        throw new Error("A categorical Changes value has no authored member.");
    } else {
      staticCategorical = !!scale.staticColors;
      for (const axis of categoricalMemberAxes(
        scale.id,
        member,
        snapshot.modeSets,
        snapshot.browserTokenEdits ?? {},
        scale,
      ))
        axes.add(axis);
    }
  } else if (token.type === "opacity") {
    for (const axis of opacityAxes(snapshot)) axes.add(axis.id);
  } else if (token.type === "elevation") {
    for (const axis of elevationOwnerIds(
      snapshot.modeSets,
      snapshot,
      snapshot.elevation,
    ))
      axes.add(axis);
  } else if (token.type === "colors" && !token.paletteColorId) {
    if (opacityStopsEnabled(snapshot.colorSystem.settings))
      for (const axis of opacityAxes(snapshot)) axes.add(axis.id);
    COLOR_PARAMETERS.forEach(addOwner);
  } else if (token.type === "typography" && token.groupId !== "font-family") {
    addOwner("typography.textZoom");
    addOwner("typography.textSize");
  } else if (
    token.type === "spacing" ||
    token.type === "size" ||
    token.type === "radius"
  ) {
    const scale = snapshot[token.type]?.scales.find(
      (candidate) => candidate.id === token.groupId,
    );
    if (token.type !== "spacing" || scale?.componentSizeScaling)
      addOwner("size.componentSize");
    for (const binding of Object.values(scale?.bindings ?? {}))
      addOwner(binding.modeParameterId);
  }
  if (
    !staticCategorical &&
    tokenEdit(snapshot.browserTokenEdits ?? {}, token.sourceId ?? token.id)
      ?.values?.[fullKey] !== undefined
  )
    for (const axis of tokenModeSetIds(fullKey)) axes.add(axis);
  if (other)
    for (const axis of tokenModeSetIds(
      tokenOwningModeKey(token, other, fullKey, undefined, true),
    ))
      axes.add(axis);
  const pairs: [string, string][] = JSON.parse(fullKey);
  return canonicalTokenModeKey(
    Object.fromEntries(pairs.filter(([id]) => axes.has(id))),
  );
}
