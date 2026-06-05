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
  const orgId = process.argv[2];
  if (!orgId) {
    throw new Error("usage: bun run db:wipe:tenant <orgId>");
  }

  const token = process.env.TURSO_PLATFORM_API_TOKEN;
  const orgSlug = process.env.TURSO_ORG_SLUG;
  if (!token || !orgSlug) {
    throw new Error("TURSO_PLATFORM_API_TOKEN and TURSO_ORG_SLUG are required");
  }
  const turso = createTursoApiClient({ org: orgSlug, token });

  const org = await centralDb.query.organization.findFirst({
    where: eq(organization.id, orgId),
  });
  if (!org) {
    throw new Error(`organization not found: ${orgId}`);
  }

  console.log(`About to DELETE organization + Turso DB:`);
  console.log(`  id:     ${org.id}`);
  console.log(`  slug:   ${org.slug}`);
  console.log(`  name:   ${org.name}`);
  console.log(`  dbName: ${org.dbName ?? "(none)"}`);
  console.log(`  schemaVersion: ${org.schemaVersion ?? "?"}`);
  console.log(`  cascade: member / invitation rows for this org will be removed`);
  const answer = await ask("Continue? (y/N): ");
  if (answer.trim().toLowerCase() !== "y") {
    console.log("aborted");
    return;
  }

  if (org.dbName) {
    try {
      await turso.databases.delete(org.dbName);
      console.log(`✓ deleted Turso DB ${org.dbName}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/not found|404/i.test(msg)) {
        console.log(`(Turso DB ${org.dbName} was already absent)`);
      } else {
        throw err;
      }
    }
  }

  await centralDb.delete(organization).where(eq(organization.id, org.id));
  console.log(`✓ deleted central org row ${org.id} (member / invitation cascaded)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
