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
  httpsUrl,
  limitParam,
  uuid,
} from "../utils.js";

const events = z.enum([
  "TransactionCreated",
  "TransactionStateChanged",
  "PayoutLinkCreated",
  "PayoutLinkStateChanged",
]);

export function registerWebhookTools(server: McpServer, client: RevolutClient): void {
  server.registerTool(
    "revolut_create_webhook",
    {
      title: "Create Webhook",
      description:
        "Create a new webhook subscription. Returns the webhook ID and signing secret. Supported events: TransactionCreated, TransactionStateChanged, PayoutLinkCreated, PayoutLinkStateChanged.",
      inputSchema: {
        url: httpsUrl.describe("HTTPS webhook endpoint URL"),
        events: z.array(events).min(1).describe("Events to subscribe to"),
      },
    },
    async ({ url, events }) => {
      logToolCall("revolut_create_webhook", { url, events });
      try {
        return jsonResponse(await client.postJson("/api/2.0/webhooks", { url, events }));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_list_webhooks",
    { title: "List Webhooks", description: "Retrieve all webhook subscriptions." },
    async () => {
      logToolCall("revolut_list_webhooks");
      try {
        return jsonResponse(await client.get("/api/2.0/webhooks"));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_get_webhook",
    {
      title: "Get Webhook",
      description:
        "Retrieve details of a specific webhook, including its URL, events, and signing secret.",
      inputSchema: { webhook_id: uuid.describe("The webhook ID (UUID)") },
    },
    async ({ webhook_id }) => {
      logToolCall("revolut_get_webhook", { webhook_id });
      try {
        return jsonResponse(await client.get(`/api/2.0/webhooks/${webhook_id}`));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_update_webhook",
    {
      title: "Update Webhook",
      description:
        "Update a webhook's URL and/or subscribed events. At least one field must be provided.",
      inputSchema: {
        webhook_id: uuid.describe("The webhook ID (UUID)"),
        url: httpsUrl.optional().describe("New HTTPS webhook endpoint URL"),
        events: z.array(events).optional().describe("Updated events to subscribe to"),
      },
    },
    async ({ webhook_id, url, events }) => {
      logToolCall("revolut_update_webhook", { webhook_id, url, events });
      if (url === undefined && events === undefined) {
        return errorResponse("Provide url and/or events to update");
      }
      try {
        const result = await client.patchJson(
          `/api/2.0/webhooks/${webhook_id}`,
          definedOnly({ url, events })
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_delete_webhook",
    {
      title: "Delete Webhook",
      description: "Delete a webhook subscription.",
      inputSchema: { webhook_id: uuid.describe("The webhook ID (UUID)") },
    },
    async ({ webhook_id }) => {
      logToolCall("revolut_delete_webhook", { webhook_id });
      try {
        await client.deleteReq(`/api/2.0/webhooks/${webhook_id}`);
        return jsonResponse({ success: true, message: "Webhook deleted" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_rotate_webhook_secret",
    {
      title: "Rotate Webhook Signing Secret",
      description:
        "Rotate the signing secret for a webhook. Max 3 active signing keys per webhook.",
      inputSchema: {
        webhook_id: uuid.describe("The webhook ID (UUID)"),
        expiration_period: z
          .string()
          .max(40)
          .optional()
          .describe("ISO 8601 duration for old secret expiry"),
      },
    },
    async ({ webhook_id, expiration_period }) => {
      logToolCall("revolut_rotate_webhook_secret", { webhook_id, expiration_period });
      try {
        const result = await client.postJson(
          `/api/2.0/webhooks/${webhook_id}/rotate-signing-secret`,
          definedOnly({ expiration_period })
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_list_failed_webhook_events",
    {
      title: "List Failed Webhook Events",
      description:
        "Retrieve a list of failed webhook delivery events for a specific webhook. Events older than 21 days are not available. A note is added when a full page came back.",
      inputSchema: {
        webhook_id: uuid.describe("The webhook ID (UUID)"),
        limit: limitParam(1000),
        ...cursorParams,
      },
    },
    async ({ webhook_id, limit, created_before }) => {
      logToolCall("revolut_list_failed_webhook_events", {
        webhook_id,
        limit,
        created_before,
      });
      try {
        const result = await client.get(
          `/api/2.0/webhooks/${webhook_id}/failed-events`,
          buildParams({ limit, created_before })
        );
        return listResponse(result, { limit, cursorParam: "created_before" });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
