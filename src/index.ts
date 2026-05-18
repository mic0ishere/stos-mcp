import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import STOS_CONFIG from "./config.js";
import StosClient from "./stosClient.js";

// Create server instance
const server = new McpServer(
  {
    name: "stos-server",
    version: "0.1.0",
    description:
      "MCP server for interacting with STOS programming solutions platform",
  },
  {
    instructions: `
This MCP server provides tools to interact with the STOS programming solutions platform. It allows fetching the task description, checking the current status of the submission, and submitting solutions directly to STOS.

Available tools:
1. task_description: Fetches the current task description from STOS.
2. view_task_status: Returns the current status of the submission (e.g., processing, processed) along with any details.
3. submit_solution: Submits source code to STOS and waits for the final verdict.

How to use:
- Begin by calling the "task_description" tool to retrieve the problem statement.
- After preparing your solution, use the "submit_solution" tool with your source code as input. It will return the verdict once the submission is processed. Wait for the response, as it may take some time for STOS to evaluate the submission.
- You can also call "view_task_status" at any time to check the current status of your submission.
`,
  },
);

// STOS client (handles login, fetching task, polling status, and submission)
const stos = new StosClient(STOS_CONFIG);

// Tool: Task Description
server.registerTool(
  "task_description",
  {
    title: "STOS Task Description",
    description: "Fetch task description from STOS",
  },
  async () => {
    try {
      const desc = await stos.getTaskDescription();
      return {
        content: [{ type: "text", text: desc }],
        structuredContent: { description: desc },
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Error: ${err?.message ?? String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// Tool: View Task Status
server.registerTool(
  "view_task_status",
  {
    title: "STOS Task Status",
    description: "Return the current status page or queued state",
  },
  async () => {
    try {
      const result = await stos.getStatus();

      return {
        content: [{ type: "text", text: result.details || "Unknown status" }],
        structuredContent: result,
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Error: ${err?.message ?? String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// Tool: Submit Solution
server.registerTool(
  "submit_solution",
  {
    title: "Submit STOS Solution",
    description: "Submit source code to STOS and wait for final verdict",
    inputSchema: {
      code: z.string().describe("Source code to submit"),
    },
  },
  async ({ code }: { code: string }) => {
    try {
      const res = await stos.submitSolution({
        code,
        timeoutMs: 120000,
      });
      return {
        content: [{ type: "text", text: res.verdict }],
        structuredContent: res,
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Error: ${err?.message ?? String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// Connect transport (stdio for local usage)
(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("STOS MCP server is running and ready to accept requests.");
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to connect MCP server:", err);
  process.exit(1);
});
