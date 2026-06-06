import { Hono } from "hono";
import { auth } from "./lib/auth";
import { redactOrgSecrets } from "./lib/middleware/redact-org-secrets";
import { resolveTenant } from "./lib/middleware/tenant";
import accounts from "./features/accounts";

const app = new Hono()
  .use("/api/auth/*", redactOrgSecrets)
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .get("/api/ping", (c) => c.json({ ok: true }))
  .use("/api/t/:tenantId/*", resolveTenant)
  .get("/api/t/:tenantId/whoami", (c) =>
    c.json({
      organizationId: c.get("organizationId"),
      role: c.get("role"),
    }),
  )
  .route("/api/t/:tenantId/accounts", accounts);

export type AppType = typeof app;
export default app;
