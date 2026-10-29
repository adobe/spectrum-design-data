// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Heading,
  Radio,
  RadioGroup,
} from "@react-spectrum/s2";
import { useState } from "react";
import type {
  ChangeResetPlan,
  ResetChoice,
} from "../../features/changelog/resetPlans";
import "./ChangeResetDialog.css";

export interface ChangeResetDialogProps {
  title: string;
  explanation: string;
  choices: readonly ResetChoice[];
  onApply: (plan: ChangeResetPlan) => void;
}

/** Keep validation failures visible without closing the confirmation. */
export function ChangeResetDialog({
  title,
  explanation,
  choices,
  onApply,
}: ChangeResetDialogProps) {
  const [selected, setSelected] = useState(
    choices.length === 1 && choices[0].plan ? choices[0].id : "",
  );
  const [error, setError] = useState("");
  const choice = choices.find((item) => item.id === selected);
  return (
    <Dialog role="alertdialog" size="M">
      {({ close }) => (
        <>
          <Heading slot="title">{title}</Heading>
          <Content>
            <div className="changeResetContents">
              <p>{explanation}</p>
              <RadioGroup
                label="Choose what to reset"
                value={selected}
                onChange={(value) => {
                  setSelected(value);
                  setError("");
                }}
              >
                {choices.map((item) => (
                  <div className="changeResetChoice" key={item.id}>
                    <Radio
                      value={item.id}
                      isDisabled={!item.plan || !!item.disabledReason}
                    >
                      {item.label}
                    </Radio>
                    <p>{item.disabledReason ?? item.description}</p>
                  </div>
                ))}
              </RadioGroup>
              {!choices.some((item) => item.plan) && (
                <p role="status">
                  No safe reset is available here. Edit the source to resolve
                  this change.
                </p>
              )}
              {error && <p role="alert">{error}</p>}
            </div>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            <Button
              variant="negative"
              isDisabled={!choice?.plan || !!choice.disabledReason}
              onPress={() => {
                if (!choice?.plan) return;
                try {
                  onApply(choice.plan);
                  close();
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : String(failure),
                  );
                }
              }}
            >
              Reset selected change
            </Button>
          </ButtonGroup>
        </>
      )}
    </Dialog>
  );
}
