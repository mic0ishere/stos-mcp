# STOS MCP Server

Lightweight MCP server that exposes three tools to interact with the STOS online judge:

- `task_description` — fetches the problem text from STOS and returns it (Markdown).
- `view_task_status` — fetches the submission/status page; returns `queued` when submission is pending.
- `submit_solution` — uploads source code to STOS (always as `main.cpp`) and polls for the final verdict.

## Features

- MCP tools for fetching problem text, viewing status, and submitting solutions.
- Uses a configurable STOS HTTP client with realistic `User-Agent` and session cookie handling.
- Compatible with MCP clients that use the SDK (stdio or Streamable HTTP transports).

## Prerequisites

- Node.js 18+
- pnpm (preferred package manager)

## Install

```bash
pnpm install
pnpm build
```

## Configuration

You must configure credentials via a `config.json` situated in root directory.

- `STOS_LOGIN` — STOS username
- `STOS_PASSWORD` — STOS password
- `STOS_PID` — problem id (default: 1678)
- `STOS_CID` — contest/course id (default: 819)

## Run

- Production (build then run):

```bash
pnpm build
pnpm start
```

By default the server connects using `StdioServerTransport` (stdin/stdout). To expose the MCP server over HTTP change the transport in `src/index.ts` to use Streamable HTTP examples from the MCP SDK.

## Tools (MCP)

The server registers the following tools (tool names are the MCP tool IDs):

- `task_description` — no input, returns `structuredContent.description` (Markdown)
- `view_task_status` — no input, returns `structuredContent.status` (string) or `queued`
- `submit_solution` — input schema: `{ code: string, filename?: string, language?: string }`; server submits `code` as `main.cpp` and returns verdict text

Example `submit_solution` call (JSON argument to the MCP tool):

```json
{ "code": "#include <iostream>\nint main(){ std::cout<<\"0\\n\"; return 0; }" }
```

## Implementation notes

- Main server entry: [src/index.ts](src/index.ts)
- STOS HTTP client: [src/stosClient.ts](src/stosClient.ts)
- Configuration: [src/config.ts](src/config.ts)
