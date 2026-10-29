// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Heading,
  Picker,
  PickerItem,
  Text,
  TextArea,
  TextField,
  ToastQueue,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { useState, type ReactElement } from "react";
import { interpolationsAtom } from "../../features/logic/scaleTypeLibrary";
import {
  INTERPOLATION_INPUT_VARIABLE,
  INTERPOLATION_KINDS,
  interpolationIssues,
  evaluateInterpolation,
  withInterpolationKind,
  type Interpolation,
} from "../../features/scales/interpolationDefinition";
import {
  INTERPOLATION_METHODS,
  type InterpolationMethod,
} from "../../features/scales/interpolation";
import { ParameterListEditor } from "./ParameterListEditor";

const formStyles = style({ display: "flex", flexDirection: "column", gap: 20 });
const identityStyles = style({
  display: "grid",
  gridTemplateColumns: "[minmax(0, 2fr) minmax(0, 1fr)]",
  gap: 16,
  alignItems: "start",
});
const definitionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  backgroundColor: "layer-1",
  borderRadius: "lg",
});
const sectionTitleStyles = style({ font: "title", margin: 0 });
const previewStyles = style({
  font: "code-sm",
  margin: 0,
  overflowWrap: "anywhere",
});

function formatPreview(value: number) {
  return Number.isFinite(value)
    ? String(Math.round(value * 100) / 100)
    : "invalid";
}

export interface InterpolationEditorDialogProps {
  trigger: ReactElement;
  title: string;
  createDraft: () => Interpolation;
  onSave: (interpolation: Interpolation) => void;
  onDelete?: () => void;
}

export function InterpolationEditorDialog({
  trigger,
  title,
  createDraft,
  onSave,
  onDelete,
}: InterpolationEditorDialogProps) {
  const [draft, setDraft] = useState<Interpolation>(createDraft);
  const library = useAtomValue(interpolationsAtom);
  const trimmedName = draft.name.trim();
  const isNameTaken = library.some(
    (candidate) =>
      candidate.id !== draft.id &&
      candidate.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  );
  const isNameValid = trimmedName.length > 0 && !isNameTaken;
  const issues = interpolationIssues(draft);
  const preview = [0, 0.25, 0.5, 0.75, 1].map(
    (input) =>
      `${formatPreview(input)} → ${formatPreview(evaluateInterpolation(draft, input))}`,
  );
  const report = (failure: unknown) =>
    ToastQueue.negative(
      failure instanceof Error ? failure.message : String(failure),
    );

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        if (isOpen) setDraft(createDraft());
      }}
    >
      {trigger}
      <Dialog size="L">
        {({ close }) => (
          <>
            <Heading slot="title">{title}</Heading>
            <Content>
              <div
                className={formStyles}
                data-component="InterpolationEditorDialog"
              >
                <div className={identityStyles}>
                  <TextField
                    label="Name"
                    isRequired
                    value={draft.name}
                    validationBehavior="aria"
                    isInvalid={!isNameValid}
                    errorMessage={
                      isNameTaken
                        ? "Another interpolation already uses this name."
                        : "Enter a name."
                    }
                    onChange={(name) =>
                      setDraft((current) => ({ ...current, name }))
                    }
                  />
                  <Picker
                    label="Method"
                    selectedKey={draft.kind}
                    onSelectionChange={(key) =>
                      setDraft((current) =>
                        withInterpolationKind(
                          current,
                          String(key) as Interpolation["kind"],
                        ),
                      )
                    }
                  >
                    {INTERPOLATION_KINDS.map((kind) => (
                      <PickerItem key={kind.id} id={kind.id}>
                        {kind.label}
                      </PickerItem>
                    ))}
                  </Picker>
                </div>
                <TextArea
                  label="Description"
                  value={draft.description}
                  onChange={(description) =>
                    setDraft((current) => ({ ...current, description }))
                  }
                />

                <h3 className={sectionTitleStyles}>Definition</h3>
                {draft.kind === "method" ? (
                  <div className={definitionStyles}>
                    <Picker
                      label="Interpolation"
                      selectedKey={draft.method}
                      onSelectionChange={(key) =>
                        setDraft((current) =>
                          current.kind === "method"
                            ? {
                                ...current,
                                method: String(key) as InterpolationMethod,
                              }
                            : current,
                        )
                      }
                    >
                      {INTERPOLATION_METHODS.map((method) => (
                        <PickerItem key={method.id} id={method.id}>
                          {method.label}
                        </PickerItem>
                      ))}
                    </Picker>
                    <Text>
                      Text-size and output ranges are set where this shared
                      shape is used.
                    </Text>
                    {issues[0] && <p role="alert">{issues[0]}</p>}
                  </div>
                ) : (
                  <div className={definitionStyles}>
                    <TextField
                      label={`Output for input ${INTERPOLATION_INPUT_VARIABLE}`}
                      description={`${INTERPOLATION_INPUT_VARIABLE} is progress from 0 to 1. Return 0 at the start and 1 at the end. Ranges belong to each consumer.`}
                      value={draft.expression}
                      isInvalid={issues.length > 0}
                      errorMessage={issues[0]}
                      onChange={(expression) =>
                        setDraft((current) =>
                          current.kind === "expression"
                            ? { ...current, expression }
                            : current,
                        )
                      }
                    />
                    <ParameterListEditor
                      allowAdaptable={false}
                      parameters={draft.parameters}
                      onChange={(parameters) =>
                        setDraft((current) =>
                          current.kind === "expression"
                            ? { ...current, parameters }
                            : current,
                        )
                      }
                    />
                  </div>
                )}

                <h3 className={sectionTitleStyles}>Preview</h3>
                <p className={previewStyles} aria-label="Preview values">
                  {preview.join(", ")}
                </p>
              </div>
            </Content>
            <ButtonGroup>
              {onDelete && (
                <Button
                  variant="negative"
                  fillStyle="outline"
                  onPress={() => {
                    try {
                      onDelete();
                      close();
                    } catch (failure) {
                      report(failure);
                    }
                  }}
                >
                  Delete interpolation
                </Button>
              )}
              <Button variant="secondary" onPress={close}>
                Cancel
              </Button>
              <Button
                variant="accent"
                isDisabled={!isNameValid || issues.length > 0}
                onPress={() => {
                  try {
                    onSave({ ...draft, name: trimmedName });
                    close();
                  } catch (failure) {
                    report(failure);
                  }
                }}
              >
                Save
              </Button>
            </ButtonGroup>
          </>
        )}
      </Dialog>
    </DialogTrigger>
  );
}
