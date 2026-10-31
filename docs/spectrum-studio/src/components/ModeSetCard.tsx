// Copyright 2026 Adobe. All rights reserved.
import { ActionButton } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Delete from "@react-spectrum/s2/icons/Delete";
import Edit from "@react-spectrum/s2/icons/Edit";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useNotify } from "./notifications/notificationContext";
import { MODE_ICONS } from "../features/modes/icons";
import { cloneModeSet, type Mode, type ModeSet } from "../features/modes/model";
import {
  effectiveParameterValue,
  formatParameterValue,
  FOUNDATION_PARAMETERS,
} from "../features/modes/parameters";
import {
  removeModeSetAtom,
  replaceModeSetAtom,
  restoreModeSetAtom,
} from "../features/modes/state";
import { effectiveParameterOwnersAtom } from "../features/modes/adaptiveSelectors";
import { foundationDocumentsAtom } from "../features/modes/foundationDocuments";
import { platformsAtom, resolvePlatforms } from "../features/platforms/state";
import {
  adaptiveClaimsAtom,
  claimsForModeSet,
} from "../features/modes/adaptive";
import { EditOnly } from "./editable";
import { ModeSetEditorDialog } from "./ModeSetEditorDialog";
import { foundationModeAttachmentsAtom } from "../state/view/foundationModeAttachments";

const cardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  backgroundColor: "layer-1",
  borderRadius: "xl",
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
  gridTemplateColumns:
    "minmax(140px, max-content) minmax(0, 1fr) minmax(0, 1.2fr)",
  alignItems: "start",
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
const cellStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  minWidth: 0,
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
const modeMetaStyles = style({ font: "body-sm", color: "neutral-subdued" });

export function ModeSetCard({
  modeSet,
  index,
}: {
  modeSet: ModeSet;
  index: number;
}) {
  const platforms = useAtomValue(platformsAtom);
  const adaptiveClaims = useAtomValue(adaptiveClaimsAtom);
  const attachments = useAtomValue(foundationModeAttachmentsAtom);
  const parameterOwners = useAtomValue(effectiveParameterOwnersAtom);
  const foundationDocuments = useAtomValue(foundationDocumentsAtom);
  const replaceModeSet = useSetAtom(replaceModeSetAtom);
  const store = useStore();
  const notify = useNotify();
  const modeSetIcon =
    modeSet.iconId && modeSet.iconId !== "none"
      ? MODE_ICONS[modeSet.iconId]
      : null;

  const ownedParameters = FOUNDATION_PARAMETERS.filter(
    (parameter) => parameterOwners[parameter.id] === modeSet.id,
  );

  // The default mode reports the base document values, so every row reads the same way.
  function parameterRows(mode: Mode) {
    return ownedParameters
      .map((parameter) => ({
        id: parameter.id,
        label: parameter.label,
        value: formatParameterValue(
          parameter,
          effectiveParameterValue(mode, parameter.id, foundationDocuments),
          foundationDocuments,
        ),
      }))
      .filter((row) => row.value !== "");
  }

  function deleteModeSet() {
    const claims = claimsForModeSet(adaptiveClaims, modeSet.id);
    notify.remove({
      kind: "modeSet",
      noun: modeSet.name,
      run: (store) => ({
        tokenValues: store.set(removeModeSetAtom, modeSet.id),
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
      <header className={headerStyles}>
        <div className={headingGroupStyles}>
          <h3 className={titleStyles}>{modeSet.name}</h3>
          {modeSet.description && (
            <p className={descriptionStyles}>{modeSet.description}</p>
          )}
        </div>
        <div className={actionsStyles}>
          <EditOnly>
            <ModeSetEditorDialog
              trigger={
                <ActionButton
                  isQuiet
                  aria-label={`Edit mode set ${modeSet.name}`}
                >
                  <Edit />
                </ActionButton>
              }
              title="Edit mode set"
              createDraft={() => cloneModeSet(modeSet)}
              onSave={(next) => replaceModeSet(next)}
              onDelete={deleteModeSet}
            />
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
            Supporting platforms
          </span>
          <span className={columnHeaderStyles} role="columnheader">
            System parameters
          </span>
        </div>
        {modeSet.modes.map((mode) => {
          const rows = parameterRows(mode);
          const supportingPlatforms = resolvePlatforms(
            platforms,
            mode.platformIds,
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
              <span className={cellStyles} role="cell">
                {supportingPlatforms.length > 0
                  ? supportingPlatforms
                      .map((platform) => platform.name)
                      .join(", ")
                  : "None"}
              </span>
              <span className={parameterListStyles} role="cell">
                {rows.length > 0
                  ? rows.map((row) => (
                      <span key={row.id}>
                        {row.label}:{" "}
                        <span className={parameterValueStyles}>
                          {row.value}
                        </span>
                      </span>
                    ))
                  : "None"}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}
