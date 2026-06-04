import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

export type TenantDb = ReturnType<typeof createTenantDb>;

export function createTenantDb(url: string, authToken: string) {
  const client = createClient({ url, authToken });
  return drizzle(client);
}
