import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { TenantContext } from "./tenant";

/**
 * resolveTenant が set した role を見て、admin 以外は 403。
 * resolveTenant の後に必ず chain する想定。
 */
export const requireAdmin: MiddlewareHandler<TenantContext> = async (
  c,
  next,
) => {
  const role = c.get("role");
  if (role !== "admin" && role !== "owner") {
    throw new HTTPException(403, { message: "admin role required" });
  }
  await next();
};
