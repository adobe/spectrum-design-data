// Copyright 2026 Adobe. All rights reserved.
import { ToggleButton } from "@react-spectrum/s2";
import ViewGrid from "@react-spectrum/s2/icons/ViewGrid";
import { useState, type ReactNode } from "react";
import { TokenComboBox, type TokenComboBoxOption, type TokenDisplayMode } from "./TokenComboBox";
import { combinedTokenSelection } from "./tokenSelection";
import "./DividableComboBox.css";

export interface DividableField {
  label: string;
  prefix: ReactNode;
  selectedKey: string | null;
  error?: string;
}
export interface DividableComboBoxProps {
  label: string;
  prefix: ReactNode;
  fields: readonly [DividableField, DividableField, DividableField, DividableField];
  options: readonly TokenComboBoxOption[];
  displayMode?: TokenDisplayMode;
  isDisabled?: boolean;
  menuWidth?: number;
  onSharedChange: (id: string | null) => void;
  onIndividualChange: (index: number, id: string | null) => void;
}
export function DividableComboBox({ label, prefix, fields, options, displayMode, isDisabled = false, menuWidth, onSharedChange, onIndividualChange }: DividableComboBoxProps) {
  const { isMixed: mixed, selectedKey } = combinedTokenSelection(fields);
  const [expanded, setExpanded] = useState(mixed);
  return <div className="dividableComboBox" data-component="DividableComboBox">
    <div className="dividableComboBoxPrimary">
      <TokenComboBox label={label} prefix={prefix} options={options} displayMode={displayMode} menuWidth={menuWidth}
        selectedKey={selectedKey} isMixed={mixed}
        error={fields.find((field) => field.error)?.error} isDisabled={isDisabled || expanded} onChange={onSharedChange} />
      <ToggleButton aria-label={`Use individual ${label.toLowerCase()} values`} isSelected={expanded} onChange={setExpanded}><ViewGrid /></ToggleButton>
    </div>
    {expanded && <div className="dividableComboBoxFields" role="group" aria-label={`Individual ${label.toLowerCase()}`}>
      {fields.map((field, index) => <TokenComboBox key={field.label} ariaLabel={field.label} prefix={field.prefix}
        options={options} selectedKey={field.selectedKey} displayMode={displayMode} isDisabled={isDisabled} menuWidth={menuWidth}
        error={field.error} onChange={(id) => onIndividualChange(index, id)} />)}
    </div>}
  </div>;
}
