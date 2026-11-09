// Copyright 2026 Adobe. All rights reserved.
import { Text, ToggleButton, ToggleButtonGroup } from "@react-spectrum/s2";
import AppsAll from "@react-spectrum/s2/icons/AppsAll";
import {
  tokenPanelRegistry,
  type TokenPanelId,
} from "../../features/tokens/view/tokenPanelRegistry";

export function TokenTypeFilters({
  value,
  onChange,
}: {
  value: TokenPanelId | "all";
  onChange: (value: TokenPanelId | "all") => void;
}) {
  return (
    <ToggleButtonGroup
      isQuiet
      aria-label="Token types"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const key = String([...keys][0]);
        if (key === "all" || Object.hasOwn(tokenPanelRegistry, key))
          onChange(key as TokenPanelId | "all");
      }}
    >
      <ToggleButton id="all">
        <AppsAll />
        <Text>All</Text>
      </ToggleButton>
      {Object.values(tokenPanelRegistry).map((definition) => (
        <ToggleButton key={definition.id} id={definition.id}>
          {definition.icon}
          <Text>{definition.label}</Text>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
