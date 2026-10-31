import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { annotationsFor, SENSITIVE_TOOLS, withToolPolicy } from "./policy.js";
import { allToolGroups, createMockClient } from "./tools/test-helpers.js";

function registered(allowSensitive: boolean) {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  const tools = withToolPolicy(server, { allowSensitive });
  for (const register of allToolGroups) register(tools, createMockClient());
  return (
    server as unknown as { _registeredTools: Record<string, { annotations?: unknown }> }
  )._registeredTools;
}

describe("withToolPolicy", () => {
  it("drops every sensitive tool by default and keeps the rest", () => {
    const tools = registered(false);
    for (const name of SENSITIVE_TOOLS) expect(tools[name], name).toBeUndefined();
    expect(Object.keys(tools)).toHaveLength(56 - SENSITIVE_TOOLS.size);
    expect(tools["revolut_list_accounts"]).toBeDefined();
  });

  it("registers sensitive tools when opted in", () => {
    const tools = registered(true);
    for (const name of SENSITIVE_TOOLS) expect(tools[name], name).toBeDefined();
    expect(Object.keys(tools)).toHaveLength(56);
  });

  it("only gates tools that exist", () => {
    const names = Object.keys(registered(true));
    for (const name of SENSITIVE_TOOLS) expect(names).toContain(name);
  });

  it("annotates every registered tool", () => {
    for (const tool of Object.values(registered(true)))
      expect(tool.annotations).toBeDefined();
  });
});

describe("annotationsFor", () => {
  it("marks list/get/validate as read-only", () => {
    for (const n of [
      "revolut_list_cards",
      "revolut_get_account",
      "revolut_validate_account_name",
    ]) {
      expect(annotationsFor(n)).toEqual({ readOnlyHint: true, openWorldHint: false });
    }
  });

  it("marks money movers destructive, and outgoing payments open-world", () => {
    expect(annotationsFor("revolut_create_payment")).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    });
    expect(annotationsFor("revolut_create_transfer").openWorldHint).toBe(false);
    expect(annotationsFor("revolut_exchange_money").destructiveHint).toBe(true);
  });

  it("marks delete/update/cancel destructive, freeze and create non-destructive", () => {
    for (const n of [
      "revolut_delete_card",
      "revolut_update_card",
      "revolut_cancel_payout_link",
    ]) {
      expect(annotationsFor(n).destructiveHint, n).toBe(true);
    }
    for (const n of [
      "revolut_freeze_card",
      "revolut_create_card",
      "revolut_simulate_topup",
    ]) {
      expect(annotationsFor(n).destructiveHint, n).toBe(false);
    }
  });
});
