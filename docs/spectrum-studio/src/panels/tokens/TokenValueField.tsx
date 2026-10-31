// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import {
  ActionButton,
  Button,
  DialogTrigger,
  Popover,
  Text,
} from "@react-spectrum/s2";
import MagicWand from "@react-spectrum/s2/icons/MagicWand";
import ColorPalette from "@react-spectrum/s2/icons/Color";
import Edit from "@react-spectrum/s2/icons/Edit";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import { Dialog } from "react-aria-components";
import { TokenComboBox } from "../../components/fields/TokenComboBox";
import { NumberField } from "../../components/fields/NumberField";
import { ColorPickerContents } from "../../components/color-picker/ColorPickerContents";
import { EditableTextField } from "../../components/editable";
import { popoverDialogStyles } from "../../components/popoverLayout";
import {
  parseBrowserTokenValue,
  tokenValueText,
  type BrowserToken,
} from "../../features/tokens/browserModel";
import {
  compatibleTokenTypes,
  literalAssignment,
  shadowText,
} from "../../features/tokens/tokenAssignments";
import type {
  TokenAssignment,
  TokenShadowLayer,
} from "../../features/tokens/browserEditTypes";
import { validateDialogAssignment } from "../../features/tokens/dialogModel";
import { serializeOutputColor } from "../../features/color-system/outputSerialization";
import type { ColorOutputSettings } from "../../features/color-system/outputSettings";
import { inspectorStyles as styles } from "./tokenInspectorStyles";

function ShadowValueEditor({
  token,
  onChange,
}: {
  token: BrowserToken;
  onChange: (assignment: TokenAssignment) => void;
}) {
  const [layers, setLayers] = useState<TokenShadowLayer[]>(
    literalAssignment(token).shadows ?? [],
  );
  const [error, setError] = useState("");
  function update(index: number, patch: Partial<TokenShadowLayer>) {
    setLayers((current) =>
      current.map((layer, item) =>
        item === index ? { ...layer, ...patch } : layer,
      ),
    );
  }
  return (
    <div className={styles.stack}>
      {layers.map((layer, index) => (
        <section
          key={index}
          aria-label={`Shadow layer ${index + 1}`}
          className={styles.stack}
        >
          <div className={styles.layerFields}>
            {(["x", "y", "blur", "spread"] as const).map((field) => (
              <NumberField
                key={field}
                label={`${field === "x" ? "Horizontal offset" : field === "y" ? "Vertical offset" : field === "blur" ? "Blur" : "Spread"} (px)`}
                labelPosition="top"
                value={Number.parseFloat(layer[field])}
                minValue={field === "blur" ? 0 : undefined}
                onChange={(value) => update(index, { [field]: `${value}px` })}
              />
            ))}
          </div>
          <EditableTextField
            label="Color"
            value={layer.color}
            isReadOnly={false}
            onChange={(color) => update(index, { color })}
          />
          <ActionButton
            aria-label={`Remove shadow layer ${index + 1}`}
            onPress={() =>
              setLayers(layers.filter((_, item) => item !== index))
            }
          >
            <Delete />
            <Text>Remove layer</Text>
          </ActionButton>
        </section>
      ))}
      <ActionButton
        onPress={() =>
          setLayers([
            ...layers,
            {
              x: "0px",
              y: "2px",
              blur: "4px",
              spread: "0px",
              color: "rgba(0, 0, 0, 0.2)",
            },
          ])
        }
      >
        <Add />
        <Text>Add layer</Text>
      </ActionButton>
      {error && <p role="alert">{error}</p>}
      <Button
        onPress={() => {
          try {
            const assignment: TokenAssignment = {
              kind: "literal",
              value: shadowText(layers),
              shadows: layers,
            };
            validateDialogAssignment(token, assignment);
            onChange(assignment);
            setError("");
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : String(failure),
            );
          }
        }}
      >
        Use shadow
      </Button>
    </div>
  );
}

export function TokenValueField({
  token,
  tokens,
  generated,
  settings,
  onChange,
  onReset,
}: {
  token: BrowserToken;
  tokens: BrowserToken[];
  generated: boolean;
  settings: ColorOutputSettings;
  onChange: (assignment: TokenAssignment) => void;
  onReset: () => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className={styles.stack}>
      <TokenComboBox
        label="Mode value"
        prefix={generated && !token.valueOverridden ? <MagicWand /> : undefined}
        selectedKey={token.referenceId ?? null}
        options={tokens
          .filter(
            (item) =>
              item.id !== token.id &&
              !item.alias &&
              compatibleTokenTypes(token, item),
          )
          .map((item) => ({
            id: item.id,
            name: item.name,
            displayValue: tokenValueText(item),
            kind: "token" as const,
            error: item.validationError,
          }))}
        isRequired
        error={error || token.validationError}
        onChange={(id) => {
          if (id) {
            onChange({ kind: "reference", targetId: id });
            setError("");
          }
        }}
        customValue={{
          displayValue: tokenValueText(token),
          onAccept: (text) => {
            if (token.type === "elevation")
              throw new Error(
                "Use Edit shadow layers to change a complete shadow.",
              );
            const value = parseBrowserTokenValue(
              { ...token, alias: undefined, semantic: undefined },
              text,
            );
            onChange({ kind: "literal", value });
            setError("");
          },
        }}
      />
      {(token.type === "colors" || token.type === "elevation") && (
        <DialogTrigger isOpen={customOpen} onOpenChange={setCustomOpen}>
          <ActionButton>
            {token.type === "colors" ? <ColorPalette /> : <Edit />}
            <Text>
              {token.type === "colors" ? "Edit color" : "Edit shadow layers"}
            </Text>
          </ActionButton>
          <Popover size="M">
            <Dialog
              className={popoverDialogStyles}
              aria-label={
                token.type === "colors" ? "Edit color" : "Edit shadow layers"
              }
            >
              {token.type === "colors" ? (
                <ColorPickerContents
                  color={String(token.value)}
                  onChange={(_, color) => {
                    try {
                      onChange({
                        kind: "literal",
                        value: serializeOutputColor(color, settings),
                      });
                      setError("");
                    } catch (failure) {
                      setError(
                        failure instanceof Error
                          ? failure.message
                          : String(failure),
                      );
                    }
                  }}
                />
              ) : (
                <ShadowValueEditor
                  token={token}
                  onChange={(assignment) => {
                    onChange(assignment);
                    setCustomOpen(false);
                  }}
                />
              )}
            </Dialog>
          </Popover>
        </DialogTrigger>
      )}
      {(generated || token.valueOverridden) && (
        <div className={token.valueOverridden ? styles.warning : styles.help}>
          {token.valueOverridden ? (
            <>
              {generated
                ? "Value overrides formula output."
                : "Value overrides its source."}{" "}
              <ActionButton isQuiet onPress={onReset}>
                Reset value
              </ActionButton>
            </>
          ) : (
            "Value generated by formula"
          )}
        </div>
      )}
    </div>
  );
}
