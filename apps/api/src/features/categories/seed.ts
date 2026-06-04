import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";

export const DEFAULT_CATEGORIES: Array<{ name: string; sortOrder: number }> = [
  { name: "食費", sortOrder: 10 },
  { name: "交通費", sortOrder: 20 },
  { name: "備品", sortOrder: 30 },
  { name: "通信費", sortOrder: 40 },
  { name: "その他", sortOrder: 99 },
];

export async function seedDefaultCategories(client: Client): Promise<void> {
  for (const cat of DEFAULT_CATEGORIES) {
    await client.execute({
      sql: "INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)",
      args: [randomUUID(), cat.name, cat.sortOrder],
    });
  }
}
