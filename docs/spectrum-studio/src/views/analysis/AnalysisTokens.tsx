// Copyright 2026 Adobe. All rights reserved.
import { useMemo, useState } from "react";
import { atom, useAtomValue, useStore } from "jotai";
import { DialogContainer } from "@react-spectrum/s2";
import { editModeAtom } from "../../state/view/editMode";
import {
  authoringSnapshotAtom,
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../features/edit-session/state";
import { analysisAuthoringAtom } from "../../features/design-data/state";
import { tokenDialogCatalogAtom } from "../../features/tokens/dialogState";
import {
  referenceOverrideIndex,
  applyReferenceOverridesAtom,
  type ReferenceOverride,
} from "../../features/design-data/referenceOverrides";
import type {
  ColorOpacityAssessment,
  ColorOpacityRow,
} from "../../features/design-data/colorOpacityAssessment";
import type { AnalysisDataset } from "../../features/design-data/analysisWork";
import {
  modePreviewSurface,
  type ElementsSurfaceStyle,
} from "../../features/color-system/previewSurface";
import { modesForSelection } from "../../features/modes/combinations";
import { canonicalJson } from "../../features/design-data/canonicalJson";
import { ColorOpacityTable } from "./ColorOpacityTable";
import { ReferenceOverrideDialog } from "./ReferenceOverrideDialog";

const editingCatalogAtom = atom((get) =>
  get(editModeAtom) ? get(tokenDialogCatalogAtom) : null,
);

interface AnalysisTokensProps {
  assessment: ColorOpacityAssessment;
  dataset: AnalysisDataset;
  onApplied: () => void;
}

export function AnalysisTokens(props: AnalysisTokensProps) {
  const isEditing = useAtomValue(editModeAtom);
  return (
    <AnalysisTokensContent
      key={isEditing ? "editing" : "readonly"}
      {...props}
      isEditing={isEditing}
    />
  );
}

function AnalysisTokensContent({
  assessment,
  dataset,
  onApplied,
  isEditing,
}: AnalysisTokensProps & { isEditing: boolean }) {
  const store = useStore();
  const catalog = useAtomValue(editingCatalogAtom);
  const authoring = useAtomValue(analysisAuthoringAtom);
  const defaults = useMemo(() => createDefaultSnapshot(), []);
  const source = dataset === "defaults" ? defaults : authoring[dataset];
  const eligibility = useMemo(
    () =>
      catalog?.status === "ready"
        ? referenceOverrideIndex(
            assessment,
            catalog.rows,
            catalog.snapshot.modeSets,
          )
        : undefined,
    [assessment, catalog],
  );
  const [dialog, setDialog] = useState<{
    assessment: ColorOpacityAssessment;
    expected: EditSessionSnapshot;
    targets: ReferenceOverride[];
  }>();
  const surfaces = useMemo(() => {
    const contexts = new Map(
      assessment.concepts
        .filter((concept) => concept.type === "opacity")
        .flatMap((concept) =>
          concept.rows.map(
            (row) =>
              [
                canonicalJson(row.appContext ?? {}),
                row.appContext ?? {},
              ] as const,
          ),
        ),
    );
    return new Map<string, { surface?: ElementsSurfaceStyle; error?: string }>(
      [...contexts].map(([key, context]) => {
        try {
          const selection = Object.fromEntries(
            source.modeSets
              .map((set) => [
                set.id,
                context[set.key] === undefined
                  ? set.defaultModeId
                  : source.modeSets
                      .find((item) => item.key === set.key)
                      ?.modes.find((mode) => mode.key === context[set.key])?.id,
              ])
              .filter(
                (entry): entry is [string, string] =>
                  typeof entry[1] === "string",
              ),
          );
          if (
            Object.keys(context).some(
              (axis) =>
                !source.modeSets.some(
                  (set) =>
                    set.key === axis &&
                    set.modes.some((mode) => mode.key === context[axis]),
                ),
            )
          )
            throw new Error(
              "The authored preview surface has no matching mode.",
            );
          return [
            key,
            {
              surface: modePreviewSurface(
                source.colorSystem,
                modesForSelection(source.modeSets, selection),
                source.modeSets,
              ),
            },
          ] as const;
        } catch (failure) {
          return [
            key,
            {
              error:
                failure instanceof Error ? failure.message : String(failure),
            },
          ] as const;
        }
      }),
    );
  }, [assessment, source]);
  const surfaceForRow = (row: ColorOpacityRow) =>
    surfaces.get(canonicalJson(row.appContext ?? {}))?.surface;
  return (
    <>
      {catalog?.status === "unavailable" && (
        <p role="status" className="analysisError">
          {catalog.error}
        </p>
      )}
      {[
        ...new Set(
          [...surfaces.values()].flatMap((value) =>
            value.error ? [value.error] : [],
          ),
        ),
      ].map((error) => (
        <p key={error} role="status" className="analysisError">
          {error}
        </p>
      ))}
      <ColorOpacityTable
        assessment={assessment}
        modeSets={source.modeSets}
        isEditing={isEditing}
        eligibility={eligibility}
        surfaceForRow={surfaceForRow}
        onBulkEdit={(ids) => {
          const targets = ids.flatMap(
            (id) => eligibility?.get(id)?.targets ?? [],
          );
          if (targets.length)
            setDialog({
              assessment,
              expected: store.get(authoringSnapshotAtom),
              targets,
            });
        }}
      />
      <DialogContainer onDismiss={() => setDialog(undefined)}>
        {dialog && isEditing && (
          <ReferenceOverrideDialog
            count={new Set(dialog.targets.map((target) => target.tokenId)).size}
            onClose={() => setDialog(undefined)}
            onApply={() => {
              if (assessment !== dialog.assessment)
                throw new Error(
                  "The comparison changed. Reopen Bulk edit before applying overrides.",
                );
              store.set(applyReferenceOverridesAtom, {
                expected: dialog.expected,
                targets: dialog.targets,
              });
              onApplied();
            }}
          />
        )}
      </DialogContainer>
    </>
  );
}
