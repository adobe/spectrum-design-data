// Copyright 2026 Adobe. All rights reserved.
import { Tab, TabList, TabPanel, Tabs } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom, useAtomValue } from "jotai";
import {
  editingScaleTypeIdAtom,
  logicTabAtom,
  type LogicTab,
} from "../state/view/logicView";
import { FormulasView } from "../views/logic/FormulasView";
import { RulesView } from "../views/logic/RulesView";
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
const tabPanelStyles = style({ marginTop: 16 });

export default function Logic() {
  const [tab, setTab] = useAtom(logicTabAtom);
  const editingScaleTypeId = useAtomValue(editingScaleTypeIdAtom);

  if (editingScaleTypeId !== null)
    return (
      <ScaleTypeEditorLayout
        key={editingScaleTypeId}
        scaleTypeId={editingScaleTypeId}
      />
    );

  return (
    <div className="pageMainContent" data-component="Logic">
      <div className={pageStyles}>
        <header className={headerStyles}>
          <div className={headingGroupStyles}>
            <h2 className={headingStyles}>Logic</h2>
            <p className={introStyles}>
              Reusable math and rules that foundations reference.
            </p>
          </div>
        </header>
        <Tabs
          density="compact"
          aria-label="Logic sections"
          selectedKey={tab}
          onSelectionChange={(key) => setTab(String(key) as LogicTab)}
        >
          <TabList>
            <Tab id="rules">Rules</Tab>
            <Tab id="formulas">Formulas</Tab>
          </TabList>
          <TabPanel styles={tabPanelStyles} id="rules">
            <RulesView />
          </TabPanel>
          <TabPanel styles={tabPanelStyles} id="formulas">
            <FormulasView />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
