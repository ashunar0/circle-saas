import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAdmin } from "../../lib/middleware/require-admin";
import type { TenantContext } from "../../lib/middleware/tenant";
import { createAccountSchema, updateAccountSchema } from "./schema";
import {
  archiveAccountForTenant,
  createAccountForTenant,
  listAccountsForTenant,
  unarchiveAccountForTenant,
  updateAccountForTenant,
} from "./service";

const accounts = new Hono<TenantContext>()
  .use("*", requireAdmin)
  .get("/", async (c) => {
    const list = await listAccountsForTenant(c.get("tenantDb"));
    return c.json({ accounts: list });
  })
  .post("/", zValidator("json", createAccountSchema), async (c) => {
    const account = await createAccountForTenant(
      c.get("tenantDb"),
      c.req.valid("json"),
    );
    return c.json({ account }, 201);
  })
  .patch("/:id", zValidator("json", updateAccountSchema), async (c) => {
    const account = await updateAccountForTenant(
      c.get("tenantDb"),
      c.req.param("id"),
      c.req.valid("json"),
    );
    return c.json({ account });
  })
  .post("/:id/archive", async (c) => {
    const account = await archiveAccountForTenant(
      c.get("tenantDb"),
      c.req.param("id"),
    );
    return c.json({ account });
  })
  .post("/:id/unarchive", async (c) => {
    const account = await unarchiveAccountForTenant(
      c.get("tenantDb"),
      c.req.param("id"),
    );
    return c.json({ account });
  });

export default accounts;
