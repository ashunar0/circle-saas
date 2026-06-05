import { desc, eq } from "drizzle-orm";
import { createClient, type Client } from "@libsql/client";
import { centralDb } from "../src/lib/db/central";
import { organization } from "../src/lib/auth/schema";

async function listColumns(client: Client, table: string): Promise<string[]> {
  const r = await client.execute(`PRAGMA table_info(${table})`);
  return r.rows.map((row) => row.name as string);
}

async function main() {
  const orgIdArg = process.argv[2];

  const org = orgIdArg
    ? await centralDb.query.organization.findFirst({
        where: eq(organization.id, orgIdArg),
      })
    : await centralDb.query.organization.findFirst({
        orderBy: [desc(organization.createdAt)],
      });

  if (!org) {
    throw new Error(
      orgIdArg
        ? `organization not found: ${orgIdArg}`
        : "no organization exists; create one via the app first",
    );
  }
  if (!org.dbUrl || !org.dbToken) {
    throw new Error(`tenant DB not provisioned for ${org.slug}`);
  }

  console.log(
    `org: ${org.slug} (id=${org.id}) schemaVersion=${org.schemaVersion ?? "?"} lastMigratedAt=${org.lastMigratedAt?.toISOString() ?? "?"}`,
  );

  const client = createClient({ url: org.dbUrl, authToken: org.dbToken });
  try {
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const tableNames = tables.rows.map((r) => r.name as string);
    console.log(`\ntables (${tableNames.length}):`);
    for (const name of tableNames) console.log(`  - ${name}`);

    const isOldSchema =
      tableNames.includes("expenses") || tableNames.includes("expense_events");
    if (isOldSchema) {
      console.log(
        `\n⚠ old (Phase 3) schema detected — delete this org and recreate via the app to apply Phase 3.5 schema.`,
      );
    }

    if (tableNames.includes("accounts")) {
      const cols = await listColumns(client, "accounts");
      const hasKind = cols.includes("kind");
      const r = await client.execute(
        hasKind
          ? "SELECT name, kind, archived_at FROM accounts ORDER BY created_at"
          : "SELECT name, archived_at FROM accounts ORDER BY created_at",
      );
      console.log(`\naccounts (${r.rows.length}):`);
      for (const row of r.rows) {
        const kind = hasKind ? `[${row.kind as string}] ` : "";
        console.log(
          `  ${kind}${row.name as string} ${row.archived_at ? "(archived)" : ""}`,
        );
      }
    }

    if (tableNames.includes("categories")) {
      const cols = await listColumns(client, "categories");
      const hasKind = cols.includes("kind");
      const hasArchived = cols.includes("archived_at");
      const cols2 = ["name", hasKind ? "kind" : "NULL as kind", "sort_order"];
      if (hasArchived) cols2.push("archived_at");
      const r = await client.execute(
        `SELECT ${cols2.join(", ")} FROM categories ORDER BY ${hasKind ? "kind, " : ""}sort_order`,
      );
      console.log(`\ncategories (${r.rows.length}):`);
      for (const row of r.rows) {
        const kind = hasKind ? `[${(row.kind as string) ?? "?"}] ` : "";
        const arch = hasArchived && row.archived_at ? " (archived)" : "";
        console.log(
          `  ${kind}${row.name as string} (sort=${row.sort_order})${arch}`,
        );
      }
    }

    if (tableNames.includes("transactions")) {
      const r = await client.execute(
        "SELECT type, status, count(*) as n FROM transactions GROUP BY type, status",
      );
      console.log(`\ntransactions:`);
      if (r.rows.length === 0) console.log(`  (none)`);
      for (const row of r.rows) {
        console.log(
          `  type=${row.type as string} status=${row.status as string} n=${row.n}`,
        );
      }
    }

    if (tableNames.includes("transaction_events")) {
      const r = await client.execute(
        "SELECT count(*) as n FROM transaction_events",
      );
      console.log(`\ntransaction_events: n=${r.rows[0]?.n ?? 0}`);
    }
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
