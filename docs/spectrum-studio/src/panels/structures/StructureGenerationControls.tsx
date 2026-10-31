// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Checkbox } from "@react-spectrum/s2";
import Edit from "@react-spectrum/s2/icons/Edit";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import { rulesAtom } from "../../features/logic/library";
import { primitiveReferencesAtom } from "../../features/tokens/primitiveReferenceState";
import { authoringSnapshotAtom } from "../../features/edit-session/state";
import { buildTshirtArtifacts } from "../../features/design-data/tshirtArtifacts";
import { SIZE_TERM_IDS } from "../../features/taxonomy/variantVocabulary";
import {
  applyStructureRuleAtom,
  setStructureSizesAtom,
} from "../../features/structures/state";
import {
  structureGeneration,
  type Structure,
} from "../../features/structures/model";
import { StructureRuleDialog } from "./StructureRuleDialog";
import { Picker } from "../../components/fields/Picker";
import { PickerItem } from "@react-spectrum/s2";

export function StructureGenerationControls({
  structure,
  isReadOnly,
  report,
}: {
  structure: Structure;
  isReadOnly: boolean;
  report: (error: unknown) => void;
}) {
  const rules = useAtomValue(rulesAtom);
  const references = useAtomValue(primitiveReferencesAtom);
  const snapshot = useAtomValue(authoringSnapshotAtom);
  const setSizes = useSetAtom(setStructureSizesAtom);
  const apply = useSetAtom(applyStructureRuleAtom);
  const generation = structureGeneration(structure);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const application =
    generation.applications.find((item) => item.id === applicationId) ??
    generation.applications[0];
  return (
    <>
      <div className="structureCompactRow">
        <Checkbox
          size="S"
          isSelected={generation.sizeTermIds.length > 1}
          isDisabled={isReadOnly}
          onChange={(enabled) => {
            try {
              setSizes({
                structureId: structure.conceptId,
                sizeTermIds: enabled
                  ? Object.values(SIZE_TERM_IDS)
                  : [SIZE_TERM_IDS.m],
              });
            } catch (error) {
              report(error);
            }
          }}
        >
          T-shirt sizes
        </Checkbox>
        {!isReadOnly && (
          <StructureRuleDialog
            structure={structure}
            rules={rules}
            references={references}
            application={application}
            trigger={
              <ActionButton
                size="S"
                isQuiet
                aria-label="Edit T-shirt size bindings"
              >
                <Edit />
              </ActionButton>
            }
            onApply={(next) =>
              apply({ structureId: structure.conceptId, application: next })
            }
            preview={(next) =>
              buildTshirtArtifacts({
                ...snapshot,
                structures: {
                  ...snapshot.structures!,
                  structures: snapshot.structures!.structures.map((source) =>
                    source.conceptId === structure.conceptId
                      ? {
                          ...source,
                          generation: {
                            ...generation,
                            applications: [
                              ...generation.applications.filter(
                                (item) => item.id !== next.id,
                              ),
                              next,
                            ],
                          },
                        }
                      : source,
                  ),
                },
              })
            }
          />
        )}
      </div>
      {generation.applications.length > 1 && (
        <Picker
          size="S"
          label="Sizing rule application"
          selectedKey={application?.id}
          onSelectionChange={(key) => setApplicationId(String(key))}
        >
          {generation.applications.map((item) => (
            <PickerItem id={item.id} key={item.id}>
              {rules.find((rule) => rule.id === item.ruleId)?.name ??
                "Unavailable rule"}
            </PickerItem>
          ))}
        </Picker>
      )}
    </>
  );
}
