// Copyright 2026 Adobe. All rights reserved.
import {
  focusRing,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import { Button, type ButtonRenderProps } from "react-aria-components";

type LogicOperator = "and" | "or";

export interface LogicButtonProps {
  value: LogicOperator;
  onChange: (value: LogicOperator) => void;
  "aria-label"?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
}

const badgeStyles = style<Partial<ButtonRenderProps> & { isOr: boolean }>({
  ...focusRing(),
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxSizing: "border-box",
  minWidth: 40,
  height: 24,
  paddingX: 8,
  borderRadius: "sm",
  borderWidth: 0,
  font: "ui-sm",
  fontWeight: "medium",
  backgroundColor: {
    default: "blue",
    isOr: "fuchsia",
    isDisabled: "gray-200",
    forcedColors: "ButtonFace",
  },
  color: {
    default: "white",
    isDisabled: "disabled",
    forcedColors: "ButtonText",
  },
  cursor: "default",
});

export function LogicButton({
  value,
  onChange,
  "aria-label": ariaLabel,
  isDisabled = false,
  isReadOnly = false,
}: LogicButtonProps) {
  const label = value === "and" ? "And" : "Or";
  if (isReadOnly) {
    return (
      <span
        data-component="LogicButton"
        data-operator={value}
        className={badgeStyles({ isOr: value === "or" })}
      >
        {label}
      </span>
    );
  }
  return (
    <Button
      data-component="LogicButton"
      data-operator={value}
      aria-label={ariaLabel ? `${label} ${ariaLabel}` : label}
      isDisabled={isDisabled}
      onPress={() => onChange(value === "and" ? "or" : "and")}
      className={(state) => badgeStyles({ ...state, isOr: value === "or" })}
    >
      {label}
    </Button>
  );
}
