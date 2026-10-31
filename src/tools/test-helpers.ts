import { vi } from "vitest";
import type { ZodTypeAny } from "zod";
import type { RevolutClient } from "../client.js";
import { registerAccountTools } from "./accounts.js";
import { registerCardInvitationTools } from "./card-invitations.js";
import { registerCardTools } from "./cards.js";
import { registerCounterpartyTools } from "./counterparties.js";
import { registerExpenseTools } from "./expenses.js";
import { registerForexTools } from "./forex.js";
import { registerPaymentDraftTools } from "./payment-drafts.js";
import { registerPayoutLinkTools } from "./payout-links.js";
import { registerSimulationTools } from "./simulations.js";
import { registerTeamMemberTools } from "./team-members.js";
import { registerTransactionTools } from "./transactions.js";
import { registerTransferTools } from "./transfers.js";
import { registerWebhookTools } from "./webhooks.js";

export type ToolHandler = (...args: any[]) => any;

export const allToolGroups = [
  registerAccountTools,
  registerCardTools,
  registerCardInvitationTools,
  registerCounterpartyTools,
  registerExpenseTools,
  registerForexTools,
  registerPaymentDraftTools,
  registerPayoutLinkTools,
  registerSimulationTools,
  registerTeamMemberTools,
  registerTransactionTools,
  registerTransferTools,
  registerWebhookTools,
];

export function createMockServer() {
  const tools = new Map<string, ToolHandler>();
  const schemas = new Map<string, Record<string, ZodTypeAny>>();
  return {
    server: {
      registerTool: vi.fn(
        (
          name: string,
          config: { inputSchema?: Record<string, ZodTypeAny> },
          cb: ToolHandler
        ) => {
          tools.set(name, cb);
          schemas.set(name, config.inputSchema ?? {});
        }
      ),
    } as any,
    tools,
    schemas,
  };
}

export function createMockClient() {
  return {
    get: vi.fn().mockResolvedValue({ data: "mock" }),
    postJson: vi.fn().mockResolvedValue({ data: "mock" }),
    putJson: vi.fn().mockResolvedValue({ data: "mock" }),
    patchJson: vi.fn().mockResolvedValue({ data: "mock" }),
    deleteReq: vi.fn().mockResolvedValue({}),
  } as unknown as RevolutClient;
}
