import { Hono } from "hono";
import { auth } from "./lib/auth";
import { redactOrgSecrets } from "./lib/middleware/redact-org-secrets";

const app = new Hono()
  .use("/api/auth/organization/*", redactOrgSecrets)
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .get("/api/ping", (c) => c.json({ ok: true }));

export type AppType = typeof app;
export default app;
