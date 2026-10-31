const DEFAULT_BASE_URL = "https://sandbox-b2b.revolut.com";
const REQUEST_TIMEOUT_MS = 30_000;
// Revolut's REST API lives under /api/1.0 and /api/2.0 only.
const API_PATH = /^\/api\/[0-9]+\.[0-9]+\//;
// `.` / `..` segments, raw or percent-encoded, which the URL parser resolves.
const DOT_SEGMENT = /(^|[/\\])(\.|%2e){1,2}([/\\]|$)/i;

export class RevolutApiError extends Error {
  public readonly status: number;
  public readonly errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(`Revolut API error (${status}): ${errorCode} - ${message}`);
    this.name = "RevolutApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

function parseApiError(response: Response, body: string): RevolutApiError {
  const { status } = response;
  if (status === 429) {
    const retryAfter = response.headers?.get("retry-after");
    return new RevolutApiError(
      status,
      "rate_limited",
      `Revolut rate limit reached${retryAfter ? `; retry after ${retryAfter} seconds` : ""}`
    );
  }
  try {
    const parsed = JSON.parse(body);
    const code = String(parsed?.code ?? "unknown");
    // Keep Revolut's validation message so the model can correct its call.
    const message = String(parsed?.message ?? `HTTP ${status}`).slice(0, 500);
    return new RevolutApiError(status, code, message);
  } catch {
    // Not JSON (e.g. a proxy's HTML page): don't echo it to the model.
    return new RevolutApiError(status, "unknown", `HTTP ${status} error`);
  }
}

export class RevolutClient {
  private accessToken: string;
  private base: URL;

  constructor(accessToken: string, baseUrl?: string) {
    this.accessToken = accessToken;
    const base = new URL(baseUrl || DEFAULT_BASE_URL);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if (base.protocol !== "https:" && !(base.protocol === "http:" && loopback)) {
      throw new Error("REVOLUT_BASE_URL must be an https:// URL");
    }
    // Only the origin matters: every request path starts with /api/.
    this.base = new URL(base.origin + "/");
  }

  get isProduction(): boolean {
    return this.base.hostname === "b2b.revolut.com";
  }

  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, undefined, params);
  }

  async postJson<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async putJson<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async patchJson<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async deleteReq<T = unknown>(
    path: string,
    params?: Record<string, string>
  ): Promise<T> {
    return this.request<T>("DELETE", path, undefined, params);
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    const relative = path.startsWith("/") ? path.slice(1) : path;

    if (
      DOT_SEGMENT.test(relative) ||
      /^[a-z][a-z0-9+.-]*:/i.test(relative) ||
      relative.startsWith("/")
    ) {
      throw new Error(`Unsafe API path rejected: ${relative}`);
    }

    const url = new URL(relative, this.base);

    if (url.origin !== this.base.origin) {
      throw new Error(`Resolved URL origin does not match base: ${url.origin}`);
    }
    // The checks above can miss exotic encodings; the resolved path is what is sent.
    if (!API_PATH.test(url.pathname)) {
      throw new Error(`Resolved URL is outside the Revolut API: ${url.pathname}`);
    }

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
      "User-Agent": "revolut-mcp",
    };

    let encodedBody: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      encodedBody = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: encodedBody,
      // Never follow a redirect: the bearer token must only go to the API host.
      redirect: "error",
      // A stalled connection would otherwise leave the tool call pending forever.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw parseApiError(response, await response.text());
    }

    const text = await response.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Revolut returned a non-JSON response (HTTP ${response.status})`);
    }
  }
}
