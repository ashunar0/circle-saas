import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Placeholder schema for Phase 0.8.
// Real schemas (users / tenants / memberships / ...) will be defined in
// features/*/db.ts in later phases (Phase 1+).
export const healthCheck = sqliteTable("health_check", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
