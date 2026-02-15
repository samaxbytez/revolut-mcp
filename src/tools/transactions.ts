import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  errorResponse,
  logToolCall,
  buildParams,
} from "../utils.js";

export function registerTransactionTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_list_transactions",
    {
      title: "List Transactions",
      description:
        "Retrieve a list of transactions with optional filters. Results are sorted by created_at descending. Use the created_at of the last item as 'to' for the next page.",
      inputSchema: {
        from: z
          .string()
          .optional()
          .describe(
            "Start date/datetime (inclusive, ISO 8601). E.g., 2024-01-01 or 2024-01-01T00:00:00Z"
          ),
        to: z
          .string()
          .optional()
          .describe(
            "End date/datetime (exclusive, ISO 8601). Defaults to now."
          ),
        account: z
          .string()
          .optional()
          .describe("Filter by account ID (UUID)"),
        count: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Max results (1-1000, default 100)"),
        type: z
          .enum([
            "transfer",
            "card_payment",
            "atm",
            "exchange",
            "topup",
            "card_chargeback",
            "refund",
            "fee",
          ])
          .optional()
          .describe("Filter by transaction type"),
      },
    },
    async (params) => {
      logToolCall("revolut_list_transactions", params);
      try {
        const result = await client.get(
          "/api/1.0/transactions",
          buildParams(params)
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_transaction",
    {
      title: "Get Transaction",
      description:
        "Retrieve details of a specific transaction by its ID or request_id. Includes legs, merchant info, and card details.",
      inputSchema: {
        id: z.string().describe("Transaction ID or request_id"),
        id_type: z
          .enum(["request_id"])
          .optional()
          .describe("Set to 'request_id' if looking up by request_id"),
      },
    },
    async ({ id, id_type }) => {
      logToolCall("revolut_get_transaction", { id, id_type });
      try {
        const params = id_type ? buildParams({ id_type }) : undefined;
        const result = await client.get(
          `/api/1.0/transaction/${id}`,
          params
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
