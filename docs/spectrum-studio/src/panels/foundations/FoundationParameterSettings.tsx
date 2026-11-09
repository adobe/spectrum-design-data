// Copyright 2026 Adobe. All rights reserved.
import { Content, ContextualHelp, Heading, Switch } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import { useIsReadOnly } from "../../components/editable";
import { useNotify } from "../../components/notifications/notificationContext";
import {
  AUTHORING_CAPABILITY_OPTIONS,
  FOUNDATION_PARAMETERS,
  type FoundationId,
} from "../../features/modes/parameters";
import {
  ADAPTIVE_SETTING_IDS,
  FOUNDATION_SETTING_IDS,
} from "../../features/modes/foundationSettings";
import {
  foundationParameterSettingsAtom,
  updateFoundationParameterSettingAtom,
} from "../../features/modes/foundationSettingsState";

const tableStyles = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 64px 72px",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});
const rowStyles = style({ display: "contents" });
const headingStyles = style({ font: "detail", color: "neutral-subdued" });

export function FoundationParameterSettings({
  foundation,
}: {
  foundation: FoundationId;
}) {
  const settings = useAtomValue(foundationParameterSettingsAtom);
  const update = useSetAtom(updateFoundationParameterSettingAtom);
  const isReadOnly = useIsReadOnly();
  const notify = useNotify();
  return (
    <div
      role="table"
      aria-label={`${foundation} parameter availability`}
      className={tableStyles}
    >
      <div role="row" className={rowStyles}>
        {["Parameter", "Modal", "Adaptive"].map((label) => (
          <span key={label} role="columnheader" className={headingStyles}>
            {label}
          </span>
        ))}
      </div>
      {FOUNDATION_SETTING_IDS.filter((id) =>
        AUTHORING_CAPABILITY_OPTIONS.some(
          (option) => option.id === id && option.foundation === foundation,
        ),
      ).map((id) => {
        const label = AUTHORING_CAPABILITY_OPTIONS.find(
          (option) => option.id === id,
        )!.label;
        const parameter = FOUNDATION_PARAMETERS.find((item) => item.id === id);
        return (
          <div key={id} role="row" className={rowStyles}>
            <span role="rowheader">
              {label}
              {parameter?.description && (
                <ContextualHelp>
                  <Heading>{label}</Heading>
                  <Content>{parameter.description}</Content>
                </ContextualHelp>
              )}
              {id === "size.componentSize" && (
                <ContextualHelp>
                  <Heading>Component size</Heading>
                  <Content>
                    Sets component dimensions, padding and corner radius. Base
                    text size sets a separate typography baseline. Global
                    spacing and borders stay unchanged. A future adaptive
                    adjustment will resize both baselines together.
                  </Content>
                </ContextualHelp>
              )}
            </span>
            {(["modal", "adaptive"] as const).map((kind) => (
              <span role="cell" key={kind}>
                {!(
                  kind === "adaptive" &&
                  (id === "size.componentSize" || id === "typography.textSize")
                ) && (
                  <Switch
                    size="S"
                    aria-label={`${kind === "modal" ? "Modal" : "Adaptive"} ${label}`}
                    isSelected={settings[id][kind]}
                    isDisabled={
                      isReadOnly ||
                      (kind === "adaptive" &&
                        !ADAPTIVE_SETTING_IDS.includes(id))
                    }
                    onChange={(value) => {
                      try {
                        update({ id, kind, value });
                      } catch (failure) {
                        notify.error(failure);
                      }
                    }}
                  />
                )}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
