// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Badge, Text } from "@react-spectrum/s2";
import { useNotify } from "../notifications/notificationContext";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Delete from "@react-spectrum/s2/icons/Delete";
import Edit from "@react-spectrum/s2/icons/Edit";
import Lock from "@react-spectrum/s2/icons/Lock";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { EditOnly } from "../editable";
import { replaceInterpolationAtom } from "../../features/logic/scaleTypeLibrary";
import {
  interpolationConsumersAtom,
  removeInterpolationWithFallbackAtom,
  restoreInterpolationWithConsumersAtom,
} from "../../features/logic/interpolationReferences";
import {
  interpolationBadgeLabel,
  summarizeInterpolation,
  type Interpolation,
} from "../../features/scales/interpolationDefinition";
import { InterpolationEditorDialog } from "./InterpolationEditorDialog";
import { InterpolationPreview } from "./InterpolationPreview";
import { UsedByTags } from "./UsedByTags";

const cardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  backgroundColor: "layer-1",
  borderRadius: "xl",
  padding: 20,
  minWidth: 0,
});
const headerStyles = style({
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  gap: 12,
});
const titleRowStyles = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
  minWidth: 0,
});
const titleStyles = style({ font: "title-lg", margin: 0 });
const bodyStyles = style({
  display: "flex",
  alignItems: "start",
  gap: 16,
  minWidth: 0,
});
const detailsStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
  flexGrow: 1,
});
const summaryStyles = style({
  font: "code-sm",
  margin: 0,
  overflowWrap: "anywhere",
});
const actionsStyles = style({ display: "flex", gap: 4, flexShrink: 0 });

export function InterpolationCard({
  interpolation,
}: {
  interpolation: Interpolation;
}) {
  const replaceInterpolation = useSetAtom(replaceInterpolationAtom);
  const store = useStore();
  const notify = useNotify();
  const consumers = useAtomValue(interpolationConsumersAtom).filter(
    (consumer) => consumer.interpolationId === interpolation.id,
  );

  function deleteInterpolation() {
    notify.remove({
      kind: "interpolation",
      noun: interpolation.name,
      run: (store) => {
        const removed = store.set(
          removeInterpolationWithFallbackAtom,
          interpolation.id,
        );
        return (
          removed ?? {
            ok: false as const,
            error: "This interpolation is no longer available.",
          }
        );
      },
      undo: (removed) => {
        if (!("ok" in removed))
          store.set(restoreInterpolationWithConsumersAtom, removed);
      },
    });
  }

  return (
    <article
      className={cardStyles}
      data-component="InterpolationCard"
      aria-label={interpolation.name}
      data-interpolation-id={interpolation.id}
    >
      <header className={headerStyles}>
        <div className={titleRowStyles}>
          <h3 className={titleStyles}>{interpolation.name}</h3>
          <Badge size="S" variant="neutral" fillStyle="subtle">
            {interpolationBadgeLabel(interpolation)}
          </Badge>
          {interpolation.locked && (
            <Badge size="S" variant="neutral" fillStyle="outline">
              <Lock />
              <Text>Built-in</Text>
            </Badge>
          )}
        </div>
        {!interpolation.locked && (
          <EditOnly>
            <div className={actionsStyles}>
              <InterpolationEditorDialog
                trigger={
                  <ActionButton
                    isQuiet
                    aria-label={`Edit interpolation ${interpolation.name}`}
                  >
                    <Edit />
                  </ActionButton>
                }
                title="Edit interpolation"
                createDraft={() => structuredClone(interpolation)}
                onSave={replaceInterpolation}
                onDelete={consumers.length ? undefined : deleteInterpolation}
              />
              <ActionButton
                isQuiet
                isDisabled={consumers.length > 0}
                aria-label={`Delete interpolation ${interpolation.name}`}
                onPress={deleteInterpolation}
              >
                <Delete />
              </ActionButton>
            </div>
          </EditOnly>
        )}
      </header>
      <div className={bodyStyles}>
        <InterpolationPreview interpolation={interpolation} />
        <div className={detailsStyles}>
          <p className={summaryStyles} aria-label="Summary">
            {summarizeInterpolation(interpolation)}
          </p>
          <UsedByTags consumers={consumers} />
        </div>
      </div>
    </article>
  );
}
