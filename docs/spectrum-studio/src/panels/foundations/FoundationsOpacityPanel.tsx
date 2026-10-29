// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Badge,
  Divider,
  Text,
  ToastQueue,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import Revert from "@react-spectrum/s2/icons/Revert";
import Sort from "@react-spectrum/s2/icons/Sort";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import {
  EditableSlider,
  EditOnly,
  useIsReadOnly,
} from "../../components/editable";
import { useDeletionToast } from "../../components/deletionToastContext";
import {
  addOpacityLevelAtom,
  opacityDocumentAtom,
  opacityResultAtom,
  removeOpacityLevelAtom,
  resetOpacityOverrideAtom,
  restoreOpacityLevelAtom,
  sortOpacityLevelsAtom,
  updateOpacityLevelAtom,
  updateOpacitySettingsAtom,
} from "../../features/opacity/state";
import { appColorSchemeAtom } from "../../state/view/appAppearance";
import { FoundationModeSettings } from "./FoundationModeSettings";
import { OpacityRamp } from "../../views/opacity/OpacityRamp";

const panelStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "auto",
  padding: 16,
});
const settingsStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});
const actionStyles = style({ display: "flex", gap: 8 });
const editorStyles = style({
  display: "flex",
  alignItems: "start",
  gap: 16,
});
const controlsStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flexGrow: 1,
  minWidth: 0,
});
const tokenListStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});
const rowStyles = style({ display: "flex", alignItems: "end", gap: 8 });
const sliderStyles = style({ flexGrow: 1, minWidth: 0 });

function firstValue(value: number | number[]) {
  return Array.isArray(value) ? value[0] : value;
}

function report(failure: unknown) {
  ToastQueue.negative(
    failure instanceof Error ? failure.message : String(failure),
  );
}

export function FoundationsOpacityPanel() {
  const document = useAtomValue(opacityDocumentAtom);
  const result = useAtomValue(opacityResultAtom);
  const appColorScheme = useAtomValue(appColorSchemeAtom);
  const readOnly = useIsReadOnly();
  const updateSettings = useSetAtom(updateOpacitySettingsAtom);
  const updateLevel = useSetAtom(updateOpacityLevelAtom);
  const addLevel = useSetAtom(addOpacityLevelAtom);
  const sortLevels = useSetAtom(sortOpacityLevelsAtom);
  const removeLevel = useSetAtom(removeOpacityLevelAtom);
  const resetOverride = useSetAtom(resetOpacityOverrideAtom);
  const restoreLevel = useSetAtom(restoreOpacityLevelAtom);
  const { notifyDeleted } = useDeletionToast();
  const [focusedId, setFocusedId] = useState<string | null>(null);

  return (
    <div className={panelStyles}>
      <section className={settingsStyles} aria-label="Opacity settings">
        <EditableSlider
          label="Polarity compensation (dark modes)"
          labelPosition="side"
          value={document.polarityCompensation}
          minValue={0}
          maxValue={1}
          step={0.01}
          formatOptions={{ style: "percent" }}
          isReadOnly={readOnly}
          onChange={(value) => {
            try {
              updateSettings(firstValue(value));
            } catch (failure) {
              report(failure);
            }
          }}
        />
      </section>
      <Divider />
      <FoundationModeSettings foundation="opacity" />
      <Divider />
      <section className={settingsStyles} aria-label="Opacity swatches">
        <Text>Opacity swatches</Text>
        <EditOnly>
          <div className={actionStyles}>
            <ActionButton
              onPress={() => {
                try {
                  addLevel();
                } catch (failure) {
                  report(failure);
                }
              }}
            >
              <Add />
              <Text>Add opacity</Text>
            </ActionButton>
            <ActionButton
              onPress={() => {
                try {
                  sortLevels();
                } catch (failure) {
                  report(failure);
                }
              }}
            >
              <Sort />
              <Text>Sort</Text>
            </ActionButton>
          </div>
        </EditOnly>
        {result.issues.map((issue) => (
          <div key={issue} role="status">
            <Text>{issue}</Text>
          </div>
        ))}
        <div className={editorStyles}>
          <OpacityRamp
            ink={appColorScheme === "dark" ? "white" : "black"}
            levels={result.levels}
            focusedId={focusedId}
          />
          <div className={controlsStyles}>
            <div className={tokenListStyles}>
              {result.levels.map((level) => (
                <div
                  key={level.id}
                  className={rowStyles}
                  data-opacity-id={level.id}
                  onFocusCapture={() => setFocusedId(level.id)}
                  onBlurCapture={() =>
                    setFocusedId((current) =>
                      current === level.id ? null : current,
                    )
                  }
                >
                  <EditableSlider
                    styles={sliderStyles}
                    label={String(level.scaleIndex)}
                    labelPosition="side"
                    value={level.value}
                    minValue={0}
                    maxValue={1}
                    step={0.01}
                    formatOptions={{
                      style: "percent",
                      maximumFractionDigits: 0,
                    }}
                    onChange={(value) => {
                      try {
                        updateLevel({
                          id: level.id,
                          value: firstValue(value),
                        });
                      } catch (failure) {
                        report(failure);
                      }
                    }}
                  />
                  {level.overridden && (
                    <>
                      <Badge variant={level.stale ? "notice" : "informative"}>
                        {level.stale ? "Out of date" : "Edited"}
                      </Badge>
                      <EditOnly>
                        <ActionButton
                          isQuiet
                          aria-label={`Reset opacity ${level.scaleIndex} to generated`}
                          onPress={() => {
                            try {
                              resetOverride(level.id);
                            } catch (failure) {
                              report(failure);
                            }
                          }}
                        >
                          <Revert />
                        </ActionButton>
                      </EditOnly>
                    </>
                  )}
                  <EditOnly>
                    <ActionButton
                      isQuiet
                      aria-label={`Remove opacity ${level.scaleIndex}`}
                      onPress={() => {
                        try {
                          const removed = removeLevel(level.id);
                          notifyDeleted(`Opacity ${level.scaleIndex}`, () => {
                            try {
                              restoreLevel(removed);
                            } catch (failure) {
                              report(failure);
                            }
                          });
                        } catch (failure) {
                          report(failure);
                        }
                      }}
                    >
                      <Delete />
                    </ActionButton>
                  </EditOnly>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
