// Copyright 2026 Adobe. All rights reserved.
import { Button, Menu, MenuItem, MenuTrigger, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import { useAtomValue, useSetAtom } from "jotai";
import { EditOnly } from "../../components/editable";
import { InterpolationCard } from "../../components/logic/InterpolationCard";
import { InterpolationEditorDialog } from "../../components/logic/InterpolationEditorDialog";
import { ScaleTypeCard } from "../../components/logic/ScaleTypeCard";
import {
  addInterpolationAtom,
  interpolationsAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import { createInterpolation } from "../../features/scales/interpolationDefinition";
import {
  SCALE_TYPE_KINDS,
  type ScaleTypeKind,
} from "../../features/scales/scaleType";
import {
  editingScaleTypeIdAtom,
  NEW_SCALE_TYPE_ID,
  newScaleTypeKindAtom,
} from "../../state/view/logicView";

const viewStyles = style({ display: "flex", flexDirection: "column", gap: 32 });
const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});
const sectionHeaderStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
});
const sectionHeadingStyles = style({ font: "heading", margin: 0 });
const scaleGridStyles = style({
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fill, minmax(420px, 1fr))]",
  gap: 16,
});
const interpolationGridStyles = style({
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fill, minmax(380px, 1fr))]",
  gap: 16,
});
const emptyStyles = style({ font: "body", color: "neutral-subdued" });

export function FormulasView() {
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const interpolations = useAtomValue(interpolationsAtom);
  const addInterpolation = useSetAtom(addInterpolationAtom);
  const setEditingScaleType = useSetAtom(editingScaleTypeIdAtom);
  const setNewKind = useSetAtom(newScaleTypeKindAtom);

  function addFormula(kind: ScaleTypeKind) {
    setNewKind(kind);
    setEditingScaleType(NEW_SCALE_TYPE_ID);
  }

  return (
    <div className={viewStyles}>
      <section
        className={sectionStyles}
        aria-labelledby="logic-formulas-heading"
      >
        <div className={sectionHeaderStyles}>
          <h3 id="logic-formulas-heading" className={sectionHeadingStyles}>
            Formulas
          </h3>
          <EditOnly>
            <MenuTrigger>
              <Button variant="accent">
                <Add />
                <Text>Add formula</Text>
              </Button>
              <Menu
                aria-label="Formula type"
                onAction={(key) => addFormula(String(key) as ScaleTypeKind)}
              >
                {SCALE_TYPE_KINDS.map((kind) => (
                  <MenuItem key={kind.id} id={kind.id}>
                    {kind.label}
                  </MenuItem>
                ))}
              </Menu>
            </MenuTrigger>
          </EditOnly>
        </div>
        <div className={scaleGridStyles}>
          {scaleTypes.map((scaleType) => (
            <ScaleTypeCard key={scaleType.id} scaleType={scaleType} />
          ))}
        </div>
      </section>
      <section
        className={sectionStyles}
        aria-labelledby="logic-interpolations-heading"
      >
        <div className={sectionHeaderStyles}>
          <h3
            id="logic-interpolations-heading"
            className={sectionHeadingStyles}
          >
            Interpolations
          </h3>
          <EditOnly>
            <InterpolationEditorDialog
              trigger={
                <Button variant="accent">
                  <Add />
                  <Text>Add interpolation</Text>
                </Button>
              }
              title="New interpolation"
              createDraft={createInterpolation}
              onSave={addInterpolation}
            />
          </EditOnly>
        </div>
        {interpolations.length === 0 ? (
          <p className={emptyStyles}>No interpolations yet.</p>
        ) : (
          <div className={interpolationGridStyles}>
            {interpolations.map((interpolation) => (
              <InterpolationCard
                key={interpolation.id}
                interpolation={interpolation}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
