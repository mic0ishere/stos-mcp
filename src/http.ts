import { createServer } from "node:http";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import crypto from "crypto";

import { createMCPServer } from "./server.js";
import STOS_CONFIG from "./config.js";

const AUTHORIZATION_HEADER = `Bearer ${crypto
  .createHash("sha256")
  .update(`${STOS_CONFIG.STOS_LOGIN}:${STOS_CONFIG.STOS_PASSWORD}`)
  .digest("hex")}`;

const app = createServer(async (req, res) => {
  if (AUTHORIZATION_HEADER) {
    const authHeader = req.headers["authorization"] || "";
    if (authHeader !== AUTHORIZATION_HEADER) {
      res.statusCode = 401;
      res.end("Unauthorized");
      return;
    }
  }

  const server = createMCPServer();

  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.on("error", (err) => {
  console.error("HTTP server error:", err);
});

app.on("listening", () => {
  console.log("HTTP server is listening on port 3000");
  console.log("Use the following Authorization header for authentication:");
  console.log(`Authorization: ${AUTHORIZATION_HEADER}`);
});

app.listen(3000);
