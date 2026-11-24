// Copyright 2026 Adobe. All rights reserved.
import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const preferences = defineSettings({
  id: "roadmap-preferences",
  scope: "host",
  version: 1,
  schema: z.object({
    /** Agent that receives Discuss messages. Empty: the newest agent titled "Orchestrator…". */
    orchestratorAgentId: z.string().default(""),
  }),
});
