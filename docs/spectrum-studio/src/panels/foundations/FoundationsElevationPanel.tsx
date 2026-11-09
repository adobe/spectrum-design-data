// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";

import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useIsReadOnly } from "../../components/editable";
import { authoringCapabilityOwnersAtom } from "../../features/modes/capabilities";
import {
  addShadowLayerAtom,
  elevationDocumentAtom,
  generatedElevationAtom,
  moveShadowLayerAtom,
  removeShadowLayerAtom,
  updateElevationAtom,
  updateShadowLayerAtom,
} from "../../features/elevation/state";
import { hasDuplicateElevationLevels } from "../../features/elevation/generate";
import { ElevationEditor } from "../elevation/ElevationEditor";
import {
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
} from "@react-spectrum/s2";
import { FoundationModeSettings } from "./FoundationModeSettings";
import { FoundationParameterSettings } from "./FoundationParameterSettings";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const settingsPanelStyles = style({ padding: 0 });
const settingsStyles = style({ paddingStart: 8, paddingEnd: 8 });

export function FoundationsElevationPanel() {
  const notify = useNotify();
  const document = useAtomValue(elevationDocumentAtom);
  const levels = useAtomValue(generatedElevationAtom);
  const owned = useAtomValue(authoringCapabilityOwnersAtom);
  const isReadOnly = useIsReadOnly();
  const update = useSetAtom(updateElevationAtom);
  const layer = useSetAtom(updateShadowLayerAtom);
  const add = useSetAtom(addShadowLayerAtom);
  const move = useSetAtom(moveShadowLayerAtom);
  const [error, setError] = useState<string>();
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    setError(undefined);
  }, [document, isReadOnly]);
  const attempt = (action: () => void) => {
    try {
      action();
      setError(undefined);
      return undefined;
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : String(failure);
      setError(message);
      notify.error(message);
      return message;
    }
  };
  return (
    <>
      <FoundationModeSettings
        foundation="elevation"
        before={
          <AccordionItem id="system-settings">
            <AccordionItemTitle>System settings</AccordionItemTitle>
            <AccordionItemPanel UNSAFE_className={String(settingsPanelStyles)}>
              <div className={settingsStyles}>
                <FoundationParameterSettings foundation="elevation" />
              </div>
            </AccordionItemPanel>
          </AccordionItem>
        }
      />
      <ElevationEditor
        document={document}
        owned={owned}
        isReadOnly={isReadOnly}
        error={error}
        duplicates={hasDuplicateElevationLevels(levels)}
        focusLayerId={focusId}
        onLayerFocused={(layerId) =>
          setFocusId((id) => (id === layerId ? null : id))
        }
        onChange={(patch) => attempt(() => update(patch))}
        onLayerChange={(id, patch) => attempt(() => layer({ id, patch }))}
        onAdd={() =>
          attempt(() => {
            setFocusId(add());
          })
        }
        onMove={(id, direction) => attempt(() => move({ id, direction }))}
        onRemove={(id) =>
          notify.remove({
            kind: "shadowLayer",
            run: (store) => store.set(removeShadowLayerAtom, id),
          })
        }
      />
    </>
  );
}
