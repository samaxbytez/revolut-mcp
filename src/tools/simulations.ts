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
} from "../utils.js";

export function registerSimulationTools(server: McpServer, client: RevolutClient): void {
  server.registerTool(
    "revolut_simulate_transfer_state",
    {
      title: "Simulate Transfer State Update",
      description:
        "Simulate a transfer state change in the Sandbox environment. Allows testing of complete, revert, decline, and fail states.",
      inputSchema: {
        id: uuid.describe("Transfer ID (UUID)"),
        action: z
          .enum(["complete", "revert", "decline", "fail"])
          .describe("The state to simulate"),
      },
    },
    async ({ id, action }) => {
      logToolCall("revolut_simulate_transfer_state", { id, action });
      try {
        return jsonResponse(
          await client.postJson(`/api/1.0/sandbox/transactions/${id}/${action}`)
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.registerTool(
    "revolut_simulate_topup",
    {
      title: "Simulate Account Top-Up",
      description:
        "Simulate an account top-up in the Sandbox environment. Maximum amount is 10,000.",
      inputSchema: {
        account_id: uuid.describe("Account ID to top up (UUID)"),
        amount: moneyAmount.max(10000).describe("Top-up amount (max 10,000)"),
        currency: currencyCode.describe("Currency code"),
        reference: z
          .string()
          .max(200)
          .optional()
          .describe("Payment reference (default: 'Test Top-up')"),
        state: z
          .enum(["pending", "completed", "reverted", "failed"])
          .optional()
          .describe("Desired transaction state (default: completed)"),
      },
    },
    async (params) => {
      logToolCall("revolut_simulate_topup", params);
      try {
        return jsonResponse(
          await client.postJson("/api/1.0/sandbox/topup", definedOnly(params))
        );
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
