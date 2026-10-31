# AGENTS.md

Project guidance for Claude Code working in this repository.

## What this is

`revolut-mcp` — an MCP (Model Context Protocol) server that exposes the
[Revolut Business API](https://developer.revolut.com/docs/business/business-api)
as tools for LLM clients. TypeScript, ESM, published to npm, driven over stdio.
It moves real money in production: treat every change accordingly.

## Architecture

```
src/
├── index.ts    # Entry point: reads env, builds the McpServer, applies the tool policy, registers every group
├── client.ts   # RevolutClient — fetch wrapper (get/postJson/putJson/patchJson/deleteReq) with the request guards
├── policy.ts   # withToolPolicy: MCP annotations for every tool, sensitive tools gated behind REVOLUT_ENABLE_SENSITIVE_TOOLS
├── utils.ts    # Shared schemas (uuid, requestId, ...) and helpers: jsonResponse, listResponse, errorResponse, definedOnly, buildParams, logToolCall
└── tools/      # One file per Revolut resource, each exporting registerXxxTools(server, client)
scripts/        # bundle.mjs (esbuild), smoke.mjs (starts the bundle over MCP)
```

Tests are co-located as `*.test.ts` and run with **vitest**. `npm run build`
bundles everything (server, MCP SDK, zod) into `build/index.js` with esbuild
(`scripts/bundle.mjs`): the published package has no runtime dependencies, so
keep the SDK and zod in devDependencies and don't add runtime `dependencies`.

## Tool pattern

Every resource file exports a `registerXxxTools(server, client)` function and
registers tools with `server.registerTool(...)`. Each handler:

1. Calls `logToolCall(name, args)` first (it logs argument names, never values).
2. Uses the `client` to hit the API (paths like `` `/api/1.0/accounts/${id}` ``).
3. Wraps the result in `jsonResponse(data)` (`listResponse` for lists) and errors in `errorResponse(err)`.
4. Uses `definedOnly(...)` for request bodies and `buildParams(...)` for query strings.

To add a tool, use the `/add-tool` command — it scaffolds handler, registration,
and test following this pattern.

## Security conventions (this repo's threat model is indirect prompt injection)

Text Revolut returns (counterparty names, payment references) can be written by
third parties, so every tool argument is attacker-controlled.

- **IDs** → always `uuid` (or `transactionId`) from `utils.ts`, never a plain
  `z.string()`: IDs are interpolated into request paths. The "path parameters
  across all tools" test in `tools.test.ts` enforces this for every argument that
  reaches a path.
- **Money tools** → `requestId` (idempotency key), `moneyAmount`, `currencyCode`.
- **Sensitive tools** (move money, add a payee or card, change limits, invite
  people, send data out) → add the name to `SENSITIVE_TOOLS` in `policy.ts` and
  to `SENSITIVE` in `scripts/smoke.mjs`. They are not registered unless
  `REVOLUT_ENABLE_SENSITIVE_TOOLS=true`. Do not make that the default.
- **`client.ts`** rejects absolute URLs and dot segments (raw or encoded),
  verifies the resolved URL's origin and that its path is under `/api/N.N/`,
  sets a 30s timeout and `redirect: "error"`. Never weaken any of it: it keeps
  the bearer token on one host.
- **Errors** never echo a non-JSON body; 429 reports `Retry-After`.
- **The token** lives in memory only. Never log it, put it in an error, or write
  it to disk. This server has no file reads, no OAuth flow and no subprocesses —
  if one is ever added it needs the confinement and `execFile` rules in git history
- **Lists** → `listResponse` so a full page is flagged as possibly truncated.
- **Logs** never contain argument values (account numbers, names, amounts).

## Conventions

- **Commits & PR titles**: Conventional Commits (`feat:`, `fix:`, `chore:`,
  `docs:`, `refactor:`, `test:`, `ci:`, `perf:`). `main` uses **squash merges**,
  so the **PR title becomes the commit** the release tooling reads — keep it valid.
- **Never push to `main`** — branch and open a PR for everything, including config.
- **Tests must pass**: `npm test`, plus `npm run lint`, `npm run type-check`,
  `npm run build` and `npm run smoke`.
- **Docs**: the README is a front page and the detail lives in `docs/` (map:
  [docs/README.md](docs/README.md)). Tool counts and tables are kept in sync by
  hand: run `/sync-tool-count` after adding, removing or renaming a tool.

## Releasing (never publish or tag by hand)

Conventional commits drive it. Run `/release` to open the release PR (version
bump + changelog); merging that PR triggers `publish.yml`, which publishes to npm
via OIDC after a reviewer approves the `npm-publish` environment, and creates the
tag + GitHub Release. Full detail in [RELEASING.md](RELEASING.md).

## Don'ts

- Don't run `npm publish` or create tags manually.
- Don't commit secrets, tokens or private keys.
- Don't relax `uuid` / the client guards / the sensitive-tool gate.
- Don't add runtime `dependencies`.
