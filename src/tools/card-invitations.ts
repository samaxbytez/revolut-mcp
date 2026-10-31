import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import {
  jsonResponse,
  listResponse,
  errorResponse,
  logToolCall,
  definedOnly,
  cursorParams,
  limitParam,
  requestId,
  uuid,
} from "../utils.js";
import { cardLabel, merchantCategories, spendingLimits } from "./cards.js";

export function registerCardInvitationTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_create_card_invitation",
    {
      title: "Create Card Invitation",
      description:
        "Pre-create a virtual card for a team member who hasn't onboarded yet. The card is automatically issued once they complete onboarding. Production only.",
      inputSchema: {
        request_id: requestId.describe("Unique idempotency key (max 40 chars)"),
        holder_id: uuid.describe("Team member ID to assign as cardholder (UUID)"),
        label: cardLabel.optional(),
        expiry_period: z
          .string()
          .max(40)
          .optional()
          .describe(
            "ISO 8601 duration for invitation expiry (P1D to P90D, default P90D)"
          ),
        spending_limits: spendingLimits.optional(),
        categories: merchantCategories.optional(),
      },
    },
    async (params) => {
      logToolCall("revolut_create_card_invitation", params);
      try {
        const body = definedOnly({ ...params, virtual: true });
        return jsonResponse(await client.postJson("/api/1.0/card-invitations", body));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_list_card_invitations",
    {
      title: "List Card Invitations",
      description:
        "Retrieve a list of card invitations with optional filtering. Production only. A note is added when a full page came back.",
      inputSchema: {
        ...cursorParams,
        limit: limitParam(100),
        state: z
          .array(z.enum(["created", "expired", "failed", "redeemed"]))
          .optional()
          .describe("Filter by invitation states"),
      },
    },
    async ({ state, ...rest }) => {
      logToolCall("revolut_list_card_invitations", { state, ...rest });
      try {
        const query = definedOnly({ ...rest, state: state?.join(",") }) as Record<
          string,
          string
        >;
        const result = await client.get("/api/1.0/card-invitations", query);
        return listResponse(result, { limit: rest.limit, cursorParam: "created_before" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_card_invitation",
    {
      title: "Get Card Invitation",
      description: "Retrieve details of a specific card invitation. Production only.",
      inputSchema: { card_invitation_id: uuid.describe("The card invitation ID (UUID)") },
    },
    async ({ card_invitation_id }) => {
      logToolCall("revolut_get_card_invitation", { card_invitation_id });
      try {
        return jsonResponse(
          await client.get(`/api/1.0/card-invitations/${card_invitation_id}`)
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_update_card_invitation",
    {
      title: "Update Card Invitation",
      description: "Update settings of an existing card invitation. Production only.",
      inputSchema: {
        card_invitation_id: uuid.describe("The card invitation ID (UUID)"),
        label: cardLabel.optional(),
        spending_limits: spendingLimits.optional(),
        categories: merchantCategories.optional(),
      },
    },
    async ({ card_invitation_id, ...rest }) => {
      logToolCall("revolut_update_card_invitation", { card_invitation_id, ...rest });
      try {
        const result = await client.patchJson(
          `/api/1.0/card-invitations/${card_invitation_id}`,
          definedOnly(rest)
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_cancel_card_invitation",
    {
      title: "Cancel Card Invitation",
      description: "Cancel an existing card invitation. Production only.",
      inputSchema: { card_invitation_id: uuid.describe("The card invitation ID (UUID)") },
    },
    async ({ card_invitation_id }) => {
      logToolCall("revolut_cancel_card_invitation", { card_invitation_id });
      try {
        await client.postJson(`/api/1.0/card-invitations/${card_invitation_id}/cancel`);
        return jsonResponse({ success: true, message: "Card invitation cancelled" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
