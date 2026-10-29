// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "../../modes/model";
import { capabilityOwners } from "../../modes/ownership";
import { tokenStableKey, tokenUuid } from "../../tokens/model";
import {
  tokenModeSetIds,
  type BrowserTokenEdits,
} from "../../tokens/browserModel";
import type { CategoricalMember, CategoricalDataVisScale } from "./model";
import { dataVisMemberId } from "./identity";

export function categoricalMemberAxes(
  scaleId: string,
  member: CategoricalMember,
  sets: readonly ModeSet[],
  edits: BrowserTokenEdits,
  scale?: Pick<CategoricalDataVisScale, "staticColors">,
) {
  if (scale?.staticColors) return new Set<string>();
  const owners = capabilityOwners(sets);
  const axes = new Set(
    (
      [
        "color.scales",
        "color.contrastMultiplier",
        "color.backgroundScaleId",
        "color.backgroundLightness",
      ] as const
    ).flatMap((capability) => {
      const id = owners[capability];
      return id ? [id] : [];
    }),
  );
  for (const id of [
    dataVisMemberId(scaleId, member.id),
    tokenUuid(tokenStableKey(member.source.scaleId, member.source.contrastId)),
  ]) {
    for (const key of Object.keys(edits[id]?.values ?? {}))
      for (const axis of tokenModeSetIds(key)) axes.add(axis);
  }
  return axes;
}
