# revolut-mcp

[![npm version](https://img.shields.io/npm/v/revolut-mcp.svg)](https://www.npmjs.com/package/revolut-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for the [Revolut Business API](https://developer.revolut.com/docs/business/business-api). Gives AI assistants like Claude the ability to manage your Revolut Business account -- view balances, make payments, manage counterparties, exchange currencies, and more.

Covers the full Revolut Business API with **56 tools** across 13 categories: accounts, cards, card invitations, counterparties, expenses, foreign exchange, payment drafts, payout links, sandbox simulations, team members, transactions, transfers, and webhooks.

## Features

- **Accounts** -- List accounts, get balances, retrieve full bank details (IBAN, sort code, etc.)
- **Cards** -- Create, freeze, unfreeze, lock, unlock, terminate cards and manage spending limits
- **Card Invitations** -- Pre-create cards for team members who haven't onboarded yet
- **Counterparties** -- Create, list, validate (CoP/VoP), and delete counterparties
- **Expenses** -- List and retrieve business expenses
- **Foreign Exchange** -- Get exchange rates, execute currency exchanges
- **Payment Drafts** -- Create, list, and manage payment drafts for bulk/scheduled payments
- **Payout Links** -- Send money via claimable links without full banking details
- **Simulations** -- Test flows in Sandbox with simulated top-ups and transfer state changes
- **Team Members** -- Invite, list, and remove team members; manage roles
- **Transactions** -- List and retrieve transaction details with filtering
- **Transfers** -- Make payments to counterparties and move money between accounts
- **Webhooks** -- Create, update, delete webhooks; rotate signing secrets; view failed events

## Prerequisites

You need a Revolut Business account and an API access token.

1. [Create a Sandbox account](https://sandbox-business.revolut.com/) for testing
2. Follow the [Getting Started guide](https://developer.revolut.com/docs/guides/manage-accounts/get-started/make-your-first-api-request) to generate an API access token
3. Access tokens expire after 40 minutes and need to be refreshed

## Installation

### Using npx (recommended)

```bash
npx revolut-mcp
```

### Global install

```bash
npm install -g revolut-mcp
revolut-mcp
```

### Build from source

```bash
git clone https://github.com/samaxbytez/revolut-mcp.git
cd revolut-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REVOLUT_ACCESS_TOKEN` | Yes | Your Revolut Business API access token |
| `REVOLUT_BASE_URL` | No | API base URL. Defaults to `https://sandbox-b2b.revolut.com`. Set to `https://b2b.revolut.com` for production. |

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "revolut": {
      "command": "npx",
      "args": ["-y", "revolut-mcp"],
      "env": {
        "REVOLUT_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

### Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "revolut": {
      "command": "npx",
      "args": ["-y", "revolut-mcp"],
      "env": {
        "REVOLUT_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

### Production usage

Set `REVOLUT_BASE_URL` to `https://b2b.revolut.com`:

```json
{
  "mcpServers": {
    "revolut": {
      "command": "npx",
      "args": ["-y", "revolut-mcp"],
      "env": {
        "REVOLUT_ACCESS_TOKEN": "your_production_token",
        "REVOLUT_BASE_URL": "https://b2b.revolut.com"
      }
    }
  }
}
```

## Architecture

```
revolut-mcp/
├── src/
│   ├── index.ts              # Entry point, wires server + tools
│   ├── client.ts             # HTTP client with bearer auth
│   ├── utils.ts              # Shared helpers (jsonResponse, errorResponse, etc.)
│   ├── client.test.ts        # Client unit tests
│   ├── utils.test.ts         # Utils unit tests
│   └── tools/
│       ├── accounts.ts       # 3 tools
│       ├── cards.ts          # 12 tools
│       ├── card-invitations.ts # 5 tools
│       ├── counterparties.ts # 5 tools
│       ├── expenses.ts       # 2 tools
│       ├── forex.ts          # 3 tools
│       ├── payment-drafts.ts # 4 tools
│       ├── payout-links.ts   # 4 tools
│       ├── simulations.ts    # 2 tools
│       ├── team-members.ts   # 4 tools
│       ├── transactions.ts   # 2 tools
│       ├── transfers.ts      # 3 tools
│       ├── webhooks.ts       # 7 tools
│       └── tools.test.ts     # Tool handler tests
├── package.json
├── tsconfig.json
└── smithery.yaml
```

## Tools Reference

### Accounts

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_list_accounts` | List all business accounts | `GET /api/1.0/accounts` |
| `revolut_get_account` | Get account by ID | `GET /api/1.0/accounts/{id}` |
| `revolut_get_account_bank_details` | Get full bank details (IBAN, BIC, etc.) | `GET /api/1.0/accounts/{id}/bank-details` |

### Cards (Production only)

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_list_cards` | List all cards | `GET /api/1.0/cards` |
| `revolut_create_card` | Create a virtual card | `POST /api/1.0/cards` |
| `revolut_get_card` | Get card details | `GET /api/1.0/cards/{id}` |
| `revolut_update_card` | Update card settings | `PATCH /api/1.0/cards/{id}` |
| `revolut_delete_card` | Terminate a card permanently | `DELETE /api/1.0/cards/{id}` |
| `revolut_freeze_card` | Freeze a card | `POST /api/1.0/cards/{id}/freeze` |
| `revolut_unfreeze_card` | Unfreeze a card | `POST /api/1.0/cards/{id}/unfreeze` |
| `revolut_lock_card` | Lock a card | `POST /api/1.0/cards/{id}/lock` |
| `revolut_unlock_card` | Unlock a card | `POST /api/1.0/cards/{id}/unlock` |
| `revolut_get_sensitive_card_details` | Get PAN, CVV, expiry | `GET /api/1.0/cards/{id}/sensitive-details` |
| `revolut_update_card_contacts` | Update card contacts | `PUT /api/1.0/cards/{id}/contacts` |
| `revolut_update_card_references` | Update card references | `PUT /api/1.0/cards/{id}/references` |

### Card Invitations (Production only)

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_create_card_invitation` | Create a card invitation | `POST /api/1.0/card-invitations` |
| `revolut_list_card_invitations` | List card invitations | `GET /api/1.0/card-invitations` |
| `revolut_get_card_invitation` | Get invitation details | `GET /api/1.0/card-invitations/{id}` |
| `revolut_update_card_invitation` | Update invitation settings | `PATCH /api/1.0/card-invitations/{id}` |
| `revolut_cancel_card_invitation` | Cancel an invitation | `POST /api/1.0/card-invitations/{id}/cancel` |

### Counterparties

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_validate_account_name` | Validate name via CoP/VoP | `POST /api/1.0/account-name-validation` |
| `revolut_list_counterparties` | List counterparties | `GET /api/1.0/counterparties` |
| `revolut_create_counterparty` | Create a counterparty | `POST /api/1.0/counterparty` |
| `revolut_get_counterparty` | Get counterparty details | `GET /api/1.0/counterparty/{id}` |
| `revolut_delete_counterparty` | Delete a counterparty | `DELETE /api/1.0/counterparty/{id}` |

### Expenses (Production only)

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_list_expenses` | List expenses with filters | `GET /api/1.0/expenses` |
| `revolut_get_expense` | Get expense details | `GET /api/1.0/expenses/{id}` |

### Foreign Exchange

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_get_exchange_rate` | Get exchange rate | `GET /api/1.0/rate` |
| `revolut_exchange_money` | Exchange currencies | `POST /api/1.0/exchange` |
| `revolut_get_exchange_reasons` | Get exchange reason codes | `GET /api/1.0/exchange-reasons` |

### Payment Drafts

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_list_payment_drafts` | List all payment drafts | `GET /api/1.0/payment-drafts` |
| `revolut_create_payment_draft` | Create a payment draft | `POST /api/1.0/payment-drafts` |
| `revolut_get_payment_draft` | Get draft details | `GET /api/1.0/payment-drafts/{id}` |
| `revolut_delete_payment_draft` | Delete a draft | `DELETE /api/1.0/payment-drafts/{id}` |

### Payout Links

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_create_payout_link` | Create a payout link | `POST /api/1.0/payout-links` |
| `revolut_list_payout_links` | List payout links | `GET /api/1.0/payout-links` |
| `revolut_get_payout_link` | Get payout link details | `GET /api/1.0/payout-links/{id}` |
| `revolut_cancel_payout_link` | Cancel a payout link | `POST /api/1.0/payout-links/{id}/cancel` |

### Simulations (Sandbox only)

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_simulate_transfer_state` | Simulate transfer state change | `POST /api/1.0/sandbox/transactions/{id}/{action}` |
| `revolut_simulate_topup` | Simulate account top-up | `POST /api/1.0/sandbox/topup` |

### Team Members

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_list_team_members` | List team members | `GET /api/1.0/team-members` |
| `revolut_invite_team_member` | Invite a new member | `POST /api/1.0/team-members` |
| `revolut_delete_team_member` | Remove a team member | `DELETE /api/1.0/team-members/{id}` |
| `revolut_list_roles` | List available roles | `GET /api/1.0/roles` |

### Transactions

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_list_transactions` | List transactions with filters | `GET /api/1.0/transactions` |
| `revolut_get_transaction` | Get transaction by ID or request_id | `GET /api/1.0/transaction/{id}` |

### Transfers

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_create_payment` | Pay a counterparty | `POST /api/1.0/pay` |
| `revolut_create_transfer` | Move money between own accounts | `POST /api/1.0/transfer` |
| `revolut_get_transfer_reasons` | Get transfer reason codes | `GET /api/1.0/transfer-reasons` |

### Webhooks (v2)

| Tool | Description | API Endpoint |
|------|-------------|-------------|
| `revolut_create_webhook` | Create a webhook | `POST /api/2.0/webhooks` |
| `revolut_list_webhooks` | List all webhooks | `GET /api/2.0/webhooks` |
| `revolut_get_webhook` | Get webhook details | `GET /api/2.0/webhooks/{id}` |
| `revolut_update_webhook` | Update webhook URL/events | `PATCH /api/2.0/webhooks/{id}` |
| `revolut_delete_webhook` | Delete a webhook | `DELETE /api/2.0/webhooks/{id}` |
| `revolut_rotate_webhook_secret` | Rotate signing secret | `POST /api/2.0/webhooks/{id}/rotate-signing-secret` |
| `revolut_list_failed_webhook_events` | List failed events | `GET /api/2.0/webhooks/{id}/failed-events` |

## Example Prompts

- "Show me all my Revolut business accounts and their balances"
- "What's the current GBP to EUR exchange rate for 5000 pounds?"
- "List my last 20 transactions"
- "Create a counterparty for Acme Corp with IBAN GB29NWBK60161331926819"
- "Transfer 500 GBP from my main account to my savings account"
- "Pay 1000 EUR to counterparty X with reference 'Invoice 2024-001'"
- "Create a payout link for 250 GBP to John Smith"
- "List all my team members and their roles"
- "Freeze card abc-123"
- "Top up my sandbox account with 5000 GBP for testing"

## Development

```bash
# Install dependencies
npm install

# Type check
npm run type-check

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint

# Format
npm run format

# Watch mode (development)
npm run dev
```

### Adding New Tools

1. Create a new file in `src/tools/` or add to an existing category
2. Follow the pattern: export a `registerXxxTools(server, client)` function
3. Each tool uses `logToolCall()`, wraps API calls in try/catch, and returns `jsonResponse()` or `errorResponse()`
4. Import and call the register function in `src/index.ts`
5. Add tests in `src/tools/tools.test.ts`

## Troubleshooting

**"Missing required environment variable: REVOLUT_ACCESS_TOKEN"**
Set the `REVOLUT_ACCESS_TOKEN` environment variable with a valid Revolut Business API token.

**401 Unauthorized errors**
Access tokens expire after 40 minutes. Generate a new token and update your configuration.

**"WARNING: Running against PRODUCTION Revolut API"**
You've set `REVOLUT_BASE_URL` to the production endpoint. Double-check this is intentional.

**Cards/Expenses endpoints return errors in Sandbox**
Cards, card invitations, and expenses are production-only features and are not available in the Sandbox environment.

**Simulations not working**
Simulation endpoints (`revolut_simulate_topup`, `revolut_simulate_transfer_state`) only work in the Sandbox environment.

**Rate limiting (429 errors)**
Revolut may return 429 when concurrent requests use the same idempotency key. Use unique `request_id` values for each operation.

## License

MIT
