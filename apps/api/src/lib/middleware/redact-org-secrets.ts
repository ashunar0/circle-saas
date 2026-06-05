import type { MiddlewareHandler } from "hono";

const SECRET_FIELDS = new Set([
  "dbName",
  "dbUrl",
  "dbToken",
  "schemaVersion",
  "lastMigratedAt",
]);

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (SECRET_FIELDS.has(key)) continue;
      result[key] = redactSecrets(v);
    }
    return result;
  }
  return value;
}

export const redactOrgSecrets: MiddlewareHandler = async (c, next) => {
  await next();
  const contentType = c.res.headers.get("content-type");
  if (!contentType?.includes("application/json")) return;

  const clone = c.res.clone();
  let body: unknown;
  try {
    body = await clone.json();
  } catch {
    return;
  }

  const redacted = redactSecrets(body);
  const headers = new Headers(c.res.headers);
  headers.delete("content-length");
  c.res = new Response(JSON.stringify(redacted), {
    status: c.res.status,
    statusText: c.res.statusText,
    headers,
  });
};
