#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { existsSync } from "fs";
import { join } from "path";
import {
  runActCommand,
  getWorkflows,
  buildActArgs,
  createEventFile,
  checkSystemRequirements,
  PROJECT_ROOT,
  ACT_BINARY,
} from "./utils/act-helpers.js";

// Initialize MCP server
const server = new Server(
  {
    name: "act-testing-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool definitions
const tools = [
  {
    name: "list_workflows",
    description:
      "List all available GitHub Actions workflows in the repository",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "run_workflow",
    description: "Run a GitHub Actions workflow locally using act",
    inputSchema: {
      type: "object",
      properties: {
        workflow: {
          type: "string",
          description: "Workflow file name (e.g., ci.yml) or job ID",
        },
        event: {
          type: "string",
          description:
            "Event type to trigger (push, pull_request, workflow_dispatch, etc.)",
          default: "push",
        },
        dryRun: {
          type: "boolean",
          description: "Show what would run without executing",
          default: false,
        },
        verbose: {
          type: "boolean",
          description: "Enable verbose output for debugging",
          default: false,
        },
        env: {
          type: "object",
          description: "Environment variables to set for the workflow",
        },
        secrets: {
          type: "object",
          description: "Secrets to provide to the workflow",
        },
        eventData: {
          type: "object",
          description: "Custom event data to simulate specific scenarios",
        },
      },
      required: ["workflow"],
    },
  },
  {
    name: "validate_workflow",
    description: "Validate a workflow file syntax and structure",
    inputSchema: {
      type: "object",
      properties: {
        workflow: {
          type: "string",
          description: "Workflow file name to validate",
        },
      },
      required: ["workflow"],
    },
  },
  {
    name: "act_doctor",
    description: "Check act configuration and Docker setup",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// Register tools
server.setRequestHandler("tools/list", async () => {
  return { tools };
});

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_workflows": {
        const { workflows, error } = getWorkflows();
        if (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error listing workflows: ${error}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text:
                `Found ${workflows.length} workflows:\n\n` +
                workflows
                  .map(
                    (w) =>
                      `📋 **${w.workflowName}** (${w.workflowFile})\n` +
                      `   Job: ${w.jobName} (${w.jobId})\n` +
                      `   Events: ${w.events.join(", ")}\n`,
                  )
                  .join("\n"),
            },
          ],
        };
      }

      case "run_workflow": {
        const {
          workflow,
          event = "push",
          dryRun = false,
          verbose = false,
          env,
          secrets,
          eventData,
        } = args;

        let actArgs = buildActArgs({
          workflow,
          event,
          dryRun,
          verbose,
          env,
          secrets,
        });

        // Handle custom event data
        let eventFile = null;
        if (eventData) {
          eventFile = createEventFile(eventData);
          actArgs.push("--eventpath", eventFile);
        }

        const result = runActCommand(actArgs);

        // Clean up temporary event file
        if (eventFile && existsSync(eventFile)) {
          try {
            require("fs").unlinkSync(eventFile);
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? `✅ Workflow execution ${dryRun ? "(dry-run) " : ""}completed successfully!\n\n${result.output}`
                : `❌ Workflow execution failed:\n\n**Error:**\n${result.error}\n\n**Output:**\n${result.output}`,
            },
          ],
        };
      }

      case "validate_workflow": {
        const { workflow } = args;
        const workflowPath = join(PROJECT_ROOT, ".github/workflows", workflow);

        if (!existsSync(workflowPath)) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Workflow file not found: ${workflow}`,
              },
            ],
          };
        }

        // Use act to validate by doing a dry-run
        const result = runActCommand([
          "--list",
          "-W",
          `.github/workflows/${workflow}`,
        ]);

        return {
          content: [
            {
              type: "text",
              text: result.success
                ? `✅ Workflow ${workflow} is valid!\n\n${result.output}`
                : `❌ Workflow ${workflow} has issues:\n\n${result.error}`,
            },
          ],
        };
      }

      case "act_doctor": {
        const checks = checkSystemRequirements();

        const formatCheck = (check) => {
          switch (check.type) {
            case "success":
              return `✅ ${check.message}`;
            case "error":
              return `❌ ${check.message}`;
            case "info":
              return `ℹ️  ${check.message}`;
            default:
              return check.message;
          }
        };

        return {
          content: [
            {
              type: "text",
              text:
                `🔍 **Act Testing Environment Check**\n\n${checks.map(formatCheck).join("\n")}\n\n` +
                `**Project Root:** ${PROJECT_ROOT}\n` +
                `**Act Binary:** ${ACT_BINARY}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
