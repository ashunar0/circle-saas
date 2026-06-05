import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const categoryKinds = ["expense", "income"] as const;
export type CategoryKind = (typeof categoryKinds)[number];

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    kind: text("kind").$type<CategoryKind>().notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("categories_kind_idx").on(table.kind),
    index("categories_sort_order_idx").on(table.sortOrder),
  ],
);
