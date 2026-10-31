import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  errorResponse,
  logToolCall,
  definedOnly,
  uuid,
  moneyAmount,
  currencyCode,
  isoDateTime,
} from "../utils.js";

export function registerPaymentDraftTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_list_payment_drafts",
    {
      title: "List Payment Drafts",
      description:
        "Retrieve all payment drafts. Returns draft IDs, titles, and payment counts.",
    },
    async () => {
      logToolCall("revolut_list_payment_drafts");
      try {
        return jsonResponse(await client.get("/api/1.0/payment-drafts"));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_create_payment_draft",
    {
      title: "Create Payment Draft",
      description:
        "Create a payment draft for future processing or approval. Can include multiple payments and an optional schedule date.",
      inputSchema: {
        title: z.string().max(200).describe("Title for the payment draft"),
        schedule_for: isoDateTime
          .optional()
          .describe("Schedule date (ISO 8601 date, e.g., 2024-12-31)"),
        payments: z
          .array(
            z.object({
              account_id: uuid.describe("Source account ID (UUID)"),
              counterparty_id: uuid.describe("Receiver counterparty ID (UUID)"),
              receiver_account_id: uuid
                .optional()
                .describe("Receiver's account ID within counterparty"),
              amount: moneyAmount.describe("Payment amount"),
              currency: currencyCode.describe("Currency code"),
              reference: z.string().max(500).describe("Payment reference"),
            })
          )
          .min(1)
          .max(100)
          .describe("Array of payments to include in the draft"),
      },
    },
    async ({ title, schedule_for, payments }) => {
      logToolCall("revolut_create_payment_draft", { title, schedule_for, payments });
      try {
        const body = definedOnly({
          title,
          schedule_for,
          payments: payments.map(({ counterparty_id, receiver_account_id, ...p }) => ({
            ...p,
            receiver: definedOnly({ counterparty_id, account_id: receiver_account_id }),
          })),
        });
        return jsonResponse(await client.postJson("/api/1.0/payment-drafts", body));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_payment_draft",
    {
      title: "Get Payment Draft",
      description:
        "Retrieve details of a specific payment draft, including all its individual payments and their statuses.",
      inputSchema: { payment_draft_id: uuid.describe("The payment draft ID (UUID)") },
    },
    async ({ payment_draft_id }) => {
      logToolCall("revolut_get_payment_draft", { payment_draft_id });
      try {
        return jsonResponse(
          await client.get(`/api/1.0/payment-drafts/${payment_draft_id}`)
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_delete_payment_draft",
    {
      title: "Delete Payment Draft",
      description: "Delete an existing payment draft.",
      inputSchema: { payment_draft_id: uuid.describe("The payment draft ID (UUID)") },
    },
    async ({ payment_draft_id }) => {
      logToolCall("revolut_delete_payment_draft", { payment_draft_id });
      try {
        await client.deleteReq(`/api/1.0/payment-drafts/${payment_draft_id}`);
        return jsonResponse({ success: true, message: "Payment draft deleted" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
