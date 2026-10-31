# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); `/release` adds each
new version at the top ([RELEASING.md](RELEASING.md)).

## [2.0.0] - 2026-10-31

### Changed (breaking)

- 17 tools are off unless `REVOLUT_ENABLE_SENSITIVE_TOOLS=true`: payments, transfers, exchanges, payout links, payment drafts, new counterparties, card create/update/contacts/references/sensitive details, card invitations, team invitations and webhook create/update/rotate. 39 tools remain by default.
- IDs must be UUIDs, currencies three capital letters, `request_id` 1-40 safe characters and webhook URLs `https://`. `exchange_money` needs exactly one of `from_amount` or `to_amount`.
- `REVOLUT_BASE_URL` must be https (localhost excepted); any path on it is ignored.
- Requires Node 24 or later.

### Security

- The client rejects absolute URLs and dot segments (raw and encoded), pins the origin and `/api/N.N/` path, refuses redirects and times out after 30s. Non-JSON error bodies are never echoed.
- Logs carry argument names only, never values.
- Shipped as one bundled file with no runtime dependencies (`npm audit` for the package: 0, was 26).

### Added

- MCP annotations on every tool; list tools flag a full page as possibly truncated.
- Smoke test, pinned-SHA CI, and a publish workflow with provenance behind an approval step.
- Docs set under `docs/`.

### Fixed

- The server reports its real package version instead of a hardcoded 1.0.0.

## [1.0.0]

Initial release: 56 tools over the Revolut Business API.

[2.0.0]: https://github.com/samaxbytez/revolut-mcp/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/samaxbytez/revolut-mcp/releases/tag/v1.0.0
