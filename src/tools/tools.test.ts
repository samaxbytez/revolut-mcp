import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerAccountTools } from "./accounts.js";
import { registerTransactionTools } from "./transactions.js";
import { registerTransferTools } from "./transfers.js";
import { registerForexTools } from "./forex.js";
import { registerCounterpartyTools } from "./counterparties.js";
import { registerWebhookTools } from "./webhooks.js";
import { registerSimulationTools } from "./simulations.js";
import { registerTeamMemberTools } from "./team-members.js";
import { registerCardTools } from "./cards.js";
import { registerCardInvitationTools } from "./card-invitations.js";
import { registerExpenseTools } from "./expenses.js";
import { registerPaymentDraftTools } from "./payment-drafts.js";
import { registerPayoutLinkTools } from "./payout-links.js";
import { allToolGroups, createMockClient, createMockServer } from "./test-helpers.js";

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("registerAccountTools", () => {
  it("registers 3 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerAccountTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(3);
  });

  it("revolut_list_accounts calls client.get and returns jsonResponse", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerAccountTools(server, client);

    const handler = tools.get("revolut_list_accounts")!;
    const result = await handler({});

    expect(client.get).toHaveBeenCalledWith("/api/1.0/accounts");
    expect(result.content[0].type).toBe("text");
    expect(JSON.parse(result.content[0].text)).toEqual({ data: "mock" });
  });

  it("revolut_get_account passes account_id in path", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerAccountTools(server, client);

    const handler = tools.get("revolut_get_account")!;
    await handler({ account_id: "abc-123" });

    expect(client.get).toHaveBeenCalledWith("/api/1.0/accounts/abc-123");
  });

  it("returns errorResponse when client throws", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    (client.get as any).mockRejectedValue(new Error("connection failed"));
    registerAccountTools(server, client);

    const handler = tools.get("revolut_list_accounts")!;
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: connection failed");
  });
});

describe("registerTransactionTools", () => {
  it("registers 2 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerTransactionTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(2);
  });

  it("revolut_list_transactions passes query params", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerTransactionTools(server, client);

    const handler = tools.get("revolut_list_transactions")!;
    await handler({ from: "2024-01-01", count: 50 });

    expect(client.get).toHaveBeenCalledWith("/api/1.0/transactions", {
      from: "2024-01-01",
      count: "50",
    });
  });

  it("revolut_get_transaction handles id_type param", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerTransactionTools(server, client);

    const handler = tools.get("revolut_get_transaction")!;
    await handler({ id: "req-123", id_type: "request_id" });

    expect(client.get).toHaveBeenCalledWith("/api/1.0/transaction/req-123", {
      id_type: "request_id",
    });
  });
});

describe("registerTransferTools", () => {
  it("registers 3 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerTransferTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(3);
  });

  it("revolut_create_payment builds correct body", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerTransferTools(server, client);

    const handler = tools.get("revolut_create_payment")!;
    await handler({
      request_id: "req-1",
      account_id: "acc-1",
      counterparty_id: "cp-1",
      amount: 100,
      currency: "GBP",
      reference: "Invoice 123",
    });

    expect(client.postJson).toHaveBeenCalledWith("/api/1.0/pay", {
      request_id: "req-1",
      account_id: "acc-1",
      receiver: { counterparty_id: "cp-1" },
      amount: 100,
      currency: "GBP",
      reference: "Invoice 123",
    });
  });

  it("revolut_create_transfer builds correct body", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerTransferTools(server, client);

    const handler = tools.get("revolut_create_transfer")!;
    await handler({
      request_id: "req-2",
      source_account_id: "src",
      target_account_id: "tgt",
      amount: 500,
      currency: "EUR",
    });

    expect(client.postJson).toHaveBeenCalledWith("/api/1.0/transfer", {
      request_id: "req-2",
      source_account_id: "src",
      target_account_id: "tgt",
      amount: 500,
      currency: "EUR",
    });
  });
});

describe("registerForexTools", () => {
  it("registers 3 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerForexTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(3);
  });

  it("revolut_get_exchange_rate passes params", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerForexTools(server, client);

    const handler = tools.get("revolut_get_exchange_rate")!;
    await handler({ from: "GBP", to: "EUR", amount: 100 });

    expect(client.get).toHaveBeenCalledWith("/api/1.0/rate", {
      from: "GBP",
      to: "EUR",
      amount: "100",
    });
  });

  it("revolut_exchange_money builds correct body", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerForexTools(server, client);

    const handler = tools.get("revolut_exchange_money")!;
    await handler({
      request_id: "ex-1",
      from_account_id: "acc-gbp",
      from_currency: "GBP",
      from_amount: 100,
      to_account_id: "acc-eur",
      to_currency: "EUR",
    });

    expect(client.postJson).toHaveBeenCalledWith("/api/1.0/exchange", {
      from: { account_id: "acc-gbp", currency: "GBP", amount: 100 },
      to: { account_id: "acc-eur", currency: "EUR" },
      request_id: "ex-1",
    });
  });
});

describe("registerCounterpartyTools", () => {
  it("registers 5 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerCounterpartyTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(5);
  });

  it("revolut_delete_counterparty calls deleteReq", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerCounterpartyTools(server, client);

    const handler = tools.get("revolut_delete_counterparty")!;
    const result = await handler({ counterparty_id: "cp-123" });

    expect(client.deleteReq).toHaveBeenCalledWith("/api/1.0/counterparty/cp-123");
    expect(JSON.parse(result.content[0].text).success).toBe(true);
  });
});

