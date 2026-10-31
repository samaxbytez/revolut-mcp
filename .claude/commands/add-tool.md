---
description: Scaffold a new Revolut MCP tool (handler + registration + test) following the repo pattern
argument-hint: <resource-file> "<tool description>"
---

Add a new tool to this MCP server. Arguments: `$ARGUMENTS`
(first token = the `src/tools/<resource>.ts` file to add it to or create;
the rest = a short description of what the tool does).

Follow the repo's established pattern exactly — read an existing tool first
(e.g. `src/tools/payout-links.ts`) and mirror it. Steps:

1. Decide the tool name (`revolut_<verb>_<resource>`), HTTP method, and API
   path from the [Revolut Business API docs](https://developer.revolut.com/docs/business/business-api).
2. In the target `src/tools/<resource>.ts`:
   - If the file is new, export `registerXxxTools(server, client)` and import the
     helpers from `../utils.js`.
   - Register the tool with `server.registerTool(...)`. The handler must:
     - call `logToolCall("<name>", args)` first,
     - call the `client` (`get` / `postJson` / `putJson` / `patchJson` / `deleteReq`)
       with a path under `/api/1.0/` or `/api/2.0/`,
     - return `jsonResponse(data)` (or `listResponse(...)` for lists) and wrap
       errors with `errorResponse`.
   - **Any ID that goes into a request path must use `uuid`** (or `transactionId`),
     never a plain `z.string()`.
   - Money tools take `requestId`, `moneyAmount` and `currencyCode`.
   - Build bodies with `definedOnly(...)` and query strings with `buildParams(...)`.
   - List tools expose `created_before`/`limit` (or `from`/`to`/`count`) and return
     `listResponse(...)` so a full page is flagged as possibly truncated.
3. If the tool moves money, adds a payee or card, grants access or sends data out,
   add its name to `SENSITIVE_TOOLS` in `src/policy.ts` (and to `MOVES_MONEY` /
   `SENDS_OUT` where it applies) and to `SENSITIVE` in `scripts/smoke.mjs`.
4. If the file is new, import and call `registerXxxTools` in `src/index.ts` and in
   `src/tools/test-helpers.ts`.
5. Add a test in `src/tools/tools.test.ts`. The "path parameters across all
   tools" test picks up new path arguments automatically.
6. Add the tool to its table in `docs/tools.md`, then run `/sync-tool-count`.
7. Run `npm run lint`, `npm run type-check`, `npm test`, `npm run build` and
   `npm run smoke` until green.

Do not invent API fields — confirm them against the Revolut docs. Stop and ask
if the resource's API shape is unclear.
