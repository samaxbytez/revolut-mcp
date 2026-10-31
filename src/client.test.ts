import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RevolutClient, RevolutApiError } from "./client.js";

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockOk(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}

function mockError(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as Response;
}

describe("RevolutClient - GET", () => {
  it("sends Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ data: "ok" }));
    const client = new RevolutClient("test-token");
    await client.get("/api/1.0/test");

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/1.0/test");
    expect(opts.headers.Authorization).toBe("Bearer test-token");
  });

  it("appends query params", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ data: "ok" }));
    const client = new RevolutClient("token");
    await client.get("/api/1.0/test", { foo: "bar", limit: "10" });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("foo=bar");
    expect(url).toContain("limit=10");
  });

  it("handles empty response body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "",
    } as Response);
    const client = new RevolutClient("token");
    const result = await client.get("/api/1.0/test");
    expect(result).toEqual({});
  });

  it("uses custom base URL", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ data: "ok" }));
    const client = new RevolutClient("token", "https://b2b.revolut.com");
    await client.get("/api/1.0/accounts");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("b2b.revolut.com/api/1.0/accounts");
  });
});

describe("RevolutClient - POST", () => {
  it("sends JSON body for postJson", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ data: "ok" }));
    const client = new RevolutClient("token");
    await client.postJson("/api/1.0/test", { amount: 100 });

    const opts = mockFetch.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe("POST");
    expect((opts.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
    expect(opts.body).toBe('{"amount":100}');
  });

  it("sends no body when undefined", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ data: "ok" }));
    const client = new RevolutClient("token");
    await client.postJson("/api/1.0/test");

    const opts = mockFetch.mock.calls[0][1] as RequestInit;
    expect(opts.body).toBeUndefined();
  });
});

describe("RevolutClient - PUT/PATCH/DELETE", () => {
  it("putJson sends PUT with JSON body", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ data: "ok" }));
    const client = new RevolutClient("token");
    await client.putJson("/api/1.0/test", { name: "updated" });

    const opts = mockFetch.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe("PUT");
    expect(opts.body).toBe('{"name":"updated"}');
  });

  it("patchJson sends PATCH with JSON body", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ data: "ok" }));
    const client = new RevolutClient("token");
    await client.patchJson("/api/1.0/test", { label: "new" });

    const opts = mockFetch.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe("PATCH");
  });

  it("deleteReq sends DELETE with query params", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({}));
    const client = new RevolutClient("token");
    await client.deleteReq("/api/1.0/test", { id: "123" });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe("DELETE");
    expect(url).toContain("id=123");
  });
});

describe("RevolutClient - error handling", () => {
  it("throws RevolutApiError with parsed fields", async () => {
    mockFetch.mockResolvedValueOnce(
      mockError(400, { code: 3000, message: "bad request" })
    );

    const client = new RevolutClient("token");
    try {
      await client.get("/api/1.0/test");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(RevolutApiError);
      const err = e as RevolutApiError;
      expect(err.status).toBe(400);
      expect(err.errorCode).toBe("3000");
      expect(err.message).toContain("bad request");
    }
  });

  it("returns safe fallback for malformed error body", async () => {
    mockFetch.mockResolvedValueOnce(mockError(500, "not json"));

    const client = new RevolutClient("token");
    try {
      await client.get("/api/1.0/test");
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as RevolutApiError;
      expect(err.errorCode).toBe("unknown");
      expect(err.message).not.toContain("not json");
    }
  });
});

describe("RevolutClient - request safety", () => {
  const attacks = [
    "/api/1.0/../../x",
    "/api/1.0/%2e%2e/x",
    "/api/1.0/%2E%2E/x",
    "/api/1.0/accounts/..",
    "/api/1.0/./x",
    "https://evil.example/api/1.0/x",
    "//evil.example/api/1.0/x",
    "/api/1.0/accounts/..\\x",
  ];

  it.each(attacks)("rejects %s without sending a request", async (path) => {
    const client = new RevolutClient("secret-token");
    await expect(client.get(path)).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects paths outside /api/", async () => {
    const client = new RevolutClient("secret-token");
    await expect(client.get("/other/x")).rejects.toThrow(/outside the Revolut API/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("keeps ? and # in a path segment inside the path", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({}));
    await new RevolutClient("t").get("/api/1.0/a%3Fb");
    expect(new URL(mockFetch.mock.calls[0][0]).pathname).toBe("/api/1.0/a%3Fb");
  });

  it("sends a timeout signal and refuses redirects", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({}));
    await new RevolutClient("t").get("/api/1.0/x");
    const opts = mockFetch.mock.calls[0][1];
    expect(opts.redirect).toBe("error");
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it("requires https except for loopback", () => {
    expect(() => new RevolutClient("t", "http://api.example.com")).toThrow(/https/);
    expect(() => new RevolutClient("t", "http://127.0.0.1:8080")).not.toThrow();
    expect(() => new RevolutClient("t", "not a url")).toThrow();
  });

  it("ignores any path on the base URL and flags production", () => {
    expect(new RevolutClient("t", "https://b2b.revolut.com/api/1.0").isProduction).toBe(
      true
    );
    expect(new RevolutClient("t").isProduction).toBe(false);
  });

  it("reports 429 with Retry-After", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "12" }),
      text: async () => "<html>slow down</html>",
    } as Response);
    const err = await new RevolutClient("t").get("/api/1.0/x").catch((e) => e);
    expect(err).toBeInstanceOf(RevolutApiError);
    expect(err.message).toContain("retry after 12 seconds");
    expect(err.message).not.toContain("html");
  });

  it("does not echo a non-JSON error body or success body", async () => {
    mockFetch.mockResolvedValueOnce(mockError(502, "<html>secret-token leaked</html>"));
    const err = await new RevolutClient("t").get("/api/1.0/x").catch((e) => e);
    expect(err.message).not.toContain("secret-token");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "<html>oops</html>",
    } as Response);
    const err2 = await new RevolutClient("t").get("/api/1.0/x").catch((e) => e);
    expect(err2.message).not.toContain("oops");
  });

  it("keeps Revolut's validation message", async () => {
    mockFetch.mockResolvedValueOnce(
      mockError(400, { code: 3000, message: "Invalid amount" })
    );
    const err = await new RevolutClient("t").get("/api/1.0/x").catch((e) => e);
    expect(err.message).toContain("Invalid amount");
  });
});
