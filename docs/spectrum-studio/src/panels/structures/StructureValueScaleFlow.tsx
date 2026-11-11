// Copyright 2026 Adobe. All rights reserved.
import { Content, Dialog, DialogContainer, Heading } from "@react-spectrum/s2";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { editModeAtom } from "../../state/view/editMode";
import { scaleTypesAtom } from "../../features/logic/scaleTypeLibrary";
import {
  createScaleType,
  type ScaleType,
} from "../../features/scales/scaleType";
import {
  answerLayoutScaleAtom,
  pendingLayoutScaleAtom,
} from "../../features/structures/layoutScaleState";
import type { LayoutScaleAnswer } from "../../features/structures/layoutScales";
import { ScaleTypeEditorLayout } from "../../pages/logic/ScaleTypeEditorLayout";
import { NEW_SCALE_TYPE_ID } from "../../state/view/logicView";
import { StructureValueScaleDialog } from "./StructureValueScaleDialog";

export function StructureValueScaleFlow() {
  const [pending, setPending] = useAtom(pendingLayoutScaleAtom);
  const answer = useSetAtom(answerLayoutScaleAtom);
  const formulas = useAtomValue(scaleTypesAtom);
  const editing = useAtomValue(editModeAtom);
  const [draft, setDraft] = useState<ScaleType | null>(null);
  const [error, setError] = useState<string>();
  const cancel = () => {
    setPending(null);
    setDraft(null);
    setError(undefined);
  };
  useEffect(() => {
    if (!editing) {
      setPending(null);
      setDraft(null);
    }
  }, [editing, setPending]);
  useEffect(() => () => setPending(null), [setPending]);
  const accept = (choice: LayoutScaleAnswer) => {
    try {
      answer(choice);
      setError(undefined);
      setDraft(null);
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : String(failure);
      setError(message);
      if (draft) throw failure;
    }
  };
  if (!pending || !editing) return null;
  const question = pending.questions[pending.answers.length];
  if (draft)
    return (
      <DialogContainer onDismiss={cancel}>
        <Dialog size="XL">
          <Heading>New formula</Heading>
          <Content>
            <ScaleTypeEditorLayout
              key={draft.id}
              scaleTypeId={NEW_SCALE_TYPE_ID}
              initialDraft={draft}
              onCancel={cancel}
              onApply={(formula) =>
                accept({ kind: "formula", formulaId: formula.id, formula })
              }
            />
          </Content>
        </Dialog>
      </DialogContainer>
    );
  return (
    <DialogContainer onDismiss={cancel}>
      <StructureValueScaleDialog
        key={pending.answers.length}
        question={question}
        formulas={[
          ...formulas,
          ...pending.answers.flatMap((answer) =>
            answer.kind === "formula" && answer.formula ? [answer.formula] : [],
          ),
        ]}
        error={error}
        onAnswer={accept}
        onCancel={cancel}
        onCreateFormula={() => {
          const formula = createScaleType("expression");
          setDraft({
            ...formula,
            base: {
              ...formula.base,
              default: question.value!,
              overridable: true,
            },
          });
        }}
      />
    </DialogContainer>
  );
}
