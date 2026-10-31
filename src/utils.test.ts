import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  jsonResponse,
  listResponse,
  errorResponse,
  buildParams,
  definedOnly,
  logToolCall,
  uuid,
  requestId,
  transactionId,
  currencyCode,
  moneyAmount,
  httpsUrl,
} from "./utils.js";

describe("jsonResponse", () => {
  it("returns compact JSON in MCP content structure", () => {
    expect(jsonResponse({ foo: "bar", a: [1, 2] })).toEqual({
      content: [{ type: "text", text: '{"foo":"bar","a":[1,2]}' }],
    });
  });
});

describe("listResponse", () => {
  const items = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: String(i),
      created_at: `2024-01-0${i + 1}`,
    }));

  it("adds a truncation note with the next cursor when a full page came back", () => {
    const res = listResponse(items(3), { limit: 3, cursorParam: "created_before" });
    expect(res.content).toHaveLength(2);
    expect(res.content[1].text).toContain("truncated");
    expect(res.content[1].text).toContain("created_before=2024-01-03");
  });

  it("assumes the default limit when none is given", () => {
    expect(listResponse(items(2), { cursorParam: "to" }).content).toHaveLength(1);
    expect(listResponse(items(100), { cursorParam: "to" }).content).toHaveLength(2);
  });

  it("adds no note for a short page or a non-array", () => {
    expect(listResponse(items(2), { limit: 3, cursorParam: "to" }).content).toHaveLength(
      1
    );
    expect(listResponse({ a: 1 }, { limit: 1, cursorParam: "to" }).content).toHaveLength(
      1
    );
  });

  it("uses a custom cursor field", () => {
    const res = listResponse([{ expense_date: "2024-05-05" }], {
      limit: 1,
      cursorParam: "to",
      cursorField: "expense_date",
    });
    expect(res.content[1].text).toContain("to=2024-05-05");
  });
});

describe("errorResponse", () => {
  it("formats Error instances using .message", () => {
    expect(errorResponse(new Error("something went wrong"))).toEqual({
      content: [{ type: "text", text: "Error: something went wrong" }],
      isError: true,
    });
  });

  it("formats non-Error values using String()", () => {
    expect(errorResponse("plain string").content[0].text).toBe("Error: plain string");
  });
});

describe("buildParams / definedOnly", () => {
  it("buildParams stringifies values and drops undefined and null", () => {
    expect(buildParams({ a: 1, b: undefined, c: null, d: "x", e: false })).toEqual({
      a: "1",
      d: "x",
      e: "false",
    });
  });

  it("definedOnly drops undefined but keeps falsy values", () => {
    expect(definedOnly({ a: 0, b: undefined, c: "", d: false })).toEqual({
      a: 0,
      c: "",
      d: false,
    });
  });
});

describe("logToolCall", () => {
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    spy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => spy.mockRestore());

  it("logs the tool and argument names, never their values", () => {
    logToolCall("revolut_create_payment", {
      iban: "GB82WEST12345698765432",
      amount: 5,
      skipped: undefined,
    });
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry.tool).toBe("revolut_create_payment");
    expect(entry.args).toEqual(["iban", "amount"]);
    expect(spy.mock.calls[0][0]).not.toContain("GB82");
    expect(entry.ts).toBeDefined();
  });

  it("works without params", () => {
    logToolCall("revolut_list_accounts");
    expect(JSON.parse(spy.mock.calls[0][0] as string).args).toEqual([]);
  });
});

describe("shared schemas", () => {
  const UUID = "123e4567-e89b-42d3-a456-426614174000";
  const attacks = ["../x", "%2e%2e/x", "1?x", "1#x", `${UUID}/../x`, `${UUID}\n`];

  it("uuid accepts a UUID and rejects traversal", () => {
    expect(uuid.safeParse(UUID).success).toBe(true);
    for (const a of attacks) expect(uuid.safeParse(a).success, a).toBe(false);
  });

  it("transactionId accepts UUIDs and request_ids but not traversal", () => {
    expect(transactionId.safeParse(UUID).success).toBe(true);
    expect(transactionId.safeParse("req_2024-01").success).toBe(true);
    for (const a of attacks) expect(transactionId.safeParse(a).success, a).toBe(false);
  });

  it("requestId is 1-40 safe characters", () => {
    expect(requestId.safeParse("a".repeat(40)).success).toBe(true);
    expect(requestId.safeParse("a".repeat(41)).success).toBe(false);
    expect(requestId.safeParse("a b").success).toBe(false);
  });

  it("currencyCode, moneyAmount and httpsUrl validate", () => {
    expect(currencyCode.safeParse("GBP").success).toBe(true);
    expect(currencyCode.safeParse("gbp").success).toBe(false);
    expect(moneyAmount.safeParse(0.01).success).toBe(true);
    for (const bad of [0, -1, NaN, Infinity])
      expect(moneyAmount.safeParse(bad).success).toBe(false);
    expect(httpsUrl.safeParse("https://example.com/hook").success).toBe(true);
    expect(httpsUrl.safeParse("http://example.com").success).toBe(false);
    expect(httpsUrl.safeParse("https://a b").success).toBe(false);
  });
});
