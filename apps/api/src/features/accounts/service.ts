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
): Promise<AccountRow | null> {
  const existing = await findAccountById(db, id);
  if (!existing) return null;
  return updateAccountName(db, id, input.name);
}

export async function archiveAccountForTenant(
  db: TenantDb,
  id: string,
): Promise<AccountRow | null> {
  const existing = await findAccountById(db, id);
  if (!existing) return null;
  return setAccountArchived(db, id, true);
}

export async function unarchiveAccountForTenant(
  db: TenantDb,
  id: string,
): Promise<AccountRow | null> {
  const existing = await findAccountById(db, id);
  if (!existing) return null;
  return setAccountArchived(db, id, false);
}
