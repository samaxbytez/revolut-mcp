import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  listResponse,
  errorResponse,
  logToolCall,
  buildParams,
  isoDateTime,
  limitParam,
  uuid,
} from "../utils.js";

export function registerExpenseTools(server: McpServer, client: RevolutClient): void {
  server.registerTool(
    "revolut_list_expenses",
    {
      title: "List Expenses",
      description:
        "Retrieve a list of expenses with optional filters. Production only. Results sorted by expense_date descending; use the expense_date of the last item as 'to' for the next page (a note is added when a full page came back).",
      inputSchema: {
        from: isoDateTime.optional().describe("Start datetime (inclusive, ISO 8601)"),
        to: isoDateTime
          .optional()
          .describe("End datetime (exclusive, ISO 8601). Defaults to now."),
        count: limitParam(500),
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
        const result = await client.get("/api/1.0/expenses", buildParams(params));
        return listResponse(result, {
          limit: params.count,
          cursorParam: "to",
          cursorField: "expense_date",
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_expense",
    {
      title: "Get Expense",
      description: "Retrieve details of a specific expense by ID. Production only.",
      inputSchema: { expense_id: uuid.describe("The expense ID (UUID)") },
    },
    async ({ expense_id }) => {
      logToolCall("revolut_get_expense", { expense_id });
      try {
        return jsonResponse(await client.get(`/api/1.0/expenses/${expense_id}`));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
