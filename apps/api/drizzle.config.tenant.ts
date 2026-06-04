import { defineConfig } from "drizzle-kit";

// Tenant DB 用 migration generator。
// credentials は loop apply runner 側で動的に注入するので、ここでは指定しない
// (drizzle-kit generate は credentials 不要)。
export default defineConfig({
  dialect: "turso",
  schema: "./src/lib/db/tenant-schema.ts",
  out: "./drizzle/tenant",
});
