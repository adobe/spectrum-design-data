// Copyright 2026 Adobe. All rights reserved.
import { useSettings } from "@getpaseo/plugin/client";
import { SettingsCard, SettingsInput, SettingsRow, SettingsSection } from "@getpaseo/plugin/client/ui";
import { preferences } from "../shared/settings";

export function RoadmapSettings() {
  const settings = useSettings(preferences);
  if (settings.status !== "ready") {
    return (
      <SettingsSection title="Roadmap">
        <SettingsCard>
          <SettingsRow label="Status" hint={settings.status === "error" ? settings.error : "Loading…"} />
        </SettingsCard>
      </SettingsSection>
    );
  }
  const { values, revision, save } = settings;
  return (
    <SettingsSection title="Roadmap" info="Where the Discuss action on an epic sends its message.">
      <SettingsCard>
        <SettingsInput
          label="Orchestrator agent id"
          hint="Leave empty to use the newest agent titled “Orchestrator…”."
          initialValue={values.orchestratorAgentId}
          placeholder="agent id"
          onChangeText={(text) => void save({ ...values, orchestratorAgentId: text }, revision)}
        />
      </SettingsCard>
    </SettingsSection>
  );
}
