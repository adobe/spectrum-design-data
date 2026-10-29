// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import {
  selectedStructureAtom,
  structuresDocumentAtom,
} from "../../features/structures/state";
import { primitiveReferencesAtom } from "../../features/tokens/primitiveReferenceState";
import { browserModeContextAtom } from "../../features/tokens/browserState";
import { previewOverridesAtom } from "../../features/modes/previewState";
import { workingTshirtArtifactsAtom } from "../../features/design-data/tshirtState";
import { StructurePermutationsView } from "./StructurePermutationsView";
import { rulesAtom } from "../../features/logic/library";

export function StructurePermutations() {
  const structure = useAtomValue(selectedStructureAtom),
    references = useAtomValue(primitiveReferencesAtom);
  const generation = useAtomValue(workingTshirtArtifactsAtom),
    mode = useAtomValue(browserModeContextAtom);
  const preview = useAtomValue(previewOverridesAtom);
  const rules = useAtomValue(rulesAtom);
  const structures = useAtomValue(structuresDocumentAtom).structures;
  const selection = Object.fromEntries(
    JSON.parse(mode.key) as [string, string][],
  );
  return (
    <StructurePermutationsView
      structure={structure}
      references={references}
      selection={selection}
      isPreview={Object.keys(preview).length > 0}
      rules={rules}
      structures={structures}
      bundle={generation.status === "ready" ? generation.bundle : undefined}
      error={generation.status === "error" ? generation.error : undefined}
    />
  );
}
