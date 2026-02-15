import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  errorResponse,
  logToolCall,
  buildParams,
} from "../utils.js";

export function registerCardTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_list_cards",
    {
      title: "List Cards",
      description:
        "Retrieve a list of cards issued for the business. Production only. Supports cursor-based pagination.",
      inputSchema: {
        created_before: z
          .string()
          .optional()
          .describe("Pagination cursor: ISO 8601 datetime"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max results (1-100, default 100)"),
      },
    },
    async (params) => {
      logToolCall("revolut_list_cards", params);
      try {
        const result = await client.get(
          "/api/1.0/cards",
          buildParams(params)
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_create_card",
    {
      title: "Create Card",
      description:
        "Create a new virtual card. Production only. Requires a unique request_id.",
      inputSchema: {
        request_id: z
          .string()
          .max(40)
          .describe("Unique idempotency key (max 40 chars)"),
        holder_id: z
          .string()
          .optional()
          .describe("Team member ID to assign as cardholder"),
        label: z
          .string()
          .max(30)
          .optional()
          .describe("Card label (max 30 chars)"),
        spending_limits: z
          .object({
            single: z.number().optional().describe("Single transaction limit"),
            day: z.number().optional().describe("Daily spending limit"),
            week: z.number().optional().describe("Weekly spending limit"),
            month: z.number().optional().describe("Monthly spending limit"),
            quarter: z
              .number()
              .optional()
              .describe("Quarterly spending limit"),
            year: z.number().optional().describe("Yearly spending limit"),
            all_time: z.number().optional().describe("All-time spending limit"),
          })
          .optional()
          .describe("Spending limits in minor currency units"),
        categories: z
          .array(z.string())
          .optional()
          .describe("Allowed merchant category codes"),
      },
    },
    async (params) => {
      logToolCall("revolut_create_card", { request_id: params.request_id });
      try {
        const body: Record<string, unknown> = {
          request_id: params.request_id,
          virtual: true,
        };
        if (params.holder_id) body.holder_id = params.holder_id;
        if (params.label) body.label = params.label;
        if (params.spending_limits)
          body.spending_limits = params.spending_limits;
        if (params.categories) body.categories = params.categories;

        const result = await client.postJson("/api/1.0/cards", body);
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_card",
    {
      title: "Get Card Details",
      description:
        "Retrieve details of a specific card by ID. Production only.",
      inputSchema: {
        card_id: z.string().describe("The card ID (UUID)"),
      },
    },
    async ({ card_id }) => {
      logToolCall("revolut_get_card", { card_id });
      try {
        const result = await client.get(`/api/1.0/cards/${card_id}`);
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_update_card",
    {
      title: "Update Card Settings",
      description:
        "Update card settings such as label, spending limits, and merchant controls. Production only.",
      inputSchema: {
        card_id: z.string().describe("The card ID (UUID)"),
        label: z
          .string()
          .max(30)
          .optional()
          .describe("New card label (max 30 chars)"),
        spending_limits: z
          .object({
            single: z.number().optional(),
            day: z.number().optional(),
            week: z.number().optional(),
            month: z.number().optional(),
            quarter: z.number().optional(),
            year: z.number().optional(),
            all_time: z.number().optional(),
          })
          .optional()
          .describe("Updated spending limits"),
        categories: z
          .array(z.string())
          .optional()
          .describe("Updated allowed merchant category codes"),
      },
    },
    async ({ card_id, ...rest }) => {
      logToolCall("revolut_update_card", { card_id });
      try {
        const body: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) body[k] = v;
        }
        const result = await client.patchJson(
          `/api/1.0/cards/${card_id}`,
          body
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_delete_card",
    {
      title: "Terminate Card",
      description:
        "Permanently terminate a card. This action cannot be undone. Production only.",
      inputSchema: {
        card_id: z.string().describe("The card ID (UUID)"),
      },
    },
    async ({ card_id }) => {
      logToolCall("revolut_delete_card", { card_id });
      try {
        await client.deleteReq(`/api/1.0/cards/${card_id}`);
        return jsonResponse({ success: true, message: "Card terminated" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_freeze_card",
    {
      title: "Freeze Card",
      description: "Temporarily freeze a card. Production only.",
      inputSchema: {
        card_id: z.string().describe("The card ID (UUID)"),
      },
    },
    async ({ card_id }) => {
      logToolCall("revolut_freeze_card", { card_id });
      try {
        await client.postJson(`/api/1.0/cards/${card_id}/freeze`);
        return jsonResponse({ success: true, message: "Card frozen" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_unfreeze_card",
    {
      title: "Unfreeze Card",
      description: "Unfreeze a previously frozen card. Production only.",
      inputSchema: {
        card_id: z.string().describe("The card ID (UUID)"),
      },
    },
    async ({ card_id }) => {
      logToolCall("revolut_unfreeze_card", { card_id });
      try {
        await client.postJson(`/api/1.0/cards/${card_id}/unfreeze`);
        return jsonResponse({ success: true, message: "Card unfrozen" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_lock_card",
    {
      title: "Lock Card",
      description: "Lock a card. Production only.",
      inputSchema: {
        card_id: z.string().describe("The card ID (UUID)"),
      },
    },
    async ({ card_id }) => {
      logToolCall("revolut_lock_card", { card_id });
      try {
        await client.postJson(`/api/1.0/cards/${card_id}/lock`);
        return jsonResponse({ success: true, message: "Card locked" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_unlock_card",
    {
      title: "Unlock Card",
      description: "Unlock a previously locked card. Production only.",
      inputSchema: {
        card_id: z.string().describe("The card ID (UUID)"),
      },
    },
    async ({ card_id }) => {
      logToolCall("revolut_unlock_card", { card_id });
      try {
        await client.postJson(`/api/1.0/cards/${card_id}/unlock`);
        return jsonResponse({ success: true, message: "Card unlocked" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_sensitive_card_details",
    {
      title: "Get Sensitive Card Details",
      description:
        "Retrieve sensitive card details including PAN, CVV, and expiry date. Production only. Requires READ_SENSITIVE_CARD_DATA scope and IP whitelisting.",
      inputSchema: {
        card_id: z.string().describe("The card ID (UUID)"),
      },
    },
    async ({ card_id }) => {
      logToolCall("revolut_get_sensitive_card_details", { card_id });
      try {
        const result = await client.get(
          `/api/1.0/cards/${card_id}/sensitive-details`
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_update_card_contacts",
    {
      title: "Update Card Contacts",
      description:
        "Replace the list of contact IDs associated with a card (1-5 contacts). Production only.",
      inputSchema: {
        card_id: z.string().describe("The card ID (UUID)"),
        contact_ids: z
          .array(z.string())
          .min(1)
          .max(5)
          .describe("Array of 1-5 contact UUIDs"),
      },
    },
    async ({ card_id, contact_ids }) => {
      logToolCall("revolut_update_card_contacts", { card_id });
      try {
        const result = await client.putJson(
          `/api/1.0/cards/${card_id}/contacts`,
          contact_ids
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_update_card_references",
    {
      title: "Update Card References",
      description:
        "Replace the list of custom references on a card (1-5 name/value pairs). Production only.",
      inputSchema: {
        card_id: z.string().describe("The card ID (UUID)"),
        references: z
          .array(
            z.object({
              name: z.string().describe("Reference name"),
              value: z.string().describe("Reference value"),
            })
          )
          .min(1)
          .max(5)
          .describe("Array of 1-5 reference objects"),
      },
    },
    async ({ card_id, references }) => {
      logToolCall("revolut_update_card_references", { card_id });
      try {
        const result = await client.putJson(
          `/api/1.0/cards/${card_id}/references`,
          references
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
