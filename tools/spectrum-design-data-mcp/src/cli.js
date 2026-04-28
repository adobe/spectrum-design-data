#!/usr/bin/env node

/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { Command } from "commander";
import { startServer } from "./index.js";

const program = new Command();

program
  .name("spectrum-design-data-mcp")
  .description("Model Context Protocol server for Spectrum design data")
  .version("0.1.0");

program
  .command("start")
  .description("Start the MCP server with stdio transport")
  .action(async () => {
    try {
      await startServer();
    } catch (error) {
      console.error("Failed to start MCP server:", error);
      process.exit(1);
    }
  });

// If no command is provided, default to start
if (process.argv.length === 2) {
  process.argv.push("start");
}

program.parse();
