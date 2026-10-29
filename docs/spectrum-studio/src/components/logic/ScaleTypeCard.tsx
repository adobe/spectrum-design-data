// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Badge } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Delete from "@react-spectrum/s2/icons/Delete";
import Edit from "@react-spectrum/s2/icons/Edit";
import { useAtomValue, useSetAtom } from "jotai";
import { useDeletionToast } from "../deletionToastContext";
import { EditOnly, useIsReadOnly } from "../editable";
import {
  deleteScaleTypeAtom,
  scaleTypeConsumersAtom,
} from "../../features/logic/scaleTypeReferences";
import { restoreScaleTypeAtom } from "../../features/logic/scaleTypeLibrary";
import {
  overridablePartLabels,
  scaleTypeBadgeLabel,
  scaleTypeLatex,
  summarizeScaleType,
  type ScaleType,
} from "../../features/scales/scaleType";
import { editingScaleTypeIdAtom } from "../../state/view/logicView";
import { MathFormula } from "./MathFormula";
import { ScaleSparkline } from "./ScaleSparkline";
import { UsedByTags } from "./UsedByTags";

const cardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  backgroundColor: "layer-1",
  borderRadius: "xl",
  padding: 24,
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
const actionsStyles = style({ display: "flex", gap: 4, flexShrink: 0 });
const overrideStyles = style({
  font: "detail",
  color: "neutral-subdued",
  margin: 0,
});

export function ScaleTypeCard({ scaleType }: { scaleType: ScaleType }) {
  const consumers = useAtomValue(scaleTypeConsumersAtom).filter(
    (consumer) => consumer.scaleTypeId === scaleType.id,
  );
  const setEditing = useSetAtom(editingScaleTypeIdAtom);
  const deleteFormula = useSetAtom(deleteScaleTypeAtom);
  const restoreFormula = useSetAtom(restoreScaleTypeAtom);
  const isReadOnly = useIsReadOnly();
  const { notifyDeleted } = useDeletionToast();
  const overridable = overridablePartLabels(scaleType);

  function deleteScaleType() {
    const removed = deleteFormula(scaleType.id);
    if (removed)
      notifyDeleted(`Formula ${scaleType.name}`, () => restoreFormula(removed));
  }

  return (
    <article
      className={cardStyles}
      data-component="ScaleTypeCard"
      aria-label={scaleType.name}
      data-scale-type-id={scaleType.id}
    >
      <header className={headerStyles}>
        <div className={titleRowStyles}>
          <h3 className={titleStyles}>{scaleType.name}</h3>
          <Badge size="S" variant="neutral" fillStyle="subtle">
            {scaleTypeBadgeLabel(scaleType.kind)}
          </Badge>
        </div>
        {isReadOnly ? (
          <ActionButton
            isQuiet
            aria-label={`View formula ${scaleType.name}`}
            onPress={() => setEditing(scaleType.id)}
          >
            View
          </ActionButton>
        ) : (
          <EditOnly>
            <div className={actionsStyles}>
              <ActionButton
                isQuiet
                aria-label={`Edit formula ${scaleType.name}`}
                onPress={() => setEditing(scaleType.id)}
              >
                <Edit />
              </ActionButton>
              <ActionButton
                isQuiet
                aria-label={`Delete formula ${scaleType.name}`}
                isDisabled={consumers.length > 0}
                onPress={deleteScaleType}
              >
                <Delete />
              </ActionButton>
            </div>
          </EditOnly>
        )}
      </header>
      <ScaleSparkline scaleType={scaleType} />
      <MathFormula
        latex={scaleTypeLatex(scaleType)}
        fallback={summarizeScaleType(scaleType)}
      />
      <p className={overrideStyles}>
        {overridable.length > 0
          ? `Foundations can override: ${overridable.join(", ")}`
          : "Foundations cannot override any part"}
      </p>
      <UsedByTags consumers={consumers} />
    </article>
  );
}
