import { HTTPException } from "hono/http-exception";
import type { TenantDb } from "../../lib/db/tenant";
import {
  type AccountRow,
  createAccount as repoCreate,
  findAccountById,
  listAccounts as repoList,
  setAccountArchived,
  updateAccountName,
} from "./repository";
import type { CreateAccountInput, UpdateAccountInput } from "./schema";

async function requireAccount(db: TenantDb, id: string): Promise<AccountRow> {
  const existing = await findAccountById(db, id);
  if (!existing) throw new HTTPException(404, { message: "account not found" });
  return existing;
}

export async function listAccountsForTenant(db: TenantDb): Promise<AccountRow[]> {
  return repoList(db);
}

export async function createAccountForTenant(
  db: TenantDb,
  input: CreateAccountInput,
): Promise<AccountRow> {
  return repoCreate(db, input);
}

export async function updateAccountForTenant(
  db: TenantDb,
  id: string,
  input: UpdateAccountInput,
): Promise<AccountRow> {
  await requireAccount(db, id);
  return updateAccountName(db, id, input.name);
}

export async function archiveAccountForTenant(
  db: TenantDb,
  id: string,
): Promise<AccountRow> {
  await requireAccount(db, id);
  return setAccountArchived(db, id, true);
}

export async function unarchiveAccountForTenant(
  db: TenantDb,
  id: string,
): Promise<AccountRow> {
  await requireAccount(db, id);
  return setAccountArchived(db, id, false);
}
