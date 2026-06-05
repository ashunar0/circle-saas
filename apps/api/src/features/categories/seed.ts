import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import type { CategoryKind } from "./db";

export const DEFAULT_CATEGORIES: Array<{
  name: string;
  kind: CategoryKind;
  sortOrder: number;
}> = [
  { name: "食費", kind: "expense", sortOrder: 10 },
  { name: "交通費", kind: "expense", sortOrder: 20 },
  { name: "備品", kind: "expense", sortOrder: 30 },
  { name: "通信費", kind: "expense", sortOrder: 40 },
  { name: "その他", kind: "expense", sortOrder: 99 },
  { name: "部費", kind: "income", sortOrder: 10 },
  { name: "補助金", kind: "income", sortOrder: 20 },
  { name: "イベント収益", kind: "income", sortOrder: 30 },
  { name: "その他収入", kind: "income", sortOrder: 99 },
];

export async function seedDefaultCategories(client: Client): Promise<void> {
  const existing = await client.execute("SELECT count(*) as n FROM categories");
  if (Number(existing.rows[0]?.n ?? 0) > 0) return;

  for (const cat of DEFAULT_CATEGORIES) {
    await client.execute({
      sql: "INSERT INTO categories (id, name, kind, sort_order) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), cat.name, cat.kind, cat.sortOrder],
    });
  }
}
