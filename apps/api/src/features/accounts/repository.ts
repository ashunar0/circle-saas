import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type { TenantDb } from "../../lib/db/tenant";
import { type AccountKind, accounts } from "./db";

export type AccountRow = typeof accounts.$inferSelect;

export async function listAccounts(db: TenantDb): Promise<AccountRow[]> {
  return await db
    .select()
    .from(accounts)
    .orderBy(asc(accounts.archivedAt), asc(accounts.createdAt));
}

export async function findAccountById(
  db: TenantDb,
  id: string,
): Promise<AccountRow | null> {
  const [row] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .limit(1);
  return row ?? null;
}

export async function createAccount(
  db: TenantDb,
  input: { name: string; kind: AccountKind },
): Promise<AccountRow> {
  const id = randomUUID();
  await db.insert(accounts).values({ id, name: input.name, kind: input.kind });
  const row = await findAccountById(db, id);
  if (!row) throw new Error("account insert succeeded but row is missing");
  return row;
}

export async function updateAccountName(
  db: TenantDb,
  id: string,
  name: string,
): Promise<AccountRow | null> {
  await db.update(accounts).set({ name }).where(eq(accounts.id, id));
  return findAccountById(db, id);
}

export async function setAccountArchived(
  db: TenantDb,
  id: string,
  archived: boolean,
): Promise<AccountRow | null> {
  await db
    .update(accounts)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(accounts.id, id));
  return findAccountById(db, id);
}
