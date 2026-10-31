# Configuration

Setting up for the first time? Follow [setup.md](setup.md) instead: this page is
the reference.

## Installing

Node.js 24 or later. Your MCP client normally starts the server with `npx`, so
there's nothing to install:

```bash
npx revolut-mcp
```

Or install it globally:

```bash
npm install -g revolut-mcp
revolut-mcp
```

To pin a specific version, append `@<version>` (e.g. `npm install -g revolut-mcp@2.0.0`).

Or build from source:

```bash
git clone https://github.com/samaxbytez/revolut-mcp.git
cd revolut-mcp
npm install
npm run build
npm start
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `REVOLUT_ACCESS_TOKEN` | Yes | Your Revolut Business API access token (valid for 40 minutes; see [setup.md](setup.md#3-authorise-the-app-and-get-an-access-token)) |
| `REVOLUT_BASE_URL` | No | API origin. Defaults to the sandbox, `https://sandbox-b2b.revolut.com`. Use `https://b2b.revolut.com` for production. Must be `https://` (plain `http://` only for localhost); any path on it is ignored |
| `REVOLUT_ENABLE_SENSITIVE_TOOLS` | No | `true` to register the 17 tools that move money, add payees or cards, invite people or change webhooks ([which](security.md#sensitive-tools)). Anything else leaves them off |

## Sandbox and production

They are separate worlds with separate tokens. The server picks one from
`REVOLUT_BASE_URL` and prints a warning on start when it is production or when
sensitive tools are on. A token only works against the environment that issued
it, so a sandbox token pointed at production is rejected rather than doing
anything. To use both, define two servers with different names:

```json
{
  "mcpServers": {
    "revolut-sandbox": {
      "command": "npx",
      "args": ["-y", "revolut-mcp"],
      "env": { "REVOLUT_ACCESS_TOKEN": "sandbox_token" }
    },
    "revolut": {
      "command": "npx",
      "args": ["-y", "revolut-mcp"],
      "env": {
        "REVOLUT_ACCESS_TOKEN": "production_token",
        "REVOLUT_BASE_URL": "https://b2b.revolut.com"
      }
    }
  }
}
```

## MCP clients

Any app that can start a local MCP server works. Each one takes the same things
in its own config format: the command `npx`, the arguments `-y revolut-mcp`, and
your `REVOLUT_*` environment variables. Restart the app after editing its config.

### Claude Desktop / Cowork

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "revolut": {
      "command": "npx",
      "args": ["-y", "revolut-mcp"],
      "env": {
        "REVOLUT_ACCESS_TOKEN": "your_access_token"
      }
    }
  }
}
```

This works with both Claude Desktop chat and Claude Cowork.

### Claude Code

Add the same block to your `.mcp.json`, or run:

```bash
claude mcp add revolut -e REVOLUT_ACCESS_TOKEN=your_access_token -- npx -y revolut-mcp
```

### Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.revolut]
command = "npx"
args = ["-y", "revolut-mcp"]
env = { REVOLUT_ACCESS_TOKEN = "your_access_token" }
```

### Cursor

Add the same `mcpServers` block as Claude Desktop to `~/.cursor/mcp.json` (all
projects) or `.cursor/mcp.json` (one project).

### Windsurf

Add the same `mcpServers` block to `~/.codeium/windsurf/mcp_config.json`.

### Gemini CLI

Add the same `mcpServers` block to `~/.gemini/settings.json`, alongside any
settings already there.

### VS Code (GitHub Copilot agent mode)

Add to `.vscode/mcp.json`. VS Code uses `servers` rather than `mcpServers`, and
can prompt for the token instead of storing it in the file:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "revolut-token",
      "description": "Revolut Business access token",
      "password": true
    }
  ],
  "servers": {
    "revolut": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "revolut-mcp"],
      "env": {
        "REVOLUT_ACCESS_TOKEN": "${input:revolut-token}"
      }
    }
  }
}
```

### Keep the token out of git

A project-level file (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`) sits
in your repository. Prefer the user-level file, or VS Code's prompt above, so the
token is never committed. A production token can move real money.

### ChatGPT and Grok

Not supported yet. This server runs on your computer and talks to its client
over stdio; ChatGPT's connectors and xAI's Grok only connect to MCP servers
hosted on the internet over HTTPS. Using it from them would need an HTTP
transport, hosting and per-user sign-in on the server.
