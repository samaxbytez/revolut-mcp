# Security

This server's threat model is **indirect prompt injection**: text that Revolut
returns (a counterparty's name, a payment reference, an expense description) can
be written by third parties and reach the model as tool output. Anyone who can
send you a payment can put words in front of the model, so every tool argument
is treated as attacker-controlled. The rules that keep that contained, and that a
change must not weaken, are in
[AGENTS.md](../AGENTS.md#security-conventions-this-repos-threat-model-is-indirect-prompt-injection).

## Sensitive tools

Seventeen tools are not registered unless `REVOLUT_ENABLE_SENSITIVE_TOOLS=true`.
With them off, a manipulated model cannot produce a request that moves money,
adds a payee, changes a card, invites someone or points a webhook at a stranger.

| Why they are gated | Tools |
| --- | --- |
| Money out | `revolut_create_payment`, `revolut_create_transfer`, `revolut_exchange_money`, `revolut_create_payout_link`, `revolut_create_payment_draft` |
| A new payee can carry an attacker's account details | `revolut_create_counterparty` |
| Cards and limits | `revolut_create_card`, `revolut_update_card`, `revolut_update_card_contacts`, `revolut_update_card_references`, `revolut_create_card_invitation`, `revolut_update_card_invitation` |
| Full card number and CVV into the model's context | `revolut_get_sensitive_card_details` |
| Account access | `revolut_invite_team_member` |
| A webhook sends every transaction to a URL | `revolut_create_webhook`, `revolut_update_webhook`, `revolut_rotate_webhook_secret` |

Turning them on is a decision about your whole setup, not a convenience switch:
use the sandbox first, keep your MCP client's per-tool confirmation prompts on,
and read each payment before approving it. The money tools also take a required
`request_id`, so a retried call is not paid twice, and validate the amount (positive,
finite) and currency (three letters).

Still available with them off, and worth knowing: terminating, freezing and
locking cards, deleting counterparties, payment drafts and team members, and
cancelling payout links. They are marked destructive so clients ask first.

Every tool carries MCP annotations (`readOnlyHint`, `destructiveHint`,
`openWorldHint`) so clients can ask for confirmation before writes and deletes.

## Request guards

Every call goes through one client with these checks, none of which depends on
the model behaving:

- **Paths.** IDs must be UUIDs, so `../`, `%2e%2e/`, `?` and `#` cannot get into
  a path. The client independently rejects absolute and scheme-relative URLs and
  dot segments (raw or percent-encoded), then checks the resolved URL has the
  API's origin and sits under `/api/1.0/` or `/api/2.0/`.
- **The token goes to one host.** Redirects are refused, so a response cannot
  bounce the bearer token elsewhere. `REVOLUT_BASE_URL` must be `https://`
  (localhost excepted, for testing).
- **No hanging.** Each request times out after 30 seconds.
- **Errors.** Revolut's validation message is passed on so the model can fix its
  call; a rate limit says when to retry; anything that is not JSON (an HTML
  error page from a proxy) is never echoed.
- **Logs.** The server logs which tool ran and the names of its arguments to
  stderr, never their values (account numbers, names, amounts).

## The token

The server holds the access token you give it in memory only. It never writes it
to disk, logs it, or includes it in an error. It does not hold your private key or
refresh token and cannot mint new tokens; those stay with you
([setup.md](setup.md)). Access tokens last 40 minutes, which also limits what a
leaked one is worth. Prefer a user-level MCP config or VS Code's password prompt
over a project file, so the token is not committed.

## Reporting a problem

Open a [GitHub issue](https://github.com/samaxbytez/revolut-mcp/issues), or for
something that should not be public, a private security advisory on the repo.
