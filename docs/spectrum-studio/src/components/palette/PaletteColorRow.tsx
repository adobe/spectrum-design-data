// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  ColorSwatch,
  Content,
  ContextualHelp,
  DialogTrigger,
  Popover,
  Text,
  TextField,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Delete from "@react-spectrum/s2/icons/Delete";
import { useState, type ReactNode } from "react";
import { Dialog } from "react-aria-components";
import type {
  OutputGamut,
  PaletteColor,
} from "../../features/color-system/model";
import {
  paletteColorHex,
  type PaletteChannels,
} from "../../features/color-system/paletteValue";
import { ColorPickerContents } from "../color-picker/ColorPickerContents";
import { popoverDialogStyles } from "../popoverLayout";

export interface PaletteColorRowProps {
  color: PaletteColor;
  outputGamut: OutputGamut;
  /** Returns an error message when the name is rejected. */
  onRename: (name: string) => string | null;
  /** Returns an error message when the value is rejected. */
  onChangeValue: (channels: PaletteChannels) => string | null;
  onDelete: () => void;
  /** Name of an earlier palette color that renders as the same swatch in the output format. */
  duplicateOf?: string;
  /** How many scale stops link to this color. */
  usedByCount?: number;
  isReadOnly?: boolean;
  nameEditor?: ReactNode | ((helpText: string) => ReactNode);
}

const rowStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "full",
});
const swatchButtonStyles = style({
  padding: 0,
  borderStyle: "none",
  backgroundColor: "transparent",
  flexShrink: 0,
});
const nameFieldStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexGrow: 1,
  minWidth: 0,
});
const detailStyles = style({ font: "detail", color: "neutral-subdued" });
const popoverStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
});
const errorStyles = style({ font: "detail", color: "negative" });
const readOnlyStyles = style({ display: "flex", alignItems: "center", gap: 8 });

/** One palette color: a swatch that opens the value picker, an editable name, and a delete action. */
export function PaletteColorRow({
  color,
  outputGamut,
  onRename,
  onChangeValue,
  onDelete,
  duplicateOf,
  usedByCount = 0,
  isReadOnly = false,
  nameEditor,
}: PaletteColorRowProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const hex = paletteColorHex(color, outputGamut);
  const notices = [
    duplicateOf && `Same color as ${duplicateOf} in the output format.`,
    usedByCount > 0 &&
      `Used by ${usedByCount} color scale ${usedByCount === 1 ? "stop" : "stops"}.`,
  ].filter(Boolean);

  function commitName() {
    if (draft === null) return;
    if (draft.trim() === color.name) {
      setDraft(null);
      setNameError(null);
      return;
    }
    const error = onRename(draft);
    setNameError(error);
    if (!error) setDraft(null);
  }

  if (isReadOnly) {
    return (
      <div className={readOnlyStyles}>
        <ColorSwatch color={hex} size="L" aria-label={`${color.name} color`} />
        <Text>{color.name}</Text>
        {duplicateOf && (
          <span className={detailStyles}>Same color as {duplicateOf}.</span>
        )}
      </div>
    );
  }

  return (
    <div className={rowStyles}>
      <DialogTrigger>
        <Button
          aria-label={`Edit value of ${color.name}`}
          UNSAFE_className={String(swatchButtonStyles)}
        >
          <ColorSwatch
            color={hex}
            size="L"
            aria-label={`${color.name} color`}
          />
        </Button>
        <Popover size="M" padding="none" placement="right">
          <Dialog
            aria-label={`${color.name} value`}
            className={`${popoverDialogStyles} ${popoverStyles}`}
          >
            <ColorPickerContents
              color={`oklch(${color.lightness} ${(color.chroma / 100) * 0.4} ${color.hue})`}
              colorSpace="OKlch"
              onChange={(_, parsedColor) => {
                const [lightness, chroma, hue] = parsedColor
                  .to("oklch")
                  .coords.map(Number);
                setValueError(
                  onChangeValue({
                    lightness,
                    chroma: (chroma / 0.4) * 100,
                    hue: Number.isFinite(hue) ? hue : color.hue,
                  }),
                );
              }}
            />
            {valueError && (
              <span role="alert" className={errorStyles}>
                {valueError}
              </span>
            )}
          </Dialog>
        </Popover>
      </DialogTrigger>
      <div className={nameFieldStyles}>
        {typeof nameEditor === "function"
          ? nameEditor(notices.join(" "))
          : (nameEditor ?? (
              <TextField
                aria-label="Palette color name"
                value={draft ?? color.name}
                onChange={setDraft}
                onBlur={commitName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitName();
                }}
                isInvalid={nameError !== null}
                errorMessage={nameError ?? undefined}
                styles={style({ width: "full" })}
              />
            ))}
        {typeof nameEditor !== "function" && notices.length > 0 && (
          <ContextualHelp aria-label={`Help for palette color ${color.name}`}>
            <Content>{notices.join(" ")}</Content>
          </ContextualHelp>
        )}
      </div>
      <ActionButton
        isQuiet
        aria-label={`Delete palette color ${color.name}`}
        onPress={onDelete}
      >
        <Delete />
      </ActionButton>
    </div>
  );
}
