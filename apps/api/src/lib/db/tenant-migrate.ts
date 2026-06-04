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

/**
 * 単一 Tenant DB に未適用の migration を順次 apply し、新しい schemaVersion を返す。
 * fromVersion 未満の migration は skip。失敗時は throw、進んだ分の schemaVersion は
 * 呼び出し側 (Central DB の organization.schemaVersion) で記録する。
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
      for (const statement of splitStatements(sql)) {
        await client.execute(statement);
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
