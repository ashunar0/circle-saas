import { createClient as createTursoApiClient } from "@tursodatabase/api";
import { centralDb } from "../src/lib/db/central";

async function main() {
  const token = process.env.TURSO_PLATFORM_API_TOKEN;
  const orgSlug = process.env.TURSO_ORG_SLUG;
  if (!token || !orgSlug) {
    throw new Error("TURSO_PLATFORM_API_TOKEN and TURSO_ORG_SLUG are required");
  }
  const turso = createTursoApiClient({ org: orgSlug, token });

  const [dbs, orgs] = await Promise.all([
    turso.databases.list(),
    centralDb.query.organization.findMany(),
  ]);

  const dbNamesInCentral = new Set(
    orgs.map((o) => o.dbName).filter((n): n is string => Boolean(n)),
  );
  const tursoNames = new Set(dbs.map((d) => d.name));

  const tenantDbs = dbs.filter((d) => d.name.startsWith("tenant-"));
  const otherDbs = dbs.filter((d) => !d.name.startsWith("tenant-"));
  const active = tenantDbs.filter((d) => dbNamesInCentral.has(d.name));
  const orphan = tenantDbs.filter((d) => !dbNamesInCentral.has(d.name));
  const danglingOrgs = orgs.filter(
    (o) => o.dbName && !tursoNames.has(o.dbName),
  );

  console.log(`=== Turso DBs (${dbs.length} total, ${tenantDbs.length} tenant-*) ===\n`);

  console.log(`[non-tenant] ${otherDbs.length}  (do NOT wipe)`);
  for (const db of otherDbs) console.log(`  ${db.name}  group=${db.group}`);

  console.log(`\n[active] ${active.length}  (Turso DB ↔ central org pair)`);
  for (const db of active) {
    const org = orgs.find((o) => o.dbName === db.name)!;
    console.log(
      `  ${db.name}  → ${org.slug} (id=${org.id} v${org.schemaVersion ?? "?"})`,
    );
  }

  console.log(`\n[orphan] ${orphan.length}  (Turso にあるが central に紐付かない → db:wipe:turso で削除可)`);
  for (const db of orphan) console.log(`  ${db.name}`);

  console.log(`\n[dangling] ${danglingOrgs.length}  (central は持ってるが Turso DB が無い → 復旧不可、org 削除 or 手動再 provision)`);
  for (const o of danglingOrgs) {
    console.log(`  org=${o.slug} (id=${o.id}) dbName=${o.dbName ?? "?"}`);
  }
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
