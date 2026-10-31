import { z } from "zod";

// IDs are interpolated into request paths, so they must not be able to carry
// `/`, `..`, `?` or `#`. Revolut IDs are UUIDs; transaction lookups also accept
// a client-chosen request_id.
const UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const uuid = z.string().regex(UUID, "ID must be a UUID");
export const transactionId = z
  .string()
  .regex(
    /^[a-zA-Z0-9_-]{1,64}$/,
    "ID must be a UUID or request_id (letters, digits, - and _)"
  );

// Idempotency key for anything that moves money or creates a card (Revolut caps it at 40).
export const requestId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,40}$/, "request_id must be 1-40 letters, digits, - or _");

export const currencyCode = z
  .string()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO 4217 code, e.g. GBP");
export const moneyAmount = z.number().positive().finite();
export const isoDateTime = z.string().max(40);
export const httpsUrl = z
  .string()
  .max(2048)
  .refine((v) => /^https:\/\/[^\s]+$/.test(v), "Must be an https:// URL");

export const cursorParams = {
  created_before: isoDateTime
    .optional()
    .describe(
      "Pagination cursor: ISO 8601 datetime. Pass the created_at of the last item to get the next page"
    ),
};

export function limitParam(max: number) {
  return z
    .number()
    .int()
    .min(1)
    .max(max)
    .optional()
    .describe(`Max results (1-${max}, default 100)`);
}

export function jsonResponse(data: unknown) {
  // Compact: indentation only adds tokens.
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

/**
 * JSON response for a list endpoint. Revolut has no total count, so a full page
 * is the only sign more exist: say so, and say how to get the next page.
 */
export function listResponse(
  data: unknown,
  opts: {
    limit?: number;
    defaultLimit?: number;
    cursorParam: string;
    cursorField?: string;
  }
) {
  const res = jsonResponse(data);
  const limit = opts.limit ?? opts.defaultLimit ?? 100;
  if (Array.isArray(data) && data.length >= limit) {
    const last = data[data.length - 1] as Record<string, unknown> | undefined;
    const cursor = last?.[opts.cursorField ?? "created_at"];
    res.content.push({
      type: "text" as const,
      text:
        `Results may be truncated (${data.length} returned, limit ${limit}). ` +
        (cursor
          ? `For the next page pass ${opts.cursorParam}=${String(cursor)}.`
          : "Narrow the filters to see the rest."),
    });
  }
  return res;
}

export function errorResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: `Error: ${msg}` }],
    isError: true,
  };
}

/** Copies obj without its undefined values, for request bodies built from optional args. */
export function definedOnly(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export function buildParams(obj: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) params[k] = String(v);
  }
  return params;
}

/** Logs which tool ran and with which arguments, never their values (account numbers, names, amounts). */
export function logToolCall(tool: string, params?: Record<string, unknown>) {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      tool,
      args: params ? Object.keys(params).filter((k) => params[k] !== undefined) : [],
    })
  );
}
