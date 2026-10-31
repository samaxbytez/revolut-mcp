import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

// Tools that move money, add a payee or card, grant access, or send account data
// elsewhere. Text returned by Revolut (counterparty names, payment references,
// descriptions) can be written by third parties, so an injected instruction must
// not be able to reach these unless the user has opted in.
export const SENSITIVE_TOOLS = new Set([
  // Money out
  "revolut_create_payment",
  "revolut_create_transfer",
  "revolut_exchange_money",
  "revolut_create_payout_link",
  "revolut_create_payment_draft",
  // A new payee can carry an attacker's account details
  "revolut_create_counterparty",
  // Cards and their limits
  "revolut_create_card",
  "revolut_update_card",
  "revolut_update_card_contacts",
  "revolut_update_card_references",
  "revolut_create_card_invitation",
  "revolut_update_card_invitation",
  "revolut_get_sensitive_card_details", // full PAN and CVV into the model's context
  // Access
  "revolut_invite_team_member",
  // Webhooks send every transaction to a URL
  "revolut_create_webhook",
  "revolut_update_webhook",
  "revolut_rotate_webhook_secret",
]);

const MOVES_MONEY = new Set([
  "revolut_create_payment",
  "revolut_create_transfer",
  "revolut_exchange_money",
  "revolut_create_payout_link",
  "revolut_create_payment_draft",
]);

// Leaves the account: another party receives money, an email or transaction data.
const SENDS_OUT = new Set([
  "revolut_create_payment",
  "revolut_create_payout_link",
  "revolut_invite_team_member",
  "revolut_create_webhook",
  "revolut_update_webhook",
]);

export function annotationsFor(name: string): ToolAnnotations {
  const action = name.replace(/^revolut_/, "").split("_")[0];
  const openWorldHint = SENDS_OUT.has(name);

  if (["list", "get", "validate"].includes(action)) {
    return { readOnlyHint: true, openWorldHint: false };
  }
  const destructiveHint =
    MOVES_MONEY.has(name) || ["update", "delete", "cancel", "rotate"].includes(action);
  return { readOnlyHint: false, destructiveHint, openWorldHint };
}

/**
 * Wraps the server so every tool registered through it gets MCP annotations,
 * and sensitive tools are dropped unless `allowSensitive` is set.
 */
export function withToolPolicy(
  server: McpServer,
  options: { allowSensitive: boolean }
): McpServer {
  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === "registerTool") {
        const original = Reflect.get(target, prop, receiver) as (
          ...args: unknown[]
        ) => RegisteredTool;
        return (...args: unknown[]) => {
          const name = args[0] as string;
          const registered = original.apply(target, args);
          if (SENSITIVE_TOOLS.has(name) && !options.allowSensitive) {
            registered.remove();
          } else {
            registered.update({ annotations: annotationsFor(name) });
          }
          return registered;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
