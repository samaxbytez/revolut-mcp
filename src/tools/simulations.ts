import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RevolutClient } from "../client.js";
import { jsonResponse, errorResponse, logToolCall } from "../utils.js";

export function registerSimulationTools(
  server: McpServer,
  client: RevolutClient
): void {
  server.registerTool(
    "revolut_simulate_transfer_state",
    {
      title: "Simulate Transfer State Update",
      description:
        "Simulate a transfer state change in the Sandbox environment. Allows testing of complete, revert, decline, and fail states.",
      inputSchema: {
        id: z.string().describe("Transfer ID (UUID)"),
        action: z
          .enum(["complete", "revert", "decline", "fail"])
          .describe("The state to simulate"),
      },
    },
    async ({ id, action }) => {
      logToolCall("revolut_simulate_transfer_state", { id, action });
      try {
        const result = await client.postJson(
          `/api/1.0/sandbox/transactions/${id}/${action}`
        );
        return jsonResponse(result);
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
        account_id: z.string().describe("Account ID to top up (UUID)"),
        amount: z
          .number()
          .positive()
          .max(10000)
          .describe("Top-up amount (max 10,000)"),
        currency: z.string().describe("Currency code"),
        reference: z
          .string()
          .optional()
          .describe("Payment reference (default: 'Test Top-up')"),
        state: z
          .enum(["pending", "completed", "reverted", "failed"])
          .optional()
          .describe("Desired transaction state (default: completed)"),
      },
    },
    async (params) => {
      logToolCall("revolut_simulate_topup", {
        account_id: params.account_id,
        amount: params.amount,
        currency: params.currency,
      });
      try {
        const body: Record<string, unknown> = {
          account_id: params.account_id,
          amount: params.amount,
          currency: params.currency,
        };
        if (params.reference) body.reference = params.reference;
        if (params.state) body.state = params.state;

        const result = await client.postJson(
          "/api/1.0/sandbox/topup",
          body
        );
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
