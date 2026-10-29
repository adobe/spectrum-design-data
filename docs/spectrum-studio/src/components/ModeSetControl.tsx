// Copyright 2026 Adobe. All rights reserved.
import {
  Picker,
  PickerItem,
  SegmentedControl,
  SegmentedControlItem,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import { MODE_ICONS } from "../features/modes/icons";
import type { ModeSet } from "../features/modes/model";
import {
  CUSTOM_MODE_KEY,
  displayedModeIdsAtom,
  resetModeAtom,
} from "../features/modes/preview";

const segmentedRowStyles = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  columnGap: 8,
});
const segmentedLabelStyles = style({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
});

export function ModeSetControl({ modeSet }: { modeSet: ModeSet }) {
  const displayedModeIds = useAtomValue(displayedModeIdsAtom);
  const resetMode = useSetAtom(resetModeAtom);

  if (modeSet.modes.length < 2) return null;

  const displayedKey = displayedModeIds[modeSet.key] ?? CUSTOM_MODE_KEY;
  const isCustom = displayedKey === CUSTOM_MODE_KEY;
  const label = isCustom ? `${modeSet.name}, custom` : modeSet.name;
  const modeSetIcon =
    modeSet.iconId && modeSet.iconId !== "none"
      ? MODE_ICONS[modeSet.iconId]
      : null;
  // Icons are all-or-nothing so a set with partial icons stays legible.
  const showIcons =
    !modeSetIcon && modeSet.modes.every((mode) => mode.iconId !== "none");
  const onSelectionChange = (key: unknown) =>
    resetMode({ modeSetKey: modeSet.key, modeId: String(key) });

  if (modeSet.modes.length === 2) {
    const control = (
      // CUSTOM_MODE_KEY matches no item, which leaves every segment unselected.
      <SegmentedControl
        aria-label={label}
        selectedKey={displayedKey}
        onSelectionChange={onSelectionChange}
      >
        {modeSet.modes.map((mode) => (
          <SegmentedControlItem
            key={mode.id}
            id={mode.id}
            aria-label={showIcons ? mode.name : undefined}
          >
            {showIcons ? MODE_ICONS[mode.iconId] : <Text>{mode.name}</Text>}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    );
    if (!modeSetIcon) return control;
    return (
      <div className={segmentedRowStyles}>
        <span aria-hidden className={segmentedLabelStyles}>
          {modeSetIcon}
        </span>
        {control}
      </div>
    );
  }

  return (
    <Picker
      isQuiet
      aria-label={label}
      label={modeSetIcon ?? undefined}
      labelPosition={modeSetIcon ? "side" : undefined}
      placeholder="Custom"
      selectedKey={isCustom ? null : displayedKey}
      onSelectionChange={onSelectionChange}
      UNSAFE_style={modeSetIcon ? { alignItems: "center" } : undefined}
    >
      {modeSet.modes.map((mode) => (
        <PickerItem key={mode.id} id={mode.id} textValue={mode.name}>
          {showIcons ? MODE_ICONS[mode.iconId] : null}
          <Text>{mode.name}</Text>
        </PickerItem>
      ))}
    </Picker>
  );
}
