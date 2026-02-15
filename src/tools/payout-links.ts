import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import { jsonResponse, errorResponse, logToolCall } from "../utils.js";

export function registerPayoutLinkTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_create_payout_link",
    {
      title: "Create Payout Link",
      description:
        "Create a payout link to send money without full banking details. The recipient claims the money before the link expires. Available in UK, EEA, AU, and SG.",
      inputSchema: {
        request_id: z
          .string()
          .describe("Unique idempotency key for the payout link"),
        counterparty_name: z.string().describe("Name of the recipient"),
        account_id: z.string().describe("Source account ID (UUID)"),
        amount: z.number().positive().describe("Payout amount"),
        currency: z.string().describe("Currency code"),
        payout_methods: z
          .array(z.enum(["revolut", "bank_account", "card"]))
          .min(1)
          .describe("Allowed payout methods for the recipient"),
        reference: z
          .string()
          .optional()
          .describe("Payment reference/description"),
        transfer_reason_code: z
          .string()
          .optional()
          .describe("Transfer reason code"),
        expiry_period: z
          .string()
          .optional()
          .describe("ISO 8601 duration for link expiry"),
      },
    },
    async (params) => {
      logToolCall("revolut_create_payout_link", {
        request_id: params.request_id,
        amount: params.amount,
        currency: params.currency,
      });
      try {
        const body: Record<string, unknown> = {
          request_id: params.request_id,
          counterparty_name: params.counterparty_name,
          account_id: params.account_id,
          amount: params.amount,
          currency: params.currency,
          payout_methods: params.payout_methods,
        };
        if (params.reference) body.reference = params.reference;
        if (params.transfer_reason_code)
          body.transfer_reason_code = params.transfer_reason_code;
        if (params.expiry_period) body.expiry_period = params.expiry_period;

        const result = await client.postJson(
          "/api/1.0/payout-links",
          body
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_list_payout_links",
    {
      title: "List Payout Links",
      description:
        "Retrieve a list of payout links with optional state filtering and pagination.",
      inputSchema: {
        state: z
          .array(
            z.enum([
              "created",
              "failed",
              "awaiting",
              "active",
              "expired",
              "cancelled",
              "processing",
              "processed",
            ])
          )
          .optional()
          .describe("Filter by payout link states"),
        created_before: z
          .string()
          .optional()
          .describe("Pagination cursor: ISO 8601 datetime"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Max results (1-1000, default 100)"),
      },
    },
    async (params) => {
      logToolCall("revolut_list_payout_links", params);
      try {
        const queryParams: Record<string, string> = {};
        if (params.state) queryParams.state = params.state.join(",");
        if (params.created_before)
          queryParams.created_before = params.created_before;
        if (params.limit) queryParams.limit = String(params.limit);

        const result = await client.get(
          "/api/1.0/payout-links",
          Object.keys(queryParams).length > 0 ? queryParams : undefined
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_payout_link",
    {
      title: "Get Payout Link",
      description:
        "Retrieve details of a specific payout link, including its URL, state, and associated transaction.",
      inputSchema: {
        payout_link_id: z.string().describe("The payout link ID (UUID)"),
      },
    },
    async ({ payout_link_id }) => {
      logToolCall("revolut_get_payout_link", { payout_link_id });
      try {
        const result = await client.get(
          `/api/1.0/payout-links/${payout_link_id}`
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_cancel_payout_link",
    {
      title: "Cancel Payout Link",
      description: "Cancel an active payout link.",
      inputSchema: {
        payout_link_id: z.string().describe("The payout link ID (UUID)"),
      },
    },
    async ({ payout_link_id }) => {
      logToolCall("revolut_cancel_payout_link", { payout_link_id });
      try {
        await client.postJson(
          `/api/1.0/payout-links/${payout_link_id}/cancel`
        );
        return jsonResponse({
          success: true,
          message: "Payout link cancelled",
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
