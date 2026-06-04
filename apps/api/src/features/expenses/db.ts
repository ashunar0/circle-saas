import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { categories } from "../categories/db";

export const expenseStatuses = ["submitted", "approved", "paid", "rejected"] as const;
export type ExpenseStatus = (typeof expenseStatuses)[number];

export const expenseActions = [
  "create",
  "approve",
  "reject",
  "pay",
  "resubmit",
] as const;
export type ExpenseAction = (typeof expenseActions)[number];

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    amount: integer("amount").notNull(),
    spentAt: integer("spent_at", { mode: "timestamp_ms" }).notNull(),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    receiptKey: text("receipt_key"),
    status: text("status").$type<ExpenseStatus>().default("submitted").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("expenses_user_id_idx").on(table.userId),
    index("expenses_status_idx").on(table.status),
    index("expenses_spent_at_idx").on(table.spentAt),
  ],
);

export const expenseEvents = sqliteTable(
  "expense_events",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    actorId: text("actor_id").notNull(),
    action: text("action").$type<ExpenseAction>().notNull(),
    fromStatus: text("from_status").$type<ExpenseStatus>(),
    toStatus: text("to_status").$type<ExpenseStatus>().notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("expense_events_expense_id_idx").on(table.expenseId)],
);

export const expenseRelations = relations(expenses, ({ one, many }) => ({
  category: one(categories, {
    fields: [expenses.categoryId],
    references: [categories.id],
  }),
  events: many(expenseEvents),
}));

export const expenseEventRelations = relations(expenseEvents, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseEvents.expenseId],
    references: [expenses.id],
  }),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  expenses: many(expenses),
}));
