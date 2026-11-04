// Copyright 2026 Adobe. All rights reserved.
import { ActionButton } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Delete from "@react-spectrum/s2/icons/Delete";
import OpenIn from "@react-spectrum/s2/icons/OpenIn";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useNotify } from "./notifications/notificationContext";
import { MODE_ICONS } from "../features/modes/icons";
import type { ModeSet } from "../features/modes/model";
import {
  effectiveParameterValue,
  formatParameterValue,
  FOUNDATION_PARAMETERS,
} from "../features/modes/parameters";
import type { FoundationDocuments } from "../features/modes/parameters";
import { removeModeSetAtom, restoreModeSetAtom } from "../features/modes/state";
import { effectiveParameterOwnersAtom } from "../features/modes/adaptiveSelectors";
import { foundationDocumentsAtom } from "../features/modes/foundationDocuments";
import {
  adaptiveClaimsAtom,
  claimsForModeSet,
} from "../features/modes/adaptive";
import { EditOnly } from "./editable";
import {
  FOUNDATION_MODE_ATTACHMENT_DEFAULTS,
  foundationModeAttachmentsAtom,
} from "../state/view/foundationModeAttachments";
import { editingModeSetIdAtom } from "../state/view/modesView";
import { ModeSetPreview } from "./ModeSetPreview";
import { modeAdjustmentRows } from "../features/modes/presentation";

const cardStyles = style({
  display: "flex",
  backgroundColor: "layer-1",
  borderRadius: "xl",
  overflow: "hidden",
});
const contentStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  minWidth: 0,
  flexGrow: 1,
  padding: 24,
});
const headerStyles = style({
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  gap: 16,
});
const headingGroupStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
});
const titleStyles = style({
  font: "title-lg",
  margin: 0,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
const descriptionStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});
const actionsStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
});
const tableStyles = style({
  display: "grid",
  gridTemplateColumns: "minmax(160px, 0.8fr) minmax(0, 1fr)",
  columnGap: 24,
  rowGap: 12,
});
const rowStyles = style({ display: "contents" });
const columnHeaderStyles = style({ font: "detail", color: "neutral-subdued" });
const modeCellStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  font: "title-sm",
});
const modeIconStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});
const parameterListStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  font: "body-sm",
  color: "neutral-subdued",
  minWidth: 0,
});
const parameterValueStyles = style({ color: "neutral" });
const modeMetaStyles = style({ color: "neutral-subdued" });

function differingParameterIds(
  modeSet: ModeSet,
  documents: FoundationDocuments,
  owners: Record<string, string | undefined>,
) {
  return FOUNDATION_PARAMETERS.filter((parameter) => {
    if (owners[parameter.id] !== modeSet.id) return false;
    const values = modeSet.modes.map((mode) =>
      formatParameterValue(
        parameter,
        effectiveParameterValue(mode, parameter.id, documents),
        documents,
      ),
    );
    return new Set(values).size > 1;
  }).map((parameter) => parameter.id);
}

export function ModeSetCard({
  modeSet,
  index,
}: {
  modeSet: ModeSet;
  index: number;
}) {
  const adaptiveClaims = useAtomValue(adaptiveClaimsAtom);
  const attachments = useAtomValue(foundationModeAttachmentsAtom);
  const parameterOwners = useAtomValue(effectiveParameterOwnersAtom);
  const foundationDocuments = useAtomValue(foundationDocumentsAtom);
  const setEditing = useSetAtom(editingModeSetIdAtom);
  const store = useStore();
  const notify = useNotify();
  const modeSetIcon =
    modeSet.iconId && modeSet.iconId !== "none"
      ? MODE_ICONS[modeSet.iconId]
      : null;
  const differingIds = differingParameterIds(
    modeSet,
    foundationDocuments,
    parameterOwners,
  );

  function deleteModeSet() {
    const claims = claimsForModeSet(adaptiveClaims, modeSet.id);
    notify.remove({
      kind: "modeSet",
      noun: modeSet.name,
      run: (currentStore) => ({
        tokenValues: currentStore.set(removeModeSetAtom, modeSet.id),
        claims,
        attachments: attachments[modeSet.id],
        modeSet,
        index,
      }),
      undo: (removed) => {
        store.set(restoreModeSetAtom, {
          modeSet: removed.modeSet,
          index: removed.index,
          claims: removed.claims,
          attachments: removed.attachments,
          tokenValues: removed.tokenValues,
        });
      },
    });
  }

  return (
    <article data-component="ModeSetCard" className={cardStyles}>
      <ModeSetPreview
        modeSet={modeSet}
        foundations={
          attachments[modeSet.id] ??
          FOUNDATION_MODE_ATTACHMENT_DEFAULTS[modeSet.id] ??
          []
        }
      />
      <div className={contentStyles}>
        <header className={headerStyles}>
          <div className={headingGroupStyles}>
            <h3 className={titleStyles}>{modeSet.name}</h3>
            {modeSet.description && (
              <p className={descriptionStyles}>{modeSet.description}</p>
            )}
          </div>
          <div className={actionsStyles}>
            <ActionButton
              isQuiet
              aria-label={`Open mode set ${modeSet.name}`}
              onPress={() => setEditing(modeSet.id)}
            >
              <OpenIn />
            </ActionButton>
            <EditOnly>
              <ActionButton
                isQuiet
                aria-label={`Delete mode set ${modeSet.name}`}
                onPress={deleteModeSet}
              >
                <Delete />
              </ActionButton>
            </EditOnly>
          </div>
        </header>
        <div
          className={tableStyles}
          role="table"
          aria-label={`${modeSet.name} modes`}
        >
          <div className={rowStyles} role="row">
            <span className={columnHeaderStyles} role="columnheader">
              Modes
            </span>
            <span className={columnHeaderStyles} role="columnheader">
              Parameters
            </span>
          </div>
          {modeSet.modes.map((mode) => {
            const rows = FOUNDATION_PARAMETERS.filter((parameter) =>
              differingIds.includes(parameter.id),
            )
              .map((parameter) => ({
                id: parameter.id,
                label: parameter.label,
                value: formatParameterValue(
                  parameter,
                  effectiveParameterValue(
                    mode,
                    parameter.id,
                    foundationDocuments,
                  ),
                  foundationDocuments,
                ),
              }))
              .filter((row) => row.value !== "");
            const adjustments = modeAdjustmentRows(
              mode,
              modeSet,
              foundationDocuments.color?.settings.colorOutput,
            );
            return (
              <div key={mode.id} className={rowStyles} role="row">
                <span className={modeCellStyles} role="rowheader">
                  <span className={modeIconStyles} aria-hidden="true">
                    {modeSetIcon ?? MODE_ICONS[mode.iconId]}
                  </span>
                  <span>
                    {mode.name}
                    {mode.id === modeSet.defaultModeId && (
                      <span className={modeMetaStyles}> (default)</span>
                    )}
                  </span>
                </span>
                <span className={parameterListStyles} role="cell">
                  {[...rows, ...adjustments].length > 0 ? (
                    [...rows, ...adjustments].map((row) => (
                      <span key={row.id}>
                        {row.label}:{" "}
                        <span className={parameterValueStyles}>
                          {row.value}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
