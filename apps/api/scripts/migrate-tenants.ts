import { eq, isNotNull } from "drizzle-orm";
import { centralDb } from "../src/lib/db/central";
import { organization } from "../src/lib/auth/schema";
import {
  applyTenantMigrations,
  TENANT_SCHEMA_VERSION,
} from "../src/lib/db/tenant-migrate";

type Failure = { id: string; slug: string; error: unknown };

async function main() {
  const orgs = await centralDb
    .select()
    .from(organization)
    .where(isNotNull(organization.dbUrl));

  console.log(
    `Found ${orgs.length} tenant(s). target schemaVersion = ${TENANT_SCHEMA_VERSION}`,
  );

  const failed: Failure[] = [];
  let migrated = 0;
  let skipped = 0;

  for (const org of orgs) {
    if (!org.dbUrl || !org.dbToken) continue;
    if (org.schemaVersion >= TENANT_SCHEMA_VERSION) {
      skipped++;
      console.log(`  - skip ${org.slug} (v${org.schemaVersion})`);
      continue;
    }

    try {
      const { appliedVersion, appliedTags } = await applyTenantMigrations({
        dbUrl: org.dbUrl,
        authToken: org.dbToken,
        fromVersion: org.schemaVersion,
      });
      await centralDb
        .update(organization)
        .set({ schemaVersion: appliedVersion, lastMigratedAt: new Date() })
        .where(eq(organization.id, org.id));
      console.log(
        `  ✓ ${org.slug}: v${org.schemaVersion} → v${appliedVersion} (${appliedTags.join(", ")})`,
      );
      migrated++;
    } catch (err) {
      console.error(`  ✗ ${org.slug}:`, err);
      failed.push({ id: org.id, slug: org.slug, error: err });
    }
  }

  console.log("---");
  console.log(`migrated=${migrated} skipped=${skipped} failed=${failed.length}`);

  // centralDb の libSQL WebSocket が event loop を生かしたままにするので明示終了
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
