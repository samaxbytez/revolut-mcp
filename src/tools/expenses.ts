import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  errorResponse,
  logToolCall,
  buildParams,
} from "../utils.js";

export function registerExpenseTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_list_expenses",
    {
      title: "List Expenses",
      description:
        "Retrieve a list of expenses with optional filters. Production only. Results sorted by expense_date descending.",
      inputSchema: {
        from: z
          .string()
          .optional()
          .describe("Start datetime (inclusive, ISO 8601)"),
        to: z
          .string()
          .optional()
          .describe("End datetime (exclusive, ISO 8601). Defaults to now."),
        count: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("Max results (1-500, default 100)"),
        state: z
          .enum([
            "missing_info",
            "awaiting_review",
            "reverted",
            "pending_reimbursement",
            "refund_requested",
            "refunded",
            "approved",
            "rejected",
          ])
          .optional()
          .describe("Filter by expense state"),
        transaction_type: z
          .enum([
            "atm",
            "card_payment",
            "fee",
            "transfer",
            "external",
            "mileage_reimbursement",
          ])
          .optional()
          .describe("Filter by transaction type"),
      },
    },
    async (params) => {
      logToolCall("revolut_list_expenses", params);
      try {
        const result = await client.get(
          "/api/1.0/expenses",
          buildParams(params)
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_expense",
    {
      title: "Get Expense",
      description:
        "Retrieve details of a specific expense by ID. Production only.",
      inputSchema: {
        expense_id: z.string().describe("The expense ID (UUID)"),
      },
    },
    async ({ expense_id }) => {
      logToolCall("revolut_get_expense", { expense_id });
      try {
        const result = await client.get(`/api/1.0/expenses/${expense_id}`);
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
