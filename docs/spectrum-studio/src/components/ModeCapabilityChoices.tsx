// Copyright 2026 Adobe. All rights reserved.
import { Checkbox } from "@react-spectrum/s2";
import type { ModeSet, AuthoringCapability } from "../features/modes/model";
import {
  AUTHORING_CAPABILITY_OPTIONS,
  capabilityOwners,
  modeOverridesCapability,
  type FoundationId,
} from "../features/modes/parameters";

export function ModeCapabilityChoices({
  draft,
  modeSets,
  foundations,
  onChange,
}: {
  draft: ModeSet;
  modeSets: ModeSet[];
  foundations: FoundationId[];
  onChange: (capability: AuthoringCapability, selected: boolean) => void;
}) {
  const owners = capabilityOwners(modeSets);
  return AUTHORING_CAPABILITY_OPTIONS.filter((option) =>
    foundations.includes(option.foundation),
  ).map(({ id, label }) => {
    const otherOwner = owners[id];
    const elsewhere = otherOwner !== undefined && otherOwner !== draft.id;
    const cannotRemove =
      draft.authoringCapabilities?.includes(id) &&
      draft.modes.some(
        (mode) =>
          mode.id !== draft.defaultModeId && modeOverridesCapability(mode, id),
      );
    return (
      <Checkbox
        key={id}
        isDisabled={elsewhere || !!cannotRemove}
        isSelected={draft.authoringCapabilities?.includes(id) ?? false}
        onChange={(selected) => onChange(id, selected)}
      >
        {elsewhere
          ? `${label} - managed by ${modeSets.find((set) => set.id === otherOwner)?.name}`
          : cannotRemove
            ? `${label} - remove mode overrides first`
            : label}
      </Checkbox>
    );
  });
}
