# revolut-mcp

[![CI](https://github.com/samaxbytez/revolut-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/samaxbytez/revolut-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/revolut-mcp.svg)](https://www.npmjs.com/package/revolut-mcp)
![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-5FA04E?logo=nodedotjs&logoColor=white)
![MCP SDK 1.32](https://img.shields.io/badge/MCP_SDK-1.32-555555)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<!-- The Node.js and MCP SDK badges are static: change them with package.json's engines and @modelcontextprotocol/sdk. -->

An [MCP](https://modelcontextprotocol.io) server that gives Claude, Codex, Cursor,
VS Code, Gemini CLI or any other MCP client the
[Revolut Business API](https://developer.revolut.com/docs/business/business-api):
56 tools for accounts, transactions, counterparties, payments, transfers,
currency exchange, cards, expenses, payment drafts, payout links, team members
and webhooks.

Text that comes back from Revolut, such as a counterparty's name or a payment
reference, can be written by someone outside your business, so the server assumes
it may carry instructions aimed at the model. **The tools that move money, add a
payee or card, invite people or change webhooks are off by default** (17 of the
56), every tool says whether it reads, writes or deletes, and every request is
pinned to the Revolut API host.

## Contents

- [How it fits together](#how-it-fits-together)
- [Quick start](#quick-start)
- [What it can do](#what-it-can-do)
- [Settings](#settings)
- [Development](#development)
- [Documentation](#documentation)
- [Links](#links)

## How it fits together

```
Claude, Codex, Cursor, VS Code, … ──stdio──▶ revolut-mcp (Node.js, on your machine)
                                                  ├─ 39 tools; 17 sensitive ones only with REVOLUT_ENABLE_SENSITIVE_TOOLS
                                                  ├─ access token from your config, held in memory, never logged
                                                  └──HTTPS, your bearer token──▶ b2b.revolut.com (or the sandbox)
```

The server runs locally, started by your MCP client, and talks to nothing but
Revolut's API. That's also why ChatGPT and Grok can't use it yet: they only
connect to MCP servers hosted on the internet
([details](docs/configuration.md#chatgpt-and-grok)).

## Quick start

Node.js 24 or later and a Revolut Business account. Start in the sandbox.
**New to this? Follow the step-by-step guide: [docs/setup.md](docs/setup.md).**

1. **Create the API certificate and client ID.** Generate a key pair with
   `openssl`, add the certificate under **Settings → APIs → Business API** in
   Revolut Business, and copy the client ID.
2. **Get an access token.** Authorise the app, then exchange the code for an
   access token (valid for 40 minutes) with a signed client assertion:
   [the exact commands](docs/setup.md#3-authorise-the-app-and-get-an-access-token).
3. **Add it to Claude**: `claude_desktop_config.json` for Claude Desktop and
   Cowork (on macOS in `~/Library/Application Support/Claude/`), `.mcp.json` for
   Claude Code. Then restart the client. Codex CLI, Cursor, VS Code, Windsurf and
   Gemini CLI take the same command and token in their own config file:
   [docs/configuration.md](docs/configuration.md#mcp-clients).

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

Check it works by asking "List my Revolut accounts". Every setting, production,
and installing globally or from source: [docs/configuration.md](docs/configuration.md).

## What it can do

| Area | Tools | |
| --- | --- | --- |
| Accounts | 3 | Balances and full bank details (IBAN, sort code, ...) |
| Transactions | 2 | List with filters, look up by ID or `request_id` |
| Counterparties | 5 | List, look up, delete, validate names (CoP/VoP); create (sensitive) |
| Transfers | 3 | Pay a counterparty, move money between your accounts (sensitive) |
| Foreign exchange | 3 | Rates and reasons; exchange money (sensitive) |
| Payment drafts | 4 | List, look up, delete; create (sensitive) |
| Payout links | 4 | List, look up, cancel; create (sensitive) |
| Cards | 12 | List, look up, freeze, lock, terminate; create and change (sensitive) |
| Card invitations | 5 | List, look up, cancel; create and change (sensitive) |
| Expenses | 2 | List and look up |
| Team members | 4 | List members and roles, remove; invite (sensitive) |
| Webhooks | 7 | List, look up, delete, failed events; create, update, rotate secret (sensitive) |
| Simulations | 2 | Sandbox top-ups and transfer states |

List tools page by date (`created_before`/`limit` or `from`/`to`/`count`) and say
when a full page may hide more. Every tool, its endpoint and the input checks:
[docs/tools.md](docs/tools.md).

## Settings

| Variable | Required | What |
| --- | --- | --- |
| `REVOLUT_ACCESS_TOKEN` | Yes | Your Revolut Business API access token |
| `REVOLUT_BASE_URL` | No | `https://b2b.revolut.com` for production; defaults to the sandbox |
| `REVOLUT_ENABLE_SENSITIVE_TOOLS` | No | `true` to turn on payments, transfers, exchanges, payout links, drafts, new payees, card changes, team invitations and webhook changes |

Why the sensitive tools are off and how requests are guarded:
[docs/security.md](docs/security.md). Something not working:
[docs/troubleshooting.md](docs/troubleshooting.md).

## Development

```bash
npm install
npm run lint && npm run type-check && npm test && npm run build && npm run smoke
```

CI runs the same on Node 24 for every pull request (`test (24)`, required on
`main`). Commits and PR titles are conventional (`feat:`, `fix:`, `docs:` and so
on); `main` squash-merges, so the PR title is the commit. Releases are opened by
hand with `/release`, and merging the release PR publishes to npm
([RELEASING.md](RELEASING.md)). [AGENTS.md](AGENTS.md) has the rules that don't
bend; what's where and adding a tool: [docs/development.md](docs/development.md).

## Documentation

The whole map is [docs/README.md](docs/README.md).

| Doc | What |
| --- | --- |
| [docs/setup.md](docs/setup.md) | Step by step: certificate, client ID, access token, adding it to your AI app |
| [docs/configuration.md](docs/configuration.md) | Every setting, sandbox and production, config for each MCP client |
| [docs/tools.md](docs/tools.md) | All 56 tools, pagination, input checks, annotations |
| [docs/security.md](docs/security.md) | The threat model, sensitive tools, request guards, the token |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Common errors and fixes |
| [docs/development.md](docs/development.md) | Building, testing, what's where, adding a tool |
| [AGENTS.md](AGENTS.md) | How to work here, and the rules that don't bend |
| [RELEASING.md](RELEASING.md) | The release procedure |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each version |

## Links

- [npm package](https://www.npmjs.com/package/revolut-mcp)
- [Revolut Business API docs](https://developer.revolut.com/docs/business/business-api)
- [Issues](https://github.com/samaxbytez/revolut-mcp/issues)

## License

MIT
