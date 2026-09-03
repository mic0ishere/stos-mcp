# STOS MCP Server

Lightweight MCP server that exposes three tools to interact with the Gdansk Tech's STOS online judge:

- `task_description` — fetches the problem text from STOS and returns it (Markdown).
- `view_task_status` — fetches the submission/status page; returns `queued` when submission is pending.
- `submit_solution` — uploads source code to STOS (always as `main.cpp`) and polls for the final verdict.

**Important:** This tool has been built only for educational/exploration purposes. You should not use it to submit solutions to STOS as part of an assignment or contest. The author is not responsible for any consequences of using this tool inappropriately.

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

You must configure credentials via a `config.json` situated in root directory or via environment variables. The following configuration options are required:

- `STOS_LOGIN` — STOS username
- `STOS_PASSWORD` — STOS password
- `STOS_PID` — problem id (default: 1678)
- `STOS_CID` — contest/course id (default: 819)

In order to protect your STOS account, the MCP is restricted to a single problem (PID) in a single contest/course (CID).

## Run

- Production (build then run):

```bash
pnpm build
pnpm start
```

By default the server connects using `StdioServerTransport` (stdin/stdout). HTTP transport is useful for connecting it to cloud-based agents.

### Running with HTTP transport

After building, run the app with `pnpm http` and connect to `http://localhost:3000`. Pass the following headers to the MCP client:

```
Authorization: Bearer <sha256hash(STOS_LOGIN:STOS_PASSWORD)>
```

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

- MCP Server: [src/index.ts](src/server.ts)
- STOS HTTP client: [src/stosClient.ts](src/stosClient.ts)
- Configuration: [src/config.ts](src/config.ts)
- Transports: [src/http.ts](src/http.ts), [src/stdio.ts](src/stdio.ts)
