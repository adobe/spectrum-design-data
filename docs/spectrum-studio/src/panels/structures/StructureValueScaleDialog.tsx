// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Heading,
  InlineAlert,
  PickerItem,
  Radio,
  RadioGroup,
  Text,
} from "@react-spectrum/s2";
import { useState } from "react";
import { Picker } from "../../components/fields/Picker";
import type { ScaleType } from "../../features/scales/scaleType";
import type {
  LayoutScaleAnswer,
  LayoutScaleQuestion,
} from "../../features/structures/layoutScales";

export interface StructureValueScaleDialogProps {
  question: LayoutScaleQuestion;
  formulas: readonly ScaleType[];
  error?: string;
  onAnswer: (answer: LayoutScaleAnswer) => void;
  onCreateFormula: () => void;
  onCancel: () => void;
}

export function StructureValueScaleDialog({
  question,
  formulas,
  error,
  onAnswer,
  onCreateFormula,
  onCancel,
}: StructureValueScaleDialogProps) {
  const [choice, setChoice] = useState(
    question.kind === "token" ? "follow" : "reuse",
  );
  const [formulaId, setFormulaId] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(
    question.alternatives ? null : question.applicationId,
  );
  const formula = formulas.find((item) => item.id === formulaId);
  const locked = choice === "reuse" && formula && !formula.base.overridable;
  return (
    <Dialog>
      <Heading>
        {question.kind === "token"
          ? "Restore generation?"
          : "Generate a scale?"}
      </Heading>
      <Content>
        <Text>
          {question.kind === "token"
            ? question.alternatives
              ? "This property is excluded from generation. Choose which rule should follow the selected token's scale."
              : `This property is excluded from ${question.rule.name}. Would you like to restore generation on the selected token's scale?`
            : `You have ${question.rule.name} generation applied to this value. Would you like to:`}
        </Text>
        <RadioGroup
          label="Generation choice"
          value={choice}
          onChange={setChoice}
        >
          {question.kind === "token" ? (
            <Radio value="follow">Follow generation rule</Radio>
          ) : (
            [
              <Radio key="reuse" value="reuse">
                Reuse existing formula
              </Radio>,
              <Radio key="create" value="create">
                Create new formula
              </Radio>,
            ]
          )}
          <Radio value="static">Keep value static</Radio>
        </RadioGroup>
        {choice === "follow" && question.alternatives && (
          <Picker
            label="Generation rule"
            selectedKey={applicationId}
            onSelectionChange={(key) =>
              setApplicationId(key === null ? null : String(key))
            }
          >
            {question.alternatives.map((item) => (
              <PickerItem key={item.applicationId} id={item.applicationId}>
                {item.rule.name}
              </PickerItem>
            ))}
          </Picker>
        )}
        {choice === "reuse" && (
          <Picker
            label="Formula"
            selectedKey={formulaId}
            onSelectionChange={(key) =>
              setFormulaId(key === null ? null : String(key))
            }
            isInvalid={!!locked}
            errorMessage={
              locked
                ? "This formula locks its base. Choose a formula that allows a custom base."
                : undefined
            }
          >
            {formulas.map((item) => (
              <PickerItem key={item.id} id={item.id}>
                {item.name}
              </PickerItem>
            ))}
          </Picker>
        )}
        {error && (
          <InlineAlert variant="negative">
            <Heading>Unable to apply this value</Heading>
            <Content>{error}</Content>
          </InlineAlert>
        )}
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
        <Button
          variant="accent"
          isDisabled={
            (choice === "reuse" && (!formula || !!locked)) ||
            (choice === "follow" && !applicationId)
          }
          onPress={() => {
            if (choice === "create") onCreateFormula();
            else if (choice === "reuse" && formulaId)
              onAnswer({ kind: "formula", formulaId });
            else if (choice === "follow" && applicationId)
              onAnswer({ kind: "follow", applicationId });
            else onAnswer({ kind: "static" });
          }}
        >
          {choice === "create" ? "Continue" : "Apply"}
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}
