import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  errorResponse,
  logToolCall,
  buildParams,
} from "../utils.js";

export function registerForexTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_get_exchange_rate",
    {
      title: "Get Exchange Rate",
      description:
        "Get the exchange rate between two currencies. Optionally specify an amount to see the converted value and fee.",
      inputSchema: {
        from: z.string().describe("Source currency code (e.g., GBP)"),
        to: z.string().describe("Target currency code (e.g., EUR)"),
        amount: z
          .number()
          .positive()
          .optional()
          .describe("Amount to convert (default 1.00)"),
      },
    },
    async ({ from, to, amount }) => {
      logToolCall("revolut_get_exchange_rate", { from, to, amount });
      try {
        const result = await client.get(
          "/api/1.0/rate",
          buildParams({ from, to, amount })
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_exchange_money",
    {
      title: "Exchange Money",
      description:
        "Exchange money between two accounts in different currencies. Specify the amount in either the 'from' or 'to' side (not both).",
      inputSchema: {
        request_id: z
          .string()
          .describe("Unique idempotency key for the exchange"),
        from_account_id: z.string().describe("Source account ID (UUID)"),
        from_currency: z.string().describe("Source currency code"),
        from_amount: z
          .number()
          .positive()
          .optional()
          .describe("Amount to sell (specify this OR to_amount)"),
        to_account_id: z.string().describe("Target account ID (UUID)"),
        to_currency: z.string().describe("Target currency code"),
        to_amount: z
          .number()
          .positive()
          .optional()
          .describe("Amount to buy (specify this OR from_amount)"),
        reference: z
          .string()
          .optional()
          .describe("Exchange reference/description"),
        exchange_reason_code: z
          .string()
          .optional()
          .describe("Exchange reason code"),
      },
    },
    async (params) => {
      logToolCall("revolut_exchange_money", {
        request_id: params.request_id,
        from_currency: params.from_currency,
        to_currency: params.to_currency,
      });
      try {
        const from: Record<string, unknown> = {
          account_id: params.from_account_id,
          currency: params.from_currency,
        };
        if (params.from_amount !== undefined) from.amount = params.from_amount;

        const to: Record<string, unknown> = {
          account_id: params.to_account_id,
          currency: params.to_currency,
        };
        if (params.to_amount !== undefined) to.amount = params.to_amount;

        const body: Record<string, unknown> = {
          from,
          to,
          request_id: params.request_id,
        };
        if (params.reference) body.reference = params.reference;
        if (params.exchange_reason_code)
          body.exchange_reason_code = params.exchange_reason_code;

        const result = await client.postJson("/api/1.0/exchange", body);
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_exchange_reasons",
    {
      title: "Get Exchange Reasons",
      description:
        "Retrieve the list of available exchange reason codes for currency exchanges.",
    },
    async () => {
      logToolCall("revolut_get_exchange_reasons");
      try {
        const result = await client.get("/api/1.0/exchange-reasons");
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
