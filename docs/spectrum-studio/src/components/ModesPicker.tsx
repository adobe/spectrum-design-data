// Copyright 2026 Adobe. All rights reserved.
import {
  Header,
  Heading,
  Picker,
  PickerItem,
  PickerSection,
  Text,
} from "@react-spectrum/s2";
import type { ModeSet } from "../features/modes/model";

interface ModesPickerProps {
  modeSets: ModeSet[];
  displayedModeIds: Record<string, string>;
  onSelectionChange: (selection: {
    modeSetKey: string;
    modeId: string;
  }) => void;
}

export function ModesPicker({
  modeSets,
  displayedModeIds,
  onSelectionChange,
}: ModesPickerProps) {
  const selectableSets = modeSets.filter(
    (modeSet) => modeSet.modes.length >= 2,
  );
  const options = selectableSets.flatMap((modeSet) =>
    modeSet.modes.map((mode) => ({
      key: JSON.stringify([modeSet.key, mode.id]),
      modeSetKey: modeSet.key,
      modeId: mode.id,
    })),
  );
  const selectedKeys = options
    .filter((option) => displayedModeIds[option.modeSetKey] === option.modeId)
    .map((option) => option.key);

  return (
    <Picker
      isQuiet
      aria-label="Modes"
      placeholder="Modes"
      isDisabled={selectableSets.length === 0}
      selectionMode="multiple"
      value={selectedKeys}
      renderValue={() => <Text>Modes</Text>}
      onChange={(keys) => {
        const added = options.find(
          (option) =>
            keys.includes(option.key) && !selectedKeys.includes(option.key),
        );
        const selected =
          added ??
          options.find(
            (option) =>
              selectedKeys.includes(option.key) && !keys.includes(option.key),
          );
        if (selected)
          onSelectionChange({
            modeSetKey: selected.modeSetKey,
            modeId: selected.modeId,
          });
      }}
    >
      {selectableSets.map((modeSet) => (
        <PickerSection key={modeSet.id} id={modeSet.id}>
          <Header>
            <Heading>{modeSet.name}</Heading>
          </Header>
          {modeSet.modes.map((mode) => (
            <PickerItem
              key={mode.id}
              id={JSON.stringify([modeSet.key, mode.id])}
              textValue={mode.name}
            >
              <Text>{mode.name}</Text>
            </PickerItem>
          ))}
        </PickerSection>
      ))}
    </Picker>
  );
}
