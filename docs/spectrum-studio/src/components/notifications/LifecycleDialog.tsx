// Copyright 2026 Adobe. All rights reserved.
// Shown instead of deleting an item that is part of the shipped design data.
// Rendered only by NotificationProvider. See
// .agents/rules/deletion-and-deprecation.mdc.
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Heading,
  PickerItem,
  Radio,
  RadioGroup,
  TextField,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import { Picker } from "../fields/Picker";
import type { LifecycleChoice } from "../../features/notifications/center";

type Option = "rename" | "replace" | "deprecate";

const contentStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
});
const choiceStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});
const hintStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
  marginStart: 28,
});
const fieldStyles = style({ marginStart: 28 });

export function LifecycleDialog({ choice }: { choice: LifecycleChoice }) {
  const options: Option[] = [];
  if (!choice.deprecated) {
    if (choice.rename) options.push("rename");
    if (choice.deprecate && choice.candidates.length) options.push("replace");
    if (choice.deprecate) options.push("deprecate");
  }
  const [selected, setSelected] = useState<Option | undefined>(options[0]);
  const [name, setName] = useState(choice.rename?.current ?? "");
  const [replacement, setReplacement] = useState<string>();
  const [error, setError] = useState("");
  const ready =
    selected === "rename"
      ? !!name.trim() && name.trim() !== choice.rename?.current
      : selected === "replace"
        ? !!replacement
        : selected === "deprecate";
  function apply(close: () => void) {
    try {
      if (selected === "rename") choice.rename?.apply(name);
      else choice.deprecate?.(selected === "replace" ? replacement : undefined);
      close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }
  return (
    <Dialog role="alertdialog" size="M">
      {({ close }) => (
        <>
          <Heading slot="title">{choice.title}</Heading>
          <Content>
            <div className={contentStyles}>
              {choice.deprecated ? (
                <p>
                  {choice.name} is already deprecated. To delete it, use Remove
                  all deprecations in the Changes panel. That is a breaking
                  change for anyone who uses this {choice.noun}.
                </p>
              ) : !options.length ? (
                <p>
                  {choice.name} is part of the shipped design data and cannot be
                  deleted here.
                </p>
              ) : (
                <>
                  <p>
                    {choice.name} is part of the shipped design data, so
                    deleting it would break anyone who uses it. Choose a
                    non-breaking change instead.
                  </p>
                  <RadioGroup
                    label="Choose what to do"
                    value={selected ?? ""}
                    onChange={(value) => {
                      setSelected(value as Option);
                      setError("");
                    }}
                  >
                    {options.includes("rename") && (
                      <div className={choiceStyles}>
                        <Radio value="rename">Rename instead</Radio>
                        <p className={hintStyles}>
                          Keeps the same ID, so everything that uses{" "}
                          {choice.name} follows the new name.
                        </p>
                        {selected === "rename" && (
                          <TextField
                            label="New name"
                            value={name}
                            onChange={(value) => {
                              setName(value);
                              setError("");
                            }}
                            styles={fieldStyles}
                          />
                        )}
                      </div>
                    )}
                    {options.includes("replace") && (
                      <div className={choiceStyles}>
                        <Radio value="replace">Deprecate and replace</Radio>
                        <p className={hintStyles}>
                          Marks {choice.name} as deprecated and points consumers
                          to the {choice.noun} you choose.
                        </p>
                        {selected === "replace" && (
                          <Picker
                            label="Replacement"
                            labelPosition="top"
                            selectedKey={replacement ?? null}
                            onSelectionChange={(key) => {
                              setReplacement(
                                key === null ? undefined : String(key),
                              );
                              setError("");
                            }}
                            items={choice.candidates}
                            styles={fieldStyles}
                          >
                            {(item) => {
                              const candidate =
                                item as (typeof choice.candidates)[number];
                              return (
                                <PickerItem id={candidate.id}>
                                  {candidate.label}
                                </PickerItem>
                              );
                            }}
                          </Picker>
                        )}
                      </div>
                    )}
                    {options.includes("deprecate") && (
                      <div className={choiceStyles}>
                        <Radio value="deprecate">Deprecate</Radio>
                        <p className={hintStyles}>
                          Keeps {choice.name} in the output, marked as
                          deprecated, until deprecations are removed.
                        </p>
                      </div>
                    )}
                  </RadioGroup>
                </>
              )}
              {error && <p role="alert">{error}</p>}
            </div>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={close}>
              {options.length ? "Cancel" : "Close"}
            </Button>
            {options.length > 0 && (
              <Button
                variant="accent"
                isDisabled={!ready}
                onPress={() => apply(close)}
              >
                {selected === "rename" ? "Rename" : "Deprecate"}
              </Button>
            )}
          </ButtonGroup>
        </>
      )}
    </Dialog>
  );
}
