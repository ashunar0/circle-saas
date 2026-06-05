import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import type { AccountKind } from "./db";

export const DEFAULT_ACCOUNTS: Array<{ name: string; kind: AccountKind }> = [
  { name: "メイン口座", kind: "bank" },
  { name: "現金", kind: "cash" },
];

export async function seedDefaultAccounts(client: Client): Promise<void> {
  const existing = await client.execute("SELECT count(*) as n FROM accounts");
  if (Number(existing.rows[0]?.n ?? 0) > 0) return;

  for (const acc of DEFAULT_ACCOUNTS) {
    await client.execute({
      sql: "INSERT INTO accounts (id, name, kind) VALUES (?, ?, ?)",
      args: [randomUUID(), acc.name, acc.kind],
    });
  }
}
