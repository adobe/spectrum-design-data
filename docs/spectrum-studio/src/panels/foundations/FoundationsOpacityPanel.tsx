// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";
import { ActionButton, Badge, Divider, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import Revert from "@react-spectrum/s2/icons/Revert";
import Sort from "@react-spectrum/s2/icons/Sort";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useState } from "react";
import {
  EditableSlider,
  EditOnly,
  useIsReadOnly,
} from "../../components/editable";
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

export function FoundationsOpacityPanel() {
  const notify = useNotify();
  const document = useAtomValue(opacityDocumentAtom);
  const result = useAtomValue(opacityResultAtom);
  const appColorScheme = useAtomValue(appColorSchemeAtom);
  const readOnly = useIsReadOnly();
  const updateSettings = useSetAtom(updateOpacitySettingsAtom);
  const updateLevel = useSetAtom(updateOpacityLevelAtom);
  const sortLevels = useSetAtom(sortOpacityLevelsAtom);
  const resetOverride = useSetAtom(resetOpacityOverrideAtom);
  const store = useStore();
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
              notify.error(failure);
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
                notify.added("opacityLevel", () =>
                  store.set(addOpacityLevelAtom),
                );
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
                  notify.error(failure);
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
                        notify.error(failure);
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
                              notify.error(failure);
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
                      onPress={() =>
                        notify.remove({
                          kind: "opacityLevel",
                          noun: `Opacity ${level.scaleIndex}`,
                          run: (store) =>
                            store.set(removeOpacityLevelAtom, level.id),
                          undo: (removed) => {
                            if (removed)
                              store.set(restoreOpacityLevelAtom, removed);
                          },
                        })
                      }
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
