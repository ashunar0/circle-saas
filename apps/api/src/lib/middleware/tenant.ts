import { and, eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { auth } from "../auth";
import { member } from "../auth/schema";
import { centralDb } from "../db/central";
import { createTenantDb, type TenantDb } from "../db/tenant";

export type TenantContext = {
  Variables: {
    tenantDb: TenantDb;
    role: string;
    organizationId: string;
  };
};

export const resolveTenant: MiddlewareHandler<TenantContext> = async (
  c,
  next,
) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new HTTPException(401, { message: "unauthorized" });

  const tenantId = c.req.param("tenantId");
  if (!tenantId) throw new HTTPException(400, { message: "tenantId required" });

  const membership = await centralDb.query.member.findFirst({
    where: and(
      eq(member.userId, session.user.id),
      eq(member.organizationId, tenantId),
    ),
    with: {
      organization: {
        columns: { dbUrl: true, dbToken: true },
      },
    },
  });
  if (!membership) throw new HTTPException(403, { message: "not a member" });

  const { organization: org } = membership;
  if (!org.dbUrl || !org.dbToken) {
    throw new HTTPException(500, { message: "tenant DB not provisioned" });
  }

  c.set("tenantDb", createTenantDb(org.dbUrl, org.dbToken));
  c.set("role", membership.role);
  c.set("organizationId", tenantId);
  await next();
};
