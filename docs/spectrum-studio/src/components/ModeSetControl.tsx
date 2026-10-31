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
import { modeSetUsesOptionIcons } from "../features/modes/controlPresentation";
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

  return (
    <ModeSetPicker
      modeSet={modeSet}
      selectedKey={displayedModeIds[modeSet.key] ?? CUSTOM_MODE_KEY}
      onSelectionChange={(modeId) =>
        resetMode({ modeSetKey: modeSet.key, modeId })
      }
    />
  );
}

export function ModeSetPicker({
  modeSet,
  selectedKey,
  onSelectionChange,
}: {
  modeSet: ModeSet;
  selectedKey: string;
  onSelectionChange: (modeId: string) => void;
}) {
  if (modeSet.modes.length < 2) return null;

  const displayedKey = selectedKey;
  const isCustom = displayedKey === CUSTOM_MODE_KEY;
  const label = isCustom ? `${modeSet.name}, custom` : modeSet.name;
  const modeSetIcon =
    modeSet.iconId && modeSet.iconId !== "none"
      ? MODE_ICONS[modeSet.iconId]
      : null;
  const showIcons = modeSetUsesOptionIcons(modeSet);
  const selectMode = (key: unknown) => {
    if (key !== null) onSelectionChange(String(key));
  };

  if (modeSet.modes.length === 2) {
    const control = (
      // CUSTOM_MODE_KEY matches no item, which leaves every segment unselected.
      <SegmentedControl
        aria-label={label}
        selectedKey={displayedKey}
        onSelectionChange={selectMode}
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
      onSelectionChange={selectMode}
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
