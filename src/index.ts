#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RevolutClient } from "./client.js";
import { withToolPolicy } from "./policy.js";
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

// Inlined from package.json by scripts/bundle.mjs.
declare const PACKAGE_VERSION: string;

const REVOLUT_ACCESS_TOKEN = process.env.REVOLUT_ACCESS_TOKEN;
const REVOLUT_BASE_URL = process.env.REVOLUT_BASE_URL;
const ENABLE_SENSITIVE_TOOLS = process.env.REVOLUT_ENABLE_SENSITIVE_TOOLS === "true";

if (!REVOLUT_ACCESS_TOKEN) {
  console.error("Missing required environment variable: REVOLUT_ACCESS_TOKEN");
  process.exit(1);
}

let client: RevolutClient;
try {
  client = new RevolutClient(REVOLUT_ACCESS_TOKEN, REVOLUT_BASE_URL);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (client.isProduction) {
  console.error("WARNING: Running against PRODUCTION Revolut API");
}
if (ENABLE_SENSITIVE_TOOLS) {
  console.error("WARNING: Money-moving and other sensitive tools are ENABLED");
}

const server = new McpServer({
  name: "revolut-mcp",
  version: PACKAGE_VERSION,
});
const tools = withToolPolicy(server, { allowSensitive: ENABLE_SENSITIVE_TOOLS });

registerAccountTools(tools, client);
registerCardTools(tools, client);
registerCardInvitationTools(tools, client);
registerCounterpartyTools(tools, client);
registerExpenseTools(tools, client);
registerForexTools(tools, client);
registerPaymentDraftTools(tools, client);
registerPayoutLinkTools(tools, client);
registerSimulationTools(tools, client);
registerTeamMemberTools(tools, client);
registerTransactionTools(tools, client);
registerTransferTools(tools, client);
registerWebhookTools(tools, client);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Revolut MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
