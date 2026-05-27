import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMCPServer } from "./server.js";

const server = createMCPServer();

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
