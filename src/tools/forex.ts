import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  errorResponse,
  logToolCall,
  buildParams,
  definedOnly,
  requestId,
  uuid,
  moneyAmount,
  currencyCode,
} from "../utils.js";

export function registerForexTools(server: McpServer, client: RevolutClient): void {
  server.registerTool(
    "revolut_get_exchange_rate",
    {
      title: "Get Exchange Rate",
      description:
        "Get the exchange rate between two currencies. Optionally specify an amount to see the converted value and fee.",
      inputSchema: {
        from: currencyCode.describe("Source currency code (e.g., GBP)"),
        to: currencyCode.describe("Target currency code (e.g., EUR)"),
        amount: moneyAmount.optional().describe("Amount to convert (default 1.00)"),
      },
    },
    async (params) => {
      logToolCall("revolut_get_exchange_rate", params);
      try {
        return jsonResponse(await client.get("/api/1.0/rate", buildParams(params)));
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
        request_id: requestId.describe(
          "Unique idempotency key for the exchange (max 40 chars)"
        ),
        from_account_id: uuid.describe("Source account ID (UUID)"),
        from_currency: currencyCode.describe("Source currency code"),
        from_amount: moneyAmount
          .optional()
          .describe("Amount to sell (specify this OR to_amount)"),
        to_account_id: uuid.describe("Target account ID (UUID)"),
        to_currency: currencyCode.describe("Target currency code"),
        to_amount: moneyAmount
          .optional()
          .describe("Amount to buy (specify this OR from_amount)"),
        reference: z
          .string()
          .max(500)
          .optional()
          .describe("Exchange reference/description"),
        exchange_reason_code: z
          .string()
          .max(100)
          .optional()
          .describe("Exchange reason code"),
      },
    },
    async (params) => {
      logToolCall("revolut_exchange_money", params);
      if ((params.from_amount === undefined) === (params.to_amount === undefined)) {
        return errorResponse("Specify exactly one of from_amount or to_amount");
      }
      try {
        const body = definedOnly({
          request_id: params.request_id,
          from: definedOnly({
            account_id: params.from_account_id,
            currency: params.from_currency,
            amount: params.from_amount,
          }),
          to: definedOnly({
            account_id: params.to_account_id,
            currency: params.to_currency,
            amount: params.to_amount,
          }),
          reference: params.reference,
          exchange_reason_code: params.exchange_reason_code,
        });
        return jsonResponse(await client.postJson("/api/1.0/exchange", body));
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
        return jsonResponse(await client.get("/api/1.0/exchange-reasons"));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
