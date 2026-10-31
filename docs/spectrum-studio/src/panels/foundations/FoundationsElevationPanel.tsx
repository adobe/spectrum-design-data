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
  );
}
