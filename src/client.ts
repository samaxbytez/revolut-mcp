const DEFAULT_BASE_URL = "https://sandbox-b2b.revolut.com";

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

function parseApiError(status: number, body: string): RevolutApiError {
  try {
    const parsed = JSON.parse(body);
    const code = String(parsed?.code ?? "unknown");
    const message = parsed?.message ?? `HTTP ${status}`;
    return new RevolutApiError(status, code, message);
  } catch {
    return new RevolutApiError(status, "unknown", `HTTP ${status} error`);
  }
}

export class RevolutClient {
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken: string, baseUrl?: string) {
    this.accessToken = accessToken;
    this.baseUrl = baseUrl ?? DEFAULT_BASE_URL;
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, string>
  ): Promise<T> {
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
    const url = new URL(path, this.baseUrl);

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
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
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw parseApiError(response.status, errorBody);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }
}
