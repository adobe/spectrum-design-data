// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import { parameterOwners } from "../modes/parameters";
import { elevationOwnerIds } from "../elevation/output";
import { opacityAxes } from "../opacity/generation";
import { opacityStopsEnabled } from "../color-system/colorScaleType";
import { categoricalMemberAxes } from "../color-system/data-vis/axes";
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
  const owners = parameterOwners(snapshot.modeSets);
  const axes = new Set<string>();
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
    for (const id of [
      "color.backgroundScaleId",
      "color.backgroundLightness",
      "color.contrastMultiplier",
    ])
      addOwner(id);
  } else if (token.type === "typography") {
    addOwner("typography.textZoom");
    addOwner("typography.textSize");
  } else if (
    token.type === "spacing" ||
    token.type === "size" ||
    token.type === "radius"
  ) {
    if (token.type !== "spacing") addOwner("size.componentSize");
    const scale = snapshot[token.type]?.scales.find(
      (candidate) => candidate.id === token.groupId,
    );
    for (const binding of Object.values(scale?.bindings ?? {}))
      addOwner(binding.modeParameterId);
  }
  for (const key of Object.keys(
    snapshot.browserTokenEdits?.[token.id]?.values ?? {},
  ))
    for (const axis of tokenModeSetIds(key)) axes.add(axis);
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
