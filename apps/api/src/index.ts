import { Hono } from "hono";
import { auth } from "./lib/auth";

const app = new Hono()
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .get("/api/ping", (c) => c.json({ ok: true }));

export type AppType = typeof app;
export default app;
