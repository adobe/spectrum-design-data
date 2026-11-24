// Copyright 2026 Adobe. All rights reserved.
import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { RoadmapSettings } from "./client/RoadmapSettings";
import { RoadmapScreen } from "./client/Roadmap";

function RoadmapItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="GanttChart"
      active={currentScreen?.screenId === "roadmap"}
      onPress={() => openScreen({ screenId: "roadmap" })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: "roadmap", title: "Roadmap", Component: RoadmapScreen });
  client.addSidebarHeaderItem({ id: "roadmap", title: "Roadmap", Component: RoadmapItem });
  client.addSettingsScreen({ id: "roadmap-settings", title: "Roadmap", icon: "GanttChart", Component: RoadmapSettings });
  return () => {};
}
