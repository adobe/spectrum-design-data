// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useNotify } from "../../components/notifications/notificationContext";
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
  formulasTabAtom,
  NEW_SCALE_TYPE_ID,
  newScaleTypeKindAtom,
} from "../../state/view/logicView";

const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});
const tabPanelStyles = style({ marginTop: 16 });
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
  const [tab, setTab] = useAtom(formulasTabAtom);
  const notify = useNotify();
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
    <Tabs
      density="compact"
      aria-label="Formula types"
      selectedKey={tab}
      onSelectionChange={(key) => {
        if (key === "progressions" || key === "interpolations") setTab(key);
      }}
    >
      <TabList>
        <Tab id="progressions">Progressions</Tab>
        <Tab id="interpolations">Interpolations</Tab>
      </TabList>
      <TabPanel id="progressions" styles={tabPanelStyles}>
        <section className={sectionStyles} aria-label="Progressions library">
          <EditOnly>
            <MenuTrigger>
              <Button variant="accent">
                <Add />
                <Text>Add formula</Text>
              </Button>
              <Menu
                aria-label="Formula type"
                onAction={(key) => {
                  const kind = SCALE_TYPE_KINDS.find((kind) => kind.id === key);
                  if (kind) addFormula(kind.id);
                }}
              >
                {SCALE_TYPE_KINDS.map((kind) => (
                  <MenuItem key={kind.id} id={kind.id}>
                    {kind.label}
                  </MenuItem>
                ))}
              </Menu>
            </MenuTrigger>
          </EditOnly>
          <div className={scaleGridStyles}>
            {scaleTypes.map((scaleType) => (
              <ScaleTypeCard key={scaleType.id} scaleType={scaleType} />
            ))}
          </div>
        </section>
      </TabPanel>
      <TabPanel id="interpolations" styles={tabPanelStyles}>
        <section className={sectionStyles} aria-label="Interpolations library">
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
              onSave={(interpolation) =>
                notify.added("interpolation", () => {
                  addInterpolation(interpolation);
                  return true;
                })
              }
            />
          </EditOnly>
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
      </TabPanel>
    </Tabs>
  );
}
