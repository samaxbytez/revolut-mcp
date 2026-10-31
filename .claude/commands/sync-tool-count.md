---
description: Recount the tools in src/tools and update the counts in the docs and smoke test
---

The docs state a total tool count and per-group counts in several places. These
drift as tools are added. Reconcile them with the source of truth.

1. Count registered tools per file by grepping `src/tools/*.ts` for
   `server.registerTool(` and the `cardAction(` helper calls in `cards.ts`
   (count tool registrations, not other helper calls).
2. Compute the total across all files, and how many are in `SENSITIVE_TOOLS`.
3. Update:
   - `README.md`: the intro, the "Tools" column of the "What it can do" table;
   - `docs/tools.md`: the opening line and each "## <Group> (N tools)" heading;
   - `docs/development.md`: the per-file counts in the "What's where" tree;
   - `docs/README.md`: "All N tools";
   - `scripts/smoke.mjs` (`TOTAL`) and the count assertions in
     `src/tools/tools.test.ts`.
4. Show a short before/after diff of the numbers you changed. Do not touch tool
   descriptions or any other prose.
