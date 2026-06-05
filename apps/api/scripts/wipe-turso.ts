import { createInterface } from "node:readline";
import { eq } from "drizzle-orm";
import { createClient as createTursoApiClient } from "@tursodatabase/api";
import { centralDb } from "../src/lib/db/central";
import { organization } from "../src/lib/auth/schema";

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    }),
  );
}

async function main() {
  const name = process.argv[2];
  if (!name) {
    throw new Error("usage: bun run db:wipe:turso <dbName>");
  }
  if (!name.startsWith("tenant-")) {
    throw new Error(
      `safety: only tenant-* DBs can be wiped by this script (got: ${name})`,
    );
  }

  const token = process.env.TURSO_PLATFORM_API_TOKEN;
  const orgSlug = process.env.TURSO_ORG_SLUG;
  if (!token || !orgSlug) {
    throw new Error("TURSO_PLATFORM_API_TOKEN and TURSO_ORG_SLUG are required");
  }
  const turso = createTursoApiClient({ org: orgSlug, token });

  const refs = await centralDb.query.organization.findMany({
    where: eq(organization.dbName, name),
  });
  if (refs.length > 0) {
    throw new Error(
      `safety: ${name} is still referenced by ${refs.length} central org(s): ${refs
        .map((o) => `${o.slug} (id=${o.id})`)
        .join(", ")}. Use db:wipe:tenant <orgId> to delete the org + DB together.`,
    );
  }

  const dbs = await turso.databases.list();
  const found = dbs.find((d) => d.name === name);
  if (!found) {
    throw new Error(`Turso DB not found: ${name}`);
  }

  console.log(`About to DELETE Turso DB:`);
  console.log(`  name:  ${name}`);
  console.log(`  group: ${found.group}`);
  console.log(`  (no central organization references it — orphan)`);
  const answer = await ask("Continue? (y/N): ");
  if (answer.trim().toLowerCase() !== "y") {
    console.log("aborted");
    return;
  }

  await turso.databases.delete(name);
  console.log(`✓ deleted ${name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
