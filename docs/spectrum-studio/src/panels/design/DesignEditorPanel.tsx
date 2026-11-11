// Copyright 2026 Adobe. All rights reserved.
import type { ReactNode } from "react";
import { Panel } from "../../components/Panel";
import { ToggleButton, ToggleButtonGroup } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { SideLabelRow } from "../../components/fields/SideLabelRow";
import type { TokenDisplayMode } from "../../components/fields/TokenComboBox";
import "./DesignPanels.css";

const fullWidth = style({ width: "full" });

export function DesignValueDisplay({
  value,
  onChange,
}: {
  value: TokenDisplayMode;
  onChange: (value: TokenDisplayMode) => void;
}) {
  return (
    <SideLabelRow label="Show as" size="S" labelWidth="auto">
      {(labelId) => (
        <ToggleButtonGroup
          aria-labelledby={labelId}
          size="S"
          density="compact"
          isJustified
          styles={fullWidth}
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={new Set([value])}
          onSelectionChange={(keys) => {
            const selected = [...keys][0];
            if (selected === "tokens" || selected === "values")
              onChange(selected);
          }}
        >
          <ToggleButton id="tokens">Tokens</ToggleButton>
          <ToggleButton id="values">Values</ToggleButton>
        </ToggleButtonGroup>
      )}
    </SideLabelRow>
  );
}

export function DesignEditorPanel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Panel label={label} className="designEditorPanel">
      <div className="structurePanelSections">{children}</div>
    </Panel>
  );
}
