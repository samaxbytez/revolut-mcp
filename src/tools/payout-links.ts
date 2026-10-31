import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  listResponse,
  errorResponse,
  logToolCall,
  definedOnly,
  requestId,
  uuid,
  moneyAmount,
  currencyCode,
  cursorParams,
  limitParam,
} from "../utils.js";

export function registerPayoutLinkTools(server: McpServer, client: RevolutClient): void {
  server.registerTool(
    "revolut_create_payout_link",
    {
      title: "Create Payout Link",
      description:
        "Create a payout link to send money without full banking details. The recipient claims the money before the link expires. Available in UK, EEA, AU, and SG.",
      inputSchema: {
        request_id: requestId.describe(
          "Unique idempotency key for the payout link (max 40 chars)"
        ),
        counterparty_name: z.string().max(200).describe("Name of the recipient"),
        account_id: uuid.describe("Source account ID (UUID)"),
        amount: moneyAmount.describe("Payout amount"),
        currency: currencyCode.describe("Currency code"),
        payout_methods: z
          .array(z.enum(["revolut", "bank_account", "card"]))
          .min(1)
          .describe("Allowed payout methods for the recipient"),
        reference: z
          .string()
          .max(500)
          .optional()
          .describe("Payment reference/description"),
        transfer_reason_code: z
          .string()
          .max(100)
          .optional()
          .describe("Transfer reason code"),
        expiry_period: z
          .string()
          .max(40)
          .optional()
          .describe("ISO 8601 duration for link expiry"),
      },
    },
    async (params) => {
      logToolCall("revolut_create_payout_link", params);
      try {
        return jsonResponse(
          await client.postJson("/api/1.0/payout-links", definedOnly(params))
        );
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
        ...cursorParams,
        limit: limitParam(1000),
      },
    },
    async ({ state, ...rest }) => {
      logToolCall("revolut_list_payout_links", { state, ...rest });
      try {
        const query = definedOnly({ ...rest, state: state?.join(",") }) as Record<
          string,
          string
        >;
        const result = await client.get("/api/1.0/payout-links", query);
        return listResponse(result, { limit: rest.limit, cursorParam: "created_before" });
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
      inputSchema: { payout_link_id: uuid.describe("The payout link ID (UUID)") },
    },
    async ({ payout_link_id }) => {
      logToolCall("revolut_get_payout_link", { payout_link_id });
      try {
        return jsonResponse(await client.get(`/api/1.0/payout-links/${payout_link_id}`));
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
      inputSchema: { payout_link_id: uuid.describe("The payout link ID (UUID)") },
    },
    async ({ payout_link_id }) => {
      logToolCall("revolut_cancel_payout_link", { payout_link_id });
      try {
        await client.postJson(`/api/1.0/payout-links/${payout_link_id}/cancel`);
        return jsonResponse({ success: true, message: "Payout link cancelled" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
