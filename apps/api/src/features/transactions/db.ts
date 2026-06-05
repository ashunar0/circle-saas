import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import {
  type TransactionAction,
  type TransactionStatus,
  type TransactionType,
} from "@circle/shared";
import { accounts } from "../accounts/db";
import { categories } from "../categories/db";

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    type: text("type").$type<TransactionType>().notNull(),
    userId: text("user_id").notNull(),
    amount: integer("amount").notNull(),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    receiptKey: text("receipt_key"),
    status: text("status").$type<TransactionStatus>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("transactions_type_occurred_at_idx").on(table.type, table.occurredAt),
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_status_idx").on(table.status),
    index("transactions_occurred_at_idx").on(table.occurredAt),
  ],
);

export const transactionEvents = sqliteTable(
  "transaction_events",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    actorId: text("actor_id").notNull(),
    action: text("action").$type<TransactionAction>().notNull(),
    fromStatus: text("from_status").$type<TransactionStatus>(),
    toStatus: text("to_status").$type<TransactionStatus>().notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("transaction_events_transaction_id_idx").on(table.transactionId),
  ],
);

export const transactionRelations = relations(transactions, ({ one, many }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  events: many(transactionEvents),
}));

export const transactionEventRelations = relations(
  transactionEvents,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionEvents.transactionId],
      references: [transactions.id],
    }),
  }),
);
