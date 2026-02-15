import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import { jsonResponse, errorResponse, logToolCall } from "../utils.js";

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
        request_id: z
          .string()
          .max(40)
          .describe("Unique idempotency key (max 40 chars)"),
        holder_id: z
          .string()
          .describe("Team member ID to assign as cardholder (UUID)"),
        label: z
          .string()
          .max(30)
          .optional()
          .describe("Card label (max 30 chars)"),
        expiry_period: z
          .string()
          .optional()
          .describe(
            "ISO 8601 duration for invitation expiry (P1D to P90D, default P90D)"
          ),
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
          .describe("Spending limits"),
        categories: z
          .array(z.string())
          .optional()
          .describe("Allowed merchant category codes"),
      },
    },
    async (params) => {
      logToolCall("revolut_create_card_invitation", {
        request_id: params.request_id,
        holder_id: params.holder_id,
      });
      try {
        const body: Record<string, unknown> = {
          request_id: params.request_id,
          holder_id: params.holder_id,
          virtual: true,
        };
        if (params.label) body.label = params.label;
        if (params.expiry_period) body.expiry_period = params.expiry_period;
        if (params.spending_limits)
          body.spending_limits = params.spending_limits;
        if (params.categories) body.categories = params.categories;

        const result = await client.postJson(
          "/api/1.0/card-invitations",
          body
        );
        return jsonResponse(result);
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
        "Retrieve a list of card invitations with optional filtering. Production only.",
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
        state: z
          .array(z.enum(["created", "expired", "failed", "redeemed"]))
          .optional()
          .describe("Filter by invitation states"),
      },
    },
    async (params) => {
      logToolCall("revolut_list_card_invitations", params);
      try {
        const queryParams: Record<string, string> = {};
        if (params.created_before)
          queryParams.created_before = params.created_before;
        if (params.limit) queryParams.limit = String(params.limit);
        if (params.state) queryParams.state = params.state.join(",");

        const result = await client.get(
          "/api/1.0/card-invitations",
          Object.keys(queryParams).length > 0 ? queryParams : undefined
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_card_invitation",
    {
      title: "Get Card Invitation",
      description:
        "Retrieve details of a specific card invitation. Production only.",
      inputSchema: {
        card_invitation_id: z
          .string()
          .describe("The card invitation ID (UUID)"),
      },
    },
    async ({ card_invitation_id }) => {
      logToolCall("revolut_get_card_invitation", { card_invitation_id });
      try {
        const result = await client.get(
          `/api/1.0/card-invitations/${card_invitation_id}`
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_update_card_invitation",
    {
      title: "Update Card Invitation",
      description:
        "Update settings of an existing card invitation. Production only.",
      inputSchema: {
        card_invitation_id: z
          .string()
          .describe("The card invitation ID (UUID)"),
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
    async ({ card_invitation_id, ...rest }) => {
      logToolCall("revolut_update_card_invitation", { card_invitation_id });
      try {
        const body: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) body[k] = v;
        }
        const result = await client.patchJson(
          `/api/1.0/card-invitations/${card_invitation_id}`,
          body
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
      inputSchema: {
        card_invitation_id: z
          .string()
          .describe("The card invitation ID (UUID)"),
      },
    },
    async ({ card_invitation_id }) => {
      logToolCall("revolut_cancel_card_invitation", { card_invitation_id });
      try {
        await client.postJson(
          `/api/1.0/card-invitations/${card_invitation_id}/cancel`
        );
        return jsonResponse({
          success: true,
          message: "Card invitation cancelled",
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
