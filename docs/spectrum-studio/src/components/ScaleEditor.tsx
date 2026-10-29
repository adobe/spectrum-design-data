// Copyright 2026 Adobe. All rights reserved.
import { Button, DialogTrigger, Popover, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Dialog } from "react-aria-components";
import { type ReactNode } from "react";
import { foundationCardStyles } from "./foundationCardStyles";
import { useNarrowScaleEditorViewport } from "./useNarrowScaleEditorViewport";
import { popoverDialogStyles } from "./popoverLayout";
import "./ScaleEditor.css";

export interface ScaleEditorProps {
  name: string;
  label: string;
  preview: ReactNode;
  children: ReactNode;
}

export function ScaleEditor({
  name,
  label,
  preview,
  children,
}: ScaleEditorProps) {
  const isNarrow = useNarrowScaleEditorViewport();
  return (
    <DialogTrigger>
      <Button
        aria-label={label}
        UNSAFE_className={`scaleEditorTrigger ${foundationCardStyles}`}
      >
        <span
          aria-hidden="true"
          className={`scaleEditorPreview ${style({ borderColor: "gray-200" })}`}
        >
          {preview}
        </span>
        <Text UNSAFE_className="scaleEditorName">{name}</Text>
      </Button>
      <Popover
        placement={isNarrow ? "bottom start" : "right"}
        padding="none"
        styles={style({ width: 320 })}
      >
        <Dialog
          aria-label={label}
          className={`scaleEditorDialog ${popoverDialogStyles}`}
        >
          {children}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

export function NumericScaleRamp({ values }: { values: readonly number[] }) {
  const maximum = Math.max(1, ...values.filter(Number.isFinite));
  return (
    <span className="numericScaleRamp">
      {values.map((value, index) => (
        <span
          key={index}
          className="numericScaleRampBar"
          style={{
            height: `${Number.isFinite(value) ? (Math.max(0, value) / maximum) * 100 : 0}%`,
          }}
        />
      ))}
    </span>
  );
}
