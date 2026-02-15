#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RevolutClient } from "./client.js";
import { registerAccountTools } from "./tools/accounts.js";
import { registerCardTools } from "./tools/cards.js";
import { registerCardInvitationTools } from "./tools/card-invitations.js";
import { registerCounterpartyTools } from "./tools/counterparties.js";
import { registerExpenseTools } from "./tools/expenses.js";
import { registerForexTools } from "./tools/forex.js";
import { registerPaymentDraftTools } from "./tools/payment-drafts.js";
import { registerPayoutLinkTools } from "./tools/payout-links.js";
import { registerSimulationTools } from "./tools/simulations.js";
import { registerTeamMemberTools } from "./tools/team-members.js";
import { registerTransactionTools } from "./tools/transactions.js";
import { registerTransferTools } from "./tools/transfers.js";
import { registerWebhookTools } from "./tools/webhooks.js";

const REVOLUT_ACCESS_TOKEN = process.env.REVOLUT_ACCESS_TOKEN;
const REVOLUT_BASE_URL = process.env.REVOLUT_BASE_URL;

if (!REVOLUT_ACCESS_TOKEN) {
  console.error("Missing required environment variable: REVOLUT_ACCESS_TOKEN");
  process.exit(1);
}

if (REVOLUT_BASE_URL?.includes("b2b.revolut.com/api")) {
  console.error(
    "WARNING: REVOLUT_BASE_URL should be the base domain (e.g., https://sandbox-b2b.revolut.com), not including /api/1.0"
  );
}

if (
  REVOLUT_BASE_URL &&
  !REVOLUT_BASE_URL.includes("sandbox") &&
  REVOLUT_BASE_URL.includes("b2b.revolut.com")
) {
  console.error("WARNING: Running against PRODUCTION Revolut API");
}

const client = new RevolutClient(REVOLUT_ACCESS_TOKEN, REVOLUT_BASE_URL);

const server = new McpServer({
  name: "revolut-mcp",
  version: "1.0.0",
});

registerAccountTools(server, client);
registerCardTools(server, client);
registerCardInvitationTools(server, client);
registerCounterpartyTools(server, client);
registerExpenseTools(server, client);
registerForexTools(server, client);
registerPaymentDraftTools(server, client);
registerPayoutLinkTools(server, client);
registerSimulationTools(server, client);
registerTeamMemberTools(server, client);
registerTransactionTools(server, client);
registerTransferTools(server, client);
registerWebhookTools(server, client);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Revolut MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
