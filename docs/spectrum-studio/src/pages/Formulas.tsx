// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { editingScaleTypeIdAtom } from "../state/view/logicView";
import { FormulasView } from "../views/logic/FormulasView";
import { ScaleTypeEditorLayout } from "./logic/ScaleTypeEditorLayout";

const pageStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 24,
  height: "full",
  minHeight: 0,
  overflow: "auto",
  padding: 24,
});
const headerStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
});
const headingGroupStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});
const headingStyles = style({ font: "heading-lg", margin: 0 });
const introStyles = style({
  font: "body",
  color: "neutral-subdued",
  margin: 0,
});
export default function Formulas() {
  const editingScaleTypeId = useAtomValue(editingScaleTypeIdAtom);

  if (editingScaleTypeId !== null)
    return (
      <ScaleTypeEditorLayout
        key={editingScaleTypeId}
        scaleTypeId={editingScaleTypeId}
      />
    );

  return (
    <div className="pageMainContent" data-component="Formulas">
      <div className={pageStyles}>
        <header className={headerStyles}>
          <div className={headingGroupStyles}>
            <h2 className={headingStyles}>Formulas</h2>
            <p className={introStyles}>
              Reusable formulas that foundations reference.
            </p>
          </div>
        </header>
        <FormulasView />
      </div>
    </div>
  );
}
