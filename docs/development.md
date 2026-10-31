# Development

Node.js 24 or later. [AGENTS.md](../AGENTS.md) has the conventions and the
security rules that don't bend: read it before changing anything.

```bash
npm install
npm run type-check
npm test               # vitest, no network: the client is mocked
npm run test:watch
npm run lint
npm run format
npm run build          # bundle into build/index.js (scripts/bundle.mjs)
npm run smoke          # start the bundle over MCP and check what clients see
```

The published package has **no runtime dependencies**: `npm run build` bundles the
server, the MCP SDK and zod into one file with esbuild, plus
`build/THIRD_PARTY_LICENSES.txt` for the bundled packages. So `npx` users run
exactly the code that was tested. The SDK and zod are therefore devDependencies;
an update to either reaches users in the next release, which `/release` cuts for
a bundled version change even when the commit is `chore(deps)`. `npm run smoke`
starts the bundled server over MCP and checks the version, the tool count, the
annotations, the gating and the absence of runtime dependencies; CI runs it after
every build.

CI runs lint, type-check, tests, build and smoke on Node 24 for every pull
request (`test (24)`, required on `main`).

## What's where

```
src/
├── index.ts          # entry point: reads env, builds the server, registers every group
├── client.ts         # RevolutClient: path/origin guards, timeout, no redirects, error mapping
├── policy.ts         # SENSITIVE_TOOLS, annotations, withToolPolicy
├── utils.ts          # shared schemas (uuid, requestId, ...), jsonResponse, listResponse
└── tools/
    ├── accounts.ts          # 3 tools
    ├── cards.ts             # 12 tools
    ├── card-invitations.ts  # 5 tools
    ├── counterparties.ts    # 5 tools
    ├── expenses.ts          # 2 tools
    ├── forex.ts             # 3 tools
    ├── payment-drafts.ts    # 4 tools
    ├── payout-links.ts      # 4 tools
    ├── simulations.ts       # 2 tools
    ├── team-members.ts      # 4 tools
    ├── transactions.ts      # 2 tools
    ├── transfers.ts         # 3 tools
    ├── webhooks.ts          # 7 tools
    ├── test-helpers.ts      # mock server and client, list of every register function
    └── tools.test.ts        # handler tests, plus the path-parameter test over every tool
scripts/
├── bundle.mjs        # esbuild bundle + third-party licences
└── smoke.mjs         # starts build/index.js over MCP and checks it
```

Tests sit next to the code as `*.test.ts`.

## Adding a tool

Use the `/add-tool` command, or follow the pattern in any file under
`src/tools/`: `logToolCall`, a `try` that calls the client and returns
`jsonResponse` (or `listResponse` for lists), `errorResponse` in the `catch`.
Path IDs use `uuid`, money tools use `requestId`, `moneyAmount` and
`currencyCode`. A tool that moves money, adds a payee or card, grants access or
sends data out goes in `SENSITIVE_TOOLS` in `src/policy.ts` and in `scripts/smoke.mjs`.
Then update [tools.md](tools.md) and run `/sync-tool-count`.

## Releasing

See [RELEASING.md](../RELEASING.md). Never publish or tag by hand.
