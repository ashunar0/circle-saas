import { createClient as createTursoApiClient } from "@tursodatabase/api";
import { randomUUID } from "node:crypto";

const platformApiToken = process.env.TURSO_PLATFORM_API_TOKEN;
const orgSlug = process.env.TURSO_ORG_SLUG;

if (!platformApiToken) {
  throw new Error("TURSO_PLATFORM_API_TOKEN is required");
}
if (!orgSlug) {
  throw new Error("TURSO_ORG_SLUG is required");
}

const turso = createTursoApiClient({
  org: orgSlug,
  token: platformApiToken,
});

export type TenantDbInfo = {
  dbName: string;
  dbUrl: string;
  dbToken: string;
};

function buildDbName(slug: string): string {
  const sanitized = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  const shortId = randomUUID().slice(0, 8);
  return `tenant-${sanitized || "x"}-${shortId}`;
}

export async function provisionTenantDb(slug: string): Promise<TenantDbInfo> {
  const dbName = buildDbName(slug);

  await turso.databases.create(dbName, {
    group: "default",
  });

  const tokenResponse = await turso.databases.createToken(dbName, {
    authorization: "full-access",
  });

  return {
    dbName,
    dbUrl: `libsql://${dbName}-${orgSlug}.turso.io`,
    dbToken: tokenResponse.jwt,
  };
}

export async function deleteTenantDb(dbName: string): Promise<void> {
  await turso.databases.delete(dbName);
}
