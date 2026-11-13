// Copyright 2026 Adobe. All rights reserved.
import { ToggleButton } from "@react-spectrum/s2";
import ViewGrid from "@react-spectrum/s2/icons/ViewGrid";
import { useMemo, useState, type ReactNode } from "react";
import {
  TokenComboBox,
  type TokenComboBoxOption,
  type TokenComboBoxProps,
  type TokenDisplayMode,
} from "./TokenComboBox";
import { combinedTokenSelection } from "./tokenSelection";
import "./DividableComboBox.css";

export interface DividableField {
  label: string;
  prefix: ReactNode;
  selectedKey: string | null;
  error?: string;
  customValue?: TokenComboBoxProps["customValue"];
  isRequired?: boolean;
  isOptionAllowed?: TokenComboBoxProps["isOptionAllowed"];
}
export interface DividableComboBoxProps {
  placeholder?: string;
  size?: TokenComboBoxProps["size"];
  label: string;
  prefix: ReactNode;
  fields: readonly [
    DividableField,
    DividableField,
    DividableField,
    DividableField,
  ];
  options: readonly TokenComboBoxOption[];
  displayMode?: TokenDisplayMode;
  isDisabled?: boolean;
  menuWidth?: number;
  normalizeValue?: TokenComboBoxProps["normalizeValue"];
  onSharedCustomValue?: (text: string) => void;
  onSharedChange: (id: string | null) => void;
  onIndividualChange: (index: number, id: string | null) => void;
}
export function DividableComboBox({
  placeholder,
  size,
  label,
  prefix,
  fields,
  options,
  displayMode,
  isDisabled = false,
  menuWidth,
  normalizeValue,
  onSharedCustomValue,
  onSharedChange,
  onIndividualChange,
}: DividableComboBoxProps) {
  const { isMixed: mixed, selectedKey } = combinedTokenSelection(fields);
  const [expanded, setExpanded] = useState(mixed);
  const [first, second, third, fourth] = fields.map(
    (field) => field.isOptionAllowed,
  );
  // Stays stable while the four checks are unchanged, so the shared field filters its menu once per open.
  const isOptionAllowed = useMemo(
    () =>
      first || second || third || fourth
        ? (option: TokenComboBoxOption) =>
            [first, second, third, fourth].every(
              (allowed) => !allowed || allowed(option),
            )
        : undefined,
    [first, second, third, fourth],
  );
  return (
    <div className="dividableComboBox" data-component="DividableComboBox">
      <div className="dividableComboBoxPrimary">
        <TokenComboBox
          placeholder={placeholder}
          size={size}
          label={label}
          prefix={prefix}
          options={options}
          displayMode={displayMode}
          menuWidth={menuWidth}
          selectedKey={selectedKey}
          isMixed={mixed}
          normalizeValue={normalizeValue}
          isRequired={fields.some((field) => field.isRequired)}
          isOptionAllowed={isOptionAllowed}
          customValue={
            onSharedCustomValue && fields.every((field) => field.customValue)
              ? {
                  ...fields[0].customValue,
                  displayValue: mixed
                    ? ""
                    : fields[0].customValue!.displayValue,
                  isAllowed: (text) =>
                    fields.every(
                      (field) =>
                        !field.customValue?.isAllowed ||
                        field.customValue.isAllowed(text),
                    ),
                  onAccept: onSharedCustomValue,
                }
              : undefined
          }
          error={fields.find((field) => field.error)?.error}
          isDisabled={isDisabled || expanded}
          onChange={onSharedChange}
        />
        <ToggleButton
          size={size}
          aria-label={`Use individual ${label.toLowerCase()} values`}
          isSelected={expanded}
          onChange={setExpanded}
        >
          <ViewGrid />
        </ToggleButton>
      </div>
      {expanded && (
        <div
          className="dividableComboBoxFields"
          role="group"
          aria-label={`Individual ${label.toLowerCase()}`}
        >
          {fields.map((field, index) => (
            <TokenComboBox
              placeholder={placeholder}
              size={size}
              key={field.label}
              ariaLabel={field.label}
              prefix={field.prefix}
              options={options}
              selectedKey={field.selectedKey}
              displayMode={displayMode}
              isDisabled={isDisabled}
              menuWidth={menuWidth}
              normalizeValue={normalizeValue}
              customValue={field.customValue}
              isRequired={field.isRequired}
              isOptionAllowed={field.isOptionAllowed}
              error={field.error}
              onChange={(id) => onIndividualChange(index, id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
