# Troubleshooting

**"Missing required environment variable: REVOLUT_ACCESS_TOKEN"**
Add `REVOLUT_ACCESS_TOKEN` to the `env` block of your MCP client's config for this server.

**"REVOLUT_BASE_URL must be an https:// URL"**
Use the origin only, `https://sandbox-b2b.revolut.com` or `https://b2b.revolut.com`. `http://` is accepted for localhost only.

**401 Unauthorized, or `Revolut API error (401)`**
The access token has expired (they last 40 minutes) or belongs to the other environment. Get a new one with your refresh token ([setup.md](setup.md#3-authorise-the-app-and-get-an-access-token)), update the config and restart the client. A sandbox token does not work against production, nor the reverse.

**403 Forbidden**
The token lacks the permission for that endpoint. Cards need the card scopes, sensitive card details need `READ_SENSITIVE_CARD_DATA` and an allow-listed IP, and several endpoints (cards, expenses, card invitations) exist in production only.

**"Revolut rate limit reached; retry after N seconds"**
Wait that long and retry, or ask for smaller pages.

**A tool the docs mention is missing**
Payments, transfers, exchanges, payout links, payment drafts, new counterparties, card changes, team invitations and webhook changes are off by default. Set `REVOLUT_ENABLE_SENSITIVE_TOOLS` to `true` ([security.md](security.md#sensitive-tools)) and restart.

**"Invalid arguments" or a message about a UUID**
IDs must be full UUIDs, currencies three capital letters (`GBP`), and `request_id` at most 40 letters, digits, `-` or `_`. Ask the model to list the thing first and use the ID it returns.

**A list stops short**
A full page comes with a note saying the result may be truncated and which `created_before` (or `to`) to use for the next page.

**"Unsafe API path rejected" or "outside the Revolut API"**
The client refused a path that tried to leave `/api/1.0/` or `/api/2.0/`. This should only happen if something is feeding the tools hostile input; check what the model was reading.

**Empty responses**
Some endpoints return no body on success (deletes, freezing a card). The tool reports success in that case.

**Tool not found**
Tool names start with `revolut_` (for example `revolut_list_accounts`).
