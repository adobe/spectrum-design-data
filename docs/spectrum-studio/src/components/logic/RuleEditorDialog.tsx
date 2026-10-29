// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Heading,
  InlineAlert,
  Picker,
  PickerItem,
  TextArea,
  TextField,
  ToastQueue,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { useMemo, useState, type ReactElement } from "react";
import { draftRuleImpact } from "../../features/logic/consumers";
import { rulesAtom } from "../../features/logic/library";
import { createRule, isRule, type Rule } from "../../features/logic/model";
import { RULE_TYPES } from "../../features/logic/registry";
import { spacingDocumentAtom } from "../../features/spacing/state";
import { radiusDocumentAtom } from "../../features/radius/state";
import {
  interpolationsAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import { typographyDocumentAtom } from "../../features/typography/state";
import { RoundingRuleEditor } from "./RoundingRuleEditor";
import { RuleUsedBy } from "./RuleUsedBy";
import { sizeDocumentAtom } from "../../features/size/state";
import { primitiveReferencesAtom } from "../../features/tokens/primitiveReferenceState";
import { TshirtSizingRuleEditor } from "../../panels/logic/TshirtSizingRuleEditor";
import { authoringSnapshotAtom } from "../../features/edit-session/state";
import { ScaleNamingRuleEditor } from "../../panels/logic/ScaleNamingRuleEditor";

const formStyles = style({ display: "flex", flexDirection: "column", gap: 20 });
const identityStyles = style({
  display: "grid",
  gridTemplateColumns: "[minmax(0, 2fr) minmax(0, 1fr)]",
  gap: 16,
  alignItems: "start",
});
const sectionTitleStyles = style({ font: "title", margin: 0 });

export interface RuleEditorDialogProps {
  trigger: ReactElement;
  title: string;
  createDraft: () => Rule;
  onSave: (rule: Rule) => void;
  onDelete?: () => void;
}

export function RuleEditorDialog({
  trigger,
  title,
  createDraft,
  onSave,
  onDelete,
}: RuleEditorDialogProps) {
  const [draft, setDraft] = useState<Rule>(createDraft);
  const rules = useAtomValue(rulesAtom);
  const typography = useAtomValue(typographyDocumentAtom);
  const spacing = useAtomValue(spacingDocumentAtom);
  const radius = useAtomValue(radiusDocumentAtom);
  const size = useAtomValue(sizeDocumentAtom);
  const references = useAtomValue(primitiveReferencesAtom);
  const snapshot = useAtomValue(authoringSnapshotAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const interpolations = useAtomValue(interpolationsAtom);
  const impact = useMemo(() => {
    try {
      return {
        items: draftRuleImpact(draft, rules, {
          typography,
          spacing,
          size,
          radius,
          scaleTypes,
          interpolations,
          structures: snapshot.structures,
          snapshot,
          color: snapshot.colorSystem,
        }),
        error: "",
      };
    } catch (failure) {
      return {
        items: [],
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [
    draft,
    rules,
    typography,
    spacing,
    size,
    radius,
    scaleTypes,
    interpolations,
    snapshot,
  ]);
  const isNameValid = draft.name.trim().length > 0;
  const canChangeType = !rules.some((rule) => rule.id === draft.id);

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
              <div className={formStyles} data-component="RuleEditorDialog">
                <div className={identityStyles}>
                  <TextField
                    label="Name"
                    isRequired
                    value={draft.name}
                    validationBehavior="aria"
                    isInvalid={!isNameValid}
                    errorMessage="Enter a name."
                    onChange={(name) =>
                      setDraft((current) => ({ ...current, name }))
                    }
                  />
                  <Picker
                    label="Type"
                    selectedKey={draft.type}
                    isDisabled={!canChangeType}
                    disabledKeys={RULE_TYPES.filter(
                      (type) => !type.isAvailable,
                    ).map((type) => type.id)}
                    onSelectionChange={(key) => {
                      if (
                        key === "rounding" ||
                        key === "tshirt-sizing" ||
                        key === "scale-naming"
                      )
                        setDraft((current) => ({
                          ...createRule(key),
                          id: current.id,
                          name: current.name,
                          description: current.description,
                        }));
                    }}
                  >
                    {RULE_TYPES.map((type) => (
                      <PickerItem
                        key={type.id}
                        id={type.id}
                        textValue={type.label}
                      >
                        {type.isAvailable
                          ? type.label
                          : `${type.label} (coming soon)`}
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
                {draft.type === "rounding" ? (
                  <RoundingRuleEditor rule={draft} onChange={setDraft} />
                ) : draft.type === "scale-naming" ? (
                  <ScaleNamingRuleEditor rule={draft} onChange={setDraft} />
                ) : (
                  <TshirtSizingRuleEditor
                    rule={draft}
                    references={references}
                    onChange={setDraft}
                  />
                )}
                <h3 className={sectionTitleStyles}>Used by</h3>
                <RuleUsedBy impacts={impact.items} />
                {impact.error && (
                  <InlineAlert variant="negative">
                    <Heading>Check affected output</Heading>
                    <Content>{impact.error}</Content>
                  </InlineAlert>
                )}
              </div>
            </Content>
            <ButtonGroup>
              {onDelete && (
                <Button
                  variant="negative"
                  fillStyle="outline"
                  onPress={() => {
                    onDelete();
                    close();
                  }}
                >
                  Delete rule
                </Button>
              )}
              <Button variant="secondary" onPress={close}>
                Cancel
              </Button>
              <Button
                variant="accent"
                isDisabled={!isNameValid || !isRule(draft) || !!impact.error}
                onPress={() => {
                  try {
                    onSave({ ...draft, name: draft.name.trim() });
                    close();
                  } catch (failure) {
                    ToastQueue.negative(
                      failure instanceof Error
                        ? failure.message
                        : String(failure),
                    );
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
