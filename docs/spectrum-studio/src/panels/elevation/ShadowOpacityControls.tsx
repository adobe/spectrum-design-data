// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Text, ToastQueue } from "@react-spectrum/s2";
import { useAtomValue, useSetAtom } from "jotai";
import { EditableNumberField } from "../../components/editable";
import {
  elevationDocumentAtom,
  setShadowModeOpacityAtom,
} from "../../features/elevation/state";
import type { Mode, ModeSet } from "../../features/modes/model";

export function ShadowOpacityControls({
  modeSet,
  mode,
}: {
  modeSet: ModeSet;
  mode: Mode;
}) {
  const document = useAtomValue(elevationDocumentAtom);
  const update = useSetAtom(setShadowModeOpacityAtom);
  const change = (layerId: string, opacity?: number) => {
    try {
      update({ modeSetId: modeSet.id, modeId: mode.id, layerId, opacity });
    } catch (failure) {
      ToastQueue.negative(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  };
  return (
    <>
      {!document.layers.length && <Text>Add a shadow to set its opacity.</Text>}
      {document.layers.map((layer) => (
        <div key={layer.id}>
          <EditableNumberField
            label={`${layer.label} opacity (%)`}
            minValue={0}
            maxValue={100}
            value={
              mode.id === modeSet.defaultModeId
                ? layer.opacity
                : (mode.foundations.elevation?.layerOpacities?.[layer.id] ??
                  layer.opacity)
            }
            onChange={(value) => change(layer.id, value)}
          />
          {mode.id !== modeSet.defaultModeId &&
            mode.foundations.elevation?.layerOpacities?.[layer.id] !==
              undefined && (
              <ActionButton size="S" onPress={() => change(layer.id)}>
                Use default opacity
              </ActionButton>
            )}
        </div>
      ))}
    </>
  );
}
