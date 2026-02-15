import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import { jsonResponse, errorResponse, logToolCall } from "../utils.js";

export function registerAccountTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_list_accounts",
    {
      title: "List Accounts",
      description:
        "Retrieve all accounts of the business. Returns account IDs, names, balances, currencies, and states.",
    },
    async () => {
      logToolCall("revolut_list_accounts");
      try {
        const result = await client.get("/api/1.0/accounts");
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_account",
    {
      title: "Get Account",
      description:
        "Retrieve details of a specific account by its ID. Returns balance, currency, state, and timestamps.",
      inputSchema: {
        account_id: z.string().describe("The account ID (UUID)"),
      },
    },
    async ({ account_id }) => {
      logToolCall("revolut_get_account", { account_id });
      try {
        const result = await client.get(`/api/1.0/accounts/${account_id}`);
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_account_bank_details",
    {
      title: "Get Account Bank Details",
      description:
        "Retrieve full bank details for a specific account, including IBAN, BIC, sort code, account number, and beneficiary information.",
      inputSchema: {
        account_id: z.string().describe("The account ID (UUID)"),
      },
    },
    async ({ account_id }) => {
      logToolCall("revolut_get_account_bank_details", { account_id });
      try {
        const result = await client.get(
          `/api/1.0/accounts/${account_id}/bank-details`
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
