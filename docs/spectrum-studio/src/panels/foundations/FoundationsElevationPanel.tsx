// Copyright 2026 Adobe. All rights reserved.
import { ToastQueue } from "@react-spectrum/s2";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useIsReadOnly } from "../../components/editable";
import { useDeletionToast } from "../../components/deletionToastContext";
import { authoringCapabilityOwnersAtom } from "../../features/modes/capabilities";
import {
  addShadowLayerAtom,
  elevationDocumentAtom,
  generatedElevationAtom,
  moveShadowLayerAtom,
  removeShadowLayerAtom,
  restoreShadowLayerAtom,
  updateElevationAtom,
  updateShadowLayerAtom,
} from "../../features/elevation/state";
import { hasDuplicateElevationLevels } from "../../features/elevation/generate";
import { ElevationEditor } from "../elevation/ElevationEditor";

export function FoundationsElevationPanel() {
  const document = useAtomValue(elevationDocumentAtom);
  const levels = useAtomValue(generatedElevationAtom);
  const owned = useAtomValue(authoringCapabilityOwnersAtom);
  const isReadOnly = useIsReadOnly();
  const update = useSetAtom(updateElevationAtom);
  const layer = useSetAtom(updateShadowLayerAtom);
  const add = useSetAtom(addShadowLayerAtom);
  const remove = useSetAtom(removeShadowLayerAtom);
  const restore = useSetAtom(restoreShadowLayerAtom);
  const move = useSetAtom(moveShadowLayerAtom);
  const { notifyDeleted } = useDeletionToast();
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
      ToastQueue.negative(message);
      return message;
    }
  };
  return (
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
        attempt(() => {
          const removed = remove(id);
          notifyDeleted(removed.layer.label, () =>
            attempt(() => restore(removed)),
          );
        })
      }
    />
  );
}
