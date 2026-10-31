# Tools

56 tools, one file per Revolut resource in `src/tools/`. Every tool name starts
with `revolut_`. 39 are available by default; the 17 marked **sensitive** are
off unless `REVOLUT_ENABLE_SENSITIVE_TOOLS=true`
([why](security.md#sensitive-tools)). The counts in the headings come from the
tool registrations in each file; run `/sync-tool-count` after adding, removing
or renaming one.

Cards, expenses and card invitations only work in production; the simulation
tools only work in the sandbox.

## Pagination

Revolut paginates by date, not by page number. List tools take either
`created_before` and `limit`, or `from`, `to` and `count`, depending on the
endpoint (the defaults are 100 results). Revolut returns no total, so when a
full page comes back the server adds a second text block saying the result may
be truncated and which value to pass for the next page, for example
`created_before=2024-03-01T10:00:00Z`. Accounts, payment drafts and webhooks
return everything in one go.

## Input checks

IDs that go into a request path must be UUIDs (transaction lookups also accept a
`request_id`). `request_id` is 1-40 letters, digits, `-` or `_`. Currencies are
three upper-case letters, amounts are positive and finite, and webhook URLs must
be `https://`. A call that breaks a rule is refused with a message saying which,
so the model can correct it.

## Annotations

Every tool carries MCP annotations (`readOnlyHint`, `destructiveHint`,
`openWorldHint`) so clients can ask for confirmation before writes.
`list_*`, `get_*` and `validate_*` tools are read-only; `update_*`, `delete_*`,
`cancel_*`, rotating a webhook secret and everything that moves money are
marked destructive; payments, payout links, team invitations and webhook changes
are marked open-world because they reach someone outside the account.

## Accounts (3 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_list_accounts` | List Accounts | `GET /api/1.0/accounts` |  |
| `revolut_get_account` | Get Account | `GET /api/1.0/accounts/{account_id}` |  |
| `revolut_get_account_bank_details` | Get Account Bank Details | `GET /api/1.0/accounts/{account_id}/bank-details` |  |

## Cards (12 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_list_cards` | List Cards | `GET /api/1.0/cards` |  |
| `revolut_create_card` | Create Card | `POST /api/1.0/cards` | sensitive |
| `revolut_get_card` | Get Card Details | `GET /api/1.0/cards/{card_id}` |  |
| `revolut_update_card` | Update Card Settings | `PATCH /api/1.0/cards/{card_id}` | sensitive |
| `revolut_update_card_contacts` | Update Card Contacts | `PUT /api/1.0/cards/{card_id}/contacts` | sensitive |
| `revolut_update_card_references` | Update Card References | `PUT /api/1.0/cards/{card_id}/references` | sensitive |
| `revolut_delete_card` | Terminate Card | `DELETE /api/1.0/cards/{card_id}` |  |
| `revolut_freeze_card` | Freeze Card | `POST /api/1.0/cards/{card_id}/freeze` |  |
| `revolut_unfreeze_card` | Unfreeze Card | `POST /api/1.0/cards/{card_id}/unfreeze` |  |
| `revolut_lock_card` | Lock Card | `POST /api/1.0/cards/{card_id}/lock` |  |
| `revolut_unlock_card` | Unlock Card | `POST /api/1.0/cards/{card_id}/unlock` |  |
| `revolut_get_sensitive_card_details` | Get Sensitive Card Details | `GET /api/1.0/cards/{card_id}/sensitive-details` | sensitive |

## Card invitations (5 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_create_card_invitation` | Create Card Invitation | `POST /api/1.0/card-invitations` | sensitive |
| `revolut_list_card_invitations` | List Card Invitations | `GET /api/1.0/card-invitations` |  |
| `revolut_get_card_invitation` | Get Card Invitation | `GET /api/1.0/card-invitations/{card_invitation_id}` |  |
| `revolut_update_card_invitation` | Update Card Invitation | `PATCH /api/1.0/card-invitations/{card_invitation_id}` | sensitive |
| `revolut_cancel_card_invitation` | Cancel Card Invitation | `POST /api/1.0/card-invitations/{card_invitation_id}/cancel` |  |

## Counterparties (5 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_validate_account_name` | Validate Account Name (CoP/VoP) | `POST /api/1.0/account-name-validation` |  |
| `revolut_list_counterparties` | List Counterparties | `GET /api/1.0/counterparties` |  |
| `revolut_create_counterparty` | Create Counterparty | `POST /api/1.0/counterparty` | sensitive |
| `revolut_get_counterparty` | Get Counterparty | `GET /api/1.0/counterparty/{counterparty_id}` |  |
| `revolut_delete_counterparty` | Delete Counterparty | `DELETE /api/1.0/counterparty/{counterparty_id}` |  |

## Transactions (2 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_list_transactions` | List Transactions | `GET /api/1.0/transactions` |  |
| `revolut_get_transaction` | Get Transaction | `GET /api/1.0/transaction/{id}` |  |

## Transfers (3 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_create_payment` | Create Payment | `POST /api/1.0/pay` | sensitive |
| `revolut_create_transfer` | Move Money Between Accounts | `POST /api/1.0/transfer` | sensitive |
| `revolut_get_transfer_reasons` | Get Transfer Reasons | `GET /api/1.0/transfer-reasons` |  |

## Foreign exchange (3 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_get_exchange_rate` | Get Exchange Rate | `GET /api/1.0/rate` |  |
| `revolut_exchange_money` | Exchange Money | `POST /api/1.0/exchange` | sensitive |
| `revolut_get_exchange_reasons` | Get Exchange Reasons | `GET /api/1.0/exchange-reasons` |  |

## Payment drafts (4 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_list_payment_drafts` | List Payment Drafts | `GET /api/1.0/payment-drafts` |  |
| `revolut_create_payment_draft` | Create Payment Draft | `POST /api/1.0/payment-drafts` | sensitive |
| `revolut_get_payment_draft` | Get Payment Draft | `GET /api/1.0/payment-drafts/{payment_draft_id}` |  |
| `revolut_delete_payment_draft` | Delete Payment Draft | `DELETE /api/1.0/payment-drafts/{payment_draft_id}` |  |

## Payout links (4 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_create_payout_link` | Create Payout Link | `POST /api/1.0/payout-links` | sensitive |
| `revolut_list_payout_links` | List Payout Links | `GET /api/1.0/payout-links` |  |
| `revolut_get_payout_link` | Get Payout Link | `GET /api/1.0/payout-links/{payout_link_id}` |  |
| `revolut_cancel_payout_link` | Cancel Payout Link | `POST /api/1.0/payout-links/{payout_link_id}/cancel` |  |

## Expenses (2 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_list_expenses` | List Expenses | `GET /api/1.0/expenses` |  |
| `revolut_get_expense` | Get Expense | `GET /api/1.0/expenses/{expense_id}` |  |

## Team members (4 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_list_team_members` | List Team Members | `GET /api/1.0/team-members` |  |
| `revolut_invite_team_member` | Invite Team Member | `POST /api/1.0/team-members` | sensitive |
| `revolut_delete_team_member` | Delete Team Member | `DELETE /api/1.0/team-members/{team_member_id}` |  |
| `revolut_list_roles` | List Team Roles | `GET /api/1.0/roles` |  |

## Webhooks (7 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_create_webhook` | Create Webhook | `POST /api/2.0/webhooks` | sensitive |
| `revolut_list_webhooks` | List Webhooks | `GET /api/2.0/webhooks` |  |
| `revolut_get_webhook` | Get Webhook | `GET /api/2.0/webhooks/{webhook_id}` |  |
| `revolut_update_webhook` | Update Webhook | `PATCH /api/2.0/webhooks/{webhook_id}` | sensitive |
| `revolut_delete_webhook` | Delete Webhook | `DELETE /api/2.0/webhooks/{webhook_id}` |  |
| `revolut_rotate_webhook_secret` | Rotate Webhook Signing Secret | `POST /api/2.0/webhooks/{webhook_id}/rotate-signing-secret` | sensitive |
| `revolut_list_failed_webhook_events` | List Failed Webhook Events | `GET /api/2.0/webhooks/{webhook_id}/failed-events` |  |

## Simulations (sandbox) (2 tools)

| Tool | What | Endpoint | |
| --- | --- | --- | --- |
| `revolut_simulate_transfer_state` | Simulate Transfer State Update | `POST /api/1.0/sandbox/transactions/{id}/{action}` |  |
| `revolut_simulate_topup` | Simulate Account Top-Up | `POST /api/1.0/sandbox/topup` |  |

