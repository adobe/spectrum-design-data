// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Heading,
  InlineAlert,
  Text,
  ToastQueue,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import ChevronLeft from "@react-spectrum/s2/icons/ChevronLeft";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import { useIsReadOnly } from "../../components/editable";
import {
  addScaleTypeAtom,
  replaceScaleTypeAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import {
  ignoredOverrides,
  scaleTypeConsumersAtom,
} from "../../features/logic/scaleTypeReferences";
import { spacingDocumentAtom } from "../../features/spacing/state";
import { sizeDocumentAtom } from "../../features/size/state";
import { radiusDocumentAtom } from "../../features/radius/state";
import { typographyDocumentAtom } from "../../features/typography/state";
import {
  createScaleType,
  scaleTypeIssues,
  type ScaleType,
} from "../../features/scales/scaleType";
import { ScaleTypeFormPanel } from "../../panels/logic/ScaleTypeFormPanel";
import { ScaleTypePreviewView } from "../../views/logic/ScaleTypePreviewView";
import {
  editingScaleTypeIdAtom,
  NEW_SCALE_TYPE_ID,
  newScaleTypeKindAtom,
} from "../../state/view/logicView";

const pageStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  height: "full",
  minHeight: 0,
  overflow: "auto",
  padding: 24,
});
const headerStyles = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
});
const titleStyles = style({ font: "heading-lg", margin: 0, flexGrow: 1 });
const bodyStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "start",
  gap: 16,
});
const formColumnStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  flexBasis: 400,
  flexGrow: 0,
  flexShrink: 1,
  minWidth: 320,
});
const previewColumnStyles = style({
  flexBasis: 480,
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
});
const noteStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});

/** Focused, in-page editor: parameters on one side, a large graph and sample table on the other. */
export function ScaleTypeEditorLayout({
  scaleTypeId,
}: {
  scaleTypeId: string;
}) {
  const isNew = scaleTypeId === NEW_SCALE_TYPE_ID;
  const library = useAtomValue(scaleTypesAtom);
  const consumers = useAtomValue(scaleTypeConsumersAtom).filter(
    (consumer) => consumer.scaleTypeId === scaleTypeId,
  );
  const stored = library.find((scaleType) => scaleType.id === scaleTypeId);
  const newKind = useAtomValue(newScaleTypeKindAtom);
  const typography = useAtomValue(typographyDocumentAtom);
  const spacing = useAtomValue(spacingDocumentAtom);
  const size = useAtomValue(sizeDocumentAtom);
  const radius = useAtomValue(radiusDocumentAtom);
  const [draft, setDraft] = useState<ScaleType | null>(() =>
    isNew ? createScaleType(newKind) : stored ? structuredClone(stored) : null,
  );
  const isReadOnlyMode = useIsReadOnly();
  const setEditing = useSetAtom(editingScaleTypeIdAtom);
  const addScaleType = useSetAtom(addScaleTypeAtom);
  const replaceScaleType = useSetAtom(replaceScaleTypeAtom);
  const close = () => setEditing(null);

  if (!draft) {
    return (
      <div className="pageMainContent" data-component="ScaleTypeEditorLayout">
        <div className={pageStyles}>
          <p>This formula no longer exists.</p>
          <div>
            <Button variant="secondary" onPress={close}>
              Back to library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isReadOnly = isReadOnlyMode;
  const trimmedName = draft.name.trim();
  const nameError = !trimmedName
    ? "Enter a name."
    : library.some(
          (candidate) =>
            candidate.id !== draft.id &&
            candidate.name.trim().toLowerCase() === trimmedName.toLowerCase(),
        )
      ? "Another formula already uses this name."
      : undefined;
  const issues = scaleTypeIssues(draft);
  const isDirty = isNew || JSON.stringify(draft) !== JSON.stringify(stored);
  const canSave = isDirty && !nameError && issues.length === 0;
  const ignored = isReadOnly
    ? []
    : ignoredOverrides(draft, typography, spacing, size, radius);

  function save() {
    if (!draft) return;
    const next = { ...draft, name: trimmedName };
    try {
      if (isNew) addScaleType(next);
      else replaceScaleType(next);
      close();
    } catch (failure) {
      ToastQueue.negative(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  }

  return (
    <div className="pageMainContent" data-component="ScaleTypeEditorLayout">
      <div className={pageStyles}>
        <header className={headerStyles}>
          <ActionButton onPress={close}>
            <ChevronLeft />
            <Text>Back to library</Text>
          </ActionButton>
          <h2 className={titleStyles}>{isNew ? "New formula" : draft.name}</h2>
          {!isReadOnly && (
            <ButtonGroup>
              {isDirty && !isNew && (
                <Button
                  variant="secondary"
                  onPress={() =>
                    setDraft(stored ? structuredClone(stored) : draft)
                  }
                >
                  Discard changes
                </Button>
              )}
              <Button variant="accent" isDisabled={!canSave} onPress={save}>
                {isNew ? "Add formula" : "Save changes"}
              </Button>
            </ButtonGroup>
          )}
        </header>
        {ignored.length > 0 && (
          <InlineAlert variant="notice">
            <Heading>
              Some foundations override parts this formula locks
            </Heading>
            <Content>
              {ignored
                .map(
                  ({ consumer, parts }) =>
                    `${consumer.label}: ${parts.join(", ")}`,
                )
                .join(". ")}
              . These will use the formula value instead.
            </Content>
          </InlineAlert>
        )}
        <div className={bodyStyles}>
          <div className={formColumnStyles}>
            <ScaleTypeFormPanel
              draft={draft}
              onChange={setDraft}
              nameError={nameError}
              issues={issues}
              isReadOnly={isReadOnly}
            />
            {!isNew && (
              <p className={noteStyles}>
                Used by:{" "}
                {consumers.length > 0
                  ? consumers.map((consumer) => consumer.label).join(", ")
                  : "Not used"}
              </p>
            )}
          </div>
          <div className={previewColumnStyles}>
            <ScaleTypePreviewView scaleType={draft} />
          </div>
        </div>
      </div>
    </div>
  );
}
