import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";

type Journal = {
  entries: Array<{ idx: number; tag: string }>;
};

const MIGRATIONS_DIR = join(import.meta.dirname, "../../../drizzle/tenant");

function loadJournal(): Journal {
  return JSON.parse(
    readFileSync(join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"),
  );
}

export const TENANT_SCHEMA_VERSION = loadJournal().entries.length;

function splitStatements(sql: string): string[] {
  return sql
    .split(/--> statement-breakpoint/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// drizzle-kit が出す CREATE TABLE / CREATE INDEX に IF NOT EXISTS を差し込んで
// retry 時 (部分適用後の再実行) の "already exists" エラーを抑える。
// ALTER TABLE 等は単純対応では idempotent にできないので、その時は migration 側で
// IF NOT EXISTS 相当を組み込む。
function makeIdempotent(stmt: string): string {
  return stmt
    .replace(/^CREATE TABLE (?!IF NOT EXISTS)/i, "CREATE TABLE IF NOT EXISTS ")
    .replace(
      /^CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/i,
      (_, unique) =>
        `CREATE ${unique ?? ""}INDEX IF NOT EXISTS `,
    );
}

/**
 * 単一 Tenant DB に未適用の migration を順次 apply し、新しい schemaVersion を返す。
 * fromVersion 未満の migration は skip。各 migration entry は client.batch() で
 * atomic に流すので、途中失敗時はその entry 全体が rollback される。
 */
export async function applyTenantMigrations(opts: {
  dbUrl: string;
  authToken: string;
  fromVersion?: number;
  onProgress?: (idx: number, tag: string) => void;
}): Promise<{ appliedVersion: number; appliedTags: string[] }> {
  const { dbUrl, authToken, fromVersion = 0, onProgress } = opts;
  const journal = loadJournal();

  const client: Client = createClient({ url: dbUrl, authToken });
  const appliedTags: string[] = [];
  let appliedVersion = fromVersion;
  try {
    for (const entry of journal.entries) {
      if (entry.idx < fromVersion) continue;
      const sql = readFileSync(
        join(MIGRATIONS_DIR, `${entry.tag}.sql`),
        "utf8",
      );
      const statements = splitStatements(sql).map(makeIdempotent);
      if (statements.length > 0) {
        await client.batch(statements, "write");
      }
      appliedVersion = entry.idx + 1;
      appliedTags.push(entry.tag);
      onProgress?.(entry.idx, entry.tag);
    }
  } finally {
    client.close();
  }
  return { appliedVersion, appliedTags };
}
