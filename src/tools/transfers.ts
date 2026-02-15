import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import { jsonResponse, errorResponse, logToolCall } from "../utils.js";

export function registerTransferTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_create_payment",
    {
      title: "Create Payment",
      description:
        "Create a transfer to a counterparty's account or card. Requires a unique request_id for idempotency.",
      inputSchema: {
        request_id: z
          .string()
          .describe("Unique idempotency key for the payment"),
        account_id: z.string().describe("Source account ID (UUID)"),
        counterparty_id: z
          .string()
          .describe("Receiver counterparty ID (UUID)"),
        receiver_account_id: z
          .string()
          .optional()
          .describe("Receiver's specific account ID within the counterparty"),
        receiver_card_id: z
          .string()
          .optional()
          .describe("Receiver's card ID (for card transfers)"),
        amount: z.number().positive().describe("Payment amount"),
        currency: z.string().describe("Currency code (e.g., GBP, EUR, USD)"),
        reference: z
          .string()
          .optional()
          .describe("Payment reference/description"),
        charge_bearer: z
          .enum(["shared", "debtor"])
          .optional()
          .describe("Who bears the transfer charges"),
        transfer_reason_code: z
          .string()
          .optional()
          .describe("Transfer reason code (for cross-border payments)"),
        schedule_for: z
          .string()
          .optional()
          .describe("Schedule date (ISO 8601 date, e.g., 2024-12-31)"),
      },
    },
    async (params) => {
      logToolCall("revolut_create_payment", {
        request_id: params.request_id,
        amount: params.amount,
        currency: params.currency,
      });
      try {
        const body: Record<string, unknown> = {
          request_id: params.request_id,
          account_id: params.account_id,
          receiver: {
            counterparty_id: params.counterparty_id,
            ...(params.receiver_account_id && {
              account_id: params.receiver_account_id,
            }),
            ...(params.receiver_card_id && {
              card_id: params.receiver_card_id,
            }),
          },
          amount: params.amount,
          currency: params.currency,
        };
        if (params.reference) body.reference = params.reference;
        if (params.charge_bearer) body.charge_bearer = params.charge_bearer;
        if (params.transfer_reason_code)
          body.transfer_reason_code = params.transfer_reason_code;
        if (params.schedule_for) body.schedule_for = params.schedule_for;

        const result = await client.postJson("/api/1.0/pay", body);
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_create_transfer",
    {
      title: "Move Money Between Accounts",
      description:
        "Move money between your own business accounts. Requires a unique request_id for idempotency.",
      inputSchema: {
        request_id: z
          .string()
          .describe("Unique idempotency key for the transfer"),
        source_account_id: z.string().describe("Source account ID (UUID)"),
        target_account_id: z.string().describe("Target account ID (UUID)"),
        amount: z.number().positive().describe("Transfer amount"),
        currency: z.string().describe("Currency code"),
        reference: z
          .string()
          .optional()
          .describe("Transfer reference/description"),
      },
    },
    async (params) => {
      logToolCall("revolut_create_transfer", {
        request_id: params.request_id,
        amount: params.amount,
        currency: params.currency,
      });
      try {
        const body: Record<string, unknown> = {
          request_id: params.request_id,
          source_account_id: params.source_account_id,
          target_account_id: params.target_account_id,
          amount: params.amount,
          currency: params.currency,
        };
        if (params.reference) body.reference = params.reference;

        const result = await client.postJson("/api/1.0/transfer", body);
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_transfer_reasons",
    {
      title: "Get Transfer Reasons",
      description:
        "Retrieve the list of available transfer reason codes. Required for cross-border payments in certain countries.",
    },
    async () => {
      logToolCall("revolut_get_transfer_reasons");
      try {
        const result = await client.get("/api/1.0/transfer-reasons");
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