describe("registerWebhookTools", () => {
  it("registers 7 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerWebhookTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(7);
  });

  it("revolut_create_webhook uses /api/2.0 path", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerWebhookTools(server, client);

    const handler = tools.get("revolut_create_webhook")!;
    await handler({
      url: "https://example.com/webhook",
      events: ["TransactionCreated"],
    });

    expect(client.postJson).toHaveBeenCalledWith("/api/2.0/webhooks", {
      url: "https://example.com/webhook",
      events: ["TransactionCreated"],
    });
  });
});

describe("registerSimulationTools", () => {
  it("registers 2 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerSimulationTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(2);
  });

  it("revolut_simulate_topup builds correct body", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerSimulationTools(server, client);

    const handler = tools.get("revolut_simulate_topup")!;
    await handler({
      account_id: "acc-1",
      amount: 5000,
      currency: "GBP",
    });

    expect(client.postJson).toHaveBeenCalledWith("/api/1.0/sandbox/topup", {
      account_id: "acc-1",
      amount: 5000,
      currency: "GBP",
    });
  });
});

describe("registerTeamMemberTools", () => {
  it("registers 4 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerTeamMemberTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(4);
  });
});

describe("registerCardTools", () => {
  it("registers 12 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerCardTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(12);
  });

  it("revolut_freeze_card calls postJson", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerCardTools(server, client);

    const handler = tools.get("revolut_freeze_card")!;
    const result = await handler({ card_id: "card-1" });

    expect(client.postJson).toHaveBeenCalledWith("/api/1.0/cards/card-1/freeze");
    expect(JSON.parse(result.content[0].text).message).toBe("Card frozen");
  });
});

describe("registerCardInvitationTools", () => {
  it("registers 5 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerCardInvitationTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(5);
  });
});

describe("registerExpenseTools", () => {
  it("registers 2 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerExpenseTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(2);
  });
});

describe("registerPaymentDraftTools", () => {
  it("registers 4 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerPaymentDraftTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(4);
  });
});

describe("registerPayoutLinkTools", () => {
  it("registers 4 tools", () => {
    const { server } = createMockServer();
    const client = createMockClient();
    registerPayoutLinkTools(server, client);
    expect(server.registerTool).toHaveBeenCalledTimes(4);
  });
});

describe("path parameters across all tools", () => {
  // Every argument that ends up interpolated into a request path must reject
  // traversal, including percent-encoded dot segments.
  it("rejects traversal in every path-interpolated argument", async () => {
    const { server, tools, schemas } = createMockServer();
    const client = createMockClient();
    for (const register of allToolGroups) register(server, client);

    let pathParams = 0;
    for (const [name, schema] of schemas) {
      vi.clearAllMocks();
      const args = Object.fromEntries(
        Object.keys(schema).map((k) => [k, `MARK${k}MARK`])
      );
      await tools.get(name)!(args);

      const paths = Object.values(client)
        .flatMap((fn) => (fn as ReturnType<typeof vi.fn>).mock.calls)
        // Query-string values are encoded by the client; only the path can be traversed.
        .map((call) => String(call[0]));

      for (const key of Object.keys(schema)) {
        if (!paths.some((p) => p.includes(`MARK${key}MARK`))) continue;
        pathParams++;
        for (const attack of ["../x", "%2e%2e/x", "1?x=1", "1#x", "a/b"]) {
          expect(
            schema[key].safeParse(attack).success,
            `${name}.${key} accepted ${attack}`
          ).toBe(false);
        }
      }
    }
    expect(pathParams).toBeGreaterThanOrEqual(25);
  });

  it("registers 56 tools", () => {
    const { server } = createMockServer();
    for (const register of allToolGroups) register(server, createMockClient());
    expect(server.registerTool).toHaveBeenCalledTimes(56);
  });
});

describe("money tools validate their input", () => {
  it("revolut_exchange_money needs exactly one side's amount", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerForexTools(server, client);
    const base = {
      request_id: "r1",
      from_account_id: "a",
      from_currency: "GBP",
      to_account_id: "b",
      to_currency: "EUR",
    };
    for (const amounts of [{}, { from_amount: 1, to_amount: 2 }]) {
      const res = await tools.get("revolut_exchange_money")!({ ...base, ...amounts });
      expect(res.isError).toBe(true);
    }
    expect(client.postJson).not.toHaveBeenCalled();
  });

  it("revolut_update_webhook needs at least one field", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    registerWebhookTools(server, client);
    const res = await tools.get("revolut_update_webhook")!({ webhook_id: "x" });
    expect(res.isError).toBe(true);
    expect(client.patchJson).not.toHaveBeenCalled();
  });

  it("list tools flag a full page as possibly truncated", async () => {
    const { server, tools } = createMockServer();
    const client = createMockClient();
    (client.get as any).mockResolvedValue([{ created_at: "2024-02-02" }]);
    registerTransactionTools(server, client);
    const res = await tools.get("revolut_list_transactions")!({ count: 1 });
    expect(res.content[1].text).toContain("to=2024-02-02");
  });
});
