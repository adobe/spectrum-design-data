// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../features/taxonomy/termPresentation";
import { ActionButton, Checkbox, PickerItem, Text } from "@react-spectrum/s2";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Delete from "@react-spectrum/s2/icons/Delete";
import { useNotify } from "../../components/notifications/notificationContext";
import {
  EditableNumberField,
  EditablePicker,
  EditOnly,
  useIsReadOnly,
} from "../../components/editable";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
  addSurfaceAtom,
  removeSurfaceAtom,
  restoreSurfaceAtom,
  surfaceRole,
  updateSurfaceAtom,
} from "../../features/color-system/state";
import { ColorScalePicker } from "../../components/color-picker/ColorScalePicker";
import type { SurfacePreviewRole } from "../../features/color-system/model";
import { SourceNameEditor } from "../registry/SourceNameEditor";
import { taxonomySurfaceSourceId } from "../../features/taxonomy/model";

const editorStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});
const rowStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  borderRadius: "default",
  backgroundColor: "layer-1",
});
const actionStyles = style({ display: "flex", gap: 8, alignItems: "center" });

const previewRoles: Array<{ id: SurfacePreviewRole; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "nest", label: "Nests in itself" },
  { id: "applied", label: "Applied on each context" },
  { id: "once", label: "Once on base" },
  { id: "hidden", label: "Hidden" },
];

export function SurfaceEditor() {
  const document = useAtomValue(colorSystemDocumentAtom);
  const resolvedDocument = useAtomValue(resolvedColorSystemDocumentAtom);
  const store = useStore();
  const notify = useNotify();
  const updateSurface = useSetAtom(updateSurfaceAtom);
  const isReadOnly = useIsReadOnly();
  return (
    <div className={editorStyles}>
      <EditOnly>
        <ActionButton
          onPress={() =>
            notify.added("surface", () => store.set(addSurfaceAtom))
          }
        >
          <Add />
          <Text>Add surface</Text>
        </ActionButton>
      </EditOnly>
      {document.surfaces.map((surface) => {
        if (surface.base) return <Text key={surface.id}>Base surface</Text>;
        const maximumContrast = surface.expanded ? 12 : 3;
        return (
          <div key={surface.id} className={rowStyles}>
            <div className={actionStyles}>
              <Text>{termLabel(surface.name)}</Text>
              <EditOnly>
                <ActionButton
                  isQuiet
                  aria-label={`Delete surface ${termLabel(surface.name)}`}
                  onPress={() => {
                    notify.remove({
                      kind: "surface",
                      noun: termLabel(surface.name),
                      run: (store) => {
                        const currentIndex = store
                          .get(colorSystemDocumentAtom)
                          .surfaces.findIndex((item) => item.id === surface.id);
                        if (currentIndex < 0)
                          return {
                            ok: false as const,
                            error: "This surface is no longer available.",
                          };
                        store.set(removeSurfaceAtom, surface.id);
                        const remains = store
                          .get(colorSystemDocumentAtom)
                          .surfaces.some((item) => item.id === surface.id);
                        return remains
                          ? {
                              ok: false as const,
                              error: "At least one surface must remain.",
                            }
                          : { surface, index: currentIndex };
                      },
                      undo: (removed) => {
                        if (!("ok" in removed))
                          store.set(restoreSurfaceAtom, removed);
                      },
                    });
                  }}
                >
                  <Delete />
                </ActionButton>
              </EditOnly>
            </div>
            <SourceNameEditor
              sourceId={taxonomySurfaceSourceId(surface.id)}
              label="Surface name"
            />
            <ColorScalePicker
              label="Tint"
              document={resolvedDocument}
              selectedKey={surface.sourceScaleId ?? "base"}
              baseOption={{ id: "base", label: "Base color" }}
              onSelectionChange={(id) =>
                updateSurface({
                  id: surface.id,
                  patch: {
                    sourceScaleId: id === "base" ? undefined : id,
                    source: "base",
                  },
                })
              }
            />
            <EditablePicker
              label="Reference"
              selectedKey={surface.reference ?? "parent"}
              displayValue={
                (surface.reference ?? "parent") === "base" ? "Base" : "Parent"
              }
              onSelectionChange={(key) =>
                updateSurface({
                  id: surface.id,
                  patch: { reference: String(key) as "parent" | "base" },
                })
              }
            >
              <PickerItem id="parent">Parent</PickerItem>
              <PickerItem id="base">Base</PickerItem>
            </EditablePicker>
            <EditablePicker
              label="Preview role"
              selectedKey={surface.previewRole}
              displayValue={
                previewRoles.find((role) => role.id === surface.previewRole)
                  ?.label ?? ""
              }
              onSelectionChange={(key) =>
                updateSurface({
                  id: surface.id,
                  patch: { previewRole: String(key) as SurfacePreviewRole },
                })
              }
            >
              {previewRoles.map((role) => (
                <PickerItem key={role.id} id={role.id}>
                  {role.label}
                </PickerItem>
              ))}
            </EditablePicker>
            <Text>Effective role: {surfaceRole(surface)}</Text>
            <EditableNumberField
              label="Contrast"
              value={surface.contrast ?? 1}
              minValue={1}
              maxValue={maximumContrast}
              step={0.01}
              onChange={(value) =>
                value !== null &&
                updateSurface({ id: surface.id, patch: { contrast: value } })
              }
            />
            <Checkbox
              isDisabled={isReadOnly}
              isSelected={surface.expanded}
              onChange={(expanded) =>
                updateSurface({ id: surface.id, patch: { expanded } })
              }
            >
              Expanded contrast range
            </Checkbox>
            <Checkbox
              isDisabled={isReadOnly}
              isSelected={surface.forceDark}
              onChange={(forceDark) =>
                updateSurface({ id: surface.id, patch: { forceDark } })
              }
            >
              Force darker
            </Checkbox>
            <Checkbox
              isDisabled={isReadOnly}
              isSelected={surface.showInPreview}
              onChange={(showInPreview) =>
                updateSurface({ id: surface.id, patch: { showInPreview } })
              }
            >
              Show in preview
            </Checkbox>
          </div>
        );
      })}
    </div>
  );
}
