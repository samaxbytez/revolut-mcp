import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  listResponse,
  errorResponse,
  logToolCall,
  buildParams,
  definedOnly,
  cursorParams,
  limitParam,
  requestId,
  uuid,
} from "../utils.js";

const limit = z.number().nonnegative().finite().optional();

export const spendingLimits = z
  .object({
    single: limit.describe("Single transaction limit"),
    day: limit.describe("Daily spending limit"),
    week: limit.describe("Weekly spending limit"),
    month: limit.describe("Monthly spending limit"),
    quarter: limit.describe("Quarterly spending limit"),
    year: limit.describe("Yearly spending limit"),
    all_time: limit.describe("All-time spending limit"),
  })
  .describe("Spending limits in minor currency units");

export const cardLabel = z.string().max(30).describe("Card label (max 30 chars)");
export const merchantCategories = z
  .array(z.string().max(20))
  .max(500)
  .describe("Allowed merchant category codes");

// Fields shared by every "set card settings" tool.
const cardSettings = {
  label: cardLabel.optional(),
  spending_limits: spendingLimits.optional(),
  categories: merchantCategories.optional(),
};

/** A tool that acts on one card: `POST|DELETE /cards/{id}[/action]`. */
function cardAction(
  server: McpServer,
  name: string,
  title: string,
  description: string,
  call: (id: string) => Promise<unknown>,
  message?: string
) {
  server.registerTool(
    name,
    { title, description, inputSchema: { card_id: uuid.describe("The card ID (UUID)") } },
    async ({ card_id }) => {
      logToolCall(name, { card_id });
      try {
        const result = await call(card_id);
        return jsonResponse(message ? { success: true, message } : result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}

export function registerCardTools(server: McpServer, client: RevolutClient): void {
  server.registerTool(
    "revolut_list_cards",
    {
      title: "List Cards",
      description:
        "Retrieve a list of cards issued for the business. Production only. Supports cursor-based pagination; a note is added when a full page came back.",
      inputSchema: { ...cursorParams, limit: limitParam(100) },
    },
    async (params) => {
      logToolCall("revolut_list_cards", params);
      try {
        const result = await client.get("/api/1.0/cards", buildParams(params));
        return listResponse(result, {
          limit: params.limit,
          cursorParam: "created_before",
        });
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
        request_id: requestId.describe("Unique idempotency key (max 40 chars)"),
        holder_id: uuid.optional().describe("Team member ID to assign as cardholder"),
        ...cardSettings,
      },
    },
    async (params) => {
      logToolCall("revolut_create_card", params);
      try {
        const result = await client.postJson(
          "/api/1.0/cards",
          definedOnly({ ...params, virtual: true })
        );
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
      description: "Retrieve details of a specific card by ID. Production only.",
      inputSchema: { card_id: uuid.describe("The card ID (UUID)") },
    },
    async ({ card_id }) => {
      logToolCall("revolut_get_card", { card_id });
      try {
        return jsonResponse(await client.get(`/api/1.0/cards/${card_id}`));
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
      inputSchema: { card_id: uuid.describe("The card ID (UUID)"), ...cardSettings },
    },
    async ({ card_id, ...rest }) => {
      logToolCall("revolut_update_card", { card_id, ...rest });
      try {
        return jsonResponse(
          await client.patchJson(`/api/1.0/cards/${card_id}`, definedOnly(rest))
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  cardAction(
    server,
    "revolut_delete_card",
    "Terminate Card",
    "Permanently terminate a card. This action cannot be undone. Production only.",
    (id) => client.deleteReq(`/api/1.0/cards/${id}`),
    "Card terminated"
  );
  cardAction(
    server,
    "revolut_freeze_card",
    "Freeze Card",
    "Temporarily freeze a card. Production only.",
    (id) => client.postJson(`/api/1.0/cards/${id}/freeze`),
    "Card frozen"
  );
  cardAction(
    server,
    "revolut_unfreeze_card",
    "Unfreeze Card",
    "Unfreeze a previously frozen card. Production only.",
    (id) => client.postJson(`/api/1.0/cards/${id}/unfreeze`),
    "Card unfrozen"
  );
  cardAction(
    server,
    "revolut_lock_card",
    "Lock Card",
    "Lock a card. Production only.",
    (id) => client.postJson(`/api/1.0/cards/${id}/lock`),
    "Card locked"
  );
  cardAction(
    server,
    "revolut_unlock_card",
    "Unlock Card",
    "Unlock a previously locked card. Production only.",
    (id) => client.postJson(`/api/1.0/cards/${id}/unlock`),
    "Card unlocked"
  );
  cardAction(
    server,
    "revolut_get_sensitive_card_details",
    "Get Sensitive Card Details",
    "Retrieve sensitive card details including PAN, CVV, and expiry date. Production only. Requires READ_SENSITIVE_CARD_DATA scope and IP whitelisting.",
    (id) => client.get(`/api/1.0/cards/${id}/sensitive-details`)
  );

  server.registerTool(
    "revolut_update_card_contacts",
    {
      title: "Update Card Contacts",
      description:
        "Replace the list of contact IDs associated with a card (1-5 contacts). Production only.",
      inputSchema: {
        card_id: uuid.describe("The card ID (UUID)"),
        contact_ids: z.array(uuid).min(1).max(5).describe("Array of 1-5 contact UUIDs"),
      },
    },
    async ({ card_id, contact_ids }) => {
      logToolCall("revolut_update_card_contacts", { card_id, contact_ids });
      try {
        return jsonResponse(
          await client.putJson(`/api/1.0/cards/${card_id}/contacts`, contact_ids)
        );
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
        card_id: uuid.describe("The card ID (UUID)"),
        references: z
          .array(
            z.object({
              name: z.string().max(100).describe("Reference name"),
              value: z.string().max(500).describe("Reference value"),
            })
          )
          .min(1)
          .max(5)
          .describe("Array of 1-5 reference objects"),
      },
    },
    async ({ card_id, references }) => {
      logToolCall("revolut_update_card_references", { card_id, references });
      try {
        return jsonResponse(
          await client.putJson(`/api/1.0/cards/${card_id}/references`, references)
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
