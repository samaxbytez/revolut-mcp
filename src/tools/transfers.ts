import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  errorResponse,
  logToolCall,
  definedOnly,
  requestId,
  uuid,
  moneyAmount,
  currencyCode,
  isoDateTime,
} from "../utils.js";

export function registerTransferTools(server: McpServer, client: RevolutClient): void {
  server.registerTool(
    "revolut_create_payment",
    {
      title: "Create Payment",
      description:
        "Create a transfer to a counterparty's account or card. Requires a unique request_id for idempotency.",
      inputSchema: {
        request_id: requestId.describe(
          "Unique idempotency key for the payment (max 40 chars)"
        ),
        account_id: uuid.describe("Source account ID (UUID)"),
        counterparty_id: uuid.describe("Receiver counterparty ID (UUID)"),
        receiver_account_id: uuid
          .optional()
          .describe("Receiver's specific account ID within the counterparty"),
        receiver_card_id: uuid
          .optional()
          .describe("Receiver's card ID (for card transfers)"),
        amount: moneyAmount.describe("Payment amount"),
        currency: currencyCode.describe("Currency code (e.g., GBP, EUR, USD)"),
        reference: z
          .string()
          .max(500)
          .optional()
          .describe("Payment reference/description"),
        charge_bearer: z
          .enum(["shared", "debtor"])
          .optional()
          .describe("Who bears the transfer charges"),
        transfer_reason_code: z
          .string()
          .max(100)
          .optional()
          .describe("Transfer reason code (for cross-border payments)"),
        schedule_for: isoDateTime
          .optional()
          .describe("Schedule date (ISO 8601 date, e.g., 2024-12-31)"),
      },
    },
    async (params) => {
      logToolCall("revolut_create_payment", params);
      try {
        const { counterparty_id, receiver_account_id, receiver_card_id, ...rest } =
          params;
        const body = definedOnly({
          ...rest,
          receiver: definedOnly({
            counterparty_id,
            account_id: receiver_account_id,
            card_id: receiver_card_id,
          }),
        });
        return jsonResponse(await client.postJson("/api/1.0/pay", body));
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
        request_id: requestId.describe(
          "Unique idempotency key for the transfer (max 40 chars)"
        ),
        source_account_id: uuid.describe("Source account ID (UUID)"),
        target_account_id: uuid.describe("Target account ID (UUID)"),
        amount: moneyAmount.describe("Transfer amount"),
        currency: currencyCode.describe("Currency code"),
        reference: z
          .string()
          .max(500)
          .optional()
          .describe("Transfer reference/description"),
      },
    },
    async (params) => {
      logToolCall("revolut_create_transfer", params);
      try {
        return jsonResponse(
          await client.postJson("/api/1.0/transfer", definedOnly(params))
        );
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
        return jsonResponse(await client.get("/api/1.0/transfer-reasons"));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
