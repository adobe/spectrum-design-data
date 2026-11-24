// Copyright 2026 Adobe. All rights reserved.
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { handleDiscuss, handleLoad, handleProjects, handleWatch } from "./server/handlers";
import { preferences } from "./shared/settings";
import { discussEpic, listProjects, loadRoadmap, watchRoadmap } from "./shared/roadmap";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(preferences);
  server.handle(discussEpic, (input, ctx) => handleDiscuss(input, ctx, settings));
  server.handle(listProjects, handleProjects);
  server.handle(loadRoadmap, handleLoad);
  server.handle(watchRoadmap, handleWatch);
  return () => {};
}
