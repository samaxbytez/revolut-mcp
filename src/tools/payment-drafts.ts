import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import { jsonResponse, errorResponse, logToolCall } from "../utils.js";

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
        const result = await client.get("/api/1.0/payment-drafts");
        return jsonResponse(result);
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
        title: z.string().describe("Title for the payment draft"),
        schedule_for: z
          .string()
          .optional()
          .describe("Schedule date (ISO 8601 date, e.g., 2024-12-31)"),
        payments: z
          .array(
            z.object({
              account_id: z.string().describe("Source account ID (UUID)"),
              counterparty_id: z
                .string()
                .describe("Receiver counterparty ID (UUID)"),
              receiver_account_id: z
                .string()
                .optional()
                .describe("Receiver's account ID within counterparty"),
              amount: z.number().positive().describe("Payment amount"),
              currency: z.string().describe("Currency code"),
              reference: z.string().describe("Payment reference"),
            })
          )
          .min(1)
          .describe("Array of payments to include in the draft"),
      },
    },
    async ({ title, schedule_for, payments }) => {
      logToolCall("revolut_create_payment_draft", {
        title,
        payment_count: payments.length,
      });
      try {
        const formattedPayments = payments.map((p) => ({
          account_id: p.account_id,
          receiver: {
            counterparty_id: p.counterparty_id,
            ...(p.receiver_account_id && {
              account_id: p.receiver_account_id,
            }),
          },
          amount: p.amount,
          currency: p.currency,
          reference: p.reference,
        }));

        const body: Record<string, unknown> = {
          title,
          payments: formattedPayments,
        };
        if (schedule_for) body.schedule_for = schedule_for;

        const result = await client.postJson(
          "/api/1.0/payment-drafts",
          body
        );
        return jsonResponse(result);
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
      inputSchema: {
        payment_draft_id: z
          .string()
          .describe("The payment draft ID (UUID)"),
      },
    },
    async ({ payment_draft_id }) => {
      logToolCall("revolut_get_payment_draft", { payment_draft_id });
      try {
        const result = await client.get(
          `/api/1.0/payment-drafts/${payment_draft_id}`
        );
        return jsonResponse(result);
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
      inputSchema: {
        payment_draft_id: z
          .string()
          .describe("The payment draft ID (UUID)"),
      },
    },
    async ({ payment_draft_id }) => {
      logToolCall("revolut_delete_payment_draft", { payment_draft_id });
      try {
        await client.deleteReq(
          `/api/1.0/payment-drafts/${payment_draft_id}`
        );
        return jsonResponse({
          success: true,
          message: "Payment draft deleted",
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
